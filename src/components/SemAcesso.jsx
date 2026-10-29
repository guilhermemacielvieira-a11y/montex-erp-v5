// Tela mostrada quando o usuário abre (por link ou digitando a URL) uma página
// de um módulo que não foi liberado para ele. Regra em src/lib/acessoPaginas.js.
import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { primeiraPaginaPermitida, modulosLiberados } from '@/lib/acessoPaginas';

export default function SemAcesso() {
  const { hasPermission } = useAuth() || {};
  const destino = primeiraPaginaPermitida(hasPermission);
  const modulos = modulosLiberados(hasPermission);
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-center">
        <ShieldOff className="mx-auto h-10 w-10 text-amber-400" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold text-white">Módulo não liberado</h1>
        <p className="mt-2 text-sm text-slate-300">
          Esta tela não faz parte dos módulos liberados para o seu usuário. Peça ao administrador se precisar dela.
        </p>
        {modulos.length > 0 && (
          <p className="mt-3 text-sm text-slate-400">Liberados para você: {modulos.join(', ')}.</p>
        )}
        <Link
          to={destino ? createPageUrl(destino) : '/m'}
          className="mt-6 inline-flex h-10 items-center rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-400"
        >
          {destino ? 'Ir para minha tela inicial' : 'Abrir o app'}
        </Link>
      </div>
    </div>
  );
}
