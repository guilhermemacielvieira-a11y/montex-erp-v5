import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Loader2,
  Target,
  PieChart
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function CostPredictiveAnalysis({ 
  projetos, 
  orcamentos = [], 
  relatorios,
  onAnalysisComplete 
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analiseFinanceira, setAnaliseFinanceira] = useState(null);

  const gerarAnalisePredicaoCustos = async () => {
    setIsAnalyzing(true);

    // Preparar dados para análise
    const projetosComDados = projetos.filter(p => p.valor_contrato).map(projeto => {
      const orcamentoProjeto = orcamentos?.find(o => 
        o.projeto_nome === projeto.nome && o.status === 'aprovado'
      );
      const relatoriosProjeto = relatorios.filter(r => r.projeto_id === projeto.id);
      const ultimoRelatorio = relatoriosProjeto.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      )[0];

      const progressoMedio = ultimoRelatorio 
        ? ((ultimoRelatorio.percentual_fabricacao || 0) + (ultimoRelatorio.percentual_montagem || 0)) / 2 
        : 0;

      const diasDecorridos = projeto.data_inicio 
        ? Math.floor((new Date() - new Date(projeto.data_inicio)) / (1000 * 60 * 60 * 24))
        : 0;

      const prazoTotal = projeto.data_fim_prevista && projeto.data_inicio
        ? Math.floor((new Date(projeto.data_fim_prevista) - new Date(projeto.data_inicio)) / (1000 * 60 * 60 * 24))
        : 120;

      const percentualTempo = diasDecorridos > 0 ? (diasDecorridos / prazoTotal) * 100 : 0;
      const desvioTempo = progressoMedio - percentualTempo;

      const custoEstimado = orcamentoProjeto?.custo_total || 0;
      const custoRealizado = ultimoRelatorio?.tonelagem_fabricada 
        ? (ultimoRelatorio.tonelagem_fabricada * 8.5) + ((ultimoRelatorio.tonelagem_montada || 0) * 12.0)
        : 0;
      const percentualGasto = custoEstimado > 0 ? (custoRealizado / custoEstimado) * 100 : 0;
      const desvioOrcamento = percentualGasto - progressoMedio;

      return {
        nome: projeto.nome,
        valorContrato: projeto.valor_contrato,
        custoEstimado,
        custoRealizado,
        percentualGasto: percentualGasto.toFixed(1),
        progressoMedio: progressoMedio.toFixed(1),
        desvioOrcamento: desvioOrcamento.toFixed(1),
        desvioTempo: desvioTempo.toFixed(1),
        status: projeto.status,
        diasDecorridos,
        prazoTotal,
        peso: projeto.peso_estimado || 0,
        area: projeto.area || 0,
        historicoRelatorios: relatoriosProjeto.length
      };
    });

    const dadosAgregados = {
      totalProjetos: projetosComDados.length,
      valorTotalContratos: projetosComDados.reduce((acc, p) => acc + p.valorContrato, 0),
      custoTotalEstimado: projetosComDados.reduce((acc, p) => acc + p.custoEstimado, 0),
      custoTotalRealizado: projetosComDados.reduce((acc, p) => acc + p.custoRealizado, 0),
      projetosComDesvio: projetosComDados.filter(p => Math.abs(parseFloat(p.desvioOrcamento)) > 10).length,
      desvioMedio: projetosComDados.reduce((acc, p) => acc + parseFloat(p.desvioOrcamento), 0) / (projetosComDados.length || 1)
    };

    const prompt = `Você é um especialista em gestão financeira e análise de custos de projetos de construção metálica.

═══════════════════════════════════════════
📊 DADOS AGREGADOS DO PORTFÓLIO
═══════════════════════════════════════════
• Total de Projetos Analisados: ${dadosAgregados.totalProjetos}
• Valor Total dos Contratos: R$ ${dadosAgregados.valorTotalContratos.toLocaleString('pt-BR')}
• Custo Total Estimado: R$ ${dadosAgregados.custoTotalEstimado.toLocaleString('pt-BR')}
• Custo Total Realizado: R$ ${dadosAgregados.custoTotalRealizado.toLocaleString('pt-BR')}
• Projetos com Desvio >10%: ${dadosAgregados.projetosComDesvio}
• Desvio Médio de Orçamento: ${dadosAgregados.desvioMedio.toFixed(1)}%

═══════════════════════════════════════════
📋 ANÁLISE POR PROJETO
═══════════════════════════════════════════
${projetosComDados.map((p, i) => `
${i + 1}. ${p.nome}
   Financeiro:
   • Valor Contrato: R$ ${p.valorContrato.toLocaleString('pt-BR')}
   • Custo Estimado: R$ ${p.custoEstimado.toLocaleString('pt-BR')}
   • Custo Realizado: R$ ${p.custoRealizado.toLocaleString('pt-BR')}
   • % Gasto: ${p.percentualGasto}%
   
   Progresso:
   • Progresso Físico: ${p.progressoMedio}%
   • Dias Decorridos: ${p.diasDecorridos} de ${p.prazoTotal}
   • Desvio de Orçamento: ${parseFloat(p.desvioOrcamento) > 0 ? '+' : ''}${p.desvioOrcamento}%
   • Desvio de Prazo: ${parseFloat(p.desvioTempo) > 0 ? '+' : ''}${p.desvioTempo}%
   
   Características:
   • Status: ${p.status}
   • Peso: ${(p.peso / 1000).toFixed(1)} ton
   • Área: ${p.area.toFixed(0)} m²
   • Relatórios: ${p.historicoRelatorios}
`).join('\n')}

Com base nesta análise financeira completa, gere uma resposta em JSON com a seguinte estrutura:

{
  "resumo_executivo": {
    "saude_financeira_geral": "verde/amarelo/vermelho",
    "descricao": "Análise geral da saúde financeira do portfólio"
  },
  "previsao_desvios": [
    {
      "projeto": "Nome do projeto",
      "desvio_previsto_percentual": 15.5,
      "desvio_previsto_valor": 50000,
      "probabilidade": "alta/media/baixa",
      "justificativa": "Explicação baseada nos dados"
    }
  ],
  "fatores_impacto": [
    {
      "fator": "Nome do fator",
      "impacto": "alto/medio/baixo",
      "descricao": "Como este fator afeta os custos",
      "projetos_afetados": 3
    }
  ],
  "otimizacoes_sugeridas": [
    {
      "titulo": "Título da otimização",
      "descricao": "Descrição detalhada",
      "economia_estimada": 30000,
      "implementacao": "Como implementar",
      "prioridade": "alta/media/baixa"
    }
  ],
  "projecoes_financeiras": {
    "custo_final_previsto_otimista": 1200000,
    "custo_final_previsto_realista": 1350000,
    "custo_final_previsto_pessimista": 1500000,
    "margem_lucro_prevista": 12.5,
    "risco_financeiro": "baixo/medio/alto"
  },
  "alertas_criticos": [
    {
      "projeto": "Nome do projeto",
      "tipo": "estouro_orcamento/atraso_prazo/baixa_margem",
      "severidade": "alta/media/baixa",
      "mensagem": "Descrição do alerta"
    }
  ]
}

IMPORTANTE:
- Analise os desvios de orçamento vs progresso físico
- Identifique padrões entre projetos similares
- Considere impacto de atrasos nos custos
- Projete custos finais baseado em tendências
- Seja específico e baseie tudo nos dados fornecidos
- Use valores numéricos reais dos dados`;

    const analise = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          resumo_executivo: {
            type: "object",
            properties: {
              saude_financeira_geral: { type: "string" },
              descricao: { type: "string" }
            }
          },
          previsao_desvios: {
            type: "array",
            items: {
              type: "object",
              properties: {
                projeto: { type: "string" },
                desvio_previsto_percentual: { type: "number" },
                desvio_previsto_valor: { type: "number" },
                probabilidade: { type: "string" },
                justificativa: { type: "string" }
              }
            }
          },
          fatores_impacto: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fator: { type: "string" },
                impacto: { type: "string" },
                descricao: { type: "string" },
                projetos_afetados: { type: "number" }
              }
            }
          },
          otimizacoes_sugeridas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titulo: { type: "string" },
                descricao: { type: "string" },
                economia_estimada: { type: "number" },
                implementacao: { type: "string" },
                prioridade: { type: "string" }
              }
            }
          },
          projecoes_financeiras: {
            type: "object",
            properties: {
              custo_final_previsto_otimista: { type: "number" },
              custo_final_previsto_realista: { type: "number" },
              custo_final_previsto_pessimista: { type: "number" },
              margem_lucro_prevista: { type: "number" },
              risco_financeiro: { type: "string" }
            }
          },
          alertas_criticos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                projeto: { type: "string" },
                tipo: { type: "string" },
                severidade: { type: "string" },
                mensagem: { type: "string" }
              }
            }
          }
        }
      }
    });

    setAnaliseFinanceira(analise);
    setIsAnalyzing(false);
    
    if (onAnalysisComplete) {
      onAnalysisComplete(analise);
    }
  };

  const getSaudeColor = (saude) => {
    if (saude === 'verde') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (saude === 'amarelo') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const getImpactoColor = (impacto) => {
    if (impacto === 'baixo') return 'bg-blue-100 text-blue-700';
    if (impacto === 'medio') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getPrioridadeColor = (prioridade) => {
    if (prioridade === 'baixa') return 'bg-slate-100 text-slate-700';
    if (prioridade === 'media') return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  if (!analiseFinanceira) {
    return (
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-purple-600" />
            Análise Preditiva de Custos (IA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <PieChart className="h-12 w-12 mx-auto text-purple-300 mb-4" />
            <p className="text-slate-600 mb-4">
              Gere uma análise financeira preditiva completa usando IA
            </p>
            <Button
              onClick={gerarAnalisePredicaoCustos}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-purple-500 to-purple-600"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando Dados...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Gerar Análise Financeira
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumo Executivo */}
      <Card className={`border-2 ${getSaudeColor(analiseFinanceira.resumo_executivo?.saude_financeira_geral)}`}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Saúde Financeira do Portfólio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">
            {analiseFinanceira.resumo_executivo?.descricao}
          </p>
        </CardContent>
      </Card>

      {/* Alertas Críticos */}
      {analiseFinanceira.alertas_criticos?.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Alertas Críticos ({analiseFinanceira.alertas_criticos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analiseFinanceira.alertas_criticos.map((alerta, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border border-red-200">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm">{alerta.projeto}</h4>
                    <Badge className={
                      alerta.severidade === 'alta' ? 'bg-red-100 text-red-700' :
                      alerta.severidade === 'media' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }>
                      {alerta.severidade?.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{alerta.mensagem}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Previsão de Desvios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              Previsão de Desvios Orçamentários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analiseFinanceira.previsao_desvios?.slice(0, 5).map((desvio, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm">{desvio.projeto}</h4>
                    <Badge variant="outline" className={
                      desvio.probabilidade === 'alta' ? 'border-red-300 text-red-700' :
                      desvio.probabilidade === 'media' ? 'border-yellow-300 text-yellow-700' :
                      'border-blue-300 text-blue-700'
                    }>
                      {desvio.probabilidade}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                    <div>
                      <span className="text-slate-500">Desvio previsto:</span>
                      <p className="font-semibold text-red-600">
                        {desvio.desvio_previsto_percentual?.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Valor:</span>
                      <p className="font-semibold text-red-600">
                        R$ {desvio.desvio_previsto_valor?.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">{desvio.justificativa}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Projeções Financeiras */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Projeções de Custo Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-xs text-emerald-600 mb-1">Cenário Otimista</p>
                <p className="text-lg font-bold text-emerald-900">
                  R$ {analiseFinanceira.projecoes_financeiras?.custo_final_previsto_otimista?.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-600 mb-1">Cenário Realista</p>
                <p className="text-lg font-bold text-blue-900">
                  R$ {analiseFinanceira.projecoes_financeiras?.custo_final_previsto_realista?.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-xs text-orange-600 mb-1">Cenário Pessimista</p>
                <p className="text-lg font-bold text-orange-900">
                  R$ {analiseFinanceira.projecoes_financeiras?.custo_final_previsto_pessimista?.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Margem de Lucro Prevista</span>
                <span className="font-bold text-lg">
                  {analiseFinanceira.projecoes_financeiras?.margem_lucro_prevista?.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Risco Financeiro</span>
                <Badge className={
                  analiseFinanceira.projecoes_financeiras?.risco_financeiro === 'baixo' ? 'bg-emerald-100 text-emerald-700' :
                  analiseFinanceira.projecoes_financeiras?.risco_financeiro === 'medio' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }>
                  {analiseFinanceira.projecoes_financeiras?.risco_financeiro?.toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fatores de Impacto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Fatores que Impactam os Custos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analiseFinanceira.fatores_impacto?.map((fator, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-sm">{fator.fator}</h4>
                  <Badge className={getImpactoColor(fator.impacto)}>
                    {fator.impacto}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600 mb-2">{fator.descricao}</p>
                <p className="text-xs text-slate-500">
                  Afeta {fator.projetos_afetados} projeto(s)
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Otimizações Sugeridas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Otimizações Sugeridas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analiseFinanceira.otimizacoes_sugeridas?.map((otimizacao, idx) => (
              <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold">{otimizacao.titulo}</h4>
                  <Badge className={getPrioridadeColor(otimizacao.prioridade)}>
                    {otimizacao.prioridade}
                  </Badge>
                </div>
                <p className="text-sm text-slate-700 mb-3">{otimizacao.descricao}</p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-500">Economia Estimada</p>
                    <p className="font-bold text-emerald-700">
                      R$ {otimizacao.economia_estimada?.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">Como Implementar:</p>
                    <p className="text-xs text-slate-600 max-w-xs">{otimizacao.implementacao}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => {
            setAnaliseFinanceira(null);
          }}
        >
          Gerar Nova Análise
        </Button>
      </div>
    </div>
  );
}