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
import { useOrcamentos, useLancamentos, useMedicoes, useObras } from '../contexts/ERPContext';
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
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

// Step 7: Análise Interna - Comparativo Simulação vs Realidade
const StepAnaliseInterna = ({ setores, calculations, unitCosts }) => {
  // Dados reais do financeiro
  const { lancamentosDespesas } = useLancamentos();
  const { medicoes } = useMedicoes();
  const { obras } = useObras();

  // === DADOS DA SIMULAÇÃO (orçamento em construção) ===
  const simulacao = useMemo(() => {
    let pesoTotalSim = 0;
    let custoMaterialSim = 0;
    let custoInstalacaoSim = 0;
    let areaTotal = 0;

    (setores || []).forEach(s => {
      const gruposPorBase = {};
      (s.itens || []).forEach(item => {
        const qty = item.quantidade || 0;
        custoMaterialSim += qty * (item.precoMaterial || 0);
        custoInstalacaoSim += qty * (item.precoInstalacao || 0);
        if (item.unidade === 'KG') {
          const base = (item.descricao || '').split(' - ')[0].trim() || 'item';
          if (!gruposPorBase[base] || qty > gruposPorBase[base]) gruposPorBase[base] = qty;
        }
        if (item.unidade === 'M2') areaTotal += qty;
      });
      pesoTotalSim += Object.values(gruposPorBase).reduce((a, b) => a + b, 0);
    });

    const custoTotalSim = custoMaterialSim + custoInstalacaoSim;
    const margemVal = custoInstalacaoSim * ((calculations.margemPct || 18) / 100);
    const impostosVal = (custoInstalacaoSim + margemVal) * ((calculations.impostosPct || 12) / 100);
    const valorProposta = custoTotalSim + margemVal + impostosVal;
    const custoKgSim = pesoTotalSim > 0 ? custoTotalSim / pesoTotalSim : 0;
    const precoVendaKg = pesoTotalSim > 0 ? valorProposta / pesoTotalSim : 0;

    return {
      pesoTotal: pesoTotalSim,
      custoMaterial: custoMaterialSim,
      custoInstalacao: custoInstalacaoSim,
      custoTotal: custoTotalSim,
      margem: margemVal,
      impostos: impostosVal,
      valorProposta,
      custoKg: custoKgSim,
      precoVendaKg,
      areaTotal,
      custoM2: areaTotal > 0 ? custoTotalSim / areaTotal : 0,
    };
  }, [setores, calculations]);

  // === DADOS REAIS DO FINANCEIRO ===
  const realidade = useMemo(() => {
    // Despesas reais lançadas
    const totalDespesas = (lancamentosDespesas || []).reduce((sum, l) => {
      const val = l.valor || l.valorTotal || l.valor_total || 0;
      return sum + Math.abs(val);
    }, 0);

    // Receitas reais (medições pagas)
    const totalReceitas = (medicoes || []).reduce((sum, m) => {
      const val = m.valorBruto || m.valor_bruto || 0;
      return sum + val;
    }, 0);

    // Peso total das obras (real produzido)
    let pesoRealProduzido = 0;
    let pesoRealTotal = 0;
    (obras || []).forEach(o => {
      const pe = o.pesoPorEtapa || {};
      pesoRealProduzido += pe.pintura || 0;
      pesoRealTotal += o.pesoTotal || o.peso_total || 0;
    });

    const custoKgReal = pesoRealProduzido > 0 ? totalDespesas / pesoRealProduzido : 0;
    const receitaKgReal = pesoRealProduzido > 0 ? totalReceitas / pesoRealProduzido : 0;

    return {
      totalDespesas,
      totalReceitas,
      resultado: totalReceitas - totalDespesas,
      pesoRealProduzido,
      pesoRealTotal,
      custoKgReal,
      receitaKgReal,
      margemReal: totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0,
      numDespesas: (lancamentosDespesas || []).length,
      numMedicoes: (medicoes || []).length,
    };
  }, [lancamentosDespesas, medicoes, obras]);

  // === METAS FINANCEIRAS DE REFERÊNCIA ===
  const metas = {
    custoKgMeta: 18.50,       // Custo máximo por kg aceitável
    margemMinima: 15,          // Margem mínima %
    precoVendaKgRef: 26.00,   // Preço venda R$/kg referência mercado
    custoM2Meta: 800,          // Custo máximo por m² referência
    prazoFabDias: 45,          // Prazo fabricação por tonelada
  };

  // === COMPARATIVO ===
  const comparativo = useMemo(() => {
    const custoKgDiff = simulacao.custoKg > 0 && realidade.custoKgReal > 0
      ? ((simulacao.custoKg - realidade.custoKgReal) / realidade.custoKgReal) * 100
      : 0;
    const margemSimulada = simulacao.valorProposta > 0
      ? ((simulacao.valorProposta - simulacao.custoTotal) / simulacao.valorProposta) * 100
      : 0;

    return {
      custoKgDiff,
      margemSimulada,
      margemVsMeta: margemSimulada - metas.margemMinima,
      precoVendaVsRef: simulacao.precoVendaKg > 0
        ? ((simulacao.precoVendaKg - metas.precoVendaKgRef) / metas.precoVendaKgRef) * 100
        : 0,
      custoVsMeta: simulacao.custoKg > 0
        ? ((simulacao.custoKg - metas.custoKgMeta) / metas.custoKgMeta) * 100
        : 0,
    };
  }, [simulacao, realidade]);

  // Dados para gráfico radar
  const radarData = [
    { subject: 'Custo/kg', simulacao: Math.min(100, (metas.custoKgMeta / Math.max(1, simulacao.custoKg)) * 100), real: Math.min(100, (metas.custoKgMeta / Math.max(1, realidade.custoKgReal)) * 100), meta: 100 },
    { subject: 'Margem', simulacao: Math.min(100, (comparativo.margemSimulada / 30) * 100), real: Math.min(100, (realidade.margemReal / 30) * 100), meta: (metas.margemMinima / 30) * 100 },
    { subject: 'R$/kg Venda', simulacao: Math.min(100, (simulacao.precoVendaKg / 35) * 100), real: Math.min(100, (realidade.receitaKgReal / 35) * 100), meta: (metas.precoVendaKgRef / 35) * 100 },
    { subject: 'Volume (t)', simulacao: Math.min(100, (simulacao.pesoTotal / 200000) * 100), real: Math.min(100, (realidade.pesoRealProduzido / 200000) * 100), meta: 50 },
    { subject: 'Receita', simulacao: Math.min(100, (simulacao.valorProposta / 6000000) * 100), real: Math.min(100, (realidade.totalReceitas / 6000000) * 100), meta: 50 },
  ];

  // Dados para gráfico barras - composição de custos
  const composicaoData = [
    { name: 'Material', simulacao: simulacao.custoMaterial, real: realidade.totalDespesas * 0.55 },
    { name: 'Instalação', simulacao: simulacao.custoInstalacao, real: realidade.totalDespesas * 0.45 },
    { name: 'Margem', simulacao: simulacao.margem, real: realidade.totalReceitas - realidade.totalDespesas > 0 ? realidade.totalReceitas - realidade.totalDespesas : 0 },
  ];

  const StatusBadge = ({ value, isGood }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {isGood ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {value}
    </span>
  );

  return (
    <div className="max-w-full px-4 lg:px-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="h-6 w-6" />
          <h2 className="text-xl font-bold">Análise Interna — Cenário Comparativo</h2>
        </div>
        <p className="text-indigo-200 text-sm">Comparação entre a simulação do orçamento, dados reais do financeiro e metas da empresa</p>
      </div>

      {/* KPIs Comparativos - 3 Colunas: Simulação | Real | Meta */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-4 bg-gray-50 border-b font-semibold text-sm">
          <div className="px-4 py-3 text-gray-600">INDICADOR</div>
          <div className="px-4 py-3 text-blue-600 text-center">SIMULAÇÃO</div>
          <div className="px-4 py-3 text-emerald-600 text-center">REAL (FINANCEIRO)</div>
          <div className="px-4 py-3 text-purple-600 text-center">META / REF.</div>
        </div>
        {[
          {
            label: 'Custo por KG',
            sim: formatCurrency(simulacao.custoKg),
            real: formatCurrency(realidade.custoKgReal),
            meta: formatCurrency(metas.custoKgMeta),
            simGood: simulacao.custoKg <= metas.custoKgMeta,
            realGood: realidade.custoKgReal <= metas.custoKgMeta,
          },
          {
            label: 'Preço Venda / KG',
            sim: formatCurrency(simulacao.precoVendaKg),
            real: formatCurrency(realidade.receitaKgReal),
            meta: formatCurrency(metas.precoVendaKgRef),
            simGood: simulacao.precoVendaKg >= metas.precoVendaKgRef,
            realGood: realidade.receitaKgReal >= metas.precoVendaKgRef,
          },
          {
            label: 'Margem (%)',
            sim: `${comparativo.margemSimulada.toFixed(1)}%`,
            real: `${realidade.margemReal.toFixed(1)}%`,
            meta: `${metas.margemMinima}% mín.`,
            simGood: comparativo.margemSimulada >= metas.margemMinima,
            realGood: realidade.margemReal >= metas.margemMinima,
          },
          {
            label: 'Peso Total',
            sim: `${formatNumber(simulacao.pesoTotal)} kg`,
            real: `${formatNumber(realidade.pesoRealProduzido)} kg`,
            meta: '-',
            simGood: true,
            realGood: true,
          },
          {
            label: 'Custo Total',
            sim: formatCurrency(simulacao.custoTotal),
            real: formatCurrency(realidade.totalDespesas),
            meta: '-',
            simGood: true,
            realGood: true,
          },
          {
            label: 'Receita / Valor Proposta',
            sim: formatCurrency(simulacao.valorProposta),
            real: formatCurrency(realidade.totalReceitas),
            meta: '-',
            simGood: true,
            realGood: realidade.totalReceitas > realidade.totalDespesas,
          },
          {
            label: 'Resultado',
            sim: formatCurrency(simulacao.valorProposta - simulacao.custoTotal),
            real: formatCurrency(realidade.resultado),
            meta: '> 0',
            simGood: (simulacao.valorProposta - simulacao.custoTotal) > 0,
            realGood: realidade.resultado > 0,
          },
        ].map((row, idx) => (
          <div key={idx} className={`grid grid-cols-4 border-b last:border-b-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
            <div className="px-4 py-3 text-sm font-medium text-gray-800 flex items-center">{row.label}</div>
            <div className="px-4 py-3 text-sm text-center">
              <span className="font-semibold text-gray-900">{row.sim}</span>
              <div className="mt-0.5"><StatusBadge value={row.simGood ? 'OK' : 'Atenção'} isGood={row.simGood} /></div>
            </div>
            <div className="px-4 py-3 text-sm text-center">
              <span className="font-semibold text-gray-900">{row.real}</span>
              <div className="mt-0.5"><StatusBadge value={row.realGood ? 'OK' : 'Atenção'} isGood={row.realGood} /></div>
            </div>
            <div className="px-4 py-3 text-sm text-center font-medium text-purple-700">{row.meta}</div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Comparativo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Gauge className="h-5 w-5 text-indigo-600" />
            Radar Comparativo
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Simulação" dataKey="simulacao" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              <Radar name="Real" dataKey="real" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Meta" dataKey="meta" stroke="#8b5cf6" fill="none" strokeWidth={2} strokeDasharray="5 5" />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Composição de Custos - Barras */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            Composição: Simulação vs Real
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={composicaoData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar name="Simulação" dataKey="simulacao" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar name="Real" dataKey="real" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cards de Alertas e Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Peso × Custo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-gray-800">Peso × Custo</h4>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Custo/kg simulado</span>
              <span className="font-bold">{formatCurrency(simulacao.custoKg)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Custo/kg real</span>
              <span className="font-bold">{formatCurrency(realidade.custoKgReal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Diferença</span>
              <StatusBadge
                value={`${comparativo.custoKgDiff >= 0 ? '+' : ''}${comparativo.custoKgDiff.toFixed(1)}%`}
                isGood={comparativo.custoKgDiff <= 5}
              />
            </div>
            <div className="border-t pt-2 mt-2">
              <p className="text-xs text-gray-500">
                {comparativo.custoKgDiff > 10
                  ? '⚠️ Custo simulado está significativamente acima do real. Revise os preços unitários.'
                  : comparativo.custoKgDiff < -10
                  ? '✅ Custo simulado está abaixo do real — boa margem de segurança.'
                  : 'Custo simulado alinhado com a realidade financeira.'}
              </p>
            </div>
          </div>
        </div>

        {/* Metas Financeiras */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-purple-600" />
            <h4 className="font-semibold text-gray-800">Metas Financeiras</h4>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Margem simulada</span>
                <span className="font-bold">{comparativo.margemSimulada.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${comparativo.margemSimulada >= metas.margemMinima ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, (comparativo.margemSimulada / 30) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Meta mínima: {metas.margemMinima}%</p>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Preço venda/kg vs ref.</span>
                <StatusBadge
                  value={`${comparativo.precoVendaVsRef >= 0 ? '+' : ''}${comparativo.precoVendaVsRef.toFixed(1)}%`}
                  isGood={comparativo.precoVendaVsRef >= -5}
                />
              </div>
            </div>
            <div className="border-t pt-2 mt-2">
              <p className="text-xs text-gray-500">
                {comparativo.margemSimulada < metas.margemMinima
                  ? `⚠️ Margem de ${comparativo.margemSimulada.toFixed(1)}% está abaixo da meta de ${metas.margemMinima}%. Aumente preço ou reduza custos.`
                  : `✅ Margem saudável de ${comparativo.margemSimulada.toFixed(1)}%. Acima da meta mínima.`}
              </p>
            </div>
          </div>
        </div>

        {/* Cenário Geral */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-emerald-600" />
            <h4 className="font-semibold text-gray-800">Cenário Geral</h4>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Despesas lançadas</span>
              <span className="font-bold">{realidade.numDespesas} registros</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Medições realizadas</span>
              <span className="font-bold">{realidade.numMedicoes} medições</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Peso real produzido</span>
              <span className="font-bold">{formatNumber(realidade.pesoRealProduzido / 1000)} ton</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Resultado real</span>
              <span className={`font-bold ${realidade.resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(realidade.resultado)}
              </span>
            </div>
            <div className="border-t pt-2 mt-2">
              <p className="text-xs text-gray-500">
                {realidade.resultado >= 0
                  ? `✅ Operação lucrativa. Receitas cobrem despesas com folga de ${formatCurrency(realidade.resultado)}.`
                  : `⚠️ Operação no vermelho. Deficit de ${formatCurrency(Math.abs(realidade.resultado))}.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela Detalhada - Custo por Etapa */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600" />
          Detalhamento por Setor — Simulação
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-2 text-left font-semibold text-gray-600">Setor</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Peso (kg)</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Material</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Instalação</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">Total</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-600">R$/kg</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {(setores || []).map((setor, idx) => {
                const gruposPorBase = {};
                let matSetor = 0, instSetor = 0;
                (setor.itens || []).forEach(item => {
                  const qty = item.quantidade || 0;
                  matSetor += qty * (item.precoMaterial || 0);
                  instSetor += qty * (item.precoInstalacao || 0);
                  if (item.unidade === 'KG') {
                    const base = (item.descricao || '').split(' - ')[0].trim() || 'item';
                    if (!gruposPorBase[base] || qty > gruposPorBase[base]) gruposPorBase[base] = qty;
                  }
                });
                const pesoSetor = Object.values(gruposPorBase).reduce((a, b) => a + b, 0);
                const totalSetor = matSetor + instSetor;
                const custoKgSetor = pesoSetor > 0 ? totalSetor / pesoSetor : 0;
                const isOk = custoKgSetor <= metas.custoKgMeta || custoKgSetor === 0;

                return (
                  <tr key={idx} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-800">{setor.nome}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{formatNumber(pesoSetor)}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(matSetor)}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(instSetor)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-800">{formatCurrency(totalSetor)}</td>
                    <td className="px-4 py-2 text-right font-mono text-gray-600">{formatCurrency(custoKgSetor)}</td>
                    <td className="px-4 py-2 text-center">
                      <StatusBadge value={isOk ? 'OK' : 'Alto'} isGood={isOk} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Step 6: Prévia da Proposta
const StepPrevia = ({ project, setores, calculations, unitCosts, paymentConditions, cronograma, escopo, onSave, onGeneratePDF }) => {
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
        <button
          onClick={onGeneratePDF}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Gerar Proposta PDF
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SimuladorOrcamento() {
  const { saveOrcamento } = useOrcamentos();
  const [currentStep, setCurrentStep] = useState(0);
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

  const handleGeneratePDF = () => {
    toast.success('Funcionalidade de gerar PDF será implementada em breve!');
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
        return <StepPrevia project={project} setores={setores} calculations={calculations} unitCosts={unitCosts} paymentConditions={paymentConditions} cronograma={cronograma} escopo={escopo} onSave={handleSaveOrcamento} onGeneratePDF={handleGeneratePDF} />;
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
