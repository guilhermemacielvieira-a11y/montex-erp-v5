// ============================================================
// SHELL do app da diretoria — barra de abas + rede + transição
// ============================================================
// Cinco abas fixas: Início (cockpit), Obras, Financeiro, Fábrica e Mais.
// Cada tela desenha o próprio cabeçalho com <Tela/> (kit). O shell só
// cuida do que é comum: aviso de rede, transição de rota e a barra.
// ============================================================
import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gauge, Building2, Wallet, Factory, LayoutGrid } from 'lucide-react';
import { useERP } from '@/contexts/ERPContext';
import { cn } from '@/lib/utils';
import NetworkBanner from '../ui/NetworkBanner';
import { tap } from '../ui/haptics';
import '../kit/tema.css';

export const ABAS = [
  { to: '/m', rotulo: 'Início', icone: Gauge, casa: (p) => p === '/m' || p === '/m/' || p.startsWith('/m/aprovacoes') || p.startsWith('/m/alertas') },
  { to: '/m/obras', rotulo: 'Obras', icone: Building2 },
  { to: '/m/financeiro', rotulo: 'Financeiro', icone: Wallet },
  { to: '/m/fabrica', rotulo: 'Fábrica', icone: Factory },
  { to: '/m/mais', rotulo: 'Mais', icone: LayoutGrid },
];

const ativa = (aba, p) => (aba.casa ? aba.casa(p) : p === aba.to || p.startsWith(`${aba.to}/`));
const indiceDe = (p) => ABAS.findIndex((a) => ativa(a, p));

export default function Shell({ children }) {
  const { pathname } = useLocation();
  const { dataSource } = useERP() || {};
  const anterior = useRef(indiceDe(pathname));
  const atual = indiceDe(pathname);
  const dir = atual < 0 || anterior.current < 0 || atual === anterior.current ? 0 : atual > anterior.current ? 1 : -1;
  useEffect(() => { if (atual >= 0) anterior.current = atual; }, [atual]);

  return (
    <div className="mx-app fixed inset-0 flex flex-col overflow-hidden bg-mx-bg">
      <NetworkBanner erro={dataSource === 'error'} />
      <motion.div
        key={pathname}
        className="relative min-h-0 flex-1"
        initial={{ opacity: 0, x: dir * 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {children}
      </motion.div>

      <nav
        aria-label="Navegação principal"
        className="absolute inset-x-0 bottom-0 z-40 border-t border-mx-line bg-mx-bg"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)' }}
      >
        <div className="flex h-[60px] items-stretch">
          {ABAS.map((a) => {
            const on = ativa(a, pathname);
            const Icone = a.icone;
            return (
              <Link
                key={a.to}
                to={a.to}
                aria-current={on ? 'page' : undefined}
                onClick={(e) => {
                  tap('light');
                  if (on && (pathname === a.to)) {
                    e.preventDefault();
                    document.querySelectorAll('.mx-app main .overflow-y-auto, .mx-app main .mx-scroll').forEach((el) => { el.scrollTop = 0; });
                  }
                }}
                className="relative flex flex-1 flex-col items-center justify-center gap-1"
              >
                <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition-colors', on ? 'bg-mx-teal/25' : '')}>
                  <Icone className={cn('h-[22px] w-[22px]', on ? 'text-mx-tealhi' : 'text-mx-text3')} strokeWidth={on ? 2.4 : 1.9} aria-hidden />
                </span>
                <span className={cn('text-[11px] font-medium leading-none', on ? 'text-mx-text' : 'text-mx-text3')}>{a.rotulo}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
