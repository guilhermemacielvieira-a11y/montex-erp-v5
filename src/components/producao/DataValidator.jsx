import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function DataValidator({ validationResults, onClose }) {
  const { valid, invalid, warnings } = validationResults;
  const validationRate = Math.round((valid.length / (valid.length + invalid.length)) * 100);

  return (
    <Card className="border-amber-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          Validação de Dados ({validationRate}% válidos)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
            <p className="text-xs text-emerald-700">Linhas Válidas</p>
            <p className="text-2xl font-bold text-emerald-700">{valid.length}</p>
          </div>
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <p className="text-xs text-red-700">Linhas com Erro</p>
            <p className="text-2xl font-bold text-red-700">{invalid.length}</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-xs text-yellow-700">Avisos</p>
            <p className="text-2xl font-bold text-yellow-700">{warnings.length}</p>
          </div>
        </div>

        {/* Erros Detalhados */}
        {invalid.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-red-700">Problemas encontrados:</p>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {invalid.slice(0, 10).map((error, idx) => (
                <div key={idx} className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
                  <span className="font-mono">Linha {error.row}:</span> {error.errors.join(', ')}
                </div>
              ))}
              {invalid.length > 10 && (
                <p className="text-xs text-slate-500 italic">
                  ...e mais {invalid.length - 10} linhas com problemas
                </p>
              )}
            </div>
          </div>
        )}

        {/* Avisos */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-amber-700">Avisos (dados serão importados):</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {warnings.slice(0, 5).map((warning, idx) => (
                <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-700">
                  <span className="font-mono">Linha {warning.row}:</span> {warning.message}
                </div>
              ))}
              {warnings.length > 5 && (
                <p className="text-xs text-slate-500 italic">
                  ...e mais {warnings.length - 5} avisos
                </p>
              )}
            </div>
          </div>
        )}

        <div className="text-sm text-slate-600">
          <p>
            {valid.length > 0 
              ? `✓ ${valid.length} item(ns) pronto(s) para importação` 
              : 'Nenhum item válido para importar'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}