// ============================================================
// Reposição de estoque (ponto de compra proativo) — Compras
// ============================================================
// Lado PROATIVO das compras: a partir do estoque atual, aponta os itens no/abaixo
// do PONTO DE REPOSIÇÃO (estoque mínimo) e sugere a quantidade a comprar para
// repor até o nível-alvo (máximo, ou o mínimo quando não há máximo). Estima o
// custo pelo preço do próprio item. Complementa o Abastecimento (que é por BOM
// da obra) — aqui o gatilho é o saldo de fábrica.
//
// Puro/testável (sem I/O). Usado por ReposicaoEstoque.jsx.
// ============================================================

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(n * 100) / 100;

export const SEVERIDADE = {
  critico: { peso: 0, label: 'Crítico', hint: 'saldo zerado', cor: 'bg-red-100 text-red-800' },
  baixo: { peso: 1, label: 'Abaixo do mínimo', hint: 'no/abaixo do ponto de compra', cor: 'bg-amber-100 text-amber-800' },
  atencao: { peso: 2, label: 'Atenção', hint: 'aproximando do mínimo', cor: 'bg-yellow-100 text-yellow-800' },
};

// Classifica a severidade de um item pelo saldo × mínimo.
export function severidadeItem(saldo, minimo, fatorAtencao = 1.2) {
  if (saldo <= 0) return 'critico';
  if (saldo <= minimo) return 'baixo';
  if (saldo <= minimo * fatorAtencao) return 'atencao';
  return null; // acima da faixa de atenção → não precisa repor
}

// Calcula a lista de reposição a partir do estoque.
// - Considera só itens com `minimo > 0` (ponto de reposição definido).
// - Inclui itens no/abaixo do mínimo e, opcionalmente, na faixa de atenção.
// - Nível-alvo: `maximo` quando > 0, senão o próprio `minimo`.
// - Sugestão de compra = alvo − saldo (nunca negativa).
export function calcularReposicao(estoque = [], { fatorAtencao = 1.2, incluirAtencao = true } = {}) {
  const linhas = [];
  (estoque || []).forEach((e) => {
    const minimo = num(e.minimo);
    if (minimo <= 0) return; // sem ponto de reposição definido
    const saldo = num(e.quantidade);
    const sev = severidadeItem(saldo, minimo, fatorAtencao);
    if (!sev) return;
    if (sev === 'atencao' && !incluirAtencao) return;

    const maximo = num(e.maximo);
    const alvo = maximo > 0 ? maximo : minimo;
    const sugestao = Math.max(0, r2(alvo - saldo));
    if (sugestao <= 0) return; // saldo já cobre o alvo

    const preco = num(e.preco);
    const unidade = e.unidade || 'UN';
    linhas.push({
      id: e.id,
      codigo: e.codigo || '',
      descricao: e.descricao || e.nome || e.codigo || '',
      perfil: e.perfil || '',
      material: e.material || '',
      unidade,
      saldo: r2(saldo),
      minimo: r2(minimo),
      maximo: r2(maximo),
      alvo: r2(alvo),
      sugestao,
      preco: r2(preco),
      custoEstimado: r2(sugestao * preco),
      fornecedor: e.fornecedor || '',
      severidade: sev,
      temPreco: preco > 0,
    });
  });

  linhas.sort((a, b) =>
    SEVERIDADE[a.severidade].peso - SEVERIDADE[b.severidade].peso ||
    b.custoEstimado - a.custoEstimado ||
    b.sugestao - a.sugestao
  );

  return {
    linhas,
    itens: linhas.length,
    criticos: linhas.filter((l) => l.severidade === 'critico').length,
    totalCusto: r2(linhas.reduce((s, l) => s + l.custoEstimado, 0)),
    semPreco: linhas.filter((l) => !l.temPreco).length,
  };
}

// Mapeia uma linha de reposição para item de compra (mesma forma dos itens de
// pedido gerados pelo Abastecimento — perfil/material/precoUnitario/valorTotal).
export function linhaParaItemCompra(l) {
  return {
    descricao: l.descricao || [l.perfil, l.material].filter(Boolean).join(' — ') || l.codigo,
    perfil: l.perfil || '',
    material: l.material || '',
    item_id: l.id,
    quantidade: l.sugestao,
    unidade: l.unidade || 'UN',
    precoUnitario: l.preco,
    valorTotal: l.custoEstimado,
    fornecedorSugerido: l.fornecedor || '',
    fontePreco: 'estoque (reposição)',
  };
}
