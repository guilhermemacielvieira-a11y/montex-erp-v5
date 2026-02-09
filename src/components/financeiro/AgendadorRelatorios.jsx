import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Loader2, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';

const FREQUENCIAS = [
  { id: 'diaria', label: 'Diária' },
  { id: 'semanal', label: 'Semanal' },
  { id: 'quinzenal', label: 'Quinzenal' },
  { id: 'mensal', label: 'Mensal' },
];

const DIAS_SEMANA = [
  { id: 'segunda', label: 'Segunda' },
  { id: 'terca', label: 'Terça' },
  { id: 'quarta', label: 'Quarta' },
  { id: 'quinta', label: 'Quinta' },
  { id: 'sexta', label: 'Sexta' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' },
];

export default function AgendadorRelatorios() {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    modelo_relatorio_id: '',
    frequencia: 'mensal',
    dia_semana: 'segunda',
    dia_mes: '1',
    hora: '09:00',
    destinatarios: '',
    incluir_no_email: true,
    mensagem_personalizada: '',
  });

  const queryClient = useQueryClient();

  const { data: modelos = [] } = useQuery({
    queryKey: ['modelos-relatorio'],
    queryFn: () => base44.entities.ModeloRelatorio.list('-created_date', 100),
  });

  const { data: agendamentos = [] } = useQuery({
    queryKey: ['agendamentos-relatorio'],
    queryFn: () => base44.entities.AgendamentoRelatorioRecorrente.list('-created_date', 100),
  });

  const criarAgendamentoMutation = useMutation({
    mutationFn: (data) => {
      const destinatarios = data.destinatarios.split(',').map(e => e.trim()).filter(e => e);
      const modeloSelecionado = modelos.find(m => m.id === data.modelo_relatorio_id);
      
      return base44.entities.AgendamentoRelatorioRecorrente.create({
        nome: data.nome,
        modelo_relatorio_id: data.modelo_relatorio_id,
        modelo_relatorio_nome: modeloSelecionado?.nome,
        frequencia: data.frequencia,
        dia_semana: data.dia_semana,
        dia_mes: parseInt(data.dia_mes),
        hora: data.hora,
        destinatarios,
        incluir_no_email: data.incluir_no_email,
        mensagem_personalizada: data.mensagem_personalizada,
        ativo: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-relatorio'] });
      toast.success('Agendamento criado com sucesso!');
      setMostrarModal(false);
      setFormData({
        nome: '',
        modelo_relatorio_id: '',
        frequencia: 'mensal',
        dia_semana: 'segunda',
        dia_mes: '1',
        hora: '09:00',
        destinatarios: '',
        incluir_no_email: true,
        mensagem_personalizada: '',
      });
    },
    onError: () => {
      toast.error('Erro ao criar agendamento');
    }
  });

  const deletarAgendamentoMutation = useMutation({
    mutationFn: (id) => base44.entities.AgendamentoRelatorioRecorrente.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agendamentos-relatorio'] });
      toast.success('Agendamento removido');
    },
  });

  const handleSalvar = async () => {
    if (!formData.nome || !formData.modelo_relatorio_id || !formData.destinatarios) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    await criarAgendamentoMutation.mutateAsync(formData);
  };

  const getDescricaoFrequencia = (agenda) => {
    if (agenda.frequencia === 'diaria') return 'Diariamente';
    if (agenda.frequencia === 'semanal') {
      const dia = DIAS_SEMANA.find(d => d.id === agenda.dia_semana)?.label || '';
      return `${dia} de cada semana`;
    }
    if (agenda.frequencia === 'quinzenal') return 'A cada 15 dias';
    if (agenda.frequencia === 'mensal') return `Dia ${agenda.dia_mes} de cada mês`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Agendamentos de Relatórios</h2>
          <p className="text-sm text-slate-600 mt-1">Gere e envie relatórios automaticamente</p>
        </div>
        <Dialog open={mostrarModal} onOpenChange={setMostrarModal}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-500 to-green-600 gap-2">
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agendar Geração de Relatório</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm">Nome do Agendamento *</Label>
                <Input
                  placeholder="Ex: Relatório Mensal de Despesas"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Modelo de Relatório *</Label>
                <Select value={formData.modelo_relatorio_id} onValueChange={(v) => setFormData({ ...formData, modelo_relatorio_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelos.filter(m => m.ativo).map(modelo => (
                      <SelectItem key={modelo.id} value={modelo.id}>{modelo.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Frequência *</Label>
                <Select value={formData.frequencia} onValueChange={(v) => setFormData({ ...formData, frequencia: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIAS.map(freq => (
                      <SelectItem key={freq.id} value={freq.id}>{freq.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.frequencia === 'semanal' && (
                <div className="space-y-2">
                  <Label className="text-sm">Dia da Semana</Label>
                  <Select value={formData.dia_semana} onValueChange={(v) => setFormData({ ...formData, dia_semana: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAS_SEMANA.map(dia => (
                        <SelectItem key={dia.id} value={dia.id}>{dia.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.frequencia === 'mensal' && (
                <div className="space-y-2">
                  <Label className="text-sm">Dia do Mês</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dia_mes}
                    onChange={(e) => setFormData({ ...formData, dia_mes: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm">Hora da Geração *</Label>
                <Input
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Destinatários (emails separados por vírgula) *</Label>
                <Input
                  placeholder="exemplo@email.com, outro@email.com"
                  value={formData.destinatarios}
                  onChange={(e) => setFormData({ ...formData, destinatarios: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Mensagem Personalizada</Label>
                <Input
                  placeholder="Mensagem opcional para o email"
                  value={formData.mensagem_personalizada}
                  onChange={(e) => setFormData({ ...formData, mensagem_personalizada: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setMostrarModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSalvar}
                  disabled={criarAgendamentoMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {criarAgendamentoMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Agendamento'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Agendamentos Ativos ({agendamentos.filter(a => a.ativo).length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {agendamentos.filter(a => a.ativo).length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <p className="text-sm">Nenhum agendamento ativo. Crie um novo agendamento para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Nome</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Destinatários</TableHead>
                    <TableHead>Próxima Geração</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agendamentos.filter(a => a.ativo).map(agenda => (
                    <TableRow key={agenda.id}>
                      <TableCell className="font-medium">{agenda.nome}</TableCell>
                      <TableCell className="text-sm">{agenda.modelo_relatorio_nome}</TableCell>
                      <TableCell className="text-sm">{getDescricaoFrequencia(agenda)}</TableCell>
                      <TableCell className="text-sm">{agenda.hora}</TableCell>
                      <TableCell className="text-sm">{agenda.destinatarios.length} emails</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {agenda.proxima_geracao ? new Date(agenda.proxima_geracao).toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deletarAgendamentoMutation.mutate(agenda.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}