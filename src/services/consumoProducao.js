// ============================================================
// Consumo automático de estoque na produção (baixa por corte)
// ============================================================
// Ao FINALIZAR um corte (materiais_corte.status_corte = 'finalizado'), o aço é
// consumido: dá baixa no item de estoque casado pelo PERFIL, no peso teórico do
// corte. A coluna `materiais_corte.baixa_estoque_kg` registra o kg baixado e
// serve de IDEMPOTÊNCIA (não baixa duas vezes) e base do ESTORNO ao resetar o
// corte. Lógica pura/testável; a orquestração de I/O fica no useCorteSupabase.
// ============================================================
import { matchEstoqueItem } from './abastecimento';

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(n * 100) / 100;

// Kg a consumir de um corte = peso teórico total da linha.
export function kgBaixaCorte(corte) {
  return Math.max(0, r2(num(corte?.peso_teorico ?? corte?.peso)));
}

// Planeja a BAIXA de estoque de um corte finalizado.
// Retorna null quando não há o que baixar: já baixado (idempotência), sem peso,
// sem perfil, ou sem item de estoque casado.
export function planejarBaixaCorte(corte, estoque = []) {
  if (num(corte?.baixa_estoque_kg) > 0) return null; // já baixado
  const kg = kgBaixaCorte(corte);
  const perfil = String(corte?.perfil || '').trim();
  if (kg <= 0 || !perfil) return null;
  const item = matchEstoqueItem(estoque, perfil);
  if (!item) return null;
  const saldoAnterior = num(item.quantidade);
  const saldoNovo = r2(Math.max(0, saldoAnterior - kg));
  return {
    itemId: item.id,
    perfil,
    material: corte?.material || item.material || '',
    kg,
    preco: num(item.preco),
    saldoAnterior: r2(saldoAnterior),
    saldoNovo,
  };
}

// Planeja o ESTORNO (reset do corte): devolve o kg baixado ao item de estoque.
// Retorna null se não houve baixa. `itemId` pode ser null se o item não for mais
// encontrado — nesse caso só se zera a baixa no corte (tratado pelo hook).
export function planejarEstornoCorte(corte, estoque = []) {
  const kg = num(corte?.baixa_estoque_kg);
  if (kg <= 0) return null;
  const perfil = String(corte?.perfil || '').trim();
  const item = perfil ? matchEstoqueItem(estoque, perfil) : null;
  const saldoAnterior = item ? num(item.quantidade) : null;
  const saldoNovo = item ? r2(saldoAnterior + kg) : null;
  return {
    itemId: item?.id || null,
    perfil,
    material: corte?.material || item?.material || '',
    kg: r2(kg),
    saldoAnterior: saldoAnterior == null ? null : r2(saldoAnterior),
    saldoNovo,
  };
}
