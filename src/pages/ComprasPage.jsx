import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  ShoppingCart,
  FileText,
  Users,
  Package,
  Plus,
  Search,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  Building2,
  Phone,
  Mail,
  MapPin,
  Star,
  Edit,
  Eye,
  Send,
  RefreshCw,
  Weight,
  Receipt
} from 'lucide-react';

import { useCompras, useMateriais, useERP } from '@/contexts/ERPContext';

// Fornecedores reais cadastrados (base)
const fornecedoresBase = [
  {
    id: 1,
    nome: 'Gerdau Aços Longos S.A.',
    cnpj: '07.358.761/0001-69',
    cidade: 'Ouro Branco, MG',
    telefone: '(31) 9988-305655',
    email: 'eduardo.acosgrdau@gmail.com',
    contato: 'Eduardo Bruno da Purificação',
    rating: 4.9,
    categorias: ['Perfis W', 'Chapas', 'Barras', 'Cantoneiras']
  }
];

const statusConfig = {
  cotacao_recebida: { label: 'Cotação Recebida', color: 'bg-amber-100 text-amber-800', icon: FileText },
  ordem_confirmada: { label: 'Ordem Confirmada', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  em_transito: { label: 'Em Trânsito', color: 'bg-blue-100 text-blue-800', icon: Truck },
  entregue: { label: 'Entregue', color: 'bg-emerald-100 text-emerald-800', icon: Package },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  aberta: { label: 'Aberta', color: 'bg-blue-100 text-blue-800', icon: Clock },
  finalizada: { label: 'Finalizada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  em_analise: { label: 'Em Análise', color: 'bg-purple-100 text-purple-800', icon: Search },
};

function KPICard({ title, value, subtitle, icon: Icon, trend, trendUp }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            {trend && (
              <div className={`flex items-center text-xs ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {trend}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pendente;
  const Icon = config.icon;
  return (
    <Badge className={`${config.color} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function NovoPedidoDialog({ onSave, fornecedoresCadastrados = fornecedoresBase }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    fornecedor: '',
    prazo: '',
    descricao: '',
    projeto: '',
    urgencia: ''
  });

  const handleSave = () => {
    if (!formData.fornecedor || !formData.prazo) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const newPedido = {
      id: `PC-${String(Date.now()).slice(-3)}`,
      fornecedor: fornecedoresCadastrados.find(f => f.id.toString() === formData.fornecedor)?.nome || formData.fornecedor,
      data: new Date().toISOString().split('T')[0],
      valor: 0,
      status: 'pendente',
      itens: 1,
      prazo: formData.prazo
    };

    onSave(newPedido);
    setFormData({ fornecedor: '', prazo: '', descricao: '', projeto: '', urgencia: '' });
    setOpen(false);
    toast.success('Pedido criado com sucesso!');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Pedido de Compra</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo pedido de compra.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Select value={formData.fornecedor} onValueChange={(value) => setFormData({...formData, fornecedor: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedoresCadastrados.map(f => (
                    <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo de Entrega</Label>
              <Input type="date" id="prazo" value={formData.prazo} onChange={(e) => setFormData({...formData, prazo: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" placeholder="Descreva os itens do pedido..." value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projeto">Projeto (opcional)</Label>
              <Select value={formData.projeto} onValueChange={(value) => setFormData({...formData, projeto: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proj1">Projeto Alfa</SelectItem>
                  <SelectItem value="proj2">Projeto Beta</SelectItem>
                  <SelectItem value="proj3">Projeto Gamma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="urgencia">Urgência</Label>
              <Select value={formData.urgencia} onValueChange={(value) => setFormData({...formData, urgencia: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Criar Pedido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovaCotacaoDialog({ onSave }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    especificacoes: '',
    quantidade: '',
    unidade: '',
    prazo: '',
    fornecedores: ''
  });

  const handleSave = () => {
    if (!formData.titulo || !formData.prazo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const newCotacao = {
      id: `COT-${String(Date.now()).slice(-3)}`,
      descricao: formData.titulo,
      fornecedores: 3,
      menor: 15000,
      maior: 25000,
      prazo: formData.prazo,
      status: 'aberta'
    };

    onSave(newCotacao);
    setFormData({ titulo: '', especificacoes: '', quantidade: '', unidade: '', prazo: '', fornecedores: '' });
    setOpen(false);
    toast.success('Cotação criada com sucesso!');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Nova Cotação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Cotação</DialogTitle>
          <DialogDescription>
            Crie uma nova solicitação de cotação para fornecedores.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título da Cotação</Label>
            <Input id="titulo" placeholder="Ex: Chapas de Aço Inox 304" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="especificacoes">Especificações Técnicas</Label>
            <Textarea id="especificacoes" placeholder="Detalhe as especificações dos materiais..." rows={4} value={formData.especificacoes} onChange={(e) => setFormData({...formData, especificacoes: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input type="number" id="quantidade" placeholder="0" value={formData.quantidade} onChange={(e) => setFormData({...formData, quantidade: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Select value={formData.unidade} onValueChange={(value) => setFormData({...formData, unidade: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="un">Unidade</SelectItem>
                  <SelectItem value="kg">Quilograma</SelectItem>
                  <SelectItem value="m">Metro</SelectItem>
                  <SelectItem value="m2">Metro²</SelectItem>
                  <SelectItem value="m3">Metro³</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prazo_cotacao">Prazo para Respostas</Label>
              <Input type="date" id="prazo_cotacao" value={formData.prazo} onChange={(e) => setFormData({...formData, prazo: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Fornecedores</Label>
              <Select value={formData.fornecedores} onValueChange={(value) => setFormData({...formData, fornecedores: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar fornecedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os cadastrados</SelectItem>
                  <SelectItem value="favoritos">Apenas favoritos</SelectItem>
                  <SelectItem value="selecionar">Selecionar manualmente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} className="gap-2">
            <Send className="h-4 w-4" />
            Enviar Cotação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovoFornecedorDialog({ onSave }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    email: '',
    cidade: '',
    estado: '',
    cep: '',
    categorias: ''
  });

  const handleSave = () => {
    if (!formData.nome || !formData.cnpj || !formData.email) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const newFornecedor = {
      id: Date.now(),
      nome: formData.nome,
      cnpj: formData.cnpj,
      cidade: formData.cidade,
      telefone: formData.telefone,
      email: formData.email,
      rating: 4.0,
      pedidos: 0,
      valorTotal: 0
    };

    onSave(newFornecedor);
    setFormData({ nome: '', cnpj: '', telefone: '', email: '', cidade: '', estado: '', cep: '', categorias: '' });
    setOpen(false);
    toast.success('Fornecedor cadastrado com sucesso!');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Building2 className="h-4 w-4" />
          Novo Fornecedor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cadastrar Fornecedor</DialogTitle>
          <DialogDescription>
            Adicione um novo fornecedor ao sistema.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_fornecedor">Razão Social</Label>
              <Input id="nome_fornecedor" placeholder="Nome da empresa" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" placeholder="00.000.000/0000-00" value={formData.cnpj} onChange={(e) => setFormData({...formData, cnpj: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" placeholder="(00) 0000-0000" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input type="email" id="email" placeholder="contato@empresa.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" placeholder="Cidade" value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select value={formData.estado} onValueChange={(value) => setFormData({...formData, estado: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SP">SP</SelectItem>
                  <SelectItem value="RJ">RJ</SelectItem>
                  <SelectItem value="MG">MG</SelectItem>
                  <SelectItem value="PR">PR</SelectItem>
                  <SelectItem value="SC">SC</SelectItem>
                  <SelectItem value="RS">RS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" placeholder="00000-000" value={formData.cep} onChange={(e) => setFormData({...formData, cep: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="categorias">Categorias de Produtos</Label>
            <Select value={formData.categorias} onValueChange={(value) => setFormData({...formData, categorias: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metais">Metais</SelectItem>
                <SelectItem value="vidros">Vidros</SelectItem>
                <SelectItem value="madeiras">Madeiras</SelectItem>
                <SelectItem value="ferragens">Ferragens</SelectItem>
                <SelectItem value="quimicos">Químicos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Cadastrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ComprasPage() {
  // === DADOS DO SUPABASE VIA ERPCONTEXT ===
  const { compras: comprasContext } = useCompras();
  const { materiaisEstoque, estatisticasEstoque } = useMateriais();
  const { notasFiscais } = useERP();

  // Normalizar compras (compatível com dados Supabase e mock)
  const pedidosReais = useMemo(() => comprasContext.map(c => {
    const itensArr = Array.isArray(c.itens) ? c.itens : [];
    const pesoCalc = itensArr.reduce((acc, i) => acc + (i.quantidade || 0), 0);
    return {
      id: c.id,
      fornecedor: c.fornecedor || '',
      documento: c.documentoOrigem || c.numero || c.id,
      data: c.dataCotacao || c.dataPedido || null,
      valor: c.valorTotal || 0,
      pesoKg: c.pesoTotalKg || pesoCalc,
      status: c.status || 'pendente',
      statusFinanceiro: c.statusFinanceiro || 'previsto',
      itens: itensArr.length,
      prazo: c.dataValidade || c.dataPrevisaoEntrega || null,
      observacao: c.observacao || c.observacoes || '',
      condicaoPagamento: c.condicaoPagamento || '',
      tipo: c.tipo || 'pre_pedido',
      _original: c
    };
  }), [comprasContext]);

  // Fornecedores com totais calculados
  const fornecedoresCadastrados = useMemo(() => fornecedoresBase.map(f => ({
    ...f,
    pedidos: comprasContext.length,
    valorTotal: comprasContext.reduce((acc, c) => acc + (c.valorTotal || 0), 0)
  })), [comprasContext]);

  const [pedidos, setPedidos] = useState([]);
  const [cotacoes, setCotacoes] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermMat, setSearchTermMat] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [activeTab, setActiveTab] = useState('pedidos');
  const [selectedPedido, setSelectedPedido] = useState(null);

  // Atualizar pedidos quando dados do contexto mudarem
  React.useEffect(() => {
    if (pedidosReais.length > 0) setPedidos(pedidosReais);
  }, [pedidosReais]);

  React.useEffect(() => {
    if (fornecedoresCadastrados.length > 0) setFornecedores(fornecedoresCadastrados);
  }, [fornecedoresCadastrados]);

  const filteredPedidos = pedidos.filter(pedido => {
    const matchesSearch = (pedido.fornecedor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (pedido.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (pedido.documento || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || pedido.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtrar materiais
  const filteredMateriais = useMemo(() => {
    if (!searchTermMat) return materiaisEstoque;
    const term = searchTermMat.toLowerCase();
    return materiaisEstoque.filter(m =>
      (m.codigo || '').toLowerCase().includes(term) ||
      (m.descricao || '').toLowerCase().includes(term) ||
      (m.notaFiscal || '').toLowerCase().includes(term) ||
      (m.fornecedor || '').toLowerCase().includes(term)
    );
  }, [materiaisEstoque, searchTermMat]);

  const totalCompras = pedidos.reduce((acc, p) => acc + (p.valor || 0), 0);
  const pedidosPendentes = pedidos.filter(p => (p.statusFinanceiro || '') === 'previsto').length;
  const cotacoesAbertas = cotacoes.filter(c => c.status === 'aberta').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
          <p className="text-muted-foreground">
            Gerencie pedidos de compra, cotações e fornecedores
          </p>
        </div>
        <div className="flex gap-2">
          <NovoFornecedorDialog onSave={(fornecedor) => setFornecedores([...fornecedores, fornecedor])} />
          <NovaCotacaoDialog onSave={(cotacao) => setCotacoes([...cotacoes, cotacao])} />
          <NovoPedidoDialog onSave={(pedido) => setPedidos([...pedidos, pedido])} fornecedoresCadastrados={fornecedoresCadastrados} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Previsto (Pré-Pedidos)"
          value={`R$ ${totalCompras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Valores previstos - sem lançamento real"
          icon={DollarSign}
        />
        <KPICard
          title="Pré-Pedidos"
          value={pedidosPendentes}
          subtitle="Status: Previsto"
          icon={Clock}
        />
        <KPICard
          title="Peso Total Previsto"
          value={`${pedidos.reduce((acc, p) => acc + (p.pesoKg || 0), 0).toLocaleString('pt-BR')} kg`}
          subtitle="Material a receber"
          icon={Package}
        />
        <KPICard
          title="Fornecedores"
          value={fornecedores.length}
          subtitle="Cadastrados"
          icon={Building2}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 lg:w-[650px]">
          <TabsTrigger value="pedidos" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="materiais" className="gap-2">
            <Weight className="h-4 w-4" />
            Materiais
          </TabsTrigger>
          <TabsTrigger value="nfs" className="gap-2">
            <Receipt className="h-4 w-4" />
            Notas Fiscais
          </TabsTrigger>
          <TabsTrigger value="cotacoes" className="gap-2">
            <FileText className="h-4 w-4" />
            Cotações
          </TabsTrigger>
          <TabsTrigger value="fornecedores" className="gap-2">
            <Users className="h-4 w-4" />
            Fornecedores
          </TabsTrigger>
        </TabsList>

        {/* Pedidos de Compra */}
        <TabsContent value="pedidos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Pedidos de Compra</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar pedidos..."
                      className="pl-8 w-[250px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="cotacao_recebida">Cotação Recebida</SelectItem>
                      <SelectItem value="ordem_confirmada">Ordem Confirmada</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="em_transito">Em Trânsito</SelectItem>
                      <SelectItem value="entregue">Entregue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead className="text-right">Peso (kg)</TableHead>
                    <TableHead className="text-right">Valor Previsto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Financeiro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPedidos.map((pedido) => (
                    <TableRow key={pedido.id}>
                      <TableCell className="font-medium">{pedido.id}</TableCell>
                      <TableCell className="text-xs font-mono">{pedido.documento}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{pedido.fornecedor}</TableCell>
                      <TableCell>{new Date(pedido.data).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{pedido.itens}</TableCell>
                      <TableCell className="text-right">{pedido.pesoKg?.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right font-medium">R$ {pedido.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell><StatusBadge status={pedido.status} /></TableCell>
                      <TableCell>
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          PREVISTO
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setSelectedPedido(pedido._original || pedido);
                          }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== MATERIAIS (pedidos_material do Supabase) ========== */}
        <TabsContent value="materiais" className="space-y-4">
          {/* KPIs de Materiais */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total de Itens"
              value={estatisticasEstoque?.total || materiaisEstoque.length}
              subtitle="Materiais cadastrados"
              icon={Package}
            />
            <KPICard
              title="Peso Pedido"
              value={`${(estatisticasEstoque?.pesoPedido || materiaisEstoque.reduce((a, m) => a + (m.pesoPedido || 0), 0)).toLocaleString('pt-BR')} kg`}
              subtitle="Total solicitado"
              icon={Weight}
            />
            <KPICard
              title="Peso Recebido"
              value={`${(estatisticasEstoque?.pesoRecebido || materiaisEstoque.reduce((a, m) => a + (m.pesoRecebido || m.pesoEntregue || 0), 0)).toLocaleString('pt-BR')} kg`}
              subtitle="Total entregue"
              icon={Truck}
            />
            <KPICard
              title="Peso Faltante"
              value={`${(estatisticasEstoque?.pesoFalta || materiaisEstoque.reduce((a, m) => a + (m.pesoFalta || m.pesoFaltaEntregar || 0), 0)).toLocaleString('pt-BR')} kg`}
              subtitle="A receber"
              icon={AlertCircle}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Controle de Materiais por Peso (KG)</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar material, código, NF..."
                    className="pl-8 w-[300px]"
                    value={searchTermMat}
                    onChange={(e) => setSearchTermMat(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Peso Pedido</TableHead>
                    <TableHead className="text-right">Peso Entregue</TableHead>
                    <TableHead className="text-right">Falta</TableHead>
                    <TableHead className="text-center">%</TableHead>
                    <TableHead>NF</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMateriais.map((mat) => {
                    const pesoPedido = mat.pesoPedido || 0;
                    const pesoEntregue = mat.pesoRecebido || mat.pesoEntregue || 0;
                    const pesoFalta = mat.pesoFalta || mat.pesoFaltaEntregar || Math.max(0, pesoPedido - pesoEntregue);
                    const percentual = mat.percentualEntregue || (pesoPedido > 0 ? Math.round((pesoEntregue / pesoPedido) * 100) : 0);
                    const status = mat.status || 'pendente';
                    return (
                      <TableRow key={mat.id}>
                        <TableCell className="font-mono text-xs font-medium">{mat.codigo || mat.id}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{mat.descricao || ''}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {(mat.tipo || '').replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{pesoPedido.toLocaleString('pt-BR')} kg</TableCell>
                        <TableCell className="text-right">{pesoEntregue.toLocaleString('pt-BR')} kg</TableCell>
                        <TableCell className="text-right">
                          <span className={pesoFalta > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                            {pesoFalta.toLocaleString('pt-BR')} kg
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <Progress value={percentual} className="h-2 flex-1" />
                            <span className="text-xs font-medium w-[35px]">{percentual}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{mat.notaFiscal || '—'}</TableCell>
                        <TableCell>
                          <Badge className={
                            status === 'entregue' ? 'bg-green-100 text-green-800' :
                            status === 'parcial' ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {status === 'entregue' ? 'Entregue' : status === 'parcial' ? 'Parcial' : 'Pendente'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredMateriais.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        Nenhum material encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {filteredMateriais.length > 0 && (
                <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{filteredMateriais.length} materiais</span>
                  <div className="flex gap-6">
                    <div>
                      <span className="text-muted-foreground">Valor Total Pedido: </span>
                      <span className="font-bold">
                        R$ {filteredMateriais.reduce((a, m) => a + (m.valorTotalPedido || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Peso Total: </span>
                      <span className="font-bold">
                        {filteredMateriais.reduce((a, m) => a + (m.pesoPedido || 0), 0).toLocaleString('pt-BR')} kg
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== NOTAS FISCAIS ========== */}
        <TabsContent value="nfs" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <KPICard
              title="Notas Fiscais"
              value={notasFiscais.length}
              subtitle="Total recebidas"
              icon={Receipt}
            />
            <KPICard
              title="Valor Total NFs"
              value={`R$ ${notasFiscais.reduce((a, nf) => a + (nf.valorTotal || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              subtitle="Soma das notas"
              icon={DollarSign}
            />
            <KPICard
              title="Fornecedores"
              value={[...new Set(notasFiscais.map(nf => nf.fornecedor))].length}
              subtitle="Distintos nas NFs"
              icon={Building2}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Notas Fiscais Recebidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {notasFiscais.map((nf) => {
                  const itensArr = Array.isArray(nf.itens) ? nf.itens : [];
                  const pesoTotal = itensArr.reduce((a, i) => a + (i.quantidade || 0), 0);
                  return (
                    <Card key={nf.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-lg">NF {nf.numero || nf.id}</h4>
                              <Badge className={
                                nf.status === 'conferida' ? 'bg-green-100 text-green-800' :
                                nf.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }>
                                {(nf.status || 'pendente').charAt(0).toUpperCase() + (nf.status || 'pendente').slice(1)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{nf.fornecedor}</p>
                            {nf.dataEmissao && (
                              <p className="text-xs text-muted-foreground">
                                Emissão: {new Date(nf.dataEmissao).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-lg font-bold">
                              R$ {(nf.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-sm text-muted-foreground">{pesoTotal.toLocaleString('pt-BR')} kg</p>
                          </div>
                        </div>

                        {/* Itens da NF */}
                        {itensArr.length > 0 && (
                          <div className="mt-4 pt-3 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-2">{itensArr.length} itens:</p>
                            <div className="grid gap-1">
                              {itensArr.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm py-1 px-2 rounded bg-muted/40">
                                  <span className="truncate max-w-[300px]">{item.descricao}</span>
                                  <div className="flex gap-4 items-center">
                                    <Badge variant="outline" className="text-xs">{item.material || item.categoria}</Badge>
                                    <span className="font-mono text-xs min-w-[80px] text-right">
                                      {(item.quantidade || 0).toLocaleString('pt-BR')} {item.unidade || 'KG'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {nf.referenciaCompra && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Ref. Compra: {nf.referenciaCompra}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {notasFiscais.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma nota fiscal encontrada
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cotações */}
        <TabsContent value="cotacoes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Cotações</CardTitle>
                <Button variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {cotacoes.map((cotacao) => (
                  <Card key={cotacao.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{cotacao.id}</h4>
                            <StatusBadge status={cotacao.status} />
                          </div>
                          <p className="text-sm text-muted-foreground">{cotacao.descricao}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm text-muted-foreground">{cotacao.fornecedores} fornecedores</p>
                          <p className="text-xs text-muted-foreground">Prazo: {new Date(cotacao.prazo).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex gap-6">
                          <div>
                            <p className="text-xs text-muted-foreground">Menor Preço</p>
                            <p className="font-semibold text-green-600">R$ {cotacao.menor.toLocaleString('pt-BR')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Maior Preço</p>
                            <p className="font-semibold text-red-600">R$ {cotacao.maior.toLocaleString('pt-BR')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Economia</p>
                            <p className="font-semibold text-blue-600">{Math.round((1 - cotacao.menor/cotacao.maior) * 100)}%</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">Ver Detalhes</Button>
                          {cotacao.status === 'aberta' && (
                            <Button size="sm">Encerrar</Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fornecedores */}
        <TabsContent value="fornecedores" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Fornecedores Cadastrados</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar fornecedor..." className="pl-8 w-[250px]" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {fornecedores.map((fornecedor) => (
                  <Card key={fornecedor.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{fornecedor.nome}</h4>
                            <div className="flex items-center gap-1 text-yellow-500">
                              <Star className="h-4 w-4 fill-current" />
                              <span className="text-sm font-medium">{fornecedor.rating}</span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{fornecedor.cnpj}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toast.success(`Visualizando fornecedor ${fornecedor.nome}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => toast.success(`Editando fornecedor ${fornecedor.nome}`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {fornecedor.cidade}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {fornecedor.telefone}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {fornecedor.email}
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t flex justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Pedidos</p>
                          <p className="font-semibold">{fornecedor.pedidos}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total Comprado</p>
                          <p className="font-semibold">R$ {fornecedor.valorTotal.toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de detalhes do pré-pedido */}
      {selectedPedido && (() => {
        const sp = selectedPedido;
        const itensArr = Array.isArray(sp.itens) ? sp.itens : [];
        const pesoCalc = itensArr.reduce((a, i) => a + (i.quantidade || 0), 0);
        const docOrigem = sp.documentoOrigem || sp.numero || sp.id;
        const dataDoc = sp.dataCotacao || sp.dataPedido;
        const obs = sp.observacao || sp.observacoes || '';
        const pesoTotal = sp.pesoTotalKg || pesoCalc;

        return (
          <Dialog open={!!selectedPedido} onOpenChange={() => setSelectedPedido(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {sp.id} - {docOrigem}
                  <Badge className="bg-orange-100 text-orange-800">
                    {(sp.statusFinanceiro || 'PREVISTO').toUpperCase()}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {obs}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Fornecedor</p>
                    <p className="font-medium">{sp.fornecedor}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-medium">{dataDoc ? new Date(dataDoc).toLocaleDateString('pt-BR') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Condição Pgto</p>
                    <p className="font-medium text-xs">{sp.condicaoPagamento || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Frete</p>
                    <p className="font-medium">{sp.frete || '—'}</p>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Qtd (kg)</TableHead>
                      <TableHead className="text-right">R$/kg</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensArr.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.item || idx + 1}</TableCell>
                        <TableCell className="text-xs">{item.descricao}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{item.material || item.categoria}</Badge></TableCell>
                        <TableCell className="text-right">{(item.quantidade || 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right">{(item.precoUnitario || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">R$ {(item.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {sp.icms ? `ICMS: ${sp.icms}%` : ''} {sp.ipi ? `| IPI: ${sp.ipi}%` : ''}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Peso: {pesoTotal.toLocaleString('pt-BR')} kg</p>
                    <p className="text-lg font-bold">R$ {(sp.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
