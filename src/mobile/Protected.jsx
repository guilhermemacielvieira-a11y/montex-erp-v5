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
        <Lock className="mx-auto mb-4 h-12 w-12 text-mx-text3" aria-hidden />
        <div className="text-[17px] font-semibold text-mx-text">Seu perfil não tem acesso a este módulo</div>
        <div className="mx-auto mt-1.5 max-w-xs text-[14px] text-mx-text2">
          Peça ao administrador para liberar a permissão em Usuários.
        </div>
        <Link to="/m" className="mt-6 inline-flex h-12 items-center rounded-xl bg-mx-teal px-5 text-[15px] font-semibold text-white active:bg-mx-teal/80">
          Voltar ao início
        </Link>
      </div>
    </MobileLayout>
  );
}
