// ============================================================
// MAIS MOBILE - Hub de módulos extras (grid de cards)
// ============================================================
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Truck, Package, Scissors, ClipboardList, Building2,
  Users, Calculator, FileText, BarChart3, Activity, PieChart,
  Wallet, Receipt, TrendingUp, Settings, User, Bell, CheckCircle2, Landmark,
} from 'lucide-react';
import MobileLayout from '../MobileLayout';

const MODULOS = [
  { group: 'Operação', items: [
    { to: '/m/diario-obra', icon: ClipboardList, label: 'Diário de Obra', cor: 'emerald' },
    { to: '/m/3d', icon: Box, label: 'Visualizador 3D', cor: 'amber' },
    { to: '/m/kanban', icon: ClipboardList, label: 'Kanban Produção', cor: 'blue' },
    { to: '/m/kanban-corte', icon: Scissors, label: 'Kanban Corte', cor: 'purple' },
    { to: '/m/expedicao', icon: Truck, label: 'Expedição', cor: 'green' },
    { to: '/m/estoque', icon: Package, label: 'Estoque', cor: 'cyan' },
  ]},
  { group: 'Gestão', items: [
    { to: '/m/aprovacoes', icon: CheckCircle2, label: 'Aprovações', cor: 'emerald' },
    { to: '/m/obras', icon: Building2, label: 'Obras', cor: 'amber' },
    { to: '/m/clientes', icon: User, label: 'Clientes', cor: 'blue' },
    { to: '/m/equipes', icon: Users, label: 'Equipes', cor: 'purple' },
    { to: '/m/orcamentos', icon: Calculator, label: 'Orçamentos', cor: 'green' },
  ]},
  // Financeiro GERAL (empresa) ≠ financeiro de OBRA — módulos separados
  { group: 'Financeiro · Empresa', items: [
    { to: '/m/painel-global', icon: Landmark, label: 'Painel Global', cor: 'emerald' },
    { to: '/m/dre', icon: PieChart, label: 'DRE', cor: 'amber' },
    { to: '/m/receitas', icon: TrendingUp, label: 'Receitas', cor: 'emerald' },
    { to: '/m/despesas', icon: Receipt, label: 'Despesas', cor: 'red' },
  ]},
  { group: 'Financeiro · Obra', items: [
    { to: '/m/financeiro', icon: Wallet, label: 'Financeiro da Obra', cor: 'blue' },
    { to: '/m/obras-gfo', icon: Wallet, label: 'GFO (desktop)', cor: 'blue' },
  ]},
  { group: 'Analytics', items: [
    { to: '/m/dashboard', icon: BarChart3, label: 'Dashboard', cor: 'purple' },
    { to: '/m/analise-producao', icon: Activity, label: 'Análise Produção', cor: 'amber' },
    { to: '/m/diario', icon: ClipboardList, label: 'Diário Produção', cor: 'cyan' },
    { to: '/m/dashboard-bi', icon: PieChart, label: 'Dashboard BI', cor: 'green' },
    { to: '/m/relatorios', icon: FileText, label: 'Relatórios', cor: 'blue' },
  ]},
  { group: 'Sistema', items: [
    { to: '/m/notificacoes', icon: Bell, label: 'Notificações', cor: 'amber' },
    { to: '/m/perfil', icon: User, label: 'Perfil', cor: 'slate' },
    { to: '/m/config', icon: Settings, label: 'Configurações', cor: 'slate' },
  ]},
];

const CORES = {
  amber: 'from-amber-500/20 to-orange-600/10 text-amber-400 border-amber-500/20',
  blue: 'from-blue-500/20 to-blue-600/10 text-blue-400 border-blue-500/20',
  purple: 'from-violet-500/20 to-violet-600/10 text-violet-400 border-violet-500/20',
  green: 'from-green-500/20 to-green-600/10 text-green-400 border-green-500/20',
  cyan: 'from-cyan-500/20 to-cyan-600/10 text-cyan-400 border-cyan-500/20',
  red: 'from-red-500/20 to-red-600/10 text-red-400 border-red-500/20',
  emerald: 'from-emerald-500/20 to-emerald-600/10 text-emerald-400 border-emerald-500/20',
  slate: 'from-slate-700/40 to-slate-800/20 text-slate-400 border-slate-700',
};

export default function MaisMobile() {
  return (
    <MobileLayout title="Mais">
      {MODULOS.map(grp => (
        <div key={grp.group} className="px-4 pt-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">{grp.group}</div>
          <div className="grid grid-cols-3 gap-2.5">
            {grp.items.map(it => {
              const Icon = it.icon;
              return (
                <Link
                  key={it.to} to={it.to}
                  className={`bg-gradient-to-br ${CORES[it.cor] || CORES.amber} border rounded-2xl p-3 flex flex-col items-center justify-center gap-2 aspect-square active:scale-95 transition`}
                >
                  <Icon className="w-6 h-6" strokeWidth={2} />
                  <span className="text-[11px] font-semibold text-slate-100 text-center leading-tight">{it.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      <div className="h-4" />
    </MobileLayout>
  );
}
