// MONTEX ERP Premium - Produção por Funcionário
// Métricas REAIS de produção com análise por etapa, KG e unidades separados
// Dados do Supabase via useProducaoAnalytics

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { exportToExcel } from '@/utils/exportUtils';
import {
  User, Users, TrendingUp, TrendingDown, Award, Package, Target,
  Download, AlertTriangle, CheckCircle2, ArrowRight, Weight,
  Scissors, Flame, Droplets, Paintbrush, ChevronDown, ChevronUp,
  RefreshCw, Loader2, DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line
} from 'recharts';

// Hook de analytics real
import { useProducaoAnalytics } from '@/hooks/useProducaoAnalytics';
import {
  ETAPAS_LABELS, ETAPAS_CORES, VALORES_ETAPA,
  formatKg, formatReais, getEficienciaCor, getEficienciaBadge,
} from '@/utils/producaoCalculations';

// ============ HELPERS ============
const getTendenciaIcon = (t) => {
  if (t === 'alta') return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (t === 'baixa') return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <ArrowRight className="h-4 w-4 text-slate-400" />;
};

const getRankingColor = (pos) => {
  if (pos === 1) return 'from-amber-500 to-yellow-500';
  if (pos === 2) return 'from-slate-400 to-slate-500';
  if (pos === 3) return 'from-amber-700 to-amber-800';
  return 'from-slate-600 to-slate-700';
};

const ETAPA_ICONS = {
  corte: Scissors,
  fabricacao: Flame,
  solda: Droplets,
  pintura: Paintbrush,
};

// ============ CARD POR ETAPA ============
function EtapaMiniCard({ etapa, dados }) {
  const Icon = ETAPA_ICONS[etapa] || Package;
  const cores = ETAPAS_CORES[etapa] || {};
  return (
    <div className={cn("rounded-lg border p-2 bg-gradient-to-r", cores.bg, cores.border)}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn("h-3.5 w-3.5", cores.text)} />
        <span className={cn("text-[10px] font-semibold uppercase", cores.text)}>{ETAPAS_LABELS[etapa]}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div>
          <p className="text-xs text-slate-500">Un.</p>
          <p className="text-sm font-bold text-white">{dados.unidades}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">KG</p>
          <p className="text-sm font-bold text-white">{formatKg(dados.kg)}</p>
        </div>
      </div>
      {dados.valor > 0 && (
        <p className="text-[10px] text-slate-400 mt-1">{formatReais(dados.valor)}</p>
      )}
    </div>
  );
}

// ============ CARD FUNCIONÁRIO COM DADOS ============
function FuncionarioRealCard({ func, onSelect, isSelected }) {
  const iniciais = func.nome?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??';
  const etapasComDados = Object.entries(func.porEtapa || {}).filter(([, d]) => d.unidades > 0 || d.kg > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(func)}
      className={cn(
        "bg-slate-900/60 backdrop-blur-xl rounded-xl border p-4 cursor-pointer transition-all",
        isSelected ? "border-cyan-500/60 ring-1 ring-cyan-500/20" : "border-slate-700/50 hover:border-cyan-500/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-14 w-14 border-2 border-slate-600">
            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold">{iniciais}</AvatarFallback>
          </Avatar>
          {func.ranking > 0 && (
            <div className={cn("absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br", getRankingColor(func.ranking))}>
              #{func.ranking}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white truncate">{func.nome}</h3>
            {getTendenciaIcon(func.tendencia)}
          </div>
          <p className="text-xs text-slate-400">{func.cargo}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">{func.setor || '-'}</Badge>
            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">{func.equipeNome || '-'}</Badge>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-white">{func.totais?.unidades || 0}</p>
          <p className="text-[10px] text-slate-500">unidades</p>
          <p className="text-sm font-semibold text-cyan-400">{formatKg(func.totais?.kg)}</p>
          <p className="text-xs text-emerald-400 font-medium">{formatReais(func.totais?.valorTotal)}</p>
        </div>
      </div>

      {/* Mini cards por etapa */}
      {etapasComDados.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-700/50">
          {etapasComDados.map(([etapa, dados]) => (
            <EtapaMiniCard key={etapa} etapa={etapa} dados={dados} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ============ CARD FUNCIONÁRIO SEM DADOS ============
function FuncionarioPendenteCard({ func }) {
  const iniciais = func.nome?.split(' ').map(n => n[0]).join('').substring(0, 2) || '??';
  return (
    <div className="bg-slate-900/40 rounded-lg border border-slate-800/50 p-3 flex items-center gap-3">
      <Avatar className="h-9 w-9 border border-slate-700">
        <AvatarFallback className="bg-slate-800 text-slate-500 text-xs">{iniciais}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-400 truncate">{func.nome}</p>
        <p className="text-xs text-slate-600">{func.cargo} · {func.setor || '-'}</p>
      </div>
      <Badge className="bg-amber-500/10 text-amber-500/70 border-amber-500/20 text-[10px]">
        Sem dados
      </Badge>
    </div>
  );
}

// ============ PAINEL DE DETALHES ============
function DetalhesPanel({ func, onClose }) {
  if (!func) return null;

  const etapas = Object.entries(func.porEtapa || {}).filter(([, d]) => d.unidades > 0 || d.kg > 0);
  const dadosDiarios = func.dadosDiarios || [];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      {/* Header */}
      <Card className="bg-slate-900/80 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-cyan-500">
                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold">
                  {func.nome?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-lg font-bold text-white">{func.nome}</h2>
                <p className="text-sm text-slate-400">{func.cargo} · {func.equipeNome}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-500">✕</Button>
          </div>

          {/* KPIs do funcionário */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <Package className="h-5 w-5 text-cyan-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">{func.totais?.unidades || 0}</p>
              <p className="text-[10px] text-slate-500">Unidades Total</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <Weight className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">{formatKg(func.totais?.kg)}</p>
              <p className="text-[10px] text-slate-500">KG Total</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <DollarSign className="h-5 w-5 text-amber-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">{formatReais(func.totais?.valorTotal)}</p>
              <p className="text-[10px] text-slate-500">Valor Gerado</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalhamento por Etapa */}
      {etapas.length > 0 && (
        <Card className="bg-slate-900/80 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Produção por Etapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {etapas.map(([etapa, dados]) => {
              const Icon = ETAPA_ICONS[etapa] || Package;
              const cores = ETAPAS_CORES[etapa] || {};
              const valorKg = VALORES_ETAPA[etapa] || 0;
              return (
                <div key={etapa} className={cn("rounded-lg border p-3 bg-gradient-to-r", cores.bg, cores.border)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", cores.text)} />
                      <span className={cn("text-sm font-semibold", cores.text)}>{ETAPAS_LABELS[etapa]}</span>
                      <span className="text-[10px] text-slate-500">R$ {valorKg.toFixed(2)}/kg</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-400">{formatReais(dados.valor)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Unidades</p>
                      <p className="text-lg font-bold text-white">{dados.unidades}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Peso Processado</p>
                      <p className="text-lg font-bold text-white">{formatKg(dados.kg)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Produção Diária */}
      {dadosDiarios.length > 2 && (
        <Card className="bg-slate-900/80 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Produção Diária (Unidades)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dadosDiarios.slice(-15)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="data" stroke="#64748b" fontSize={10} tickFormatter={d => d?.substring(5) || ''} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                <Line type="monotone" dataKey="unidades" stroke="#22d3ee" strokeWidth={2} dot={{ fill: '#22d3ee', r: 3 }} name="Unidades" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Sem dados suficientes */}
      {etapas.length === 0 && (
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500/50 mx-auto mb-3" />
            <p className="text-slate-400">Este funcionário ainda não possui registros de produção no período selecionado.</p>
            <p className="text-xs text-slate-600 mt-2">Os dados serão populados conforme as peças forem movimentadas no Kanban de Produção e Corte.</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

// ============ COMPONENTE PRINCIPAL ============
export default function ProducaoFuncionarioPage() {
  const [filtroSetor, setFiltroSetor] = useState('todos');
  const [filtroEquipe, setFiltroEquipe] = useState('todos');
  const [ordenacao, setOrdenacao] = useState('ranking');
  const [funcSelecionado, setFuncSelecionado] = useState(null);
  const [showPendentes, setShowPendentes] = useState(false);

  const {
    loading, error,
    funcionariosComDados, funcionariosSemDados,
    kpis, topPerformers,
    refetch,
  } = useProducaoAnalytics({ equipeId: filtroEquipe !== 'todos' ? filtroEquipe : undefined });

  // Setores únicos
  const setoresUnicos = useMemo(() => {
    const s = new Set([...funcionariosComDados, ...funcionariosSemDados].map(f => f.setor).filter(Boolean));
    return [...s].sort();
  }, [funcionariosComDados, funcionariosSemDados]);

  // Filtrar e ordenar
  const funcsFiltrados = useMemo(() => {
    let lista = [...funcionariosComDados];
    if (filtroSetor !== 'todos') lista = lista.filter(f => f.setor === filtroSetor);
    switch (ordenacao) {
      case 'ranking': lista.sort((a, b) => a.ranking - b.ranking); break;
      case 'unidades': lista.sort((a, b) => (b.totais?.unidades || 0) - (a.totais?.unidades || 0)); break;
      case 'kg': lista.sort((a, b) => (b.totais?.kg || 0) - (a.totais?.kg || 0)); break;
      case 'valor': lista.sort((a, b) => (b.totais?.valorTotal || 0) - (a.totais?.valorTotal || 0)); break;
    }
    return lista;
  }, [funcionariosComDados, filtroSetor, ordenacao]);

  // Export handler
  const handleExport = () => {
    const data = funcsFiltrados.map(f => ({
      nome: f.nome, cargo: f.cargo, setor: f.setor, equipe: f.equipeNome,
      ranking: f.ranking, tendencia: f.tendencia,
      totalUnidades: f.totais?.unidades || 0,
      totalKg: f.totais?.kg || 0,
      totalValor: f.totais?.valorTotal || 0,
      corteUn: f.porEtapa?.corte?.unidades || 0, corteKg: f.porEtapa?.corte?.kg || 0,
      fabUn: f.porEtapa?.fabricacao?.unidades || 0, fabKg: f.porEtapa?.fabricacao?.kg || 0,
      soldaUn: f.porEtapa?.solda?.unidades || 0, soldaKg: f.porEtapa?.solda?.kg || 0,
      pinturaUn: f.porEtapa?.pintura?.unidades || 0, pinturaKg: f.porEtapa?.pintura?.kg || 0,
    }));
    const cols = [
      { header: 'Nome', key: 'nome' }, { header: 'Cargo', key: 'cargo' },
      { header: 'Setor', key: 'setor' }, { header: 'Equipe', key: 'equipe' },
      { header: 'Ranking', key: 'ranking' }, { header: 'Tendência', key: 'tendencia' },
      { header: 'Total Un.', key: 'totalUnidades' }, { header: 'Total KG', key: 'totalKg' },
      { header: 'Valor R$', key: 'totalValor' },
      { header: 'Corte Un.', key: 'corteUn' }, { header: 'Corte KG', key: 'corteKg' },
      { header: 'Fab Un.', key: 'fabUn' }, { header: 'Fab KG', key: 'fabKg' },
      { header: 'Solda Un.', key: 'soldaUn' }, { header: 'Solda KG', key: 'soldaKg' },
      { header: 'Pintura Un.', key: 'pinturaUn' }, { header: 'Pintura KG', key: 'pinturaKg' },
    ];
    exportToExcel(data, cols, `producao-funcionarios-${new Date().toISOString().split('T')[0]}`);
    toast.success('Dados exportados!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            Produção por Funcionário
          </h1>
          <p className="text-slate-400 mt-1">Métricas reais · KG e Unidades separados · Dados do Supabase</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filtroSetor} onValueChange={setFiltroSetor}>
            <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700">
              <SelectValue placeholder="Setor" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="todos">Todos Setores</SelectItem>
              {setoresUnicos.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={ordenacao} onValueChange={setOrdenacao}>
            <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="ranking">Ranking</SelectItem>
              <SelectItem value="unidades">Unidades</SelectItem>
              <SelectItem value="kg">KG</SelectItem>
              <SelectItem value="valor">Valor R$</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={refetch} variant="outline" size="icon" className="border-slate-700 text-slate-400" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>

          <Button onClick={handleExport} variant="outline" className="border-slate-700 text-slate-300">
            <Download className="h-4 w-4 mr-2" /> Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { icon: Users, label: 'Com Produção', value: kpis.totalFuncionariosComDados, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
          { icon: Package, label: 'Total Unidades', value: kpis.totalUnidades.toLocaleString(), color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { icon: Weight, label: 'Total KG', value: formatKg(kpis.totalKg), color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { icon: DollarSign, label: 'Valor Gerado', value: formatReais(kpis.totalValor), color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { icon: AlertTriangle, label: 'Pendentes', value: kpis.totalFuncionariosSemDados, color: 'text-slate-400', bg: 'bg-slate-500/20' },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-slate-900/60 border-slate-700/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", kpi.bg)}>
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500">{kpi.label}</p>
                <p className="text-lg font-bold text-white">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resumo por Etapa */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(kpis.porEtapa || {}).map(([etapa, dados]) => {
          const Icon = ETAPA_ICONS[etapa] || Package;
          const cores = ETAPAS_CORES[etapa] || {};
          return (
            <Card key={etapa} className={cn("border bg-gradient-to-r", cores.bg, cores.border)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn("h-4 w-4", cores.text)} />
                  <span className={cn("text-sm font-semibold", cores.text)}>{ETAPAS_LABELS[etapa]}</span>
                  <span className="text-[10px] text-slate-500 ml-auto">R${(VALORES_ETAPA[etapa] || 0).toFixed(2)}/kg</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-sm font-bold text-white">{dados.un}</p><p className="text-[10px] text-slate-500">Un.</p></div>
                  <div><p className="text-sm font-bold text-white">{formatKg(dados.kg)}</p><p className="text-[10px] text-slate-500">KG</p></div>
                  <div><p className="text-sm font-bold text-emerald-400">{formatReais(dados.valor)}</p><p className="text-[10px] text-slate-500">Valor</p></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
          <span className="text-slate-400 ml-3">Carregando dados de produção...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="text-red-400">Erro ao carregar dados: {error}</span>
            <Button onClick={refetch} size="sm" variant="outline" className="ml-auto border-red-500/30 text-red-400">Tentar novamente</Button>
          </CardContent>
        </Card>
      )}

      {/* Conteúdo Principal */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Lista de Funcionários (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-400" />
              Funcionários com Produção ({funcsFiltrados.length})
            </h2>

            {funcsFiltrados.length === 0 && !loading && (
              <Card className="bg-slate-900/40 border-slate-800/50">
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Nenhum funcionário com dados de produção no período.</p>
                  <p className="text-xs text-slate-600 mt-1">Movimente peças no Kanban para registrar produção.</p>
                </CardContent>
              </Card>
            )}

            <AnimatePresence>
              {funcsFiltrados.map(f => (
                <FuncionarioRealCard
                  key={f.id}
                  func={f}
                  onSelect={setFuncSelecionado}
                  isSelected={funcSelecionado?.id === f.id}
                />
              ))}
            </AnimatePresence>

            {/* Seção Pendentes (colapsável) */}
            {funcionariosSemDados.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowPendentes(!showPendentes)}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors w-full text-left"
                >
                  {showPendentes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="text-sm font-medium">
                    Pendente de Verificação ({funcionariosSemDados.length})
                  </span>
                  <Badge className="bg-amber-500/10 text-amber-500/60 border-amber-500/20 text-[10px]">
                    Sem dados de produção
                  </Badge>
                </button>

                <AnimatePresence>
                  {showPendentes && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 mt-3">
                        {funcionariosSemDados.map(f => (
                          <FuncionarioPendenteCard key={f.id} func={f} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Painel de Detalhes (2 cols) */}
          <div className="lg:col-span-2">
            {funcSelecionado ? (
              <DetalhesPanel func={funcSelecionado} onClose={() => setFuncSelecionado(null)} />
            ) : (
              <Card className="bg-slate-900/60 border-slate-700/50 sticky top-4">
                <CardContent className="p-8 text-center">
                  <User className="h-14 w-14 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-400">Selecione um funcionário</h3>
                  <p className="text-xs text-slate-600 mt-1">Clique para ver detalhes por etapa, KG e valor</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
