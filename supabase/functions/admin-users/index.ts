// ============================================================
// Edge Function: admin-users — operações privilegiadas de usuários
// ============================================================
// Move para o SERVIDOR todas as operações que exigiam a service_role key
// no cliente (que vazava no bundle — achado S1). A service_role NUNCA sai
// do ambiente da função.
//
// Ações (POST JSON { "action": "...", ...payload }):
//   • list_profiles                              → lista user_profiles
//   • create_user   { email, password, nome, role, cargo }
//   • update_profile{ id, updates }              → atualiza user_profiles
//   • reset_password{ authId, password }         → redefine senha (auth admin)
//
// Deploy:
//   supabase functions deploy admin-users --no-verify-jwt
//   O app usa a publishable key (sb_publishable_*), que NÃO é JWT — com verify_jwt
//   ON o gateway a rejeitaria (401). A verificação de auth/role real entra na
//   Fase 1, DENTRO da função (ver TODO no handler), não no gateway.
//
// Secrets: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem no ambiente
//          da função automaticamente — não precisa setar.
//
// ⚠️ SEGURANÇA / Fase 1 (auth real): enquanto o app não tiver login, esta
//    função é chamável por qualquer um que tenha a anon key, limitada a
//    estas ações de gestão de usuários (NÃO a CRUD total do banco — isso é
//    uma redução enorme de superfície vs. a service_role vazada). Ao
//    habilitar Supabase Auth, ADICIONAR aqui a verificação do JWT do
//    chamador e exigir role 'admin' (ver TODO no handler).
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "use POST" });

  const SERVICE_KEY = (Deno.env.get("MONTEX_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const URL = Deno.env.get("SUPABASE_URL");
  if (!SERVICE_KEY || !URL) {
    return json(500, { error: "Ambiente da função sem SUPABASE_URL/SERVICE_ROLE_KEY" });
  }

  // TODO (Fase 1 — auth real): validar o JWT do chamador e exigir role admin.
  //   const authHeader = req.headers.get("Authorization");
  //   const caller = await admin.auth.getUser(jwtFrom(authHeader));
  //   if (perfilDoCaller.role !== "admin") return json(403, { error: "apenas admin" });

  const admin = createClient(URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "JSON inválido no corpo" });
  }
  const action = payload.action as string;

  try {
    switch (action) {
      case "list_profiles": {
        const { data, error } = await admin
          .from("user_profiles")
          .select("*")
          .order("role", { ascending: true });
        if (error) throw error;
        return json(200, { profiles: data ?? [] });
      }

      case "create_user": {
        const { email, password, nome, role, cargo, permissoes } = payload as {
          email?: string; password?: string; nome?: string; role?: string; cargo?: string; permissoes?: string[];
        };
        if (!email || !password) return json(400, { error: "email e password obrigatórios" });

        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { nome, role },
        });
        if (authError) throw authError;

        // Acesso por MÓDULOS SELECIONADOS: grava `permissoes` explícito quando
        // enviado (não-vazio). Vazio/ausente = herda a função (admin = total).
        const row: Record<string, unknown> = { auth_id: authData.user.id, email, nome, role, cargo, ativo: true };
        if (Array.isArray(permissoes) && permissoes.length > 0) row.permissoes = permissoes;

        const { data: profile, error: profileError } = await admin
          .from("user_profiles")
          .insert([row])
          .select()
          .single();
        if (profileError) throw profileError;
        return json(200, { profile });
      }

      case "update_profile": {
        const { id, updates } = payload as { id?: string; updates?: Record<string, unknown> };
        if (!id || !updates) return json(400, { error: "id e updates obrigatórios" });
        const { data, error } = await admin
          .from("user_profiles")
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        if (!data) return json(404, { error: "perfil não encontrado" });
        return json(200, { profile: data });
      }

      case "reset_password": {
        const { authId, password } = payload as { authId?: string; password?: string };
        if (!authId || !password) return json(400, { error: "authId e password obrigatórios" });
        if (password.length < 6) return json(400, { error: "senha mínima de 6 caracteres" });
        const { data, error } = await admin.auth.admin.updateUserById(authId, { password });
        if (error) throw error;
        return json(200, { user: data.user });
      }

      default:
        return json(400, { error: `ação desconhecida: ${action}` });
    }
  } catch (e) {
    return json(500, { error: String((e as Error)?.message || e) });
  }
});
