// ============================================================
// BI 360 — BI único do MONTEX ERP
// ============================================================
// Uma tela, cinco perguntas: Executivo, Obras, Produção, Financeiro e
// Suprimentos. Dados 100% reais via useBIData (já no escopo do seletor do
// TOPO — esta página não tem filtro de obra próprio, CLAUDE.md 1c).
// A aba ativa e a obra destacada ficam na URL (?aba=...&obra=...), então
// links do Radar de Alertas e favoritos abrem direto no ponto certo.
// ============================================================

import React, { useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart3, RefreshCw, Siren, Filter, AlertOctagon, LayoutDashboard, Building2, Factory, Wallet, Boxes,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useBIData } from '@/hooks/useBIData';
import { useAlertasStatus } from '@/hooks/useAlertasStatus';
import { useObras } from '@/contexts/ERPContext';
import { rotuloEscopo } from '@/lib/escopoObra';
import { SEVERIDADES } from '@/services/bi/radarAlertas';
import AbaExecutivo from '@/components/bi/abas/AbaExecutivo';
import AbaObras from '@/components/bi/abas/AbaObras';
import AbaProducao from '@/components/bi/abas/AbaProducao';
import AbaFinanceiro from '@/components/bi/abas/AbaFinanceiro';
import AbaSuprimentos from '@/components/bi/abas/AbaSuprimentos';

const ABAS = [
  { id: 'executivo', rotulo: 'Executivo', icone: LayoutDashboard },
  { id: 'obras', rotulo: 'Obras', icone: Building2 },
  { id: 'producao', rotulo: 'Produção', icone: Factory },
  { id: 'financeiro', rotulo: 'Financeiro', icone: Wallet },
  { id: 'suprimentos', rotulo: 'Suprimentos', icone: Boxes },
];
const ABA_PADRAO = 'executivo';

function EsqueletoBI() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando BI">
      <Skeleton className="h-16 w-full bg-slate-800/70" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 bg-slate-800/70" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <Skeleton className="h-80 xl:col-span-3 bg-slate-800/70" />
        <Skeleton className="h-80 xl:col-span-2 bg-slate-800/70" />
      </div>
    </div>
  );
}

export default function BI360Page() {
  const dados = useBIData();
  const { escopoObra, obras = [], setObraAtual } = useObras();
  const { statusDe } = useAlertasStatus();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const abaUrl = params.get('aba');
  const aba = ABAS.some((a) => a.id === abaUrl) ? abaUrl : ABA_PADRAO;
  const obraDestacada = params.get('obra') || null;

  const mudarAba = useCallback((nova, extras = {}) => {
    const p = new URLSearchParams(params);
    p.set('aba', nova);
    if (nova !== 'obras') p.delete('obra');
    Object.entries(extras).forEach(([k, v]) => { if (v) p.set(k, v); else p.delete(k); });
    setParams(p, { replace: false });
  }, [params, setParams]);

  const abrirObra = useCallback((id) => mudarAba('obras', { obra: id }), [mudarAba]);
  const destacarObra = useCallback((id) => mudarAba('obras', { obra: id }), [mudarAba]);
  const abrirGFO = useCallback((id) => {
    // GFO é tela de UMA obra (ExigeObra): o drill-down muda o seletor do topo.
    setObraAtual?.(id);
    navigate('/GestaoFinanceiraObra');
  }, [setObraAtual, navigate]);

  const rotulo = useMemo(() => rotuloEscopo(escopoObra, obras), [escopoObra, obras]);

  // Alertas ainda abertos (novos ou em tratamento), mais graves primeiro.
  const alertasAtivos = useMemo(() => (
    (dados.alertas || [])
      .filter((a) => !['resolvido', 'ignorado'].includes(statusDe(a.id)))
      .sort((a, b) => (SEVERIDADES[a.severidade]?.ordem ?? 9) - (SEVERIDADES[b.severidade]?.ordem ?? 9))
  ), [dados.alertas, statusDe]);
  const nCriticos = alertasAtivos.filter((a) => a.severidade === 'critico').length;
  const nAltos = alertasAtivos.filter((a) => a.severidade === 'alto').length;

  const hora = dados.atualizadoEm
    ? dados.atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;
  const primeiraCarga = dados.carregando && !dados.atualizadoEm && !dados.erro;

  return (
    <div className="space-y-4 p-4 md:p-6 min-w-0">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-slate-300" aria-hidden /> BI 360
          </h1>
          <p className="text-sm text-slate-400">Carteira, produção, obras, caixa e estoque num só lugar — com números reais do ERP.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-200" title="Altere pelo seletor de obra no topo">
            <Filter className="h-3.5 w-3.5 text-slate-400" aria-hidden /> Escopo: <span className="font-medium max-w-[220px] truncate">{rotulo}</span>
          </span>
          <Link
            to="/RadarAlertas"
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700/60"
            title="Abrir o Radar de Alertas"
          >
            {nCriticos + nAltos > 0
              ? <AlertOctagon className="h-3.5 w-3.5" style={{ color: SEVERIDADES.critico.cor }} aria-hidden />
              : <Siren className="h-3.5 w-3.5 text-slate-400" aria-hidden />}
            {nCriticos + nAltos > 0
              ? <span><b className="tabular-nums">{nCriticos}</b> crítico(s) · <b className="tabular-nums">{nAltos}</b> alto(s)</span>
              : <span>Sem alertas críticos/altos</span>}
          </Link>
          <span className="text-xs text-slate-400">{hora ? `Atualizado às ${hora}` : dados.carregando ? 'Carregando…' : ''}</span>
          <button
            type="button"
            onClick={() => dados.recarregar()}
            disabled={dados.carregando}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 disabled:opacity-60"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', dados.carregando && 'animate-spin')} aria-hidden /> Atualizar
          </button>
        </div>
      </header>

      {dados.erro && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
          <span>
            Não foi possível carregar o histórico de produção ({dados.erro}). Ritmo, lead time e previsões podem aparecer zerados;
            os demais números (obras, financeiro, estoque) vêm do ERP normalmente.
          </span>
          <button type="button" onClick={() => dados.recarregar()} className="shrink-0 rounded-md border border-rose-400/50 px-3 py-1 text-xs hover:bg-rose-500/20">
            Tentar de novo
          </button>
        </div>
      )}

      <Tabs value={aba} onValueChange={(v) => mudarAba(v)}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="h-auto bg-slate-800/60 border border-slate-700/60 p-1">
            {ABAS.map((a) => {
              const I = a.icone;
              return (
                <TabsTrigger
                  key={a.id}
                  value={a.id}
                  className="gap-1.5 px-3 py-1.5 text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white"
                >
                  <I className="h-4 w-4" aria-hidden /> {a.rotulo}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {primeiraCarga ? (
          <div className="mt-4"><EsqueletoBI /></div>
        ) : (
          <>
            <TabsContent value="executivo" className="mt-4">
              <AbaExecutivo dados={dados} alertasAtivos={alertasAtivos} onAbrirObra={abrirObra} onIrAba={mudarAba} />
            </TabsContent>
            <TabsContent value="obras" className="mt-4">
              <AbaObras dados={dados} obraDestacada={obraDestacada} onDestacarObra={destacarObra} onAbrirGFO={abrirGFO} />
            </TabsContent>
            <TabsContent value="producao" className="mt-4">
              <AbaProducao dados={dados} />
            </TabsContent>
            <TabsContent value="financeiro" className="mt-4">
              <AbaFinanceiro dados={dados} rotuloEscopo={rotulo} />
            </TabsContent>
            <TabsContent value="suprimentos" className="mt-4">
              <AbaSuprimentos dados={dados} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
