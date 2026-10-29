// ============================================================
// BI — Custo por kg da FÁBRICA, ponto de equilíbrio, cenário 2027 e
// margem estimada de fabricação por obra
// ============================================================
// Pergunta: "quanto custa fabricar 1 kg hoje, quanto vai custar em 2027 e
// a quanto preciso vender para não perder dinheiro?"
//
// Regras (CLAUDE.md 1b, 1e e critério da diretoria):
//  - Custo da fábrica = despesas SEM obra (obra_id nulo). Material lançado na
//    obra (GFO) é pago pelo cliente e fica FORA do custo por kg.
//  - Produção ("fabricado") = kg que ENTROU EM PINTURA, medido no histórico
//    NORMALIZADO (transicoesComPeca) — nunca somar producao_historico bruto.
//  - Classes de custo: mão de obra (reajuste próprio), fixos (administrativo,
//    transporte, energia, manutenção…), variáveis por kg (matéria-prima/
//    consumíveis e impostos) e fora da fábrica (montagem em campo).
//  - Lançamentos atípicos (> 3× a mediana da categoria na janela e acima de
//    R$ 20 mil) podem ser trocados pela mediana para não distorcer a média;
//    a lista do que foi ajustado sempre acompanha o resultado.
// Motor puro (sem React/Supabase) — testado em biCustoKg.test.js.
// ============================================================

import { despesaCancelada } from '../../utils/financeiroStatus';
import {
  num, r1, r2, dataLocal, chaveMes, mediana, ordemFluxo, etapaCanonica, pesoPeca, obraDe,
} from './biCore';

export const ID_CONFIG_CUSTO = 'config_custo_kg';

export const PADRAO_CUSTO = {
  capacidadeTMes: 120, // t/mês que a fábrica comporta
  precoFabricacaoKg: 8, // R$/kg faturado pela Montex só pela fabricação
  acoKg: 8, // R$/kg do aço (para abrir o preço global das obras)
  montagemKg: 3.5, // R$/kg de montagem terceirizada
  janelaMeses: 5, // meses usados na média
  incluirMesAtual: true,
  ajustarAtipicos: true,
  reajuste2027: { maoDeObra: 8, fixos: 5, variaveis: 7, aco: 6, montagem: 8 }, // % sobre 2026
  categoriasVariaveis: ['materia prima', 'consumiveis', 'impostos'],
  categoriasForaFabrica: ['montagem campo'],
};

/** Mescla config salva com os padrões (campos ausentes → padrão). */
export function configCusto(bruta = {}) {
  const b = bruta || {};
  return {
    ...PADRAO_CUSTO,
    ...b,
    reajuste2027: { ...PADRAO_CUSTO.reajuste2027, ...(b.reajuste2027 || {}) },
    categoriasVariaveis: Array.isArray(b.categoriasVariaveis) ? b.categoriasVariaveis : PADRAO_CUSTO.categoriasVariaveis,
    categoriasForaFabrica: Array.isArray(b.categoriasForaFabrica) ? b.categoriasForaFabrica : PADRAO_CUSTO.categoriasForaFabrica,
  };
}

/** "Matéria Prima" → "materia prima" (sem acento, minúsculo, sem _). */
export function chaveCategoria(cat) {
  return String(cat || 'outros')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase() || 'outros';
}

/** Classe de custo de uma categoria: maoDeObra | fixo | variavel | fora. */
export function classeCategoria(cat, cfg = PADRAO_CUSTO) {
  const k = chaveCategoria(cat);
  if ((cfg.categoriasForaFabrica || []).map(chaveCategoria).includes(k)) return 'fora';
  if ((cfg.categoriasVariaveis || []).map(chaveCategoria).includes(k)) return 'variavel';
  if (/^mao de obra/.test(k)) return 'maoDeObra';
  return 'fixo';
}

const ETAPA_PINTURA = ordemFluxo('pintura');

/**
 * kg que ENTROU em pintura por mês (critério "fabricado" da diretoria).
 * Uma passagem conta quando sai de uma etapa ANTES da pintura e chega na
 * pintura ou além (ex.: fabricação → expedido direto). Teto por peça = sua
 * quantidade, para que um registro refeito por outro caminho não conte 2×.
 */
export function kgPinturaPorMes(transicoes = [], pecas = []) {
  const qtdPeca = new Map((pecas || []).map((p) => [p.id, Math.max(1, num(p.quantidade) || 1)]));
  const usado = new Map();
  const mapa = new Map();
  [...(transicoes || [])]
    .sort((a, b) => a.data - b.data)
    .forEach((t) => {
      // Etapa de origem "não se aplica" (ex.: terça sem solda) zera a
      // produção do SETOR, mas a peça entrou em pintura do mesmo jeito.
      const kgT = t?.naoAplica ? num(t.kgFisico) : num(t?.kg);
      const qtdT = t?.naoAplica ? num(t.qtdFisica) : num(t?.qtd);
      if (!t?.data || !(kgT > 0)) return;
      if (!(ordemFluxo(t.de) < ETAPA_PINTURA && ordemFluxo(t.para) >= ETAPA_PINTURA)) return;
      const limite = qtdPeca.get(t.pecaId) ?? Infinity;
      const ja = usado.get(t.pecaId) || 0;
      const qtd = Math.max(0, Math.min(qtdT, limite - ja));
      if (qtd <= 0) return;
      usado.set(t.pecaId, ja + qtd);
      const kg = qtdT > 0 ? (kgT / qtdT) * qtd : kgT;
      const k = chaveMes(t.data);
      mapa.set(k, (mapa.get(k) || 0) + kg);
    });
  return mapa;
}

/** Lista de chaves de mês terminando no mês de `hoje` (inclusive). */
export function ultimosMeses(hoje = new Date(), n = 12) {
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(chaveMes(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)));
  return out;
}

/**
 * Série mensal da fábrica: kg pintado × despesas sem obra por classe e
 * categoria. Despesas canceladas ficam fora.
 */
export function serieFabrica({ transicoes = [], passagensNA = [], pecas = [], despesas = [], hoje = new Date(), meses = 12, cfg = PADRAO_CUSTO }) {
  const chaves = ultimosMeses(hoje, meses);
  const kg = kgPinturaPorMes([...(transicoes || []), ...(passagensNA || [])], pecas);
  const linhas = new Map(chaves.map((m) => [m, { mes: m, kg: r1(kg.get(m) || 0), maoDeObra: 0, fixo: 0, variavel: 0, fora: 0, categorias: {} }]));
  (despesas || []).forEach((d) => {
    if (obraDe(d)) return; // material/despesa de obra → GFO, fora do custo da fábrica
    if (despesaCancelada(d.status)) return;
    const data = dataLocal(d.dataEmissao ?? d.data_emissao ?? d.dataVencimento ?? d.data_vencimento ?? d.data);
    if (!data) return;
    const l = linhas.get(chaveMes(data));
    if (!l) return;
    const v = num(d.valor);
    const cat = (d.categoria || 'Outros').trim() || 'Outros';
    l[classeCategoria(cat, cfg)] += v;
    l.categorias[cat] = (l.categorias[cat] || 0) + v;
  });
  return chaves.map((m) => {
    const l = linhas.get(m);
    return { ...l, maoDeObra: r2(l.maoDeObra), fixo: r2(l.fixo), variavel: r2(l.variavel), fora: r2(l.fora) };
  });
}

/**
 * Troca valores atípicos (> fator × mediana da categoria na janela e acima
 * do piso) pela mediana. Retorna a série ajustada e a lista de ajustes.
 */
export function ajustarAtipicos(serie = [], cfg = PADRAO_CUSTO, { fator = 3, piso = 20000 } = {}) {
  const cats = new Set();
  serie.forEach((l) => Object.keys(l.categorias || {}).forEach((c) => cats.add(c)));
  const ajustes = [];
  const nova = serie.map((l) => ({ ...l, categorias: { ...(l.categorias || {}) } }));
  cats.forEach((c) => {
    const valores = serie.map((l) => num(l.categorias?.[c]));
    const med = mediana(valores.filter((v) => v > 0));
    if (!(med > 0)) return;
    nova.forEach((l) => {
      const v = num(l.categorias[c]);
      if (v > piso && v > fator * med) {
        const classe = classeCategoria(c, cfg);
        l[classe] = r2(l[classe] - v + med);
        l.categorias[c] = med;
        ajustes.push({ mes: l.mes, categoria: c, valor: r2(v), usado: r2(med) });
      }
    });
  });
  return { serie: nova, ajustes };
}

/** Custo por kg num volume (t/mês) a partir da base mensal. */
export function custoKgEmVolume({ fixoMes, varKg }, tMes) {
  const kg = num(tMes) * 1000;
  if (!(kg > 0)) return null;
  return r2(num(fixoMes) / kg + num(varKg));
}

/** Volume (t/mês) em que o preço de fabricação cobre o custo. */
export function pontoEquilibrio({ fixoMes, varKg }, precoKg) {
  const margemVar = num(precoKg) - num(varKg);
  if (!(margemVar > 0)) return null;
  return r1(num(fixoMes) / margemVar / 1000);
}

/** Base de custo 2027 aplicando os reajustes da config sobre a base atual. */
export function base2027(base, cfg = PADRAO_CUSTO) {
  const rj = cfg.reajuste2027 || {};
  const f = (p) => 1 + num(p) / 100;
  const maoDeObra = base.maoDeObraMes * f(rj.maoDeObra);
  const fixos = base.outrosFixosMes * f(rj.fixos);
  return {
    maoDeObraMes: r2(maoDeObra),
    outrosFixosMes: r2(fixos),
    fixoMes: r2(maoDeObra + fixos),
    varKg: r2(base.varKg * f(rj.variaveis)),
  };
}

/**
 * Margem estimada de FABRICAÇÃO por obra ativa.
 * Receita de fabricação/kg:
 *  - informada: obra.valor_kg_fabricacao;
 *  - estimada: preço global (contrato ÷ peso) − aço − montagem (da obra ou da config).
 * kg restante = peças que ainda NÃO entraram em pintura.
 */
export function margemObras({ obras = [], pecas = [], custoKg, custoKg2027, cfg = PADRAO_CUSTO, obraIds = null }) {
  const porObra = new Map();
  (pecas || []).forEach((p) => {
    const id = obraDe(p);
    if (!porObra.has(id)) porObra.set(id, []);
    porObra.get(id).push(p);
  });
  const inativa = (o) => /conclu|cancel/i.test(String(o?.status || ''));
  return (obras || [])
    .filter((o) => !inativa(o))
    .filter((o) => !obraIds || obraIds.includes(o.id))
    .map((o) => {
      const ps = porObra.get(o.id) || [];
      const kgPecas = ps.reduce((s, p) => s + pesoPeca(p), 0);
      const kgFabricado = ps.filter((p) => ordemFluxo(etapaCanonica(p.etapa)) >= ETAPA_PINTURA).reduce((s, p) => s + pesoPeca(p), 0);
      const kgContrato = num(o.contratoPesoTotal ?? o.contrato_peso_total);
      const kgTotal = kgPecas > 0 ? kgPecas : kgContrato;
      const kgRestante = Math.max(0, kgTotal - kgFabricado);
      const valor = num(o.contratoValorTotal ?? o.contrato_valor_total);
      const kgFab = num(o.valorKgFabricacao ?? o.valor_kg_fabricacao);
      const kgMont = num(o.valorKgMontagem ?? o.valor_kg_montagem);
      const global = valor > 0 && kgContrato > 0 ? valor / kgContrato : null;
      let receitaKg = null;
      let fonte = 'sem dados';
      if (kgFab > 0) { receitaKg = kgFab; fonte = 'informado'; }
      else if (global !== null) {
        const aco = String(o.regimeMaterial ?? o.regime_material ?? '') === 'direto_cliente' ? 0 : num(cfg.acoKg);
        receitaKg = global - aco - (kgMont > 0 ? kgMont : num(cfg.montagemKg));
        fonte = 'estimado do global';
      }
      const margemKg = receitaKg !== null && custoKg !== null ? receitaKg - custoKg : null;
      const margemKg2027 = receitaKg !== null && custoKg2027 !== null ? receitaKg - custoKg2027 : null;
      let situacao = 'sem dados';
      if (margemKg !== null) {
        if (margemKg < 0) situacao = 'negativa';
        else if (receitaKg > 0 && margemKg / receitaKg < 0.15) situacao = 'apertada';
        else situacao = 'ok';
      }
      return {
        id: o.id,
        codigo: o.codigo || '',
        nome: o.nome || o.id,
        kgTotal: r1(kgTotal),
        kgFabricado: r1(kgFabricado),
        kgRestante: r1(kgRestante),
        valorContrato: r2(valor),
        globalKg: global === null ? null : r2(global),
        receitaKg: receitaKg === null ? null : r2(receitaKg),
        fonte,
        custoKg,
        margemKg: margemKg === null ? null : r2(margemKg),
        margemKg2027: margemKg2027 === null ? null : r2(margemKg2027),
        margemRestante: margemKg === null ? null : r2(margemKg * kgRestante),
        situacao,
        prazo: o.dataPrevistaFim ?? o.data_prevista_fim ?? null,
      };
    })
    .sort((a, b) => b.kgRestante - a.kgRestante);
}

/** Avisos de qualidade de dado que distorcem o custo por kg. */
export function alertasDados({ despesas = [], obras = [], serieJanela = [], ajustes = [], hoje = new Date() }) {
  const out = [];
  const limite = new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate());
  const futuras = (despesas || []).filter((d) => {
    if (obraDe(d) || despesaCancelada(d.status)) return false;
    const dt = dataLocal(d.dataEmissao ?? d.data_emissao);
    return dt && dt > limite;
  });
  if (futuras.length) {
    out.push({ tipo: 'data', texto: `${futuras.length} despesa(s) da fábrica com data de emissão mais de 1 mês à frente — provável erro de digitação.`, itens: futuras.slice(0, 5).map((d) => `${d.descricao || d.categoria || d.id} · ${d.dataEmissao ?? d.data_emissao}`) });
  }
  ajustes.forEach((a) => {
    out.push({ tipo: 'atipico', texto: `${a.categoria} em ${a.mes}: ${a.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })} (mais de 3× o normal). Na média foi usado o valor típico.` });
  });
  const total = serieJanela.reduce((s, l) => s + l.maoDeObra + l.fixo + l.variavel, 0);
  const outros = serieJanela.reduce((s, l) => s + Object.entries(l.categorias || {}).filter(([c]) => chaveCategoria(c) === 'outros').reduce((a, [, v]) => a + v, 0), 0);
  if (total > 0 && outros / total > 0.1) {
    out.push({ tipo: 'categoria', texto: `"Outros" responde por ${Math.round((outros / total) * 100)}% das despesas da fábrica na janela. Classificar melhora a precisão do custo.` });
  }
  const mo = serieJanela.map((l) => l.maoDeObra).filter((v) => v > 0);
  const ultimo = serieJanela[serieJanela.length - 1];
  const medMo = mediana(mo);
  if (ultimo && medMo > 0 && ultimo.maoDeObra > 1.4 * medMo) {
    out.push({ tipo: 'mao_de_obra', texto: `Mão de obra em ${ultimo.mes} está ${Math.round((ultimo.maoDeObra / medMo - 1) * 100)}% acima da mediana. Confirme se há montagem de campo ou verbas rescisórias misturadas na fábrica.` });
  }
  const semPreco = (obras || []).filter((o) => !/conclu|cancel/i.test(String(o?.status || ''))
    && !(num(o.valorKgFabricacao ?? o.valor_kg_fabricacao) > 0));
  if (semPreco.length) {
    out.push({ tipo: 'obra', texto: `${semPreco.length} obra(s) ativa(s) sem "valor por kg de fabricação" — a margem delas é estimada a partir do preço global.`, itens: semPreco.map((o) => o.nome || o.id) });
  }
  return out;
}

/**
 * Análise completa (orquestrador). `hoje` define o mês corrente.
 */
export function analiseCustoKg({ transicoes = [], passagensNA = [], pecas = [], despesas = [], obras = [], obraIds = null, hoje = new Date(), cfg: cfgBruta = {} } = {}) {
  const cfg = configCusto(cfgBruta);
  const serie = serieFabrica({ transicoes, passagensNA, pecas, despesas, hoje, meses: 12, cfg });
  const janelaN = Math.max(1, Math.min(12, Math.round(num(cfg.janelaMeses) || 5)));
  const fimJanela = cfg.incluirMesAtual ? serie.length : serie.length - 1;
  const janelaBruta = serie.slice(Math.max(0, fimJanela - janelaN), fimJanela);
  const { serie: janelaAjustada, ajustes } = cfg.ajustarAtipicos ? ajustarAtipicos(janelaBruta, cfg) : { serie: janelaBruta, ajustes: [] };
  const janela = janelaAjustada;
  const n = janela.length || 1;
  const soma = (k) => janela.reduce((s, l) => s + num(l[k]), 0);
  const kgJanela = soma('kg');
  const maoDeObraMes = soma('maoDeObra') / n;
  const outrosFixosMes = soma('fixo') / n;
  const fixoMes = maoDeObraMes + outrosFixosMes;
  const varKg = kgJanela > 0 ? soma('variavel') / kgJanela : 0;
  const kgMes = kgJanela / n;
  const tMes = kgMes / 1000;

  const base = {
    meses: janela.map((l) => l.mes),
    kgMes: r1(kgMes),
    tMes: r1(tMes),
    maoDeObraMes: r2(maoDeObraMes),
    outrosFixosMes: r2(outrosFixosMes),
    fixoMes: r2(fixoMes),
    varKg: r2(varKg),
    foraMes: r2(soma('fora') / n),
  };
  const b27 = base2027(base, cfg);
  const custoKg = tMes > 0 ? custoKgEmVolume(base, tMes) : null;
  const custoKg2027 = tMes > 0 ? custoKgEmVolume(b27, tMes) : null;
  const ultimoMes = serie[serie.length - 1];

  // Curva custo × volume (de 30 t até a capacidade)
  const cap = Math.max(40, num(cfg.capacidadeTMes) || 120);
  const passos = [];
  for (let t = 30; t <= cap; t += 10) passos.push(t);
  if (tMes >= 10 && !passos.some((t) => Math.abs(t - tMes) < 2)) passos.push(r1(tMes));
  passos.sort((a, b) => a - b);
  const curva = passos.map((t) => ({
    tMes: t,
    custo2026: custoKgEmVolume(base, t),
    custo2027: custoKgEmVolume(b27, t),
    preco: num(cfg.precoFabricacaoKg),
    atual: Math.abs(t - tMes) < 0.05,
  }));

  const volumes = [...new Set([r1(tMes), 80, 100, cap].filter((t) => t > 0))].sort((a, b) => a - b);
  const tabelaVolume = volumes.map((t) => {
    const c26 = custoKgEmVolume(base, t);
    const c27 = custoKgEmVolume(b27, t);
    const preco = num(cfg.precoFabricacaoKg);
    return {
      tMes: t,
      custo2026: c26,
      custo2027: c27,
      margemKg2027: c27 === null ? null : r2(preco - c27),
      resultadoMes2027: c27 === null ? null : r2((preco - c27) * t * 1000),
      atual: Math.abs(t - tMes) < 0.05,
    };
  });

  const equilibrio = {
    preco: num(cfg.precoFabricacaoKg),
    t2026: pontoEquilibrio(base, cfg.precoFabricacaoKg),
    t2027: pontoEquilibrio(b27, cfg.precoFabricacaoKg),
    // Preço mínimo de fabricação em 2027 que empata no volume atual
    precoMin2027: custoKg2027,
  };

  const obrasMargem = margemObras({ obras, pecas, custoKg, custoKg2027, cfg, obraIds });
  const carteiraKg = obrasMargem.reduce((s, o) => s + o.kgRestante, 0);
  const carteira = {
    kg: r1(carteiraKg),
    mesesNoRitmo: kgMes > 0 ? r1(carteiraKg / kgMes) : null,
    mesesNaCapacidade: cap > 0 ? r1(carteiraKg / (cap * 1000)) : null,
  };

  // Preço global equivalente (aço + montagem + fabricação) para manter a margem atual em 2027
  const rj = cfg.reajuste2027;
  const aco27 = num(cfg.acoKg) * (1 + num(rj.aco) / 100);
  const mont27 = num(cfg.montagemKg) * (1 + num(rj.montagem) / 100);
  const globalEquivalente = custoKg2027 === null ? null : {
    aco: r2(aco27),
    montagem: r2(mont27),
    fabricacaoMin: custoKg2027,
    globalMin: r2(aco27 + mont27 + custoKg2027),
  };

  return {
    cfg,
    serie,
    janela,
    ajustes,
    base,
    base2027: b27,
    custoKg,
    custoKg2027,
    mesAtual: ultimoMes ? { mes: ultimoMes.mes, tMes: r1(ultimoMes.kg / 1000), custoKg: ultimoMes.kg > 0 ? r2((ultimoMes.maoDeObra + ultimoMes.fixo + ultimoMes.variavel) / ultimoMes.kg) : null } : null,
    ocupacaoPct: cap > 0 ? r1((tMes / cap) * 100) : null,
    curva,
    tabelaVolume,
    equilibrio,
    obras: obrasMargem,
    carteira,
    globalEquivalente,
    alertas: alertasDados({ despesas, obras, serieJanela: janelaBruta, ajustes, hoje }),
  };
}
