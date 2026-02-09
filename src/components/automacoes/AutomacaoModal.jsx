import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const TIPO_GATILHO_OPTIONS = [
  { value: 'mudanca_status_projeto', label: 'Mudança de Status - Projeto' },
  { value: 'mudanca_status_orcamento', label: 'Mudança de Status - Orçamento' },
  { value: 'conclusao_item_producao', label: 'Conclusão de Item de Produção' },
  { value: 'aprovacao_orcamento', label: 'Aprovação de Orçamento' },
  { value: 'atraso_projeto', label: 'Projeto Atrasado' },
  { value: 'estoque_baixo', label: 'Estoque Baixo' },
  { value: 'conclusao_etapa', label: 'Conclusão de Etapa' }
];

const ENTIDADE_OPTIONS = [
  { value: 'Projeto', label: 'Projeto' },
  { value: 'Orcamento', label: 'Orçamento' },
  { value: 'ItemProducao', label: 'Item de Produção' },
  { value: 'Material', label: 'Material' },
  { value: 'Relatorio', label: 'Relatório' }
];

const TIPO_ACAO_OPTIONS = [
  { value: 'enviar_email', label: 'Enviar Email' },
  { value: 'criar_notificacao', label: 'Criar Notificação' },
  { value: 'gerar_relatorio', label: 'Gerar Relatório' },
  { value: 'atualizar_campo', label: 'Atualizar Campo' },
  { value: 'criar_tarefa', label: 'Criar Tarefa' }
];

export default function AutomacaoModal({ open, onOpenChange, automacao }) {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo_gatilho: '',
    entidade_alvo: '',
    condicoes: {},
    acoes: [],
    ativa: true
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (automacao) {
      setFormData({
        nome: automacao.nome || '',
        descricao: automacao.descricao || '',
        tipo_gatilho: automacao.tipo_gatilho || '',
        entidade_alvo: automacao.entidade_alvo || '',
        condicoes: automacao.condicoes || {},
        acoes: automacao.acoes || [],
        ativa: automacao.ativa !== false
      });
    } else {
      setFormData({
        nome: '',
        descricao: '',
        tipo_gatilho: '',
        entidade_alvo: '',
        condicoes: {},
        acoes: [],
        ativa: true
      });
    }
  }, [automacao, open]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (automacao?.id) {
        return base44.entities.Automacao.update(automacao.id, data);
      }
      return base44.entities.Automacao.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['automacoes']);
      toast.success(automacao ? 'Automação atualizada' : 'Automação criada');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Erro ao salvar automação');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nome || !formData.tipo_gatilho || !formData.entidade_alvo || formData.acoes.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    saveMutation.mutate(formData);
  };

  const addAcao = () => {
    setFormData({
      ...formData,
      acoes: [
        ...formData.acoes,
        { tipo: '', parametros: {} }
      ]
    });
  };

  const removeAcao = (index) => {
    setFormData({
      ...formData,
      acoes: formData.acoes.filter((_, i) => i !== index)
    });
  };

  const updateAcao = (index, field, value) => {
    const newAcoes = [...formData.acoes];
    if (field === 'tipo') {
      newAcoes[index].tipo = value;
    } else {
      newAcoes[index].parametros = {
        ...newAcoes[index].parametros,
        [field]: value
      };
    }
    setFormData({ ...formData, acoes: newAcoes });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {automacao ? 'Editar Automação' : 'Nova Automação'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Nome da Automação *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Notificar ao aprovar orçamento"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva o que esta automação faz"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Gatilho *</Label>
                <Select
                  value={formData.tipo_gatilho}
                  onValueChange={(value) => setFormData({ ...formData, tipo_gatilho: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_GATILHO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Entidade Monitorada *</Label>
                <Select
                  value={formData.entidade_alvo}
                  onValueChange={(value) => setFormData({ ...formData, entidade_alvo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTIDADE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Condições (simplificado) */}
            {formData.tipo_gatilho.includes('mudanca_status') && (
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <Label className="text-sm font-medium">Condições (opcional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Status Anterior</Label>
                    <Input
                      value={formData.condicoes.status_de || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        condicoes: { ...formData.condicoes, status_de: e.target.value }
                      })}
                      placeholder="Ex: em_negociacao"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Novo Status</Label>
                    <Input
                      value={formData.condicoes.status_para || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        condicoes: { ...formData.condicoes, status_para: e.target.value }
                      })}
                      placeholder="Ex: aprovado"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Ações a Executar *</Label>
                <Button type="button" size="sm" onClick={addAcao} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Ação
                </Button>
              </div>

              {formData.acoes.map((acao, index) => (
                <div key={index} className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Ação {index + 1}</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeAcao(index)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <Select
                    value={acao.tipo}
                    onValueChange={(value) => updateAcao(index, 'tipo', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de ação" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPO_ACAO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {(acao.tipo === 'enviar_email' || acao.tipo === 'criar_notificacao') && (
                    <>
                      <Input
                        placeholder="Destinatários (emails separados por vírgula)"
                        value={acao.parametros.destinatarios?.join(',') || ''}
                        onChange={(e) => updateAcao(index, 'destinatarios', e.target.value.split(',').map(s => s.trim()))}
                      />
                      <Input
                        placeholder="Assunto"
                        value={acao.parametros.assunto || ''}
                        onChange={(e) => updateAcao(index, 'assunto', e.target.value)}
                      />
                      <Textarea
                        placeholder="Mensagem"
                        value={acao.parametros.mensagem || ''}
                        onChange={(e) => updateAcao(index, 'mensagem', e.target.value)}
                        rows={3}
                      />
                    </>
                  )}

                  {acao.tipo === 'atualizar_campo' && (
                    <>
                      <Input
                        placeholder="Nome do campo"
                        value={acao.parametros.campo || ''}
                        onChange={(e) => updateAcao(index, 'campo', e.target.value)}
                      />
                      <Input
                        placeholder="Novo valor"
                        value={acao.parametros.valor || ''}
                        onChange={(e) => updateAcao(index, 'valor', e.target.value)}
                      />
                    </>
                  )}

                  {acao.tipo === 'criar_tarefa' && (
                    <>
                      <Input
                        placeholder="Título da tarefa"
                        value={acao.parametros.titulo || ''}
                        onChange={(e) => updateAcao(index, 'titulo', e.target.value)}
                      />
                      <Textarea
                        placeholder="Descrição da tarefa"
                        value={acao.parametros.descricao || ''}
                        onChange={(e) => updateAcao(index, 'descricao', e.target.value)}
                        rows={2}
                      />
                      <Input
                        placeholder="Email do responsável"
                        value={acao.parametros.responsavel || ''}
                        onChange={(e) => updateAcao(index, 'responsavel', e.target.value)}
                      />
                    </>
                  )}
                </div>
              ))}

              {formData.acoes.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">
                  Nenhuma ação configurada. Clique em "Adicionar Ação" para começar.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Automação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}