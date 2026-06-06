// ============================================================
// MONTAGEM MOBILE - Aguardando ↔ Montado com toque para marcar
// ============================================================
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Hammer, CheckCircle2, Clock, Box, Search } from 'lucide-react';
import MobileLayout from '../MobileLayout';
import { useERP } from '@/contexts/ERPContext';
import { loadConcluidasSmart, saveConcluidasSmart } from '@/utils/montagemSync';
import { toast } from 'react-hot-toast';

export default function MontagemMobile() {
  const erp = useERP?.() || {};
  const { obras = [], pecas = [] } = erp;
  const [obraId, setObraId] = useState('');
  const [tab, setTab] = useState('aguardando'); // aguardando | montadas
  const [concluidas, setConcluidas] = useState(() => loadConcluidasSmart(remoto => setConcluidas(remoto || {})) || {});
  const [q, setQ] = useState('');

  // Obras com peças enviadas (em montagem)
  const obrasComMontagem = useMemo(
    () => obras.filter(o => pecas.some(p => (p.obra_id === o.id || p.obraId === o.id) && (p.etapa === 'enviado' || p.etapa === 'montado'))).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')),
    [obras, pecas]
  );

  // Selecionar obra default
  React.useEffect(() => {
    if (!obraId && obrasComMontagem.length) setObraId(obrasComMontagem[0].id);
  }, [obrasComMontagem, obraId]);

  const pecasObra = useMemo(() => {
    const list = pecas.filter(p => (p.obra_id === obraId || p.obraId === obraId) && (p.etapa === 'enviado' || p.etapa === 'montado'));
    const QQ = q.toUpperCase();
    return q.trim() ? list.filter(p => (p.marca || '').toUpperCase().includes(QQ)) : list;
  }, [pecas, obraId, q]);

  const aguardando = pecasObra.filter(p => !concluidas[String(p.id)]);
  const montadas = pecasObra.filter(p => !!concluidas[String(p.id)]);
  const lista = tab === 'aguardando' ? aguardando : montadas;

  const toggle = (peca) => {
    const id = String(peca.id);
    const nova = { ...concluidas };
    if (nova[id]) { delete nova[id]; } else { nova[id] = true; }
    setConcluidas(nova);
    try {
      saveConcluidasSmart(nova);
      toast.success(nova[id] ? `${peca.marca} montada` : `${peca.marca} desmarcada`);
    } catch (_) {
      toast.error('Falha ao sincronizar');
    }
  };

  return (
    <MobileLayout title="Montagem">
      {/* Filtros / Tabs */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 space-y-2">
        {/* Seletor obra */}
        <select
          value={obraId} onChange={e => setObraId(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
        >
          {obrasComMontagem.length === 0 && <option value="">Sem obras em montagem</option>}
          {obrasComMontagem.map(o => <option key={o.id} value={o.id}>{o.codigo ? `[${o.codigo}] ` : ''}{o.nome}</option>)}
        </select>
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('aguardando')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${tab === 'aguardando' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}
          >Aguardando ({aguardando.length})</button>
          <button
            onClick={() => setTab('montadas')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${tab === 'montadas' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-400'}`}
          >Montadas ({montadas.length})</button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar marca..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="px-4 pt-3 space-y-2">
        {lista.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Box className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <div className="text-sm">{tab === 'aguardando' ? 'Sem peças aguardando' : 'Nenhuma peça montada ainda'}</div>
          </div>
        )}
        {lista.map(p => {
          const isOk = concluidas.has(String(p.id));
          return (
            <motion.button
              key={p.id}
              onClick={() => toggle(p)}
              whileTap={{ scale: 0.97 }}
              className={`w-full text-left rounded-2xl border p-3 flex items-center gap-3 transition ${isOk ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800 hover:border-amber-500/30'}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm ${isOk ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>
                {isOk ? <CheckCircle2 className="w-6 h-6" /> : <Hammer className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">{p.marca || '—'}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {p.tipo || ''} · qtd {p.quantidade || 1} · {(Number(p.peso) || 0).toFixed(0)} kg
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                {isOk ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">MONTADA</span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">TOCAR</span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </MobileLayout>
  );
}
