import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Radar } from 'lucide-react';
import { useBIData } from '@/hooks/useBIData';
import { useAlertasStatus } from '@/hooks/useAlertasStatus';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SEV_UI, ORDEM_SEV } from '@/components/bi/radar/radarUi';
import { cn } from '@/lib/utils';
import { ehDuplicidade, CLS_BTN, CLS_BTN_PRIM } from './tarefasUi';

const PRIO_POR_SEV = { critico: 'urgente', alto: 'alta', medio: 'media', baixo: 'baixa' };

/** Conteúdo montado só com o dialog aberto (useBIData é pesado). */
function Conteudo({ tarefas, criar, onFechar }) {
  const { alertas = [], carregando, erro } = useBIData();
  const { statusDe } = useAlertasStatus();
  const [selecao, setSelecao] = useState(() => new Set());
  const [criando, setCriando] = useState(false);

  const refsExistentes = useMemo(() => new Set(
    tarefas.filter((t) => t.origem === 'alerta' && t.origem_ref).map((t) => String(t.origem_ref)),
  ), [tarefas]);

  const abertos = useMemo(() => alertas
    .filter((a) => ['novo', 'reconhecido'].includes(statusDe(a.id)))
    .sort((a, b) => ORDEM_SEV.indexOf(a.severidade) - ORDEM_SEV.indexOf(b.severidade)), [alertas, statusDe]);

  const disponiveis = abertos.filter((a) => !refsExistentes.has(String(a.id)));
  const alternar = (id) => setSelecao((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const todas = disponiveis.length > 0 && disponiveis.every((a) => selecao.has(a.id));

  const criarSelecionadas = async () => {
    const lista = abertos.filter((a) => selecao.has(a.id) && !refsExistentes.has(String(a.id)));
    if (!lista.length) return;
    setCriando(true);
    let novas = 0; let jaExistiam = 0; const falhas = [];
    for (const a of lista) {
      try {
        await criar({
          titulo: a.titulo,
          descricao: [a.detalhe, a.link ? `Ver em: ${a.link}` : null].filter(Boolean).join('\n'),
          obra_id: a.obraId || null,
          prioridade: PRIO_POR_SEV[a.severidade] || 'media',
          status: 'pendente',
          tags: ['radar', a.regra].filter(Boolean),
          origem: 'alerta',
          origem_ref: String(a.id),
        }, { silencioso: true });
        novas += 1;
      } catch (e) {
        if (ehDuplicidade(e)) jaExistiam += 1;
        else falhas.push(e.message || String(e));
      }
    }
    setCriando(false);
    setSelecao(new Set());
    if (novas) toast.success(`${novas} tarefa(s) criada(s) a partir do Radar.`);
    if (jaExistiam) toast.info(`${jaExistiam} alerta(s) já tinham tarefa (já existia).`);
    if (falhas.length) toast.error(`${falhas.length} tarefa(s) não foram criadas: ${falhas[0]}`);
    if (!falhas.length) onFechar();
  };

  return (
    <>
      {erro && <p role="alert" className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">Histórico de produção indisponível ({erro}); alertas de produção podem estar incompletos.</p>}
      {carregando && !alertas.length ? (
        <p className="flex items-center gap-2 py-6 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Analisando dados do Radar…</p>
      ) : abertos.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">Nenhum alerta aberto no escopo atual.</p>
      ) : (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" className="h-4 w-4 accent-sky-500" checked={todas} disabled={!disponiveis.length}
              onChange={() => setSelecao(todas ? new Set() : new Set(disponiveis.map((a) => a.id)))} />
            Selecionar todos sem tarefa ({disponiveis.length} de {abertos.length})
          </label>
          <ul className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
            {abertos.map((a) => {
              const ui = SEV_UI[a.severidade] || SEV_UI.medio;
              const Ic = ui.Icone;
              const existe = refsExistentes.has(String(a.id));
              return (
                <li key={a.id}>
                  <label className={cn('flex items-start gap-2 rounded-md border px-3 py-2', existe ? 'border-slate-800 bg-slate-900/30 opacity-70' : 'cursor-pointer border-slate-700 bg-slate-900/60 hover:border-slate-500')}>
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-sky-500" disabled={existe} checked={selecao.has(a.id)} onChange={() => alternar(a.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium" style={{ color: ui.cor }}>
                        <Ic className="h-3.5 w-3.5" aria-hidden /> {ui.rotulo}
                        {existe && <span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Tarefa já existe</span>}
                      </span>
                      <span className="block break-words text-xs text-slate-100">{a.titulo}</span>
                      {a.detalhe && <span className="block break-words text-[11px] text-slate-400">{a.detalhe}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 border-t border-slate-800 pt-3 sm:flex-row sm:justify-end">
        <button type="button" className={CLS_BTN} onClick={onFechar} disabled={criando}>Fechar</button>
        <button type="button" className={CLS_BTN_PRIM} onClick={criarSelecionadas} disabled={criando || selecao.size === 0}>
          {criando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Criar {selecao.size || ''} tarefa(s)
        </button>
      </div>
    </>
  );
}

export default function AlertasParaTarefas({ aberto, onFechar, tarefas, criar }) {
  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v) onFechar(); }}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto border-slate-700 bg-slate-950 text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Radar className="h-5 w-5 text-sky-400" aria-hidden /> Criar tarefas a partir dos alertas</DialogTitle>
          <DialogDescription className="text-slate-400">
            Alertas abertos do Radar (novos ou em tratamento) no escopo do topo. Cada alerta gera no máximo uma tarefa.
          </DialogDescription>
        </DialogHeader>
        {aberto && <Conteudo tarefas={tarefas} criar={criar} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  );
}
