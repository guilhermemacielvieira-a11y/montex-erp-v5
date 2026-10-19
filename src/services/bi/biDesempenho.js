// ============================================================
// Desempenho individual por HORAS-PADRÃO (família × etapa)
// ============================================================
// Problema: kg não mede esforço igual entre peças. 1 kg de terça (vem no
// tamanho, só corte/furação, sem solda) não é o mesmo esforço que 1 kg de
// tesoura, coluna ou tirante (corte, furo, montagem, solda).
//
// Referência = MODELO DE HORAS-PADRÃO (Hh/t) por família e etapa, montado a
// partir das faixas de mercado de fabricação de estrutura metálica:
//   • típico 15–30 Hh/t; simples (colunas/vigas laminadas, ligação
//     parafusada) 8–15 Hh/t; complexo (treliças, peças compostas) 25–45 Hh/t;
//   • peças curtas/pequenas (tirante, contraventamento, chapas) custam mais
//     horas por tonelada.
// O sistema ainda está em implantação: os apontamentos têm lote, espera e peça
// parada sem início registrado — por isso o ritmo OBSERVADO fica só como
// comparação, e a régua é o modelo (ajustável por família/etapa).
//
// Medidas:
//   Hh-padrão produzidas = kg/1000 × Hh/t da família na etapa
//   Horas disponíveis    = dias úteis ativos × horas/dia (44 h/sem = 8,8 h)
//   EFICIÊNCIA           = Hh-padrão ÷ horas disponíveis × 100
//                          (100% = entregou o padrão de mercado)
//   vs EQUIPE            = eficiência ÷ mediana dos regulares da etapa × 100
// Rotas: famílias "sem solda" (Terça, Terça-TAP) não contam produção na Solda.
// ============================================================

import { r1, isoLocal, mediana, chaveSemana, semanasEntre, somaDias, inicioDoDia, ETAPAS_FABRICA } from './biCore';
import { indexarCadastro, pessoaDoEvento } from './biFuncionarios';
import { diasUteis } from './biAnaliseProducao';

export const ETAPAS_DESEMPENHO = ETAPAS_FABRICA; // fabricacao, solda, pintura
export const FAMILIAS_SEM_SOLDA_PADRAO = ['TERCA', 'TERCA-TAP'];
export const MIN_DIAS_CALIBRACAO = 5;
export const HORAS_DIA_PADRAO = 8.8; // 44 h semanais ÷ 5 dias

/**
 * Modelo de referência (Hh por tonelada) por grupo de família.
 * fabricacao = corte + furação + montagem; solda; pintura.
 * null = etapa não se aplica ao grupo.
 */
export const MODELO_HHT = [
  { grupo: 'Terça / tapamento', descricao: 'perfil no tamanho: corte e furação', re: /^TERCA/, hht: { fabricacao: 6, solda: null, pintura: 2 } },
  { grupo: 'Viga laminada', descricao: 'simples, ligação parafusada', re: /^VIGA$|^PERFIL|^CANTONEIRA|^BARRA|^TUBO/, hht: { fabricacao: 8, solda: 3, pintura: 2 } },
  { grupo: 'Viga-mestra', descricao: 'pesada / composta soldada', re: /^VIGA.MESTRA/, hht: { fabricacao: 10, solda: 8, pintura: 2 } },
  { grupo: 'Coluna', descricao: 'base, consoles e ligações', re: /^COLUN/, hht: { fabricacao: 12, solda: 8, pintura: 2 } },
  { grupo: 'Tesoura / treliça', descricao: 'treliça soldada (complexa)', re: /^TESOURA|^TRELICA/, hht: { fabricacao: 16, solda: 14, pintura: 3 } },
  { grupo: 'Calha', descricao: 'chapa dobrada', re: /^CALHA/, hht: { fabricacao: 14, solda: 6, pintura: 3 } },
  { grupo: 'Contraventamento / diagonal', descricao: 'peças curtas, muitas operações por tonelada', re: /^CONTRAVENT|^DIAGONAL|^MAO.FRANCESA/, hht: { fabricacao: 25, solda: 8, pintura: 4 } },
  { grupo: 'Tirante', descricao: 'barra roscada / peça pequena', re: /^TIRANTE/, hht: { fabricacao: 35, solda: 10, pintura: 5 } },
  { grupo: 'Produto seriado leve', descricao: 'quadros e horizontais (TEMEC)', re: /^QUADRO|^HORIZONTAL/, hht: { fabricacao: 18, solda: 12, pintura: 3 } },
  { grupo: 'Peças pequenas', descricao: 'chapas, suportes, insertos, chumbadores', re: /^CHAPA|^SUPORTE|^BOCAL|^INSERTO|^CHUMBADOR/, hht: { fabricacao: 30, solda: 10, pintura: 5 } },
  { grupo: 'Serralheria', descricao: 'escada, degrau, corrimão, piso', re: /^ESCADA|^DEGRAU|^PATAMAR|^CORRIMAO|^PISO|^COLUNETA/, hht: { fabricacao: 30, solda: 20, pintura: 5 } },
];
export const MODELO_PADRAO = { grupo: 'Outros', descricao: 'meio da faixa típica (15–30 Hh/t)', hht: { fabricacao: 14, solda: 8, pintura: 3 } };

/** Família canônica do tipo da peça (maiúsculas, sem acento, espaços únicos). */
export function familiaDe(tipo) {
  const s = String(tipo || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  return s || 'SEM TIPO';
}

/** Rótulo bonito da família a partir de um tipo de exemplo. */
export const rotuloFamilia = (tipo) => String(tipo || 'Sem tipo').trim() || 'Sem tipo';

/** Grupo do modelo de referência para a família. */
export const grupoModelo = (familia) => MODELO_HHT.find((g) => g.re.test(familia)) || MODELO_PADRAO;

/** Configuração efetiva (padrões + ajustes salvos). */
export function configRotas(cfg = {}) {
  return {
    semSolda: new Set((cfg.semSolda || FAMILIAS_SEM_SOLDA_PADRAO).map(familiaDe)),
    hht: cfg.hht || {}, // { [etapa]: { [FAMILIA]: Hh/t } } — ajustes manuais
    horasDia: Number(cfg.horasDia) > 0 ? Number(cfg.horasDia) : HORAS_DIA_PADRAO,
    minDias: cfg.minDias || MIN_DIAS_CALIBRACAO,
  };
}

/** Hh/t de referência da família na etapa: ajuste manual > modelo. */
export function hhtPadrao(etapa, familia, cfg = configRotas()) {
  if (etapa === 'solda' && cfg.semSolda.has(familia)) return { hht: null, fonte: 'nao_aplica', grupo: 'sem solda' };
  const aj = Number(cfg.hht?.[etapa]?.[familia]);
  const g = grupoModelo(familia);
  if (aj > 0) return { hht: aj, fonte: 'ajuste', grupo: g.grupo };
  const v = g.hht[etapa];
  if (v == null) return { hht: MODELO_PADRAO.hht[etapa], fonte: 'padrao', grupo: g.grupo };
  return { hht: v, fonte: g === MODELO_PADRAO ? 'padrao' : 'modelo', grupo: g.grupo };
}

/**
 * Aplica as rotas: solda de família "sem solda" não é produção.
 * Retorna eventos com `familia` e o resumo do que saiu da solda.
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
 * Ritmo OBSERVADO nos apontamentos (kg por pessoa-dia), só para comparação
 * com o modelo: mediana dos "dias puros" (pessoa fez uma única família na
 * etapa no dia). Fica distorcido por lote de apontamento e espera.
 */
export function calibrarRitmos(eventos = [], funcionarios = [], { minDias = MIN_DIAS_CALIBRACAO } = {}) {
  const cad = indexarCadastro(funcionarios);
  const dias = new Map();
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

/** Hh/t observado (a partir do ritmo kg/dia observado), ou null sem amostra. */
export function hhtObservado(etapa, familia, calib, cfg = configRotas()) {
  const c = calib?.[etapa]?.familias?.[familia];
  if (!c?.confiavel || !(c.mediana > 0)) return null;
  return { hht: r1((1000 * cfg.horasDia) / c.mediana), dias: c.dias };
}

/**
 * Desempenho individual no período.
 * Horas disponíveis contam a partir do 1º apontamento da pessoa (novatos não
 * são penalizados). Dias com apontamento NÃO são denominador (lote).
 */
export function desempenhoPessoas(eventos = [], funcionarios = [], {
  ini, fim, iniAnt, fimAnt, hoje = new Date(), cfg = configRotas(), semanas = 8, minParticipacao = 0.05,
} = {}) {
  const cad = indexarCadastro(funcionarios);
  const primeiro = new Map();
  eventos.forEach((e) => {
    if (!ETAPAS_DESEMPENHO.includes(e.setor) || !e.data) return;
    const p = pessoaDoEvento(e, cad);
    if (p && (!primeiro.has(p.id) || e.data < primeiro.get(p.id))) primeiro.set(p.id, e.data);
  });
  const diasAtivos = (pid, de, ate) => {
    const p1 = primeiro.get(pid);
    return Math.max(1, diasUteis(p1 && p1 > de ? p1 : de, ate, hoje));
  };
  const hhDe = (e) => {
    const ref = hhtPadrao(e.setor, e.familia || familiaDe(e.tipo), cfg);
    return { hh: ref.hht ? (e.kg / 1000) * ref.hht : 0, ref };
  };

  const acumular = (de, ate) => {
    const mapa = new Map();
    eventos.forEach((e) => {
      if (!ETAPAS_DESEMPENHO.includes(e.setor) || !e.data || e.data < de || e.data > ate || !(e.kg > 0)) return;
      const p = pessoaDoEvento(e, cad);
      if (!p) return;
      if (!mapa.has(p.id)) mapa.set(p.id, { pessoa: p, kg: 0, hh: 0, unidades: 0, pecas: new Set(), dias: new Set(), porEtapa: {}, porFam: new Map() });
      const m = mapa.get(p.id);
      const fam = e.familia || familiaDe(e.tipo);
      const { hh, ref } = hhDe(e);
      m.kg += e.kg; m.hh += hh; m.unidades += e.qtd || 0;
      if (e.pecaId) m.pecas.add(e.pecaId);
      m.dias.add(isoLocal(e.data));
      m.porEtapa[e.setor] = (m.porEtapa[e.setor] || 0) + hh;
      const kf = `${e.setor}|${fam}`;
      if (!m.porFam.has(kf)) m.porFam.set(kf, { etapa: e.setor, familia: fam, rotulo: rotuloFamilia(e.tipo), kg: 0, hh: 0, unidades: 0, pecas: new Set(), hht: ref.hht, fonte: ref.fonte, grupo: ref.grupo });
      const f = m.porFam.get(kf);
      f.kg += e.kg; f.hh += hh; f.unidades += e.qtd || 0; if (e.pecaId) f.pecas.add(e.pecaId);
    });
    mapa.forEach((m, pid) => {
      m.diasUteis = diasAtivos(pid, de, ate);
      m.horasDisp = m.diasUteis * cfg.horasDia;
      m.eficiencia = m.horasDisp > 0 ? (m.hh / m.horasDisp) * 100 : 0;
    });
    return mapa;
  };
  const atual = acumular(ini, fim);
  const ant = iniAnt && fimAnt ? acumular(iniAnt, fimAnt) : new Map();

  const etapaDe = (m) => Object.entries(m.porEtapa).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const regularesPor = (mapa) => {
    const tot = {};
    mapa.forEach((m) => { const et = etapaDe(m); tot[et] = (tot[et] || 0) + m.hh; });
    const reg = new Set();
    mapa.forEach((m, pid) => { const et = etapaDe(m); if (tot[et] > 0 && m.hh / tot[et] >= minParticipacao) reg.add(pid); });
    return reg;
  };
  const regulares = regularesPor(atual);
  const med = {};
  ETAPAS_DESEMPENHO.forEach((et) => {
    med[et] = mediana([...atual.entries()].filter(([pid, m]) => etapaDe(m) === et && regulares.has(pid)).map(([, m]) => m.eficiencia)) || 0;
  });

  // tendência: Hh-padrão por semana
  const iniSem = somaDias(inicioDoDia(fim), -7 * (semanas - 1));
  const chaves = semanasEntre(iniSem, fim);
  const semMapa = new Map();
  eventos.forEach((e) => {
    if (!ETAPAS_DESEMPENHO.includes(e.setor) || !e.data || e.data < iniSem || e.data > fim || !(e.kg > 0)) return;
    const p = pessoaDoEvento(e, cad);
    if (!p) return;
    const k = `${p.id}|${chaveSemana(e.data)}`;
    semMapa.set(k, (semMapa.get(k) || 0) + hhDe(e).hh);
  });

  const lista = [...atual.values()].map((m) => {
    const etapaPrincipal = etapaDe(m);
    const a = ant.get(m.pessoa.id);
    const eficiencia = r1(m.eficiencia);
    const eficienciaAnt = a ? r1(a.eficiencia) : null;
    const porFamilia = [...m.porFam.values()].map((f) => ({
      ...f, kg: r1(f.kg), hh: r1(f.hh), unidades: r1(f.unidades), pecas: f.pecas.size,
      pctTrabalho: m.hh > 0 ? r1((f.hh / m.hh) * 100) : 0,
    })).sort((x, y) => y.hh - x.hh);
    return {
      id: m.pessoa.id, nome: m.pessoa.nome, cargo: m.pessoa.cargo, equipe: m.pessoa.equipe, foraDoCadastro: !!m.pessoa.foraDoCadastro,
      etapaPrincipal, ocasional: !regulares.has(m.pessoa.id),
      kg: r1(m.kg), hh: r1(m.hh), unidades: r1(m.unidades), pecas: m.pecas.size,
      diasApontados: m.dias.size, diasUteis: m.diasUteis, horasDisp: r1(m.horasDisp),
      eficiencia, eficienciaAnt, variacao: eficienciaAnt != null ? r1(eficiencia - eficienciaAnt) : null,
      vsEquipe: med[etapaPrincipal] > 0 ? r1((m.eficiencia / med[etapaPrincipal]) * 100) : null,
      hhtMedio: m.kg > 0 ? r1(m.hh / (m.kg / 1000)) : null, // complexidade média do mix
      kgDia: r1(m.kg / m.diasUteis),
      familiaPrincipal: porFamilia[0]?.rotulo || null,
      porFamilia,
      tendencia: chaves.map((k) => ({ semana: k, hh: r1(semMapa.get(`${m.pessoa.id}|${k}`) || 0) })),
    };
  });

  ETAPAS_DESEMPENHO.forEach((et) => {
    const grupo = lista.filter((p) => p.etapaPrincipal === et).sort((a, b) => b.eficiencia - a.eficiencia);
    grupo.forEach((p, i) => { p.posicao = i + 1; p.totalEtapa = grupo.length; });
  });
  return lista.sort((a, b) => b.hh - a.hh);
}

/** Resumo por etapa: regulares, mediana de eficiência e Hh-padrão totais. */
export function referenciaEtapas(pessoas = []) {
  return Object.fromEntries(ETAPAS_DESEMPENHO.map((et) => {
    const g = pessoas.filter((p) => p.etapaPrincipal === et);
    const reg = g.filter((p) => !p.ocasional);
    return [et, {
      pessoas: g.length, regulares: reg.length,
      medianaEficiencia: r1(mediana(reg.map((p) => p.eficiencia)) || 0),
      hh: r1(g.reduce((s, p) => s + p.hh, 0)), kg: r1(g.reduce((s, p) => s + p.kg, 0)),
    }];
  }));
}

/** Resumo por família no período (tabela do modelo e setor). */
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
