// ============================================================
// PrevisaoCargasCard — quantas cargas (carretas) faltam por obra
// ============================================================
// Cruza o histórico de romaneios da obra (peso por carga, ritmo) com o peso
// ainda não enviado (peças fora de enviado/entregue). Lógica pura em
// services/previsaoCargas.js (testada). Mostra:
//   - obra única: painel com capacidade de referência (editável p/ simular),
//     cargas restantes (média / carga cheia), fila pronta, ritmo e previsão
//     de término + últimas cargas;
//   - todas as obras: tabela ranqueada pelo peso restante.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Truck, Gauge, CalendarClock, Package, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { previsaoCargasObra, previsaoCargasTodas, CLASSES_CARGA, PARAMS_CARGA_PADRAO } from '@/services/previsaoCargas';

const fmtNum = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const fmtPeso = (kg) => fmtNum(kg) + ' kg';
const fmtData = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');
const FONTE = { obra: 'média das últimas cargas da obra', global: 'média geral (obra sem romaneio)', manual: 'capacidade informada', sem_dados: 'sem histórico' };
const LABEL_CLASSE = Object.fromEntries(CLASSES_CARGA.map((c) => [c.key, c.label]));
const VOLUMOSA = new Set(CLASSES_CARGA.filter((c) => c.volumosa).map((c) => c.key));
const fmtPct = (f) => fmtNum(f * 100) + '%';

export default function PrevisaoCargasCard({ pecas = [], expedicoes = [], obras = [], obraIds = null }) {
  const [aberto, setAberto] = useState(true);
  const [capManual, setCapManual] = useState('');
  const capacidadeManual = Number(capManual) || 0;

  const escopo = useMemo(() => (obraIds ? (obras || []).filter((o) => obraIds.includes(o.id)) : (obras || [])), [obras, obraIds]);
  const todas = useMemo(
    () => previsaoCargasTodas({ pecas, expedicoes, obras: escopo, capacidadeManual }),
    [pecas, expedicoes, escopo, capacidadeManual]
  );
  const unica = useMemo(
    () => (escopo.length === 1 ? previsaoCargasObra({ pecas, expedicoes, obra: escopo[0], capacidadeManual, mediaGlobal: todas.mediaGlobal }) : null),
    [pecas, expedicoes, escopo, capacidadeManual, todas.mediaGlobal]
  );

  return (
    <div className="mx-6 mt-4 bg-gray-900 border border-gray-800 rounded-xl">
      <button onClick={() => setAberto((a) => !a)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2"><Truck className="w-4 h-4 text-blue-400" /> Previsão de cargas (carreta) por obra</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Peças a enviar × carreta de {fmtNum(PARAMS_CARGA_PADRAO.pesoMax / 1000)} t / {PARAMS_CARGA_PADRAO.alturaMax.toLocaleString('pt-BR')} m de altura: tesoura, viga-mestra e calha lotam pelo volume; terça, tirante e coluna pelo peso. Calibrado pela ocupação real dos últimos romaneios da obra.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {!unica && todas.ativas.length > 0 && (
            <div className="text-right">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Cargas restantes (todas)</div>
              <div className="text-xl font-bold text-blue-300">≈ {fmtNum(todas.totais.cargasVolume)} <span className="text-xs text-gray-400 font-normal">· {fmtPeso(todas.totais.restante)} · mín. {fmtNum(todas.totais.cargasOtimizadas)} se 100% cheias</span></div>
            </div>
          )}
          {aberto ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </button>

      {aberto && (
        <div className="px-4 pb-4">
          {/* Simulador de capacidade */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-3">
            <Gauge className="w-4 h-4 text-amber-400" />
            <span>Capacidade por carga (kg):</span>
            <input
              type="number" inputMode="numeric" min="0" step="100" value={capManual}
              onChange={(e) => setCapManual(e.target.value)}
              placeholder={unica ? String(unica.capacidade || '') : String(todas.mediaGlobal || '')}
              className="w-28 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-white text-sm"
            />
            {capManual && <button onClick={() => setCapManual('')} className="text-amber-400 hover:underline">usar histórico</button>}
            <span className="text-gray-500">· simula a estimativa "por kg/carga" (vazio = média das últimas 5 cargas da obra). A estimativa principal (peças/volume) usa {fmtNum(PARAMS_CARGA_PADRAO.pesoMax)} kg e as capacidades por classe.</span>
          </div>

          {unica ? <PainelObra p={unica} /> : <TabelaObras t={todas} />}
        </div>
      )}
    </div>
  );
}

function PainelObra({ p }) {
  const h = p.historico, r = p.restante, v = p.volume;
  if (p.concluida) {
    return <div className="text-sm text-emerald-400 flex items-center gap-2"><Package className="w-4 h-4" /> Tudo enviado: {fmtPeso(r.enviado)} em {fmtNum(h.n)} carga(s). Nenhuma carga restante.</div>;
  }
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Kpi label="Cargas restantes (peças/volume)" value={`≈ ${fmtNum(v.cargasCalibradas)}`}
          sub={v.nHist ? `ocupação real média ${fmtPct(v.ocupacaoMediaHist)} nas últimas ${fmtNum(v.nHist)} cargas · gargalo: ${v.restante.gargalo === 'volume' ? 'volume (peças volumosas)' : 'peso'}` : `sem calibração: modelo puro · gargalo: ${v.restante.gargalo || '—'}`}
          tone="text-blue-300" big />
        <Kpi label="Mínimo (100% cheias)" value={`≈ ${fmtNum(v.cargasOtimizadas)}`} sub={`${v.restante.carretas.toLocaleString('pt-BR')} carretas: peso ${fmtPct(v.restante.porPeso)} · volume ${fmtPct(v.restante.porVolume)}`} tone="text-emerald-300" />
        <Kpi label="Por kg/carga (histórico)" value={`≈ ${fmtNum(p.cargasMedia)}`} sub={`${fmtPeso(p.capacidade)}/carga · ${FONTE[p.fonte]}${h.maxCarga ? ` · ${fmtNum(p.cargasCheia)} se ${fmtPeso(h.maxCarga)}` : ''}`} tone="text-sky-300" />
        <Kpi label="Peso a transportar" value={fmtPeso(r.restante)} sub={`fila ${fmtPeso(r.fila)} · fábrica ${fmtPeso(r.emFabrica)} · não iniciado ${fmtPeso(r.naoIniciado)}`} tone="text-white" />
        <Kpi label="Prontas p/ embarque" value={`${fmtNum(v.cargasFila)} carga(s)`} sub={`${fmtPeso(r.fila)} na fila · ${v.fila.carretas.toLocaleString('pt-BR')} carreta(s) pelo modelo`} tone="text-orange-300" />
        <Kpi label="Ritmo · previsão" value={p.ritmoDias ? `1 carga / ${p.ritmoDias} d` : '—'} sub={p.previsaoTermino ? `término ≈ ${fmtData(p.previsaoTermino)} (${fmtNum(p.diasRestantes)} dias)` : 'sem ritmo (≥ 2 cargas)'} tone="text-violet-300" />
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 flex-wrap">
        <span>Enviado: <b className="text-gray-200">{fmtPeso(r.enviado)}</b> ({fmtNum(r.pctEnviado)}%) em <b className="text-gray-200">{fmtNum(h.n)}</b> romaneio(s)</span>
        {h.n > 0 && <span>Média geral da obra: <b className="text-gray-200">{fmtPeso(h.mediaGeral)}</b> · mediana {fmtPeso(h.mediana)} · última {fmtData(h.ultimaData)}</span>}
        {r.naoCadastrado > 0 && <span className="text-amber-300 flex items-center gap-1"><Info className="w-3 h-3" /> Contrato tem {fmtPeso(r.naoCadastrado)} ainda sem peças cadastradas → pelo contrato ≈ {fmtNum(p.cargasContrato)} cargas</span>}
      </div>
      <div className="h-2 rounded-full bg-gray-800 overflow-hidden mt-2 flex">
        <div className="h-full bg-emerald-500" style={{ width: `${r.pesoCadastrado ? (r.enviado / r.pesoCadastrado) * 100 : 0}%` }} title="enviado" />
        <div className="h-full bg-orange-500" style={{ width: `${r.pesoCadastrado ? (r.fila / r.pesoCadastrado) * 100 : 0}%` }} title="fila de embarque" />
        <div className="h-full bg-blue-500" style={{ width: `${r.pesoCadastrado ? (r.emFabrica / r.pesoCadastrado) * 100 : 0}%` }} title="em fábrica" />
      </div>
      <div className="flex gap-3 text-[10px] text-gray-500 mt-1">
        <span><i className="inline-block w-2 h-2 rounded-sm bg-emerald-500 mr-1" />enviado</span>
        <span><i className="inline-block w-2 h-2 rounded-sm bg-orange-500 mr-1" />fila de embarque</span>
        <span><i className="inline-block w-2 h-2 rounded-sm bg-blue-500 mr-1" />em fábrica</span>
        <span><i className="inline-block w-2 h-2 rounded-sm bg-gray-700 mr-1" />não iniciado</span>
      </div>
      {v.restante.classes.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Peças a enviar por classe de carga (carretas que ocupam pelo volume)</div>
          <div className="flex flex-wrap gap-2">
            {v.restante.classes.map((c) => (
              <span key={c.classe} className={`text-xs border rounded px-2 py-1 ${VOLUMOSA.has(c.classe) ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-gray-800 border-gray-700 text-gray-300'}`} title={`${VOLUMOSA.has(c.classe) ? 'volumosa' : 'densa'} · lota a carreta com ${fmtPeso(v.params.capVol[c.classe] || v.params.capVol.OUTROS)}`}>
                <b className="text-white">{LABEL_CLASSE[c.classe] || c.classe}</b> · {fmtPeso(c.peso)} → {c.fracao.toLocaleString('pt-BR')} carreta(s)
              </span>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-1">Âmbar = volumosa (tesoura, viga-mestra, treliça, calha): lota a carreta antes dos {fmtNum(v.params.pesoMax / 1000)} t. Cinza = densa (terça, tirante, coluna, chapas): limite é o peso.</p>
        </div>
      )}
      {v.recentes.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Últimas cargas (ocupação real pelo modelo — base da calibração)</div>
          <div className="flex flex-wrap gap-2">
            {[...v.recentes].reverse().map((c) => (
              <span key={c.id} className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300" title={(c.ocupacao.classes || []).map((k) => `${LABEL_CLASSE[k.classe] || k.classe} ${fmtPeso(k.peso)}`).join(' · ')}>
                <b className="text-white">{c.numero}</b> · {fmtData(c.data)} · {fmtPeso(c.peso)} · <b className={c.ocupacao.carretas >= 0.25 ? 'text-blue-300' : 'text-gray-500'}>{fmtPct(c.ocupacao.carretas)}</b>{c.ocupacao.carretas < 0.25 ? ' (complemento)' : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabelaObras({ t }) {
  if (!t.linhas.length) return <div className="text-sm text-gray-500">Nenhuma obra com peças cadastradas.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-gray-800">
            <th className="text-left py-2 pr-3 font-medium">Obra</th>
            <th className="text-right py-2 px-2 font-medium">Romaneios</th>
            <th className="text-right py-2 px-2 font-medium">Média/carga</th>
            <th className="text-right py-2 px-2 font-medium">Maior</th>
            <th className="text-right py-2 px-2 font-medium">Enviado</th>
            <th className="text-right py-2 px-2 font-medium">A transportar</th>
            <th className="text-right py-2 px-2 font-medium">Fila</th>
            <th className="text-right py-2 px-2 font-medium text-blue-300">Cargas (peças/volume)</th>
            <th className="text-right py-2 px-2 font-medium text-emerald-300">Mín. 100%</th>
            <th className="text-right py-2 px-2 font-medium text-sky-300">Por kg/carga</th>
            <th className="text-right py-2 px-2 font-medium">Ritmo</th>
            <th className="text-right py-2 pl-2 font-medium">Previsão</th>
          </tr>
        </thead>
        <tbody>
          {t.linhas.map((l) => {
            const h = l.historico, r = l.restante;
            return (
              <tr key={l.obraId} className={`border-b border-gray-800/60 ${l.concluida ? 'text-gray-500' : 'text-gray-200'}`}>
                <td className="py-2 pr-3">
                  <div className="font-semibold truncate max-w-[260px]">{l.obra?.nome || l.obraId}</div>
                  <div className="text-[10px] text-gray-500">{l.obra?.codigo || ''}{l.fonte === 'global' && !l.concluida ? ' · sem histórico: média geral' : ''}</div>
                </td>
                <td className="text-right px-2">{fmtNum(h.n)}</td>
                <td className="text-right px-2">{h.n ? fmtPeso(h.mediaRecente) : '—'}</td>
                <td className="text-right px-2">{h.n ? fmtPeso(h.maxCarga) : '—'}</td>
                <td className="text-right px-2">{fmtPeso(r.enviado)} <span className="text-gray-500">({fmtNum(r.pctEnviado)}%)</span></td>
                <td className="text-right px-2 font-semibold">{fmtPeso(r.restante)}</td>
                <td className="text-right px-2 text-orange-300">{r.fila ? fmtPeso(r.fila) : '—'}</td>
                <td className="text-right px-2 font-bold text-blue-300" title={l.volume.nHist ? `ocupação real média ${fmtPct(l.volume.ocupacaoMediaHist)} · gargalo ${l.volume.restante.gargalo}` : 'sem calibração'}>{l.concluida ? 'concluída' : `≈ ${fmtNum(l.volume.cargasCalibradas)}`}</td>
                <td className="text-right px-2 text-emerald-300">{l.concluida ? '—' : `≈ ${fmtNum(l.volume.cargasOtimizadas)}`}</td>
                <td className="text-right px-2 text-sky-300">{l.concluida ? '—' : `≈ ${fmtNum(l.cargasMedia)}`}</td>
                <td className="text-right px-2">{l.ritmoDias ? `${l.ritmoDias} d` : '—'}</td>
                <td className="text-right pl-2">{l.previsaoTermino ? fmtData(l.previsaoTermino) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="text-gray-300 font-semibold">
            <td className="py-2 pr-3">Total ({fmtNum(t.ativas.length)} obra(s) com carga pendente)</td>
            <td colSpan={4} />
            <td className="text-right px-2">{fmtPeso(t.totais.restante)}</td>
            <td className="text-right px-2 text-orange-300">{fmtPeso(t.totais.fila)}</td>
            <td className="text-right px-2 text-blue-300">≈ {fmtNum(t.totais.cargasVolume)}</td>
            <td className="text-right px-2 text-emerald-300">≈ {fmtNum(t.totais.cargasOtimizadas)}</td>
            <td className="text-right px-2 text-sky-300">≈ {fmtNum(t.totais.cargasMedia)}</td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
      <p className="text-[10px] text-gray-500 mt-2">A transportar = peças fora de Enviado/Entregue (fila + fábrica + não iniciado). Cargas (peças/volume) = ocupação das peças (carreta {fmtNum(PARAMS_CARGA_PADRAO.pesoMax / 1000)} t · {PARAMS_CARGA_PADRAO.alturaMax.toLocaleString('pt-BR')} m; volumosas lotam antes do peso) ÷ ocupação real média dos últimos romaneios da obra. Mín. 100% = se toda carga saísse cheia. Por kg/carga = peso restante ÷ média de kg das últimas cargas. Ritmo = intervalo médio entre romaneios; previsão = última carga + cargas × ritmo.</p>
    </div>
  );
}

function Kpi({ label, value, sub, tone = 'text-white', big = false }) {
  return (
    <div className="bg-gray-950/60 border border-gray-800 rounded-lg px-3 py-2">
      <div className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</div>
      <div className={`${big ? 'text-2xl' : 'text-lg'} font-bold ${tone}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-500 leading-tight mt-0.5">{sub}</div>}
    </div>
  );
}
