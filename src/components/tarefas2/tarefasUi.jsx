// ============================================================
// Central de Tarefas — helpers de apresentação e datas locais
// ============================================================
// Datas das tarefas são 'YYYY-MM-DD' (date do Postgres). NUNCA usar
// new Date('YYYY-MM-DD') (vira o dia anterior em UTC-3) — ver CLAUDE.md #3.
// ============================================================

import React from 'react';
import {
  Circle, PlayCircle, Ban, CheckCircle2, ArrowDown, Minus, ArrowUp, AlertOctagon,
  AlarmClock, CalendarClock, CalendarCheck, CalendarX, CalendarOff, Bot, Radar, FileInput, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const CLS_TRIGGER = 'h-9 bg-slate-900/60 border-slate-700 text-slate-100 text-xs focus:ring-sky-400';
export const CLS_CONTENT = 'bg-slate-900 border-slate-700 text-slate-100';
export const CLS_ITEM = 'text-xs focus:bg-slate-800 focus:text-white';
export const CLS_INPUT = 'h-9 w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400';
export const CLS_BTN = 'inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-600 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700/70 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400';
export const CLS_BTN_PRIM = 'inline-flex items-center justify-center gap-1.5 rounded-md border border-sky-500/50 bg-sky-600/30 px-3 py-2 text-xs font-medium text-sky-50 hover:bg-sky-600/45 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400';
export const CLS_BTN_PERIGO = 'inline-flex items-center justify-center gap-1.5 rounded-md border border-red-500/50 bg-red-600/20 px-3 py-2 text-xs font-medium text-red-100 hover:bg-red-600/35 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400';

export const STATUS_UI = {
  pendente: { rotulo: 'Pendente', cor: '#94a3b8', Icone: Circle },
  em_andamento: { rotulo: 'Em andamento', cor: '#3b82f6', Icone: PlayCircle },
  bloqueada: { rotulo: 'Bloqueada', cor: '#ef4444', Icone: Ban },
  concluida: { rotulo: 'Concluída', cor: '#22c55e', Icone: CheckCircle2 },
};

export const PRIORIDADE_UI = {
  baixa: { rotulo: 'Baixa', cor: '#94a3b8', Icone: ArrowDown, peso: 0 },
  media: { rotulo: 'Média', cor: '#3b82f6', Icone: Minus, peso: 1 },
  alta: { rotulo: 'Alta', cor: '#f97316', Icone: ArrowUp, peso: 2 },
  urgente: { rotulo: 'Urgente', cor: '#ef4444', Icone: AlertOctagon, peso: 3 },
};

export const ORIGEM_UI = {
  manual: { rotulo: 'Manual', Icone: User },
  automacao: { rotulo: 'Automação', Icone: Bot },
  alerta: { rotulo: 'Radar', Icone: Radar },
  importacao: { rotulo: 'Importação', Icone: FileInput },
};

export const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const pad = (n) => String(n).padStart(2, '0');

/** Date local → 'YYYY-MM-DD'. */
export const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hojeISO = () => isoLocal(new Date());

/** 'YYYY-MM-DD' (ou timestamp) → Date local à meia-noite; null se inválido. */
export function parseLocalDate(str) {
  if (!str) return null;
  const m = String(str).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Somente a parte de data ('YYYY-MM-DD') ou ''. */
export const soData = (str) => (str ? String(str).slice(0, 10) : '');

export function fmtData(str) {
  const d = parseLocalDate(str);
  return d ? d.toLocaleDateString('pt-BR') : '—';
}

export function fmtDataHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Dias de hoje até a data (negativo = passado). */
export function diasAte(str, hoje = new Date()) {
  const d = parseLocalDate(str);
  if (!d) return null;
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((d.getTime() - h.getTime()) / 86400000);
}

export const estaConcluida = (t) => t?.status === 'concluida';
export const estaAtrasada = (t) => !estaConcluida(t) && t?.data_fim && diasAte(t.data_fim) < 0;
export const venceEm7Dias = (t) => {
  if (estaConcluida(t) || !t?.data_fim) return false;
  const d = diasAte(t.data_fim);
  return d >= 0 && d <= 7;
};
export function concluidaNoMes(t, hoje = new Date()) {
  if (!estaConcluida(t)) return false;
  const ref = soData(t.data_conclusao || t.updated_at);
  const d = parseLocalDate(ref);
  return !!d && d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
}

/** Situação do prazo (sempre ícone + texto). */
export function situacaoPrazo(t) {
  if (estaConcluida(t)) return { tipo: 'concluida', rotulo: t.data_conclusao ? `Concluída ${fmtData(t.data_conclusao)}` : 'Concluída', cor: '#22c55e', Icone: CalendarCheck };
  if (!t?.data_fim) return { tipo: 'sem', rotulo: 'Sem prazo', cor: '#64748b', Icone: CalendarOff };
  const d = diasAte(t.data_fim);
  if (d < 0) return { tipo: 'atrasada', rotulo: `Atrasada ${-d}d · ${fmtData(t.data_fim)}`, cor: '#ef4444', Icone: CalendarX };
  if (d === 0) return { tipo: 'vencendo', rotulo: 'Vence hoje', cor: '#f97316', Icone: AlarmClock };
  if (d <= 7) return { tipo: 'vencendo', rotulo: `Vence em ${d}d · ${fmtData(t.data_fim)}`, cor: '#eab308', Icone: AlarmClock };
  return { tipo: 'ok', rotulo: `Prazo ${fmtData(t.data_fim)}`, cor: '#94a3b8', Icone: CalendarClock };
}

export function nomeObraDe(obras, obraId) {
  if (!obraId) return 'Sem obra';
  const o = (obras || []).find((x) => x.id === obraId);
  if (!o) return obraId;
  return `${o.codigo ? `${o.codigo} · ` : ''}${o.nome || o.id}`;
}

export const tagsDe = (t) => (Array.isArray(t?.tags) ? t.tags.filter(Boolean).map(String) : []);
export const depsDe = (t) => (Array.isArray(t?.dependencias) ? t.dependencias.filter(Boolean).map(String) : []);

/** Erro de chave duplicada do Postgres/PostgREST. */
export const ehDuplicidade = (e) => /duplicate|unique|23505|já existe/i.test(String(e?.message || e || ''));

// ---------------- Pequenos componentes ----------------

export function StatusBadge({ status, className }) {
  const ui = STATUS_UI[status] || STATUS_UI.pendente;
  const Ic = ui.Icone;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', className)}
      style={{ borderColor: `${ui.cor}66`, backgroundColor: `${ui.cor}1a`, color: ui.cor }}>
      <Ic className="h-3 w-3" aria-hidden /> {ui.rotulo}
    </span>
  );
}

export function PrioridadeBadge({ prioridade, className }) {
  const ui = PRIORIDADE_UI[prioridade] || PRIORIDADE_UI.media;
  const Ic = ui.Icone;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', className)}
      style={{ borderColor: `${ui.cor}66`, backgroundColor: `${ui.cor}1a`, color: ui.cor }}>
      <Ic className="h-3 w-3" aria-hidden /> {ui.rotulo}
    </span>
  );
}

export function PrazoInfo({ tarefa, className }) {
  const s = situacaoPrazo(tarefa);
  const Ic = s.Icone;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] whitespace-nowrap', className)} style={{ color: s.cor }}>
      <Ic className="h-3.5 w-3.5 shrink-0" aria-hidden /> {s.rotulo}
    </span>
  );
}

export function OrigemBadge({ origem, className }) {
  if (!origem || origem === 'manual') return null;
  const ui = ORIGEM_UI[origem] || { rotulo: origem, Icone: Bot };
  const Ic = ui.Icone;
  const cor = origem === 'automacao' ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
    : origem === 'alerta' ? 'border-sky-500/50 bg-sky-500/15 text-sky-200'
      : 'border-slate-600 bg-slate-800 text-slate-300';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap', cor, className)}>
      <Ic className="h-3 w-3" aria-hidden /> {ui.rotulo}
    </span>
  );
}

export function BarraProgresso({ valor, className }) {
  const v = Math.max(0, Math.min(100, Number(valor) || 0));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-700/70" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label="Percentual concluído">
        <div className="h-full rounded-full" style={{ width: `${v}%`, backgroundColor: v >= 100 ? '#22c55e' : '#3b82f6' }} />
      </div>
      <span className="w-9 text-right text-[11px] tabular-nums text-slate-300">{Math.round(v)}%</span>
    </div>
  );
}
