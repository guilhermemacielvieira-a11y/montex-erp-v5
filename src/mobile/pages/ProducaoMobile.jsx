// ============================================================
// PRODUÇÃO MOBILE - Kanban operacional por etapa
// ============================================================
// Resumo por etapa (cards) + drill-down nas peças + AÇÃO de chão de
// fábrica: avançar a peça para a próxima etapa (moverPecaEtapa →
// persiste no Supabase). Toque na etapa filtra; toque na peça abre o
// sheet de avanço com escolha opcional de responsável e háptico.
//
// APONTAMENTO POR BIPAGEM (modo estação): o operador escolhe a etapa
// de destino (sua estação) e bipa as peças em sequência — cada leitura
// válida avança a peça automaticamente (Scanner continuous + offline
// queue). Validação estrita: só avança quem está na etapa ANTERIOR à
// de destino (evita pular etapas por bipe errado); duplicata vira
// aviso "já apontada". Gated por producao.lancar_avanco.
// ============================================================
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Factory, Wrench, PaintBucket, PackageCheck, Truck, ChevronRight, ArrowRight, Loader2, ScanLine } from 'lucide-react';
import MobileLayout from '../MobileLayout';
import Sheet from '../ui/Sheet';
import Scanner from '../ui/Scanner';
import SearchBar from '../ui/SearchBar';
import LoadMore from '../ui/LoadMore';
import EmptyState from '../ui/EmptyState';
import { useDebounced } from '../ui/useDebounced';
import { tap, success } from '../ui/haptics';
import { isOnline } from '../ui/online';
import { enqueue } from '../ui/offlineQueue';
import { useERP } from '@/contexts/ERPContext';
import { useProducao } from '@/contexts/ERPContext';
import { useAuth } from '@/lib/AuthContext';
import { useObraFiltro } from '../ObraContext';

// Ordem do fluxo (etapas REAIS do banco — auditoria 11/06): fabricacao →
// solda → pintura → expedido → enviado → entregue. 'aguardando' é o estado
// inicial. 'entregue' (recebida na obra) estava fora da lista e as peças
// nessa etapa caíam em 'Aguardando' na contagem.
const ETAPAS = [
  { key: 'aguardando', label: 'Aguardando', icon: Factory, color: 'slate' },
  { key: 'fabricacao', label: 'Fabricação', icon: Wrench, color: 'blue' },
  { key: 'solda', label: 'Solda', icon: Wrench, color: 'amber' },
  { key: 'pintura', label: 'Pintura', icon: PaintBucket, color: 'purple' },
  { key: 'expedido', label: 'Expedido', icon: PackageCheck, color: 'emerald' },
  { key: 'enviado', label: 'Enviado', icon: Truck, color: 'green' },
  { key: 'entregue', label: 'Entregue na obra', icon: PackageCheck, color: 'green' },
];
const ORDEM = ETAPAS.map(e => e.key);
const proximaEtapa = (etapa) => {
  const i = ORDEM.indexOf((etapa || 'aguardando').toLowerCase());
  return i >= 0 && i < ORDEM.length - 1 ? ORDEM[i + 1] : null;
};
const labelDe = (key) => ETAPAS.find(e => e.key === key)?.label || key;

const C_BG = { slate: 'bg-slate-700/30 border-slate-600', blue: 'bg-blue-500/15 border-blue-500/30', amber: 'bg-amber-500/15 border-amber-500/30', purple: 'bg-violet-500/15 border-violet-500/30', emerald: 'bg-emerald-500/15 border-emerald-500/30', green: 'bg-green-500/15 border-green-500/30' };
const C_TXT = { slate: 'text-slate-300', blue: 'text-blue-300', amber: 'text-amber-300', purple: 'text-violet-300', emerald: 'text-emerald-300', green: 'text-green-300' };

export default function ProducaoMobile() {
  const erp = useERP?.() || {};
  const { pecas = [], funcionarios = [] } = erp;
  const { moverPecaEtapa } = useProducao?.() || {};
  const { matchObra, isTodas } = useObraFiltro();
  const { hasPermission } = useAuth() || {};
  // Sem hasPermission (fallback) libera — mesmo critério do resto do app
  const podeApontar = !hasPermission || hasPermission('producao.lancar_avanco');
  const [q, setQ] = useState('');
  const [etapaSel, setEtapaSel] = useState(null); // etapa para drill-down
  const [pecaSel, setPecaSel] = useState(null);    // peça aberta no sheet
  const [funcId, setFuncId] = useState('');
  const [saving, setSaving] = useState(false);
  const [limite, setLimite] = useState(40);
  // --- Apontamento por bipagem (modo estação) ---
  const [apontarOpen, setApontarOpen] = useState(false); // sheet de config
  const [scanOpen, setScanOpen] = useState(false);       // scanner contínuo
  const [destino, setDestino] = useState('fabricacao');  // etapa da estação
  const [apontFunc, setApontFunc] = useState('');        // responsável da sessão
  const apontadasRef = useRef(new Set());                // ids já apontados na sessão
  const qd = useDebounced(q, 250); // busca com debounce (filtra 1103+ peças)
  useEffect(() => { setLimite(40); }, [etapaSel, qd]);

  const pecasFiltradas = useMemo(() => {
    let lst = pecas.filter(matchObra);
    if (qd.trim()) {
      const qq = qd.toUpperCase();
      lst = lst.filter(p => (p.marca || '').toUpperCase().includes(qq) || (p.id || '').toString().toUpperCase().includes(qq));
    }
    return lst;
  }, [pecas, matchObra, qd]);

  const porEtapa = useMemo(() => {
    const m = {};
    for (const e of ETAPAS) m[e.key] = { conjuntos: 0, unidades: 0, peso: 0 };
    for (const p of pecasFiltradas) {
      const e = (p.etapa || 'aguardando').toLowerCase();
      if (!m[e]) continue;
      m[e].conjuntos += 1;
      m[e].unidades += Number(p.quantidade) || 1;
      m[e].peso += (Number(p.peso) || 0) * (Number(p.quantidade) || 1);
    }
    return m;
  }, [pecasFiltradas]);

  const totalConjuntos = pecasFiltradas.length;

  // Lista de peças do drill-down: só renderiza quando há etapa selecionada ou busca
  // (evita montar 500+ linhas por padrão).
  const listaPecas = useMemo(() => {
    if (!etapaSel && !qd.trim()) return [];
    return pecasFiltradas
      .filter(p => !etapaSel || (p.etapa || 'aguardando').toLowerCase() === etapaSel)
      .slice(0, 500);
  }, [pecasFiltradas, etapaSel, qd]);

  const abrirPeca = (p) => { setPecaSel(p); setFuncId(p.responsavel || ''); tap('light'); };
  const fecharPeca = () => { if (!saving) { setPecaSel(null); setFuncId(''); } };

  const avancar = async () => {
    if (!pecaSel || !moverPecaEtapa) return;
    const prox = proximaEtapa(pecaSel.etapa);
    if (!prox) { toast('Peça já está na etapa final'); return; }
    if (!isOnline()) {
      // Offline: aplica otimisticamente (dispatch local imediato; remoto falha e é
      // ignorado) e ENFILEIRA para sincronizar ao reconectar. moverPecaEtapa é
      // idempotente (re-aplicar etapa=X dá o mesmo resultado).
      moverPecaEtapa(pecaSel.id, prox, funcId || undefined)?.catch(() => {});
      enqueue('moverPecaEtapa', [pecaSel.id, prox, funcId || null], `${pecaSel.marca || pecaSel.id} → ${labelDe(prox)}`);
      tap('medium');
      toast.success('Salvo offline — sincroniza ao reconectar');
      setPecaSel(null); setFuncId('');
      return;
    }
    setSaving(true);
    try {
      await moverPecaEtapa(pecaSel.id, prox, funcId || undefined);
      await success();
      toast.success(`${pecaSel.marca || pecaSel.id} → ${labelDe(prox)}`);
      setPecaSel(null); setFuncId('');
    } catch (err) {
      toast.error('Falha ao avançar etapa');
      console.error('[ProducaoMobile] moverPecaEtapa falhou:', err);
    } finally {
      setSaving(false);
    }
  };

  const prox = pecaSel ? proximaEtapa(pecaSel.etapa) : null;

  // ===== Apontamento por bipagem =====
  // Etapas válidas como destino de apontamento (não se aponta p/ 'aguardando';
  // 'enviado' é ato da expedição/obra, não do chão de fábrica).
  const DESTINOS = ETAPAS.filter(e => ['fabricacao', 'solda', 'pintura', 'expedido'].includes(e.key));
  const etapaAnterior = ORDEM[ORDEM.indexOf(destino) - 1];

  const iniciarBipagem = () => {
    apontadasRef.current = new Set();
    setApontarOpen(false);
    setScanOpen(true);
    tap('medium');
  };

  // Cada leitura do scanner contínuo: localiza a peça pelo código (marca ou ID,
  // match exato case-insensitive, respeitando o filtro de obra) e valida a
  // transição estrita anterior→destino antes de avançar.
  const onScanApontamento = (code) => {
    const v = String(code || '').trim().toUpperCase();
    if (!v) return;
    const candidatas = pecasFiltradas.filter(
      p => String(p.marca || '').trim().toUpperCase() === v || String(p.id || '').trim().toUpperCase() === v
    );
    if (candidatas.length === 0) {
      tap('heavy');
      toast.error(`"${v}" não encontrada${isTodas ? '' : ' nesta obra'}`);
      return;
    }
    // Prioridade: quem está na etapa anterior (apta) → depois quem já está no destino (dup)
    const apta = candidatas.find(p => (p.etapa || 'aguardando').toLowerCase() === etapaAnterior && !apontadasRef.current.has(p.id));
    if (!apta) {
      const jaNoDestino = candidatas.find(p => (p.etapa || 'aguardando').toLowerCase() === destino || apontadasRef.current.has(p.id));
      if (jaNoDestino) {
        tap('light');
        toast(`${v} já apontada em ${labelDe(destino)}`, { icon: 'ℹ️' });
      } else {
        tap('heavy');
        toast.error(`${v} está em ${labelDe((candidatas[0].etapa || 'aguardando').toLowerCase())} — esperado: ${labelDe(etapaAnterior)}`);
      }
      return;
    }
    apontadasRef.current.add(apta.id);
    if (!isOnline()) {
      moverPecaEtapa?.(apta.id, destino, apontFunc || undefined)?.catch(() => {});
      enqueue('moverPecaEtapa', [apta.id, destino, apontFunc || null], `${apta.marca || apta.id} → ${labelDe(destino)}`);
      toast.success(`${apta.marca || apta.id} → ${labelDe(destino)} (offline)`);
      return;
    }
    moverPecaEtapa?.(apta.id, destino, apontFunc || undefined)
      .then(() => { success(); toast.success(`${apta.marca || apta.id} → ${labelDe(destino)}`); })
      .catch((err) => {
        apontadasRef.current.delete(apta.id); // permite re-bipar após falha
        toast.error(`Falha ao apontar ${apta.marca || apta.id}`);
        console.error('[ProducaoMobile] apontamento falhou:', err);
      });
  };

  return (
    <MobileLayout title="Produção" obraFilter>
      {/* Busca */}
      <div className="bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <SearchBar value={q} onChange={setQ} placeholder="Buscar marca ou ID..." />
      </div>

      {/* Resumo */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
          {totalConjuntos.toLocaleString('pt-BR')} conjuntos · {Object.values(porEtapa).reduce((s, v) => s + v.unidades, 0).toLocaleString('pt-BR')} un
        </div>
        {etapaSel && (
          <button onClick={() => setEtapaSel(null)} className="text-[11px] font-bold text-amber-400">Limpar filtro</button>
        )}
      </div>

      {/* Cards por etapa (tocar filtra a lista de peças) */}
      <div className="px-4 space-y-2">
        {ETAPAS.map(e => {
          const Icon = e.icon;
          const d = porEtapa[e.key] || { conjuntos: 0, unidades: 0, peso: 0 };
          const pct = totalConjuntos ? Math.round((d.conjuntos / totalConjuntos) * 100) : 0;
          const sel = etapaSel === e.key;
          return (
            <motion.button
              key={e.key}
              onClick={() => { setEtapaSel(sel ? null : e.key); tap('light'); }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className={`w-full text-left relative rounded-2xl border ${C_BG[e.color]} overflow-hidden ${sel ? 'ring-2 ring-amber-500/70' : ''}`}
            >
              <div className="p-3 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl ${C_BG[e.color]} border-2 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${C_TXT[e.color]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{e.label}</div>
                  <div className="text-[11px] text-slate-400">
                    {d.conjuntos} conjuntos · {d.unidades} un · {(d.peso / 1000).toFixed(1)} t
                  </div>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div className={`text-2xl font-black ${C_TXT[e.color]}`}>{pct}%</div>
                  <ChevronRight className={`w-4 h-4 transition ${sel ? 'rotate-90 text-amber-400' : 'text-slate-500'}`} />
                </div>
              </div>
              <div className="h-1 bg-slate-800">
                <div className={`h-full ${C_TXT[e.color].replace('text-', 'bg-')}`} style={{ width: pct + '%' }} />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Lista de peças (drill-down) */}
      {(etapaSel || qd.trim()) && (
        <div className="px-4 mt-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">
            {etapaSel ? `Peças em ${labelDe(etapaSel)}` : 'Resultado da busca'} · {listaPecas.length}
          </div>
          <div className="space-y-2">
            {listaPecas.length === 0 && (
              <EmptyState
                icon={Factory}
                title={etapaSel ? 'Nenhuma peça nesta etapa' : 'Nada encontrado'}
                subtitle={etapaSel ? 'Toque em outra etapa ou limpe o filtro' : 'Tente outro termo de busca'}
                actionLabel={etapaSel ? 'Limpar filtro' : (q ? 'Limpar busca' : undefined)}
                onAction={etapaSel ? (() => setEtapaSel(null)) : (q ? (() => setQ('')) : undefined)}
              />
            )}
            {listaPecas.slice(0, limite).map(p => {
              const np = proximaEtapa(p.etapa);
              return (
                <button
                  key={p.id}
                  onClick={() => abrirPeca(p)}
                  className="w-full text-left rounded-2xl border border-slate-800 bg-slate-900 p-3 flex items-center gap-3 active:scale-[.99] transition"
                >
                  <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center font-black text-amber-400 text-xs">
                    {(p.marca || '?').slice(0, 4)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{p.marca || p.id}</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {p.tipo || '—'} · qtd {p.quantidade || 1} · {(Number(p.peso) || 0).toFixed(0)} kg
                    </div>
                  </div>
                  {np ? (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-1 rounded-lg">
                      {labelDe(np)} <ArrowRight className="w-3 h-3" />
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-green-400 bg-green-500/15 px-2 py-1 rounded-lg">FINAL</span>
                  )}
                </button>
              );
            })}
            <LoadMore total={listaPecas.length} shown={limite} onMore={() => setLimite(l => l + 40)} />
          </div>
        </div>
      )}

      {/* Link para kanban completo */}
      <div className="px-4 mt-4">
        <Link to="/m/kanban" className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl active:scale-[.99] transition">
          <div>
            <div className="text-sm font-semibold">Ver Kanban completo</div>
            <div className="text-[11px] text-slate-400">Cards detalhados por etapa</div>
          </div>
          <ChevronRight className="w-5 h-5 text-amber-400" />
        </Link>
      </div>

      {/* FAB Apontar por bipagem (chão de fábrica) */}
      {podeApontar && (
        <button
          onClick={() => { tap('light'); setApontarOpen(true); }}
          className="fixed right-4 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full bg-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 active:scale-95 transition"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
        >
          <ScanLine className="w-5 h-5" /> Apontar
        </button>
      )}

      {/* SHEET de config do apontamento (estação + responsável) */}
      <Sheet
        open={apontarOpen}
        onClose={() => setApontarOpen(false)}
        title="Apontamento por bipagem"
        footer={
          <button
            onClick={iniciarBipagem}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm active:scale-[.99] transition"
          >
            <ScanLine className="w-5 h-5" /> Iniciar bipagem · {labelDe(destino)}
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Minha estação (etapa de destino)</div>
            <div className="grid grid-cols-2 gap-2">
              {DESTINOS.map(e => {
                const Icon = e.icon;
                const sel = destino === e.key;
                return (
                  <button
                    key={e.key}
                    onClick={() => { setDestino(e.key); tap('light'); }}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-bold transition active:scale-[.98] ${sel ? 'bg-amber-500/20 border-amber-500/60 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                  >
                    <Icon className="w-4 h-4" /> {e.label}
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-400 mt-2">
              Só avança peças que estão em <b>{labelDe(etapaAnterior)}</b>. Bipe errado não pula etapa.
            </div>
          </div>
          {funcionarios.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Responsável (opcional, vale p/ toda a sessão)</div>
              <select
                value={apontFunc}
                onChange={e => setApontFunc(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-amber-500/50"
              >
                <option value="">Sem responsável</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>{f.nome || f.id}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Sheet>

      {/* Scanner contínuo do apontamento */}
      <Scanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onResult={onScanApontamento}
        title={`Apontar → ${labelDe(destino)}`}
        continuous
      />

      {/* SHEET de avanço de etapa */}
      <Sheet
        open={!!pecaSel}
        onClose={fecharPeca}
        title={pecaSel ? (pecaSel.marca || pecaSel.id) : ''}
        footer={
          pecaSel && (
            !podeApontar ? (
              // Sem permissão de lançar avanço: somente visualização (viewer/financeiro).
              <div className="w-full text-center py-3 text-xs text-slate-400 font-semibold">Somente visualização — você não tem permissão para avançar etapas</div>
            ) : prox ? (
              <button
                onClick={avancar}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm active:scale-[.99] transition disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                {saving ? 'Salvando…' : `Avançar para ${labelDe(prox)}`}
              </button>
            ) : (
              <div className="w-full text-center py-3 text-sm text-green-400 font-semibold">Peça na etapa final do fluxo</div>
            )
          )
        }
      >
        {pecaSel && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Etapa atual" value={labelDe((pecaSel.etapa || 'aguardando').toLowerCase())} />
              <Info label="Quantidade" value={String(pecaSel.quantidade || 1)} />
              <Info label="Tipo" value={pecaSel.tipo || '—'} />
              <Info label="Peso" value={`${(Number(pecaSel.peso) || 0).toFixed(0)} kg`} />
            </div>
            {prox && funcionarios.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Responsável (opcional)</div>
                <select
                  value={funcId}
                  onChange={e => setFuncId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">Sem responsável</option>
                  {funcionarios.map(f => (
                    <option key={f.id} value={f.id}>{f.nome || f.id}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </MobileLayout>
  );
}

function Info({ label, value }) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
      <div className="text-sm font-bold text-slate-100 mt-0.5 truncate">{value}</div>
    </div>
  );
}
