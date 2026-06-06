// ============================================================
// OBRA SELECTOR (MOBILE) — Barra sticky + bottom sheet de seleção
// ============================================================
// Filtro global "por obra" exibido logo abaixo do header nas páginas
// de dados (Início, Produção, Montagem, Financeiro).
//  - Toque na barra abre um bottom sheet com "Todas as obras" + lista.
//  - Cada obra mostra código, nome, status e nº de peças.
// ============================================================
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ChevronDown, Check, X, Layers, Search } from 'lucide-react';
import { useERP } from '@/contexts/ERPContext';
import { useObraFiltro, OBRA_TODAS } from '../ObraContext';

const STATUS_DOT = {
  concluida: 'bg-emerald-500',
  cancelada: 'bg-red-500',
  em_andamento: 'bg-amber-500',
  ativa: 'bg-amber-500',
};

export default function ObraSelector() {
  const { obras, obraFiltro, obraSelecionada, isTodas, setObraFiltro } = useObraFiltro();
  const { pecas = [] } = useERP?.() || {};
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  // Contagem de peças por obra (para enriquecer a lista)
  const contagem = useMemo(() => {
    const m = {};
    for (const p of pecas) {
      const oid = p.obraId ?? p.obra_id;
      if (!oid) continue;
      m[oid] = (m[oid] || 0) + 1;
    }
    return m;
  }, [pecas]);

  const totalPecas = pecas.length;

  const obrasFiltradas = useMemo(() => {
    if (!q.trim()) return obras;
    const qq = q.toUpperCase();
    return obras.filter(o =>
      (o.nome || '').toUpperCase().includes(qq) ||
      (o.codigo || '').toUpperCase().includes(qq)
    );
  }, [obras, q]);

  const rotulo = isTodas ? 'Todas as obras' : (obraSelecionada?.nome || 'Obra');
  const sub = isTodas
    ? `${obras.length} obras · ${totalPecas.toLocaleString('pt-BR')} peças`
    : `${obraSelecionada?.codigo ? obraSelecionada.codigo + ' · ' : ''}${(contagem[obraFiltro] || 0).toLocaleString('pt-BR')} peças`;

  const escolher = (id) => {
    setObraFiltro(id);
    setOpen(false);
    setQ('');
  };

  return (
    <>
      {/* Barra sticky */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 active:bg-slate-800/80 transition"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isTodas ? 'bg-slate-800 text-slate-300' : 'bg-amber-500/20 text-amber-400'}`}>
          {isTodas ? <Layers className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold leading-none mb-0.5">Filtrar por obra</div>
          <div className="text-sm font-bold truncate">{rotulo}</div>
          <div className="text-[10px] text-slate-400 truncate">{sub}</div>
        </div>
        <ChevronDown className="w-5 h-5 text-slate-500 flex-shrink-0" />
      </button>

      {/* Bottom sheet — filhos keyed diretos (sem Fragment, p/ AnimatePresence
          rastrear o exit e desmontar corretamente ao fechar) */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="obra-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/60 z-[60]"
            onClick={() => setOpen(false)}
          />
        )}
        {open && (
          <motion.div
            key="obra-sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.26, ease: 'easeOut' }}
            className="fixed left-0 right-0 bottom-0 z-[61] bg-slate-900 border-t border-slate-800 rounded-t-3xl flex flex-col max-h-[80vh]"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
          >
              {/* Handle + header */}
              <div className="flex-shrink-0 px-4 pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  <div className="font-bold text-base">Selecionar obra</div>
                  <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-800 active:bg-slate-700">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                {obras.length > 6 && (
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      autoFocus={false}
                      value={q} onChange={e => setQ(e.target.value)}
                      placeholder="Buscar obra..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto px-3 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                {/* Opção: Todas */}
                <button
                  onClick={() => escolher(OBRA_TODAS)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl mb-1.5 transition ${isTodas ? 'bg-amber-500/15 border border-amber-500/40' : 'bg-slate-800/40 border border-transparent active:bg-slate-800'}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center flex-shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className={`text-sm font-bold ${isTodas ? 'text-amber-400' : 'text-slate-100'}`}>Todas as obras</div>
                    <div className="text-[11px] text-slate-400">{obras.length} obras · {totalPecas.toLocaleString('pt-BR')} peças</div>
                  </div>
                  {isTodas && <Check className="w-5 h-5 text-amber-400 flex-shrink-0" />}
                </button>

                {obrasFiltradas.map(o => {
                  const sel = o.id === obraFiltro;
                  const dot = STATUS_DOT[o.status] || 'bg-slate-500';
                  return (
                    <button
                      key={o.id}
                      onClick={() => escolher(o.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl mb-1.5 transition ${sel ? 'bg-amber-500/15 border border-amber-500/40' : 'bg-slate-800/40 border border-transparent active:bg-slate-800'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs ${sel ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>
                        {(o.codigo || o.nome || '?').slice(0, 3).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className={`text-sm font-bold truncate ${sel ? 'text-amber-400' : 'text-slate-100'}`}>{o.nome || o.codigo}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                          {o.codigo ? o.codigo + ' · ' : ''}{(contagem[o.id] || 0).toLocaleString('pt-BR')} peças
                        </div>
                      </div>
                      {sel && <Check className="w-5 h-5 text-amber-400 flex-shrink-0" />}
                    </button>
                  );
                })}

                {obrasFiltradas.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">Nenhuma obra encontrada</div>
                )}
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
