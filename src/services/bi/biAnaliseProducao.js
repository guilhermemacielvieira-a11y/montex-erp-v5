// ============================================================
// Análise de Produção — motor puro (períodos, setores, obras, pessoas)
// ============================================================
// Base: transições normalizadas (biProducao.normalizarHistorico) + romaneios.
// "Produção de um setor" = kg que CONCLUÍRAM a etapa (mesmo conceito do
// BI 360): Fabricação = saiu da fabricação; Solda = saiu da solda; Pintura =
// peça pronta (saiu da pintura); Embarque = peso dos romaneios pela data de
// saída. Datas sempre locais (CLAUDE.md regra 3).
// ============================================================

import {
  num, r1, dataLocal, inicioDoDia, somaDias, diasEntre, isoLocal, chaveSemana, chaveMes,
  rotuloMes, rotuloSemana, inicioSemana, ordemFluxo, etapaCanonica, pesoPeca, obraDe,
  fabricaConcluida, ETAPAS_FABRICA, ETAPAS_FLUXO, media,
} from './biCore';

export const SETORES = [
  { key: 'fabricacao', label: 'Fabricação', cor: '#3b82f6' },
  { key: 'solda', label: 'Solda', cor: '#f97316' },
  { key: 'pintura', label: 'Pintura (peça pronta)', cor: '#a855f7' },
  { key: 'expedicao', label: 'Embarque (romaneios)', cor: '#22c55e' },
];
export const SETOR_KEYS = SETORES.map((s) => s.key);
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/**
 * Eventos de produção por setor.
 * @param transicoes  saída de normalizarHistorico().transicoes
 * @param expedicoes  romaneios (peso_total, data_saida/data_expedicao, obra_id)
 */
export function eventosProducao(transicoes = [], expedicoes = []) {
  const out = [];
  (transicoes || []).forEach((t) => {
    if (!ETAPAS_FABRICA.includes(t.de)) return;
    if (ordemFluxo(t.para) <= ordemFluxo(t.de)) return; // retrocesso não é produção
    if (!(t.kg > 0)) return; // excedente (já concluída antes)
    out.push({
      setor: t.de, data: t.data, kg: t.kg, qtd: t.qtd, obraId: t.obraId, pecaId: t.pecaId,
      marca: t.marca, tipo: t.tipo || 'Sem tipo', funcionario: t.funcionario, funcionarioId: t.funcionarioId || null,
    });
  });
  (expedicoes || []).forEach((e) => {
    if (e.deleted_at || e.deletedAt) return;
    const st = String(e.status || '').toLowerCase();
    if (st === 'preparando' || st === 'cancelado' || st === 'cancelada') return;
    const data = dataLocal(e.data_saida ?? e.dataSaida ?? e.data_expedicao ?? e.dataExpedicao);
    const kg = num(e.peso_total ?? e.pesoTotal);
    if (!data || !(kg > 0)) return;
    out.push({
      setor: 'expedicao', data, kg, qtd: 0, obraId: obraDe(e), pecaId: null,
      marca: e.numero_romaneio ?? e.numeroRomaneio ?? e.id, tipo: null, funcionario: null,
    });
  });
  return out.sort((a, b) => a.data - b.data);
}

// ===== Períodos =====
export const PERIODOS = [
  { key: '7d', label: 'Últimos 7 dias' },
  { key: '30d', label: 'Últimos 30 dias' },
  { key: '90d', label: 'Últimos 90 dias' },
  { key: 'mes', label: 'Mês atual' },
  { key: 'mesAnterior', label: 'Mês anterior' },
  { key: 'ano', label: 'Ano atual' },
  { key: 'custom', label: 'Personalizado' },
];

/** Intervalo [ini, fim] (datas locais, inclusive) e o período anterior equivalente. */
export function intervaloPeriodo(key, { hoje = new Date(), ini: iniC, fim: fimC } = {}) {
  const h = inicioDoDia(hoje);
  let ini; let fim = h;
  if (key === '7d') ini = somaDias(h, -6);
  else if (key === '30d') ini = somaDias(h, -29);
  else if (key === '90d') ini = somaDias(h, -89);
  else if (key === 'mes') ini = new Date(h.getFullYear(), h.getMonth(), 1);
  else if (key === 'mesAnterior') { ini = new Date(h.getFullYear(), h.getMonth() - 1, 1); fim = new Date(h.getFullYear(), h.getMonth(), 0); }
  else if (key === 'ano') ini = new Date(h.getFullYear(), 0, 1);
  else { ini = dataLocal(iniC) || somaDias(h, -29); fim = dataLocal(fimC) || h; }
  if (fim < ini) [ini, fim] = [fim, ini];
  const dias = diasEntre(ini, fim) + 1;
  let iniAnt; let fimAnt;
  if (key === 'mes' || key === 'mesAnterior') {
    iniAnt = new Date(ini.getFullYear(), ini.getMonth() - 1, 1);
    fimAnt = key === 'mes'
      ? new Date(ini.getFullYear(), ini.getMonth() - 1, Math.min(h.getDate(), new Date(ini.getFullYear(), ini.getMonth(), 0).getDate()))
      : new Date(ini.getFullYear(), ini.getMonth(), 0);
  } else if (key === 'ano') {
    iniAnt = new Date(ini.getFullYear() - 1, 0, 1);
    fimAnt = new Date(fim.getFullYear() - 1, fim.getMonth(), fim.getDate());
  } else {
    fimAnt = somaDias(ini, -1);
    iniAnt = somaDias(fimAnt, -(dias - 1));
  }
  return { ini, fim, dias, iniAnt, fimAnt };
}

export const noPeriodo = (eventos, ini, fim) => (eventos || []).filter((e) => e.data >= ini && e.data <= fim);

/** Dias úteis (seg–sex) no intervalo, sem passar de hoje. */
export function diasUteis(ini, fim, hoje = new Date()) {
  const f = fim > hoje ? inicioDoDia(hoje) : fim;
  let n = 0;
  for (let d = inicioDoDia(ini); d <= f; d = somaDias(d, 1)) { const w = d.getDay(); if (w !== 0 && w !== 6) n += 1; }
  return n;
}

/** Totais por setor no intervalo + médias e melhor dia. */
export function resumoSetores(eventos = [], { ini, fim, hoje = new Date() } = {}) {
  const ev = noPeriodo(eventos, ini, fim);
  const uteis = diasUteis(ini, fim, hoje);
  return SETORES.map((s) => {
    const lista = ev.filter((e) => e.setor === s.key);
    const kg = lista.reduce((a, e) => a + e.kg, 0);
    const porDia = new Map();
    lista.forEach((e) => { const k = isoLocal(e.data); porDia.set(k, (porDia.get(k) || 0) + e.kg); });
    let melhor = null;
    porDia.forEach((v, k) => { if (!melhor || v > melhor.kg) melhor = { data: k, kg: r1(v) }; });
    return {
      setor: s.key, label: s.label, cor: s.cor,
      kg: r1(kg),
      eventos: lista.length,
      pecas: new Set(lista.map((e) => e.pecaId).filter(Boolean)).size,
      unidades: r1(lista.reduce((a, e) => a + (e.qtd || 0), 0)),
      diasComProducao: porDia.size,
      mediaDiaUtil: uteis > 0 ? r1(kg / uteis) : 0,
      mediaDiaTrabalhado: porDia.size ? r1(kg / porDia.size) : 0,
      melhorDia: melhor,
    };
  });
}

export const variacaoPct = (atual, anterior) => (anterior > 0 ? r1(((atual - anterior) / anterior) * 100) : null);

/** Chave/rótulo de bucket por granularidade. */
function bucket(d, gran) {
  if (gran === 'mes') { const k = chaveMes(d); return { k, rot: rotuloMes(k) }; }
  if (gran === 'semana') { const k = chaveSemana(d); return { k, rot: rotuloSemana(k) }; }
  const k = isoLocal(d);
  return { k, rot: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) };
}

/** Série contínua (dia/semana/mês) com kg por setor. */
export function serieTemporal(eventos = [], { ini, fim, granularidade = 'dia' } = {}) {
  const linhas = new Map();
  const passo = (d) => (granularidade === 'mes' ? new Date(d.getFullYear(), d.getMonth() + 1, 1)
    : granularidade === 'semana' ? somaDias(d, 7) : somaDias(d, 1));
  let d = granularidade === 'mes' ? new Date(ini.getFullYear(), ini.getMonth(), 1)
    : granularidade === 'semana' ? inicioSemana(ini) : inicioDoDia(ini);
  let guard = 0;
  while (d <= fim && guard < 1200) {
    const { k, rot } = bucket(d, granularidade);
    const w = d.getDay();
    linhas.set(k, { chave: k, rotulo: rot, fimDeSemana: granularidade === 'dia' && (w === 0 || w === 6), ...Object.fromEntries(SETOR_KEYS.map((s) => [s, 0])) });
    d = passo(d); guard += 1;
  }
  noPeriodo(eventos, ini, fim).forEach((e) => {
    const l = linhas.get(bucket(e.data, granularidade).k);
    if (l) l[e.setor] += e.kg;
  });
  return [...linhas.values()].map((l) => ({ ...l, ...Object.fromEntries(SETOR_KEYS.map((s) => [s, r1(l[s])])) }));
}

/** Agrupa kg por uma chave (obra, funcionário, tipo…) e setor. */
export function agrupar(eventos = [], chaveFn, { setores = SETOR_KEYS } = {}) {
  const mapa = new Map();
  eventos.forEach((e) => {
    if (!setores.includes(e.setor)) return;
    const k = chaveFn(e);
    if (k == null || k === '') return;
    if (!mapa.has(k)) mapa.set(k, { chave: k, total: 0, pecas: new Set(), dias: new Set(), ...Object.fromEntries(SETOR_KEYS.map((s) => [s, 0])) });
    const m = mapa.get(k);
    m[e.setor] += e.kg;
    m.total += e.kg;
    if (e.pecaId) m.pecas.add(e.pecaId);
    m.dias.add(isoLocal(e.data));
  });
  return [...mapa.values()].map((m) => ({
    ...m, ...Object.fromEntries(SETOR_KEYS.map((s) => [s, r1(m[s])])), total: r1(m.total),
    pecas: m.pecas.size, dias: m.dias.size,
  })).sort((a, b) => b.total - a.total);
}

/** Pessoas: kg por setor, dias trabalhados e média por dia trabalhado. */
export function produtividadePessoas(eventos = []) {
  return agrupar(eventos.filter((e) => e.funcionario), (e) => e.funcionario, { setores: ETAPAS_FABRICA })
    .map((p) => {
      const principal = ETAPAS_FABRICA.reduce((a, s) => (p[s] > (p[a] || 0) ? s : a), 'fabricacao');
      return { ...p, setorPrincipal: principal, kgDia: p.dias ? r1(p.total / p.dias) : 0 };
    });
}

/** Mapa dia da semana × setor (média de kg por ocorrência daquele dia). */
export function perfilDiaSemana(eventos = [], { ini, fim } = {}) {
  const ocorrencias = Array(7).fill(0);
  for (let d = inicioDoDia(ini); d <= fim; d = somaDias(d, 1)) ocorrencias[(d.getDay() + 6) % 7] += 1;
  const soma = DIAS_SEMANA.map(() => Object.fromEntries(SETOR_KEYS.map((s) => [s, 0])));
  noPeriodo(eventos, ini, fim).forEach((e) => { soma[(e.data.getDay() + 6) % 7][e.setor] += e.kg; });
  return DIAS_SEMANA.map((dia, i) => ({
    dia, ocorrencias: ocorrencias[i],
    ...Object.fromEntries(SETOR_KEYS.map((s) => [s, ocorrencias[i] ? r1(soma[i][s] / ocorrencias[i]) : 0])),
  }));
}

/**
 * Progresso e previsão por obra (fotografia atual + ritmo recente).
 * Ritmo = kg de peça pronta (pintura concluída) por semana nas últimas 4 semanas.
 */
export function progressoObras({ obras = [], pecas = [], eventos = [], hoje = new Date() } = {}) {
  const ini4 = somaDias(inicioDoDia(hoje), -27);
  return (obras || []).map((o) => {
    const ps = (pecas || []).filter((p) => obraDe(p) === o.id);
    if (!ps.length) return null;
    const porEtapa = Object.fromEntries(ETAPAS_FLUXO.map((e) => [e, 0]));
    ps.forEach((p) => { porEtapa[etapaCanonica(p.etapa)] += pesoPeca(p); });
    const total = Object.values(porEtapa).reduce((a, b) => a + b, 0);
    const pronto = ps.filter((p) => fabricaConcluida(p.etapa)).reduce((a, p) => a + pesoPeca(p), 0);
    const emProcesso = porEtapa.fabricacao + porEtapa.solda + porEtapa.pintura;
    const ritmo4 = eventos.filter((e) => e.obraId === o.id && e.setor === 'pintura' && e.data >= ini4).reduce((a, e) => a + e.kg, 0) / 4;
    const restante = Math.max(0, total - pronto);
    const semanas = ritmo4 > 0 ? restante / ritmo4 : null;
    const ultimo = eventos.filter((e) => e.obraId === o.id && e.setor !== 'expedicao').reduce((m, e) => (!m || e.data > m ? e.data : m), null);
    return {
      id: o.id, nome: o.nome, codigo: o.codigo,
      pesoTotal: r1(total), pronto: r1(pronto), pctPronto: total > 0 ? r1((pronto / total) * 100) : 0,
      emProcesso: r1(emProcesso), naoIniciado: r1(porEtapa.aguardando),
      porEtapa: Object.fromEntries(Object.entries(porEtapa).map(([k, v]) => [k, r1(v)])),
      ritmoKgSemana: r1(ritmo4), restante: r1(restante),
      semanasRestantes: semanas != null ? r1(semanas) : null,
      previsaoTermino: semanas != null && restante > 0 ? somaDias(inicioDoDia(hoje), Math.ceil(semanas * 7)) : null,
      diasSemMovimento: ultimo ? diasEntre(ultimo, hoje) : null,
      pecas: ps.length,
    };
  }).filter(Boolean).sort((a, b) => b.pesoTotal - a.pesoTotal);
}

/** Média móvel simples (n pontos) de uma série numérica. */
export function mediaMovel(valores = [], n = 7) {
  return valores.map((_, i) => {
    const janela = valores.slice(Math.max(0, i - n + 1), i + 1);
    return r1(media(janela) ?? 0);
  });
}
