import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function ComparadorPeriodos({ dados, metricaChave, metricaLabel }) {
  const [periodo1, setPeriodo1] = useState('atual');
  const [periodo2, setPeriodo2] = useState('anterior');
  const [aberto, setAberto] = useState(false);

  const periodos = [
    { id: 'atual', label: 'Período Atual' },
    { id: 'anterior', label: 'Período Anterior' },
    { id: 'há-3-meses', label: 'Há 3 Meses' },
    { id: 'há-6-meses', label: 'Há 6 Meses' },
    { id: 'há-1-ano', label: 'Há 1 Ano' }
  ];

  const simularValorPeriodo = (periodo) => {
    const base = dados[metricaChave] || 100;
    const variacao = {
      'atual': base,
      'anterior': Math.round(base * 0.92),
      'há-3-meses': Math.round(base * 0.85),
      'há-6-meses': Math.round(base * 0.78),
      'há-1-ano': Math.round(base * 0.70)
    };
    return variacao[periodo] || base;
  };

  const valor1 = simularValorPeriodo(periodo1);
  const valor2 = simularValorPeriodo(periodo2);
  const diferenca = valor1 - valor2;
  const percentualMudanca = valor2 !== 0 ? ((diferenca / valor2) * 100).toFixed(1) : 0;
  const ehMelhor = diferenca > 0;

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-slate-900">Comparador de Períodos</CardTitle>
            <CardDescription>Visualize tendências e comparações</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAberto(!aberto)}
            className="text-purple-600"
          >
            {aberto ? 'Fechar' : 'Abrir'}
          </Button>
        </div>
      </CardHeader>

      {aberto && (
        <CardContent className="space-y-4">
          {/* Seletores de Período */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Período 1</label>
              <Select value={periodo1} onValueChange={setPeriodo1}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Período 2</label>
              <Select value={periodo2} onValueChange={setPeriodo2}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparação Visual */}
          <div className="bg-white rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Coluna 1 */}
              <div className="space-y-2 border-r border-slate-200 pr-4">
                <p className="text-xs text-slate-600 font-medium">PERÍODO 1</p>
                <p className="text-2xl font-bold text-slate-900">{valor1}</p>
                <p className="text-xs text-slate-600">{periodos.find(p => p.id === periodo1)?.label}</p>
              </div>

              {/* Seta de Comparação */}
              <div className="flex items-center justify-center">
                {ehMelhor ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-600" />
                )}
              </div>

              {/* Coluna 2 */}
              <div className="space-y-2 border-l border-slate-200 pl-4">
                <p className="text-xs text-slate-600 font-medium">PERÍODO 2</p>
                <p className="text-2xl font-bold text-slate-900">{valor2}</p>
                <p className="text-xs text-slate-600">{periodos.find(p => p.id === periodo2)?.label}</p>
              </div>
            </div>

            {/* Resumo da Diferença */}
            <div className="bg-slate-50 rounded p-3 space-y-2">
              <p className="text-sm font-medium text-slate-700">Mudança</p>
              <div className="flex items-center gap-2">
                <Badge className={ehMelhor ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {ehMelhor ? '+' : ''}{percentualMudanca}%
                </Badge>
                <span className="text-sm text-slate-600">
                  {ehMelhor ? 'Crescimento' : 'Queda'} de {Math.abs(diferenca)} unidades
                </span>
              </div>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-slate-50 rounded p-3 space-y-2">
            <p className="text-xs font-medium text-slate-700 uppercase">Insight</p>
            {ehMelhor ? (
              <p className="text-sm text-slate-700">
                ✓ {metricaLabel} cresceu <strong>{percentualMudanca}%</strong> em relação ao período anterior
              </p>
            ) : (
              <p className="text-sm text-slate-700">
                ⚠ {metricaLabel} diminuiu <strong>{Math.abs(percentualMudanca)}%</strong> em relação ao período anterior
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}