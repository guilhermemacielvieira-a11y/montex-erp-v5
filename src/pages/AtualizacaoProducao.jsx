import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Wrench, Package } from 'lucide-react';
import SeletorPecas from '@/components/producao/SeletorPecas.jsx';
import AtualizadorStatusPeca from '@/components/producao/AtualizadorStatusPeca.jsx';
import PainelAprovacaoAdmin from '@/components/producao/PainelAprovacaoAdmin.jsx';

export default function AtualizacaoProducao() {
  const [etapaAtiva, setEtapaAtiva] = useState('fabricacao');
  const [pecaSelecionada, setPecaSelecionada] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold text-slate-900">Atualização de Produção</h1>
        <p className="text-slate-600">Atualize o status de fabricação e montagem de peças em tempo real</p>
      </div>

      <Tabs value={etapaAtiva} onValueChange={setEtapaAtiva} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fabricacao" className="gap-2">
            <Wrench className="h-4 w-4" />
            Fabricação
          </TabsTrigger>
          <TabsTrigger value="montagem" className="gap-2">
            <Package className="h-4 w-4" />
            Montagem
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="aprovacoes" className="gap-2">
              Aprovações
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="fabricacao" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <SeletorPecas
                etapa="fabricacao"
                pecaSelecionada={pecaSelecionada}
                onSelecionarPeca={setPecaSelecionada}
              />
            </div>
            <div className="lg:col-span-2">
              {pecaSelecionada ? (
                <AtualizadorStatusPeca
                  peca={pecaSelecionada}
                  etapa="fabricacao"
                  onAtualizar={() => setPecaSelecionada(null)}
                />
              ) : (
                <Card className="p-12 text-center border-dashed">
                  <Wrench className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Selecione uma peça para atualizar</p>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="montagem" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <SeletorPecas
                etapa="montagem"
                pecaSelecionada={pecaSelecionada}
                onSelecionarPeca={setPecaSelecionada}
              />
            </div>
            <div className="lg:col-span-2">
              {pecaSelecionada ? (
                <AtualizadorStatusPeca
                  peca={pecaSelecionada}
                  etapa="montagem"
                  onAtualizar={() => setPecaSelecionada(null)}
                />
              ) : (
                <Card className="p-12 text-center border-dashed">
                  <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Selecione uma peça para atualizar</p>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="aprovacoes" className="mt-6">
            <PainelAprovacaoAdmin />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}