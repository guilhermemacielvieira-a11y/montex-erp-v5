// ============================================================
// ImportarChegadaModal — importar CHEGADA de materiais
// ============================================================
// Registra a entrada de materiais no estoque a partir de 3 fontes:
//   • Planilha (xlsx/xls/csv) → parse automático das linhas
//   • Foto da nota (imagem)   → arquiva no Storage + entrada manual guiada
//   • PDF da nota             → arquiva no Storage + entrada manual guiada
//
// Fluxo: escolher fonte → preview editável (linhas: descrição, código, qtd,
// unidade, preço) → confirmar. No confirmar, para cada linha: faz UPSERT no
// item de estoque (soma a quantidade ao existente por código/descrição, ou
// cria novo) E cria uma movimentação `entrada` com a NF e a URL do documento.
//
// A extração automática de itens de foto/PDF (OCR/IA) pode ser plugada depois
// no mesmo preview — o documento já fica arquivado (documento_url).
// ============================================================
import React, { useState } from 'react';
import { X, FileSpreadsheet, FileText, Upload, Plus, Trash2, Check, Loader2, AlertCircle, Sparkles, Camera, Images } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { estoqueApi, movEstoqueApi, supabase } from '@/api/supabaseClient';

const N = (v) => { const n = parseFloat(String(v ?? '').replace(/[^\d,.-]/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(n * 100) / 100;
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const linhaVazia = () => ({ descricao: '', codigo: '', quantidade: '', unidade: 'UN', preco: '' });

// Casa um cabeçalho de planilha (flexível) com o campo canônico.
function mapearColunas(headers) {
  const m = {};
  headers.forEach((h) => {
    const H = String(h).toUpperCase();
    if (!m.descricao && /DESCRI|MATERIAL|PRODUTO|ITEM|ESPECIF/.test(H)) m.descricao = h;
    else if (!m.codigo && /COD|SKU|REF/.test(H)) m.codigo = h;
    else if (!m.quantidade && /QTD|QUANT|QNT/.test(H)) m.quantidade = h;
    else if (!m.unidade && /UNID|^UN$|^UM$|MEDIDA/.test(H)) m.unidade = h;
    else if (!m.preco && /PRE[CÇ]O|VALOR|UNIT|CUSTO/.test(H)) m.preco = h;
  });
  return m;
}

export default function ImportarChegadaModal({ open, estoque = [], obras = [], obraAtual = null, onClose, onImported }) {
  const [fonte, setFonte] = useState(null);       // 'planilha' | 'foto' | 'pdf'
  const [etapa, setEtapa] = useState('fonte');    // 'fonte' | 'preview' | 'salvando' | 'ok'
  const [rows, setRows] = useState([]);
  const [erro, setErro] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docNome, setDocNome] = useState('');
  const [docFile, setDocFile] = useState(null);   // arquivo p/ reprocessar com IA
  const [subindoDoc, setSubindoDoc] = useState(false);
  const [extraindo, setExtraindo] = useState(false); // IA lendo a nota
  const [nf, setNf] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [obra, setObra] = useState(obraAtual || '');
  const [resultado, setResultado] = useState({ ok: 0, novos: 0, atualizados: 0 });

  const reset = () => { setFonte(null); setEtapa('fonte'); setRows([]); setErro(''); setDocUrl(''); setDocNome(''); setDocFile(null); setExtraindo(false); setNf(''); setFornecedor(''); setResultado({ ok: 0, novos: 0, atualizados: 0 }); };
  const fechar = () => { reset(); onClose?.(); };

  // ---------- PLANILHA ----------
  const lerPlanilha = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setErro('');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!json.length) { setErro('Planilha vazia.'); return; }
      const cols = mapearColunas(Object.keys(json[0]));
      if (!cols.descricao || !cols.quantidade) {
        setErro('Não encontrei as colunas mínimas (Descrição/Material e Quantidade). Cabeçalhos lidos: ' + Object.keys(json[0]).join(', '));
        return;
      }
      const novas = json.map((r) => ({
        descricao: String(r[cols.descricao] || '').trim(),
        codigo: cols.codigo ? String(r[cols.codigo] || '').trim() : '',
        quantidade: N(r[cols.quantidade]),
        unidade: cols.unidade ? (String(r[cols.unidade] || 'UN').trim() || 'UN') : 'UN',
        preco: cols.preco ? N(r[cols.preco]) : '',
      })).filter((r) => r.descricao && r.quantidade > 0);
      if (!novas.length) { setErro('Nenhuma linha válida (precisa de descrição e quantidade > 0).'); return; }
      setRows(novas); setEtapa('preview');
      toast.info(`${novas.length} linha(s) lida(s) da planilha`);
    } catch (err) {
      setErro('Erro ao ler a planilha. Confira se é um Excel/CSV válido.');
      console.error(err);
    }
  };

  // ---------- FOTO / PDF (upload + extração por IA) ----------
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  // Chama a Edge Function `extrair-nota` (Claude vision) e preenche as linhas.
  // Degrada com elegância: sem chave/erro → mantém lançamento manual.
  const extrairComIA = async (file) => {
    setExtraindo(true);
    try {
      const b64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke('extrair-nota', {
        body: { fileBase64: b64, mimeType: file.type || 'image/jpeg' },
      });
      if (error) throw error;
      const itens = Array.isArray(data?.itens) ? data.itens : [];
      if (itens.length) {
        setRows(itens.map((it) => ({
          descricao: String(it.descricao || '').trim(),
          codigo: it.codigo ? String(it.codigo).trim() : '',
          quantidade: it.quantidade ?? '',
          unidade: String(it.unidade || 'UN').toUpperCase(),
          preco: it.preco ?? '',
        })));
        if (data.fornecedor) setFornecedor(String(data.fornecedor));
        if (data.nota_fiscal) setNf(String(data.nota_fiscal));
        toast.success(`IA extraiu ${itens.length} item(ns) da nota — confira e ajuste`);
      } else {
        setRows((p) => (p.length ? p : [linhaVazia()]));
        toast(data?.erro ? `IA: ${data.erro}` : 'Não li itens automaticamente — lance manualmente', { icon: 'ℹ️' });
      }
    } catch (err) {
      setRows((p) => (p.length ? p : [linhaVazia()]));
      toast('Extração automática indisponível — lance os itens manualmente', { icon: 'ℹ️' });
      console.error('[extrair-nota]', err);
    } finally {
      setExtraindo(false);
    }
  };

  const lerDocumento = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setErro(''); setSubindoDoc(true);
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const path = `notas/${hojeLocal()}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      setDocUrl(data?.publicUrl || '');
      setDocNome(file.name);
      setDocFile(file);
      setRows([linhaVazia()]);
      setEtapa('preview');
      await extrairComIA(file);   // tenta ler os itens automaticamente
    } catch (err) {
      setErro('Falha ao enviar o documento: ' + (err.message || err));
      setEtapa('fonte');
    } finally {
      setSubindoDoc(false);
    }
  };

  // ---------- PREVIEW edição de linhas ----------
  const setRow = (i, k, v) => setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((p) => [...p, linhaVazia()]);
  const delRow = (i) => setRows((p) => p.filter((_, idx) => idx !== i));

  const acharExistente = (row) => estoque.find((it) => {
    if (row.codigo && (it.codigo || '').toLowerCase() === row.codigo.toLowerCase()) return true;
    if (!row.codigo && (it.descricao || '').trim().toLowerCase() === row.descricao.trim().toLowerCase()) return true;
    return false;
  });

  const confirmar = async () => {
    const validas = rows.filter((r) => r.descricao.trim() && N(r.quantidade) > 0);
    if (!validas.length) { setErro('Nenhum item válido para importar (descrição + quantidade > 0).'); return; }
    setEtapa('salvando'); setErro('');
    const nowISO = new Date().toISOString();
    const hoje = hojeLocal();
    const origem = fonte === 'planilha' ? 'importacao_planilha' : `nota_${fonte}`;
    let novos = 0, atualizados = 0, falhas = 0;

    for (const r of validas) {
      const qtd = N(r.quantidade);
      try {
        const existente = acharExistente(r);
        let itemId;
        if (existente) {
          itemId = existente.id;
          // Chegada = material recebido: soma no saldo (quantidade) E no `comprado`
          // (o que os KPIs/relatórios leem como chegou/entregue), recalculando a
          // `falta` (pedido − comprado). Assim cobertura e fabricabilidade refletem
          // a chegada.
          const novoComprado = (Number(existente.comprado) || 0) + qtd;
          await estoqueApi.update(existente.id, {
            quantidade: (Number(existente.quantidade) || 0) + qtd,
            comprado: r2(novoComprado),
            falta: Math.max(0, r2((Number(existente.pedido) || 0) - novoComprado)),
            ...(N(r.preco) > 0 ? { preco: N(r.preco) } : {}),
            ...(fornecedor.trim() ? { fornecedor: fornecedor.trim() } : {}),
            ultima_entrada: hoje,
            updated_at: nowISO,
          });
          atualizados++;
        } else {
          const novo = await estoqueApi.create({
            codigo: (r.codigo || r.descricao).trim().slice(0, 40),
            descricao: r.descricao.trim(),
            quantidade: qtd,
            comprado: qtd,
            unidade: r.unidade || 'UN',
            preco: N(r.preco),
            fornecedor: fornecedor.trim() || null,
            minimo: 0, maximo: 0, peso_kg: 0,
            obra_id: obra || null,
            ultima_entrada: hoje,
            updated_at: nowISO,
          });
          itemId = novo?.id;
          novos++;
        }
        await movEstoqueApi.create({
          item_id: itemId || null,
          obra_id: obra || null,
          tipo: 'entrada',
          quantidade: qtd,
          unidade: r.unidade || 'UN',
          material: r.descricao.trim(),
          nota_fiscal: nf.trim() || null,
          custo_unitario: N(r.preco) || null,
          documento_url: docUrl || null,
          origem,
          motivo: 'Chegada de material' + (nf.trim() ? ` (NF ${nf.trim()})` : ''),
          data: nowISO,
        });
      } catch (err) {
        falhas++;
        console.error('[ImportarChegada] falha na linha', r, err);
      }
    }

    setResultado({ ok: novos + atualizados, novos, atualizados });
    setEtapa('ok');
    if (falhas) toast.error(`${falhas} item(ns) falharam — ver console`);
    toast.success(`Chegada registrada: ${novos} novo(s), ${atualizados} atualizado(s)`);
    onImported?.();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={fechar}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-400" /> Importar chegada de materiais
          </h2>
          <button onClick={fechar} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        {erro && (
          <div className="m-5 mb-0 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex gap-2 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {erro}
          </div>
        )}

        {/* ETAPA: escolha da fonte */}
        {etapa === 'fonte' && (
          <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FonteCard icon={FileSpreadsheet} cor="emerald" titulo="Planilha" sub="Excel/CSV — leitura das linhas" accept=".xlsx,.xls,.csv" onFile={(e) => { setFonte('planilha'); lerPlanilha(e); }} />
            <FonteCard icon={Camera} cor="blue" titulo="Tirar foto" sub="Câmera — IA lê a nota" accept="image/*" capture="environment" loading={subindoDoc || extraindo} onFile={(e) => { setFonte('foto'); lerDocumento(e); }} />
            <FonteCard icon={Images} cor="cyan" titulo="Álbum" sub="Escolher da galeria — IA lê a nota" accept="image/*" loading={subindoDoc || extraindo} onFile={(e) => { setFonte('foto'); lerDocumento(e); }} />
            <FonteCard icon={FileText} cor="orange" titulo="PDF da nota" sub="IA lê os itens do PDF" accept="application/pdf,.pdf" loading={subindoDoc || extraindo} onFile={(e) => { setFonte('pdf'); lerDocumento(e); }} />
          </div>
        )}

        {/* ETAPA: preview / edição das linhas */}
        {etapa === 'preview' && (
          <div className="p-5 space-y-4">
            {docUrl && (
              <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300">
                <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="flex-1 min-w-0 truncate">Nota anexada: <a href={docUrl} target="_blank" rel="noreferrer" className="text-emerald-400 underline">{docNome || 'documento'}</a></span>
                {extraindo ? (
                  <span className="flex items-center gap-1.5 text-xs text-blue-300 flex-shrink-0"><Loader2 className="w-3.5 h-3.5 animate-spin" /> IA lendo a nota…</span>
                ) : docFile && (
                  <button onClick={() => extrairComIA(docFile)} className="flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 font-medium flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5" /> Reprocessar com IA
                  </button>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <L label="Nº Nota Fiscal"><input value={nf} onChange={(e) => setNf(e.target.value)} className={inp} placeholder="Opcional" /></L>
              <L label="Fornecedor"><input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className={inp} placeholder="Opcional" /></L>
              <L label="Obra"><select value={obra} onChange={(e) => setObra(e.target.value)} className={inp}>
                <option value="">🏭 MONTEX (Geral)</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} · ` : ''}{o.nome}</option>)}
              </select></L>
            </div>

            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/60 text-slate-400 text-xs">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Descrição / Material *</th>
                    <th className="text-left px-3 py-2 font-medium w-28">Código</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Qtd *</th>
                    <th className="text-left px-3 py-2 font-medium w-20">Un.</th>
                    <th className="text-right px-3 py-2 font-medium w-28">Preço un.</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((r, i) => {
                    const existe = acharExistente(r);
                    return (
                      <tr key={i} className="hover:bg-slate-800/40">
                        <td className="px-2 py-1">
                          <input value={r.descricao} onChange={(e) => setRow(i, 'descricao', e.target.value)} className={cel} placeholder="Ex.: Chapa 3/16 A36" />
                          {existe && <span className="text-[10px] text-amber-400 ml-1">↑ soma ao existente ({Number(existe.quantidade) || 0})</span>}
                        </td>
                        <td className="px-2 py-1"><input value={r.codigo} onChange={(e) => setRow(i, 'codigo', e.target.value)} className={cel} /></td>
                        <td className="px-2 py-1"><input type="number" inputMode="decimal" value={r.quantidade} onChange={(e) => setRow(i, 'quantidade', e.target.value)} className={cel + ' text-right'} /></td>
                        <td className="px-2 py-1"><input value={r.unidade} onChange={(e) => setRow(i, 'unidade', e.target.value)} className={cel} /></td>
                        <td className="px-2 py-1"><input type="number" inputMode="decimal" value={r.preco} onChange={(e) => setRow(i, 'preco', e.target.value)} className={cel + ' text-right'} /></td>
                        <td className="px-1 text-center"><button onClick={() => delRow(i)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button onClick={addRow} className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 font-medium">
              <Plus className="w-4 h-4" /> Adicionar item
            </button>

            <div className="flex justify-between items-center gap-3 pt-4 border-t border-slate-700">
              <span className="text-xs text-slate-500">{rows.filter((r) => r.descricao.trim() && N(r.quantidade) > 0).length} item(ns) válido(s)</span>
              <div className="flex gap-3">
                <button onClick={reset} className="px-4 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm">Trocar fonte</button>
                <button onClick={confirmar} className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm">Registrar chegada</button>
              </div>
            </div>
          </div>
        )}

        {etapa === 'salvando' && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
            <p className="text-sm text-slate-400">Registrando entradas no estoque…</p>
          </div>
        )}

        {etapa === 'ok' && (
          <div className="flex flex-col items-center justify-center py-16">
            <Check className="w-10 h-10 text-emerald-500 mb-3" />
            <p className="text-white font-semibold">Chegada registrada!</p>
            <p className="text-slate-400 text-sm mt-1">{resultado.novos} item(ns) novo(s) · {resultado.atualizados} atualizado(s)</p>
            <button onClick={fechar} className="mt-5 px-5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-sm hover:bg-slate-700">Concluir</button>
          </div>
        )}
      </div>
    </div>
  );
}

const inp = 'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50';
const cel = 'w-full bg-slate-900/60 border border-slate-700/60 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50';

function L({ label, children }) {
  return <div><label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>{children}</div>;
}

const CORES = { emerald: 'text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/10', blue: 'text-blue-400 border-blue-500/40 hover:bg-blue-500/10', cyan: 'text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/10', orange: 'text-orange-400 border-orange-500/40 hover:bg-orange-500/10' };
function FonteCard({ icon: Icon, cor, titulo, sub, accept, capture, loading, onFile }) {
  const id = `fonte-${titulo}`;
  return (
    <label htmlFor={id} className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center flex flex-col items-center gap-2 transition ${CORES[cor]}`}>
      {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Icon className="w-8 h-8" />}
      <span className="font-semibold text-white text-sm">{titulo}</span>
      <span className="text-xs text-slate-400 leading-tight">{sub}</span>
      <input id={id} type="file" accept={accept} capture={capture} onChange={onFile} className="hidden" />
    </label>
  );
}
