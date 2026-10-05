// ============================================================
// MensagemCopiloto — bolha de conversa do Copiloto MONTEX
// ============================================================
// Usuário: texto + chips de anexos. Assistente: markdown (react-markdown,
// sem HTML cru) + chips "Consultou: …" + botão copiar.
// remark-gfm não está instalado: tabelas GFM são detectadas aqui e
// renderizadas como <table> (células passam pelo mesmo markdown inline).
// ============================================================

import React, { memo, useCallback, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, Check, Copy, FileText, Image as ImageIcon, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ROTULO_FERRAMENTA } from '@/services/ia/copilotoTools';

// Rótulo de ação ("Analisando a produção") → nome curto da fonte ("Produção")
const CURTO_POR_FERRAMENTA = {
  resumo_executivo: 'Resumo executivo',
  listar_obras: 'Obras',
  detalhar_obra: 'Obra',
  producao: 'Produção',
  buscar_pecas: 'Peças',
  financeiro: 'Financeiro',
  lancamentos: 'Lançamentos',
  estoque: 'Estoque',
  alertas: 'Alertas',
};
const CURTO_POR_ROTULO = Object.fromEntries(
  Object.entries(ROTULO_FERRAMENTA).map(([k, rot]) => [rot, CURTO_POR_FERRAMENTA[k] || rot]),
);

export function fontesConsultadas(ferramentas = []) {
  return [...new Set((ferramentas || []).map((f) => CURTO_POR_ROTULO[f] || CURTO_POR_FERRAMENTA[f] || f))];
}

// ---------- Markdown ----------
const mdComponents = {
  p: ({ children }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
  h1: ({ children }) => <h3 className="mt-3 mb-1.5 text-base font-semibold text-white">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-3 mb-1.5 text-[15px] font-semibold text-white">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 mb-1 text-sm font-semibold text-slate-100">{children}</h4>,
  h4: ({ children }) => <h4 className="mt-2 mb-1 text-sm font-semibold text-slate-200">{children}</h4>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-orange-400">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-slate-400">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
  blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-orange-500/60 pl-3 text-slate-300">{children}</blockquote>,
  hr: () => <hr className="my-3 border-slate-700" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2 hover:text-blue-300">
      {children}
    </a>
  ),
  code: ({ children, className }) => (
    <code className={cn('rounded bg-slate-950/70 px-1 py-0.5 font-mono text-[12px] text-orange-200', className)}>{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg border border-slate-700 bg-slate-950/70 p-3 text-[12px] [&_code]:bg-transparent [&_code]:p-0">{children}</pre>
  ),
  img: ({ alt }) => <span className="text-slate-400">[imagem: {alt || 'sem descrição'}]</span>,
};
const mdInline = { ...mdComponents, p: ({ children }) => <>{children}</> };

const ehLinhaTabela = (l) => /^\s*\|.*\|\s*$/.test(l);
const celulas = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const ehSeparador = (l) => l.includes('-') && /^\s*\|?[\s|:-]+\|?\s*$/.test(l) && celulas(l).every((c) => /^:?-+:?$/.test(c));

/** Divide o markdown em trechos de texto e tabelas GFM. */
export function separarTabelas(md = '') {
  const linhas = String(md).split('\n');
  const partes = [];
  let buffer = [];
  const flush = () => { if (buffer.length) { partes.push({ tipo: 'md', texto: buffer.join('\n') }); buffer = []; } };
  for (let i = 0; i < linhas.length; i += 1) {
    if (ehLinhaTabela(linhas[i]) && i + 1 < linhas.length && ehSeparador(linhas[i + 1])) {
      flush();
      const cab = celulas(linhas[i]);
      const alinh = celulas(linhas[i + 1]).map((s) => (s.endsWith(':') && s.startsWith(':') ? 'center' : s.endsWith(':') ? 'right' : 'left'));
      const corpo = [];
      i += 2;
      while (i < linhas.length && ehLinhaTabela(linhas[i])) { corpo.push(celulas(linhas[i])); i += 1; }
      i -= 1;
      partes.push({ tipo: 'tabela', cab, alinh, corpo });
    } else {
      buffer.push(linhas[i]);
    }
  }
  flush();
  return partes;
}

const Inline = ({ texto }) => <ReactMarkdown components={mdInline}>{texto}</ReactMarkdown>;

function TabelaMd({ cab, alinh, corpo }) {
  return (
    <div className="my-2 max-w-full overflow-x-auto rounded-lg border border-slate-700">
      <table className="w-full border-collapse text-[12px]">
        <thead className="bg-slate-800/80">
          <tr>
            {cab.map((c, i) => (
              <th key={i} scope="col" className="whitespace-nowrap border-b border-slate-700 px-2.5 py-1.5 font-semibold text-slate-200" style={{ textAlign: alinh[i] || 'left' }}>
                <Inline texto={c} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {corpo.map((linha, r) => (
            <tr key={r} className="odd:bg-slate-900/40">
              {cab.map((_, i) => (
                <td key={i} className="border-b border-slate-800 px-2.5 py-1.5 text-slate-300" style={{ textAlign: alinh[i] || 'left' }}>
                  <Inline texto={linha[i] ?? ''} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarkdownCopiloto({ texto }) {
  const partes = useMemo(() => separarTabelas(texto), [texto]);
  return (
    <div className="min-w-0 break-words text-[13px] text-slate-200">
      {partes.map((p, i) => (p.tipo === 'tabela'
        ? <TabelaMd key={i} {...p} />
        : <ReactMarkdown key={i} components={mdComponents}>{p.texto}</ReactMarkdown>))}
    </div>
  );
}

// ---------- Bolha ----------
function MensagemCopiloto({ mensagem }) {
  const ehUsuario = mensagem.papel === 'usuario';
  const [copiado, setCopiado] = useState(false);
  const fontes = useMemo(() => fontesConsultadas(mensagem.ferramentas), [mensagem.ferramentas]);

  const copiar = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mensagem.texto || '');
      setCopiado(true);
      toast.success('Resposta copiada');
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      toast.error('Não foi possível copiar a resposta.');
    }
  }, [mensagem.texto]);

  if (!ehUsuario && !mensagem.texto && !fontes.length) return null;

  return (
    <div className={cn('flex gap-2.5 sm:gap-3', ehUsuario ? 'flex-row-reverse' : 'flex-row')}>
      <div
        aria-hidden="true"
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
          ehUsuario ? 'bg-slate-700' : 'bg-gradient-to-br from-orange-500 to-orange-700',
        )}
      >
        {ehUsuario ? <User className="h-4 w-4 text-slate-200" /> : <Bot className="h-4 w-4 text-white" />}
      </div>

      <div className={cn('flex min-w-0 max-w-[88%] flex-col sm:max-w-[80%]', ehUsuario ? 'items-end' : 'items-start')}>
        <span className="sr-only">{ehUsuario ? 'Você disse:' : 'Copiloto respondeu:'}</span>
        <div
          className={cn(
            'min-w-0 max-w-full rounded-2xl px-3.5 py-2.5',
            ehUsuario
              ? 'rounded-tr-sm bg-blue-600/25 text-slate-100 ring-1 ring-blue-500/30'
              : 'rounded-tl-sm bg-slate-800/70 ring-1 ring-slate-700/70',
          )}
        >
          {ehUsuario ? (
            <>
              {mensagem.texto && <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{mensagem.texto}</p>}
              {mensagem.anexos?.length > 0 && (
                <ul className={cn('flex flex-wrap gap-1.5', mensagem.texto && 'mt-2')} aria-label="Anexos">
                  {mensagem.anexos.map((a, i) => (
                    <li key={i} className="inline-flex max-w-[220px] items-center gap-1 rounded-md bg-slate-900/60 px-2 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-700">
                      {a === 'imagem' ? <ImageIcon className="h-3 w-3 shrink-0" aria-hidden="true" /> : <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />}
                      <span className="truncate">{a}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : mensagem.texto ? (
            <MarkdownCopiloto texto={mensagem.texto} />
          ) : (
            <p className="text-[12px] italic text-slate-400">Consultando dados do ERP…</p>
          )}
        </div>

        {!ehUsuario && (fontes.length > 0 || mensagem.texto) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 px-1">
            {fontes.length > 0 && (
              <span className="text-[11px] text-slate-500">
                Consultou: <span className="text-slate-400">{fontes.join(' · ')}</span>
              </span>
            )}
            {mensagem.texto && (
              <button
                type="button"
                onClick={copiar}
                aria-label="Copiar resposta"
                title="Copiar resposta"
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                {copiado ? <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MensagemCopiloto);
