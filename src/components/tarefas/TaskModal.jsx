import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, X, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TaskModal({ 
  open, 
  onClose, 
  tarefa, 
  projetos, 
  usuarios = [],
  onSave,
  isSaving 
}) {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    projeto_id: '',
    responsavel: '',
    responsavel_nome: '',
    status: 'pendente',
    prioridade: 'media',
    data_inicio: '',
    data_fim: '',
    percentual_conclusao: 0,
    etiquetas: [],
    horas_estimadas: 0,
    horas_trabalhadas: 0,
    observacoes: ''
  });

  const [novaEtiqueta, setNovaEtiqueta] = useState('');
  const [estimandoTempo, setEstimandoTempo] = useState(false);

  useEffect(() => {
    if (tarefa) {
      setFormData({
        titulo: tarefa.titulo || '',
        descricao: tarefa.descricao || '',
        projeto_id: tarefa.projeto_id || '',
        responsavel: tarefa.responsavel || '',
        responsavel_nome: tarefa.responsavel_nome || '',
        status: tarefa.status || 'pendente',
        prioridade: tarefa.prioridade || 'media',
        data_inicio: tarefa.data_inicio || '',
        data_fim: tarefa.data_fim || '',
        percentual_conclusao: tarefa.percentual_conclusao || 0,
        etiquetas: tarefa.etiquetas || [],
        horas_estimadas: tarefa.horas_estimadas || 0,
        horas_trabalhadas: tarefa.horas_trabalhadas || 0,
        observacoes: tarefa.observacoes || ''
      });
    } else {
      setFormData({
        titulo: '',
        descricao: '',
        projeto_id: '',
        responsavel: '',
        responsavel_nome: '',
        status: 'pendente',
        prioridade: 'media',
        data_inicio: '',
        data_fim: '',
        percentual_conclusao: 0,
        etiquetas: [],
        horas_estimadas: 0,
        horas_trabalhadas: 0,
        observacoes: ''
      });
    }
  }, [tarefa, open]);

  const handleSave = () => {
    const projeto = projetos.find(p => p.id === formData.projeto_id);
    const usuario = usuarios.find(u => u.email === formData.responsavel);
    
    onSave({
      ...formData,
      projeto_nome: projeto?.nome || '',
      responsavel_nome: usuario?.full_name || formData.responsavel_nome
    });
  };

  const adicionarEtiqueta = () => {
    if (novaEtiqueta && !formData.etiquetas.includes(novaEtiqueta)) {
      setFormData({
        ...formData,
        etiquetas: [...formData.etiquetas, novaEtiqueta]
      });
      setNovaEtiqueta('');
    }
  };

  const removerEtiqueta = (etiqueta) => {
    setFormData({
      ...formData,
      etiquetas: formData.etiquetas.filter(e => e !== etiqueta)
    });
  };

  const estimarTempoConclusao = async () => {
    if (!formData.titulo && !formData.descricao) {
      alert('Preencha o título e descrição da tarefa para estimar o tempo');
      return;
    }

    setEstimandoTempo(true);
    try {
      const projeto = projetos.find(p => p.id === formData.projeto_id);
      
      const prompt = `Você é um especialista em gerenciamento de projetos de estruturas metálicas. Analise a seguinte tarefa e estime o tempo necessário para conclusão em horas:

TAREFA:
Título: ${formData.titulo}
Descrição: ${formData.descricao || 'Sem descrição'}
Projeto: ${projeto?.nome || 'Não especificado'}
Tipo de projeto: ${projeto?.tipo || 'Não especificado'}
Prioridade: ${formData.prioridade}

Considere:
- Complexidade da tarefa
- Tipo de estrutura metálica (${projeto?.tipo})
- Interdependências típicas
- Padrões de mercado para tarefas similares

Forneça uma estimativa realista de horas de trabalho necessárias.`;

      const resultado = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            horas_estimadas: { type: "number" },
            justificativa: { type: "string" },
            confianca: { type: "string", enum: ["alta", "media", "baixa"] }
          }
        }
      });

      setFormData({
        ...formData,
        horas_estimadas: resultado.horas_estimadas
      });

      alert(`Estimativa: ${resultado.horas_estimadas} horas\nConfiança: ${resultado.confianca}\n\n${resultado.justificativa}`);
    } catch (error) {
      console.error('Erro ao estimar tempo:', error);
      alert('Erro ao estimar tempo. Tente novamente.');
    } finally {
      setEstimandoTempo(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tarefa ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Nome da tarefa"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descreva a tarefa..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Projeto *</Label>
              <Select
                value={formData.projeto_id}
                onValueChange={(value) => setFormData({ ...formData, projeto_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {projetos.map((projeto) => (
                    <SelectItem key={projeto.id} value={projeto.id}>
                      {projeto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                value={formData.responsavel}
                onValueChange={(value) => {
                  const usuario = usuarios.find(u => u.email === value);
                  setFormData({ 
                    ...formData, 
                    responsavel: value,
                    responsavel_nome: usuario?.full_name || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.email} value={usuario.email}>
                      {usuario.full_name || usuario.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="bloqueada">Bloqueada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={formData.prioridade}
                onValueChange={(value) => setFormData({ ...formData, prioridade: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Prazo</Label>
              <Input
                type="date"
                value={formData.data_fim}
                onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>% Conclusão</Label>
            <div className="flex items-center gap-4">
              <Input
                type="range"
                min="0"
                max="100"
                value={formData.percentual_conclusao}
                onChange={(e) => setFormData({ ...formData, percentual_conclusao: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="font-semibold w-12">{formData.percentual_conclusao}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Horas Estimadas</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={estimarTempoConclusao}
                  disabled={estimandoTempo}
                  className="text-xs text-purple-600 hover:text-purple-700 h-auto py-1"
                >
                  {estimandoTempo ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Estimando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-1" />
                      Estimar com IA
                    </>
                  )}
                </Button>
              </div>
              <Input
                type="number"
                min="0"
                value={formData.horas_estimadas}
                onChange={(e) => setFormData({ ...formData, horas_estimadas: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Horas Trabalhadas</Label>
              <Input
                type="number"
                min="0"
                value={formData.horas_trabalhadas}
                onChange={(e) => setFormData({ ...formData, horas_trabalhadas: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex gap-2">
              <Input
                value={novaEtiqueta}
                onChange={(e) => setNovaEtiqueta(e.target.value)}
                placeholder="Adicionar etiqueta"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarEtiqueta())}
              />
              <Button type="button" onClick={adicionarEtiqueta} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.etiquetas.map((etiqueta, idx) => (
                <Badge key={idx} variant="secondary" className="pr-1">
                  {etiqueta}
                  <button
                    onClick={() => removerEtiqueta(etiqueta)}
                    className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.titulo || !formData.projeto_id || isSaving}
              className="bg-gradient-to-r from-orange-500 to-orange-600"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Tarefa'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}