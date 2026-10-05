// ============================================================
// Central de Relatórios — peças visuais compartilhadas (tema slate)
// ============================================================
import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CLS_INPUT = 'w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 disabled:opacity-60';
export const CLS_BTN = 'inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50';
export const CLS_BTN_PRIMARIO = 'inline-flex items-center justify-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50';

export const Painel = React.forwardRef(({ className, children, ...rest }, ref) => (
  <div ref={ref} className={cn('rounded-xl border border-slate-700/60 bg-slate-900/60 p-4', className)} {...rest}>{children}</div>
));
Painel.displayName = 'Painel';

export function Campo({ rotulo, htmlFor, erro, ajuda, children, className }) {
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-300">{rotulo}</label>
      {children}
      {erro ? <p className="text-[11px] text-rose-300" role="alert">{erro}</p> : ajuda ? <p className="text-[11px] text-slate-500">{ajuda}</p> : null}
    </div>
  );
}

export function FaixaErro({ mensagem, onTentar }) {
  if (!mensagem) return null;
  return (
    <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
      <span className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden /> {mensagem}</span>
      {onTentar && <button type="button" onClick={onTentar} className="shrink-0 rounded-md border border-rose-400/50 px-3 py-1 text-xs hover:bg-rose-500/20">Tentar de novo</button>}
    </div>
  );
}

export function Carregando({ texto = 'Carregando…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400" aria-busy="true">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {texto}
    </div>
  );
}

const CORES_FORMATO = {
  pdf: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  xlsx: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  csv: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  resumo: 'border-violet-500/40 bg-violet-500/10 text-violet-200',
};
export function SeloFormato({ formato }) {
  const f = String(formato || '—').toLowerCase();
  return (
    <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide', CORES_FORMATO[f] || 'border-slate-600 bg-slate-800 text-slate-300')}>
      {f}
    </span>
  );
}
