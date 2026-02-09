import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Clock,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lightbulb
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function AnaliseProbabilidadeAprovacao({ orcamento, historico }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analise, setAnalise] = useState(null);

  const analisarProbabilidade = async () => {
    setIsAnalyzing(true);

    const orcamentosPassados = historico.filter(o => 
      o.id !== orcamento.id && o.status !== 'rascunho'
    );

    const aprovados = orcamentosPassados.filter(o => o.status === 'aprovado');
    const recusados = orcamentosPassados.filter(o => o.status === 'recusado');

    const prompt = `Você é um especialista em análise de propostas comerciais e precificação.

═══════════════════════════════════════════
📊 HISTÓRICO DE ORÇAMENTOS
═══════════════════════════════════════════
Total de orçamentos: ${orcamentosPassados.length}
Aprovados: ${aprovados.length} (${((aprovados.length / orcamentosPassados.length) * 100).toFixed(1)}%)
Recusados: ${recusados.length} (${((recusados.length / orcamentosPassados.length) * 100).toFixed(1)}%)

ORÇAMENTOS APROVADOS (últimos 10):
${aprovados.slice(-10).map((o, i) => `
${i + 1}. Cliente: ${o.cliente_nome}
   Área: ${o.area}m² | Peso: ${(o.peso_estimado / 1000).toFixed(1)}ton
   Valor: R$ ${o.valor_venda?.toLocaleString('pt-BR')}
   Preço/kg: R$ ${o.preco_por_kg?.toFixed(2)}/kg
   Margem: ${o.margem_lucro?.toFixed(1)}%
   Prazo: ${o.prazo_fabricacao || 0}+${o.prazo_montagem || 0} dias
`).join('\n')}

ORÇAMENTOS RECUSADOS (últimos 5):
${recusados.slice(-5).map((o, i) => `
${i + 1}. Cliente: ${o.cliente_nome}
   Área: ${o.area}m² | Peso: ${(o.peso_estimado / 1000).toFixed(1)}ton
   Valor: R$ ${o.valor_venda?.toLocaleString('pt-BR')}
   Preço/kg: R$ ${o.preco_por_kg?.toFixed(2)}/kg
   Margem: ${o.margem_lucro?.toFixed(1)}%
`).join('\n')}

═══════════════════════════════════════════
🎯 ORÇAMENTO ATUAL EM ANÁLISE
═══════════════════════════════════════════
Cliente: ${orcamento.cliente_nome}
Projeto: ${orcamento.projeto_nome}
Área: ${orcamento.area}m²
Peso: ${(orcamento.peso_estimado / 1000).toFixed(2)} toneladas
Valor Total: R$ ${orcamento.valor_venda?.toLocaleString('pt-BR')}
Preço/kg: R$ ${orcamento.preco_por_kg?.toFixed(2)}/kg
Preço/m²: R$ ${(orcamento.valor_venda / orcamento.area).toFixed(2)}/m²
Margem de Lucro: ${orcamento.margem_lucro?.toFixed(1)}%
Prazo Total: ${(orcamento.prazo_fabricacao || 0) + (orcamento.prazo_montagem || 0)} dias

Com base no histórico e nos dados atuais, forneça uma análise em JSON:

{
  "probabilidade_aprovacao": 75,
  "nivel_confianca": "alto/medio/baixo",
  "fatores_positivos": [
    {
      "fator": "Nome do fator",
      "impacto": "Descrição do impacto positivo",
      "peso": 8
    }
  ],
  "fatores_risco": [
    {
      "fator": "Nome do fator de risco",
      "impacto": "Descrição do impacto negativo",
      "peso": 6
    }
  ],
  "comparacao_mercado": {
    "preco_medio_aprovados": 12.50,
    "preco_atual": 13.20,
    "desvio_percentual": 5.6,
    "posicionamento": "acima/dentro/abaixo da média"
  },
  "recomendacao_geral": "Análise geral sobre a viabilidade de aprovação"
}

ANÁLISE REQUERIDA:
- Compare preço/kg com orçamentos aprovados similares
- Avalie margem de lucro em relação ao histórico
- Compare prazos oferecidos
- Identifique padrões de aprovação/rejeição
- Considere tamanho do projeto (área e peso)
- Seja específico e baseado em dados`;

    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          probabilidade_aprovacao: { type: "number" },
          nivel_confianca: { type: "string" },
          fatores_positivos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fator: { type: "string" },
                impacto: { type: "string" },
                peso: { type: "number" }
              }
            }
          },
          fatores_risco: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fator: { type: "string" },
                impacto: { type: "string" },
                peso: { type: "number" }
              }
            }
          },
          comparacao_mercado: {
            type: "object",
            properties: {
              preco_medio_aprovados: { type: "number" },
              preco_atual: { type: "number" },
              desvio_percentual: { type: "number" },
              posicionamento: { type: "string" }
            }
          },
          recomendacao_geral: { type: "string" }
        }
      }
    });

    setAnalise(resultado);
    setIsAnalyzing(false);
  };

  const getProbabilidadeColor = (prob) => {
    if (prob >= 70) return 'text-emerald-600';
    if (prob >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProbabilidadeBg = (prob) => {
    if (prob >= 70) return 'bg-emerald-100';
    if (prob >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  if (!analise) {
    return (
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-purple-600" />
            Análise de Probabilidade de Aprovação (IA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-slate-600 mb-4">
              Analise a probabilidade de aprovação baseada no histórico de orçamentos
            </p>
            <Button
              onClick={analisarProbabilidade}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-purple-500 to-purple-600"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analisar Probabilidade
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
      <Card className={`border-2 ${getProbabilidadeBg(analise.probabilidade_aprovacao)}`}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Target className={`h-8 w-8 ${getProbabilidadeColor(analise.probabilidade_aprovacao)}`} />
              <div>
                <p className="text-sm text-slate-600">Probabilidade de Aprovação</p>
                <p className={`text-4xl font-bold ${getProbabilidadeColor(analise.probabilidade_aprovacao)}`}>
                  {analise.probabilidade_aprovacao}%
                </p>
              </div>
            </div>
            <Progress value={analise.probabilidade_aprovacao} className="h-3 mb-3" />
            <Badge variant="outline" className="text-xs">
              Confiança: {analise.nivel_confianca}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Fatores Positivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analise.fatores_positivos?.map((fator, idx) => (
                <div key={idx} className="p-3 bg-emerald-50 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-sm text-emerald-900">{fator.fator}</h4>
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                      +{fator.peso}
                    </Badge>
                  </div>
                  <p className="text-xs text-emerald-700">{fator.impacto}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Fatores de Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analise.fatores_risco?.map((fator, idx) => (
                <div key={idx} className="p-3 bg-red-50 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-sm text-red-900">{fator.fator}</h4>
                    <Badge className="bg-red-100 text-red-700 text-xs">
                      -{fator.peso}
                    </Badge>
                  </div>
                  <p className="text-xs text-red-700">{fator.impacto}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-600" />
            Comparação com Mercado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">Preço Médio Aprovados</p>
              <p className="text-lg font-bold text-slate-900">
                R$ {analise.comparacao_mercado?.preco_medio_aprovados?.toFixed(2)}/kg
              </p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600">Preço Atual</p>
              <p className="text-lg font-bold text-blue-900">
                R$ {analise.comparacao_mercado?.preco_atual?.toFixed(2)}/kg
              </p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-xs text-orange-600">Desvio</p>
              <p className="text-lg font-bold text-orange-900">
                {analise.comparacao_mercado?.desvio_percentual > 0 ? '+' : ''}
                {analise.comparacao_mercado?.desvio_percentual?.toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 text-center">
            Posicionamento: <span className="font-semibold">{analise.comparacao_mercado?.posicionamento}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-900 leading-relaxed">
            <strong>Recomendação:</strong> {analise.recomendacao_geral}
          </p>
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

export function SugestoesOtimizacao({ orcamento, historico }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [sugestoes, setSugestoes] = useState(null);

  const gerarSugestoes = async () => {
    setIsGenerating(true);

    const aprovados = historico.filter(o => o.status === 'aprovado');
    const mediaPrecoAprovado = aprovados.reduce((acc, o) => acc + (o.preco_por_kg || 0), 0) / (aprovados.length || 1);
    const mediaMargemAprovada = aprovados.reduce((acc, o) => acc + (o.margem_lucro || 0), 0) / (aprovados.length || 1);
    const mediaPrazoAprovado = aprovados.reduce((acc, o) => acc + ((o.prazo_fabricacao || 0) + (o.prazo_montagem || 0)), 0) / (aprovados.length || 1);

    const prompt = `Você é um especialista em estratégia comercial e otimização de propostas.

═══════════════════════════════════════════
📈 DADOS DO ORÇAMENTO ATUAL
═══════════════════════════════════════════
Cliente: ${orcamento.cliente_nome}
Valor: R$ ${orcamento.valor_venda?.toLocaleString('pt-BR')}
Preço/kg: R$ ${orcamento.preco_por_kg?.toFixed(2)}/kg
Margem: ${orcamento.margem_lucro?.toFixed(1)}%
Prazo Total: ${(orcamento.prazo_fabricacao || 0) + (orcamento.prazo_montagem || 0)} dias
Custo Total: R$ ${orcamento.custo_total?.toLocaleString('pt-BR')}

═══════════════════════════════════════════
📊 BENCHMARKS DE ORÇAMENTOS APROVADOS
═══════════════════════════════════════════
Preço/kg Médio: R$ ${mediaPrecoAprovado.toFixed(2)}/kg
Margem Média: ${mediaMargemAprovada.toFixed(1)}%
Prazo Médio: ${mediaPrazoAprovado.toFixed(0)} dias
Taxa de Conversão Geral: ${((aprovados.length / historico.length) * 100).toFixed(1)}%

Com base nestes dados, gere sugestões estratégicas em JSON:

{
  "ajustes_preco": [
    {
      "tipo": "reducao/aumento/manter",
      "valor_sugerido": 850000,
      "percentual_ajuste": -5.2,
      "justificativa": "Explicação detalhada",
      "impacto_probabilidade": "+12%",
      "impacto_margem": "-1.5%"
    }
  ],
  "otimizacoes_comerciais": [
    {
      "titulo": "Título da otimização",
      "descricao": "Descrição detalhada da estratégia",
      "implementacao": "Como aplicar",
      "beneficio_esperado": "Resultado esperado"
    }
  ],
  "condicoes_pagamento": [
    {
      "opcao": "Descrição da condição",
      "vantagem_cliente": "O que atrai o cliente",
      "vantagem_empresa": "Benefício para a empresa"
    }
  ],
  "estrategia_negociacao": {
    "abordagem_inicial": "Como iniciar a conversa",
    "pontos_flexiveis": ["Item 1", "Item 2"],
    "pontos_infleziveis": ["Item 1", "Item 2"],
    "argumentos_valor": ["Argumento 1", "Argumento 2"]
  }
}

IMPORTANTE:
- Sugira ajustes realistas baseados no histórico
- Mantenha a viabilidade financeira da empresa
- Foque em aumentar a taxa de conversão
- Considere a margem mínima aceitável
- Seja específico e prático`;

    const resultado = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          ajustes_preco: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tipo: { type: "string" },
                valor_sugerido: { type: "number" },
                percentual_ajuste: { type: "number" },
                justificativa: { type: "string" },
                impacto_probabilidade: { type: "string" },
                impacto_margem: { type: "string" }
              }
            }
          },
          otimizacoes_comerciais: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titulo: { type: "string" },
                descricao: { type: "string" },
                implementacao: { type: "string" },
                beneficio_esperado: { type: "string" }
              }
            }
          },
          condicoes_pagamento: {
            type: "array",
            items: {
              type: "object",
              properties: {
                opcao: { type: "string" },
                vantagem_cliente: { type: "string" },
                vantagem_empresa: { type: "string" }
              }
            }
          },
          estrategia_negociacao: {
            type: "object",
            properties: {
              abordagem_inicial: { type: "string" },
              pontos_flexiveis: { type: "array", items: { type: "string" } },
              pontos_infleziveis: { type: "array", items: { type: "string" } },
              argumentos_valor: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });

    setSugestoes(resultado);
    setIsGenerating(false);
  };

  if (!sugestoes) {
    return (
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-orange-600" />
            Sugestões de Otimização (IA)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-slate-600 mb-4">
              Receba sugestões inteligentes para aumentar a taxa de aprovação
            </p>
            <Button
              onClick={gerarSugestoes}
              disabled={isGenerating}
              className="bg-gradient-to-r from-orange-500 to-orange-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando Sugestões...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Sugestões
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
      {sugestoes.ajustes_preco?.map((ajuste, idx) => (
        <Card key={idx} className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              {ajuste.tipo === 'reducao' && <TrendingDown className="h-4 w-4 text-red-600" />}
              {ajuste.tipo === 'aumento' && <TrendingUp className="h-4 w-4 text-green-600" />}
              {ajuste.tipo === 'manter' && <Target className="h-4 w-4 text-blue-600" />}
              Ajuste de Preço Sugerido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">Valor Sugerido</p>
                <p className="text-lg font-bold text-slate-900">
                  R$ {ajuste.valor_sugerido?.toLocaleString('pt-BR')}
                </p>
                <Badge variant="outline" className="mt-1 text-xs">
                  {ajuste.percentual_ajuste > 0 ? '+' : ''}{ajuste.percentual_ajuste?.toFixed(1)}%
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Probabilidade:</span>
                  <span className="font-semibold text-emerald-600">{ajuste.impacto_probabilidade}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Margem:</span>
                  <span className="font-semibold text-orange-600">{ajuste.impacto_margem}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-600">{ajuste.justificativa}</p>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Otimizações Comerciais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sugestoes.otimizacoes_comerciais?.map((opt, idx) => (
              <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-sm mb-2">{opt.titulo}</h4>
                <p className="text-xs text-slate-600 mb-2">{opt.descricao}</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-slate-500 mb-1">Como Implementar:</p>
                    <p className="text-slate-700">{opt.implementacao}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Benefício Esperado:</p>
                    <p className="text-emerald-700 font-medium">{opt.beneficio_esperado}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Condições de Pagamento Sugeridas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sugestoes.condicoes_pagamento?.map((cond, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg border">
                <p className="font-semibold text-sm mb-2">{cond.opcao}</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-emerald-600 font-medium mb-1">✓ Cliente:</p>
                    <p className="text-slate-600">{cond.vantagem_cliente}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 font-medium mb-1">✓ Empresa:</p>
                    <p className="text-slate-600">{cond.vantagem_empresa}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-sm">Estratégia de Negociação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-purple-900 mb-1">Abordagem Inicial:</p>
            <p className="text-xs text-purple-800">{sugestoes.estrategia_negociacao?.abordagem_inicial}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-emerald-900 mb-1">Pontos Flexíveis:</p>
              <ul className="text-xs text-emerald-800 space-y-1">
                {sugestoes.estrategia_negociacao?.pontos_flexiveis?.map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-red-900 mb-1">Pontos Inflexíveis:</p>
              <ul className="text-xs text-red-800 space-y-1">
                {sugestoes.estrategia_negociacao?.pontos_infleziveis?.map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-900 mb-1">Argumentos de Valor:</p>
            <ul className="text-xs text-blue-800 space-y-1">
              {sugestoes.estrategia_negociacao?.argumentos_valor?.map((a, i) => (
                <li key={i}>• {a}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setSugestoes(null)}
        className="w-full"
      >
        Gerar Novas Sugestões
      </Button>
    </div>
  );
}

export function LembretesAutomaticos({ orcamentosPendentes }) {
  const [sending, setSending] = useState(false);

  const enviarLembretes = async () => {
    setSending(true);

    const pendentes = orcamentosPendentes.filter(o => 
      ['enviado', 'em_negociacao'].includes(o.status) && o.cliente_email
    );

    let enviados = 0;
    for (const orc of pendentes) {
      const diasDesdeEnvio = orc.data_envio 
        ? Math.floor((new Date() - new Date(orc.data_envio)) / (1000 * 60 * 60 * 24))
        : 0;

      if (diasDesdeEnvio >= 3) {
        try {
          await base44.integrations.Core.SendEmail({
            to: orc.cliente_email,
            subject: `Lembrete: Orçamento ${orc.numero} aguardando retorno`,
            body: `Prezado(a) ${orc.cliente_nome},

Gostaríamos de lembrar que o orçamento ${orc.numero} ainda aguarda seu retorno.

Detalhes da Proposta:
• Projeto: ${orc.projeto_nome}
• Valor: R$ ${orc.valor_venda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• Prazo: ${(orc.prazo_fabricacao || 0) + (orc.prazo_montagem || 0)} dias
• Validade: ${orc.validade ? new Date(orc.validade).toLocaleDateString('pt-BR') : 'A consultar'}

Estamos à disposição para esclarecer dúvidas ou discutir ajustes na proposta.

Link de aprovação: ${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}#/AprovacaoOrcamento?token=${orc.link_aprovacao}

Atenciosamente,
Equipe Comercial
Grupo Montex - Estruturas Metálicas`
          });
          enviados++;
        } catch (error) {
          console.error(`Erro ao enviar lembrete para ${orc.cliente_nome}:`, error);
        }
      }
    }

    setSending(false);
    toast.success(`${enviados} lembrete(s) enviado(s) com sucesso!`);
  };

  const pendentesParaLembrete = orcamentosPendentes.filter(o => {
    if (!['enviado', 'em_negociacao'].includes(o.status) || !o.cliente_email) return false;
    const diasDesdeEnvio = o.data_envio 
      ? Math.floor((new Date() - new Date(o.data_envio)) / (1000 * 60 * 60 * 24))
      : 0;
    return diasDesdeEnvio >= 3;
  });

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5 text-blue-600" />
          Lembretes Automáticos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">
                  {pendentesParaLembrete.length} orçamento(s) pendente(s)
                </span>
              </div>
              <Badge className="bg-blue-600 text-white">
                +3 dias sem retorno
              </Badge>
            </div>
            <p className="text-sm text-blue-700">
              Orçamentos enviados há mais de 3 dias sem resposta do cliente
            </p>
          </div>

          {pendentesParaLembrete.length > 0 && (
            <div className="space-y-2">
              {pendentesParaLembrete.slice(0, 5).map((orc) => {
                const diasDesdeEnvio = orc.data_envio 
                  ? Math.floor((new Date() - new Date(orc.data_envio)) / (1000 * 60 * 60 * 24))
                  : 0;
                return (
                  <div key={orc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{orc.cliente_nome}</p>
                      <p className="text-xs text-slate-500">
                        {orc.numero} • Enviado há {diasDesdeEnvio} dias
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      R$ {(orc.valor_venda / 1000).toFixed(0)}k
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

          <Button
            onClick={enviarLembretes}
            disabled={sending || pendentesParaLembrete.length === 0}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando Lembretes...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Enviar Lembretes Agora ({pendentesParaLembrete.length})
              </>
            )}
          </Button>

          <p className="text-xs text-slate-500 text-center">
            Lembretes são enviados apenas para orçamentos com 3+ dias sem retorno
          </p>
        </div>
      </CardContent>
    </Card>
  );
}