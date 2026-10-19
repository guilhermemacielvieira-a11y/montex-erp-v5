// ============================================================
// Importar lista de posições (corte) da obra → materiais_corte
// + composição MARCA × POS → composicao_marcas
// ============================================================
// Aceita a planilha do Tekla/engenharia em dois formatos:
//   • plana: Conjunto | Posição | Qtd | Perfil | Comprimento | Material | Peso
//   • hierárquica: linha do conjunto (sem perfil) seguida das posições
// Posição nova → insere (status aguardando, baixa controlada).
// Posição existente ainda não cortada → atualiza. Já cortada → não mexe.
// ============================================================
import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Loader2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/api/supabaseClient';
import { parseListaPosicoes, planoImportacaoPosicoes, marcasDaObra } from '@/services/fluxoIntegrado';

const kg = (v) => `${Math.round(Number(v) || 0).toLocaleString('pt-BR')} kg`;
const slug = (s) => String(s).replace(/[^A-Za-z0-9]+/g, '').slice(0, 20);

export default function ImportarPosicoesDialog({ open, onOpenChange, obraId, cortesExistentes = [], pecasObra = [], onImportado }) {
  const [arquivo, setArquivo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const qtdConjuntos = useMemo(() => {
    const m = new Map();
    for (const g of marcasDaObra(pecasObra).values()) m.set(g.marca, g.qtdTotal);
    return m;
  }, [pecasObra]);

  const plano = useMemo(() => (resultado ? planoImportacaoPosicoes(resultado.posicoes, cortesExistentes) : null), [resultado, cortesExistentes]);

  const limpar = () => { setArquivo(null); setResultado(null); setErro(null); };

  const lerArquivo = async (file) => {
    limpar();
    if (!file) return;
    setArquivo(file);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
      setResultado(parseListaPosicoes(linhas, { qtdConjuntos }));
    } catch (e) {
      setErro(`Não foi possível ler a planilha: ${e.message}`);
    }
  };

  const importar = async () => {
    if (!plano || !obraId) return;
    setSalvando(true);
    setErro(null);
    try {
      const agora = new Date().toISOString();
      const base = Date.now().toString(36);
      const novas = plano.novas.map((p, i) => ({
        id: `MC-${slug(obraId)}-${slug(p.pos)}-${base}${i.toString(36)}`,
        obra_id: obraId, marca: p.pos, peca: p.tipo || null, quantidade: p.quantidade,
        perfil: p.perfil, comprimento_mm: p.comprimento_mm, material: p.material || null,
        peso_teorico: p.peso_teorico, status_corte: 'aguardando', baixa_estoque_kg: 0,
        created_at: agora, updated_at: agora,
      }));
      for (let i = 0; i < novas.length; i += 500) {
        const { error } = await supabase.from('materiais_corte').insert(novas.slice(i, i + 500));
        if (error) throw error;
      }
      for (const p of plano.alteradas) {
        const { error } = await supabase.from('materiais_corte')
          .update({ quantidade: p.quantidade, perfil: p.perfil, comprimento_mm: p.comprimento_mm, material: p.material || null, peso_teorico: p.peso_teorico, peca: p.tipo || p.atual.peca, updated_at: agora })
          .eq('id', p.atual.id)
          .eq('status_corte', p.atual.status_corte || 'aguardando');
        if (error) throw error;
      }
      let compOk = true;
      if (resultado.composicao.length) {
        const linhas = resultado.composicao.map((c) => ({ obra_id: obraId, marca: c.marca, pos: c.pos, qtd_por_unidade: c.qtd_por_unidade, origem: 'importacao', updated_at: agora }));
        for (let i = 0; i < linhas.length; i += 500) {
          const { error } = await supabase.from('composicao_marcas').upsert(linhas.slice(i, i + 500), { onConflict: 'obra_id,marca,pos' });
          if (error) { compOk = false; console.error('[composicao_marcas]', error); break; }
        }
      }
      onImportado?.({ novas: novas.length, alteradas: plano.alteradas.length, composicao: compOk ? resultado.composicao.length : 0, compOk });
      limpar();
      onOpenChange(false);
    } catch (e) {
      setErro(e.message || String(e));
    } finally {
      setSalvando(false);
    }
  };

  const marcasSemCadastro = useMemo(() => {
    if (!resultado) return [];
    const s = new Set();
    for (const c of resultado.composicao) if (!qtdConjuntos.has(c.marca)) s.add(c.marca);
    return [...s];
  }, [resultado, qtdConjuntos]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!salvando) { onOpenChange(v); if (!v) limpar(); } }}>
      <DialogContent className="max-w-2xl bg-slate-900 text-slate-100 border-slate-700">
        <DialogHeader>
          <DialogTitle>Importar lista de posições (corte)</DialogTitle>
          <DialogDescription className="text-slate-400">
            Planilha com Posição, Qtd, Perfil, Comprimento, Material e Peso. Com a coluna Conjunto (ou no formato hierárquico do Tekla),
            grava também quais posições formam cada marca — é isso que libera a marca para a fabricação quando o corte termina.
          </DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-600 p-6 text-sm text-slate-300 hover:border-sky-500">
          <Upload className="h-6 w-6 text-sky-400" />
          {arquivo ? arquivo.name : 'Selecionar planilha (.xlsx, .xls, .csv)'}
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => lerArquivo(e.target.files?.[0])} />
        </label>

        {resultado && plano && (
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Box rotulo="Novas" valor={plano.novas.length} sub={kg(plano.novas.reduce((s, p) => s + p.peso_teorico, 0))} cor="text-emerald-400" />
              <Box rotulo="Atualizadas" valor={plano.alteradas.length} sub="ainda não cortadas" cor="text-sky-400" />
              <Box rotulo="Iguais" valor={plano.iguais.length} sub="sem mudança" cor="text-slate-300" />
              <Box rotulo="Já cortadas" valor={plano.bloqueadas.length} sub="não alteradas" cor="text-amber-400" />
            </div>
            <div className="rounded border border-slate-700 bg-slate-950/60 p-2 text-xs text-slate-300">
              Composição: <b>{resultado.composicao.length}</b> ligações marca × posição
              {resultado.composicao.length === 0 && ' — sem coluna de conjunto: marcas de peça única (POS = marca) continuam ligadas automaticamente.'}
              {marcasSemCadastro.length > 0 && (
                <div className="mt-1 text-amber-300">Marcas da lista sem cadastro na produção desta obra: {marcasSemCadastro.slice(0, 12).join(', ')}{marcasSemCadastro.length > 12 ? '…' : ''}</div>
              )}
            </div>
            {resultado.avisos.length > 0 && (
              <ul className="max-h-24 overflow-y-auto text-xs text-amber-300">
                {resultado.avisos.slice(0, 20).map((a, i) => <li key={i}>• {a}</li>)}
              </ul>
            )}
          </div>
        )}

        {erro && <div className="flex items-center gap-2 text-sm text-red-400"><AlertTriangle className="h-4 w-4" />{erro}</div>}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={importar} disabled={salvando || !plano || (plano.novas.length + plano.alteradas.length === 0 && !resultado?.composicao.length)}>
            {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Box({ rotulo, valor, sub, cor }) {
  return (
    <div className="rounded border border-slate-700 bg-slate-950/60 p-2">
      <div className="text-[10px] uppercase text-slate-500">{rotulo}</div>
      <div className={`text-lg font-bold ${cor}`}>{valor}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
  );
}
