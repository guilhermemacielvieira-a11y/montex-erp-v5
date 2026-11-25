import { describe, it, expect } from 'vitest';
import { isGrupoEstoque, obrasMembroDoGrupo, separarGruposEstoque, gruposDaObra, idsEstoqueDoEscopo } from './gruposEstoque';

const grupoAco = {
  id: 'grupo-aco-2026',
  nome: 'ESTOQUE UNIFICADO - GRUPO AÇO 2026',
  endereco: { meta: { tipo: 'estoque_grupo', obras: ['obra-008', 'obra-010', 'obra-014'], obras_membro: ['obra-008', 'obra-010', 'obra-012'] } },
};
const obras = [
  { id: 'obra-008', nome: 'LOJA SUPERLUNA' },
  { id: 'obra-009', nome: 'G5', endereco: { meta: { tipo: 'galpao' } } },
  grupoAco,
  { id: 'obra-012', nome: 'GALPÃO ROBERTO', endereco: null },
];

describe('gruposEstoque', () => {
  it('identifica o grupo pelo meta.tipo', () => {
    expect(isGrupoEstoque(grupoAco)).toBe(true);
    expect(isGrupoEstoque(obras[0])).toBe(false);
    expect(isGrupoEstoque(obras[1])).toBe(false);
    expect(isGrupoEstoque(obras[3])).toBe(false);
  });

  it('membros: obras_membro tem prioridade; sem ela usa obras', () => {
    expect(obrasMembroDoGrupo(grupoAco)).toEqual(['obra-008', 'obra-010', 'obra-012']);
    expect(obrasMembroDoGrupo({ endereco: { meta: { tipo: 'estoque_grupo', obras: ['obra-014'] } } })).toEqual(['obra-014']);
    expect(obrasMembroDoGrupo({})).toEqual([]);
  });

  it('separa obras reais dos grupos de estoque', () => {
    const { obras: reais, grupos } = separarGruposEstoque(obras);
    expect(reais.map((o) => o.id)).toEqual(['obra-008', 'obra-009', 'obra-012']);
    expect(grupos.map((g) => g.id)).toEqual(['grupo-aco-2026']);
  });

  it('estoque do escopo inclui o grupo que atende a obra', () => {
    expect(gruposDaObra('obra-012', [grupoAco]).map((g) => g.id)).toEqual(['grupo-aco-2026']);
    expect(gruposDaObra('obra-009', [grupoAco])).toEqual([]);
    expect(idsEstoqueDoEscopo(['obra-010'], [grupoAco])).toEqual(['obra-010', 'grupo-aco-2026']);
    expect(idsEstoqueDoEscopo(['obra-009'], [grupoAco])).toEqual(['obra-009']);
    expect(idsEstoqueDoEscopo(null, [grupoAco])).toBeNull();
  });

  it('membros vêm da tabela estoque_grupos (fonte do banco)', () => {
    const vinculos = ['obra-008', 'obra-010', 'obra-014', 'obra-015'].map((o) => ({ obra_id: o, grupo_obra_id: 'grupo-aco-2026' }));
    const semMeta = { id: 'grupo-aco-2026', nome: 'X' };
    const { obras: reais, grupos } = separarGruposEstoque([semMeta, { id: 'obra-008' }], vinculos);
    expect(reais.map((o) => o.id)).toEqual(['obra-008']);
    expect(obrasMembroDoGrupo(grupos[0])).toEqual(['obra-008', 'obra-010', 'obra-014', 'obra-015']);
    expect(idsEstoqueDoEscopo(['obra-015'], grupos)).toEqual(['obra-015', 'grupo-aco-2026']);
  });
});
