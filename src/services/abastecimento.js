// ============================================================
// Abastecimento automático de pedido futuro (Compras)
// ============================================================
// A partir da LISTA DE MATERIAIS da obra (materiais_corte / BOM), cruza com o
// estoque atual e gera o que falta comprar. Estima o preço de cada perfil/
// material pela BASE DE ÚLTIMOS VALORES lançados em materiais PARECIDOS —
// combinando 3 fontes: movimentações de entrada (custo_unitario), preços do
// estoque e itens de notas fiscais. Match por tokens (grafia-tolerante).
//
// Puro/testável (sem I/O). Usado por AbastecimentoAutomatico.jsx.
// ============================================================

export const normalizar = (s) => String(s || '')
  .toUpperCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(n * 100) / 100;

// Casa um PERFIL a um item de estoque existente (mesma regra usada no
// abastecimento): chave do perfil normalizada (12 primeiros chars) procurada em
// descricao/codigo/perfil/material do item. Retorna o item casado ou null.
// Reutilizado no recebimento de compras p/ atualizar o saldo do item certo.
export function matchEstoqueItem(estoque = [], perfil = '') {
  const chave = normalizar(perfil).slice(0, 12);
  if (!chave) return null;
  return (estoque || []).find((e) =>
    normalizar(`${e.descricao || ''} ${e.codigo || ''} ${e.perfil || ''} ${e.material || ''}`).includes(chave)
  ) || null;
}

// Constrói o histórico de preços por material (chave normalizada → entradas
// ordenadas por data desc) a partir das 3 fontes disponíveis.
export function construirHistoricoPrecos({ movimentacoes = [], estoque = [], notasFiscais = [] } = {}) {
  const porMaterial = new Map();
  const add = (texto, valorUnit, data, fornecedor, fonte, unidade) => {
    const chave = normalizar(texto);
    const v = num(valorUnit);
    if (!chave || v <= 0) return;
    if (!porMaterial.has(chave)) porMaterial.set(chave, []);
    porMaterial.get(chave).push({ descricao: String(texto).trim(), valorUnit: v, data: String(data || ''), fornecedor: fornecedor || '', fonte, unidade: (unidade || 'KG') });
  };

  // 1) Movimentações de ENTRADA com custo unitário (inclui importação de chegada).
  //    Indexa por PERFIL + material (o perfil é o identificador forte no match).
  (movimentacoes || []).forEach((m) => {
    if (String(m.tipo || '').toLowerCase() !== 'entrada') return;
    const texto = [m.material_perfil, m.material].filter(Boolean).join(' ');
    add(texto, m.custo_unitario, m.data, m.fornecedor, 'movimentacao', m.unidade);
  });
  // 2) Preço atual dos itens de estoque
  (estoque || []).forEach((e) => {
    const texto = [e.perfil, e.material, e.descricao].filter(Boolean).join(' ') || e.descricao || e.codigo;
    add(texto, e.preco, e.ultima_entrada, e.fornecedor, 'estoque', e.unidade);
  });
  // 3) Itens das notas fiscais
  (notasFiscais || []).forEach((nf) => {
    const itens = Array.isArray(nf.itens) ? nf.itens : [];
    const forn = nf.fornecedor || '';
    const data = nf.data_emissao || nf.dataEmissao || nf.data_entrada || nf.dataEntrada || nf.created_at || '';
    itens.forEach((i) => {
      const vu = i.valorUnit ?? i.precoUnitario ?? i.valor_unitario ?? (num(i.valorTotal) / (num(i.quantidade ?? i.qtd) || 1));
      add(i.descricao, vu, data, forn, 'nf', i.unidade);
    });
  });

  porMaterial.forEach((arr) => arr.sort((a, b) => String(b.data).localeCompare(String(a.data))));
  return { porMaterial };
}

// Estima o preço unitário (R$/kg) para um material pelo match de tokens com o
// histórico. O PERFIL é o identificador forte: usa o token mais longo da
// consulta (ex.: "W200X19", "HP250X62", "L64X64X6") como chave de pool e
// REÚNE as entradas de TODAS as chaves que o contêm — combinando as 3 fontes
// (estoque + movimentações + NF) num único conjunto. Assim último/média/menor
// enxergam todos os lançamentos daquele perfil, sem cross-match por tokens
// genéricos ("A572", "GR", "50") que casariam perfis diferentes.
export function estimarPreco(historico, texto, minLen = 3) {
  const tokens = normalizar(texto).split(' ').filter((t) => t.length >= 2);
  if (!tokens.length || !historico?.porMaterial?.size) return null;
  const perfilToken = tokens.reduce((a, t) => (t.length > a.length ? t : a), '');
  if (perfilToken.length < minLen) return null;

  const pool = [];
  historico.porMaterial.forEach((entradas, chave) => {
    if (!chave.includes(perfilToken)) return;
    entradas.forEach((e) => { if (e.valorUnit > 0) pool.push(e); });
  });
  if (!pool.length) return null;

  pool.sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const valores = pool.map((e) => e.valorUnit);
  const recente = pool[0];
  return {
    valorUnit: recente.valorUnit,
    media: r2(valores.reduce((a, v) => a + v, 0) / valores.length),
    menor: r2(Math.min(...valores)),
    fonte: recente.fonte,
    fornecedor: recente.fornecedor,
    data: recente.data,
    ocorrencias: pool.length,
    score: 100,
  };
}

// Preço de REFERÊNCIA (fallback) a partir do ESTOQUE (base confiável de aço,
// R$/kg). Média por família de material + média geral. Não usa NF aqui — NFs
// costumam ser consumíveis (discos, gás, EPI) e poluiriam a média do aço.
export function precoReferencia({ estoque = [] } = {}) {
  const porMaterial = new Map(); // materialNorm -> { soma, n }
  let somaGeral = 0, nGeral = 0;
  (estoque || []).forEach((e) => {
    const p = num(e.preco);
    if (p <= 0) return;
    somaGeral += p; nGeral += 1;
    const mk = normalizar(e.material);
    if (!mk) return;
    if (!porMaterial.has(mk)) porMaterial.set(mk, { soma: 0, n: 0 });
    const o = porMaterial.get(mk); o.soma += p; o.n += 1;
  });
  const mediasMaterial = new Map();
  porMaterial.forEach((o, k) => mediasMaterial.set(k, r2(o.soma / o.n)));
  return { mediasMaterial, geral: nGeral ? r2(somaGeral / nGeral) : 0 };
}

// Agrega o BOM por perfil+material, subtrai o estoque e estima preço/valor.
// Preço: 1) match específico no histórico (estoque/movimentações/NF); senão
// 2) média da FAMÍLIA de material (estoque); senão 3) média geral do estoque.
// `estrategia`: 'ultimo' (default) | 'media' | 'menor' — como precificar o
// match específico (o fallback já é uma média, então não muda).
export function montarAbastecimento({ bom = [], estoque = [], historico, estrategia = 'ultimo' } = {}) {
  const pick = (e) => estrategia === 'media' ? e.media : estrategia === 'menor' ? e.menor : e.valorUnit;
  const grupos = new Map();
  (bom || []).forEach((mc) => {
    const perfil = String(mc.perfil || '').trim();
    const material = String(mc.material || '').trim();
    const key = `${perfil}|${material}`;
    if (!grupos.has(key)) grupos.set(key, { perfil: perfil || '—', material: material || '—', qtd: 0, pesoNecessario: 0, itens: 0 });
    const g = grupos.get(key);
    g.qtd += num(mc.quantidade);
    g.pesoNecessario += num(mc.peso_teorico);
    g.itens += 1;
  });

  const ref = precoReferencia({ estoque });
  const FONTE_LABEL = {
    movimentacao: 'última entrada', estoque: 'estoque', nf: 'nota fiscal',
    media_material: 'média do material', media_geral: 'média geral', sem_base: 'sem base',
  };

  const linhas = [];
  grupos.forEach((g) => {
    // Estoque disponível: casa pelo perfil (helper compartilhado)
    const est = g.perfil !== '—' ? matchEstoqueItem(estoque, g.perfil) : null;
    const pesoEstoque = est ? (num(est.peso_kg) || num(est.quantidade)) : 0;
    const pesoFalta = Math.max(0, r2(g.pesoNecessario - pesoEstoque));

    // 1) match específico
    let estimativa = historico ? estimarPreco(historico, `${g.perfil} ${g.material}`) : null;
    let precoKg, fonte, fornecedorSugerido = '';
    if (estimativa?.valorUnit > 0) {
      precoKg = pick(estimativa) || estimativa.valorUnit;
      fonte = estimativa.fonte;
      fornecedorSugerido = estimativa.fornecedor || '';
    } else {
      const mm = ref.mediasMaterial.get(normalizar(g.material));
      if (mm > 0) { precoKg = mm; fonte = 'media_material'; }
      else if (ref.geral > 0) { precoKg = ref.geral; fonte = 'media_geral'; }
      else { precoKg = 0; fonte = 'sem_base'; }
      estimativa = { valorUnit: precoKg, media: precoKg, menor: precoKg, fonte, fornecedor: '', ocorrencias: 0, score: 0 };
    }

    linhas.push({
      perfil: g.perfil,
      material: g.material,
      qtd: g.qtd,
      itens: g.itens,
      pesoNecessario: r2(g.pesoNecessario),
      pesoEstoque: r2(pesoEstoque),
      pesoFalta,
      precoKg: r2(precoKg),
      fonte,
      fonteLabel: FONTE_LABEL[fonte] || fonte,
      fornecedorSugerido,
      valorEstimado: r2(pesoFalta * precoKg),
      estimativa,
      comprar: pesoFalta > 0,
    });
  });

  linhas.sort((a, b) => b.valorEstimado - a.valorEstimado || b.pesoFalta - a.pesoFalta);
  const aComprar = linhas.filter((l) => l.pesoFalta > 0);
  return {
    linhas,
    totalPesoFalta: r2(aComprar.reduce((s, l) => s + l.pesoFalta, 0)),
    totalValor: r2(aComprar.reduce((s, l) => s + l.valorEstimado, 0)),
    itensAComprar: aComprar.length,
    semPreco: aComprar.filter((l) => !l.precoKg).length,
    comCobertura: linhas.length - aComprar.length,
    precoRef: ref,
  };
}

// Agrupa as linhas (a comprar) pelo FORNECEDOR SUGERIDO — cada grupo vira um
// pedido. Sem fornecedor conhecido cai em "A definir". Ordena por valor desc.
export function agruparPorFornecedor(linhas = []) {
  const grupos = new Map();
  linhas.filter((l) => l.pesoFalta > 0).forEach((l) => {
    const forn = (l.fornecedorSugerido || '').trim() || 'A definir';
    if (!grupos.has(forn)) grupos.set(forn, { fornecedor: forn, linhas: [], peso: 0, valor: 0 });
    const g = grupos.get(forn);
    g.linhas.push(l);
    g.peso = r2(g.peso + l.pesoFalta);
    g.valor = r2(g.valor + l.valorEstimado);
  });
  return [...grupos.values()].sort((a, b) => b.valor - a.valor);
}
