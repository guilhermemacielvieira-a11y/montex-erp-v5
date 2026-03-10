// MONTEX ERP Premium - Painel Financeiro Geral
// Consolida: Despesas Gerais (lancamentos sem obra) + Receitas (medições de obras)
// Financeiro Fábrica - Visão unificada da saúde financeira da empresa

import React, { useState, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import {
  AreaChart,
  Area,
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
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ERPContext
import { useLancamentos, useMedicoes, useObras } from '../contexts/ERPContext';

// ========== HELPERS ==========
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0
  }).format(value || 0);
};

const formatDate = (date) => {
  if (!date || date === '-') return '-';
  try {
    return new Date(date).toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
};

const ETAPA_LABELS = {
  fabricacao: 'Fabricação',
  montagem: 'Montagem',
};

// Cores das categorias de despesa
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

export default function FinanceiroPage() {
  // ===== DADOS DO SUPABASE =====
  const { lancamentosDespesas, addLancamento, updateLancamento, deleteLancamento } = useLancamentos();
  const { medicoes: todasMedicoes } = useMedicoes();
  const { obras } = useObras();

  // ===== ESTADOS =====
  const [activeTab, setActiveTab] = useState('geral');
  const [filtroPeriodo, setFiltroPeriodo] = useState('geral');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroObra, setFiltroObra] = useState('geral'); // 'geral' | 'fabrica' | obraId
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [formData, setFormData] = useState({
    tipo: 'despesa', descricao: '', valor: '', categoria: '',
    fornecedor: '', vencimento: '', formaPagto: '', status: 'pendente'
  });

  // ===== MAPA DE OBRAS =====
  const obrasMap = useMemo(() => {
    const map = {};
    (obras || []).forEach(o => { map[o.id] = o.nome || o.name || o.id; });
    return map;
  }, [obras]);

  // ===== DESPESAS GERAIS (sem obraId = Financeiro Fábrica) =====
  const despesasGerais = useMemo(() => {
    if (!lancamentosDespesas || lancamentosDespesas.length === 0) return [];
    return lancamentosDespesas
      .filter(l => !l.obraId && !l.obra_id)
      .map(l => ({
        id: l.id,
        tipo: 'despesa',
        data: l.dataEmissao || l.data || l.createdAt || '',
        descricao: l.descricao || l.nome || '-',
        fornecedor: l.fornecedor || '-',
        categoria: l.categoria || 'Outros',
        valor: l.valor || 0,
        status: l.status || 'pendente',
        formaPagto: l.formaPagto || '-',
        vencimento: l.dataVencimento || l.vencimento || '-',
        origem: 'Despesa Fábrica',
        origemObra: false,
      }));
  }, [lancamentosDespesas]);

  // ===== RECEITAS DAS MEDIÇÕES (todas as obras) =====
  const receitasMedicoes = useMemo(() => {
    if (!todasMedicoes || todasMedicoes.length === 0) return [];
    return todasMedicoes.map(m => {
      const obraId = m.obraId || m.obra_id;
      const obraNome = m.obraNome || m.obra_nome || obrasMap[obraId] || '-';
      const etapaLabel = m.isAvulsa ? 'Avulsa' : (ETAPA_LABELS[m.etapa] || m.etapa || 'Medição');
      return {
        id: m.id,
        tipo: 'receita',
        data: m.dataMedicao || m.data_medicao || m.dataReferencia || m.data_referencia || '',
        descricao: m.descricao || `Medição #${m.numero || '?'} - ${etapaLabel}`,
        fornecedor: obraNome,
        categoria: m.isAvulsa ? 'Serviço Avulso' : 'Medição',
        valor: m.valorBruto || m.valor_bruto || 0,
        valorLiquido: m.valorLiquido || m.valor_liquido || 0,
        status: ['pago', 'faturado', 'confirmado'].includes(m.status) ? 'recebido' : (m.status || 'pendente'),
        formaPagto: '-',
        vencimento: m.dataMedicao || m.data_medicao || '-',
        numero: m.numero,
        etapa: m.etapa,
        etapaLabel,
        origem: `Obra: ${obraNome}`,
        origemObra: true,
        obraId,
        obraNome,
      };
    });
  }, [todasMedicoes, obrasMap]);

  // ===== OPÇÕES DE OBRAS PARA O SELETOR =====
  const opcoesObra = useMemo(() => {
    const opcoes = [
      { value: 'geral', label: 'Visão Geral (Todas)' },
      { value: 'fabrica', label: 'Financeiro Fábrica (Despesas)' },
    ];
    (obras || []).forEach(o => {
      opcoes.push({ value: o.id, label: o.nome || o.name || o.id });
    });
    return opcoes;
  }, [obras]);

  // ===== TODAS AS MOVIMENTAÇÕES CONSOLIDADAS (com filtro de obra) =====
  const todasMovimentacoes = useMemo(() => {
    let despesas = despesasGerais;
    let receitas = receitasMedicoes;

    if (filtroObra === 'fabrica') {
      // Somente despesas da fábrica (sem obraId)
      receitas = [];
    } else if (filtroObra !== 'geral') {
      // Filtra por obra específica
      despesas = []; // Despesas gerais não pertencem a nenhuma obra
      receitas = receitasMedicoes.filter(r => r.obraId === filtroObra);
    }
    // 'geral' mostra tudo

    return [...despesas, ...receitas]
      .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));
  }, [despesasGerais, receitasMedicoes, filtroObra]);

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

  // ===== DADOS DO PERÍODO =====
  const movimentacoesPeriodo = useMemo(() => filtrarPorPeriodo(todasMovimentacoes), [todasMovimentacoes, filtrarPorPeriodo]);

  // ===== KPIs =====
  const kpis = useMemo(() => {
    const receitas = movimentacoesPeriodo.filter(m => m.tipo === 'receita');
    const despesas = movimentacoesPeriodo.filter(m => m.tipo === 'despesa');
    const totalReceitas = receitas.reduce((s, m) => s + (m.valor || 0), 0);
    const totalDespesas = despesas.reduce((s, m) => s + (m.valor || 0), 0);
    const receitasRecebidas = receitas.filter(m => ['recebido', 'pago', 'faturado', 'confirmado'].includes(m.status)).reduce((s, m) => s + (m.valor || 0), 0);
    const receitasPendentes = receitas.filter(m => m.status === 'pendente' || m.status === 'aprovado').reduce((s, m) => s + (m.valor || 0), 0);
    const despesasPagas = despesas.filter(m => m.status === 'pago').reduce((s, m) => s + (m.valor || 0), 0);
    const despesasPendentes = despesas.filter(m => m.status === 'pendente').reduce((s, m) => s + (m.valor || 0), 0);
    const lucro = totalReceitas - totalDespesas;
    const margem = totalReceitas > 0 ? (lucro / totalReceitas * 100) : 0;
    return {
      totalReceitas, totalDespesas, lucro, margem,
      receitasRecebidas, receitasPendentes,
      despesasPagas, despesasPendentes,
      qtdReceitas: receitas.length, qtdDespesas: despesas.length,
      qtdTotal: movimentacoesPeriodo.length,
    };
  }, [movimentacoesPeriodo]);

  // ===== DADOS PARA GRÁFICOS =====
  // Pizza: despesas por categoria
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

  // Evolução mensal
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

  // ===== FILTRAR PARA TABELA =====
  const movimentacoesFiltradas = useMemo(() => {
    let lista = todasMovimentacoes;
    if (filtroTipo !== 'todos') lista = lista.filter(m => m.tipo === filtroTipo);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      lista = lista.filter(m =>
        (m.descricao || '').toLowerCase().includes(s) ||
        (m.fornecedor || '').toLowerCase().includes(s) ||
        (m.origem || '').toLowerCase().includes(s)
      );
    }
    return filtrarPorPeriodo(lista);
  }, [todasMovimentacoes, filtroTipo, searchTerm, filtrarPorPeriodo]);

  // ===== HANDLERS =====
  const handleNova = () => {
    setEditando(null);
    setFormData({ tipo: 'despesa', descricao: '', valor: '', categoria: '', fornecedor: '', vencimento: '', formaPagto: '', status: 'pendente' });
    setDialogOpen(true);
  };

  const handleEditar = (mov) => {
    if (mov.origemObra) {
      // Receitas de obra não podem ser editadas aqui
      return;
    }
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
    });
    setDialogOpen(true);
  };

  const handleSalvar = async () => {
    if (!formData.descricao || !formData.valor) {
      return;
    }
    if (editando) {
      try {
        await updateLancamento(editando.id, {
          descricao: formData.descricao,
          fornecedor: formData.fornecedor || '-',
          categoria: formData.categoria || 'Outros',
          valor: parseFloat(formData.valor),
          formaPagto: formData.formaPagto || '-',
          vencimento: formData.vencimento || '',
          status: formData.status || 'pendente',
        });
      } catch (err) {
        console.error('Erro ao atualizar:', err);
      }
    } else {
      try {
        await addLancamento({
          id: `FIN-${Date.now()}`,
          tipo: formData.tipo || 'despesa',
          descricao: formData.descricao,
          fornecedor: formData.fornecedor || '-',
          categoria: formData.categoria || 'Outros',
          valor: parseFloat(formData.valor),
          formaPagto: formData.formaPagto || '-',
          data: formData.vencimento || new Date().toISOString().split('T')[0],
          dataEmissao: new Date().toISOString().split('T')[0],
          vencimento: formData.vencimento || '',
          status: formData.status || 'pendente',
          obraId: null,
        });
      } catch (err) {
        console.error('Erro ao criar:', err);
      }
    }
    setDialogOpen(false);
    setEditando(null);
  };

  const handleApagar = async (id) => {
    try {
      await deleteLancamento(id);
    } catch (err) {
      console.error('Erro ao apagar:', err);
    }
    setDeleteConfirmId(null);
  };

  // ===== CATEGORIAS DISPONÍVEIS =====
  const categoriasDisponiveis = [
    'Matéria Prima', 'Mão de Obra', 'Energia/Utilidades', 'Manutenção',
    'Transporte', 'Administrativo', 'Impostos', 'Outros'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            Painel Financeiro
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium border border-emerald-500/30">
              <Wallet className="h-3.5 w-3.5 mr-1" />
              {filtroObra === 'geral' ? 'Visão Geral' : filtroObra === 'fabrica' ? 'Financeiro Fábrica' : (obrasMap[filtroObra] || 'Obra')}
            </span>
            <span className="text-slate-500 text-sm">|</span>
            <span className="text-slate-400 text-sm">{kpis.qtdTotal} lançamentos</span>
            <span className="text-slate-500 text-sm">|</span>
            <span className="text-emerald-400 text-xs">{kpis.qtdReceitas} receitas (medições)</span>
            <span className="text-slate-500 text-sm">|</span>
            <span className="text-rose-400 text-xs">{kpis.qtdDespesas} despesas</span>
          </div>
        </div>

        <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600" onClick={handleNova}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Movimentação
        </Button>
      </div>

      {/* Dialog Cadastrar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditando(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editando ? 'Editar Movimentação' : 'Nova Movimentação'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
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
            <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500" onClick={handleSalvar}>
              {editando ? 'Salvar Alterações' : 'Cadastrar'}
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
          <p className="text-slate-400 text-sm">Tem certeza que deseja apagar esta movimentação?</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-slate-700" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => handleApagar(deleteConfirmId)}>
              <Trash2 className="h-4 w-4 mr-2" />Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filtros: Visualização + Período */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Seletor de Obra / Visão */}
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

        {/* Filtro Período */}
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
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
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
                <p className="text-xs text-slate-500">{kpis.qtdReceitas} medições</p>
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
        {/* Evolução Mensal */}
        <Card className="bg-slate-900/60 border-slate-700/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
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

        {/* Pizza Despesas */}
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

      {/* Tabela de Movimentações */}
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
                        ['recebido', 'pago', 'faturado', 'confirmado'].includes(mov.status) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        mov.status === 'atrasado' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      )}>
                        {['recebido', 'pago', 'faturado', 'confirmado'].includes(mov.status) ? 'Recebido' :
                         mov.status === 'atrasado' ? 'Atrasado' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!mov.origemObra ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                            <DropdownMenuItem className="text-slate-300 focus:text-white focus:bg-slate-700" onClick={() => handleEditar(mov)}>
                              <Edit className="h-4 w-4 mr-2" />Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-400 focus:text-red-300 focus:bg-slate-700" onClick={() => setDeleteConfirmId(mov.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />Apagar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-slate-600 text-xs">Auto</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {movimentacoesFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 py-8">
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
