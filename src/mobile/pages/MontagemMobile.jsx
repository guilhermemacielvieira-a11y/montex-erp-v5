// ============================================================
// MONTAGEM MOBILE - Aguardando ↔ Montado + Scanner de peça
// ============================================================
// Marca peças como montadas (entity_store, independente da etapa do banco
// — regra #6 do CLAUDE.md). Operação de campo: ESCANEAR a etiqueta/QR da
// peça → encontra a marca na obra → sheet de confirmação → marca montada.
// ============================================================
import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Hammer, CheckCircle2, Box, Search, ScanLine, RotateCcw } from 'lucide-react';
import MobileLayout from '../MobileLayout';
import Sheet from '../ui/Sheet';
import Scanner from '../ui/Scanner';
import LoadMore from '../ui/LoadMore';
import EmptyState from '../ui/EmptyState';
import { useDebounced } from '../ui/useDebounced';
import { tap, success } from '../ui/haptics';
import { useERP } from '@/contexts/ERPContext';
import { useObraFiltro } from '../ObraContext';
import { loadConcluidasSmart, saveConcluidasSmart } from '@/utils/montagemSync';
import { toast } from 'react-hot-toast';

// Normaliza marca p/ matching robusto (maiúsculas, sem espaços) — alinhado ao 3D/ERP.
const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');

export default function MontagemMobile() {
  const erp = useERP?.() || {};
  const { pecas = [] } = erp;
  const { matchObra } = useObraFiltro();
  const [tab, setTab] = useState('aguardando'); // aguardando | montadas
  const [concluidas, setConcluidas] = useState(() => loadConcluidasSmart(remoto => setConcluidas(remoto || {})) || {});
  const [q, setQ] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [pecaSel, setPecaSel] = useState(null); // peça aberta no sheet de confirmação
  const [limite, setLimite] = useState(40);
  const qd = useDebounced(q, 250); // busca com debounce
  useEffect(() => { setLimite(40); }, [tab, qd]);

  // Todas as peças da obra (p/ mensagem útil quando a marca existe mas não está em campo)
  const pecasDaObra = useMemo(() => pecas.filter(matchObra), [pecas, matchObra]);
  // Peças em montagem (enviado/montado) — escopo de campo
  const pecasCampo = useMemo(() => pecasDaObra.filter(p => p.etapa === 'enviado' || p.etapa === 'montado'), [pecasDaObra]);

  const listaFiltrada = useMemo(() => {
    const QQ = norm(qd);
    return qd.trim() ? pecasCampo.filter(p => norm(p.marca).includes(QQ)) : pecasCampo;
  }, [pecasCampo, qd]);

  const aguardando = listaFiltrada.filter(p => !concluidas[String(p.id)]);
  const montadas = listaFiltrada.filter(p => !!concluidas[String(p.id)]);
  const lista = tab === 'aguardando' ? aguardando : montadas;

  const toggle = (peca) => {
    const id = String(peca.id);
    const nova = { ...concluidas };
    const estaMontada = !!nova[id];
    if (estaMontada) {
      delete nova[id];
    } else {
      // MESMO formato de MontagemPage/MontexERP3DPage (entity_store).
      nova[id] = { montadoEm: new Date().toISOString(), origem: 'MontagemMobile', marca: peca.marca };
    }
    setConcluidas(nova);
    try {
      saveConcluidasSmart(nova);
      if (estaMontada) { tap('medium'); toast.success(`${peca.marca} desmarcada`); }
      else { success(); toast.success(`${peca.marca} montada`); }
    } catch (_) {
      toast.error('Falha ao sincronizar');
    }
  };

  // Resultado do scanner: encontra a peça pela marca e abre confirmação
  const onScan = (codigo) => {
    const alvo = norm(codigo);
    // 1) tenta no escopo de campo (enviado/montado)
    let peca = pecasCampo.find(p => norm(p.marca) === alvo)
            || pecasCampo.find(p => norm(p.marca).includes(alvo) && alvo.length >= 3);
    if (peca) { tap('heavy'); setPecaSel(peca); return; }
    // 2) existe na obra mas ainda não está em campo?
    const fora = pecasDaObra.find(p => norm(p.marca) === alvo);
    if (fora) {
      toast(`${fora.marca} está em "${fora.etapa}" — ainda não enviada para montagem`, { icon: '📦' });
      return;
    }
    toast.error(`Peça "${codigo}" não encontrada nesta obra`);
  };

  const confirmarSheet = () => {
    if (!pecaSel) return;
    toggle(pecaSel);
    setPecaSel(null);
  };

  const pecaMontada = pecaSel ? !!concluidas[String(pecaSel.id)] : false;

  return (
    <MobileLayout title="Montagem" obraFilter>
      {/* Tabs + busca */}
      <div className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 space-y-2">
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
          <EmptyState
            icon={Box}
            title={qd ? 'Nada encontrado' : (tab === 'aguardando' ? 'Sem peças aguardando' : 'Nenhuma peça montada ainda')}
            subtitle={qd ? 'Tente outra marca' : (tab === 'aguardando' ? 'Use o scanner para registrar montagem' : 'Marque peças como montadas na aba Aguardando')}
            actionLabel={q ? 'Limpar busca' : undefined}
            onAction={q ? (() => setQ('')) : undefined}
          />
        )}
        {lista.slice(0, limite).map(p => {
          const isOk = !!concluidas[String(p.id)];
          return (
            <motion.button
              key={p.id}
              onClick={() => { tap('light'); setPecaSel(p); }}
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
        <LoadMore total={lista.length} shown={limite} onMore={() => setLimite(l => l + 40)} />
      </div>

      {/* FAB Escanear */}
      <button
        onClick={() => { tap('light'); setScanOpen(true); }}
        className="fixed right-4 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full bg-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 active:scale-95 transition"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
      >
        <ScanLine className="w-5 h-5" /> Escanear
      </button>

      {/* Scanner */}
      <Scanner open={scanOpen} onClose={() => setScanOpen(false)} onResult={onScan} />

      {/* Sheet de confirmação da peça */}
      <Sheet
        open={!!pecaSel}
        onClose={() => setPecaSel(null)}
        title={pecaSel ? (pecaSel.marca || pecaSel.id) : ''}
        footer={
          pecaSel && (
            <button
              onClick={confirmarSheet}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm active:scale-[.99] transition ${pecaMontada ? 'bg-slate-700 text-slate-100' : 'bg-emerald-500 text-slate-950'}`}
            >
              {pecaMontada ? <RotateCcw className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              {pecaMontada ? 'Desmarcar montagem' : 'Marcar como montada'}
            </button>
          )
        }
      >
        {pecaSel && (
          <div className="space-y-4">
            <div className={`rounded-xl px-3 py-2.5 text-sm font-bold flex items-center gap-2 ${pecaMontada ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
              {pecaMontada ? <CheckCircle2 className="w-4 h-4" /> : <Hammer className="w-4 h-4" />}
              {pecaMontada ? 'Montada' : 'Aguardando montagem'}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Info label="Tipo" value={pecaSel.tipo || '—'} />
              <Info label="Quantidade" value={String(pecaSel.quantidade || 1)} />
              <Info label="Peso" value={`${(Number(pecaSel.peso) || 0).toFixed(0)} kg`} />
              <Info label="Etapa" value={pecaSel.etapa || '—'} />
            </div>
          </div>
        )}
      </Sheet>
    </MobileLayout>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className="text-sm font-bold text-slate-100 mt-0.5 truncate">{value}</div>
    </div>
  );
}
