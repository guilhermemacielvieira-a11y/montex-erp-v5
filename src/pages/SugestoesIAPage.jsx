// MONTEX ERP Premium - Módulo de Sugestões IA
// Recomendações inteligentes baseadas em análise de dados

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Wrench,
  Users,
  Package,
  Zap,
  Target,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Mock Data - Sugestões da IA
const mockSugestoes = [
  {
    id: 1,
    tipo: 'otimizacao',
    categoria: 'producao',
    titulo: 'Reorganizar sequência de corte',
    descricao: 'Identificamos que reorganizando a sequência de corte das chapas podemos reduzir o desperdício de material em aproximadamente 12%.',
    impacto: 'alto',
    economiaEstimada: 15000,
    tempoImplementacao: '2 semanas',
    confianca: 94,
    baseadoEm: ['Histórico de corte dos últimos 6 meses', 'Padrões de desperdício identificados', 'Análise de layout atual'],
    status: 'nova',
    dataCriacao: '2026-02-03'
  },
  {
    id: 2,
    tipo: 'alerta',
    categoria: 'manutencao',
    titulo: 'Manutenção preventiva necessária',
    descricao: 'A máquina CNC-02 apresenta padrões de vibração 23% acima do normal. Recomendamos manutenção preventiva para evitar parada não programada.',
    impacto: 'critico',
    economiaEstimada: 45000,
    tempoImplementacao: '1-2 dias',
    confianca: 89,
    baseadoEm: ['Sensores de vibração', 'Histórico de falhas similares', 'Tempo desde última manutenção'],
    status: 'nova',
    dataCriacao: '2026-02-03'
  },
  {
    id: 3,
    tipo: 'oportunidade',
    categoria: 'financeiro',
    titulo: 'Renegociação com fornecedor de aço',
    descricao: 'Com base no volume de compras dos últimos 12 meses, você tem poder de barganha para negociar desconto de 5-8% com seu principal fornecedor de aço.',
    impacto: 'medio',
    economiaEstimada: 28000,
    tempoImplementacao: '1 mês',
    confianca: 82,
    baseadoEm: ['Volume de compras anual', 'Preços de mercado', 'Histórico de negociações'],
    status: 'analisando',
    dataCriacao: '2026-02-02'
  },
  {
    id: 4,
    tipo: 'otimizacao',
    categoria: 'equipe',
    titulo: 'Redistribuição de tarefas na Equipe B',
    descricao: 'A Equipe B está com carga de trabalho 18% maior que a Equipe A. Sugerimos redistribuir 2 funcionários para balancear a produtividade.',
    impacto: 'medio',
    economiaEstimada: 8000,
    tempoImplementacao: '1 semana',
    confianca: 91,
    baseadoEm: ['Métricas de produção por equipe', 'Horas extras registradas', 'Eficiência comparativa'],
    status: 'implementada',
    dataCriacao: '2026-01-28'
  },
  {
    id: 5,
    tipo: 'alerta',
    categoria: 'estoque',
    titulo: 'Estoque crítico de parafusos M16',
    descricao: 'O estoque de parafusos M16 está em nível crítico e pode esgotar em 5 dias úteis. Recomendamos pedido urgente.',
    impacto: 'alto',
    economiaEstimada: 0,
    tempoImplementacao: 'Imediato',
    confianca: 98,
    baseadoEm: ['Nível atual de estoque', 'Consumo médio diário', 'Lead time do fornecedor'],
    status: 'nova',
    dataCriacao: '2026-02-03'
  },
  {
    id: 6,
    tipo: 'oportunidade',
    categoria: 'producao',
    titulo: 'Terceirizar pintura de peças pequenas',
    descricao: 'Análise de custo indica que terceirizar a pintura de peças menores que 50kg pode reduzir custos em 15% e liberar capacidade produtiva.',
    impacto: 'medio',
    economiaEstimada: 12000,
    tempoImplementacao: '1 mês',
    confianca: 76,
    baseadoEm: ['Custo interno de pintura', 'Cotações de terceiros', 'Capacidade ociosa identificada'],
    status: 'descartada',
    dataCriacao: '2026-01-15'
  }
];

// Mock Data - Métricas da IA
const metricsIA = {
  sugestoesGeradas: 47,
  implementadas: 23,
  economiaTotal: 187500,
  taxaAceitacao: 72,
  precisaoMedia: 89
};

const getTipoIcon = (tipo) => {
  switch (tipo) {
    case 'otimizacao': return <Zap className="h-5 w-5" />;
    case 'alerta': return <AlertTriangle className="h-5 w-5" />;
    case 'oportunidade': return <Lightbulb className="h-5 w-5" />;
    default: return <Brain className="h-5 w-5" />;
  }
};

const getTipoColor = (tipo) => {
  switch (tipo) {
    case 'otimizacao': return 'from-blue-500 to-cyan-500';
    case 'alerta': return 'from-red-500 to-orange-500';
    case 'oportunidade': return 'from-emerald-500 to-green-500';
    default: return 'from-purple-500 to-pink-500';
  }
};

const getImpactoColor = (impacto) => {
  switch (impacto) {
    case 'critico': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'alto': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'medio': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'baixo': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'nova': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'analisando': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'implementada': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'descartada': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const getCategoriaIcon = (categoria) => {
  switch (categoria) {
    case 'producao': return <Package className="h-4 w-4" />;
    case 'manutencao': return <Wrench className="h-4 w-4" />;
    case 'financeiro': return <DollarSign className="h-4 w-4" />;
    case 'equipe': return <Users className="h-4 w-4" />;
    case 'estoque': return <Package className="h-4 w-4" />;
    default: return <Brain className="h-4 w-4" />;
  }
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0
  }).format(value);
};

// Componente de Card de Sugestão
function SugestaoCard({ sugestao }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-slate-900/60 backdrop-blur-xl rounded-xl border overflow-hidden transition-all",
        sugestao.impacto === 'critico' ? "border-red-500/50" : "border-slate-700/50"
      )}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br text-white",
            getTipoColor(sugestao.tipo)
          )}>
            {getTipoIcon(sugestao.tipo)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-white">{sugestao.titulo}</h3>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{sugestao.descricao}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={cn("border", getImpactoColor(sugestao.impacto))}>
                  {sugestao.impacto.toUpperCase()}
                </Badge>
                <Badge className={cn("border text-xs", getStatusColor(sugestao.status))}>
                  {sugestao.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-sm text-slate-400">
                {getCategoriaIcon(sugestao.categoria)}
                <span className="capitalize">{sugestao.categoria}</span>
              </div>
              {sugestao.economiaEstimada > 0 && (
                <div className="flex items-center gap-1 text-sm text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(sugestao.economiaEstimada)}/mês
                </div>
              )}
              <div className="flex items-center gap-1 text-sm text-slate-400">
                <Clock className="h-4 w-4" />
                {sugestao.tempoImplementacao}
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Confiança */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500">Confiança da IA</span>
            <span className={cn(
              "font-semibold",
              sugestao.confianca >= 90 ? "text-emerald-400" :
              sugestao.confianca >= 75 ? "text-blue-400" :
              "text-amber-400"
            )}>{sugestao.confianca}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${sugestao.confianca}%` }}
              transition={{ duration: 0.5 }}
              className={cn(
                "h-full rounded-full",
                sugestao.confianca >= 90 ? "bg-emerald-500" :
                sugestao.confianca >= 75 ? "bg-blue-500" :
                "bg-amber-500"
              )}
            />
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
              {/* Baseado em */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-400" />
                  Análise baseada em:
                </h4>
                <ul className="space-y-1">
                  {sugestao.baseadoEm.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-400">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Ações */}
              {sugestao.status === 'nova' && (
                <div className="flex items-center gap-2 pt-2">
                  <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Implementar
                  </Button>
                  <Button variant="outline" className="border-slate-700 text-slate-300">
                    <Clock className="h-4 w-4 mr-2" />
                    Analisar
                  </Button>
                  <Button variant="ghost" size="icon" className="text-slate-400">
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function SugestoesIAPage() {
  const [activeTab, setActiveTab] = useState('todas');
  const [loading, setLoading] = useState(false);

  const filtrarSugestoes = (tab) => {
    if (tab === 'todas') return mockSugestoes;
    if (tab === 'novas') return mockSugestoes.filter(s => s.status === 'nova');
    if (tab === 'implementadas') return mockSugestoes.filter(s => s.status === 'implementada');
    return mockSugestoes.filter(s => s.tipo === tab);
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            Sugestões da IA
          </h1>
          <p className="text-slate-400 mt-1">Recomendações inteligentes baseadas em análise de dados</p>
        </div>

        <Button
          onClick={handleRefresh}
          disabled={loading}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          {loading ? 'Analisando...' : 'Atualizar Análise'}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <Brain className="h-8 w-8 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{metricsIA.sugestoesGeradas}</p>
            <p className="text-xs text-slate-400">Sugestões Geradas</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{metricsIA.implementadas}</p>
            <p className="text-xs text-slate-400">Implementadas</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(metricsIA.economiaTotal)}</p>
            <p className="text-xs text-slate-400">Economia Gerada</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <ThumbsUp className="h-8 w-8 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{metricsIA.taxaAceitacao}%</p>
            <p className="text-xs text-slate-400">Taxa Aceitação</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 text-amber-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{metricsIA.precisaoMedia}%</p>
            <p className="text-xs text-slate-400">Precisão Média</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta Crítico (se houver) */}
      {mockSugestoes.some(s => s.impacto === 'critico' && s.status === 'nova') && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/50 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-400">Atenção: Alertas Críticos Pendentes</h3>
              <p className="text-sm text-slate-300">
                Existem {mockSugestoes.filter(s => s.impacto === 'critico' && s.status === 'nova').length} sugestões de impacto crítico que requerem ação imediata.
              </p>
            </div>
            <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/20">
              Ver Alertas
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Tabs e Lista */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 border border-slate-700/50">
          <TabsTrigger value="todas" className="data-[state=active]:bg-purple-500">
            Todas ({mockSugestoes.length})
          </TabsTrigger>
          <TabsTrigger value="novas" className="data-[state=active]:bg-purple-500">
            Novas ({mockSugestoes.filter(s => s.status === 'nova').length})
          </TabsTrigger>
          <TabsTrigger value="alerta" className="data-[state=active]:bg-purple-500">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="otimizacao" className="data-[state=active]:bg-purple-500">
            <Zap className="h-4 w-4 mr-1" />
            Otimizações
          </TabsTrigger>
          <TabsTrigger value="oportunidade" className="data-[state=active]:bg-purple-500">
            <Lightbulb className="h-4 w-4 mr-1" />
            Oportunidades
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filtrarSugestoes(activeTab).map(sugestao => (
            <SugestaoCard key={sugestao.id} sugestao={sugestao} />
          ))}

          {filtrarSugestoes(activeTab).length === 0 && (
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="p-8 text-center">
                <Brain className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-300">Nenhuma sugestão encontrada</h3>
                <p className="text-slate-500 mt-1">Não há sugestões para esta categoria no momento.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
