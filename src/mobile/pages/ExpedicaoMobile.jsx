// ============================================================
// EXPEDIÇÃO MOBILE - Romaneios + conferência de carga por bipagem
// ============================================================
// Lista de romaneios (expedicoes) da obra → detalhe com as peças →
// CONFERÊNCIA: bipa/escaneia cada peça ao carregar no caminhão →
// quando conferido, CONFIRMA DESPACHO (updateExpedicao status=em_transito,
// que move as peças para 'enviado' = Aguardando Montagem em campo).
// A conferência é local (localStorage por romaneio); o despacho é a escrita real.
// ============================================================
import React, { useMemo, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  Truck, Package, ScanLine, ChevronRight, ChevronLeft, CheckCircle2,
  Circle, MapPin, Loader2, Send,
} from 'lucide-react';
import MobileLayout from '../MobileLayout';
import Scanner from '../ui/Scanner';
import Sheet from '../ui/Sheet';
import { tap, success } from '../ui/haptics';
import { useERP, useExpedicao } from '@/contexts/ERPContext';
import { useObraFiltro } from '../ObraContext';

const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');

const STATUS = {
  preparando: { label: 'Preparando', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  aguardando_transporte: { label: 'Aguardando transporte', cls: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  em_transito: { label: 'Em trânsito', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  entregue: { label: 'Entregue', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
};
const statusInfo = (s) => STATUS[String(s || 'preparando').toLowerCase()] || STATUS.preparando;
const podeDespachar = (s) => ['preparando', 'aguardando_transporte'].includes(String(s || '').toLowerCase());

const confKey = (id) => `montex_exped_conf_${id}`;
const loadConf = (id) => { try { return JSON.parse(localStorage.getItem(confKey(id)) || '{}'); } catch { return {}; } };
const saveConf = (id, obj) => { try { localStorage.setItem(confKey(id), JSON.stringify(obj)); } catch { /* noop */ } };

const idsDoRomaneio = (rom) => {
  const arr = rom?.pecas || rom?.pecasIds || rom?.pecas_ids || [];
  return arr.map(p => (typeof p === 'object' ? (p.id || p) : p)).filter(Boolean).map(String);
};

export default function ExpedicaoMobile() {
  const { pecas = [] } = useERP?.() || {};
  const { expedicoes = [], updateExpedicao } = useExpedicao?.() || {};
  const { matchObra } = useObraFiltro();

  const [selId, setSelId] = useState(null);     // romaneio aberto
  const [scanOpen, setScanOpen] = useState(false);
  const [conf, setConf] = useState({});         // {pecaId: true} do romaneio aberto
  const [despachar, setDespachar] = useState(false); // sheet de confirmação
  const [saving, setSaving] = useState(false);

  const pecasById = useMemo(() => {
    const m = new Map();
    for (const p of pecas) m.set(String(p.id), p);
    return m;
  }, [pecas]);

  const romaneios = useMemo(
    () => expedicoes.filter(matchObra).sort((a, b) => {
      const pa = podeDespachar(a.status) ? 0 : 1, pb = podeDespachar(b.status) ? 0 : 1;
      return pa - pb || String(b.dataExpedicao || '').localeCompare(String(a.dataExpedicao || ''));
    }),
    [expedicoes, matchObra]
  );

  const romaneio = useMemo(() => romaneios.find(r => r.id === selId) || expedicoes.find(r => r.id === selId) || null, [romaneios, expedicoes, selId]);

  const itens = useMemo(() => {
    if (!romaneio) return [];
    return idsDoRomaneio(romaneio).map(id => {
      const p = pecasById.get(id);
      return { id, marca: p?.marca || id, tipo: p?.tipo || '', peso: Number(p?.peso) || 0, quantidade: p?.quantidade || 1 };
    });
  }, [romaneio, pecasById]);

  const conferidas = itens.filter(i => conf[i.id]).length;
  const total = itens.length;
  const pct = total ? Math.round((conferidas / total) * 100) : 0;

  const abrirRomaneio = (r) => { tap('light'); setSelId(r.id); setConf(loadConf(r.id)); };
  const voltar = () => { setSelId(null); setConf({}); };

  const toggleConf = useCallback((itemId) => {
    setConf(prev => {
      const nova = { ...prev };
      if (nova[itemId]) delete nova[itemId]; else { nova[itemId] = true; tap('medium'); }
      if (selId) saveConf(selId, nova);
      return nova;
    });
  }, [selId]);

  const onScan = (codigo) => {
    const alvo = norm(codigo);
    const item = itens.find(i => norm(i.marca) === alvo)
              || (alvo.length >= 3 ? itens.find(i => norm(i.marca).includes(alvo)) : null);
    if (!item) { toast.error(`"${codigo}" não está neste romaneio`); return; }
    if (conf[item.id]) { toast(`${item.marca} já conferida`, { icon: '✓' }); return; }
    toggleConf(item.id);
    success();
    toast.success(`${item.marca} conferida (${conferidas + 1}/${total})`);
  };

  const confirmarDespacho = async () => {
    if (!romaneio || !updateExpedicao) return;
    setSaving(true);
    try {
      await updateExpedicao(romaneio.id, { status: 'em_transito' });
      await success();
      toast.success(`Romaneio ${romaneio.numeroRomaneio || romaneio.id} despachado`);
      setDespachar(false); setSelId(null); setConf({});
    } catch (err) {
      toast.error('Falha ao despachar romaneio');
      console.error('[ExpedicaoMobile] updateExpedicao falhou:', err);
    } finally {
      setSaving(false);
    }
  };

  // ---------- DETALHE ----------
  if (romaneio) {
    const si = statusInfo(romaneio.status);
    const podeEnviar = podeDespachar(romaneio.status);
    return (
      <MobileLayout title={`Romaneio ${romaneio.numeroRomaneio || romaneio.id}`} back>
        {/* Cabeçalho do romaneio */}
        <div className="px-4 pt-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${si.cls}`}>{si.label}</span>
              <button onClick={voltar} className="text-[11px] text-slate-400 flex items-center gap-1"><ChevronLeft className="w-3.5 h-3.5" /> Lista</button>
            </div>
            {romaneio.destino && (
              <div className="flex items-center gap-1.5 text-sm text-slate-300 mt-3"><MapPin className="w-4 h-4 text-amber-400" /> {romaneio.destino}</div>
            )}
            <div className="text-[11px] text-slate-400 mt-1">
              {romaneio.transportadora || 'Transportadora —'} {romaneio.placa ? `· ${romaneio.placa}` : ''}
            </div>
          </div>
        </div>

        {/* Progresso de conferência */}
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Conferência de carga</div>
            <div className="text-sm font-black text-amber-400">{conferidas}/{total}</div>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: pct + '%' }} />
          </div>
        </div>

        {/* Itens */}
        <div className="px-4 mt-3 space-y-2">
          {itens.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Romaneio sem peças vinculadas.</div>}
          {itens.map(i => {
            const ok = !!conf[i.id];
            return (
              <button
                key={i.id}
                onClick={() => toggleConf(i.id)}
                className={`w-full text-left rounded-2xl border p-3 flex items-center gap-3 transition ${ok ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}
              >
                {ok ? <CheckCircle2 className="w-7 h-7 text-emerald-400 flex-shrink-0" /> : <Circle className="w-7 h-7 text-slate-500 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{i.marca}</div>
                  <div className="text-[11px] text-slate-400 truncate">{i.tipo || '—'} · {i.peso.toFixed(0)} kg</div>
                </div>
                {ok && <span className="text-[10px] font-bold text-emerald-400">CONFERIDA</span>}
              </button>
            );
          })}
        </div>

        {/* FAB Bipar */}
        {total > 0 && (
          <button
            onClick={() => { tap('light'); setScanOpen(true); }}
            className="fixed right-4 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full bg-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 active:scale-95 transition"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
          >
            <ScanLine className="w-5 h-5" /> Bipar peça
          </button>
        )}

        {/* Confirmar despacho */}
        {podeEnviar && total > 0 && (
          <div className="px-4 mt-5 mb-2">
            <button
              onClick={() => { tap('medium'); setDespachar(true); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white font-black text-sm active:scale-[.99] transition"
            >
              <Send className="w-5 h-5" /> Confirmar despacho{conferidas < total ? ` (${conferidas}/${total} conferidas)` : ''}
            </button>
          </div>
        )}

        <Scanner open={scanOpen} onClose={() => setScanOpen(false)} onResult={onScan} title="Bipar peça do romaneio" />

        <Sheet
          open={despachar}
          onClose={() => !saving && setDespachar(false)}
          title="Confirmar despacho"
          footer={
            <button
              onClick={confirmarDespacho}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white font-black text-sm active:scale-[.99] transition disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Truck className="w-5 h-5" />}
              {saving ? 'Despachando…' : 'Despachar para a obra'}
            </button>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="text-slate-300">
              O romaneio <b>{romaneio.numeroRomaneio || romaneio.id}</b> será marcado como
              <b className="text-blue-300"> Em trânsito</b> e suas <b>{total}</b> peças irão para
              <b className="text-amber-300"> Aguardando Montagem</b> em campo.
            </p>
            {conferidas < total && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2.5 text-amber-300 text-[13px]">
                Atenção: {total - conferidas} peça(s) ainda não conferida(s).
              </div>
            )}
          </div>
        </Sheet>
      </MobileLayout>
    );
  }

  // ---------- LISTA ----------
  return (
    <MobileLayout title="Expedição" obraFilter>
      <div className="px-4 pt-3 pb-2">
        <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
          {romaneios.length} romaneio(s)
        </div>
      </div>
      <div className="px-4 space-y-2">
        {romaneios.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Truck className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <div className="text-sm">Nenhum romaneio para esta obra</div>
          </div>
        )}
        {romaneios.map(r => {
          const si = statusInfo(r.status);
          const nIds = idsDoRomaneio(r).length;
          const conf0 = loadConf(r.id);
          const nConf = Object.keys(conf0).length;
          return (
            <button
              key={r.id}
              onClick={() => abrirRomaneio(r)}
              className="w-full text-left rounded-2xl border border-slate-800 bg-slate-900 p-3.5 flex items-center gap-3 active:scale-[.99] transition"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center"><Package className="w-5 h-5 text-amber-400" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm truncate">{r.numeroRomaneio || r.id}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${si.cls}`}>{si.label}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {nIds} peça(s){nConf > 0 ? ` · ${nConf} conferida(s)` : ''}{r.destino ? ` · ${r.destino}` : ''}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </button>
          );
        })}
      </div>
    </MobileLayout>
  );
}
