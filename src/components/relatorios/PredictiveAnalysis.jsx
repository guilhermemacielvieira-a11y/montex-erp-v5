import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Calendar,
  Target,
  Clock
} from 'lucide-react';

export default function PredictiveAnalysis({ analise }) {
  if (!analise) return null;

  const getConfiancaColor = (nivel) => {
    if (nivel >= 80) return 'text-emerald-600 bg-emerald-100';
    if (nivel >= 60) return 'text-blue-600 bg-blue-100';
    if (nivel >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRiscoColor = (nivel) => {
    if (nivel === 'baixo') return 'text-emerald-600 bg-emerald-100 border-emerald-200';
    if (nivel === 'medio') return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* Previsão de Conclusão */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Previsão de Conclusão (IA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-xs text-emerald-600 font-medium mb-1">Cenário Otimista</p>
              <p className="text-lg font-bold text-emerald-900">
                {analise.previsao_conclusao?.otimista || '-'}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                {analise.dias_restantes?.otimista ? `${analise.dias_restantes.otimista} dias` : ''}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600 font-medium mb-1">Cenário Realista</p>
              <p className="text-lg font-bold text-blue-900">
                {analise.previsao_conclusao?.realista || '-'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {analise.dias_restantes?.realista ? `${analise.dias_restantes.realista} dias` : ''}
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-xs text-orange-600 font-medium mb-1">Cenário Pessimista</p>
              <p className="text-lg font-bold text-orange-900">
                {analise.previsao_conclusao?.pessimista || '-'}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                {analise.dias_restantes?.pessimista ? `${analise.dias_restantes.pessimista} dias` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-sm text-slate-600">Nível de Confiança da Previsão</span>
            <Badge className={getConfiancaColor(analise.confianca_previsao || 0)}>
              {analise.confianca_previsao || 0}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Análise de Riscos */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Riscos Identificados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analise.riscos?.length > 0 ? (
            <div className="space-y-3">
              {analise.riscos.map((risco, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${getRiscoColor(risco.nivel)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <h4 className="font-semibold text-sm">{risco.tipo}</h4>
                    </div>
                    <Badge variant="outline" className={getRiscoColor(risco.nivel)}>
                      {risco.nivel.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm mb-2">{risco.descricao}</p>
                  {risco.impacto && (
                    <p className="text-xs opacity-75">
                      <strong>Impacto:</strong> {risco.impacto}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Nenhum risco crítico identificado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recomendações */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Recomendações de Ação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analise.recomendacoes?.length > 0 ? (
            <div className="space-y-3">
              {analise.recomendacoes.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-purple-50 rounded-lg border border-purple-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-purple-700">{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-purple-900 mb-1">
                        {rec.titulo}
                      </h4>
                      <p className="text-sm text-purple-700">{rec.descricao}</p>
                      {rec.prazo && (
                        <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Prazo sugerido: {rec.prazo}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <Target className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Nenhuma ação imediata necessária</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tendências */}
      {analise.tendencias && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Tendências Identificadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analise.tendencias.fabricacao && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Tendência de Fabricação</span>
                  <div className="flex items-center gap-2">
                    {analise.tendencias.fabricacao.direcao === 'crescente' ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-semibold">
                      {analise.tendencias.fabricacao.valor}
                    </span>
                  </div>
                </div>
              )}
              {analise.tendencias.montagem && (
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">Tendência de Montagem</span>
                  <div className="flex items-center gap-2">
                    {analise.tendencias.montagem.direcao === 'crescente' ? (
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm font-semibold">
                      {analise.tendencias.montagem.valor}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}