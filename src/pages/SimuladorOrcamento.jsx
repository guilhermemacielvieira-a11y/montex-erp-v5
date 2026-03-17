import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { generatePropostaDOCX } from '../utils/generatePropostaDOCX';
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
  CheckSquare,
  Activity,
  TrendingDown,
  Scale,
  Gauge,
} from 'lucide-react';
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
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

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

const generateProposalNumber = () => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
  return `${random}/${month}.${year}`;
};

// ============================================================================
// COMPONENTS
// ============================================================================

// Step 1: Dados do Projeto
const StepDadosProjeto = ({ project, setProject }) => {
  useEffect(() => {
    if (!project.numeroPropostas) {
      setProject({ ...project, numeroPropostas: generateProposalNumber() });
    }
    if (!project.dataEmissao) {
      setProject({ ...project, dataEmissao: new Date().toISOString().split('T')[0] });
    }
    if (!project.dataValidade) {
      const validadeDate = new Date();
      validadeDate.setDate(validadeDate.getDate() + 30);
      setProject({ ...project, dataValidade: validadeDate.toISOString().split('T')[0] });
    }
  }, []);

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Número da Proposta</label>
              <input
                type="text"
                value={project.numeroPropostas || ''}
                onChange={(e) => setProject({ ...project, numeroPropostas: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Autogenerado"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Emissão</label>
                <input
                  type="date"
                  value={project.dataEmissao || ''}
                  onChange={(e) => setProject({ ...project, dataEmissao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Validade</label>
                <input
                  type="date"
                  value={project.dataValidade || ''}
                  onChange={(e) => setProject({ ...project, dataValidade: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
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
              <span>O número da proposta é auto-gerado automaticamente</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>A validade padrão é de 30 dias a partir da data de emissão</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>Todos os dados podem ser editados em qualquer momento</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>O tipo e região afetam os preços sugeridos</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Step 2: Custos Unitários
const StepCustosUnitarios = ({ unitCosts, setUnitCosts, setores }) => {
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
  { categoria: 'Estrutura Metálica', descricao: 'Estrutura Metálica - Material', unidade: 'KG', precoMaterial: unitCosts.estrutura.material, precoInstalacao: 0, color: 'blue' },
  { categoria: 'Estrutura Metálica', descricao: 'Estrutura Metálica - Fabricação', unidade: 'KG', precoMaterial: unitCosts.estrutura.fabricacao, precoInstalacao: 0, color: 'blue' },
  { categoria: 'Estrutura Metálica', descricao: 'Estrutura Metálica - Pintura', unidade: 'KG', precoMaterial: unitCosts.estrutura.pintura, precoInstalacao: 0, color: 'blue' },
  { categoria: 'Estrutura Metálica', descricao: 'Estrutura Metálica - Transporte', unidade: 'KG', precoMaterial: unitCosts.estrutura.transporte, precoInstalacao: 0, color: 'blue' },
  { categoria: 'Estrutura Metálica', descricao: 'Estrutura Metálica - Montagem', unidade: 'KG', precoMaterial: 0, precoInstalacao: unitCosts.estrutura.montagem, color: 'blue' },
  { categoria: 'Cobertura', descricao: 'Cobertura - Material', unidade: 'M2', precoMaterial: unitCosts.cobertura.material, precoInstalacao: 0, color: 'orange' },
  { categoria: 'Cobertura', descricao: 'Cobertura - Montagem', unidade: 'M2', precoMaterial: 0, precoInstalacao: unitCosts.cobertura.montagem, color: 'orange' },
  { categoria: 'Fechamento', descricao: 'Fechamento - Material', unidade: 'M2', precoMaterial: unitCosts.fechamento.material, precoInstalacao: 0, color: 'red' },
  { categoria: 'Fechamento', descricao: 'Fechamento - Montagem', unidade: 'M2', precoMaterial: 0, precoInstalacao: unitCosts.fechamento.montagem, color: 'red' },
  { categoria: 'Steel Deck', descricao: 'Steel Deck - Material', unidade: 'M2', precoMaterial: unitCosts.steelDeck.material, precoInstalacao: 0, color: 'purple' },
  { categoria: 'Steel Deck', descricao: 'Steel Deck - Montagem', unidade: 'M2', precoMaterial: 0, precoInstalacao: unitCosts.steelDeck.montagem, color: 'purple' },
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

      {showItemSelector ? (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-gray-800 text-sm">Selecione o item (valores do Step 2)</h4>
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
const StepSetoresItens = ({ setores, setSetores, unitCosts }) => {
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
              placeholder="Nome do setor (ex: SUPERMERCADO, COBERTURA, FECHAMENTO)"
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

// Step 4: BDI e Investimento
const StepBDIInvestimento = ({ project, calculations, setCalculations, setores, paymentConditions, setPaymentConditions }) => {
  const [margemPct, setMargemPct] = useState(18);
  const [impostosPct, setImpostosPct] = useState(12);

  const totalValue = calculations.precoFinal || 0;

  return (
    <div className="max-w-full px-4 lg:px-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BDI Configuration */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-l-blue-600">
          <h3 className="text-lg font-semibold mb-4">Margem e Impostos</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Margem de Lucro (%)</label>
              <input
                type="number"
                step="0.5"
                value={margemPct}
                onChange={(e) => setMargemPct(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-600 mt-1">Sugeridos: Mínima 12%, Padrão 18%, Alta 25%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Impostos (%)</label>
              <input
                type="number"
                step="0.5"
                value={impostosPct}
                onChange={(e) => setImpostosPct(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-gray-600 mt-1">Padrão: ~12% (ISS, PIS, COFINS)</p>
            </div>
          </div>
        </div>

        {/* Composição do Investimento */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow p-6 border border-green-200">
          <h3 className="text-lg font-semibold mb-4 text-green-900">Composição do Investimento</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Material (s/ margem):</span>
              <span className="font-semibold">{formatCurrency(calculations.custoMaterial || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-700">Instalação (Fab/Pint/Transp/Mont):</span>
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
            <div className="border-t pt-2 flex justify-between font-bold text-base">
              <span>VALOR TOTAL:</span>
              <span className="text-green-700">{formatCurrency(calculations.precoFinal || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Condições de Pagamento */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          Condições de Pagamento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Na Assinatura (%)</label>
            <input
              type="number"
              step="1"
              value={paymentConditions.assinatura}
              onChange={(e) => setPaymentConditions({ ...paymentConditions, assinatura: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <div className="text-sm font-semibold text-blue-900">
              {formatCurrency((totalValue * paymentConditions.assinatura) / 100)}
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Aprovação do Projeto (%)</label>
            <input
              type="number"
              step="1"
              value={paymentConditions.aprovacao}
              onChange={(e) => setPaymentConditions({ ...paymentConditions, aprovacao: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 mb-2"
            />
            <div className="text-sm font-semibold text-orange-900">
              {formatCurrency((totalValue * paymentConditions.aprovacao) / 100)}
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Medições Mensais (%)</label>
            <input
              type="number"
              step="1"
              value={paymentConditions.medicoes}
              onChange={(e) => setPaymentConditions({ ...paymentConditions, medicoes: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 mb-2"
            />
            <div className="text-sm font-semibold text-green-900">
              {formatCurrency((totalValue * paymentConditions.medicoes) / 100)}
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-sm text-gray-700">
            Total distribuído: <span className="font-bold">{paymentConditions.assinatura + paymentConditions.aprovacao + paymentConditions.medicoes}%</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// Step 5: Cronograma e Escopo
const StepCronogramaEscopo = ({ cronograma, setCronograma, escopo, setEscopo, setores }) => {
  const totalPeso = setores.reduce((sum, s) => {
    const gruposPorBase = {};
    (s.itens || []).forEach(item => {
      if (item.unidade === 'KG') {
        const base = (item.descricao || '').split(' - ')[0].trim() || item.descricao || 'item';
        if (!gruposPorBase[base] || (item.quantidade || 0) > gruposPorBase[base]) {
          gruposPorBase[base] = item.quantidade || 0;
        }
      }
    });
    return sum + Object.values(gruposPorBase).reduce((s, q) => s + q, 0);
  }, 0);

  // Calcular cronograma estimado baseado no peso
  const calcularDias = (peso) => {
    if (peso < 10000) return 15;
    if (peso < 50000) return 30;
    if (peso < 100000) return 45;
    return 60;
  };

  const diasFabricacao = calcularDias(totalPeso);

  return (
    <div className="max-w-full px-4 lg:px-8 space-y-6">
      {/* Cronograma */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Cronograma Estimado
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Projeto (dias)</label>
              <input
                type="number"
                value={cronograma.projeto}
                onChange={(e) => setCronograma({ ...cronograma, projeto: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fabricação (dias)</label>
              <input
                type="number"
                value={cronograma.fabricacao}
                onChange={(e) => setCronograma({ ...cronograma, fabricacao: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={String(diasFabricacao)}
              />
              <p className="text-xs text-gray-500 mt-1">Sugerido: {diasFabricacao} dias</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montagem (dias)</label>
              <input
                type="number"
                value={cronograma.montagem}
                onChange={(e) => setCronograma({ ...cronograma, montagem: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Prazo Total: {cronograma.projeto + cronograma.fabricacao + cronograma.montagem} dias</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Escopo de Fornecimento */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-green-600" />
          Escopo de Fornecimento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">INCLUSO</label>
            <textarea
              value={escopo.incluso}
              onChange={(e) => setEscopo({ ...escopo, incluso: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 h-32 text-sm"
              placeholder="Lista de itens inclusos"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">NÃO INCLUSO</label>
            <textarea
              value={escopo.naoIncluso}
              onChange={(e) => setEscopo({ ...escopo, naoIncluso: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 h-32 text-sm"
              placeholder="Lista de itens não inclusos"
            />
          </div>
        </div>
      </div>

      {/* Obrigações do Contratante */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-600" />
          Obrigações do Contratante
        </h3>
        <textarea
          value={cronograma.obrigacoes}
          onChange={(e) => setCronograma({ ...cronograma, obrigacoes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 h-32 text-sm"
          placeholder="Lista de obrigações do contratante"
        />
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

// Step 7: Análise Interna — Profissional com Métricas Avançadas
const StepAnaliseInterna = ({ setores, calculations, unitCosts }) => {
  const META_PRODUCAO_MENSAL_KG = 45000;
  const META_MONTAGEM_MENSAL_KG = 25000;
  const CUSTO_MEDIO_FABRICACAO_KG = 5.50;
  const CUSTO_MEDIO_PINTURA_KG = 1.40;
  const CUSTO_MEDIO_TRANSPORTE_KG = 1.00;
  const CUSTO_MEDIO_MONTAGEM_KG = 3.00;
  const CUSTO_PRODUCAO_KG = 7.90;

  const [activeTab, setActiveTab] = useState('overview');
  const [animatedValues, setAnimatedValues] = useState({});

  const analise = useMemo(() => {
    let pesoTotal = 0, custoFabricacao = 0, custoPintura = 0, custoTransporte = 0;
    let custoMontagem = 0, custoMaterial = 0, areaTotal = 0;

    (setores || []).forEach(s => {
      const gruposPorBase = {};
      (s.itens || []).forEach(item => {
        const qty = item.quantidade || 0;
        const desc = (item.descricao || '').toLowerCase();
        const precoItem = item.preco || 0;

        if (desc.includes('fabricação') || desc.includes('fabricacao')) custoFabricacao += qty * precoItem;
        else if (desc.includes('pintura')) custoPintura += qty * precoItem;
        else if (desc.includes('transporte')) custoTransporte += qty * precoItem;
        else if (desc.includes('montagem')) custoMontagem += qty * precoItem;
        else custoMaterial += qty * precoItem;

        if (item.unidade === 'KG') {
          const base = (item.descricao || '').split(' - ')[0].trim() || 'item';
          if (!gruposPorBase[base] || qty > gruposPorBase[base]) gruposPorBase[base] = qty;
        }
        if (item.unidade === 'M2') areaTotal += qty;
      });
      pesoTotal += Object.values(gruposPorBase).reduce((a, b) => a + b, 0);
    });

    const custoProducao = custoFabricacao + custoPintura + custoTransporte;
    const custoTotal = custoMaterial + custoProducao + custoMontagem;
    const custoInstalacao = custoProducao + custoMontagem;
    const margemVal = custoInstalacao * ((calculations.margemPct || 18) / 100);
    const impostosVal = (custoInstalacao + margemVal) * ((calculations.impostosPct || 12) / 100);
    const valorProposta = custoTotal + margemVal + impostosVal;

    const mesesProducao = pesoTotal > 0 ? pesoTotal / META_PRODUCAO_MENSAL_KG : 0;
    const mesesMontagem = pesoTotal > 0 ? pesoTotal / META_MONTAGEM_MENSAL_KG : 0;
    const custoMensalProducaoObra = mesesProducao > 0 ? custoProducao / mesesProducao : 0;
    const custoMensalMontagemObra = mesesMontagem > 0 ? custoMontagem / mesesMontagem : 0;

    const fabricacaoKg = pesoTotal > 0 ? custoFabricacao / pesoTotal : 0;
    const pinturaKg = pesoTotal > 0 ? custoPintura / pesoTotal : 0;
    const transporteKg = pesoTotal > 0 ? custoTransporte / pesoTotal : 0;
    const montagemKg = pesoTotal > 0 ? custoMontagem / pesoTotal : 0;
    const producaoKg = pesoTotal > 0 ? custoProducao / pesoTotal : 0;

    // Cálculos financeiros
    const margemPct = custoInstalacao > 0 ? (margemVal / custoInstalacao) * 100 : 0;
    const roiPct = valorProposta > 0 ? ((valorProposta - custoTotal) / custoTotal) * 100 : 0;
    const breakEven = mesesProducao > 0 ? (custoTotal / (valorProposta / mesesProducao)) : 0;

    return {
      pesoTotal, areaTotal, custoTotal, valorProposta, custoMaterial, custoFabricacao,
      custoPintura, custoTransporte, custoMontagem, custoProducao, custoInstalacao,
      margemVal, impostosVal, mesesProducao, mesesMontagem, custoMensalProducaoObra,
      custoMensalMontagemObra, fabricacaoKg, pinturaKg, transporteKg, montagemKg,
      producaoKg, custoKg: pesoTotal > 0 ? custoTotal / pesoTotal : 0,
      precoVendaKg: pesoTotal > 0 ? valorProposta / pesoTotal : 0,
      margemPct, roiPct, breakEven,
    };
  }, [setores, calculations]);

  // Animação de números
  useEffect(() => {
    const keys = ['valorProposta', 'margemVal', 'roiPct', 'precoVendaKg'];
    keys.forEach(key => {
      let progress = 0;
      const target = analise[key];
      const animate = () => {
        progress += 0.05;
        if (progress < 1) {
          setAnimatedValues(prev => ({
            ...prev,
            [key]: target * progress,
          }));
          requestAnimationFrame(animate);
        } else {
          setAnimatedValues(prev => ({ ...prev, [key]: target }));
        }
      };
      animate();
    });
  }, [analise]);

  const ocupacaoProducao = (analise.custoMensalProducaoObra / (META_PRODUCAO_MENSAL_KG * CUSTO_PRODUCAO_KG)) * 100;
  const ocupacaoMontagem = (analise.custoMensalMontagemObra / (META_MONTAGEM_MENSAL_KG * CUSTO_MEDIO_MONTAGEM_KG)) * 100;

  const custoKgData = [
    { name: 'Fabricação', simulado: analise.fabricacaoKg, referencia: CUSTO_MEDIO_FABRICACAO_KG },
    { name: 'Pintura', simulado: analise.pinturaKg, referencia: CUSTO_MEDIO_PINTURA_KG },
    { name: 'Transporte', simulado: analise.transporteKg, referencia: CUSTO_MEDIO_TRANSPORTE_KG },
    { name: 'Montagem', simulado: analise.montagemKg, referencia: CUSTO_MEDIO_MONTAGEM_KG },
  ];

  const composicaoPie = [
    { name: 'Material', value: analise.custoMaterial, color: '#3b82f6' },
    { name: 'Fabricação', value: analise.custoFabricacao, color: '#8b5cf6' },
    { name: 'Pintura', value: analise.custoPintura, color: '#f59e0b' },
    { name: 'Transporte', value: analise.custoTransporte, color: '#06b6d4' },
    { name: 'Montagem', value: analise.custoMontagem, color: '#10b981' },
  ].filter(d => d.value > 0);

  const monthlyData = Array.from({ length: Math.ceil(analise.mesesProducao) }, (_, i) => ({
    mes: `Mês ${i + 1}`,
    producao: analise.custoMensalProducaoObra,
    montagem: analise.custoMensalMontagemObra,
  }));

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
        activeTab === id
          ? 'bg-indigo-600 text-white shadow-md'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  const KPICard = ({ icon: Icon, label, value, subtext, color }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg border-l-4 ${color} p-5 shadow-sm`}
    >
      <div className="flex justify-between items-start mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
        <Icon className="h-5 w-5 opacity-20" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </motion.div>
  );

  const insights = [
    {
      type: analise.margemPct >= 18 ? 'success' : 'warning',
      icon: analise.margemPct >= 18 ? CheckCircle2 : AlertCircle,
      text: `Margem de ${analise.margemPct.toFixed(1)}% — ${analise.margemPct >= 18 ? 'Dentro da meta' : 'Abaixo da meta'}`,
    },
    {
      type: Math.min(100, ocupacaoProducao) > 80 ? 'warning' : 'success',
      icon: Math.min(100, ocupacaoProducao) > 80 ? AlertCircle : CheckCircle2,
      text: `Produção com ${Math.min(100, ocupacaoProducao).toFixed(0)}% de ocupação — ${Math.min(100, ocupacaoProducao) > 80 ? 'Capacidade alta' : 'Capacidade adequada'}`,
    },
    {
      type: analise.precoVendaKg > analise.custoKg * 1.3 ? 'success' : 'warning',
      icon: analise.precoVendaKg > analise.custoKg * 1.3 ? CheckCircle2 : AlertCircle,
      text: `Markup de ${((analise.precoVendaKg / analise.custoKg - 1) * 100).toFixed(0)}% — ${analise.precoVendaKg > analise.custoKg * 1.3 ? 'Excelente' : 'Revisar preço'}`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Análise Interna Avançada</h2>
        </div>
        <p className="text-indigo-200 text-sm">Métricas profissionais de custo, rentabilidade, scheduling e análise de cenários</p>
      </div>

      {/* Insights Inteligentes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`p-4 rounded-lg border-l-4 ${
                insight.type === 'success'
                  ? 'bg-green-50 border-green-500'
                  : 'bg-amber-50 border-amber-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`h-5 w-5 ${
                    insight.type === 'success' ? 'text-green-600' : 'text-amber-600'
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    insight.type === 'success' ? 'text-green-800' : 'text-amber-800'
                  }`}
                >
                  {insight.text}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Abas Interativas */}
      <div className="flex gap-2 flex-wrap bg-white p-4 rounded-lg shadow-sm">
        <TabButton id="overview" label="Visão Geral" icon={BarChart3} />
        <TabButton id="producao" label="Produção" icon={Settings} />
        <TabButton id="montagem" label="Montagem" icon={Target} />
        <TabButton id="financeiro" label="Rentabilidade" icon={DollarSign} />
        <TabButton id="cronograma" label="Cronograma" icon={Calendar} />
      </div>

      {/* TAB: VISÃO GERAL */}
      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              icon={Weight}
              label="Peso Total"
              value={`${formatNumber(analise.pesoTotal / 1000)} ton`}
              subtext={`${formatNumber(analise.pesoTotal)} kg`}
              color="border-blue-500"
            />
            <KPICard
              icon={DollarSign}
              label="Valor Proposta"
              value={formatCurrency(animatedValues.valorProposta || analise.valorProposta)}
              subtext="Com margem e impostos"
              color="border-green-500"
            />
            <KPICard
              icon={TrendingUp}
              label="ROI"
              value={`${(animatedValues.roiPct || analise.roiPct).toFixed(1)}%`}
              subtext="Retorno sobre investimento"
              color="border-purple-500"
            />
            <KPICard
              icon={Percent}
              label="Margem Líquida"
              value={`${analise.margemPct.toFixed(1)}%`}
              subtext="Sobre custo de instalação"
              color="border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-indigo-600" />
                Composição de Custos
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={composicaoPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {composicaoPie.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-6 space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Resumo Executivo
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Custo Total (sem margem):</span>
                  <span className="font-bold">{formatCurrency(analise.custoTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Margem ({calculations.margemPct || 18}%):</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(animatedValues.margemVal || analise.margemVal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Impostos ({calculations.impostosPct || 12}%):</span>
                  <span className="font-bold text-amber-600">{formatCurrency(analise.impostosVal)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-base">
                  <span className="font-bold text-gray-800">Valor Final:</span>
                  <span className="font-bold text-indigo-700 text-lg">
                    {formatCurrency(analise.valorProposta)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB: PRODUÇÃO */}
      {activeTab === 'producao' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              icon={Settings}
              label="Custo Produção"
              value={formatCurrency(analise.custoProducao)}
              subtext="Fab + Pint + Transp"
              color="border-purple-500"
            />
            <KPICard
              icon={Clock}
              label="Meses Produção"
              value={analise.mesesProducao.toFixed(1)}
              subtext={`${(analise.mesesProducao * 4).toFixed(0)} semanas`}
              color="border-blue-500"
            />
            <KPICard
              icon={Gauge}
              label="Ocupação Mensal"
              value={`${Math.min(100, ocupacaoProducao).toFixed(0)}%`}
              subtext="Da capacidade fabril"
              color="border-amber-500"
            />
            <KPICard
              icon={TrendingUp}
              label="R$/kg Produção"
              value={formatCurrency(analise.producaoKg)}
              subtext={`Ref: ${formatCurrency(CUSTO_PRODUCAO_KG)}/kg`}
              color="border-emerald-500"
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Custo/kg: Simulado vs Referência</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={custoKgData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar name="Simulado" dataKey="simulado" fill="#3b82f6" />
                <Bar name="Referência" dataKey="referencia" fill="#d1d5db" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h3 className="font-semibold text-gray-800">Etapas de Produção</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-3 text-left font-semibold">Etapa</th>
                  <th className="px-6 py-3 text-right font-semibold">R$/kg Simulado</th>
                  <th className="px-6 py-3 text-right font-semibold">R$/kg Ref</th>
                  <th className="px-6 py-3 text-right font-semibold">Diferença</th>
                  <th className="px-6 py-3 text-right font-semibold">Custo Total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { etapa: 'Fabricação', sim: analise.fabricacaoKg, ref: CUSTO_MEDIO_FABRICACAO_KG, total: analise.custoFabricacao },
                  { etapa: 'Pintura', sim: analise.pinturaKg, ref: CUSTO_MEDIO_PINTURA_KG, total: analise.custoPintura },
                  { etapa: 'Transporte', sim: analise.transporteKg, ref: CUSTO_MEDIO_TRANSPORTE_KG, total: analise.custoTransporte },
                ].map((row, idx) => {
                  const diff = ((row.sim - row.ref) / row.ref) * 100;
                  return (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3">{row.etapa}</td>
                      <td className="px-6 py-3 text-right font-mono text-blue-600">{formatCurrency(row.sim)}</td>
                      <td className="px-6 py-3 text-right font-mono text-gray-500">{formatCurrency(row.ref)}</td>
                      <td className={`px-6 py-3 text-right font-mono ${diff > 15 ? 'text-red-600' : 'text-green-600'}`}>
                        {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                      </td>
                      <td className="px-6 py-3 text-right font-semibold">{formatCurrency(row.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* TAB: MONTAGEM */}
      {activeTab === 'montagem' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              icon={Target}
              label="Custo Montagem"
              value={formatCurrency(analise.custoMontagem)}
              subtext="Montagem em campo"
              color="border-emerald-500"
            />
            <KPICard
              icon={Clock}
              label="Meses Montagem"
              value={analise.mesesMontagem.toFixed(1)}
              subtext={`${(analise.mesesMontagem * 4).toFixed(0)} semanas`}
              color="border-blue-500"
            />
            <KPICard
              icon={Gauge}
              label="Ocupação Mensal"
              value={`${Math.min(100, ocupacaoMontagem).toFixed(0)}%`}
              subtext="Da capacidade de montagem"
              color="border-amber-500"
            />
            <KPICard
              icon={TrendingUp}
              label="R$/kg Montagem"
              value={formatCurrency(analise.montagemKg)}
              subtext={`Ref: ${formatCurrency(CUSTO_MEDIO_MONTAGEM_KG)}/kg`}
              color="border-purple-500"
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Custo Mensal de Montagem</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="montagem" fill="#10b981" name="Custo Montagem" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* TAB: RENTABILIDADE */}
      {activeTab === 'financeiro' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              icon={TrendingUp}
              label="ROI"
              value={`${(animatedValues.roiPct || analise.roiPct).toFixed(1)}%`}
              subtext="Retorno sobre investimento"
              color="border-green-500"
            />
            <KPICard
              icon={Percent}
              label="Margem Líquida"
              value={`${analise.margemPct.toFixed(1)}%`}
              subtext="Lucro / Custo Total"
              color="border-purple-500"
            />
            <KPICard
              icon={Zap}
              label="Break-even"
              value={`${analise.breakEven.toFixed(1)} meses`}
              subtext="Para recuperar investimento"
              color="border-amber-500"
            />
            <KPICard
              icon={DollarSign}
              label="Lucro Bruto"
              value={formatCurrency(analise.valorProposta - analise.custoTotal)}
              subtext="Antes de custos operacionais"
              color="border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Análise de Sensibilidade</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600 mb-2">Custo atual: {formatCurrency(analise.custoKg)}/kg</p>
                  <div className="space-y-1">
                    {[5, 10, 15, 20].map(pct => {
                      const newCost = analise.custoKg * (1 + pct / 100);
                      const newMargin = ((analise.precoVendaKg - newCost) / newCost) * 100;
                      return (
                        <div key={pct} className="flex justify-between p-2 bg-gray-50 rounded">
                          <span className="text-gray-600">+{pct}% custo:</span>
                          <span className={newMargin >= 18 ? 'text-green-600' : 'text-red-600'}>
                            {newMargin.toFixed(1)}% margem
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-6">
              <h3 className="font-semibold text-gray-800 mb-3">Resumo Financeiro</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Custo Material:</span>
                  <span className="font-semibold">{formatCurrency(analise.custoMaterial)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Custo Produção:</span>
                  <span className="font-semibold">{formatCurrency(analise.custoProducao)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Custo Montagem:</span>
                  <span className="font-semibold">{formatCurrency(analise.custoMontagem)}</span>
                </div>
                <div className="border-t border-green-300 pt-2 flex justify-between">
                  <span className="font-bold">Custo Total:</span>
                  <span className="font-bold text-green-700">{formatCurrency(analise.custoTotal)}</span>
                </div>
                <div className="flex justify-between text-green-700">
                  <span className="font-semibold">Margem:</span>
                  <span className="font-bold">+{formatCurrency(analise.margemVal)}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span className="font-semibold">Impostos:</span>
                  <span className="font-bold">+{formatCurrency(analise.impostosVal)}</span>
                </div>
                <div className="border-t border-green-300 pt-2 flex justify-between bg-white rounded p-2">
                  <span className="font-bold">Valor Proposta:</span>
                  <span className="font-bold text-green-700">{formatCurrency(analise.valorProposta)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB: CRONOGRAMA */}
      {activeTab === 'cronograma' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard
              icon={Calendar}
              label="Duração Total"
              value={`${(Math.max(analise.mesesProducao, analise.mesesMontagem)).toFixed(1)} meses`}
              subtext="Produção + Montagem paralela"
              color="border-indigo-500"
            />
            <KPICard
              icon={Settings}
              label="Produção"
              value={`${analise.mesesProducao.toFixed(1)} meses`}
              subtext={`${(analise.mesesProducao * 4).toFixed(0)} semanas na fábrica`}
              color="border-purple-500"
            />
            <KPICard
              icon={Target}
              label="Montagem"
              value={`${analise.mesesMontagem.toFixed(1)} meses`}
              subtext={`${(analise.mesesMontagem * 4).toFixed(0)} semanas em campo`}
              color="border-emerald-500"
            />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Distribuição de Custos por Mês</h3>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="producao" fill="#8b5cf6" name="Produção" />
                <Bar dataKey="montagem" fill="#10b981" name="Montagem" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Info className="h-5 w-5 text-indigo-600" />
              Timeline de Execução
            </h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                A obra será executada em aproximadamente <strong>{Math.max(analise.mesesProducao, analise.mesesMontagem).toFixed(1)} meses</strong>, com a produção em fábrica ocorrendo simultaneamente à montagem em campo.
              </p>
              <p>
                Custo médio mensal: <strong>{formatCurrency(analise.custoMensalProducaoObra + analise.custoMensalMontagemObra)}</strong> (produção + montagem).
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Step 6: Prévia da Proposta
const StepPrevia = ({ project, setores, calculations, unitCosts, paymentConditions, cronograma, escopo, onSave, onGeneratePDF, gerandoDocx, templateCarregado }) => {
  const totalItens = setores.reduce((sum, s) => sum + s.itens.length, 0);

  const totalPeso = setores.reduce((sum, s) => {
    const gruposPorBase = {};
    (s.itens || []).forEach(item => {
      if (item.unidade === 'KG') {
        const base = (item.descricao || '').split(' - ')[0].trim() || item.descricao || 'item';
        if (!gruposPorBase[base] || (item.quantidade || 0) > gruposPorBase[base]) {
          gruposPorBase[base] = item.quantidade || 0;
        }
      }
    });
    return sum + Object.values(gruposPorBase).reduce((s, q) => s + q, 0);
  }, 0);

  const precoMedio = totalPeso > 0 ? calculations.precoFinal / totalPeso : 0;

  return (
    <div className="max-w-full px-4 lg:px-8 space-y-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Peso Total" value={formatNumber(totalPeso) + ' kg'} icon={Weight} color="blue" />
        <KPICard title="Número de Itens" value={totalItens} icon={Package} color="orange" />
        <KPICard title="Preço Médio/kg" value={formatCurrency(precoMedio)} icon={TrendingUp} color="green" />
        <KPICard title="Valor Total" value={formatCurrency(calculations.precoFinal)} icon={DollarSign} color="purple" />
      </div>

      {/* Proposta Preview */}
      <div className="bg-white rounded-lg shadow p-8 border-t-4 border-blue-600">
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b pb-4">
            <h1 className="text-3xl font-bold text-gray-900">PROPOSTA COMERCIAL</h1>
            <p className="text-xl text-gray-600">Nº {project.numeroPropostas}</p>
            <div className="flex gap-6 mt-2 text-sm text-gray-600">
              <span><strong>Emissão:</strong> {new Date(project.dataEmissao).toLocaleDateString('pt-BR')}</span>
              <span><strong>Validade:</strong> {new Date(project.dataValidade).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {/* Dados do Projeto */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">DADOS DO PROJETO</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Projeto:</strong> {project.nome}</div>
              <div><strong>Cliente:</strong> {project.cliente}</div>
              <div><strong>Tipo:</strong> {TIPOS_ESTRUTURA[project.tipo]?.nome || project.tipo}</div>
              <div><strong>Região:</strong> {project.regiao}</div>
            </div>
          </div>

          {/* Custos Unitários */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">CUSTOS UNITÁRIOS DE REFERÊNCIA</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2 text-left font-semibold">Categoria</th>
                    <th className="border p-2 text-right font-semibold">Valor</th>
                    <th className="border p-2 text-left font-semibold">Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="border p-2">Estrutura - Material</td>
                    <td className="border p-2 text-right">{formatCurrency(unitCosts.estrutura.material)}</td>
                    <td className="border p-2">kg</td>
                  </tr>
                  <tr className="border-b">
                    <td className="border p-2">Estrutura - Fabricação</td>
                    <td className="border p-2 text-right">{formatCurrency(unitCosts.estrutura.fabricacao)}</td>
                    <td className="border p-2">kg</td>
                  </tr>
                  <tr className="border-b">
                    <td className="border p-2">Cobertura - Material</td>
                    <td className="border p-2 text-right">{formatCurrency(unitCosts.cobertura.material)}</td>
                    <td className="border p-2">m²</td>
                  </tr>
                  <tr className="border-b">
                    <td className="border p-2">Fechamento - Material</td>
                    <td className="border p-2 text-right">{formatCurrency(unitCosts.fechamento.material)}</td>
                    <td className="border p-2">m²</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Orçamento Detalhado */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">ORÇAMENTO DETALHADO POR SETOR ({setores.length} SETORES | {totalItens} ITENS)</h3>
            <div className="space-y-4">
              {setores.map((setor, idx) => {
                const setorTotal = setor.itens.reduce((sum, item) => sum + (item.quantidade * item.preco), 0);
                const setorMaterial = setor.itens.reduce((sum, item) => sum + (item.quantidade * (item.precoMaterial || 0)), 0);

                return (
                  <div key={idx} className="border rounded-lg p-3">
                    <h4 className="font-bold text-gray-900 mb-2">ETAPA {idx + 1} ({setor.nome})</h4>
                    <div className="overflow-x-auto mb-3">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border p-1 text-left">DESCRIÇÃO</th>
                            <th className="border p-1 text-center">UN</th>
                            <th className="border p-1 text-center">QUANTIDADE</th>
                            <th className="border p-1 text-right">PREÇO UNIT.</th>
                            <th className="border p-1 text-right">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {setor.itens.map((item, iIdx) => (
                            <tr key={iIdx} className="border-b">
                              <td className="border p-1">{item.descricao}</td>
                              <td className="border p-1 text-center">{item.unidade}</td>
                              <td className="border p-1 text-center">{formatNumber(item.quantidade)}</td>
                              <td className="border p-1 text-right">{formatCurrency(item.preco)}</td>
                              <td className="border p-1 text-right font-semibold">{formatCurrency(item.quantidade * item.preco)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-6 text-xs font-semibold">
                      <span>Subtotal: {formatCurrency(setorTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumo do Orçamento */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="text-lg font-bold text-gray-900 mb-3">RESUMO DO ORÇAMENTO</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <KPICard title="Peso Total" value={formatNumber(totalPeso) + ' kg'} icon={Weight} color="blue" />
              <KPICard title="Itens" value={String(totalItens)} icon={Package} color="orange" />
              <KPICard title="Preço Médio/kg" value={formatCurrency(precoMedio)} icon={TrendingUp} color="green" />
              <KPICard title="Valor Final" value={formatCurrency(calculations.precoFinal)} icon={DollarSign} color="purple" />
            </div>
            <div className="border-t pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Material (s/ margem/impostos):</span>
                <span className="font-semibold">{formatCurrency(calculations.custoMaterial || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Instalação (Fab/Pint/Transp/Mont):</span>
                <span className="font-semibold">{formatCurrency(calculations.custoInstalacao || 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>VALOR TOTAL DA PROPOSTA:</span>
                <span className="text-green-700">{formatCurrency(calculations.precoFinal || 0)}</span>
              </div>
            </div>
          </div>

          {/* Condições de Pagamento */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">CONDIÇÕES DE PAGAMENTO</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded border border-blue-200 text-center">
                <div className="text-xs font-semibold text-blue-900">Na Assinatura</div>
                <div className="text-lg font-bold text-blue-700">{paymentConditions.assinatura}%</div>
                <div className="text-xs text-blue-600">{formatCurrency((calculations.precoFinal * paymentConditions.assinatura) / 100)}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded border border-orange-200 text-center">
                <div className="text-xs font-semibold text-orange-900">Aprovação Projeto</div>
                <div className="text-lg font-bold text-orange-700">{paymentConditions.aprovacao}%</div>
                <div className="text-xs text-orange-600">{formatCurrency((calculations.precoFinal * paymentConditions.aprovacao) / 100)}</div>
              </div>
              <div className="bg-green-50 p-3 rounded border border-green-200 text-center">
                <div className="text-xs font-semibold text-green-900">Medições Mensais</div>
                <div className="text-lg font-bold text-green-700">{paymentConditions.medicoes}%</div>
                <div className="text-xs text-green-600">{formatCurrency((calculations.precoFinal * paymentConditions.medicoes) / 100)}</div>
              </div>
            </div>
          </div>

          {/* Cronograma */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">CRONOGRAMA ESTIMADO ({cronograma.projeto + cronograma.fabricacao + cronograma.montagem} DIAS)</h3>
            <div className="flex gap-4 items-center">
              <div className="text-center flex-1">
                <div className="bg-blue-100 p-2 rounded mb-1 font-semibold text-sm">Projeto</div>
                <div className="text-gray-600 text-xs">{cronograma.projeto}d</div>
              </div>
              <div className="text-gray-400">→</div>
              <div className="text-center flex-1">
                <div className="bg-orange-100 p-2 rounded mb-1 font-semibold text-sm">Fabricação</div>
                <div className="text-gray-600 text-xs">{cronograma.fabricacao}d</div>
              </div>
              <div className="text-gray-400">→</div>
              <div className="text-center flex-1">
                <div className="bg-green-100 p-2 rounded mb-1 font-semibold text-sm">Montagem</div>
                <div className="text-gray-600 text-xs">{cronograma.montagem}d</div>
              </div>
            </div>
          </div>

          {/* Escopo */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-gray-900 mb-2 text-sm">INCLUSO:</h4>
              <p className="text-sm whitespace-pre-wrap text-gray-700">{escopo.incluso}</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-2 text-sm">NÃO INCLUSO:</h4>
              <p className="text-sm whitespace-pre-wrap text-gray-700">{escopo.naoIncluso}</p>
            </div>
          </div>

          {/* Obrigações */}
          <div>
            <h4 className="font-bold text-gray-900 mb-2">OBRIGAÇÕES DO CONTRATANTE:</h4>
            <p className="text-sm whitespace-pre-wrap text-gray-700">{cronograma.obrigacoes}</p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={onSave}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          Salvar Orçamento
        </button>
        <div className="flex flex-col items-end gap-1">
          {templateCarregado && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Modelo 2026 carregado
            </span>
          )}
          <button
            onClick={onGeneratePDF}
            disabled={gerandoDocx}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FileDown className="h-4 w-4" />
            {gerandoDocx ? 'Gerando DOCX...' : 'Gerar Proposta DOCX'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// ─── Carrega template 2026 do Supabase (entity_store) ────────────────────────
async function fetchTemplate2026() {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return null;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/entity_store?entity_type=eq.proposta_template_2026&order=id.desc&limit=1`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const rows = await res.json();
    if (rows && rows.length > 0) return rows[0].data || null;
  } catch (e) {
    console.warn('Template 2026 não carregado:', e);
  }
  return null;
}

export default function SimuladorOrcamento() {
  const { saveOrcamento } = useOrcamentos();
  const [currentStep, setCurrentStep] = useState(0);
  const [template2026, setTemplate2026] = useState(null);
  const [gerandoDocx, setGerandoDocx] = useState(false);

  // Carrega o template na montagem do componente
  useEffect(() => {
    fetchTemplate2026().then(t => {
      if (t) {
        setTemplate2026(t);
        console.log('✅ Modelo Proposta 2026 carregado do Supabase');
      }
    });
  }, []);
  const [project, setProject] = useState({
    nome: '',
    cliente: '',
    tipo: '',
    regiao: 'sudeste',
    numeroPropostas: '',
    dataEmissao: '',
    dataValidade: '',
  });
  const [unitCosts, setUnitCosts] = useState({
    estrutura: { material: 50, fabricacao: 25, pintura: 10, transporte: 15, montagem: 20 },
    cobertura: { tipo: 'galvanizada_050', material: 75, montagem: 18 },
    fechamento: { tipo: 'pir_30mm', material: 125, montagem: 15 },
    steelDeck: { material: 100, montagem: 20 },
    complementos: { calha: 25, rufos: 20, platibanda: 45 },
  });
  const [setores, setSetores] = useState([]);
  const [calculations, setCalculations] = useState({
    custoMaterial: 0,
    custoInstalacao: 0,
    margemPct: 18,
    impostosPct: 12,
    precoFinal: 0,
  });
  const [paymentConditions, setPaymentConditions] = useState({
    assinatura: 10,
    aprovacao: 5,
    medicoes: 85,
  });
  const [cronograma, setCronograma] = useState({
    projeto: 10,
    fabricacao: 30,
    montagem: 15,
    obrigacoes: 'Disponibilizar acesso ao local da obra; Fornecer ponto de energia elétrica e água; Garantir fundações conforme projeto fornecido pela Montex; Aprovar o projeto executivo em até 10 dias úteis; Efetuar os pagamentos nas datas acordadas.',
  });
  const [escopo, setEscopo] = useState({
    incluso: 'Projeto executivo de estrutura metálica; Fabricação completa em fábrica; Tratamento superficial e pintura; Transporte até a obra; Montagem completa com equipamentos; Acompanhamento técnico durante execução; Garantia de 5 anos contra defeitos de fabricação.',
    naoIncluso: 'Fundações e bases de concreto; Instalações elétricas e hidráulicas; Licenças e alvarás; Terraplenagem e preparação do terreno.',
  });

  const steps = [
    { label: 'Dados do Projeto', icon: Building2 },
    { label: 'Custos Unitários', icon: DollarSign },
    { label: 'Setores e Itens', icon: Layers },
    { label: 'BDI e Investimento', icon: TrendingUp },
    { label: 'Cronograma e Escopo', icon: Calendar },
    { label: 'Análise Interna', icon: Activity },
    { label: 'Prévia da Proposta', icon: Eye },
  ];

  // Recalculate totals whenever setores change
  useEffect(() => {
    let totalMaterial = 0;
    let totalInstalacao = 0;

    setores.forEach(setor => {
      setor.itens.forEach(item => {
        const qty = item.quantidade || 0;
        totalMaterial += qty * (item.precoMaterial || 0);
        totalInstalacao += qty * (item.precoInstalacao || 0);
      });
    });

    const margemValor = totalInstalacao * (calculations.margemPct / 100);
    const impostoValor = (totalInstalacao + margemValor) * (calculations.impostosPct / 100);
    const precoFinal = totalMaterial + totalInstalacao + margemValor + impostoValor;

    setCalculations({
      ...calculations,
      custoMaterial: totalMaterial,
      custoInstalacao: totalInstalacao,
      precoFinal: precoFinal,
    });
  }, [setores]);

  const handleSaveOrcamento = () => {
    if (!project.nome || !project.cliente) {
      toast.error('Preencha os dados do projeto primeiro');
      return;
    }

    const orcamento = {
      id: Date.now(),
      ...project,
      unitCosts,
      setores,
      calculations,
      paymentConditions,
      cronograma,
      escopo,
      dataResposta: new Date().toISOString(),
    };

    saveOrcamento(orcamento);
    toast.success('Orçamento salvo com sucesso!');
  };

  const handleGenerateDOCX = async () => {
    if (!project.nome || !project.cliente) {
      toast.error('Preencha os dados do projeto (nome e cliente) antes de gerar a proposta.');
      return;
    }
    if (setores.length === 0) {
      toast.error('Adicione pelo menos um setor com itens antes de gerar a proposta.');
      return;
    }

    setGerandoDocx(true);
    try {
      const filename = await generatePropostaDOCX({
        project,
        setores,
        calculations,
        unitCosts,
        paymentConditions,
        cronograma,
        escopo,
        template: template2026,
      });
      toast.success(`✅ Proposta gerada: ${filename}`);
    } catch (err) {
      console.error('Erro ao gerar DOCX:', err);
      toast.error('Erro ao gerar proposta. Verifique os dados e tente novamente.');
    } finally {
      setGerandoDocx(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepDadosProjeto project={project} setProject={setProject} />;
      case 1:
        return <StepCustosUnitarios unitCosts={unitCosts} setUnitCosts={setUnitCosts} setores={setores} />;
      case 2:
        return <StepSetoresItens setores={setores} setSetores={setSetores} unitCosts={unitCosts} />;
      case 3:
        return <StepBDIInvestimento project={project} calculations={calculations} setCalculations={setCalculations} setores={setores} paymentConditions={paymentConditions} setPaymentConditions={setPaymentConditions} />;
      case 4:
        return <StepCronogramaEscopo cronograma={cronograma} setCronograma={setCronograma} escopo={escopo} setEscopo={setEscopo} setores={setores} />;
      case 5:
        return <StepAnaliseInterna setores={setores} calculations={calculations} unitCosts={unitCosts} />;
      case 6:
        return <StepPrevia project={project} setores={setores} calculations={calculations} unitCosts={unitCosts} paymentConditions={paymentConditions} cronograma={cronograma} escopo={escopo} onSave={handleSaveOrcamento} onGeneratePDF={handleGenerateDOCX} gerandoDocx={gerandoDocx} templateCarregado={!!template2026} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-full px-4 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Simulador de Orçamento</h1>
              <p className="text-gray-600 mt-1">Construtor de Propostas Comerciais</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Etapa {currentStep + 1} de {steps.length}</p>
              <p className="text-lg font-semibold text-gray-900">{steps[currentStep].label}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-2">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === currentStep;
              const isCompleted = idx < currentStep;

              return (
                <motion.button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg'
                      : isCompleted
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm hidden md:inline">{step.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0 z-40">
        <div className="max-w-full px-4 lg:px-8 py-4 flex justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <button
            onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
            disabled={currentStep === steps.length - 1}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
