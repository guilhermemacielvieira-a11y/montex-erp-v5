// ============================================================
// ComposerCopiloto — caixa de mensagem do Copiloto MONTEX
// ============================================================
// Textarea autoexpansível (Enter envia, Shift+Enter quebra linha), anexos
// PDF/imagem (até 3, validados por blocoAnexo) e botão enviar/parar.
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Loader2, Paperclip, SendHorizontal, Square, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { blocoAnexo, MAX_ANEXO_MB } from '@/services/ia/iaClient';

const MAX_ANEXOS = 3;
const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp';
const ALTURA_MAX = 200;

export default function ComposerCopiloto({ onEnviar, onCancelar, enviando, placeholder }) {
  const [texto, setTexto] = useState('');
  const [anexos, setAnexos] = useState([]); // { id, nome, tipo, bloco }
  const [lendo, setLendo] = useState(false);
  const taRef = useRef(null);
  const fileRef = useRef(null);

  // Autoexpansão
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, ALTURA_MAX)}px`;
    ta.style.overflowY = ta.scrollHeight > ALTURA_MAX ? 'auto' : 'hidden';
  }, [texto]);

  // Volta o foco ao terminar a resposta
  useEffect(() => { if (!enviando) taRef.current?.focus(); }, [enviando]);

  const podeEnviar = !enviando && !lendo && (texto.trim().length > 0 || anexos.length > 0);

  const enviar = useCallback(() => {
    if (!podeEnviar) return;
    onEnviar(texto, anexos.map((a) => a.bloco));
    setTexto('');
    setAnexos([]);
  }, [podeEnviar, onEnviar, texto, anexos]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      enviar();
    }
  };

  const onArquivos = async (e) => {
    const arquivos = Array.from(e.target.files || []);
    e.target.value = '';
    if (!arquivos.length) return;
    const vagas = MAX_ANEXOS - anexos.length;
    if (vagas <= 0) { toast.error(`Máximo de ${MAX_ANEXOS} anexos por mensagem.`); return; }
    if (arquivos.length > vagas) toast.error(`Máximo de ${MAX_ANEXOS} anexos por mensagem — ${arquivos.length - vagas} ignorado(s).`);
    setLendo(true);
    const novos = [];
    for (const f of arquivos.slice(0, vagas)) {
      try {
        const bloco = await blocoAnexo(f);
        novos.push({ id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 6)}`, nome: f.name, tipo: bloco.type, bloco });
      } catch (err) {
        toast.error(`${f.name}: ${err?.message || 'arquivo inválido.'}`);
      }
    }
    setLendo(false);
    if (novos.length) setAnexos((lista) => [...lista, ...novos].slice(0, MAX_ANEXOS));
    taRef.current?.focus();
  };

  const remover = (id) => setAnexos((lista) => lista.filter((a) => a.id !== id));

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-2 shadow-lg focus-within:border-orange-500/60">
      {anexos.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5 px-1" aria-label="Anexos selecionados">
          {anexos.map((a) => (
            <li key={a.id} className="inline-flex max-w-[240px] items-center gap-1.5 rounded-lg bg-slate-800 py-1 pl-2 pr-1 text-[11px] text-slate-200 ring-1 ring-slate-700">
              {a.tipo === 'image' ? <ImageIcon className="h-3.5 w-3.5 shrink-0 text-blue-400" aria-hidden="true" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-orange-400" aria-hidden="true" />}
              <span className="truncate">{a.nome}</span>
              <button
                type="button"
                onClick={() => remover(a.id)}
                aria-label={`Remover anexo ${a.nome}`}
                className="rounded p-0.5 text-slate-400 hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-1.5">
        <input ref={fileRef} type="file" accept={ACCEPT} multiple className="hidden" onChange={onArquivos} tabIndex={-1} aria-hidden="true" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={enviando || lendo || anexos.length >= MAX_ANEXOS}
          aria-label={`Anexar PDF ou imagem (até ${MAX_ANEXOS}, ${MAX_ANEXO_MB} MB cada)`}
          title={`Anexar PDF ou foto de nota (até ${MAX_ANEXOS}, ${MAX_ANEXO_MB} MB cada)`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {lendo ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Paperclip className="h-5 w-5" aria-hidden="true" />}
        </button>

        <label htmlFor="copiloto-mensagem" className="sr-only">Mensagem para o Copiloto</label>
        <textarea
          id="copiloto-mensagem"
          ref={taRef}
          rows={1}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder || 'Pergunte sobre obras, produção, financeiro, estoque…'}
          className="max-h-[200px] min-h-[40px] flex-1 resize-none bg-transparent px-1.5 py-2.5 text-[14px] leading-5 text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />

        {enviando ? (
          <button
            type="button"
            onClick={onCancelar}
            aria-label="Parar consulta"
            title="Parar"
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-slate-700 px-3 text-[12px] font-medium text-white transition-colors hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
            <span className="hidden sm:inline">Parar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={enviar}
            disabled={!podeEnviar}
            aria-label="Enviar mensagem"
            title="Enviar (Enter)"
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300',
              podeEnviar ? 'bg-orange-500 text-white hover:bg-orange-600' : 'cursor-not-allowed bg-slate-800 text-slate-500',
            )}
          >
            <SendHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="mt-1 hidden px-2 text-[11px] text-slate-500 sm:block">
        Enter envia · Shift+Enter quebra linha · Anexe PDF ou foto de nota fiscal para análise
      </p>
    </div>
  );
}
