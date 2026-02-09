// MONTEX ERP Premium - Página de Estoque
// Integrado com EstoqueRealContext - 32 itens reais NF da obra SUPER LUNA

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { exportToExcel } from '@/utils/exportUtils';
import {
  Package, Warehouse, AlertTriangle, AlertCircle, CheckCircle2,
  Search, Plus, Download, Upload, Edit, Eye,
  ChevronDown, TrendingDown, TrendingUp, BarChart3, Bell,
  Building2, Scissors, RefreshCw, FileSpreadsheet, Clock,
  ArrowRight, ArrowDown, Layers, X, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import * as Dialog from '@radix-ui/react-dialog';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

// EstoqueRealContext - dados reais (32 itens NF)
import { useEstoqueReal } from '../contexts/EstoqueRealContext';

// Tipos de Material
const TIPO_MATERIAL = {
  INSUMO: 'insumo',
  MATERIAL_FATURADO: 'material_faturado',
  TODOS: 'todos'
};

const TIPOS_MATERIAL_CONFIG = [
  { id: 'todos', nome: 'Todos os Tipos', icon: '📦', cor: '#6366f1' },
  { id: 'insumo', nome: 'Insumos', icon: '🔧', cor: '#f59e0b', descricao: 'Consumíveis e materiais de apoio' },
  { id: 'material_faturado', nome: 'Material Faturado Direto', icon: '🏭', cor: '#10b981', descricao: 'Material vinculado a NF da obra' },
];

// Categorias de materiais
const CATEGORIAS_MATERIAL = [
  { id: 'todas', nome: 'Todas', icon: '📋', cor: '#64748b' },
  { id: 'chapas', nome: 'Chapas', icon: '🔲', cor: '#3b82f6', tipo: 'material_faturado' },
  { id: 'perfis', nome: 'Perfis W/I', icon: '📐', cor: '#8b5cf6', tipo: 'material_faturado' },
  { id: 'perfis_hp', nome: 'Perfis HP', icon: '🔩', cor: '#7c3aed', tipo: 'material_faturado' },
  { id: 'tubos', nome: 'Tubos', icon: '🔧', cor: '#10b981', tipo: 'material_faturado' },
  { id: 'cantoneiras', nome: 'Cantoneiras', icon: '📏', cor: '#f59e0b', tipo: 'material_faturado' },
  { id: 'barras', nome: 'Barras Redondas', icon: '⚫', cor: '#ef4444', tipo: 'material_faturado' },
  { id: 'consumiveis', nome: 'Consumíveis', icon: '⚡', cor: '#ec4899', tipo: 'insumo' },
  { id: 'parafusos', nome: 'Parafusos', icon: '🔩', cor: '#6366f1', tipo: 'insumo' },
  { id: 'tintas', nome: 'Tintas/Químicos', icon: '🎨', cor: '#14b8a6', tipo: 'insumo' },
  { id: 'gases', nome: 'Gases', icon: '💨', cor: '#0ea5e9', tipo: 'insumo' },
  { id: 'epi', nome: 'EPIs', icon: '🦺', cor: '#f97316', tipo: 'insumo' },
];

// Status de estoque
const STATUS_ESTOQUE = {
  normal: { label: 'Normal', cor: '#10b981', icon: CheckCircle2 },
  baixo: { label: 'Baixo', cor: '#f59e0b', icon: AlertTriangle },
  critico: { label: 'Crítico', cor: '#ef4444', icon: AlertCircle },
  zerado: { label: 'Zerado', cor: '#64748b', icon: X },
};

// Cores para gráficos
const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#64748b'];

export default function EstoquePage() {
  // EstoqueRealContext - dados reais do estoque (32 itens NF)
  const {
    estoqueReal, movimentacoes, consumoCorte, consumoHoje,
    kpisEstoque, deduzirEstoque, adicionarEstoque, addMovimentacao
  } = useEstoqueReal();

  // Obra local (todo estoque é SUPER LUNA BELO VALE)
  const obras = [
    { id: 'super-luna', nome: 'SUPER LUNA BELO VALE', status: 'em_andamento' }
  ];

  // Estados locais
  const [tabAtiva, setTabAtiva] = useState('visao-geral');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [obraFiltro, setObraFiltro] = useState('geral');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [modalMaterial, setModalMaterial] = useState(null);
  const [modalImport, setModalImport] = useState(false);
  const [modalMovimentacao, setModalMovimentacao] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [showCategoriasExpanded, setShowCategoriasExpanded] = useState(false);

  // Normalizar dados do EstoqueRealContext para formato da página
  const estoque = useMemo(() => {
    return estoqueReal.map(item => ({
      ...item,
      tipo: 'material_faturado',
      consumoMedio: 0,
      obraId: 'super-luna',
      fornecedor: '',
      peso: item.quantidade,
      valorUnitario: item.preco,
    }));
  }, [estoqueReal]);

  // Calcular status de cada item
  const getStatus = (item) => {
    if (item.quantidade === 0) return 'zerado';
    if (item.quantidade <= item.minimo * 0.5) return 'critico';
    if (item.quantidade <= item.minimo) return 'baixo';
    return 'normal';
  };

  // Adicionar status aos itens
  const estoqueComStatus = useMemo(() => {
    return estoque.map(item => ({
      ...item,
      status: getStatus(item),
      diasEstoque: item.consumoMedio > 0 ? Math.floor(item.quantidade / item.consumoMedio) : 999,
      valorTotal: item.quantidade * item.preco
    }));
  }, [estoque]);

  // Gerar notificações
  useEffect(() => {
    const alertas = estoqueComStatus
      .filter(item => item.status === 'critico' || item.status === 'zerado')
      .map(item => ({
        id: item.id,
        tipo: item.status,
        mensagem: item.status === 'zerado'
          ? `${item.nome} está ZERADO!`
          : `${item.nome} em nível CRÍTICO (${item.quantidade} ${item.unidade})`,
        material: item.nome
      }));
    setNotificacoes(alertas);
  }, [estoqueComStatus]);

  // Filtrar estoque
  const estoqueFiltrado = useMemo(() => {
    return estoqueComStatus.filter(item => {
      // Filtro por categoria
      if (categoriaFiltro !== 'todas' && item.categoria !== categoriaFiltro) return false;

      // Filtro por status
      if (statusFiltro !== 'todos' && item.status !== statusFiltro) return false;

      // Filtro por tipo (Insumo vs Material Faturado)
      if (tipoFiltro !== 'todos' && item.tipo !== tipoFiltro) return false;

      // Filtro por obra
      if (obraFiltro !== 'geral') {
        if (item.obraId !== obraFiltro) return false;
      }

      // Filtro por busca
      if (busca && !item.nome.toLowerCase().includes(busca.toLowerCase()) &&
          !item.codigo.toLowerCase().includes(busca.toLowerCase()) &&
          !(item.fornecedor && item.fornecedor.toLowerCase().includes(busca.toLowerCase()))) return false;

      return true;
    });
  }, [estoqueComStatus, categoriaFiltro, statusFiltro, tipoFiltro, obraFiltro, busca]);

  // KPIs filtrados
  const kpisFiltrados = useMemo(() => {
    const items = estoqueFiltrado;
    const total = items.length;
    const normal = items.filter(i => i.status === 'normal').length;
    const baixo = items.filter(i => i.status === 'baixo').length;
    const critico = items.filter(i => i.status === 'critico').length;
    const zerado = items.filter(i => i.status === 'zerado').length;
    const valorTotal = items.reduce((a, i) => a + i.valorTotal, 0);
    const pesoTotal = items.filter(i => i.unidade === 'kg').reduce((a, i) => a + i.quantidade, 0);
    const insumos = items.filter(i => i.tipo === 'insumo').length;
    const faturados = items.filter(i => i.tipo === 'material_faturado').length;

    return { total, normal, baixo, critico, zerado, valorTotal, pesoTotal, insumos, faturados };
  }, [estoqueFiltrado]);

  // KPIs
  const kpis = useMemo(() => {
    const total = estoqueComStatus.length;
    const normal = estoqueComStatus.filter(i => i.status === 'normal').length;
    const baixo = estoqueComStatus.filter(i => i.status === 'baixo').length;
    const critico = estoqueComStatus.filter(i => i.status === 'critico').length;
    const zerado = estoqueComStatus.filter(i => i.status === 'zerado').length;
    const valorTotal = estoqueComStatus.reduce((a, i) => a + i.valorTotal, 0);

    return { total, normal, baixo, critico, zerado, valorTotal };
  }, [estoqueComStatus]);

  // Dados para gráfico de pizza
  const dadosPizza = [
    { name: 'Normal', value: kpis.normal, color: STATUS_ESTOQUE.normal.cor },
    { name: 'Baixo', value: kpis.baixo, color: STATUS_ESTOQUE.baixo.cor },
    { name: 'Crítico', value: kpis.critico, color: STATUS_ESTOQUE.critico.cor },
    { name: 'Zerado', value: kpis.zerado, color: STATUS_ESTOQUE.zerado.cor },
  ].filter(d => d.value > 0);

  // Dados para gráfico por categoria
  const dadosCategoria = CATEGORIAS_MATERIAL.map(cat => ({
    name: cat.nome,
    quantidade: estoqueComStatus.filter(i => i.categoria === cat.id).length,
    valor: estoqueComStatus.filter(i => i.categoria === cat.id).reduce((a, i) => a + i.valorTotal, 0),
    fill: cat.cor
  }));

  // Formatar moeda
  const formatMoney = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Warehouse className="h-7 w-7 text-blue-500" />
            Gestão de Estoque
          </h1>
          <p className="text-slate-400 mt-1">Controle de materiais integrado ao setor de Corte</p>
        </div>
        <div className="flex gap-3">
          {/* Notificações */}
          {notificacoes.length > 0 && (
            <div className="relative">
              <Button
                onClick={() => toast.error(`${notificacoes.length} alerta(s) de estoque crítico`)}
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                <Bell className="h-4 w-4 mr-2" />
                {notificacoes.length} Alertas
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={() => setModalImport(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar Excel
          </Button>
          <Button
            onClick={() => {
              const columns = [
                { header: 'Material', key: 'nome' },
                { header: 'Categoria', key: 'categoria' },
                { header: 'Tipo', key: 'tipo' },
                { header: 'Quantidade', key: 'quantidade' },
                { header: 'Unidade', key: 'unidade' },
                { header: 'Peso (kg)', key: 'peso' },
                { header: 'Valor Unit. (R$)', key: 'valorUnitario' },
                { header: 'Valor Total (R$)', key: 'valorTotal' },
                { header: 'Status', key: 'status' },
                { header: 'Localização', key: 'localizacao' },
                { header: 'Obra', key: 'obraId' }
              ];
              const timestamp = new Date().toISOString().split('T')[0];
              exportToExcel(estoque, columns, `estoque-${timestamp}`);
              toast.success('Estoque exportado para Excel com sucesso!');
            }}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setModalMovimentacao(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Movimentação
          </Button>
        </div>
      </div>

      {/* Alertas de Estoque */}
      {notificacoes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-red-400 font-semibold">Atenção! Materiais com estoque crítico:</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {notificacoes.slice(0, 6).map(n => (
              <div key={n.id} className="flex items-center gap-2 text-sm">
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  n.tipo === 'zerado' ? "bg-slate-400" : "bg-red-400"
                )} />
                <span className="text-slate-300">{n.mensagem}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Filtros Principais - Área Melhorada */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-4">
        {/* Linha 1: Tipo de Material (Chips grandes) */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-400 text-sm font-medium">Tipo:</span>
          {TIPOS_MATERIAL_CONFIG.map(tipo => (
            <button
              key={tipo.id}
              onClick={() => setTipoFiltro(tipo.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                tipoFiltro === tipo.id
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25"
                  : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white"
              )}
            >
              <span>{tipo.icon}</span>
              <span>{tipo.nome}</span>
              {tipoFiltro === tipo.id && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  {tipo.id === 'todos' ? kpis.total : tipo.id === 'insumo' ? kpisFiltrados.insumos : kpisFiltrados.faturados}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Linha 2: Filtros principais */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Filtro de Obra */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <Select.Root value={obraFiltro} onValueChange={setObraFiltro}>
              <Select.Trigger className="flex items-center justify-between min-w-[220px] px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
                <Select.Value />
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                  <Select.Viewport className="p-1">
                    <Select.Item value="geral" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                      <Select.ItemText>📦 Estoque Geral (Todas)</Select.ItemText>
                    </Select.Item>
                    <div className="h-px bg-slate-700 my-1" />
                    {obras.filter(o => o.status !== 'concluido').map(obra => (
                      <Select.Item key={obra.id} value={obra.id} className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                        <Select.ItemText>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            {obra.nome}
                          </span>
                        </Select.ItemText>
                      </Select.Item>
                    ))}
                    <div className="h-px bg-slate-700 my-1" />
                    <div className="px-3 py-1 text-xs text-slate-500">Obras Concluídas</div>
                    {obras.filter(o => o.status === 'concluido').map(obra => (
                      <Select.Item key={obra.id} value={obra.id} className="px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 rounded cursor-pointer outline-none">
                        <Select.ItemText>
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                            {obra.nome}
                          </span>
                        </Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Buscar código, nome ou fornecedor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 bg-slate-900 border-slate-700 text-white"
            />
          </div>

          {/* Filtro de Status */}
          <Select.Root value={statusFiltro} onValueChange={setStatusFiltro}>
            <Select.Trigger className="flex items-center justify-between w-40 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white">
              <Select.Value placeholder="Status" />
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                <Select.Viewport className="p-1">
                  <Select.Item value="todos" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                    <Select.ItemText>🔘 Todos Status</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="normal" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                    <Select.ItemText>🟢 Normal ({kpis.normal})</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="baixo" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                    <Select.ItemText>🟡 Baixo ({kpis.baixo})</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="critico" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                    <Select.ItemText>🔴 Crítico ({kpis.critico})</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="zerado" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                    <Select.ItemText>⚫ Zerado ({kpis.zerado})</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          {/* Botão expandir categorias */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCategoriasExpanded(!showCategoriasExpanded)}
            className={cn(
              "border-slate-700 text-slate-300",
              showCategoriasExpanded && "bg-slate-700"
            )}
          >
            <Layers className="h-4 w-4 mr-2" />
            Categorias
            <ChevronDown className={cn("h-4 w-4 ml-1 transition-transform", showCategoriasExpanded && "rotate-180")} />
          </Button>
        </div>

        {/* Linha 3: Chips de Categoria (expandível) */}
        <AnimatePresence>
          {showCategoriasExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 pt-2 border-t border-slate-700"
            >
              {CATEGORIAS_MATERIAL.map(cat => {
                const count = estoqueComStatus.filter(i => cat.id === 'todas' ? true : i.categoria === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaFiltro(cat.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                      categoriaFiltro === cat.id
                        ? "text-white shadow-lg"
                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                    )}
                    style={{
                      backgroundColor: categoriaFiltro === cat.id ? cat.cor : undefined,
                      boxShadow: categoriaFiltro === cat.id ? `0 4px 14px ${cat.cor}40` : undefined
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.nome}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px]",
                      categoriaFiltro === cat.id ? "bg-white/20" : "bg-slate-600"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filtros Ativos */}
        {(categoriaFiltro !== 'todas' || tipoFiltro !== 'todos' || obraFiltro !== 'geral' || statusFiltro !== 'todos' || busca) && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
            <span className="text-slate-500 text-xs">Filtros ativos:</span>
            <div className="flex flex-wrap gap-1.5">
              {tipoFiltro !== 'todos' && (
                <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                  {TIPOS_MATERIAL_CONFIG.find(t => t.id === tipoFiltro)?.nome}
                  <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => setTipoFiltro('todos')} />
                </span>
              )}
              {obraFiltro !== 'geral' && (
                <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                  {obras.find(o => o.id === obraFiltro)?.nome}
                  <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => setObraFiltro('geral')} />
                </span>
              )}
              {categoriaFiltro !== 'todas' && (
                <span className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                  {CATEGORIAS_MATERIAL.find(c => c.id === categoriaFiltro)?.nome}
                  <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => setCategoriaFiltro('todas')} />
                </span>
              )}
              {statusFiltro !== 'todos' && (
                <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                  Status: {statusFiltro}
                  <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => setStatusFiltro('todos')} />
                </span>
              )}
              {busca && (
                <span className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                  "{busca}"
                  <X className="h-3 w-3 cursor-pointer hover:text-white" onClick={() => setBusca('')} />
                </span>
              )}
              <button
                onClick={() => {
                  setTipoFiltro('todos');
                  setObraFiltro('geral');
                  setCategoriaFiltro('todas');
                  setStatusFiltro('todos');
                  setBusca('');
                }}
                className="text-xs text-red-400 hover:text-red-300 px-2"
              >
                Limpar todos
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Itens', value: kpis.total, icon: Package, cor: 'blue' },
          { label: 'Normal', value: kpis.normal, icon: CheckCircle2, cor: 'emerald' },
          { label: 'Baixo', value: kpis.baixo, icon: AlertTriangle, cor: 'amber' },
          { label: 'Crítico', value: kpis.critico, icon: AlertCircle, cor: 'red' },
          { label: 'Zerado', value: kpis.zerado, icon: X, cor: 'slate' },
          { label: 'Valor Total', value: formatMoney(kpis.valorTotal), icon: TrendingUp, cor: 'purple', large: true },
        ].map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "bg-slate-800/50 border border-slate-700 rounded-xl p-4",
              kpi.large && "lg:col-span-1"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs">{kpi.label}</p>
                <p className={cn(
                  "font-bold text-white mt-1",
                  kpi.large ? "text-lg" : "text-2xl"
                )}>{kpi.value}</p>
              </div>
              <div className={cn(
                "p-2 rounded-lg",
                kpi.cor === 'blue' && "bg-blue-500/20 text-blue-400",
                kpi.cor === 'emerald' && "bg-emerald-500/20 text-emerald-400",
                kpi.cor === 'amber' && "bg-amber-500/20 text-amber-400",
                kpi.cor === 'red' && "bg-red-500/20 text-red-400",
                kpi.cor === 'slate' && "bg-slate-500/20 text-slate-400",
                kpi.cor === 'purple' && "bg-purple-500/20 text-purple-400",
              )}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs.Root value={tabAtiva} onValueChange={setTabAtiva}>
        <Tabs.List className="flex gap-2 border-b border-slate-800 pb-2">
          {[
            { id: 'visao-geral', label: 'Visão Geral', icon: BarChart3 },
            { id: 'lista', label: 'Lista de Materiais', icon: Layers },
            { id: 'movimentacoes', label: 'Movimentações', icon: ArrowRight },
            { id: 'consumo-corte', label: 'Consumo Corte', icon: Scissors },
          ].map(tab => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                tabAtiva === tab.id
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Tab Visão Geral */}
        <Tabs.Content value="visao-geral" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Status */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Status do Estoque</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={dadosPizza}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {dadosPizza.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico por Categoria */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Valor por Categoria</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={dadosCategoria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => formatMoney(value)}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                    />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      {dadosCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Itens Críticos */}
            <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                Itens que Precisam de Atenção
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {estoqueComStatus
                  .filter(i => i.status === 'critico' || i.status === 'zerado' || i.status === 'baixo')
                  .slice(0, 6)
                  .map(item => {
                    const StatusIcon = STATUS_ESTOQUE[item.status].icon;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-4 rounded-lg border cursor-pointer hover:border-slate-500 transition-all",
                          item.status === 'critico' && "bg-red-500/10 border-red-500/30",
                          item.status === 'zerado' && "bg-slate-500/10 border-slate-500/30",
                          item.status === 'baixo' && "bg-amber-500/10 border-amber-500/30",
                        )}
                        onClick={() => setModalMaterial(item)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-white font-bold">{item.codigo}</span>
                          <StatusIcon className="h-4 w-4" style={{ color: STATUS_ESTOQUE[item.status].cor }} />
                        </div>
                        <p className="text-slate-300 text-sm mb-2">{item.nome}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Atual: <span className="text-white">{item.quantidade} {item.unidade}</span></span>
                          <span className="text-slate-400">Mín: <span className="text-white">{item.minimo}</span></span>
                        </div>
                        {item.diasEstoque < 7 && (
                          <p className="text-red-400 text-xs mt-2">
                            ⚠️ Estoque para {item.diasEstoque} dias
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </Tabs.Content>

        {/* Tab Lista de Materiais */}
        <Tabs.Content value="lista" className="mt-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Material</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Categoria</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Quantidade</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Mínimo</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Valor Total</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">Local</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {estoqueFiltrado.map((item, idx) => {
                    const categoria = CATEGORIAS_MATERIAL.find(c => c.id === item.categoria);
                    const StatusIcon = STATUS_ESTOQUE[item.status].icon;
                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-slate-700/50 hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-3 font-mono text-white font-medium">{item.codigo}</td>
                        <td className="px-4 py-3 text-slate-300">{item.nome}</td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-1 rounded text-xs"
                            style={{ backgroundColor: `${categoria?.cor}20`, color: categoria?.cor }}
                          >
                            {categoria?.icon} {categoria?.nome}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {item.quantidade.toLocaleString('pt-BR')} {item.unidade}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">
                          {item.minimo.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${STATUS_ESTOQUE[item.status].cor}20`,
                              color: STATUS_ESTOQUE[item.status].cor
                            }}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {STATUS_ESTOQUE[item.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-medium">
                          {formatMoney(item.valorTotal)}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400 font-mono text-sm">
                          {item.localizacao}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-slate-400 hover:text-white"
                              onClick={() => setModalMaterial(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-slate-400 hover:text-white"
                              onClick={() => toast.info('Edição em desenvolvimento')}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Tabs.Content>

        {/* Tab Movimentações */}
        <Tabs.Content value="movimentacoes" className="mt-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">Últimas Movimentações</h3>
              <Button
                onClick={() => toast.success('Dados atualizados!')}
                size="sm"
                variant="outline"
                className="border-slate-700 text-slate-300">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Data/Hora</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Material</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Quantidade</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Obra/Setor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Usuário</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.map((mov, idx) => {
                    const material = estoque.find(m => m.id === mov.materialId);
                    return (
                      <motion.tr
                        key={mov.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b border-slate-700/50 hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          {new Date(mov.data).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-medium",
                            mov.tipo === 'entrada'
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          )}>
                            {mov.tipo === 'entrada' ? '↓ Entrada' : '↑ Saída'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white font-medium">{material?.nome}</p>
                          <p className="text-slate-500 text-xs">{material?.codigo}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">
                          {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade} {material?.unidade}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          {mov.obra || 'Estoque Geral'} / {mov.setor}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm">{mov.usuario}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Tabs.Content>

        {/* Tab Consumo Corte */}
        <Tabs.Content value="consumo-corte" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Registros de Consumo pelo Corte */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Scissors className="h-5 w-5 text-amber-400" />
                Consumo Registrado pelo Corte
              </h3>
              {consumoCorte.length === 0 ? (
                <div className="text-center py-8">
                  <Scissors className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Nenhum consumo registrado ainda.</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Os dados aparecerão quando marcas forem movidas para "Cortando" no Kanban.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {consumoCorte.slice(0, 20).map(c => {
                    const material = estoqueReal.find(m => m.id === c.materialId);
                    return (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                        <div>
                          <p className="text-white text-sm font-medium">{c.perfil}</p>
                          <p className="text-slate-500 text-xs">{material?.codigo || 'N/A'} • {new Date(c.data).toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-red-400 font-bold text-sm">-{c.peso.toFixed(1)} kg</p>
                          <p className="text-slate-500 text-xs">{c.pecaId}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
                <span className="text-slate-400 text-sm">Total consumido pelo corte:</span>
                <span className="text-amber-400 font-bold">
                  {consumoCorte.reduce((a, c) => a + c.peso, 0).toFixed(1)} kg
                </span>
              </div>
            </div>

            {/* Estoque Atual vs Comprado - barras de progresso */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" />
                Estoque Atual vs Comprado
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {estoqueReal
                  .filter(i => i.quantidade < i.comprado)
                  .sort((a, b) => (a.quantidade / (a.comprado || 1)) - (b.quantidade / (b.comprado || 1)))
                  .slice(0, 10)
                  .map(item => {
                    const consumido = item.comprado - item.quantidade;
                    const pct = item.comprado > 0 ? (item.quantidade / item.comprado) * 100 : 100;
                    return (
                      <div key={item.id} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-white font-medium text-sm">{item.nome}</p>
                            <p className="text-slate-500 text-xs">{item.codigo}</p>
                          </div>
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded",
                            pct > 60 ? "bg-emerald-500/20 text-emerald-400" :
                            pct > 30 ? "bg-amber-500/20 text-amber-400" :
                            "bg-red-500/20 text-red-400"
                          )}>
                            {pct.toFixed(0)}% restante
                          </span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full",
                              pct > 60 ? "bg-emerald-500" : pct > 30 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-slate-500">
                          <span>Restante: {item.quantidade.toLocaleString('pt-BR')} kg</span>
                          <span>Consumido: {consumido.toFixed(1)} kg</span>
                        </div>
                      </div>
                    );
                  })}
                {estoqueReal.filter(i => i.quantidade < i.comprado).length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Estoque completo — nenhum material consumido ainda.</p>
                    <p className="text-slate-500 text-xs mt-1">As deduções ocorrem automaticamente ao cortar no Kanban.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Modal de Detalhes do Material */}
      <Dialog.Root open={!!modalMaterial} onOpenChange={() => setModalMaterial(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 z-50">
            {modalMaterial && (
              <>
                <Dialog.Title className="text-xl font-bold text-white flex items-center justify-between">
                  <span>{modalMaterial.codigo}</span>
                  <span
                    className="px-3 py-1 rounded-full text-sm"
                    style={{
                      backgroundColor: `${STATUS_ESTOQUE[modalMaterial.status].cor}20`,
                      color: STATUS_ESTOQUE[modalMaterial.status].cor
                    }}
                  >
                    {STATUS_ESTOQUE[modalMaterial.status].label}
                  </span>
                </Dialog.Title>
                <p className="text-slate-400 mt-1">{modalMaterial.nome}</p>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Quantidade Atual</p>
                    <p className="text-2xl font-bold text-white">
                      {modalMaterial.quantidade.toLocaleString('pt-BR')} <span className="text-sm text-slate-400">{modalMaterial.unidade}</span>
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Valor em Estoque</p>
                    <p className="text-2xl font-bold text-emerald-400">{formatMoney(modalMaterial.valorTotal)}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Estoque Mínimo</p>
                    <p className="text-xl font-bold text-white">{modalMaterial.minimo} {modalMaterial.unidade}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Consumo Médio/Dia</p>
                    <p className="text-xl font-bold text-white">{modalMaterial.consumoMedio} {modalMaterial.unidade}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Localização</p>
                    <p className="text-xl font-bold text-white font-mono">{modalMaterial.localizacao}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Dias de Estoque</p>
                    <p className={cn(
                      "text-xl font-bold",
                      modalMaterial.diasEstoque <= 3 ? "text-red-400" :
                      modalMaterial.diasEstoque <= 7 ? "text-amber-400" : "text-emerald-400"
                    )}>
                      {modalMaterial.diasEstoque} dias
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                  <Button
                    onClick={() => toast.info('Edição em desenvolvimento')}
                    variant="outline"
                    className="border-slate-700 text-slate-300">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Dialog.Close asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">Fechar</Button>
                  </Dialog.Close>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal Import Excel */}
      <Dialog.Root open={modalImport} onOpenChange={setModalImport}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 z-50">
            <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
              Importar Materiais do Excel
            </Dialog.Title>

            <div className="mt-6">
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-blue-500/50 transition-all cursor-pointer">
                <Upload className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-white font-medium">Arraste seu arquivo Excel aqui</p>
                <p className="text-slate-400 text-sm mt-1">ou clique para selecionar</p>
                <p className="text-slate-500 text-xs mt-4">Formatos aceitos: .xlsx, .xls, .csv</p>
              </div>

              <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
                <p className="text-slate-300 text-sm font-medium mb-2">Colunas esperadas:</p>
                <p className="text-slate-400 text-xs">
                  Código, Nome, Categoria, Unidade, Quantidade, Mínimo, Máximo, Localização, Preço
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
              <Dialog.Close asChild>
                <Button variant="outline" className="border-slate-700 text-slate-300">Cancelar</Button>
              </Dialog.Close>
              <Button
                onClick={() => toast.success('Importação iniciada!')}
                className="bg-emerald-600 hover:bg-emerald-700">
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Modal Nova Movimentação */}
      <Dialog.Root open={modalMovimentacao} onOpenChange={setModalMovimentacao}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 z-50">
            <Dialog.Title className="text-xl font-bold text-white">
              Nova Movimentação de Estoque
            </Dialog.Title>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Tipo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => toast.success('Entrada selecionada')}
                    className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-500/20 flex flex-col items-center gap-2">
                    <ArrowDown className="h-6 w-6 text-emerald-400" />
                    <span className="text-white font-medium">Entrada</span>
                  </button>
                  <button
                    onClick={() => toast.success('Saída selecionada')}
                    className="p-4 rounded-xl border-2 border-slate-700 hover:border-slate-600 flex flex-col items-center gap-2">
                    <TrendingDown className="h-6 w-6 text-slate-400" />
                    <span className="text-slate-400 font-medium">Saída</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Material</label>
                <Select.Root>
                  <Select.Trigger className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white">
                    <Select.Value placeholder="Selecione o material" />
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </Select.Trigger>
                </Select.Root>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Quantidade</label>
                <Input type="number" placeholder="0" className="bg-slate-800 border-slate-700 text-white" />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Obra (opcional)</label>
                <Select.Root>
                  <Select.Trigger className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white">
                    <Select.Value placeholder="Estoque Geral" />
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </Select.Trigger>
                </Select.Root>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Observação</label>
                <Input placeholder="Observação opcional" className="bg-slate-800 border-slate-700 text-white" />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
              <Dialog.Close asChild>
                <Button variant="outline" className="border-slate-700 text-slate-300">Cancelar</Button>
              </Dialog.Close>
              <Button
                onClick={() => toast.success('Movimentação registrada!')}
                className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
