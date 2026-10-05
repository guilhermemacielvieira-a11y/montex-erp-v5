// ============================================================
// useTarefas — tarefas reais (tabela `tarefas`) no escopo do topo
// ============================================================
// - Carrega via listarTarefas({ obraIds: obraIdsEscopo }) (paginado).
// - Realtime: ouvirTabela('tarefas') aplica INSERT/UPDATE/DELETE no estado
//   (deduplicado por id — evita o bug histórico #6).
// - Ações criar/atualizar/excluir são OTIMISTAS: a tela muda na hora e,
//   se o Supabase recusar, volta ao estado anterior e mostra toast com o
//   erro real (nunca finge sucesso). As ações relançam o erro.
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useObras } from '@/contexts/ERPContext';
import {
  listarTarefas, criarTarefa, atualizarTarefa, excluirTarefa, ouvirTabela,
} from '@/api/colaboracaoApi';

const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Aplica no cliente as mesmas regras do atualizarTarefa (para o otimismo). */
function aplicarMudancas(t, m) {
  const out = { ...t, ...m, updated_at: new Date().toISOString() };
  if (m.status === 'concluida' && !m.data_conclusao) { out.data_conclusao = t.data_conclusao || hojeISO(); out.percentual = 100; }
  if (m.status && m.status !== 'concluida') out.data_conclusao = null;
  return out;
}

const ordenar = (lista) => [...lista].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

export function useTarefas() {
  const { obraIdsEscopo } = useObras();
  const [tarefas, setTarefas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const escopoRef = useRef(obraIdsEscopo);
  escopoRef.current = obraIdsEscopo;
  const chaveEscopo = obraIdsEscopo ? obraIdsEscopo.join(',') : '*';

  const noEscopo = useCallback((t) => {
    const ids = escopoRef.current;
    return !ids || ids.includes(t?.obra_id);
  }, []);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const lista = await listarTarefas({ obraIds: escopoRef.current });
      setTarefas(lista || []);
      setErro(null);
    } catch (e) {
      setErro(e.message || String(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  // Recarrega ao trocar o escopo do topo
  useEffect(() => { recarregar(); }, [chaveEscopo, recarregar]);

  // Realtime
  useEffect(() => {
    const parar = ouvirTabela('tarefas', (p) => {
      const ev = p?.eventType;
      if (ev === 'DELETE') {
        const id = p.old?.id;
        if (id !== undefined && id !== null) setTarefas((prev) => prev.filter((t) => t.id !== id));
        return;
      }
      const row = p?.new;
      if (!row || row.id === undefined || row.id === null) return;
      setTarefas((prev) => {
        const sem = prev.filter((t) => t.id !== row.id);
        if (!noEscopo(row)) return sem;
        const existia = sem.length !== prev.length;
        if (existia) return prev.map((t) => (t.id === row.id ? row : t));
        return ordenar([row, ...sem]);
      });
    });
    return parar;
  }, [noEscopo]);

  const criar = useCallback(async (dados, { silencioso = false } = {}) => {
    const tmpId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const agora = new Date().toISOString();
    const otimista = { percentual: 0, tags: [], dependencias: [], origem: 'manual', ...dados, id: tmpId, created_at: agora, updated_at: agora, _pendente: true };
    setTarefas((prev) => [otimista, ...prev]);
    try {
      const salva = await criarTarefa(dados);
      setTarefas((prev) => {
        const sem = prev.filter((t) => t.id !== tmpId && t.id !== salva.id);
        return noEscopo(salva) ? ordenar([salva, ...sem]) : sem;
      });
      if (!silencioso && !noEscopo(salva)) toast.info('Tarefa criada, mas ela está fora do escopo de obra selecionado no topo.');
      return salva;
    } catch (e) {
      setTarefas((prev) => prev.filter((t) => t.id !== tmpId));
      if (!silencioso) toast.error(`Não foi possível criar a tarefa: ${e.message}`);
      throw e;
    }
  }, [noEscopo]);

  const atualizar = useCallback(async (id, mudancas, { silencioso = false } = {}) => {
    let anterior = null;
    setTarefas((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      anterior = t;
      return aplicarMudancas(t, mudancas);
    }));
    try {
      const salva = await atualizarTarefa(id, mudancas);
      setTarefas((prev) => {
        if (!noEscopo(salva)) return prev.filter((t) => t.id !== id);
        return prev.map((t) => (t.id === id ? salva : t));
      });
      return salva;
    } catch (e) {
      if (anterior) {
        const volta = anterior;
        setTarefas((prev) => prev.map((t) => (t.id === id ? volta : t)));
      }
      if (!silencioso) toast.error(`Não foi possível salvar a tarefa: ${e.message}`);
      throw e;
    }
  }, [noEscopo]);

  const excluir = useCallback(async (id, { silencioso = false } = {}) => {
    let anterior = null;
    let indice = -1;
    setTarefas((prev) => {
      indice = prev.findIndex((t) => t.id === id);
      anterior = indice >= 0 ? prev[indice] : null;
      return prev.filter((t) => t.id !== id);
    });
    try {
      await excluirTarefa(id);
    } catch (e) {
      if (anterior) {
        const volta = anterior;
        setTarefas((prev) => (prev.some((t) => t.id === id) ? prev : ordenar([volta, ...prev])));
      }
      if (!silencioso) toast.error(`Não foi possível excluir a tarefa: ${e.message}`);
      throw e;
    }
  }, []);

  /** Ações em massa: devolve { ok, falhas:[{id, erro}] } e mostra um toast-resumo. */
  const atualizarVarias = useCallback(async (ids, mudancas) => {
    const res = await Promise.allSettled(ids.map((id) => atualizar(id, mudancas, { silencioso: true })));
    const falhas = res.map((r, i) => (r.status === 'rejected' ? { id: ids[i], erro: r.reason?.message } : null)).filter(Boolean);
    if (falhas.length) toast.error(`${falhas.length} de ${ids.length} tarefa(s) não foram salvas: ${falhas[0].erro}`);
    else toast.success(`${ids.length} tarefa(s) atualizada(s).`);
    return { ok: ids.length - falhas.length, falhas };
  }, [atualizar]);

  const excluirVarias = useCallback(async (ids) => {
    const res = await Promise.allSettled(ids.map((id) => excluir(id, { silencioso: true })));
    const falhas = res.map((r, i) => (r.status === 'rejected' ? { id: ids[i], erro: r.reason?.message } : null)).filter(Boolean);
    if (falhas.length) toast.error(`${falhas.length} de ${ids.length} tarefa(s) não foram excluídas: ${falhas[0].erro}`);
    else toast.success(`${ids.length} tarefa(s) excluída(s).`);
    return { ok: ids.length - falhas.length, falhas };
  }, [excluir]);

  return { tarefas, carregando, erro, recarregar, criar, atualizar, excluir, atualizarVarias, excluirVarias };
}

export default useTarefas;
