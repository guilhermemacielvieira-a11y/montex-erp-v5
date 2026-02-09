import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

export default function SeletorPecas({ onSelect, selecionada }) {
  const [filtro, setFiltro] = useState('');
  const [projetoId, setProjetoId] = useState('');

  const { data: projetos = [], isLoading: loadingProjetos } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => base44.entities.Projeto.list()
  });

  const { data: items = [], isLoading: loadingItems } = useQuery({
    queryKey: ['itemsProducao', projetoId],
    queryFn: () => {
      if (!projetoId) return [];
      return base44.entities.ItemProducao.filter({ projeto_id: projetoId });
    },
    enabled: !!projetoId
  });

  const filtrados = items.filter(item =>
    item.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    item.codigo?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Selecionar Peça para Atualizar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Projeto</label>
          <Select value={projetoId} onValueChange={setProjetoId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Escolha um projeto..." />
            </SelectTrigger>
            <SelectContent>
              {projetos.map(proj => (
                <SelectItem key={proj.id} value={proj.id}>{proj.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {projetoId && (
          <div>
            <label className="text-sm font-medium">Buscar Peça</label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Nome ou código..."
                className="pl-10"
              />
            </div>
          </div>
        )}

        {loadingItems && <p className="text-sm text-slate-500">Carregando peças...</p>}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filtrados.map(item => (
            <Button
              key={item.id}
              onClick={() => onSelect(item)}
              variant={selecionada?.id === item.id ? 'default' : 'outline'}
              className="w-full justify-between h-auto py-3 px-4 text-left"
            >
              <div className="flex-1">
                <p className="font-semibold">{item.nome}</p>
                <p className="text-xs text-slate-500">
                  {item.codigo} • {item.quantidade_produzida}/{item.quantidade} un • {item.etapa}
                </p>
              </div>
            </Button>
          ))}

          {projetoId && filtrados.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-4">Nenhuma peça encontrada</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}