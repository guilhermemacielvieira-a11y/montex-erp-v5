// SimuladorPage - Redirecionamento para módulo unificado SimuladorOrcamento
// O SimuladorPage foi integrado ao SimuladorOrcamento como Step 2 (Custos Unitários)
import React, { useEffect } from 'react';

export default function SimuladorPage() {
  useEffect(() => {
    window.location.href = '/SimuladorOrcamento';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
        <p className="text-slate-400">Redirecionando para o Simulador de Orçamento...</p>
      </div>
    </div>
  );
}
