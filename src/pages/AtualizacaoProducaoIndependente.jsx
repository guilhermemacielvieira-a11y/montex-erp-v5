import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Factory, Package, Loader } from 'lucide-react';
import ItemProducaoCard from '@/components/producao/ItemProducaoCard.jsx';
import CompartilhadorLink from '@/components/producao/CompartilhadorLink.jsx';

export default function AtualizacaoProducaoIndependente() {
  const [projetoId, setProjetoId] = useState('');
  const [items, setItems] = useState([]);
  const [filtroEtapa, setFiltroEtapa] = useState('todas');

  const { data: projetos = [], isLoading: loadingProjetos } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => base44.entities.Projeto.list()
  });

  const { data: itemsData = [], isLoading: loadingItems, refetch } = useQuery({
    queryKey: ['itemsProducao', projetoId],
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

    // Subscribe a mudanças em tempo real
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

  const itemsExibicao = filtroEtapa === 'todas' ? items :
    filtroEtapa === 'fabricacao' ? itemsFabricacao :
    itemsMontagem;

  const fabricacaoCompleta = itemsFabricacao.length > 0
    ? (itemsFabricacao.reduce((sum, i) => sum + i.percentual_conclusao, 0) / itemsFabricacao.length)
    : 0;

  const montagemCompleta = itemsMontagem.length > 0
    ? (itemsMontagem.reduce((sum, i) => sum + i.percentual_conclusao, 0) / itemsMontagem.length)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Factory className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Atualização de Produção</h1>
              <p className="text-slate-500">Sistema de acompanhamento em tempo real</p>
            </div>
          </div>
        </div>

        {/* Compartilhador de Link */}
        <CompartilhadorLink />

        {/* Seletor de Obra */}
        <Card className="mb-8 mt-8">
          <CardHeader>
            <CardTitle>Selecionar Obra</CardTitle>
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
           <div className="space-y-6">
             {/* Filtro de Etapa */}
             <div className="flex gap-2">
               <Button
                 onClick={() => setFiltroEtapa('todas')}
                 variant={filtroEtapa === 'todas' ? 'default' : 'outline'}
                 className={filtroEtapa === 'todas' ? 'bg-blue-600' : ''}
               >
                 Todas ({items.length})
               </Button>
               <Button
                 onClick={() => setFiltroEtapa('fabricacao')}
                 variant={filtroEtapa === 'fabricacao' ? 'default' : 'outline'}
                 className={filtroEtapa === 'fabricacao' ? 'bg-blue-600' : ''}
               >
                 Fabricação ({itemsFabricacao.length})
               </Button>
               <Button
                 onClick={() => setFiltroEtapa('montagem')}
                 variant={filtroEtapa === 'montagem' ? 'default' : 'outline'}
                 className={filtroEtapa === 'montagem' ? 'bg-blue-600' : ''}
               >
                 Montagem ({itemsMontagem.length})
               </Button>
             </div>

             {/* Itens Filtrados */}
             {itemsExibicao.length > 0 ? (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 {itemsExibicao.map(item => (
                   <ItemProducaoCard key={item.id} item={item} />
                 ))}
               </div>
             ) : (
               <Card className="text-center py-12">
                 <CardContent>
                   <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                   <p className="text-slate-500">
                     Nenhum item de {filtroEtapa === 'fabricacao' ? 'fabricação' : 'montagem'}
                   </p>
                 </CardContent>
               </Card>
             )}
           </div>
         )}
      </div>
    </div>
  );
}