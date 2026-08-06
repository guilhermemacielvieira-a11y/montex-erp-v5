// ============================================================
// Edge Function: smooth-function — gestão de permissões (server-side)
// ============================================================
// Duas ações, ambas com PRÉVIA por padrão (só gravam com {"apply": true}):
//
//  1) materializar-legados (default)
//     Grava o preset da FUNÇÃO para usuários legados (permissoes NULL/[]),
//     fechando "acesso = módulos selecionados" também p/ os antigos.
//     Seguro/idempotente: só toca quem está vazio, NUNCA admin, funções
//     desconhecidas vão no relatório. Behavior-preserving.
//       {}                         → prévia
//       {"apply": true}            → aplica
//
//  2) set-modulos
//     Define a SELEÇÃO explícita de módulos de um usuário (por email).
//     GUARDA ANTI-LOCKOUT: aborta se a mudança deixaria o sistema sem nenhum
//     admin efetivo (use {"force": true} só se souber o que está fazendo).
//       {"action":"set-modulos","email":"x@y.com","modulos":["montagem.view",...]}  → prévia
//       {"action":"set-modulos","apply":true}   → aplica (default: contato@grupomontex + Montagem/3D)
//
// Presets/keys = cópia fiel de src/lib/permissions.js (ROLE_PERMISSIONS_MAP / ALL_PERMISSIONS).
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj, null, 2), { status, headers: { "Content-Type": "application/json", ...CORS } });

const PRESETS: Record<string, string[]> = {
  gerente: [
    "dashboard.view","dashboard.export","command.view","colaboracao.view","comercial.view",
    "orcamentos.view","orcamentos.edit","orcamentos.aprovar","clientes.view","clientes.edit",
    "projetos.view","projetos.edit","projetos.create","suprimentos.view","estoque.view",
    "estoque.edit","estoque.movimentar","compras.view","compras.edit","compras.aprovar",
    "materiais.view","materiais.edit","producao.view","producao.edit","producao.lancar_avanco",
    "producao.aprovar","montagem.view","montagem.edit","viewer3d.view","kanban.view","kanban.edit",
    "equipes.view","equipes.edit","equipes.escalar","expedicao.view","expedicao.edit",
    "expedicao.aprovar","obras.view","obras.edit","medicao.view","medicao.edit","medicao.aprovar",
    "financeiro.view","financeiro.edit","bi.view","nfs.view","nfs.edit","relatorios.view",
    "relatorios.export","usuarios.view",
  ],
  supervisor: [
    "dashboard.view","command.view","colaboracao.view","producao.view","producao.edit",
    "producao.lancar_avanco","montagem.view","montagem.edit","viewer3d.view","kanban.view",
    "kanban.edit","equipes.view","equipes.edit","equipes.escalar","materiais.view","materiais.edit",
    "suprimentos.view","estoque.view","estoque.edit","estoque.movimentar","compras.view",
    "expedicao.view","expedicao.edit","obras.view","obras.edit","medicao.view","medicao.edit",
    "projetos.view","nfs.view","relatorios.view",
  ],
  operador: [
    "dashboard.view","command.view","colaboracao.view","producao.view","producao.lancar_avanco",
    "montagem.view","montagem.edit","viewer3d.view","kanban.view","kanban.edit","equipes.view",
    "materiais.view","suprimentos.view","estoque.view","obras.view",
  ],
  financeiro: [
    "dashboard.view","dashboard.export","command.view","colaboracao.view","comercial.view",
    "orcamentos.view","orcamentos.edit","clientes.view","clientes.edit","projetos.view",
    "suprimentos.view","compras.view","compras.edit","financeiro.view","financeiro.edit",
    "financeiro.aprovar","nfs.view","nfs.edit","medicao.view","medicao.edit","bi.view",
    "relatorios.view","relatorios.export",
  ],
  viewer: [
    "dashboard.view","command.view","colaboracao.view","producao.view","montagem.view",
    "viewer3d.view","obras.view","suprimentos.view","estoque.view","compras.view","expedicao.view",
    "medicao.view","projetos.view","nfs.view","materiais.view","kanban.view","bi.view","relatorios.view",
  ],
};

// Catálogo de chaves válidas (ALL_PERMISSIONS) — valida seleções customizadas.
const VALID_KEYS = new Set<string>([
  "dashboard.view","dashboard.export","comercial.view","orcamentos.view","orcamentos.edit",
  "orcamentos.aprovar","clientes.view","clientes.edit","projetos.view","projetos.edit","projetos.create",
  "suprimentos.view","estoque.view","estoque.edit","estoque.movimentar","compras.view","compras.edit",
  "compras.aprovar","materiais.view","materiais.edit","producao.view","producao.edit",
  "producao.lancar_avanco","producao.aprovar","montagem.view","montagem.edit","viewer3d.view",
  "kanban.view","kanban.edit","equipes.view","equipes.edit","equipes.escalar","expedicao.view",
  "expedicao.edit","expedicao.aprovar","obras.view","obras.edit","medicao.view","medicao.edit",
  "medicao.aprovar","financeiro.view","financeiro.edit","financeiro.aprovar","nfs.view","nfs.edit",
  "bi.view","command.view","colaboracao.view","relatorios.view","relatorios.export","usuarios.view",
  "usuarios.manage",
]);

const vazio = (p: unknown) => p == null || (Array.isArray(p) && p.length === 0);
// "Admin efetivo" = ativo e com acesso total: role admin SEM override, ou permissoes contém '*'.
const ehAdminEfetivo = (u: { role?: string; permissoes?: unknown; ativo?: boolean }) =>
  u.ativo !== false && (
    (u.role === "admin" && vazio(u.permissoes)) ||
    (Array.isArray(u.permissoes) && (u.permissoes as string[]).includes("*"))
  );

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "use POST" });

  const URL = Deno.env.get("SUPABASE_URL");
  const KEY = Deno.env.get("MONTEX_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!URL || !KEY) return json(500, { error: "Ambiente sem SUPABASE_URL/SERVICE_ROLE_KEY" });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* corpo vazio = prévia da ação default */ }
  const action = (body.action as string) || "materializar-legados";
  const apply = !!body.apply;

  const admin = createClient(URL, KEY, { auth: { persistSession: false } });
  const { data: perfis, error } = await admin
    .from("user_profiles")
    .select("id,email,role,permissoes,ativo");
  if (error) return json(500, { error: error.message });
  const todos = perfis ?? [];

  // ---------- AÇÃO 2: set-modulos (com guarda anti-lockout) ----------
  if (action === "set-modulos") {
    const email = ((body.email as string) || "contato@grupomontex.com.br").trim().toLowerCase();
    const modulos = Array.isArray(body.modulos) && (body.modulos as string[]).length
      ? (body.modulos as string[])
      : ["montagem.view", "montagem.edit", "viewer3d.view"]; // default: Montagem + 3D
    const force = !!body.force;

    const alvo = todos.find((u) => (u.email || "").toLowerCase() === email);
    if (!alvo) return json(404, { error: `usuário não encontrado: ${email}` });

    const invalidas = modulos.filter((k) => k !== "*" && !VALID_KEYS.has(k));
    if (invalidas.length) return json(400, { error: "chaves inválidas", invalidas });

    // GUARDA ANTI-LOCKOUT: restringir o alvo removeria o '*' efetivo dele.
    const alvoEraAdmin = ehAdminEfetivo(alvo);
    const novoAlvoEhAdmin = modulos.includes("*");
    const outrosAdmins = todos.filter((u) => u.id !== alvo.id && ehAdminEfetivo(u)).length;
    if (alvoEraAdmin && !novoAlvoEhAdmin && outrosAdmins === 0 && !force) {
      return json(409, {
        erro: "BLOQUEADO — lockout de admin",
        detalhe: `'${email}' é o ÚNICO admin com acesso total. Restringi-lo deixaria o sistema sem admin. ` +
          "Crie/eleve outro admin antes, ou reenvie com {\"force\": true} se tiver certeza.",
        admins_efetivos_atuais: outrosAdmins + 1,
      });
    }

    if (!apply) {
      return json(200, {
        modo: "PRÉVIA (nada gravado) — reenvie com {\"apply\": true} para gravar",
        acao: "set-modulos", email,
        permissoes_atuais: alvo.permissoes ?? null,
        permissoes_novas: modulos,
        alvo_era_admin_efetivo: alvoEraAdmin,
        outros_admins_efetivos: outrosAdmins,
      });
    }
    const { error: upErr } = await admin
      .from("user_profiles")
      .update({ permissoes: modulos, updated_at: new Date().toISOString() })
      .eq("id", alvo.id);
    if (upErr) return json(500, { error: upErr.message });
    return json(200, { modo: "APLICADO", acao: "set-modulos", email, permissoes_novas: modulos });
  }

  // ---------- AÇÃO 1: materializar-legados ----------
  const resumo: Record<string, number> = {};
  const revisarManual: { email: string; role: string }[] = [];
  let atualizados = 0;
  for (const p of todos) {
    if (!vazio(p.permissoes)) continue;     // já tem seleção própria
    if (p.role === "admin") continue;       // admin = acesso total (deixa NULL)
    const preset = PRESETS[p.role as string];
    if (!preset) { revisarManual.push({ email: p.email, role: p.role }); continue; }
    resumo[p.role] = (resumo[p.role] || 0) + 1;
    if (apply) {
      const { error: upErr } = await admin
        .from("user_profiles")
        .update({ permissoes: preset, updated_at: new Date().toISOString() })
        .eq("id", p.id);
      if (upErr) return json(500, { error: `falha em ${p.email}: ${upErr.message}`, atualizados });
      atualizados++;
    }
  }
  return json(200, {
    modo: apply ? "APLICADO" : "PRÉVIA (nada gravado) — reenvie com {\"apply\": true} para gravar",
    acao: "materializar-legados",
    total_perfis: todos.length,
    legados_por_funcao: resumo,
    legados_total: Object.values(resumo).reduce((a, b) => a + b, 0),
    gravados: apply ? atualizados : 0,
    revisar_manual_funcao_desconhecida: revisarManual,
  });
});
