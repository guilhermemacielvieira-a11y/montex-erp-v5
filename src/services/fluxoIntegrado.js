// ============================================================
// Fluxo integrado da obra — motor puro (testado)
// ============================================================
// Obra → lista de material (materiais_corte = POSIÇÕES) → estoque da obra
// → CORTE (baixa no estoque, no banco) → POSIÇÕES cortadas liberam as
// MARCAS (pecas_producao) → fabricação → solda → pintura → expedição → envio.
//
// Composição MARCA × POS:
//   • tabela composicao_marcas (importada: conjunto, posição, qtd/unidade);
//   • automática quando a marca é peça única (terça, tirante, calha):
//     a POS tem o mesmo código da marca, ou o corte aponta peca_id da marca.
//   • sem composição → a marca não é bloqueada (aviso "sem composição").
//
// Abastecimento: estoque disponível por chave de estoque (mesma chave que o
// trigger de baixa usa — RPC fluxo_material_obra) é alocado às posições
// ainda não cortadas (as em corte primeiro). Posição sem saldo = "sem estoque".
// ============================================================
import { ORDEM_ETAPAS, normalizarEtapa, ordemEtapa } from './fluxoEtapas';

const CORTE_FINAL = new Set(['cortado', 'concluido', 'finalizado']);
const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

/** Status do corte no modelo de 3 estados, igual ao banco (baixar_corte / trigger). */
export function statusCorte(s) {
  const v = String(s || '').trim().toLowerCase();
  if (CORTE_FINAL.has(v)) return 'finalizado';
  if (v === 'cortando' || v === 'em_corte') return 'cortando';
  return 'aguardando';
}

/** Código de posição/marca comparável ("c1a " → "C1A"). */
export const normCodigo = (s) => String(s ?? '').trim().toUpperCase();
const baseId = (id) => String(id || '').replace(/__split_.*$/, '');

// Ordenação natural (2 < 10 < A1 < A10)
const natural = (a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true });

/**
 * Chave de estoque aproximada (fallback quando a RPC não está disponível).
 * A oficial é public.montex_chave_estoque(montex_resolver_perfil(perfil), material).
 */
export function chaveEstoqueAprox(perfil, material) {
  const txt = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/,/g, '.');
  let p = txt(perfil).replace(/[#*]/g, 'X').replace(/[^A-Z0-9./"Ø]/g, '');
  const ch = p.match(/^CH(\d+(\.\d+)?)/);
  if (ch) p = `CH${ch[1]}`;
  const m = txt(material);
  let mat = 'ND';
  if (/A572/.test(m)) mat = 'A572';
  else if (/CIVIL|ZAR/.test(m)) mat = 'CIVIL300';
  else if (/SAC ?4/.test(m)) mat = 'SAC41';
  else if (/A36|SAE ?10(20|45)/.test(m)) mat = 'A36';
  else if (m) mat = m.replace(/[^A-Z0-9]/g, '');
  return `${p}|${mat}`;
}

/** Fluxo de material calculado no cliente (sem estoque) — fallback da RPC. */
export function fluxoMaterialLocal(cortes = []) {
  const por = new Map();
  const itens = [];
  for (const c of cortes) {
    const chave = chaveEstoqueAprox(c.perfil, c.material);
    itens.push({ id: c.id, chave });
    const kg = num(c.peso_teorico ?? c.peso);
    const cortado = statusCorte(c.status_corte ?? c.status) === 'finalizado';
    const g = por.get(chave) || { chave, perfil: c.perfil, material: c.material, necessario_kg: 0, cortado_kg: 0, a_cortar_kg: 0, baixado_kg: 0, itens_a_cortar: 0, estoque_obra_kg: 0, estoque_fabrica_kg: 0, disponivel_kg: 0, origem_estoque: 'fabrica' };
    g.necessario_kg += kg;
    if (cortado) g.cortado_kg += kg; else { g.a_cortar_kg += kg; g.itens_a_cortar += 1; }
    g.baixado_kg += num(c.baixa_estoque_kg);
    por.set(chave, g);
  }
  return { chaves: [...por.values()], itens, estimado: true };
}

/**
 * Abastecimento das posições: aloca o estoque disponível de cada chave às
 * posições não cortadas (em corte primeiro, depois por código de posição).
 * @returns {{ porId: Map<id,{chave,estado,faltaKg}>, chaves: Array }}
 *   estado: 'cortado' | 'abastecido' | 'parcial' | 'sem_estoque'
 */
export function abastecimentoCorte(cortes = [], fluxo = null, efetivo = null) {
  const f = fluxo || fluxoMaterialLocal(cortes);
  // Pendente real = peso − corte implícito pela produção (já consumido)
  const implicito = (id) => efetivo?.porId?.get(id)?.kgImplicito || 0;
  const chaveDe = new Map((f.itens || []).map((i) => [i.id, i.chave]));
  const saldo = new Map((f.chaves || []).map((c) => [c.chave, Math.max(0, num(c.disponivel_kg))]));
  const porId = new Map();
  const pendentes = [];
  for (const c of cortes) {
    const st = statusCorte(c.status_corte ?? c.status);
    const chave = chaveDe.get(c.id) || chaveEstoqueAprox(c.perfil, c.material);
    if (st === 'finalizado') { porId.set(c.id, { chave, estado: 'cortado', faltaKg: 0 }); continue; }
    const kg = Math.max(0, num(c.peso_teorico ?? c.peso) - implicito(c.id));
    if (kg <= 0.05) { porId.set(c.id, { chave, estado: 'cortado', implicito: efetivo.porId.get(c.id).origem, faltaKg: 0 }); continue; }
    pendentes.push({ c, st, chave, kg, implicito: implicito(c.id) > 0 ? efetivo.porId.get(c.id).origem : null });
  }
  pendentes.sort((a, b) => (a.st === b.st ? natural(a.c.marca, b.c.marca) || natural(a.c.id, b.c.id) : a.st === 'cortando' ? -1 : 1));
  for (const p of pendentes) {
    // Sem consulta ao estoque (RPC indisponível) não dá para afirmar falta
    if (f.estimado) { porId.set(p.c.id, { chave: p.chave, estado: 'nao_consultado', faltaKg: 0 }); continue; }
    const disp = saldo.get(p.chave) || 0;
    const usa = Math.min(disp, p.kg);
    saldo.set(p.chave, disp - usa);
    const falta = r1(p.kg - usa);
    const estado = p.kg <= 0 || falta <= 0.05 ? 'abastecido' : usa > 0 ? 'parcial' : 'sem_estoque';
    porId.set(p.c.id, { chave: p.chave, estado, implicito: p.implicito, faltaKg: estado === 'abastecido' ? 0 : falta });
  }
  // Com corte efetivo: "a cortar" por chave = só o que ainda falta de verdade
  const pendChave = new Map();
  if (efetivo) for (const p of pendentes) pendChave.set(p.chave, (pendChave.get(p.chave) || 0) + p.kg);
  const chaves = (f.chaves || []).map((c0) => {
    const c = efetivo ? { ...c0, a_cortar_kg: r1(pendChave.get(c0.chave) || 0), cortado_kg: r1(num(c0.necessario_kg) - (pendChave.get(c0.chave) || 0)) } : c0;
    return {
    ...c,
    falta_kg: f.estimado ? 0 : r1(Math.max(0, num(c.a_cortar_kg) - num(c.disponivel_kg))),
    cobertura: f.estimado ? null : num(c.a_cortar_kg) > 0 ? Math.min(1, num(c.disponivel_kg) / num(c.a_cortar_kg)) : 1,
    };
  });
  return { porId, chaves, estimado: !!f.estimado, resumoCorte: efetivo?.resumo || null };
}

/**
 * Agrupa as peças (marcas) da obra: soma splits, separa quantidade por etapa.
 */
export function marcasDaObra(pecas = []) {
  const por = new Map();
  for (const p of pecas) {
    const marca = normCodigo(p.marca);
    if (!marca) continue;
    const g = por.get(marca) || { marca, rotulo: p.marca, tipo: p.tipo || '', ids: [], baseIds: new Set(), qtdTotal: 0, pesoTotal: 0, porEtapa: {} };
    const q = Math.max(0, num(p.quantidade, 1));
    const etapa = normalizarEtapa(p.etapa);
    g.ids.push(p.id);
    g.baseIds.add(baseId(p.id));
    g.qtdTotal += q;
    g.pesoTotal += num(p.peso_total ?? p.pesoTotal);
    g.porEtapa[etapa] = (g.porEtapa[etapa] || 0) + q;
    por.set(marca, g);
  }
  for (const g of por.values()) {
    g.qtdAguardando = g.porEtapa.aguardando || 0;
    g.qtdEmProducao = g.qtdTotal - g.qtdAguardando;
    g.pesoUnit = g.qtdTotal > 0 ? g.pesoTotal / g.qtdTotal : 0;
  }
  return por;
}

/**
 * Liberação das marcas pelo corte das posições.
 * @param {object} p
 * @param {Array} p.pecas       pecas_producao da obra (marca, quantidade, etapa, id, tipo, peso_total)
 * @param {Array} p.cortes      materiais_corte da obra (id, marca=POS, quantidade, status_corte, peca_id, peso_teorico)
 * @param {Array} p.composicao  composicao_marcas da obra (marca, pos, qtd_por_unidade)
 * @returns {Map<marca, object>} por marca: composicao ('importada'|'automatica'|'sem'),
 *   posicoes[], unidadesLiberadas, liberadasAguardando, pctCorte, status
 *   status: 'em_producao' | 'liberada' | 'parcial' | 'aguardando_corte' | 'sem_composicao'
 */
export function liberacaoMarcas({ pecas = [], cortes = [], composicao = [] } = {}) {
  const marcas = marcasDaObra(pecas);

  // Posições: quantidade total e cortada (somando linhas repetidas)
  const pos = new Map();
  const posPorPecaId = new Map();
  for (const c of cortes) {
    const k = normCodigo(c.marca);
    if (!k) continue;
    const g = pos.get(k) || { pos: k, qtd: 0, cortada: 0, peso: 0, ids: [] };
    const q = Math.max(0, num(c.quantidade, 1));
    g.qtd += q;
    g.peso += num(c.peso_teorico ?? c.peso);
    if (statusCorte(c.status_corte ?? c.status) === 'finalizado') g.cortada += q;
    g.ids.push(c.id);
    pos.set(k, g);
    if (c.peca_id) posPorPecaId.set(baseId(c.peca_id), k);
  }

  // Composição de cada marca
  const comp = new Map();
  for (const r of composicao) {
    const m = normCodigo(r.marca);
    const k = normCodigo(r.pos);
    if (!m || !k) continue;
    const lista = comp.get(m) || [];
    const ex = lista.find((x) => x.pos === k);
    if (ex) ex.qtdPorUn += num(r.qtd_por_unidade, 1);
    else lista.push({ pos: k, qtdPorUn: Math.max(0.0001, num(r.qtd_por_unidade, 1)) });
    comp.set(m, lista);
  }
  for (const g of marcas.values()) {
    if (comp.has(g.marca)) { g.composicao = 'importada'; g.lista = comp.get(g.marca); continue; }
    let k = pos.has(g.marca) ? g.marca : null;
    if (!k) for (const b of g.baseIds) if (posPorPecaId.has(b)) { k = posPorPecaId.get(b); break; }
    if (k) {
      // Peça única: a POS cobre a marca. qtd/unidade = qtd da POS ÷ qtd da marca (≥1)
      const pq = pos.get(k).qtd;
      const porUn = g.qtdTotal > 0 && pq > g.qtdTotal ? Math.round(pq / g.qtdTotal) || 1 : 1;
      g.composicao = 'automatica';
      g.lista = [{ pos: k, qtdPorUn: porUn }];
    } else {
      g.composicao = 'sem';
      g.lista = [];
    }
  }

  // Alocação gulosa: quem já está em produção consome as posições cortadas
  // primeiro (o material já foi usado), depois as marcas por código.
  const pool = new Map([...pos.values()].map((p) => [p.pos, p.cortada]));
  const ordem = [...marcas.values()].filter((g) => g.lista.length).sort((a, b) => (b.qtdEmProducao > 0) - (a.qtdEmProducao > 0) || natural(a.marca, b.marca));
  for (const g of ordem) {
    let un = g.qtdTotal;
    for (const { pos: k, qtdPorUn } of g.lista) un = Math.min(un, Math.floor(((pool.get(k) || 0) + 1e-9) / qtdPorUn));
    un = Math.max(0, un);
    for (const { pos: k, qtdPorUn } of g.lista) pool.set(k, (pool.get(k) || 0) - un * qtdPorUn);
    g.unidadesLiberadas = un;
  }

  const out = new Map();
  for (const g of marcas.values()) {
    const unid = g.unidadesLiberadas || 0;
    const posicoes = g.lista.map(({ pos: k, qtdPorUn }) => {
      const p = pos.get(k);
      const necessaria = qtdPorUn * g.qtdTotal;
      return { pos: k, qtdPorUn, necessaria, existe: !!p, qtdPos: p?.qtd || 0, cortadaPos: p?.cortada || 0, ids: p?.ids || [], pronta: !!p && p.cortada >= p.qtd };
    });
    // % de corte: posições necessárias cobertas (por quantidade), limitado a 100%
    const nec = posicoes.reduce((s, x) => s + x.necessaria, 0);
    const cob = posicoes.reduce((s, x) => s + Math.min(x.necessaria, x.cortadaPos), 0);
    const liberadasAguardando = Math.max(0, Math.min(g.qtdAguardando, unid - g.qtdEmProducao));
    let status;
    if (g.composicao === 'sem') status = g.qtdAguardando > 0 ? 'sem_composicao' : 'em_producao';
    else if (g.qtdAguardando === 0) status = 'em_producao';
    else if (liberadasAguardando >= g.qtdAguardando) status = 'liberada';
    else if (liberadasAguardando > 0) status = 'parcial';
    else status = 'aguardando_corte';
    out.set(g.marca, {
      marca: g.marca, rotulo: g.rotulo, tipo: g.tipo, ids: g.ids,
      qtdTotal: g.qtdTotal, qtdAguardando: g.qtdAguardando, qtdEmProducao: g.qtdEmProducao,
      pesoTotal: r1(g.pesoTotal), pesoUnit: g.pesoUnit, porEtapa: g.porEtapa,
      composicao: g.composicao, posicoes,
      unidadesLiberadas: unid, liberadasAguardando,
      pctCorte: nec > 0 ? Math.round((cob / nec) * 100) : null,
      status,
    });
  }
  return out;
}

// ------------------------------------------------------------
// Corte EFETIVO = registrado no Kanban de Corte + implícito pela produção
// ------------------------------------------------------------
// O sistema entrou em uso com obras já em andamento: peças fabricadas,
// pintadas e enviadas cujas posições nunca foram apontadas no corte. Toda
// posição usada por uma marca que já está em fabricação (ou depois) FOI
// cortada. Duas regras:
//   • 'producao' (exata): POS ligada à marca (composição ou peça única) →
//     qtd implícita = un. da marca em produção × qtd/un.
//   • 'estimado': POS sem composição → por família (tesoura, viga-mestra,
//     treliça, terça…): % do peso das marcas da família já em produção.
// ------------------------------------------------------------
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
const GERAL = new Set(['CHAPA', 'SUPORTE', 'INSERTO', 'CHUMBADOR', 'PORCA', 'ARRUELA', 'MISULA', 'BOCAL', 'PARAFUSO', 'CANTONEIRA', 'NERVURA', 'ENRIJECEDOR']);

/** Família do tipo de peça/posição para inferência de corte. */
export function familiaCorte(tipo) {
  const t = semAcento(tipo);
  if (!t) return 'GERAL';
  if (/TESOURA|[-_ ]TS$/.test(t)) return 'TESOURA';
  if (/VIGA[-_ ]?MESTRA|[-_ ]VM$/.test(t)) return 'VIGA-MESTRA';
  if (/TRELICA/.test(t)) return 'TRELICA';
  if (/^TERCA/.test(t)) return 'TERCA';
  if (/COLUN/.test(t)) return 'COLUNA';
  if (/^VIGA/.test(t)) return 'VIGA';
  if (/CALHA/.test(t)) return 'CALHA';
  if (/TIRANTE/.test(t)) return 'TIRANTE';
  if (/CONTRAVENT|DIAGONAL$/.test(t)) return 'CONTRAVENTAMENTO';
  if (/MAO[-_ ]?FRANCESA/.test(t)) return 'MAO-FRANCESA';
  if (GERAL.has(t)) return 'GERAL';
  return t;
}

/**
 * @param {object} p
 * @param {Array} p.cortes     materiais_corte da obra
 * @param {Map}   p.liberacao  liberacaoMarcas() da MESMA obra
 * @returns {{ porId: Map<id,{origem,kgImplicito,qtdImplicita,total}>, resumo, conciliaveis: string[] }}
 *   origem: 'registrado' | 'producao' | 'estimado' | null (pendente)
 */
export function corteEfetivo({ cortes = [], liberacao = new Map() } = {}) {
  const porId = new Map();
  const linhas = cortes.map((c) => ({
    c, pos: normCodigo(c.marca), qtd: Math.max(0, num(c.quantidade, 1)), kg: num(c.peso_teorico ?? c.peso),
    cortado: statusCorte(c.status_corte ?? c.status) === 'finalizado',
  }));
  const ordenar = (l) => l.sort((a, b) => natural(a.pos, b.pos) || natural(a.c.id, b.c.id));

  // 1) Implícito exato: POS ligadas a marcas
  const implicitoPos = new Map();
  const ligadas = new Set();
  for (const g of liberacao.values()) for (const x of g.posicoes || []) {
    ligadas.add(x.pos);
    if (g.qtdEmProducao > 0) implicitoPos.set(x.pos, (implicitoPos.get(x.pos) || 0) + g.qtdEmProducao * x.qtdPorUn);
  }
  const porPos = new Map();
  for (const l of linhas) { if (!porPos.has(l.pos)) porPos.set(l.pos, []); porPos.get(l.pos).push(l); }
  for (const [pos, ls] of porPos) {
    if (!ligadas.has(pos)) continue;
    const qtdPos = ls.reduce((s, l) => s + l.qtd, 0);
    const reg = ls.filter((l) => l.cortado).reduce((s, l) => s + l.qtd, 0);
    let extra = Math.max(0, Math.min(qtdPos, implicitoPos.get(pos) || 0) - reg);
    for (const l of ordenar(ls.filter((x) => !x.cortado))) {
      if (extra <= 0) break;
      const q = Math.min(l.qtd, extra);
      extra -= q;
      porId.set(l.c.id, { origem: 'producao', qtdImplicita: q, kgImplicito: l.qtd > 0 ? l.kg * (q / l.qtd) : l.kg, total: q >= l.qtd });
    }
  }

  // 2) Estimado por família: POS sem ligação
  const fam = new Map(); // família → { kgTot, kgProd } das marcas
  const add = (k, tot, prod) => { const f = fam.get(k) || { kgTot: 0, kgProd: 0, kgTotSem: 0, kgProdSem: 0 }; f.kgTot += tot; f.kgProd += prod; fam.set(k, f); return f; };
  for (const g of liberacao.values()) {
    const tot = g.pesoTotal || 0;
    const prod = (g.qtdEmProducao || 0) * (g.pesoUnit || 0);
    const f = add(familiaCorte(g.tipo), tot, prod);
    if (g.composicao === 'sem') { f.kgTotSem += tot; f.kgProdSem += prod; }
  }
  const geral = [...fam.values()].reduce((a, f) => ({ t: a.t + f.kgTotSem, p: a.p + f.kgProdSem, tt: a.tt + f.kgTot, pp: a.pp + f.kgProd }), { t: 0, p: 0, tt: 0, pp: 0 });
  const fracGeral = geral.t > 0 ? geral.p / geral.t : geral.tt > 0 ? geral.pp / geral.tt : 0;
  const fracDe = (k) => {
    const f = fam.get(k);
    if (k === 'GERAL' || !f) return fracGeral;
    if (f.kgTotSem > 0) return f.kgProdSem / f.kgTotSem;
    return f.kgTot > 0 ? f.kgProd / f.kgTot : fracGeral;
  };
  const semLig = new Map();
  for (const l of linhas) {
    if (ligadas.has(l.pos)) continue;
    const k = familiaCorte(l.c.peca);
    if (!semLig.has(k)) semLig.set(k, []);
    semLig.get(k).push(l);
  }
  for (const [k, ls] of semLig) {
    const tot = ls.reduce((s, l) => s + l.kg, 0);
    const reg = ls.filter((l) => l.cortado).reduce((s, l) => s + l.kg, 0);
    let extra = Math.max(0, Math.min(1, fracDe(k)) * tot - reg);
    for (const l of ordenar(ls.filter((x) => !x.cortado))) {
      if (extra <= 0.05) break;
      const kg = Math.min(l.kg, extra);
      extra -= kg;
      porId.set(l.c.id, { origem: 'estimado', kgImplicito: kg, qtdImplicita: l.kg > 0 ? l.qtd * (kg / l.kg) : l.qtd, total: kg >= l.kg - 0.05 });
    }
  }

  const resumo = { totalKg: 0, registradoKg: 0, producaoKg: 0, estimadoKg: 0, pendenteKg: 0 };
  const conciliaveis = [];
  for (const l of linhas) {
    resumo.totalKg += l.kg;
    if (l.cortado) { resumo.registradoKg += l.kg; porId.set(l.c.id, { origem: 'registrado', kgImplicito: 0, qtdImplicita: 0, total: true }); continue; }
    const e = porId.get(l.c.id);
    if (e?.origem === 'producao') resumo.producaoKg += e.kgImplicito;
    if (e?.origem === 'estimado') resumo.estimadoKg += e.kgImplicito;
    resumo.pendenteKg += l.kg - (e?.kgImplicito || 0);
    if (e?.origem === 'producao' && e.total) conciliaveis.push(l.c.id);
  }
  for (const k of Object.keys(resumo)) resumo[k] = r1(resumo[k]);
  return { porId, resumo, conciliaveis };
}

/** Posições ligadas a cada marca (inverso): POS → [marcas]. */
export function marcasPorPosicao(liberacao) {
  const m = new Map();
  for (const g of liberacao.values()) for (const p of g.posicoes) {
    const l = m.get(p.pos) || [];
    l.push({ marca: g.rotulo || g.marca, qtdPorUn: p.qtdPorUn, status: g.status });
    m.set(p.pos, l);
  }
  return m;
}

/**
 * Pode avançar `qtd` unidades da marca de 'aguardando' para 'fabricacao'?
 * Sem composição não bloqueia (só avisa).
 */
export function podeIniciarFabricacao(info, qtd = 1) {
  if (!info) return { ok: true, aviso: null };
  if (info.composicao === 'sem') return { ok: true, aviso: 'Marca sem composição de posições cadastrada — corte não conferido.' };
  if (info.liberadasAguardando >= qtd) return { ok: true, aviso: null };
  const faltam = info.posicoes.filter((p) => !p.pronta).map((p) => p.pos);
  return {
    ok: false,
    aviso: `Corte incompleto: ${info.liberadasAguardando} de ${qtd} un liberada(s).${faltam.length ? ` Posições pendentes: ${faltam.slice(0, 8).join(', ')}${faltam.length > 8 ? '…' : ''}.` : ''}`,
  };
}

/**
 * Painel do fluxo da obra (kg em cada estágio).
 */
export function pipelineObra({ abastecimento, liberacao, pecas = [] } = {}) {
  const ch = abastecimento?.chaves || [];
  const sum = (k) => r1(ch.reduce((s, c) => s + num(c[k]), 0));
  const kgEtapa = Object.fromEntries(ORDEM_ETAPAS.map((e) => [e, 0]));
  for (const p of pecas) {
    const e = normalizarEtapa(p.etapa);
    if (ordemEtapa(e) >= 0) kgEtapa[e] += num(p.peso_total ?? p.pesoTotal);
  }
  let liberadasKg = 0, aguardandoCorteKg = 0, semComposicaoKg = 0, marcasLiberadas = 0, marcasAguardando = 0;
  for (const g of liberacao?.values?.() || []) {
    liberadasKg += g.liberadasAguardando * g.pesoUnit;
    if (g.status === 'sem_composicao') semComposicaoKg += g.qtdAguardando * g.pesoUnit;
    else aguardandoCorteKg += (g.qtdAguardando - g.liberadasAguardando) * g.pesoUnit;
    if (g.status === 'liberada' || g.status === 'parcial') marcasLiberadas++;
    if (g.status === 'aguardando_corte') marcasAguardando++;
  }
  const disponivel = sum('disponivel_kg');
  const aCortar = sum('a_cortar_kg');
  return {
    necessarioKg: sum('necessario_kg'),
    estoqueDisponivelKg: disponivel,
    aCortarKg: aCortar,
    abastecidoKg: r1(ch.reduce((s, c) => s + Math.min(num(c.a_cortar_kg), num(c.disponivel_kg)), 0)),
    faltaComprarKg: sum('falta_kg'),
    cortadoKg: sum('cortado_kg'),
    liberadasKg: r1(liberadasKg),
    aguardandoCorteKg: r1(aguardandoCorteKg),
    semComposicaoKg: r1(semComposicaoKg),
    marcasLiberadas, marcasAguardando,
    etapasKg: Object.fromEntries(Object.entries(kgEtapa).map(([k, v]) => [k, r1(v)])),
    estimado: !!abastecimento?.estimado,
    // Composição do "Cortado": apontado no corte × implícito pela produção
    corteRegistradoKg: abastecimento?.resumoCorte?.registradoKg ?? null,
    corteProducaoKg: abastecimento?.resumoCorte?.producaoKg ?? 0,
    corteEstimadoKg: abastecimento?.resumoCorte?.estimadoKg ?? 0,
  };
}

// ------------------------------------------------------------
// Importação da lista de posições (Tekla / planilha) → linhas
// ------------------------------------------------------------
const COLS = {
  conjunto: ['conjunto', 'marca conjunto', 'assembly', 'assembly mark', 'marca do conjunto', 'conj'],
  pos: ['posicao', 'posição', 'pos', 'part mark', 'part', 'marca peca', 'marca da peca', 'peca marca', 'marca'],
  tipo: ['tipo', 'nome', 'name', 'descricao', 'descrição', 'peca', 'peça'],
  qtd: ['qtd', 'qtde', 'quantidade', 'qty', 'quant'],
  qtdConj: ['qtd/conj', 'qtd por conjunto', 'qtd conj', 'qtd p/ conj', 'qtd por unidade'],
  perfil: ['perfil', 'profile', 'bitola'],
  comprimento: ['comprimento', 'comp', 'length', 'comprimento (mm)', 'comp (mm)'],
  material: ['material', 'grade', 'aco', 'aço'],
  peso: ['peso', 'peso total', 'peso (kg)', 'weight', 'peso teorico', 'peso total (kg)'],
};
const nrm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** Descobre a linha de cabeçalho e o índice de cada coluna. */
export function mapearColunas(linhas = []) {
  for (let i = 0; i < Math.min(linhas.length, 25); i++) {
    const cab = (linhas[i] || []).map(nrm);
    const idx = {};
    const usadas = new Set();
    for (const [k, nomes] of Object.entries(COLS)) {
      // prioridade pela ordem dos nomes ("posição" antes de "marca")
      for (const n of nomes.map(nrm)) {
        const j = cab.findIndex((c, ci) => c === n && !usadas.has(ci));
        if (j >= 0) { idx[k] = j; usadas.add(j); break; }
      }
    }
    // Posição explícita + coluna "marca" livre → a marca é o conjunto
    if (idx.conjunto == null) {
      const j = cab.findIndex((c, ci) => c === 'marca' && !usadas.has(ci));
      if (j >= 0) idx.conjunto = j;
    }
    if (idx.pos != null && idx.perfil != null) return { linhaCab: i, idx };
  }
  return null;
}

const numBR = (v) => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim();
  if (!s) return 0;
  const t = /,\d{1,3}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  return Number(t) || 0;
};

/**
 * Lista de posições (lista de corte por POS). Aceita coluna de conjunto
 * (planilha plana) ou o formato hierárquico do Tekla (linha do conjunto sem
 * perfil, seguida das posições).
 * @returns {{ posicoes: Array, composicao: Array, avisos: string[] }}
 *   posicoes agregadas por POS: { pos, tipo, quantidade, perfil, comprimento_mm, material, peso_teorico }
 *   composicao: { marca, pos, qtd_por_unidade }
 */
export function parseListaPosicoes(linhas = [], { qtdConjuntos = new Map() } = {}) {
  const avisos = [];
  const mapa = mapearColunas(linhas);
  if (!mapa) return { posicoes: [], composicao: [], avisos: ['Cabeçalho não encontrado (precisa de colunas de posição/marca e perfil).'] };
  const { linhaCab, idx } = mapa;
  const val = (l, k) => (idx[k] != null ? l[idx[k]] : undefined);
  const porPos = new Map();
  const comp = new Map();
  let conjAtual = null;
  for (let i = linhaCab + 1; i < linhas.length; i++) {
    const l = linhas[i] || [];
    const pos = normCodigo(val(l, 'pos'));
    const perfil = String(val(l, 'perfil') ?? '').trim();
    const conjCol = normCodigo(val(l, 'conjunto'));
    if (!pos && !conjCol) continue;
    if (idx.conjunto == null && pos && !perfil) { conjAtual = pos; continue; } // linha de conjunto (hierárquico)
    if (!pos || !perfil) continue;
    const qtd = Math.max(1, Math.round(numBR(val(l, 'qtd')) || 1));
    const peso = numBR(val(l, 'peso'));
    const g = porPos.get(pos) || { pos, tipo: String(val(l, 'tipo') ?? '').trim(), quantidade: 0, perfil, comprimento_mm: Math.round(numBR(val(l, 'comprimento'))) || null, material: String(val(l, 'material') ?? '').trim(), peso_teorico: 0 };
    if (g.perfil !== perfil) avisos.push(`POS ${pos}: perfis diferentes (${g.perfil} × ${perfil}) — mantido o primeiro.`);
    g.quantidade += qtd;
    g.peso_teorico += peso;
    porPos.set(pos, g);
    const conj = conjCol || conjAtual;
    if (conj && conj !== pos) {
      const porConj = numBR(val(l, 'qtdConj'));
      const nConj = qtdConjuntos.get(conj) || 0;
      const porUn = porConj > 0 ? porConj : nConj > 0 ? qtd / nConj : qtd;
      const k = `${conj}|${pos}`;
      const e = comp.get(k) || { marca: conj, pos, qtd_por_unidade: 0 };
      e.qtd_por_unidade += porUn;
      comp.set(k, e);
    }
  }
  const posicoes = [...porPos.values()].map((p) => ({ ...p, peso_teorico: r1(p.peso_teorico) }));
  if (!posicoes.length) avisos.push('Nenhuma posição com perfil encontrada.');
  return { posicoes, composicao: [...comp.values()].map((c) => ({ ...c, qtd_por_unidade: Math.round(c.qtd_por_unidade * 1000) / 1000 })), avisos };
}

/**
 * Compara a lista importada com o que já existe em materiais_corte da obra:
 * novas (inserir), alteradas (só se ainda não cortadas) e bloqueadas (já cortadas).
 */
export function planoImportacaoPosicoes(posicoes = [], existentes = []) {
  const ex = new Map();
  for (const c of existentes) {
    const k = normCodigo(c.marca);
    const l = ex.get(k) || [];
    l.push(c);
    ex.set(k, l);
  }
  const novas = [], alteradas = [], iguais = [], bloqueadas = [];
  for (const p of posicoes) {
    const l = ex.get(p.pos);
    if (!l) { novas.push(p); continue; }
    const algumaCortada = l.some((c) => statusCorte(c.status_corte) !== 'aguardando');
    const atual = l[0];
    const mudou = l.length > 1 || num(atual.quantidade) !== p.quantidade || String(atual.perfil || '').trim() !== p.perfil || Math.abs(num(atual.peso_teorico) - p.peso_teorico) > 0.05;
    if (!mudou) iguais.push(p);
    else if (algumaCortada) bloqueadas.push({ ...p, atual });
    else alteradas.push({ ...p, atual });
  }
  return { novas, alteradas, iguais, bloqueadas };
}
