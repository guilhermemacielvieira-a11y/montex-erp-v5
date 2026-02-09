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

const etapas = [
  { id: 'geral', label: 'Geral' },
  { id: 'fabricacao', label: 'Fabricação' },
  { id: 'montagem', label: 'Montagem' },
];

export default function OrcamentoDetalhadoPorItem({ orcamento, projetos = [], itens = [] }) {
  const [showDialog, setShowDialog] = useState(false);
  const [formDetalhe, setFormDetalhe] = useState({
    etapa: 'geral',
    categoria: 'mao_obra',
    item_id: '',
    descricao: '',
    quantidade: '',
    unidade: 'un',
    valor_unitario_orcado: ''
  });

  const queryClient = useQueryClient();

  const { data: detalhes = [] } = useQuery({
    queryKey: ['orcamento-detalhado', orcamento?.id],
    queryFn: () => base44.entities.OrcamentoDetalhado.filter(
      { orcamento_id: orcamento?.id },
      '-created_date',
      500
    ),
    enabled: !!orcamento?.id
  });

  const createDetalheMutation = useMutation({
    mutationFn: (data) => base44.entities.OrcamentoDetalhado.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento-detalhado'] });
      toast.success('Detalhe adicionado!');
      setShowDialog(false);
      setFormDetalhe({
        etapa: 'geral',
        categoria: 'mao_obra',
        item_id: '',
        descricao: '',
        quantidade: '',
        unidade: 'un',
        valor_unitario_orcado: ''
      });
    }
  });

  const deleteDetalheMutation = useMutation({
    mutationFn: (id) => base44.entities.OrcamentoDetalhado.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamento-detalhado'] });
      toast.success('Detalhe removido!');
    }
  });

  const salvarDetalhe = async () => {
    if (!formDetalhe.valor_unitario_orcado || !formDetalhe.quantidade) {
      toast.error('Preencha quantidade e valor unitário');
      return;
    }

    const quantidade = parseFloat(formDetalhe.quantidade);
    const valorUnitario = parseFloat(formDetalhe.valor_unitario_orcado);
    const valorTotal = quantidade * valorUnitario;

    const itemSelecionado = formDetalhe.item_id
      ? itens.find(i => i.id === formDetalhe.item_id)
      : null;

    await createDetalheMutation.mutateAsync({
      orcamento_id: orcamento.id,
      numero_orcamento: orcamento.numero,
      projeto_id: orcamento.projeto_id || (projetos[0]?.id || ''),
      projeto_nome: orcamento.projeto_nome,
      item_id: formDetalhe.item_id || null,
      item_nome: itemSelecionado?.nome || formDetalhe.descricao,
      etapa: formDetalhe.etapa,
      categoria: formDetalhe.categoria,
      descricao: formDetalhe.descricao,
      quantidade,
      unidade: formDetalhe.unidade,
      valor_unitario_orcado: valorUnitario,
      valor_total_orcado: valorTotal,
      valor_realizado: 0,
      percentual_avanço: 0
    });
  };

  // Agrupar detalhes por etapa e categoria
  const detalhesPorEtapa = {};
  etapas.forEach(etapa => {
    detalhesPorEtapa[etapa.id] = {
      label: etapa.label,
      porCategoria: {}
    };
    categoriasCusto.forEach(cat => {
      detalhesPorEtapa[etapa.id].porCategoria[cat.id] = {
        label: cat.label,
        color: cat.color,
        itens: [],
        total: 0
      };
    });
  });

  detalhes.forEach(detalhe => {
    if (detalhesPorEtapa[detalhe.etapa]) {
      const cat = detalhesPorEtapa[detalhe.etapa].porCategoria[detalhe.categoria];
      if (cat) {
        cat.itens.push(detalhe);
        cat.total += detalhe.valor_total_orcado || 0;
      }
    }
  });

  const totalOrcado = detalhes.reduce((acc, d) => acc + (d.valor_total_orcado || 0), 0);

  return (
    <div className="space-y-4">
      {/* Botão Adicionar */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowDialog(true)}
          size="sm"
          className="bg-gradient-to-r from-purple-500 to-purple-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Detalhe
        </Button>
      </div>

      {/* Resumo por Etapa */}
      <div className="space-y-6">
        {etapas.map(etapa => {
          const dadosEtapa = detalhesPorEtapa[etapa.id];
          const totalEtapa = Object.values(dadosEtapa.porCategoria).reduce((acc, c) => acc + c.total, 0);

          if (totalEtapa === 0) return null;

          return (
            <Card key={etapa.id}>
              <CardHeader>
                <CardTitle className="text-base">{etapa.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Categorias da Etapa */}
                {Object.entries(dadosEtapa.porCategoria).map(([catId, catData]) => {
                  if (catData.itens.length === 0) return null;

                  return (
                    <div key={catId} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={catData.color}>
                          {catData.label}
                        </Badge>
                        <span className="text-lg font-bold text-slate-900">
                          R$ {catData.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50">
                            <TableHead className="text-xs">Descrição</TableHead>
                            <TableHead className="text-xs text-right">Qtd</TableHead>
                            <TableHead className="text-xs text-right">Valor Un.</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                            <TableHead className="w-8"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {catData.itens.map(detalhe => (
                            <TableRow key={detalhe.id} className="text-sm">
                              <TableCell>{detalhe.descricao || detalhe.item_nome}</TableCell>
                              <TableCell className="text-right">
                                {detalhe.quantidade} {detalhe.unidade}
                              </TableCell>
                              <TableCell className="text-right">
                                R$ {detalhe.valor_unitario_orcado.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                R$ {detalhe.valor_total_orcado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteDetalheMutation.mutate(detalhe.id)}
                                  disabled={deleteDetalheMutation.isPending}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Total Geral */}
      {detalhes.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Total Orçado Detalhado</p>
              <p className="text-2xl font-bold text-purple-900">
                R$ {totalOrcado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign className="h-10 w-10 text-purple-300" />
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Detalhe ao Orçamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Etapa *</Label>
                <Select
                  value={formDetalhe.etapa}
                  onValueChange={(value) => setFormDetalhe({ ...formDetalhe, etapa: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {etapas.map(e => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={formDetalhe.categoria}
                  onValueChange={(value) => setFormDetalhe({ ...formDetalhe, categoria: value })}
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
            </div>

            <div className="space-y-2">
              <Label>Item (opcional)</Label>
              <Select
                value={formDetalhe.item_id}
                onValueChange={(value) => setFormDetalhe({ ...formDetalhe, item_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um item..." />
                </SelectTrigger>
                <SelectContent>
                  {itens.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                placeholder="Ex: Mão de obra soldagem"
                value={formDetalhe.descricao}
                onChange={(e) => setFormDetalhe({ ...formDetalhe, descricao: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={formDetalhe.quantidade}
                  onChange={(e) => setFormDetalhe({ ...formDetalhe, quantidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input
                  placeholder="un"
                  value={formDetalhe.unidade}
                  onChange={(e) => setFormDetalhe({ ...formDetalhe, unidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Unitário *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formDetalhe.valor_unitario_orcado}
                  onChange={(e) => setFormDetalhe({ ...formDetalhe, valor_unitario_orcado: e.target.value })}
                />
              </div>
            </div>

            {formDetalhe.quantidade && formDetalhe.valor_unitario_orcado && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600">
                  Total: R$ {(parseFloat(formDetalhe.quantidade) * parseFloat(formDetalhe.valor_unitario_orcado)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={salvarDetalhe}
                disabled={createDetalheMutation.isPending}
                className="bg-gradient-to-r from-purple-500 to-purple-600"
              >
                {createDetalheMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Adicionar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}