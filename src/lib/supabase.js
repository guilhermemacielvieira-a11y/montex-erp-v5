import { createClient } from '@supabase/supabase-js';

/**
 * URL do Supabase carregada das variáveis de ambiente
 * @type {string|undefined}
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

/**
 * Chave anônima do Supabase carregada das variáveis de ambiente
 * @type {string|undefined}
 */
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Valida se as credenciais do Supabase foram configuradas corretamente
 */
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase não configurado. Usando dados locais.');
}

/**
 * Cliente Supabase instanciado com as credenciais fornecidas
 * Será null se as credenciais não estiverem configuradas
 * @type {SupabaseClient|null}
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Verifica se o Supabase foi configurado corretamente
 *
 * @returns {boolean} true se Supabase está configurado, false caso contrário
 * @example
 * if (isSupabaseConfigured()) {
 *   // Usar Supabase
 * } else {
 *   // Usar dados locais
 * }
 */
export const isSupabaseConfigured = () => !!supabase;
