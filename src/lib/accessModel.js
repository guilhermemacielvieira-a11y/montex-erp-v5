// ============================================================
// MODELO DE ACESSO — fonte única (rotas + navegação + edições)
// ============================================================
// Espelha as superfícies reais do app mobile:
//   • ROTAS  → MobileApp.jsx (<Protected perm=...>)
//   • TABS   → MobileLayout BOTTOM_TABS
//   • MAIS   → MaisMobile MODULOS
//   • HOME   → HomeMobile (KPIs/atalhos/seções)
//   • ACOES  → travas de escrita das páginas (edição)
//
// Usado por scripts/simular-acesso.mjs (CLI) E pelos testes (vitest), para que
// a auditoria e a documentação nunca divirjam da app. Permissão (`perm`/spec):
//   null = livre · string = exige a chave · array = OR (basta uma).
// ============================================================
import { ROLE_PERMISSIONS_MAP, ROLE_ORDER } from './permissions.js';

export const ROTAS = {
  '/m': null,
  '/m/producao': 'producao.view',
  '/m/montagem': ['montagem.view', 'producao.view'],
  '/m/financeiro': 'financeiro.view',
  '/m/expedicao': 'expedicao.view',
  '/m/mais': null,
  '/m/3d': ['viewer3d.view', 'producao.view'],
  '/m/kanban': 'kanban.view',
  '/m/kanban-corte': 'kanban.view',
  '/m/expedicao-desktop': 'expedicao.view',
  '/m/estoque': 'estoque.view',
  '/m/medicao': 'medicao.view',
  '/m/aprovacoes': ['medicao.aprovar', 'orcamentos.aprovar', 'compras.aprovar'],
  '/m/evidencias': 'producao.view',
  '/m/diario-obra': 'producao.lancar_avanco',
  '/m/estoque-desktop': 'estoque.view',
  '/m/despesas': 'financeiro.view',
  '/m/receitas': 'financeiro.view',
  '/m/obras-gfo': 'financeiro.view',
  '/m/painel-global': 'financeiro.view',
  '/m/painel-global-desktop': 'financeiro.view',
  '/m/dre': 'financeiro.view',
  '/m/obras': ['obras.view', 'projetos.view'],
  '/m/clientes': 'clientes.view',
  '/m/equipes': 'equipes.view',
  '/m/orcamentos': 'orcamentos.view',
  '/m/relatorios': 'relatorios.view',
  '/m/dashboard': 'bi.view',
  '/m/dashboard-bi': 'bi.view',
  '/m/analise-producao': 'producao.view',
  '/m/diario': 'producao.view',
  '/m/usuarios': 'usuarios.manage',
  '/m/notificacoes': null,
  '/m/perfil': null,
  '/m/config': null,
};

export const TABS = [
  { to: '/m', label: 'Início' },
  { to: '/m/producao', label: 'Produção', perm: 'producao.view' },
  { to: '/m/montagem', label: 'Montagem', perm: ['montagem.view', 'producao.view'] },
  { to: '/m/expedicao', label: 'Expedição', perm: 'expedicao.view' },
  { to: '/m/mais', label: 'Mais' },
];

export const MAIS = [
  { to: '/m/diario-obra', label: 'Diário de Obra', perm: 'producao.lancar_avanco' },
  { to: '/m/3d', label: 'Visualizador 3D', perm: ['viewer3d.view', 'producao.view'] },
  { to: '/m/kanban', label: 'Kanban Produção', perm: 'kanban.view' },
  { to: '/m/kanban-corte', label: 'Kanban Corte', perm: 'kanban.view' },
  { to: '/m/expedicao', label: 'Expedição', perm: 'expedicao.view' },
  { to: '/m/estoque', label: 'Estoque', perm: 'estoque.view' },
  { to: '/m/aprovacoes', label: 'Aprovações', perm: ['medicao.aprovar', 'orcamentos.aprovar', 'compras.aprovar'] },
  { to: '/m/obras', label: 'Obras', perm: ['obras.view', 'projetos.view'] },
  { to: '/m/clientes', label: 'Clientes', perm: 'clientes.view' },
  { to: '/m/equipes', label: 'Equipes', perm: 'equipes.view' },
  { to: '/m/orcamentos', label: 'Orçamentos', perm: 'orcamentos.view' },
  { to: '/m/painel-global', label: 'Painel Global', perm: 'financeiro.view' },
  { to: '/m/dre', label: 'DRE', perm: 'financeiro.view' },
  { to: '/m/receitas', label: 'Receitas', perm: 'financeiro.view' },
  { to: '/m/despesas', label: 'Despesas', perm: 'financeiro.view' },
  { to: '/m/financeiro', label: 'Financeiro da Obra', perm: 'financeiro.view' },
  { to: '/m/obras-gfo', label: 'GFO', perm: 'financeiro.view' },
  { to: '/m/dashboard', label: 'Dashboard', perm: 'bi.view' },
  { to: '/m/analise-producao', label: 'Análise Produção', perm: 'producao.view' },
  { to: '/m/diario', label: 'Diário Produção', perm: 'producao.view' },
  { to: '/m/dashboard-bi', label: 'Dashboard BI', perm: 'bi.view' },
  { to: '/m/relatorios', label: 'Relatórios', perm: 'relatorios.view' },
  { to: '/m/usuarios', label: 'Usuários', perm: 'usuarios.manage' },
  { to: '/m/notificacoes', label: 'Notificações' },
  { to: '/m/perfil', label: 'Perfil' },
  { to: '/m/config', label: 'Configurações' },
];

export const HOME = [
  { to: '/m/obras', label: 'KPI Obras ativas', perm: ['obras.view', 'projetos.view'] },
  { to: '/m/montagem', label: 'KPI Peças montadas', perm: ['montagem.view', 'producao.view'] },
  { to: '/m/producao', label: 'KPI Em produção', perm: 'producao.view' },
  { to: '/m/despesas', label: 'KPI A pagar', perm: 'financeiro.view' },
  { to: '/m/dashboard', label: 'Análise Estratégica', perm: 'bi.view' },
  { to: '/m/expedicao', label: 'Atalho Expedição', perm: 'expedicao.view' },
  { to: '/m/estoque', label: 'Atalho Estoque', perm: 'estoque.view' },
  { to: '/m/medicao', label: 'Atalho Medição', perm: 'medicao.view' },
  { to: '/m/3d', label: 'Atalho 3D', perm: ['viewer3d.view', 'producao.view'] },
  { to: '/m/financeiro', label: 'Seção Financeiro', perm: 'financeiro.view' },
];

export const ACOES = [
  { modulo: 'Produção', label: 'Avançar etapa da peça', perm: 'producao.lancar_avanco' },
  { modulo: 'Produção', label: 'Apontar por bipagem', perm: 'producao.lancar_avanco' },
  { modulo: 'Montagem', label: 'Marcar/desmarcar montada', perm: ['montagem.edit', 'producao.lancar_avanco'] },
  { modulo: '3D', label: 'Registrar montagem pelo painel 3D', perm: ['montagem.edit', 'producao.lancar_avanco'] },
  { modulo: 'Expedição', label: 'Confirmar despacho / bipar carga', perm: 'expedicao.edit' },
  { modulo: 'Medição', label: 'Lançar nova medição', perm: 'medicao.edit' },
  { modulo: 'Medição', label: 'Aprovar medição', perm: 'medicao.aprovar' },
  { modulo: 'Usuários', label: 'Gerenciar usuários', perm: 'usuarios.manage' },
];

// `perms` = lista de permissões do usuário; `spec` = exigência (null|string|array OR).
export function can(perms, spec) {
  const arr = Array.isArray(perms) ? perms : [];
  if (arr.includes('*')) return true;
  if (spec == null) return true;
  const req = Array.isArray(spec) ? spec : [spec];
  return req.some(p => arr.includes(p));
}

// Permissões efetivas de um PAPEL (preset). Override por usuário é resolvido no
// hasPermission do AuthContext; aqui validamos o modelo a partir dos presets.
export function permsDoRole(role) {
  return ROLE_PERMISSIONS_MAP[role] || [];
}

const TODAS_NAV = [
  ...TABS.map(x => ({ ...x, sup: 'Aba' })),
  ...MAIS.map(x => ({ ...x, sup: 'Mais' })),
  ...HOME.map(x => ({ ...x, sup: 'Início' })),
];

// Detecta "vê mas não abre": item de menu visível cuja rota correspondente
// bloqueia (ou o inverso). Retorna a lista de problemas (vazia = consistente).
export function auditar() {
  const problemas = [];
  for (const role of ROLE_ORDER) {
    const perms = permsDoRole(role);
    for (const item of TODAS_NAV) {
      if (!item.to || !(item.to in ROTAS)) continue;
      const veItem = can(perms, item.perm);
      const abreRota = can(perms, ROTAS[item.to]);
      if (veItem && !abreRota) {
        problemas.push(`[${role}] ${item.sup} "${item.label}" → ${item.to}: visível mas rota bloqueia`);
      }
    }
  }
  return problemas;
}

// Raio-x de acesso para uma lista de permissões (papel ou seleção custom).
export function raioX(perms) {
  const visiveis = (arr) => arr.filter(x => can(perms, x.perm)).map(x => x.label);
  return {
    abas: visiveis(TABS),
    inicio: visiveis(HOME),
    mais: visiveis(MAIS),
    edicoes: ACOES.filter(a => can(perms, a.perm)).map(a => a.modulo),
    rotasAbertas: Object.keys(ROTAS).filter(r => can(perms, ROTAS[r])),
    rotasBloqueadas: Object.keys(ROTAS).filter(r => !can(perms, ROTAS[r])),
  };
}
