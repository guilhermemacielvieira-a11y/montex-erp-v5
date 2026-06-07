// ============================================================
// DESIGN SYSTEM MOBILE — LoadMore (paginação incremental)
// ============================================================
// Renderiza menos itens por vez em listas longas (estoque, peças) para
// reduzir o DOM inicial e suavizar o scroll no celular. Mostra um botão
// "Carregar mais" enquanto houver itens além do limite atual.
// ============================================================
import React from 'react';
import { ChevronDown } from 'lucide-react';

export default function LoadMore({ total, shown, onMore }) {
  if (total <= shown) return null;
  const restante = total - shown;
  return (
    <button
      onClick={onMore}
      className="w-full mt-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-300 active:scale-[.99] transition"
    >
      <ChevronDown className="w-4 h-4" /> Carregar mais ({restante.toLocaleString('pt-BR')} restante{restante !== 1 ? 's' : ''})
    </button>
  );
}
