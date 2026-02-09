import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Loader2,
  CheckCircle2,
  Target,
  Activity,
  FileText,
  Zap,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Previsão de Prazos e Custos para Novos Projetos
export function PrevisaoPrazosCustos({ novoProjeto, projetosHistorico, movimentacoes }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previsao, setPrevisao] = useState(null);

  const analisarPrevisao = async () => {
    setIsAnalyzing(true);

    // Calcular dados históricos
    const projetosCompletos = projetosHistorico.filter(p => 
      ['concluido', 'em_montagem'].includes(p.status) && p.data_inicio && p.data_fim_real
    );

    const custosPorProjeto = {};
    movimentacoes.forEach(mov => {
      if (mov.projeto_id && mov.tipo === 'saida') {
        custosPorProjeto[mov.projeto_id] = (custosPorProjeto[mov.projeto_id] || 0) + mov.valor;
      }
    });

    const dadosHistoricos = projetosCompletos.map(p => {
      const inicio = new Date(p.data_inicio);
      const fim = new Date(p.data_fim_real);
      const prazoReal = Math.ceil((fim - inicio) / (1000 * 60 * 60 * 24));
      const custoReal = custosPorProjeto[p.id] || 0;

      let prazoEstimado = 0;
      if (p.data_fim_prevista) {
        const fimPrev = new Date(p.data_fim_prevista);
        prazoEstimado = Math.ceil((fimPrev - inicio) / (1000 * 60 * 60 * 24));
      }

      return {
        nome: p.nome,
        tipo: p.tipo,
        area: p.area || 0,
        peso: p.peso_estimado || 0,
        prazo_estimado: prazoEstimado,
        prazo_real: prazoReal,
        desvio_prazo: prazoEstimado > 0 ? prazoReal - prazoEstimado : 0,
        custo_estimado: p.valor_contrato || 0,
        custo_real: custoReal,
        desvio_custo: p.valor_contrato ? custoReal - p.valor_contrato : 0,
        margem_desvio_custo: p.valor_contrato ? ((custoReal - p.valor_contrato) / p.valor_contrato * 100) : 0
      };
    }).filter(p => p.prazo_real > 0);

    const prompt = `Você é um analista de projetos especializado em prever prazos e custos para estruturas metálicas.

═══════════════════════════════════════════
📊 HISTÓRICO DE PROJETOS CONCLUÍDOS
═══════════════════════════════════════════
Total de Projetos Analisados: ${dadosHistoricos.length}

${dadosHistoricos.slice(0, 15).map((p, i) => `
${i + 1}. ${p.nome}
   Tipo: ${p.tipo} | Área: ${p.area}m² | Peso: ${(p.peso / 1000).toFixed(1)}ton
   Prazo Estimado: ${p.prazo_estimado} dias → Real: ${p.prazo_real} dias (Desvio: ${p.desvio_prazo > 0 ? '+' : ''}${p.desvio_prazo} dias)
   Custo Estimado: R$ ${p.custo_estimado.toLocaleString('pt-BR')} → Real: R$ ${p.custo_real.toLocaleString('pt-BR')} (Desvio: ${p.margem_desvio_custo.toFixed(1)}%)
`).join('\n')}

**MÉTRICAS AGREGADAS:**
- Prazo Médio Real: ${(dadosHistoricos.reduce((acc, p) => acc + p.prazo_real, 0) / dadosHistoricos.length).toFixed(0)} dias
- Desvio Médio de Prazo: ${(dadosHistoricos.reduce((acc, p) => acc + Math.abs(p.desvio_prazo), 0) / dadosHistoricos.length).toFixed(0)} dias
- Custo Médio Real: R$ ${(dadosHistoricos.reduce((acc, p) => acc + p.custo_real, 0) / dadosHistoricos.length).toLocaleString('pt-BR')}
- Desvio Médio de Custo: ${(dadosHistoricos.reduce((acc, p) => acc + Math.abs(p.margem_desvio_custo), 0) / dadosHistoricos.length).toFixed(1)}%

═══════════════════════════════════════════
🎯 NOVO PROJETO A PREVER
═══════════════════════════════════════════
Nome: ${novoProjeto.nome}
Tipo: ${novoProjeto.tipo}
Área: ${novoProjeto.area}m²
Peso Estimado: ${(novoProjeto.peso_estimado / 1000).toFixed(2)} toneladas
Valor Contratado: R$ ${novoProjeto.valor_contrato?.toLocaleString('pt-BR')}
${novoProjeto.data_inicio ? `Data Início: ${new Date(novoProjeto.data_inicio).toLocaleDateString('pt-BR')}` : ''}
${novoProjeto.data_fim_prevista ? `Data Fim Prevista: ${new Date(novoProjeto.data_fim_prevista).toLocaleDateString('pt-BR')}` : ''}

═══════════════════════════════════════════
📈 ANÁLISE REQUERIDA
═══════════════════════════════════════════

Com base no histórico, forneça previsões precisas em JSON:

{
  "previsao_prazo": {
    "cenario_otimista": {
      "dias": 45,
      "probabilidade": 20,
      "condicoes": ["Condição 1", "Condição 2"]
    },
    "cenario_realista": {
      "dias": 60,
      "probabilidade": 65,
      "condicoes": ["Condição 1", "Condição 2"]
    },
    "cenario_pessimista": {
      "dias": 80,
      "probabilidade": 15,
      "condicoes": ["Condição 1", "Condição 2"]
    },
    "fatores_criticos": [
      {
        "fator": "Nome do fator",
        "impacto_dias": 5,
        "probabilidade": "alta/media/baixa",
        "mitigacao": "Como mitigar"
      }
    ]
  },
  "previsao_custo": {
    "custo_estimado_real": 450000,
    "margem_erro": 8.5,
    "breakdown": {
      "materiais": 200000,
      "mao_de_obra": 150000,
      "equipamentos": 50000,
      "outros": 50000
    },
    "riscos_custo": [
      {
        "risco": "Nome do risco",
        "impacto_financeiro": 25000,
        "probabilidade": "alta/media/baixa",
        "prevencao": "Como prevenir"
      }
    ]
  },
  "cronograma_sugerido": [
    {
      "fase": "Fabricação",
      "duracao_dias": 30,
      "inicio_sugerido": 0,
      "recursos_necessarios": ["Recurso 1", "Recurso 2"]
    },
    {
      "fase": "Montagem",
      "duracao_dias": 20,
      "inicio_sugerido": 30,
      "recursos_necessarios": ["Recurso 1", "Recurso 2"]
    }
  ],
  "recomendacoes": [
    {
      "categoria": "Prazo/Custo/Qualidade/Risco",
      "recomendacao": "Descrição específica",
      "impacto": "Impacto esperado",
      "prioridade": "alta/media/baixa"
    }
  ],
  "alertas": [
    "Alerta importante 1",
    "Alerta importante 2"
  ]
}

IMPORTANTE:
- Base as previsões em padrões identificados no histórico
- Compare projetos similares (mesmo tipo e porte)
- Considere desvios históricos para calcular margem de erro
- Seja conservador nas estimativas
- Identifique fatores de risco baseados em histórico`;

    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          previsao_prazo: {
            type: "object",
            properties: {
              cenario_otimista: {
                type: "object",
                properties: {
                  dias: { type: "number" },
                  probabilidade: { type: "number" },
                  condicoes: { type: "array", items: { type: "string" } }
                }
              },
              cenario_realista: {
                type: "object",
                properties: {
                  dias: { type: "number" },
                  probabilidade: { type: "number" },
                  condicoes: { type: "array", items: { type: "string" } }
                }
              },
              cenario_pessimista: {
                type: "object",
                properties: {
                  dias: { type: "number" },
                  probabilidade: { type: "number" },
                  condicoes: { type: "array", items: { type: "string" } }
                }
              },
              fatores_criticos: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    fator: { type: "string" },
                    impacto_dias: { type: "number" },
                    probabilidade: { type: "string" },
                    mitigacao: { type: "string" }
                  }
                }
              }
            }
          },
          previsao_custo: {
            type: "object",
            properties: {
              custo_estimado_real: { type: "number" },
              margem_erro: { type: "number" },
              breakdown: {
                type: "object",
                properties: {
                  materiais: { type: "number" },
                  mao_de_obra: { type: "number" },
                  equipamentos: { type: "number" },
                  outros: { type: "number" }
                }
              },
              riscos_custo: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    risco: { type: "string" },
                    impacto_financeiro: { type: "number" },
                    probabilidade: { type: "string" },
                    prevencao: { type: "string" }
                  }
                }
              }
            }
          },
          cronograma_sugerido: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fase: { type: "string" },
                duracao_dias: { type: "number" },
                inicio_sugerido: { type: "number" },
                recursos_necessarios: { type: "array", items: { type: "string" } }
              }
            }
          },
          recomendacoes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                categoria: { type: "string" },
                recomendacao: { type: "string" },
                impacto: { type: "string" },
                prioridade: { type: "string" }
              }
            }
          },
          alertas: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    setPrevisao(resultado);
    setIsAnalyzing(false);
  };

  if (!previsao) {
    return (
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-blue-600" />
            Previsão de Prazos e Custos (IA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-slate-600 mb-4">
              Analise o histórico para prever prazo e custo real do projeto
            </p>
            <Button
              onClick={analisarPrevisao}
              disabled={isAnalyzing || projetosHistorico.length < 3}
              className="bg-gradient-to-r from-blue-500 to-blue-600"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando Histórico...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Previsão
                </>
              )}
            </Button>
            {projetosHistorico.length < 3 && (
              <p className="text-xs text-slate-500 mt-3">
                Mínimo de 3 projetos concluídos necessários
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alertas */}
      {previsao.alertas?.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                {previsao.alertas.map((alerta, idx) => (
                  <p key={idx} className="text-sm text-red-800">• {alerta}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cenários de Prazo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            Previsão de Prazo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-semibold text-emerald-900">Otimista</span>
                <Badge className="bg-emerald-600 text-white text-xs">
                  {previsao.previsao_prazo?.cenario_otimista?.probabilidade}%
                </Badge>
              </div>
              <p className="text-3xl font-bold text-emerald-600">
                {previsao.previsao_prazo?.cenario_otimista?.dias} dias
              </p>
              <ul className="mt-2 space-y-1">
                {previsao.previsao_prazo?.cenario_otimista?.condicoes?.map((c, i) => (
                  <li key={i} className="text-xs text-emerald-700">• {c}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-semibold text-blue-900">Realista</span>
                <Badge className="bg-blue-600 text-white text-xs">
                  {previsao.previsao_prazo?.cenario_realista?.probabilidade}%
                </Badge>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {previsao.previsao_prazo?.cenario_realista?.dias} dias
              </p>
              <ul className="mt-2 space-y-1">
                {previsao.previsao_prazo?.cenario_realista?.condicoes?.map((c, i) => (
                  <li key={i} className="text-xs text-blue-700">• {c}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-semibold text-orange-900">Pessimista</span>
                <Badge className="bg-orange-600 text-white text-xs">
                  {previsao.previsao_prazo?.cenario_pessimista?.probabilidade}%
                </Badge>
              </div>
              <p className="text-3xl font-bold text-orange-600">
                {previsao.previsao_prazo?.cenario_pessimista?.dias} dias
              </p>
              <ul className="mt-2 space-y-1">
                {previsao.previsao_prazo?.cenario_pessimista?.condicoes?.map((c, i) => (
                  <li key={i} className="text-xs text-orange-700">• {c}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Fatores Críticos */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Fatores Críticos de Prazo:</p>
            {previsao.previsao_prazo?.fatores_criticos?.map((fator, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium text-sm">{fator.fator}</h4>
                  <Badge variant="outline" className="text-xs">
                    +{fator.impacto_dias} dias
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mb-1">
                  Probabilidade: <span className="font-medium">{fator.probabilidade}</span>
                </p>
                <p className="text-xs text-emerald-700">
                  <strong>Mitigação:</strong> {fator.mitigacao}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Previsão de Custo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            Previsão de Custo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg mb-4">
            <div>
              <p className="text-sm text-slate-600">Custo Estimado Real</p>
              <p className="text-3xl font-bold text-emerald-600">
                R$ {previsao.previsao_custo?.custo_estimado_real?.toLocaleString('pt-BR')}
              </p>
            </div>
            <Badge className="bg-yellow-100 text-yellow-800">
              ± {previsao.previsao_custo?.margem_erro?.toFixed(1)}%
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500">Materiais</p>
              <p className="text-sm font-bold text-slate-900">
                R$ {(previsao.previsao_custo?.breakdown?.materiais / 1000).toFixed(0)}k
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500">Mão de Obra</p>
              <p className="text-sm font-bold text-slate-900">
                R$ {(previsao.previsao_custo?.breakdown?.mao_de_obra / 1000).toFixed(0)}k
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500">Equipamentos</p>
              <p className="text-sm font-bold text-slate-900">
                R$ {(previsao.previsao_custo?.breakdown?.equipamentos / 1000).toFixed(0)}k
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg text-center">
              <p className="text-xs text-slate-500">Outros</p>
              <p className="text-sm font-bold text-slate-900">
                R$ {(previsao.previsao_custo?.breakdown?.outros / 1000).toFixed(0)}k
              </p>
            </div>
          </div>

          {/* Riscos de Custo */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Riscos de Custo:</p>
            {previsao.previsao_custo?.riscos_custo?.map((risco, idx) => (
              <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium text-sm">{risco.risco}</h4>
                  <Badge className="bg-red-100 text-red-700 text-xs">
                    R$ {(risco.impacto_financeiro / 1000).toFixed(0)}k
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 mb-1">
                  Probabilidade: <span className="font-medium">{risco.probabilidade}</span>
                </p>
                <p className="text-xs text-emerald-700">
                  <strong>Prevenção:</strong> {risco.prevencao}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cronograma Sugerido */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-600" />
            Cronograma Sugerido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {previsao.cronograma_sugerido?.map((fase, idx) => (
              <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-sm">{fase.fase}</h4>
                    <p className="text-xs text-slate-600">
                      Início sugerido: Dia {fase.inicio_sugerido} | Duração: {fase.duracao_dias} dias
                    </p>
                  </div>
                  <Badge variant="outline">{fase.duracao_dias}d</Badge>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {fase.recursos_necessarios?.map((rec, i) => (
                    <Badge key={i} className="bg-purple-100 text-purple-700 text-xs">
                      {rec}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recomendações */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-600" />
            Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {previsao.recomendacoes?.map((rec, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${
                rec.prioridade === 'alta' ? 'bg-red-50 border-red-200' :
                rec.prioridade === 'media' ? 'bg-yellow-50 border-yellow-200' :
                'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <Badge className="text-xs mb-1">{rec.categoria}</Badge>
                    <p className="text-sm font-medium">{rec.recomendacao}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{rec.prioridade}</Badge>
                </div>
                <p className="text-xs text-emerald-700 mt-1">
                  <strong>Impacto:</strong> {rec.impacto}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setPrevisao(null)}
        className="w-full"
      >
        Nova Análise
      </Button>
    </div>
  );
}

// Identificação de Gargalos e Riscos em Projetos Ativos
export function IdentificacaoGargalosRiscos({ projetosAtivos, tarefas, relatorios }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analise, setAnalise] = useState(null);
  const [projetoSelecionado, setProjetoSelecionado] = useState(null);

  const analisarGargalos = async (projeto) => {
    setIsAnalyzing(true);
    setProjetoSelecionado(projeto);

    // Buscar tarefas do projeto
    const tarefasProjeto = tarefas.filter(t => t.projeto_id === projeto.id);
    const relatoriosProjeto = relatorios.filter(r => r.projeto_id === projeto.id);

    const tarefasAtrasadas = tarefasProjeto.filter(t => {
      if (!t.data_fim || t.status === 'concluida') return false;
      return new Date(t.data_fim) < new Date();
    });

    const tarefasPendentes = tarefasProjeto.filter(t => t.status === 'pendente');
    const tarefasBloqueadas = tarefasProjeto.filter(t => t.status === 'bloqueada');

    const prazoDecorrido = projeto.data_inicio 
      ? Math.floor((new Date() - new Date(projeto.data_inicio)) / (1000 * 60 * 60 * 24))
      : 0;
    
    const prazoTotal = projeto.data_fim_prevista && projeto.data_inicio
      ? Math.floor((new Date(projeto.data_fim_prevista) - new Date(projeto.data_inicio)) / (1000 * 60 * 60 * 24))
      : 0;

    const percentualTempo = prazoTotal > 0 ? (prazoDecorrido / prazoTotal * 100) : 0;

    const relatorioMaisRecente = relatoriosProjeto.sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    )[0];

    const percentualConclusao = relatorioMaisRecente 
      ? ((relatorioMaisRecente.percentual_fabricacao || 0) + (relatorioMaisRecente.percentual_montagem || 0)) / 2
      : 0;

    const prompt = `Você é um especialista em gestão de projetos de estruturas metálicas.

═══════════════════════════════════════════
🎯 PROJETO EM ANÁLISE
═══════════════════════════════════════════
Nome: ${projeto.nome}
Cliente: ${projeto.cliente_nome}
Status: ${projeto.status}
Área: ${projeto.area}m² | Peso: ${(projeto.peso_estimado / 1000).toFixed(2)}ton
Valor Contrato: R$ ${projeto.valor_contrato?.toLocaleString('pt-BR')}

**CRONOGRAMA:**
Data Início: ${projeto.data_inicio ? new Date(projeto.data_inicio).toLocaleDateString('pt-BR') : 'N/A'}
Data Fim Prevista: ${projeto.data_fim_prevista ? new Date(projeto.data_fim_prevista).toLocaleDateString('pt-BR') : 'N/A'}
Prazo Decorrido: ${prazoDecorrido} dias de ${prazoTotal} dias (${percentualTempo.toFixed(1)}%)
Percentual Conclusão Física: ${percentualConclusao.toFixed(1)}%

**TAREFAS:**
Total: ${tarefasProjeto.length}
Atrasadas: ${tarefasAtrasadas.length}
Pendentes: ${tarefasPendentes.length}
Bloqueadas: ${tarefasBloqueadas.length}
Em Andamento: ${tarefasProjeto.filter(t => t.status === 'em_andamento').length}
Concluídas: ${tarefasProjeto.filter(t => t.status === 'concluida').length}

${tarefasAtrasadas.length > 0 ? `
**TAREFAS ATRASADAS:**
${tarefasAtrasadas.slice(0, 10).map(t => `
• ${t.titulo}
  Responsável: ${t.responsavel_nome || 'N/A'}
  Prazo: ${new Date(t.data_fim).toLocaleDateString('pt-BR')}
  Atraso: ${Math.floor((new Date() - new Date(t.data_fim)) / (1000 * 60 * 60 * 24))} dias
  Prioridade: ${t.prioridade}
`).join('\n')}
` : ''}

${tarefasBloqueadas.length > 0 ? `
**TAREFAS BLOQUEADAS:**
${tarefasBloqueadas.slice(0, 5).map(t => `
• ${t.titulo}
  Responsável: ${t.responsavel_nome || 'N/A'}
  ${t.observacoes ? `Observação: ${t.observacoes}` : ''}
`).join('\n')}
` : ''}

**PROGRESSO FÍSICO:**
${relatorioMaisRecente ? `
Fabricação: ${relatorioMaisRecente.percentual_fabricacao}%
Montagem: ${relatorioMaisRecente.percentual_montagem}%
Tonelagem Fabricada: ${(relatorioMaisRecente.tonelagem_fabricada / 1000).toFixed(1)}ton de ${(projeto.peso_estimado / 1000).toFixed(1)}ton
` : 'Sem relatórios registrados'}

═══════════════════════════════════════════
🔍 ANÁLISE REQUERIDA
═══════════════════════════════════════════

Identifique gargalos críticos e riscos em JSON:

{
  "score_saude_projeto": 75,
  "status_geral": "verde/amarelo/vermelho",
  "gargalos_identificados": [
    {
      "gargalo": "Nome do gargalo",
      "severidade": "critica/alta/media/baixa",
      "area_afetada": "Fabricação/Montagem/Gestão/Recursos",
      "impacto": "Descrição do impacto",
      "causa_raiz": "Causa identificada",
      "acao_corretiva": "Ação específica para resolver",
      "prazo_acao": "imediato/curto/medio"
    }
  ],
  "riscos_ativos": [
    {
      "risco": "Descrição do risco",
      "probabilidade": "alta/media/baixa",
      "impacto": "critico/alto/medio/baixo",
      "categoria": "Prazo/Custo/Qualidade/Segurança",
      "sinais_alerta": ["Sinal 1", "Sinal 2"],
      "plano_contingencia": "Como responder se ocorrer"
    }
  ],
  "metricas_alerta": {
    "desvio_prazo": 15,
    "desvio_orcamento": 5.2,
    "produtividade": 85,
    "qualidade": 92
  },
  "acoes_imediatas": [
    {
      "acao": "Descrição da ação",
      "responsavel_sugerido": "Quem deve executar",
      "prazo": "Quando fazer",
      "resultado_esperado": "O que esperar"
    }
  ],
  "tendencias_preocupantes": [
    "Tendência 1 identificada nos últimos relatórios",
    "Tendência 2 que pode se agravar"
  ]
}

IMPORTANTE:
- Seja objetivo e direto
- Priorize por severidade/impacto
- Sugira ações práticas e específicas
- Considere recursos disponíveis
- Identifique problemas antes que se tornem críticos`;

    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          score_saude_projeto: { type: "number" },
          status_geral: { type: "string" },
          gargalos_identificados: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gargalo: { type: "string" },
                severidade: { type: "string" },
                area_afetada: { type: "string" },
                impacto: { type: "string" },
                causa_raiz: { type: "string" },
                acao_corretiva: { type: "string" },
                prazo_acao: { type: "string" }
              }
            }
          },
          riscos_ativos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risco: { type: "string" },
                probabilidade: { type: "string" },
                impacto: { type: "string" },
                categoria: { type: "string" },
                sinais_alerta: { type: "array", items: { type: "string" } },
                plano_contingencia: { type: "string" }
              }
            }
          },
          metricas_alerta: {
            type: "object",
            properties: {
              desvio_prazo: { type: "number" },
              desvio_orcamento: { type: "number" },
              produtividade: { type: "number" },
              qualidade: { type: "number" }
            }
          },
          acoes_imediatas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                acao: { type: "string" },
                responsavel_sugerido: { type: "string" },
                prazo: { type: "string" },
                resultado_esperado: { type: "string" }
              }
            }
          },
          tendencias_preocupantes: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    setAnalise(resultado);
    setIsAnalyzing(false);
  };

  const getStatusColor = (status) => {
    if (status === 'verde') return 'bg-emerald-100 text-emerald-800';
    if (status === 'amarelo') return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (!projetosAtivos || projetosAtivos.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Activity className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Nenhum projeto ativo para analisar</p>
        </CardContent>
      </Card>
    );
  }

  if (!analise) {
    return (
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Identificação de Gargalos e Riscos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Selecione um projeto para identificar gargalos e riscos em tempo real
            </p>
            <div className="space-y-2">
              {projetosAtivos.map((projeto) => (
                <div 
                  key={projeto.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                  onClick={() => analisarGargalos(projeto)}
                >
                  <div>
                    <p className="font-medium text-slate-900">{projeto.nome}</p>
                    <p className="text-xs text-slate-500">
                      {projeto.cliente_nome} • {projeto.status}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Analisar
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com Score */}
      <Card className={`border-2 ${getStatusColor(analise.status_geral)}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{projetoSelecionado?.nome}</h3>
              <p className="text-sm text-slate-600">Análise de Gargalos e Riscos</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold">{analise.score_saude_projeto}</p>
              <p className="text-xs text-slate-500">Score de Saúde</p>
              <Badge className={getStatusColor(analise.status_geral)}>
                {analise.status_geral}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas de Alerta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Métricas de Alerta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Desvio Prazo</p>
              <p className={`text-2xl font-bold ${analise.metricas_alerta?.desvio_prazo > 10 ? 'text-red-600' : 'text-emerald-600'}`}>
                {analise.metricas_alerta?.desvio_prazo > 0 ? '+' : ''}{analise.metricas_alerta?.desvio_prazo}%
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Desvio Orçamento</p>
              <p className={`text-2xl font-bold ${analise.metricas_alerta?.desvio_orcamento > 5 ? 'text-red-600' : 'text-emerald-600'}`}>
                {analise.metricas_alerta?.desvio_orcamento > 0 ? '+' : ''}{analise.metricas_alerta?.desvio_orcamento}%
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Produtividade</p>
              <p className={`text-2xl font-bold ${analise.metricas_alerta?.produtividade < 80 ? 'text-orange-600' : 'text-emerald-600'}`}>
                {analise.metricas_alerta?.produtividade}%
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Qualidade</p>
              <p className={`text-2xl font-bold ${analise.metricas_alerta?.qualidade < 85 ? 'text-orange-600' : 'text-emerald-600'}`}>
                {analise.metricas_alerta?.qualidade}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gargalos */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Gargalos Identificados ({analise.gargalos_identificados?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analise.gargalos_identificados?.map((gargalo, idx) => (
              <div key={idx} className={`p-4 rounded-lg border-2 ${
                gargalo.severidade === 'critica' ? 'bg-red-50 border-red-300' :
                gargalo.severidade === 'alta' ? 'bg-orange-50 border-orange-300' :
                gargalo.severidade === 'media' ? 'bg-yellow-50 border-yellow-300' :
                'bg-slate-50 border-slate-300'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{gargalo.gargalo}</h4>
                    <Badge className="text-xs mb-1">{gargalo.area_afetada}</Badge>
                  </div>
                  <Badge className={
                    gargalo.severidade === 'critica' ? 'bg-red-600 text-white' :
                    gargalo.severidade === 'alta' ? 'bg-orange-600 text-white' :
                    gargalo.severidade === 'media' ? 'bg-yellow-600 text-white' :
                    'bg-slate-600 text-white'
                  }>
                    {gargalo.severidade}
                  </Badge>
                </div>
                <p className="text-sm text-slate-700 mb-2">{gargalo.impacto}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-2 bg-white rounded border">
                    <p className="text-slate-500 mb-1">Causa Raiz:</p>
                    <p className="text-slate-700">{gargalo.causa_raiz}</p>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                    <p className="text-emerald-700 font-medium mb-1">Ação Corretiva:</p>
                    <p className="text-emerald-900">{gargalo.acao_corretiva}</p>
                    <Badge className="mt-1 bg-emerald-100 text-emerald-700 text-xs">
                      {gargalo.prazo_acao}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Riscos Ativos */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-orange-600" />
            Riscos Ativos ({analise.riscos_ativos?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analise.riscos_ativos?.map((risco, idx) => (
              <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-sm mb-1">{risco.risco}</h4>
                    <div className="flex gap-2">
                      <Badge className="text-xs">{risco.categoria}</Badge>
                      <Badge variant="outline" className="text-xs">
                        P: {risco.probabilidade}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        I: {risco.impacto}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-orange-700 font-medium">Sinais de Alerta:</p>
                    <ul className="ml-4 mt-1">
                      {risco.sinais_alerta?.map((sinal, i) => (
                        <li key={i} className="text-slate-600">• {sinal}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-blue-700 font-medium mb-1">Plano de Contingência:</p>
                    <p className="text-blue-900">{risco.plano_contingencia}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ações Imediatas */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-600" />
            Ações Imediatas Recomendadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analise.acoes_imediatas?.map((acao, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-purple-200">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-sm">{acao.acao}</h4>
                  <Badge className="bg-purple-100 text-purple-700 text-xs">
                    {acao.prazo}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Responsável:</p>
                    <p className="text-slate-700 font-medium">{acao.responsavel_sugerido}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Resultado Esperado:</p>
                    <p className="text-emerald-700 font-medium">{acao.resultado_esperado}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tendências Preocupantes */}
      {analise.tendencias_preocupantes?.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-yellow-600" />
              Tendências Preocupantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analise.tendencias_preocupantes.map((tend, idx) => (
                <li key={idx} className="text-sm text-yellow-900 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span>{tend}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setAnalise(null);
          setProjetoSelecionado(null);
        }}
        className="w-full"
      >
        Analisar Outro Projeto
      </Button>
    </div>
  );
}

// Geração Automática de Resumos de Status
export function GeracaoResumoStatus({ projetos, relatorios, tarefas, movimentacoes }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [resumo, setResumo] = useState(null);
  const [periodo, setPeriodo] = useState('semanal');

  const gerarResumo = async () => {
    setIsGenerating(true);

    const agora = new Date();
    const diasPeriodo = periodo === 'semanal' ? 7 : periodo === 'quinzenal' ? 15 : 30;
    const dataInicio = new Date(agora.getTime() - diasPeriodo * 24 * 60 * 60 * 1000);

    const projetosAtivos = projetos.filter(p => 
      ['aprovado', 'em_fabricacao', 'em_montagem'].includes(p.status)
    );

    const relatoriosRecentes = relatorios.filter(r => 
      new Date(r.created_date) >= dataInicio
    );

    const tarefasRecentes = tarefas.filter(t => 
      new Date(t.updated_date || t.created_date) >= dataInicio
    );

    const tarefasConcluidas = tarefasRecentes.filter(t => 
      t.status === 'concluida' && new Date(t.data_conclusao) >= dataInicio
    );

    const movimentacoesRecentes = movimentacoes.filter(m => 
      new Date(m.data_movimentacao) >= dataInicio
    );

    const despesasRecentes = movimentacoesRecentes
      .filter(m => m.tipo === 'saida')
      .reduce((acc, m) => acc + m.valor, 0);

    const receitasRecentes = movimentacoesRecentes
      .filter(m => m.tipo === 'entrada')
      .reduce((acc, m) => acc + m.valor, 0);

    const prompt = `Você é um gerente de projetos gerando um resumo executivo ${periodo}.

═══════════════════════════════════════════
📊 DADOS DO PERÍODO (${diasPeriodo} dias)
═══════════════════════════════════════════

**PROJETOS ATIVOS:** ${projetosAtivos.length}
${projetosAtivos.slice(0, 10).map(p => {
  const relsProjeto = relatorios.filter(r => r.projeto_id === p.id);
  const relMaisRecente = relsProjeto.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
  const progresso = relMaisRecente 
    ? ((relMaisRecente.percentual_fabricacao || 0) + (relMaisRecente.percentual_montagem || 0)) / 2
    : 0;
  
  return `
• ${p.nome} (${p.cliente_nome})
  Status: ${p.status}
  Progresso: ${progresso.toFixed(1)}%
  Valor: R$ ${p.valor_contrato?.toLocaleString('pt-BR')}`;
}).join('\n')}

**RELATÓRIOS GERADOS:** ${relatoriosRecentes.length}
**TAREFAS CONCLUÍDAS:** ${tarefasConcluidas.length} de ${tarefasRecentes.length} tarefas ativas

**FINANCEIRO:**
Receitas: R$ ${receitasRecentes.toLocaleString('pt-BR')}
Despesas: R$ ${despesasRecentes.toLocaleString('pt-BR')}
Saldo: R$ ${(receitasRecentes - despesasRecentes).toLocaleString('pt-BR')}

═══════════════════════════════════════════
📋 RESUMO REQUERIDO
═══════════════════════════════════════════

Gere um resumo executivo estruturado em JSON:

{
  "titulo": "Resumo ${periodo === 'semanal' ? 'Semanal' : periodo === 'quinzenal' ? 'Quinzenal' : 'Mensal'} de Projetos",
  "periodo": "${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${agora.toLocaleDateString('pt-BR')}",
  "resumo_executivo": "Parágrafo resumindo a situação geral dos projetos no período",
  "destaques": [
    {
      "tipo": "positivo/negativo/neutro",
      "titulo": "Título do destaque",
      "descricao": "Descrição breve"
    }
  ],
  "projetos_destaque": [
    {
      "projeto": "Nome do projeto",
      "motivo": "Por que está em destaque",
      "status": "Resumo do status atual"
    }
  ],
  "metricas_periodo": {
    "total_projetos_ativos": ${projetosAtivos.length},
    "tarefas_concluidas": ${tarefasConcluidas.length},
    "relatorios_gerados": ${relatoriosRecentes.length},
    "saldo_financeiro": ${receitasRecentes - despesasRecentes},
    "produtividade": 85
  },
  "alertas": [
    {
      "severidade": "alta/media/baixa",
      "mensagem": "Descrição do alerta"
    }
  ],
  "proximos_passos": [
    "Ação recomendada 1",
    "Ação recomendada 2"
  ],
  "conclusao": "Parágrafo final com perspectivas"
}

IMPORTANTE:
- Seja conciso mas informativo
- Destaque apenas o mais relevante
- Use linguagem clara e objetiva
- Foque em insights acionáveis`;

    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          periodo: { type: "string" },
          resumo_executivo: { type: "string" },
          destaques: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tipo: { type: "string" },
                titulo: { type: "string" },
                descricao: { type: "string" }
              }
            }
          },
          projetos_destaque: {
            type: "array",
            items: {
              type: "object",
              properties: {
                projeto: { type: "string" },
                motivo: { type: "string" },
                status: { type: "string" }
              }
            }
          },
          metricas_periodo: {
            type: "object",
            properties: {
              total_projetos_ativos: { type: "number" },
              tarefas_concluidas: { type: "number" },
              relatorios_gerados: { type: "number" },
              saldo_financeiro: { type: "number" },
              produtividade: { type: "number" }
            }
          },
          alertas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severidade: { type: "string" },
                mensagem: { type: "string" }
              }
            }
          },
          proximos_passos: {
            type: "array",
            items: { type: "string" }
          },
          conclusao: { type: "string" }
        }
      }
    });

    setResumo(resultado);
    setIsGenerating(false);
  };

  if (!resumo) {
    return (
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-blue-600" />
            Resumo Automático de Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Gere um resumo executivo automático de todos os projetos
            </p>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Período do Resumo:
              </label>
              <div className="flex gap-2">
                <Button
                  variant={periodo === 'semanal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriodo('semanal')}
                >
                  Semanal
                </Button>
                <Button
                  variant={periodo === 'quinzenal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriodo('quinzenal')}
                >
                  Quinzenal
                </Button>
                <Button
                  variant={periodo === 'mensal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriodo('mensal')}
                >
                  Mensal
                </Button>
              </div>
            </div>

            <Button
              onClick={gerarResumo}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando Resumo...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Resumo {periodo === 'semanal' ? 'Semanal' : periodo === 'quinzenal' ? 'Quinzenal' : 'Mensal'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{resumo.titulo}</h2>
              <p className="text-sm text-slate-600">{resumo.periodo}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const texto = `${resumo.titulo}\n${resumo.periodo}\n\n${resumo.resumo_executivo}\n\n${resumo.conclusao}`;
                navigator.clipboard.writeText(texto);
                toast.success('Resumo copiado!');
              }}
            >
              Copiar
            </Button>
          </div>
          <p className="text-slate-700 leading-relaxed">{resumo.resumo_executivo}</p>
        </CardContent>
      </Card>

      {/* Métricas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Métricas do Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Projetos Ativos</p>
              <p className="text-2xl font-bold text-slate-900">
                {resumo.metricas_periodo?.total_projetos_ativos}
              </p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <p className="text-xs text-emerald-600">Tarefas Concluídas</p>
              <p className="text-2xl font-bold text-emerald-700">
                {resumo.metricas_periodo?.tarefas_concluidas}
              </p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600">Relatórios</p>
              <p className="text-2xl font-bold text-blue-700">
                {resumo.metricas_periodo?.relatorios_gerados}
              </p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-600">Produtividade</p>
              <p className="text-2xl font-bold text-purple-700">
                {resumo.metricas_periodo?.produtividade}%
              </p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-orange-600">Saldo Financeiro</p>
              <p className={`text-xl font-bold ${resumo.metricas_periodo?.saldo_financeiro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                R$ {(resumo.metricas_periodo?.saldo_financeiro / 1000).toFixed(0)}k
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Destaques */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Destaques do Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {resumo.destaques?.map((destaque, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${
                destaque.tipo === 'positivo' ? 'bg-emerald-50 border-emerald-200' :
                destaque.tipo === 'negativo' ? 'bg-red-50 border-red-200' :
                'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-start gap-2">
                  {destaque.tipo === 'positivo' && <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />}
                  {destaque.tipo === 'negativo' && <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />}
                  {destaque.tipo === 'neutro' && <Activity className="h-5 w-5 text-slate-600 mt-0.5" />}
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{destaque.titulo}</h4>
                    <p className="text-xs text-slate-600">{destaque.descricao}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Projetos em Destaque */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Projetos em Destaque</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {resumo.projetos_destaque?.map((proj, idx) => (
              <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-sm mb-1">{proj.projeto}</h4>
                <p className="text-xs text-blue-700 mb-1">
                  <strong>Motivo:</strong> {proj.motivo}
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Status:</strong> {proj.status}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {resumo.alertas?.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resumo.alertas.map((alerta, idx) => (
                <div key={idx} className={`p-3 rounded-lg border flex items-start gap-2 ${
                  alerta.severidade === 'alta' ? 'bg-red-50 border-red-200' :
                  alerta.severidade === 'media' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-slate-50 border-slate-200'
                }`}>
                  <AlertCircle className={`h-4 w-4 mt-0.5 ${
                    alerta.severidade === 'alta' ? 'text-red-600' :
                    alerta.severidade === 'media' ? 'text-yellow-600' :
                    'text-slate-600'
                  }`} />
                  <p className="text-sm text-slate-700">{alerta.mensagem}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Próximos Passos */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-purple-600" />
            Próximos Passos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {resumo.proximos_passos?.map((passo, idx) => (
              <li key={idx} className="text-sm text-purple-900 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <span>{passo}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Conclusão */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            <strong>Conclusão:</strong> {resumo.conclusao}
          </p>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setResumo(null)}
        className="w-full"
      >
        Gerar Novo Resumo
      </Button>
    </div>
  );
}