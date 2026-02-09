import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, BarChart3, Settings } from 'lucide-react';
import CustomizadorParametrosRelatorios from '@/components/relatorios/CustomizadorParametrosRelatorios.jsx';
import AnalisePreditivaVendas from '@/components/relatorios/AnalisePreditivaVendas.jsx';
import AnalisePreditivaProjetosDesempenho from '@/components/relatorios/AnalisePreditivaProjetosDesempenho.jsx';
import AnalisePreditivaComportamentoCliente from '@/components/relatorios/AnalisePreditivaComportamentoCliente.jsx';
import ExportadorRelatoriosIA from '@/components/relatorios/ExportadorRelatoriosIA.jsx';

export default function RelatoriosIA() {
  const [customizarAberto, setCustomizarAberto] = useState(false);
  const [parametros, setParametros] = useState({
    periodo: 90,
    incluirPrevisoes: true,
    nivelConfianca: 0.85,
    granularidade: 'mensal'
  });
  const [abaSelecionada, setAbaSelecionada] = useState('vendas');

  const { data: orcamentos } = useQuery({
    queryKey: ['orcamentos'],
    queryFn: () => base44.entities.Orcamento.list('-created_date', 100),
    initialData: []
  });

  const { data: projetos } = useQuery({
    queryKey: ['projetos'],
    queryFn: () => base44.entities.Projeto.list('-created_date', 100),
    initialData: []
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list('-created_date', 100),
    initialData: []
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Relatórios de IA</h1>
          <p className="text-slate-600 mt-2">Análises preditivas e insights baseados em dados históricos</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCustomizarAberto(!customizarAberto)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Customizar
          </Button>
          <ExportadorRelatoriosIA parametros={parametros} abaSelecionada={abaSelecionada} />
        </div>
      </div>

      {/* Customizador */}
      {customizarAberto && (
        <CustomizadorParametrosRelatorios
          parametros={parametros}
          onSalvar={setParametros}
          onFechar={() => setCustomizarAberto(false)}
        />
      )}

      {/* Tabs de Análises */}
      <Tabs value={abaSelecionada} onValueChange={setAbaSelecionada} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="vendas" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="projetos" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Projetos
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="space-y-4">
          <AnalisePreditivaVendas
            parametros={parametros}
            orcamentos={orcamentos}
          />
        </TabsContent>

        <TabsContent value="projetos" className="space-y-4">
          <AnalisePreditivaProjetosDesempenho
            parametros={parametros}
            projetos={projetos}
          />
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <AnalisePreditivaComportamentoCliente
            parametros={parametros}
            clientes={clientes}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}