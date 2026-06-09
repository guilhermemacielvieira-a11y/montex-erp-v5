// ============================================================
// DESIGN SYSTEM MOBILE — Scanner (QR / código de barras)
// ============================================================
// Lê o código da etiqueta da peça no canteiro. Estratégia em cascata,
// degradando sem quebrar (mesma filosofia do haptics.js):
//   1) Plugin nativo Capacitor (window.Capacitor.Plugins.BarcodeScanner) — iOS/Android
//   2) Web BarcodeDetector + getUserMedia — navegadores compatíveis
//   3) Entrada manual (sempre disponível) — fallback universal
// Chama onResult(codigo) ao detectar/confirmar.
//
// continuous=true: a câmera fica aberta e cada leitura confere um item
// (háptico + contador + debounce de duplicatas), até "Concluir". Ideal
// para conferência de carga (bipar vários itens em sequência).
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ScanLine, Keyboard, CameraOff, CheckCircle2 } from 'lucide-react';
import { tap } from './haptics';

function nativeScanner() {
  try {
    const cap = typeof window !== 'undefined' ? window.Capacitor : null;
    if (cap?.isNativePlatform?.() && cap?.Plugins?.BarcodeScanner) return cap.Plugins.BarcodeScanner;
  } catch { /* noop */ }
  return null;
}

export default function Scanner({ open, onClose, onResult, title = 'Escanear peça', continuous = false, progress = '' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const lastScanRef = useRef({ code: '', ts: 0 });
  const onResultRef = useRef(onResult);
  useEffect(() => { onResultRef.current = onResult; }); // sempre o onResult mais recente (estado fresco)

  const [manual, setManual] = useState('');
  const [camState, setCamState] = useState('idle'); // idle | starting | live | unsupported | denied
  const [hint, setHint] = useState('');
  const [lidos, setLidos] = useState(0);
  const [ultimo, setUltimo] = useState('');

  // Processa uma leitura (câmera ou manual). No contínuo: debounce do mesmo
  // código por 1.5s, conta e mantém aberto; no normal: lê uma vez e fecha.
  const processar = (code, fromCamera) => {
    const v = String(code || '').trim();
    if (!v) return;
    if (continuous) {
      const now = Date.now();
      const last = lastScanRef.current;
      if (fromCamera && last.code === v && now - last.ts < 1500) return; // duplicata recente
      lastScanRef.current = { code: v, ts: now };
      tap('heavy');
      setLidos(n => n + 1);
      setUltimo(v);
      onResultRef.current?.(v);
    } else {
      tap('heavy');
      onResultRef.current?.(v);
      onClose?.();
    }
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLidos(0); setUltimo(''); lastScanRef.current = { code: '', ts: 0 };

    (async () => {
      // 1) Plugin nativo de leitura única (assume a UI nativa). No modo
      //    CONTÍNUO não usamos o scan() single-shot — ele retorna 1 código e
      //    fecha; preferimos a câmera com loop (web/WKWebView) para bipar
      //    várias peças sem reabrir a cada leitura.
      const ns = nativeScanner();
      if (ns?.scan && !continuous) {
        try {
          const res = await ns.scan();
          const code = res?.barcodes?.[0]?.rawValue || res?.ScanResult || res?.content;
          if (code && !cancelled) processar(code, true); // processar() fecha no one-shot
          return; // single-shot: encerra após a tentativa nativa
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
              if (code) {
                processar(code, true);
                if (!continuous) return; // one-shot fecha em processar()
              }
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
    processar(v, false); // manual não sofre debounce
    setManual('');
    // no contínuo, mantém aberto para a próxima
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
            <h2 className="flex-1 font-bold text-base truncate">{title}</h2>
            {continuous && (progress || lidos > 0) && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-2 py-0.5 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5" /> {progress || lidos}
              </span>
            )}
            <button onClick={onClose} className="w-11 h-11 -mr-2 flex items-center justify-center rounded-lg hover:bg-slate-800 active:bg-slate-700" aria-label="Fechar scanner">
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
                <CameraOff className="w-10 h-10 mx-auto mb-3 text-slate-500" />
                <div className="text-sm text-slate-400">
                  {camState === 'starting' ? 'Abrindo câmera…' : (hint || 'Câmera indisponível — use a entrada manual abaixo')}
                </div>
              </div>
            )}
            {/* Feedback da última leitura (contínuo) */}
            {continuous && ultimo && (
              <div className="absolute bottom-3 left-3 right-3 z-20 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-sm font-semibold rounded-xl px-3 py-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Lido: {ultimo}
              </div>
            )}
          </div>

          {/* Entrada manual (sempre disponível) */}
          <div className="px-4 pt-3 space-y-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
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
              >{continuous ? 'Bipar' : 'Buscar'}</button>
            </div>
            {continuous && (
              <button
                onClick={onClose}
                className="w-full mt-1 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-slate-100 active:scale-[.99] transition"
              >Concluir{lidos > 0 ? ` (${lidos} bipado${lidos !== 1 ? 's' : ''})` : ''}</button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
