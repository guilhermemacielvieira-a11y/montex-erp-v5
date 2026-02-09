import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ShoppingBag,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  Search,
  Download,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Edit,
  Eye,
  Star,
  Activity,
  Briefcase,
  UserCheck,
  UserPlus,
  Percent,
  XCircle,
  Handshake
} from 'lucide-react';

// Mock data
const mockPedidosVenda = [
  { id: 'PV-001', cliente: 'Construtora Alfa', vendedor: 'Roberto Alves', data: '2024-01-15', valor: 125000, status: 'aprovado', projeto: 'Edifício Central', comissao: 3750, previsaoEntrega: '2024-03-15' },
  { id: 'PV-002', cliente: 'Arquitetura Beta', vendedor: 'Juliana Costa', data: '2024-01-14', valor: 45000, status: 'pendente', projeto: 'Casa Jardins', comissao: 1350, previsaoEntrega: '2024-02-28' },
  { id: 'PV-003', cliente: 'Incorporadora Gamma', vendedor: 'Roberto Alves', data: '2024-01-13', valor: 280000, status: 'em_producao', projeto: 'Complexo Comercial', comissao: 8400, previsaoEntrega: '2024-04-30' },
  { id: 'PV-004', cliente: 'Decorações Delta', vendedor: 'Amanda Silva', data: '2024-01-12', valor: 18500, status: 'entregue', projeto: 'Loja Premium', comissao: 555, previsaoEntrega: '2024-01-20' },
  { id: 'PV-005', cliente: 'Hotel Epsilon', vendedor: 'Juliana Costa', data: '2024-01-11', valor: 95000, status: 'cancelado', projeto: 'Reforma Lobby', comissao: 0, previsaoEntrega: '-' },
];

const mockClientes = [
  { id: 1, nome: 'Construtora Alfa', cnpj: '11.222.333/0001-44', contato: 'João Mendes', telefone: '(11) 3456-7890', email: 'joao@alfa.com', cidade: 'São Paulo', totalCompras: 580000, ultimaCompra: '2024-01-15', status: 'ativo', rating: 5 },
  { id: 2, nome: 'Arquitetura Beta', cnpj: '22.333.444/0001-55', contato: 'Maria Souza', telefone: '(11) 2345-6789', email: 'maria@beta.com', cidade: 'Campinas', totalCompras: 120000, ultimaCompra: '2024-01-14', status: 'ativo', rating: 4 },
  { id: 3, nome: 'Incorporadora Gamma', cnpj: '33.444.555/0001-66', contato: 'Pedro Lima', telefone: '(11) 4567-8901', email: 'pedro@gamma.com', cidade: 'São Paulo', totalCompras: 950000, ultimaCompra: '2024-01-13', status: 'ativo', rating: 5 },
  { id: 4, nome: 'Decorações Delta', cnpj: '44.555.666/0001-77', contato: 'Ana Clara', telefone: '(11) 5678-9012', email: 'ana@delta.com', cidade: 'Santos', totalCompras: 45000, ultimaCompra: '2024-01-12', status: 'ativo', rating: 3 },
  { id: 5, nome: 'Hotel Epsilon', cnpj: '55.666.777/0001-88', contato: 'Carlos Reis', telefone: '(11) 6789-0123', email: 'carlos@epsilon.com', cidade: 'Guarulhos', totalCompras: 180000, ultimaCompra: '2023-12-20', status: 'inativo', rating: 4 },
];

const mockVendedores = [
  { id: 1, nome: 'Roberto Alves', meta: 500000, realizado: 405000, clientes: 15, pedidos: 28, comissaoTotal: 12150, avatar: null },
  { id: 2, nome: 'Juliana Costa', meta: 400000, realizado: 320000, clientes: 12, pedidos: 22, comissaoTotal: 9600, avatar: null },
  { id: 3, nome: 'Amanda Silva', meta: 350000, realizado: 285000, clientes: 18, pedidos: 35, comissaoTotal: 8550, avatar: null },
  { id: 4, nome: 'Fernando Santos', meta: 300000, realizado: 198000, clientes: 10, pedidos: 15, comissaoTotal: 5940, avatar: null },
];

const mockOportunidades = [
  { id: 1, titulo: 'Fachada Prédio Comercial', cliente: 'Nova Construtora', valor: 350000, probabilidade: 80, etapa: 'proposta', vendedor: 'Roberto Alves', previsaoFechamento: '2024-02-15' },
  { id: 2, titulo: 'Mobiliário Escritório', cliente: 'Tech Solutions', valor: 85000, probabilidade: 60, etapa: 'negociacao', vendedor: 'Juliana Costa', previsaoFechamento: '2024-02-28' },
  { id: 3, titulo: 'Reforma Hotel', cliente: 'Grand Hotel', valor: 220000, probabilidade: 40, etapa: 'qualificacao', vendedor: 'Amanda Silva', previsaoFechamento: '2024-03-30' },
  { id: 4, titulo: 'Divisórias Escritório', cliente: 'Startup Inc', valor: 45000, probabilidade: 90, etapa: 'fechamento', vendedor: 'Fernando Santos', previsaoFechamento: '2024-01-25' },
];

const statusConfig = {
  aprovado: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  em_producao: { label: 'Em Produção', color: 'bg-blue-100 text-blue-800', icon: Activity },
  entregue: { label: 'Entregue', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
  ativo: { label: 'Ativo', color: 'bg-green-100 text-green-800' },
  inativo: { label: 'Inativo', color: 'bg-gray-100 text-gray-800' },
  prospecto: { label: 'Prospecto', color: 'bg-blue-100 text-blue-800' },
  qualificacao: { label: 'Qualificação', color: 'bg-purple-100 text-purple-800' },
  proposta: { label: 'Proposta', color: 'bg-yellow-100 text-yellow-800' },
  negociacao: { label: 'Negociação', color: 'bg-orange-100 text-orange-800' },
  fechamento: { label: 'Fechamento', color: 'bg-green-100 text-green-800' },
};

const etapasPipeline = [
  { id: 'prospecto', nome: 'Prospecção', icon: UserPlus },
  { id: 'qualificacao', nome: 'Qualificação', icon: UserCheck },
  { id: 'proposta', nome: 'Proposta', icon: FileText },
  { id: 'negociacao', nome: 'Negociação', icon: Handshake },
  { id: 'fechamento', nome: 'Fechamento', icon: CheckCircle },
];

function KPICard({ title, value, subtitle, icon: Icon, trend, trendUp, highlight }) {
  return (
    <Card className={`hover:shadow-lg transition-shadow ${highlight ? 'border-primary bg-primary/5' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`h-12 w-12 rounded-full ${highlight ? 'bg-primary/20' : 'bg-primary/10'} flex items-center justify-center`}>
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
  return <Badge className={config.color}>{config.label}</Badge>;
}

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function RatingStars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

function NovoPedidoDialog({ onSave, clientes, vendedores }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    cliente: '',
    vendedor: '',
    projeto: '',
    valor: '',
    comissao: '3',
    previsaoEntrega: '',
    descricao: '',
    condicoes: ''
  });

  const handleSave = () => {
    if (!formData.cliente || !formData.vendedor || !formData.valor || !formData.previsaoEntrega) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const cliente = clientes.find(c => c.id.toString() === formData.cliente);
    const vendedor = vendedores.find(v => v.id.toString() === formData.vendedor);
    const valor = parseInt(formData.valor) || 0;
    const comissaoPercent = (parseInt(formData.comissao) || 3) / 100;

    const novoPedido = {
      id: `PV-${String(Date.now()).slice(-3)}`,
      cliente: cliente?.nome || formData.cliente,
      vendedor: vendedor?.nome || formData.vendedor,
      data: new Date().toISOString().split('T')[0],
      valor: valor,
      status: 'pendente',
      projeto: formData.projeto,
      comissao: Math.round(valor * comissaoPercent),
      previsaoEntrega: formData.previsaoEntrega
    };

    onSave(novoPedido);
    setFormData({
      cliente: '',
      vendedor: '',
      projeto: '',
      valor: '',
      comissao: '3',
      previsaoEntrega: '',
      descricao: '',
      condicoes: ''
    });
    setOpen(false);
    toast.success('Pedido de venda criado com sucesso!');
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
          <DialogTitle>Novo Pedido de Venda</DialogTitle>
          <DialogDescription>
            Crie um novo pedido de venda para um cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_venda">Cliente</Label>
              <Select value={formData.cliente} onValueChange={(value) => setFormData({...formData, cliente: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.filter(c => c.status === 'ativo').map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendedor_venda">Vendedor</Label>
              <Select value={formData.vendedor} onValueChange={(value) => setFormData({...formData, vendedor: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map(v => (
                    <SelectItem key={v.id} value={v.id.toString()}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="projeto_nome">Nome do Projeto</Label>
            <Input id="projeto_nome" placeholder="Ex: Fachada Edifício Central" value={formData.projeto} onChange={(e) => setFormData({...formData, projeto: e.target.value})} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor_venda">Valor Total (R$)</Label>
              <Input type="number" id="valor_venda" placeholder="0,00" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comissao_perc">Comissão (%)</Label>
              <Input type="number" id="comissao_perc" placeholder="3" value={formData.comissao} onChange={(e) => setFormData({...formData, comissao: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="previsao_entrega">Previsão de Entrega</Label>
              <Input type="date" id="previsao_entrega" value={formData.previsaoEntrega} onChange={(e) => setFormData({...formData, previsaoEntrega: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao_venda">Descrição</Label>
            <Textarea id="descricao_venda" placeholder="Descreva os itens e especificações..." rows={3} value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="condicoes">Condições de Pagamento</Label>
            <Select value={formData.condicoes} onValueChange={(value) => setFormData({...formData, condicoes: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avista">À Vista</SelectItem>
                <SelectItem value="30-60-90">30/60/90 dias</SelectItem>
                <SelectItem value="entrada-entrega">50% Entrada + 50% Entrega</SelectItem>
                <SelectItem value="parcelado">Parcelado</SelectItem>
              </SelectContent>
            </Select>
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

function NovoClienteDialog({ onSave, vendedores }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    contato: '',
    cargo: '',
    telefone: '',
    email: '',
    cidade: '',
    estado: '',
    segmento: '',
    vendedor: ''
  });

  const handleSave = () => {
    if (!formData.nome || !formData.cnpj || !formData.email) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const novoCliente = {
      id: Date.now(),
      nome: formData.nome,
      cnpj: formData.cnpj,
      contato: formData.contato,
      telefone: formData.telefone,
      email: formData.email,
      cidade: formData.cidade,
      totalCompras: 0,
      ultimaCompra: new Date().toISOString().split('T')[0],
      status: 'ativo',
      rating: 4
    };

    onSave(novoCliente);
    setFormData({
      nome: '',
      cnpj: '',
      contato: '',
      cargo: '',
      telefone: '',
      email: '',
      cidade: '',
      estado: '',
      segmento: '',
      vendedor: ''
    });
    setOpen(false);
    toast.success('Cliente cadastrado com sucesso!');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserPlus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cadastrar Cliente</DialogTitle>
          <DialogDescription>
            Adicione um novo cliente ao CRM.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_cliente">Razão Social</Label>
              <Input id="nome_cliente" placeholder="Nome da empresa" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj_cliente">CNPJ</Label>
              <Input id="cnpj_cliente" placeholder="00.000.000/0000-00" value={formData.cnpj} onChange={(e) => setFormData({...formData, cnpj: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contato_cliente">Nome do Contato</Label>
              <Input id="contato_cliente" placeholder="Nome do contato principal" value={formData.contato} onChange={(e) => setFormData({...formData, contato: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo_contato">Cargo</Label>
              <Input id="cargo_contato" placeholder="Cargo do contato" value={formData.cargo} onChange={(e) => setFormData({...formData, cargo: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone_cliente">Telefone</Label>
              <Input id="telefone_cliente" placeholder="(00) 0000-0000" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email_cliente">E-mail</Label>
              <Input type="email" id="email_cliente" placeholder="contato@empresa.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade_cliente">Cidade</Label>
              <Input id="cidade_cliente" placeholder="Cidade" value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado_cliente">Estado</Label>
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
              <Label htmlFor="segmento">Segmento</Label>
              <Select value={formData.segmento} onValueChange={(value) => setFormData({...formData, segmento: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="construcao">Construção Civil</SelectItem>
                  <SelectItem value="arquitetura">Arquitetura</SelectItem>
                  <SelectItem value="decoracao">Decoração</SelectItem>
                  <SelectItem value="hotelaria">Hotelaria</SelectItem>
                  <SelectItem value="comercio">Comércio</SelectItem>
                  <SelectItem value="industria">Indústria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendedor_responsavel">Vendedor Responsável</Label>
            <Select value={formData.vendedor} onValueChange={(value) => setFormData({...formData, vendedor: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map(v => (
                  <SelectItem key={v.id} value={v.id.toString()}>{v.nome}</SelectItem>
                ))}
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

function NovaOportunidadeDialog({ onSave, vendedores }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    cliente: '',
    valor: '',
    etapa: '',
    probabilidade: '',
    vendedor: '',
    previsaoFechamento: '',
    observacao: ''
  });

  const handleSave = () => {
    if (!formData.titulo || !formData.cliente || !formData.valor || !formData.etapa || !formData.vendedor) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const vendedor = vendedores.find(v => v.id.toString() === formData.vendedor);
    const novaOportunidade = {
      id: Date.now(),
      titulo: formData.titulo,
      cliente: formData.cliente,
      valor: parseInt(formData.valor) || 0,
      probabilidade: parseInt(formData.probabilidade) || 50,
      etapa: formData.etapa,
      vendedor: vendedor?.nome || formData.vendedor,
      previsaoFechamento: formData.previsaoFechamento || new Date().toISOString().split('T')[0]
    };

    onSave(novaOportunidade);
    setFormData({
      titulo: '',
      cliente: '',
      valor: '',
      etapa: '',
      probabilidade: '',
      vendedor: '',
      previsaoFechamento: '',
      observacao: ''
    });
    setOpen(false);
    toast.success('Oportunidade criada com sucesso!');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Target className="h-4 w-4" />
          Nova Oportunidade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Oportunidade</DialogTitle>
          <DialogDescription>
            Registre uma nova oportunidade de negócio no pipeline.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="titulo_op">Título</Label>
            <Input id="titulo_op" placeholder="Ex: Fachada Prédio Comercial" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_op">Cliente</Label>
              <Input id="cliente_op" placeholder="Nome do cliente/prospect" value={formData.cliente} onChange={(e) => setFormData({...formData, cliente: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor_op">Valor Estimado (R$)</Label>
              <Input type="number" id="valor_op" placeholder="0,00" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="etapa_op">Etapa</Label>
              <Select value={formData.etapa} onValueChange={(value) => setFormData({...formData, etapa: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {etapasPipeline.map(etapa => (
                    <SelectItem key={etapa.id} value={etapa.id}>{etapa.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="probabilidade_op">Probabilidade (%)</Label>
              <Input type="number" id="probabilidade_op" placeholder="50" max="100" value={formData.probabilidade} onChange={(e) => setFormData({...formData, probabilidade: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendedor_op">Vendedor</Label>
              <Select value={formData.vendedor} onValueChange={(value) => setFormData({...formData, vendedor: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map(v => (
                    <SelectItem key={v.id} value={v.id.toString()}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="previsao_fechamento">Previsão de Fechamento</Label>
              <Input type="date" id="previsao_fechamento" value={formData.previsaoFechamento} onChange={(e) => setFormData({...formData, previsaoFechamento: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacao_op">Observações</Label>
            <Textarea id="observacao_op" placeholder="Detalhes sobre a oportunidade..." value={formData.observacao} onChange={(e) => setFormData({...formData, observacao: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Criar Oportunidade</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VendasPage() {
  const [pedidos, setPedidos] = useState(mockPedidosVenda);
  const [clientes, setClientes] = useState(mockClientes);
  const [oportunidades, setOportunidades] = useState(mockOportunidades);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [activeTab, setActiveTab] = useState('pedidos');

  const filteredPedidos = pedidos.filter(pedido => {
    const matchesSearch = pedido.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pedido.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || pedido.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalVendas = pedidos.filter(p => p.status !== 'cancelado').reduce((acc, p) => acc + p.valor, 0);
  const totalComissoes = pedidos.filter(p => p.status !== 'cancelado').reduce((acc, p) => acc + p.comissao, 0);
  const metaTotal = mockVendedores.reduce((acc, v) => acc + v.meta, 0);
  const realizadoTotal = mockVendedores.reduce((acc, v) => acc + v.realizado, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendas</h1>
          <p className="text-muted-foreground">
            Gestão de pedidos, clientes, vendedores e pipeline comercial
          </p>
        </div>
        <div className="flex gap-2">
          <NovaOportunidadeDialog onSave={(op) => setOportunidades([...oportunidades, op])} vendedores={mockVendedores} />
          <NovoClienteDialog onSave={(cliente) => setClientes([...clientes, cliente])} vendedores={mockVendedores} />
          <NovoPedidoDialog onSave={(pedido) => setPedidos([...pedidos, pedido])} clientes={clientes} vendedores={mockVendedores} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Vendas do Mês"
          value={`R$ ${totalVendas.toLocaleString('pt-BR')}`}
          subtitle={`${pedidos.filter(p => p.status !== 'cancelado').length} pedidos`}
          icon={DollarSign}
          trend="+18.5%"
          trendUp={true}
          highlight
        />
        <KPICard
          title="Meta vs Realizado"
          value={`${Math.round((realizadoTotal/metaTotal) * 100)}%`}
          subtitle={`R$ ${realizadoTotal.toLocaleString('pt-BR')} de R$ ${metaTotal.toLocaleString('pt-BR')}`}
          icon={Target}
        />
        <KPICard
          title="Comissões"
          value={`R$ ${totalComissoes.toLocaleString('pt-BR')}`}
          subtitle="A pagar este mês"
          icon={Percent}
          trend="+12%"
          trendUp={true}
        />
        <KPICard
          title="Pipeline"
          value={`R$ ${oportunidades.reduce((acc, o) => acc + o.valor, 0).toLocaleString('pt-BR')}`}
          subtitle={`${oportunidades.length} oportunidades`}
          icon={TrendingUp}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="pedidos" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="vendedores" className="gap-2">
            <Briefcase className="h-4 w-4" />
            Vendedores
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2">
            <Target className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
        </TabsList>

        {/* Pedidos de Venda */}
        <TabsContent value="pedidos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Pedidos de Venda</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar pedido..."
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
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="em_producao">Em Produção</SelectItem>
                      <SelectItem value="entregue">Entregue</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
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
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPedidos.map((pedido) => (
                    <TableRow key={pedido.id}>
                      <TableCell className="font-medium">{pedido.id}</TableCell>
                      <TableCell>{pedido.cliente}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{pedido.projeto}</TableCell>
                      <TableCell>{pedido.vendedor}</TableCell>
                      <TableCell className="font-semibold">R$ {pedido.valor.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-green-600">R$ {pedido.comissao.toLocaleString('pt-BR')}</TableCell>
                      <TableCell><StatusBadge status={pedido.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toast.success(`Visualizando pedido ${pedido.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => toast.success(`Editando pedido ${pedido.id}`)}>
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
        </TabsContent>

        {/* Clientes (CRM) */}
        <TabsContent value="clientes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Base de Clientes</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar cliente..." className="pl-8 w-[250px]" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {clientes.map((cliente) => (
                  <Card key={cliente.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{cliente.nome}</h4>
                            <StatusBadge status={cliente.status} />
                          </div>
                          <p className="text-sm text-muted-foreground">{cliente.cnpj}</p>
                          <RatingStars rating={cliente.rating} />
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toast.success(`Visualizando cliente ${cliente.nome}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => toast.success(`Editando cliente ${cliente.nome}`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {cliente.contato}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {cliente.telefone}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {cliente.cidade}
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t flex justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Total em Compras</p>
                          <p className="font-semibold">R$ {cliente.totalCompras.toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Última Compra</p>
                          <p className="font-semibold">{new Date(cliente.ultimaCompra).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendedores */}
        <TabsContent value="vendedores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance dos Vendedores</CardTitle>
              <CardDescription>Acompanhamento de metas e comissões</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {mockVendedores.map((vendedor) => {
                  const percentual = (vendedor.realizado / vendedor.meta) * 100;
                  return (
                    <Card key={vendedor.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={vendedor.avatar} />
                            <AvatarFallback>{getInitials(vendedor.nome)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{vendedor.nome}</h4>
                              <Badge className={percentual >= 100 ? 'bg-green-100 text-green-800' : percentual >= 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                                {percentual.toFixed(0)}% da meta
                              </Badge>
                            </div>
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Meta: R$ {vendedor.meta.toLocaleString('pt-BR')}</span>
                                <span className="font-medium">R$ {vendedor.realizado.toLocaleString('pt-BR')}</span>
                              </div>
                              <Progress value={Math.min(percentual, 100)} className="h-2" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-xs text-muted-foreground">Clientes</p>
                            <p className="font-semibold text-lg">{vendedor.clientes}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Pedidos</p>
                            <p className="font-semibold text-lg">{vendedor.pedidos}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Comissão</p>
                            <p className="font-semibold text-lg text-green-600">R$ {vendedor.comissaoTotal.toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pipeline */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid gap-4">
            {/* Etapas do Pipeline */}
            <div className="grid grid-cols-5 gap-4">
              {etapasPipeline.map((etapa) => {
                const oportunidadesEtapa = oportunidades.filter(o => o.etapa === etapa.id);
                const valorEtapa = oportunidadesEtapa.reduce((acc, o) => acc + o.valor, 0);
                const Icon = etapa.icon;

                return (
                  <Card key={etapa.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm">{etapa.nome}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{oportunidadesEtapa.length}</div>
                      <p className="text-xs text-muted-foreground">R$ {valorEtapa.toLocaleString('pt-BR')}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Lista de Oportunidades */}
            <Card>
              <CardHeader>
                <CardTitle>Oportunidades em Andamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {oportunidades.map((op) => (
                    <Card key={op.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold">{op.titulo}</h4>
                            <p className="text-sm text-muted-foreground">{op.cliente}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg">R$ {op.valor.toLocaleString('pt-BR')}</p>
                            <StatusBadge status={op.etapa} />
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {op.vendedor}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(op.previsaoFechamento).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${op.probabilidade >= 70 ? 'bg-green-500' : op.probabilidade >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                  style={{ width: `${op.probabilidade}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">{op.probabilidade}%</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => toast.success(`Visualizando oportunidade ${op.titulo}`)}>Ver Detalhes</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
