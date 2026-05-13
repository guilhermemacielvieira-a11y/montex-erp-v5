/**
 * LancamentoProducaoModal.jsx
 * Modal de Lançamento de Produção por Funcionário
 *
 * Exibe TODAS as etapas simultaneamente para cada peça.
 * Cada etapa pode ter um funcionário diferente, editável de forma independente.
 *
 * Dados persistidos em:
 *   1. entity_store (entity_type='producao_lancamento') — forma editável
 *   2. producao_historico — para analytics de ProducaoFuncionarioPage
 *   3. pecas_producao.funcionario_X — campo direto na peça
 *
 * Props:
 *   pecas        : Array<peca>  — peças a editar (pode ser 1 ou N)
 *   defaultEtapa : string       — etapa que fica destacada ao abrir (opcional)
 *   isOpen       : boolean
 *   onClose      : () => void
 *   onSaved      : () => void   — callback após salvar
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  X, Save, CheckCircle2, User, Calendar,
  Scissors, Flame, Droplets, Paintbrush, Truck, Package,
  Loader2, RefreshCw, Search, AlertCircle, Check, ArrowRight,
  Copy, Layers
} from 'lucide-react';
import { supabase, supabaseAdmin } from '@/api/supabaseClient';
import { useEquipes } from '@/contexts/ERPContext';

// ─── Constantes ────────────────────────────────────────────────────────────────
// Fluxo do Kanban Produção: Fabricação → Solda → Pintura → Expedido → Enviado
// Corte é tratado no KanbanCortePage (peças entram aqui já como conjuntos).
// Montagem é uma etapa externa (em obra) e não faz parte deste lançamento.
const ETAPAS = [
  { key: 'fabricacao', label: 'Fabricação',  icon: Flame,        color: 'purple',  bg: 'from-purple-500/20 to-indigo-500/20',  border: 'border-purple-500/30', text: 'text-purple-400',  rowBg: 'hover:bg-purple-500/5'  },
  { key: 'solda',      label: 'Solda',       icon: Droplets,     color: 'red',     bg: 'from-red-500/20 to-rose-500/20',       border: 'border-red-500/30',    text: 'text-red-400',     rowBg: 'hover:bg-red-500/5'     },
  { key: 'pintura',    label: 'Pintura',     icon: Paintbrush,   color: 'cyan',    bg: 'from-cyan-500/20 to-blue-500/20',      border: 'border-cyan-500/30',   text: 'text-cyan-400',    rowBg: 'hover:bg-cyan-500/5'    },
  { key: 'expedido',   label: 'Expedido',    icon: Truck,        color: 'emerald', bg: 'from-emerald-500/20 to-green-500/20',  border: 'border-emerald-500/30',text: 'text-emerald-400', rowBg: 'hover:bg-emerald-500/5' },
  { key: 'enviado',    label: 'Enviado',     icon: CheckCircle2, color: 'green',   bg: 'from-green-500/20 to-lime-500/20',     border: 'border-green-500/30',  text: 'text-green-400',   rowBg: 'hover:bg-green-500/5'   },
];

// Mapeamento etapa → campo funcionario em pecas_producao
const ETAPA_CAMPO_FUNC = {
  fabricacao: 'funcionario_fabricacao',
  solda:      'funcionario_solda',
  pintura:    'funcionario_pintura',
  expedido:   'funcionario_expedido',
  // 'enviado' não tem coluna em pecas_producao — o histórico cobre essa etapa
};

// Mapeamento etapa → campo data em pecas_producao
const ETAPA_CAMPO_DATA = {
  fabricacao: 'data_inicio_fabricacao',
  solda:      'data_inicio_solda',
  pintura:    'data_inicio_pintura',
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatPeso(kg) {
  if (!kg) return '—';
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Number(kg).toFixed(1)} kg`;
}

function hoje() {
  return new Date().toISOString().split('T')[0];
}

function gerarId() {
  return 'LANC-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

/**
 * Expande peças com quantidade > 1 em entradas individuais por conjunto.
 * Cada conjunto recebe peso = pesoTotal / quantidade.
 * ID virtual: `${peca.id}__c${i}` para rastrear lançamentos independentes.
 */
function expandirPorQuantidade(lista) {
  const result = [];
  for (const peca of lista) {
    const qtd = Math.max(1, parseInt(peca.quantidade || peca.qtd || 1, 10) || 1);
    const pesoBase = parseFloat(peca.pesoTotal || peca.peso_total || peca.peso || 0);
    const pesoPorConj = qtd > 1 ? pesoBase / qtd : pesoBase;

    if (qtd <= 1) {
      result.push({ ...peca, _originalId: peca.id, _conjuntoIdx: 1, _conjuntoTotal: 1 });
    } else {
      for (let i = 1; i <= qtd; i++) {
        result.push({
          ...peca,
          id:            `${peca.id}__c${i}`,
          _originalId:   peca.id,
          _conjuntoIdx:  i,
          _conjuntoTotal: qtd,
          nome:          `${peca.nome || peca.marca || peca.id} — Conj. ${i}/${qtd}`,
          pesoTotal:     pesoPorConj,
          peso_total:    pesoPorConj,
          peso:          pesoPorConj,
          quantidade:    1,
        });
      }
    }
  }
  return result;
}

// ─── Componente principal ───────────────────────────────────────────────────────
export function LancamentoProducaoModal({ pecas = [], defaultEtapa = 'fabricacao', isOpen, onClose, onSaved }) {
  const { funcionarios: ctxFuncionarios } = useEquipes();

  const [lancamentos, setLancamentos] = useState({}); // { [peca_id__etapa]: { funcionario_id, funcionario_nome, data_producao, observacoes } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({});            // { [peca_id__etapa]: boolean }
  const [busca, setBusca] = useState('');
  const [carregado, setCarregado] = useState(false);
  const [highlightEtapa, setHighlightEtapa] = useState(defaultEtapa);

  // Funcionários ativos
  const funcionariosAtivos = useMemo(() => {
    return (ctxFuncionarios || [])
      .filter(f => f.status !== 'inativo')
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [ctxFuncionarios]);

  // Expandir peças com quantidade > 1 em conjuntos independentes
  const pecasExpandidas = useMemo(() => expandirPorQuantidade(pecas), [pecas]);

  // Chave composta peca_id + etapa
  const chave = (pecaId, etapa) => `${pecaId}__${etapa}`;

  // Peças filtradas por busca (sobre a lista já expandida)
  const pecasFiltradas = useMemo(() => {
    if (!busca) return pecasExpandidas;
    const q = busca.toLowerCase();
    return pecasExpandidas.filter(p =>
      (p.nome || '').toLowerCase().includes(q) ||
      (p.marca || '').toLowerCase().includes(q) ||
      (p.tipo || '').toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q)
    );
  }, [pecasExpandidas, busca]);

  // Carregar lançamentos existentes do entity_store
  const carregarLancamentos = useCallback(async () => {
    if (!pecasExpandidas.length) return;
    const client = supabaseAdmin || supabase;

    try {
      // Buscar por IDs virtuais (incluindo conjuntos expandidos) E IDs originais
      const ids = pecasExpandidas.map(p => p.id);
      const { data, error } = await client
        .from('entity_store')
        .select('id, data')
        .eq('entity_type', 'producao_lancamento')
        .in('data->>peca_id', ids);

      if (error) throw error;

      const mapa = {};
      (data || []).forEach(row => {
        const d = row.data || {};
        const k = chave(d.peca_id, d.etapa);
        mapa[k] = {
          _storeId:         row.id,
          funcionario_id:   d.funcionario_id   || '',
          funcionario_nome: d.funcionario_nome  || '',
          data_producao:    d.data_producao     || hoje(),
          observacoes:      d.observacoes       || '',
        };
      });
      setLancamentos(mapa);
    } catch (err) {
      console.error('[LancamentoModal] Erro ao carregar:', err);
    } finally {
      setCarregado(true);
    }
  }, [pecasExpandidas]);

  useEffect(() => {
    if (isOpen && !carregado) {
      carregarLancamentos();
    }
    if (!isOpen) {
      setCarregado(false);
      setLancamentos({});
    }
  }, [isOpen, carregado, carregarLancamentos]);

  useEffect(() => {
    if (isOpen) {
      setHighlightEtapa(defaultEtapa);
      setBusca('');
    }
  }, [isOpen, defaultEtapa]);

  // Atualizar campo de um lançamento
  const handleChange = (pecaId, etapa, campo, valor) => {
    const k = chave(pecaId, etapa);
    setLancamentos(prev => ({
      ...prev,
      [k]: {
        ...prev[k],
        funcionario_id:   campo === 'funcionario_id' ? valor : (prev[k]?.funcionario_id   || ''),
        funcionario_nome: campo === 'funcionario_id' ? (funcionariosAtivos.find(f => f.id === valor)?.nome || '') : (prev[k]?.funcionario_nome || ''),
        data_producao:    campo === 'data_producao'  ? valor : (prev[k]?.data_producao    || hoje()),
        observacoes:      campo === 'observacoes'    ? valor : (prev[k]?.observacoes       || ''),
      },
    }));
  };

  // Salvar um lançamento individual
  const salvarUm = useCallback(async (peca, etapa) => {
    const k = chave(peca.id, etapa);
    const lan = lancamentos[k];
    if (!lan?.funcionario_id) {
      toast.error('Selecione um funcionário');
      return;
    }

    // ID real no banco (sem sufixo __c1, __c2...)
    const originalId = peca._originalId || peca.id;
    // Label do conjunto (ex: "Conj. 2/3") para toast e histórico
    const conjLabel = peca._conjuntoTotal > 1 ? ` (Conj. ${peca._conjuntoIdx}/${peca._conjuntoTotal})` : '';

    setSaving(prev => ({ ...prev, [k]: true }));
    const client = supabaseAdmin || supabase;

    try {
      const dataLan = {
        peca_id:          peca.id,         // ID virtual — garante lançamentos independentes por conjunto
        peca_nome:        peca.nome || peca.marca || '',
        etapa,
        funcionario_id:   lan.funcionario_id,
        funcionario_nome: lan.funcionario_nome,
        data_producao:    lan.data_producao || hoje(),
        observacoes:      lan.observacoes || '',
        obra_id:          peca.obraId || peca.obra_id || '',
        obra_nome:        peca.obraNome || peca.obra_nome || '',
        conjunto_idx:     peca._conjuntoIdx || 1,
        conjunto_total:   peca._conjuntoTotal || 1,
        updated_at:       new Date().toISOString(),
      };

      // 1. Upsert em entity_store (por ID virtual — independente por conjunto)
      if (lan._storeId) {
        await client
          .from('entity_store')
          .update({ data: dataLan })
          .eq('id', lan._storeId);
      } else {
        const novoId = gerarId();
        const { error: insErr } = await client
          .from('entity_store')
          .insert({ id: novoId, entity_type: 'producao_lancamento', data: dataLan, created_date: new Date().toISOString() });
        if (insErr) throw insErr;
        setLancamentos(prev => ({
          ...prev,
          [k]: { ...prev[k], _storeId: novoId },
        }));
      }

      // 2. Upsert em producao_historico — ID inclui conjunto para não sobrescrever
      const histId = `HIST-${peca.id}-${etapa}`;
      const etapaParaMap = { fabricacao: 'solda', solda: 'pintura', pintura: 'expedido', expedido: 'enviado', enviado: 'concluido' };
      await client
        .from('producao_historico')
        .upsert({
          id:               histId,
          peca_id:          peca.id,
          etapa_de:         etapa,
          etapa_para:       etapaParaMap[etapa] || etapa,
          funcionario_id:   lan.funcionario_id,
          funcionario_nome: lan.funcionario_nome,
          data_inicio:      lan.data_producao ? new Date(lan.data_producao).toISOString() : new Date().toISOString(),
          observacoes:      lan.observacoes || '',
        }, { onConflict: 'id' });

      // 3. Atualizar pecas_producao usando o ID ORIGINAL (não virtual)
      //    para peças com múltiplos conjuntos, grava o último conjunto salvo
      const campoFunc = ETAPA_CAMPO_FUNC[etapa];
      const campoData = ETAPA_CAMPO_DATA[etapa];
      if (campoFunc) {
        const update = { [campoFunc]: lan.funcionario_id };
        if (campoData && lan.data_producao) {
          update[campoData] = new Date(lan.data_producao).toISOString();
        }
        await client
          .from('pecas_producao')
          .update(update)
          .eq('id', originalId);
      }

      // 4. Para corte: atualizar materiais_corte usando ID original
      if (etapa === 'corte') {
        await client
          .from('materiais_corte')
          .update({ funcionario_corte: lan.funcionario_id })
          .eq('peca_id', originalId);
      }

      const etapaInfo = ETAPAS.find(e => e.key === etapa);
      toast.success(`${etapaInfo?.label || etapa}${conjLabel}: ${lan.funcionario_nome} ✓`);
    } catch (err) {
      console.error('[LancamentoModal] Erro ao salvar:', err);
      toast.error('Erro ao salvar lançamento');
    } finally {
      setSaving(prev => ({ ...prev, [k]: false }));
    }
  }, [lancamentos, funcionariosAtivos]);

  // ─── SALVAR + AVANÇAR PEÇA PARA A PRÓXIMA ETAPA ──────────────────────────────
  // Salva o lançamento da etapa atual e move o conjunto para a próxima coluna
  // do Kanban (atualiza pecas_producao.etapa). Usa o ID ORIGINAL para garantir
  // que a peça inteira seja movida (mesmo quando expandida em conjuntos).
  const salvarEAvancar = useCallback(async (peca, etapa) => {
    const k = chave(peca.id, etapa);
    const lan = lancamentos[k];
    if (!lan?.funcionario_id) {
      toast.error('Selecione um funcionário antes de avançar');
      return;
    }

    // 1. Persiste o lançamento desta etapa
    await salvarUm(peca, etapa);

    // 2. Determina a próxima etapa do Kanban
    const ordemKanban = ['fabricacao', 'solda', 'pintura', 'expedido', 'enviado'];
    const idxAtual = ordemKanban.indexOf(etapa);
    const proxima = ordemKanban[idxAtual + 1];

    if (!proxima) {
      toast.success('Etapa final atingida — peça concluída ✓');
      onSaved?.();
      return;
    }

    // 3. Atualiza a etapa atual da peça no Supabase (move pra próxima coluna)
    const originalId = peca._originalId || peca.id;
    const client = supabaseAdmin || supabase;
    try {
      await client
        .from('pecas_producao')
        .update({ etapa: proxima, updated_at: new Date().toISOString() })
        .eq('id', originalId);
      const proxLabel = ETAPAS.find(e => e.key === proxima)?.label || proxima;
      toast.success(`Peça ${peca.marca || peca.id} → ${proxLabel}`);
    } catch (err) {
      console.error('[LancamentoModal] Erro ao avançar etapa:', err);
      toast.error('Erro ao avançar a peça de etapa');
      return;
    }

    onSaved?.();
  }, [lancamentos, salvarUm, onSaved]);

  // ─── EDIÇÃO POR QUANTIDADE — replicar valores entre conjuntos da mesma peça ──
  //
  // Para uma peça com qty > 1 (ex.: BC172A com 22 conjuntos), em vez de editar
  // cada um dos 22 conjuntos manualmente em cada etapa, o usuário define UMA vez
  // o funcionário/data/observações em um conjunto e propaga para:
  //   - N conjuntos (qtdAplicar) DA MESMA peça, naquela etapa.
  //
  // Implementação: encontra todos os conjuntos expandidos com mesmo _originalId
  // e aplica os mesmos campos do conjunto-fonte aos N primeiros que ainda não
  // têm funcionário (ou sobrescreve se reaplicarTodos=true).
  // ----------------------------------------------------------------------------
  const aplicarPorQuantidade = useCallback((pecaFonte, etapa, qtdAplicar, opts = {}) => {
    const fonte = lancamentos[chave(pecaFonte.id, etapa)];
    if (!fonte?.funcionario_id) {
      toast.error('Defina o funcionário neste conjunto antes de replicar');
      return 0;
    }
    const originalId = pecaFonte._originalId || pecaFonte.id;
    const total = pecaFonte._conjuntoTotal || 1;
    const limite = Math.max(1, Math.min(qtdAplicar || total, total));

    // Todos os conjuntos expandidos desta peça (ordenados por idx)
    const irmaos = pecasExpandidas
      .filter(p => (p._originalId || p.id) === originalId)
      .sort((a, b) => (a._conjuntoIdx || 1) - (b._conjuntoIdx || 1));

    // Mantém o conjunto-fonte e seleciona os próximos até completar limite
    const fonteIdx = pecaFonte._conjuntoIdx || 1;
    const candidatos = [
      pecaFonte,
      ...irmaos.filter(p => (p._conjuntoIdx || 1) !== fonteIdx),
    ];

    let aplicados = 0;
    const novosValores = {};
    for (const c of candidatos) {
      if (aplicados >= limite) break;
      const k = chave(c.id, etapa);
      const atual = lancamentos[k] || {};
      // Pula se já tem outro funcionário e opts.sobrescrever=false
      if (atual.funcionario_id && !opts.sobrescrever && (c._conjuntoIdx || 1) !== fonteIdx) {
        if (atual.funcionario_id === fonte.funcionario_id) {
          aplicados++; // conta como já replicado
          continue;
        }
        // Mantém valor existente, não conta
        continue;
      }
      novosValores[k] = {
        ...atual,
        funcionario_id:   fonte.funcionario_id,
        funcionario_nome: fonte.funcionario_nome,
        data_producao:    fonte.data_producao,
        observacoes:      fonte.observacoes || '',
      };
      aplicados++;
    }
    setLancamentos(prev => ({ ...prev, ...novosValores }));
    return aplicados;
  }, [lancamentos, pecasExpandidas]);

  // Quantidade a aplicar — estado por peça×etapa (default = total da peça)
  const [qtdAplicarPorChave, setQtdAplicarPorChave] = useState({});

  // Replicar + salvar em lote — atalho de 1 clique
  const replicarESalvar = useCallback(async (pecaFonte, etapa, qtd) => {
    const aplicados = aplicarPorQuantidade(pecaFonte, etapa, qtd, { sobrescrever: true });
    if (aplicados === 0) return;

    // Aguarda o setLancamentos refletir antes de salvar
    await new Promise(r => setTimeout(r, 50));

    const originalId = pecaFonte._originalId || pecaFonte.id;
    const irmaos = pecasExpandidas
      .filter(p => (p._originalId || p.id) === originalId)
      .sort((a, b) => (a._conjuntoIdx || 1) - (b._conjuntoIdx || 1));

    let salvos = 0;
    for (const c of irmaos.slice(0, qtd || irmaos.length)) {
      await salvarUm(c, etapa);
      salvos++;
    }
    toast.success(`${salvos} conjunto(s) atualizado(s) com ${lancamentos[chave(pecaFonte.id, etapa)]?.funcionario_nome || 'funcionário'}`);
  }, [aplicarPorQuantidade, pecasExpandidas, salvarUm, lancamentos]);

  // Salvar TODOS os lançamentos com funcionário atribuído (todas as etapas)
  const salvarTodos = useCallback(async () => {
    setLoading(true);
    let ok = 0;
    for (const peca of pecasFiltradas) {
      for (const etapa of ETAPAS) {
        const k = chave(peca.id, etapa.key);
        if (lancamentos[k]?.funcionario_id) {
          await salvarUm(peca, etapa.key);
          ok++;
        }
      }
    }
    if (ok === 0) {
      toast.error('Nenhum funcionário selecionado em nenhuma etapa');
    } else {
      toast.success(`${ok} lançamento(s) salvo(s) em todas as etapas`);
      onSaved?.();
    }
    setLoading(false);
  }, [pecasFiltradas, lancamentos, salvarUm, onSaved]);

  // Contagem de lançamentos com funcionário por etapa (sobre lista expandida)
  const contagemPorEtapa = useMemo(() => {
    const map = {};
    ETAPAS.forEach(e => {
      map[e.key] = pecasExpandidas.filter(p => lancamentos[chave(p.id, e.key)]?.funcionario_id).length;
    });
    return map;
  }, [pecasExpandidas, lancamentos]);

  const totalAtribuidos = useMemo(() =>
    Object.values(contagemPorEtapa).reduce((a, b) => a + b, 0),
  [contagemPorEtapa]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-800/80 to-slate-700/40 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800/80 border border-slate-600/50">
                <User className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Lançamento de Produção por Funcionário</h2>
                <p className="text-xs text-slate-400">
                  {pecas.length} peça(s) · Todas as etapas editáveis de forma independente
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Resumo de etapas + busca */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/40 border-b border-slate-700/50 overflow-x-auto">
            {/* Pills de resumo por etapa */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {ETAPAS.map(e => {
                const EIcon = e.icon;
                const cnt = contagemPorEtapa[e.key] || 0;
                const isHL = highlightEtapa === e.key;
                return (
                  <button
                    key={e.key}
                    onClick={() => setHighlightEtapa(isHL ? null : e.key)}
                    title={`${e.label}: ${cnt} funcionário(s) atribuído(s)`}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                      isHL
                        ? `bg-gradient-to-r ${e.bg} ${e.border} ${e.text}`
                        : cnt > 0
                          ? `bg-emerald-500/10 border-emerald-500/30 text-emerald-400`
                          : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <EIcon className="h-3 w-3" />
                    <span>{e.label}</span>
                    {cnt > 0 && (
                      <span className="px-1 rounded-full bg-slate-900/60 text-white">{cnt}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar peça..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 w-44"
                />
              </div>
              <span className="text-xs text-slate-500">{pecasFiltradas.length} peça(s)</span>
              <button
                onClick={() => { setCarregado(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
                title="Recarregar lançamentos do banco"
              >
                <RefreshCw className="h-3 w-3" />
                Atualizar
              </button>
            </div>
          </div>

          {/* Tabela — todas as etapas por peça */}
          <div className="flex-1 overflow-y-auto">
            {!carregado ? (
              <div className="flex items-center justify-center h-40 gap-2 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando lançamentos...
              </div>
            ) : pecasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-500">
                <AlertCircle className="h-8 w-8" />
                <p>Nenhuma peça encontrada</p>
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-900/95 border-b border-slate-700/50 z-10">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-slate-500 font-medium min-w-[160px]">Peça / Conjunto</th>
                    <th className="text-left px-3 py-2.5 text-slate-500 font-medium w-32">Etapa</th>
                    <th className="text-left px-3 py-2.5 text-slate-500 font-medium w-52">Funcionário</th>
                    <th className="text-left px-3 py-2.5 text-slate-500 font-medium w-36">Data</th>
                    <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Observações</th>
                    <th className="text-center px-3 py-2.5 text-slate-500 font-medium w-16">Salvar</th>
                    <th className="text-center px-3 py-2.5 text-slate-500 font-medium w-36" title="Replicar a configuração desta linha para N conjuntos da mesma peça">
                      <div className="inline-flex items-center gap-1">
                        <Layers className="h-3 w-3" /> Qtd
                      </div>
                    </th>
                    <th className="text-center px-3 py-2.5 text-slate-500 font-medium w-20">Avançar</th>
                  </tr>
                </thead>
                <tbody>
                  {pecasFiltradas.map((peca, pecaIdx) => {
                    const peso = peca.pesoTotal || peca.peso_total || peca.peso || 0;
                    // Quantas etapas desta peça têm funcionário
                    const atribuidos = ETAPAS.filter(e => lancamentos[chave(peca.id, e.key)]?.funcionario_id).length;

                    return ETAPAS.map((etapa, etapaIdx) => {
                      const k = chave(peca.id, etapa.key);
                      const lan = lancamentos[k] || {};
                      const temFunc = !!lan.funcionario_id;
                      const isSavingRow = saving[k];
                      const EtapaIcon = etapa.icon;
                      const isFirstEtapa = etapaIdx === 0;
                      const isLastEtapa = etapaIdx === ETAPAS.length - 1;
                      const isHL = highlightEtapa === etapa.key;

                      return (
                        <tr
                          key={`${peca.id}-${etapa.key}`}
                          className={[
                            'transition-colors',
                            etapa.rowBg,
                            isHL ? `bg-${etapa.color}-500/8` : '',
                            isFirstEtapa && pecaIdx > 0 ? 'border-t-2 border-slate-700' : '',
                            isLastEtapa ? 'border-b border-slate-800/60' : '',
                            temFunc ? 'bg-emerald-500/4' : '',
                          ].filter(Boolean).join(' ')}
                        >
                          {/* Peça info — só na primeira etapa, rowspan=6 */}
                          {isFirstEtapa && (
                            <td
                              rowSpan={ETAPAS.length}
                              className="px-4 py-3 align-top border-r border-slate-800/60"
                            >
                              <div className="flex flex-col gap-1 pt-0.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${atribuidos === ETAPAS.length ? 'bg-emerald-400' : atribuidos > 0 ? 'bg-amber-400' : 'bg-slate-600'}`} />
                                  <span className="font-bold text-white text-sm leading-tight">
                                    {peca.marca || (peca._originalId ? peca.nome : peca.nome) || peca.id}
                                  </span>
                                </div>
                                {/* Badge de conjunto quando quantidade > 1 */}
                                {peca._conjuntoTotal > 1 && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 self-start font-semibold">
                                    Conj. {peca._conjuntoIdx}/{peca._conjuntoTotal}
                                  </span>
                                )}
                                {peca.tipo && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 self-start">{peca.tipo}</span>
                                )}
                                <span className="text-[11px] text-slate-400 font-mono">{formatPeso(peso)}</span>
                                {peca.obraNome && (
                                  <span className="text-[10px] text-slate-500 truncate max-w-[140px]">{peca.obraNome}</span>
                                )}
                                <span className="text-[10px] text-slate-600 mt-1">
                                  {atribuidos}/{ETAPAS.length} etapas
                                </span>
                              </div>
                            </td>
                          )}

                          {/* Etapa */}
                          <td className={`px-3 py-2 ${isHL ? 'font-semibold' : ''}`}>
                            <div className={`flex items-center gap-1.5 ${etapa.text}`}>
                              <EtapaIcon className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="text-xs">{etapa.label}</span>
                              {temFunc && <Check className="h-3 w-3 text-emerald-400 ml-auto" />}
                            </div>
                          </td>

                          {/* Funcionário */}
                          <td className="px-3 py-2">
                            <div className="relative">
                              <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                              <select
                                value={lan.funcionario_id || ''}
                                onChange={e => handleChange(peca.id, etapa.key, 'funcionario_id', e.target.value)}
                                className={`w-full pl-6 pr-2 py-1.5 text-xs bg-slate-800 border rounded-lg text-white focus:outline-none appearance-none transition-colors ${
                                  temFunc
                                    ? 'border-emerald-600/50 focus:border-emerald-500'
                                    : 'border-slate-700 focus:border-slate-500'
                                }`}
                              >
                                <option value="">— Selecionar —</option>
                                {funcionariosAtivos.map(f => (
                                  <option key={f.id} value={f.id}>{f.nome}</option>
                                ))}
                              </select>
                            </div>
                          </td>

                          {/* Data */}
                          <td className="px-3 py-2">
                            <div className="relative">
                              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                              <input
                                type="date"
                                value={lan.data_producao || hoje()}
                                onChange={e => handleChange(peca.id, etapa.key, 'data_producao', e.target.value)}
                                className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-slate-500"
                              />
                            </div>
                          </td>

                          {/* Observações */}
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              placeholder={`Obs. ${etapa.label.toLowerCase()}...`}
                              value={lan.observacoes || ''}
                              onChange={e => handleChange(peca.id, etapa.key, 'observacoes', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-slate-500"
                            />
                          </td>

                          {/* Salvar */}
                          <td className="px-3 py-2 text-center">
                            {isSavingRow ? (
                              <Loader2 className="h-4 w-4 animate-spin text-slate-400 mx-auto" />
                            ) : (
                              <button
                                onClick={() => salvarUm(peca, etapa.key)}
                                disabled={!temFunc}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-colors ${
                                  temFunc
                                    ? 'bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-400 cursor-pointer'
                                    : 'bg-slate-700/20 border border-slate-600/20 text-slate-600 cursor-not-allowed'
                                }`}
                                title={temFunc ? `Salvar ${etapa.label}` : 'Selecione um funcionário primeiro'}
                              >
                                {temFunc ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </td>

                          {/* Replicar p/ N conjuntos da mesma peça (só faz
                              sentido em peças com qty > 1) */}
                          <td className="px-2 py-2 text-center">
                            {(peca._conjuntoTotal || 1) > 1 ? (
                              <ReplicarPorQtdCell
                                peca={peca}
                                etapa={etapa.key}
                                temFunc={temFunc}
                                isSaving={isSavingRow}
                                valorAtual={qtdAplicarPorChave[k]}
                                onChange={(v) => setQtdAplicarPorChave(prev => ({ ...prev, [k]: v }))}
                                onAplicar={(qtd) => aplicarPorQuantidade(peca, etapa.key, qtd, { sobrescrever: true })}
                                onAplicarESalvar={(qtd) => replicarESalvar(peca, etapa.key, qtd)}
                              />
                            ) : (
                              <span className="text-[10px] text-slate-700">—</span>
                            )}
                          </td>

                          {/* Avançar para próxima etapa do Kanban */}
                          {(() => {
                            const ordemKanban = ['fabricacao', 'solda', 'pintura', 'expedido', 'enviado'];
                            const idxAtual = ordemKanban.indexOf(etapa.key);
                            const proxKey = ordemKanban[idxAtual + 1];
                            const proxLabel = ETAPAS.find(e => e.key === proxKey)?.label;
                            return (
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={() => salvarEAvancar(peca, etapa.key)}
                                  disabled={!temFunc || isSavingRow}
                                  className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                                    temFunc && !isSavingRow
                                      ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/40 text-purple-200 hover:from-purple-600/50 hover:to-indigo-600/50 cursor-pointer'
                                      : 'bg-slate-800/40 border border-slate-700/40 text-slate-600 cursor-not-allowed'
                                  }`}
                                  title={
                                    !temFunc ? 'Selecione um funcionário primeiro'
                                    : !proxKey ? 'Última etapa — peça concluída'
                                    : `Salvar e avançar para ${proxLabel}`
                                  }
                                >
                                  <ArrowRight className="h-3 w-3" />
                                  {proxKey ? proxLabel : 'Final'}
                                </button>
                              </td>
                            );
                          })()}
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-t border-slate-700/50">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>
                {totalAtribuidos} lançamento(s) com funcionário atribuído
                {totalAtribuidos > 0 && (
                  <span className="ml-1 text-slate-600">
                    ({ETAPAS.filter(e => contagemPorEtapa[e.key] > 0).map(e => e.label).join(', ')})
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={salvarTodos}
                disabled={loading || totalAtribuidos === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  loading || totalAtribuidos === 0
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600/80 to-teal-600/80 border border-emerald-500/40 text-emerald-300 hover:opacity-90'
                }`}
              >
                {loading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="h-3.5 w-3.5" /> Salvar Todos ({totalAtribuidos})</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * Célula compacta para replicar lançamento da linha atual para N conjuntos.
 *
 * Comportamento:
 *   - Input numérico (1..total) → quantidade de conjuntos a aplicar.
 *   - Botão "Aplicar" (azul) → só copia os valores para as linhas-alvo
 *     (não salva — o usuário pode revisar e usar "Salvar Todos").
 *   - Botão "▶︎" (roxo) → aplica + salva imediatamente os N lançamentos.
 *
 * Aparece somente em peças com mais de 1 conjunto (qty>1).
 */
function ReplicarPorQtdCell({ peca, etapa, temFunc, isSaving, valorAtual, onChange, onAplicar, onAplicarESalvar }) {
  const total = peca._conjuntoTotal || 1;
  const qtd = valorAtual ?? total;

  return (
    <div className="flex items-center justify-center gap-1">
      <input
        type="number"
        min={1}
        max={total}
        value={qtd}
        onChange={(e) => {
          const v = Math.max(1, Math.min(parseInt(e.target.value || '1', 10) || 1, total));
          onChange(v);
        }}
        disabled={!temFunc || isSaving}
        title={`Aplicar a ${qtd} de ${total} conjuntos desta peça`}
        className={`w-12 px-1 py-1 text-center text-xs bg-slate-800 border rounded-md text-white focus:outline-none ${
          temFunc ? 'border-slate-700 focus:border-purple-500' : 'border-slate-700/40 opacity-50'
        }`}
      />
      <span className="text-[9px] text-slate-500">/{total}</span>

      <button
        onClick={() => onAplicar(qtd)}
        disabled={!temFunc || isSaving}
        title={`Copiar funcionário/data/obs para ${qtd} conjunto(s) — sem salvar`}
        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
          temFunc && !isSaving
            ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30'
            : 'bg-slate-800/40 border border-slate-700/40 text-slate-600 cursor-not-allowed'
        }`}
      >
        <Copy className="h-3 w-3" />
      </button>

      <button
        onClick={() => onAplicarESalvar(qtd)}
        disabled={!temFunc || isSaving}
        title={`Aplicar e salvar imediatamente em ${qtd} conjunto(s)`}
        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
          temFunc && !isSaving
            ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30'
            : 'bg-slate-800/40 border border-slate-700/40 text-slate-600 cursor-not-allowed'
        }`}
      >
        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
      </button>
    </div>
  );
}

export default LancamentoProducaoModal;
