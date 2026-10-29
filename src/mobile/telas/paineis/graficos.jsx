// ============================================================
// Peças de gráfico dos painéis da diretoria (tema grafite Montex)
// ============================================================
// Paleta categórica validada para o fundo #171C1F (dataviz validator:
// faixa de luminosidade, croma, separação p/ daltonismo e contraste ≥ 3:1):
//   fabricação #4a8ef0 · solda #d06a1f · pintura #a66cf0 · embarque #2fae6a
// Receita usa o azul e despesa o laranja (mesma ordem fixa). Texto nunca
// usa a cor da série: valores e rótulos ficam nas tintas do tema.
// ============================================================
import React from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { cn } from '@/lib/utils';

export const COR = {
  fabricacao: '#4a8ef0',
  solda: '#d06a1f',
  pintura: '#a66cf0',
  expedicao: '#2fae6a',
  receita: '#4a8ef0',
  despesa: '#d06a1f',
  grade: '#2C3438',
  eixo: '#8A969B',
  superficie: '#171C1F',
  destaque: '#48ACA7',
};

export const EIXO = { tick: { fill: COR.eixo, fontSize: 11 }, axisLine: false, tickLine: false };
export const GRADE = { stroke: COR.grade, strokeDasharray: '3 4', vertical: false };

/** Cartão de gráfico: título, leitura em uma linha e conteúdo. */
export function Cartao({ titulo, leitura, acao, children, className }) {
  return (
    <section className={cn('mt-4 rounded-[18px] border border-mx-line/60 bg-mx-s1 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-mx-text">{titulo}</h2>
          {leitura && <p className="mt-0.5 text-[13px] leading-snug text-mx-text2">{leitura}</p>}
        </div>
        {acao}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Variação ▲▼ (inverso = subir é ruim, ex.: despesa). */
export function Variacao({ valor, inverso = false, sufixo = 'vs período anterior', compacto = false }) {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) {
    return <span className="text-[12px] text-mx-text3">{compacto ? '—' : 'sem base de comparação'}</span>;
  }
  const bom = inverso ? valor < 0 : valor > 0;
  const neutro = Math.abs(valor) < 0.5;
  const tom = neutro ? 'text-mx-text2' : bom ? 'text-mx-ok' : 'text-mx-bad';
  const seta = neutro ? '■' : valor > 0 ? '▲' : '▼';
  return (
    <span className={cn('mx-tab text-[12px] font-medium', tom)}>
      <span aria-hidden>{seta}</span> {valor > 0 ? '+' : ''}{valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
      {!compacto && <span className="font-normal text-mx-text3"> {sufixo}</span>}
    </span>
  );
}

/** Legenda que liga/desliga séries (toque). Mantém sempre ao menos uma ligada. */
export function LegendaSeries({ series, ativas, onAlternar }) {
  return (
    <div className="mx-scroll-x -mx-1 flex gap-1.5 px-1 pb-1" role="group" aria-label="Séries do gráfico">
      {series.map((s) => {
        const on = ativas.includes(s.key);
        return (
          <button
            key={s.key}
            type="button"
            aria-pressed={on}
            onClick={() => onAlternar(s.key)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
              on ? 'border-mx-line bg-mx-s2 text-mx-text' : 'border-mx-line/50 text-mx-text3 line-through',
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: on ? s.cor : 'transparent', boxShadow: `inset 0 0 0 1.5px ${s.cor}` }} aria-hidden />
            {s.rotulo}
          </button>
        );
      })}
    </div>
  );
}

/** Conteúdo da dica (tooltip) no tema. `formatar(valor, chave)` decide o texto. */
export function Dica({ active, payload, label, formatar, titulo, extra }) {
  if (!active || !payload?.length) return null;
  const linhas = payload.filter((p) => p.value !== undefined && p.value !== null);
  return (
    <div className="min-w-[150px] rounded-xl border border-mx-line bg-mx-s2/95 px-3 py-2 shadow-xl shadow-black/40 backdrop-blur">
      <div className="mb-1 text-[12px] font-semibold text-mx-text">{titulo ? titulo(label, payload) : label}</div>
      {linhas.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 text-[12px]">
          <span className="flex items-center gap-1.5 text-mx-text2">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} aria-hidden />
            {p.name}
          </span>
          <span className="mx-tab font-semibold text-mx-text">{formatar ? formatar(p.value, p.dataKey) : p.value}</span>
        </div>
      ))}
      {extra && <div className="mt-1 border-t border-mx-line pt-1 text-[12px] text-mx-text2">{extra(payload)}</div>}
    </div>
  );
}

/** Minigráfico de tendência (área suave) para números de destaque. */
export function Mini({ dados, chave, cor = COR.destaque, altura = 44 }) {
  if (!dados?.length) return null;
  const id = `mini-${chave}-${cor.replace('#', '')}`;
  return (
    <div style={{ height: altura }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey={chave} stroke={cor} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barra horizontal simples (ranking) — valor em texto, barra em uma cor. */
export function BarraRanking({ rotulo, sub, valor, texto, max, cor = COR.destaque, onClick, ativo }) {
  const p = max > 0 ? Math.max(2, Math.min(100, (valor / max) * 100)) : 0;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={cn('block w-full py-2 text-left', onClick && 'active:opacity-70')}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn('min-w-0 truncate text-[14px]', ativo ? 'font-semibold text-mx-text' : 'text-mx-text')}>{rotulo}</span>
        <span className="mx-tab shrink-0 text-[13px] font-semibold text-mx-text">{texto}</span>
      </div>
      {sub && <div className="truncate text-[12px] text-mx-text3">{sub}</div>}
      <div className="mt-1.5 h-[6px] overflow-hidden rounded-full bg-mx-s3">
        <div className="h-full rounded-full" style={{ width: `${p}%`, background: cor }} />
      </div>
    </Tag>
  );
}

// ---- formatos curtos ----
export const kgCurto = (v) => {
  const x = Number(v) || 0;
  if (Math.abs(x) >= 1000) return `${(x / 1000).toLocaleString('pt-BR', { maximumFractionDigits: x >= 100000 ? 0 : 1 })} t`;
  return `${Math.round(x).toLocaleString('pt-BR')} kg`;
};
export const tEixo = (v) => {
  const x = Number(v) || 0;
  return Math.abs(x) >= 1000 ? `${(x / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}t` : `${Math.round(x)}`;
};
export const brlCurto = (v) => {
  const x = Number(v) || 0;
  const s = x < 0 ? '−' : '';
  const a = Math.abs(x);
  if (a >= 1e6) return `${s}R$ ${(a / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`;
  if (a >= 1e3) return `${s}R$ ${(a / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return `${s}R$ ${Math.round(a).toLocaleString('pt-BR')}`;
};
export const brlEixo = (v) => {
  const x = Number(v) || 0;
  const a = Math.abs(x);
  const s = x < 0 ? '−' : '';
  if (a >= 1e6) return `${s}${(a / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}mi`;
  if (a >= 1e3) return `${s}${Math.round(a / 1e3)}mil`;
  return `${s}${Math.round(a)}`;
};
