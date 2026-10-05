// ============================================================
// Edge Function: ia-copiloto — Copiloto MONTEX, Insights IA e prompts
// ============================================================
// Proxy SEGURO para a API do Claude. A chave fica só no servidor
// (secret ANTHROPIC_API_KEY); modelo via IA_COPILOTO_MODEL (padrão
// claude-opus-5-5 — NÃO usa ANTHROPIC_MODEL, que é da extrair-nota). Só usuário logado chama; cada chamada é registrada em
// `ia_uso` e há limite diário por usuário (IA_LIMITE_DIARIO, padrão 150).
//
// Modos (POST JSON):
//   { modo: "chat", messages }            → Copiloto. As FERRAMENTAS (consulta
//       aos dados do ERP) são definidas aqui e EXECUTADAS NO NAVEGADOR com o
//       mesmo motor do BI 360 (src/services/ia/copilotoTools.js). O cliente
//       devolve os tool_result na próxima chamada (loop manual, append-only).
//   { modo: "insights", snapshot, foco }  → análise executiva estruturada (JSON).
//   { modo: "prompt", prompt, schema? }   → texto livre ou JSON (shim do
//       InvokeLLM legado usado por Tarefas/Relatórios).
//
// Respostas: { content, stop_reason, usage, modelo } | { erro }
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

const MODELO = Deno.env.get("IA_COPILOTO_MODEL") || "claude-opus-5-5";
const LIMITE_DIARIO = Number(Deno.env.get("IA_LIMITE_DIARIO") || 150);
const MAX_MENSAGENS = 80;

// ---------- Prompt do Copiloto (estável → cacheável) ----------
const SISTEMA_COPILOTO = `Você é o Copiloto MONTEX, assistente do ERP do Grupo MONTEX — fábrica de estruturas metálicas em Belo Vale/MG (fabricação, solda, pintura, expedição e montagem de estruturas para obras).

Quem pergunta são gestores, financeiro, PCP e diretoria. Responda em português do Brasil, direto e útil para decisão.

Regras:
- Números SEMPRE vêm das ferramentas (dados reais do ERP). Nunca invente valores, datas, obras ou nomes. Se a ferramenta não traz o dado, diga que não há registro e o que precisaria ser cadastrado.
- Use as ferramentas antes de afirmar qualquer número. Pode chamar várias em paralelo.
- O "escopo" informado no contexto é o filtro de obra escolhido no topo do sistema (Geral = todas as obras). As ferramentas já usam esse escopo; para outra obra, passe o parâmetro "obra".
- Premissas do financeiro: o caixa da EMPRESA não inclui material comprado direto na obra; resultado por obra é contrato consumido por Material × Montex (medições), não lucro. Faturado não é recebido.
- Etapas de produção: fabricação → solda → pintura → fila de embarque (expedido) → em obra (enviado).
- Formate em Markdown curto: comece pela resposta, depois os números que a sustentam (tabela quando houver várias linhas) e, se fizer sentido, 1 a 3 próximos passos práticos. Valores em R$ no padrão brasileiro e pesos em kg ou t.
- Se a pergunta for ambígua, responda com a interpretação mais provável e diga qual foi.
- Para documentos anexados (PDF, foto de nota, planilha em imagem), leia o conteúdo e cruze com os dados do ERP quando útil.`;

// Ferramentas executadas no navegador (mesmos nomes de copilotoTools.js).
const S = (props: Record<string, unknown>) => ({
  type: "object", properties: props, required: Object.keys(props), additionalProperties: false,
});
const TXT = (d: string) => ({ type: ["string", "null"], description: d });
const NUM = (d: string) => ({ type: ["number", "null"], description: d });
const BOOL = (d: string) => ({ type: ["boolean", "null"], description: d });
const OBRA = TXT("Id, código ou parte do nome da obra. null = escopo atual do topo.");

const FERRAMENTAS = [
  { name: "resumo_executivo", description: "KPIs executivos do escopo: carteira (R$ e kg), meses de carteira, ritmo de produção e tendência, faturado/recebido, a receber vencido, obras em atraso e principais alertas.", input_schema: S({}) },
  { name: "listar_obras", description: "Lista as obras com avanço físico × financeiro, contrato, medido, recebido, material, ritmo, previsão de término × prazo e atraso.", input_schema: S({ apenas_ativas: BOOL("true = só obras ativas (padrão true)") }) },
  { name: "detalhar_obra", description: "Detalhe de UMA obra: indicadores, curva S resumida, medições, material por categoria e peças por etapa.", input_schema: S({ obra: TXT("Id, código ou parte do nome da obra (obrigatório).") }) },
  { name: "producao", description: "Produção: kg por semana por etapa concluída, tendência, lead time por etapa, WIP, gargalo e ranking de funcionários (30 dias).", input_schema: S({ obra: OBRA, semanas: NUM("Semanas de histórico (padrão 8, máx 26)") }) },
  { name: "buscar_pecas", description: "Busca peças/marcas por obra, etapa atual, marca ou peças paradas há N dias numa etapa de fábrica.", input_schema: S({ obra: OBRA, etapa: TXT("aguardando|fabricacao|solda|pintura|expedido|enviado|entregue"), marca: TXT("Trecho da marca/código"), parada_dias_min: NUM("Só peças paradas há pelo menos N dias"), limite: NUM("Máx. linhas (padrão 30, máx 100)") }) },
  { name: "financeiro", description: "Financeiro do escopo (Geral = caixa da empresa): faturado × recebido × despesas por mês, aging, fluxo projetado 8 semanas, fornecedores e categorias.", input_schema: S({ obra: OBRA, meses: NUM("Meses de histórico (padrão 6, máx 12)") }) },
  { name: "lancamentos", description: "Lista lançamentos (despesas ou receitas/medições) com filtros e total.", input_schema: S({ tipo: { type: "string", enum: ["despesa", "receita"], description: "despesa ou receita" }, obra: OBRA, fornecedor: TXT("Trecho do fornecedor/cliente"), categoria: TXT("Trecho da categoria"), status: TXT("pago|pendente|vencido|recebido|aberto"), de: TXT("Data inicial AAAA-MM-DD"), ate: TXT("Data final AAAA-MM-DD"), limite: NUM("Máx. linhas (padrão 30, máx 100)") }) },
  { name: "estoque", description: "Estoque: itens (busca por descrição/perfil), saúde (zerado/crítico/baixo), valor e curva ABC.", input_schema: S({ busca: TXT("Trecho de descrição/perfil/código"), so_alerta: BOOL("true = só itens no mínimo ou abaixo"), limite: NUM("Máx. linhas (padrão 30, máx 100)") }) },
  { name: "alertas", description: "Alertas do Radar (anomalias detectadas) no escopo, por severidade.", input_schema: S({ severidade: TXT("critico|alto|medio|baixo; null = todas") }) },
];

// ---------- Insights (saída estruturada) ----------
const SISTEMA_INSIGHTS = `Você é um analista sênior de operações e finanças de uma fábrica de estruturas metálicas (Grupo MONTEX).
Recebe um SNAPSHOT com números reais do ERP (BI 360 + Radar de Alertas) e produz uma análise executiva em português do Brasil.
Regras: use somente os números do snapshot (não invente); seja específico (cite obra, etapa, valor); priorize o que mais impacta caixa, prazo e margem; recomendações acionáveis por alguém da fábrica nesta semana. Premissas: caixa da empresa exclui material comprado direto na obra; faturado não é recebido.`;

const SCHEMA_INSIGHTS = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "destaques", "riscos", "recomendacoes"],
  properties: {
    resumo: { type: "string", description: "3 a 5 frases com a leitura geral do momento." },
    destaques: { type: "array", items: { type: "string" }, description: "Até 5 pontos positivos ou neutros relevantes." },
    riscos: { type: "array", items: { type: "string" }, description: "Até 5 riscos/pontos de atenção." },
    recomendacoes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titulo", "detalhe", "area", "impacto", "prazo"],
        properties: {
          titulo: { type: "string" },
          detalhe: { type: "string", description: "O que fazer, por quê e com base em qual número." },
          area: { type: "string", enum: ["Produção", "Obras", "Financeiro", "Suprimentos", "Comercial", "Dados"] },
          impacto: { type: "string", enum: ["alto", "medio", "baixo"] },
          prazo: { type: "string", enum: ["hoje", "esta_semana", "este_mes"] },
        },
      },
    },
  },
};

type Corpo = {
  modo?: "chat" | "insights" | "prompt";
  messages?: Anthropic.Beta.BetaMessageParam[];
  snapshot?: unknown;
  foco?: string;
  prompt?: string;
  schema?: Record<string, unknown> | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { erro: "use POST" });

  const KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!KEY) return json(200, { erro: "IA não configurada — defina o secret ANTHROPIC_API_KEY no Supabase." });

  // ---- Usuário logado (protege custo) ----
  const authHeader = req.headers.get("Authorization") || "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: u } = await sb.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
  const userId = u?.user?.id;
  if (!userId) return json(401, { erro: "Faça login para usar a IA." });

  // ---- Limite diário ----
  const inicioDia = new Date(); inicioDia.setUTCHours(3, 0, 0, 0); // 00:00 em Brasília
  if (inicioDia > new Date()) inicioDia.setUTCDate(inicioDia.getUTCDate() - 1);
  const { count } = await sb.from("ia_uso").select("id", { count: "exact", head: true })
    .eq("user_id", userId).gte("created_at", inicioDia.toISOString());
  if ((count ?? 0) >= LIMITE_DIARIO) {
    return json(200, { erro: `Limite diário de ${LIMITE_DIARIO} consultas de IA atingido. Volta a liberar à meia-noite.` });
  }

  let body: Corpo = {};
  try { body = await req.json(); } catch { return json(400, { erro: "JSON inválido" }); }
  const modo = body.modo || "chat";

  const client = new Anthropic({ apiKey: KEY });
  const base = {
    model: MODELO,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  } as const;

  let params: Record<string, unknown>;
  if (modo === "chat") {
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length || messages.length > MAX_MENSAGENS) return json(400, { erro: "Conversa vazia ou longa demais — inicie uma nova." });
    params = {
      ...base,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      cache_control: { type: "ephemeral" },
      system: [{ type: "text", text: SISTEMA_COPILOTO }],
      tools: FERRAMENTAS,
      messages,
    };
  } else if (modo === "insights") {
    params = {
      ...base,
      max_tokens: 16000,
      output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA_INSIGHTS } },
      system: SISTEMA_INSIGHTS,
      messages: [{
        role: "user",
        content: `Foco pedido: ${body.foco || "visão geral"}\n\nSNAPSHOT (JSON):\n${JSON.stringify(body.snapshot ?? {})}`,
      }],
    };
  } else if (modo === "prompt") {
    if (!body.prompt) return json(400, { erro: "prompt obrigatório" });
    params = {
      ...base,
      max_tokens: 16000,
      output_config: { effort: "medium", ...(body.schema ? { format: { type: "json_schema", schema: body.schema } } : {}) },
      messages: [{ role: "user", content: String(body.prompt).slice(0, 200000) }],
    };
  } else {
    return json(400, { erro: "modo inválido" });
  }

  const registrar = (r: { input?: number; output?: number; cache?: number; stop?: string | null; erro?: string | null }) =>
    sb.from("ia_uso").insert({
      user_id: userId, modo, modelo: MODELO,
      input_tokens: r.input ?? 0, output_tokens: r.output ?? 0, cache_read_tokens: r.cache ?? 0,
      stop_reason: r.stop ?? null, erro: r.erro ?? null,
    });

  try {
    // deno-lint-ignore no-explicit-any
    const resp = await client.beta.messages.create(params as any);
    await registrar({
      input: resp.usage?.input_tokens, output: resp.usage?.output_tokens,
      cache: resp.usage?.cache_read_input_tokens ?? 0, stop: resp.stop_reason,
    });
    if (resp.stop_reason === "refusal") {
      return json(200, { erro: "A IA não pôde responder a esta solicitação. Reformule a pergunta.", stop_reason: "refusal" });
    }
    return json(200, { content: resp.content, stop_reason: resp.stop_reason, usage: resp.usage, modelo: resp.model });
  } catch (e) {
    let msg = "Falha ao chamar a IA.";
    if (e instanceof Anthropic.RateLimitError) msg = "IA ocupada no momento (limite de taxa). Tente de novo em instantes.";
    else if (e instanceof Anthropic.AuthenticationError) msg = "Chave da IA inválida — revise o secret ANTHROPIC_API_KEY.";
    else if (e instanceof Anthropic.BadRequestError) msg = `Requisição recusada pela IA: ${e.message}`;
    else if (e instanceof Anthropic.APIError) msg = `IA indisponível (${e.status}).`;
    else if (e instanceof Error) msg = `Falha ao chamar a IA: ${e.message}`;
    await registrar({ erro: msg });
    return json(200, { erro: msg });
  }
});
