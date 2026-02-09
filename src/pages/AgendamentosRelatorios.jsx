import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import AgendamentoForm from '@/components/relatorios/AgendamentoForm';
import AgendamentoList from '@/components/relatorios/AgendamentoList';

export default function AgendamentosRelatorios() {
  const [showForm, setShowForm] = useState(false);
  const [editandoAgendamento, setEditandoAgendamento] = useState(null);
  const queryClient = useQueryClient();

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['agendamentos-relatorios'],
    queryFn: () => base44.entities.AgendamentoRelatorio.list('-created_date', 100)
  });

  const { data: projetos = [] } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => base44.entities.Projeto.list('-created_date', 100)
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.AgendamentoRelatorio.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-relatorios'] });
      toast.success('Agendamento criado com sucesso');
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AgendamentoRelatorio.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-relatorios'] });
      toast.success('Agendamento atualizado com sucesso');
      setShowForm(false);
      setEditandoAgendamento(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AgendamentoRelatorio.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-relatorios'] });
      toast.success('Agendamento excluído com sucesso');
    }
  });

  const handleSave = (formData) => {
    if (editandoAgendamento) {
      updateMutation.mutate({
        id: editandoAgendamento.id,
        data: formData
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (agendamento) => {
    setEditandoAgendamento(agendamento);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditandoAgendamento(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Agendamento de Relatórios</h1>
          <p className="text-slate-500 mt-1">Configure a geração automática de relatórios de produção e financeiros</p>
        </div>
        <Button
          onClick={() => {
            setEditandoAgendamento(null);
            setShowForm(true);
          }}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-slate-700">
          <strong>Nota:</strong> Para que os relatórios sejam gerados automaticamente, é necessário que as backend functions estejam habilitadas.
          Os agendamentos aqui criados armazenam as configurações para serem processadas pelo sistema.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Agendamentos</p>
                <p className="text-3xl font-bold text-slate-900">{agendamentos.length}</p>
              </div>
              <Calendar className="h-12 w-12 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Agendamentos Ativos</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {agendamentos.filter(a => a.ativo).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Próxima Geração</p>
                <p className="text-sm font-semibold text-slate-900">
                  {agendamentos.filter(a => a.ativo && a.proxima_geracao).length > 0 
                    ? 'Configurados' 
                    : 'Nenhum'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Agendamentos */}
      <AgendamentoList
        agendamentos={agendamentos}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      {/* Frequências Suportadas */}
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader>
          <CardTitle className="text-lg">Frequências Suportadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Diária</h4>
            <p className="text-sm text-slate-600">O relatório será gerado todos os dias na hora especificada.</p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Semanal</h4>
            <p className="text-sm text-slate-600">O relatório será gerado em um dia específico da semana na hora especificada.</p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Mensal</h4>
            <p className="text-sm text-slate-600">O relatório será gerado em um dia específico do mês na hora especificada.</p>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      {showForm && (
        <AgendamentoForm
          agendamento={editandoAgendamento}
          onSave={handleSave}
          onCancel={handleCloseForm}
          projetos={projetos}
        />
      )}
    </div>
  );
}