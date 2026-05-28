// MONTEX ERP Premium - Painel Financeiro GLOBAL (ISOLADO)
//
// Este módulo é um ESPELHO do Painel Financeiro principal, com a MESMA dinâmica:
//   - Lê todas as receitas/despesas/medições do sistema (Supabase + localStorage)
//   - Atualiza automaticamente quando o sistema principal recebe novos lançamentos
//
// Diferença: lançamentos criados/editados/excluídos AQUI NÃO PROPAGAM para o resto
// do sistema. Tudo é salvo em chaves de localStorage isoladas:
//   - montex_global_movs       — lançamentos próprios criados aqui
//   - montex_global_overrides  — edições locais sobre itens externos (não tocam Supabase)
//   - montex_global_hidden     — itens externos "ocultos" localmente (não deletados na origem)
//
// Logo: o módulo é editável (pode adicionar/editar/excluir tudo localmente),
// mas o sistema principal continua intacto. Atualizações externas continuam
// chegando aqui automaticamente.

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  BarChart3,
  Search,
  Edit,
  FileText,
  CheckCircle2,
  Clock,
  Trash2,
  Calendar,
  Building2,
  AlertTriangle,
  Shield,
  Lock,
  RotateCcw,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
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
import toast from 'react-hot-toast';

// ERPContext (somente LEITURA — não chamamos add/update/delete daqui)
import { useLancamentos, useMedicoes, useObras } from '../contexts/ERPContext';

// ============================================================
// CHAVES ISOLADAS — não conflitam com nenhuma outra parte do sistema
// ============================================================
const GLOBAL_MOVS_KEY      = 'montex_global_movs';       // lançamentos criados aqui
const GLOBAL_OVERRIDES_KEY = 'montex_global_overrides';  // edits sobre items externos
const GLOBAL_HIDDEN_KEY    = 'montex_global_hidden';     // ids ocultos localmente

// Chaves do sistema principal (somente LEITURA aqui)
const RECEITAS_STORAGE_KEY  = 'montex_receitas_gerais';
const RECEITAS_OVERRIDES_KEY = 'montex_receitas_overrides';

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
// COMPONENT
// ============================================================
export default function PainelFinanceiroGlobal() {
  // ===== DADOS EXTERNOS (read-only mirror) =====
  const { lancamentosDespesas } = useLancamentos();
  const { medicoes: todasMedicoes } = useMedicoes();
  const { obras } = useObras();

  // ===== DADOS LOCAIS ISOLADOS =====
  const [movsLocais, setMovsLocais] = useState(() => lerLS(GLOBAL_MOVS_KEY, []));
  const [overridesLocais, setOverridesLocais] = useState(() => lerLS(GLOBAL_OVERRIDES_KEY, {}));
  const [hiddenLocais, setHiddenLocais] = useState(() => lerLS(GLOBAL_HIDDEN_KEY, []));

  // Persiste localmente
  useEffect(() => salvarLS(GLOBAL_MOVS_KEY, movsLocais), [movsLocais]);
  useEffect(() => salvarLS(GLOBAL_OVERRIDES_KEY, overridesLocais), [overridesLocais]);
  useEffect(() => salvarLS(GLOBAL_HIDDEN_KEY, hiddenLocais), [hiddenLocais]);

  // Reativo a mudanças do sistema principal (outras abas/janelas)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === GLOBAL_MOVS_KEY)      setMovsLocais(lerLS(GLOBAL_MOVS_KEY, []));
      if (e.key === GLOBAL_OVERRIDES_KEY) setOverridesLocais(lerLS(GLOBAL_OVERRIDES_KEY, {}));
      if (e.key === GLOBAL_HIDDEN_KEY)    setHiddenLocais(lerLS(GLOBAL_HIDDEN_KEY, []));
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // ===== ESTADOS UI =====
  const [filtroPeriodo, setFiltroPeriodo] = useState('geral');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroObra, setFiltroObra] = useState('geral');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'despesa', descricao: '', valor: '', categoria: '',
    fornecedor: '', vencimento: '', formaPagto: '', status: 'pendente', obraId: '',
  });

  // ===== MAPA DE OBRAS =====
  const obrasMap = useMemo(() => {
    const map = {};
    (obras || []).forEach(o => { map[o.id] = o.nome || o.name || o.id; });
    return map;
  }, [obras]);

  // ===== DESPESAS GERAIS (espelho — Supabase) =====
  const despesasGeraisExternas = useMemo(() => {
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

  // ===== RECEITAS MEDIÇÕES (espelho — Supabase + overrides do sistema principal) =====
  const receitasMedicoesExternas = useMemo(() => {
    if (!todasMedicoes || todasMedicoes.length === 0) return [];
    const overrides = lerLS(RECEITAS_OVERRIDES_KEY, {});
    return todasMedicoes.map(m => {
      const obraId = m.obraId || m.obra_id;
      const obraNome = m.obraNome || m.obra_nome || obrasMap[obraId] || '-';
      const etapaLabel = m.isAvulsa ? 'Avulsa' : (ETAPA_LABELS[m.etapa] || m.etapa || 'Medição');
      const base = {
        id: m.id,
        origem: 'externo',
        tipo: 'receita',
        data: m.dataMedicao || m.data_medicao || m.dataReferencia || m.data_referencia || '',
        descricao: m.descricao || `Medição #${m.numero || '?'} - ${etapaLabel}`,
        fornecedor: obraNome,
        categoria: m.isAvulsa ? 'Serviço Avulso' : 'Medição',
        valor: m.valorBruto || m.valor_bruto || 0,
        status: ['pago', 'paga', 'faturado', 'confirmado'].includes(m.status) ? 'recebido' : (m.status || 'pendente'),
        formaPagto: '-',
        vencimento: m.dataMedicao || m.data_medicao || '-',
        numero: m.numero,
        etapaLabel,
        origemLabel: `Obra: ${obraNome}`,
        origemObra: true,
        obraId,
        obraNome,
      };
      // Aplicar overrides do ReceitasPage (sistema principal)
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

  // ===== RECEITAS MANUAIS (espelho — localStorage do ReceitasPage) =====
  const receitasManuaisExternas = useMemo(() => {
    try {
      const salvas = JSON.parse(localStorage.getItem(RECEITAS_STORAGE_KEY) || '[]');
      return salvas.map(r => ({
        id: r.id,
        origem: 'externo',
        tipo: 'receita',
        data: r.data || r.vencimento || '',
        descricao: r.descricao || '-',
        fornecedor: r.cliente || '-',
        categoria: r.categoria || 'Outros',
        valor: r.valor || 0,
        status: ['pago', 'paga', 'faturado', 'confirmado', 'recebido'].includes(r.status) ? 'recebido' : (r.status || 'pendente'),
        formaPagto: r.formaPagto || '-',
        vencimento: r.vencimento || '-',
        origemLabel: 'Receita Manual',
        origemObra: false,
      }));
    } catch { return []; }
  }, [movsLocais]); // re-leitura quando user edita aqui (força refresh)

  // ===== MOVS LOCAIS (criadas aqui) =====
  const movsLocaisNormalizadas = useMemo(() => {
    return (movsLocais || []).map(m => ({
      ...m,
      origem: 'local',
      origemLabel: 'Global Local',
      origemObra: !!m.obraId,
      obraNome: m.obraId ? (obrasMap[m.obraId] || '-') : '-',
    }));
  }, [movsLocais, obrasMap]);

  // ===== CONSOLIDAÇÃO: externas + locais + overrides + hidden =====
  const todasMovimentacoes = useMemo(() => {
    const externas = [...despesasGeraisExternas, ...receitasMedicoesExternas, ...receitasManuaisExternas];
    // Aplicar overrides locais e filtrar hidden
    const externasComOverrides = externas
      .filter(m => !hiddenLocais.includes(m.id))
      .map(m => {
        const ov = overridesLocais[m.id];
        if (!ov) return m;
        return { ...m, ...ov, id: m.id, origem: 'externo', origemModificado: true };
      });
    // Concat com lançamentos locais próprios
    const todas = [...externasComOverrides, ...movsLocaisNormalizadas];

    // Filtro obra
    let filtradas = todas;
    if (filtroObra === 'fabrica') {
      filtradas = todas.filter(m => !m.origemObra);
    } else if (filtroObra !== 'geral') {
      filtradas = todas.filter(m => m.obraId === filtroObra);
    }

    return filtradas.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
  }, [despesasGeraisExternas, receitasMedicoesExternas, receitasManuaisExternas, movsLocaisNormalizadas, overridesLocais, hiddenLocais, filtroObra]);

  // ===== OPÇÕES DE OBRAS =====
  const opcoesObra = useMemo(() => {
    const ops = [
      { value: 'geral', label: 'Visão Geral (Todas)' },
      { value: 'fabrica', label: 'Financeiro Fábrica (Despesas)' },
    ];
    (obras || []).forEach(o => ops.push({ value: o.id, label: o.nome || o.name || o.id }));
    return ops;
  }, [obras]);

  // ===== FILTRO DE PERÍODO =====
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

  const movimentacoesPeriodo = useMemo(() => filtrarPorPeriodo(todasMovimentacoes), [todasMovimentacoes, filtrarPorPeriodo]);

  // ===== KPIs =====
  const kpis = useMemo(() => {
    const receitas = movimentacoesPeriodo.filter(m => m.tipo === 'receita');
    const despesas = movimentacoesPeriodo.filter(m => m.tipo === 'despesa');
    const totalReceitas = receitas.reduce((s, m) => s + (m.valor || 0), 0);
    const totalDespesas = despesas.reduce((s, m) => s + (m.valor || 0), 0);
    const receitasPendentes = receitas.filter(m => !['recebido', 'pago', 'paga'].includes(m.status)).reduce((s, m) => s + (m.valor || 0), 0);
    const despesasPendentes = despesas.filter(m => m.status === 'pendente').reduce((s, m) => s + (m.valor || 0), 0);
    const lucro = totalReceitas - totalDespesas;
    const margem = totalReceitas > 0 ? (lucro / totalReceitas * 100) : 0;
    const qtdLocais = movimentacoesPeriodo.filter(m => m.origem === 'local').length;
    const qtdOverrides = movimentacoesPeriodo.filter(m => m.origemModificado).length;
    return {
      totalReceitas, totalDespesas, lucro, margem,
      receitasPendentes, despesasPendentes,
      qtdReceitas: receitas.length, qtdDespesas: despesas.length,
      qtdTotal: movimentacoesPeriodo.length, qtdLocais, qtdOverrides,
    };
  }, [movimentacoesPeriodo]);

  // ===== GRÁFICOS =====
  const dadosPizzaDespesas = useMemo(() => {
    const map = {};
    movimentacoesPeriodo.filter(m => m.tipo === 'despesa').forEach(m => {
      const cat = m.categoria || 'Outros';
      map[cat] = (map[cat] || 0) + (m.valor || 0);
    });
    return Object.entries(map).map(([nome, valor]) => ({
      nome, valor, cor: CORES_CATEGORIAS[nome] || '#64748b'
    }));
  }, [movimentacoesPeriodo]);

  const evolucaoMensal = useMemo(() => {
    const meses = {};
    movimentacoesPeriodo.forEach(m => {
      const d = new Date(m.data || m.vencimento);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!meses[key]) meses[key] = { mes: label, key, receitas: 0, despesas: 0 };
      if (m.tipo === 'receita') meses[key].receitas += m.valor || 0;
      else meses[key].despesas += m.valor || 0;
    });
    return Object.values(meses).sort((a, b) => a.key.localeCompare(b.key));
  }, [movimentacoesPeriodo]);

  // ===== TABELA FILTRADA =====
  const movimentacoesFiltradas = useMemo(() => {
    let lista = todasMovimentacoes;
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
  }, [todasMovimentacoes, filtroTipo, searchTerm, filtrarPorPeriodo]);

  // ============================================================
  // HANDLERS — TUDO LOCAL, NÃO TOCA SUPABASE
  // ============================================================
  const handleNova = () => {
    setEditando(null);
    setFormData({ tipo: 'despesa', descricao: '', valor: '', categoria: '', fornecedor: '', vencimento: '', formaPagto: '', status: 'pendente', obraId: '' });
    setDialogOpen(true);
  };

  const handleEditar = (mov) => {
    setEditando(mov);
    setFormData({
      tipo: mov.tipo || 'despesa',
      descricao: mov.descricao || '',
      valor: String(mov.valor || ''),
      categoria: mov.categoria || '',
      fornecedor: mov.fornecedor || '',
      vencimento: mov.vencimento && mov.vencimento !== '-' ? mov.vencimento : '',
      formaPagto: mov.formaPagto || '',
      status: mov.status || 'pendente',
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
        // Editar lançamento próprio: atualiza direto em movsLocais
        setMovsLocais(prev => prev.map(m => m.id === editando.id ? {
          ...m,
          tipo: formData.tipo,
          descricao: formData.descricao,
          fornecedor: formData.fornecedor || '-',
          categoria: formData.categoria || 'Outros',
          valor: valorNum,
          formaPagto: formData.formaPagto || '-',
          vencimento: formData.vencimento || '',
          data: formData.vencimento || m.data,
          status: formData.status || 'pendente',
          obraId: formData.obraId || null,
        } : m));
        toast.success('Lançamento local atualizado (sem propagar)');
      } else {
        // Editar lançamento externo: salva override LOCAL (não toca Supabase)
        setOverridesLocais(prev => ({
          ...prev,
          [editando.id]: {
            tipo: formData.tipo,
            descricao: formData.descricao,
            fornecedor: formData.fornecedor || '-',
            categoria: formData.categoria || 'Outros',
            valor: valorNum,
            formaPagto: formData.formaPagto || '-',
            vencimento: formData.vencimento || '',
            data: formData.vencimento || editando.data,
            status: formData.status || 'pendente',
          }
        }));
        toast.success('Override local salvo — sistema principal intacto');
      }
    } else {
      // Novo lançamento — só local
      const novo = {
        id: `GLOBAL-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        tipo: formData.tipo,
        descricao: formData.descricao,
        fornecedor: formData.fornecedor || '-',
        categoria: formData.categoria || 'Outros',
        valor: valorNum,
        formaPagto: formData.formaPagto || '-',
        vencimento: formData.vencimento || '',
        data: formData.vencimento || new Date().toISOString().split('T')[0],
        status: formData.status || 'pendente',
        obraId: formData.obraId || null,
        createdAt: new Date().toISOString(),
      };
      setMovsLocais(prev => [...prev, novo]);
      toast.success('Lançamento criado SOMENTE neste módulo');
    }
    setDialogOpen(false);
    setEditando(null);
  };

  const handleApagar = (id) => {
    const mov = todasMovimentacoes.find(m => m.id === id);
    if (!mov) { setDeleteConfirmId(null); return; }
    if (mov.origem === 'local') {
      setMovsLocais(prev => prev.filter(m => m.id !== id));
      toast.success('Lançamento local removido');
    } else {
      // Item externo: marca como hidden localmente (NÃO deleta no sistema principal)
      setHiddenLocais(prev => [...prev, id]);
      toast.success('Item ocultado localmente — origem intacta');
    }
    setDeleteConfirmId(null);
  };

  const handleResetTudo = () => {
    setMovsLocais([]);
    setOverridesLocais({});
    setHiddenLocais([]);
    toast.success('Dados locais do Painel Global resetados');
    setResetDialogOpen(false);
  };

  const handleRestaurarItem = (id) => {
    // Remove override OU remove de hidden
    setOverridesLocais(prev => { const { [id]: _, ...rest } = prev; return rest; });
    setHiddenLocais(prev => prev.filter(h => h !== id));
    toast.success('Item externo restaurado');
  };

  // Categorias disponíveis
  const categoriasDisponiveis = [
    'Matéria Prima', 'Mão de Obra', 'Energia/Utilidades', 'Manutenção',
    'Transporte', 'Administrativo', 'Impostos',
    'Medição', 'Serviço Avulso', 'Outros'
  ];

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      {/* Header */}
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
              Módulo Isolado — não propaga
            </span>
            <span className="text-slate-500 text-sm">|</span>
            <span className="text-slate-400 text-sm">{kpis.qtdTotal} lançamentos</span>
            <span className="text-slate-500 text-sm">|</span>
            <span className="text-emerald-400 text-xs">{kpis.qtdReceitas} receitas</span>
            <span className="text-slate-500 text-sm">|</span>
            <span className="text-rose-400 text-xs">{kpis.qtdDespesas} despesas</span>
            {kpis.qtdLocais > 0 && (
              <>
                <span className="text-slate-500 text-sm">|</span>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                  {kpis.qtdLocais} lançamentos locais
                </Badge>
              </>
            )}
            {kpis.qtdOverrides > 0 && (
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                {kpis.qtdOverrides} edições locais
              </Badge>
            )}
            {hiddenLocais.length > 0 && (
              <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-xs">
                {hiddenLocais.length} ocultos
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white" onClick={() => setResetDialogOpen(true)} disabled={movsLocais.length === 0 && Object.keys(overridesLocais).length === 0 && hiddenLocais.length === 0}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar locais
          </Button>
          <Button className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600" onClick={handleNova}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Movimentação (Local)
          </Button>
        </div>
      </div>

      {/* Banner informativo */}
      <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-xl border border-purple-700/30 p-3">
        <div className="flex items-start gap-3 text-xs text-purple-200">
          <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-purple-100">Como este módulo funciona:</strong>{' '}
            Espelha automaticamente os lançamentos de Receitas, Despesas e Medições do sistema (atualização em tempo real).
            Lançamentos criados, editados ou excluídos AQUI são salvos apenas localmente — não afetam o Painel Financeiro, GFO, Metas Financeiras ou nenhum outro módulo.
          </div>
        </div>
      </div>

      {/* Dialog Cadastrar/Editar */}
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
                Você está editando um item externo. As alterações ficam SÓ neste módulo. O lançamento original em Receitas/Despesas/GFO permanece intacto.
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
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Cartão">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Vincular à Obra (opcional, local)</Label>
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

      {/* Dialog Confirmar Exclusão */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">
            {(() => {
              const m = todasMovimentacoes.find(mm => mm.id === deleteConfirmId);
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

      {/* Dialog Reset */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-400" />
              Resetar dados locais
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">
            Isso apaga TODOS os lançamentos próprios criados aqui, todas as edições locais sobre itens externos, e restaura itens ocultados. O sistema principal não é afetado.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-slate-700" onClick={() => setResetDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleResetTudo}>
              <RotateCcw className="h-4 w-4 mr-2" />Resetar tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-400 mr-1">Visualizar:</span>
          <Select value={filtroObra} onValueChange={setFiltroObra}>
            <SelectTrigger className="w-[240px] bg-slate-800 border-slate-700 text-sm">
              <SelectValue placeholder="Selecione a visão" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {opcoesObra.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-400 mr-1">Período:</span>
          {[
            { value: 'geral', label: 'Geral' },
            { value: 'semanal', label: 'Semanal' },
            { value: 'mensal', label: 'Mensal' },
            { value: 'trimestral', label: 'Trimestral' },
          ].map(p => (
            <button
              key={p.value}
              onClick={() => setFiltroPeriodo(p.value)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                filtroPeriodo === p.value
                  ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Receitas</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(kpis.totalReceitas)}</p>
                <p className="text-xs text-slate-500">{kpis.qtdReceitas} lançamentos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <ArrowDownRight className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Despesas</p>
                <p className="text-xl font-bold text-red-400">{formatCurrency(kpis.totalDespesas)}</p>
                <p className="text-xs text-slate-500">{kpis.qtdDespesas} lançamentos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Lucro</p>
                <p className={cn("text-xl font-bold", kpis.lucro >= 0 ? "text-blue-400" : "text-red-400")}>
                  {formatCurrency(kpis.lucro)}
                </p>
                <p className="text-xs text-slate-500">Margem: {kpis.margem.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">A Receber</p>
                <p className="text-xl font-bold text-amber-400">{formatCurrency(kpis.receitasPendentes)}</p>
                <p className="text-xs text-slate-500">A pagar: {formatCurrency(kpis.despesasPendentes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-slate-900/60 border-slate-700/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              Evolução Receitas vs Despesas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={evolucaoMensal} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" stroke="#64748b" />
                <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Receipt className="h-5 w-5 text-rose-400" />
              Despesas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dadosPizzaDespesas.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={dadosPizzaDespesas} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="valor">
                    {dadosPizzaDespesas.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(value) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-slate-500">
                Sem despesas no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card className="bg-slate-900/60 border-slate-700/50">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-white">Movimentações</CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input placeholder="Buscar..." className="pl-10 w-[180px] bg-slate-800 border-slate-700" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Origem</TableHead>
                  <TableHead className="text-slate-400">Tipo</TableHead>
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
                {movimentacoesFiltradas.map(mov => (
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
                        <Badge className="bg-slate-600/40 text-slate-300 border-slate-500/30 border text-[10px]">
                          Espelho
                        </Badge>
                      )}
                    </TableCell>
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
                    <TableCell className="text-slate-300 text-sm">{formatDate(mov.data)}</TableCell>
                    <TableCell className="text-white font-medium max-w-[220px]">
                      <span className="truncate block">{mov.descricao}</span>
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
                        ['recebido', 'pago', 'paga', 'faturado', 'confirmado'].includes(mov.status) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        mov.status === 'atrasado' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      )}>
                        {['recebido', 'pago', 'paga', 'faturado', 'confirmado'].includes(mov.status) ? 'Recebido' :
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
                          <DropdownMenuItem className="text-slate-300 focus:text-white focus:bg-slate-700" onClick={() => handleEditar(mov)}>
                            <Edit className="h-4 w-4 mr-2" />Editar (local)
                          </DropdownMenuItem>
                          {mov.origemModificado && (
                            <DropdownMenuItem className="text-blue-300 focus:text-blue-200 focus:bg-slate-700" onClick={() => handleRestaurarItem(mov.id)}>
                              <RotateCcw className="h-4 w-4 mr-2" />Restaurar original
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-red-400 focus:text-red-300 focus:bg-slate-700" onClick={() => setDeleteConfirmId(mov.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            {mov.origem === 'local' ? 'Apagar' : 'Ocultar localmente'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {movimentacoesFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                      Nenhuma movimentação encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
