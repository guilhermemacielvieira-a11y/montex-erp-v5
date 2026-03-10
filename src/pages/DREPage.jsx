import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronRight, FileText, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useFinancialIntelligence } from '../hooks/useFinancialIntelligence';

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function DREPage() {
  const [periodo, setPeriodo] = useState('mensal');
  const [expandedSections, setExpandedSections] = useState({
    csp: false,
    operacional: false,
  });

  // Buscar dados financeiros
  const financialData = useFinancialIntelligence({ periodo });

  // Calcular DRE baseado nos dados reais
  const dreData = useMemo(() => {
    const {
      kpisGerais,
      custosPorCategoria,
      margemOperacional,
      custoTotalGeral,
    } = financialData;

    // Receita Operacional Bruta (faturamento)
    const receitaBruta = kpisGerais.faturamento || 0;

    // Deduções (impostos estimados ~12%)
    const aliquotaImposto = 0.12;
    const deducoes = receitaBruta * aliquotaImposto;

    // Receita Operacional Líquida
    const receitaLiquida = receitaBruta - deducoes;

    // Custo dos Serviços Prestados (CSP) - dividido por subcategorias
    const custosMateriais = custosPorCategoria.find(c => c.categoria === 'Matéria Prima')?.valor || 0;
    const custosMaoObra = custosPorCategoria.find(c => c.categoria === 'Mão de Obra')?.valor || 0;
    const custosFabricacao = custosPorCategoria.find(c => c.categoria === 'Manutenção')?.valor || 0;
    const cspTotal = custosMateriais + custosMaoObra + custosFabricacao;

    // Lucro Bruto
    const lucroBruto = receitaLiquida - cspTotal;

    // Despesas Operacionais
    const despesasAdministrativas = custosPorCategoria.find(c => c.categoria === 'Administrativo')?.valor || 0;
    const despesasTransporte = custosPorCategoria.find(c => c.categoria === 'Transporte')?.valor || 0;
    const despesasEnergia = custosPorCategoria.find(c => c.categoria === 'Energia/Utilidades')?.valor || 0;
    const despesasConsumíveis = custosTotalGeral * 0.05; // Estimado em 5% dos custos totais
    const despesasOperacionaisTotal = despesasAdministrativas + despesasTransporte + despesasEnergia + despesasConsumíveis;

    // EBITDA (Resultado Operacional)
    const ebitda = lucroBruto - despesasOperacionaisTotal;

    // Depreciação estimada (3% do EBITDA)
    const depreciacao = Math.max(ebitda * 0.03, 0);

    // Resultado Antes do IR
    const resultadoAntesIR = ebitda - depreciacao;

    // IR/CSLL estimado (34% do resultado positivo)
    const irCsll = Math.max(resultadoAntesIR * 0.34, 0);

    // Lucro Líquido
    const lucroLiquido = resultadoAntesIR - irCsll;

    return {
      // Receitas
      receitaBruta,
      deducoes,
      receitaLiquida,

      // CSP
      custosMateriais,
      custosMaoObra,
      custosFabricacao,
      cspTotal,

      // Lucro Bruto
      lucroBruto,

      // Despesas Operacionais
      despesasAdministrativas,
      despesasTransporte,
      despesasEnergia,
      despesasConsumíveis,
      despesasOperacionaisTotal,

      // Resultado Operacional
      ebitda,

      // Depreciação
      depreciacao,

      // Resultado Antes IR
      resultadoAntesIR,

      // IR/CSLL
      irCsll,

      // Lucro Líquido
      lucroLiquido,

      // Margens
      margemBruta: receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0,
      margemOperacional: receitaLiquida > 0 ? (ebitda / receitaLiquida) * 100 : 0,
      margemLiquida: receitaLiquida > 0 ? (lucroLiquido / receitaLiquida) * 100 : 0,
    };
  }, [financialData]);

  // Dados para gráfico comparativo
  const chartData = useMemo(() => {
    return [
      {
        name: 'Receita Bruta',
        valor: dreData.receitaBruta,
        fill: '#10B981'
      },
      {
        name: 'Custos CSP',
        valor: -dreData.cspTotal,
        fill: '#EF4444'
      },
      {
        name: 'Despesas Op.',
        valor: -dreData.despesasOperacionaisTotal,
        fill: '#F59E0B'
      },
      {
        name: 'Lucro Líquido',
        valor: dreData.lucroLiquido,
        fill: dreData.lucroLiquido > 0 ? '#3B82F6' : '#EF4444'
      }
    ];
  }, [dreData]);

  // Dados para gráfico de margens
  const margenData = useMemo(() => {
    return [
      { name: 'Margem Bruta', valor: Math.max(dreData.margemBruta, 0), fill: '#10B981' },
      { name: 'Margem Operacional', valor: Math.max(dreData.margemOperacional, 0), fill: '#3B82F6' },
      { name: 'Margem Líquida', valor: Math.max(dreData.margemLiquida, 0), fill: '#8B5CF6' },
    ];
  }, [dreData]);

  // Toggle de seções expandidas
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Exportar DRE como PDF (simulado)
  const handleExportPDF = () => {
    const content = `
DEMONSTRAÇÃO DE RESULTADOS DO EXERCÍCIO (DRE)
Período: ${periodo}
Data: ${new Date().toLocaleDateString('pt-BR')}

RECEITA OPERACIONAL BRUTA: ${formatCurrency(dreData.receitaBruta)}
(-) Deduções: ${formatCurrency(dreData.deducoes)}
(=) RECEITA OPERACIONAL LÍQUIDA: ${formatCurrency(dreData.receitaLiquida)}

CUSTOS DOS SERVIÇOS PRESTADOS:
  Mão de Obra Direta: ${formatCurrency(dreData.custosMaoObra)}
  Materiais/Matéria Prima: ${formatCurrency(dreData.custosMateriais)}
  Custos de Fabricação: ${formatCurrency(dreData.custosFabricacao)}
(-) TOTAL CSP: ${formatCurrency(dreData.cspTotal)}

(=) LUCRO BRUTO: ${formatCurrency(dreData.lucroBruto)}

DESPESAS OPERACIONAIS:
  Despesas Administrativas: ${formatCurrency(dreData.despesasAdministrativas)}
  Transporte/Logística: ${formatCurrency(dreData.despesasTransporte)}
  Energia/Utilidades: ${formatCurrency(dreData.despesasEnergia)}
  Consumíveis: ${formatCurrency(dreData.despesasConsumíveis)}
(-) TOTAL DESPESAS OPERACIONAIS: ${formatCurrency(dreData.despesasOperacionaisTotal)}

(=) RESULTADO OPERACIONAL (EBITDA): ${formatCurrency(dreData.ebitda)}
(-) Depreciação: ${formatCurrency(dreData.depreciacao)}

(=) RESULTADO ANTES DO IR: ${formatCurrency(dreData.resultadoAntesIR)}
(-) IR/CSLL: ${formatCurrency(dreData.irCsll)}

(=) LUCRO LÍQUIDO: ${formatCurrency(dreData.lucroLiquido)}

MARGENS:
Margem Bruta: ${dreData.margemBruta.toFixed(2)}%
Margem Operacional: ${dreData.margemOperacional.toFixed(2)}%
Margem Líquida: ${dreData.margemLiquida.toFixed(2)}%
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DRE_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                  <FileText className="h-10 w-10 text-blue-400" />
                  Demonstração de Resultados do Exercício (DRE)
                </h1>
                <p className="text-slate-400 mt-2">Análise completa de receitas, custos e lucratividade</p>
              </div>

              <div className="flex items-center gap-3">
                <Select value={periodo} onValueChange={setPeriodo}>
                  <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleExportPDF}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>

            {/* KPIs de Margens */}
            <div className="grid grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm text-slate-400">Margem Bruta</p>
                </div>
                <p className="text-2xl font-bold text-white">{dreData.margemBruta.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 mt-1">{formatCurrency(dreData.lucroBruto)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-400" />
                  <p className="text-sm text-slate-400">Margem Operacional</p>
                </div>
                <p className="text-2xl font-bold text-white">{dreData.margemOperacional.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 mt-1">{formatCurrency(dreData.ebitda)}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className={cn("h-4 w-4", dreData.margemLiquida > 0 ? "text-emerald-400" : "text-red-400")} />
                  <p className="text-sm text-slate-400">Margem Líquida</p>
                </div>
                <p className={cn("text-2xl font-bold", dreData.margemLiquida > 0 ? "text-emerald-400" : "text-red-400")}>
                  {dreData.margemLiquida.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500 mt-1">{formatCurrency(dreData.lucroLiquido)}</p>
              </motion.div>
            </div>
          </motion.div>

          {/* Tabela DRE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 mb-6"
          >
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" />
              Demonstração de Resultados
            </h2>

            <div className="space-y-2">
              {/* Receita Operacional Bruta */}
              <DRELineItem
                label="RECEITA OPERACIONAL BRUTA"
                value={dreData.receitaBruta}
                isHeader
                operation="add"
              />

              <DRELineItem
                label="(-) Deduções / Devoluções"
                value={dreData.deducoes}
                indent={1}
                operation="subtract"
              />

              <DRELineItem
                label="RECEITA OPERACIONAL LÍQUIDA"
                value={dreData.receitaLiquida}
                isTotal
                operation="equal"
              />

              {/* Custo dos Serviços Prestados */}
              <div className="mt-4">
                <button
                  onClick={() => toggleSection('csp')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-semibold w-full py-2 px-4 rounded-lg hover:bg-slate-700/30 transition-colors"
                >
                  {expandedSections.csp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  (-) CUSTO DOS SERVIÇOS PRESTADOS
                </button>

                {expandedSections.csp && (
                  <div className="ml-4 space-y-2 border-l border-slate-700/50 pl-4 my-2">
                    <DRELineItem
                      label="Mão de Obra Direta"
                      value={dreData.custosMaoObra}
                      indent={1}
                      operation="subtract"
                    />
                    <DRELineItem
                      label="Materiais/Matéria Prima"
                      value={dreData.custosMateriais}
                      indent={1}
                      operation="subtract"
                    />
                    <DRELineItem
                      label="Custos de Fabricação"
                      value={dreData.custosFabricacao}
                      indent={1}
                      operation="subtract"
                    />
                  </div>
                )}
              </div>

              <DRELineItem
                label="TOTAL CUSTO DOS SERVIÇOS PRESTADOS"
                value={dreData.cspTotal}
                isBold
                operation="subtract"
              />

              <DRELineItem
                label="LUCRO BRUTO"
                value={dreData.lucroBruto}
                isTotal
                operation="equal"
              />

              {/* Despesas Operacionais */}
              <div className="mt-4">
                <button
                  onClick={() => toggleSection('operacional')}
                  className="flex items-center gap-2 text-slate-300 hover:text-white text-sm font-semibold w-full py-2 px-4 rounded-lg hover:bg-slate-700/30 transition-colors"
                >
                  {expandedSections.operacional ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  (-) DESPESAS OPERACIONAIS
                </button>

                {expandedSections.operacional && (
                  <div className="ml-4 space-y-2 border-l border-slate-700/50 pl-4 my-2">
                    <DRELineItem
                      label="Despesas Administrativas"
                      value={dreData.despesasAdministrativas}
                      indent={1}
                      operation="subtract"
                    />
                    <DRELineItem
                      label="Transporte/Logística"
                      value={dreData.despesasTransporte}
                      indent={1}
                      operation="subtract"
                    />
                    <DRELineItem
                      label="Energia/Utilidades"
                      value={dreData.despesasEnergia}
                      indent={1}
                      operation="subtract"
                    />
                    <DRELineItem
                      label="Consumíveis"
                      value={dreData.despesasConsumíveis}
                      indent={1}
                      operation="subtract"
                    />
                  </div>
                )}
              </div>

              <DRELineItem
                label="TOTAL DESPESAS OPERACIONAIS"
                value={dreData.despesasOperacionaisTotal}
                isBold
                operation="subtract"
              />

              <DRELineItem
                label="RESULTADO OPERACIONAL (EBITDA)"
                value={dreData.ebitda}
                isTotal
                operation="equal"
              />

              {/* Depreciação e IR */}
              <DRELineItem
                label="(-) Depreciação"
                value={dreData.depreciacao}
                indent={1}
                operation="subtract"
              />

              <DRELineItem
                label="RESULTADO ANTES DO IR/CSLL"
                value={dreData.resultadoAntesIR}
                isTotal
                operation="equal"
              />

              <DRELineItem
                label="(-) IR/CSLL"
                value={dreData.irCsll}
                indent={1}
                operation="subtract"
              />

              <DRELineItem
                label="LUCRO LÍQUIDO DO EXERCÍCIO"
                value={dreData.lucroLiquido}
                isTotal
                isBold
                operation="equal"
              />
            </div>
          </motion.div>

          {/* Gráficos */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Gráfico de DRE */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6"
            >
              <h3 className="text-lg font-bold text-white mb-4">Evolução do DRE</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valor" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Gráfico de Margens */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6"
            >
              <h3 className="text-lg font-bold text-white mb-4">Análise de Margens (%)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={margenData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94A3B8" />
                  <YAxis stroke="#94A3B8" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valor" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Resumo Executivo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">Resumo Executivo</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-400 mb-4">
                  <strong>Análise de Lucratividade:</strong> A empresa apresenta margem bruta de {dreData.margemBruta.toFixed(1)}%, indicando que {((dreData.lucroBruto / dreData.receitaLiquida) * 100).toFixed(1)}% da receita líquida permanece após os custos diretos. A margem operacional de {dreData.margemOperacional.toFixed(1)}% reflete a eficiência operacional, enquanto a margem líquida de {dreData.margemLiquida.toFixed(1)}% mostra o resultado final.
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">
                  <strong>Principais Drivers:</strong> Os custos de serviços (CSP) representam {((dreData.cspTotal / dreData.receitaLiquida) * 100).toFixed(1)}% da receita, enquanto despesas operacionais consomem {((dreData.despesasOperacionaisTotal / dreData.receitaLiquida) * 100).toFixed(1)}%. A relação entre receita bruta ({formatCurrency(dreData.receitaBruta)}) e lucro líquido ({formatCurrency(dreData.lucroLiquido)}) demonstra a estrutura de custos da operação.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
  );
}
