import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, TrendingUp, DollarSign, Package, Percent } from 'lucide-react';

export default function SimuladorPage() {
  const [valores, setValores] = useState({
    pesoTotal: 50000,
    custoPorKgFabricacao: 5.5,
    custoPorKgMontagem: 3.5,
    custoTransporte: 1.0,
    custoEngenharia: 0.5,
    margemLucro: 15,
    impostos: 12,
  });

  const resultados = useMemo(() => {
    const custoFabricacao = valores.pesoTotal * valores.custoPorKgFabricacao;
    const custoMontagem = valores.pesoTotal * valores.custoPorKgMontagem;
    const custoTransporte = valores.pesoTotal * valores.custoTransporte;
    const custoEngenharia = valores.pesoTotal * valores.custoEngenharia;

    const custoTotal = custoFabricacao + custoMontagem + custoTransporte + custoEngenharia;
    const lucro = custoTotal * (valores.margemLucro / 100);
    const subtotal = custoTotal + lucro;
    const impostos = subtotal * (valores.impostos / 100);
    const valorFinal = subtotal + impostos;
    const precoPorKg = valorFinal / valores.pesoTotal;

    return {
      custoFabricacao,
      custoMontagem,
      custoTransporte,
      custoEngenharia,
      custoTotal,
      lucro,
      subtotal,
      impostos,
      valorFinal,
      precoPorKg,
    };
  }, [valores]);

  const handleChange = (campo, valor) => {
    setValores(prev => ({
      ...prev,
      [campo]: parseFloat(valor) || 0
    }));
  };

  const formatCurrency = (value) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Simulador de Orçamento</h1>
          <p className="text-gray-500 mt-1">Calcule o valor de venda para estruturas metálicas</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700">
          <Calculator className="h-4 w-4 mr-2" />
          Gerar Orçamento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Dados do Projeto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pesoTotal">Peso Total (kg)</Label>
                <Input
                  id="pesoTotal"
                  type="number"
                  value={valores.pesoTotal}
                  onChange={(e) => handleChange('pesoTotal', e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Custos por Kg
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="custoPorKgFabricacao">Fabricação (R$/kg)</Label>
                  <Input
                    id="custoPorKgFabricacao"
                    type="number"
                    step="0.1"
                    value={valores.custoPorKgFabricacao}
                    onChange={(e) => handleChange('custoPorKgFabricacao', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="custoPorKgMontagem">Montagem (R$/kg)</Label>
                  <Input
                    id="custoPorKgMontagem"
                    type="number"
                    step="0.1"
                    value={valores.custoPorKgMontagem}
                    onChange={(e) => handleChange('custoPorKgMontagem', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="custoTransporte">Transporte (R$/kg)</Label>
                  <Input
                    id="custoTransporte"
                    type="number"
                    step="0.1"
                    value={valores.custoTransporte}
                    onChange={(e) => handleChange('custoTransporte', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="custoEngenharia">Engenharia (R$/kg)</Label>
                  <Input
                    id="custoEngenharia"
                    type="number"
                    step="0.1"
                    value={valores.custoEngenharia}
                    onChange={(e) => handleChange('custoEngenharia', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Margens e Impostos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="margemLucro">Margem de Lucro (%)</Label>
                  <Input
                    id="margemLucro"
                    type="number"
                    step="0.5"
                    value={valores.margemLucro}
                    onChange={(e) => handleChange('margemLucro', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="impostos">Impostos (%)</Label>
                  <Input
                    id="impostos"
                    type="number"
                    step="0.5"
                    value={valores.impostos}
                    onChange={(e) => handleChange('impostos', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resultados */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <TrendingUp className="h-5 w-5" />
                Resultado da Simulação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-blue-200">
                  <span className="text-gray-600">Custo Fabricação:</span>
                  <span className="font-medium">{formatCurrency(resultados.custoFabricacao)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-200">
                  <span className="text-gray-600">Custo Montagem:</span>
                  <span className="font-medium">{formatCurrency(resultados.custoMontagem)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-200">
                  <span className="text-gray-600">Custo Transporte:</span>
                  <span className="font-medium">{formatCurrency(resultados.custoTransporte)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-200">
                  <span className="text-gray-600">Custo Engenharia:</span>
                  <span className="font-medium">{formatCurrency(resultados.custoEngenharia)}</span>
                </div>
                <div className="flex justify-between py-2 border-b-2 border-blue-300">
                  <span className="font-semibold text-gray-700">Custo Total:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(resultados.custoTotal)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-200">
                  <span className="text-gray-600">Lucro ({valores.margemLucro}%):</span>
                  <span className="font-medium text-green-600">{formatCurrency(resultados.lucro)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-blue-200">
                  <span className="text-gray-600">Impostos ({valores.impostos}%):</span>
                  <span className="font-medium text-red-600">{formatCurrency(resultados.impostos)}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-600 rounded-lg text-white">
                <div className="flex justify-between items-center">
                  <span className="text-lg">Valor Final:</span>
                  <span className="text-3xl font-bold">{formatCurrency(resultados.valorFinal)}</span>
                </div>
                <div className="flex justify-between items-center mt-2 text-blue-200">
                  <span>Preço por kg:</span>
                  <span className="font-medium">{formatCurrency(resultados.precoPorKg)}/kg</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
