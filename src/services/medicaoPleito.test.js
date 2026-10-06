import { describe, it, expect } from 'vitest';
import {
  apurarPleito, grupoDaEtapa, ehMedicaoFabricacao, ehAdiantamento, medidaDaMedicao, valorKgDaObra, situacaoMedicao,
} from './medicaoPleito';

const obra = { id: 'obra-003', contrato_peso_total: 150240.8, contrato_valor_total: 420674.24, valor_kg_fabricacao: 2.8 };
const pecas = [
  { obra_id: 'obra-003', etapa: 'enviado', peso_total: 50288, quantidade: 114, marca: 'C1' },
  { obra_id: 'obra-003', etapa: 'expedido', peso_total: 9597, quantidade: 16, marca: 'C2' },
  { obra_id: 'obra-003', etapa: 'pintura', peso_total: 6734, quantidade: 8, marca: 'V1' },
  { obra_id: 'obra-003', etapa: 'solda', peso_total: 17491, quantidade: 28, marca: 'V2' },
  { obra_id: 'obra-003', etapa: 'fabricacao', peso_total: 58, quantidade: 1, marca: 'T1' },
  { obra_id: 'obra-003', etapa: 'aguardando', peso_total: 66074, quantidade: 250, marca: 'T2' },
  { obra_id: 'outra', etapa: 'enviado', peso_total: 99999, quantidade: 1, marca: 'X' },
];
const medicoes = [
  { id: 'm1', obra_id: 'obra-003', numero: 1, etapa: 'fabricacao', status: 'paga', valor_bruto: 100000.01, peso_medido: 35714.29, detalhamento: '{"fabricacao":{"peso":35714.29,"valorKg":2.8}}', data_medicao: '2026-10-02' },
  { id: 'a1', obra_id: 'obra-003', numero: 2, etapa: 'entrada_contrato', status: 'paga', valor_bruto: 50000, data_medicao: '2026-09-01' },
  { id: 'r1', obra_id: 'obra-003', numero: 3, etapa: 'fabricacao', status: 'rejeitada', valor_bruto: 9999, peso_medido: 3000 },
];

describe('medicaoPleito', () => {
  it('classifica etapas em grupos', () => {
    expect(grupoDaEtapa('enviado')).toBe('entregue');
    expect(grupoDaEtapa('Expedido')).toBe('aguardandoCarga');
    expect(grupoDaEtapa('solda')).toBe('solda');
    expect(grupoDaEtapa('aguardando')).toBe('naoIniciado');
    expect(grupoDaEtapa(undefined)).toBe('naoIniciado');
  });

  it('separa medição de fabricação, adiantamento e cancelada', () => {
    expect(ehMedicaoFabricacao(medicoes[0])).toBe(true);
    expect(ehAdiantamento(medicoes[1])).toBe(true);
    expect(ehMedicaoFabricacao(medicoes[1])).toBe(false);
    expect(ehMedicaoFabricacao(medicoes[2])).toBe(false);
    expect(ehMedicaoFabricacao({ etapa: 'montagem', status: 'paga' })).toBe(false);
    expect(ehMedicaoFabricacao({ etapa: 'avulsa', status: 'paga' })).toBe(false);
    expect(situacaoMedicao('faturada')).toBe('aprovada');
    expect(situacaoMedicao('aguardando')).toBe('em_analise');
  });

  it('peso da medição: detalhamento → peso_medido → valor ÷ R$/kg', () => {
    expect(medidaDaMedicao(medicoes[0], { valorUnit: 2.8 })).toBeCloseTo(35714.29);
    expect(medidaDaMedicao({ peso_medido: 1000, valor_bruto: 1 }, { valorUnit: 2.8 })).toBe(1000);
    expect(medidaDaMedicao({ valor_bruto: 2800 }, { valorUnit: 2.8 })).toBeCloseTo(1000);
    expect(medidaDaMedicao({ valor_bruto: 200 }, { modo: 'unidade', valorUnit: 20 })).toBe(10);
  });

  it('R$/kg: cadastrado → contrato', () => {
    expect(valorKgDaObra(obra)).toBe(2.8);
    expect(valorKgDaObra({ contrato_peso_total: 1000, contrato_valor_total: 2800 })).toBe(2.8);
    expect(valorKgDaObra({})).toBeNull();
  });

  it('apura o disponível = elegível − medido (SPASSO G1)', () => {
    const r = apurarPleito({ obras: [obra], pecas, medicoes, valorUnit: 2.8 });
    expect(r.elegivel).toBe(50288 + 9597 + 6734 + 17491);
    expect(r.medido).toBeCloseTo(35714.29);
    expect(r.disponivel).toBeCloseTo(84110 - 35714.29);
    expect(r.valorDisponivel).toBeCloseTo((84110 - 35714.29) * 2.8, 1);
    expect(r.valorAdiantamentos).toBe(50000);
    expect(r.contrato).toBe(150240.8);
    expect(r.proximoNumero).toBe(4);
    // barra soma o contrato
    expect(r.barra.reduce((s, b) => s + b.valor, 0)).toBeCloseTo(150240.8);
    // detalhe só com peças ainda na fábrica (sem entregue), maior peso primeiro
    expect(r.itensFabrica.map((i) => i.marca)).toEqual(['V2', 'C2', 'V1']);
  });

  it('respeita os grupos desmarcados', () => {
    const r = apurarPleito({ obras: [obra], pecas, medicoes, valorUnit: 2.8, incluir: { entregue: true, aguardandoCarga: true, pintura: true, solda: false } });
    expect(r.elegivel).toBe(50288 + 9597 + 6734);
    expect(r.itensFabrica.some((i) => i.grupo === 'solda')).toBe(false);
  });

  it('medido acima do elegível → disponível 0 e excedente', () => {
    const r = apurarPleito({ obras: [obra], pecas, medicoes: [{ ...medicoes[0], peso_medido: 90000, detalhamento: null }], valorUnit: 2.8 });
    expect(r.disponivel).toBe(0);
    expect(r.excedente).toBe(90000 - 84110);
  });

  it('modo unidade usa quantidade e R$/un', () => {
    const r = apurarPleito({ obras: [obra], pecas, medicoes: [{ obra_id: 'obra-003', etapa: 'fabricacao', status: 'paga', valor_bruto: 400 }], modo: 'unidade', valorUnit: 20, contrato: 500 });
    expect(r.elegivel).toBe(114 + 16 + 8 + 28);
    expect(r.medido).toBe(20);
    expect(r.disponivel).toBe(166 - 20);
    expect(r.valorDisponivel).toBe(146 * 20);
  });
});
