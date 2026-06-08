// ============================================================
// DESIGN SYSTEM MOBILE — Scanner (QR / código de barras)
// ============================================================
// Lê o código da etiqueta da peça no canteiro. Estratégia em cascata,
// degradando sem quebrar (mesma filosofia do haptics.js):
//   1) Nativo CONTÍNUO (mlkit: startScan + listener barcodeScanned) —
//      câmera nativa atrás da webview transparente; bipa em fluxo.
//   2) Nativo single-shot (plugin.scan()) — modal nativo, 1 leitura.
//   3) Web BarcodeDetector + getUserMedia — navegadores compatíveis.
//   4) Entrada manual (sempre disponível) — fallback universal.
// Chama onResult(codigo) ao detectar/confirmar.
//
// MODO `continuous`: o scanner PERMANECE ABERTO e dispara onResult a cada
// peça bipada (com dedupe por cooldown). O usuário fecha manualmente.
//
// NATIVO (iOS): requer @capacitor-mlkit/barcode-scanning + permissão de
// câmera no Info.plist. A câmera renderiza ATRÁS da webview, por isso
// ativamos a classe `montex-scanner-native` (CSS em MobileApp) que torna
// o shell transparente enquanto escaneia. Ver MOBILE-IOS-SETUP.md.
// ============================================================
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

const DEDUPE_MS = 1200; // ignora o MESMO código relido dentro desta janela

export default function Scanner({ open, onClose, onResult, title = 'Escanear peça', continuous = false, progress = '' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const nativeSubRef = useRef(null); // handle do listener mlkit (continuous nativo)
  const lastFired = useRef({ code: '', t: 0 }); // dedupe no modo contínuo
  const [manual, setManual] = useState('');
  const [camState, setCamState] = useState('idle'); // idle | starting | live | native | unsupported | denied
  const [hint, setHint] = useState('');
  const [lastCode, setLastCode] = useState(''); // feedback visual da última leitura
  const [count, setCount] = useState(0);        // leituras disparadas nesta sessão

  // Emite um código (com dedupe no contínuo). Retorna true se disparou.
  const emit = (code) => {
    const c = String(code || '').trim();
    if (!c) return false;
    if (continuous) {
      const now = Date.now();
      if (c === lastFired.current.code && now - lastFired.current.t < DEDUPE_MS) return false;
      lastFired.current = { code: c, t: now };
      setLastCode(c);
      setCount(n => n + 1);
    }
    onResult?.(c);
    return true;
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    lastFired.current = { code: '', t: 0 };
    setLastCode(''); setCount(0);

    (async () => {
      const ns = nativeScanner();

      // 1) Nativo CONTÍNUO (mlkit): câmera atrás da webview + listener.
      if (continuous && ns?.startScan && ns?.addListener) {
        try {
          if (ns.requestPermissions) { try { await ns.requestPermissions(); } catch { /* segue */ } }
          document.documentElement.classList.add('montex-scanner-native');
          nativeSubRef.current = await ns.addListener('barcodeScanned', (ev) => {
            const code = ev?.barcode?.rawValue || ev?.barcode?.displayValue || ev?.rawValue;
            if (code && emit(code)) tap('heavy');
          });
          await ns.startScan();
          if (!cancelled) setCamState('native');
          return; // cleanup no return do efeito
        } catch {
          document.documentElement.classList.remove('montex-scanner-native');
          /* cai para web/manual */
        }
      }

      // 2) Nativo single-shot (assume UI nativa). Não no modo contínuo.
      if (ns?.scan && !continuous) {
        try {
          const res = await ns.scan();
          const code = res?.barcodes?.[0]?.rawValue || res?.ScanResult || res?.content;
          if (code && !cancelled) { emit(code); onClose?.(); }
          return;
        } catch { /* cai para web/manual */ }
      }

      // 3) Web BarcodeDetector + câmera
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
                const fired = emit(code);
                if (fired) await tap('heavy');
                if (fired && !continuous) { onClose?.(); return; }
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
      // Encerra o scan nativo contínuo (mlkit) e restaura o shell.
      if (nativeSubRef.current) { try { nativeSubRef.current.remove?.(); } catch { /* noop */ } nativeSubRef.current = null; }
      const ns = nativeScanner();
      if (ns?.stopScan) { try { ns.stopScan(); } catch { /* noop */ } }
      document.documentElement.classList.remove('montex-scanner-native');
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmarManual = () => {
    const v = manual.trim();
    if (!v) return;
    emit(v);
    setManual('');
    if (!continuous) onClose?.();
  };

  const isNative = camState === 'native';
  // Portal para o body: no modo nativo escondemos o #root (shell) para a
  // câmera do OS aparecer; o scanner precisa ficar FORA do #root.
  const target = typeof document !== 'undefined' ? document.body : null;

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="scan-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[70] flex flex-col ${isNative ? 'bg-transparent' : 'bg-slate-950'}`}
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/70 backdrop-blur-md">
            <ScanLine className="w-5 h-5 text-amber-400" />
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-base truncate">{title}</h2>
              {continuous && (progress || count > 0) && (
                <div className="text-[11px] text-amber-400 font-semibold">{progress || `${count} leitura(s)`}</div>
              )}
            </div>
            <button onClick={onClose} className="min-w-11 h-11 px-3 -mr-2 flex items-center justify-center gap-1.5 rounded-lg hover:bg-slate-800 active:bg-slate-700 font-bold text-sm" aria-label="Fechar scanner">
              {continuous ? 'Concluir' : <X className="w-5 h-5" />}
            </button>
          </div>

          {/* Área da câmera (web mostra <video>; nativo mostra só a mira sobre a câmera do OS) */}
          <div className={`flex-1 relative flex items-center justify-center overflow-hidden ${isNative ? '' : 'bg-black'}`}>
            {!isNative && <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />}
            {(camState === 'live' || isNative) && (
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
            {/* Feedback da última leitura (modo contínuo) */}
            {continuous && lastCode && (
              <motion.div
                key={lastCode + count}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-slate-950 font-bold text-sm shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" /> {lastCode}
              </motion.div>
            )}
          </div>

          {/* Entrada manual (sempre disponível) */}
          <div className="px-4 pt-3 space-y-2 border-t border-slate-800 bg-slate-950/70 backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <Keyboard className="w-3.5 h-3.5" /> {continuous ? 'Ou digite a marca (segue aberto)' : 'Ou digite a marca da peça'}
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return target ? createPortal(overlay, target) : overlay;
}
