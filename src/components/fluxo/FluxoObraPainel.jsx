// ============================================================
// Painel do fluxo integrado da obra
// ============================================================
// Necessário (lista de posições) → Estoque → Corte (baixa) → Marcas
// liberadas → Fabricação → Solda → Pintura → Expedido → Enviado.
// Mesmo motor (services/fluxoIntegrado.js) no Corte e no Kanban de Produção.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, ArrowRight, AlertTriangle, PackagePlus } from 'lucide-react';
import { pipelineObra } from '@/services/fluxoIntegrado';
import { createPageUrl } from '@/utils';

const kg = (v) => `${Math.round(Number(v) || 0).toLocaleString('pt-BR')} kg`;
const t = (v) => {
  const n = Number(v) || 0;
  return n >= 10000 ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t` : kg(n);
};

function Estagio({ titulo, valor, sub, cor, alerta }) {
  return (
    <div className="min-w-[112px] flex-1 rounded-lg border border-slate-700/60 bg-slate-900/70 px-3 py-2" style={{ borderTop: `3px solid ${cor}` }}>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{titulo}</div>
      <div className="text-base font-bold" style={{ color: cor }}>{valor}</div>
      {sub && <div className={`text-[10px] ${alerta ? 'text-amber-400' : 'text-slate-500'}`}>{sub}</div>}
    </div>
  );
}

/**
 * @param {object} p
 * @param {object} p.abastecimento  resultado de abastecimentoCorte
 * @param {Map}    p.liberacao      resultado de liberacaoMarcas (por marca)
 * @param {Array}  p.pecas          pecas_producao do escopo
 * @param {boolean} [p.compacto]
 */
export default function FluxoObraPainel({ abastecimento, liberacao, pecas = [], compacto = false, semComposicaoTabela = false }) {
  const [aberto, setAberto] = useState(false);
  const p = useMemo(() => pipelineObra({ abastecimento, liberacao, pecas }), [abastecimento, liberacao, pecas]);
  const chaves = abastecimento?.chaves || [];
  const comFalta = chaves.filter((c) => c.falta_kg > 0.5);
  const e = p.etapasKg;

  const estagios = [
    { titulo: 'Necessário', valor: t(p.necessarioKg), sub: 'lista de posições', cor: '#94a3b8' },
    p.estimado
      ? { titulo: 'Estoque disp.', valor: '—', sub: 'não consultado', cor: '#38bdf8' }
      : { titulo: 'Estoque disp.', valor: t(p.estoqueDisponivelKg), sub: p.faltaComprarKg > 0.5 ? `falta ${t(p.faltaComprarKg)}` : 'cobre o corte', cor: '#38bdf8', alerta: p.faltaComprarKg > 0.5 },
    { titulo: 'A cortar', valor: t(p.aCortarKg), sub: p.estimado ? `${chaves.length} perfil(is)` : `${t(p.abastecidoKg)} abastecido`, cor: '#f59e0b' },
    {
      titulo: 'Cortado', valor: t(p.cortadoKg), cor: '#a78bfa',
      sub: p.corteRegistradoKg != null && (p.corteProducaoKg + p.corteEstimadoKg) > 0.5
        ? `${t(p.corteRegistradoKg)} apontado · ${t(p.corteProducaoKg + p.corteEstimadoKg)} pela produção`
        : 'apontado no corte',
    },
    { titulo: 'Liberado p/ fab.', valor: t(p.liberadasKg), sub: `${p.marcasLiberadas} marca(s)${p.semComposicaoKg > 0.5 ? ` · ${t(p.semComposicaoKg)} sem composição` : ''}`, cor: '#22c55e', alerta: p.semComposicaoKg > 0.5 },
    { titulo: 'Fabricação', valor: t(e.fabricacao), cor: '#3b82f6' },
    { titulo: 'Solda', valor: t(e.solda), cor: '#f97316' },
    { titulo: 'Pintura', valor: t(e.pintura), cor: '#a855f7' },
    { titulo: 'Expedido', valor: t(e.expedido), sub: 'fila de embarque', cor: '#eab308' },
    { titulo: 'Enviado', valor: t((e.enviado || 0) + (e.entregue || 0)), sub: 'em obra', cor: '#22c55e' },
  ];

  return (
    <div className="mb-4 rounded-xl border border-slate-700/60 bg-slate-950/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-200">
          Fluxo integrado da obra
          {p.estimado && <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-normal text-amber-300">estoque não consultado (estimado)</span>}
        </div>
        {!compacto && chaves.length > 0 && (
          <button type="button" onClick={() => setAberto((v) => !v)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200">
            {aberto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Material por perfil ({chaves.length}){comFalta.length > 0 && <span className="ml-1 text-amber-400">· {comFalta.length} com falta</span>}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-stretch gap-1.5">
        {estagios.map((s, i) => (
          <React.Fragment key={s.titulo}>
            <Estagio {...s} />
            {i < estagios.length - 1 && <ArrowRight className="hidden h-4 w-4 self-center text-slate-600 xl:block" />}
          </React.Fragment>
        ))}
      </div>

      {semComposicaoTabela && (
        <div className="mt-2 text-[11px] text-amber-300">Composição marca × posição ainda não disponível no banco — marcas compostas aparecem como "sem composição".</div>
      )}

      {aberto && !compacto && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-left text-[10px] uppercase text-slate-500">
                <th className="py-1.5 pr-2">Perfil · material</th>
                <th className="py-1.5 pr-2 text-right">Necessário</th>
                <th className="py-1.5 pr-2 text-right">Cortado</th>
                <th className="py-1.5 pr-2 text-right">A cortar</th>
                <th className="py-1.5 pr-2 text-right">Estoque disp.</th>
                <th className="py-1.5 pr-2 text-right">Falta</th>
                <th className="py-1.5 pr-2">Cobertura</th>
              </tr>
            </thead>
            <tbody>
              {chaves.map((c) => (
                <tr key={c.chave} className="border-b border-slate-800/70">
                  <td className="py-1.5 pr-2 text-slate-200">{c.perfil} <span className="text-slate-500">· {c.material || '—'}</span></td>
                  <td className="py-1.5 pr-2 text-right text-slate-300">{kg(c.necessario_kg)}</td>
                  <td className="py-1.5 pr-2 text-right text-violet-300">{kg(c.cortado_kg)}</td>
                  <td className="py-1.5 pr-2 text-right text-amber-300">{kg(c.a_cortar_kg)}</td>
                  <td className="py-1.5 pr-2 text-right text-sky-300">{c.cobertura == null ? '—' : kg(c.disponivel_kg)} {c.cobertura != null && <span className="text-[10px] text-slate-500">{c.origem_estoque === 'obra' ? 'obra' : 'fábrica'}</span>}</td>
                  <td className={`py-1.5 pr-2 text-right font-semibold ${c.falta_kg > 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>{c.cobertura == null ? '—' : c.falta_kg > 0.5 ? kg(c.falta_kg) : 'ok'}</td>
                  <td className="py-1.5 pr-2">
                    {c.cobertura != null && (
                      <div className="h-1.5 w-24 overflow-hidden rounded bg-slate-800">
                        <div className="h-full" style={{ width: `${Math.round(c.cobertura * 100)}%`, background: c.cobertura >= 1 ? '#22c55e' : c.cobertura > 0 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {comFalta.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              Material sem saldo no estoque da obra: lance a entrada (compra/NF) antes de cortar.
              <Link to={createPageUrl('EstoquePageV2')} className="inline-flex items-center gap-1 rounded border border-sky-500/40 px-2 py-0.5 text-sky-300 hover:bg-sky-500/10">
                <PackagePlus className="h-3.5 w-3.5" /> Ir para o Estoque
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
