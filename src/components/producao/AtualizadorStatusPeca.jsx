import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function AtualizadorStatusPeca({ item, onSuccess }) {
  const [quantidade, setQuantidade] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState(item.status || 'em_andamento');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const percentualConclusao = (data.quantidade_produzida / item.quantidade) * 100;
      await base44.entities.ItemProducao.update(item.id, {
        ...data,
        percentual_conclusao: Math.min(percentualConclusao, 100),
        status_pendente_aprovacao: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itemsProducao'] });
      toast.success('Atualização registrada! Aguardando aprovação do admin.');
      setQuantidade('');
      setObservacoes('');
      onSuccess?.();
    },
    onError: () => {
      toast.error('Erro ao atualizar. Tente novamente.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!quantidade || isNaN(quantidade) || quantidade <= 0) {
      toast.error('Digite uma quantidade válida');
      return;
    }
    const qtd = parseInt(quantidade);
    if (qtd + item.quantidade_produzida > item.quantidade) {
      toast.error('Quantidade excede o total do item');
      return;
    }
    updateMutation.mutate({
      quantidade_produzida: item.quantidade_produzida + qtd,
      status,
      observacoes
    });
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="text-lg">{item.nome}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-slate-50 rounded">
            <div>
              <p className="text-xs text-slate-500">Quantidade Total</p>
              <p className="font-semibold">{item.quantidade} un</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Produzido</p>
              <p className="font-semibold">{item.quantidade_produzida} un</p>
            </div>
          </div>

          <div>
            <Label htmlFor="quantidade">Quantidade a Registrar</Label>
            <Input
              id="quantidade"
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="0"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Algum problema ou nota importante?"
              className="w-full mt-1 p-2 border rounded text-sm"
              rows="2"
            />
          </div>

          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {updateMutation.isPending ? 'Registrando...' : 'Registrar Atualização'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}