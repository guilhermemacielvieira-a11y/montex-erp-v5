// ============================================================
// CONFIGURAÇÕES MOBILE - notificações, sincronização, sobre
// ============================================================
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, RefreshCw, Info as InfoIcon, CheckCircle2, CloudOff, ChevronRight, AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import MobileLayout from '../MobileLayout';
import { isPushAvailable, getPushStatus, enablePush } from '../ui/push';
import { queueSize, QUEUE_EVENT, getDead, retryDead, discardDead, MAX_ATTEMPTS } from '../ui/offlineQueue';
import { getLastRefresh, formatRelative } from '../ui/lastRefresh';
import { getSyncLog, SYNCLOG_EVENT } from '../ui/syncLog';
import { useAuth } from '@/lib/AuthContext';

export default function ConfiguracoesMobile() {
  const { user } = useAuth?.() || {};
  const [pushStatus, setPushStatus] = useState(null);
  const [pendentes, setPendentes] = useState(() => queueSize());
  const [historico, setHistorico] = useState(() => getSyncLog());
  const [mortas, setMortas] = useState(() => getDead());

  useEffect(() => {
    getPushStatus().then(setPushStatus);
    const upd = () => { setPendentes(queueSize()); setHistorico(getSyncLog()); setMortas(getDead()); };
    window.addEventListener(QUEUE_EVENT, upd);
    window.addEventListener('online', upd);
    window.addEventListener(SYNCLOG_EVENT, upd);
    return () => { window.removeEventListener(QUEUE_EVENT, upd); window.removeEventListener('online', upd); window.removeEventListener(SYNCLOG_EVENT, upd); };
  }, []);

  const ativarPush = async () => {
    const r = await enablePush((notif) => {
      toast(notif?.title || 'Nova notificação', { icon: '🔔' });
    }, { role: user?.role || null });
    if (r.ok) { toast.success('Notificações ativadas'); setPushStatus('granted'); }
    else if (r.reason === 'indisponivel') toast('Disponível só no app instalado (iOS)', { icon: 'ℹ️' });
    else if (r.reason === 'negado') { toast.error('Permissão negada — habilite nos Ajustes do iOS'); setPushStatus('denied'); }
    else toast.error('Não foi possível ativar');
  };

  const sincronizarAgora = () => {
    if (!pendentes) { toast('Nada para sincronizar', { icon: '✓' }); return; }
    window.dispatchEvent(new Event('online')); // SyncManager esvazia a fila
  };

  const lastTs = getLastRefresh();

  return (
    <MobileLayout title="Configurações" back>
      <div className="px-4 pt-4 space-y-5">
        {/* Notificações */}
        <Secao titulo="Notificações">
          <Row icon={Bell} label="Notificações push" sub={pushSubtitle(pushStatus)}>
            {pushStatus === 'granted' ? (
              <span className="flex items-center gap-1 text-[12px] font-bold text-emerald-400"><CheckCircle2 className="w-4 h-4" /> Ativas</span>
            ) : (
              <button
                onClick={ativarPush}
                disabled={pushStatus === 'denied'}
                className="text-[12px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-lg px-3 py-1.5 active:scale-95 transition disabled:opacity-50"
              >Ativar</button>
            )}
          </Row>
          {!isPushAvailable() && (
            <div className="px-1 pt-1 text-[11px] text-slate-400">
              Disponível no app instalado (iOS). Veja Perfil → "Instale o MONTEX".
            </div>
          )}
        </Secao>

        {/* Sincronização */}
        <Secao titulo="Sincronização">
          <Row icon={CloudOff} label="Ações pendentes" sub={pendentes ? `${pendentes} aguardando rede` : 'Tudo sincronizado'}>
            <button
              onClick={sincronizarAgora}
              className="flex items-center gap-1 text-[12px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-lg px-3 py-1.5 active:scale-95 transition"
            ><RefreshCw className="w-3.5 h-3.5" /> Sincronizar</button>
          </Row>
          {lastTs > 0 && (
            <div className="px-1 pt-1 text-[11px] text-slate-400">Dados atualizados {formatRelative(lastTs)}.</div>
          )}
        </Secao>

        {/* Falhas de sincronização (dead-letter da fila offline) */}
        {mortas.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-red-400 font-semibold mb-2">Falhas de sincronização</div>
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl divide-y divide-slate-800">
              {mortas.map(op => (
                <div key={op.id} className="px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span className="flex-1 min-w-0 text-[13px] font-semibold truncate">{op.label}</span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{op.attempts || MAX_ATTEMPTS} tentativas</span>
                  </div>
                  {op.lastError && <div className="text-[11px] text-red-300/80 mt-1 ml-6 break-words">{op.lastError}</div>}
                  <div className="flex gap-2 mt-2 ml-6">
                    <button
                      onClick={() => { retryDead(op.id); toast('Reenfileirada — sincronizando…', { icon: '🔁' }); }}
                      className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-lg px-2.5 py-1.5 active:scale-95 transition"
                    ><RotateCcw className="w-3 h-3" /> Tentar de novo</button>
                    <button
                      onClick={() => { discardDead(op.id); toast('Ação descartada', { icon: '🗑️' }); }}
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 active:scale-95 transition"
                    ><Trash2 className="w-3 h-3" /> Descartar</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5 px-1">
              Ações que falharam {MAX_ATTEMPTS}x online (ex.: registro alterado/removido). Confira o dado antes de tentar de novo.
            </div>
          </div>
        )}

        {/* Atividade recente (histórico de sincronização) */}
        {historico.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Atividade recente</div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">
              {historico.slice(0, 8).map((h, i) => (
                <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="flex-1 min-w-0 text-[13px] truncate">{h.label}</span>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">sincronizado {formatRelative(h.ts)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sobre */}
        <Secao titulo="Sobre">
          <Row icon={InfoIcon} label="MONTEX — Super App Operacional" sub="Produção · Montagem · Expedição · Estoque · Medição" />
        </Secao>
      </div>
    </MobileLayout>
  );
}

function pushSubtitle(status) {
  if (status === 'granted') return 'Você recebe avisos de peça pronta, carga a conferir, etc.';
  if (status === 'denied') return 'Permissão negada nos Ajustes do iOS';
  if (status === 'indisponivel' || status === null) return 'Peça pronta, carga a conferir, estoque crítico';
  return 'Toque em Ativar para receber avisos';
}

function Secao({ titulo, children }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">{titulo}</div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, sub, children }) {
  return (
    <div className="flex items-center gap-3 p-3.5">
      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5 text-amber-400" /></div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        {sub && <div className="text-[11px] text-slate-400 leading-snug">{sub}</div>}
      </div>
      {children || <ChevronRight className="w-5 h-5 text-slate-500" />}
    </div>
  );
}
