/**
 * MONTEX ERP - Agendador de Exportações
 * Permite agendar exportações periódicas de relatórios
 * UI-only implementation com localStorage para persistência
 */
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Clock,
  Download,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Settings,
  PlayCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'montex_export_schedules';

// Tipos de relatório disponíveis
const RELATORIOS = [
  { id: 'financeiro', nome: 'Relatório Financeiro', icon: '📊' },
  { id: 'producao', nome: 'Relatório de Produção', icon: '🏭' },
  { id: 'estoque', nome: 'Relatório de Estoque', icon: '📦' },
  { id: 'dre', nome: 'DRE (Demonstração de Resultado)', icon: '📈' },
];

// Frequências disponíveis
const FREQUENCIAS = [
  { id: 'diario', nome: 'Diário', descricao: 'Todo dia às 08:00' },
  { id: 'semanal', nome: 'Semanal', descricao: 'Toda segunda-feira às 08:00' },
  { id: 'mensal', nome: 'Mensal', descricao: 'Primeiro dia do mês às 08:00' },
];

// Formatos disponíveis
const FORMATOS = [
  { id: 'xlsx', nome: 'Excel (XLSX)', ext: '.xlsx' },
  { id: 'pdf', nome: 'PDF', ext: '.pdf' },
];

/**
 * Componente principal do agendador de exportações
 */
export default function ExportScheduler() {
  const [open, setOpen] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [showForm, setShowForm] = useState(false);

  // Formulário de novo agendamento
  const [formData, setFormData] = useState({
    relatorio: 'financeiro',
    frequencia: 'semanal',
    formato: 'xlsx',
    enabled: true,
    nomeCustom: '',
  });

  // Carregar agendamentos do localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSchedules(JSON.parse(saved));
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
      }
    }
  }, []);

  // Salvar agendamentos no localStorage
  const saveSchedules = (newSchedules) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSchedules));
    setSchedules(newSchedules);
  };

  // Adicionar novo agendamento
  const handleAddSchedule = () => {
    if (!formData.relatorio || !formData.frequencia || !formData.formato) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const newSchedule = {
      id: Date.now().toString(),
      relatorio: formData.relatorio,
      frequencia: formData.frequencia,
      formato: formData.formato,
      enabled: formData.enabled,
      nomeCustom: formData.nomeCustom,
      criadoEm: new Date().toISOString(),
      ultimaExecucao: null,
      proximaExecucao: calcularProximaExecucao(formData.frequencia),
    };

    const updated = [...schedules, newSchedule];
    saveSchedules(updated);

    // Resetar formulário
    setFormData({
      relatorio: 'financeiro',
      frequencia: 'semanal',
      formato: 'xlsx',
      enabled: true,
      nomeCustom: '',
    });
    setShowForm(false);
    toast.success('Agendamento criado com sucesso!');
  };

  // Deletar agendamento
  const handleDeleteSchedule = (id) => {
    const updated = schedules.filter(s => s.id !== id);
    saveSchedules(updated);
    toast.success('Agendamento removido');
  };

  // Alternar status do agendamento
  const handleToggleSchedule = (id) => {
    const updated = schedules.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    saveSchedules(updated);
  };

  // Executar exportação manualmente
  const handleExecuteManually = (schedule) => {
    if (!schedule.enabled) {
      toast.error('Este agendamento está desativado');
      return;
    }

    toast.success(`Iniciando exportação de ${getRelatorioNome(schedule.relatorio)}...`);

    // Simular execução - em produção, isso chamaria a API de exportação
    setTimeout(() => {
      const updated = schedules.map(s =>
        s.id === schedule.id
          ? {
              ...s,
              ultimaExecucao: new Date().toISOString(),
              proximaExecucao: calcularProximaExecucao(s.frequencia),
            }
          : s
      );
      saveSchedules(updated);
      toast.success(`Exportação concluída: ${getRelatorioNome(schedule.relatorio)}_${new Date().toISOString().split('T')[0]}${getFormatoExt(schedule.formato)}`);
    }, 1000);
  };

  // Calcular próxima execução
  const calcularProximaExecucao = (frequencia) => {
    const agora = new Date();
    const proxima = new Date();

    if (frequencia === 'diario') {
      proxima.setDate(proxima.getDate() + 1);
    } else if (frequencia === 'semanal') {
      const diasAteSegunda = (1 - proxima.getDay() + 7) % 7 || 7;
      proxima.setDate(proxima.getDate() + diasAteSegunda);
    } else if (frequencia === 'mensal') {
      proxima.setMonth(proxima.getMonth() + 1);
      proxima.setDate(1);
    }

    proxima.setHours(8, 0, 0, 0);
    return proxima.toISOString();
  };

  // Helpers
  const getRelatorioNome = (id) => RELATORIOS.find(r => r.id === id)?.nome || id;
  const getRelatorioIcon = (id) => RELATORIOS.find(r => r.id === id)?.icon || '📄';
  const getFrequenciaNome = (id) => FREQUENCIAS.find(f => f.id === id)?.nome || id;
  const getFrequenciaDescricao = (id) => FREQUENCIAS.find(f => f.id === id)?.descricao || '';
  const getFormatoNome = (id) => FORMATOS.find(f => f.id === id)?.nome || id;
  const getFormatoExt = (id) => FORMATOS.find(f => f.id === id)?.ext || '';

  // Calcular tempo até próxima execução
  const tempoAteExecucao = (proximaExecucao) => {
    const proxima = new Date(proximaExecucao);
    const agora = new Date();
    const diff = proxima - agora;

    if (diff < 0) return 'Atrasado';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          title="Agendar exportações automáticas de relatórios"
        >
          <Clock className="h-4 w-4" />
          Agendar Exportações
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Agendador de Exportações
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Exportações Programadas</p>
                <p className="text-xs mt-1">Configure agendamentos para gerar relatórios automaticamente. As exportações serão salvas em seu dispositivo.</p>
              </div>
            </div>
          </div>

          {/* Lista de Agendamentos */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-semibold">
                Agendamentos Configurados ({schedules.length})
              </Label>
              {!showForm && (
                <Button
                  onClick={() => setShowForm(true)}
                  size="sm"
                  variant="outline"
                  className="gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Novo
                </Button>
              )}
            </div>

            {schedules.length === 0 ? (
              <Card className="border-2 border-dashed bg-slate-50">
                <CardContent className="pt-6">
                  <div className="text-center text-sm text-slate-500">
                    <Download className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Nenhum agendamento configurado</p>
                    <p className="text-xs mt-1">Clique em "Novo" para criar seu primeiro agendamento</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {schedules.map(schedule => (
                  <Card
                    key={schedule.id}
                    className={cn(
                      'border-l-4 transition-all',
                      schedule.enabled
                        ? 'border-l-emerald-500 bg-white'
                        : 'border-l-slate-300 bg-slate-50'
                    )}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">{getRelatorioIcon(schedule.relatorio)}</span>
                            <h4 className="font-medium">
                              {schedule.nomeCustom || getRelatorioNome(schedule.relatorio)}
                            </h4>
                            {!schedule.enabled && (
                              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                                Desativado
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-xs text-slate-600 mb-3">
                            <div>
                              <span className="font-medium">Frequência:</span>
                              <p>{getFrequenciaNome(schedule.frequencia)}</p>
                            </div>
                            <div>
                              <span className="font-medium">Formato:</span>
                              <p>{getFormatoNome(schedule.formato)}</p>
                            </div>
                            <div>
                              <span className="font-medium">Próxima:</span>
                              <p className={cn(
                                schedule.enabled ? 'text-blue-600' : 'text-slate-400'
                              )}>
                                {tempoAteExecucao(schedule.proximaExecucao)}
                              </p>
                            </div>
                          </div>

                          {schedule.ultimaExecucao && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <CheckCircle2 className="h-3 w-3" />
                              Última execução: {new Date(schedule.ultimaExecucao).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={schedule.enabled}
                            onCheckedChange={() => handleToggleSchedule(schedule.id)}
                            className="data-[state=checked]:bg-emerald-500"
                          />

                          <Button
                            onClick={() => handleExecuteManually(schedule)}
                            size="sm"
                            variant="ghost"
                            disabled={!schedule.enabled}
                            title="Executar agora"
                            className="h-8 w-8 p-0"
                          >
                            <PlayCircle className="h-4 w-4" />
                          </Button>

                          <Button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            title="Deletar agendamento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Formulário de Novo Agendamento */}
          {showForm && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base">Novo Agendamento</CardTitle>
                <CardDescription>Configure um novo cronograma de exportação</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Relatório */}
                <div className="space-y-2">
                  <Label htmlFor="relatorio">Relatório*</Label>
                  <Select
                    value={formData.relatorio}
                    onValueChange={(value) =>
                      setFormData({ ...formData, relatorio: value })
                    }
                  >
                    <SelectTrigger id="relatorio">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATORIOS.map(rel => (
                        <SelectItem key={rel.id} value={rel.id}>
                          {rel.icon} {rel.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Frequência */}
                <div className="space-y-2">
                  <Label htmlFor="frequencia">Frequência*</Label>
                  <Select
                    value={formData.frequencia}
                    onValueChange={(value) =>
                      setFormData({ ...formData, frequencia: value })
                    }
                  >
                    <SelectTrigger id="frequencia">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIAS.map(freq => (
                        <SelectItem key={freq.id} value={freq.id}>
                          {freq.nome} - {freq.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Formato */}
                <div className="space-y-2">
                  <Label htmlFor="formato">Formato*</Label>
                  <Select
                    value={formData.formato}
                    onValueChange={(value) =>
                      setFormData({ ...formData, formato: value })
                    }
                  >
                    <SelectTrigger id="formato">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATOS.map(fmt => (
                        <SelectItem key={fmt.id} value={fmt.id}>
                          {fmt.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Nome Customizado */}
                <div className="space-y-2">
                  <Label htmlFor="nomeCustom">Nome Customizado (Opcional)</Label>
                  <Input
                    id="nomeCustom"
                    placeholder="Ex: Relatório Financeiro Mensal"
                    value={formData.nomeCustom}
                    onChange={(e) =>
                      setFormData({ ...formData, nomeCustom: e.target.value })
                    }
                    className="bg-white"
                  />
                </div>

                {/* Botões */}
                <div className="flex gap-2 pt-4 border-t border-blue-200">
                  <Button
                    onClick={() => setShowForm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddSchedule}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Agendamento
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notas */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
            <p className="font-medium mb-2">Observações:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>As exportações são agendadas para as 08:00 (horário local)</li>
              <li>Você pode executar manualmente usando o ícone de play</li>
              <li>Os agendamentos são salvos no seu navegador (localStorage)</li>
              <li>Desative agendamentos que não deseja mais usar</li>
              <li>Integração com backend será adicionada em versões futuras</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
