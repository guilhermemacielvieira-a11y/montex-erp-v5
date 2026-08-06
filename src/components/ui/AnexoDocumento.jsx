// ============================================================
// AnexoDocumento — anexar foto (câmera/álbum) ou PDF (reutilizável)
// ============================================================
// Componente único de anexo usado em vários módulos (estoque, movimentações,
// etc.). Três entradas: Câmera (capture), Álbum (galeria) e PDF. Faz upload
// para o Storage (bucket `uploads`) e devolve a URL pública via onChange.
// Mostra preview (imagem) ou link (PDF) com botão de remover.
//
// Props:
//   valor     — URL atual do anexo (string) | ''
//   onChange  — (url) => void  (recebe '' ao remover)
//   pasta     — subpasta no bucket (default 'anexos')
//   label     — rótulo (ou null para ocultar)
//   disabled  — somente leitura
// ============================================================
import React, { useId, useState } from 'react';
import { Camera, Images, FileText, X, Loader2, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/api/supabaseClient';

const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ehImagemUrl = (u) => !!u && /\.(jpg|jpeg|png|webp|gif|heic|heif)(\?|$)/i.test(u);

export default function AnexoDocumento({ valor, onChange, pasta = 'anexos', label = 'Anexo (foto/PDF)', disabled }) {
  const [subindo, setSubindo] = useState(false);

  const enviar = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    setSubindo(true);
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const path = `${pasta}/${hojeLocal()}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      onChange?.(data?.publicUrl || '');
      toast.success('Anexo enviado');
    } catch (err) {
      toast.error('Falha ao enviar anexo: ' + (err.message || err));
    } finally {
      setSubindo(false);
    }
  };

  return (
    <div>
      {label && (
        <div className="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" /> {label}
        </div>
      )}
      {valor ? (
        <div className="relative rounded-xl border border-slate-700 overflow-hidden bg-slate-800/60">
          {ehImagemUrl(valor) ? (
            <img src={valor} alt="anexo" className="w-full h-40 object-cover" />
          ) : (
            <a href={valor} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-5 text-sm text-emerald-400 hover:underline">
              <FileText className="w-5 h-5" /> Ver documento anexado
            </a>
          )}
          {!disabled && (
            <button type="button" onClick={() => onChange?.('')} aria-label="Remover anexo"
              className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black/80">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <BotaoAnexo icon={Camera} label="Câmera" accept="image/*" capture="environment" onFile={enviar} loading={subindo} disabled={disabled} />
          <BotaoAnexo icon={Images} label="Álbum" accept="image/*" onFile={enviar} loading={subindo} disabled={disabled} />
          <BotaoAnexo icon={FileText} label="PDF" accept="application/pdf,.pdf" onFile={enviar} loading={subindo} disabled={disabled} />
        </div>
      )}
    </div>
  );
}

function BotaoAnexo({ icon: Icon, label, accept, capture, onFile, loading, disabled }) {
  const id = 'anexo-' + label + useId();
  return (
    <label htmlFor={id}
      className={`cursor-pointer flex flex-col items-center gap-1 py-3 rounded-xl border border-dashed border-slate-600 text-slate-300 text-xs hover:bg-slate-800 transition ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-amber-400" /> : <Icon className="w-5 h-5 text-amber-400" />}
      {label}
      <input id={id} type="file" accept={accept} capture={capture} onChange={onFile} className="hidden" disabled={disabled} />
    </label>
  );
}
