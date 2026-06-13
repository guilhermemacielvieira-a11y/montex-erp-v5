// ============================================================
// PERMISSÕES & FUNÇÕES — FONTE ÚNICA (desktop + mobile)
// ============================================================
// Catálogo canônico de permissões e o mapa de Função (role) → permissões.
// Antes vivia duplicado dentro de GestaoUsuariosPage.jsx; o painel mobile de
// usuários (UsuariosMobile) precisa exatamente das MESMAS definições. Manter
// em dois lugares causa divergência silenciosa (a matriz mobile mostraria algo
// diferente do desktop). Aqui é o único lugar para editar.
//
// Modelo: cada usuário tem um `role` (função base) e, opcionalmente, um array
// `permissoes` (override). Se `permissoes` for vazio/null → valem as do role
// (ROLE_PERMISSIONS_MAP). Se não-vazio → substituem o role. '*' = tudo.
// ============================================================

// Catálogo completo, agrupado por módulo (para a matriz de permissões).
export const ALL_PERMISSIONS = [
  { grupo: 'Dashboard', key: 'dashboard.view', label: 'Acessar o módulo' },
  { grupo: 'Dashboard', key: 'dashboard.export', label: 'Exportar' },
  { grupo: 'Comercial', key: 'comercial.view', label: 'Acessar o módulo' },
  { grupo: 'Comercial', key: 'orcamentos.edit', label: 'Orçamentos — Editar' },
  { grupo: 'Comercial', key: 'orcamentos.aprovar', label: 'Orçamentos — Aprovar' },
  { grupo: 'Comercial', key: 'clientes.edit', label: 'Clientes — Editar' },
  { grupo: 'Comercial', key: 'projetos.edit', label: 'Projetos — Editar' },
  { grupo: 'Comercial', key: 'projetos.create', label: 'Projetos — Criar' },
  { grupo: 'Suprimentos', key: 'suprimentos.view', label: 'Acessar o módulo' },
  { grupo: 'Suprimentos', key: 'estoque.edit', label: 'Estoque — Editar' },
  { grupo: 'Suprimentos', key: 'estoque.movimentar', label: 'Estoque — Movimentar' },
  { grupo: 'Suprimentos', key: 'compras.edit', label: 'Compras — Editar' },
  { grupo: 'Suprimentos', key: 'compras.aprovar', label: 'Compras — Aprovar' },
  { grupo: 'Produção', key: 'producao.view', label: 'Acessar o módulo' },
  { grupo: 'Produção', key: 'producao.edit', label: 'Editar' },
  { grupo: 'Produção', key: 'producao.lancar_avanco', label: 'Lançar Avanço' },
  { grupo: 'Produção', key: 'producao.aprovar', label: 'Aprovar' },
  { grupo: 'Produção', key: 'equipes.edit', label: 'Equipes — Editar' },
  { grupo: 'Produção', key: 'equipes.escalar', label: 'Equipes — Escalar' },
  { grupo: 'Expedição', key: 'expedicao.view', label: 'Acessar o módulo' },
  { grupo: 'Expedição', key: 'expedicao.edit', label: 'Editar' },
  { grupo: 'Expedição', key: 'expedicao.aprovar', label: 'Aprovar' },
  { grupo: 'Obras', key: 'obras.view', label: 'Acessar o módulo' },
  { grupo: 'Obras', key: 'obras.edit', label: 'Editar / Montagem' },
  { grupo: 'Medição', key: 'medicao.view', label: 'Acessar o módulo' },
  { grupo: 'Medição', key: 'medicao.edit', label: 'Editar' },
  { grupo: 'Medição', key: 'medicao.aprovar', label: 'Aprovar' },
  { grupo: 'Financeiro', key: 'financeiro.view', label: 'Acessar o módulo' },
  { grupo: 'Financeiro', key: 'financeiro.edit', label: 'Editar' },
  { grupo: 'Financeiro', key: 'financeiro.aprovar', label: 'Aprovar' },
  { grupo: 'Business Intelligence', key: 'bi.view', label: 'Acessar o módulo' },
  { grupo: 'Command Center', key: 'command.view', label: 'Acessar (3D, dashboards 49")' },
  { grupo: 'Colaboração & IA', key: 'colaboracao.view', label: 'Acessar o módulo' },
  { grupo: 'Colaboração & IA', key: 'relatorios.view', label: 'Relatórios — Visualizar' },
  { grupo: 'Colaboração & IA', key: 'relatorios.export', label: 'Relatórios — Exportar' },
  { grupo: 'Sistema / Usuários', key: 'usuarios.view', label: 'Usuários — Ver lista' },
  { grupo: 'Sistema / Usuários', key: 'usuarios.manage', label: 'Usuários — Gerenciar' },
];

// Mapa Função → permissões (deve casar com PERMISSIONS do AuthContext em runtime).
export const ROLE_PERMISSIONS_MAP = {
  admin: ['*'],
  gerente: ['dashboard.view', 'dashboard.export', 'command.view', 'colaboracao.view', 'comercial.view', 'orcamentos.edit', 'orcamentos.aprovar', 'clientes.edit', 'projetos.edit', 'projetos.create', 'suprimentos.view', 'estoque.edit', 'estoque.movimentar', 'compras.edit', 'compras.aprovar', 'producao.view', 'producao.edit', 'producao.lancar_avanco', 'producao.aprovar', 'equipes.edit', 'equipes.escalar', 'expedicao.view', 'expedicao.edit', 'expedicao.aprovar', 'obras.view', 'obras.edit', 'medicao.view', 'medicao.edit', 'medicao.aprovar', 'financeiro.view', 'financeiro.edit', 'bi.view', 'relatorios.view', 'relatorios.export', 'usuarios.view'],
  supervisor: ['dashboard.view', 'command.view', 'colaboracao.view', 'producao.view', 'producao.edit', 'producao.lancar_avanco', 'equipes.edit', 'equipes.escalar', 'suprimentos.view', 'estoque.edit', 'estoque.movimentar', 'expedicao.view', 'expedicao.edit', 'obras.view', 'obras.edit', 'medicao.view', 'medicao.edit', 'relatorios.view'],
  operador: ['dashboard.view', 'command.view', 'colaboracao.view', 'producao.view', 'producao.lancar_avanco', 'suprimentos.view', 'obras.view'],
  financeiro: ['dashboard.view', 'dashboard.export', 'command.view', 'colaboracao.view', 'comercial.view', 'orcamentos.edit', 'clientes.edit', 'suprimentos.view', 'compras.edit', 'financeiro.view', 'financeiro.edit', 'financeiro.aprovar', 'medicao.view', 'medicao.edit', 'bi.view', 'relatorios.view', 'relatorios.export'],
  viewer: ['dashboard.view', 'command.view', 'colaboracao.view', 'producao.view', 'obras.view', 'suprimentos.view', 'expedicao.view', 'medicao.view', 'bi.view', 'relatorios.view'],
};

// Ordem hierárquica (mais alto → mais baixo) para listagem e seleção.
export const ROLE_ORDER = ['admin', 'gerente', 'supervisor', 'financeiro', 'operador', 'viewer'];

// Metadados de cada função: rótulo amigável + descrição (UI de seleção).
export const ROLE_META = {
  admin: { label: 'Administrador', desc: 'Acesso total ao sistema, sem restrições.' },
  gerente: { label: 'Gerente', desc: 'Gerencia produção, financeiro, comercial e expedição.' },
  supervisor: { label: 'Supervisor', desc: 'Operação diária de fábrica, obras e medições.' },
  financeiro: { label: 'Financeiro', desc: 'Financeiro, comercial, compras e medições.' },
  operador: { label: 'Operador', desc: 'Lançamento de produção e montagem em campo.' },
  viewer: { label: 'Visualização', desc: 'Somente leitura dos módulos liberados.' },
};

// Cor do badge por função (Tailwind).
export const ROLE_BADGE = {
  admin: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  gerente: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  supervisor: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  financeiro: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  operador: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  viewer: 'bg-slate-500/20 text-slate-300 border border-slate-600/40',
};

// A função `role` concede a permissão `permKey`?
export function hasRolePerm(role, permKey) {
  const perms = ROLE_PERMISSIONS_MAP[role] || [];
  return perms.includes('*') || perms.includes(permKey);
}

// Permissões EFETIVAS de um usuário: override (permissoes não-vazio) ou as do role.
export function effectivePerms(user) {
  if (Array.isArray(user?.permissoes) && user.permissoes.length > 0) return user.permissoes;
  return ROLE_PERMISSIONS_MAP[user?.role] || [];
}

// Rótulo amigável da função (fallback para o próprio id).
export function roleLabel(role) {
  return ROLE_META[role]?.label || role || '—';
}
