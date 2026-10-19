import { describe, it, expect } from 'vitest';
import {
  familiaDe, configRotas, aplicarRotas, calibrarRitmos, hhtPadrao, hhtObservado, grupoModelo,
  desempenhoPessoas, referenciaEtapas, resumoFamilias, HORAS_DIA_PADRAO,
} from './biDesempenho';

const d = (dia) => new Date(2026, 9, dia); // out/2026: 12 e 13 são seg/ter
const funcionarios = [
  { id: 'A', nome: 'Ana', equipe_nome: 'Fábrica' },
  { id: 'B', nome: 'Bruno', equipe_nome: 'Fábrica' },
  { id: 'S', nome: 'Sol', equipe_nome: 'Fábrica' },
];
const ev = (setor, dia, kg, f, tipo, peca = `${f}${dia}${tipo}${setor}`) => ({ setor, data: d(dia), kg, qtd: 1, pecaId: peca, obraId: 'o1', funcionarioId: f, tipo });

const eventos = [
  // histórico antigo (só para a data do 1º apontamento)
  ev('fabricacao', 5, 100, 'A', 'TERÇA'), ev('fabricacao', 5, 10, 'B', 'TIRANTE'), ev('solda', 5, 10, 'S', 'COLUNA'),
  // período: seg 12 e ter 13
  ev('fabricacao', 12, 2000, 'A', 'TERÇA'), ev('fabricacao', 13, 1000, 'A', 'TERÇA'), // 3 t × 6 Hh/t = 18 Hh
  ev('fabricacao', 12, 300, 'B', 'Tirante'), ev('fabricacao', 13, 300, 'B', 'TIRANTE'), // 0,6 t × 35 = 21 Hh
  ev('solda', 12, 500, 'S', 'TERÇA'), // terça não tem solda → sai
  ev('solda', 13, 1000, 'S', 'COLUNA'), // 1 t × 8 = 8 Hh
];

describe('biDesempenho (horas-padrão)', () => {
  it('família e grupo do modelo', () => {
    expect(familiaDe(' Terça-TAP ')).toBe('TERCA-TAP');
    expect(grupoModelo('TERCA-TAP').grupo).toMatch(/Terça/);
    expect(grupoModelo('VIGA-MESTRA').grupo).toBe('Viga-mestra');
    expect(grupoModelo('VIGA').grupo).toBe('Viga laminada');
    expect(grupoModelo('TIRANTE RIGIDO').grupo).toBe('Tirante');
    expect(grupoModelo('XYZ').grupo).toBe('Outros');
  });

  it('Hh/t: modelo, ajuste manual e solda que não se aplica', () => {
    const cfg = configRotas();
    expect(hhtPadrao('fabricacao', 'TERCA', cfg)).toMatchObject({ hht: 6, fonte: 'modelo' });
    expect(hhtPadrao('solda', 'TERCA', cfg)).toMatchObject({ hht: null, fonte: 'nao_aplica' });
    expect(hhtPadrao('fabricacao', 'XYZ', cfg)).toMatchObject({ hht: 14, fonte: 'padrao' });
    expect(hhtPadrao('fabricacao', 'TERCA', configRotas({ hht: { fabricacao: { TERCA: 9 } } }))).toMatchObject({ hht: 9, fonte: 'ajuste' });
    expect(cfg.horasDia).toBe(HORAS_DIA_PADRAO);
  });

  it('rota sem solda remove a solda de terça', () => {
    const { eventos: ev2, removidos } = aplicarRotas(eventos, configRotas());
    expect(removidos).toMatchObject({ eventos: 1, kg: 500, pecas: 1 });
    expect(ev2.filter((e) => e.setor === 'solda').every((e) => e.familia === 'COLUNA')).toBe(true);
  });

  it('eficiência = Hh-padrão ÷ horas disponíveis; mix trabalhoso pesa mais que kg', () => {
    const { eventos: ev2 } = aplicarRotas(eventos, configRotas());
    const r = desempenhoPessoas(ev2, funcionarios, { ini: d(12), fim: d(13), iniAnt: d(5), fimAnt: d(9), hoje: d(15) });
    const ana = r.find((p) => p.id === 'A');
    const bruno = r.find((p) => p.id === 'B');
    const horas = 2 * HORAS_DIA_PADRAO; // 17,6 h
    expect(ana).toMatchObject({ kg: 3000, hh: 18, diasUteis: 2, horasDisp: 17.6, etapaPrincipal: 'fabricacao', familiaPrincipal: 'TERÇA', hhtMedio: 6 });
    expect(ana.eficiencia).toBeCloseTo((18 / horas) * 100, 0);
    // Bruno fez 1/5 do kg da Ana, mas mais horas-padrão (tirante)
    expect(bruno).toMatchObject({ kg: 600, hh: 21, hhtMedio: 35 });
    expect(bruno.eficiencia).toBeGreaterThan(ana.eficiencia);
    expect(bruno.posicao).toBe(1);
    expect(r.find((p) => p.id === 'S')).toMatchObject({ kg: 1000, hh: 8, etapaPrincipal: 'solda', vsEquipe: 100 });
    expect(bruno.tendencia).toHaveLength(8);
    const ref = referenciaEtapas(r);
    expect(ref.fabricacao).toMatchObject({ pessoas: 2, regulares: 2, hh: 39 });
  });

  it('ritmo observado só como comparação (Hh/t equivalente)', () => {
    const { eventos: ev2 } = aplicarRotas(eventos, configRotas());
    const calib = calibrarRitmos(ev2, funcionarios, { minDias: 2 });
    expect(calib.fabricacao.familias.TERCA.mediana).toBe(1000);
    expect(hhtObservado('fabricacao', 'TERCA', calib)).toMatchObject({ hht: 8.8, dias: 3 });
    expect(hhtObservado('pintura', 'TERCA', calib)).toBeNull();
  });

  it('resumo por família', () => {
    const { eventos: ev2 } = aplicarRotas(eventos, configRotas());
    const f = resumoFamilias(ev2, { ini: d(12), fim: d(13) });
    expect(f.find((x) => x.familia === 'TERCA')).toMatchObject({ fabricacao: 3000, solda: 0 });
    expect(f.find((x) => x.familia === 'COLUNA')).toMatchObject({ solda: 1000 });
  });
});
