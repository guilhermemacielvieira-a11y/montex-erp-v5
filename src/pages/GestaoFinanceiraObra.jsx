/**
 * MONTEX ERP Premium - Gestão Financeira da Obra
 *
 * Sistema completo de controle financeiro com:
 * - Dashboard com saldo em tempo real
 * - Lançamentos de despesas
 * - Material faturado direto
 * - Medições (Fabricação/Montagem)
 * - Saldo restante automático
 * - Fluxo de caixa
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  FileText,
  Package,
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  ChevronDown,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Wallet,
  Weight,
  Target,
  Activity,
  Layers,
  ClipboardList,
  ArrowRight,
  Check,
  Info,
  Edit,
  Upload,
  Save,
  X,
  Trash2
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import * as Dialog from '@radix-ui/react-dialog';
import ImportarNFModal from '../components/ImportarNFModal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line,
  ComposedChart
} from 'recharts';

import {
  TIPO_LANCAMENTO,
  STATUS_LANCAMENTO,
  STATUS_PEDIDO_FUTURO,
  CATEGORIA_DESPESA,
  STATUS_MEDICAO,
  ETAPA_MEDICAO,
  TIPO_RECEITA,
  STATUS_MATERIAL,
  OBRA_MODELO,
  LANCAMENTOS_DESPESAS,
  PEDIDOS_PRE_APROVADOS,
  MEDICOES_RECEITAS,
  COMPOSICAO_CONTRATO,
  MEDICOES,
  PEDIDOS_MATERIAL,
  calcularSaldoObra,
  calcularDespesasPorCategoria,
  calcularFluxoCaixa,
  calcularResumoPedidosFuturos,
  calcularAnaliseProjecao,
  calcularFluxoCaixaComFuturos,
  calcularSaldoContratoComReceitas,
  calcularDREObra,
  calcularResumoMateriais,
  calcularEstoquePorTipo
} from '../data/obraFinanceiraDatabase';
import { useObras, useLancamentos, useMedicoes } from '../contexts/ERPContext';

// Formatação monetária brasileira completa (ex: 2.700.000,00)
const formatMoney = (valor) => {
  if (valor === undefined || valor === null || isNaN(valor)) return '0,00';
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Formatação monetária sem centavos para valores grandes
const formatMoneyShort = (valor) => {
  if (valor === undefined || valor === null || isNaN(valor)) return '0';
  return Math.round(valor).toLocaleString('pt-BR');
};

// Cores
const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#3b82f6', '#14b8a6'];

const STATUS_COLORS = {
  [STATUS_LANCAMENTO.PENDENTE]: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  [STATUS_LANCAMENTO.APROVADO]: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  [STATUS_LANCAMENTO.PAGO]: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  [STATUS_LANCAMENTO.CANCELADO]: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30' },
  [STATUS_LANCAMENTO.FATURADO]: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' }
};

const MEDICAO_STATUS_COLORS = {
  [STATUS_MEDICAO.AGUARDANDO]: { bg: 'bg-slate-500/20', text: 'text-slate-400', icon: Clock },
  [STATUS_MEDICAO.EM_ANALISE]: { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: Eye },
  [STATUS_MEDICAO.APROVADA]: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: CheckCircle2 },
  [STATUS_MEDICAO.FATURADA]: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: Receipt },
  [STATUS_MEDICAO.PAGA]: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: DollarSign },
  [STATUS_MEDICAO.REJEITADA]: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle }
};

const CATEGORIA_LABELS = {
  [CATEGORIA_DESPESA.MATERIAL_ESTRUTURA]: 'Material Estrutura',
  [CATEGORIA_DESPESA.MATERIAL_COBERTURA]: 'Material Cobertura',
  [CATEGORIA_DESPESA.MATERIAL_FECHAMENTO]: 'Material Fechamento',
  [CATEGORIA_DESPESA.MATERIAL_COMPLEMENTOS]: 'Material Complementos',
  [CATEGORIA_DESPESA.MAO_DE_OBRA_FABRICA]: 'MO Fábrica',
  [CATEGORIA_DESPESA.MAO_DE_OBRA_MONTAGEM]: 'MO Montagem',
  [CATEGORIA_DESPESA.TERCEIRIZADOS]: 'Terceirizados',
  [CATEGORIA_DESPESA.TRANSPORTE]: 'Transporte',
  [CATEGORIA_DESPESA.PINTURA]: 'Pintura',
  [CATEGORIA_DESPESA.CONSUMIVEIS]: 'Consumíveis',
  [CATEGORIA_DESPESA.OUTROS]: 'Outros'
};

// Componente KPI Card
const KPICard = ({ icon: Icon, label, value, subvalue, color, trend, highlight = false }) => {
  const colorMap = {
    emerald: '#10B981',
    red: '#EF4444',
    cyan: '#06B6D4',
    amber: '#F59E0B',
    purple: '#8B5CF6',
    teal: '#14B8A6',
    blue: '#3B82F6',
    slate: '#94A3B8',
  };
  const hex = colorMap[color] || '#3B82F6';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group cursor-default rounded-xl border backdrop-blur-md overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(12,20,38,0.75), rgba(15,25,48,0.4))',
        borderColor: highlight ? `${hex}35` : 'rgba(56,72,100,0.35)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
      whileHover={{ y: -3, boxShadow: `0 8px 32px ${hex}15, inset 0 1px 0 rgba(255,255,255,0.05)` }}
      transition={{ duration: 0.25 }}
    >
      <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(90deg, ${hex}, ${hex}40, transparent)` }} />
      <div className="p-4 relative">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg" style={{ background: `${hex}15`, boxShadow: `0 0 12px ${hex}15` }}>
            <Icon className="w-5 h-5" style={{ color: hex }} />
          </div>
          {trend !== undefined && (
            <span className={`flex items-center text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-3">{label}</p>
        <p className="text-xl font-bold" style={{ color: highlight ? hex : '#F1F5F9' }}>{value}</p>
        {subvalue && <p className="text-xs text-slate-500 mt-0.5">{subvalue}</p>}
      </div>
    </motion.div>
  );
};

// Componente Progress Bar
const ProgressBar = ({ value, max, color = 'cyan', showLabel = true, height = 'h-2' }) => {
  const colorMap = {
    cyan: '#06B6D4',
    emerald: '#10B981',
    red: '#EF4444',
    amber: '#F59E0B',
    purple: '#8B5CF6',
    blue: '#3B82F6',
  };
  const hex = colorMap[color] || '#06B6D4';
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="w-full">
      <div
        className={`${height} rounded-full overflow-hidden`}
        style={{
          background: 'linear-gradient(180deg, rgba(30,41,59,0.6), rgba(51,65,85,0.3))',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.8 }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(180deg, ${hex}, ${hex}cc)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2), 0 0 6px ${hex}25`,
          }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-slate-400">
          <span>Pago: R$ {formatMoney(value)}</span>
          <span>{percentage.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};

export default function GestaoFinanceiraObra() {
  // ERPContext - dados reais do Supabase
  const { obras: obrasERP, obraAtualData } = useObras();
  const { lancamentosDespesas: lancamentosSupabase, addLancamento: addLancamentoCtx, updateLancamento: updateLancamentoCtx, deleteLancamento: deleteLancamentoCtx } = useLancamentos();
  const { medicoesObraAtual: medicoesSupabase, addMedicao: addMedicaoCtx, updateMedicao: updateMedicaoCtx, deleteMedicao: deleteMedicaoCtx } = useMedicoes();

  // Estados
  const [obra, setObra] = useState(OBRA_MODELO);
  const [obraFiltro, setObraFiltro] = useState(OBRA_MODELO.id);
  // Mesclar dados estáticos do modelo com dados reais do Supabase
  const [lancamentos, setLancamentos] = useState(LANCAMENTOS_DESPESAS);
  const [pedidosFuturos, setPedidosFuturos] = useState(PEDIDOS_PRE_APROVADOS);
  const [medicoesReceitas, setMedicoesReceitas] = useState(MEDICOES_RECEITAS);
  const [composicaoContrato, setComposicaoContrato] = useState(COMPOSICAO_CONTRATO);
  const [medicoes, setMedicoes] = useState(MEDICOES);
  const [materiais, setMateriais] = useState(PEDIDOS_MATERIAL);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNovoLancamento, setShowNovoLancamento] = useState(false);
  const [editandoLancamento, setEditandoLancamento] = useState(null);
  const [showImportacao, setShowImportacao] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importFile, setImportFile] = useState(null);
  const [showNovaMedicao, setShowNovaMedicao] = useState(false);
  const [editandoMedicao, setEditandoMedicao] = useState(null);
  const [setorSelecionado, setSetorSelecionado] = useState('todos');
  const [viewMode, setViewMode] = useState('real'); // 'real', 'futuro', 'projecao'

  // Mesclar dados do Supabase quando disponíveis
  React.useEffect(() => {
    if (lancamentosSupabase && lancamentosSupabase.length > 0) {
      // IDs existentes do modelo estático
      const idsEstaticos = new Set(LANCAMENTOS_DESPESAS.map(l => l.id));
      // Lançamentos do Supabase que não estão no modelo estático
      const novosDoSupabase = lancamentosSupabase.filter(l => !idsEstaticos.has(l.id)).map(l => ({
        id: l.id,
        tipo: l.tipo || 'despesa',
        data: l.dataEmissao || l.data || l.createdAt || new Date().toISOString().split('T')[0],
        dataEmissao: l.dataEmissao || l.data || new Date().toISOString().split('T')[0],
        dataVencimento: l.dataVencimento || null,
        dataPagamento: l.dataPagamento || null,
        descricao: l.descricao || l.nome || '-',
        fornecedor: l.fornecedor || '-',
        categoria: l.categoria || 'outros',
        valor: l.valor || 0,
        status: l.status || 'pendente',
        nf: l.notaFiscal || l.nf || null,
        notaFiscal: l.notaFiscal || l.nf || null,
        observacao: l.observacao || '',
        obraId: l.obraId || obra.id,
        setor: l.setor || '',
        formaPagto: l.formaPagto || '',
        pesoKg: l.pesoKg || null,
      }));
      // Mesclar: modelo estático + novos do Supabase
      setLancamentos([...LANCAMENTOS_DESPESAS, ...novosDoSupabase]);
    }
  }, [lancamentosSupabase, obra.id]);

  // Mesclar medições do Supabase quando disponíveis
  React.useEffect(() => {
    if (medicoesSupabase && medicoesSupabase.length > 0) {
      const idsEstaticos = new Set(MEDICOES.map(m => m.id));
      const novosDoSupabase = medicoesSupabase.filter(m => !idsEstaticos.has(m.id)).map(m => ({
        id: m.id,
        numero: m.numero || 0,
        obraId: m.obraId || m.obra_id || obra.id,
        setor: m.setor || '',
        etapa: m.etapa || 'fabricacao',
        tipo: m.tipo || 'peso',
        pesoMedido: m.pesoMedido || m.peso_medido || 0,
        dataMedicao: m.dataMedicao || m.data_medicao || '',
        dataReferencia: m.dataReferencia || m.data_referencia || '',
        valorBruto: m.valorBruto || m.valor_bruto || 0,
        valorLiquido: m.valorLiquido || m.valor_liquido || 0,
        status: m.status || 'aguardando',
        descricao: m.descricao || '',
        observacao: m.observacoes || m.observacao || '',
        retencoes: typeof m.retencoes === 'string' ? JSON.parse(m.retencoes) : (m.retencoes || {}),
        detalhamento: typeof m.detalhamento === 'string' ? JSON.parse(m.detalhamento) : (m.detalhamento || {}),
        isAvulsa: m.isAvulsa || m.is_avulsa || false,
      }));
      setMedicoes([...MEDICOES, ...novosDoSupabase]);
    }
  }, [medicoesSupabase, obra.id]);

  // Cálculos principais
  const saldo = useMemo(() =>
    calcularSaldoObra(obra, lancamentos, medicoes),
    [obra, lancamentos, medicoes]
  );

  const despesasPorCategoria = useMemo(() =>
    calcularDespesasPorCategoria(lancamentos, obra.id),
    [lancamentos, obra.id]
  );

  const fluxoCaixa = useMemo(() =>
    calcularFluxoCaixa(lancamentos, medicoes, 6),
    [lancamentos, medicoes]
  );

  // Análise de pedidos futuros
  const resumoFuturos = useMemo(() =>
    calcularResumoPedidosFuturos(pedidosFuturos, obra.id),
    [pedidosFuturos, obra.id]
  );

  // Análise comparativa REAL vs FUTURO
  const analiseProjecao = useMemo(() =>
    calcularAnaliseProjecao(obra, lancamentos, pedidosFuturos, medicoes),
    [obra, lancamentos, pedidosFuturos, medicoes]
  );

  // Fluxo de caixa com futuros incluídos
  const fluxoCaixaComFuturos = useMemo(() =>
    calcularFluxoCaixaComFuturos(lancamentos, medicoes, pedidosFuturos, 6),
    [lancamentos, medicoes, pedidosFuturos]
  );

  // Calcular totais dos lançamentos reais pagos
  const totalPago = useMemo(() =>
    lancamentos
      .filter(l => l.status === STATUS_LANCAMENTO.PAGO)
      .reduce((sum, l) => sum + l.valor, 0),
    [lancamentos]
  );

  // Calcular saldo do contrato (abatendo despesas pagas + receitas)
  const saldoContrato = useMemo(() =>
    calcularSaldoContratoComReceitas(obra, medicoesReceitas, lancamentos),
    [obra, medicoesReceitas, lancamentos]
  );

  // Calcular composição do contrato dinâmica (puxando dos lançamentos reais)
  const composicaoCalculada = useMemo(() => {
    const categoriasAtualizadas = composicaoContrato.categorias.map(cat => {
      // Mapear categorias de lançamento para esta composição
      const catLanc = cat.categoriasLancamento || [];
      const valorPago = lancamentos
        .filter(l => l.obraId === obra.id && l.status === 'pago' && catLanc.includes(l.categoria))
        .reduce((sum, l) => sum + l.valor, 0);
      return {
        ...cat,
        valorPago,
        saldoRestante: cat.valorPrevisto - valorPago
      };
    });
    return { ...composicaoContrato, categorias: categoriasAtualizadas };
  }, [composicaoContrato, lancamentos, obra.id]);

  // Calcular DRE da obra
  const dreObra = useMemo(() =>
    calcularDREObra(obra, lancamentos, medicoesReceitas),
    [obra, lancamentos, medicoesReceitas]
  );

  // Calcular resumo de materiais (Pedido x Entrega)
  const resumoMateriais = useMemo(() =>
    calcularResumoMateriais(materiais, obra.id),
    [materiais, obra.id]
  );

  // Calcular estoque por tipo de material
  const estoquePorTipo = useMemo(() => {
    const porTipo = calcularEstoquePorTipo(materiais, obra.id);
    // Converter objeto para array com tipoLabel
    return Object.entries(porTipo).map(([tipo, dados]) => ({
      tipo,
      tipoLabel: tipo.replace(/_/g, ' '),
      ...dados
    }));
  }, [materiais, obra.id]);

  // Total de receitas realizadas
  const totalReceitasRealizadas = useMemo(() =>
    medicoesReceitas
      .filter(r => r.status === STATUS_MEDICAO.PAGA)
      .reduce((sum, r) => sum + r.valorBruto, 0),
    [medicoesReceitas]
  );

  // Filtros de lançamentos
  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter(l => {
      const matchCategoria = filtroCategoria === 'todas' || l.categoria === filtroCategoria;
      const matchStatus = filtroStatus === 'todos' || l.status === filtroStatus;
      const matchSearch = !searchTerm ||
        l.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchSetor = setorSelecionado === 'todos' || l.setor === setorSelecionado;
      return matchCategoria && matchStatus && matchSearch && matchSetor;
    });
  }, [lancamentos, filtroCategoria, filtroStatus, searchTerm, setorSelecionado]);

  // Dados para gráficos
  const dadosCategoria = useMemo(() => {
    return Object.entries(despesasPorCategoria)
      .filter(([_, data]) => data.total > 0)
      .map(([cat, data], idx) => ({
        name: CATEGORIA_LABELS[cat] || cat,
        value: data.total,
        color: COLORS[idx % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [despesasPorCategoria]);

  const dadosMedicoes = useMemo(() => {
    return obra.setores.map(setor => {
      const medicoesFab = medicoes.filter(m =>
        m.setor === setor.nome && m.etapa === ETAPA_MEDICAO.FABRICACAO
      );
      const medicoesMont = medicoes.filter(m =>
        m.setor === setor.nome && m.etapa === ETAPA_MEDICAO.MONTAGEM
      );

      const medidoFab = medicoesFab.reduce((s, m) => s + m.pesoMedido, 0);
      const medidoMont = medicoesMont.reduce((s, m) => s + m.pesoMedido, 0);

      return {
        setor: setor.nome,
        peso: setor.peso,
        fabricacao: medidoFab,
        montagem: medidoMont,
        restante: setor.peso - medidoFab
      };
    });
  }, [obra.setores, medicoes]);

  // Adicionar lançamento - persiste no Supabase
  const [lancParaExcluir, setLancParaExcluir] = useState(null);

  const confirmarExclusao = useCallback(async () => {
    if (!lancParaExcluir) return;
    const id = lancParaExcluir;
    setLancParaExcluir(null);
    setLancamentos(prev => prev.filter(l => l.id !== id));
    try {
      await deleteLancamentoCtx(id);
    } catch (err) {
      console.error('Erro ao excluir lancamento:', err);
    }
  }, [lancParaExcluir, deleteLancamentoCtx]);

  // Estado para modal de importacao NF
  const [showImportNF, setShowImportNF] = useState(false);

  const adicionarLancamento = useCallback(async (novoLanc) => {
    const lancamento = {
        id: `lanc-${Date.now()}`,
        obraId: obra.id,
        ...novoLanc,
        data: novoLanc.dataEmissao || new Date().toISOString().split('T')[0],
        nf: novoLanc.notaFiscal || novoLanc.nf || null,
        status: STATUS_LANCAMENTO.PENDENTE
      };
    setLancamentos(prev => [...prev, lancamento]);
    setShowNovoLancamento(false);
    // Persistir no Supabase via ERPContext
    try {
      await addLancamentoCtx(lancamento);
    } catch (err) {
      console.error('Erro ao salvar lançamento:', err);
    }
  }, [obra.id, addLancamentoCtx]);

  // Atualizar status lançamento - persiste no Supabase
  const atualizarStatusLancamento = useCallback(async (id, novoStatus) => {
    const updateData = {
      status: novoStatus,
      dataPagamento: novoStatus === STATUS_LANCAMENTO.PAGO ? new Date().toISOString() : undefined
    };
    setLancamentos(prev => prev.map(l =>
      l.id === id ? { ...l, ...updateData } : l
    ));
    // Persistir no Supabase via ERPContext
    try {
      await updateLancamentoCtx(id, updateData);
    } catch (err2) {
      console.error('Erro ao atualizar lançamento:', err2);
    }
  }, [updateLancamentoCtx]);

  // Editar lançamento completo - persiste no Supabase
  const editarLancamento = useCallback(async (lancAtualizado) => {
    const { id, ...dados } = lancAtualizado;
    setLancamentos(prev => prev.map(l => l.id === id ? { ...l, ...dados } : l));
    setEditandoLancamento(null);
    setShowNovoLancamento(false);
    try {
      await updateLancamentoCtx(id, dados);
    } catch (err3) {
      console.error('Erro ao editar lançamento:', err3);
    }
  }, [updateLancamentoCtx]);

  // Adicionar medição manual - persiste no Supabase
  const adicionarMedicao = useCallback(async (novaMedicao) => {
    const medicao = {
      id: `med-${Date.now()}`,
      obraId: obra.id,
      ...novaMedicao,
    };
    setMedicoes(prev => [...prev, medicao]);
    setShowNovaMedicao(false);
    try {
      await addMedicaoCtx(medicao);
    } catch (err) {
      console.error('Erro ao salvar medição:', err);
    }
  }, [obra.id, addMedicaoCtx]);

  // Editar medição existente - persiste no Supabase
  const editarMedicao = useCallback(async (medicaoAtualizada) => {
    const { id, ...dados } = medicaoAtualizada;
    setMedicoes(prev => prev.map(m => m.id === id ? { ...m, ...dados } : m));
    setEditandoMedicao(null);
    setShowNovaMedicao(false);
    try {
      await updateMedicaoCtx(id, dados);
    } catch (err) {
      console.error('Erro ao editar medição:', err);
    }
  }, [updateMedicaoCtx]);

  // Excluir medição - persiste no Supabase
  const excluirMedicao = useCallback(async (id) => {
    setMedicoes(prev => prev.filter(m => m.id !== id));
    try {
      await deleteMedicaoCtx(id);
    } catch (err) {
      console.error('Erro ao excluir medição:', err);
    }
  }, [deleteMedicaoCtx]);

  // Abrir edição de uma medição
  const abrirEdicaoMedicao = useCallback((med) => {
    setEditandoMedicao(med);
    setShowNovaMedicao(true);
  }, []);

  // Abrir edição de um lançamento
  const abrirEdicaoLancamento = useCallback((lanc) => {
    setEditandoLancamento(lanc);
    setShowNovoLancamento(true);
  }, []);

  // Importação CSV
  const handleImportCSV = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return;
      const headers = lines[0].split(';').map(h => h.trim().toLowerCase());
      const rows = lines.slice(1).map((line, idx) => {
        const cols = line.split(';').map(c => c.trim());
        const obj = {};
        headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
        return {
          id: `IMP-${Date.now()}-${idx}`,
          descricao: obj['descricao'] || obj['descrição'] || obj['historico'] || obj['histórico'] || '',
          valor: parseFloat((obj['valor'] || obj['debito'] || obj['débito'] || '0').replace(/[^\d,.-]/g, '').replace(',', '.')) || 0,
          data: obj['data'] || obj['dt_lancamento'] || obj['data_emissao'] || new Date().toISOString().split('T')[0],
          dataVencimento: obj['vencimento'] || obj['data_vencimento'] || '',
          tipo: (obj['tipo'] || 'despesa').toLowerCase().includes('receita') ? TIPO_LANCAMENTO.RECEITA || 'receita' : TIPO_LANCAMENTO.DESPESA || 'despesa',
          categoria: obj['categoria'] || CATEGORIA_DESPESA.OUTROS || 'outros',
          fornecedor: obj['fornecedor'] || '',
          notaFiscal: obj['nota_fiscal'] || obj['nf'] || '',
          observacao: obj['observacao'] || obj['observação'] || '',
          formaPagto: obj['forma_pagto'] || obj['pagamento'] || '',
          setor: obj['setor'] || '',
          status: STATUS_LANCAMENTO.PENDENTE || 'pendente',
        };
      }).filter(r => r.descricao && r.valor > 0);
      setImportData(rows);
      setShowImportacao(true);
    };
    reader.readAsText(file, 'UTF-8');
  }, []);

  const confirmarImportacao = useCallback(async () => {
    for (const item of importData) {
      const lancamento = { ...item, obraId: obra.id };
      setLancamentos(prev => [...prev, lancamento]);
      try {
        await addLancamentoCtx(lancamento);
      } catch (errImp) {
        console.error('Erro ao importar lançamento:', errImp);
      }
    }
    setShowImportacao(false);
    setImportData([]);
    setImportFile(null);
  }, [importData, obra.id, addLancamentoCtx]);

  return (
    <div className="min-h-screen text-slate-100" style={{ background: 'linear-gradient(180deg, #060A14 0%, #080E1C 50%, #0A1020 100%)' }}>
      <div className="w-full px-4 2xl:px-6 py-4 space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div
                className="p-3 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #10B981, #0D9488)',
                  boxShadow: '0 4px 15px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              Gestão Financeira da Obra
            </h1>
            <p className="text-slate-400 mt-1">
              <span className="text-cyan-400 font-medium">{obra.codigo}</span> - {obra.nome}
              <span className="mx-2">•</span>
              <span className="text-emerald-400">{(obra.contrato.pesoTotal / 1000).toFixed(0)} ton</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filtro por Obra */}
            <Select.Root value={obraFiltro} onValueChange={setObraFiltro}>
              <Select.Trigger className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white min-w-[220px]">
                <Filter className="w-4 h-4 text-cyan-400" />
                <Select.Value />
                <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50">
                  <Select.Viewport className="p-2">
                    <Select.Item value={OBRA_MODELO.id} className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded-lg cursor-pointer outline-none">
                      <Select.ItemText>{OBRA_MODELO.codigo} - {OBRA_MODELO.nome}</Select.ItemText>
                    </Select.Item>
                    {obrasERP.filter(o => o.id !== OBRA_MODELO.id).map(o => (
                      <Select.Item key={o.id} value={o.id} className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded-lg cursor-pointer outline-none">
                        <Select.ItemText>{o.codigo} - {o.nome}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>

            <div className="text-right mr-2">
              <p className="text-xs text-slate-400">Valor do Contrato</p>
              <p className="text-2xl font-bold text-white">
                R$ {formatMoney(obra.contrato.valorTotal)}
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50
                           text-slate-300 rounded-xl hover:bg-slate-700/50 transition-colors">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </motion.div>

        {/* Saldo Restante Destacado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.05), rgba(139,92,246,0.05))',
            borderColor: 'rgba(16,185,129,0.2)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(16,185,129,0.06)',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {/* Valor Contrato */}
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-1">Valor Contrato</p>
              <p className="text-xl font-bold text-white">
                R$ {formatMoney(saldo.valorContrato)}
              </p>
              <p className="text-xs text-slate-500">100%</p>
            </div>

            {/* Seta */}
            <div className="hidden md:flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-slate-600" />
            </div>

            {/* Receitas Realizadas (Medições Pagas) */}
            <div
              className="text-center rounded-xl p-2 border backdrop-blur-md overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                borderColor: 'rgba(16,185,129,0.25)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(16,185,129,0.05)',
              }}
            >
              <p className="text-xs text-emerald-300 mb-1">RECEITAS PAGAS</p>
              <p className="text-xl font-bold text-emerald-400">
                R$ {formatMoney(totalReceitasRealizadas)}
              </p>
              <p className="text-xs text-emerald-500">{saldoContrato.percentualMedido.toFixed(1)}%</p>
            </div>

            {/* Seta */}
            <div className="hidden md:flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-slate-600" />
            </div>

            {/* Despesas Pagas */}
            <div
              className="text-center rounded-xl p-2 border backdrop-blur-md overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                borderColor: 'rgba(239,68,68,0.25)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(239,68,68,0.05)',
              }}
            >
              <p className="text-xs text-red-300 mb-1">DESPESAS PAGAS</p>
              <p className="text-xl font-bold text-red-400">
                R$ {formatMoney(totalPago)}
              </p>
              <p className="text-xs text-red-500">{((totalPago / saldo.valorContrato) * 100).toFixed(1)}%</p>
            </div>

            {/* Seta */}
            <div className="hidden md:flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-slate-600" />
            </div>

            {/* Saldo do Contrato (Abatido automaticamente) */}
            <div
              className="text-center rounded-xl p-2 border backdrop-blur-md overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                borderColor: 'rgba(139,92,246,0.3)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(139,92,246,0.1)',
              }}
            >
              <p className="text-xs text-purple-300 mb-1">SALDO CONTRATO</p>
              <p className="text-xl font-bold text-purple-400">
                R$ {formatMoney(saldoContrato.saldoRestante)}
              </p>
              <p className="text-xs text-purple-500">{saldoContrato.percentualRestante.toFixed(1)}% restante</p>
            </div>
          </div>

          {/* Barra de progresso geral */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Progresso Financeiro</span>
              <span>{saldoContrato.percentualExecutado.toFixed(1)}% executado</span>
            </div>
            <div
              className="h-4 rounded-full overflow-hidden flex"
              style={{
                background: 'linear-gradient(180deg, rgba(15,23,42,0.8), rgba(30,41,59,0.6))',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${saldoContrato.percentualExecutado}%` }}
                className="bg-red-500 h-full"
                title="Despesas Pagas"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${saldoContrato.percentualMedido}%` }}
                className="bg-emerald-500 h-full"
                title="Receitas (Medições Pagas)"
                style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
              />
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded" /> Despesas Pagas ({saldoContrato.percentualExecutado.toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-emerald-500 rounded" /> Receitas ({saldoContrato.percentualMedido.toFixed(1)}%)
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-slate-600 rounded" /> Saldo Restante ({saldoContrato.percentualRestante.toFixed(1)}%)
              </span>
            </div>
          </div>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <KPICard
            icon={ArrowUpRight}
            label="Receitas Pagas"
            value={`R$ ${formatMoney(totalReceitasRealizadas)}`}
            subvalue="Medições recebidas"
            color="emerald"
            highlight={true}
          />
          <KPICard
            icon={ArrowDownRight}
            label="Despesas Pagas"
            value={`R$ ${formatMoney(totalPago)}`}
            subvalue="Notas baixadas"
            color="red"
            highlight={true}
          />
          <KPICard
            icon={Target}
            label="Resultado DRE"
            value={`R$ ${formatMoney(dreObra.resultado.lucroBruto)}`}
            subvalue={`Margem: ${dreObra.resultado.margemBruta.toFixed(1)}%`}
            color={dreObra.resultado.lucroBruto >= 0 ? 'cyan' : 'amber'}
            highlight={true}
          />
          <KPICard
            icon={Wallet}
            label="Saldo Contrato"
            value={`R$ ${formatMoney(saldoContrato.saldoRestante)}`}
            subvalue={`${saldoContrato.percentualRestante.toFixed(1)}% restante`}
            color="purple"
          />
          <KPICard
            icon={Clock}
            label="Pedidos Futuros"
            value={`R$ ${formatMoney(resumoFuturos.totalFuturo)}`}
            subvalue={`${resumoFuturos.quantidadePedidos} pedidos`}
            color="amber"
          />
          <KPICard
            icon={Receipt}
            label="Receitas/Medições"
            value={medicoesReceitas.length}
            subvalue={`${medicoesReceitas.filter(r => r.status === STATUS_MEDICAO.PAGA).length} pagas`}
            color="teal"
          />
          <KPICard
            icon={Weight}
            label="Peso Previsto"
            value={`${(obra.contrato.pesoTotal / 1000).toFixed(0)} ton`}
            subvalue="107.000 kg"
            color="blue"
          />
          <KPICard
            icon={ClipboardList}
            label="Lançamentos"
            value={lancamentos.length}
            subvalue={`${lancamentos.filter(l => l.status === STATUS_LANCAMENTO.PAGO).length} pagos`}
            color="slate"
          />
        </div>

        {/* Tabs */}
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List
            className="flex gap-1.5 p-1 rounded-xl w-fit mb-4 overflow-x-auto"
            style={{
              background: 'linear-gradient(135deg, rgba(12,20,38,0.6), rgba(15,25,48,0.4))',
              border: '1px solid rgba(56,72,100,0.25)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
            }}
          >
            {[
              { value: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { value: 'dre', label: 'DRE Obra', icon: TrendingUp },
              { value: 'lancamentos', label: 'Lançamentos', icon: Receipt },
              { value: 'futuros', label: 'Futuro vs Real', icon: Target },
              { value: 'estoque', label: 'Pedido x Entrega', icon: Package },
              { value: 'medicoes', label: 'Medições', icon: ClipboardList },
              { value: 'setores', label: 'Por Setor', icon: Layers },
              { value: 'fluxo', label: 'Fluxo de Caixa', icon: Activity }
            ].map(tab => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400
                         data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 transition-colors whitespace-nowrap"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* Tab: Dashboard */}
          <Tabs.Content value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Despesas por Categoria */}
              <div
                className="rounded-xl border backdrop-blur-md overflow-hidden p-5"
                style={{
                  background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                  borderColor: 'rgba(56,72,100,0.35)',
                  boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)',
                }}
              >
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <PieChartIcon className="w-5 h-5 text-purple-400" />
                  Despesas por Categoria
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={dadosCategoria}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {dadosCategoria.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))',
                        border: '1px solid rgba(100,116,139,0.3)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(10px)',
                      }}
                      formatter={(value) => `R$ ${formatMoney(value)}`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {dadosCategoria.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-slate-400 truncate">{item.name}</span>
                      <span className="text-xs text-white font-medium ml-auto">
                        {saldo.totalDespesas > 0 ? ((item.value / saldo.totalDespesas) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Medições por Setor */}
              <div
                className="rounded-xl border backdrop-blur-md overflow-hidden p-5"
                style={{
                  background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                  borderColor: 'rgba(56,72,100,0.35)',
                  boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)',
                }}
              >
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  Medições por Setor
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dadosMedicoes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.2)" />
                    <XAxis type="number" stroke="#64748b" fontSize={12} />
                    <YAxis type="category" dataKey="setor" stroke="#64748b" fontSize={12} width={100} />
                    <Tooltip
                      contentStyle={{
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))',
                        border: '1px solid rgba(100,116,139,0.3)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(10px)',
                      }}
                      formatter={(value) => `${(value / 1000).toFixed(1)} ton`}
                    />
                    <Bar dataKey="fabricacao" name="Fabricação" fill="#8b5cf6" stackId="a" />
                    <Bar dataKey="montagem" name="Montagem" fill="#10b981" stackId="a" />
                    <Bar dataKey="restante" name="Restante" fill="#475569" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-4 justify-center text-xs">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-purple-500 rounded" /> Fabricação
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-emerald-500 rounded" /> Montagem
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-slate-600 rounded" /> Restante
                  </span>
                </div>
              </div>
            </div>

            {/* Fluxo de Caixa Preview */}
            <div
              className="rounded-xl border backdrop-blur-md overflow-hidden p-5"
              style={{
                background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                borderColor: 'rgba(56,72,100,0.35)',
                boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)',
              }}
            >
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-amber-400" />
                Fluxo de Caixa Projetado
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={fluxoCaixa}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mesLabel" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `R$ ${formatMoneyShort(v)}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value) => `R$ ${formatMoney(value)}`}
                  />
                  <Bar dataKey="receitas" name="Receitas" fill="#10b981" />
                  <Bar dataKey="despesas" name="Despesas" fill="#ef4444" />
                  <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#06b6d4" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Tabs.Content>

          {/* Tab: DRE Obra - Demonstrativo de Resultado */}
          <Tabs.Content value="dre" className="space-y-4">
            {/* Header DRE */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border backdrop-blur-xl p-6 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.05), rgba(139,92,246,0.05))',
                borderColor: 'rgba(16,185,129,0.2)',
                boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(16,185,129,0.06)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-emerald-400" />
                  </div>
                  DRE - Demonstrativo de Resultado da Obra
                </h3>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Obra: {obra.nome}</p>
                  <p className="text-sm text-cyan-400 font-medium">Contrato: R$ {formatMoney(obra.contrato.valorTotal)}</p>
                </div>
              </div>

              {/* Resumo Principal */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* RECEITAS */}
                <div
                  className="rounded-xl p-4 border backdrop-blur-md overflow-hidden"
                  style={{
                    background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                    borderColor: 'rgba(16,185,129,0.3)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(16,185,129,0.1)',
                  }}
                >
                  <p className="text-xs text-emerald-300 flex items-center gap-1 mb-2">
                    <ArrowUpRight className="w-3 h-3" /> RECEITAS REALIZADAS
                  </p>
                  <p className="text-2xl font-bold text-emerald-400">
                    R$ {formatMoney(totalReceitasRealizadas)}
                  </p>
                  <p className="text-xs text-emerald-500 mt-1">
                    {saldoContrato.percentualMedido.toFixed(1)}% do contrato
                  </p>
                </div>

                {/* CUSTOS */}
                <div
                  className="rounded-xl p-4 border backdrop-blur-md overflow-hidden"
                  style={{
                    background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                    borderColor: 'rgba(239,68,68,0.3)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(239,68,68,0.1)',
                  }}
                >
                  <p className="text-xs text-red-300 flex items-center gap-1 mb-2">
                    <ArrowDownRight className="w-3 h-3" /> CUSTOS REALIZADOS
                  </p>
                  <p className="text-2xl font-bold text-red-400">
                    R$ {formatMoney(dreObra.custos.realizados)}
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    {((dreObra.custos.realizados / obra.contrato.valorTotal) * 100).toFixed(1)}% do contrato
                  </p>
                </div>

                {/* RESULTADO */}
                <div className={`rounded-xl p-4 border ${
                  dreObra.resultado.lucroBruto >= 0
                    ? 'bg-cyan-900/30 border-cyan-500/30'
                    : 'bg-amber-900/30 border-amber-500/30'
                }`}>
                  <p className={`text-xs flex items-center gap-1 mb-2 ${
                    dreObra.resultado.lucroBruto >= 0 ? 'text-cyan-300' : 'text-amber-300'
                  }`}>
                    <Target className="w-3 h-3" /> RESULTADO ATUAL
                  </p>
                  <p className={`text-2xl font-bold ${
                    dreObra.resultado.lucroBruto >= 0 ? 'text-cyan-400' : 'text-amber-400'
                  }`}>
                    R$ {formatMoney(dreObra.resultado.lucroBruto)}
                  </p>
                  <p className={`text-xs mt-1 ${
                    dreObra.resultado.lucroBruto >= 0 ? 'text-cyan-500' : 'text-amber-500'
                  }`}>
                    Margem: {dreObra.resultado.margemBruta.toFixed(1)}%
                  </p>
                </div>

                {/* SALDO CONTRATO */}
                <div
                  className="rounded-xl p-4 border backdrop-blur-md overflow-hidden"
                  style={{
                    background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                    borderColor: 'rgba(139,92,246,0.3)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(139,92,246,0.1)',
                  }}
                >
                  <p className="text-xs text-purple-300 flex items-center gap-1 mb-2">
                    <Wallet className="w-3 h-3" /> SALDO DO CONTRATO
                  </p>
                  <p className="text-2xl font-bold text-purple-400">
                    R$ {formatMoney(saldoContrato.saldoRestante)}
                  </p>
                  <p className="text-xs text-purple-500 mt-1">
                    {saldoContrato.percentualRestante.toFixed(1)}% restante
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Receitas Detalhadas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Lista de Receitas (Medições Pagas) */}
              <div
                className="rounded-xl border backdrop-blur-md overflow-hidden p-5"
                style={{
                  background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                  borderColor: 'rgba(56,72,100,0.35)',
                  boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)',
                }}
              >
                <h4 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                  Receitas Realizadas (Medições Pagas)
                </h4>

                <div className="space-y-3">
                  {medicoesReceitas.map((receita, idx) => (
                    <motion.div
                      key={receita.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-4 rounded-xl bg-emerald-900/20 border border-emerald-500/30"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 font-medium">#{receita.numero}</span>
                            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                              {receita.tipoReceita === TIPO_RECEITA.ENTRADA ? 'Entrada' : 'Chaparia'}
                            </span>
                          </div>
                          <p className="text-sm text-white mt-1">{receita.descricao}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            NF: {receita.notaFiscal} • {new Date(receita.dataPagamento).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-400">
                            R$ {(receita.valorBruto || 0).toLocaleString('pt-BR')}
                          </p>
                          <p className="text-xs text-slate-400">
                            Líquido: R$ {(receita.valorLiquido || 0).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      {/* Retenções */}
                      <div className="mt-3 pt-3 border-t border-emerald-500/20 flex gap-4 text-xs">
                        <span className="text-slate-400">ISS: R$ {((receita.retencoes?.iss) || 0).toLocaleString('pt-BR')}</span>
                        <span className="text-slate-400">INSS: R$ {((receita.retencoes?.inss) || 0).toLocaleString('pt-BR')}</span>
                        <span className="text-slate-400">Retenção: R$ {((receita.retencoes?.contratual) || 0).toLocaleString('pt-BR')}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between">
                  <span className="text-slate-300 font-medium">Total Receitas:</span>
                  <span className="text-emerald-400 font-bold text-lg">
                    R$ {(totalReceitasRealizadas || 0).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Composição do Contrato */}
              <div
                className="rounded-xl border backdrop-blur-md overflow-hidden p-5"
                style={{
                  background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                  borderColor: 'rgba(56,72,100,0.35)',
                  boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)',
                }}
              >
                <h4 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <Layers className="w-5 h-5 text-purple-400" />
                  Composição do Contrato
                </h4>

                <div className="space-y-3">
                  {composicaoCalculada.categorias.map((cat, idx) => {
                    const percentPago = cat.valorPrevisto > 0 ? (cat.valorPago / cat.valorPrevisto) * 100 : 0;
                    return (
                      <div key={cat.id} className="p-3 rounded-lg bg-slate-800/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${
                              cat.tipo === 'receita' ? 'bg-emerald-500' :
                              cat.tipo === 'despesa' ? 'bg-red-500' : 'bg-amber-500'
                            }`} />
                            <span className="text-white text-sm">{cat.nome}</span>
                          </div>
                          <span className="text-xs text-slate-400">{cat.percentual}%</span>
                        </div>

                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentPago}%` }}
                            className={`h-full rounded-full ${
                              cat.tipo === 'receita' ? 'bg-emerald-500' :
                              cat.tipo === 'despesa' ? 'bg-red-500' : 'bg-amber-500'
                            }`}
                          />
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">
                            Pago: R$ {formatMoney(cat.valorPago)}
                          </span>
                          <span className="text-slate-400">
                            Saldo: R$ {formatMoney(cat.saldoRestante)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Nota Explicativa DRE */}
            <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-500/30">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <h4 className="text-emerald-300 font-medium mb-1">Como funciona o DRE da Obra?</h4>
                  <p className="text-sm text-slate-400">
                    <strong className="text-emerald-400">Receitas:</strong> São as medições aprovadas e pagas pelo cliente. Cada medição abate automaticamente do saldo do contrato.
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    <strong className="text-red-400">Custos:</strong> São todas as despesas pagas (material, mão de obra, transporte, etc).
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    <strong className="text-cyan-400">Resultado:</strong> Diferença entre Receitas Líquidas e Custos Realizados. Mostra a saúde financeira atual da obra.
                  </p>
                </div>
              </div>
            </div>
          </Tabs.Content>

          {/* Tab: Lançamentos */}
          <Tabs.Content value="lancamentos" className="space-y-4">
            <div
              className="rounded-xl border backdrop-blur-md overflow-hidden p-5"
              style={{
                background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                borderColor: 'rgba(56,72,100,0.35)',
                boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)',
              }}
            >
              {/* Header e Filtros */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-semibold text-white">Lançamentos de Despesas</h3>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg
                               text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-48"
                    />
                  </div>

                  <Select.Root value={filtroCategoria} onValueChange={setFiltroCategoria}>
                    <Select.Trigger className="flex items-center gap-2 px-3 py-2 bg-slate-800/50
                                             border border-slate-700/50 rounded-lg text-white text-sm">
                      <Filter className="w-4 h-4 text-slate-400" />
                      <Select.Value placeholder="Categoria" />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-50 max-h-60">
                        <Select.Viewport>
                          <Select.Item value="todas" className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm">
                            <Select.ItemText>Todas Categorias</Select.ItemText>
                          </Select.Item>
                          {Object.entries(CATEGORIA_LABELS).map(([key, label]) => (
                            <Select.Item key={key} value={key} className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm">
                              <Select.ItemText>{label}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>

                  <Select.Root value={filtroStatus} onValueChange={setFiltroStatus}>
                    <Select.Trigger className="flex items-center gap-2 px-3 py-2 bg-slate-800/50
                                             border border-slate-700/50 rounded-lg text-white text-sm">
                      <Select.Value placeholder="Status" />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-50">
                        <Select.Viewport>
                          <Select.Item value="todos" className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm">
                            <Select.ItemText>Todos Status</Select.ItemText>
                          </Select.Item>
                          {Object.entries(STATUS_LANCAMENTO).map(([key, value]) => (
                            <Select.Item key={key} value={value} className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm">
                              <Select.ItemText>{key.charAt(0) + key.slice(1).toLowerCase()}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>

                  <button
                    onClick={() => document.getElementById('import-csv-obra')?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400
                             rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                  >
                    <Upload className="w-4 h-4" />
                    Importar
                  </button>
                  <input
                    id="import-csv-obra"
                    type="file"
                    accept=".csv,.xlsx,.xls,.tsv"
                    className="hidden"
                    onChange={handleImportCSV}
                  />
                  <button
                    onClick={() => setShowImportNF(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400
                             rounded-lg hover:bg-amber-500/30 transition-colors text-sm"
                  >
                    <Receipt className="w-4 h-4" />
                    Importar NF
                  </button>
                  <button
                    onClick={() => { setEditandoLancamento(null); setShowNovoLancamento(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400
                             rounded-lg hover:bg-emerald-500/30 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Lançamento
                  </button>
                </div>
              </div>

              {/* Tabela de Lançamentos */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-700/50">
                      <th className="text-left py-3 px-2">Descrição</th>
                      <th className="text-left py-3 px-2">Categoria</th>
                      <th className="text-left py-3 px-2">Fornecedor</th>
                      <th className="text-center py-3 px-2">Vencimento</th>
                      <th className="text-right py-3 px-2">Valor</th>
                      <th className="text-center py-3 px-2">Status</th>
                      <th className="text-center py-3 px-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lancamentosFiltrados.slice(0, 15).map((lanc, idx) => {
                      const statusStyle = STATUS_COLORS[lanc.status] || STATUS_COLORS[STATUS_LANCAMENTO.PENDENTE];
                      return (
                        <motion.tr
                          key={lanc.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className="border-b border-slate-700/30 hover:bg-slate-700/20"
                        >
                          <td className="py-3 px-2">
                            <div>
                              <p className="text-white text-sm">{lanc.descricao}</p>
                              {lanc.notaFiscal && (
                                <p className="text-xs text-slate-500">{lanc.notaFiscal}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-slate-400 text-sm">
                            {CATEGORIA_LABELS[lanc.categoria] || lanc.categoria}
                          </td>
                          <td className="py-3 px-2 text-slate-300 text-sm">{lanc.fornecedor}</td>
                          <td className="py-3 px-2 text-center text-slate-400 text-sm">
                            {lanc.dataVencimento ? new Date(lanc.dataVencimento).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="py-3 px-2 text-right text-white font-medium">
                            R$ {(lanc.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-1 text-xs rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                              {lanc.status.charAt(0).toUpperCase() + lanc.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {lanc.status === STATUS_LANCAMENTO.PENDENTE && (
                                <button
                                  onClick={() => atualizarStatusLancamento(lanc.id, STATUS_LANCAMENTO.APROVADO)}
                                  className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                                  title="Aprovar"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              {lanc.status === STATUS_LANCAMENTO.APROVADO && (
                                <button
                                  onClick={() => atualizarStatusLancamento(lanc.id, STATUS_LANCAMENTO.PAGO)}
                                  className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors"
                                  title="Marcar como Pago"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => abrirEdicaoLancamento(lanc)}
                                className="p-1.5 text-cyan-400 hover:bg-cyan-500/20 rounded transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setLancParaExcluir(lanc.id)}
                                className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totais */}
              <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {lancamentosFiltrados.length} lançamentos encontrados
                </p>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-slate-500">Total Filtrado</p>
                    <p className="text-lg font-bold text-white">
                      R$ {lancamentosFiltrados.reduce((s, l) => s + l.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pago</p>
                    <p className="text-lg font-bold text-emerald-400">
                      R$ {lancamentosFiltrados.filter(l => l.status === STATUS_LANCAMENTO.PAGO).reduce((s, l) => s + l.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">A Pagar</p>
                    <p className="text-lg font-bold text-amber-400">
                      R$ {lancamentosFiltrados.filter(l => l.status !== STATUS_LANCAMENTO.PAGO && l.status !== STATUS_LANCAMENTO.CANCELADO).reduce((s, l) => s + l.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Tabs.Content>

          {/* Tab: Futuro vs Real */}
          <Tabs.Content value="futuros" className="space-y-4">
            {/* Header da Análise */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-amber-900/40 via-orange-900/30 to-red-900/40 backdrop-blur-xl
                       rounded-2xl border border-amber-500/30 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Target className="w-6 h-6 text-amber-400" />
                  </div>
                  Análise Financeira: REAL vs FUTURO
                </h3>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    analiseProjecao.analiseRisco.status === 'saudavel' ? 'bg-emerald-500/20 text-emerald-400' :
                    analiseProjecao.analiseRisco.status === 'atencao' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {analiseProjecao.analiseRisco.status === 'saudavel' ? '✓ Saudável' :
                     analiseProjecao.analiseRisco.status === 'atencao' ? '⚠ Atenção' : '⛔ Crítico'}
                  </span>
                </div>
              </div>

              {/* Cards de Comparação */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* REAL */}
                <div
                  className="rounded-xl p-4 border backdrop-blur-md overflow-hidden"
                  style={{
                    background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                    borderColor: 'rgba(16,185,129,0.3)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(16,185,129,0.1)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <h4 className="text-emerald-300 font-medium">DESPESAS REAIS</h4>
                  </div>
                  <p className="text-3xl font-bold text-emerald-400">
                    R$ {formatMoney(analiseProjecao.real.totalDespesas)}
                  </p>
                  <p className="text-sm text-emerald-500 mt-1">
                    {analiseProjecao.real.valorContrato > 0 ? ((analiseProjecao.real.totalDespesas / analiseProjecao.real.valorContrato) * 100).toFixed(1) : 0}% do contrato
                  </p>
                  <div className="mt-3 pt-3 border-t border-emerald-500/30 text-sm">
                    <div className="flex justify-between text-slate-300">
                      <span>Saldo a Medir:</span>
                      <span className="font-medium">R$ {formatMoney(analiseProjecao.real.saldoAMedir)}</span>
                    </div>
                  </div>
                </div>

                {/* FUTURO (Pré-Aprovados) */}
                <div
                  className="rounded-xl p-4 border backdrop-blur-md overflow-hidden"
                  style={{
                    background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                    borderColor: 'rgba(245,158,11,0.3)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(245,158,11,0.1)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <h4 className="text-amber-300 font-medium">PEDIDOS PRÉ-APROVADOS</h4>
                  </div>
                  <p className="text-3xl font-bold text-amber-400">
                    R$ {formatMoney(analiseProjecao.futuro.totalValor)}
                  </p>
                  <p className="text-sm text-amber-500 mt-1">
                    {analiseProjecao.futuro.impactoPercentual.toFixed(1)}% do contrato
                  </p>
                  <div className="mt-3 pt-3 border-t border-amber-500/30 text-sm">
                    <div className="flex justify-between text-slate-300">
                      <span>Pedidos:</span>
                      <span className="font-medium">{analiseProjecao.futuro.totalPedidos} pendentes</span>
                    </div>
                  </div>
                </div>

                {/* PROJEÇÃO */}
                <div className={`rounded-xl p-4 border ${
                  analiseProjecao.projecao.alertaSaldo
                    ? 'bg-red-900/30 border-red-500/30'
                    : 'bg-cyan-900/30 border-cyan-500/30'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className={`w-5 h-5 ${analiseProjecao.projecao.alertaSaldo ? 'text-red-400' : 'text-cyan-400'}`} />
                    <h4 className={`font-medium ${analiseProjecao.projecao.alertaSaldo ? 'text-red-300' : 'text-cyan-300'}`}>
                      PROJEÇÃO TOTAL
                    </h4>
                  </div>
                  <p className={`text-3xl font-bold ${analiseProjecao.projecao.alertaSaldo ? 'text-red-400' : 'text-cyan-400'}`}>
                    R$ {formatMoney(analiseProjecao.projecao.totalDespesas)}
                  </p>
                  <p className={`text-sm mt-1 ${analiseProjecao.projecao.alertaSaldo ? 'text-red-500' : 'text-cyan-500'}`}>
                    {analiseProjecao.analiseRisco.percentualComprometido.toFixed(1)}% comprometido
                  </p>
                  <div className={`mt-3 pt-3 border-t text-sm ${analiseProjecao.projecao.alertaSaldo ? 'border-red-500/30' : 'border-cyan-500/30'}`}>
                    <div className="flex justify-between text-slate-300">
                      <span>Saldo Projetado:</span>
                      <span className={`font-medium ${analiseProjecao.projecao.saldoDisponivel < 0 ? 'text-red-400' : 'text-white'}`}>
                        R$ {formatMoney(analiseProjecao.projecao.saldoDisponivel)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barra de Progresso Visual */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>Composição do Contrato (R$ {(obra.contrato.valorTotal / 1000000).toFixed(2)}M)</span>
                  <span>Margem: {analiseProjecao.projecao.margemProjetada.toFixed(1)}%</span>
                </div>
                <div className="h-8 bg-slate-700 rounded-full overflow-hidden flex">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${obra.contrato.valorTotal > 0 ? (analiseProjecao.real.totalDespesas / obra.contrato.valorTotal) * 100 : 0}%` }}
                    className="bg-emerald-500 h-full flex items-center justify-center"
                    title="Despesas Reais"
                  >
                    <span className="text-xs font-medium text-white px-1">Real</span>
                  </motion.div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${analiseProjecao.futuro.impactoPercentual}%` }}
                    className="bg-amber-500 h-full flex items-center justify-center"
                    title="Pedidos Futuros"
                  >
                    <span className="text-xs font-medium text-white px-1">Futuro</span>
                  </motion.div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, analiseProjecao.analiseRisco.margemSeguranca)}%` }}
                    className="bg-slate-600 h-full flex items-center justify-center"
                    title="Saldo Disponível"
                  >
                    <span className="text-xs font-medium text-slate-300 px-1">Saldo</span>
                  </motion.div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs justify-center">
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-emerald-500 rounded" /> Real ({((analiseProjecao.real.totalDespesas / obra.contrato.valorTotal) * 100).toFixed(1)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-amber-500 rounded" /> Futuro ({analiseProjecao.futuro.impactoPercentual.toFixed(1)}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-slate-600 rounded" /> Saldo ({Math.max(0, analiseProjecao.analiseRisco.margemSeguranca).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Lista de Pedidos Pré-Aprovados */}
            <div
              className="rounded-xl border backdrop-blur-md overflow-hidden p-5"
              style={{
                background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                borderColor: 'rgba(56,72,100,0.35)',
                boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Pedidos Pré-Aprovados (Despesas Futuras)
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full">
                    {resumoFuturos.quantidadePedidos} pedidos
                  </span>
                  <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
                    R$ {formatMoney(resumoFuturos.totalFuturo)} pendente
                  </span>
                </div>
              </div>

              {/* Tabela de Pedidos */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-700/50">
                      <th className="text-left py-3 px-2">Pedido</th>
                      <th className="text-left py-3 px-2">Fornecedor</th>
                      <th className="text-left py-3 px-2">Descrição</th>
                      <th className="text-center py-3 px-2">Previsão</th>
                      <th className="text-right py-3 px-2">Valor</th>
                      <th className="text-center py-3 px-2">Status</th>
                      <th className="text-center py-3 px-2">Setor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosFuturos.map((pedido, idx) => {
                      const statusColors = {
                        [STATUS_PEDIDO_FUTURO.AGUARDANDO_ENTREGA]: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Aguardando' },
                        [STATUS_PEDIDO_FUTURO.EM_PRODUCAO]: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Em Produção' },
                        [STATUS_PEDIDO_FUTURO.PARCIAL_ENTREGUE]: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Parcial' },
                        [STATUS_PEDIDO_FUTURO.ENTREGUE]: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Entregue' },
                        [STATUS_PEDIDO_FUTURO.CANCELADO]: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelado' }
                      };
                      const statusStyle = statusColors[pedido.status] || statusColors[STATUS_PEDIDO_FUTURO.AGUARDANDO_ENTREGA];

                      return (
                        <motion.tr
                          key={pedido.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-b border-slate-700/30 hover:bg-slate-700/20"
                        >
                          <td className="py-3 px-2">
                            <div>
                              <p className="text-cyan-400 font-medium text-sm">{pedido.numeroPedido}</p>
                              <p className="text-xs text-slate-500">{new Date(pedido.dataPedido).toLocaleDateString('pt-BR')}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-white text-sm">{pedido.fornecedor}</td>
                          <td className="py-3 px-2">
                            <p className="text-slate-300 text-sm">{pedido.descricao}</p>
                            {pedido.pesoKg && (
                              <p className="text-xs text-slate-500">{(pedido.pesoKg / 1000).toFixed(2)} ton</p>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center text-slate-400 text-sm">
                            {new Date(pedido.dataPrevisaoEntrega).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <p className="text-amber-400 font-bold">
                              R$ {(pedido.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            {pedido.precoKg && (
                              <p className="text-xs text-slate-500">R$ {((pedido.precoKg || 0).toFixed(2))}/kg</p>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-1 text-xs rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                              {statusStyle.label}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="px-2 py-1 text-xs rounded-full bg-cyan-500/20 text-cyan-400">
                              {pedido.setor}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Rodapé com Totais */}
              <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400">Material</p>
                  <p className="text-lg font-bold text-white">R$ {formatMoney(resumoFuturos.totalMaterial)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-slate-400">Serviços</p>
                  <p className="text-lg font-bold text-white">R$ {formatMoney(resumoFuturos.totalServico)}</p>
                </div>
                <div className="bg-amber-900/30 rounded-lg p-3 text-center border border-amber-500/30">
                  <p className="text-xs text-amber-300">Total Futuro</p>
                  <p className="text-lg font-bold text-amber-400">R$ {formatMoney(resumoFuturos.totalFuturo)}</p>
                </div>
                <div className={`rounded-lg p-3 text-center border ${analiseProjecao.projecao.alertaSaldo ? 'bg-red-900/30 border-red-500/30' : 'bg-emerald-900/30 border-emerald-500/30'}`}>
                  <p className={`text-xs ${analiseProjecao.projecao.alertaSaldo ? 'text-red-300' : 'text-emerald-300'}`}>Saldo Projetado</p>
                  <p className={`text-lg font-bold ${analiseProjecao.projecao.alertaSaldo ? 'text-red-400' : 'text-emerald-400'}`}>
                    R$ {formatMoney(analiseProjecao.projecao.saldoDisponivel)}
                  </p>
                </div>
              </div>
            </div>

            {/* Nota Explicativa */}
            <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-500/30">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h4 className="text-blue-300 font-medium mb-1">Como funciona a análise Futuro vs Real?</h4>
                  <p className="text-sm text-slate-400">
                    <strong className="text-emerald-400">Despesas Reais:</strong> São lançamentos já efetivados com entrada de nota fiscal e impactam o saldo da obra automaticamente.
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    <strong className="text-amber-400">Pedidos Pré-Aprovados:</strong> São compromissos futuros que <u>NÃO impactam</u> o saldo real da obra. Servem apenas para projeção e planejamento.
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    <strong className="text-cyan-400">Projeção:</strong> Soma de Real + Futuro para análise de viabilidade e risco financeiro.
                  </p>
                </div>
              </div>
            </div>
          </Tabs.Content>

          {/* Tab: Pedido x Entrega (Estoque) */}
          <Tabs.Content value="estoque" className="space-y-4">
            {/* KPIs de Material */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard
                icon={Package}
                label="Valor Total Pedido"
                value={`R$ ${formatMoney(resumoMateriais.valorTotalPedido || 0)}`}
                subvalue={`${(resumoMateriais.pesoTotalPedido || 0).toLocaleString('pt-BR')} kg`}
                color="cyan"
              />
              <KPICard
                icon={Truck}
                label="Valor Entregue"
                value={`R$ ${formatMoney(resumoMateriais.valorTotalEntregue || 0)}`}
                subvalue={`${(resumoMateriais.pesoTotalEntregue || 0).toLocaleString('pt-BR')} kg`}
                color="emerald"
              />
              <KPICard
                icon={(resumoMateriais.valorFaltaEntregar || 0) < 0 ? CheckCircle2 : AlertTriangle}
                label={(resumoMateriais.valorFaltaEntregar || 0) < 0 ? "Excesso Entregue" : "Falta Entregar"}
                value={`R$ ${formatMoney(Math.abs(resumoMateriais.valorFaltaEntregar || 0))}`}
                subvalue={`${Math.abs(resumoMateriais.pesoFaltaEntregar || 0).toLocaleString('pt-BR')} kg`}
                color={(resumoMateriais.valorFaltaEntregar || 0) < 0 ? "emerald" : "amber"}
                highlight={(resumoMateriais.pesoFaltaEntregar || 0) > 0}
              />
              <KPICard
                icon={Layers}
                label="Estoque Disponível"
                value={`${(resumoMateriais.pesoEmEstoque || 0).toLocaleString('pt-BR')} kg`}
                subvalue="Pronto p/ produção"
                color="purple"
              />
              <KPICard
                icon={CheckCircle2}
                label="Itens Entregues"
                value={`${resumoMateriais.itensEntregues || 0}/${resumoMateriais.totalItens || 0}`}
                subvalue={`${((((resumoMateriais.itensEntregues || 0) / (resumoMateriais.totalItens || 1)) * 100) || 0).toFixed(0)}% completo`}
                color="green"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Gráfico Estoque por Tipo */}
              <div
                className="rounded-xl border backdrop-blur-md overflow-hidden p-5"
                style={{
                  background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                  borderColor: 'rgba(56,72,100,0.35)',
                  boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)',
                }}
              >
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <PieChartIcon className="w-5 h-5 text-cyan-400" />
                  Estoque por Tipo de Material
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={estoquePorTipo}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="pesoTotal"
                      nameKey="tipo"
                    >
                      {estoquePorTipo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,41,59,0.9))',
                        border: '1px solid rgba(100,116,139,0.3)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(10px)',
                      }}
                      formatter={(value) => [`${(value || 0).toLocaleString('pt-BR')} kg`, 'Peso']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {estoquePorTipo.map((item, idx) => (
                    <div key={item.tipo} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-xs text-slate-300 truncate">{item.tipoLabel}</span>
                      <span className="text-xs text-slate-400 ml-auto">{(item.pesoTotal || 0).toLocaleString('pt-BR')}kg</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lista de Materiais com Pendência */}
              <div className="lg:col-span-2 rounded-xl border backdrop-blur-md overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
              borderColor: 'rgba(56,72,100,0.35)',
              boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)',
            }}
            className=" p-5">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  Materiais com Entrega Pendente
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {materiais.filter(m => m.pesoFaltaEntregar > 0).length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                      <p>Todos os materiais foram entregues!</p>
                    </div>
                  ) : (
                    materiais.filter(m => m.pesoFaltaEntregar > 0).map((mat, idx) => (
                      <motion.div
                        key={mat.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="p-3 rounded-lg bg-amber-900/20 border border-amber-500/30"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-medium text-sm">{mat.codigo}</span>
                              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300">
                                {mat.tipo.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{mat.descricao}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-amber-400 font-bold">
                              -{(mat.pesoFaltaEntregar || 0).toLocaleString('pt-BR')} kg
                            </p>
                            <p className="text-xs text-slate-400">
                              R$ {(((mat.pesoFaltaEntregar || 0) * (mat.valorUnitario || 0)) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        {/* Barra de progresso */}
                        <div className="mt-2">
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${((mat.pesoEntregue || 0) / (mat.pesoPedido || 1)) * 100}%` }}
                              className="h-full bg-amber-500 rounded-full"
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>Entregue: {(mat.pesoEntregue || 0).toLocaleString('pt-BR')}kg</span>
                            <span>Pedido: {(mat.pesoPedido || 0).toLocaleString('pt-BR')}kg</span>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Tabela Completa de Materiais */}
            <div
              className="rounded-xl border backdrop-blur-md overflow-hidden p-5"
              style={{
                background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                borderColor: 'rgba(56,72,100,0.35)',
                boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-cyan-400" />
                  Controle Pedido x Entrega - Todos os Materiais
                </h3>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {materiais.filter(m => m.status === STATUS_MATERIAL.ENTREGUE).length} Entregues
                  </span>
                  <span className="px-3 py-1 text-xs rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {materiais.filter(m => m.status === STATUS_MATERIAL.PARCIAL).length} Parciais
                  </span>
                  <span className="px-3 py-1 text-xs rounded-full bg-slate-500/20 text-slate-400 border border-slate-500/30">
                    {materiais.filter(m => m.status === STATUS_MATERIAL.PEDIDO).length} Pendentes
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-700/50">
                      <th className="text-left py-3 px-3">Código / Descrição</th>
                      <th className="text-left py-3 px-2">Tipo</th>
                      <th className="text-right py-3 px-2">Pedido (kg)</th>
                      <th className="text-right py-3 px-2">Entregue (kg)</th>
                      <th className="text-right py-3 px-2">Falta (kg)</th>
                      <th className="text-right py-3 px-2">R$/kg</th>
                      <th className="text-right py-3 px-2">Valor Pedido</th>
                      <th className="text-right py-3 px-2">Valor Entregue</th>
                      <th className="text-center py-3 px-2">Estoque</th>
                      <th className="text-center py-3 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiais.map((mat, idx) => {
                      const statusColor = mat.status === STATUS_MATERIAL.ENTREGUE
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : mat.status === STATUS_MATERIAL.PARCIAL
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-slate-500/20 text-slate-400';
                      const statusLabel = mat.status === STATUS_MATERIAL.ENTREGUE
                        ? 'Entregue'
                        : mat.status === STATUS_MATERIAL.PARCIAL
                          ? 'Parcial'
                          : 'Pendente';
                      return (
                        <motion.tr
                          key={mat.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          className="border-b border-slate-700/30 hover:bg-slate-800/30"
                        >
                          <td className="py-3 px-3">
                            <div className="font-medium text-white text-sm">{mat.codigo}</div>
                            <div className="text-xs text-slate-400">{mat.descricao}</div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-0.5 text-[10px] rounded bg-cyan-500/20 text-cyan-300 uppercase">
                              {mat.tipo.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right text-slate-300 text-sm">
                            {(mat.pesoPedido || 0).toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-2 text-right text-emerald-400 text-sm">
                            {(mat.pesoEntregue || 0).toLocaleString('pt-BR')}
                          </td>
                          <td className={`py-3 px-2 text-right text-sm font-medium ${(mat.pesoFaltaEntregar || 0) > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                            {(mat.pesoFaltaEntregar || 0) > 0 ? `-${(mat.pesoFaltaEntregar || 0).toLocaleString('pt-BR')}` : '0'}
                          </td>
                          <td className="py-3 px-2 text-right text-slate-400 text-xs">
                            {((mat.valorUnitario || 0).toFixed(4))}
                          </td>
                          <td className="py-3 px-2 text-right text-slate-300 text-sm">
                            R$ {(mat.valorTotalPedido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-2 text-right text-emerald-400 text-sm">
                            R$ {(((mat.pesoEntregue || 0) * (mat.valorUnitario || 0)) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-1 text-xs rounded ${(mat.disponivelEstoque || 0) > 0 ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-600/20 text-slate-500'}`}>
                              {(mat.disponivelEstoque || 0).toLocaleString('pt-BR')} kg
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className={`px-2 py-1 text-xs rounded ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-600 font-semibold">
                      <td colSpan="2" className="py-3 px-3 text-white">TOTAL ({materiais.length} itens)</td>
                      <td className="py-3 px-2 text-right text-cyan-400">
                        {(resumoMateriais.pesoTotalPedido || 0).toLocaleString('pt-BR')} kg
                      </td>
                      <td className="py-3 px-2 text-right text-emerald-400">
                        {(resumoMateriais.pesoTotalEntregue || 0).toLocaleString('pt-BR')} kg
                      </td>
                      <td className="py-3 px-2 text-right text-amber-400">
                        {(resumoMateriais.pesoFaltaEntregar || 0) > 0 ? `-${(resumoMateriais.pesoFaltaEntregar || 0).toLocaleString('pt-BR')}` : '0'} kg
                      </td>
                      <td className="py-3 px-2 text-right text-slate-400">-</td>
                      <td className="py-3 px-2 text-right text-cyan-400">
                        R$ {(resumoMateriais.valorTotalPedido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-2 text-right text-emerald-400">
                        R$ {(resumoMateriais.valorTotalEntregue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-2 text-center text-purple-400">
                        {(resumoMateriais.pesoEmEstoque || 0).toLocaleString('pt-BR')} kg
                      </td>
                      <td className="py-3 px-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Nota Explicativa */}
            <div className="bg-cyan-900/20 rounded-xl p-4 border border-cyan-500/30">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-cyan-400 mt-0.5" />
                <div>
                  <h4 className="text-cyan-300 font-medium mb-1">Controle Pedido x Entrega</h4>
                  <p className="text-sm text-slate-400">
                    <strong className="text-cyan-400">Pedido:</strong> Total de material solicitado ao fornecedor com valor e peso previsto.
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    <strong className="text-emerald-400">Entregue:</strong> Material já recebido com nota fiscal e disponível no estoque da obra.
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    <strong className="text-amber-400">Falta Entregar:</strong> Saldo pendente que o fornecedor ainda deve entregar para completar o pedido.
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    <strong className="text-purple-400">Estoque Disponível:</strong> Material em estoque pronto para baixa na produção. Automaticamente vinculado ao módulo de estoque.
                  </p>
                </div>
              </div>
            </div>
          </Tabs.Content>

          {/* Tab: Medições */}
          <Tabs.Content value="medicoes" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Lista de Medições */}
              <div className="lg:col-span-2 rounded-xl border backdrop-blur-md overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
              borderColor: 'rgba(56,72,100,0.35)',
              boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)',
            }}
            className=" p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Medições Realizadas</h3>
                  <button
                    onClick={() => setShowNovaMedicao(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400
                             rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Medição
                  </button>
                </div>

                <div className="space-y-3">
                  {medicoes.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">Nenhuma medição registrada</p>
                      <p className="text-xs mt-1">Clique em "Nova Medição" para adicionar</p>
                    </div>
                  )}
                  {medicoes.map((med, idx) => {
                    const statusConfig = MEDICAO_STATUS_COLORS[med.status];
                    const StatusIcon = statusConfig?.icon || Clock;
                    return (
                      <motion.div
                        key={med.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`p-4 rounded-xl border ${statusConfig?.bg || 'bg-slate-800/50'} border-slate-700/50`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 ${statusConfig?.bg} rounded-lg`}>
                              <StatusIcon className={`w-5 h-5 ${statusConfig?.text}`} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">Medição #{med.numero}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${statusConfig?.bg} ${statusConfig?.text}`}>
                                  {med.etapa === ETAPA_MEDICAO.FABRICACAO ? 'Fabricação' : med.isAvulsa ? 'Avulsa' : 'Montagem'}
                                </span>
                              </div>
                              <p className="text-sm text-slate-400">
                                {med.setor} {med.pesoMedido ? `• ${(med.pesoMedido / 1000).toFixed(2)} ton` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="text-right">
                              <p className="text-lg font-bold text-white">
                                R$ {(med.valorBruto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                              <p className="text-xs text-slate-400">
                                Líquido: R$ {(med.valorLiquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => abrirEdicaoMedicao(med)}
                                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                                title="Editar medição"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Excluir Medição #${med.numero}?`)) {
                                    excluirMedicao(med.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                title="Excluir medição"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Detalhamento */}
                        {med.detalhamento && Object.keys(med.detalhamento).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-5 gap-2">
                            {Object.entries(med.detalhamento).map(([etapa, dados]) => (
                              <div key={etapa} className="text-center">
                                <p className="text-xs text-slate-500 capitalize">{etapa}</p>
                                <p className="text-sm text-white">R$ {formatMoney(typeof dados === 'object' ? dados.valor : dados)}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Retenções */}
                        {med.retencoes && (med.retencoes.iss > 0 || med.retencoes.inss > 0 || med.retencoes.contratual > 0) && (
                          <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                            <span>ISS: R$ {((med.retencoes?.iss) || 0).toFixed(2)}</span>
                            <span>INSS: R$ {((med.retencoes?.inss) || 0).toFixed(2)}</span>
                            <span>Contratual: R$ {((med.retencoes?.contratual) || 0).toFixed(2)}</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Resumo de Medições */}
              <div className="space-y-4">
                {/* Valores Disponíveis */}
                <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-xl
                              rounded-xl border border-purple-500/30 p-5">
                  <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Valores Disponíveis para Medição
                  </h4>

                  <div className="space-y-3">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Fabricação (após EXPEDIDO)</p>
                      <p className="text-xl font-bold text-purple-400">
                        R$ {formatMoney(saldo.saldoAMedir * 0.65)}
                      </p>
                      <p className="text-xs text-slate-500">~65% do saldo</p>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400">Montagem (após MONTADO)</p>
                      <p className="text-xl font-bold text-emerald-400">
                        R$ {formatMoney(saldo.saldoAMedir * 0.35)}
                      </p>
                      <p className="text-xs text-slate-500">~35% do saldo</p>
                    </div>
                  </div>
                </div>

                {/* R$/kg por Etapa */}
                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                              rounded-xl border border-slate-700/50 p-5">
                  <h4 className="text-sm font-medium text-white mb-3">Valores por Kg</h4>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Corte</span>
                      <span className="text-white font-medium">R$ 2,50/kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Fabricação</span>
                      <span className="text-white font-medium">R$ 4,00/kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Solda</span>
                      <span className="text-white font-medium">R$ 3,00/kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Pintura</span>
                      <span className="text-white font-medium">R$ 1,80/kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-sm">Expedição</span>
                      <span className="text-white font-medium">R$ 0,50/kg</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700/50">
                      <span className="text-cyan-400 text-sm font-medium">Total Fabricação</span>
                      <span className="text-cyan-400 font-bold">R$ 11,80/kg</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-700/50">
                      <span className="text-emerald-400 text-sm font-medium">Total Montagem</span>
                      <span className="text-emerald-400 font-bold">R$ 6,40/kg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Tabs.Content>

          {/* Tab: Por Setor */}
          <Tabs.Content value="setores" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {obra.setores.map((setor, idx) => {
                const despesasSetor = lancamentos.filter(l => l.setor === setor.nome);
                const totalDespesasSetor = despesasSetor.reduce((s, l) => s + l.valor, 0);
                const medicoesSetor = medicoes.filter(m => m.setor === setor.nome);
                const totalMedidoSetor = medicoesSetor.reduce((s, m) => s + m.valorBruto, 0);
                const pesoMedidoSetor = medicoesSetor.reduce((s, m) => s + m.pesoMedido, 0);

                return (
                  <motion.div
                    key={setor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                              rounded-xl border border-slate-700/50 p-5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-600
                                      rounded-xl flex items-center justify-center text-white font-bold">
                          {setor.nome.slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{setor.nome}</h4>
                          <p className="text-xs text-slate-400">{(setor.peso / 1000).toFixed(2)} ton</p>
                        </div>
                      </div>
                    </div>

                    {/* Valores */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">Valor Contrato</span>
                        <span className="text-white font-medium">
                          R$ {formatMoney(setor.valor)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">Total Despesas</span>
                        <span className="text-red-400 font-medium">
                          R$ {formatMoney(totalDespesasSetor)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">Total Medido</span>
                        <span className="text-cyan-400 font-medium">
                          R$ {formatMoney(totalMedidoSetor)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-700/50">
                        <span className="text-slate-400 text-sm">Saldo Setor</span>
                        <span className={`font-bold ${setor.valor - totalMedidoSetor >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          R$ {formatMoney(setor.valor - totalMedidoSetor)}
                        </span>
                      </div>
                    </div>

                    {/* Progresso */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Peso Medido</span>
                        <span>{(pesoMedidoSetor || 0).toLocaleString()} / {(setor.peso || 0).toLocaleString()} kg</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${((pesoMedidoSetor || 0) / (setor.peso || 1)) * 100}%` }}
                          className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1 text-right">
                        {((((pesoMedidoSetor || 0) / (setor.peso || 1)) * 100) || 0).toFixed(1)}% medido
                      </p>
                    </div>

                    {/* R$/kg */}
                    <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-slate-400 text-sm">R$/kg Contrato</span>
                        <span className="text-white font-medium">R$ {((setor.precoKg || 0).toFixed(2))}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-slate-400 text-sm">R$/kg Realizado</span>
                        <span className={`font-medium ${((pesoMedidoSetor || 0) > 0 ? (totalDespesasSetor || 0) / (pesoMedidoSetor || 1) : 0) <= (setor.precoKg || 0) ? 'text-emerald-400' : 'text-red-400'}`}>
                          R$ {(pesoMedidoSetor || 0) > 0 ? (((totalDespesasSetor || 0) / (pesoMedidoSetor || 1)) || 0).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Tabs.Content>

          {/* Tab: Fluxo de Caixa */}
          <Tabs.Content value="fluxo" className="space-y-4">
            <div
              className="rounded-xl border backdrop-blur-md overflow-hidden p-5"
              style={{
                background: 'linear-gradient(145deg, rgba(12,20,38,0.75), rgba(8,15,30,0.65))',
                borderColor: 'rgba(56,72,100,0.35)',
                boxShadow: '0 4px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)',
              }}
            >
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-amber-400" />
                Fluxo de Caixa - Próximos 6 Meses
              </h3>

              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={fluxoCaixa}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mesLabel" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `R$ ${formatMoneyShort(v)}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(value, name) => [`R$ ${formatMoney(value)}`, name]}
                  />
                  <Bar dataKey="receitas" name="Receitas Previstas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas Previstas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="saldo" name="Saldo Projetado" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4' }} />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Tabela de Fluxo */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-700/50">
                      <th className="text-left py-2 px-3">Mês</th>
                      <th className="text-right py-2 px-3">Receitas</th>
                      <th className="text-right py-2 px-3">Despesas</th>
                      <th className="text-right py-2 px-3">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fluxoCaixa.map((mes, idx) => (
                      <tr key={idx} className="border-b border-slate-700/30">
                        <td className="py-2 px-3 text-white">{mes.mesLabel}</td>
                        <td className="py-2 px-3 text-right text-emerald-400">
                          R$ {formatMoney(mes.receitas)}
                        </td>
                        <td className="py-2 px-3 text-right text-red-400">
                          R$ {formatMoney(mes.despesas)}
                        </td>
                        <td className={`py-2 px-3 text-right font-medium ${mes.saldo >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                          R$ {formatMoney(mes.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>

          {/* Modal Importar NF */}
          <ImportarNFModal
            open={showImportNF}
            onOpenChange={setShowImportNF}
            moduloDestino="obra"
            obraId={obra.id}
            onImportar={async (lancamento) => {
              const lanc = { ...lancamento, id: 'lanc-' + Date.now() };
              setLancamentos(prev => [...prev, lanc]);
              try { await addLancamentoCtx(lanc); } catch (err) { console.error('Erro ao importar NF:', err); }
            }}
          />


      {/* Modal de Confirmação de Exclusão */}
      <Dialog.Root open={!!lancParaExcluir} onOpenChange={(open) => { if (!open) setLancParaExcluir(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 border border-gray-700 rounded-xl p-6 z-50 w-[400px]">
            <Dialog.Title className="text-lg font-semibold text-white mb-2">Confirmar Exclus\u00e3o</Dialog.Title>
            <Dialog.Description className="text-gray-400 mb-6">Tem certeza que deseja excluir este lan\u00e7amento? Esta a\u00e7\u00e3o n\u00e3o pode ser desfeita.</Dialog.Description>
            <div className="flex justify-end gap-3">
              <button onClick={() => setLancParaExcluir(null)} className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">Cancelar</button>
              <button onClick={confirmarExclusao} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors flex items-center gap-2"><Trash2 className="w-4 h-4" />Excluir</button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

        {/* Modal Novo / Editar Lançamento */}
        <Dialog.Root open={showNovoLancamento} onOpenChange={(open) => { setShowNovoLancamento(open); if (!open) setEditandoLancamento(null); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                                      w-full max-w-lg bg-slate-800 border border-slate-700
                                      rounded-2xl p-6 z-50 max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                {editandoLancamento ? <Edit className="w-5 h-5 text-cyan-400" /> : <Plus className="w-5 h-5 text-emerald-400" />}
                {editandoLancamento ? 'Editar Lançamento' : 'Novo Lançamento'}
              </Dialog.Title>

              <NovoLancamentoForm
                categorias={CATEGORIA_DESPESA}
                setores={obra.setores}
                lancamentoInicial={editandoLancamento}
                onSubmit={(dados) => {
                  if (editandoLancamento) {
                    editarLancamento({ id: editandoLancamento.id, ...dados });
                  } else {
                    adicionarLancamento(dados);
                  }
                }}
                onCancel={() => { setShowNovoLancamento(false); setEditandoLancamento(null); }}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Modal Importação CSV */}
        <Dialog.Root open={showImportacao} onOpenChange={setShowImportacao}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                                      w-full max-w-2xl bg-slate-800 border border-slate-700
                                      rounded-2xl p-6 z-50 max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-400" />
                Importar Lançamentos
              </Dialog.Title>

              {importData.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-emerald-300 font-medium text-sm">
                        {importData.length} lançamento{importData.length > 1 ? 's' : ''} encontrado{importData.length > 1 ? 's' : ''}
                      </p>
                      {importFile && <p className="text-xs text-slate-400">Arquivo: {importFile.name}</p>}
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-700/50">
                          <th className="text-left p-2.5 text-slate-400 font-medium">Data</th>
                          <th className="text-left p-2.5 text-slate-400 font-medium">Descrição</th>
                          <th className="text-left p-2.5 text-slate-400 font-medium">Fornecedor</th>
                          <th className="text-right p-2.5 text-slate-400 font-medium">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 10).map((item, idx) => (
                          <tr key={idx} className="border-t border-slate-700/50">
                            <td className="p-2.5 text-slate-300">{item.data}</td>
                            <td className="p-2.5 text-white truncate max-w-[200px]">{item.descricao}</td>
                            <td className="p-2.5 text-slate-300">{item.fornecedor || '-'}</td>
                            <td className="p-2.5 text-right font-medium text-white">R$ {(item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importData.length > 10 && (
                      <div className="p-2 text-center text-xs text-slate-500 bg-slate-700/30">
                        ... e mais {importData.length - 10} lançamentos
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Total a importar</p>
                    <p className="text-lg font-bold text-white">
                      R$ {importData.reduce((s, i) => s + i.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => { setShowImportacao(false); setImportData([]); setImportFile(null); }}
                      className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-xl
                               hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                    <button
                      onClick={confirmarImportacao}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600
                               text-white rounded-xl hover:from-emerald-600 hover:to-teal-700
                               transition-all font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Importar {importData.length}
                    </button>
                  </div>
                </div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Modal Nova/Editar Medição */}
        <Dialog.Root open={showNovaMedicao} onOpenChange={(open) => { setShowNovaMedicao(open); if (!open) setEditandoMedicao(null); }}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                                      w-full max-w-2xl z-50 max-h-[90vh] overflow-y-auto rounded-2xl border"
              style={{
                background: 'linear-gradient(145deg, rgba(12,20,38,0.98), rgba(8,15,30,0.95))',
                borderColor: 'rgba(139,92,246,0.3)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div className="p-6">
                <Dialog.Title className="text-xl font-bold text-white mb-5 flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: 'rgba(139,92,246,0.15)', boxShadow: '0 0 12px rgba(139,92,246,0.15)' }}>
                    <ClipboardList className="w-5 h-5 text-purple-400" />
                  </div>
                  {editandoMedicao ? 'Editar Medição' : 'Nova Medição Manual'}
                </Dialog.Title>

                <NovaMedicaoForm
                  setores={obra.setores}
                  valoresKg={obra.valoresKg}
                  contrato={obra.contrato}
                  editando={editandoMedicao}
                  onSubmit={editandoMedicao ? (dados) => editarMedicao({ id: editandoMedicao.id, ...dados }) : adicionarMedicao}
                  onCancel={() => { setShowNovaMedicao(false); setEditandoMedicao(null); }}
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}

// ==================== FORMULÁRIO NOVA MEDIÇÃO ====================
// Tipos de lançamento avulso (sem peso)
const TIPOS_MEDICAO_AVULSA = [
  { id: 'entrada_contrato', label: 'Entrada de Contrato', desc: 'Adiantamento / sinal do contrato', color: '#10B981', icon: '💰' },
  { id: 'chaparia', label: 'Chaparia / Corte', desc: 'Medição de chaparia ou corte avulso', color: '#F59E0B', icon: '🔩' },
  { id: 'adiantamento', label: 'Adiantamento', desc: 'Adiantamento parcial de valores', color: '#3B82F6', icon: '💵' },
  { id: 'retencao_final', label: 'Retenção Final de Obra', desc: 'Liberação da retenção contratual ao final', color: '#8B5CF6', icon: '🔓' },
  { id: 'ajuste', label: 'Ajuste / Aditivo', desc: 'Ajuste contratual ou aditivo de valor', color: '#06B6D4', icon: '📋' },
  { id: 'outros', label: 'Outros', desc: 'Lançamento avulso diverso', color: '#94A3B8', icon: '📌' },
];

function NovaMedicaoForm({ setores, valoresKg, contrato, onSubmit, onCancel, editando }) {
  const inputClass = "w-full px-3 py-2.5 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors";
  const labelClass = "text-sm text-slate-400 mb-1.5 block font-medium";
  const inputStyle = {
    background: 'linear-gradient(135deg, rgba(30,41,59,0.6), rgba(15,23,42,0.8))',
    border: '1px solid rgba(56,72,100,0.4)',
  };

  // Modo: 'peso' = medição por peso (fabricação/montagem) | 'avulsa' = valor direto
  const [modo, setModo] = useState(editando?.isAvulsa ? 'avulsa' : 'peso');

  const [formData, setFormData] = useState({
    numero: editando?.numero || '',
    setor: editando?.setor || setores[0]?.nome || '',
    etapa: editando?.etapa || ETAPA_MEDICAO.FABRICACAO,
    pesoMedido: editando?.pesoMedido || '',
    dataReferencia: editando?.dataReferencia || new Date().toISOString().split('T')[0],
    dataMedicao: editando?.dataMedicao || new Date().toISOString().split('T')[0],
    status: editando?.status || STATUS_MEDICAO.AGUARDANDO,
    observacao: editando?.observacao || '',
    // Campos avulsos
    tipoAvulso: editando?.isAvulsa ? (editando?.etapa || 'entrada_contrato') : 'entrada_contrato',
    descricaoAvulsa: editando?.descricao || '',
    valorBrutoManual: editando?.isAvulsa ? (editando?.valorBruto || '') : '',
    aplicarRetencoes: editando?.retencoes?.total > 0 || false,
    // Detalhamento por sub-etapa (modo peso)
    detCorte: '', detFabricacao: '', detSolda: '', detPintura: '', detExpedicao: '',
    detDescarga: '', detMontagem: '', detTorqueamento: '', detAcabamento: '',
  });

  const pesoNum = parseFloat(formData.pesoMedido) || 0;
  const isFabricacao = formData.etapa === ETAPA_MEDICAO.FABRICACAO;
  const valorBrutoManual = parseFloat(formData.valorBrutoManual) || 0;

  // Calcular valores — modo peso
  const valoresCalculados = useMemo(() => {
    if (modo === 'avulsa') {
      // Modo avulso: retenções opcionais
      if (valorBrutoManual <= 0) return { detalhamento: {}, bruto: 0, liquido: 0, retencoes: {} };
      if (formData.aplicarRetencoes) {
        const retISS = valorBrutoManual * (contrato?.retencaoISS || 0.02);
        const retINSS = valorBrutoManual * (contrato?.retencaoINSS || 0.035);
        const retContratual = valorBrutoManual * (contrato?.retencaoContratual || 0.05);
        return {
          detalhamento: {},
          bruto: valorBrutoManual,
          liquido: valorBrutoManual - retISS - retINSS - retContratual,
          retencoes: { iss: retISS, inss: retINSS, contratual: retContratual, total: retISS + retINSS + retContratual },
        };
      }
      return { detalhamento: {}, bruto: valorBrutoManual, liquido: valorBrutoManual, retencoes: { iss: 0, inss: 0, contratual: 0, total: 0 } };
    }

    // Modo peso
    if (!valoresKg || pesoNum <= 0) return { detalhamento: {}, bruto: 0, liquido: 0, retencoes: {} };

    let detalhamento = {};
    if (isFabricacao) {
      const vk = valoresKg.fabricacao || {};
      detalhamento = {
        corte: { peso: pesoNum, valorKg: vk.corte || 2.50, valor: pesoNum * (vk.corte || 2.50) },
        fabricacao: { peso: pesoNum, valorKg: vk.fabricacao || 4.00, valor: pesoNum * (vk.fabricacao || 4.00) },
        solda: { peso: pesoNum, valorKg: vk.solda || 3.00, valor: pesoNum * (vk.solda || 3.00) },
        pintura: { peso: pesoNum, valorKg: vk.pintura || 1.80, valor: pesoNum * (vk.pintura || 1.80) },
        expedicao: { peso: pesoNum, valorKg: vk.expedicao || 0.50, valor: pesoNum * (vk.expedicao || 0.50) },
      };
    } else {
      const vk = valoresKg.montagem || {};
      detalhamento = {
        descarga: { peso: pesoNum, valorKg: vk.descarga || 0.50, valor: pesoNum * (vk.descarga || 0.50) },
        montagem: { peso: pesoNum, valorKg: vk.montagem || 4.50, valor: pesoNum * (vk.montagem || 4.50) },
        torqueamento: { peso: pesoNum, valorKg: vk.torqueamento || 0.80, valor: pesoNum * (vk.torqueamento || 0.80) },
        acabamento: { peso: pesoNum, valorKg: vk.acabamento || 0.60, valor: pesoNum * (vk.acabamento || 0.60) },
      };
    }

    Object.keys(detalhamento).forEach(key => {
      const manualKey = `det${key.charAt(0).toUpperCase() + key.slice(1)}`;
      const manualVal = parseFloat(formData[manualKey]);
      if (!isNaN(manualVal) && manualVal > 0) detalhamento[key].valor = manualVal;
    });

    const totalBruto = Object.values(detalhamento).reduce((s, d) => s + d.valor, 0);
    const retISS = totalBruto * (contrato?.retencaoISS || 0.02);
    const retINSS = totalBruto * (contrato?.retencaoINSS || 0.035);
    const retContratual = totalBruto * (contrato?.retencaoContratual || 0.05);

    return {
      detalhamento,
      bruto: totalBruto,
      liquido: totalBruto - retISS - retINSS - retContratual,
      retencoes: { iss: retISS, inss: retINSS, contratual: retContratual, total: retISS + retINSS + retContratual },
    };
  }, [modo, pesoNum, isFabricacao, valoresKg, contrato, formData, valorBrutoManual]);

  const isValid = modo === 'avulsa'
    ? (formData.numero && valorBrutoManual > 0)
    : (formData.numero && pesoNum > 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;

    const tipoAvulsoObj = TIPOS_MEDICAO_AVULSA.find(t => t.id === formData.tipoAvulso);

    if (modo === 'avulsa') {
      onSubmit({
        numero: parseInt(formData.numero) || Date.now(),
        setor: formData.setor || '-',
        etapa: formData.tipoAvulso,
        tipoLancamento: formData.tipoAvulso,
        tipoLabel: tipoAvulsoObj?.label || formData.tipoAvulso,
        descricao: formData.descricaoAvulsa || tipoAvulsoObj?.label || 'Lançamento avulso',
        pesoMedido: 0,
        dataReferencia: formData.dataReferencia,
        dataMedicao: formData.dataMedicao,
        status: formData.status,
        observacao: formData.observacao,
        valorBruto: valoresCalculados.bruto,
        valorLiquido: valoresCalculados.liquido,
        retencoes: valoresCalculados.retencoes,
        detalhamento: {},
        isAvulsa: true,
      });
    } else {
      onSubmit({
        numero: parseInt(formData.numero) || Date.now(),
        setor: formData.setor,
        etapa: formData.etapa,
        pesoMedido: pesoNum,
        dataReferencia: formData.dataReferencia,
        dataMedicao: formData.dataMedicao,
        status: formData.status,
        observacao: formData.observacao,
        valorBruto: valoresCalculados.bruto,
        valorLiquido: valoresCalculados.liquido,
        retencoes: valoresCalculados.retencoes,
        detalhamento: valoresCalculados.detalhamento,
      });
    }
  };

  const setField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Seletor de Modo */}
      <div className="flex gap-2 p-1 rounded-xl" style={{
        background: 'linear-gradient(135deg, rgba(12,20,38,0.6), rgba(15,25,48,0.4))',
        border: '1px solid rgba(56,72,100,0.25)',
      }}>
        {[
          { id: 'peso', label: 'Medição por Peso', icon: Weight, desc: 'Fabricação / Montagem' },
          { id: 'avulsa', label: 'Lançamento Avulso', icon: Receipt, desc: 'Entrada / Retenção / Outros' },
        ].map(m => (
          <button key={m.id} type="button" onClick={() => setModo(m.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              modo === m.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
            style={modo === m.id ? {
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.1))',
              border: '1px solid rgba(139,92,246,0.3)',
              boxShadow: '0 2px 10px rgba(139,92,246,0.1)',
            } : { border: '1px solid transparent' }}
          >
            <m.icon className="w-4 h-4" />
            <div className="text-left">
              <div className="text-xs font-semibold">{m.label}</div>
              <div className="text-[10px] text-slate-500">{m.desc}</div>
            </div>
          </button>
        ))}
      </div>

      {modo === 'avulsa' ? (
        <>
          {/* ===== MODO AVULSO ===== */}
          {/* Tipo de lançamento avulso */}
          <div>
            <label className={labelClass}>Tipo de Lançamento</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS_MEDICAO_AVULSA.map(tipo => (
                <button key={tipo.id} type="button" onClick={() => setField('tipoAvulso', tipo.id)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    formData.tipoAvulso === tipo.id ? 'border-opacity-50' : 'border-transparent'
                  }`}
                  style={{
                    background: formData.tipoAvulso === tipo.id
                      ? `linear-gradient(135deg, ${tipo.color}12, ${tipo.color}06)`
                      : 'rgba(30,41,59,0.4)',
                    borderColor: formData.tipoAvulso === tipo.id ? `${tipo.color}40` : 'rgba(56,72,100,0.2)',
                    boxShadow: formData.tipoAvulso === tipo.id ? `0 2px 8px ${tipo.color}10` : 'none',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{tipo.icon}</span>
                    <span className="text-xs font-semibold text-white">{tipo.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{tipo.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Nº + Descrição */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Nº Medição</label>
              <input type="number" value={formData.numero} onChange={e => setField('numero', e.target.value)}
                className={inputClass} style={inputStyle} placeholder="Ex: 1" required />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Descrição</label>
              <input type="text" value={formData.descricaoAvulsa} onChange={e => setField('descricaoAvulsa', e.target.value)}
                className={inputClass} style={inputStyle}
                placeholder={TIPOS_MEDICAO_AVULSA.find(t => t.id === formData.tipoAvulso)?.label || 'Descrição do lançamento'} />
            </div>
          </div>

          {/* Valor Bruto + Datas */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Valor Bruto (R$)</label>
              <input type="number" step="0.01" value={formData.valorBrutoManual}
                onChange={e => setField('valorBrutoManual', e.target.value)}
                className={inputClass} style={inputStyle} placeholder="Ex: 135000.00" required />
            </div>
            <div>
              <label className={labelClass}>Data Referência</label>
              <input type="date" value={formData.dataReferencia} onChange={e => setField('dataReferencia', e.target.value)}
                className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass}>Data Medição</label>
              <input type="date" value={formData.dataMedicao} onChange={e => setField('dataMedicao', e.target.value)}
                className={inputClass} style={inputStyle} />
            </div>
          </div>

          {/* Status + Retenções + Setor */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <select value={formData.status} onChange={e => setField('status', e.target.value)}
                className={inputClass} style={inputStyle}>
                {Object.entries(STATUS_MEDICAO).map(([key, value]) => (
                  <option key={key} value={value} style={{ background: '#1e293b' }}>{key.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Setor (opcional)</label>
              <select value={formData.setor} onChange={e => setField('setor', e.target.value)}
                className={inputClass} style={inputStyle}>
                <option value="" style={{ background: '#1e293b' }}>Nenhum</option>
                {setores.map(s => (
                  <option key={s.id} value={s.nome} style={{ background: '#1e293b' }}>{s.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={formData.aplicarRetencoes}
                  onChange={e => setField('aplicarRetencoes', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500/50" />
                <span className="text-xs text-slate-400">Aplicar retenções (ISS/INSS/Contr.)</span>
              </label>
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className={labelClass}>Observação</label>
            <input type="text" value={formData.observacao} onChange={e => setField('observacao', e.target.value)}
              className={inputClass} style={inputStyle} placeholder="Observação opcional" />
          </div>

          {/* Preview de valores */}
          {valorBrutoManual > 0 && (
            <div className="rounded-xl border p-4 space-y-3" style={{
              background: `linear-gradient(135deg, ${TIPOS_MEDICAO_AVULSA.find(t => t.id === formData.tipoAvulso)?.color || '#8B5CF6'}08, rgba(59,130,246,0.03))`,
              borderColor: `${TIPOS_MEDICAO_AVULSA.find(t => t.id === formData.tipoAvulso)?.color || '#8B5CF6'}20`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
            }}>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-300">Resumo do Lançamento</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-white">Valor Bruto</span>
                <span className="text-lg font-bold text-white">R$ {formatMoney(valoresCalculados.bruto)}</span>
              </div>
              {formData.aplicarRetencoes && valoresCalculados.retencoes.total > 0 && (
                <>
                  <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    <span>ISS: -R$ {formatMoney(valoresCalculados.retencoes.iss)}</span>
                    <span>INSS: -R$ {formatMoney(valoresCalculados.retencoes.inss)}</span>
                    <span>Contratual: -R$ {formatMoney(valoresCalculados.retencoes.contratual)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'rgba(56,72,100,0.3)' }}>
                    <span className="text-sm text-emerald-400 font-semibold">Valor Líquido</span>
                    <span className="text-lg font-bold text-emerald-400">R$ {formatMoney(valoresCalculados.liquido)}</span>
                  </div>
                </>
              )}
              {!formData.aplicarRetencoes && (
                <p className="text-[10px] text-slate-500">Sem retenções — valor líquido = valor bruto</p>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* ===== MODO POR PESO ===== */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Nº Medição</label>
              <input type="number" value={formData.numero} onChange={e => setField('numero', e.target.value)}
                className={inputClass} style={inputStyle} placeholder="Ex: 1" required />
            </div>
            <div>
              <label className={labelClass}>Setor</label>
              <select value={formData.setor} onChange={e => setField('setor', e.target.value)}
                className={inputClass} style={inputStyle}>
                {setores.map(s => (
                  <option key={s.id} value={s.nome} style={{ background: '#1e293b' }}>{s.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Etapa</label>
              <select value={formData.etapa} onChange={e => setField('etapa', e.target.value)}
                className={inputClass} style={inputStyle}>
                <option value={ETAPA_MEDICAO.FABRICACAO} style={{ background: '#1e293b' }}>Fabricação</option>
                <option value={ETAPA_MEDICAO.MONTAGEM} style={{ background: '#1e293b' }}>Montagem</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Peso Medido (kg)</label>
              <input type="number" step="0.01" value={formData.pesoMedido} onChange={e => setField('pesoMedido', e.target.value)}
                className={inputClass} style={inputStyle} placeholder="Ex: 15000" required />
              {pesoNum > 0 && <p className="text-[10px] text-slate-500 mt-1">{(pesoNum / 1000).toFixed(2)} ton</p>}
            </div>
            <div>
              <label className={labelClass}>Data Referência</label>
              <input type="date" value={formData.dataReferencia} onChange={e => setField('dataReferencia', e.target.value)}
                className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className={labelClass}>Data Medição</label>
              <input type="date" value={formData.dataMedicao} onChange={e => setField('dataMedicao', e.target.value)}
                className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <select value={formData.status} onChange={e => setField('status', e.target.value)}
                className={inputClass} style={inputStyle}>
                {Object.entries(STATUS_MEDICAO).map(([key, value]) => (
                  <option key={key} value={value} style={{ background: '#1e293b' }}>{key.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Observação</label>
              <input type="text" value={formData.observacao} onChange={e => setField('observacao', e.target.value)}
                className={inputClass} style={inputStyle} placeholder="Observação opcional" />
            </div>
          </div>

          {/* Preview peso */}
          {pesoNum > 0 && (
            <div className="rounded-xl border p-4 space-y-3" style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(59,130,246,0.04))',
              borderColor: 'rgba(139,92,246,0.2)',
              boxShadow: 'inset 0 1px 0 rgba(139,92,246,0.05)',
            }}>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-purple-300">Valores Calculados Automaticamente</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {Object.entries(valoresCalculados.detalhamento).map(([etapa, dados]) => (
                  <div key={etapa} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'rgba(56,72,100,0.2)' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span className="text-xs text-slate-400 capitalize">{etapa}</span>
                      <span className="text-[10px] text-slate-600">R$ {dados.valorKg?.toFixed(2)}/kg</span>
                    </div>
                    <span className="text-xs font-medium text-white">R$ {formatMoney(dados.valor)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 mt-2 border-t space-y-2" style={{ borderColor: 'rgba(56,72,100,0.3)' }}>
                <div className="flex justify-between">
                  <span className="text-sm text-white font-semibold">Valor Bruto</span>
                  <span className="text-lg font-bold text-white">R$ {formatMoney(valoresCalculados.bruto)}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  <span>ISS: -R$ {formatMoney(valoresCalculados.retencoes.iss)}</span>
                  <span>INSS: -R$ {formatMoney(valoresCalculados.retencoes.inss)}</span>
                  <span>Contratual: -R$ {formatMoney(valoresCalculados.retencoes.contratual)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t" style={{ borderColor: 'rgba(56,72,100,0.3)' }}>
                  <span className="text-sm text-emerald-400 font-semibold">Valor Líquido</span>
                  <span className="text-lg font-bold text-emerald-400">R$ {formatMoney(valoresCalculados.liquido)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Override manual */}
          <details className="group">
            <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5">
              <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
              Editar valores por sub-etapa manualmente (opcional)
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(isFabricacao ? ['Corte','Fabricacao','Solda','Pintura','Expedicao'] : ['Descarga','Montagem','Torqueamento','Acabamento']).map(etapa => (
                <div key={etapa}>
                  <label className="text-[11px] text-slate-500 mb-1 block">{etapa} (R$)</label>
                  <input type="number" step="0.01" value={formData[`det${etapa}`]}
                    onChange={e => setField(`det${etapa}`, e.target.value)}
                    className={inputClass} style={inputStyle}
                    placeholder={`Auto: R$ ${formatMoney(valoresCalculados.detalhamento[etapa.toLowerCase()]?.valor || 0)}`} />
                </div>
              ))}
            </div>
          </details>
        </>
      )}

      {/* Botões */}
      <div className="flex items-center gap-3 pt-3">
        <button type="button" onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl text-slate-300 transition-colors flex items-center justify-center gap-2"
          style={{ background: 'rgba(51,65,85,0.4)', border: '1px solid rgba(56,72,100,0.3)' }}>
          <X className="w-4 h-4" /> Cancelar
        </button>
        <button type="submit" disabled={!isValid}
          className="flex-1 px-4 py-2.5 rounded-xl text-white font-medium transition-all
                   flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
            boxShadow: isValid ? '0 4px 15px rgba(139,92,246,0.3)' : 'none',
          }}>
          <Save className="w-4 h-4" /> Criar Medição
        </button>
      </div>
    </form>
  );
}

// Componente de Formulário de Novo/Editar Lançamento
function NovoLancamentoForm({ categorias, setores, lancamentoInicial, onSubmit, onCancel }) {
  const inputClass = "w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm";
  const labelClass = "text-sm text-slate-400 mb-1 block";

  const [formData, setFormData] = useState({
    tipo: lancamentoInicial?.tipo || TIPO_LANCAMENTO.DESPESA,
    categoria: lancamentoInicial?.categoria || CATEGORIA_DESPESA.MATERIAL_ESTRUTURA,
    descricao: lancamentoInicial?.descricao || '',
    fornecedor: lancamentoInicial?.fornecedor || '',
    notaFiscal: lancamentoInicial?.notaFiscal || lancamentoInicial?.nf || '',
    dataEmissao: lancamentoInicial?.dataEmissao || lancamentoInicial?.data || new Date().toISOString().split('T')[0],
    dataVencimento: lancamentoInicial?.dataVencimento || '',
    valor: lancamentoInicial?.valor || 0,
    setor: lancamentoInicial?.setor || '',
    status: lancamentoInicial?.status || STATUS_LANCAMENTO.PENDENTE,
    observacao: lancamentoInicial?.observacao || '',
    formaPagto: lancamentoInicial?.formaPagto || '',
    pesoKg: lancamentoInicial?.pesoKg || lancamentoInicial?.peso_kg || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.descricao || !formData.valor) return;
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo + Categoria */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Tipo</label>
          <Select.Root value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
            <Select.Trigger className="w-full flex items-center justify-between px-3 py-2
                                     bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm">
              <Select.Value />
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-[60]">
                <Select.Viewport>
                  {Object.entries(TIPO_LANCAMENTO).map(([key, value]) => (
                    <Select.Item key={key} value={value} className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm">
                      <Select.ItemText>{key.split('_').join(' ')}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        <div>
          <label className={labelClass}>Categoria</label>
          <Select.Root value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
            <Select.Trigger className="w-full flex items-center justify-between px-3 py-2
                                     bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm">
              <Select.Value />
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-[60] max-h-60">
                <Select.Viewport>
                  {Object.entries(CATEGORIA_LABELS).map(([key, label]) => (
                    <Select.Item key={key} value={key} className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm">
                      <Select.ItemText>{label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>

      {/* Descrição */}
      <div>
        <label className={labelClass}>Descrição *</label>
        <input type="text" value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} required className={inputClass} placeholder="Ex: Chapas A36 Lote 2" />
      </div>

      {/* Fornecedor + NF */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Fornecedor</label>
          <input type="text" value={formData.fornecedor} onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })} className={inputClass} placeholder="Nome do fornecedor" />
        </div>
        <div>
          <label className={labelClass}>Nota Fiscal</label>
          <input type="text" value={formData.notaFiscal} onChange={(e) => setFormData({ ...formData, notaFiscal: e.target.value })} className={inputClass} placeholder="Nº NF" />
        </div>
      </div>

      {/* Data Emissão + Vencimento */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Data Emissão</label>
          <input type="date" value={formData.dataEmissao} onChange={(e) => setFormData({ ...formData, dataEmissao: e.target.value })} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Data Vencimento</label>
          <input type="date" value={formData.dataVencimento} onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })} className={inputClass} />
        </div>
      </div>

      {/* Valor + Peso */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Valor (R$) *</label>
          <input type="number" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })} required step="0.01" className={inputClass} placeholder="0,00" />
        </div>
        <div>
          <label className={labelClass}>Peso (kg)</label>
          <input type="number" value={formData.pesoKg} onChange={(e) => setFormData({ ...formData, pesoKg: parseFloat(e.target.value) || '' })} step="0.01" className={inputClass} placeholder="0,00" />
        </div>
      </div>

      {/* Setor + Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Setor</label>
          <Select.Root value={formData.setor} onValueChange={(v) => setFormData({ ...formData, setor: v })}>
            <Select.Trigger className="w-full flex items-center justify-between px-3 py-2
                                     bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm">
              <Select.Value placeholder="Selecione" />
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-[60]">
                <Select.Viewport>
                  {setores.map((setor) => (
                    <Select.Item key={setor.id} value={setor.nome} className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm">
                      <Select.ItemText>{setor.nome}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        <div>
          <label className={labelClass}>Status</label>
          <Select.Root value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <Select.Trigger className="w-full flex items-center justify-between px-3 py-2
                                     bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm">
              <Select.Value />
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-[60]">
                <Select.Viewport>
                  {Object.entries(STATUS_LANCAMENTO).map(([key, value]) => (
                    <Select.Item key={key} value={value} className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm">
                      <Select.ItemText>{key.charAt(0) + key.slice(1).toLowerCase()}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>

      {/* Forma de Pagamento */}
      <div>
        <label className={labelClass}>Forma de Pagamento</label>
        <Select.Root value={formData.formaPagto || 'nenhuma'} onValueChange={(v) => setFormData({ ...formData, formaPagto: v === 'nenhuma' ? '' : v })}>
          <Select.Trigger className="w-full flex items-center justify-between px-3 py-2
                                   bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm">
            <Select.Value placeholder="Selecione" />
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-[60]">
              <Select.Viewport>
                <Select.Item value="nenhuma" className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm"><Select.ItemText>Selecione</Select.ItemText></Select.Item>
                <Select.Item value="boleto" className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm"><Select.ItemText>Boleto</Select.ItemText></Select.Item>
                <Select.Item value="pix" className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm"><Select.ItemText>PIX</Select.ItemText></Select.Item>
                <Select.Item value="transferencia" className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm"><Select.ItemText>Transferência</Select.ItemText></Select.Item>
                <Select.Item value="cartao" className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm"><Select.ItemText>Cartão</Select.ItemText></Select.Item>
                <Select.Item value="dinheiro" className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm"><Select.ItemText>Dinheiro</Select.ItemText></Select.Item>
                <Select.Item value="cheque" className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm"><Select.ItemText>Cheque</Select.ItemText></Select.Item>
                <Select.Item value="faturado" className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm"><Select.ItemText>Faturado Direto</Select.ItemText></Select.Item>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      {/* Observação */}
      <div>
        <label className={labelClass}>Observação</label>
        <textarea
          value={formData.observacao}
          onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
          rows={2}
          className={`${inputClass} resize-none`}
          placeholder="Observações adicionais..."
        />
      </div>

      {/* Botões */}
      <div className="flex items-center gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-xl
                   hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" /> Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600
                   text-white rounded-xl hover:from-emerald-600 hover:to-teal-700
                   transition-all font-medium flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" /> {lancamentoInicial ? 'Salvar Alterações' : 'Adicionar'}
        </button>
      </div>
    </form>
  );
}
