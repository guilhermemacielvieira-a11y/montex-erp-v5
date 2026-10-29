// ============================================================
// MODELO DE ACESSO — fonte única (rotas + navegação + edições)
// ============================================================
// Espelha as superfícies reais do app mobile:
//   • ROTAS  → MobileApp.jsx (<Protected perm=...>)
//   • REDIRECTS → rotas antigas que redirecionam (MobileApp.jsx)
//   • TABS   → app/Shell.jsx ABAS
//   • MAIS   → telas/Mais.jsx GRUPOS
//   • HOME   → telas/Inicio.jsx (atalhos e métricas com link)
//   • ACOES  → travas de escrita das páginas (edição)
//
// Usado por scripts/simular-acesso.mjs (CLI) E pelos testes (vitest), para que
// a auditoria e a documentação nunca divirjam da app. Permissão (`perm`/spec):
//   null = livre · string = exige a chave · array = OR (basta uma).
// ============================================================
import { ROLE_PERMISSIONS_MAP, ROLE_ORDER } from './permissions.js';

const PERM_OBRAS = ['obras.view', 'projetos.view', 'bi.view'];
const PERM_APROVAR = ['medicao.aprovar', 'orcamentos.aprovar', 'compras.aprovar'];
const PERM_MONTAGEM = ['montagem.view', 'producao.view'];

export const ROTAS = {
  '/m': null,
  '/m/obras': PERM_OBRAS,
  '/m/obras/:id': PERM_OBRAS,
  '/m/financeiro': 'financeiro.view',
  '/m/fabrica': 'producao.view',
  '/m/mais': null,
  '/m/aprovacoes': PERM_APROVAR,
  '/m/alertas': null,
  '/m/comercial': ['orcamentos.view', 'comercial.view', 'clientes.view'],
  '/m/perfil': null,
  '/m/estoque': 'estoque.view',
  '/m/medicao': 'medicao.view',
  '/m/evidencias': 'producao.view',
  '/m/diario-obra': 'producao.lancar_avanco',
  '/m/usuarios': 'usuarios.manage',
  '/m/config': null,
  '/m/campo/producao': 'producao.view',
  '/m/campo/montagem': PERM_MONTAGEM,
  '/m/campo/expedicao': 'expedicao.view',
  '/m/3d': ['viewer3d.view', 'producao.view'],
  '/m/parede-pronta': PERM_MONTAGEM,
  '/m/kanban': 'kanban.view',
  '/m/kanban-corte': 'kanban.view',
  '/m/relatorios': 'relatorios.view',
};

// Rotas antigas (links salvos, push, atalhos do PWA) → rota nova.
export const REDIRECTS = {
  producao: '/m/campo/producao',
  montagem: '/m/campo/montagem',
  expedicao: '/m/campo/expedicao',
  'expedicao-desktop': '/m/campo/expedicao',
  'estoque-desktop': '/m/estoque',
  dashboard: '/m',
  'dashboard-bi': '/m',
  'analise-producao': '/m/fabrica',
  diario: '/m/fabrica',
  'painel-global': '/m/financeiro',
  'painel-global-desktop': '/m/financeiro',
  dre: '/m/financeiro?aba=dre',
  despesas: '/m/financeiro?aba=pagar',
  receitas: '/m/financeiro?aba=receber',
  custo: '/m/financeiro?aba=custo',
  'obras-gfo': '/m/obras',
  notificacoes: '/m/alertas',
  orcamentos: '/m/comercial',
  clientes: '/m/comercial',
  equipes: '/m/fabrica',
};

export const TABS = [
  { to: '/m', label: 'Início' },
  { to: '/m/obras', label: 'Obras', perm: PERM_OBRAS },
  { to: '/m/financeiro', label: 'Financeiro', perm: 'financeiro.view' },
  { to: '/m/fabrica', label: 'Fábrica', perm: 'producao.view' },
  { to: '/m/mais', label: 'Mais' },
];

export const MAIS = [
  { to: '/m/aprovacoes', label: 'Aprovações', perm: PERM_APROVAR },
  { to: '/m/alertas', label: 'Alertas' },
  { to: '/m/comercial', label: 'Comercial', perm: ['orcamentos.view', 'comercial.view', 'clientes.view'] },
  { to: '/m/campo/producao', label: 'Lançar produção', perm: 'producao.lancar_avanco' },
  { to: '/m/campo/montagem', label: 'Marcar montagem', perm: ['montagem.edit', 'producao.lancar_avanco'] },
  { to: '/m/campo/expedicao', label: 'Conferir e despachar carga', perm: 'expedicao.edit' },
  { to: '/m/diario-obra', label: 'Diário de obra', perm: 'producao.lancar_avanco' },
  { to: '/m/evidencias', label: 'Evidências', perm: 'producao.view' },
  { to: '/m/medicao', label: 'Medição', perm: 'medicao.view' },
  { to: '/m/estoque', label: 'Estoque detalhado', perm: 'estoque.view' },
  { to: '/m/3d', label: 'Visualizador 3D', perm: ['viewer3d.view', 'producao.view'] },
  { to: '/m/kanban', label: 'Kanban de produção', perm: 'kanban.view' },
  { to: '/m/relatorios', label: 'Relatórios', perm: 'relatorios.view' },
  { to: '/m/usuarios', label: 'Usuários', perm: 'usuarios.manage' },
  { to: '/m/perfil', label: 'Perfil' },
  { to: '/m/config', label: 'Configurações' },
];

export const HOME = [
  { to: '/m/aprovacoes', label: 'Aprovações pendentes', perm: PERM_APROVAR },
  { to: '/m/alertas', label: 'Alertas' },
  { to: '/m/financeiro', label: 'Caixa no mês', perm: 'financeiro.view' },
  { to: '/m/obras', label: 'Obras ativas', perm: PERM_OBRAS },
  { to: '/m/fabrica', label: 'Semana na fábrica', perm: 'producao.view' },
  { to: '/m/campo/montagem', label: 'Atalho Marcar montagem', perm: ['montagem.edit', 'producao.lancar_avanco'] },
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
