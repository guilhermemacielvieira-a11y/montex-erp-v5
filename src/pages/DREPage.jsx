import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, ChevronDown, ChevronUp, FileText, Download, Filter, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { useLancamentos, useMedicoes } from '../contexts/ERPContext';
import { useReceitasManuais } from '../utils/receitasSync';
import { calcularDRE, intervaloDoPeriodo } from '../utils/dreCalc';
import { hojeLocalISO, parseValorBR } from '../utils/financeiroCalc';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================
// DRE — Demonstração de Resultados a partir de dados REAIS
// ============================================================
// Receita: medições aprovadas/faturadas/pagas + receitas manuais
// faturadas/recebidas no período. Custos: lancamentos_despesas do período
// (exceto cancelados) por categoria. Impostos, depreciação e IR/CSLL são
// PREMISSAS editáveis (default 0), rotuladas como estimativa — nada de
// constantes escondidas. Cálculo em ../utils/dreCalc (testado).
// ============================================================

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const PERIODOS = [
  { value: 'mes_atual', label: 'Mês atual' },
  { value: 'mes_anterior', label: 'Mês anterior' },
  { value: 'trimestre', label: 'Trimestre atual' },
  { value: 'ano', label: 'Ano atual' },
  { value: 'tudo', label: 'Todo o histórico' },
];

// DRE da EMPRESA (premissa do negócio — CLAUDE.md "Financeiro"): receitas
// pelo total; despesas lançadas direto na obra (GFO) não entram. Resultado
// por obra fica na Gestão Financeira da Obra / Margem por Obra.
const ESCOPOS = [
  { value: 'empresa', label: 'Empresa (caixa)' },
];

const PREMISSAS_KEY = 'montex_dre_premissas';
const PREMISSAS_PADRAO = { aliquotaImpostosPct: '0', depreciacaoValor: '0', aliquotaIRPct: '0' };

const lerPremissas = () => {
  try {
    const v = localStorage.getItem(PREMISSAS_KEY);
    return v ? { ...PREMISSAS_PADRAO, ...JSON.parse(v) } : PREMISSAS_PADRAO;
  } catch { return PREMISSAS_PADRAO; }
};

// Componente de linha do DRE
function DRELineItem({ label, value, isHeader, isTotal, isBold, indent = 0, operation, hint }) {
  const displayValue = Math.abs(value || 0);

  return (
    <div
      className={cn(
        "flex items-center justify-between py-2 px-4 rounded-lg transition-colors",
        isHeader && "bg-emerald-500/10 border border-emerald-500/20",
        isTotal && "bg-blue-500/10 border border-blue-500/20 mt-2",
        isBold && "font-bold",
        !isHeader && !isTotal && "hover:bg-slate-700/20",
        indent > 0 && "ml-6"
      )}
    >
      <span className={cn(
        "text-sm",
        isHeader || isTotal ? "font-semibold text-white" : "text-slate-300",
        isBold && "text-white"
      )}>
        {label}
        {hint && <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-400/80">{hint}</span>}
      </span>
      <span className={cn(
        "text-sm font-mono",
        isHeader ? "text-emerald-400 font-semibold" : "",
        isTotal && value >= 0 ? "text-blue-400 font-semibold" : "",
        isTotal && value < 0 ? "text-red-400 font-semibold" : "",
        !isHeader && !isTotal && value >= 0 ? "text-slate-200" : "",
        !isHeader && !isTotal && value < 0 ? "text-red-400" : "",
        operation === 'subtract' ? "text-red-400" : ""
      )}>
        {operation === 'subtract' && '- '}{isTotal && value < 0 ? '- ' : ''}{formatCurrency(displayValue)}
      </span>
    </div>
  );
}

// Componente de tooltip personalizado para gráficos
function CustomTooltip({ active, payload, label, formatter = formatCurrency }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
      <p className="text-white text-sm font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-slate-300 text-sm">
          {formatter(p.value)}
        </p>
      ))}
    </div>
  );
}

function PremissaInput({ label, value, onChange, sufixo, ajuda }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        />
        <span className="text-xs text-slate-500 whitespace-nowrap">{sufixo}</span>
      </div>
      {ajuda && <span className="text-[11px] text-slate-500">{ajuda}</span>}
    </label>
  );
}

export default function DREPage() {
  const [periodo, setPeriodo] = useState('mes_atual');
  const escopo = 'empresa';
  const [expandedSections, setExpandedSections] = useState({ csp: true, operacional: true, financeira: false });
  const [premissas, setPremissas] = useState(lerPremissas);

  useEffect(() => {
    try { localStorage.setItem(PREMISSAS_KEY, JSON.stringify(premissas)); } catch { /* storage indisponível */ }
  }, [premissas]);

  const { lancamentosDespesas } = useLancamentos();
  const { medicoes } = useMedicoes();
  const { receitas: receitasManuais } = useReceitasManuais();

  const intervalo = useMemo(() => intervaloDoPeriodo(periodo), [periodo]);

  const dreData = useMemo(() => calcularDRE({
    medicoes,
    receitasManuais,
    despesas: lancamentosDespesas,
    inicio: intervalo.inicio,
    fim: intervalo.fim,
    escopo,
    premissas: {
      aliquotaImpostosPct: parseValorBR(premissas.aliquotaImpostosPct),
      depreciacaoValor: parseValorBR(premissas.depreciacaoValor),
      aliquotaIRPct: parseValorBR(premissas.aliquotaIRPct),
    },
  }), [medicoes, receitasManuais, lancamentosDespesas, intervalo, escopo, premissas]);

  const catsGrupo = (g) => dreData.categorias.filter((c) => c.grupo === g);

  const periodoLabel = PERIODOS.find((p) => p.value === periodo)?.label || periodo;
  const escopoLabel = ESCOPOS.find((e) => e.value === escopo)?.label || escopo;
  const intervaloLabel = intervalo.inicio
    ? `${intervalo.inicio.toLocaleDateString('pt-BR')} a ${intervalo.fim.toLocaleDateString('pt-BR')}`
    : 'Todo o histórico';

  // Dados para gráfico comparativo
  const chartData = useMemo(() => [
    { name: 'Receita Bruta', valor: dreData.receitaBruta, fill: '#10B981' },
    { name: 'Custos CSP', valor: -dreData.cspTotal, fill: '#EF4444' },
    { name: 'Despesas Op.', valor: -dreData.despesasOperacionaisTotal, fill: '#F59E0B' },
    { name: 'Lucro Líquido', valor: dreData.lucroLiquido, fill: dreData.lucroLiquido > 0 ? '#3B82F6' : '#EF4444' }
  ], [dreData]);

  // Dados para gráfico de margens
  const margenData = useMemo(() => [
    { name: 'Margem Bruta', valor: dreData.margemBruta, fill: '#10B981' },
    { name: 'Margem Operacional', valor: dreData.margemOperacional, fill: '#3B82F6' },
    { name: 'Margem Líquida', valor: dreData.margemLiquida, fill: '#8B5CF6' },
  ], [dreData]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const setPremissa = (campo) => (valor) => setPremissas((p) => ({ ...p, [campo]: valor }));

  // ===== EXPORTAÇÃO PDF (jsPDF) =====
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 15;
      let y = 18;

      const novaPaginaSePreciso = (alt = 7) => {
        if (y + alt > H - 15) { doc.addPage(); y = 18; }
      };
      const linha = (rotulo, valor, { bold = false, indent = 0, sinal = '', destaque = false } = {}) => {
        novaPaginaSePreciso();
        if (destaque) {
          doc.setFillColor(235, 241, 250);
          doc.rect(M, y - 4.5, W - 2 * M, 6.5, 'F');
        }
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(String(rotulo), M + 2 + indent, y);
        const txt = `${sinal}${formatCurrency(Math.abs(valor || 0))}`;
        doc.text(valor < 0 && !sinal ? `- ${txt}` : txt, W - M - 2, y, { align: 'right' });
        y += 6.5;
      };
      const secao = (titulo) => {
        novaPaginaSePreciso(10);
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.text(titulo, M + 2, y);
        y += 6;
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text('Demonstração de Resultados (DRE)', M, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Grupo MONTEX · ${escopoLabel} · ${periodoLabel} (${intervaloLabel})`, M, y);
      y += 4.5;
      doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')} · ${dreData.qtdMedicoes} medições, ${dreData.qtdReceitasManuais} receitas manuais, ${dreData.qtdDespesas} despesas`, M, y);
      y += 4;
      doc.setDrawColor(203, 213, 225);
      doc.line(M, y, W - M, y);
      y += 7;

      linha('RECEITA OPERACIONAL BRUTA', dreData.receitaBruta, { bold: true, destaque: true });
      linha('Medições (aprovadas/faturadas/pagas)', dreData.receitaMedicoes, { indent: 4 });
      linha('Receitas manuais (faturadas/recebidas)', dreData.receitaManual, { indent: 4 });
      linha('(-) Retenções (bruto - líquido)', dreData.retencoes, { indent: 4, sinal: '- ' });
      linha(`(-) Impostos s/ receita - estimativa ${premissas.aliquotaImpostosPct || 0}%`, dreData.impostos, { indent: 4, sinal: '- ' });
      linha('RECEITA OPERACIONAL LÍQUIDA', dreData.receitaLiquida, { bold: true, destaque: true });

      secao('(-) CUSTO DOS SERVIÇOS PRESTADOS');
      catsGrupo('csp').forEach((c) => linha(c.categoria, c.valor, { indent: 4, sinal: '- ' }));
      linha('TOTAL CSP', dreData.cspTotal, { bold: true, sinal: '- ' });
      linha('LUCRO BRUTO', dreData.lucroBruto, { bold: true, destaque: true });

      secao('(-) DESPESAS OPERACIONAIS');
      catsGrupo('operacional').forEach((c) => linha(c.categoria, c.valor, { indent: 4, sinal: '- ' }));
      linha('TOTAL DESPESAS OPERACIONAIS', dreData.despesasOperacionaisTotal, { bold: true, sinal: '- ' });
      linha('RESULTADO OPERACIONAL (EBITDA)', dreData.ebitda, { bold: true, destaque: true });

      linha('(-) Depreciação - estimativa', dreData.depreciacao, { indent: 4, sinal: '- ' });
      linha('(-) Despesas financeiras', dreData.despesasFinanceirasTotal, { indent: 4, sinal: '- ' });
      linha('RESULTADO ANTES DO IR/CSLL', dreData.resultadoAntesIR, { bold: true, destaque: true });
      linha(`(-) IR/CSLL - estimativa ${premissas.aliquotaIRPct || 0}%`, dreData.irCsll, { indent: 4, sinal: '- ' });
      linha('LUCRO LÍQUIDO DO PERÍODO', dreData.lucroLiquido, { bold: true, destaque: true });

      y += 3;
      novaPaginaSePreciso(20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Margem bruta ${dreData.margemBruta.toFixed(1)}% · Margem operacional ${dreData.margemOperacional.toFixed(1)}% · Margem líquida ${dreData.margemLiquida.toFixed(1)}%`, M + 2, y);
      y += 6;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      const nota = 'Premissas (impostos, depreciação e IR/CSLL) são estimativas informadas pelo usuário. Receita por competência (medições reconhecidas pelo cliente); custos pela data de emissão das despesas.';
      doc.text(doc.splitTextToSize(nota, W - 2 * M - 4), M + 2, y);

      doc.save(`DRE_${escopo}_${periodo}_${hojeLocalISO()}.pdf`);
      toast.success('PDF da DRE gerado');
    } catch (err) {
      console.error('[DRE] erro ao gerar PDF', err);
      toast.error('Erro ao gerar PDF da DRE');
    }
  };

  const semDados = dreData.receitaBruta === 0 && dreData.qtdDespesas === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                <FileText className="h-10 w-10 text-blue-400" />
                Demonstração de Resultados (DRE)
              </h1>
              <p className="text-slate-400 mt-2">
                {escopoLabel} · {periodoLabel} ({intervaloLabel}) — medições reconhecidas e despesas reais do período
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-white text-sm" title="Despesas lançadas direto na obra (GFO) não entram no resultado da empresa">Empresa (caixa)</span>

              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-white">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {PERIODOS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-white">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleExportPDF}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            </div>
          </div>

          {semDados && (
            <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3 text-sm text-slate-400">
              Nenhuma medição reconhecida, receita faturada ou despesa no período selecionado.
            </div>
          )}

          {/* KPIs de Margens */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Premissas (estimativas explícitas) */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-amber-500/20 p-5 mb-6">
          <h2 className="text-sm font-semibold text-amber-300 flex items-center gap-2 mb-3">
            <Info className="h-4 w-4" />
            Premissas (estimativas) — informe os valores da sua apuração; padrão 0
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PremissaInput
              label="Impostos sobre a receita (estimativa)"
              value={premissas.aliquotaImpostosPct}
              onChange={setPremissa('aliquotaImpostosPct')}
              sufixo="% da receita bruta"
              ajuda="Ex.: Simples/ISS/PIS/COFINS efetivos"
            />
            <PremissaInput
              label="Depreciação do período (estimativa)"
              value={premissas.depreciacaoValor}
              onChange={setPremissa('depreciacaoValor')}
              sufixo="R$"
              ajuda="Valor fixo no período selecionado"
            />
            <PremissaInput
              label="IR/CSLL (estimativa)"
              value={premissas.aliquotaIRPct}
              onChange={setPremissa('aliquotaIRPct')}
              sufixo="% do resultado"
              ajuda="Aplicado só sobre resultado positivo"
            />
          </div>
        </div>

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
            <DRELineItem label="RECEITA OPERACIONAL BRUTA" value={dreData.receitaBruta} isHeader operation="add" />
            <DRELineItem label={`Medições aprovadas/faturadas/pagas (${dreData.qtdMedicoes})`} value={dreData.receitaMedicoes} indent={1} />
            <DRELineItem label={`Receitas manuais faturadas/recebidas (${dreData.qtdReceitasManuais})`} value={dreData.receitaManual} indent={1} />
            <DRELineItem label="(-) Retenções (bruto − líquido das medições)" value={dreData.retencoes} indent={1} operation="subtract" />
            <DRELineItem label={`(-) Impostos sobre a receita (${premissas.aliquotaImpostosPct || 0}%)`} value={dreData.impostos} indent={1} operation="subtract" hint="estimativa" />
            <DRELineItem label="RECEITA OPERACIONAL LÍQUIDA" value={dreData.receitaLiquida} isTotal operation="equal" />

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
                  {catsGrupo('csp').length === 0 && <p className="text-xs text-slate-500 px-4">Sem custos diretos no período.</p>}
                  {catsGrupo('csp').map((c) => (
                    <DRELineItem key={c.categoria} label={`${c.categoria} (${c.qtd})`} value={c.valor} indent={1} operation="subtract" />
                  ))}
                </div>
              )}
            </div>

            <DRELineItem label="TOTAL CUSTO DOS SERVIÇOS PRESTADOS" value={dreData.cspTotal} isBold operation="subtract" />
            <DRELineItem label="LUCRO BRUTO" value={dreData.lucroBruto} isTotal operation="equal" />

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
                  {catsGrupo('operacional').length === 0 && <p className="text-xs text-slate-500 px-4">Sem despesas operacionais no período.</p>}
                  {catsGrupo('operacional').map((c) => (
                    <DRELineItem key={c.categoria} label={`${c.categoria} (${c.qtd})`} value={c.valor} indent={1} operation="subtract" />
                  ))}
                </div>
              )}
            </div>

            <DRELineItem label="TOTAL DESPESAS OPERACIONAIS" value={dreData.despesasOperacionaisTotal} isBold operation="subtract" />
            <DRELineItem label="RESULTADO OPERACIONAL (EBITDA)" value={dreData.ebitda} isTotal operation="equal" />
            <DRELineItem label="(-) Depreciação" value={dreData.depreciacao} indent={1} operation="subtract" hint="estimativa" />

            {/* Despesas financeiras */}
            <div className="mt-2">
              <button
                onClick={() => toggleSection('financeira')}
                className="flex items-center justify-between gap-2 text-slate-300 hover:text-white text-sm w-full py-2 px-4 rounded-lg hover:bg-slate-700/30 transition-colors ml-6"
              >
                <span className="flex items-center gap-2">
                  {expandedSections.financeira ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  (-) Despesas financeiras (juros, tarifas, empréstimos)
                </span>
                <span className="font-mono text-red-400">- {formatCurrency(dreData.despesasFinanceirasTotal)}</span>
              </button>
              {expandedSections.financeira && (
                <div className="ml-10 space-y-2 border-l border-slate-700/50 pl-4 my-2">
                  {catsGrupo('financeira').length === 0 && <p className="text-xs text-slate-500 px-4">Sem despesas financeiras no período.</p>}
                  {catsGrupo('financeira').map((c) => (
                    <DRELineItem key={c.categoria} label={`${c.categoria} (${c.qtd})`} value={c.valor} indent={1} operation="subtract" />
                  ))}
                </div>
              )}
            </div>

            <DRELineItem label="RESULTADO ANTES DO IR/CSLL" value={dreData.resultadoAntesIR} isTotal operation="equal" />
            <DRELineItem label={`(-) IR/CSLL (${premissas.aliquotaIRPct || 0}%)`} value={dreData.irCsll} indent={1} operation="subtract" hint="estimativa" />
            <DRELineItem label="LUCRO LÍQUIDO DO PERÍODO" value={dreData.lucroLiquido} isTotal isBold operation="equal" />
          </div>
        </motion.div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">Composição do Resultado</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94A3B8" />
                <YAxis stroke="#94A3B8" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="valor">
                  {chartData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

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
                <Tooltip content={<CustomTooltip formatter={(v) => `${Number(v || 0).toFixed(1)}%`} />} />
                <Bar dataKey="valor">
                  {margenData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                </Bar>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-400 mb-4">
                <strong className="text-white">Lucratividade:</strong> receita líquida de {formatCurrency(dreData.receitaLiquida)} no período, com margem bruta de {dreData.margemBruta.toFixed(1)}%, margem operacional de {dreData.margemOperacional.toFixed(1)}% e margem líquida de {dreData.margemLiquida.toFixed(1)}%.
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">
                <strong className="text-white">Principais drivers:</strong> custos diretos (CSP) representam {dreData.receitaLiquida > 0 ? ((dreData.cspTotal / dreData.receitaLiquida) * 100).toFixed(1) : '0.0'}% da receita líquida e despesas operacionais {dreData.receitaLiquida > 0 ? ((dreData.despesasOperacionaisTotal / dreData.receitaLiquida) * 100).toFixed(1) : '0.0'}%.
                {dreData.categorias[0] && <> Maior categoria de custo: <strong className="text-slate-200">{dreData.categorias[0].categoria}</strong> ({formatCurrency(dreData.categorias[0].valor)}).</>}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
