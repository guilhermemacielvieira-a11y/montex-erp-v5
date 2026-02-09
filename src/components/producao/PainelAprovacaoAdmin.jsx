import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PainelAprovacaoAdmin() {
  const queryClient = useQueryClient();

  const { data: itemsPendentes = [], isLoading } = useQuery({
    queryKey: ['itemsPendentesAprovacao'],
    queryFn: async () => {
      const items = await base44.entities.ItemProducao.filter({ status_pendente_aprovacao: true });
      return items;
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (itemId) => {
      await base44.entities.ItemProducao.update(itemId, {
        status_pendente_aprovacao: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itemsPendentesAprovacao'] });
      toast.success('Atualização aprovada!');
    },
    onError: () => {
      toast.error('Erro ao aprovar');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (itemId) => {
      await base44.entities.ItemProducao.update(itemId, {
        status_pendente_aprovacao: false,
        quantidade_produzida: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itemsPendentesAprovacao'] });
      toast.success('Atualização rejeitada');
    },
    onError: () => {
      toast.error('Erro ao rejeitar');
    }
  });

  if (isLoading) return <div className="text-center py-4">Carregando...</div>;

  if (itemsPendentes.length === 0) {
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="flex items-center gap-3 py-6">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <p className="text-slate-600">Nenhuma atualização pendente de aprovação</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          Aprovações Pendentes ({itemsPendentes.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {itemsPendentes.map(item => (
            <div key={item.id} className="p-4 border rounded-lg bg-slate-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold">{item.nome}</p>
                  <p className="text-sm text-slate-500">{item.projeto_nome}</p>
                </div>
                <Badge variant="outline" className="bg-orange-100 text-orange-800">
                  Pendente
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4 text-sm bg-white p-2 rounded">
                <div>
                  <p className="text-slate-500">Total</p>
                  <p className="font-semibold">{item.quantidade} un</p>
                </div>
                <div>
                  <p className="text-slate-500">Produzido</p>
                  <p className="font-semibold">{item.quantidade_produzida} un</p>
                </div>
                <div>
                  <p className="text-slate-500">Progresso</p>
                  <p className="font-semibold">{item.percentual_conclusao?.toFixed(1)}%</p>
                </div>
              </div>

              {item.observacoes && (
                <p className="text-sm bg-blue-50 p-2 rounded mb-3 text-blue-900">
                  <strong>Nota:</strong> {item.observacoes}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => approveMutation.mutate(item.id)}
                  disabled={approveMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
                <Button
                  onClick={() => rejectMutation.mutate(item.id)}
                  disabled={rejectMutation.isPending}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}