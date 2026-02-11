/**
 * EstoqueResumoWidget - Resumo do estoque
 * Extraído do DashboardERPIntegrado
 */
import React from 'react';
import { Package, AlertTriangle } from 'lucide-react';

export default function EstoqueResumoWidget({ estoque = [], alertasEstoque = 0, className = '' }) {
  const itensTotal = estoque.length;
  const pesoTotal = estoque.reduce((sum, item) => sum + ((item.peso || 0) * (item.quantidade || 0)), 0);
  const itensDisponiveis = estoque.filter(e => (e.quantidadeAtual || e.quantidade || 0) > 0).length;

  return (
    <div className={`p-4 rounded-xl backdrop-blur-xl bg-slate-900/80 border border-amber-500/20 ${className}`}
      style={{ boxShadow: '0 0 20px rgba(245,158,11,0.08)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white">RESUMO ESTOQUE</span>
        </div>
        {alertasEstoque > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
            <AlertTriangle className="w-3 h-3" />
            {alertasEstoque} alertas
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Itens Cadastrados', value: itensTotal, color: '#22d3ee' },
          { label: 'Peso Total (ton)', value: `${(pesoTotal / 1000).toFixed(1)}t`, color: '#34d399' },
          { label: 'Disponíveis', value: itensDisponiveis, color: '#60a5fa' },
          { label: 'Em Alerta', value: alertasEstoque, color: alertasEstoque > 0 ? '#ef4444' : '#34d399' },
        ].map((item, i) => (
          <div key={i} className="text-center p-2 rounded-lg bg-slate-800/40">
            <div className="text-lg font-bold font-mono" style={{ color: item.color }}>{item.value}</div>
            <div className="text-[9px] text-slate-500 mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
