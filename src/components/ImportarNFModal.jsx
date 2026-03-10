import React, { useState, useCallback, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Search, FileText, X, Loader2, CheckCircle2, AlertCircle,
  Receipt, Building2, Calendar, DollarSign, Hash,
  Download, Upload, Key, FileUp, Tag
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

  // Buscar o nó principal da NFe (com ou sem namespace)
  const getText = (parent, tagName) => {
    if (!parent) return '';
    // Tentar sem namespace primeiro
    let el = parent.getElementsByTagName(tagName)[0];
    if (!el) {
      // Tentar com namespace SEFAZ
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
    dataEmissao, valor: valorTotal, tipo: 'entrada',
    itens, chaveAcesso, naturezaOp: natOp,
    observacoes: ''
  };
}

// ============================================
// CLASSIFICAÇÃO DE NATUREZA POR CFOP/NCM
// ============================================
function classificarNaturezaPorCFOP(cfop) {
  const c = String(cfop || '');
  // Matéria-prima
  if (['1101', '2101', '1151', '2151', '1201', '2201'].includes(c)) return 'Compra de matéria-prima';
  // Revenda
  if (['1102', '2102', '1113', '2113', '1152', '2152'].includes(c)) return 'Compra para revenda';
  // Prestação de serviços
  if (['1126', '2126', '1128', '2128', '1352', '2352'].includes(c)) return 'Compra para utilização na prestação de serviços';
  // Material de embalagem
  if (['1120', '2120', '1121', '2121'].includes(c)) return 'Compra de material de embalagem';
  // Uso e consumo
  if (['1556', '2556', '1407', '2407', '1501', '2501', '1653', '2653'].includes(c)) return 'Compra para uso e consumo';
  // Fallback por grupo CFOP
  if (c.startsWith('1') || c.startsWith('2')) return 'Compra para uso e consumo';
  return '';
}

function categorizarItem(descricao, ncm) {
  const desc = (descricao || '').toLowerCase();
  const ncmPrefix = (ncm || '').substring(0, 4);
  if (desc.includes('tinta') || desc.includes('primer') || desc.includes('epoxi') || ncmPrefix === '3208') return 'material_pintura';
  if (desc.includes('solda') || desc.includes('arame') || desc.includes('eletrodo') || ncmPrefix === '8311' || ncmPrefix === '7217') return 'consumiveis';
  if (desc.includes('chapa') || desc.includes('perfil') || desc.includes('viga') || ncmPrefix === '7208' || ncmPrefix === '7216') return 'material_estrutura';
  if (desc.includes('transporte') || desc.includes('frete')) return 'transporte';
  return 'material_estrutura';
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

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function ImportarNFModal({ open, onOpenChange, onImportar, moduloDestino, obraId }) {
  const [step, setStep] = useState('entrada'); // entrada | preview | sucesso
  const [metodo, setMetodo] = useState('xml'); // xml | chave
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [nfData, setNfData] = useState(null);
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [naturezaSelecionada, setNaturezaSelecionada] = useState('');
  const [importando, setImportando] = useState(false);
  const [chaveAcesso, setChaveAcesso] = useState('');
  const fileInputRef = useRef(null);

  const resetModal = useCallback(() => {
    setStep('entrada'); setMetodo('xml');
    setLoading(false); setErro(''); setNfData(null);
    setItensSelecionados([]); setNaturezaSelecionada('');
    setImportando(false); setChaveAcesso('');
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
      setNfData(parsed);
      setItensSelecionados(parsed.itens.map((_, i) => i));
      // Auto-classificar natureza pelo CFOP do primeiro item
      const cfopPrimeiro = parsed.itens[0]?.cfop;
      const natSugerida = classificarNaturezaPorCFOP(cfopPrimeiro);
      setNaturezaSelecionada(natSugerida || 'Compra para uso e consumo');
      setStep('preview');
      toast.success(`XML parseado: ${parsed.itens.length} itens de ${parsed.fornecedor}`);
    } catch (err) {
      setErro(err.message || 'Erro ao processar XML');
    }
    setLoading(false);
  }, []);

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
      // Tentar BrasilAPI (gratuita, sem CAPTCHA)
      const resp = await fetch(`https://brasilapi.com.br/api/nfe/v1/${chave}`, {
        signal: AbortSignal.timeout(15000)
      });
      if (!resp.ok) {
        if (resp.status === 404) throw new Error('NFe nao encontrada. Verifique a chave de acesso.');
        if (resp.status === 500) throw new Error('Servico indisponivel. Tente importar via XML.');
        throw new Error(`Erro ${resp.status} na consulta.`);
      }
      const data = await resp.json();

      // Transformar resposta da BrasilAPI para formato interno
      const parsed = {
        numero: String(data.nfe_numero || data.numero || ''),
        serie: String(data.serie || '1'),
        fornecedor: data.emitente?.razao_social || data.emitente?.nome_fantasia || '',
        cnpj: data.emitente?.cnpj || '',
        dataEmissao: (data.data_emissao || '').substring(0, 10),
        valor: data.valor_total || data.total?.icms_total?.valor_total_nota || 0,
        tipo: 'entrada',
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

      setNfData(parsed);
      setItensSelecionados(parsed.itens.map((_, i) => i));
      const cfopPrimeiro = parsed.itens[0]?.cfop;
      setNaturezaSelecionada(classificarNaturezaPorCFOP(cfopPrimeiro) || 'Compra para uso e consumo');
      setStep('preview');
      toast.success(`NFe encontrada: ${parsed.fornecedor}`);
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        setErro('Timeout na consulta. O servico pode estar indisponivel. Tente importar via XML.');
      } else {
        setErro(err.message || 'Erro na consulta');
      }
    }
    setLoading(false);
  }, [chaveAcesso]);

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
      dataEmissao: nfData.dataEmissao,
      data: nfData.dataEmissao,
      tipo: 'despesa',
      categoria: categorizarItem(itensParaImportar[0]?.descricao, itensParaImportar[0]?.ncm),
      fornecedor: nfData.fornecedor,
      notaFiscal: nfData.numero,
      nf: nfData.numero,
      naturezaAquisicao: naturezaSelecionada,
      formaPagto: 'boleto',
      status: 'pago',
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
        data_emissao: nfData.dataEmissao,
        data_entrada: new Date().toISOString().split('T')[0],
        status: 'importada',
        itens: itensParaImportar,
        observacoes: `Natureza: ${naturezaSelecionada} | ${nfData.naturezaOp}`,
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
  }, [nfData, itensSelecionados, naturezaSelecionada, obraId, onImportar]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) resetModal(); onOpenChange(o); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-2xl z-50 w-[640px] max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Receipt className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">Importar Nota Fiscal</Dialog.Title>
                <p className="text-xs text-gray-400">
                  {step === 'entrada' ? 'Upload XML ou consulta por chave de acesso' : step === 'preview' ? 'Confira os dados e selecione os itens' : 'Importacao concluida'}
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
                      <p className="text-xs text-gray-500">Data Emissao</p>
                      <p className="text-sm text-white">{formatDate(nfData.dataEmissao)}</p>
                      {nfData.naturezaOp && <p className="text-xs text-gray-400">{nfData.naturezaOp}</p>}
                    </div>
                  </div>
                  {nfData.chaveAcesso && (
                    <div className="pt-2 border-t border-gray-700">
                      <p className="text-xs text-gray-500">Chave de Acesso</p>
                      <p className="text-xs text-gray-400 font-mono break-all">{nfData.chaveAcesso}</p>
                    </div>
                  )}
                </div>

                {/* Natureza de Aquisição */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <Tag className="w-4 h-4" /> Natureza de Aquisicao
                  </label>
                  <select
                    value={naturezaSelecionada}
                    onChange={e => setNaturezaSelecionada(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:border-amber-500 outline-none"
                  >
                    {NATUREZAS.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                {/* Itens */}
                <div>
                  <p className="text-sm text-gray-400 mb-2">
                    Itens da NF ({itensSelecionados.length}/{nfData.itens.length} selecionados)
                  </p>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
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
                    <span className="text-sm text-gray-400">Itens:</span>
                    <span className="text-sm text-white">{itensSelecionados.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-400">Fornecedor:</span>
                    <span className="text-sm text-white">{nfData?.fornecedor}</span>
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
