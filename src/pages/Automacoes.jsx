import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Zap,
  Plus,
  Edit,
  Trash2,
  Power,
  GitBranch,
  Clock,
  Activity,
  FileCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AutomacaoModal from '@/components/automacoes/AutomacaoModal';
import FluxoAprovacaoModal from '@/components/automacoes/FluxoAprovacaoModal';
import LogsAutomacao from '@/components/automacoes/LogsAutomacao';
import ListaSolicitacoes from '@/components/automacoes/ListaSolicitacoes';
import { toast } from 'sonner';

const TIPO_GATILHO_LABELS = {
  mudanca_status_projeto: 'Mudança de Status - Projeto',
  mudanca_status_orcamento: 'Mudança de Status - Orçamento',
  conclusao_item_producao: 'Conclusão de Item de Produção',
  aprovacao_orcamento: 'Aprovação de Orçamento',
  atraso_projeto: 'Projeto Atrasado',
  estoque_baixo: 'Estoque Baixo',
  conclusao_etapa: 'Conclusão de Etapa'
};

const TIPO_DOCUMENTO_LABELS = {
  orcamento: 'Orçamento',
  relatorio: 'Relatório',
  projeto: 'Projeto',
  movimentacao_financeira: 'Movimentação Financeira'
};

export default function AutomacoesPage() {
  const [modalAutomacaoOpen, setModalAutomacaoOpen] = useState(false);
  const [modalFluxoOpen, setModalFluxoOpen] = useState(false);
  const [automacaoEditando, setAutomacaoEditando] = useState(null);
  const [fluxoEditando, setFluxoEditando] = useState(null);
  const queryClient = useQueryClient();

  const { data: automacoes = [], isLoading: loadingAutomacoes } = useQuery({
    queryKey: ['automacoes'],
    queryFn: () => base44.entities.Automacao.list('-created_date', 100)
  });

  const { data: fluxos = [], isLoading: loadingFluxos } = useQuery({
    queryKey: ['fluxos_aprovacao'],
    queryFn: () => base44.entities.FluxoAprovacao.list('-created_date', 100)
  });

  const { data: solicitacoes = [] } = useQuery({
    queryKey: ['solicitacoes_aprovacao'],
    queryFn: () => base44.entities.SolicitacaoAprovacao.list('-created_date', 100)
  });

  const toggleAutomacaoMutation = useMutation({
    mutationFn: ({ id, ativa }) => base44.entities.Automacao.update(id, { ativa }),
    onSuccess: () => {
      queryClient.invalidateQueries(['automacoes']);
      toast.success('Automação atualizada');
    }
  });

  const deleteAutomacaoMutation = useMutation({
    mutationFn: (id) => base44.entities.Automacao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['automacoes']);
      toast.success('Automação excluída');
    }
  });

  const deleteFluxoMutation = useMutation({
    mutationFn: (id) => base44.entities.FluxoAprovacao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['fluxos_aprovacao']);
      toast.success('Fluxo excluído');
    }
  });

  const handleEditarAutomacao = (automacao) => {
    setAutomacaoEditando(automacao);
    setModalAutomacaoOpen(true);
  };

  const handleEditarFluxo = (fluxo) => {
    setFluxoEditando(fluxo);
    setModalFluxoOpen(true);
  };

  const solicitacoesPendentes = solicitacoes.filter(s => 
    ['pendente', 'em_analise'].includes(s.status_geral)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Automações e Fluxos</h1>
          <p className="text-slate-500 mt-1">Configure gatilhos automáticos e fluxos de aprovação</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Automações Ativas</p>
                <p className="text-2xl font-bold text-slate-900">
                  {automacoes.filter(a => a.ativa).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Fluxos Ativos</p>
                <p className="text-2xl font-bold text-slate-900">
                  {fluxos.filter(f => f.ativo).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <GitBranch className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pendentes Aprovação</p>
                <p className="text-2xl font-bold text-slate-900">{solicitacoesPendentes}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Execuções (Hoje)</p>
                <p className="text-2xl font-bold text-slate-900">
                  {automacoes.reduce((acc, a) => acc + (a.execucoes || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="automacoes" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="automacoes">Automações</TabsTrigger>
          <TabsTrigger value="fluxos">Fluxos</TabsTrigger>
          <TabsTrigger value="solicitacoes">
            Solicitações
            {solicitacoesPendentes > 0 && (
              <Badge className="ml-2 bg-orange-500">{solicitacoesPendentes}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Automações */}
        <TabsContent value="automacoes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-900">Automações Configuradas</h2>
            <Button
              onClick={() => {
                setAutomacaoEditando(null);
                setModalAutomacaoOpen(true);
              }}
              className="gap-2 bg-gradient-to-r from-green-500 to-green-600"
            >
              <Plus className="h-4 w-4" />
              Nova Automação
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {automacoes.map((automacao) => (
              <Card key={automacao.id} className={cn(
                "border-2 transition-all",
                automacao.ativa ? "border-green-200 bg-green-50/30" : "border-slate-200"
              )}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{automacao.nome}</CardTitle>
                        <Badge variant={automacao.ativa ? "default" : "secondary"} className={cn(
                          automacao.ativa && "bg-green-500"
                        )}>
                          {automacao.ativa ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <CardDescription>{automacao.descricao}</CardDescription>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleAutomacaoMutation.mutate({
                        id: automacao.id,
                        ativa: !automacao.ativa
                      })}
                    >
                      <Power className={cn(
                        "h-4 w-4",
                        automacao.ativa ? "text-green-600" : "text-slate-400"
                      )} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Zap className="h-4 w-4" />
                    <span>{TIPO_GATILHO_LABELS[automacao.tipo_gatilho]}</span>
                  </div>
                  
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-slate-500">Ações:</p>
                    {automacao.acoes?.map((acao, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="capitalize">{acao.tipo.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t">
                    <span>Executada {automacao.execucoes || 0}x</span>
                    {automacao.ultima_execucao && (
                      <span>Última: {new Date(automacao.ultima_execucao).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleEditarAutomacao(automacao)}
                    >
                      <Edit className="h-3 w-3 mr-2" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Deseja excluir esta automação?')) {
                          deleteAutomacaoMutation.mutate(automacao.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {automacoes.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Zap className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 mb-4">Nenhuma automação configurada</p>
                <Button onClick={() => setModalAutomacaoOpen(true)}>
                  Criar Primeira Automação
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Fluxos de Aprovação */}
        <TabsContent value="fluxos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-900">Fluxos de Aprovação</h2>
            <Button
              onClick={() => {
                setFluxoEditando(null);
                setModalFluxoOpen(true);
              }}
              className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600"
            >
              <Plus className="h-4 w-4" />
              Novo Fluxo
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {fluxos.map((fluxo) => (
              <Card key={fluxo.id} className={cn(
                "border-2",
                fluxo.ativo ? "border-blue-200 bg-blue-50/30" : "border-slate-200"
              )}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{fluxo.nome}</CardTitle>
                        <Badge variant={fluxo.ativo ? "default" : "secondary"} className={cn(
                          fluxo.ativo && "bg-blue-500"
                        )}>
                          {fluxo.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <CardDescription>{fluxo.descricao}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <FileCheck className="h-4 w-4" />
                    <span>{TIPO_DOCUMENTO_LABELS[fluxo.tipo_documento]}</span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-medium text-slate-500">
                      Etapas ({fluxo.etapas?.length || 0}):
                    </p>
                    {fluxo.etapas?.slice(0, 3).map((etapa, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                          {etapa.ordem}
                        </div>
                        <span>{etapa.nome}</span>
                      </div>
                    ))}
                    {fluxo.etapas?.length > 3 && (
                      <p className="text-xs text-slate-500">+ {fluxo.etapas.length - 3} etapas</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleEditarFluxo(fluxo)}
                    >
                      <Edit className="h-3 w-3 mr-2" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Deseja excluir este fluxo?')) {
                          deleteFluxoMutation.mutate(fluxo.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {fluxos.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <GitBranch className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 mb-4">Nenhum fluxo de aprovação configurado</p>
                <Button onClick={() => setModalFluxoOpen(true)}>
                  Criar Primeiro Fluxo
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Solicitações de Aprovação */}
        <TabsContent value="solicitacoes">
          <ListaSolicitacoes solicitacoes={solicitacoes} />
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs">
          <LogsAutomacao />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AutomacaoModal
        open={modalAutomacaoOpen}
        onOpenChange={(open) => {
          setModalAutomacaoOpen(open);
          if (!open) setAutomacaoEditando(null);
        }}
        automacao={automacaoEditando}
      />

      <FluxoAprovacaoModal
        open={modalFluxoOpen}
        onOpenChange={(open) => {
          setModalFluxoOpen(open);
          if (!open) setFluxoEditando(null);
        }}
        fluxo={fluxoEditando}
      />
    </div>
  );
}