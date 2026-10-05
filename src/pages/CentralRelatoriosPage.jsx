// ============================================================
// Central de Relatórios
// ============================================================
// Substitui Relatórios, Gerenciador de Relatórios, Agendamento de
// Relatórios e Relatórios Financeiros (dados simulados / nada executava).
//   Gerar        → relatórios REAIS no escopo do seletor do TOPO (CLAUDE.md 1c)
//   Histórico    → relatorios_historico (manuais + resumos agendados)
//   Agendamentos → relatorios_agendamentos (motor de hora em hora)
// URL: ?aba=gerar|historico|agendamentos · ?historico=<id> abre o item
//      · ?tipo=<id do catálogo> destaca o relatório na aba Gerar.
// ============================================================

import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileBarChart2, Filter, Download, History, CalendarClock, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useBIData } from '@/hooks/useBIData';
import { useObras } from '@/contexts/ERPContext';
import { rotuloEscopo } from '@/lib/escopoObra';
import { catalogoPorId } from '@/services/relatoriosCatalogo';
import AbaGerar from '@/components/relatorios2/AbaGerar';
import AbaHistorico from '@/components/relatorios2/AbaHistorico';
import AbaAgendamentos from '@/components/relatorios2/AbaAgendamentos';

const ABAS = [
  { id: 'gerar', rotulo: 'Gerar', icone: Download },
  { id: 'historico', rotulo: 'Histórico', icone: History },
  { id: 'agendamentos', rotulo: 'Agendamentos', icone: CalendarClock },
];

export default function CentralRelatoriosPage() {
  const dados = useBIData();
  const { obras = [], escopoObra, obraAtual, setObraAtual } = useObras();
  const [params, setParams] = useSearchParams();
  const [versaoHistorico, setVersaoHistorico] = useState(0);

  const historicoId = params.get('historico');
  const abaUrl = params.get('aba');
  // ?historico=<id> sem aba explícita abre o Histórico.
  const aba = ABAS.some((a) => a.id === abaUrl) ? abaUrl : (historicoId ? 'historico' : 'gerar');
  const tipoUrl = params.get('tipo');
  const tipoDestacado = catalogoPorId(tipoUrl) ? tipoUrl : null;

  const rotulo = useMemo(() => rotuloEscopo(escopoObra, obras), [escopoObra, obras]);

  const atualizarParams = useCallback((mudancas) => {
    const p = new URLSearchParams(params);
    Object.entries(mudancas).forEach(([k, v]) => { if (v === null || v === undefined || v === '') p.delete(k); else p.set(k, String(v)); });
    setParams(p, { replace: false });
  }, [params, setParams]);

  const mudarAba = useCallback((nova) => {
    atualizarParams({ aba: nova, historico: nova === 'historico' ? historicoId : null, tipo: nova === 'gerar' ? tipoDestacado : null });
  }, [atualizarParams, historicoId, tipoDestacado]);

  const abrirHistorico = useCallback((id) => atualizarParams({ aba: 'historico', historico: id }), [atualizarParams]);
  const fecharHistorico = useCallback(() => atualizarParams({ historico: null }), [atualizarParams]);

  // "Gerar PDF atual": vai para Gerar com o tipo destacado. Se o resumo era de
  // UMA obra e o relatório exige obra, troca o seletor do topo (ação explícita
  // do usuário — mesmo padrão do drill-down do BI 360).
  const gerarAtual = useCallback((tipo, obraIdDoItem) => {
    if (obraIdDoItem && obraIdDoItem !== obraAtual && catalogoPorId(tipo)?.exigeObra) setObraAtual?.(obraIdDoItem);
    atualizarParams({ aba: 'gerar', historico: null, tipo });
  }, [atualizarParams, obraAtual, setObraAtual]);

  const nomeObra = useCallback((id) => {
    const o = obras.find((x) => x.id === id);
    return o ? `${o.codigo ? `${o.codigo} | ` : ''}${o.nome || o.id}` : (id || 'Geral');
  }, [obras]);

  return (
    <div className="space-y-4 p-4 md:p-6 min-w-0">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileBarChart2 className="h-6 w-6 text-slate-300" aria-hidden /> Central de Relatórios
          </h1>
          <p className="text-sm text-slate-400">Relatórios com números reais do ERP, histórico do que foi gerado e resumos automáticos agendados.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-200" title="Altere pelo seletor de obra no topo">
            <Filter className="h-3.5 w-3.5 text-slate-400" aria-hidden /> Escopo: <span className="font-medium max-w-[220px] truncate">{rotulo}</span>
          </span>
          {aba === 'gerar' && (
            <button
              type="button"
              onClick={() => dados.recarregar()}
              disabled={dados.carregando}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-700 disabled:opacity-60"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', dados.carregando && 'animate-spin')} aria-hidden /> Atualizar dados
            </button>
          )}
        </div>
      </header>

      {aba === 'gerar' && dados.erro && (
        <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
          Não foi possível carregar o histórico de produção ({dados.erro}). No resumo executivo, ritmo e previsões podem sair zerados; os demais relatórios não dependem dele.
        </div>
      )}

      <Tabs value={aba} onValueChange={mudarAba}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-slate-800/60 p-1">
          {ABAS.map(({ id, rotulo: r, icone: Icone }) => (
            <TabsTrigger key={id} value={id} className="gap-1.5 text-slate-300 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Icone className="h-4 w-4" aria-hidden /> {r}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="gerar" className="mt-4">
          <AbaGerar dados={dados} tipoDestacado={tipoDestacado} onRegistrado={() => setVersaoHistorico((v) => v + 1)} />
        </TabsContent>
        <TabsContent value="historico" className="mt-4">
          <AbaHistorico
            idAberto={historicoId}
            onAbrir={abrirHistorico}
            onFechar={fecharHistorico}
            onGerarAtual={gerarAtual}
            nomeObra={nomeObra}
            versao={versaoHistorico}
          />
        </TabsContent>
        <TabsContent value="agendamentos" className="mt-4">
          <AbaAgendamentos />
        </TabsContent>
      </Tabs>
    </div>
  );
}
