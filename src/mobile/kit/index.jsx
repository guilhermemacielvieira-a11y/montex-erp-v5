// ============================================================
// KIT do app da diretoria — componentes base
// ============================================================
// Regras visuais:
//  - Listas são LINHAS dentro de um Grupo (filetes entre linhas), não uma
//    pilha de cartões. Cartão só para métricas agrupadas.
//  - Raio por hierarquia: folha 24, grupo 18, métrica 14, chip 8.
//  - Status SEMPRE com ponto + texto (nunca só cor).
//  - Números de destaque com .mx-num (Archivo expandido, tabular).
// ============================================================
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Search, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import PullToRefresh from '../ui/PullToRefresh';

export const TOM = {
  ok: { txt: 'text-mx-ok', bg: 'bg-mx-ok', soft: 'bg-mx-ok/10', borda: 'border-mx-ok/30' },
  warn: { txt: 'text-mx-warn', bg: 'bg-mx-warn', soft: 'bg-mx-warn/10', borda: 'border-mx-warn/30' },
  bad: { txt: 'text-mx-bad', bg: 'bg-mx-bad', soft: 'bg-mx-bad/10', borda: 'border-mx-bad/30' },
  teal: { txt: 'text-mx-tealhi', bg: 'bg-mx-tealhi', soft: 'bg-mx-teal/20', borda: 'border-mx-teal/40' },
  neutro: { txt: 'text-mx-text2', bg: 'bg-mx-text3', soft: 'bg-mx-s2', borda: 'border-mx-line' },
};

/* ---------- Tela: cabeçalho + rolagem + puxar para atualizar ---------- */
export function Tela({ titulo, subtitulo, voltar = false, acoes, onRefresh, children, rodape, semRecuo = false, cabecalhoExtra }) {
  const navigate = useNavigate();
  const corpo = (
    <div className={cn('pb-28', !semRecuo && 'px-4')}>
      {children}
    </div>
  );
  return (
    <div className="flex h-full flex-col">
      <header
        className="flex-shrink-0 border-b border-mx-line/70 bg-mx-bg/95 backdrop-blur-md"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)' }}
      >
        <div className="flex min-h-[52px] items-center gap-2 px-4">
          {voltar && (
            <button
              type="button"
              onClick={() => (typeof voltar === 'string' ? navigate(voltar) : navigate(-1))}
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-xl text-mx-text2 active:bg-mx-s2"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          <div className="min-w-0 flex-1 py-1">
            <h1 className="mx-titulo truncate text-[22px] leading-tight text-mx-text">{titulo}</h1>
            {subtitulo && <p className="truncate text-[13px] text-mx-text2">{subtitulo}</p>}
          </div>
          {acoes && <div className="flex items-center gap-1">{acoes}</div>}
        </div>
        {cabecalhoExtra}
      </header>
      <main className="min-h-0 flex-1">
        {onRefresh ? (
          <PullToRefresh onRefresh={onRefresh}>{corpo}</PullToRefresh>
        ) : (
          <div className="mx-scroll h-full">{corpo}</div>
        )}
      </main>
      {rodape && (
        <div className="flex-shrink-0 border-t border-mx-line bg-mx-bg px-4 pt-3" style={{ paddingBottom: 'calc(max(env(safe-area-inset-bottom), 8px) + 72px)' }}>
          {rodape}
        </div>
      )}
    </div>
  );
}

/** Botão de ícone para o cabeçalho (com badge opcional). */
export function BotaoIcone({ icone: Icone, rotulo, onClick, to, badge, tom = 'teal' }) {
  const cls = 'relative flex h-11 w-11 items-center justify-center rounded-xl text-mx-text2 active:bg-mx-s2';
  const conteudo = (
    <>
      <Icone className="h-[22px] w-[22px]" aria-hidden />
      {badge > 0 && (
        <span className={cn('absolute right-1.5 top-1.5 min-w-[18px] rounded-full px-1 text-center text-[11px] font-bold leading-[18px] text-mx-bg', TOM[tom]?.bg || 'bg-mx-tealhi')}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </>
  );
  if (to) return <Link to={to} className={cls} aria-label={badge ? `${rotulo}, ${badge}` : rotulo}>{conteudo}</Link>;
  return <button type="button" onClick={onClick} className={cls} aria-label={badge ? `${rotulo}, ${badge}` : rotulo}>{conteudo}</button>;
}

/* ---------- Seção ---------- */
export function Secao({ titulo, acao, children, className, descricao }) {
  return (
    <section className={cn('mt-6', className)}>
      {(titulo || acao) && (
        <div className="mb-2 flex items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            {titulo && <h2 className="text-[17px] font-semibold text-mx-text">{titulo}</h2>}
            {descricao && <p className="text-[13px] text-mx-text3">{descricao}</p>}
          </div>
          {acao && (acao.to ? (
            <Link to={acao.to} className="shrink-0 py-1 text-[14px] font-medium text-mx-tealhi active:opacity-70">{acao.rotulo}</Link>
          ) : (
            <button type="button" onClick={acao.onClick} className="shrink-0 py-1 text-[14px] font-medium text-mx-tealhi active:opacity-70">{acao.rotulo}</button>
          ))}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---------- Grupo de linhas ---------- */
export function Grupo({ children, className }) {
  return (
    <div className={cn('overflow-hidden rounded-[18px] border border-mx-line/60 bg-mx-s1 [&>*+*]:border-t [&>*+*]:border-mx-line/60', className)}>
      {children}
    </div>
  );
}

export function Linha({ icone: Icone, iconeTom = 'neutro', titulo, sub, valor, valorSub, valorTom, to, onClick, chevron, direita, className, destaque }) {
  const interativo = !!(to || onClick);
  const conteudo = (
    <div className={cn('flex min-h-[56px] items-center gap-3 px-4 py-3', interativo && 'active:bg-mx-s2', className)}>
      {Icone && (
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]', TOM[iconeTom]?.soft, TOM[iconeTom]?.txt)}>
          <Icone className="h-[18px] w-[18px]" aria-hidden />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className={cn('line-clamp-2 text-[15px] leading-snug text-mx-text', destaque && 'font-semibold')}>{titulo}</div>
        {sub && <div className="truncate text-[13px] text-mx-text2">{sub}</div>}
      </div>
      {(valor !== undefined || valorSub) && (
        <div className="shrink-0 text-right">
          {valor !== undefined && <div className={cn('mx-tab text-[15px] font-semibold', valorTom ? TOM[valorTom]?.txt : 'text-mx-text')}>{valor}</div>}
          {valorSub && <div className="mx-tab text-[12px] text-mx-text3">{valorSub}</div>}
        </div>
      )}
      {direita}
      {(chevron ?? interativo) && <ChevronRight className="h-4 w-4 shrink-0 text-mx-text3" aria-hidden />}
    </div>
  );
  if (to) return <Link to={to} className="block">{conteudo}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className="block w-full text-left">{conteudo}</button>;
  return conteudo;
}

/* ---------- Métricas ---------- */
export function Metrica({ rotulo, valor, sub, tom, to, className }) {
  const corpo = (
    <div className={cn('h-full rounded-[14px] border border-mx-line/60 bg-mx-s1 p-3.5', to && 'active:bg-mx-s2', className)}>
      <div className="text-[13px] text-mx-text2">{rotulo}</div>
      <div className={cn('mx-num mt-1 truncate text-[22px] leading-tight', tom ? TOM[tom]?.txt : 'text-mx-text')}>{valor}</div>
      {sub && <div className="mt-0.5 truncate text-[12px] text-mx-text3">{sub}</div>}
    </div>
  );
  return to ? <Link to={to} className="block">{corpo}</Link> : corpo;
}

export function Grade({ children, colunas = 2, className }) {
  return <div className={cn('grid gap-2.5', colunas === 3 ? 'grid-cols-3' : 'grid-cols-2', className)}>{children}</div>;
}

/* ---------- Barra de progresso com marcas ---------- */
export function Barra({ valor = 0, max = 100, tom = 'teal', marcas = [], altura = 8, rotulo }) {
  const p = max > 0 ? Math.max(0, Math.min(100, (valor / max) * 100)) : 0;
  return (
    <div className="relative" role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100} aria-label={rotulo}>
      <div className="overflow-hidden rounded-full bg-mx-s3" style={{ height: altura }}>
        <div className={cn('h-full rounded-full', TOM[tom]?.bg)} style={{ width: `${p}%` }} />
      </div>
      {marcas.map((m) => (
        <span
          key={m.rotulo}
          className="absolute top-[-3px] w-[2px] rounded bg-mx-text"
          style={{ left: `${Math.max(0, Math.min(100, (m.em / max) * 100))}%`, height: altura + 6 }}
          title={m.rotulo}
        />
      ))}
    </div>
  );
}

/* ---------- Status ---------- */
export function Status({ tom = 'neutro', children, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px]', TOM[tom]?.txt, className)}>
      <span className={cn('h-2 w-2 shrink-0 rounded-full', TOM[tom]?.bg)} aria-hidden />
      {children}
    </span>
  );
}

export function Etiqueta({ tom = 'neutro', children }) {
  return (
    <span className={cn('inline-flex items-center rounded-lg border px-2 py-0.5 text-[12px] font-medium', TOM[tom]?.soft, TOM[tom]?.txt, TOM[tom]?.borda)}>
      {children}
    </span>
  );
}

/* ---------- Abas segmentadas ---------- */
export function Abas({ itens, valor, onChange, className }) {
  const ref = React.useRef(null);
  // A aba ativa sempre visível (ex.: abriu direto em ?aba=estoque, a última).
  React.useEffect(() => {
    const el = ref.current?.querySelector('[aria-selected="true"]');
    if (el?.scrollIntoView) el.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [valor]);
  return (
    <div ref={ref} className={cn('mx-scroll-x flex gap-1.5 px-4 pb-2.5', className)} role="tablist">
      {itens.map((i) => {
        const ativo = i.id === valor;
        return (
          <button
            key={i.id}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(i.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[14px] font-medium transition-colors',
              ativo ? 'border-mx-teal bg-mx-teal text-white' : 'border-mx-line bg-mx-s1 text-mx-text2 active:bg-mx-s2',
            )}
          >
            {i.rotulo}
            {i.badge > 0 && <span className={cn('mx-tab rounded-full px-1.5 text-[11px] font-bold', ativo ? 'bg-white/25' : 'bg-mx-s3 text-mx-text')}>{i.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Busca ---------- */
export function Busca({ valor, onChange, placeholder = 'Buscar', className }) {
  return (
    <label className={cn('flex h-11 items-center gap-2 rounded-xl border border-mx-line bg-mx-s1 px-3', className)}>
      <Search className="h-[18px] w-[18px] shrink-0 text-mx-text3" aria-hidden />
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-mx-text placeholder:text-mx-text3 outline-none"
        type="search"
        enterKeyHint="search"
      />
      {valor && (
        <button type="button" onClick={() => onChange('')} aria-label="Limpar busca" className="-mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-mx-text3 active:bg-mx-s2">
          <X className="h-4 w-4" />
        </button>
      )}
    </label>
  );
}

/* ---------- Botões ---------- */
export function Botao({ variante = 'primario', className, children, icone: Icone, carregando, ...props }) {
  const v = {
    primario: 'bg-mx-teal text-white active:bg-mx-teal/80',
    secundario: 'border border-mx-line bg-mx-s1 text-mx-text active:bg-mx-s2',
    perigo: 'bg-mx-bad/15 text-mx-bad border border-mx-bad/30 active:bg-mx-bad/25',
    fantasma: 'text-mx-tealhi active:bg-mx-s2',
  }[variante];
  return (
    <button
      type="button"
      className={cn('inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold disabled:opacity-50', v, className)}
      disabled={carregando || props.disabled}
      {...props}
    >
      {carregando ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden /> : Icone && <Icone className="h-[18px] w-[18px]" aria-hidden />}
      {children}
    </button>
  );
}

/* ---------- Estados ---------- */
export function Vazio({ icone: Icone, titulo, texto, acao }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {Icone && <Icone className="h-9 w-9 text-mx-text3" aria-hidden />}
      <p className="mt-3 text-[16px] font-semibold text-mx-text">{titulo}</p>
      {texto && <p className="mt-1 max-w-[300px] text-[14px] text-mx-text2">{texto}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

export function Erro({ texto, onTentar }) {
  return (
    <div role="alert" className="mt-4 flex items-start gap-3 rounded-[14px] border border-mx-bad/30 bg-mx-bad/10 p-3.5">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-mx-bad" aria-hidden />
      <div className="min-w-0 flex-1 text-[14px] text-mx-text">
        {texto}
        {onTentar && (
          <button type="button" onClick={onTentar} className="mt-2 block font-semibold text-mx-tealhi">Tentar de novo</button>
        )}
      </div>
    </div>
  );
}

export function Esqueleto({ linhas = 4, metricas = 0 }) {
  return (
    <div className="animate-pulse space-y-3 pt-4" aria-busy="true" aria-label="Carregando">
      {metricas > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: metricas }).map((_, i) => <div key={i} className="h-[92px] rounded-[14px] bg-mx-s1" />)}
        </div>
      )}
      <div className="overflow-hidden rounded-[18px] bg-mx-s1">
        {Array.from({ length: linhas }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-mx-bg/40 px-4 py-4 first:border-t-0">
            <div className="h-9 w-9 rounded-[10px] bg-mx-s2" />
            <div className="flex-1 space-y-2"><div className="h-3 w-2/3 rounded bg-mx-s2" /><div className="h-2.5 w-1/3 rounded bg-mx-s2" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Campo de formulário ---------- */
export function Campo({ rotulo, ajuda, erro, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] font-medium text-mx-text2">{rotulo}</span>
      {children}
      {ajuda && !erro && <span className="mt-1 block text-[12px] text-mx-text3">{ajuda}</span>}
      {erro && <span className="mt-1 block text-[12px] text-mx-bad">{erro}</span>}
    </label>
  );
}

export const classeInput = 'h-12 w-full rounded-xl border border-mx-line bg-mx-s1 px-3 text-[16px] text-mx-text placeholder:text-mx-text3 outline-none focus:border-mx-tealhi';

/** Monograma MM (marca Montex). */
export function Monograma({ tamanho = 32, className }) {
  return (
    <img
      src="/logo-montex.png"
      alt="Montex"
      width={tamanho}
      height={Math.round(tamanho * 0.75)}
      className={cn('object-contain', className)}
      style={{ width: tamanho, height: Math.round(tamanho * 0.75) }}
    />
  );
}
