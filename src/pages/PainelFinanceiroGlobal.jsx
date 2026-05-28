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
};

// ============================================================
// HELPERS
// ============================================================
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 0
}).format(value || 0);

const formatDate = (date) => {
  if (!date || date === '-') return '-';
  try { return new Date(date).toLocaleDateString('pt-BR'); } catch { return '-'; }
};

const diasAteVencimento = (dataStr) => {
  if (!dataStr || dataStr === '-') return null;
  try {
    const venc = new Date(dataStr);
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
};

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
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [metasDialogOpen, setMetasDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'despesa', descricao: '', valor: '', categoria: '',
    fornecedor: '', vencimento: '', formaPagto: '', status: 'pendente', obraId: '',
  });
  const [metasForm, setMetasForm] = useState(metas);

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
      const d = new Date(m.data || m.vencimento);
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
        const d = new Date(m.vencimento && m.vencimento !== '-' ? m.vencimento : m.data);
        return d >= inicio && d < fim;
      }).reduce((s,m)=>s+(m.valor||0),0);
      const despSem = futurasDespesas.filter(m => {
        const d = new Date(m.vencimento && m.vencimento !== '-' ? m.vencimento : m.data);
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

      // Score = (urgência × valor) - quanto menor dias, maior score
      // Cheques e valores altos ganham boost
      let urgenciaScore = 0;
      if (dias < 0) urgenciaScore = 1000 + Math.abs(dias) * 10; // já vencido
      else if (dias <= metas.alertaCriticoDias) urgenciaScore = 800 - dias * 50;
      else if (dias <= metas.alertaAtencaoDias) urgenciaScore = 400 - dias * 20;

      if (urgenciaScore === 0) return; // fora da janela

      const score = urgenciaScore + Math.log10(Math.max(1, m.valor)) * 100 + (_ehCheque ? 200 : 0) + (valorAlto ? 150 : 0);

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
        titulo: m.tipo === 'despesa'
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
      const d = new Date(m.data || m.vencimento);
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
      const d = new Date(m.data || m.vencimento);
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
      const d = new Date(m.data || m.vencimento);
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
        const d = new Date(m.data || m.vencimento);
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
        const venc = new Date(m.vencimento && m.vencimento !== '-' ? m.vencimento : m.data);
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

  // ===== TABELA FILTRADA =====
  const movsTabela = useMemo(() => {
    let lista = todasMovs;
    if (filtroTipo !== 'todos') lista = lista.filter(m => m.tipo === filtroTipo);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      lista = lista.filter(m =>
        (m.descricao || '').toLowerCase().includes(s) ||
        (m.fornecedor || '').toLowerCase().includes(s) ||
        (m.origemLabel || '').toLowerCase().includes(s)
      );
    }
    return filtrarPorPeriodo(lista);
  }, [todasMovs, filtroTipo, searchTerm, filtrarPorPeriodo]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleNova = (tipo = 'despesa') => {
    setEditando(null);
    setFormData({ tipo, descricao: '', valor: '', categoria: '', fornecedor: '', vencimento: '', formaPagto: '', status: 'pendente', obraId: '' });
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
    });
    setDialogOpen(true);
  };

  const handleSalvar = () => {
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

  const categoriasDisponiveis = [
    'Matéria Prima','Mão de Obra','Energia/Utilidades','Manutenção',
    'Transporte','Administrativo','Impostos','Medição','Serviço Avulso','Outros'
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
          {/* SCORE DE SAÚDE + COMPARATIVO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-white">Movimentações</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input placeholder="Buscar..." className="pl-10 w-[180px] bg-slate-800 border-slate-700" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-[120px] bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="receita">Receitas</SelectItem>
                    <SelectItem value="despesa">Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <MovsTable rows={movsTabela} onEdit={handleEditar} onDelete={(id) => setDeleteConfirmId(id)} onRestore={handleRestaurarItem} />
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-white">Lista de Receitas</CardTitle>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleNova('receita')}>
                <Plus className="h-4 w-4 mr-2" />Nova Receita
              </Button>
            </CardHeader>
            <CardContent>
              <MovsTable rows={movsTabela.filter(m => m.tipo === 'receita')} onEdit={handleEditar} onDelete={(id) => setDeleteConfirmId(id)} onRestore={handleRestaurarItem} hideTipo />
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-white">Lista de Despesas</CardTitle>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => handleNova('despesa')}>
                <Plus className="h-4 w-4 mr-2" />Nova Despesa
              </Button>
            </CardHeader>
            <CardContent>
              <MovsTable rows={movsTabela.filter(m => m.tipo === 'despesa')} onEdit={handleEditar} onDelete={(id) => setDeleteConfirmId(id)} onRestore={handleRestaurarItem} hideTipo />
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-400" />
              {editando ? `Editar (local) ${editando.origem === 'local' ? '' : '— item externo'}` : 'Nova Movimentação Local'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-300">Valor *</Label>
                <Input className="mt-1 bg-slate-800 border-slate-700" type="number" placeholder="0,00" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} />
              </div>
              <div>
                <Label className="text-slate-300">Vencimento</Label>
                <Input className="mt-1 bg-slate-800 border-slate-700" type="date" value={formData.vencimento} onChange={(e) => setFormData({...formData, vencimento: e.target.value})} />
              </div>
              <div>
                <Label className="text-slate-300">Forma Pagto</Label>
                <Select value={formData.formaPagto} onValueChange={(v) => setFormData({...formData, formaPagto: v})}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Cartão">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
            <Button className="w-full bg-gradient-to-r from-purple-500 to-indigo-500" onClick={handleSalvar}>
              {editando ? 'Salvar Alterações (local)' : 'Cadastrar Localmente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: Metas ===== */}
      <Dialog open={metasDialogOpen} onOpenChange={setMetasDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />Configurar Metas (locais)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto pr-2">
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
// SUB-COMPONENTE: Tabela de movimentações reutilizável
// ============================================================
function MovsTable({ rows, onEdit, onDelete, onRestore, hideTipo = false }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700">
            <TableHead className="text-slate-400">Origem</TableHead>
            {!hideTipo && <TableHead className="text-slate-400">Tipo</TableHead>}
            <TableHead className="text-slate-400">Data</TableHead>
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
            <TableRow key={mov.id} className="border-slate-800 hover:bg-slate-800/50">
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
              <TableCell className="text-slate-300 text-sm">{formatDate(mov.data)}</TableCell>
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
                <Badge className={cn("border text-xs",
                  ['recebido','pago','paga','faturado','confirmado'].includes(mov.status) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                  mov.status === 'atrasado' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                  'bg-amber-500/20 text-amber-400 border-amber-500/30'
                )}>
                  {['recebido','pago','paga','faturado','confirmado'].includes(mov.status) ? 'Recebido' :
                    mov.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                </Badge>
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
                    <DropdownMenuItem className="text-red-400 focus:text-red-300 focus:bg-slate-700" onClick={() => onDelete(mov.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {mov.origem === 'local' ? 'Apagar' : 'Ocultar localmente'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={hideTipo ? 8 : 9} className="text-center text-slate-500 py-8">
                Nenhuma movimentação encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
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
