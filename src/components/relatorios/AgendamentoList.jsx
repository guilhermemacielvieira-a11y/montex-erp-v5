import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Edit2, Trash2, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const DIAS_SEMANA = {
  segunda: 'Seg',
  terça: 'Ter',
  quarta: 'Qua',
  quinta: 'Qui',
  sexta: 'Sex',
  sabado: 'Sab',
  domingo: 'Dom'
};

export default function AgendamentoList({ agendamentos, onEdit, onDelete, isLoading }) {
  const [deleteId, setDeleteId] = React.useState(null);

  const getFrequenciaLabel = (agendamento) => {
    if (agendamento.frequencia === 'diaria') {
      return `Diariamente às ${agendamento.hora}`;
    }
    if (agendamento.frequencia === 'semanal') {
      return `${DIAS_SEMANA[agendamento.dia_semana]} às ${agendamento.hora}`;
    }
    if (agendamento.frequencia === 'mensal') {
      return `Dia ${agendamento.dia_mes} de cada mês às ${agendamento.hora}`;
    }
    return agendamento.frequencia;
  };

  if (isLoading) {
    return <div className="text-center py-8 text-slate-500">Carregando agendamentos...</div>;
  }

  if (agendamentos.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-12 text-center">
          <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Nenhum agendamento criado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Formatos</TableHead>
                <TableHead>Destinatários</TableHead>
                <TableHead>Próxima Geração</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agendamentos.map((agenda) => (
                <TableRow key={agenda.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium">
                    <div>
                      <p className="text-sm font-semibold">{agenda.nome}</p>
                      {agenda.projeto_nome && (
                        <p className="text-xs text-slate-500">{agenda.projeto_nome}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      agenda.tipo_relatorio === 'producao' ? 'bg-blue-100 text-blue-700' :
                      agenda.tipo_relatorio === 'financeiro' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }>
                      {agenda.tipo_relatorio === 'producao' ? 'Produção' :
                       agenda.tipo_relatorio === 'financeiro' ? 'Financeiro' : 'Ambos'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p className="font-medium">{getFrequenciaLabel(agenda)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {agenda.formatos.map(fmt => (
                        <Badge key={fmt} variant="outline" className="text-xs">
                          {fmt.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      {agenda.destinatarios.slice(0, 2).map((email, i) => (
                        <p key={i} className="text-slate-600">{email}</p>
                      ))}
                      {agenda.destinatarios.length > 2 && (
                        <p className="text-slate-500">+{agenda.destinatarios.length - 2} mais</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      {agenda.proxima_geracao ? (
                        <>
                          <Clock className="h-4 w-4 text-slate-400" />
                          {format(new Date(agenda.proxima_geracao), 'dd/MM HH:mm')}
                        </>
                      ) : (
                        <span className="text-slate-500">Não calculado</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={agenda.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                      {agenda.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(agenda)}
                        className="text-orange-600 hover:bg-orange-50"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(agenda.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(deleteId);
                setDeleteId(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}