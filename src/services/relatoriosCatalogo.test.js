import { describe, it, expect } from 'vitest';
import {
  proximaExecucao, descreverFrequencia, validarAgendamento, normalizarAgendamento, fmtDataHoraBRT,
  linhasMovimentos, planilhasFinanceiro, csvAlertas, contarAlertas, secoesResumoAgendado, resumoExecutivo,
  nomeArquivo, catalogoPorId, montarResumoExecutivoPDF,
} from './relatoriosCatalogo';

// 2026-10-05 é uma segunda-feira. 13:30Z = 10:30 em Brasília.
const AGORA = new Date('2026-10-05T13:30:00Z');

describe('proximaExecucao (regra do motor, horário de Brasília)', () => {
  it('diária: hora ainda não passou hoje → hoje', () => {
    const p = proximaExecucao({ ativo: true, frequencia: 'diaria', hora: 18 }, AGORA);
    expect(p.toISOString()).toBe('2026-10-05T21:00:00.000Z');
  });
  it('diária: hora já passou → amanhã', () => {
    const p = proximaExecucao({ ativo: true, frequencia: 'diaria', hora: 7 }, AGORA);
    expect(p.toISOString()).toBe('2026-10-06T10:00:00.000Z');
  });
  it('diária: já executou hoje → amanhã', () => {
    const p = proximaExecucao({ ativo: true, frequencia: 'diaria', hora: 18, ultima_execucao: '2026-10-05T12:00:00Z' }, AGORA);
    expect(p.toISOString()).toBe('2026-10-06T21:00:00.000Z');
  });
  it('semanal: sexta (5) às 8h', () => {
    const p = proximaExecucao({ ativo: true, frequencia: 'semanal', dia_semana: 5, hora: 8 }, AGORA);
    expect(fmtDataHoraBRT(p)).toBe('09/10/2026 08:00');
  });
  it('semanal: segunda já passada → próxima segunda', () => {
    const p = proximaExecucao({ ativo: true, frequencia: 'semanal', dia_semana: 1, hora: 7 }, AGORA);
    expect(fmtDataHoraBRT(p)).toBe('12/10/2026 07:00');
  });
  it('mensal: dia 1 → 1º do mês seguinte', () => {
    const p = proximaExecucao({ ativo: true, frequencia: 'mensal', dia_mes: 1, hora: 6 }, AGORA);
    expect(fmtDataHoraBRT(p)).toBe('01/11/2026 06:00');
  });
  it('hora 0 de Brasília vira 03:00Z', () => {
    const p = proximaExecucao({ ativo: true, frequencia: 'diaria', hora: 0 }, AGORA);
    expect(p.toISOString()).toBe('2026-10-06T03:00:00.000Z');
  });
  it('inativo → null', () => {
    expect(proximaExecucao({ ativo: false, frequencia: 'diaria', hora: 7 }, AGORA)).toBeNull();
  });
});

describe('agendamento: descrição, validação e normalização', () => {
  it('descreve', () => {
    expect(descreverFrequencia({ frequencia: 'semanal', dia_semana: 1, hora: 7 })).toBe('Toda segunda às 07h');
    expect(descreverFrequencia({ frequencia: 'mensal', dia_mes: 10, hora: 9 })).toBe('Todo dia 10 do mês às 09h');
  });
  it('valida campos obrigatórios e limites', () => {
    const r = validarAgendamento({ nome: ' ', tipo: 'x', frequencia: 'mensal', hora: 24, dia_mes: 31 });
    expect(r.ok).toBe(false);
    expect(Object.keys(r.erros).sort()).toEqual(['dia_mes', 'hora', 'nome', 'tipo']);
    expect(validarAgendamento({ nome: 'A', tipo: 'executivo', frequencia: 'semanal', dia_semana: 3, hora: 7 }).ok).toBe(true);
  });
  it('normaliza: "geral" e "todos" viram null; campos fora da frequência viram null', () => {
    const n = normalizarAgendamento({ nome: ' X ', tipo: 'estoque', obra_id: 'geral', frequencia: 'diaria', dia_semana: 3, dia_mes: 4, hora: '7', ativo: 1, destino_role: 'todos' });
    expect(n).toEqual({ nome: 'X', tipo: 'estoque', obra_id: null, frequencia: 'diaria', dia_semana: null, dia_mes: null, hora: 7, ativo: true, destino_role: null });
  });
});

describe('financeiro e alertas', () => {
  const fin = {
    geralEmpresa: true,
    receitas: [{ origem: 'medicao', obraId: 'obra-001', data: new Date(2026, 8, 10), vencimento: new Date(2026, 9, 10), valor: 1000, recebido: false, descricao: 'Med 1' }],
    despesas: [{ obraId: null, categoria: 'Aço', fornecedor: 'Gerdau', data: new Date(2026, 8, 1), vencimento: new Date(2026, 8, 30), valor: 400, pago: true, descricao: 'Chapa' }],
    mensal: [{ mes: '2026-09', faturado: 1000, recebido: 0, despesas: 400, pago: 400, resultado: 600 }],
    aging: { faixas: [{ rotulo: 'A vencer', receber: 1000, pagar: 0 }], receberVencido: 0, pagarVencido: 0 },
    fluxo: [{ semana: '2026-10-05', entradas: 1000, saidas: 0, saldo: 1000, acumulado: 1000 }],
  };
  it('movimentos: despesa negativa, ordenados por data, data em pt-BR', () => {
    const l = linhasMovimentos(fin, () => 'Super Luna');
    expect(l.map((x) => x.tipo)).toEqual(['Despesa', 'Receita']);
    expect(l[0].valor).toBe(-400);
    expect(l[0].obra).toBe('Fábrica (sem obra)');
    expect(l[1].obra).toBe('Super Luna');
    expect(l[1].data).toBe('10/09/2026');
  });
  it('planilhas trazem a regra do caixa da empresa', () => {
    const p = planilhasFinanceiro(fin, { nomeObra: () => 'X', escopoRotulo: 'Geral' });
    expect(Object.keys(p)).toEqual(['Movimentos', 'Mensal', 'Aging', 'Fluxo 8 semanas']);
    expect(p.Movimentos[2][0]).toMatch(/caixa da EMPRESA/);
  });
  it('CSV com BOM, ";" e escape de aspas', () => {
    const csv = csvAlertas([{ severidade: 'critico', regra: 'despesa_vencida', obraId: null, titulo: 'Conta "X"; vencida', valor: 12.5 }]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    const linha = csv.split('\r\n')[1];
    expect(linha).toContain('Crítico;Financeiro;Conta a pagar vencida;;"Conta ""X""; vencida"');
    expect(linha).toContain(';12,5;');
  });
  it('conta alertas por severidade', () => {
    expect(contarAlertas([{ severidade: 'alto' }, { severidade: 'alto' }, { severidade: 'baixo' }])).toEqual({ total: 3, critico: 0, alto: 2, medio: 0, baixo: 1 });
  });
});

describe('resumo agendado', () => {
  it('converte o JSON do motor em seções ordenadas', () => {
    const s = secoesResumoAgendado({
      producao: { por_etapa: { pintura: { pecas: 2, kg: 100 }, fabricacao: { pecas: 3, kg: 50 } }, kg_prontos_7d: 80, movimentacoes_7d: 5 },
      financeiro: { regra: 'caixa da empresa', a_pagar_vencido: 10, qtd_vencidas: 1, a_pagar_7d: 0, a_receber_medicoes: 0, faturado_mes: 0 },
    });
    expect(s.map((x) => x.id)).toEqual(['producao', 'financeiro']);
    expect(s[0].porEtapa.map((e) => e.etapa)).toEqual(['fabricacao', 'pintura']);
    expect(s[0].itens.find((i) => i.rotulo === 'Peso total').valor).toBe(150);
    expect(s[1].itens[0].alerta).toBe(true);
  });
  it('vazio → sem seções', () => {
    expect(secoesResumoAgendado(null)).toEqual([]);
  });
});

describe('utilidades', () => {
  it('nome de arquivo sem acentos e com data local', () => {
    expect(nomeArquivo('alertas', 'Geral (todas as obras)', 'csv', new Date(2026, 9, 5))).toBe('alertas_Geral_todas_as_obras_2026-10-05.csv');
  });
  it('catálogo: produção exige obra', () => {
    expect(catalogoPorId('producao').exigeObra).toBe(true);
    expect(catalogoPorId('estoque').exigeObra).toBe(false);
  });
  it('resumoExecutivo tolera dados vazios', () => {
    const r = resumoExecutivo({});
    expect(r.executivo.obras_ativas).toBe(0);
    expect(r.alertas.total).toBe(0);
  });
});

describe('PDF executivo', () => {
  it('gera documento com dados mínimos e leitura da IA', async () => {
    const dados = {
      obras: { executivo: { obrasAtivas: 1 }, indicadores: [{ ativa: true, nome: 'Obra A', codigo: 'A', valorContrato: 1000, fisicoPct: 50, financeiroPct: 40, gapPp: -10, ritmoKgSemana: 100, previsaoFim: '2026-12-01', prazo: '2026-11-01', atrasoDias: 30 }] },
      producao: { tendencia: { kgSemanaAtual: 100 }, gargalo: { etapa: 'solda', linhas: [{ etapa: 'solda', wipKg: 10, saidaKgSemana: 0, semanasFila: null, travada: true }] }, wip: { resumo: [{ etapa: 'solda', pecas: 1, kg: 10, idadeMedianaDias: 3 }] } },
      financeiro: { geralEmpresa: false, aging: { faixas: [], receberVencido: 0, pagarVencido: 0 }, fluxo: [] },
      suprimentos: { kpis: { nItens: 2 } },
      alertas: [{ severidade: 'alto', regra: 'obra_atraso', titulo: 'Obra A atrasada' }],
    };
    const { doc, paginas, nome } = await montarResumoExecutivoPDF(dados, { escopoRotulo: 'A | Obra A', leituraIA: 'Texto da IA.', hoje: new Date(2026, 9, 5) });
    expect(paginas).toBeGreaterThanOrEqual(1);
    expect(doc.getNumberOfPages()).toBe(paginas);
    expect(nome).toBe('resumo_executivo_A_Obra_A_2026-10-05.pdf');
  });
});
