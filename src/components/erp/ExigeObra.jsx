// Aviso padrão para páginas que só funcionam com UMA obra (GFO, 3D, Kanban
// Corte, Import Romaneio) quando o filtro único do topo está em "Geral" ou
// num grupo. A escolha é feita no seletor do topo — a página não tem filtro
// de obra próprio (evita divergência entre módulos).
import React from 'react';
import { Building2 } from 'lucide-react';
import { useObras } from '../../contexts/ERPContext';
import { rotuloEscopo } from '../../lib/escopoObra';

export default function ExigeObra({ titulo = 'Selecione uma obra', children }) {
  const { obras, escopoObra } = useObras();
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40">
      <Building2 className="w-10 h-10 text-orange-400 mb-3" />
      <h2 className="text-lg font-semibold text-white">{titulo}</h2>
      <p className="text-sm text-slate-400 mt-1 max-w-md">
        Esta tela mostra uma obra por vez. O filtro do topo está em
        <span className="text-slate-200"> {rotuloEscopo(escopoObra, obras)}</span>.
        Escolha uma obra no seletor do topo para continuar.
      </p>
      {children}
    </div>
  );
}
