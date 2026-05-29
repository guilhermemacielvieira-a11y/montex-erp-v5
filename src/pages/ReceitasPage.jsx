// MONTEX ERP Premium - Gestão de Receitas
// Financeiro Fábrica - localStorage próprio + importação de receitas da Gestão Financeira Obra

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  DollarSign,
  Plus,
  Search,
  Download,
  Edit,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Eye,
  Calendar,
  Trash2,
  RefreshCw,
  X,
  Building2,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useMedicoes, useObras } from '../contexts/ERPContext';

// ========== STORAGE INDEPENDENTE ==========
const STORAGE_KEY = 'montex_receitas_gerais';
const OVERRIDES_KEY = 'montex_receitas_overrides'; // edições locais em receitas de Obra

// Categorias de receita
const categoriasReceita = [
  { id: 1, nome: 'Medição', cor: '#10b981' },
  { id: 2, nome: 'Adiantamento', cor: '#3b82f6' },
  { id: 3, nome: 'Medição Final', cor: '#8b5cf6' },
  { id: 4, nome: 'Venda Material', cor: '#f59e0b' },
  { id: 5, nome: 'Serviço Avulso', cor: '#ec4899' },
  { id: 6, nome: 'Material Faturado', cor: '#06b6d4' },
  { id: 7, nome: 'Outros', cor: '#64748b' },
];

// Mapeamento de etapa de medição para label
const ETAPA_LABELS = {
  fabricacao: 'Fabricação',
  montagem: 'Montagem',
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0
  }).format(value || 0);
};

const getStatusColor = (status) => {
  switch (status) {
    case 'recebido': case 'pago': case 'paga': case 'confirmado': case 'faturado':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'pendente': case 'pre_aprovado': case 'futuro':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'atrasado':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'aprovado':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'recebido': case 'pago': case 'confirmado': case 'faturado': return 'Recebido';
    case 'paga': return 'Paga';
    case 'pendente': return 'Pendente';
    case 'aprovado': return 'Aprovado';
    case 'pre_aprovado': return 'Pré-Aprovado';
    case 'atrasado': return 'Atrasado';
    case 'futuro': return 'Futuro';
    default: return status || '-';
  }
};

const getCategoriaColor = (nome) => {
  const cat = categoriasReceita.find(c => c.nome === nome);
  return cat?.cor || '#64748b';
};

// Mapear etapa de medição para categoria de receita
const mapEtapaToCategoria = (etapa, isAvulsa) => {
  if (isAvulsa) return 'Serviço Avulso';
  switch (etapa) {
    case 'fabricacao': return 'Medição';
    case 'montagem': return 'Medição';
    default: return 'Medição';
  }
};

export default function ReceitasPage() {
  // ERPContext - puxar MEDIÇÕES da Gestão Financeira Obra + nome das obras
  const { medicoes: todasMedicoes } = useMedicoes();
  const { obras } = useObras();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('geral');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null); // receita sendo editada
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [receitas, setReceitas] = useState([]);
  const [formData, setFormData] = useState({
    descricao: '',
    cliente: '',
    categoria: '',
    valor: '',
    vencimento: '',
    formaPagto: '',
    status: 'pendente',
    obraId: '',
    parcelas: 1,
    intervaloDias: 30,
  });

  // Obras ativas do sistema (para o select de vinculação)
  const obrasAtivasReceita = useMemo(() => (obras || []).filter(o => o.status !== 'cancelada'), [obras]);

  // Lookup de nomes de obra por ID
  const obrasMap = useMemo(() => {
    const map = {};
    if (obras && obras.length > 0) {
      obras.forEach(o => {
        map[o.id] = o.nome || o.name || o.id;
      });
    }
    return map;
  }, [obras]);

  // Salvar receitas manuais + overrides de Obra no localStorage
  const salvarReceitas = useCallback((lista) => {
    try {
      // Receitas manuais
      const manuais = lista.filter(r => !r.origemObra);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(manuais));
      // Overrides: receitas de Obra que foram editadas localmente
      const overrides = {};
      lista.filter(r => r.origemObra && r._editadoLocal).forEach(r => {
        overrides[r.id] = {
          descricao: r.descricao,
          cliente: r.cliente,
          categoria: r.categoria,
          valor: r.valor,
          vencimento: r.vencimento,
          formaPagto: r.formaPagto,
          status: r.status,
          // 🔧 Persistir vínculo de obra também (para receitas de Obra editadas)
          obraId: r.obraId || null,
          obraNome: r.obraNome || null,
          obraCodigo: r.obraCodigo || null,
        };
      });
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
    } catch (e) {
      console.warn('Erro ao salvar receitas:', e);
    }
  }, []);

  // Carregar receitas: localStorage (manuais) + MEDIÇÕES da Gestão Financeira Obra + overrides
  useEffect(() => {
    const todasReceitas = [];

    // 0. Carregar overrides de edições locais em receitas de Obra
    let overrides = {};
    try {
      overrides = JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}');
    } catch (e) {
      console.warn('Erro ao carregar overrides:', e);
    }

    // 1. Receitas manuais do localStorage
    try {
      const salvas = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      salvas.forEach(r => todasReceitas.push(r));
    } catch (e) {
      console.warn('Erro ao carregar receitas:', e);
    }

    // 2. APENAS MEDIÇÕES da Gestão Financeira Obra (aba Medições)
    if (todasMedicoes && todasMedicoes.length > 0) {
      const existingIds = new Set(todasReceitas.map(r => r.id));
      todasMedicoes.forEach(m => {
        if (!existingIds.has(m.id)) {
          const obraId = m.obraId || m.obra_id;
          const obraNome = m.obraNome || m.obra_nome || obrasMap[obraId] || '-';
          const etapaLabel = m.isAvulsa ? 'Avulsa' : (ETAPA_LABELS[m.etapa] || m.etapa || 'Medição');
          const baseReceita = {
            id: m.id,
            data: m.dataMedicao || m.data_medicao || m.dataReferencia || m.data_referencia || new Date().toISOString().split('T')[0],
            descricao: m.descricao || `Medição #${m.numero || '?'} - ${etapaLabel}`,
            cliente: '-',
            categoria: mapEtapaToCategoria(m.etapa, m.isAvulsa),
            numero: m.numero,
            etapa: m.etapa,
            etapaLabel: etapaLabel,
            valor: m.valorBruto || m.valor_bruto || 0,
            valorLiquido: m.valorLiquido || m.valor_liquido || 0,
            status: ['pago', 'paga', 'faturado', 'confirmado'].includes(m.status) ? 'paga' : (m.status || 'pendente'),
            formaPagto: '-',
            vencimento: m.dataMedicao || m.data_medicao || '-',
            setor: m.setor || '-',
            observacao: m.observacao || m.observacoes || '',
            origemObra: true,
            obraId: obraId,
            obraNome: obraNome,
          };
          // Aplicar overrides salvos (edições locais anteriores)
          if (overrides[m.id]) {
            Object.assign(baseReceita, overrides[m.id], { _editadoLocal: true });
          }
          todasReceitas.push(baseReceita);
        }
      });
    }

    setReceitas(todasReceitas);
  }, [todasMedicoes, obrasMap]);

  // Helper: filtrar por período (definido antes dos useMemo)
  const filtrarPorPeriodo = useCallback((lista) => {
    if (filtroPeriodo === 'geral') return lista;
    const hoje = new Date();
    const inicio = new Date();
    if (filtroPeriodo === 'semanal') {
      inicio.setDate(hoje.getDate() - 7);
    } else if (filtroPeriodo === 'mensal') {
      inicio.setMonth(hoje.getMonth() - 1);
    } else if (filtroPeriodo === 'trimestral') {
      inicio.setMonth(hoje.getMonth() - 3);
    }
    return lista.filter(r => {
      const dataRec = new Date(r.data || r.vencimento);
      return dataRec >= inicio && dataRec <= hoje;
    });
  }, [filtroPeriodo]);

  // Receitas filtradas por período (para KPIs e gráficos)
  const receitasPeriodo = useMemo(() => filtrarPorPeriodo(receitas), [receitas, filtrarPorPeriodo]);

  // Dados para gráfico por categoria
  const dadosCategorias = useMemo(() => {
    const catMap = {};
    receitasPeriodo.forEach(r => {
      const cat = r.categoria || 'Outros';
      catMap[cat] = (catMap[cat] || 0) + (r.valor || 0);
    });
    return Object.entries(catMap).map(([nome, valor]) => ({
      nome,
      valor,
      cor: getCategoriaColor(nome),
    }));
  }, [receitasPeriodo]);

  // Evolução mensal para gráfico
  const evolucaoMensal = useMemo(() => {
    const meses = {};
    receitasPeriodo.forEach(r => {
      const d = new Date(r.data || r.vencimento);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!meses[key]) meses[key] = { mes: label, key, recebido: 0, pendente: 0 };
      if (['recebido', 'confirmado', 'pago', 'paga', 'faturado'].includes(r.status)) {
        meses[key].recebido += r.valor || 0;
      } else {
        meses[key].pendente += r.valor || 0;
      }
    });
    return Object.values(meses).sort((a, b) => a.key.localeCompare(b.key));
  }, [receitasPeriodo]);

  // 🔧 Helper: status efetivo (auto-detecção de atrasado para receitas)
  const computeStatusEfetivoReceita = (statusBruto, dataVenc) => {
    const ehRecebido = ['recebido','confirmado','pago','paga','faturado'].includes(statusBruto);
    if (ehRecebido) return statusBruto;
    if (!dataVenc) return statusBruto || 'pendente';
    try {
      const m = String(dataVenc).match(/^(\d{4})-(\d{2})-(\d{2})/);
      const d = m ? new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])) : new Date(dataVenc);
      d.setHours(0,0,0,0);
      const hoje = new Date(); hoje.setHours(0,0,0,0);
      if (d < hoje) return 'atrasado';
    } catch {}
    return statusBruto || 'pendente';
  };

  // KPIs — usa statusEfetivo para identificar atrasados (recebíveis vencidos)
  const kpis = useMemo(() => {
    const enriquecidas = receitasPeriodo.map(r => ({
      ...r,
      statusEfetivo: computeStatusEfetivoReceita(r.status, r.vencimento),
    }));
    const totalRecebido = enriquecidas.filter(r => ['recebido', 'confirmado', 'pago', 'paga', 'faturado'].includes(r.statusEfetivo)).reduce((sum, r) => sum + (r.valor || 0), 0);
    const totalPendente = enriquecidas.filter(r => r.statusEfetivo === 'pendente' || r.statusEfetivo === 'aprovado' || r.statusEfetivo === 'pre_aprovado').reduce((sum, r) => sum + (r.valor || 0), 0);
    const totalAtrasado = enriquecidas.filter(r => r.statusEfetivo === 'atrasado').reduce((sum, r) => sum + (r.valor || 0), 0);
    const total = receitasPeriodo.reduce((sum, r) => sum + (r.valor || 0), 0);
    return { totalRecebido, totalPendente, totalAtrasado, total };
  }, [receitasPeriodo]);

  // Filtrar receitas para tabela — usa statusEfetivo
  const receitasFiltradas = useMemo(() => {
    let resultado = receitas.filter(r => {
      if (searchTerm && !(r.descricao || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(r.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) &&
          !(r.obraNome || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filtroStatus !== 'todos') {
        const stEf = computeStatusEfetivoReceita(r.status, r.vencimento);
        const statusRecebidos = ['recebido', 'pago', 'paga', 'confirmado', 'faturado'];
        if (filtroStatus === 'paga') {
          if (!statusRecebidos.includes(stEf)) return false;
        } else if (stEf !== filtroStatus) return false;
      }
      if (filtroCategoria !== 'todos' && r.categoria !== filtroCategoria) return false;
      return true;
    });
    return filtrarPorPeriodo(resultado);
  }, [receitas, searchTerm, filtroStatus, filtroCategoria, filtrarPorPeriodo]);

  // Abrir form para cadastrar nova receita
  const handleNovaReceita = () => {
    setEditando(null);
    setFormData({ descricao: '', cliente: '', categoria: '', valor: '', vencimento: '', formaPagto: '', status: 'pendente', obraId: '', parcelas: 1, intervaloDias: 30 });
    setDialogOpen(true);
  };

  // Abrir form para editar receita existente
  const handleEditarReceita = (receita) => {
    setEditando(receita);
    setFormData({
      descricao: receita.descricao || '',
      cliente: receita.cliente || '',
      categoria: receita.categoria || '',
      valor: String(receita.valor || ''),
      vencimento: receita.vencimento && receita.vencimento !== '-' ? receita.vencimento : '',
      formaPagto: receita.formaPagto || '',
      status: receita.status || 'pendente',
      obraId: receita.obraId || '',
    });
    setDialogOpen(true);
  };

  // Salvar receita (cadastrar ou editar)
  const handleSaveReceita = () => {
    if (!formData.descricao || !formData.valor) {
      toast.error('Preencha descrição e valor');
      return;
    }

    if (editando) {
      // Editando receita existente
      const obraSelecionadaEdit = formData.obraId
        ? (obrasAtivasReceita.find(o => o.id === formData.obraId) || null)
        : null;
      const novaLista = receitas.map(r => {
        if (r.id !== editando.id) return r;
        return {
          ...r,
          descricao: formData.descricao,
          cliente: formData.cliente || '-',
          categoria: formData.categoria || r.categoria || 'Outros',
          valor: parseFloat(formData.valor),
          vencimento: formData.vencimento || r.vencimento,
          formaPagto: formData.formaPagto || '-',
          status: formData.status || r.status,
          obraId: formData.obraId || r.obraId || null,
          obraNome: obraSelecionadaEdit?.nome || r.obraNome || null,
          obraCodigo: obraSelecionadaEdit?.codigo || r.obraCodigo || null,
          _editadoLocal: r.origemObra ? true : r._editadoLocal, // marca para persistir override
        };
      });
      setReceitas(novaLista);
      salvarReceitas(novaLista);
      toast.success('Receita atualizada!');
    } else {
      // Nova receita manual — pode ter parcelas
      const obraSelecionada = formData.obraId
        ? (obrasAtivasReceita.find(o => o.id === formData.obraId) || null)
        : null;
      const valorNum = parseFloat(formData.valor);
      const qtdParcelas = Math.max(1, parseInt(formData.parcelas) || 1);
      const intervalo = Math.max(1, parseInt(formData.intervaloDias) || 30);

      if (qtdParcelas === 1) {
        const novaReceita = {
          id: `REC-${Date.now()}`,
          data: formData.vencimento || new Date().toISOString().split('T')[0],
          descricao: formData.descricao,
          cliente: formData.cliente || obraSelecionada?.cliente || '-',
          categoria: formData.categoria || 'Outros',
          valor: valorNum,
          status: formData.status || 'pendente',
          formaPagto: formData.formaPagto || '-',
          vencimento: formData.vencimento || new Date().toISOString().split('T')[0],
          obraId: formData.obraId || null,
          obraNome: obraSelecionada?.nome || obraSelecionada?.name || null,
          obraCodigo: obraSelecionada?.codigo || null,
          origemObra: false,
        };
        const novaLista = [...receitas, novaReceita];
        setReceitas(novaLista);
        salvarReceitas(novaLista);
        toast.success('Receita cadastrada!');
      } else {
        // RECORRÊNCIA: N parcelas com vencimentos escalonados
        const baseStr = formData.vencimento || new Date().toISOString().split('T')[0];
        const m = baseStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) {
          toast.error('Data de vencimento inválida');
          return;
        }
        const baseY = parseInt(m[1]), baseM = parseInt(m[2]) - 1, baseD = parseInt(m[3]);
        const recorrenciaId = `REC-REC-${Date.now()}`;
        const novas = [];
        for (let i = 0; i < qtdParcelas; i++) {
          const d = new Date(baseY, baseM, baseD + (i * intervalo));
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const venc = `${yyyy}-${mm}-${dd}`;
          novas.push({
            id: `REC-${Date.now()}-p${i + 1}-${Math.floor(Math.random() * 9999)}`,
            data: venc,
            descricao: `${formData.descricao} (Parc ${i + 1}/${qtdParcelas})`,
            cliente: formData.cliente || obraSelecionada?.cliente || '-',
            categoria: formData.categoria || 'Outros',
            valor: valorNum,
            status: 'pendente',
            formaPagto: formData.formaPagto || '-',
            vencimento: venc,
            obraId: formData.obraId || null,
            obraNome: obraSelecionada?.nome || obraSelecionada?.name || null,
            obraCodigo: obraSelecionada?.codigo || null,
            origemObra: false,
            recorrenciaId,
            parcelaIdx: i + 1,
            parcelaTotal: qtdParcelas,
          });
        }
        const novaLista = [...receitas, ...novas];
        setReceitas(novaLista);
        salvarReceitas(novaLista);
        toast.success(`${qtdParcelas} parcelas criadas (total R$ ${(valorNum * qtdParcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`);
      }
    }

    setDialogOpen(false);
    setEditando(null);
    setFormData({ descricao: '', cliente: '', categoria: '', valor: '', vencimento: '', formaPagto: '', status: 'pendente', obraId: '', parcelas: 1, intervaloDias: 30 });
  };

  // Apagar receita
  const handleApagarReceita = (id) => {
    const novaLista = receitas.filter(r => r.id !== id);
    setReceitas(novaLista);
    salvarReceitas(novaLista);
    setDeleteConfirmId(null);
    toast.success('Receita removida!');
  };

  // Contadores de origem
  const countObra = receitas.filter(r => r.origemObra).length;
  const countManual = receitas.filter(r => !r.origemObra).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            Gestão de Receitas
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm font-medium border border-emerald-500/30">
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              Financeiro Fábrica
            </span>
            <span className="text-slate-500 text-sm">|</span>
            <span className="text-slate-400 text-sm">{receitasFiltradas.length} lançamentos</span>
            {countObra > 0 && (
              <>
                <span className="text-slate-500 text-sm">|</span>
                <span className="text-blue-400 text-xs flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {countObra} da Gestão Financeira Obra
                </span>
              </>
            )}
            {countManual > 0 && (
              <>
                <span className="text-slate-500 text-sm">|</span>
                <span className="text-slate-400 text-xs">{countManual} manuais</span>
              </>
            )}
          </div>
        </div>

        <Button className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600" onClick={handleNovaReceita}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Receita
        </Button>
      </div>

      {/* Dialog Cadastrar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditando(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editando ? 'Editar Receita' : 'Cadastrar Receita'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-300">Descrição *</Label>
              <Input
                className="mt-1 bg-slate-800 border-slate-700"
                placeholder="Ex: Medição 3 - Obra Super Luna"
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Cliente</Label>
                <Input
                  className="mt-1 bg-slate-800 border-slate-700"
                  placeholder="Nome do cliente"
                  value={formData.cliente}
                  onChange={(e) => setFormData({...formData, cliente: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-slate-300">Categoria</Label>
                <Select value={formData.categoria} onValueChange={(value) => setFormData({...formData, categoria: value})}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {categoriasReceita.map(cat => (
                      <SelectItem key={cat.id} value={cat.nome}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />
                          {cat.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Vínculo com Obra */}
            <div>
              <Label className="text-slate-300 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5 text-blue-400" />
                Vincular à Obra
              </Label>
              <Select
                value={formData.obraId || 'nenhuma'}
                onValueChange={(value) => {
                  const obraSel = obrasAtivasReceita.find(o => o.id === value);
                  setFormData({
                    ...formData,
                    obraId: value === 'nenhuma' ? '' : value,
                    // Auto-preencher cliente quando obra selecionada (se cliente vazio)
                    cliente: (!formData.cliente && obraSel?.cliente) ? obraSel.cliente : formData.cliente,
                  });
                }}
              >
                <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Selecione uma obra (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-64">
                  <SelectItem value="nenhuma">— Sem vínculo (receita avulsa) —</SelectItem>
                  {obrasAtivasReceita.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-blue-400" />
                        <span className="font-mono text-xs text-blue-300">{o.codigo || o.id}</span>
                        <span>·</span>
                        <span>{o.nome || o.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.obraId && (
                <p className="text-[10px] text-blue-300 mt-1">
                  💡 Esta receita será vinculada à obra acima — aparecerá no painel financeiro da obra.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Valor *</Label>
                <Input
                  className="mt-1 bg-slate-800 border-slate-700"
                  type="number"
                  placeholder="0,00"
                  value={formData.valor}
                  onChange={(e) => setFormData({...formData, valor: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-slate-300">Vencimento {parseInt(formData.parcelas) > 1 && <span className="text-amber-400 text-xs">(1ª parcela)</span>}</Label>
                <Input
                  className="mt-1 bg-slate-800 border-slate-700"
                  type="date"
                  value={formData.vencimento}
                  onChange={(e) => setFormData({...formData, vencimento: e.target.value})}
                />
              </div>
            </div>

            {/* Parcelamento — só na criação */}
            {!editando && (
              <div className="bg-emerald-900/10 border border-emerald-700/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  📑 Parcelamento <span className="text-[10px] text-slate-500 font-normal">opcional — 1 = receita única</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300 text-xs">Quantidade de Parcelas</Label>
                    <Input type="number" min="1" max="120" className="mt-1 bg-slate-800 border-slate-700"
                      value={formData.parcelas || 1}
                      onChange={(e) => setFormData({...formData, parcelas: parseInt(e.target.value) || 1})} />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Intervalo entre vencimentos (dias)</Label>
                    <Input type="number" min="1" className="mt-1 bg-slate-800 border-slate-700"
                      value={formData.intervaloDias || 30}
                      onChange={(e) => setFormData({...formData, intervaloDias: parseInt(e.target.value) || 30})} />
                  </div>
                </div>
                {parseInt(formData.parcelas) > 1 && parseFloat(formData.valor) > 0 && formData.vencimento && (() => {
                  const qtd = parseInt(formData.parcelas);
                  const intervalo = parseInt(formData.intervaloDias) || 30;
                  const valor = parseFloat(formData.valor) || 0;
                  const m = formData.vencimento.match(/^(\d{4})-(\d{2})-(\d{2})/);
                  if (!m) return null;
                  const base = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
                  const ultima = new Date(base.getFullYear(), base.getMonth(), base.getDate() + ((qtd - 1) * intervalo));
                  return (
                    <div className="text-xs text-emerald-200 bg-emerald-900/30 rounded px-2 py-1.5 flex justify-between items-center flex-wrap gap-1">
                      <span>Vai criar <strong>{qtd}</strong> parcelas de <strong>R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
                      <span>Total: <strong>R$ {(valor * qtd).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> · até {ultima.toLocaleDateString('pt-BR')}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Forma de Pagamento</Label>
                <Select value={formData.formaPagto} onValueChange={(value) => setFormData({...formData, formaPagto: value})}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="paga">Paga/Recebido</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-full bg-gradient-to-r from-emerald-500 to-green-500"
              onClick={handleSaveReceita}
            >
              {editando ? 'Salvar Alterações' : 'Cadastrar Receita'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">Tem certeza que deseja apagar esta receita? Esta ação não pode ser desfeita.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-slate-700" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => handleApagarReceita(deleteConfirmId)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filtros de Período */}
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Recebido</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(kpis.totalRecebido)}</p>
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
                <p className="text-sm text-slate-400">Pendente</p>
                <p className="text-xl font-bold text-amber-400">{formatCurrency(kpis.totalPendente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Atrasado</p>
                <p className="text-xl font-bold text-red-400">{formatCurrency(kpis.totalAtrasado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Geral</p>
                <p className="text-xl font-bold text-white">{formatCurrency(kpis.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução */}
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Evolução de Receitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={evolucaoMensal}>
                <defs>
                  <linearGradient id="colorRecebidoRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" stroke="#64748b" />
                <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(value) => formatCurrency(value)} />
                <Area type="monotone" dataKey="recebido" name="Recebido" stroke="#10b981" fill="url(#colorRecebidoRec)" />
                <Area type="monotone" dataKey="pendente" name="Pendente" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por Categoria */}
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-400" />
              Por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dadosCategorias}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="valor"
                >
                  {dadosCategorias.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cor} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(value) => formatCurrency(value)} />
                <Legend wrapperStyle={{ color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Tabela */}
      <Card className="bg-slate-900/60 border-slate-700/50">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-white">Lista de Receitas</CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar..."
                className="pl-10 w-[180px] bg-slate-800 border-slate-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="paga">Paga/Recebido</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="todos">Todas</SelectItem>
                {categoriasReceita.map(cat => (
                  <SelectItem key={cat.id} value={cat.nome}>{cat.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Data</TableHead>
                  <TableHead className="text-slate-400">Descrição</TableHead>
                  <TableHead className="text-slate-400">Cliente</TableHead>
                  <TableHead className="text-slate-400">Categoria</TableHead>
                  <TableHead className="text-slate-400">Obra</TableHead>
                  <TableHead className="text-slate-400">Vencimento</TableHead>
                  <TableHead className="text-slate-400 text-right">Valor</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Origem</TableHead>
                  <TableHead className="text-slate-400 w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receitasFiltradas.map(receita => (
                  <TableRow key={receita.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="text-slate-300 text-sm">
                      {receita.data && receita.data !== '-' ? new Date(receita.data).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="text-white font-medium max-w-[220px]">
                      <span className="truncate block">{receita.descricao}</span>
                      {receita.origemObra && receita.numero && (
                        <span className="block text-xs text-emerald-500">
                          Medição #{receita.numero} • {receita.etapaLabel || receita.etapa || 'Medição'}
                        </span>
                      )}
                      {receita.origemObra && receita.valorLiquido > 0 && receita.valorLiquido !== receita.valor && (
                        <span className="block text-xs text-slate-500">
                          Líquido: {formatCurrency(receita.valorLiquido)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">{receita.cliente || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600 text-xs" style={{ color: getCategoriaColor(receita.categoria) }}>
                        <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoriaColor(receita.categoria) }} />
                        {receita.categoria || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {/* 🔧 FIX: mostrar obra quando obraId vinculado, mesmo em receita manual editada */}
                      {(() => {
                        const obraIdVinc = receita.obraId || receita.obra_id;
                        const nomeObra = receita.obraNome || receita.obra_nome || obrasMap[obraIdVinc];
                        const codigoObra = receita.obraCodigo || receita.obra_codigo
                          || (obrasAtivasReceita.find(o => o.id === obraIdVinc)?.codigo);
                        if (obraIdVinc || nomeObra) {
                          return (
                            <span className={cn(
                              "flex items-center gap-1",
                              receita.origemObra ? "text-blue-400" : "text-cyan-400"
                            )}>
                              <Building2 className="h-3 w-3" />
                              <div className="flex flex-col">
                                {codigoObra && <span className="text-[10px] font-mono opacity-70">{codigoObra}</span>}
                                <span className="text-xs">{nomeObra || obraIdVinc || '-'}</span>
                              </div>
                            </span>
                          );
                        }
                        return <span className="text-slate-500">-</span>;
                      })()}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {receita.vencimento && receita.vencimento !== '-' ? new Date(receita.vencimento).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-400">{formatCurrency(receita.valor)}</TableCell>
                    <TableCell>
                      {(() => {
                        const stEf = computeStatusEfetivoReceita(receita.status, receita.vencimento);
                        const isRecebido = ['recebido','confirmado','pago','paga','faturado'].includes(stEf);
                        const isAtrasado = stEf === 'atrasado';
                        if (isAtrasado) {
                          return (
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/40 border text-xs animate-pulse">
                              Atrasado
                            </Badge>
                          );
                        }
                        if (isRecebido) {
                          return (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border text-xs">
                              Recebido
                            </Badge>
                          );
                        }
                        return (
                          <Badge className={cn("border text-xs", getStatusColor(receita.status))}>
                            {getStatusText(receita.status)}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {receita.origemObra ? (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 border text-xs">
                          Obra
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 border text-xs">
                          Manual
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          {!receita.origemObra && (
                            <DropdownMenuItem className="text-slate-300 hover:text-white focus:text-white focus:bg-slate-700" onClick={() => handleEditarReceita(receita)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {receita.origemObra && (
                            <DropdownMenuItem className="text-slate-300 hover:text-white focus:text-white focus:bg-slate-700" onClick={() => handleEditarReceita(receita)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar Dados Locais
                            </DropdownMenuItem>
                          )}
                          {!receita.origemObra && (
                            <DropdownMenuItem className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-slate-700" onClick={() => setDeleteConfirmId(receita.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Apagar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {receitasFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-slate-500 py-8">
                      Nenhuma receita encontrada. Cadastre uma nova ou aguarde importação da Gestão Financeira Obra.
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
