// ============================================================
// Previsão de cargas (carreta) — ancorado em dados reais (obra 2025-36)
// ============================================================
import { describe, it, expect } from 'vitest';
import { historicoCargasObra, mediaGlobalCargas, restanteObra, previsaoCargasObra, previsaoCargasTodas } from './previsaoCargas';

// 9 romaneios reais da obra-003 (peso_total, data_expedicao) + 1 de outra obra
const expedicoes = [
  { id: 'E1', obra_id: 'obra-003', numero_romaneio: 'CARGA 01', data_expedicao: '2026-08-26', peso_total: 392, status: 'ENTREGUE' },
  { id: 'E2', obra_id: 'obra-003', numero_romaneio: 'CARGA 02', data_expedicao: '2026-08-28', peso_total: 4200, status: 'ENTREGUE' },
  { id: 'E3', obra_id: 'obra-003', numero_romaneio: 'CARGA 03', data_expedicao: '2026-09-01', peso_total: 5100, status: 'ENTREGUE' },
  { id: 'E4', obra_id: 'obra-003', numero_romaneio: 'CARGA 04', data_expedicao: '2026-09-03', peso_total: 3900, status: 'ENTREGUE' },
  { id: 'E5', obraId: 'obra-003', numeroRomaneio: 'CARGA 05', dataExpedicao: '2026-09-08', pesoTotal: 4600, status: 'entregue' }, // camelCase (contexto)
  { id: 'E6', obra_id: 'obra-003', numero_romaneio: 'CARGA 6', data_expedicao: '2026-09-15', peso_total: 4746.45, status: 'ENTREGUE' },
  { id: 'E7', obra_id: 'obra-003', numero_romaneio: 'CARGA 7', data_expedicao: '2026-09-10', peso_total: 6528.42, status: 'ENTREGUE' },
  { id: 'E8', obra_id: 'obra-003', numero_romaneio: 'CARGA 8', data_expedicao: '2026-09-10', peso_total: 934.9, status: 'ENTREGUE' },
  { id: 'E9', obra_id: 'obra-003', numero_romaneio: 'CARGA 09', data_expedicao: '2026-09-23', peso_total: 10851.21, status: 'ENTREGUE' },
  { id: 'X1', obra_id: 'obra-009', numero_romaneio: 'CARGA 3', data_expedicao: '2026-09-22', peso_total: 7157, status: 'ENTREGUE' },
  { id: 'Z0', obra_id: 'obra-003', numero_romaneio: 'RASCUNHO', data_expedicao: '2026-09-24', peso_total: 0, status: 'preparando' }, // sem peso → ignorado
];
const obra = { id: 'obra-003', codigo: '2025-36', nome: 'SPASSO G1', contratoPesoTotal: 150240.8 };
const pecas = [
  { id: 'a', obraId: 'obra-003', etapa: 'enviado', pesoTotal: 46112 },
  { id: 'b', obraId: 'obra-003', etapa: 'expedido', pesoTotal: 5022 },
  { id: 'c', obraId: 'obra-003', etapa: 'solda', pesoTotal: 20000 },
  { id: 'd', obraId: 'obra-003', etapa: 'aguardando', quantidade: 2, pesoUnitario: 39554 }, // 79.108 via unitário×qtd
  { id: 'e', obra_id: 'obra-009', etapa: 'aguardando', peso_total: 100000 },
];

describe('historicoCargasObra', () => {
  const h = historicoCargasObra(expedicoes, 'obra-003');
  it('só romaneios da obra com peso > 0, em ordem cronológica', () => {
    expect(h.n).toBe(9);
    expect(h.romaneios[0].numero).toBe('CARGA 01');
    expect(h.romaneios[8].numero).toBe('CARGA 09');
  });
  it('média das últimas 5 (CARGA 7, 8, 6, 5... por data) vs geral, máx/min', () => {
    // últimas 5 por data: 09-08 (4600), 09-10 (6528), 09-10 (935), 09-15 (4746), 09-23 (10851)
    expect(h.mediaRecente).toBe(Math.round((4600 + 6528.42 + 934.9 + 4746.45 + 10851.21) / 5));
    expect(h.mediaGeral).toBe(Math.round((392 + 4200 + 5100 + 3900 + 4600 + 4746.45 + 6528.42 + 934.9 + 10851.21) / 9));
    expect(h.maxCarga).toBe(10851);
    expect(h.minCarga).toBe(392);
  });
  it('ritmo = dias entre 1ª e última ÷ (n − 1): 28 dias / 8 = 3,5', () => {
    expect(h.intervaloMedioDias).toBe(3.5);
    expect(h.ultimaData).toBe('2026-09-23');
  });
  it('obra sem romaneio → vazio', () => {
    const v = historicoCargasObra(expedicoes, 'obra-999');
    expect(v.n).toBe(0); expect(v.mediaRecente).toBe(0); expect(v.ultimaData).toBeNull();
  });
});

describe('restanteObra — peso por situação de transporte', () => {
  const r = restanteObra(pecas, obra);
  it('enviado × fila × fábrica × não iniciado × restante', () => {
    expect(r.enviado).toBe(46112);
    expect(r.fila).toBe(5022);
    expect(r.emFabrica).toBe(20000);
    expect(r.naoIniciado).toBe(79108);
    expect(r.restante).toBe(5022 + 20000 + 79108);
    expect(r.nPecasRestantes).toBe(3);
  });
  it('contrato × cadastrado: nada faltando cadastrar quando peças ≥ contrato', () => {
    expect(r.pesoCadastrado).toBe(150242);
    expect(r.naoCadastrado).toBe(0);
    expect(r.pctEnviado).toBeCloseTo(30.7, 1);
  });
  it('contrato maior que as peças cadastradas → não cadastrado', () => {
    const r2 = restanteObra(pecas, { id: 'obra-003', contrato_peso_total: 160242 });
    expect(r2.naoCadastrado).toBe(10000);
  });
});

describe('previsaoCargasObra', () => {
  const p = previsaoCargasObra({ pecas, expedicoes, obra });
  it('capacidade = média das últimas 5 da própria obra', () => {
    expect(p.fonte).toBe('obra');
    expect(p.capacidade).toBe(p.historico.mediaRecente);
  });
  it('cargas pela média e pela carga cheia (arredonda p/ cima)', () => {
    expect(p.cargasMedia).toBe(Math.ceil(104130 / p.capacidade));
    expect(p.cargasCheia).toBe(Math.ceil(104130 / 10851));
    expect(p.cargasFila).toBe(1); // 5.022 kg prontos cabem numa carga
  });
  it('previsão de término = última carga + cargas × ritmo', () => {
    expect(p.diasRestantes).toBe(Math.round(p.cargasMedia * 3.5));
    expect(p.previsaoTermino).toMatch(/^2026-1[01]-\d{2}$/);
  });
  it('capacidade manual sobrepõe o histórico', () => {
    const m = previsaoCargasObra({ pecas, expedicoes, obra, capacidadeManual: 12000 });
    expect(m.fonte).toBe('manual');
    expect(m.cargasMedia).toBe(Math.ceil(104130 / 12000));
  });
  it('obra sem histórico usa a média GERAL das cargas', () => {
    const o9 = { id: 'obra-009', nome: 'G5' };
    const g = previsaoCargasObra({ pecas, expedicoes: expedicoes.filter((e) => (e.obra_id || e.obraId) !== 'obra-009'), obra: o9 });
    expect(g.fonte).toBe('global');
    expect(g.capacidade).toBe(mediaGlobalCargas(expedicoes.filter((e) => (e.obra_id || e.obraId) !== 'obra-009')));
    expect(g.cargasMedia).toBe(Math.ceil(100000 / g.capacidade));
    expect(g.previsaoTermino).toBeNull(); // sem última carga
  });
  it('obra concluída (nada a transportar) → 0 cargas', () => {
    const c = previsaoCargasObra({ pecas: [{ obraId: 'z', etapa: 'entregue', pesoTotal: 10 }], expedicoes, obra: { id: 'z' } });
    expect(c.cargasMedia).toBe(0); expect(c.concluida).toBe(true);
  });
});

describe('previsaoCargasTodas', () => {
  const t = previsaoCargasTodas({ pecas, expedicoes, obras: [obra, { id: 'obra-009', nome: 'G5' }, { id: 'obra-vazia', nome: 'Sem peças' }] });
  it('uma linha por obra COM peças, ordenada por restante desc', () => {
    expect(t.linhas.map((l) => l.obraId)).toEqual(['obra-003', 'obra-009']);
  });
  it('totais somam as linhas', () => {
    expect(t.totais.restante).toBe(104130 + 100000);
    expect(t.totais.cargasMedia).toBe(t.linhas[0].cargasMedia + t.linhas[1].cargasMedia);
  });
});
