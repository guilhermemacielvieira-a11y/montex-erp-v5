// ============================================================
// Edge Function: smooth-function — materializa permissões legadas
// ============================================================
// Aplica, no SERVIDOR (service_role), o mesmo efeito da migration
// 20260614_materializar_permissoes_legadas.sql: grava explicitamente o preset
// da FUNÇÃO para cada usuário legado (permissoes NULL/[]), fechando o modelo
// "acesso = módulos selecionados, sem incluir por função" também p/ os antigos.
//
// SEGURO / idempotente:
//   • Só toca quem está com permissoes NULL/[] (não sobrescreve personalização).
//   • NÃO toca admin (fica NULL → herda '*' do papel = acesso total).
//   • Funções desconhecidas ficam intactas (vão no relatório p/ revisão manual).
//   • PRÉVIA por padrão: só grava quando o corpo trouxer { "apply": true }.
//   • Behavior-preserving: ninguém ganha/perde acesso (o hasPermission já usava
//     o preset do papel quando permissoes era vazio).
//
// Uso (dashboard → Invoke, ou curl):
//   {}                 → relatório do que SERIA alterado (não grava)
//   {"apply": true}    → aplica e retorna o resumo
//
// Presets = cópia fiel de src/lib/permissions.js → ROLE_PERMISSIONS_MAP.
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

const vazio = (p: unknown) => p == null || (Array.isArray(p) && p.length === 0);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "use POST" });

  const URL = Deno.env.get("SUPABASE_URL");
  const KEY = Deno.env.get("MONTEX_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!URL || !KEY) return json(500, { error: "Ambiente sem SUPABASE_URL/SERVICE_ROLE_KEY" });

  let apply = false;
  try { apply = !!(await req.json())?.apply; } catch { /* corpo vazio = prévia */ }

  const admin = createClient(URL, KEY, { auth: { persistSession: false } });
  const { data: perfis, error } = await admin
    .from("user_profiles")
    .select("id,email,role,permissoes,ativo");
  if (error) return json(500, { error: error.message });

  const resumo: Record<string, number> = {};
  const revisarManual: { email: string; role: string }[] = [];
  let atualizados = 0;

  for (const p of perfis ?? []) {
    if (!vazio(p.permissoes)) continue;          // já tem seleção própria
    if (p.role === "admin") continue;            // admin = acesso total (deixa NULL)
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
    total_perfis: perfis?.length ?? 0,
    legados_por_funcao: resumo,
    legados_total: Object.values(resumo).reduce((a, b) => a + b, 0),
    gravados: apply ? atualizados : 0,
    revisar_manual_funcao_desconhecida: revisarManual,
  });
});
