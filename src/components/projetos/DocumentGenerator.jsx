import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, ClipboardList, FileCode, BookOpen } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function DocumentGenerator({ open, onClose, projeto }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [documentoGerado, setDocumentoGerado] = useState(null);
  const [tipoDocumento, setTipoDocumento] = useState('resumo');
  const [notasReuniao, setNotasReuniao] = useState('');
  const [requisitos, setRequisitos] = useState('');

  // Buscar dados relacionados ao projeto
  const { data: relatorios = [] } = useQuery({
    queryKey: ['relatorios', projeto?.id],
    queryFn: () => base44.entities.Relatorio.list('-created_date', 50),
    enabled: open && !!projeto
  });

  const { data: tarefas = [] } = useQuery({
    queryKey: ['tarefas', projeto?.id],
    queryFn: () => base44.entities.Tarefa.list('-created_date', 100),
    enabled: open && !!projeto
  });

  const relatoriosProjeto = relatorios.filter(r => r.projeto_id === projeto?.id);
  const tarefasProjeto = tarefas.filter(t => t.projeto_id === projeto?.id);

  const gerarResumo = async () => {
    setIsGenerating(true);
    
    const prompt = `Você é um gerente de projetos especializado em estruturas metálicas.

DADOS DO PROJETO:
• Nome: ${projeto.nome}
• Cliente: ${projeto.cliente_nome || 'Não definido'}
• Tipo: ${projeto.tipo || 'Não definido'}
• Localização: ${projeto.localizacao || 'Não definido'}
• Área: ${projeto.area ? `${projeto.area} m²` : 'Não definido'}
• Peso Estimado: ${projeto.peso_estimado ? `${projeto.peso_estimado} kg` : 'Não definido'}
• Valor Contratado: ${projeto.valor_contrato ? `R$ ${projeto.valor_contrato.toLocaleString('pt-BR')}` : 'Não definido'}
• Status: ${projeto.status || 'Não definido'}
• Data de Início: ${projeto.data_inicio || 'Não definido'}
• Previsão de Término: ${projeto.data_fim_prevista || 'Não definido'}
${projeto.observacoes ? `\n• Observações: ${projeto.observacoes}` : ''}

Gere um resumo executivo profissional e detalhado do projeto em markdown, contendo:

## 1. VISÃO GERAL DO PROJETO
- Descrição geral e objetivos
- Justificativa e importância

## 2. ESCOPO TÉCNICO
- Tipo de estrutura e características
- Dimensões e especificações
- Localização e condições do local

## 3. DADOS COMERCIAIS
- Valor do contrato
- Forma de pagamento (mencionar que deve ser definido)
- Prazo de execução

## 4. CRONOGRAMA
- Data de início
- Previsão de término
- Fases principais (Projeto, Fabricação, Montagem)

## 5. EQUIPE E RESPONSABILIDADES
- Cliente
- Equipe técnica da Montex (a ser definido)
- Subcontratados (se aplicável)

## 6. RISCOS E PONTOS DE ATENÇÃO
- Identificação de riscos potenciais
- Medidas de mitigação sugeridas

## 7. PRÓXIMOS PASSOS
- Ações imediatas necessárias
- Documentação pendente

Seja profissional, técnico e detalhado.`;

    const resultado = await base44.integrations.Core.InvokeLLM({ prompt });
    setDocumentoGerado(resultado);
    setIsGenerating(false);
  };

  const gerarAtaReuniao = async () => {
    if (!notasReuniao.trim()) {
      alert('Por favor, insira as notas da reunião');
      return;
    }

    setIsGenerating(true);
    
    const prompt = `Você é um assistente especializado em documentação de reuniões de projetos.

PROJETO: ${projeto.nome}
CLIENTE: ${projeto.cliente_nome || 'Não definido'}

NOTAS DA REUNIÃO:
${notasReuniao}

Com base nas notas acima, gere uma ata de reunião profissional em markdown contendo:

## ATA DE REUNIÃO - ${projeto.nome}

**Data:** ${new Date().toLocaleDateString('pt-BR')}
**Projeto:** ${projeto.nome}
**Cliente:** ${projeto.cliente_nome || 'Não definido'}

### 1. PARTICIPANTES
Liste os participantes mencionados nas notas ou indique que devem ser preenchidos.

### 2. PAUTA
Liste os assuntos discutidos.

### 3. DISCUSSÕES E DECISÕES
Para cada ponto da pauta, descreva:
- O que foi discutido
- Decisões tomadas
- Responsáveis
- Prazos definidos

### 4. PENDÊNCIAS
Liste todas as ações pendentes, com:
- Descrição da ação
- Responsável
- Prazo

### 5. PRÓXIMA REUNIÃO
Se mencionado nas notas, indique data e pauta.

### 6. ANEXOS
Liste documentos ou materiais mencionados.

Organize as informações de forma clara e profissional. Use as notas fornecidas como base.`;

    const resultado = await base44.integrations.Core.InvokeLLM({ prompt });
    setDocumentoGerado(resultado);
    setIsGenerating(false);
  };

  const gerarDocumentoCompleto = async () => {
    setIsGenerating(true);
    
    try {
      // Calcular métricas do projeto
      const tarefasConcluidas = tarefasProjeto.filter(t => t.status === 'concluida').length;
      const tarefasTotal = tarefasProjeto.length;
      const progressoTarefas = tarefasTotal > 0 ? ((tarefasConcluidas / tarefasTotal) * 100).toFixed(1) : 0;

      const ultimoRelatorio = relatoriosProjeto[0];
      const progressoFabricacao = ultimoRelatorio?.percentual_fabricacao || 0;
      const progressoMontagem = ultimoRelatorio?.percentual_montagem || 0;

      const tarefasAtrasadas = tarefasProjeto.filter(t => {
        if (!t.data_fim || t.status === 'concluida') return false;
        return new Date(t.data_fim) < new Date();
      }).length;

      const tarefasCriticas = tarefasProjeto.filter(t => 
        t.prioridade === 'urgente' || t.prioridade === 'alta'
      );

      // Próximas tarefas importantes
      const proximasTarefas = tarefasProjeto
        .filter(t => t.status !== 'concluida')
        .sort((a, b) => {
          const prioridadeOrdem = { urgente: 4, alta: 3, media: 2, baixa: 1 };
          return (prioridadeOrdem[b.prioridade] || 0) - (prioridadeOrdem[a.prioridade] || 0);
        })
        .slice(0, 5);

      const prompt = `Você é um gerente de projetos sênior especializado em estruturas metálicas. Analise os dados do projeto e gere uma documentação COMPLETA e PROFISSIONAL.

DADOS DO PROJETO:
• Nome: ${projeto.nome}
• Cliente: ${projeto.cliente_nome || 'Não definido'}
• Tipo: ${projeto.tipo || 'Não definido'}
• Localização: ${projeto.localizacao || 'Não definido'}
• Área: ${projeto.area ? `${projeto.area} m²` : 'Não definido'}
• Peso Estimado: ${projeto.peso_estimado ? `${projeto.peso_estimado} kg` : 'Não definido'}
• Valor Contratado: ${projeto.valor_contrato ? `R$ ${projeto.valor_contrato.toLocaleString('pt-BR')}` : 'Não definido'}
• Status: ${projeto.status || 'Não definido'}
• Data de Início: ${projeto.data_inicio || 'Não definido'}
• Previsão de Término: ${projeto.data_fim_prevista || 'Não definido'}

DADOS DE PROGRESSO:
• Progresso de Fabricação: ${progressoFabricacao}%
• Progresso de Montagem: ${progressoMontagem}%
• Total de Relatórios Gerados: ${relatoriosProjeto.length}
• Tarefas Concluídas: ${tarefasConcluidas} de ${tarefasTotal} (${progressoTarefas}%)
• Tarefas Atrasadas: ${tarefasAtrasadas}
• Tarefas Críticas/Alta Prioridade: ${tarefasCriticas.length}

TAREFAS MAIS RECENTES CONCLUÍDAS:
${tarefasProjeto.filter(t => t.status === 'concluida').slice(0, 5).map(t => 
  `- ${t.titulo} (${t.prioridade}) - Concluída`
).join('\n') || 'Nenhuma tarefa concluída ainda'}

PRÓXIMAS TAREFAS IMPORTANTES:
${proximasTarefas.map(t => 
  `- ${t.titulo} (Prioridade: ${t.prioridade}, Status: ${t.status}, Prazo: ${t.data_fim || 'Não definido'})`
).join('\n') || 'Nenhuma tarefa pendente'}

ÚLTIMO RELATÓRIO DE PROGRESSO:
${ultimoRelatorio ? `
• Data: ${new Date(ultimoRelatorio.created_date).toLocaleDateString('pt-BR')}
• Tipo: ${ultimoRelatorio.tipo}
• Período: ${ultimoRelatorio.periodo_inicio} a ${ultimoRelatorio.periodo_fim}
• Tonelagem Fabricada: ${ultimoRelatorio.tonelagem_fabricada || 0} ton
• Tonelagem Montada: ${ultimoRelatorio.tonelagem_montada || 0} ton
• Observações: ${ultimoRelatorio.observacoes || 'Nenhuma'}
` : 'Nenhum relatório registrado ainda'}

Com base nesses dados REAIS do projeto, gere uma documentação COMPLETA em markdown:

# DOCUMENTAÇÃO COMPLETA DO PROJETO - ${projeto.nome}

## 1. SUMÁRIO EXECUTIVO
Visão geral do projeto, objetivos principais, e justificativa de negócio.

## 2. STATUS ATUAL DO PROJETO
### 2.1 Progresso Geral
- Percentual de conclusão geral
- Status de fabricação e montagem
- Progresso de tarefas

### 2.2 Marcos Alcançados
Liste os principais marcos já atingidos baseado nas tarefas concluídas e relatórios.

### 2.3 Indicadores Chave
- Prazo (dentro/atrasado)
- Orçamento (estimado vs executado)
- Qualidade (baseado em relatórios)

## 3. ESCOPO E ESPECIFICAÇÕES TÉCNICAS
### 3.1 Características da Estrutura
Detalhe o tipo, dimensões, materiais estimados baseado nos dados.

### 3.2 Requisitos Técnicos
Com base no tipo de estrutura (${projeto.tipo}), liste requisitos técnicos típicos.

### 3.3 Normas Aplicáveis
NBR 8800, NBR 6123, e outras normas relevantes para ${projeto.tipo}.

## 4. ANÁLISE DE TAREFAS E PROGRESSO
### 4.1 Resumo de Execução
Analise as tarefas concluídas e o que foi realizado.

### 4.2 Tarefas em Andamento
Liste as ${tarefasTotal - tarefasConcluidas} tarefas pendentes e seu impacto.

### 4.3 Próximas Etapas Críticas
Detalhe as próximas tarefas importantes e prazos.

## 5. CRONOGRAMA E PRAZOS
### 5.1 Linha do Tempo
- Data de início: ${projeto.data_inicio || 'A definir'}
- Previsão de término: ${projeto.data_fim_prevista || 'A definir'}
- Status de prazo: Analisar se está dentro do previsto

### 5.2 Fases do Projeto
- Projeto/Engenharia
- Fabricação (${progressoFabricacao}% concluído)
- Montagem (${progressoMontagem}% concluído)

## 6. GESTÃO DE RISCOS
### 6.1 Riscos Identificados
Baseado em:
- ${tarefasAtrasadas} tarefas atrasadas
- ${tarefasCriticas.length} tarefas críticas em andamento
- Análise de prazos e recursos

### 6.2 Plano de Mitigação
Ações específicas para cada risco identificado.

## 7. ASPECTOS COMERCIAIS
### 7.1 Valor do Contrato
${projeto.valor_contrato ? `R$ ${projeto.valor_contrato.toLocaleString('pt-BR')}` : 'A definir'}

### 7.2 Condições Comerciais
Forma de pagamento, garantias, reajustes (mencionar que devem ser verificados no contrato).

## 8. DOCUMENTAÇÃO TÉCNICA GERADA
### 8.1 Relatórios de Progresso
Total de ${relatoriosProjeto.length} relatórios emitidos. Detalhe o último relatório.

### 8.2 Controle de Qualidade
Baseado nos relatórios, mencionar inspeções e conformidades.

## 9. EQUIPE E RESPONSABILIDADES
### 9.1 Stakeholders
- Cliente: ${projeto.cliente_nome || 'A definir'}
- Gerente de Projeto: A definir
- Equipe Técnica: A definir

### 9.2 Responsáveis por Tarefas
Mencionar as principais responsabilidades baseado nas tarefas críticas.

## 10. RECOMENDAÇÕES E PRÓXIMOS PASSOS
### 10.1 Ações Imediatas
Baseado nas tarefas pendentes de alta prioridade e riscos identificados.

### 10.2 Melhorias Sugeridas
Oportunidades de otimização identificadas durante a análise.

### 10.3 Plano de Ação
Próximos 30/60/90 dias com base no cronograma atual.

## 11. CONCLUSÃO
Avaliação geral do projeto, perspectivas, e comentários finais.

## 12. ANEXOS
- Lista completa de tarefas (${tarefasTotal} tarefas)
- Histórico de relatórios (${relatoriosProjeto.length} documentos)
- Fotografias de progresso (se disponíveis)

---

**Documento gerado em:** ${new Date().toLocaleDateString('pt-BR')}

IMPORTANTE: Use TODOS os dados fornecidos para criar um documento rico, profissional e específico para este projeto. Não seja genérico.`;

      const resultado = await base44.integrations.Core.InvokeLLM({ prompt });
      setDocumentoGerado(resultado);
    } catch (error) {
      console.error('Erro ao gerar documentação:', error);
      alert('Erro ao gerar documentação. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const gerarEspecificacaoTecnica = async () => {
    if (!requisitos.trim()) {
      alert('Por favor, insira os requisitos do projeto');
      return;
    }

    setIsGenerating(true);
    
    const prompt = `Você é um engenheiro especializado em estruturas metálicas.

PROJETO: ${projeto.nome}
TIPO: ${projeto.tipo || 'Não definido'}
ÁREA: ${projeto.area ? `${projeto.area} m²` : 'Não definido'}
PESO ESTIMADO: ${projeto.peso_estimado ? `${projeto.peso_estimado} kg` : 'Não definido'}

REQUISITOS E INFORMAÇÕES:
${requisitos}

Gere uma especificação técnica detalhada em markdown contendo:

## ESPECIFICAÇÃO TÉCNICA - ${projeto.nome}

### 1. INFORMAÇÕES GERAIS
- Nome do Projeto
- Cliente
- Localização
- Data de Elaboração

### 2. ESCOPO DO PROJETO
Descrição detalhada do que será executado.

### 3. CARACTERÍSTICAS DA ESTRUTURA
- Tipo de estrutura
- Dimensões principais
- Peso total estimado
- Área de cobertura/construção

### 4. MATERIAIS
#### 4.1 Estrutura Metálica
- Perfis (tipos e seções)
- Chapas
- Parafusos e conexões
- Acabamentos

#### 4.2 Cobertura (se aplicável)
- Tipo de telha
- Acessórios
- Isolamento térmico

### 5. NORMAS E PADRÕES
Liste as normas técnicas aplicáveis (NBR 8800, NBR 6123, etc.)

### 6. CRITÉRIOS DE PROJETO
- Cargas consideradas
- Combinações de carga
- Coeficientes de segurança

### 7. FABRICAÇÃO
- Processos de fabricação
- Soldagem (tipos, eletrodos)
- Controle de qualidade
- Pintura e proteção

### 8. MONTAGEM
- Sequência de montagem
- Equipamentos necessários
- Inspeções durante montagem

### 9. ENSAIOS E TESTES
- Ensaios não destrutivos
- Provas de carga
- Critérios de aceitação

### 10. DOCUMENTAÇÃO
- Desenhos necessários
- Memoriais de cálculo
- Certificados

### 11. PRAZO
- Cronograma de execução
- Marcos importantes

### 12. CONSIDERAÇÕES FINAIS
Observações importantes e requisitos específicos.

Baseie-se nos requisitos fornecidos e nas características do projeto para gerar um documento técnico profissional.`;

    const resultado = await base44.integrations.Core.InvokeLLM({ prompt });
    setDocumentoGerado(resultado);
    setIsGenerating(false);
  };

  const handleGenerate = () => {
    setDocumentoGerado(null);
    if (tipoDocumento === 'resumo') {
      gerarResumo();
    } else if (tipoDocumento === 'completo') {
      gerarDocumentoCompleto();
    } else if (tipoDocumento === 'ata') {
      gerarAtaReuniao();
    } else if (tipoDocumento === 'especificacao') {
      gerarEspecificacaoTecnica();
    }
  };

  const copiarDocumento = () => {
    if (documentoGerado) {
      navigator.clipboard.writeText(documentoGerado);
      alert('Documento copiado para a área de transferência!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            Gerador de Documentação - {projeto?.nome}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tipoDocumento} onValueChange={setTipoDocumento} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumo">
              <FileText className="h-4 w-4 mr-2" />
              Resumo
            </TabsTrigger>
            <TabsTrigger value="completo">
              <BookOpen className="h-4 w-4 mr-2" />
              Doc. Completa
            </TabsTrigger>
            <TabsTrigger value="ata">
              <ClipboardList className="h-4 w-4 mr-2" />
              Ata
            </TabsTrigger>
            <TabsTrigger value="especificacao">
              <FileCode className="h-4 w-4 mr-2" />
              Espec. Técnica
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-4 mt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Gere um resumo executivo completo do projeto automaticamente com base nos dados cadastrados.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="completo" className="space-y-4 mt-4">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <BookOpen className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-purple-900 mb-1">Documentação Completa com IA</h4>
                  <p className="text-sm text-purple-800">
                    Gera uma documentação abrangente analisando automaticamente:
                  </p>
                </div>
              </div>
              <ul className="space-y-2 ml-8">
                <li className="text-sm text-purple-800 flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span><strong>Dados do projeto:</strong> Escopo, especificações técnicas e aspectos comerciais</span>
                </li>
                <li className="text-sm text-purple-800 flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span><strong>Relatórios de progresso:</strong> {relatoriosProjeto.length} relatórios registrados</span>
                </li>
                <li className="text-sm text-purple-800 flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span><strong>Tarefas e conclusões:</strong> {tarefasProjeto.length} tarefas mapeadas</span>
                </li>
                <li className="text-sm text-purple-800 flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span><strong>Análise de riscos:</strong> Identificação automática baseada em prazos e status</span>
                </li>
                <li className="text-sm text-purple-800 flex items-start gap-2">
                  <span className="text-purple-600 font-bold">•</span>
                  <span><strong>Perspectivas futuras:</strong> Próximas etapas e recomendações</span>
                </li>
              </ul>
              <p className="text-xs text-purple-700 mt-3 italic">
                A IA irá gerar um documento profissional de 10+ páginas com status atual, marcos alcançados e plano de ação.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="ata" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Notas da Reunião *</Label>
              <Textarea
                value={notasReuniao}
                onChange={(e) => setNotasReuniao(e.target.value)}
                placeholder="Cole aqui as anotações da reunião. Pode ser em formato livre. A IA irá estruturar em formato de ata profissional."
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                Exemplo: "Reunião com cliente João. Discutimos prazo de entrega - definido para 60 dias. Cliente solicitou mudança na altura da cobertura..."
              </p>
            </div>
          </TabsContent>

          <TabsContent value="especificacao" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Requisitos e Informações Técnicas *</Label>
              <Textarea
                value={requisitos}
                onChange={(e) => setRequisitos(e.target.value)}
                placeholder="Descreva os requisitos técnicos, características desejadas, normas aplicáveis, e qualquer informação relevante. A IA irá estruturar em formato de especificação técnica."
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                Exemplo: "Galpão industrial com vão de 20m. Estrutura em perfis soldados. Cobertura em telha termoacústica. Carga de ponte rolante 10 toneladas..."
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {!documentoGerado && (
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-500 to-purple-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando com IA...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Documento
                </>
              )}
            </Button>
          </div>
        )}

        {documentoGerado && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">Documento Gerado</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copiarDocumento}>
                  Copiar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDocumentoGerado(null);
                    setNotasReuniao('');
                    setRequisitos('');
                  }}
                >
                  Gerar Novamente
                </Button>
              </div>
            </div>
            <div className="bg-slate-50 rounded-lg p-6 prose prose-sm max-w-none border">
              <pre className="whitespace-pre-wrap font-sans text-slate-700">
                {documentoGerado}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}