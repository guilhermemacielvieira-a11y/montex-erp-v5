// ============================================================
// DESIGN SYSTEM MOBILE — Sheet (bottom sheet)
// ============================================================
// Bottom sheet padrão do app operacional. Animação de subida,
// overlay com blur, fecha por toque fora / botão / swipe-down.
// Usa o mesmo padrão de AnimatePresence keyed do MobileLayout/ObraSelector.
// ============================================================
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Sheet({ open, onClose, title, children, footer }) {
  return (
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
          className="fixed left-0 right-0 bottom-0 z-[76] bg-slate-900 border-t border-slate-700 rounded-t-3xl flex flex-col max-h-[85vh]"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
            // FIX iOS Safari: `vh` ignora a barra do navegador e cortava o
            // footer (botão "Marcar como montada" invisível no celular).
            // dvh = viewport dinâmica real; browsers antigos ignoram e usam
            // o max-h-[85vh] do className como fallback.
            maxHeight: 'calc(100dvh - 56px)',
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
}
