// MONTEX ERP Premium - Painel Financeiro GLOBAL (ISOLADO)
//
// Módulo de análise financeira independente. Espelha receitas/despesas/medições
// do sistema (atualização em tempo real) + adiciona camada local isolada:
//   - Lançamentos próprios
//   - Overrides sobre items externos
//   - Itens ocultados
//   - Metas configuráveis (receita mínima, fabricação kg, montagem kg, despesa-teto)
//   - Centro de Alertas inteligente (vencimentos 2d/7d + detecção de cheques + score por valor)
//
// Chaves localStorage isoladas:
//   - montex_global_movs       — lançamentos próprios
//   - montex_global_overrides  — edições locais sobre items externos
//   - montex_global_hidden     — items ocultos localmente
//   - montex_global_metas      — configuração de metas
//   - montex_global_alert_read — IDs de alertas marcados como lidos

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Wallet, Receipt,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, BarChart3, Search, Edit,
  FileText, CheckCircle2, Clock, Trash2, Calendar, Building2,
  AlertTriangle, Shield, Lock, RotateCcw, Bell, Target, Flag,
  Activity, Layers, Settings, Eye, AlertCircle, ChevronUp, ChevronDown,
  Factory, HardHat, Zap, FileCheck, TrendingUp as TrendUp,
  Download, FileSpreadsheet, Heart, Sparkles, FlaskConical, Sliders,
  Gauge, Minus, Percent,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  Legend, ComposedChart, ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';
import { useLancamentos, useMedicoes, useObras } from '../contexts/ERPContext';
import { exportToExcel } from '../utils/exportUtils';
import jsPDF from 'jspdf';

// ============================================================
// CHAVES ISOLADAS
// ============================================================
const GLOBAL_MOVS_KEY       = 'montex_global_movs';
const GLOBAL_OVERRIDES_KEY  = 'montex_global_overrides';
const GLOBAL_HIDDEN_KEY     = 'montex_global_hidden';
const GLOBAL_METAS_KEY      = 'montex_global_metas';
const GLOBAL_ALERT_READ_KEY = 'montex_global_alert_read';

// Chaves do sistema principal (somente LEITURA aqui)
const RECEITAS_STORAGE_KEY   = 'montex_receitas_gerais';
const RECEITAS_OVERRIDES_KEY = 'montex_receitas_overrides';

// ============================================================
// METAS PADRÃO (configuráveis pelo usuário)
// ============================================================
const DEFAULT_METAS = {
  // Fabricação: 60 ton × R$ 5,50/kg = R$ 330.000
  fabricacaoKg: 60000,
  fabricacaoPrecoKg: 5.50,
  // Montagem: 25 ton × R$ 3,00/kg = R$ 75.000
  montagemKg: 25000,
  montagemPrecoKg: 3.00,
  // Receita mínima mensal = fab + mont = R$ 405.000
  receitaMinimaMensal: 405000,
  // Despesa-teto mensal
  despesaTetoMensal: 350000,
  // Margem operacional mínima
  margemMinima: 25,
  // Janelas de alerta de vencimento
  alertaCriticoDias: 2,
  alertaAtencaoDias: 7,
  // Threshold de "valor alto" para priorizar alertas (R$)
  thresholdValorAlto: 10000,
  // Saldo mínimo de caixa projetado
  saldoMinimo: 50000,
  // Taxa máxima anualizada aceitável para operações financeiras (% a.a.)
  // Acima disso, marca como "operação cara"
  taxaAnualizadaMaxima: 50,
};

// ============================================================
// HELPERS
// ============================================================
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 0
}).format(value || 0);

// 🔧 FIX TIMEZONE: new Date('YYYY-MM-DD') é interpretado como UTC midnight
// → vira 21:00 do dia anterior no fuso BRT (UTC-3). Aqui parseamos manualmente
// como data LOCAL (ano, mês, dia) para evitar o deslocamento.
const parseLocalDate = (dataStr) => {
  if (!dataStr) return null;
  if (dataStr instanceof Date) return dataStr;
  const s = String(dataStr);
  // Formato YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss → extrai e cria como local
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  }
  return new Date(s);
};

const formatDate = (date) => {
  if (!date || date === '-') return '-';
  try {
    const d = parseLocalDate(date);
    if (!d || isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR');
  } catch { return '-'; }
};

const diasAteVencimento = (dataStr) => {
  if (!dataStr || dataStr === '-') return null;
  try {
    const venc = parseLocalDate(dataStr);
    if (!venc || isNaN(venc.getTime())) return null;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    venc.setHours(0,0,0,0);
    return Math.round((venc - hoje) / (1000 * 60 * 60 * 24));
  } catch { return null; }
};

// Detecta se uma movimentação é/refere-se a cheque
const ehCheque = (mov) => {
  const txt = `${mov.formaPagto || ''} ${mov.descricao || ''} ${mov.categoria || ''} ${mov.fornecedor || ''}`.toLowerCase();
  return /\bcheque\b|\bch[ \-]?\d+\b|\bch\.\s?\d+/i.test(txt) || (mov.formaPagto || '').toLowerCase().includes('cheque');
};

const ETAPA_LABELS = { fabricacao: 'Fabricação', montagem: 'Montagem' };

const CORES_CATEGORIAS = {
  'Matéria Prima': '#10b981',
  'Mão de Obra': '#3b82f6',
  'Energia/Utilidades': '#f59e0b',
  'Manutenção': '#8b5cf6',
  'Transporte': '#ec4899',
  'Administrativo': '#06b6d4',
  'Impostos': '#ef4444',
  'Medição': '#10b981',
  'Adiantamento': '#3b82f6',
  'Serviço Avulso': '#ec4899',
  'Material Faturado': '#06b6d4',
  'Outros': '#64748b',
  // ===== DESPESAS EXTRAS / FINANCEIRAS =====
  'Juros de Cheque': '#dc2626',
  'Juros de Atraso': '#b91c1c',
  'Cheque Especial': '#991b1b',
  'Empréstimo': '#7c2d12',
  'Financiamento': '#9a3412',
  'Renegociação': '#c2410c',
  'IOF/Taxas Bancárias': '#dc2626',
  'Desconto de Cheques': '#ea580c',
  // ===== RECEITAS DE OPERAÇÃO =====
  'Cheque Trocado (face)': '#0891b2',
  'Cheque Trocado (Líquido)': '#0e7490',
};

// Categorias consideradas "DESPESA EXTRA / FINANCEIRA" para análise dedicada
const CATEGORIAS_FINANCEIRAS = [
  'Juros de Cheque','Juros de Atraso','Cheque Especial',
  'Empréstimo','Financiamento','Renegociação',
  'IOF/Taxas Bancárias','Desconto de Cheques',
];

const lerLS = (key, defaultVal) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : defaultVal; }
  catch { return defaultVal; }
};
const salvarLS = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ============================================================
// SUB-COMPONENTES
// ============================================================

function KPISimple({ icon: Icon, label, value, sub, color = 'emerald', size = 'md' }) {
  const colors = {
    emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    red: { bg: 'bg-red-500/20', text: 'text-red-400' },
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
    rose: { bg: 'bg-rose-500/20', text: 'text-rose-400' },
    cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
    violet: { bg: 'bg-violet-500/20', text: 'text-violet-400' },
  };
  const c = colors[color] || colors.emerald;
  return (
    <Card className="bg-slate-900/60 border-slate-700/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", c.bg)}>
            <Icon className={cn("h-5 w-5", c.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-400">{label}</p>
            <p className={cn("font-bold truncate", size === 'sm' ? "text-lg" : "text-xl", c.text)}>{value}</p>
            {sub && <p className="text-xs text-slate-500 truncate">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MetaBar({ label, real, meta, format = formatCurrency, isNegativeBom = false }) {
  const pct = meta > 0 ? Math.min(150, (real / meta) * 100) : 0;
  const sucesso = isNegativeBom ? pct <= 100 : pct >= 80;
  const cor = sucesso ? 'from-emerald-500 to-green-500'
            : pct >= (isNegativeBom ? 70 : 50) ? 'from-amber-500 to-orange-500'
            : 'from-red-500 to-rose-500';
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={cn("text-xs font-semibold", sucesso ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400')}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full bg-gradient-to-r transition-all", cor)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-slate-500">Real: {format(real)}</span>
        <span className="text-[10px] text-slate-500">Meta: {format(meta)}</span>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function PainelFinanceiroGlobal() {
  const { lancamentosDespesas } = useLancamentos();
  const { medicoes: todasMedicoes } = useMedicoes();
  const { obras } = useObras();

  // ===== ESTADO LOCAL ISOLADO =====
  const [movsLocais, setMovsLocais] = useState(() => lerLS(GLOBAL_MOVS_KEY, []));
  const [overridesLocais, setOverridesLocais] = useState(() => lerLS(GLOBAL_OVERRIDES_KEY, {}));
  const [hiddenLocais, setHiddenLocais] = useState(() => lerLS(GLOBAL_HIDDEN_KEY, []));
  const [metas, setMetas] = useState(() => ({ ...DEFAULT_METAS, ...lerLS(GLOBAL_METAS_KEY, {}) }));
  const [alertasLidos, setAlertasLidos] = useState(() => lerLS(GLOBAL_ALERT_READ_KEY, []));

  useEffect(() => salvarLS(GLOBAL_MOVS_KEY, movsLocais), [movsLocais]);
  useEffect(() => salvarLS(GLOBAL_OVERRIDES_KEY, overridesLocais), [overridesLocais]);
  useEffect(() => salvarLS(GLOBAL_HIDDEN_KEY, hiddenLocais), [hiddenLocais]);
  useEffect(() => salvarLS(GLOBAL_METAS_KEY, metas), [metas]);
  useEffect(() => salvarLS(GLOBAL_ALERT_READ_KEY, alertasLidos), [alertasLidos]);

  // ===== UI STATE =====
  const [activeTab, setActiveTab] = useState('visao');
  const [filtroPeriodo, setFiltroPeriodo] = useState('geral');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroObra, setFiltroObra] = useState('geral');
  const [filtroMes, setFiltroMes] = useState('todos');         // YYYY-MM ou 'todos'
  const [filtroStatusTab, setFiltroStatusTab] = useState('todos'); // todos | pendente | atrasado | pago
  const [ordenarPor, setOrdenarPor] = useState('vencimento');  // vencimento | data | valor
  const [searchTerm, setSearchTerm] = useState('');
  const [selecionadosIds, setSelecionadosIds] = useState([]);  // IDs selecionados na tabela

  // Reset seleção quando filtros mudam (evita IDs órfãos no totalizador)
  useEffect(() => {
    setSelecionadosIds([]);
  }, [filtroTipo, filtroMes, filtroStatusTab, filtroObra, filtroPeriodo, searchTerm]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [metasDialogOpen, setMetasDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'despesa', descricao: '', valor: '', categoria: '',
    fornecedor: '', vencimento: '', formaPagto: '', status: 'pendente', obraId: '',
    parcelas: 1, intervaloDias: 30,  // 1 parcela = lançamento único; >1 = recorrência
  });
  const [metasForm, setMetasForm] = useState(metas);

  // ===== ESTADO INLINE: cheques no modal Nova Movimentação =====
  // Detecta quando user escolhe forma=Cheque OU cat=Cheque Trocado e expande
  const [chequeMode, setChequeMode] = useState(false);
  const [chequesList, setChequesList] = useState([
    { valor: '50000', vencimento: '' },
    { valor: '50000', vencimento: '' },
    { valor: '50000', vencimento: '' },
  ]);
  const [valorLiquidoCheque, setValorLiquidoCheque] = useState('130000');

  // ===== ESTADO MODAL OPERAÇÃO FINANCEIRA (cheques trocados / empréstimos / juros) =====
  const [opFinDialogOpen, setOpFinDialogOpen] = useState(false);
  const [opFin, setOpFin] = useState({
    tipo: 'cheque_trocado', // cheque_trocado | emprestimo | financiamento | renegociacao
    descricao: '',
    fornecedor: '',
    valorFace: '',          // valor de face do cheque OU principal do empréstimo
    valorLiquido: '',       // valor líquido recebido
    parcelas: 3,
    primeiroVencimento: new Date().toISOString().split('T')[0],
    intervaloDias: 30,
    dataOperacao: new Date().toISOString().split('T')[0],
    obraId: '',
  });

  // ===== ESTADO DO SIMULADOR DE CENÁRIOS =====
  const [cenario, setCenario] = useState({
    corteDespesas: 0,      // % de redução de despesas
    aumentoReceitas: 0,    // % de aumento em receitas
    receitaExtra: 0,       // R$ injeção pontual de receita
    despesaExtra: 0,       // R$ despesa extra (cenário pessimista)
    novoPrecoFabKg: metas.fabricacaoPrecoKg,
    novaProducaoFabKg: metas.fabricacaoKg,
  });
  useEffect(() => {
    setCenario(prev => ({
      ...prev,
      novoPrecoFabKg: metas.fabricacaoPrecoKg,
      novaProducaoFabKg: metas.fabricacaoKg,
    }));
  }, [metas.fabricacaoPrecoKg, metas.fabricacaoKg]);

  // ===== MAPA DE OBRAS =====
  const obrasMap = useMemo(() => {
    const map = {};
    (obras || []).forEach(o => { map[o.id] = o.nome || o.name || o.id; });
    return map;
  }, [obras]);

  // ===== ESPELHO DE DESPESAS EXTERNAS =====
  const despesasExternas = useMemo(() => {
    if (!lancamentosDespesas || lancamentosDespesas.length === 0) return [];
    return lancamentosDespesas
      .filter(l => !l.obraId && !l.obra_id)
      .map(l => ({
        id: l.id,
        origem: 'externo',
        tipo: 'despesa',
        data: l.dataEmissao || l.data || l.createdAt || '',
        descricao: l.descricao || l.nome || '-',
        fornecedor: l.fornecedor || '-',
        categoria: l.categoria || 'Outros',
        valor: l.valor || 0,
        status: l.status || 'pendente',
        formaPagto: l.formaPagto || '-',
        vencimento: l.dataVencimento || l.vencimento || '-',
        origemLabel: 'Despesa Fábrica',
        origemObra: false,
      }));
  }, [lancamentosDespesas]);

  // ===== ESPELHO DE MEDIÇÕES =====
  const receitasMedicoesExt = useMemo(() => {
    if (!todasMedicoes || todasMedicoes.length === 0) return [];
    const overrides = lerLS(RECEITAS_OVERRIDES_KEY, {});
    return todasMedicoes.map(m => {
      const obraId = m.obraId || m.obra_id;
      const obraNome = m.obraNome || m.obra_nome || obrasMap[obraId] || '-';
      const etapaLabel = m.isAvulsa ? 'Avulsa' : (ETAPA_LABELS[m.etapa] || m.etapa || 'Medição');
      const base = {
        id: m.id, origem: 'externo', tipo: 'receita',
        data: m.dataMedicao || m.data_medicao || m.dataReferencia || m.data_referencia || '',
        descricao: m.descricao || `Medição #${m.numero || '?'} - ${etapaLabel}`,
        fornecedor: obraNome,
        categoria: m.isAvulsa ? 'Serviço Avulso' : 'Medição',
        valor: m.valorBruto || m.valor_bruto || 0,
        status: ['pago', 'paga', 'faturado', 'confirmado'].includes(m.status) ? 'recebido' : (m.status || 'pendente'),
        formaPagto: '-',
        vencimento: m.dataMedicao || m.data_medicao || '-',
        numero: m.numero, etapaLabel,
        origemLabel: `Obra: ${obraNome}`, origemObra: true,
        obraId, obraNome,
      };
      if (overrides[m.id]) {
        const ov = overrides[m.id];
        if (ov.descricao) base.descricao = ov.descricao;
        if (ov.valor !== undefined) base.valor = ov.valor;
        if (ov.status) base.status = ['pago', 'paga', 'faturado', 'confirmado', 'recebido'].includes(ov.status) ? 'recebido' : ov.status;
        if (ov.categoria) base.categoria = ov.categoria;
        if (ov.cliente) base.fornecedor = ov.cliente;
        if (ov.vencimento) base.vencimento = ov.vencimento;
        if (ov.formaPagto && ov.formaPagto !== '-') base.formaPagto = ov.formaPagto;
        if (ov.obraNome) base.obraNome = ov.obraNome;
      }
      return base;
    });
  }, [todasMedicoes, obrasMap]);

  // ===== ESPELHO DE RECEITAS MANUAIS =====
  const receitasManuaisExt = useMemo(() => {
    try {
      const salvas = JSON.parse(localStorage.getItem(RECEITAS_STORAGE_KEY) || '[]');
      return salvas.map(r => ({
        id: r.id, origem: 'externo', tipo: 'receita',
        data: r.data || r.vencimento || '',
        descricao: r.descricao || '-',
        fornecedor: r.cliente || '-',
        categoria: r.categoria || 'Outros',
        valor: r.valor || 0,
        status: ['pago', 'paga', 'faturado', 'confirmado', 'recebido'].includes(r.status) ? 'recebido' : (r.status || 'pendente'),
        formaPagto: r.formaPagto || '-',
        vencimento: r.vencimento || '-',
        origemLabel: 'Receita Manual', origemObra: false,
      }));
    } catch { return []; }
  }, [movsLocais]);

  // ===== MOVS LOCAIS NORMALIZADAS =====
  const movsLocaisNorm = useMemo(() => {
    return (movsLocais || []).map(m => ({
      ...m, origem: 'local', origemLabel: 'Global Local',
      origemObra: !!m.obraId,
      obraNome: m.obraId ? (obrasMap[m.obraId] || '-') : '-',
    }));
  }, [movsLocais, obrasMap]);

  // ===== CONSOLIDAÇÃO =====
  const todasMovs = useMemo(() => {
    const externas = [...despesasExternas, ...receitasMedicoesExt, ...receitasManuaisExt];
    const externasComOv = externas
      .filter(m => !hiddenLocais.includes(m.id))
      .map(m => {
        const ov = overridesLocais[m.id];
        if (!ov) return m;
        return { ...m, ...ov, id: m.id, origem: 'externo', origemModificado: true };
      });
    const todas = [...externasComOv, ...movsLocaisNorm];

    let filtradas = todas;
    if (filtroObra === 'fabrica') filtradas = todas.filter(m => !m.origemObra);
    else if (filtroObra !== 'geral') filtradas = todas.filter(m => m.obraId === filtroObra);

    return filtradas.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
  }, [despesasExternas, receitasMedicoesExt, receitasManuaisExt, movsLocaisNorm, overridesLocais, hiddenLocais, filtroObra]);

  // ===== OPÇÕES DE OBRA =====
  const opcoesObra = useMemo(() => {
    const ops = [
      { value: 'geral', label: 'Visão Geral (Todas)' },
      { value: 'fabrica', label: 'Financeiro Fábrica (Despesas)' },
    ];
    (obras || []).forEach(o => ops.push({ value: o.id, label: o.nome || o.name || o.id }));
    return ops;
  }, [obras]);

  // ===== FILTRO PERÍODO =====
  const filtrarPorPeriodo = useCallback((lista) => {
    if (filtroPeriodo === 'geral') return lista;
    const hoje = new Date();
    const inicio = new Date();
    if (filtroPeriodo === 'semanal') inicio.setDate(hoje.getDate() - 7);
    else if (filtroPeriodo === 'mensal') inicio.setMonth(hoje.getMonth() - 1);
    else if (filtroPeriodo === 'trimestral') inicio.setMonth(hoje.getMonth() - 3);
    return lista.filter(m => {
      const d = parseLocalDate(m.data || m.vencimento);
      return d >= inicio && d <= hoje;
    });
  }, [filtroPeriodo]);

  const movsPeriodo = useMemo(() => filtrarPorPeriodo(todasMovs), [todasMovs, filtrarPorPeriodo]);

  // ===== KPIs GERAIS =====
  const kpis = useMemo(() => {
    const receitas = movsPeriodo.filter(m => m.tipo === 'receita');
    const despesas = movsPeriodo.filter(m => m.tipo === 'despesa');
    const totR = receitas.reduce((s, m) => s + (m.valor || 0), 0);
    const totD = despesas.reduce((s, m) => s + (m.valor || 0), 0);
    const recRecebidas = receitas.filter(m => ['recebido','pago','paga'].includes(m.status)).reduce((s,m)=>s+(m.valor||0),0);
    const recPendentes = totR - recRecebidas;
    const despPagas = despesas.filter(m => m.status === 'pago').reduce((s,m)=>s+(m.valor||0),0);
    const despPendentes = totD - despPagas;
    const lucro = totR - totD;
    const margem = totR > 0 ? (lucro / totR * 100) : 0;
    return {
      totR, totD, lucro, margem,
      recRecebidas, recPendentes, despPagas, despPendentes,
      qtdR: receitas.length, qtdD: despesas.length,
      qtdLocal: movsPeriodo.filter(m => m.origem === 'local').length,
      qtdOv: movsPeriodo.filter(m => m.origemModificado).length,
      qtdTotal: movsPeriodo.length,
    };
  }, [movsPeriodo]);

  // ===== ANÁLISE FUTURA (próximos 90 dias) =====
  const futuro = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const todasComDias = todasMovs.map(m => ({
      ...m,
      diasVenc: diasAteVencimento(m.vencimento && m.vencimento !== '-' ? m.vencimento : m.data),
      _ehCheque: ehCheque(m),
    }));
    const futurasReceitas = todasComDias.filter(m => m.tipo === 'receita' && m.diasVenc !== null && m.diasVenc >= 0 && m.diasVenc <= 90 && !['recebido','pago','paga'].includes(m.status));
    const futurasDespesas = todasComDias.filter(m => m.tipo === 'despesa' && m.diasVenc !== null && m.diasVenc >= 0 && m.diasVenc <= 90 && m.status !== 'pago');

    const receber30 = futurasReceitas.filter(m => m.diasVenc <= 30).reduce((s,m)=>s+(m.valor||0),0);
    const receber60 = futurasReceitas.filter(m => m.diasVenc <= 60).reduce((s,m)=>s+(m.valor||0),0);
    const receber90 = futurasReceitas.reduce((s,m)=>s+(m.valor||0),0);
    const pagar30 = futurasDespesas.filter(m => m.diasVenc <= 30).reduce((s,m)=>s+(m.valor||0),0);
    const pagar60 = futurasDespesas.filter(m => m.diasVenc <= 60).reduce((s,m)=>s+(m.valor||0),0);
    const pagar90 = futurasDespesas.reduce((s,m)=>s+(m.valor||0),0);

    // Saldo acumulado por semana (próximas 13 semanas = ~90 dias)
    const semanas = [];
    for (let i = 0; i < 13; i++) {
      const fim = new Date(hoje);
      fim.setDate(fim.getDate() + (i + 1) * 7);
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() + i * 7);
      const recSem = futurasReceitas.filter(m => {
        const d = parseLocalDate(m.vencimento && m.vencimento !== '-' ? m.vencimento : m.data);
        return d >= inicio && d < fim;
      }).reduce((s,m)=>s+(m.valor||0),0);
      const despSem = futurasDespesas.filter(m => {
        const d = parseLocalDate(m.vencimento && m.vencimento !== '-' ? m.vencimento : m.data);
        return d >= inicio && d < fim;
      }).reduce((s,m)=>s+(m.valor||0),0);
      semanas.push({
        label: `Sem ${i + 1}`,
        dataInicio: inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        receitas: recSem,
        despesas: despSem,
        saldoSem: recSem - despSem,
      });
    }
    // Acumular saldo
    let acc = 0;
    semanas.forEach(s => { acc += s.saldoSem; s.saldoAcumulado = acc; });

    return {
      futurasReceitas, futurasDespesas,
      receber30, receber60, receber90,
      pagar30, pagar60, pagar90,
      saldo30: receber30 - pagar30,
      saldo60: receber60 - pagar60,
      saldo90: receber90 - pagar90,
      semanas,
    };
  }, [todasMovs]);

  // ===== ALERTAS INTELIGENTES =====
  const alertas = useMemo(() => {
    const lista = [];
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    // 1. Vencimentos críticos (≤ 2 dias) e atenção (≤ 7 dias)
    todasMovs.forEach(m => {
      const venc = m.vencimento && m.vencimento !== '-' ? m.vencimento : m.data;
      const dias = diasAteVencimento(venc);
      if (dias === null) return;

      // Já pago/recebido → ignora
      if (m.tipo === 'despesa' && m.status === 'pago') return;
      if (m.tipo === 'receita' && ['recebido','pago','paga'].includes(m.status)) return;

      const _ehCheque = ehCheque(m);
      const valorAlto = (m.valor || 0) >= metas.thresholdValorAlto;
      const ehOpFinanceira = !!m.operacaoFinanceiraId;

      // Score = (urgência × valor) - quanto menor dias, maior score
      // Cheques, valores altos e operações financeiras ganham boost
      let urgenciaScore = 0;
      if (dias < 0) urgenciaScore = 1000 + Math.abs(dias) * 10; // já vencido
      else if (dias <= metas.alertaCriticoDias) urgenciaScore = 800 - dias * 50;
      else if (dias <= metas.alertaAtencaoDias) urgenciaScore = 400 - dias * 20;

      if (urgenciaScore === 0) return; // fora da janela

      const score = urgenciaScore
        + Math.log10(Math.max(1, m.valor)) * 100
        + (_ehCheque ? 200 : 0)
        + (valorAlto ? 150 : 0)
        + (ehOpFinanceira ? 250 : 0); // operações financeiras têm prioridade máxima

      let nivel;
      if (dias < 0) nivel = 'vencido';
      else if (dias <= metas.alertaCriticoDias) nivel = 'critico';
      else nivel = 'atencao';

      lista.push({
        id: `venc-${m.id}`,
        tipo: m.tipo === 'despesa' ? 'pagamento' : 'recebimento',
        nivel,
        score,
        dias,
        valor: m.valor,
        ehCheque: _ehCheque,
        valorAlto,
        ehOpFinanceira,
        opLabel: m.operacaoLabel,
        titulo: ehOpFinanceira
          ? `💸 ${m.operacaoLabel || 'Op Financeira'} — ${m.descricao.split('—')[1]?.trim() || m.descricao}`
          : m.tipo === 'despesa'
            ? `${_ehCheque ? '🏦 CHEQUE — ' : ''}A pagar: ${m.descricao}`
            : `A receber: ${m.descricao}`,
        descricao: `${m.fornecedor || '-'} • ${formatCurrency(m.valor)} • Venc: ${formatDate(venc)}`,
        movId: m.id,
      });
    });

    // 2. Saldo projetado abaixo do mínimo
    futuro.semanas.forEach((s, i) => {
      if (s.saldoAcumulado < metas.saldoMinimo) {
        lista.push({
          id: `saldo-sem-${i}`,
          tipo: 'saldo',
          nivel: s.saldoAcumulado < 0 ? 'critico' : 'atencao',
          score: 600 - i * 20,
          dias: (i + 1) * 7,
          valor: Math.abs(s.saldoAcumulado),
          titulo: `Saldo projetado baixo na semana ${i + 1}`,
          descricao: `Saldo acumulado ${formatCurrency(s.saldoAcumulado)} (mín: ${formatCurrency(metas.saldoMinimo)})`,
        });
      }
    });

    // 3. Receita do mês atual abaixo da meta mínima
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const receitaMes = todasMovs.filter(m => {
      if (m.tipo !== 'receita') return false;
      const d = parseLocalDate(m.data || m.vencimento);
      return d >= inicioMes && d <= fimMes && ['recebido','pago','paga'].includes(m.status);
    }).reduce((s,m)=>s+(m.valor||0),0);
    if (receitaMes < metas.receitaMinimaMensal * 0.8) {
      lista.push({
        id: 'meta-receita-mes',
        tipo: 'meta',
        nivel: receitaMes < metas.receitaMinimaMensal * 0.5 ? 'critico' : 'atencao',
        score: 500,
        valor: metas.receitaMinimaMensal - receitaMes,
        titulo: 'Receita do mês abaixo da meta mínima',
        descricao: `${formatCurrency(receitaMes)} de ${formatCurrency(metas.receitaMinimaMensal)} (${((receitaMes/metas.receitaMinimaMensal)*100).toFixed(0)}%)`,
      });
    }

    // Ordenar por score
    return lista.sort((a, b) => b.score - a.score);
  }, [todasMovs, futuro.semanas, metas]);

  const alertasNaoLidos = useMemo(() => alertas.filter(a => !alertasLidos.includes(a.id)), [alertas, alertasLidos]);

  // ===== GRÁFICOS COMPARTILHADOS =====
  const dadosPizzaDespesas = useMemo(() => {
    const map = {};
    movsPeriodo.filter(m => m.tipo === 'despesa').forEach(m => {
      const cat = m.categoria || 'Outros';
      map[cat] = (map[cat] || 0) + (m.valor || 0);
    });
    return Object.entries(map)
      .map(([nome, valor]) => ({ nome, valor, cor: CORES_CATEGORIAS[nome] || '#64748b' }))
      .sort((a, b) => b.valor - a.valor);
  }, [movsPeriodo]);

  const dadosPizzaReceitas = useMemo(() => {
    const map = {};
    movsPeriodo.filter(m => m.tipo === 'receita').forEach(m => {
      const cat = m.categoria || 'Outros';
      map[cat] = (map[cat] || 0) + (m.valor || 0);
    });
    return Object.entries(map)
      .map(([nome, valor]) => ({ nome, valor, cor: CORES_CATEGORIAS[nome] || '#64748b' }))
      .sort((a, b) => b.valor - a.valor);
  }, [movsPeriodo]);

  const evolucaoMensal = useMemo(() => {
    const meses = {};
    movsPeriodo.forEach(m => {
      const d = parseLocalDate(m.data || m.vencimento);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!meses[key]) meses[key] = { mes: label, key, receitas: 0, despesas: 0 };
      if (m.tipo === 'receita') meses[key].receitas += m.valor || 0;
      else meses[key].despesas += m.valor || 0;
    });
    const arr = Object.values(meses).sort((a, b) => a.key.localeCompare(b.key));
    arr.forEach(m => { m.saldo = m.receitas - m.despesas; });
    return arr;
  }, [movsPeriodo]);

  // ===== TOP FORNECEDORES =====
  const topFornecedores = useMemo(() => {
    const map = {};
    movsPeriodo.filter(m => m.tipo === 'despesa').forEach(m => {
      const f = m.fornecedor || '-';
      if (!map[f]) map[f] = { nome: f, valor: 0, qtd: 0 };
      map[f].valor += m.valor || 0;
      map[f].qtd++;
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [movsPeriodo]);

  // ===== METAS — REALIZADO =====
  const metasReal = useMemo(() => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const movsMes = todasMovs.filter(m => {
      const d = parseLocalDate(m.data || m.vencimento);
      return d >= inicioMes && d <= fimMes;
    });
    const receitaMes = movsMes.filter(m => m.tipo === 'receita' && ['recebido','pago','paga'].includes(m.status))
      .reduce((s,m)=>s+(m.valor||0),0);
    const despesaMes = movsMes.filter(m => m.tipo === 'despesa').reduce((s,m)=>s+(m.valor||0),0);
    const margemReal = receitaMes > 0 ? ((receitaMes - despesaMes) / receitaMes * 100) : 0;
    const receitaFabricacaoMeta = metas.fabricacaoKg * metas.fabricacaoPrecoKg;
    const receitaMontagemMeta = metas.montagemKg * metas.montagemPrecoKg;
    return {
      receitaMes, despesaMes, margemReal,
      receitaFabricacaoMeta, receitaMontagemMeta,
      receitaTotalMeta: receitaFabricacaoMeta + receitaMontagemMeta,
    };
  }, [todasMovs, metas]);

  // ===== COMPARATIVO MÊS ATUAL × MÊS ANTERIOR =====
  const comparativo = useMemo(() => {
    const hoje = new Date();
    const ini = (m) => new Date(hoje.getFullYear(), hoje.getMonth() - m, 1);
    const fim = (m) => new Date(hoje.getFullYear(), hoje.getMonth() - m + 1, 0);

    const calcular = (offset) => {
      const inicio = ini(offset);
      const final = fim(offset);
      const movs = todasMovs.filter(m => {
        const d = parseLocalDate(m.data || m.vencimento);
        return d >= inicio && d <= final;
      });
      const rec = movs.filter(m => m.tipo === 'receita').reduce((s,m)=>s+(m.valor||0),0);
      const desp = movs.filter(m => m.tipo === 'despesa').reduce((s,m)=>s+(m.valor||0),0);
      return { receitas: rec, despesas: desp, lucro: rec - desp, margem: rec > 0 ? ((rec - desp) / rec * 100) : 0, qtd: movs.length };
    };
    const atual = calcular(0);
    const anterior = calcular(1);
    const delta = (a, b) => b > 0 ? ((a - b) / b * 100) : (a > 0 ? 100 : 0);
    return {
      atual, anterior,
      deltaReceitas: delta(atual.receitas, anterior.receitas),
      deltaDespesas: delta(atual.despesas, anterior.despesas),
      deltaLucro: delta(atual.lucro, anterior.lucro),
      deltaMargem: atual.margem - anterior.margem,
    };
  }, [todasMovs]);

  // ===== FORECAST DE RECEITAS (medições aprovadas mas não pagas) =====
  const forecast = useMemo(() => {
    // Medições aprovadas ou pendentes com data futura = forecast
    const aprovadasNaoPagas = todasMovs.filter(m =>
      m.tipo === 'receita' &&
      !['recebido','pago','paga'].includes(m.status) &&
      m.valor > 0
    );
    const totalForecast = aprovadasNaoPagas.reduce((s,m)=>s+(m.valor||0),0);
    // Distribui por mês (próximos 6 meses)
    const hoje = new Date();
    const meses = [];
    for (let i = 0; i < 6; i++) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const label = mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const naoVigentes = aprovadasNaoPagas.filter(m => {
        const venc = parseLocalDate(m.vencimento && m.vencimento !== '-' ? m.vencimento : m.data);
        return venc.getFullYear() === mes.getFullYear() && venc.getMonth() === mes.getMonth();
      });
      const valor = naoVigentes.reduce((s,m)=>s+(m.valor||0),0);
      meses.push({ mes: label, forecast: valor, meta: metas.receitaMinimaMensal });
    }
    return { totalForecast, meses, qtd: aprovadasNaoPagas.length, items: aprovadasNaoPagas };
  }, [todasMovs, metas]);

  // ===== SCORE DE SAÚDE FINANCEIRA (0-100) =====
  const scoreSaude = useMemo(() => {
    // Componentes (pesos):
    //  - Margem operacional (25%): score 100 se margem >= 25%; 0 se <= 0%
    //  - Liquidez 30d (25%): saldo30 / pagar30; score 100 se >= 1.5x; 0 se < 0.5x
    //  - Receita vs Meta (20%): receitaMes / metaMin; score 100 se >= 1; 0 se <= 0.5
    //  - Despesa vs Teto (15%): inverso; score 100 se despesa <= teto*0.9; 0 se > teto*1.2
    //  - Alertas críticos (15%): 100 se 0 alertas; -20 cada alerta crítico
    const norm = (v, min, max) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
    const scoreMargem = norm(metasReal.margemReal, 0, 25);
    const liquidez = futuro.pagar30 > 0 ? futuro.receber30 / futuro.pagar30 : (futuro.receber30 > 0 ? 2 : 1);
    const scoreLiquidez = norm(liquidez, 0.5, 1.5);
    const scoreReceita = norm(metasReal.receitaMes / Math.max(1, metas.receitaMinimaMensal), 0.5, 1.0);
    const scoreDespesa = 100 - norm(metasReal.despesaMes / Math.max(1, metas.despesaTetoMensal), 0.9, 1.2);
    const alertasCriticos = alertas.filter(a => a.nivel === 'critico' || a.nivel === 'vencido').length;
    const scoreAlertas = Math.max(0, 100 - alertasCriticos * 20);

    const total = (scoreMargem * 0.25) + (scoreLiquidez * 0.25) + (scoreReceita * 0.20) + (scoreDespesa * 0.15) + (scoreAlertas * 0.15);
    const score = Math.round(total);
    let nivel, cor;
    if (score >= 80) { nivel = 'Excelente'; cor = '#10b981'; }
    else if (score >= 60) { nivel = 'Saudável'; cor = '#3b82f6'; }
    else if (score >= 40) { nivel = 'Atenção'; cor = '#f59e0b'; }
    else if (score >= 20) { nivel = 'Crítico'; cor = '#ef4444'; }
    else { nivel = 'Severo'; cor = '#7f1d1d'; }
    return {
      score, nivel, cor,
      componentes: [
        { nome: 'Margem Operacional', score: Math.round(scoreMargem), peso: 25, atual: `${metasReal.margemReal.toFixed(1)}%`, meta: `${metas.margemMinima}%` },
        { nome: 'Liquidez 30 dias', score: Math.round(scoreLiquidez), peso: 25, atual: `${liquidez.toFixed(2)}x`, meta: '≥ 1.5x' },
        { nome: 'Receita vs Meta', score: Math.round(scoreReceita), peso: 20, atual: formatCurrency(metasReal.receitaMes), meta: formatCurrency(metas.receitaMinimaMensal) },
        { nome: 'Despesa vs Teto', score: Math.round(scoreDespesa), peso: 15, atual: formatCurrency(metasReal.despesaMes), meta: `≤ ${formatCurrency(metas.despesaTetoMensal)}` },
        { nome: 'Alertas Críticos', score: Math.round(scoreAlertas), peso: 15, atual: `${alertasCriticos} alerta(s)`, meta: '0' },
      ],
    };
  }, [metasReal, futuro, metas, alertas]);

  // ===== MESES DISPONÍVEIS (extraídos das movimentações para o seletor) =====
  const mesesDisponiveis = useMemo(() => {
    const set = new Set();
    todasMovs.forEach(m => {
      const venc = m.vencimento && m.vencimento !== '-' ? m.vencimento : m.data;
      const d = parseLocalDate(venc);
      if (d && !isNaN(d.getTime())) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        set.add(key);
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a)); // mais recente primeiro
  }, [todasMovs]);

  const formatMesLabel = (mesKey) => {
    if (!mesKey || mesKey === 'todos') return 'Todos os meses';
    const [ano, mes] = mesKey.split('-');
    const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${meses[parseInt(mes) - 1]}/${ano}`;
  };

  // ===== TABELA FILTRADA =====
  const movsTabela = useMemo(() => {
    let lista = todasMovs;
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    // Filtro tipo (receita/despesa/todos)
    if (filtroTipo !== 'todos') lista = lista.filter(m => m.tipo === filtroTipo);

    // Filtro Mês (por data de vencimento)
    if (filtroMes !== 'todos') {
      lista = lista.filter(m => {
        const venc = m.vencimento && m.vencimento !== '-' ? m.vencimento : m.data;
        const d = parseLocalDate(venc);
        if (!d || isNaN(d.getTime())) return false;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === filtroMes;
      });
    }

    // Filtro Status — considera "atrasado" dinâmico (pendente + venc < hoje)
    if (filtroStatusTab !== 'todos') {
      lista = lista.filter(m => {
        const ehPago = ['recebido','pago','paga','faturado','confirmado'].includes(m.status);
        const venc = m.vencimento && m.vencimento !== '-' ? m.vencimento : m.data;
        const dVenc = parseLocalDate(venc);
        const isVencido = dVenc && !isNaN(dVenc.getTime()) && dVenc < hoje && !ehPago;
        if (filtroStatusTab === 'pago') return ehPago;
        if (filtroStatusTab === 'atrasado') return isVencido || m.status === 'atrasado';
        if (filtroStatusTab === 'pendente') return !ehPago && !isVencido;
        return true;
      });
    }

    // Busca textual
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      lista = lista.filter(m =>
        (m.descricao || '').toLowerCase().includes(s) ||
        (m.fornecedor || '').toLowerCase().includes(s) ||
        (m.origemLabel || '').toLowerCase().includes(s)
      );
    }

    // Aplicar filtro de período global (7d/30d/90d)
    lista = filtrarPorPeriodo(lista);

    // Ordenação
    return [...lista].sort((a, b) => {
      if (ordenarPor === 'valor') return (b.valor || 0) - (a.valor || 0);
      if (ordenarPor === 'vencimento') {
        const dA = parseLocalDate(a.vencimento && a.vencimento !== '-' ? a.vencimento : a.data);
        const dB = parseLocalDate(b.vencimento && b.vencimento !== '-' ? b.vencimento : b.data);
        if (!dA) return 1; if (!dB) return -1;
        return dA - dB; // ASC: próximos primeiro
      }
      // default: data emissão DESC
      return parseLocalDate(b.data || 0) - parseLocalDate(a.data || 0);
    });
  }, [todasMovs, filtroTipo, filtroMes, filtroStatusTab, searchTerm, ordenarPor, filtrarPorPeriodo]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleNova = (tipo = 'despesa') => {
    setEditando(null);
    setFormData({ tipo, descricao: '', valor: '', categoria: '', fornecedor: '', vencimento: '', formaPagto: '', status: 'pendente', obraId: '', parcelas: 1, intervaloDias: 30 });
    setDialogOpen(true);
  };

  const handleEditar = (mov) => {
    setEditando(mov);
    setFormData({
      tipo: mov.tipo || 'despesa', descricao: mov.descricao || '',
      valor: String(mov.valor || ''), categoria: mov.categoria || '',
      fornecedor: mov.fornecedor || '',
      vencimento: mov.vencimento && mov.vencimento !== '-' ? mov.vencimento : '',
      formaPagto: mov.formaPagto || '', status: mov.status || 'pendente',
      obraId: mov.obraId || '',
      parcelas: 1, intervaloDias: 30,  // edição sempre é de 1 lançamento individual
    });
    setDialogOpen(true);
  };

  const handleSalvar = () => {
    // ===== MODO CHEQUE INLINE: criar operação completa em vez de 1 lançamento =====
    if (chequeMode && !editando) {
      if (!formData.descricao) {
        toast.error('Descrição é obrigatória');
        return;
      }
      if (chequeOpCalc.valorTotalFace <= 0) {
        toast.error('Adicione ao menos 1 cheque com valor');
        return;
      }
      const chequesValidos = chequesList.filter(c => parseFloat(c.valor) > 0 && c.vencimento);
      if (chequesValidos.length === 0) {
        toast.error('Preencha valor e vencimento de cada cheque');
        return;
      }
      const novos = [];
      const baseId = `CHQ-${Date.now()}`;
      const dataOp = new Date().toISOString().split('T')[0];

      // 1. Receita líquida (entrada de caixa)
      if (chequeOpCalc.liquido > 0) {
        novos.push({
          id: `${baseId}-liq`, tipo: 'receita',
          descricao: `Cheque Trocado — Líquido recebido: ${formData.descricao}`,
          fornecedor: formData.fornecedor || '-',
          categoria: 'Cheque Trocado (Líquido)',
          valor: chequeOpCalc.liquido,
          formaPagto: 'Transferência',
          vencimento: dataOp, data: dataOp,
          status: 'pago',
          obraId: formData.obraId || null,
          operacaoFinanceiraId: baseId,
          operacaoLabel: 'Cheque Trocado',
          createdAt: new Date().toISOString(),
        });
      }
      // 2. Despesa de juros
      if (chequeOpCalc.juros > 0) {
        novos.push({
          id: `${baseId}-juros`, tipo: 'despesa',
          descricao: `Cheque Trocado — Juros/Desconto: ${formData.descricao} (${chequeOpCalc.taxaPct.toFixed(2)}%, ~${chequeOpCalc.taxaAnualizada.toFixed(1)}% a.a.)`,
          fornecedor: formData.fornecedor || '-',
          categoria: 'Juros de Cheque',
          valor: chequeOpCalc.juros,
          formaPagto: 'Operação Bancária',
          vencimento: dataOp, data: dataOp,
          status: 'pago',
          obraId: formData.obraId || null,
          operacaoFinanceiraId: baseId,
          operacaoLabel: 'Cheque Trocado',
          createdAt: new Date().toISOString(),
        });
      }
      // 3. N cheques (parcelas a pagar)
      chequesValidos.forEach((c, idx) => {
        novos.push({
          id: `${baseId}-ch-${idx + 1}`, tipo: 'despesa',
          descricao: `Cheque Trocado — Cheque ${idx + 1}/${chequesValidos.length}: ${formData.descricao}`,
          fornecedor: formData.fornecedor || '-',
          categoria: 'Cheque Trocado (face)',
          valor: parseFloat(c.valor),
          formaPagto: 'Cheque',
          vencimento: c.vencimento, data: c.vencimento,
          status: 'pendente',
          obraId: formData.obraId || null,
          operacaoFinanceiraId: baseId,
          operacaoLabel: 'Cheque Trocado',
          createdAt: new Date().toISOString(),
        });
      });

      setMovsLocais(prev => [...prev, ...novos]);
      toast.success(`Operação de cheque trocado criada: ${novos.length} lançamentos gerados`);
      // Reset
      setDialogOpen(false);
      setEditando(null);
      setChequesList([
        { valor: '50000', vencimento: '' },
        { valor: '50000', vencimento: '' },
        { valor: '50000', vencimento: '' },
      ]);
      setValorLiquidoCheque('130000');
      return;
    }

    // ===== FLUXO NORMAL =====
    if (!formData.descricao || !formData.valor) {
      toast.error('Descrição e valor são obrigatórios');
      return;
    }
    const valorNum = parseFloat(formData.valor);
    if (editando) {
      if (editando.origem === 'local') {
        setMovsLocais(prev => prev.map(m => m.id === editando.id ? {
          ...m, tipo: formData.tipo, descricao: formData.descricao,
          fornecedor: formData.fornecedor || '-', categoria: formData.categoria || 'Outros',
          valor: valorNum, formaPagto: formData.formaPagto || '-',
          vencimento: formData.vencimento || '',
          data: formData.vencimento || m.data,
          status: formData.status || 'pendente', obraId: formData.obraId || null,
        } : m));
        toast.success('Lançamento local atualizado');
      } else {
        setOverridesLocais(prev => ({ ...prev, [editando.id]: {
          tipo: formData.tipo, descricao: formData.descricao,
          fornecedor: formData.fornecedor || '-', categoria: formData.categoria || 'Outros',
          valor: valorNum, formaPagto: formData.formaPagto || '-',
          vencimento: formData.vencimento || '',
          data: formData.vencimento || editando.data,
          status: formData.status || 'pendente',
        }}));
        toast.success('Override local salvo — sistema principal intacto');
      }
    } else {
      // ===== NOVO LANÇAMENTO — pode ter parcelas/recorrência =====
      const qtdParcelas = Math.max(1, parseInt(formData.parcelas) || 1);
      const intervalo = Math.max(1, parseInt(formData.intervaloDias) || 30);

      if (qtdParcelas === 1) {
        // Lançamento único (sem parcelas)
        const novo = {
          id: `GLOBAL-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
          tipo: formData.tipo, descricao: formData.descricao,
          fornecedor: formData.fornecedor || '-', categoria: formData.categoria || 'Outros',
          valor: valorNum, formaPagto: formData.formaPagto || '-',
          vencimento: formData.vencimento || '',
          data: formData.vencimento || new Date().toISOString().split('T')[0],
          status: formData.status || 'pendente', obraId: formData.obraId || null,
          createdAt: new Date().toISOString(),
        };
        setMovsLocais(prev => [...prev, novo]);
        toast.success('Lançamento criado neste módulo');
      } else {
        // RECORRÊNCIA — replica N parcelas com vencimentos escalonados
        const baseDate = formData.vencimento ? parseLocalDate(formData.vencimento) : new Date();
        if (!baseDate || isNaN(baseDate.getTime())) {
          toast.error('Defina o vencimento da 1ª parcela');
          return;
        }
        const recorrenciaId = `REC-${Date.now()}`;
        const novos = [];
        for (let i = 0; i < qtdParcelas; i++) {
          const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + (i * intervalo));
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const dataStr = `${yyyy}-${mm}-${dd}`;
          novos.push({
            id: `GLOBAL-${Date.now()}-p${i + 1}-${Math.floor(Math.random() * 9999)}`,
            tipo: formData.tipo,
            descricao: `${formData.descricao} (Parcela ${i + 1}/${qtdParcelas})`,
            fornecedor: formData.fornecedor || '-',
            categoria: formData.categoria || 'Outros',
            valor: valorNum,
            formaPagto: formData.formaPagto || '-',
            vencimento: dataStr,
            data: dataStr,
            status: i === 0 ? (formData.status || 'pendente') : 'pendente',
            obraId: formData.obraId || null,
            recorrenciaId,
            parcelaIdx: i + 1,
            parcelaTotal: qtdParcelas,
            createdAt: new Date().toISOString(),
          });
        }
        setMovsLocais(prev => [...prev, ...novos]);
        toast.success(`${qtdParcelas} parcelas criadas (total ${formatCurrency(valorNum * qtdParcelas)})`);
      }
    }
    setDialogOpen(false);
    setEditando(null);
  };

  const handleApagar = (id) => {
    const mov = todasMovs.find(m => m.id === id);
    if (!mov) { setDeleteConfirmId(null); return; }
    if (mov.origem === 'local') {
      setMovsLocais(prev => prev.filter(m => m.id !== id));
      toast.success('Lançamento local removido');
    } else {
      setHiddenLocais(prev => [...prev, id]);
      toast.success('Item ocultado localmente');
    }
    setDeleteConfirmId(null);
  };

  // Apagar grupo: remove TODAS as parcelas do mesmo recorrenciaId OU todas as
  // movs de uma operação financeira (operacaoFinanceiraId)
  const handleApagarGrupo = (grupoIdKey, grupoIdValue) => {
    const removidas = movsLocais.filter(m => m[grupoIdKey] === grupoIdValue);
    if (removidas.length === 0) {
      toast.error('Nenhum item encontrado no grupo');
      return;
    }
    setMovsLocais(prev => prev.filter(m => m[grupoIdKey] !== grupoIdValue));
    toast.success(`${removidas.length} lançamentos removidos do grupo`);
    setDeleteConfirmId(null);
  };

  const handleResetTudo = () => {
    setMovsLocais([]); setOverridesLocais({}); setHiddenLocais([]);
    setAlertasLidos([]);
    toast.success('Dados locais resetados');
    setResetDialogOpen(false);
  };

  const handleRestaurarItem = (id) => {
    setOverridesLocais(prev => { const { [id]: _, ...rest } = prev; return rest; });
    setHiddenLocais(prev => prev.filter(h => h !== id));
    toast.success('Item externo restaurado');
  };

  const handleSalvarMetas = () => {
    const m = { ...metasForm };
    Object.keys(m).forEach(k => {
      const v = parseFloat(m[k]);
      if (!isNaN(v)) m[k] = v;
    });
    // Receita mínima = fabricação + montagem (auto-calculado)
    m.receitaMinimaMensal = (m.fabricacaoKg * m.fabricacaoPrecoKg) + (m.montagemKg * m.montagemPrecoKg);
    setMetas(m);
    toast.success('Metas atualizadas');
    setMetasDialogOpen(false);
  };

  const handleAbrirMetas = () => {
    setMetasForm(metas);
    setMetasDialogOpen(true);
  };

  const handleMarcarAlertaLido = (alertId) => {
    setAlertasLidos(prev => [...prev, alertId]);
  };

  // ===== SIMULAÇÃO DE CENÁRIOS =====
  const cenarioCalc = useMemo(() => {
    const baseReceita = metasReal.receitaMes;
    const baseDespesa = metasReal.despesaMes;
    const novaReceita = baseReceita * (1 + cenario.aumentoReceitas / 100) + (cenario.receitaExtra || 0);
    const novaDespesa = baseDespesa * (1 - cenario.corteDespesas / 100) + (cenario.despesaExtra || 0);
    const novaProducaoReceita = cenario.novaProducaoFabKg * cenario.novoPrecoFabKg + (metas.montagemKg * metas.montagemPrecoKg);
    const novoLucro = novaReceita - novaDespesa;
    const novaMargem = novaReceita > 0 ? (novoLucro / novaReceita * 100) : 0;
    const economiaDespesas = baseDespesa - (baseDespesa * (1 - cenario.corteDespesas / 100));
    const ganhoReceita = (baseReceita * (cenario.aumentoReceitas / 100)) + cenario.receitaExtra;

    // Comparativo vs baseline
    const baseLucro = baseReceita - baseDespesa;
    const baseMargem = baseReceita > 0 ? (baseLucro / baseReceita * 100) : 0;
    return {
      baseReceita, baseDespesa, baseLucro, baseMargem,
      novaReceita, novaDespesa, novoLucro, novaMargem,
      economiaDespesas, ganhoReceita,
      deltaLucro: novoLucro - baseLucro,
      deltaMargem: novaMargem - baseMargem,
      novaProducaoReceita,
      novaProducaoDelta: novaProducaoReceita - metasReal.receitaTotalMeta,
      // runway (meses que o saldo atual dura)
      runwayMeses: novaDespesa > 0 ? (futuro.saldo30 / novaDespesa).toFixed(1) : '∞',
    };
  }, [cenario, metasReal, metas, futuro.saldo30]);

  // ===== EXPORT EXCEL =====
  const handleExportExcel = () => {
    const cols = [
      { header: 'Tipo', key: 'tipo' },
      { header: 'Origem', key: 'origemLabel' },
      { header: 'Data', key: 'data' },
      { header: 'Descrição', key: 'descricao' },
      { header: 'Fornecedor/Obra', key: 'fornecedor' },
      { header: 'Categoria', key: 'categoria' },
      { header: 'Valor', key: 'valor' },
      { header: 'Forma Pagto', key: 'formaPagto' },
      { header: 'Vencimento', key: 'vencimento' },
      { header: 'Status', key: 'status' },
    ];
    const rows = todasMovs.map(m => ({
      ...m,
      data: formatDate(m.data),
      vencimento: m.vencimento && m.vencimento !== '-' ? formatDate(m.vencimento) : '-',
      valor: m.valor || 0,
    }));
    const ts = new Date().toISOString().split('T')[0];
    exportToExcel(rows, cols, `painel-global-${ts}`);
    toast.success('Excel gerado');
  };

  // ===== EXPORT PDF EXECUTIVO =====
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210, M = 15;
      let y = 15;

      // Cabeçalho
      doc.setFillColor(124, 58, 237);
      doc.rect(0, 0, W, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text('PAINEL FINANCEIRO GLOBAL', M, 14);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Relatório gerado em ${new Date().toLocaleString('pt-BR')}`, M, 22);
      y = 38;

      // Score de saúde
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('SCORE DE SAÚDE FINANCEIRA', M, y); y += 6;
      const hex = scoreSaude.cor.replace('#', '');
      doc.setFillColor(parseInt(hex.slice(0,2), 16), parseInt(hex.slice(2,4), 16), parseInt(hex.slice(4,6), 16));
      doc.roundedRect(M, y, 40, 24, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20); doc.setFont('helvetica', 'bold');
      doc.text(String(scoreSaude.score), M + 20, y + 12, { align: 'center' });
      doc.setFontSize(8);
      doc.text('/100', M + 20, y + 18, { align: 'center' });
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text(scoreSaude.nivel, M + 45, y + 10);
      doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      scoreSaude.componentes.forEach((c, i) => {
        doc.text(`${c.nome}: ${c.score}/100 (peso ${c.peso}%)`, M + 45, y + 14 + i * 4);
      });
      y += 32;

      // KPIs do mês
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('INDICADORES DO MÊS ATUAL', M, y); y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      const kpisLinhas = [
        ['Receitas do mês:', formatCurrency(metasReal.receitaMes), `Meta: ${formatCurrency(metas.receitaMinimaMensal)}`],
        ['Despesas do mês:', formatCurrency(metasReal.despesaMes), `Teto: ${formatCurrency(metas.despesaTetoMensal)}`],
        ['Lucro / Margem:', formatCurrency(metasReal.receitaMes - metasReal.despesaMes), `${metasReal.margemReal.toFixed(1)}% (meta: ${metas.margemMinima}%)`],
        ['A receber (30d):', formatCurrency(futuro.receber30), `90d: ${formatCurrency(futuro.receber90)}`],
        ['A pagar (30d):', formatCurrency(futuro.pagar30), `90d: ${formatCurrency(futuro.pagar90)}`],
        ['Saldo projetado 30d:', formatCurrency(futuro.saldo30), `Min: ${formatCurrency(metas.saldoMinimo)}`],
      ];
      kpisLinhas.forEach(([label, val, sub]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, M, y);
        doc.setFont('helvetica', 'normal');
        doc.text(val, M + 50, y);
        doc.setTextColor(100, 116, 139);
        doc.text(sub, M + 100, y);
        doc.setTextColor(30, 41, 59);
        y += 5;
      });
      y += 4;

      // Comparativo
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('COMPARATIVO MÊS ATUAL × MÊS ANTERIOR', M, y); y += 6;
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      const comp = [
        ['Receitas:', formatCurrency(comparativo.atual.receitas), formatCurrency(comparativo.anterior.receitas), `${comparativo.deltaReceitas >= 0 ? '+' : ''}${comparativo.deltaReceitas.toFixed(1)}%`],
        ['Despesas:', formatCurrency(comparativo.atual.despesas), formatCurrency(comparativo.anterior.despesas), `${comparativo.deltaDespesas >= 0 ? '+' : ''}${comparativo.deltaDespesas.toFixed(1)}%`],
        ['Lucro:', formatCurrency(comparativo.atual.lucro), formatCurrency(comparativo.anterior.lucro), `${comparativo.deltaLucro >= 0 ? '+' : ''}${comparativo.deltaLucro.toFixed(1)}%`],
      ];
      doc.setFont('helvetica', 'bold');
      doc.text('Métrica', M, y); doc.text('Atual', M + 50, y); doc.text('Anterior', M + 100, y); doc.text('Δ', M + 140, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      comp.forEach(linha => {
        doc.text(linha[0], M, y);
        doc.text(linha[1], M + 50, y);
        doc.text(linha[2], M + 100, y);
        doc.setTextColor(linha[3].startsWith('+') ? 16 : 239, linha[3].startsWith('+') ? 185 : 68, linha[3].startsWith('+') ? 129 : 68);
        doc.text(linha[3], M + 140, y);
        doc.setTextColor(30, 41, 59);
        y += 5;
      });
      y += 4;

      // Top 5 alertas
      if (alertas.length > 0) {
        if (y > 220) { doc.addPage(); y = 15; }
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text(`ALERTAS PRIORITÁRIOS (Top ${Math.min(8, alertas.length)})`, M, y); y += 6;
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        alertas.slice(0, 8).forEach(a => {
          const nivel = a.nivel === 'vencido' ? '[VENCIDO]' : a.nivel === 'critico' ? `[CRÍTICO ${a.dias}d]` : `[ATENÇÃO ${a.dias}d]`;
          const cheque = a.ehCheque ? ' [CHEQUE]' : '';
          const linha = `${nivel}${cheque} ${a.titulo} — ${formatCurrency(a.valor)}`;
          const lines = doc.splitTextToSize(linha, W - 2 * M);
          lines.forEach(ln => { doc.text(ln, M, y); y += 4; });
          y += 1;
        });
      }

      doc.save(`painel-global-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF executivo gerado');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar PDF');
    }
  };

  // ===== DETECTAR MODO CHEQUE no Dialog Nova Movimentação =====
  // 🔧 Só ativa o modo "operação de cheque trocado" quando o usuário escolhe
  // EXPLICITAMENTE a categoria "Cheque Trocado (face)". Forma=Cheque sozinha
  // não basta — categorias como Juros de Cheque também podem ser pagas via
  // cheque mas são lançamentos simples (não operação multi-cheque).
  useEffect(() => {
    const ehCheque = formData.categoria === 'Cheque Trocado (face)';
    setChequeMode(ehCheque);
  }, [formData.categoria]);

  // Cálculo automático da operação de cheque (face, líquido, juros, taxa)
  const chequeOpCalc = useMemo(() => {
    const valorTotalFace = chequesList.reduce((s, c) => s + (parseFloat(c.valor) || 0), 0);
    const liquido = parseFloat(valorLiquidoCheque) || 0;
    const juros = valorTotalFace - liquido;
    const taxaPct = valorTotalFace > 0 ? (juros / valorTotalFace * 100) : 0;
    // Prazo médio (assumindo cheques ordenados por data)
    const chequesComData = chequesList.filter(c => c.vencimento).map(c => ({ ...c, dataObj: parseLocalDate(c.vencimento) }));
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const prazoMedioDias = chequesComData.length > 0
      ? chequesComData.reduce((s, c) => s + Math.max(0, (c.dataObj - hoje) / 86400000), 0) / chequesComData.length
      : 30;
    const prazoMedioMeses = Math.max(0.1, prazoMedioDias / 30);
    const taxaAnualizada = prazoMedioMeses > 0 ? (taxaPct * 12 / prazoMedioMeses) : 0;
    const isCaro = taxaAnualizada > metas.taxaAnualizadaMaxima;
    return { valorTotalFace, liquido, juros, taxaPct, prazoMedioDias, prazoMedioMeses, taxaAnualizada, isCaro };
  }, [chequesList, valorLiquidoCheque, metas.taxaAnualizadaMaxima]);

  // ===== ÚLTIMOS LANÇAMENTOS LOCAIS (criados aqui) =====
  // Agrupa por recorrenciaId/operacaoFinanceiraId para mostrar como "grupo" com qtd
  const ultimosLancamentos = useMemo(() => {
    const semDuplicar = new Set();
    const resultado = [];
    // Ordenar movsLocais por createdAt desc
    const ordenadas = [...movsLocais].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const db = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return db - da;
    });
    ordenadas.forEach(m => {
      const grupoKey = m.recorrenciaId || m.operacaoFinanceiraId;
      if (grupoKey) {
        if (semDuplicar.has(grupoKey)) return;
        semDuplicar.add(grupoKey);
        const grupo = movsLocais.filter(x =>
          x.recorrenciaId === grupoKey || x.operacaoFinanceiraId === grupoKey
        );
        const totalValor = grupo.reduce((s, x) => s + (x.tipo === 'receita' ? (x.valor||0) : -(x.valor||0)), 0);
        const descBase = m.descricao.replace(/\(Parcela \d+\/\d+\)/, '').replace(/—.*/, '').trim();
        resultado.push({
          ...m,
          ehGrupo: true,
          grupoKey,
          grupoTipo: m.recorrenciaId ? 'recorrencia' : 'operacao',
          qtdNoGrupo: grupo.length,
          valorTotalGrupo: Math.abs(totalValor),
          descricao: descBase,
        });
      } else {
        resultado.push({ ...m, ehGrupo: false });
      }
    });
    return resultado.slice(0, 15);
  }, [movsLocais]);

  // ===== ANÁLISE DE DESPESAS FINANCEIRAS =====
  const despesasFinanceiras = useMemo(() => {
    const items = todasMovs.filter(m =>
      m.tipo === 'despesa' && CATEGORIAS_FINANCEIRAS.includes(m.categoria)
    );
    const total = items.reduce((s, m) => s + (m.valor || 0), 0);
    const porCategoria = {};
    items.forEach(m => {
      porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + (m.valor || 0);
    });
    // Calcula % do total geral de despesas
    const pctDoTotal = kpis.totD > 0 ? (total / kpis.totD * 100) : 0;
    return {
      items, total, porCategoria, pctDoTotal,
      qtd: items.length,
      categorias: Object.entries(porCategoria).map(([nome, valor]) => ({
        nome, valor, cor: CORES_CATEGORIAS[nome] || '#dc2626',
      })).sort((a, b) => b.valor - a.valor),
    };
  }, [todasMovs, kpis.totD]);

  // ===== CÁLCULO DA OPERAÇÃO FINANCEIRA (preview em tempo real) =====
  const opFinCalc = useMemo(() => {
    const face = parseFloat(opFin.valorFace) || 0;
    const liquido = parseFloat(opFin.valorLiquido) || 0;
    const juros = face - liquido;
    const taxaPct = face > 0 ? (juros / face * 100) : 0;
    const valorParcela = opFin.parcelas > 0 ? face / opFin.parcelas : 0;

    // Calcular datas das parcelas — usa parseLocalDate para evitar shift de timezone
    const datasParcelas = [];
    if (opFin.primeiroVencimento) {
      const base = parseLocalDate(opFin.primeiroVencimento);
      for (let i = 0; i < opFin.parcelas; i++) {
        const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (i * opFin.intervaloDias));
        // Salvar como YYYY-MM-DD usando componentes locais (não toISOString que vira UTC)
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        datasParcelas.push({
          numero: i + 1,
          data: `${yyyy}-${mm}-${dd}`,
          dataLabel: d.toLocaleDateString('pt-BR'),
          valor: valorParcela,
        });
      }
    }
    // Custo efetivo anualizado aproximado (taxa × 12 / (prazoMedio em meses))
    const prazoMedio = opFin.parcelas > 0 ? ((opFin.parcelas + 1) / 2) * (opFin.intervaloDias / 30) : 1;
    const taxaAnualizada = prazoMedio > 0 ? (taxaPct * 12 / prazoMedio) : 0;

    // Operação é "cara" se taxa anualizada > threshold das metas
    const isCaro = taxaAnualizada > metas.taxaAnualizadaMaxima;
    // Severidade: leve (≤ 1.2x), médio (≤ 1.5x), grave (> 1.5x)
    const nivelCaro = !isCaro ? null
      : taxaAnualizada > metas.taxaAnualizadaMaxima * 1.5 ? 'grave'
      : taxaAnualizada > metas.taxaAnualizadaMaxima * 1.2 ? 'medio'
      : 'leve';

    // IMPACTO ANTES × DEPOIS no caixa
    // Antes: situação atual de saldo
    const antes = {
      saldo30: futuro.saldo30,
      saldo60: futuro.saldo60,
      saldo90: futuro.saldo90,
      receber30: futuro.receber30,
      pagar30: futuro.pagar30,
    };
    // Depois: aplica a operação na projeção
    //  - Hoje: +liquido (receita) -juros (despesa) → entra liquido líquido no caixa hoje
    //  - Próximos 30/60/90: somar parcelas em despesas conforme datas
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    let parcelas30 = 0, parcelas60 = 0, parcelas90 = 0;
    datasParcelas.forEach(p => {
      const d = parseLocalDate(p.data);
      const dias = Math.round((d - hoje) / 86400000);
      if (dias <= 30) parcelas30 += p.valor;
      if (dias <= 60) parcelas60 += p.valor;
      if (dias <= 90) parcelas90 += p.valor;
    });
    // Entrada de caixa hoje = liquido (não vai mudar saldoXd pois é "agora" — adicionamos como receita)
    const depois = {
      saldo30: antes.saldo30 + liquido - parcelas30,
      saldo60: antes.saldo60 + liquido - parcelas60,
      saldo90: antes.saldo90 + liquido - parcelas90,
      receber30: antes.receber30 + liquido,
      pagar30: antes.pagar30 + parcelas30,
    };

    return {
      face, liquido, juros, taxaPct, valorParcela, datasParcelas,
      prazoMedio, taxaAnualizada, isCaro, nivelCaro,
      antes, depois,
      deltaSaldo30: depois.saldo30 - antes.saldo30,
      deltaSaldo90: depois.saldo90 - antes.saldo90,
    };
  }, [opFin, metas.taxaAnualizadaMaxima, futuro.saldo30, futuro.saldo60, futuro.saldo90, futuro.receber30, futuro.pagar30]);

  // ===== TIMELINE DE OPERAÇÕES FINANCEIRAS (próximos 12 meses) =====
  const opsFinanceirasTimeline = useMemo(() => {
    // Agrupar todos os lançamentos que têm operacaoFinanceiraId
    const ops = {};
    movsLocais.forEach(m => {
      if (!m.operacaoFinanceiraId) return;
      if (!ops[m.operacaoFinanceiraId]) {
        ops[m.operacaoFinanceiraId] = {
          id: m.operacaoFinanceiraId,
          label: m.operacaoLabel || 'Operação',
          descricao: m.descricao.split('—')[1]?.trim() || m.descricao,
          parcelas: [],
          juros: 0,
          liquido: 0,
          face: 0,
          dataInicio: null,
          dataFim: null,
        };
      }
      const op = ops[m.operacaoFinanceiraId];
      if (m.tipo === 'receita' && m.categoria === 'Cheque Trocado (Líquido)') {
        op.liquido = m.valor;
        op.dataInicio = m.data;
      } else if (m.categoria === 'Juros de Cheque' || m.categoria === 'Juros de Atraso') {
        op.juros = m.valor;
      } else if (m.categoria === 'Cheque Trocado (face)' || m.categoria === 'Empréstimo') {
        op.parcelas.push({ data: m.vencimento || m.data, valor: m.valor, status: m.status });
        op.face += m.valor;
        if (!op.dataFim || parseLocalDate(m.vencimento || m.data) > parseLocalDate(op.dataFim)) {
          op.dataFim = m.vencimento || m.data;
        }
      }
    });

    const operacoesArr = Object.values(ops).map(op => {
      const taxa = op.liquido > 0 ? (op.juros / op.face * 100) : 0;
      const prazoMeses = op.dataInicio && op.dataFim
        ? Math.max(1, Math.round((parseLocalDate(op.dataFim) - parseLocalDate(op.dataInicio)) / (30 * 86400000)))
        : 1;
      const taxaAnual = taxa * 12 / prazoMeses;
      const pago = op.parcelas.filter(p => p.status === 'pago').reduce((s,p)=>s+p.valor, 0);
      const pendente = op.parcelas.filter(p => p.status !== 'pago').reduce((s,p)=>s+p.valor, 0);
      return {
        ...op,
        taxa, taxaAnual, prazoMeses, pago, pendente,
        isCaro: taxaAnual > metas.taxaAnualizadaMaxima,
      };
    });

    // Cronograma agregado: próximos 12 meses
    const hoje = new Date();
    const cronograma = [];
    for (let i = 0; i < 12; i++) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mesFim = new Date(hoje.getFullYear(), hoje.getMonth() + i + 1, 0);
      const label = mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      let capital = 0, juros = 0;
      operacoesArr.forEach(op => {
        op.parcelas.forEach(p => {
          const d = parseLocalDate(p.data);
          if (d >= mes && d <= mesFim && p.status !== 'pago') {
            capital += p.valor;
          }
        });
      });
      // Distribui juros proporcionalmente entre parcelas pendentes (aproximação)
      operacoesArr.forEach(op => {
        if (op.juros > 0 && op.face > 0) {
          op.parcelas.forEach(p => {
            const d = parseLocalDate(p.data);
            if (d >= mes && d <= mesFim && p.status !== 'pago') {
              juros += (op.juros * p.valor) / op.face;
            }
          });
        }
      });
      cronograma.push({
        mes: label,
        capital,
        juros,
        total: capital + juros,
      });
    }

    return { operacoes: operacoesArr, cronograma, totalOperacoes: operacoesArr.length };
  }, [movsLocais, metas.taxaAnualizadaMaxima]);

  // ===== COMPARAÇÃO AUTOMÁTICA — Ranking de operações =====
  const rankingOps = useMemo(() => {
    const ops = opsFinanceirasTimeline.operacoes;
    if (ops.length === 0) return null;

    // Calcular médias para comparações relativas
    const mediaTaxa = ops.reduce((s,o)=>s+o.taxa, 0) / ops.length;
    const mediaAnual = ops.reduce((s,o)=>s+o.taxaAnual, 0) / ops.length;
    const mediaJuros = ops.reduce((s,o)=>s+o.juros, 0) / ops.length;

    const opsComMotivo = ops.map(op => {
      const motivos = [];
      // Por que ela é cara?
      if (op.taxaAnual > metas.taxaAnualizadaMaxima * 1.5) motivos.push({ tipo: 'critico', texto: `Taxa anualizada ${op.taxaAnual.toFixed(1)}% a.a. — ${((op.taxaAnual/metas.taxaAnualizadaMaxima - 1) * 100).toFixed(0)}% acima do limite` });
      else if (op.taxaAnual > metas.taxaAnualizadaMaxima) motivos.push({ tipo: 'aviso', texto: `Taxa anualizada ${op.taxaAnual.toFixed(1)}% a.a. acima do limite (${metas.taxaAnualizadaMaxima}% a.a.)` });

      if (op.taxa > mediaTaxa * 1.3 && ops.length > 1) motivos.push({ tipo: 'aviso', texto: `Taxa nominal ${op.taxa.toFixed(1)}% — ${((op.taxa/mediaTaxa - 1) * 100).toFixed(0)}% acima da média das operações` });
      if (op.juros > mediaJuros * 1.5 && ops.length > 1) motivos.push({ tipo: 'aviso', texto: `Juros absolutos ${formatCurrency(op.juros)} — ${((op.juros/mediaJuros - 1) * 100).toFixed(0)}% acima da média` });
      if (op.prazoMeses < 3 && op.taxa > 8) motivos.push({ tipo: 'aviso', texto: `Prazo curto (${op.prazoMeses}m) com taxa alta — desconto desfavorável` });
      if (op.juros / metas.fabricacaoPrecoKg / 1000 > 1) motivos.push({ tipo: 'info', texto: `Custo equivale a ${(op.juros / metas.fabricacaoPrecoKg / 1000).toFixed(1)}t de fabricação` });

      // Score de "custo" — quanto maior, pior
      const scoreCusto = op.taxaAnual * 1.5 + (op.juros / 1000);
      return { ...op, motivos, scoreCusto, isMaisCaraTaxa: false, isMaisCaraValor: false };
    });

    // Marcar a mais cara em taxa anualizada e em valor absoluto
    const maisCaraTaxa = opsComMotivo.reduce((a, b) => b.taxaAnual > a.taxaAnual ? b : a);
    const maisCaraValor = opsComMotivo.reduce((a, b) => b.juros > a.juros ? b : a);
    maisCaraTaxa.isMaisCaraTaxa = true;
    maisCaraValor.isMaisCaraValor = true;

    // Mais barata
    const maisBarata = opsComMotivo.reduce((a, b) => b.taxaAnual < a.taxaAnual ? b : a);

    return {
      todas: opsComMotivo.sort((a,b) => b.scoreCusto - a.scoreCusto),
      maisCaraTaxa, maisCaraValor, maisBarata,
      mediaTaxa, mediaAnual, mediaJuros,
      totalJuros: ops.reduce((s,o)=>s+o.juros, 0),
      totalFace: ops.reduce((s,o)=>s+o.face, 0),
    };
  }, [opsFinanceirasTimeline.operacoes, metas.taxaAnualizadaMaxima, metas.fabricacaoPrecoKg]);

  // ===== CALCULADORA REVERSA =====
  const [calcReversaOpen, setCalcReversaOpen] = useState(false);
  const [calcRev, setCalcRev] = useState({
    modo: 'liquido_max',     // 'liquido_max' = quero pagar máximo X% → líquido?
                              // 'face_max' = recebo X líquido com Y% max → face?
    valorFace: '100000',     // R$
    valorLiquido: '90000',   // R$
    taxaMaxima: '50',        // % a.a.
    parcelas: 3,
    intervaloDias: 30,
  });

  const calcReversaResultado = useMemo(() => {
    const face = parseFloat(calcRev.valorFace) || 0;
    const liquido = parseFloat(calcRev.valorLiquido) || 0;
    const taxaMaxAnual = parseFloat(calcRev.taxaMaxima) || 0;
    const prazoMeses = calcRev.parcelas * (calcRev.intervaloDias / 30) / 2 + (calcRev.intervaloDias / 30) / 2;
    // Converte taxa anual em taxa do período da operação
    const taxaPeriodoMaxPct = taxaMaxAnual * prazoMeses / 12;

    if (calcRev.modo === 'liquido_max') {
      // Quero descontar/financiar R$ face com no máximo Y% a.a. — quanto MÍNIMO recebo líquido?
      const jurosMaximo = face * (taxaPeriodoMaxPct / 100);
      const liquidoMinimo = face - jurosMaximo;
      return {
        modo: 'liquido_max',
        inputFace: face, inputTaxaMax: taxaMaxAnual,
        liquidoMinimo, jurosMaximo,
        taxaPeriodoMaxPct,
        // Se aceitar essa taxa, em ton de produção
        tonsPerdidas: jurosMaximo / metas.fabricacaoPrecoKg / 1000,
      };
    } else {
      // Recebo R$ líquido — qual MÁXIMO valor de face aceitável para não passar de Y% a.a.?
      const taxaFator = taxaPeriodoMaxPct / 100;
      const faceMaximo = taxaFator < 1 ? liquido / (1 - taxaFator) : Infinity;
      const jurosMaximo = faceMaximo - liquido;
      return {
        modo: 'face_max',
        inputLiquido: liquido, inputTaxaMax: taxaMaxAnual,
        faceMaximo, jurosMaximo,
        taxaPeriodoMaxPct,
        tonsPerdidas: jurosMaximo / metas.fabricacaoPrecoKg / 1000,
      };
    }
  }, [calcRev, metas.fabricacaoPrecoKg]);

  // ===== EXPORT PDF CRONOGRAMA =====
  const handleExportCronogramaPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = 210, M = 12;
      let y = 15;

      // Cabeçalho
      doc.setFillColor(234, 88, 12);
      doc.rect(0, 0, W, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18); doc.setFont('helvetica', 'bold');
      doc.text('CRONOGRAMA DE OPERAÇÕES FINANCEIRAS', M, 14);
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} • ${opsFinanceirasTimeline.totalOperacoes} operação(ões) ativa(s)`, M, 22);
      y = 38;

      doc.setTextColor(30, 41, 59);

      if (rankingOps) {
        // Sumário Executivo
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text('SUMÁRIO EXECUTIVO', M, y); y += 6;
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        const itens = [
          ['Total de operações:', `${rankingOps.todas.length}`],
          ['Total face (a pagar):', formatCurrency(rankingOps.totalFace)],
          ['Total juros:', formatCurrency(rankingOps.totalJuros)],
          ['Taxa anualizada média:', `${rankingOps.mediaAnual.toFixed(1)}% a.a.`],
          ['Operação mais cara (taxa):', `${rankingOps.maisCaraTaxa.descricao.slice(0,40)} — ${rankingOps.maisCaraTaxa.taxaAnual.toFixed(1)}% a.a.`],
          ['Operação mais cara (R$):', `${rankingOps.maisCaraValor.descricao.slice(0,40)} — ${formatCurrency(rankingOps.maisCaraValor.juros)}`],
          ['Operação mais barata:', `${rankingOps.maisBarata.descricao.slice(0,40)} — ${rankingOps.maisBarata.taxaAnual.toFixed(1)}% a.a.`],
        ];
        itens.forEach(([k, v]) => {
          doc.setFont('helvetica', 'bold'); doc.text(k, M, y);
          doc.setFont('helvetica', 'normal'); doc.text(v, M + 60, y);
          y += 5;
        });
        y += 4;

        // Ranking detalhado
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text('RANKING POR CUSTO (do pior para o melhor)', M, y); y += 6;
        doc.setFontSize(8);
        rankingOps.todas.forEach((op, idx) => {
          if (y > 265) { doc.addPage(); y = 15; }
          // Caixa
          doc.setDrawColor(op.isCaro ? 220 : 100, op.isCaro ? 38 : 116, op.isCaro ? 38 : 139);
          doc.setLineWidth(0.5);
          doc.rect(M, y - 3, W - 2 * M, 24);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 41, 59);
          doc.text(`#${idx + 1} ${op.label} — ${op.descricao.slice(0, 60)}`, M + 2, y + 1);
          doc.setFont('helvetica', 'normal');
          doc.text(`Face: ${formatCurrency(op.face)} | Líquido: ${formatCurrency(op.liquido)} | Juros: ${formatCurrency(op.juros)}`, M + 2, y + 6);
          doc.text(`Taxa: ${op.taxa.toFixed(2)}% (${op.taxaAnual.toFixed(1)}% a.a.) | Prazo: ${op.prazoMeses}m | ${op.parcelas.length} parcelas`, M + 2, y + 11);
          if (op.motivos.length > 0) {
            doc.setFontSize(7); doc.setTextColor(180, 83, 9);
            doc.text(`⚠ ${op.motivos[0].texto.slice(0, 90)}`, M + 2, y + 16);
            doc.setFontSize(8); doc.setTextColor(30, 41, 59);
          }
          y += 28;
        });
      }

      // Cronograma mensal
      if (y > 240) { doc.addPage(); y = 15; }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('CRONOGRAMA MENSAL (próximos 12 meses)', M, y); y += 6;
      doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('Mês', M, y);
      doc.text('Capital', M + 60, y);
      doc.text('Juros', M + 110, y);
      doc.text('Total', M + 160, y);
      y += 4;
      doc.setLineWidth(0.3);
      doc.line(M, y - 1, W - M, y - 1);
      doc.setFont('helvetica', 'normal');
      opsFinanceirasTimeline.cronograma.forEach(c => {
        if (y > 275) { doc.addPage(); y = 15; }
        doc.text(c.mes, M, y);
        doc.text(formatCurrency(c.capital), M + 60, y);
        doc.text(formatCurrency(c.juros), M + 110, y);
        doc.setFont('helvetica', 'bold');
        doc.text(formatCurrency(c.total), M + 160, y);
        doc.setFont('helvetica', 'normal');
        y += 4;
      });

      doc.save(`cronograma-operacoes-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Cronograma PDF gerado');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao gerar PDF');
    }
  };



  const handleCriarOperacaoFinanceira = () => {
    if (!opFin.descricao || !opFin.valorFace) {
      toast.error('Descrição e valor de face são obrigatórios');
      return;
    }
    if (opFinCalc.face <= 0) {
      toast.error('Valor de face deve ser maior que zero');
      return;
    }

    const novos = [];
    const baseId = `OPFIN-${Date.now()}`;
    const opLabel = {
      cheque_trocado: 'Cheque Trocado',
      emprestimo: 'Empréstimo',
      financiamento: 'Financiamento',
      renegociacao: 'Renegociação',
    }[opFin.tipo] || 'Operação Financeira';

    // 1. Receita líquida recebida (entrada de caixa hoje)
    if (opFinCalc.liquido > 0) {
      novos.push({
        id: `${baseId}-receita-liq`,
        tipo: 'receita',
        descricao: `${opLabel} — Líquido recebido: ${opFin.descricao}`,
        fornecedor: opFin.fornecedor || '-',
        categoria: opFin.tipo === 'cheque_trocado' ? 'Cheque Trocado (Líquido)' : 'Outros',
        valor: opFinCalc.liquido,
        formaPagto: 'Transferência',
        vencimento: opFin.dataOperacao,
        data: opFin.dataOperacao,
        status: 'pago',
        obraId: opFin.obraId || null,
        operacaoFinanceiraId: baseId,
        operacaoLabel: opLabel,
        createdAt: new Date().toISOString(),
      });
    }

    // 2. Despesa de Juros (diferença entre face e líquido)
    if (opFinCalc.juros > 0) {
      const catJuros = opFin.tipo === 'cheque_trocado' ? 'Juros de Cheque'
        : opFin.tipo === 'emprestimo' ? 'Empréstimo'
        : opFin.tipo === 'financiamento' ? 'Financiamento'
        : 'Renegociação';
      novos.push({
        id: `${baseId}-juros`,
        tipo: 'despesa',
        descricao: `${opLabel} — Juros/IOF: ${opFin.descricao} (${opFinCalc.taxaPct.toFixed(2)}%, ~${opFinCalc.taxaAnualizada.toFixed(1)}% a.a.)`,
        fornecedor: opFin.fornecedor || '-',
        categoria: catJuros,
        valor: opFinCalc.juros,
        formaPagto: 'Operação Bancária',
        vencimento: opFin.dataOperacao,
        data: opFin.dataOperacao,
        status: 'pago',
        obraId: opFin.obraId || null,
        operacaoFinanceiraId: baseId,
        operacaoLabel: opLabel,
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Para CHEQUES TROCADOS: criar N parcelas FUTURAS como despesa (compromisso de pagamento)
    //    Para EMPRÉSTIMOS/FINANCIAMENTOS: idem (parcelas a pagar)
    opFinCalc.datasParcelas.forEach(p => {
      const isReceberDeCheque = opFin.tipo === 'cheque_trocado';
      novos.push({
        id: `${baseId}-parcela-${p.numero}`,
        tipo: isReceberDeCheque ? 'despesa' : 'despesa',
        // Cheque trocado: parcela é DESPESA (eu vou pagar de volta ao banco quando o cheque do cliente compensar — na prática é meu passivo)
        // Empréstimo: parcela a pagar
        descricao: `${opLabel} — Parcela ${p.numero}/${opFin.parcelas}: ${opFin.descricao}`,
        fornecedor: opFin.fornecedor || '-',
        categoria: opFin.tipo === 'cheque_trocado' ? 'Cheque Trocado (face)' : 'Empréstimo',
        valor: p.valor,
        formaPagto: opFin.tipo === 'cheque_trocado' ? 'Cheque' : 'Boleto',
        vencimento: p.data,
        data: p.data,
        status: 'pendente',
        obraId: opFin.obraId || null,
        operacaoFinanceiraId: baseId,
        operacaoLabel: opLabel,
        createdAt: new Date().toISOString(),
      });
    });

    setMovsLocais(prev => [...prev, ...novos]);
    toast.success(`${opLabel} criado: ${novos.length} lançamentos gerados`);
    setOpFinDialogOpen(false);
    // Reset form
    setOpFin({
      tipo: 'cheque_trocado', descricao: '', fornecedor: '',
      valorFace: '', valorLiquido: '',
      parcelas: 3, primeiroVencimento: new Date().toISOString().split('T')[0],
      intervaloDias: 30, dataOperacao: new Date().toISOString().split('T')[0],
      obraId: '',
    });
  };

  const categoriasDisponiveis = [
    // Operacionais
    'Matéria Prima','Mão de Obra','Energia/Utilidades','Manutenção',
    'Transporte','Administrativo','Impostos','Medição','Serviço Avulso',
    // Despesas Extras / Financeiras
    'Juros de Cheque','Juros de Atraso','Cheque Especial',
    'Empréstimo','Financiamento','Renegociação','IOF/Taxas Bancárias','Desconto de Cheques',
    // Receitas de operação
    'Cheque Trocado (face)','Cheque Trocado (Líquido)',
    'Outros',
  ];

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
              <Shield className="h-6 w-6 text-white" />
            </div>
            Painel Financeiro Global
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-sm font-medium border border-purple-500/30">
              <Lock className="h-3.5 w-3.5 mr-1" />
              Módulo Isolado
            </span>
            <span className="text-slate-500 text-sm">|</span>
            <span className="text-slate-400 text-sm">{kpis.qtdTotal} mov.</span>
            <span className="text-emerald-400 text-xs">{kpis.qtdR} receitas</span>
            <span className="text-rose-400 text-xs">{kpis.qtdD} despesas</span>
            {kpis.qtdLocal > 0 && (
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                {kpis.qtdLocal} locais
              </Badge>
            )}
            {kpis.qtdOv > 0 && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                {kpis.qtdOv} edit.
              </Badge>
            )}
            {alertasNaoLidos.length > 0 && (
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs animate-pulse">
                <Bell className="h-3 w-3 mr-1" />{alertasNaoLidos.length} alertas
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white">
                <Download className="h-4 w-4 mr-2" />Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem className="text-slate-300 focus:text-white focus:bg-slate-700" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />PDF Executivo
              </DropdownMenuItem>
              <DropdownMenuItem className="text-slate-300 focus:text-white focus:bg-slate-700" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />Excel Movimentações
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white" onClick={handleAbrirMetas}>
            <Target className="h-4 w-4 mr-2" />Metas
          </Button>
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white" onClick={() => setResetDialogOpen(true)} disabled={movsLocais.length === 0 && Object.keys(overridesLocais).length === 0 && hiddenLocais.length === 0}>
            <RotateCcw className="h-4 w-4 mr-2" />Reset
          </Button>
          <Button variant="outline" className="border-amber-700/40 text-amber-300 hover:bg-amber-900/20" onClick={() => setOpFinDialogOpen(true)}>
            <Percent className="h-4 w-4 mr-2" />Operação Financeira
          </Button>
          <Button className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600" onClick={() => handleNova('despesa')}>
            <Plus className="h-4 w-4 mr-2" />Nova Movimentação
          </Button>
        </div>
      </div>

      {/* BANNER + ALERTAS RESUMIDOS */}
      {alertasNaoLidos.length > 0 && (
        <div className="bg-gradient-to-r from-red-900/30 to-amber-900/30 rounded-xl border border-red-700/30 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <strong className="text-red-200">Top {Math.min(3, alertasNaoLidos.length)} alertas críticos</strong>
                <button onClick={() => setActiveTab('alertas')} className="text-xs text-red-300 underline hover:text-red-100">Ver todos →</button>
              </div>
              <div className="space-y-1.5">
                {alertasNaoLidos.slice(0, 3).map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Badge className={cn("text-[10px]",
                        a.nivel === 'vencido' ? 'bg-red-700/40 text-red-200' :
                        a.nivel === 'critico' ? 'bg-red-500/30 text-red-300' :
                        'bg-amber-500/30 text-amber-300'
                      )}>
                        {a.nivel === 'vencido' ? 'VENCIDO' : a.nivel === 'critico' ? `${a.dias}d` : `${a.dias}d`}
                      </Badge>
                      {a.ehCheque && <Badge className="bg-blue-500/30 text-blue-300 text-[10px]">CHEQUE</Badge>}
                      {a.valorAlto && <Badge className="bg-purple-500/30 text-purple-300 text-[10px]">ALTO</Badge>}
                      {a.ehOpFinanceira && <Badge className="bg-rose-500/40 text-rose-200 text-[10px]">💸 OP FIN</Badge>}
                      <span className="text-slate-200 truncate">{a.titulo}</span>
                    </div>
                    <span className={cn("font-semibold", a.tipo === 'pagamento' ? 'text-red-300' : 'text-emerald-300')}>
                      {formatCurrency(a.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTROS GLOBAIS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" />
          <Select value={filtroObra} onValueChange={setFiltroObra}>
            <SelectTrigger className="w-[220px] bg-slate-800 border-slate-700 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {opcoesObra.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          {[
            { value: 'geral', label: 'Geral' },
            { value: 'semanal', label: '7d' },
            { value: 'mensal', label: '30d' },
            { value: 'trimestral', label: '90d' },
          ].map(p => (
            <button key={p.value} onClick={() => setFiltroPeriodo(p.value)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                filtroPeriodo === p.value ? "bg-purple-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"
              )}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-900/60 border border-slate-700/50 flex-wrap h-auto">
          <TabsTrigger value="visao"><BarChart3 className="h-4 w-4 mr-1" />Visão Geral</TabsTrigger>
          <TabsTrigger value="receitas"><ArrowUpRight className="h-4 w-4 mr-1" />Receitas</TabsTrigger>
          <TabsTrigger value="despesas"><ArrowDownRight className="h-4 w-4 mr-1" />Despesas</TabsTrigger>
          <TabsTrigger value="futuro"><TrendUp className="h-4 w-4 mr-1" />Fluxo Futuro</TabsTrigger>
          <TabsTrigger value="metas"><Target className="h-4 w-4 mr-1" />Metas</TabsTrigger>
          <TabsTrigger value="alertas">
            <Bell className="h-4 w-4 mr-1" />Alertas
            {alertasNaoLidos.length > 0 && <Badge className="ml-2 bg-red-500/30 text-red-200 text-[10px] px-1.5">{alertasNaoLidos.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="cenarios"><FlaskConical className="h-4 w-4 mr-1" />Cenários</TabsTrigger>
        </TabsList>

        {/* =========================================== */}
        {/* TAB 1: VISÃO GERAL                           */}
        {/* =========================================== */}
        <TabsContent value="visao" className="space-y-6">
          {/* ============================== */}
          {/* ÚLTIMOS LANÇAMENTOS LOCAIS    */}
          {/* ============================== */}
          {ultimosLancamentos.length > 0 && (
            <Card className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border-purple-700/40">
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-purple-400" />Últimos Lançamentos Locais
                  <Badge className="bg-purple-500/30 text-purple-200 text-xs">{movsLocais.length} total</Badge>
                </CardTitle>
                <span className="text-xs text-slate-400">Editáveis e exclusíveis individualmente ou em grupo</span>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {ultimosLancamentos.map((mov, idx) => (
                    <div key={mov.ehGrupo ? mov.grupoKey : mov.id} className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 rounded-lg p-3 flex items-center justify-between gap-3 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {mov.ehGrupo && (
                            <Badge className={cn("text-[10px]",
                              mov.grupoTipo === 'recorrencia' ? "bg-cyan-500/30 text-cyan-200" : "bg-amber-500/30 text-amber-200"
                            )}>
                              {mov.grupoTipo === 'recorrencia' ? `${mov.qtdNoGrupo} parcelas` : `Operação ${mov.qtdNoGrupo} lançs`}
                            </Badge>
                          )}
                          <Badge className={cn("text-[10px]",
                            mov.tipo === 'receita' ? "bg-emerald-500/30 text-emerald-200" : "bg-red-500/30 text-red-200"
                          )}>
                            {mov.tipo === 'receita' ? 'Receita' : 'Despesa'}
                          </Badge>
                          {mov.categoria && (
                            <span className="text-[10px] text-slate-400">{mov.categoria}</span>
                          )}
                          {mov.createdAt && (
                            <span className="text-[10px] text-slate-500">
                              criado {new Date(mov.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white font-medium truncate">{mov.descricao}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {mov.fornecedor || '-'} • Vencimento {formatDate(mov.vencimento || mov.data)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn("text-base font-bold",
                          mov.tipo === 'receita' ? "text-emerald-400" : "text-red-400"
                        )}>
                          {mov.tipo === 'receita' ? '+' : '-'} {formatCurrency(mov.ehGrupo ? mov.valorTotalGrupo : mov.valor)}
                        </p>
                        {mov.ehGrupo && (
                          <p className="text-[10px] text-slate-500">
                            {formatCurrency(mov.valor)} × {mov.qtdNoGrupo}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!mov.ehGrupo && (
                          <button onClick={() => handleEditar(mov)}
                            className="p-1.5 rounded text-cyan-400 hover:bg-cyan-500/20" title="Editar">
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded text-red-400 hover:bg-red-500/20" title="Excluir">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                            {mov.ehGrupo ? (
                              <>
                                <DropdownMenuItem
                                  className="text-red-400 focus:text-red-300 focus:bg-slate-700"
                                  onClick={() => handleApagarGrupo(
                                    mov.grupoTipo === 'recorrencia' ? 'recorrenciaId' : 'operacaoFinanceiraId',
                                    mov.grupoKey
                                  )}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Apagar TODAS as {mov.qtdNoGrupo} {mov.grupoTipo === 'recorrencia' ? 'parcelas' : 'lançamentos da operação'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-amber-400 focus:text-amber-300 focus:bg-slate-700"
                                  onClick={() => setDeleteConfirmId(mov.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Apagar só esta linha (1 de {mov.qtdNoGrupo})
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                className="text-red-400 focus:text-red-300 focus:bg-slate-700"
                                onClick={() => setDeleteConfirmId(mov.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />Apagar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
                {movsLocais.length > 15 && (
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Mostrando 15 mais recentes — veja todos na lista de Movimentações abaixo
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* SCORE DE SAÚDE + COMPARATIVO */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Score de saúde financeira */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2 text-sm">
                  <Heart className="h-4 w-4 text-rose-400" />Score Saúde Financeira
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <svg className="w-24 h-24 -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="#1e293b" strokeWidth="8" fill="none" />
                      <circle cx="48" cy="48" r="40" stroke={scoreSaude.cor} strokeWidth="8" fill="none"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - scoreSaude.score / 100)}`}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white">{scoreSaude.score}</span>
                      <span className="text-[10px] text-slate-500">/100</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold" style={{ color: scoreSaude.cor }}>{scoreSaude.nivel}</p>
                    <div className="space-y-1 mt-2">
                      {scoreSaude.componentes.slice(0, 3).map((c, i) => (
                        <div key={i} className="text-[10px] text-slate-400 flex justify-between gap-2">
                          <span className="truncate">{c.nome}</span>
                          <span className="font-semibold text-white">{c.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comparativo Mês Atual × Anterior */}
            <Card className="bg-slate-900/60 border-slate-700/50 lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4 text-cyan-400" />Comparativo Mês Atual × Anterior
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Receitas', atual: comparativo.atual.receitas, ant: comparativo.anterior.receitas, delta: comparativo.deltaReceitas, cor: 'emerald', invertido: false },
                    { label: 'Despesas', atual: comparativo.atual.despesas, ant: comparativo.anterior.despesas, delta: comparativo.deltaDespesas, cor: 'red', invertido: true },
                    { label: 'Lucro', atual: comparativo.atual.lucro, ant: comparativo.anterior.lucro, delta: comparativo.deltaLucro, cor: 'blue', invertido: false },
                  ].map((c, i) => {
                    const sucesso = c.invertido ? c.delta <= 0 : c.delta >= 0;
                    return (
                      <div key={i} className="bg-slate-800/40 rounded-lg p-3">
                        <p className="text-xs text-slate-400">{c.label}</p>
                        <p className={`text-base font-bold text-${c.cor}-400 mt-1 truncate`}>{formatCurrency(c.atual)}</p>
                        <p className="text-[10px] text-slate-500 truncate">Anterior: {formatCurrency(c.ant)}</p>
                        <div className={cn("flex items-center gap-1 mt-2 text-xs font-semibold", sucesso ? 'text-emerald-400' : 'text-red-400')}>
                          {c.delta >= 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {Math.abs(c.delta).toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPISimple icon={ArrowUpRight} color="emerald" label="Receitas" value={formatCurrency(kpis.totR)} sub={`${kpis.qtdR} lançamentos`} />
            <KPISimple icon={ArrowDownRight} color="red" label="Despesas" value={formatCurrency(kpis.totD)} sub={`${kpis.qtdD} lançamentos`} />
            <KPISimple icon={TrendingUp} color={kpis.lucro >= 0 ? "blue" : "red"} label="Lucro" value={formatCurrency(kpis.lucro)} sub={`Margem: ${kpis.margem.toFixed(1)}%`} />
            <KPISimple icon={Clock} color="amber" label="A Receber" value={formatCurrency(kpis.recPendentes)} sub={`A pagar: ${formatCurrency(kpis.despPendentes)}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-slate-900/60 border-slate-700/50 lg:col-span-2">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><BarChart3 className="h-5 w-5 text-purple-400" />Evolução Receitas vs Despesas</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={evolucaoMensal} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="mes" stroke="#64748b" />
                    <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(value) => formatCurrency(value)} />
                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader><CardTitle className="text-white flex items-center gap-2"><Receipt className="h-5 w-5 text-rose-400" />Despesas por Categoria</CardTitle></CardHeader>
              <CardContent>
                {dadosPizzaDespesas.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={dadosPizzaDespesas} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="valor">
                        {dadosPizzaDespesas.map((e, i) => <Cell key={i} fill={e.cor} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(v) => formatCurrency(v)} />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-[280px] flex items-center justify-center text-slate-500">Sem despesas no período</div>}
              </CardContent>
            </Card>
          </div>

          {/* Tabela Movimentações */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader className="flex flex-col gap-3">
              <div className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-white">Movimentações</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input placeholder="Buscar..." className="pl-10 w-[160px] bg-slate-800 border-slate-700 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>
              </div>
              <FiltrosMovs
                filtroTipo={filtroTipo} setFiltroTipo={setFiltroTipo}
                filtroMes={filtroMes} setFiltroMes={setFiltroMes}
                filtroStatusTab={filtroStatusTab} setFiltroStatusTab={setFiltroStatusTab}
                ordenarPor={ordenarPor} setOrdenarPor={setOrdenarPor}
                mesesDisponiveis={mesesDisponiveis} formatMesLabel={formatMesLabel}
              />
            </CardHeader>
            <CardContent>
              <MovsTable rows={movsTabela} onEdit={handleEditar} onDelete={(id) => setDeleteConfirmId(id)} onRestore={handleRestaurarItem} onDeleteGroup={handleApagarGrupo} selecionadosIds={selecionadosIds} setSelecionadosIds={setSelecionadosIds} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================== */}
        {/* TAB 2: RECEITAS                              */}
        {/* =========================================== */}
        <TabsContent value="receitas" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPISimple icon={ArrowUpRight} color="emerald" label="Total Receitas" value={formatCurrency(kpis.totR)} sub={`${kpis.qtdR} lançamentos`} />
            <KPISimple icon={CheckCircle2} color="emerald" label="Recebidas" value={formatCurrency(kpis.recRecebidas)} sub={`${((kpis.recRecebidas/Math.max(1,kpis.totR))*100).toFixed(0)}% do total`} />
            <KPISimple icon={Clock} color="amber" label="Pendentes" value={formatCurrency(kpis.recPendentes)} sub={`${((kpis.recPendentes/Math.max(1,kpis.totR))*100).toFixed(0)}% do total`} />
            <KPISimple icon={Target} color="purple" label="Meta Mensal" value={formatCurrency(metas.receitaMinimaMensal)} sub={`Atual: ${formatCurrency(metasReal.receitaMes)}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-slate-900/60 border-slate-700/50 lg:col-span-2">
              <CardHeader><CardTitle className="text-white">Evolução de Receitas</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={evolucaoMensal}>
                    <defs>
                      <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="mes" stroke="#64748b" />
                    <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(v) => formatCurrency(v)} />
                    <ReferenceLine y={metas.receitaMinimaMensal} stroke="#a855f7" strokeDasharray="3 3" label={{ value: 'Meta mín', fill: '#a78bfa', fontSize: 10, position: 'insideTopRight' }} />
                    <Area type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={2} fill="url(#colorRec)" name="Receitas" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader><CardTitle className="text-white">Receitas por Origem</CardTitle></CardHeader>
              <CardContent>
                {dadosPizzaReceitas.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={dadosPizzaReceitas} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="valor">
                        {dadosPizzaReceitas.map((e, i) => <Cell key={i} fill={e.cor} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(v) => formatCurrency(v)} />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="h-[280px] flex items-center justify-center text-slate-500">Sem receitas no período</div>}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader className="flex flex-col gap-3">
              <div className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-white">Lista de Receitas</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input placeholder="Buscar..." className="pl-10 w-[160px] bg-slate-800 border-slate-700 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 h-9" onClick={() => handleNova('receita')}>
                    <Plus className="h-4 w-4 mr-2" />Nova Receita
                  </Button>
                </div>
              </div>
              <FiltrosMovs
                filtroTipo="receita" setFiltroTipo={() => {}}
                filtroMes={filtroMes} setFiltroMes={setFiltroMes}
                filtroStatusTab={filtroStatusTab} setFiltroStatusTab={setFiltroStatusTab}
                ordenarPor={ordenarPor} setOrdenarPor={setOrdenarPor}
                mesesDisponiveis={mesesDisponiveis} formatMesLabel={formatMesLabel}
                hideTipo
              />
            </CardHeader>
            <CardContent>
              <MovsTable rows={movsTabela.filter(m => m.tipo === 'receita')} onEdit={handleEditar} onDelete={(id) => setDeleteConfirmId(id)} onRestore={handleRestaurarItem} hideTipo selecionadosIds={selecionadosIds} setSelecionadosIds={setSelecionadosIds} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================== */}
        {/* TAB 3: DESPESAS                              */}
        {/* =========================================== */}
        <TabsContent value="despesas" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPISimple icon={ArrowDownRight} color="red" label="Total Despesas" value={formatCurrency(kpis.totD)} sub={`${kpis.qtdD} lançamentos`} />
            <KPISimple icon={CheckCircle2} color="emerald" label="Pagas" value={formatCurrency(kpis.despPagas)} sub={`${((kpis.despPagas/Math.max(1,kpis.totD))*100).toFixed(0)}% do total`} />
            <KPISimple icon={Clock} color="amber" label="Pendentes" value={formatCurrency(kpis.despPendentes)} sub={`${((kpis.despPendentes/Math.max(1,kpis.totD))*100).toFixed(0)}% do total`} />
            <KPISimple icon={AlertTriangle} color="purple" label="Despesa-Teto" value={formatCurrency(metas.despesaTetoMensal)} sub={`Atual: ${formatCurrency(metasReal.despesaMes)}`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-slate-900/60 border-slate-700/50 lg:col-span-2">
              <CardHeader><CardTitle className="text-white">Evolução de Despesas</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={evolucaoMensal}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="mes" stroke="#64748b" />
                    <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(v) => formatCurrency(v)} />
                    <ReferenceLine y={metas.despesaTetoMensal} stroke="#f87171" strokeDasharray="3 3" label={{ value: 'Teto', fill: '#f87171', fontSize: 10, position: 'insideTopRight' }} />
                    <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader><CardTitle className="text-white">Top Categorias</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dadosPizzaDespesas.slice(0, 6).map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
                      <span className="text-sm text-slate-300 flex-1 truncate">{c.nome}</span>
                      <span className="text-sm font-semibold text-white">{formatCurrency(c.valor)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ===== AÇÕES DE OPERAÇÕES FINANCEIRAS ===== */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="border-amber-700/40 text-amber-300 hover:bg-amber-900/20" onClick={() => setCalcReversaOpen(true)}>
              <FlaskConical className="h-4 w-4 mr-2" />Calculadora Reversa
            </Button>
            {opsFinanceirasTimeline.totalOperacoes > 0 && (
              <Button variant="outline" className="border-orange-700/40 text-orange-300 hover:bg-orange-900/20" onClick={handleExportCronogramaPDF}>
                <FileText className="h-4 w-4 mr-2" />Exportar Cronograma PDF
              </Button>
            )}
          </div>

          {/* ===== RANKING / COMPARAÇÃO DE OPERAÇÕES ===== */}
          {rankingOps && rankingOps.todas.length >= 1 && (
            <Card className="bg-gradient-to-br from-rose-900/20 to-orange-900/20 border-rose-700/40">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-rose-400" />
                  Comparação Automática de Operações
                  <Badge className="bg-rose-500/30 text-rose-200 ml-2">{rankingOps.todas.length} operação(ões)</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* 3 cards: Mais cara (taxa), Mais cara (R$), Mais barata */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="bg-red-900/30 border border-red-700/40 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                      <span className="text-[10px] font-bold text-red-300 uppercase">Mais cara (taxa anualizada)</span>
                    </div>
                    <p className="text-sm font-bold text-white truncate">{rankingOps.maisCaraTaxa.descricao}</p>
                    <p className="text-2xl font-black text-red-400 mt-1">{rankingOps.maisCaraTaxa.taxaAnual.toFixed(1)}% a.a.</p>
                    <p className="text-[10px] text-slate-400">Face: {formatCurrency(rankingOps.maisCaraTaxa.face)} • Juros: {formatCurrency(rankingOps.maisCaraTaxa.juros)}</p>
                  </div>
                  <div className="bg-orange-900/30 border border-orange-700/40 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <DollarSign className="h-3.5 w-3.5 text-orange-400" />
                      <span className="text-[10px] font-bold text-orange-300 uppercase">Mais cara (R$ juros)</span>
                    </div>
                    <p className="text-sm font-bold text-white truncate">{rankingOps.maisCaraValor.descricao}</p>
                    <p className="text-2xl font-black text-orange-400 mt-1">{formatCurrency(rankingOps.maisCaraValor.juros)}</p>
                    <p className="text-[10px] text-slate-400">Taxa: {rankingOps.maisCaraValor.taxaAnual.toFixed(1)}% a.a. • {(rankingOps.maisCaraValor.juros / metas.fabricacaoPrecoKg / 1000).toFixed(2)}t prod</p>
                  </div>
                  <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-300 uppercase">Mais barata</span>
                    </div>
                    <p className="text-sm font-bold text-white truncate">{rankingOps.maisBarata.descricao}</p>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{rankingOps.maisBarata.taxaAnual.toFixed(1)}% a.a.</p>
                    <p className="text-[10px] text-slate-400">Face: {formatCurrency(rankingOps.maisBarata.face)} • Juros: {formatCurrency(rankingOps.maisBarata.juros)}</p>
                  </div>
                </div>

                {/* Médias e totais */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs border-t border-slate-700 pt-3 mb-3">
                  <div>
                    <p className="text-slate-500 text-[10px]">Taxa anual média</p>
                    <p className="text-base font-bold text-amber-400">{rankingOps.mediaAnual.toFixed(1)}% a.a.</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px]">Total juros</p>
                    <p className="text-base font-bold text-rose-400">{formatCurrency(rankingOps.totalJuros)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px]">Total face</p>
                    <p className="text-base font-bold text-orange-400">{formatCurrency(rankingOps.totalFace)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-[10px]">Juros / Face</p>
                    <p className="text-base font-bold text-violet-400">{rankingOps.totalFace > 0 ? ((rankingOps.totalJuros/rankingOps.totalFace)*100).toFixed(1) : 0}%</p>
                  </div>
                </div>

                {/* Ranking detalhado com motivos */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-300 mb-2">Ranking detalhado — por que cada operação está nessa posição:</p>
                  {rankingOps.todas.map((op, idx) => (
                    <div key={op.id} className={cn(
                      "p-3 rounded-lg border",
                      idx === 0 && op.isCaro ? "bg-red-900/20 border-red-700/40" :
                      op.isMaisCaraTaxa || op.isMaisCaraValor ? "bg-orange-900/20 border-orange-700/40" :
                      "bg-slate-800/40 border-slate-700/40"
                    )}>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge className="bg-slate-700 text-slate-200 text-[10px] font-bold">#{idx + 1}</Badge>
                        <Badge className="bg-purple-500/30 text-purple-200 text-[10px]">{op.label}</Badge>
                        {op.isMaisCaraTaxa && <Badge className="bg-red-500/30 text-red-200 text-[10px]">PIOR TAXA</Badge>}
                        {op.isMaisCaraValor && <Badge className="bg-orange-500/30 text-orange-200 text-[10px]">MAIOR JUROS R$</Badge>}
                        {op.isCaro && <Badge className="bg-red-500/40 text-red-100 text-[10px] animate-pulse">⚠ CARA</Badge>}
                        <span className="text-sm text-white font-medium truncate">{op.descricao}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mb-2 flex-wrap">
                        <span>Face: <strong className="text-cyan-400">{formatCurrency(op.face)}</strong></span>
                        <span>Juros: <strong className="text-rose-400">{formatCurrency(op.juros)}</strong></span>
                        <span>Taxa: <strong className="text-amber-400">{op.taxa.toFixed(1)}%</strong></span>
                        <span>Anual: <strong className={op.isCaro ? 'text-red-400' : 'text-orange-400'}>{op.taxaAnual.toFixed(1)}% a.a.</strong></span>
                      </div>
                      {op.motivos.length > 0 && (
                        <div className="space-y-1">
                          {op.motivos.map((m, i) => (
                            <div key={i} className={cn(
                              "text-[11px] pl-2 border-l-2 py-0.5",
                              m.tipo === 'critico' ? "border-red-500 text-red-300" :
                              m.tipo === 'aviso' ? "border-amber-500 text-amber-300" :
                              "border-slate-500 text-slate-400"
                            )}>
                              {m.tipo === 'critico' ? '🚨' : m.tipo === 'aviso' ? '⚠' : 'ℹ'} {m.texto}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== TIMELINE DE OPERAÇÕES FINANCEIRAS ===== */}
          {opsFinanceirasTimeline.totalOperacoes > 0 && (
            <>
              <Card className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-700/40">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-orange-400" />
                    Cronograma de Pagamento — Operações Financeiras (12 meses)
                    <Badge className="bg-orange-500/30 text-orange-200 ml-2">{opsFinanceirasTimeline.totalOperacoes} {opsFinanceirasTimeline.totalOperacoes === 1 ? 'operação ativa' : 'operações ativas'}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={opsFinanceirasTimeline.cronograma}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="mes" stroke="#64748b" />
                      <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(v) => formatCurrency(v)} />
                      <Legend wrapperStyle={{ color: '#94a3b8' }} />
                      <Bar dataKey="capital" stackId="a" name="Capital (parcelas)" fill="#fb923c" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="juros" stackId="a" name="Juros (custo)" fill="#dc2626" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="total" name="Total no mês" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-3 mt-4 text-xs">
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-slate-400">Capital total 12m</p>
                      <p className="text-base font-bold text-orange-400">{formatCurrency(opsFinanceirasTimeline.cronograma.reduce((s,c)=>s+c.capital,0))}</p>
                    </div>
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-slate-400">Juros total 12m</p>
                      <p className="text-base font-bold text-red-400">{formatCurrency(opsFinanceirasTimeline.cronograma.reduce((s,c)=>s+c.juros,0))}</p>
                    </div>
                    <div className="bg-slate-900/40 rounded p-2">
                      <p className="text-slate-400">Pico mensal</p>
                      <p className="text-base font-bold text-amber-400">{formatCurrency(Math.max(...opsFinanceirasTimeline.cronograma.map(c=>c.total)))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* LISTA DE OPERAÇÕES ATIVAS */}
              <Card className="bg-slate-900/60 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Percent className="h-5 w-5 text-rose-400" />Operações Financeiras Ativas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {opsFinanceirasTimeline.operacoes.map(op => {
                      const totalPagar = op.parcelas.reduce((s,p)=>s+p.valor, 0);
                      const pctPago = totalPagar > 0 ? (op.pago / totalPagar * 100) : 0;
                      return (
                        <div key={op.id} className={cn(
                          "p-3 rounded-lg border",
                          op.isCaro ? "bg-red-900/20 border-red-700/40" : "bg-slate-800/40 border-slate-700/40"
                        )}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge className="bg-purple-500/30 text-purple-200 text-[10px]">{op.label}</Badge>
                                {op.isCaro && (
                                  <Badge className="bg-red-500/30 text-red-200 text-[10px] animate-pulse">
                                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />OPERAÇÃO CARA
                                  </Badge>
                                )}
                                <span className="text-xs text-slate-400">{op.prazoMeses}m • {op.parcelas.length} parcelas</span>
                              </div>
                              <p className="text-sm text-white font-medium truncate">{op.descricao}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[10px] text-slate-400">Face / Líquido</p>
                              <p className="text-sm font-bold text-cyan-400">{formatCurrency(op.face)}</p>
                              <p className="text-xs text-emerald-400">+{formatCurrency(op.liquido)}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 mb-2 text-xs">
                            <div>
                              <p className="text-slate-500 text-[10px]">Juros</p>
                              <p className="font-semibold text-rose-400">{formatCurrency(op.juros)}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-[10px]">Taxa</p>
                              <p className="font-semibold text-amber-400">{op.taxa.toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-[10px]">Taxa Anual</p>
                              <p className={cn("font-semibold", op.isCaro ? 'text-red-400' : 'text-orange-400')}>{op.taxaAnual.toFixed(1)}% a.a.</p>
                            </div>
                            <div>
                              <p className="text-slate-500 text-[10px]">Equiv. Produção</p>
                              <p className="font-semibold text-violet-400">{(op.juros / metas.fabricacaoPrecoKg / 1000).toFixed(2)} ton</p>
                            </div>
                          </div>

                          {/* Barra de progresso de pagamento */}
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                              <span>Pago: {formatCurrency(op.pago)}</span>
                              <span>Pendente: {formatCurrency(op.pendente)}</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${pctPago}%` }} />
                            </div>
                          </div>

                          {/* Timeline visual de parcelas */}
                          {op.parcelas.length > 0 && (
                            <div className="mt-2 flex items-center gap-1">
                              {op.parcelas.map((p, i) => {
                                const dias = Math.round((parseLocalDate(p.data) - new Date()) / 86400000);
                                return (
                                  <div key={i} className={cn(
                                    "flex-1 h-6 rounded text-[9px] flex items-center justify-center font-semibold",
                                    p.status === 'pago' ? 'bg-emerald-500/30 text-emerald-300' :
                                    dias < 0 ? 'bg-red-500/30 text-red-300' :
                                    dias <= 7 ? 'bg-amber-500/30 text-amber-300' :
                                    'bg-slate-700/50 text-slate-400'
                                  )} title={`${formatCurrency(p.valor)} em ${formatDate(p.data)}`}>
                                    {p.status === 'pago' ? '✓' : dias < 0 ? '!' : `${dias}d`}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Card de Despesas Financeiras (juros, cheques, empréstimos) */}
          {despesasFinanceiras.qtd > 0 && (
            <Card className="bg-gradient-to-br from-rose-900/20 to-amber-900/20 border-rose-700/40">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Percent className="h-5 w-5 text-rose-400" />Despesas Financeiras (juros, cheques, empréstimos)
                  <Badge className="bg-rose-500/30 text-rose-200 ml-2">{despesasFinanceiras.qtd} lançamentos</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-slate-900/40 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Total Despesas Financeiras</p>
                    <p className="text-2xl font-bold text-rose-400 mt-1">{formatCurrency(despesasFinanceiras.total)}</p>
                    <p className="text-xs text-slate-500">{despesasFinanceiras.pctDoTotal.toFixed(1)}% das despesas totais</p>
                  </div>
                  <div className="bg-slate-900/40 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Categoria com maior impacto</p>
                    <p className="text-base font-bold text-amber-400 mt-1 truncate">{despesasFinanceiras.categorias[0]?.nome || '-'}</p>
                    <p className="text-xs text-slate-500">{despesasFinanceiras.categorias[0] ? formatCurrency(despesasFinanceiras.categorias[0].valor) : '-'}</p>
                  </div>
                  <div className="bg-slate-900/40 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Equivalente em produção</p>
                    <p className="text-base font-bold text-orange-400 mt-1">{(despesasFinanceiras.total / metas.fabricacaoPrecoKg / 1000).toFixed(2)} ton</p>
                    <p className="text-xs text-slate-500">de fabricação para zerar</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {despesasFinanceiras.categorias.map((c, i) => {
                    const pct = despesasFinanceiras.total > 0 ? (c.valor / despesasFinanceiras.total * 100) : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-300 flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
                            {c.nome}
                          </span>
                          <span className="text-white font-semibold">{formatCurrency(c.valor)} <span className="text-slate-500 ml-1">({pct.toFixed(0)}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.cor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader><CardTitle className="text-white">Top 10 Fornecedores</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">#</TableHead>
                    <TableHead className="text-slate-400">Fornecedor</TableHead>
                    <TableHead className="text-slate-400 text-center">Qtd</TableHead>
                    <TableHead className="text-slate-400 text-right">Total</TableHead>
                    <TableHead className="text-slate-400 text-right">% do Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topFornecedores.map((f, i) => (
                    <TableRow key={i} className="border-slate-800 hover:bg-slate-800/50">
                      <TableCell className="text-slate-500">{i + 1}</TableCell>
                      <TableCell className="text-white font-medium">{f.nome}</TableCell>
                      <TableCell className="text-center text-slate-300">{f.qtd}</TableCell>
                      <TableCell className="text-right text-red-400 font-semibold">{formatCurrency(f.valor)}</TableCell>
                      <TableCell className="text-right text-slate-400 text-sm">{((f.valor / Math.max(1, kpis.totD)) * 100).toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader className="flex flex-col gap-3">
              <div className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-white">Lista de Despesas</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input placeholder="Buscar..." className="pl-10 w-[160px] bg-slate-800 border-slate-700 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <Button className="bg-red-600 hover:bg-red-700 h-9" onClick={() => handleNova('despesa')}>
                    <Plus className="h-4 w-4 mr-2" />Nova Despesa
                  </Button>
                </div>
              </div>
              <FiltrosMovs
                filtroTipo="despesa" setFiltroTipo={() => {}}
                filtroMes={filtroMes} setFiltroMes={setFiltroMes}
                filtroStatusTab={filtroStatusTab} setFiltroStatusTab={setFiltroStatusTab}
                ordenarPor={ordenarPor} setOrdenarPor={setOrdenarPor}
                mesesDisponiveis={mesesDisponiveis} formatMesLabel={formatMesLabel}
                hideTipo
              />
            </CardHeader>
            <CardContent>
              <MovsTable rows={movsTabela.filter(m => m.tipo === 'despesa')} onEdit={handleEditar} onDelete={(id) => setDeleteConfirmId(id)} onRestore={handleRestaurarItem} hideTipo selecionadosIds={selecionadosIds} setSelecionadosIds={setSelecionadosIds} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================== */}
        {/* TAB 4: FLUXO FUTURO                          */}
        {/* =========================================== */}
        <TabsContent value="futuro" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPISimple icon={ArrowUpRight} color="emerald" label="A receber 30d" value={formatCurrency(futuro.receber30)} sub={`90d: ${formatCurrency(futuro.receber90)}`} />
            <KPISimple icon={ArrowDownRight} color="red" label="A pagar 30d" value={formatCurrency(futuro.pagar30)} sub={`90d: ${formatCurrency(futuro.pagar90)}`} />
            <KPISimple icon={TrendingUp} color={futuro.saldo30 >= 0 ? "blue" : "red"} label="Saldo 30d" value={formatCurrency(futuro.saldo30)} sub={`90d: ${formatCurrency(futuro.saldo90)}`} />
            <KPISimple icon={Sparkles} color="purple" label="Forecast Total" value={formatCurrency(forecast.totalForecast)} sub={`${forecast.qtd} medições/receitas previstas`} />
          </div>

          {/* Forecast de receitas (medições aprovadas) */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-400" />Forecast de Receitas (próx. 6 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={forecast.meses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(v) => formatCurrency(v)} />
                  <ReferenceLine y={metas.receitaMinimaMensal} stroke="#a855f7" strokeDasharray="3 3" label={{ value: 'Meta mín', fill: '#a78bfa', fontSize: 10 }} />
                  <Bar dataKey="forecast" name="Forecast" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-500 mt-2">
                Baseado em receitas pendentes/aprovadas com data de vencimento futura. Total: <strong className="text-purple-400">{formatCurrency(forecast.totalForecast)}</strong>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><Activity className="h-5 w-5 text-cyan-400" />Cash Flow Projetado (13 semanas)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={futuro.semanas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="dataInicio" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(v) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <ReferenceLine y={metas.saldoMinimo} stroke="#a855f7" strokeDasharray="3 3" label={{ value: 'Saldo mín', fill: '#a78bfa', fontSize: 10 }} />
                  <Bar dataKey="receitas" name="A Receber" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" name="A Pagar" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="saldoAcumulado" name="Saldo Acum." stroke="#a78bfa" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader><CardTitle className="text-white">Receitas Futuras (próx. 90 dias)</CardTitle></CardHeader>
              <CardContent>
                <FuturoLista items={futuro.futurasReceitas.slice(0, 15)} tipo="receita" />
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader><CardTitle className="text-white">Despesas Futuras (próx. 90 dias)</CardTitle></CardHeader>
              <CardContent>
                <FuturoLista items={futuro.futurasDespesas.slice(0, 15)} tipo="despesa" />
              </CardContent>
            </Card>
          </div>

          {/* DRE Projetado vs Meta */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><FileCheck className="h-5 w-5 text-violet-400" />Análise Despesas Futuras × Meta Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Cenário 30 dias</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(futuro.receber30 - futuro.pagar30)}</p>
                    <p className="text-xs text-slate-500">
                      {futuro.receber30 >= futuro.pagar30 ? '✅ Superávit projetado' : '⚠️ Déficit projetado'}
                    </p>
                  </div>
                  <div className="border-t border-slate-700 pt-3">
                    <p className="text-xs text-slate-400">Cobertura de despesas pelas receitas</p>
                    <p className="text-lg font-semibold text-cyan-400">
                      {futuro.pagar30 > 0 ? ((futuro.receber30 / futuro.pagar30) * 100).toFixed(0) : '∞'}%
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Meta receita mínima/mês</p>
                    <p className="text-2xl font-bold text-purple-400">{formatCurrency(metas.receitaMinimaMensal)}</p>
                    <p className="text-xs text-slate-500">{metas.fabricacaoKg/1000}t fáb + {metas.montagemKg/1000}t mont</p>
                  </div>
                  <div className="border-t border-slate-700 pt-3">
                    <p className="text-xs text-slate-400">Receita projetada 30d vs meta</p>
                    <p className={cn("text-lg font-semibold", futuro.receber30 >= metas.receitaMinimaMensal ? 'text-emerald-400' : 'text-amber-400')}>
                      {((futuro.receber30 / Math.max(1, metas.receitaMinimaMensal)) * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Gap a cobrir (déficit)</p>
                    <p className="text-2xl font-bold text-red-400">
                      {formatCurrency(Math.max(0, futuro.pagar30 - futuro.receber30))}
                    </p>
                  </div>
                  <div className="border-t border-slate-700 pt-3">
                    <p className="text-xs text-slate-400">Equivalente em produção fab</p>
                    <p className="text-lg font-semibold text-amber-400">
                      {((Math.max(0, futuro.pagar30 - futuro.receber30)) / metas.fabricacaoPrecoKg / 1000).toFixed(1)}t
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================== */}
        {/* TAB 5: METAS                                 */}
        {/* =========================================== */}
        <TabsContent value="metas" className="space-y-6">
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2"><Target className="h-5 w-5 text-purple-400" />Metas do Mês Atual</CardTitle>
              <Button variant="outline" className="border-slate-700 text-slate-300" onClick={handleAbrirMetas}>
                <Settings className="h-4 w-4 mr-2" />Configurar Metas
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Factory className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-300">Fabricação</span>
                  </div>
                  <MetaBar label="Receita Fabricação (mês)" real={metasReal.receitaMes * 0.7 /* aprox. fáb */} meta={metasReal.receitaFabricacaoMeta} />
                  <p className="text-xs text-slate-500">Meta: {(metas.fabricacaoKg / 1000).toFixed(0)}t × R$ {metas.fabricacaoPrecoKg.toFixed(2)}/kg = {formatCurrency(metasReal.receitaFabricacaoMeta)}</p>

                  <div className="flex items-center gap-2 mb-1 mt-4">
                    <HardHat className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-semibold text-blue-300">Montagem</span>
                  </div>
                  <MetaBar label="Receita Montagem (mês)" real={metasReal.receitaMes * 0.3} meta={metasReal.receitaMontagemMeta} />
                  <p className="text-xs text-slate-500">Meta: {(metas.montagemKg / 1000).toFixed(0)}t × R$ {metas.montagemPrecoKg.toFixed(2)}/kg = {formatCurrency(metasReal.receitaMontagemMeta)}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-300">Receita Total Mínima</span>
                  </div>
                  <MetaBar label="Receita do mês" real={metasReal.receitaMes} meta={metas.receitaMinimaMensal} />

                  <div className="flex items-center gap-2 mb-1 mt-4">
                    <ArrowDownRight className="h-4 w-4 text-rose-400" />
                    <span className="text-sm font-semibold text-rose-300">Despesa-Teto</span>
                  </div>
                  <MetaBar label="Despesa do mês" real={metasReal.despesaMes} meta={metas.despesaTetoMensal} isNegativeBom />

                  <div className="flex items-center gap-2 mb-1 mt-4">
                    <TrendingUp className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-300">Margem Operacional</span>
                  </div>
                  <MetaBar label="Margem do mês" real={metasReal.margemReal} meta={metas.margemMinima} format={(v) => `${(v||0).toFixed(1)}%`} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards informativos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-900/60 border-emerald-700/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Factory className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-300">Equivalente Fabricação</span>
                </div>
                <p className="text-xs text-slate-400">Para bater a meta de receita mínima, é preciso produzir:</p>
                <p className="text-xl font-bold text-emerald-400 mt-2">{(metas.fabricacaoKg / 1000).toFixed(0)} ton/mês</p>
                <p className="text-xs text-slate-500">a R$ {metas.fabricacaoPrecoKg.toFixed(2)}/kg</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-blue-700/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HardHat className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-300">Equivalente Montagem</span>
                </div>
                <p className="text-xs text-slate-400">Adicionalmente em campo:</p>
                <p className="text-xl font-bold text-blue-400 mt-2">{(metas.montagemKg / 1000).toFixed(0)} ton/mês</p>
                <p className="text-xs text-slate-500">a R$ {metas.montagemPrecoKg.toFixed(2)}/kg</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/60 border-purple-700/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-semibold text-purple-300">Break-even</span>
                </div>
                <p className="text-xs text-slate-400">Para cobrir a despesa-teto, basta:</p>
                <p className="text-xl font-bold text-purple-400 mt-2">{(metas.despesaTetoMensal / metas.fabricacaoPrecoKg / 1000).toFixed(1)} ton/mês</p>
                <p className="text-xs text-slate-500">apenas fabricação</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* =========================================== */}
        {/* TAB 6: ALERTAS                               */}
        {/* =========================================== */}
        <TabsContent value="alertas" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPISimple icon={AlertCircle} color="red" label="Vencidos" value={alertas.filter(a => a.nivel === 'vencido').length} size="sm" />
            <KPISimple icon={AlertTriangle} color="red" label={`Críticos (≤${metas.alertaCriticoDias}d)`} value={alertas.filter(a => a.nivel === 'critico').length} size="sm" />
            <KPISimple icon={Bell} color="amber" label={`Atenção (≤${metas.alertaAtencaoDias}d)`} value={alertas.filter(a => a.nivel === 'atencao').length} size="sm" />
            <KPISimple icon={Eye} color="purple" label="Não lidos" value={alertasNaoLidos.length} size="sm" />
          </div>

          {alertas.length === 0 ? (
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-white font-medium">Nenhum alerta no momento</p>
                <p className="text-slate-400 text-sm mt-1">Tudo sob controle. Cash flow saudável e vencimentos em dia.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Centro de Alertas — ordenado por prioridade</CardTitle>
                {alertasLidos.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setAlertasLidos([])}>
                    Marcar todos como não lidos
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alertas.map(a => {
                    const lido = alertasLidos.includes(a.id);
                    return (
                      <div key={a.id} className={cn(
                        "p-3 rounded-lg border flex items-start gap-3 transition-all",
                        lido ? "bg-slate-800/30 border-slate-700/40 opacity-60" :
                        a.nivel === 'vencido' ? "bg-red-900/20 border-red-700/50" :
                        a.nivel === 'critico' ? "bg-red-900/15 border-red-700/40" :
                        "bg-amber-900/15 border-amber-700/40"
                      )}>
                        <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0",
                          a.nivel === 'vencido' ? "bg-red-500 animate-pulse" :
                          a.nivel === 'critico' ? "bg-red-400" :
                          "bg-amber-400"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={cn("text-[10px]",
                              a.nivel === 'vencido' ? 'bg-red-700/40 text-red-200' :
                              a.nivel === 'critico' ? 'bg-red-500/30 text-red-300' :
                              'bg-amber-500/30 text-amber-300'
                            )}>
                              {a.nivel === 'vencido' ? 'VENCIDO' :
                                a.dias !== undefined ? `${a.dias} dia${a.dias === 1 ? '' : 's'}` :
                                a.nivel.toUpperCase()}
                            </Badge>
                            {a.ehCheque && <Badge className="bg-blue-500/30 text-blue-300 text-[10px]">CHEQUE</Badge>}
                            {a.valorAlto && <Badge className="bg-purple-500/30 text-purple-300 text-[10px]">VALOR ALTO</Badge>}
                            {a.tipo === 'saldo' && <Badge className="bg-rose-500/30 text-rose-300 text-[10px]">SALDO</Badge>}
                            {a.tipo === 'meta' && <Badge className="bg-violet-500/30 text-violet-300 text-[10px]">META</Badge>}
                          </div>
                          <p className={cn("font-medium", lido ? "text-slate-400" : "text-white")}>{a.titulo}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{a.descricao}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn("font-bold", a.tipo === 'recebimento' ? 'text-emerald-400' : 'text-red-400')}>
                            {formatCurrency(a.valor)}
                          </p>
                          {!lido && (
                            <button onClick={() => handleMarcarAlertaLido(a.id)} className="text-[10px] text-slate-400 hover:text-white mt-1 underline">
                              Marcar como lido
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* =========================================== */}
        {/* TAB 7: CENÁRIOS (SIMULADOR)                  */}
        {/* =========================================== */}
        <TabsContent value="cenarios" className="space-y-6">
          <div className="bg-gradient-to-r from-violet-900/30 to-purple-900/30 rounded-xl border border-violet-700/30 p-4">
            <div className="flex items-start gap-3 text-xs text-violet-200">
              <FlaskConical className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-violet-100">Simulador de Cenários:</strong>{' '}
                Ajuste os controles abaixo para ver o impacto de decisões hipotéticas. Os números mudam em tempo real. Nada é salvo — é apenas para análise "e se...?".
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {/* Controles */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><Sliders className="h-5 w-5 text-violet-400" />Variáveis do Cenário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="text-slate-300 flex items-center gap-2"><Minus className="h-3 w-3 text-rose-400" />Cortar Despesas</Label>
                    <span className="text-rose-400 font-bold">{cenario.corteDespesas}%</span>
                  </div>
                  <input type="range" min="0" max="50" step="1" value={cenario.corteDespesas}
                    onChange={(e) => setCenario({...cenario, corteDespesas: parseInt(e.target.value)})}
                    className="w-full accent-rose-500" />
                  <p className="text-[10px] text-slate-500 mt-1">Economia: {formatCurrency(cenarioCalc.economiaDespesas)}/mês</p>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="text-slate-300 flex items-center gap-2"><Plus className="h-3 w-3 text-emerald-400" />Aumentar Receitas</Label>
                    <span className="text-emerald-400 font-bold">+{cenario.aumentoReceitas}%</span>
                  </div>
                  <input type="range" min="0" max="100" step="5" value={cenario.aumentoReceitas}
                    onChange={(e) => setCenario({...cenario, aumentoReceitas: parseInt(e.target.value)})}
                    className="w-full accent-emerald-500" />
                  <p className="text-[10px] text-slate-500 mt-1">Ganho: {formatCurrency(cenarioCalc.ganhoReceita)}/mês</p>
                </div>

                <div>
                  <Label className="text-slate-300 text-xs">Receita Extra (injeção pontual R$)</Label>
                  <Input type="number" className="mt-1 bg-slate-800 border-slate-700" value={cenario.receitaExtra}
                    onChange={(e) => setCenario({...cenario, receitaExtra: parseFloat(e.target.value) || 0})} />
                </div>

                <div>
                  <Label className="text-slate-300 text-xs">Despesa Extra (cenário pessimista R$)</Label>
                  <Input type="number" className="mt-1 bg-slate-800 border-slate-700" value={cenario.despesaExtra}
                    onChange={(e) => setCenario({...cenario, despesaExtra: parseFloat(e.target.value) || 0})} />
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-sm font-semibold text-violet-300 mb-3 flex items-center gap-2"><Factory className="h-4 w-4" />Simular Produção</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-300 text-xs">Novo preço fáb (R$/kg)</Label>
                      <Input type="number" step="0.10" className="mt-1 bg-slate-800 border-slate-700" value={cenario.novoPrecoFabKg}
                        onChange={(e) => setCenario({...cenario, novoPrecoFabKg: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div>
                      <Label className="text-slate-300 text-xs">Nova produção (kg/mês)</Label>
                      <Input type="number" step="1000" className="mt-1 bg-slate-800 border-slate-700" value={cenario.novaProducaoFabKg}
                        onChange={(e) => setCenario({...cenario, novaProducaoFabKg: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                </div>

                <Button variant="outline" className="border-slate-700 text-slate-300 w-full" onClick={() => setCenario({
                  corteDespesas: 0, aumentoReceitas: 0, receitaExtra: 0, despesaExtra: 0,
                  novoPrecoFabKg: metas.fabricacaoPrecoKg, novaProducaoFabKg: metas.fabricacaoKg,
                })}>
                  <RotateCcw className="h-4 w-4 mr-2" />Resetar Cenário
                </Button>
              </CardContent>
            </Card>

            {/* Resultado */}
            <Card className="bg-slate-900/60 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><Activity className="h-5 w-5 text-emerald-400" />Impacto Projetado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/40 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Baseline (atual)</p>
                    <p className="text-xs text-slate-500 mt-1">Receita: {formatCurrency(cenarioCalc.baseReceita)}</p>
                    <p className="text-xs text-slate-500">Despesa: {formatCurrency(cenarioCalc.baseDespesa)}</p>
                    <p className={cn("text-sm font-bold mt-2", cenarioCalc.baseLucro >= 0 ? 'text-blue-400' : 'text-red-400')}>
                      Lucro: {formatCurrency(cenarioCalc.baseLucro)}
                    </p>
                    <p className="text-[10px] text-slate-500">Margem: {cenarioCalc.baseMargem.toFixed(1)}%</p>
                  </div>
                  <div className="bg-violet-900/20 rounded-lg p-3 border border-violet-700/30">
                    <p className="text-xs text-violet-300 font-semibold">Cenário Simulado</p>
                    <p className="text-xs text-slate-400 mt-1">Receita: {formatCurrency(cenarioCalc.novaReceita)}</p>
                    <p className="text-xs text-slate-400">Despesa: {formatCurrency(cenarioCalc.novaDespesa)}</p>
                    <p className={cn("text-sm font-bold mt-2", cenarioCalc.novoLucro >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      Lucro: {formatCurrency(cenarioCalc.novoLucro)}
                    </p>
                    <p className="text-[10px] text-emerald-400">Margem: {cenarioCalc.novaMargem.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">Δ Lucro</span>
                    <span className={cn("text-base font-bold", cenarioCalc.deltaLucro >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {cenarioCalc.deltaLucro >= 0 ? '+' : ''}{formatCurrency(cenarioCalc.deltaLucro)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">Δ Margem</span>
                    <span className={cn("text-base font-bold", cenarioCalc.deltaMargem >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {cenarioCalc.deltaMargem >= 0 ? '+' : ''}{cenarioCalc.deltaMargem.toFixed(1)}pp
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-300">Runway (saldo 30d ÷ despesa)</span>
                    <span className="text-base font-bold text-amber-400">{cenarioCalc.runwayMeses} meses</span>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-4">
                  <p className="text-xs text-violet-300 font-semibold mb-2 flex items-center gap-2"><Factory className="h-3 w-3" />Simulação de Produção</p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nova produção fab × preço</span>
                      <span className="text-emerald-400 font-semibold">{formatCurrency(cenario.novaProducaoFabKg * cenario.novoPrecoFabKg)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">+ Montagem (mantida)</span>
                      <span className="text-blue-400 font-semibold">{formatCurrency(metas.montagemKg * metas.montagemPrecoKg)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-700 pt-1.5">
                      <span className="text-slate-300 font-semibold">Nova receita meta total</span>
                      <span className="text-white font-bold">{formatCurrency(cenarioCalc.novaProducaoReceita)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-xs">Diferença vs meta atual</span>
                      <span className={cn("text-xs font-semibold", cenarioCalc.novaProducaoDelta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {cenarioCalc.novaProducaoDelta >= 0 ? '+' : ''}{formatCurrency(cenarioCalc.novaProducaoDelta)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cenários pré-definidos */}
          <Card className="bg-slate-900/60 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><Sparkles className="h-5 w-5 text-amber-400" />Cenários Pré-Definidos (1 clique)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Button variant="outline" className="border-emerald-700/40 text-emerald-300 hover:bg-emerald-900/20 h-auto py-3 flex flex-col items-start gap-1"
                  onClick={() => setCenario({...cenario, corteDespesas: 10, aumentoReceitas: 15, receitaExtra: 0, despesaExtra: 0})}>
                  <span className="font-bold flex items-center gap-1.5"><ChevronUp className="h-4 w-4" />Otimista</span>
                  <span className="text-[10px] text-emerald-200/70">-10% despesas, +15% receitas</span>
                </Button>
                <Button variant="outline" className="border-amber-700/40 text-amber-300 hover:bg-amber-900/20 h-auto py-3 flex flex-col items-start gap-1"
                  onClick={() => setCenario({...cenario, corteDespesas: 5, aumentoReceitas: 5, receitaExtra: 0, despesaExtra: 0})}>
                  <span className="font-bold flex items-center gap-1.5"><Activity className="h-4 w-4" />Conservador</span>
                  <span className="text-[10px] text-amber-200/70">-5% despesas, +5% receitas</span>
                </Button>
                <Button variant="outline" className="border-red-700/40 text-red-300 hover:bg-red-900/20 h-auto py-3 flex flex-col items-start gap-1"
                  onClick={() => setCenario({...cenario, corteDespesas: 0, aumentoReceitas: -10, receitaExtra: 0, despesaExtra: 50000})}>
                  <span className="font-bold flex items-center gap-1.5"><ChevronDown className="h-4 w-4" />Pessimista</span>
                  <span className="text-[10px] text-red-200/70">+R$50k despesa extra, -10% receitas</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOG: Nova/Editar Movimentação ===== */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditando(null); }}>
        <DialogContent className={cn(
          "bg-slate-900 border-slate-700 flex flex-col p-0 max-h-[92vh]",
          chequeMode && !editando ? "max-w-2xl" : "max-w-lg"
        )}>
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle className="text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-400" />
              {editando ? `Editar (local) ${editando.origem === 'local' ? '' : '— item externo'}` : 'Nova Movimentação Local'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-6 overflow-y-auto flex-1">
            {editando && editando.origem !== 'local' && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
                Editando item externo — alterações ficam SÓ neste módulo. A origem permanece intacta.
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="despesa">Despesa</SelectItem>
                    <SelectItem value="receita">Receita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago/Recebido</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Descrição *</Label>
              <Input className="mt-1 bg-slate-800 border-slate-700" placeholder="Descrição" value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Fornecedor/Cliente</Label>
                <Input className="mt-1 bg-slate-800 border-slate-700" placeholder="Nome" value={formData.fornecedor} onChange={(e) => setFormData({...formData, fornecedor: e.target.value})} />
              </div>
              <div>
                <Label className="text-slate-300">Categoria</Label>
                <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {categoriasDisponiveis.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className={cn("grid gap-4", chequeMode && !editando ? "grid-cols-2" : "grid-cols-3")}>
              {!(chequeMode && !editando) && (
                <div>
                  <Label className="text-slate-300">Valor *</Label>
                  <Input className="mt-1 bg-slate-800 border-slate-700" type="number" placeholder="0,00" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} />
                </div>
              )}
              {!(chequeMode && !editando) && (
                <div>
                  <Label className="text-slate-300">Vencimento</Label>
                  <Input className="mt-1 bg-slate-800 border-slate-700" type="date" value={formData.vencimento} onChange={(e) => setFormData({...formData, vencimento: e.target.value})} />
                </div>
              )}
              <div className={chequeMode && !editando ? "col-span-2" : ""}>
                <Label className="text-slate-300">Forma Pagto</Label>
                <Select value={formData.formaPagto} onValueChange={(v) => setFormData({...formData, formaPagto: v})}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Cheque">🏦 Cheque</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Cartão">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ============================== */}
            {/* SEÇÃO EXPANDIDA: OPERAÇÃO CHEQUE */}
            {/* ============================== */}
            {chequeMode && !editando && (
              <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-700/40 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-amber-200 flex items-center gap-2">
                    <Percent className="h-4 w-4" />Operação de Cheque Trocado / Troca
                  </p>
                  <button type="button" onClick={() => {
                    setFormData({...formData, formaPagto: 'PIX'});
                  }} className="text-[10px] text-slate-400 hover:text-white underline">
                    Cancelar operação
                  </button>
                </div>

                <div className="bg-slate-900/40 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-slate-300 text-xs">Cheques Recebidos / Emitidos</Label>
                    <Button type="button" variant="outline" size="sm" className="h-7 border-slate-700 text-slate-300 text-[10px]"
                      onClick={() => setChequesList([...chequesList, { valor: '50000', vencimento: '' }])}>
                      <Plus className="h-3 w-3 mr-1" />Add Cheque
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {chequesList.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-800/40 rounded p-2">
                        <span className="text-[10px] text-slate-500 font-mono w-6">CH{idx + 1}</span>
                        <div className="flex-1">
                          <Label className="text-[10px] text-slate-500">Valor (R$)</Label>
                          <Input type="number" className="bg-slate-800 border-slate-700 h-7 text-sm" placeholder="50000" value={c.valor}
                            onChange={(e) => {
                              const novos = [...chequesList];
                              novos[idx].valor = e.target.value;
                              setChequesList(novos);
                            }} />
                        </div>
                        <div className="flex-1">
                          <Label className="text-[10px] text-slate-500">Vencimento</Label>
                          <Input type="date" className="bg-slate-800 border-slate-700 h-7 text-sm" value={c.vencimento}
                            onChange={(e) => {
                              const novos = [...chequesList];
                              novos[idx].vencimento = e.target.value;
                              setChequesList(novos);
                            }} />
                        </div>
                        <button type="button" onClick={() => setChequesList(chequesList.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300 mt-3">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-slate-700 text-xs">
                    <span className="text-slate-400">Total face (todos os cheques):</span>
                    <span className="text-cyan-400 font-bold">{formatCurrency(chequeOpCalc.valorTotalFace)}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300 text-xs flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                    Valor recebido em troca / "Empréstimo" (R$) *
                  </Label>
                  <Input type="number" className="mt-1 bg-slate-800 border-slate-700" placeholder="130000"
                    value={valorLiquidoCheque} onChange={(e) => setValorLiquidoCheque(e.target.value)} />
                  <p className="text-[10px] text-slate-500 mt-1">Quanto efetivamente entrou na sua conta</p>
                </div>

                {/* RESULTADO AUTOMÁTICO */}
                <div className="bg-slate-900/60 border border-amber-700/30 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-300 mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />Análise Automática da Operação
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-500">Face (Σ cheques)</p>
                      <p className="text-sm font-bold text-cyan-400">{formatCurrency(chequeOpCalc.valorTotalFace)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Líquido recebido</p>
                      <p className="text-sm font-bold text-emerald-400">+{formatCurrency(chequeOpCalc.liquido)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Juros (despesa)</p>
                      <p className="text-sm font-bold text-rose-400">-{formatCurrency(chequeOpCalc.juros)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500">Taxa Efetiva</p>
                      <p className="text-sm font-bold text-amber-400">{chequeOpCalc.taxaPct.toFixed(2)}%</p>
                      <p className="text-[9px] text-slate-500">~{chequeOpCalc.taxaAnualizada.toFixed(1)}% a.a.</p>
                    </div>
                  </div>
                  {/* Alerta operação cara */}
                  {chequeOpCalc.isCaro && chequeOpCalc.valorTotalFace > 0 && (
                    <div className="mt-2 p-2 rounded bg-red-900/30 border border-red-700/40 text-xs text-red-200">
                      <strong className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Operação cara</strong>
                      Taxa anualizada {chequeOpCalc.taxaAnualizada.toFixed(1)}% a.a. excede limite ({metas.taxaAnualizadaMaxima}% a.a.).
                      Custo equivale a <strong className="text-orange-300">{(chequeOpCalc.juros / metas.fabricacaoPrecoKg / 1000).toFixed(2)}t de produção</strong>.
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 mt-2">
                    Vai gerar <strong className="text-amber-300">{2 + chequesList.filter(c => parseFloat(c.valor) > 0 && c.vencimento).length} lançamentos</strong>:
                    1 receita (líquido) + 1 despesa (juros) + {chequesList.filter(c => parseFloat(c.valor) > 0 && c.vencimento).length} cheques a pagar
                  </p>
                </div>
              </div>
            )}

            {/* ============================== */}
            {/* PARCELAS / RECORRÊNCIA (modo normal) */}
            {/* ============================== */}
            {!chequeMode && !editando && (
              <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  <p className="text-xs font-semibold text-cyan-300">Recorrência / Parcelamento</p>
                  <span className="text-[10px] text-slate-500">opcional — deixe 1 para lançamento único</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300 text-xs">Quantidade de Parcelas</Label>
                    <Input type="number" min="1" max="120" className="mt-1 bg-slate-800 border-slate-700" value={formData.parcelas}
                      onChange={(e) => setFormData({...formData, parcelas: parseInt(e.target.value) || 1})} />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Intervalo entre vencimentos (dias)</Label>
                    <Input type="number" min="1" className="mt-1 bg-slate-800 border-slate-700" value={formData.intervaloDias}
                      onChange={(e) => setFormData({...formData, intervaloDias: parseInt(e.target.value) || 30})} />
                  </div>
                </div>
                {/* Preview quando parcelas > 1 */}
                {parseInt(formData.parcelas) > 1 && formData.vencimento && parseFloat(formData.valor) > 0 && (() => {
                  const qtd = parseInt(formData.parcelas);
                  const intervalo = parseInt(formData.intervaloDias) || 30;
                  const base = parseLocalDate(formData.vencimento);
                  if (!base) return null;
                  const valor = parseFloat(formData.valor) || 0;
                  const totalGeral = valor * qtd;
                  const ultima = new Date(base.getFullYear(), base.getMonth(), base.getDate() + ((qtd - 1) * intervalo));
                  const previewParcelas = [];
                  const mostrar = Math.min(qtd, 6);
                  for (let i = 0; i < mostrar; i++) {
                    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (i * intervalo));
                    previewParcelas.push({ n: i + 1, data: d });
                  }
                  return (
                    <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-lg p-2.5 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-cyan-200">
                          Vai gerar <strong>{qtd} parcelas</strong> de {formatCurrency(valor)}
                        </span>
                        <span className="text-cyan-300 font-bold">Total: {formatCurrency(totalGeral)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {previewParcelas.map(p => (
                          <span key={p.n} className="text-[10px] bg-slate-800/60 border border-slate-700 rounded px-2 py-0.5 text-slate-300">
                            P{p.n}: {p.data.toLocaleDateString('pt-BR')}
                          </span>
                        ))}
                        {qtd > 6 && (
                          <span className="text-[10px] text-slate-400 italic">
                            ... +{qtd - 6} parcelas até {ultima.toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div>
              <Label className="text-slate-300">Vincular à Obra (opcional)</Label>
              <Select value={formData.obraId || 'none'} onValueChange={(v) => setFormData({...formData, obraId: v === 'none' ? '' : v})}>
                <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none">Sem vínculo</SelectItem>
                  {(obras || []).map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.nome || o.name || o.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className={cn(
              "w-full",
              chequeMode && !editando
                ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                : "bg-gradient-to-r from-purple-500 to-indigo-500"
            )} onClick={handleSalvar}>
              {editando
                ? 'Salvar Alterações (local)'
                : chequeMode
                  ? `Criar Operação de Cheque Trocado (${2 + chequesList.filter(c => parseFloat(c.valor) > 0 && c.vencimento).length} lançamentos)`
                  : parseInt(formData.parcelas) > 1
                    ? `Cadastrar ${formData.parcelas} parcelas`
                    : 'Cadastrar Localmente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: Calculadora Reversa de Juros ===== */}
      <Dialog open={calcReversaOpen} onOpenChange={setCalcReversaOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl flex flex-col p-0 max-h-[92vh]">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle className="text-white flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-amber-400" />
              Calculadora Reversa de Juros
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-6 overflow-y-auto flex-1">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
              <strong>Para que serve:</strong> antes de aceitar uma proposta de cheque trocado ou empréstimo, calcule
              qual é o piso mínimo que vale a pena. Defina sua taxa máxima aceitável e o sistema mostra o limite.
            </div>

            {/* Seletor de modo */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCalcRev({...calcRev, modo: 'liquido_max'})}
                className={cn("p-3 rounded-lg border text-left transition-all",
                  calcRev.modo === 'liquido_max'
                    ? 'bg-amber-900/40 border-amber-500/60 text-amber-100'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                )}>
                <p className="text-xs font-bold mb-1">📥 Modo 1: Cheque/Empréstimo de Face Fixa</p>
                <p className="text-[10px]">Tenho um cheque de R$ X, qual o líquido MÍNIMO que devo aceitar?</p>
              </button>
              <button
                onClick={() => setCalcRev({...calcRev, modo: 'face_max'})}
                className={cn("p-3 rounded-lg border text-left transition-all",
                  calcRev.modo === 'face_max'
                    ? 'bg-amber-900/40 border-amber-500/60 text-amber-100'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
                )}>
                <p className="text-xs font-bold mb-1">💵 Modo 2: Líquido Fixo Desejado</p>
                <p className="text-[10px]">Preciso de R$ X líquido, qual o face MÁXIMO aceitável?</p>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {calcRev.modo === 'liquido_max' ? (
                <div>
                  <Label className="text-slate-300 text-xs flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3 text-cyan-400" />Valor de Face (R$)
                  </Label>
                  <Input type="number" className="mt-1 bg-slate-800 border-slate-700" value={calcRev.valorFace} onChange={(e) => setCalcRev({...calcRev, valorFace: e.target.value})} />
                </div>
              ) : (
                <div>
                  <Label className="text-slate-300 text-xs flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-emerald-400" />Líquido Desejado (R$)
                  </Label>
                  <Input type="number" className="mt-1 bg-slate-800 border-slate-700" value={calcRev.valorLiquido} onChange={(e) => setCalcRev({...calcRev, valorLiquido: e.target.value})} />
                </div>
              )}
              <div>
                <Label className="text-slate-300 text-xs flex items-center gap-1">
                  <Percent className="h-3 w-3 text-amber-400" />Taxa Máxima Anualizada (% a.a.)
                </Label>
                <Input type="number" step="1" className="mt-1 bg-slate-800 border-slate-700" value={calcRev.taxaMaxima} onChange={(e) => setCalcRev({...calcRev, taxaMaxima: e.target.value})} />
                <p className="text-[10px] text-slate-500 mt-1">Sugestão: até {metas.taxaAnualizadaMaxima}% (sua meta atual)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 text-xs">Nº de Parcelas</Label>
                <Input type="number" min="1" max="36" className="mt-1 bg-slate-800 border-slate-700" value={calcRev.parcelas} onChange={(e) => setCalcRev({...calcRev, parcelas: parseInt(e.target.value) || 1})} />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Intervalo entre Parcelas (dias)</Label>
                <Input type="number" className="mt-1 bg-slate-800 border-slate-700" value={calcRev.intervaloDias} onChange={(e) => setCalcRev({...calcRev, intervaloDias: parseInt(e.target.value) || 30})} />
              </div>
            </div>

            {/* RESULTADO */}
            <div className="bg-gradient-to-br from-emerald-900/30 to-amber-900/30 border border-emerald-700/40 rounded-lg p-4">
              <p className="text-sm font-bold text-emerald-300 mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />Resultado do Cálculo Reverso
              </p>
              {calcReversaResultado.modo === 'liquido_max' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/40 rounded p-3">
                      <p className="text-[10px] text-slate-400">Você tem cheque/empréstimo de</p>
                      <p className="text-lg font-bold text-cyan-400">{formatCurrency(calcReversaResultado.inputFace)}</p>
                    </div>
                    <div className="bg-slate-900/40 rounded p-3">
                      <p className="text-[10px] text-slate-400">Taxa máxima aceitável</p>
                      <p className="text-lg font-bold text-amber-400">{calcReversaResultado.inputTaxaMax}% a.a.</p>
                    </div>
                  </div>
                  <div className="bg-emerald-900/50 border border-emerald-500/40 rounded p-4">
                    <p className="text-xs text-emerald-300 mb-1">Líquido MÍNIMO que você deve aceitar:</p>
                    <p className="text-3xl font-black text-emerald-400">{formatCurrency(calcReversaResultado.liquidoMinimo)}</p>
                    <p className="text-xs text-slate-400 mt-1">Juros máximos: {formatCurrency(calcReversaResultado.jurosMaximo)} ({calcReversaResultado.taxaPeriodoMaxPct.toFixed(2)}% no período)</p>
                  </div>
                  <div className="text-xs text-rose-300 bg-rose-900/20 border border-rose-700/30 rounded p-2">
                    ⚠ Se o banco oferecer LÍQUIDO MENOR que {formatCurrency(calcReversaResultado.liquidoMinimo)}, a taxa estará ACIMA do seu limite. Equivale a {calcReversaResultado.tonsPerdidas.toFixed(2)}t de produção fabricada perdida em juros.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900/40 rounded p-3">
                      <p className="text-[10px] text-slate-400">Você quer receber líquido</p>
                      <p className="text-lg font-bold text-emerald-400">{formatCurrency(calcReversaResultado.inputLiquido)}</p>
                    </div>
                    <div className="bg-slate-900/40 rounded p-3">
                      <p className="text-[10px] text-slate-400">Taxa máxima aceitável</p>
                      <p className="text-lg font-bold text-amber-400">{calcReversaResultado.inputTaxaMax}% a.a.</p>
                    </div>
                  </div>
                  <div className="bg-cyan-900/50 border border-cyan-500/40 rounded p-4">
                    <p className="text-xs text-cyan-300 mb-1">Valor de face MÁXIMO aceitável:</p>
                    <p className="text-3xl font-black text-cyan-400">
                      {isFinite(calcReversaResultado.faceMaximo) ? formatCurrency(calcReversaResultado.faceMaximo) : '— taxa muito alta —'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Juros máximos: {formatCurrency(calcReversaResultado.jurosMaximo)} ({calcReversaResultado.taxaPeriodoMaxPct.toFixed(2)}% no período)</p>
                  </div>
                  <div className="text-xs text-rose-300 bg-rose-900/20 border border-rose-700/30 rounded p-2">
                    ⚠ Se a operação exigir face MAIOR que {isFinite(calcReversaResultado.faceMaximo) ? formatCurrency(calcReversaResultado.faceMaximo) : 'esse valor'}, a taxa estará acima do limite. Equivale a {calcReversaResultado.tonsPerdidas.toFixed(2)}t de produção em juros.
                  </div>
                </div>
              )}
            </div>

            <Button className="w-full border-slate-700" variant="outline" onClick={() => setCalcReversaOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: Operação Financeira (cheques trocados, empréstimos, etc) ===== */}
      <Dialog open={opFinDialogOpen} onOpenChange={setOpFinDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-3xl flex flex-col p-0 max-h-[92vh]">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle className="text-white flex items-center gap-2">
              <Percent className="h-5 w-5 text-amber-400" />
              Operação Financeira — Cheques Trocados / Empréstimos / Renegociação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-6 overflow-y-auto flex-1">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
              <strong>Como funciona:</strong> Informe o valor de face (cheque que você descontou ou empréstimo solicitado) e o valor líquido recebido. O sistema gera automaticamente:
              <ul className="mt-1.5 ml-4 list-disc text-amber-200/80">
                <li>1 receita de entrada (valor líquido)</li>
                <li>1 despesa de juros (diferença face−líquido) com taxa anualizada calculada</li>
                <li>N parcelas pendentes a pagar no futuro</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 text-xs">Tipo de Operação</Label>
                <Select value={opFin.tipo} onValueChange={(v) => setOpFin({...opFin, tipo: v})}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="cheque_trocado">🏦 Cheque Trocado / Desconto de Cheques</SelectItem>
                    <SelectItem value="emprestimo">💰 Empréstimo</SelectItem>
                    <SelectItem value="financiamento">📋 Financiamento</SelectItem>
                    <SelectItem value="renegociacao">🔄 Renegociação de Dívida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Data da Operação</Label>
                <Input type="date" className="mt-1 bg-slate-800 border-slate-700" value={opFin.dataOperacao} onChange={(e) => setOpFin({...opFin, dataOperacao: e.target.value})} />
              </div>
            </div>

            <div>
              <Label className="text-slate-300 text-xs">Descrição da Operação *</Label>
              <Input className="mt-1 bg-slate-800 border-slate-700" placeholder="Ex: Desconto cheque cliente Walter — 150k em 3x" value={opFin.descricao} onChange={(e) => setOpFin({...opFin, descricao: e.target.value})} />
            </div>

            <div>
              <Label className="text-slate-300 text-xs">Banco / Fornecedor</Label>
              <Input className="mt-1 bg-slate-800 border-slate-700" placeholder="Banco do Brasil, Bradesco..." value={opFin.fornecedor} onChange={(e) => setOpFin({...opFin, fornecedor: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 text-xs flex items-center gap-1">
                  <ArrowDownRight className="h-3 w-3 text-cyan-400" />Valor de Face (R$) *
                </Label>
                <Input type="number" className="mt-1 bg-slate-800 border-slate-700" placeholder="150000" value={opFin.valorFace} onChange={(e) => setOpFin({...opFin, valorFace: e.target.value})} />
                <p className="text-[10px] text-slate-500 mt-1">Valor total do cheque ou principal do empréstimo</p>
              </div>
              <div>
                <Label className="text-slate-300 text-xs flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-emerald-400" />Valor Líquido Recebido (R$)
                </Label>
                <Input type="number" className="mt-1 bg-slate-800 border-slate-700" placeholder="120000" value={opFin.valorLiquido} onChange={(e) => setOpFin({...opFin, valorLiquido: e.target.value})} />
                <p className="text-[10px] text-slate-500 mt-1">Quanto entrou efetivamente na conta</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-300 text-xs">Nº Parcelas</Label>
                <Input type="number" min="1" max="36" className="mt-1 bg-slate-800 border-slate-700" value={opFin.parcelas} onChange={(e) => setOpFin({...opFin, parcelas: parseInt(e.target.value) || 1})} />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">1º Vencimento</Label>
                <Input type="date" className="mt-1 bg-slate-800 border-slate-700" value={opFin.primeiroVencimento} onChange={(e) => setOpFin({...opFin, primeiroVencimento: e.target.value})} />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Intervalo (dias)</Label>
                <Input type="number" className="mt-1 bg-slate-800 border-slate-700" value={opFin.intervaloDias} onChange={(e) => setOpFin({...opFin, intervaloDias: parseInt(e.target.value) || 30})} />
              </div>
            </div>

            <div>
              <Label className="text-slate-300 text-xs">Vincular à Obra (opcional)</Label>
              <Select value={opFin.obraId || 'none'} onValueChange={(v) => setOpFin({...opFin, obraId: v === 'none' ? '' : v})}>
                <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="none">Sem vínculo</SelectItem>
                  {(obras || []).map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.nome || o.name || o.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PREVIEW DO RESULTADO */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />Pré-visualização do impacto
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-[10px] text-slate-500">Valor Face</p>
                  <p className="text-sm font-bold text-cyan-400">{formatCurrency(opFinCalc.face)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Líquido Recebido</p>
                  <p className="text-sm font-bold text-emerald-400">+{formatCurrency(opFinCalc.liquido)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Juros/IOF (despesa)</p>
                  <p className="text-sm font-bold text-rose-400">-{formatCurrency(opFinCalc.juros)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Taxa Efetiva</p>
                  <p className="text-sm font-bold text-amber-400">{opFinCalc.taxaPct.toFixed(2)}%</p>
                  <p className="text-[9px] text-slate-500">~{opFinCalc.taxaAnualizada.toFixed(1)}% a.a.</p>
                </div>
              </div>
              {opFinCalc.datasParcelas.length > 0 && (
                <div className="border-t border-slate-700 pt-3">
                  <p className="text-xs text-slate-400 mb-2">Parcelas a pagar:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {opFinCalc.datasParcelas.map(p => (
                      <div key={p.numero} className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Parcela {p.numero}/{opFin.parcelas} • {p.dataLabel}</span>
                        <span className="text-rose-400 font-semibold">{formatCurrency(p.valor)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-700 mt-2 pt-2 flex justify-between text-xs">
                    <span className="text-slate-400">Total a pagar (face):</span>
                    <span className="text-white font-bold">{formatCurrency(opFinCalc.face)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* ALERTA: Operação cara */}
            {opFinCalc.isCaro && opFinCalc.face > 0 && (
              <div className={cn(
                "rounded-lg border p-3 flex items-start gap-3",
                opFinCalc.nivelCaro === 'grave' ? 'bg-red-900/30 border-red-700/50' :
                opFinCalc.nivelCaro === 'medio' ? 'bg-orange-900/30 border-orange-700/50' :
                'bg-amber-900/30 border-amber-700/50'
              )}>
                <AlertTriangle className={cn("h-5 w-5 mt-0.5 flex-shrink-0",
                  opFinCalc.nivelCaro === 'grave' ? 'text-red-400 animate-pulse' :
                  opFinCalc.nivelCaro === 'medio' ? 'text-orange-400' :
                  'text-amber-400'
                )} />
                <div className="flex-1">
                  <p className={cn("font-bold text-sm",
                    opFinCalc.nivelCaro === 'grave' ? 'text-red-200' :
                    opFinCalc.nivelCaro === 'medio' ? 'text-orange-200' :
                    'text-amber-200'
                  )}>
                    {opFinCalc.nivelCaro === 'grave' ? '🚨 Operação MUITO CARA' :
                     opFinCalc.nivelCaro === 'medio' ? '⚠️ Operação CARA' :
                     '⚠️ Operação Acima da Média'}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    Taxa anualizada de <strong>{opFinCalc.taxaAnualizada.toFixed(1)}% a.a.</strong> excede o limite definido nas metas ({metas.taxaAnualizadaMaxima}% a.a.).
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Custo total dos juros: <strong className="text-rose-400">{formatCurrency(opFinCalc.juros)}</strong> — equivale a <strong className="text-orange-400">{(opFinCalc.juros / metas.fabricacaoPrecoKg / 1000).toFixed(2)} ton</strong> de produção fabricada perdida.
                  </p>
                  {opFinCalc.nivelCaro === 'grave' && (
                    <p className="text-xs text-red-300 mt-2">
                      💡 Considere alternativas: factoring, antecipação de medições, capital de giro com taxa menor.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* COMPARATIVO: Antes × Depois (impacto no caixa) */}
            {opFinCalc.face > 0 && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
                <p className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />Impacto no Caixa: Antes × Depois
                </p>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="font-semibold text-slate-400">Indicador</div>
                  <div className="font-semibold text-slate-400 text-center">ANTES</div>
                  <div className="font-semibold text-slate-400 text-center">DEPOIS</div>

                  <div className="text-slate-300">Saldo projetado 30d</div>
                  <div className="text-center text-slate-300">{formatCurrency(opFinCalc.antes.saldo30)}</div>
                  <div className={cn("text-center font-bold", opFinCalc.deltaSaldo30 >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                    {formatCurrency(opFinCalc.depois.saldo30)}
                    <span className="text-[10px] block">{opFinCalc.deltaSaldo30 >= 0 ? '+' : ''}{formatCurrency(opFinCalc.deltaSaldo30)}</span>
                  </div>

                  <div className="text-slate-300">Saldo projetado 90d</div>
                  <div className="text-center text-slate-300">{formatCurrency(opFinCalc.antes.saldo90)}</div>
                  <div className={cn("text-center font-bold", opFinCalc.deltaSaldo90 >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                    {formatCurrency(opFinCalc.depois.saldo90)}
                    <span className="text-[10px] block">{opFinCalc.deltaSaldo90 >= 0 ? '+' : ''}{formatCurrency(opFinCalc.deltaSaldo90)}</span>
                  </div>

                  <div className="text-slate-300">A receber (30d)</div>
                  <div className="text-center text-slate-300">{formatCurrency(opFinCalc.antes.receber30)}</div>
                  <div className="text-center font-bold text-emerald-400">{formatCurrency(opFinCalc.depois.receber30)}</div>

                  <div className="text-slate-300">A pagar (30d)</div>
                  <div className="text-center text-slate-300">{formatCurrency(opFinCalc.antes.pagar30)}</div>
                  <div className="text-center font-bold text-rose-400">{formatCurrency(opFinCalc.depois.pagar30)}</div>
                </div>

                {/* Avaliação automática */}
                <div className={cn("mt-3 pt-3 border-t border-slate-700 text-xs",
                  opFinCalc.deltaSaldo90 >= 0 ? 'text-emerald-300' : 'text-rose-300'
                )}>
                  {opFinCalc.deltaSaldo90 >= 0 ? (
                    <span>✅ <strong>Operação melhora o caixa em 90 dias</strong> — entrada líquida atual cobre as parcelas no horizonte de 3 meses.</span>
                  ) : (
                    <span>❌ <strong>Operação piora o caixa em 90 dias</strong> — você vai pagar mais nas parcelas do que recebeu líquido. Avalie cuidadosamente.</span>
                  )}
                </div>
              </div>
            )}

            <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500" onClick={handleCriarOperacaoFinanceira}>
              <Plus className="h-4 w-4 mr-2" />Criar Operação ({2 + opFinCalc.datasParcelas.length} lançamentos)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: Metas ===== */}
      <Dialog open={metasDialogOpen} onOpenChange={setMetasDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl flex flex-col p-0 max-h-[92vh]">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />Configurar Metas (locais)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 pb-6 overflow-y-auto flex-1">
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-xs text-purple-200">
              Estas metas são exclusivas deste módulo. Não afetam Metas Financeiras nem outros painéis.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 text-xs flex items-center gap-1"><Factory className="h-3 w-3" />Fabricação (kg/mês)</Label>
                <Input type="number" className="mt-1 bg-slate-800 border-slate-700" value={metasForm.fabricacaoKg} onChange={(e) => setMetasForm({...metasForm, fabricacaoKg: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Preço Fabricação (R$/kg)</Label>
                <Input type="number" step="0.10" className="mt-1 bg-slate-800 border-slate-700" value={metasForm.fabricacaoPrecoKg} onChange={(e) => setMetasForm({...metasForm, fabricacaoPrecoKg: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label className="text-slate-300 text-xs flex items-center gap-1"><HardHat className="h-3 w-3" />Montagem (kg/mês)</Label>
                <Input type="number" className="mt-1 bg-slate-800 border-slate-700" value={metasForm.montagemKg} onChange={(e) => setMetasForm({...metasForm, montagemKg: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Preço Montagem (R$/kg)</Label>
                <Input type="number" step="0.10" className="mt-1 bg-slate-800 border-slate-700" value={metasForm.montagemPrecoKg} onChange={(e) => setMetasForm({...metasForm, montagemPrecoKg: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-200">
              <strong>Receita mínima mensal calculada:</strong> {formatCurrency((metasForm.fabricacaoKg * metasForm.fabricacaoPrecoKg) + (metasForm.montagemKg * metasForm.montagemPrecoKg))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 text-xs flex items-center gap-1"><ArrowDownRight className="h-3 w-3" />Despesa-Teto (R$/mês)</Label>
                <Input type="number" className="mt-1 bg-slate-800 border-slate-700" value={metasForm.despesaTetoMensal} onChange={(e) => setMetasForm({...metasForm, despesaTetoMensal: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label className="text-slate-300 text-xs flex items-center gap-1"><TrendingUp className="h-3 w-3" />Margem Mínima (%)</Label>
                <Input type="number" className="mt-1 bg-slate-800 border-slate-700" value={metasForm.margemMinima} onChange={(e) => setMetasForm({...metasForm, margemMinima: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label className="text-slate-300 text-xs flex items-center gap-1"><Wallet className="h-3 w-3" />Saldo Mínimo (R$)</Label>
                <Input type="number" className="mt-1 bg-slate-800 border-slate-700" value={metasForm.saldoMinimo} onChange={(e) => setMetasForm({...metasForm, saldoMinimo: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label className="text-slate-300 text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3" />Threshold valor alto (R$)</Label>
                <Input type="number" className="mt-1 bg-slate-800 border-slate-700" value={metasForm.thresholdValorAlto} onChange={(e) => setMetasForm({...metasForm, thresholdValorAlto: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Janela crítica (dias)</Label>
                <Input type="number" className="mt-1 bg-slate-800 border-slate-700" value={metasForm.alertaCriticoDias} onChange={(e) => setMetasForm({...metasForm, alertaCriticoDias: parseInt(e.target.value) || 0})} />
              </div>
              <div>
                <Label className="text-slate-300 text-xs">Janela atenção (dias)</Label>
                <Input type="number" className="mt-1 bg-slate-800 border-slate-700" value={metasForm.alertaAtencaoDias} onChange={(e) => setMetasForm({...metasForm, alertaAtencaoDias: parseInt(e.target.value) || 0})} />
              </div>
              <div className="col-span-2">
                <Label className="text-slate-300 text-xs flex items-center gap-1">
                  <Percent className="h-3 w-3" />Taxa anualizada máxima aceitável (% a.a.)
                </Label>
                <Input type="number" step="1" className="mt-1 bg-slate-800 border-slate-700" value={metasForm.taxaAnualizadaMaxima} onChange={(e) => setMetasForm({...metasForm, taxaAnualizadaMaxima: parseFloat(e.target.value) || 0})} />
                <p className="text-[10px] text-slate-500 mt-1">Acima deste valor, operações financeiras serão marcadas como "caras". Padrão: 50% a.a.</p>
              </div>
            </div>
            <Button className="w-full bg-gradient-to-r from-purple-500 to-indigo-500" onClick={handleSalvarMetas}>
              Salvar Metas
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: Confirmar Exclusão ===== */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-400" />Confirmar</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">
            {(() => {
              const m = todasMovs.find(mm => mm.id === deleteConfirmId);
              if (!m) return 'Apagar este item?';
              return m.origem === 'local'
                ? 'Tem certeza que deseja apagar este lançamento local?'
                : 'Item externo será ocultado APENAS neste módulo (origem intacta).';
            })()}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-slate-700" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => handleApagar(deleteConfirmId)}>
              <Trash2 className="h-4 w-4 mr-2" />Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: Reset ===== */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2"><RotateCcw className="h-5 w-5 text-amber-400" />Resetar dados locais</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">
            Apaga TODOS os lançamentos próprios, edições locais e itens ocultos. Restaura também o status de alertas lidos. Metas e configurações ficam preservadas.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-slate-700" onClick={() => setResetDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleResetTudo}>
              <RotateCcw className="h-4 w-4 mr-2" />Resetar tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTE: Filtros de tabela (Tipo / Mês / Status / Ordenação)
// ============================================================
function FiltrosMovs({
  filtroTipo, setFiltroTipo,
  filtroMes, setFiltroMes,
  filtroStatusTab, setFiltroStatusTab,
  ordenarPor, setOrdenarPor,
  mesesDisponiveis = [], formatMesLabel,
  hideTipo = false,
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap bg-slate-800/40 rounded-lg p-2.5">
      {!hideTipo && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 font-semibold uppercase">Tipo</span>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-[120px] bg-slate-800 border-slate-700 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="receita">Receitas</SelectItem>
              <SelectItem value="despesa">Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-slate-500 font-semibold uppercase">Mês</span>
        <Select value={filtroMes} onValueChange={setFiltroMes}>
          <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 max-h-[300px]">
            <SelectItem value="todos">Todos os meses</SelectItem>
            {mesesDisponiveis.map(m => (
              <SelectItem key={m} value={m}>{formatMesLabel(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-slate-500 font-semibold uppercase mr-1">Status</span>
        {[
          { v: 'todos', l: 'Todos', cor: 'slate' },
          { v: 'pendente', l: 'Pendente', cor: 'amber' },
          { v: 'atrasado', l: 'Atrasado', cor: 'red' },
          { v: 'pago', l: 'Pago/Recebido', cor: 'emerald' },
        ].map(s => (
          <button
            key={s.v}
            onClick={() => setFiltroStatusTab(s.v)}
            className={cn(
              "px-2.5 py-1 rounded text-[11px] font-medium transition-all border",
              filtroStatusTab === s.v
                ? s.cor === 'amber' ? 'bg-amber-500/30 border-amber-500/60 text-amber-200'
                : s.cor === 'red' ? 'bg-red-500/30 border-red-500/60 text-red-200'
                : s.cor === 'emerald' ? 'bg-emerald-500/30 border-emerald-500/60 text-emerald-200'
                : 'bg-slate-700 border-slate-600 text-white'
                : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-700/50'
            )}
          >
            {s.l}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-[10px] text-slate-500 font-semibold uppercase">Ordenar</span>
        <Select value={ordenarPor} onValueChange={setOrdenarPor}>
          <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="vencimento">Vencimento ↑ (próximos)</SelectItem>
            <SelectItem value="data">Data ↓ (recentes)</SelectItem>
            <SelectItem value="valor">Valor ↓ (maiores)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTE: Tabela de movimentações reutilizável
// ============================================================
function MovsTable({ rows, onEdit, onDelete, onRestore, onDeleteGroup, hideTipo = false, selecionadosIds = [], setSelecionadosIds }) {
  const idsSet = new Set(selecionadosIds || []);
  const todosSelecionados = rows.length > 0 && rows.every(r => idsSet.has(r.id));
  const algumSelecionado = rows.some(r => idsSet.has(r.id));

  const toggleTodos = () => {
    if (!setSelecionadosIds) return;
    if (todosSelecionados) {
      setSelecionadosIds([]);
    } else {
      setSelecionadosIds(rows.map(r => r.id));
    }
  };
  const toggleUm = (id) => {
    if (!setSelecionadosIds) return;
    setSelecionadosIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Totalizadores — se nada selecionado, usa todos os visíveis
  const linhasParaTotal = selecionadosIds && selecionadosIds.length > 0
    ? rows.filter(r => idsSet.has(r.id))
    : rows;
  const totReceitas = linhasParaTotal.filter(m => m.tipo === 'receita').reduce((s,m) => s + (m.valor || 0), 0);
  const totDespesas = linhasParaTotal.filter(m => m.tipo === 'despesa').reduce((s,m) => s + (m.valor || 0), 0);
  const saldo = totReceitas - totDespesas;
  const qtdSel = selecionadosIds?.length || 0;

  const colCount = (hideTipo ? 0 : 1) + 8; // tipo + outras 8 (origem, data, desc, forn, cat, valor, status, ações)

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700">
            <TableHead className="w-10">
              <Checkbox checked={todosSelecionados} onCheckedChange={toggleTodos}
                className={cn(algumSelecionado && !todosSelecionados ? "data-[state=checked]:bg-amber-500" : "")} />
            </TableHead>
            <TableHead className="text-slate-400">Origem</TableHead>
            {!hideTipo && <TableHead className="text-slate-400">Tipo</TableHead>}
            <TableHead className="text-slate-400">Vencimento</TableHead>
            <TableHead className="text-slate-400">Emissão</TableHead>
            <TableHead className="text-slate-400">Descrição</TableHead>
            <TableHead className="text-slate-400">Fornecedor/Obra</TableHead>
            <TableHead className="text-slate-400">Categoria</TableHead>
            <TableHead className="text-slate-400 text-right">Valor</TableHead>
            <TableHead className="text-slate-400">Status</TableHead>
            <TableHead className="text-slate-400 w-16">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(mov => (
            <TableRow key={mov.id} className={cn(
              "border-slate-800 hover:bg-slate-800/50",
              idsSet.has(mov.id) && "bg-purple-900/20"
            )}>
              <TableCell>
                <Checkbox checked={idsSet.has(mov.id)} onCheckedChange={() => toggleUm(mov.id)} />
              </TableCell>
              <TableCell>
                {mov.origem === 'local' ? (
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 border text-[10px]">
                    <Lock className="h-3 w-3 mr-1" />Local
                  </Badge>
                ) : mov.origemModificado ? (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 border text-[10px]">
                    <Edit className="h-3 w-3 mr-1" />Editado
                  </Badge>
                ) : (
                  <Badge className="bg-slate-600/40 text-slate-300 border-slate-500/30 border text-[10px]">Espelho</Badge>
                )}
              </TableCell>
              {!hideTipo && (
                <TableCell>
                  {mov.tipo === 'receita' ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border text-xs">
                      <ArrowUpRight className="h-3 w-3 mr-1" />Receita
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 border text-xs">
                      <ArrowDownRight className="h-3 w-3 mr-1" />Despesa
                    </Badge>
                  )}
                </TableCell>
              )}
              <TableCell className="text-sm whitespace-nowrap">
                {(() => {
                  const venc = mov.vencimento && mov.vencimento !== '-' ? mov.vencimento : null;
                  if (!venc) return <span className="text-slate-500">—</span>;
                  const dVenc = parseLocalDate(venc);
                  const hoje = new Date(); hoje.setHours(0,0,0,0);
                  if (dVenc) dVenc.setHours(0,0,0,0);
                  const ehPago = ['recebido','pago','paga','faturado','confirmado'].includes(mov.status);
                  const vencido = dVenc && dVenc < hoje && !ehPago;
                  return (
                    <span className={cn("font-semibold", vencido ? "text-red-400" : "text-slate-200")}>
                      {formatDate(venc)}
                      {vencido && <span className="block text-[9px] text-red-300 font-normal">vencido</span>}
                    </span>
                  );
                })()}
              </TableCell>
              <TableCell className="text-slate-500 text-xs whitespace-nowrap">{formatDate(mov.data)}</TableCell>
              <TableCell className="text-white font-medium max-w-[220px]">
                <span className="truncate block">{mov.descricao}</span>
                {ehCheque(mov) && <span className="text-[10px] text-blue-400">🏦 cheque detectado</span>}
                {mov.origemObra && mov.numero && (
                  <span className="text-xs text-emerald-500">Medição #{mov.numero} • {mov.etapaLabel}</span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {mov.origemObra ? (
                  <span className="text-blue-400 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />{mov.obraNome}
                  </span>
                ) : (
                  <span className="text-slate-300">{mov.fornecedor || '-'}</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="border-slate-600 text-xs" style={{ color: CORES_CATEGORIAS[mov.categoria] || '#64748b' }}>
                  <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: CORES_CATEGORIAS[mov.categoria] || '#64748b' }} />
                  {mov.categoria || '-'}
                </Badge>
              </TableCell>
              <TableCell className={cn("text-right font-semibold", mov.tipo === 'receita' ? "text-emerald-400" : "text-red-400")}>
                {mov.tipo === 'receita' ? '+' : '-'} {formatCurrency(mov.valor)}
              </TableCell>
              <TableCell>
                {(() => {
                  // Auto-detecção: se venc < hoje e não pago, mostra como Atrasado
                  const stBruto = mov.status;
                  const ehPago = ['recebido','pago','paga','faturado','confirmado'].includes(stBruto);
                  let ehAtrasado = stBruto === 'atrasado';
                  if (!ehPago && !ehAtrasado) {
                    const venc = mov.vencimento && mov.vencimento !== '-' ? mov.vencimento : mov.data;
                    const dVenc = parseLocalDate(venc);
                    const hoje = new Date(); hoje.setHours(0,0,0,0);
                    if (dVenc) dVenc.setHours(0,0,0,0);
                    if (dVenc && dVenc < hoje) ehAtrasado = true;
                  }
                  return (
                    <Badge className={cn("border text-xs",
                      ehPago ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      ehAtrasado ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' :
                      'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    )}>
                      {ehPago ? (mov.tipo === 'receita' ? 'Recebido' : 'Pago') :
                        ehAtrasado ? 'Atrasado' : 'Pendente'}
                    </Badge>
                  );
                })()}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                    <DropdownMenuItem className="text-slate-300 focus:text-white focus:bg-slate-700" onClick={() => onEdit(mov)}>
                      <Edit className="h-4 w-4 mr-2" />Editar (local)
                    </DropdownMenuItem>
                    {mov.origemModificado && (
                      <DropdownMenuItem className="text-blue-300 focus:text-blue-200 focus:bg-slate-700" onClick={() => onRestore(mov.id)}>
                        <RotateCcw className="h-4 w-4 mr-2" />Restaurar original
                      </DropdownMenuItem>
                    )}
                    {(mov.recorrenciaId || mov.operacaoFinanceiraId) && onDeleteGroup && (
                      <DropdownMenuItem className="text-orange-400 focus:text-orange-300 focus:bg-slate-700" onClick={() => onDeleteGroup(
                        mov.recorrenciaId ? 'recorrenciaId' : 'operacaoFinanceiraId',
                        mov.recorrenciaId || mov.operacaoFinanceiraId
                      )}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Apagar TODAS as parcelas do grupo
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-400 focus:text-red-300 focus:bg-slate-700" onClick={() => onDelete(mov.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {mov.origem === 'local' ? 'Apagar esta linha' : 'Ocultar localmente'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={hideTipo ? 10 : 11} className="text-center text-slate-500 py-8">
                Nenhuma movimentação encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* TOTALIZADOR */}
      {rows.length > 0 && (
        <div className="mt-3 bg-gradient-to-r from-slate-900/80 to-slate-800/80 border border-slate-700 rounded-lg p-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-semibold", qtdSel > 0 ? "text-purple-300" : "text-slate-300")}>
                {qtdSel > 0
                  ? `${qtdSel} ${qtdSel === 1 ? 'item selecionado' : 'itens selecionados'}`
                  : `Total geral: ${rows.length} ${rows.length === 1 ? 'item visível' : 'itens visíveis'}`}
              </span>
              {qtdSel > 0 && setSelecionadosIds && (
                <button onClick={() => setSelecionadosIds([])} className="text-[10px] text-slate-400 hover:text-white underline">
                  Limpar seleção
                </button>
              )}
            </div>
            <div className="flex items-center gap-4 flex-wrap text-sm">
              {totReceitas > 0 && (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Receitas</span>
                  <span className="ml-2 text-emerald-400 font-bold">+{formatCurrency(totReceitas)}</span>
                </div>
              )}
              {totDespesas > 0 && (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase">Despesas</span>
                  <span className="ml-2 text-red-400 font-bold">-{formatCurrency(totDespesas)}</span>
                </div>
              )}
              <div className="border-l border-slate-700 pl-4">
                <span className="text-[10px] text-slate-500 uppercase">Saldo</span>
                <span className={cn("ml-2 text-base font-black", saldo >= 0 ? "text-blue-400" : "text-rose-400")}>
                  {saldo >= 0 ? '+' : ''}{formatCurrency(saldo)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SUB-COMPONENTE: Lista de items futuros (compacta)
// ============================================================
function FuturoLista({ items, tipo }) {
  if (items.length === 0) {
    return <div className="text-slate-500 text-sm text-center py-4">Nenhum {tipo === 'receita' ? 'recebimento' : 'pagamento'} previsto</div>;
  }
  return (
    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <Badge className={cn("text-[10px]",
                item.diasVenc < 0 ? 'bg-red-700/40 text-red-200' :
                item.diasVenc <= 2 ? 'bg-red-500/30 text-red-300' :
                item.diasVenc <= 7 ? 'bg-amber-500/30 text-amber-300' :
                item.diasVenc <= 30 ? 'bg-blue-500/30 text-blue-300' :
                'bg-slate-600/40 text-slate-400'
              )}>
                {item.diasVenc < 0 ? `Vencido ${Math.abs(item.diasVenc)}d` : `${item.diasVenc}d`}
              </Badge>
              {item._ehCheque && <Badge className="bg-blue-500/30 text-blue-300 text-[10px]">CHEQUE</Badge>}
            </div>
            <p className="text-sm text-white truncate">{item.descricao}</p>
            <p className="text-xs text-slate-500 truncate">{item.fornecedor} • {formatDate(item.vencimento && item.vencimento !== '-' ? item.vencimento : item.data)}</p>
          </div>
          <p className={cn("text-sm font-bold flex-shrink-0", tipo === 'receita' ? 'text-emerald-400' : 'text-red-400')}>
            {formatCurrency(item.valor)}
          </p>
        </div>
      ))}
    </div>
  );
}
