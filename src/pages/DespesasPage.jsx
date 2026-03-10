// MONTEX ERP Premium - Gestão de Despesas
// Cadastro com NF, Natureza de Aquisição, categorias e centros de custo
// Vinculação automática categoria/centro por NF+fornecedor
// Exportação Excel conforme modelo Natureza de Aquisição

import React, { useState, useMemo, useCallback } from 'react';
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
  TrendingDown,
  Tag,
  Layers,
  Calendar,
  Upload,
  FileSpreadsheet,
  Trash2,
  MoreHorizontal,
  Building2,
  Wallet,
  FileText,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useLancamentos, useObras } from '../contexts/ERPContext';
import { normalizarCategoria } from '../hooks/useFinancialIntelligence';
import ImportarNFModal from '../components/ImportarNFModal';

// ========== CONSTANTES ==========

const categorias = [
  { id: 1, nome: 'Matéria Prima', cor: '#10b981' },
  { id: 2, nome: 'Mão de Obra', cor: '#3b82f6' },
  { id: 3, nome: 'Energia/Utilidades', cor: '#f59e0b' },
  { id: 4, nome: 'Manutenção', cor: '#8b5cf6' },
  { id: 5, nome: 'Transporte', cor: '#ec4899' },
  { id: 6, nome: 'Administrativo', cor: '#06b6d4' },
  { id: 7, nome: 'Impostos', cor: '#ef4444' },
  { id: 8, nome: 'Outros', cor: '#64748b' },
];

const centrosCusto = [
  { id: 1, nome: 'Produção', codigo: 'CC-001' },
  { id: 2, nome: 'Administrativo', codigo: 'CC-002' },
  { id: 3, nome: 'Comercial', codigo: 'CC-003' },
  { id: 4, nome: 'Logística', codigo: 'CC-004' },
  { id: 5, nome: 'RH', codigo: 'CC-005' },
];

// Naturezas de Aquisição conforme definido pelo cliente
const naturezasAquisicao = [
  'Compra de matéria-prima',
  'Compra de material de embalagem',
  'Compra para revenda',
  'Compra para utilização na prestação de serviços',
  'Compra para uso e consumo',
];

// ========== HELPERS ==========

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value || 0);
};

const formatDate = (date) => {
  if (!date || date === '-') return '-';
  try { return new Date(date).toLocaleDateString('pt-BR'); }
  catch { return '-'; }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'pago': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'pendente': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'atrasado': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'pago': return 'Pago';
    case 'pendente': return 'Pendente';
    case 'atrasado': return 'Atrasado';
    default: return status || '-';
  }
};

const getCategoriaColor = (categoriaNome) => {
  const cat = categorias.find(c => c.nome === categoriaNome);
  return cat?.cor || '#64748b';
};

// ========== EXTRAIR NATUREZA DO CAMPO OBSERVACAO ==========
const extrairNatureza = (obs) => {
  if (!obs) return '';
  const match = obs.match(/\[NAT:([^\]]+)\]/);
  return match ? match[1] : '';
};

// ========== MAPEAMENTO AUTOMÁTICO NF+Fornecedor → Categoria/Centro ==========
// Salva no localStorage para aprender com lançamentos anteriores

const MAPPING_KEY = 'montex_nf_fornecedor_mapping';

const loadMapping = () => {
  try {
    const raw = localStorage.getItem(MAPPING_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const saveMapping = (fornecedor, nf, categoria, centroCusto, natureza) => {
  const map = loadMapping();
  const key = `${(fornecedor || '').toUpperCase().trim()}`;
  if (!map[key]) map[key] = {};
  map[key].categoria = categoria;
  map[key].centroCusto = centroCusto;
  map[key].natureza = natureza;
  // Também salva por NF específica
  if (nf) {
    map[`NF_${nf}`] = { categoria, centroCusto, natureza, fornecedor };
  }
  localStorage.setItem(MAPPING_KEY, JSON.stringify(map));
};

const autoFillFromMapping = (fornecedor, nf) => {
  const map = loadMapping();
  // Primeiro tenta pela NF
  if (nf && map[`NF_${nf}`]) return map[`NF_${nf}`];
  // Depois pelo fornecedor
  const key = `${(fornecedor || '').toUpperCase().trim()}`;
  if (map[key]) return map[key];
  return null;
};

// Categorizar despesa automaticamente pela descrição
const categorizarDespesa = (descricao) => {
  const d = (descricao || '').toUpperCase();
  if (d.includes('FOLHA') || d.includes('DIARIA') || d.includes('HORA EXTRA') || d.includes('FÉRIAS') || d.includes('FGTS') || d.includes('ACERTO')) return 'Mão de Obra';
  if (d.includes('CEMIG') || d.includes('COPASA') || d.includes('ENERGIA') || d.includes('LUZ') || d.includes('AGUA')) return 'Energia/Utilidades';
  if (d.includes('ALUGUEL')) return 'Administrativo';
  if (d.includes('COMBUSTIVEL') || d.includes('POSTO') || d.includes('ABASTEC') || d.includes('PASSAGEM') || d.includes('TRANSPORTE') || d.includes('CARRO')) return 'Transporte';
  if (d.includes('MANUTENC') || d.includes('EQUIPAMENTO') || d.includes('EPI') || d.includes('FERRAMENTA')) return 'Manutenção';
  if (d.includes('SUPERMERCADO') || d.includes('ALIMENTA') || d.includes('ALMOCO') || d.includes('PADARIA') || d.includes('CAFÉ')) return 'Matéria Prima';
  if (d.includes('IMPOSTO') || d.includes('INSS') || d.includes('DAS') || d.includes('SIMPLES')) return 'Impostos';
  if (d.includes('CONTABILIDADE') || d.includes('INTERNET') || d.includes('TELEFONE') || d.includes('PLANO SAUDE') || d.includes('UNIMED')) return 'Administrativo';
  return 'Outros';
};

// ========== COMPONENTE PRINCIPAL ==========

export default function DespesasPage() {
  // === DADOS VIA SUPABASE ===
  const { lancamentosDespesas: lancamentosSupabase, addLancamento, updateLancamento, deleteLancamento } = useLancamentos();
  const { obras } = useObras();

  // === ESTADOS ===
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroCentro, setFiltroCentro] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('geral');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroObra, setFiltroObra] = useState('fabrica'); // 'fabrica' | obraId | 'geral'
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [showImportNF, setShowImportNF] = useState(false);
  const [formData, setFormData] = useState({
    descricao: '',
    fornecedor: '',
    categoria: '',
    centroCusto: '',
    valor: '',
    vencimento: '',
    formaPagto: '',
    notaFiscal: '',
    naturezaAquisicao: '',
  });

  // === MAPA DE OBRAS ===
  const obrasMap = useMemo(() => {
    const map = {};
    (obras || []).forEach(o => { map[o.id] = o.nome || o.name || o.id; });
    return map;
  }, [obras]);

  // === OPÇÕES SELETOR VISUALIZAÇÃO ===
  const opcoesVisualizacao = useMemo(() => {
    const opcoes = [
      { value: 'geral', label: 'Visão Geral (Todas)' },
      { value: 'fabrica', label: 'Financeiro Fábrica' },
    ];
    (obras || []).forEach(o => {
      opcoes.push({ value: o.id, label: o.nome || o.name || o.id });
    });
    return opcoes;
  }, [obras]);

  // === DESPESAS COM FILTRO POR VISUALIZAÇÃO ===
  const despesas = useMemo(() => {
    if (!lancamentosSupabase || lancamentosSupabase.length === 0) return [];

    let filtrados = lancamentosSupabase;

    if (filtroObra === 'fabrica') {
      // Somente despesas sem obraId (Financeiro Fábrica)
      filtrados = filtrados.filter(l => !l.obraId && !l.obra_id);
    } else if (filtroObra !== 'geral') {
      // Filtra por obra específica
      filtrados = filtrados.filter(l => (l.obraId || l.obra_id) === filtroObra);
    }
    // 'geral' mostra tudo

    return filtrados.map(l => ({
      id: l.id,
      data: l.dataEmissao || l.data || l.createdAt || '',
      descricao: l.descricao || l.nome || '-',
      fornecedor: l.fornecedor || '-',
      categoria: normalizarCategoria(l.categoria, l.descricao),
      centroCusto: l.centroCusto || l.centro_custo || 'Produção',
      valor: l.valor || 0,
      status: l.status || 'pago',
      formaPagto: l.formaPagto || l.forma_pagto || '-',
      vencimento: l.dataVencimento || l.data_vencimento || l.dataEmissao || '',
      tipo: l.tipo || 'despesa',
      notaFiscal: l.notaFiscal || l.nota_fiscal || '',
      naturezaAquisicao: l.naturezaAquisicao || l.natureza_aquisicao || extrairNatureza(l.observacao) || '',
      obraId: l.obraId || l.obra_id || null,
    }));
  }, [lancamentosSupabase, filtroObra]);

  // === AUTO-FILL: quando fornecedor ou NF muda ===
  const handleFornecedorChange = useCallback((novoFornecedor) => {
    setFormData(prev => {
      const result = autoFillFromMapping(novoFornecedor, prev.notaFiscal);
      if (result && !prev.categoria) {
        return {
          ...prev,
          fornecedor: novoFornecedor,
          categoria: result.categoria || prev.categoria,
          centroCusto: result.centroCusto || prev.centroCusto,
          naturezaAquisicao: result.natureza || prev.naturezaAquisicao,
        };
      }
      return { ...prev, fornecedor: novoFornecedor };
    });
  }, []);

  const handleNFChange = useCallback((novaNF) => {
    setFormData(prev => {
      const result = autoFillFromMapping(prev.fornecedor, novaNF);
      if (result) {
        return {
          ...prev,
          notaFiscal: novaNF,
          categoria: result.categoria || prev.categoria,
          centroCusto: result.centroCusto || prev.centroCusto,
          naturezaAquisicao: result.natureza || prev.naturezaAquisicao,
          fornecedor: result.fornecedor || prev.fornecedor,
        };
      }
      return { ...prev, notaFiscal: novaNF };
    });
  }, []);

  // === IMPORTAR EXCEL ===
  const handleImportExcel = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const importedItems = [];

        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

          for (let rowIdx = 2; rowIdx < jsonData.length; rowIdx++) {
            const row = jsonData[rowIdx];
            if (!row) continue;
            for (let colIdx = 0; colIdx < row.length - 2; colIdx++) {
              const cell0 = row[colIdx];
              const cell1 = row[colIdx + 1];
              const cell2 = row[colIdx + 2];
              if (!cell0 && !cell1) continue;
              let dataStr = null, descricao = null, valor = null;
              const dateVal = cell0 ? new Date(cell0) : null;
              const isDate = dateVal && !isNaN(dateVal.getTime()) && dateVal.getFullYear() >= 2020 && dateVal.getFullYear() <= 2030;
              if (isDate && cell1 && typeof cell1 === 'string' && cell1.length > 1) {
                const numVal = parseFloat(String(cell2).replace(/[^\d.,]/g, '').replace(',', '.'));
                if (numVal > 0) {
                  dataStr = dateVal.toISOString().split('T')[0];
                  descricao = cell1.trim();
                  valor = numVal;
                }
              } else if (cell0 && typeof cell0 === 'string' && cell0.length > 2 && !isDate) {
                const numVal = parseFloat(String(cell1).replace(/[^\d.,]/g, '').replace(',', '.'));
                if (numVal > 0 && !String(cell0).includes('DESPESAS') && !String(cell0).includes('TIPO') && !String(cell0).includes('TOTAL')) {
                  const months = { 'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03', 'MARCO': '03', 'ABRIL': '04', 'MAIO': '05', 'JUNHO': '06', 'JULHO': '07', 'AGOSTO': '08', 'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12' };
                  let year = '2025', month = '01';
                  const headerRow = jsonData[1] || jsonData[3] || [];
                  let monthStr = '';
                  for (let hc = Math.max(0, colIdx - 1); hc <= Math.min(colIdx + 1, headerRow.length - 1); hc++) {
                    if (headerRow[hc] && typeof headerRow[hc] === 'string' && headerRow[hc].includes('DESPESAS')) {
                      monthStr = headerRow[hc]; break;
                    }
                  }
                  for (const [name, num] of Object.entries(months)) {
                    if (monthStr.toUpperCase().includes(name)) { month = num; break; }
                  }
                  dataStr = `${year}-${month}-15`;
                  descricao = cell0.trim();
                  valor = numVal;
                }
              }
              if (dataStr && descricao && valor) {
                importedItems.push({
                  id: `imp_${sheetName}_${rowIdx}_${colIdx}_${Date.now()}`,
                  data: dataStr, descricao, fornecedor: '-',
                  categoria: categorizarDespesa(descricao),
                  centroCusto: 'Produção', valor, status: 'pago',
                  formaPagto: '-', vencimento: dataStr,
                  notaFiscal: '', naturezaAquisicao: '',
                  importado: true, sheet: sheetName,
                });
              }
            }
          }
        });

        const seen = new Set();
        const uniqueItems = importedItems.filter(item => {
          const key = `${item.data}_${item.descricao}_${item.valor}`;
          if (seen.has(key)) return false;
          seen.add(key); return true;
        });
        setImportPreview(uniqueItems);
        setImportDialogOpen(true);
        toast.success(`${uniqueItems.length} despesas encontradas no arquivo!`);
      } catch (err) {
        console.error('Erro ao ler Excel:', err);
        toast.error('Erro ao ler o arquivo Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const confirmarImportacao = async () => {
    setImporting(true);
    try {
      const existingKeys = new Set(despesas.map(d => `${d.data}_${d.descricao}_${d.valor}`));
      const novas = importPreview.filter(d => !existingKeys.has(`${d.data}_${d.descricao}_${d.valor}`));
      let importados = 0;
      for (const nova of novas) {
        try {
          await addLancamento({ ...nova, tipo: 'despesa', obraId: null });
          importados++;
        } catch (errItem) { console.error('Erro item:', errItem); }
      }
      toast.success(`${importados} despesas importadas!`);
      setImportDialogOpen(false);
      setImportPreview([]);
    } catch (e) {
      console.error('Erro importação:', e);
      toast.error('Erro ao importar despesas.');
    }
    setImporting(false);
  };

  // === FILTRAR POR PERÍODO ===
  const filtrarPorPeriodo = useCallback((lista) => {
    if (filtroPeriodo === 'geral') return lista;

    // Período personalizado com datas editáveis
    if (filtroPeriodo === 'personalizado') {
      if (!dataInicio && !dataFim) return lista;
      return lista.filter(d => {
        const dataDesp = new Date(d.data || d.vencimento);
        if (dataInicio && dataDesp < new Date(dataInicio + 'T00:00:00')) return false;
        if (dataFim && dataDesp > new Date(dataFim + 'T23:59:59')) return false;
        return true;
      });
    }

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);

    if (filtroPeriodo === 'diario') { /* inicio já é hoje 00:00 */ }
    else if (filtroPeriodo === 'semanal') inicio.setDate(inicio.getDate() - 7);
    else if (filtroPeriodo === 'mensal') inicio.setMonth(inicio.getMonth() - 1);
    else if (filtroPeriodo === 'trimestral') inicio.setMonth(inicio.getMonth() - 3);

    return lista.filter(d => {
      const dataDesp = new Date(d.data || d.vencimento);
      return dataDesp >= inicio && dataDesp <= hoje;
    });
  }, [filtroPeriodo, dataInicio, dataFim]);

  // === DADOS FILTRADOS POR PERÍODO (KPIs/gráficos) ===
  const despesasPeriodo = useMemo(() => filtrarPorPeriodo(despesas), [despesas, filtrarPorPeriodo]);

  const dadosCategorias = useMemo(() => {
    const catMap = {};
    despesasPeriodo.forEach(d => {
      const cat = d.categoria || 'Outros';
      catMap[cat] = (catMap[cat] || 0) + (d.valor || 0);
    });
    return Object.entries(catMap).map(([nome, valor]) => ({
      nome, valor, cor: categorias.find(c => c.nome === nome)?.cor || '#64748b'
    }));
  }, [despesasPeriodo]);

  const dadosCentros = useMemo(() => {
    const ccMap = {};
    despesasPeriodo.forEach(d => {
      const cc = d.centroCusto || 'Outros';
      ccMap[cc] = (ccMap[cc] || 0) + (d.valor || 0);
    });
    return Object.entries(ccMap).map(([nome, valor]) => ({ nome, valor }));
  }, [despesasPeriodo]);

  const kpis = useMemo(() => {
    const totalPago = despesasPeriodo.filter(d => d.status === 'pago').reduce((s, d) => s + (d.valor || 0), 0);
    const totalPendente = despesasPeriodo.filter(d => d.status === 'pendente').reduce((s, d) => s + (d.valor || 0), 0);
    const totalAtrasado = despesasPeriodo.filter(d => d.status === 'atrasado').reduce((s, d) => s + (d.valor || 0), 0);
    const total = despesasPeriodo.reduce((s, d) => s + (d.valor || 0), 0);
    return { totalPago, totalPendente, totalAtrasado, total };
  }, [despesasPeriodo]);

  // === DESPESAS FILTRADAS PARA TABELA ===
  const despesasFiltradas = useMemo(() => {
    let resultado = despesas.filter(d => {
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!(d.descricao || '').toLowerCase().includes(s) &&
            !(d.fornecedor || '').toLowerCase().includes(s) &&
            !(d.notaFiscal || '').toLowerCase().includes(s)) return false;
      }
      if (filtroStatus !== 'todos' && d.status !== filtroStatus) return false;
      if (filtroCategoria !== 'todos' && d.categoria !== filtroCategoria) return false;
      if (filtroCentro !== 'todos' && d.centroCusto !== filtroCentro) return false;
      return true;
    });
    return filtrarPorPeriodo(resultado);
  }, [despesas, searchTerm, filtroStatus, filtroCategoria, filtroCentro, filtrarPorPeriodo]);

  // === EXPORTAR EXCEL (modelo Natureza de Aquisição) ===
  const handleExportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const rows = despesasFiltradas.map(d => ([
      d.notaFiscal || '-',
      formatDate(d.data),
      d.fornecedor || '-',
      d.descricao || '-',
      d.categoria || '-',
      d.centroCusto || '-',
      d.valor || 0,
      d.naturezaAquisicao || '-',
      getStatusText(d.status),
      d.formaPagto || '-',
    ]));
    const header = [
      ['PLANILHA DE IDENTIFICAÇÃO DE NATUREZA DE AQUISIÇÃO'],
      [''],
      ['EMPRESA:', 'MONTEX ESTRUTURAS METÁLICAS'],
      ['COMPETÊNCIA:', filtroPeriodo === 'geral' ? 'GERAL' : filtroPeriodo.toUpperCase()],
      [''],
      ['Nº NFe', 'Data Emissão', 'Nome do Fornecedor', 'Descrição', 'Categoria', 'Centro de Custo', 'Valor (R$)', 'Natureza de Aquisição', 'Status', 'Forma Pgto'],
    ];
    const wsData = [...header, ...rows];
    wsData.push([]);
    wsData.push(['', '', '', '', '', 'TOTAL:', despesasFiltradas.reduce((s, d) => s + (d.valor || 0), 0), '', '', '']);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 35 },
      { wch: 18 }, { wch: 16 }, { wch: 15 }, { wch: 45 },
      { wch: 12 }, { wch: 15 },
    ];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
    XLSX.utils.book_append_sheet(wb, ws, 'Natureza Aquisição');
    XLSX.writeFile(wb, `Despesas_Natureza_Aquisicao_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Relatório exportado com sucesso!');
  }, [despesasFiltradas, filtroPeriodo]);

  // === HANDLERS CRUD ===
  const handleNovaDespesa = () => {
    setEditando(null);
    setFormData({
      descricao: '', fornecedor: '', categoria: '', centroCusto: '',
      valor: '', vencimento: '', formaPagto: '', notaFiscal: '', naturezaAquisicao: '',
    });
    setDialogOpen(true);
  };

  const handleEditarDespesa = (despesa) => {
    setEditando(despesa);
    setFormData({
      descricao: despesa.descricao || '',
      fornecedor: despesa.fornecedor || '',
      categoria: despesa.categoria || '',
      centroCusto: despesa.centroCusto || '',
      valor: String(despesa.valor || ''),
      vencimento: despesa.vencimento || '',
      formaPagto: despesa.formaPagto || '',
      notaFiscal: despesa.notaFiscal || '',
      naturezaAquisicao: despesa.naturezaAquisicao || '',
    });
    setDialogOpen(true);
  };

  const handleApagarDespesa = async (id) => {
    try {
      await deleteLancamento(id);
      toast.success('Despesa removida!');
    } catch (err) {
      console.error('Erro ao apagar:', err);
      toast.error('Erro ao apagar despesa');
    }
    setDeleteConfirmId(null);
  };

  // === MARCAR COMO PAGO (ação direta na lista) ===
  const handleMarcarPago = async (despesa) => {
    try {
      await updateLancamento(despesa.id, {
        status: 'pago',
        dataPagamento: new Date().toISOString().split('T')[0],
      });
      toast.success(`Despesa "${despesa.descricao}" marcada como paga!`);
    } catch (err) {
      console.error('Erro ao marcar como pago:', err);
      toast.error('Erro ao atualizar status');
    }
  };

  // Callback para importação de NFe via modal
  const handleImportarNF = useCallback(async (lancamento, itensImportados) => {
    try {
      // Definir obra_id baseado no filtro atual
      const obraIdAtual = (filtroObra && filtroObra !== 'geral' && filtroObra !== 'fabrica') ? filtroObra : null;
      if (obraIdAtual) {
        lancamento.obraId = obraIdAtual;
        lancamento.obra_id = obraIdAtual;
      }
      lancamento.id = `desp-${Date.now()}`;

      // Salvar mapping para auto-fill futuro
      if (lancamento.fornecedor && lancamento.notaFiscal) {
        saveMapping(
          lancamento.fornecedor,
          lancamento.notaFiscal,
          lancamento.categoria || '',
          lancamento.centroCusto || '',
          lancamento.naturezaAquisicao || ''
        );
      }

      await addLancamento(lancamento);
      toast.success(`NFe ${lancamento.notaFiscal} importada: ${lancamento.fornecedor} - R$ ${Number(lancamento.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    } catch (err) {
      console.error('Erro ao importar NFe:', err);
      toast.error('Erro ao importar NFe como despesa');
    }
  }, [filtroObra, addLancamento, saveMapping]);

  const handleSaveDespesa = async () => {
    if (!formData.descricao || !formData.valor) {
      toast.error('Preencher descrição e valor');
      return;
    }

    // Salvar mapeamento NF+Fornecedor para auto-fill futuro
    if (formData.fornecedor || formData.notaFiscal) {
      saveMapping(
        formData.fornecedor,
        formData.notaFiscal,
        formData.categoria,
        formData.centroCusto,
        formData.naturezaAquisicao
      );
    }

    const dados = {
      descricao: formData.descricao,
      fornecedor: formData.fornecedor || '-',
      categoria: formData.categoria || categorizarDespesa(formData.descricao),
      centroCusto: formData.centroCusto || 'Produção',
      valor: parseFloat(formData.valor),
      formaPagto: formData.formaPagto || '-',
      vencimento: formData.vencimento || '',
      notaFiscal: formData.notaFiscal || '',
      naturezaAquisicao: formData.naturezaAquisicao || '',
      observacao: formData.naturezaAquisicao ? `[NAT:${formData.naturezaAquisicao}]` : '',
    };

    if (editando) {
      try {
        await updateLancamento(editando.id, dados);
        toast.success('Despesa atualizada!');
      } catch (err) {
        console.error('Erro ao atualizar:', err);
        toast.error('Erro ao atualizar despesa');
      }
    } else {
      try {
        await addLancamento({
          ...dados,
          id: `desp-${Date.now()}`,
          data: new Date().toISOString().split('T')[0],
          dataEmissao: new Date().toISOString().split('T')[0],
          status: 'pendente',
          tipo: 'despesa',
          obraId: filtroObra !== 'geral' && filtroObra !== 'fabrica' ? filtroObra : null,
        });
        toast.success('Despesa criada!');
      } catch (err) {
        console.error('Erro ao salvar:', err);
        toast.error('Erro ao salvar despesa');
      }
    }

    setDialogOpen(false);
    setEditando(null);
  };

  // ========== RENDER ==========
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-500 flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
            Gestão de Despesas
          </h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-rose-500/20 text-rose-400 text-sm font-medium border border-rose-500/30">
              <Wallet className="h-3.5 w-3.5 mr-1" />
              {filtroObra === 'geral' ? 'Visão Geral' : filtroObra === 'fabrica' ? 'Financeiro Fábrica' : (obrasMap[filtroObra] || 'Obra')}
            </span>
            <span className="text-slate-500 text-sm">|</span>
            <span className="text-slate-400 text-sm">{despesasFiltradas.length} lançamentos</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
            <span className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors gap-2">
              <Upload className="h-4 w-4" />
              Importar Excel
            </span>
          </label>
          <Button variant="outline" className="border-amber-600/50 text-amber-400 hover:bg-amber-600/20" onClick={() => setShowImportNF(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Importar NFe
          </Button>
          <Button className="bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600" onClick={handleNovaDespesa}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Despesa
          </Button>
        </div>
      </div>

      {/* Dialog Cadastrar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditando(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{editando ? 'Editar Despesa' : 'Cadastrar Despesa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Linha 1: NF + Data + Fornecedor */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-300">Nº Nota Fiscal</Label>
                <Input
                  className="mt-1 bg-slate-800 border-slate-700"
                  placeholder="Ex: 12345"
                  value={formData.notaFiscal}
                  onChange={(e) => handleNFChange(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-slate-300">Fornecedor</Label>
                <Input
                  className="mt-1 bg-slate-800 border-slate-700"
                  placeholder="Nome do fornecedor"
                  value={formData.fornecedor}
                  onChange={(e) => handleFornecedorChange(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-slate-300">Vencimento</Label>
                <Input
                  className="mt-1 bg-slate-800 border-slate-700"
                  type="date"
                  value={formData.vencimento}
                  onChange={(e) => setFormData({...formData, vencimento: e.target.value})}
                />
              </div>
            </div>

            {/* Linha 2: Descrição */}
            <div>
              <Label className="text-slate-300">Descrição *</Label>
              <Input
                className="mt-1 bg-slate-800 border-slate-700"
                placeholder="Ex: Compra de material"
                value={formData.descricao}
                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
              />
            </div>

            {/* Linha 3: Categoria + Centro de Custo */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Categoria</Label>
                <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {categorias.map(cat => (
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
              <div>
                <Label className="text-slate-300">Centro de Custo</Label>
                <Select value={formData.centroCusto} onValueChange={(v) => setFormData({...formData, centroCusto: v})}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {centrosCusto.map(cc => (
                      <SelectItem key={cc.id} value={cc.nome}>
                        <span className="font-mono text-xs text-slate-400 mr-2">{cc.codigo}</span>
                        {cc.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 4: Valor + Forma Pagto */}
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
                <Label className="text-slate-300">Forma de Pagamento</Label>
                <Select value={formData.formaPagto} onValueChange={(v) => setFormData({...formData, formaPagto: v})}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Cartão">Cartão</SelectItem>
                    <SelectItem value="Débito Automático">Débito Automático</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Linha 5: Natureza de Aquisição */}
            <div>
              <Label className="text-slate-300 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                Natureza de Aquisição
              </Label>
              <Select value={formData.naturezaAquisicao} onValueChange={(v) => setFormData({...formData, naturezaAquisicao: v})}>
                <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                  <SelectValue placeholder="Selecione a natureza" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {naturezasAquisicao.map(nat => (
                    <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Auto-fill notice */}
            {(formData.fornecedor || formData.notaFiscal) && autoFillFromMapping(formData.fornecedor, formData.notaFiscal) && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-xs text-blue-400">
                Categoria, centro de custo e natureza preenchidos automaticamente com base em lançamentos anteriores deste fornecedor/NF.
              </div>
            )}

            <Button className="w-full bg-gradient-to-r from-rose-500 to-red-500" onClick={handleSaveDespesa}>
              {editando ? 'Salvar Alterações' : 'Cadastrar Despesa'}
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
          <p className="text-slate-400 text-sm">Tem certeza que deseja apagar esta despesa?</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="border-slate-700" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={() => handleApagarDespesa(deleteConfirmId)}>
              <Trash2 className="h-4 w-4 mr-2" />Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Import Preview */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
              Prévia — {importPreview.length} despesas encontradas
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 mt-4">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Data</TableHead>
                  <TableHead className="text-slate-400">Descrição</TableHead>
                  <TableHead className="text-slate-400">Categoria</TableHead>
                  <TableHead className="text-slate-400 text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importPreview.slice(0, 100).map((item, idx) => (
                  <TableRow key={idx} className="border-slate-800">
                    <TableCell className="text-slate-300 text-xs">{formatDate(item.data)}</TableCell>
                    <TableCell className="text-white text-sm">{item.descricao}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600 text-xs" style={{ color: getCategoriaColor(item.categoria) }}>
                        {item.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-rose-400 text-sm">{formatCurrency(item.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              Total: <span className="text-white font-semibold">{formatCurrency(importPreview.reduce((s, d) => s + d.valor, 0))}</span>
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setImportDialogOpen(false)} className="border-slate-600">Cancelar</Button>
              <Button onClick={confirmarImportacao} disabled={importing} className="bg-emerald-600 hover:bg-emerald-700">
                {importing ? 'Importando...' : `Importar ${importPreview.length} Despesas`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filtros: Visualização + Período */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Seletor de Visualização */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-400 mr-1">Visualizar:</span>
          <Select value={filtroObra} onValueChange={setFiltroObra}>
            <SelectTrigger className="w-[240px] bg-slate-800 border-slate-700 text-sm">
              <SelectValue placeholder="Selecione a visão" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {opcoesVisualizacao.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro Período */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-400 mr-1">Período:</span>
          {[
            { value: 'geral', label: 'Geral' },
            { value: 'diario', label: 'Hoje' },
            { value: 'semanal', label: 'Semanal' },
            { value: 'mensal', label: 'Mensal' },
            { value: 'trimestral', label: 'Trimestral' },
            { value: 'personalizado', label: 'Personalizado' },
          ].map(p => (
            <button
              key={p.value}
              onClick={() => setFiltroPeriodo(p.value)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                filtroPeriodo === p.value
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/25"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700"
              )}
            >
              {p.label}
            </button>
          ))}
          {filtroPeriodo === 'personalizado' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 border border-slate-700 text-white focus:border-rose-500 outline-none"
              />
              <span className="text-slate-500 text-sm">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-sm bg-slate-800 border border-slate-700 text-white focus:border-rose-500 outline-none"
              />
            </div>
          )}
        </div>
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
                <p className="text-sm text-slate-400">Pago</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(kpis.totalPago)}</p>
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
                <p className="text-sm text-slate-400">A Pagar</p>
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
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total</p>
                <p className="text-xl font-bold text-white">{formatCurrency(kpis.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Tag className="h-5 w-5 text-rose-400" />
              Por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={dadosCategorias} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="valor">
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
        <Card className="bg-slate-900/60 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-400" />
              Por Centro de Custo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dadosCentros} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748b" tickFormatter={(v) => `${(v/1000)}k`} />
                <YAxis type="category" dataKey="nome" stroke="#64748b" width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="valor" fill="#f43f5e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card className="bg-slate-900/60 border-slate-700/50">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-white">Lista de Despesas</CardTitle>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input placeholder="Buscar NF, descrição, fornecedor..." className="pl-10 w-[250px] bg-slate-800 border-slate-700" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[120px] bg-slate-800 border-slate-700"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="w-[150px] bg-slate-800 border-slate-700"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="todos">Todas</SelectItem>
                {categorias.map(cat => (
                  <SelectItem key={cat.id} value={cat.nome}>{cat.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="border-slate-700 text-slate-300" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">NFe</TableHead>
                  <TableHead className="text-slate-400">Data</TableHead>
                  <TableHead className="text-slate-400">Descrição</TableHead>
                  <TableHead className="text-slate-400">Fornecedor</TableHead>
                  <TableHead className="text-slate-400">Categoria</TableHead>
                  <TableHead className="text-slate-400">Centro Custo</TableHead>
                  <TableHead className="text-slate-400 text-right">Valor</TableHead>
                  <TableHead className="text-slate-400">Nat. Aquisição</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400 w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesasFiltradas.map(despesa => (
                  <TableRow key={despesa.id} className="border-slate-800 hover:bg-slate-800/50">
                    <TableCell className="text-slate-300 font-mono text-xs">
                      {despesa.notaFiscal || '-'}
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">{formatDate(despesa.data)}</TableCell>
                    <TableCell className="text-white font-medium max-w-[200px]">
                      <span className="truncate block">{despesa.descricao}</span>
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">{despesa.fornecedor}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600 text-xs" style={{ color: getCategoriaColor(despesa.categoria) }}>
                        <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoriaColor(despesa.categoria) }} />
                        {despesa.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">{despesa.centroCusto}</TableCell>
                    <TableCell className="text-right font-semibold text-rose-400">{formatCurrency(despesa.valor)}</TableCell>
                    <TableCell className="text-slate-400 text-xs max-w-[150px]">
                      <span className="truncate block">{despesa.naturezaAquisicao || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border text-xs", getStatusColor(despesa.status))}>
                        {getStatusText(despesa.status)}
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
                          {despesa.status !== 'pago' && (
                            <DropdownMenuItem className="text-emerald-400 focus:text-emerald-300 focus:bg-slate-700" onClick={() => handleMarcarPago(despesa)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />Marcar como Pago
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-slate-300 focus:text-white focus:bg-slate-700" onClick={() => handleEditarDespesa(despesa)}>
                            <Edit className="h-4 w-4 mr-2" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400 focus:text-red-300 focus:bg-slate-700" onClick={() => setDeleteConfirmId(despesa.id)}>
                            <Trash2 className="h-4 w-4 mr-2" />Apagar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {despesasFiltradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-slate-500 py-8">
                      Nenhuma despesa encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Modal Importar NFe */}
      <ImportarNFModal
        open={showImportNF}
        onOpenChange={setShowImportNF}
        onImportar={handleImportarNF}
        obraId={(filtroObra && filtroObra !== 'geral' && filtroObra !== 'fabrica') ? filtroObra : null}
      />
    </div>
  );
}
