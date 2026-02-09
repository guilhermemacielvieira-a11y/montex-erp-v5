import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, CheckCircle2, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  pendente: {
    label: 'Pendente',
    color: 'bg-slate-100 border-slate-200',
    icon: Clock,
    iconColor: 'text-slate-600'
  },
  em_andamento: {
    label: 'Em Andamento',
    color: 'bg-blue-50 border-blue-200',
    icon: AlertCircle,
    iconColor: 'text-blue-600'
  },
  concluida: {
    label: 'Concluída',
    color: 'bg-emerald-50 border-emerald-200',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600'
  },
  bloqueada: {
    label: 'Bloqueada',
    color: 'bg-red-50 border-red-200',
    icon: AlertCircle,
    iconColor: 'text-red-600'
  }
};

const prioridadeConfig = {
  baixa: { label: 'Baixa', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  media: { label: 'Média', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  alta: { label: 'Alta', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  urgente: { label: 'Urgente', className: 'bg-red-100 text-red-700 border-red-200' }
};

export default function KanbanBoard({ tarefas, onStatusChange, onTaskClick }) {
  const colunas = ['pendente', 'em_andamento', 'concluida', 'bloqueada'];

  const tarefasPorStatus = colunas.map(status => ({
    status,
    tarefas: tarefas.filter(t => t.status === status)
  }));

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const novoStatus = destination.droppableId;
    const tarefa = tarefas.find(t => t.id === draggableId);

    if (tarefa && tarefa.status !== novoStatus) {
      onStatusChange(tarefa, novoStatus);
    }
  };

  const isAtrasada = (tarefa) => {
    if (!tarefa.data_fim || tarefa.status === 'concluida') return false;
    return new Date(tarefa.data_fim) < new Date();
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tarefasPorStatus.map(({ status, tarefas: tarefasColuna }) => {
          const config = statusConfig[status];
          const Icon = config.icon;

          return (
            <div key={status} className="flex flex-col">
              <div className={`p-3 rounded-t-lg border-2 ${config.color}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${config.iconColor}`} />
                    <h3 className="font-semibold text-sm">{config.label}</h3>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {tarefasColuna.length}
                  </Badge>
                </div>
              </div>

              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-2 space-y-2 min-h-[500px] rounded-b-lg border-2 border-t-0 ${
                      config.color
                    } ${snapshot.isDraggingOver ? 'bg-slate-100' : 'bg-white'}`}
                  >
                    {tarefasColuna.map((tarefa, index) => {
                      const atrasada = isAtrasada(tarefa);
                      
                      return (
                        <Draggable key={tarefa.id} draggableId={tarefa.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => onTaskClick(tarefa)}
                              className={`cursor-pointer ${
                                snapshot.isDragging ? 'opacity-50' : ''
                              }`}
                            >
                              <Card className={`hover:shadow-md transition-shadow ${
                                atrasada ? 'border-red-300 border-2' : ''
                              }`}>
                                <CardContent className="p-3">
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className="font-medium text-sm line-clamp-2">
                                        {tarefa.titulo}
                                      </h4>
                                      <Badge 
                                        variant="outline" 
                                        className={`text-xs flex-shrink-0 ${prioridadeConfig[tarefa.prioridade]?.className}`}
                                      >
                                        {prioridadeConfig[tarefa.prioridade]?.label}
                                      </Badge>
                                    </div>

                                    {tarefa.descricao && (
                                      <p className="text-xs text-slate-500 line-clamp-2">
                                        {tarefa.descricao}
                                      </p>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                      {tarefa.responsavel_nome && (
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          <span className="truncate max-w-[100px]">
                                            {tarefa.responsavel_nome.split(' ')[0]}
                                          </span>
                                        </div>
                                      )}
                                      {tarefa.data_fim && (
                                        <div className={`flex items-center gap-1 ${
                                          atrasada ? 'text-red-600 font-semibold' : ''
                                        }`}>
                                          <Calendar className="h-3 w-3" />
                                          <span>
                                            {format(new Date(tarefa.data_fim), 'dd/MM', { locale: ptBR })}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {tarefa.percentual_conclusao > 0 && (
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                          <span className="text-slate-500">Progresso</span>
                                          <span className="font-semibold">{tarefa.percentual_conclusao}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                                          <div
                                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                                            style={{ width: `${tarefa.percentual_conclusao}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {tarefa.etiquetas && tarefa.etiquetas.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {tarefa.etiquetas.slice(0, 2).map((etiqueta, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs px-1.5 py-0">
                                            {etiqueta}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}