// ============================================================
// PROTECTED — guarda de rota por permissão (role)
// ============================================================
// Bloqueia acesso DIRETO por URL a módulos sem permissão (ex.: operador
// abrindo /m/financeiro). O menu já esconde os itens; isto fecha a porta
// dos fundos. Sem hasPermission (fallback) libera. Admin libera tudo ('*').
// ============================================================
import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import MobileLayout from './MobileLayout';

export default function Protected({ perm, children }) {
  const { hasPermission } = useAuth() || {};
  // `perm` aceita string OU array (libera se tiver QUALQUER uma — usado em
  // telas multi-domínio como /m/aprovacoes: medicao.aprovar OU orcamentos.aprovar).
  const perms = Array.isArray(perm) ? perm : (perm ? [perm] : []);
  const allowed = perms.length === 0 || !hasPermission || perms.some(p => hasPermission(p));
  if (allowed) return children;
  return (
    <MobileLayout title="Acesso restrito" back>
      <div className="px-6 py-20 text-center">
        <Lock className="w-14 h-14 mx-auto mb-4 text-slate-600" />
        <div className="text-base font-bold">Acesso restrito</div>
        <div className="text-sm text-slate-400 mt-1.5 max-w-xs mx-auto">
          Você não tem permissão para acessar este módulo. Fale com o gestor se precisar.
        </div>
        <Link to="/m" className="inline-block mt-6 px-5 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm active:scale-95 transition">
          Voltar ao Início
        </Link>
      </div>
    </MobileLayout>
  );
}
