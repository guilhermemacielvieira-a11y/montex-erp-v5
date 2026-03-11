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
    { name: 'Receita Empresa', value: Math.min(fi.metas.receitaEmpresa?.progresso || 0, 100), fill: '#10b981' },
    { name: 'Produção', value: Math.min(fi.metas.producao?.progresso || 0, 100), fill: '#3b82f6' },
    { name: 'Margem', value: Math.min(fi.metas.margem?.progresso || 0, 100), fill: '#f59e0b' },
    { name: 'Red. Custos', value: Math.max(0, 100 + (fi.metas.reducaoCustos?.variacao || 0)), fill: '#8b5cf6' },
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
          <p className="text-slate-400 mt-1">Metas por centro de custo com regra contrato 50/50</p>
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
                        <SelectItem value="receita">Receita Empresa</SelectItem>
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

      {/* KPIs Principais - 6 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <KPICard
          title="Receita Empresa (50%)"
          value={fi.formatCurrency(fi.kpisGerais.receitaEmpresa)}
          subtitle={`Faturamento bruto: ${fi.formatCurrency(fi.kpisGerais.faturamentoBruto)}`}
          icon={DollarSign}
          color="from-emerald-500 to-green-500"
        />
        <KPICard
          title="Material Faturado (50%)"
          value={fi.formatCurrency(fi.kpisGerais.materialFaturadoDireto)}
          subtitle="Faturado direto pelo fornecedor"
          icon={Percent}
          color="from-cyan-500 to-blue-500"
        />
        <KPICard
          title="Custo Produção"
          value={fi.formatCurrency(fi.custoProducaoTotal)}
          subtitle={`R$ ${(fi.custoProducaoPerKg || 0).toFixed(2)}/kg (fábrica)`}
          icon={Factory}
          color="from-rose-500 to-pink-500"
          isNegativeTrendGood={true}
        />
        <KPICard
          title="Custo Montagem"
          value={fi.formatCurrency(fi.metas.custoMontagem?.real || 0)}
          subtitle="Equipe campo + despesas"
          icon={HardHat}
          color="from-blue-500 to-indigo-500"
        />
        <KPICard
          title="Margem Operacional"
          value={fi.formatPercent(fi.margemOperacional)}
          subtitle="Meta: 25%"
          icon={TrendingUp}
          color="from-amber-500 to-orange-500"
          trend={fi.margemOperacional - 25}
          trendLabel="vs meta 25%"
        />
        <KPICard
          title="Produção"
          value={`${(fi.kpisGerais.producaoKg / 1000).toFixed(1)} ton`}
          subtitle={`${(fi.kpisGerais.producaoMensal / 1000).toFixed(1)} ton/mês | ${fi.kpisGerais.totalFuncionarios} func.`}
          icon={Award}
          color="from-violet-500 to-purple-500"
        />
      </div>

      {/* Regra 50/50 Banner */}
      <div className="bg-gradient-to-r from-blue-900/30 to-emerald-900/30 rounded-xl border border-blue-700/20 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Percent className="h-5 w-5 text-blue-400" />
          <span className="text-sm font-semibold text-blue-300">Regra Contrato 50/50</span>
          <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-700">
            {fi.kpisGerais.qtdObrasAtivas || 0} obras ativas = {fi.formatCurrency(fi.kpisGerais.valorTotalContratos || 0)}
          </Badge>
          <span className="text-xs text-slate-400 mx-1">|</span>
          <span className="text-xs text-slate-400">
            50% Material: <span className="text-amber-400 font-semibold">{fi.formatCurrency(fi.kpisGerais.materialFaturadoDireto)}</span>
          </span>
          <span className="text-xs text-slate-400 mx-1">+</span>
          <span className="text-xs text-slate-400">
            50% Receita: <span className="text-emerald-400 font-semibold">{fi.formatCurrency(fi.kpisGerais.receitaEmpresa)}</span>
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
            {/* Evolução Receita Empresa vs Custo */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
                  Receita Empresa (50%) vs Custo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={fi.evolucaoMensal || []}>
                    <defs>
                      <linearGradient id="colorRecMeta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCustoMeta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
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
                    <Area type="monotone" dataKey="receitaEmpresa" stroke="#10b981" strokeWidth={2} fill="url(#colorRecMeta)" name="Receita Empresa (50%)" />
                    <Area type="monotone" dataKey="custo" stroke="#ef4444" strokeWidth={2} fill="url(#colorCustoMeta)" name="Custo Total" />
                  </AreaChart>
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
              titulo="Receita Empresa"
              descricao={fi.metas.receitaEmpresa?.descricao || '50% do contrato'}
              meta={fi.metas.receitaEmpresa?.meta || 0}
              real={fi.metas.receitaEmpresa?.real || 0}
              progresso={fi.metas.receitaEmpresa?.progresso || 0}
              icon={DollarSign}
              cor="emerald"
              formatCurrency={fi.formatCurrency}
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
              descricao="Receita Empresa - Custos"
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
              <CardTitle className="text-white">Dados Mensais (com regra 50/50)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50">
                      <TableHead className="text-slate-400">Mês</TableHead>
                      <TableHead className="text-slate-400 text-right">Receita Bruta</TableHead>
                      <TableHead className="text-slate-400 text-right">Material (50%)</TableHead>
                      <TableHead className="text-slate-400 text-right">Receita Empresa (50%)</TableHead>
                      <TableHead className="text-slate-400 text-right">Custo</TableHead>
                      <TableHead className="text-slate-400 text-right">Margem</TableHead>
                      <TableHead className="text-slate-400 text-right">Custo/kg</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(fi.evolucaoMensal || []).map((mes, idx) => (
                      <TableRow key={idx} className="border-slate-700/50 hover:bg-slate-800/30">
                        <TableCell className="text-slate-300">{mes.mesLabel}</TableCell>
                        <TableCell className="text-right text-white font-semibold">{fi.formatCurrency(mes.receita)}</TableCell>
                        <TableCell className="text-right text-amber-400">{fi.formatCurrency(mes.materialFaturado)}</TableCell>
                        <TableCell className="text-right text-emerald-400 font-semibold">{fi.formatCurrency(mes.receitaEmpresa)}</TableCell>
                        <TableCell className="text-right text-red-400 font-semibold">{fi.formatCurrency(mes.custo)}</TableCell>
                        <TableCell className={cn("text-right font-semibold", mes.margem >= 0 ? "text-emerald-400" : "text-red-400")}>{fi.formatPercent(mes.margem)}</TableCell>
                        <TableCell className="text-right text-slate-300">R$ {(mes.custoPerKg || 0).toFixed(2)}</TableCell>
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
                Comparação: Receita Empresa vs Custo
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
                  <Bar dataKey="receitaEmpresa" fill="#10b981" name="Receita Empresa (50%)" radius={[8, 8, 0, 0]} />
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
                  <Area type="monotone" dataKey="receitaEmpresa" stroke="#10b981" strokeWidth={2} fill="url(#colorTendencia)" name="Receita Empresa" />
                  <Line type="monotone" dataKey="custo" stroke="#ef4444" strokeWidth={2} name="Custo Real" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="receitaProjetada" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Receita Projetada" dot={false} />
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
