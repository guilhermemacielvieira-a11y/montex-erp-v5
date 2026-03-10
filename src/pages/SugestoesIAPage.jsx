// MONTEX ERP Premium - Módulo de Sugestões IA
// Recomendações inteligentes baseadas em análise de dados REAIS do sistema

import React, { useState, useMemo } from 'react';
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
  Lightbulb,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useFinancialIntelligence } from '@/hooks/useFinancialIntelligence';
import { useEstoque, useProducao } from '@/contexts/ERPContext';

const getTipoIcon = (tipo) => {
  switch (tipo) {
    case 'Otimização': return <Zap className="h-5 w-5" />;
    case 'Alerta': return <AlertTriangle className="h-5 w-5" />;
    case 'Oportunidade': return <Lightbulb className="h-5 w-5" />;
    default: return <Brain className="h-5 w-5" />;
  }
};

const getTipoColor = (tipo) => {
  switch (tipo) {
    case 'Otimização': return 'from-blue-500 to-cyan-500';
    case 'Alerta': return 'from-red-500 to-orange-500';
    case 'Oportunidade': return 'from-emerald-500 to-green-500';
    default: return 'from-purple-500 to-pink-500';
  }
};

const getImpactoColor = (impacto) => {
  switch (impacto?.toLowerCase()) {
    case 'crítico': case 'critico': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'alto': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'médio': case 'medio': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
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
    default: return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  }
};

const getCategoriaIcon = (categoria) => {
  switch (categoria) {
    case 'Produção': return <Package className="h-4 w-4" />;
    case 'Custos': return <DollarSign className="h-4 w-4" />;
    case 'Orçamento': return <BarChart3 className="h-4 w-4" />;
    case 'Margem': return <TrendingUp className="h-4 w-4" />;
    case 'Estratégia': return <Target className="h-4 w-4" />;
    case 'Estoque': return <Package className="h-4 w-4" />;
    case 'Manutenção': return <Wrench className="h-4 w-4" />;
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
function SugestaoCard({ sugestao, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);

  const baseadoEm = [
    `Análise de ${sugestao.categoria || 'dados'} do sistema`,
    `Confiança: ${sugestao.confianca}% baseado em dados reais`,
    `Gerado em: ${new Date(sugestao.data).toLocaleDateString('pt-BR')}`
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-slate-900/60 backdrop-blur-xl rounded-xl border overflow-hidden transition-all",
        sugestao.impacto === 'Crítico' ? "border-red-500/50" : "border-slate-700/50"
      )}
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br text-white shrink-0",
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
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Badge className={cn("border", getImpactoColor(sugestao.impacto))}>
                  {(sugestao.impacto || '').toUpperCase()}
                </Badge>
                <Badge className={cn("border text-xs", getStatusColor(sugestao.status))}>
                  {sugestao.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <div className="flex items-center gap-1 text-sm text-slate-400">
                {getCategoriaIcon(sugestao.categoria)}
                <span>{sugestao.categoria}</span>
              </div>
              {sugestao.economia > 0 && (
                <div className="flex items-center gap-1 text-sm text-emerald-400">
                  <DollarSign className="h-4 w-4" />
                  {formatCurrency(sugestao.economia)}/mês
                </div>
              )}
              <div className="flex items-center gap-1 text-sm text-slate-400">
                <Clock className="h-4 w-4" />
                {new Date(sugestao.data).toLocaleDateString('pt-BR')}
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
                  {baseadoEm.map((item, idx) => (
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
                  <Button
                    onClick={(e) => { e.stopPropagation(); onStatusChange(sugestao.id, 'implementada'); }}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Implementar
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); onStatusChange(sugestao.id, 'analisando'); }}
                    variant="outline"
                    className="border-slate-700 text-slate-300"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Analisar
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); onStatusChange(sugestao.id, 'descartada'); }}
                    variant="ghost"
                    size="icon"
                    className="text-slate-400"
                  >
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
  const [statusOverrides, setStatusOverrides] = useState({});

  // Dados REAIS do sistema
  const fi = useFinancialIntelligence();
  const { estoque } = useEstoque();
  const { maquinas } = useProducao();

  // Sugestões geradas pelo motor de regras + sugestões de estoque e máquinas
  const todasSugestoes = useMemo(() => {
    const sugestoes = [...(fi.sugestoes || [])];
    const agora = new Date();

    // Regras de ESTOQUE
    (estoque || []).forEach(item => {
      const qty = parseInt(item.quantidade) || parseInt(item.qtd) || 0;
      const min = parseInt(item.minimo) || parseInt(item.estoqueMinimo) || parseInt(item.estoque_minimo) || 0;
      if (min > 0 && qty <= min) {
        sugestoes.push({
          id: `sug-estoque-${item.id}`,
          tipo: 'Alerta',
          titulo: `Estoque crítico: ${item.nome || item.descricao || item.material}`,
          descricao: `O item "${item.nome || item.descricao || item.material}" está com ${qty} unidades, abaixo do mínimo de ${min}. Realizar pedido de compra urgente para evitar parada de produção.`,
          impacto: qty === 0 ? 'Crítico' : 'Alto',
          economia: 0,
          confianca: 98,
          categoria: 'Estoque',
          data: agora.toISOString(),
          status: 'nova'
        });
      }
    });

    // Regras de MÁQUINAS
    (maquinas || []).forEach(maq => {
      const eficiencia = parseFloat(maq.eficiencia) || 100;
      if (eficiencia < 70) {
        sugestoes.push({
          id: `sug-maq-${maq.id}`,
          tipo: 'Otimização',
          titulo: `Manutenção preventiva: ${maq.nome || maq.codigo}`,
          descricao: `A máquina ${maq.nome || maq.codigo} está com eficiência de ${eficiencia.toFixed(0)}%, abaixo do mínimo aceitável de 70%. Agendar manutenção preventiva para evitar paradas não programadas.`,
          impacto: eficiencia < 50 ? 'Crítico' : 'Alto',
          economia: 5000,
          confianca: 85,
          categoria: 'Manutenção',
          data: agora.toISOString(),
          status: 'nova'
        });
      }
    });

    // Aplicar overrides de status
    return sugestoes.map(s => ({
      ...s,
      status: statusOverrides[s.id] || s.status
    }));
  }, [fi.sugestoes, estoque, maquinas, statusOverrides]);

  // Métricas calculadas
  const metricsIA = useMemo(() => {
    const implementadas = todasSugestoes.filter(s => s.status === 'implementada').length;
    const economiaTotal = todasSugestoes
      .filter(s => s.status === 'implementada')
      .reduce((sum, s) => sum + (s.economia || 0), 0);
    const confiancaMedia = todasSugestoes.length > 0
      ? todasSugestoes.reduce((sum, s) => sum + (s.confianca || 0), 0) / todasSugestoes.length
      : 0;

    return {
      sugestoesGeradas: todasSugestoes.length,
      implementadas,
      economiaTotal,
      taxaAceitacao: todasSugestoes.length > 0 ? Math.round((implementadas / todasSugestoes.length) * 100) : 0,
      precisaoMedia: Math.round(confiancaMedia)
    };
  }, [todasSugestoes]);

  const handleStatusChange = (id, novoStatus) => {
    setStatusOverrides(prev => ({ ...prev, [id]: novoStatus }));
  };

  const filtrarSugestoes = (tab) => {
    if (tab === 'todas') return todasSugestoes;
    if (tab === 'novas') return todasSugestoes.filter(s => s.status === 'nova');
    if (tab === 'Alerta') return todasSugestoes.filter(s => s.tipo === 'Alerta');
    if (tab === 'Otimização') return todasSugestoes.filter(s => s.tipo === 'Otimização');
    if (tab === 'Oportunidade') return todasSugestoes.filter(s => s.tipo === 'Oportunidade');
    return todasSugestoes;
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  };

  const alertasCriticos = todasSugestoes.filter(s => (s.impacto === 'Crítico' || s.impacto === 'Alto') && s.status === 'nova');

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
          <p className="text-slate-400 mt-1">Recomendações baseadas em dados reais — {fi.kpisGerais?.totalDespesas || 0} lançamentos analisados</p>
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
            <p className="text-xs text-slate-400">Economia Estimada</p>
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
            <p className="text-xs text-slate-400">Confiança Média</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta Crítico (se houver) */}
      {alertasCriticos.length > 0 && (
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
                Existem {alertasCriticos.length} sugestões de impacto crítico/alto que requerem ação imediata.
              </p>
            </div>
            <Button
              onClick={() => setActiveTab('Alerta')}
              variant="outline"
              className="border-red-500/50 text-red-400 hover:bg-red-500/20"
            >
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
            Todas ({todasSugestoes.length})
          </TabsTrigger>
          <TabsTrigger value="novas" className="data-[state=active]:bg-purple-500">
            Novas ({todasSugestoes.filter(s => s.status === 'nova').length})
          </TabsTrigger>
          <TabsTrigger value="Alerta" className="data-[state=active]:bg-purple-500">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Alertas ({todasSugestoes.filter(s => s.tipo === 'Alerta').length})
          </TabsTrigger>
          <TabsTrigger value="Otimização" className="data-[state=active]:bg-purple-500">
            <Zap className="h-4 w-4 mr-1" />
            Otimizações ({todasSugestoes.filter(s => s.tipo === 'Otimização').length})
          </TabsTrigger>
          <TabsTrigger value="Oportunidade" className="data-[state=active]:bg-purple-500">
            <Lightbulb className="h-4 w-4 mr-1" />
            Oportunidades ({todasSugestoes.filter(s => s.tipo === 'Oportunidade').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filtrarSugestoes(activeTab).map(sugestao => (
            <SugestaoCard
              key={sugestao.id}
              sugestao={sugestao}
              onStatusChange={handleStatusChange}
            />
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
