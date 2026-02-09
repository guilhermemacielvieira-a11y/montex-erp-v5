import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const TIPOS_RELATORIO = [
  { id: 'fluxo_caixa', label: 'Fluxo de Caixa' },
  { id: 'despesas', label: 'Despesas' },
  { id: 'receitas', label: 'Receitas' },
  { id: 'rentabilidade', label: 'Rentabilidade' },
  { id: 'completo', label: 'Relatório Completo' },
];

const COLUNAS_DISPONIVEIS = [
  { id: 'data', label: 'Data' },
  { id: 'descricao', label: 'Descrição' },
  { id: 'categoria', label: 'Categoria' },
  { id: 'tipo', label: 'Tipo' },
  { id: 'valor', label: 'Valor' },
  { id: 'status', label: 'Status' },
  { id: 'projeto', label: 'Projeto' },
];

export default function CriadorModeloRelatorio({ onModeloCriado }) {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo_relatorio: 'fluxo_caixa',
    colunas: ['data', 'descricao', 'categoria', 'valor'],
    ordenacao: { campo: 'data', direcao: 'desc' },
    incluir_graficos: true,
    incluir_resumo: true,
    formato_saida: ['pdf'],
    filtros: {
      data_inicio: '',
      data_fim: '',
      projetos: [],
      categorias: [],
      status: [],
    },
  });

  const queryClient = useQueryClient();

  const criarModeloMutation = useMutation({
    mutationFn: (data) => base44.entities.ModeloRelatorio.create(data),
    onSuccess: (novoModelo) => {
      queryClient.invalidateQueries({ queryKey: ['modelos-relatorio'] });
      toast.success('Modelo criado com sucesso!');
      setMostrarModal(false);
      resetForm();
      onModeloCriado?.(novoModelo);
    },
    onError: () => {
      toast.error('Erro ao criar modelo');
    }
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      tipo_relatorio: 'fluxo_caixa',
      colunas: ['data', 'descricao', 'categoria', 'valor'],
      ordenacao: { campo: 'data', direcao: 'desc' },
      incluir_graficos: true,
      incluir_resumo: true,
      formato_saida: ['pdf'],
      filtros: {
        data_inicio: '',
        data_fim: '',
        projetos: [],
        categorias: [],
        status: [],
      },
    });
  };

  const handleSalvar = async () => {
    if (!formData.nome) {
      toast.error('Nome do modelo é obrigatório');
      return;
    }

    await criarModeloMutation.mutateAsync(formData);
  };

  const toggleColuna = (coluna) => {
    setFormData(prev => ({
      ...prev,
      colunas: prev.colunas.includes(coluna)
        ? prev.colunas.filter(c => c !== coluna)
        : [...prev.colunas, coluna]
    }));
  };

  const toggleFormato = (formato) => {
    setFormData(prev => ({
      ...prev,
      formato_saida: prev.formato_saida.includes(formato)
        ? prev.formato_saida.filter(f => f !== formato)
        : [...prev.formato_saida, formato]
    }));
  };

  return (
    <Dialog open={mostrarModal} onOpenChange={setMostrarModal}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-500 to-blue-600 gap-2">
          <Plus className="h-4 w-4" />
          Novo Modelo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Modelo de Relatório Personalizado</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Informações Básicas</h3>
            
            <div className="space-y-2">
              <Label className="text-sm">Nome do Modelo *</Label>
              <Input
                placeholder="Ex: Relatório Mensal de Receitas"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Descrição</Label>
              <Input
                placeholder="Descrição opcional do modelo"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Tipo de Relatório *</Label>
              <Select value={formData.tipo_relatorio} onValueChange={(v) => setFormData({ ...formData, tipo_relatorio: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_RELATORIO.map(tipo => (
                    <SelectItem key={tipo.id} value={tipo.id}>{tipo.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Colunas */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Colunas a Exibir</h3>
            <div className="grid grid-cols-2 gap-3">
              {COLUNAS_DISPONIVEIS.map(col => (
                <div key={col.id} className="flex items-center gap-2">
                  <Checkbox
                    id={col.id}
                    checked={formData.colunas.includes(col.id)}
                    onCheckedChange={() => toggleColuna(col.id)}
                  />
                  <Label htmlFor={col.id} className="text-sm cursor-pointer">{col.label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Ordenação */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Ordenação</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Campo</Label>
                <Select value={formData.ordenacao.campo} onValueChange={(v) => setFormData({ ...formData, ordenacao: { ...formData.ordenacao, campo: v } })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUNAS_DISPONIVEIS.filter(c => formData.colunas.includes(c.id)).map(col => (
                      <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Direção</Label>
                <Select value={formData.ordenacao.direcao} onValueChange={(v) => setFormData({ ...formData, ordenacao: { ...formData.ordenacao, direcao: v } })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Crescente (A-Z)</SelectItem>
                    <SelectItem value="desc">Decrescente (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Formatos de Saída */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Formatos de Saída</h3>
            <div className="flex gap-4">
              {['pdf', 'xlsx', 'csv'].map(fmt => (
                <div key={fmt} className="flex items-center gap-2">
                  <Checkbox
                    id={`fmt-${fmt}`}
                    checked={formData.formato_saida.includes(fmt)}
                    onCheckedChange={() => toggleFormato(fmt)}
                  />
                  <Label htmlFor={`fmt-${fmt}`} className="text-sm cursor-pointer uppercase">{fmt}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Opções */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Opções</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="incluir-graficos"
                  checked={formData.incluir_graficos}
                  onCheckedChange={(v) => setFormData({ ...formData, incluir_graficos: v })}
                />
                <Label htmlFor="incluir-graficos" className="text-sm cursor-pointer">Incluir gráficos</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="incluir-resumo"
                  checked={formData.incluir_resumo}
                  onCheckedChange={(v) => setFormData({ ...formData, incluir_resumo: v })}
                />
                <Label htmlFor="incluir-resumo" className="text-sm cursor-pointer">Incluir resumo executivo</Label>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setMostrarModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={criarModeloMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {criarModeloMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Modelo
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}