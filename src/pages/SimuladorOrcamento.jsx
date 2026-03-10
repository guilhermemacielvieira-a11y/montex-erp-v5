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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
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

// Color palette for charts
const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (value) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatNumber = (value) => {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Step 1: Informações do Projeto
const StepInfo = ({ project, setProject }) => {
  return (
    <div className="max-w-full px-4 lg:px-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Dados do Projeto
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Projeto *</label>
              <input
                type="text"
                value={project.nome}
                onChange={(e) => setProject({ ...project, nome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Galpão Industrial XYZ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
              <input
                type="text"
                value={project.cliente}
                onChange={(e) => setProject({ ...project, cliente: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Empresa ABC Ltda"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Estrutura</label>
              <select
                value={project.tipo}
                onChange={(e) => setProject({ ...project, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                {Object.entries(TIPOS_ESTRUTURA).map(([key, value]) => (
                  <option key={key} value={key}>{value.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Região</label>
              <select
                value={project.regiao}
                onChange={(e) => setProject({ ...project, regiao: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-200">
          <h3 className="text-lg font-semibold mb-4 text-blue-900 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Dicas
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Complete os dados do projeto para prosseguir</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>O tipo e região afetam os preços sugeridos</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Todos os dados podem ser editados em qualquer momento</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Step 2: Custos Unitários
const StepCustos = ({ unitCosts, setUnitCosts, setores }) => {
  const updateCost = (section, field, value) => {
    setUnitCosts(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: parseFloat(value) || 0 }
    }));
  };

  const updateCoverageType = (tipo) => {
    let newCosts = { ...unitCosts.cobertura, tipo };

    // Auto-update prices based on selected type
    const tipoMap = {
      'galvanizada_050': { material: 75.00, montagem: 18.00 },
      'galvanizada_043': { material: 65.00, montagem: 18.00 },
      'sanduiche_pir_30': { material: 135.00, montagem: 20.00 },
      'steeldeck_mf75': { material: 115.00, montagem: 25.00 }
    };

    if (tipoMap[tipo]) {
      newCosts = { ...newCosts, ...tipoMap[tipo] };
    }

    setUnitCosts(prev => ({ ...prev, cobertura: newCosts }));
  };

  const updateClosureType = (tipo) => {
    let newCosts = { ...unitCosts.fechamento, tipo };

    const tipoMap = {
      'pir_30mm': { material: 125.00, montagem: 15.00 },
      'thermcold_70': { material: 155.00, montagem: 18.00 },
      'galvanizado': { material: 80.00, montagem: 12.00 }
    };

    if (tipoMap[tipo]) {
      newCosts = { ...newCosts, ...tipoMap[tipo] };
    }

    setUnitCosts(prev => ({ ...prev, fechamento: newCosts }));
  };

  // Calcula peso real da estrutura: dentro de cada setor, itens KG com mesmo nome base
  // (ex: "Estrutura Metálica - Material", "Estrutura Metálica - Fabricação") representam
  // custos diferentes sobre o MESMO peso. Conta-se apenas 1 vez por grupo base por setor.
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

  const calcTotalStructure = () => calcPesoReal(setores);

  const calcTotalArea = (unit) => {
    return setores.reduce((sum, s) => {
      return sum + s.itens.reduce((itemSum, item) => {
        return itemSum + (item.quantidade || 0) * (item.unidade === unit ? 1 : 0);
      }, 0);
    }, 0);
  };

  const estruturaKg = calcTotalStructure();
  const coberturaM2 = calcTotalArea('M2');
  const fechamentoM2 = calcTotalArea('M2');

  return (
    <div className="max-w-full px-4 lg:px-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estrutura Metálica */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-blue-600">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            Estrutura Metálica
          </h3>
          <div className="space-y-3 text-sm">
            {estruturaKg > 0 && (
              <div className="bg-blue-50 p-2 rounded text-blue-800 font-medium">
                Total: {formatNumber(estruturaKg)} kg
              </div>
            )}
            <div>
              <label className="block font-medium text-gray-700 mb-1">Material (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.estrutura.material}
                onChange={(e) => updateCost('estrutura', 'material', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Fabricação (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.estrutura.fabricacao}
                onChange={(e) => updateCost('estrutura', 'fabricacao', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Pintura (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.estrutura.pintura}
                onChange={(e) => updateCost('estrutura', 'pintura', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Transporte (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.estrutura.transporte}
                onChange={(e) => updateCost('estrutura', 'transporte', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Montagem (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.estrutura.montagem}
                onChange={(e) => updateCost('estrutura', 'montagem', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Cobertura - Telha */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-orange-600">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            Cobertura - Telha
          </h3>
          <div className="space-y-3 text-sm">
            {coberturaM2 > 0 && (
              <div className="bg-orange-50 p-2 rounded text-orange-800 font-medium">
                Total: {formatNumber(coberturaM2)} m²
              </div>
            )}
            <div>
              <label className="block font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={unitCosts.cobertura.tipo}
                onChange={(e) => updateCoverageType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="galvanizada_050">Galvanizada 0.50mm</option>
                <option value="galvanizada_043">Galvanizada 0.43mm</option>
                <option value="sanduiche_pir_30">Sanduíche PIR 30mm</option>
                <option value="steeldeck_mf75">Steel Deck MF75</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Material (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.cobertura.material}
                onChange={(e) => updateCost('cobertura', 'material', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Montagem (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.cobertura.montagem}
                onChange={(e) => updateCost('cobertura', 'montagem', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Fechamento */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-red-600">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Fechamento
          </h3>
          <div className="space-y-3 text-sm">
            {fechamentoM2 > 0 && (
              <div className="bg-red-50 p-2 rounded text-red-800 font-medium">
                Total: {formatNumber(fechamentoM2)} m²
              </div>
            )}
            <div>
              <label className="block font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={unitCosts.fechamento.tipo}
                onChange={(e) => updateClosureType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="pir_30mm">PIR 30mm</option>
                <option value="thermcold_70">Thermcold 70mm</option>
                <option value="galvanizado">Galvanizado</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Material (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.fechamento.material}
                onChange={(e) => updateCost('fechamento', 'material', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Montagem (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.fechamento.montagem}
                onChange={(e) => updateCost('fechamento', 'montagem', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        {/* Steel Deck */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-purple-600">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-600" />
            Steel Deck
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Material (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.steelDeck.material}
                onChange={(e) => updateCost('steelDeck', 'material', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Montagem (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.steelDeck.montagem}
                onChange={(e) => updateCost('steelDeck', 'montagem', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Complementos */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-green-600 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Complementos
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Calha (R$/ml)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.complementos.calha}
                onChange={(e) => updateCost('complementos', 'calha', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Rufos (R$/ml)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.complementos.rufos}
                onChange={(e) => updateCost('complementos', 'rufos', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">Platibanda (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.complementos.platibanda}
                onChange={(e) => updateCost('complementos', 'platibanda', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pre-defined items derived from Step 2 unit costs
const getPreDefinedItems = (unitCosts) => [
  // Estrutura Metálica
  { categoria: 'Estrutura Metálica', descricao: 'Estrutura Metálica - Material', unidade: 'KG', precoMaterial: unitCosts.estrutura.material, precoInstalacao: 0, color: 'blue' },
  { categoria: 'Estrutura Metálica', descricao: 'Estrutura Metálica - Fabricação', unidade: 'KG', precoMaterial: unitCosts.estrutura.fabricacao, precoInstalacao: 0, color: 'blue' },
  { categoria: 'Estrutura Metálica', descricao: 'Estrutura Metálica - Pintura', unidade: 'KG', precoMaterial: unitCosts.estrutura.pintura, precoInstalacao: 0, color: 'blue' },
  { categoria: 'Estrutura Metálica', descricao: 'Estrutura Metálica - Transporte', unidade: 'KG', precoMaterial: unitCosts.estrutura.transporte, precoInstalacao: 0, color: 'blue' },
  { categoria: 'Estrutura Metálica', descricao: 'Estrutura Metálica - Montagem', unidade: 'KG', precoMaterial: 0, precoInstalacao: unitCosts.estrutura.montagem, color: 'blue' },
  // Cobertura
  { categoria: 'Cobertura', descricao: 'Cobertura - Material', unidade: 'M2', precoMaterial: unitCosts.cobertura.material, precoInstalacao: 0, color: 'orange' },
  { categoria: 'Cobertura', descricao: 'Cobertura - Montagem', unidade: 'M2', precoMaterial: 0, precoInstalacao: unitCosts.cobertura.montagem, color: 'orange' },
  // Fechamento
  { categoria: 'Fechamento', descricao: 'Fechamento - Material', unidade: 'M2', precoMaterial: unitCosts.fechamento.material, precoInstalacao: 0, color: 'red' },
  { categoria: 'Fechamento', descricao: 'Fechamento - Montagem', unidade: 'M2', precoMaterial: 0, precoInstalacao: unitCosts.fechamento.montagem, color: 'red' },
  // Steel Deck
  { categoria: 'Steel Deck', descricao: 'Steel Deck - Material', unidade: 'M2', precoMaterial: unitCosts.steelDeck.material, precoInstalacao: 0, color: 'purple' },
  { categoria: 'Steel Deck', descricao: 'Steel Deck - Montagem', unidade: 'M2', precoMaterial: 0, precoInstalacao: unitCosts.steelDeck.montagem, color: 'purple' },
  // Complementos
  { categoria: 'Complementos', descricao: 'Calha', unidade: 'ML', precoMaterial: unitCosts.complementos.calha, precoInstalacao: 0, color: 'green' },
  { categoria: 'Complementos', descricao: 'Rufos', unidade: 'ML', precoMaterial: unitCosts.complementos.rufos, precoInstalacao: 0, color: 'green' },
  { categoria: 'Complementos', descricao: 'Platibanda', unidade: 'M2', precoMaterial: unitCosts.complementos.platibanda, precoInstalacao: 0, color: 'green' },
];

const CATEGORY_COLORS = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
};

// SetorCard component for Step 3
const SetorCard = ({ setor, index, onUpdate, onDelete, onAddItem, unitCosts }) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(setor.nome);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [newItem, setNewItem] = useState({ descricao: '', quantidade: 0, unidade: 'KG', preco: 0 });
  const [editingItemIdx, setEditingItemIdx] = useState(null);

  const preDefinedItems = getPreDefinedItems(unitCosts);

  const handleTitleSave = () => {
    onUpdate(index, { ...setor, nome: newTitle });
    setEditingTitle(false);
  };

  const handleAddPreDefined = (predefined) => {
    const totalPreco = predefined.precoMaterial + predefined.precoInstalacao;
    const item = {
      descricao: predefined.descricao,
      unidade: predefined.unidade,
      quantidade: 0,
      preco: totalPreco,
      precoMaterial: predefined.precoMaterial,
      precoInstalacao: predefined.precoInstalacao,
      categoria: predefined.categoria,
    };
    onAddItem(index, item);
    setShowItemSelector(false);
  };

  const handleAddCustom = () => {
    if (newItem.descricao && newItem.quantidade >= 0) {
      onAddItem(index, { ...newItem, quantidade: parseFloat(newItem.quantidade), preco: parseFloat(newItem.preco), precoMaterial: parseFloat(newItem.preco), precoInstalacao: 0 });
      setNewItem({ descricao: '', quantidade: 0, unidade: 'KG', preco: 0 });
      setShowCustomForm(false);
    }
  };

  const handleRemoveItem = (itemIndex) => {
    const updatedItens = setor.itens.filter((_, i) => i !== itemIndex);
    onUpdate(index, { ...setor, itens: updatedItens });
  };

  const handleEditItem = (itemIndex, field, value) => {
    const updatedItens = [...setor.itens];
    const numVal = parseFloat(value) || 0;
    if (field === 'quantidade') {
      updatedItens[itemIndex] = { ...updatedItens[itemIndex], quantidade: numVal };
    } else if (field === 'precoMaterial') {
      updatedItens[itemIndex] = { ...updatedItens[itemIndex], precoMaterial: numVal, preco: numVal + (updatedItens[itemIndex].precoInstalacao || 0) };
    } else if (field === 'precoInstalacao') {
      updatedItens[itemIndex] = { ...updatedItens[itemIndex], precoInstalacao: numVal, preco: (updatedItens[itemIndex].precoMaterial || 0) + numVal };
    } else if (field === 'preco') {
      updatedItens[itemIndex] = { ...updatedItens[itemIndex], preco: numVal };
    }
    onUpdate(index, { ...setor, itens: updatedItens });
  };

  const total = setor.itens.reduce((sum, item) => sum + (item.quantidade * item.preco), 0);
  const totalMaterial = setor.itens.reduce((sum, item) => sum + (item.quantidade * (item.precoMaterial || item.preco || 0)), 0);
  const totalInstalacao = setor.itens.reduce((sum, item) => sum + (item.quantidade * (item.precoInstalacao || 0)), 0);

  // Group pre-defined items by category
  const categorizedItems = preDefinedItems.reduce((acc, item) => {
    if (!acc[item.categoria]) acc[item.categoria] = { items: [], color: item.color };
    acc[item.categoria].items.push(item);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-blue-600"
    >
      <div className="flex justify-between items-start mb-4">
        {editingTitle ? (
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleTitleSave}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Salvar
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">{setor.nome}</h3>
            <button
              onClick={() => setEditingTitle(true)}
              className="p-1 text-gray-500 hover:text-blue-600"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        )}
        <button
          onClick={() => onDelete(index)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {setor.itens.length > 0 ? (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left p-2 font-semibold">Descrição</th>
                <th className="text-center p-2 font-semibold">Qtd</th>
                <th className="text-center p-2 font-semibold">Un</th>
                <th className="text-right p-2 font-semibold">Material</th>
                <th className="text-right p-2 font-semibold">Instalação</th>
                <th className="text-right p-2 font-semibold">Total</th>
                <th className="text-center p-2 font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {setor.itens.map((item, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <span className="font-medium">{item.descricao}</span>
                    {item.categoria && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{item.categoria}</span>
                    )}
                  </td>
                  <td className="text-center p-1">
                    {editingItemIdx === idx ? (
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantidade}
                        onChange={(e) => handleEditItem(idx, 'quantidade', e.target.value)}
                        className="w-20 px-1 py-1 text-center border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded"
                        onClick={() => setEditingItemIdx(idx)}
                      >
                        {formatNumber(item.quantidade)}
                      </span>
                    )}
                  </td>
                  <td className="text-center p-2 text-gray-600">{item.unidade}</td>
                  <td className="text-right p-1">
                    {editingItemIdx === idx ? (
                      <input
                        type="number"
                        step="0.01"
                        value={item.precoMaterial || 0}
                        onChange={(e) => handleEditItem(idx, 'precoMaterial', e.target.value)}
                        className="w-24 px-1 py-1 text-right border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded"
                        onClick={() => setEditingItemIdx(idx)}
                      >
                        {formatCurrency(item.precoMaterial || 0)}
                      </span>
                    )}
                  </td>
                  <td className="text-right p-1">
                    {editingItemIdx === idx ? (
                      <input
                        type="number"
                        step="0.01"
                        value={item.precoInstalacao || 0}
                        onChange={(e) => handleEditItem(idx, 'precoInstalacao', e.target.value)}
                        className="w-24 px-1 py-1 text-right border border-blue-300 rounded text-sm focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <span
                        className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded"
                        onClick={() => setEditingItemIdx(idx)}
                      >
                        {formatCurrency(item.precoInstalacao || 0)}
                      </span>
                    )}
                  </td>
                  <td className="text-right p-2 font-semibold">{formatCurrency(item.quantidade * item.preco)}</td>
                  <td className="text-center p-2 flex gap-1 justify-center">
                    {editingItemIdx === idx ? (
                      <button
                        onClick={() => setEditingItemIdx(null)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Confirmar"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingItemIdx(idx)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-4">Nenhum item adicionado</div>
      )}

      <div className="flex justify-between items-center mb-4 pt-4 border-t">
        <div className="flex gap-6">
          <span className="text-sm text-gray-600">Material: <span className="font-semibold text-gray-900">{formatCurrency(totalMaterial)}</span></span>
          <span className="text-sm text-gray-600">Instalação: <span className="font-semibold text-gray-900">{formatCurrency(totalInstalacao)}</span></span>
        </div>
        <div>
          <span className="font-semibold text-gray-900">Total: </span>
          <span className="text-lg font-bold text-blue-600">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Item Selector - Pre-defined items from Step 2 */}
      {showItemSelector ? (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-gray-800 text-sm">Selecione o item (valores do Step 2 - Custos Unitários)</h4>
            <button onClick={() => setShowItemSelector(false)} className="p-1 text-gray-500 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          </div>
          {Object.entries(categorizedItems).map(([cat, { items, color }]) => {
            const colors = CATEGORY_COLORS[color] || CATEGORY_COLORS.blue;
            return (
              <div key={cat} className="mb-2">
                <div className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${colors.badge} mb-1`}>{cat}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {items.map((item, iIdx) => (
                    <button
                      key={iIdx}
                      onClick={() => handleAddPreDefined(item)}
                      className={`text-left p-2 rounded border ${colors.border} ${colors.bg} hover:shadow-md transition-shadow text-sm`}
                    >
                      <div className="font-medium text-gray-900">{item.descricao}</div>
                      <div className="flex gap-3 mt-1 text-xs text-gray-600">
                        {item.precoMaterial > 0 && <span>Material: {formatCurrency(item.precoMaterial)}/{item.unidade.toLowerCase()}</span>}
                        {item.precoInstalacao > 0 && <span>Instalação: {formatCurrency(item.precoInstalacao)}/{item.unidade.toLowerCase()}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <button
            onClick={() => { setShowItemSelector(false); setShowCustomForm(true); }}
            className="w-full mt-2 px-3 py-2 border border-dashed border-gray-400 text-gray-600 rounded-lg hover:bg-gray-100 text-sm font-medium"
          >
            + Item Personalizado
          </button>
        </div>
      ) : showCustomForm ? (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <h4 className="font-semibold text-gray-800 text-sm mb-2">Item Personalizado</h4>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Descrição"
              value={newItem.descricao}
              onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newItem.unidade}
              onChange={(e) => setNewItem({ ...newItem, unidade: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="KG">KG</option>
              <option value="M2">M²</option>
              <option value="ML">ML</option>
              <option value="UN">UN</option>
              <option value="VB">VB</option>
            </select>
            <input
              type="number"
              placeholder="Quantidade"
              step="0.01"
              value={newItem.quantidade}
              onChange={(e) => setNewItem({ ...newItem, quantidade: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Preço unitário"
              step="0.01"
              value={newItem.preco}
              onChange={(e) => setNewItem({ ...newItem, preco: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddCustom}
              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Adicionar Item
            </button>
            <button
              onClick={() => setShowCustomForm(false)}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowItemSelector(true)}
          className="w-full px-4 py-2 border-2 border-dashed border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Adicionar Item
        </button>
      )}
    </motion.div>
  );
};

// Step 3: Setores e Itens
const StepSetores = ({ setores, setSetores, unitCosts }) => {
  const [showNewSetor, setShowNewSetor] = useState(false);
  const [newSetorName, setNewSetorName] = useState('');

  const handleAddSetor = () => {
    if (newSetorName.trim()) {
      setSetores([...setores, { nome: newSetorName, itens: [] }]);
      setNewSetorName('');
      setShowNewSetor(false);
    }
  };

  const handleUpdateSetor = (index, updatedSetor) => {
    const updated = [...setores];
    updated[index] = updatedSetor;
    setSetores(updated);
  };

  const handleDeleteSetor = (index) => {
    setSetores(setores.filter((_, i) => i !== index));
  };

  const handleAddItem = (setorIndex, item) => {
    const updated = [...setores];
    updated[setorIndex].itens.push(item);
    setSetores(updated);
  };

  return (
    <div className="max-w-full px-4 lg:px-8 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Setores e Itens</h2>
        {!showNewSetor && (
          <button
            onClick={() => setShowNewSetor(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Setor
          </button>
        )}
      </div>

      {showNewSetor && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Nome do setor (ex: ESTRUTURA, COBERTURA, FECHAMENTO)"
              value={newSetorName}
              onChange={(e) => setNewSetorName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddSetor}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Criar
            </button>
            <button
              onClick={() => setShowNewSetor(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        <div className="space-y-4">
          {setores.map((setor, idx) => (
            <SetorCard
              key={idx}
              setor={setor}
              index={idx}
              onUpdate={handleUpdateSetor}
              onDelete={handleDeleteSetor}
              onAddItem={handleAddItem}
              unitCosts={unitCosts}
            />
          ))}
        </div>
      </AnimatePresence>

      {setores.length === 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
          <p className="text-blue-900">Nenhum setor criado. Crie um para começar a adicionar itens.</p>
        </div>
      )}
    </div>
  );
};

// Step 4: Serviços (Placeholder)
const StepServicos = () => {
  return (
    <div className="max-w-full px-4 lg:px-8 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Serviços Complementares</h3>
        <p className="text-gray-600">Adicione serviços complementares como pintura especial, tratamento adicional, etc.</p>
      </div>
    </div>
  );
};

// Step 5: BDI e Margens
const StepBDI = ({ project, calculations, setCalculations }) => {
  const [margemPct, setMargemPct] = useState(18);
  const [impostosPct, setImpostosPct] = useState(12);

  const handleRecalculate = () => {
    const newCalcs = { ...calculations };
    newCalcs.margemPct = margemPct;
    newCalcs.impostosPct = impostosPct;
    setCalculations(newCalcs);
  };

  return (
    <div className="max-w-full px-4 lg:px-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-blue-600">
          <h3 className="text-lg font-semibold mb-4">Margem de Lucro</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Percentual (%)</label>
              <input
                type="number"
                step="0.5"
                value={margemPct}
                onChange={(e) => setMargemPct(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-sm text-gray-600">
              <p>Sugeridos: Mínima 12%, Padrão 18%, Alta 25%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-orange-600">
          <h3 className="text-lg font-semibold mb-4">Impostos</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Percentual (%)</label>
              <input
                type="number"
                step="0.5"
                value={impostosPct}
                onChange={(e) => setImpostosPct(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="text-sm text-gray-600">
              <p>Padrão: ~12% (ISS, PIS, COFINS)</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow p-6 border border-green-200">
          <h3 className="text-lg font-semibold mb-4 text-green-900">Resumo</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Material (s/ margem):</span>
              <span className="font-semibold">{formatCurrency(calculations.custoMaterial || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Instalação:</span>
              <span className="font-semibold">{formatCurrency(calculations.custoInstalacao || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Margem (+{margemPct}%) s/ instalação:</span>
              <span className="font-semibold text-green-600">{formatCurrency((calculations.custoInstalacao || 0) * (margemPct / 100))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Impostos ({impostosPct}%) s/ instalação:</span>
              <span className="font-semibold text-orange-600">{formatCurrency(((calculations.custoInstalacao || 0) * (1 + margemPct / 100)) * (impostosPct / 100))}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total:</span>
              <span className="text-green-700">{formatCurrency(calculations.precoFinal || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// KPI Card
const KPICard = ({ title, value, icon: Icon, color = 'blue', subtitle = '' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
  };

  return (
    <div className={`rounded-lg border-l-4 p-6 ${colorClasses[color]}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <Icon className="h-8 w-8 opacity-20" />
      </div>
    </div>
  );
};

// Step 6: Análise
const StepAnalise = ({ project, setores, calculations, unitCosts }) => {
  const totalItens = setores.reduce((sum, s) => sum + s.itens.length, 0);
  // Peso real: agrupa itens KG por nome base (antes de " - ") em cada setor e conta 1 vez
  let totalWeight = 0;
  setores.forEach(s => {
    const gruposPorBase = {};
    (s.itens || []).forEach(item => {
      if (item.unidade === 'KG') {
        const base = (item.descricao || '').split(' - ')[0].trim() || item.descricao || 'item';
        if (!gruposPorBase[base] || (item.quantidade || 0) > gruposPorBase[base]) {
          gruposPorBase[base] = item.quantidade || 0;
        }
      }
    });
    totalWeight += Object.values(gruposPorBase).reduce((sum, qty) => sum + qty, 0);
  });

  const totalArea = setores.reduce((sum, s) => {
    return sum + s.itens.reduce((itemSum, item) => {
      return itemSum + (item.quantidade || 0) * (item.unidade === 'M2' ? 1 : 0);
    }, 0);
  }, 0);

  const totalValue = setores.reduce((sum, s) => {
    return sum + s.itens.reduce((itemSum, item) => {
      return itemSum + (item.quantidade * item.preco);
    }, 0);
  }, 0);

  // Valor/KG e Valor/M2 calculados APÓS margem e impostos (precoFinal)
  const precoFinal = calculations?.precoFinal || totalValue;
  const valorPorKg = totalWeight > 0 ? precoFinal / totalWeight : 0;
  const valorPorM2 = totalArea > 0 ? precoFinal / totalArea : 0;

  // Análise por setor
  const setorAnalise = setores.map(s => {
    const valor = s.itens.reduce((sum, item) => sum + (item.quantidade * item.preco), 0);
    return { nome: s.nome, valor };
  });

  return (
    <div className="max-w-full px-4 lg:px-8 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Peso Total" value={formatNumber(totalWeight) + ' kg'} icon={Weight} color="blue" />
        <KPICard title="Área Total" value={formatNumber(totalArea) + ' m²'} icon={Package} color="orange" />
        <KPICard title="Valor Total" value={formatCurrency(totalValue)} icon={DollarSign} color="green" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="Valor / KG" value={formatCurrency(valorPorKg) + ' /kg'} icon={DollarSign} color="blue" />
        <KPICard title="Valor / M²" value={formatCurrency(valorPorM2) + ' /m²'} icon={DollarSign} color="orange" />
        <KPICard title="Itens" value={totalItens} icon={Layers} color="purple" />
      </div>

      {/* Dados Projeto */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Dados do Projeto
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Projeto</p>
            <p className="font-semibold text-gray-900">{project.nome}</p>
          </div>
          <div>
            <p className="text-gray-600">Cliente</p>
            <p className="font-semibold text-gray-900">{project.cliente}</p>
          </div>
          <div>
            <p className="text-gray-600">Tipo</p>
            <p className="font-semibold text-gray-900">{project.tipo || 'Não definido'}</p>
          </div>
          <div>
            <p className="text-gray-600">Região</p>
            <p className="font-semibold text-gray-900">{project.regiao}</p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      {setorAnalise.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Distribuição por Setor</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={setorAnalise}
                  dataKey="valor"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {setorAnalise.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Valor por Setor</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={setorAnalise}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="valor" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabela Detalhada */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Detalhamento por Setor</h3>
        {setores.length > 0 ? (
          setores.map((setor, idx) => (
            <div key={idx} className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3 text-base">{setor.nome}</h4>
              {setor.itens.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="text-left p-2">Descrição</th>
                        <th className="text-center p-2">Quantidade</th>
                        <th className="text-center p-2">Unidade</th>
                        <th className="text-right p-2">Preço Unit.</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {setor.itens.map((item, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-2">{item.descricao}</td>
                          <td className="text-center p-2">{formatNumber(item.quantidade)}</td>
                          <td className="text-center p-2">{item.unidade}</td>
                          <td className="text-right p-2">{formatCurrency(item.preco)}</td>
                          <td className="text-right p-2 font-semibold">{formatCurrency(item.quantidade * item.preco)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nenhum item adicionado</p>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500">Nenhum setor criado</p>
        )}
      </div>

      {/* Gerar Proposta Comercial */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg shadow p-6 border border-emerald-200">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-emerald-900">
          <FileText className="h-5 w-5 text-emerald-700" />
          Gerar Proposta Comercial
        </h3>
        <p className="text-sm text-emerald-700 mb-4">
          Gere a proposta comercial completa baseada nos dados do simulador, com a identidade visual do Grupo Montex.
        </p>
        <div className="flex flex-wrap gap-3">
          <PropostaButton
            type="html"
            project={project}
            setores={setores}
            calculations={calculations}
            unitCosts={unitCosts}
          />
          <PropostaButton
            type="docx"
            project={project}
            setores={setores}
            calculations={calculations}
            unitCosts={unitCosts}
          />
          <PropostaButton
            type="pdf"
            project={project}
            setores={setores}
            calculations={calculations}
            unitCosts={unitCosts}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PROPOSTA BUTTON COMPONENT
// ============================================================================

const PropostaButton = ({ type, project, setores, calculations, unitCosts }) => {
  const [loading, setLoading] = React.useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const propostaData = {
        project,
        setores,
        calculations,
        unitCosts,
        propostaNumber: `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}`,
        prazoExecucao: 150,
        condicoesPagamento: { assinatura: 10, projeto: 5, medicoes: 85 },
      };

      if (type === 'html') {
        // HTML Preview - opens in new window like Romaneio
        const { gerarPreviaPropostaHTML } = await import('../utils/propostaHTMLPreview');
        gerarPreviaPropostaHTML(propostaData);
        toast.success('Prévia HTML aberta em nova janela!');
        setLoading(false);
        return;
      }

      let blob;
      let filename;

      if (type === 'docx') {
        const { generatePropostaDOCX } = await import('../utils/propostaGenerator');
        blob = await generatePropostaDOCX(propostaData);
        filename = `Proposta_${(project?.nome || 'Montex').replace(/\s+/g, '_')}.docx`;
      } else {
        const { generatePropostaPDF } = await import('../utils/propostaPDFGenerator');
        blob = await generatePropostaPDF(propostaData);
        filename = `Proposta_${(project?.nome || 'Montex').replace(/\s+/g, '_')}.pdf`;
      }

      // Download the file using native approach
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Proposta ${type.toUpperCase()} gerada com sucesso!`);
    } catch (error) {
      console.error('Erro ao gerar proposta:', error);
      toast.error(`Erro ao gerar proposta: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const buttonStyles = {
    html: 'bg-teal-600 hover:bg-teal-700 text-white',
    docx: 'bg-blue-600 hover:bg-blue-700 text-white',
    pdf: 'bg-red-600 hover:bg-red-700 text-white',
  };

  const icons = {
    html: <Eye className="h-4 w-4" />,
    docx: <File className="h-4 w-4" />,
    pdf: <FileDown className="h-4 w-4" />,
  };

  const labels = {
    html: 'Prévia HTML',
    docx: 'Proposta DOCX',
    pdf: 'Proposta PDF',
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all ${buttonStyles[type]} ${loading ? 'opacity-70 cursor-wait' : ''}`}
    >
      {loading ? (
        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
      ) : icons[type]}
      {loading ? 'Gerando...' : labels[type]}
    </button>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SimuladorOrcamento() {
  const { orcamentos: orcamentosContext, addOrcamento, deleteOrcamento } = useOrcamentos();

  const [step, setStep] = useState(0);
  const steps = ['Info', 'Custos', 'Setores', 'Serviços', 'BDI', 'Análise'];
  const [showOrcamentosList, setShowOrcamentosList] = useState(false);
  const [savedOrcamentos, setSavedOrcamentos] = useState([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const [project, setProject] = useState({
    nome: '',
    cliente: '',
    tipo: '',
    regiao: 'sudeste'
  });

  const [unitCosts, setUnitCosts] = useState({
    estrutura: {
      material: 19.50,
      fabricacao: 5.50,
      pintura: 1.40,
      transporte: 1.00,
      montagem: 3.50,
    },
    cobertura: {
      tipo: 'galvanizada_050',
      material: 75.00,
      montagem: 18.00,
    },
    fechamento: {
      tipo: 'pir_30mm',
      material: 125.00,
      montagem: 15.00,
    },
    steelDeck: {
      material: 115.00,
      montagem: 25.00,
    },
    complementos: {
      calha: 120.00,
      rufos: 55.00,
      platibanda: 80.00,
    },
  });

  const [setores, setSetores] = useState([]);

  const [calculations, setCalculations] = useState({
    custoTotal: 0,
    precoFinal: 0,
    precoVendaBDI: 0,
    totalPeso: 0,
    precoKgMedio: 0,
    margemPct: 18,
    impostosPct: 12,
    prazo: { total: 0, projeto: 10, fabricacao: 0, montagem: 0 }
  });

  // Load saved orcamento for editing (from OrcamentosPage via URL param + Supabase context)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editarId = params.get('editar');
    if (!editarId || !orcamentosContext.length) return;

    try {
      const orc = orcamentosContext.find(o => o.id === editarId);
      if (!orc) return;

      // Restore project info
      setProject({
        nome: orc.nome || orc.projeto || '',
        cliente: orc.cliente || '',
        tipo: orc.tipo || '',
        regiao: orc.regiao || 'sudeste',
      });

      // Restore unit costs
      if (orc.custosUnitarios) {
        setUnitCosts(orc.custosUnitarios);
      }

      // Restore setores
      if (orc.setores && Array.isArray(orc.setores) && orc.setores.length > 0) {
        setSetores(orc.setores.map((s, idx) => ({
          id: `setor_${idx}_${Date.now()}`,
          nome: s.nome || `Setor ${idx + 1}`,
          itens: (s.itens || []).map((item, iIdx) => ({
            id: `item_${idx}_${iIdx}_${Date.now()}`,
            descricao: item.descricao || '',
            quantidade: item.quantidade || 0,
            unidade: item.unidade || 'KG',
            preco: item.preco || 0,
            precoMaterial: item.precoMaterial || 0,
            precoInstalacao: item.precoInstalacao || 0,
          })),
        })));
      }

      // Restore calculations
      if (orc.resumo) {
        setCalculations(prev => ({
          ...prev,
          margemPct: orc.resumo.margemPct || prev.margemPct,
        }));
      }

      // Clean URL params
      window.history.replaceState({}, '', window.location.pathname);

      toast.success(`Orçamento "${orc.nome || orc.projeto}" carregado para edição!`);
    } catch (e) {
      console.error('Erro ao carregar orçamento para edição:', e);
    }
  }, [orcamentosContext]);

  // Sincronizar lista de orçamentos salvos do context (Supabase)
  useEffect(() => {
    setSavedOrcamentos(orcamentosContext);
  }, [orcamentosContext]);

  const handleEditarOrcamento = useCallback((orc) => {
    // Load the selected orcamento into the simulator
    setProject({
      nome: orc.nome || orc.projeto || '',
      cliente: orc.cliente || '',
      tipo: orc.tipo || '',
      regiao: orc.regiao || 'sudeste',
    });
    if (orc.custosUnitarios) setUnitCosts(orc.custosUnitarios);
    if (orc.setores && Array.isArray(orc.setores) && orc.setores.length > 0) {
      setSetores(orc.setores.map((s, idx) => ({
        id: `setor_${idx}_${Date.now()}`,
        nome: s.nome || `Setor ${idx + 1}`,
        itens: (s.itens || []).map((item, iIdx) => ({
          id: `item_${idx}_${iIdx}_${Date.now()}`,
          descricao: item.descricao || '',
          quantidade: item.quantidade || 0,
          unidade: item.unidade || 'KG',
          preco: item.preco || 0,
          precoMaterial: item.precoMaterial || 0,
          precoInstalacao: item.precoInstalacao || 0,
        })),
      })));
    }
    if (orc.resumo) {
      setCalculations(prev => ({ ...prev, margemPct: orc.resumo.margemPct || prev.margemPct }));
    }
    setStep(0);
    setShowOrcamentosList(false);
    toast.success(`Orçamento "${orc.nome || orc.projeto}" carregado!`);
  }, []);

  const handleApagarOrcamento = useCallback(async (orcId) => {
    try {
      await deleteOrcamento(orcId);
      toast.success('Orçamento apagado!');
    } catch (e) {
      console.error('Erro ao apagar:', e);
      toast.error('Erro ao apagar orçamento');
    }
    setDeleteConfirmId(null);
  }, [deleteOrcamento]);

  // Update calculations when setores change
  useMemo(() => {
    const totalValue = setores.reduce((sum, s) => {
      return sum + s.itens.reduce((itemSum, item) => {
        return itemSum + (item.quantidade * item.preco);
      }, 0);
    }, 0);

    // Peso real: agrupa itens KG por nome base (antes de " - ") em cada setor e conta 1 vez
    // Ex: "Estrutura Metálica - Material" e "Estrutura Metálica - Fabricação" = mesmo peso
    let totalWeight = 0;
    setores.forEach(s => {
      const gruposPorBase = {};
      (s.itens || []).forEach(item => {
        if (item.unidade === 'KG') {
          const base = (item.descricao || '').split(' - ')[0].trim() || item.descricao || 'item';
          if (!gruposPorBase[base] || (item.quantidade || 0) > gruposPorBase[base]) {
            gruposPorBase[base] = item.quantidade || 0;
          }
        }
      });
      totalWeight += Object.values(gruposPorBase).reduce((sum, qty) => sum + qty, 0);
    });

    const precoKgMedio = totalWeight > 0 ? totalValue / totalWeight : 0;

    // Separar custo Material vs Instalação
    // Material (sem margem/impostos): itens cujo sufixo após " - " é "Material"
    // Instalação (com margem/impostos): Fabricação, Pintura, Transporte, Montagem, etc.
    let custoMaterial = 0;
    let custoInstalacao = 0;
    setores.forEach(s => {
      (s.itens || []).forEach(item => {
        const total = (item.quantidade || 0) * (item.preco || 0);
        const parts = (item.descricao || '').split(' - ');
        const sufixo = parts.length >= 2 ? parts[parts.length - 1].trim().toLowerCase() : '';
        if (sufixo === 'material') {
          custoMaterial += total;
        } else {
          custoInstalacao += total;
        }
      });
    });

    // Margem e impostos SOMENTE sobre instalação
    const margemValue = custoInstalacao * (calculations.margemPct / 100);
    const subtotalInstalacao = custoInstalacao + margemValue;
    const impostos = subtotalInstalacao * (calculations.impostosPct / 100);
    const precoFinal = custoMaterial + subtotalInstalacao + impostos;

    setCalculations(prev => ({
      ...prev,
      custoTotal: totalValue,
      custoMaterial,
      custoInstalacao,
      precoFinal,
      precoVendaBDI: precoFinal,
      totalPeso: totalWeight,
      precoKgMedio,
      prazo: {
        ...prev.prazo,
        fabricacao: Math.ceil((totalWeight / 1000) * 1.5),
        montagem: Math.ceil((totalWeight / 1000) * 2)
      }
    }));
  }, [setores, calculations.margemPct, calculations.impostosPct]);

  const handleSaveOrcamento = useCallback(async () => {
    if (!project.nome || !project.cliente) {
      toast.error('Preencha nome do projeto e cliente (Passo 1)');
      return;
    }

    const orc = {
      id: `ORC-${Date.now()}`,
      numero: `ORC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      nome: project.nome,
      projeto: project.nome,
      cliente: project.cliente,
      tipo: project.tipo || 'Galpão Industrial',
      regiao: project.regiao || 'sudeste',
      valor: calculations.precoFinal || 0,
      valor_total: calculations.precoFinal || 0,
      valorBDI: calculations.precoVendaBDI || 0,
      peso_estimado: calculations.totalPeso || 0,
      status: 'rascunho',
      probabilidade: 50,
      responsavel: 'Guilherme Maciel',
      dataCriacao: new Date().toISOString(),
      data_criacao: new Date().toISOString(),
      validade: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      setores: setores.map((s) => ({
        nome: s.nome,
        itens: s.itens.map(item => ({
          descricao: item.descricao,
          quantidade: item.quantidade,
          unidade: item.unidade,
          preco: item.preco,
          precoMaterial: item.precoMaterial || 0,
          precoInstalacao: item.precoInstalacao || 0,
        })),
        total: s.itens.reduce((sum, item) => sum + item.quantidade * item.preco, 0),
      })),
      custosUnitarios: unitCosts,
      resumo: {
        pesoTotal: calculations.totalPeso || 0,
        precoKgMedio: calculations.precoKgMedio || 0,
        margemPct: calculations.margemPct || 18,
        prazo: calculations.prazo?.total || 0,
      },
    };

    // Salvar via ERPContext (Supabase)
    try {
      await addOrcamento(orc);
      console.log('✅ Orçamento salvo no Supabase:', orc.numero);
      toast.success(`Orçamento ${orc.numero} salvo com sucesso!`);
    } catch (e) {
      console.error('❌ Erro ao salvar orçamento:', e);
      toast.error('Erro ao salvar orçamento. Tente novamente.');
    }
  }, [project, setores, calculations, unitCosts, addOrcamento]);

  const canProceed = () => {
    // Allow free navigation between steps - validate only on save
    return true;
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <StepInfo project={project} setProject={setProject} />;
      case 1:
        return <StepCustos unitCosts={unitCosts} setUnitCosts={setUnitCosts} setores={setores} />;
      case 2:
        return <StepSetores setores={setores} setSetores={setSetores} unitCosts={unitCosts} />;
      case 3:
        return <StepServicos />;
      case 4:
        return <StepBDI project={project} calculations={calculations} setCalculations={setCalculations} />;
      case 5:
        return <StepAnalise project={project} setores={setores} calculations={calculations} unitCosts={unitCosts} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-full px-4 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                Simulador de Orçamento
              </h1>
              <p className="text-gray-600 mt-1">Passo {step + 1} de {steps.length}: {steps[step]}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setShowOrcamentosList(!showOrcamentosList); }}
                className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 text-sm font-medium flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Orçamentos Salvos ({savedOrcamentos.length})
                <ChevronDown className={`h-4 w-4 transition-transform ${showOrcamentosList ? 'rotate-180' : ''}`} />
              </button>
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5">
                <Plus className="h-4 w-4" />
                {project.nome ? project.nome : 'Nova Simulação'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Orçamentos Salvos */}
      <AnimatePresence>
        {showOrcamentosList && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden bg-white border-b"
          >
            <div className="max-w-full px-4 lg:px-8 py-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                Orçamentos Criados
              </h3>
              {savedOrcamentos.length === 0 ? (
                <p className="text-gray-500 text-sm py-4 text-center">Nenhum orçamento salvo ainda.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {savedOrcamentos.map((orc) => (
                    <div key={orc.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-blue-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-blue-600 font-semibold">{orc.numero}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                            {orc.status || 'rascunho'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate mt-0.5">{orc.nome || orc.projeto}</p>
                        <p className="text-xs text-gray-500">{orc.cliente} — {(orc.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEditarOrcamento(orc)}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        {deleteConfirmId === orc.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleApagarOrcamento(orc.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(orc.id)}
                            className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 flex items-center gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Apagar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="bg-white border-b px-4 lg:px-8 py-4">
        <div className="flex justify-between items-center max-w-full">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  i === step
                    ? 'bg-blue-600 text-white'
                    : i < step
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                {i < step ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
              </div>
              <div className="flex-1 mx-2">
                <div className={`h-1 rounded-full transition-colors ${i < step ? 'bg-green-600' : 'bg-gray-300'}`} />
              </div>
            </div>
          ))}
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold bg-gray-300 text-gray-600">
            {steps.length}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-8">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="bg-white border-t shadow-lg sticky bottom-0">
        <div className="max-w-full px-4 lg:px-8 py-4 flex justify-between items-center">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Passo {step + 1} de {steps.length}
            </p>
          </div>

          <div className="flex gap-2">
            {step === steps.length - 1 && (
              <button
                onClick={handleSaveOrcamento}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Salvar Orçamento
              </button>
            )}
            <button
              onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
              disabled={!canProceed()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
