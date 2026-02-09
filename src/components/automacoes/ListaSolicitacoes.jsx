import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', color: 'bg-slate-500', icon: Clock },
  em_analise: { label: 'Em Análise', color: 'bg-blue-500', icon: Eye },
  aprovado: { label: 'Aprovado', color: 'bg-green-500', icon: CheckCircle2 },
  rejeitado: { label: 'Rejeitado', color: 'bg-red-500', icon: XCircle },
  cancelado: { label: 'Cancelado', color: 'bg-slate-400', icon: XCircle }
};

export default function ListaSolicitacoes({ solicitacoes }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [solicitacaoSelecionada, setSolicitacaoSelecionada] = useState(null);
  const [comentario, setComentario] = useState('');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const aprovarMutation = useMutation({
    mutationFn: async ({ id, comentario }) => {
      const sol = solicitacoes.find(s => s.id === id);
      const novoHistorico = [
        ...(sol.historico_aprovacoes || []),
        {
          etapa: sol.etapa_atual,
          aprovador_email: user.email,
          aprovador_nome: user.full_name,
          decisao: 'aprovado',
          comentario,
          data_decisao: new Date().toISOString()
        }
      ];

      const update = {
        historico_aprovacoes: novoHistorico,
        status_geral: 'aprovado',
        data_conclusao: new Date().toISOString()
      };

      return base44.entities.SolicitacaoAprovacao.update(id, update);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['solicitacoes_aprovacao']);
      toast.success('Solicitação aprovada');
      setModalOpen(false);
      setComentario('');
    }
  });

  const rejeitarMutation = useMutation({
    mutationFn: async ({ id, comentario }) => {
      const sol = solicitacoes.find(s => s.id === id);
      const novoHistorico = [
        ...(sol.historico_aprovacoes || []),
        {
          etapa: sol.etapa_atual,
          aprovador_email: user.email,
          aprovador_nome: user.full_name,
          decisao: 'rejeitado',
          comentario,
          data_decisao: new Date().toISOString()
        }
      ];

      const update = {
        historico_aprovacoes: novoHistorico,
        status_geral: 'rejeitado',
        data_conclusao: new Date().toISOString()
      };

      return base44.entities.SolicitacaoAprovacao.update(id, update);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['solicitacoes_aprovacao']);
      toast.success('Solicitação rejeitada');
      setModalOpen(false);
      setComentario('');
    }
  });

  const handleOpenModal = (solicitacao) => {
    setSolicitacaoSelecionada(solicitacao);
    setModalOpen(true);
  };

  return (
    <>
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Solicitações de Aprovação</h2>

        {solicitacoes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Nenhuma solicitação de aprovação</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {solicitacoes.map((sol) => {
              const config = STATUS_CONFIG[sol.status_geral];
              const Icon = config.icon;
              const isPendente = ['pendente', 'em_analise'].includes(sol.status_geral);

              return (
                <Card key={sol.id} className={cn(
                  "border-l-4",
                  isPendente && "border-orange-400 bg-orange-50/30"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Icon className={cn("h-5 w-5", 
                            sol.status_geral === 'aprovado' && "text-green-600",
                            sol.status_geral === 'rejeitado' && "text-red-600",
                            isPendente && "text-orange-600"
                          )} />
                          <div>
                            <h3 className="font-medium text-slate-900">
                              {sol.documento_referencia}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {sol.fluxo_nome} • {sol.tipo_documento}
                            </p>
                          </div>
                          <Badge className={config.color}>
                            {config.label}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>Solicitado por: {sol.solicitante_nome || sol.solicitante_email}</span>
                          <span>•</span>
                          <span>{new Date(sol.data_solicitacao || sol.created_date).toLocaleDateString('pt-BR')}</span>
                          {sol.prazo_final && (
                            <>
                              <span>•</span>
                              <span>Prazo: {new Date(sol.prazo_final).toLocaleDateString('pt-BR')}</span>
                            </>
                          )}
                        </div>

                        {sol.historico_aprovacoes && sol.historico_aprovacoes.length > 0 && (
                          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                            <p className="text-xs font-medium text-slate-600">Histórico:</p>
                            {sol.historico_aprovacoes.map((hist, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                {hist.decisao === 'aprovado' ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-red-600" />
                                )}
                                <span className="text-slate-600">
                                  {hist.aprovador_nome} {hist.decisao === 'aprovado' ? 'aprovou' : 'rejeitou'}
                                </span>
                                {hist.comentario && (
                                  <span className="text-slate-400 text-xs">- {hist.comentario}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {isPendente && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenModal(sol)}
                          >
                            Analisar
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Aprovação/Rejeição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analisar Solicitação</DialogTitle>
          </DialogHeader>

          {solicitacaoSelecionada && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-slate-900">
                  {solicitacaoSelecionada.documento_referencia}
                </p>
                <p className="text-sm text-slate-600">
                  Solicitado por: {solicitacaoSelecionada.solicitante_nome || solicitacaoSelecionada.solicitante_email}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(solicitacaoSelecionada.data_solicitacao || solicitacaoSelecionada.created_date).toLocaleString('pt-BR')}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Comentário (opcional)
                </label>
                <Textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Adicione um comentário..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => rejeitarMutation.mutate({
                    id: solicitacaoSelecionada.id,
                    comentario
                  })}
                  disabled={rejeitarMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => aprovarMutation.mutate({
                    id: solicitacaoSelecionada.id,
                    comentario
                  })}
                  disabled={aprovarMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}