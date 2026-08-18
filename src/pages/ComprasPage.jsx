import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Weight,
  Receipt,
  PackageCheck,
  Sparkles,
  Link2,
  TrendingDown,
  History,
  Bell
} from 'lucide-react';

import { useCompras, useMateriais, useERP, useObras, useLancamentos } from '@/contexts/ERPContext';
import { fornecedoresApi } from '@/api/supabaseClient';
import AbastecimentoAutomatico from '@/components/compras/AbastecimentoAutomatico';
import ReposicaoEstoque from '@/components/compras/ReposicaoEstoque';
import {
  processarNF,
  categorizarNF,
  nfTemLancamento,
  nfTemMateriais,
  construirHistoricoPrecos,
  buscarPrecosSimilares,
  itemQtd,
  itemValorUnit,
  itemValorTotal,
  itemUnidade,
} from '@/services/nfPipeline';

// Fallback local (usado apenas se a tabela `fornecedores` ainda não existir
// no Supabase — ver supabase/migration_v16_suprimentos.sql)
const fornecedoresBase = [
  {
    id: 'FOR-GERDAU',
    nome: 'Gerdau Aços Longos S.A.',
    cnpj: '07.358.761/0001-69',
    cidade: 'Ouro Branco',
    estado: 'MG',
    telefone: '(31) 9988-305655',
    email: 'eduardo.acosgrdau@gmail.com',
    contato: 'Eduardo Bruno da Purificação',
    rating: 4.9,
    categorias: ['Perfis W', 'Chapas', 'Barras', 'Cantoneiras']
  }
];

const statusConfig = {
  cotacao: { label: 'Cotação', color: 'bg-purple-100 text-purple-800', icon: FileText },
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

const statusFinanceiroConfig = {
  previsto: { label: 'PREVISTO', color: 'bg-orange-100 text-orange-800' },
  lancado: { label: 'LANÇADO', color: 'bg-blue-100 text-blue-800' },
  pago: { label: 'PAGO', color: 'bg-green-100 text-green-800' },
};

const fmtData = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
};

const fmtMoeda = (v) => `R$ ${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

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

// Valor especial do select de destino: despesa geral da empresa (obra_id NULL,
// mesma convenção do Financeiro Fábrica — ver DespesasPage/FinanceiroPage)
const DESTINO_MONTEX = '__montex__';

// Painel de inteligência de preços (dados extraídos das NFs reais)
function PainelHistoricoPrecos({ similares, fornecedorInfo, fornecedorNome }) {
  if ((!similares || similares.length === 0) && !fornecedorInfo) return null;
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
      <p className="text-xs font-semibold text-blue-900 flex items-center gap-1">
        <History className="h-3 w-3" />
        Histórico real (extraído das NFs)
      </p>
      {fornecedorInfo && (
        <p className="text-xs text-blue-800">
          <strong>{fornecedorNome}</strong>: {fornecedorInfo.nfs} NF(s) ·
          total {fmtMoeda(fornecedorInfo.valorTotal)}
          {fornecedorInfo.ultimaData ? ` · última em ${fmtData(fornecedorInfo.ultimaData)}` : ''}
        </p>
      )}
      {similares && similares.map((s, i) => {
        const economia = s.maisRecente.valorUnit > 0 && s.menorValor > 0 && s.menorValor < s.maisRecente.valorUnit;
        return (
          <div key={i} className="text-xs text-blue-800 flex items-start gap-1">
            {economia ? <TrendingDown className="h-3 w-3 mt-0.5 text-green-600 shrink-0" /> : <span className="w-3 shrink-0" />}
            <span>
              <strong className="truncate">{s.maisRecente.descricao}</strong>:
              {' '}último {fmtMoeda(s.maisRecente.valorUnit)}/{s.maisRecente.unidade.toLowerCase()}
              {' '}({s.maisRecente.fornecedor || 'NF ' + s.maisRecente.nf}, {fmtData(s.maisRecente.data)})
              {s.ocorrencias > 1 && ` · ${s.ocorrencias} compras, média ${fmtMoeda(s.media)}`}
              {economia && <span className="text-green-700"> · menor já pago: {fmtMoeda(s.menorValor)}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function NovoPedidoDialog({ onSave, fornecedores = [], obras = [], obraAtual, escopo, historicoPrecos }) {
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({
    fornecedor: '',
    prazo: '',
    descricao: '',
    valorPrevisto: '',
    obraId: '',
    urgencia: 'normal'
  });

  // Pré-selecionar destino conforme o escopo ativo da página
  useEffect(() => {
    if (open) {
      setFormData(f => ({
        ...f,
        obraId: escopo === 'montex' ? DESTINO_MONTEX : (obraAtual ? String(obraAtual) : '')
      }));
    }
  }, [open, escopo, obraAtual]);

  // ALERTA: histórico real do fornecedor + materiais similares à descrição
  const fornecedorNomeSel = fornecedores.find(f => String(f.id) === formData.fornecedor)?.nome || '';
  const fornecedorInfo = useMemo(
    () => (fornecedorNomeSel && historicoPrecos?.porFornecedor?.get(fornecedorNomeSel)) || null,
    [fornecedorNomeSel, historicoPrecos]
  );
  const similares = useMemo(
    () => (formData.descricao && formData.descricao.length >= 4)
      ? buscarPrecosSimilares(historicoPrecos, formData.descricao, 3)
      : [],
    [formData.descricao, historicoPrecos]
  );

  const handleSave = async () => {
    if (!formData.fornecedor || !formData.prazo) {
      toast.error('Preencha fornecedor e prazo de entrega');
      return;
    }

    const fornecedorNome = fornecedores.find(f => String(f.id) === formData.fornecedor)?.nome || formData.fornecedor;
    const hoje = new Date().toISOString().split('T')[0];
    const obraDestino = formData.obraId === DESTINO_MONTEX
      ? null
      : (formData.obraId || obraAtual || null);

    const novaCompra = {
      id: `CMP-${Date.now()}`,
      descricao: formData.descricao || `Pedido de compra — ${fornecedorNome}`,
      fornecedor: fornecedorNome,
      status: 'pendente',
      statusFinanceiro: 'previsto',
      tipo: 'pre_pedido',
      urgencia: formData.urgencia,
      dataPedido: hoje,
      dataPrevisao: formData.prazo,
      valorPrevisto: parseFloat(formData.valorPrevisto) || 0,
      valorTotal: parseFloat(formData.valorPrevisto) || 0,
      obraId: obraDestino,
      itens: [],
      observacoes: formData.descricao || ''
    };

    setSalvando(true);
    try {
      await onSave(novaCompra);
      setFormData({ fornecedor: '', prazo: '', descricao: '', valorPrevisto: '', obraId: '', urgencia: 'normal' });
      setOpen(false);
      toast.success('Pedido criado e salvo!');
    } catch {
      // addCompra já exibe toast de erro
    } finally {
      setSalvando(false);
    }
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
            O pedido é salvo no banco e entra como valor PREVISTO (sem lançamento financeiro real).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fornecedor">Fornecedor *</Label>
              <Select value={formData.fornecedor} onValueChange={(value) => setFormData({...formData, fornecedor: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo de Entrega *</Label>
              <Input type="date" id="prazo" value={formData.prazo} onChange={(e) => setFormData({...formData, prazo: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea id="descricao" placeholder="Descreva os itens do pedido..." value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})} />
          </div>
          <PainelHistoricoPrecos
            similares={similares}
            fornecedorInfo={fornecedorInfo}
            fornecedorNome={fornecedorNomeSel}
          />
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valorPrevisto">Valor Previsto (R$)</Label>
              <Input type="number" min="0" step="0.01" id="valorPrevisto" placeholder="0,00" value={formData.valorPrevisto} onChange={(e) => setFormData({...formData, valorPrevisto: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obra">Destino</Label>
              <Select value={formData.obraId} onValueChange={(value) => setFormData({...formData, obraId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Obra ou MONTEX (Geral)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DESTINO_MONTEX}>🏭 MONTEX — Geral (Empresa)</SelectItem>
                  {obras.map(o => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.nome}</SelectItem>
                  ))}
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
          <Button onClick={handleSave} disabled={salvando}>{salvando ? 'Salvando...' : 'Criar Pedido'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NovaCotacaoDialog({ onSave, obras = [], obraAtual, escopo, historicoPrecos }) {
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    especificacoes: '',
    quantidade: '',
    unidade: 'kg',
    prazo: '',
    fornecedor: '',
    obraId: ''
  });

  useEffect(() => {
    if (open) {
      setFormData(f => ({
        ...f,
        obraId: escopo === 'montex' ? DESTINO_MONTEX : (obraAtual ? String(obraAtual) : '')
      }));
    }
  }, [open, escopo, obraAtual]);

  // ALERTA: preços já pagos por materiais similares ao que está sendo cotado
  const similares = useMemo(
    () => (formData.titulo && formData.titulo.length >= 4)
      ? buscarPrecosSimilares(historicoPrecos, `${formData.titulo} ${formData.especificacoes}`, 4)
      : [],
    [formData.titulo, formData.especificacoes, historicoPrecos]
  );
  const fornecedorInfoCot = useMemo(
    () => (formData.fornecedor && historicoPrecos?.porFornecedor?.get(formData.fornecedor.trim())) || null,
    [formData.fornecedor, historicoPrecos]
  );

  const handleSave = async () => {
    if (!formData.titulo || !formData.prazo) {
      toast.error('Preencha título e prazo da cotação');
      return;
    }

    const obraDestino = formData.obraId === DESTINO_MONTEX
      ? null
      : (formData.obraId || obraAtual || null);

    const novaCotacao = {
      id: `COT-${Date.now()}`,
      descricao: formData.titulo,
      fornecedor: formData.fornecedor || '',
      status: 'cotacao',
      statusFinanceiro: 'previsto',
      tipo: 'cotacao',
      dataPedido: new Date().toISOString().split('T')[0],
      dataValidade: formData.prazo,
      dataPrevisao: formData.prazo,
      obraId: obraDestino,
      itens: formData.quantidade
        ? [{ descricao: formData.titulo, quantidade: parseFloat(formData.quantidade) || 0, unidade: formData.unidade }]
        : [],
      observacoes: formData.especificacoes || ''
    };

    setSalvando(true);
    try {
      await onSave(novaCotacao);
      setFormData({ titulo: '', especificacoes: '', quantidade: '', unidade: 'kg', prazo: '', fornecedor: '' });
      setOpen(false);
      toast.success('Cotação registrada!');
    } catch {
      // toast de erro já exibido pelo contexto
    } finally {
      setSalvando(false);
    }
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
            Registre uma solicitação de cotação. Ao receber os preços, ela pode ser convertida em pedido.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título da Cotação *</Label>
            <Input id="titulo" placeholder="Ex: Chapas de Aço Inox 304" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="especificacoes">Especificações Técnicas</Label>
            <Textarea id="especificacoes" placeholder="Detalhe as especificações dos materiais..." rows={4} value={formData.especificacoes} onChange={(e) => setFormData({...formData, especificacoes: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input type="number" min="0" id="quantidade" placeholder="0" value={formData.quantidade} onChange={(e) => setFormData({...formData, quantidade: e.target.value})} />
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
              <Label htmlFor="prazo_cotacao">Prazo para Respostas *</Label>
              <Input type="date" id="prazo_cotacao" value={formData.prazo} onChange={(e) => setFormData({...formData, prazo: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fornecedor_cotacao">Fornecedor (opcional)</Label>
              <Input id="fornecedor_cotacao" placeholder="Nome do fornecedor consultado" value={formData.fornecedor} onChange={(e) => setFormData({...formData, fornecedor: e.target.value})} />
            </div>
          </div>
          <PainelHistoricoPrecos
            similares={similares}
            fornecedorInfo={fornecedorInfoCot}
            fornecedorNome={formData.fornecedor}
          />
          <div className="space-y-2">
            <Label htmlFor="destino_cotacao">Destino</Label>
            <Select value={formData.obraId} onValueChange={(value) => setFormData({...formData, obraId: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Obra ou MONTEX (Geral)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DESTINO_MONTEX}>🏭 MONTEX — Geral (Empresa)</SelectItem>
                {obras.map(o => (
                  <SelectItem key={o.id} value={String(o.id)}>{o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={salvando} className="gap-2">
            <Send className="h-4 w-4" />
            {salvando ? 'Salvando...' : 'Registrar Cotação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FornecedorDialog({ onSave, fornecedor = null, open, onOpenChange, trigger }) {
  const isEdicao = !!fornecedor;
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({
    nome: '', cnpj: '', telefone: '', email: '', contato: '', cidade: '', estado: '', cep: '', categorias: ''
  });

  useEffect(() => {
    if (fornecedor) {
      setFormData({
        nome: fornecedor.nome || '',
        cnpj: fornecedor.cnpj || '',
        telefone: fornecedor.telefone || '',
        email: fornecedor.email || '',
        contato: fornecedor.contato || '',
        cidade: fornecedor.cidade || '',
        estado: fornecedor.estado || '',
        cep: fornecedor.cep || '',
        categorias: Array.isArray(fornecedor.categorias) ? fornecedor.categorias.join(', ') : (fornecedor.categorias || '')
      });
    }
  }, [fornecedor]);

  const handleSave = async () => {
    if (!formData.nome) {
      toast.error('Informe a razão social');
      return;
    }
    setSalvando(true);
    try {
      await onSave({
        ...(isEdicao ? { id: fornecedor.id } : {}),
        nome: formData.nome,
        cnpj: formData.cnpj,
        telefone: formData.telefone,
        email: formData.email,
        contato: formData.contato,
        cidade: formData.cidade,
        estado: formData.estado,
        cep: formData.cep,
        categorias: formData.categorias
          ? formData.categorias.split(',').map(c => c.trim()).filter(Boolean)
          : []
      });
      if (!isEdicao) {
        setFormData({ nome: '', cnpj: '', telefone: '', email: '', contato: '', cidade: '', estado: '', cep: '', categorias: '' });
      }
      onOpenChange(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdicao ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}</DialogTitle>
          <DialogDescription>
            {isEdicao ? 'Atualize os dados do fornecedor.' : 'Adicione um novo fornecedor ao sistema.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome_fornecedor">Razão Social *</Label>
              <Input id="nome_fornecedor" placeholder="Nome da empresa" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" placeholder="00.000.000/0000-00" value={formData.cnpj} onChange={(e) => setFormData({...formData, cnpj: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" placeholder="(00) 0000-0000" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input type="email" id="email" placeholder="contato@empresa.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contato">Contato</Label>
              <Input id="contato" placeholder="Nome do contato" value={formData.contato} onChange={(e) => setFormData({...formData, contato: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" placeholder="Cidade" value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Input id="estado" placeholder="UF" maxLength={2} value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value.toUpperCase()})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" placeholder="00000-000" value={formData.cep} onChange={(e) => setFormData({...formData, cep: e.target.value})} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="categorias">Categorias (separadas por vírgula)</Label>
            <Input id="categorias" placeholder="Ex: Perfis W, Chapas, Barras" value={formData.categorias} onChange={(e) => setFormData({...formData, categorias: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={salvando}>{salvando ? 'Salvando...' : (isEdicao ? 'Salvar' : 'Cadastrar')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ComprasPage() {
  // === DADOS DO SUPABASE VIA ERPCONTEXT ===
  const { compras: comprasContext, addCompra, updateCompra, receberCompra } = useCompras();
  const { materiaisEstoque, importarMateriais } = useMateriais();
  const { notasFiscais } = useERP();
  const { lancamentosDespesas, addLancamento } = useLancamentos();
  const { obras, obraAtual, obraAtualData } = useObras();

  // ===== HISTÓRICO DE PREÇOS (todas as NFs, todas as origens) =====
  // Base de dados p/ alertas em pedidos/cotações futuras
  const historicoPrecos = useMemo(
    () => construirHistoricoPrecos(notasFiscais),
    [notasFiscais]
  );

  // ===== ESCOPO: OBRA SELECIONADA × MONTEX (EMPRESA) × GERAL =====
  // Mesma convenção do financeiro do ERP (DespesasPage/FinanceiroPage):
  // obra_id NULL = despesa geral da empresa (MONTEX); obra_id = obra específica.
  const [escopo, setEscopo] = useState('obra'); // 'obra' | 'montex' | 'geral'

  const matchEscopo = useCallback((obraId) => {
    if (escopo === 'geral') return true;
    if (escopo === 'montex') return !obraId; // sem obra = MONTEX/empresa
    return obraId === obraAtual; // escopo 'obra'
  }, [escopo, obraAtual]);

  const obrasMap = useMemo(() => {
    const m = {};
    (obras || []).forEach(o => { m[o.id] = o.nome; });
    return m;
  }, [obras]);

  const nomeEscopoAtivo = escopo === 'montex'
    ? 'MONTEX (Geral)'
    : escopo === 'geral'
      ? 'Todas as origens'
      : (obraAtualData?.nome || obrasMap[obraAtual] || 'Obra atual');

  // ===== FORNECEDORES (tabela `fornecedores` + dados derivados do uso real) =====
  const [fornecedoresCadastrados, setFornecedoresCadastrados] = useState([]);
  const [tabelaFornecedoresOk, setTabelaFornecedoresOk] = useState(true);

  const carregarFornecedores = useCallback(async () => {
    try {
      const data = await fornecedoresApi.getAll();
      setFornecedoresCadastrados(data || []);
      setTabelaFornecedoresOk(true);
    } catch (err) {
      // Tabela ainda não criada (migration_v16) → fallback local
      console.warn('[Compras] Tabela fornecedores indisponível, usando base local:', err.message);
      setFornecedoresCadastrados(fornecedoresBase);
      setTabelaFornecedoresOk(false);
    }
  }, []);

  useEffect(() => { carregarFornecedores(); }, [carregarFornecedores]);

  // Normalizar compras (tolerante a variações de schema: valor_total / valor_previsto etc.)
  const comprasNormalizadas = useMemo(() => comprasContext.map(c => {
    const itensArr = Array.isArray(c.itens) ? c.itens : [];
    const pesoCalc = itensArr.reduce((acc, i) => acc + (i.quantidade || 0), 0);
    return {
      id: c.id,
      fornecedor: c.fornecedor || '',
      documento: c.documentoOrigem || c.numero || c.id,
      data: c.dataCotacao || c.dataPedido || c.createdAt || null,
      valor: c.valorTotal ?? c.valorPrevisto ?? c.valorReal ?? 0,
      pesoKg: c.pesoTotalKg || pesoCalc,
      status: c.status || 'pendente',
      statusFinanceiro: c.statusFinanceiro || 'previsto',
      numItens: itensArr.length,
      prazo: c.dataValidade || c.dataPrevisaoEntrega || c.dataPrevisao || null,
      observacao: c.observacao || c.observacoes || '',
      condicaoPagamento: c.condicaoPagamento || '',
      tipo: c.tipo || (c.status === 'cotacao' ? 'cotacao' : 'pre_pedido'),
      descricao: c.descricao || '',
      obraId: c.obraId || null,
      _original: c
    };
  }), [comprasContext]);

  // Aplicar ESCOPO (obra ativa / MONTEX / geral) a todas as fontes do módulo
  const comprasEscopo = useMemo(
    () => comprasNormalizadas.filter(c => matchEscopo(c.obraId)),
    [comprasNormalizadas, matchEscopo]
  );
  const materiaisEscopo = useMemo(
    () => (materiaisEstoque || []).filter(m => matchEscopo(m.obraId)),
    [materiaisEstoque, matchEscopo]
  );
  const nfsEscopo = useMemo(
    () => (notasFiscais || []).filter(nf => matchEscopo(nf.obraId)),
    [notasFiscais, matchEscopo]
  );

  // Separar fluxos: cotações vs pedidos
  const cotacoes = useMemo(
    () => comprasEscopo.filter(c => c.tipo === 'cotacao' || c.status === 'cotacao'),
    [comprasEscopo]
  );
  const pedidos = useMemo(
    () => comprasEscopo.filter(c => c.tipo !== 'cotacao' && c.status !== 'cotacao'),
    [comprasEscopo]
  );

  // Fornecedores consolidados: cadastro + estatísticas REAIS puxadas de
  // compras, notas fiscais e pedidos de material (informação já existente no módulo)
  const fornecedores = useMemo(() => {
    const stats = new Map();
    const keyOf = (nome) => (nome || '').trim().toLowerCase();
    const touch = (nome) => {
      const k = keyOf(nome);
      if (!k) return null;
      if (!stats.has(k)) stats.set(k, { nome: nome.trim(), pedidos: 0, valorTotal: 0, nfs: 0, materiais: 0 });
      return stats.get(k);
    };

    // Estatísticas calculadas SOBRE O ESCOPO ativo (obra / MONTEX / geral) —
    // assim os valores por fornecedor refletem a obra selecionada ou a empresa
    comprasEscopo.forEach(c => {
      const s = touch(c.fornecedor);
      if (s) { s.pedidos += 1; s.valorTotal += c.valor || 0; }
    });
    nfsEscopo.forEach(nf => {
      const s = touch(nf.fornecedor);
      if (s) { s.nfs += 1; s.valorTotal += nf.valorTotal || nf.valor || 0; }
    });
    materiaisEscopo.forEach(m => {
      const s = touch(m.fornecedor);
      if (s) { s.materiais += 1; }
    });

    const cadastrados = fornecedoresCadastrados.map(f => {
      const s = stats.get(keyOf(f.nome)) || { pedidos: 0, valorTotal: 0, nfs: 0, materiais: 0 };
      stats.delete(keyOf(f.nome));
      return { ...f, ...s, nome: f.nome, cadastrado: true };
    });

    // Fornecedores que aparecem nos dados mas não têm cadastro formal
    const derivados = [...stats.values()].map(s => ({
      id: `derivado-${keyOf(s.nome)}`,
      nome: s.nome,
      cadastrado: false,
      ...s
    }));

    // No escopo 'geral' mostra todo o cadastro; nos escopos obra/MONTEX,
    // cadastrados sem movimento no escopo ficam ocultos para a análise focar
    // em quem realmente forneceu naquele contexto (cadastro segue íntegro).
    const lista = [...cadastrados, ...derivados];
    const filtrada = escopo === 'geral'
      ? lista
      : lista.filter(f => (f.pedidos || 0) + (f.nfs || 0) + (f.materiais || 0) > 0);
    return filtrada.sort((a, b) => (b.valorTotal || 0) - (a.valorTotal || 0));
  }, [fornecedoresCadastrados, comprasEscopo, nfsEscopo, materiaisEscopo, escopo]);

  // ===== ESTADO DE UI =====
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermMat, setSearchTermMat] = useState('');
  const [searchTermForn, setSearchTermForn] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [activeTab, setActiveTab] = useState('pedidos');
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [fornecedorEditando, setFornecedorEditando] = useState(null);
  const [dialogNovoFornecedor, setDialogNovoFornecedor] = useState(false);
  const [recebendoId, setRecebendoId] = useState(null);

  const filteredPedidos = useMemo(() => pedidos.filter(pedido => {
    const t = searchTerm.toLowerCase();
    const matchesSearch = (pedido.fornecedor || '').toLowerCase().includes(t) ||
                         String(pedido.id || '').toLowerCase().includes(t) ||
                         String(pedido.documento || '').toLowerCase().includes(t) ||
                         (pedido.descricao || '').toLowerCase().includes(t);
    const matchesStatus = statusFilter === 'todos' || pedido.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [pedidos, searchTerm, statusFilter]);

  const filteredFornecedores = useMemo(() => {
    if (!searchTermForn) return fornecedores;
    const t = searchTermForn.toLowerCase();
    return fornecedores.filter(f =>
      (f.nome || '').toLowerCase().includes(t) ||
      (f.cnpj || '').toLowerCase().includes(t) ||
      (f.cidade || '').toLowerCase().includes(t)
    );
  }, [fornecedores, searchTermForn]);

  // Filtrar materiais (já restritos ao escopo ativo)
  const filteredMateriais = useMemo(() => {
    if (!searchTermMat) return materiaisEscopo;
    const term = searchTermMat.toLowerCase();
    return materiaisEscopo.filter(m =>
      (m.codigo || '').toLowerCase().includes(term) ||
      (m.descricao || '').toLowerCase().includes(term) ||
      (m.notaFiscal || '').toLowerCase().includes(term) ||
      (m.fornecedor || '').toLowerCase().includes(term)
    );
  }, [materiaisEscopo, searchTermMat]);

  // Estatísticas de materiais DO ESCOPO (antes vinham globais do contexto)
  // Fallbacks p/ colunas reais do banco: peso_previsto/peso_entregue
  const statsMateriais = useMemo(() => {
    const pesoPedido = materiaisEscopo.reduce((a, m) => a + (m.pesoPedido || m.pesoPrevisto || 0), 0);
    const pesoRecebido = materiaisEscopo.reduce((a, m) => a + (m.pesoRecebido || m.pesoEntregue || 0), 0);
    const pesoFalta = materiaisEscopo.reduce((a, m) => a + (m.pesoFalta || m.pesoFaltaEntregar || 0), 0);
    return { total: materiaisEscopo.length, pesoPedido, pesoRecebido, pesoFalta };
  }, [materiaisEscopo]);

  // ===== AÇÕES =====
  const handleSalvarFornecedor = async (dados) => {
    if (!tabelaFornecedoresOk) {
      toast.error('Tabela de fornecedores ainda não existe no banco. Rode a migration_v16_suprimentos.sql no Supabase.');
      throw new Error('tabela fornecedores ausente');
    }
    try {
      if (dados.id) {
        const { id, ...resto } = dados;
        await fornecedoresApi.update(id, resto);
        toast.success('Fornecedor atualizado!');
      } else {
        await fornecedoresApi.create({ id: `FOR-${Date.now()}`, ...dados });
        toast.success('Fornecedor cadastrado!');
      }
      await carregarFornecedores();
    } catch (err) {
      toast.error(`Erro ao salvar fornecedor: ${err.message}`);
      throw err;
    }
  };

  const handleReceberPedido = async (pedido) => {
    if (!window.confirm(`Confirmar recebimento do pedido ${pedido.id}? Serão registradas movimentações de ENTRADA no estoque.`)) return;
    setRecebendoId(pedido.id);
    try {
      const itensArr = Array.isArray(pedido._original?.itens) ? pedido._original.itens : [];
      await receberCompra(pedido.id, itensArr);
      toast.success(`Pedido ${pedido.id} recebido!`);
    } catch (err) {
      toast.error(`Erro ao receber pedido: ${err.message}`);
    } finally {
      setRecebendoId(null);
    }
  };

  // ===== PIPELINE AUTOMÁTICO DE NF =====
  // NF → lançamento categorizado (categoria + centro de custo automáticos)
  //    → itens extraídos para a aba Materiais (pedidos_material)
  const [processandoNF, setProcessandoNF] = useState(null);

  const handleProcessarNF = async (nf) => {
    setProcessandoNF(nf.id);
    try {
      const r = await processarNF(nf, {
        lancamentos: lancamentosDespesas,
        materiais: materiaisEstoque,
        addLancamento,
        importarMateriais,
      });
      const partes = [];
      if (r.lancamentoCriado) partes.push(`lançamento "${r.categoria}" (${r.centroCusto})`);
      if (r.materiaisCriados > 0) partes.push(`${r.materiaisCriados} materiais`);
      toast.success(partes.length > 0
        ? `NF ${nf.numero} processada: ${partes.join(' + ')} criados`
        : `NF ${nf.numero} já estava vinculada`);
    } catch (err) {
      toast.error(`Erro ao processar NF ${nf.numero}: ${err.message}`);
    } finally {
      setProcessandoNF(null);
    }
  };

  const nfsPendentesProcessamento = useMemo(
    () => nfsEscopo.filter(nf =>
      !nfTemLancamento(nf, lancamentosDespesas) || !nfTemMateriais(nf, materiaisEstoque)
    ),
    [nfsEscopo, lancamentosDespesas, materiaisEstoque]
  );

  const handleProcessarTodas = async () => {
    if (nfsPendentesProcessamento.length === 0) return;
    if (!window.confirm(`Processar ${nfsPendentesProcessamento.length} NF(s): gerar lançamentos categorizados e abastecer a aba Materiais automaticamente?`)) return;
    setProcessandoNF('todas');
    let lanc = 0, mats = 0;
    try {
      for (const nf of nfsPendentesProcessamento) {
        const r = await processarNF(nf, {
          lancamentos: lancamentosDespesas,
          materiais: materiaisEstoque,
          addLancamento,
          importarMateriais,
        });
        if (r.lancamentoCriado) lanc += 1;
        mats += r.materiaisCriados;
      }
      toast.success(`Processamento concluído: ${lanc} lançamentos + ${mats} materiais criados`);
    } catch (err) {
      toast.error(`Erro no processamento em lote: ${err.message}`);
    } finally {
      setProcessandoNF(null);
    }
  };

  const handleEncerrarCotacao = async (cotacao) => {
    try {
      await updateCompra(cotacao.id, { status: 'finalizada' });
      toast.success('Cotação encerrada');
    } catch { /* toast já exibido */ }
  };

  const handleConverterCotacao = async (cotacao) => {
    try {
      await updateCompra(cotacao.id, { status: 'pendente', tipo: 'pre_pedido' });
      toast.success('Cotação convertida em pedido!');
      setActiveTab('pedidos');
    } catch { /* toast já exibido */ }
  };

  const handleExportarCSV = () => {
    const linhas = [
      ['ID', 'Documento', 'Fornecedor', 'Origem', 'Data', 'Itens', 'Peso (kg)', 'Valor Previsto', 'Status', 'Financeiro', 'Prazo'].join(';'),
      ...filteredPedidos.map(p => [
        p.id,
        p.documento,
        `"${(p.fornecedor || '').replace(/"/g, '""')}"`,
        `"${p.obraId ? (obrasMap[p.obraId] || p.obraId) : 'MONTEX'}"`,
        fmtData(p.data),
        p.numItens,
        String(p.pesoKg || 0).replace('.', ','),
        String(p.valor || 0).replace('.', ','),
        p.status,
        p.statusFinanceiro,
        fmtData(p.prazo)
      ].join(';'))
    ];
    const blob = new Blob(['﻿' + linhas.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pedidos_compra_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredPedidos.length} pedidos exportados`);
  };

  // ===== KPIs =====
  const totalPrevisto = pedidos.reduce((acc, p) => acc + (p.valor || 0), 0);
  const pedidosPrevistos = pedidos.filter(p => (p.statusFinanceiro || '') === 'previsto').length;
  const cotacoesAbertas = cotacoes.filter(c => c.status === 'cotacao' || c.status === 'aberta').length;

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
          <FornecedorDialog
            open={dialogNovoFornecedor}
            onOpenChange={setDialogNovoFornecedor}
            onSave={handleSalvarFornecedor}
            trigger={(
              <Button variant="outline" className="gap-2">
                <Building2 className="h-4 w-4" />
                Novo Fornecedor
              </Button>
            )}
          />
          <NovaCotacaoDialog onSave={addCompra} obras={obras || []} obraAtual={obraAtual} escopo={escopo} historicoPrecos={historicoPrecos} />
          <NovoPedidoDialog onSave={addCompra} fornecedores={fornecedores.filter(f => f.cadastrado !== false)} obras={obras || []} obraAtual={obraAtual} escopo={escopo} historicoPrecos={historicoPrecos} />
        </div>
      </div>

      {/* ===== FILTRO DE ESCOPO: OBRA × MONTEX × GERAL ===== */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-1">Origem:</span>
        <Button
          variant={escopo === 'obra' ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
          onClick={() => setEscopo('obra')}
        >
          <Building2 className="h-4 w-4" />
          {obraAtualData?.nome || obrasMap[obraAtual] || 'Obra atual'}
        </Button>
        <Button
          variant={escopo === 'montex' ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
          onClick={() => setEscopo('montex')}
        >
          🏭 MONTEX (Geral)
        </Button>
        <Button
          variant={escopo === 'geral' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEscopo('geral')}
        >
          Todas
        </Button>
        <span className="text-xs text-muted-foreground ml-2">
          {escopo === 'montex'
            ? 'Despesas e compras gerais da empresa — independentes de obra'
            : escopo === 'obra'
              ? 'Somente registros vinculados à obra selecionada no topo'
              : 'Todas as obras + MONTEX'}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Previsto (Pré-Pedidos)"
          value={fmtMoeda(totalPrevisto)}
          subtitle={`Previsto — ${nomeEscopoAtivo}`}
          icon={DollarSign}
        />
        <KPICard
          title="Pré-Pedidos"
          value={pedidosPrevistos}
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
          title="Cotações Abertas"
          value={cotacoesAbertas}
          subtitle={`${fornecedores.length} fornecedores`}
          icon={FileText}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 lg:w-[940px]">
          <TabsTrigger value="abastecimento" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Abastecimento
          </TabsTrigger>
          <TabsTrigger value="reposicao" className="gap-2">
            <Bell className="h-4 w-4" />
            Reposição
          </TabsTrigger>
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

        {/* Abastecimento automático (pedido futuro) */}
        <TabsContent value="abastecimento" className="space-y-4">
          <AbastecimentoAutomatico
            obras={obras}
            obraAtual={obraAtual}
            notasFiscais={notasFiscais}
            addCompra={addCompra}
            onGerado={() => setActiveTab('pedidos')}
          />
        </TabsContent>

        {/* Reposição de estoque (ponto de compra proativo) */}
        <TabsContent value="reposicao" className="space-y-4">
          <ReposicaoEstoque
            addCompra={addCompra}
            onGerado={() => setActiveTab('pedidos')}
          />
        </TabsContent>

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
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="cotacao_recebida">Cotação Recebida</SelectItem>
                      <SelectItem value="ordem_confirmada">Ordem Confirmada</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="em_transito">Em Trânsito</SelectItem>
                      <SelectItem value="entregue">Entregue</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={handleExportarCSV} title="Exportar CSV">
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
                    <TableHead>Origem</TableHead>
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
                  {filteredPedidos.map((pedido) => {
                    const finConfig = statusFinanceiroConfig[pedido.statusFinanceiro] || statusFinanceiroConfig.previsto;
                    return (
                      <TableRow key={pedido.id}>
                        <TableCell className="font-medium">{pedido.id}</TableCell>
                        <TableCell className="text-xs font-mono">{pedido.documento}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{pedido.fornecedor}</TableCell>
                        <TableCell>
                          {pedido.obraId ? (
                            <Badge variant="outline" className="text-xs max-w-[140px] truncate">
                              {obrasMap[pedido.obraId] || pedido.obraId}
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-200 text-slate-800 text-xs">MONTEX</Badge>
                          )}
                        </TableCell>
                        <TableCell>{fmtData(pedido.data)}</TableCell>
                        <TableCell>{pedido.numItens}</TableCell>
                        <TableCell className="text-right">{(pedido.pesoKg || 0).toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-medium">{fmtMoeda(pedido.valor)}</TableCell>
                        <TableCell><StatusBadge status={pedido.status} /></TableCell>
                        <TableCell>
                          <Badge className={`${finConfig.color} text-xs`}>
                            {finConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Ver detalhes" onClick={() => {
                              setSelectedPedido(pedido._original || pedido);
                            }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Receber pedido (gera entrada no estoque)"
                                disabled={recebendoId === pedido.id}
                                onClick={() => handleReceberPedido(pedido)}
                              >
                                <PackageCheck className="h-4 w-4 text-emerald-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredPedidos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        Nenhum pedido em {nomeEscopoAtivo}
                      </TableCell>
                    </TableRow>
                  )}
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
              value={statsMateriais.total}
              subtitle={`Materiais — ${nomeEscopoAtivo}`}
              icon={Package}
            />
            <KPICard
              title="Peso Pedido"
              value={`${statsMateriais.pesoPedido.toLocaleString('pt-BR')} kg`}
              subtitle="Total solicitado"
              icon={Weight}
            />
            <KPICard
              title="Peso Recebido"
              value={`${statsMateriais.pesoRecebido.toLocaleString('pt-BR')} kg`}
              subtitle="Total entregue"
              icon={Truck}
            />
            <KPICard
              title="Peso Faltante"
              value={`${statsMateriais.pesoFalta.toLocaleString('pt-BR')} kg`}
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
                    const pesoPedido = mat.pesoPedido || mat.pesoPrevisto || 0;
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
                            status === 'entregue' || status === 'completo' ? 'bg-green-100 text-green-800' :
                            status === 'parcial' ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {status === 'entregue' || status === 'completo' ? 'Entregue' : status === 'parcial' ? 'Parcial' : 'Pendente'}
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
                        {fmtMoeda(filteredMateriais.reduce((a, m) => a + (m.valorTotalPedido || 0), 0))}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Peso Total: </span>
                      <span className="font-bold">
                        {filteredMateriais.reduce((a, m) => a + (m.pesoPedido || m.pesoPrevisto || 0), 0).toLocaleString('pt-BR')} kg
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
              value={nfsEscopo.length}
              subtitle={`Recebidas — ${nomeEscopoAtivo}`}
              icon={Receipt}
            />
            <KPICard
              title="Valor Total NFs"
              value={fmtMoeda(nfsEscopo.reduce((a, nf) => a + (nf.valorTotal || nf.valor || 0), 0))}
              subtitle="Soma das notas"
              icon={DollarSign}
            />
            <KPICard
              title="Fornecedores"
              value={[...new Set(nfsEscopo.map(nf => nf.fornecedor).filter(Boolean))].length}
              subtitle="Distintos nas NFs"
              icon={Building2}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Notas Fiscais Recebidas</CardTitle>
                {nfsPendentesProcessamento.length > 0 && (
                  <Button
                    onClick={handleProcessarTodas}
                    disabled={processandoNF !== null}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {processandoNF === 'todas'
                      ? 'Processando...'
                      : `Processar ${nfsPendentesProcessamento.length} NF(s) pendente(s)`}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Processar = gerar lançamento de despesa com categoria e centro de custo automáticos
                + extrair os itens para a aba Materiais. Idempotente: NF já vinculada não duplica.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {nfsEscopo.map((nf) => {
                  const itensArr = Array.isArray(nf.itens) ? nf.itens : [];
                  const pesoTotal = itensArr.reduce((a, i) => a + itemQtd(i), 0);
                  const temLanc = nfTemLancamento(nf, lancamentosDespesas);
                  const temMat = nfTemMateriais(nf, materiaisEstoque);
                  const catSugerida = (!temLanc) ? categorizarNF(nf) : null;
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
                                Emissão: {fmtData(nf.dataEmissao)}
                              </p>
                            )}
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-lg font-bold">
                              {fmtMoeda(nf.valorTotal || nf.valor)}
                            </p>
                            <p className="text-sm text-muted-foreground">{pesoTotal.toLocaleString('pt-BR')} kg</p>
                          </div>
                        </div>

                        {/* VÍNCULOS AUTOMÁTICOS (lançamento + materiais) */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Badge className={temLanc ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                            <Link2 className="h-3 w-3 mr-1" />
                            {temLanc ? 'Lançamento vinculado' : 'Sem lançamento'}
                          </Badge>
                          <Badge className={temMat ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                            <Weight className="h-3 w-3 mr-1" />
                            {temMat ? 'Materiais extraídos' : 'Materiais não extraídos'}
                          </Badge>
                          {catSugerida && (
                            <Badge variant="outline" className="text-xs">
                              Sugerido: {catSugerida.categoria} · {catSugerida.centroCusto}
                              {catSugerida.origem === 'aprendido' && ' (aprendido)'}
                            </Badge>
                          )}
                          {(!temLanc || !temMat) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 ml-auto"
                              disabled={processandoNF !== null}
                              onClick={() => handleProcessarNF(nf)}
                            >
                              <Sparkles className="h-3 w-3" />
                              {processandoNF === nf.id ? 'Processando...' : 'Processar'}
                            </Button>
                          )}
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
                                    {(item.material || item.categoria || item.ncm) && (
                                      <Badge variant="outline" className="text-xs">{item.material || item.categoria || `NCM ${item.ncm}`}</Badge>
                                    )}
                                    <span className="font-mono text-xs text-right text-muted-foreground">
                                      {itemValorUnit(item) > 0 && `${fmtMoeda(itemValorUnit(item))}/${itemUnidade(item).toLowerCase()} · `}
                                      {fmtMoeda(itemValorTotal(item))}
                                    </span>
                                    <span className="font-mono text-xs min-w-[80px] text-right">
                                      {itemQtd(item).toLocaleString('pt-BR')} {itemUnidade(item)}
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
                {nfsEscopo.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma nota fiscal em {nomeEscopoAtivo}
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
              <CardTitle>Cotações</CardTitle>
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
                            {cotacao.obraId ? (
                              <Badge variant="outline" className="text-xs">{obrasMap[cotacao.obraId] || cotacao.obraId}</Badge>
                            ) : (
                              <Badge className="bg-slate-200 text-slate-800 text-xs">MONTEX</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{cotacao.descricao || cotacao.observacao}</p>
                          {cotacao.fornecedor && (
                            <p className="text-xs text-muted-foreground">Fornecedor: {cotacao.fornecedor}</p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          {cotacao.valor > 0 && (
                            <p className="font-semibold">{fmtMoeda(cotacao.valor)}</p>
                          )}
                          <p className="text-xs text-muted-foreground">Prazo: {fmtData(cotacao.prazo)}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          Criada em {fmtData(cotacao.data)}
                          {cotacao.numItens > 0 && ` · ${cotacao.numItens} item(ns)`}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedPedido(cotacao._original || cotacao)}>
                            Ver Detalhes
                          </Button>
                          {(cotacao.status === 'cotacao' || cotacao.status === 'aberta') && (
                            <>
                              <Button size="sm" onClick={() => handleConverterCotacao(cotacao)}>
                                Converter em Pedido
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEncerrarCotacao(cotacao)}>
                                Encerrar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {cotacoes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma cotação em {nomeEscopoAtivo}. Use o botão "Nova Cotação" acima.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fornecedores */}
        <TabsContent value="fornecedores" className="space-y-4">
          {!tabelaFornecedoresOk && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-4 text-sm text-amber-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Cadastro persistente de fornecedores indisponível — rode <code className="font-mono">supabase/migration_v16_suprimentos.sql</code> no Supabase para habilitar.
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>
                  Fornecedores ({filteredFornecedores.length})
                  <span className="ml-2 text-sm font-normal text-muted-foreground">— {nomeEscopoAtivo}</span>
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar fornecedor..."
                    className="pl-8 w-[250px]"
                    value={searchTermForn}
                    onChange={(e) => setSearchTermForn(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredFornecedores.map((fornecedor) => (
                  <Card key={fornecedor.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">{fornecedor.nome}</h4>
                            {fornecedor.rating > 0 && (
                              <div className="flex items-center gap-1 text-yellow-500">
                                <Star className="h-4 w-4 fill-current" />
                                <span className="text-sm font-medium">{fornecedor.rating}</span>
                              </div>
                            )}
                            {fornecedor.cadastrado === false && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                Identificado nas compras/NFs
                              </Badge>
                            )}
                          </div>
                          {fornecedor.cnpj && <p className="text-sm text-muted-foreground">{fornecedor.cnpj}</p>}
                        </div>
                        {fornecedor.cadastrado !== false && (
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => setFornecedorEditando(fornecedor)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {fornecedor.cadastrado === false && tabelaFornecedoresOk && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleSalvarFornecedor({ nome: fornecedor.nome }).catch(() => {})}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Cadastrar
                          </Button>
                        )}
                      </div>
                      <div className="mt-4 space-y-2">
                        {fornecedor.cidade && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {fornecedor.cidade}{fornecedor.estado ? `, ${fornecedor.estado}` : ''}
                          </div>
                        )}
                        {fornecedor.telefone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {fornecedor.telefone}
                          </div>
                        )}
                        {fornecedor.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            {fornecedor.email}
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Pedidos</p>
                          <p className="font-semibold">{fornecedor.pedidos || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">NFs</p>
                          <p className="font-semibold">{fornecedor.nfs || 0}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total Comprado</p>
                          <p className="font-semibold">{fmtMoeda(fornecedor.valorTotal)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredFornecedores.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground md:col-span-2">
                    Nenhum fornecedor com movimento em {nomeEscopoAtivo}.
                    {escopo !== 'geral' && ' Selecione "Todas" para ver o cadastro completo.'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de edição de fornecedor */}
      {fornecedorEditando && (
        <FornecedorDialog
          fornecedor={fornecedorEditando}
          open={!!fornecedorEditando}
          onOpenChange={(o) => { if (!o) setFornecedorEditando(null); }}
          onSave={handleSalvarFornecedor}
        />
      )}

      {/* Modal de detalhes do pré-pedido / cotação */}
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
                    <p className="font-medium">{sp.fornecedor || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-medium">{fmtData(dataDoc)}</p>
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
                        <TableCell className="text-right font-medium">{fmtMoeda(item.valorTotal)}</TableCell>
                      </TableRow>
                    ))}
                    {itensArr.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-muted-foreground text-sm">
                          Sem itens detalhados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {sp.icms ? `ICMS: ${sp.icms}%` : ''} {sp.ipi ? `| IPI: ${sp.ipi}%` : ''}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Peso: {pesoTotal.toLocaleString('pt-BR')} kg</p>
                    <p className="text-lg font-bold">{fmtMoeda(sp.valorTotal ?? sp.valorPrevisto)}</p>
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
