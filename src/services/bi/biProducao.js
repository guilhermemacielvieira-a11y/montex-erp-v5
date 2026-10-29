// ============================================================
// BI — Produção: ritmo (kg/semana), lead time por etapa, WIP e gargalo
// ============================================================
// Fonte: producao_historico (cada linha = peça passou de etapa_de → etapa_para
// em data_inicio) + pecas_producao (peso, obra, etapa atual).
// ============================================================

import {
  num, r1, dataLocal, diasEntre, chaveSemana, semanasEntre, somaDias, mediana, percentil, media,
  etapaCanonica, ordemFluxo, pesoPeca, obraDe, ETAPAS_FABRICA, ETAPAS_FLUXO,
} from './biCore';

// Movimento parcial gravado pelo Kanban em observacoes: "[QTD:movida/total]".
// Marca de etapa "não se aplica" gravada pelo lançamento: "[NA]".
export const MARCA_NA = '[NA]';
const RE_NA = /\[NA\]/i;
const RE_QTD = /\[QTD:\s*(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*\]/i;
export function qtdMovida(obs) {
  const m = String(obs || '').match(RE_QTD);
  if (!m) return null;
  const q = Number(m[1].replace(',', '.'));
  return Number.isFinite(q) && q > 0 ? q : null;
}

/**
 * Normaliza o histórico de produção e devolve também um diagnóstico.
 *
 * O histórico tem ruído real que inflava o peso produzido:
 *  - linhas DUPLICADAS (mesma peça, mesmo movimento, mesmo dia, mesmo
 *    funcionário e mesma quantidade) — gravadas mais de uma vez;
 *  - movimentos PARCIAIS "[QTD:x/y]" — só x unidades avançaram;
 *  - peças divididas (__split_*) que herdam o histórico da peça-mãe e
 *    idas-e-voltas de etapa.
 * Regras: remove duplicatas exatas; kg = unidades movidas × peso unitário;
 * cada peça só pode CONCLUIR uma etapa até a sua quantidade atual (o que
 * passar disso é excedente e vale 0 kg).
 */
export function normalizarHistorico(historico = [], pecas = []) {
  const porId = new Map((pecas || []).map((p) => [p.id, p]));
  const diag = { brutos: 0, orfaos: 0, semData: 0, duplicados: 0, excedentes: 0, kgExcedente: 0, retrocessos: 0, validos: 0, naoAplica: 0 };
  // Etapas marcadas "não se aplica" no lançamento (ex.: terça que vai da
  // fabricação direto para a pintura, sem solda): chave `${peçaBase}|${etapa}`.
  const naoAplica = new Set();
  const base = [];
  (historico || []).forEach((h, i) => {
    diag.brutos += 1;
    const p = porId.get(h.peca_id ?? h.pecaId);
    if (!p) { diag.orfaos += 1; return; }
    const data = dataLocal(h.data_inicio ?? h.dataInicio ?? h.created_at ?? h.createdAt);
    if (!data) { diag.semData += 1; return; }
    base.push({ h, p, data, i });
  });
  base.sort((a, b) => a.data - b.data || a.i - b.i);

  const vistos = new Set();
  const vistosNA = new Set();
  const usado = new Map(); // `${peca}|${etapaDe}` → unidades já concluídas
  const out = [];
  // Movimentos físicos gravados como "não se aplica" (ex.: terça que passa
  // da solda para a pintura sem soldar). Não são produção do setor, mas a
  // peça MUDOU de etapa — quem mede entrada em pintura (custo/kg) usa isto.
  const passagensNA = [];
  base.forEach(({ h, p, data }) => {
    const de = etapaCanonica(h.etapa_de ?? h.etapaDe);
    const para = etapaCanonica(h.etapa_para ?? h.etapaPara);
    const funcionario = (h.funcionario_nome ?? h.funcionarioNome ?? '').replace(/\s+/g, ' ').trim() || null;
    const funcionarioId = h.funcionario_id ?? h.funcionarioId ?? null;
    const obs = h.observacoes ?? h.observacao ?? '';
    if (RE_NA.test(String(obs))) {
      naoAplica.add(`${pecaBase(p.id)}|${de}`);
      diag.naoAplica += 1;
      const tokNA = String(obs).match(RE_QTD)?.[0] || '';
      const chaveNA = `${p.id}|${de}|${para}|${data.getFullYear()}-${data.getMonth()}-${data.getDate()}|${tokNA}`;
      if (ordemFluxo(para) > ordemFluxo(de) && !vistosNA.has(chaveNA)) {
        vistosNA.add(chaveNA);
        const qtdPecaNA = Math.max(1, num(p.quantidade) || 1);
        const qtdNA = Math.min(qtdMovida(obs) ?? qtdPecaNA, qtdPecaNA);
        passagensNA.push({ pecaId: p.id, obraId: obraDe(p), de, para, data, qtd: qtdNA, kg: qtdNA * (pesoPeca(p) / qtdPecaNA), naoAplica: true, kgFisico: qtdNA * (pesoPeca(p) / qtdPecaNA), qtdFisica: qtdNA });
      }
      return;
    }
    const tok = String(obs).match(RE_QTD)?.[0] || '';
    // Conjunto lançado pela aba Lançamentos (id HIST-<peça>__cN-<etapa>) é um
    // registro próprio, não duplicata de outro conjunto da mesma peça.
    const conj = String(h.id || '').match(/__c(\d+)-/)?.[1] || '';
    const chave = `${p.id}|${de}|${para}|${data.getFullYear()}-${data.getMonth()}-${data.getDate()}|${funcionario || ''}|${tok}|${conj}`;
    if (vistos.has(chave)) { diag.duplicados += 1; return; }
    vistos.add(chave);

    const qtdPeca = Math.max(1, num(p.quantidade) || 1);
    const kgPeca = pesoPeca(p);
    const unit = kgPeca / qtdPeca;
    const informada = Math.min(qtdMovida(obs) ?? qtdPeca, qtdPeca);
    const avancou = ordemFluxo(para) > ordemFluxo(de);
    let qtd = informada;
    if (avancou) {
      const k = `${p.id}|${de}`;
      const ja = usado.get(k) || 0;
      qtd = Math.max(0, Math.min(informada, qtdPeca - ja));
      usado.set(k, ja + qtd);
      if (qtd < informada) { diag.excedentes += 1; diag.kgExcedente += (informada - qtd) * unit; }
    } else {
      diag.retrocessos += 1;
    }
    diag.validos += 1;
    out.push({
      pecaId: p.id,
      obraId: obraDe(p),
      marca: p.marca || p.codigo || p.nome || p.id,
      tipo: p.tipo || null,
      de,
      para,
      data,
      qtd,
      kg: qtd * unit,
      funcionario,
      funcionarioId,
    });
  });
  // Etapa "não se aplica": a passagem pela etapa não é produção de ninguém
  if (naoAplica.size) {
    out.forEach((t) => {
      if (ordemFluxo(t.para) > ordemFluxo(t.de) && naoAplica.has(`${pecaBase(t.pecaId)}|${t.de}`)) {
        // Guarda o movimento físico: quem mede ENTRADA em pintura (custo/kg)
        // precisa do peso mesmo quando a etapa de origem "não se aplica".
        t.kgFisico = t.kg; t.qtdFisica = t.qtd;
        t.kg = 0; t.qtd = 0; t.naoAplica = true;
      }
    });
  }
  diag.kgExcedente = r1(diag.kgExcedente);
  return { transicoes: out, diag, naoAplica, passagensNA };
}

/** Peça original de uma peça dividida (PEC-1__split_... → PEC-1). */
export const pecaBase = (id) => String(id || '').replace(/__split_.*$/, '');

/** A etapa foi marcada "não se aplica" para a peça (ou para a peça-mãe)? */
export const etapaNaoSeAplica = (naoAplica, pecaId, etapa) => !!naoAplica?.has(`${pecaBase(pecaId)}|${etapa}`);

/** Transições normalizadas, já ligadas à peça (peso/obra). Ignora órfãs. */
export function transicoesComPeca(historico = [], pecas = []) {
  return normalizarHistorico(historico, pecas).transicoes;
}

/**
 * Ritmo semanal: kg que CONCLUÍRAM cada etapa da fábrica por semana.
 * Concluir fabricação = entrar em solda; solda = entrar em pintura;
 * pintura (peça pronta) = entrar em expedido ou além.
 */
export function ritmoSemanal(transicoes = [], { hoje = new Date(), semanas = 12 } = {}) {
  const fim = hoje;
  const ini = somaDias(hoje, -7 * (semanas - 1));
  const chaves = semanasEntre(ini, fim);
  const linhas = new Map(chaves.map((k) => [k, { semana: k, fabricacao: 0, solda: 0, pintura: 0 }]));
  const etapaConcluida = (t) => {
    const o = ordemFluxo(t.para);
    const od = ordemFluxo(t.de);
    // Conta a etapa que a peça DEIXOU (de), se for de fábrica e avançou
    if (o <= od) return null;
    return ETAPAS_FABRICA.includes(t.de) ? t.de : null;
  };
  transicoes.forEach((t) => {
    const e = etapaConcluida(t);
    if (!e) return;
    const k = chaveSemana(t.data);
    const l = linhas.get(k);
    if (l) l[e] += t.kg;
  });
  return chaves.map((k) => {
    const l = linhas.get(k);
    return { ...l, fabricacao: r1(l.fabricacao), solda: r1(l.solda), pintura: r1(l.pintura) };
  });
}

/** Tendência do ritmo de peças prontas (pintura concluída): últimas N vs N anteriores. */
export function tendenciaRitmo(ritmo = [], janela = 4) {
  const v = ritmo.map((r) => r.pintura);
  const atual = v.slice(-janela);
  const anterior = v.slice(-2 * janela, -janela);
  const mA = media(atual) ?? 0;
  const mB = media(anterior) ?? 0;
  return {
    kgSemanaAtual: r1(mA),
    kgSemanaAnterior: r1(mB),
    variacaoPct: mB > 0 ? r1(((mA - mB) / mB) * 100) : null,
  };
}

/**
 * Lead time por etapa (dias): tempo entre ENTRAR na etapa e SAIR dela,
 * por peça. Mediana e p90 por etapa de fábrica.
 */
export function leadTimeEtapas(transicoes = []) {
  const porPeca = new Map();
  transicoes.forEach((t) => {
    if (!porPeca.has(t.pecaId)) porPeca.set(t.pecaId, []);
    porPeca.get(t.pecaId).push(t);
  });
  const dur = { fabricacao: [], solda: [], pintura: [] };
  porPeca.forEach((lista) => {
    const entrou = {};
    lista.forEach((t) => {
      if (ETAPAS_FABRICA.includes(t.de) && entrou[t.de]) {
        const d = diasEntre(entrou[t.de], t.data);
        if (d >= 0 && d < 365) dur[t.de].push(d);
      }
      entrou[t.para] = t.data;
    });
  });
  return ETAPAS_FABRICA.map((e) => ({
    etapa: e,
    amostras: dur[e].length,
    medianaDias: dur[e].length ? r1(mediana(dur[e])) : null,
    p90Dias: dur[e].length ? r1(percentil(dur[e], 90)) : null,
  }));
}

/**
 * WIP atual: peças em cada etapa com idade (dias desde que entraram nela).
 * A data de entrada vem da última transição para a etapa atual; sem
 * histórico, usa updated_at (aproximação).
 */
export function wipAtual(pecas = [], transicoes = [], { hoje = new Date() } = {}) {
  const entrada = new Map();
  transicoes.forEach((t) => { entrada.set(`${t.pecaId}|${t.para}`, t.data); });
  const porEtapa = {};
  ETAPAS_FLUXO.forEach((e) => { porEtapa[e] = { etapa: e, pecas: 0, kg: 0, idades: [] }; });
  const itens = [];
  (pecas || []).forEach((p) => {
    const e = etapaCanonica(p.etapa);
    const kg = pesoPeca(p);
    porEtapa[e].pecas += 1;
    porEtapa[e].kg += kg;
    if (!ETAPAS_FABRICA.includes(e)) return;
    const desde = entrada.get(`${p.id}|${e}`) || dataLocal(p.updatedAt ?? p.updated_at);
    const idade = desde ? diasEntre(desde, hoje) : null;
    if (idade !== null) porEtapa[e].idades.push(idade);
    itens.push({ id: p.id, marca: p.marca || p.codigo || p.nome || p.id, obraId: obraDe(p), etapa: e, kg, idadeDias: idade, desde });
  });
  const resumo = ETAPAS_FLUXO.map((e) => {
    const r = porEtapa[e];
    return { etapa: e, pecas: r.pecas, kg: r1(r.kg), idadeMedianaDias: r.idades.length ? r1(mediana(r.idades)) : null };
  });
  return { resumo, itens };
}

/**
 * Gargalo: etapa de fábrica com mais "semanas de fila" = kg em WIP ÷ ritmo
 * médio de saída da etapa (últimas 4 semanas). Quanto maior, mais travada.
 */
export function gargalo(wipResumo = [], ritmo = []) {
  const ult = ritmo.slice(-4);
  const linhas = ETAPAS_FABRICA.map((e) => {
    const wip = wipResumo.find((w) => w.etapa === e)?.kg || 0;
    const saida = media(ult.map((r) => r[e])) || 0;
    const semanasFila = saida > 0 ? wip / saida : (wip > 0 ? Infinity : 0);
    return { etapa: e, wipKg: r1(wip), saidaKgSemana: r1(saida), semanasFila: Number.isFinite(semanasFila) ? r1(semanasFila) : null, travada: wip > 0 && saida === 0 };
  });
  const pior = [...linhas].sort((a, b) => {
    const va = a.travada ? Infinity : (a.semanasFila ?? 0);
    const vb = b.travada ? Infinity : (b.semanasFila ?? 0);
    return vb - va;
  })[0];
  return { linhas, etapa: pior && (pior.travada || (pior.semanasFila || 0) > 0) ? pior.etapa : null };
}

/** Ranking de produtividade por funcionário (kg concluídos no período). */
export function produtividadeFuncionarios(transicoes = [], { hoje = new Date(), dias = 30 } = {}) {
  const ini = somaDias(hoje, -dias);
  const mapa = new Map();
  transicoes.forEach((t) => {
    if (t.data < ini || !t.funcionario || !(t.kg > 0)) return;
    if (!ETAPAS_FABRICA.includes(t.de) || ordemFluxo(t.para) <= ordemFluxo(t.de)) return;
    const k = t.funcionario;
    if (!mapa.has(k)) mapa.set(k, { funcionario: k, kg: 0, pecas: 0, etapas: {} });
    const m = mapa.get(k);
    m.kg += t.kg; m.pecas += 1; m.etapas[t.de] = (m.etapas[t.de] || 0) + t.kg;
  });
  return [...mapa.values()].map((m) => ({ ...m, kg: r1(m.kg) })).sort((a, b) => b.kg - a.kg);
}

/** Funil de produção (kg por etapa atual). */
export function funilProducao(pecas = []) {
  const kg = {};
  ETAPAS_FLUXO.forEach((e) => { kg[e] = 0; });
  (pecas || []).forEach((p) => { kg[etapaCanonica(p.etapa)] += pesoPeca(p); });
  return ETAPAS_FLUXO.map((e) => ({ etapa: e, kg: r1(kg[e]) }));
}

