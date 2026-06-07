// ============================================================
// DESIGN SYSTEM MOBILE — useDebounced
// ============================================================
// Atrasa a propagação de um valor (ex.: termo de busca). O input
// continua respondendo na hora, mas o filtro pesado só roda após a
// pausa de digitação — evita refiltrar centenas de peças/itens a cada
// tecla (poupa jank/bateria em celulares mais simples).
// ============================================================
import { useState, useEffect } from 'react';

export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
