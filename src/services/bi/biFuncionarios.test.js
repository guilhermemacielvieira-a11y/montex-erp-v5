import { describe, it, expect } from 'vitest';
import {
  normalizarNome, resumoPessoas, resumoEquipes, mapaCalor, eventosDaPessoa, qualidadeCadastro,
} from './biFuncionarios';

const d = (dia) => new Date(2026, 9, dia);
const funcionarios = [
  { id: 'F1', nome: 'Ana  Souza ', cargo: 'Montadora', equipe_nome: 'Fábrica', ativo: true },
  { id: 'F2', nome: 'Bruno', cargo: 'Soldador', equipe_nome: 'Fábrica', ativo: true },
  { id: 'F3', nome: 'Bruno Lima', cargo: 'Pintor', equipe_nome: 'Pintura', ativo: true },
  { id: 'F4', nome: 'Caio', cargo: 'Ajudante', equipe_nome: 'Pintura', status: 'inativo' },
];
const ev = (setor, dia, kg, funcionarioId, funcionario, extra = {}) => ({ setor, data: d(dia), kg, qtd: 1, pecaId: `P${dia}${setor}`, obraId: 'o1', funcionarioId, funcionario, ...extra });
const eventos = [
  ev('fabricacao', 5, 100, 'F1', 'Ana Souza'),
  ev('fabricacao', 6, 50, null, 'ana   souza'), // sem id → casa pelo nome normalizado
  ev('solda', 6, 80, 'F2', 'Bruno'),
  ev('pintura', 7, 30, 'F3', 'Bruno Lima'),
  ev('fabricacao', 1, 40, 'F1', 'Ana Souza'), // período anterior
  ev('expedicao', 6, 999, null, null), // embarque não é produção individual
  ev('solda', 6, 10, null, 'Reversão manual (admin)'),
  ev('solda', 7, 20, null, 'Zeca'), // fora do cadastro
];
const per = { ini: d(5), fim: d(11), iniAnt: d(1), fimAnt: d(4), hoje: d(15) };

describe('biFuncionarios', () => {
  it('normaliza nomes', () => {
    expect(normalizarNome('  José  Elvécio ')).toBe('jose elvecio');
  });

  it('resumo por pessoa: id → cadastro, nome normalizado, período anterior', () => {
    const r = resumoPessoas(eventos, funcionarios, per);
    const ana = r.find((p) => p.id === 'F1');
    expect(ana).toMatchObject({ nome: 'Ana Souza', total: 150, fabricacao: 150, diasTrabalhados: 2, kgDia: 75, anterior: 40, variacaoPct: 275, setorPrincipal: 'fabricacao' });
    expect(ana.presencaPct).toBe(40); // 2 de 5 dias úteis
    expect(r[0].id).toBe('F1');
    expect(r.find((p) => p.nome === 'Zeca')).toMatchObject({ foraDoCadastro: true, total: 20 });
    expect(r.some((p) => /revers/i.test(p.nome))).toBe(false);
    expect(r.some((p) => p.id === 'F4')).toBe(false); // inativo sem produção não aparece
    const total = r.reduce((s, p) => s + p.total, 0);
    expect(total).toBe(280);
    expect(r.reduce((s, p) => s + p.participacaoPct, 0)).toBeCloseTo(100, 0);
  });

  it('equipes', () => {
    const eq = resumoEquipes(resumoPessoas(eventos, funcionarios, per));
    expect(eq.find((e) => e.equipe === 'Fábrica')).toMatchObject({ total: 230, pessoas: 2, ativos: 2 });
  });

  it('mapa de calor pessoa × dia', () => {
    const m = mapaCalor(eventos, funcionarios, { ini: d(5), fim: d(7) });
    expect(m.dias).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
    expect(m.linhas[0]).toMatchObject({ id: 'F1', total: 150 });
    expect(m.linhas[0].dias['2026-10-06']).toBe(50);
    expect(m.max).toBe(100);
  });

  it('eventos de uma pessoa', () => {
    expect(eventosDaPessoa(eventos, funcionarios, 'F1')).toHaveLength(3);
  });

  it('qualidade do cadastro', () => {
    const q = qualidadeCadastro(funcionarios, eventos, { hoje: d(15), dias: 30 });
    expect(q.espacos).toEqual(['Ana  Souza ']);
    expect(q.duplicados).toEqual([['Bruno', 'Bruno Lima']]);
    expect(q.semPessoa).toBe(1);
    expect(q.foraDoCadastro).toEqual(['Zeca']);
    expect(q.ativosSemApont).toEqual([]);
  });
});

describe('conjuntos da aba Lançamentos', () => {
  it('não são tratados como duplicata entre si', async () => {
    const { normalizarHistorico } = await import('./biProducao');
    const pecas = [{ id: 'P9', obra_id: 'o1', etapa: 'solda', peso_total: 300, quantidade: 3 }];
    const h = (id) => ({ id, peca_id: 'P9', etapa_de: 'fabricacao', etapa_para: 'solda', data_inicio: '2026-10-05T00:00:00Z', funcionario_nome: 'Ana', funcionario_id: 'F1', observacoes: '[QTD:1/3]' });
    const { transicoes, diag } = normalizarHistorico([h('HIST-P9__c1-fabricacao'), h('HIST-P9__c2-fabricacao'), h('HIST-P9__c3-fabricacao'), h('HIST-P9__c3-fabricacao')], pecas);
    expect(diag.duplicados).toBe(1);
    expect(transicoes.reduce((s, t) => s + t.kg, 0)).toBe(300);
    expect(transicoes[0].funcionarioId).toBe('F1');
  });
});
