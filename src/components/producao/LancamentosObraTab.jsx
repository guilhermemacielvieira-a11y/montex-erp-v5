// ============================================================
// Lançamentos de produção por obra (grade conjunto × etapa)
// ============================================================
// Extraído de ProducaoFuncionarioPage. Grava: entity_store
// (producao_lancamento), producao_historico, pecas_producao.funcionario_* e
// materiais_corte (corte). A obra vem do seletor do topo (CLAUDE.md 1c).
// ============================================================
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Scissors, Flame, Droplets, Paintbrush, Package, Truck, ChevronDown, ChevronUp,
  RefreshCw, Loader2, Calendar, Save, Check, Search, AlertCircle, Building2, User,
} from 'lucide-react';
import { useEquipes, useObras } from '@/contexts/ERPContext';
import { supabase } from '@/api/supabaseClient';
import { obraIdUnica } from '@/lib/escopoObra';
import { hojeLocalISO } from '@/utils/financeiroCalc';

// ─── Constantes de etapas para o tab de lançamentos ────────────────────────────
const ETAPAS_LANCAMENTO = [
  { key: 'corte',      label: 'Corte',       icon: Scissors,   text: 'text-amber-400',   border: 'border-amber-600/40',  activeBg: 'bg-amber-500/10'   },
  { key: 'fabricacao', label: 'Fabricação',  icon: Flame,      text: 'text-purple-400',  border: 'border-purple-600/40', activeBg: 'bg-purple-500/10'  },
  { key: 'solda',      label: 'Solda',       icon: Droplets,   text: 'text-red-400',     border: 'border-red-600/40',    activeBg: 'bg-red-500/10'     },
  { key: 'pintura',    label: 'Pintura',     icon: Paintbrush, text: 'text-cyan-400',    border: 'border-cyan-600/40',   activeBg: 'bg-cyan-500/10'    },
  { key: 'montagem',   label: 'Montagem',    icon: Package,    text: 'text-teal-400',    border: 'border-teal-600/40',   activeBg: 'bg-teal-500/10'    },
  { key: 'expedido',   label: 'Expedição',   icon: Truck,      text: 'text-emerald-400', border: 'border-emerald-600/40',activeBg: 'bg-emerald-500/10' },
];
const ETAPA_CAMPO_FUNC_MAP = { fabricacao: 'funcionario_fabricacao', solda: 'funcionario_solda', pintura: 'funcionario_pintura', expedido: 'funcionario_expedido' };
const ETAPA_CAMPO_DATA_MAP = { fabricacao: 'data_inicio_fabricacao', solda: 'data_inicio_solda', pintura: 'data_inicio_pintura' };
// Data LOCAL (toISOString virava o dia seguinte depois das 21h em UTC-3)
const hojeStr = () => hojeLocalISO();
function gerarLancId() { return 'LANC-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8); }
function formatPesoLanc(kg) { if (!kg) return '—'; return `${(Number(kg) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`; }

/**
 * Expande peças com quantidade > 1 em entradas individuais por conjunto.
 * ID virtual: `${peca.id}__c${i}` | peso por conjunto = pesoTotal / quantidade.
 */
function expandirPorQtd(lista) {
  const result = [];
  for (const peca of lista) {
    const qtd = Math.max(1, parseInt(peca.quantidade || peca.qtd || 1, 10) || 1);
    const pesoBase = parseFloat(peca.peso_total || peca.pesoTotal || peca.peso || 0);
    const pesoPorConj = qtd > 1 ? pesoBase / qtd : pesoBase;
    if (qtd <= 1) {
      result.push({ ...peca, _originalId: peca.id, _conjuntoIdx: 1, _conjuntoTotal: 1 });
    } else {
      for (let i = 1; i <= qtd; i++) {
        result.push({
          ...peca,
          id:             `${peca.id}__c${i}`,
          _originalId:    peca.id,
          _conjuntoIdx:   i,
          _conjuntoTotal: qtd,
          peso:           pesoPorConj,
          peso_total:     pesoPorConj,
          pesoTotal:      pesoPorConj,
          quantidade:     1,
        });
      }
    }
  }
  return result;
}

// ─── Tab de Lançamentos por Obra ────────────────────────────────────────────────
const PAGE_SIZE = 25;

// PostgREST devolve no máximo 1000 linhas por chamada (CLAUDE.md regra 4)
async function buscarTodas(montar) {
  const out = [];
  for (let de = 0; de < 100000; de += 1000) {
    const { data, error } = await montar().range(de, de + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// ─── Tab de Lançamentos por Obra — carregamento leve por demanda ────────────────
export default function LancamentosObraTab({ refetch }) {
  const { funcionarios: ctxFuncionarios } = useEquipes();
  // Obra = seletor ÚNICO do topo (CLAUDE.md 1c). Escolher uma obra aqui muda o topo.
  const { obras: obrasCtx, escopoObra, setObraAtual: setEscopoTopo } = useObras();
  const obraTopo = obraIdUnica(escopoObra);

  // Fase 1 — seleção de obra (carregamento leve: apenas contagens)
  const [obrasResumo, setObrasResumo] = useState([]);
  const [loadingObras, setLoadingObras] = useState(false);

  // Fase 2 — detalhe da obra (carregado ao clicar)
  const [obraAtual, setObraAtual] = useState(null);
  const [pecasDaObra, setPecasDaObra] = useState([]);
  const [conjuntosDaObra, setConjuntosDaObra] = useState([]);
  const [lancamentos, setLancamentos] = useState({});
  const [saving, setSaving] = useState({});
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // Paginação + busca + filtro de tipo
  const [page, setPage] = useState(0);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [expandidos, setExpandidos] = useState({});

  const funcionariosAtivos = useMemo(() =>
    (ctxFuncionarios || []).filter(f => f.status !== 'inativo').sort((a, b) => (a.nome || '').localeCompare(b.nome || '')),
  [ctxFuncionarios]);

  const chave = (pecaId, etapa) => `${pecaId}__${etapa}`;

  // ─── Fase 1: resumo de obras — apenas 3 colunas, muito leve ────────
  const carregarObrasResumo = useCallback(async () => {
    setLoadingObras(true);
    const client = supabase;
    try {
      const data = await buscarTodas(() => client
        .from('pecas_producao')
        .select('obra_id, obra_nome, quantidade')
        .order('id', { ascending: true }));
      const mapa = new Map();
      for (const p of (data || [])) {
        if (!p.obra_id) continue; // peça sem obra não tem onde lançar
        const id = p.obra_id;
        const nome = (obrasCtx || []).find(o => o.id === id)?.nome || p.obra_nome || id;
        const qtd = Math.max(1, parseInt(p.quantidade || 1) || 1);
        if (!mapa.has(id)) mapa.set(id, { id, nome, totalPecas: 0, totalConjuntos: 0 });
        const o = mapa.get(id);
        o.totalPecas++;
        o.totalConjuntos += qtd;
      }
      setObrasResumo([...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (err) {
      console.error('[LancamentosObraTab] Erro obras:', err);
      toast.error('Erro ao carregar obras');
    } finally {
      setLoadingObras(false);
    }
  }, [obrasCtx]);

  useEffect(() => { carregarObrasResumo(); }, [carregarObrasResumo]);

  // ─── Fase 2: carregar peças + lançamentos de UMA obra ao clicar ────
  const abrirObra = useCallback(async (obraId, obraNome) => {
    setLoadingDetalhe(true);
    setObraAtual({ id: obraId, nome: obraNome });
    setLancamentos({});
    setPage(0);
    setBusca('');
    setFiltroTipo('');
    setExpandidos({});
    const client = supabase;
    try {
      const bruto = await buscarTodas(() => client
        .from('pecas_producao')
        .select('*')
        .eq('obra_id', obraId)
        .order('marca')
        .order('id'));
      const expandido = expandirPorQtd(bruto);
      setPecasDaObra(bruto);
      setConjuntosDaObra(expandido);
      // Carregar lançamentos existentes para essa obra
      if (expandido.length > 0) {
        const ids = expandido.map(p => p.id);
        // Lotes de 100 ids: uma obra grande estourava o tamanho da URL
        const lanData = [];
        for (let i = 0; i < ids.length; i += 100) {
          const { data: lote, error: lanErr } = await client
            .from('entity_store')
            .select('id, data')
            .eq('entity_type', 'producao_lancamento')
            .in('data->>peca_id', ids.slice(i, i + 100));
          if (lanErr) throw lanErr;
          lanData.push(...(lote || []));
        }
        const mapa = {};
        lanData.forEach(row => {
          const d = row.data || {};
          const k = chave(d.peca_id, d.etapa);
          mapa[k] = { _storeId: row.id, funcionario_id: d.funcionario_id || '', funcionario_nome: d.funcionario_nome || '', data_producao: d.data_producao || hojeStr(), observacoes: d.observacoes || '' };
        });
        setLancamentos(mapa);
      }
    } catch (err) {
      console.error('[LancamentosObraTab] Erro detalhe:', err);
      toast.error('Erro ao carregar obra');
    } finally {
      setLoadingDetalhe(false);
    }
  }, []);

  // Seguir o seletor do topo: obra única → abre direto
  useEffect(() => {
    if (obraTopo && obraTopo !== obraAtual?.id) {
      const o = (obrasCtx || []).find(x => x.id === obraTopo);
      abrirObra(obraTopo, o?.nome || obraTopo);
    } else if (!obraTopo && obraAtual) {
      setObraAtual(null);
    }
  }, [obraTopo]);

  const voltarParaObras = () => {
    setEscopoTopo('geral');
    setObraAtual(null);
    setPecasDaObra([]);
    setConjuntosDaObra([]);
    setLancamentos({});
    setPage(0);
    setBusca('');
    setFiltroTipo('');
  };

  // Lista de tipos únicos extraídos dos conjuntos da obra carregada
  const tiposDisponiveis = useMemo(() => {
    const set = new Set();
    conjuntosDaObra.forEach(p => {
      const t = (p.tipo || p.peca || '').trim();
      if (t) set.add(t);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [conjuntosDaObra]);

  // Filtro + paginação sobre os conjuntos da obra selecionada
  const conjuntosFiltrados = useMemo(() => {
    let lista = conjuntosDaObra;
    // Filtro por tipo de peça
    if (filtroTipo) {
      lista = lista.filter(p => (p.tipo || p.peca || '').trim() === filtroTipo);
    }
    // Filtro por texto livre
    if (busca) {
      const q = busca.toLowerCase();
      lista = lista.filter(p =>
        (p.marca || '').toLowerCase().includes(q) ||
        (p.tipo || '').toLowerCase().includes(q) ||
        (p.nome || '').toLowerCase().includes(q)
      );
    }
    return lista;
  }, [conjuntosDaObra, busca, filtroTipo]);

  const totalPages = Math.max(1, Math.ceil(conjuntosFiltrados.length / PAGE_SIZE));
  const conjuntosPagina = useMemo(() =>
    conjuntosFiltrados.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
  [conjuntosFiltrados, page]);

  useEffect(() => { setPage(0); }, [busca, filtroTipo]);

  const contagemEtapas = useMemo(() => {
    const map = {};
    ETAPAS_LANCAMENTO.forEach(e => { map[e.key] = conjuntosDaObra.filter(p => lancamentos[chave(p.id, e.key)]?.funcionario_id).length; });
    return map;
  }, [conjuntosDaObra, lancamentos]);

  // Editar campo
  const handleChange = (pecaId, etapa, campo, valor) => {
    const k = chave(pecaId, etapa);
    setLancamentos(prev => ({
      ...prev,
      [k]: {
        ...prev[k],
        funcionario_id:   campo === 'funcionario_id' ? valor : (prev[k]?.funcionario_id   || ''),
        funcionario_nome: campo === 'funcionario_id' ? (funcionariosAtivos.find(f => f.id === valor)?.nome || '') : (prev[k]?.funcionario_nome || ''),
        data_producao:    campo === 'data_producao'  ? valor : (prev[k]?.data_producao    || hojeStr()),
        observacoes:      campo === 'observacoes'    ? valor : (prev[k]?.observacoes       || ''),
      },
    }));
  };

  // Salvar lançamento individual — replica para entity_store + producao_historico + pecas_producao
  const salvarUm = useCallback(async (peca, etapa) => {
    const k = chave(peca.id, etapa);
    const lan = lancamentos[k];
    if (!lan?.funcionario_id) { toast.error('Selecione um funcionário'); return; }
    // ID real no banco (sem sufixo __c1, __c2 de conjunto virtual)
    const originalId = peca._originalId || peca.id;
    const conjLabel = peca._conjuntoTotal > 1 ? ` (Conj. ${peca._conjuntoIdx}/${peca._conjuntoTotal})` : '';
    setSaving(prev => ({ ...prev, [k]: true }));
    const client = supabase;
    try {
      const dataLan = {
        peca_id: peca.id,   // ID virtual — independente por conjunto
        peca_nome: peca.nome || peca.marca || '',
        etapa, funcionario_id: lan.funcionario_id, funcionario_nome: lan.funcionario_nome,
        data_producao: lan.data_producao || hojeStr(), observacoes: lan.observacoes || '',
        obra_id: peca.obra_id || peca.obraId || '', obra_nome: peca.obra_nome || peca.obraNome || '',
        conjunto_idx: peca._conjuntoIdx || 1, conjunto_total: peca._conjuntoTotal || 1,
        updated_at: new Date().toISOString(),
      };
      // 1. entity_store (ID virtual = rastreamento independente por conjunto)
      if (lan._storeId) {
        await client.from('entity_store').update({ data: dataLan }).eq('id', lan._storeId);
      } else {
        const novoId = gerarLancId();
        const { error: insErr } = await client.from('entity_store').insert({ id: novoId, entity_type: 'producao_lancamento', data: dataLan, created_date: new Date().toISOString() });
        if (insErr) throw insErr;
        setLancamentos(prev => ({ ...prev, [k]: { ...prev[k], _storeId: novoId } }));
      }
      // 2. producao_historico — ID inclui conjunto para não sobrescrever
      const histId = `HIST-${peca.id}-${etapa}`;
      const etapaParaMap = { corte: 'fabricacao', fabricacao: 'solda', solda: 'pintura', pintura: 'expedido', montagem: 'entregue', expedido: 'entregue' };
      // peca_id = peça REAL (antes gravava o id virtual __cN → registro órfão);
      // conjunto vira movimento parcial [QTD:1/N] (lido por normalizarHistorico).
      const conj = (peca._conjuntoTotal || 1) > 1;
      const obsHist = [conj ? `[QTD:1/${peca._conjuntoTotal}]` : '', lan.observacoes || ''].filter(Boolean).join(' ');
      const { error: histErr } = await client.from('producao_historico').upsert({ id: histId, peca_id: originalId, etapa_de: etapa === 'corte' ? 'aguardando' : etapa, etapa_para: etapaParaMap[etapa] || etapa, funcionario_id: lan.funcionario_id, funcionario_nome: lan.funcionario_nome, data_inicio: `${lan.data_producao || hojeStr()}T00:00:00Z`, observacoes: obsHist }, { onConflict: 'id' });
      if (histErr) throw histErr;
      // 3. pecas_producao — usa ID ORIGINAL (campo único por peça no banco)
      const campoFunc = ETAPA_CAMPO_FUNC_MAP[etapa];
      const campoData = ETAPA_CAMPO_DATA_MAP[etapa];
      // Conjunto de peça com qtd > 1: só grava o responsável da peça se ainda
      // não houver um (antes o último conjunto salvo sobrescrevia a peça toda).
      const pecaReal = pecasDaObra.find(p => p.id === originalId);
      const jaTem = pecaReal?.[campoFunc] && pecaReal[campoFunc] !== lan.funcionario_id;
      if (campoFunc && !(conj && jaTem)) {
        const upd = { [campoFunc]: lan.funcionario_id };
        if (campoData && lan.data_producao) upd[campoData] = `${lan.data_producao}T00:00:00Z`;
        const { error: pecaErr } = await client.from('pecas_producao').update(upd).eq('id', originalId);
        if (pecaErr) throw pecaErr;
      }
      // 4. materiais_corte (se corte) — usa ID original
      if (etapa === 'corte') await client.from('materiais_corte').update({ funcionario_corte: lan.funcionario_id }).eq('peca_id', originalId);

      const etapaInfo = ETAPAS_LANCAMENTO.find(e => e.key === etapa);
      toast.success(`${etapaInfo?.label}${conjLabel}: ${lan.funcionario_nome} ✓`);
      refetch?.();
    } catch (err) {
      console.error('[LancamentosObraTab] Erro ao salvar:', err);
      toast.error(`Erro ao salvar: ${err?.message || err}`);
    } finally {
      setSaving(prev => ({ ...prev, [k]: false }));
    }
  }, [lancamentos, pecasDaObra, refetch]);

  const toggleExpand = (pecaId) => setExpandidos(prev => ({ ...prev, [pecaId]: !prev[pecaId] }));
  const expandAll  = () => { const m = {}; conjuntosFiltrados.forEach(p => { m[p.id] = true; }); setExpandidos(m); };
  const collapseAll = () => setExpandidos({});

  const totalAtribuidos = Object.values(contagemEtapas).reduce((a, b) => a + b, 0);

  // ─── Tela 1: Seleção de obra ────────────────────────────────────────────────
  if (!obraAtual) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            Selecione uma Obra para Lançar Produção
          </h3>
          <button
            onClick={carregarObrasResumo}
            disabled={loadingObras}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700 transition-colors"
          >
            {loadingObras ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Atualizar
          </button>
        </div>

        {loadingObras ? (
          <div className="flex items-center justify-center h-48 gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando obras...
          </div>
        ) : obrasResumo.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-500">
            <AlertCircle className="h-8 w-8" />
            <p>Nenhuma obra encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {obrasResumo.map(obra => (
              <button
                key={obra.id}
                onClick={() => setEscopoTopo(obra.id)}
                className="text-left p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 hover:border-slate-600/70 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
                    <span className="font-semibold text-sm text-white truncate">{obra.nome}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-500 group-hover:text-slate-300 rotate-[-90deg] flex-shrink-0" />
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-white">{obra.totalConjuntos}</span>
                    <span className="text-[10px] text-slate-500">conjuntos</span>
                  </div>
                  <div className="w-px h-8 bg-slate-700" />
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-slate-300">{obra.totalPecas}</span>
                    <span className="text-[10px] text-slate-500">peças distintas</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Tela 2: Peças da obra selecionada (paginado) ───────────────────────────
  return (
    <div className="space-y-4">
      {/* Cabeçalho com botão Voltar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
        <button
          onClick={voltarParaObras}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700 transition-colors"
        >
          <ChevronDown className="h-3.5 w-3.5 rotate-90" /> Obras
        </button>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-purple-400" />
          <span className="font-semibold text-sm text-white">{obraAtual.nome}</span>
          <span className="text-xs text-slate-500">— {conjuntosDaObra.length} conjuntos</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => abrirObra(obraAtual.id, obraAtual.nome)}
            disabled={loadingDetalhe}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700 transition-colors"
          >
            {loadingDetalhe ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Recarregar
          </button>
        </div>
      </div>

      {/* Pills de resumo por etapa */}
      <div className="flex items-center gap-2 flex-wrap">
        {ETAPAS_LANCAMENTO.map(e => {
          const EIcon = e.icon;
          const cnt = contagemEtapas[e.key] || 0;
          return (
            <div key={e.key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${cnt > 0 ? `${e.activeBg} ${e.border} ${e.text}` : 'bg-slate-800/50 border-slate-700/50 text-slate-500'}`}>
              <EIcon className="h-3 w-3" />
              {e.label}
              <span className={`font-bold ${cnt > 0 ? '' : 'text-slate-600'}`}>{cnt}/{conjuntosDaObra.length}</span>
            </div>
          );
        })}
      </div>

      {/* Filtros por tipo de peça */}
      {tiposDisponiveis.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">Tipo:</span>
          <button
            onClick={() => setFiltroTipo('')}
            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${!filtroTipo ? 'bg-slate-600/40 border-slate-500/60 text-white font-semibold' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
          >
            Todos <span className="opacity-60 ml-1">({conjuntosDaObra.length})</span>
          </button>
          {tiposDisponiveis.map(tipo => {
            const cnt = conjuntosDaObra.filter(p => (p.tipo || p.peca || '').trim() === tipo).length;
            const ativo = filtroTipo === tipo;
            return (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(ativo ? '' : tipo)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${ativo ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 font-semibold' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
              >
                {tipo} <span className={`ml-1 ${ativo ? 'text-purple-400' : 'opacity-50'}`}>({cnt})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Barra de busca + paginação topo + expand/collapse */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar marca / tipo..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 w-52"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={expandAll}  className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors">Expandir</button>
          <button onClick={collapseAll} className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors">Recolher</button>
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
          <span>{conjuntosFiltrados.length} conjuntos · {totalAtribuidos} atribuições</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-colors">‹</button>
              <span className="px-2">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-colors">›</button>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {loadingDetalhe ? (
        <div className="flex items-center justify-center h-48 gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando peças da obra...
        </div>
      ) : conjuntosPagina.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-500">
          <AlertCircle className="h-8 w-8" />
          <p>{busca ? 'Nenhuma peça com esse filtro' : 'Nenhuma peça nessa obra'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conjuntosPagina.map(peca => {
            const peso = peca.peso_total || peca.pesoTotal || peca.peso || 0;
            const atribuidos = ETAPAS_LANCAMENTO.filter(e => lancamentos[chave(peca.id, e.key)]?.funcionario_id).length;
            const isExpanded = expandidos[peca.id] !== false; // default expanded

            return (
              <div key={peca.id} className="bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden">
                {/* Linha de cabeçalho da peça */}
                <button
                  onClick={() => toggleExpand(peca.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors text-left"
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${atribuidos === ETAPAS_LANCAMENTO.length ? 'bg-emerald-400' : atribuidos > 0 ? 'bg-amber-400' : 'bg-slate-600'}`} />
                  <span className="font-bold text-white text-sm">{peca.marca || peca.nome || peca.id}</span>
                  {peca._conjuntoTotal > 1 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 font-semibold flex-shrink-0">
                      Conj. {peca._conjuntoIdx}/{peca._conjuntoTotal}
                    </span>
                  )}
                  {peca.tipo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{peca.tipo}</span>}
                  <span className="text-xs text-slate-500 font-mono">{formatPesoLanc(peso)}</span>
                  <span className="text-xs text-slate-600 ml-auto mr-2">{atribuidos}/{ETAPAS_LANCAMENTO.length} etapas</span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />}
                </button>

                {/* Tabela de etapas — expande/recolhe */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden border-t border-slate-700/50"
                    >
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-900/60">
                            <th className="text-left px-4 py-2 text-slate-500 font-medium w-32">Etapa</th>
                            <th className="text-left px-3 py-2 text-slate-500 font-medium w-56">Funcionário</th>
                            <th className="text-left px-3 py-2 text-slate-500 font-medium w-36">Data</th>
                            <th className="text-left px-3 py-2 text-slate-500 font-medium">Observações</th>
                            <th className="text-center px-3 py-2 text-slate-500 font-medium w-14">Salvar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {ETAPAS_LANCAMENTO.map(etapa => {
                            const k = chave(peca.id, etapa.key);
                            const lan = lancamentos[k] || {};
                            const temFunc = !!lan.funcionario_id;
                            const isSavingRow = saving[k];
                            const EtapaIcon = etapa.icon;

                            return (
                              <tr key={etapa.key} className={`transition-colors hover:bg-slate-700/20 ${temFunc ? 'bg-emerald-500/3' : ''}`}>
                                <td className="px-4 py-2">
                                  <div className={`flex items-center gap-1.5 ${etapa.text}`}>
                                    <EtapaIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="font-medium">{etapa.label}</span>
                                    {temFunc && <Check className="h-3 w-3 text-emerald-400 ml-1" />}
                                  </div>
                                </td>
                                <td className="px-3 py-1.5">
                                  <div className="relative">
                                    <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                                    <select
                                      value={lan.funcionario_id || ''}
                                      onChange={e => handleChange(peca.id, etapa.key, 'funcionario_id', e.target.value)}
                                      className={`w-full pl-6 pr-2 py-1.5 text-xs bg-slate-800 border rounded-lg text-white focus:outline-none appearance-none transition-colors ${temFunc ? 'border-emerald-600/50 focus:border-emerald-500' : 'border-slate-700 focus:border-slate-500'}`}
                                    >
                                      <option value="">— Selecionar —</option>
                                      {funcionariosAtivos.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                    </select>
                                  </div>
                                </td>
                                <td className="px-3 py-1.5">
                                  <div className="relative">
                                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                                    <input
                                      type="date"
                                      value={lan.data_producao || hojeStr()}
                                      onChange={e => handleChange(peca.id, etapa.key, 'data_producao', e.target.value)}
                                      className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-slate-500"
                                    />
                                  </div>
                                </td>
                                <td className="px-3 py-1.5">
                                  <input
                                    type="text"
                                    placeholder={`Obs. ${etapa.label.toLowerCase()}...`}
                                    value={lan.observacoes || ''}
                                    onChange={e => handleChange(peca.id, etapa.key, 'observacoes', e.target.value)}
                                    className="w-full px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-slate-500"
                                  />
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  {isSavingRow ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-slate-400 mx-auto" />
                                  ) : (
                                    <button
                                      onClick={() => salvarUm(peca, etapa.key)}
                                      disabled={!temFunc}
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${temFunc ? 'bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-400 cursor-pointer' : 'bg-slate-700/20 border border-slate-600/20 text-slate-600 cursor-not-allowed'}`}
                                      title={temFunc ? `Salvar ${etapa.label}` : 'Selecione um funcionário primeiro'}
                                    >
                                      {temFunc ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação rodapé */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(0)} disabled={page === 0} className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-colors">«</button>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-colors">‹ Anterior</button>
          <span className="text-xs text-slate-400 px-3">Página {page + 1} de {totalPages} ({conjuntosFiltrados.length} conjuntos)</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-colors">Próxima ›</button>
          <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-30 hover:bg-slate-700 transition-colors">»</button>
        </div>
      )}
    </div>
  );
}

