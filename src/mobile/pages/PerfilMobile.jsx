// ============================================================
// PERFIL MOBILE — dados reais do usuário logado
// ============================================================
// Substitui o placeholder "Em breve". Mostra usuário, e-mail, papel
// (role) e os módulos a que tem acesso (derivado de hasPermission).
// ============================================================
import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Shield, Settings, LogOut, ChevronRight, CheckCircle2 } from 'lucide-react';
import MobileLayout from '../MobileLayout';
import { useAuth } from '@/lib/AuthContext';

const ROLE_LABEL = { admin: 'Administrador', gerente: 'Gerente', operador: 'Operador', financeiro: 'Financeiro', comercial: 'Comercial' };

// Módulos checados para resumir o acesso do usuário
const MODULOS = [
  { perm: 'producao.view', label: 'Produção' },
  { perm: 'expedicao.view', label: 'Expedição' },
  { perm: 'estoque.view', label: 'Estoque' },
  { perm: 'financeiro.view', label: 'Financeiro' },
  { perm: 'bi.view', label: 'Dashboards / BI' },
  { perm: 'projetos.view', label: 'Obras' },
  { perm: 'medicao.view', label: 'Medições' },
];

export default function PerfilMobile() {
  const { user, logout, hasPermission } = useAuth() || {};
  const nome = user?.name || user?.full_name || 'Usuário';
  const inicial = nome.trim().charAt(0).toUpperCase() || 'U';
  const role = user?.role || '—';
  const acessos = MODULOS.filter(m => !hasPermission || hasPermission(m.perm));

  return (
    <MobileLayout title="Perfil" back>
      {/* Cabeçalho do usuário */}
      <div className="px-4 pt-5">
        <div className="flex items-center gap-4 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 text-2xl">{inicial}</div>
          <div className="flex-1 min-w-0">
            <div className="text-lg font-bold truncate">{nome}</div>
            <div className="text-[12px] text-slate-400 flex items-center gap-1.5 mt-0.5"><Mail className="w-3.5 h-3.5" /> <span className="truncate">{user?.email || '—'}</span></div>
            <div className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-full">
              <Shield className="w-3.5 h-3.5" /> {ROLE_LABEL[role] || role}
            </div>
          </div>
        </div>
      </div>

      {/* Acessos */}
      <div className="px-4 mt-5">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Acesso aos módulos</div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl divide-y divide-slate-800">
          {acessos.length === 0 && <div className="p-4 text-sm text-slate-400 text-center">Sem módulos liberados</div>}
          {acessos.map(m => (
            <div key={m.perm} className="flex items-center gap-3 px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-sm text-slate-200">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="px-4 mt-5 space-y-2">
        <Link to="/m/config" className="flex items-center gap-3 p-3.5 bg-slate-900 border border-slate-800 rounded-2xl active:scale-[.99] transition">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center"><Settings className="w-5 h-5 text-amber-400" /></div>
          <span className="flex-1 text-sm font-semibold">Configurações</span>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </Link>
        <button
          onClick={() => logout?.()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/40 text-red-300 font-semibold text-sm transition"
        >
          <LogOut className="w-4 h-4" /> Sair da conta
        </button>
      </div>
      <div className="h-6" />
    </MobileLayout>
  );
}
