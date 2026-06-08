// ============================================================
// NOTIFICAÇÕES MOBILE — central de alertas acionáveis
// ============================================================
// Substitui o placeholder "Sem notificações". Lista alertas derivados
// do ERP (ver ui/notificacoes.js): despesas vencidas/a vencer, estoque
// crítico/baixo, peças prontas para embarque, medições pendentes.
// Cada alerta é um LINK para a tela que resolve a pendência.
// ============================================================
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BellOff, ChevronRight, CheckCircle2 } from 'lucide-react';
import MobileLayout from '../MobileLayout';
import { useERP } from '@/contexts/ERPContext';
import { buildNotificacoes } from '../ui/notificacoes';

// Estilo por severidade (2 crítico, 1 atenção, 0 info)
const SEV = {
  2: { wrap: 'bg-red-500/10 border-red-500/30', ic: 'bg-red-500/20 text-red-300', tag: 'CRÍTICO', tagCls: 'text-red-300 bg-red-500/20' },
  1: { wrap: 'bg-amber-500/10 border-amber-500/30', ic: 'bg-amber-500/20 text-amber-300', tag: 'ATENÇÃO', tagCls: 'text-amber-300 bg-amber-500/20' },
  0: { wrap: 'bg-slate-900 border-slate-800', ic: 'bg-blue-500/15 text-blue-300', tag: 'INFO', tagCls: 'text-blue-300 bg-blue-500/15' },
};

export default function NotificacoesMobile() {
  const erp = useERP?.() || {};
  // Recalcula quando qualquer dataset-fonte muda
  const itens = useMemo(() => buildNotificacoes(erp), [
    erp.lancamentosDespesas, erp.estoque, erp.pecas, erp.medicoes,
  ]);

  const criticos = itens.filter(i => i.sev === 2).length;

  return (
    <MobileLayout title="Notificações" back>
      {itens.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-8 pt-20">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="text-base font-bold">Tudo em dia</div>
          <div className="text-sm text-slate-400 mt-1">Nenhuma pendência crítica no momento.</div>
        </div>
      ) : (
        <div className="px-4 pt-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-3">
            {itens.length} alerta(s){criticos > 0 && <span className="text-red-400"> · {criticos} crítico(s)</span>}
          </div>
          <div className="space-y-2.5">
            {itens.map((n, i) => {
              const s = SEV[n.sev] || SEV[0];
              const Icon = n.icon || BellOff;
              return (
                <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link to={n.to} className={`flex items-center gap-3 rounded-2xl border p-3.5 active:scale-[.99] transition ${s.wrap}`}>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.ic}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.tagCls}`}>{s.tag}</span>
                      </div>
                      <div className="text-sm font-semibold leading-tight">{n.titulo}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">{n.sub}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
      <div className="h-6" />
    </MobileLayout>
  );
}
