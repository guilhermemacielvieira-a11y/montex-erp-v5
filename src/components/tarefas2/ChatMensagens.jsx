import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Send, Paperclip, X, Loader2, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { listarMensagens, enviarMensagem, ouvirTabela } from '@/api/colaboracaoApi';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { fmtDataHora, CLS_BTN, CLS_BTN_PRIM, CLS_INPUT } from './tarefasUi';

const TAMANHO_MAX = 20 * 1024 * 1024;

/**
 * Lista + envio de mensagens (colaboracao_mensagens) com realtime.
 * - tarefaId → comentários da tarefa
 * - obraId (sem tarefaId) → mural da obra
 */
export default function ChatMensagens({ obraId = null, tarefaId = null, autorNome, permitirAnexo = false, vazio = 'Nenhuma mensagem ainda.', className, alturaMax = 'max-h-[50vh]' }) {
  const [mensagens, setMensagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const listaRef = useRef(null);
  const arquivoRef = useRef(null);

  const carregar = async () => {
    setCarregando(true);
    try {
      setMensagens(await listarMensagens({ obraId, tarefaId }));
      setErro(null);
    } catch (e) {
      setErro(e.message || String(e));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    let vivo = true;
    setMensagens([]); setCarregando(true); setErro(null);
    listarMensagens({ obraId, tarefaId })
      .then((l) => { if (vivo) { setMensagens(l); setErro(null); } })
      .catch((e) => { if (vivo) setErro(e.message || String(e)); })
      .finally(() => { if (vivo) setCarregando(false); });

    const pertence = (m) => {
      if (!m) return false;
      if (tarefaId) return String(m.tarefa_id) === String(tarefaId);
      if (m.tarefa_id) return false;
      return obraId ? m.obra_id === obraId : !m.obra_id;
    };
    const parar = ouvirTabela('colaboracao_mensagens', (p) => {
      if (!vivo) return;
      if (p.eventType === 'DELETE') { setMensagens((prev) => prev.filter((m) => m.id !== p.old?.id)); return; }
      const m = p.new;
      if (!pertence(m)) return;
      setMensagens((prev) => (prev.some((x) => x.id === m.id) ? prev.map((x) => (x.id === m.id ? m : x)) : [...prev, m]));
    });
    return () => { vivo = false; parar(); };
  }, [obraId, tarefaId]);

  useEffect(() => { const el = listaRef.current; if (el) el.scrollTop = el.scrollHeight; }, [mensagens.length]);

  const escolherArquivo = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > TAMANHO_MAX) { toast.error('Arquivo maior que 20 MB.'); return; }
    setArquivo(f);
  };

  const enviar = async (e) => {
    e?.preventDefault();
    const t = texto.trim();
    if (!t && !arquivo) return;
    setEnviando(true);
    try {
      let anexoUrl = null; let anexoNome = null;
      if (arquivo) {
        try {
          const r = await base44.integrations.Core.UploadFile({ file: arquivo });
          if (!r?.file_url) throw new Error('o servidor não devolveu o endereço do arquivo');
          anexoUrl = r.file_url; anexoNome = arquivo.name;
        } catch (err) {
          toast.error(`Falha ao enviar o anexo: ${err.message || err}. A mensagem não foi enviada.`);
          return;
        }
      }
      const nova = await enviarMensagem({ obraId, tarefaId, texto: t || (anexoNome ? `Anexo: ${anexoNome}` : ''), autorNome, anexoUrl, anexoNome });
      setMensagens((prev) => (prev.some((x) => x.id === nova.id) ? prev : [...prev, nova]));
      setTexto(''); setArquivo(null);
    } catch (err) {
      toast.error(`Não foi possível enviar: ${err.message || err}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {erro && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">Erro ao carregar mensagens: {erro}</span>
          <button type="button" onClick={carregar} className="inline-flex items-center gap-1 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
            <RefreshCw className="h-3 w-3" aria-hidden /> Tentar de novo
          </button>
        </div>
      )}

      <div ref={listaRef} className={cn('space-y-2 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 p-2', alturaMax)} aria-live="polite" aria-label="Mensagens">
        {carregando && <p className="flex items-center gap-2 py-4 text-[11px] text-slate-400"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando…</p>}
        {!carregando && !erro && mensagens.length === 0 && <p className="py-4 text-center text-[11px] text-slate-500">{vazio}</p>}
        {mensagens.map((m) => {
          const minha = autorNome && m.autor_nome === autorNome;
          return (
            <div key={m.id} className={cn('rounded-lg border px-3 py-2', minha ? 'border-sky-500/30 bg-sky-500/10' : 'border-slate-800 bg-slate-900/80')}>
              <div className="flex flex-wrap items-baseline gap-x-2 text-[11px]">
                <span className="font-semibold text-slate-200">{m.autor_nome || 'Usuário'}</span>
                <span className="text-slate-500">{fmtDataHora(m.created_at)}</span>
              </div>
              {m.texto && <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-slate-100">{m.texto}</p>}
              {m.anexo_url && (
                <a href={m.anexo_url} target="_blank" rel="noopener noreferrer"
                  className="mt-1 inline-flex max-w-full items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[11px] text-sky-200 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{m.anexo_nome || 'Abrir anexo'}</span>
                </a>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={enviar} className="space-y-1.5">
        {arquivo && (
          <div className="flex items-center gap-2 rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-200">
            <Paperclip className="h-3.5 w-3.5" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{arquivo.name}</span>
            <button type="button" onClick={() => setArquivo(null)} aria-label="Remover anexo" className="rounded text-slate-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            rows={2}
            placeholder="Escreva uma mensagem (Enter envia, Shift+Enter quebra linha)"
            aria-label="Nova mensagem"
            className={cn(CLS_INPUT, 'h-auto min-w-0 flex-1 resize-none py-2')}
          />
          {permitirAnexo && (
            <>
              <input ref={arquivoRef} type="file" className="hidden" onChange={escolherArquivo} />
              <button type="button" className={CLS_BTN} onClick={() => arquivoRef.current?.click()} disabled={enviando} aria-label="Anexar arquivo">
                <Paperclip className="h-4 w-4" aria-hidden />
              </button>
            </>
          )}
          <button type="submit" className={CLS_BTN_PRIM} disabled={enviando || (!texto.trim() && !arquivo)} aria-label="Enviar mensagem">
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </form>
    </div>
  );
}
