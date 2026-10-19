import { describe, it, expect } from 'vitest';
import {
  statusCorte, chaveEstoqueAprox, corteEfetivo, familiaCorte, abastecimentoCorte, liberacaoMarcas, podeIniciarFabricacao,
  pipelineObra, parseListaPosicoes, planoImportacaoPosicoes, marcasPorPosicao, mapearColunas,
} from './fluxoIntegrado';

const corte = (id, marca, quantidade, status = 'aguardando', extra = {}) => ({ id, marca, quantidade, status_corte: status, perfil: 'W200X19.3', material: 'A572', peso_teorico: 100, ...extra });

describe('fluxoIntegrado', () => {
  it('status do corte segue o banco (cortado/concluido = finalizado)', () => {
    expect(statusCorte('cortado')).toBe('finalizado');
    expect(statusCorte('concluido')).toBe('finalizado');
    expect(statusCorte('em_corte')).toBe('cortando');
    expect(statusCorte('liberado')).toBe('aguardando');
  });

  it('chave de estoque aproximada igual ao padrão do banco', () => {
    expect(chaveEstoqueAprox('CH6.3X150', 'A36')).toBe('CH6.3|A36');
    expect(chaveEstoqueAprox('W 200 x 19,3', 'A572-GR.50')).toBe('W200X19.3|A572');
    expect(chaveEstoqueAprox('UE200X75X20X2', 'Civil 300')).toBe('UE200X75X20X2|CIVIL300');
  });

  it('abastecimento aloca o saldo: em corte primeiro, depois por posição', () => {
    const cortes = [corte('a', '2', 1), corte('b', '1', 1), corte('c', '3', 1, 'cortando'), corte('d', '4', 1, 'finalizado')];
    const fluxo = { chaves: [{ chave: 'K', a_cortar_kg: 300, disponivel_kg: 150 }], itens: cortes.map((c) => ({ id: c.id, chave: 'K' })) };
    const r = abastecimentoCorte(cortes, fluxo);
    expect(r.porId.get('c').estado).toBe('abastecido'); // cortando primeiro
    expect(r.porId.get('b')).toMatchObject({ estado: 'parcial', faltaKg: 50 }); // POS 1 antes da 2
    expect(r.porId.get('a')).toMatchObject({ estado: 'sem_estoque', faltaKg: 100 });
    expect(r.porId.get('d').estado).toBe('cortado');
    expect(r.chaves[0]).toMatchObject({ falta_kg: 150, cobertura: 0.5 });
  });

  it('sem RPC de estoque (estimado) não acusa falta', () => {
    const r = abastecimentoCorte([corte('a', '1', 1), corte('b', '2', 1, 'finalizado')]);
    expect(r.estimado).toBe(true);
    expect(r.porId.get('a').estado).toBe('nao_consultado');
    expect(r.chaves[0]).toMatchObject({ falta_kg: 0, cobertura: null, necessario_kg: 200, cortado_kg: 100 });
  });

  it('marca composta libera só quando todas as posições estão cortadas', () => {
    const pecas = [{ id: 'P1', marca: 'V1', quantidade: 2, etapa: 'aguardando', peso_total: 400 }];
    const composicao = [{ marca: 'V1', pos: '10', qtd_por_unidade: 1 }, { marca: 'V1', pos: '20', qtd_por_unidade: 4 }];
    let lib = liberacaoMarcas({ pecas, cortes: [corte('c1', '10', 2, 'finalizado'), corte('c2', '20', 8)], composicao });
    expect(lib.get('V1')).toMatchObject({ composicao: 'importada', status: 'aguardando_corte', liberadasAguardando: 0, pctCorte: 20 });
    lib = liberacaoMarcas({ pecas, cortes: [corte('c1', '10', 2, 'finalizado'), corte('c2', '20', 4, 'finalizado'), corte('c3', '20', 4)], composicao });
    expect(lib.get('V1')).toMatchObject({ status: 'parcial', liberadasAguardando: 1 });
    expect(podeIniciarFabricacao(lib.get('V1'), 2).ok).toBe(false);
    expect(podeIniciarFabricacao(lib.get('V1'), 1).ok).toBe(true);
  });

  it('peça única (POS = MARCA ou peca_id) é ligada automaticamente; splits somados', () => {
    const pecas = [
      { id: 'T1', marca: 'TC1', quantidade: 2, etapa: 'aguardando', peso_total: 80 },
      { id: 'T1__split_fabricacao_1', marca: 'TC1', quantidade: 1, etapa: 'fabricacao', peso_total: 40 },
      { id: 'R9', marca: 'TR9', quantidade: 1, etapa: 'aguardando', peso_total: 5 },
      { id: 'X', marca: 'C1', quantidade: 1, etapa: 'aguardando', peso_total: 900 },
    ];
    const cortes = [corte('a', 'TC1', 3, 'finalizado'), corte('b', 'POS-TR', 1, 'aguardando', { peca_id: 'R9' })];
    const lib = liberacaoMarcas({ pecas, cortes });
    expect(lib.get('TC1')).toMatchObject({ composicao: 'automatica', qtdTotal: 3, qtdEmProducao: 1, unidadesLiberadas: 3, liberadasAguardando: 2, status: 'liberada' });
    expect(lib.get('TR9')).toMatchObject({ composicao: 'automatica', status: 'aguardando_corte' });
    expect(lib.get('C1')).toMatchObject({ composicao: 'sem', status: 'sem_composicao' });
    expect(podeIniciarFabricacao(lib.get('C1')).ok).toBe(true);
    expect(marcasPorPosicao(lib).get('TC1')[0].marca).toBe('TC1');
  });

  it('posição compartilhada: marcas já em produção consomem o corte primeiro', () => {
    const pecas = [
      { id: 'A', marca: 'V2', quantidade: 1, etapa: 'aguardando', peso_total: 100 },
      { id: 'B', marca: 'V1', quantidade: 1, etapa: 'solda', peso_total: 100 },
    ];
    const composicao = [{ marca: 'V1', pos: '590', qtd_por_unidade: 2 }, { marca: 'V2', pos: '590', qtd_por_unidade: 2 }];
    const lib = liberacaoMarcas({ pecas, cortes: [corte('c', '590', 3, 'finalizado'), corte('d', '590', 1)], composicao });
    expect(lib.get('V1')).toMatchObject({ unidadesLiberadas: 1, status: 'em_producao' });
    expect(lib.get('V2')).toMatchObject({ unidadesLiberadas: 0, status: 'aguardando_corte' });
  });

  it('pipeline soma estágios do fluxo', () => {
    const pecas = [{ id: 'P', marca: 'V1', quantidade: 2, etapa: 'aguardando', peso_total: 200 }, { id: 'Q', marca: 'V9', quantidade: 1, etapa: 'pintura', peso_total: 50 }];
    const lib = liberacaoMarcas({ pecas, cortes: [corte('c', 'V1', 2, 'finalizado')] });
    const ab = abastecimentoCorte([], { chaves: [{ chave: 'K', necessario_kg: 500, cortado_kg: 200, a_cortar_kg: 300, disponivel_kg: 100 }], itens: [] });
    const p = pipelineObra({ abastecimento: ab, liberacao: lib, pecas });
    expect(p).toMatchObject({ necessarioKg: 500, cortadoKg: 200, aCortarKg: 300, abastecidoKg: 100, faltaComprarKg: 200, liberadasKg: 200, marcasLiberadas: 1 });
    expect(p.etapasKg).toMatchObject({ aguardando: 200, pintura: 50 });
  });

  it('importa lista plana com conjunto e lista hierárquica', () => {
    const plana = [
      ['LISTA DE POSIÇÕES'],
      ['Conjunto', 'Posição', 'Qtd', 'Perfil', 'Comprimento', 'Material', 'Peso'],
      ['V1', '10', 2, 'W200X19.3', 5000, 'A572', '193,0'],
      ['V1', '20', 8, 'CH8X100', 200, 'A36', '10,0'],
      ['V2', '20', 4, 'CH8X100', 200, 'A36', '5,0'],
    ];
    const r = parseListaPosicoes(plana, { qtdConjuntos: new Map([['V1', 2], ['V2', 1]]) });
    expect(r.posicoes.find((p) => p.pos === '20')).toMatchObject({ quantidade: 12, peso_teorico: 15 });
    expect(r.composicao).toEqual(expect.arrayContaining([
      { marca: 'V1', pos: '10', qtd_por_unidade: 1 }, { marca: 'V1', pos: '20', qtd_por_unidade: 4 }, { marca: 'V2', pos: '20', qtd_por_unidade: 4 },
    ]));
    // "Marca" + "Posição": marca vira conjunto
    expect(mapearColunas([['Marca', 'Posição', 'Perfil']]).idx).toMatchObject({ conjunto: 0, pos: 1, perfil: 2 });
    const hier = [
      ['Marca', 'Qtd', 'Perfil', 'Peso'],
      ['C1', 1, '', ''],
      ['p1', 1, 'HP310X79', 987],
      ['p2', 4, 'CH12X200', 20],
    ];
    const h = parseListaPosicoes(hier);
    expect(h.posicoes.map((p) => p.pos)).toEqual(['P1', 'P2']);
    expect(h.composicao).toEqual([{ marca: 'C1', pos: 'P1', qtd_por_unidade: 1 }, { marca: 'C1', pos: 'P2', qtd_por_unidade: 4 }]);
  });

  it('plano de importação não altera posição já cortada', () => {
    const plano = planoImportacaoPosicoes(
      [{ pos: '1', quantidade: 2, perfil: 'A', peso_teorico: 10 }, { pos: '2', quantidade: 3, perfil: 'A', peso_teorico: 10 }, { pos: '3', quantidade: 1, perfil: 'A', peso_teorico: 10 }, { pos: '4', quantidade: 1, perfil: 'A', peso_teorico: 10 }],
      [{ marca: '1', quantidade: 2, perfil: 'A', peso_teorico: 10, status_corte: 'aguardando' }, { marca: '2', quantidade: 1, perfil: 'A', peso_teorico: 10, status_corte: 'finalizado' }, { marca: '3', quantidade: 5, perfil: 'A', peso_teorico: 10, status_corte: 'aguardando' }],
    );
    expect(plano.iguais.map((p) => p.pos)).toEqual(['1']);
    expect(plano.bloqueadas.map((p) => p.pos)).toEqual(['2']);
    expect(plano.alteradas.map((p) => p.pos)).toEqual(['3']);
    expect(plano.novas.map((p) => p.pos)).toEqual(['4']);
  });

  it('família de corte agrupa posições e marcas', () => {
    expect(familiaCorte('DIAGONAL-TS')).toBe('TESOURA');
    expect(familiaCorte('MONTANTE-VM')).toBe('VIGA-MESTRA');
    expect(familiaCorte('DIAGONAL_TRELIÇA')).toBe('TRELICA');
    expect(familiaCorte('TERÇA-TAP')).toBe('TERCA');
    expect(familiaCorte('CHAPA')).toBe('GERAL');
  });

  it('corte efetivo: produção prova o corte (exato) e estima posições sem composição', () => {
    const pecas = [
      { id: 'T1', marca: 'TC1', tipo: 'TERÇA', quantidade: 3, etapa: 'pintura', peso_total: 300 },
      { id: 'T2', marca: 'TC2', tipo: 'TERÇA', quantidade: 2, etapa: 'aguardando', peso_total: 200 },
      { id: 'S1', marca: 'TS1', tipo: 'TESOURA', quantidade: 3, etapa: 'enviado', peso_total: 900 },
      { id: 'S2', marca: 'TS2', tipo: 'TESOURA', quantidade: 1, etapa: 'aguardando', peso_total: 300 },
    ];
    const cortes = [
      corte('a', 'TC1', 3, 'aguardando', { peca: 'TERÇA', peso_teorico: 300 }), // exato: 3 un em produção
      corte('b', 'TC2', 2, 'aguardando', { peca: 'TERÇA', peso_teorico: 200 }), // pendente
      corte('c', '10', 4, 'finalizado', { peca: 'TESOURA', peso_teorico: 400 }),
      corte('d', '11', 4, 'aguardando', { peca: 'DIAGONAL-TS', peso_teorico: 400 }),
      corte('e', '12', 2, 'aguardando', { peca: 'MONTANTE-TS', peso_teorico: 400 }),
    ];
    const lib = liberacaoMarcas({ pecas, cortes });
    const ef = corteEfetivo({ cortes, liberacao: lib });
    expect(ef.porId.get('a')).toMatchObject({ origem: 'producao', total: true, kgImplicito: 300 });
    expect(ef.porId.get('b')).toBeUndefined();
    // tesoura: 75% do peso em produção → 75% de 1200 = 900 kg; 400 já apontado → +500 estimado
    expect(ef.porId.get('d')).toMatchObject({ origem: 'estimado', kgImplicito: 400, total: true });
    expect(ef.porId.get('e')).toMatchObject({ origem: 'estimado', total: false });
    expect(ef.porId.get('e').kgImplicito).toBeCloseTo(100);
    expect(ef.resumo).toMatchObject({ totalKg: 1700, registradoKg: 400, producaoKg: 300, estimadoKg: 500, pendenteKg: 500 });
    expect(ef.conciliaveis).toEqual(['a']);
    // abastecimento só cobra o pendente real
    const fluxo = { chaves: [{ chave: 'K', necessario_kg: 1700, a_cortar_kg: 1300, disponivel_kg: 200 }], itens: cortes.map((c) => ({ id: c.id, chave: 'K' })) };
    const ab = abastecimentoCorte(cortes, fluxo, ef);
    expect(ab.porId.get('a')).toMatchObject({ estado: 'cortado', implicito: 'producao' });
    expect(ab.chaves[0]).toMatchObject({ a_cortar_kg: 500, cortado_kg: 1200, falta_kg: 300 });
    expect(pipelineObra({ abastecimento: ab, liberacao: lib, pecas })).toMatchObject({ cortadoKg: 1200, corteRegistradoKg: 400, corteProducaoKg: 300, corteEstimadoKg: 500 });
  });
});
