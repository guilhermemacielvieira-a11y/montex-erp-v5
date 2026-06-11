// ============================================================
// DESIGN SYSTEM MOBILE — Upload de foto (best-effort)
// ============================================================
// Sobe a foto para o Supabase Storage (bucket 'uploads', mesmo do
// base44Client) e devolve a URL pública. NÃO bloqueia o fluxo: em
// qualquer falha retorna null (a ação principal segue sem a evidência).
// ============================================================
import { supabase } from '@/api/supabaseClient';

export async function uploadFoto(file, folder = 'evidencias') {
  if (!file) return null;
  try {
    const nome = `${folder}/${Date.now()}_${(file.name || 'foto.jpg').replace(/\s+/g, '_')}`;
    const { error } = await supabase.storage.from('uploads').upload(nome, file);
    if (error) return null;
    const { data } = supabase.storage.from('uploads').getPublicUrl(nome);
    return data?.publicUrl || null;
  } catch {
    return null;
  }
}
