// ============================================================
// PROTECTED (MOBILE) — guarda de rota por permissão (role)
// ============================================================
// Complementa a filtragem de MENU por role (MobileLayout): aqui
// fechamos a "porta dos fundos" por URL direta. Sem a permissão
// exigida, a rota renderiza "Acesso restrito" em vez do conteúdo.
//
// Fallback seguro: se hasPermission não existir (Auth ausente) o
// acesso é liberado — não trava o app em estados sem contexto.
// ============================================================
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import MobileLayout from './MobileLayout';
import { useAuth } from '@/lib/AuthContext';

export default function Protected({ perm, children }) {
  const { hasPermission } = useAuth() || {};
  const allowed = !perm || !hasPermission || hasPermission(perm);
  if (allowed) return children;

  return (
    <MobileLayout title="Acesso restrito" back>
      <div className="flex flex-col items-center justify-center text-center px-8 pt-24">
        <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center mb-4">
          <ShieldX className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-base font-bold">Acesso restrito</div>
        <div className="text-sm text-slate-400 mt-1 max-w-xs">
          Você não tem permissão para acessar esta área. Fale com o administrador se precisar de acesso.
        </div>
        <Link to="/m" className="mt-5 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm active:scale-95 transition">
          Voltar ao início
        </Link>
      </div>
    </MobileLayout>
  );
}
