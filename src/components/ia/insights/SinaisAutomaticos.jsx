// ============================================================
// Insights IA — "Sinais automáticos (sem IA)"
// ============================================================
// Sempre visível (mesmo sem IA configurada): alertas mais graves do Radar
// (regras determinísticas, dados reais) + números-chave do BI no escopo.
// ============================================================

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Gauge, Briefcase, Factory, Wallet, ArrowRight, ShieldCheck } from 'lucide-react';
import { KpiTile, fmtBRLc, fmtKg, fmtNum } from '@/components/bi/biUi';
import { SEV_UI } from '@/components/bi/radar/radarUi';
import { useAlertasStatus } from '@/hooks/useAlertasStatus';

export default function SinaisAutomaticos({ bi }) {
  const { statusDe } = useAlertasStatus();
  const exec = bi?.obras?.executivo || {};
  const tend = bi?.producao?.tendencia || {};
  const aging = bi?.financeiro?.aging || {};

  const abertos = useMemo(
    () => (bi?.alertas || []).filter((a) => !['resolvido', 'ignorado'].includes(statusDe(a.id))),
    [bi?.alertas, statusDe],
  );
  const top = abertos.slice(0, 5);

  return (
    <section className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 min-w-0" aria-labelledby="sinais-titulo">
      <header className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 id="sinais-titulo" className="flex items-center gap-2 text-sm font-semibold text-white">
            <Gauge className="h-4 w-4 text-sky-400" aria-hidden /> Sinais automáticos (sem IA)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Regras fixas sobre os dados reais do ERP, no escopo do topo. Atualizam sozinhos.</p>
        </div>
        <Link
          to="/RadarAlertas"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          Radar de Alertas ({fmtNum(abertos.length)} abertos) <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiTile
          icone={Briefcase}
          rotulo="Carteira a executar"
          valor={fmtBRLc(exec.carteiraValor)}
          sub={`${fmtKg(exec.carteiraKg)}${exec.mesesCarteira != null ? ` · ~${fmtNum(exec.mesesCarteira, 1)} meses no ritmo atual` : ''}`}
          ajuda="Saldo a medir e peso restante das obras ativas do escopo."
        />
        <KpiTile
          icone={Factory}
          rotulo="Ritmo (peças prontas)"
          valor={`${fmtKg(tend.kgSemanaAtual)}/sem`}
          tendencia={tend.variacaoPct}
          sub="média 4 semanas vs 4 anteriores"
          ajuda="Kg com pintura concluída por semana."
        />
        <KpiTile
          icone={Wallet}
          rotulo="A receber vencido"
          valor={fmtBRLc(aging.receberVencido)}
          sub={`A pagar vencido: ${fmtBRLc(aging.pagarVencido)}`}
          ajuda="Receitas/medições com vencimento passado e não recebidas."
        />
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Alertas mais graves</h3>
        {bi?.carregando && !top.length ? (
          <p className="text-sm text-slate-500">Carregando dados…</p>
        ) : top.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-300">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Nenhum alerta aberto no escopo atual.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {top.map((a) => {
              const sev = SEV_UI[a.severidade] || SEV_UI.baixo;
              return (
                <li key={a.id}>
                  <Link
                    to="/RadarAlertas"
                    className="flex items-start gap-2 rounded-lg border border-slate-800 px-3 py-2 hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 min-w-0"
                  >
                    <sev.Icone className="h-4 w-4 mt-0.5 shrink-0" style={{ color: sev.cor }} aria-hidden />
                    <span className="min-w-0">
                      <span className="text-[11px] font-semibold mr-1.5" style={{ color: sev.cor }}>{sev.rotulo}</span>
                      <span className="text-sm text-slate-100">{a.titulo}</span>
                      {a.detalhe && <span className="block text-xs text-slate-400 truncate">{a.detalhe}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
