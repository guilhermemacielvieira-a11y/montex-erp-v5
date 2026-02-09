import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Factory, Package, Loader } from 'lucide-react';
import ItemProducaoCard from '@/components/producao/ItemProducaoCard.jsx';

export default function AtualizacaoProducaoPublica() {
  const [projetoId, setProjetoId] = useState('');
  const [items, setItems] = useState([]);

  const { data: projetos = [], isLoading: loadingProjetos } = useQuery({
    queryKey: ['projetos-publica'],
    queryFn: () => base44.entities.Projeto.list()
  });

  const { data: itemsData = [], isLoading: loadingItems } = useQuery({
    queryKey: ['itemsProducao-publica', projetoId],
    queryFn: () => {
      if (!projetoId) return [];
      return base44.entities.ItemProducao.filter({ projeto_id: projetoId });
    },
    enabled: !!projetoId
  });

  // Sincronização em tempo real
  useEffect(() => {
    if (!projetoId) return;

    setItems(itemsData);

    const unsubscribe = base44.entities.ItemProducao.subscribe((event) => {
      if (event.data?.projeto_id === projetoId) {
        if (event.type === 'create') {
          setItems(prev => [...prev, event.data]);
        } else if (event.type === 'update') {
          setItems(prev => prev.map(item => item.id === event.id ? event.data : item));
        } else if (event.type === 'delete') {
          setItems(prev => prev.filter(item => item.id !== event.id));
        }
      }
    });

    return unsubscribe;
  }, [projetoId, itemsData]);

  const projeto = projetos.find(p => p.id === projetoId);
  
  const itemsFabricacao = items.filter(i => i.etapa === 'fabricacao');
  const itemsMontagem = items.filter(i => i.etapa === 'montagem');

  const fabricacaoCompleta = itemsFabricacao.length > 0
    ? (itemsFabricacao.reduce((sum, i) => sum + i.percentual_conclusao, 0) / itemsFabricacao.length)
    : 0;

  const montagemCompleta = itemsMontagem.length > 0
    ? (itemsMontagem.reduce((sum, i) => sum + i.percentual_conclusao, 0) / itemsMontagem.length)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Factory className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Atualização de Produção</h1>
              <p className="text-slate-500 text-sm">Registro de progresso em tempo real</p>
            </div>
          </div>
        </div>

        {/* Seletor de Obra */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Selecionar Obra</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={projetoId} onValueChange={setProjetoId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha uma obra..." />
              </SelectTrigger>
              <SelectContent>
                {projetos.map(proj => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.nome} • {proj.cliente_nome || 'Sem cliente'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Resumo da Obra */}
        {projeto && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-500">Obra</p>
                    <p className="font-semibold">{projeto.nome}</p>
                  </div>
                  <Badge variant="outline">{projeto.status}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 mb-2">Progresso Fabricação</p>
                <Progress value={fabricacaoCompleta} className="mb-1" />
                <p className="text-sm font-semibold">{fabricacaoCompleta.toFixed(1)}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-slate-500 mb-2">Progresso Montagem</p>
                <Progress value={montagemCompleta} className="mb-1" />
                <p className="text-sm font-semibold">{montagemCompleta.toFixed(1)}%</p>
              </CardContent>
            </Card>
          </div>
        )}

        {!projetoId ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Selecione uma obra para começar</p>
            </CardContent>
          </Card>
        ) : loadingItems ? (
          <div className="text-center py-12">
            <Loader className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <p className="text-slate-500 mt-2">Carregando itens...</p>
          </div>
        ) : items.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nenhum item de produção nesta obra</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Fabricação */}
            {itemsFabricacao.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Factory className="w-6 h-6" />
                  Fabricação ({itemsFabricacao.length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {itemsFabricacao.map(item => (
                    <ItemProducaoCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Montagem */}
            {itemsMontagem.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Package className="w-6 h-6" />
                  Montagem ({itemsMontagem.length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {itemsMontagem.map(item => (
                    <ItemProducaoCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}