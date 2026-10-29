// ============================================================
// DESIGN SYSTEM MOBILE — SearchBar
// ============================================================
// Campo de busca padrão: ícone de lupa + input + botão "limpar" (×)
// quando há texto. Inclui aria-label. Usado nas listas operacionais.
// ============================================================
import React from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Buscar…', ...rest }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mx-text2 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-mx-s1 border border-mx-line rounded-xl pl-10 pr-11 py-2.5 text-sm placeholder:text-mx-text2 focus:outline-none focus:border-mx-teal/50"
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-mx-text2 active:bg-mx-s2 transition"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
