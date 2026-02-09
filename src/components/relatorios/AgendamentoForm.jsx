import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';

const DIAS_SEMANA = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

export default function AgendamentoForm({ agendamento, onSave, onCancel, projetos = [] }) {
  const [formData, setFormData] = useState(agendamento || {
    nome: '',
    tipo_relatorio: 'producao',
    frequencia: 'semanal',
    dia_semana: 'segunda',
    dia_mes: 1,
    hora: '08:00',
    formatos: ['pdf'],
    destinatarios: [],
    incluir_graficos: true,
    incluir_analise: true,
    ativo: true,
    projeto_id: '',
    projeto_nome: ''
  });

  const [novoEmail, setNovoEmail] = useState('');

  const handleAddEmail = () => {
    if (!novoEmail || !novoEmail.includes('@')) {
      toast.error('Email inválido');
      return;
    }
    if (formData.destinatarios.includes(novoEmail)) {
      toast.error('Email já adicionado');
      return;
    }
    setFormData({
      ...formData,
      destinatarios: [...formData.destinatarios, novoEmail]
    });
    setNovoEmail('');
  };

  const handleRemoveEmail = (email) => {
    setFormData({
      ...formData,
      destinatarios: formData.destinatarios.filter(e => e !== email)
    });
  };

  const toggleFormato = (formato) => {
    const novosFormatos = formData.formatos.includes(formato)
      ? formData.formatos.filter(f => f !== formato)
      : [...formData.formatos, formato];
    setFormData({ ...formData, formatos: novosFormatos });
  };

  const handleSave = () => {
    if (!formData.nome.trim()) {
      toast.error('Nome do agendamento obrigatório');
      return;
    }
    if (formData.destinatarios.length === 0) {
      toast.error('Adicione pelo menos um destinatário');
      return;
    }
    if (formData.formatos.length === 0) {
      toast.error('Selecione pelo menos um formato');
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {agendamento ? 'Editar Agendamento' : 'Novo Agendamento de Relatório'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
          {/* Nome */}
          <div className="space-y-2">
            <Label>Nome do Agendamento *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Relatório Semanal Produção"
            />
          </div>

          {/* Tipo de Relatório */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório *</Label>
              <Select value={formData.tipo_relatorio} onValueChange={(v) => setFormData({ ...formData, tipo_relatorio: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Projeto */}
            <div className="space-y-2">
              <Label>Projeto (Opcional)</Label>
              <Select 
                value={formData.projeto_id || ''} 
                onValueChange={(id) => {
                  const proj = projetos.find(p => p.id === id);
                  setFormData({ 
                    ...formData, 
                    projeto_id: id,
                    projeto_nome: proj?.nome || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos os projetos</SelectItem>
                  {projetos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Frequência */}
          <div className="space-y-2">
            <Label>Frequência *</Label>
            <Select value={formData.frequencia} onValueChange={(v) => setFormData({ ...formData, frequencia: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diaria">Diária</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Frequência Semanal */}
          {formData.frequencia === 'semanal' && (
            <div className="space-y-2">
              <Label>Dia da Semana</Label>
              <Select value={formData.dia_semana} onValueChange={(v) => setFormData({ ...formData, dia_semana: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIAS_SEMANA.map(dia => (
                    <SelectItem key={dia} value={dia}>
                      {dia.charAt(0).toUpperCase() + dia.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Frequência Mensal */}
          {formData.frequencia === 'mensal' && (
            <div className="space-y-2">
              <Label>Dia do Mês (1-31)</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.dia_mes}
                onChange={(e) => setFormData({ ...formData, dia_mes: parseInt(e.target.value) })}
              />
            </div>
          )}

          {/* Hora */}
          <div className="space-y-2">
            <Label>Hora de Geração (HH:mm) *</Label>
            <Input
              type="time"
              value={formData.hora}
              onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
            />
          </div>

          {/* Formatos */}
          <div className="space-y-3">
            <Label>Formatos de Saída *</Label>
            <div className="space-y-2">
              {['pdf', 'csv', 'xlsx'].map(formato => (
                <div key={formato} className="flex items-center gap-2">
                  <Checkbox
                    id={formato}
                    checked={formData.formatos.includes(formato)}
                    onCheckedChange={() => toggleFormato(formato)}
                  />
                  <label htmlFor={formato} className="text-sm cursor-pointer">
                    {formato.toUpperCase()}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Opções PDF */}
          {formData.formatos.includes('pdf') && (
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="graficos"
                  checked={formData.incluir_graficos}
                  onCheckedChange={(checked) => setFormData({ ...formData, incluir_graficos: checked })}
                />
                <label htmlFor="graficos" className="text-sm cursor-pointer">
                  Incluir gráficos no PDF
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="analise"
                  checked={formData.incluir_analise}
                  onCheckedChange={(checked) => setFormData({ ...formData, incluir_analise: checked })}
                />
                <label htmlFor="analise" className="text-sm cursor-pointer">
                  Incluir análise IA
                </label>
              </div>
            </div>
          )}

          {/* Destinatários */}
          <div className="space-y-3">
            <Label>Destinatários (E-mail) *</Label>
            <div className="flex gap-2">
              <Input
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                placeholder="Email do destinatário"
              />
              <Button
                type="button"
                onClick={handleAddEmail}
                variant="outline"
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {formData.destinatarios.length > 0 && (
              <div className="space-y-2">
                {formData.destinatarios.map((email) => (
                  <div key={email} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <span className="text-sm">{email}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEmail(email)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="ativo"
              checked={formData.ativo}
              onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
            />
            <label htmlFor="ativo" className="text-sm cursor-pointer">
              Agendamento ativo
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-orange-500 to-orange-600"
          >
            {agendamento ? 'Atualizar' : 'Criar'} Agendamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}