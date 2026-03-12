/**
 * MONTEX ERP - Hook Central de Inteligência Financeira
 *
 * v3 - Reestruturado com centros de custos baseados em RH real:
 * - Produção (Fábrica): Corte, Solda, Fabricação, Pintura - EXCLUI Alumínio e Montagem
 * - Montagem em Campo: equipe de montagem + despesas de campo (independente)
 * - Alumínio (Esquadrias): equipe separada - EXCLUÍDO da produção
 * - Administrativo Produção: liderança e segurança
 * - Administrativo Geral: almoxarifado, serviços gerais, overhead
 * - Regra contrato: 50% material faturado direto, 50% receita empresa
 */

import { useMemo } from 'react';
import { useLancamentos, useObras, useProducao, useMedicoes, useEstoque } from '@/contexts/ERPContext';

// ==========================================
// DADOS DE RH POR CENTRO DE CUSTO (salários reais Fev/2026)
// ==========================================

// Funcionários por centro de custo (baseado em departamento + cargo do RH real)
const RH_CENTROS = {
  producao: {
    id: 'CC-PROD',
    nome: 'Produção (Fábrica)',
    funcionarios: [
      // Solda
      { nome: 'Gilmar Sousa da Silva', cargo: 'Soldador II', depto: 'Solda', salarioBruto: 3368.98, totalProventos: 4008.98, fgts: 269.51, empresa: 'montex' },
      { nome: 'Juscélio Rodrigues de Souza', cargo: 'Soldador', depto: 'Solda', salarioBruto: 2859.14, totalProventos: 3499.14, fgts: 228.73, empresa: 'montex' },
      { nome: 'Luiz Barbosa Ferreira', cargo: 'Soldador', depto: 'Solda', salarioBruto: 2859.14, totalProventos: 3499.14, fgts: 228.73, empresa: 'montex' },
      { nome: 'Daniel Vinícius de Souza Silva', cargo: 'Soldador I', depto: 'Solda', salarioBruto: 2859.14, totalProventos: 3179.14, fgts: 228.73, empresa: 'mr' },
      // Fabricação (SEM Alumínio)
      { nome: 'Ricardo Alves Pereira', cargo: 'Caldeireiro Montador', depto: 'Fabricação', salarioBruto: 4141.86, totalProventos: 4781.86, fgts: 331.34, empresa: 'montex' },
      // Pintura (Diaristas)
      { nome: 'Anderson Marçal Silva', cargo: 'Diarista Pintura', depto: 'Pintura', salarioBruto: 6000, totalProventos: 6000, fgts: 0, empresa: 'diaria' },
      { nome: 'Flávio Pereira Miranda', cargo: 'Diarista Pintura', depto: 'Pintura', salarioBruto: 5600, totalProventos: 5600, fgts: 0, empresa: 'diaria' },
      { nome: 'José Elvécio Mariano', cargo: 'Diarista Pintura', depto: 'Pintura', salarioBruto: 5000, totalProventos: 5000, fgts: 0, empresa: 'diaria' },
    ]
  },
  montagem: {
    id: 'CC-MONT',
    nome: 'Montagem em Campo',
    funcionarios: [
      { nome: 'Jeferson Bruno de Oliveira Costa', cargo: 'Montador Estrut Metal III', depto: 'Montagem de Campo', salarioBruto: 3591.01, totalProventos: 4231.01, fgts: 287.28, empresa: 'montex' },
      { nome: 'Waldercy Miranda', cargo: 'Montador de Estrut Met II', depto: 'Montagem de Campo', salarioBruto: 3281.80, totalProventos: 3921.80, fgts: 262.54, empresa: 'montex' },
      { nome: 'Washington de Oliveira', cargo: 'Encarregado de Campo II', depto: 'Montagem de Campo', salarioBruto: 4133.86, totalProventos: 4773.86, fgts: 330.70, empresa: 'montex' },
      { nome: 'Eder Bruno Silva Ferreira', cargo: 'Montador I', depto: 'Montagem de Campo', salarioBruto: 2741.86, totalProventos: 3500.65, fgts: 219.34, empresa: 'montex' },
      { nome: 'Gabriel Ferreira Santos', cargo: 'Montador I', depto: 'Montagem de Campo', salarioBruto: 2741.86, totalProventos: 3610.21, fgts: 219.34, empresa: 'montex' },
      { nome: 'José Eduardo Lucas', cargo: 'Meio Oficial de Montador', depto: 'Montagem de Campo', salarioBruto: 2432.14, totalProventos: 3072.14, fgts: 194.57, empresa: 'montex' },
      { nome: 'Juscélio Rodrigues', cargo: 'Montador Estrut Metal III', depto: 'Montagem de Campo', salarioBruto: 3591.01, totalProventos: 4371.97, fgts: 287.28, empresa: 'montex' },
      { nome: 'Diego Alves da Silva', cargo: 'Montador I', depto: 'Montagem de Campo', salarioBruto: 2741.86, totalProventos: 3381.86, fgts: 219.34, empresa: 'montex' },
      { nome: 'Wendel Gabriel Alves dos Reis', cargo: 'Meio Oficial de Montador', depto: 'Montagem de Campo', salarioBruto: 2432.14, totalProventos: 4141.72, fgts: 259.42, empresa: 'montex' },
      { nome: 'João Batista Alves Rodrigues', cargo: 'Ajudante de Montagem', depto: 'Montagem de Campo', salarioBruto: 1837.63, totalProventos: 2264.30, fgts: 147.01, empresa: 'montex' },
      { nome: 'Erick Welison Hosni de Paula', cargo: 'Meio Oficial de Montador', depto: 'Montagem de Campo', salarioBruto: 2432.01, totalProventos: 2931.78, fgts: 194.56, empresa: 'montex' },
      { nome: 'Derlei Gobbi', cargo: 'Montador Estrut Metal III', depto: 'Montagem de Campo', salarioBruto: 3591.01, totalProventos: 3591.01, fgts: 287.28, empresa: 'montex' },
      { nome: 'Arquiris Junior Rodrigues', cargo: 'Ajudante de Montagem', depto: 'Montagem de Campo', salarioBruto: 1837.63, totalProventos: 2157.63, fgts: 147.01, empresa: 'mr' },
      { nome: 'Matheus André Celestino dos Santos', cargo: 'Ajudante de Montagem', depto: 'Montagem de Campo', salarioBruto: 1837.63, totalProventos: 2118.50, fgts: 147.01, empresa: 'mr' },
    ]
  },
  aluminio: {
    id: 'CC-ALUM',
    nome: 'Alumínio (Esquadrias)',
    funcionarios: [
      { nome: 'João Ermelindo Soares', cargo: 'Serralheiro de Alumínio', depto: 'Fabricação', salarioBruto: 5137.71, totalProventos: 5777.71, fgts: 411.01, empresa: 'montex' },
      { nome: 'Flávio da Cruz', cargo: 'Instalador Esquadrias Alumínio', depto: 'Fabricação', salarioBruto: 3480.70, totalProventos: 4120.70, fgts: 278.45, empresa: 'montex' },
    ]
  },
  admProducao: {
    id: 'CC-ADMPROD',
    nome: 'Administrativo Produção',
    funcionarios: [
      { nome: 'Flávio de Jesus Santos', cargo: 'Líder de Produção', depto: 'Administrativo Produção', salarioBruto: 3587.32, totalProventos: 4644.23, fgts: 286.98, empresa: 'montex' },
      { nome: 'David Barboza de Sousa', cargo: 'Coordenador de Produção', depto: 'Administrativo Produção', salarioBruto: 2700.00, totalProventos: 3340.00, fgts: 216.00, empresa: 'montex' },
      { nome: 'Letícia Fonseca Soares', cargo: 'Técnico em Segurança do Trabalho', depto: 'Administrativo Produção', salarioBruto: 3783.60, totalProventos: 4423.60, fgts: 302.68, empresa: 'mr' },
    ]
  },
  admGeral: {
    id: 'CC-ADMGER',
    nome: 'Administrativo Geral',
    funcionarios: [
      { nome: 'Tarcísio Vieira de Almeida', cargo: 'Almoxarife', depto: 'Administrativo Geral', salarioBruto: 1900.00, totalProventos: 2540.00, fgts: 152.00, empresa: 'montex' },
      { nome: 'Cristiane Vieira', cargo: 'Auxiliar de Serviços Gerais', depto: 'Administrativo Geral', salarioBruto: 1837.63, totalProventos: 2896.85, fgts: 156.81, empresa: 'montex' },
    ]
  }
};

// Calcula custos de RH por centro
function calcRHCentro(centro) {
  const funcs = centro.funcionarios || [];
  const totalSalarios = funcs.reduce((s, f) => s + (f.salarioBruto || 0), 0);
  const totalProventos = funcs.reduce((s, f) => s + (f.totalProventos || 0), 0);
  const totalFGTS = funcs.reduce((s, f) => s + (f.fgts || 0), 0);
  // Encargos estimados (INSS patronal ~28.8% + RAT + Terceiros)
  const encargosPatronais = totalSalarios * 0.288;
  const custoTotalRH = totalProventos + totalFGTS + encargosPatronais;
  return { totalSalarios, totalProventos, totalFGTS, encargosPatronais, custoTotalRH, qtdFuncionarios: funcs.length };
}

// ==========================================
// REGRA DE CONTRATO: 50% MATERIAL / 50% RECEITA
// ==========================================
// Média de valor de contrato: 50% são despesas de material (faturado direto pelo fornecedor)
// e 50% é vinculado à receita da empresa.
const PERCENTUAL_MATERIAL_CONTRATO = 0.50;
const PERCENTUAL_RECEITA_CONTRATO = 0.50;

// Preço de venda por kg (material faturado direto — sem R$19,50)
const PRECO_VENDA_KG = 12.50;

// Taxas de receita por etapa (R$/kg)
const TAXA_ETAPA = {
  CORTE: 1.20,
  FABRICACAO: 2.50,
  SOLDA: 3.00,
  PINTURA: 1.80,
  EXPEDIDO: 0
};

// Mapeamento categoria de despesa → centro de custo
// Reestruturado para refletir novos centros
const CATEGORIA_CENTRO = {
  'Matéria Prima': [{ centro: 'CC-PROD', peso: 1.0 }],
  'Mão de Obra': [{ centro: 'CC-PROD', peso: 0.5 }, { centro: 'CC-MONT', peso: 0.5 }],
  'Energia/Utilidades': [{ centro: 'CC-PROD', peso: 0.8 }, { centro: 'CC-ADMGER', peso: 0.2 }],
  'Manutenção': [{ centro: 'CC-PROD', peso: 0.7 }, { centro: 'CC-MONT', peso: 0.3 }],
  'Transporte': [{ centro: 'CC-MONT', peso: 0.7 }, { centro: 'CC-PROD', peso: 0.3 }],
  'Montagem Campo': [{ centro: 'CC-MONT', peso: 1.0 }],
  'Hospedagem': [{ centro: 'CC-MONT', peso: 1.0 }],
  'Alimentação Campo': [{ centro: 'CC-MONT', peso: 1.0 }],
  'Combustível': [{ centro: 'CC-MONT', peso: 0.8 }, { centro: 'CC-PROD', peso: 0.2 }],
  'Locação Equipamentos': [{ centro: 'CC-MONT', peso: 0.7 }, { centro: 'CC-PROD', peso: 0.3 }],
  'Administrativo': [{ centro: 'CC-ADMGER', peso: 0.6 }, { centro: 'CC-ADMPROD', peso: 0.4 }],
  'Impostos': [{ centro: 'CC-ADMGER', peso: 1.0 }],
  'Alumínio': [{ centro: 'CC-ALUM', peso: 1.0 }],
  'consumiveis': [{ centro: 'CC-PROD', peso: 1.0 }],
  'fabricacao': [{ centro: 'CC-PROD', peso: 1.0 }]
};

// Centros de custo reestruturados
const CENTROS_CUSTO_CONFIG = [
  { id: 'CC-PROD', nome: 'Produção (Fábrica)', responsavel: 'Flávio de Jesus Santos', orcamentoBase: 0.30, cor: '#10B981', icon: 'factory',
    descricao: 'Corte, Solda, Fabricação e Pintura - Exclui Alumínio e Montagem' },
  { id: 'CC-MONT', nome: 'Montagem em Campo', responsavel: 'Washington de Oliveira', orcamentoBase: 0.30, cor: '#3B82F6', icon: 'hardhat',
    descricao: 'Equipe de montagem em campo + despesas de hospedagem, alimentação, combustível' },
  { id: 'CC-ALUM', nome: 'Alumínio (Esquadrias)', responsavel: 'João Ermelindo Soares', orcamentoBase: 0.10, cor: '#F59E0B', icon: 'grid',
    descricao: 'Equipe de alumínio e esquadrias - Separado dos custos de produção' },
  { id: 'CC-ADMPROD', nome: 'Adm. Produção', responsavel: 'David Barboza de Sousa', orcamentoBase: 0.15, cor: '#8B5CF6', icon: 'clipboard',
    descricao: 'Liderança, coordenação e segurança do trabalho' },
  { id: 'CC-ADMGER', nome: 'Adm. Geral', responsavel: 'Tarcísio Vieira', orcamentoBase: 0.15, cor: '#EF4444', icon: 'building',
    descricao: 'Almoxarifado, serviços gerais, energia, impostos' },
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
  'Impostos': '#F97316',
  'Montagem Campo': '#2563EB',
  'Hospedagem': '#7C3AED',
  'Alimentação Campo': '#DB2777',
  'Combustível': '#EA580C',
  'Locação Equipamentos': '#0891B2',
  'Alumínio': '#D97706'
};

// Normalizar categorias — agora detecta despesas de montagem em campo
const normalizarCategoria = (cat, descricao = '') => {
  if (!cat) return 'Administrativo';
  const catLower = cat.toLowerCase();
  const descLower = (descricao || '').toLowerCase();

  // Detectar despesas de MONTAGEM em campo
  if (catLower.includes('montagem') || catLower.includes('campo') ||
      descLower.includes('montagem') || descLower.includes('campo')) return 'Montagem Campo';
  if (catLower.includes('hospedagem') || catLower.includes('hotel') || catLower.includes('pousada') ||
      descLower.includes('hospedagem') || descLower.includes('hotel') || descLower.includes('diária hotel')) return 'Hospedagem';
  if ((catLower.includes('alimenta') && (catLower.includes('campo') || descLower.includes('campo'))) ||
      descLower.includes('marmitex') || descLower.includes('alimentação campo') || descLower.includes('refeição campo')) return 'Alimentação Campo';
  if (catLower.includes('combust') || catLower.includes('diesel') || catLower.includes('gasolina') ||
      descLower.includes('combustível') || descLower.includes('diesel') || descLower.includes('abastecimento')) return 'Combustível';
  if (catLower.includes('locação') || catLower.includes('locacao') || catLower.includes('aluguel equip') ||
      descLower.includes('guindaste') || descLower.includes('munck') || descLower.includes('plataforma')) return 'Locação Equipamentos';
  // Detectar Alumínio
  if (catLower.includes('alumín') || catLower.includes('alumin') || catLower.includes('esquadria') ||
      descLower.includes('alumínio') || descLower.includes('esquadria')) return 'Alumínio';
  // Categorias padrão
  if (catLower.includes('matéria') || catLower.includes('materia') || catLower === 'consumiveis') return 'Matéria Prima';
  if (catLower.includes('mão') || catLower.includes('mao') || catLower === 'mao_de_obra') return 'Mão de Obra';
  if (catLower.includes('energia') || catLower.includes('utilidade') || descLower.includes('cemig') || descLower.includes('copasa')) return 'Energia/Utilidades';
  if (catLower.includes('manuten')) return 'Manutenção';
  if (catLower.includes('transport')) return 'Transporte';
  if (catLower.includes('imposto') || catLower.includes('tribut')) return 'Impostos';
  if (catLower === 'fabricacao') return 'Mão de Obra';
  return 'Administrativo';
};

/**
 * Hook Central de Inteligência Financeira - v3
 *
 * Reestruturado com:
 * - Centros de custos baseados em dados reais de RH
 * - Separação Produção / Montagem / Alumínio
 * - Regra 50% material faturado / 50% receita
 * - Exclusão de equipe alumínio da produção
 * - Identificação de gastos de montagem em campo
 */
export function useFinancialIntelligence(filtros = {}) {
  const { lancamentosDespesas } = useLancamentos();
  const { obras } = useObras();
  const { pecas } = useProducao();
  const { medicoes } = useMedicoes();

  const { periodo = 'geral', categoria: filtroCat, centroCusto: filtroCentro } = filtros;

  return useMemo(() => {
    // ========================================
    // 1. PREPARAR DESPESAS (SOMENTE GERAIS - sem vínculo a obra)
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

    if (filtroCat) {
      despesasFiltradas = despesasFiltradas.filter(d => d.categoriaNorm === filtroCat);
    }

    // ========================================
    // 3. TOTAIS BÁSICOS
    // ========================================
    const custoTotal = despesasFiltradas.reduce((sum, d) => sum + d.valor, 0);
    const custoTotalGeral = despesas.reduce((sum, d) => sum + d.valor, 0);

    // ========================================
    // 4. CUSTOS DE RH POR CENTRO
    // ========================================
    const rhProducao = calcRHCentro(RH_CENTROS.producao);
    const rhMontagem = calcRHCentro(RH_CENTROS.montagem);
    const rhAluminio = calcRHCentro(RH_CENTROS.aluminio);
    const rhAdmProd = calcRHCentro(RH_CENTROS.admProducao);
    const rhAdmGeral = calcRHCentro(RH_CENTROS.admGeral);

    const custoTotalRH = rhProducao.custoTotalRH + rhMontagem.custoTotalRH + rhAluminio.custoTotalRH + rhAdmProd.custoTotalRH + rhAdmGeral.custoTotalRH;

    const rhPorCentro = {
      'CC-PROD': rhProducao,
      'CC-MONT': rhMontagem,
      'CC-ALUM': rhAluminio,
      'CC-ADMPROD': rhAdmProd,
      'CC-ADMGER': rhAdmGeral,
    };

    // ========================================
    // 5. PRODUÇÃO (de peças) - EXCLUI alumínio
    // ========================================
    const pecasArr = pecas || [];
    const pesoTotalPecas = pecasArr.reduce((sum, p) => {
      const pesoTotal = parseFloat(p.pesoTotal) || parseFloat(p.peso) || 0;
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

    // ========================================
    // 5b. VALOR TOTAL CONTRATOS ATIVOS (base para regra 50/50)
    // ========================================
    // Obras ativas = qualquer status exceto concluída, cancelada e orçamento
    const statusInativos = ['concluida', 'cancelada', 'orcamento'];
    const obrasArr = obras || [];
    const obrasAtivas = obrasArr.filter(o => !statusInativos.includes(o.status));
    const valorTotalContratosAtivos = obrasAtivas.reduce((sum, o) => {
      const val = parseFloat(o.valorContrato) || parseFloat(o.valor_contrato) || parseFloat(o.contratoValorTotal) || parseFloat(o.valor) || 0;
      return sum + val;
    }, 0);
    const qtdObrasAtivas = obrasAtivas.length;

    // Receita por etapa (fallback caso não tenha obras ativas cadastradas)
    let receitaBrutaEstimadaPorEtapa = 0;
    Object.entries(producaoPorEtapa).forEach(([etapa, dados]) => {
      const taxa = TAXA_ETAPA[etapa] || 0;
      receitaBrutaEstimadaPorEtapa += dados.kg * taxa;
    });

    // Faturamento bruto = valor total dos contratos ativos (prioridade) ou estimado por etapa
    const faturamentoBrutoContratos = valorTotalContratosAtivos > 0 ? valorTotalContratosAtivos : receitaBrutaEstimadaPorEtapa;

    // Regra 50/50: 50% do valor do contrato é material faturado direto, 50% é receita da empresa
    const receitaEmpresa = faturamentoBrutoContratos * PERCENTUAL_RECEITA_CONTRATO;
    const materialFaturadoDireto = faturamentoBrutoContratos * PERCENTUAL_MATERIAL_CONTRATO;

    // ========================================
    // 6. EVOLUÇÃO MENSAL
    // ========================================
    const mesesMap = {};
    despesas.forEach(d => {
      if (!mesesMap[d.mes]) mesesMap[d.mes] = { custo: 0, count: 0 };
      mesesMap[d.mes].custo += d.valor;
      mesesMap[d.mes].count++;
    });

    const mesesOrdenados = Object.keys(mesesMap).sort();

    const pecasDatas = pecasArr.map(p => p.createdAt || p.created_at).filter(Boolean);
    let numMesesProducao = 2;
    if (pecasDatas.length > 0) {
      const pecasMeses = new Set(pecasDatas.map(d => formatMesAno(d)));
      numMesesProducao = Math.max(pecasMeses.size, 1);
    }
    const producaoMensal = pesoTotalPecas / numMesesProducao;

    // Receita mensal baseada no valor de contrato ativo OU na produção × R$12,50/kg
    const numMeses = Math.max(mesesOrdenados.length, 1);
    const receitaBrutaMensal = faturamentoBrutoContratos > 0
      ? faturamentoBrutoContratos / numMeses
      : producaoMensal * PRECO_VENDA_KG;

    const evolucaoMensal = mesesOrdenados.map(mes => {
      const custoMes = mesesMap[mes].custo;
      const receitaMes = receitaBrutaMensal;
      const receitaEmpresaMes = receitaMes * PERCENTUAL_RECEITA_CONTRATO;
      const materialFaturadoMes = receitaMes * PERCENTUAL_MATERIAL_CONTRATO;
      const custoPerKg = producaoMensal > 0 ? custoMes / producaoMensal : 0;
      const margem = receitaEmpresaMes > 0 ? ((receitaEmpresaMes - custoMes) / receitaEmpresaMes) * 100 : 0;

      return {
        mes,
        mesLabel: getMesLabel(mes),
        custo: custoMes,
        receita: receitaMes,
        receitaEmpresa: receitaEmpresaMes,
        materialFaturado: materialFaturadoMes,
        producaoKg: producaoMensal,
        custoPerKg,
        margem,
        count: mesesMap[mes].count
      };
    });

    // ========================================
    // 7. CUSTOS POR CATEGORIA
    // ========================================
    const catMap = {};
    despesasFiltradas.forEach(d => {
      if (!catMap[d.categoriaNorm]) catMap[d.categoriaNorm] = { valor: 0, count: 0 };
      catMap[d.categoriaNorm].valor += d.valor;
      catMap[d.categoriaNorm].count++;
    });

    const mesAnteriorKey = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return formatMesAno(d);
    })();
    const catMapAnterior = {};
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
    // 8. CUSTOS POR CENTRO DE CUSTO (com RH)
    // ========================================
    const centroMap = {};
    CENTROS_CUSTO_CONFIG.forEach(c => {
      const rh = rhPorCentro[c.id] || { custoTotalRH: 0, qtdFuncionarios: 0, totalSalarios: 0, totalFGTS: 0, encargosPatronais: 0 };
      centroMap[c.id] = {
        ...c,
        gasto: 0,
        gastoRH: rh.custoTotalRH,
        qtdFuncionarios: rh.qtdFuncionarios,
        detalheRH: rh,
        lancamentos: [],
        // Categorias que alimentam este centro
        categoriasVinculadas: Object.entries(CATEGORIA_CENTRO)
          .filter(([_, centros]) => centros.some(cc => cc.centro === c.id))
          .map(([cat]) => cat)
      };
    });

    // Distribuir despesas nos centros
    despesasFiltradas.forEach(d => {
      const centros = CATEGORIA_CENTRO[d.categoriaNorm] || CATEGORIA_CENTRO[d.categoria] || [{ centro: 'CC-ADMGER', peso: 1.0 }];
      centros.forEach(({ centro, peso }) => {
        if (centroMap[centro]) {
          centroMap[centro].gasto += d.valor * peso;
          centroMap[centro].lancamentos.push({ ...d, valorAlocado: d.valor * peso });
        }
      });
    });

    // Orçamento = % base × (custo total geral + RH total)
    const baseTotalOrcamento = (custoTotalGeral + custoTotalRH) * 1.1;
    const custosPorCentro = Object.values(centroMap).map(c => {
      const orcamento = baseTotalOrcamento * c.orcamentoBase;
      const gastoTotal = c.gasto + c.gastoRH;
      const utilizacao = orcamento > 0 ? (gastoTotal / orcamento) * 100 : 0;
      return {
        id: c.id,
        nome: c.nome,
        responsavel: c.responsavel,
        cor: c.cor,
        descricao: c.descricao,
        categoriasVinculadas: c.categoriasVinculadas,
        orcamento,
        gasto: c.gasto,
        gastoRH: c.gastoRH,
        gastoTotal,
        qtdFuncionarios: c.qtdFuncionarios,
        detalheRH: c.detalheRH,
        saldo: orcamento - gastoTotal,
        utilizacao,
        status: utilizacao > 100 ? 'Excedido' : utilizacao > 90 ? 'Atenção' : 'Normal',
        lancamentos: c.lancamentos
      };
    });

    // Filtrar por centro se solicitado
    let custosPorCentroFiltrado = custosPorCentro;
    if (filtroCentro) {
      custosPorCentroFiltrado = custosPorCentro.filter(c => c.id === filtroCentro);
    }

    // ========================================
    // 9. CUSTO PRODUÇÃO (SEM Alumínio, SEM Montagem)
    // ========================================
    const centroProducao = custosPorCentro.find(c => c.id === 'CC-PROD');
    const custoProducaoTotal = centroProducao ? centroProducao.gastoTotal : 0;
    const custoProducaoPerKg = pesoTotalPecas > 0 ? custoProducaoTotal / pesoTotalPecas : 0;

    // ========================================
    // 10. PRODUÇÃO × CUSTO
    // ========================================
    const producaoVsCusto = evolucaoMensal.map(e => ({
      mes: e.mesLabel,
      producaoKg: e.producaoKg,
      custoTotal: e.custo,
      custoPerKg: e.custoPerKg
    }));

    const custoPerKgGeral = pesoTotalPecas > 0 ? custoTotalGeral / pesoTotalPecas : 0;

    // ========================================
    // 11. FORECAST AVANÇADO
    // ========================================
    const calcularForecastAvancado = (dados, mesesFuturos = 3) => {
      if (!dados || dados.length < 3) return [];

      const SAZONALIDADE = {
        0: 0.85, 1: 0.90, 2: 1.00, 3: 1.10, 4: 1.15, 5: 1.10,
        6: 1.05, 7: 1.00, 8: 1.05, 9: 1.10, 10: 1.00, 11: 0.80,
      };

      const n = Math.min(dados.length, 6);
      const recentData = dados.slice(-n);
      const weights = recentData.map((_, i) => i + 1);
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const weightedAvgCusto = recentData.reduce((sum, d, i) => sum + (d.custo || 0) * weights[i], 0) / totalWeight;
      const weightedAvgProducao = recentData.reduce((sum, d, i) => sum + (d.producaoKg || 0) * weights[i], 0) / totalWeight;

      const values = recentData.map(d => d.custo || 0);
      const xMean = (n - 1) / 2;
      const yMean = values.reduce((a, b) => a + b, 0) / n;
      let slope = 0;
      let denominator = 0;
      values.forEach((y, x) => {
        slope += (x - xMean) * (y - yMean);
        denominator += (x - xMean) ** 2;
      });
      slope = denominator !== 0 ? slope / denominator : 0;

      const lastMonth = dados.length > 0 ? new Date(dados[dados.length - 1].mes.split('-')[0], parseInt(dados[dados.length - 1].mes.split('-')[1]) - 1).getMonth() : new Date().getMonth();

      const forecast = [];
      for (let i = 1; i <= mesesFuturos; i++) {
        const futureMonth = (lastMonth + i) % 12;
        const baseValue = weightedAvgCusto + slope * i;
        const seasonalValue = baseValue * (SAZONALIDADE[futureMonth] || 1.0);
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        forecast.push({
          mes: monthNames[futureMonth],
          mesIndex: futureMonth,
          custoProjetado: Math.max(0, Math.round(seasonalValue * 100) / 100),
          producaoProjetada: Math.max(0, Math.round((weightedAvgProducao + slope * i / 2.5) * 100) / 100),
          receitaProjetada: Math.max(0, Math.round((faturamentoBrutoContratos > 0 ? faturamentoBrutoContratos / numMeses : (weightedAvgProducao + slope * i / 2.5) * (TAXA_ETAPA.CORTE + TAXA_ETAPA.FABRICACAO + TAXA_ETAPA.SOLDA + TAXA_ETAPA.PINTURA)) * PERCENTUAL_RECEITA_CONTRATO * 100) / 100),
          tipo: 'forecast',
          confianca: Math.max(0.5, 1 - (i * 0.15)),
          tendencia: slope > 0 ? 'alta' : slope < 0 ? 'baixa' : 'estável',
          sazonalidade: SAZONALIDADE[futureMonth] || 1.0,
          forecast: true
        });
      }
      return forecast;
    };

    const forecast3meses = calcularForecastAvancado(evolucaoMensal, 3);

    // ========================================
    // 12. KPIs GERAIS (baseado em despesas + preço venda R$12,50/kg)
    // ========================================
    // IMPORTANTE: RH já está incluído nos lançamentos de despesas, NÃO somar novamente
    // Receita = produção (kg) × preço de venda (R$ 12,50/kg)
    const receitaBaseProducao = pesoTotalPecas * PRECO_VENDA_KG;
    const receitaMensalBase = producaoMensal * PRECO_VENDA_KG;

    // Faturamento = valor total dos contratos de obras ativas (se disponível) OU baseado na produção
    const faturamentoReal = valorTotalContratosAtivos > 0 ? valorTotalContratosAtivos : receitaBaseProducao;
    const receitaEmpresaReal = faturamentoReal * PERCENTUAL_RECEITA_CONTRATO;
    const materialFaturadoDiretoReal = faturamentoReal * PERCENTUAL_MATERIAL_CONTRATO;

    // Margem: NÃO soma custoTotalRH pois já está nas despesas lançadas
    const margemOperacional = receitaEmpresaReal > 0 ? ((receitaEmpresaReal - custoTotalGeral) / receitaEmpresaReal) * 100 : 0;
    const maiorCategoria = custosPorCategoria[0] || { categoria: '-', valor: 0, percentual: 0 };

    const kpisGerais = {
      // Regra 50/50 baseada nos contratos ativos
      faturamentoBruto: faturamentoReal,
      valorTotalContratos: valorTotalContratosAtivos,
      qtdObrasAtivas,
      materialFaturadoDireto: materialFaturadoDiretoReal,
      receitaEmpresa: receitaEmpresaReal,
      // Custos (RH já incluso nos lançamentos — não duplicar)
      despesas: custoTotalGeral,
      despesasRH: custoTotalRH, // informativo apenas
      saldo: receitaEmpresaReal - custoTotalGeral,
      margem: margemOperacional,
      custoKg: custoPerKgGeral,
      custoProducaoKg: custoProducaoPerKg,
      // Produção e preço
      producaoKg: pesoTotalPecas,
      producaoMensal,
      precoVendaKg: PRECO_VENDA_KG,
      receitaBaseProducao,
      receitaMensalBase,
      receitaEstimadaPorEtapa: receitaBrutaEstimadaPorEtapa,
      totalDespesas: despesas.length,
      maiorCategoria,
      totalFuncionarios: Object.values(RH_CENTROS).reduce((s, c) => s + c.funcionarios.length, 0),
      percentualMaterial: PERCENTUAL_MATERIAL_CONTRATO * 100,
      percentualReceita: PERCENTUAL_RECEITA_CONTRATO * 100,
    };

    // ========================================
    // 13. METAS FINANCEIRAS (reestruturadas)
    // ========================================
    const metas = {
      receitaEmpresa: {
        meta: receitaEmpresaReal > 0 ? receitaEmpresaReal : receitaEmpresa,
        real: receitaEmpresaReal,
        progresso: receitaEmpresaReal > 0 ? 100 : 0,
        descricao: `50% do contrato ativo (${qtdObrasAtivas} obras = ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valorTotalContratosAtivos)})`
      },
      custoProducao: {
        meta: custoProducaoTotal > 0 ? custoProducaoTotal * 0.95 : 0,
        real: custoProducaoTotal,
        progresso: custoProducaoTotal > 0 ? 100 : 0,
        descricao: 'Custo fábrica (sem alumínio, sem montagem)'
      },
      custoMontagem: {
        meta: 0,
        real: custosPorCentro.find(c => c.id === 'CC-MONT')?.gastoTotal || 0,
        progresso: 0,
        descricao: 'Equipe + despesas de montagem em campo'
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
        meta: pesoTotalPecas > 0 ? pesoTotalPecas / (numMesesProducao || 1) * 1.05 : 10000,
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
    const centroMont = custosPorCentro.find(c => c.id === 'CC-MONT');
    if (centroMont) {
      metas.custoMontagem.meta = centroMont.orcamento;
      metas.custoMontagem.progresso = metas.custoMontagem.meta > 0 ? (metas.custoMontagem.real / metas.custoMontagem.meta) * 100 : 0;
    }

    // ========================================
    // 14. ETAPAS PRODUÇÃO
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
        custoEstimadoKg: custoProducaoPerKg
      };
    });

    // ========================================
    // 15. EVOLUÇÃO SEMANAL
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
    // 16. SUGESTÕES IA
    // ========================================
    const sugestoes = [];
    const agora = new Date();

    if (evolucaoMensal.length > 2) {
      const mediaCustoKg = evolucaoMensal.reduce((s, e) => s + e.custoPerKg, 0) / evolucaoMensal.length;
      const ultimoCustoKg = evolucaoMensal[evolucaoMensal.length - 1]?.custoPerKg || 0;
      if (ultimoCustoKg > mediaCustoKg * 1.15) {
        sugestoes.push({
          id: `sug-custo-kg-${agora.getTime()}`,
          tipo: 'Alerta',
          titulo: 'Custo por KG acima da média (apenas Produção)',
          descricao: `O custo atual por kg (R$ ${ultimoCustoKg.toFixed(2)}) está ${((ultimoCustoKg / mediaCustoKg - 1) * 100).toFixed(1)}% acima da média. Exclui alumínio e montagem.`,
          impacto: 'Alto',
          economia: (ultimoCustoKg - mediaCustoKg) * producaoMensal,
          confianca: 92,
          categoria: 'Produção',
          data: agora.toISOString(),
          status: 'nova'
        });
      }
    }

    custosPorCentro.filter(c => c.utilizacao > 90).forEach(c => {
      sugestoes.push({
        id: `sug-centro-${c.id}-${agora.getTime()}`,
        tipo: 'Alerta',
        titulo: `${c.nome}: ${c.utilizacao.toFixed(0)}% do orçamento`,
        descricao: `Centro ${c.nome} (${c.qtdFuncionarios} func.) gasta R$ ${c.gastoTotal.toFixed(0)} de R$ ${c.orcamento.toFixed(0)}. ${c.utilizacao > 100 ? 'EXCEDIDO!' : 'Atenção.'}`,
        impacto: c.utilizacao > 100 ? 'Crítico' : 'Alto',
        economia: 0,
        confianca: 95,
        categoria: 'Orçamento',
        data: agora.toISOString(),
        status: 'nova'
      });
    });

    if (metas.producao.progresso < 80 && metas.producao.meta > 0) {
      sugestoes.push({
        id: `sug-producao-${agora.getTime()}`,
        tipo: 'Alerta',
        titulo: 'Produção abaixo da meta (sem alumínio)',
        descricao: `Produção mensal (${producaoMensal.toFixed(0)} kg) está ${(100 - metas.producao.progresso).toFixed(1)}% abaixo da meta. Custos de alumínio e montagem não inclusos.`,
        impacto: 'Alto',
        economia: 0,
        confianca: 88,
        categoria: 'Produção',
        data: agora.toISOString(),
        status: 'nova'
      });
    }

    // ========================================
    // RETORNO
    // ========================================
    return {
      despesas: despesasFiltradas,
      despesasTotal: despesas,

      custoTotal,
      custoTotalGeral,
      custoPerKgGeral,
      custoTotalRH,

      pesoTotalPecas,
      producaoMensal,
      producaoPorEtapa,
      valorTotalContratosAtivos,
      qtdObrasAtivas,
      faturamentoBrutoContratos,
      receitaEmpresa,
      materialFaturadoDireto,

      evolucaoMensal,
      evolucaoSemanal,

      custosPorCategoria,
      custosPorCentro: custosPorCentroFiltrado,
      centrosConfig: CENTROS_CUSTO_CONFIG,
      rhPorCentro,
      rhCentros: RH_CENTROS,

      producaoVsCusto,
      custoProducaoTotal,
      custoProducaoPerKg,

      forecast3meses,

      kpisGerais,
      margemOperacional,

      metas,
      etapasAnalise,
      sugestoes,

      // Regra contrato
      percentualMaterial: PERCENTUAL_MATERIAL_CONTRATO,
      percentualReceita: PERCENTUAL_RECEITA_CONTRATO,

      formatCurrency: (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v),
      formatPercent: (v) => `${(v || 0).toFixed(1)}%`
    };
  }, [lancamentosDespesas, obras, pecas, medicoes, periodo, filtroCat, filtroCentro]);
}

// Export constants and helpers
const getForecastAvancado = (dados, mesesFuturos = 3) => {
  if (!dados || dados.length < 3) return [];
  const SAZONALIDADE = { 0: 0.85, 1: 0.90, 2: 1.00, 3: 1.10, 4: 1.15, 5: 1.10, 6: 1.05, 7: 1.00, 8: 1.05, 9: 1.10, 10: 1.00, 11: 0.80 };
  const n = Math.min(dados.length, 6);
  const recentData = dados.slice(-n);
  const weights = recentData.map((_, i) => i + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedAvgCusto = recentData.reduce((sum, d, i) => sum + (d.custo || 0) * weights[i], 0) / totalWeight;
  const weightedAvgProducao = recentData.reduce((sum, d, i) => sum + (d.producaoKg || 0) * weights[i], 0) / totalWeight;
  const values = recentData.map(d => d.custo || 0);
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let slope = 0, denominator = 0;
  values.forEach((y, x) => { slope += (x - xMean) * (y - yMean); denominator += (x - xMean) ** 2; });
  slope = denominator !== 0 ? slope / denominator : 0;
  const lastMonth = dados.length > 0 ? new Date(dados[dados.length - 1].mes.split('-')[0], parseInt(dados[dados.length - 1].mes.split('-')[1]) - 1).getMonth() : new Date().getMonth();
  const forecast = [];
  for (let i = 1; i <= mesesFuturos; i++) {
    const futureMonth = (lastMonth + i) % 12;
    const baseValue = weightedAvgCusto + slope * i;
    const seasonalValue = baseValue * (SAZONALIDADE[futureMonth] || 1.0);
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    forecast.push({
      mes: monthNames[futureMonth], mesIndex: futureMonth,
      custoProjetado: Math.max(0, Math.round(seasonalValue * 100) / 100),
      producaoProjetada: Math.max(0, Math.round((weightedAvgProducao + slope * i / 2.5) * 100) / 100),
      tipo: 'forecast', confianca: Math.max(0.5, 1 - (i * 0.15)),
      tendencia: slope > 0 ? 'alta' : slope < 0 ? 'baixa' : 'estável',
      sazonalidade: SAZONALIDADE[futureMonth] || 1.0,
    });
  }
  return forecast;
};

export { CENTROS_CUSTO_CONFIG, TAXA_ETAPA, CORES_CATEGORIA, normalizarCategoria, getForecastAvancado, RH_CENTROS, PERCENTUAL_MATERIAL_CONTRATO, PERCENTUAL_RECEITA_CONTRATO, PRECO_VENDA_KG };
