import React, { useState } from 'react';
import { ExternalLink, Wrench, CheckCircle2, EyeOff, RotateCcw, Repeat, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS_ALERTA } from '@/hooks/useAlertasStatus';
import { REGRAS } from '@/services/bi/radarAlertas';
import { SEV_UI, fmtValorAlerta, fmtDataHora } from './radarUi';

const ESTILO_STATUS = {
  novo: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  reconhecido: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  resolvido: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  ignorado: 'border-slate-500/40 bg-slate-700/40 text-slate-300',
};

const ICONE_STATUS = { novo: Clock, reconhecido: Wrench, resolvido: CheckCircle2, ignorado: EyeOff };

function BotaoAcao({ icone: Icone, children, onClick, variante = 'padrao', disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50',
        variante === 'primario'
          ? 'border-sky-500/50 bg-sky-600/20 text-sky-100 hover:bg-sky-600/30'
          : 'border-slate-600 bg-slate-800/60 text-slate-200 hover:bg-slate-700/70',
      )}
    >
      {Icone && <Icone className="h-3.5 w-3.5" aria-hidden />}
      {children}
    </button>
  );
}

/**
 * Card de um alerta do Radar.
 * Ações: Em tratamento / Resolver (nota) / Ignorar (nota) / Reabrir.
 */
export default function AlertaCard({ alerta, registro, statusAtual, reincidente, nomeObra, onDefinir, onAbrir }) {
  const [notaPara, setNotaPara] = useState(null); // 'resolvido' | 'ignorado' | null
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);

  const sev = SEV_UI[alerta.severidade] || SEV_UI.baixo;
  const SevIcone = sev.Icone;
  const regra = REGRAS[alerta.regra];
  const valorFmt = fmtValorAlerta(alerta.valor, alerta.unidade);
  const StIcone = ICONE_STATUS[statusAtual] || Clock;
  const idNota = `nota-${alerta.id}`;

  const aplicar = async (novo, n = '') => {
    setSalvando(true);
    try {
      await onDefinir(alerta.id, novo, { nota: n });
    } finally {
      setSalvando(false);
      setNotaPara(null);
      setNota('');
    }
  };

  const aberto = statusAtual === 'novo' || statusAtual === 'reconhecido';

  return (
    <article
      className="relative rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 pl-5 min-w-0"
      aria-label={`Alerta ${sev.rotulo}: ${alerta.titulo}`}
    >
      {/* faixa lateral com a cor da severidade (redundante ao ícone + rótulo) */}
      <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r" style={{ background: sev.cor }} aria-hidden />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold"
              style={{ borderColor: `${sev.cor}80`, background: `${sev.cor}1f`, color: '#e2e8f0' }}
            >
              <SevIcone className="h-3.5 w-3.5" style={{ color: sev.cor }} aria-hidden />
              {sev.rotulo}
            </span>
            <span className="rounded-full border border-slate-600 bg-slate-800/60 px-2 py-0.5 text-slate-300">
              {regra?.area || 'Outros'}
            </span>
            {regra?.rotulo && <span className="text-slate-400">{regra.rotulo}</span>}
            <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5', ESTILO_STATUS[statusAtual])}>
              <StIcone className="h-3 w-3" aria-hidden />
              {STATUS_ALERTA[statusAtual] || statusAtual}
            </span>
            {reincidente && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-500/10 px-2 py-0.5 font-semibold text-rose-200"
                title="Marcado como resolvido há mais de 7 dias, mas continua sendo detectado"
              >
                <Repeat className="h-3 w-3" aria-hidden />
                Reincidente
              </span>
            )}
          </div>

          <h3 className="mt-2 text-sm font-semibold text-white break-words">{alerta.titulo}</h3>
          {alerta.detalhe && <p className="mt-1 text-xs text-slate-400 break-words">{alerta.detalhe}</p>}

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            {alerta.obraId && <span>Obra: <span className="text-slate-200">{nomeObra(alerta.obraId)}</span></span>}
            {registro?.em && statusAtual !== 'novo' && (
              <span>
                {STATUS_ALERTA[statusAtual]} em <span className="text-slate-200">{fmtDataHora(registro.em)}</span>
                {registro.por ? ` por ${registro.por}` : ''}
              </span>
            )}
            {registro?.nota && statusAtual !== 'novo' && (
              <span className="italic text-slate-300 break-words">“{registro.nota}”</span>
            )}
          </div>
        </div>

        {valorFmt && (
          <div className="shrink-0 sm:text-right">
            <div className="text-lg font-semibold text-white tabular-nums">{valorFmt}</div>
          </div>
        )}
      </div>

      {notaPara ? (
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(e) => { e.preventDefault(); aplicar(notaPara, nota.trim()); }}
        >
          <label htmlFor={idNota} className="text-xs text-slate-300 shrink-0">
            {notaPara === 'resolvido' ? 'Como foi resolvido?' : 'Por que ignorar?'} <span className="text-slate-500">(opcional)</span>
          </label>
          <input
            id={idNota}
            autoFocus
            maxLength={200}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { setNotaPara(null); setNota(''); } }}
            placeholder="Nota curta"
            className="h-8 min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-950/60 px-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={salvando}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-600/20 px-2.5 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-600/30 disabled:opacity-50"
            >
              {notaPara === 'resolvido' ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
              Confirmar
            </button>
            <BotaoAcao icone={X} onClick={() => { setNotaPara(null); setNota(''); }}>Cancelar</BotaoAcao>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {alerta.link && <BotaoAcao icone={ExternalLink} variante="primario" onClick={() => onAbrir(alerta.link)}>Abrir</BotaoAcao>}
          {(statusAtual === 'novo' || reincidente) && (
            <BotaoAcao icone={Wrench} disabled={salvando} onClick={() => aplicar('reconhecido')}>Em tratamento</BotaoAcao>
          )}
          {(aberto || reincidente) && (
            <>
              <BotaoAcao icone={CheckCircle2} disabled={salvando} onClick={() => setNotaPara('resolvido')}>Resolver</BotaoAcao>
              <BotaoAcao icone={EyeOff} disabled={salvando} onClick={() => setNotaPara('ignorado')}>Ignorar</BotaoAcao>
            </>
          )}
          {statusAtual !== 'novo' && (
            <BotaoAcao icone={RotateCcw} disabled={salvando} onClick={() => aplicar('novo')}>Reabrir</BotaoAcao>
          )}
        </div>
      )}
    </article>
  );
}
