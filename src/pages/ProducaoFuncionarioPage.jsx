// MONTEX ERP Premium - Produção por Funcionário ULTRA
// Análise completa com gráficos interativos, metas dinâmicas e relatórios exportáveis
// Dados REAIS do Supabase via useProducaoAnalytics + contabilização cumulativa

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { exportToExcel } from '@/utils/exportUtils';
import {
  User, Users, TrendingUp, TrendingDown, Award, Package, Target,
  Download, AlertTriangle, CheckCircle2, ArrowRight, Weight,
  Scissors, Flame, Droplets, Paintbrush, ChevronDown, ChevronUp,
  RefreshCw, Loader2, BarChart3, PieChart, Activity, Zap,
  Calendar, Clock, FileSpreadsheet, Filter, Maximize2,
  Eye, Star, Medal, Trophy,
  Save, Check, Search, AlertCircle, Truck, Building2, ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart as RPieChart, Pie, Cell, ComposedChart,
  RadialBarChart, RadialBar
} from 'recharts';

// Hook de analytics real
import { useProducaoAnalytics } from '@/hooks/useProducaoAnalytics';
import { useEquipes } from '@/contexts/ERPContext';
import { supabase, supabaseAdmin } from '@/api/supabaseClient';
import {
  ETAPAS_LABELS, ETAPAS_CORES,
  formatKg, contabilizarCumulativo,
} from '@/utils/producaoCalculations';

// ============ CONSTANTES ============
const ETAPA_ICONS = {
  corte: Scissors,
  fabricacao: Flame,
  solda: Droplets,
  pintura: Paintbrush,
};

const CORES_GRAFICO = {
  corte: '#f59e0b',
  fabricacao: '#8b5cf6',
  solda: '#ef4444',
  pintura: '#06b6d4',
};

const PIE_COLORS = ['#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

// Metas baseadas em benchmarks reais de metalurgia (por funcionário/mês)
const METAS_PRODUCAO = {
  corte: { unidades: 80, kg: 25000, label: 'Meta Corte (80 conj/mês)' },
  fabricacao: { unidades: 60, kg: 20000, label: 'Meta Fabricação (60 conj/mês)' },
  solda: { unidades: 50, kg: 18000, label: 'Meta Solda (50 conj/mês)' },
  pintura: { unidades: 70, kg: 22000, label: 'Meta Pintura (70 conj/mês)' },
};

// ============ HELPERS ============
const getTendenciaIcon = (t) => {
  if (t === 'alta') return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (t === 'baixa') return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <ArrowRight className="h-4 w-4 text-slate-400" />;
};

const getTendenciaLabel = (t) => {
  if (t === 'alta') return 'Em alta';
  if (t === 'baixa') return 'Em queda';
  return 'Estável';
};

const getRankingIcon = (pos) => {
  if (pos === 1) return <Trophy className="h-4 w-4 text-amber-400" />;
  if (pos === 2) return <Medal className="h-4 w-4 text-slate-300" />;
  if (pos === 3) return <Medal className="h-4 w-4 text-amber-700" />;
  return <Star className="h-3 w-3 text-slate-600" />;
};

const getRankingColor = (pos) => {
  if (pos === 1) return 'from-amber-500 to-yellow-500';
  if (pos === 2) return 'from-slate-400 to-slate-500';
  if (pos === 3) return 'from-amber-700 to-amber-800';
  return 'from-slate-600 to-slate-700';
};

const calcularEficiencia = (real, meta) => meta > 0 ? Math.min(Math.round((real / meta) * 100), 150) : 0;

// Tooltip customizado para gráficos
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-slate-400 text-xs font-medium mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-bold text-white">{typeof p.value === 'number' ? p.value.toLocaleString('pt-BR') : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ============ DASHBOARD GLOBAL DE KPIs ============
function DashboardKPIs({ kpis, pecas }) {
  const cumulativo = useMemo(() => contabilizarCumulativo(pecas), [pecas]);

  // Dados para gráfico de pizza por etapa
  const pieData = useMemo(() => {
    return Object.entries(kpis.porEtapa || {}).map(([etapa, dados]) => ({
      name: ETAPAS_LABELS[etapa],
      value: dados.un || 0,
      kg: dados.kg || 0,
    }));
  }, [kpis]);

  // Dados para gráfico radar de distribuição
  const radarData = useMemo(() => {
    return Object.entries(kpis.porEtapa || {}).map(([etapa, dados]) => ({
      etapa: ETAPAS_LABELS[etapa],
      producao: dados.un || 0,
      meta: METAS_PRODUCAO[etapa]?.unidades || 50,
      eficiencia: calcularEficiencia(dados.un, METAS_PRODUCAO[etapa]?.unidades || 50),
    }));
  }, [kpis]);

  // Dados para gráfico radial de eficiência
  const eficienciaGeral = useMemo(() => {
    const etapas = Object.keys(kpis.porEtapa || {});
    if (etapas.length === 0) return 0;
    const soma = etapas.reduce((s, e) => {
      return s + calcularEficiencia(kpis.porEtapa[e]?.un || 0, METAS_PRODUCAO[e]?.unidades || 50);
    }, 0);
    return Math.round(soma / etapas.length);
  }, [kpis]);

  const radialData = useMemo(() => {
    return Object.entries(kpis.porEtapa || {}).map(([etapa, dados]) => ({
      name: ETAPAS_LABELS[etapa],
      eficiencia: calcularEficiencia(dados.un, METAS_PRODUCAO[etapa]?.unidades || 50),
      fill: CORES_GRAFICO[etapa],
    }));
  }, [kpis]);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { icon: Users, label: 'Funcionários Ativos', value: kpis.totalFuncionariosComDados, sub: `${kpis.totalFuncionariosSemDados} pendentes`, color: 'text-cyan-400', bg: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/30' },
          { icon: Package, label: 'Conjuntos', value: (kpis.totalConjuntos || 0).toLocaleString('pt-BR'), sub: `${(kpis.totalUnidades || 0).toLocaleString('pt-BR')} unidades em produção`, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-green-500/20', border: 'border-emerald-500/30' },
          { icon: Weight, label: 'Peso Total', value: formatKg(kpis.totalKg), sub: 'peso real das peças', color: 'text-blue-400', bg: 'from-blue-500/20 to-indigo-500/20', border: 'border-blue-500/30' },
          { icon: Target, label: 'Eficiência Média', value: `${eficienciaGeral}%`, sub: 'vs metas do setor', color: eficienciaGeral >= 75 ? 'text-emerald-400' : eficienciaGeral >= 50 ? 'text-amber-400' : 'text-red-400', bg: eficienciaGeral >= 75 ? 'from-emerald-500/20 to-green-500/20' : eficienciaGeral >= 50 ? 'from-amber-500/20 to-orange-500/20' : 'from-red-500/20 to-rose-500/20', border: eficienciaGeral >= 75 ? 'border-emerald-500/30' : eficienciaGeral >= 50 ? 'border-amber-500/30' : 'border-red-500/30' },
          { icon: Zap, label: 'Conj./Func.', value: kpis.totalFuncionariosComDados > 0 ? Math.round((kpis.totalConjuntos || 0) / kpis.totalFuncionariosComDados) : 0, sub: 'média por funcionário', color: 'text-purple-400', bg: 'from-purple-500/20 to-indigo-500/20', border: 'border-purple-500/30' },
        ].map((kpi) => (
          <Card key={kpi.label} className={cn("bg-gradient-to-br border", kpi.bg, kpi.border)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-2xl font-black text-white mt-1">{kpi.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{kpi.sub}</p>
                </div>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800/50")}>
                  <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Etapas de Produção com barras de progresso */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(kpis.porEtapa || {}).map(([etapa, dados]) => {
          const Icon = ETAPA_ICONS[etapa] || Package;
          const cores = ETAPAS_CORES[etapa] || {};
          const meta = METAS_PRODUCAO[etapa];
          const efic = calcularEficiencia(dados.un, meta?.unidades || 50);
          const atribuido = dados.atribuidoUn || 0;
          const naoAtribuido = (dados.un || 0) - atribuido;

          return (
            <Card key={etapa} className={cn("border bg-gradient-to-br", cores.bg, cores.border)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={cn("h-5 w-5", cores.text)} />
                  <span className={cn("text-sm font-bold uppercase", cores.text)}>{ETAPAS_LABELS[etapa]}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-2xl font-black text-white">{(dados.un || 0).toLocaleString('pt-BR')}</p>
                      <p className="text-[10px] text-slate-500">un. que passaram por {ETAPAS_LABELS[etapa]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{formatKg(dados.kg)}</p>
                    </div>
                  </div>

                  {/* Barra de progresso meta */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                      <span>Eficiência: {efic}%</span>
                      <span>Meta: {meta?.unidades || 50} un</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", efic >= 90 ? 'bg-emerald-500' : efic >= 60 ? 'bg-amber-500' : 'bg-red-500')}
                        style={{ width: `${Math.min(efic, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Atribuído vs Não atribuído */}
                  {naoAtribuido > 0 && (
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-cyan-400">{atribuido} atribuídas</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-amber-400">{naoAtribuido} sem vínculo</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Gráficos lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico de Barras Comparativo */}
        <Card className="bg-slate-900/60 border-slate-700/50 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              Produção vs Meta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={radarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#475569" fontSize={10} />
                <YAxis type="category" dataKey="etapa" stroke="#475569" fontSize={11} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="producao" fill="#22d3ee" radius={[0, 4, 4, 0]} name="Produzido" barSize={12} />
                <Bar dataKey="meta" fill="#334155" radius={[0, 4, 4, 0]} name="Meta" barSize={12} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico Radar de Habilidades */}
        <Card className="bg-slate-900/60 border-slate-700/50 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              Radar de Eficiência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="etapa" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} />
                <Radar name="Eficiência %" dataKey="eficiencia" stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico Pizza */}
        <Card className="bg-slate-900/60 border-slate-700/50 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-emerald-400" />
              Distribuição por Etapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </RPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Eficiência Radial */}
      <Card className="bg-slate-900/60 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-400" />
            Eficiência por Etapa (%)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart
              innerRadius="30%"
              outerRadius="100%"
              data={radialData}
              startAngle={180}
              endAngle={0}
            >
              <RadialBar
                label={{ fill: '#fff', fontSize: 11, position: 'insideStart' }}
                background={{ fill: '#1e293b' }}
                dataKey="eficiencia"
                cornerRadius={6}
              />
              <Legend
                iconSize={10}
                layout="horizontal"
                verticalAlign="bottom"
                formatter={(value) => <span className="text-slate-400 text-xs">{value}</span>}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ RANKING POR SETOR ============
function RankingSetorCard({ titulo, icon: Icon, color, performers, bgGradient, borderColor }) {
  if (!performers || performers.length === 0) return null;

  const chartData = performers.slice(0, 5).map(f => ({
    nome: f.nome?.split(' ')[0] || '?',
    unidades: f.totais?.unidades || 0,
    kg: Math.round(f.totais?.kg || 0),
  }));

  return (
    <Card className={cn("border", bgGradient, borderColor)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white flex items-center gap-2">
          <Icon className={cn("h-5 w-5", color)} />
          {titulo}
          <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400 ml-auto">{performers.length} funcionários</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          {performers.slice(0, 5).map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                i === 0 ? "bg-amber-500/10 border-amber-500/20" :
                i === 1 ? "bg-slate-400/10 border-slate-400/20" :
                i === 2 ? "bg-amber-700/10 border-amber-700/20" :
                "bg-slate-800/20 border-slate-700/20"
              )}
            >
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-br", getRankingColor(i + 1))}>
                {i + 1}º
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{f.nome}</p>
                <p className="text-[10px] text-slate-500">{f.cargo}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-white">{(f.totais?.unidades || 0).toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-cyan-400">{formatKg(f.totais?.kg)}</p>
              </div>
              {getTendenciaIcon(f.tendencia)}
            </motion.div>
          ))}
        </div>

        {chartData.length > 1 && (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#475569" fontSize={9} />
              <YAxis type="category" dataKey="nome" stroke="#94a3b8" fontSize={10} width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="unidades" radius={[0, 4, 4, 0]} name="Peças" barSize={12}>
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#22d3ee'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function TopPerformersSection({ performers }) {
  if (!performers || performers.length === 0) return null;

  // Separar por setor/etapa principal de trabalho
  // Produção/Corte: etapas corte + fabricacao
  // Solda: etapa solda
  // Pintura: etapa pintura
  const rankCorteProducao = performers.filter(f => {
    const etapas = f.porEtapa || {};
    const corteUn = etapas.corte?.unidades || 0;
    const fabUn = etapas.fabricacao?.unidades || 0;
    return corteUn > 0 || fabUn > 0;
  }).sort((a, b) => {
    const aUn = (a.porEtapa?.corte?.unidades || 0) + (a.porEtapa?.fabricacao?.unidades || 0);
    const bUn = (b.porEtapa?.corte?.unidades || 0) + (b.porEtapa?.fabricacao?.unidades || 0);
    return bUn - aUn;
  });

  const rankSolda = performers.filter(f => (f.porEtapa?.solda?.unidades || 0) > 0)
    .sort((a, b) => (b.porEtapa?.solda?.unidades || 0) - (a.porEtapa?.solda?.unidades || 0));

  const rankPintura = performers.filter(f => (f.porEtapa?.pintura?.unidades || 0) > 0)
    .sort((a, b) => (b.porEtapa?.pintura?.unidades || 0) - (a.porEtapa?.pintura?.unidades || 0));

  // Ranking geral
  const chartDataGeral = performers.slice(0, 8).map(f => ({
    nome: f.nome?.split(' ')[0] || '?',
    unidades: f.totais?.unidades || 0,
    kg: Math.round(f.totais?.kg || 0),
  }));

  return (
    <div className="space-y-4">
      {/* Ranking Geral */}
      <Card className="bg-slate-900/60 border-slate-700/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />
            Ranking Geral — Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              {performers.slice(0, 5).map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border",
                    i === 0 ? "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/30" :
                    i === 1 ? "bg-gradient-to-r from-slate-400/10 to-slate-500/10 border-slate-400/30" :
                    i === 2 ? "bg-gradient-to-r from-amber-700/10 to-amber-800/10 border-amber-700/30" :
                    "bg-slate-800/30 border-slate-700/30"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white bg-gradient-to-br", getRankingColor(i + 1))}>
                    {i + 1}º
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{f.nome}</p>
                    <p className="text-[10px] text-slate-500">{f.cargo} · {f.equipeNome || f.setor || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-white">{(f.totais?.unidades || 0).toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-cyan-400">{formatKg(f.totais?.kg)}</p>
                  </div>
                  {getTendenciaIcon(f.tendencia)}
                </motion.div>
              ))}
            </div>
            <div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartDataGeral} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#475569" fontSize={10} />
                  <YAxis type="category" dataKey="nome" stroke="#94a3b8" fontSize={11} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="unidades" fill="#22d3ee" radius={[0, 6, 6, 0]} name="Peças" barSize={14}>
                    {chartDataGeral.map((_, idx) => (
                      <Cell key={idx} fill={idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#22d3ee'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rankings por Setor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingSetorCard
          titulo="Produção / Corte"
          icon={Scissors}
          color="text-amber-400"
          performers={rankCorteProducao}
          bgGradient="bg-gradient-to-br from-amber-500/5 to-orange-500/5"
          borderColor="border-amber-500/20"
        />
        <RankingSetorCard
          titulo="Solda"
          icon={Droplets}
          color="text-red-400"
          performers={rankSolda}
          bgGradient="bg-gradient-to-br from-red-500/5 to-rose-500/5"
          borderColor="border-red-500/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankingSetorCard
          titulo="Pintura"
          icon={Paintbrush}
          color="text-cyan-400"
          performers={rankPintura}
          bgGradient="bg-gradient-to-br from-cyan-500/5 to-blue-500/5"
          borderColor="border-cyan-500/20"
        />
      </div>
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
        "bg-slate-900/60 backdrop-blur-xl rounded-xl border p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-500/5",
        isSelected ? "border-cyan-500/60 ring-1 ring-cyan-500/20" : "border-slate-700/50 hover:border-cyan-500/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-14 w-14 border-2 border-slate-600">
            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white font-bold">{iniciais}</AvatarFallback>
          </Avatar>
          {func.ranking > 0 && func.ranking <= 3 && (
            <div className={cn("absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br", getRankingColor(func.ranking))}>
              #{func.ranking}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white truncate">{func.nome}</h3>
            {getTendenciaIcon(func.tendencia)}
            <span className="text-[10px] text-slate-500">{getTendenciaLabel(func.tendencia)}</span>
          </div>
          <p className="text-xs text-slate-400">{func.cargo}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">{func.setor || '-'}</Badge>
            <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">{func.equipeNome || '-'}</Badge>
            {func.ranking > 0 && (
              <Badge className={cn("text-[10px]", func.ranking <= 3 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-slate-500/20 text-slate-400 border-slate-500/30")}>
                #{func.ranking}
              </Badge>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-xl font-bold text-white">{(func.totais?.unidades || 0).toLocaleString('pt-BR')}</p>
          <p className="text-[10px] text-slate-500">unidades</p>
          <p className="text-sm font-semibold text-cyan-400">{formatKg(func.totais?.kg)}</p>
        </div>
      </div>

      {/* Mini cards por etapa */}
      {etapasComDados.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-700/50">
          {etapasComDados.map(([etapa, dados]) => {
            const Icon = ETAPA_ICONS[etapa] || Package;
            const cores = ETAPAS_CORES[etapa] || {};
            return (
              <div key={etapa} className={cn("rounded-lg border p-2 bg-gradient-to-r", cores.bg, cores.border)}>
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
              </div>
            );
          })}
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

// ============ PAINEL DE DETALHES DO FUNCIONÁRIO ============
function DetalhesPanel({ func, onClose }) {
  if (!func) return null;

  const etapas = Object.entries(func.porEtapa || {}).filter(([, d]) => d.unidades > 0 || d.kg > 0);
  const dadosDiarios = func.dadosDiarios || [];

  // Dados para gráfico de barras por etapa
  const etapaChartData = Object.entries(func.porEtapa || {}).map(([etapa, dados]) => ({
    etapa: ETAPAS_LABELS[etapa],
    unidades: dados.unidades || 0,
    kg: Math.round(dados.kg || 0),
    meta: METAS_PRODUCAO[etapa]?.unidades || 50,
    eficiencia: calcularEficiencia(dados.unidades, METAS_PRODUCAO[etapa]?.unidades || 50),
  }));

  // Dados para radar individual
  const radarData = Object.entries(func.porEtapa || {}).map(([etapa, dados]) => ({
    etapa: ETAPAS_LABELS[etapa],
    valor: calcularEficiencia(dados.unidades, METAS_PRODUCAO[etapa]?.unidades || 50),
  }));

  // Eficiência geral do funcionário
  const eficGeral = etapaChartData.length > 0
    ? Math.round(etapaChartData.reduce((s, e) => s + e.eficiencia, 0) / etapaChartData.length)
    : 0;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 sticky top-4">
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
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-500 hover:text-white">✕</Button>
          </div>

          {/* KPIs do funcionário */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <Package className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">{(func.totais?.unidades || 0).toLocaleString('pt-BR')}</p>
              <p className="text-[10px] text-slate-500">Unidades</p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <Weight className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">{formatKg(func.totais?.kg)}</p>
              <p className="text-[10px] text-slate-500">KG Total</p>
            </div>
            <div className={cn("rounded-lg p-3 text-center", eficGeral >= 75 ? 'bg-emerald-500/10' : eficGeral >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10')}>
              <Target className={cn("h-4 w-4 mx-auto mb-1", eficGeral >= 75 ? 'text-emerald-400' : eficGeral >= 50 ? 'text-amber-400' : 'text-red-400')} />
              <p className={cn("text-xl font-bold", eficGeral >= 75 ? 'text-emerald-400' : eficGeral >= 50 ? 'text-amber-400' : 'text-red-400')}>{eficGeral}%</p>
              <p className="text-[10px] text-slate-500">Eficiência</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Barras por Etapa */}
      {etapas.length > 0 && (
        <Card className="bg-slate-900/80 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              Produção por Etapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={etapaChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="etapa" stroke="#475569" fontSize={10} />
                <YAxis stroke="#475569" fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="unidades" name="Produzido" radius={[4, 4, 0, 0]} barSize={20}>
                  {etapaChartData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Bar>
                <Bar dataKey="meta" fill="#334155" name="Meta" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Radar Individual */}
      {radarData.some(d => d.valor > 0) && (
        <Card className="bg-slate-900/80 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              Perfil de Habilidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="etapa" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#475569', fontSize: 8 }} />
                <Radar dataKey="valor" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.3} strokeWidth={2} name="Eficiência %" />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Produção Diária */}
      {dadosDiarios.length > 2 && (
        <Card className="bg-slate-900/80 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              Produção Diária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dadosDiarios.slice(-20)}>
                <defs>
                  <linearGradient id="colorUn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="data" stroke="#475569" fontSize={9} tickFormatter={d => d?.substring(5) || ''} />
                <YAxis stroke="#475569" fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="unidades" stroke="#22d3ee" fill="url(#colorUn)" strokeWidth={2} name="Unidades" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detalhamento Numérico por Etapa */}
      {etapas.length > 0 && (
        <Card className="bg-slate-900/80 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Detalhamento por Etapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {etapas.map(([etapa, dados]) => {
              const Icon = ETAPA_ICONS[etapa] || Package;
              const cores = ETAPAS_CORES[etapa] || {};
              const meta = METAS_PRODUCAO[etapa];
              const efic = calcularEficiencia(dados.unidades, meta?.unidades || 50);
              return (
                <div key={etapa} className={cn("rounded-lg border p-3 bg-gradient-to-r", cores.bg, cores.border)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", cores.text)} />
                      <span className={cn("text-sm font-semibold", cores.text)}>{ETAPAS_LABELS[etapa]}</span>
                    </div>
                    <Badge className={cn("text-[10px]", efic >= 75 ? 'bg-emerald-500/20 text-emerald-400' : efic >= 50 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400')}>
                      {efic}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-slate-500">Peças</p>
                      <p className="font-bold text-white">{dados.unidades}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">KG</p>
                      <p className="font-bold text-white">{formatKg(dados.kg)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Meta</p>
                      <p className="font-bold text-slate-400">{meta?.unidades || 50}</p>
                    </div>
                  </div>
                  {/* Barra progresso */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", efic >= 75 ? 'bg-emerald-500' : efic >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                      style={{ width: `${Math.min(efic, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Sem dados */}
      {etapas.length === 0 && (
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500/50 mx-auto mb-3" />
            <p className="text-slate-400">Sem registros de produção no período.</p>
            <p className="text-xs text-slate-600 mt-2">Movimente peças no Kanban para gerar dados.</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

// ============ COMPONENTE PRINCIPAL ============
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
function hojeStr() { return new Date().toISOString().split('T')[0]; }
function gerarLancId() { return 'LANC-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8); }
function formatPesoLanc(kg) { if (!kg) return '—'; if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`; return `${Number(kg).toFixed(1)} kg`; }

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

// ─── Tab de Lançamentos por Obra — carregamento leve por demanda ────────────────
function LancamentosObraTab({ pecasAnalytics, refetch }) {
  const { funcionarios: ctxFuncionarios } = useEquipes();

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

  // Paginação + busca
  const [page, setPage] = useState(0);
  const [busca, setBusca] = useState('');
  const [expandidos, setExpandidos] = useState({});

  const funcionariosAtivos = useMemo(() =>
    (ctxFuncionarios || []).filter(f => f.status !== 'inativo').sort((a, b) => (a.nome || '').localeCompare(b.nome || '')),
  [ctxFuncionarios]);

  const chave = (pecaId, etapa) => `${pecaId}__${etapa}`;

  // ─── Fase 1: resumo de obras — apenas 3 colunas, muito leve ────────
  const carregarObrasResumo = useCallback(async () => {
    setLoadingObras(true);
    const client = supabaseAdmin || supabase;
    try {
      const { data, error } = await client
        .from('pecas_producao')
        .select('obra_id, obra_nome, quantidade');
      if (error) throw error;
      const mapa = new Map();
      for (const p of (data || [])) {
        const id = p.obra_id || 'sem-obra';
        const nome = p.obra_nome || 'Sem Obra';
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
  }, []);

  useEffect(() => { carregarObrasResumo(); }, []);

  // ─── Fase 2: carregar peças + lançamentos de UMA obra ao clicar ────
  const abrirObra = useCallback(async (obraId, obraNome) => {
    setLoadingDetalhe(true);
    setObraAtual({ id: obraId, nome: obraNome });
    setLancamentos({});
    setPage(0);
    setBusca('');
    setExpandidos({});
    const client = supabaseAdmin || supabase;
    try {
      const { data: pecasData, error: pecasErr } = await client
        .from('pecas_producao')
        .select('*')
        .eq('obra_id', obraId)
        .order('marca');
      if (pecasErr) throw pecasErr;
      const bruto = pecasData || [];
      const expandido = expandirPorQtd(bruto);
      setPecasDaObra(bruto);
      setConjuntosDaObra(expandido);
      // Carregar lançamentos existentes para essa obra
      if (expandido.length > 0) {
        const ids = expandido.map(p => p.id);
        const { data: lanData } = await client
          .from('entity_store')
          .select('id, data')
          .eq('entity_type', 'producao_lancamento')
          .in('data->>peca_id', ids);
        const mapa = {};
        (lanData || []).forEach(row => {
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

  const voltarParaObras = () => {
    setObraAtual(null);
    setPecasDaObra([]);
    setConjuntosDaObra([]);
    setLancamentos({});
    setPage(0);
    setBusca('');
  };

  // Filtro + paginação sobre os conjuntos da obra selecionada
  const conjuntosFiltrados = useMemo(() => {
    if (!busca) return conjuntosDaObra;
    const q = busca.toLowerCase();
    return conjuntosDaObra.filter(p =>
      (p.marca || '').toLowerCase().includes(q) ||
      (p.tipo || '').toLowerCase().includes(q) ||
      (p.nome || '').toLowerCase().includes(q)
    );
  }, [conjuntosDaObra, busca]);

  const totalPages = Math.max(1, Math.ceil(conjuntosFiltrados.length / PAGE_SIZE));
  const conjuntosPagina = useMemo(() =>
    conjuntosFiltrados.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
  [conjuntosFiltrados, page]);

  useEffect(() => { setPage(0); }, [busca]);

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
    const client = supabaseAdmin || supabase;
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
      await client.from('producao_historico').upsert({ id: histId, peca_id: peca.id, etapa_de: etapa === 'corte' ? 'aguardando' : etapa, etapa_para: etapaParaMap[etapa] || etapa, funcionario_id: lan.funcionario_id, funcionario_nome: lan.funcionario_nome, data_inicio: lan.data_producao ? new Date(lan.data_producao).toISOString() : new Date().toISOString(), observacoes: lan.observacoes || '' }, { onConflict: 'id' });
      // 3. pecas_producao — usa ID ORIGINAL (campo único por peça no banco)
      const campoFunc = ETAPA_CAMPO_FUNC_MAP[etapa];
      const campoData = ETAPA_CAMPO_DATA_MAP[etapa];
      if (campoFunc) {
        const upd = { [campoFunc]: lan.funcionario_id };
        if (campoData && lan.data_producao) upd[campoData] = new Date(lan.data_producao).toISOString();
        await client.from('pecas_producao').update(upd).eq('id', originalId);
      }
      // 4. materiais_corte (se corte) — usa ID original
      if (etapa === 'corte') await client.from('materiais_corte').update({ funcionario_corte: lan.funcionario_id }).eq('peca_id', originalId);

      const etapaInfo = ETAPAS_LANCAMENTO.find(e => e.key === etapa);
      toast.success(`${etapaInfo?.label}${conjLabel}: ${lan.funcionario_nome} ✓`);
      refetch?.();
    } catch (err) {
      console.error('[LancamentosObraTab] Erro ao salvar:', err);
      toast.error('Erro ao salvar');
    } finally {
      setSaving(prev => ({ ...prev, [k]: false }));
    }
  }, [lancamentos, funcionariosAtivos, refetch]);

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
                onClick={() => abrirObra(obra.id, obra.nome)}
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

// ─── Página principal ────────────────────────────────────────────────────────────
export default function ProducaoFuncionarioPage() {
  const [filtroSetor, setFiltroSetor] = useState('todos');
  const [filtroEquipe, setFiltroEquipe] = useState('todos');
  const [ordenacao, setOrdenacao] = useState('ranking');
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes'); // 'mes' | 'trimestre' | 'ano' | 'tudo'
  const [funcSelecionado, setFuncSelecionado] = useState(null);
  const [showPendentes, setShowPendentes] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Calcular período com base no filtro
  const periodoFiltro = useMemo(() => {
    const agora = new Date();
    if (filtroPeriodo === 'tudo') return { inicio: '2020-01-01T00:00:00.000Z', fim: new Date(agora.getFullYear() + 1, 0, 1).toISOString() };
    if (filtroPeriodo === 'trimestre') {
      const trimStart = new Date(agora.getFullYear(), Math.floor(agora.getMonth() / 3) * 3, 1);
      return { inicio: trimStart.toISOString(), fim: new Date(trimStart.getFullYear(), trimStart.getMonth() + 3, 0, 23, 59, 59).toISOString() };
    }
    if (filtroPeriodo === 'ano') {
      return { inicio: new Date(agora.getFullYear(), 0, 1).toISOString(), fim: new Date(agora.getFullYear(), 11, 31, 23, 59, 59).toISOString() };
    }
    // mes (default)
    return { inicio: new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString(), fim: new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59).toISOString() };
  }, [filtroPeriodo]);

  const {
    loading, error,
    funcionariosComDados, funcionariosSemDados,
    kpis, topPerformers, pecas,
    refetch,
  } = useProducaoAnalytics({ equipeId: filtroEquipe !== 'todos' ? filtroEquipe : undefined, periodo: periodoFiltro });

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
    }
    return lista;
  }, [funcionariosComDados, filtroSetor, ordenacao]);

  // Export handler
  const handleExport = useCallback(() => {
    const data = funcsFiltrados.map(f => ({
      nome: f.nome, cargo: f.cargo, setor: f.setor, equipe: f.equipeNome,
      ranking: f.ranking, tendencia: f.tendencia,
      totalUnidades: f.totais?.unidades || 0,
      totalKg: f.totais?.kg || 0,
      corteUn: f.porEtapa?.corte?.unidades || 0, corteKg: f.porEtapa?.corte?.kg || 0,
      fabUn: f.porEtapa?.fabricacao?.unidades || 0, fabKg: f.porEtapa?.fabricacao?.kg || 0,
      soldaUn: f.porEtapa?.solda?.unidades || 0, soldaKg: f.porEtapa?.solda?.kg || 0,
      pinturaUn: f.porEtapa?.pintura?.unidades || 0, pinturaKg: f.porEtapa?.pintura?.kg || 0,
      eficienciaCorte: calcularEficiencia(f.porEtapa?.corte?.unidades || 0, METAS_PRODUCAO.corte.unidades),
      eficienciaFab: calcularEficiencia(f.porEtapa?.fabricacao?.unidades || 0, METAS_PRODUCAO.fabricacao.unidades),
      eficienciaSolda: calcularEficiencia(f.porEtapa?.solda?.unidades || 0, METAS_PRODUCAO.solda.unidades),
      eficienciaPintura: calcularEficiencia(f.porEtapa?.pintura?.unidades || 0, METAS_PRODUCAO.pintura.unidades),
    }));
    const cols = [
      { header: 'Nome', key: 'nome' }, { header: 'Cargo', key: 'cargo' },
      { header: 'Setor', key: 'setor' }, { header: 'Equipe', key: 'equipe' },
      { header: 'Ranking', key: 'ranking' }, { header: 'Tendência', key: 'tendencia' },
      { header: 'Total Un.', key: 'totalUnidades' }, { header: 'Total KG', key: 'totalKg' },
      { header: 'Corte Un.', key: 'corteUn' }, { header: 'Corte KG', key: 'corteKg' },
      { header: 'Fab Un.', key: 'fabUn' }, { header: 'Fab KG', key: 'fabKg' },
      { header: 'Solda Un.', key: 'soldaUn' }, { header: 'Solda KG', key: 'soldaKg' },
      { header: 'Pintura Un.', key: 'pinturaUn' }, { header: 'Pintura KG', key: 'pinturaKg' },
      { header: 'Efic. Corte %', key: 'eficienciaCorte' },
      { header: 'Efic. Fab %', key: 'eficienciaFab' },
      { header: 'Efic. Solda %', key: 'eficienciaSolda' },
      { header: 'Efic. Pintura %', key: 'eficienciaPintura' },
    ];
    exportToExcel(data, cols, `producao-funcionarios-${new Date().toISOString().split('T')[0]}`);
    toast.success('Relatório exportado com sucesso!');
  }, [funcsFiltrados]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            Análise de Produção
          </h1>
          <p className="text-slate-400 mt-1">Dashboard completo · Gráficos interativos · Metas · Relatórios · Dados reais</p>
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
            </SelectContent>
          </Select>

          <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
            <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="trimestre">Este Trimestre</SelectItem>
              <SelectItem value="ano">Este Ano</SelectItem>
              <SelectItem value="tudo">Todo Período</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={refetch} variant="outline" size="icon" className="border-slate-700 text-slate-400" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>

          <Button onClick={handleExport} className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-10 w-10 text-cyan-400 animate-spin mx-auto" />
            <span className="text-slate-400 mt-3 block">Carregando análise de produção...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="text-red-400">Erro: {error}</span>
            <Button onClick={refetch} size="sm" variant="outline" className="ml-auto border-red-500/30 text-red-400">Tentar novamente</Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      {!loading && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900/60 border border-slate-700/50">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <BarChart3 className="h-4 w-4 mr-2" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="ranking" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
              <Trophy className="h-4 w-4 mr-2" /> Ranking
            </TabsTrigger>
            <TabsTrigger value="funcionarios" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400">
              <Users className="h-4 w-4 mr-2" /> Funcionários
            </TabsTrigger>
            <TabsTrigger value="lancamentos" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <ClipboardList className="h-4 w-4 mr-2" /> Lançamentos por Obra
            </TabsTrigger>
          </TabsList>

          {/* Tab Dashboard */}
          <TabsContent value="dashboard" className="mt-4">
            <DashboardKPIs kpis={kpis} pecas={pecas} />
          </TabsContent>

          {/* Tab Ranking */}
          <TabsContent value="ranking" className="mt-4">
            <TopPerformersSection performers={topPerformers} />
          </TabsContent>

          {/* Tab Funcionários */}
          <TabsContent value="funcionarios" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Lista de Funcionários (3 cols) */}
              <div className="lg:col-span-3 space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-400" />
                  Funcionários com Produção ({funcsFiltrados.length})
                </h2>

                {funcsFiltrados.length === 0 && (
                  <Card className="bg-slate-900/40 border-slate-800/50">
                    <CardContent className="p-8 text-center">
                      <Package className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">Nenhum funcionário com dados no período.</p>
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

                {/* Pendentes */}
                {funcionariosSemDados.length > 0 && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowPendentes(!showPendentes)}
                      className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors w-full text-left"
                    >
                      {showPendentes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <span className="text-sm font-medium">Pendente de Verificação ({funcionariosSemDados.length})</span>
                      <Badge className="bg-amber-500/10 text-amber-500/60 border-amber-500/20 text-[10px]">Sem dados</Badge>
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
                      <Eye className="h-14 w-14 text-slate-600 mx-auto mb-3" />
                      <h3 className="text-base font-semibold text-slate-400">Selecione um funcionário</h3>
                      <p className="text-xs text-slate-600 mt-1">Clique para ver análise detalhada com gráficos, metas e eficiência</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab Lançamentos por Obra */}
          <TabsContent value="lancamentos" className="mt-4">
            <LancamentosObraTab pecasAnalytics={pecas} refetch={refetch} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
