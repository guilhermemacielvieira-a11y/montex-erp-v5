import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calculator,
  Plus,
  Sparkles,
  FileText,
  DollarSign,
  Loader2,
  Eye,
  Download,
  MoreVertical,
  Check,
  X as XIcon,
  Send,
  Copy,
  FileCheck,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import CatalogoItens from '../components/orcamentos/CatalogoItens';
import {
  EvolucaoPorStatus,
  ValorPorStatus,
  DistribuicaoCustos,
  EvolucaoTemporal
} from '../components/orcamentos/OrcamentosCharts';
import {
  AnaliseProbabilidadeAprovacao,
  SugestoesOtimizacao
} from '../components/orcamentos/OrcamentoIA';
import {
  AnalisePreditivaRentabilidade,
  AjustesDinamicosTempoReal,
  FollowUpsPersonalizados
} from '../components/orcamentos/OrcamentoIAAvancado';
import OrcamentoDetalhadoPorItem from '../components/orcamentos/OrcamentoDetalhadoPorItem';
import RelatorioComparativoDetalhado from '../components/orcamentos/RelatorioComparativoDetalhado';

const tiposEstrutura = [
  { value: 'galpao_industrial', label: 'Galpão Industrial', fator: 25 },
  { value: 'mezanino', label: 'Mezanino', fator: 45 },
  { value: 'cobertura', label: 'Cobertura', fator: 20 },
  { value: 'estrutura_predial', label: 'Estrutura Predial', fator: 55 },
  { value: 'passarela', label: 'Passarela', fator: 35 },
  { value: 'outro', label: 'Outro', fator: 30 }
];

const custosBase = {
  aco: 8.00,
  fabricacao: 6.00,
  montagem: 2.50,
  transporte: 1.50,
  pintura: 1.20
};

export default function Orcamentos() {
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState(null);
  const [editingOrcamento, setEditingOrcamento] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCatalogo, setShowCatalogo] = useState(false);
  const [itensPersonalizados, setItensPersonalizados] = useState([]);
  const [itensEditaveis, setItensEditaveis] = useState([]);
  const [mostrarItensEditaveis, setMostrarItensEditaveis] = useState(false);
  const [formData, setFormData] = useState({
    cliente_nome: '',
    cliente_email: '',
    projeto_nome: '',
    tipo: 'galpao_industrial',
    area: '',
    localizacao: '',
    fatorPeso: 45,
    sobrecarga: 500,
    incluirMontagem: true,
    incluirCobertura: false,
    tipoCobertura: 'telha_metalica',
    margem: 30,
    observacoes: ''
  });

  const queryClient = useQueryClient();

  const { data: orcamentos = [], isLoading } = useQuery({
    queryKey: ['orcamentos'],
    queryFn: () => base44.entities.Orcamento.list('-created_date', 100)
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => base44.entities.Projeto.list()
  });

  const { data: itensFabricacao = [] } = useQuery({
    queryKey: ['itens-fabricacao'],
    queryFn: () => base44.entities.ItemProducao.filter({ etapa: 'fabricacao' }, '-created_date', 1000)
  });

  const { data: itensMontagem = [] } = useQuery({
    queryKey: ['itens-montagem'],
    queryFn: () => base44.entities.ItemProducao.filter({ etapa: 'montagem' }, '-created_date', 1000)
  });

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes'],
    queryFn: () => base44.entities.MovimentacaoFinanceira.list('-created_date', 200)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Orcamento.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      setShowNewModal(false);
      setItensPersonalizados([]);
      setItensEditaveis([]);
      setMostrarItensEditaveis(false);
      setFormData({
        cliente_nome: '',
        cliente_email: '',
        projeto_nome: '',
        tipo: 'galpao_industrial',
        area: '',
        localizacao: '',
        incluirMontagem: true,
        incluirCobertura: false,
        tipoCobertura: 'telha_metalica',
        margem: 30,
        observacoes: ''
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Orcamento.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Orcamento.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast.success('Orçamento excluído com sucesso!');
    }
  });

  const criarProjetoMutation = useMutation({
    mutationFn: (data) => base44.entities.Projeto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
      toast.success('Projeto criado com sucesso!');
    }
  });

  const calcularPesoEstimado = (area, tipo, sobrecarga = 500, fatorPeso = null) => {
    const tipoConfig = tiposEstrutura.find(t => t.value === tipo);
    const fator = fatorPeso !== null ? fatorPeso : (tipoConfig?.fator || 30);
    let pesoBase = area * fator;
    
    // Para mezanino, adicionar peso da sobrecarga
    if (tipo === 'mezanino' && sobrecarga) {
      pesoBase += area * (sobrecarga / 1000) * 0.15; // 15% do peso da sobrecarga
    }
    
    return pesoBase;
  };

  const gerarOrcamentoComIA = async () => {
    if (!formData.area || !formData.cliente_nome || !formData.projeto_nome) {
      return;
    }

    setIsGenerating(true);

    const pesoEstimado = calcularPesoEstimado(parseFloat(formData.area), formData.tipo, parseFloat(formData.sobrecarga), parseFloat(formData.fatorPeso));
    
    // Custos diretos
    const custoEstrutura = pesoEstimado * (custosBase.aco + custosBase.fabricacao + custosBase.pintura);
    const custoMontagem = formData.incluirMontagem ? pesoEstimado * custosBase.montagem : 0;
    const custoTransporte = pesoEstimado * custosBase.transporte;
    
    let custoCobertura = 0;
    if (formData.incluirCobertura) {
      const custoPorM2 = formData.tipoCobertura === 'telha_pir' ? 180 : 
                         formData.tipoCobertura === 'steel_deck' ? 200 : 90;
      custoCobertura = parseFloat(formData.area) * custoPorM2;
    }

    // Subtotal
    const subtotal = custoEstrutura + custoMontagem + custoTransporte + custoCobertura;
    
    // Custos adicionais percentuais (calhas, chumbadores, engenharia)
    const custoCalhas = subtotal * 0.03;
    const custoChumbadores = subtotal * 0.02;
    const custoEngenharia = subtotal * 0.03;
    
    const custoTotal = subtotal + custoCalhas + custoChumbadores + custoEngenharia;
    const lucro = custoTotal * (formData.margem / 100);
    const valorVenda = custoTotal + lucro;
    const precoPorKg = valorVenda / pesoEstimado;
    const margemReal = (lucro / valorVenda) * 100;

    const prompt = `Você é o assistente de orçamentos do Grupo Montex, especialista em estruturas metálicas.

**INFORMAÇÕES DA EMPRESA:**
- Localização: São Joaquim de Bicas, MG
- Capacidade: ~50 toneladas/mês
- Clientes de referência: My Mall, Super Luna, Supermercados BH
- Especialidade: Galpões industriais, supermercados, shopping centers

**PROJETO ATUAL:**
- Cliente: ${formData.cliente_nome}
- Projeto: ${formData.projeto_nome}
- Tipo: ${tiposEstrutura.find(t => t.value === formData.tipo)?.label}
- Área: ${formData.area}m²
- Localização: ${formData.localizacao || 'Não especificada'}
- Peso Estimado: ${(pesoEstimado / 1000).toFixed(2)} toneladas
${formData.observacoes ? `\n**OBSERVAÇÕES IMPORTANTES DO PROJETO:**\n${formData.observacoes}\n\n*Atenção: Considere as observações acima para personalizar a proposta e incluir detalhes técnicos relevantes.*` : ''}

**COMPOSIÇÃO DE CUSTOS:**
- Estrutura (aço + fabricação): R$ ${custoEstrutura.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
${formData.incluirMontagem ? `- Montagem: R$ ${custoMontagem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
${formData.incluirCobertura ? `- Cobertura: R$ ${custoCobertura.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
- Transporte: R$ ${custoTransporte.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Calhas e rufos (3%): R$ ${custoCalhas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Chumbadores (2%): R$ ${custoChumbadores.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Engenharia (3%): R$ ${custoEngenharia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

**RESUMO FINANCEIRO:**
- Custo Total: R$ ${custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Margem: ${margemReal.toFixed(1)}%
- **VALOR FINAL: R$ ${valorVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**
- Preço/kg: R$ ${precoPorKg.toFixed(2)}/kg
- Preço/m²: R$ ${(valorVenda / parseFloat(formData.area)).toFixed(2)}/m²

**INSTRUÇÕES:**
Gere uma proposta comercial COMPLETA e PROFISSIONAL incluindo:

1. **CABEÇALHO**: Dados da Montex + dados do cliente
2. **OBJETO**: Descrição clara do que será fornecido
3. **ESCOPO DETALHADO**: 
   - Fabricação de estrutura metálica em aço ASTM A572 Gr50
   ${formData.incluirMontagem ? '- Montagem completa com equipe especializada' : ''}
   ${formData.incluirCobertura ? '- Sistema de cobertura conforme especificado' : ''}
   - Sistema de calhas e condutores
   - Chumbadores e fixações
   - Pintura industrial (jateamento + epóxi + poliuretano)
4. **ESPECIFICAÇÕES TÉCNICAS**: Normas (NBR 8800), tratamento de superfície, acabamento
5. **VALORES**: Quadro detalhado com composição de custos
6. **CONDIÇÕES COMERCIAIS**:
   - Pagamento: 30% entrada / 40% contra NF / 30% após montagem
   - Prazo de fabricação: ${Math.ceil(pesoEstimado / 50000)} mês(es)
   - Prazo de montagem: ${formData.incluirMontagem ? '15-30 dias' : 'Não incluso'}
   - Validade: 15 dias
7. **EXCLUSÕES**: O que NÃO está incluso
8. **GARANTIAS**: Garantia de fabricação e montagem
9. **PRÓXIMOS PASSOS**: Aceite e início da execução

Use formatação markdown, seja profissional e convincente. A proposta deve estar pronta para envio ao cliente.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          proposta: { type: 'string' },
          prazo_fabricacao_dias: { type: 'number' },
          prazo_montagem_dias: { type: 'number' },
          pontos_atencao: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    const numeroOrcamento = `ORC-${new Date().getFullYear()}-${String(orcamentos.length + 1).padStart(4, '0')}`;
    
    const dataValidade = new Date();
    dataValidade.setDate(dataValidade.getDate() + 30);

    const itens = [
      {
        descricao: 'Estrutura metálica - Fabricação completa',
        quantidade: pesoEstimado,
        unidade: 'kg',
        valor_unitario: (custosBase.aco + custosBase.fabricacao + custosBase.pintura),
        valor_total: custoEstrutura
      }
    ];

    if (formData.incluirMontagem) {
      itens.push({
        descricao: 'Montagem da estrutura',
        quantidade: pesoEstimado,
        unidade: 'kg',
        valor_unitario: custosBase.montagem,
        valor_total: custoMontagem
      });
    }

    if (formData.incluirCobertura) {
      const custoPorM2 = formData.tipoCobertura === 'telha_pir' ? 180 : 
                         formData.tipoCobertura === 'steel_deck' ? 200 : 90;
      itens.push({
        descricao: `Cobertura - ${formData.tipoCobertura.replace('_', ' ')}`,
        quantidade: parseFloat(formData.area),
        unidade: 'm²',
        valor_unitario: custoPorM2,
        valor_total: custoCobertura
      });
    }

    itens.push({
      descricao: 'Transporte',
      quantidade: pesoEstimado,
      unidade: 'kg',
      valor_unitario: custosBase.transporte,
      valor_total: custoTransporte
    });

    // Itens adicionais
    itens.push({
      descricao: 'Calhas e rufos',
      quantidade: 1,
      unidade: 'vb',
      valor_unitario: custoCalhas,
      valor_total: custoCalhas
    });

    itens.push({
      descricao: 'Chumbadores e fixações',
      quantidade: 1,
      unidade: 'vb',
      valor_unitario: custoChumbadores,
      valor_total: custoChumbadores
    });

    itens.push({
      descricao: 'Engenharia e detalhamento',
      quantidade: 1,
      unidade: 'vb',
      valor_unitario: custoEngenharia,
      valor_total: custoEngenharia
    });

    // Se o usuário editou os itens manualmente, usar os itens editados
    const itensFinais = mostrarItensEditaveis && itensEditaveis.length > 0 
      ? itensEditaveis.map(item => ({
          descricao: item.descricao,
          quantidade: item.quantidade,
          unidade: item.unidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.quantidade * item.valor_unitario
        }))
      : itens;

    // Adicionar itens personalizados do catálogo se não estiver usando itens editáveis
    if (!mostrarItensEditaveis || itensEditaveis.length === 0) {
      itensPersonalizados.forEach(item => {
        itens.push({
          descricao: item.descricao,
          quantidade: item.quantidade,
          unidade: item.unidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.quantidade * item.valor_unitario
        });
      });
    }

    // Recalcular totais baseado nos itens finais
    const custoTotalItens = (mostrarItensEditaveis && itensEditaveis.length > 0)
      ? itensEditaveis.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0)
      : custoTotal;
    
    const valorVendaFinal = (mostrarItensEditaveis && itensEditaveis.length > 0)
      ? custoTotalItens * (1 + formData.margem / 100)
      : valorVenda;

    await createMutation.mutateAsync({
      numero: numeroOrcamento,
      projeto_nome: formData.projeto_nome,
      cliente_nome: formData.cliente_nome,
      cliente_email: formData.cliente_email || null,
      area: parseFloat(formData.area),
      peso_estimado: pesoEstimado,
      custo_estrutura: custoEstrutura,
      custo_montagem: custoMontagem,
      custo_cobertura: custoCobertura,
      custo_transporte: custoTransporte,
      custo_total: custoTotalItens,
      margem_lucro: (valorVendaFinal - custoTotalItens) / valorVendaFinal * 100,
      valor_venda: valorVendaFinal,
      preco_por_kg: valorVendaFinal / pesoEstimado,
      prazo_fabricacao: response.prazo_fabricacao_dias || 45,
      prazo_montagem: response.prazo_montagem_dias || 15,
      validade: dataValidade.toISOString().split('T')[0],
      status: 'rascunho',
      conteudo_proposta: response.proposta,
      itens: itensFinais
    });

    setIsGenerating(false);
  };

  const enviarParaAprovacao = async (orcamento) => {
    if (!orcamento.cliente_email) {
      const email = prompt('Digite o email do cliente:');
      if (!email) return;
      
      await updateMutation.mutateAsync({
        id: orcamento.id,
        data: { cliente_email: email }
      });
      orcamento.cliente_email = email;
    }

    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const linkAprovacao = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}#/AprovacaoOrcamento?token=${token}`;

    await updateMutation.mutateAsync({
      id: orcamento.id,
      data: {
        link_aprovacao: token,
        status: 'enviado',
        data_envio: new Date().toISOString()
      }
    });

    await base44.integrations.Core.SendEmail({
      to: orcamento.cliente_email,
      subject: `Proposta Comercial ${orcamento.numero} - Grupo Montex`,
      body: `Prezado(a) ${orcamento.cliente_nome},

Segue o link para visualização e aprovação da proposta comercial ${orcamento.numero}:

${linkAprovacao}

Detalhes da proposta:
- Projeto: ${orcamento.projeto_nome}
- Valor: R$ ${orcamento.valor_venda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Prazo: ${(orcamento.prazo_fabricacao || 0) + (orcamento.prazo_montagem || 0)} dias
- Validade: ${orcamento.validade ? format(new Date(orcamento.validade), 'dd/MM/yyyy') : 'A definir'}

Para aprovar ou recusar, acesse o link acima.

Atenciosamente,
Equipe Comercial
Grupo Montex - Estruturas Metálicas
São Joaquim de Bicas, MG`
    });

    toast.success('Orçamento enviado por email!');
  };

  const exportarPDF = async (orcamento) => {
    const jsPDF = (await import('jspdf')).default;
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;
    
    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('GRUPO MONTEX', pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Estruturas Metálicas', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Orçamento número
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`ORÇAMENTO ${orcamento.numero}`, 20, yPos);
    yPos += 10;
    
    // Dados básicos
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Cliente: ${orcamento.cliente_nome}`, 20, yPos);
    yPos += 6;
    doc.text(`Projeto: ${orcamento.projeto_nome}`, 20, yPos);
    yPos += 6;
    doc.text(`Área: ${orcamento.area} m²`, 20, yPos);
    yPos += 6;
    doc.text(`Peso: ${(orcamento.peso_estimado / 1000).toFixed(2)} toneladas`, 20, yPos);
    yPos += 10;
    
    // Valor
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`VALOR TOTAL: R$ ${orcamento.valor_venda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, yPos);
    yPos += 10;
    
    // Itens
    if (orcamento.itens?.length > 0) {
      doc.setFontSize(11);
      doc.text('ITENS:', 20, yPos);
      yPos += 7;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      orcamento.itens.forEach((item) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`• ${item.descricao}`, 25, yPos);
        yPos += 5;
        doc.text(`  ${item.quantidade} ${item.unidade} × R$ ${item.valor_unitario?.toFixed(2)} = R$ ${item.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 25, yPos);
        yPos += 7;
      });
    }
    
    // Proposta
    if (orcamento.conteudo_proposta && yPos < 250) {
      yPos += 5;
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('PROPOSTA COMERCIAL:', 20, yPos);
      yPos += 7;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      const lines = doc.splitTextToSize(orcamento.conteudo_proposta.substring(0, 1000), pageWidth - 40);
      lines.forEach((line) => {
        if (yPos > 280) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 20, yPos);
        yPos += 5;
      });
    }
    
    doc.save(`orcamento_${orcamento.numero}.pdf`);
    toast.success('PDF exportado com sucesso!');
  };

  const abrirEdicao = (orcamento) => {
    setEditingOrcamento(orcamento);
    setFormData({
      cliente_nome: orcamento.cliente_nome || '',
      cliente_email: orcamento.cliente_email || '',
      projeto_nome: orcamento.projeto_nome || '',
      tipo: 'galpao_industrial',
      area: orcamento.area?.toString() || '',
      localizacao: '',
      fatorPeso: orcamento.peso_estimado && orcamento.area ? (orcamento.peso_estimado / orcamento.area).toFixed(0) : 45,
      sobrecarga: 500,
      incluirMontagem: orcamento.custo_montagem > 0,
      incluirCobertura: orcamento.custo_cobertura > 0,
      tipoCobertura: 'telha_metalica',
      margem: orcamento.margem_lucro || 30,
      observacoes: ''
    });
    
    // Carregar itens existentes para edição
    if (orcamento.itens && orcamento.itens.length > 0) {
      const itensParaEdicao = orcamento.itens.map(item => ({
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        valor_unitario: item.valor_unitario,
        editavel: true
      }));
      setItensEditaveis(itensParaEdicao);
      setMostrarItensEditaveis(true);
    }
    
    setShowNewModal(true);
  };

  const salvarEdicao = async () => {
    if (!editingOrcamento) return;

    setIsGenerating(true);

    const pesoEstimado = calcularPesoEstimado(parseFloat(formData.area), formData.tipo, parseFloat(formData.sobrecarga || 500), parseFloat(formData.fatorPeso));
    
    // Usar itens editados se disponíveis
    let custoTotal, valorVenda, itensFinais;
    
    if (mostrarItensEditaveis && itensEditaveis.length > 0) {
      // Calcular baseado nos itens editados
      custoTotal = itensEditaveis.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0);
      valorVenda = custoTotal * (1 + formData.margem / 100);
      itensFinais = itensEditaveis.map(item => ({
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade: item.unidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.quantidade * item.valor_unitario
      }));
    } else {
      // Calcular baseado nos custos padrão
      const custoEstrutura = pesoEstimado * (custosBase.aco + custosBase.fabricacao + custosBase.pintura);
      const custoMontagem = formData.incluirMontagem ? pesoEstimado * custosBase.montagem : 0;
      const custoTransporte = pesoEstimado * custosBase.transporte;
      
      let custoCobertura = 0;
      if (formData.incluirCobertura) {
        const custoPorM2 = formData.tipoCobertura === 'telha_pir' ? 180 : 
                           formData.tipoCobertura === 'steel_deck' ? 200 : 90;
        custoCobertura = parseFloat(formData.area) * custoPorM2;
      }

      const subtotal = custoEstrutura + custoMontagem + custoTransporte + custoCobertura;
      const custoCalhas = subtotal * 0.03;
      const custoChumbadores = subtotal * 0.02;
      const custoEngenharia = subtotal * 0.03;
      custoTotal = subtotal + custoCalhas + custoChumbadores + custoEngenharia;
      valorVenda = custoTotal * (1 + formData.margem / 100);
    }

    const precoPorKg = valorVenda / pesoEstimado;
    const margemFinal = ((valorVenda - custoTotal) / valorVenda) * 100;

    const dataToUpdate = {
      cliente_nome: formData.cliente_nome,
      cliente_email: formData.cliente_email,
      projeto_nome: formData.projeto_nome,
      area: parseFloat(formData.area),
      peso_estimado: pesoEstimado,
      custo_total: custoTotal,
      margem_lucro: margemFinal,
      valor_venda: valorVenda,
      preco_por_kg: precoPorKg,
    };

    // Adicionar itens se foram editados
    if (itensFinais) {
      dataToUpdate.itens = itensFinais;
    }

    await updateMutation.mutateAsync({
      id: editingOrcamento.id,
      data: dataToUpdate
    });

    setIsGenerating(false);
    setEditingOrcamento(null);
    setItensEditaveis([]);
    setMostrarItensEditaveis(false);
    setShowNewModal(false);
    toast.success('Orçamento atualizado com sucesso!');
  };

  const copiarLinkAprovacao = (orcamento) => {
    const link = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}#/AprovacaoOrcamento?token=${orcamento.link_aprovacao}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado para área de transferência!');
  };

  const gerarTemplateExcel = async () => {
    const XLSX = await import('xlsx');

    const wb = XLSX.utils.book_new();

    const dadosBasicos = [
      ['TEMPLATE DE ORÇAMENTO - MONTEX'],
      [''],
      ['DADOS BÁSICOS DO ORÇAMENTO'],
      ['Número do Orçamento', ''],
      ['Nome do Projeto', ''],
      ['Nome do Cliente', ''],
      ['Email do Cliente', ''],
      ['Área (m²)', ''],
      ['Peso Estimado (kg)', ''],
      [''],
      ['CUSTOS'],
      ['Custo Estrutura (R$)', ''],
      ['Custo Montagem (R$)', ''],
      ['Custo Cobertura (R$)', ''],
      ['Custo Transporte (R$)', ''],
      ['Custo Total (R$)', '=B12+B13+B14+B15'],
      [''],
      ['VALORES DE VENDA'],
      ['Margem de Lucro (%)', ''],
      ['Valor de Venda (R$)', '=B16*(1+B19/100)'],
      ['Preço por kg (R$/kg)', '=B20/B9'],
      [''],
      ['PRAZOS'],
      ['Prazo Fabricação (dias)', ''],
      ['Prazo Montagem (dias)', ''],
      ['Data de Validade (dd/mm/aaaa)', ''],
      [''],
      ['Status', 'rascunho'],
      [''],
      ['INSTRUÇÕES:'],
      ['1. Preencha todos os campos marcados com valores'],
      ['2. As células com fórmulas serão calculadas automaticamente'],
      ['3. Preencha a aba ITENS com os itens do orçamento'],
      ['4. Status possíveis: rascunho, enviado, em_negociacao, aprovado, recusado'],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(dadosBasicos);
    ws1['!cols'] = [{ wch: 35 }, { wch: 30 }];

    const itens = [
      ['ITENS DO ORÇAMENTO'],
      [''],
      ['Descrição', 'Quantidade', 'Unidade', 'Valor Unitário (R$)', 'Valor Total (R$)'],
      ['Exemplo: Perfil metálico W150', '1000', 'kg', '8.50', '=B4*D4'],
      ['Exemplo: Montagem estrutura', '50', 'm²', '45.00', '=B5*D5'],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', '', ''],
      ['', '', '', 'TOTAL ITENS:', '=SUM(E4:E15)'],
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(itens);
    ws2['!cols'] = [{ wch: 50 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 20 }];

    const referencias = [
      ['REFERÊNCIA - CATEGORIAS E OPÇÕES'],
      [''],
      ['UNIDADES POSSÍVEIS:'],
      ['kg', 'quilogramas'],
      ['m²', 'metros quadrados'],
      ['m³', 'metros cúbicos'],
      ['m', 'metros lineares'],
      ['un', 'unidades'],
      ['h', 'horas'],
      [''],
      ['STATUS POSSÍVEIS:'],
      ['rascunho', 'Orçamento em elaboração'],
      ['enviado', 'Enviado para o cliente'],
      ['em_negociacao', 'Em negociação com cliente'],
      ['aprovado', 'Aprovado pelo cliente'],
      ['recusado', 'Recusado pelo cliente'],
      ['expirado', 'Orçamento expirado'],
      [''],
      ['FORMAS DE PAGAMENTO:'],
      ['dinheiro', 'pix', 'transferencia', 'boleto', 'cartao', 'cheque'],
      [''],
      ['DICAS:'],
      ['- Custo Total = Estrutura + Montagem + Cobertura + Transporte'],
      ['- Valor de Venda = Custo Total × (1 + Margem de Lucro%)'],
      ['- Preço por kg = Valor de Venda ÷ Peso Estimado'],
      ['- Validade padrão: 30 dias da data de emissão'],
      ['- Margem de lucro típica: 15% a 35%'],
    ];

    const ws3 = XLSX.utils.aoa_to_sheet(referencias);
    ws3['!cols'] = [{ wch: 25 }, { wch: 40 }];

    XLSX.utils.book_append_sheet(wb, ws1, 'Dados Básicos');
    XLSX.utils.book_append_sheet(wb, ws2, 'Itens');
    XLSX.utils.book_append_sheet(wb, ws3, 'Referência');

    XLSX.writeFile(wb, `template_orcamento_montex_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const criarProjetoDeOrcamento = async (orcamento) => {
    await criarProjetoMutation.mutateAsync({
      nome: orcamento.projeto_nome,
      cliente_nome: orcamento.cliente_nome,
      tipo: 'galpao_industrial',
      area: orcamento.area,
      peso_estimado: orcamento.peso_estimado,
      status: 'aprovado',
      valor_contrato: orcamento.valor_venda,
      data_inicio: new Date().toISOString().split('T')[0],
      observacoes: `Projeto criado a partir do orçamento ${orcamento.numero}`
    });

    await updateMutation.mutateAsync({
      id: orcamento.id,
      data: { projeto_id: 'criado' }
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      rascunho: { label: 'Rascunho', className: 'bg-slate-100 text-slate-700' },
      enviado: { label: 'Enviado', className: 'bg-blue-100 text-blue-700' },
      em_negociacao: { label: 'Em Negociação', className: 'bg-yellow-100 text-yellow-700' },
      aprovado: { label: 'Aprovado', className: 'bg-emerald-100 text-emerald-700' },
      recusado: { label: 'Recusado', className: 'bg-red-100 text-red-700' },
      expirado: { label: 'Expirado', className: 'bg-slate-100 text-slate-500' }
    };
    return config[status] || config.rascunho;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Orçamentos</h1>
          <p className="text-slate-500 mt-1">Geração de propostas com IA e análise visual</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={gerarTemplateExcel}
            variant="outline"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Template Excel
          </Button>
          <Button 
            onClick={() => setShowNewModal(true)}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Novo Orçamento com IA
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total de Orçamentos</p>
                <p className="text-2xl font-bold text-slate-900">{orcamentos.length}</p>
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
                <p className="text-sm text-slate-500">Aprovados</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {orcamentos.filter(o => o.status === 'aprovado').length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Em Negociação</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {orcamentos.filter(o => ['enviado', 'em_negociacao'].includes(o.status)).length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Calculator className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Valor Total Aprovado</p>
                <p className="text-2xl font-bold text-slate-900">
                  R$ {(orcamentos.filter(o => o.status === 'aprovado').reduce((acc, o) => acc + (o.valor_venda || 0), 0) / 1000000).toFixed(2)}M
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-ups Personalizados */}
      {orcamentos.some(o => ['enviado', 'em_negociacao'].includes(o.status)) && (
        <FollowUpsPersonalizados 
          orcamentos={orcamentos}
          clientes={clientes}
        />
      )}

      {/* Gráficos Analíticos */}
      {orcamentos.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EvolucaoPorStatus orcamentos={orcamentos} />
            <ValorPorStatus orcamentos={orcamentos} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DistribuicaoCustos orcamentos={orcamentos} />
            <EvolucaoTemporal orcamentos={orcamentos} />
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="border-slate-100">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : orcamentos.length === 0 ? (
            <div className="text-center py-12">
              <Calculator className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum orçamento ainda</h3>
              <p className="text-slate-500 mb-4">Comece criando seu primeiro orçamento com IA</p>
              <Button 
                onClick={() => setShowNewModal(true)}
                className="bg-gradient-to-r from-orange-500 to-orange-600"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Criar Orçamento
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orcamentos.map((orcamento) => {
                  const statusConfig = getStatusBadge(orcamento.status);
                  return (
                    <TableRow key={orcamento.id} className="cursor-pointer hover:bg-slate-50">
                      <TableCell className="font-medium">{orcamento.numero}</TableCell>
                      <TableCell>{orcamento.projeto_nome || '-'}</TableCell>
                      <TableCell>{orcamento.cliente_nome || '-'}</TableCell>
                      <TableCell>
                        {orcamento.peso_estimado ? `${(orcamento.peso_estimado / 1000).toFixed(1)} ton` : '-'}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {orcamento.valor_venda 
                          ? `R$ ${orcamento.valor_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.className}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {orcamento.created_date 
                          ? format(new Date(orcamento.created_date), "dd/MM/yyyy", { locale: ptBR })
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
                            <DropdownMenuItem onClick={() => setSelectedOrcamento(orcamento)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirEdicao(orcamento)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportarPDF(orcamento)}>
                              <Download className="h-4 w-4 mr-2" />
                              Exportar PDF
                            </DropdownMenuItem>
                            
                            {orcamento.status === 'rascunho' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => enviarParaAprovacao(orcamento)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Enviar para Aprovação
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {orcamento.link_aprovacao && (
                              <DropdownMenuItem onClick={() => copiarLinkAprovacao(orcamento)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copiar Link de Aprovação
                              </DropdownMenuItem>
                            )}
                            
                            {orcamento.status === 'aprovado' && !orcamento.projeto_id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => criarProjetoDeOrcamento(orcamento)}>
                                  <FileCheck className="h-4 w-4 mr-2" />
                                  Criar Projeto
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja excluir o orçamento ${orcamento.numero}?`)) {
                                  deleteMutation.mutate(orcamento.id);
                                }
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
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

      {/* New Budget Modal */}
      <Dialog open={showNewModal} onOpenChange={(open) => {
        setShowNewModal(open);
        if (!open) {
          setEditingOrcamento(null);
          setItensEditaveis([]);
          setMostrarItensEditaveis(false);
          setFormData({
            cliente_nome: '',
            cliente_email: '',
            projeto_nome: '',
            tipo: 'galpao_industrial',
            area: '',
            localizacao: '',
            incluirMontagem: true,
            incluirCobertura: false,
            tipoCobertura: 'telha_metalica',
            margem: 30,
            fatorPeso: 45,
            sobrecarga: 500,
            observacoes: ''
          });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-500" />
              {editingOrcamento ? 'Editar Orçamento' : 'Novo Orçamento com IA'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={formData.cliente_nome}
                  onChange={(e) => setFormData({ ...formData, cliente_nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email do Cliente</Label>
                <Input
                  type="email"
                  placeholder="email@cliente.com"
                  value={formData.cliente_email || ''}
                  onChange={(e) => setFormData({ ...formData, cliente_email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome do Projeto *</Label>
              <Input
                placeholder="Ex: Galpão Industrial ABC"
                value={formData.projeto_nome}
                onChange={(e) => setFormData({ ...formData, projeto_nome: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Estrutura *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => {
                    const tipoConfig = tiposEstrutura.find(t => t.value === value);
                    setFormData({ 
                      ...formData, 
                      tipo: value,
                      fatorPeso: tipoConfig?.fator || 30
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposEstrutura.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Área (m²) *</Label>
                <Input
                  type="number"
                  placeholder="Ex: 1500"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Taxa de Carga (kg/m²)</Label>
              <Input
                type="number"
                placeholder="Ex: 60"
                value={formData.fatorPeso}
                onChange={(e) => setFormData({ ...formData, fatorPeso: e.target.value })}
              />
              <p className="text-xs text-slate-500">
                {formData.area && formData.fatorPeso 
                  ? `${formData.area}m² × ${formData.fatorPeso}kg/m² = ${(parseFloat(formData.area) * parseFloat(formData.fatorPeso) / 1000).toFixed(2)} toneladas`
                  : 'Taxa de peso por metro quadrado (referência para cálculo)'
                }
              </p>
            </div>

            {formData.tipo === 'mezanino' && (
              <div className="space-y-2">
                <Label>Sobrecarga (kg/m²)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 500"
                  value={formData.sobrecarga}
                  onChange={(e) => setFormData({ ...formData, sobrecarga: e.target.value })}
                />
                <p className="text-xs text-slate-500">
                  Sobrecarga de utilização prevista para o mezanino (típico: 300-1000 kg/m²)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Localização</Label>
              <Input
                placeholder="Cidade, Estado"
                value={formData.localizacao}
                onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>Serviços Inclusos</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.incluirMontagem}
                      onChange={(e) => setFormData({ ...formData, incluirMontagem: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">Incluir montagem</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.incluirCobertura}
                      onChange={(e) => setFormData({ ...formData, incluirCobertura: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm">Incluir cobertura</span>
                  </label>
                </div>
              </div>
              
              {formData.incluirCobertura && (
                <div className="space-y-2">
                  <Label>Tipo de Cobertura</Label>
                  <Select
                    value={formData.tipoCobertura}
                    onValueChange={(value) => setFormData({ ...formData, tipoCobertura: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="telha_metalica">Telha Metálica</SelectItem>
                      <SelectItem value="telha_pir">Telha PIR 30mm</SelectItem>
                      <SelectItem value="steel_deck">Steel Deck</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Margem de Lucro (%)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.1"
                  value={formData.margem}
                  onChange={(e) => setFormData({ ...formData, margem: parseFloat(e.target.value) || 30 })}
                  className="flex-1"
                />
                <Badge className="bg-orange-100 text-orange-800 px-3 flex items-center">
                  {formData.margem}%
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {mostrarItensEditaveis && itensEditaveis.length > 0 && (
                  <>
                    Custo: R$ {itensEditaveis.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} → 
                    Venda: R$ {(itensEditaveis.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0) * (1 + formData.margem / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Informações adicionais sobre o projeto..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Itens Adicionais do Catálogo */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label>Itens Adicionais do Catálogo</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCatalogo(true)}
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar do Catálogo
                </Button>
              </div>

              {itensPersonalizados.length > 0 && (
                <div className="space-y-2">
                  {itensPersonalizados.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-4 gap-3 text-sm">
                        <div className="col-span-2">
                          <p className="font-medium text-slate-900">{item.descricao}</p>
                        </div>
                        <div>
                          <Input
                            type="number"
                            value={item.quantidade}
                            onChange={(e) => {
                              const newItens = [...itensPersonalizados];
                              newItens[index].quantidade = parseFloat(e.target.value) || 0;
                              setItensPersonalizados(newItens);
                            }}
                            className="h-8 text-xs"
                            placeholder="Qtd"
                          />
                          <p className="text-xs text-slate-500 mt-1">{item.unidade}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-600">R$ {item.valor_unitario?.toFixed(2)}</p>
                          <p className="font-semibold text-orange-600">
                            R$ {(item.quantidade * item.valor_unitario).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setItensPersonalizados(itensPersonalizados.filter((_, i) => i !== index));
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="text-right text-sm font-semibold text-slate-900 pt-2 border-t">
                    Subtotal Itens: R$ {itensPersonalizados.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0).toFixed(2)}
                  </div>
                </div>
              )}

              {itensPersonalizados.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-3 bg-slate-50 rounded-lg">
                  Nenhum item adicional. Clique em "Adicionar do Catálogo" para incluir itens.
                </p>
              )}
            </div>

            {/* Preview e Edição de Itens */}
            {formData.area && (
              <div className="space-y-4">
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-900 mb-3">Estimativa Prévia</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Peso Estimado:</span>
                        <span className="ml-2 font-medium">
                          {(calcularPesoEstimado(parseFloat(formData.area), formData.tipo, parseFloat(formData.sobrecarga), parseFloat(formData.fatorPeso)) / 1000).toFixed(2)} ton
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Prazo Estimado:</span>
                        <span className="ml-2 font-medium">
                          ~{Math.ceil(calcularPesoEstimado(parseFloat(formData.area), formData.tipo, parseFloat(formData.sobrecarga), parseFloat(formData.fatorPeso)) / 50000)} meses
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-orange-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-orange-600" />
                        Itens da Proposta
                      </CardTitle>
                      <Button
                        type="button"
                        variant={mostrarItensEditaveis ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (!mostrarItensEditaveis) {
                            const pesoEstimado = calcularPesoEstimado(parseFloat(formData.area), formData.tipo, parseFloat(formData.sobrecarga), parseFloat(formData.fatorPeso));
                            const custoEstrutura = pesoEstimado * (custosBase.aco + custosBase.fabricacao + custosBase.pintura);
                            const custoMontagem = formData.incluirMontagem ? pesoEstimado * custosBase.montagem : 0;
                            const custoTransporte = pesoEstimado * custosBase.transporte;
                            let custoCobertura = 0;
                            if (formData.incluirCobertura) {
                              const custoPorM2 = formData.tipoCobertura === 'telha_pir' ? 180 : 
                                                 formData.tipoCobertura === 'steel_deck' ? 200 : 90;
                              custoCobertura = parseFloat(formData.area) * custoPorM2;
                            }
                            const subtotal = custoEstrutura + custoMontagem + custoTransporte + custoCobertura;
                            const custoCalhas = subtotal * 0.03;
                            const custoChumbadores = subtotal * 0.02;
                            const custoEngenharia = subtotal * 0.03;

                            const itensBase = [
                              {
                                descricao: 'Estrutura metálica - Fabricação completa',
                                quantidade: pesoEstimado,
                                unidade: 'kg',
                                valor_unitario: custosBase.aco + custosBase.fabricacao + custosBase.pintura,
                                editavel: true
                              }
                            ];

                            if (formData.incluirMontagem) {
                              itensBase.push({
                                descricao: 'Montagem da estrutura',
                                quantidade: pesoEstimado,
                                unidade: 'kg',
                                valor_unitario: custosBase.montagem,
                                editavel: true
                              });
                            }

                            if (formData.incluirCobertura) {
                              const custoPorM2 = formData.tipoCobertura === 'telha_pir' ? 180 : 
                                                 formData.tipoCobertura === 'steel_deck' ? 200 : 90;
                              itensBase.push({
                                descricao: `Cobertura - ${formData.tipoCobertura.replace('_', ' ')}`,
                                quantidade: parseFloat(formData.area),
                                unidade: 'm²',
                                valor_unitario: custoPorM2,
                                editavel: true
                              });
                            }

                            itensBase.push(
                              {
                                descricao: 'Transporte',
                                quantidade: pesoEstimado,
                                unidade: 'kg',
                                valor_unitario: custosBase.transporte,
                                editavel: true
                              },
                              {
                                descricao: 'Calhas e rufos',
                                quantidade: 1,
                                unidade: 'vb',
                                valor_unitario: custoCalhas,
                                editavel: true
                              },
                              {
                                descricao: 'Chumbadores e fixações',
                                quantidade: 1,
                                unidade: 'vb',
                                valor_unitario: custoChumbadores,
                                editavel: true
                              },
                              {
                                descricao: 'Engenharia e detalhamento',
                                quantidade: 1,
                                unidade: 'vb',
                                valor_unitario: custoEngenharia,
                                editavel: true
                              }
                            );

                            itensPersonalizados.forEach(item => {
                              itensBase.push({
                                descricao: item.descricao,
                                quantidade: item.quantidade,
                                unidade: item.unidade,
                                valor_unitario: item.valor_unitario,
                                editavel: true
                              });
                            });

                            setItensEditaveis(itensBase);
                          }
                          setMostrarItensEditaveis(!mostrarItensEditaveis);
                        }}
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        {mostrarItensEditaveis ? 'Ocultar Itens' : 'Editar Itens'}
                      </Button>
                    </div>
                  </CardHeader>
                  {mostrarItensEditaveis && (
                    <CardContent className="space-y-3">
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {itensEditaveis.map((item, index) => (
                          <div key={index} className="p-3 bg-white rounded-lg border border-slate-200">
                            <div className="grid grid-cols-12 gap-3 items-start">
                              <div className="col-span-5">
                                <Label className="text-xs text-slate-500">Descrição</Label>
                                <Input
                                  value={item.descricao}
                                  onChange={(e) => {
                                    const newItens = [...itensEditaveis];
                                    newItens[index].descricao = e.target.value;
                                    setItensEditaveis(newItens);
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs text-slate-500">Quantidade</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.quantidade}
                                  onChange={(e) => {
                                    const newItens = [...itensEditaveis];
                                    newItens[index].quantidade = parseFloat(e.target.value) || 0;
                                    setItensEditaveis(newItens);
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="col-span-1">
                                <Label className="text-xs text-slate-500">Un.</Label>
                                <Input
                                  value={item.unidade}
                                  onChange={(e) => {
                                    const newItens = [...itensEditaveis];
                                    newItens[index].unidade = e.target.value;
                                    setItensEditaveis(newItens);
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs text-slate-500">Vlr. Unit.</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.valor_unitario}
                                  onChange={(e) => {
                                    const newItens = [...itensEditaveis];
                                    newItens[index].valor_unitario = parseFloat(e.target.value) || 0;
                                    setItensEditaveis(newItens);
                                  }}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="col-span-1">
                                <Label className="text-xs text-slate-500">Total</Label>
                                <p className="text-sm font-semibold text-slate-900 mt-1.5">
                                  R$ {(item.quantidade * item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div className="col-span-1 flex items-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setItensEditaveis(itensEditaveis.filter((_, i) => i !== index));
                                  }}
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <XIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setItensEditaveis([...itensEditaveis, {
                            descricao: 'Novo item',
                            quantidade: 1,
                            unidade: 'un',
                            valor_unitario: 0,
                            editavel: true
                          }]);
                        }}
                        className="w-full border-dashed border-2 text-slate-600 hover:text-slate-900"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Item Manualmente
                      </Button>

                      <div className="flex justify-between items-center pt-3 border-t-2 border-orange-200">
                        <span className="text-sm font-semibold text-slate-600">Valor Total dos Itens:</span>
                        <span className="text-xl font-bold text-orange-600">
                          R$ {itensEditaveis.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNewModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={editingOrcamento ? salvarEdicao : gerarOrcamentoComIA}
                disabled={!formData.area || !formData.cliente_nome || !formData.projeto_nome || isGenerating}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingOrcamento ? 'Salvando...' : 'Gerando com IA...'}
                  </>
                ) : editingOrcamento ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Orçamento
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Budget Modal */}
      <Dialog open={!!selectedOrcamento} onOpenChange={() => setSelectedOrcamento(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Orçamento {selectedOrcamento?.numero}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrcamento && (
            <div className="space-y-6 py-4">
              <Tabs defaultValue="detalhes" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
                  <TabsTrigger value="detalhadoItem">Orçamento Detalhado</TabsTrigger>
                  <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
                  <TabsTrigger value="analise">Análise IA</TabsTrigger>
                  <TabsTrigger value="otimizacao">Otimização</TabsTrigger>
                  <TabsTrigger value="rentabilidade">Rentabilidade</TabsTrigger>
                </TabsList>

                <TabsContent value="detalhes" className="space-y-6 mt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-slate-500">Cliente</p>
                  <p className="font-medium">{selectedOrcamento.cliente_nome}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Projeto</p>
                  <p className="font-medium">{selectedOrcamento.projeto_nome}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Peso</p>
                  <p className="font-medium">{(selectedOrcamento.peso_estimado / 1000).toFixed(2)} ton</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Valor Total</p>
                  <p className="font-bold text-lg text-orange-600">
                    R$ {selectedOrcamento.valor_venda?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedOrcamento.status === 'rascunho' && (
                  <Button
                    onClick={() => {
                      enviarParaAprovacao(selectedOrcamento);
                      setSelectedOrcamento(null);
                    }}
                    className="bg-gradient-to-r from-blue-500 to-blue-600"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar para Aprovação
                  </Button>
                )}
                
                {selectedOrcamento.link_aprovacao && (
                  <Button
                    variant="outline"
                    onClick={() => copiarLinkAprovacao(selectedOrcamento)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link
                  </Button>
                )}
                
                {selectedOrcamento.status === 'aprovado' && !selectedOrcamento.projeto_id && (
                  <Button
                    onClick={() => {
                      criarProjetoDeOrcamento(selectedOrcamento);
                      setSelectedOrcamento(null);
                    }}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600"
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    Criar Projeto
                  </Button>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-3">Proposta Comercial</h4>
                <div className="bg-slate-50 rounded-xl p-6 prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-slate-700">
                    {selectedOrcamento.conteudo_proposta}
                  </pre>
                </div>
              </div>

              {selectedOrcamento.itens?.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Itens do Orçamento</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Un</TableHead>
                        <TableHead>Valor Unit.</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrcamento.itens.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.descricao}</TableCell>
                          <TableCell>{item.quantidade?.toLocaleString('pt-BR')}</TableCell>
                          <TableCell>{item.unidade}</TableCell>
                          <TableCell>R$ {item.valor_unitario?.toFixed(2)}</TableCell>
                          <TableCell className="font-medium">
                            R$ {item.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
                </TabsContent>

                <TabsContent value="detalhadoItem" className="mt-4">
                  <OrcamentoDetalhadoPorItem 
                    orcamento={selectedOrcamento}
                    projetos={projetos}
                    itens={selectedOrcamento.projeto_id ? 
                      [...(itensFabricacao || []), ...(itensMontagem || [])] : 
                      []
                    }
                  />
                </TabsContent>

                <TabsContent value="comparativo" className="mt-4">
                  <RelatorioComparativoDetalhado
                    orcamento={selectedOrcamento}
                    projeto={projetos.find(p => p.id === selectedOrcamento.projeto_id)}
                  />
                </TabsContent>

                <TabsContent value="analise" className="mt-4">
                  <AnaliseProbabilidadeAprovacao 
                    orcamento={selectedOrcamento} 
                    historico={orcamentos}
                  />
                </TabsContent>

                <TabsContent value="otimizacao" className="mt-4">
                  <SugestoesOtimizacao 
                    orcamento={selectedOrcamento} 
                    historico={orcamentos}
                  />
                </TabsContent>

                <TabsContent value="rentabilidade" className="mt-4">
                  <AnalisePreditivaRentabilidade
                    orcamento={selectedOrcamento}
                    projetos={projetos}
                    orcamentos={orcamentos}
                    movimentacoes={movimentacoes}
                  />
                </TabsContent>

                <TabsContent value="dinamico" className="mt-4">
                  <AjustesDinamicosTempoReal
                    orcamento={selectedOrcamento}
                    orcamentos={orcamentos}
                    onAplicarAjuste={(ajuste) => {
                      if (confirm(`Aplicar ajuste de ${ajuste.percentual.toFixed(1)}% no orçamento?`)) {
                        updateMutation.mutate({
                          id: selectedOrcamento.id,
                          data: { valor_venda: ajuste.valor_sugerido }
                        });
                        toast.success('Ajuste aplicado!');
                      }
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Catálogo de Itens */}
      <CatalogoItens
        open={showCatalogo}
        onClose={() => setShowCatalogo(false)}
        onSelectItem={(item) => {
          setItensPersonalizados([...itensPersonalizados, item]);
        }}
      />
    </div>
  );
}