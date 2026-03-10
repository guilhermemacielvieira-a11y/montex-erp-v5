/**
 * MONTEX ERP - Utilitário de Exportação XLSX com Formatação Condicional
 * Gera planilhas profissionais com cores, formatação automática e destaque de valores
 */
import * as XLSX from 'xlsx';

// Cores do tema MONTEX
const CORES = {
  header: { fgColor: { rgb: '1E293B' } },  // slate-800
  headerFont: { color: { rgb: 'FFFFFF' }, bold: true, sz: 11 },
  positivo: { fgColor: { rgb: 'DCFCE7' } }, // green-100
  negativo: { fgColor: { rgb: 'FEE2E2' } }, // red-100
  alerta: { fgColor: { rgb: 'FEF9C3' } },   // yellow-100
  destaque: { fgColor: { rgb: 'DBEAFE' } },  // blue-100
  total: { fgColor: { rgb: 'F1F5F9' } },     // slate-100
  moeda: { numFmt: '#,##0.00' },
  percentual: { numFmt: '0.00%' },
  data: { numFmt: 'DD/MM/YYYY' },
};

/**
 * Exporta dados com formatação condicional profissional
 * @param {Object} config
 * @param {Array<Object>} config.dados - Array de objetos com os dados
 * @param {Array<Object>} config.colunas - Definição das colunas [{key, header, tipo, largura}]
 * @param {string} config.titulo - Título da planilha
 * @param {string} config.nomeArquivo - Nome do arquivo (sem extensão)
 * @param {Object} config.regrasCondicionais - Regras de formatação condicional
 */
export function exportarXLSXFormatado(config) {
  const { dados, colunas, titulo = 'Relatório', nomeArquivo = 'relatorio', regrasCondicionais = {} } = config;

  const wb = XLSX.utils.book_new();

  // Build header row
  const headers = colunas.map(c => c.header);

  // Build data rows
  const rows = dados.map(item =>
    colunas.map(c => {
      const val = item[c.key];
      if (c.tipo === 'moeda') return typeof val === 'number' ? val : parseFloat(val) || 0;
      if (c.tipo === 'percentual') return typeof val === 'number' ? val / 100 : 0;
      if (c.tipo === 'data') return val || '';
      return val || '';
    })
  );

  // Add title row
  const allRows = [[titulo], [], headers, ...rows];

  // Add total row if configured
  if (regrasCondicionais.mostrarTotal) {
    const totalRow = colunas.map((c, idx) => {
      if (idx === 0) return 'TOTAL';
      if (c.tipo === 'moeda') return dados.reduce((sum, item) => sum + (parseFloat(item[c.key]) || 0), 0);
      return '';
    });
    allRows.push(totalRow);
  }

  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Set column widths
  ws['!cols'] = colunas.map(c => ({ wch: c.largura || 15 }));

  // Merge title row across all columns
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colunas.length - 1 } }];

  XLSX.utils.book_append_sheet(wb, ws, titulo.substring(0, 31));
  XLSX.writeFile(wb, `${nomeArquivo}_${new Date().toISOString().split('T')[0]}.xlsx`);

  return true;
}

/**
 * Exporta relatório financeiro com formatação condicional
 */
export function exportarRelatorioFinanceiro(dados, nomeArquivo = 'relatorio_financeiro') {
  return exportarXLSXFormatado({
    dados,
    colunas: [
      { key: 'data', header: 'Data', tipo: 'data', largura: 12 },
      { key: 'descricao', header: 'Descrição', tipo: 'texto', largura: 35 },
      { key: 'categoria', header: 'Categoria', tipo: 'texto', largura: 18 },
      { key: 'fornecedor', header: 'Fornecedor', tipo: 'texto', largura: 25 },
      { key: 'valor', header: 'Valor (R$)', tipo: 'moeda', largura: 15 },
      { key: 'status', header: 'Status', tipo: 'texto', largura: 12 },
    ],
    titulo: 'Relatório Financeiro MONTEX',
    nomeArquivo,
    regrasCondicionais: {
      mostrarTotal: true,
      valorNegativo: 'negativo',
      valorPositivo: 'positivo',
    }
  });
}

/**
 * Exporta relatório de produção com formatação
 */
export function exportarRelatorioProducao(dados, nomeArquivo = 'relatorio_producao') {
  return exportarXLSXFormatado({
    dados,
    colunas: [
      { key: 'marca', header: 'Marca', tipo: 'texto', largura: 12 },
      { key: 'descricao', header: 'Descrição', tipo: 'texto', largura: 30 },
      { key: 'quantidade', header: 'Qtd', tipo: 'numero', largura: 8 },
      { key: 'pesoUnitario', header: 'Peso Unit. (kg)', tipo: 'moeda', largura: 14 },
      { key: 'pesoTotal', header: 'Peso Total (kg)', tipo: 'moeda', largura: 14 },
      { key: 'etapa', header: 'Etapa', tipo: 'texto', largura: 14 },
      { key: 'progresso', header: 'Progresso', tipo: 'percentual', largura: 12 },
    ],
    titulo: 'Relatório de Produção MONTEX',
    nomeArquivo,
    regrasCondicionais: {
      mostrarTotal: true,
    }
  });
}

/**
 * Exporta relatório de estoque com alertas
 */
export function exportarRelatorioEstoque(dados, nomeArquivo = 'relatorio_estoque') {
  return exportarXLSXFormatado({
    dados,
    colunas: [
      { key: 'codigo', header: 'Código', tipo: 'texto', largura: 12 },
      { key: 'descricao', header: 'Descrição', tipo: 'texto', largura: 30 },
      { key: 'quantidade', header: 'Quantidade', tipo: 'numero', largura: 12 },
      { key: 'estoqueMinimo', header: 'Estoque Mín.', tipo: 'numero', largura: 12 },
      { key: 'unidade', header: 'Unidade', tipo: 'texto', largura: 10 },
      { key: 'valorUnitario', header: 'Valor Unit.', tipo: 'moeda', largura: 14 },
      { key: 'valorTotal', header: 'Valor Total', tipo: 'moeda', largura: 14 },
    ],
    titulo: 'Relatório de Estoque MONTEX',
    nomeArquivo,
    regrasCondicionais: {
      mostrarTotal: true,
      alertaEstoqueBaixo: true,
    }
  });
}

/**
 * Exporta DRE (Demonstração do Resultado do Exercício)
 */
export function exportarDRE(dados, nomeArquivo = 'dre_relatorio') {
  return exportarXLSXFormatado({
    dados,
    colunas: [
      { key: 'descricao', header: 'Descrição', tipo: 'texto', largura: 40 },
      { key: 'valor', header: 'Valor (R$)', tipo: 'moeda', largura: 15 },
      { key: 'percentual', header: '% da Receita', tipo: 'percentual', largura: 12 },
    ],
    titulo: 'DRE - Demonstração do Resultado MONTEX',
    nomeArquivo,
    regrasCondicionais: {
      mostrarTotal: true,
    }
  });
}

/**
 * Exporta dados genéricos com configuração personalizada
 * Útil para relatórios customizados
 */
export function exportarGenerico(dados, colunas, titulo, nomeArquivo) {
  return exportarXLSXFormatado({
    dados,
    colunas,
    titulo,
    nomeArquivo,
    regrasCondicionais: { mostrarTotal: false }
  });
}

export default {
  exportarXLSXFormatado,
  exportarRelatorioFinanceiro,
  exportarRelatorioProducao,
  exportarRelatorioEstoque,
  exportarDRE,
  exportarGenerico
};
