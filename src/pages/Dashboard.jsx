import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Building2,
  Calculator,
  FileSearch,
  MessageSquare,
  FileText,
  Wrench,
  TrendingUp,
  DollarSign,
  Weight,
  Sparkles,
  ArrowRight,
  BarChart3,
  Zap,
  Activity
} from 'lucide-react';
import ModernStatCard from '@/components/dashboard/ModernStatCard';
import Chart3DProduction from '@/components/dashboard/Chart3DProduction';
import ModernProjectCard from '@/components/dashboard/ModernProjectCard';
import CostPredictiveAnalysis from '@/components/financeiro/CostPredictiveAnalysis';
import ProjetosInsightsIA from '@/components/dashboard/ProjetosInsightsIA';
import NotificacoesProducao from '@/components/producao/NotificacoesProducao';
import AlertasEstoqueBaixo from '@/components/estoque/AlertasEstoqueBaixo';
import DashboardCustomizer, { AVAILABLE_WIDGETS } from '@/components/dashboard/DashboardCustomizer';
import DashboardExporter from '@/components/dashboard/DashboardExporter';
import EnhancedAlertsPanel from '@/components/dashboard/EnhancedAlertsPanel';
import RadialProgressChart from '@/components/dashboard/RadialProgressChart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const moduleCards = [
  {
    title: 'Orçamentos',
    description: 'Gere propostas automáticas com IA',
    icon: Calculator,
    href: 'Orcamentos',
    color: 'from-orange-400 to-orange-600',
    badge: 'IA'
  },
  {
    title: 'Analisador',
    description: 'Analise memoriais e projetos',
    icon: FileSearch,
    href: 'Analisador',
    color: 'from-blue-400 to-blue-600',
    badge: 'IA'
  },
  {
    title: 'Chatbot',
    description: 'Consulte informações da Montex',
    icon: MessageSquare,
    href: 'Chatbot',
    color: 'from-emerald-400 to-emerald-600',
    badge: 'IA'
  },
  {
    title: 'Relatórios',
    description: 'Gere relatórios de progresso',
    icon: FileText,
    href: 'Relatorios',
    color: 'from-purple-400 to-purple-600'
  },
  {
    title: 'Assistente Técnico',
    description: 'Consulte normas e especificações',
    icon: Wrench,
    href: 'AssistenteTecnico',
    color: 'from-rose-400 to-rose-600',
    badge: 'IA'
  },
  {
    title: 'Projetos',
    description: 'Gerencie todos os projetos',
    icon: Building2,
    href: 'Projetos',
    color: 'from-slate-500 to-slate-700'
  }
];

export default function Dashboard() {
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [mostrarAnaliseCustos, setMostrarAnaliseCustos] = useState(false);
  const [mostrarAnaliseProjetos, setMostrarAnaliseProjetos] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [exporterOpen, setExporterOpen] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState({});

  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => base44.entities.Projeto.list('-created_date', 100)
  });

  const { data: orcamentos = [] } = useQuery({
    queryKey: ['orcamentos'],
    queryFn: () => base44.entities.Orcamento.list('-created_date', 100)
  });

  const { data: relatorios = [] } = useQuery({
    queryKey: ['relatorios'],
    queryFn: () => base44.entities.Relatorio.list('-created_date', 100)
  });

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes'],
    queryFn: () => base44.entities.MovimentacaoFinanceira.list('-created_date', 200)
  });

  const { data: itensProducao = [] } = useQuery({
    queryKey: ['itensProducao'],
    queryFn: () => base44.entities.ItemProducao.list('-created_date', 1000)
  });

  const { data: lancamentosProducao = [] } = useQuery({
    queryKey: ['lancamentosProducao'],
    queryFn: () => base44.entities.LancamentoProducao.list('-created_date', 2000)
  });

  const projetosAtivos = projetos.filter(p => 
    ['em_fabricacao', 'em_montagem', 'aprovado'].includes(p.status)
  ).length;

  const pesoFabricacao = lancamentosProducao
    .reduce((acc, lanc) => acc + (lanc.peso_realizado || 0), 0);

  const pesoTotalFabricacao = itensProducao
    .filter(item => item.etapa === 'fabricacao')
    .reduce((acc, item) => acc + ((item.peso_unitario || 0) * (item.quantidade || 0)), 0);

  const valorTotal = projetos
    .filter(p => p.valor_contrato)
    .reduce((acc, p) => acc + (p.valor_contrato || 0), 0);

  const orcamentosAbertos = orcamentos.filter(o => 
    ['rascunho', 'enviado', 'em_negociacao'].includes(o.status)
  ).length;

  const calcularProgressoMedio = () => {
    const projetosComRelatorio = projetos.filter(p => {
      const rel = relatorios.find(r => r.projeto_id === p.id);
      return rel && ['aprovado', 'em_fabricacao', 'em_montagem'].includes(p.status);
    });
    
    if (projetosComRelatorio.length === 0) return 0;
    
    const somaProgresso = projetosComRelatorio.reduce((acc, p) => {
      const rel = relatorios
        .filter(r => r.projeto_id === p.id)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      return acc + ((rel.percentual_fabricacao || 0) + (rel.percentual_montagem || 0)) / 2;
    }, 0);
    
    return projetosComRelatorio.length > 0 ? somaProgresso / projetosComRelatorio.length : 0;
  };

  const progressoMedio = calcularProgressoMedio();

  const projetosFiltrados = filtroStatus === 'todos' 
    ? projetos.filter(p => ['aprovado', 'em_fabricacao', 'em_montagem'].includes(p.status))
    : projetos.filter(p => p.status === filtroStatus);

  // Load widget preferences on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('dashboardWidgets');
    if (saved) {
      setVisibleWidgets(JSON.parse(saved));
    } else {
      const defaults = {};
      AVAILABLE_WIDGETS.forEach(w => {
        defaults[w.id] = w.default;
      });
      setVisibleWidgets(defaults);
    }
  }, []);

  const handleWidgetsSave = (widgets) => {
    setVisibleWidgets(widgets);
  };

  const dashboardData = {
    stats: {
      projetosAtivos,
      pesoFabricacao,
      progressoMedio,
      valorTotal,
    },
    projects: projetosFiltrados,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 space-y-8 p-8">
        {/* Breadcrumbs */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Breadcrumbs items={[{ label: 'Dashboard' }]} />
        </motion.div>

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
              Dashboard de Projetos
            </h1>
            <p className="text-slate-400 text-lg">Visão consolidada em tempo real</p>
          </div>
          <div className="flex gap-3">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white backdrop-blur-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Ativos</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="em_fabricacao">Fabricação</SelectItem>
                <SelectItem value="em_montagem">Montagem</SelectItem>
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => setCustomizerOpen(true)}
                  className="gap-2 bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700/50 backdrop-blur-sm"
                >
                  <Wrench className="h-4 w-4" />
                  Personalizar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Escolha quais widgets exibir no dashboard
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => setExporterOpen(true)}
                  className="gap-2 bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700/50 backdrop-blur-sm"
                >
                  Exportar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Exporte os dados em PDF ou CSV
              </TooltipContent>
            </Tooltip>
            <Link to={createPageUrl('Orcamentos')}>
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/50">
                <Sparkles className="h-4 w-4 mr-2" />
                Novo Orçamento
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats - Modern Cards */}
        {visibleWidgets.stats !== false && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ModernStatCard
                  title="Projetos Ativos"
                  value={projetosAtivos}
                  subtitle="Em andamento"
                  icon={Building2}
                  gradient="from-blue-500 to-cyan-500"
                  delay={0}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Total de projetos aprovados, em fabricação ou montagem
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ModernStatCard
                  title="Peso Fabricado"
                  value={`${pesoFabricacao.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} kg`}
                  subtitle={`de ${pesoTotalFabricacao.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} kg`}
                  icon={Weight}
                  gradient="from-emerald-500 to-teal-500"
                  delay={0.1}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Peso total já fabricado vs peso estimado total
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ModernStatCard
                  title="Progresso Médio"
                  value={`${progressoMedio.toFixed(1)}%`}
                  subtitle="Todos os projetos"
                  icon={TrendingUp}
                  gradient="from-purple-500 to-pink-500"
                  delay={0.2}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Média ponderada de progresso de fabricação e montagem
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <ModernStatCard
                  title="Valor Contratado"
                  value={`R$ ${(valorTotal / 1000000).toFixed(2)}M`}
                  subtitle="Total de contratos"
                  icon={DollarSign}
                  gradient="from-orange-500 to-red-500"
                  delay={0.3}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Soma de todos os valores contratuais dos projetos
            </TooltipContent>
          </Tooltip>
        </motion.div>
        )}

        {/* Análise Inteligente de Projetos */}
        {visibleWidgets.projectsInsights !== false && (mostrarAnaliseProjetos ? (
          <ProjetosInsightsIA 
            projetos={projetos}
            orcamentos={orcamentos}
            movimentacoes={movimentacoes}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-sm border">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/50">
                      <Sparkles className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg">Análise Inteligente de Projetos com IA</h3>
                      <p className="text-sm text-slate-300">
                        Descubra quais projetos são mais lucrativos, regiões com maior demanda e prazos mais eficientes
                      </p>
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setMostrarAnaliseProjetos(true)}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-500/50"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analisar Projetos
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Use IA para identificar padrões de rentabilidade, localização e prazos
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* Análise de Custos */}
        {visibleWidgets.costAnalysis !== false && (
          mostrarAnaliseCustos ? (
            <div>
              <CostPredictiveAnalysis
                projetos={projetos}
                orcamentos={orcamentos}
                relatorios={relatorios}
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-blue-500/20 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-sm border">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/50">
                        <DollarSign className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-lg">Análise Preditiva de Custos com IA</h3>
                        <p className="text-sm text-slate-300">
                          Preveja desvios de orçamento, identifique fatores de impacto e receba sugestões de otimização
                        </p>
                      </div>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setMostrarAnaliseCustos(true)}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/50"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analisar Custos
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Preveja desvios de orçamento e receba sugestões de otimização com IA
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects Overview */}
          <div className="lg:col-span-2 space-y-6">
            {visibleWidgets.progressChart !== false && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Chart3DProduction projetos={projetos} itensProducao={itensProducao} />
              </motion.div>
            )}

            {visibleWidgets.projects !== false && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl text-white flex items-center gap-2">
                      <Zap className="h-5 w-5 text-orange-500" />
                      Projetos em Andamento
                    </CardTitle>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                      {projetosFiltrados.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projetosFiltrados.slice(0, 6).map((projeto, idx) => (
                      <motion.div
                        key={projeto.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * idx }}
                      >
                        <ModernProjectCard
                          projeto={projeto}
                          relatorios={relatorios}
                          orcamentos={orcamentos}
                        />
                      </motion.div>
                    ))}
                  </div>
                  {projetosFiltrados.length === 0 && (
                    <div className="text-center py-12">
                      <Building2 className="h-16 w-16 mx-auto text-slate-600 mb-4" />
                      <p className="text-slate-400">Nenhum projeto encontrado</p>
                    </div>
                  )}
                  {projetosFiltrados.length > 6 && (
                    <div className="mt-6 text-center">
                      <Link to={createPageUrl('Projetos')}>
                        <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
                          Ver Todos os Projetos
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
            )}
          </div>

          {/* Right Panel */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            {visibleWidgets.quickStats !== false && (
              <RadialProgressChart 
                progressoMedio={progressoMedio}
                projetosAtivos={projetosAtivos}
                orcamentosAbertos={orcamentosAbertos}
              />
            )}

            {visibleWidgets.notifications !== false && (
              <div className="bg-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
                <NotificacoesProducao />
              </div>
            )}
            
            {visibleWidgets.stockAlerts !== false && (
              <div className="bg-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
                <AlertasEstoqueBaixo />
              </div>
            )}

            {visibleWidgets.alerts !== false && (
              <div className="bg-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
                <EnhancedAlertsPanel 
                  projetos={projetos} 
                  relatorios={relatorios}
                />
              </div>
            )}
          </motion.div>
        </div>

            {/* Dialogs */}
            <DashboardCustomizer
            open={customizerOpen}
            onOpenChange={setCustomizerOpen}
            onSave={handleWidgetsSave}
            />
            <DashboardExporter
            open={exporterOpen}
            onOpenChange={setExporterOpen}
            dashboardData={dashboardData}
            />

        {/* Modules Grid */}
        <motion.div 
          className="relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-orange-500" />
            </div>
            Módulos do Sistema
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {moduleCards.map((module, idx) => (
              <motion.div
                key={module.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + idx * 0.05 }}
              >
                <Link to={createPageUrl(module.href)}>
                  <Card className="group hover:scale-105 transition-all duration-300 cursor-pointer border-slate-700/50 bg-slate-900/40 backdrop-blur-sm hover:border-orange-500/50 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6 relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all`}>
                          <module.icon className="h-8 w-8 text-white" />
                        </div>
                        {module.badge && (
                          <Badge className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/30">
                            {module.badge}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">
                        {module.title}
                      </h3>
                      <p className="text-slate-400 text-sm mb-4">{module.description}</p>
                      <div className="flex items-center text-orange-500 text-sm font-semibold">
                        <span>Acessar</span>
                        <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-2 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Dialogs */}
        <DashboardCustomizer
          open={customizerOpen}
          onOpenChange={setCustomizerOpen}
          onSave={handleWidgetsSave}
        />
        <DashboardExporter
          open={exporterOpen}
          onOpenChange={setExporterOpen}
          dashboardData={dashboardData}
        />
      </div>
    </div>
  );
}