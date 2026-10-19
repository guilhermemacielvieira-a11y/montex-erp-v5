// ============================================================
// Desempenho individual — eficiência por HORAS-PADRÃO (família × etapa)
// ============================================================
// Motor: services/bi/biDesempenho.js. Régua = modelo de horas-padrão (Hh/t)
// por família e etapa (faixas de mercado; ajustável). Eficiência = Hh-padrão
// produzidas ÷ horas disponíveis (dias úteis ativos × 8,8 h). O ritmo
// observado nos apontamentos aparece só como comparação.
// ============================================================
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Info, Save, Settings2, TrendingUp, TrendingDown, Minus, Scale, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { familiaDe, hhtPadrao, hhtObservado, grupoModelo, referenciaEtapas, configRotas, MODELO_HHT, MODELO_PADRAO, HORAS_DIA_PADRAO } from '@/services/bi/biDesempenho';

const ETAPAS = [
  { key: 'fabricacao', label: 'Fabricação', sub: 'corte, furação, montagem', cor: '#3b82f6' },
  { key: 'solda', label: 'Solda', sub: 'soldadores', cor: '#f97316' },
  { key: 'pintura', label: 'Pintura', sub: 'peça pronta', cor: '#a855f7' },
];
const ROT = Object.fromEntries(ETAPAS.map((e) => [e.key, e.label]));
const kg = (v) => `${(Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;
const n0 = (v) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const n1 = (v) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const FONTE = { modelo: 'modelo de referência', ajuste: 'ajuste manual', padrao: 'padrão (outros)', nao_aplica: 'não se aplica' };

const corEf = (v) => (v == null ? '#64748b' : v >= 90 ? '#22c55e' : v >= 60 ? '#eab308' : '#ef4444');

function BarraEficiencia({ valor }) {
  const v = valor == null ? 0 : Math.min(200, valor);
  return (
    <div className="flex items-center gap-2 min-w-[150px]">
      <div className="relative h-2 flex-1 bg-slate-700 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(v / 200) * 100}%`, background: corEf(valor) }} />
        <div className="absolute inset-y-0 w-px bg-white/70" style={{ left: '50%' }} title="100% = padrão de referência" />
      </div>
      <span className="text-sm font-semibold tabular-nums w-14 text-right" style={{ color: corEf(valor) }}>{valor == null ? '—' : `${n0(valor)}%`}</span>
    </div>
  );
}

function Sparkline({ pontos = [], cor = '#22c55e' }) {
  const vals = pontos.map((p) => p.hh || 0);
  const max = Math.max(1, ...vals);
  const w = 84; const h = 22;
  const pts = vals.map((v, i) => `${(i / Math.max(1, vals.length - 1)) * w},${h - (v / max) * (h - 2) - 1}`).join(' ');
  return <svg width={w} height={h} className="overflow-visible" aria-label="horas-padrão por semana"><polyline points={pts} fill="none" stroke={cor} strokeWidth="1.6" strokeLinejoin="round" /></svg>;
}

function Delta({ v }) {
  if (v == null) return <span className="text-xs text-slate-600">—</span>;
  const I = v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus;
  return <span className={cn('inline-flex items-center gap-0.5 text-xs tabular-nums', v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-slate-400')}><I className="h-3 w-3" />{v > 0 ? '+' : ''}{n0(v)} pp</span>;
}

export default function DesempenhoIndividual({ pessoas = [], removidos, familias = [], calib, cfg, cfgBruta, onSalvarCfg, salvando, rotPeriodo }) {
  const [medida, setMedida] = useState('hh');
  const [aberto, setAberto] = useState(null);
  const [mostrarCfg, setMostrarCfg] = useState(false);
  const [rascunho, setRascunho] = useState(null);
  const ref = useMemo(() => referenciaEtapas(pessoas), [pessoas]);
  const horasDia = cfg?.horasDia || HORAS_DIA_PADRAO;

  const editar = () => {
    setRascunho({
      semSolda: [...(cfgBruta?.semSolda || [])].map(familiaDe),
      hht: JSON.parse(JSON.stringify(cfgBruta?.hht || {})),
      horasDia: cfgBruta?.horasDia || HORAS_DIA_PADRAO,
    });
    setMostrarCfg(true);
  };
  const salvar = async () => {
    try { await onSalvarCfg(rascunho); toast.success('Modelo salvo — vale para todas as telas de produção'); setMostrarCfg(false); }
    catch (e) { toast.error(`Erro ao salvar: ${e?.message || e}`); }
  };
  const toggleSemSolda = (fam) => setRascunho((r) => ({ ...r, semSolda: r.semSolda.includes(fam) ? r.semSolda.filter((x) => x !== fam) : [...r.semSolda, fam] }));
  const setHht = (etapa, fam, v) => setRascunho((r) => {
    const hht = { ...r.hht, [etapa]: { ...(r.hht[etapa] || {}) } };
    const n = parseFloat(String(v).replace(',', '.'));
    if (n > 0) hht[etapa][fam] = n; else delete hht[etapa][fam];
    return { ...r, hht };
  });
  const cfgRasc = rascunho ? configRotas(rascunho) : cfg;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-400 flex gap-2">
        <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
        <span>
          <b className="text-slate-200">Régua = modelo de horas-padrão (Hh/t) por família e etapa</b>, com base nas faixas de mercado de fabricação de
          estrutura metálica (simples 8–15 Hh/t, típico 15–30, complexo/treliça 25–45; peças curtas custam mais por tonelada). Terça (vem no tamanho,
          só corte/furação) vale poucas horas por tonelada; tesoura, coluna e tirante valem mais. <b className="text-slate-200">Eficiência</b> = horas-padrão
          produzidas ÷ horas disponíveis ({n1(horasDia)} h por dia útil, a partir do 1º apontamento): <b className="text-slate-200">100% = entregou o padrão</b>.
          O ritmo observado nos apontamentos (com lote, espera e peça parada) fica só como comparação, até o sistema estar maduro.
        </span>
      </div>

      {removidos?.kg > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {kg(removidos.kg)} de "solda" em famílias sem solda ({removidos.pecas} peças) não contam como produção de solda — eram passagens obrigatórias do Kanban.
            {removidos.porPessoa?.length > 0 && <> Maiores: {removidos.porPessoa.slice(0, 4).map((p) => `${p.nome} ${kg(p.kg)}`).join(' · ')}.</>}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-lg border border-slate-700 overflow-hidden">
          {[['hh', 'Horas-padrão'], ['kg', 'kg real']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMedida(k)} className={cn('px-3 py-1.5 text-xs', medida === k ? 'bg-slate-600 text-white' : 'text-slate-300 hover:bg-slate-700/50')}>{l}</button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="border-slate-700 text-slate-200" onClick={mostrarCfg ? () => setMostrarCfg(false) : editar}>
          <Settings2 className="h-4 w-4 mr-1.5" />Modelo de horas-padrão (Hh/t) por família
        </Button>
      </div>

      {mostrarCfg && rascunho && (
        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2"><Scale className="h-4 w-4 text-sky-400" />Modelo de horas-padrão por família</h3>
              <p className="text-xs text-slate-500 mt-0.5">Hh por tonelada em cada etapa. Vazio = modelo de referência (cinza). "Observado" = o que os apontamentos indicam hoje (só comparação).</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 flex items-center gap-1.5">Horas por dia útil
                <input type="number" step="0.1" min="1" value={rascunho.horasDia} onChange={(e) => setRascunho((r) => ({ ...r, horasDia: e.target.value }))} className="w-16 h-7 rounded bg-slate-900 border border-slate-700 text-white px-1.5 text-xs" />
              </label>
              <Button size="sm" variant="ghost" className="text-slate-300" onClick={() => setRascunho((r) => ({ ...r, hht: {} }))} title="Voltar ao modelo de referência"><RotateCcw className="h-4 w-4 mr-1" />Modelo</Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={salvar} disabled={salvando}><Save className="h-4 w-4 mr-1.5" />{salvando ? 'Salvando…' : 'Salvar'}</Button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-800">
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="py-2 px-2 text-left">Família</th>
                  <th className="py-2 px-2 text-left">Grupo do modelo</th>
                  <th className="py-2 px-2 text-right">kg no período</th>
                  <th className="py-2 px-2 text-center">Sem solda</th>
                  {ETAPAS.map((e) => <th key={e.key} className="py-2 px-2 text-left">{e.label} (Hh/t)</th>)}
                </tr>
              </thead>
              <tbody>
                {familias.map((f) => {
                  const semSolda = rascunho.semSolda.includes(f.familia);
                  const g = grupoModelo(f.familia);
                  return (
                    <tr key={f.familia} className="border-b border-slate-800">
                      <td className="py-1.5 px-2 text-white">{f.rotulo}</td>
                      <td className="py-1.5 px-2 text-slate-400" title={g.descricao}>{g.grupo}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300 tabular-nums">{n0(f.fabricacao + f.solda + f.pintura)}</td>
                      <td className="py-1.5 px-2 text-center"><input type="checkbox" checked={semSolda} onChange={() => toggleSemSolda(f.familia)} className="accent-amber-500" /></td>
                      {ETAPAS.map((e) => {
                        const ref2 = hhtPadrao(e.key, f.familia, cfgRasc);
                        if (ref2.fonte === 'nao_aplica') return <td key={e.key} className="py-1.5 px-2 text-slate-600">não se aplica</td>;
                        const modelo = (grupoModelo(f.familia).hht[e.key] ?? MODELO_PADRAO.hht[e.key]);
                        const obs = hhtObservado(e.key, f.familia, calib, cfgRasc);
                        return (
                          <td key={e.key} className="py-1.5 px-2">
                            <div className="flex items-center gap-1.5">
                              <input type="number" min="0" step="0.5" placeholder={n1(modelo)} value={rascunho.hht?.[e.key]?.[f.familia] ?? ''}
                                onChange={(ev) => setHht(e.key, f.familia, ev.target.value)}
                                className={cn('w-16 h-7 rounded bg-slate-900 border px-1.5 text-xs', rascunho.hht?.[e.key]?.[f.familia] ? 'border-sky-500 text-sky-200' : 'border-slate-700 text-white')} />
                              <span className="text-[10px] text-slate-500" title="Hh/t que os apontamentos indicam hoje (lote/espera distorcem)">{obs ? `obs. ${n1(obs.hht)} (${obs.dias}d)` : 'obs. —'}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <details className="mt-3 text-xs text-slate-400">
            <summary className="cursor-pointer text-slate-300">Modelo de referência (Hh/t)</summary>
            <table className="mt-2 text-xs">
              <thead><tr className="text-slate-500"><th className="text-left pr-4 py-1">Grupo</th><th className="text-left pr-4">Descrição</th><th className="text-right pr-4">Fabricação</th><th className="text-right pr-4">Solda</th><th className="text-right">Pintura</th></tr></thead>
              <tbody>
                {[...MODELO_HHT, MODELO_PADRAO].map((g) => (
                  <tr key={g.grupo}><td className="pr-4 py-0.5 text-slate-200">{g.grupo}</td><td className="pr-4">{g.descricao}</td>
                    {['fabricacao', 'solda', 'pintura'].map((et) => <td key={et} className="text-right pr-4 tabular-nums">{g.hht[et] == null ? '—' : n1(g.hht[et])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      )}

      {ETAPAS.map((e) => {
        const grupo = pessoas.filter((p) => p.etapaPrincipal === e.key).sort((a, b) => b.eficiencia - a.eficiencia);
        if (!grupo.length) return null;
        const r = ref[e.key];
        return (
          <div key={e.key} className="bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="px-4 pt-4 pb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: e.cor }} />{e.label}<span className="text-xs text-slate-500 font-normal">· {e.sub}</span></h3>
                <p className="text-xs text-slate-500 mt-0.5">{rotPeriodo} · eficiência mediana dos {r.regulares} regulares: {n0(r.medianaEficiencia)}%</p>
              </div>
              <span className="text-xs text-slate-400">Etapa: <b className="text-white">{n0(r.hh)} Hh-padrão</b> · {kg(r.kg)}</span>
            </div>
            <div className="overflow-x-auto px-2 pb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-700">
                    {['', 'Funcionário', 'Eficiência', 'vs equipe', medida === 'hh' ? 'Hh-padrão' : 'kg real', 'Horas disp.', 'Hh/t do mix', 'Unid.', 'Peças', 'Família principal', '8 semanas', 'vs anterior'].map((h, i) => (
                      <th key={h || i} className={cn('py-2 px-2 font-medium whitespace-nowrap', i >= 3 && i !== 9 && i !== 10 ? 'text-right' : 'text-left')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grupo.map((p) => (
                    <React.Fragment key={p.id}>
                      <tr className="border-b border-slate-800 hover:bg-slate-700/30 cursor-pointer" onClick={() => setAberto(aberto === p.id ? null : p.id)}>
                        <td className="py-2 px-2 text-slate-500 w-6">{aberto === p.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                        <td className="py-2 px-2 min-w-[200px]">
                          <p className="text-white">{p.posicao}º · {p.nome}{p.ocasional && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300" title="Menos de 5% do trabalho da etapa — não entra na mediana da equipe">ocasional</span>}</p>
                          <p className="text-xs text-slate-500">{[p.cargo, p.equipe].filter(Boolean).join(' · ')} · {p.diasApontados} dia(s) com apontamento</p>
                        </td>
                        <td className="py-2 px-2"><BarraEficiencia valor={p.eficiencia} /></td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300" title="Eficiência ÷ mediana dos regulares da etapa">{p.vsEquipe == null ? '—' : n0(p.vsEquipe)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-white font-semibold">{medida === 'hh' ? n1(p.hh) : n0(p.kg)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300" title={`${p.diasUteis} dias úteis × ${n1(horasDia)} h`}>{n0(p.horasDisp)} h</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300" title="Horas-padrão por tonelada do que a pessoa fez: maior = mix mais trabalhoso">{p.hhtMedio != null ? n1(p.hhtMedio) : '—'}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{n0(p.unidades)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{p.pecas}</td>
                        <td className="py-2 px-2 text-slate-300 whitespace-nowrap">{p.familiaPrincipal || '—'}</td>
                        <td className="py-2 px-2"><Sparkline pontos={p.tendencia} cor={e.cor} /></td>
                        <td className="py-2 px-2 text-right"><Delta v={p.variacao} /></td>
                      </tr>
                      {aberto === p.id && (
                        <tr className="bg-slate-900/40">
                          <td />
                          <td colSpan={11} className="py-3 px-2">
                            <p className="text-xs text-slate-400 mb-2">O que {p.nome.split(' ')[0]} produziu no período, por etapa e família:</p>
                            <table className="w-full text-xs">
                              <thead><tr className="text-slate-500 border-b border-slate-700">
                                {['Etapa', 'Família', 'Grupo do modelo', 'kg real', 'Hh/t', 'Hh-padrão', '% do trabalho', 'Unid.', 'Peças', 'Fonte'].map((h, i) => <th key={h} className={cn('py-1.5 px-2 font-medium', i >= 3 && i !== 9 ? 'text-right' : 'text-left')}>{h}</th>)}
                              </tr></thead>
                              <tbody>
                                {p.porFamilia.map((f) => (
                                  <tr key={`${f.etapa}-${f.familia}`} className="border-b border-slate-800/60">
                                    <td className="py-1.5 px-2 text-slate-300">{ROT[f.etapa]}</td>
                                    <td className="py-1.5 px-2 text-white">{f.rotulo}</td>
                                    <td className="py-1.5 px-2 text-slate-400">{f.grupo}</td>
                                    <td className="py-1.5 px-2 text-right tabular-nums text-slate-300">{n0(f.kg)}</td>
                                    <td className="py-1.5 px-2 text-right tabular-nums text-slate-300">{f.hht == null ? '—' : n1(f.hht)}</td>
                                    <td className="py-1.5 px-2 text-right tabular-nums text-white">{n1(f.hh)}</td>
                                    <td className="py-1.5 px-2 text-right tabular-nums text-slate-300">{n0(f.pctTrabalho)}%</td>
                                    <td className="py-1.5 px-2 text-right tabular-nums text-slate-300">{n0(f.unidades)}</td>
                                    <td className="py-1.5 px-2 text-right tabular-nums text-slate-300">{f.pecas}</td>
                                    <td className="py-1.5 px-2 text-slate-500">{FONTE[f.fonte]}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {!pessoas.length && <p className="text-center text-sm text-slate-500 py-8">Nenhum apontamento no período.</p>}
    </div>
  );
}
