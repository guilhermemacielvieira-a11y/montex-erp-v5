// ============================================================
// ReposicaoBadge — contador de itens a repor no menu lateral
// ============================================================
// Badge dinâmico que mostra, fora da aba de Compras, quantos itens de estoque
// estão no/abaixo do ponto de reposição. Auto-suficiente: lê o estoque do
// contexto e renderiza só no item de menu alvo (Compras) quando há itens.
// ============================================================
import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useEstoque } from '@/contexts/ERPContext';
import { calcularReposicao } from '@/services/reposicao';

export default function ReposicaoBadge({ href, alvo = 'ComprasPage', isActive = false, className }) {
  const { estoque } = useEstoque();
  const { itens, criticos } = useMemo(
    () => (href === alvo ? calcularReposicao(estoque || []) : { itens: 0, criticos: 0 }),
    [href, alvo, estoque]
  );
  if (href !== alvo || !itens) return null;
  return (
    <span
      title={`${itens} item(ns) para repor${criticos ? ` · ${criticos} crítico(s)` : ''}`}
      className={cn(
        'px-1.5 py-0.5 text-[9px] font-bold rounded-md tabular-nums',
        isActive ? 'bg-white/20 text-white' : (criticos ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'),
        className
      )}
    >
      {itens}
    </span>
  );
}
