// ============================================================
// APROVAÇÕES MOBILE — caixa de entrada unificada de aprovações
// ============================================================
// Tudo que aguarda decisão do gestor num lugar só, com aprovação em
// 1 toque confirmada por Face ID (degrada sem bloquear no web/PWA):
//   • Medições  (perm medicao.aprovar)   → updateMedicao status 'aprovada'
//   • Orçamentos (perm orcamentos.aprovar) → aprovarOrcamento / recusa
// Cada seção só aparece para quem tem a permissão. O detalhe abre em
// Sheet antes de decidir; o botão "Aprovar" no card é o caminho rápido.
// Respeita o filtro global por obra (matchObra) — orçamento sem obra
// vinculada aparece sempre (decisão consciente: não sumir pendência).
// ============================================================
import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  CheckCheck, CheckCircle2, XCircle, Ruler, Calculator, Loader2, ChevronRight, ShoppingCart,
} from 'lucide-react';
import MobileLayout from '../MobileLayout';
import Sheet from '../ui/Sheet';
import { tap, success } from '../ui/haptics';
import { confirmarBiometria } from '../ui/biometric';
import { ensureOnline } from '../ui/online';
import { useMedicoes, useOrcamentos, useCompras } from '@/contexts/ERPContext';
import { useAuth } from '@/lib/AuthContext';
import { useObraFiltro } from '../ObraContext';

const fmtMoney = (n) => 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtKg = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg';
const fmtData = (s) => {
  const d = String(s || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d || '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
};

// Medição aguardando aprovação (mesmo predicado da Home/MedicaoMobile)
const medPendente = (m) => ['pendente', 'aguardando'].includes(String(m?.status || '').toLowerCase());
// Orçamento aguardando decisão (colunas pré-aprovação do kanban desktop)
const ORC_ABERTOS = ['enviado', 'em_analise', 'negociacao', 'pendente'];
const orcPendente = (o) => ORC_ABERTOS.includes(String(o?.status || '').toLowerCase());
// Compra aguardando aprovação (criada como 'pendente' no desktop)
const cmpPendente = (c) => String(c?.status || '').toLowerCase() === 'pendente';

export default function AprovacoesMobile() {
  const { medicoes = [], updateMedicao } = useMedicoes?.() || {};
  const { orcamentos = [], aprovarOrcamento, updateOrcamento } = useOrcamentos?.() || {};
  const { compras = [], aprovarCompra } = useCompras?.() || {};
  const { matchObra } = useObraFiltro();
  const { hasPermission } = useAuth() || {};
  const podeMed = !!hasPermission && hasPermission('medicao.aprovar');
  const podeOrc = !!hasPermission && hasPermission('orcamentos.aprovar');
  const podeCmp = !!hasPermission && hasPermission('compras.aprovar');

  const [busy, setBusy] = useState(null);      // `${tipo}:${id}` em processamento
  const [detalhe, setDetalhe] = useState(null); // { tipo: 'med'|'orc', item }

  const medsPend = useMemo(
    () => (podeMed ? medicoes.filter(medPendente).filter(matchObra) : [])
      .slice().sort((a, b) => String(b.dataMedicao || b.data || '').localeCompare(String(a.dataMedicao || a.data || ''))),
    [medicoes, matchObra, podeMed]
  );
  const orcsPend = useMemo(
    () => (podeOrc ? orcamentos.filter(orcPendente).filter(o => !(o.obraId ?? o.obra_id) || matchObra(o)) : [])
      .slice().sort((a, b) => String(b.created_at || b.data || '').localeCompare(String(a.created_at || a.data || ''))),
    [orcamentos, matchObra, podeOrc]
  );
  const cmpsPend = useMemo(
    () => (podeCmp ? compras.filter(cmpPendente).filter(c => !(c.obraId ?? c.obra_id) || matchObra(c)) : [])
      .slice().sort((a, b) => String(b.created_at || b.data || '').localeCompare(String(a.created_at || a.data || ''))),
    [compras, matchObra, podeCmp]
  );
  const total = medsPend.length + orcsPend.length + cmpsPend.length;

  // ---- ações (todas: online + Face ID + haptic + toast) ----
  const executar = async (key, reason, fn, okMsg, errMsg) => {
    if (!ensureOnline()) return;
    const ok = await confirmarBiometria(reason);
    if (!ok) { toast.error('Autenticação não confirmada'); return; }
    setBusy(key);
    try {
      await fn();
      await success();
      toast.success(okMsg);
      setDetalhe(null);
    } catch (err) {
      toast.error(errMsg);
      console.error(`[AprovacoesMobile] ${key} falhou:`, err);
    } finally {
      setBusy(null);
    }
  };

  const aprovarMed = (m) => executar(
    `med:${m.id}`, `Aprovar medição ${m.numero || ''}`.trim(),
    () => updateMedicao(m.id, { status: 'aprovada' }),
    `Medição ${m.numero || ''} aprovada`.replace('  ', ' '), 'Falha ao aprovar medição'
  );

  const aprovarOrc = (o) => executar(
    `orc:${o.id}`, `Aprovar orçamento ${o.numero || ''}`.trim(),
    () => aprovarOrcamento(o.id, o.obraId ?? o.obra_id),
    `Orçamento ${o.numero || ''} aprovado`.replace('  ', ' '), 'Falha ao aprovar orçamento'
  );

  const recusarOrc = (o) => executar(
    `orc-rec:${o.id}`, `Recusar orçamento ${o.numero || ''}`.trim(),
    () => updateOrcamento(o.id, { status: 'recusado', data_aprovacao: new Date().toISOString().slice(0, 10) }),
    `Orçamento ${o.numero || ''} recusado`.replace('  ', ' '), 'Falha ao recusar orçamento'
  );

  const aprovarCmp = (c) => executar(
    `cmp:${c.id}`, `Aprovar compra ${c.id || ''}`.trim(),
    () => aprovarCompra(c.id, true),
    `Compra ${c.id || ''} aprovada`.replace('  ', ' '), 'Falha ao aprovar compra'
  );

  const recusarCmp = (c) => executar(
    `cmp-rec:${c.id}`, `Recusar compra ${c.id || ''}`.trim(),
    () => aprovarCompra(c.id, false),
    `Compra ${c.id || ''} recusada`.replace('  ', ' '), 'Falha ao recusar compra'
  );

  return (
    <MobileLayout title="Aprovações" back obraFilter>
      <div className="px-4 pt-3 pb-2">
        <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
          {total} pendência(s) aguardando decisão
        </div>
      </div>

      {total === 0 && (
        <div className="text-center py-16 text-slate-400">
          <CheckCheck className="w-12 h-12 mx-auto mb-3 text-emerald-500/60" />
          <div className="text-base font-bold text-slate-200">Tudo aprovado</div>
          <div className="text-sm mt-1">Nenhuma pendência para você agora.</div>
        </div>
      )}

      {/* ===== Medições ===== */}
      {medsPend.length > 0 && (
        <Secao icon={Ruler} cor="text-blue-400" titulo={`Medições · ${medsPend.length}`}>
          {medsPend.map(m => (
            <Card
              key={m.id}
              onOpen={() => { tap('light'); setDetalhe({ tipo: 'med', item: m }); }}
              titulo={m.numero || m.descricao || m.id}
              sub={`${m.obra || ''}${m.pesoMedido ? ' · ' + fmtKg(m.pesoMedido) : ''} · ${fmtData(m.dataMedicao || m.data)}`}
              valor={fmtMoney(m.valorTotal || m.valor)}
              busy={busy === `med:${m.id}`}
              onAprovar={() => aprovarMed(m)}
            />
          ))}
        </Secao>
      )}

      {/* ===== Orçamentos ===== */}
      {orcsPend.length > 0 && (
        <Secao icon={Calculator} cor="text-amber-400" titulo={`Orçamentos · ${orcsPend.length}`}>
          {orcsPend.map(o => (
            <Card
              key={o.id}
              onOpen={() => { tap('light'); setDetalhe({ tipo: 'orc', item: o }); }}
              titulo={o.numero || o.projeto || o.id}
              sub={`${o.cliente || o.projeto || ''} · ${String(o.status || '').replace('_', ' ')}`}
              valor={fmtMoney(o.valor_total ?? o.valorTotal ?? o.valor)}
              busy={busy === `orc:${o.id}`}
              onAprovar={() => aprovarOrc(o)}
            />
          ))}
        </Secao>
      )}

      {/* ===== Compras ===== */}
      {cmpsPend.length > 0 && (
        <Secao icon={ShoppingCart} cor="text-violet-400" titulo={`Compras · ${cmpsPend.length}`}>
          {cmpsPend.map(c => (
            <Card
              key={c.id}
              onOpen={() => { tap('light'); setDetalhe({ tipo: 'cmp', item: c }); }}
              titulo={c.id}
              sub={`${c.fornecedor || '—'}${c.prazo ? ' · prazo ' + fmtData(c.prazo) : ''}`}
              valor={fmtMoney(c.valor ?? c.valor_total)}
              busy={busy === `cmp:${c.id}`}
              onAprovar={() => aprovarCmp(c)}
            />
          ))}
        </Secao>
      )}

      {/* ===== Detalhe (Sheet) ===== */}
      <Sheet
        open={!!detalhe}
        onClose={() => !busy && setDetalhe(null)}
        title={detalhe?.tipo === 'med' ? 'Detalhe da medição' : detalhe?.tipo === 'cmp' ? 'Detalhe da compra' : 'Detalhe do orçamento'}
        footer={detalhe && (
          <div className="flex gap-2">
            {(detalhe.tipo === 'orc' || detalhe.tipo === 'cmp') && (
              <button
                onClick={() => (detalhe.tipo === 'orc' ? recusarOrc(detalhe.item) : recusarCmp(detalhe.item))}
                disabled={!!busy}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-300 font-black text-sm active:scale-[.99] transition disabled:opacity-60"
              >
                {(busy === `orc-rec:${detalhe.item.id}` || busy === `cmp-rec:${detalhe.item.id}`) ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                Recusar
              </button>
            )}
            <button
              onClick={() => (detalhe.tipo === 'med' ? aprovarMed(detalhe.item) : detalhe.tipo === 'cmp' ? aprovarCmp(detalhe.item) : aprovarOrc(detalhe.item))}
              disabled={!!busy}
              className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm active:scale-[.99] transition disabled:opacity-60"
            >
              {busy && busy.startsWith(detalhe.tipo === 'med' ? 'med:' : detalhe.tipo === 'cmp' ? 'cmp:' : 'orc:') ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Aprovar com Face ID
            </button>
          </div>
        )}
      >
        {detalhe?.tipo === 'med' && <DetalheMedicao m={detalhe.item} />}
        {detalhe?.tipo === 'orc' && <DetalheOrcamento o={detalhe.item} />}
        {detalhe?.tipo === 'cmp' && <DetalheCompra c={detalhe.item} />}
      </Sheet>
    </MobileLayout>
  );
}

// ---------- componentes ----------
function Secao({ icon: Icon, cor, titulo, children }) {
  return (
    <div className="px-4 mb-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${cor}`} />
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{titulo}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Card({ titulo, sub, valor, busy, onAprovar, onOpen }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 flex items-center gap-3">
      <button onClick={onOpen} className="flex-1 min-w-0 text-left active:opacity-70 transition">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-sm truncate">{titulo}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        </div>
        <div className="text-[11px] text-slate-400 truncate mt-0.5">{sub}</div>
        <div className="text-sm font-black text-emerald-300 mt-1">{valor}</div>
      </button>
      <button
        onClick={onAprovar}
        disabled={busy}
        className="flex-shrink-0 flex items-center gap-1.5 text-[12px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 active:scale-95 transition disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        Aprovar
      </button>
    </div>
  );
}

function Linha({ k, v }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{k}</span>
      <span className="text-sm font-bold text-right max-w-[60%] truncate">{v ?? '—'}</span>
    </div>
  );
}

function DetalheMedicao({ m }) {
  const fotoUrl = m.detalhamento?.fotoUrl;
  return (
    <div>
      <Linha k="Número" v={m.numero || m.id} />
      <Linha k="Obra" v={m.obra || m.obraId || m.obra_id} />
      <Linha k="Peso medido" v={m.pesoMedido ? fmtKg(m.pesoMedido) : '—'} />
      <Linha k="Valor" v={fmtMoney(m.valorTotal || m.valor)} />
      <Linha k="Data" v={fmtData(m.dataMedicao || m.data)} />
      <Linha k="Responsável" v={m.responsavel} />
      {m.observacoes && <div className="mt-3 text-sm text-slate-300 bg-slate-800/60 rounded-xl p-3">{m.observacoes}</div>}
      {fotoUrl && (
        <div className="mt-3 rounded-xl overflow-hidden border border-slate-700">
          <img src={fotoUrl} alt="evidência da medição" className="w-full h-44 object-cover" loading="lazy" />
        </div>
      )}
    </div>
  );
}

function DetalheCompra({ c }) {
  return (
    <div>
      <Linha k="Pedido" v={c.id} />
      <Linha k="Fornecedor" v={c.fornecedor} />
      <Linha k="Valor" v={fmtMoney(c.valor ?? c.valor_total)} />
      <Linha k="Itens" v={c.itens != null ? String(Array.isArray(c.itens) ? c.itens.length : c.itens) : '—'} />
      <Linha k="Prazo" v={c.prazo ? fmtData(c.prazo) : '—'} />
      <Linha k="Criado em" v={fmtData(c.created_at || c.data)} />
      {c.descricao && <div className="mt-3 text-sm text-slate-300 bg-slate-800/60 rounded-xl p-3">{c.descricao}</div>}
    </div>
  );
}

function DetalheOrcamento({ o }) {
  return (
    <div>
      <Linha k="Número" v={o.numero || o.id} />
      <Linha k="Projeto" v={o.projeto} />
      <Linha k="Cliente" v={o.cliente} />
      <Linha k="Valor total" v={fmtMoney(o.valor_total ?? o.valorTotal ?? o.valor)} />
      <Linha k="Peso estimado" v={o.peso_estimado ? fmtKg(o.peso_estimado) : '—'} />
      <Linha k="Status atual" v={String(o.status || '').replace('_', ' ')} />
      <Linha k="Criado em" v={fmtData(o.created_at || o.data)} />
      {o.observacoes && <div className="mt-3 text-sm text-slate-300 bg-slate-800/60 rounded-xl p-3">{o.observacoes}</div>}
    </div>
  );
}
