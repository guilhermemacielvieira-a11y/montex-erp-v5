// ============================================================
// Estoque Analytics — KPIs, saúde, curva ABC, filtros e ordenação
// ============================================================
// Camada PURA/testável que centraliza toda a inteligência do módulo de estoque:
// classificação de saúde (alinhada ao ponto de reposição), valor/peso por item,
// KPIs, curva ABC (Pareto), agregação por categoria e um filtro/ordenador
// unificados e FUNCIONAIS. A página (EstoquePageV2) só consome estas funções.
// ============================================================

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(n * 100) / 100;

// Saúde do item — prioridade menor = mais urgente (usada na ordenação).
export const SAUDE = {
  zerado:     { key: 'zerado', label: 'Zerado', cor: '#64748b', prioridade: 0, badge: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
  critico:    { key: 'critico', label: 'Crítico', cor: '#ef4444', prioridade: 1, badge: 'bg-red-500/20 text-red-300 border-red-500/40' },
  baixo:      { key: 'baixo', label: 'Baixo', cor: '#f59e0b', prioridade: 2, badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  atencao:    { key: 'atencao', label: 'Atenção', cor: '#eab308', prioridade: 3, badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  excesso:    { key: 'excesso', label: 'Excesso', cor: '#3b82f6', prioridade: 4, badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  saudavel:   { key: 'saudavel', label: 'Saudável', cor: '#10b981', prioridade: 5, badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  entregue:   { key: 'entregue', label: 'Entregue', cor: '#22c55e', prioridade: 4.5, badge: 'bg-green-500/20 text-green-300 border-green-500/40' },
  sem_minimo: { key: 'sem_minimo', label: 'Sem mínimo', cor: '#94a3b8', prioridade: 6, badge: 'bg-slate-600/30 text-slate-400 border-slate-600/50' },
};

// Classifica a saúde de um item pelo saldo × mínimo/máximo. Para itens de OBRA
// (com necessidade cadastrada em `pedido`) totalmente recebidos (falta ≤ 0),
// o status é "Entregue".
export function saudeItem(item = {}) {
  const q = num(item.quantidade);
  const minimo = num(item.minimo);
  const maximo = num(item.maximo);
  if (temNecessidade(item) && q > 0 && faltaItem(item) <= 0) return 'entregue';
  if (q <= 0) return 'zerado';
  if (minimo <= 0) return 'sem_minimo'; // sem ponto de reposição → não classificável
  if (q <= minimo * 0.5) return 'critico';
  if (q <= minimo) return 'baixo';
  if (q <= minimo * 1.2) return 'atencao';
  if (maximo > 0 && q > maximo) return 'excesso';
  return 'saudavel';
}

// Valor financeiro do item em estoque (R$).
export function valorItem(item = {}) {
  return r2(num(item.quantidade) * num(item.preco ?? item.precoUnitario));
}

// Peso do item (kg): usa peso_kg quando houver; senão a quantidade se a unidade é KG.
export function pesoItem(item = {}) {
  const pk = num(item.peso_kg);
  if (pk > 0) return pk;
  return String(item.unidade || '').toUpperCase() === 'KG' ? num(item.quantidade) : 0;
}

// Necessidade da obra (peso teórico), o que chegou e o que falta — usa as
// colunas pedido/comprado/falta (populadas p/ itens de obra). `falta` cai para
// max(0, necessário − chegou) quando a coluna não vem.
export function necessarioItem(item = {}) { return num(item.pedido); }
export function chegouItem(item = {}) { return num(item.comprado); }
export function faltaItem(item = {}) {
  if (item.falta !== undefined && item.falta !== null) return Math.max(0, num(item.falta));
  return Math.max(0, r2(necessarioItem(item) - chegouItem(item)));
}
// Item que participa do controle de "faltante" (tem necessidade cadastrada).
export function temNecessidade(item = {}) { return necessarioItem(item) > 0; }

// KPIs consolidados de um conjunto de itens.
export function kpisEstoque(items = []) {
  const porSaude = {};
  Object.keys(SAUDE).forEach((k) => { porSaude[k] = 0; });
  let valorTotal = 0, pesoTotal = 0, semPreco = 0, semMinimo = 0, valorEmRisco = 0;
  let totalNecessario = 0, totalChegou = 0, totalExcedente = 0, totalFalta = 0, itensComNecessidade = 0, itensComFalta = 0;
  (items || []).forEach((it) => {
    const s = saudeItem(it);
    porSaude[s] = (porSaude[s] || 0) + 1;
    const v = valorItem(it);
    valorTotal += v;
    pesoTotal += pesoItem(it);
    if (num(it.preco ?? it.precoUnitario) <= 0) semPreco += 1;
    if (num(it.minimo) <= 0) semMinimo += 1;
    if (s === 'zerado' || s === 'critico' || s === 'baixo') valorEmRisco += v;
    if (temNecessidade(it)) {
      itensComNecessidade += 1;
      const nec = necessarioItem(it);
      const bruto = chegouItem(it);
      totalNecessario += nec;
      // "Já chegou" conta só até o necessário (excedente não infla cobertura).
      totalChegou += Math.min(bruto, nec);
      totalExcedente += Math.max(0, bruto - nec);
      const f = faltaItem(it);
      totalFalta += f;
      if (f > 0) itensComFalta += 1;
    }
  });
  const alertas = porSaude.zerado + porSaude.critico + porSaude.baixo;
  return {
    nItens: (items || []).length,
    valorTotal: r2(valorTotal),
    pesoTotal: r2(pesoTotal),
    porSaude,
    alertas,
    saudaveis: porSaude.saudavel + porSaude.excesso + porSaude.entregue,
    semPreco,
    semMinimo,
    valorEmRisco: r2(valorEmRisco),
    // Controle de faltante (obra)
    itensComNecessidade,
    itensComFalta,
    totalNecessario: r2(totalNecessario),
    totalChegou: r2(totalChegou),
    totalExcedente: r2(totalExcedente),
    totalFalta: r2(totalFalta),
    coberturaPct: totalNecessario > 0 ? r2((totalChegou / totalNecessario) * 100) : null,
  };
}

// Resumo de MATERIAL DA OBRA (necessário × entregue), para relatórios. Usa os
// itens com necessidade cadastrada (pedido>0). Status: entregue (falta<=0),
// parcial (chegou algo) ou faltando (nada chegou).
export function resumoMaterialObra(estoque = []) {
  const linhas = (estoque || []).filter(temNecessidade).map((it) => {
    const necessario = necessarioItem(it);
    const bruto = chegouItem(it);
    // "entregue" ÚTIL = material recebido até o NECESSÁRIO. O que passa disso é
    // EXCEDENTE (ex.: chaparia entregue para o galpão inteiro numa obra que é só
    // a Etapa 1) e NÃO é computado como entregue/cobertura — só o necessário
    // conta como entregue.
    const entregue = Math.min(bruto, necessario);
    const excedente = r2(Math.max(0, bruto - necessario));
    const falta = faltaItem(it);
    const status = falta <= 0 ? 'entregue' : entregue > 0 ? 'parcial' : 'faltando';
    return {
      perfil: it.perfil || it.codigo || '—',
      material: it.material || '',
      necessario: r2(necessario),
      entregue: r2(entregue),
      entregueBruto: r2(bruto),
      excedente,
      falta: r2(falta),
      coberturaPct: necessario > 0 ? r2(Math.min(100, (entregue / necessario) * 100)) : 0,
      status,
    };
  }).sort((a, b) => b.necessario - a.necessario);
  const totalNecessario = r2(linhas.reduce((s, l) => s + l.necessario, 0));
  const totalEntregue = r2(linhas.reduce((s, l) => s + l.entregue, 0));
  const totalExcedente = r2(linhas.reduce((s, l) => s + l.excedente, 0));
  const totalFalta = r2(linhas.reduce((s, l) => s + l.falta, 0));
  return {
    linhas,
    totalNecessario,
    totalEntregue,
    totalExcedente,
    totalFalta,
    coberturaPct: totalNecessario > 0 ? r2((totalEntregue / totalNecessario) * 100) : null,
    entregues: linhas.filter((l) => l.status === 'entregue').length,
    parciais: linhas.filter((l) => l.status === 'parcial').length,
    faltando: linhas.filter((l) => l.status === 'faltando').length,
  };
}

// Curva ABC (Pareto) por valor em estoque: A ≤80% acumulado, B ≤95%, C resto.
export function curvaABC(items = []) {
  const comValor = (items || [])
    .map((it) => ({ item: it, valor: valorItem(it) }))
    .filter((r) => r.valor > 0)
    .sort((a, b) => b.valor - a.valor);
  const total = comValor.reduce((s, r) => s + r.valor, 0);
  const resumo = { A: { n: 0, valor: 0 }, B: { n: 0, valor: 0 }, C: { n: 0, valor: 0 } };
  let acum = 0;
  const rows = comValor.map((r) => {
    // Classe pelo acumulado ANTES deste item: o item que cruza o limiar ainda
    // entra na classe inferior (convenção ABC — o 1º item é sempre A).
    const prevPct = total > 0 ? (acum / total) * 100 : 0;
    acum += r.valor;
    const acumPct = total > 0 ? (acum / total) * 100 : 0;
    const classe = prevPct < 80 ? 'A' : prevPct < 95 ? 'B' : 'C';
    resumo[classe].n += 1;
    resumo[classe].valor = r2(resumo[classe].valor + r.valor);
    return {
      ...r.item,
      _valor: r2(r.valor),
      _pct: total > 0 ? r2((r.valor / total) * 100) : 0,
      _acumPct: r2(acumPct),
      _classe: classe,
    };
  });
  return { rows, total: r2(total), resumo };
}

// Agrega valor/peso/itens por categoria (categoria || tipo). Ordena por valor desc.
export function agregadoCategoria(items = []) {
  const grupos = new Map();
  (items || []).forEach((it) => {
    const cat = String(it.categoria || it.tipo || 'Sem categoria').trim() || 'Sem categoria';
    if (!grupos.has(cat)) grupos.set(cat, { categoria: cat, nItens: 0, valor: 0, peso: 0 });
    const g = grupos.get(cat);
    g.nItens += 1;
    g.valor = r2(g.valor + valorItem(it));
    g.peso = r2(g.peso + pesoItem(it));
  });
  return [...grupos.values()].sort((a, b) => b.valor - a.valor);
}

const norm = (s) => String(s || '').toLowerCase();

// Filtro FUNCIONAL unificado. `saude` aceita uma chave de SAUDE, 'alerta'
// (zerado+critico+baixo) ou 'todos'. `semPreco`/`semMinimo` são flags.
export function filtrarEstoque(items = [], { busca = '', categoria = 'todas', saude = 'todos', semPreco = false, semMinimo = false } = {}) {
  const termo = norm(busca).trim();
  return (items || []).filter((it) => {
    if (categoria !== 'todas' && String(it.categoria || it.tipo) !== categoria) return false;
    if (saude && saude !== 'todos') {
      const s = saudeItem(it);
      if (saude === 'alerta') { if (!['zerado', 'critico', 'baixo'].includes(s)) return false; }
      else if (s !== saude) return false;
    }
    if (semPreco && num(it.preco ?? it.precoUnitario) > 0) return false;
    if (semMinimo && num(it.minimo) > 0) return false;
    if (termo) {
      const hay = norm(`${it.codigo || ''} ${it.descricao || ''} ${it.nome || ''} ${it.material || ''} ${it.perfil || ''} ${it.fornecedor || ''} ${it.localizacao || ''}`);
      if (!hay.includes(termo)) return false;
    }
    return true;
  });
}

// Ordenação por campo lógico. Campos: codigo, descricao, categoria, quantidade,
// valor, saude (por urgência). `dir`: 'asc' | 'desc'.
export function ordenarEstoque(items = [], campo = 'valor', dir = 'desc') {
  const mult = dir === 'asc' ? 1 : -1;
  const val = (it) => {
    switch (campo) {
      case 'codigo': return norm(it.codigo || it.descricao);
      case 'descricao': return norm(it.descricao || it.nome || it.codigo);
      case 'categoria': return norm(it.categoria || it.tipo);
      case 'quantidade': return num(it.quantidade);
      case 'saude': return SAUDE[saudeItem(it)]?.prioridade ?? 99;
      case 'valor':
      default: return valorItem(it);
    }
  };
  return [...(items || [])].sort((a, b) => {
    const va = val(a), vb = val(b);
    if (va < vb) return -1 * mult;
    if (va > vb) return 1 * mult;
    return 0;
  });
}
