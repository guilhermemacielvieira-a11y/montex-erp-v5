// ============================================================
// NOTIFICAÇÕES MOBILE - alertas operacionais derivados dos dados
// ============================================================
// Lista de avisos calculados do ERP (respeitando o filtro global por obra):
// despesas atrasadas, estoque crítico, peças prontas p/ expedição,
// romaneios a conferir, peças aguardando montagem.
// ============================================================
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, Package, Truck, Hammer, PackageCheck, BellOff, ChevronRight,
} from 'lucide-react';
import MobileLayout from '../MobileLayout';
import { useERP } from '@/contexts/ERPContext';
import { useObraFiltro } from '../ObraContext';

const COLORS = {
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: 'text-red-400', badge: 'bg-red-500 text-slate-950' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: 'text-amber-400', badge: 'bg-amber-500 text-slate-950' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: 'text-blue-400', badge: 'bg-blue-500 text-slate-950' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-400', badge: 'bg-emerald-500 text-slate-950' },
};

export default function NotificacoesMobile() {
  const erp = useERP?.() || {};
  const { lancamentosDespesas = [], estoque = [], pecas = [], expedicoes = [] } = erp;
  const { matchObra } = useObraFiltro();

  const notifs = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const list = [];

    // 1) Despesas atrasadas
    const despObra = lancamentosDespesas.filter(matchObra);
    const venc = (d) => d.dataVencimento || d.data_vencimento || '';
    const atrasadas = despObra.filter(d => d.status !== 'pago' && d.status !== 'cancelado' && venc(d) && String(venc(d)).slice(0, 10) < hoje);
    if (atrasadas.length) {
      const total = atrasadas.reduce((s, d) => s + (Number(d.valor) || 0), 0);
      list.push({ id: 'desp', icon: AlertCircle, color: 'red', count: atrasadas.length,
        title: `${atrasadas.length} despesa(s) em atraso`,
        sub: 'R$ ' + total.toLocaleString('pt-BR', { maximumFractionDigits: 0 }), to: '/m/despesas' });
    }

    // 2) Estoque crítico (quantidade <= mínimo)
    const estCrit = estoque.filter(i => { const q = Number(i.quantidade) || 0, m = Number(i.minimo) || 0; return m > 0 && q <= m; });
    if (estCrit.length) {
      list.push({ id: 'est', icon: Package, color: 'amber', count: estCrit.length,
        title: `${estCrit.length} item(ns) com estoque baixo`, sub: 'Repor materiais', to: '/m/estoque' });
    }

    // 3) Peças prontas para expedição (etapa expedido)
    const pecasObra = pecas.filter(matchObra);
    const prontas = pecasObra.filter(p => (p.etapa || '').toLowerCase() === 'expedido');
    if (prontas.length) {
      list.push({ id: 'exp', icon: PackageCheck, color: 'blue', count: prontas.length,
        title: `${prontas.length} peça(s) prontas para expedição`, sub: 'Fila de embarque', to: '/m/expedicao' });
    }

    // 4) Romaneios a conferir (preparando/aguardando_transporte)
    const aConferir = expedicoes.filter(matchObra).filter(e => ['preparando', 'aguardando_transporte'].includes(String(e.status || '').toLowerCase()));
    if (aConferir.length) {
      list.push({ id: 'rom', icon: Truck, color: 'amber', count: aConferir.length,
        title: `${aConferir.length} romaneio(s) a conferir`, sub: 'Conferência de carga', to: '/m/expedicao' });
    }

    // 5) Peças aguardando montagem (etapa enviado)
    const aMontar = pecasObra.filter(p => (p.etapa || '').toLowerCase() === 'enviado');
    if (aMontar.length) {
      list.push({ id: 'mont', icon: Hammer, color: 'emerald', count: aMontar.length,
        title: `${aMontar.length} peça(s) aguardando montagem`, sub: 'Em obra', to: '/m/montagem' });
    }

    return list;
  }, [lancamentosDespesas, estoque, pecas, expedicoes, matchObra]);

  return (
    <MobileLayout title="Notificações" back obraFilter>
      {notifs.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <BellOff className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <div className="text-sm font-semibold text-slate-300">Tudo em dia</div>
          <div className="text-xs text-slate-400 mt-1">Sem alertas no momento</div>
        </div>
      ) : (
        <div className="px-4 pt-3 space-y-2">
          {notifs.map(n => {
            const Icon = n.icon; const c = COLORS[n.color];
            return (
              <Link key={n.id} to={n.to} className={`flex items-center gap-3 rounded-2xl border ${c.bg} ${c.border} p-3.5 active:scale-[.99] transition`}>
                <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${c.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{n.title}</div>
                  <div className="text-[11px] text-slate-400 truncate">{n.sub}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </MobileLayout>
  );
}
