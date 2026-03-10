/**
 * EXEMPLO DE INTEGRAÇÃO - ExportScheduler + xlsxExportUtils
 *
 * Este arquivo mostra como integrar os novos recursos em uma página existente
 * Ele demonstra tanto a exportação rápida quanto o agendamento periódico
 */

// ===== 1. IMPORTAÇÕES =====
import React, { useState, useMemo } from 'react';
import { Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Novos utilitários de exportação
import {
  exportarRelatorioFinanceiro,
  exportarRelatorioProducao,
  exportarRelatorioEstoque,
  exportarDRE,
  exportarGenerico
} from '@/utils/xlsxExportUtils';

// Novo componente de agendador
import ExportScheduler from '@/components/ExportScheduler';
import ExportToolbar from '@/components/ExportToolbar';

// ===== 2. EXEMPLO DE USO EM UMA PÁGINA (tipo DespesasPage) =====

export function DespesasPageComExportacao() {
  // Estado e dados
  const [despesas, setDespesas] = useState([
    {
      id: 1,
      data: '2024-03-01',
      descricao: 'Matéria Prima A',
      categoria: 'Matéria Prima',
      fornecedor: 'Fornecedor XYZ',
      valor: 5000.00,
      status: 'Pago',
    },
    // ... mais despesas
  ]);

  // ===== EXPORTAÇÃO RÁPIDA (XLSX) =====
  const handleExportarDespesasXLSX = async () => {
    const dados = despesas.map(d => ({
      data: d.data,
      descricao: d.descricao,
      categoria: d.categoria,
      fornecedor: d.fornecedor,
      valor: d.valor,
      status: d.status,
    }));

    // Usar a função de exportação formatada
    exportarRelatorioFinanceiro(dados, `despesas_${new Date().toISOString().split('T')[0]}`);
  };

  // ===== EXPORTAÇÃO RÁPIDA (PDF - usar existente) =====
  const handleExportarDespesasPDF = async () => {
    // Implementar conforme necessário usando jsPDF
    // Ou usar a função existente
  };

  // ===== RENDERIZAÇÃO =====
  return (
    <div className="space-y-6">
      {/* Cabeçalho com controles de exportação */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão de Despesas</h1>

        {/* Opção 1: Usar ExportToolbar (Recomendado) */}
        <ExportToolbar
          label="Exportar Despesas"
          onExportXLSX={handleExportarDespesasXLSX}
          onExportPDF={handleExportarDespesasPDF}
          showScheduler={true}
        />

        {/* Opção 2: Usar componentes individuais */}
        {/*
        <div className="flex gap-2">
          <Button onClick={handleExportarDespesasXLSX} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar XLSX
          </Button>
          <ExportScheduler />
        </div>
        */}
      </div>

      {/* Conteúdo da página */}
      <div>
        {/* Tabelas, gráficos, etc. */}
      </div>
    </div>
  );
}

// ===== 3. EXEMPLO DE USO COM DADOS TRANSFORMADOS =====

export function RelatorioFinanceiroComExportacao() {
  const [relatorio, setRelatorio] = useState({
    periodo: 'Março 2024',
    receitas: 50000,
    despesas: 30000,
    saldo: 20000,
    movimentacoes: [
      {
        data: '2024-03-01',
        descricao: 'Venda de Produto A',
        categoria: 'Receita',
        fornecedor: 'Cliente XYZ',
        valor: 10000,
        status: 'Confirmado',
      },
      // ... mais movimentações
    ],
  });

  const handleExportarRelatorio = () => {
    const dados = relatorio.movimentacoes.map(m => ({
      data: m.data,
      descricao: m.descricao,
      categoria: m.categoria,
      fornecedor: m.fornecedor,
      valor: m.valor,
      status: m.status,
    }));

    exportarRelatorioFinanceiro(
      dados,
      `relatorio_financeiro_${relatorio.periodo.replace(/\s/g, '_')}`
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h2 className="text-xl font-bold">{relatorio.periodo}</h2>
        <Button onClick={handleExportarRelatorio} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>
      {/* Conteúdo do relatório */}
    </div>
  );
}

// ===== 4. EXEMPLO DE DRE COM EXPORTAÇÃO =====

export function DREComExportacao() {
  const [dre, setDre] = useState([
    { descricao: 'Receita Bruta', valor: 100000, percentual: 1.0 },
    { descricao: '(-) Impostos', valor: -15000, percentual: -0.15 },
    { descricao: 'Receita Líquida', valor: 85000, percentual: 0.85 },
    { descricao: '(-) COGS', valor: -40000, percentual: -0.40 },
    { descricao: 'Lucro Bruto', valor: 45000, percentual: 0.45 },
    { descricao: '(-) Despesas Operacionais', valor: -20000, percentual: -0.20 },
    { descricao: 'EBITDA', valor: 25000, percentual: 0.25 },
  ]);

  const handleExportarDRE = () => {
    exportarDRE(dre, `dre_${new Date().getMonth() + 1}_${new Date().getFullYear()}`);
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">DRE - Demonstração do Resultado</h2>
        <Button onClick={handleExportarDRE} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar DRE
        </Button>
      </div>
      {/* Tabela de DRE */}
    </div>
  );
}

// ===== 5. EXEMPLO COM CUSTOMIZAÇÃO COMPLETA =====

export function RelatorioCustomizadoComExportacao() {
  const [dados, setDados] = useState([]);

  // Função customizada de exportação
  const handleExportarCustomizado = () => {
    const colunas = [
      { key: 'id', header: 'ID Projeto', tipo: 'texto', largura: 10 },
      { key: 'nome', header: 'Nome do Projeto', tipo: 'texto', largura: 35 },
      { key: 'budget', header: 'Budget (R$)', tipo: 'moeda', largura: 15 },
      { key: 'gasto', header: 'Gasto (R$)', tipo: 'moeda', largura: 15 },
      { key: 'restante', header: 'Restante (R$)', tipo: 'moeda', largura: 15 },
      { key: 'percentualGasto', header: 'Utilização', tipo: 'percentual', largura: 12 },
      { key: 'dataInicio', header: 'Data Início', tipo: 'data', largura: 12 },
    ];

    exportarGenerico(
      dados,
      colunas,
      'Relatório de Projetos e Budgets',
      'projetos_relatorio'
    );
  };

  return (
    <div>
      <Button onClick={handleExportarCustomizado}>
        Exportar Relatório Customizado
      </Button>
    </div>
  );
}

// ===== 6. PADRÃO DE INTEGRAÇÃO EM COMPONENTES EXISTENTES =====

/**
 * Checklist de integração:
 *
 * 1. IMPORTAR OS UTILITÁRIOS
 *    import { exportarRelatorioFinanceiro, ... } from '@/utils/xlsxExportUtils';
 *    import ExportScheduler from '@/components/ExportScheduler';
 *
 * 2. CRIAR FUNÇÕES DE EXPORTAÇÃO
 *    - Transformar dados para o formato esperado
 *    - Chamar a função de exportação apropriada
 *
 * 3. ADICIONAR BOTÕES NA UI
 *    - Usar ExportToolbar para layout padrão
 *    - Ou adicionar componentes individuais
 *
 * 4. TESTAR A EXPORTAÇÃO
 *    - Verificar se o arquivo é gerado
 *    - Verificar se os dados estão corretos
 *    - Verificar formatação no Excel
 */

// ===== 7. EXEMPLO MÍNIMO =====

export function ExemploMinimo() {
  const minhasDados = [
    { nome: 'Item 1', valor: 100 },
    { nome: 'Item 2', valor: 200 },
  ];

  const handleExportar = () => {
    exportarGenerico(
      minhasDados,
      [
        { key: 'nome', header: 'Nome', tipo: 'texto', largura: 20 },
        { key: 'valor', header: 'Valor', tipo: 'moeda', largura: 15 },
      ],
      'Meu Relatório',
      'meu_relatorio'
    );
  };

  return <Button onClick={handleExportar}>Exportar</Button>;
}
