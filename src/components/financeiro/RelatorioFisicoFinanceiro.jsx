import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Save, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

export default function RelatorioFisicoFinanceiro({ projetoId: initialProjetoId = 'todos', projetos = [] }) {
  const [custoPorKgFabricacao, setCustoPorKgFabricacao] = useState(0);
  const [custoPorKgMontagem, setCustoPorKgMontagem] = useState(0);
  const [abaSelecionada, setAbaSelecionada] = useState('fabricacao');
  const [projetoId, setProjetoId] = useState(initialProjetoId);
  const queryClient = useQueryClient();

  // Mutation para salvar custos por KG
  const salvarCustoMutation = useMutation({
    mutationFn: ({ id, fabricacao, montagem }) =>
      base44.entities.Projeto.update(id, {
        custo_por_kg_fabricacao: fabricacao,
        custo_por_kg_montagem: montagem
      }),
    onSuccess: () => {
      toast.success('Custos salvos com sucesso');
      queryClient.invalidateQueries({ queryKey: ['projetos'] });
    },
    onError: () => {
      toast.error('Erro ao salvar custos');
    }
  });

  // Efeito para carregar custos salvos quando projeto muda
  useEffect(() => {
    if (projetoId && projetoId !== 'todos') {
      const projeto = projetos.find(p => p.id === projetoId);
      if (projeto) {
        setCustoPorKgFabricacao(projeto.custo_por_kg_fabricacao || 0);
        setCustoPorKgMontagem(projeto.custo_por_kg_montagem || 0);
      }
    } else {
      setCustoPorKgFabricacao(0);
      setCustoPorKgMontagem(0);
    }
  }, [projetoId, projetos]);

  // Função para salvar custos
  const handleSalvarCustos = () => {
    if (projetoId && projetoId !== 'todos') {
      salvarCustoMutation.mutate({
        id: projetoId,
        fabricacao: custoPorKgFabricacao,
        montagem: custoPorKgMontagem
      });
    }
  };

  // Fetch production items and launches
  const { data: itensProducao = [] } = useQuery({
    queryKey: ['itensProducao', projetoId],
    queryFn: () => {
      if (projetoId === 'todos') {
        return base44.entities.ItemProducao.list('-created_date', 1000);
      }
      return base44.entities.ItemProducao.filter(
        { projeto_id: projetoId },
        '-created_date',
        1000
      );
    }
  });

  const { data: lancamentos = [] } = useQuery({
    queryKey: ['lancamentos', projetoId],
    queryFn: () => {
      if (projetoId === 'todos') {
        return base44.entities.LancamentoProducao.list('-data_lancamento', 2000);
      }
      return base44.entities.LancamentoProducao.filter(
        { projeto_id: projetoId },
        '-data_lancamento',
        2000
      );
    }
  });

  // Calculate metrics for fabricacao
  const fabricacaoMetrics = useMemo(() => {
    const itensFabricacao = itensProducao.filter(i => i.etapa === 'fabricacao');
    const lancsFabricacao = lancamentos.filter(l => l.etapa === 'fabricacao');

    const pesoTotal = itensProducao.filter(i => i.etapa === 'montagem').reduce((acc, item) => 
      acc + ((item.peso_unitario || 0) * (item.quantidade || 0)), 0
    );

    const pesoFabricado = lancsFabricacao.reduce((acc, lanc) => 
      acc + (lanc.peso_realizado || 0), 0
    );

    const percentualConclusao = pesoTotal > 0 ? (pesoFabricado / pesoTotal) * 100 : 0;
    const custoRealizado = pesoFabricado * custoPorKgFabricacao;

    // Cálculo de previsão de custos
    const pesoPendente = pesoTotal - pesoFabricado;
    const custoEstimadoPendente = pesoPendente * custoPorKgFabricacao;
    const custoTotalEstimado = custoRealizado + custoEstimadoPendente;

    return {
      pesoTotal,
      pesoFabricado,
      percentualConclusao,
      custoRealizado,
      pesoPendente,
      custoEstimadoPendente,
      custoTotalEstimado
    };
  }, [itensProducao, lancamentos, custoPorKgFabricacao]);

  // Calculate metrics for montagem
  const montaemMetrics = useMemo(() => {
    const itensMontagem = itensProducao.filter(i => i.etapa === 'montagem');
    const lancsMontagem = lancamentos.filter(l => l.etapa === 'montagem');

    const pesoTotal = itensProducao.filter(i => i.etapa === 'montagem').reduce((acc, item) => 
      acc + ((item.peso_unitario || 0) * (item.quantidade || 0)), 0
    );

    const pesoMontado = lancsMontagem.reduce((acc, lanc) => 
      acc + (lanc.peso_realizado || 0), 0
    );

    const percentualConclusao = pesoTotal > 0 ? (pesoMontado / pesoTotal) * 100 : 0;
    const custoRealizado = pesoMontado * custoPorKgMontagem;

    // Cálculo de previsão de custos
    const pesoPendente = pesoTotal - pesoMontado;
    const custoEstimadoPendente = pesoPendente * custoPorKgMontagem;
    const custoTotalEstimado = custoRealizado + custoEstimadoPendente;

    return {
      pesoTotal,
      pesoMontado,
      percentualConclusao,
      custoRealizado,
      pesoPendente,
      custoEstimadoPendente,
      custoTotalEstimado
    };
  }, [itensProducao, lancamentos, custoPorKgMontagem]);

  const formatarNumero = (valor, casasDecimais = 2) => {
    return valor.toLocaleString('pt-BR', { 
      minimumFractionDigits: casasDecimais,
      maximumFractionDigits: casasDecimais
    });
  };

  return (
    <div className="space-y-6">
      {/* Seletor de Projeto */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label className="text-sm font-medium mb-2">Projeto</Label>
          <select
            value={projetoId}
            onChange={(e) => setProjetoId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos os Projetos</option>
            {projetos.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
      </div>

      <Tabs value={abaSelecionada} onValueChange={setAbaSelecionada} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="fabricacao">
            <BarChart3 className="h-4 w-4 mr-2" />
            Fabricação
          </TabsTrigger>
          <TabsTrigger value="montagem">
            <BarChart3 className="h-4 w-4 mr-2" />
            Montagem
          </TabsTrigger>
        </TabsList>

        {/* Aba Fabricação */}
        <TabsContent value="fabricacao" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Físico-Financeiro - Fabricação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Custo por KG Input */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="custoPorKgFab" className="text-sm font-medium">
                    Custo por KG (R$)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="custoPorKgFab"
                      type="number"
                      step="0.01"
                      value={custoPorKgFabricacao}
                      onChange={(e) => setCustoPorKgFabricacao(parseFloat(e.target.value) || 0)}
                      placeholder="5.50"
                      className="text-lg font-semibold"
                      disabled={!projetoId || projetoId === 'todos'}
                    />
                    <Button
                      onClick={handleSalvarCustos}
                      disabled={!projetoId || projetoId === 'todos' || salvarCustoMutation.isPending}
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600">Peso Total</Label>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatarNumero(fabricacaoMetrics.pesoTotal)} kg
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600">Peso Fabricado</Label>
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatarNumero(fabricacaoMetrics.pesoFabricado)} kg
                  </div>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Avanço Físico */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-blue-600 font-medium mb-2">Avanço Físico</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {formatarNumero(fabricacaoMetrics.percentualConclusao)}%
                      </p>
                      <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${fabricacaoMetrics.percentualConclusao}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Valor Total Previsto */}
                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-purple-600 font-medium mb-2">Valor Previsto</p>
                      <p className="text-3xl font-bold text-purple-900">
                        R$ {formatarNumero(fabricacaoMetrics.pesoTotal * custoPorKgFabricacao)}
                      </p>
                      <p className="text-xs text-purple-600 mt-2">
                        {formatarNumero(fabricacaoMetrics.pesoTotal)} kg × R$ {formatarNumero(custoPorKgFabricacao)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Custo Realizado */}
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-emerald-600 font-medium mb-2">Custo Realizado</p>
                      <p className="text-3xl font-bold text-emerald-900">
                        R$ {formatarNumero(fabricacaoMetrics.custoRealizado)}
                      </p>
                      <p className="text-xs text-emerald-600 mt-2">
                        {formatarNumero(fabricacaoMetrics.pesoFabricado)} kg × R$ {formatarNumero(custoPorKgFabricacao)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Custo por KG */}
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-orange-600 font-medium mb-2">Valor/KG</p>
                      <p className="text-3xl font-bold text-orange-900">
                        R$ {formatarNumero(custoPorKgFabricacao)}
                      </p>
                      <p className="text-xs text-orange-600 mt-2">Custo unitário configurado</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Custo Total Estimado */}
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-red-600 font-medium mb-2">Custo Total Estimado</p>
                      <p className="text-3xl font-bold text-red-900">
                        R$ {formatarNumero(fabricacaoMetrics.custoTotalEstimado)}
                      </p>
                      <p className="text-xs text-red-600 mt-2">
                        {formatarNumero(fabricacaoMetrics.custoRealizado)} (realizado) + {formatarNumero(fabricacaoMetrics.custoEstimadoPendente)} (previsto)
                      </p>
                    </div>
                  </CardContent>
                </Card>
                </div>

                {custoPorKgFabricacao === 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    Defina o custo por KG para calcular o custo realizado
                  </p>
                </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Montagem */}
        <TabsContent value="montagem" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Físico-Financeiro - Montagem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Custo por KG Input */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="custoPorKgMont" className="text-sm font-medium">
                    Custo por KG (R$)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="custoPorKgMont"
                      type="number"
                      step="0.01"
                      value={custoPorKgMontagem}
                      onChange={(e) => setCustoPorKgMontagem(parseFloat(e.target.value) || 0)}
                      placeholder="5.50"
                      className="text-lg font-semibold"
                      disabled={!projetoId || projetoId === 'todos'}
                    />
                    <Button
                      onClick={handleSalvarCustos}
                      disabled={!projetoId || projetoId === 'todos' || salvarCustoMutation.isPending}
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600">Peso Total</Label>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatarNumero(montaemMetrics.pesoTotal)} kg
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600">Peso Montado</Label>
                  <div className="text-2xl font-bold text-emerald-600">
                    {formatarNumero(montaemMetrics.pesoMontado)} kg
                  </div>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Avanço Físico */}
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-blue-600 font-medium mb-2">Avanço Físico</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {formatarNumero(montaemMetrics.percentualConclusao)}%
                      </p>
                      <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${montaemMetrics.percentualConclusao}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Valor Total Previsto */}
                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-purple-600 font-medium mb-2">Valor Previsto</p>
                      <p className="text-3xl font-bold text-purple-900">
                        R$ {formatarNumero(montaemMetrics.pesoTotal * custoPorKgMontagem)}
                      </p>
                      <p className="text-xs text-purple-600 mt-2">
                        {formatarNumero(montaemMetrics.pesoTotal)} kg × R$ {formatarNumero(custoPorKgMontagem)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Custo Realizado */}
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-emerald-600 font-medium mb-2">Custo Realizado</p>
                      <p className="text-3xl font-bold text-emerald-900">
                        R$ {formatarNumero(montaemMetrics.custoRealizado)}
                      </p>
                      <p className="text-xs text-emerald-600 mt-2">
                        {formatarNumero(montaemMetrics.pesoMontado)} kg × R$ {formatarNumero(custoPorKgMontagem)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Custo por KG */}
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-orange-600 font-medium mb-2">Valor/KG</p>
                      <p className="text-3xl font-bold text-orange-900">
                        R$ {formatarNumero(custoPorKgMontagem)}
                      </p>
                      <p className="text-xs text-orange-600 mt-2">Custo unitário configurado</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Custo Total Estimado */}
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <p className="text-sm text-red-600 font-medium mb-2">Custo Total Estimado</p>
                      <p className="text-3xl font-bold text-red-900">
                        R$ {formatarNumero(montaemMetrics.custoTotalEstimado)}
                      </p>
                      <p className="text-xs text-red-600 mt-2">
                        {formatarNumero(montaemMetrics.custoRealizado)} (realizado) + {formatarNumero(montaemMetrics.custoEstimadoPendente)} (previsto)
                      </p>
                    </div>
                  </CardContent>
                </Card>
                </div>

                {custoPorKgMontagem === 0 && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    Defina o custo por KG para calcular o custo realizado
                  </p>
                </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}