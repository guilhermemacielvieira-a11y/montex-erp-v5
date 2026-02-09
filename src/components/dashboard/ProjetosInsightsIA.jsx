import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  TrendingUp,
  MapPin,
  Clock,
  BarChart3,
  Loader2,
  Building2,
  AlertCircle,
  CheckCircle2,
  Target
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ProjetosInsightsIA({ projetos, orcamentos, movimentacoes }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  const analisarProjetos = async () => {
    setIsAnalyzing(true);

    // Preparar dados para análise
    const projetosCompletos = projetos.filter(p => 
      ['concluido', 'em_fabricacao', 'em_montagem'].includes(p.status)
    );

    const receitasPorProjeto = {};
    const custosPorProjeto = {};
    
    movimentacoes.forEach(mov => {
      if (mov.projeto_id) {
        if (mov.tipo === 'entrada') {
          receitasPorProjeto[mov.projeto_id] = (receitasPorProjeto[mov.projeto_id] || 0) + mov.valor;
        } else {
          custosPorProjeto[mov.projeto_id] = (custosPorProjeto[mov.projeto_id] || 0) + mov.valor;
        }
      }
    });

    const dadosProjetosPorTipo = {};
    const dadosPorLocalizacao = {};
    const dadosPrazos = [];

    projetosCompletos.forEach(projeto => {
      const receita = receitasPorProjeto[projeto.id] || projeto.valor_contrato || 0;
      const custo = custosPorProjeto[projeto.id] || 0;
      const lucro = receita - custo;
      const margem = receita > 0 ? (lucro / receita) * 100 : 0;

      // Por tipo
      if (!dadosProjetosPorTipo[projeto.tipo]) {
        dadosProjetosPorTipo[projeto.tipo] = {
          tipo: projeto.tipo,
          quantidade: 0,
          receita_total: 0,
          custo_total: 0,
          lucro_total: 0,
          margem_media: 0,
          area_total: 0,
          peso_total: 0
        };
      }
      dadosProjetosPorTipo[projeto.tipo].quantidade++;
      dadosProjetosPorTipo[projeto.tipo].receita_total += receita;
      dadosProjetosPorTipo[projeto.tipo].custo_total += custo;
      dadosProjetosPorTipo[projeto.tipo].lucro_total += lucro;
      dadosProjetosPorTipo[projeto.tipo].area_total += projeto.area || 0;
      dadosProjetosPorTipo[projeto.tipo].peso_total += projeto.peso_estimado || 0;

      // Por localização
      const loc = projeto.localizacao || 'Não especificada';
      if (!dadosPorLocalizacao[loc]) {
        dadosPorLocalizacao[loc] = {
          localizacao: loc,
          quantidade: 0,
          valor_total: 0
        };
      }
      dadosPorLocalizacao[loc].quantidade++;
      dadosPorLocalizacao[loc].valor_total += receita;

      // Prazos
      if (projeto.data_inicio && projeto.data_fim_real) {
        const inicio = new Date(projeto.data_inicio);
        const fim = new Date(projeto.data_fim_real);
        const prazoReal = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));
        
        let prazoEstimado = 0;
        if (projeto.data_fim_prevista) {
          const fimPrevisto = new Date(projeto.data_fim_prevista);
          prazoEstimado = Math.ceil((fimPrevisto - inicio) / (1000 * 60 * 60 * 24));
        }

        dadosPrazos.push({
          tipo: projeto.tipo,
          prazo_real: prazoReal,
          prazo_estimado: prazoEstimado,
          desvio: prazoEstimado > 0 ? prazoReal - prazoEstimado : 0,
          area: projeto.area || 0,
          peso: projeto.peso_estimado || 0
        });
      }
    });

    // Calcular margem média por tipo
    Object.keys(dadosProjetosPorTipo).forEach(tipo => {
      const dados = dadosProjetosPorTipo[tipo];
      dados.margem_media = dados.receita_total > 0 
        ? ((dados.lucro_total / dados.receita_total) * 100)
        : 0;
    });

    const prompt = `Você é um analista de dados especializado em gestão de projetos de estruturas metálicas.

═══════════════════════════════════════════
📊 DADOS CONSOLIDADOS DE PROJETOS
═══════════════════════════════════════════
Total de Projetos Analisados: ${projetosCompletos.length}

**ANÁLISE POR TIPO DE ESTRUTURA:**
${Object.values(dadosProjetosPorTipo).map(d => `
• ${d.tipo.replace(/_/g, ' ').toUpperCase()}
  - Projetos: ${d.quantidade}
  - Receita Total: R$ ${d.receita_total.toLocaleString('pt-BR')}
  - Lucro Total: R$ ${d.lucro_total.toLocaleString('pt-BR')}
  - Margem Média: ${d.margem_media.toFixed(1)}%
  - Área Total: ${d.area_total.toFixed(0)}m²
  - Peso Total: ${(d.peso_total / 1000).toFixed(1)} toneladas
`).join('\n')}

**ANÁLISE POR LOCALIZAÇÃO:**
${Object.values(dadosPorLocalizacao).sort((a, b) => b.quantidade - a.quantidade).slice(0, 10).map((d, i) => `
${i + 1}. ${d.localizacao}
   - Projetos: ${d.quantidade}
   - Valor Total: R$ ${d.valor_total.toLocaleString('pt-BR')}
`).join('\n')}

**ANÁLISE DE PRAZOS:**
Projetos com dados de prazo: ${dadosPrazos.length}
Prazo médio real: ${dadosPrazos.length > 0 ? (dadosPrazos.reduce((acc, d) => acc + d.prazo_real, 0) / dadosPrazos.length).toFixed(0) : 0} dias
Desvio médio: ${dadosPrazos.length > 0 ? (dadosPrazos.reduce((acc, d) => acc + Math.abs(d.desvio), 0) / dadosPrazos.length).toFixed(0) : 0} dias

═══════════════════════════════════════════
🎯 ANÁLISE REQUERIDA
═══════════════════════════════════════════

Forneça uma análise estratégica em JSON com:

{
  "tipos_mais_lucrativos": [
    {
      "tipo": "galpao_industrial",
      "ranking": 1,
      "score_lucratividade": 95,
      "motivos": ["Razão 1", "Razão 2"],
      "recomendacao": "Estratégia específica"
    }
  ],
  "analise_localizacoes": {
    "regioes_alta_demanda": [
      {
        "localizacao": "Cidade/Região",
        "projetos": 10,
        "potencial": "Alto/Médio/Baixo",
        "insights": "Análise detalhada"
      }
    ],
    "recomendacoes_expansao": ["Recomendação 1", "Recomendação 2"]
  },
  "analise_prazos": {
    "prazo_otimo_por_tipo": [
      {
        "tipo": "galpao_industrial",
        "prazo_medio_dias": 45,
        "fator_area": "dias por m²",
        "confiabilidade": "Alta/Média/Baixa"
      }
    ],
    "fatores_atraso": ["Fator 1", "Fator 2"],
    "recomendacoes_eficiencia": ["Recomendação 1", "Recomendação 2"]
  },
  "insights_estrategicos": [
    {
      "categoria": "Lucratividade/Mercado/Operacional",
      "insight": "Insight específico",
      "acao_sugerida": "Ação concreta",
      "impacto_esperado": "Descrição do impacto"
    }
  ],
  "alertas": [
    {
      "severidade": "alta/media/baixa",
      "titulo": "Título do alerta",
      "descricao": "Descrição detalhada"
    }
  ]
}

IMPORTANTE:
- Seja específico e baseado em dados
- Compare tipos de projeto em termos de ROI
- Identifique padrões geográficos
- Forneça recomendações práticas
- Considere sazonalidade se houver dados`;

    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          tipos_mais_lucrativos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tipo: { type: "string" },
                ranking: { type: "number" },
                score_lucratividade: { type: "number" },
                motivos: { type: "array", items: { type: "string" } },
                recomendacao: { type: "string" }
              }
            }
          },
          analise_localizacoes: {
            type: "object",
            properties: {
              regioes_alta_demanda: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    localizacao: { type: "string" },
                    projetos: { type: "number" },
                    potencial: { type: "string" },
                    insights: { type: "string" }
                  }
                }
              },
              recomendacoes_expansao: { type: "array", items: { type: "string" } }
            }
          },
          analise_prazos: {
            type: "object",
            properties: {
              prazo_otimo_por_tipo: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    tipo: { type: "string" },
                    prazo_medio_dias: { type: "number" },
                    fator_area: { type: "string" },
                    confiabilidade: { type: "string" }
                  }
                }
              },
              fatores_atraso: { type: "array", items: { type: "string" } },
              recomendacoes_eficiencia: { type: "array", items: { type: "string" } }
            }
          },
          insights_estrategicos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                categoria: { type: "string" },
                insight: { type: "string" },
                acao_sugerida: { type: "string" },
                impacto_esperado: { type: "string" }
              }
            }
          },
          alertas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severidade: { type: "string" },
                titulo: { type: "string" },
                descricao: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Adicionar dados quantitativos para gráficos
    resultado.dados_graficos = {
      por_tipo: Object.values(dadosProjetosPorTipo).sort((a, b) => b.margem_media - a.margem_media),
      por_localizacao: Object.values(dadosPorLocalizacao).sort((a, b) => b.quantidade - a.quantidade).slice(0, 8),
      prazos: dadosPrazos
    };

    setInsights(resultado);
    setIsAnalyzing(false);
  };

  if (!insights) {
    return (
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-purple-600" />
            Análise Inteligente de Projetos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-16 w-16 mx-auto text-purple-400 mb-4" />
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Analise o histórico completo de projetos com IA para identificar padrões de lucratividade, 
              demanda por região e eficiência de prazos
            </p>
            <Button
              onClick={analisarProjetos}
              disabled={isAnalyzing || projetos.length < 3}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analisando {projetos.length} projetos...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Iniciar Análise IA
                </>
              )}
            </Button>
            {projetos.length < 3 && (
              <p className="text-xs text-slate-500 mt-3">
                Mínimo de 3 projetos necessários para análise
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de nova análise */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-purple-900">Análise Inteligente Completa</h3>
                <p className="text-sm text-purple-700">Insights baseados em {projetos.length} projetos</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInsights(null)}
              className="border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              Nova Análise
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {insights.alertas?.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.alertas.map((alerta, idx) => (
            <Card 
              key={idx} 
              className={`border-2 ${
                alerta.severidade === 'alta' ? 'border-red-300 bg-red-50' :
                alerta.severidade === 'media' ? 'border-yellow-300 bg-yellow-50' :
                'border-blue-300 bg-blue-50'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className={`h-5 w-5 mt-0.5 ${
                    alerta.severidade === 'alta' ? 'text-red-600' :
                    alerta.severidade === 'media' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`} />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{alerta.titulo}</h4>
                    <p className="text-xs text-slate-600">{alerta.descricao}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tipos Mais Lucrativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Tipos de Projeto Mais Lucrativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            {insights.tipos_mais_lucrativos?.map((tipo, idx) => (
              <div key={idx} className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-emerald-600 text-white text-lg px-3 py-1">
                      #{tipo.ranking}
                    </Badge>
                    <div>
                      <h4 className="font-bold text-lg capitalize">
                        {tipo.tipo.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-sm text-emerald-700">Score: {tipo.score_lucratividade}/100</p>
                    </div>
                  </div>
                  <Progress value={tipo.score_lucratividade} className="w-32 h-2" />
                </div>
                <div className="space-y-2 mb-3">
                  <p className="text-sm font-semibold text-slate-700">Por quê?</p>
                  <ul className="space-y-1">
                    {tipo.motivos?.map((motivo, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span>{motivo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-white rounded border border-emerald-200">
                  <p className="text-xs font-semibold text-emerald-900 mb-1">Recomendação:</p>
                  <p className="text-sm text-slate-700">{tipo.recomendacao}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Gráfico de Lucratividade por Tipo */}
          {insights.dados_graficos?.por_tipo && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3">Margem Média por Tipo</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={insights.dados_graficos.por_tipo}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="tipo" 
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => value.replace(/_/g, ' ').substring(0, 15)}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value) => `${value.toFixed(1)}%`}
                    labelFormatter={(value) => value.replace(/_/g, ' ')}
                  />
                  <Bar dataKey="margem_media" fill="#10b981" name="Margem %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Análise de Localizações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Análise por Localização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {insights.analise_localizacoes?.regioes_alta_demanda?.map((regiao, idx) => (
              <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">{regiao.localizacao}</h4>
                    <p className="text-sm text-blue-600">{regiao.projetos} projeto(s)</p>
                  </div>
                  <Badge className={
                    regiao.potencial === 'Alto' ? 'bg-emerald-600' :
                    regiao.potencial === 'Médio' ? 'bg-yellow-600' :
                    'bg-slate-600'
                  }>
                    {regiao.potencial}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">{regiao.insights}</p>
              </div>
            ))}
          </div>

          {insights.dados_graficos?.por_localizacao && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3">Top Localizações por Quantidade</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={insights.dados_graficos.por_localizacao}
                    dataKey="quantidade"
                    nameKey="localizacao"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.localizacao}: ${entry.quantidade}`}
                  >
                    {insights.dados_graficos.por_localizacao.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-2">Recomendações de Expansão:</p>
            <ul className="space-y-1">
              {insights.analise_localizacoes?.recomendacoes_expansao?.map((rec, i) => (
                <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                  <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Análise de Prazos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Análise de Prazos e Eficiência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {insights.analise_prazos?.prazo_otimo_por_tipo?.map((prazo, idx) => (
              <div key={idx} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-semibold capitalize mb-2">
                  {prazo.tipo.replace(/_/g, ' ')}
                </h4>
                <div className="flex items-center gap-4 mb-2">
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{prazo.prazo_medio_dias}</p>
                    <p className="text-xs text-slate-600">dias médio</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">{prazo.fator_area}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {prazo.confiabilidade}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-semibold text-red-900 mb-2">Fatores que Causam Atrasos:</p>
              <ul className="space-y-1">
                {insights.analise_prazos?.fatores_atraso?.map((fator, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <span>{fator}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-sm font-semibold text-emerald-900 mb-2">Recomendações para Maior Eficiência:</p>
              <ul className="space-y-1">
                {insights.analise_prazos?.recomendacoes_eficiencia?.map((rec, i) => (
                  <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights Estratégicos */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            Insights Estratégicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.insights_estrategicos?.map((insight, idx) => (
              <div key={idx} className="p-4 bg-white rounded-lg border-2 border-purple-200">
                <Badge className="bg-purple-600 text-white mb-2">{insight.categoria}</Badge>
                <h4 className="font-semibold text-sm mb-2">{insight.insight}</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-xs text-purple-700 font-semibold">Ação Sugerida:</p>
                    <p className="text-slate-700">{insight.acao_sugerida}</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-700 font-semibold">Impacto Esperado:</p>
                    <p className="text-emerald-700">{insight.impacto_esperado}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}