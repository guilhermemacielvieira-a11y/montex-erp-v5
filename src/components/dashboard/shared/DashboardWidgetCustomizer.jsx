/**
 * DashboardWidgetCustomizer - Seletor de widgets visíveis no Dashboard
 * Versão atualizada e integrada ao DashboardPremium
 * Widgets para Premium: stats, producao, financeiro, globe, alertas, radar, projetos, rh, maquinas, obrasProgress, estoque
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, X, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PREMIUM_WIDGETS = [
  { id: 'stats', label: 'KPI Cards', default: true, description: 'Projetos, OEE, Faturamento' },
  { id: 'producao', label: 'Produção em Tempo Real', default: true, description: 'Gráfico de produção por etapa' },
  { id: 'financeiro', label: 'Fluxo Financeiro', default: true, description: 'Receitas e despesas' },
  { id: 'globe', label: 'Operações Globais 3D', default: true, description: 'Globo 3D interativo' },
  { id: 'alertas', label: 'Alertas Inteligentes', default: true, description: 'Alertas críticos e avisos' },
  { id: 'radar', label: 'Performance Radar', default: true, description: 'Radar de 6 eixos' },
  { id: 'projetos', label: 'Status dos Projetos', default: true, description: 'Donut 3D de status' },
  { id: 'barChart', label: 'Produção Mensal 3D', default: true, description: 'Gráfico de barras 3D' },
  { id: 'rh', label: 'Recursos Humanos', default: true, description: 'Equipes e presença' },
  { id: 'maquinas', label: 'Status Máquinas', default: true, description: 'Grid de máquinas' },
  { id: 'obrasProgress', label: 'Progresso por Obra', default: false, description: 'Barras de 6 etapas por obra' },
  { id: 'estoque', label: 'Resumo Estoque', default: false, description: 'Itens, peso, alertas' },
];

const STORAGE_KEY = 'montex_dashboard_widgets_v2';

export function useWidgetVisibility() {
  const [widgets, setWidgets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    const defaults = {};
    PREMIUM_WIDGETS.forEach(w => { defaults[w.id] = w.default; });
    return defaults;
  });

  const toggle = (id) => {
    setWidgets(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const reset = () => {
    const defaults = {};
    PREMIUM_WIDGETS.forEach(w => { defaults[w.id] = w.default; });
    setWidgets(defaults);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  };

  const isVisible = (id) => widgets[id] !== false;

  return { widgets, toggle, reset, isVisible };
}

export default function DashboardWidgetCustomizer({ open, onClose, widgetState }) {
  const { widgets, toggle, reset } = widgetState;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white">Personalizar Dashboard</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {PREMIUM_WIDGETS.map(widget => (
                <button
                  key={widget.id}
                  onClick={() => toggle(widget.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left',
                    widgets[widget.id] !== false
                      ? 'bg-cyan-500/10 border border-cyan-500/30'
                      : 'bg-slate-800/30 border border-slate-700/20 opacity-60'
                  )}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-md flex items-center justify-center',
                    widgets[widget.id] !== false ? 'bg-cyan-500' : 'bg-slate-700'
                  )}>
                    {widgets[widget.id] !== false && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{widget.label}</div>
                    <div className="text-[11px] text-slate-500">{widget.description}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700/50">
              <button
                onClick={reset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar Padrão
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium transition-all"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
