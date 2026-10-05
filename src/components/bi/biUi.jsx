// ============================================================
// Kit visual do BI (BI 360 e Radar de Alertas)
// ============================================================
// Paleta validada (skill dataviz, validate_palette --mode dark, surface
// #0f172a): lightness band, chroma, CVD ΔE ≥ 8,4, normal-vision ≥ 19,3 e
// contraste ≥ 3:1 — PASS. Ordem FIXA (nunca reciclar; >5 séries → "Outros").
// Status é paleta separada e SEMPRE acompanha ícone + rótulo.
// ============================================================

import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'];
export const STATUS = { bom: '#0ca30c', atencao: '#fab219', serio: '#ec835a', critico: '#d03b3b' };
export const NEUTRO = '#64748b';
export const GRID = '#1e293b';
export const EIXO = '#94a3b8';

export const fmtBRL = (v, dig = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: dig, maximumFractionDigits: dig }).format(Number(v) || 0);
export const fmtBRLc = (v) => {
  const n = Number(v) || 0;
  const a = Math.abs(n);
  if (a >= 1e6) return `R$ ${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`;
  if (a >= 1e3) return `R$ ${(n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return fmtBRL(n);
};
export const fmtKg = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1e4) return `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t`;
  return `${Math.round(n).toLocaleString('pt-BR')} kg`;
};
export const fmtPct = (v, dig = 1) => (v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: dig })}%`);
export const fmtNum = (v, dig = 0) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: dig });
export const fmtData = (iso) => {
  if (!iso) return '—';
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
};

/** Estilo padrão do Tooltip do Recharts (texto em tinta neutra, não na cor da série). */
export const tooltipProps = {
  contentStyle: { background: '#0b1220', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#e2e8f0' },
  labelStyle: { color: '#cbd5e1', fontWeight: 600 },
  itemStyle: { color: '#e2e8f0' },
  cursor: { fill: 'rgba(148,163,184,0.08)' },
};
export const eixoProps = { stroke: EIXO, tick: { fill: EIXO, fontSize: 11 }, tickLine: false, axisLine: { stroke: GRID } };

/** Tile de KPI (número herói + contexto). `tendencia` em pontos/percentual com sinal. */
export function KpiTile({ rotulo, valor, sub, tendencia, tendenciaBoa = 'alta', icone: Icone, ajuda, className }) {
  const t = Number(tendencia);
  const temT = tendencia !== null && tendencia !== undefined && Number.isFinite(t);
  const boa = temT && (tendenciaBoa === 'alta' ? t >= 0 : t <= 0);
  return (
    <div className={cn('rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 min-w-0', className)}>
      <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
        {Icone && <Icone className="h-4 w-4 text-slate-400" aria-hidden />}
        <span className="truncate">{rotulo}</span>
        {ajuda && <span title={ajuda} className="ml-auto cursor-help"><Info className="h-3.5 w-3.5 text-slate-500" aria-label={ajuda} /></span>}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white tabular-nums truncate">{valor}</div>
      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 min-w-0">
        {temT && (
          <span className={cn('font-medium tabular-nums', boa ? 'text-emerald-400' : 'text-rose-400')}>
            {t > 0 ? '▲' : t < 0 ? '▼' : '■'} {fmtPct(Math.abs(t), 0)}
          </span>
        )}
        {sub && <span className="truncate">{sub}</span>}
      </div>
    </div>
  );
}

/** Cartão de gráfico com título, subtítulo (o que o gráfico responde) e ação. */
export function ChartCard({ titulo, subtitulo, acao, children, className, vazio, mensagemVazio = 'Sem dados no escopo atual.' }) {
  return (
    <section className={cn('rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 min-w-0', className)}>
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{titulo}</h3>
          {subtitulo && <p className="text-xs text-slate-400 mt-0.5">{subtitulo}</p>}
        </div>
        {acao}
      </header>
      {vazio ? <div className="h-40 flex items-center justify-center text-sm text-slate-500">{mensagemVazio}</div> : children}
    </section>
  );
}

/** Legenda manual (≥ 2 séries). */
export function Legenda({ itens = [] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
      {itens.map((i) => (
        <span key={i.rotulo} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: i.cor, ...(i.tracejado ? { background: 'transparent', border: `2px dashed ${i.cor}` } : {}) }} />
          {i.rotulo}
        </span>
      ))}
    </div>
  );
}
