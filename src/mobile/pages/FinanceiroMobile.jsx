// ============================================================
// FINANCEIRO MOBILE - Saldo + Receitas/Despesas + alertas
// ============================================================
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Receipt, Wallet, AlertCircle, PieChart, ChevronRight, Calendar } from 'lucide-react';
import MobileLayout from '../MobileLayout';
import { useERP } from '@/contexts/ERPContext';
import { useObraFiltro } from '../ObraContext';
import { isRecebida, isDespesaPaga, isDespesaAberta, isDespesaAtrasada, vencimentoDe } from '../dados';

const fmtMoney = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

export default function FinanceiroMobile() {
  const erp = useERP?.() || {};
  // FIX: o ERPContext expõe 'lancamentosDespesas' e 'medicoes' — NÃO 'despesas'/'receitas'.
  // Sem este alias, a página vinha 100% zerada.
  const { lancamentosDespesas = [], medicoes = [] } = erp;
  const { matchObra } = useObraFiltro();
  // Aplica o filtro global por obra (quando "Todas", matchObra deixa tudo passar)
  const despesas = useMemo(() => lancamentosDespesas.filter(matchObra), [lancamentosDespesas, matchObra]);
  const receitas = useMemo(() => medicoes.filter(matchObra), [medicoes, matchObra]);

  // Atraso por DATA de vencimento (não só status==='atrasado', que muitos lançamentos não têm).
  // Predicados da fonte única ../dados (medição recebida = 'paga' no banco!).
  const hojeStr = new Date().toISOString().slice(0, 10);
  const vencOf = vencimentoDe;
  const isAtrasada = (d) => isDespesaAtrasada(d, hojeStr);

  const k = useMemo(() => {
    const desP = despesas.filter(isDespesaAberta);
    const desA = despesas.filter(isAtrasada);
    const desVal = desP.reduce((s, d) => s + (Number(d.valor) || 0), 0);
    const desValAtr = desA.reduce((s, d) => s + (Number(d.valor) || 0), 0);
    const recP = receitas.filter(r => !isRecebida(r));
    const recVal = recP.reduce((s, r) => s + (Number(r.valor) || 0), 0);
    const desPagas = despesas.filter(isDespesaPaga).reduce((s, d) => s + (Number(d.valor) || 0), 0);
    const recPagas = receitas.filter(isRecebida).reduce((s, r) => s + (Number(r.valor) || 0), 0);
    return {
      saldo: recPagas - desPagas,
      saldoProj: recVal - desVal,
      desVal, desValAtr, recVal,
      desPCount: desP.length, desACount: desA.length, recPCount: recP.length,
    };
  }, [despesas, receitas]);

  // Próximos vencimentos (próximos 7 dias)
  const proximos = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje); limite.setDate(limite.getDate() + 7);
    return despesas
      .filter(d => isDespesaAberta(d) && vencOf(d))
      .map(d => ({ ...d, dt: new Date(String(vencOf(d)).slice(0, 10) + 'T00:00:00') }))
      .filter(d => d.dt <= limite && !isNaN(d.dt))
      .sort((a, b) => a.dt - b.dt)
      .slice(0, 5);
  }, [despesas]);

  return (
    <MobileLayout title="Financeiro" obraFilter>
      {/* Saldo Projetado Hero */}
      <div className="px-4 pt-4">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Saldo projetado (30d)</div>
          <div className={`text-3xl font-black mt-1 ${k.saldoProj >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {k.saldoProj >= 0 ? '+' : ''}{fmtMoney(k.saldoProj)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Saldo realizado: <span className="text-slate-200 font-semibold">{fmtMoney(k.saldo)}</span>
          </div>
        </div>
      </div>

      {/* Alerta atrasados */}
      {k.desACount > 0 && (
        <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-red-300">{k.desACount} despesa(s) em atraso</div>
            <div className="text-[11px] text-red-400/80">Total: {fmtMoney(k.desValAtr)}</div>
          </div>
          <Link to="/m/despesas" className="text-[11px] font-bold text-red-300 bg-red-500/20 px-3 py-1.5 rounded-lg">Ver</Link>
        </div>
      )}

      {/* A receber / A pagar */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        <Link to="/m/receitas" className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 active:scale-[.98] transition">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <div className="text-[11px] text-emerald-400/80 mt-2 font-semibold">A RECEBER</div>
          <div className="text-lg font-black text-emerald-300 mt-1">{fmtMoney(k.recVal)}</div>
          <div className="text-[10px] text-slate-400">{k.recPCount} título(s)</div>
        </Link>
        <Link to="/m/despesas" className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 active:scale-[.98] transition">
          <TrendingDown className="w-5 h-5 text-red-400" />
          <div className="text-[11px] text-red-400/80 mt-2 font-semibold">A PAGAR</div>
          <div className="text-lg font-black text-red-300 mt-1">{fmtMoney(k.desVal)}</div>
          <div className="text-[10px] text-slate-400">{k.desPCount} título(s)</div>
        </Link>
      </div>

      {/* Próximos vencimentos */}
      {proximos.length > 0 && (
        <div className="px-4 mt-5">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" /> Próximos 7 dias
          </div>
          <div className="space-y-2">
            {proximos.map(d => {
              const isAtraso = isAtrasada(d);
              const dt = d.dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
              return (
                <div key={d.id} className={`rounded-xl border p-3 flex items-center gap-3 ${isAtraso ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900 border-slate-800'}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black ${isAtraso ? 'bg-red-500 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>
                    <div className="text-center leading-none">
                      <div className="text-[9px]">{dt.split(' ')[1]}</div>
                      <div>{dt.split(' ')[0]}</div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{d.descricao || d.fornecedor || '—'}</div>
                    <div className="text-[11px] text-slate-400 truncate">{d.categoria || ''}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${isAtraso ? 'text-red-300' : 'text-slate-200'}`}>{fmtMoney(d.valor)}</div>
                    {isAtraso && <div className="text-[10px] text-red-400">VENCIDA</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Atalhos */}
      <div className="px-4 mt-5 mb-3">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Mais</div>
        <div className="space-y-2">
          {[
            { to: '/m/dre', icon: PieChart, label: 'DRE Mensal', sub: 'Demonstrativo consolidado' },
            { to: '/m/obras-gfo', icon: Wallet, label: 'Gestão por Obra', sub: 'Saldo por projeto' },
            { to: '/m/despesas', icon: Receipt, label: 'Todas as despesas', sub: 'Filtros e busca' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <Link key={s.to} to={s.to} className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-2xl active:scale-[.99] transition">
                <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{s.label}</div>
                  <div className="text-[11px] text-slate-400">{s.sub}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </Link>
            );
          })}
        </div>
      </div>
    </MobileLayout>
  );
}
