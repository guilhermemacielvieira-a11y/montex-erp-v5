import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  Loader2, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Target,
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';

export default function TaskAIAnalysis({ tarefas, projetos, onClose }) {
  const [analise, setAnalise] = useState(null);
  const [loading, setLoading] = useState(false);

  const executarAnalise = async () => {
    setLoading(true);
    try {
      // Preparar dados das tarefas
      const tarefasData = tarefas.map(t => {
        const projeto = projetos.find(p => p.id === t.projeto_id);
        const diasAteFim = t.data_fim ? 
          Math.ceil((new Date(t.data_fim) - new Date()) / (1000 * 60 * 60 * 24)) : null;
        
        return {
          id: t.id,
          titulo: t.titulo,
          projeto: projeto?.nome || 'Sem projeto',
          status: t.status,
          prioridade: t.prioridade,
          percentual_conclusao: t.percentual_conclusao || 0,
          dias_ate_prazo: diasAteFim,
          horas_estimadas: t.horas_estimadas || 0,
          horas_trabalhadas: t.horas_trabalhadas || 0,
          dependencias: t.dependencias || [],
          responsavel: t.responsavel_nome || t.responsavel || 'Não atribuído'
        };
      });

      // Calcular métricas gerais
      const tarefasAtivas = tarefas.filter(t => t.status !== 'concluida').length;
      const tarefasAtrasadas = tarefas.filter(t => {
        if (!t.data_fim || t.status === 'concluida') return false;
        return new Date(t.data_fim) < new Date();
      }).length;
      const tarefasBloqueadas = tarefas.filter(t => t.status === 'bloqueada').length;
      
      const horasEstimadasTotal = tarefas.reduce((acc, t) => acc + (t.horas_estimadas || 0), 0);
      const horasTrabalhadasTotal = tarefas.reduce((acc, t) => acc + (t.horas_trabalhadas || 0), 0);

      const prompt = `Você é um especialista em gerenciamento de projetos. Analise os seguintes dados de tarefas e forneça insights acionáveis:

DADOS DAS TAREFAS:
${JSON.stringify(tarefasData, null, 2)}

MÉTRICAS GERAIS:
- Total de tarefas: ${tarefas.length}
- Tarefas ativas: ${tarefasAtivas}
- Tarefas atrasadas: ${tarefasAtrasadas}
- Tarefas bloqueadas: ${tarefasBloqueadas}
- Horas estimadas total: ${horasEstimadasTotal}h
- Horas trabalhadas total: ${horasTrabalhadasTotal}h

Forneça uma análise completa abordando:

1. PRIORIZACAO INTELIGENTE: Sugira a ordem ideal de execução das tarefas ativas considerando:
   - Prazos urgentes
   - Dependências entre tarefas
   - Prioridade declarada
   - Impacto no projeto
   - Retorne lista com IDs das tarefas em ordem de prioridade e justificativa

2. GARGALOS IDENTIFICADOS: Liste os principais gargalos no fluxo:
   - Tarefas bloqueadas e motivos
   - Acúmulo de tarefas em determinado responsável
   - Dependências que travam o progresso
   - Estimativas vs realidade (horas)

3. PREVISOES DE CONCLUSAO: Para cada tarefa ativa, estime:
   - Tempo provável de conclusão em dias
   - Nível de confiança (alto/médio/baixo)
   - Fatores de risco

4. RESUMO EXECUTIVO: Um resumo de 2-3 parágrafos para gerentes com:
   - Status geral do projeto
   - Principais alertas e riscos
   - Recomendações prioritárias

Retorne um JSON estruturado.`;

      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            priorizacao: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tarefa_id: { type: "string" },
                  titulo: { type: "string" },
                  posicao: { type: "number" },
                  justificativa: { type: "string" },
                  urgencia: { type: "string", enum: ["critica", "alta", "media", "baixa"] }
                }
              }
            },
            gargalos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tipo: { type: "string" },
                  descricao: { type: "string" },
                  impacto: { type: "string", enum: ["alto", "medio", "baixo"] },
                  tarefas_afetadas: { type: "array", items: { type: "string" } },
                  sugestao: { type: "string" }
                }
              }
            },
            previsoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tarefa_id: { type: "string" },
                  titulo: { type: "string" },
                  dias_estimados: { type: "number" },
                  confianca: { type: "string", enum: ["alta", "media", "baixa"] },
                  fatores_risco: { type: "array", items: { type: "string" } }
                }
              }
            },
            resumo_executivo: {
              type: "object",
              properties: {
                status_geral: { type: "string" },
                saude_projeto: { type: "string", enum: ["saudavel", "atencao", "critico"] },
                principais_alertas: { type: "array", items: { type: "string" } },
                recomendacoes: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setAnalise(resultado);
    } catch (error) {
      console.error('Erro ao analisar tarefas:', error);
      alert('Erro ao executar análise. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getUrgenciaColor = (urgencia) => {
    const colors = {
      critica: 'bg-red-100 text-red-800 border-red-200',
      alta: 'bg-orange-100 text-orange-800 border-orange-200',
      media: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      baixa: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[urgencia] || colors.media;
  };

  const getImpactoColor = (impacto) => {
    const colors = {
      alto: 'bg-red-100 text-red-800',
      medio: 'bg-yellow-100 text-yellow-800',
      baixo: 'bg-green-100 text-green-800'
    };
    return colors[impacto] || colors.medio;
  };

  const getConfiancaColor = (confianca) => {
    const colors = {
      alta: 'bg-green-100 text-green-800',
      media: 'bg-yellow-100 text-yellow-800',
      baixa: 'bg-red-100 text-red-800'
    };
    return colors[confianca] || colors.media;
  };

  const getSaudeIcon = (saude) => {
    const icons = {
      saudavel: <CheckCircle2 className="h-6 w-6 text-green-600" />,
      atencao: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
      critico: <XCircle className="h-6 w-6 text-red-600" />
    };
    return icons[saude] || icons.atencao;
  };

  if (!analise && !loading) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardContent className="p-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              Análise Inteligente de Tarefas com IA
            </h3>
            <p className="text-slate-600 mb-6">
              Obtenha insights sobre priorização, identifique gargalos, receba previsões de conclusão 
              e um resumo executivo completo do estado das suas tarefas.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <Target className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900">Priorização</p>
                <p className="text-xs text-slate-500">Sugestões inteligentes</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <AlertTriangle className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900">Gargalos</p>
                <p className="text-xs text-slate-500">Identificação automática</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900">Previsões</p>
                <p className="text-xs text-slate-500">Tempo de conclusão</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <TrendingUp className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900">Resumo</p>
                <p className="text-xs text-slate-500">Visão executiva</p>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={executarAnalise}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Executar Análise com IA
              </Button>
              {onClose && (
                <Button onClick={onClose} variant="outline" size="lg">
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-900 mb-2">Analisando tarefas com IA...</p>
            <p className="text-slate-500">Isso pode levar alguns segundos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo Executivo */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getSaudeIcon(analise.resumo_executivo?.saude_projeto)}
              <div>
                <CardTitle>Resumo Executivo</CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  Status: {analise.resumo_executivo?.saude_projeto === 'saudavel' ? 'Projeto Saudável' : 
                            analise.resumo_executivo?.saude_projeto === 'atencao' ? 'Requer Atenção' : 
                            'Situação Crítica'}
                </p>
              </div>
            </div>
            <Button onClick={() => setAnalise(null)} variant="outline">
              Nova Análise
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-purple-100">
            <p className="text-slate-700 whitespace-pre-line">
              {analise.resumo_executivo?.status_geral}
            </p>
          </div>

          {analise.resumo_executivo?.principais_alertas?.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Principais Alertas
              </h4>
              <div className="space-y-2">
                {analise.resumo_executivo.principais_alertas.map((alerta, idx) => (
                  <div key={idx} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <p className="text-sm text-orange-900">{alerta}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analise.resumo_executivo?.recomendacoes?.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                Recomendações Prioritárias
              </h4>
              <div className="space-y-2">
                {analise.resumo_executivo.recomendacoes.map((rec, idx) => (
                  <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-900">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs de Análises Detalhadas */}
      <Tabs defaultValue="priorizacao" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="priorizacao">Priorização</TabsTrigger>
          <TabsTrigger value="gargalos">Gargalos</TabsTrigger>
          <TabsTrigger value="previsoes">Previsões</TabsTrigger>
        </TabsList>

        <TabsContent value="priorizacao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Ordem Sugerida de Execução
              </CardTitle>
              <p className="text-sm text-slate-600">
                Priorização inteligente baseada em prazos, dependências e impacto
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analise.priorizacao?.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                          {item.posicao}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">{item.titulo}</h4>
                          <p className="text-sm text-slate-600 mb-2">{item.justificativa}</p>
                        </div>
                      </div>
                      <Badge className={getUrgenciaColor(item.urgencia)}>
                        {item.urgencia}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gargalos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Gargalos Identificados
              </CardTitle>
              <p className="text-sm text-slate-600">
                Pontos de atenção que podem estar travando o progresso
              </p>
            </CardHeader>
            <CardContent>
              {analise.gargalos?.length > 0 ? (
                <div className="space-y-4">
                  {analise.gargalos.map((gargalo, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h4 className="font-semibold text-slate-900">{gargalo.tipo}</h4>
                          <p className="text-sm text-slate-600 mt-1">{gargalo.descricao}</p>
                        </div>
                        <Badge className={getImpactoColor(gargalo.impacto)}>
                          Impacto {gargalo.impacto}
                        </Badge>
                      </div>
                      
                      {gargalo.tarefas_afetadas?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-medium text-slate-500 mb-1">Tarefas Afetadas:</p>
                          <p className="text-sm text-slate-700">{gargalo.tarefas_afetadas.join(', ')}</p>
                        </div>
                      )}

                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-xs font-medium text-blue-900 mb-1">💡 Sugestão:</p>
                        <p className="text-sm text-blue-800">{gargalo.sugestao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-slate-600">Nenhum gargalo crítico identificado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="previsoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Previsões de Conclusão
              </CardTitle>
              <p className="text-sm text-slate-600">
                Estimativas de tempo para conclusão das tarefas ativas
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analise.previsoes?.map((previsao, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">{previsao.titulo}</h4>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            {previsao.dias_estimados} dia{previsao.dias_estimados !== 1 ? 's' : ''} estimado{previsao.dias_estimados !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <Badge className={getConfiancaColor(previsao.confianca)}>
                        Confiança {previsao.confianca}
                      </Badge>
                    </div>

                    {previsao.fatores_risco?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-2">Fatores de Risco:</p>
                        <div className="space-y-1">
                          {previsao.fatores_risco.map((fator, fidx) => (
                            <div key={fidx} className="flex items-start gap-2">
                              <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-slate-600">{fator}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}