import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, LayoutGrid, List, Search, CheckCircle2, Clock, AlertTriangle, Sparkles, Users, Factory } from 'lucide-react';
import KanbanBoard from '../components/tarefas/KanbanBoard';
import TaskList from '../components/tarefas/TaskList';
import TaskModal from '../components/tarefas/TaskModal';
import TaskAIAnalysis from '../components/tarefas/TaskAIAnalysis';
import ResourceManagementAI from '../components/tarefas/ResourceManagementAI';
import ImportarPlanilha from '../components/producao/ImportarPlanilha';
import AcompanhamentoProducao from '../components/producao/AcompanhamentoProducao';

export default function Tarefas() {
  const [showModal, setShowModal] = useState(false);
  const [tarefaSelecionada, setTarefaSelecionada] = useState(null);
  const [visao, setVisao] = useState('kanban');
  const [mostrarAnaliseIA, setMostrarAnaliseIA] = useState(false);
  const [mostrarGestaoRecursos, setMostrarGestaoRecursos] = useState(false);
  const [showProducao, setShowProducao] = useState(false);
  const [projetoProducao, setProjetoProducao] = useState(null);
  const [filtros, setFiltros] = useState({
    projeto: 'todos',
    responsavel: 'todos',
    status: 'todos',
    busca: ''
  });

  const queryClient = useQueryClient();

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ['tarefas'],
    queryFn: () => base44.entities.Tarefa.list('-created_date', 200)
  });

  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => base44.entities.Projeto.list()
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => base44.entities.User.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Tarefa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      setShowModal(false);
      setTarefaSelecionada(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Tarefa.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      setShowModal(false);
      setTarefaSelecionada(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Tarefa.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
    }
  });

  const handleSave = (data) => {
    if (tarefaSelecionada) {
      updateMutation.mutate({ id: tarefaSelecionada.id, data });
      toast.success('Tarefa atualizada com sucesso!');
    } else {
      createMutation.mutate(data);
      toast.success('Tarefa criada com sucesso!');
    }
  };

  const handleStatusChange = (tarefa, novoStatus) => {
    const dataUpdate = {
      ...tarefa,
      status: novoStatus,
      ...(novoStatus === 'concluida' && !tarefa.data_conclusao ? {
        data_conclusao: new Date().toISOString(),
        percentual_conclusao: 100
      } : {})
    };
    updateMutation.mutate({ id: tarefa.id, data: dataUpdate });
    toast.success(`Tarefa movida para ${novoStatus}`);
  };

  const handleStatusToggle = (tarefa) => {
    const novoStatus = tarefa.status === 'concluida' ? 'pendente' : 'concluida';
    handleStatusChange(tarefa, novoStatus);
  };

  const handleTaskClick = (tarefa) => {
    setTarefaSelecionada(tarefa);
    setShowModal(true);
  };

  const handleDelete = (tarefa) => {
    if (confirm(`Deseja realmente excluir a tarefa "${tarefa.titulo}"?`)) {
      deleteMutation.mutate(tarefa.id);
      toast.success('Tarefa excluída com sucesso!');
    }
  };

  const tarefasFiltradas = tarefas.filter(tarefa => {
    if (filtros.projeto !== 'todos' && tarefa.projeto_id !== filtros.projeto) return false;
    if (filtros.responsavel !== 'todos' && tarefa.responsavel !== filtros.responsavel) return false;
    if (filtros.status !== 'todos' && tarefa.status !== filtros.status) return false;
    if (filtros.busca && !tarefa.titulo.toLowerCase().includes(filtros.busca.toLowerCase())) return false;
    return true;
  });

  const estatisticas = {
    total: tarefas.length,
    pendentes: tarefas.filter(t => t.status === 'pendente').length,
    em_andamento: tarefas.filter(t => t.status === 'em_andamento').length,
    concluidas: tarefas.filter(t => t.status === 'concluida').length,
    atrasadas: tarefas.filter(t => {
      if (!t.data_fim || t.status === 'concluida') return false;
      return new Date(t.data_fim) < new Date();
    }).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gerenciador de Tarefas e Produção</h1>
          <p className="text-slate-500 mt-1">Organize tarefas e controle produção por etapas</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <ImportarPlanilha 
            projetos={projetos}
            onImportSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['itens-producao'] });
            }}
          />
          <Button
            onClick={() => setMostrarGestaoRecursos(true)}
            variant="outline"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Users className="h-4 w-4 mr-2" />
            Recursos
          </Button>
          <Button
            onClick={() => setMostrarAnaliseIA(true)}
            variant="outline"
            className="border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            IA
          </Button>
          <Button
            onClick={() => {
              setTarefaSelecionada(null);
              setShowModal(true);
            }}
            className="bg-gradient-to-r from-orange-500 to-orange-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold">{estatisticas.total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <LayoutGrid className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pendentes</p>
                <p className="text-2xl font-bold">{estatisticas.pendentes}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Em Andamento</p>
                <p className="text-2xl font-bold">{estatisticas.em_andamento}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Concluídas</p>
                <p className="text-2xl font-bold">{estatisticas.concluidas}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Atrasadas</p>
                <p className="text-2xl font-bold text-red-600">{estatisticas.atrasadas}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar tarefas..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filtros.projeto} onValueChange={(value) => setFiltros({ ...filtros, projeto: value })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Projetos</SelectItem>
                {projetos.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtros.responsavel} onValueChange={(value) => setFiltros({ ...filtros, responsavel: value })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {usuarios.map(u => (
                  <SelectItem key={u.email} value={u.email}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtros.status} onValueChange={(value) => setFiltros({ ...filtros, status: value })}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="bloqueada">Bloqueada</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2 border-l pl-4">
              <Button
                variant={visao === 'kanban' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setVisao('kanban')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={visao === 'lista' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setVisao('lista')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acompanhamento de Produção */}
      {showProducao && projetoProducao && (
        <Card className="border-2 border-emerald-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-emerald-600" />
                Acompanhamento de Produção - {projetoProducao.nome}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowProducao(false);
                  setProjetoProducao(null);
                }}
              >
                Fechar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AcompanhamentoProducao
              projetoId={projetoProducao.id}
              projetoNome={projetoProducao.nome}
            />
          </CardContent>
        </Card>
      )}

      {!showProducao && !mostrarAnaliseIA && !mostrarGestaoRecursos && projetos.length > 0 && (
        <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center">
                  <Factory className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Controle de Produção por Projeto</h3>
                  <p className="text-sm text-slate-600">
                    Acompanhe fabricação e montagem com lançamentos diários
                  </p>
                </div>
              </div>
              <Select 
                value={projetoProducao?.id || ''} 
                onValueChange={(value) => {
                  const proj = projetos.find(p => p.id === value);
                  setProjetoProducao(proj);
                  setShowProducao(true);
                }}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Selecionar Projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projetos.filter(p => ['aprovado', 'em_fabricacao', 'em_montagem'].includes(p.status)).map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gestão de Recursos IA */}
      {mostrarGestaoRecursos && (
        <ResourceManagementAI
          tarefas={tarefas}
          usuarios={usuarios}
          projetos={projetos}
          onClose={() => setMostrarGestaoRecursos(false)}
        />
      )}

      {/* Análise IA */}
      {mostrarAnaliseIA && !mostrarGestaoRecursos && (
        <TaskAIAnalysis
          tarefas={tarefas}
          projetos={projetos}
          onClose={() => setMostrarAnaliseIA(false)}
        />
      )}

      {/* Conteúdo */}
      {!mostrarAnaliseIA && !mostrarGestaoRecursos && !showProducao && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-slate-500">Carregando tarefas...</p>
            </div>
          ) : visao === 'kanban' ? (
            <KanbanBoard
              tarefas={tarefasFiltradas}
              onStatusChange={handleStatusChange}
              onTaskClick={handleTaskClick}
            />
          ) : (
            <TaskList
              tarefas={tarefasFiltradas}
              onTaskClick={handleTaskClick}
              onDelete={handleDelete}
              onStatusToggle={handleStatusToggle}
            />
          )}
        </>
      )}

      {/* Modal */}
      <TaskModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setTarefaSelecionada(null);
        }}
        tarefa={tarefaSelecionada}
        projetos={projetos}
        usuarios={usuarios}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}