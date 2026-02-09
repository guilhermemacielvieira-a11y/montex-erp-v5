import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package } from 'lucide-react';

export default function AlertasEstoqueBaixo() {
  const { data: materiais = [], isLoading } = useQuery({
    queryKey: ['materiais-baixo'],
    queryFn: () => base44.entities.Material.list(),
  });

  const materiaisBaixos = materiais.filter(m => m.quantidade_estoque <= m.quantidade_minima);

  if (isLoading) {
    return <div className="text-sm text-slate-500">Carregando estoque...</div>;
  }

  if (materiaisBaixos.length === 0) {
    return null;
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <CardTitle className="text-sm font-semibold text-yellow-800">Estoque Baixo</CardTitle>
          <Badge variant="outline" className="ml-auto bg-yellow-100 text-yellow-800 border-yellow-300">
            {materiaisBaixos.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {materiaisBaixos.map((m) => (
          <div key={m.id} className="flex justify-between items-center p-2 bg-white rounded border border-yellow-200">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-slate-900">{m.nome}</p>
                <p className="text-xs text-slate-500">{m.codigo}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-yellow-700">{m.quantidade_estoque} {m.unidade}</p>
              <p className="text-xs text-slate-500">Mín: {m.quantidade_minima}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}