import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Loader2, BarChart3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PrevisaoCustosCard from './PrevisaoCustosCard';

const tiposMovimentacao = [
  { id: 'entrada', label: 'Receita', icon: TrendingUp, color: 'text-emerald-600' },
  { id: 'saida', label: 'Despesa', icon: TrendingDown, color: 'text-red-600' },
];

const categoriasEntrada = [
  'receita_projeto',
  'adiantamento',
  'pagamento_final',
];

const categoriasSaida = [
  'compra_material',
  'mao_de_obra',
  'transporte',
  'equipamento',
  'despesa_administrativa',
  'impostos',
  'outros'
];

const labelsCategorias = {
  receita_projeto: 'Receita do Projeto',
  adiantamento: 'Adiantamento do Cliente',
  pagamento_final: 'Pagamento Final',
  compra_material: 'Compra de Material',
  mao_de_obra: 'Mão de Obra',
  transporte: 'Transporte',
  equipamento: 'Equipamento',
  despesa_administrativa: 'Despesa Administrativa',
  impostos: 'Impostos',
  outros: 'Outros',
};

const statusOptions = [
  { id: 'previsto', label: 'Previsto', color: 'bg-blue-100 text-blue-700' },
  { id: 'realizado', label: 'Realizado', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'cancelado', label: 'Cancelado', color: 'bg-slate-100 text-slate-700' },
];

export default function FluxoCaixaPorObra({ projetoId, projetos = [] }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [projetoFiltro, setProjetoFiltro] = useState(projetoId === 'todos' || !projetoId ? 'todos' : projetoId);
  const [formData, setFormData] = useState({
    tipo: 'saida',
    categoria: 'compra_material',
    descricao: '',
    valor: '',
    data_movimentacao: new Date().toISOString().split('T')[0],
    forma_pagamento: 'pix',
    status: 'previsto',
    documento_fiscal: '',
    observacoes: '',
  });

  const queryClient = useQueryClient();

  const { data: movimentacoes = [] } = useQuery({
    queryKey: ['movimentacoes-obra', projetoFiltro],
    queryFn: () => {
      if (projetoFiltro === 'todos') {
        return base44.entities.MovimentacaoFinanceira.list('-data_movimentacao', 500);
      }
      return base44.entities.MovimentacaoFinanceira.filter(
        { projeto_id: projetoFiltro },
        '-data_movimentacao',
        500
      );
    }
  });

  const { data: alocacoes = [] } = useQuery({
    queryKey: ['alocacoes-despesa', projetoFiltro],
    queryFn: () => {
      if (projetoFiltro === 'todos') {
        return base44.entities.AlocacaoDespesa.list('-created_date', 500);
      }
      return base44.entities.AlocacaoDespesa.filter(
        { projeto_id: projetoFiltro },
        '-created_date',
        500
      );
    }
  });

  const createMovimentacaoMutation = useMutation({
    mutationFn: (data) => base44.entities.MovimentacaoFinanceira.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-obra'] });
      toast.success('Movimentação registrada!');
      setMostrarForm(false);
      setFormData({
        tipo: 'saida',
        categoria: 'compra_material',
        descricao: '',
        valor: '',
        data_movimentacao: new Date().toISOString().split('T')[0],
        forma_pagamento: 'pix',
        status: 'previsto',
        documento_fiscal: '',
        observacoes: '',
      });
    }
  });

  const deleteMovimentacaoMutation = useMutation({
    mutationFn: (id) => base44.entities.MovimentacaoFinanceira.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-obra'] });
      toast.success('Movimentação removida!');
    }
  });

  const handleSalvar = async () => {
    if (!formData.descricao || !formData.valor) {
      toast.error('Preencha descrição e valor');
      return;
    }

    const projetoSelecionado = projetos.find(p => p.id === projetoFiltro);
    
    await createMovimentacaoMutation.mutateAsync({
      ...formData,
      valor: parseFloat(formData.valor),
      projeto_id: projetoFiltro !== 'todos' ? projetoFiltro : null,
      projeto_nome: projetoSelecionado?.nome || null,
    });
  };

  // Filtrar movimentações
  const movimentacoesFiltradas = movimentacoes.filter(m => {
    if (projetoFiltro !== 'todos' && m.projeto_id !== projetoFiltro) return false;
    return true;
  });

  // Calcular totais por tipo (incluindo alocações)
  const entradas = movimentacoesFiltradas
    .filter(m => m.tipo === 'entrada')
    .reduce((acc, m) => acc + (m.valor || 0), 0);

  const saidas = movimentacoesFiltradas
    .filter(m => m.tipo === 'saida')
    .reduce((acc, m) => acc + (m.valor || 0), 0);

  // Adicionar alocações compartilhadas
  const alocacoesCompartilhadas = alocacoes.reduce((acc, aloc) => {
    if (aloc.tipo === 'despesa_compartilhada') {
      return acc + (aloc.valor_alocado || 0);
    }
    return acc;
  }, 0);

  // Obter dados do projeto selecionado
  const projetoSelecionado = projetos.find(p => p.id === projetoFiltro);
  const valorContrato = projetoSelecionado?.valor_contrato || 0;
  const saldo = valorContrato - entradas - saidas;

  // Agrupar por data
  const movimentacoesPorData = {};
  movimentacoesFiltradas.forEach(m => {
    const data = m.data_movimentacao;
    if (!movimentacoesPorData[data]) {
      movimentacoesPorData[data] = [];
    }
    movimentacoesPorData[data].push(m);
  });

  const datasOrdenadas = Object.keys(movimentacoesPorData).sort().reverse();

  return (
    <div className="space-y-6">
      {/* Header com Filtro e Botão */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1 max-w-xs">
          <Label className="text-sm mb-2 block">Filtrar por Projeto</Label>
          <Select value={projetoFiltro} onValueChange={setProjetoFiltro}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Projetos</SelectItem>
              {projetos.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => setMostrarForm(true)}
          className="bg-gradient-to-r from-purple-500 to-purple-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Movimentação
        </Button>
      </div>

      {/* Previsão de Custos - Exibe apenas quando um projeto específico está selecionado */}
      {projetoFiltro !== 'todos' && (
        <PrevisaoCustosCard projetoId={projetoFiltro} />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Total Receitas</p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  R$ {entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Total Despesas</p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  R$ {saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-300" />
            </div>
          </CardContent>
        </Card>

        <Card className={saldo >= 0 ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  Saldo
                </p>
                <p className={`text-2xl font-bold mt-1 ${saldo >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                  R$ {Math.abs(saldo).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className={`h-8 w-8 ${saldo >= 0 ? 'text-blue-300' : 'text-orange-300'}`} />
            </div>
          </CardContent>
        </Card>

        {alocacoesCompartilhadas > 0 && (
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Despesas Compartilhadas</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">
                    R$ {alocacoesCompartilhadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-300" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Breakdown de Custos Compartilhados */}
      {alocacoes.length > 0 && (
        <Card>
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Detalhamento de Despesas Compartilhadas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {alocacoes.map(aloc => {
                const movimentacao = movimentacoes.find(m => m.id === aloc.movimentacao_financeira_id);
                return (
                  <div key={aloc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{movimentacao?.descricao}</p>
                      <div className="flex gap-4 mt-1 text-xs text-slate-600">
                        <span>{movimentacao?.categoria}</span>
                        <span>{aloc.percentual_alocacao}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">R$ {aloc.valor_alocado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-slate-500">{new Date(aloc.created_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Movimentações */}
      <div className="space-y-4">
        {datasOrdenadas.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-slate-500 text-sm">Nenhuma movimentação registrada</p>
            </CardContent>
          </Card>
        ) : (
          datasOrdenadas.map(data => {
            const movs = movimentacoesPorData[data];
            const dataFormatada = new Date(data).toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            return (
              <Card key={data}>
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm">{dataFormatada}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="w-32">Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-32">Categoria</TableHead>
                        <TableHead className="text-right w-32">Valor</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movs.map(mov => {
                        const statusInfo = statusOptions.find(s => s.id === mov.status);
                        return (
                          <TableRow key={mov.id} className={mov.tipo === 'saida' ? 'bg-red-50/30' : 'bg-emerald-50/30'}>
                            <TableCell>
                              <Badge className={mov.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                                {mov.tipo === 'entrada' ? 'Receita' : 'Despesa'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{mov.descricao}</TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {labelsCategorias[mov.categoria] || mov.categoria}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${mov.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {mov.tipo === 'entrada' ? '+' : '-'} R$ {Math.abs(mov.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusInfo?.color || 'bg-slate-100 text-slate-700'}>
                                {statusInfo?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteMovimentacaoMutation.mutate(mov.id)}
                                disabled={deleteMovimentacaoMutation.isPending}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog */}
      <Dialog open={mostrarForm} onOpenChange={setMostrarForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Movimentação Financeira</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => {
                    const novaCategoria = value === 'entrada' ? 'receita_projeto' : 'compra_material';
                    setFormData({ ...formData, tipo: value, categoria: novaCategoria });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Receita</SelectItem>
                    <SelectItem value="saida">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData.tipo === 'entrada' ? categoriasEntrada : categoriasSaida).map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {labelsCategorias[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                placeholder="Ex: Compra de aço"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.data_movimentacao}
                  onChange={(e) => setFormData({ ...formData, data_movimentacao: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={formData.forma_pagamento}
                  onValueChange={(value) => setFormData({ ...formData, forma_pagamento: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="previsto">Previsto</SelectItem>
                    <SelectItem value="realizado">Realizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Documento Fiscal (opcional)</Label>
              <Input
                placeholder="Ex: NF-000123"
                value={formData.documento_fiscal}
                onChange={(e) => setFormData({ ...formData, documento_fiscal: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                placeholder="Observações adicionais..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setMostrarForm(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSalvar}
                disabled={createMovimentacaoMutation.isPending}
                className="bg-gradient-to-r from-purple-500 to-purple-600"
              >
                {createMovimentacaoMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Registrar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}