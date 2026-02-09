import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const CORES_PRIORIDADE = {
  baixa: 'bg-blue-500',
  media: 'bg-yellow-500',
  alta: 'bg-orange-500',
  urgente: 'bg-red-500'
};

const STATUS_CORES = {
  pendente: 'bg-slate-400',
  em_andamento: 'bg-blue-500',
  concluida: 'bg-green-500',
  bloqueada: 'bg-red-500'
};

export default function GanttChart({ tarefas, projetos }) {
  const [zoom, setZoom] = useState(1);
  const [scrollDate, setScrollDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);

  const diasVisiveis = Math.floor(30 / zoom);
  
  const getDataRange = () => {
    const inicio = new Date(scrollDate);
    inicio.setDate(inicio.getDate() - Math.floor(diasVisiveis / 2));
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + diasVisiveis);
    return { inicio, fim };
  };

  const { inicio: dataInicio, fim: dataFim } = getDataRange();

  const getDayPosition = (date) => {
    if (!date) return 0;
    const diff = new Date(date) - dataInicio;
    const totalDiff = dataFim - dataInicio;
    return (diff / totalDiff) * 100;
  };

  const getTaskWidth = (task) => {
    if (!task.data_inicio || !task.data_fim) return 10;
    const inicio = getDayPosition(task.data_inicio);
    const fim = getDayPosition(task.data_fim);
    return Math.max(fim - inicio, 5);
  };

  const scroll = (direction) => {
    const newDate = new Date(scrollDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setScrollDate(newDate);
  };

  const hoje = new Date();
  const posicaoHoje = getDayPosition(hoje);

  return (
    <Card className="border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            Cronograma Gantt
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setZoom(Math.min(2, zoom + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => scroll(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => scroll(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setScrollDate(new Date())}>
              Hoje
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-x-auto">
          {/* Timeline Header */}
          <div className="flex border-b border-slate-700 pb-2 mb-4">
            {Array.from({ length: diasVisiveis }, (_, i) => {
              const data = new Date(dataInicio);
              data.setDate(data.getDate() + i);
              const isWeekend = data.getDay() === 0 || data.getDay() === 6;
              const isToday = data.toDateString() === hoje.toDateString();
              
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 text-center text-xs",
                    isWeekend && "bg-slate-800/30",
                    isToday && "bg-blue-500/20 font-bold"
                  )}
                >
                  <div className={cn("text-slate-400", isToday && "text-blue-400")}>
                    {data.getDate()}/{data.getMonth() + 1}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tasks */}
          <div className="space-y-3 min-h-[400px] relative">
            {/* Linha "Hoje" */}
            {posicaoHoje >= 0 && posicaoHoje <= 100 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
                style={{ left: `${posicaoHoje}%` }}
              >
                <div className="absolute -top-2 -left-8 text-xs text-blue-400 font-semibold">
                  Hoje
                </div>
              </div>
            )}

            {tarefas.map((tarefa) => {
              const posicao = getDayPosition(tarefa.data_inicio);
              const largura = getTaskWidth(tarefa);
              const projeto = projetos.find(p => p.id === tarefa.projeto_id);
              
              if (posicao + largura < 0 || posicao > 100) return null;

              const dependencias = tarefas.filter(t => 
                tarefa.dependencias?.includes(t.id)
              );

              return (
                <div key={tarefa.id} className="relative h-12 group">
                  {/* Dependências */}
                  {dependencias.map(dep => {
                    const depPos = getDayPosition(dep.data_fim);
                    if (depPos < posicao && depPos >= 0) {
                      return (
                        <svg
                          key={dep.id}
                          className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30 group-hover:opacity-70 transition-opacity"
                          style={{ zIndex: 0 }}
                        >
                          <line
                            x1={`${depPos}%`}
                            y1="50%"
                            x2={`${posicao}%`}
                            y2="50%"
                            stroke="#f97316"
                            strokeWidth="2"
                            strokeDasharray="4"
                          />
                        </svg>
                      );
                    }
                    return null;
                  })}

                  {/* Barra da Tarefa */}
                  <div
                    className={cn(
                      "absolute h-10 rounded-lg shadow-lg cursor-pointer transition-all hover:scale-105 hover:z-20",
                      STATUS_CORES[tarefa.status] || 'bg-slate-500',
                      selectedTask?.id === tarefa.id && "ring-2 ring-white"
                    )}
                    style={{
                      left: `${Math.max(0, posicao)}%`,
                      width: `${largura}%`,
                      opacity: 0.9
                    }}
                    onClick={() => setSelectedTask(tarefa)}
                  >
                    <div className="h-full flex items-center px-3 text-white text-sm font-medium truncate">
                      {tarefa.titulo}
                    </div>
                    
                    {/* Progress */}
                    {tarefa.percentual_conclusao > 0 && (
                      <div
                        className="absolute bottom-0 left-0 h-1 bg-white/40 rounded-b-lg"
                        style={{ width: `${tarefa.percentual_conclusao}%` }}
                      />
                    )}
                  </div>

                  {/* Info lateral */}
                  <div className="absolute left-0 top-0 -ml-48 w-44 h-10 flex items-center justify-end pr-2 text-sm text-slate-400">
                    <div className="truncate">{projeto?.nome || 'Sem projeto'}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Task Details */}
          {selectedTask && (
            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedTask.titulo}</h3>
                  <p className="text-sm text-slate-400">{selectedTask.descricao}</p>
                </div>
                <Badge className={CORES_PRIORIDADE[selectedTask.prioridade]}>
                  {selectedTask.prioridade}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Início:</span>
                  <span className="text-white ml-2">
                    {selectedTask.data_inicio ? new Date(selectedTask.data_inicio).toLocaleDateString('pt-BR') : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Fim:</span>
                  <span className="text-white ml-2">
                    {selectedTask.data_fim ? new Date(selectedTask.data_fim).toLocaleDateString('pt-BR') : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Progresso:</span>
                  <span className="text-white ml-2">{selectedTask.percentual_conclusao || 0}%</span>
                </div>
              </div>
              
              {selectedTask.responsavel && (
                <div className="mt-3 text-sm">
                  <span className="text-slate-400">Responsável:</span>
                  <span className="text-white ml-2">{selectedTask.responsavel_nome || selectedTask.responsavel}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}