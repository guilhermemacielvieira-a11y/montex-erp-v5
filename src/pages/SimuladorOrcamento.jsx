import React, { useState, useMemo, useCallback } from 'react';
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
  ScatterChart,
  Scatter,
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

// Helper functions
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatNumber = (value, decimals = 2) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

// Step indicator component
const StepIndicator = ({ currentStep, totalSteps, steps }) => (
  <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-6 mb-6">
    <div className="flex items-center justify-between">
      {steps.map((step, idx) => (
        <React.Fragment key={idx}>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: currentStep === idx ? 1.1 : 1 }}
            className={`flex flex-col items-center ${idx <= currentStep ? 'text-blue-400' : 'text-slate-500'}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 transition-all ${
                idx < currentStep
                  ? 'bg-green-500/30 border border-green-500'
                  : idx === currentStep
                    ? 'bg-blue-500/30 border border-blue-500 ring-2 ring-blue-500/50'
                    : 'bg-slate-700 border border-slate-600'
              }`}
            >
              {idx < currentStep ? '✓' : idx + 1}
            </div>
            <span className="text-xs text-center font-medium max-w-16">{step}</span>
          </motion.div>
          {idx < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-3 mb-6 transition-colors ${
                idx < currentStep ? 'bg-green-500' : 'bg-slate-600'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

// Catalog picker component
const CatalogPicker = ({ onSelect, onClose, category }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priceLevel, setPriceLevel] = useState('medio');

  const catalogData = {
    [CATEGORIAS_SERVICO.ESTRUTURA_METALICA]: PRECOS_ESTRUTURA,
    [CATEGORIAS_SERVICO.COBERTURA]: PRECOS_COBERTURA,
    [CATEGORIAS_SERVICO.FECHAMENTO]: PRECOS_FECHAMENTO,
    [CATEGORIAS_SERVICO.COMPLEMENTOS]: PRECOS_COMPLEMENTOS,
    [CATEGORIAS_SERVICO.MAO_DE_OBRA]: PRECOS_MAO_OBRA,
    [CATEGORIAS_SERVICO.TRANSPORTE]: PRECOS_TRANSPORTE,
  };

  const items = catalogData[category] || [];
  const filtered = items.filter((item) =>
    item.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriceForLevel = (item, level) => {
    if (level === 'baixo') return item.precoBase;
    if (level === 'alto') return item.precoAlto;
    return item.precoMedio;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50 p-4"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-96 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white">Selecionar Item do Catálogo</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700">
          <input
            type="text"
            placeholder="Pesquisar item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ x: 4 }}
              onClick={() => {
                onSelect({
                  itemId: item.id,
                  codigo: item.codigo,
                  descricao: item.descricao,
                  unidade: item.unidade,
                  preco: getPriceForLevel(item, priceLevel),
                  priceLevel,
                  categoria: category,
                });
                onClose();
              }}
              className="w-full text-left p-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-lg transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{item.descricao}</p>
                  <p className="text-xs text-slate-400">{item.codigo}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-400">{formatCurrency(getPriceForLevel(item, priceLevel))}</p>
                  <p className="text-xs text-slate-400">{item.unidade}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="border-t border-slate-700 p-4 flex items-center justify-between bg-slate-800/30">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-300">Nível de Preço:</span>
            <select
              value={priceLevel}
              onChange={(e) => setPriceLevel(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="baixo">Otimista</option>
              <option value="medio">Realista</option>
              <option value="alto">Pessimista</option>
            </select>
          </div>
          <p className="text-xs text-slate-400">{filtered.length} itens</p>
        </div>
      </div>
    </motion.div>
  );
};

// Item row component for sectors
const ItemRow = ({ item, onRemove, onUpdate }) => {
  const handleQtdChange = (newQtd) => {
    onUpdate({ ...item, quantidade: parseFloat(newQtd) || 0 });
  };

  const handlePrecoChange = (newPreco) => {
    onUpdate({ ...item, preco: parseFloat(newPreco) || 0 });
  };

  const total = (item.quantidade || 0) * (item.preco || 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-3 p-3 bg-slate-800/30 border border-slate-700 rounded-lg hover:border-slate-600 transition-all"
    >
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{item.descricao}</p>
        <p className="text-xs text-slate-400">{item.codigo} • {item.unidade}</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.1"
          value={item.quantidade || ''}
          onChange={(e) => handleQtdChange(e.target.value)}
          className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm text-right focus:outline-none focus:border-blue-500"
          placeholder="0"
        />
        <span className="text-xs text-slate-400">{item.unidade}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">R$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.preco || ''}
          onChange={(e) => handlePrecoChange(e.target.value)}
          className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm text-right focus:outline-none focus:border-blue-500"
          placeholder="0.00"
        />
      </div>

      <div className="min-w-24 text-right">
        <p className="text-sm font-bold text-blue-400">{formatCurrency(total)}</p>
      </div>

      <button
        onClick={() => onRemove()}
        className="text-slate-400 hover:text-red-400 transition-colors p-1"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  );
};

// Sector card component
const SetorCard = ({ setor, onAddItem, onRemoveItem, onUpdateItem, onRemoveSetor, onUpdateNome }) => {
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIAS_SERVICO.ESTRUTURA_METALICA);
  const [editingNome, setEditingNome] = useState(false);
  const [nomeTemp, setNomeTemp] = useState(setor.nome);

  const totalSetor = setor.itens.reduce((sum, item) => sum + (item.quantidade * item.preco), 0);
  const pesoTotal = setor.itens.reduce((sum, item) => {
    if (item.unidade === 'KG') return sum + item.quantidade;
    if (item.unidade === 'TON') return sum + (item.quantidade * 1000);
    return sum;
  }, 0);

  const categoriasDisponiveis = [
    { id: CATEGORIAS_SERVICO.ESTRUTURA_METALICA, nome: 'Estrutura Metálica' },
    { id: CATEGORIAS_SERVICO.COBERTURA, nome: 'Cobertura' },
    { id: CATEGORIAS_SERVICO.FECHAMENTO, nome: 'Fechamento' },
    { id: CATEGORIAS_SERVICO.COMPLEMENTOS, nome: 'Complementos' },
    { id: CATEGORIAS_SERVICO.MAO_DE_OBRA, nome: 'Mão de Obra' },
    { id: CATEGORIAS_SERVICO.TRANSPORTE, nome: 'Transporte' },
  ];

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-4 overflow-hidden"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            {editingNome ? (
              <input
                autoFocus
                type="text"
                value={nomeTemp}
                onChange={(e) => setNomeTemp(e.target.value)}
                onBlur={() => {
                  if (nomeTemp.trim()) onUpdateNome(nomeTemp.trim());
                  setEditingNome(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (nomeTemp.trim()) onUpdateNome(nomeTemp.trim());
                    setEditingNome(false);
                  }
                  if (e.key === 'Escape') {
                    setNomeTemp(setor.nome);
                    setEditingNome(false);
                  }
                }}
                className="text-lg font-bold text-white bg-slate-700/50 border border-blue-500 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50 w-64"
              />
            ) : (
              <h3
                className="text-lg font-bold text-white cursor-pointer hover:text-blue-400 transition-colors"
                onClick={() => { setNomeTemp(setor.nome); setEditingNome(true); }}
                title="Clique para editar o nome do setor"
              >
                {setor.nome}
                <Edit3 size={14} className="inline ml-2 text-slate-500" />
              </h3>
            )}
            <div className="flex gap-4 mt-2 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Package size={14} />
                {setor.itens.length} itens
              </span>
              <span className="flex items-center gap-1">
                <Weight size={14} />
                {formatNumber(pesoTotal)} kg
              </span>
              <span className="flex items-center gap-1">
                <DollarSign size={14} />
                {formatCurrency(totalSetor)}
              </span>
            </div>
          </div>
          <button
            onClick={() => onRemoveSetor()}
            className="text-slate-400 hover:text-red-400 transition-colors p-2"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {setor.itens.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onRemove={() => onRemoveItem(item.id)}
              onUpdate={(updated) => onUpdateItem(item.id, updated)}
            />
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          {categoriasDisponiveis.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setShowCatalog(true);
              }}
              className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-sm text-blue-300 transition-all"
            >
              <Plus size={14} />
              {cat.nome}
            </button>
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {showCatalog && (
          <CatalogPicker
            category={selectedCategory}
            onClose={() => setShowCatalog(false)}
            onSelect={(itemData) => {
              onAddItem({
                id: `${setor.id}-${Date.now()}`,
                ...itemData,
                quantidade: 0,
              });
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// KPI Card component
const KPICard = ({ icon: Icon, label, value, unit = '', trend = null }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-slate-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">
          {typeof value === 'number' ? (unit === 'days' ? formatNumber(value, 0) : formatCurrency(value)) : value}
        </p>
        {unit && <p className="text-xs text-slate-500 mt-1">{unit}</p>}
      </div>
      <div className="text-slate-600">
        <Icon size={24} />
      </div>
    </div>
    {trend && (
      <div className={`flex items-center gap-1 mt-2 text-sm ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
        <TrendingUp size={14} />
        {formatNumber(Math.abs(trend), 1)}%
      </div>
    )}
  </motion.div>
);

// Main component
export default function SimuladorOrcamento() {
  const { addOrcamento } = useOrcamentos();
  const [currentStep, setCurrentStep] = useState(0);

  // Project data
  const [project, setProject] = useState({
    nome: '',
    cliente: '',
    tipo: 'galpao_industrial',
    regiao: 'sudeste',
    complexidade: 'media',
    distanciaKm: 100,
    area: 0,
  });

  // Sectors state
  const [setores, setSetores] = useState([]);

  // Services state
  const [servicos, setServicos] = useState({
    transporteIncluido: true,
    montagemIncluida: true,
    distanciaTransporte: 100,
    tipoTransporte: 'padrao',
  });

  // BDI state
  const [bdi, setBdi] = useState(PARAMETROS_MERCADO.bdi);
  const [margem, setMargem] = useState(0.18);
  const [desconto, setDesconto] = useState(0);

  const steps = ['Info', 'Setores', 'Serviços', 'BDI', 'Análise'];

  // Computed calculations
  const calculations = useMemo(() => {
    let totalMaterial = 0;
    let totalMaoObra = 0;
    let totalTransporte = 0;
    let totalPeso = 0;
    const setoresCalc = [];

    setores.forEach((setor) => {
      let setorMaterial = 0;
      let setorMaoObra = 0;
      let setorPeso = 0;

      setor.itens.forEach((item) => {
        const valor = (item.quantidade || 0) * (item.preco || 0);
        if (
          item.categoria === CATEGORIAS_SERVICO.MAO_DE_OBRA ||
          item.categoria === CATEGORIAS_SERVICO.MONTAGEM
        ) {
          setorMaoObra += valor;
          totalMaoObra += valor;
        } else if (item.categoria === CATEGORIAS_SERVICO.TRANSPORTE) {
          totalTransporte += valor;
        } else {
          setorMaterial += valor;
          totalMaterial += valor;
        }

        if (item.unidade === 'KG') {
          setorPeso += item.quantidade || 0;
          totalPeso += item.quantidade || 0;
        } else if (item.unidade === 'TON') {
          setorPeso += (item.quantidade || 0) * 1000;
          totalPeso += (item.quantidade || 0) * 1000;
        }
      });

      setoresCalc.push({
        nome: setor.nome,
        material: setorMaterial,
        maoObra: setorMaoObra,
        peso: setorPeso,
        precoKg: setorPeso > 0 ? (setorMaterial + setorMaoObra) / setorPeso : 0,
      });
    });

    const subtotal = totalMaterial + totalMaoObra + (servicos.transporteIncluido ? totalTransporte : 0);
    const bdiTotal = Object.values(bdi).reduce((sum, val) => sum + val, 0);
    const custoIndireto = subtotal * bdiTotal;
    const precoVendaBDI = subtotal + custoIndireto;
    const precoVendaComMargem = precoVendaBDI * (1 + margem);
    const precoFinal = precoVendaComMargem * (1 - desconto / 100);

    const prazo = calcularPrazoEstimado(totalPeso, servicos.distanciaTransporte);
    prazo.total = prazo.projeto + prazo.fabricacao + prazo.pintura + prazo.transporte + prazo.montagem;

    return {
      totalMaterial,
      totalMaoObra,
      totalTransporte,
      totalPeso,
      subtotal,
      bdiTotal,
      custoIndireto,
      precoVendaBDI,
      precoVendaComMargem,
      precoFinal,
      precoKgMedio: totalPeso > 0 ? precoFinal / totalPeso : 0,
      margenAbs: precoFinal - subtotal,
      margemPct: subtotal > 0 ? ((precoFinal - subtotal) / subtotal) * 100 : 0,
      setoresCalc,
      prazo,
    };
  }, [setores, servicos, bdi, margem, desconto]);

  // Handlers
  const handleAddSetor = useCallback(() => {
    const novoSetor = {
      id: `setor-${Date.now()}`,
      nome: `Setor ${setores.length + 1}`,
      itens: [],
    };
    setSetores([...setores, novoSetor]);
  }, [setores]);

  const handleRemoveSetor = useCallback((setorId) => {
    setSetores(setores.filter((s) => s.id !== setorId));
  }, [setores]);

  const handleAddItem = useCallback((setorId, item) => {
    setSetores(
      setores.map((s) =>
        s.id === setorId
          ? {
              ...s,
              itens: [...s.itens, item],
            }
          : s
      )
    );
  }, [setores]);

  const handleRemoveItem = useCallback((setorId, itemId) => {
    setSetores(
      setores.map((s) =>
        s.id === setorId
          ? {
              ...s,
              itens: s.itens.filter((i) => i.id !== itemId),
            }
          : s
      )
    );
  }, [setores]);

  const handleUpdateItem = useCallback((setorId, itemId, updated) => {
    setSetores(
      setores.map((s) =>
        s.id === setorId
          ? {
              ...s,
              itens: s.itens.map((i) => (i.id === itemId ? updated : i)),
            }
          : s
      )
    );
  }, [setores]);

  const handleSaveOrcamento = useCallback(() => {
    if (!project.nome || !project.cliente) {
      toast.error('Preencha nome do projeto e cliente');
      return;
    }

    if (setores.length === 0) {
      toast.error('Adicione pelo menos um setor');
      return;
    }

    const orc = {
      id: `ORC-${Date.now()}`,
      nome: project.nome,
      cliente: project.cliente,
      tipo: project.tipo,
      regiao: project.regiao,
      valor: calculations.precoFinal,
      valorBDI: calculations.precoVendaBDI,
      status: 'Rascunho',
      dataCriacao: new Date().toISOString(),
      setores: setores.map((s) => ({
        nome: s.nome,
        itens: s.itens,
        total: s.itens.reduce((sum, item) => sum + item.quantidade * item.preco, 0),
      })),
      resumo: {
        pesoTotal: calculations.totalPeso,
        precoKgMedio: calculations.precoKgMedio,
        margemPct: calculations.margemPct,
        prazo: calculations.prazo.total,
      },
    };

    addOrcamento(orc);
    toast.success('Orçamento salvo com sucesso!');
    setTimeout(() => {
      window.location.href = '/orcamentos';
    }, 1500);
  }, [project, setores, calculations, addOrcamento]);

  // Render steps
  const renderStep1 = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-white mb-2">Nome do Projeto *</label>
          <input
            type="text"
            value={project.nome}
            onChange={(e) => setProject({ ...project, nome: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            placeholder="Ex: SUPER LUNA - BELO VALE"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Cliente *</label>
          <input
            type="text"
            value={project.cliente}
            onChange={(e) => setProject({ ...project, cliente: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            placeholder="Ex: Super Luna Supermercados"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Tipo de Estrutura</label>
          <select
            value={project.tipo}
            onChange={(e) => setProject({ ...project, tipo: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            {Object.entries(TIPOS_ESTRUTURA).map(([key, type]) => (
              <option key={key} value={type.id}>
                {type.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Região</label>
          <select
            value={project.regiao}
            onChange={(e) => setProject({ ...project, regiao: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            {Object.entries(PARAMETROS_MERCADO.regioes).map(([key]) => (
              <option key={key} value={key}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Complexidade</label>
          <select
            value={project.complexidade}
            onChange={(e) => setProject({ ...project, complexidade: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            {Object.entries(PARAMETROS_MERCADO.complexidade).map(([key]) => (
              <option key={key} value={key}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Distância de Transporte (km)</label>
          <input
            type="number"
            min="0"
            value={project.distanciaKm}
            onChange={(e) => setProject({ ...project, distanciaKm: parseFloat(e.target.value) || 0 })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <p className="text-sm text-slate-300">
          <Info className="inline mr-2" size={16} />
          Informações básicas do projeto que afetarão o cálculo do orçamento
        </p>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Setores e Itens</h3>
        <button
          onClick={handleAddSetor}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
        >
          <Plus size={18} />
          Novo Setor
        </button>
      </div>

      {setores.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8 text-center">
          <Building2 size={40} className="text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">Nenhum setor adicionado ainda</p>
          <button
            onClick={handleAddSetor}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
          >
            <Plus size={18} />
            Criar Primeiro Setor
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {setores.map((setor) => (
            <SetorCard
              key={setor.id}
              setor={setor}
              onAddItem={(item) => handleAddItem(setor.id, item)}
              onRemoveItem={(itemId) => handleRemoveItem(setor.id, itemId)}
              onUpdateItem={(itemId, updated) => handleUpdateItem(setor.id, itemId, updated)}
              onRemoveSetor={() => handleRemoveSetor(setor.id)}
              onUpdateNome={(novoNome) => setSetores(prev => prev.map(s => s.id === setor.id ? { ...s, nome: novoNome } : s))}
            />
          ))}
        </div>
      )}
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h3 className="text-lg font-bold text-white">Serviços Adicionais</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={servicos.transporteIncluido}
              onChange={(e) => setServicos({ ...servicos, transporteIncluido: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-white font-semibold">Incluir Transporte</span>
          </label>
          {servicos.transporteIncluido && (
            <div className="mt-3 ml-7">
              <label className="block text-sm text-slate-300 mb-2">Tipo de Transporte</label>
              <select
                value={servicos.tipoTransporte}
                onChange={(e) => setServicos({ ...servicos, tipoTransporte: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="padrao">Padrão (Carreta)</option>
                <option value="especial">Especial (Escolta)</option>
                <option value="proprio">Próprio</option>
              </select>
            </div>
          )}
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={servicos.montagemIncluida}
              onChange={(e) => setServicos({ ...servicos, montagemIncluida: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-white font-semibold">Incluir Montagem</span>
          </label>
        </div>
      </div>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h3 className="text-lg font-bold text-white">BDI e Margens</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(bdi).map(([key, value]) => (
          <div key={key} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <label className="block text-sm font-semibold text-white mb-2 capitalize">
              {key.replace('_', ' ')}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={(value * 100).toFixed(1)}
                onChange={(e) =>
                  setBdi({ ...bdi, [key]: parseFloat(e.target.value) / 100 || 0 })
                }
                className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <span className="text-slate-400">%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <label className="block text-sm font-semibold text-white mb-2">Margem de Lucro</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={(margem * 100).toFixed(1)}
              onChange={(e) => setMargem(parseFloat(e.target.value) / 100 || 0)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-400">%</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">{formatCurrency(calculations.margenAbs)}</p>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <label className="block text-sm font-semibold text-white mb-2">Desconto</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={desconto.toFixed(1)}
              onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-400">%</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-400">Subtotal</p>
            <p className="text-lg font-bold text-white">{formatCurrency(calculations.subtotal)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Custo Indireto</p>
            <p className="text-lg font-bold text-white">{formatCurrency(calculations.custoIndireto)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Preço Final</p>
            <p className="text-lg font-bold text-blue-400">{formatCurrency(calculations.precoFinal)}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderStep5 = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={DollarSign}
          label="Valor Final"
          value={calculations.precoFinal}
        />
        <KPICard
          icon={Weight}
          label="Peso Total"
          value={calculations.totalPeso}
          unit="kg"
        />
        <KPICard
          icon={TrendingUp}
          label="Preço/kg"
          value={calculations.precoKgMedio}
        />
        <KPICard
          icon={Calendar}
          label="Prazo Total"
          value={calculations.prazo.total}
          unit="days"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KPICard
          icon={DollarSign}
          label="Margem Bruta"
          value={calculations.margenAbs}
        />
        <KPICard
          icon={TrendingUp}
          label="Margem %"
          value={`${formatNumber(calculations.margemPct, 1)}%`}
          trend={calculations.margemPct > 15 ? 5 : -5}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Composition pie */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <h4 className="font-semibold text-white mb-4">Composição de Custos</h4>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Material', value: calculations.totalMaterial },
                  { name: 'Mão de Obra', value: calculations.totalMaoObra },
                  { name: 'Transporte', value: calculations.totalTransporte },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {CHART_COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Sectors comparison */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <h4 className="font-semibold text-white mb-4">Valor por Setor</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={calculations.setoresCalc}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="nome" stroke="#cbd5e1" />
              <YAxis stroke="#cbd5e1" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="material" stackId="a" fill="#3b82f6" name="Material" />
              <Bar dataKey="maoObra" stackId="a" fill="#8b5cf6" name="Mão de Obra" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Schedule */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-4">Estimativa de Prazo (dias)</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(calculations.prazo).map(([key, value]) => {
            if (key === 'total') return null;
            return (
              <div key={key} className="bg-slate-700/50 rounded-lg p-3 text-center">
                <p className="text-xs text-slate-400 capitalize">{key}</p>
                <p className="text-xl font-bold text-blue-400">{formatNumber(value, 0)}</p>
              </div>
            );
          })}
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-300 font-semibold">TOTAL</p>
            <p className="text-xl font-bold text-blue-400">{formatNumber(calculations.prazo.total, 0)}</p>
          </div>
        </div>
      </div>

      {/* Comparison with historical */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h4 className="font-semibold text-white mb-4">Comparação com Histórico</h4>
        <div className="space-y-2">
          {HISTORICO_OBRAS[0]?.setores.map((setor) => (
            <div key={setor.nome} className="flex items-center justify-between text-sm">
              <span className="text-slate-300">{setor.nome}</span>
              <span className="text-white font-semibold">{formatCurrency(setor.valor)}</span>
              <span className={`text-sm ${setor.precoKg < calculations.precoKgMedio ? 'text-green-400' : 'text-red-400'}`}>
                R$ {formatNumber(setor.precoKg, 2)}/kg
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const stepContent = [renderStep1(), renderStep2(), renderStep3(), renderStep4(), renderStep5()];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Simulador de Orçamento</h1>
          <p className="text-slate-400">Sistema profissional para simulação de orçamentos de estruturas metálicas MONTEX</p>
        </motion.div>

        <StepIndicator currentStep={currentStep} totalSteps={steps.length} steps={steps} />

        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-8 mb-6">
          {stepContent[currentStep]}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition-colors"
          >
            <ChevronLeft size={18} />
            Anterior
          </button>

          <div className="text-center">
            <p className="text-sm text-slate-400">
              Etapa {currentStep + 1} de {steps.length}
            </p>
          </div>

          <div className="flex gap-3">
            {currentStep === steps.length - 1 ? (
              <button
                onClick={handleSaveOrcamento}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition-colors"
              >
                <Save size={18} />
                Salvar Orçamento
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors"
              >
                Próximo
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
