// ============================================================
// ESTOQUE MOBILE - Busca + movimentação (entrada/saída) + scanner
// ============================================================
// Estoque da FÁBRICA (global, não por obra). Lista com status de nível,
// busca, filtro de alertas e SCANNER de material → sheet de movimentação:
//   Entrada (+) → adicionarEstoque   |   Saída (−) → consumirEstoque
// Escrita real no Supabase (estoqueApi.update via ERPContext).
// ============================================================
import React, { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Package, ScanLine, AlertTriangle, ChevronRight,
  Plus, Minus, ArrowDownToLine, ArrowUpFromLine, Loader2,
} from 'lucide-react';
import MobileLayout from '../MobileLayout';
import Scanner from '../ui/Scanner';
import Sheet from '../ui/Sheet';
import SearchBar from '../ui/SearchBar';
import LoadMore from '../ui/LoadMore';
import EmptyState from '../ui/EmptyState';
import { useDebounced } from '../ui/useDebounced';
import { tap, success } from '../ui/haptics';
import { ensureOnline } from '../ui/online';
import { useEstoque } from '@/contexts/ERPContext';

const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');
const fmt = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

function nivel(item) {
  const q = Number(item.quantidade) || 0;
  const min = Number(item.minimo) || 0;
  if (q <= 0) return { key: 'zerado', label: 'Zerado', cls: 'bg-red-500/15 text-red-300 border-red-500/30', bar: 'bg-red-500' };
  if (min && q <= min * 0.5) return { key: 'critico', label: 'Crítico', cls: 'bg-red-500/15 text-red-300 border-red-500/30', bar: 'bg-red-500' };
  if (min && q <= min) return { key: 'baixo', label: 'Baixo', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', bar: 'bg-amber-500' };
  return { key: 'ok', label: 'OK', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', bar: 'bg-emerald-500' };
}

export default function EstoqueMobile() {
  const { estoque = [], consumirEstoque, adicionarEstoque } = useEstoque?.() || {};
  const [q, setQ] = useState('');
  const [soAlertas, setSoAlertas] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [itemSel, setItemSel] = useState(null);
  const [modo, setModo] = useState('entrada'); // entrada | saida
  const [qtd, setQtd] = useState(1);
  const [saving, setSaving] = useState(false);
  const [limite, setLimite] = useState(40);
  const qd = useDebounced(q, 250); // termo de busca com debounce (filtro pesado)
  // Reinicia a paginação ao mudar busca/filtro (senão herda o limite anterior).
  useEffect(() => { setLimite(40); }, [qd, soAlertas]);

  const lista = useMemo(() => {
    let lst = estoque;
    if (soAlertas) lst = lst.filter(i => nivel(i).key !== 'ok');
    const QQ = norm(qd);
    if (qd.trim()) lst = lst.filter(i => norm(`${i.descricao} ${i.codigo} ${i.material} ${i.categoria || i.tipo}`).includes(QQ));
    return lst;
  }, [estoque, qd, soAlertas]);

  const nAlertas = useMemo(() => estoque.filter(i => nivel(i).key !== 'ok').length, [estoque]);

  const abrir = (item) => { tap('light'); setItemSel(item); setModo('entrada'); setQtd(1); };

  const onScan = (codigo) => {
    const alvo = norm(codigo);
    const item = estoque.find(i => norm(i.codigo) === alvo)
              || (alvo.length >= 3 ? estoque.find(i => norm(`${i.descricao} ${i.material} ${i.codigo}`).includes(alvo)) : null);
    if (!item) { toast.error(`Material "${codigo}" não encontrado`); return; }
    tap('heavy');
    abrir(item);
  };

  const setQtdSafe = (v) => setQtd(Math.max(0, Number(v) || 0));

  const registrar = async () => {
    if (!itemSel || qtd <= 0) return;
    const isSaida = modo === 'saida';
    if (isSaida && qtd > (Number(itemSel.quantidade) || 0)) {
      toast.error('Saída maior que o saldo disponível');
      return;
    }
    if (!ensureOnline()) return;
    setSaving(true);
    try {
      if (isSaida) await consumirEstoque?.(itemSel.id, qtd);
      else await adicionarEstoque?.(itemSel.id, qtd);
      await success();
      toast.success(`${isSaida ? 'Saída' : 'Entrada'}: ${fmt(qtd)} ${itemSel.unidade || ''} · ${itemSel.descricao || itemSel.id}`);
      setItemSel(null);
    } catch (err) {
      toast.error('Falha ao registrar movimentação');
      console.error('[EstoqueMobile] movimentação falhou:', err);
    } finally {
      setSaving(false);
    }
  };

  const nv = itemSel ? nivel(itemSel) : null;
  const novoSaldo = itemSel ? (Number(itemSel.quantidade) || 0) + (modo === 'saida' ? -qtd : qtd) : 0;

  return (
    <MobileLayout title="Estoque">
      {/* Busca + filtro */}
      <div className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 space-y-2 sticky top-0 z-20">
        <SearchBar value={q} onChange={setQ} placeholder="Buscar material, código..." />
        <button
          onClick={() => setSoAlertas(s => !s)}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition border ${soAlertas ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
        >
          <AlertTriangle className="w-4 h-4" /> {soAlertas ? 'Mostrando alertas' : `Só alertas (${nAlertas})`}
        </button>
      </div>

      {/* Lista */}
      <div className="px-4 pt-3 space-y-2">
        {lista.length === 0 && (
          <EmptyState
            icon={Package}
            title="Nenhum item encontrado"
            subtitle={(q || soAlertas) ? 'Ajuste a busca ou o filtro de alertas' : 'Sem itens no estoque'}
            actionLabel={(q || soAlertas) ? 'Limpar busca e filtros' : undefined}
            onAction={(q || soAlertas) ? (() => { setQ(''); setSoAlertas(false); }) : undefined}
          />
        )}
        {lista.slice(0, limite).map(item => {
          const nvl = nivel(item);
          const min = Number(item.minimo) || 0;
          const pct = min ? Math.min(100, Math.round(((Number(item.quantidade) || 0) / (min * 2)) * 100)) : 100;
          return (
            <button
              key={item.id}
              onClick={() => abrir(item)}
              className="w-full text-left rounded-2xl border border-slate-800 bg-slate-900 p-3 active:scale-[.99] transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center"><Package className="w-5 h-5 text-amber-400" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{item.descricao || item.codigo || item.id}</div>
                  <div className="text-[11px] text-slate-400 truncate">{item.categoria || item.tipo || '—'}{item.codigo ? ` · ${item.codigo}` : ''}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-black">{fmt(item.quantidade)}<span className="text-[10px] text-slate-400 ml-0.5">{item.unidade || ''}</span></div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${nvl.cls}`}>{nvl.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
              </div>
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-2.5">
                <div className={`h-full ${nvl.bar} transition-all duration-300`} style={{ width: pct + '%' }} />
              </div>
            </button>
          );
        })}
        <LoadMore total={lista.length} shown={limite} onMore={() => setLimite(l => l + 40)} />
      </div>

      {/* FAB Escanear material */}
      <button
        onClick={() => { tap('light'); setScanOpen(true); }}
        className="fixed right-4 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full bg-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 active:scale-95 transition"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
      >
        <ScanLine className="w-5 h-5" /> Escanear
      </button>

      <Scanner open={scanOpen} onClose={() => setScanOpen(false)} onResult={onScan} title="Escanear material" />

      {/* Sheet de movimentação */}
      <Sheet
        open={!!itemSel}
        onClose={() => !saving && setItemSel(null)}
        title={itemSel ? (itemSel.descricao || itemSel.codigo || itemSel.id) : ''}
        footer={
          itemSel && (
            <button
              onClick={registrar}
              disabled={saving || qtd <= 0}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm active:scale-[.99] transition disabled:opacity-50 ${modo === 'saida' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-slate-950'}`}
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (modo === 'saida' ? <ArrowUpFromLine className="w-5 h-5" /> : <ArrowDownToLine className="w-5 h-5" />)}
              {saving ? 'Registrando…' : `Registrar ${modo === 'saida' ? 'saída' : 'entrada'}`}
            </button>
          )
        }
      >
        {itemSel && (
          <div className="space-y-4">
            {/* Saldo atual */}
            <div className="flex items-center justify-between bg-slate-800/60 rounded-xl p-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Saldo atual</div>
                <div className="text-xl font-black mt-0.5">{fmt(itemSel.quantidade)} <span className="text-xs text-slate-400">{itemSel.unidade || ''}</span></div>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <div>Mín: {fmt(itemSel.minimo)}</div>
                <div>Reserv: {fmt(itemSel.reservado)}</div>
                <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${nv.cls}`}>{nv.label}</span>
              </div>
            </div>

            {/* Toggle entrada/saída */}
            <div className="flex gap-2">
              <button
                onClick={() => setModo('entrada')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition ${modo === 'entrada' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
              ><ArrowDownToLine className="w-4 h-4" /> Entrada</button>
              <button
                onClick={() => setModo('saida')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition ${modo === 'saida' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}
              ><ArrowUpFromLine className="w-4 h-4" /> Saída</button>
            </div>

            {/* Stepper de quantidade */}
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Quantidade ({itemSel.unidade || 'un'})</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQtdSafe(qtd - 1)} className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center active:scale-95"><Minus className="w-5 h-5" /></button>
                <input
                  type="number" inputMode="decimal" value={qtd}
                  onChange={e => setQtdSafe(e.target.value)}
                  className="flex-1 text-center bg-slate-800 border border-slate-700 rounded-xl py-3 text-lg font-black focus:outline-none focus:border-amber-500/50"
                />
                <button onClick={() => setQtdSafe(qtd + 1)} className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center active:scale-95"><Plus className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Novo saldo previsto */}
            <div className={`rounded-xl px-3 py-2.5 text-sm font-semibold flex items-center justify-between ${novoSaldo < 0 ? 'bg-red-500/10 text-red-300' : 'bg-slate-800/60 text-slate-200'}`}>
              <span>Novo saldo</span>
              <span className="font-black">{fmt(novoSaldo)} {itemSel.unidade || ''}</span>
            </div>
          </div>
        )}
      </Sheet>
    </MobileLayout>
  );
}
