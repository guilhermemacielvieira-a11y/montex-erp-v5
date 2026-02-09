import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Loader2, 
  Users, 
  AlertTriangle, 
  TrendingUp,
  BarChart3,
  ArrowRightLeft,
  CheckCircle2
} from 'lucide-react';

export default function ResourceManagementAI({ tarefas, usuarios, projetos, onClose }) {
  const [analise, setAnalise] = useState(null);
  const [loading, setLoading] = useState(false);

  const executarAnalise = async () => {
    setLoading(true);
    try {
      // Calcular métricas de carga de trabalho por usuário
      const cargaPorUsuario = usuarios.map(usuario => {
        const tarefasUsuario = tarefas.filter(t => t.responsavel === usuario.email);
        const tarefasAtivas = tarefasUsuario.filter(t => t.status !== 'concluida');
        
        const horasEstimadas = tarefasAtivas.reduce((acc, t) => acc + (t.horas_estimadas || 0), 0);
        const horasJaTrabalhadas = tarefasAtivas.reduce((acc, t) => acc + (t.horas_trabalhadas || 0), 0);
        const horasRestantes = horasEstimadas - horasJaTrabalhadas;
        
        const tarefasUrgentes = tarefasAtivas.filter(t => t.prioridade === 'urgente' || t.prioridade === 'alta').length;
        const tarefasAtrasadas = tarefasAtivas.filter(t => {
          if (!t.data_fim) return false;
          return new Date(t.data_fim) < new Date();
        }).length;

        const projetosEnvolvidos = [...new Set(tarefasAtivas.map(t => t.projeto_id))].length;

        return {
          email: usuario.email,
          nome: usuario.full_name || usuario.email,
          total_tarefas_ativas: tarefasAtivas.length,
          horas_estimadas: horasEstimadas,
          horas_restantes: horasRestantes,
          tarefas_urgentes: tarefasUrgentes,
          tarefas_atrasadas: tarefasAtrasadas,
          projetos_envolvidos: projetosEnvolvidos,
          tarefas_detalhadas: tarefasAtivas.map(t => ({
            titulo: t.titulo,
            prioridade: t.prioridade,
            prazo: t.data_fim,
            horas_restantes: (t.horas_estimadas || 0) - (t.horas_trabalhadas || 0),
            projeto: t.projeto_nome
          }))
        };
      });

      // Identificar dependências críticas
      const tarefasComDependencias = tarefas.filter(t => t.dependencias && t.dependencias.length > 0);
      
      const prompt = `Você é um especialista em gestão de recursos e otimização de equipes. Analise os dados e forneça insights acionáveis sobre gestão de recursos.

DADOS DA EQUIPE:
${JSON.stringify(cargaPorUsuario, null, 2)}

TAREFAS COM DEPENDÊNCIAS:
${JSON.stringify(tarefasComDependencias.map(t => ({
  titulo: t.titulo,
  responsavel: t.responsavel_nome || t.responsavel,
  dependencias: t.dependencias,
  prazo: t.data_fim,
  prioridade: t.prioridade
})), null, 2)}

CONTEXTO GERAL:
- Total de usuários: ${usuarios.length}
- Total de tarefas ativas: ${tarefas.filter(t => t.status !== 'concluida').length}
- Total de projetos: ${projetos.length}

Com base nesses dados REAIS, forneça uma análise COMPLETA:

1. ANÁLISE DE CARGA DE TRABALHO
Para cada membro da equipe, avalie:
- Nível de utilização (baixo/ideal/alto/crítico)
- Distribuição equilibrada das tarefas
- Risco de burnout

2. ATRIBUIÇÕES OTIMIZADAS
Sugira reatribuições específicas de tarefas considerando:
- Balanceamento de carga
- Habilidades necessárias (inferir pelo tipo de tarefa)
- Prazos e urgências
- Dependências entre tarefas
Seja ESPECÍFICO: "Reatribuir tarefa X de Usuário A para Usuário B"

3. PREVISÃO DE CONFLITOS
Identifique potenciais conflitos:
- Sobrecarga de recursos em períodos específicos
- Dependências que podem gerar gargalos
- Tarefas críticas com responsáveis sobrecarregados
- Conflitos de prazo

4. UTILIZAÇÃO DE RECURSOS
Calcule e analise:
- Taxa de utilização de cada membro
- Recursos subutilizados
- Recursos superutilizados
- Distribuição ideal sugerida

5. RECOMENDAÇÕES DE REALOCAÇÃO
Forneça ações CONCRETAS:
- Quem deve receber mais tarefas
- Quem precisa de alívio na carga
- Priorização de tarefas por pessoa
- Sugestões de contratação/treinamento se necessário

Retorne um JSON estruturado com dados QUANTITATIVOS e recomendações PRÁTICAS.`;

      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            analise_carga: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  membro: { type: "string" },
                  nivel_utilizacao: { type: "string", enum: ["baixo", "ideal", "alto", "critico"] },
                  percentual_capacidade: { type: "number" },
                  risco_burnout: { type: "string", enum: ["baixo", "medio", "alto"] },
                  analise: { type: "string" }
                }
              }
            },
            atribuicoes_otimizadas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tarefa: { type: "string" },
                  de_usuario: { type: "string" },
                  para_usuario: { type: "string" },
                  justificativa: { type: "string" },
                  impacto: { type: "string", enum: ["baixo", "medio", "alto"] }
                }
              }
            },
            conflitos_previstos: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tipo: { type: "string" },
                  descricao: { type: "string" },
                  severidade: { type: "string", enum: ["baixa", "media", "alta", "critica"] },
                  membros_afetados: { type: "array", items: { type: "string" } },
                  sugestao_mitigacao: { type: "string" }
                }
              }
            },
            utilizacao_recursos: {
              type: "object",
              properties: {
                taxa_media_utilizacao: { type: "number" },
                recursos_subutilizados: { type: "array", items: { type: "string" } },
                recursos_superutilizados: { type: "array", items: { type: "string" } },
                distribuicao_ideal: { type: "string" }
              }
            },
            recomendacoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  categoria: { type: "string" },
                  acao: { type: "string" },
                  prioridade: { type: "string", enum: ["baixa", "media", "alta", "urgente"] },
                  impacto_esperado: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnalise(resultado);
    } catch (error) {
      console.error('Erro ao analisar recursos:', error);
      alert('Erro ao executar análise. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getUtilizacaoColor = (nivel) => {
    const colors = {
      baixo: 'bg-blue-100 text-blue-800 border-blue-200',
      ideal: 'bg-green-100 text-green-800 border-green-200',
      alto: 'bg-orange-100 text-orange-800 border-orange-200',
      critico: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[nivel] || colors.ideal;
  };

  const getRiscoColor = (risco) => {
    const colors = {
      baixo: 'bg-green-100 text-green-800',
      medio: 'bg-yellow-100 text-yellow-800',
      alto: 'bg-red-100 text-red-800'
    };
    return colors[risco] || colors.medio;
  };

  const getSeveridadeColor = (severidade) => {
    const colors = {
      baixa: 'bg-blue-100 text-blue-800',
      media: 'bg-yellow-100 text-yellow-800',
      alta: 'bg-orange-100 text-orange-800',
      critica: 'bg-red-100 text-red-800'
    };
    return colors[severidade] || colors.media;
  };

  const getPrioridadeColor = (prioridade) => {
    const colors = {
      baixa: 'bg-slate-100 text-slate-800',
      media: 'bg-blue-100 text-blue-800',
      alta: 'bg-orange-100 text-orange-800',
      urgente: 'bg-red-100 text-red-800'
    };
    return colors[prioridade] || colors.media;
  };

  if (!analise && !loading) {
    return (
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardContent className="p-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              Gestão Inteligente de Recursos com IA
            </h3>
            <p className="text-slate-600 mb-6">
              Otimize a alocação da sua equipe com análises avançadas de carga de trabalho, 
              previsão de conflitos e sugestões de realocação baseadas em IA.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <BarChart3 className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900">Análise de Carga</p>
                <p className="text-xs text-slate-500">Níveis de utilização</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <ArrowRightLeft className="h-6 w-6 text-cyan-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900">Atribuições</p>
                <p className="text-xs text-slate-500">Sugestões otimizadas</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <AlertTriangle className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900">Conflitos</p>
                <p className="text-xs text-slate-500">Previsão e mitigação</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <TrendingUp className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-900">Otimização</p>
                <p className="text-xs text-slate-500">Realocação inteligente</p>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={executarAnalise}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Analisar Recursos com IA
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
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-900 mb-2">Analisando recursos com IA...</p>
            <p className="text-slate-500">Avaliando carga de trabalho, dependências e otimizações</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Resumo */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Análise de Recursos e Otimização</CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  Taxa média de utilização: {analise.utilizacao_recursos?.taxa_media_utilizacao?.toFixed(1)}%
                </p>
              </div>
            </div>
            <Button onClick={() => setAnalise(null)} variant="outline">
              Nova Análise
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-slate-600 mb-2">Recursos Superutilizados</p>
              <p className="text-2xl font-bold text-red-700">
                {analise.utilizacao_recursos?.recursos_superutilizados?.length || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-slate-600 mb-2">Recursos Subutilizados</p>
              <p className="text-2xl font-bold text-blue-700">
                {analise.utilizacao_recursos?.recursos_subutilizados?.length || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <p className="text-sm text-slate-600 mb-2">Conflitos Previstos</p>
              <p className="text-2xl font-bold text-orange-700">
                {analise.conflitos_previstos?.length || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Análise */}
      <Tabs defaultValue="carga" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="carga">Carga de Trabalho</TabsTrigger>
          <TabsTrigger value="atribuicoes">Atribuições</TabsTrigger>
          <TabsTrigger value="conflitos">Conflitos</TabsTrigger>
          <TabsTrigger value="recomendacoes">Recomendações</TabsTrigger>
        </TabsList>

        <TabsContent value="carga" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Análise de Carga por Membro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analise.analise_carga?.map((membro, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 mb-1">{membro.membro}</h4>
                      <p className="text-sm text-slate-600">{membro.analise}</p>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <Badge className={getUtilizacaoColor(membro.nivel_utilizacao)}>
                        {membro.nivel_utilizacao?.toUpperCase()}
                      </Badge>
                      <Badge className={getRiscoColor(membro.risco_burnout)}>
                        Risco: {membro.risco_burnout}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Capacidade Utilizada</span>
                      <span className="font-semibold text-slate-900">{membro.percentual_capacidade}%</span>
                    </div>
                    <Progress value={membro.percentual_capacidade} className="h-2" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atribuicoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-cyan-600" />
                Sugestões de Reatribuição
              </CardTitle>
              <p className="text-sm text-slate-600">
                Otimizações sugeridas para balanceamento de carga
              </p>
            </CardHeader>
            <CardContent>
              {analise.atribuicoes_otimizadas?.length > 0 ? (
                <div className="space-y-3">
                  {analise.atribuicoes_otimizadas.map((atrib, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">{atrib.tarefa}</h4>
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                            <span className="font-medium">{atrib.de_usuario}</span>
                            <ArrowRightLeft className="h-3 w-3" />
                            <span className="font-medium text-blue-700">{atrib.para_usuario}</span>
                          </div>
                          <p className="text-sm text-slate-600">{atrib.justificativa}</p>
                        </div>
                        <Badge className={`${
                          atrib.impacto === 'alto' ? 'bg-emerald-100 text-emerald-800' :
                          atrib.impacto === 'medio' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          Impacto {atrib.impacto}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-slate-600">Distribuição atual está otimizada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflitos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Conflitos Previstos e Gargalos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analise.conflitos_previstos?.length > 0 ? (
                <div className="space-y-4">
                  {analise.conflitos_previstos.map((conflito, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-slate-900">{conflito.tipo}</h4>
                            <Badge className={getSeveridadeColor(conflito.severidade)}>
                              {conflito.severidade?.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-700 mb-3">{conflito.descricao}</p>
                          
                          {conflito.membros_afetados?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-slate-500 mb-1">Membros Afetados:</p>
                              <div className="flex flex-wrap gap-1">
                                {conflito.membros_afetados.map((membro, midx) => (
                                  <Badge key={midx} variant="outline" className="text-xs">
                                    {membro}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-xs font-medium text-blue-900 mb-1">💡 Sugestão de Mitigação:</p>
                            <p className="text-sm text-blue-800">{conflito.sugestao_mitigacao}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <p className="text-slate-600">Nenhum conflito crítico previsto</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recomendacoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                Recomendações de Otimização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analise.recomendacoes?.map((rec, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {rec.categoria}
                          </Badge>
                          <Badge className={getPrioridadeColor(rec.prioridade)}>
                            {rec.prioridade}
                          </Badge>
                        </div>
                        <p className="font-medium text-slate-900 mb-2">{rec.acao}</p>
                        <p className="text-sm text-slate-600">
                          <span className="font-medium">Impacto esperado:</span> {rec.impacto_esperado}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {analise.utilizacao_recursos?.distribuicao_ideal && (
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">Distribuição Ideal Sugerida</h4>
                  <p className="text-sm text-slate-700">{analise.utilizacao_recursos.distribuicao_ideal}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}