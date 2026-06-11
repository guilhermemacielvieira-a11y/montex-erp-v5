// ============================================================
// PERFIL MOBILE - dados do usuário + sair
// ============================================================
import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Shield, Building2, Settings, LogOut, ChevronRight } from 'lucide-react';
import MobileLayout from '../MobileLayout';
import { useAuth } from '@/lib/AuthContext';

export default function PerfilMobile() {
  const { user, logout, ROLE_LABELS } = useAuth() || {};
  const nome = user?.nome || user?.name || 'Usuário';
  const inicial = (nome || 'U').trim().charAt(0).toUpperCase();
  const roleLabel = (ROLE_LABELS && user?.role && ROLE_LABELS[user.role]) || user?.cargo || user?.role || '—';

  return (
    <MobileLayout title="Perfil" back>
      <div className="px-4 pt-5">
        {/* Cartão do usuário */}
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 text-2xl flex-shrink-0">{inicial}</div>
          <div className="min-w-0">
            <div className="font-bold text-lg truncate">{nome}</div>
            <div className="text-[12px] text-slate-400 flex items-center gap-1 truncate"><Mail className="w-3.5 h-3.5 flex-shrink-0" /> {user?.email || '—'}</div>
          </div>
        </div>

        {/* Infos */}
        <div className="mt-4 space-y-2">
          <Info icon={Shield} label="Função" value={roleLabel} />
          {user?.obraPadrao && <Info icon={Building2} label="Obra padrão" value={user.obraPadrao} />}
        </div>

        {/* Atalho Configurações */}
        <Link to="/m/config" className="mt-4 flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 active:scale-[.99] transition">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center"><Settings className="w-5 h-5 text-amber-400" /></div>
          <span className="flex-1 text-sm font-semibold">Configurações</span>
          <ChevronRight className="w-5 h-5 text-slate-500" />
        </Link>

        {/* Sair */}
        <button
          onClick={() => logout?.()}
          className="mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-600/20 active:bg-red-600/30 text-red-300 font-bold text-sm transition"
        >
          <LogOut className="w-5 h-5" /> Sair da conta
        </button>
      </div>
    </MobileLayout>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center"><Icon className="w-5 h-5 text-amber-400" /></div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}
