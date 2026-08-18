import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Package } from 'lucide-react';
import { useEstoque } from '@/contexts/ERPContext';
import { calcularReposicao } from '@/services/reposicao';

// Alerta de estoque baixo — lê o ESTOQUE REAL do contexto e usa o mesmo cálculo
// de ponto de reposição do módulo de Compras (calcularReposicao). Antes apontava
// para o client legado base44 (campos quantidade_estoque/quantidade_minima) e
// não refletia a tabela `estoque` de verdade.
const fmtNum = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

export default function AlertasEstoqueBaixo({ limite = 6 }) {
  const { estoque } = useEstoque();
  const { linhas, itens, criticos } = useMemo(
    () => calcularReposicao(estoque || []),
    [estoque]
  );

  if (!itens) return null; // estoque saudável (ou sem pontos de reposição definidos)

  const top = linhas.slice(0, limite);

  return (
    <Card className="border-yellow-200 bg-yellow-50 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <CardTitle className="text-sm font-semibold text-yellow-800">Estoque Baixo</CardTitle>
          {criticos > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700 bg-red-100 border border-red-300 rounded px-1.5 py-0.5">
              <AlertCircle className="w-3 h-3" /> {criticos} crítico(s)
            </span>
          )}
          <Badge variant="outline" className="ml-auto bg-yellow-100 text-yellow-800 border-yellow-300">
            {itens}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {top.map((l) => (
          <div key={l.id} className="flex justify-between items-center p-2 bg-white rounded border border-yellow-200">
            <div className="flex items-center gap-2 min-w-0">
              <Package className={`w-4 h-4 flex-shrink-0 ${l.severidade === 'critico' ? 'text-red-600' : 'text-yellow-600'}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{l.descricao || l.codigo}</p>
                {l.codigo && <p className="text-xs text-slate-500 truncate">{l.codigo}</p>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-sm font-bold ${l.severidade === 'critico' ? 'text-red-700' : 'text-yellow-700'}`}>
                {fmtNum(l.saldo)} {l.unidade}
              </p>
              <p className="text-xs text-slate-500">Mín: {fmtNum(l.minimo)}</p>
            </div>
          </div>
        ))}
        {itens > top.length && (
          <p className="text-xs text-yellow-700 text-center pt-1">+{itens - top.length} outro(s) item(ns) para repor</p>
        )}
      </CardContent>
    </Card>
  );
}
