// MONTEX ERP Premium - Módulo de Metas Financeiras v3
// Reestruturado com regra 50/50, centros separados, dados RH integrados

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Target,
  DollarSign,
  Calendar,
  Plus,
  BarChart3,
  PieChart,
  Award,
  Flag,
  Zap,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Factory,
  HardHat,
  Users,
  Percent,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
  ComposedChart
} from 'recharts';
import { useFinancialIntelligence } from '@/hooks/useFinancialIntelligence';

// Componente de KPI
function KPICard({ title, value, subtitle, icon: Icon, color, trend, trendLabel, isNegativeTrendGood = false }) {
  const trendColor = isNegativeTrendGood
    ? (trend >= 0 ? "text-red-400" : "text-emerald-400")
    : (trend >= 0 ? "text-emerald-400" : "text-red-400");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br", color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
          {(isNegativeTrendGood ? trend < 0 : trend >= 0) ? (
            <TrendingUp className={cn("h-4 w-4", trendColor)} />
          ) : (
            <TrendingDown className={cn("h-4 w-4", trendColor)} />
          )}
          <span className={cn("text-sm font-medium", trendColor)}>
            {trend >= 0 ? '+' : ''}{typeof trend === 'number' ? trend.toFixed(1) : trend}%
          </span>
          <span className="text-xs text-slate-500">{trendLabel || 'vs meta'}</span>
        </div>
      )}
    </motion.div>
  );
}

// Componente de Card de Meta com Progress
function MetaProgressCard({ titulo, descricao, meta, real, progresso, icon: Icon, cor, formatCurrency, isPercent = false, isNegativeTrendGood = false }) {
  const percentual = Math.min(progresso, 150);
  const statusColor = progresso >= 100 ? 'from-emerald-500 to-green-500' :
                       progresso >= 75 ? 'from-blue-500 to-cyan-500' :
                       progresso >= 50 ? 'from-amber-500 to-orange-500' :
                       'from-red-500 to-rose-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br", statusColor)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">{titulo}</h3>
            <p className="text-xs text-slate-500">{descricao}</p>
          </div>
        </div>
        <Badge className={cn("text-xs",
          progresso >= 100 ? "bg-emerald-500/20 text-emerald-400" :
          progresso >= 75 ? "bg-blue-500/20 text-blue-400" :
          progresso >= 50 ? "bg-amber-500/20 text-amber-400" :
          "bg-red-500/20 text-red-400"
        )}>
          {progresso.toFixed(0)}%
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(percentual, 100)}%` }}
            transition={{ duration: 1 }}
            className={cn("h-full rounded-full bg-gradient-to-r", statusColor)}
          />
        </div>
      </div>

      <div className="flex justify-between text-sm">
        <div>
          <p className="text-xs text-slate-500">Real</p>
          <p className="font-bold text-white">
            {isPercent ? `${(real || 0).toFixed(1)}%` : formatCurrency(real || 0)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Meta</p>
          <p className="font-semibold text-slate-400">
            {isPercent ? `${(meta || 0).toFixed(1)}%` : formatCurrency(meta || 0)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Card de Estágio
function EstagioCard({ etapa, formatCurrency }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white">{etapa.nome}</h3>
          <p className="text-sm text-slate-400 mt-1">R$ {etapa.taxa}/kg</p>
        </div>
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          {etapa.pecas} peças
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500">Produção</p>
          <p className="text-lg font-semibold text-white">{(etapa.producaoKg / 1000).toFixed(1)} ton</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Valor Gerado</p>
          <p className="text-lg font-bold text-emerald-400">{formatCurrency(etapa.valorGerado)}</p>
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-slate-700/50">
        <p className="text-xs text-slate-500">Custo Estimado/KG</p>
        <p className="text-sm font-semibold text-amber-400">R$ {(etapa.custoEstimadoKg || 0).toFixed(2)}</p>
      </div>
    </motion.div>
  );
}

export default function MetasFinanceirasPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const fi = useFinancialIntelligence();

  // Dados para radial chart
  const radialData = useMemo(() => [
    { name: 'Prod. Fábrica (KG)', value: Math.min(fi.metas.producaoFabricaKg?.progresso || 0, 100), fill: '#10b981' },
    { name: 'Prod. Fábrica (R$)', value: Math.min(fi.metas.producaoFabricaValor?.progresso || 0, 100), fill: '#059669' },
    { name: 'Montagem (KG)', value: Math.min(fi.metas.montagemCampoKg?.progresso || 0, 100), fill: '#3b82f6' },
    { name: 'Montagem (R$)', value: Math.min(fi.metas.montagemCampoValor?.progresso || 0, 100), fill: '#2563eb' },
    { name: 'Margem', value: Math.min(fi.metas.margem?.progresso || 0, 100), fill: '#f59e0b' },
  ], [fi.metas]);

  // Tendências com forecast
  const tendenciasData = useMemo(() => [
    ...(fi.evolucaoMensal || []),
    ...(fi.forecast3meses || []).map(f => ({ ...f, mesLabel: f.mes, forecast: true }))
  ], [fi.evolucaoMensal, fi.forecast3meses]);

  // Dados centros para comparação
  const centrosData = useMemo(() =>
    (fi.custosPorCentro || []).map(c => ({
      nome: c.nome.replace('(Fábrica)', '').replace('(Esquadrias)', '').trim(),
      despesas: c.gasto,
      rh: c.gastoRH,
      orcamento: c.orcamento,
      utilizacao: c.utilizacao
    })),
  [fi.custosPorCentro]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Target className="h-6 w-6 text-white" />
            </div>
            Metas Financeiras
          </h1>
          <p className="text-slate-400 mt-1">Análise de custos, metas de produção e rentabilidade</p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                <Plus className="h-4 w-4 mr-2" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Criar Nova Meta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label className="text-slate-300">Título da Meta</Label>
                  <Input className="mt-1 bg-slate-800 border-slate-700" placeholder="Ex: Redução custo montagem" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Tipo</Label>
                    <Select>
                      <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="producao_fabrica">Produção Fábrica</SelectItem>
                        <SelectItem value="custo_producao">Custo Produção</SelectItem>
                        <SelectItem value="custo_montagem">Custo Montagem</SelectItem>
                        <SelectItem value="producao">Produção</SelectItem>
                        <SelectItem value="margem">Margem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Prioridade</Label>
                    <Select>
                      <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Valor da Meta</Label>
                    <Input className="mt-1 bg-slate-800 border-slate-700" type="number" placeholder="500000" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Data Limite</Label>
                    <Input className="mt-1 bg-slate-800 border-slate-700" type="date" />
                  </div>
                </div>
                <Button onClick={() => { toast.success('Meta criada!'); setDialogOpen(false); }}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500">
                  Criar Meta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPIs Principais - 6 cards (TUDO MENSAL) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <KPICard
          title="Fat. Produção /mês"
          value={fi.formatCurrency(fi.kpisGerais.faturamentoProducaoMes)}
          subtitle={`${(fi.kpisGerais.producaoMensalKg / 1000).toFixed(1)} ton × R$ 8,50/kg`}
          icon={Factory}
          color="from-emerald-500 to-green-500"
          trend={fi.kpisGerais.percentFatProducaoVsMeta - 100}
          trendLabel={`vs meta ${fi.formatCurrency(fi.kpisGerais.metaFaturamentoProducao)}`}
        />
        <KPICard
          title="Fat. Montagem /mês"
          value={fi.formatCurrency(fi.kpisGerais.faturamentoMontagemMes)}
          subtitle={`${(fi.kpisGerais.montagemMensalKg / 1000).toFixed(1)} ton × R$ 4,00/kg`}
          icon={HardHat}
          color="from-blue-500 to-cyan-500"
          trend={fi.kpisGerais.percentFatMontagemVsMeta - 100}
          trendLabel={`vs meta ${fi.formatCurrency(fi.kpisGerais.metaFaturamentoMontagem)}`}
        />
        <KPICard
          title="Despesa Média /mês"
          value={fi.formatCurrency(fi.kpisGerais.despesaMensalMedia)}
          subtitle={`Últ. ${fi.kpisGerais.mesesBaseCalculo || 0} meses: ${fi.kpisGerais.mesesBaseNomes?.join(', ') || '—'}`}
          icon={DollarSign}
          color="from-rose-500 to-pink-500"
          isNegativeTrendGood={true}
        />
        <KPICard
          title="Produção Mensal"
          value={`${(fi.kpisGerais.producaoMensalKg / 1000).toFixed(1)} ton`}
          subtitle={`Meta: 70 ton/mês (R$ 8,50/kg)`}
          icon={Award}
          color="from-violet-500 to-purple-500"
          trend={fi.kpisGerais.percentProducaoVsMeta - 100}
          trendLabel="vs meta 70 ton"
        />
        <KPICard
          title="Saldo Mensal"
          value={fi.formatCurrency(fi.kpisGerais.saldo)}
          subtitle="Faturamento - Desp. Média"
          icon={TrendingUp}
          color={fi.kpisGerais.saldo >= 0 ? "from-emerald-500 to-green-500" : "from-red-500 to-rose-500"}
        />
        <KPICard
          title="Margem Operacional"
          value={fi.formatPercent(fi.margemOperacional)}
          subtitle="Meta: 25%"
          icon={Target}
          color="from-amber-500 to-orange-500"
          trend={fi.margemOperacional - 25}
          trendLabel="vs meta 25%"
        />
      </div>

      {/* Banner Produção × Despesa (desmembrado) */}
      <div className="bg-gradient-to-r from-blue-900/30 to-emerald-900/30 rounded-xl border border-blue-700/20 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Factory className="h-5 w-5 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-300">Análise Independente</span>
          <span className="text-xs text-slate-400 mx-1">|</span>
          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-700">
            Fábrica: 70t × R$ 8,50 = {fi.formatCurrency(fi.kpisGerais.metaFaturamentoProducao)}/mês
          </Badge>
          <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-700">
            Montagem: 25t × R$ 4,00 = {fi.formatCurrency(fi.kpisGerais.metaFaturamentoMontagem)}/mês
          </Badge>
          <span className="text-xs text-slate-400 mx-1">|</span>
          <span className="text-xs text-slate-400">
            Meta Total: <span className="text-amber-400 font-semibold">{fi.formatCurrency(fi.kpisGerais.faturamentoMetaMensal)}/mês</span>
          </span>
          <span className="text-xs text-slate-400 mx-1">|</span>
          <span className="text-xs text-slate-400">
            Despesa Média: <span className="text-red-400 font-semibold">{fi.formatCurrency(fi.kpisGerais.despesaMensalMedia)}/mês</span>
            <span className="text-slate-500 ml-1">({fi.kpisGerais.mesesBaseNomes?.join(', ') || '—'})</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="visao-geral" className="space-y-4">
        <TabsList className="bg-slate-900/60 border border-slate-700/50">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="metas">Metas por Centro</TabsTrigger>
          <TabsTrigger value="analise-mensal">Análise Mensal</TabsTrigger>
          <TabsTrigger value="por-estagio">Por Estágio</TabsTrigger>
          <TabsTrigger value="tendencias">Tendências</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Faturamento Produção vs Despesa Mensal */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
                  Faturamento vs Despesa (mensal)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={fi.evolucaoMensal || []}>
                    <defs>
                      <linearGradient id="colorRecMeta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="mesLabel" stroke="#64748b" />
                    <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(value) => fi.formatCurrency(value)}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    <Area type="monotone" dataKey="faturamentoProducao" stroke="#10b981" strokeWidth={2} fill="url(#colorRecMeta)" name="Fat. Produção (R$8,50)" />
                    <Line type="monotone" dataKey="faturamentoMeta" stroke="#f59e0b" strokeWidth={1} strokeDasharray="5 5" name="Meta Total (R$695k)" dot={false} />
                    <Bar dataKey="custo" fill="#ef4444" fillOpacity={0.7} name="Despesa Real" radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Radial de Progresso */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-blue-400" />
                  Progresso de Metas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialData} startAngle={180} endAngle={0}>
                    <RadialBar minAngle={15} background={{ fill: '#1e293b' }} clockWise dataKey="value" cornerRadius={5} />
                    <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" wrapperStyle={{ color: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(value) => `${value.toFixed(1)}%`}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Custos por Centro - BarChart */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-violet-400" />
                Custos por Centro (Despesas + RH vs Orçamento)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {centrosData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={centrosData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="nome" stroke="#64748b" />
                    <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(value, name) => [fi.formatCurrency(value), name === 'despesas' ? 'Despesas' : name === 'rh' ? 'RH' : 'Orçamento']}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    <Bar dataKey="despesas" name="Despesas" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="rh" name="RH" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="orcamento" name="Orçamento" fill="#334155" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-slate-500">Sem dados</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metas por Centro */}
        <TabsContent value="metas" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetaProgressCard
              titulo="Produção Fábrica (KG)"
              descricao={fi.metas.producaoFabricaKg?.descricao || 'Meta: 70 ton/mês'}
              meta={fi.metas.producaoFabricaKg?.meta || 0}
              real={fi.metas.producaoFabricaKg?.real || 0}
              progresso={fi.metas.producaoFabricaKg?.progresso || 0}
              icon={Factory}
              cor="emerald"
              formatCurrency={(v) => `${(v / 1000).toFixed(1)} ton`}
            />
            <MetaProgressCard
              titulo="Produção Fábrica (R$)"
              descricao={fi.metas.producaoFabricaValor?.descricao || '70t × R$8,50'}
              meta={fi.metas.producaoFabricaValor?.meta || 0}
              real={fi.metas.producaoFabricaValor?.real || 0}
              progresso={fi.metas.producaoFabricaValor?.progresso || 0}
              icon={DollarSign}
              cor="emerald"
              formatCurrency={fi.formatCurrency}
            />
            <MetaProgressCard
              titulo="Montagem Campo (KG)"
              descricao={fi.metas.montagemCampoKg?.descricao || 'Meta: 25 ton/mês'}
              meta={fi.metas.montagemCampoKg?.meta || 0}
              real={fi.metas.montagemCampoKg?.real || 0}
              progresso={fi.metas.montagemCampoKg?.progresso || 0}
              icon={HardHat}
              cor="blue"
              formatCurrency={(v) => `${(v / 1000).toFixed(1)} ton`}
            />
            <MetaProgressCard
              titulo="Montagem Campo (R$)"
              descricao={fi.metas.montagemCampoValor?.descricao || '25t × R$4,00'}
              meta={fi.metas.montagemCampoValor?.meta || 0}
              real={fi.metas.montagemCampoValor?.real || 0}
              progresso={fi.metas.montagemCampoValor?.progresso || 0}
              icon={DollarSign}
              cor="blue"
              formatCurrency={fi.formatCurrency}
            />
            <MetaProgressCard
              titulo="Despesa Média Mensal"
              descricao={fi.metas.despesaMedia?.descricao || 'Últimos 3 meses completos'}
              meta={fi.metas.despesaMedia?.meta || 0}
              real={fi.metas.despesaMedia?.real || 0}
              progresso={fi.metas.despesaMedia?.progresso || 0}
              icon={TrendingDown}
              cor="rose"
              formatCurrency={fi.formatCurrency}
              isNegativeTrendGood={true}
            />
            <MetaProgressCard
              titulo="Custo Produção (Fábrica)"
              descricao={fi.metas.custoProducao?.descricao || 'Sem alumínio/montagem'}
              meta={fi.metas.custoProducao?.meta || 0}
              real={fi.metas.custoProducao?.real || 0}
              progresso={fi.metas.custoProducao?.progresso || 0}
              icon={Factory}
              cor="rose"
              formatCurrency={fi.formatCurrency}
              isNegativeTrendGood={true}
            />
            <MetaProgressCard
              titulo="Custo Montagem Campo"
              descricao={fi.metas.custoMontagem?.descricao || 'Equipe + despesas campo'}
              meta={fi.metas.custoMontagem?.meta || 0}
              real={fi.metas.custoMontagem?.real || 0}
              progresso={fi.metas.custoMontagem?.progresso || 0}
              icon={HardHat}
              cor="blue"
              formatCurrency={fi.formatCurrency}
              isNegativeTrendGood={true}
            />
            <MetaProgressCard
              titulo="Produção Mensal"
              descricao="KG produzidos vs meta"
              meta={fi.metas.producao?.meta || 0}
              real={fi.metas.producao?.real || 0}
              progresso={fi.metas.producao?.progresso || 0}
              icon={Award}
              cor="violet"
              formatCurrency={(v) => `${(v / 1000).toFixed(1)} ton`}
            />
            <MetaProgressCard
              titulo="Margem Operacional"
              descricao="Faturamento Produção - Custos"
              meta={fi.metas.margem?.meta || 25}
              real={fi.metas.margem?.real || 0}
              progresso={fi.metas.margem?.progresso || 0}
              icon={TrendingUp}
              cor="amber"
              formatCurrency={fi.formatCurrency}
              isPercent={true}
            />
            <MetaProgressCard
              titulo="Redução de Custos"
              descricao={`Meta: ${fi.metas.reducaoCustos?.meta || -5}% vs média`}
              meta={fi.metas.reducaoCustos?.mediaHistorica || 0}
              real={fi.metas.reducaoCustos?.real || 0}
              progresso={fi.metas.reducaoCustos?.variacao ? Math.max(0, 100 + fi.metas.reducaoCustos.variacao) : 0}
              icon={TrendingDown}
              cor="purple"
              formatCurrency={fi.formatCurrency}
              isNegativeTrendGood={true}
            />
          </div>

          {/* RH Summary por Centro */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-400" />
                Custo RH por Centro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50">
                    <TableHead className="text-slate-400">Centro</TableHead>
                    <TableHead className="text-slate-400 text-center">Funcionários</TableHead>
                    <TableHead className="text-slate-400 text-right">Custo RH</TableHead>
                    <TableHead className="text-slate-400 text-right">Despesas</TableHead>
                    <TableHead className="text-slate-400 text-right">Total</TableHead>
                    <TableHead className="text-slate-400 text-right">Orçamento</TableHead>
                    <TableHead className="text-slate-400 text-center">Utilização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(fi.custosPorCentro || []).map(c => (
                    <TableRow key={c.id} className="border-slate-700/50 hover:bg-slate-800/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.cor }} />
                          <span className="text-white font-medium text-sm">{c.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-slate-300">{c.qtdFuncionarios}</TableCell>
                      <TableCell className="text-right text-violet-400 font-semibold">{fi.formatCurrency(c.gastoRH)}</TableCell>
                      <TableCell className="text-right text-blue-400">{fi.formatCurrency(c.gasto)}</TableCell>
                      <TableCell className="text-right text-rose-400 font-bold">{fi.formatCurrency(c.gastoTotal)}</TableCell>
                      <TableCell className="text-right text-slate-400">{fi.formatCurrency(c.orcamento)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-xs",
                          c.utilizacao > 100 ? "bg-red-500/20 text-red-400" :
                          c.utilizacao > 90 ? "bg-amber-500/20 text-amber-400" :
                          "bg-emerald-500/20 text-emerald-400"
                        )}>
                          {c.utilizacao.toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Análise Mensal */}
        <TabsContent value="analise-mensal" className="space-y-6">
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Dados Mensais (Análise Independente)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50">
                      <TableHead className="text-slate-400">Mês</TableHead>
                      <TableHead className="text-slate-400 text-right">Fat. Prod. (R$8,50)</TableHead>
                      <TableHead className="text-slate-400 text-right">Fat. Mont. (R$4,00)</TableHead>
                      <TableHead className="text-slate-400 text-right">Despesa</TableHead>
                      <TableHead className="text-slate-400 text-right">Margem</TableHead>
                      <TableHead className="text-slate-400 text-right">Custo/kg</TableHead>
                      <TableHead className="text-slate-400 text-right">Produção</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(fi.evolucaoMensal || []).map((mes, idx) => (
                      <TableRow key={idx} className="border-slate-700/50 hover:bg-slate-800/30">
                        <TableCell className="text-slate-300">{mes.mesLabel}</TableCell>
                        <TableCell className="text-right text-emerald-400 font-semibold">{fi.formatCurrency(mes.faturamentoProducao)}</TableCell>
                        <TableCell className="text-right text-blue-400">{fi.formatCurrency(mes.faturamentoMontagem)}</TableCell>
                        <TableCell className="text-right text-red-400 font-semibold">{fi.formatCurrency(mes.custo)}</TableCell>
                        <TableCell className={cn("text-right font-semibold", mes.margem >= 0 ? "text-emerald-400" : "text-red-400")}>{fi.formatPercent(mes.margem)}</TableCell>
                        <TableCell className="text-right text-slate-300">R$ {(mes.custoPerKg || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-cyan-400">{((mes.producaoKg || 0) / 1000).toFixed(1)} ton</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-400" />
                Faturamento Produção vs Custo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={fi.evolucaoMensal || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mesLabel" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value) => fi.formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Bar dataKey="faturamentoProducao" fill="#10b981" name="Faturamento Produção" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="custo" fill="#ef4444" name="Custo" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Estágio */}
        <TabsContent value="por-estagio" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(fi.etapasAnalise || []).map((etapa, idx) => (
              <EstagioCard key={idx} etapa={etapa} formatCurrency={fi.formatCurrency} />
            ))}
          </div>
        </TabsContent>

        {/* Tendências */}
        <TabsContent value="tendencias" className="space-y-6">
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-400" />
                Evolução + Previsão 3 meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={tendenciasData}>
                  <defs>
                    <linearGradient id="colorTendencia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mesLabel" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value) => fi.formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Area type="monotone" dataKey="faturamentoProducao" stroke="#10b981" strokeWidth={2} fill="url(#colorTendencia)" name="Fat. Produção (R$8,50)" />
                  <Area type="monotone" dataKey="faturamentoMontagem" stroke="#3b82f6" strokeWidth={1} fill="none" name="Fat. Montagem (R$4,00)" />
                  <Line type="monotone" dataKey="custo" stroke="#ef4444" strokeWidth={2} name="Despesa Real" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="faturamentoProjetado" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Fat. Projetado" dot={false} />
                  <Line type="monotone" dataKey="custoProjetado" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" name="Custo Projetado" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
