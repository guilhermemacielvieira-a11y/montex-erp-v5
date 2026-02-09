import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Pause, Zap, Edit3, CheckCircle2, Trash2, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tipoConfig = {
  atraso_previsto: {
    icon: AlertTriangle,
    cor: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-800',
    titulo: 'Atraso Previsto'
  },
  item_pausado: {
    icon: Pause,
    cor: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-800',
    titulo: 'Item Pausado'
  },
  quantidade_baixa: {
    icon: Zap,
    cor: 'bg-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-800',
    titulo: 'Quantidade Baixa'
  },
  item_atualizado: {
    icon: Edit3,
    cor: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
    titulo: 'Item Atualizado'
  }
};

export default function NotificacoesProducao({ expandido = false }) {
  const queryClient = useQueryClient();

  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: () => base44.entities.Notificacao.filter(
      { lido: false },
      '-data_notificacao',
      50
    ),
    refetchInterval: 30000 // Atualiza a cada 30 segundos
  });

  const marcarComoLidoMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Notificacao.update(id, { lido: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    }
  });

  const deletarNotificacaoMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Notificacao.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      toast.success('Notificação removida');
    }
  });

  if (isLoading) {
    return (
      <Card className="border-slate-100">
        <CardHeader>
          <CardTitle className="text-lg">Notificações de Produção</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader className="w-5 h-5 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  const notificacoesExibidas = expandido ? notificacoes : notificacoes.slice(0, 5);

  return (
    <Card className="border-slate-100 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Notificações de Produção</CardTitle>
          {notificacoes.length > 0 && (
            <Badge className="bg-red-600 text-white">{notificacoes.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notificacoes.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-slate-500">Nenhuma notificação pendente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notificacoesExibidas.map((notif) => {
              const config = tipoConfig[notif.tipo];
              const Icon = config.icon;

              return (
                <div
                  key={notif.id}
                  className={`border rounded-lg p-3 space-y-2 ${config.cor}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={config.badge}>{config.titulo}</Badge>
                          <span className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(notif.data_notificacao), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </span>
                        </div>
                        <p className="text-sm font-medium mt-1">{notif.item_nome}</p>
                        <p className="text-xs text-slate-600 mt-1">{notif.mensagem}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        onClick={() => marcarComoLidoMutation.mutate(notif.id)}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={marcarComoLidoMutation.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => deletarNotificacaoMutation.mutate(notif.id)}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-500 hover:text-red-700"
                        disabled={deletarNotificacaoMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Detalhes */}
                  {notif.detalhes && (
                    <div className="text-xs text-slate-600 space-y-0.5 ml-7">
                      {notif.detalhes.data_limite && (
                        <p>
                          <strong>Prazo:</strong>{' '}
                          {new Date(notif.detalhes.data_limite).toLocaleDateString(
                            'pt-BR'
                          )}
                        </p>
                      )}
                      {notif.detalhes.quantidade_restante !== undefined && (
                        <p>
                          <strong>Restam:</strong> {notif.detalhes.quantidade_restante} unidades
                        </p>
                      )}
                      {notif.detalhes.percentual_conclusao !== undefined && (
                        <p>
                          <strong>Progresso:</strong>{' '}
                          {notif.detalhes.percentual_conclusao.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {notificacoes.length > 5 && !expandido && (
              <p className="text-xs text-slate-500 text-center pt-2">
                + {notificacoes.length - 5} notificações
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}