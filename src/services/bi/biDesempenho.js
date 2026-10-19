// ============================================================
// Desempenho individual por trabalho-padrão (família × etapa)
// ============================================================
// Problema: kg não mede esforço igual entre peças. 1 kg de terça (vem no
// tamanho, só furação, sem solda) não é o mesmo esforço que 1 kg de coluna ou
// tirante (corte, furo, montagem, solda). Comparar pessoas por kg puro
// penaliza quem faz peça trabalhosa.
//
// Solução:
//  1. ROTA por família: famílias "sem solda" (padrão: Terça, Terça-TAP) não
//     contam produção na Solda — inclusive no histórico antigo, quando o
//     Kanban obrigava a peça a passar pela solda.
//  2. RITMO-PADRÃO (kg por pessoa-dia) de cada família em cada etapa,
//     calibrado com os próprios dados: mediana dos dias em que a pessoa só
//     trabalhou aquela família naquela etapa ("dias puros"). Pouca amostra →
//     usa o ritmo geral da etapa. Pode ser ajustado à mão.
//  3. FATOR DE ESFORÇO = ritmo geral da etapa ÷ ritmo da família (0,2–5);
//     kg × fator = kg EQUIVALENTE ("kg de peça média").
//  4. ÍNDICE = (kg eq ÷ dias úteis ativos) ÷ mediana dos colegas da mesma
//     etapa × 100 (100 = desempenho típico da etapa).
// ============================================================

import { r1, isoLocal, mediana, chaveSemana, semanasEntre, somaDias, inicioDoDia, ETAPAS_FABRICA } from './biCore';
import { indexarCadastro, pessoaDoEvento } from './biFuncionarios';
import { diasUteis } from './biAnaliseProducao';

export const ETAPAS_DESEMPENHO = ETAPAS_FABRICA; // fabricacao, solda, pintura
export const FAMILIAS_SEM_SOLDA_PADRAO = ['TERCA', 'TERCA-TAP'];
export const MIN_DIAS_CALIBRACAO = 5;

/** Família canônica do tipo da peça (maiúsculas, sem acento, espaços únicos). */
export function familiaDe(tipo) {
  const s = String(tipo || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  return s || 'SEM TIPO';
}

/** Rótulo bonito da família a partir de um tipo de exemplo. */
export const rotuloFamilia = (tipo) => String(tipo || 'Sem tipo').trim() || 'Sem tipo';

/** Configuração efetiva (defaults + ajustes salvos). */
export function configRotas(cfg = {}) {
  return {
    semSolda: new Set((cfg.semSolda || FAMILIAS_SEM_SOLDA_PADRAO).map(familiaDe)),
    ritmos: cfg.ritmos || {}, // { [etapa]: { [familia]: kgDia } } — ajustes manuais
    minDias: cfg.minDias || MIN_DIAS_CALIBRACAO,
  };
}

/**
 * Aplica as rotas: solda de família "sem solda" não é produção.
 * Retorna eventos com `familia` e a lista do que saiu da solda.
 */
export function aplicarRotas(eventos = [], cfg = configRotas()) {
  const removidos = { pecas: new Set(), kg: 0, eventos: 0, porPessoa: new Map() };
  const out = [];
  (eventos || []).forEach((e) => {
    const familia = familiaDe(e.tipo);
    if (e.setor === 'solda' && cfg.semSolda.has(familia)) {
      removidos.eventos += 1; removidos.kg += e.kg; if (e.pecaId) removidos.pecas.add(e.pecaId);
      const k = e.funcionario || '—';
      removidos.porPessoa.set(k, (removidos.porPessoa.get(k) || 0) + e.kg);
      return;
    }
    out.push({ ...e, familia });
  });
  return {
    eventos: out,
    removidos: {
      eventos: removidos.eventos, kg: r1(removidos.kg), pecas: removidos.pecas.size,
      porPessoa: [...removidos.porPessoa.entries()].map(([nome, kg]) => ({ nome, kg: r1(kg) })).sort((a, b) => b.kg - a.kg),
    },
  };
}

/**
 * Calibra o ritmo-padrão (kg por pessoa-dia) por etapa e família a partir dos
 * "dias puros" (pessoa trabalhou uma única família naquela etapa no dia).
 */
export function calibrarRitmos(eventos = [], funcionarios = [], { minDias = MIN_DIAS_CALIBRACAO } = {}) {
  const cad = indexarCadastro(funcionarios);
  const dias = new Map(); // `${etapa}|${pessoa}|${dia}` → { kg, familias:Set, porFam:Map }
  eventos.forEach((e) => {
    if (!ETAPAS_DESEMPENHO.includes(e.setor) || !e.data || !(e.kg > 0)) return;
    const p = pessoaDoEvento(e, cad);
    if (!p) return;
    const k = `${e.setor}|${p.id}|${isoLocal(e.data)}`;
    if (!dias.has(k)) dias.set(k, { etapa: e.setor, kg: 0, familias: new Set() });
    const d = dias.get(k);
    d.kg += e.kg; d.familias.add(e.familia || familiaDe(e.tipo));
  });
  const geral = {}; const porFam = {};
  ETAPAS_DESEMPENHO.forEach((et) => { geral[et] = []; porFam[et] = {}; });
  dias.forEach((d) => {
    geral[d.etapa].push(d.kg);
    if (d.familias.size === 1) {
      const f = [...d.familias][0];
      (porFam[d.etapa][f] = porFam[d.etapa][f] || []).push(d.kg);
    }
  });
  const out = {};
  ETAPAS_DESEMPENHO.forEach((et) => {
    out[et] = {
      geral: r1(mediana(geral[et]) || 0),
      diasGeral: geral[et].length,
      familias: Object.fromEntries(Object.entries(porFam[et]).map(([f, v]) => [f, {
        mediana: r1(mediana(v) || 0), dias: v.length, confiavel: v.length >= minDias,
      }])),
    };
  });
  return out;
}

/** Ritmo-padrão efetivo (kg/dia) e a fonte: 'ajuste' | 'dados' | 'geral'. */
export function ritmoPadrao(etapa, familia, calib, cfg = configRotas()) {
  const aj = Number(cfg.ritmos?.[etapa]?.[familia]);
  if (aj > 0) return { kgDia: aj, fonte: 'ajuste' };
  const c = calib?.[etapa]?.familias?.[familia];
  if (c?.confiavel && c.mediana > 0) return { kgDia: c.mediana, fonte: 'dados' };
  const g = calib?.[etapa]?.geral || 0;
  return { kgDia: g > 0 ? g : 1, fonte: 'geral' };
}

export const FATOR_MIN = 0.2;
export const FATOR_MAX = 5;

/**
 * Fator de esforço da família na etapa = ritmo geral da etapa ÷ ritmo da
 * família (limitado a 0,2–5). kg × fator = kg EQUIVALENTE (kg de "peça média").
 */
export function fatorEsforco(etapa, familia, calib, cfg = configRotas()) {
  const rp = ritmoPadrao(etapa, familia, calib, cfg);
  const geral = calib?.[etapa]?.geral || rp.kgDia;
  const fator = Math.min(FATOR_MAX, Math.max(FATOR_MIN, geral / rp.kgDia));
  return { fator: Math.round(fator * 100) / 100, kgDia: rp.kgDia, fonte: rp.fonte };
}

/**
 * Desempenho individual no período.
 * Produtividade = kg equivalente ÷ dias úteis ativos (desde o 1º apontamento
 * da pessoa, dentro do período). Os apontamentos são feitos em lote, por isso
 * "dias com apontamento" NÃO serve de denominador.
 * Índice = produtividade ÷ mediana dos colegas da mesma etapa principal × 100.
 */
export function desempenhoPessoas(eventos = [], funcionarios = [], {
  ini, fim, iniAnt, fimAnt, hoje = new Date(), calib, cfg = configRotas(), semanas = 8, minParticipacao = 0.05,
} = {}) {
  const cad = indexarCadastro(funcionarios);
  const primeiro = new Map(); // pessoa → 1º apontamento (todo o histórico)
  eventos.forEach((e) => {
    if (!ETAPAS_DESEMPENHO.includes(e.setor) || !e.data) return;
    const p = pessoaDoEvento(e, cad);
    if (p && (!primeiro.has(p.id) || e.data < primeiro.get(p.id))) primeiro.set(p.id, e.data);
  });
  const diasAtivos = (pid, de, ate) => {
    const p1 = primeiro.get(pid);
    const ini2 = p1 && p1 > de ? p1 : de;
    return Math.max(1, diasUteis(ini2, ate, hoje));
  };

  const acumular = (de, ate) => {
    const mapa = new Map();
    eventos.forEach((e) => {
      if (!ETAPAS_DESEMPENHO.includes(e.setor) || !e.data || e.data < de || e.data > ate || !(e.kg > 0)) return;
      const p = pessoaDoEvento(e, cad);
      if (!p) return;
      if (!mapa.has(p.id)) mapa.set(p.id, { pessoa: p, kg: 0, kgEq: 0, unidades: 0, pecas: new Set(), dias: new Set(), porEtapa: {}, porFam: new Map() });
      const m = mapa.get(p.id);
      const fam = e.familia || familiaDe(e.tipo);
      const fe = fatorEsforco(e.setor, fam, calib, cfg);
      const eq = e.kg * fe.fator;
      m.kg += e.kg; m.kgEq += eq; m.unidades += e.qtd || 0;
      if (e.pecaId) m.pecas.add(e.pecaId);
      m.dias.add(isoLocal(e.data));
      m.porEtapa[e.setor] = (m.porEtapa[e.setor] || 0) + eq;
      const kf = `${e.setor}|${fam}`;
      if (!m.porFam.has(kf)) m.porFam.set(kf, { etapa: e.setor, familia: fam, rotulo: rotuloFamilia(e.tipo), kg: 0, kgEq: 0, unidades: 0, pecas: new Set(), fator: fe.fator, fonte: fe.fonte });
      const f = m.porFam.get(kf);
      f.kg += e.kg; f.kgEq += eq; f.unidades += e.qtd || 0; if (e.pecaId) f.pecas.add(e.pecaId);
    });
    mapa.forEach((m, pid) => { m.diasUteis = diasAtivos(pid, de, ate); m.prod = m.kgEq / m.diasUteis; });
    return mapa;
  };
  const atual = acumular(ini, fim);
  const ant = iniAnt && fimAnt ? acumular(iniAnt, fimAnt) : new Map();

  const etapaDe = (m) => Object.entries(m.porEtapa).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  // Referência (índice 100) = mediana dos produtores REGULARES da etapa (≥ 5%
  // do trabalho da etapa). Quem aponta de vez em quando não puxa a régua.
  const regularesPor = (mapa) => {
    const tot = {};
    mapa.forEach((m) => { const et = etapaDe(m); tot[et] = (tot[et] || 0) + m.kgEq; });
    const reg = new Set();
    mapa.forEach((m, pid) => { const et = etapaDe(m); if (tot[et] > 0 && m.kgEq / tot[et] >= minParticipacao) reg.add(pid); });
    return reg;
  };
  const medianaPor = (mapa, reg) => {
    const out = {};
    ETAPAS_DESEMPENHO.forEach((et) => { out[et] = mediana([...mapa.entries()].filter(([pid, m]) => etapaDe(m) === et && reg.has(pid)).map(([, m]) => m.prod)) || 0; });
    return out;
  };
  const regulares = regularesPor(atual);
  const med = medianaPor(atual, regulares);
  const medAnt = medianaPor(ant, regularesPor(ant));

  // tendência: kg equivalente por semana
  const iniSem = somaDias(inicioDoDia(fim), -7 * (semanas - 1));
  const chaves = semanasEntre(iniSem, fim);
  const semMapa = new Map();
  eventos.forEach((e) => {
    if (!ETAPAS_DESEMPENHO.includes(e.setor) || !e.data || e.data < iniSem || e.data > fim || !(e.kg > 0)) return;
    const p = pessoaDoEvento(e, cad);
    if (!p) return;
    const k = `${p.id}|${chaveSemana(e.data)}`;
    semMapa.set(k, (semMapa.get(k) || 0) + e.kg * fatorEsforco(e.setor, e.familia || familiaDe(e.tipo), calib, cfg).fator);
  });

  const lista = [...atual.values()].map((m) => {
    const etapaPrincipal = etapaDe(m);
    const indice = med[etapaPrincipal] > 0 ? r1((m.prod / med[etapaPrincipal]) * 100) : null;
    const a = ant.get(m.pessoa.id);
    const etA = a ? etapaDe(a) : null;
    const indiceAnt = a && medAnt[etA] > 0 ? r1((a.prod / medAnt[etA]) * 100) : null;
    const porFamilia = [...m.porFam.values()].map((f) => ({
      ...f, kg: r1(f.kg), kgEq: r1(f.kgEq), unidades: r1(f.unidades), pecas: f.pecas.size,
      pctTrabalho: m.kgEq > 0 ? r1((f.kgEq / m.kgEq) * 100) : 0,
    })).sort((x, y) => y.kgEq - x.kgEq);
    return {
      id: m.pessoa.id, nome: m.pessoa.nome, cargo: m.pessoa.cargo, equipe: m.pessoa.equipe, foraDoCadastro: !!m.pessoa.foraDoCadastro,
      etapaPrincipal, ocasional: !regulares.has(m.pessoa.id),
      kg: r1(m.kg), kgEq: r1(m.kgEq), unidades: r1(m.unidades), pecas: m.pecas.size,
      diasApontados: m.dias.size, diasUteis: m.diasUteis,
      kgEqDia: r1(m.prod), kgDia: r1(m.kg / m.diasUteis),
      indice, indiceAnt, variacaoIndice: indice != null && indiceAnt != null ? r1(indice - indiceAnt) : null,
      fatorMedio: m.kg > 0 ? Math.round((m.kgEq / m.kg) * 100) / 100 : null,
      familiaPrincipal: porFamilia[0]?.rotulo || null,
      porFamilia,
      tendencia: chaves.map((k) => ({ semana: k, kgEq: r1(semMapa.get(`${m.pessoa.id}|${k}`) || 0) })),
    };
  });

  ETAPAS_DESEMPENHO.forEach((et) => {
    const grupo = lista.filter((p) => p.etapaPrincipal === et).sort((a, b) => (b.indice || 0) - (a.indice || 0));
    grupo.forEach((p, i) => { p.posicao = i + 1; p.totalEtapa = grupo.length; });
  });
  return lista.sort((a, b) => b.kgEq - a.kgEq);
}

/** Mediana da produtividade (kg eq / dia útil) por etapa — referência do índice 100. */
export function referenciaEtapas(pessoas = []) {
  return Object.fromEntries(ETAPAS_DESEMPENHO.map((et) => {
    const g = pessoas.filter((p) => p.etapaPrincipal === et);
    const reg = g.filter((p) => !p.ocasional);
    return [et, { pessoas: g.length, regulares: reg.length, medianaKgEqDia: r1(mediana(reg.map((p) => p.kgEqDia)) || 0), kgEq: r1(g.reduce((s, p) => s + p.kgEq, 0)) }];
  }));
}

/** Resumo por família no período (para a tabela de rotas e para o setor). */
export function resumoFamilias(eventos = [], { ini, fim } = {}) {
  const mapa = new Map();
  eventos.forEach((e) => {
    if (!ETAPAS_DESEMPENHO.includes(e.setor) || !e.data || (ini && e.data < ini) || (fim && e.data > fim)) return;
    const f = e.familia || familiaDe(e.tipo);
    if (!mapa.has(f)) mapa.set(f, { familia: f, rotulo: rotuloFamilia(e.tipo), fabricacao: 0, solda: 0, pintura: 0, unidades: 0, pecas: new Set() });
    const m = mapa.get(f);
    m[e.setor] += e.kg; m.unidades += e.qtd || 0; if (e.pecaId) m.pecas.add(e.pecaId);
  });
  return [...mapa.values()].map((m) => ({ ...m, fabricacao: r1(m.fabricacao), solda: r1(m.solda), pintura: r1(m.pintura), unidades: r1(m.unidades), pecas: m.pecas.size }))
    .sort((a, b) => (b.fabricacao + b.solda + b.pintura) - (a.fabricacao + a.solda + a.pintura));
}

