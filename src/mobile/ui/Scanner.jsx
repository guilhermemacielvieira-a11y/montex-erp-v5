// ============================================================
// DESIGN SYSTEM MOBILE — Scanner (QR / código de barras)
// ============================================================
// Lê o código da etiqueta da peça no canteiro. Estratégia em cascata,
// degradando sem quebrar (mesma filosofia do haptics.js):
//   1) Plugin nativo Capacitor (window.Capacitor.Plugins.BarcodeScanner) — iOS/Android
//   2) Web BarcodeDetector + getUserMedia — navegadores compatíveis
//   3) Entrada manual (sempre disponível) — fallback universal
// Chama onResult(codigo) ao detectar/confirmar.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ScanLine, Keyboard, CameraOff } from 'lucide-react';
import { tap } from './haptics';

function nativeScanner() {
  try {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null;
    if (cap?.isNativePlatform?.() && cap?.Plugins?.BarcodeScanner) return cap.Plugins.BarcodeScanner;
  } catch { /* noop */ }
  return null;
}

export default function Scanner({ open, onClose, onResult, title = 'Escanear peça' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [manual, setManual] = useState('');
  const [camState, setCamState] = useState('idle'); // idle | starting | live | unsupported | denied
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      // 1) Plugin nativo (assume controle da UI nativa)
      const ns = nativeScanner();
      if (ns?.scan) {
        try {
          const res = await ns.scan();
          const code = res?.barcodes?.[0]?.rawValue || res?.ScanResult || res?.content;
          if (code && !cancelled) { onResult?.(String(code)); onClose?.(); }
          return;
        } catch { /* cai para web/manual */ }
      }

      // 2) Web BarcodeDetector + câmera
      const hasDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
      const hasCam = typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia;
      if (!hasDetector || !hasCam) { setCamState('unsupported'); return; }

      try {
        setCamState('starting');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
        setCamState('live');

        // eslint-disable-next-line no-undef
        const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix'] });
        const loop = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length) {
              const code = codes[0].rawValue;
              if (code) { await tap('heavy'); onResult?.(String(code)); onClose?.(); return; }
            }
          } catch { /* frame sem código */ }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        setCamState(err?.name === 'NotAllowedError' ? 'denied' : 'unsupported');
        setHint(err?.name === 'NotAllowedError' ? 'Permissão de câmera negada' : 'Câmera indisponível neste dispositivo');
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmarManual = () => {
    const v = manual.trim();
    if (!v) return;
    onResult?.(v);
    setManual('');
    onClose?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scan-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-slate-950 flex flex-col"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
            <ScanLine className="w-5 h-5 text-amber-400" />
            <h2 className="flex-1 font-bold text-base">{title}</h2>
            <button onClick={onClose} className="p-2 -mr-2 rounded-lg hover:bg-slate-800 active:bg-slate-700" aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Área da câmera */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
            {camState === 'live' && (
              <div className="relative z-10 w-60 h-60 border-2 border-amber-400/80 rounded-2xl">
                <motion.div
                  className="absolute left-0 right-0 h-0.5 bg-amber-400 shadow-[0_0_12px_2px_rgba(251,191,36,0.8)]"
                  initial={{ top: 0 }} animate={{ top: '100%' }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            )}
            {(camState === 'unsupported' || camState === 'denied' || camState === 'idle' || camState === 'starting') && (
              <div className="relative z-10 text-center px-8">
                <CameraOff className="w-10 h-10 mx-auto mb-3 text-slate-600" />
                <div className="text-sm text-slate-400">
                  {camState === 'starting' ? 'Abrindo câmera…' : (hint || 'Câmera indisponível — use a entrada manual abaixo')}
                </div>
              </div>
            )}
          </div>

          {/* Entrada manual (sempre disponível) */}
          <div className="px-4 pt-3 space-y-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
              <Keyboard className="w-3.5 h-3.5" /> Ou digite a marca da peça
            </div>
            <div className="flex gap-2">
              <input
                value={manual}
                onChange={e => setManual(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') confirmarManual(); }}
                placeholder="Ex.: TS59A"
                autoCapitalize="characters"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-amber-500/50"
              />
              <button
                onClick={confirmarManual}
                disabled={!manual.trim()}
                className="px-5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm active:scale-95 transition disabled:opacity-50"
              >Buscar</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
