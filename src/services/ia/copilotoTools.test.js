import { describe, it, expect } from 'vitest';
import { criarExecutor, resolverObra } from './copilotoTools';
import { transicoesComPeca } from '../bi/biProducao';

const HOJE = new Date(2026, 9, 5);
const obras = [
  { id: 'obra-001', codigo: '2026-01', nome: 'SUPER LUNA - BELO VALE', status: 'ativo', contratoValorTotal: 1000000, contratoPesoTotal: 10000, dataInicio: '2026-08-03', dataPrevistaFim: '2026-12-31' },
  { id: 'obra-002', codigo: '2026-02', nome: 'GALPÃO WALTINHO', status: 'ativo', contratoValorTotal: 200000, contratoPesoTotal: 5000 },
];
const pecas = [
  { id: 'p1', obraId: 'obra-001', etapa: 'expedido', pesoTotal: 3000, marca: 'C1A', quantidade: 1 },
  { id: 'p2', obraId: 'obra-001', etapa: 'solda', pesoTotal: 1000, marca: 'VM50A', quantidade: 2 },
  { id: 'p3', obraId: 'obra-002', etapa: 'aguardando', pesoTotal: 500, marca: 'X1', quantidade: 1 },
];
const historico = [
  { peca_id: 'p1', etapa_de: 'pintura', etapa_para: 'expedido', data_inicio: '2026-09-30', funcionario_nome: 'Ana' },
  { peca_id: 'p2', etapa_de: 'fabricacao', etapa_para: 'solda', data_inicio: '2026-08-01' },
];
const medicoes = [{ id: 'm1', obraId: 'obra-001', numero: 1, status: 'paga', valorBruto: 300000, dataMedicao: '2026-09-01' }];
const lancamentos = [
  { id: 'd1', obraId: null, valor: 1000, status: 'pendente', categoria: 'Energia', fornecedor: 'CEMIG', dataEmissao: '2026-09-01', dataVencimento: '2026-09-10' },
  { id: 'd2', obraId: 'obra-001', valor: 5000, status: 'pago', categoria: 'Matéria Prima', fornecedor: 'Aço SA', dataEmissao: '2026-09-02' },
];

const ex = (obraIdsEscopo = null) => criarExecutor({
  obras, pecas, medicoes, lancamentos, receitasManuais: [], estoque: [{ descricao: 'Chapa 3/16', quantidade: 0, minimo: 5, preco: 10 }],
  transicoes: transicoesComPeca(historico, pecas), obraIdsEscopo, alertas: [{ severidade: 'alto', regra: 'x', titulo: 'T', detalhe: 'D', obraId: 'obra-001' }], hoje: HOJE,
});

describe('copilotoTools', () => {
  it('resolve obra por id, código ou nome sem acento', () => {
    expect(resolverObra(obras, 'obra-002').id).toBe('obra-002');
    expect(resolverObra(obras, '2026-01').id).toBe('obra-001');
    expect(resolverObra(obras, 'galpao').id).toBe('obra-002');
    expect(resolverObra(obras, 'inexistente')).toBeNull();
  });
  it('detalhar_obra usa o motor do BI', () => {
    const r = ex()('detalhar_obra', { obra: 'super luna' });
    expect(r.id).toBe('obra-001');
    expect(r.kg_pronto).toBe(3000);
    expect(r.recebido).toBe(300000);
    expect(r.material_por_categoria['Matéria Prima']).toBe(5000);
    expect(r.pecas_por_etapa.solda.kg).toBe(1000);
  });
  it('buscar_pecas filtra paradas e respeita o escopo do topo', () => {
    const r = ex(['obra-001'])('buscar_pecas', { parada_dias_min: 30 });
    expect(r.pecas.map((p) => p.marca)).toEqual(['VM50A']);
    expect(ex(['obra-002'])('buscar_pecas', {}).total).toBe(1);
  });
  it('lancamentos: Geral = caixa da empresa (material de obra fora) e status vencido', () => {
    const r = ex()('lancamentos', { tipo: 'despesa', status: 'vencido' });
    expect(r.lancamentos.map((l) => l.fornecedor)).toEqual(['CEMIG']);
    const obra = ex()('lancamentos', { tipo: 'despesa', obra: 'obra-001' });
    expect(obra.total).toBe(5000);
  });
  it('erros viram resultado (nunca lança) e nulls são ignorados', () => {
    expect(ex()('nao_existe', {}).erro).toMatch(/desconhecida/);
    expect(ex()('producao', { obra: 'xyz' }).erro).toMatch(/não encontrada/);
    expect(ex()('producao', { obra: null, semanas: null }).kg_por_semana).toHaveLength(8);
  });
  it('estoque e alertas', () => {
    expect(ex()('estoque', { so_alerta: true }).itens[0].saude).toBe('zerado');
    expect(ex()('alertas', { severidade: 'alto' }).total).toBe(1);
  });
});
