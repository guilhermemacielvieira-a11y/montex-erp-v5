// ============================================================
// PREVISÃO DE CARGAS (MOBILE) — cargas de carreta que faltam por obra
// ============================================================
// Mesma lógica do desktop (services/previsaoCargas): média das últimas
// expedições da obra × peso ainda não enviado. Com uma obra selecionada
// mostra o painel dela; em "Todas", a lista ranqueada por peso restante.
// ============================================================
import React, { useMemo, useState } from 'react';
import { Truck, ChevronRight, ChevronDown } from 'lucide-react';
import { previsaoCargasObra, previsaoCargasTodas } from '@/services/previsaoCargas';
import { fmtPeso, fmtNum } from '../ui/format';

const fmtData = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');

export default function PrevisaoCargasMobile({ pecas = [], expedicoes = [], obras = [], obraSelecionada = null, isTodas = true, onSelectObra }) {
  const [aberto, setAberto] = useState(true);
  const todas = useMemo(() => (isTodas ? previsaoCargasTodas({ pecas, expedicoes, obras }) : null), [isTodas, pecas, expedicoes, obras]);
  const unica = useMemo(
    () => (!isTodas && obraSelecionada ? previsaoCargasObra({ pecas, expedicoes, obra: obraSelecionada }) : null),
    [isTodas, obraSelecionada, pecas, expedicoes]
  );
  if (!unica && !todas) return null;

  return (
    <div className="mx-4 mt-3 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <button onClick={() => setAberto((a) => !a)} className="w-full flex items-center justify-between p-3.5 text-left">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center"><Truck className="w-4 h-4 text-blue-300" /></div>
          <div>
            <div className="text-sm font-bold">Cargas restantes (carreta)</div>
            <div className="text-[10px] text-slate-400">pela média das últimas expedições × peso a enviar</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unica && !unica.concluida && <span className="text-xl font-black text-blue-300">≈ {fmtNum(unica.cargasMedia)}</span>}
          {todas && <span className="text-xl font-black text-blue-300">≈ {fmtNum(todas.totais.cargasMedia)}</span>}
          <ChevronDown className={`w-4 h-4 text-slate-500 transition ${aberto ? '' : '-rotate-90'}`} />
        </div>
      </button>

      {aberto && unica && (
        unica.concluida ? (
          <div className="px-3.5 pb-3.5 text-[12px] text-emerald-300">Tudo enviado: {fmtPeso(unica.restante.enviado)} em {fmtNum(unica.historico.n)} carga(s).</div>
        ) : (
          <div className="px-3.5 pb-3.5">
            <div className="grid grid-cols-2 gap-2">
              <Mini label="A transportar" value={fmtPeso(unica.restante.restante)} sub={`fila ${fmtPeso(unica.restante.fila)} · fábrica ${fmtPeso(unica.restante.emFabrica)}`} />
              <Mini label="Capacidade de referência" value={fmtPeso(unica.capacidade)} sub={unica.fonte === 'obra' ? `média das últimas ${fmtNum(unica.historico.recentes.length)} cargas` : unica.fonte === 'global' ? 'média geral (sem romaneio)' : '—'} />
              <Mini label="Se carga cheia" value={unica.historico.maxCarga ? `≈ ${fmtNum(unica.cargasCheia)} cargas` : '—'} sub={unica.historico.maxCarga ? `maior ${fmtPeso(unica.historico.maxCarga)}` : ''} tone="text-emerald-300" />
              <Mini label="Prontas na fila" value={`${fmtNum(unica.cargasFila)} carga(s)`} sub={unica.ritmoDias ? `ritmo 1 carga / ${unica.ritmoDias} d` : 'sem ritmo ainda'} tone="text-orange-300" />
            </div>
            {unica.previsaoTermino && (
              <div className="text-[11px] text-violet-300 mt-2">Previsão de término ≈ <b>{fmtData(unica.previsaoTermino)}</b> ({fmtNum(unica.diasRestantes)} dias, última carga {fmtData(unica.historico.ultimaData)})</div>
            )}
            {unica.restante.naoCadastrado > 0 && (
              <div className="text-[10px] text-amber-300 mt-1">Contrato tem {fmtPeso(unica.restante.naoCadastrado)} sem peças cadastradas → pelo contrato ≈ {fmtNum(unica.cargasContrato)} cargas.</div>
            )}
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mt-2 flex">
              <div className="h-full bg-emerald-500" style={{ width: `${unica.restante.pesoCadastrado ? (unica.restante.enviado / unica.restante.pesoCadastrado) * 100 : 0}%` }} />
              <div className="h-full bg-orange-500" style={{ width: `${unica.restante.pesoCadastrado ? (unica.restante.fila / unica.restante.pesoCadastrado) * 100 : 0}%` }} />
              <div className="h-full bg-blue-500" style={{ width: `${unica.restante.pesoCadastrado ? (unica.restante.emFabrica / unica.restante.pesoCadastrado) * 100 : 0}%` }} />
            </div>
            <div className="text-[10px] text-slate-500 mt-1">{fmtNum(unica.restante.pctEnviado)}% enviado · {fmtNum(unica.historico.n)} romaneio(s) · média geral {fmtPeso(unica.historico.mediaGeral)}</div>
          </div>
        )
      )}

      {aberto && todas && (
        <div className="px-3.5 pb-3.5 space-y-1.5">
          {todas.ativas.length === 0 && <div className="text-[12px] text-slate-400">Nenhuma obra com carga pendente.</div>}
          {todas.ativas.slice(0, 8).map((l) => (
            <button
              key={l.obraId}
              onClick={() => onSelectObra?.(l.obraId)}
              className="w-full flex items-center gap-2 text-left bg-slate-800/60 rounded-xl px-3 py-2 active:scale-[.99] transition"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold truncate">{l.obra?.nome || l.obraId}</div>
                <div className="text-[10px] text-slate-400 truncate">
                  {fmtPeso(l.restante.restante)} a enviar · {l.historico.n ? `${fmtPeso(l.historico.mediaRecente)}/carga` : 'média geral'}{l.previsaoTermino ? ` · ~${fmtData(l.previsaoTermino)}` : ''}
                </div>
              </div>
              <div className="text-base font-black text-blue-300">≈ {fmtNum(l.cargasMedia)}</div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          ))}
          <div className="text-[10px] text-slate-500">{fmtPeso(todas.totais.restante)} a transportar em {fmtNum(todas.ativas.length)} obra(s) · toque para filtrar</div>
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, sub, tone = 'text-slate-100' }) {
  return (
    <div className="bg-slate-800/60 rounded-xl px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
      <div className={`text-[13px] font-black ${tone}`}>{value}</div>
      {sub && <div className="text-[9px] text-slate-500 truncate">{sub}</div>}
    </div>
  );
}
