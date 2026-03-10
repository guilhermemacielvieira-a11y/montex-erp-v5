import React, { useState, useCallback, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Search, FileText, X, Loader2, CheckCircle2, AlertCircle,
  Receipt, Building2, Calendar, DollarSign, Hash,
  Download, Upload, Key, FileUp, Tag, CreditCard, Layers
} from 'lucide-react';
import { notasFiscaisApi } from '../api/supabaseClient';
import { toast } from 'sonner';

// ============================================
// PARSER XML NFe (usa DOMParser nativo)
// ============================================
function parseNFeXML(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('XML invalido: ' + parseError.textContent.substring(0, 100));

  const getText = (parent, tagName) => {
    if (!parent) return '';
    let el = parent.getElementsByTagName(tagName)[0];
    if (!el) {
      const ns = 'http://www.portalfiscal.inf.br/nfe';
      el = parent.getElementsByTagNameNS(ns, tagName)[0];
    }
    return el?.textContent?.trim() || '';
  };

  const getAll = (parent, tagName) => {
    if (!parent) return [];
    let els = parent.getElementsByTagName(tagName);
    if (els.length === 0) {
      const ns = 'http://www.portalfiscal.inf.br/nfe';
      els = parent.getElementsByTagNameNS(ns, tagName);
    }
    return Array.from(els);
  };

  // Dados de identificação (ide)
  const numero = getText(doc, 'nNF');
  const serie = getText(doc, 'serie');
  const dataEmissao = getText(doc, 'dhEmi')?.substring(0, 10) || getText(doc, 'dEmi');
  const natOp = getText(doc, 'natOp');

  // Chave de acesso
  let chaveAcesso = '';
  const infNFe = doc.getElementsByTagName('infNFe')[0]
    || doc.getElementsByTagNameNS('http://www.portalfiscal.inf.br/nfe', 'infNFe')[0];
  if (infNFe) {
    const id = infNFe.getAttribute('Id') || '';
    chaveAcesso = id.replace(/^NFe/, '');
  }

  // Emitente (emit)
  const emitNode = doc.getElementsByTagName('emit')[0]
    || doc.getElementsByTagNameNS('http://www.portalfiscal.inf.br/nfe', 'emit')[0];
  const fornecedor = getText(emitNode, 'xNome') || getText(emitNode, 'xFant');
  const cnpj = getText(emitNode, 'CNPJ');
  const cnpjFormatado = cnpj.length === 14
    ? cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : cnpj;

  // Totais (ICMSTot)
  const valorTotal = parseFloat(getText(doc, 'vNF')) || 0;

  // === PAGAMENTO (pag > detPag > tPag) ===
  const detPagNodes = getAll(doc, 'detPag');
  let formaPagamento = '';
  let codigoPagamento = '';
  if (detPagNodes.length > 0) {
    codigoPagamento = getText(detPagNodes[0], 'tPag');
    formaPagamento = mapearFormaPagamento(codigoPagamento);
  } else {
    // Fallback: tentar tPag direto
    codigoPagamento = getText(doc, 'tPag');
    formaPagamento = mapearFormaPagamento(codigoPagamento);
  }

  // === COBRANÇA / VENCIMENTO (cobr > dup > dVenc) ===
  let dataVencimento = '';
  const dupNodes = getAll(doc, 'dup');
  if (dupNodes.length > 0) {
    // Pegar a primeira duplicata (ou a última para prazo maior)
    const primeiraVenc = getText(dupNodes[0], 'dVenc');
    const ultimaVenc = getText(dupNodes[dupNodes.length - 1], 'dVenc');
    dataVencimento = ultimaVenc || primeiraVenc || '';

    // Se tem múltiplas duplicatas e sem forma de pagamento, é parcelado (boleto)
    if (!formaPagamento && dupNodes.length >= 1) {
      formaPagamento = 'Boleto';
    }
  }

  // Se ainda não tem vencimento, usar 30 dias após emissão como padrão
  if (!dataVencimento && dataEmissao) {
    try {
      const dtEmissao = new Date(dataEmissao + 'T00:00:00');
      dtEmissao.setDate(dtEmissao.getDate() + 30);
      dataVencimento = dtEmissao.toISOString().split('T')[0];
    } catch (e) { /* ignorar */ }
  }

  // Itens (det)
  const detNodes = getAll(doc, 'det');
  const itens = detNodes.map(det => {
    const prod = det.getElementsByTagName('prod')[0]
      || det.getElementsByTagNameNS('http://www.portalfiscal.inf.br/nfe', 'prod')[0];

    const descricao = getText(prod, 'xProd');
    const qtd = parseFloat(getText(prod, 'qCom')) || 0;
    const unidade = getText(prod, 'uCom') || getText(prod, 'uTrib');
    const valorUnit = parseFloat(getText(prod, 'vUnCom')) || 0;
    const valorTotalItem = parseFloat(getText(prod, 'vProd')) || 0;
    const ncm = getText(prod, 'NCM');
    const cfop = getText(prod, 'CFOP');

    return { descricao, qtd, unidade, valorUnit, valorTotal: valorTotalItem, ncm, cfop };
  });

  if (!numero && !fornecedor && itens.length === 0) {
    throw new Error('XML nao parece ser uma NFe valida. Verifique o arquivo.');
  }

  return {
    numero, serie, fornecedor, cnpj: cnpjFormatado,
    dataEmissao, dataVencimento, valor: valorTotal, tipo: 'entrada',
    itens, chaveAcesso, naturezaOp: natOp,
    formaPagamento,
    observacoes: ''
  };
}

// ============================================
// MAPEAMENTO FORMA DE PAGAMENTO (códigos SEFAZ)
// ============================================
function mapearFormaPagamento(codigo) {
  const mapa = {
    '01': 'Dinheiro',
    '02': 'Cheque',
    '03': 'Cartão de Crédito',
    '04': 'Cartão de Débito',
    '05': 'Crédito Loja',
    '10': 'Vale Alimentação',
    '11': 'Vale Refeição',
    '12': 'Vale Presente',
    '13': 'Vale Combustível',
    '14': 'Duplicata Mercantil',
    '15': 'Boleto',
    '16': 'Depósito Bancário',
    '17': 'PIX',
    '18': 'Transferência',
    '19': 'Cashback',
    '90': 'Sem Pagamento',
    '99': 'Outros',
  };
  return mapa[String(codigo || '')] || '';
}

// ============================================
// CLASSIFICAÇÃO DE NATUREZA POR CFOP/NCM
// ============================================
function classificarNaturezaPorCFOP(cfop) {
  const c = String(cfop || '');
  if (['1101', '2101', '1151', '2151', '1201', '2201'].includes(c)) return 'Compra de matéria-prima';
  if (['1102', '2102', '1113', '2113', '1152', '2152'].includes(c)) return 'Compra para revenda';
  if (['1126', '2126', '1128', '2128', '1352', '2352'].includes(c)) return 'Compra para utilização na prestação de serviços';
  if (['1120', '2120', '1121', '2121'].includes(c)) return 'Compra de material de embalagem';
  if (['1556', '2556', '1407', '2407', '1501', '2501', '1653', '2653'].includes(c)) return 'Compra para uso e consumo';
  if (c.startsWith('1') || c.startsWith('2')) return 'Compra para uso e consumo';
  return '';
}

// ============================================
// CLASSIFICAÇÃO AUTOMÁTICA DE CATEGORIA
// Mapeia para as categorias do DespesasPage
// ============================================
const CATEGORIAS_DISPONIVEIS = [
  'Matéria Prima',
  'Mão de Obra',
  'Energia/Utilidades',
  'Manutenção',
  'Transporte',
  'Administrativo',
  'Impostos',
  'Outros',
];

function classificarCategoria(itens, naturezaOp) {
  if (!itens || itens.length === 0) return 'Outros';

  // Analisar todos os itens para uma classificação mais precisa
  const descricoes = itens.map(i => (i.descricao || '').toLowerCase()).join(' ');
  const ncms = itens.map(i => (i.ncm || '').substring(0, 4));
  const cfops = itens.map(i => String(i.cfop || ''));
  const natOpLower = (naturezaOp || '').toLowerCase();

  // Transporte/Frete
  if (descricoes.match(/frete|transporte|logistic|carreto|mudança/) ||
      natOpLower.includes('frete') || natOpLower.includes('transporte') ||
      cfops.some(c => ['1352', '2352', '1353', '2353'].includes(c))) {
    return 'Transporte';
  }

  // Mão de Obra / Serviços
  if (descricoes.match(/servico|serviço|mao de obra|mão de obra|consultoria|locação|aluguel/) ||
      natOpLower.includes('serviço') || natOpLower.includes('servico') ||
      natOpLower.includes('prestação') ||
      cfops.some(c => ['1126', '2126', '1128', '2128', '1933', '2933'].includes(c))) {
    return 'Mão de Obra';
  }

  // Energia / Utilidades
  if (descricoes.match(/energia|eletric|gas|agua|água|combustivel|combustível|diesel|gasolina|etanol/) ||
      ncms.some(n => ['2710', '2711', '2716'].includes(n))) {
    return 'Energia/Utilidades';
  }

  // Manutenção
  if (descricoes.match(/manutenção|manutencao|peça|peca|rolamento|correia|filtro|lubrific|oleo|óleo|ferramenta|epi/) ||
      ncms.some(n => ['8482', '8483', '8484', '4016', '8481'].includes(n))) {
    return 'Manutenção';
  }

  // Matéria Prima (chapas, perfis, aço, tinta, solda, eletrodo, etc.)
  if (descricoes.match(/chapa|perfil|viga|tubo|aço|aco|ferro|metalon|barra|cantoneira|tinta|primer|epoxi|epóxi|solda|eletrodo|arame|abrasivo|disco|lixa/) ||
      ncms.some(n => ['7208', '7209', '7210', '7214', '7216', '7306', '7307', '3208', '3209', '8311', '7217', '6804', '6805'].includes(n)) ||
      cfops.some(c => ['1101', '2101', '1151', '2151'].includes(c))) {
    return 'Matéria Prima';
  }

  // Administrativo (material de escritório, informática, etc.)
  if (descricoes.match(/escritorio|escritório|papel|impressora|toner|cartucho|inform|computador|notebook|monitor|telefone/) ||
      ncms.some(n => ['4802', '8471', '8443', '8528'].includes(n))) {
    return 'Administrativo';
  }

  // Fallback baseado no CFOP
  if (cfops.some(c => c.startsWith('1') || c.startsWith('2'))) {
    return 'Matéria Prima'; // Compras gerais → assume matéria prima para metalúrgica
  }

  return 'Outros';
}

// ============================================
// CLASSIFICAÇÃO AUTOMÁTICA DE CENTRO DE CUSTO
// ============================================
const CENTROS_CUSTO = [
  { nome: 'Produção', codigo: 'CC-001' },
  { nome: 'Administrativo', codigo: 'CC-002' },
  { nome: 'Comercial', codigo: 'CC-003' },
  { nome: 'Logística', codigo: 'CC-004' },
  { nome: 'RH', codigo: 'CC-005' },
];

function classificarCentroCusto(categoria, naturezaOp) {
  const natLower = (naturezaOp || '').toLowerCase();
  if (natLower.includes('venda') || natLower.includes('comercial')) return 'Comercial';
  if (natLower.includes('frete') || natLower.includes('transporte')) return 'Logística';

  switch (categoria) {
    case 'Matéria Prima': return 'Produção';
    case 'Mão de Obra': return 'Produção';
    case 'Manutenção': return 'Produção';
    case 'Transporte': return 'Logística';
    case 'Administrativo': return 'Administrativo';
    case 'Energia/Utilidades': return 'Produção';
    case 'Impostos': return 'Administrativo';
    default: return 'Produção';
  }
}

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function formatDate(d) {
  if (!d) return '-';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

const NATUREZAS = [
  'Compra de matéria-prima',
  'Compra de material de embalagem',
  'Compra para revenda',
  'Compra para utilização na prestação de serviços',
  'Compra para uso e consumo'
];

const FORMAS_PAGAMENTO = [
  'Dinheiro',
  'Boleto',
  'PIX',
  'Transferência',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Cheque',
  'Depósito Bancário',
  'Duplicata Mercantil',
  'Outros',
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function ImportarNFModal({ open, onOpenChange, onImportar, obraId }) {
  const [step, setStep] = useState('entrada');
  const [metodo, setMetodo] = useState('xml');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [nfData, setNfData] = useState(null);
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [naturezaSelecionada, setNaturezaSelecionada] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [centroCustoSelecionado, setCentroCustoSelecionado] = useState('');
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [statusSelecionado, setStatusSelecionado] = useState('pendente');
  const [importando, setImportando] = useState(false);
  const [chaveAcesso, setChaveAcesso] = useState('');
  const fileInputRef = useRef(null);

  const resetModal = useCallback(() => {
    setStep('entrada'); setMetodo('xml');
    setLoading(false); setErro(''); setNfData(null);
    setItensSelecionados([]); setNaturezaSelecionada('');
    setCategoriaSelecionada(''); setCentroCustoSelecionado('');
    setFormaPagamentoSelecionada(''); setDataVencimento('');
    setDataEmissao(''); setStatusSelecionado('pendente');
    setImportando(false); setChaveAcesso('');
  }, []);

  // Preencher campos automáticos após parsear
  const preencherCamposAutomaticos = useCallback((parsed) => {
    setNfData(parsed);
    setItensSelecionados(parsed.itens.map((_, i) => i));

    // Natureza por CFOP
    const cfopPrimeiro = parsed.itens[0]?.cfop;
    const natSugerida = classificarNaturezaPorCFOP(cfopPrimeiro);
    setNaturezaSelecionada(natSugerida || 'Compra para uso e consumo');

    // Categoria automática
    const catSugerida = classificarCategoria(parsed.itens, parsed.naturezaOp);
    setCategoriaSelecionada(catSugerida);

    // Centro de custo automático
    const ccSugerido = classificarCentroCusto(catSugerida, parsed.naturezaOp);
    setCentroCustoSelecionado(ccSugerido);

    // Forma de pagamento
    const formaPgto = parsed.formaPagamento || 'Boleto';
    setFormaPagamentoSelecionada(formaPgto);

    // Datas
    setDataEmissao(parsed.dataEmissao || '');
    setDataVencimento(parsed.dataVencimento || '');

    // Status automático:
    // "pago" SOMENTE para compras à vista (Dinheiro, PIX, Cartão de Débito)
    // Demais formas de pagamento = "pendente" (ou "atrasado" se vencido)
    const formasAVista = ['Dinheiro', 'PIX', 'Cartão de Débito'];
    if (formasAVista.includes(formaPgto)) {
      setStatusSelecionado('pago');
    } else if (parsed.dataVencimento) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const venc = new Date(parsed.dataVencimento + 'T00:00:00');
      if (venc < hoje) {
        setStatusSelecionado('atrasado');
      } else {
        setStatusSelecionado('pendente');
      }
    } else {
      setStatusSelecionado('pendente');
    }

    setStep('preview');
  }, []);

  // === UPLOAD XML ===
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xml')) {
      setErro('Selecione um arquivo XML da NFe.');
      return;
    }
    setLoading(true); setErro('');
    try {
      const text = await file.text();
      const parsed = parseNFeXML(text);
      preencherCamposAutomaticos(parsed);
      toast.success(`XML parseado: ${parsed.itens.length} itens de ${parsed.fornecedor}`);
    } catch (err) {
      setErro(err.message || 'Erro ao processar XML');
    }
    setLoading(false);
  }, [preencherCamposAutomaticos]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // === CONSULTA POR CHAVE ===
  const consultarPorChave = useCallback(async () => {
    const chave = chaveAcesso.replace(/\s/g, '');
    if (chave.length !== 44) {
      setErro('A chave de acesso deve ter 44 digitos.');
      return;
    }
    setLoading(true); setErro('');
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/nfe/v1/${chave}`, {
        signal: AbortSignal.timeout(15000)
      });
      if (!resp.ok) {
        if (resp.status === 404) throw new Error('NFe nao encontrada. Verifique a chave de acesso.');
        if (resp.status === 500) throw new Error('Servico indisponivel. Tente importar via XML.');
        throw new Error(`Erro ${resp.status} na consulta.`);
      }
      const data = await resp.json();

      const parsed = {
        numero: String(data.nfe_numero || data.numero || ''),
        serie: String(data.serie || '1'),
        fornecedor: data.emitente?.razao_social || data.emitente?.nome_fantasia || '',
        cnpj: data.emitente?.cnpj || '',
        dataEmissao: (data.data_emissao || '').substring(0, 10),
        dataVencimento: (data.data_vencimento || data.cobranca?.duplicatas?.[0]?.data_vencimento || '').substring(0, 10),
        valor: data.valor_total || data.total?.icms_total?.valor_total_nota || 0,
        tipo: 'entrada',
        formaPagamento: data.pagamento?.forma_pagamento || '',
        itens: (data.itens || data.produtos || []).map(item => ({
          descricao: item.descricao || item.nome || '',
          qtd: item.quantidade || 0,
          unidade: item.unidade || 'UN',
          valorUnit: item.valor_unitario || 0,
          valorTotal: item.valor_total || item.valor_bruto || 0,
          ncm: item.ncm || '',
          cfop: item.cfop || ''
        })),
        chaveAcesso: chave,
        naturezaOp: data.natureza_operacao || '',
        observacoes: ''
      };

      preencherCamposAutomaticos(parsed);
      toast.success(`NFe encontrada: ${parsed.fornecedor}`);
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        setErro('Timeout na consulta. O servico pode estar indisponivel. Tente importar via XML.');
      } else {
        setErro(err.message || 'Erro na consulta');
      }
    }
    setLoading(false);
  }, [chaveAcesso, preencherCamposAutomaticos]);

  const toggleItem = useCallback((idx) => {
    setItensSelecionados(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  }, []);

  // === CONFIRMAR IMPORTAÇÃO ===
  const confirmarImportacao = useCallback(async () => {
    if (!nfData || itensSelecionados.length === 0) return;
    setImportando(true);
    const itensParaImportar = itensSelecionados.map(idx => nfData.itens[idx]);
    const valorTotal = itensParaImportar.reduce((sum, item) => sum + item.valorTotal, 0);

    const lancamento = {
      descricao: 'NF ' + nfData.numero + ' - ' + nfData.fornecedor,
      valor: valorTotal,
      dataEmissao: dataEmissao,
      data: dataEmissao,
      dataVencimento: dataVencimento,
      data_vencimento: dataVencimento,
      vencimento: dataVencimento,
      tipo: 'despesa',
      categoria: categoriaSelecionada,
      centroCusto: centroCustoSelecionado,
      centro_custo: centroCustoSelecionado,
      fornecedor: nfData.fornecedor,
      notaFiscal: nfData.numero,
      nf: nfData.numero,
      naturezaAquisicao: naturezaSelecionada,
      natureza_aquisicao: naturezaSelecionada,
      formaPagto: formaPagamentoSelecionada,
      forma_pagto: formaPagamentoSelecionada,
      status: statusSelecionado,
      observacao: `[NAT:${naturezaSelecionada}] Chave: ${(nfData.chaveAcesso || '').substring(0, 25)}... | ${itensParaImportar.length} itens`,
    };

    if (obraId && obraId !== 'geral' && obraId !== 'fabrica') {
      lancamento.obraId = obraId;
      lancamento.obra_id = obraId;
    }

    // Salvar NF no Supabase
    try {
      await notasFiscaisApi.create({
        id: 'NF-' + Date.now(),
        numero: nfData.numero,
        fornecedor: nfData.fornecedor,
        tipo: 'entrada',
        valor: valorTotal,
        data_emissao: dataEmissao,
        data_entrada: new Date().toISOString().split('T')[0],
        status: 'importada',
        itens: itensParaImportar,
        observacoes: `Natureza: ${naturezaSelecionada} | ${nfData.naturezaOp} | Venc: ${dataVencimento} | Pgto: ${formaPagamentoSelecionada}`,
        obra_id: lancamento.obra_id || null
      });
    } catch (err) {
      console.error('Erro ao salvar NF no Supabase:', err.message);
    }

    // Callback para o componente pai
    if (onImportar) {
      await onImportar(lancamento, itensParaImportar);
    }

    setStep('sucesso');
    setImportando(false);
  }, [nfData, itensSelecionados, naturezaSelecionada, categoriaSelecionada, centroCustoSelecionado, formaPagamentoSelecionada, dataVencimento, dataEmissao, statusSelecionado, obraId, onImportar]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) resetModal(); onOpenChange(o); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-2xl z-50 w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Receipt className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">Importar Nota Fiscal</Dialog.Title>
                <p className="text-xs text-gray-400">
                  {step === 'entrada' ? 'Upload XML ou consulta por chave de acesso' : step === 'preview' ? 'Confira e ajuste os dados antes de importar' : 'Importacao concluida'}
                </p>
              </div>
            </div>
            <Dialog.Close className="text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></Dialog.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">

            {/* === STEP: ENTRADA (XML ou Chave) === */}
            {step === 'entrada' && (
              <div className="space-y-4">
                {/* Tabs */}
                <div className="flex gap-2 bg-gray-800 rounded-lg p-1">
                  <button onClick={() => { setMetodo('xml'); setErro(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${metodo === 'xml' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                    <Upload className="w-4 h-4" /> Upload XML
                  </button>
                  <button onClick={() => { setMetodo('chave'); setErro(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${metodo === 'chave' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                    <Key className="w-4 h-4" /> Chave de Acesso
                  </button>
                </div>

                {/* XML Upload */}
                {metodo === 'xml' && (
                  <div className="space-y-3">
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-600 hover:border-amber-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors group"
                    >
                      <FileUp className="w-12 h-12 text-gray-500 group-hover:text-amber-400 mx-auto mb-3 transition-colors" />
                      <p className="text-sm text-gray-300 font-medium">Arraste o XML da NFe aqui</p>
                      <p className="text-xs text-gray-500 mt-1">ou clique para selecionar o arquivo</p>
                      <p className="text-xs text-gray-600 mt-3">Aceita arquivos .xml de NFe (SEFAZ)</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xml"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e.target.files?.[0])}
                      />
                    </div>
                    {loading && (
                      <div className="flex items-center justify-center gap-2 py-3">
                        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                        <span className="text-sm text-gray-300">Processando XML...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Consulta por Chave */}
                {metodo === 'chave' && (
                  <div className="space-y-3">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Key className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                          <p className="text-sm text-blue-300 font-medium">Consulta por Chave de Acesso</p>
                          <p className="text-xs text-blue-400/70 mt-1">
                            Informe os 44 digitos da chave de acesso da NFe. Os dados serao consultados automaticamente via API publica.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1.5">Chave de Acesso (44 digitos) *</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          value={chaveAcesso}
                          onChange={e => setChaveAcesso(e.target.value.replace(/\D/g, '').substring(0, 44))}
                          placeholder="00000000000000000000000000000000000000000000"
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors font-mono text-sm"
                          onKeyDown={e => { if (e.key === 'Enter') consultarPorChave(); }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{chaveAcesso.replace(/\s/g, '').length}/44 digitos</p>
                    </div>
                    {loading && (
                      <div className="flex items-center justify-center gap-2 py-3">
                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                        <span className="text-sm text-gray-300">Consultando NFe...</span>
                      </div>
                    )}
                  </div>
                )}

                {erro && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-400">{erro}</p>
                  </div>
                )}
              </div>
            )}

            {/* === STEP: PREVIEW === */}
            {step === 'preview' && nfData && (
              <div className="space-y-4">
                {/* Dados da NF */}
                <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">NF-e Numero</p>
                      <p className="text-lg font-bold text-white">{nfData.numero || '(sem numero)'}{nfData.serie ? ` / Serie ${nfData.serie}` : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Valor Total</p>
                      <p className="text-lg font-bold text-emerald-400">{formatCurrency(nfData.valor)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-700">
                    <div>
                      <p className="text-xs text-gray-500">Fornecedor</p>
                      <p className="text-sm text-white font-medium">{nfData.fornecedor}</p>
                      <p className="text-xs text-gray-400">{nfData.cnpj}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Nat. Operacao</p>
                      <p className="text-sm text-white">{nfData.naturezaOp || '-'}</p>
                    </div>
                  </div>
                  {nfData.chaveAcesso && (
                    <div className="pt-2 border-t border-gray-700">
                      <p className="text-xs text-gray-500">Chave de Acesso</p>
                      <p className="text-xs text-gray-400 font-mono break-all">{nfData.chaveAcesso}</p>
                    </div>
                  )}
                </div>

                {/* === CAMPOS EDITÁVEIS === */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-medium text-amber-400 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Classificação (editável)
                  </p>

                  {/* Linha 1: Data Emissão + Data Vencimento */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        <Calendar className="w-3 h-3 inline mr-1" />Data Emissão
                      </label>
                      <input
                        type="date"
                        value={dataEmissao}
                        onChange={e => setDataEmissao(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        <Calendar className="w-3 h-3 inline mr-1" />Data Vencimento
                      </label>
                      <input
                        type="date"
                        value={dataVencimento}
                        onChange={e => setDataVencimento(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Linha 2: Forma de Pagamento + Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        <CreditCard className="w-3 h-3 inline mr-1" />Forma de Pagamento
                      </label>
                      <select
                        value={formaPagamentoSelecionada}
                        onChange={e => setFormaPagamentoSelecionada(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-amber-500 outline-none"
                      >
                        <option value="">Selecionar...</option>
                        {FORMAS_PAGAMENTO.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Status</label>
                      <select
                        value={statusSelecionado}
                        onChange={e => setStatusSelecionado(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-amber-500 outline-none"
                      >
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="atrasado">Atrasado</option>
                      </select>
                    </div>
                  </div>

                  {/* Linha 3: Categoria + Centro de Custo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        <Layers className="w-3 h-3 inline mr-1" />Categoria
                      </label>
                      <select
                        value={categoriaSelecionada}
                        onChange={e => setCategoriaSelecionada(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-amber-500 outline-none"
                      >
                        {CATEGORIAS_DISPONIVEIS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        <Building2 className="w-3 h-3 inline mr-1" />Centro de Custo
                      </label>
                      <select
                        value={centroCustoSelecionado}
                        onChange={e => setCentroCustoSelecionado(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-amber-500 outline-none"
                      >
                        {CENTROS_CUSTO.map(cc => (
                          <option key={cc.nome} value={cc.nome}>{cc.codigo} - {cc.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Linha 4: Natureza de Aquisição */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      <Tag className="w-3 h-3 inline mr-1" />Natureza de Aquisição
                    </label>
                    <select
                      value={naturezaSelecionada}
                      onChange={e => setNaturezaSelecionada(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-amber-500 outline-none"
                    >
                      {NATUREZAS.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>

                  <p className="text-xs text-gray-500 italic">
                    Categoria, centro de custo e forma de pagamento foram preenchidos automaticamente com base na NFe. Altere se necessário.
                  </p>
                </div>

                {/* Itens */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">
                    Itens da NF ({itensSelecionados.length}/{nfData.itens.length} selecionados)
                  </p>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {nfData.itens.map((item, idx) => (
                      <button key={idx} onClick={() => toggleItem(idx)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                          itensSelecionados.includes(idx)
                            ? 'bg-gray-800 border-amber-500/50'
                            : 'bg-gray-800/50 border-gray-700 opacity-50'
                        }`}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                          itensSelecionados.includes(idx) ? 'bg-amber-500 border-amber-500' : 'border-gray-600'
                        }`}>
                          {itensSelecionados.includes(idx) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{item.descricao}</p>
                          <p className="text-xs text-gray-400">
                            {item.qtd} {item.unidade} x {formatCurrency(item.valorUnit)}
                            {item.ncm && <span className="ml-2 text-gray-500">NCM: {item.ncm}</span>}
                            {item.cfop && <span className="ml-2 text-gray-500">CFOP: {item.cfop}</span>}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-white flex-shrink-0">{formatCurrency(item.valorTotal)}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-gray-400">Total a importar:</span>
                  <span className="text-lg font-bold text-amber-400">
                    {formatCurrency(itensSelecionados.reduce((sum, idx) => sum + (nfData.itens[idx]?.valorTotal || 0), 0))}
                  </span>
                </div>
              </div>
            )}

            {/* === STEP: SUCESSO === */}
            {step === 'sucesso' && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">NFe Importada com Sucesso!</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    NF {nfData?.numero} de {nfData?.fornecedor} foi importada como despesa.
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Valor:</span>
                    <span className="text-sm text-emerald-400 font-medium">
                      {formatCurrency(itensSelecionados.reduce((sum, idx) => sum + (nfData?.itens[idx]?.valorTotal || 0), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Categoria:</span>
                    <span className="text-sm text-white">{categoriaSelecionada}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Centro de Custo:</span>
                    <span className="text-sm text-white">{centroCustoSelecionado}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Vencimento:</span>
                    <span className="text-sm text-white">{formatDate(dataVencimento)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Forma Pagto:</span>
                    <span className="text-sm text-white">{formaPagamentoSelecionada}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Natureza:</span>
                    <span className="text-sm text-amber-400">{naturezaSelecionada}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-700 flex justify-end gap-3">
            {step === 'entrada' && (
              <>
                <button onClick={() => onOpenChange(false)}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm">
                  Cancelar
                </button>
                {metodo === 'chave' && (
                  <button onClick={consultarPorChave} disabled={loading || chaveAcesso.replace(/\s/g, '').length !== 44}
                    className="px-5 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {loading ? 'Consultando...' : 'Consultar NFe'}
                  </button>
                )}
              </>
            )}
            {step === 'preview' && (
              <>
                <button onClick={() => { setStep('entrada'); setNfData(null); setErro(''); }}
                  className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm">
                  Voltar
                </button>
                <button onClick={confirmarImportacao} disabled={importando || itensSelecionados.length === 0}
                  className="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {importando ? 'Importando...' : 'Importar como Despesa'}
                </button>
              </>
            )}
            {step === 'sucesso' && (
              <button onClick={() => { resetModal(); onOpenChange(false); }}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors text-sm">
                Fechar
              </button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
