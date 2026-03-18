/**
 * LancamentoProducaoModal.jsx
 * Modal de Lançamento de Produção/Corte por Funcionário
 *
 * Permite vincular funcionário + data a cada peça × etapa.
 * Dados persistidos em:
 *   1. entity_store (entity_type='producao_lancamento') — forma editável
 *   2. producao_historico — para analytics de ProducaoFuncionarioPage
 *   3. pecas_producao.funcionario_X — campo direto na peça
 *
 * Props:
 *   pecas        : Array<peca>  — peças a editar (pode ser 1 ou N)
 *   defaultEtapa : string       — aba aberta ao abrir (opcional)
 *   isOpen       : boolean
 *   onClose      : () => void
 *   onSaved      : () => void   — callback após salvar
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  X, Save, CheckCircle2, Clock, User, Calendar, FileText,
  Scissors, Flame, Droplets, Paintbrush, Truck, Package,
  ChevronDown, Loader2, RefreshCw, Search, AlertCircle,
  Check, Edit3
} from 'lucide-react';
import { supabase, supabaseAdmin } from '@/api/supabaseClient';
import { useEquipes } from '@/contexts/ERPContext';

// ─── Constantes ────────────────────────────────────────────────────────────────
const ETAPAS = [
  { key: 'corte',      label: 'Corte',       icon: Scissors,  color: 'amber',   bg: 'from-amber-500/20 to-orange-500/20',   border: 'border-amber-500/30',  text: 'text-amber-400' },
  { key: 'fabricacao', label: 'Fabricação',  icon: Flame,     color: 'purple',  bg: 'from-purple-500/20 to-indigo-500/20',  border: 'border-purple-500/30', text: 'text-purple-400' },
  { key: 'solda',      label: 'Solda',       icon: Droplets,  color: 'red',     bg: 'from-red-500/20 to-rose-500/20',       border: 'border-red-500/30',    text: 'text-red-400' },
  { key: 'pintura',    label: 'Pintura',     icon: Paintbrush,color: 'cyan',    bg: 'from-cyan-500/20 to-blue-500/20',      border: 'border-cyan-500/30',   text: 'text-cyan-400' },
  { key: 'montagem',   label: 'Montagem',    icon: Package,   color: 'teal',    bg: 'from-teal-500/20 to-emerald-500/20',   border: 'border-teal-500/30',   text: 'text-teal-400' },
  { key: 'expedido',   label: 'Expedição',   icon: Truck,     color: 'emerald', bg: 'from-emerald-500/20 to-green-500/20',  border: 'border-emerald-500/30',text: 'text-emerald-400' },
];

// Mapeamento etapa → campo funcionario em pecas_producao
const ETAPA_CAMPO_FUNC = {
  fabricacao: 'funcionario_fabricacao',
  solda:      'funcionario_solda',
  pintura:    'funcionario_pintura',
  expedido:   'funcionario_expedido',
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
  return `${kg.toFixed(1)} kg`;
}

function hoje() {
  return new Date().toISOString().split('T')[0];
}

function gerarId() {
  return 'LANC-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

// ─── Componente principal ───────────────────────────────────────────────────────
export function LancamentoProducaoModal({ pecas = [], defaultEtapa = 'fabricacao', isOpen, onClose, onSaved }) {
  const { funcionarios: ctxFuncionarios } = useEquipes();

  const [activeEtapa, setActiveEtapa] = useState(defaultEtapa);
  const [lancamentos, setLancamentos] = useState({}); // { [peca_id+etapa]: { funcionario_id, funcionario_nome, data_producao, observacoes } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({}); // { [peca_id+etapa]: boolean }
  const [busca, setBusca] = useState('');
  const [carregado, setCarregado] = useState(false);

  // Funcionários ativos
  const funcionariosAtivos = useMemo(() => {
    return (ctxFuncionarios || [])
      .filter(f => f.status !== 'inativo')
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  }, [ctxFuncionarios]);

  // Chave composta peca_id + etapa
  const chave = (pecaId, etapa) => `${pecaId}__${etapa}`;

  // Peças filtradas por busca
  const pecasFiltradas = useMemo(() => {
    if (!busca) return pecas;
    const q = busca.toLowerCase();
    return pecas.filter(p =>
      (p.nome || '').toLowerCase().includes(q) ||
      (p.marca || '').toLowerCase().includes(q) ||
      (p.tipo || '').toLowerCase().includes(q) ||
      (p.id || '').toLowerCase().includes(q)
    );
  }, [pecas, busca]);

  // Carregar lançamentos existentes do entity_store
  const carregarLancamentos = useCallback(async () => {
    if (!pecas.length) return;
    const client = supabaseAdmin || supabase;

    try {
      const ids = pecas.map(p => p.id);
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
          _storeId: row.id,
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
  }, [pecas]);

  useEffect(() => {
    if (isOpen && !carregado) {
      carregarLancamentos();
    }
    if (!isOpen) {
      setCarregado(false);
    }
  }, [isOpen, carregado, carregarLancamentos]);

  useEffect(() => {
    if (isOpen) {
      setActiveEtapa(defaultEtapa);
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

    setSaving(prev => ({ ...prev, [k]: true }));
    const client = supabaseAdmin || supabase;

    try {
      const dataLan = {
        peca_id:          peca.id,
        peca_nome:        peca.nome || peca.marca || '',
        etapa,
        funcionario_id:   lan.funcionario_id,
        funcionario_nome: lan.funcionario_nome,
        data_producao:    lan.data_producao || hoje(),
        observacoes:      lan.observacoes || '',
        obra_id:          peca.obraId || peca.obra_id || '',
        obra_nome:        peca.obraNome || peca.obra_nome || '',
        updated_at:       new Date().toISOString(),
      };

      // 1. Upsert em entity_store
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

      // 2. Upsert em producao_historico (para analytics por funcionário)
      const histId = `HIST-${peca.id}-${etapa}`;
      const etapaParaMap = { corte: 'fabricacao', fabricacao: 'solda', solda: 'pintura', pintura: 'expedido', montagem: 'entregue', expedido: 'entregue' };
      await client
        .from('producao_historico')
        .upsert({
          id:              histId,
          peca_id:         peca.id,
          etapa_de:        etapa === 'corte' ? 'aguardando' : etapa,
          etapa_para:      etapaParaMap[etapa] || etapa,
          funcionario_id:  lan.funcionario_id,
          funcionario_nome:lan.funcionario_nome,
          data_inicio:     lan.data_producao ? new Date(lan.data_producao).toISOString() : new Date().toISOString(),
          observacoes:     lan.observacoes || '',
        }, { onConflict: 'id' });

      // 3. Atualizar pecas_producao.funcionario_X (se etapa mapeada)
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
          .eq('id', peca.id);
      }

      // 4. Para corte: atualizar materiais_corte se existir
      if (etapa === 'corte') {
        await client
          .from('materiais_corte')
          .update({ funcionario_corte: lan.funcionario_id })
          .eq('peca_id', peca.id);
      }

      toast.success(`Lançamento salvo: ${lan.funcionario_nome}`);
    } catch (err) {
      console.error('[LancamentoModal] Erro ao salvar:', err);
      toast.error('Erro ao salvar lançamento');
    } finally {
      setSaving(prev => ({ ...prev, [k]: false }));
    }
  }, [lancamentos, funcionariosAtivos]);

  // Salvar todos os lançamentos da aba ativa que tenham funcionário
  const salvarTodos = useCallback(async () => {
    setLoading(true);
    const pecasComFunc = pecasFiltradas.filter(p => {
      const k = chave(p.id, activeEtapa);
      return lancamentos[k]?.funcionario_id;
    });

    if (pecasComFunc.length === 0) {
      toast.error('Nenhuma peça com funcionário selecionado nesta aba');
      setLoading(false);
      return;
    }

    let ok = 0;
    for (const peca of pecasComFunc) {
      await salvarUm(peca, activeEtapa);
      ok++;
    }
    toast.success(`${ok} lançamento(s) salvo(s)`);
    setLoading(false);
    onSaved?.();
  }, [pecasFiltradas, activeEtapa, lancamentos, salvarUm, onSaved]);

  // Contagem de lançamentos com funcionário por etapa
  const contagemPorEtapa = useMemo(() => {
    const map = {};
    ETAPAS.forEach(e => {
      map[e.key] = pecas.filter(p => lancamentos[chave(p.id, e.key)]?.funcionario_id).length;
    });
    return map;
  }, [pecas, lancamentos]);

  if (!isOpen) return null;

  const etapaAtiva = ETAPAS.find(e => e.key === activeEtapa) || ETAPAS[0];
  const IconeAtivo = etapaAtiva.icon;

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
          <div className={`flex items-center justify-between px-6 py-4 bg-gradient-to-r ${etapaAtiva.bg} border-b border-slate-700/50`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800/60 border ${etapaAtiva.border}`}>
                <IconeAtivo className={`h-5 w-5 ${etapaAtiva.text}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Lançamento de Produção por Funcionário</h2>
                <p className="text-xs text-slate-400">
                  {pecas.length} peça(s) · Vinculação de responsável + data por etapa
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

          {/* Tabs de etapa */}
          <div className="flex items-center gap-1 px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 overflow-x-auto">
            {ETAPAS.map(e => {
              const EIcon = e.icon;
              const cnt = contagemPorEtapa[e.key] || 0;
              const isActive = activeEtapa === e.key;
              return (
                <button
                  key={e.key}
                  onClick={() => setActiveEtapa(e.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? `bg-gradient-to-r ${e.bg} border ${e.border} ${e.text}`
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <EIcon className="h-3.5 w-3.5" />
                  {e.label}
                  {cnt > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-slate-800/60 text-white' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {cnt}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Barra de busca + info */}
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-800/30 border-b border-slate-700/30">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar peça..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
              />
            </div>
            <span className="text-xs text-slate-500">
              {pecasFiltradas.length} peça(s)
            </span>
            <button
              onClick={carregarLancamentos}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Atualizar
            </button>
          </div>

          {/* Tabela de lançamentos */}
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
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-900/95 border-b border-slate-700/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Peça / Conjunto</th>
                    <th className="text-left px-3 py-2.5 text-slate-500 font-medium w-40">Tipo</th>
                    <th className="text-right px-3 py-2.5 text-slate-500 font-medium w-24">Peso</th>
                    <th className="text-left px-3 py-2.5 text-slate-500 font-medium w-52">Funcionário</th>
                    <th className="text-left px-3 py-2.5 text-slate-500 font-medium w-36">Data Produção</th>
                    <th className="text-left px-3 py-2.5 text-slate-500 font-medium w-48">Observações</th>
                    <th className="text-center px-3 py-2.5 text-slate-500 font-medium w-20">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {pecasFiltradas.map(peca => {
                    const k = chave(peca.id, activeEtapa);
                    const lan = lancamentos[k] || {};
                    const temFunc = !!lan.funcionario_id;
                    const isSaving = saving[k];
                    const peso = peca.pesoTotal || peca.peso_total || peca.peso || 0;

                    return (
                      <tr
                        key={`${peca.id}-${activeEtapa}`}
                        className={`hover:bg-slate-800/30 transition-colors ${temFunc ? 'bg-emerald-500/5' : ''}`}
                      >
                        {/* Peça info */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${temFunc ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            <div>
                              <p className="font-semibold text-white leading-tight">
                                {peca.marca || peca.nome || peca.id}
                              </p>
                              {peca.obraNome && (
                                <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[160px]">{peca.obraNome}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Tipo */}
                        <td className="px-3 py-2.5">
                          <span className="text-slate-400 truncate block max-w-[140px]">{peca.tipo || '—'}</span>
                        </td>

                        {/* Peso */}
                        <td className="px-3 py-2.5 text-right">
                          <span className="text-slate-300 font-mono">{formatPeso(peso)}</span>
                        </td>

                        {/* Funcionário */}
                        <td className="px-3 py-2.5">
                          <div className="relative">
                            <User className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                            <select
                              value={lan.funcionario_id || ''}
                              onChange={e => handleChange(peca.id, activeEtapa, 'funcionario_id', e.target.value)}
                              className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-slate-500 appearance-none"
                            >
                              <option value="">— Selecionar —</option>
                              {funcionariosAtivos.map(f => (
                                <option key={f.id} value={f.id}>{f.nome}</option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* Data */}
                        <td className="px-3 py-2.5">
                          <div className="relative">
                            <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500 pointer-events-none" />
                            <input
                              type="date"
                              value={lan.data_producao || hoje()}
                              onChange={e => handleChange(peca.id, activeEtapa, 'data_producao', e.target.value)}
                              className="w-full pl-6 pr-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-slate-500"
                            />
                          </div>
                        </td>

                        {/* Observações */}
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            placeholder="Observação..."
                            value={lan.observacoes || ''}
                            onChange={e => handleChange(peca.id, activeEtapa, 'observacoes', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-slate-500"
                          />
                        </td>

                        {/* Botão salvar */}
                        <td className="px-3 py-2.5 text-center">
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin text-slate-400 mx-auto" />
                          ) : temFunc ? (
                            <button
                              onClick={() => salvarUm(peca, activeEtapa)}
                              className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto transition-colors"
                              title="Salvar lançamento"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => salvarUm(peca, activeEtapa)}
                              className="w-8 h-8 rounded-lg bg-slate-700/50 border border-slate-600/50 hover:bg-slate-700 text-slate-500 hover:text-white flex items-center justify-center mx-auto transition-colors"
                              title="Salvar lançamento"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
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
                {Object.values(contagemPorEtapa).reduce((a, b) => a + b, 0)} lançamento(s) com funcionário atribuído
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
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  loading
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : `bg-gradient-to-r ${etapaAtiva.bg} border ${etapaAtiva.border} ${etapaAtiva.text} hover:opacity-90`
                }`}
              >
                {loading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="h-3.5 w-3.5" /> Salvar Todos da Aba</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default LancamentoProducaoModal;
