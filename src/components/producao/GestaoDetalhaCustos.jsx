import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, DollarSign, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const categoriasCusto = [
  { id: 'mao_obra', label: 'Mão de Obra', color: 'bg-blue-100 text-blue-700' },
  { id: 'material', label: 'Material', color: 'bg-green-100 text-green-700' },
  { id: 'terceiros', label: 'Terceiros', color: 'bg-purple-100 text-purple-700' },
  { id: 'equipamento', label: 'Equipamento', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'overhead', label: 'Overhead', color: 'bg-slate-100 text-slate-700' },
];

export default function GestaoDetalhaCustos({ projetoId, projetoNome, itemSelecionado }) {
  const [showDialog, setShowDialog] = useState(false);
  const [formCusto, setFormCusto] = useState({
    categoria: 'mao_obra',
    descricao: '',
    valor: '',
    data_lancamento: new Date().toISOString().split('T')[0],
    observacoes: ''
  });

  const queryClient = useQueryClient();

  const { data: custos = [] } = useQuery({
    queryKey: ['custos-producao', itemSelecionado?.id],
    queryFn: () => base44.entities.CustoProducao.filter({
      projeto_id: projetoId,
      item_producao_id: itemSelecionado?.id
    }, '-data_lancamento', 500),
    enabled: !!itemSelecionado
  });

  const createCustoMutation = useMutation({
    mutationFn: (data) => base44.entities.CustoProducao.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custos-producao'] });
      toast.success('Custo registrado!');
      setShowDialog(false);
      setFormCusto({
        categoria: 'mao_obra',
        descricao: '',
        valor: '',
        data_lancamento: new Date().toISOString().split('T')[0],
        observacoes: ''
      });
    }
  });

  const deleteCustoMutation = useMutation({
    mutationFn: (id) => base44.entities.CustoProducao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custos-producao'] });
      toast.success('Custo removido!');
    }
  });

  const salvarCusto = async () => {
    if (!formCusto.valor) {
      toast.error('Preenchimento do valor obrigatório');
      return;
    }

    await createCustoMutation.mutateAsync({
      projeto_id: projetoId,
      projeto_nome: projetoNome,
      item_producao_id: itemSelecionado.id,
      item_nome: itemSelecionado.nome,
      etapa: itemSelecionado.etapa,
      categoria: formCusto.categoria,
      descricao: formCusto.descricao,
      valor: parseFloat(formCusto.valor),
      data_lancamento: formCusto.data_lancamento,
      alocacao_automatica: false,
      base_alocacao: 'manual',
      observacoes: formCusto.observacoes
    });
  };

  const custosPorCategoria = categoriasCusto.map(cat => ({
    ...cat,
    total: custos
      .filter(c => c.categoria === cat.id)
      .reduce((acc, c) => acc + (c.valor || 0), 0),
    count: custos.filter(c => c.categoria === cat.id).length
  }));

  const custoTotal = custos.reduce((acc, c) => acc + (c.valor || 0), 0);

  return (
    <div className="space-y-4">
      {/* Resumo por Categoria */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {custosPorCategoria.map(cat => (
          <Card key={cat.id}>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-slate-500 mb-1">{cat.label}</p>
              <p className="text-sm font-bold text-slate-900">R$ {cat.total.toFixed(0)}</p>
              <p className="text-xs text-slate-400">{cat.count} item(ns)</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total de Custos */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-orange-600 font-medium">Total de Custos</p>
            <p className="text-2xl font-bold text-orange-900">R$ {custoTotal.toFixed(2)}</p>
          </div>
          <DollarSign className="h-10 w-10 text-orange-300" />
        </CardContent>
      </Card>

      {/* Lista de Custos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Custos Registrados</CardTitle>
          <Button
            size="sm"
            onClick={() => setShowDialog(true)}
            className="bg-gradient-to-r from-orange-500 to-orange-600"
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Custo
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {custos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm">Nenhum custo registrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {custos.map((custo) => {
                  const categoria = categoriasCusto.find(c => c.id === custo.categoria);
                  return (
                    <TableRow key={custo.id}>
                      <TableCell className="text-sm">
                        {new Date(custo.data_lancamento).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Badge className={categoria?.color}>
                          {categoria?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {custo.descricao || '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        R$ {custo.valor.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteCustoMutation.mutate(custo.id)}
                          disabled={deleteCustoMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Novo Custo */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Custo - {itemSelecionado?.nome}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={formCusto.categoria}
                onValueChange={(value) => setFormCusto({ ...formCusto, categoria: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoriasCusto.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Soldagem, Pintura, etc."
                value={formCusto.descricao}
                onChange={(e) => setFormCusto({ ...formCusto, descricao: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 150.50"
                value={formCusto.valor}
                onChange={(e) => setFormCusto({ ...formCusto, valor: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={formCusto.data_lancamento}
                onChange={(e) => setFormCusto({ ...formCusto, data_lancamento: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Detalhes adicionais..."
                value={formCusto.observacoes}
                onChange={(e) => setFormCusto({ ...formCusto, observacoes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={salvarCusto}
                disabled={!formCusto.valor || createCustoMutation.isPending}
                className="bg-gradient-to-r from-orange-500 to-orange-600"
              >
                {createCustoMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Registrar Custo'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}