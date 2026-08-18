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

// Itens SEM ponto de reposição definido (minimo <= 0) — candidatos a
// configurar para entrarem no radar. Ordenados por descrição/código.
export function itensSemPonto(estoque = []) {
  return (estoque || [])
    .filter((e) => num(e.minimo) <= 0)
    .sort((a, b) => String(a.descricao || a.codigo || '').localeCompare(String(b.descricao || b.codigo || ''), 'pt-BR'));
}

// Valida um par mínimo/máximo antes de salvar.
// Regras: ambos ≥ 0; máximo pode ser 0 (sem teto) ou ≥ mínimo.
export function validarPontos({ minimo, maximo } = {}) {
  const mn = num(minimo), mx = num(maximo);
  if (mn < 0 || mx < 0) return { ok: false, erro: 'Valores não podem ser negativos' };
  if (mx > 0 && mx < mn) return { ok: false, erro: 'Máximo deve ser ≥ mínimo' };
  return { ok: true, minimo: r2(mn), maximo: r2(mx) };
}

// Sugestão simples de pontos a partir do saldo atual: mínimo ≈ 30% do saldo,
// máximo ≈ 120% (arredondados). Ponto de partida editável — evita o usuário
// começar do zero em cada um dos itens sem configuração.
export function sugerirPontos(saldo) {
  const s = num(saldo);
  if (s <= 0) return { minimo: 0, maximo: 0 };
  const arred = (n) => (n >= 100 ? Math.round(n / 10) * 10 : Math.max(1, Math.round(n)));
  return { minimo: arred(s * 0.3), maximo: arred(s * 1.2) };
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
