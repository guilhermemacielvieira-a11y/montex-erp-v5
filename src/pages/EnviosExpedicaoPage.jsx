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
  const { obras, obraAtual, setObraAtual } = useObras();

  // ==== OBRA ATIVA (respeita seletor global da sidebar) ====
  const obraAtiva = useMemo(() => {
    if (obraAtual) {
      return obras?.find(o => o.id === obraAtual) || null;
    }
    return obras?.find(o => o.status === 'em_producao' || o.status === 'ativo') || obras?.[0] || null;
  }, [obras, obraAtual]);

  // ==== ESTADO LOCAL ====
  const [pecasExpedidas, setPecasExpedidas] = useState([]);
  const [pecasPintura, setPecasPintura] = useState([]);
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
  const [editModalAberto, setEditModalAberto] = useState(false);
  const [envioEditando, setEnvioEditando] = useState(null);
  const [editForm, setEditForm] = useState({
    numero: '', data_envio: '', transportadora: '', motorista: '', placa: '', observacoes: '', status: ''
  });

  // ==== CARREGAR PEÇAS EXPEDIDAS DO SUPABASE ====
  const carregarPecasExpedidas = useCallback(async () => {
    setLoadingPecas(true);
    try {
      // Buscar todas as peças com etapa = 'expedido'
      const todasPecasRaw = await pecasApi.getAll('id', true);
      // Transformar snake_case -> camelCase e aplicar aliases (peso_total -> peso)
      const todasPecas = transformPecaArray(todasPecasRaw);
      // Filtrar por obra ativa (se selecionada)
      const pecasDaObra = obraAtiva
        ? todasPecas.filter(p => (p.obraId || p.obra_id) === obraAtiva.id)
        : todasPecas;
      const expedidas = pecasDaObra.filter(p => p.etapa === 'expedido');

      // Peças em pintura (processo que precede expedição no Kanban Corte)
      const emPintura = pecasDaObra.filter(p => p.etapa === 'pintura');
      setPecasPintura(emPintura);

      // Pegar IDs das peças já incluídas em expedições existentes (carregadas ou entregues)
      const pecasJaEnviadas = new Set();
      (expedicoes || []).forEach(exp => {
        // pecas_ids: array de IDs (criação local)
        if (Array.isArray(exp.pecas_ids)) {
          exp.pecas_ids.forEach(id => pecasJaEnviadas.add(String(id)));
        }
        // pecas: array de objetos {id, qtdEnviada, qtdTotal} (vindo do Supabase)
        if (Array.isArray(exp.pecas)) {
          exp.pecas.forEach(p => {
            const id = typeof p === 'object' ? (p.id || p.pecaId) : p;
            if (id) pecasJaEnviadas.add(String(id));
          });
        }
      });

      // Filtrar peças que ainda não foram enviadas
      const pecasAguardando = expedidas.filter(p => !pecasJaEnviadas.has(String(p.id)));

      setPecasExpedidas(pecasAguardando);
    } catch (err) {
      console.error('Erro ao carregar peças expedidas:', err);
      toast.error('Erro ao carregar peças prontas para embarque');
    } finally {
      setLoadingPecas(false);
    }
  }, [expedicoes, obraAtiva]);

  useEffect(() => {
    carregarPecasExpedidas();
  }, [carregarPecasExpedidas]);

  // ==== EXPEDIÇÕES DA OBRA SELECIONADA ====
  const expedicoesObra = useMemo(() => {
    if (!obraAtiva) return expedicoes || [];
    return (expedicoes || []).filter(e => {
      const eid = e.obra_id || e.obraId;
      return eid === obraAtiva.id;
    });
  }, [expedicoes, obraAtiva]);

  // ==== KPIs ====
  const kpis = useMemo(() => {
    const total = expedicoesObra.length;
    const emTransito = expedicoesObra.filter(e => (e.status || '').toUpperCase() === 'EM_TRANSITO').length;
    const entregues = expedicoesObra.filter(e => (e.status || '').toUpperCase() === 'ENTREGUE').length;
    const pesoTotal = expedicoesObra.reduce((sum, e) => sum + (parseFloat(e.peso_total || e.pesoTotal) || 0), 0);
    const prontas = pecasExpedidas.length;
    return { total, emTransito, entregues, pesoTotal, prontas };
  }, [expedicoesObra, pecasExpedidas]);

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
    let lista = expedicoesObra;
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
  }, [expedicoesObra, filtroStatus, busca]);

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

      // Remover peças enviadas da fila de embarque imediatamente (otimista)
      const idsEnviados = new Set(pecasSelecionadas.map(p => String(p.id)));
      setPecasExpedidas(prev => prev.filter(p => !idsEnviados.has(String(p.id))));

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

  // ==== DELETAR ENVIO (TASK 5) ====
  const handleDeleteEnvio = useCallback(async (envio) => {
    const nome = envio.numero || envio.numeroRomaneio || envio.numero_romaneio || 'Envio';
    if (!window.confirm(`Tem certeza que deseja excluir "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return;
    try {
      await deleteExpedicao(envio.id);
      toast.success(`Envio "${nome}" excluído com sucesso`);
      await carregarPecasExpedidas();
    } catch (err) {
      console.error('Erro ao excluir envio:', err);
      toast.error('Erro ao excluir envio');
    }
  }, [deleteExpedicao, carregarPecasExpedidas]);

  // ==== ABRIR MODAL EDITAR ENVIO (TASK 6) ====
  const handleEditEnvio = useCallback((envio) => {
    setEnvioEditando(envio);
    setEditForm({
      numero: envio.numero || envio.numeroRomaneio || envio.numero_romaneio || '',
      data_envio: envio.data_envio || envio.dataExpedicao || envio.data_expedicao || '',
      transportadora: envio.transportadora || '',
      motorista: envio.motorista || '',
      placa: envio.placa || '',
      observacoes: envio.observacoes || '',
      status: envio.status || 'PREPARANDO',
    });
    setEditModalAberto(true);
  }, []);

  // ==== SALVAR EDIÇÃO DO ENVIO ====
  const salvarEdicaoEnvio = useCallback(async () => {
    if (!envioEditando) return;
    try {
      await updateExpedicao(envioEditando.id, editForm);
      toast.success('Envio atualizado com sucesso');
      setEditModalAberto(false);
      setEnvioEditando(null);
    } catch (err) {
      console.error('Erro ao atualizar envio:', err);
      toast.error('Erro ao atualizar envio');
    }
  }, [envioEditando, editForm, updateExpedicao]);

  // ==== FORMATAR PESO (TASK 7) ====
  const formatPeso = useCallback((pesoKg) => {
    if (pesoKg >= 1000) return (pesoKg / 1000).toFixed(2) + 't';
    return pesoKg.toFixed(2) + 'kg';
  }, []);

  // ==== GERAR ROMANEIO ONLINE (HTML) ====
  const gerarRomaneio = useCallback(async (envio) => {
    // Buscar peças completas
    let pecasCompletas = [];
    try {
      const pecasRaw = envio.pecas_ids || envio.pecasIds || envio.pecas || [];
      const ids = pecasRaw.map(p => typeof p === 'object' ? (p.id || p) : p);
      const detalhes = envio.pecas_detalhes || envio.pecasDetalhes || (Array.isArray(envio.pecas) ? envio.pecas.filter(p => typeof p === 'object' && (p.qtd_enviada !== undefined || p.qtdEnviada !== undefined)) : []);
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
    } catch (e) { console.error(e); }

    const obraRelacionada = obras.find(o => o.id === (envio.obra_id || envio.obraId)) || {};
    const romaneioNum = envio.numero || envio.numeroRomaneio || envio.numero_romaneio || 'Envio';
    const statusEnvio = (envio.status || 'PREPARANDO').toUpperCase().replace(/_/g, ' ');
    const obraNome = obraRelacionada?.nome || envio.obra_nome || '-';
    const clienteNome = obraRelacionada?.cliente || envio.cliente || '-';
    const obraCodigo = obraRelacionada?.codigo || envio.obra_codigo || obraRelacionada?.numero || '-';
    const dataSrc = envio.data_envio || envio.dataExpedicao || envio.data_expedicao;
    const dataCarreg = dataSrc ? new Date(dataSrc + (dataSrc.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');

    let pesoTotal = 0;
    let qtdTotal = 0;
    pecasCompletas.forEach(p => {
      const qty = p.qtdEnviada || parseInt(p.quantidade) || 1;
      const pesoRaw = parseFloat(p.peso) || 0;
      const qtyOrig = parseInt(p.quantidade) || 1;
      pesoTotal += (qtyOrig > 0 ? pesoRaw / qtyOrig : pesoRaw) * qty;
      qtdTotal += qty;
    });

    // Se não encontrou peças, usar dados do envio
    if (pecasCompletas.length === 0) {
      pesoTotal = parseFloat(envio.peso_total) || 0;
      qtdTotal = envio.quantidade_total || 0;
    }

    const pecasRows = pecasCompletas.map((p, i) => {
      const qty = p.qtdEnviada || parseInt(p.quantidade) || 1;
      const pesoRaw = parseFloat(p.peso) || 0;
      const qtyOrig = parseInt(p.quantidade) || 1;
      const pesoUnit = qtyOrig > 0 ? pesoRaw / qtyOrig : pesoRaw;
      const pesoTot = pesoUnit * qty;
      const marca = p.marca || p.nome || p.codigo || '-';
      const tipo = (p.tipo || p.perfil || p.descricao || '-').toUpperCase();
      return `<tr style="${i % 2 === 0 ? 'background:#f8fafc' : ''}">
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${i + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-weight:bold">${marca}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${tipo}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center">${qty}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right">${pesoUnit.toFixed(1)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold">${pesoTot.toFixed(1)}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Romaneio - ${romaneioNum}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;background:#fff}
      .header{background:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e2e8f0}
      .header-left{display:flex;align-items:center;gap:14px}
      .header-left h1{color:#1e293b;font-size:22px;margin:0;font-weight:bold}
      .header-left .tagline{color:#94a3b8;font-size:9px;letter-spacing:1.5px;margin-top:2px}
      .header-right{text-align:right}
      .header-right .title{color:#1e293b;font-size:18px;font-weight:bold;margin-bottom:4px}
      .header-right .num{color:#1e293b;font-size:16px;font-weight:bold}
      .header-right .label{color:#64748b;font-size:10px;margin-top:2px}
      .header-right .status{color:#10b981;font-weight:bold;font-size:11px;margin-top:2px}
      .section{margin:16px 24px;border:1px solid #cbd5e1;border-radius:6px;overflow:hidden}
      .section-title{background:#f1f5f9;padding:6px 12px;font-size:10px;font-weight:bold;color:#475569;border-bottom:1px solid #dce1e8}
      .section-body{padding:10px 12px;display:grid;grid-template-columns:1fr 1fr;gap:6px}
      .field{font-size:12px;line-height:1.6}
      .field b{color:#475569}
      .table-header{background:#1e293b;color:#fff;padding:8px 12px;font-size:10px;font-weight:bold;display:flex;justify-content:space-between;margin:16px 24px 0;border-radius:6px 6px 0 0}
      table{width:calc(100% - 48px);margin:0 24px;border-collapse:collapse;font-size:11px}
      th{background:#475569;color:#fff;padding:6px 10px;text-align:left;font-size:9px}
      .total-row{background:#e2e8f0;font-weight:bold;font-size:12px}
      .total-row td{padding:8px 10px}
      .signatures{margin:24px 24px;page-break-inside:avoid}
      .signatures h3{font-size:10px;color:#475569;margin-bottom:16px}
      .sig-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center}
      .sig-box .line{border-top:1px solid #94a3b8;margin-top:40px;padding-top:6px}
      .sig-box .label{font-size:10px;font-weight:bold;color:#475569}
      .sig-box .date{font-size:9px;color:#94a3b8;margin-top:4px}
      .footer{border-top:1px solid #cbd5e1;margin:24px;padding-top:8px;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between}
      @media print{button,.no-print{display:none !important}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>
    <div class="header">
      <div class="header-left">
        <svg width="60" height="38" viewBox="0 0 1900 1200" style="flex-shrink:0">
          <path fill="#368784" d="M572.163 0L583.837 0C590.269 2.40243 602.143 0.735296 609.264 1.80956C617.731 3.08681 626.181 4.90844 634.594 6.57045C680.355 15.6105 721.355 41.8386 750.502 78.0239C763.354 93.9787 774.583 111.151 783.94 129.414C827.253 214.835 868.585 301.243 910.79 387.213C912.883 391.477 914.938 395.947 917.163 400.118C929.564 380.248 943.58 363.127 954.394 342.333C978.907 295.197 1001.57 246.481 1025.84 199.307C1047.46 157.276 1069.93 108.268 1101.81 73.7301C1131.05 41.4317 1169.55 18.9565 1212.05 9.3798C1271.72-4.41151 1339.42 3.09465 1392 36.0435C1440.79 66.6144 1462.32 105.451 1487.42 154.543L1520.77 219.852L1630.71 436.974C1676.34 527.348 1721.51 617.95 1766.23 708.777L1803.65 784.77C1819.18 816.436 1832.8 841.003 1840.8 875.839C1854.5 934.32 1844.33 995.852 1812.54 1046.81C1775.07 1106.27 1711.7 1143.65 1643.31 1152.74C1639.2 1153.29 1631.1 1153.94 1627.41 1155L1602.16 1155C1599.55 1153.8 1583.34 1152.93 1578.62 1151.9C1569.55 1149.92 1561.28 1147.9 1552.32 1145.11C1513.94 1132.96 1479.56 1110.64 1452.86 1080.51C1419.74 1043.75 1385.66 973.319 1361.89 927.491L1270.85 751.243C1258.08 772.266 1244.19 798.909 1232.36 820.675C1206.55 868.128 1181.19 915.825 1156.29 963.761C1145.14 985.4 1134.41 1008.01 1123.55 1029.04C1089.84 1094.29 1031.74 1140.68 958.566 1152.22C951.652 1153.31 938.844 1152.9 932.837 1155L908.163 1155C904.758 1153.42 886.42 1152.86 880.952 1151.86C870.385 1149.92 860.671 1147.98 850.269 1144.89C811.453 1133.54 776.728 1111.25 750.249 1080.68C720.559 1046.68 711.236 1020.92 692.623 981.458C683.058 961.343 673.276 941.331 663.278 921.426C634.416 863.533 604.515 806.164 573.587 749.348C541.47 812.012 510.73 875.141 477.157 937.1C428.151 1027.54 379.593 1123.27 268.5 1144.66C209.032 1155.73 147.602 1142.71 97.7418 1108.46C54.1175 1078.54 22.4605 1034.18 8.3546 983.194C4.05929 967.559 2.9118 954.943 0 939.414L0 902.586C1.00264 898.987 1.43661 893.281 2.05424 889.382C12.3183 824.592 47.3501 764.777 76.2507 706.456L181.889 494.232L315.667 226.965C332.112 194.391 348.856 161.389 365.025 128.745C399.237 58.2948 461.82 11.3312 540.098 2.56458C547.51 1.73444 566.141 2.1707 572.163 0ZM1612.2 1035.42C1643.17 1036.13 1673.14 1024.41 1695.43 1002.89C1716.13 982.955 1727.91 955.519 1728.12 926.784C1728.21 910.744 1725.18 894.84 1719.18 879.961C1712.13 862.405 1696.87 834.086 1688.11 816.578L1626.01 692.924L1536.73 514.984C1523.26 488.167 1509.49 460.117 1495.74 433.577C1489.47 421.472 1464.02 377.988 1454.42 368.649L1335.26 606L1458.19 852.863L1489.48 915.659C1511.55 960.515 1533.01 1012.59 1584 1029.9C1593.12 1032.97 1602.6 1034.82 1612.2 1035.42ZM508.028 611C496.095 587.141 386.57 365.692 383.513 363.471L193.193 742.364L144.969 841.074C136.9 857.751 122.609 884.061 118.081 901.381C100.338 969.258 175.151 1040.23 241.741 1030.3C294.795 1023.87 310.75 992.916 333.836 950.414C346.339 927.394 358.647 904.267 370.758 881.037C417.071 791.309 462.829 701.295 508.028 611ZM921.124 1030.49C954.718 1027.78 985.865 1011.85 1007.74 986.212C1036.66 952.151 1038.38 913.93 1021.28 874.005C998.152 819.99 971.382 767.417 944.778 714.988C940.794 707.136 926.85 676.207 922.408 670.682L851.363 811.214C839.253 835.672 818.261 875.438 812.678 900.385C808.856 917.503 809.673 935.332 815.046 952.028C828.763 993.401 876.405 1032.11 921.124 1030.49ZM854.201 541.5L789.127 415.242C785.293 407.808 766.155 369.339 763.006 365.504L640.382 610.753L699.856 726.043C709.352 744.427 721.598 769.889 731.675 787.151C772.006 706.44 815.3 622.504 854.201 541.5ZM573.837 477.231L641.338 342.922C652.904 319.682 674.333 280.91 679.679 257.559C691.491 205.968 667.606 148.777 617.859 127.115C604.005 120.724 585.136 113.78 569.757 116.362C538.043 117.957 510.564 139.545 489.977 162.096C465.987 188.375 453.58 223.079 468.204 257.368C479.966 284.949 492.911 311.895 505.865 338.959L572.354 476.771L573.837 477.231ZM1078.4 360.694L990.208 537.106C1000.38 562.047 1011.3 586.675 1022.95 610.956C1029.95 625.536 1109.39 779.989 1114.09 782.308L1202.1 605.705L1118.99 440.776L1091.68 386.664C1088.7 380.766 1081.66 365.822 1078.4 360.694ZM1262.76 127.395C1232.95 128.511 1209.57 138.403 1189.18 160.134C1162.35 188.734 1152.33 230.527 1167.35 267.306C1176.2 288.97 1186.55 310.387 1196.74 331.48C1215.62 370.223 1234.95 408.743 1254.73 447.031C1257.86 453.111 1264.86 470.064 1267.56 473.207L1269.05 473.654L1270.76 470.654C1301.02 409.15 1333.2 348.886 1361.98 286.584C1375.87 256.528 1382.17 229.094 1370.77 196.663C1362.1 171.735 1346.04 150.242 1321.94 138.426C1305.87 130.481 1280.47 125.104 1262.76 127.395Z"/>
        </svg>
        <div>
          <h1>GRUPO MONTEX</h1>
          <div class="tagline">SOLUÇÕES EM AÇO</div>
        </div>
      </div>
      <div class="header-right">
        <div class="title">ROMANEIO DE EXPEDIÇÃO</div>
        <div class="num">${romaneioNum}</div>
        <div class="label">Emissão: ${new Date().toLocaleDateString('pt-BR')}</div>
        <div class="status">Status: ${statusEnvio}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">DADOS DA OBRA / DESTINO</div>
      <div class="section-body">
        <div>
          <div class="field"><b>Obra:</b> ${obraNome}</div>
          <div class="field"><b>Cliente:</b> ${clienteNome}</div>
          <div class="field"><b>Código:</b> ${obraCodigo}</div>
        </div>
        <div>
          <div class="field"><b>Data Carregamento:</b> ${dataCarreg}</div>
          <div class="field"><b>Qtd Total:</b> ${qtdTotal} un</div>
        </div>
      </div>
    </div>

    <div class="table-header">
      <span>LISTA DE PEÇAS / ITENS DO ENVIO</span>
      <span>${qtdTotal} un (${pecasCompletas.length} itens) | ${pesoTotal.toFixed(2)}kg</span>
    </div>
    <table>
      <thead><tr>
        <th>#</th><th>Marca / Peça</th><th>Tipo / Perfil</th><th style="text-align:center">Qtd</th><th style="text-align:right">Peso Unit. (kg)</th><th style="text-align:right">Peso Total (kg)</th>
      </tr></thead>
      <tbody>
        ${pecasRows}
        <tr class="total-row">
          <td></td><td>TOTAL</td><td></td><td style="text-align:center">${qtdTotal}</td><td></td><td style="text-align:right">${pesoTotal.toFixed(2)} kg</td>
        </tr>
      </tbody>
    </table>

    <div class="section" style="margin-top:16px">
      <div class="section-title">DADOS DO TRANSPORTE</div>
      <div class="section-body">
        <div>
          <div class="field"><b>Motorista:</b> ${envio.motorista || '-'}</div>
          <div class="field"><b>Transportadora:</b> ${envio.transportadora || '-'}</div>
        </div>
        <div>
          <div class="field"><b>Placa:</b> ${envio.placa || '-'}</div>
        </div>
      </div>
    </div>

    ${envio.observacoes ? `<div class="section" style="margin-top:8px;border-color:#fbbf24;background:#fffbeb"><div class="section-body" style="grid-template-columns:1fr"><div class="field"><b>Observações:</b> ${envio.observacoes}</div></div></div>` : ''}

    <div class="signatures">
      <h3>ASSINATURAS</h3>
      <div class="sig-grid">
        <div class="sig-box">
          <div class="line"><div class="label">Responsável Carregamento</div><div class="date">Data: ___/___/______</div></div>
        </div>
        <div class="sig-box">
          <div class="line"><div class="label">Motorista / Transportadora</div><div class="date">Data: ___/___/______</div></div>
        </div>
        <div class="sig-box">
          <div class="line"><div class="label">Recebimento no Destino</div><div class="date">Data: ___/___/______</div></div>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>GRUPO MONTEX - Soluções em Aço</span>
      <span>${romaneioNum} | Pág 1</span>
    </div>

    <div class="no-print" style="text-align:center;margin:20px">
      <button onclick="window.print()" style="padding:12px 32px;background:#368784;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:bold;cursor:pointer">🖨️ Imprimir / Salvar PDF</button>
    </div>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    window.open(URL.createObjectURL(blob));
  }, [obras]);

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
        {/* Seletor de Obra */}
        <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2 border border-gray-700">
          <Building2 className="w-4 h-4 text-blue-400" />
          <select
            value={obraAtiva?.id || ''}
            onChange={(e) => setObraAtual(e.target.value)}
            className="bg-transparent text-white text-sm font-medium border-none outline-none cursor-pointer"
          >
            {(obras || []).map(o => (
              <option key={o.id} value={o.id} className="bg-gray-900 text-white">
                {o.codigo || o.numero || o.id} - {o.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
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
          { label: 'Peso Total', value: formatPeso(kpis.pesoTotal), icon: Weight, color: 'text-purple-400' },
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
                          <span className="flex items-center gap-1"><Weight className="w-3 h-3" /> {formatPeso(parseFloat(envio.peso_total || envio.pesoTotal) || 0)}</span>
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
                        <Button variant="outline" size="sm" onClick={() => handleEditEnvio(envio)}
                          className="border-gray-700 text-gray-300 hover:text-white" title="Editar Envio">
                          <Edit3 className="w-4 h-4" />
                        </Button>
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
                            const detalhes = envio.pecas_detalhes || envio.pecasDetalhes || (Array.isArray(envio.pecas) ? envio.pecas.filter(p => typeof p === 'object' && (p.qtd_enviada !== undefined || p.qtdEnviada !== undefined)) : []);
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
                        <Button variant="outline" size="sm" onClick={() => handleDeleteEnvio(envio)}
                          className="border-red-800 text-red-400 hover:text-red-300 hover:bg-red-900/30" title="Excluir Envio">
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
                Peso total: {formatPeso(pecasPintura.reduce((s, p) => s + (parseFloat(p.peso) || 0), 0))}
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
                <span className="text-xs text-gray-500">Peso total: {formatPeso(pecasExpedidas.reduce((s, p) => s + (parseFloat(p.peso) || 0), 0))}</span>
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
                  {expedicoesObra.filter(e => (e.status || '').toUpperCase() === 'EM_TRANSITO').length}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Envios criados a partir do romaneio expedido</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {expedicoesObra.filter(e => (e.status || '').toUpperCase() === 'EM_TRANSITO').length === 0 ? (
                  <p className="text-gray-600 text-xs text-center py-4">Nenhum envio em trânsito</p>
                ) : expedicoesObra.filter(e => (e.status || '').toUpperCase() === 'EM_TRANSITO').map(e => (
                  <div key={e.id} className="bg-gray-800 rounded p-2 text-xs border-l-2 border-blue-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-white">{e.numero || e.numeroRomaneio || e.numero_romaneio || 'Sem número'}</p>
                        <p className="text-gray-400">{e.obra_nome || e.obraNome || e.destino || '-'}</p>
                        <p className="text-gray-500">{formatPeso(parseFloat(e.peso_total || e.pesoTotal) || 0)} · {(e.pecas_ids || e.pecas || []).length} peça(s)</p>
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
              const enviosDoStatus = expedicoesObra.filter(e => (e.status || '').toUpperCase() === status.id);
              const pesoTotalStatus = enviosDoStatus.reduce((sum, e) => sum + (parseFloat(e.peso_total || e.pesoTotal) || 0), 0);
              const qtdPecasStatus = enviosDoStatus.reduce((sum, e) => {
                const pecasArr = e.pecas_ids || e.pecas || [];
                return sum + pecasArr.length;
              }, 0);
              return (
                <div key={status.id} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  <div className="flex items-center gap-2 mb-3">
                    <status.icon className="w-4 h-4" style={{ color: status.cor }} />
                    <p className="font-medium text-sm text-white">{status.nome}</p>
                    <span className="ml-auto text-xs rounded-full px-2 py-0.5 font-bold"
                      style={{ background: status.cor + '22', color: status.cor }}>
                      {enviosDoStatus.length} envio(s)
                    </span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {enviosDoStatus.map(e => {
                      const numEnvio = e.numero || e.numeroRomaneio || e.numero_romaneio || 'Sem número';
                      const obraNome = e.obra_nome || e.obraNome || e.destino || '-';
                      const pesoEnvio = parseFloat(e.peso_total || e.pesoTotal) || 0;
                      const pecasEnvio = e.pecas_ids || e.pecas || [];
                      const qtdPecas = pecasEnvio.length;
                      // Extrair detalhes das peças para listar individualmente
                      const pecasDetalhes = e.pecas_detalhes || e.pecasDetalhes || (Array.isArray(e.pecas) ? e.pecas.filter(p => typeof p === 'object') : []);
                      return (
                        <div key={e.id} className="bg-gray-800 rounded p-3 text-xs" style={{ borderLeft: `3px solid ${status.cor}` }}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-white text-sm">{numEnvio}</p>
                              <p className="text-gray-400">{obraNome}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-medium">{formatPeso(pesoEnvio)}</p>
                              <p className="text-gray-400">{qtdPecas} peça(s)</p>
                            </div>
                          </div>
                          {e.transportadora && <p className="text-gray-500 mb-1">Transp: {e.transportadora} {e.motorista ? `· ${e.motorista}` : ''}</p>}
                          {e.data_envio || e.dataEnvio ? <p className="text-gray-500 mb-1">Data: {e.data_envio || e.dataEnvio}</p> : null}
                          {pecasDetalhes.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-700">
                              <p className="text-gray-500 mb-1 font-medium">Peças:</p>
                              <div className="grid grid-cols-2 gap-1">
                                {pecasDetalhes.slice(0, 10).map((p, idx) => (
                                  <span key={idx} className="text-gray-400">
                                    {p.marca || p.id || `#${idx+1}`} {p.qtd_enviada || p.qtdEnviada ? `(${p.qtd_enviada || p.qtdEnviada}un)` : ''}
                                  </span>
                                ))}
                                {pecasDetalhes.length > 10 && <span className="text-gray-500">+{pecasDetalhes.length - 10} mais...</span>}
                              </div>
                            </div>
                          )}
                          <div className="mt-2 flex gap-2">
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:text-white"
                              style={{ color: status.cor }}
                              onClick={() => gerarRomaneio(e)}>
                              <Printer className="w-3 h-3 mr-1" /> Romaneio
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {enviosDoStatus.length === 0 && (
                      <p className="text-gray-600 text-xs text-center py-4">Nenhum</p>
                    )}
                  </div>
                  {enviosDoStatus.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-800 text-xs text-gray-500 flex justify-between">
                      <span>Total: {formatPeso(pesoTotalStatus)}</span>
                      <span>{qtdPecasStatus} peça(s) em {enviosDoStatus.length} envio(s)</span>
                    </div>
                  )}
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

      {/* Modal: Editar Envio */}
      <Dialog.Root open={editModalAberto} onOpenChange={setEditModalAberto}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-xl p-6 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                Editar Envio
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </Dialog.Close>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Número do Envio</label>
                <Input value={editForm.numero} onChange={e => setEditForm(p => ({ ...p, numero: e.target.value }))}
                  placeholder="ENV-001" className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Data</label>
                <Input type="date" value={editForm.data_envio} onChange={e => setEditForm(p => ({ ...p, data_envio: e.target.value }))}
                  className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Transportadora</label>
                <Input value={editForm.transportadora} onChange={e => setEditForm(p => ({ ...p, transportadora: e.target.value }))}
                  placeholder="Nome da transportadora" className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Motorista</label>
                <Input value={editForm.motorista} onChange={e => setEditForm(p => ({ ...p, motorista: e.target.value }))}
                  placeholder="Nome do motorista" className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Placa</label>
                <Input value={editForm.placa} onChange={e => setEditForm(p => ({ ...p, placa: e.target.value }))}
                  placeholder="ABC-1234" className="bg-gray-800 border-gray-600 text-white" />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Status</label>
                <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded-md text-sm">
                  {STATUS_ENVIO.map(s => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-400 block mb-1">Observações</label>
                <Input value={editForm.observacoes} onChange={e => setEditForm(p => ({ ...p, observacoes: e.target.value }))}
                  placeholder="Obs..." className="bg-gray-800 border-gray-600 text-white" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <Dialog.Close asChild>
                <Button variant="outline" className="border-gray-600 text-gray-300">Cancelar</Button>
              </Dialog.Close>
              <Button onClick={salvarEdicaoEnvio} className="bg-amber-600 hover:bg-amber-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

