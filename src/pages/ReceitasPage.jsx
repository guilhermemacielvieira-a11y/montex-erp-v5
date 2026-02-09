// MONTEX ERP Premium - Gestão de Receitas
// Cadastro, filtros e controle de receitas

import React, { useState, useMemo } from 'react';
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
  Eye
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

// Receitas - dados limpos (cadastrar via formulário)
const mockReceitas = [];

// Evolução Mensal - dados limpos
const evolucaoMensal = [];

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0
  }).format(value);
};

const getStatusColor = (status) => {
  switch (status) {
    case 'recebido': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'pendente': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'atrasado': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'recebido': return 'Recebido';
    case 'pendente': return 'Pendente';
    case 'atrasado': return 'Atrasado';
    default: return status;
  }
};

export default function ReceitasPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receitas, setReceitas] = useState(mockReceitas);
  const [formData, setFormData] = useState({
    descricao: '',
    cliente: '',
    categoria: '',
    valor: '',
    vencimento: '',
    formaPagto: ''
  });

  // KPIs
  const kpis = useMemo(() => {
    const totalRecebido = mockReceitas.filter(r => r.status === 'recebido').reduce((sum, r) => sum + r.valor, 0);
    const totalPendente = mockReceitas.filter(r => r.status === 'pendente').reduce((sum, r) => sum + r.valor, 0);
    const totalAtrasado = mockReceitas.filter(r => r.status === 'atrasado').reduce((sum, r) => sum + r.valor, 0);
    const total = mockReceitas.reduce((sum, r) => sum + r.valor, 0);

    return { totalRecebido, totalPendente, totalAtrasado, total };
  }, []);

  // Filtrar receitas
  const receitasFiltradas = useMemo(() => {
    return receitas.filter(r => {
      if (searchTerm && !r.descricao.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !r.cliente.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filtroStatus !== 'todos' && r.status !== filtroStatus) return false;
      if (filtroCategoria !== 'todos' && r.categoria !== filtroCategoria) return false;
      return true;
    });
  }, [receitas, searchTerm, filtroStatus, filtroCategoria]);

  const handleSaveReceita = () => {
    if (!formData.descricao || !formData.cliente || !formData.categoria || !formData.valor || !formData.vencimento || !formData.formaPagto) {
      toast.error('Preenchear todos os campos');
      return;
    }

    const novaReceita = {
      id: Date.now(),
      data: new Date().toISOString().split('T')[0],
      descricao: formData.descricao,
      cliente: formData.cliente,
      obra: `${formData.cliente} - ${formData.descricao}`,
      valor: parseFloat(formData.valor),
      status: 'pendente',
      formaPagto: formData.formaPagto,
      vencimento: formData.vencimento,
      categoria: formData.categoria
    };

    setReceitas([...receitas, novaReceita]);
    toast.success('Receita criada com sucesso!');
    setDialogOpen(false);
    setFormData({
      descricao: '',
      cliente: '',
      categoria: '',
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            Gestão de Receitas
          </h1>
          <p className="text-slate-400 mt-1">Controle de faturamento e recebimentos</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600">
              <Plus className="h-4 w-4 mr-2" />
              Nova Receita
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Cadastrar Receita</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-slate-300">Descrição</Label>
                <Input
                  className="mt-1 bg-slate-800 border-slate-700"
                  placeholder="Ex: Medição 3 - Obra X"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Cliente</Label>
                  <Select value={formData.cliente} onValueChange={(value) => setFormData({...formData, cliente: value})}>
                    <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="SPASSO">SPASSO</SelectItem>
                      <SelectItem value="Amaggi">Amaggi</SelectItem>
                      <SelectItem value="Bunge">Bunge</SelectItem>
                      <SelectItem value="Cargill">Cargill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Categoria</Label>
                  <Select value={formData.categoria} onValueChange={(value) => setFormData({...formData, categoria: value})}>
                    <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="Medição">Medição</SelectItem>
                      <SelectItem value="Adiantamento">Adiantamento</SelectItem>
                      <SelectItem value="Medição Final">Medição Final</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              <Button
                className="w-full bg-gradient-to-r from-emerald-500 to-green-500"
                onClick={handleSaveReceita}
              >
                Cadastrar Receita
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

      {/* Gráfico */}
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
                <linearGradient id="colorRecebido" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="mes" stroke="#64748b" />
              <YAxis stroke="#64748b" tickFormatter={(v) => `${(v/1000)}k`} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} formatter={(value) => formatCurrency(value)} />
              <Area type="monotone" dataKey="recebido" name="Recebido" stroke="#10b981" fill="url(#colorRecebido)" />
              <Area type="monotone" dataKey="pendente" name="Pendente" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filtros e Tabela */}
      <Card className="bg-slate-900/60 border-slate-700/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Lista de Receitas</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar..."
                className="pl-10 w-[200px] bg-slate-800 border-slate-700"
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
                <SelectItem value="recebido">Recebido</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="atrasado">Atrasado</SelectItem>
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
                <TableHead className="text-slate-400">Cliente</TableHead>
                <TableHead className="text-slate-400">Categoria</TableHead>
                <TableHead className="text-slate-400">Vencimento</TableHead>
                <TableHead className="text-slate-400 text-right">Valor</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400 w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receitasFiltradas.map(receita => (
                <TableRow key={receita.id} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell className="text-slate-300">{new Date(receita.data).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-white font-medium">{receita.descricao}</TableCell>
                  <TableCell className="text-slate-300">{receita.cliente}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-600 text-slate-300">{receita.categoria}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-400">{new Date(receita.vencimento).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-400">{formatCurrency(receita.valor)}</TableCell>
                  <TableCell>
                    <Badge className={cn("border", getStatusColor(receita.status))}>
                      {getStatusText(receita.status)}
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
