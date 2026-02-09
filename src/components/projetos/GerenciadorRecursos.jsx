import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import AlocacaoModal from './AlocacaoModal';

const FUNCAO_LABELS = {
  gerente: 'Gerente',
  engenheiro: 'Engenheiro',
  soldador: 'Soldador',
  montador: 'Montador',
  desenhista: 'Desenhista',
  outro: 'Outro'
};

export default function GerenciadorRecursos({ projetos }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [alocacaoEditando, setAlocacaoEditando] = useState(null);
  const queryClient = useQueryClient();

  const { data: alocacoes = [] } = useQuery({
    queryKey: ['alocacoes'],
    queryFn: () => base44.entities.AlocacaoRecurso.list('-created_date', 200)
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('full_name', 100)
  });

  const deleteAlocacaoMutation = useMutation({
    mutationFn: (id) => base44.entities.AlocacaoRecurso.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['alocacoes']);
    }
  });

  // Agregar por usuário
  const recursosAgregados = users.map(user => {
    const alocacoesUsuario = alocacoes.filter(a => 
      a.usuario_email === user.email && a.status === 'ativo'
    );
    
    const cargaTotal = alocacoesUsuario.reduce((acc, a) => 
      acc + (a.percentual_alocacao || 0), 0
    );

    const horasTotal = alocacoesUsuario.reduce((acc, a) => 
      acc + (a.horas_alocadas || 0), 0
    );

    const horasTrabalhadas = alocacoesUsuario.reduce((acc, a) => 
      acc + (a.horas_trabalhadas || 0), 0
    );

    return {
      ...user,
      alocacoes: alocacoesUsuario,
      cargaTotal,
      horasTotal,
      horasTrabalhadas,
      disponibilidade: Math.max(0, 100 - cargaTotal)
    };
  });

  const getCargaColor = (carga) => {
    if (carga >= 100) return 'text-red-500';
    if (carga >= 80) return 'text-orange-500';
    if (carga >= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getProgressColor = (carga) => {
    if (carga >= 100) return 'bg-red-500';
    if (carga >= 80) return 'bg-orange-500';
    if (carga >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <>
      <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Gerenciamento de Recursos
            </CardTitle>
            <Button
              onClick={() => {
                setAlocacaoEditando(null);
                setModalOpen(true);
              }}
              className="bg-gradient-to-r from-blue-500 to-blue-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Alocação
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Recursos</p>
                  <p className="text-2xl font-bold text-white">{users.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Sobrecarregados</p>
                  <p className="text-2xl font-bold text-white">
                    {recursosAgregados.filter(r => r.cargaTotal >= 100).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Disponíveis</p>
                  <p className="text-2xl font-bold text-white">
                    {recursosAgregados.filter(r => r.cargaTotal < 80).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Recursos */}
          <div className="space-y-4">
            {recursosAgregados.map(recurso => (
              <div
                key={recurso.id}
                className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {recurso.full_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{recurso.full_name}</h3>
                      <p className="text-sm text-slate-400">{recurso.email}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={cn("text-2xl font-bold", getCargaColor(recurso.cargaTotal))}>
                      {recurso.cargaTotal.toFixed(0)}%
                    </div>
                    <p className="text-xs text-slate-400">Alocação</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Carga de trabalho</span>
                    <span>{recurso.horasTrabalhadas}h / {recurso.horasTotal}h</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", getProgressColor(recurso.cargaTotal))}
                      style={{ width: `${Math.min(100, recurso.cargaTotal)}%` }}
                    />
                  </div>
                </div>

                {/* Alocações */}
                {recurso.alocacoes.length > 0 && (
                  <div className="space-y-2">
                    {recurso.alocacoes.map(alocacao => {
                      const projeto = projetos.find(p => p.id === alocacao.projeto_id);
                      
                      return (
                        <div
                          key={alocacao.id}
                          className="flex items-center justify-between bg-slate-900/50 rounded-lg p-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {FUNCAO_LABELS[alocacao.funcao]}
                            </Badge>
                            <span className="text-slate-300">{alocacao.projeto_nome}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-400">
                              {alocacao.percentual_alocacao}% • {alocacao.horas_alocadas}h/sem
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAlocacaoEditando(alocacao);
                                setModalOpen(true);
                              }}
                              className="text-xs"
                            >
                              Editar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {recurso.alocacoes.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-2">
                    Nenhuma alocação ativa
                  </p>
                )}
              </div>
            ))}
          </div>

          {recursosAgregados.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400">Nenhum recurso cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlocacaoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        alocacao={alocacaoEditando}
        projetos={projetos}
        users={users}
      />
    </>
  );
}