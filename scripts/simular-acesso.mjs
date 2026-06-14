#!/usr/bin/env node
// ============================================================
// SIMULADOR DE ACESSO — o que cada FUNÇÃO (role) enxerga/edita
// ============================================================
// Apresentação (CLI) sobre o MODELO DE ACESSO compartilhado em
// src/lib/accessModel.js (mesma fonte usada pelos testes vitest). Assim a
// auditoria/relatório nunca diverge da app.
//
// Uso:
//   node scripts/simular-acesso.mjs                # tabela de todos os papéis
//   node scripts/simular-acesso.mjs operador       # detalhe de um papel
//   node scripts/simular-acesso.mjs "financeiro.view,bi.view"   # seleção custom
//   node scripts/simular-acesso.mjs "João=montagem.view,montagem.edit"  # rótulo
//
// Sai com código 1 se a auditoria achar item "vê mas não abre".
// ============================================================
import { ROLE_PERMISSIONS_MAP, ROLE_ORDER, roleLabel, ALL_PERMISSIONS } from '../src/lib/permissions.js';
import { TABS, MAIS, HOME, ACOES, ROTAS, can, auditar, permsDoRole } from '../src/lib/accessModel.js';

const ALL_KEYS = new Set(ALL_PERMISSIONS.map(p => p.key));

function relatorio(titulo, perms) {
  const linha = (arr) => arr.filter(x => can(perms, x.perm)).map(x => x.label).join(', ') || '— (nada)';
  console.log(`\n╔══════════════════════════════════════════════════════════`);
  console.log(`║  ${titulo}`);
  console.log(`╚══════════════════════════════════════════════════════════`);
  console.log(`  Permissões: ${perms.includes('*') ? 'TODAS (*)' : `${perms.length} chave(s)`}`);
  console.log(`\n  ABAS INFERIORES:\n    ${linha(TABS)}`);
  console.log(`\n  TELA INÍCIO (cards/seções):\n    ${linha(HOME)}`);
  console.log(`\n  HUB "MAIS" (módulos):\n    ${linha(MAIS)}`);
  console.log(`\n  PODE EDITAR / EXECUTAR:`);
  for (const a of ACOES) console.log(`    ${can(perms, a.perm) ? '✅' : '🔒'}  ${a.modulo}: ${a.label}`);
  const rotasOk = Object.keys(ROTAS).filter(r => can(perms, ROTAS[r]));
  const rotasNo = Object.keys(ROTAS).filter(r => !can(perms, ROTAS[r]));
  console.log(`\n  ROTAS ABERTAS (${rotasOk.length}): ${rotasOk.join(' ')}`);
  console.log(`  ROTAS BLOQUEADAS (${rotasNo.length}): ${rotasNo.join(' ') || '—'}`);
}

function tabelaResumo() {
  console.log('\n  RESUMO — itens de menu visíveis e ações editáveis por função:\n');
  const head = ['Função', 'Abas', 'Mais', 'Início', 'Edições'].map(s => s.padEnd(12)).join('');
  console.log('  ' + head);
  console.log('  ' + '-'.repeat(head.length));
  for (const role of ROLE_ORDER) {
    const perms = permsDoRole(role);
    const t = TABS.filter(x => can(perms, x.perm)).length;
    const m = MAIS.filter(x => can(perms, x.perm)).length;
    const h = HOME.filter(x => can(perms, x.perm)).length;
    const e = ACOES.filter(x => can(perms, x.perm)).length;
    const cells = [roleLabel(role), `${t}/${TABS.length}`, `${m}/${MAIS.length}`, `${h}/${HOME.length}`, `${e}/${ACOES.length}`];
    console.log('  ' + cells.map(s => String(s).padEnd(12)).join(''));
  }
}

// ---- main ----
const arg = process.argv[2];
console.log('================================================================');
console.log(' SIMULADOR DE ACESSO POR FUNÇÃO — MONTEX ERP MOBILE');
console.log('================================================================');

tabelaResumo();

if (arg) {
  const ehSelecao = /\./.test(arg);
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
      relatorio(`FUNÇÃO: ${roleLabel(role)} (${role})`, permsDoRole(role));
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
