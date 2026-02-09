/**
 * MONTEX ERP Premium - Simulador Inteligente de Orçamentos
 *
 * Sistema avançado para simulação e análise de orçamentos
 * com banco de dados de preços, parâmetros de mercado e estimativas
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Calculator,
  Package,
  Weight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Save,
  FileText,
  Download,
  Settings,
  ChevronDown,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Clock,
  Printer,
  History,
  Lightbulb,
  Truck,
  Wrench
} from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import * as Dialog from '@radix-ui/react-dialog';
import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import {
  CATEGORIAS_SERVICO,
  TIPOS_ESTRUTURA,
  PRECOS_ESTRUTURA,
  PRECOS_COBERTURA,
  PRECOS_FECHAMENTO,
  PRECOS_COMPLEMENTOS,
  PRECOS_MAO_OBRA,
  PRECOS_TRANSPORTE,
  PARAMETROS_MERCADO,
  HISTORICO_OBRAS,
  calcularPrecoPorFaixa,
  calcularBDI,
  calcularPrazoEstimado
} from '../data/precosDatabase';

// Cores para gráficos
const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#3b82f6'];

// Componente de Input Numérico Estilizado
const NumericInput = ({ value, onChange, min = 0, max, step = 1, prefix, suffix, className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    {prefix && <span className="text-slate-400 text-sm">{prefix}</span>}
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      min={min}
      max={max}
      step={step}
      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg
               text-white text-right focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
    />
    {suffix && <span className="text-slate-400 text-sm">{suffix}</span>}
  </div>
);

// Componente de Card de KPI do Simulador
const SimuladorKPI = ({ icon: Icon, label, value, subvalue, color, trend }) => (
  <div className={`bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border
                 border-${color}-500/30 p-4`}>
    <div className="flex items-start justify-between">
      <div className={`p-2 bg-${color}-500/20 rounded-lg`}>
        <Icon className={`w-5 h-5 text-${color}-400`} />
      </div>
      {trend !== undefined && (
        <span className={`flex items-center text-xs ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {Math.abs(trend).toFixed(1)}%
        </span>
      )}
    </div>
    <p className="text-xs text-slate-400 mt-2">{label}</p>
    <p className="text-xl font-bold text-white">{value}</p>
    {subvalue && <p className="text-xs text-slate-500">{subvalue}</p>}
  </div>
);

export default function SimuladorOrcamento() {
  // ==================== ESTADOS ====================
  const [nomeOrcamento, setNomeOrcamento] = useState('Novo Orçamento');
  const [cliente, setCliente] = useState('');
  const [tipoEstrutura, setTipoEstrutura] = useState('galpao_industrial');
  const [regiao, setRegiao] = useState('sudeste');
  const [complexidade, setComplexidade] = useState('media');
  const [nivelPreco, setNivelPreco] = useState('medio'); // baixo, medio, alto
  const [incluirMontagem, setIncluirMontagem] = useState(true);
  const [incluirTransporte, setIncluirTransporte] = useState(true);
  const [distanciaKm, setDistanciaKm] = useState(100);
  const [margemPersonalizada, setMargemPersonalizada] = useState(18);
  const [descontoPercentual, setDescontoPercentual] = useState(0);

  // Itens do orçamento
  const [itensOrcamento, setItensOrcamento] = useState([
    {
      id: 1,
      categoria: 'estrutura_metalica',
      descricao: 'Estrutura Metálica Principal',
      quantidade: 50000,
      unidade: 'KG',
      precoUnitario: 19.50,
      precoTotal: 975000
    }
  ]);

  // Modal de adicionar item
  const [showAddItem, setShowAddItem] = useState(false);
  const [novoItem, setNovoItem] = useState({
    categoria: 'estrutura_metalica',
    itemSelecionado: null,
    quantidade: 0,
    precoUnitario: 0
  });

  // Setores/Áreas do projeto
  const [setores, setSetores] = useState([
    { id: 1, nome: 'Área Principal', peso: 50000, ativo: true }
  ]);

  // Tab ativa
  const [activeTab, setActiveTab] = useState('itens');

  // ==================== CÁLCULOS ====================
  const calculos = useMemo(() => {
    const tipoConfig = TIPOS_ESTRUTURA[tipoEstrutura.toUpperCase()] || TIPOS_ESTRUTURA.GALPAO_INDUSTRIAL;
    const fatorRegiao = PARAMETROS_MERCADO.regioes[regiao] || 1.0;
    const fatorComplex = PARAMETROS_MERCADO.complexidade[complexidade] || 1.0;

    // Soma dos itens
    const subtotalItens = itensOrcamento.reduce((sum, item) => sum + (item.precoTotal || 0), 0);

    // Peso total (apenas itens em KG)
    const pesoTotal = itensOrcamento
      .filter(item => item.unidade === 'KG')
      .reduce((sum, item) => sum + (item.quantidade || 0), 0);

    // Custos de montagem
    const custoMontagem = incluirMontagem ? pesoTotal * calcularPrecoPorFaixa(
      PRECOS_MAO_OBRA[0].faixas,
      pesoTotal
    ) : 0;

    // Custos de transporte
    const custoTransporte = incluirTransporte ? (pesoTotal / 1000) * 250 + (distanciaKm * 12) : 0;

    // Subtotal com serviços
    const subtotalComServicos = subtotalItens + custoMontagem + custoTransporte;

    // Aplicar fatores
    const valorAjustado = subtotalComServicos * fatorRegiao * fatorComplex;

    // BDI
    const bdiTotal = calcularBDI();
    const valorBDI = valorAjustado * bdiTotal;

    // Margem
    const valorMargem = valorAjustado * (margemPersonalizada / 100);

    // Total bruto
    const totalBruto = valorAjustado + valorBDI + valorMargem;

    // Desconto
    const valorDesconto = totalBruto * (descontoPercentual / 100);

    // Total final
    const totalFinal = totalBruto - valorDesconto;

    // Preço por kg
    const precoMedioKg = pesoTotal > 0 ? totalFinal / pesoTotal : 0;

    // Prazo estimado
    const prazo = calcularPrazoEstimado(pesoTotal, distanciaKm);
    prazo.total = prazo.projeto + prazo.fabricacao + prazo.pintura + prazo.transporte + prazo.montagem;

    // Composição de custos
    const composicao = [
      { nome: 'Estrutura/Material', valor: subtotalItens, percentual: (subtotalItens / totalFinal) * 100 },
      { nome: 'Montagem', valor: custoMontagem, percentual: (custoMontagem / totalFinal) * 100 },
      { nome: 'Transporte', valor: custoTransporte, percentual: (custoTransporte / totalFinal) * 100 },
      { nome: 'BDI', valor: valorBDI, percentual: (valorBDI / totalFinal) * 100 },
      { nome: 'Margem', valor: valorMargem, percentual: (valorMargem / totalFinal) * 100 }
    ].filter(c => c.valor > 0);

    return {
      tipoConfig,
      fatorRegiao,
      fatorComplex,
      subtotalItens,
      pesoTotal,
      custoMontagem,
      custoTransporte,
      subtotalComServicos,
      valorAjustado,
      bdiTotal,
      valorBDI,
      valorMargem,
      totalBruto,
      valorDesconto,
      totalFinal,
      precoMedioKg,
      prazo,
      composicao
    };
  }, [itensOrcamento, tipoEstrutura, regiao, complexidade, incluirMontagem, incluirTransporte, distanciaKm, margemPersonalizada, descontoPercentual]);

  // Comparação com histórico
  const comparacaoHistorico = useMemo(() => {
    const obraRef = HISTORICO_OBRAS[0];
    if (!obraRef || calculos.pesoTotal === 0) return null;

    const precoRefKg = obraRef.totais.precoMedioKg;
    const diferencaPercentual = ((calculos.precoMedioKg - precoRefKg) / precoRefKg) * 100;

    return {
      obraReferencia: obraRef.nome,
      precoRefKg,
      diferencaPercentual,
      status: Math.abs(diferencaPercentual) <= 10 ? 'ok' :
              diferencaPercentual > 10 ? 'alto' : 'baixo'
    };
  }, [calculos]);

  // ==================== HANDLERS ====================
  const adicionarItem = useCallback(() => {
    if (!novoItem.quantidade || !novoItem.precoUnitario) return;

    const item = {
      id: Date.now(),
      categoria: novoItem.categoria,
      descricao: novoItem.itemSelecionado?.descricao || 'Item personalizado',
      quantidade: novoItem.quantidade,
      unidade: novoItem.itemSelecionado?.unidade || 'UN',
      precoUnitario: novoItem.precoUnitario,
      precoTotal: novoItem.quantidade * novoItem.precoUnitario
    };

    setItensOrcamento(prev => [...prev, item]);
    setNovoItem({ categoria: 'estrutura_metalica', itemSelecionado: null, quantidade: 0, precoUnitario: 0 });
    setShowAddItem(false);
  }, [novoItem]);

  const removerItem = useCallback((id) => {
    setItensOrcamento(prev => prev.filter(item => item.id !== id));
  }, []);

  const atualizarItem = useCallback((id, campo, valor) => {
    setItensOrcamento(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [campo]: valor };
      if (campo === 'quantidade' || campo === 'precoUnitario') {
        updated.precoTotal = (updated.quantidade || 0) * (updated.precoUnitario || 0);
      }
      return updated;
    }));
  }, []);

  // Obter itens disponíveis por categoria
  const getItensPorCategoria = (categoria) => {
    switch (categoria) {
      case 'estrutura_metalica': return PRECOS_ESTRUTURA;
      case 'cobertura': return PRECOS_COBERTURA;
      case 'fechamento': return PRECOS_FECHAMENTO;
      case 'complementos': return PRECOS_COMPLEMENTOS;
      case 'mao_de_obra':
      case 'montagem': return PRECOS_MAO_OBRA;
      case 'transporte': return PRECOS_TRANSPORTE;
      default: return [];
    }
  };

  // Dados para gráficos
  const dadosComposicao = calculos.composicao.map((c, i) => ({
    name: c.nome,
    value: c.valor,
    color: COLORS[i % COLORS.length]
  }));

  const dadosPrazo = [
    { etapa: 'Projeto', dias: calculos.prazo.projeto, color: '#3b82f6' },
    { etapa: 'Fabricação', dias: calculos.prazo.fabricacao, color: '#8b5cf6' },
    { etapa: 'Pintura', dias: calculos.prazo.pintura, color: '#ec4899' },
    { etapa: 'Transporte', dias: calculos.prazo.transporte, color: '#f59e0b' },
    { etapa: 'Montagem', dias: calculos.prazo.montagem, color: '#10b981' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                <Calculator className="w-8 h-8 text-white" />
              </div>
              Simulador de Orçamento
            </h1>
            <p className="text-slate-400 mt-1">
              Simulação inteligente com banco de dados e parâmetros de mercado
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => toast.success('Histórico em desenvolvimento')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50
                           text-slate-300 rounded-xl hover:bg-slate-700/50 transition-colors">
              <History className="w-4 h-4" />
              Histórico
            </button>
            <button
              onClick={() => {
                toast.success('Simulação salva com sucesso!');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600
                           text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all">
              <Save className="w-4 h-4" />
              Salvar
            </button>
          </div>
        </motion.div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Esquerda - Configurações */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Card Informações Básicas */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                          rounded-xl border border-slate-700/50 p-5">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-blue-400" />
                Informações do Projeto
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Nome do Orçamento</label>
                  <input
                    type="text"
                    value={nomeOrcamento}
                    onChange={(e) => setNomeOrcamento(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg
                             text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Cliente</label>
                  <input
                    type="text"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg
                             text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Tipo de Estrutura</label>
                  <Select.Root value={tipoEstrutura} onValueChange={setTipoEstrutura}>
                    <Select.Trigger className="w-full flex items-center justify-between px-3 py-2
                                             bg-slate-800/50 border border-slate-700/50 rounded-lg text-white">
                      <Select.Value />
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-50">
                        <Select.Viewport>
                          {Object.entries(TIPOS_ESTRUTURA).map(([key, tipo]) => (
                            <Select.Item
                              key={key}
                              value={tipo.id}
                              className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer"
                            >
                              <Select.ItemText>{tipo.nome}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Região</label>
                    <Select.Root value={regiao} onValueChange={setRegiao}>
                      <Select.Trigger className="w-full flex items-center justify-between px-3 py-2
                                               bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm">
                        <Select.Value />
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-50">
                          <Select.Viewport>
                            {Object.entries(PARAMETROS_MERCADO.regioes).map(([key, fator]) => (
                              <Select.Item
                                key={key}
                                value={key}
                                className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm"
                              >
                                <Select.ItemText>
                                  {key.charAt(0).toUpperCase() + key.slice(1)} ({(fator * 100 - 100).toFixed(0)}%)
                                </Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Complexidade</label>
                    <Select.Root value={complexidade} onValueChange={setComplexidade}>
                      <Select.Trigger className="w-full flex items-center justify-between px-3 py-2
                                               bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm">
                        <Select.Value />
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-50">
                          <Select.Viewport>
                            {Object.entries(PARAMETROS_MERCADO.complexidade).map(([key, fator]) => (
                              <Select.Item
                                key={key}
                                value={key}
                                className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm"
                              >
                                <Select.ItemText>
                                  {key.charAt(0).toUpperCase() + key.slice(1)} ({((fator - 1) * 100).toFixed(0)}%)
                                </Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Serviços Adicionais */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                          rounded-xl border border-slate-700/50 p-5">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-purple-400" />
                Serviços e Ajustes
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-slate-300">Incluir Montagem</span>
                  </div>
                  <Switch.Root
                    checked={incluirMontagem}
                    onCheckedChange={setIncluirMontagem}
                    className="w-11 h-6 bg-slate-700 rounded-full relative data-[state=checked]:bg-emerald-600 transition-colors"
                  >
                    <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
                  </Switch.Root>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-slate-300">Incluir Transporte</span>
                  </div>
                  <Switch.Root
                    checked={incluirTransporte}
                    onCheckedChange={setIncluirTransporte}
                    className="w-11 h-6 bg-slate-700 rounded-full relative data-[state=checked]:bg-emerald-600 transition-colors"
                  >
                    <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
                  </Switch.Root>
                </div>

                {incluirTransporte && (
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Distância (km)</label>
                    <NumericInput
                      value={distanciaKm}
                      onChange={setDistanciaKm}
                      min={0}
                      max={5000}
                      suffix="km"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-400 mb-2 block">
                    Margem de Lucro: <span className="text-emerald-400 font-bold">{margemPersonalizada}%</span>
                  </label>
                  <Slider.Root
                    value={[margemPersonalizada]}
                    onValueChange={(v) => setMargemPersonalizada(v[0])}
                    min={5}
                    max={40}
                    step={1}
                    className="relative flex items-center select-none touch-none w-full h-5"
                  >
                    <Slider.Track className="bg-slate-700 relative grow rounded-full h-2">
                      <Slider.Range className="absolute bg-emerald-500 rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg focus:outline-none" />
                  </Slider.Root>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>5%</span>
                    <span>40%</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-2 block">
                    Desconto: <span className="text-red-400 font-bold">{descontoPercentual}%</span>
                  </label>
                  <Slider.Root
                    value={[descontoPercentual]}
                    onValueChange={(v) => setDescontoPercentual(v[0])}
                    min={0}
                    max={20}
                    step={0.5}
                    className="relative flex items-center select-none touch-none w-full h-5"
                  >
                    <Slider.Track className="bg-slate-700 relative grow rounded-full h-2">
                      <Slider.Range className="absolute bg-red-500 rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg focus:outline-none" />
                  </Slider.Root>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Nível de Preços</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['baixo', 'medio', 'alto'].map((nivel) => (
                      <button
                        key={nivel}
                        onClick={() => setNivelPreco(nivel)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                  ${nivelPreco === nivel
                                    ? 'bg-cyan-500 text-white'
                                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'}`}
                      >
                        {nivel.charAt(0).toUpperCase() + nivel.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Comparação com Histórico */}
            {comparacaoHistorico && (
              <div className={`bg-gradient-to-br rounded-xl border p-4
                            ${comparacaoHistorico.status === 'ok'
                              ? 'from-emerald-900/30 to-teal-900/30 border-emerald-500/30'
                              : comparacaoHistorico.status === 'alto'
                                ? 'from-amber-900/30 to-orange-900/30 border-amber-500/30'
                                : 'from-blue-900/30 to-cyan-900/30 border-blue-500/30'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className={`w-4 h-4 ${
                    comparacaoHistorico.status === 'ok' ? 'text-emerald-400' :
                    comparacaoHistorico.status === 'alto' ? 'text-amber-400' : 'text-blue-400'
                  }`} />
                  <span className="text-sm font-medium text-white">Análise Comparativa</span>
                </div>
                <p className="text-xs text-slate-300">
                  Referência: <span className="text-white font-medium">{comparacaoHistorico.obraReferencia}</span>
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400">R$/kg ref: R$ {comparacaoHistorico.precoRefKg.toFixed(2)}</span>
                  <span className={`text-sm font-bold ${
                    comparacaoHistorico.status === 'ok' ? 'text-emerald-400' :
                    comparacaoHistorico.status === 'alto' ? 'text-amber-400' : 'text-blue-400'
                  }`}>
                    {comparacaoHistorico.diferencaPercentual > 0 ? '+' : ''}
                    {comparacaoHistorico.diferencaPercentual.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Coluna Central - Itens e Análise */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 space-y-4"
          >
            {/* KPIs do Orçamento */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SimuladorKPI
                icon={Weight}
                label="Peso Total"
                value={`${(calculos.pesoTotal / 1000).toFixed(1)} ton`}
                subvalue={`${calculos.pesoTotal.toLocaleString()} kg`}
                color="purple"
              />
              <SimuladorKPI
                icon={DollarSign}
                label="Valor Total"
                value={`R$ ${(calculos.totalFinal / 1000000).toFixed(2)}M`}
                subvalue={`R$ ${calculos.totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                color="emerald"
              />
              <SimuladorKPI
                icon={Target}
                label="Preço por kg"
                value={`R$ ${calculos.precoMedioKg.toFixed(2)}`}
                color="cyan"
                trend={comparacaoHistorico?.diferencaPercentual}
              />
              <SimuladorKPI
                icon={Clock}
                label="Prazo Estimado"
                value={`${calculos.prazo.total} dias`}
                subvalue={`~${Math.ceil(calculos.prazo.total / 30)} meses`}
                color="amber"
              />
            </div>

            {/* Tabs */}
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List className="flex gap-2 bg-slate-800/50 p-1 rounded-xl w-fit mb-4">
                <Tabs.Trigger
                  value="itens"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400
                           data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 transition-colors"
                >
                  <Package className="w-4 h-4 inline mr-2" />
                  Itens ({itensOrcamento.length})
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="analise"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400
                           data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 transition-colors"
                >
                  <BarChart3 className="w-4 h-4 inline mr-2" />
                  Análise
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="resumo"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400
                           data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 transition-colors"
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Resumo
                </Tabs.Trigger>
              </Tabs.List>

              {/* Tab: Itens */}
              <Tabs.Content value="itens">
                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                              rounded-xl border border-slate-700/50 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Itens do Orçamento</h3>
                    <button
                      onClick={() => setShowAddItem(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400
                               rounded-lg hover:bg-emerald-500/30 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Item
                    </button>
                  </div>

                  {/* Tabela de Itens */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-slate-400 border-b border-slate-700/50">
                          <th className="text-left py-3 px-2">Descrição</th>
                          <th className="text-right py-3 px-2">Qtd</th>
                          <th className="text-center py-3 px-2">Un</th>
                          <th className="text-right py-3 px-2">Unit.</th>
                          <th className="text-right py-3 px-2">Total</th>
                          <th className="text-center py-3 px-2">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensOrcamento.map((item, idx) => (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="border-b border-slate-700/30 hover:bg-slate-700/20"
                          >
                            <td className="py-3 px-2">
                              <input
                                type="text"
                                value={item.descricao}
                                onChange={(e) => atualizarItem(item.id, 'descricao', e.target.value)}
                                className="bg-transparent text-white text-sm w-full focus:outline-none"
                              />
                            </td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                value={item.quantidade}
                                onChange={(e) => atualizarItem(item.id, 'quantidade', parseFloat(e.target.value) || 0)}
                                className="bg-slate-800/50 text-white text-sm text-right w-24 px-2 py-1 rounded"
                              />
                            </td>
                            <td className="py-3 px-2 text-center text-slate-400 text-sm">{item.unidade}</td>
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                value={item.precoUnitario}
                                onChange={(e) => atualizarItem(item.id, 'precoUnitario', parseFloat(e.target.value) || 0)}
                                step="0.01"
                                className="bg-slate-800/50 text-white text-sm text-right w-24 px-2 py-1 rounded"
                              />
                            </td>
                            <td className="py-3 px-2 text-right text-emerald-400 font-medium">
                              R$ {item.precoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <button
                                onClick={() => removerItem(item.id)}
                                className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-600">
                          <td colSpan={4} className="py-3 px-2 text-right text-slate-300 font-medium">
                            Subtotal Itens:
                          </td>
                          <td className="py-3 px-2 text-right text-white font-bold">
                            R$ {calculos.subtotalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                        {incluirMontagem && (
                          <tr>
                            <td colSpan={4} className="py-2 px-2 text-right text-slate-400 text-sm">
                              + Montagem ({calculos.pesoTotal.toLocaleString()} kg):
                            </td>
                            <td className="py-2 px-2 text-right text-blue-400">
                              R$ {calculos.custoMontagem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td></td>
                          </tr>
                        )}
                        {incluirTransporte && (
                          <tr>
                            <td colSpan={4} className="py-2 px-2 text-right text-slate-400 text-sm">
                              + Transporte ({distanciaKm} km):
                            </td>
                            <td className="py-2 px-2 text-right text-amber-400">
                              R$ {calculos.custoTransporte.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td></td>
                          </tr>
                        )}
                        <tr>
                          <td colSpan={4} className="py-2 px-2 text-right text-slate-400 text-sm">
                            + BDI ({(calculos.bdiTotal * 100).toFixed(1)}%):
                          </td>
                          <td className="py-2 px-2 text-right text-purple-400">
                            R$ {calculos.valorBDI.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                        <tr>
                          <td colSpan={4} className="py-2 px-2 text-right text-slate-400 text-sm">
                            + Margem ({margemPersonalizada}%):
                          </td>
                          <td className="py-2 px-2 text-right text-emerald-400">
                            R$ {calculos.valorMargem.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                        {descontoPercentual > 0 && (
                          <tr>
                            <td colSpan={4} className="py-2 px-2 text-right text-slate-400 text-sm">
                              - Desconto ({descontoPercentual}%):
                            </td>
                            <td className="py-2 px-2 text-right text-red-400">
                              - R$ {calculos.valorDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td></td>
                          </tr>
                        )}
                        <tr className="bg-emerald-900/20">
                          <td colSpan={4} className="py-3 px-2 text-right text-white font-bold text-lg">
                            TOTAL FINAL:
                          </td>
                          <td className="py-3 px-2 text-right text-emerald-400 font-bold text-lg">
                            R$ {calculos.totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </Tabs.Content>

              {/* Tab: Análise */}
              <Tabs.Content value="analise">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Composição de Custos */}
                  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                                rounded-xl border border-slate-700/50 p-5">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <PieChartIcon className="w-5 h-5 text-purple-400" />
                      Composição de Custos
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={dadosComposicao}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {dadosComposicao.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px'
                          }}
                          formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {calculos.composicao.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                          <span className="text-xs text-slate-400">{item.nome}</span>
                          <span className="text-xs text-white font-bold ml-auto">{item.percentual.toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cronograma */}
                  <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                                rounded-xl border border-slate-700/50 p-5">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-amber-400" />
                      Cronograma Estimado
                    </h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={dadosPrazo} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis type="number" stroke="#64748b" fontSize={12} />
                        <YAxis type="category" dataKey="etapa" stroke="#64748b" fontSize={12} width={80} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px'
                          }}
                          formatter={(value) => [`${value} dias`, 'Duração']}
                        />
                        <Bar dataKey="dias" radius={[0, 4, 4, 0]}>
                          {dadosPrazo.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Prazo Total Estimado:</span>
                        <span className="text-lg font-bold text-amber-400">{calculos.prazo.total} dias úteis</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Indicadores */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-400 mb-1">Fator Regional</p>
                    <p className="text-xl font-bold text-white">{(calculos.fatorRegiao * 100).toFixed(0)}%</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-400 mb-1">Fator Complexidade</p>
                    <p className="text-xl font-bold text-white">{(calculos.fatorComplex * 100).toFixed(0)}%</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-400 mb-1">BDI Total</p>
                    <p className="text-xl font-bold text-purple-400">{(calculos.bdiTotal * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <p className="text-xs text-slate-400 mb-1">Margem Efetiva</p>
                    <p className="text-xl font-bold text-emerald-400">{margemPersonalizada}%</p>
                  </div>
                </div>
              </Tabs.Content>

              {/* Tab: Resumo */}
              <Tabs.Content value="resumo">
                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl
                              rounded-xl border border-slate-700/50 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-white">Resumo do Orçamento</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 text-slate-300
                                       rounded-lg hover:bg-slate-700 transition-colors text-sm">
                        <Printer className="w-4 h-4" />
                        Imprimir
                      </button>
                      <button
                        onClick={() => toast.success('PDF exportado com sucesso!')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 text-slate-300
                                       rounded-lg hover:bg-slate-700 transition-colors text-sm">
                        <Download className="w-4 h-4" />
                        Exportar PDF
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* Dados do Projeto */}
                    <div className="space-y-4">
                      <div className="border-b border-slate-700/50 pb-4">
                        <h4 className="text-sm font-medium text-slate-400 mb-3">Dados do Projeto</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Orçamento:</span>
                            <span className="text-white font-medium">{nomeOrcamento}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Cliente:</span>
                            <span className="text-white">{cliente || 'Não informado'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Tipo:</span>
                            <span className="text-white">{calculos.tipoConfig.nome}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Região:</span>
                            <span className="text-white">{regiao.charAt(0).toUpperCase() + regiao.slice(1)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-b border-slate-700/50 pb-4">
                        <h4 className="text-sm font-medium text-slate-400 mb-3">Quantitativos</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Peso Total:</span>
                            <span className="text-white font-medium">{(calculos.pesoTotal / 1000).toFixed(2)} ton</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Itens:</span>
                            <span className="text-white">{itensOrcamento.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Prazo:</span>
                            <span className="text-white">{calculos.prazo.total} dias úteis</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Valores */}
                    <div className="space-y-4">
                      <div className="border-b border-slate-700/50 pb-4">
                        <h4 className="text-sm font-medium text-slate-400 mb-3">Composição do Valor</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Subtotal Itens:</span>
                            <span className="text-white">R$ {calculos.subtotalItens.toLocaleString('pt-BR')}</span>
                          </div>
                          {incluirMontagem && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Montagem:</span>
                              <span className="text-blue-400">R$ {calculos.custoMontagem.toLocaleString('pt-BR')}</span>
                            </div>
                          )}
                          {incluirTransporte && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Transporte:</span>
                              <span className="text-amber-400">R$ {calculos.custoTransporte.toLocaleString('pt-BR')}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-400">BDI ({(calculos.bdiTotal * 100).toFixed(1)}%):</span>
                            <span className="text-purple-400">R$ {calculos.valorBDI.toLocaleString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Margem ({margemPersonalizada}%):</span>
                            <span className="text-emerald-400">R$ {calculos.valorMargem.toLocaleString('pt-BR')}</span>
                          </div>
                          {descontoPercentual > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Desconto ({descontoPercentual}%):</span>
                              <span className="text-red-400">- R$ {calculos.valorDesconto.toLocaleString('pt-BR')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-emerald-900/30 rounded-xl p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-emerald-300 font-medium">VALOR TOTAL:</span>
                          <span className="text-2xl font-bold text-emerald-400">
                            R$ {calculos.totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-emerald-700/30">
                          <span className="text-slate-400 text-sm">Preço por kg:</span>
                          <span className="text-white font-medium">R$ {calculos.precoMedioKg.toFixed(2)}/kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </motion.div>
        </div>

        {/* Modal Adicionar Item */}
        <Dialog.Root open={showAddItem} onOpenChange={setShowAddItem}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                                      w-full max-w-lg bg-slate-800 border border-slate-700
                                      rounded-2xl p-6 z-50 max-h-[90vh] overflow-y-auto">
              <Dialog.Title className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Adicionar Item ao Orçamento
              </Dialog.Title>

              <div className="space-y-4">
                {/* Categoria */}
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Categoria</label>
                  <Select.Root
                    value={novoItem.categoria}
                    onValueChange={(v) => setNovoItem({ ...novoItem, categoria: v, itemSelecionado: null })}
                  >
                    <Select.Trigger className="w-full flex items-center justify-between px-3 py-2
                                             bg-slate-700/50 border border-slate-600 rounded-lg text-white">
                      <Select.Value />
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-[60]">
                        <Select.Viewport>
                          {Object.entries(CATEGORIAS_SERVICO).map(([key, value]) => (
                            <Select.Item
                              key={key}
                              value={value}
                              className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer"
                            >
                              <Select.ItemText>
                                {value.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                {/* Item da categoria */}
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Item</label>
                  <Select.Root
                    value={novoItem.itemSelecionado?.id || ''}
                    onValueChange={(v) => {
                      const itens = getItensPorCategoria(novoItem.categoria);
                      const item = itens.find(i => i.id === v);
                      if (item) {
                        const preco = nivelPreco === 'baixo' ? item.precoBase :
                                     nivelPreco === 'alto' ? item.precoAlto : item.precoMedio;
                        setNovoItem({
                          ...novoItem,
                          itemSelecionado: item,
                          precoUnitario: preco
                        });
                      }
                    }}
                  >
                    <Select.Trigger className="w-full flex items-center justify-between px-3 py-2
                                             bg-slate-700/50 border border-slate-600 rounded-lg text-white">
                      <Select.Value placeholder="Selecione um item" />
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-[60] max-h-60">
                        <Select.Viewport>
                          {getItensPorCategoria(novoItem.categoria).map((item) => (
                            <Select.Item
                              key={item.id}
                              value={item.id}
                              className="px-4 py-2 text-white hover:bg-slate-700 cursor-pointer text-sm"
                            >
                              <Select.ItemText>{item.descricao}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>

                {novoItem.itemSelecionado && (
                  <div className="bg-slate-700/30 rounded-lg p-3 text-sm">
                    <div className="flex justify-between text-slate-400">
                      <span>Unidade:</span>
                      <span className="text-white">{novoItem.itemSelecionado.unidade}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 mt-1">
                      <span>Preço ({nivelPreco}):</span>
                      <span className="text-emerald-400 font-medium">
                        R$ {novoItem.precoUnitario.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quantidade */}
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Quantidade</label>
                  <NumericInput
                    value={novoItem.quantidade}
                    onChange={(v) => setNovoItem({ ...novoItem, quantidade: v })}
                    min={0}
                    suffix={novoItem.itemSelecionado?.unidade || ''}
                  />
                </div>

                {/* Preço Unitário */}
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Preço Unitário</label>
                  <NumericInput
                    value={novoItem.precoUnitario}
                    onChange={(v) => setNovoItem({ ...novoItem, precoUnitario: v })}
                    min={0}
                    step={0.01}
                    prefix="R$"
                  />
                </div>

                {/* Preview do total */}
                {novoItem.quantidade > 0 && novoItem.precoUnitario > 0 && (
                  <div className="bg-emerald-900/30 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-300">Total do Item:</span>
                      <span className="text-lg font-bold text-emerald-400">
                        R$ {(novoItem.quantidade * novoItem.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Botões */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={() => setShowAddItem(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-xl
                             hover:bg-slate-600 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={adicionarItem}
                    disabled={!novoItem.quantidade || !novoItem.precoUnitario}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600
                             text-white rounded-xl hover:from-emerald-600 hover:to-teal-700
                             transition-all font-medium disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}
