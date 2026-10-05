// ============================================================
// Edge Function: motor-automacoes — executa automações e relatórios agendados
// ============================================================
// Roda de hora em hora (pg_cron → net.http_post com header x-push-key lido do
// Vault, mesmo padrão da notify-pending). Também aceita chamada de usuário
// logado (botões "Executar agora" / "Testar" da tela Automações).
//
// Para cada automação ativa: avalia o GATILHO com dados reais, deduplica
// (automacoes_disparos: a mesma ocorrência só dispara uma vez) e executa as
// AÇÕES com as ocorrências novas: notificar (tabela notificacoes), criar
// tarefa (tarefas, origem=automacao) e push (send-push). Tudo vai para
// automacoes_log. Relatórios agendados geram um resumo em
// relatorios_historico + notificação.
//
// POST { modo?: 'agendado'|'manual'|'teste', automacao_id?: uuid }
//   teste → só avalia e devolve as ocorrências (não grava nem age).
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-key",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const num = (v: unknown) => Number(v) || 0;
const brl = (n: number) => "R$ " + num(n).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const kg = (n: number) => `${Math.round(num(n)).toLocaleString("pt-BR")} kg`;

// ---------- Datas em Brasília (UTC-3, sem horário de verão) ----------
const agoraBRT = () => new Date(Date.now() - 3 * 3600 * 1000);
const isoDia = (d: Date) => d.toISOString().slice(0, 10);
const somaDias = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return isoDia(d); };
const diasEntre = (a: string, b: string) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
const semana = (iso: string) => { const d = new Date(iso + "T00:00:00Z"); const dow = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dow); return isoDia(d); };
const fmtBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

type Disparo = { chave: string; titulo: string; detalhe: string; obra_id: string | null; link: string; valor?: number };
type Automacao = { id: string; nome: string; gatilho: string; parametros: Record<string, unknown>; acoes: Array<Record<string, unknown>>; obra_id: string | null };

// Busca paginada (PostgREST limita 1000 linhas — CLAUDE.md regra 4)
// deno-lint-ignore no-explicit-any
async function todas<T>(q: () => any, ordem = "id"): Promise<T[]> {
  const out: T[] = [];
  for (let de = 0; de < 200000; de += 1000) {
    const { data, error } = await q().order(ordem, { ascending: true }).range(de, de + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const STATUS_DESPESA_ABERTA = (s: string | null) => !/^(pago|paga|cancelad[oa]|quitad[oa])$/i.test(String(s || ""));
const MEDICAO_RECONHECIDA_NAO_PAGA = (s: string | null) => /^(aprovad[oa]|faturad[oa])$/i.test(String(s || ""));
const OBRA_ATIVA = (s: string | null) => !/^(conclu|cancel|pausad)/i.test(String(s || ""));
const ETAPA_ROTULO: Record<string, string> = { fabricacao: "Fabricação", solda: "Solda", pintura: "Pintura" };

// ================= GATILHOS =================
async function avaliar(db: SupabaseClient, a: Automacao, hoje: string): Promise<Disparo[]> {
  const p = a.parametros || {};
  const naObra = (id: string | null) => !a.obra_id || id === a.obra_id;
  const obras = await todas<any>(() => db.from("obras").select("id, nome, status, data_prevista_fim"));
  const nomeObra = (id: string | null) => obras.find((o) => o.id === id)?.nome || id || "—";

  switch (a.gatilho) {
    case "peca_parada": {
      const dias = num(p.dias) || 14;
      const etapas = (Array.isArray(p.etapas) && p.etapas.length ? p.etapas : ["fabricacao", "solda", "pintura"]) as string[];
      const pecas = (await todas<any>(() => db.from("pecas_producao").select("id, obra_id, etapa, marca, codigo, peso_total, updated_at").in("etapa", etapas))).filter((x) => naObra(x.obra_id));
      if (!pecas.length) return [];
      const hist = await todas<any>(() => db.from("producao_historico").select("peca_id, etapa_para, data_inicio").in("etapa_para", etapas));
      const entrada = new Map<string, string>();
      for (const h of hist) {
        const k = `${h.peca_id}|${h.etapa_para}`; const d = String(h.data_inicio || "").slice(0, 10);
        if (d && (!entrada.has(k) || d > entrada.get(k)!)) entrada.set(k, d);
      }
      const grupos = new Map<string, any[]>();
      for (const x of pecas) {
        const desde = entrada.get(`${x.id}|${x.etapa}`) || String(x.updated_at || "").slice(0, 10);
        if (!desde) continue;
        const idade = diasEntre(desde, hoje);
        if (idade < dias) continue;
        const k = `${x.obra_id}|${x.etapa}`;
        if (!grupos.has(k)) grupos.set(k, []);
        grupos.get(k)!.push({ ...x, idade });
      }
      return [...grupos.entries()].map(([k, lista]) => {
        const [obra, etapa] = k.split("|");
        const total = lista.reduce((s, x) => s + num(x.peso_total), 0);
        const ex = lista.sort((a2, b2) => b2.idade - a2.idade).slice(0, 5).map((x) => `${x.marca || x.codigo || x.id} (${x.idade}d)`).join(", ");
        return {
          chave: `${k}|${semana(hoje)}`, obra_id: obra, link: "/KanbanProducaoIntegrado", valor: total,
          titulo: `${lista.length} peça(s) parada(s) em ${ETAPA_ROTULO[etapa] || etapa} — ${nomeObra(obra)}`,
          detalhe: `${kg(total)} há ${dias}+ dias. Mais antigas: ${ex}.`,
        };
      });
    }
    case "conta_vencendo":
    case "conta_vencida": {
      const dias = num(p.dias) || 7;
      const desp = (await todas<any>(() => db.from("lancamentos_despesas").select("id, obra_id, descricao, fornecedor, valor, status, data_vencimento")))
        .filter((d) => d.data_vencimento && STATUS_DESPESA_ABERTA(d.status) && naObra(d.obra_id))
        .filter((d) => {
          const v = String(d.data_vencimento).slice(0, 10);
          return a.gatilho === "conta_vencida" ? v < hoje : (v >= hoje && v <= somaDias(hoje, dias));
        });
      return desp.map((d) => {
        const v = String(d.data_vencimento).slice(0, 10);
        return {
          chave: `desp|${d.id}|${a.gatilho}`, obra_id: d.obra_id, link: "/DespesasPage", valor: num(d.valor),
          titulo: a.gatilho === "conta_vencida" ? `Conta vencida: ${d.fornecedor || d.descricao} — ${brl(d.valor)}` : `Vence ${fmtBR(v)}: ${d.fornecedor || d.descricao} — ${brl(d.valor)}`,
          detalhe: `${d.descricao || "-"} · vencimento ${fmtBR(v)}${d.obra_id ? " · " + nomeObra(d.obra_id) : ""}.`,
        };
      });
    }
    case "medicao_sem_recebimento": {
      const dias = num(p.dias) || 30;
      const limite = somaDias(hoje, -dias);
      const meds = (await todas<any>(() => db.from("medicoes").select("id, obra_id, numero, status, valor_bruto, data_medicao, descricao")))
        .filter((m) => MEDICAO_RECONHECIDA_NAO_PAGA(m.status) && m.data_medicao && String(m.data_medicao).slice(0, 10) <= limite && naObra(m.obra_id));
      return meds.map((m) => ({
        chave: `med|${m.id}`, obra_id: m.obra_id, link: "/ReceitasPage", valor: num(m.valor_bruto),
        titulo: `Medição #${m.numero ?? "?"} sem recebimento — ${nomeObra(m.obra_id)} (${brl(m.valor_bruto)})`,
        detalhe: `Status ${m.status} desde ${fmtBR(String(m.data_medicao).slice(0, 10))} (${diasEntre(String(m.data_medicao).slice(0, 10), hoje)} dias). Cobrar o cliente.`,
      }));
    }
    case "estoque_minimo": {
      const itens = (await todas<any>(() => db.from("estoque").select("id, obra_id, descricao, nome, quantidade, minimo, unidade")))
        .filter((e) => num(e.minimo) > 0 && num(e.quantidade) <= num(e.minimo) && naObra(e.obra_id));
      return itens.map((e) => ({
        chave: `est|${e.id}|${semana(hoje)}`, obra_id: e.obra_id, link: "/EstoquePageV2", valor: num(e.quantidade),
        titulo: `Estoque no mínimo: ${e.descricao || e.nome} (${num(e.quantidade)} ${e.unidade || ""})`,
        detalhe: `Mínimo ${num(e.minimo)} ${e.unidade || ""}. Avaliar reposição.`,
      }));
    }
    case "obra_sem_producao": {
      const dias = num(p.dias) || 7;
      const ativas = obras.filter((o) => OBRA_ATIVA(o.status) && naObra(o.id));
      if (!ativas.length) return [];
      const pecas = await todas<any>(() => db.from("pecas_producao").select("id, obra_id, etapa"));
      const obraDaPeca = new Map(pecas.map((x) => [x.id, x.obra_id]));
      const pendentes = new Set(pecas.filter((x) => !/^(enviado|entregue|finalizado)$/i.test(x.etapa || "")).map((x) => x.obra_id));
      const hist = await todas<any>(() => db.from("producao_historico").select("peca_id").gte("data_inicio", somaDias(hoje, -dias)));
      const comMov = new Set(hist.map((h) => obraDaPeca.get(h.peca_id)).filter(Boolean));
      return ativas.filter((o) => pendentes.has(o.id) && !comMov.has(o.id)).map((o) => ({
        chave: `semprod|${o.id}|${semana(hoje)}`, obra_id: o.id, link: "/BI360?aba=producao",
        titulo: `${o.nome}: sem movimentação de produção há ${dias}+ dias`,
        detalhe: "A obra tem peças pendentes de fábrica e nenhuma movimentação de etapa no período.",
      }));
    }
    case "prazo_obra": {
      const dias = num(p.dias) || 15;
      return obras.filter((o) => OBRA_ATIVA(o.status) && naObra(o.id) && o.data_prevista_fim)
        .filter((o) => { const f = String(o.data_prevista_fim).slice(0, 10); return f >= hoje && f <= somaDias(hoje, dias); })
        .map((o) => ({
          chave: `prazo|${o.id}|${o.data_prevista_fim}`, obra_id: o.id, link: "/BI360?aba=obras",
          titulo: `${o.nome}: prazo em ${fmtBR(String(o.data_prevista_fim).slice(0, 10))}`,
          detalhe: `Faltam ${diasEntre(hoje, String(o.data_prevista_fim).slice(0, 10))} dias para o prazo contratual. Verifique a previsão de término no BI 360.`,
        }));
    }
    default:
      throw new Error(`Gatilho desconhecido: ${a.gatilho}`);
  }
}

// ================= AÇÕES =================
async function agir(db: SupabaseClient, a: Automacao, novos: Disparo[], hoje: string, url: string, secret: string) {
  const feitos: Record<string, number> = {};
  for (const acao of a.acoes || []) {
    const tipo = String(acao.tipo || "");
    if (tipo === "notificar") {
      const titulo = novos.length === 1 ? novos[0].titulo : `${a.nome}: ${novos.length} ocorrência(s)`;
      const mensagem = novos.slice(0, 6).map((d) => `• ${d.titulo}`).join("\n") + (novos.length > 6 ? `\n… e mais ${novos.length - 6}` : "");
      const { error } = await db.from("notificacoes").insert({
        titulo, mensagem, severidade: String(acao.severidade || "medio"), link: novos[0].link,
        obra_id: novos.length === 1 ? novos[0].obra_id : a.obra_id, origem: "automacao", origem_ref: a.id,
        destino_role: acao.destino_role || null,
      });
      if (error) throw error;
      feitos.notificacoes = (feitos.notificacoes || 0) + 1;
    } else if (tipo === "criar_tarefa") {
      const prazo = num(acao.prazo_dias) || 3;
      const linhas = novos.slice(0, 25).map((d) => ({
        titulo: d.titulo.slice(0, 200), descricao: d.detalhe, obra_id: d.obra_id,
        prioridade: String(acao.prioridade || "alta"), status: "pendente", responsavel: acao.responsavel || null,
        data_inicio: hoje, data_fim: somaDias(hoje, prazo), origem: "automacao", origem_ref: `${a.id}|${d.chave}`,
      }));
      const { error } = await db.from("tarefas").upsert(linhas, { onConflict: "origem,origem_ref", ignoreDuplicates: true });
      if (error) throw error;
      feitos.tarefas = (feitos.tarefas || 0) + linhas.length;
    } else if (tipo === "push") {
      const res = await fetch(`${url}/functions/v1/send-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}`, apikey: secret },
        body: JSON.stringify({ title: a.nome, body: novos.length === 1 ? novos[0].titulo : `${novos.length} ocorrência(s)`, data: { path: novos[0].link }, filtro: { role: acao.destino_role || undefined } }),
      });
      const r = await res.json().catch(() => ({}));
      feitos.push = num((r as any).sent);
    }
  }
  return feitos;
}

// ================= RELATÓRIOS AGENDADOS (resumo) =================
async function resumoRelatorio(db: SupabaseClient, tipo: string, obraId: string | null, hoje: string) {
  const naObra = (id: string | null) => !obraId || id === obraId;
  const out: Record<string, unknown> = { data: hoje };
  if (["producao", "executivo"].includes(tipo)) {
    const pecas = (await todas<any>(() => db.from("pecas_producao").select("id, obra_id, etapa, peso_total"))).filter((x) => naObra(x.obra_id));
    const porEtapa: Record<string, { pecas: number; kg: number }> = {};
    for (const x of pecas) { const e = x.etapa || "aguardando"; porEtapa[e] = porEtapa[e] || { pecas: 0, kg: 0 }; porEtapa[e].pecas++; porEtapa[e].kg += num(x.peso_total); }
    Object.values(porEtapa).forEach((v) => { v.kg = Math.round(v.kg); });
    const peso = new Map(pecas.map((x) => [x.id, num(x.peso_total)]));
    const hist = await todas<any>(() => db.from("producao_historico").select("peca_id, etapa_de, etapa_para").gte("data_inicio", somaDias(hoje, -7)));
    const prontas = hist.filter((h) => /^(expedido|enviado|entregue)$/.test(h.etapa_para || "") && !/^(expedido|enviado|entregue)$/.test(h.etapa_de || "") && peso.has(h.peca_id));
    out.producao = { por_etapa: porEtapa, kg_prontos_7d: Math.round(prontas.reduce((s, h) => s + (peso.get(h.peca_id) || 0), 0)), movimentacoes_7d: hist.filter((h) => peso.has(h.peca_id)).length };
  }
  if (["financeiro", "executivo"].includes(tipo)) {
    const desp = (await todas<any>(() => db.from("lancamentos_despesas").select("valor, status, data_vencimento, obra_id")))
      .filter((d) => STATUS_DESPESA_ABERTA(d.status) && (obraId ? d.obra_id === obraId : !d.obra_id));
    const venc = desp.filter((d) => d.data_vencimento && String(d.data_vencimento).slice(0, 10) < hoje);
    const sem = desp.filter((d) => { const v = String(d.data_vencimento || "").slice(0, 10); return v >= hoje && v <= somaDias(hoje, 7); });
    const meds = (await todas<any>(() => db.from("medicoes").select("valor_bruto, status, data_medicao, obra_id"))).filter((m) => naObra(m.obra_id));
    const mes = hoje.slice(0, 7);
    out.financeiro = {
      regra: obraId ? "somente a obra" : "caixa da empresa (despesas sem obra)",
      a_pagar_vencido: Math.round(venc.reduce((s, d) => s + num(d.valor), 0)), qtd_vencidas: venc.length,
      a_pagar_7d: Math.round(sem.reduce((s, d) => s + num(d.valor), 0)),
      a_receber_medicoes: Math.round(meds.filter((m) => MEDICAO_RECONHECIDA_NAO_PAGA(m.status)).reduce((s, m) => s + num(m.valor_bruto), 0)),
      faturado_mes: Math.round(meds.filter((m) => /^(aprovad|faturad|pag)/i.test(m.status || "") && String(m.data_medicao || "").startsWith(mes)).reduce((s, m) => s + num(m.valor_bruto), 0)),
    };
  }
  if (["estoque", "executivo"].includes(tipo)) {
    const est = (await todas<any>(() => db.from("estoque").select("quantidade, minimo, preco, obra_id"))).filter((e) => !obraId || !e.obra_id || e.obra_id === obraId);
    out.estoque = {
      itens: est.length,
      em_alerta: est.filter((e) => num(e.minimo) > 0 && num(e.quantidade) <= num(e.minimo)).length,
      zerados: est.filter((e) => num(e.quantidade) <= 0).length,
      valor_total: Math.round(est.reduce((s, e) => s + num(e.quantidade) * num(e.preco), 0)),
    };
  }
  return out;
}

const devidoAgora = (ag: any, agora: Date) => {
  const hora = agora.getUTCHours(); const dia = agora.getUTCDate(); const dow = ((agora.getUTCDay() + 6) % 7) + 1; // 1=seg
  if (!ag.ativo || num(ag.hora) !== hora) return false;
  if (ag.frequencia === "semanal" && num(ag.dia_semana || 1) !== dow) return false;
  if (ag.frequencia === "mensal" && num(ag.dia_mes || 1) !== dia) return false;
  const hoje = isoDia(agora);
  if (ag.ultima_execucao) {
    const ult = isoDia(new Date(Date.parse(ag.ultima_execucao) - 3 * 3600 * 1000));
    if (ult >= hoje) return false;
  }
  return true;
};

const TITULO_REL: Record<string, string> = { executivo: "Resumo executivo", producao: "Produção", financeiro: "Financeiro", estoque: "Estoque" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const URL_SB = Deno.env.get("SUPABASE_URL")!;
  const SECRET = (Deno.env.get("MONTEX_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;
  const db = createClient(URL_SB, SECRET);

  // ---- Autorização: cron (x-push-key do Vault) OU usuário logado ----
  let quem = "cron";
  const sentKey = req.headers.get("x-push-key") || "";
  if (sentKey) {
    const { data: esperado } = await db.rpc("get_push_key");
    if (!esperado || sentKey !== String(esperado)) return json({ erro: "unauthorized" }, 401);
  } else {
    const auth = req.headers.get("Authorization") || "";
    const { data: u } = await createClient(URL_SB, Deno.env.get("SUPABASE_ANON_KEY")!).auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!u?.user?.id) return json({ erro: "Faça login para executar automações." }, 401);
    quem = u.user.email || u.user.id;
  }

  let body: { modo?: string; automacao_id?: string } = {};
  try { body = await req.json(); } catch { /* corpo vazio */ }
  const modo = body.modo || (quem === "cron" ? "agendado" : "manual");
  const agora = agoraBRT();
  const hoje = isoDia(agora);

  let q = db.from("automacoes").select("*").eq("ativa", true);
  if (body.automacao_id) q = db.from("automacoes").select("*").eq("id", body.automacao_id);
  const { data: autos, error: e1 } = await q;
  if (e1) return json({ erro: e1.message }, 500);

  const resultados: unknown[] = [];
  for (const a of (autos || []) as Automacao[]) {
    try {
      const disparos = await avaliar(db, a, hoje);
      if (modo === "teste") { resultados.push({ automacao: a.nome, ocorrencias: disparos.length, exemplos: disparos.slice(0, 10) }); continue; }
      // Dedup: só ocorrências nunca disparadas por esta automação
      let novos: Disparo[] = [];
      if (disparos.length) {
        const ja = await todas<any>(() => db.from("automacoes_disparos").select("chave").eq("automacao_id", a.id), "chave");
        const set = new Set(ja.map((x: any) => x.chave));
        novos = disparos.filter((d) => !set.has(d.chave));
      }
      let feitos = {};
      if (novos.length) {
        feitos = await agir(db, a, novos, hoje, URL_SB, SECRET);
        await db.from("automacoes_disparos").upsert(novos.map((d) => ({ automacao_id: a.id, chave: d.chave })), { onConflict: "automacao_id,chave", ignoreDuplicates: true });
      }
      await db.from("automacoes_log").insert({
        automacao_id: a.id, origem: modo === "manual" ? "manual" : "agendada", status: novos.length ? "ok" : "sem_disparo",
        disparos: novos.length, detalhes: { ocorrencias: disparos.length, novas: novos.length, acoes: feitos, por: quem, exemplos: novos.slice(0, 5).map((d) => d.titulo) },
      });
      await db.from("automacoes").update({ ultima_execucao: new Date().toISOString() }).eq("id", a.id);
      resultados.push({ automacao: a.nome, ocorrencias: disparos.length, novas: novos.length, acoes: feitos });
    } catch (err) {
      const msg = String((err as Error)?.message || err);
      if (modo !== "teste") await db.from("automacoes_log").insert({ automacao_id: a.id, origem: modo === "manual" ? "manual" : "agendada", status: "erro", erro: msg });
      resultados.push({ automacao: a.nome, erro: msg });
    }
  }

  // ---- Relatórios agendados (só na execução horária) ----
  const relatorios: unknown[] = [];
  if (modo === "agendado") {
    const { data: ags } = await db.from("relatorios_agendamentos").select("*").eq("ativo", true);
    const obras = (await db.from("obras").select("id, nome")).data || [];
    for (const ag of ags || []) {
      if (!devidoAgora(ag, agora)) continue;
      try {
        const resumo = await resumoRelatorio(db, ag.tipo, ag.obra_id, hoje);
        const rotulo = ag.obra_id ? (obras.find((o: any) => o.id === ag.obra_id)?.nome || ag.obra_id) : "Geral";
        const { data: hist, error } = await db.from("relatorios_historico").insert({
          tipo: ag.tipo, titulo: `${ag.nome} — ${fmtBR(hoje)}`, obra_id: ag.obra_id, escopo_rotulo: rotulo, formato: "resumo",
          origem: "agendado", agendamento_id: ag.id, resumo, gerado_por_nome: "Agendamento",
        }).select("id").single();
        if (error) throw error;
        await db.from("notificacoes").insert({
          titulo: `Relatório pronto: ${ag.nome}`, mensagem: `${TITULO_REL[ag.tipo] || ag.tipo} · ${rotulo} · ${fmtBR(hoje)}`,
          severidade: "info", link: `/CentralRelatorios?historico=${hist!.id}`, obra_id: ag.obra_id, origem: "relatorio", origem_ref: String(hist!.id), destino_role: ag.destino_role || null,
        });
        await db.from("relatorios_agendamentos").update({ ultima_execucao: new Date().toISOString() }).eq("id", ag.id);
        relatorios.push({ agendamento: ag.nome, historico_id: hist!.id });
      } catch (err) {
        relatorios.push({ agendamento: ag.nome, erro: String((err as Error)?.message || err) });
      }
    }
  }

  return json({ modo, hoje, automacoes: resultados, relatorios });
});
