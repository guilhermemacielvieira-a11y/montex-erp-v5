import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, MoveUp, MoveDown } from 'lucide-react';
import { toast } from 'sonner';

const TIPO_DOCUMENTO_OPTIONS = [
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'relatorio', label: 'Relatório' },
  { value: 'projeto', label: 'Projeto' },
  { value: 'movimentacao_financeira', label: 'Movimentação Financeira' }
];

const TIPO_APROVACAO_OPTIONS = [
  { value: 'qualquer_um', label: 'Qualquer Aprovador' },
  { value: 'todos', label: 'Todos os Aprovadores' },
  { value: 'maioria', label: 'Maioria dos Aprovadores' }
];

export default function FluxoAprovacaoModal({ open, onOpenChange, fluxo }) {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo_documento: '',
    etapas: [],
    condicoes_aplicacao: {},
    ativo: true,
    notificar_ao_aprovar: true,
    notificar_ao_rejeitar: true
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (fluxo) {
      setFormData({
        nome: fluxo.nome || '',
        descricao: fluxo.descricao || '',
        tipo_documento: fluxo.tipo_documento || '',
        etapas: fluxo.etapas || [],
        condicoes_aplicacao: fluxo.condicoes_aplicacao || {},
        ativo: fluxo.ativo !== false,
        notificar_ao_aprovar: fluxo.notificar_ao_aprovar !== false,
        notificar_ao_rejeitar: fluxo.notificar_ao_rejeitar !== false
      });
    } else {
      setFormData({
        nome: '',
        descricao: '',
        tipo_documento: '',
        etapas: [],
        condicoes_aplicacao: {},
        ativo: true,
        notificar_ao_aprovar: true,
        notificar_ao_rejeitar: true
      });
    }
  }, [fluxo, open]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (fluxo?.id) {
        return base44.entities.FluxoAprovacao.update(fluxo.id, data);
      }
      return base44.entities.FluxoAprovacao.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fluxos_aprovacao']);
      toast.success(fluxo ? 'Fluxo atualizado' : 'Fluxo criado');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Erro ao salvar fluxo');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.tipo_documento || formData.etapas.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    saveMutation.mutate(formData);
  };

  const addEtapa = () => {
    setFormData({
      ...formData,
      etapas: [
        ...formData.etapas,
        {
          ordem: formData.etapas.length + 1,
          nome: '',
          aprovadores: [],
          tipo_aprovacao: 'qualquer_um',
          prazo_dias: 3
        }
      ]
    });
  };

  const removeEtapa = (index) => {
    const newEtapas = formData.etapas.filter((_, i) => i !== index);
    newEtapas.forEach((etapa, i) => {
      etapa.ordem = i + 1;
    });
    setFormData({ ...formData, etapas: newEtapas });
  };

  const moveEtapa = (index, direction) => {
    const newEtapas = [...formData.etapas];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newEtapas.length) return;

    [newEtapas[index], newEtapas[targetIndex]] = [newEtapas[targetIndex], newEtapas[index]];
    newEtapas.forEach((etapa, i) => {
      etapa.ordem = i + 1;
    });
    setFormData({ ...formData, etapas: newEtapas });
  };

  const updateEtapa = (index, field, value) => {
    const newEtapas = [...formData.etapas];
    if (field === 'aprovadores') {
      newEtapas[index][field] = value.split(',').map(s => s.trim()).filter(s => s);
    } else {
      newEtapas[index][field] = value;
    }
    setFormData({ ...formData, etapas: newEtapas });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {fluxo ? 'Editar Fluxo de Aprovação' : 'Novo Fluxo de Aprovação'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Nome do Fluxo *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Aprovação de Orçamentos Grandes"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva quando este fluxo deve ser usado"
                rows={2}
              />
            </div>

            <div>
              <Label>Tipo de Documento *</Label>
              <Select
                value={formData.tipo_documento}
                onValueChange={(value) => setFormData({ ...formData, tipo_documento: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_DOCUMENTO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Condições de Aplicação */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <Label className="text-sm font-medium">Condições de Aplicação (opcional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Valor Mínimo (R$)</Label>
                  <Input
                    type="number"
                    value={formData.condicoes_aplicacao.valor_minimo || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      condicoes_aplicacao: {
                        ...formData.condicoes_aplicacao,
                        valor_minimo: parseFloat(e.target.value) || 0
                      }
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">Status que Aciona</Label>
                  <Input
                    value={formData.condicoes_aplicacao.status || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      condicoes_aplicacao: {
                        ...formData.condicoes_aplicacao,
                        status: e.target.value
                      }
                    })}
                    placeholder="Ex: enviado"
                  />
                </div>
              </div>
            </div>

            {/* Etapas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Etapas de Aprovação *</Label>
                <Button type="button" size="sm" onClick={addEtapa} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Etapa
                </Button>
              </div>

              {formData.etapas.map((etapa, index) => (
                <div key={index} className="bg-blue-50 rounded-lg p-4 space-y-3 border-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                        {etapa.ordem}
                      </div>
                      <Label className="text-sm font-medium">Etapa {index + 1}</Label>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveEtapa(index, 'up')}
                        disabled={index === 0}
                      >
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveEtapa(index, 'down')}
                        disabled={index === formData.etapas.length - 1}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeEtapa(index)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Input
                    placeholder="Nome da etapa"
                    value={etapa.nome}
                    onChange={(e) => updateEtapa(index, 'nome', e.target.value)}
                  />

                  <Input
                    placeholder="Aprovadores (emails separados por vírgula)"
                    value={etapa.aprovadores?.join(', ') || ''}
                    onChange={(e) => updateEtapa(index, 'aprovadores', e.target.value)}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Tipo de Aprovação</Label>
                      <Select
                        value={etapa.tipo_aprovacao}
                        onValueChange={(value) => updateEtapa(index, 'tipo_aprovacao', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPO_APROVACAO_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Prazo (dias)</Label>
                      <Input
                        type="number"
                        value={etapa.prazo_dias}
                        onChange={(e) => updateEtapa(index, 'prazo_dias', parseInt(e.target.value) || 3)}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {formData.etapas.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  Nenhuma etapa configurada. Clique em "Adicionar Etapa" para começar.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Fluxo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}