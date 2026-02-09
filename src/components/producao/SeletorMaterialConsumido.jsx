import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function SeletorMaterialConsumido({ item, onMaterialAdicionado }) {
  const [materiaisSelecionados, setMaterialisSelecionados] = useState([]);
  const [materialId, setMaterialId] = useState('');
  const [quantidade, setQuantidade] = useState('');

  const { data: materiais = [] } = useQuery({
    queryKey: ['materiais'],
    queryFn: () => base44.entities.Material.list(),
  });

  const handleAdicionarMaterial = async () => {
    if (!materialId || !quantidade) {
      toast.error('Selecione material e quantidade');
      return;
    }

    const material = materiais.find(m => m.id === materialId);
    if (!material) return;

    const novoConsumador = {
      material_id: materialId,
      material_nome: material.nome,
      quantidade: parseFloat(quantidade),
      unidade: material.unidade,
      valor_unitario: material.valor_unitario || 0,
    };

    setMaterialisSelecionados([...materiaisSelecionados, novoConsumador]);
    setMaterialId('');
    setQuantidade('');
  };

  const handleRemover = (index) => {
    const novo = [...materiaisSelecionados];
    novo.splice(index, 1);
    setMaterialisSelecionados(novo);
  };

  const handleConfirmar = () => {
    if (materiaisSelecionados.length === 0) {
      toast.error('Adicione pelo menos um material');
      return;
    }
    onMaterialAdicionado(materiaisSelecionados);
  };

  return (
    <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
      <p className="text-sm font-medium text-slate-900">Materiais Consumidos</p>

      {/* Seletor */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Select value={materialId} onValueChange={setMaterialId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecionar material..." />
            </SelectTrigger>
            <SelectContent>
              {materiais.filter(m => m.ativo).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nome} - {m.codigo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Quantidade"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            step="0.1"
            min="0"
          />
          <Button 
            onClick={handleAdicionarMaterial}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Lista de materiais adicionados */}
      {materiaisSelecionados.length > 0 && (
        <div className="space-y-2">
          {materiaisSelecionados.map((m, idx) => (
            <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-blue-200">
              <div className="flex-1">
                <p className="text-sm font-medium">{m.material_nome}</p>
                <p className="text-xs text-slate-500">{m.quantidade} {m.unidade}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemover(idx)}
                className="h-6 w-6"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <Button 
            onClick={handleConfirmar}
            className="w-full bg-green-600 hover:bg-green-700"
            size="sm"
          >
            Confirmar Consumo
          </Button>
        </div>
      )}
    </div>
  );
}