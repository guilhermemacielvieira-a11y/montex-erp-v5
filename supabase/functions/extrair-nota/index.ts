// ============================================================
// Edge Function: extrair-nota — extrai itens de NF (foto/PDF) via IA
// ============================================================
// Recebe uma imagem OU PDF de nota fiscal/romaneio (base64) e devolve os
// itens de material estruturados, para preencher a importação de chegada.
//
// Requer o secret ANTHROPIC_API_KEY no projeto:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// Modelo configuravel via ANTHROPIC_MODEL (default abaixo).
//
// Degrada com elegancia: sem chave ou em erro, retorna { itens: [], erro }
// e o cliente cai no lançamento manual. verify_jwt=true → só usuário logado
// chama (protege custo de API).
//
// POST { fileBase64: string, mimeType: string }
//   → { itens: [{descricao,codigo,quantidade,unidade,preco}], fornecedor, nota_fiscal }
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

const PROMPT = `Você é um extrator de itens de NOTA FISCAL / romaneio de compra de materiais (siderurgia/construção).
Analise o documento (imagem ou PDF) e extraia SOMENTE os itens de material com suas quantidades.
Responda EXCLUSIVAMENTE com JSON válido, sem texto antes ou depois, no formato:
{"fornecedor": string|null, "nota_fiscal": string|null, "itens": [{"descricao": string, "codigo": string|null, "quantidade": number, "unidade": string, "preco": number|null}]}
Regras:
- descricao = nome/especificação do material (ex.: "Chapa 3/16 A36", "Perfil W150x13", "Cantoneira L 2\"").
- quantidade: número (use ponto decimal, sem separador de milhar).
- unidade: como no documento (UN, KG, M, PC, BARRA, CH...). Se não houver, use "UN".
- preco: valor UNITÁRIO se disponível, senão null.
- codigo: código/SKU do item se houver, senão null.
- Ignore impostos, totais, transporte e dados que não sejam itens de material.
- Se não for uma nota de materiais, retorne {"itens": []}.`;

function parseJson(txt: string): { itens?: unknown[]; fornecedor?: string | null; nota_fiscal?: string | null } {
  if (!txt) return {};
  let s = txt.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const a = s.indexOf("{"); const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  try { return JSON.parse(s); } catch { return {}; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "use POST" });

  const KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!KEY) return json(200, { itens: [], erro: "IA não configurada — defina o secret ANTHROPIC_API_KEY no projeto." });
  const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-3-5-sonnet-latest";

  let body: { fileBase64?: string; mimeType?: string } = {};
  try { body = await req.json(); } catch { return json(400, { error: "JSON inválido" }); }
  const { fileBase64, mimeType } = body;
  if (!fileBase64) return json(400, { error: "fileBase64 obrigatório" });

  const isPdf = (mimeType || "").toLowerCase().includes("pdf");
  const midia = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileBase64 } }
    : { type: "image", source: { type: "base64", media_type: (mimeType || "image/jpeg"), data: fileBase64 } };

  try {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
    };
    if (isPdf) headers["anthropic-beta"] = "pdfs-2024-09-25";

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2500,
        messages: [{ role: "user", content: [midia, { type: "text", text: PROMPT }] }],
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return json(200, { itens: [], erro: `IA indisponível: ${data?.error?.message || resp.status}` });
    }
    const texto = Array.isArray(data?.content) ? (data.content.find((c: { type: string }) => c.type === "text")?.text || "") : "";
    const parsed = parseJson(texto);
    const itens = Array.isArray(parsed.itens) ? parsed.itens : [];
    return json(200, { itens, fornecedor: parsed.fornecedor ?? null, nota_fiscal: parsed.nota_fiscal ?? null });
  } catch (e) {
    return json(200, { itens: [], erro: "Falha ao chamar a IA: " + String((e as Error)?.message || e) });
  }
});
