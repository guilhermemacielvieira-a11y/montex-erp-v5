// MONTEX ERP Premium - Gestão de Despesas
// Cadastro com categorias e centros de custo

import React, { useState, useMemo, useEffect } from 'react';
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
  Eye,
  Tag,
  Layers,
  Calendar,
  Filter,
  Upload,
  FileSpreadsheet,
  Trash2,
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
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

// ========== STORAGE INDEPENDENTE (SEM vínculo com obras) ==========
const STORAGE_KEY = 'montex_despesas_gerais';
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

// Mock Data - Categorias
const categorias = [
  { id: 1, nome: 'Matéria Prima', cor: '#10b981' },
  { id: 2, nome: 'Mão de Obra', cor: '#3b82f6' },
  { id: 3, nome: 'Energia/Utilidades', cor: '#f59e0b' },
  { id: 4, nome: 'Manutenção', cor: '#8b5cf6' },
  { id: 5, nome: 'Transporte', cor: '#ec4899' },
  { id: 6, nome: 'Administrativo', cor: '#06b6d4' },
  { id: 7, nome: 'Impostos', cor: '#ef4444' },
];

// Mock Data - Centros de Custo
const centrosCusto = [
  { id: 1, nome: 'Produção', codigo: 'CC-001' },
  { id: 2, nome: 'Administrativo', codigo: 'CC-002' },
  { id: 3, nome: 'Comercial', codigo: 'CC-003' },
  { id: 4, nome: 'Logística', codigo: 'CC-004' },
  { id: 5, nome: 'RH', codigo: 'CC-005' },
];

// Despesas - dados limpos (cadastrar via formulário)
const mockDespesas = [];

// Dados para gráficos - serão calculados dinamicamente dentro do componente

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0
  }).format(value);
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
    default: return status;
  }
};

const getCategoriaColor = (categoriaNome) => {
  const cat = categorias.find(c => c.nome === categoriaNome);
  return cat?.cor || '#64748b';
};

export default function DespesasPage() {
  // === DADOS 100% INDEPENDENTES - SEM vínculo com obras/ERPContext ===
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroCentro, setFiltroCentro] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('geral');
  const [filtroOrigem, setFiltroOrigem] = useState('fabrica'); // fabrica, administrativo, todas
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [despesas, setDespesas] = useState([]);
  const [formData, setFormData] = useState({
    descricao: '',
    fornecedor: '',
    categoria: '',
    centroCusto: '',
    valor: '',
    vencimento: '',
    formaPagto: ''
  });

  // Salvar despesas no localStorage sempre que mudar
  const salvarDespesas = (lista) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    } catch (e) {
      console.warn('Erro ao salvar despesas:', e);
    }
  };

  // Carregar despesas do localStorage na inicialização
  useEffect(() => {
    try {
      const salvas = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (salvas.length > 0) {
        setDespesas(salvas);
      }
    } catch (e) {
      console.warn('Erro ao carregar despesas:', e);
    }
  }, []);

  // Categorizar despesa automaticamente pela descrição
  const categorizarDespesa = (descricao) => {
    const d = (descricao || '').toUpperCase();
    if (d.includes('FOLHA') || d.includes('DIARIA') || d.includes('HORA EXTRA') || d.includes('FÉRIAS') || d.includes('FGTS') || d.includes('ACERTO')) return 'Mão de Obra';
    if (d.includes('CEMIG') || d.includes('COPASA') || d.includes('ENERGIA') || d.includes('LUZ') || d.includes('AGUA')) return 'Energia/Utilidades';
    if (d.includes('ALUGUEL')) return 'Administrativo';
    if (d.includes('COMBUSTIVEL') || d.includes('POSTO') || d.includes('ABASTEC') || d.includes('PASSAGEM') || d.includes('TRANSPORTE') || d.includes('CARRO')) return 'Transporte';
    if (d.includes('MANUTENC') || d.includes('EQUIPAMENTO') || d.includes('EPI') || d.includes('FERRAMENTA')) return 'Manutenção';
    if (d.includes('SUPERMERCADO') || d.includes('ALIMENTA') || d.includes('ALMOCO') || d.includes('PADARIA') || d.includes('CAFÉ')) return 'Matéria Prima';
    if (d.includes('IMPOSTO') || d.includes('INSS') || d.includes('FGTS') || d.includes('DAS') || d.includes('SIMPLES')) return 'Impostos';
    if (d.includes('CONTABILIDADE') || d.includes('INTERNET') || d.includes('TELEFONE') || d.includes('PLANO SAUDE') || d.includes('UNIMED') || d.includes('CLINICA') || d.includes('EMISSOR') || d.includes('EMISOR') || d.includes('PONTO')) return 'Administrativo';
    return 'Outros';
  };

  // Importar arquivo Excel
  const handleImportExcel = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const importedItems = [];

        // Process each sheet
        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

          // Detect columns with data (pattern: date/type | description | value)
          // Iterate through rows looking for data patterns
          for (let rowIdx = 2; rowIdx < jsonData.length; rowIdx++) {
            const row = jsonData[rowIdx];
            if (!row) continue;

            // Scan columns in groups of ~4 (date, desc, value, empty)
            for (let colIdx = 0; colIdx < row.length - 2; colIdx++) {
              const cell0 = row[colIdx];
              const cell1 = row[colIdx + 1];
              const cell2 = row[colIdx + 2];

              // Skip if empty
              if (!cell0 && !cell1) continue;

              // Pattern 1 (Planilha1): Date | Description | Value
              let dataStr = null;
              let descricao = null;
              let valor = null;

              // Check if cell0 is a date
              const dateVal = cell0 ? new Date(cell0) : null;
              const isDate = dateVal && !isNaN(dateVal.getTime()) && dateVal.getFullYear() >= 2020 && dateVal.getFullYear() <= 2030;

              if (isDate && cell1 && typeof cell1 === 'string' && cell1.length > 1) {
                const numVal = parseFloat(String(cell2).replace(/[^\d.,]/g, '').replace(',', '.'));
                if (numVal > 0) {
                  dataStr = dateVal.toISOString().split('T')[0];
                  descricao = cell1.trim();
                  valor = numVal;
                }
              }
              // Pattern 2 (CUSTOS): Type | Value (no date - use month from header)
              else if (cell0 && typeof cell0 === 'string' && cell0.length > 2 && !isDate) {
                const numVal = parseFloat(String(cell1).replace(/[^\d.,]/g, '').replace(',', '.'));
                if (numVal > 0 && !String(cell0).includes('DESPESAS') && !String(cell0).includes('TIPO') && !String(cell0).includes('TOTAL')) {
                  // Try to get month from header (row 1 or 3)
                  const headerRow = jsonData[1] || jsonData[3] || [];
                  let monthStr = '';
                  for (let hc = Math.max(0, colIdx - 1); hc <= Math.min(colIdx + 1, headerRow.length - 1); hc++) {
                    if (headerRow[hc] && typeof headerRow[hc] === 'string' && headerRow[hc].includes('DESPESAS')) {
                      monthStr = headerRow[hc];
                      break;
                    }
                  }
                  // Also check row 3 for "CUSTOS" sheet
                  const headerRow3 = jsonData[3] || [];
                  for (let hc = Math.max(0, colIdx - 1); hc <= Math.min(colIdx + 1, headerRow3.length - 1); hc++) {
                    if (headerRow3[hc] && typeof headerRow3[hc] === 'string' && headerRow3[hc].includes('DESPESAS')) {
                      monthStr = headerRow3[hc];
                      break;
                    }
                  }

                  const months = { 'JANEIRO': '01', 'FEVEREIRO': '02', 'MARÇO': '03', 'MARCO': '03', 'ABRIL': '04', 'MAIO': '05', 'JUNHO': '06', 'JULHO': '07', 'AGOSTO': '08', 'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12' };
                  let year = sheetName === 'CUSTOS' ? '2024' : '2025';
                  let month = '01';
                  for (const [name, num] of Object.entries(months)) {
                    if (monthStr.toUpperCase().includes(name)) {
                      month = num;
                      break;
                    }
                  }
                  dataStr = `${year}-${month}-15`;
                  descricao = cell0.trim();
                  valor = numVal;
                }
              }

              if (dataStr && descricao && valor) {
                const id = `imp_${sheetName}_${rowIdx}_${colIdx}_${Date.now()}`;
                importedItems.push({
                  id,
                  data: dataStr,
                  descricao,
                  fornecedor: '-',
                  categoria: categorizarDespesa(descricao),
                  centroCusto: 'Produção',
                  valor,
                  status: 'pago',
                  formaPagto: '-',
                  vencimento: dataStr,
                  importado: true,
                  sheet: sheetName,
                });
              }
            }
          }
        });

        // Deduplicate by descricao + data + valor
        const seen = new Set();
        const uniqueItems = importedItems.filter(item => {
          const key = `${item.data}_${item.descricao}_${item.valor}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setImportPreview(uniqueItems);
        setImportDialogOpen(true);
        toast.success(`${uniqueItems.length} despesas encontradas no arquivo!`);
      } catch (err) {
        console.error('Erro ao ler Excel:', err);
        toast.error('Erro ao ler o arquivo Excel. Verifique o formato.');
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    e.target.value = '';
  };

  // Confirmar importação
  const confirmarImportacao = async () => {
    setImporting(true);
    try {
      const existingKeys = new Set(despesas.map(d => `${d.data}_${d.descricao}_${d.valor}`));
      const novas = importPreview.filter(d => !existingKeys.has(`${d.data}_${d.descricao}_${d.valor}`));
      const novaLista = [...despesas, ...novas];
      setDespesas(novaLista);
      salvarDespesas(novaLista);

      toast.success(`${novas.length} despesas importadas com sucesso!`);
      setImportDialogOpen(false);
      setImportPreview([]);
    } catch (e) {
      console.error('Erro na importação:', e);
      toast.error('Erro ao importar despesas.');
    }
    setImporting(false);
  };

  // Helper: filtrar por período (definido antes dos useMemo que o usam)
  const filtrarPorPeriodo = (lista) => {
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
    return lista.filter(d => {
      const dataDesp = new Date(d.data || d.vencimento);
      return dataDesp >= inicio && dataDesp <= hoje;
    });
  };

  // Despesas filtradas por período + origem (para KPIs e gráficos)
  const despesasPeriodo = useMemo(() => {
    let lista = despesas;
    if (filtroOrigem !== 'todas') {
      const catsPermitidas = origemCategorias[filtroOrigem] || [];
      lista = lista.filter(d => catsPermitidas.includes(d.categoria));
    }
    return filtrarPorPeriodo(lista);
  }, [despesas, filtroPeriodo, filtroOrigem]);

  // Dados para gráficos - dinâmicos (usam período)
  const dadosCategorias = useMemo(() => {
    const catMap = {};
    despesasPeriodo.forEach(d => {
      const cat = d.categoria || 'Outros';
      catMap[cat] = (catMap[cat] || 0) + (d.valor || 0);
    });
    return Object.entries(catMap).map(([nome, valor]) => ({
      nome,
      valor,
      cor: categorias.find(c => c.nome === nome)?.cor || '#64748b'
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

  // KPIs - calculados dos dados filtrados por período
  const kpis = useMemo(() => {
    const totalPago = despesasPeriodo.filter(d => d.status === 'pago').reduce((sum, d) => sum + (d.valor || 0), 0);
    const totalPendente = despesasPeriodo.filter(d => d.status === 'pendente').reduce((sum, d) => sum + (d.valor || 0), 0);
    const totalAtrasado = despesasPeriodo.filter(d => d.status === 'atrasado').reduce((sum, d) => sum + (d.valor || 0), 0);
    const total = despesasPeriodo.reduce((sum, d) => sum + (d.valor || 0), 0);

    return { totalPago, totalPendente, totalAtrasado, total };
  }, [despesasPeriodo]);

  // Mapeamento de origem para categorias
  const origemCategorias = {
    fabrica: ['Matéria Prima', 'Manutenção', 'Energia/Utilidades'],
    administrativo: ['Administrativo'],
    transporte: ['Transporte'],
    maodeobra: ['Mão de Obra', 'Impostos'],
  };

  // Filtrar despesas
  const despesasFiltradas = useMemo(() => {
    let resultado = despesas.filter(d => {
      // Filtro por origem/tipo
      if (filtroOrigem !== 'todas') {
        const catsPermitidas = origemCategorias[filtroOrigem] || [];
        if (!catsPermitidas.includes(d.categoria)) return false;
      }
      if (searchTerm && !d.descricao.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !d.fornecedor.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filtroStatus !== 'todos' && d.status !== filtroStatus) return false;
      if (filtroCategoria !== 'todos' && d.categoria !== filtroCategoria) return false;
      if (filtroCentro !== 'todos' && d.centroCusto !== filtroCentro) return false;
      return true;
    });
    return filtrarPorPeriodo(resultado);
  }, [despesas, searchTerm, filtroStatus, filtroCategoria, filtroCentro, filtroPeriodo, filtroOrigem]);

  const handleSaveDespesa = () => {
    if (!formData.descricao || !formData.fornecedor || !formData.categoria || !formData.centroCusto || !formData.valor || !formData.vencimento || !formData.formaPagto) {
      toast.error('Preencher todos os campos');
      return;
    }

    const novaDespesa = {
      id: `desp-${Date.now()}`,
      data: new Date().toISOString().split('T')[0],
      descricao: formData.descricao,
      fornecedor: formData.fornecedor,
      categoria: formData.categoria,
      centroCusto: formData.centroCusto,
      valor: parseFloat(formData.valor),
      status: 'pendente',
      formaPagto: formData.formaPagto,
      vencimento: formData.vencimento
    };

    const novaLista = [...despesas, novaDespesa];
    setDespesas(novaLista);
    salvarDespesas(novaLista);
    toast.success('Despesa criada com sucesso!');
    setDialogOpen(false);
    setFormData({
      descricao: '',
      fornecedor: '',
      categoria: '',
      centroCusto: '',
      valor: '',
      vencimento: '',
      formaPagto: ''
    });
  };

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
          <div className="flex items-center gap-3 mt-2">
            <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
              <SelectTrigger className="w-[220px] bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="todas" className="text-white">Todas as Despesas</SelectItem>
                <SelectItem value="fabrica" className="text-white">Despesas Fábrica</SelectItem>
                <SelectItem value="administrativo" className="text-white">Despesas Administrativo</SelectItem>
                <SelectItem value="transporte" className="text-white">Despesas Transporte</SelectItem>
                <SelectItem value="maodeobra" className="text-white">Despesas Mão de Obra</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-slate-500 text-sm">|</span>
            <span className="text-slate-400 text-sm">{despesasFiltradas.length} lançamentos</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportExcel}
            />
            <span className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors gap-2">
              <Upload className="h-4 w-4" />
              Importar Excel
            </span>
          </label>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600">
                <Plus className="h-4 w-4 mr-2" />
                Nova Despesa
              </Button>
            </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Cadastrar Despesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-slate-300">Descrição</Label>
                <Input
                  className="mt-1 bg-slate-800 border-slate-700"
                  placeholder="Ex: Compra de material"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Fornecedor</Label>
                  <Input
                    className="mt-1 bg-slate-800 border-slate-700"
                    placeholder="Nome do fornecedor"
                    value={formData.fornecedor}
                    onChange={(e) => setFormData({...formData, fornecedor: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Categoria</Label>
                  <Select value={formData.categoria} onValueChange={(value) => setFormData({...formData, categoria: value})}>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Centro de Custo</Label>
                  <Select value={formData.centroCusto} onValueChange={(value) => setFormData({...formData, centroCusto: value})}>
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
                <div>
                  <Label className="text-slate-300">Valor</Label>
                  <Input
                    className="mt-1 bg-slate-800 border-slate-700"
                    type="number"
                    placeholder="0,00"
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Vencimento</Label>
                  <Input
                    className="mt-1 bg-slate-800 border-slate-700"
                    type="date"
                    value={formData.vencimento}
                    onChange={(e) => setFormData({...formData, vencimento: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Forma de Pagamento</Label>
                  <Select value={formData.formaPagto} onValueChange={(value) => setFormData({...formData, formaPagto: value})}>
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
              <Button
                className="w-full bg-gradient-to-r from-rose-500 to-red-500"
                onClick={handleSaveDespesa}
              >
                Cadastrar Despesa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Modal de Preview de Importação */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
              Prévia da Importação — {importPreview.length} despesas encontradas
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
                  <TableHead className="text-slate-400">Planilha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importPreview.slice(0, 100).map((item, idx) => (
                  <TableRow key={idx} className="border-slate-800">
                    <TableCell className="text-slate-300 text-xs">{new Date(item.data).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-white text-sm">{item.descricao}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-slate-600 text-xs" style={{ color: getCategoriaColor(item.categoria) }}>
                        {item.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-rose-400 text-sm">{formatCurrency(item.valor)}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{item.sheet}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {importPreview.length > 100 && (
              <p className="text-xs text-slate-500 text-center py-2">Mostrando 100 de {importPreview.length} itens...</p>
            )}
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              Total: <span className="text-white font-semibold">{formatCurrency(importPreview.reduce((s, d) => s + d.valor, 0))}</span>
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setImportDialogOpen(false)} className="border-slate-600 text-white">
                Cancelar
              </Button>
              <Button
                onClick={confirmarImportacao}
                disabled={importing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {importing ? 'Importando...' : `Importar ${importPreview.length} Despesas`}
              </Button>
            </div>
          </div>
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
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/25"
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
        {/* Por Categoria */}
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
                <Legend wrapperStyle={{ color: '#94a3b8' }} formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Por Centro de Custo */}
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

      {/* Filtros e Tabela */}
      <Card className="bg-slate-900/60 border-slate-700/50">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-white">Lista de Despesas</CardTitle>
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
              <SelectTrigger className="w-[120px] bg-slate-800 border-slate-700">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
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
                {categorias.map(cat => (
                  <SelectItem key={cat.id} value={cat.nome}>{cat.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroCentro} onValueChange={setFiltroCentro}>
              <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700">
                <SelectValue placeholder="Centro" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="todos">Todos</SelectItem>
                {centrosCusto.map(cc => (
                  <SelectItem key={cc.id} value={cc.nome}>{cc.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="border-slate-700 text-slate-300">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-400">Data</TableHead>
                <TableHead className="text-slate-400">Descrição</TableHead>
                <TableHead className="text-slate-400">Fornecedor</TableHead>
                <TableHead className="text-slate-400">Categoria</TableHead>
                <TableHead className="text-slate-400">Centro Custo</TableHead>
                <TableHead className="text-slate-400 text-right">Valor</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesasFiltradas.map(despesa => (
                <TableRow key={despesa.id} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell className="text-slate-300">{new Date(despesa.data).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-white font-medium">{despesa.descricao}</TableCell>
                  <TableCell className="text-slate-300">{despesa.fornecedor}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-600" style={{ color: getCategoriaColor(despesa.categoria) }}>
                      <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: getCategoriaColor(despesa.categoria) }} />
                      {despesa.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-400">{despesa.centroCusto}</TableCell>
                  <TableCell className="text-right font-semibold text-rose-400">{formatCurrency(despesa.valor)}</TableCell>
                  <TableCell>
                    <Badge className={cn("border", getStatusColor(despesa.status))}>
                      {getStatusText(despesa.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
