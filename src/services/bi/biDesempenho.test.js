import { describe, it, expect } from 'vitest';
import {
  familiaDe, configRotas, aplicarRotas, calibrarRitmos, ritmoPadrao, fatorEsforco, desempenhoPessoas, referenciaEtapas, resumoFamilias,
} from './biDesempenho';

const d = (dia) => new Date(2026, 9, dia);
const funcionarios = [
  { id: 'A', nome: 'Ana', equipe_nome: 'Fábrica' },
  { id: 'B', nome: 'Bruno', equipe_nome: 'Fábrica' },
  { id: 'S', nome: 'Sol', equipe_nome: 'Fábrica' },
];
const ev = (setor, dia, kg, f, tipo, peca = `${f}${dia}${tipo}${setor}`) => ({ setor, data: d(dia), kg, qtd: 1, pecaId: peca, obraId: 'o1', funcionarioId: f, tipo });

// Ana faz terça (rápida em kg: 600 kg/dia); Bruno faz tirante (lento em kg: 100 kg/dia)
const eventos = [];
for (let i = 1; i <= 6; i += 1) {
  eventos.push(ev('fabricacao', i, 600, 'A', 'TERÇA'));
  eventos.push(ev('fabricacao', i, 100, 'B', 'Tirante'));
}
// semana em análise: Ana 1200 kg de terça em 2 dias; Bruno 300 kg de tirante em 2 dias
eventos.push(ev('fabricacao', 12, 600, 'A', 'TERÇA'), ev('fabricacao', 13, 600, 'A', 'TERÇA'));
eventos.push(ev('fabricacao', 12, 150, 'B', 'TIRANTE'), ev('fabricacao', 13, 150, 'B', 'TIRANTE'));
// solda de terça (não existe na prática) e solda de coluna
eventos.push(ev('solda', 12, 500, 'S', 'TERÇA'), ev('solda', 13, 400, 'S', 'COLUNA'));

describe('biDesempenho', () => {
  it('família canônica', () => {
    expect(familiaDe(' Terça-TAP ')).toBe('TERCA-TAP');
    expect(familiaDe('')).toBe('SEM TIPO');
  });

  it('rota sem solda remove a solda de terça', () => {
    const { eventos: ev2, removidos } = aplicarRotas(eventos, configRotas());
    expect(removidos).toMatchObject({ eventos: 1, kg: 500, pecas: 1 });
    expect(ev2.some((e) => e.setor === 'solda' && e.familia === 'TERCA')).toBe(false);
    expect(ev2.find((e) => e.setor === 'solda').familia).toBe('COLUNA');
  });

  it('calibra ritmo por família (dias puros) e cai no geral sem amostra', () => {
    const { eventos: ev2 } = aplicarRotas(eventos, configRotas());
    const calib = calibrarRitmos(ev2, funcionarios);
    expect(calib.fabricacao.familias.TERCA).toMatchObject({ mediana: 600, confiavel: true });
    expect(calib.fabricacao.familias.TIRANTE).toMatchObject({ mediana: 100, confiavel: true });
    expect(ritmoPadrao('fabricacao', 'TERCA', calib).fonte).toBe('dados');
    expect(ritmoPadrao('solda', 'COLUNA', calib)).toMatchObject({ fonte: 'geral', kgDia: 400 });
    expect(ritmoPadrao('fabricacao', 'TERCA', calib, configRotas({ ritmos: { fabricacao: { TERCA: 1200 } } }))).toMatchObject({ kgDia: 1200, fonte: 'ajuste' });
  });

  it('kg equivalente e índice entre pares da mesma etapa', () => {
    const { eventos: ev2 } = aplicarRotas(eventos, configRotas());
    const calib = calibrarRitmos(ev2, funcionarios);
    // ritmo geral da fabricação = mediana de todos os dias-pessoa (8×600, 6×100, 2×150) → 375
    expect(fatorEsforco('fabricacao', 'TERCA', calib).fator).toBe(0.63);
    expect(fatorEsforco('fabricacao', 'TIRANTE', calib).fator).toBe(3.75);
    const r = desempenhoPessoas(ev2, funcionarios, { ini: d(12), fim: d(13), iniAnt: d(5), fimAnt: d(6), hoje: d(15), calib });
    const ana = r.find((p) => p.id === 'A');
    const bruno = r.find((p) => p.id === 'B');
    expect(ana).toMatchObject({ kg: 1200, diasUteis: 2, etapaPrincipal: 'fabricacao', familiaPrincipal: 'TERÇA' });
    expect(ana.kgEq).toBeCloseTo(1200 * 0.63, 0);
    // Bruno fez 300 kg de tirante (= 1125 kg eq) e passa a Ana (756 kg eq)
    expect(bruno.kgEq).toBeCloseTo(1125, 0);
    expect(bruno.posicao).toBe(1);
    expect(ana.posicao).toBe(2);
    expect(bruno.indice).toBeGreaterThan(100);
    expect(ana.indice).toBeLessThan(100);
    expect(bruno.tendencia.length).toBe(8);
    expect(r.find((p) => p.id === 'S')).toMatchObject({ kg: 400, etapaPrincipal: 'solda', indice: 100 });
    expect(referenciaEtapas(r).fabricacao.pessoas).toBe(2);
  });

  it('resumo por família', () => {
    const { eventos: ev2 } = aplicarRotas(eventos, configRotas());
    const f = resumoFamilias(ev2, { ini: d(12), fim: d(13) });
    expect(f.find((x) => x.familia === 'TERCA')).toMatchObject({ fabricacao: 1200, solda: 0 });
    expect(f.find((x) => x.familia === 'COLUNA')).toMatchObject({ solda: 400 });
  });
});
