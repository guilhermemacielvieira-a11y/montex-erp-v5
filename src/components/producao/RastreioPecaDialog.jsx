// ============================================================
// Rastreio de peça — busca por marca e mostra o fluxo completo
// ============================================================
// Corte → Fabricação → Solda → Pintura → Carregamento → Entrega → Montagem,
// com datas, funcionários, romaneio e a linha do tempo dos apontamentos.
// Dados: hooks/useRastreioPeca → services/rastreioPeca (motor testado).
// ============================================================
import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Loader2, Scissors, Wrench, Zap, Paintbrush, Truck, MapPin, HardHat, Undo2, Package, X,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useRastreioPeca } from '@/hooks/useRastreioPeca';
import { sugerirMarcas, ETAPAS_RASTREIO } from '@/services/rastreioPeca';
import { cn } from '@/lib/utils';

const fmtData = (d) => (d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—');
const fmtKg = (v) => `${Math.round(Number(v) || 0).toLocaleString('pt-BR')} kg`;
const curtoId = (id) => String(id).replace(/__split_(\w+?)_\d+_(\d+)$/, ' · dividida $2');

const ESTILO = {
  corte: { icon: Scissors, cor: '#f59e0b' },
  fabricacao: { icon: Wrench, cor: '#3b82f6' },
  solda: { icon: Zap, cor: '#8b5cf6' },
  pintura: { icon: Paintbrush, cor: '#ec4899' },
  carregamento: { icon: Truck, cor: '#f97316' },
  entrega: { icon: MapPin, cor: '#eab308' },
  montagem: { icon: HardHat, cor: '#22c55e' },
  retorno: { icon: Undo2, cor: '#ef4444' },
};

function Marco({ etapa, m }) {
  const { icon: Icon, cor } = ESTILO[etapa.key];
  const feito = m?.feito ?? 0;
  const total = m?.total ?? 0;
  const completo = m?.naoAplica || (total > 0 && feito >= total);
  const parcial = !completo && (feito > 0 || m?.inicio);
  const datas = m?.inicio ? (m.fim && m.fim - m.inicio > 0 ? `${fmtData(m.inicio)} → ${fmtData(m.fim)}` : fmtData(m.inicio)) : null;
  return (
    <div className={cn('min-w-[118px] flex-1 rounded-lg border px-3 py-2',
      completo ? 'border-emerald-500/40 bg-emerald-500/10' : parcial ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-700 bg-slate-900/60')}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
        <Icon className="h-3.5 w-3.5" style={{ color: cor }} />{etapa.rotulo}
      </div>
      <div className={cn('mt-1 text-sm font-semibold', completo ? 'text-emerald-300' : parcial ? 'text-amber-300' : 'text-slate-500')}>
        {m?.naoAplica ? 'Não se aplica' : datas || (parcial ? 'sem data' : 'pendente')}
      </div>
      {!m?.naoAplica && total > 0 && (
        <div className="text-[10px] text-slate-400">
          {etapa.key === 'corte' ? `${feito}/${total} posição(ões)` : `${feito}/${total} un`}
        </div>
      )}
    </div>
  );
}

function CelulaEtapa({ e }) {
  if (!e) return <span className="text-slate-600">—</span>;
  if (e.naoAplica) return <span className="text-slate-400 italic">não se aplica</span>;
  return (
    <div>
      <div className="text-slate-200">{fmtData(e.data)}</div>
      {e.funcionario && <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{e.funcionario}</div>}
    </div>
  );
}

function BlocoObra({ b }) {
  const [verTudo, setVerTudo] = useState(false);
  const eventos = verTudo ? b.eventos : b.eventos.slice(-12);
  return (
    <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">{b.marca}</span>
            <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-200">{b.tipo || '—'}</span>
          </div>
          <div className="text-sm text-slate-400">{b.obraNome}{b.perfil ? ` · ${b.perfil}` : ''}</div>
        </div>
        <div className="text-right text-sm">
          <div className="text-slate-200"><b>{b.qtdTotal}</b> un · {fmtKg(b.kgTotal)}</div>
          <div className="text-[11px] text-slate-400">
            {Object.entries(b.porEtapa).map(([e, q]) => `${q} ${e}`).join(' · ')}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ETAPAS_RASTREIO.map((e) => <Marco key={e.key} etapa={e} m={b.marcos[e.key]} />)}
      </div>

      {/* Unidades */}
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Unidades</div>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full min-w-[860px] text-xs">
            <thead className="bg-slate-900 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2 text-left">Peça</th>
                <th className="px-2 py-2 text-left">Etapa atual</th>
                <th className="px-2 py-2 text-left">Fabricação</th>
                <th className="px-2 py-2 text-left">Solda</th>
                <th className="px-2 py-2 text-left">Pintura</th>
                <th className="px-2 py-2 text-left">Carregamento</th>
                <th className="px-2 py-2 text-left">Entrega</th>
                <th className="px-2 py-2 text-left">Montagem</th>
              </tr>
            </thead>
            <tbody>
              {b.unidades.map((u) => (
                <tr key={u.pecaId} className="border-t border-slate-800 align-top">
                  <td className="px-2 py-2">
                    <div className="font-mono text-slate-200">{curtoId(u.pecaId)}</div>
                    <div className="text-[10px] text-slate-500">{u.qtd} un · {fmtKg(u.kg)}</div>
                  </td>
                  <td className="px-2 py-2 text-slate-200">{u.etapaRotulo}</td>
                  <td className="px-2 py-2"><CelulaEtapa e={u.etapas.fabricacao} /></td>
                  <td className="px-2 py-2"><CelulaEtapa e={u.etapas.solda} /></td>
                  <td className="px-2 py-2"><CelulaEtapa e={u.etapas.pintura} /></td>
                  <td className="px-2 py-2">
                    {u.carga ? (
                      <div>
                        <div className="text-slate-200">{fmtData(u.carga.dataSaida || u.carga.dataExpedicao)}</div>
                        <div className="text-[10px] text-orange-300">{u.carga.numero}</div>
                        {(u.carga.motorista || u.carga.placa) && <div className="text-[10px] text-slate-400">{[u.carga.motorista, u.carga.placa].filter(Boolean).join(' · ')}</div>}
                      </div>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-2 py-2">
                    {u.carga?.status === 'entregue' ? <span className="text-slate-200">{fmtData(u.carga.dataEntrega)}</span>
                      : u.carga ? <span className="text-amber-300">{u.carga.status.replace(/_/g, ' ')}</span> : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-2 py-2">
                    {u.montado ? <span className="text-emerald-300">{u.montado.data ? fmtData(u.montado.data) : u.montado.texto || 'montada'}</span> : <span className="text-slate-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Linha do tempo */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
            Linha do tempo ({b.eventos.length})
            {b.apontamentosBrutos > b.apontamentos && (
              <span className="font-normal normal-case text-slate-500">{b.apontamentosBrutos - b.apontamentos} apontamento(s) repetido(s) agrupado(s)</span>
            )}
          </div>
          {b.eventos.length === 0 ? (
            <div className="text-sm text-slate-500">Nenhum apontamento registrado para esta marca.</div>
          ) : (
            <ol className="relative space-y-2 border-l border-slate-700 pl-4">
              {b.eventos.length > eventos.length && (
                <button type="button" onClick={() => setVerTudo(true)} className="text-[11px] text-sky-400 hover:underline">
                  ver os {b.eventos.length - eventos.length} eventos anteriores
                </button>
              )}
              {eventos.map((ev, i) => {
                const { icon: Icon, cor } = ESTILO[ev.tipo] || ESTILO.fabricacao;
                return (
                  <li key={i} className="relative">
                    <span className="absolute -left-[23px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 ring-1 ring-slate-700">
                      <Icon className="h-2.5 w-2.5" style={{ color: cor }} />
                    </span>
                    <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
                      <span className="font-mono text-slate-400">{fmtData(ev.data)}</span>
                      <span className="font-medium text-slate-100">{ev.titulo}</span>
                      {ev.qtd ? <span className="text-slate-400">{ev.qtd} un</span> : null}
                    </div>
                    {(ev.funcionario || ev.detalhe) && (
                      <div className="text-[11px] text-slate-400">{[ev.funcionario, ev.detalhe].filter(Boolean).join(' · ')}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Corte das posições */}
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Posições de corte ({b.corte.length})</div>
          {b.corte.length === 0 ? (
            <div className="text-xs text-slate-500">Sem posição de corte ligada a esta marca (importe a composição no Kanban de Corte).</div>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {b.corte.map((c) => (
                <div key={c.id} className={cn('flex items-center justify-between rounded px-2 py-1 text-xs', c.status === 'cortado' ? 'bg-emerald-500/10' : 'bg-slate-800/60')}>
                  <div>
                    <span className="font-mono text-slate-100">POS {c.pos}</span>
                    <span className="ml-1 text-slate-400">{c.perfil}</span>
                  </div>
                  <div className="text-right">
                    <div className={c.status === 'cortado' ? 'text-emerald-300' : c.status === 'cortando' ? 'text-sky-300' : 'text-amber-300'}>
                      {c.status === 'cortado' ? (c.dataFim ? fmtData(c.dataFim) : c.historico ? 'cortado (histórico)' : 'cortado') : c.status}
                    </div>
                    {c.funcionario && <div className="text-[10px] text-slate-400">{c.funcionario}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * @param {object} p
 * @param {boolean} p.open
 * @param {(v:boolean)=>void} p.onOpenChange
 * @param {string} [p.marcaInicial]
 * @param {Array} p.pecas         peças do app (sugestões do campo)
 * @param {Array|null} p.obraIds  escopo do topo
 */
export default function RastreioPecaDialog({ open, onOpenChange, marcaInicial = '', pecas = [], obraIds = null, funcionarios = [], obras = [] }) {
  const [termo, setTermo] = useState(marcaInicial);
  const [marca, setMarca] = useState(marcaInicial);
  useEffect(() => { if (open) { setTermo(marcaInicial); setMarca(marcaInicial); } }, [open, marcaInicial]);

  const sugestoes = useMemo(() => (termo && termo.trim().toUpperCase() !== String(marca).toUpperCase() ? sugerirMarcas(pecas, termo) : []), [pecas, termo, marca]);
  const { blocos, carregando, erro } = useRastreioPeca(open ? marca : '', { obraIds, funcionarios, obras });

  const buscar = (m) => { const v = String(m || termo).trim(); if (v) { setTermo(v); setMarca(v); } };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-6xl overflow-y-auto overflow-x-hidden border-slate-700 bg-slate-950 p-4 text-slate-100 sm:p-6 [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-sky-400" />Rastreio de peça</DialogTitle>
          <DialogDescription className="text-slate-400">
            Fluxo completo da marca: corte, fabricação, solda, pintura, carregamento, entrega e montagem — com datas e responsáveis.
          </DialogDescription>
        </DialogHeader>

        <form className="relative" onSubmit={(e) => { e.preventDefault(); buscar(); }}>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            autoFocus
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Digite a marca (ex.: TS55A) e Enter"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-9 text-sm text-white outline-none focus:border-sky-500"
          />
          {termo && (
            <button type="button" aria-label="Limpar" onClick={() => { setTermo(''); setMarca(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>
          )}
          {sugestoes.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
              {sugestoes.map((s) => (
                <button key={s.marca} type="button" onClick={() => buscar(s.marca)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-800">
                  <span><b className="text-white">{s.marca}</b> <span className="text-slate-400">{s.tipo}</span></span>
                  <span className="text-xs text-slate-500">{s.qtd} un{s.obras > 1 ? ` · ${s.obras} obras` : ''}</span>
                </button>
              ))}
            </div>
          )}
        </form>

        {carregando && <div className="flex items-center gap-2 py-6 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Buscando o fluxo de {marca}…</div>}
        {erro && <div className="text-sm text-red-400">{erro}</div>}
        {!carregando && marca && !erro && blocos.length === 0 && (
          <div className="py-6 text-sm text-slate-400">Nenhuma peça com a marca <b className="text-slate-200">{marca}</b>{obraIds ? ' nas obras do escopo selecionado no topo' : ''}.</div>
        )}
        {!carregando && blocos.length > 1 && (
          <div className="text-xs text-amber-300">A marca {marca} existe em {blocos.length} obras — cada uma aparece separada abaixo.</div>
        )}
        {!carregando && blocos.map((b) => <BlocoObra key={b.obraId} b={b} />)}
      </DialogContent>
    </Dialog>
  );
}
