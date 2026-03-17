import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Search,
  TrendingUp,
  DollarSign,
  Weight,
  Calendar,
  MapPin,
  Settings,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Save,
  X,
  ChevronDown,
  Info,
  AlertCircle,
  CheckCircle2,
  Building2,
  Package,
  Edit3,
  Target,
  Zap,
  Shield,
  Percent,
  Clock,
  Layers,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  FileDown,
  File,
  Eye,
  GripVertical,
  Maximize2,
} from 'lucide-react';
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
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
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
  CUSTOS_PRODUCAO,
  HISTORICO_OBRAS,
  calcularPrecoPorFaixa,
  calcularBDI,
  aplicarFatorRegional,
  calcularPrazoEstimado,
} from '../data/precosDatabase';
import { useOrcamentos } from '../contexts/ERPContext';

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const PIPELINE_STAGES = [
  { id: 'lead', label: 'Lead', color: 'bg-slate-700', border: 'border-slate-600' },
  { id: 'orcamento', label: 'Orçamento', color: 'bg-blue-900', border: 'border-blue-700' },
  { id: 'proposta', label: 'Proposta', color: 'bg-purple-900', border: 'border-purple-700' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-amber-900', border: 'border-amber-700' },
  { id: 'fechamento', label: 'Fechamento', color: 'bg-green-900', border: 'border-green-700' },
  { id: 'obra', label: 'Obra', color: 'bg-emerald-900', border: 'border-emerald-700' },
];

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];

const formatCurrency = (value) => {
  if (!value) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatNumber = (value) => {
  if (!value) return '0,00';
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
};

// ============================================================================
// BUDGET STEPS COMPONENTS (reused from original)
// ============================================================================

const StepInfo = ({ project, setProject }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1">Nome do Projeto *</label>
          <input
            type="text"
            value={project.nome}
            onChange={(e) => setProject({ ...project, nome: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Galpão Industrial XYZ"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1">Cliente *</label>
          <input
            type="text"
            value={project.cliente}
            onChange={(e) => setProject({ ...project, cliente: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Empresa ABC Ltda"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1">Tipo de Estrutura</label>
          <select
            value={project.tipo}
            onChange={(e) => setProject({ ...project, tipo: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione...</option>
            {Object.entries(TIPOS_ESTRUTURA).map(([key, value]) => (
              <option key={key} value={key}>{value.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1">Região</label>
          <select
            value={project.regiao}
            onChange={(e) => setProject({ ...project, regiao: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="sudeste">Sudeste</option>
            <option value="sul">Sul</option>
            <option value="nordeste">Nordeste</option>
            <option value="centrooeste">Centro-Oeste</option>
            <option value="norte">Norte</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const StepCustos = ({ unitCosts, setUnitCosts, setores }) => {
  const updateCost = (section, field, value) => {
    setUnitCosts(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: parseFloat(value) || 0 }
    }));
  };

  const updateCoverageType = (tipo) => {
    let newCosts = { ...unitCosts.cobertura, tipo };
    const tipoMap = {
      'galvanizada_050': { material: 75.00, montagem: 18.00 },
      'galvanizada_043': { material: 65.00, montagem: 18.00 },
      'sanduiche_pir_30': { material: 135.00, montagem: 20.00 },
      'steeldeck_mf75': { material: 115.00, montagem: 25.00 }
    };
    if (tipoMap[tipo]) newCosts = { ...newCosts, ...tipoMap[tipo] };
    setUnitCosts(prev => ({ ...prev, cobertura: newCosts }));
  };

  const updateClosureType = (tipo) => {
    let newCosts = { ...unitCosts.fechamento, tipo };
    const tipoMap = {
      'pir_30mm': { material: 125.00, montagem: 15.00 },
      'thermcold_70': { material: 155.00, montagem: 18.00 },
      'galvanizado': { material: 80.00, montagem: 12.00 }
    };
    if (tipoMap[tipo]) newCosts = { ...newCosts, ...tipoMap[tipo] };
    setUnitCosts(prev => ({ ...prev, fechamento: newCosts }));
  };

  const calcPesoReal = (listaSetores) => {
    let pesoTotal = 0;
    (listaSetores || []).forEach(s => {
      const gruposPorBase = {};
      (s.itens || []).forEach(item => {
        if (item.unidade === 'KG') {
          const base = (item.descricao || '').split(' - ')[0].trim() || item.descricao || 'item';
          if (!gruposPorBase[base] || (item.quantidade || 0) > gruposPorBase[base]) {
            gruposPorBase[base] = item.quantidade || 0;
          }
        }
      });
      pesoTotal += Object.values(gruposPorBase).reduce((sum, qty) => sum + qty, 0);
    });
    return pesoTotal;
  };

  const calcTotalArea = (unit) => {
    return setores.reduce((sum, s) => {
      return sum + s.itens.reduce((itemSum, item) => {
        return itemSum + (item.quantidade || 0) * (item.unidade === unit ? 1 : 0);
      }, 0);
    }, 0);
  };

  const estruturaKg = calcPesoReal(setores);
  const coberturaM2 = calcTotalArea('M2');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Estrutura Metálica */}
        <div className="bg-slate-700/30 rounded-lg p-4 border-l-4 border-l-blue-500">
          <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Estrutura Metálica
          </h4>
          {estruturaKg > 0 && (
            <div className="bg-blue-500/20 p-2 rounded mb-3 text-blue-200 text-xs font-medium">
              Total: {formatNumber(estruturaKg)} kg
            </div>
          )}
          <div className="space-y-2 text-sm">
            <div>
              <label className="text-slate-400 text-xs">Material (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.estrutura.material}
                onChange={(e) => updateCost('estrutura', 'material', e.target.value)}
                className="w-full px-2 py-1 bg-slate-600/50 border border-slate-600 rounded text-white text-xs"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs">Fabricação (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.estrutura.fabricacao}
                onChange={(e) => updateCost('estrutura', 'fabricacao', e.target.value)}
                className="w-full px-2 py-1 bg-slate-600/50 border border-slate-600 rounded text-white text-xs"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs">Pintura (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.estrutura.pintura}
                onChange={(e) => updateCost('estrutura', 'pintura', e.target.value)}
                className="w-full px-2 py-1 bg-slate-600/50 border border-slate-600 rounded text-white text-xs"
              />
            </div>
          </div>
        </div>

        {/* Cobertura */}
        <div className="bg-slate-700/30 rounded-lg p-4 border-l-4 border-l-orange-500">
          <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Cobertura - Telha
          </h4>
          {coberturaM2 > 0 && (
            <div className="bg-orange-500/20 p-2 rounded mb-3 text-orange-200 text-xs font-medium">
              Total: {formatNumber(coberturaM2)} m²
            </div>
          )}
          <div className="space-y-2 text-sm">
            <div>
              <label className="text-slate-400 text-xs">Tipo</label>
              <select
                value={unitCosts.cobertura.tipo}
                onChange={(e) => updateCoverageType(e.target.value)}
                className="w-full px-2 py-1 bg-slate-600/50 border border-slate-600 rounded text-white text-xs"
              >
                <option value="galvanizada_050">Galvanizada 0.50mm</option>
                <option value="galvanizada_043">Galvanizada 0.43mm</option>
                <option value="sanduiche_pir_30">Sanduíche PIR 30mm</option>
                <option value="steeldeck_mf75">Steel Deck MF75</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs">Material (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.cobertura.material}
                onChange={(e) => updateCost('cobertura', 'material', e.target.value)}
                className="w-full px-2 py-1 bg-slate-600/50 border border-slate-600 rounded text-white text-xs"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs">Montagem (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.cobertura.montagem}
                onChange={(e) => updateCost('cobertura', 'montagem', e.target.value)}
                className="w-full px-2 py-1 bg-slate-600/50 border border-slate-600 rounded text-white text-xs"
              />
            </div>
          </div>
        </div>

        {/* Fechamento */}
        <div className="bg-slate-700/30 rounded-lg p-4 border-l-4 border-l-purple-500">
          <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Fechamento
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <label className="text-slate-400 text-xs">Tipo</label>
              <select
                value={unitCosts.fechamento.tipo}
                onChange={(e) => updateClosureType(e.target.value)}
                className="w-full px-2 py-1 bg-slate-600/50 border border-slate-600 rounded text-white text-xs"
              >
                <option value="pir_30mm">PIR 30mm</option>
                <option value="thermcold_70">ThermCold 70mm</option>
                <option value="galvanizado">Galvanizado</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs">Material (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.fechamento.material}
                onChange={(e) => updateCost('fechamento', 'material', e.target.value)}
                className="w-full px-2 py-1 bg-slate-600/50 border border-slate-600 rounded text-white text-xs"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs">Montagem (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.fechamento.montagem}
                onChange={(e) => updateCost('fechamento', 'montagem', e.target.value)}
                className="w-full px-2 py-1 bg-slate-600/50 border border-slate-600 rounded text-white text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StepSetores = ({ setores, setSetores }) => {
  const addSetor = () => {
    setSetores([...setores, { nome: `Setor ${setores.length + 1}`, itens: [] }]);
  };

  const removeSetor = (index) => {
    setSetores(setores.filter((_, i) => i !== index));
  };

  const addItem = (setorIndex) => {
    const newSetores = [...setores];
    newSetores[setorIndex].itens.push({
      descricao: '',
      quantidade: 0,
      unidade: 'KG',
      precoUnitario: 0,
    });
    setSetores(newSetores);
  };

  const updateItem = (setorIndex, itemIndex, field, value) => {
    const newSetores = [...setores];
    newSetores[setorIndex].itens[itemIndex][field] = field === 'quantidade' || field === 'precoUnitario' ? parseFloat(value) || 0 : value;
    setSetores(newSetores);
  };

  const removeItem = (setorIndex, itemIndex) => {
    const newSetores = [...setores];
    newSetores[setorIndex].itens.splice(itemIndex, 1);
    setSetores(newSetores);
  };

  return (
    <div className="space-y-4">
      {setores.map((setor, setorIndex) => (
        <div key={setorIndex} className="bg-slate-700/30 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <input
              type="text"
              value={setor.nome}
              onChange={(e) => {
                const newSetores = [...setores];
                newSetores[setorIndex].nome = e.target.value;
                setSetores(newSetores);
              }}
              className="bg-slate-600/50 border border-slate-600 rounded px-3 py-1 text-white font-semibold flex-1"
            />
            <button
              onClick={() => removeSetor(setorIndex)}
              className="ml-2 p-1 text-red-400 hover:bg-red-500/20 rounded"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {setor.itens.map((item, itemIndex) => (
              <div key={itemIndex} className="flex gap-2 text-sm">
                <input
                  type="text"
                  value={item.descricao}
                  onChange={(e) => updateItem(setorIndex, itemIndex, 'descricao', e.target.value)}
                  placeholder="Descrição"
                  className="flex-1 bg-slate-600/50 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                />
                <input
                  type="number"
                  value={item.quantidade}
                  onChange={(e) => updateItem(setorIndex, itemIndex, 'quantidade', e.target.value)}
                  placeholder="Qtd"
                  className="w-16 bg-slate-600/50 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                />
                <select
                  value={item.unidade}
                  onChange={(e) => updateItem(setorIndex, itemIndex, 'unidade', e.target.value)}
                  className="w-20 bg-slate-600/50 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                >
                  <option value="KG">KG</option>
                  <option value="M2">M²</option>
                  <option value="UN">UN</option>
                </select>
                <button
                  onClick={() => removeItem(setorIndex, itemIndex)}
                  className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => addItem(setorIndex)}
            className="mt-2 w-full py-1 text-sm text-blue-400 hover:bg-blue-500/10 rounded border border-blue-500/30"
          >
            + Adicionar Item
          </button>
        </div>
      ))}

      <button
        onClick={addSetor}
        className="w-full py-2 text-sm font-semibold text-white bg-blue-600/30 hover:bg-blue-600/50 rounded border border-blue-500 rounded"
      >
        + Novo Setor
      </button>
    </div>
  );
};

const StepBDI = ({ bdi, setBdi, unitCosts, setores }) => {
  const pesoTotal = useMemo(() => {
    let total = 0;
    setores.forEach(s => {
      const gruposPorBase = {};
      (s.itens || []).forEach(item => {
        if (item.unidade === 'KG') {
          const base = (item.descricao || '').split(' - ')[0].trim() || item.descricao || 'item';
          if (!gruposPorBase[base] || item.quantidade > gruposPorBase[base]) {
            gruposPorBase[base] = item.quantidade;
          }
        }
      });
      total += Object.values(gruposPorBase).reduce((sum, qty) => sum + qty, 0);
    });
    return total;
  }, [setores]);

  const custoMaterial = pesoTotal * unitCosts.estrutura.material;
  const custoFabricacao = pesoTotal * unitCosts.estrutura.fabricacao;
  const custoTransporte = pesoTotal * unitCosts.estrutura.transporte;

  const custoBase = custoMaterial + custoFabricacao + custoTransporte;
  const totalComBDI = custoBase * (1 + bdi.taxa / 100);

  return (
    <div className="space-y-4">
      <div className="bg-slate-700/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-slate-200 mb-3">Análise de Custos</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-600/20 p-3 rounded">
            <div className="text-slate-400 text-xs">Custo Material</div>
            <div className="text-lg font-bold text-blue-400">{formatCurrency(custoMaterial)}</div>
          </div>
          <div className="bg-slate-600/20 p-3 rounded">
            <div className="text-slate-400 text-xs">Custo Fabricação</div>
            <div className="text-lg font-bold text-blue-400">{formatCurrency(custoFabricacao)}</div>
          </div>
          <div className="bg-slate-600/20 p-3 rounded">
            <div className="text-slate-400 text-xs">Custo Transporte</div>
            <div className="text-lg font-bold text-blue-400">{formatCurrency(custoTransporte)}</div>
          </div>
          <div className="bg-slate-600/20 p-3 rounded">
            <div className="text-slate-400 text-xs">Custo Base Total</div>
            <div className="text-lg font-bold text-slate-200">{formatCurrency(custoBase)}</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-700/30 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Percent className="h-4 w-4" />
          BDI (Benefício, Despesas Indiretas)
        </h4>
        <div className="space-y-3">
          <div>
            <label className="text-slate-400 text-sm">Taxa BDI (%)</label>
            <input
              type="number"
              step="0.1"
              value={bdi.taxa}
              onChange={(e) => setBdi({ ...bdi, taxa: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-600/50 border border-slate-600 rounded text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-500/20 p-3 rounded">
              <div className="text-slate-400 text-xs">Total com BDI</div>
              <div className="text-lg font-bold text-green-400">{formatCurrency(totalComBDI)}</div>
            </div>
            <div className="bg-green-500/20 p-3 rounded">
              <div className="text-slate-400 text-xs">Margem BDI</div>
              <div className="text-lg font-bold text-green-400">{formatCurrency(totalComBDI - custoBase)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StepAnalise = ({ unitCosts, setores, bdi }) => {
  const pesoTotal = useMemo(() => {
    let total = 0;
    setores.forEach(s => {
      const gruposPorBase = {};
      (s.itens || []).forEach(item => {
        if (item.unidade === 'KG') {
          const base = (item.descricao || '').split(' - ')[0].trim() || item.descricao || 'item';
          if (!gruposPorBase[base] || item.quantidade > gruposPorBase[base]) {
            gruposPorBase[base] = item.quantidade;
          }
        }
      });
      total += Object.values(gruposPorBase).reduce((sum, qty) => sum + qty, 0);
    });
    return total;
  }, [setores]);

  const custoTotal = pesoTotal * (unitCosts.estrutura.material + unitCosts.estrutura.fabricacao + unitCosts.estrutura.transporte);
  const precoFinal = custoTotal * (1 + bdi.taxa / 100);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-700/30 rounded-lg p-4 text-center">
          <div className="text-slate-400 text-xs mb-1">Peso Total</div>
          <div className="text-2xl font-bold text-blue-400">{formatNumber(pesoTotal)}</div>
          <div className="text-slate-500 text-xs mt-1">KG</div>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-4 text-center">
          <div className="text-slate-400 text-xs mb-1">Custo Total</div>
          <div className="text-lg font-bold text-slate-200">{formatCurrency(custoTotal)}</div>
        </div>
        <div className="bg-slate-700/30 rounded-lg p-4 text-center">
          <div className="text-slate-400 text-xs mb-1">BDI ({bdi.taxa}%)</div>
          <div className="text-lg font-bold text-green-400">{formatCurrency(precoFinal - custoTotal)}</div>
        </div>
        <div className="bg-green-600/20 rounded-lg p-4 text-center">
          <div className="text-slate-300 text-xs mb-1 font-semibold">PREÇO FINAL</div>
          <div className="text-2xl font-bold text-green-400">{formatCurrency(precoFinal)}</div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DEAL CARD COMPONENT
// ============================================================================

const DealCard = ({ deal, onClick }) => {
  const stageInfo = PIPELINE_STAGES.find(s => s.id === deal.status) || PIPELINE_STAGES[0];
  const value = deal.preco_final || deal.valor || 0;
  const probability = deal.probability || (deal.status === 'lead' ? 30 : 60);

  return (
    <motion.div
      layout
      layoutId={deal.id}
      onClick={onClick}
      className={`${stageInfo.color} border ${stageInfo.border} rounded-lg p-4 cursor-move hover:shadow-lg transition-shadow`}
      whileHover={{ y: -2 }}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-white text-sm line-clamp-2">{deal.nome || deal.nome_projeto}</h3>
        <span className="text-xs bg-white/20 text-white px-2 py-1 rounded">{probability}%</span>
      </div>
      <div className="text-slate-300 text-xs mb-2">{deal.cliente}</div>
      <div className="text-lg font-bold text-white mb-2">{formatCurrency(value)}</div>
      <div className="flex justify-between items-center text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(deal.data_criacao || new Date()).toLocaleDateString('pt-BR')}
        </span>
        <span className="text-blue-300">→</span>
      </div>
    </motion.div>
  );
};

// ============================================================================
// KPI DASHBOARD
// ============================================================================

const KPIDashboard = ({ deals }) => {
  const totalPipeline = useMemo(() => {
    return deals.reduce((sum, d) => sum + (d.preco_final || d.valor || 0), 0);
  }, [deals]);

  const closedDeals = useMemo(() => {
    return deals.filter(d => d.status === 'obra').length;
  }, [deals]);

  const totalClosed = useMemo(() => {
    return deals
      .filter(d => d.status === 'obra')
      .reduce((sum, d) => sum + (d.preco_final || d.valor || 0), 0);
  }, [deals]);

  const conversionRate = deals.length > 0 ? Math.round((closedDeals / deals.length) * 100) : 0;
  const averageTicket = deals.length > 0 ? totalPipeline / deals.length : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-sm">Pipeline Total</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(totalPipeline)}</div>
          </div>
          <DollarSign className="h-8 w-8 text-blue-500/30" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-sm">Taxa Conversão</div>
            <div className="text-2xl font-bold text-green-400 mt-1">{conversionRate}%</div>
          </div>
          <TrendingUp className="h-8 w-8 text-green-500/30" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-sm">Ticket Médio</div>
            <div className="text-2xl font-bold text-purple-400 mt-1">{formatCurrency(averageTicket)}</div>
          </div>
          <Target className="h-8 w-8 text-purple-500/30" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-sm">Deals Ativos</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{deals.length}</div>
          </div>
          <Building2 className="h-8 w-8 text-amber-500/30" />
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// DEAL DETAIL VIEW
// ============================================================================

const DealDetailView = ({ deal, onClose, onSave, onMoveStage }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [project, setProject] = useState(deal.projeto_dados || {
    nome: deal.nome_projeto || '',
    cliente: deal.cliente || '',
    tipo: '',
    regiao: 'sudeste',
  });

  const [unitCosts, setUnitCosts] = useState(deal.custos_unitarios || {
    estrutura: { material: 19.50, fabricacao: 5.50, pintura: 1.40, transporte: 1.00, montagem: 3.50 },
    cobertura: { tipo: 'galvanizada_050', material: 75.00, montagem: 18.00 },
    fechamento: { tipo: 'pir_30mm', material: 125.00, montagem: 15.00 },
    steelDeck: { material: 115.00, montagem: 25.00 },
    complementos: { calha: 120.00, rufos: 55.00, platibanda: 80.00 },
  });

  const [setores, setSetores] = useState(deal.setores || []);
  const [bdi, setBdi] = useState(deal.bdi || { taxa: 30 });
  const [probability, setProbability] = useState(deal.probability || 50);
  const [expectedCloseDate, setExpectedCloseDate] = useState(deal.expected_close_date || '');
  const [notes, setNotes] = useState(deal.notes || '');

  const currentStage = PIPELINE_STAGES.find(s => s.id === deal.status);
  const nextStage = PIPELINE_STAGES[PIPELINE_STAGES.findIndex(s => s.id === deal.status) + 1];

  const handleSave = () => {
    const updatedDeal = {
      ...deal,
      projeto_dados: project,
      custos_unitarios: unitCosts,
      setores,
      bdi,
      probability,
      expected_close_date: expectedCloseDate,
      notes,
    };
    onSave(updatedDeal);
  };

  const tabs = [
    { id: 'info', label: 'Info' },
    { id: 'custos', label: 'Custos' },
    { id: 'setores', label: 'Setores' },
    { id: 'bdi', label: 'BDI' },
    { id: 'analise', label: 'Análise' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-auto"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-4xl w-full my-8">
        <div className="border-b border-slate-700 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white">{deal.nome_projeto}</h2>
            <p className="text-slate-400 mt-1">{deal.cliente}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700 px-6 flex gap-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'info' && <StepInfo project={project} setProject={setProject} />}
          {activeTab === 'custos' && <StepCustos unitCosts={unitCosts} setUnitCosts={setUnitCosts} setores={setores} />}
          {activeTab === 'setores' && <StepSetores setores={setores} setSetores={setSetores} />}
          {activeTab === 'bdi' && <StepBDI bdi={bdi} setBdi={setBdi} unitCosts={unitCosts} setores={setores} />}
          {activeTab === 'analise' && <StepAnalise unitCosts={unitCosts} setores={setores} bdi={bdi} />}
        </div>

        {/* Metadata */}
        <div className="border-t border-slate-700 p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Probabilidade (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => setProbability(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Data Prevista de Fechamento</label>
              <input
                type="date"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white h-20 resize-none"
              placeholder="Adicionar notas sobre o deal..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-700 p-6 flex gap-3 justify-between">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            >
              <Save className="h-4 w-4" />
              Salvar
            </button>
            {nextStage && (
              <button
                onClick={() => onMoveStage(deal.id, nextStage.id)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
              >
                <ArrowUpRight className="h-4 w-4" />
                Próximo: {nextStage.label}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// NEW DEAL FORM
// ============================================================================

const NewDealForm = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    nome_projeto: '',
    cliente: '',
    valor: 0,
  });

  const handleCreate = () => {
    if (!formData.nome_projeto || !formData.cliente) {
      toast.error('Preencha nome do projeto e cliente');
      return;
    }
    onCreate({
      ...formData,
      status: 'lead',
      probability: 30,
      data_criacao: new Date().toISOString(),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-lg w-full">
        <div className="border-b border-slate-700 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Novo Lead</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">Nome do Projeto *</label>
            <input
              type="text"
              value={formData.nome_projeto}
              onChange={(e) => setFormData({ ...formData, nome_projeto: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-500"
              placeholder="Ex: Galpão Industrial XYZ"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">Cliente *</label>
            <input
              type="text"
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-500"
              placeholder="Ex: Empresa ABC Ltda"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">Valor Estimado (R$)</label>
            <input
              type="number"
              value={formData.valor}
              onChange={(e) => setFormData({ ...formData, valor: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded text-white"
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="border-t border-slate-700 p-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            <Plus className="h-4 w-4" />
            Criar Lead
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SimuladorOrcamento() {
  const { orcamentos: orcamentosContext, addOrcamento, deleteOrcamento } = useOrcamentos();
  const [deals, setDeals] = useState([]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showNewDealForm, setShowNewDealForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState(null);

  // Sync with context
  useEffect(() => {
    if (Array.isArray(orcamentosContext)) {
      setDeals(orcamentosContext);
    }
  }, [orcamentosContext]);

  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      const matchesSearch = (deal.nome_projeto + deal.cliente).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStage = !filterStage || deal.status === filterStage;
      return matchesSearch && matchesStage;
    });
  }, [deals, searchTerm, filterStage]);

  const dealsByStage = useMemo(() => {
    const grouped = {};
    PIPELINE_STAGES.forEach(stage => {
      grouped[stage.id] = filteredDeals.filter(d => d.status === stage.id);
    });
    return grouped;
  }, [filteredDeals]);

  const handleSaveDeal = useCallback((updatedDeal) => {
    setDeals(deals.map(d => d.id === updatedDeal.id ? updatedDeal : d));
    toast.success('Deal salvo com sucesso');
    setSelectedDeal(null);
  }, [deals]);

  const handleMoveDeal = useCallback((dealId, newStage) => {
    setDeals(deals.map(d => d.id === dealId ? { ...d, status: newStage } : d));
    toast.success(`Deal movido para ${PIPELINE_STAGES.find(s => s.id === newStage)?.label}`);
    setSelectedDeal(null);
  }, [deals]);

  const handleCreateDeal = useCallback((newDealData) => {
    const newDeal = {
      id: Date.now().toString(),
      ...newDealData,
      data_criacao: new Date().toISOString(),
      projeto_dados: { nome: '', cliente: '', tipo: '', regiao: 'sudeste' },
      custos_unitarios: {
        estrutura: { material: 19.50, fabricacao: 5.50, pintura: 1.40, transporte: 1.00, montagem: 3.50 },
        cobertura: { tipo: 'galvanizada_050', material: 75.00, montagem: 18.00 },
        fechamento: { tipo: 'pir_30mm', material: 125.00, montagem: 15.00 },
        steelDeck: { material: 115.00, montagem: 25.00 },
        complementos: { calha: 120.00, rufos: 55.00, platibanda: 80.00 },
      },
      setores: [],
      bdi: { taxa: 30 },
      probability: 30,
    };
    setDeals([...deals, newDeal]);
    addOrcamento(newDeal);
    toast.success('Novo lead criado');
    setShowNewDealForm(false);
  }, [deals, addOrcamento]);

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="h-10 w-10 text-blue-500" />
                Pipeline Comercial
              </h1>
              <p className="text-slate-400 mt-1">Gerencie seu funil de vendas</p>
            </div>
            <button
              onClick={() => setShowNewDealForm(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              <Plus className="h-5 w-5" />
              Novo Lead
            </button>
          </div>

          {/* KPIs */}
          <KPIDashboard deals={deals} />

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por projeto ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setFilterStage(null)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filterStage === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                Todos
              </button>
              {PIPELINE_STAGES.map(stage => (
                <button
                  key={stage.id}
                  onClick={() => setFilterStage(stage.id)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    filterStage === stage.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  {stage.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {PIPELINE_STAGES.map(stage => (
            <div key={stage.id} className="flex flex-col">
              {/* Column Header */}
              <div className={`${stage.color} rounded-t-lg p-4 border ${stage.border}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white text-sm">{stage.label}</h3>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded text-white font-bold">
                    {dealsByStage[stage.id]?.length || 0}
                  </span>
                </div>
                <div className="text-xs text-white/70 mt-1">
                  {formatCurrency(dealsByStage[stage.id]?.reduce((sum, d) => sum + (d.preco_final || d.valor || 0), 0) || 0)}
                </div>
              </div>

              {/* Cards Container */}
              <div className="flex-1 bg-slate-800/20 border border-t-0 border-slate-700 rounded-b-lg p-4 space-y-3 overflow-y-auto min-h-96">
                <AnimatePresence>
                  {dealsByStage[stage.id]?.map(deal => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      onClick={() => setSelectedDeal(deal)}
                    />
                  ))}
                </AnimatePresence>
                {dealsByStage[stage.id]?.length === 0 && (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    Nenhum deal
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showNewDealForm && (
          <NewDealForm
            onClose={() => setShowNewDealForm(false)}
            onCreate={handleCreateDeal}
          />
        )}
        {selectedDeal && (
          <DealDetailView
            deal={selectedDeal}
            onClose={() => setSelectedDeal(null)}
            onSave={handleSaveDeal}
            onMoveStage={handleMoveDeal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
