/**
 * MONTEX ERP - Hook Central de Inteligência Financeira
 *
 * Centraliza TODOS os cálculos financeiros usados por múltiplos módulos:
 * - Metas Financeiras, Análise de Custos, Centros de Custo
 * - BI Estratégico, Tático, Operacional
 * - Sugestões IA
 */

import { useMemo } from 'react';
import { useLancamentos, useObras, useProducao, useMedicoes, useEstoque } from '@/contexts/ERPContext';

// Taxas de receita por etapa (R$/kg)
const TAXA_ETAPA = {
  CORTE: 1.20,
  FABRICACAO: 2.50,
  SOLDA: 3.00,
  PINTURA: 1.80,
  EXPEDIDO: 0
};

// Mapeamento categoria → centro de custo
const CATEGORIA_CENTRO = {
  'Matéria Prima': [{ centro: 'CC-001', nome: 'Corte', peso: 1.0 }],
  'Mão de Obra': [{ centro: 'CC-002', nome: 'Fabricação', peso: 0.5 }, { centro: 'CC-003', nome: 'Solda', peso: 0.5 }],
  'Energia/Utilidades': [{ centro: 'CC-001', nome: 'Corte', peso: 0.6 }, { centro: 'CC-004', nome: 'Pintura', peso: 0.4 }],
  'Manutenção': [{ centro: 'CC-002', nome: 'Fabricação', peso: 1.0 }],
  'Transporte': [{ centro: 'CC-006', nome: 'Transporte/Logística', peso: 1.0 }],
  'Administrativo': [{ centro: 'CC-005', nome: 'Administrativo', peso: 1.0 }],
  'Impostos': [{ centro: 'CC-005', nome: 'Administrativo', peso: 1.0 }],
  'consumiveis': [{ centro: 'CC-002', nome: 'Fabricação', peso: 0.5 }, { centro: 'CC-003', nome: 'Solda', peso: 0.5 }],
  'fabricacao': [{ centro: 'CC-002', nome: 'Fabricação', peso: 1.0 }]
};

// Centros de custo pré-configurados
const CENTROS_CUSTO_CONFIG = [
  { id: 'CC-001', nome: 'Corte', responsavel: 'Supervisor Corte', orcamentoBase: 0.25, categorias: ['Matéria Prima', 'Energia/Utilidades'], cor: '#3B82F6' },
  { id: 'CC-002', nome: 'Fabricação', responsavel: 'Supervisor Fabricação', orcamentoBase: 0.22, categorias: ['Mão de Obra', 'Manutenção', 'consumiveis', 'fabricacao'], cor: '#10B981' },
  { id: 'CC-003', nome: 'Solda', responsavel: 'Supervisor Solda', orcamentoBase: 0.18, categorias: ['Mão de Obra', 'consumiveis'], cor: '#F59E0B' },
  { id: 'CC-004', nome: 'Pintura', responsavel: 'Supervisor Pintura', orcamentoBase: 0.10, categorias: ['Energia/Utilidades'], cor: '#8B5CF6' },
  { id: 'CC-005', nome: 'Administrativo', responsavel: 'Gerente Admin', orcamentoBase: 0.15, categorias: ['Administrativo', 'Impostos'], cor: '#EF4444' },
  { id: 'CC-006', nome: 'Transporte/Logística', responsavel: 'Coord. Logística', orcamentoBase: 0.10, categorias: ['Transporte'], cor: '#06B6D4' }
];

// Helpers
const formatMesAno = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getMesLabel = (mesKey) => {
  const [ano, mes] = mesKey.split('-');
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${meses[parseInt(mes) - 1]}/${ano.slice(2)}`;
};

const getSemanaAno = (date) => {
  const d = new Date(date);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - startOfYear) / 86400000);
  return `${d.getFullYear()}-S${String(Math.ceil((days + startOfYear.getDay() + 1) / 7)).padStart(2, '0')}`;
};

// Cores por categoria
const CORES_CATEGORIA = {
  'Matéria Prima': '#3B82F6',
  'Mão de Obra': '#10B981',
  'Energia/Utilidades': '#F59E0B',
  'Manutenção': '#EF4444',
  'Transporte': '#8B5CF6',
  'Administrativo': '#06B6D4',
  'Impostos': '#F97316'
};

// Normalizar categorias de diferentes fontes
const normalizarCategoria = (cat, descricao = '') => {
  if (!cat) return 'Administrativo';
  const catLower = cat.toLowerCase();
  const descLower = (descricao || '').toLowerCase();

  if (catLower.includes('matéria') || catLower.includes('materia') || catLower === 'consumiveis') return 'Matéria Prima';
  if (catLower.includes('mão') || catLower.includes('mao') || catLower === 'mao_de_obra') return 'Mão de Obra';
  if (catLower.includes('energia') || catLower.includes('utilidade') || descLower.includes('cemig') || descLower.includes('copasa')) return 'Energia/Utilidades';
  if (catLower.includes('manuten')) return 'Manutenção';
  if (catLower.includes('transport') || catLower.includes('combust') || catLower.includes('locação') || catLower.includes('locacao')) return 'Transporte';
  if (catLower.includes('imposto') || catLower.includes('tribut')) return 'Impostos';
  if (catLower === 'fabricacao') return 'Mão de Obra';
  return 'Administrativo';
};

export function useFinancialIntelligence(filtros = {}) {
  const { lancamentosDespesas } = useLancamentos();
  const { obras } = useObras();
  const { pecas } = useProducao();
  const { medicoes } = useMedicoes();

  const { periodo = 'geral', categoria: filtroCat, centroCusto: filtroCentro } = filtros;

  return useMemo(() => {
    // ========================================
    // 1. PREPARAR DESPESAS (SOMENTE GERAIS - sem vínculo a obra)
    // IMPORTANTE: Despesas vinculadas a obras ficam EXCLUSIVAMENTE
    // no módulo Gestão Financeira Obra. Aqui só entram despesas
    // gerais da empresa (obra_id = NULL).
    // ========================================
    const despesas = (lancamentosDespesas || [])
      .filter(l => l.tipo !== 'receita' && !l.obraId && !l.obra_id)
      .map(l => ({
        ...l,
        valor: parseFloat(l.valor) || 0,
        data: l.dataEmissao || l.data_emissao || l.data || l.createdAt,
        categoriaNorm: normalizarCategoria(l.categoria, l.descricao),
        mes: formatMesAno(l.dataEmissao || l.data_emissao || l.data || l.createdAt),
        semana: getSemanaAno(l.dataEmissao || l.data_emissao || l.data || l.createdAt)
      }))
      .filter(l => l.valor > 0 && l.data);

    // ========================================
    // 2. FILTRAR POR PERÍODO
    // ========================================
    const now = new Date();
    const mesAtual = formatMesAno(now);
    let despesasFiltradas = despesas;

    if (periodo === 'mensal' || periodo === 'mes_atual') {
      despesasFiltradas = despesas.filter(d => d.mes === mesAtual);
    } else if (periodo === 'semanal') {
      const semanaAtual = getSemanaAno(now);
      despesasFiltradas = despesas.filter(d => d.semana === semanaAtual);
    } else if (periodo === 'trimestral') {
      const tri = Math.floor(now.getMonth() / 3);
      despesasFiltradas = despesas.filter(d => {
        const dd = new Date(d.data);
        return dd.getFullYear() === now.getFullYear() && Math.floor(dd.getMonth() / 3) === tri;
      });
    } else if (periodo === 'anual') {
      despesasFiltradas = despesas.filter(d => new Date(d.data).getFullYear() === now.getFullYear());
    }
    // 'geral' = sem filtro

    if (filtroCat) {
      despesasFiltradas = despesasFiltradas.filter(d => d.categoriaNorm === filtroCat);
    }

    // ========================================
    // 3. TOTAIS BÁSICOS
    // ========================================
    const custoTotal = despesasFiltradas.reduce((sum, d) => sum + d.valor, 0);
    const custoTotalGeral = despesas.reduce((sum, d) => sum + d.valor, 0);

    // ========================================
    // 4. PRODUÇÃO (de peças)
    // ========================================
    const pecasArr = pecas || [];
    // IMPORTANTE: peso_total já é peso_unitario × quantidade no Supabase.
    // NÃO multiplicar por quantidade novamente!
    const pesoTotalPecas = pecasArr.reduce((sum, p) => {
      const pesoTotal = parseFloat(p.pesoTotal) || parseFloat(p.peso) || 0;
      // Se pesoTotal > 0, usar direto (já inclui quantidade)
      // Se não, usar pesoUnitario × quantidade como fallback
      if (pesoTotal > 0) return sum + pesoTotal;
      const pesoUnit = parseFloat(p.pesoUnitario) || parseFloat(p.pesoUnit) || 0;
      return sum + pesoUnit * (parseInt(p.quantidade) || 1);
    }, 0);

    // Produção por etapa
    const producaoPorEtapa = {};
    pecasArr.forEach(p => {
      const etapa = (p.etapa || 'CORTE').toUpperCase();
      const pesoTotal = parseFloat(p.pesoTotal) || parseFloat(p.peso) || 0;
      const peso = pesoTotal > 0 ? pesoTotal : (parseFloat(p.pesoUnitario) || parseFloat(p.pesoUnit) || 0) * (parseInt(p.quantidade) || 1);
      if (!producaoPorEtapa[etapa]) producaoPorEtapa[etapa] = { kg: 0, pecas: 0 };
      producaoPorEtapa[etapa].kg += peso;
      producaoPorEtapa[etapa].pecas += parseInt(p.quantidade) || 1;
    });

    // Receita estimada (produção × taxa por etapa)
    let receitaEstimada = 0;
    Object.entries(producaoPorEtapa).forEach(([etapa, dados]) => {
      const taxa = TAXA_ETAPA[etapa] || 0;
      receitaEstimada += dados.kg * taxa;
    });

    // ========================================
    // 5. EVOLUÇÃO MENSAL
    // ========================================
    const mesesMap = {};
    despesas.forEach(d => {
      if (!mesesMap[d.mes]) mesesMap[d.mes] = { custo: 0, count: 0 };
      mesesMap[d.mes].custo += d.valor;
      mesesMap[d.mes].count++;
    });

    // Distribuir produção por meses reais de produção (baseado nas peças, não nas despesas)
    const mesesOrdenados = Object.keys(mesesMap).sort();
    const numMesesDespesas = mesesOrdenados.length || 1;

    // Calcular meses de produção real baseado nas datas das peças
    const pecasDatas = pecasArr.map(p => p.createdAt || p.created_at).filter(Boolean);
    let numMesesProducao = 2; // default: 2 meses conforme produção real
    if (pecasDatas.length > 0) {
      const pecasMeses = new Set(pecasDatas.map(d => formatMesAno(d)));
      numMesesProducao = Math.max(pecasMeses.size, 1);
    }
    const producaoMensal = pesoTotalPecas / numMesesProducao;

    const evolucaoMensal = mesesOrdenados.map(mes => {
      const custoMes = mesesMap[mes].custo;
      const receitaMes = producaoMensal * (TAXA_ETAPA.CORTE + TAXA_ETAPA.FABRICACAO + TAXA_ETAPA.SOLDA + TAXA_ETAPA.PINTURA);
      const custoPerKg = producaoMensal > 0 ? custoMes / producaoMensal : 0;
      const margem = receitaMes > 0 ? ((receitaMes - custoMes) / receitaMes) * 100 : 0;

      return {
        mes,
        mesLabel: getMesLabel(mes),
        custo: custoMes,
        receita: receitaMes,
        producaoKg: producaoMensal,
        custoPerKg,
        margem,
        count: mesesMap[mes].count
      };
    });

    // ========================================
    // 6. CUSTOS POR CATEGORIA
    // ========================================
    const catMap = {};
    despesasFiltradas.forEach(d => {
      if (!catMap[d.categoriaNorm]) catMap[d.categoriaNorm] = { valor: 0, count: 0 };
      catMap[d.categoriaNorm].valor += d.valor;
      catMap[d.categoriaNorm].count++;
    });

    // Variação MoM por categoria
    const catMapAnterior = {};
    const mesAnteriorKey = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return formatMesAno(d);
    })();
    despesas.filter(d => d.mes === mesAnteriorKey).forEach(d => {
      if (!catMapAnterior[d.categoriaNorm]) catMapAnterior[d.categoriaNorm] = 0;
      catMapAnterior[d.categoriaNorm] += d.valor;
    });

    const custosPorCategoria = Object.entries(catMap)
      .map(([cat, data]) => {
        const anterior = catMapAnterior[cat] || data.valor;
        const variacao = anterior > 0 ? ((data.valor - anterior) / anterior) * 100 : 0;
        return {
          categoria: cat,
          nome: cat,
          valor: data.valor,
          count: data.count,
          percentual: custoTotal > 0 ? (data.valor / custoTotal) * 100 : 0,
          variacao_mom: variacao,
          cor: CORES_CATEGORIA[cat] || '#94A3B8'
        };
      })
      .sort((a, b) => b.valor - a.valor);

    // ========================================
    // 7. CUSTOS POR CENTRO DE CUSTO
    // ========================================
    const centroMap = {};
    CENTROS_CUSTO_CONFIG.forEach(c => {
      centroMap[c.id] = { ...c, gasto: 0, lancamentos: [] };
    });

    despesasFiltradas.forEach(d => {
      // Priorizar a categoria normalizada para lookup no CATEGORIA_CENTRO
      // As categorias do Supabase (mao_de_obra, fabricacao, etc) são normalizadas em categoriaNorm
      const centros = CATEGORIA_CENTRO[d.categoriaNorm] || CATEGORIA_CENTRO[d.categoria] || [{ centro: 'CC-005', nome: 'Administrativo', peso: 1.0 }];
      centros.forEach(({ centro, peso }) => {
        if (centroMap[centro]) {
          centroMap[centro].gasto += d.valor * peso;
          centroMap[centro].lancamentos.push({ ...d, valorAlocado: d.valor * peso });
        }
      });
    });

    // Orçamento = % base × custo total geral
    const orcamentoTotal = custoTotalGeral * 1.1; // 10% acima dos gastos reais como referência
    const custosPorCentro = Object.values(centroMap).map(c => {
      const orcamento = orcamentoTotal * c.orcamentoBase;
      const utilizacao = orcamento > 0 ? (c.gasto / orcamento) * 100 : 0;
      return {
        id: c.id,
        nome: c.nome,
        responsavel: c.responsavel,
        cor: c.cor,
        categorias: c.categorias,
        orcamento,
        gasto: c.gasto,
        saldo: orcamento - c.gasto,
        utilizacao,
        status: utilizacao > 100 ? 'Excedido' : utilizacao > 90 ? 'Atenção' : 'Normal',
        lancamentos: c.lancamentos
      };
    });

    // ========================================
    // 8. PRODUÇÃO × CUSTO (correlação)
    // ========================================
    const producaoVsCusto = evolucaoMensal.map(e => ({
      mes: e.mesLabel,
      producaoKg: e.producaoKg,
      custoTotal: e.custo,
      custoPerKg: e.custoPerKg
    }));

    const custoPerKgGeral = pesoTotalPecas > 0 ? custoTotalGeral / pesoTotalPecas : 0;

    // ========================================
    // 9. FORECAST (média móvel 3 meses)
    // ========================================
    const forecast3meses = (() => {
      if (evolucaoMensal.length < 3) return [];
      const ultimos3 = evolucaoMensal.slice(-3);
      const mediaCusto = ultimos3.reduce((s, e) => s + e.custo, 0) / 3;
      const mediaProducao = ultimos3.reduce((s, e) => s + e.producaoKg, 0) / 3;
      const mediaReceita = ultimos3.reduce((s, e) => s + e.receita, 0) / 3;

      return [1, 2, 3].map(i => {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        return {
          mes: formatMesAno(d),
          mesLabel: getMesLabel(formatMesAno(d)),
          custoProjetado: mediaCusto,
          producaoProjetada: mediaProducao,
          receitaProjetada: mediaReceita,
          forecast: true
        };
      });
    })();

    // ========================================
    // 10. KPIs GERAIS
    // ========================================
    const margemOperacional = receitaEstimada > 0 ? ((receitaEstimada - custoTotalGeral) / receitaEstimada) * 100 : 0;
    const maiorCategoria = custosPorCategoria[0] || { categoria: '-', valor: 0, percentual: 0 };

    // Receitas GERAIS (somente lancamentos tipo 'receita' sem obra)
    const receitasGerais = (lancamentosDespesas || [])
      .filter(l => l.tipo === 'receita' && !l.obraId && !l.obra_id)
      .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0);

    // Faturamento = receitas gerais lançadas, ou estimativa baseada na produção
    const faturamentoReal = receitasGerais > 0 ? receitasGerais : receitaEstimada;

    const kpisGerais = {
      faturamento: faturamentoReal,
      despesas: custoTotalGeral,
      saldo: faturamentoReal - custoTotalGeral,
      margem: margemOperacional,
      custoKg: custoPerKgGeral,
      producaoKg: pesoTotalPecas,
      producaoMensal,
      receitaEstimada,
      totalDespesas: despesas.length,
      maiorCategoria
    };

    // ========================================
    // 11. METAS FINANCEIRAS
    // ========================================
    const metas = {
      faturamento: {
        meta: faturamentoReal > 0 ? faturamentoReal * 1.1 : receitaEstimada * 1.1,
        real: faturamentoReal,
        progresso: faturamentoReal > 0 ? (faturamentoReal / (faturamentoReal * 1.1)) * 100 : 0
      },
      reducaoCustos: {
        meta: -5,
        mediaHistorica: evolucaoMensal.length > 1 ? evolucaoMensal.slice(0, -1).reduce((s, e) => s + e.custo, 0) / (evolucaoMensal.length - 1) : custoTotal,
        real: evolucaoMensal.length > 0 ? evolucaoMensal[evolucaoMensal.length - 1]?.custo || 0 : 0,
        get variacao() {
          return this.mediaHistorica > 0 ? ((this.real - this.mediaHistorica) / this.mediaHistorica) * 100 : 0;
        }
      },
      producao: {
        meta: pesoTotalPecas > 0 ? pesoTotalPecas / (numMeses || 1) * 1.05 : 10000,
        real: producaoMensal,
        progresso: 0
      },
      margem: {
        meta: 25,
        real: margemOperacional,
        progresso: margemOperacional > 0 ? (margemOperacional / 25) * 100 : 0
      }
    };
    metas.producao.progresso = metas.producao.meta > 0 ? (metas.producao.real / metas.producao.meta) * 100 : 0;

    // ========================================
    // 12. ETAPAS PRODUÇÃO (para análise por estágio)
    // ========================================
    const etapasAnalise = Object.entries(producaoPorEtapa).map(([etapa, dados]) => {
      const taxa = TAXA_ETAPA[etapa] || 0;
      return {
        etapa,
        nome: etapa.charAt(0) + etapa.slice(1).toLowerCase(),
        producaoKg: dados.kg,
        pecas: dados.pecas,
        valorGerado: dados.kg * taxa,
        taxa,
        custoEstimadoKg: custoPerKgGeral
      };
    });

    // ========================================
    // 13. EVOLUÇÃO SEMANAL
    // ========================================
    const semanalMap = {};
    despesas.forEach(d => {
      if (!semanalMap[d.semana]) semanalMap[d.semana] = { custo: 0, count: 0 };
      semanalMap[d.semana].custo += d.valor;
      semanalMap[d.semana].count++;
    });

    const evolucaoSemanal = Object.entries(semanalMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([semana, dados]) => ({
        semana,
        custo: dados.custo,
        count: dados.count
      }));

    // ========================================
    // 14. SUGESTÕES IA (motor de regras)
    // ========================================
    const sugestoes = [];
    const agora = new Date();

    // Regra 1: Custo/kg acima da média
    if (evolucaoMensal.length > 2) {
      const mediaCustoKg = evolucaoMensal.reduce((s, e) => s + e.custoPerKg, 0) / evolucaoMensal.length;
      const ultimoCustoKg = evolucaoMensal[evolucaoMensal.length - 1]?.custoPerKg || 0;
      if (ultimoCustoKg > mediaCustoKg * 1.15) {
        sugestoes.push({
          id: `sug-custo-kg-${agora.getTime()}`,
          tipo: 'Alerta',
          titulo: 'Custo por KG acima da média histórica',
          descricao: `O custo atual por kg (R$ ${ultimoCustoKg.toFixed(2)}) está ${((ultimoCustoKg / mediaCustoKg - 1) * 100).toFixed(1)}% acima da média histórica (R$ ${mediaCustoKg.toFixed(2)}/kg). Investigar causas e oportunidades de redução.`,
          impacto: 'Alto',
          economia: (ultimoCustoKg - mediaCustoKg) * producaoMensal,
          confianca: 92,
          categoria: 'Custos',
          data: agora.toISOString(),
          status: 'nova'
        });
      }
    }

    // Regra 2: Centros acima de 90%
    custosPorCentro.filter(c => c.utilizacao > 90).forEach(c => {
      sugestoes.push({
        id: `sug-centro-${c.id}-${agora.getTime()}`,
        tipo: 'Alerta',
        titulo: `Centro ${c.nome} próximo do limite orçamentário`,
        descricao: `O centro de custo ${c.nome} está com ${c.utilizacao.toFixed(1)}% de utilização do orçamento (R$ ${c.gasto.toFixed(0)} / R$ ${c.orcamento.toFixed(0)}). ${c.utilizacao > 100 ? 'ORÇAMENTO EXCEDIDO!' : 'Ação preventiva recomendada.'}`,
        impacto: c.utilizacao > 100 ? 'Crítico' : 'Alto',
        economia: 0,
        confianca: 95,
        categoria: 'Orçamento',
        data: agora.toISOString(),
        status: 'nova'
      });
    });

    // Regra 3: Produção abaixo da meta
    if (metas.producao.progresso < 80 && metas.producao.meta > 0) {
      sugestoes.push({
        id: `sug-producao-${agora.getTime()}`,
        tipo: 'Alerta',
        titulo: 'Produção mensal abaixo da meta',
        descricao: `A produção mensal (${producaoMensal.toFixed(0)} kg) está ${(100 - metas.producao.progresso).toFixed(1)}% abaixo da meta (${metas.producao.meta.toFixed(0)} kg). Avaliar gargalos nas etapas de produção.`,
        impacto: 'Alto',
        economia: 0,
        confianca: 88,
        categoria: 'Produção',
        data: agora.toISOString(),
        status: 'nova'
      });
    }

    // Regra 4: Categoria com crescimento > 20% MoM
    custosPorCategoria.filter(c => c.variacao_mom > 20).forEach(cat => {
      sugestoes.push({
        id: `sug-cat-${cat.categoria}-${agora.getTime()}`,
        tipo: 'Oportunidade',
        titulo: `${cat.categoria}: crescimento de ${cat.variacao_mom.toFixed(1)}% no mês`,
        descricao: `Os gastos com ${cat.categoria} cresceram ${cat.variacao_mom.toFixed(1)}% em relação ao mês anterior. Avaliar contratos e fornecedores para renegociação.`,
        impacto: 'Médio',
        economia: cat.valor * 0.1,
        confianca: 78,
        categoria: 'Custos',
        data: agora.toISOString(),
        status: 'nova'
      });
    });

    // Regra 5: Margem abaixo da meta
    if (margemOperacional < 25 && margemOperacional > 0) {
      sugestoes.push({
        id: `sug-margem-${agora.getTime()}`,
        tipo: 'Otimização',
        titulo: 'Margem operacional abaixo da meta',
        descricao: `A margem operacional atual (${margemOperacional.toFixed(1)}%) está abaixo da meta de 25%. Potencial de melhoria via otimização de processos e renegociação de insumos.`,
        impacto: 'Alto',
        economia: custoTotalGeral * 0.05,
        confianca: 85,
        categoria: 'Margem',
        data: agora.toISOString(),
        status: 'nova'
      });
    }

    // Regra 6: Eficiência por estágio
    etapasAnalise.forEach(etapa => {
      if (etapa.producaoKg > 0 && etapa.custoEstimadoKg > etapa.taxa * 0.7) {
        sugestoes.push({
          id: `sug-etapa-${etapa.etapa}-${agora.getTime()}`,
          tipo: 'Otimização',
          titulo: `Otimizar processo de ${etapa.nome}`,
          descricao: `A etapa ${etapa.nome} processa ${etapa.producaoKg.toFixed(0)} kg com taxa de R$ ${etapa.taxa.toFixed(2)}/kg. Analisar eficiência operacional e tempos de setup.`,
          impacto: 'Médio',
          economia: etapa.producaoKg * 0.5,
          confianca: 72,
          categoria: 'Produção',
          data: agora.toISOString(),
          status: 'nova'
        });
      }
    });

    // Regra 7: Diversificação de fornecedores (baseada em concentração de categorias)
    if (custosPorCategoria.length > 0 && custosPorCategoria[0].percentual > 40) {
      sugestoes.push({
        id: `sug-concentracao-${agora.getTime()}`,
        tipo: 'Oportunidade',
        titulo: 'Alta concentração em uma categoria de custo',
        descricao: `${custosPorCategoria[0].categoria} representa ${custosPorCategoria[0].percentual.toFixed(1)}% dos custos totais. Diversificar fornecedores ou buscar alternativas pode reduzir riscos.`,
        impacto: 'Médio',
        economia: custosPorCategoria[0].valor * 0.05,
        confianca: 70,
        categoria: 'Estratégia',
        data: agora.toISOString(),
        status: 'nova'
      });
    }

    // ========================================
    // RETORNO
    // ========================================
    return {
      // Dados brutos filtrados
      despesas: despesasFiltradas,
      despesasTotal: despesas,

      // Totais
      custoTotal,
      custoTotalGeral,
      custoPerKgGeral,

      // Produção
      pesoTotalPecas,
      producaoMensal,
      producaoPorEtapa,
      receitaEstimada,

      // Evoluções
      evolucaoMensal,
      evolucaoSemanal,

      // Categorias e Centros
      custosPorCategoria,
      custosPorCentro,
      centrosConfig: CENTROS_CUSTO_CONFIG,

      // Análise cruzada
      producaoVsCusto,

      // Forecast
      forecast3meses,

      // KPIs
      kpisGerais,
      margemOperacional,

      // Metas
      metas,

      // Etapas
      etapasAnalise,

      // Sugestões IA
      sugestoes,

      // Helpers
      formatCurrency: (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v),
      formatPercent: (v) => `${(v || 0).toFixed(1)}%`
    };
  }, [lancamentosDespesas, obras, pecas, medicoes, periodo, filtroCat, filtroCentro]);
}

export { CENTROS_CUSTO_CONFIG, TAXA_ETAPA, CORES_CATEGORIA, normalizarCategoria };
