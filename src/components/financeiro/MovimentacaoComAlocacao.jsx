import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const labelsCategorias = {
  receita_projeto: 'Receita do Projeto',
  adiantamento: 'Adiantamento do Cliente',
  pagamento_final: 'Pagamento Final',
  compra_material: 'Compra de Material',
  mao_de_obra: 'Mão de Obra',
  transporte: 'Transporte',
  equipamento: 'Equipamento',
  despesa_administrativa: 'Despesa Administrativa',
  impostos: 'Impostos',
  outros: 'Outros',
};

const categoriasSaida = [
  'compra_material',
  'mao_de_obra',
  'transporte',
  'equipamento',
  'despesa_administrativa',
  'impostos',
  'outros'
];

const categoriasEntrada = [
  'receita_projeto',
  'adiantamento',
  'pagamento_final',
];

export default function MovimentacaoComAlocacao({ open, onClose, projetos = [] }) {
  const [step, setStep] = useState(1);
  const [permitirCompartilhamento, setPermitirCompartilhamento] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'saida',
    categoria: 'compra_material',
    descricao: '',
    valor: '',
    data_movimentacao: new Date().toISOString().split('T')[0],
    forma_pagamento: 'pix',
    status: 'previsto',
    documento_fiscal: '',
    observacoes: '',
    projeto_id: '',
  });

  const [alocacoes, setAlocacoes] = useState([]);
  const [alocacaoForm, setAlocacaoForm] = useState({
    projeto_id: '',
    percentual_alocacao: 100,
  });

  const queryClient = useQueryClient();

  const createMovimentacaoMutation = useMutation({
    mutationFn: async (data) => {
      // Criar movimentação
      const movimentacao = await base44.entities.MovimentacaoFinanceira.create(data);

      // Criar alocações se houver compartilhamento
      if (permitirCompartilhamento && alocacoes.length > 0) {
        await Promise.all(alocacoes.map(aloc => {
          const projetoSelecionado = projetos.find(p => p.id === aloc.projeto_id);
          return base44.entities.AlocacaoDespesa.create({
            movimentacao_financeira_id: movimentacao.id,
            projeto_id: aloc.projeto_id,
            projeto_nome: projetoSelecionado?.nome,
            valor_alocado: (parseFloat(data.valor) * aloc.percentual_alocacao) / 100,
            percentual_alocacao: aloc.percentual_alocacao,
            tipo: data.tipo === 'entrada' ? 'receita' : 'despesa_compartilhada',
          });
        }));
      }

      return movimentacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-obra'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['alocacoes-despesa'] });
      toast.success('Movimentação registrada!');
      handleClose();
    },
    onError: (error) => {
      toast.error('Erro ao registrar movimentação: ' + error.message);
    }
  });

  const handleClose = () => {
    setStep(1);
    setPermitirCompartilhamento(false);
    setFormData({
      tipo: 'saida',
      categoria: 'compra_material',
      descricao: '',
      valor: '',
      data_movimentacao: new Date().toISOString().split('T')[0],
      forma_pagamento: 'pix',
      status: 'previsto',
      documento_fiscal: '',
      observacoes: '',
      projeto_id: '',
    });
    setAlocacoes([]);
    setAlocacaoForm({ projeto_id: '', percentual_alocacao: 100 });
    onClose();
  };

  const handleAddAlocacao = () => {
    if (!alocacaoForm.projeto_id) {
      toast.error('Selecione um projeto');
      return;
    }

    if (alocacoes.some(a => a.projeto_id === alocacaoForm.projeto_id)) {
      toast.error('Este projeto já foi adicionado');
      return;
    }

    setAlocacoes([...alocacoes, alocacaoForm]);
    setAlocacaoForm({ projeto_id: '', percentual_alocacao: 100 });
  };

  const handleRemoveAlocacao = (projetoId) => {
    setAlocacoes(alocacoes.filter(a => a.projeto_id !== projetoId));
  };

  const totalPercentual = alocacoes.reduce((acc, a) => acc + a.percentual_alocacao, 0);

  const handleSalvar = async () => {
    if (!formData.descricao || !formData.valor) {
      toast.error('Preencha descrição e valor');
      return;
    }

    if (permitirCompartilhamento && totalPercentual !== 100) {
      toast.error('O total de percentuais deve ser 100%');
      return;
    }

    const dataToSave = {
      ...formData,
      valor: parseFloat(formData.valor),
      projeto_id: permitirCompartilhamento ? null : formData.projeto_id,
    };

    const projetoSelecionado = projetos.find(p => p.id === formData.projeto_id);
    if (!permitirCompartilhamento && formData.projeto_id) {
      dataToSave.projeto_nome = projetoSelecionado?.nome;
    }

    await createMovimentacaoMutation.mutateAsync(dataToSave);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Movimentação Financeira</DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-4">
            {/* Dados Básicos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => {
                    const novaCategoria = value === 'entrada' ? 'receita_projeto' : 'compra_material';
                    setFormData({ ...formData, tipo: value, categoria: novaCategoria });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Receita</SelectItem>
                    <SelectItem value="saida">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData.tipo === 'entrada' ? categoriasEntrada : categoriasSaida).map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {labelsCategorias[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                placeholder="Ex: Compra de aço"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
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

            {/* Alocação de Projeto */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Alocação de Despesa</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {permitirCompartilhamento ? 'Despesa compartilhada entre múltiplos projetos' : 'Atribuir a um projeto específico'}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permitirCompartilhamento}
                      onChange={(e) => setPermitirCompartilhamento(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-xs font-medium">Compartilhado</span>
                  </label>
                </div>

                {!permitirCompartilhamento ? (
                  <Select
                    value={formData.projeto_id}
                    onValueChange={(value) => setFormData({ ...formData, projeto_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um projeto (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {projetos.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-700">Adicionar projetos para alocação:</p>
                    <div className="flex gap-2">
                      <Select value={alocacaoForm.projeto_id} onValueChange={(value) => setAlocacaoForm({ ...alocacaoForm, projeto_id: value })}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione um projeto" />
                        </SelectTrigger>
                        <SelectContent>
                          {projetos.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        className="w-20"
                        placeholder="%"
                        value={alocacaoForm.percentual_alocacao}
                        onChange={(e) => setAlocacaoForm({ ...alocacaoForm, percentual_alocacao: parseFloat(e.target.value) })}
                      />
                      <Button onClick={handleAddAlocacao} size="sm" variant="outline">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {alocacoes.length > 0 && (
                      <div className="space-y-2 mt-3 p-2 bg-white rounded border border-blue-200">
                        {alocacoes.map(aloc => {
                          const projeto = projetos.find(p => p.id === aloc.projeto_id);
                          return (
                            <div key={aloc.projeto_id} className="flex items-center justify-between text-sm">
                              <span className="font-medium">{projeto?.nome}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-600">{aloc.percentual_alocacao}%</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveAlocacao(aloc.projeto_id)}
                                  className="h-6 w-6 p-0 text-red-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-2 border-t border-blue-200 flex justify-between font-bold text-sm">
                          <span>Total:</span>
                          <span className={totalPercentual === 100 ? 'text-emerald-600' : 'text-red-600'}>
                            {totalPercentual}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={formData.forma_pagamento}
                  onValueChange={(value) => setFormData({ ...formData, forma_pagamento: value })}
                >
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
                    <SelectItem value="previsto">Previsto</SelectItem>
                    <SelectItem value="realizado">Realizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Documento Fiscal (opcional)</Label>
              <Input
                placeholder="Ex: NF-000123"
                value={formData.documento_fiscal}
                onChange={(e) => setFormData({ ...formData, documento_fiscal: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                placeholder="Observações adicionais..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={handleSalvar}
                disabled={createMovimentacaoMutation.isPending}
                className="bg-gradient-to-r from-purple-500 to-purple-600"
              >
                {createMovimentacaoMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Registrar'
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}