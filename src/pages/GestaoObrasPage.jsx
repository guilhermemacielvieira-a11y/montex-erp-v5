/**
 * MONTEX ERP Premium - Gestão de Obras
 * Página completa de gestão de obras com:
 * - Lista de todas obras com status e métricas
 * - Importar nova obra (formulário + JSON)
 * - Exportar dados de obra (JSON/CSV)
 * - Filtros por status/período
 * - Ativação/seleção de obra
 * - Análise comparativa
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Building2, Plus, Upload, Download, FileJson, FileSpreadsheet,
  Search, Filter, Eye, Edit3, Trash2, CheckCircle2, Clock,
  Factory, Truck, Hammer, AlertCircle, Check, X, Copy,
  BarChart3, TrendingUp, Package, DollarSign, ChevronRight,
  ArrowUpDown, RefreshCw, Globe, Calendar, MapPin, Users,
  FileText, Settings, Archive, Play, Pause, XCircle
} from 'lucide-react';
import { useObras, useERP } from '@/contexts/ERPContext';
import { obrasApi, pecasApi, lancamentosApi, medicoesApi } from '@/api/supabaseClient';
import { STATUS_OBRA } from '@/data/database';

// ===== CONSTANTES =====
const STATUS_CONFIG = {
  [STATUS_OBRA.ORCAMENTO]: { label: 'Orçamento', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30', icon: Clock },
  [STATUS_OBRA.APROVADA]: { label: 'Aprovada', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30', icon: Check },
  [STATUS_OBRA.EM_PROJETO]: { label: 'Em Projeto', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', icon: Building2 },
  [STATUS_OBRA.AGUARDANDO_MATERIAL]: { label: 'Aguard. Material', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', icon: AlertCircle },
  [STATUS_OBRA.EM_PRODUCAO]: { label: 'Em Produção', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', icon: Factory },
  [STATUS_OBRA.EM_EXPEDICAO]: { label: 'Em Expedição', color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30', icon: Truck },
  [STATUS_OBRA.EM_MONTAGEM]: { label: 'Em Montagem', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30', icon: Hammer },
  [STATUS_OBRA.CONCLUIDA]: { label: 'Concluída', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', icon: CheckCircle2 },
  [STATUS_OBRA.CANCELADA]: { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', icon: XCircle },
  'ativo': { label: 'Em Produção', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', icon: Factory },
  'concluido': { label: 'Concluída', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', icon: CheckCircle2 },
  'pausado': { label: 'Pausada', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', icon: Pause },
  'cancelado': { label: 'Cancelada', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', icon: XCircle },
};

const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v || 0);
const formatWeight = (v) => `${((v || 0) / 1000).toFixed(1)}t`;
const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

// ===== COMPONENTE: MODAL IMPORTAR OBRA =====
function ModalImportarObra({ open, onClose, onImport }) {
  const [mode, setMode] = useState('form'); // form | json
  const [formData, setFormData] = useState({
    codigo: '', nome: '', status: 'ativo',
    peso_total: '', valor_contrato: '', prazo_meses: '',
    endereco: '', cidade: '', estado: '',
    responsavel: '', descricao: ''
  });
  const [jsonData, setJsonData] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        setJsonData(JSON.stringify(data, null, 2));
        toast.success(`Arquivo ${file.name} carregado`);
      } catch {
        toast.error('Arquivo JSON inválido');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      let obraData;
      if (mode === 'form') {
        if (!formData.codigo || !formData.nome) {
          toast.error('Código e nome são obrigatórios');
          setImporting(false);
          return;
        }
        obraData = {
          ...formData,
          peso_total: parseFloat(formData.peso_total) || 0,
          valor_contrato: parseFloat(formData.valor_contrato) || 0,
          prazo_meses: parseInt(formData.prazo_meses) || 0,
          progresso: { corte: 0, fabricacao: 0, solda: 0, pintura: 0, expedicao: 0, montagem: 0 }
        };
      } else {
        obraData = JSON.parse(jsonData);
        if (Array.isArray(obraData)) {
          // Import multiple obras
          for (const obra of obraData) {
            await obrasApi.create(obra);
          }
          toast.success(`${obraData.length} obras importadas!`);
          onImport();
          onClose();
          setImporting(false);
          return;
        }
      }
      await obrasApi.create(obraData);
      toast.success(`Obra ${obraData.codigo || obraData.nome} importada!`);
      onImport();
      onClose();
    } catch (e) {
      toast.error(`Erro ao importar: ${e.message}`);
    }
    setImporting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-orange-400" />
              Importar Nova Obra
            </h2>
            <p className="text-sm text-slate-400 mt-1">Cadastre manualmente ou importe via JSON</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-slate-700/50">
          <button
            onClick={() => setMode('form')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'form' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'text-slate-400 hover:bg-slate-700/50'}`}
          >
            <Edit3 className="w-4 h-4 inline mr-2" />Formulário
          </button>
          <button
            onClick={() => setMode('json')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'json' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-700/50'}`}
          >
            <FileJson className="w-4 h-4 inline mr-2" />Importar JSON
          </button>
        </div>

        <div className="p-6">
          {mode === 'form' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Código *</label>
                  <input
                    value={formData.codigo}
                    onChange={e => handleFormChange('codigo', e.target.value)}
                    placeholder="2026-02"
                    className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => handleFormChange('status', e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white outline-none focus:border-orange-500/50"
                  >
                    <option value="ativo">Em Produção</option>
                    <option value="planejamento">Planejamento</option>
                    <option value="pausado">Pausado</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider">Nome da Obra *</label>
                <input
                  value={formData.nome}
                  onChange={e => handleFormChange('nome', e.target.value)}
                  placeholder="NOVA OBRA - CIDADE"
                  className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500/50"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Peso Total (kg)</label>
                  <input
                    type="number"
                    value={formData.peso_total}
                    onChange={e => handleFormChange('peso_total', e.target.value)}
                    placeholder="107700"
                    className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Valor Contrato (R$)</label>
                  <input
                    type="number"
                    value={formData.valor_contrato}
                    onChange={e => handleFormChange('valor_contrato', e.target.value)}
                    placeholder="2500000"
                    className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Prazo (meses)</label>
                  <input
                    type="number"
                    value={formData.prazo_meses}
                    onChange={e => handleFormChange('prazo_meses', e.target.value)}
                    placeholder="6"
                    className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Endereço</label>
                  <input
                    value={formData.endereco}
                    onChange={e => handleFormChange('endereco', e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Cidade</label>
                  <input
                    value={formData.cidade}
                    onChange={e => handleFormChange('cidade', e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase tracking-wider">Estado</label>
                  <input
                    value={formData.estado}
                    onChange={e => handleFormChange('estado', e.target.value)}
                    placeholder="MG"
                    className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider">Responsável</label>
                <input
                  value={formData.responsavel}
                  onChange={e => handleFormChange('responsavel', e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider">Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={e => handleFormChange('descricao', e.target.value)}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 outline-none focus:border-orange-500/50 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                >
                  <Upload className="w-4 h-4 inline mr-2" />Carregar arquivo .json
                </button>
                <button
                  onClick={() => {
                    const template = JSON.stringify({
                      codigo: "2026-XX",
                      nome: "NOME DA OBRA - CIDADE",
                      status: "ativo",
                      peso_total: 100000,
                      valor_contrato: 2000000,
                      prazo_meses: 6,
                      endereco: "",
                      cidade: "",
                      estado: "MG",
                      progresso: { corte: 0, fabricacao: 0, solda: 0, pintura: 0, expedicao: 0, montagem: 0 }
                    }, null, 2);
                    setJsonData(template);
                  }}
                  className="px-4 py-2 bg-slate-700/50 text-slate-300 rounded-lg hover:bg-slate-600/50 transition-colors text-sm"
                >
                  <FileText className="w-4 h-4 inline mr-2" />Template
                </button>
              </div>
              <textarea
                value={jsonData}
                onChange={e => setJsonData(e.target.value)}
                rows={12}
                placeholder='{\n  "codigo": "2026-02",\n  "nome": "NOVA OBRA",\n  "status": "ativo",\n  ...\n}'
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-green-400 font-mono text-sm placeholder-slate-600 outline-none focus:border-blue-500/50 resize-none"
              />
              <p className="text-xs text-slate-500">Aceita objeto único ou array de obras. Use o template como referência.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50"
          >
            {importing ? <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" /> : <Plus className="w-4 h-4 inline mr-2" />}
            {importing ? 'Importando...' : 'Importar Obra'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ===== COMPONENTE: MODAL EXPORTAR =====
function ModalExportar({ open, onClose, obra, allObras }) {
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState('json'); // json | csv
  const [scope, setScope] = useState('obra'); // obra | todas | completo

  const handleExport = async () => {
    setExporting(true);
    try {
      let dataToExport;
      let filename;

      if (scope === 'todas') {
        dataToExport = allObras;
        filename = `montex_obras_${new Date().toISOString().slice(0, 10)}`;
      } else if (scope === 'completo' && obra) {
        // Export obra + associated data
        const [pecas, lancamentos, medicoes] = await Promise.all([
          pecasApi.getByField('obra_id', obra.id).catch(() => []),
          lancamentosApi.getByField('obra_id', obra.id).catch(() => []),
          medicoesApi.getByField('obra_id', obra.id).catch(() => [])
        ]);
        dataToExport = {
          obra,
          pecas_producao: pecas,
          lancamentos_despesas: lancamentos,
          medicoes
        };
        filename = `montex_${obra.codigo || 'obra'}_completo_${new Date().toISOString().slice(0, 10)}`;
      } else {
        dataToExport = obra;
        filename = `montex_${obra?.codigo || 'obra'}_${new Date().toISOString().slice(0, 10)}`;
      }

      if (exportType === 'json') {
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // CSV export
        const items = Array.isArray(dataToExport) ? dataToExport : [dataToExport];
        if (items.length === 0) { toast.error('Sem dados para exportar'); return; }
        const flatItems = items.map(item => {
          const flat = {};
          Object.entries(item).forEach(([k, v]) => {
            if (typeof v === 'object' && v !== null) {
              Object.entries(v).forEach(([k2, v2]) => { flat[`${k}_${k2}`] = v2; });
            } else {
              flat[k] = v;
            }
          });
          return flat;
        });
        const headers = [...new Set(flatItems.flatMap(i => Object.keys(i)))];
        const csv = [
          headers.join(';'),
          ...flatItems.map(item => headers.map(h => `"${item[h] ?? ''}"`).join(';'))
        ].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success('Exportação concluída!');
      onClose();
    } catch (e) {
      toast.error(`Erro ao exportar: ${e.message}`);
    }
    setExporting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            Exportar Dados
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Escopo</label>
            <div className="space-y-2">
              {obra && (
                <label className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">
                  <input type="radio" name="scope" value="obra" checked={scope === 'obra'} onChange={() => setScope('obra')} className="accent-orange-500" />
                  <div>
                    <div className="text-sm text-white font-medium">Obra atual ({obra.codigo})</div>
                    <div className="text-xs text-slate-400">Exporta dados da obra selecionada</div>
                  </div>
                </label>
              )}
              {obra && (
                <label className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">
                  <input type="radio" name="scope" value="completo" checked={scope === 'completo'} onChange={() => setScope('completo')} className="accent-orange-500" />
                  <div>
                    <div className="text-sm text-white font-medium">Obra completa + dados</div>
                    <div className="text-xs text-slate-400">Inclui peças, lançamentos, medições</div>
                  </div>
                </label>
              )}
              <label className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">
                <input type="radio" name="scope" value="todas" checked={scope === 'todas'} onChange={() => setScope('todas')} className="accent-orange-500" />
                <div>
                  <div className="text-sm text-white font-medium">Todas as obras</div>
                  <div className="text-xs text-slate-400">Lista completa de obras cadastradas</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Formato</label>
            <div className="flex gap-2">
              <button
                onClick={() => setExportType('json')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${exportType === 'json' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-900/50 text-slate-400 border border-slate-700/50'}`}
              >
                <FileJson className="w-5 h-5 mx-auto mb-1" />JSON
              </button>
              <button
                onClick={() => setExportType('csv')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${exportType === 'csv' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900/50 text-slate-400 border border-slate-700/50'}`}
              >
                <FileSpreadsheet className="w-5 h-5 mx-auto mb-1" />CSV
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50"
          >
            {exporting ? <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" /> : <Download className="w-4 h-4 inline mr-2" />}
            Exportar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ===== COMPONENTE: CARD DE OBRA =====
function ObraCard({ obra, isActive, onSelect, onExport, onView }) {
  const config = STATUS_CONFIG[obra.status] || STATUS_CONFIG[STATUS_OBRA.EM_PRODUCAO];
  const Icon = config.icon;
  const progresso = obra.progresso || {};
  const progressoTotal = Object.values(progresso).reduce((a, b) => a + (b || 0), 0) / 6;
  const etapas = ['corte', 'fabricacao', 'solda', 'pintura', 'expedicao', 'montagem'];
  const etapaLabels = { corte: 'Corte', fabricacao: 'Fab', solda: 'Solda', pintura: 'Pint', expedicao: 'Exp', montagem: 'Mont' };
  const etapaCores = { corte: '#3b82f6', fabricacao: '#10b981', solda: '#f59e0b', pintura: '#8b5cf6', expedicao: '#06b6d4', montagem: '#ec4899' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-slate-800/60 border rounded-xl p-5 hover:bg-slate-800/80 transition-all cursor-pointer group ${isActive ? 'border-orange-500/50 ring-1 ring-orange-500/20' : 'border-slate-700/50'}`}
      onClick={() => onSelect(obra.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${config.bg}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">{obra.codigo}</h3>
              {isActive && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-500/20 text-orange-400 rounded-full border border-orange-500/30">ATIVA</span>
              )}
            </div>
            <p className="text-sm text-slate-400">{obra.nome}</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
          {config.label}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-900/40 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-white">{formatWeight(obra.pesoTotal || obra.peso_total)}</div>
          <div className="text-[10px] text-slate-500">Peso</div>
        </div>
        <div className="bg-slate-900/40 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-emerald-400">{formatCurrency(obra.valorContrato || obra.valor_contrato)}</div>
          <div className="text-[10px] text-slate-500">Contrato</div>
        </div>
        <div className="bg-slate-900/40 rounded-lg p-2 text-center">
          <div className="text-sm font-bold text-amber-400">{progressoTotal.toFixed(0)}%</div>
          <div className="text-[10px] text-slate-500">Progresso</div>
        </div>
      </div>

      {/* Progress Bars per Stage */}
      <div className="space-y-1.5 mb-4">
        {etapas.map(etapa => (
          <div key={etapa} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 w-10">{etapaLabels[etapa]}</span>
            <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progresso[etapa] || 0}%`, backgroundColor: etapaCores[etapa] }}
              />
            </div>
            <span className="text-[10px] text-slate-500 w-8 text-right">{progresso[etapa] || 0}%</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(obra.id); }}
          className="flex-1 px-3 py-1.5 text-xs bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors"
        >
          <Play className="w-3 h-3 inline mr-1" />Ativar
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onExport(obra); }}
          className="px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
        >
          <Download className="w-3 h-3 inline mr-1" />Exportar
        </button>
      </div>
    </motion.div>
  );
}

// ===== PÁGINA PRINCIPAL =====
export default function GestaoObrasPage() {
  const { obras, obraAtual, obraAtualData, setObraAtual, addObra } = useObras();
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportObra, setExportObra] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todas');
  const [sortBy, setSortBy] = useState('codigo');

  const filteredObras = useMemo(() => {
    let result = [...obras];

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        (o.codigo || '').toLowerCase().includes(q) ||
        (o.nome || '').toLowerCase().includes(q) ||
        (o.cidade || '').toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (filterStatus !== 'todas') {
      result = result.filter(o => o.status === filterStatus);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'codigo') return (a.codigo || '').localeCompare(b.codigo || '');
      if (sortBy === 'nome') return (a.nome || '').localeCompare(b.nome || '');
      if (sortBy === 'peso') return (b.pesoTotal || b.peso_total || 0) - (a.pesoTotal || a.peso_total || 0);
      if (sortBy === 'valor') return (b.valorContrato || b.valor_contrato || 0) - (a.valorContrato || a.valor_contrato || 0);
      if (sortBy === 'progresso') {
        const pA = Object.values(a.progresso || {}).reduce((s, v) => s + v, 0);
        const pB = Object.values(b.progresso || {}).reduce((s, v) => s + v, 0);
        return pB - pA;
      }
      return 0;
    });

    return result;
  }, [obras, search, filterStatus, sortBy]);

  // Summary stats
  const stats = useMemo(() => {
    const ativas = obras.filter(o => o.status === 'ativo' || o.status === STATUS_OBRA.EM_PRODUCAO).length;
    const pesoTotal = obras.reduce((s, o) => s + (o.pesoTotal || o.peso_total || 0), 0);
    const valorTotal = obras.reduce((s, o) => s + (o.valorContrato || o.valor_contrato || 0), 0);
    const progressoMedio = obras.length > 0
      ? obras.reduce((s, o) => s + Object.values(o.progresso || {}).reduce((a, b) => a + b, 0) / 6, 0) / obras.length
      : 0;
    return { total: obras.length, ativas, pesoTotal, valorTotal, progressoMedio };
  }, [obras]);

  const handleSelectObra = useCallback((obraId) => {
    setObraAtual(obraId);
    const ob = obras.find(o => o.id === obraId);
    toast.success(`Obra ${ob?.codigo || ''} ativada`);
  }, [setObraAtual, obras]);

  const handleExportObra = useCallback((obra) => {
    setExportObra(obra);
    setShowExport(true);
  }, []);

  const handleImportComplete = useCallback(() => {
    // Force refresh via page reload or context refresh
    window.location.reload();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-xl">
              <Building2 className="w-6 h-6 text-orange-400" />
            </div>
            Gestão de Obras
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {stats.total} obras cadastradas • {stats.ativas} em produção
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowExport(true)}
            className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/30 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />Exportar
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" />Nova Obra
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Obras', value: stats.total, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { label: 'Peso Total', value: formatWeight(stats.pesoTotal), icon: Package, color: 'text-orange-400', bg: 'bg-orange-500/20' },
          { label: 'Valor Total', value: formatCurrency(stats.valorTotal), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { label: 'Progresso Médio', value: `${stats.progressoMedio.toFixed(0)}%`, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/20' },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <div className="text-xs text-slate-400">{card.label}</div>
                <div className="text-lg font-bold text-white">{card.value}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar obra..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 outline-none focus:border-orange-500/50"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white outline-none"
        >
          <option value="todas">Todos os Status</option>
          <option value="ativo">Em Produção</option>
          <option value="planejamento">Planejamento</option>
          <option value="concluido">Concluídas</option>
          <option value="pausado">Pausadas</option>
          <option value="cancelado">Canceladas</option>
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-4 py-2.5 bg-slate-800/60 border border-slate-700/50 rounded-xl text-white outline-none"
        >
          <option value="codigo">Ordenar: Código</option>
          <option value="nome">Ordenar: Nome</option>
          <option value="peso">Ordenar: Peso</option>
          <option value="valor">Ordenar: Valor</option>
          <option value="progresso">Ordenar: Progresso</option>
        </select>
      </div>

      {/* Obras Grid */}
      {filteredObras.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">Nenhuma obra encontrada</p>
          <p className="text-slate-500 text-sm mt-2">
            {search ? 'Tente outro termo de busca' : 'Clique em "Nova Obra" para começar'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredObras.map(obra => (
            <ObraCard
              key={obra.id}
              obra={obra}
              isActive={obra.id === obraAtual}
              onSelect={handleSelectObra}
              onExport={handleExportObra}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showImport && (
          <ModalImportarObra
            open={showImport}
            onClose={() => setShowImport(false)}
            onImport={handleImportComplete}
          />
        )}
        {showExport && (
          <ModalExportar
            open={showExport}
            onClose={() => { setShowExport(false); setExportObra(null); }}
            obra={exportObra || obraAtualData}
            allObras={obras}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
