// ============================================================
// Desempenho individual — índice por trabalho-padrão (família × etapa)
// ============================================================
// Motor: services/bi/biDesempenho.js. Cada pessoa é comparada com os colegas
// da MESMA etapa principal, em kg equivalente (kg × fator de esforço da
// família), por dia útil ativo. 100 = mediana dos produtores regulares.
// ============================================================
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Info, Save, Settings2, TrendingUp, TrendingDown, Minus, Scale, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { familiaDe, fatorEsforco, ritmoPadrao, referenciaEtapas, FATOR_MIN, FATOR_MAX } from '@/services/bi/biDesempenho';

const ETAPAS = [
  { key: 'fabricacao', label: 'Fabricação', sub: 'corte, furação, montagem', cor: '#3b82f6' },
  { key: 'solda', label: 'Solda', sub: 'soldadores', cor: '#f97316' },
  { key: 'pintura', label: 'Pintura', sub: 'peça pronta', cor: '#a855f7' },
];
const ROT = Object.fromEntries(ETAPAS.map((e) => [e.key, e.label]));
const kg = (v) => `${(Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`;
const n0 = (v) => (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const n2 = (v) => (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FONTE = { dados: 'calculado dos dados', ajuste: 'ajuste manual', geral: 'ritmo geral da etapa (pouca amostra)' };

function corIndice(i) {
  if (i == null) return '#64748b';
  if (i >= 115) return '#22c55e';
  if (i >= 85) return '#eab308';
  return '#ef4444';
}

function BarraIndice({ valor }) {
  const v = valor == null ? 0 : Math.min(250, valor);
  return (
    <div className="flex items-center gap-2 min-w-[150px]">
      <div className="relative h-2 flex-1 bg-slate-700 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(v / 250) * 100}%`, background: corIndice(valor) }} />
        <div className="absolute inset-y-0 w-px bg-white/70" style={{ left: '40%' }} title="100 = mediana da etapa" />
      </div>
      <span className="text-sm font-semibold tabular-nums w-12 text-right" style={{ color: corIndice(valor) }}>{valor == null ? '—' : n0(valor)}</span>
    </div>
  );
}

function Sparkline({ pontos = [], cor = '#22c55e' }) {
  const vals = pontos.map((p) => p.kgEq || 0);
  const max = Math.max(1, ...vals);
  const w = 84; const h = 22;
  const pts = vals.map((v, i) => `${(i / Math.max(1, vals.length - 1)) * w},${h - (v / max) * (h - 2) - 1}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible" aria-label="kg equivalente por semana">
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function Delta({ v }) {
  if (v == null) return <span className="text-xs text-slate-600">—</span>;
  const I = v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus;
  return <span className={cn('inline-flex items-center gap-0.5 text-xs tabular-nums', v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-slate-400')}><I className="h-3 w-3" />{v > 0 ? '+' : ''}{n0(v)}</span>;
}

export default function DesempenhoIndividual({ pessoas = [], removidos, familias = [], calib, cfg, cfgBruta, onSalvarCfg, salvando, rotPeriodo }) {
  const [medida, setMedida] = useState('kgEq');
  const [aberto, setAberto] = useState(null);
  const [mostrarCfg, setMostrarCfg] = useState(false);
  const [rascunho, setRascunho] = useState(null);
  const ref = useMemo(() => referenciaEtapas(pessoas), [pessoas]);

  const editar = () => {
    setRascunho({ semSolda: [...(cfgBruta?.semSolda || [])].map(familiaDe), ritmos: JSON.parse(JSON.stringify(cfgBruta?.ritmos || {})) });
    setMostrarCfg(true);
  };
  const salvar = async () => {
    try { await onSalvarCfg(rascunho); toast.success('Rotas e ritmos salvos — valem para todas as telas de produção'); setMostrarCfg(false); }
    catch (e) { toast.error(`Erro ao salvar: ${e?.message || e}`); }
  };
  const toggleSemSolda = (fam) => setRascunho((r) => ({ ...r, semSolda: r.semSolda.includes(fam) ? r.semSolda.filter((x) => x !== fam) : [...r.semSolda, fam] }));
  const setRitmo = (etapa, fam, v) => setRascunho((r) => {
    const ritmos = { ...r.ritmos, [etapa]: { ...(r.ritmos[etapa] || {}) } };
    const n = parseFloat(String(v).replace(',', '.'));
    if (n > 0) ritmos[etapa][fam] = n; else delete ritmos[etapa][fam];
    return { ...r, ritmos };
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-400 flex gap-2">
        <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
        <span>
          <b className="text-slate-200">Por que não comparar só por kg:</b> 1 kg de terça (vem no tamanho, só furação) não é o mesmo esforço que 1 kg de coluna ou
          tirante (corte, furo, montagem, solda). Cada família tem um <b className="text-slate-200">ritmo-padrão</b> (kg por pessoa-dia, calculado dos próprios
          apontamentos) e vira <b className="text-slate-200">kg equivalente</b> = kg × fator de esforço. O <b className="text-slate-200">índice</b> compara a
          pessoa com os colegas da mesma etapa, por dia útil: <b className="text-slate-200">100 = mediana da equipe</b>, 120 = 20% acima.
          Famílias "sem solda" (terça) não contam na Solda.
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
          {[['kgEq', 'kg equivalente'], ['kg', 'kg real']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMedida(k)} className={cn('px-3 py-1.5 text-xs', medida === k ? 'bg-slate-600 text-white' : 'text-slate-300 hover:bg-slate-700/50')}>{l}</button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="border-slate-700 text-slate-200" onClick={mostrarCfg ? () => setMostrarCfg(false) : editar}>
          <Settings2 className="h-4 w-4 mr-1.5" />Rotas e ritmo-padrão por família
        </Button>
      </div>

      {mostrarCfg && rascunho && (
        <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2"><Scale className="h-4 w-4 text-sky-400" />Rotas e ritmo-padrão por família</h3>
              <p className="text-xs text-slate-500 mt-0.5">Marque as famílias que não passam por solda. O ritmo (kg por pessoa-dia) vem dos dados; preencha só para ajustar. Fator limitado a {n2(FATOR_MIN)}–{n2(FATOR_MAX)}.</p>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={salvar} disabled={salvando}><Save className="h-4 w-4 mr-1.5" />{salvando ? 'Salvando…' : 'Salvar'}</Button>
          </div>
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-800">
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="py-2 px-2 text-left">Família</th>
                  <th className="py-2 px-2 text-right">kg no período</th>
                  <th className="py-2 px-2 text-center">Sem solda</th>
                  {ETAPAS.map((e) => <th key={e.key} className="py-2 px-2 text-left">{e.label}: ritmo kg/dia → fator</th>)}
                </tr>
              </thead>
              <tbody>
                {familias.map((f) => {
                  const semSolda = rascunho.semSolda.includes(f.familia);
                  return (
                    <tr key={f.familia} className="border-b border-slate-800">
                      <td className="py-1.5 px-2 text-white">{f.rotulo}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300 tabular-nums">{n0(f.fabricacao + f.solda + f.pintura)}</td>
                      <td className="py-1.5 px-2 text-center"><input type="checkbox" checked={semSolda} onChange={() => toggleSemSolda(f.familia)} className="accent-amber-500" /></td>
                      {ETAPAS.map((e) => {
                        if (e.key === 'solda' && semSolda) return <td key={e.key} className="py-1.5 px-2 text-slate-600">não se aplica</td>;
                        const cfgR = { ...cfg, ritmos: rascunho.ritmos };
                        const rp = ritmoPadrao(e.key, f.familia, calib, cfgR);
                        const fe = fatorEsforco(e.key, f.familia, calib, cfgR);
                        const amostra = calib?.[e.key]?.familias?.[f.familia];
                        return (
                          <td key={e.key} className="py-1.5 px-2">
                            <div className="flex items-center gap-1.5">
                              <input type="number" min="0" step="10" placeholder={n0(rp.kgDia)} value={rascunho.ritmos?.[e.key]?.[f.familia] ?? ''}
                                onChange={(ev) => setRitmo(e.key, f.familia, ev.target.value)}
                                className="w-20 h-7 rounded bg-slate-900 border border-slate-700 text-white px-1.5 text-xs" title={`${FONTE[rp.fonte]}${amostra ? ` · ${amostra.dias} dias de amostra` : ''}`} />
                              <span className="text-slate-500">→</span>
                              <span className="text-slate-200 tabular-nums w-9">{n2(fe.fator)}</span>
                              <span className={cn('text-[10px]', rp.fonte === 'ajuste' ? 'text-sky-400' : rp.fonte === 'dados' ? 'text-emerald-500' : 'text-slate-500')}>{rp.fonte === 'ajuste' ? 'ajuste' : rp.fonte === 'dados' ? `dados·${amostra?.dias}d` : 'geral'}</span>
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
        </div>
      )}

      {ETAPAS.map((e) => {
        const grupo = pessoas.filter((p) => p.etapaPrincipal === e.key).sort((a, b) => (b.indice || 0) - (a.indice || 0));
        if (!grupo.length) return null;
        const r = ref[e.key];
        return (
          <div key={e.key} className="bg-slate-800/50 border border-slate-700 rounded-xl">
            <div className="px-4 pt-4 pb-2 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: e.cor }} />{e.label}<span className="text-xs text-slate-500 font-normal">· {e.sub}</span></h3>
                <p className="text-xs text-slate-500 mt-0.5">{rotPeriodo} · referência 100 = {kg(r.medianaKgEqDia)} eq por dia útil (mediana de {r.regulares} produtor{r.regulares === 1 ? '' : 'es'} regular{r.regulares === 1 ? '' : 'es'})</p>
              </div>
              <span className="text-xs text-slate-400">Total da etapa: <b className="text-white">{kg(r.kgEq)}</b> eq</span>
            </div>
            <div className="overflow-x-auto px-2 pb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-700">
                    {['', 'Funcionário', 'Índice', medida === 'kgEq' ? 'kg eq / dia útil' : 'kg / dia útil', medida === 'kgEq' ? 'kg equivalente' : 'kg real', 'Fator (mix)', 'Unid.', 'Peças', 'Família principal', '8 semanas', 'vs anterior'].map((h, i) => (
                      <th key={h || i} className={cn('py-2 px-2 font-medium whitespace-nowrap', i >= 3 && i !== 8 && i !== 9 ? 'text-right' : 'text-left')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grupo.map((p) => (
                    <React.Fragment key={p.id}>
                      <tr className="border-b border-slate-800 hover:bg-slate-700/30 cursor-pointer" onClick={() => setAberto(aberto === p.id ? null : p.id)}>
                        <td className="py-2 px-2 text-slate-500 w-6">{aberto === p.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                        <td className="py-2 px-2 min-w-[200px]">
                          <p className="text-white">{p.posicao}º · {p.nome}{p.ocasional && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300" title="Menos de 5% do trabalho da etapa — não entra na referência 100">ocasional</span>}</p>
                          <p className="text-xs text-slate-500">{[p.cargo, p.equipe].filter(Boolean).join(' · ')} · {p.diasApontados} dia(s) com apontamento</p>
                        </td>
                        <td className="py-2 px-2"><BarraIndice valor={p.indice} /></td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-200">{n0(medida === 'kgEq' ? p.kgEqDia : p.kgDia)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-white font-semibold">{n0(medida === 'kgEq' ? p.kgEq : p.kg)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300" title="kg equivalente ÷ kg real: acima de 1 = mix de peças mais trabalhosas">{p.fatorMedio != null ? n2(p.fatorMedio) : '—'}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{n0(p.unidades)}</td>
                        <td className="py-2 px-2 text-right tabular-nums text-slate-300">{p.pecas}</td>
                        <td className="py-2 px-2 text-slate-300 whitespace-nowrap">{p.familiaPrincipal || '—'}</td>
                        <td className="py-2 px-2"><Sparkline pontos={p.tendencia} cor={e.cor} /></td>
                        <td className="py-2 px-2 text-right"><Delta v={p.variacaoIndice} /></td>
                      </tr>
                      {aberto === p.id && (
                        <tr className="bg-slate-900/40">
                          <td />
                          <td colSpan={10} className="py-3 px-2">
                            <p className="text-xs text-slate-400 mb-2">O que {p.nome.split(' ')[0]} produziu no período, por etapa e família:</p>
                            <table className="w-full text-xs">
                              <thead><tr className="text-slate-500 border-b border-slate-700">
                                {['Etapa', 'Família', 'kg real', 'Fator', 'kg equivalente', '% do trabalho', 'Unid.', 'Peças', 'Ritmo-padrão'].map((h, i) => <th key={h} className={cn('py-1.5 px-2 font-medium', i >= 2 && i !== 8 ? 'text-right' : 'text-left')}>{h}</th>)}
                              </tr></thead>
                              <tbody>
                                {p.porFamilia.map((f) => (
                                  <tr key={`${f.etapa}-${f.familia}`} className="border-b border-slate-800/60">
                                    <td className="py-1.5 px-2 text-slate-300">{ROT[f.etapa]}</td>
                                    <td className="py-1.5 px-2 text-white">{f.rotulo}</td>
                                    <td className="py-1.5 px-2 text-right tabular-nums text-slate-300">{n0(f.kg)}</td>
                                    <td className="py-1.5 px-2 text-right tabular-nums text-slate-300">{n2(f.fator)}</td>
                                    <td className="py-1.5 px-2 text-right tabular-nums text-white">{n0(f.kgEq)}</td>
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
