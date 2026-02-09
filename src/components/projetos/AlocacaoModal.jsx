import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const FUNCAO_OPTIONS = [
  { value: 'gerente', label: 'Gerente' },
  { value: 'engenheiro', label: 'Engenheiro' },
  { value: 'soldador', label: 'Soldador' },
  { value: 'montador', label: 'Montador' },
  { value: 'desenhista', label: 'Desenhista' },
  { value: 'outro', label: 'Outro' }
];

export default function AlocacaoModal({ open, onOpenChange, alocacao, projetos, users }) {
  const [formData, setFormData] = useState({
    usuario_email: '',
    projeto_id: '',
    funcao: '',
    percentual_alocacao: 50,
    horas_alocadas: 40,
    data_inicio: '',
    data_fim: '',
    status: 'ativo'
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (alocacao) {
      setFormData({
        usuario_email: alocacao.usuario_email || '',
        projeto_id: alocacao.projeto_id || '',
        funcao: alocacao.funcao || '',
        percentual_alocacao: alocacao.percentual_alocacao || 50,
        horas_alocadas: alocacao.horas_alocadas || 40,
        data_inicio: alocacao.data_inicio || '',
        data_fim: alocacao.data_fim || '',
        status: alocacao.status || 'ativo'
      });
    } else {
      setFormData({
        usuario_email: '',
        projeto_id: '',
        funcao: '',
        percentual_alocacao: 50,
        horas_alocadas: 40,
        data_inicio: '',
        data_fim: '',
        status: 'ativo'
      });
    }
  }, [alocacao, open]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const user = users.find(u => u.email === data.usuario_email);
      const projeto = projetos.find(p => p.id === data.projeto_id);
      
      const payload = {
        ...data,
        usuario_nome: user?.full_name,
        projeto_nome: projeto?.nome
      };

      if (alocacao?.id) {
        return base44.entities.AlocacaoRecurso.update(alocacao.id, payload);
      }
      return base44.entities.AlocacaoRecurso.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['alocacoes']);
      toast.success(alocacao ? 'Alocação atualizada' : 'Alocação criada');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Erro ao salvar alocação');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.usuario_email || !formData.projeto_id || !formData.funcao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {alocacao ? 'Editar Alocação' : 'Nova Alocação de Recurso'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Recurso *</Label>
              <Select
                value={formData.usuario_email}
                onValueChange={(value) => setFormData({ ...formData, usuario_email: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.email}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Projeto *</Label>
              <Select
                value={formData.projeto_id}
                onValueChange={(value) => setFormData({ ...formData, projeto_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {projetos.map(projeto => (
                    <SelectItem key={projeto.id} value={projeto.id}>
                      {projeto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Função *</Label>
            <Select
              value={formData.funcao}
              onValueChange={(value) => setFormData({ ...formData, funcao: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {FUNCAO_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Percentual de Alocação (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.percentual_alocacao}
                onChange={(e) => setFormData({ ...formData, percentual_alocacao: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <Label>Horas por Semana</Label>
              <Input
                type="number"
                min="0"
                value={formData.horas_alocadas}
                onChange={(e) => setFormData({ ...formData, horas_alocadas: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
              />
            </div>

            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={formData.data_fim}
                onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="flex-1">
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Alocação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}