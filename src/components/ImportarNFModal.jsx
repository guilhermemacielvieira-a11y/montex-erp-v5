import React, { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Search, FileText, X, Loader2, CheckCircle2, AlertCircle,
  Receipt, Building2, Package, Calendar, DollarSign, Hash,
  ArrowRight, FileUp, Download
} from 'lucide-react';
import { notasFiscaisApi } from '../api/supabaseClient';

// Banco simulado de NFs (simula consulta SEFAZ)
const NF_DATABASE = {
  '12345': {
    numero: '12345', serie: '1', fornecedor: 'ACO FORTE LTDA',
    cnpj: '12.345.678/0001-90', dataEmissao: '2026-01-15', valor: 45800.00,
    tipo: 'entrada',
    itens: [
      { descricao: 'Chapa de Aco SAC 300 #3/8', qtd: 50, unidade: 'un', valorUnit: 680.00, valorTotal: 34000.00, ncm: '7208.51.00' },
      { descricao: 'Perfil W 200x26.6', qtd: 20, unidade: 'un', valorUnit: 590.00, valorTotal: 11800.00, ncm: '7216.33.00' }
    ],
    chaveAcesso: '35260112345678000190550010000123451234567890',
    naturezaOp: 'VENDA DE MERCADORIA', observacoes: 'Entrega na obra BELO VALE'
  },
  '67890': {
    numero: '67890', serie: '1', fornecedor: 'TINTAS INDUSTRIAL SA',
    cnpj: '98.765.432/0001-10', dataEmissao: '2026-02-10', valor: 12500.00,
    tipo: 'entrada',
    itens: [
      { descricao: 'Tinta Epoxi Cinza 18L', qtd: 15, unidade: 'un', valorUnit: 450.00, valorTotal: 6750.00, ncm: '3208.10.10' },
      { descricao: 'Primer Anticorrosivo 18L', qtd: 10, unidade: 'un', valorUnit: 380.00, valorTotal: 3800.00, ncm: '3208.90.10' },
      { descricao: 'Thinner 20L', qtd: 5, unidade: 'un', valorUnit: 390.00, valorTotal: 1950.00, ncm: '3814.00.00' }
    ],
    chaveAcesso: '35260298765432000110550010000678901234567890',
    naturezaOp: 'VENDA DE MERCADORIA', observacoes: 'Material para pintura estrutural'
  },
  '11111': {
    numero: '11111', serie: '1', fornecedor: 'SOLDA TECH COMERCIO',
    cnpj: '11.222.333/0001-44', dataEmissao: '2026-02-20', valor: 8900.00,
    tipo: 'entrada',
    itens: [
      { descricao: 'Arame MIG 1.2mm ER70S-6 15kg', qtd: 20, unidade: 'un', valorUnit: 320.00, valorTotal: 6400.00, ncm: '7217.10.90' },
      { descricao: 'Disco de Corte 7pol', qtd: 50, unidade: 'un', valorUnit: 18.00, valorTotal: 900.00, ncm: '6804.22.19' },
      { descricao: 'Eletrodo 7018 3.25mm 5kg', qtd: 8, unidade: 'un', valorUnit: 200.00, valorTotal: 1600.00, ncm: '8311.10.00' }
    ],
    chaveAcesso: '35260211222333000144550010000111111234567890',
    naturezaOp: 'VENDA DE MERCADORIA', observacoes: 'Consumiveis de solda'
  }
};

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
  return parts[2] + '/' + parts[1] + '/' + parts[0];
}

export default function ImportarNFModal({ open, onOpenChange, onImportar, moduloDestino, obraId }) {
  const [step, setStep] = useState('busca');
  const [numero, setNumero] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [nfData, setNfData] = useState(null);
  const [itensSelecionados, setItensSelecionados] = useState([]);
  const [destino, setDestino] = useState(moduloDestino || 'obra');
  const [importando, setImportando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const resetModal = useCallback(() => {
    setStep('busca'); setNumero(''); setDataEmissao('');
    setLoading(false); setErro(''); setNfData(null);
    setItensSelecionados([]); setDestino(moduloDestino || 'obra');
    setImportando(false); setSucesso(false);
  }, [moduloDestino]);

  const buscarNF = useCallback(async () => {
    if (!numero.trim()) { setErro('Informe o numero da NF'); return; }
    setLoading(true); setErro('');
    await new Promise(r => setTimeout(r, 1500));
    const found = NF_DATABASE[numero.trim()];
    if (found) {
      if (dataEmissao && found.dataEmissao !== dataEmissao) {
        setErro('NF encontrada mas a data de emissao nao confere.');
        setLoading(false); return;
      }
      setNfData(found);
      setItensSelecionados(found.itens.map((_, i) => i));
      setStep('preview');
    } else {
      setErro('NF nao encontrada. Verifique o numero e tente novamente.');
    }
    setLoading(false);
  }, [numero, dataEmissao]);

  const toggleItem = useCallback((idx) => {
    setItensSelecionados(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  }, []);

  const confirmarImportacao = useCallback(async () => {
    if (!nfData || itensSelecionados.length === 0) return;
    setImportando(true);
    const itensParaImportar = itensSelecionados.map(idx => nfData.itens[idx]);
    const valorTotal = itensParaImportar.reduce((sum, item) => sum + item.valorTotal, 0);
    const lancamento = {
      descricao: 'NF ' + nfData.numero + ' - ' + nfData.fornecedor,
      valor: valorTotal, dataEmissao: nfData.dataEmissao, data: nfData.dataEmissao,
      tipo: 'despesa', categoria: categorizarItem(itensParaImportar[0]?.descricao, itensParaImportar[0]?.ncm),
      fornecedor: nfData.fornecedor, notaFiscal: nfData.numero, nf: nfData.numero,
      formaPagto: 'boleto', status: 'pendente',
      observacao: 'Importado via NF - Chave: ' + (nfData.chaveAcesso || '').substring(0, 20) + '... | Itens: ' + itensParaImportar.map(i => i.descricao).join(', '),
    };
    if (destino === 'obra' && obraId) { lancamento.obraId = obraId; lancamento.obra_id = obraId; }
    else { lancamento.obraId = null; lancamento.obra_id = null; }
    try {
      await notasFiscaisApi.create({
        id: 'NF-' + Date.now(), numero: nfData.numero, fornecedor: nfData.fornecedor,
        tipo: nfData.tipo || 'entrada', valor: valorTotal,
        data_emissao: nfData.dataEmissao, data_entrada: new Date().toISOString().split('T')[0],
        status: 'importada', itens: JSON.stringify(itensParaImportar),
        observacoes: nfData.observacoes || '', obra_id: destino === 'obra' ? obraId : null
      });
    } catch (err) { console.error('Erro ao salvar NF:', err.message); }
    if (onImportar) { await onImportar(lancamento, itensParaImportar, destino); }
    setSucesso(true); setStep('sucesso'); setImportando(false);
  }, [nfData, itensSelecionados, destino, obraId, onImportar]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) resetModal(); onOpenChange(o); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-2xl z-50 w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Receipt className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-semibold text-white">Importar Nota Fiscal</Dialog.Title>
                <p className="text-xs text-gray-400">
                  {step === 'busca' ? 'Informe o numero e data da NF' : step === 'preview' ? 'Confira os dados extraidos' : 'Importacao concluida'}
                </p>
              </div>
            </div>
            <Dialog.Close className="text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5" /></Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {step === 'busca' && (
              <div className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-300 font-medium">Consulta de Nota Fiscal</p>
                      <p className="text-xs text-amber-400/70 mt-1">Informe o numero da NF e opcionalmente a data de emissao para validacao. Os dados serao extraidos automaticamente.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Numero da NF *</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="text" value={numero} onChange={e => setNumero(e.target.value)} placeholder="Ex: 12345"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                        onKeyDown={e => { if (e.key === 'Enter') buscarNF(); }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Data de Emissao (opcional)</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="date" value={dataEmissao} onChange={e => setDataEmissao(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1.5">Modulo de Destino</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setDestino('obra')}
                        className={'flex items-center gap-2 p-3 rounded-lg border transition-all ' + (destino === 'obra' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500')}>
                        <Building2 className="w-4 h-4" />
                        <div className="text-left"><p className="text-sm font-medium">Gestao de Obra</p><p className="text-xs opacity-70">Vinculado a obra ativa</p></div>
                      </button>
                      <button onClick={() => setDestino('financeiro')}
                        className={'flex items-center gap-2 p-3 rounded-lg border transition-all ' + (destino === 'financeiro' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500')}>
                        <DollarSign className="w-4 h-4" />
                        <div className="text-left"><p className="text-sm font-medium">Financeiro</p><p className="text-xs opacity-70">Receita / Despesa geral</p></div>
                      </button>
                    </div>
                  </div>
                </div>
                {erro && (<div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"><AlertCircle className="w-4 h-4 text-red-400" /><p className="text-sm text-red-400">{erro}</p></div>)}
                <p className="text-xs text-gray-500 text-center">NFs disponiveis para teste: 12345, 67890, 11111</p>
              </div>
            )}

            {step === 'preview' && nfData && (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div><p className="text-xs text-gray-500">NF-e Numero</p><p className="text-lg font-bold text-white">{nfData.numero}</p></div>
                    <div className="text-right"><p className="text-xs text-gray-500">Valor Total</p><p className="text-lg font-bold text-emerald-400">{formatCurrency(nfData.valor)}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-700">
                    <div><p className="text-xs text-gray-500">Fornecedor</p><p className="text-sm text-white font-medium">{nfData.fornecedor}</p><p className="text-xs text-gray-400">{nfData.cnpj}</p></div>
                    <div><p className="text-xs text-gray-500">Data Emissao</p><p className="text-sm text-white">{formatDate(nfData.dataEmissao)}</p><p className="text-xs text-gray-400">{nfData.naturezaOp}</p></div>
                  </div>
                  {nfData.chaveAcesso && (<div className="pt-2 border-t border-gray-700"><p className="text-xs text-gray-500">Chave de Acesso</p><p className="text-xs text-gray-400 font-mono break-all">{nfData.chaveAcesso}</p></div>)}
                </div>

                <div className={'flex items-center gap-2 p-3 rounded-lg border ' + (destino === 'obra' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-blue-500/10 border-blue-500/30')}>
                  {destino === 'obra' ? <Building2 className="w-4 h-4 text-emerald-400" /> : <DollarSign className="w-4 h-4 text-blue-400" />}
                  <span className={'text-sm font-medium ' + (destino === 'obra' ? 'text-emerald-400' : 'text-blue-400')}>
                    Destino: {destino === 'obra' ? 'Gestao Financeira da Obra' : 'Financeiro (Receita/Despesa)'}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">Itens da NF ({itensSelecionados.length}/{nfData.itens.length} selecionados)</p>
                  <div className="space-y-2">
                    {nfData.itens.map((item, idx) => (
                      <button key={idx} onClick={() => toggleItem(idx)}
                        className={'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ' + (itensSelecionados.includes(idx) ? 'bg-gray-800 border-amber-500/50' : 'bg-gray-800/50 border-gray-700 opacity-50')}>
                        <div className={'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ' + (itensSelecionados.includes(idx) ? 'bg-amber-500 border-amber-500' : 'border-gray-600')}>
                          {itensSelecionados.includes(idx) && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{item.descricao}</p>
                          <p className="text-xs text-gray-400">{item.qtd} {item.unidade} x {formatCurrency(item.valorUnit)}</p>
                        </div>
                        <p className="text-sm font-medium text-white flex-shrink-0">{formatCurrency(item.valorTotal)}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-gray-400">Total a importar:</span>
                  <span className="text-lg font-bold text-amber-400">
                    {formatCurrency(itensSelecionados.reduce((sum, idx) => sum + nfData.itens[idx].valorTotal, 0))}
                  </span>
                </div>
              </div>
            )}

            {step === 'sucesso' && (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">NF Importada com Sucesso!</h3>
                  <p className="text-sm text-gray-400 mt-1">NF {nfData?.numero} de {nfData?.fornecedor} foi importada para {destino === 'obra' ? 'Gestao da Obra' : 'Financeiro'}.</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 text-left space-y-2">
                  <div className="flex justify-between"><span className="text-sm text-gray-400">Valor:</span><span className="text-sm text-emerald-400 font-medium">{formatCurrency(itensSelecionados.reduce((sum, idx) => sum + nfData.itens[idx].valorTotal, 0))}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-400">Itens:</span><span className="text-sm text-white">{itensSelecionados.length}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-400">Fornecedor:</span><span className="text-sm text-white">{nfData?.fornecedor}</span></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-gray-700 flex justify-end gap-3">
            {step === 'busca' && (
              <>
                <button onClick={() => onOpenChange(false)} className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm">Cancelar</button>
                <button onClick={buscarNF} disabled={loading || !numero.trim()}
                  className="px-5 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {loading ? 'Consultando...' : 'Buscar NF'}
                </button>
              </>
            )}
            {step === 'preview' && (
              <>
                <button onClick={() => setStep('busca')} className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm">Voltar</button>
                <button onClick={confirmarImportacao} disabled={importando || itensSelecionados.length === 0}
                  className="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {importando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {importando ? 'Importando...' : 'Importar para ' + (destino === 'obra' ? 'Obra' : 'Financeiro')}
                </button>
              </>
            )}
            {step === 'sucesso' && (
              <button onClick={() => { resetModal(); onOpenChange(false); }}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors text-sm">Fechar</button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
