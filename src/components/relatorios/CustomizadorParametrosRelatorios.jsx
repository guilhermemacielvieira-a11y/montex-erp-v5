import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { X } from 'lucide-react';

export default function CustomizadorParametrosRelatorios({ parametros, onSalvar, onFechar }) {
  const [locais, setLocais] = useState({
    periodo: parametros.periodo,
    incluirPrevisoes: parametros.incluirPrevisoes,
    nivelConfianca: parametros.nivelConfianca,
    granularidade: parametros.granularidade
  });

  const handleSalvar = () => {
    onSalvar(locais);
    onFechar();
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <CardTitle>Customizar Parâmetros</CardTitle>
          <CardDescription>Ajuste os parâmetros para personalizar as análises</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onFechar}
          className="text-blue-900 hover:bg-blue-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Período */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="periodo" className="text-slate-700 font-medium">
              Período de Análise
            </Label>
            <span className="text-sm font-semibold text-blue-600">{locais.periodo} dias</span>
          </div>
          <Slider
            id="periodo"
            min={30}
            max={365}
            step={30}
            value={[locais.periodo]}
            onValueChange={(val) => setLocais({ ...locais, periodo: val[0] })}
            className="w-full"
          />
          <p className="text-xs text-slate-600">
            Quanto maior o período, mais histórico será considerado nas previsões
          </p>
        </div>

        {/* Nível de Confiança */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="confianca" className="text-slate-700 font-medium">
              Nível de Confiança
            </Label>
            <span className="text-sm font-semibold text-blue-600">{Math.round(locais.nivelConfianca * 100)}%</span>
          </div>
          <Slider
            id="confianca"
            min={0.5}
            max={0.99}
            step={0.05}
            value={[locais.nivelConfianca]}
            onValueChange={(val) => setLocais({ ...locais, nivelConfianca: val[0] })}
            className="w-full"
          />
          <p className="text-xs text-slate-600">
            Quanto maior, mais conservador nas previsões (menor risco de erro)
          </p>
        </div>

        {/* Granularidade */}
        <div className="space-y-3">
          <Label htmlFor="granularidade" className="text-slate-700 font-medium">
            Granularidade dos Dados
          </Label>
          <Select value={locais.granularidade} onValueChange={(val) => setLocais({ ...locais, granularidade: val })}>
            <SelectTrigger id="granularidade" className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-600">
            Define o agrupamento dos dados nos gráficos
          </p>
        </div>

        {/* Incluir Previsões */}
        <div className="space-y-3">
          <Label className="text-slate-700 font-medium">Incluir Previsões IA</Label>
          <div className="flex gap-4">
            <button
              onClick={() => setLocais({ ...locais, incluirPrevisoes: true })}
              className={`flex-1 py-2 px-4 rounded border transition-all ${
                locais.incluirPrevisoes
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              Sim
            </button>
            <button
              onClick={() => setLocais({ ...locais, incluirPrevisoes: false })}
              className={`flex-1 py-2 px-4 rounded border transition-all ${
                !locais.incluirPrevisoes
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
            >
              Não
            </button>
          </div>
          <p className="text-xs text-slate-600">
            Ativa a exibição de linhas de previsão nos gráficos
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onFechar} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSalvar} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Salvar e Aplicar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}