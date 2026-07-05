// src/modules/paredePronta/useParedePronta.js
// Lógica do módulo Parede-Pronta R5 — casa -> 16 paredes -> W1..W6 -> expedição -> campo
// Regra de ouro: O SCAN É O DADO. Cada bipe grava um pp_eventos com timestamp.
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../api/supabaseClient";

export const ESTACOES = ["FILA","W1","W2","W3","W4","W5","W6","EXPEDIDA","RECEBIDA","INSTALADA"];
export const ROTULOS = {
  FILA:"Fila", W1:"W1 Quadro", W2:"W2 Núcleo+MEP", W3:"W3 Placas",
  W4:"W4 Esquadria", W5:"W5 Pintura", W6:"W6 Passaporte",
  EXPEDIDA:"Expedida", RECEBIDA:"No site", INSTALADA:"Instalada",
};

export function useParedePronta() {
  const [casas, setCasas] = useState([]);
  const [casaId, setCasaId] = useState(null);
  const [paredes, setParedes] = useState([]);
  const [kits, setKits] = useState([]);
  const [takt, setTakt] = useState([]);
  const [erro, setErro] = useState(null);

  const carregarCasas = useCallback(async () => {
    const { data, error } = await supabase.from("pp_casas").select("*").order("numero");
    if (error) return setErro(error.message);
    setCasas(data || []);
    if (!casaId && data?.length) setCasaId(data[0].id);
  }, [casaId]);

  const carregarCasa = useCallback(async (id) => {
    if (!id) return;
    const [p, k, t] = await Promise.all([
      supabase.from("pp_paredes").select("*").eq("casa_id", id).order("ordem_montagem"),
      supabase.from("pp_kits").select("*").eq("casa_id", id).order("codigo"),
      supabase.from("pp_v_takt").select("*"),
    ]);
    if (p.error) return setErro(p.error.message);
    setParedes(p.data || []); setKits(k.data || []); setTakt(t.data || []);
  }, []);

  useEffect(() => { carregarCasas(); }, [carregarCasas]);
  useEffect(() => { carregarCasa(casaId); }, [casaId, carregarCasa]);

  // realtime: kanban acompanha bipes de outros operadores
  useEffect(() => {
    if (!casaId) return;
    const ch = supabase.channel("pp_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "pp_paredes",
        filter: `casa_id=eq.${casaId}` }, () => carregarCasa(casaId))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [casaId, carregarCasa]);

  /** Decide a AÇÃO do bipe pelo estado atual da parede (máquina de estados do chão de fábrica) */
  const proximaAcao = useCallback(async (parede) => {
    const est = parede.estacao_atual;
    if (est === "FILA") return { tipo: "inicio_estacao", ref: "W1", rotulo: "Iniciar W1 · Quadro", prox: "W1" };
    if (est?.startsWith("W")) {
      const n = parseInt(est[1]);
      // há um início aberto nesta estação?
      const { data } = await supabase.from("pp_eventos")
        .select("tipo").eq("parede_id", parede.id).eq("ref", est)
        .order("criado_em", { ascending: false }).limit(1);
      const aberto = data?.[0]?.tipo === "inicio_estacao";
      if (aberto) return { tipo: "fim_estacao", ref: est, rotulo: `Concluir ${ROTULOS[est]}`, prox: est };
      if (n < 6)  return { tipo: "inicio_estacao", ref: `W${n+1}`, rotulo: `Iniciar ${ROTULOS[`W${n+1}`]}`, prox: `W${n+1}` };
      return { tipo: "carga", ref: "EXPEDICAO", rotulo: "Bipar CARGA (carreta)", prox: "EXPEDIDA" };
    }
    if (est === "EXPEDIDA") return { tipo: "descarga", ref: "SITE", rotulo: "Bipar DESCARGA (site)", prox: "RECEBIDA" };
    if (est === "RECEBIDA") return { tipo: "fim_passo", ref: parede.ordem_montagem, rotulo: `Instalada (passo ${parede.ordem_montagem})`, prox: "INSTALADA" };
    return null; // INSTALADA: nada a fazer
  }, []);

  /** Executa o bipe: grava evento + avança estacao_atual (atômico na prática do fluxo) */
  const executarBipe = useCallback(async (parede, acao, usuario) => {
    const { error: e1 } = await supabase.from("pp_eventos").insert({
      casa_id: parede.casa_id, parede_id: parede.id,
      tipo: acao.tipo, ref: acao.ref, usuario: usuario || "operador",
    });
    if (e1) { setErro(e1.message); return false; }
    if (acao.prox !== parede.estacao_atual) {
      const { error: e2 } = await supabase.from("pp_paredes")
        .update({ estacao_atual: acao.prox }).eq("id", parede.id);
      if (e2) { setErro(e2.message); return false; }
    }
    await carregarCasa(parede.casa_id);
    return true;
  }, [carregarCasa]);

  /** Bipe de KIT: expedição -> recebimento */
  const biparKit = useCallback(async (kit, usuario) => {
    const campo = !kit.conferido_expedicao ? "conferido_expedicao" : "conferido_recebimento";
    await supabase.from("pp_kits").update({ [campo]: true }).eq("id", kit.id);
    await supabase.from("pp_eventos").insert({
      casa_id: kit.casa_id, kit_id: kit.id,
      tipo: campo === "conferido_expedicao" ? "carga" : "descarga",
      ref: kit.codigo, usuario: usuario || "operador",
    });
    await carregarCasa(kit.casa_id);
  }, [carregarCasa]);

  /** Resolve um QR lido (MTX-C0001-F1 · MTX-C0001-KIT-COB · MTX-CASA-0001) */
  const resolverQR = useCallback((codigo) => {
    const c = (codigo || "").trim().toUpperCase();
    if (c.startsWith("MTX-CASA-")) return { tipo: "casa", casa: casas.find(x => x.qr_code === c) };
    const kit = kits.find(k => k.qr_code === c);
    if (kit) return { tipo: "kit", kit };
    const parede = paredes.find(p => p.qr_code === c);
    if (parede) return { tipo: "parede", parede };
    return { tipo: "desconhecido", codigo: c };
  }, [casas, kits, paredes]);

  /** Registro rápido de ocorrência (NC / retoque / divergência) — dado do piloto */
  const registrarOcorrencia = useCallback(async (parede, tipo, payload, usuario) => {
    await supabase.from("pp_eventos").insert({
      casa_id: parede.casa_id, parede_id: parede.id, tipo,
      ref: parede.estacao_atual, payload: payload || {}, usuario: usuario || "operador",
    });
  }, []);

  return { casas, casaId, setCasaId, paredes, kits, takt, erro, setErro,
           proximaAcao, executarBipe, biparKit, resolverQR, registrarOcorrencia };
}
