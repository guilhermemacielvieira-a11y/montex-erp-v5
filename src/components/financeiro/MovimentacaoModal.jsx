import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function MovimentacaoModal({ open, onClose, projetos }) {
  const [formData, setFormData] = useState({
    tipo: 'entrada',
    categoria: '',
    descricao: '',
    valor: '',
    data_movimentacao: new Date().toISOString().split('T')[0],
    projeto_id: '',
    forma_pagamento: 'transferencia',
    status: 'realizado',
    observacoes: '',
    documento_fiscal: ''
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MovimentacaoFinanceira.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      onClose();
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      tipo: 'entrada',
      categoria: '',
      descricao: '',
      valor: '',
      data_movimentacao: new Date().toISOString().split('T')[0],
      projeto_id: '',
      forma_pagamento: 'transferencia',
      status: 'realizado',
      observacoes: '',
      documento_fiscal: ''
    });
  };

  const handleSave = () => {
    const projeto = projetos.find(p => p.id === formData.projeto_id);
    
    createMutation.mutate({
      ...formData,
      valor: parseFloat(formData.valor),
      projeto_nome: projeto?.nome || ''
    });
  };

  const categoriasEntrada = [
    { value: 'receita_projeto', label: 'Receita de Projeto' },
    { value: 'adiantamento', label: 'Adiantamento' },
    { value: 'pagamento_final', label: 'Pagamento Final' }
  ];

  const categoriasSaida = [
    { value: 'compra_material', label: 'Compra de Material' },
    { value: 'mao_de_obra', label: 'Mão de Obra' },
    { value: 'transporte', label: 'Transporte' },
    { value: 'equipamento', label: 'Equipamento' },
    { value: 'despesa_administrativa', label: 'Despesa Administrativa' },
    { value: 'impostos', label: 'Impostos' },
    { value: 'outros', label: 'Outros' }
  ];

  const categorias = formData.tipo === 'entrada' ? categoriasEntrada : categoriasSaida;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Movimentação Financeira</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value, categoria: '' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição da movimentação"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={formData.data_movimentacao}
                onChange={(e) => setFormData({ ...formData, data_movimentacao: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={formData.projeto_id} onValueChange={(value) => setFormData({ ...formData, projeto_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {projetos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={formData.forma_pagamento} onValueChange={(value) => setFormData({ ...formData, forma_pagamento: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realizado">Realizado</SelectItem>
                  <SelectItem value="previsto">Previsto</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Documento Fiscal</Label>
              <Input
                value={formData.documento_fiscal}
                onChange={(e) => setFormData({ ...formData, documento_fiscal: e.target.value })}
                placeholder="Nº NF ou documento"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Informações adicionais..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.categoria || !formData.descricao || !formData.valor || createMutation.isPending}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Movimentação'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}