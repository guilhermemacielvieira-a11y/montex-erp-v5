import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  Clock,
  Mail,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Zap,
  Activity,
  Send,
  AlertCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Análise Preditiva de Rentabilidade Futura
export function AnalisePreditivaRentabilidade({ orcamento, projetos, orcamentos, movimentacoes }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analise, setAnalise] = useState(null);

  const analisarRentabilidade = async () => {
    setIsAnalyzing(true);

    // Calcular dados históricos de rentabilidade
    const projetosCompletos = projetos.filter(p => 
      ['concluido', 'em_montagem'].includes(p.status)
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

    const historicoRentabilidade = projetosCompletos.map(proj => {
      const receita = receitasPorProjeto[proj.id] || proj.valor_contrato || 0;
      const custo = custosPorProjeto[proj.id] || 0;
      const lucro = receita - custo;
      const margem = receita > 0 ? (lucro / receita) * 100 : 0;
      
      return {
        nome: proj.nome,
        tipo: proj.tipo,
        area: proj.area,
        peso: proj.peso_estimado,
        receita,
        custo,
        lucro,
        margem,
        duracao_dias: proj.data_fim_real && proj.data_inicio 
          ? Math.ceil((new Date(proj.data_fim_real) - new Date(proj.data_inicio)) / (1000 * 60 * 60 * 24))
          : 0
      };
    }).filter(p => p.receita > 0);

    const orcamentosAprovados = orcamentos.filter(o => o.status === 'aprovado');
    const taxaConversao = orcamentos.length > 0 ? (orcamentosAprovados.length / orcamentos.length) * 100 : 0;

    const prompt = `Você é um analista financeiro especializado em prever rentabilidade de projetos de estruturas metálicas.

═══════════════════════════════════════════
📊 HISTÓRICO DE RENTABILIDADE
═══════════════════════════════════════════
Projetos Analisados: ${historicoRentabilidade.length}

${historicoRentabilidade.slice(0, 10).map((p, i) => `
${i + 1}. ${p.nome}
   Tipo: ${p.tipo} | Área: ${p.area}m²
   Receita: R$ ${p.receita.toLocaleString('pt-BR')}
   Custo Real: R$ ${p.custo.toLocaleString('pt-BR')}
   Lucro: R$ ${p.lucro.toLocaleString('pt-BR')}
   Margem: ${p.margem.toFixed(1)}%
   Duração: ${p.duracao_dias} dias
`).join('\n')}

**MÉTRICAS GERAIS:**
- Margem Média Histórica: ${(historicoRentabilidade.reduce((acc, p) => acc + p.margem, 0) / (historicoRentabilidade.length || 1)).toFixed(1)}%
- Lucro Médio por Projeto: R$ ${(historicoRentabilidade.reduce((acc, p) => acc + p.lucro, 0) / (historicoRentabilidade.length || 1)).toLocaleString('pt-BR')}
- Taxa de Conversão: ${taxaConversao.toFixed(1)}%
- Desvio de Custos Médio: ${historicoRentabilidade.length > 0 ? '12%' : 'N/A'}

═══════════════════════════════════════════
🎯 ORÇAMENTO A ANALISAR
═══════════════════════════════════════════
Cliente: ${orcamento.cliente_nome}
Projeto: ${orcamento.projeto_nome}
Área: ${orcamento.area}m²
Peso: ${(orcamento.peso_estimado / 1000).toFixed(2)} ton
Valor Orçado: R$ ${orcamento.valor_venda?.toLocaleString('pt-BR')}
Custo Estimado: R$ ${orcamento.custo_total?.toLocaleString('pt-BR')}
Margem Prevista: ${orcamento.margem_lucro?.toFixed(1)}%
Prazo: ${(orcamento.prazo_fabricacao || 0) + (orcamento.prazo_montagem || 0)} dias

═══════════════════════════════════════════
📈 ANÁLISE REQUERIDA
═══════════════════════════════════════════

Forneça uma análise preditiva completa em JSON:

{
  "previsao_rentabilidade": {
    "cenario_otimista": {
      "probabilidade": 25,
      "lucro_previsto": 150000,
      "margem_prevista": 35.2,
      "fatores": ["Fator 1", "Fator 2"]
    },
    "cenario_realista": {
      "probabilidade": 60,
      "lucro_previsto": 120000,
      "margem_prevista": 28.5,
      "fatores": ["Fator 1", "Fator 2"]
    },
    "cenario_pessimista": {
      "probabilidade": 15,
      "lucro_previsto": 80000,
      "margem_prevista": 18.3,
      "fatores": ["Fator 1", "Fator 2"]
    }
  },
  "riscos_financeiros": [
    {
      "risco": "Nome do risco",
      "probabilidade": "alta/media/baixa",
      "impacto_financeiro": 25000,
      "mitigacao": "Como mitigar"
    }
  ],
  "oportunidades": [
    {
      "oportunidade": "Nome da oportunidade",
      "ganho_potencial": 35000,
      "viabilidade": "alta/media/baixa",
      "acao_requerida": "O que fazer"
    }
  ],
  "comparacao_mercado": {
    "preco_proposto_vs_media": 5.2,
    "margem_proposta_vs_historica": -3.1,
    "posicionamento": "competitivo/premium/agressivo"
  },
  "recomendacoes_otimizacao": [
    {
      "area": "Custos/Prazo/Margem/Negociação",
      "recomendacao": "Descrição específica",
      "impacto_estimado": "+R$ 15.000 ou +2% margem",
      "prioridade": "alta/media/baixa"
    }
  ],
  "fluxo_caixa_previsto": {
    "entrada_total": 500000,
    "saidas_estimadas": [
      { "descricao": "Materiais", "valor": 200000, "mes": 1 },
      { "descricao": "Mão de obra", "valor": 80000, "mes": 2 }
    ],
    "necessidade_capital_giro": 150000
  }
}

IMPORTANTE:
- Base a análise em dados históricos reais
- Considere sazonalidade e tendências de mercado
- Seja conservador nas previsões
- Identifique riscos ocultos
- Forneça recomendações práticas e acionáveis`;

    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          previsao_rentabilidade: {
            type: "object",
            properties: {
              cenario_otimista: {
                type: "object",
                properties: {
                  probabilidade: { type: "number" },
                  lucro_previsto: { type: "number" },
                  margem_prevista: { type: "number" },
                  fatores: { type: "array", items: { type: "string" } }
                }
              },
              cenario_realista: {
                type: "object",
                properties: {
                  probabilidade: { type: "number" },
                  lucro_previsto: { type: "number" },
                  margem_prevista: { type: "number" },
                  fatores: { type: "array", items: { type: "string" } }
                }
              },
              cenario_pessimista: {
                type: "object",
                properties: {
                  probabilidade: { type: "number" },
                  lucro_previsto: { type: "number" },
                  margem_prevista: { type: "number" },
                  fatores: { type: "array", items: { type: "string" } }
                }
              }
            }
          },
          riscos_financeiros: {
            type: "array",
            items: {
              type: "object",
              properties: {
                risco: { type: "string" },
                probabilidade: { type: "string" },
                impacto_financeiro: { type: "number" },
                mitigacao: { type: "string" }
              }
            }
          },
          oportunidades: {
            type: "array",
            items: {
              type: "object",
              properties: {
                oportunidade: { type: "string" },
                ganho_potencial: { type: "number" },
                viabilidade: { type: "string" },
                acao_requerida: { type: "string" }
              }
            }
          },
          comparacao_mercado: {
            type: "object",
            properties: {
              preco_proposto_vs_media: { type: "number" },
              margem_proposta_vs_historica: { type: "number" },
              posicionamento: { type: "string" }
            }
          },
          recomendacoes_otimizacao: {
            type: "array",
            items: {
              type: "object",
              properties: {
                area: { type: "string" },
                recomendacao: { type: "string" },
                impacto_estimado: { type: "string" },
                prioridade: { type: "string" }
              }
            }
          },
          fluxo_caixa_previsto: {
            type: "object",
            properties: {
              entrada_total: { type: "number" },
              saidas_estimadas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    descricao: { type: "string" },
                    valor: { type: "number" },
                    mes: { type: "number" }
                  }
                }
              },
              necessidade_capital_giro: { type: "number" }
            }
          }
        }
      }
    });

    setAnalise(resultado);
    setIsAnalyzing(false);
  };

  if (!analise) {
    return (
      <Card className="border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Análise Preditiva de Rentabilidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-slate-600 mb-4">
              Preveja lucro, margem e riscos financeiros baseado em histórico de projetos
            </p>
            <Button
              onClick={analisarRentabilidade}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Prever Rentabilidade
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
      {/* Cenários de Rentabilidade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-emerald-900">Otimista</span>
              <Badge className="bg-emerald-600 text-white">{analise.previsao_rentabilidade?.cenario_otimista?.probabilidade}%</Badge>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              R$ {analise.previsao_rentabilidade?.cenario_otimista?.lucro_previsto?.toLocaleString('pt-BR')}
            </p>
            <p className="text-sm text-emerald-700">
              Margem: {analise.previsao_rentabilidade?.cenario_otimista?.margem_prevista?.toFixed(1)}%
            </p>
            <ul className="mt-2 space-y-1">
              {analise.previsao_rentabilidade?.cenario_otimista?.fatores?.map((f, i) => (
                <li key={i} className="text-xs text-emerald-800">• {f}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-blue-900">Realista</span>
              <Badge className="bg-blue-600 text-white">{analise.previsao_rentabilidade?.cenario_realista?.probabilidade}%</Badge>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              R$ {analise.previsao_rentabilidade?.cenario_realista?.lucro_previsto?.toLocaleString('pt-BR')}
            </p>
            <p className="text-sm text-blue-700">
              Margem: {analise.previsao_rentabilidade?.cenario_realista?.margem_prevista?.toFixed(1)}%
            </p>
            <ul className="mt-2 space-y-1">
              {analise.previsao_rentabilidade?.cenario_realista?.fatores?.map((f, i) => (
                <li key={i} className="text-xs text-blue-800">• {f}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-red-900">Pessimista</span>
              <Badge className="bg-red-600 text-white">{analise.previsao_rentabilidade?.cenario_pessimista?.probabilidade}%</Badge>
            </div>
            <p className="text-2xl font-bold text-red-600">
              R$ {analise.previsao_rentabilidade?.cenario_pessimista?.lucro_previsto?.toLocaleString('pt-BR')}
            </p>
            <p className="text-sm text-red-700">
              Margem: {analise.previsao_rentabilidade?.cenario_pessimista?.margem_prevista?.toFixed(1)}%
            </p>
            <ul className="mt-2 space-y-1">
              {analise.previsao_rentabilidade?.cenario_pessimista?.fatores?.map((f, i) => (
                <li key={i} className="text-xs text-red-800">• {f}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Riscos e Oportunidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              Riscos Financeiros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analise.riscos_financeiros?.map((risco, idx) => (
                <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-sm">{risco.risco}</h4>
                    <Badge variant="outline" className="text-xs">
                      {risco.probabilidade}
                    </Badge>
                  </div>
                  <p className="text-sm text-red-600 font-medium mb-1">
                    Impacto: -R$ {risco.impacto_financeiro?.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-slate-600"><strong>Mitigação:</strong> {risco.mitigacao}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Oportunidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analise.oportunidades?.map((op, idx) => (
                <div key={idx} className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-sm">{op.oportunidade}</h4>
                    <Badge variant="outline" className="text-xs text-emerald-700">
                      {op.viabilidade}
                    </Badge>
                  </div>
                  <p className="text-sm text-emerald-600 font-medium mb-1">
                    Ganho: +R$ {op.ganho_potencial?.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs text-slate-600"><strong>Ação:</strong> {op.acao_requerida}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparação com Mercado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-600" />
            Posicionamento de Mercado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Preço vs Média</p>
              <p className={`text-xl font-bold ${analise.comparacao_mercado?.preco_proposto_vs_media > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                {analise.comparacao_mercado?.preco_proposto_vs_media > 0 ? '+' : ''}
                {analise.comparacao_mercado?.preco_proposto_vs_media?.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Margem vs Histórico</p>
              <p className={`text-xl font-bold ${analise.comparacao_mercado?.margem_proposta_vs_historica > 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                {analise.comparacao_mercado?.margem_proposta_vs_historica > 0 ? '+' : ''}
                {analise.comparacao_mercado?.margem_proposta_vs_historica?.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600">Posicionamento</p>
              <p className="text-lg font-bold text-blue-900 capitalize">
                {analise.comparacao_mercado?.posicionamento}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recomendações de Otimização */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-600" />
            Recomendações de Otimização
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analise.recomendacoes_otimizacao?.map((rec, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${
                rec.prioridade === 'alta' ? 'bg-red-50 border-red-200' :
                rec.prioridade === 'media' ? 'bg-yellow-50 border-yellow-200' :
                'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <Badge className="text-xs mb-1">{rec.area}</Badge>
                    <p className="text-sm font-medium">{rec.recomendacao}</p>
                  </div>
                  <Badge variant="outline" className={`text-xs ${
                    rec.prioridade === 'alta' ? 'border-red-500 text-red-700' :
                    rec.prioridade === 'media' ? 'border-yellow-500 text-yellow-700' :
                    'border-slate-400 text-slate-700'
                  }`}>
                    {rec.prioridade}
                  </Badge>
                </div>
                <p className="text-xs text-emerald-700 font-medium">
                  Impacto: {rec.impacto_estimado}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fluxo de Caixa */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            Previsão de Fluxo de Caixa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
              <span className="text-sm font-medium">Entrada Total Prevista</span>
              <span className="text-lg font-bold text-emerald-600">
                R$ {analise.fluxo_caixa_previsto?.entrada_total?.toLocaleString('pt-BR')}
              </span>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">Saídas Estimadas:</p>
              {analise.fluxo_caixa_previsto?.saidas_estimadas?.map((saida, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded">
                  <span className="text-slate-600">{saida.descricao} (Mês {saida.mes})</span>
                  <span className="font-medium text-orange-600">
                    -R$ {saida.valor?.toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border-t-2 border-orange-200">
              <span className="text-sm font-semibold text-orange-900">Capital de Giro Necessário</span>
              <span className="text-lg font-bold text-orange-600">
                R$ {analise.fluxo_caixa_previsto?.necessidade_capital_giro?.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setAnalise(null)}
        className="w-full"
      >
        Nova Análise
      </Button>
    </div>
  );
}

// Ajustes Dinâmicos em Tempo Real
export function AjustesDinamicosTempoReal({ orcamento, orcamentos, onAplicarAjuste }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sugestoes, setSugestoes] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const analisarEmTempoReal = async () => {
    setIsAnalyzing(true);

    const agora = new Date();
    const recentes = orcamentos.filter(o => {
      const diff = (agora - new Date(o.created_date)) / (1000 * 60 * 60 * 24);
      return diff <= 30 && o.id !== orcamento.id;
    });

    const aprovadosRecentes = recentes.filter(o => o.status === 'aprovado');
    const recusadosRecentes = recentes.filter(o => o.status === 'recusado');

    const prompt = `Você é um analista de pricing em tempo real.

═══════════════════════════════════════════
⚡ CONTEXTO DE MERCADO ATUAL (últimos 30 dias)
═══════════════════════════════════════════
Total de Orçamentos: ${recentes.length}
Aprovados: ${aprovadosRecentes.length}
Recusados: ${recusadosRecentes.length}
Taxa de Conversão: ${recentes.length > 0 ? ((aprovadosRecentes.length / recentes.length) * 100).toFixed(1) : 0}%

**APROVADOS RECENTEMENTE:**
${aprovadosRecentes.slice(0, 5).map(o => `
• ${o.cliente_nome}
  Valor: R$ ${o.valor_venda?.toLocaleString('pt-BR')}
  Preço/kg: R$ ${o.preco_por_kg?.toFixed(2)}
  Margem: ${o.margem_lucro?.toFixed(1)}%
`).join('\n')}

**RECUSADOS RECENTEMENTE:**
${recusadosRecentes.slice(0, 3).map(o => `
• ${o.cliente_nome}
  Valor: R$ ${o.valor_venda?.toLocaleString('pt-BR')}
  Preço/kg: R$ ${o.preco_por_kg?.toFixed(2)}
  Margem: ${o.margem_lucro?.toFixed(1)}%
`).join('\n')}

═══════════════════════════════════════════
🎯 ORÇAMENTO ATUAL
═══════════════════════════════════════════
Cliente: ${orcamento.cliente_nome}
Valor Atual: R$ ${orcamento.valor_venda?.toLocaleString('pt-BR')}
Preço/kg: R$ ${orcamento.preco_por_kg?.toFixed(2)}
Margem: ${orcamento.margem_lucro?.toFixed(1)}%
Status: ${orcamento.status}
Dias desde envio: ${orcamento.data_envio ? Math.floor((agora - new Date(orcamento.data_envio)) / (1000 * 60 * 60 * 24)) : 0}

═══════════════════════════════════════════
⚡ ANÁLISE REQUERIDA
═══════════════════════════════════════════

Forneça ajustes dinâmicos baseados no mercado atual em JSON:

{
  "urgencia": "baixa/media/alta/critica",
  "risco_perda": 45,
  "ajustes_preco": [
    {
      "tipo": "desconto/aumento/manter",
      "valor_sugerido": 450000,
      "percentual": -5.5,
      "razao": "Explicação baseada em dados recentes",
      "confianca": "alta/media/baixa",
      "impacto_conversao": "+15%"
    }
  ],
  "condicoes_comerciais": [
    {
      "condicao": "Pagamento facilitado",
      "descricao": "30/30/40 ao invés de 30/40/30",
      "vantagem": "Aumenta taxa de aprovação em mercado atual"
    }
  ],
  "timing": {
    "melhor_momento_contato": "manhã/tarde/agora",
    "proximo_followup_em": 2,
    "razao": "Por que esse timing"
  },
  "insights_mercado": [
    "Insight 1 baseado em tendências recentes",
    "Insight 2 sobre comportamento de clientes"
  ],
  "acao_imediata_sugerida": "Descrição de ação urgente se necessário"
}

IMPORTANTE:
- Considere apenas orçamentos dos últimos 30 dias
- Foque em tendências de mercado ATUAIS
- Seja agressivo se taxa de conversão estiver baixa
- Considere urgência baseada em tempo desde envio`;

    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          urgencia: { type: "string" },
          risco_perda: { type: "number" },
          ajustes_preco: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tipo: { type: "string" },
                valor_sugerido: { type: "number" },
                percentual: { type: "number" },
                razao: { type: "string" },
                confianca: { type: "string" },
                impacto_conversao: { type: "string" }
              }
            }
          },
          condicoes_comerciais: {
            type: "array",
            items: {
              type: "object",
              properties: {
                condicao: { type: "string" },
                descricao: { type: "string" },
                vantagem: { type: "string" }
              }
            }
          },
          timing: {
            type: "object",
            properties: {
              melhor_momento_contato: { type: "string" },
              proximo_followup_em: { type: "number" },
              razao: { type: "string" }
            }
          },
          insights_mercado: {
            type: "array",
            items: { type: "string" }
          },
          acao_imediata_sugerida: { type: "string" }
        }
      }
    });

    setSugestoes(resultado);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        analisarEmTempoReal();
      }, 300000); // 5 minutos
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (!sugestoes) {
    return (
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-orange-600" />
            Ajustes Dinâmicos em Tempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-slate-600 mb-4">
              Receba sugestões de ajuste baseadas em tendências de mercado atuais
            </p>
            <Button
              onClick={analisarEmTempoReal}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-orange-500 to-orange-600"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando Mercado...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Analisar Agora
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const urgenciaColor = {
    baixa: 'bg-green-100 text-green-800',
    media: 'bg-yellow-100 text-yellow-800',
    alta: 'bg-orange-100 text-orange-800',
    critica: 'bg-red-100 text-red-800'
  }[sugestoes.urgencia] || 'bg-slate-100 text-slate-800';

  return (
    <div className="space-y-4">
      {/* Status e Urgência */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className={urgenciaColor}>
            Urgência: {sugestoes.urgencia}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Risco de Perda:</span>
            <Progress value={sugestoes.risco_perda} className="w-32 h-2" />
            <span className="text-sm font-bold text-red-600">{sugestoes.risco_perda}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-atualizar (5min)
          </label>
        </div>
      </div>

      {/* Ação Imediata */}
      {sugestoes.acao_imediata_sugerida && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 mb-1">Ação Imediata Sugerida</p>
                <p className="text-sm text-red-800">{sugestoes.acao_imediata_sugerida}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ajustes de Preço */}
      {sugestoes.ajustes_preco?.map((ajuste, idx) => (
        <Card key={idx} className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {ajuste.tipo === 'desconto' && <TrendingDown className="h-5 w-5 text-red-600" />}
                  {ajuste.tipo === 'aumento' && <TrendingUp className="h-5 w-5 text-green-600" />}
                  {ajuste.tipo === 'manter' && <Target className="h-5 w-5 text-blue-600" />}
                  <h4 className="font-semibold">Ajuste de Preço Sugerido</h4>
                </div>
                <p className="text-sm text-slate-600 mb-2">{ajuste.razao}</p>
              </div>
              <Badge className={`${
                ajuste.confianca === 'alta' ? 'bg-emerald-600' :
                ajuste.confianca === 'media' ? 'bg-yellow-600' :
                'bg-slate-600'
              } text-white`}>
                {ajuste.confianca}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Valor Sugerido</p>
                <p className="text-lg font-bold text-slate-900">
                  R$ {ajuste.valor_sugerido?.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-600">Ajuste</p>
                <p className={`text-lg font-bold ${ajuste.percentual < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {ajuste.percentual > 0 ? '+' : ''}{ajuste.percentual?.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs text-emerald-600">Impacto Conversão</p>
                <p className="text-lg font-bold text-emerald-700">
                  {ajuste.impacto_conversao}
                </p>
              </div>
            </div>

            {onAplicarAjuste && (
              <Button
                onClick={() => onAplicarAjuste(ajuste)}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600"
                size="sm"
              >
                Aplicar Ajuste
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Condições Comerciais */}
      {sugestoes.condicoes_comerciais?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Condições Comerciais Sugeridas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sugestoes.condicoes_comerciais.map((cond, idx) => (
                <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="font-semibold text-sm mb-1">{cond.condicao}</p>
                  <p className="text-xs text-slate-600 mb-1">{cond.descricao}</p>
                  <p className="text-xs text-blue-700">✓ {cond.vantagem}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timing */}
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-purple-600" />
            Timing Recomendado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-600 mb-1">Melhor Momento para Contato</p>
              <p className="font-bold text-purple-900 capitalize">{sugestoes.timing?.melhor_momento_contato}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-600 mb-1">Próximo Follow-up</p>
              <p className="font-bold text-purple-900">Em {sugestoes.timing?.proximo_followup_em} dia(s)</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">{sugestoes.timing?.razao}</p>
        </CardContent>
      </Card>

      {/* Insights de Mercado */}
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader>
          <CardTitle className="text-sm">Insights de Mercado</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {sugestoes.insights_mercado?.map((insight, idx) => (
              <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setSugestoes(null)}
        className="w-full"
      >
        Analisar Novamente
      </Button>
    </div>
  );
}

// Follow-ups Personalizados e Automatizados
export function FollowUpsPersonalizados({ orcamentos, clientes }) {
  const [sending, setSending] = useState(false);
  const [selectedOrcamentos, setSelectedOrcamentos] = useState([]);
  const [customMessage, setCustomMessage] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const pendentes = orcamentos.filter(o => 
    ['enviado', 'em_negociacao'].includes(o.status) && o.cliente_email
  );

  const enviarFollowUpsPersonalizados = async () => {
    setSending(true);

    const orcsParaEnviar = selectedOrcamentos.length > 0 
      ? pendentes.filter(o => selectedOrcamentos.includes(o.id))
      : pendentes;

    let enviados = 0;

    for (const orc of orcsParaEnviar) {
      const diasDesdeEnvio = orc.data_envio 
        ? Math.floor((new Date() - new Date(orc.data_envio)) / (1000 * 60 * 60 * 24))
        : 0;

      if (diasDesdeEnvio < 1) continue;

      // Buscar histórico do cliente
      const orcamentosCliente = orcamentos.filter(o => 
        o.cliente_nome === orc.cliente_nome
      );
      
      const clienteInfo = clientes.find(c => c.nome === orc.cliente_nome);

      const prompt = `Você é um especialista em comunicação comercial B2B.

CLIENTE: ${orc.cliente_nome}
${clienteInfo ? `Segmento: ${clienteInfo.segmento}` : ''}
Histórico com a empresa: ${orcamentosCliente.length} orçamento(s)
Orçamentos aprovados: ${orcamentosCliente.filter(o => o.status === 'aprovado').length}

ORÇAMENTO ATUAL:
Número: ${orc.numero}
Projeto: ${orc.projeto_nome}
Valor: R$ ${orc.valor_venda?.toLocaleString('pt-BR')}
Dias desde envio: ${diasDesdeEnvio}
Status: ${orc.status}

${customMessage ? `ORIENTAÇÃO ADICIONAL:\n${customMessage}\n` : ''}

Gere um email de follow-up PERSONALIZADO e PERSUASIVO:

{
  "assunto": "Assunto atrativo e específico",
  "corpo": "Email completo em HTML com \\n para quebras de linha, incluindo:\\n- Saudação personalizada\\n- Referência ao projeto específico\\n- Valor agregado e diferenciais\\n- Call-to-action claro\\n- Assinatura profissional\\n\\nImportante: Use tom consultivo, não insistente. Foque em agregar valor."
}`;

      try {
        const emailGerado = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              assunto: { type: "string" },
              corpo: { type: "string" }
            }
          }
        });

        await base44.integrations.Core.SendEmail({
          to: orc.cliente_email,
          subject: emailGerado.assunto,
          body: emailGerado.corpo.replace(/\\n/g, '\n')
        });

        enviados++;
      } catch (error) {
        console.error(`Erro ao enviar para ${orc.cliente_nome}:`, error);
      }

      // Pequeno delay entre envios
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setSending(false);
    setSelectedOrcamentos([]);
    setCustomMessage('');
    setShowCustom(false);
    toast.success(`${enviados} follow-up(s) personalizado(s) enviado(s)!`);
  };

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-blue-600" />
          Follow-ups Personalizados com IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900 mb-2">
              <strong>{pendentes.length} orçamento(s) pendente(s)</strong> aguardando retorno
            </p>
            <p className="text-xs text-blue-700">
              A IA gerará mensagens personalizadas baseadas no histórico e perfil de cada cliente
            </p>
          </div>

          {pendentes.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendentes.map((orc) => {
                const diasDesdeEnvio = orc.data_envio 
                  ? Math.floor((new Date() - new Date(orc.data_envio)) / (1000 * 60 * 60 * 24))
                  : 0;
                
                const isSelected = selectedOrcamentos.includes(orc.id);

                return (
                  <div 
                    key={orc.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected ? 'bg-blue-100 border-blue-300' : 'bg-slate-50 border-slate-200 hover:border-blue-200'
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedOrcamentos(selectedOrcamentos.filter(id => id !== orc.id));
                      } else {
                        setSelectedOrcamentos([...selectedOrcamentos, orc.id]);
                      }
                    }}
                  >
                    <div>
                      <p className="font-medium text-slate-900">{orc.cliente_nome}</p>
                      <p className="text-xs text-slate-500">
                        {orc.numero} • {orc.projeto_nome} • {diasDesdeEnvio} dia(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        R$ {(orc.valor_venda / 1000).toFixed(0)}k
                      </Badge>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCustom(!showCustom)}
              className="w-full"
            >
              {showCustom ? 'Ocultar' : 'Adicionar'} Orientação Personalizada
            </Button>

            {showCustom && (
              <Textarea
                placeholder="Ex: Mencione que temos disponibilidade imediata para este projeto..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                className="text-sm"
              />
            )}
          </div>

          <Button
            onClick={enviarFollowUpsPersonalizados}
            disabled={sending || pendentes.length === 0}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando e Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {selectedOrcamentos.length > 0 
                  ? `Enviar para ${selectedOrcamentos.length} Selecionado(s)`
                  : `Enviar para Todos (${pendentes.length})`
                }
              </>
            )}
          </Button>

          <p className="text-xs text-center text-slate-500">
            Cada email será personalizado com base no histórico e perfil do cliente
          </p>
        </div>
      </CardContent>
    </Card>
  );
}