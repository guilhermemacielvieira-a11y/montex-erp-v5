// ============================================================
// useCopiloto — conversa com o Copiloto MONTEX (loop de ferramentas)
// ============================================================
// Loop manual e APPEND-ONLY: o histórico enviado à API nunca é editado
// (a API valida blocos de raciocínio contra o histórico). A resposta do
// assistente é anexada exatamente como veio; ferramentas pedidas são
// executadas no navegador (copilotoTools) e TODOS os tool_result voltam numa
// única mensagem do usuário.
// Conversas ficam no localStorage deste navegador.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { chamarIA, textoDe } from '../services/ia/iaClient';
import { ROTULO_FERRAMENTA } from '../services/ia/copilotoTools';

const LS_KEY = 'montex_copiloto_conversas_v1';
const MAX_RODADAS = 8;
const MAX_PERSIST_BYTES = 3 * 1024 * 1024;

const ler = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') || []; } catch { return []; } };
const gravar = (lista) => {
  // Conversas com anexos grandes não cabem no localStorage: guarda só as que cabem.
  const cabem = [];
  let total = 0;
  for (const c of lista) {
    const tam = JSON.stringify(c).length;
    if (total + tam > MAX_PERSIST_BYTES) continue;
    total += tam; cabem.push(c);
  }
  try { localStorage.setItem(LS_KEY, JSON.stringify(cabem)); } catch { /* cota cheia */ }
};
const novoId = () => `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Converte o histórico da API em bolhas para a tela. */
export function mensagensParaTela(apiMessages = []) {
  const out = [];
  apiMessages.forEach((m, i) => {
    if (m.role === 'user') {
      const blocos = Array.isArray(m.content) ? m.content : [{ type: 'text', text: String(m.content) }];
      if (blocos.every((b) => b.type === 'tool_result')) return; // resultado de ferramenta: não é fala do usuário
      const texto = blocos.filter((b) => b.type === 'text' && !b.text.startsWith('<contexto>')).map((b) => b.text).join('\n');
      const anexos = blocos.filter((b) => b.type === 'document' || b.type === 'image').map((b) => b.title || (b.type === 'image' ? 'imagem' : 'documento'));
      out.push({ id: `u${i}`, papel: 'usuario', texto, anexos });
    } else if (m.role === 'assistant') {
      const blocos = Array.isArray(m.content) ? m.content : [];
      const ferramentas = blocos.filter((b) => b.type === 'tool_use').map((b) => ROTULO_FERRAMENTA[b.name] || b.name);
      const texto = textoDe(blocos);
      const ultimo = out[out.length - 1];
      // Agrupa as rodadas de ferramenta + resposta final numa única bolha
      if (ultimo && ultimo.papel === 'assistente' && !ultimo.fechada) {
        ultimo.ferramentas.push(...ferramentas);
        if (texto) ultimo.texto = ultimo.texto ? `${ultimo.texto}\n\n${texto}` : texto;
        ultimo.fechada = !blocos.some((b) => b.type === 'tool_use');
      } else {
        out.push({ id: `a${i}`, papel: 'assistente', texto, ferramentas, fechada: !blocos.some((b) => b.type === 'tool_use') });
      }
    }
  });
  return out;
}

/**
 * @param obterExecutor () => (nome, entrada) => resultado  (dados atuais do ERP)
 * @param obterContexto () => string  (escopo/hoje/usuário — vai como bloco <contexto>)
 */
export function useCopiloto({ obterExecutor, obterContexto }) {
  const [conversas, setConversas] = useState(ler);
  const [atualId, setAtualId] = useState(() => ler()[0]?.id || null);
  const [enviando, setEnviando] = useState(false);
  const [etapa, setEtapa] = useState(null);
  const [erro, setErro] = useState(null);
  const cancelarRef = useRef(false);

  useEffect(() => { gravar(conversas); }, [conversas]);

  const atual = useMemo(() => conversas.find((c) => c.id === atualId) || null, [conversas, atualId]);
  const mensagens = useMemo(() => mensagensParaTela(atual?.apiMessages || []), [atual]);

  const atualizarConversa = useCallback((id, fn) => {
    setConversas((lista) => lista.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  const novaConversa = useCallback(() => { setAtualId(null); setErro(null); }, []);
  const abrir = useCallback((id) => { setAtualId(id); setErro(null); }, []);
  const excluir = useCallback((id) => {
    setConversas((lista) => lista.filter((c) => c.id !== id));
    setAtualId((cur) => (cur === id ? null : cur));
  }, []);
  const cancelar = useCallback(() => { cancelarRef.current = true; }, []);

  const enviar = useCallback(async (texto, anexos = []) => {
    const t = String(texto || '').trim();
    if ((!t && !anexos.length) || enviando) return;
    setErro(null); setEnviando(true); setEtapa('Pensando');
    cancelarRef.current = false;

    let id = atualId;
    let historico = atual?.apiMessages ? [...atual.apiMessages] : [];
    if (!id) {
      id = novoId();
      const titulo = (t || anexos[0]?.title || 'Nova conversa').slice(0, 60);
      setConversas((lista) => [{ id, titulo, criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString(), apiMessages: [] }, ...lista]);
      setAtualId(id);
    }

    const conteudo = [
      { type: 'text', text: `<contexto>${obterContexto()}</contexto>` },
      ...anexos,
      ...(t ? [{ type: 'text', text: t }] : [{ type: 'text', text: 'Analise o documento anexado.' }]),
    ];
    historico = [...historico, { role: 'user', content: conteudo }];
    const salvar = (msgs) => atualizarConversa(id, (c) => ({ ...c, apiMessages: msgs, atualizadaEm: new Date().toISOString() }));
    salvar(historico);

    try {
      for (let rodada = 0; rodada < MAX_RODADAS; rodada += 1) {
        if (cancelarRef.current) throw new Error('Consulta cancelada.');
        const r = await chamarIA({ modo: 'chat', messages: historico });
        historico = [...historico, { role: 'assistant', content: r.content }];
        salvar(historico);

        if (r.stop_reason === 'pause_turn') continue;
        if (r.stop_reason !== 'tool_use') {
          if (r.stop_reason === 'max_tokens') setErro('A resposta ficou longa demais e foi cortada. Peça um recorte menor.');
          break;
        }
        const pedidos = (r.content || []).filter((b) => b.type === 'tool_use');
        setEtapa(pedidos.map((p) => ROTULO_FERRAMENTA[p.name] || p.name).join(' · '));
        const executar = obterExecutor();
        const resultados = pedidos.map((p) => {
          const res = executar(p.name, p.input);
          return { type: 'tool_result', tool_use_id: p.id, content: JSON.stringify(res), ...(res?.erro ? { is_error: true } : {}) };
        });
        historico = [...historico, { role: 'user', content: resultados }];
        salvar(historico);
        setEtapa('Escrevendo a resposta');
        if (rodada === MAX_RODADAS - 1) setErro('A pergunta exigiu consultas demais. Tente dividir em partes.');
      }
    } catch (e) {
      setErro(e?.message || 'Falha ao consultar a IA.');
    } finally {
      setEnviando(false); setEtapa(null);
    }
  }, [atual, atualId, enviando, obterContexto, obterExecutor, atualizarConversa]);

  return { conversas, atual, atualId, mensagens, enviando, etapa, erro, enviar, novaConversa, abrir, excluir, cancelar };
}
