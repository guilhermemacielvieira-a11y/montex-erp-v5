// ============================================================
// Cliente da Edge Function `ia-copiloto` (Claude via Supabase)
// ============================================================
// A chave da IA NUNCA fica no navegador: tudo passa pela Edge Function, que
// exige usuário logado, aplica limite diário e registra o uso (ia_uso).
// ============================================================

import { supabase } from '../../api/supabaseClient';

/** Chama a função. Retorna { content, stop_reason, usage, modelo } ou lança Error(msg amigável). */
export async function chamarIA(corpo) {
  const { data, error } = await supabase.functions.invoke('ia-copiloto', { body: corpo });
  if (error) {
    let msg = error.message || 'Falha ao contatar a IA.';
    try {
      const ctx = await error.context?.json?.();
      if (ctx?.erro) msg = ctx.erro;
    } catch { /* corpo não-JSON */ }
    if (/Failed to send|Failed to fetch|NetworkError/i.test(msg)) msg = 'Sem conexão com o servidor de IA. Verifique a internet ou se a função ia-copiloto está publicada.';
    throw new Error(msg);
  }
  if (data?.erro) throw new Error(data.erro);
  return data;
}

/** Extrai o texto final de um content[] da API. */
export function textoDe(content = []) {
  return (content || []).filter((b) => b?.type === 'text').map((b) => b.text).join('\n').trim();
}

/** Análise executiva estruturada (Insights IA). */
export async function gerarInsights({ snapshot, foco }) {
  const r = await chamarIA({ modo: 'insights', snapshot, foco });
  const txt = textoDe(r.content);
  try { return { analise: JSON.parse(txt), modelo: r.modelo, usage: r.usage }; } catch {
    throw new Error('A IA respondeu em formato inesperado. Tente gerar de novo.');
  }
}

/** Prompt simples (texto) ou estruturado (schema JSON) — usado pelo shim InvokeLLM. */
export async function promptIA(prompt, schema = null) {
  const r = await chamarIA({ modo: 'prompt', prompt, schema });
  const txt = textoDe(r.content);
  if (!schema) return txt;
  try { return JSON.parse(txt); } catch { throw new Error('A IA respondeu em formato inesperado.'); }
}

/** Lê um File como base64 (sem o prefixo data:). */
export function arquivoParaBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] || '');
    r.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    r.readAsDataURL(file);
  });
}

export const TIPOS_ANEXO = {
  'application/pdf': 'document',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
};
export const MAX_ANEXO_MB = 8;

/** Bloco de conteúdo da API para um anexo (PDF → document, imagem → image). */
export async function blocoAnexo(file) {
  const tipo = TIPOS_ANEXO[file.type];
  if (!tipo) throw new Error('Formato não suportado. Envie PDF ou imagem (PNG, JPG, WEBP).');
  if (file.size > MAX_ANEXO_MB * 1024 * 1024) throw new Error(`Arquivo acima de ${MAX_ANEXO_MB} MB.`);
  const data = await arquivoParaBase64(file);
  return tipo === 'document'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data }, title: file.name }
    : { type: 'image', source: { type: 'base64', media_type: file.type, data } };
}
