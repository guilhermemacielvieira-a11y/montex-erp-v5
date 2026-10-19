import { describe, it, expect } from 'vitest';
import { eventosCorte, coerenciaProducao } from './biCorte';
import { normalizarHistorico } from './biProducao';
import { resumoPessoas, resumoEquipes } from './biFuncionarios';

const cortes = [
  { id: 'MC1', obra_id: 'o1', peca_id: 'P1', perfil: 'W200', quantidade: 4, peso_teorico: 80, status_corte: 'finalizado', data_fim: '2026-10-05T14:00:00Z', funcionario_corte: 'F1' },
  { id: 'MC2', obra_id: 'o1', perfil: 'CH8', quantidade: 10, peso_teorico: 20, status_corte: 'finalizado', data_fim: null, funcionario_corte: null }, // finalizado em lote: sem data/pessoa
  { id: 'MC3', obra_id: 'o1', perfil: 'CH6', quantidade: 2, peso_teorico: 15, status_corte: 'finalizado', data_fim: null, funcionario_corte: null }, // pessoa e data vêm do histórico
  { id: 'MC4', obra_id: 'o1', perfil: 'L50', quantidade: 1, peso_teorico: 5, status_corte: 'cortando' },
  { id: 'MC5', obra_id: 'o1', perfil: 'L50', quantidade: 1, peso_teorico: 7, status_corte: 'aguardando' },
];
const historicoCorte = [
  { peca_id: 'MC3', etapa_de: 'aguardando', etapa_para: 'finalizado', data_inicio: '2026-10-06T10:00:00Z', funcionario_id: 'F2', funcionario_nome: 'Bia' },
];

describe('eventosCorte', () => {
  it('kg de material, data/pessoa da coluna ou do histórico, diagnóstico', () => {
    const { eventos, diag } = eventosCorte(cortes, historicoCorte);
    expect(eventos).toHaveLength(3);
    expect(eventos.find((e) => e.corteId === 'MC3')).toMatchObject({ funcionarioId: 'F2', kg: 15, setor: 'corte' });
    expect(eventos.find((e) => e.corteId === 'MC3').data).toEqual(new Date(2026, 9, 6));
    expect(diag).toMatchObject({ finalizados: 3, kgFinalizado: 115, semData: 1, kgSemData: 20, semPessoa: 1, kgSemPessoa: 20, emCorte: 1, kgEmCorte: 5, aguardando: 1, kgAguardando: 7 });
  });

  it('corte entra por pessoa em coluna própria (fora do total de peças)', () => {
    const { eventos } = eventosCorte(cortes, historicoCorte);
    const funcionarios = [{ id: 'F1', nome: 'Ana', equipe_nome: 'Corte' }, { id: 'F2', nome: 'Bia', equipe_nome: 'Corte' }];
    const fab = [{ setor: 'fabricacao', data: new Date(2026, 9, 5), kg: 50, qtd: 1, pecaId: 'P1', obraId: 'o1', funcionarioId: 'F1' }];
    const r = resumoPessoas([...fab, ...eventos], funcionarios, { ini: new Date(2026, 9, 1), fim: new Date(2026, 9, 10), hoje: new Date(2026, 9, 10) });
    expect(r.find((p) => p.id === 'F1')).toMatchObject({ total: 50, corte: 80, cortes: 1, fabricacao: 50 });
    expect(r.find((p) => p.id === 'F2')).toMatchObject({ total: 0, corte: 15, setorPrincipal: 'corte' });
    expect(resumoEquipes(r)[0]).toMatchObject({ equipe: 'Corte', corte: 95, total: 50 });
  });
});

describe('coerenciaProducao', () => {
  const pecas = [
    { id: 'P1', obra_id: 'o1', etapa: 'pintura', peso_total: 100, quantidade: 1, funcionarioFabricacao: 'F1' },
    { id: 'P2', obra_id: 'o1', etapa: 'expedido', peso_total: 200, quantidade: 2, funcionario_solda: 'F3' },
    { id: 'P3', obra_id: 'o2', etapa: 'fabricacao', peso_total: 50, quantidade: 1 },
  ];
  const historico = [
    { peca_id: 'P1', etapa_de: 'fabricacao', etapa_para: 'solda', data_inicio: '2026-10-01', funcionario_nome: 'Ana', funcionario_id: 'F1' },
    { peca_id: 'P2', etapa_de: 'fabricacao', etapa_para: 'solda', data_inicio: '2026-10-01', funcionario_nome: 'Ana', funcionario_id: 'F1', observacoes: '[QTD:1/2]' },
    { peca_id: 'P3', etapa_de: 'fabricacao', etapa_para: 'solda', data_inicio: '2026-10-02', funcionario_nome: 'Ana', funcionario_id: 'F1' },
    { peca_id: 'P3', etapa_de: 'solda', etapa_para: 'fabricacao', data_inicio: '2026-10-03', funcionario_nome: 'Ana', funcionario_id: 'F1' },
  ];
  const { transicoes } = normalizarHistorico(historico, pecas);

  it('separa apontado / só responsável / sem dono por etapa', () => {
    const c = coerenciaProducao({ pecas, transicoes, corte: eventosCorte(cortes, historicoCorte) });
    const fab = c.linhas.find((l) => l.etapa === 'fabricacao');
    expect(fab).toMatchObject({ produzido: 300, apontado: 200, soResponsavel: 0, semDono: 100, pctApontado: r1(200 / 3) });
    const solda = c.linhas.find((l) => l.etapa === 'solda');
    expect(solda).toMatchObject({ produzido: 300, apontado: 0, soResponsavel: 200, semDono: 100, pctIdentificado: 66.7 }); // P1 (em pintura) também já passou da solda, sem dono
    const corte = c.linhas[0];
    expect(corte).toMatchObject({ etapa: 'corte', produzido: 115, apontado: 95, semDono: 20 });
    expect(c.apontadoSemAvanco).toEqual([expect.objectContaining({ id: 'P3', etapa: 'fabricacao', kg: 50 })]);
    expect(c.semDono.find((x) => x.id === 'P2' && x.etapa === 'fabricacao')).toMatchObject({ kg: 100 });
    expect(c.semDono[0]).toMatchObject({ id: 'P2', etapa: 'pintura', kg: 200 });
    expect(c.porObra.find((o) => o.obraId === 'o1').fabricacao.produzido).toBe(300);
  });
});

function r1(v) { return Math.round(v * 10) / 10; }

describe('etapa "não se aplica" ([NA])', () => {
  it('não conta produção nem dono na etapa pulada', async () => {
    const { normalizarHistorico } = await import('./biProducao');
    const { eventosProducao } = await import('./biAnaliseProducao');
    const pecas = [
      { id: 'T1', obra_id: 'o1', etapa: 'expedido', peso_total: 60, quantidade: 2, tipo: 'TERÇA' },
      { id: 'T1__split_x', obra_id: 'o1', etapa: 'pintura', peso_total: 30, quantidade: 1, tipo: 'TERÇA' },
    ];
    const h = (de, para, obs, func = 'Ana', id = 'T1') => ({ peca_id: id, etapa_de: de, etapa_para: para, data_inicio: '2026-10-10', funcionario_nome: func, funcionario_id: func ? 'F1' : null, observacoes: obs });
    const historico = [
      h('fabricacao', 'solda', '[QTD:2/2]'),
      h('solda', 'pintura', '[NA] [QTD:2/2]', null),        // solda não se aplica
      h('solda', 'pintura', '', 'Ana', 'T1__split_x'),      // passagem gravada sem querer na peça dividida
      h('pintura', 'expedido', '[QTD:2/2]', 'Caio'),
    ];
    const { transicoes, diag, naoAplica } = normalizarHistorico(historico, pecas);
    expect(diag.naoAplica).toBe(1);
    const kgPor = (s) => eventosProducao(transicoes, []).filter((e) => e.setor === s).reduce((a, e) => a + e.kg, 0);
    expect(kgPor('fabricacao')).toBe(60);
    expect(kgPor('solda')).toBe(0);
    expect(kgPor('pintura')).toBe(60);
    const c = coerenciaProducao({ pecas, transicoes, naoAplica });
    const solda = c.linhas.find((l) => l.etapa === 'solda');
    expect(solda).toMatchObject({ produzido: 0, naoAplica: 90, semDono: 0 }); // peça e a parte dividida: solda não se aplica
  });
});
