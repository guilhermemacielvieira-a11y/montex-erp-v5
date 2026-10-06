// ============================================================
// GESTÃO DE MEDIÇÃO — FABRICAÇÃO (pleito de autorização)
// ============================================================
// Fluxo: fabricado elegível (entregue na obra + aguardando carga + processo
// final pintura/solda) − já medido = disponível para nova medição.
// Cálculo em services/medicaoPleito.js (testado). Exporta o pleito em PDF e
// HTML no padrão visual dos relatórios Montex, para envio ao cliente.
// Escopo = seletor ÚNICO do topo: 1 obra ou grupo → pleito; Geral → resumo
// por obra.
// ============================================================
import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Target, FileDown, FileCode2, ArrowRight, Edit, Save, X, CheckCircle2, Clock,
  Truck, Package, Flame, Paintbrush, Hammer, CircleDashed, Minus, Equal, AlertTriangle, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useObras, useProducao, useMedicoes } from '../contexts/ERPContext';
import { grupoDoEscopo, rotuloEscopo, obraIdUnica } from '../lib/escopoObra';
import { hojeLocalISO } from '../utils/financeiroCalc';
import { apurarPleito, valorKgDaObra, INCLUIR_PADRAO, GRUPOS_ETAPA } from '../services/medicaoPleito';
import { modeloPleito, fmtMoeda, fmtKg, fmtUn, fmtPct, fmtData } from '../services/relatorioMedicao';

// Obras medidas por UNIDADE (produto seriado). Demais: por kg.
// Persistido em localStorage (legado desta tela) + sementes do contrato.
const STORAGE_KEY_CONFIG_OBRAS = 'medicao_config_obras_v1';
const CONFIG_OBRAS_SEED = {
  'obra-004': { modo: 'unidade', valor: 20.00, qtdContrato: 500 },
  'obra-005': { modo: 'unidade', valor: 20.00, qtdContrato: 1500 },
};
const lerConfigObras = () => {
  try { return { ...CONFIG_OBRAS_SEED, ...(JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG_OBRAS) || '{}') || {}) }; }
  catch { return { ...CONFIG_OBRAS_SEED }; }
};
const gravarConfigObras = (cfg) => { try { localStorage.setItem(STORAGE_KEY_CONFIG_OBRAS, JSON.stringify(cfg)); } catch { /* quota */ } };

const ICONES = { entregue: Truck, aguardandoCarga: Package, pintura: Paintbrush, solda: Flame, fabricacao: Hammer, naoIniciado: CircleDashed };
const SITUACAO = {
  paga: { txt: 'Paga', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  aprovada: { txt: 'Aprovada', cls: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  em_analise: { txt: 'Em análise', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  cancelada: { txt: 'Cancelada', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const carregarLogo = async () => (await import('@/utils/montexLogos')).LOGO_M_MAIN_B64;

/** Config de medição de um conjunto de obras (modo, R$/un, contrato). */
function configDe({ obrasEsc, grupo, configObras }) {
  if (grupo) return { modo: grupo.modo || 'kg', valorUnit: grupo.valor || 0, contrato: grupo.qtdContrato || 0, origem: 'grupo' };
  if (obrasEsc.length === 1) {
    const o = obrasEsc[0];
    const cfg = configObras[o.id];
    if (cfg?.modo === 'unidade') return { modo: 'unidade', valorUnit: cfg.valor || 0, contrato: cfg.qtdContrato || 0, origem: 'local' };
    return { modo: 'kg', valorUnit: valorKgDaObra(o) || 0, contrato: 0, origem: 'obra' };
  }
  return { modo: 'kg', valorUnit: 0, contrato: 0, origem: 'nenhuma' };
}

export default function MedicaoAutomaticaPage() {
  const navigate = useNavigate();
  const { obras, escopoObra, obraIdsEscopo, setObraAtual, updateObra } = useObras();
  const { pecas } = useProducao();
  const { medicoes } = useMedicoes();

  const grupo = grupoDoEscopo(escopoObra);
  const obraUnicaId = obraIdUnica(escopoObra);
  const ehGeral = !obraIdsEscopo;

  const [configObras, setConfigObras] = useState(lerConfigObras);
  const [incluir, setIncluir] = useState({ ...INCLUIR_PADRAO });
  const [dataBase, setDataBase] = useState(hojeLocalISO());
  const [observacao, setObservacao] = useState('');
  const [editandoValor, setEditandoValor] = useState(false);
  const [novoValor, setNovoValor] = useState('');
  const [exportando, setExportando] = useState(null);

  const obrasAtivas = useMemo(() => (obras || []).filter((o) => o.status !== 'cancelada'), [obras]);
  const obrasEsc = useMemo(
    () => (ehGeral ? [] : obrasAtivas.filter((o) => obraIdsEscopo.includes(o.id))),
    [ehGeral, obrasAtivas, obraIdsEscopo],
  );

  const cfg = useMemo(() => configDe({ obrasEsc, grupo, configObras }), [obrasEsc, grupo, configObras]);
  const kg = cfg.modo !== 'unidade';
  const fm = kg ? fmtKg : fmtUn;

  // ===== Apuração do escopo (1 obra ou grupo) =====
  const ap = useMemo(() => {
    if (ehGeral) return null;
    return apurarPleito({ obras: obrasEsc, pecas, medicoes, incluir, modo: cfg.modo, valorUnit: cfg.valorUnit, contrato: cfg.contrato });
  }, [ehGeral, obrasEsc, pecas, medicoes, incluir, cfg]);

  // ===== Geral: resumo por obra =====
  const resumoObras = useMemo(() => {
    if (!ehGeral) return [];
    return obrasAtivas.map((o) => {
      const c = configDe({ obrasEsc: [o], grupo: null, configObras });
      const r = apurarPleito({ obras: [o], pecas, medicoes, incluir, modo: c.modo, valorUnit: c.valorUnit, contrato: c.contrato });
      return { obra: o, cfg: c, r };
    }).filter(({ r }) => r.totalProjeto > 0 || r.medido > 0)
      .sort((a, b) => b.r.valorDisponivel - a.r.valorDisponivel);
  }, [ehGeral, obrasAtivas, pecas, medicoes, incluir, configObras]);

  const totaisGeral = useMemo(() => resumoObras.reduce((s, { r }) => ({
    valor: s.valor + r.valorDisponivel,
    semValor: s.semValor + (r.valorUnit > 0 ? 0 : 1),
    obrasComSaldo: s.obrasComSaldo + (r.valorDisponivel > 0 ? 1 : 0),
  }), { valor: 0, semValor: 0, obrasComSaldo: 0 }), [resumoObras]);

  // ===== Editar valor unitário =====
  const abrirEdicao = () => { setNovoValor(String(cfg.valorUnit || '')); setEditandoValor(true); };
  const salvarValor = async () => {
    const v = parseFloat(String(novoValor).replace(',', '.'));
    if (!(v > 0)) { toast.error('Informe um valor maior que zero'); return; }
    if (grupo) { toast.error('O valor do grupo é fixo no cadastro do grupo. Selecione uma obra para editar.'); return; }
    const o = obrasEsc[0];
    if (!o) return;
    try {
      if (cfg.modo === 'unidade') {
        const novo = { ...configObras, [o.id]: { ...(configObras[o.id] || {}), modo: 'unidade', valor: v } };
        setConfigObras(novo); gravarConfigObras(novo);
      } else {
        await updateObra(o.id, { valorKgFabricacao: v });
      }
      toast.success(`Valor salvo: ${v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 4 })}/${kg ? 'kg' : 'un'}`);
      setEditandoValor(false);
    } catch (e) {
      toast.error(`Erro ao salvar: ${e?.message || e}`);
    }
  };

  // ===== Exportar =====
  const infoRelatorio = useCallback(() => {
    const o = obrasEsc[0];
    return {
      obraNome: grupo ? grupo.label.replace(/^[^\p{L}\p{N}]+/u, '') : (o?.nome || ''),
      obraCodigo: grupo ? '' : (o?.codigo || ''),
      cliente: o?.cliente || '',
      numero: ap?.proximoNumero,
      dataISO: dataBase,
      observacao: observacao.trim(),
    };
  }, [obrasEsc, grupo, ap, dataBase, observacao]);

  const exportar = async (formato) => {
    if (!ap) return;
    if (!(ap.valorUnit > 0)) { toast.error(`Cadastre o valor por ${kg ? 'kg' : 'unidade'} antes de exportar`); return; }
    setExportando(formato);
    try {
      const mod = modeloPleito(ap, infoRelatorio());
      const logoDataUrl = await carregarLogo().catch(() => null);
      if (formato === 'pdf') {
        const { gerarPleitoMedicaoPDF } = await import('../services/relatorioMedicaoPDF');
        const { paginas } = gerarPleitoMedicaoPDF(mod, { logoDataUrl });
        toast.success(`PDF gerado (${paginas} página${paginas > 1 ? 's' : ''})`);
      } else {
        const { baixarPleitoMedicaoHTML } = await import('../services/relatorioMedicaoHTML');
        baixarPleitoMedicaoHTML(mod, { logoDataUrl });
        toast.success('HTML gerado');
      }
    } catch (e) {
      console.error('[Medição] exportar', e);
      toast.error(`Erro ao exportar: ${e?.message || e}`);
    } finally {
      setExportando(null);
    }
  };

  const toggleGrupo = (key) => setIncluir((s) => ({ ...s, [key]: !s[key] }));

  // ====================== RENDER ======================
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Target className="h-7 w-7 text-emerald-500" />
            Gestão de Medição — Fabricação
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Fabricado elegível (entregue + aguardando carga + processo final) − já medido = disponível para nova medição
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" disabled={ehGeral || !!exportando} onClick={() => exportar('pdf')}
            title={ehGeral ? 'Selecione uma obra no topo para gerar o pleito' : 'Pleito de medição em PDF para o cliente'}>
            <FileDown className="h-4 w-4 mr-2" />{exportando === 'pdf' ? 'Gerando…' : 'Exportar PDF'}
          </Button>
          <Button variant="outline" className="border-slate-700 text-slate-200 hover:bg-slate-800" disabled={ehGeral || !!exportando} onClick={() => exportar('html')}
            title={ehGeral ? 'Selecione uma obra no topo para gerar o pleito' : 'Pleito de medição em HTML (abre em qualquer navegador)'}>
            <FileCode2 className="h-4 w-4 mr-2" />{exportando === 'html' ? 'Gerando…' : 'Exportar HTML'}
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={!obraUnicaId} onClick={() => navigate('/GestaoFinanceiraObra')}
            title={obraUnicaId ? 'Lançar a medição autorizada na Gestão Financeira da Obra' : 'Selecione uma obra no topo'}>
            Lançar medição <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Escopo + parâmetros do pleito */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col xl:flex-row xl:items-center gap-4 xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700 text-sm text-slate-200" title="Altere a obra no seletor do topo">
            <Building2 className="h-4 w-4 text-slate-400" />{rotuloEscopo(escopoObra, obras)}
          </span>
          {!ehGeral && (
            editandoValor ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">R$/{kg ? 'kg' : 'un'}</span>
                <Input autoFocus type="number" step="0.01" value={novoValor} onChange={(e) => setNovoValor(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') salvarValor(); if (e.key === 'Escape') setEditandoValor(false); }}
                  className="w-28 h-9 bg-slate-900 border-slate-600 text-white" />
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={salvarValor}><Save className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setEditandoValor(false)}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <button type="button" onClick={abrirEdicao} disabled={!!grupo}
                className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm',
                  cfg.valorUnit > 0 ? 'bg-orange-500/10 border-orange-500/30 text-orange-300' : 'bg-red-500/10 border-red-500/40 text-red-300')}
                title={grupo ? 'Valor fixo do grupo' : 'Editar valor unitário contratado'}>
                {cfg.valorUnit > 0
                  ? <>{cfg.valorUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 4 })}/{kg ? 'kg' : 'un'}</>
                  : <>Sem valor por {kg ? 'kg' : 'unidade'} — cadastrar</>}
                {!grupo && <Edit className="h-3.5 w-3.5" />}
              </button>
            )
          )}
        </div>
        {!ehGeral && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2 text-slate-400">Data-base
              <Input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value)} className="h-9 w-40 bg-slate-900 border-slate-600 text-white" />
            </label>
          </div>
        )}
      </div>

      {ehGeral ? (
        <ResumoGeral resumo={resumoObras} totais={totaisGeral} onAbrir={(id) => setObraAtual(id)} />
      ) : ap && (
        <>
          {/* HERO: disponível + fluxo */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
            <div className={cn('xl:col-span-2 rounded-xl p-6 border flex flex-col justify-between',
              ap.disponivel > 0 ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-800/50 border-slate-700')}>
              <div>
                <p className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">Disponível para nova medição</p>
                <p className="text-4xl font-bold text-white mt-2">{fmtMoeda(ap.valorDisponivel)}</p>
                <p className="text-slate-300 mt-1">{fm(ap.disponivel)} × {(ap.valorUnit || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 4 })}/{ap.unidade}</p>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-900/50 p-3">
                  <p className="text-slate-400 text-xs">Próxima medição</p>
                  <p className="text-white font-semibold">nº {ap.proximoNumero}</p>
                </div>
                <div className="rounded-lg bg-slate-900/50 p-3">
                  <p className="text-slate-400 text-xs">Saldo do contrato</p>
                  <p className="text-white font-semibold">{fm(ap.saldoContrato)}</p>
                </div>
              </div>
              {ap.excedente > 0 && (
                <p className="mt-3 text-xs text-red-300 flex items-start gap-1.5"><AlertTriangle className="h-4 w-4 shrink-0" />
                  Já medido supera o fabricado elegível em {fm(ap.excedente)}.</p>
              )}
              {!(ap.valorUnit > 0) && (
                <p className="mt-3 text-xs text-red-300 flex items-start gap-1.5"><AlertTriangle className="h-4 w-4 shrink-0" />
                  Cadastre o valor por {kg ? 'kg' : 'unidade'} para calcular o valor e exportar.</p>
              )}
            </div>

            <div className="xl:col-span-3 bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Memória de cálculo</h3>
                <span className="text-xs text-slate-500">Marque o que entra no pleito</span>
              </div>
              <div className="space-y-1.5">
                {ap.composicao.filter((c) => c.elegivel).map((c) => {
                  const Icone = ICONES[c.key];
                  return (
                    <label key={c.key} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition',
                      c.incluido ? 'bg-slate-900/60 border-slate-600' : 'bg-transparent border-slate-800 opacity-60')}>
                      <input type="checkbox" checked={c.incluido} onChange={() => toggleGrupo(c.key)} className="accent-emerald-500 h-4 w-4" />
                      <Icone className="h-4 w-4" style={{ color: c.cor }} />
                      <span className="text-sm text-slate-200 flex-1">{c.label}</span>
                      <span className="text-xs text-slate-500">{c.pecas} pç</span>
                      <span className="text-sm font-semibold text-white w-28 text-right">{fm(c.medida)}</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 space-y-1.5 text-sm">
                <LinhaFluxo icone={Equal} label={`Fabricado elegível${ap.tetoElegivel < ap.elegivel ? ' (limitado ao contrato)' : ''}`} valor={fm(ap.tetoElegivel)} cls="bg-slate-700/40 text-white font-semibold" />
                <LinhaFluxo icone={Minus} label="Já medido (fabricação)" valor={`${fm(ap.medido)} · ${fmtMoeda(ap.valorMedido)}`} cls="text-red-300" />
                <LinhaFluxo icone={Equal} label="Disponível para medição" valor={fm(ap.disponivel)} cls="bg-emerald-500/15 text-emerald-300 font-bold" />
              </div>
              {ap.valorAdiantamentos > 0 && (
                <p className="text-xs text-slate-500 mt-2">Adiantamentos/entradas de contrato ({fmtMoeda(ap.valorAdiantamentos)}) não abatem peso — aparecem só no histórico.</p>
              )}
            </div>
          </div>

          {/* Situação do contrato */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h3 className="text-white font-semibold">Situação do contrato</h3>
              <span className="text-sm text-slate-400">Contratado: <b className="text-white">{fm(ap.contrato)}</b>{ap.valorContrato > 0 && <> · {fmtMoeda(ap.valorContrato)}</>}</span>
            </div>
            <div className="flex h-5 rounded-md overflow-hidden bg-slate-900">
              {ap.barra.filter((b) => b.pct > 0.05).map((b) => (
                <div key={b.key} style={{ width: `${b.pct}%`, background: b.key === 'aFabricar' ? '#334155' : b.cor }} title={`${b.label}: ${fm(b.valor)} (${fmtPct(b.pct)})`} />
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {ap.barra.map((b) => (
                <div key={b.key} className="rounded-lg bg-slate-900/50 p-3">
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: b.key === 'aFabricar' ? '#475569' : b.cor }} />{b.label}
                  </p>
                  <p className="text-white font-semibold mt-1">{fm(b.valor)}</p>
                  <p className="text-xs text-slate-500">{fmtPct(b.pct)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline da produção */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3">Produção por etapa</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {[...GRUPOS_ETAPA].reverse().map((g) => {
                const c = ap.composicao.find((x) => x.key === g.key);
                const Icone = ICONES[g.key];
                return (
                  <div key={g.key} className={cn('rounded-lg p-3 border', c.incluido ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-700 bg-slate-900/40')}>
                    <div className="flex items-center justify-between">
                      <Icone className="h-4 w-4" style={{ color: g.cor }} />
                      {c.incluido ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Clock className="h-3.5 w-3.5 text-slate-600" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{g.label}</p>
                    <p className="text-white font-semibold">{fm(c.medida)}</p>
                    <p className="text-xs text-slate-500">{c.pecas} peças · {fmtPct(ap.totalProjeto > 0 ? (c.medida / ap.totalProjeto) * 100 : 0)}</p>
                  </div>
                );
              })}
            </div>
            {ap.previsaoProxima > 0 && (
              <p className="text-xs text-slate-500 mt-3">Em fabricação ({fm(ap.previsaoProxima)}) entra nas próximas medições quando chegar à solda.</p>
            )}
          </div>

          {/* Histórico */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">Medições lançadas</h3>
              <span className="text-xs text-slate-500">Fonte: Gestão Financeira da Obra</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900/50 text-slate-400 text-xs">
                    <th className="px-4 py-2.5 text-left">Nº</th>
                    <th className="px-4 py-2.5 text-left">Data</th>
                    <th className="px-4 py-2.5 text-left">Descrição</th>
                    <th className="px-4 py-2.5 text-right">{kg ? 'Peso' : 'Unidades'}</th>
                    <th className="px-4 py-2.5 text-right">Valor</th>
                    <th className="px-4 py-2.5 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {ap.historico.length ? ap.historico.map((h) => (
                    <tr key={h.id} className={cn('border-b border-slate-700/50', h.tipo !== 'fabricacao' && 'opacity-60')}>
                      <td className="px-4 py-2.5 text-slate-300">{h.numero != null ? `#${h.numero}` : '-'}</td>
                      <td className="px-4 py-2.5 text-slate-300">{fmtData(h.data)}</td>
                      <td className="px-4 py-2.5 text-white">
                        {h.descricao}
                        {h.tipo === 'adiantamento' && <span className="ml-2 text-xs text-slate-500">adiantamento</span>}
                        {h.tipo === 'outra' && <span className="ml-2 text-xs text-slate-500">não é fabricação</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-200 font-mono">{h.tipo === 'fabricacao' ? fm(h.medida) : '—'}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-400 font-semibold">{fmtMoeda(h.valor)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs border', SITUACAO[h.situacao]?.cls)}>{SITUACAO[h.situacao]?.txt || h.situacao}</span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nenhuma medição lançada para esta obra.</td></tr>
                  )}
                </tbody>
                {ap.historico.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-900/70 font-semibold">
                      <td colSpan={3} className="px-4 py-2.5 text-white">Total medido (fabricação)</td>
                      <td className="px-4 py-2.5 text-right text-white font-mono">{fm(ap.medido)}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-400">{fmtMoeda(ap.valorMedido)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Observação do pleito */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <label className="text-sm text-slate-300 font-medium">Observações para o cliente <span className="text-slate-500 font-normal">(saem no PDF/HTML)</span></label>
            <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} maxLength={800}
              placeholder="Ex.: peças da Fila de Embarque com carregamento previsto para 10/10."
              className="mt-2 w-full rounded-lg bg-slate-900 border border-slate-700 text-white text-sm p-3 focus:outline-none focus:border-emerald-500" />
          </div>
        </>
      )}
    </div>
  );
}

function LinhaFluxo({ icone: Icone, label, valor, cls }) {
  return (
    <div className={cn('flex items-center gap-3 px-3 py-2 rounded-lg', cls)}>
      <Icone className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      <span className="text-right">{valor}</span>
    </div>
  );
}

function ResumoGeral({ resumo, totais, onAbrir }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-5 border bg-emerald-500/10 border-emerald-500/40">
          <p className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">Disponível para medição (todas as obras)</p>
          <p className="text-3xl font-bold text-white mt-2">{fmtMoeda(totais.valor)}</p>
        </div>
        <div className="rounded-xl p-5 border bg-slate-800/50 border-slate-700">
          <p className="text-xs text-slate-400">Obras com saldo a medir</p>
          <p className="text-3xl font-bold text-white mt-2">{totais.obrasComSaldo}</p>
        </div>
        <div className={cn('rounded-xl p-5 border', totais.semValor ? 'bg-red-500/10 border-red-500/40' : 'bg-slate-800/50 border-slate-700')}>
          <p className="text-xs text-slate-400">Obras sem valor por kg cadastrado</p>
          <p className="text-3xl font-bold text-white mt-2">{totais.semValor}</p>
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-white font-semibold">Disponível por obra</h3>
          <p className="text-xs text-slate-500 mt-0.5">Clique numa obra para abrir o pleito (muda o seletor do topo).</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs">
                <th className="px-4 py-2.5 text-left">Obra</th>
                <th className="px-4 py-2.5 text-right">Contratado</th>
                <th className="px-4 py-2.5 text-right">Fabricado elegível</th>
                <th className="px-4 py-2.5 text-right">Já medido</th>
                <th className="px-4 py-2.5 text-right">Disponível</th>
                <th className="px-4 py-2.5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {resumo.length ? resumo.map(({ obra, r }) => {
                const fm = r.modo === 'unidade' ? fmtUn : fmtKg;
                return (
                  <tr key={obra.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer" onClick={() => onAbrir(obra.id)}>
                    <td className="px-4 py-2.5">
                      <p className="text-white">{obra.nome}</p>
                      <p className="text-xs text-slate-500">{obra.codigo}{obra.cliente ? ` · ${obra.cliente}` : ''}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{fm(r.contrato)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{fm(r.tetoElegivel)} <span className="text-xs text-slate-500">{fmtPct(r.pctElegivel)}</span></td>
                    <td className="px-4 py-2.5 text-right text-slate-300">{fm(r.medido)} <span className="text-xs text-slate-500">{fmtPct(r.pctMedido)}</span></td>
                    <td className={cn('px-4 py-2.5 text-right font-semibold', r.disponivel > 0 ? 'text-emerald-400' : 'text-slate-500')}>{fm(r.disponivel)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {r.valorUnit > 0
                        ? <span className={cn('font-semibold', r.valorDisponivel > 0 ? 'text-emerald-400' : 'text-slate-500')}>{fmtMoeda(r.valorDisponivel)}</span>
                        : <span className="text-xs text-red-300">sem R$/{r.unidade}</span>}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nenhuma obra com produção ou medição.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
