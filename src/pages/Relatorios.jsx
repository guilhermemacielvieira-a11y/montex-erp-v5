import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Sparkles,
  Calendar,
  Building2,
  Loader2,
  Eye,
  Download,
  MoreVertical,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tiposRelatorio = [
  { value: 'progresso_semanal', label: 'Progresso Semanal' },
  { value: 'fisico_financeiro', label: 'Físico-Financeiro' },
  { value: 'medicao', label: 'Medição' },
  { value: 'fotografico', label: 'Fotográfico' }
];

import PredictiveAnalysis from '../components/relatorios/PredictiveAnalysis';
import TaskAnalytics from '../components/relatorios/TaskAnalytics';
import CostPredictiveAnalysis from '../components/financeiro/CostPredictiveAnalysis';
import { addDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ProgressoFisicoFinanceiro,
  ComparacaoProjetosProgresso,
  DesempenhoCustosVsPlanejado,
  EvolutionTonelagem
} from '../components/relatorios/RelatoriosCharts';

export default function Relatorios() {
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedRelatorio, setSelectedRelatorio] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analisePreditiva, setAnalisePreditiva] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analiseIATarefas, setAnaliseIATarefas] = useState(null);
  const [formData, setFormData] = useState({
    projeto_id: '',
    tipo: 'progresso_semanal',
    periodo_inicio: '',
    periodo_fim: '',
    percentual_fabricacao: 0,
    percentual_montagem: 0,
    tonelagem_fabricada: 0,
    tonelagem_montada: 0,
    observacoes: ''
  });

  const queryClient = useQueryClient();

  const { data: relatorios = [], isLoading } = useQuery({
    queryKey: ['relatorios'],
    queryFn: () => base44.entities.Relatorio.list('-created_date', 100)
  });

  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => base44.entities.Projeto.list()
  });

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas'],
    queryFn: () => base44.entities.Tarefa.list('-created_date', 500)
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list()
  });

  const projetosAtivos = projetos.filter(p => 
    ['aprovado', 'em_fabricacao', 'em_montagem'].includes(p.status)
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Relatorio.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relatorios'] });
      setShowNewModal(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      projeto_id: '',
      tipo: 'progresso_semanal',
      periodo_inicio: '',
      periodo_fim: '',
      percentual_fabricacao: 0,
      percentual_montagem: 0,
      tonelagem_fabricada: 0,
      tonelagem_montada: 0,
      observacoes: ''
    });
  };

  const simularDadosProducao = (projeto) => {
    const pesoTotal = projeto?.peso_estimado || 50000;
    const diasDecorridos = Math.floor((new Date() - new Date(projeto?.data_inicio || Date.now())) / (1000 * 60 * 60 * 24));
    const prazoTotal = (projeto?.data_fim_prevista ? 
      Math.floor((new Date(projeto.data_fim_prevista) - new Date(projeto.data_inicio)) / (1000 * 60 * 60 * 24)) 
      : 120);
    
    return {
      producao_diaria_media: (pesoTotal / prazoTotal) * 0.8,
      dias_trabalhados: diasDecorridos,
      eficiencia_fabricacao: 85,
      eficiencia_montagem: 75,
      horas_homem_fabricacao: diasDecorridos * 8 * 5,
      horas_homem_montagem: diasDecorridos * 8 * 3,
      ocorrencias_seguranca: 0,
      paradas_equipamento: 0,
      consumo_eletrodo: (formData.tonelagem_fabricada || pesoTotal * 0.3) * 0.015,
      custo_realizado: (formData.tonelagem_fabricada || pesoTotal * 0.3) * 8.5 +
                      (formData.tonelagem_montada || pesoTotal * 0.1) * 12.0
    };
  };

  const handleGenerateTaskAnalyticsReport = async (analyticsData) => {
    const prompt = `Você é um especialista em gestão de projetos e análise de produtividade.

ANÁLISE COMPLETA DE TAREFAS:

═══════════════════════════════════════════
📊 PRODUTIVIDADE POR USUÁRIO
═══════════════════════════════════════════
${analyticsData.produtividade.map((u, i) => `
${i + 1}. ${u.nome}
   • Total de Tarefas: ${u.total}
   • Concluídas: ${u.concluidas} (${u.taxaConclusao.toFixed(1)}%)
   • Em Andamento: ${u.emAndamento}
   • Atrasadas: ${u.atrasadas}
   • Horas Trabalhadas: ${u.horasTrabalhadas}h de ${u.horasEstimadas}h estimadas
   • Eficiência: ${u.eficiencia.toFixed(1)}%
`).join('\n')}

═══════════════════════════════════════════
🎯 GARGALOS IDENTIFICADOS
═══════════════════════════════════════════
${analyticsData.gargalos.map((g, i) => `
${i + 1}. ${g.nome}
   • Total de Tarefas: ${g.total}
   • Bloqueadas: ${g.bloqueadas}
   • Atrasadas: ${g.atrasadas}
   • Sem Responsável: ${g.semResponsavel}
   • Progresso Médio: ${g.progressoMedio.toFixed(1)}%
   • Indicador de Risco: ${g.indicadorRisco.toFixed(1)}
`).join('\n')}

═══════════════════════════════════════════
⚠️ TAREFAS EM RISCO
═══════════════════════════════════════════
Total de tarefas em risco: ${analyticsData.tarefasRisco.length}
${analyticsData.tarefasRisco.slice(0, 10).map((t, i) => `
${i + 1}. ${t.titulo} (${t.projeto_nome})
   Status: ${t.status} | Prioridade: ${t.prioridade}
   ${t.data_fim ? `Prazo: ${format(new Date(t.data_fim), 'dd/MM/yyyy')}` : 'Sem prazo definido'}
`).join('\n')}

═══════════════════════════════════════════
📈 PREVISÕES DE CONCLUSÃO
═══════════════════════════════════════════
${analyticsData.previsoes.map((p, i) => `
${i + 1}. ${p.nome}
   • Progresso: ${p.percentualConcluido.toFixed(1)}% (${p.tarefasConcluidas}/${p.tarefasTotal})
   • Status: ${p.status}
   ${p.prazoEstimado ? `• Prazo Estimado: ${format(p.prazoEstimado, 'dd/MM/yyyy')} (${p.diasRestantes} dias)` : ''}
`).join('\n')}

Com base nestes dados, gere um relatório executivo completo em markdown contendo:

## 1. RESUMO EXECUTIVO
Análise geral da situação das tarefas e produtividade da equipe (2-3 parágrafos).

## 2. ANÁLISE DE PRODUTIVIDADE
- Ranking dos membros da equipe por desempenho
- Identificação de alta performance e pontos de atenção
- Análise de carga de trabalho e balanceamento

## 3. GARGALOS E PROBLEMAS CRÍTICOS
- Projetos com maior risco
- Tarefas bloqueadas e suas causas prováveis
- Áreas que necessitam intervenção urgente

## 4. PREVISÕES E PROJEÇÕES
- Estimativas de conclusão dos projetos
- Análise de viabilidade dos prazos
- Projetos que necessitam replaneamento

## 5. RECOMENDAÇÕES ESTRATÉGICAS
- Ações prioritárias para mitigar riscos
- Sugestões de realocação de recursos
- Melhorias de processo sugeridas

## 6. PLANO DE AÇÃO
- Lista de ações específicas com prazos
- Responsabilidades sugeridas
- Métricas de acompanhamento

Seja detalhado, específico e forneça insights acionáveis baseados apenas nos dados fornecidos.`;

    const relatorio = await base44.integrations.Core.InvokeLLM({
      prompt
    });

    setAnaliseIATarefas(relatorio);
  };

  const gerarAnalisePreditiva = async (relatorio, projeto) => {
    setIsAnalyzing(true);
    
    const relatoriosHistoricos = await base44.entities.Relatorio.filter(
      { projeto_id: projeto.id }, 
      '-created_date', 
      10
    );
    
    const historicoProgresso = relatoriosHistoricos.map(r => ({
      data: r.periodo_fim,
      fabricacao: r.percentual_fabricacao || 0,
      montagem: r.percentual_montagem || 0,
      progresso_medio: ((r.percentual_fabricacao || 0) + (r.percentual_montagem || 0)) / 2
    }));
    
    const progressoAtual = relatorio?.percentual_fabricacao || 0;
    const montagemAtual = relatorio?.percentual_montagem || 0;
    const progressoMedio = (progressoAtual + montagemAtual) / 2;
    
    const diasDecorridos = projeto.data_inicio 
      ? Math.floor((new Date() - new Date(projeto.data_inicio)) / (1000 * 60 * 60 * 24))
      : 30;
    const prazoTotal = projeto.data_fim_prevista && projeto.data_inicio
      ? Math.floor((new Date(projeto.data_fim_prevista) - new Date(projeto.data_inicio)) / (1000 * 60 * 60 * 24))
      : 120;
    
    const velocidadeMedia = progressoMedio / (diasDecorridos || 1);
    const diasRestantesRealista = Math.ceil((100 - progressoMedio) / (velocidadeMedia || 0.5));
    const diasRestantesOtimista = Math.ceil(diasRestantesRealista * 0.8);
    const diasRestantesPessimista = Math.ceil(diasRestantesRealista * 1.3);
    
    const prompt = `Você é um especialista em análise preditiva de projetos de construção metálica.

DADOS DO PROJETO:
• Nome: ${projeto.nome}
• Progresso Atual: Fabricação ${progressoAtual}%, Montagem ${montagemAtual}%
• Prazo Total: ${prazoTotal} dias
• Dias Decorridos: ${diasDecorridos} dias
• Velocidade Média: ${velocidadeMedia.toFixed(2)}% por dia

HISTÓRICO DE PROGRESSO (${historicoProgresso.length} relatórios):
${historicoProgresso.map((h, i) => `${i + 1}. ${h.data ? format(new Date(h.data), 'dd/MM/yy') : '-'}: ${h.progresso_medio.toFixed(1)}%`).join('\n')}

Com base nestes dados, forneça uma análise preditiva em JSON com a seguinte estrutura:
{
  "riscos": [
    {
      "tipo": "Nome do risco",
      "descricao": "Descrição detalhada",
      "nivel": "baixo/medio/alto",
      "impacto": "Descrição do impacto potencial"
    }
  ],
  "recomendacoes": [
    {
      "titulo": "Título da recomendação",
      "descricao": "Descrição detalhada da ação recomendada",
      "prazo": "Prazo sugerido para implementação"
    }
  ],
  "tendencias": {
    "fabricacao": {
      "direcao": "crescente/decrescente/estavel",
      "valor": "Descrição da tendência"
    },
    "montagem": {
      "direcao": "crescente/decrescente/estavel",
      "valor": "Descrição da tendência"
    }
  }
}

ANÁLISE REQUERIDA:
1. Identifique 2-5 riscos reais baseados nos dados (atrasos, baixa produtividade, desvios, etc)
2. Forneça 3-5 recomendações acionáveis e específicas
3. Analise tendências de fabricação e montagem

Seja específico, técnico e baseie tudo nos dados fornecidos.`;

    const analiseIA = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          riscos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tipo: { type: "string" },
                descricao: { type: "string" },
                nivel: { type: "string" },
                impacto: { type: "string" }
              }
            }
          },
          recomendacoes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titulo: { type: "string" },
                descricao: { type: "string" },
                prazo: { type: "string" }
              }
            }
          },
          tendencias: {
            type: "object",
            properties: {
              fabricacao: {
                type: "object",
                properties: {
                  direcao: { type: "string" },
                  valor: { type: "string" }
                }
              },
              montagem: {
                type: "object",
                properties: {
                  direcao: { type: "string" },
                  valor: { type: "string" }
                }
              }
            }
          }
        }
      }
    });
    
    const confianca = historicoProgresso.length >= 3 
      ? Math.min(95, 60 + (historicoProgresso.length * 5))
      : 50;
    
    const dataOtimista = format(addDays(new Date(), diasRestantesOtimista), 'dd/MM/yyyy');
    const dataRealista = format(addDays(new Date(), diasRestantesRealista), 'dd/MM/yyyy');
    const dataPessimista = format(addDays(new Date(), diasRestantesPessimista), 'dd/MM/yyyy');
    
    setAnalisePreditiva({
      ...analiseIA,
      previsao_conclusao: {
        otimista: dataOtimista,
        realista: dataRealista,
        pessimista: dataPessimista
      },
      dias_restantes: {
        otimista: diasRestantesOtimista,
        realista: diasRestantesRealista,
        pessimista: diasRestantesPessimista
      },
      confianca_previsao: confianca
    });
    
    setIsAnalyzing(false);
  };

  const gerarRelatorioComIA = async () => {
    if (!formData.projeto_id || !formData.periodo_inicio || !formData.periodo_fim) {
      return;
    }

    setIsGenerating(true);

    const projeto = projetos.find(p => p.id === formData.projeto_id);
    const tipoLabel = tiposRelatorio.find(t => t.value === formData.tipo)?.label;
    const dadosProducao = simularDadosProducao(projeto);
    
    const pesoTotal = projeto?.peso_estimado || 50000;
    const pesoFabricado = formData.tonelagem_fabricada || (pesoTotal * formData.percentual_fabricacao / 100);
    const pesoMontado = formData.tonelagem_montada || (pesoTotal * formData.percentual_montagem / 100);
    
    const diasDecorridos = Math.floor((new Date(formData.periodo_fim) - new Date(projeto?.data_inicio || formData.periodo_inicio)) / (1000 * 60 * 60 * 24));
    const prazoTotal = projeto?.data_fim_prevista ? 
      Math.floor((new Date(projeto.data_fim_prevista) - new Date(projeto.data_inicio)) / (1000 * 60 * 60 * 24)) 
      : 120;
    
    const percentualTempoDecorrido = (diasDecorridos / prazoTotal) * 100;
    const desvioFabricacao = formData.percentual_fabricacao - percentualTempoDecorrido;
    const desvioMontagem = formData.percentual_montagem - percentualTempoDecorrido;
    
    const relatoriosAnteriores = await base44.entities.Relatorio.filter({ projeto_id: formData.projeto_id }, '-created_date', 5);
    const historicoProgresso = relatoriosAnteriores.map(r => ({
      data: r.periodo_fim,
      fabricacao: r.percentual_fabricacao,
      montagem: r.percentual_montagem
    }));

    let promptBase = `Você é um engenheiro especialista em planejamento e controle de obras metálicas do Grupo Montex.

Analise os dados abaixo e gere um relatório ${tipoLabel} extremamente detalhado e profissional.

═══════════════════════════════════════════
📋 INFORMAÇÕES DO PROJETO
═══════════════════════════════════════════
• Nome: ${projeto?.nome || 'Não definido'}
• Cliente: ${projeto?.cliente_nome || 'Não definido'}
• Tipo: ${projeto?.tipo || 'Não definido'}
• Localização: ${projeto?.localizacao || 'Não definido'}
• Peso Total: ${(pesoTotal / 1000).toFixed(2)} toneladas
• Valor Contratado: R$ ${(projeto?.valor_contrato || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• Status: ${projeto?.status || 'Não definido'}

═══════════════════════════════════════════
📅 PERÍODO E CRONOGRAMA
═══════════════════════════════════════════
• Data de Início: ${projeto?.data_inicio ? format(new Date(projeto.data_inicio), 'dd/MM/yyyy') : '-'}
• Previsão de Término: ${projeto?.data_fim_prevista ? format(new Date(projeto.data_fim_prevista), 'dd/MM/yyyy') : '-'}
• Período do Relatório: ${format(new Date(formData.periodo_inicio), 'dd/MM/yyyy')} até ${format(new Date(formData.periodo_fim), 'dd/MM/yyyy')}
• Dias Decorridos: ${diasDecorridos} de ${prazoTotal} dias (${percentualTempoDecorrido.toFixed(1)}% do prazo)

═══════════════════════════════════════════
📊 PROGRESSO ATUAL (DADOS MONTEX PRODUÇÃO)
═══════════════════════════════════════════
• Fabricação: ${formData.percentual_fabricacao}% concluído
  - Peso Fabricado: ${(pesoFabricado / 1000).toFixed(2)} ton
  - Peso Restante: ${((pesoTotal - pesoFabricado) / 1000).toFixed(2)} ton
  - Desvio: ${desvioFabricacao > 0 ? '+' : ''}${desvioFabricacao.toFixed(1)}% ${desvioFabricacao > 0 ? '(adiantado)' : '(atrasado)'}
  
• Montagem: ${formData.percentual_montagem}% concluído
  - Peso Montado: ${(pesoMontado / 1000).toFixed(2)} ton
  - Peso Restante: ${((pesoTotal - pesoMontado) / 1000).toFixed(2)} ton
  - Desvio: ${desvioMontagem > 0 ? '+' : ''}${desvioMontagem.toFixed(1)}% ${desvioMontagem > 0 ? '(adiantado)' : '(atrasado)'}

═══════════════════════════════════════════
⚙️ DADOS DE PRODUÇÃO (SISTEMA MONTEX)
═══════════════════════════════════════════
• Produção Diária Média: ${dadosProducao.producao_diaria_media.toFixed(0)} kg/dia
• Eficiência Fabricação: ${dadosProducao.eficiencia_fabricacao.toFixed(1)}%
• Eficiência Montagem: ${dadosProducao.eficiencia_montagem.toFixed(1)}%
• Horas-Homem Fabricação: ${dadosProducao.horas_homem_fabricacao.toFixed(0)} h
• Horas-Homem Montagem: ${dadosProducao.horas_homem_montagem.toFixed(0)} h
• Consumo de Eletrodo: ${dadosProducao.consumo_eletrodo.toFixed(0)} kg
• Custo Realizado: R$ ${dadosProducao.custo_realizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

═══════════════════════════════════════════
🔍 INDICADORES E OCORRÊNCIAS
═══════════════════════════════════════════
• Ocorrências de Segurança: ${dadosProducao.ocorrencias_seguranca}
• Paradas de Equipamento: ${dadosProducao.paradas_equipamento}
• Dias Trabalhados no Período: ${dadosProducao.dias_trabalhados}

`;

    if (historicoProgresso.length > 0) {
      promptBase += `═══════════════════════════════════════════
📈 HISTÓRICO DE PROGRESSO (ÚLTIMOS 5 RELATÓRIOS)
═══════════════════════════════════════════
${historicoProgresso.map((h, i) => 
  `${i + 1}. ${h.data ? format(new Date(h.data), 'dd/MM/yyyy') : '-'}: Fab ${h.fabricacao}% | Mont ${h.montagem}%`
).join('\n')}

`;
    }

    if (formData.observacoes) {
      promptBase += `═══════════════════════════════════════════
📝 OBSERVAÇÕES REGISTRADAS NO PERÍODO
═══════════════════════════════════════════
${formData.observacoes}

`;
    }

    const promptFisicoFinanceiro = `${promptBase}
═══════════════════════════════════════════
🎯 ANÁLISE SOLICITADA: RELATÓRIO FÍSICO-FINANCEIRO
═══════════════════════════════════════════

Com base nos dados acima, gere um relatório físico-financeiro completo e profissional contendo:

## 1. RESUMO EXECUTIVO
- Situação geral do projeto (3-4 parágrafos)
- Principais destaques do período
- Status crítico de prazos e custos

## 2. ANÁLISE FÍSICO-FINANCEIRA DETALHADA

### 2.1 Progresso Físico
- Análise de fabricação (realizado x previsto)
- Análise de montagem (realizado x previsto)
- Gráfico conceitual de curva S (descreva a situação)
- Identificação de gargalos produtivos

### 2.2 Progresso Financeiro
- Custo previsto x realizado
- Análise de desvios de custo
- Projeção de custo final
- Índices de desempenho (IDP, IDC)

### 2.3 Correlação Físico-Financeira
- Análise do valor agregado
- Eficiência de custos vs cronograma
- Tendências e alertas

## 3. ANÁLISE DE DESVIOS E CAUSAS RAIZ
- Liste os principais desvios identificados
- Análise de causas (5 Porquês quando aplicável)
- Impactos no cronograma e orçamento
- Classificação de riscos (Alto/Médio/Baixo)

## 4. PREVISÕES E PROJEÇÕES (BASEADO EM IA)
- Previsão de conclusão de fabricação
- Previsão de conclusão de montagem
- Projeção de custo final
- Análise de cenários (otimista/realista/pessimista)
- Probabilidade de cumprimento do prazo

## 5. PLANO DE RECUPERAÇÃO (SE NECESSÁRIO)
- Ações corretivas recomendadas
- Cronograma de recuperação
- Recursos adicionais necessários
- Responsáveis e prazos

## 6. INDICADORES DE DESEMPENHO (KPIs)
- Produtividade (kg/dia, kg/h-h)
- Qualidade (índice de retrabalho)
- Segurança (taxa de acidentes)
- Eficiência de equipamentos

## 7. PRÓXIMAS ETAPAS E RECOMENDAÇÕES
- Atividades planejadas para próximo período
- Pontos de atenção críticos
- Decisões necessárias da gestão
- Recomendações técnicas

## 8. CONCLUSÃO E PARECER TÉCNICO
- Avaliação geral do engenheiro
- Classificação de saúde do projeto (Verde/Amarelo/Vermelho)
- Confiança na entrega

Use formatação markdown, seja técnico mas claro, e baseie todas as análises nos dados fornecidos.`;

    const promptMedicao = `${promptBase}
═══════════════════════════════════════════
🎯 ANÁLISE SOLICITADA: RELATÓRIO DE MEDIÇÃO
═══════════════════════════════════════════

Gere um relatório de medição detalhado para faturamento contendo:

## 1. RESUMO DA MEDIÇÃO
- Período de medição
- Valor total da medição
- Percentual medido acumulado

## 2. SERVIÇOS EXECUTADOS E MEDIDOS

### 2.1 Fabricação
- Tonelagem fabricada no período
- Tonelagem acumulada
- Valor unitário (R$/kg)
- Valor total da fabricação

### 2.2 Montagem
- Tonelagem montada no período
- Tonelagem acumulada
- Valor unitário (R$/kg)
- Valor total da montagem

### 2.3 Outros Serviços
- Pintura (m²)
- Transporte (viagens)
- Serviços adicionais

## 3. MEMÓRIA DE CÁLCULO DETALHADA
- Planilha de quantitativos
- Critérios de medição utilizados
- Documentação fotográfica de referência

## 4. COMPARATIVO CONTRATUAL
- Valor contratado total
- Valor medido acumulado
- Saldo contratual
- Percentual executado

## 5. ANÁLISE DE PAGAMENTOS
- Valor bruto da medição
- Retenções e descontos
- Valor líquido a receber
- Cronograma de pagamento

## 6. DOCUMENTAÇÃO ANEXA
- Lista de documentos que devem acompanhar
- Evidências fotográficas necessárias
- Certificações e ensaios

## 7. OBSERVAÇÕES E RESSALVAS
- Serviços não medidos (justificativa)
- Ajustes necessários
- Solicitações do cliente

## 8. APROVAÇÕES
- Responsável técnico pela medição
- Fiscalização
- Aprovação do cliente

Use formatação profissional adequada para documento de medição oficial.`;

    const promptProgressoSemanal = `${promptBase}
═══════════════════════════════════════════
🎯 ANÁLISE SOLICITADA: RELATÓRIO DE PROGRESSO SEMANAL
═══════════════════════════════════════════

Gere um relatório semanal de progresso executivo contendo:

## 1. RESUMO DA SEMANA
- Principais realizações
- Dificuldades encontradas
- Decisões tomadas

## 2. PROGRESSO TÉCNICO

### 2.1 Fabricação
- Peças fabricadas
- Progresso semanal e acumulado
- Desvios do planejado

### 2.2 Montagem
- Estruturas montadas
- Progresso semanal e acumulado
- Dificuldades de campo

## 3. RECURSOS E EQUIPE
- Efetivo de pessoal
- Equipamentos utilizados
- Necessidades identificadas

## 4. QUALIDADE E SEGURANÇA
- Inspeções realizadas
- Não-conformidades
- Incidentes de segurança
- Ações corretivas

## 5. PLANEJAMENTO PRÓXIMA SEMANA
- Metas da próxima semana
- Recursos necessários
- Pontos críticos

## 6. SUPORTE NECESSÁRIO
- Decisões pendentes
- Materiais em falta
- Apoio da gestão

Use linguagem executiva e objetiva.`;

    let promptFinal = promptBase;
    if (formData.tipo === 'fisico_financeiro') {
      promptFinal = promptFisicoFinanceiro;
    } else if (formData.tipo === 'medicao') {
      promptFinal = promptMedicao;
    } else if (formData.tipo === 'progresso_semanal') {
      promptFinal = promptProgressoSemanal;
    } else {
      promptFinal += `\n\nGere um relatório profissional completo sobre ${tipoLabel}.`;
    }

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: promptFinal,
    });

    await createMutation.mutateAsync({
      projeto_id: formData.projeto_id,
      projeto_nome: projeto?.nome,
      tipo: formData.tipo,
      periodo_inicio: formData.periodo_inicio,
      periodo_fim: formData.periodo_fim,
      percentual_fabricacao: formData.percentual_fabricacao,
      percentual_montagem: formData.percentual_montagem,
      tonelagem_fabricada: pesoFabricado,
      tonelagem_montada: pesoMontado,
      conteudo: response,
      observacoes: formData.observacoes
    });

    setIsGenerating(false);
  };

  const getTipoBadge = (tipo) => {
    const config = {
      progresso_semanal: { label: 'Progresso', className: 'bg-blue-100 text-blue-700' },
      fisico_financeiro: { label: 'Físico-Financeiro', className: 'bg-emerald-100 text-emerald-700' },
      medicao: { label: 'Medição', className: 'bg-purple-100 text-purple-700' },
      fotografico: { label: 'Fotográfico', className: 'bg-orange-100 text-orange-700' }
    };
    return config[tipo] || config.progresso_semanal;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-slate-500 mt-1">Análises de progresso, produtividade e tarefas com IA</p>
        </div>
        <Button 
          onClick={() => setShowNewModal(true)}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Novo Relatório
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="projetos" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="projetos">Relatórios de Projetos</TabsTrigger>
          <TabsTrigger value="tarefas">Análise de Tarefas</TabsTrigger>
          <TabsTrigger value="custos">Análise de Custos</TabsTrigger>
        </TabsList>

        <TabsContent value="projetos" className="space-y-8">

      {/* Gráficos Analíticos */}
      {relatorios.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <ProgressoFisicoFinanceiro relatorios={relatorios} projetos={projetos} />
            <ComparacaoProjetosProgresso relatorios={relatorios} projetos={projetos} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <DesempenhoCustosVsPlanejado relatorios={relatorios} projetos={projetos} />
            <EvolutionTonelagem relatorios={relatorios} projetos={projetos} />
          </div>
        </div>
      )}

      {/* Alert Cards */}
      {relatorios.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(() => {
            const ultimosRelatorios = relatorios.slice(0, 5);
            const projetosComAtraso = ultimosRelatorios.filter(r => {
              const projeto = projetos.find(p => p.id === r.projeto_id);
              if (!projeto?.data_inicio) return false;
              const diasDecorridos = Math.floor((new Date() - new Date(projeto.data_inicio)) / (1000 * 60 * 60 * 24));
              const prazoTotal = projeto?.data_fim_prevista ? 
                Math.floor((new Date(projeto.data_fim_prevista) - new Date(projeto.data_inicio)) / (1000 * 60 * 60 * 24)) 
                : 120;
              const percentualTempoDecorrido = (diasDecorridos / prazoTotal) * 100;
              return (r.percentual_fabricacao || 0) < percentualTempoDecorrido - 10;
            });

            const mediaEficiencia = ultimosRelatorios.reduce((acc, r) => 
              acc + ((r.percentual_fabricacao || 0) + (r.percentual_montagem || 0)) / 2, 0
            ) / (ultimosRelatorios.length || 1);

            return (
              <>
                <Card className={`border-2 ${projetosComAtraso.length > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-600">Status Geral</p>
                        <p className="text-xl font-bold text-slate-900">
                          {projetosComAtraso.length === 0 ? 'No Prazo' : `${projetosComAtraso.length} Atrasados`}
                        </p>
                      </div>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        projetosComAtraso.length > 0 ? 'bg-red-100' : 'bg-emerald-100'
                      }`}>
                        {projetosComAtraso.length > 0 ? (
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        ) : (
                          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Eficiência Média</p>
                        <p className="text-2xl font-bold text-slate-900">{mediaEficiencia.toFixed(1)}%</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Previsão Média</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {Math.ceil(120 * (100 / (mediaEficiencia || 50)))} dias
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total de Relatórios</p>
                <p className="text-2xl font-bold text-slate-900">{relatorios.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Este Mês</p>
                <p className="text-2xl font-bold text-slate-900">
                  {relatorios.filter(r => {
                    const date = new Date(r.created_date);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Projetos Ativos</p>
                <p className="text-2xl font-bold text-slate-900">{projetosAtivos.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-slate-100">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : relatorios.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum relatório ainda</h3>
              <p className="text-slate-500 mb-4">Comece gerando seu primeiro relatório</p>
              <Button 
                onClick={() => setShowNewModal(true)}
                className="bg-gradient-to-r from-orange-500 to-orange-600"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Criar Relatório
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Fabricação</TableHead>
                  <TableHead>Montagem</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorios.map((relatorio) => {
                  const tipoConfig = getTipoBadge(relatorio.tipo);
                  return (
                    <TableRow key={relatorio.id} className="cursor-pointer hover:bg-slate-50">
                      <TableCell className="font-medium">{relatorio.projeto_nome || '-'}</TableCell>
                      <TableCell>
                        <Badge className={tipoConfig.className}>
                          {tipoConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {relatorio.periodo_inicio && relatorio.periodo_fim ? (
                          `${format(new Date(relatorio.periodo_inicio), 'dd/MM')} - ${format(new Date(relatorio.periodo_fim), 'dd/MM')}`
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={relatorio.percentual_fabricacao || 0} className="w-16 h-2" />
                          <span className="text-sm text-slate-600">{relatorio.percentual_fabricacao || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={relatorio.percentual_montagem || 0} className="w-16 h-2" />
                          <span className="text-sm text-slate-600">{relatorio.percentual_montagem || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {relatorio.created_date 
                          ? format(new Date(relatorio.created_date), "dd/MM/yyyy", { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedRelatorio(relatorio)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Exportar PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Report Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              Novo Relatório
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Projeto *</Label>
              <Select
                value={formData.projeto_id}
                onValueChange={(value) => setFormData({ ...formData, projeto_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projetosAtivos.map((projeto) => (
                    <SelectItem key={projeto.id} value={projeto.id}>
                      {projeto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposRelatorio.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Período Início *</Label>
                <Input
                  type="date"
                  value={formData.periodo_inicio}
                  onChange={(e) => setFormData({ ...formData, periodo_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Período Fim *</Label>
                <Input
                  type="date"
                  value={formData.periodo_fim}
                  onChange={(e) => setFormData({ ...formData, periodo_fim: e.target.value })}
                />
              </div>
            </div>

            {formData.tipo === 'fisico_financeiro' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <BarChart3 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Relatório Físico-Financeiro</p>
                    <p>Este relatório incluirá análise detalhada de custos, desvios, previsões e índices de desempenho baseados em dados do MonteX Produção.</p>
                  </div>
                </div>
              </div>
            )}

            {formData.tipo === 'medicao' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <FileText className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-purple-800">
                    <p className="font-semibold mb-1">Relatório de Medição</p>
                    <p>Documento oficial para faturamento com memória de cálculo, quantitativos executados e valores a receber.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>% Fabricação *</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.percentual_fabricacao}
                  onChange={(e) => setFormData({ ...formData, percentual_fabricacao: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>% Montagem *</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.percentual_montagem}
                  onChange={(e) => setFormData({ ...formData, percentual_montagem: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tonelagem Fabricada (kg) - Opcional</Label>
                <Input
                  type="number"
                  placeholder="Calculado automaticamente"
                  value={formData.tonelagem_fabricada}
                  onChange={(e) => setFormData({ ...formData, tonelagem_fabricada: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-slate-500">Deixe vazio para calcular pelo %</p>
              </div>
              <div className="space-y-2">
                <Label>Tonelagem Montada (kg) - Opcional</Label>
                <Input
                  type="number"
                  placeholder="Calculado automaticamente"
                  value={formData.tonelagem_montada}
                  onChange={(e) => setFormData({ ...formData, tonelagem_montada: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-slate-500">Deixe vazio para calcular pelo %</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações do Período</Label>
              <Textarea
                placeholder="Descreva as principais ocorrências, desvios ou observações..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNewModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={gerarRelatorioComIA}
                disabled={!formData.projeto_id || !formData.periodo_inicio || !formData.periodo_fim || isGenerating}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Relatório
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Report Modal */}
      <Dialog open={!!selectedRelatorio} onOpenChange={() => {
        setSelectedRelatorio(null);
        setAnalisePreditiva(null);
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Relatório - {selectedRelatorio?.projeto_nome}</span>
              {selectedRelatorio && !analisePreditiva && (
                <Button
                  onClick={() => {
                    const projeto = projetos.find(p => p.id === selectedRelatorio.projeto_id);
                    if (projeto) gerarAnalisePreditiva(selectedRelatorio, projeto);
                  }}
                  disabled={isAnalyzing}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 to-purple-600"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-2" />
                      Análise Preditiva IA
                    </>
                  )}
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRelatorio && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Tipo</p>
                  <Badge className={getTipoBadge(selectedRelatorio.tipo).className}>
                    {getTipoBadge(selectedRelatorio.tipo).label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Período</p>
                  <p className="font-medium">
                    {selectedRelatorio.periodo_inicio && selectedRelatorio.periodo_fim ? (
                      `${format(new Date(selectedRelatorio.periodo_inicio), 'dd/MM/yyyy')} - ${format(new Date(selectedRelatorio.periodo_fim), 'dd/MM/yyyy')}`
                    ) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Fabricação</p>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedRelatorio.percentual_fabricacao || 0} className="w-20 h-2" />
                    <span className="font-medium">{selectedRelatorio.percentual_fabricacao || 0}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Montagem</p>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedRelatorio.percentual_montagem || 0} className="w-20 h-2" />
                    <span className="font-medium">{selectedRelatorio.percentual_montagem || 0}%</span>
                  </div>
                </div>
              </div>

              {analisePreditiva && (
                <PredictiveAnalysis analise={analisePreditiva} />
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Conteúdo do Relatório</h4>
                <div className="bg-slate-50 rounded-xl p-6 prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-slate-700">
                    {selectedRelatorio.conteudo}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

        </TabsContent>

        <TabsContent value="tarefas" className="space-y-6">
          <TaskAnalytics
            tarefas={tarefas}
            projetos={projetos}
            usuarios={usuarios}
            onGenerateAIReport={handleGenerateTaskAnalyticsReport}
          />

          {analiseIATarefas && (
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Relatório de Análise de Tarefas (IA)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white rounded-xl p-6 prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-slate-700">
                    {analiseIATarefas}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="custos" className="space-y-6">
          <CostPredictiveAnalysis
            projetos={projetos}
            relatorios={relatorios}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}