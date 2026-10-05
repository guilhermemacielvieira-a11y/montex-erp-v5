// ============================================================
// Central de Relatórios — aba AGENDAMENTOS (relatorios_agendamentos)
// ============================================================
// O motor (Edge Function motor-automacoes, de hora em hora) gera um RESUMO
// no horário agendado (horário de Brasília) e avisa no sino. A "próxima
// execução" é calculada no cliente com a mesma regra do motor.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarClock, Plus, Pencil, Trash2, RefreshCw, Bell, Mail, Loader2, CheckCircle2, PauseCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useObras } from '@/contexts/ERPContext';
import { ROLE_LABELS } from '@/lib/AuthContext';
import { listarAgendamentos, salvarAgendamento, excluirAgendamento } from '@/api/colaboracaoApi';
import {
  TIPOS_AGENDAMENTO, FREQUENCIAS, DIAS_SEMANA, proximaExecucao, descreverFrequencia, fmtDataHoraBRT,
  validarAgendamento, normalizarAgendamento, rotuloTipo,
} from '@/services/relatoriosCatalogo';
import { Painel, Campo, FaixaErro, Carregando, CLS_BTN, CLS_BTN_PRIMARIO, CLS_INPUT } from './relatoriosUi';

const HORAS = Array.from({ length: 24 }, (_, h) => h);
const DIAS_MES = Array.from({ length: 28 }, (_, i) => i + 1);

const formVazio = (obraAtual) => ({
  nome: '', tipo: 'executivo', obra_id: obraAtual || 'geral', frequencia: 'semanal', dia_semana: 1, dia_mes: 1, hora: 7, ativo: true, destino_role: 'todos',
});
const formDe = (a) => ({
  id: a.id, nome: a.nome || '', tipo: a.tipo || 'executivo', obra_id: a.obra_id || 'geral', frequencia: a.frequencia || 'semanal',
  dia_semana: a.dia_semana || 1, dia_mes: a.dia_mes || 1, hora: a.hora ?? 7, ativo: !!a.ativo, destino_role: a.destino_role || 'todos',
});

function FormAgendamento({ aberto, inicial, obras, onFechar, onSalvo }) {
  const [f, setF] = useState(inicial);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { if (aberto) { setF(inicial); setErros({}); } }, [aberto, inicial]);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const prox = useMemo(() => proximaExecucao({ ...normalizarAgendamento(f), ativo: f.ativo }), [f]);
  const papeis = Object.entries(ROLE_LABELS || {});

  const salvar = async (e) => {
    e.preventDefault();
    const v = validarAgendamento(f);
    setErros(v.erros);
    if (!v.ok) return;
    setSalvando(true);
    try {
      const salvo = await salvarAgendamento(normalizarAgendamento(f));
      toast.success(f.id ? 'Agendamento atualizado' : 'Agendamento criado');
      onSalvo(salvo);
    } catch (err) {
      toast.error(`Não foi possível salvar: ${err?.message || err}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v && !salvando) onFechar(); }}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto border-slate-700 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-white">{f.id ? 'Editar agendamento' : 'Novo agendamento'}</DialogTitle>
          <DialogDescription className="text-slate-400">Horários no fuso de Brasília. O resumo aparece no Histórico e no sino de notificações.</DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-3" noValidate>
          <Campo rotulo="Nome" htmlFor="ag-nome" erro={erros.nome}>
            <input id="ag-nome" className={CLS_INPUT} value={f.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Resumo semanal da diretoria" maxLength={120} />
          </Campo>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Campo rotulo="Tipo" htmlFor="ag-tipo" erro={erros.tipo}>
              <select id="ag-tipo" className={CLS_INPUT} value={f.tipo} onChange={(e) => set('tipo', e.target.value)}>
                {TIPOS_AGENDAMENTO.map((t) => <option key={t.id} value={t.id}>{t.rotulo}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Obra" htmlFor="ag-obra" ajuda={f.tipo === 'financeiro' || f.tipo === 'executivo' ? 'Geral = caixa da empresa (despesas sem obra).' : null}>
              <select id="ag-obra" className={CLS_INPUT} value={f.obra_id} onChange={(e) => set('obra_id', e.target.value)}>
                <option value="geral">Geral (todas as obras)</option>
                {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo} | ` : ''}{o.nome || o.id}</option>)}
              </select>
            </Campo>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Campo rotulo="Frequência" htmlFor="ag-freq" erro={erros.frequencia}>
              <select id="ag-freq" className={CLS_INPUT} value={f.frequencia} onChange={(e) => set('frequencia', e.target.value)}>
                {FREQUENCIAS.map((x) => <option key={x.id} value={x.id}>{x.rotulo}</option>)}
              </select>
            </Campo>
            {f.frequencia === 'semanal' && (
              <Campo rotulo="Dia da semana" htmlFor="ag-dow" erro={erros.dia_semana}>
                <select id="ag-dow" className={CLS_INPUT} value={f.dia_semana} onChange={(e) => set('dia_semana', Number(e.target.value))}>
                  {DIAS_SEMANA.map((d) => <option key={d.v} value={d.v}>{d.rotulo}</option>)}
                </select>
              </Campo>
            )}
            {f.frequencia === 'mensal' && (
              <Campo rotulo="Dia do mês" htmlFor="ag-dia" erro={erros.dia_mes} ajuda="1 a 28 (roda em todo mês).">
                <select id="ag-dia" className={CLS_INPUT} value={f.dia_mes} onChange={(e) => set('dia_mes', Number(e.target.value))}>
                  {DIAS_MES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Campo>
            )}
            <Campo rotulo="Hora (Brasília)" htmlFor="ag-hora" erro={erros.hora}>
              <select id="ag-hora" className={CLS_INPUT} value={f.hora} onChange={(e) => set('hora', Number(e.target.value))}>
                {HORAS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
              </select>
            </Campo>
          </div>
          <Campo rotulo="Quem recebe o aviso no sino" htmlFor="ag-destino" ajuda="Todos = toda a equipe; ou só um perfil.">
            <select id="ag-destino" className={CLS_INPUT} value={f.destino_role} onChange={(e) => set('destino_role', e.target.value)}>
              <option value="todos">Todos</option>
              {papeis.map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </select>
          </Campo>
          <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer select-none">
            <input type="checkbox" className="h-4 w-4 accent-sky-500" checked={f.ativo} onChange={(e) => set('ativo', e.target.checked)} /> Ativo
          </label>
          <p className="rounded-md border border-slate-700/60 bg-slate-950/40 p-2 text-xs text-slate-300">
            {f.ativo ? <>Próxima execução: <b className="text-slate-100">{prox ? fmtDataHoraBRT(prox) : '—'}</b> ({descreverFrequencia(f)})</> : 'Inativo — não será executado.'}
          </p>
          <DialogFooter className="gap-2">
            <button type="button" className={CLS_BTN} onClick={onFechar} disabled={salvando}>Cancelar</button>
            <button type="submit" className={CLS_BTN_PRIMARIO} disabled={salvando}>
              {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />} Salvar
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AbaAgendamentos() {
  const { obras = [], obraAtual } = useObras();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [form, setForm] = useState({ aberto: false, inicial: formVazio(null) });
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [ocupado, setOcupado] = useState(null);
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => { const t = setInterval(() => setAgora(new Date()), 60 * 1000); return () => clearInterval(t); }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try { setLista(await listarAgendamentos()); setErro(null); } catch (e) { setErro(`Não foi possível carregar os agendamentos: ${e?.message || e}`); } finally { setCarregando(false); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const nomeObra = useCallback((id) => {
    if (!id) return 'Geral';
    const o = obras.find((x) => x.id === id);
    return o ? `${o.codigo ? `${o.codigo} | ` : ''}${o.nome || o.id}` : id;
  }, [obras]);

  const alternarAtivo = async (a) => {
    setOcupado(a.id);
    try {
      const salvo = await salvarAgendamento({ ...a, ativo: !a.ativo });
      setLista((l) => l.map((x) => (x.id === a.id ? { ...x, ...salvo } : x)));
      toast.success(salvo.ativo ? 'Agendamento ativado' : 'Agendamento pausado');
    } catch (e) { toast.error(`Não foi possível alterar: ${e?.message || e}`); } finally { setOcupado(null); }
  };

  const excluir = async (a) => {
    setOcupado(a.id);
    try {
      await excluirAgendamento(a.id);
      setLista((l) => l.filter((x) => x.id !== a.id));
      toast.success('Agendamento excluído (o histórico gerado continua disponível)');
    } catch (e) { toast.error(`Não foi possível excluir: ${e?.message || e}`); } finally { setOcupado(null); setConfirmarExclusao(null); }
  };

  const aoSalvar = (salvo) => {
    setLista((l) => (l.some((x) => x.id === salvo.id) ? l.map((x) => (x.id === salvo.id ? salvo : x)) : [...l, salvo]));
    setForm((x) => ({ ...x, aberto: false }));
  };

  return (
    <div className="space-y-3">
      <Painel className="space-y-2 text-xs text-slate-300">
        <p className="flex items-start gap-2"><Bell className="h-4 w-4 shrink-0 text-sky-300" aria-hidden />
          <span>O sistema gera um resumo no horário agendado e avisa no sino de notificações; o PDF completo é gerado sob demanda (aba Gerar ou botão &quot;Gerar PDF atual&quot; no histórico).</span>
        </p>
        <p className="flex items-start gap-2 text-slate-400"><Mail className="h-4 w-4 shrink-0" aria-hidden />
          <span>Envio por e-mail ainda não está configurado — por enquanto o aviso chega só pelo sino do sistema.</span>
        </p>
      </Painel>

      <Painel className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><CalendarClock className="h-4 w-4 text-slate-300" aria-hidden /> Agendamentos</h2>
          <div className="flex items-center gap-2">
            <button type="button" className={CLS_BTN} onClick={carregar} disabled={carregando}>
              <RefreshCw className={cn('h-3.5 w-3.5', carregando && 'animate-spin')} aria-hidden /> Atualizar
            </button>
            <button type="button" className={CLS_BTN_PRIMARIO} onClick={() => setForm({ aberto: true, inicial: formVazio(obraAtual) })}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Novo agendamento
            </button>
          </div>
        </div>

        <FaixaErro mensagem={erro} onTentar={carregar} />
        {carregando && !lista.length ? <Carregando texto="Carregando agendamentos…" /> : !erro && !lista.length ? (
          <p className="py-8 text-center text-sm text-slate-400">Nenhum agendamento. Crie um para receber um resumo automático.</p>
        ) : (
          <ul className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {lista.map((a) => {
              const prox = proximaExecucao(a, agora);
              return (
                <li key={a.id} className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3 space-y-2 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{a.nome}</p>
                      <p className="text-[11px] text-slate-400">{rotuloTipo(a.tipo)} · {nomeObra(a.obra_id)}</p>
                    </div>
                    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]', a.ativo ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-slate-600 bg-slate-800 text-slate-300')}>
                      {a.ativo ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <PauseCircle className="h-3 w-3" aria-hidden />}
                      {a.ativo ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div><dt className="inline text-slate-400">Quando: </dt><dd className="inline text-slate-200">{descreverFrequencia(a)}</dd></div>
                    <div><dt className="inline text-slate-400">Aviso para: </dt><dd className="inline text-slate-200">{a.destino_role ? (ROLE_LABELS?.[a.destino_role] || a.destino_role) : 'Todos'}</dd></div>
                    <div><dt className="inline text-slate-400">Próxima: </dt><dd className="inline text-slate-200 tabular-nums">{a.ativo ? (prox ? fmtDataHoraBRT(prox) : '—') : 'pausado'}</dd></div>
                    <div><dt className="inline text-slate-400">Última: </dt><dd className="inline text-slate-200 tabular-nums">{a.ultima_execucao ? fmtDataHoraBRT(a.ultima_execucao) : 'nunca'}</dd></div>
                  </dl>
                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    <button type="button" className={CLS_BTN} disabled={ocupado === a.id} onClick={() => alternarAtivo(a)} aria-label={a.ativo ? `Pausar ${a.nome}` : `Ativar ${a.nome}`}>
                      {a.ativo ? <PauseCircle className="h-3.5 w-3.5" aria-hidden /> : <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />} {a.ativo ? 'Pausar' : 'Ativar'}
                    </button>
                    <button type="button" className={CLS_BTN} onClick={() => setForm({ aberto: true, inicial: formDe(a) })} aria-label={`Editar ${a.nome}`}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden /> Editar
                    </button>
                    {confirmarExclusao === a.id ? (
                      <>
                        <button type="button" className={cn(CLS_BTN, 'border-red-500/60 text-red-200 hover:bg-red-500/20')} disabled={ocupado === a.id} onClick={() => excluir(a)}>
                          {ocupado === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" aria-hidden />} Confirmar exclusão
                        </button>
                        <button type="button" className={CLS_BTN} onClick={() => setConfirmarExclusao(null)}>Cancelar</button>
                      </>
                    ) : (
                      <button type="button" className={CLS_BTN} onClick={() => setConfirmarExclusao(a.id)} aria-label={`Excluir ${a.nome}`}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Excluir
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Painel>

      <FormAgendamento
        aberto={form.aberto}
        inicial={form.inicial}
        obras={obras}
        onFechar={() => setForm((x) => ({ ...x, aberto: false }))}
        onSalvo={aoSalvar}
      />
    </div>
  );
}
