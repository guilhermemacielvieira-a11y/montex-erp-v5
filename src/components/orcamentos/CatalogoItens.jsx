import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const categorias = [
  { value: 'materia_prima', label: 'Matéria Prima' },
  { value: 'mao_de_obra', label: 'Mão de Obra' },
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'cobertura', label: 'Cobertura' },
  { value: 'outro', label: 'Outro' }
];

export default function CatalogoItens({ open, onClose, onSelectItem }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [newItem, setNewItem] = useState({
    item: '',
    categoria: 'materia_prima',
    valor_unitario: '',
    unidade: 'kg',
    descricao: ''
  });

  const queryClient = useQueryClient();

  const { data: custos = [], isLoading } = useQuery({
    queryKey: ['custos'],
    queryFn: () => base44.entities.Custo.list('item', 1000),
    enabled: open
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Custo.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custos'] });
      toast.success('Item cadastrado no catálogo!');
      setShowNewItemModal(false);
      setNewItem({
        item: '',
        categoria: 'materia_prima',
        valor_unitario: '',
        unidade: 'kg',
        descricao: ''
      });
    }
  });

  const custosAtivos = custos.filter(c => c.ativo !== false);
  
  const custosFiltrados = custosAtivos.filter(custo => {
    const search = searchTerm.toLowerCase();
    return (
      custo.item?.toLowerCase().includes(search) ||
      custo.descricao?.toLowerCase().includes(search) ||
      custo.categoria?.toLowerCase().includes(search)
    );
  });

  const handleSelectItem = (custo) => {
    onSelectItem({
      descricao: custo.item,
      unidade: custo.unidade,
      valor_unitario: custo.valor_unitario,
      quantidade: 1
    });
    onClose();
    toast.success('Item adicionado ao orçamento');
  };

  const handleCreateItem = async () => {
    if (!newItem.item || !newItem.valor_unitario || !newItem.unidade) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    await createMutation.mutateAsync({
      ...newItem,
      valor_unitario: parseFloat(newItem.valor_unitario),
      ativo: true
    });
  };

  const getCategoriaLabel = (categoria) => {
    return categorias.find(c => c.value === categoria)?.label || categoria;
  };

  const getCategoriaColor = (categoria) => {
    const colors = {
      materia_prima: 'bg-blue-100 text-blue-700',
      mao_de_obra: 'bg-purple-100 text-purple-700',
      equipamento: 'bg-orange-100 text-orange-700',
      transporte: 'bg-green-100 text-green-700',
      administrativo: 'bg-slate-100 text-slate-700',
      cobertura: 'bg-yellow-100 text-yellow-700',
      outro: 'bg-gray-100 text-gray-700'
    };
    return colors[categoria] || colors.outro;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              Catálogo de Itens
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, descrição ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => setShowNewItemModal(true)}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Item
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto border rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              ) : custosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">
                    {searchTerm ? 'Nenhum item encontrado' : 'Nenhum item no catálogo'}
                  </p>
                  <Button
                    onClick={() => setShowNewItemModal(true)}
                    variant="outline"
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Primeiro Item
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {custosFiltrados.map((custo) => (
                    <div
                      key={custo.id}
                      onClick={() => handleSelectItem(custo)}
                      className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-slate-900">{custo.item}</h4>
                            <Badge className={getCategoriaColor(custo.categoria)}>
                              {getCategoriaLabel(custo.categoria)}
                            </Badge>
                          </div>
                          {custo.descricao && (
                            <p className="text-sm text-slate-500 mb-2">{custo.descricao}</p>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-600">
                              Unidade: <strong>{custo.unidade}</strong>
                            </span>
                            <span className="text-orange-600 font-semibold">
                              R$ {custo.valor_unitario?.toFixed(2)}/{custo.unidade}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500 text-center">
              {custosFiltrados.length} {custosFiltrados.length === 1 ? 'item disponível' : 'itens disponíveis'}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Novo Item */}
      <Dialog open={showNewItemModal} onOpenChange={setShowNewItemModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Item no Catálogo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Item *</Label>
              <Input
                placeholder="Ex: Perfil U 100x50x3,0mm"
                value={newItem.item}
                onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={newItem.categoria}
                  onValueChange={(value) => setNewItem({ ...newItem, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Unidade *</Label>
                <Select
                  value={newItem.unidade}
                  onValueChange={(value) => setNewItem({ ...newItem, unidade: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                    <SelectItem value="m²">m²</SelectItem>
                    <SelectItem value="m³">m³</SelectItem>
                    <SelectItem value="un">un</SelectItem>
                    <SelectItem value="h">h</SelectItem>
                    <SelectItem value="vb">vb</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valor Unitário (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Ex: 8.50"
                value={newItem.valor_unitario}
                onChange={(e) => setNewItem({ ...newItem, valor_unitario: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Informações adicionais sobre o item..."
                value={newItem.descricao}
                onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNewItemModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateItem}
                disabled={!newItem.item || !newItem.valor_unitario || !newItem.unidade || createMutation.isPending}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Item
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}