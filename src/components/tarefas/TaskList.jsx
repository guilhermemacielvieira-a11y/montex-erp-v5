import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const prioridadeConfig = {
  baixa: { label: 'Baixa', className: 'bg-slate-100 text-slate-700' },
  media: { label: 'Média', className: 'bg-blue-100 text-blue-700' },
  alta: { label: 'Alta', className: 'bg-orange-100 text-orange-700' },
  urgente: { label: 'Urgente', className: 'bg-red-100 text-red-700' }
};

const statusConfig = {
  pendente: { label: 'Pendente', className: 'bg-slate-100 text-slate-700' },
  em_andamento: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-700' },
  concluida: { label: 'Concluída', className: 'bg-emerald-100 text-emerald-700' },
  bloqueada: { label: 'Bloqueada', className: 'bg-red-100 text-red-700' }
};

export default function TaskList({ tarefas, onTaskClick, onDelete, onStatusToggle }) {
  const isAtrasada = (tarefa) => {
    if (!tarefa.data_fim || tarefa.status === 'concluida') return false;
    return new Date(tarefa.data_fim) < new Date();
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Tarefa</TableHead>
            <TableHead>Projeto</TableHead>
            <TableHead>Responsável</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead>Progresso</TableHead>
            <TableHead className="w-24">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tarefas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                Nenhuma tarefa encontrada
              </TableCell>
            </TableRow>
          ) : (
            tarefas.map((tarefa) => {
              const atrasada = isAtrasada(tarefa);
              
              return (
                <TableRow 
                  key={tarefa.id} 
                  className={`cursor-pointer hover:bg-slate-50 ${
                    atrasada ? 'bg-red-50' : ''
                  }`}
                  onClick={() => onTaskClick(tarefa)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={tarefa.status === 'concluida'}
                      onCheckedChange={() => onStatusToggle(tarefa)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className={`font-medium ${tarefa.status === 'concluida' ? 'line-through text-slate-400' : ''}`}>
                        {tarefa.titulo}
                      </p>
                      {tarefa.descricao && (
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {tarefa.descricao}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">{tarefa.projeto_nome || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tarefa.responsavel_nome ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-semibold text-blue-700">
                              {tarefa.responsavel_nome.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm">{tarefa.responsavel_nome}</span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">Não atribuído</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={prioridadeConfig[tarefa.prioridade]?.className}>
                      {prioridadeConfig[tarefa.prioridade]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusConfig[tarefa.status]?.className}>
                      {statusConfig[tarefa.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tarefa.data_fim ? (
                      <div className={`flex items-center gap-1 text-sm ${
                        atrasada ? 'text-red-600 font-semibold' : 'text-slate-600'
                      }`}>
                        <Calendar className="h-3 w-3" />
                        {format(new Date(tarefa.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                        {atrasada && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            Atrasada
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${tarefa.percentual_conclusao || 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold w-8">
                        {tarefa.percentual_conclusao || 0}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onTaskClick(tarefa)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600 hover:text-red-700"
                        onClick={() => onDelete(tarefa)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}