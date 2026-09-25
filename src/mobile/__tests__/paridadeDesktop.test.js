// ============================================================
// Paridade MOBILE × DESKTOP — formatação, datas locais e agregação
// ============================================================
// Garante que as telas mobile usam a MESMA base do Kanban/Estoque desktop:
//  - peso em kg pt-BR (nunca toneladas);
//  - "hoje" no fuso local (toISOString virava amanhã após 21h no Brasil);
//  - agregação por etapa via pesoPeca/etapaPeca (sem dobrar peso × qtd).
import { describe, it, expect } from 'vitest';
import { fmtPeso, fmtPesoCurto, fmtNum, hojeLocalISO } from '../ui/format';
import { etapaPeca, pesoPeca, qtdPeca, resumoProducao, estadoProducao } from '@/services/relatorioProducao';
import { pesoDe } from '../dados';

describe('format — peso em kg (padrão do ERP)', () => {
  it('fmtPeso: inteiro, pt-BR, sufixo kg', () => {
    expect(fmtPeso(27738.4)).toBe('27.738 kg');
    expect(fmtPeso(0)).toBe('0 kg');
    expect(fmtPeso(null)).toBe('0 kg');
  });
  it('fmtPesoCurto: compacta só acima de 10 t (rótulo de gráfico)', () => {
    expect(fmtPesoCurto(9500)).toBe('9.500');
    expect(fmtPesoCurto(27738)).toBe('27,7k');
  });
  it('fmtNum respeita casas decimais', () => {
    expect(fmtNum(1234.567, 1)).toBe('1.234,6');
  });
});

describe('hojeLocalISO — data LOCAL, não UTC', () => {
  it('usa ano/mês/dia locais (23h59 local não vira o dia seguinte)', () => {
    const d = new Date(2026, 8, 25, 23, 59, 0); // 25/09/2026 23:59 local
    expect(hojeLocalISO(d)).toBe('2026-09-25');
    // toISOString em UTC-3 daria 2026-09-26 — o bug que corrigimos
    if (d.getTimezoneOffset() > 0) expect(d.toISOString().slice(0, 10)).toBe('2026-09-26');
  });
  it('zero à esquerda em mês/dia', () => {
    expect(hojeLocalISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

// Peça no formato do ERPContext (transforms.js): `peso` = peso_total,
// pesoUnitario separado. A tela antiga fazia peso × quantidade → dobrava.
const pecaCtx = (over = {}) => ({ id: 'PEC-0001', marca: 'C1A', quantidade: 3, pesoUnitario: 100, pesoTotal: 300, peso: 300, etapa: 'solda', ...over });

describe('agregação por etapa — mesma base do Kanban desktop', () => {
  it('pesoPeca usa peso_total (não multiplica por quantidade de novo)', () => {
    expect(pesoPeca(pecaCtx())).toBe(300);
    expect(pesoDe(pecaCtx())).toBe(300);
    expect(qtdPeca(pecaCtx())).toBe(3);
  });
  it('etapaPeca normaliza etapas legadas para aguardando (soma fecha 100%)', () => {
    expect(etapaPeca({ etapa: 'corte' })).toBe('aguardando');
    expect(etapaPeca({ etapa: 'SOLDA' })).toBe('solda');
    expect(etapaPeca({})).toBe('aguardando');
  });
  it('resumo/estado: já fabricado = solda em diante; concluído = enviado+entregue', () => {
    const pecas = [
      pecaCtx({ id: 'a', etapa: 'aguardando', pesoTotal: 100, peso: 100 }),
      pecaCtx({ id: 'b', etapa: 'fabricacao', pesoTotal: 100, peso: 100 }),
      pecaCtx({ id: 'c', etapa: 'solda', pesoTotal: 100, peso: 100 }),
      pecaCtx({ id: 'd', etapa: 'enviado', pesoTotal: 100, peso: 100 }),
      pecaCtx({ id: 'e', etapa: 'corte', pesoTotal: 100, peso: 100 }), // legado → aguardando
    ];
    const r = resumoProducao(pecas);
    const e = estadoProducao(pecas);
    expect(r.totalPeso).toBe(500);
    expect(r.pesoConcluido).toBe(100);
    expect(e.jaFabricado.peso).toBe(200);
    expect(e.emProcesso.peso).toBe(200);
    expect(e.naoIniciado.peso).toBe(200);
    // % das etapas soma 100 (nenhuma peça "some" por etapa desconhecida)
    const soma = r.porEtapa.reduce((s, x) => s + x.pct, 0);
    expect(Math.round(soma)).toBe(100);
  });
});
