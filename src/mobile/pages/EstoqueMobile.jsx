// ============================================================
// ESTOQUE MOBILE - Busca + movimentação (entrada/saída) + scanner
// ============================================================
// Lista com saúde do item, busca, filtro de alertas e SCANNER de material
// → sheet de movimentação:
//   Entrada (+) → adicionarEstoque   |   Saída (−) → consumirEstoque
// Escrita real no Supabase (estoqueApi.update via ERPContext).
//
// PARIDADE COM O DESKTOP (EstoquePageV2): respeita o filtro global por obra
// com o MESMO recorte (estoque próprio da obra; sem próprio → itens de
// fábrica cujo perfil está no BOM), "necessário" derivado do BOM
// (enriquecerNecessarioBOM), saúde por `saudeItem`/SAUDE e KPIs por
// `kpisEstoque` — os números batem com a página e os PDFs do desktop.
// ============================================================
import React, { useMemo, useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Package, ScanLine, AlertTriangle, ChevronRight,
  Plus, Minus, ArrowDownToLine, ArrowUpFromLine, Loader2, Truck,
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
import { useObraFiltro } from '../ObraContext';
import { supabase, supabaseAdmin } from '@/api/supabaseClient';
import { saudeItem, SAUDE, kpisEstoque, necessarioItem, chegouItem, faltaItem, temNecessidade, enriquecerNecessarioBOM } from '@/services/estoqueAnalytics';
import { normalizar } from '@/services/abastecimento';
import { fmtNum, fmtPeso } from '../ui/format';

const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');
const fmt = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

// Saúde do item = classificação canônica do ERP (services/estoqueAnalytics).
// Barra: cor da saúde. "Alerta" = zerado/crítico/baixo (mesmo critério do KPI
// "Alertas" da página desktop).
const ALERTA = new Set(['zerado', 'critico', 'baixo']);
const BAR = { zerado: 'bg-slate-500', critico: 'bg-red-500', baixo: 'bg-amber-500', atencao: 'bg-yellow-500', excesso: 'bg-blue-500', saudavel: 'bg-emerald-500', entregue: 'bg-green-500', sem_minimo: 'bg-slate-600' };
function nivel(item) {
  const key = saudeItem(item);
  const s = SAUDE[key] || SAUDE.sem_minimo;
  return { key, label: s.label, cls: s.badge, bar: BAR[key] || 'bg-slate-600', alerta: ALERTA.has(key) };
}

export default function EstoqueMobile() {
  const { estoque = [], consumirEstoque, adicionarEstoque } = useEstoque?.() || {};
  const { isTodas, obraSelecionada } = useObraFiltro();
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
  useEffect(() => { setLimite(40); }, [qd, soAlertas, obraSelecionada]);

  // BOM (materiais_corte) da obra selecionada — mesma fonte que alimenta o
  // "Necessário p/ Obra" e o PDF de Estoque no desktop.
  const [materiaisCorte, setMateriaisCorte] = useState([]);
  useEffect(() => {
    let alive = true;
    const obraId = obraSelecionada?.id || null;
    if (!obraId) { setMateriaisCorte([]); return; }
    const client = supabaseAdmin || supabase;
    client.from('materiais_corte')
      .select('id,perfil,material,peso_teorico,obra_id')
      .eq('obra_id', obraId)
      .then(({ data }) => { if (alive) setMateriaisCorte(data || []); })
      .catch(() => { if (alive) setMateriaisCorte([]); });
    return () => { alive = false; };
  }, [obraSelecionada]);

  // Escopo por OBRA — espelho de `estoquePorObra` (EstoquePageV2):
  //  - obra com estoque PRÓPRIO → só ele;
  //  - sem próprio → itens de FÁBRICA (sem obra) cujo perfil está no BOM;
  //  - "Todas" → tudo. Depois, necessário = MAIOR(seed, Σ BOM) por item.
  const escopo = useMemo(() => {
    const base = estoque || [];
    if (isTodas || !obraSelecionada) return base;
    const alvo = obraSelecionada.id;
    const proprios = base.filter(it => it.obraId === alvo || it.obra_id === alvo);
    let sel = proprios;
    if (!proprios.length) {
      const perfisBOM = new Set(materiaisCorte.map(m => normalizar(m.perfil).slice(0, 12)).filter(Boolean));
      sel = perfisBOM.size ? base.filter(it => {
        if (it.obraId || it.obra_id) return false;
        const chave = normalizar(`${it.descricao || ''} ${it.codigo || ''} ${it.perfil || ''} ${it.material || ''}`);
        for (const p of perfisBOM) if (chave.includes(p)) return true;
        return false;
      }) : [];
    }
    return enriquecerNecessarioBOM(sel, materiaisCorte);
  }, [estoque, isTodas, obraSelecionada, materiaisCorte]);

  const lista = useMemo(() => {
    let lst = escopo;
    if (soAlertas) lst = lst.filter(i => nivel(i).alerta);
    const QQ = norm(qd);
    if (qd.trim()) lst = lst.filter(i => norm(`${i.descricao} ${i.codigo} ${i.perfil} ${i.material} ${i.categoria || i.tipo}`).includes(QQ));
    return lst;
  }, [escopo, qd, soAlertas]);

  // KPIs canônicos (mesma função da página/PDF desktop)
  const kpis = useMemo(() => kpisEstoque(escopo), [escopo]);
  const nAlertas = kpis.alertas;

  const abrir = (item) => { tap('light'); setItemSel(item); setModo('entrada'); setQtd(1); };

  const onScan = (codigo) => {
    const alvo = norm(codigo);
    const acha = (lst) => lst.find(i => norm(i.codigo) === alvo)
      || (alvo.length >= 3 ? lst.find(i => norm(`${i.descricao} ${i.material} ${i.codigo} ${i.perfil}`).includes(alvo)) : null);
    const item = acha(escopo) || acha(estoque); // prioriza a obra; cai p/ global
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
    <MobileLayout title="Estoque" obraFilter>
      {/* Busca + filtro */}
      <div className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 space-y-2 sticky top-0 z-20">
        <SearchBar value={q} onChange={setQ} placeholder="Buscar material, perfil, código..." />
        <button
          onClick={() => setSoAlertas(s => !s)}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition border ${soAlertas ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-900 border-slate-800 text-slate-400'}`}
        >
          <AlertTriangle className="w-4 h-4" /> {soAlertas ? 'Mostrando alertas' : `Só alertas (${nAlertas})`}
        </button>
      </div>

      {/* KPIs — mesmos números da página de Estoque desktop (kpisEstoque) */}
      <div className="px-4 pt-3 grid grid-cols-3 gap-2">
        <Kpi label="Itens" value={fmtNum(kpis.nItens)} sub={`${fmtNum(kpis.alertas)} alerta(s)`} />
        <Kpi label="Peso em estoque" value={fmtPeso(kpis.pesoTotal)} sub={isTodas ? 'todas as obras' : 'escopo da obra'} />
        <Kpi label="Valor" value={'R$ ' + fmtNum(kpis.valorTotal)} sub={kpis.semPreco ? `${fmtNum(kpis.semPreco)} sem preço` : 'itens c/ preço'} tone="text-amber-300" />
      </div>
      {!isTodas && kpis.itensComNecessidade > 0 && (
        <div className="mx-4 mt-2 bg-slate-900 border border-slate-800 rounded-2xl p-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Material da obra (necessário × chegou)</span>
            <span className="font-black text-slate-100">{kpis.coberturaPct != null ? fmtNum(kpis.coberturaPct, 0) : 0}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden mt-2">
            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, kpis.coberturaPct || 0)}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-center">
            <MiniStat label="Necessário" value={fmtPeso(kpis.totalNecessario)} />
            <MiniStat label="Já chegou" value={fmtPeso(kpis.totalChegou)} tone="text-emerald-300" />
            <MiniStat label="Falta" value={fmtPeso(kpis.totalFalta)} tone={kpis.totalFalta > 0 ? 'text-red-300' : 'text-slate-300'} sub={`${fmtNum(kpis.itensComFalta)} item(ns)`} />
          </div>
          {kpis.totalExcedente > 0 && <div className="text-[10px] text-slate-500 mt-1.5">Excedente (acima do necessário): {fmtPeso(kpis.totalExcedente)}</div>}
        </div>
      )}

      {/* Lista */}
      <div className="px-4 pt-3 space-y-2">
        {lista.length === 0 && (
          <EmptyState
            icon={Package}
            title="Nenhum item encontrado"
            subtitle={(q || soAlertas) ? 'Ajuste a busca ou o filtro de alertas' : (isTodas ? 'Sem itens no estoque' : 'Esta obra não tem estoque próprio nem BOM cadastrado')}
            actionLabel={(q || soAlertas) ? 'Limpar busca e filtros' : undefined}
            onAction={(q || soAlertas) ? (() => { setQ(''); setSoAlertas(false); }) : undefined}
          />
        )}
        {lista.slice(0, limite).map(item => {
          const nvl = nivel(item);
          const min = Number(item.minimo) || 0;
          const nec = temNecessidade(item) ? necessarioItem(item) : 0;
          // Barra: cobertura (chegou/necessário) p/ item de obra; saldo/mínimo p/ fábrica
          const pct = nec
            ? Math.min(100, Math.round((Math.min(chegouItem(item), nec) / nec) * 100))
            : (min ? Math.min(100, Math.round(((Number(item.quantidade) || 0) / (min * 2)) * 100)) : 100);
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
                  {nec > 0 && (
                    <div className="text-[10px] text-slate-500 truncate">
                      nec. {fmtPeso(nec)} · chegou {fmtPeso(chegouItem(item))}{faltaItem(item) > 0 ? <span className="text-red-300"> · falta {fmtPeso(faltaItem(item))}</span> : <span className="text-emerald-300"> · completo</span>}
                    </div>
                  )}
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

function Kpi({ label, value, sub, tone = 'text-slate-100' }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5">
      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
      <div className={`text-[13px] font-black mt-0.5 truncate ${tone}`}>{value}</div>
      {sub && <div className="text-[9px] text-slate-500 truncate">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value, sub, tone = 'text-slate-200' }) {
  return (
    <div className="bg-slate-800/50 rounded-lg py-1.5 px-1">
      <div className="text-[8px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-[11px] font-bold truncate ${tone}`}>{value}</div>
      {sub && <div className="text-[8px] text-slate-500">{sub}</div>}
    </div>
  );
}
