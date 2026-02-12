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
  Layers
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
import { useLancamentos } from '../contexts/ERPContext';
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
  // ERPContext - dados reais do Supabase
  const { lancamentosDespesas, addLancamento, updateLancamento } = useLancamentos();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroCentro, setFiltroCentro] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
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

  // Sincronizar despesas com dados do Supabase
  useEffect(() => {
    if (lancamentosDespesas && lancamentosDespesas.length > 0) {
      // Excluir lancamentos vinculados a obras (exclusivos de GestaoFinanceiraObra)
        const despesasGerais = lancamentosDespesas.filter(l => !l.obraId && !l.obra_id);
        const despesasConvertidas = despesasGerais.map(l => ({
        id: l.id,
        data: l.data || l.createdAt || new Date().toISOString().split('T')[0],
        descricao: l.descricao || l.nome || '-',
        fornecedor: l.fornecedor || '-',
        categoria: l.categoria || 'Outros',
        centroCusto: l.centroCusto || l.centrosCusto || 'Produção',
        valor: l.valor || 0,
        status: l.status || 'pendente',
        formaPagto: l.formaPagto || l.formaPagamento || '-',
        vencimento: l.vencimento || l.dataVencimento || '-'
      }));
      setDespesas(despesasConvertidas);
    }
  }, [lancamentosDespesas]);

  // Dados para gráficos - dinâmicos
  const dadosCategorias = useMemo(() => {
    const catMap = {};
    despesas.forEach(d => {
      const cat = d.categoria || 'Outros';
      catMap[cat] = (catMap[cat] || 0) + (d.valor || 0);
    });
    return Object.entries(catMap).map(([nome, valor]) => ({
      nome,
      valor,
      cor: categorias.find(c => c.nome === nome)?.cor || '#64748b'
    }));
  }, [despesas]);

  const dadosCentros = useMemo(() => {
    const ccMap = {};
    despesas.forEach(d => {
      const cc = d.centroCusto || 'Outros';
      ccMap[cc] = (ccMap[cc] || 0) + (d.valor || 0);
    });
    return Object.entries(ccMap).map(([nome, valor]) => ({ nome, valor }));
  }, [despesas]);

  // KPIs - calculados dos dados reais
  const kpis = useMemo(() => {
    const totalPago = despesas.filter(d => d.status === 'pago').reduce((sum, d) => sum + (d.valor || 0), 0);
    const totalPendente = despesas.filter(d => d.status === 'pendente').reduce((sum, d) => sum + (d.valor || 0), 0);
    const totalAtrasado = despesas.filter(d => d.status === 'atrasado').reduce((sum, d) => sum + (d.valor || 0), 0);
    const total = despesas.reduce((sum, d) => sum + (d.valor || 0), 0);

    return { totalPago, totalPendente, totalAtrasado, total };
  }, [despesas]);

  // Filtrar despesas
  const despesasFiltradas = useMemo(() => {
    return despesas.filter(d => {
      if (searchTerm && !d.descricao.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !d.fornecedor.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filtroStatus !== 'todos' && d.status !== filtroStatus) return false;
      if (filtroCategoria !== 'todos' && d.categoria !== filtroCategoria) return false;
      if (filtroCentro !== 'todos' && d.centroCusto !== filtroCentro) return false;
      return true;
    });
  }, [despesas, searchTerm, filtroStatus, filtroCategoria, filtroCentro]);

  const handleSaveDespesa = async () => {
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

    // Persist via ERPContext → Supabase
    await addLancamento(novaDespesa);
    setDespesas(prev => [...prev, novaDespesa]);
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
          <p className="text-slate-400 mt-1">Controle de despesas com categorias e centros de custo</p>
        </div>

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
