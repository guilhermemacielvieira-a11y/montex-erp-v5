// ============================================================
// DESIGN SYSTEM MOBILE — Sheet (bottom sheet)
// ============================================================
// Bottom sheet padrão do app operacional. Animação de subida,
// overlay com blur, fecha por toque fora / botão / swipe-down.
// Usa o mesmo padrão de AnimatePresence keyed do MobileLayout/ObraSelector.
// ============================================================
import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Sheet({ open, onClose, title, children, footer }) {
  // PORTAL para o body: o Sheet é renderizado dentro do conteúdo de página da
  // MobileLayout, que vive em um motion.div com `transform` (animação de rota).
  // Um ancestral com transform vira o CONTAINING BLOCK de filhos `position:fixed`
  // — então `bottom-0` deixava de ser a base da viewport e passava a ser a base
  // do conteúdo (rolável, alto), empurrando o FOOTER (botão "Marcar como
  // montada") para fora da área visível. O portal tira o Sheet dessa árvore e
  // o ancora na viewport real. Sem isto, nenhum ajuste de `vh/dvh` resolve.
  const node = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="sheet-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[75]"
          onClick={onClose}
        />
      )}
      {open && (
        <motion.div
          key="sheet-panel"
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'tween', duration: 0.26, ease: 'easeOut' }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.4 }}
          onDragEnd={(_, info) => { if (info.offset.y > 120) onClose?.(); }}
          // max-h-[85vh] = fallback CSS real (className) p/ browsers sem `dvh`;
          // a inline `maxHeight` em dvh sobrepõe onde houver suporte. dvh =
          // viewport dinâmica real do iOS Safari (desconta a barra do navegador).
          className="fixed left-0 right-0 bottom-0 z-[76] bg-slate-900 border-t border-slate-700 rounded-t-3xl flex flex-col max-h-[85vh]"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
            maxHeight: 'min(85dvh, calc(100dvh - 56px))',
          }}
        >
          {/* handle */}
          <div className="flex-shrink-0 pt-2 pb-1 flex justify-center">
            <div className="w-10 h-1.5 rounded-full bg-slate-700" />
          </div>
          {title && (
            <div className="flex-shrink-0 flex items-center gap-3 px-5 pb-3 pt-1 border-b border-slate-800">
              <h2 className="flex-1 font-bold text-base truncate">{title}</h2>
              <button onClick={onClose} className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg hover:bg-slate-800 active:bg-slate-700" aria-label="Fechar">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-5 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {children}
          </div>
          {footer && (
            <div className="flex-shrink-0 px-5 pt-3 border-t border-slate-800">{footer}</div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
