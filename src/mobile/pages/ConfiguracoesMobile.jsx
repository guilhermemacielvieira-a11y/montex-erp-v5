// ============================================================
// CONFIGURAÇÕES MOBILE — preferências reais do app
// ============================================================
// Substitui o placeholder "Em breve". Preferências persistidas
// (ui/settings.js): notificações (badge do sino) e haptics. Ações:
// atualizar dados, limpar cache local e guia "Adicionar à tela inicial".
// ============================================================
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, BellRing, Vibrate, RefreshCw, Trash2, Smartphone, Info, ChevronRight, Loader2 } from 'lucide-react';
import MobileLayout from '../MobileLayout';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/lib/AuthContext';
import { useSettings, setSetting } from '../ui/settings';
import { isPushSupported, registerPush, removePush } from '../ui/push';

const APP_VERSION = '2.1.0';

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch" aria-checked={on}
      className={`w-12 h-7 rounded-full p-0.5 transition flex-shrink-0 ${on ? 'bg-emerald-500' : 'bg-slate-700'}`}
    >
      <span className={`block w-6 h-6 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function Row({ icon: Icon, label, sub, right, onClick, danger }) {
  const inner = (
    <div className={`flex items-center gap-3 px-4 py-3.5 ${onClick ? 'active:bg-slate-800/60' : ''} transition`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-500/15' : 'bg-slate-800'}`}>
        <Icon className={`w-5 h-5 ${danger ? 'text-red-400' : 'text-amber-400'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${danger ? 'text-red-300' : ''}`}>{label}</div>
        {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
      {right}
    </div>
  );
  return onClick ? <button onClick={onClick} className="w-full text-left">{inner}</button> : inner;
}

export default function ConfiguracoesMobile() {
  const settings = useSettings();
  const { reloadPecas, reloadEstoque, reloadExpedicoes } = useERP() || {};
  const { user } = useAuth() || {};
  const [refreshing, setRefreshing] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const pushSupported = isPushSupported();

  // Liga/desliga push: pede permissão + registra o device, ou remove o token.
  const togglePush = async (on) => {
    if (pushBusy) return;
    if (on) {
      setPushBusy(true);
      const r = await registerPush(user?.email);
      setPushBusy(false);
      if (r.ok) { setSetting('push', true); toast.success('Notificações push ativadas'); }
      else if (r.reason === 'denied') toast.error('Permissão negada nas configurações do iOS');
      else if (r.reason === 'unsupported') toast('Disponível apenas no app instalado', { icon: '📲' });
      else toast.error('Falha ao ativar push');
    } else {
      setPushBusy(true);
      await removePush(user?.email);
      setPushBusy(false);
      setSetting('push', false);
      toast.success('Notificações push desativadas');
    }
  };

  const atualizar = async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { toast.error('Sem conexão'); return; }
    setRefreshing(true);
    try {
      await Promise.all([reloadPecas?.(), reloadEstoque?.(), reloadExpedicoes?.()]);
      toast.success('Dados atualizados');
    } catch { toast.error('Falha ao atualizar'); }
    finally { setRefreshing(false); }
  };

  const limparCache = () => {
    try {
      // Remove apenas chaves do app (preserva login/Supabase). Mantém a fila
      // offline para não perder escritas pendentes ainda não sincronizadas.
      const manter = (k) => k.startsWith('sb-') || k.includes('offline') || k.includes('queue');
      Object.keys(localStorage).filter(k => k.startsWith('montex_') && !manter(k)).forEach(k => localStorage.removeItem(k));
      toast.success('Cache local limpo');
    } catch { toast.error('Falha ao limpar cache'); }
  };

  return (
    <MobileLayout title="Configurações" back>
      {/* Preferências */}
      <div className="px-4 pt-4">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Preferências</div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl divide-y divide-slate-800">
          <Row icon={Bell} label="Notificações" sub="Mostrar contador de alertas no sino"
            right={<Toggle on={settings.notificacoes !== false} onChange={(v) => setSetting('notificacoes', v)} />} />
          <Row icon={pushBusy ? Loader2 : BellRing} label="Notificações push"
            sub={pushSupported ? 'Receber alertas mesmo com o app fechado' : 'Disponível apenas no app instalado (iOS/Android)'}
            right={pushBusy
              ? <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              : <Toggle on={!!settings.push && pushSupported} onChange={pushSupported ? togglePush : (() => toast('Instale o app para ativar', { icon: '📲' }))} />} />
          <Row icon={Vibrate} label="Vibração (haptics)" sub="Feedback tátil nas ações"
            right={<Toggle on={settings.haptics !== false} onChange={(v) => setSetting('haptics', v)} />} />
        </div>
      </div>

      {/* Dados */}
      <div className="px-4 pt-5">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Dados</div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl divide-y divide-slate-800">
          <Row icon={refreshing ? Loader2 : RefreshCw} label="Atualizar dados" sub="Recarrega produção, estoque e romaneios"
            onClick={refreshing ? undefined : atualizar}
            right={refreshing ? <Loader2 className="w-4 h-4 text-amber-400 animate-spin" /> : <ChevronRight className="w-4 h-4 text-slate-500" />} />
          <Row icon={Trash2} label="Limpar cache local" sub="Mantém login e fila offline" danger onClick={limparCache} />
        </div>
      </div>

      {/* App */}
      <div className="px-4 pt-5">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Aplicativo</div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl divide-y divide-slate-800">
          <Row icon={Smartphone} label="Adicionar à tela inicial" sub="Instalar como app (PWA)"
            onClick={() => toast('No Safari: Compartilhar → Adicionar à Tela de Início', { icon: '📲', duration: 5000 })}
            right={<ChevronRight className="w-4 h-4 text-slate-500" />} />
          <Row icon={Info} label="Versão" right={<span className="text-sm text-slate-400">{APP_VERSION}</span>} />
        </div>
      </div>
      <div className="h-6" />
    </MobileLayout>
  );
}
