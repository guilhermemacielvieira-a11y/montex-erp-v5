import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Package, Plus, Search } from 'lucide-react';

export default function EstoqueMateriaisCard({ projetoId }) {
  const [filtro, setFiltro] = useState('');

  const { data: materiais = [], isLoading } = useQuery({
    queryKey: ['materiais', projetoId],
    queryFn: () => base44.entities.Material.list(),
  });

  const { data: consumos = [] } = useQuery({
    queryKey: ['consumos', projetoId],
    queryFn: () => 
      projetoId 
        ? base44.entities.ConsumoDeMaterial.filter({ projeto_id: projetoId })
        : Promise.resolve([]),
    enabled: !!projetoId,
  });

  const materiaisFiltrados = materiais.filter(m => 
    m.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    m.codigo?.toLowerCase().includes(filtro.toLowerCase())
  );

  const getConsumoTotal = (materialId) => {
    return consumos
      .filter(c => c.material_id === materialId)
      .reduce((acc, c) => acc + c.quantidade_consumida, 0);
  };

  const getStatusEstoque = (material) => {
    if (material.quantidade_estoque <= material.quantidade_minima) {
      return { color: 'bg-red-50 border-red-200', textColor: 'text-red-700', status: 'Crítico' };
    }
    if (material.quantidade_estoque <= material.quantidade_minima * 1.5) {
      return { color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700', status: 'Baixo' };
    }
    return { color: 'bg-green-50 border-green-200', textColor: 'text-green-700', status: 'OK' };
  };

  if (isLoading) {
    return <div className="text-sm text-slate-500">Carregando materiais...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="w-5 h-5" />
          Estoque de Materiais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar material..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Novo
          </Button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {materiaisFiltrados.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Nenhum material encontrado</p>
          ) : (
            materiaisFiltrados.map((material) => {
              const status = getStatusEstoque(material);
              const consumoTotal = getConsumoTotal(material.id);

              return (
                <div 
                  key={material.id}
                  className={`p-3 rounded-lg border ${status.color}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-slate-900">{material.nome}</p>
                      <p className="text-xs text-slate-500">{material.codigo}</p>
                    </div>
                    <Badge variant="outline" className={`${status.textColor}`}>
                      {status.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Disponível</p>
                      <p className="font-bold">{material.quantidade_estoque} {material.unidade}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Mínimo</p>
                      <p className="font-bold">{material.quantidade_minima} {material.unidade}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Consumo</p>
                      <p className="font-bold">{consumoTotal} {material.unidade}</p>
                    </div>
                  </div>

                  {material.valor_unitario && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <p className="text-xs text-slate-500">
                        Valor total: R$ {(material.quantidade_estoque * material.valor_unitario).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}