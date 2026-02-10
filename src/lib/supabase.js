// Re-exporta o cliente Supabase único de supabaseClient.js
// IMPORTANTE: Usar apenas UMA instância do createClient() para evitar
// "Multiple GoTrueClient instances" e AbortErrors
import { supabase } from '@/api/supabaseClient';

export { supabase };

/**
 * Verifica se o Supabase foi configurado corretamente
 * @returns {boolean} true se Supabase está configurado, false caso contrário
 */
export const isSupabaseConfigured = () => !!supabase;
