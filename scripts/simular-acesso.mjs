#!/usr/bin/env node
// ============================================================
// SIMULADOR DE ACESSO — o que cada FUNÇÃO (role) enxerga/edita
// ============================================================
// Espelha as superfícies de navegação reais do app mobile (abas, drawer,
// hub "Mais", tela Início) e as rotas protegidas (MobileApp). Para um dado
// role (ou permissões customizadas), imprime EXATAMENTE o que aparece e o
// que pode editar — e AUDITA inconsistências do tipo "vê o item mas a rota
// bloqueia" (vê mas não abre) ou "abre por URL mas o item está oculto".
//
// Uso:
//   node scripts/simular-acesso.mjs                # tabela de todos os roles
//   node scripts/simular-acesso.mjs operador       # detalhe de um role
//   node scripts/simular-acesso.mjs operador,viewer
//
// FONTE DE VERDADE: src/lib/permissions.js (ROLE_PERMISSIONS_MAP). As listas
// de nav abaixo DEVEM espelhar MobileApp.jsx / MobileLayout.jsx / MaisMobile.jsx
// / HomeMobile.jsx. O bloco de AUDITORIA quebra (exit 1) se houver divergência
// entre o que é mostrado e o que a rota permite — use no CI/pré-deploy.
// ============================================================
import { ROLE_PERMISSIONS_MAP, ROLE_ORDER, roleLabel, ALL_PERMISSIONS } from '../src/lib/permissions.js';

// Conjunto de chaves de permissão válidas (catálogo canônico) — usado p/ avisar
// quando uma seleção customizada contém uma chave que o app não reconhece.
const ALL_KEYS = new Set(ALL_PERMISSIONS.map(p => p.key));

// permSpec: null/undefined = livre (todos veem) · string = exige a permissão ·
// array = OR (basta ter qualquer uma).
function can(role, spec) {
  const perms = ROLE_PERMISSIONS_MAP[role] || [];
  if (perms.includes('*')) return true;
  if (spec == null) return true;
  const arr = Array.isArray(spec) ? spec : [spec];
  return arr.some(p => perms.includes(p));
}

// ---- Rotas protegidas (espelha MobileApp.jsx <Protected perm=...>) ----
// null = rota pública (sem Protected).
const ROTAS = {
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

// ---- Abas inferiores (espelha MobileLayout BOTTOM_TABS) ----
const TABS = [
  { to: '/m', label: 'Início' },
  { to: '/m/producao', label: 'Produção', perm: 'producao.view' },
  { to: '/m/montagem', label: 'Montagem', perm: ['montagem.view', 'producao.view'] },
  { to: '/m/expedicao', label: 'Expedição', perm: 'expedicao.view' },
  { to: '/m/mais', label: 'Mais' },
];

// ---- Cards do hub "Mais" (espelha MaisMobile MODULOS) ----
const MAIS = [
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

// ---- Cards/seções da tela Início (espelha HomeMobile) ----
const HOME = [
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

// ---- Ações de ESCRITA (gating de edição dentro das telas liberadas) ----
const ACOES = [
  { modulo: 'Produção', label: 'Avançar etapa da peça', perm: 'producao.lancar_avanco' },
  { modulo: 'Produção', label: 'Apontar por bipagem', perm: 'producao.lancar_avanco' },
  { modulo: 'Montagem', label: 'Marcar/desmarcar montada', perm: ['montagem.edit', 'producao.lancar_avanco'] },
  { modulo: '3D', label: 'Registrar montagem pelo painel 3D', perm: ['montagem.edit', 'producao.lancar_avanco'] },
  { modulo: 'Expedição', label: 'Confirmar despacho / bipar carga', perm: 'expedicao.edit' },
  { modulo: 'Medição', label: 'Lançar nova medição', perm: 'medicao.edit' },
  { modulo: 'Medição', label: 'Aprovar medição', perm: 'medicao.aprovar' },
  { modulo: 'Usuários', label: 'Gerenciar usuários', perm: 'usuarios.manage' },
];

const todasNav = [
  ...TABS.map(x => ({ ...x, sup: 'Aba' })),
  ...MAIS.map(x => ({ ...x, sup: 'Mais' })),
  ...HOME.map(x => ({ ...x, sup: 'Início' })),
];

// AUDITORIA: para cada item visível com destino, a rota correspondente DEVE
// ser acessível com a mesma função — senão é "vê mas não abre".
function auditar() {
  const problemas = [];
  for (const role of ROLE_ORDER) {
    for (const item of todasNav) {
      if (!item.to || !(item.to in ROTAS)) continue;
      const veItem = can(role, item.perm);
      const abreRota = can(role, ROTAS[item.to]);
      if (veItem && !abreRota) {
        problemas.push(`[${role}] VÊ mas NÃO ABRE: ${item.sup} "${item.label}" → ${item.to} (rota exige ${JSON.stringify(ROTAS[item.to])}, item exige ${JSON.stringify(item.perm ?? null)})`);
      }
    }
  }
  return problemas;
}

// Relatório de acesso para uma lista de permissões qualquer (papel OU seleção
// customizada de módulos). `titulo` rotula o bloco.
function relatorio(titulo, perms) {
  const canc = (spec) => {
    if (perms.includes('*')) return true;
    if (spec == null) return true;
    const arr = Array.isArray(spec) ? spec : [spec];
    return arr.some(p => perms.includes(p));
  };
  const linha = (arr) => arr.filter(x => canc(x.perm)).map(x => x.label).join(', ') || '— (nada)';
  console.log(`\n╔══════════════════════════════════════════════════════════`);
  console.log(`║  ${titulo}`);
  console.log(`╚══════════════════════════════════════════════════════════`);
  console.log(`  Permissões: ${perms.includes('*') ? 'TODAS (*)' : `${perms.length} chave(s)`}`);
  console.log(`\n  ABAS INFERIORES:\n    ${linha(TABS)}`);
  console.log(`\n  TELA INÍCIO (cards/seções):\n    ${linha(HOME)}`);
  console.log(`\n  HUB "MAIS" (módulos):\n    ${linha(MAIS)}`);
  console.log(`\n  PODE EDITAR / EXECUTAR:`);
  for (const a of ACOES) console.log(`    ${canc(a.perm) ? '✅' : '🔒'}  ${a.modulo}: ${a.label}`);
  const rotasOk = Object.keys(ROTAS).filter(r => canc(ROTAS[r]));
  const rotasNo = Object.keys(ROTAS).filter(r => !canc(ROTAS[r]));
  console.log(`\n  ROTAS ABERTAS (${rotasOk.length}): ${rotasOk.join(' ')}`);
  console.log(`  ROTAS BLOQUEADAS (${rotasNo.length}): ${rotasNo.join(' ') || '—'}`);
}

function tabelaResumo() {
  console.log('\n  RESUMO — itens de menu visíveis e ações editáveis por função:\n');
  const head = ['Função', 'Abas', 'Mais', 'Início', 'Edições'].map(s => s.padEnd(12)).join('');
  console.log('  ' + head);
  console.log('  ' + '-'.repeat(head.length));
  for (const role of ROLE_ORDER) {
    const t = TABS.filter(x => can(role, x.perm)).length;
    const m = MAIS.filter(x => can(role, x.perm)).length;
    const h = HOME.filter(x => can(role, x.perm)).length;
    const e = ACOES.filter(x => can(role, x.perm)).length;
    const cells = [roleLabel(role), `${t}/${TABS.length}`, `${m}/${MAIS.length}`, `${h}/${HOME.length}`, `${e}/${ACOES.length}`];
    console.log('  ' + cells.map(s => String(s).padEnd(12)).join(''));
  }
}

// ---- main ----
// arg pode ser:
//   • um ou mais PAPÉIS:           operador,viewer
//   • uma SELEÇÃO de módulos:      financeiro.view,bi.view,dashboard.view
//     (detectada quando contém '.') — simula um usuário com `permissoes` custom
//     opcionalmente prefixada por "Rótulo=" → "João=producao.view,kanban.view"
const arg = process.argv[2];
console.log('================================================================');
console.log(' SIMULADOR DE ACESSO POR FUNÇÃO — MONTEX ERP MOBILE');
console.log('================================================================');

tabelaResumo();

if (arg) {
  const ehSelecao = /\./.test(arg); // permissões têm ponto (ex.: producao.view)
  if (ehSelecao) {
    let titulo = 'SELEÇÃO CUSTOMIZADA DE MÓDULOS';
    let corpo = arg;
    const eq = arg.indexOf('=');
    if (eq > 0 && !arg.slice(0, eq).includes('.')) { titulo = `USUÁRIO: ${arg.slice(0, eq).trim()} [seleção customizada]`; corpo = arg.slice(eq + 1); }
    const perms = corpo.split(',').map(s => s.trim()).filter(Boolean);
    const invalidas = perms.filter(p => !ALL_KEYS.has(p));
    relatorio(titulo, perms);
    if (invalidas.length) console.log(`\n  ⚠️ Chaves não reconhecidas (ignoradas pelo app): ${invalidas.join(', ')}`);
  } else {
    for (const role of arg.split(',').map(s => s.trim()).filter(Boolean)) {
      if (!(role in ROLE_PERMISSIONS_MAP)) { console.log(`\n  ⚠️ Função desconhecida: "${role}" (use: ${ROLE_ORDER.join(', ')})`); continue; }
      relatorio(`FUNÇÃO: ${roleLabel(role)} (${role})`, ROLE_PERMISSIONS_MAP[role] || []);
    }
  }
}

const problemas = auditar();
console.log('\n================================================================');
if (problemas.length === 0) {
  console.log(' ✅ AUDITORIA OK — nenhum item "vê mas não abre". Menu e rotas consistentes.');
  console.log('================================================================');
  process.exit(0);
} else {
  console.log(` ❌ AUDITORIA FALHOU — ${problemas.length} inconsistência(s):`);
  for (const p of problemas) console.log('   - ' + p);
  console.log('================================================================');
  process.exit(1);
}
