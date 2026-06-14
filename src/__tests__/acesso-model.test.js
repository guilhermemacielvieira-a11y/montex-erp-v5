// ============================================================
// Testes do MODELO DE ACESSO — restrição por módulos + edição
// ============================================================
// Valida a regra de "acesso = módulos selecionados" de ponta a ponta na camada
// de decisão (rotas/navegação/edições), sem depender de Supabase/navegador.
// Fonte: src/lib/accessModel.js + src/lib/permissions.js.
import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS_MAP, ALL_PERMISSIONS } from '../lib/permissions';
import { ROTAS, ACOES, TABS, MAIS, HOME, can, auditar, permsDoRole, raioX } from '../lib/accessModel';

const KEYS = new Set(ALL_PERMISSIONS.map(p => p.key));

describe('Auditoria do modelo (vê mas não abre)', () => {
  it('não existe item de menu visível com rota bloqueada, em nenhum papel', () => {
    expect(auditar()).toEqual([]);
  });
});

describe('Integridade catálogo × modelo', () => {
  it('toda permissão usada nos presets existe no catálogo ALL_PERMISSIONS', () => {
    const orfas = [];
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS_MAP)) {
      for (const k of perms) {
        if (k === '*') continue;
        if (!KEYS.has(k)) orfas.push(`${role}:${k}`);
      }
    }
    expect(orfas).toEqual([]);
  });

  it('toda permissão referenciada em rotas/navegação/ações existe no catálogo', () => {
    const specs = [
      ...Object.values(ROTAS),
      ...[...TABS, ...MAIS, ...HOME].map(x => x.perm),
      ...ACOES.map(a => a.perm),
    ];
    const orfas = [];
    for (const spec of specs) {
      if (spec == null) continue;
      for (const k of (Array.isArray(spec) ? spec : [spec])) if (!KEYS.has(k)) orfas.push(k);
    }
    expect([...new Set(orfas)]).toEqual([]);
  });
});

describe('Seleção restrita: Montagem (ver+editar) + 3D (ver)', () => {
  const perms = ['montagem.view', 'montagem.edit', 'viewer3d.view'];

  it('abre SOMENTE Montagem, 3D e rotas neutras', () => {
    const r = raioX(perms);
    expect(r.rotasAbertas.sort()).toEqual(
      ['/m', '/m/3d', '/m/config', '/m/mais', '/m/montagem', '/m/notificacoes', '/m/perfil'].sort()
    );
  });

  it('bloqueia produção, financeiro, expedição, kanban, medição, obras, usuários', () => {
    for (const rota of ['/m/producao', '/m/financeiro', '/m/expedicao', '/m/kanban',
      '/m/medicao', '/m/obras', '/m/usuarios', '/m/estoque', '/m/dashboard',
      '/m/analise-producao', '/m/diario', '/m/evidencias']) {
      expect(can(perms, ROTAS[rota])).toBe(false);
    }
  });

  it('edita SOMENTE Montagem e 3D', () => {
    const editaveis = ACOES.filter(a => can(perms, a.perm)).map(a => a.modulo);
    expect([...new Set(editaveis)].sort()).toEqual(['3D', 'Montagem']);
  });

  it('não despacha, não lança/aprova medição, não gerencia usuários', () => {
    expect(can(perms, 'expedicao.edit')).toBe(false);
    expect(can(perms, 'medicao.edit')).toBe(false);
    expect(can(perms, 'medicao.aprovar')).toBe(false);
    expect(can(perms, 'usuarios.manage')).toBe(false);
  });
});

describe('Gating de edição por papel', () => {
  it('viewer é leitura pura (0 ações de escrita)', () => {
    const perms = permsDoRole('viewer');
    expect(ACOES.filter(a => can(perms, a.perm))).toEqual([]);
  });

  it('operador edita Montagem/3D e Produção, mas NÃO despacha nem lança medição', () => {
    const perms = permsDoRole('operador');
    expect(can(perms, ROTAS['/m/montagem'])).toBe(true);
    expect(can(perms, ['montagem.edit', 'producao.lancar_avanco'])).toBe(true); // monta
    expect(can(perms, 'expedicao.edit')).toBe(false);                            // não despacha
    expect(can(perms, 'medicao.edit')).toBe(false);                              // não lança medição
    expect(can(perms, 'financeiro.view')).toBe(false);                           // não vê financeiro
  });

  it('admin abre todas as rotas e executa todas as ações', () => {
    const perms = permsDoRole('admin'); // ['*']
    expect(Object.keys(ROTAS).every(r => can(perms, ROTAS[r]))).toBe(true);
    expect(ACOES.every(a => can(perms, a.perm))).toBe(true);
  });
});

describe('OR-fallback: papéis antigos não regridem em Montagem/3D', () => {
  for (const role of ['operador', 'supervisor', 'gerente', 'viewer']) {
    it(`${role} continua vendo Montagem e 3D`, () => {
      const perms = permsDoRole(role);
      expect(can(perms, ROTAS['/m/montagem'])).toBe(true);
      expect(can(perms, ROTAS['/m/3d'])).toBe(true);
    });
  }
});
