// ============================================================
// DESIGN SYSTEM MOBILE — PhotoInput (foto de evidência)
// ============================================================
// Botão "Tirar foto / anexar" (abre a câmera no iOS via capture) com
// preview e remover. Estado controlado: foto = { file, url } | null.
// O upload em si é feito pela tela ao confirmar (ui/upload.js).
// ============================================================
import React from 'react';
import { Camera, X } from 'lucide-react';

export default function PhotoInput({ foto, onChange, label = 'Evidência fotográfica (opcional)' }) {
  const escolher = (e) => {
    const file = e.target.files?.[0];
    if (file) onChange?.({ file, url: URL.createObjectURL(file) });
  };
  return (
    <div>
      {label && <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">{label}</div>}
      {foto ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-700">
          <img src={foto.url} alt="evidência" className="w-full h-40 object-cover" />
          <button
            onClick={() => onChange?.(null)}
            aria-label="Remover foto"
            className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center rounded-lg bg-black/60 active:bg-black/80"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 border border-dashed border-slate-600 text-sm text-slate-300 active:bg-slate-700 cursor-pointer">
          <Camera className="w-5 h-5 text-amber-400" /> Tirar foto / anexar
          <input type="file" accept="image/*" capture="environment" onChange={escolher} className="hidden" />
        </label>
      )}
    </div>
  );
}
