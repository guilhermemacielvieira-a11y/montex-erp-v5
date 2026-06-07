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
  Factory,
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
import { useFinancialIntelligence } from '../hooks/useFinancialIntelligence';
import { openPropostaHTML, generatePropostaPDF, generatePropostaDOCX } from '../utils/propostaPDFGenerator';
import { useNavigate } from 'react-router-dom';
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
        <div className="bg-slate-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Dados do Projeto
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Número da Proposta</label>
              <input
                type="text"
                value={project.numeroPropostas || ''}
                onChange={(e) => setProject({ ...project, numeroPropostas: e.target.value })}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Autogenerado"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Data de Emissão</label>
                <input
                  type="date"
                  value={project.dataEmissao || ''}
                  onChange={(e) => setProject({ ...project, dataEmissao: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Data de Validade</label>
                <input
                  type="date"
                  value={project.dataValidade || ''}
                  onChange={(e) => setProject({ ...project, dataValidade: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Projeto *</label>
              <input
                type="text"
                value={project.nome}
                onChange={(e) => setProject({ ...project, nome: e.target.value })}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Galpão Industrial XYZ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Cliente *</label>
              <input
                type="text"
                value={project.cliente}
                onChange={(e) => setProject({ ...project, cliente: e.target.value })}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: Empresa ABC Ltda"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Tipo de Estrutura</label>
              <select
                value={project.tipo}
                onChange={(e) => setProject({ ...project, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                {Object.entries(TIPOS_ESTRUTURA).map(([key, value]) => (
                  <option key={key} value={key}>{value.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Região</label>
              <select
                value={project.regiao}
                onChange={(e) => setProject({ ...project, regiao: e.target.value })}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-500/30">
          <h3 className="text-lg font-semibold mb-4 text-blue-200 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Dicas
          </h3>
          <ul className="space-y-2 text-sm text-blue-300">
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
          const desc = (item.descricao || '').toLowerCase();
          // Não contar itens de projeto no peso (custo intelectual, não peso físico)
          if (desc.includes('projeto')) return;
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
        <div className="bg-slate-800 rounded-lg shadow p-6 border-l-4 border-l-blue-600">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            Estrutura Metálica
          </h3>
          <div className="space-y-3 text-sm">
            {estruturaKg > 0 && (
              <div className="bg-blue-500/10 p-2 rounded text-blue-300 font-medium">
                Total: {formatNumber(estruturaKg)} kg
              </div>
            )}
            <div>
              <label className="block font-medium text-slate-300 mb-1">Material (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.estrutura.material}
                onChange={(e) => updateCost('estrutura', 'material', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Fabricação (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.estrutura.fabricacao}
                onChange={(e) => updateCost('estrutura', 'fabricacao', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Pintura (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.estrutura.pintura}
                onChange={(e) => updateCost('estrutura', 'pintura', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Transporte (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.estrutura.transporte}
                onChange={(e) => updateCost('estrutura', 'transporte', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Montagem (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.estrutura.montagem}
                onChange={(e) => updateCost('estrutura', 'montagem', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Projeto (R$/kg)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.estrutura.projeto || 0.50}
                onChange={(e) => updateCost('estrutura', 'projeto', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">Classificado como instalação — peso não duplicado</p>
            </div>
          </div>
        </div>

        {/* Cobertura - Telha */}
        <div className="bg-slate-800 rounded-lg shadow p-6 border-l-4 border-l-orange-600">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            Cobertura - Telha
          </h3>
          <div className="space-y-3 text-sm">
            {coberturaM2 > 0 && (
              <div className="bg-orange-500/10 p-2 rounded text-orange-300 font-medium">
                Total: {formatNumber(coberturaM2)} m²
              </div>
            )}
            <div>
              <label className="block font-medium text-slate-300 mb-1">Tipo</label>
              <select
                value={unitCosts.cobertura.tipo}
                onChange={(e) => updateCoverageType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="galvanizada_050">Galvanizada 0.50mm</option>
                <option value="galvanizada_043">Galvanizada 0.43mm</option>
                <option value="sanduiche_pir_30">Sanduíche PIR 30mm</option>
                <option value="steeldeck_mf75">Steel Deck MF75</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Material (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.cobertura.material}
                onChange={(e) => updateCost('cobertura', 'material', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Montagem (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.cobertura.montagem}
                onChange={(e) => updateCost('cobertura', 'montagem', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Fechamento */}
        <div className="bg-slate-800 rounded-lg shadow p-6 border-l-4 border-l-red-600">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Fechamento
          </h3>
          <div className="space-y-3 text-sm">
            {fechamentoM2 > 0 && (
              <div className="bg-red-500/10 p-2 rounded text-red-300 font-medium">
                Total: {formatNumber(fechamentoM2)} m²
              </div>
            )}
            <div>
              <label className="block font-medium text-slate-300 mb-1">Tipo</label>
              <select
                value={unitCosts.fechamento.tipo}
                onChange={(e) => updateClosureType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-red-500"
              >
                <option value="pir_30mm">PIR 30mm</option>
                <option value="thermcold_70">Thermcold 70mm</option>
                <option value="galvanizado">Galvanizado</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Material (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.fechamento.material}
                onChange={(e) => updateCost('fechamento', 'material', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Montagem (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.fechamento.montagem}
                onChange={(e) => updateCost('fechamento', 'montagem', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        {/* Steel Deck */}
        <div className="bg-slate-800 rounded-lg shadow p-6 border-l-4 border-l-purple-600">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-600" />
            Steel Deck
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Material (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.steelDeck.material}
                onChange={(e) => updateCost('steelDeck', 'material', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Montagem (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.steelDeck.montagem}
                onChange={(e) => updateCost('steelDeck', 'montagem', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Complementos */}
        <div className="bg-slate-800 rounded-lg shadow p-6 border-l-4 border-l-green-600 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Complementos
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Calha (R$/ml)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.complementos.calha}
                onChange={(e) => updateCost('complementos', 'calha', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Rufos (R$/ml)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.complementos.rufos}
                onChange={(e) => updateCost('complementos', 'rufos', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Platibanda (R$/m²)</label>
              <input
                type="number"
                step="0.01"
                value={unitCosts.complementos.platibanda}
                onChange={(e) => updateCost('complementos', 'platibanda', e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500"
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
  { categoria: 'Estrutura Metálica', descricao: 'Estrutura Metálica - Projeto', unidade: 'KG', precoMaterial: 0, precoInstalacao: unitCosts.estrutura.projeto || 0.50, color: 'blue' },
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
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-300', badge: 'bg-blue-500/15 text-blue-300' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-300', badge: 'bg-orange-500/15 text-orange-300' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-300', badge: 'bg-red-500/15 text-red-300' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-300', badge: 'bg-purple-500/15 text-purple-300' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-300', badge: 'bg-green-500/15 text-green-300' },
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
      className="bg-slate-800 rounded-lg shadow-lg p-6 border-t-4 border-blue-600"
    >
      <div className="flex justify-between items-start mb-4">
        {editingTitle ? (
          <div className="flex gap-2 flex-1">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            <h3 className="text-lg font-bold text-white">{setor.nome}</h3>
            <button
              onClick={() => setEditingTitle(true)}
              className="p-1 text-slate-400 hover:text-blue-600"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </div>
        )}
        <button
          onClick={() => onDelete(index)}
          className="p-2 text-red-600 hover:bg-red-500/10 rounded-lg"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {setor.itens.length > 0 ? (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead className="bg-slate-800 border-b">
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
                <tr key={idx} className="border-b hover:bg-slate-900">
                  <td className="p-2">
                    <span className="font-medium">{item.descricao}</span>
                    {item.categoria && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{item.categoria}</span>
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
                        className="cursor-pointer hover:bg-blue-500/10 px-2 py-1 rounded"
                        onClick={() => setEditingItemIdx(idx)}
                      >
                        {formatNumber(item.quantidade)}
                      </span>
                    )}
                  </td>
                  <td className="text-center p-2 text-slate-400">{item.unidade}</td>
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
                        className="cursor-pointer hover:bg-blue-500/10 px-2 py-1 rounded"
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
                        className="cursor-pointer hover:bg-blue-500/10 px-2 py-1 rounded"
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
                        className="p-1 text-green-600 hover:bg-green-500/10 rounded"
                        title="Confirmar"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingItemIdx(idx)}
                        className="p-1 text-blue-600 hover:bg-blue-500/10 rounded"
                        title="Editar"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 text-red-600 hover:bg-red-500/10 rounded"
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
        <div className="text-center text-slate-400 py-4">Nenhum item adicionado</div>
      )}

      <div className="flex justify-between items-center mb-4 pt-4 border-t">
        <div className="flex gap-6">
          <span className="text-sm text-slate-400">Material: <span className="font-semibold text-white">{formatCurrency(totalMaterial)}</span></span>
          <span className="text-sm text-slate-400">Instalação: <span className="font-semibold text-white">{formatCurrency(totalInstalacao)}</span></span>
        </div>
        <div>
          <span className="font-semibold text-white">Total: </span>
          <span className="text-lg font-bold text-blue-600">{formatCurrency(total)}</span>
        </div>
      </div>

      {showItemSelector ? (
        <div className="bg-slate-900 p-4 rounded-lg space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-slate-100 text-sm">Selecione o item (valores do Step 2)</h4>
            <button onClick={() => setShowItemSelector(false)} className="p-1 text-slate-400 hover:text-slate-300">
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
                      <div className="font-medium text-white">{item.descricao}</div>
                      <div className="flex gap-3 mt-1 text-xs text-slate-400">
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
            className="w-full mt-2 px-3 py-2 border border-dashed border-slate-600 text-slate-400 rounded-lg hover:bg-slate-800 text-sm font-medium"
          >
            + Item Personalizado
          </button>
        </div>
      ) : showCustomForm ? (
        <div className="bg-slate-900 p-4 rounded-lg space-y-3">
          <h4 className="font-semibold text-slate-100 text-sm mb-2">Item Personalizado</h4>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Descrição"
              value={newItem.descricao}
              onChange={(e) => setNewItem({ ...newItem, descricao: e.target.value })}
              className="px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={newItem.unidade}
              onChange={(e) => setNewItem({ ...newItem, unidade: e.target.value })}
              className="px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Preço unitário"
              step="0.01"
              value={newItem.preco}
              onChange={(e) => setNewItem({ ...newItem, preco: e.target.value })}
              className="px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 border border-slate-700 rounded-lg hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowItemSelector(true)}
          className="w-full px-4 py-2 border-2 border-dashed border-blue-600 text-blue-600 rounded-lg hover:bg-blue-500/10 font-medium flex items-center justify-center gap-2"
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
        <h2 className="text-2xl font-bold text-white">Setores e Itens</h2>
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
        <div className="bg-slate-800 rounded-lg shadow p-6">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Nome do setor (ex: SUPERMERCADO, COBERTURA, FECHAMENTO)"
              value={newSetorName}
              onChange={(e) => setNewSetorName(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddSetor}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Criar
            </button>
            <button
              onClick={() => setShowNewSetor(false)}
              className="px-4 py-2 border border-slate-700 rounded-lg hover:bg-slate-800"
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
        <div className="bg-blue-500/10 border-l-4 border-blue-600 p-4 rounded">
          <p className="text-blue-200">Nenhum setor criado. Crie um para começar a adicionar itens.</p>
        </div>
      )}
    </div>
  );
};

// Step 4: BDI e Investimento
const StepBDIInvestimento = ({ project, calculations, setCalculations, setores, paymentConditions, setPaymentConditions }) => {
  const margemPct = calculations.margemPct || 18;
  const impostosPct = calculations.impostosPct || 12;

  const handleMargemChange = (value) => {
    const newMargem = parseFloat(value) || 0;
    setCalculations(prev => ({ ...prev, margemPct: newMargem }));
  };

  const handleImpostosChange = (value) => {
    const newImpostos = parseFloat(value) || 0;
    setCalculations(prev => ({ ...prev, impostosPct: newImpostos }));
  };

  // Calculate composition values dynamically
  const custoMaterial = calculations.custoMaterial || 0;
  const custoInstalacao = calculations.custoInstalacao || 0;
  const margemValor = custoInstalacao * (margemPct / 100);
  const impostosValor = (custoInstalacao + margemValor) * (impostosPct / 100);
  const valorTotal = custoMaterial + custoInstalacao + margemValor + impostosValor;

  return (
    <div className="max-w-full px-4 lg:px-8 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BDI Configuration */}
        <div className="bg-slate-800 rounded-lg shadow p-6 border-l-4 border-l-blue-600">
          <h3 className="text-lg font-semibold mb-4">Margem e Impostos</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Margem de Lucro (%)</label>
              <input
                type="number"
                step="0.5"
                value={margemPct}
                onChange={(e) => handleMargemChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">Sugeridos: Mínima 12%, Padrão 18%, Alta 25%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Impostos (%)</label>
              <input
                type="number"
                step="0.5"
                value={impostosPct}
                onChange={(e) => handleImpostosChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-slate-400 mt-1">Padrão: ~12% (ISS, PIS, COFINS)</p>
            </div>
          </div>
        </div>

        {/* Composição do Investimento */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow p-6 border border-green-500/30">
          <h3 className="text-lg font-semibold mb-4 text-green-200">Composição do Investimento</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-300">Material (s/ margem):</span>
              <span className="font-semibold">{formatCurrency(custoMaterial)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Instalação (Fab/Pint/Transp/Mont):</span>
              <span className="font-semibold">{formatCurrency(custoInstalacao)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Margem (+{margemPct}%) s/ instalação:</span>
              <span className="font-semibold text-green-600">{formatCurrency(margemValor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Impostos ({impostosPct}%) s/ instalação:</span>
              <span className="font-semibold text-orange-600">{formatCurrency(impostosValor)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-base">
              <span>VALOR TOTAL:</span>
              <span className="text-green-300">{formatCurrency(valorTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Condições de Pagamento */}
      <div className="bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          Condições de Pagamento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
            <label className="block text-sm font-medium text-slate-300 mb-2">Na Assinatura (%)</label>
            <input
              type="number"
              step="1"
              value={paymentConditions.assinatura}
              onChange={(e) => setPaymentConditions({ ...paymentConditions, assinatura: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <div className="text-sm font-semibold text-blue-200">
              {formatCurrency((valorTotal * paymentConditions.assinatura) / 100)}
            </div>
          </div>

          <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/30">
            <label className="block text-sm font-medium text-slate-300 mb-2">Aprovação do Projeto (%)</label>
            <input
              type="number"
              step="1"
              value={paymentConditions.aprovacao}
              onChange={(e) => setPaymentConditions({ ...paymentConditions, aprovacao: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500 mb-2"
            />
            <div className="text-sm font-semibold text-orange-200">
              {formatCurrency((valorTotal * paymentConditions.aprovacao) / 100)}
            </div>
          </div>

          <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
            <label className="block text-sm font-medium text-slate-300 mb-2">Medições Mensais (%)</label>
            <input
              type="number"
              step="1"
              value={paymentConditions.medicoes}
              onChange={(e) => setPaymentConditions({ ...paymentConditions, medicoes: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 mb-2"
            />
            <div className="text-sm font-semibold text-green-200">
              {formatCurrency((valorTotal * paymentConditions.medicoes) / 100)}
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-700">
          <p className="text-sm text-slate-300">
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
        const desc = (item.descricao || '').toLowerCase();
        if (desc.includes('projeto')) return;
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
      <div className="bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Cronograma Estimado
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Projeto (dias)</label>
              <input
                type="number"
                value={cronograma.projeto}
                onChange={(e) => setCronograma({ ...cronograma, projeto: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Fabricação (dias)</label>
              <input
                type="number"
                value={cronograma.fabricacao}
                onChange={(e) => setCronograma({ ...cronograma, fabricacao: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={String(diasFabricacao)}
              />
              <p className="text-xs text-slate-400 mt-1">Sugerido: {diasFabricacao} dias</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Montagem (dias)</label>
              <input
                type="number"
                value={cronograma.montagem}
                onChange={(e) => setCronograma({ ...cronograma, montagem: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="bg-blue-500/10 p-3 rounded border border-blue-500/30">
            <p className="text-sm text-blue-200">
              <strong>Prazo Total: {cronograma.projeto + cronograma.fabricacao + cronograma.montagem} dias</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Escopo de Fornecimento */}
      <div className="bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-green-600" />
          Escopo de Fornecimento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">INCLUSO</label>
            <textarea
              value={escopo.incluso}
              onChange={(e) => setEscopo({ ...escopo, incluso: e.target.value })}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-green-500 h-32 text-sm"
              placeholder="Lista de itens inclusos"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">NÃO INCLUSO</label>
            <textarea
              value={escopo.naoIncluso}
              onChange={(e) => setEscopo({ ...escopo, naoIncluso: e.target.value })}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-red-500 h-32 text-sm"
              placeholder="Lista de itens não inclusos"
            />
          </div>
        </div>
      </div>

      {/* Obrigações do Contratante */}
      <div className="bg-slate-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-600" />
          Obrigações do Contratante
        </h3>
        <textarea
          value={cronograma.obrigacoes}
          onChange={(e) => setCronograma({ ...cronograma, obrigacoes: e.target.value })}
          className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-orange-500 h-32 text-sm"
          placeholder="Lista de obrigações do contratante"
        />
      </div>
    </div>
  );
};

// KPI Card
const KPICard = ({ title, value, icon: Icon, color = 'blue', subtitle = '' }) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-600',
    green: 'bg-green-500/10 border-green-500/30 text-green-600',
    orange: 'bg-orange-500/10 border-orange-500/30 text-orange-600',
    red: 'bg-red-500/10 border-red-500/30 text-red-600',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-600',
  };

  return (
    <div className={`rounded-lg border-l-4 p-6 ${colorClasses[color]}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <Icon className="h-8 w-8 opacity-20" />
      </div>
    </div>
  );
};

// Step 7: Análise Interna — Custo Médio Mensal × Valor da Obra (Produção + Montagem)
const StepAnaliseInterna = ({ setores, calculations, unitCosts, fi, cronograma, paymentConditions }) => {
  const [abaAtiva, setAbaAtiva] = useState('visao');
  const [animado, setAnimado] = useState(false);
  const [valoresAnimados, setValoresAnimados] = useState({});
  const [mesesPagamento, setMesesPagamento] = useState(6);

  // === REFERÊNCIAS MENSAIS ===
  const META_PROD_KG  = 45000;
  const META_MONT_KG  = 25000;
  const REF_FAB_KG    = 5.50;
  const REF_PINT_KG   = 1.40;
  const REF_TRANSP_KG = 1.00;
  const REF_MONT_KG    = 3.00;

  // === DESPESA MÉDIA MENSAL DO MÓDULO FINANCEIRO ===
  const despesaMediaMensal = fi?.kpisGerais?.despesaMensalMedia || fi?.despesaMedia3Meses || 430500;

  // === CÁLCULOS DUPLOS: COM MATERIAL (abas 1-3) e SEM MATERIAL (aba Retorno) ===
  const analise = useMemo(() => {
    let pesoTotal = 0, areaTotal = 0;
    // Com material (precoMaterial + precoInstalacao) — para Visão Geral, Produção, Montagem
    let cFab = 0, cPint = 0, cTranp = 0, cMont = 0, cPrj = 0, cMat = 0;
    // Sem material (precoInstalacao only) — para Retorno × Benefício
    let sFab = 0, sPint = 0, sTranp = 0, sMont = 0, sPrj = 0;

    (setores || []).forEach(s => {
      const grupos = {};
      (s.itens || []).forEach(item => {
        const qty      = item.quantidade     || 0;
        const desc     = (item.descricao || '').toLowerCase();
        const matUnit  = item.precoMaterial  || 0;
        const instUnit = item.precoInstalacao || 0;

        // ── MATERIAL: sempre pelo campo precoMaterial, independe do nome do item ──
        // (Estrutura Metálica - Material: matUnit=8,50 instUnit=0 → só cMat)
        // (Cobertura - Material: matUnit=125,00 instUnit=20,00 → cMat+cMont)
        cMat += qty * matUnit;

        // ── SERVIÇO (mão de obra / instalação): campo precoInstalacao, classificado pelo nome ──
        const instTotal = qty * instUnit;
        if (instUnit > 0) {
          if (desc.includes('fabricaç') || desc.includes('fabricac')) {
            cFab  += instTotal; sFab  += instTotal;
          } else if (desc.includes('pintura')) {
            cPint += instTotal; sPint += instTotal;
          } else if (desc.includes('transporte')) {
            cTranp += instTotal; sTranp += instTotal;
          } else if (
            desc.includes('montagem')   || desc.includes('steel deck') ||
            desc.includes('steel-deck') || desc.includes('telha')      ||
            desc.includes('deck')       || desc.includes('cobertura')  ||
            desc.includes('estrutura')
          ) {
            cMont += instTotal; sMont += instTotal;
          } else if (desc.includes('projeto') || desc.includes('engenhari')) {
            cPrj  += instTotal; sPrj  += instTotal;
          } else {
            // serviço sem categoria clara → fabricação por default
            cFab  += instTotal; sFab  += instTotal;
          }
        }

        if (item.unidade === 'KG' && !desc.includes('projeto')) {
          const base = (item.descricao || '').split(' - ')[0].trim() || 'item';
          if (!grupos[base] || qty > grupos[base]) grupos[base] = qty;
        }
        if (item.unidade === 'M2') areaTotal += qty;
      });
      pesoTotal += Object.values(grupos).reduce((a, b) => a + b, 0);
    });

    const marg   = calculations.margemPct   || 18;
    const impost = calculations.impostosPct || 12;

    // === COM MATERIAL ===
    const custoProd    = cFab + cPint + cTranp;
    const custoTotal   = custoProd + cMont + cPrj + cMat;
    const margemValM   = custoTotal * (marg / 100);
    const impostValM   = (custoTotal + margemValM) * (impost / 100);
    const valorTotal   = custoTotal + margemValM + impostValM;

    // === SEM MATERIAL (para Retorno × Benefício) ===
    const custoProdS   = sFab + sPint + sTranp;
    const custoServicos = custoProdS + sMont + sPrj;
    const margemVal    = custoServicos * (marg / 100);
    const impostVal    = (custoServicos + margemVal) * (impost / 100);
    const valorServicos = custoServicos + margemVal + impostVal;

    // Prazo da proposta — montagem corre em paralelo com fabricação
    const diasPrj  = cronograma?.projeto    || 10;
    const diasFab  = cronograma?.fabricacao || 30;
    const DIAS_MONT_CASHFLOW = 90;  // montagem = 90 dias (parallel), não altera prazo final
    const diasMont = cronograma?.montagem   || 15;  // mantido para exibir na timeline
    const prazoTotal = diasPrj + diasFab;            // montagem corre em paralelo
    const mesesFab   = diasFab  / 30;
    const mesesMont  = DIAS_MONT_CASHFLOW / 30;      // 3 meses p/ distribuição cashflow
    const prazoMeses = prazoTotal / 30;

    // Custo mensal da obra (COM MATERIAL)
    const custoMensalProdObra = mesesFab  > 0 ? custoProd  / mesesFab  : 0;
    const custoMensalMontObra = mesesMont > 0 ? cMont      / mesesMont : 0;
    const ocProd = META_PROD_KG > 0 ? Math.min(150, (pesoTotal / (mesesFab * META_PROD_KG || 1)) * 100) : 0;
    const ocMont = META_MONT_KG > 0 ? Math.min(150, (pesoTotal / (mesesMont * META_MONT_KG || 1)) * 100) : 0;

    // R$/kg — COM MATERIAL
    const fabKg    = pesoTotal > 0 ? cFab   / pesoTotal : 0;
    const pintKg   = pesoTotal > 0 ? cPint  / pesoTotal : 0;
    const transpKg = pesoTotal > 0 ? cTranp / pesoTotal : 0;
    const montKg   = pesoTotal > 0 ? cMont  / pesoTotal : 0;
    const matKg    = pesoTotal > 0 ? cMat   / pesoTotal : 0;
    const custoKg  = pesoTotal > 0 ? custoTotal / pesoTotal : 0;
    const vendaKg  = pesoTotal > 0 ? valorTotal / pesoTotal : 0;

    // % composição (base: valorTotal COM MATERIAL)
    const pctFab    = valorTotal > 0 ? (cFab      / valorTotal) * 100 : 0;
    const pctPint   = valorTotal > 0 ? (cPint     / valorTotal) * 100 : 0;
    const pctTranp  = valorTotal > 0 ? (cTranp    / valorTotal) * 100 : 0;
    const pctMont   = valorTotal > 0 ? (cMont     / valorTotal) * 100 : 0;
    const pctPrj    = valorTotal > 0 ? (cPrj      / valorTotal) * 100 : 0;
    const pctMat    = valorTotal > 0 ? (cMat      / valorTotal) * 100 : 0;
    const pctMarg   = valorTotal > 0 ? (margemValM / valorTotal) * 100 : 0;
    const pctImp    = valorTotal > 0 ? (impostValM / valorTotal) * 100 : 0;

    // ROI sobre SERVIÇOS (sem material) — para Retorno
    const lucroBruto    = margemVal;
    const roi           = custoServicos > 0 ? (lucroBruto / custoServicos) * 100 : 0;
    const receitaDia    = prazoTotal > 0 ? valorServicos / prazoTotal : 0;
    const lucroMedioDia = prazoTotal > 0 ? lucroBruto    / prazoTotal : 0;
    const paybackDias   = receitaDia  > 0 ? custoServicos / receitaDia : 0;

    return {
      pesoTotal, areaTotal, prazoTotal, diasPrj, diasFab, diasMont, prazoMeses,
      // COM MATERIAL (tabs 1-3)
      custoFab: cFab, custoPint: cPint, custoTranp: cTranp, custoMont: cMont, custoPrj: cPrj, custoMat: cMat,
      custoProd, custoTotal, margemValM, impostValM, valorTotal,
      custoMensalProdObra, custoMensalMontObra, ocProd, ocMont, mesesFab, mesesMont,
      fabKg, pintKg, transpKg, montKg, matKg, custoKg, vendaKg,
      pctFab, pctPint, pctTranp, pctMont, pctPrj, pctMat, pctMarg, pctImp,
      // SEM MATERIAL (tab Retorno)
      custoServicos, margemVal, impostVal, valorServicos,
      lucroBruto, roi, receitaDia, lucroMedioDia, paybackDias,
    };
  }, [setores, calculations, cronograma, despesaMediaMensal]);

  // === CASHFLOW — recalcula quando mesesPagamento muda ===
  const cashflowData = useMemo(() => {
    const pctEntrada = paymentConditions?.assinatura ?? 10;
    // Entrada à Vista = % do VALOR TOTAL da proposta (precoFinal com material)
    const valEntrada = (calculations.precoFinal || analise.valorTotal || 0) * (pctEntrada / 100);
    // Saldo = mão de obra (serviços) MENOS a entrada
    const valSaldo   = Math.max(0, analise.valorServicos - valEntrada);
    const parcelaMes = mesesPagamento > 0 ? valSaldo / mesesPagamento : valSaldo;

    // Linha 0: Entrada à Vista (recebe valEntrada, mas também tem despesa mensal)
    // Linhas 1..N: Mês 1, Mês 2, ..., Mês N (cada uma recebe parcelaMes)
    const rows = [];

    // Entrada à vista
    const despEntrada = despesaMediaMensal;
    rows.push({
      mes: 'Entrada à Vista', tipo: 'entrada',
      receita: valEntrada, despesa: despEntrada,
      saldo: valEntrada - despEntrada,
      recAcum: valEntrada, despAcum: despEntrada,
      saldoAcum: valEntrada - despEntrada,
    });

    // Parcelas mensais: Mês 1, Mês 2, ...
    for (let m = 1; m <= mesesPagamento; m++) {
      const receitaMes = parcelaMes;
      const despMes    = despesaMediaMensal;
      const prev       = rows[rows.length - 1];
      const recAcum    = prev.recAcum  + receitaMes;
      const despAcum   = prev.despAcum + despMes;
      rows.push({
        mes: `Mês ${m}`, tipo: 'parcela',
        receita: receitaMes, despesa: despMes,
        saldo: receitaMes - despMes,
        recAcum, despAcum, saldoAcum: recAcum - despAcum,
      });
    }

    const totalRecebido = rows.reduce((s, r) => s + r.receita, 0);
    const valorRestante = analise.valorServicos - totalRecebido;
    return { rows, valEntrada, valSaldo, parcelaMes, pctEntrada, totalRecebido, valorRestante };
  }, [analise.valorServicos, analise.valorTotal, calculations.precoFinal, mesesPagamento, despesaMediaMensal, paymentConditions]);

  // Count-up animation
  useEffect(() => {
    setAnimado(false);
    const t = setTimeout(() => setAnimado(true), 80);
    return () => clearTimeout(t);
  }, [abaAtiva]);

  useEffect(() => {
    if (!animado) return;
    const targets = { roi: analise.roi, receitaDia: analise.receitaDia, lucroDia: analise.lucroMedioDia, payback: analise.paybackDias };
    let frame = 0; const total = 45;
    const id = setInterval(() => {
      frame++;
      const ease = 1 - Math.pow(1 - frame / total, 3);
      const cur = {};
      Object.keys(targets).forEach(k => { cur[k] = targets[k] * ease; });
      setValoresAnimados(cur);
      if (frame >= total) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [animado, analise]);

  const va = valoresAnimados;
  const fmtC = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtN = (v, d = 1) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

  // === CSS 3D BAR CHART ===
  const Bar3D = ({ data, maxVal, colors, height = 180 }) => {
    const bw = Math.floor(92 / (data.length + 1));
    return (
      <div style={{ perspective: '800px', perspectiveOrigin: '50% 40%' }} className="w-full overflow-hidden">
        <div style={{ transform: 'rotateX(20deg)', transformStyle: 'preserve-3d', height: `${height + 50}px` }}
             className="relative flex items-end justify-around px-2 pb-6">
          {data.map((d, i) => {
            const h = maxVal > 0 ? Math.max(4, (d.value / maxVal) * height) : 4;
            const col = colors[i % colors.length];
            return (
              <div key={i} className="flex flex-col items-center" style={{ width: `${bw}%` }}>
                <div style={{ fontSize: 9, color: '#6b7280', transform: 'rotateX(-20deg)', marginBottom: 2, textAlign: 'center' }}>
                  {d.topLabel || fmtC(d.value)}
                </div>
                <div style={{ position: 'relative', width: '100%', height: `${h}px` }}>
                  <div style={{ position: 'absolute', bottom: 0, left: '10%', right: '15%', height: `${h}px`, background: col,
                    borderRadius: '3px 3px 0 0', boxShadow: `inset -3px 0 6px rgba(0,0,0,0.2), 0 -1px 3px rgba(255,255,255,0.3)` }} />
                  <div style={{ position: 'absolute', top: 0, left: '10%', right: '15%', height: '8px',
                    background: col, filter: 'brightness(1.3)', transform: 'skewX(-18deg) translateX(-3px)', borderRadius: '2px 2px 0 0' }} />
                  <div style={{ position: 'absolute', bottom: 0, right: '5%', width: '12%', height: `${h}px`,
                    background: col, filter: 'brightness(0.65)', transform: 'skewY(-32deg) translateY(-4px)' }} />
                </div>
                <div style={{ fontSize: 10, color: '#374151', fontWeight: 600, transform: 'rotateX(-20deg)', marginTop: 2, textAlign: 'center' }}>
                  {d.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // === CSS 3D DONUT ===
  const Donut3D = ({ segments, size = 180 }) => {
    let acc = 0;
    const total = segments.reduce((s, d) => s + (d.value || 0), 0);
    const stops = segments.map(d => {
      const pct = total > 0 ? (d.value / total) * 100 : 0;
      const stop = `${d.color} ${acc.toFixed(1)}% ${(acc + pct).toFixed(1)}%`;
      acc += pct;
      return stop;
    }).join(', ');
    return (
      <div className="flex flex-col items-center">
        <div style={{ position: 'relative', width: size, height: size * 0.52 }}>
          <div style={{ position: 'absolute', bottom: -3, left: '10%', width: '80%', height: 16,
            background: 'rgba(0,0,0,0.12)', borderRadius: '50%', filter: 'blur(5px)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: size, height: size * 0.42,
            borderRadius: '50%', background: `conic-gradient(${stops})`, filter: 'brightness(0.62)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, width: size, height: size * 0.42,
            borderRadius: '50%', background: `conic-gradient(${stops})`,
            boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.25), 0 2px 6px rgba(0,0,0,0.18)' }}>
            <div style={{ position: 'absolute', top: '15%', left: '15%', width: '70%', height: '70%',
              borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#1e3a5f' }}>TOTAL</span>
              <span style={{ fontSize: 9, color: '#6b7280' }}>{fmtC(total)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 mt-2">
          {segments.filter(d => d.value > 0).map((d, i) => (
            <div key={i} className="flex items-center gap-1">
              <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: '#374151' }}>{d.label}: {total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Donut COM MATERIAL (usado nas abas Visão Geral, Produção, Montagem)
  const segTotal = [
    { label: 'Material',    value: analise.custoMat,   color: '#3b82f6' },
    { label: 'Fabricação',  value: analise.custoFab,   color: '#8b5cf6' },
    { label: 'Pintura',     value: analise.custoPint,  color: '#f59e0b' },
    { label: 'Transporte',  value: analise.custoTranp, color: '#06b6d4' },
    { label: 'Montagem',    value: analise.custoMont,  color: '#10b981' },
    { label: 'Projeto',     value: analise.custoPrj,   color: '#6366f1' },
    { label: 'Margem',      value: analise.margemValM, color: '#22c55e' },
    { label: 'Impostos',    value: analise.impostValM, color: '#ef4444' },
  ].filter(d => d.value > 0);
  // Donut SEM MATERIAL (usado na aba Retorno × Benefício)
  const segServicos = [
    { label: 'Fabricação',  value: analise.custoFab,   color: '#8b5cf6' },
    { label: 'Pintura',     value: analise.custoPint,  color: '#f59e0b' },
    { label: 'Transporte',  value: analise.custoTranp, color: '#06b6d4' },
    { label: 'Montagem',    value: analise.custoMont,  color: '#10b981' },
    { label: 'Projeto',     value: analise.custoPrj,   color: '#6366f1' },
    { label: 'Margem',      value: analise.margemVal,  color: '#22c55e' },
    { label: 'Impostos',    value: analise.impostVal,  color: '#ef4444' },
  ].filter(d => d.value > 0);

  const barCustosKg = [
    { label: 'Fab.',    value: analise.fabKg,    ref: REF_FAB_KG },
    { label: 'Pint.',   value: analise.pintKg,   ref: REF_PINT_KG },
    { label: 'Transp.', value: analise.transpKg, ref: REF_TRANSP_KG },
    { label: 'Mont.',   value: analise.montKg,   ref: REF_MONT_KG },
  ];
  const maxBarKg = Math.max(...barCustosKg.map(d => Math.max(d.value, d.ref)), 1);

  const tabs = [
    { id: 'visao',    label: 'Visão Geral',        icon: PieChartIcon },
    { id: 'producao', label: 'Produção',            icon: BarChart3 },
    { id: 'montagem', label: 'Montagem',            icon: Layers },
    { id: 'retorno',  label: 'Retorno × Benefício', icon: TrendingUp },
  ];

  return (
    <div className="max-w-full px-4 lg:px-8 space-y-5">

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-1">
          <Activity className="h-6 w-6" />
          <h2 className="text-xl font-bold">Análise Interna</h2>
        </div>
        <p className="text-indigo-200 text-sm">
          Prazo: <strong className="text-white">{analise.prazoTotal} dias</strong>
          &nbsp;(Projeto {analise.diasPrj}d · Fabricação {analise.diasFab}d · Montagem 90d em paralelo)
          &nbsp;·&nbsp;Peso: <strong className="text-white">{fmtN(analise.pesoTotal / 1000)} ton</strong>
          &nbsp;·&nbsp;Despesa média/mês: <strong className="text-amber-300">{fmtC(despesaMediaMensal)}</strong>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setAbaAtiva(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                abaAtiva === t.id ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-indigo-300 hover:text-indigo-600'
              }`}>
              <Icon className="h-4 w-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* ══ VISÃO GERAL ══ */}
      {abaAtiva === 'visao' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Valor Total Proposta',  val: fmtC(analise.valorTotal),   sub: 'Material + Serviços + Margem', cor: 'from-indigo-500 to-purple-700', icon: DollarSign },
              { label: 'Custo Total',           val: fmtC(analise.custoTotal),   sub: 'Material + execução completa', cor: 'from-blue-500 to-blue-700',    icon: Settings },
              { label: 'Margem Bruta',          val: fmtC(analise.margemValM),   sub: `${fmtN(analise.pctMarg)}% sobre custo total`, cor: analise.pctMarg >= 15 ? 'from-emerald-500 to-green-700' : 'from-red-500 to-red-700', icon: TrendingUp },
              { label: 'Preço Venda / kg',      val: fmtC(analise.vendaKg),      sub: `Custo ${fmtC(analise.custoKg)}/kg c/ material`, cor: 'from-amber-500 to-orange-700', icon: Weight },
            ].map((k, i) => (
              <div key={i} className={`bg-gradient-to-br ${k.cor} rounded-xl p-4 text-white shadow-lg`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-white/70 font-medium">{k.label}</p>
                  <k.icon className="h-4 w-4 text-white/40" />
                </div>
                <p className="text-xl font-bold">{k.val}</p>
                <p className="text-xs text-white/60 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800 rounded-2xl border border-slate-800 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                Composição do Valor Total (c/ material)
              </h3>
              <Donut3D segments={segTotal} size={200} />
            </div>
            <div className="bg-slate-800 rounded-2xl border border-slate-800 shadow-sm p-6">
              <h3 className="text-sm font-bold text-slate-100 mb-3">Detalhamento % — Base Valor Total (c/ material)</h3>
              <div className="space-y-2">
                {[
                  { nome: 'Material',    val: analise.custoMat,   pct: analise.pctMat,  cor: '#3b82f6', kgv: analise.matKg },
                  { nome: 'Fabricação',  val: analise.custoFab,   pct: analise.pctFab,  cor: '#8b5cf6', kgv: analise.fabKg },
                  { nome: 'Pintura',     val: analise.custoPint,  pct: analise.pctPint, cor: '#f59e0b', kgv: analise.pintKg },
                  { nome: 'Transporte',  val: analise.custoTranp, pct: analise.pctTranp,cor: '#06b6d4', kgv: analise.transpKg },
                  { nome: 'Montagem',    val: analise.custoMont,  pct: analise.pctMont, cor: '#10b981', kgv: analise.montKg },
                  { nome: 'Margem',      val: analise.margemValM, pct: analise.pctMarg, cor: '#22c55e', kgv: null },
                  { nome: 'Impostos',    val: analise.impostValM, pct: analise.pctImp,  cor: '#ef4444', kgv: null },
                ].filter(r => r.val > 0).map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: r.cor, flexShrink: 0 }} />
                    <span className="text-xs text-slate-400 w-20 flex-shrink-0">{r.nome}</span>
                    <div className="flex-1 bg-slate-800 rounded-full h-2">
                      <div style={{ width: `${Math.min(100, r.pct)}%`, background: r.cor }} className="h-2 rounded-full transition-all duration-700" />
                    </div>
                    <span className="text-xs font-bold text-indigo-300 w-9 text-right">{fmtN(r.pct)}%</span>
                    <span className="text-xs text-slate-500 w-20 text-right">{fmtC(r.val)}</span>
                    <span className="text-xs text-slate-500 w-16 text-right">{r.kgv != null ? fmtC(r.kgv)+'/kg' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ PRODUÇÃO ══ */}
      {abaAtiva === 'producao' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Custo Produção Total', val: fmtC(analise.custoProd),            sub: `Fab + Pint + Transp`,                 cor: 'from-purple-500 to-purple-700' },
              { label: 'Custo/mês (Produção)', val: fmtC(analise.custoMensalProdObra),  sub: `${analise.diasFab}d = ${fmtN(analise.mesesFab)} mês`, cor: 'from-violet-500 to-indigo-700' },
              { label: 'Ocupação Capacidade',  val: `${fmtN(analise.ocProd)}%`,          sub: `Ref. ${(META_PROD_KG/1000).toFixed(0)} ton/mês`, cor: analise.ocProd > 100 ? 'from-red-500 to-red-700' : analise.ocProd > 70 ? 'from-amber-500 to-amber-700' : 'from-sky-500 to-sky-700' },
              { label: 'Custo / kg (Prod.)',   val: fmtC(analise.fabKg + analise.pintKg + analise.transpKg), sub: `Ref. ${fmtC(REF_FAB_KG + REF_PINT_KG + REF_TRANSP_KG)}/kg`, cor: 'from-emerald-500 to-green-700' },
            ].map((k, i) => (
              <div key={i} className={`bg-gradient-to-br ${k.cor} rounded-xl p-4 text-white shadow-lg`}>
                <p className="text-xs text-white/70 font-medium mb-1">{k.label}</p>
                <p className="text-xl font-bold">{k.val}</p>
                <p className="text-xs text-white/60 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-800 rounded-2xl border border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-100 mb-5">R$/kg — Simulado vs Referência Montex · {analise.diasFab} dias fabricação</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-center text-indigo-600 font-semibold mb-2">SIMULADO</p>
                <Bar3D data={barCustosKg.map(d => ({ label: d.label, value: d.value }))} maxVal={maxBarKg} colors={['#8b5cf6','#f59e0b','#06b6d4','#10b981']} height={170} />
              </div>
              <div>
                <p className="text-xs text-center text-slate-500 font-semibold mb-2">REFERÊNCIA</p>
                <Bar3D data={barCustosKg.map(d => ({ label: d.label, value: d.ref }))} maxVal={maxBarKg} colors={['#ddd6fe','#fde68a','#cffafe','#d1fae5']} height={170} />
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-2xl border border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-100 mb-4">Ocupação da Capacidade de Produção ({analise.diasFab} dias)</h3>
            <div className="space-y-5">
              {[
                { nome: 'Fabricação',  val: analise.custoFab,   ref: META_PROD_KG * REF_FAB_KG    * analise.mesesFab, cor: 'bg-purple-500', corT: 'text-purple-300' },
                { nome: 'Pintura',     val: analise.custoPint,  ref: META_PROD_KG * REF_PINT_KG   * analise.mesesFab, cor: 'bg-amber-500',  corT: 'text-amber-300' },
                { nome: 'Transporte',  val: analise.custoTranp, ref: META_PROD_KG * REF_TRANSP_KG * analise.mesesFab, cor: 'bg-cyan-500',   corT: 'text-cyan-300'  },
              ].map((r, i) => {
                const pct = r.ref > 0 ? Math.min(140, (r.val / r.ref) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-slate-300">{r.nome}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${r.corT}`}>{fmtC(r.val)}</span>
                        <span className="text-slate-500 text-xs">/ {fmtC(r.ref)} ref.</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct <= 115 ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                      <div className={`h-3 rounded-full ${r.cor}`} style={{ width: `${Math.min(100, pct)}%`, transition: 'width 0.7s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ MONTAGEM ══ */}
      {abaAtiva === 'montagem' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Custo Montagem Total', val: fmtC(analise.custoMont),           sub: 'Montagem em campo',                  cor: 'from-emerald-500 to-teal-700' },
              { label: 'Custo/mês (Montagem)', val: fmtC(analise.custoMensalMontObra), sub: `${analise.diasMont}d = ${fmtN(analise.mesesMont)} mês`, cor: 'from-teal-500 to-cyan-700' },
              { label: 'Ocupação Montagem',    val: `${fmtN(analise.ocMont)}%`,         sub: `Ref. ${(META_MONT_KG/1000).toFixed(0)} ton/mês`, cor: analise.ocMont > 100 ? 'from-red-500 to-red-700' : 'from-green-500 to-green-700' },
              { label: 'Montagem / kg',        val: fmtC(analise.montKg),              sub: `Ref. ${fmtC(REF_MONT_KG)}/kg`,        cor: 'from-sky-500 to-blue-700' },
            ].map((k, i) => (
              <div key={i} className={`bg-gradient-to-br ${k.cor} rounded-xl p-4 text-white shadow-lg`}>
                <p className="text-xs text-white/70 font-medium mb-1">{k.label}</p>
                <p className="text-xl font-bold">{k.val}</p>
                <p className="text-xs text-white/60 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-800 rounded-2xl border border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-100 mb-4">Timeline da Proposta — {analise.prazoTotal} dias (montagem em paralelo)</h3>
            {/* Linha 1: Projeto + Fabricação */}
            <div className="mb-1">
              <p className="text-xs text-slate-500 mb-1">Linha fabril (prazo contratual)</p>
              <div className="w-full h-9 rounded-xl overflow-hidden flex shadow-inner">
                {[
                  { label: `Projeto ${analise.diasPrj}d`, pct: (analise.diasPrj / analise.prazoTotal) * 100, bg: 'bg-blue-500' },
                  { label: `Fabricação ${analise.diasFab}d`, pct: (analise.diasFab / analise.prazoTotal) * 100, bg: 'bg-purple-600' },
                ].map((f, i) => (
                  <div key={i} style={{ width: `${f.pct}%` }}
                       className={`${f.bg} flex items-center justify-center text-white text-xs font-semibold text-center leading-tight border-r border-white/30 last:border-0`}>
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
            {/* Linha 2: Montagem (inicia durante fabricação) */}
            <div className="mb-2">
              <p className="text-xs text-slate-500 mb-1">Montagem em campo (inicia c/ fabricação em andamento)</p>
              <div className="w-full h-9 rounded-xl overflow-hidden relative shadow-inner bg-slate-800">
                <div style={{ position: 'absolute', left: `${(analise.diasPrj / analise.prazoTotal) * 100}%`, width: '100%' }}
                     className="h-full bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold">
                  Montagem 90d (paralela)
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Dia 0</span><span>Dia {analise.diasPrj}</span><span>Dia {analise.prazoTotal}</span>
            </div>
          </div>
          <div className="bg-slate-800 rounded-2xl border border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-100 mb-4">Montagem: Simulado vs Referência (90 dias paralelos)</h3>
            <Bar3D
              data={[
                { label: 'Custo Mont.\nObra',      value: analise.custoMont },
                { label: `Ref.Cap.\n${fmtN(analise.mesesMont)}mês`, value: META_MONT_KG * REF_MONT_KG * analise.mesesMont },
                { label: 'Custo Total\nc/ material',  value: analise.custoTotal },
                { label: 'Valor Venda\nTotal',        value: analise.valorTotal },
              ]}
              maxVal={Math.max(analise.valorTotal, analise.custoTotal, META_MONT_KG * REF_MONT_KG * analise.mesesMont) * 1.1}
              colors={['#10b981','#d1fae5','#6366f1','#22c55e']}
              height={190}
            />
          </div>
        </div>
      )}

      {/* ══ RETORNO × BENEFÍCIO ══ */}
      {abaAtiva === 'retorno' && (
        <div className="space-y-5">

          {/* KPIs ROI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'ROI (serviços)',    val: `${fmtN(va.roi ?? analise.roi)}%`,              sub: `Lucro ${fmtC(analise.lucroBruto)} / Custo ${fmtC(analise.custoServicos)}`, cor: analise.roi >= 15 ? 'from-green-500 to-emerald-700' : 'from-red-500 to-red-700' },
              { label: 'Receita / Dia',     val: fmtC(va.receitaDia ?? analise.receitaDia),       sub: `${analise.prazoTotal} dias de contrato`, cor: 'from-blue-500 to-indigo-700' },
              { label: 'Lucro / Dia',       val: fmtC(va.lucroDia ?? analise.lucroMedioDia),      sub: `Payback em ${fmtN(va.payback ?? analise.paybackDias, 0)} dias`, cor: analise.lucroMedioDia > 0 ? 'from-emerald-500 to-green-700' : 'from-red-500 to-red-700' },
              { label: 'Despesa Méd./mês',  val: fmtC(despesaMediaMensal),                        sub: 'Base: Módulo Análise Financeira', cor: 'from-amber-500 to-orange-700' },
            ].map((k, i) => (
              <div key={i} className={`bg-gradient-to-br ${k.cor} rounded-xl p-4 text-white shadow-lg`}>
                <p className="text-xs text-white/70 font-medium mb-1">{k.label}</p>
                <p className="text-xl font-bold">{k.val}</p>
                <p className="text-xs text-white/60 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Configuração do recebimento + nota despesa */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-sm p-5">
            <div className="flex flex-wrap items-center gap-6">
              {/* Seletor de meses */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-300">Prazo de recebimento:</span>
                <div className="flex gap-1.5">
                  {[4, 5, 6, 7, 8, 9, 10, 12].map(n => (
                    <button key={n} onClick={() => setMesesPagamento(n)}
                      className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${
                        mesesPagamento === n
                          ? 'bg-indigo-600 text-white shadow-md scale-105'
                          : 'bg-slate-800 text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-300'
                      }`}>
                      {n}
                    </button>
                  ))}
                  <span className="flex items-center text-xs text-slate-500 ml-1">meses</span>
                </div>
              </div>
              {/* Resumo do plano */}
              <div className="flex items-center gap-4 text-xs text-slate-400 border-l pl-6">
                <span>Entrada <strong className="text-indigo-300">{fmtC(cashflowData.valEntrada)}</strong> ({cashflowData.pctEntrada}%) no mês 1</span>
                <span>+</span>
                <span>Saldo <strong className="text-emerald-300">{fmtC(cashflowData.valSaldo)}</strong> em {mesesPagamento}× de <strong className="text-emerald-300">{fmtC(cashflowData.parcelaMes)}</strong>/mês</span>
              </div>
            </div>
            {fi?.kpisGerais?.mesesBaseNomes && (
              <div className="mt-3 pt-3 border-t flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-slate-400">
                  Despesa média calculada com base em: <strong>{fi.kpisGerais.mesesBaseNomes.join(', ')}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Gráfico 3D Receita vs Despesa */}
          <div className="bg-slate-800 rounded-2xl border border-slate-800 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-100 mb-1">
              Receita × Despesa — {cashflowData.rows.length} meses
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Entrada {cashflowData.pctEntrada}% no mês 1 + saldo em {mesesPagamento} parcelas mensais
              &nbsp;·&nbsp;Serviços (sem material) · Despesa = {fmtC(despesaMediaMensal)}/mês
            </p>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-semibold text-green-300 text-center mb-2">ENTRADAS — Receita por Mês</p>
                <Bar3D
                  data={cashflowData.rows.map(m => ({ label: m.mes, value: m.receita, topLabel: m.receita > 0 ? fmtC(m.receita) : '—' }))}
                  maxVal={Math.max(...cashflowData.rows.map(m => Math.max(m.receita, m.despesa)), 1) * 1.15}
                  colors={Array(cashflowData.rows.length).fill(null).map((_, i) => `hsl(${142 - i * 8}, 70%, ${40 + i * 3}%)`)}
                  height={180}
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-red-600 text-center mb-2">SAÍDAS — Despesa Média/Mês</p>
                <Bar3D
                  data={cashflowData.rows.map(m => ({ label: m.mes, value: m.despesa, topLabel: fmtC(m.despesa) }))}
                  maxVal={Math.max(...cashflowData.rows.map(m => Math.max(m.receita, m.despesa)), 1) * 1.15}
                  colors={Array(cashflowData.rows.length).fill('#ef4444')}
                  height={180}
                />
              </div>
            </div>
          </div>

          {/* Tabela detalhamento mensal */}
          <div className="bg-slate-800 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b flex items-center justify-between">
              <h3 className="font-semibold text-slate-300 text-sm">
                Detalhamento — Entrada à Vista + {mesesPagamento} parcelas mensais
              </h3>
              <span className="text-xs text-indigo-600 font-semibold">
                Serviços: {fmtC(analise.valorServicos)}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-900/50">
                  <th className="px-4 py-2.5 text-left text-slate-400 font-semibold">Período</th>
                  <th className="px-4 py-2.5 text-right text-green-600 font-semibold">Receita</th>
                  <th className="px-4 py-2.5 text-right text-red-600 font-semibold">Despesa</th>
                  <th className="px-4 py-2.5 text-right text-blue-600 font-semibold">Saldo Mês</th>
                  <th className="px-4 py-2.5 text-right text-indigo-600 font-semibold">Saldo Acum.</th>
                  <th className="px-4 py-2.5 text-center text-slate-400 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {cashflowData.rows.map((row, i) => (
                  <tr key={i} className={`border-b last:border-0 ${row.tipo === 'entrada' ? 'bg-indigo-500/10/40' : 'bg-slate-800'} hover:bg-slate-900`}>
                    <td className="px-4 py-2.5 font-semibold text-slate-100">
                      <div className="flex items-center gap-1.5">
                        {row.mes}
                        {row.tipo === 'entrada'
                          ? <span className="text-xs bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded-full">{cashflowData.pctEntrada}% do total</span>
                          : <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">parcela {i}/{mesesPagamento}</span>
                        }
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-green-300 font-mono font-semibold">{fmtC(row.receita)}</td>
                    <td className="px-4 py-2.5 text-right text-red-600 font-mono">{fmtC(row.despesa)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${row.saldo >= 0 ? 'text-green-300' : 'text-red-600'}`}>
                      {row.saldo >= 0 ? '+' : ''}{fmtC(row.saldo)}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${row.saldoAcum >= 0 ? 'text-indigo-300' : 'text-red-300'}`}>
                      {row.saldoAcum >= 0 ? '+' : ''}{fmtC(row.saldoAcum)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${row.saldo >= 0 ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>
                        {row.saldo >= 0 ? '✅' : '⚠️'}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-indigo-500/10 font-bold border-t-2 border-indigo-500/30">
                  <td className="px-4 py-3 text-indigo-300">TOTAL</td>
                  <td className="px-4 py-3 text-right text-green-300 font-mono">{fmtC(cashflowData.rows.reduce((s, r) => s + r.receita, 0))}</td>
                  <td className="px-4 py-3 text-right text-red-600 font-mono">{fmtC(cashflowData.rows.reduce((s, r) => s + r.despesa, 0))}</td>
                  <td className="px-4 py-3 text-right font-mono text-indigo-300" colSpan={2}>{fmtC(cashflowData.rows[cashflowData.rows.length - 1]?.saldoAcum ?? 0)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-300">ROI {fmtN(analise.roi)}%</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Valor restante */}
          {cashflowData.valorRestante > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-500/30 rounded-2xl p-4 flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-300">
                Do total de serviços <strong>{fmtC(analise.valorServicos)}</strong>,
                serão recebidos <strong>{fmtC(cashflowData.totalRecebido)}</strong> ao longo dos {mesesPagamento} meses.
                {cashflowData.valorRestante > 0 && <> Restam <strong className="text-base">{fmtC(cashflowData.valorRestante)}</strong> após o período.</>}
              </p>
            </div>
          )}

          {/* Alertas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              analise.roi < 15 && { tipo: 'warn', msg: `ROI de ${fmtN(analise.roi)}% abaixo da meta de 15%. Aumente a margem ou reduza custos.` },
              cashflowData.rows.some(m => m.saldo < 0) && { tipo: 'warn', msg: `Há meses com saldo negativo (despesa supera a entrada). Verifique antecipação de pagamentos.` },
              analise.roi >= 15 && { tipo: 'ok', msg: `ROI de ${fmtN(analise.roi)}% dentro da meta. Margem saudável para o projeto.` },
              analise.lucroMedioDia > 0 && { tipo: 'ok', msg: `Gera ${fmtC(analise.lucroMedioDia)}/dia de lucro bruto ao longo dos ${analise.prazoTotal} dias de contrato.` },
              !fi?.kpisGerais?.despesaMensalMedia && { tipo: 'warn', msg: `Despesa média usando valor de referência (${fmtC(despesaMediaMensal)}/mês). Conecte o módulo financeiro para dados reais.` },
            ].filter(Boolean).slice(0, 4).map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${a.tipo === 'ok' ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                {a.tipo === 'ok' ? <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" /> : <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />}
                <p className={`text-sm font-medium ${a.tipo === 'ok' ? 'text-green-300' : 'text-amber-300'}`}>{a.msg}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Step 6: Prévia da Proposta
const StepPrevia = ({ project, setores, calculations, unitCosts, paymentConditions, cronograma, escopo, onSave, onGeneratePDF, onGenerateHTML, onGenerateDOCX }) => {
  const totalItens = setores.reduce((sum, s) => sum + s.itens.length, 0);

  const totalPeso = setores.reduce((sum, s) => {
    const gruposPorBase = {};
    (s.itens || []).forEach(item => {
      if (item.unidade === 'KG') {
        const desc = (item.descricao || '').toLowerCase();
        if (desc.includes('projeto')) return;
        const base = (item.descricao || '').split(' - ')[0].trim() || item.descricao || 'item';
        if (!gruposPorBase[base] || (item.quantidade || 0) > gruposPorBase[base]) {
          gruposPorBase[base] = item.quantidade || 0;
        }
      }
    });
    return sum + Object.values(gruposPorBase).reduce((s, q) => s + q, 0);
  }, 0);

  const precoMedio = totalPeso > 0 ? calculations.precoFinal / totalPeso : 0;

  const totalArea = setores.reduce((sum, s) => {
    return sum + (s.itens || []).reduce((is, item) => is + ((item.unidade === 'M2') ? (item.quantidade || 0) : 0), 0);
  }, 0);
  const precoM2 = totalArea > 0 ? calculations.precoFinal / totalArea : 0;

  return (
    <div className="max-w-full px-4 lg:px-8 space-y-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Peso Total" value={formatNumber(totalPeso) + ' kg'} icon={Weight} color="blue" />
        <KPICard title="Área Total" value={formatNumber(totalArea) + ' m²'} icon={Layers} color="orange" subtitle={totalArea > 0 ? `${formatCurrency(precoM2)}/m²` : ''} />
        <KPICard title="Preço/kg" value={formatCurrency(precoMedio)} icon={TrendingUp} color="green" />
        <KPICard title="Preço/m²" value={totalArea > 0 ? formatCurrency(precoM2) : 'N/A'} icon={Target} color="red" />
        <KPICard title="Valor Total" value={formatCurrency(calculations.precoFinal)} icon={DollarSign} color="purple" />
      </div>

      {/* Proposta Preview */}
      <div className="bg-slate-800 rounded-lg shadow p-8 border-t-4 border-blue-600">
        <div className="space-y-6">
          {/* Header */}
          <div className="border-b pb-4">
            <h1 className="text-3xl font-bold text-white">PROPOSTA COMERCIAL</h1>
            <p className="text-xl text-slate-400">Nº {project.numeroPropostas}</p>
            <div className="flex gap-6 mt-2 text-sm text-slate-400">
              <span><strong>Emissão:</strong> {new Date(project.dataEmissao).toLocaleDateString('pt-BR')}</span>
              <span><strong>Validade:</strong> {new Date(project.dataValidade).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {/* Dados do Projeto */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">DADOS DO PROJETO</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Projeto:</strong> {project.nome}</div>
              <div><strong>Cliente:</strong> {project.cliente}</div>
              <div><strong>Tipo:</strong> {TIPOS_ESTRUTURA[project.tipo]?.nome || project.tipo}</div>
              <div><strong>Região:</strong> {project.regiao}</div>
            </div>
          </div>

          {/* Orçamento Detalhado */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">ORÇAMENTO DETALHADO POR SETOR ({setores.length} SETORES | {totalItens} ITENS)</h3>
            <div className="space-y-4">
              {setores.map((setor, idx) => {
                const setorMaterial    = setor.itens.reduce((sum, item) => sum + (item.quantidade * (item.precoMaterial   || 0)), 0);
                const setorInstalacao  = setor.itens.reduce((sum, item) => sum + (item.quantidade * (item.precoInstalacao || 0)), 0);
                const setorTotal       = setorMaterial + setorInstalacao;

                return (
                  <div key={idx} className="border rounded-lg p-3">
                    <h4 className="font-bold text-white mb-2">ETAPA {idx + 1} — {setor.nome}</h4>
                    <div className="overflow-x-auto mb-2">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-800">
                          <tr>
                            <th className="border p-1 text-left">DESCRIÇÃO</th>
                            <th className="border p-1 text-center">UN</th>
                            <th className="border p-1 text-center">QTD</th>
                            <th className="border p-1 text-right">MATERIAL UN.</th>
                            <th className="border p-1 text-right">INSTALAÇÃO UN.</th>
                            <th className="border p-1 text-right">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {setor.itens.map((item, iIdx) => {
                            const matUn  = item.precoMaterial   || 0;
                            const instUn = item.precoInstalacao || 0;
                            const total  = item.quantidade * (matUn + instUn);
                            return (
                              <tr key={iIdx} className={`border-b ${iIdx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-900'}`}>
                                <td className="border p-1">{item.descricao}</td>
                                <td className="border p-1 text-center">{item.unidade}</td>
                                <td className="border p-1 text-center">{formatNumber(item.quantidade)}</td>
                                <td className="border p-1 text-right text-slate-300">{matUn > 0 ? formatCurrency(matUn) : '—'}</td>
                                <td className="border p-1 text-right text-slate-300">{instUn > 0 ? formatCurrency(instUn) : '—'}</td>
                                <td className="border p-1 text-right font-semibold">{formatCurrency(total)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-800 font-bold text-xs">
                            <td className="border p-1.5" colSpan={3}>SUBTOTAL ETAPA {idx + 1}</td>
                            <td className="border p-1.5 text-right">{formatCurrency(setorMaterial)}</td>
                            <td className="border p-1.5 text-right">{formatCurrency(setorInstalacao)}</td>
                            <td className="border p-1.5 text-right">{formatCurrency(setorTotal)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumo do Orçamento */}
          <div className="bg-slate-900 p-4 rounded-lg border">
            <h3 className="text-lg font-bold text-white mb-3">RESUMO DO ORÇAMENTO</h3>
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
                <span className="text-green-300">{formatCurrency(calculations.precoFinal || 0)}</span>
              </div>
            </div>
          </div>

          {/* Condições de Pagamento */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">CONDIÇÕES DE PAGAMENTO</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-500/10 p-3 rounded border border-blue-500/30 text-center">
                <div className="text-xs font-semibold text-blue-200">Na Assinatura</div>
                <div className="text-lg font-bold text-blue-300">{paymentConditions.assinatura}%</div>
                <div className="text-xs text-blue-600">{formatCurrency((calculations.precoFinal * paymentConditions.assinatura) / 100)}</div>
              </div>
              <div className="bg-orange-500/10 p-3 rounded border border-orange-500/30 text-center">
                <div className="text-xs font-semibold text-orange-200">Aprovação Projeto</div>
                <div className="text-lg font-bold text-orange-300">{paymentConditions.aprovacao}%</div>
                <div className="text-xs text-orange-600">{formatCurrency((calculations.precoFinal * paymentConditions.aprovacao) / 100)}</div>
              </div>
              <div className="bg-green-500/10 p-3 rounded border border-green-500/30 text-center">
                <div className="text-xs font-semibold text-green-200">Medições Mensais</div>
                <div className="text-lg font-bold text-green-300">{paymentConditions.medicoes}%</div>
                <div className="text-xs text-green-600">{formatCurrency((calculations.precoFinal * paymentConditions.medicoes) / 100)}</div>
              </div>
            </div>
          </div>

          {/* Cronograma */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3">CRONOGRAMA ESTIMADO ({cronograma.projeto + cronograma.fabricacao + cronograma.montagem} DIAS)</h3>
            <div className="flex gap-4 items-center">
              <div className="text-center flex-1">
                <div className="bg-blue-500/15 p-2 rounded mb-1 font-semibold text-sm">Projeto</div>
                <div className="text-slate-400 text-xs">{cronograma.projeto}d</div>
              </div>
              <div className="text-slate-500">→</div>
              <div className="text-center flex-1">
                <div className="bg-orange-500/15 p-2 rounded mb-1 font-semibold text-sm">Fabricação</div>
                <div className="text-slate-400 text-xs">{cronograma.fabricacao}d</div>
              </div>
              <div className="text-slate-500">→</div>
              <div className="text-center flex-1">
                <div className="bg-green-500/15 p-2 rounded mb-1 font-semibold text-sm">Montagem</div>
                <div className="text-slate-400 text-xs">{cronograma.montagem}d</div>
              </div>
            </div>
          </div>

          {/* Escopo */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-white mb-2 text-sm">INCLUSO:</h4>
              <p className="text-sm whitespace-pre-wrap text-slate-300">{escopo.incluso}</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-2 text-sm">NÃO INCLUSO:</h4>
              <p className="text-sm whitespace-pre-wrap text-slate-300">{escopo.naoIncluso}</p>
            </div>
          </div>

          {/* Obrigações */}
          <div>
            <h4 className="font-bold text-white mb-2">OBRIGAÇÕES DO CONTRATANTE:</h4>
            <p className="text-sm whitespace-pre-wrap text-slate-300">{cronograma.obrigacoes}</p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3 justify-end">
        <button
          onClick={onSave}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2 shadow-md"
        >
          <Save className="h-4 w-4" />
          Salvar Orçamento
        </button>
        <button
          onClick={onGenerateHTML}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2 shadow-md"
        >
          <Eye className="h-4 w-4" />
          Visualizar HTML
        </button>
        <button
          onClick={onGeneratePDF}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-md"
        >
          <FileDown className="h-4 w-4" />
          Gerar PDF
        </button>
        <button
          onClick={onGenerateDOCX}
          className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2 shadow-md"
        >
          <File className="h-4 w-4" />
          Gerar DOCX
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// ============================================================================
// SAVED SIMULATIONS LIST
// ============================================================================

const statusLabels = {
  rascunho: { label: 'Rascunho', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  pendente: { label: 'Pendente', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  aprovado: { label: 'Aprovado', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  reprovado: { label: 'Reprovado', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

const SimulacoesList = ({ orcamentos, onNew, onLoad, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');

  const filtered = useMemo(() => {
    return (orcamentos || []).filter(orc => {
      const matchSearch = !searchTerm ||
        (orc.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (orc.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (orc.numero || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'todos' || orc.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [orcamentos, searchTerm, filterStatus]);

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Simulador de Orçamento</h1>
            <p className="text-slate-400 mt-1">Gerencie suas simulações e propostas comerciais</p>
          </div>
          <motion.button
            onClick={onNew}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/25"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus className="h-5 w-5" />
            Nova Simulação
          </motion.button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total de Simulações', value: (orcamentos || []).length, icon: FileText, color: 'blue' },
            { label: 'Rascunhos', value: (orcamentos || []).filter(o => o.status === 'rascunho').length, icon: Edit3, color: 'yellow' },
            { label: 'Aprovados', value: (orcamentos || []).filter(o => o.status === 'aprovado').length, icon: CheckCircle2, color: 'green' },
            { label: 'Valor Total', value: formatCurrency((orcamentos || []).reduce((sum, o) => sum + (o.valor_total || o.valor || 0), 0)), icon: DollarSign, color: 'purple', isText: true },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${stat.color}-100`}>
                    <Icon className={`h-5 w-5 text-${stat.color}-600`} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">{stat.label}</p>
                    <p className="text-xl font-bold text-white">{stat.isText ? stat.value : stat.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-6 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, cliente ou número..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {['todos', 'rascunho', 'pendente', 'aprovado', 'reprovado'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {status === 'todos' ? 'Todos' : (statusLabels[status]?.label || status)}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-16 text-center">
            <FileText className="h-16 w-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">
              {(orcamentos || []).length === 0 ? 'Nenhuma simulação criada' : 'Nenhum resultado encontrado'}
            </h3>
            <p className="text-slate-500 mb-6">
              {(orcamentos || []).length === 0
                ? 'Crie sua primeira simulação de orçamento para começar'
                : 'Tente alterar os filtros de busca'
              }
            </p>
            {(orcamentos || []).length === 0 && (
              <button
                onClick={onNew}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold inline-flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Criar Primeira Simulação
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((orc, idx) => {
              const st = statusLabels[orc.status] || statusLabels.rascunho;
              const valorTotal = orc.valor_total || orc.valor || 0;
              const dataCreated = orc.dataResposta || orc.created_at || orc.data_criacao;
              return (
                <motion.div
                  key={orc.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-800 rounded-xl border border-slate-700 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{orc.nome || 'Sem nome'}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text} border ${st.border}`}>
                          {st.label}
                        </span>
                        {orc.numero && (
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-xs font-mono">
                            #{orc.numero}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {orc.cliente || 'Cliente não informado'}
                        </span>
                        {orc.tipo && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {orc.tipo}
                          </span>
                        )}
                        {orc.regiao && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {orc.regiao}
                          </span>
                        )}
                        {dataCreated && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(dataCreated).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right mr-4">
                        <p className="text-xs text-slate-500">Valor Total</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(valorTotal)}</p>
                      </div>
                      <button
                        onClick={() => onLoad(orc)}
                        className="px-4 py-2 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/15 font-medium text-sm flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        Abrir
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Excluir simulação "${orc.nome}"?`)) {
                            onDelete(orc.id);
                          }
                        }}
                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SimuladorOrcamento() {
  const { orcamentos, addOrcamento, deleteOrcamento, updateOrcamento } = useOrcamentos();
  const [showList, setShowList] = useState(true);
  const [editingId, setEditingId] = useState(null);
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
    estrutura: { material: 50, fabricacao: 25, pintura: 10, transporte: 15, montagem: 20, projeto: 0.50 },
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

  const fi = useFinancialIntelligence();

  // Load saved simulation into wizard
  const handleLoadSimulation = useCallback((orc) => {
    setProject({
      nome: orc.nome || '',
      cliente: orc.cliente || '',
      tipo: orc.tipo || '',
      regiao: orc.regiao || 'sudeste',
      numeroPropostas: orc.numeroPropostas || orc.numero || '',
      dataEmissao: orc.dataEmissao || '',
      dataValidade: orc.dataValidade || orc.validade || '',
    });
    if (orc.unitCosts) setUnitCosts(orc.unitCosts);
    if (orc.setores && orc.setores.length > 0) setSetores(orc.setores);
    if (orc.calculations) setCalculations(prev => ({ ...prev, ...orc.calculations }));
    if (orc.paymentConditions) setPaymentConditions(orc.paymentConditions);
    if (orc.cronograma) setCronograma(orc.cronograma);
    if (orc.escopo) setEscopo(orc.escopo);
    setEditingId(orc.id);
    setCurrentStep(0);
    setShowList(false);
  }, []);

  // Start new simulation
  const handleNewSimulation = useCallback(() => {
    setProject({ nome: '', cliente: '', tipo: '', regiao: 'sudeste', numeroPropostas: '', dataEmissao: '', dataValidade: '' });
    setUnitCosts({
      estrutura: { material: 50, fabricacao: 25, pintura: 10, transporte: 15, montagem: 20, projeto: 0.50 },
      cobertura: { tipo: 'galvanizada_050', material: 75, montagem: 18 },
      fechamento: { tipo: 'pir_30mm', material: 125, montagem: 15 },
      steelDeck: { material: 100, montagem: 20 },
      complementos: { calha: 25, rufos: 20, platibanda: 45 },
    });
    setSetores([]);
    setCalculations({ custoMaterial: 0, custoInstalacao: 0, margemPct: 18, impostosPct: 12, precoFinal: 0 });
    setPaymentConditions({ assinatura: 10, aprovacao: 5, medicoes: 85 });
    setCronograma({ projeto: 10, fabricacao: 30, montagem: 15, obrigacoes: 'Disponibilizar acesso ao local da obra; Fornecer ponto de energia elétrica e água; Garantir fundações conforme projeto fornecido pela Montex; Aprovar o projeto executivo em até 10 dias úteis; Efetuar os pagamentos nas datas acordadas.' });
    setEscopo({ incluso: 'Projeto executivo de estrutura metálica; Fabricação completa em fábrica; Tratamento superficial e pintura; Transporte até a obra; Montagem completa com equipamentos; Acompanhamento técnico durante execução; Garantia de 5 anos contra defeitos de fabricação.', naoIncluso: 'Fundações e bases de concreto; Instalações elétricas e hidráulicas; Licenças e alvarás; Terraplenagem e preparação do terreno.' });
    setEditingId(null);
    setCurrentStep(0);
    setShowList(false);
  }, []);

  // Back to list
  const handleBackToList = useCallback(() => {
    setShowList(true);
    setEditingId(null);
  }, []);

  // Delete simulation
  const handleDeleteSimulation = useCallback(async (id) => {
    try {
      await deleteOrcamento(id);
      toast.success('Simulação excluída com sucesso');
    } catch (err) {
      toast.error('Erro ao excluir: ' + (err.message || 'erro desconhecido'));
    }
  }, [deleteOrcamento]);

  const steps = [
    { label: 'Dados do Projeto', icon: Building2 },
    { label: 'Custos Unitários', icon: DollarSign },
    { label: 'Setores e Itens', icon: Layers },
    { label: 'BDI e Investimento', icon: TrendingUp },
    { label: 'Cronograma e Escopo', icon: Calendar },
    { label: 'Análise Interna', icon: Activity },
    { label: 'Prévia da Proposta', icon: Eye },
  ];

  // Recalculate totals whenever setores, margem, or impostos change
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

    const currentMargem = calculations.margemPct || 18;
    const currentImpostos = calculations.impostosPct || 12;
    const margemValor = totalInstalacao * (currentMargem / 100);
    const impostoValor = (totalInstalacao + margemValor) * (currentImpostos / 100);
    const precoFinal = totalMaterial + totalInstalacao + margemValor + impostoValor;

    setCalculations(prev => ({
      ...prev,
      custoMaterial: totalMaterial,
      custoInstalacao: totalInstalacao,
      precoFinal: precoFinal,
    }));
  }, [setores, calculations.margemPct, calculations.impostosPct]);

  const handleSaveOrcamento = async () => {
    if (!project.nome || !project.cliente) {
      toast.error('Preencha os dados do projeto primeiro');
      return;
    }

    const prazoDias = (cronograma.projeto || 0) + (cronograma.fabricacao || 0) + (cronograma.montagem || 0);
    const orcamentoData = {
      numero: project.numeroPropostas || `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}`,
      nome: project.nome,
      cliente: project.cliente,
      tipo: project.tipo,
      regiao: project.regiao,
      status: 'rascunho',
      unitCosts,
      setores,
      calculations,
      paymentConditions,
      cronograma,
      escopo,
      numeroPropostas: project.numeroPropostas,
      dataEmissao: project.dataEmissao,
      dataValidade: project.dataValidade,
      valor_total: calculations.precoFinal || 0,
      validade: project.dataValidade || new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10),
      prazo_entrega: `${prazoDias} dias`,
      condicoes_pagamento: `Assinatura: ${paymentConditions.assinatura}%, Aprovação: ${paymentConditions.aprovacao}%, Medições: ${paymentConditions.medicoes}%`,
      dataResposta: new Date().toISOString(),
    };

    try {
      if (editingId) {
        // Update existing simulation
        await updateOrcamento(editingId, orcamentoData);
        toast.success('Simulação atualizada com sucesso!');
      } else {
        // Create new simulation
        const orcamentoId = `ORC-${Date.now()}`;
        await addOrcamento({ id: orcamentoId, ...orcamentoData });
        setEditingId(orcamentoId);
        toast.success('Orçamento salvo com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao salvar orçamento:', err);
      toast.error('Erro ao salvar: ' + (err.message || 'erro desconhecido'));
    }
  };

  const getPropostaData = () => ({
    project, setores, calculations, unitCosts, paymentConditions, cronograma, escopo,
  });

  const handleGenerateHTML = () => {
    if (!project.nome || !project.cliente) { toast.error('Preencha os dados do projeto primeiro'); return; }
    if (!setores.length) { toast.error('Adicione pelo menos um setor com itens'); return; }
    openPropostaHTML(getPropostaData());
    toast.success('Proposta HTML aberta em nova aba');
  };

  const handleGeneratePDF = () => {
    if (!project.nome || !project.cliente) { toast.error('Preencha os dados do projeto primeiro'); return; }
    if (!setores.length) { toast.error('Adicione pelo menos um setor com itens'); return; }
    generatePropostaPDF(getPropostaData());
    toast.success('Use Ctrl+P ou Cmd+P para salvar como PDF');
  };

  const handleGenerateDOCX = async () => {
    if (!project.nome || !project.cliente) { toast.error('Preencha os dados do projeto primeiro'); return; }
    if (!setores.length) { toast.error('Adicione pelo menos um setor com itens'); return; }
    try {
      toast.loading('Gerando DOCX...', { id: 'docx' });
      const blob = await generatePropostaDOCX(getPropostaData());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proposta_${project.nome.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('DOCX gerado com sucesso!', { id: 'docx' });
    } catch (err) {
      console.error('Erro ao gerar DOCX:', err);
      toast.error('Erro ao gerar DOCX: ' + err.message, { id: 'docx' });
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
        return <StepAnaliseInterna setores={setores} calculations={calculations} unitCosts={unitCosts} fi={fi} cronograma={cronograma} paymentConditions={paymentConditions} />;
      case 6:
        return <StepPrevia project={project} setores={setores} calculations={calculations} unitCosts={unitCosts} paymentConditions={paymentConditions} cronograma={cronograma} escopo={escopo} onSave={handleSaveOrcamento} onGeneratePDF={handleGeneratePDF} onGenerateHTML={handleGenerateHTML} onGenerateDOCX={handleGenerateDOCX} />;
      default:
        return null;
    }
  };

  // Show list view
  if (showList) {
    return (
      <SimulacoesList
        orcamentos={orcamentos}
        onNew={handleNewSimulation}
        onLoad={handleLoadSimulation}
        onDelete={handleDeleteSimulation}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-full px-4 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToList}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors"
                title="Voltar à lista"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {editingId ? 'Editar Simulação' : 'Nova Simulação'}
                </h1>
                <p className="text-slate-400 mt-1">
                  {editingId ? `Editando: ${project.nome || 'Sem nome'}` : 'Construtor de Propostas Comerciais'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Etapa {currentStep + 1} de {steps.length}</p>
              <p className="text-lg font-semibold text-white">{steps[currentStep].label}</p>
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
                      ? 'bg-green-500/15 text-green-300 hover:bg-green-200'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-700'
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
      <div className="bg-slate-800 border-t border-slate-700 sticky bottom-0 z-40">
        <div className="max-w-full px-4 lg:px-8 py-4 flex justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-6 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
