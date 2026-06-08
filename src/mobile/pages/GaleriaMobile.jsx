// ============================================================
// GALERIA DE EVIDÊNCIAS - fotos de montagem e de carga, por obra
// ============================================================
// Reúne as evidências fotográficas registradas no campo:
//  - Montagem: fotoUrl gravado no entity_store (concluidas[id].fotoUrl)
//  - Carga: URLs anexadas às observações dos romaneios (📷 <url>)
// Respeita o filtro global por obra. Tocar abre a imagem ampliada.
// ============================================================
import React, { useMemo, useState } from 'react';
import { ImageOff, Hammer, Truck } from 'lucide-react';
import MobileLayout from '../MobileLayout';
import Sheet from '../ui/Sheet';
import { useERP } from '@/contexts/ERPContext';
import { useObraFiltro } from '../ObraContext';
import { loadConcluidasSmart } from '@/utils/montagemSync';

const URL_RE = /https?:\/\/\S+/g;
const fmtData = (ts) => { try { return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); } catch { return ''; } };

export default function GaleriaMobile() {
  const { pecas = [], expedicoes = [] } = useERP?.() || {};
  const { matchObra } = useObraFiltro();
  const [concluidas, setConcluidas] = useState(() => loadConcluidasSmart(r => setConcluidas(r || {})) || {});
  const [ampliada, setAmpliada] = useState(null);

  const pecasById = useMemo(() => { const m = new Map(); for (const p of pecas) m.set(String(p.id), p); return m; }, [pecas]);

  const evidencias = useMemo(() => {
    const list = [];
    // Montagem (entity_store)
    for (const [id, v] of Object.entries(concluidas || {})) {
      if (!v || !v.fotoUrl) continue;
      const peca = pecasById.get(String(id));
      if (peca && !matchObra(peca)) continue; // fora da obra filtrada
      list.push({ tipo: 'montagem', url: v.fotoUrl, titulo: v.marca || peca?.marca || id, ts: v.montadoEm || v.atualizadoEm || 0 });
    }
    // Carga (observações dos romaneios)
    for (const e of expedicoes.filter(matchObra)) {
      const urls = String(e.observacoes || '').match(URL_RE) || [];
      for (const url of urls) list.push({ tipo: 'carga', url, titulo: `Romaneio ${e.numeroRomaneio || e.id}`, sub: e.destino || '', ts: e.dataExpedicao || 0 });
    }
    return list.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  }, [concluidas, expedicoes, pecasById, matchObra]);

  return (
    <MobileLayout title="Evidências" back obraFilter>
      {evidencias.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <ImageOff className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <div className="text-sm font-semibold text-slate-300">Sem evidências</div>
          <div className="text-xs text-slate-400 mt-1">Fotos de montagem e carga aparecem aqui</div>
        </div>
      ) : (
        <div className="px-4 pt-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">{evidencias.length} foto(s)</div>
          <div className="grid grid-cols-3 gap-2">
            {evidencias.map((ev, i) => {
              const Icon = ev.tipo === 'montagem' ? Hammer : Truck;
              return (
                <button key={i} onClick={() => setAmpliada(ev)} className="relative aspect-square rounded-xl overflow-hidden border border-slate-800 active:scale-95 transition">
                  <img src={ev.url} alt={ev.titulo} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div className="absolute top-1 left-1 w-6 h-6 rounded-lg bg-black/60 flex items-center justify-center">
                    <Icon className={`w-3.5 h-3.5 ${ev.tipo === 'montagem' ? 'text-emerald-400' : 'text-blue-400'}`} />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-1">
                    <div className="text-[10px] font-bold text-white truncate">{ev.titulo}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Visualização ampliada */}
      <Sheet open={!!ampliada} onClose={() => setAmpliada(null)} title={ampliada?.titulo || 'Evidência'}>
        {ampliada && (
          <div className="space-y-3">
            <img src={ampliada.url} alt={ampliada.titulo} className="w-full rounded-xl border border-slate-700" />
            <div className="text-[12px] text-slate-400 flex items-center justify-between">
              <span>{ampliada.tipo === 'montagem' ? 'Montagem' : 'Carga'}{ampliada.sub ? ` · ${ampliada.sub}` : ''}</span>
              <span>{fmtData(ampliada.ts)}</span>
            </div>
          </div>
        )}
      </Sheet>
    </MobileLayout>
  );
}
