// ============================================================
// HOME MOBILE - KPIs + Atalhos + Alertas
// ============================================================
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Hammer, Factory, Wallet, TrendingUp, TrendingDown,
  AlertCircle, ChevronRight, Box, Truck, Receipt, Activity,
} from 'lucide-react';
import MobileLayout from '../MobileLayout';
import { useERP } from '@/contexts/ERPContext';

const fmtBR = (n, dec = 0) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtMoney = (n) => 'R$ ' + fmtBR(n, 0);

function KpiCard({ icon: Icon, label, value, color = 'amber', sub, to }) {
  const C = {
    amber: { bg: 'from-amber-500/15 to-amber-600/5', icon: 'text-amber-400', border: 'border-amber-500/20' },
    blue: { bg: 'from-blue-500/15 to-blue-600/5', icon: 'text-blue-400', border: 'border-blue-500/20' },
    green: { bg: 'from-emerald-500/15 to-emerald-600/5', icon: 'text-emerald-400', border: 'border-emerald-500/20' },
    red: { bg: 'from-red-500/15 to-red-600/5', icon: 'text-red-400', border: 'border-red-500/20' },
    purple: { bg: 'from-violet-500/15 to-violet-600/5', icon: 'text-violet-400', border: 'border-violet-500/20' },
  }[color] || {};
  const Inner = (
    <div className={`relative bg-gradient-to-br ${C.bg} border ${C.border} rounded-2xl p-4 active:scale-[.98] transition`}>
      <div className="flex items-start justify-between mb-2">
        <Icon className={`w-5 h-5 ${C.icon}`} />
        {to && <ChevronRight className="w-4 h-4 text-slate-600" />}
      </div>
      <div className="text-xl font-black tracking-tight">{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
      {sub && <div className={`text-[10px] mt-1 ${C.icon}`}>{sub}</div>}
    </div>
  );
  return to ? <Link to={to}>{Inner}</Link> : Inner;
}

export default function HomeMobile() {
  const erp = useERP?.() || {};
  // FIX: ERPContext expõe 'lancamentosDespesas' e 'medicoes' (não 'despesas'/'receitas').
  const { obras = [], pecas = [], lancamentosDespesas = [], medicoes = [] } = erp;
  const despesas = lancamentosDespesas;
  const receitas = medicoes;

  const stats = useMemo(() => {
    const hojeStr = new Date().toISOString().slice(0, 10);
    const isAtrasada = (d) => { const v = d.dataVencimento || d.data_vencimento; return d.status !== 'pago' && d.status !== 'cancelado' && v && String(v).slice(0, 10) < hojeStr; };
    const aPagar = despesas.filter(d => d.status !== 'pago' && d.status !== 'cancelado');
    const obrasAtivas = obras.filter(o => o.status !== 'concluida' && o.status !== 'cancelada').length;
    const pecasMontadas = pecas.filter(p => p.etapa === 'montado' || p.status === 'MONTADO').length;
    const pecasProducao = pecas.filter(p => ['fabricacao', 'solda', 'pintura', 'expedido', 'enviado'].includes(p.etapa)).length;
    const desPendentes = aPagar.length;
    const desValor = aPagar.reduce((s, d) => s + (Number(d.valor) || 0), 0);
    const recPendentes = receitas.filter(r => r.status !== 'pago').reduce((s, r) => s + (Number(r.valor) || 0), 0);
    const desAtrasadas = despesas.filter(isAtrasada).length;
    return { obrasAtivas, pecasMontadas, pecasProducao, desPendentes, desValor, recPendentes, desAtrasadas };
  }, [obras, pecas, despesas, receitas]);

  return (
    <MobileLayout title="Início">
      {/* Saudação */}
      <div className="px-4 pt-4 pb-3">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">Bem-vindo de volta</div>
        <div className="text-xl font-bold mt-0.5">Painel Geral</div>
      </div>

      {/* Alerta crítico */}
      {stats.desAtrasadas > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-red-300">{stats.desAtrasadas} despesa(s) em atraso</div>
            <div className="text-[11px] text-red-400/80">Revisar imediatamente</div>
          </div>
          <Link to="/m/despesas" className="text-[11px] font-bold text-red-300 bg-red-500/20 px-3 py-1.5 rounded-lg">Ver</Link>
        </motion.div>
      )}

      {/* KPIs Grid 2x2 */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-5">
        <KpiCard icon={Building2} label="Obras ativas" value={stats.obrasAtivas} color="amber" to="/m/obras" />
        <KpiCard icon={Hammer} label="Peças montadas" value={fmtBR(stats.pecasMontadas)} color="green" to="/m/montagem" />
        <KpiCard icon={Factory} label="Em produção" value={fmtBR(stats.pecasProducao)} color="blue" to="/m/kanban" />
        <KpiCard icon={Wallet} label="A pagar" value={fmtMoney(stats.desValor)} sub={`${stats.desPendentes} título(s)`} color="red" to="/m/despesas" />
      </div>

      {/* Atalhos rápidos */}
      <div className="px-4 mb-5">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Atalhos</div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { to: '/m/3d', icon: Box, label: '3D' },
            { to: '/m/expedicao', icon: Truck, label: 'Expedição' },
            { to: '/m/receitas', icon: Receipt, label: 'Receitas' },
            { to: '/m/dashboard', icon: Activity, label: 'BI' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <Link key={s.to} to={s.to} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 active:scale-95 transition">
                <Icon className="w-5 h-5 text-amber-400" />
                <span className="text-[10px] text-slate-300 font-medium text-center leading-tight">{s.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="px-4 mb-5">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Financeiro</div>
        <Link to="/m/financeiro" className="block bg-slate-900/80 border border-slate-800 rounded-2xl p-4 active:scale-[.99] transition">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] text-slate-400">Saldo previsto (30d)</div>
              <div className={`text-2xl font-black ${(stats.recPendentes - stats.desValor) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(stats.recPendentes - stats.desValor) >= 0 ? '+' : ''}{fmtMoney(stats.recPendentes - stats.desValor)}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-500/10 rounded-lg p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                <TrendingUp className="w-3 h-3" /> A RECEBER
              </div>
              <div className="text-sm font-bold text-emerald-300 mt-0.5">{fmtMoney(stats.recPendentes)}</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-2.5">
              <div className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                <TrendingDown className="w-3 h-3" /> A PAGAR
              </div>
              <div className="text-sm font-bold text-red-300 mt-0.5">{fmtMoney(stats.desValor)}</div>
            </div>
          </div>
        </Link>
      </div>
    </MobileLayout>
  );
}
