import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { exportToExcel, exportRomaneioPDF } from '@/utils/exportUtils';
import { useExpedicao, useObras } from '../contexts/ERPContext';
import { pecasApi } from '../api/supabaseClient';
import { transformPecaArray } from '../contexts/transforms';
import {
  Truck, Package, CheckCircle2, AlertCircle, Search, Plus,
  FileText, Download, ChevronDown, Building2, Weight,
  ArrowRight, Printer, ArrowUpAZ, X, SendHorizontal, FileDown,
  Trash2, Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';

// ========================================
// CONSTANTES
// ========================================

const STATUS_ENVIO = [
  { id: 'PREPARANDO', nome: 'Preparando', cor: '#f59e0b', icon: Package },
  { id: 'AGUARDANDO_TRANSPORTE', nome: 'Aguard. Transporte', cor: '#8b5cf6', icon: Package },
  { id: 'EM_TRANSITO', nome: 'Em Trânsito', cor: '#3b82f6', icon: Truck },
  { id: 'ENTREGUE', nome: 'Entregue', cor: '#10b981', icon: CheckCircle2 },
  { id: 'PROBLEMA', nome: 'Problema', cor: '#ef4444', icon: AlertCircle },
];

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function EnviosExpedicaoPage() {
  // ==== DADOS DO ERP CONTEXT ====
  const { expedicoes, addExpedicao, updateExpedicao, deleteExpedicao } = useExpedicao();
  const { obras } = useObras();

  // ==== FILTRO DE OBRA ====
  const [obraFiltro, setObraFiltro] = useState('todas');

  // Obra ativa para criação de envios (fallback se nenhuma selecionada)
  const obraAtiva = useMemo(() => {
    if (obraFiltro && obraFiltro !== 'todas') return obras?.find(o => o.id === obraFiltro) || null;
    return obras?.find(o => o.status === 'em_producao' || o.status === 'ativo') || obras?.[0] || null;
  }, [obras, obraFiltro]);

  // ==== ESTADO LOCAL ====
  const [pecasExpedidasRaw, setPecasExpedidasRaw] = useState([]);
  const [pecasPinturaRaw, setPecasPinturaRaw] = useState([]);
  const [loadingPecas, setLoadingPecas] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('fila');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [pecasSelecionadas, setPecasSelecionadas] = useState([]);
  const [quantidadesEnvio, setQuantidadesEnvio] = useState({});
  const [novoEnvio, setNovoEnvio] = useState({
    numero: '',
    data: new Date().toISOString().split('T')[0],
    transportadora: '',
    motorista: '',
    placa: '',
    observacoes: '',
  });
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [editandoEnvioId, setEditandoEnvioId] = useState(null);

  // ==== SALVAR EDIÇÃO DE ENVIO ====
  const salvarEdicaoEnvio = useCallback(async () => {
    if (!editandoEnvioId) return;
    try {
      const dadosAtualizados = {
        numero_romaneio: novoEnvio.numero || null,
        data_expedicao: novoEnvio.data || null,
        transportadora: novoEnvio.transportadora || null,
        motorista: novoEnvio.motorista || null,
        placa: novoEnvio.placa || null,
        observacoes: novoEnvio.observacoes || null,
      };
      await updateExpedicao(editandoEnvioId, dadosAtualizados);
      toast.success('Envio atualizado com sucesso!');
      setModalEditarAberto(false);
      setEditandoEnvioId(null);
      setNovoEnvio({ numero: '', data: new Date().toISOString().split('T')[0], transportadora: '', motorista: '', placa: '', observacoes: '' });
    } catch (err) {
      toast.error('Erro ao atualizar envio');
      console.error(err);
    }
  }, [editandoEnvioId, novoEnvio, updateExpedicao]);

  // ==== CARREGAR PEÇAS EXPEDIDAS DO SUPABASE ====
  const carregarPecasExpedidas = useCallback(async () => {
    setLoadingPecas(true);
    try {
      // Buscar todas as peças com etapa = 'expedido'
      const todasPecasRaw = await pecasApi.getAll('id', true);
      // Transformar snake_case -> camelCase e aplicar aliases (peso_total -> peso)
      const todasPecas = transformPecaArray(todasPecasRaw);
      const expedidas = todasPecas.filter(p => p.etapa === 'expedido');

      // Peças em pintura (processo que precede expedição no Kanban Corte)
      const emPintura = todasPecas.filter(p => p.etapa === 'pintura');
      setPecasPinturaRaw(emPintura);

      // Pegar IDs das peças já incluídas em expedições existentes
      const pecasJaEnviadas = new Set();
      (expedicoes || []).forEach(exp => {
        const ids = Array.isArray(exp.pecas_ids) ? exp.pecas_ids : [];
        ids.forEach(id => pecasJaEnviadas.add(String(id)));
      });

      // Filtrar peças que ainda não foram enviadas
      const pecasAguardando = expedidas.filter(p => !pecasJaEnviadas.has(String(p.id)));

      setPecasExpedidasRaw(pecasAguardando);
    } catch (err) {
      console.error('Erro ao carregar peças expedidas:', err);
      toast.error('Erro ao carregar peças prontas para embarque');
    } finally {
      setLoadingPecas(false);
    }
  }, [expedicoes]);

  useEffect(() => {
    carregarPecasExpedidas();
  }, [carregarPecasExpedidas]);

  // ==== FILTRAR PEÇAS POR OBRA SELECIONADA ====
  const pecasExpedidas = useMemo(() => {
    if (!obraFiltro || obraFiltro === 'todas') return pecasExpedidasRaw;
    return pecasExpedidasRaw.filter(p => (p.obraId || p.obra_id) === obraFiltro);
  }, [pecasExpedidasRaw, obraFiltro]);

  const pecasPintura = useMemo(() => {
    if (!obraFiltro || obraFiltro === 'todas') return pecasPinturaRaw;
    return pecasPinturaRaw.filter(p => (p.obraId || p.obra_id) === obraFiltro);
  }, [pecasPinturaRaw, obraFiltro]);

  // ==== EXPEDIÇÕES FILTRADAS POR OBRA ====
  const expedicoesFiltradas = useMemo(() => {
    if (!obraFiltro || obraFiltro === 'todas') return expedicoes || [];
    return (expedicoes || []).filter(e => (e.obra_id || e.obraId) === obraFiltro);
  }, [expedicoes, obraFiltro]);

  // ==== KPIs ====
  const kpis = useMemo(() => {
    const total = expedicoesFiltradas.length;
    const emTransito = expedicoesFiltradas.filter(e => (e.status || '').toUpperCase() === 'EM_TRANSITO').length;
    const entregues = expedicoesFiltradas.filter(e => (e.status || '').toUpperCase() === 'ENTREGUE').length;
    const pesoTotal = expedicoesFiltradas.reduce((sum, e) => sum + (parseFloat(e.peso_total || e.pesoTotal) || 0), 0);
    const prontas = pecasExpedidas.length;
    return { total, emTransito, entregues, pesoTotal, prontas };
  }, [expedicoesFiltradas, pecasExpedidas]);

  // ==== PEÇAS FILTRADAS NA FILA ====
  const pecasFiltradas = useMemo(() => {
    if (!busca) return pecasExpedidas;
    const b = busca.toLowerCase();
    return pecasExpedidas.filter(p =>
      (p.marca || '').toLowerCase().includes(b) ||
      (p.conjunto || '').toLowerCase().includes(b) ||
      (p.tipo || '').toLowerCase().includes(b) ||
      (p.descricao || '').toLowerCase().includes(b)
    );
  }, [pecasExpedidas, busca]);

  // ==== ENVIOS FILTRADOS ====
  const enviosFiltrados = useMemo(() => {
    let lista = expedicoesFiltradas;
    if (filtroStatus !== 'todos') lista = lista.filter(e => (e.status || '').toUpperCase() === filtroStatus);
    if (busca) {
      const b = busca.toLowerCase();
      lista = lista.filter(e =>
        (e.numero || e.numeroRomaneio || e.numero_romaneio || '').toLowerCase().includes(b) ||
        (e.transportadora || '').toLowerCase().includes(b) ||
        (e.motorista || '').toLowerCase().includes(b)
      );
    }
    return lista;
  }, [expedicoesFiltradas, filtroStatus, busca]);

  // ==== TOGGLE SELEÇÃO DE PEÇA ====
  const togglePeca = useCallback((peca) => {
    setPecasSelecionadas(prev => {
      const exists = prev.find(p => p.id === peca.id);
      if (exists) {
        setQuantidadesEnvio(q => { const n = { ...q }; delete n[peca.id]; return n; });
        return prev.filter(p => p.id !== peca.id);
      }
      const qty = parseInt(peca.quantidade) || 1;
      setQuantidadesEnvio(q => ({ ...q, [peca.id]: qty }));
      return [...prev, peca];
    });
  }, []);

  // ==== ATUALIZAR QUANTIDADE DE ENVIO POR PEÇA ====
  const atualizarQtdEnvio = useCallback((pecaId, novaQtd, maxQtd) => {
    const val = Math.max(1, Math.min(parseInt(novaQtd) || 1, maxQtd));
    setQuantidadesEnvio(q => ({ ...q, [pecaId]: val }));
  }, []);

  // ==== CRIAR ENVIO ====
  const criarEnvio = useCallback(async () => {
    if (pecasSelecionadas.length === 0) {
      toast.error('Selecione pelo menos uma peça');
      return;
    }
    if (!novoEnvio.data) {
      toast.error('Informe a data do envio');
      return;
    }
    try {
      // Calcular peso proporcional baseado na quantidade selecionada
      const pesoTotal = pecasSelecionadas.reduce((sum, p) => {
        const qtyOriginal = parseInt(p.quantidade) || 1;
        const qtyEnvio = quantidadesEnvio[p.id] || qtyOriginal;
        const pesoUnitario = qtyOriginal > 0 ? (parseFloat(p.peso) || 0) / qtyOriginal : 0;
        return sum + (pesoUnitario * qtyEnvio);
      }, 0);
      const qtdTotal = pecasSelecionadas.reduce((sum, p) => sum + (quantidadesEnvio[p.id] || parseInt(p.quantidade) || 1), 0);

      // Montar detalhes de quantidades por peça (para peças parciais)
      const pecasDetalhes = pecasSelecionadas.map(p => ({
        id: p.id,
        qtd_enviada: quantidadesEnvio[p.id] || parseInt(p.quantidade) || 1,
        qtd_total: parseInt(p.quantidade) || 1,
      }));

      const pecasIds = pecasSelecionadas.map(p => p.id);
      const expedicao = {
        numero: novoEnvio.numero || `ENV-${Date.now()}`,
        data_envio: novoEnvio.data,
        transportadora: novoEnvio.transportadora || null,
        motorista: novoEnvio.motorista || null,
        placa: novoEnvio.placa || null,
        observacoes: novoEnvio.observacoes || null,
        status: 'PREPARANDO',
        pecas_ids: pecasIds,
        pecas: pecasIds, // compatibilidade com ERPContext.addExpedicao
        pecas_detalhes: pecasDetalhes,
        peso_total: pesoTotal,
        quantidade_total: qtdTotal,
        obra_id: obraAtiva?.id || null,
        obra_nome: obraAtiva?.nome || null,
      };
      await addExpedicao(expedicao);
      const parciais = pecasDetalhes.filter(d => d.qtd_enviada < d.qtd_total);
      const msgParcial = parciais.length > 0 ? ` (${parciais.length} envio(s) parcial(is))` : '';
      toast.success(`Envio criado com ${pecasSelecionadas.length} peça(s) — ${pesoTotal.toFixed(2)}kg${msgParcial}`);
      setModalAberto(false);
      setPecasSelecionadas([]);
      setQuantidadesEnvio({});
      setNovoEnvio({ numero: '', data: new Date().toISOString().split('T')[0], transportadora: '', motorista: '', placa: '', observacoes: '' });
      await carregarPecasExpedidas();
    } catch (err) {
      console.error('Erro ao criar envio:', err);
      toast.error('Erro ao criar envio');
    }
  }, [pecasSelecionadas, novoEnvio, obraAtiva, addExpedicao, carregarPecasExpedidas, quantidadesEnvio]);

  // ==== GERAR ROMANEIO ====
  const gerarRomaneio = useCallback(async (envio) => {
    try {
      toast.loading('Gerando Romaneio...', { id: 'romaneio-loading' });
      const numero = envio.numero || envio.numeroRomaneio || envio.numero_romaneio || 'Envio';
      const dataEnvio = envio.data_envio || envio.dataExpedicao || envio.data_expedicao;
      const dataFormatada = dataEnvio ? new Date(dataEnvio + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
      const obraNome = envio.obra_nome || envio.obraNome || envio.destino || '-';

      // Buscar peças completas
      let pecasCompletas = [];
      const pecasRaw = envio.pecas_ids || envio.pecasIds || envio.pecas || [];
      const ids = pecasRaw.map(p => typeof p === 'object' ? (p.id || p) : p);
      const detalhes = envio.pecas_detalhes || envio.pecasDetalhes || (Array.isArray(envio.pecas) ? envio.pecas.filter(p => typeof p === 'object' && p.qtd_enviada) : []);
      if (ids.length > 0) {
        const todasPecasRaw = await pecasApi.getAll('id', true);
        const todasPecas = transformPecaArray(todasPecasRaw);
        const idsSet = new Set(ids.map(String));
        pecasCompletas = todasPecas.filter(p => idsSet.has(String(p.id)));
        pecasCompletas = pecasCompletas.map(p => {
          const det = detalhes.find(d => String(d.id) === String(p.id));
          return { ...p, qtdEnviada: det?.qtd_enviada || det?.qtdEnviada || parseInt(p.quantidade) || 1 };
        });
      }

      // Calcular peso total real
      const pesoTotal = pecasCompletas.reduce((sum, p) => {
        const qtyOrig = parseInt(p.quantidade) || 1;
        const qtyEnv = p.qtdEnviada || qtyOrig;
        const pesoUnit = qtyOrig > 0 ? (parseFloat(p.peso) || 0) / qtyOrig : 0;
        return sum + (pesoUnit * qtyEnv);
      }, 0);

      // Gerar linhas da tabela
      const linhasTabela = pecasCompletas.map((p, idx) => {
        const qtyOrig = parseInt(p.quantidade) || 1;
        const qtyEnv = p.qtdEnviada || qtyOrig;
        const pesoUnit = qtyOrig > 0 ? (parseFloat(p.peso) || 0) / qtyOrig : 0;
        const pesoTot = pesoUnit * qtyEnv;
        return `<tr>
          <td style="text-align:center">${idx + 1}</td>
          <td><strong>${p.marca || p.nome || p.codigo || '-'}</strong></td>
          <td>${(p.tipo || p.perfil || p.descricao || '-').toUpperCase()}</td>
          <td style="text-align:center">${qtyEnv}</td>
          <td style="text-align:right">${pesoUnit.toFixed(1)}</td>
          <td style="text-align:right"><strong>${pesoTot.toFixed(1)}</strong></td>
        </tr>`;
      }).join('');

      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
      <title>Romaneio - ${numero}</title>
      <style>
        body{font-family:Arial,sans-serif;margin:20px;color:#333}
        h1{color:#1a56db;border-bottom:2px solid #1a56db;padding-bottom:8px;font-size:22px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th{background:#1a56db;color:white;padding:8px;text-align:left;font-size:12px}
        td{padding:6px 8px;border-bottom:1px solid #ddd;font-size:12px}
        tr:nth-child(even){background:#f9f9f9}
        .info{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0;background:#f5f5f5;padding:16px;border-radius:8px}
        .info p{margin:4px 0;font-size:13px}
        .totais{margin-top:12px;font-size:14px;padding:12px;background:#e8f4fd;border-radius:8px;border-left:4px solid #1a56db}
        .footer{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px;font-size:12px;color:#666}
        .footer div{border-top:1px solid #999;padding-top:8px;text-align:center}
        @media print{button{display:none !important}}
      </style></head><body>
      <h1>🚛 Romaneio de Embarque</h1>
      <div class="info">
        <div>
          <p><strong>Número:</strong> ${numero}</p>
          <p><strong>Data:</strong> ${dataFormatada}</p>
          <p><strong>Transportadora:</strong> ${envio.transportadora || '-'}</p>
        </div>
        <div>
          <p><strong>Motorista:</strong> ${envio.motorista || '-'}</p>
          <p><strong>Placa:</strong> ${envio.placa || '-'}</p>
          <p><strong>Obra:</strong> ${obraNome}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:40px;text-align:center">#</th>
            <th>Marca/Peça</th>
            <th>Tipo/Perfil</th>
            <th style="width:60px;text-align:center">Qtd</th>
            <th style="width:90px;text-align:right">Peso Unit (kg)</th>
            <th style="width:100px;text-align:right">Peso Total (kg)</th>
          </tr>
        </thead>
        <tbody>${linhasTabela}</tbody>
      </table>
      <div class="totais">
        <strong>Total de Peças:</strong> ${pecasCompletas.length} conjunto(s) &nbsp;|&nbsp; <strong>Peso Total:</strong> ${pesoTotal.toFixed(2)} kg
      </div>
      ${envio.observacoes ? `<p style="margin-top:12px"><strong>Obs:</strong> ${envio.observacoes}</p>` : ''}
      <div class="footer">
        <div>Assinatura do Motorista</div>
        <div>Assinatura do Responsável</div>
      </div>
      <button onclick="window.print()" style="margin-top:24px;padding:10px 20px;background:#1a56db;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px">🖨️ Imprimir</button>
      </body></html>`;
      const blob = new Blob([html], { type: 'text/html' });
      window.open(URL.createObjectURL(blob));
      toast.dismiss('romaneio-loading');
    } catch (err) {
      toast.dismiss('romaneio-loading');
      console.error('Erro romaneio:', err);
      toast.error('Erro ao gerar romaneio: ' + err.message);
    }
  }, []);

  // ==== RENDER ====
  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-400" />
            Envios & Expedição
          </h1>
          <p className="text-gray-400 text-sm mt-1">Controle de remessas e entregas</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filtro de Obra */}
          <Select.Root value={obraFiltro} onValueChange={setObraFiltro}>
            <Select.Trigger className="flex items-center gap-2 bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm min-w-[200px]">
              <Building2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <Select.Value placeholder="Selecionar Obra" />
              <ChevronDown className="w-4 h-4 ml-auto" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                <Select.Viewport className="p-1">
                  <Select.Item value="todas" className="px-3 py-2 text-sm text-white hover:bg-gray-800 rounded cursor-pointer outline-none">
                    <Select.ItemText>Todas as Obras</Select.ItemText>
                  </Select.Item>
                  {(obras || []).map(o => (
                    <Select.Item key={o.id} value={o.id} className="px-3 py-2 text-sm text-white hover:bg-gray-800 rounded cursor-pointer outline-none">
                      <Select.ItemText>{o.nome || o.name || `Obra ${o.id?.slice(0, 6)}`}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <Button variant="outline" size="sm" onClick={() => exportToExcel(enviosFiltrados, 'envios')}>
            <Download className="w-4 h-4 mr-1" /> Exportar
          </Button>
          <Button size="sm" onClick={() => { setModalAberto(true); setPecasSelecionadas([]); setQuantidadesEnvio({}); }}
            className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" /> Novo Envio
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-gray-800">
        {[
          { label: 'Total Envios', value: kpis.total, icon: Package, color: 'text-blue-400' },
          { label: 'Em Trânsito', value: kpis.emTransito, icon: Truck, color: 'text-yellow-400' },
          { label: 'Entregues', value: kpis.entregues, icon: CheckCircle2, color: 'text-green-400' },
          { label: 'Peso Total', value: kpis.pesoTotal.toFixed(1) + 'kg', icon: Weight, color: 'text-purple-400' },
          { label: 'Prontas p/ Embarque', value: kpis.prontas, icon: SendHorizontal, color: 'text-emerald-400' },
        ].map((k, i) => (
          <div key={i} className="bg-gray-900 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </div>
            <k.icon className={`w-8 h-8 ${k.color} opacity-40`} />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs.Root value={abaAtiva} onValueChange={setAbaAtiva} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex items-center gap-4 px-6 pt-3 border-b border-gray-800">
          <Tabs.List className="flex gap-1">
            <Tabs.Trigger value="fila"
              className="px-4 py-2 text-sm rounded-t-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 hover:text-white transition-colors flex items-center gap-1">
              <SendHorizontal className="w-4 h-4" /> Fila de Embarque
              {kpis.prontas > 0 && (
                <span className="ml-1 bg-emerald-500 text-white text-xs rounded-full px-1.5 py-0.5">{kpis.prontas}</span>
              )}
            </Tabs.Trigger>
            <Tabs.Trigger value="envios"
              className="px-4 py-2 text-sm rounded-t-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 hover:text-white transition-colors flex items-center gap-1">
              <FileText className="w-4 h-4" /> Lista de Envios
            </Tabs.Trigger>
            <Tabs.Trigger value="status"
              className="px-4 py-2 text-sm rounded-t-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 hover:text-white transition-colors flex items-center gap-1">
              <ArrowUpAZ className="w-4 h-4" /> Visão por Status
            </Tabs.Trigger>
          </Tabs.List>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar..." className="pl-8 bg-gray-900 border-gray-700 text-white text-sm w-48" />
            </div>
          </div>
        </div>

        {/* Aba: Fila de Embarque */}
        <Tabs.Content value="fila" className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <SendHorizontal className="w-5 h-5 text-emerald-400" />
              Peças Prontas para Embarque
            </h2>
            <p className="text-gray-400 text-sm">Peças que concluíram pintura no Kanban e aguardam carregamento</p>
          </div>

          {loadingPecas ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            </div>
          ) : pecasFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-lg">Nenhuma peça aguardando embarque</p>
              <p className="text-sm text-gray-600 mt-1">Quando peças concluírem o processo no Kanban de Produção, aparecerão aqui automaticamente</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-400">{pecasFiltradas.length} peça(s) prontas para embarque</p>
                <Button size="sm" onClick={() => { setModalAberto(true); setPecasSelecionadas([]); setQuantidadesEnvio({}); }}
                  className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-1" /> Criar Carga com Seleção
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pecasFiltradas.map(peca => (
                  <motion.div key={peca.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-emerald-500 transition-colors cursor-pointer"
                    onClick={() => { setModalAberto(true); setPecasSelecionadas([peca]); setQuantidadesEnvio({ [peca.id]: parseInt(peca.quantidade) || 1 }); }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-white">{peca.marca || peca.conjunto || 'Peça'}</p>
                        <p className="text-sm text-gray-400">{peca.tipo || peca.descricao || ''}</p>
                      </div>
                      <span className="bg-emerald-900 text-emerald-300 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Pronto
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400 mt-2 pt-2 border-t border-gray-800">
                      <span className="flex items-center gap-1"><Weight className="w-3 h-3" /> {(parseFloat(peca.peso) || 0).toFixed(2)}kg</span>
                      <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {peca.quantidade || 1} un</span>
                      {peca.obra_id && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {peca.obra_nome || peca.obra_id}</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </Tabs.Content>

        {/* Aba: Lista de Envios */}
        <Tabs.Content value="envios" className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-3 mb-4">
            <Select.Root value={filtroStatus} onValueChange={setFiltroStatus}>
              <Select.Trigger className="flex items-center gap-2 bg-gray-900 border border-gray-700 text-white px-3 py-2 rounded-lg text-sm">
                <Select.Value placeholder="Status" />
                <ChevronDown className="w-4 h-4" />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                  <Select.Viewport className="p-1">
                    <Select.Item value="todos" className="px-3 py-2 text-sm text-white hover:bg-gray-800 rounded cursor-pointer outline-none">
                      <Select.ItemText>Todos</Select.ItemText>
                    </Select.Item>
                    {STATUS_ENVIO.map(s => (
                      <Select.Item key={s.id} value={s.id} className="px-3 py-2 text-sm text-white hover:bg-gray-800 rounded cursor-pointer outline-none">
                        <Select.ItemText>{s.nome}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            <p className="text-sm text-gray-400">{enviosFiltrados.length} envio(s) encontrado(s)</p>
          </div>

          {enviosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-lg">Nenhum envio encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {enviosFiltrados.map(envio => {
                const statusInfo = STATUS_ENVIO.find(s => s.id === (envio.status || '').toUpperCase()) || STATUS_ENVIO[0];
                return (
                  <motion.div key={envio.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-blue-500 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-semibold text-white">{envio.numero || envio.numeroRomaneio || envio.numero_romaneio || 'Sem número'}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: statusInfo.cor + '33', color: statusInfo.cor }}>
                            {statusInfo.nome}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-400">
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {envio.obra_nome || envio.obraNome || envio.destino || envio.obra_id || envio.obraId || '-'}</span>
                          <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {envio.transportadora || '-'}</span>
                          <span className="flex items-center gap-1"><Weight className="w-3 h-3" /> {(parseFloat(envio.peso_total || envio.pesoTotal) || 0).toFixed(2)}kg</span>
                          <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {(envio.pecas_ids || envio.pecasIds || (Array.isArray(envio.pecas) ? envio.pecas : [])).length} peça(s)</span>
                        </div>
                        {(envio.data_envio || envio.dataExpedicao || envio.data_expedicao) && (
                          <p className="text-xs text-gray-500 mt-1">
                            Data: {new Date((envio.data_envio || envio.dataExpedicao || envio.data_expedicao) + 'T12:00:00').toLocaleDateString('pt-BR')}
                            {envio.motorista && ` · Motorista: ${envio.motorista}`}
                            {envio.placa && ` · Placa: ${envio.placa}`}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => gerarRomaneio(envio)}
                          className="border-gray-700 text-gray-300 hover:text-white" title="Imprimir Romaneio">
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={async () => {
                          try {
                            toast.loading('Gerando Romaneio PDF...', { id: 'pdf-loading' });
                            // Buscar peças completas pelos IDs salvos na expedição
                            let pecasCompletas = [];
                            // pecas pode ser array de IDs (local) ou array de objetos {id, qtd_enviada, qtd_total} (Supabase JSONB)
                            const pecasRaw = envio.pecas_ids || envio.pecasIds || envio.pecas || [];
                            const ids = pecasRaw.map(p => typeof p === 'object' ? (p.id || p) : p);
                            // Detalhes de quantidade (do envio local ou do JSONB do Supabase)
                            const detalhes = envio.pecas_detalhes || envio.pecasDetalhes || (Array.isArray(envio.pecas) ? envio.pecas.filter(p => typeof p === 'object' && p.qtd_enviada) : []);
                            if (ids.length > 0) {
                              const todasPecasRaw = await pecasApi.getAll('id', true);
                              const todasPecas = transformPecaArray(todasPecasRaw);
                              const idsSet = new Set(ids.map(String));
                              pecasCompletas = todasPecas.filter(p => idsSet.has(String(p.id)));
                              // Enriquecer com quantidades dos detalhes do envio
                              pecasCompletas = pecasCompletas.map(p => {
                                const det = detalhes.find(d => String(d.id) === String(p.id));
                                return { ...p, qtdEnviada: det?.qtd_enviada || det?.qtdEnviada || parseInt(p.quantidade) || 1 };
                              });
                            }
                            // Buscar obra pela obra_id do envio, OU pela obraId da primeira peça
                            let obraRelacionada = obras.find(o => o.id === (envio.obra_id || envio.obraId)) || {};
                            if ((!obraRelacionada.id) && pecasCompletas.length > 0) {
                              const pecaObraId = pecasCompletas[0].obraId || pecasCompletas[0].obra_id;
                              if (pecaObraId) obraRelacionada = obras.find(o => o.id === pecaObraId) || {};
                            }
                            const success = exportRomaneioPDF(envio, obraRelacionada, pecasCompletas);
                            toast.dismiss('pdf-loading');
                            if (success) toast.success('Romaneio PDF gerado com sucesso!');
                            else toast.error('Erro ao gerar Romaneio PDF');
                          } catch (err) {
                            toast.dismiss('pdf-loading');
                            console.error('Erro PDF:', err);
                            toast.error('Erro ao gerar PDF: ' + err.message);
                          }
                        }} className="border-teal-700 text-teal-400 hover:text-teal-300 hover:bg-teal-900/30" title="Gerar Romaneio PDF">
                          <FileDown className="w-4 h-4" />
                        </Button>
                        <Select.Root value={envio.status} onValueChange={(val) => updateExpedicao(envio.id, { status: val })}>
                          <Select.Trigger className="flex items-center gap-1 bg-gray-800 border border-gray-700 text-white px-2 py-1 rounded text-xs">
                            <Select.Value />
                            <ChevronDown className="w-3 h-3" />
                          </Select.Trigger>
                          <Select.Portal>
                            <Select.Content className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                              <Select.Viewport className="p-1">
                                {STATUS_ENVIO.map(s => (
                                  <Select.Item key={s.id} value={s.id} className="px-3 py-2 text-xs text-white hover:bg-gray-800 rounded cursor-pointer outline-none">
                                    <Select.ItemText>{s.nome}</Select.ItemText>
                                  </Select.Item>
                                ))}
                              </Select.Viewport>
                            </Select.Content>
                          </Select.Portal>
                        </Select.Root>
                        <Button variant="outline" size="sm" onClick={() => {
                          setNovoEnvio({
                            numero: envio.numero || envio.numeroRomaneio || envio.numero_romaneio || '',
                            data: envio.data_envio || envio.dataExpedicao || envio.data_expedicao || new Date().toISOString().split('T')[0],
                            transportadora: envio.transportadora || '',
                            motorista: envio.motorista || '',
                            placa: envio.placa || '',
                            observacoes: envio.observacoes || '',
                          });
                          setEditandoEnvioId(envio.id);
                          setModalEditarAberto(true);
                        }} className="border-blue-700 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30" title="Editar Envio">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          if (window.confirm('Tem certeza que deseja excluir este envio?')) {
                            deleteExpedicao(envio.id);
                            toast.success('Envio excluído com sucesso');
                          }
                        }} className="border-red-700 text-red-400 hover:text-red-300 hover:bg-red-900/30" title="Excluir Envio">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Tabs.Content>

        {/* Aba: Visão por Status */}
        <Tabs.Content value="status" className="flex-1 overflow-y-auto p-6">
          {/* Pipeline principal: 3 colunas */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Preparando - Peças em Pintura (Kanban Corte) */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white">Preparando</h3>
                <span className="ml-auto text-xs rounded-full px-2 py-0.5 font-bold bg-amber-500/20 text-amber-400">
                  {pecasPintura.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Peças em processo de pintura (Kanban Corte)</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pecasPintura.length === 0 ? (
                  <p className="text-gray-600 text-xs text-center py-4">Nenhuma peça em pintura</p>
                ) : pecasPintura.map(p => (
                  <div key={p.id} className="bg-gray-800 rounded p-2 text-xs border-l-2 border-amber-500">
                    <p className="font-medium text-white">{p.marca || p.conjunto || 'Peça'}</p>
                    <p className="text-gray-400">{p.tipo || p.descricao || ''}</p>
                    <div className="flex justify-between mt-1 text-gray-500">
                      <span>{(parseFloat(p.peso) || 0).toFixed(2)}kg</span>
                      <span>{p.quantidade || 1} un</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-gray-800 text-xs text-gray-500">
                Peso total: {pecasPintura.reduce((s, p) => s + (parseFloat(p.peso) || 0), 0).toFixed(2)}kg
              </div>
            </div>

            {/* Aguard. Transporte - Peças com status Expedida */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-purple-400" />
                <h3 className="font-semibold text-white">Aguard. Transporte</h3>
                <span className="ml-auto text-xs rounded-full px-2 py-0.5 font-bold bg-purple-500/20 text-purple-400">
                  {pecasExpedidas.length}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Peças com status expedida aguardando transporte</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pecasExpedidas.length === 0 ? (
                  <p className="text-gray-600 text-xs text-center py-4">Nenhuma peça aguardando transporte</p>
                ) : pecasExpedidas.map(p => (
                  <div key={p.id} className="bg-gray-800 rounded p-2 text-xs border-l-2 border-purple-500">
                    <p className="font-medium text-white">{p.marca || p.conjunto || 'Peça'}</p>
                    <p className="text-gray-400">{p.tipo || p.descricao || ''}</p>
                    <div className="flex justify-between mt-1 text-gray-500">
                      <span>{(parseFloat(p.peso) || 0).toFixed(2)}kg</span>
                      <span>{p.quantidade || 1} un</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-gray-800 flex justify-between items-center">
                <span className="text-xs text-gray-500">Peso total: {pecasExpedidas.reduce((s, p) => s + (parseFloat(p.peso) || 0), 0).toFixed(2)}kg</span>
                {pecasExpedidas.length > 0 && (
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs h-7"
                    onClick={() => {
                      setModalAberto(true);
                      setPecasSelecionadas([...pecasExpedidas]);
                      const qtds = {};
                      pecasExpedidas.forEach(p => { qtds[p.id] = parseInt(p.quantidade) || 1; });
                      setQuantidadesEnvio(qtds);
                    }}>
                    <Plus className="w-3 h-3 mr-1" /> Criar Envio
                  </Button>
                )}
              </div>
            </div>

            {/* Em Trânsito - Envios vinculados ao romaneio */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">Em Trânsito</h3>
                <span className="ml-auto text-xs rounded-full px-2 py-0.5 font-bold bg-blue-500/20 text-blue-400">
                  {expedicoesFiltradas.filter(e => e.status === 'EM_TRANSITO').length}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Envios criados a partir do romaneio expedido</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {expedicoesFiltradas.filter(e => e.status === 'EM_TRANSITO').length === 0 ? (
                  <p className="text-gray-600 text-xs text-center py-4">Nenhum envio em trânsito</p>
                ) : expedicoesFiltradas.filter(e => e.status === 'EM_TRANSITO').map(e => (
                  <div key={e.id} className="bg-gray-800 rounded p-2 text-xs border-l-2 border-blue-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-white">{e.numero || 'Sem número'}</p>
                        <p className="text-gray-400">{e.obra_nome || '-'}</p>
                        <p className="text-gray-500">{(parseFloat(e.peso_total) || 0).toFixed(2)}kg · {(e.pecas_ids || []).length} peça(s)</p>
                        {e.transportadora && <p className="text-gray-500 mt-0.5">{e.transportadora}</p>}
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                        onClick={() => gerarRomaneio(e)}>
                        <Printer className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-gray-800 text-xs">
                {pecasExpedidas.length > 0 && (
                  <button onClick={() => {
                      setModalAberto(true);
                      setPecasSelecionadas([...pecasExpedidas]);
                      const qtds = {};
                      pecasExpedidas.forEach(p => { qtds[p.id] = parseInt(p.quantidade) || 1; });
                      setQuantidadesEnvio(qtds);
                    }}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Novo envio a partir do romaneio
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Status secundários: Entregue e Problema */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {STATUS_ENVIO.filter(s => s.id === 'ENTREGUE' || s.id === 'PROBLEMA').map(status => {
              const enviosDoStatus = expedicoesFiltradas.filter(e => e.status === status.id);
              return (
                <div key={status.id} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  <div className="flex items-center gap-2 mb-3">
                    <status.icon className="w-4 h-4" style={{ color: status.cor }} />
                    <p className="font-medium text-sm text-white">{status.nome}</p>
                    <span className="ml-auto text-xs rounded-full px-2 py-0.5 font-bold"
                      style={{ background: status.cor + '22', color: status.cor }}>
                      {enviosDoStatus.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {enviosDoStatus.map(e => (
                      <div key={e.id} className="bg-gray-800 rounded p-2 text-xs">
                        <p className="font-medium text-white">{e.numero || 'Sem número'}</p>
                        <p className="text-gray-400">{e.obra_nome || '-'}</p>
                        <p className="text-gray-500">{(parseFloat(e.peso_total) || 0).toFixed(2)}kg</p>
                      </div>
                    ))}
                    {enviosDoStatus.length === 0 && (
                      <p className="text-gray-600 text-xs text-center py-4">Nenhum</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Flow diagram */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            {STATUS_ENVIO.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full border"
                  style={{ borderColor: s.cor + '66', color: s.cor, background: s.cor + '11' }}>
                  <s.icon className="w-3 h-3" />
                  {s.nome}
                </div>
                {i < STATUS_ENVIO.length - 1 && <ArrowRight className="w-4 h-4 text-gray-600" />}
              </React.Fragment>
            ))}
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Modal: Novo Envio */}
      <Dialog.Root open={modalAberto} onOpenChange={setModalAberto}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-xl p-6 z-50 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                Nova Carga de Expedição
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </Dialog.Close>
            </div>

            {/* Formulário */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Número do Envio</label>
                <Input value={novoEnvio.numero} onChange={e => setNovoEnvio(p => ({ ...p, numero: e.target.value }))}
                  placeholder="ENV-001" className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Data *</label>
                <Input type="date" value={novoEnvio.data} onChange={e => setNovoEnvio(p => ({ ...p, data: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Transportadora</label>
                <Input value={novoEnvio.transportadora} onChange={e => setNovoEnvio(p => ({ ...p, transportadora: e.target.value }))}
                  placeholder="Nome da transportadora" className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Motorista</label>
                <Input value={novoEnvio.motorista} onChange={e => setNovoEnvio(p => ({ ...p, motorista: e.target.value }))}
                  placeholder="Nome do motorista" className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Placa</label>
                <Input value={novoEnvio.placa} onChange={e => setNovoEnvio(p => ({ ...p, placa: e.target.value }))}
                  placeholder="ABC-1234" className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Observações</label>
                <Input value={novoEnvio.observacoes} onChange={e => setNovoEnvio(p => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Obs..." className="bg-gray-800 border-gray-600 text-white" />
              </div>
            </div>

            {/* Seleção de Peças */}
            <div className="border-t border-gray-700 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  Peças Disponíveis para Embarque
                  <span className="text-sm font-normal text-gray-400">({pecasExpedidas.length} prontas)</span>
                </h3>
                {pecasSelecionadas.length > 0 && (
                  <span className="text-sm text-emerald-400 font-medium">
                    {pecasSelecionadas.length} peça(s) selecionada(s) ·{' '}
                    {pecasSelecionadas.reduce((s, p) => s + (quantidadesEnvio[p.id] || parseInt(p.quantidade) || 1), 0)} un ·{' '}
                    {pecasSelecionadas.reduce((s, p) => {
                      const qtyOrig = parseInt(p.quantidade) || 1;
                      const qtyEnvio = quantidadesEnvio[p.id] || qtyOrig;
                      const pesoUnit = qtyOrig > 0 ? (parseFloat(p.peso) || 0) / qtyOrig : 0;
                      return s + (pesoUnit * qtyEnvio);
                    }, 0).toFixed(2)}kg
                  </span>
                )}
              </div>

              {pecasExpedidas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma peça disponível para embarque</p>
                  <p className="text-sm">Mova peças para "Expedido" no Kanban de Produção</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {/* Selecionar todas */}
                  <button
                    onClick={() => {
                      if (pecasSelecionadas.length === pecasExpedidas.length) {
                        setPecasSelecionadas([]);
                        setQuantidadesEnvio({});
                      } else {
                        setPecasSelecionadas([...pecasExpedidas]);
                        const qtds = {};
                        pecasExpedidas.forEach(p => { qtds[p.id] = parseInt(p.quantidade) || 1; });
                        setQuantidadesEnvio(qtds);
                      }
                    }}
                    className="w-full text-left text-sm text-blue-400 hover:text-blue-300 py-1 flex items-center gap-2">
                    <input type="checkbox" readOnly
                      checked={pecasSelecionadas.length === pecasExpedidas.length && pecasExpedidas.length > 0}
                      className="accent-blue-500" />
                    Selecionar todas ({pecasExpedidas.length})
                  </button>
                  {pecasExpedidas.map(peca => {
                    const selecionada = pecasSelecionadas.some(p => p.id === peca.id);
                    const qtyTotal = parseInt(peca.quantidade) || 1;
                    const qtyEnvio = quantidadesEnvio[peca.id] || qtyTotal;
                    const temMultiplas = qtyTotal > 1;
                    const pesoUnitario = qtyTotal > 0 ? (parseFloat(peca.peso) || 0) / qtyTotal : 0;
                    const pesoEnvio = pesoUnitario * qtyEnvio;
                    return (
                      <div key={peca.id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${selecionada ? 'bg-emerald-900/40 border border-emerald-600' : 'bg-gray-800 border border-gray-700 hover:border-gray-600'}`}>
                        <div className="cursor-pointer flex items-center gap-3 flex-1 min-w-0"
                          onClick={() => togglePeca(peca)}>
                          <input type="checkbox" readOnly checked={selecionada} className="accent-emerald-500 w-4 h-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white text-sm truncate">{peca.marca || peca.conjunto || 'Peça'}</p>
                            <p className="text-xs text-gray-400 truncate">{peca.tipo || peca.descricao || ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Editor de quantidade parcial */}
                          {selecionada && temMultiplas ? (
                            <div className="flex items-center gap-1.5 bg-gray-700/60 rounded-lg px-2 py-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); atualizarQtdEnvio(peca.id, qtyEnvio - 1, qtyTotal); }}
                                className="w-5 h-5 rounded bg-gray-600 hover:bg-gray-500 text-white text-xs flex items-center justify-center font-bold">
                                −
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={qtyTotal}
                                value={qtyEnvio}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => atualizarQtdEnvio(peca.id, e.target.value, qtyTotal)}
                                className="w-8 text-center bg-transparent text-white text-sm font-bold border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <span className="text-gray-400 text-xs">de {qtyTotal}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); atualizarQtdEnvio(peca.id, qtyEnvio + 1, qtyTotal); }}
                                className="w-5 h-5 rounded bg-gray-600 hover:bg-gray-500 text-white text-xs flex items-center justify-center font-bold">
                                +
                              </button>
                            </div>
                          ) : temMultiplas ? (
                            <span className="text-xs text-gray-500 bg-gray-700/40 px-2 py-1 rounded">{qtyTotal} un</span>
                          ) : null}
                          <div className="text-right">
                            <p className="text-sm text-white">{(selecionada && temMultiplas ? pesoEnvio : parseFloat(peca.peso) || 0).toFixed(2)}kg</p>
                            {!temMultiplas && <p className="text-xs text-gray-400">{qtyTotal} un</p>}
                            {selecionada && temMultiplas && qtyEnvio < qtyTotal && (
                              <p className="text-xs text-amber-400">parcial</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
              <Dialog.Close asChild>
                <Button variant="outline" className="border-gray-600 text-gray-300">Cancelar</Button>
              </Dialog.Close>
              <Button onClick={criarEnvio}
                disabled={pecasSelecionadas.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                <Truck className="w-4 h-4 mr-2" />
                Criar Envio ({pecasSelecionadas.reduce((s, p) => s + (quantidadesEnvio[p.id] || parseInt(p.quantidade) || 1), 0)} un de {pecasSelecionadas.length} peça(s))
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* MODAL EDITAR ENVIO */}
      <Dialog.Root open={modalEditarAberto} onOpenChange={setModalEditarAberto}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 w-full max-w-md p-6">
            <Dialog.Title className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-400" /> Editar Envio
            </Dialog.Title>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Numero Romaneio</label>
                <Input value={novoEnvio.numero} onChange={e => setNovoEnvio(p => ({ ...p, numero: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Data</label>
                <Input type="date" value={novoEnvio.data} onChange={e => setNovoEnvio(p => ({ ...p, data: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Transportadora</label>
                <Input value={novoEnvio.transportadora} onChange={e => setNovoEnvio(p => ({ ...p, transportadora: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Motorista</label>
                  <Input value={novoEnvio.motorista} onChange={e => setNovoEnvio(p => ({ ...p, motorista: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Placa</label>
                  <Input value={novoEnvio.placa} onChange={e => setNovoEnvio(p => ({ ...p, placa: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Observacoes</label>
                <Input value={novoEnvio.observacoes} onChange={e => setNovoEnvio(p => ({ ...p, observacoes: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button onClick={() => setModalEditarAberto(false)} variant="outline" className="flex-1 border-gray-700 text-gray-300">
                Cancelar
              </Button>
              <Button onClick={salvarEdicaoEnvio} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                Salvar Alteracoes
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
