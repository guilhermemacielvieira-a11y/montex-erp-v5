// MONTEX ERP Premium - Painel Financeiro (comum)
// Receita × Despesa de UM escopo por vez:
//   - Fábrica (geral): lançamentos sem obra (Despesas/Receitas comuns)
//   - Obra X: medições + receitas manuais + despesas com obra_id = X
// Todo lançamento feito aqui escolhe o vínculo (Fábrica ou uma obra).
//
// PREMISSA (CLAUDE.md, "1b. Premissas do financeiro"): mão única. Os
// lançamentos daqui (tabelas lancamentos_despesas / receitas_manuais) são
// espelhados no Painel Financeiro Global; despesas de obra ficam fora do caixa
// da empresa. Lançamentos feitos NO Painel Global nunca aparecem aqui.

import React, { useState, useMemo, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  Plus,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  BarChart3,
  Search,
  Edit,
  Clock,
  Trash2,
  Calendar,
  Building2,
  AlertTriangle,
} from 'lucide-react';
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
  Legend,
} from 'recharts';
import { toast } from 'sonner';
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
import {
  atualizarReceitaManual, criarReceitasManuais, deleteReceitaManual, useReceitasManuais,
} from '../utils/receitasSync';
import {
  despesaCancelada, despesaPaga, medicaoRecebida, medicaoReconhecida,
  normalizeStatusReceita, receitaCancelada, receitaRecebida,
} from '../utils/financeiroStatus';
import { formatCurrency, formatDate, hojeLocalISO, parseLocalDate } from '../utils/financeiroCalc';

// ========== HELPERS ==========
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

// Escopo 'fabrica' = financeiro geral (lançamentos sem obra)
const FABRICA = 'fabrica';
const obraDe = (x) => x?.obraId || x?.obra_id || null;
const escopoDe = (x) => obraDe(x) || FABRICA;
const obraIdDoEscopo = (escopo) => (!escopo || escopo === FABRICA ? null : escopo);
const tempo = (d) => parseLocalDate(d)?.getTime() || 0;

// Vencido e ainda não quitado → atrasado (datas locais)
const vencido = (dataVenc) => {
  const d = parseLocalDate(dataVenc && dataVenc !== '-' ? dataVenc : null);
  if (!d || isNaN(d.getTime())) return false;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return d < hoje;
};

export default function FinanceiroPage() {
  // ===== DADOS DO SUPABASE =====
  const { lancamentosDespesas, addLancamento, updateLancamento, deleteLancamento } = useLancamentos();
  const { medicoes: todasMedicoes } = useMedicoes();
  const { obras } = useObras();

  // ===== ESTADOS =====
  const [filtroPeriodo, setFiltroPeriodo] = useState('geral');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [obraSelecionada, setObraSelecionada] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [formData, setFormData] = useState({
    tipo: 'despesa', descricao: '', valor: '', categoria: '',
    fornecedor: '', vencimento: '', formaPagto: '', status: 'pendente',
    parcelas: 1, intervaloDias: 30, vinculo: FABRICA,
  });

  // Escopo analisado: escolha do usuário (Fábrica ou obra); padrão Fábrica
  const filtroObra = useMemo(() => {
    const ids = new Set((obras || []).map(o => o.id));
    if (obraSelecionada && (obraSelecionada === FABRICA || ids.has(obraSelecionada))) return obraSelecionada;
    return FABRICA;
  }, [obras, obraSelecionada]);
  const ehFabrica = filtroObra === FABRICA;

  const nomeEscopo = useCallback((escopo) => {
    if (!escopo || escopo === FABRICA) return 'Fábrica (geral)';
    const o = (obras || []).find(x => x.id === escopo);
    return o?.nome || o?.name || escopo;
  }, [obras]);

  const obraInfo = useMemo(() => (ehFabrica ? null : (obras || []).find(o => o.id === filtroObra) || null), [obras, filtroObra, ehFabrica]);
  const obraNome = nomeEscopo(filtroObra);
  const contratoValor = Number(obraInfo?.contratoValorTotal ?? obraInfo?.contrato_valor_total ?? obraInfo?.valorContrato ?? 0) || 0;

  // ===== DESPESAS DA OBRA (lancamentos_despesas com obra_id = obra) =====
  const despesasObra = useMemo(() => {
    if (!filtroObra) return [];
    return (lancamentosDespesas || [])
      .filter(l => escopoDe(l) === filtroObra && !despesaCancelada(l.status))
      .map(l => {
        const venc = l.dataVencimento || l.vencimento || '-';
        const pago = despesaPaga(l.status);
        return {
          id: l.id,
          tipo: 'despesa',
          data: l.dataEmissao || l.data || l.createdAt || '',
          descricao: l.descricao || l.nome || '-',
          fornecedor: l.fornecedor || '-',
          categoria: l.categoria || 'Outros',
          valor: Number(l.valor) || 0,
          status: l.status || 'pendente',
          quitado: pago,
          atrasado: !pago && vencido(venc),
          formaPagto: l.formaPagto || '-',
          vencimento: venc,
          origem: 'despesa',
        };
      });
  }, [lancamentosDespesas, filtroObra]);

  // ===== RECEITAS DA OBRA: MEDIÇÕES =====
  // Reconhecida (aprovada/faturada/paga) conta como receita; prevista/em
  // análise aparece na lista mas fica fora dos totais; rejeitada some.
  // 'faturado' NÃO é recebido (nota emitida ≠ dinheiro em caixa).
  const receitasMedicoes = useMemo(() => {
    if (!filtroObra) return [];
    return (todasMedicoes || [])
      .filter(m => escopoDe(m) === filtroObra && !receitaCancelada(m.status))
      .map(m => {
        const etapaLabel = m.isAvulsa ? 'Avulsa' : (ETAPA_LABELS[m.etapa] || m.etapa || 'Medição');
        const venc = m.dataVencimento || m.data_vencimento || m.dataMedicao || m.data_medicao || '-';
        const recebido = medicaoRecebida(m.status);
        const prevista = !medicaoReconhecida(m.status);
        return {
          id: m.id,
          tipo: 'receita',
          data: m.dataMedicao || m.data_medicao || m.dataReferencia || m.data_referencia || '',
          descricao: m.descricao || `Medição #${m.numero || '?'} - ${etapaLabel}`,
          fornecedor: obraNome,
          categoria: m.isAvulsa ? 'Serviço Avulso' : 'Medição',
          valor: Number(m.valorBruto ?? m.valor_bruto ?? 0) || 0,
          status: m.status || 'aguardando',
          quitado: recebido,
          prevista,
          atrasado: !recebido && !prevista && vencido(venc),
          formaPagto: '-',
          vencimento: venc,
          numero: m.numero,
          etapaLabel,
          origem: 'medicao',
        };
      });
  }, [todasMedicoes, filtroObra, obraNome]);

  // ===== RECEITAS DA OBRA: MANUAIS (receitas_manuais.obra_id = obra) =====
  const { receitas: receitasManuaisFonte } = useReceitasManuais();
  const receitasManuais = useMemo(() => {
    if (!filtroObra) return [];
    return (receitasManuaisFonte || [])
      .filter(r => escopoDe(r) === filtroObra && !receitaCancelada(r.status))
      .map(r => {
        const venc = r.vencimento || '-';
        const status = normalizeStatusReceita(r.status);
        const recebido = receitaRecebida(status);
        return {
          id: r.id,
          tipo: 'receita',
          data: r.data || r.vencimento || '',
          descricao: r.descricao || '-',
          fornecedor: r.cliente || '-',
          categoria: r.categoria || 'Outros',
          valor: Number(r.valor) || 0,
          status,
          quitado: recebido,
          // 'aberto' ainda não é receita reconhecida; faturado/recebido sim
          prevista: status === 'aberto',
          atrasado: !recebido && vencido(venc),
          formaPagto: r.formaPagto || '-',
          vencimento: venc,
          origem: 'receita_manual',
        };
      });
  }, [receitasManuaisFonte, filtroObra]);

  // ===== MOVIMENTAÇÕES DA OBRA =====
  const todasMovimentacoes = useMemo(() => (
    [...despesasObra, ...receitasMedicoes, ...receitasManuais]
      .sort((a, b) => tempo(b.data) - tempo(a.data))
  ), [despesasObra, receitasMedicoes, receitasManuais]);

  // ===== FILTRO DE PERÍODO (datas locais) =====
  const filtrarPorPeriodo = useCallback((lista) => {
    if (filtroPeriodo === 'geral') return lista;
    const hoje = new Date(); hoje.setHours(23, 59, 59, 999);
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0);
    if (filtroPeriodo === 'semanal') inicio.setDate(inicio.getDate() - 7);
    else if (filtroPeriodo === 'mensal') inicio.setMonth(inicio.getMonth() - 1);
    else if (filtroPeriodo === 'trimestral') inicio.setMonth(inicio.getMonth() - 3);
    return lista.filter(m => {
      const d = parseLocalDate(m.data || (m.vencimento !== '-' ? m.vencimento : null));
      return d && d >= inicio && d <= hoje;
    });
  }, [filtroPeriodo]);

  // ===== DADOS DO PERÍODO =====
  const movimentacoesPeriodo = useMemo(() => filtrarPorPeriodo(todasMovimentacoes), [todasMovimentacoes, filtrarPorPeriodo]);

  // ===== KPIs (receita reconhecida × despesa da obra) =====
  const kpis = useMemo(() => {
    const soma = (l) => l.reduce((s, m) => s + (m.valor || 0), 0);
    const receitas = movimentacoesPeriodo.filter(m => m.tipo === 'receita' && !m.prevista);
    const previstas = movimentacoesPeriodo.filter(m => m.tipo === 'receita' && m.prevista);
    const despesas = movimentacoesPeriodo.filter(m => m.tipo === 'despesa');
    const totalReceitas = soma(receitas);
    const totalDespesas = soma(despesas);
    const receitasRecebidas = soma(receitas.filter(m => m.quitado));
    const receitasPendentes = totalReceitas - receitasRecebidas;
    const despesasPagas = soma(despesas.filter(m => m.quitado));
    const despesasPendentes = totalDespesas - despesasPagas;
    const lucro = totalReceitas - totalDespesas;
    const margem = totalReceitas > 0 ? (lucro / totalReceitas * 100) : 0;
    return {
      totalReceitas, totalDespesas, lucro, margem,
      receitasRecebidas, receitasPendentes,
      despesasPagas, despesasPendentes,
      saldoCaixaObra: receitasRecebidas - despesasPagas,
      totalPrevisto: soma(previstas),
      qtdReceitas: receitas.length + previstas.length, qtdDespesas: despesas.length,
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

  // Evolução mensal (somente receitas reconhecidas × despesas)
  const evolucaoMensal = useMemo(() => {
    const meses = {};
    movimentacoesPeriodo.forEach(m => {
      if (m.prevista) return;
      const d = parseLocalDate(m.data || (m.vencimento !== '-' ? m.vencimento : null));
      if (!d || isNaN(d.getTime())) return;
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
        (m.categoria || '').toLowerCase().includes(s)
      );
    }
    return filtrarPorPeriodo(lista);
  }, [todasMovimentacoes, filtroTipo, searchTerm, filtrarPorPeriodo]);

  // ===== HANDLERS =====
  const formVazio = { tipo: 'despesa', descricao: '', valor: '', categoria: '', fornecedor: '', vencimento: '', formaPagto: '', status: 'pendente', parcelas: 1, intervaloDias: 30, vinculo: FABRICA };

  const handleNova = () => {
    setEditando(null);
    // Vínculo sugerido = escopo em tela (o usuário pode trocar no form)
    setFormData({ ...formVazio, vinculo: filtroObra || FABRICA });
    setDialogOpen(true);
  };

  const handleEditar = (mov) => {
    // Medições são geridas na Gestão Financeira da Obra
    if (mov.origem === 'medicao') return;
    setEditando(mov);
    const quitado = mov.quitado;
    setFormData({
      tipo: mov.tipo || 'despesa',
      descricao: mov.descricao || '',
      valor: String(mov.valor || ''),
      categoria: mov.categoria || '',
      fornecedor: mov.fornecedor && mov.fornecedor !== '-' ? mov.fornecedor : '',
      vencimento: mov.vencimento && mov.vencimento !== '-' ? mov.vencimento : '',
      formaPagto: mov.formaPagto && mov.formaPagto !== '-' ? mov.formaPagto : '',
      status: quitado ? 'pago' : (mov.tipo === 'receita' && mov.status === 'faturado' ? 'faturado' : 'pendente'),
      parcelas: 1, intervaloDias: 30,
      vinculo: filtroObra || FABRICA,
    });
    setDialogOpen(true);
  };

  // Status do form → vocabulário de cada tabela (preserva a escolha do usuário)
  const statusReceitaDoForm = (s) => (s === 'pago' ? 'recebido' : s === 'faturado' ? 'faturado' : 'aberto');
  const statusDespesaDoForm = (s) => (s === 'pago' ? 'pago' : 'pendente');

  const handleSalvar = async () => {
    const obraIdVinculo = obraIdDoEscopo(formData.vinculo);
    const nomeVinculo = nomeEscopo(formData.vinculo);
    const valorNum = parseFloat(formData.valor);
    if (!formData.descricao || !(valorNum > 0)) {
      toast.error('Informe descrição e valor');
      return;
    }
    const hoje = hojeLocalISO();
    const ehReceita = formData.tipo === 'receita';
    try {
      if (editando) {
        if (editando.origem === 'receita_manual') {
          await atualizarReceitaManual(editando.id, {
            obraId: obraIdVinculo,
            descricao: formData.descricao,
            cliente: formData.fornecedor || null,
            categoria: formData.categoria || 'Outros',
            valor: valorNum,
            formaPagto: formData.formaPagto || null,
            data: editando.data || hoje,
            vencimento: formData.vencimento || null,
            status: statusReceitaDoForm(formData.status),
          });
        } else {
          await updateLancamento(editando.id, {
            descricao: formData.descricao,
            fornecedor: formData.fornecedor || '-',
            categoria: formData.categoria || 'Outros',
            valor: valorNum,
            formaPagto: formData.formaPagto || '-',
            vencimento: formData.vencimento || '',
            status: statusDespesaDoForm(formData.status),
            obraId: obraIdVinculo,
          });
        }
        toast.success(`Movimentação atualizada · ${nomeVinculo}`);
      } else {
        // Parcelas (vencimentos a partir da 1ª parcela, datas locais)
        const qtdParcelas = Math.max(1, parseInt(formData.parcelas) || 1);
        const intervalo = Math.max(1, parseInt(formData.intervaloDias) || 30);
        let vencimentos = [formData.vencimento || ''];
        if (qtdParcelas > 1) {
          const base = parseLocalDate(formData.vencimento);
          if (!base || isNaN(base.getTime())) { toast.error('Defina o vencimento da 1ª parcela'); return; }
          vencimentos = Array.from({ length: qtdParcelas }, (_, i) => hojeLocalISO(
            new Date(base.getFullYear(), base.getMonth(), base.getDate() + i * intervalo)
          ));
        }
        const recorrenciaId = qtdParcelas > 1 ? `FIN-REC-${Date.now()}` : null;
        const sufixo = (i) => (qtdParcelas > 1 ? ` (Parc ${i + 1}/${qtdParcelas})` : '');

        if (ehReceita) {
          await criarReceitasManuais(vencimentos.map((venc, i) => ({
            id: `REC-${Date.now()}-${i + 1}-${Math.floor(Math.random() * 9999)}`,
            obraId: obraIdVinculo,
            descricao: `${formData.descricao}${sufixo(i)}`,
            cliente: formData.fornecedor || null,
            categoria: formData.categoria || 'Outros',
            valor: valorNum,
            formaPagto: formData.formaPagto || null,
            data: venc || hoje,
            vencimento: venc || null,
            status: statusReceitaDoForm(formData.status),
            recorrenciaId,
          })));
        } else {
          for (let i = 0; i < vencimentos.length; i++) {
            const venc = vencimentos[i];
            await addLancamento({
              id: `FIN-${Date.now()}-${i + 1}-${Math.floor(Math.random() * 9999)}`,
              tipo: 'despesa',
              descricao: `${formData.descricao}${sufixo(i)}`,
              fornecedor: formData.fornecedor || '-',
              categoria: formData.categoria || 'Outros',
              valor: valorNum,
              formaPagto: formData.formaPagto || '-',
              data: venc || hoje,
              dataEmissao: hoje,
              vencimento: venc,
              status: statusDespesaDoForm(formData.status),
              obraId: obraIdVinculo,
              ...(recorrenciaId ? { recorrenciaId, parcelaIdx: i + 1, parcelaTotal: qtdParcelas } : {}),
            });
          }
        }
        toast.success(qtdParcelas > 1 ? `${qtdParcelas} parcelas lançadas em ${nomeVinculo}` : `Lançado em ${nomeVinculo}`);
      }
      setDialogOpen(false);
      setEditando(null);
    } catch (err) {
      console.error('Erro ao salvar:', err);
      toast.error('Não foi possível salvar', { description: err?.message });
    }
  };

  const handleApagar = async (id) => {
    const mov = todasMovimentacoes.find(m => m.id === id);
    try {
      if (mov?.origem === 'receita_manual') {
        await deleteReceitaManual(id);
      } else if (mov?.origem === 'despesa') {
        await deleteLancamento(id);
      }
      toast.success('Movimentação apagada');
    } catch (err) {
      console.error('Erro ao apagar:', err);
      toast.error('Não foi possível apagar', { description: err?.message });
    }
    setDeleteConfirmId(null);
  };

  // ===== CATEGORIAS DISPONÍVEIS =====
  const categoriasDespesa = [
    'Matéria Prima', 'Mão de Obra', 'Energia/Utilidades', 'Manutenção',
    'Transporte', 'Administrativo', 'Impostos', 'Outros'
  ];
  const categoriasReceita = ['Adiantamento', 'Serviço Avulso', 'Material Faturado', 'Outros'];
  const categoriasDisponiveis = formData.tipo === 'receita' ? categoriasReceita : categoriasDespesa;


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
              <Building2 className="h-3.5 w-3.5 mr-1" />
              {obraNome}
            </span>
            <span className="text-slate-500 text-xs" title="Lançamentos daqui alimentam o Painel Financeiro Global; o que é lançado no Painel Global não volta para cá.">
              {ehFabrica
                ? 'Lançamentos da fábrica · espelhados no Painel Global'
                : 'Receita × Despesa só desta obra · despesas de obra fora do caixa da empresa'}
            </span>
            <span className="text-slate-500 text-sm">|</span>
            <span className="text-slate-400 text-sm">{kpis.qtdTotal} lançamentos</span>
            <span className="text-slate-500 text-sm">|</span>
            <span className="text-emerald-400 text-xs">{kpis.qtdReceitas} receitas</span>
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
            <div>
              <Label className="text-slate-300">Vincular a *</Label>
              <Select value={formData.vinculo || FABRICA} onValueChange={(v) => setFormData({...formData, vinculo: v})}>
                <SelectTrigger className="mt-1 bg-slate-800 border-slate-700"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value={FABRICA}>🏭 Fábrica (financeiro geral)</SelectItem>
                  {(obras || []).map(o => (
                    <SelectItem key={o.id} value={o.id}>🏗️ {o.nome || o.name || o.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500 mt-1">
                {formData.vinculo === FABRICA || !formData.vinculo
                  ? 'Entra no caixa da empresa (espelhado no Painel Financeiro Global).'
                  : formData.tipo === 'receita'
                    ? 'Receita da obra — entra no resultado da obra e no caixa da empresa.'
                    : 'Despesa da obra — entra só no resultado da obra, não no caixa da empresa.'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Tipo</Label>
                <Select value={formData.tipo} disabled={!!editando} onValueChange={(v) => setFormData({...formData, tipo: v, categoria: '', status: 'pendente'})}>
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
                    <SelectItem value="pendente">{formData.tipo === 'receita' ? 'Em aberto' : 'Pendente'}</SelectItem>
                    {formData.tipo === 'receita' && <SelectItem value="faturado">Faturado</SelectItem>}
                    <SelectItem value="pago">{formData.tipo === 'receita' ? 'Recebido' : 'Pago'}</SelectItem>
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

            {/* Parcelamento (só na criação) */}
            {!editando && (
              <div className="bg-cyan-900/10 border border-cyan-700/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                  📑 Parcelamento <span className="text-[10px] text-slate-500 font-normal">opcional — 1 = lançamento único</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300 text-xs">Quantidade de Parcelas</Label>
                    <Input type="number" min="1" max="120" className="mt-1 bg-slate-800 border-slate-700" value={formData.parcelas || 1} onChange={(e) => setFormData({...formData, parcelas: parseInt(e.target.value) || 1})} />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-xs">Intervalo (dias)</Label>
                    <Input type="number" min="1" className="mt-1 bg-slate-800 border-slate-700" value={formData.intervaloDias || 30} onChange={(e) => setFormData({...formData, intervaloDias: parseInt(e.target.value) || 30})} />
                  </div>
                </div>
                {parseInt(formData.parcelas) > 1 && parseFloat(formData.valor) > 0 && formData.vencimento && (
                  <div className="text-xs text-cyan-200 bg-cyan-900/30 rounded px-2 py-1.5">
                    Vai criar <strong>{formData.parcelas}</strong> parcelas de R$ {parseFloat(formData.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · Total: <strong>R$ {(parseFloat(formData.valor) * parseInt(formData.parcelas)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                )}
              </div>
            )}

            <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500" onClick={handleSalvar}>
              {editando ? 'Salvar Alterações' : (parseInt(formData.parcelas) > 1 ? `Cadastrar ${formData.parcelas} Parcelas` : 'Cadastrar')}
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
          <Select value={filtroObra} onValueChange={setObraSelecionada}>
            <SelectTrigger className="w-[260px] bg-slate-800 border-slate-700 text-sm">
              <SelectValue placeholder="Fábrica ou obra" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value={FABRICA}>Fábrica (financeiro geral)</SelectItem>
              {(obras || []).map(o => (
                <SelectItem key={o.id} value={o.id}>{o.nome || o.name || o.id}</SelectItem>
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
                <p className="text-sm text-slate-400">{ehFabrica ? 'Receitas' : 'Receitas da obra'}</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(kpis.totalReceitas)}</p>
                <p className="text-xs text-slate-500">
                  {contratoValor > 0 ? `${(kpis.totalReceitas / contratoValor * 100).toFixed(1)}% do contrato` : `${kpis.qtdReceitas} lançamentos`}
                  {kpis.totalPrevisto > 0 && ` · previsto ${formatCurrency(kpis.totalPrevisto)}`}
                </p>
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
                <p className="text-sm text-slate-400">{ehFabrica ? 'Despesas' : 'Despesas da obra'}</p>
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
                <p className="text-sm text-slate-400">{ehFabrica ? 'Resultado da fábrica' : 'Resultado da obra'}</p>
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
                <p className={cn("text-xs", kpis.saldoCaixaObra >= 0 ? "text-slate-400" : "text-red-400")}>Saldo realizado: {formatCurrency(kpis.saldoCaixaObra)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <TableHead className="text-slate-400">Fornecedor/Cliente</TableHead>
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
                      {mov.origem === 'medicao' && mov.numero && (
                        <span className="text-xs text-emerald-500">Medição #{mov.numero} • {mov.etapaLabel}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="text-slate-300">{mov.fornecedor || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600 text-xs" style={{ color: CORES_CATEGORIAS[mov.categoria] || '#64748b' }}>
                        <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: CORES_CATEGORIAS[mov.categoria] || '#64748b' }} />
                        {mov.categoria || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("text-right font-semibold", mov.prevista ? "text-slate-500" : mov.tipo === 'receita' ? "text-emerald-400" : "text-red-400")}>
                      {mov.tipo === 'receita' ? '+' : '-'} {formatCurrency(mov.valor)}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const faturado = mov.tipo === 'receita' && !mov.quitado && !mov.prevista && !mov.atrasado;
                        return (
                          <Badge className={cn("border text-xs",
                            mov.quitado ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            mov.atrasado ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                            mov.prevista ? 'bg-slate-500/20 text-slate-400 border-slate-500/30' :
                            faturado ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
                            'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          )}>
                            {mov.quitado ? (mov.tipo === 'receita' ? 'Recebido' : 'Pago') :
                             mov.atrasado ? 'Atrasado' :
                             mov.prevista ? 'Prevista' :
                             faturado ? 'A receber' : 'Pendente'}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {mov.origem !== 'medicao' ? (
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
                        <span className="text-slate-500 text-xs" title="Medições são editadas na Gestão Financeira da Obra">GFO</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {movimentacoesFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                      {ehFabrica ? 'Nenhuma movimentação da fábrica no período.' : 'Nenhuma movimentação desta obra no período.'}
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
