// MONTEX ERP Premium - Diário de Produção com Supabase
// Registro diário de produção por etapa com persistência real em banco de dados

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader,
  AlertCircle,
  CheckCircle2,
  Users,
  Package,
  ArrowRight,
  RefreshCw,
  Search
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase, isSupabaseConfigured } from '@/api/supabaseClient';
import { useEquipes } from '@/contexts/ERPContext';
import {
  ETAPAS_LABELS,
  ETAPAS_CORES,
  VALORES_ETAPA,
  formatKg,
  formatReais,
  calcularValorPorEtapa,
  calcularEficiencia,
  getEficienciaBadge
} from '@/utils/producaoCalculations';

const TURNOS = ['Manhã', 'Tarde', 'Noite'];
const ETAPAS = ['corte', 'fabricacao', 'solda', 'pintura'];

// Etapas reconhecidas em producao_historico (do LancamentoProducaoModal / Kanban)
const ETAPA_HIST_LABEL = {
  corte: '✂️ Corte',
  fabricacao: '🔧 Fabricação',
  solda: '⚡ Solda',
  pintura: '🎨 Pintura',
  montagem: '📦 Montagem',
  expedicao: '🚚 Expedição',
  expedido: '🚚 Expedição',
  aguardando: '⏳ Aguardando',
};

const ETAPA_HIST_COR = {
  corte: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  fabricacao: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  solda: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  pintura: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  montagem: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  expedicao: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  expedido: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  aguardando: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const fmtHora = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
};

// ============================================================================
// LANÇAMENTOS POR FUNCIONÁRIO  (vem de producao_historico)
// Reflete tudo que foi lançado pelo LancamentoProducaoModal / Kanban.
// ============================================================================
function LancamentosPorFuncionario({ data }) {
  const [historico, setHistorico] = useState([]);
  const [pecasMap, setPecasMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [funcionarioExpandido, setFuncionarioExpandido] = useState(null);

  const carregar = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setLoading(true);
    try {
      // Janela do dia selecionado (00:00 → 23:59:59 UTC-aware na col. data_inicio)
      const inicio = `${data}T00:00:00`;
      const fim = `${data}T23:59:59`;

      // 1. Histórico do dia
      const { data: hist, error } = await supabase
        .from('producao_historico')
        .select('*')
        .gte('data_inicio', inicio)
        .lte('data_inicio', fim)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistorico(hist || []);

      // 2. Buscar info das peças envolvidas (peso, conjunto, obra)
      const pecaIds = Array.from(new Set((hist || []).map(h => h.peca_id).filter(Boolean)));
      if (pecaIds.length > 0) {
        const { data: pecas } = await supabase
          .from('pecas_producao')
          .select('id,marca,tipo,peso_total,quantidade,obra_nome,obra_id')
          .in('id', pecaIds);
        const map = {};
        (pecas || []).forEach(p => { map[p.id] = p; });
        setPecasMap(map);
      } else {
        setPecasMap({});
      }
    } catch (err) {
      console.error('[Diario] Erro ao carregar producao_historico:', err);
      toast.error('Erro ao carregar lançamentos');
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => { carregar(); }, [carregar]);

  // Agrupa por funcionário
  const grupos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const acc = {};
    historico.forEach(h => {
      if (termo) {
        const alvo = `${h.funcionario_nome || ''} ${h.peca_id || ''}`.toLowerCase();
        if (!alvo.includes(termo)) return;
      }
      const key = h.funcionario_id || h.funcionario_nome || 'sem-funcionario';
      if (!acc[key]) {
        acc[key] = {
          funcionarioId: h.funcionario_id,
          funcionarioNome: h.funcionario_nome || '— sem funcionário —',
          lancamentos: [],
          pesoKg: 0,
          etapas: new Set(),
          pecas: new Set(),
        };
      }
      acc[key].lancamentos.push(h);
      const peca = pecasMap[h.peca_id];
      if (peca?.peso_total) acc[key].pesoKg += Number(peca.peso_total) || 0;
      if (h.etapa_para) acc[key].etapas.add(h.etapa_para);
      if (h.peca_id) acc[key].pecas.add(h.peca_id);
    });
    // Ordena por nº de lançamentos desc
    return Object.values(acc).sort((a, b) => b.lancamentos.length - a.lancamentos.length);
  }, [historico, pecasMap, busca]);

  const totalPeso = grupos.reduce((s, g) => s + g.pesoKg, 0);
  const totalLanc = grupos.reduce((s, g) => s + g.lancamentos.length, 0);

  return (
    <Card className="bg-slate-900/60 border-slate-700/50">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Lançamentos por Funcionário</h2>
              <p className="text-xs text-slate-400">
                Reflete os lançamentos feitos no Kanban / Modal de Produção em <strong>{new Date(data + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Buscar funcionário ou peça..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8 h-8 bg-slate-800 border-slate-700 text-white text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-slate-700 text-slate-300"
              onClick={carregar}
              disabled={loading}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400">Funcionários ativos</p>
            <p className="text-xl font-bold text-white">{grupos.length}</p>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400">Lançamentos</p>
            <p className="text-xl font-bold text-purple-300">{totalLanc}</p>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400">Peso processado</p>
            <p className="text-xl font-bold text-emerald-300">{formatKg(totalPeso)}</p>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-10">
            <Loader className="h-6 w-6 text-slate-500 mx-auto animate-spin" />
            <p className="text-slate-400 mt-3 text-sm">Carregando lançamentos…</p>
          </div>
        ) : grupos.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum lançamento registrado nesta data.</p>
            <p className="text-xs mt-1">Atribua um funcionário a uma etapa no Kanban para gerar lançamentos.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {grupos.map((g) => {
              const aberto = funcionarioExpandido === (g.funcionarioId || g.funcionarioNome);
              return (
                <div key={g.funcionarioId || g.funcionarioNome}
                  className="bg-slate-800/40 border border-slate-700/40 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setFuncionarioExpandido(aberto ? null : (g.funcionarioId || g.funcionarioNome))}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-800/70 transition"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500/40 to-blue-500/40 flex items-center justify-center text-white font-semibold text-sm">
                      {(g.funcionarioNome || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-medium text-sm">{g.funcionarioNome}</p>
                      <p className="text-xs text-slate-400">
                        {g.lancamentos.length} lançamento(s) • {g.pecas.size} peça(s) • {Array.from(g.etapas).join(', ') || '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-300 font-medium text-sm">{formatKg(g.pesoKg)}</p>
                      <p className="text-[10px] text-slate-500">peso processado</p>
                    </div>
                    <ChevronRight className={cn('h-4 w-4 text-slate-500 transition-transform', aberto && 'rotate-90')} />
                  </button>

                  <AnimatePresence initial={false}>
                    {aberto && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 pt-1 border-t border-slate-700/40">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-slate-500">
                                <th className="text-left py-1 font-medium">Peça</th>
                                <th className="text-left py-1 font-medium">Conjunto</th>
                                <th className="text-left py-1 font-medium">Etapa</th>
                                <th className="text-right py-1 font-medium">Peso</th>
                                <th className="text-right py-1 font-medium">Hora</th>
                                <th className="text-left py-1 font-medium pl-3">Obs.</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {g.lancamentos.map((l) => {
                                const peca = pecasMap[l.peca_id] || {};
                                return (
                                  <tr key={l.id} className="text-slate-300">
                                    <td className="py-1.5 font-mono text-[11px]">{l.peca_id}</td>
                                    <td className="py-1.5">
                                      <div>
                                        <div className="text-white">{peca.marca || '—'}</div>
                                        {peca.tipo && <div className="text-[10px] text-slate-500">{peca.tipo}</div>}
                                      </div>
                                    </td>
                                    <td className="py-1.5">
                                      <div className="flex items-center gap-1">
                                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] border', ETAPA_HIST_COR[l.etapa_de] || 'bg-slate-700 text-slate-400 border-slate-600')}>
                                          {ETAPA_HIST_LABEL[l.etapa_de] || l.etapa_de}
                                        </span>
                                        <ArrowRight className="h-3 w-3 text-slate-600" />
                                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] border', ETAPA_HIST_COR[l.etapa_para] || 'bg-slate-700 text-slate-400 border-slate-600')}>
                                          {ETAPA_HIST_LABEL[l.etapa_para] || l.etapa_para}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-1.5 text-right text-emerald-300 font-mono">
                                      {peca.peso_total ? formatKg(peca.peso_total) : '—'}
                                    </td>
                                    <td className="py-1.5 text-right text-slate-400 font-mono">
                                      {fmtHora(l.created_at)}
                                    </td>
                                    <td className="py-1.5 pl-3 text-slate-500 max-w-xs truncate">
                                      {l.observacoes || '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente de Card do Registro
function DiarioRegistroCard({ registro, onEdit, onDelete, etapa }) {
  const [expanded, setExpanded] = useState(false);

  const eficiencia = useMemo(() => {
    if (registro.meta_unidades && registro.meta_unidades > 0) {
      return calcularEficiencia(registro.unidades_produzidas, registro.meta_unidades);
    }
    return 0;
  }, [registro]);

  const valor = useMemo(() => {
    return calcularValorPorEtapa(registro.kg_processados, etapa);
  }, [registro.kg_processados, etapa]);

  const cores = ETAPAS_CORES[etapa];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-slate-900/60 backdrop-blur-xl rounded-xl border overflow-hidden",
        "border-slate-700/50 hover:border-slate-600/80 transition-colors"
      )}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
              cores.bg
            )}>
              <CheckCircle2 className={cn("h-6 w-6", cores.text)} />
            </div>
            <div>
              <h3 className="font-semibold text-white">{registro.funcionario_nome}</h3>
              <p className="text-sm text-slate-400">{registro.equipe_nome}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Turno */}
            <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
              {registro.turno}
            </Badge>

            {/* Eficiência */}
            {registro.meta_unidades && (
              <Badge className={cn("text-xs", getEficienciaBadge(eficiencia))}>
                {eficiencia}% efic.
              </Badge>
            )}

            {/* Unidades */}
            <div className="text-right">
              <p className="text-lg font-bold text-white">{registro.unidades_produzidas}</p>
              <p className="text-xs text-slate-500">un.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Expandido */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-700/50"
          >
            <div className="p-4 space-y-4">
              {/* Métricas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Unidades</p>
                  <p className="text-lg font-bold text-white">{registro.unidades_produzidas}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">KG</p>
                  <p className="text-lg font-bold text-white">{formatKg(registro.kg_processados)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Valor</p>
                  <p className="text-lg font-bold text-green-400">{formatReais(valor)}</p>
                </div>
                {registro.meta_unidades && (
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Meta Un.</p>
                    <p className="text-lg font-bold text-white">{registro.meta_unidades}</p>
                  </div>
                )}
              </div>

              {/* Observações */}
              {registro.observacoes && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">Observações</h4>
                  <p className="text-sm text-slate-400 bg-slate-800/50 rounded-lg p-3">
                    {registro.observacoes}
                  </p>
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-700 text-slate-300"
                  onClick={() => onEdit(registro)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-700 text-red-400 hover:bg-red-500/10"
                  onClick={() => onDelete(registro.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Dialog de Novo/Editar Registro
function DiarioFormDialog({ open, onOpenChange, etapa, data, funcionarios, equipes, onSave, editingRegistro }) {
  const [formData, setFormData] = useState({
    funcionarioId: '',
    funcionarioNome: '',
    equipeId: '',
    equipeNome: '',
    turno: '',
    unidades: '',
    kg: '',
    metaUnidades: '',
    metaKg: '',
    observacoes: '',
  });

  useEffect(() => {
    if (editingRegistro) {
      setFormData({
        funcionarioId: editingRegistro.funcionario_id || '',
        funcionarioNome: editingRegistro.funcionario_nome || '',
        equipeId: editingRegistro.equipe_id || '',
        equipeNome: editingRegistro.equipe_nome || '',
        turno: editingRegistro.turno || '',
        unidades: editingRegistro.unidades_produzidas || '',
        kg: editingRegistro.kg_processados || '',
        metaUnidades: editingRegistro.meta_unidades || '',
        metaKg: editingRegistro.meta_kg || '',
        observacoes: editingRegistro.observacoes || '',
      });
    } else {
      setFormData({
        funcionarioId: '',
        funcionarioNome: '',
        equipeId: '',
        equipeNome: '',
        turno: '',
        unidades: '',
        kg: '',
        metaUnidades: '',
        metaKg: '',
        observacoes: '',
      });
    }
  }, [editingRegistro, open]);

  const handleFuncionarioChange = (value) => {
    const func = funcionarios.find(f => f.id === value);
    if (func) {
      setFormData({
        ...formData,
        funcionarioId: func.id,
        funcionarioNome: func.nome,
      });
    }
  };

  const handleEquipeChange = (value) => {
    const equipe = equipes.find(e => e.id === value);
    if (equipe) {
      setFormData({
        ...formData,
        equipeId: equipe.id,
        equipeNome: equipe.nome,
      });
    }
  };

  const handleSave = async () => {
    if (!formData.funcionarioId || !formData.equipeId || !formData.turno || !formData.unidades) {
      toast.error('Preencher campos obrigatórios');
      return;
    }

    await onSave({
      ...formData,
      id: editingRegistro?.id,
      data,
      etapa,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">
            {editingRegistro ? 'Editar Registro' : 'Novo Registro'} - {ETAPAS_LABELS[etapa]}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Funcionário *</Label>
              <Select value={formData.funcionarioId} onValueChange={handleFuncionarioChange}>
                <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {funcionarios.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Equipe *</Label>
              <Select value={formData.equipeId} onValueChange={handleEquipeChange}>
                <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {equipes.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-slate-300">Turno *</Label>
              <Select value={formData.turno} onValueChange={(value) => setFormData({...formData, turno: value})}>
                <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {TURNOS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Unidades Produzidas *</Label>
              <Input
                type="number"
                min="0"
                className="mt-1 bg-slate-800 border-slate-700"
                value={formData.unidades}
                onChange={(e) => setFormData({...formData, unidades: e.target.value})}
              />
            </div>
            <div>
              <Label className="text-slate-300">KG Processados</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                className="mt-1 bg-slate-800 border-slate-700"
                value={formData.kg}
                onChange={(e) => setFormData({...formData, kg: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Meta Unidades</Label>
              <Input
                type="number"
                min="0"
                className="mt-1 bg-slate-800 border-slate-700"
                value={formData.metaUnidades}
                onChange={(e) => setFormData({...formData, metaUnidades: e.target.value})}
              />
            </div>
            <div>
              <Label className="text-slate-300">Meta KG</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                className="mt-1 bg-slate-800 border-slate-700"
                value={formData.metaKg}
                onChange={(e) => setFormData({...formData, metaKg: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Observações</Label>
            <Textarea
              className="mt-1 bg-slate-800 border-slate-700"
              placeholder="Anotações sobre o registro..."
              value={formData.observacoes}
              onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
            />
          </div>

          <Button
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
            onClick={handleSave}
          >
            {editingRegistro ? 'Atualizar' : 'Criar'} Registro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DiarioProducaoPage() {
  const { funcionarios = [], equipes = [] } = useEquipes();

  // Estados principais
  const [selectedData, setSelectedData] = useState(() => {
    const hoje = new Date();
    return hoje.toISOString().split('T')[0];
  });
  const [selectedEtapa, setSelectedEtapa] = useState('corte');
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegistro, setEditingRegistro] = useState(null);

  // Fetch de registros do Supabase
  const fetchRegistros = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('diario_producao')
        .select('*')
        .eq('data', selectedData)
        .eq('etapa', selectedEtapa)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistros(data || []);
    } catch (err) {
      console.error('Erro ao buscar registros:', err);
      toast.error('Erro ao carregar registros');
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  }, [selectedData, selectedEtapa]);

  // Fetch ao mudar data ou etapa
  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  // Salvar registro
  const handleSaveRegistro = useCallback(async (formData) => {
    if (!isSupabaseConfigured()) {
      toast.error('Supabase não configurado');
      return;
    }

    try {
      const recordToSave = {
        id: formData.id || `DIARIO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        data: formData.data,
        etapa: formData.etapa,
        equipe_id: formData.equipeId,
        equipe_nome: formData.equipeNome,
        funcionario_id: formData.funcionarioId,
        funcionario_nome: formData.funcionarioNome,
        unidades_produzidas: parseInt(formData.unidades) || 0,
        kg_processados: parseFloat(formData.kg) || 0,
        meta_unidades: parseInt(formData.metaUnidades) || null,
        meta_kg: parseFloat(formData.metaKg) || null,
        observacoes: formData.observacoes || null,
        turno: formData.turno,
      };

      const { error } = await supabase
        .from('diario_producao')
        .upsert([recordToSave]);

      if (error) throw error;

      toast.success(formData.id ? 'Registro atualizado' : 'Registro criado com sucesso');
      setEditingRegistro(null);
      await fetchRegistros();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Erro ao salvar registro');
    }
  }, [fetchRegistros]);

  // Deletar registro
  const handleDeleteRegistro = useCallback(async (registroId) => {
    if (!window.confirm('Tem certeza que deseja deletar este registro?')) {
      return;
    }

    if (!isSupabaseConfigured()) {
      toast.error('Supabase não configurado');
      return;
    }

    try {
      const { error } = await supabase
        .from('diario_producao')
        .delete()
        .eq('id', registroId);

      if (error) throw error;

      toast.success('Registro deletado');
      await fetchRegistros();
    } catch (err) {
      console.error('Erro ao deletar:', err);
      toast.error('Erro ao deletar registro');
    }
  }, [fetchRegistros]);

  // Exportar CSV
  const handleExportarCSV = useCallback(() => {
    if (registros.length === 0) {
      toast.error('Nenhum registro para exportar');
      return;
    }

    const headers = [
      'Data',
      'Etapa',
      'Funcionário',
      'Equipe',
      'Turno',
      'Unidades',
      'KG',
      'Meta Un.',
      'Meta KG',
      'Valor (R$)',
      'Observações'
    ];

    const rows = registros.map(r => [
      r.data,
      ETAPAS_LABELS[r.etapa],
      r.funcionario_nome,
      r.equipe_nome,
      r.turno,
      r.unidades_produzidas,
      r.kg_processados,
      r.meta_unidades || '',
      r.meta_kg || '',
      formatReais(calcularValorPorEtapa(r.kg_processados, r.etapa)),
      r.observacoes || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `diario-producao-${selectedData}-${selectedEtapa}.csv`);
    link.click();

    toast.success('Exportado com sucesso');
  }, [registros, selectedData, selectedEtapa]);

  // Navegar datas
  const navegarData = useCallback((dias) => {
    const data = new Date(selectedData + 'T00:00:00');
    data.setDate(data.getDate() + dias);
    setSelectedData(data.toISOString().split('T')[0]);
  }, [selectedData]);

  // KPIs do dia
  const kpis = useMemo(() => {
    const totalUnidades = registros.reduce((sum, r) => sum + (r.unidades_produzidas || 0), 0);
    const totalKg = registros.reduce((sum, r) => sum + (r.kg_processados || 0), 0);
    const totalValor = registros.reduce((sum, r) => sum + calcularValorPorEtapa(r.kg_processados, r.etapa), 0);

    const comMeta = registros.filter(r => r.meta_unidades && r.meta_unidades > 0);
    const eficienciaMedia = comMeta.length > 0
      ? comMeta.reduce((sum, r) => sum + calcularEficiencia(r.unidades_produzidas, r.meta_unidades), 0) / comMeta.length
      : 0;

    return {
      totalUnidades,
      totalKg,
      totalValor,
      eficienciaMedia,
      numFuncionarios: new Set(registros.map(r => r.funcionario_id)).size
    };
  }, [registros]);

  // Fallback se Supabase não configurado
  if (!isSupabaseConfigured()) {
    return (
      <div className="space-y-4">
        <Card className="bg-slate-900/60 border-red-700/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertCircle className="h-8 w-8 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-400">Supabase não configurado</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para usar o Diário de Produção.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cores = ETAPAS_CORES[selectedEtapa];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
              cores.bg
            )}>
              <BookOpen className={cn("h-6 w-6", cores.text)} />
            </div>
            Diário de Produção
          </h1>
          <p className="text-slate-400 mt-1">Registro diário por etapa de produção</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Navegação de Data */}
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navegarData(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <input
              type="date"
              value={selectedData}
              onChange={(e) => setSelectedData(e.target.value)}
              className="px-3 py-1 bg-slate-700 border-0 rounded text-white text-sm cursor-pointer"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navegarData(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            className="border-slate-700 text-slate-300"
            onClick={handleExportarCSV}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className={cn(
                "bg-gradient-to-r hover:opacity-90",
                selectedEtapa === 'corte' ? 'from-amber-500 to-orange-500' :
                selectedEtapa === 'fabricacao' ? 'from-purple-500 to-indigo-500' :
                selectedEtapa === 'solda' ? 'from-red-500 to-rose-500' :
                'from-cyan-500 to-blue-500'
              )}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DiarioFormDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              etapa={selectedEtapa}
              data={selectedData}
              funcionarios={funcionarios}
              equipes={equipes}
              onSave={handleSaveRegistro}
              editingRegistro={editingRegistro}
            />
          </Dialog>
        </div>
      </div>

      {/* === LANÇAMENTOS POR FUNCIONÁRIO (Kanban / LancamentoProducaoModal) === */}
      <LancamentosPorFuncionario data={selectedData} />

      {/* Abas de Etapas */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {ETAPAS.map(etapa => (
          <motion.button
            key={etapa}
            onClick={() => {
              setSelectedEtapa(etapa);
              setEditingRegistro(null);
            }}
            className={cn(
              "px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all",
              selectedEtapa === etapa
                ? cn("bg-gradient-to-r text-white", ETAPAS_CORES[etapa].bg)
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            )}
            whileTap={{ scale: 0.95 }}
          >
            {ETAPAS_LABELS[etapa]}
          </motion.button>
        ))}
      </div>

      {/* KPIs do Dia */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Unidades</p>
              <p className="text-2xl font-bold text-white">{kpis.totalUnidades}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-400">KG</p>
              <p className="text-2xl font-bold text-white">{formatKg(kpis.totalKg)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Valor</p>
              <p className="text-2xl font-bold text-green-400">{formatReais(kpis.totalValor)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Eficiência Média</p>
              <p className="text-2xl font-bold text-white">{kpis.eficienciaMedia.toFixed(0)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="space-y-1">
              <p className="text-xs text-slate-400">Funcionários</p>
              <p className="text-2xl font-bold text-white">{kpis.numFuncionarios}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Registros */}
      {loading ? (
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-8 text-center">
            <Loader className="h-8 w-8 text-slate-500 mx-auto animate-spin" />
            <p className="text-slate-400 mt-4">Carregando registros...</p>
          </CardContent>
        </Card>
      ) : registros.length > 0 ? (
        <div className="space-y-4">
          {registros.map(registro => (
            <DiarioRegistroCard
              key={registro.id}
              registro={registro}
              etapa={selectedEtapa}
              onEdit={(reg) => {
                setEditingRegistro(reg);
                setDialogOpen(true);
              }}
              onDelete={handleDeleteRegistro}
            />
          ))}
        </div>
      ) : (
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300">Nenhum registro encontrado</h3>
            <p className="text-slate-500 mt-1">
              Não há registros para {ETAPAS_LABELS[selectedEtapa]} nesta data.
            </p>
            <Button
              className={cn(
                "mt-4 bg-gradient-to-r",
                selectedEtapa === 'corte' ? 'from-amber-500 to-orange-500' :
                selectedEtapa === 'fabricacao' ? 'from-purple-500 to-indigo-500' :
                selectedEtapa === 'solda' ? 'from-red-500 to-rose-500' :
                'from-cyan-500 to-blue-500'
              )}
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Registro
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
