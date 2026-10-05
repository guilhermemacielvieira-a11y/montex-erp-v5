// ============================================================
// Automações — motor REAL (Fase 3)
// ============================================================
// Cadastro em `automacoes` (Supabase). O motor (Edge Function
// `motor-automacoes`) roda de hora em hora via pg_cron e dispara cada
// ocorrência uma única vez por automação (dedup em automacoes_disparos).
// Aqui: listar/criar/editar/excluir, ativar/desativar, Testar (simula,
// nada é enviado), Executar agora (age de verdade) e o histórico do log.
// Fluxos de aprovação ficaram fora desta fase.
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Zap, Plus, Sparkles, Activity, Bell, AlertTriangle, PlayCircle, RefreshCw, Loader2, ListChecks, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useObras } from '@/contexts/ERPContext';
import {
  listarAutomacoes, salvarAutomacao, excluirAutomacao, listarLogAutomacoes, executarAutomacoes,
} from '@/api/colaboracaoApi';
import AutomacaoCard from '@/components/automacoes2/AutomacaoCard';
import AutomacaoEditor from '@/components/automacoes2/AutomacaoEditor';
import HistoricoExecucoes from '@/components/automacoes2/HistoricoExecucoes';
import ModelosDialog from '@/components/automacoes2/ModelosDialog';
import { TesteDialog, ExecutarDialog } from '@/components/automacoes2/ResultadoDialogs';

const LIMITE_LOG = 500;
const DIA_MS = 24 * 60 * 60 * 1000;

function Indicador({ icone: Icone, rotulo, valor, cor, dica }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 flex items-center gap-3 min-w-0" title={dica}>
      <div className={`rounded-lg p-2 ${cor.bg}`}><Icone className={`h-5 w-5 ${cor.fg}`} aria-hidden /></div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400 truncate">{rotulo}</p>
        <p className="text-xl font-bold text-slate-100 tabular-nums">{valor}</p>
      </div>
    </div>
  );
}

export default function AutomacoesPage() {
  const { obras = [], obraAtual } = useObras();

  const [automacoes, setAutomacoes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoLog, setCarregandoLog] = useState(false);
  const [erroLista, setErroLista] = useState('');
  const [erroLog, setErroLog] = useState('');
  const [aba, setAba] = useState('automacoes');

  const [editor, setEditor] = useState({ aberto: false, inicial: null });
  const [modelosAberto, setModelosAberto] = useState(false);
  const [paraExcluir, setParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [ocupado, setOcupado] = useState({}); // { [id]: 'teste'|'manual'|'toggle' }
  const [teste, setTeste] = useState(null); // { nome, resultado }
  const [execucao, setExecucao] = useState(null); // { automacao, resultado? }
  const [executando, setExecutando] = useState(false);

  const carregarAutomacoes = useCallback(async () => {
    try {
      setAutomacoes(await listarAutomacoes());
      setErroLista('');
    } catch (e) {
      setErroLista(e?.message || String(e));
    }
  }, []);

  const carregarLog = useCallback(async () => {
    setCarregandoLog(true);
    try {
      setLogs(await listarLogAutomacoes({ limite: LIMITE_LOG }));
      setErroLog('');
    } catch (e) {
      setErroLog(e?.message || String(e));
    } finally {
      setCarregandoLog(false);
    }
  }, []);

  const recarregarTudo = useCallback(async () => {
    await Promise.all([carregarAutomacoes(), carregarLog()]);
  }, [carregarAutomacoes, carregarLog]);

  useEffect(() => {
    let vivo = true;
    (async () => { await recarregarTudo(); if (vivo) setCarregando(false); })();
    // O motor roda sozinho; atualiza o painel a cada minuto com a aba visível.
    const t = setInterval(() => { if (document.visibilityState === 'visible') recarregarTudo(); }, 60000);
    return () => { vivo = false; clearInterval(t); };
  }, [recarregarTudo]);

  const nomeObra = useMemo(() => {
    const m = {};
    obras.forEach((o) => { m[o.id] = o.nome || o.codigo || o.id; });
    return m;
  }, [obras]);

  const ultimoLogPorAuto = useMemo(() => {
    const m = {};
    for (const l of logs) if (l.automacao_id && !m[l.automacao_id]) m[l.automacao_id] = l; // logs já vêm do mais recente
    return m;
  }, [logs]);

  const indicadores = useMemo(() => {
    const desde = Date.now() - DIA_MS;
    const recentes = logs.filter((l) => new Date(l.executada_em).getTime() >= desde);
    return {
      ativas: automacoes.filter((a) => a.ativa).length,
      total: automacoes.length,
      execucoes: recentes.length,
      disparos: recentes.reduce((s, l) => s + (Number(l.disparos) || 0), 0),
      erros: recentes.filter((l) => l.status === 'erro').length,
    };
  }, [automacoes, logs]);

  const marcarOcupado = (id, v) => setOcupado((o) => { const n = { ...o }; if (v) n[id] = v; else delete n[id]; return n; });

  // ---------- ações ----------
  const alternarAtiva = useCallback(async (a, ativa) => {
    marcarOcupado(a.id, 'toggle');
    setAutomacoes((lista) => lista.map((x) => (x.id === a.id ? { ...x, ativa } : x)));
    try {
      const salva = await salvarAutomacao({ ...a, ativa });
      setAutomacoes((lista) => lista.map((x) => (x.id === a.id ? salva : x)));
      toast.success(ativa ? `"${a.nome}" ativada — roda na próxima hora cheia` : `"${a.nome}" desativada`);
    } catch (e) {
      setAutomacoes((lista) => lista.map((x) => (x.id === a.id ? { ...x, ativa: a.ativa } : x)));
      toast.error(`Não foi possível alterar: ${e?.message || e}`);
    } finally {
      marcarOcupado(a.id, null);
    }
  }, []);

  const testar = useCallback(async (a) => {
    marcarOcupado(a.id, 'teste');
    try {
      const r = await executarAutomacoes({ modo: 'teste', automacaoId: a.id });
      setTeste({ nome: a.nome, resultado: r });
    } catch (e) {
      toast.error(`Falha no teste: ${e?.message || e}`);
    } finally {
      marcarOcupado(a.id, null);
    }
  }, []);

  const confirmarExecucao = useCallback(async () => {
    const a = execucao?.automacao;
    if (!a) return;
    setExecutando(true);
    marcarOcupado(a.id, 'manual');
    try {
      const r = await executarAutomacoes({ modo: 'manual', automacaoId: a.id });
      setExecucao({ automacao: a, resultado: r });
      const item = r?.automacoes?.[0];
      if (item?.erro) toast.error(`"${a.nome}" falhou: ${item.erro}`);
      else toast.success(item?.novas ? `${item.novas} ocorrência(s) nova(s) processada(s)` : 'Executada — nenhuma ocorrência nova');
      recarregarTudo();
    } catch (e) {
      toast.error(`Falha ao executar: ${e?.message || e}`);
      setExecucao(null);
    } finally {
      setExecutando(false);
      marcarOcupado(a.id, null);
    }
  }, [execucao, recarregarTudo]);

  const salvar = useCallback(async (dados) => {
    const salva = await salvarAutomacao(dados); // erro sobe para o editor exibir
    setAutomacoes((lista) => (dados.id ? lista.map((x) => (x.id === salva.id ? salva : x)) : [...lista, salva]));
    toast.success(dados.id ? 'Automação atualizada' : 'Automação criada');
    setEditor({ aberto: false, inicial: null });
  }, []);

  const confirmarExclusao = useCallback(async () => {
    if (!paraExcluir) return;
    setExcluindo(true);
    try {
      await excluirAutomacao(paraExcluir.id);
      setAutomacoes((lista) => lista.filter((x) => x.id !== paraExcluir.id));
      setLogs((l) => l.filter((x) => x.automacao_id !== paraExcluir.id));
      toast.success(`"${paraExcluir.nome}" excluída`);
      setParaExcluir(null);
    } catch (e) {
      toast.error(`Não foi possível excluir: ${e?.message || e}`);
    } finally {
      setExcluindo(false);
    }
  }, [paraExcluir]);

  const ordenadas = useMemo(
    () => [...automacoes].sort((a, b) => (Number(b.ativa) - Number(a.ativa)) || String(a.nome).localeCompare(String(b.nome), 'pt-BR')),
    [automacoes],
  );

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-7xl mx-auto text-slate-100">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-400" aria-hidden />Automações
          </h1>
          <p className="text-sm text-slate-400 mt-1">O motor roda sozinho de hora em hora e só avisa cada ocorrência uma vez</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={recarregarTudo} className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800" aria-label="Atualizar">
            <RefreshCw className={`h-4 w-4 ${carregandoLog ? 'animate-spin' : ''}`} aria-hidden />
          </Button>
          <Button variant="outline" onClick={() => setModelosAberto(true)} className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800">
            <Sparkles className="h-4 w-4 mr-1.5 text-yellow-400" aria-hidden />Adicionar modelo
          </Button>
          <Button onClick={() => setEditor({ aberto: true, inicial: null })} className="bg-blue-600 hover:bg-blue-500 text-white">
            <Plus className="h-4 w-4 mr-1.5" aria-hidden />Nova automação
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Indicadores das últimas 24 horas">
        <Indicador icone={Zap} rotulo="Ativas" valor={`${indicadores.ativas}/${indicadores.total}`}
          cor={{ bg: 'bg-emerald-500/10', fg: 'text-emerald-400' }} dica="Automações ativas / cadastradas" />
        <Indicador icone={Activity} rotulo="Execuções 24h" valor={indicadores.execucoes}
          cor={{ bg: 'bg-blue-500/10', fg: 'text-blue-400' }} dica="Execuções registradas no log nas últimas 24 horas" />
        <Indicador icone={Bell} rotulo="Ocorrências disparadas 24h" valor={indicadores.disparos}
          cor={{ bg: 'bg-orange-500/10', fg: 'text-orange-400' }} dica="Ocorrências novas que geraram ações nas últimas 24 horas" />
        <Indicador icone={AlertTriangle} rotulo="Erros 24h" valor={indicadores.erros}
          cor={indicadores.erros ? { bg: 'bg-red-500/10', fg: 'text-red-400' } : { bg: 'bg-slate-700/30', fg: 'text-slate-400' }}
          dica="Execuções com erro nas últimas 24 horas" />
      </section>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="bg-slate-900 border border-slate-800 max-w-full h-auto flex-wrap">
          <TabsTrigger value="automacoes"><ListChecks className="h-4 w-4 mr-1.5" aria-hidden />Automações ({automacoes.length})</TabsTrigger>
          <TabsTrigger value="historico"><History className="h-4 w-4 mr-1.5" aria-hidden />Histórico<span className="hidden sm:inline">&nbsp;de execuções</span></TabsTrigger>
        </TabsList>

        <TabsContent value="automacoes" className="mt-4">
          {erroLista && (
            <div role="alert" className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />Não foi possível carregar as automações: {erroLista}
            </div>
          )}
          {carregando ? (
            <div className="rounded-xl border border-slate-800 p-10 text-center text-slate-400">
              <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" aria-hidden />Carregando automações…
            </div>
          ) : ordenadas.length === 0 && !erroLista ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center space-y-3">
              <PlayCircle className="h-8 w-8 mx-auto text-slate-600" aria-hidden />
              <p className="text-slate-300">Nenhuma automação cadastrada.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => setModelosAberto(true)} className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800">
                  <Sparkles className="h-4 w-4 mr-1.5" aria-hidden />Começar por um modelo
                </Button>
                <Button onClick={() => setEditor({ aberto: true, inicial: null })} className="bg-blue-600 hover:bg-blue-500 text-white">
                  <Plus className="h-4 w-4 mr-1.5" aria-hidden />Criar do zero
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {ordenadas.map((a) => (
                <AutomacaoCard key={a.id} automacao={a} nomeObra={nomeObra[a.obra_id]} ultimoLog={ultimoLogPorAuto[a.id]}
                  ocupado={ocupado[a.id]}
                  onToggle={alternarAtiva} onTestar={testar}
                  onExecutar={(x) => setExecucao({ automacao: x })}
                  onEditar={(x) => setEditor({ aberto: true, inicial: x })}
                  onExcluir={setParaExcluir} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <HistoricoExecucoes logs={logs} automacoes={automacoes} carregando={carregandoLog} erro={erroLog} onRecarregar={carregarLog} />
        </TabsContent>
      </Tabs>

      <AutomacaoEditor open={editor.aberto} inicial={editor.inicial} obras={obras} obraSugerida={obraAtual || null}
        onOpenChange={(v) => { if (!v) setEditor({ aberto: false, inicial: null }); }} onSalvar={salvar} />

      <ModelosDialog open={modelosAberto} onOpenChange={setModelosAberto}
        onEscolher={(dados) => { setModelosAberto(false); setEditor({ aberto: true, inicial: { ...dados } }); }} />

      <TesteDialog estado={teste} onClose={() => setTeste(null)} />
      <ExecutarDialog estado={execucao} executando={executando} onConfirmar={confirmarExecucao} onClose={() => setExecucao(null)} />

      <AlertDialog open={!!paraExcluir} onOpenChange={(v) => { if (!v && !excluindo) setParaExcluir(null); }}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{paraExcluir?.nome}”?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              A automação deixa de rodar e o histórico de execuções dela é apagado. Notificações e tarefas já criadas continuam existindo.
              Para só pausar, use o botão Ativa/Inativa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmarExclusao(); }} disabled={excluindo}
              className="bg-red-600 hover:bg-red-500 text-white">
              {excluindo ? 'Excluindo…' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
