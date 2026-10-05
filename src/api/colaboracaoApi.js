// ============================================================
// API da Fase 3 — tarefas, colaboração, notificações, automações, relatórios
// ============================================================
// Acesso DIRETO às tabelas (não passa pelo shim base44, que devolvia objetos
// falsos quando o insert falhava). Toda função LANÇA erro se o Supabase
// recusar — a tela deve mostrar o erro ao usuário.
// ============================================================

import { supabase } from './supabaseClient';

const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

async function todas(q, ordem = 'id', asc = true) {
  const out = [];
  for (let de = 0; de < 100000; de += 1000) {
    const { data, error } = await q().order(ordem, { ascending: asc }).range(de, de + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

// ---------------- TAREFAS ----------------
export const STATUS_TAREFA = ['pendente', 'em_andamento', 'bloqueada', 'concluida'];
export const PRIORIDADES = ['baixa', 'media', 'alta', 'urgente'];

/** Lista tarefas; obraIds null = todas (escopo Geral). */
export async function listarTarefas({ obraIds = null } = {}) {
  return todas(() => {
    let q = supabase.from('tarefas').select('*');
    if (obraIds) q = q.in('obra_id', obraIds);
    return q;
  }, 'created_at', false);
}

export async function criarTarefa(t) {
  const linha = {
    titulo: t.titulo, descricao: t.descricao || null, obra_id: t.obra_id || null,
    responsavel: t.responsavel || null, prioridade: t.prioridade || 'media', status: t.status || 'pendente',
    data_inicio: t.data_inicio || null, data_fim: t.data_fim || null, tags: t.tags || [],
    horas_estimadas: t.horas_estimadas ?? null, horas_realizadas: t.horas_realizadas ?? null,
    percentual: t.percentual ?? 0, dependencias: t.dependencias || [], observacoes: t.observacoes || null,
    origem: t.origem || 'manual', origem_ref: t.origem_ref || null,
  };
  return ok(await supabase.from('tarefas').insert(linha).select().single());
}

export async function atualizarTarefa(id, mudancas) {
  const m = { ...mudancas, updated_at: new Date().toISOString() };
  if (m.status === 'concluida' && !m.data_conclusao) { m.data_conclusao = new Date().toISOString().slice(0, 10); m.percentual = 100; }
  if (m.status && m.status !== 'concluida') m.data_conclusao = null;
  return ok(await supabase.from('tarefas').update(m).eq('id', id).select().single());
}

export async function excluirTarefa(id) {
  ok(await supabase.from('tarefas').delete().eq('id', id));
}

// ---------------- MURAL / COMENTÁRIOS ----------------
export async function listarMensagens({ obraId = null, tarefaId = null, limite = 200 } = {}) {
  let q = supabase.from('colaboracao_mensagens').select('*').order('created_at', { ascending: false }).limit(limite);
  if (tarefaId) q = q.eq('tarefa_id', tarefaId);
  else if (obraId) q = q.eq('obra_id', obraId).is('tarefa_id', null);
  else q = q.is('tarefa_id', null);
  return (ok(await q) || []).reverse();
}

export async function enviarMensagem({ obraId = null, tarefaId = null, texto, autorNome, anexoUrl = null, anexoNome = null }) {
  return ok(await supabase.from('colaboracao_mensagens').insert({
    obra_id: obraId, tarefa_id: tarefaId, texto, autor_nome: autorNome || null, anexo_url: anexoUrl, anexo_nome: anexoNome,
  }).select().single());
}

/** Realtime de uma tabela; retorna função para cancelar. */
export function ouvirTabela(tabela, aoMudar) {
  const canal = supabase.channel(`rt-${tabela}-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: tabela }, (p) => aoMudar(p))
    .subscribe();
  return () => { supabase.removeChannel(canal); };
}

// ---------------- NOTIFICAÇÕES ----------------
export async function listarNotificacoes({ limite = 100 } = {}) {
  const notifs = ok(await supabase.from('notificacoes').select('*').order('created_at', { ascending: false }).limit(limite)) || [];
  const ids = notifs.map((n) => n.id);
  let lidas = [];
  if (ids.length) lidas = ok(await supabase.from('notificacoes_lidas').select('notificacao_id').in('notificacao_id', ids)) || [];
  const set = new Set(lidas.map((l) => l.notificacao_id));
  return notifs.map((n) => ({ ...n, lida: set.has(n.id) }));
}

export async function marcarLidas(ids = []) {
  if (!ids.length) return;
  ok(await supabase.from('notificacoes_lidas').upsert(ids.map((id) => ({ notificacao_id: id })), { onConflict: 'notificacao_id,user_id', ignoreDuplicates: true }));
}

// ---------------- AUTOMAÇÕES ----------------
export const GATILHOS = {
  conta_vencendo: { rotulo: 'Conta a pagar vencendo', area: 'Financeiro', parametros: [{ chave: 'dias', rotulo: 'Dias de antecedência', padrao: 7 }] },
  conta_vencida: { rotulo: 'Conta a pagar vencida', area: 'Financeiro', parametros: [] },
  medicao_sem_recebimento: { rotulo: 'Medição sem recebimento', area: 'Financeiro', parametros: [{ chave: 'dias', rotulo: 'Dias desde a medição', padrao: 30 }] },
  peca_parada: { rotulo: 'Peça parada numa etapa', area: 'Produção', parametros: [{ chave: 'dias', rotulo: 'Dias parada', padrao: 14 }] },
  obra_sem_producao: { rotulo: 'Obra sem movimentação de produção', area: 'Produção', parametros: [{ chave: 'dias', rotulo: 'Dias sem movimentação', padrao: 7 }] },
  prazo_obra: { rotulo: 'Prazo da obra se aproximando', area: 'Obras', parametros: [{ chave: 'dias', rotulo: 'Dias antes do prazo', padrao: 15 }] },
  estoque_minimo: { rotulo: 'Estoque no mínimo', area: 'Suprimentos', parametros: [] },
};
export const TIPOS_ACAO = {
  notificar: 'Notificar no sistema',
  criar_tarefa: 'Criar tarefa',
  push: 'Push no celular (app iOS)',
};

export const listarAutomacoes = async () => ok(await supabase.from('automacoes').select('*').order('created_at', { ascending: true })) || [];
export const salvarAutomacao = async (a) => {
  const linha = { nome: a.nome, descricao: a.descricao || null, ativa: !!a.ativa, gatilho: a.gatilho, parametros: a.parametros || {}, acoes: a.acoes || [], obra_id: a.obra_id || null, updated_at: new Date().toISOString() };
  return a.id
    ? ok(await supabase.from('automacoes').update(linha).eq('id', a.id).select().single())
    : ok(await supabase.from('automacoes').insert(linha).select().single());
};
export const excluirAutomacao = async (id) => { ok(await supabase.from('automacoes').delete().eq('id', id)); };
export const listarLogAutomacoes = async ({ automacaoId = null, limite = 100 } = {}) => {
  let q = supabase.from('automacoes_log').select('*').order('executada_em', { ascending: false }).limit(limite);
  if (automacaoId) q = q.eq('automacao_id', automacaoId);
  return ok(await q) || [];
};

/** Executa no servidor: modo 'teste' (só simula) ou 'manual' (age). */
export async function executarAutomacoes({ modo = 'teste', automacaoId = null } = {}) {
  const { data, error } = await supabase.functions.invoke('motor-automacoes', { body: { modo, automacao_id: automacaoId } });
  if (error) {
    let msg = error.message;
    try { const c = await error.context?.json?.(); if (c?.erro) msg = c.erro; } catch { /* sem corpo */ }
    throw new Error(msg);
  }
  if (data?.erro) throw new Error(data.erro);
  return data;
}

// ---------------- RELATÓRIOS ----------------
export const listarHistoricoRelatorios = async ({ limite = 100 } = {}) => ok(await supabase.from('relatorios_historico').select('*').order('created_at', { ascending: false }).limit(limite)) || [];
export const obterHistoricoRelatorio = async (id) => ok(await supabase.from('relatorios_historico').select('*').eq('id', id).maybeSingle());
export const registrarRelatorio = async (r) => ok(await supabase.from('relatorios_historico').insert({
  tipo: r.tipo, titulo: r.titulo, obra_id: r.obra_id || null, escopo_rotulo: r.escopo_rotulo || null, formato: r.formato || null,
  origem: 'manual', parametros: r.parametros || null, resumo: r.resumo || null, gerado_por_nome: r.gerado_por_nome || null,
}).select().single());
export const listarAgendamentos = async () => ok(await supabase.from('relatorios_agendamentos').select('*').order('created_at', { ascending: true })) || [];
export const salvarAgendamento = async (a) => {
  const linha = { nome: a.nome, tipo: a.tipo, obra_id: a.obra_id || null, frequencia: a.frequencia, dia_semana: a.dia_semana ?? null, dia_mes: a.dia_mes ?? null, hora: a.hora ?? 7, ativo: !!a.ativo, destino_role: a.destino_role || null };
  return a.id
    ? ok(await supabase.from('relatorios_agendamentos').update(linha).eq('id', a.id).select().single())
    : ok(await supabase.from('relatorios_agendamentos').insert(linha).select().single());
};
export const excluirAgendamento = async (id) => { ok(await supabase.from('relatorios_agendamentos').delete().eq('id', id)); };
