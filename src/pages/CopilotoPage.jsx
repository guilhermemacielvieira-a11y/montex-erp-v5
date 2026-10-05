// ============================================================
// Copiloto MONTEX — assistente de IA com dados REAIS do ERP
// ============================================================
// O Claude (via Edge Function ia-copiloto) pede ferramentas; o navegador as
// executa com os dados do useBIData (mesmo motor e escopo do BI 360 — o
// seletor do TOPO é o único filtro de obra). Também analisa PDFs/fotos.
// Conversas ficam no localStorage deste navegador (useCopiloto).
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Bot, ChevronDown, ChevronUp, History, Loader2, Sparkles,
  Activity, Clock, Factory, Package, Receipt, Ruler, Scale, TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useObras } from '@/contexts/ERPContext';
import { useAuth } from '@/lib/AuthContext';
import { rotuloEscopo } from '@/lib/escopoObra';
import { useBIData } from '@/hooks/useBIData';
import { useCopiloto } from '@/hooks/useCopiloto';
import { criarExecutor } from '@/services/ia/copilotoTools';
import MensagemCopiloto from '@/components/ia/MensagemCopiloto';
import ComposerCopiloto from '@/components/ia/ComposerCopiloto';
import HistoricoConversas from '@/components/ia/HistoricoConversas';

const SUGESTOES = [
  { texto: 'Resumo executivo desta semana', icone: Activity },
  { texto: 'Quais obras estão atrasadas e por quê?', icone: Clock },
  { texto: 'Onde está o gargalo da produção?', icone: Factory },
  { texto: 'Peças paradas há mais de 15 dias', icone: TrendingDown },
  { texto: 'Contas a pagar vencidas e próximas 7 dias', icone: Receipt },
  { texto: 'Quanto falta medir na Super Luna?', icone: Ruler },
  { texto: 'Itens de estoque abaixo do mínimo', icone: Package },
  { texto: 'Compare físico × financeiro das obras ativas', icone: Scale },
];

const dataBR = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

function saudacao(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function CopilotoPage() {
  const bi = useBIData();
  const { escopoObra, obras } = useObras();
  const { user, profile } = useAuth();
  const nome = user?.nome || user?.name || profile?.nome || user?.email || 'usuário';
  const primeiroNome = String(nome).split(/[\s@]/)[0];

  // Refs para os callbacks do hook ficarem estáveis
  const biRef = useRef(bi); biRef.current = bi;
  const escopoRef = useRef(escopoObra); escopoRef.current = escopoObra;
  const obrasRef = useRef(obras); obrasRef.current = obras;
  const nomeRef = useRef(nome); nomeRef.current = nome;

  const obterExecutor = useCallback(() => criarExecutor({
    ...biRef.current.bruto,
    obraIdsEscopo: biRef.current.obraIds,
    alertas: biRef.current.alertas,
    hoje: new Date(),
  }), []);
  const obterContexto = useCallback(
    () => `escopo do topo: ${rotuloEscopo(escopoRef.current, obrasRef.current)}; hoje: ${dataBR(new Date())}; usuário: ${nomeRef.current}`,
    [],
  );
  const cop = useCopiloto({ obterExecutor, obterContexto });
  const { conversas, atualId, mensagens, enviando, etapa, erro, enviar, novaConversa, abrir, excluir, cancelar } = cop;

  const rotulo = useMemo(() => rotuloEscopo(escopoObra, obras), [escopoObra, obras]);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  // Aviso de carregamento só na primeira carga
  const [jaCarregou, setJaCarregou] = useState(!bi.carregando);
  useEffect(() => { if (!bi.carregando) setJaCarregou(true); }, [bi.carregando]);
  const carregandoInicial = bi.carregando && !jaCarregou;

  // Auto-scroll para o fim
  const fimRef = useRef(null);
  const ultimoTexto = mensagens[mensagens.length - 1]?.texto;
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens.length, ultimoTexto, enviando, etapa, erro]);

  const onNova = useCallback(() => { novaConversa(); setHistoricoAberto(false); }, [novaConversa]);
  const onAbrir = useCallback((id) => { abrir(id); setHistoricoAberto(false); }, [abrir]);
  const onEnviar = useCallback((texto, anexos) => { enviar(texto, anexos); }, [enviar]);

  const vazio = mensagens.length === 0;

  return (
    <div className="flex h-[calc(100dvh-10.5rem)] min-h-[460px] w-full min-w-0 flex-col gap-3 md:h-[calc(100dvh-9rem)] md:flex-row">
      {/* ---------- Histórico (desktop) ---------- */}
      <aside className="hidden w-64 shrink-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-3 md:flex lg:w-72" aria-label="Conversas">
        <HistoricoConversas
          conversas={conversas} atualId={atualId} enviando={enviando}
          onNova={onNova} onAbrir={onAbrir} onExcluir={excluir}
          className="flex-1"
        />
      </aside>

      {/* ---------- Área principal ---------- */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-slate-800 bg-slate-950/40" aria-label="Copiloto MONTEX">
        {/* Cabeçalho */}
        <header className="border-b border-slate-800 px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-700" aria-hidden="true">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-base font-bold text-white sm:text-lg">Copiloto MONTEX</h1>
            <span className="max-w-full truncate rounded-md bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-300 ring-1 ring-blue-500/30" title={`Escopo: ${rotulo}`}>
              Escopo: {rotulo}
            </span>
            <button
              type="button"
              onClick={() => setHistoricoAberto((v) => !v)}
              aria-expanded={historicoAberto}
              aria-controls="copiloto-historico-mobile"
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[12px] text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 md:hidden"
            >
              <History className="h-3.5 w-3.5" aria-hidden="true" />
              Conversas ({conversas.length})
              {historicoAberto ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Respostas geradas por IA a partir dos dados do ERP — confira decisões importantes.
          </p>
        </header>

        {/* Histórico (mobile) */}
        {historicoAberto && (
          <div id="copiloto-historico-mobile" className="max-h-[45%] border-b border-slate-800 p-3 md:hidden">
            <HistoricoConversas
              conversas={conversas} atualId={atualId} enviando={enviando}
              onNova={onNova} onAbrir={onAbrir} onExcluir={excluir}
              className="h-full"
            />
          </div>
        )}

        {/* Avisos de dados */}
        {carregandoInicial && (
          <div role="status" className="flex items-center gap-2 border-b border-slate-800 bg-blue-500/10 px-4 py-1.5 text-[12px] text-blue-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Carregando dados do ERP… você já pode digitar.
          </div>
        )}
        {bi.erro && !bi.carregando && (
          <div role="status" className="flex items-center gap-2 border-b border-slate-800 bg-yellow-500/10 px-4 py-1.5 text-[12px] text-yellow-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">Parte dos dados do ERP não carregou: {String(bi.erro?.message || bi.erro)}</span>
          </div>
        )}

        {/* Mensagens */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5" aria-live="polite" aria-busy={enviando}>
          {vazio ? (
            <div className="mx-auto flex max-w-3xl flex-col items-center py-4 text-center sm:py-8">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-lg shadow-orange-900/30" aria-hidden="true">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-white sm:text-xl">{saudacao()}, {primeiroNome}!</h2>
              <p className="mt-1 max-w-xl text-[13px] text-slate-400">
                Pergunte sobre obras, produção, financeiro, estoque e alertas — eu consulto os dados reais do ERP
                ({rotulo}). Também analiso PDFs e fotos de notas fiscais.
              </p>
              <ul className="mt-5 grid w-full grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Sugestões de perguntas">
                {SUGESTOES.map(({ texto, icone: Icone }) => (
                  <li key={texto}>
                    <button
                      type="button"
                      onClick={() => onEnviar(texto, [])}
                      disabled={enviando}
                      className="flex w-full items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-left text-[13px] text-slate-200 transition-colors hover:border-orange-500/50 hover:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"
                    >
                      <Icone className="h-4 w-4 shrink-0 text-orange-400" aria-hidden="true" />
                      <span className="min-w-0">{texto}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {mensagens.map((m) => <MensagemCopiloto key={m.id} mensagem={m} />)}
            </div>
          )}

          {enviando && (
            <div className="mx-auto mt-4 flex max-w-3xl items-center gap-2.5" role="status">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800" aria-hidden="true">
                <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
              </div>
              <span className="text-[12px] text-slate-400">{etapa || 'Pensando'}…</span>
              <button
                type="button"
                onClick={cancelar}
                aria-label="Parar consulta"
                className="ml-1 rounded-md border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                Parar
              </button>
            </div>
          )}

          {erro && (
            <div role="alert" className="mx-auto mt-4 flex max-w-3xl items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">{erro}</span>
            </div>
          )}
          <div ref={fimRef} aria-hidden="true" />
        </div>

        {/* Composer */}
        <div className={cn('border-t border-slate-800 p-2 sm:p-3')}>
          <div className="mx-auto max-w-3xl">
            <ComposerCopiloto onEnviar={onEnviar} onCancelar={cancelar} enviando={enviando} />
          </div>
        </div>
      </section>
    </div>
  );
}
