/**
 * MONTEX ERP Premium - Módulo de Estoque Integrado
 *
 * Conectado ao ERPContext para integração com demais módulos
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Warehouse, AlertTriangle, AlertCircle, CheckCircle2,
  Search, Filter, Plus, Download, Upload, Edit, Eye,
  ChevronDown, TrendingDown, TrendingUp, BarChart3, Bell,
  Building2, RefreshCw, ArrowDown, Layers, X, Link2,
  ArrowUpRight, ArrowDownLeft, Calendar, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as Tabs from '@radix-ui/react-tabs';
import * as Select from '@radix-ui/react-select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

// Importa o contexto ERP
import { useEstoque, useObras, useProducao } from '@/contexts/ERPContext';
import { CATEGORIAS_MATERIAL } from '@/data/database';
// Importar hook de paginação inteligente
import { useSmartPagination } from '@/hooks/useSmartPagination';
// Importar controles de paginação
import PaginationControls from '@/components/ui/PaginationControls';

// Status de estoque
const STATUS_ESTOQUE = {
  normal: { label: 'Normal', cor: '#10b981', icon: CheckCircle2, bg: 'bg-emerald-500/20' },
  baixo: { label: 'Baixo', cor: '#f59e0b', icon: AlertTriangle, bg: 'bg-yellow-500/20' },
  critico: { label: 'Crítico', cor: '#ef4444', icon: AlertCircle, bg: 'bg-red-500/20' },
  zerado: { label: 'Zerado', cor: '#64748b', icon: X, bg: 'bg-slate-500/20' },
};

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#64748b', '#3b82f6', '#8b5cf6'];

function getStatusEstoque(item) {
  if (item.quantidade === 0) return STATUS_ESTOQUE.zerado;
  if (item.quantidade <= item.minimo * 0.5) return STATUS_ESTOQUE.critico;
  if (item.quantidade <= item.minimo) return STATUS_ESTOQUE.baixo;
  return STATUS_ESTOQUE.normal;
}

// Card de KPI
function KPICard({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) {
  const colorMap = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-emerald-500 to-teal-500',
    orange: 'from-orange-500 to-amber-500',
    red: 'from-red-500 to-rose-500',
    purple: 'from-purple-500 to-pink-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-slate-500 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorMap[color]}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={cn(
          "flex items-center gap-1 mt-3 text-sm",
          trend >= 0 ? "text-emerald-400" : "text-red-400"
        )}>
          {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{Math.abs(trend)}% vs mês anterior</span>
        </div>
      )}
    </motion.div>
  );
}

// Componente de Item de Estoque
function ItemEstoque({ item, onEdit, onVerMais, obraAtual }) {
  const status = getStatusEstoque(item);
  const StatusIcon = status.icon;
  const porcentagemUsada = Math.min(100, (item.quantidade / (item.minimo * 2)) * 100);
  const reservadoParaObra = (item.obraReservada || item.obraId || item.obra_id) === obraAtual?.id;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "bg-slate-800/50 rounded-xl border p-4 hover:bg-slate-800/80 transition-all",
        reservadoParaObra ? "border-orange-500/50" : "border-slate-700/50"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-mono font-bold text-white">{item.codigo}</span>
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", status.bg)} style={{ color: status.cor }}>
              {status.label}
            </span>
            {reservadoParaObra && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400 flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                Reservado
              </span>
            )}
          </div>
          <p className="text-slate-300 text-sm truncate">{item.descricao}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
            <span>📍 {item.localizacao}</span>
            <span>📦 {item.categoria || item.tipo}</span>
            <span>💰 R$ {(item.preco || item.precoUnitario || 0).toFixed(2)}/{item.unidade}</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {item.quantidade.toLocaleString()}
            <span className="text-sm text-slate-400 ml-1">{item.unidade}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Mín: {item.minimo} | Reserv: {item.reservado || 0}
          </div>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Nível</span>
          <span>{Math.round(porcentagemUsada)}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${porcentagemUsada}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(to right, ${status.cor}, ${status.cor}88)`
            }}
          />
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
        <Button variant="ghost" size="sm" className="flex-1 text-slate-400 hover:text-white" onClick={() => onVerMais(item)}>
          <Eye className="w-4 h-4 mr-1" /> Detalhes
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 text-slate-400 hover:text-white" onClick={() => onEdit(item)}>
          <Edit className="w-4 h-4 mr-1" /> Editar
        </Button>
        <Button variant="ghost" size="sm" className="text-emerald-400 hover:text-emerald-300">
          <Plus className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
          <ArrowDown className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function EstoquePageV2() {
  // Contexto ERP
  const { estoque, estoqueObraAtual, alertasEstoque, consumirEstoque, adicionarEstoque, addNotificacao, movimentacoesEstoque } = useEstoque();
  const { obras, obraAtual, obraAtualData } = useObras();
  const { pecasObraAtual } = useProducao();

  // Estado local
  const [tabAtiva, setTabAtiva] = useState('visao-geral');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroObra, setFiltroObra] = useState('todas');
  const [busca, setBusca] = useState('');
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [filtroMovTipo, setFiltroMovTipo] = useState('todos');
  const [filtroMovMaterial, setFiltroMovMaterial] = useState('');
  const [filtroMovPeriodo, setFiltroMovPeriodo] = useState('todos');

  // Filtra estoque
  const estoqueFiltrado = useMemo(() => {
    let items = filtroObra === 'obra_atual' ? estoqueObraAtual : estoque;

    if (filtroCategoria !== 'todas') {
      items = items.filter(item => (item.categoria || item.tipo) === filtroCategoria);
    }

    if (filtroStatus !== 'todos') {
      items = items.filter(item => {
        const status = getStatusEstoque(item);
        return status.label.toLowerCase() === filtroStatus;
      });
    }

    if (busca) {
      const termoBusca = busca.toLowerCase();
      items = items.filter(item =>
        item.codigo.toLowerCase().includes(termoBusca) ||
        item.descricao.toLowerCase().includes(termoBusca)
      );
    }

    return items;
  }, [estoque, estoqueObraAtual, filtroCategoria, filtroStatus, filtroObra, busca]);

  // Hook de paginação inteligente para a tab de itens
  const paginationItens = useSmartPagination('estoque', estoqueFiltrado, {
    pageSize: 30,
    orderBy: 'updated_at',
    ascending: false,
    filters: {},
    search: '',
    searchColumn: 'codigo',
  });

  // Hook de paginação inteligente para itens vinculados à obra
  const paginationVinculados = useSmartPagination('estoque', estoqueObraAtual, {
    pageSize: 30,
    orderBy: 'updated_at',
    ascending: false,
    filters: {},
    search: '',
    searchColumn: 'codigo',
  });

  // Estatísticas
  const estatisticas = useMemo(() => {
    const total = estoque.length;
    const normal = estoque.filter(i => getStatusEstoque(i).label === 'Normal').length;
    const baixo = estoque.filter(i => getStatusEstoque(i).label === 'Baixo').length;
    const critico = estoque.filter(i => getStatusEstoque(i).label === 'Crítico').length;
    const zerado = estoque.filter(i => getStatusEstoque(i).label === 'Zerado').length;

    const valorTotal = estoque.reduce((acc, item) => acc + ((Number(item.quantidade) || 0) * (Number(item.preco || item.precoUnitario) || 0)), 0);
    const itensReservados = estoque.filter(i => i.reservado > 0).length;

    return { total, normal, baixo, critico, zerado, valorTotal, itensReservados };
  }, [estoque]);

  // Dados para gráficos
  const dadosStatusPie = [
    { name: 'Normal', value: estatisticas.normal, color: '#10b981' },
    { name: 'Baixo', value: estatisticas.baixo, color: '#f59e0b' },
    { name: 'Crítico', value: estatisticas.critico, color: '#ef4444' },
    { name: 'Zerado', value: estatisticas.zerado, color: '#64748b' },
  ];

  const dadosCategoriaBar = CATEGORIAS_MATERIAL.map(cat => ({
    name: cat.nome.substring(0, 8),
    quantidade: estoque.filter(i => (i.categoria || i.tipo) === cat.id).length,
    valor: estoque.filter(i => (i.categoria || i.tipo) === cat.id).reduce((acc, i) => acc + ((Number(i.quantidade) || 0) * (Number(i.preco || i.precoUnitario) || 0)), 0) / 1000
  }));

  // Movimentações filtradas
  const movimentacoesFiltradas = useMemo(() => {
    let movs = [...(movimentacoesEstoque || [])];

    // Filtro por tipo
    if (filtroMovTipo !== 'todos') {
      movs = movs.filter(m => m.tipo === filtroMovTipo);
    }

    // Filtro por material
    if (filtroMovMaterial.trim()) {
      const termo = filtroMovMaterial.toLowerCase();
      movs = movs.filter(m =>
        m.materialPerfil?.toLowerCase().includes(termo) ||
        m.itemId?.toLowerCase().includes(termo) ||
        m.motivo?.toLowerCase().includes(termo)
      );
    }

    // Filtro por período
    if (filtroMovPeriodo !== 'todos') {
      const now = new Date();
      let dataLimite;
      if (filtroMovPeriodo === '7d') dataLimite = new Date(now.setDate(now.getDate() - 7));
      else if (filtroMovPeriodo === '30d') dataLimite = new Date(now.setDate(now.getDate() - 30));
      else if (filtroMovPeriodo === '90d') dataLimite = new Date(now.setDate(now.getDate() - 90));
      if (dataLimite) {
        movs = movs.filter(m => new Date(m.data) >= dataLimite);
      }
    }

    // Ordenar por data decrescente
    movs.sort((a, b) => new Date(b.data) - new Date(a.data));
    return movs;
  }, [movimentacoesEstoque, filtroMovTipo, filtroMovMaterial, filtroMovPeriodo]);

  // Resumo das movimentações
  const resumoMovimentacoes = useMemo(() => {
    const entradas = (movimentacoesEstoque || []).filter(m => m.tipo === 'entrada');
    const saidas = (movimentacoesEstoque || []).filter(m => m.tipo === 'saida');
    const totalEntrada = entradas.reduce((acc, m) => acc + (Number(m.quantidade) || 0), 0);
    const totalSaida = saidas.reduce((acc, m) => acc + (Number(m.quantidade) || 0), 0);

    // Agrupar saídas por material
    const porMaterial = {};
    saidas.forEach(m => {
      const key = m.materialPerfil || m.itemId || 'Outro';
      if (!porMaterial[key]) porMaterial[key] = { material: key, quantidade: 0, pecas: 0 };
      porMaterial[key].quantidade += Number(m.quantidade) || 0;
      porMaterial[key].pecas += 1;
    });

    // Agrupar por dia
    const porDia = {};
    (movimentacoesEstoque || []).forEach(m => {
      const dia = m.data ? new Date(m.data).toISOString().split('T')[0] : 'sem-data';
      if (!porDia[dia]) porDia[dia] = { dia, entradas: 0, saidas: 0 };
      if (m.tipo === 'entrada') porDia[dia].entradas += Number(m.quantidade) || 0;
      else porDia[dia].saidas += Number(m.quantidade) || 0;
    });

    return {
      totalEntrada,
      totalSaida,
      saldo: totalEntrada - totalSaida,
      qtdEntradas: entradas.length,
      qtdSaidas: saidas.length,
      porMaterial: Object.values(porMaterial).sort((a, b) => b.quantidade - a.quantidade),
      porDia: Object.values(porDia).sort((a, b) => a.dia.localeCompare(b.dia)),
    };
  }, [movimentacoesEstoque]);

  const handleEdit = (item) => {
    setItemSelecionado(item);
    setModalAberto(true);
  };

  const handleVerMais = (item) => {
    setItemSelecionado(item);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Warehouse className="w-8 h-8 text-amber-500" />
            Gestão de Estoque
          </h1>
          <p className="text-slate-400 mt-1">
            {obraAtualData ? (
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Obra: <span className="text-orange-400 font-medium">{obraAtualData.codigo}</span> - {obraAtualData.nome}
              </span>
            ) : (
              'Controle de materiais integrado com produção'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Upload className="w-4 h-4 mr-2" />
            Importar Excel
          </Button>
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
            <Plus className="w-4 h-4 mr-2" />
            Novo Item
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total de Itens"
          value={estatisticas.total}
          subtitle={`${estatisticas.itensReservados} reservados`}
          icon={Package}
          color="blue"
        />
        <KPICard
          title="Valor em Estoque"
          value={`R$ ${(isNaN(estatisticas.valorTotal) ? 0 : estatisticas.valorTotal / 1000).toFixed(0)}k`}
          subtitle="Valor total"
          icon={BarChart3}
          color="green"
          trend={8.5}
        />
        <KPICard
          title="Estoque Normal"
          value={estatisticas.normal}
          subtitle={`${((estatisticas.normal / estatisticas.total) * 100).toFixed(0)}% do total`}
          icon={CheckCircle2}
          color="green"
        />
        <KPICard
          title="Estoque Baixo"
          value={estatisticas.baixo + estatisticas.critico}
          subtitle="Requer atenção"
          icon={AlertTriangle}
          color="orange"
        />
        <KPICard
          title="Alertas Críticos"
          value={alertasEstoque.length}
          subtitle="Itens abaixo do mínimo"
          icon={AlertCircle}
          color="red"
        />
      </div>

      {/* Alertas de Estoque */}
      {alertasEstoque.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <Bell className="w-5 h-5 text-red-400 animate-pulse" />
            <h3 className="text-white font-semibold">Alertas de Estoque Baixo</h3>
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
              {alertasEstoque.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {alertasEstoque.slice(0, 4).map(item => (
              <div key={item.id} className="bg-slate-800/50 rounded-lg p-3 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm truncate">{item.codigo || item.descricao || item.nome || `Item ${item.id}`}</p>
                  <p className="text-slate-400 text-xs">
                    {item.quantidadeAtual ?? item.quantidade ?? 0} / {item.quantidadeMinima ?? item.minimo ?? 0} {item.unidade || 'un'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs.Root value={tabAtiva} onValueChange={setTabAtiva}>
        <Tabs.List className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
          {[
            { id: 'visao-geral', label: 'Visão Geral', icon: BarChart3 },
            { id: 'itens', label: 'Lista de Itens', icon: Layers },
            { id: 'movimentacoes', label: 'Movimentações', icon: RefreshCw },
            { id: 'vinculados', label: 'Vinculados à Obra', icon: Link2 },
          ].map(tab => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                tabAtiva === tab.id
                  ? "bg-orange-500 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Conteúdo das Tabs */}
        <div className="mt-6">
          {/* Visão Geral */}
          <Tabs.Content value="visao-geral">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Status */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-white font-semibold mb-4">Status do Estoque</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={dadosStatusPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dadosStatusPie.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#f8fafc' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfico por Categoria */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-white font-semibold mb-4">Valor por Categoria (R$ mil)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dadosCategoriaBar}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                      labelStyle={{ color: '#f8fafc' }}
                    />
                    <Bar dataKey="valor" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Tabs.Content>

          {/* Lista de Itens */}
          <Tabs.Content value="itens">
            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700"
                />
              </div>

              <Select.Root value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <Select.Trigger className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-300">
                  <Filter className="w-4 h-4" />
                  <Select.Value placeholder="Categoria" />
                  <ChevronDown className="w-4 h-4" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-50">
                    <Select.Viewport className="p-1">
                      <Select.Item value="todas" className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded cursor-pointer">
                        <Select.ItemText>Todas Categorias</Select.ItemText>
                      </Select.Item>
                      {CATEGORIAS_MATERIAL.map(cat => (
                        <Select.Item key={cat.id} value={cat.id} className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded cursor-pointer">
                          <Select.ItemText>{cat.icone} {cat.nome}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              <Select.Root value={filtroStatus} onValueChange={setFiltroStatus}>
                <Select.Trigger className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-300">
                  <Select.Value placeholder="Status" />
                  <ChevronDown className="w-4 h-4" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-50">
                    <Select.Viewport className="p-1">
                      <Select.Item value="todos" className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded cursor-pointer">
                        <Select.ItemText>Todos Status</Select.ItemText>
                      </Select.Item>
                      {Object.entries(STATUS_ESTOQUE).map(([key, val]) => (
                        <Select.Item key={key} value={val.label.toLowerCase()} className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded cursor-pointer">
                          <Select.ItemText>{val.label}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>

              <Select.Root value={filtroObra} onValueChange={setFiltroObra}>
                <Select.Trigger className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-300">
                  <Building2 className="w-4 h-4" />
                  <Select.Value placeholder="Obra" />
                  <ChevronDown className="w-4 h-4" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-50">
                    <Select.Viewport className="p-1">
                      <Select.Item value="todas" className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded cursor-pointer">
                        <Select.ItemText>Todas as Obras</Select.ItemText>
                      </Select.Item>
                      <Select.Item value="obra_atual" className="px-3 py-2 text-sm text-orange-400 hover:bg-slate-700 rounded cursor-pointer">
                        <Select.ItemText>🔗 Obra Atual ({obraAtualData?.codigo})</Select.ItemText>
                      </Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* Grid de Itens */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginationItens.data.map(item => (
                  <ItemEstoque
                    key={item.id}
                    item={item}
                    onEdit={handleEdit}
                    onVerMais={handleVerMais}
                    obraAtual={obraAtualData}
                  />
                ))}
              </div>

              {paginationItens.totalCount === 0 && (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Nenhum item encontrado com os filtros aplicados</p>
                </div>
              )}

              {/* Pagination Controls */}
              {paginationItens.totalPages > 1 && (
                <PaginationControls
                  page={paginationItens.page}
                  totalPages={paginationItens.totalPages}
                  totalCount={paginationItens.totalCount}
                  onPrev={paginationItens.prevPage}
                  onNext={paginationItens.nextPage}
                  onGoToPage={paginationItens.goToPage}
                  pageSize={paginationItens.pageSize}
                  loading={paginationItens.loading}
                />
              )}
            </div>
          </Tabs.Content>

          {/* Movimentações */}
          <Tabs.Content value="movimentacoes">
            <div className="space-y-4">
              {/* KPIs de Movimentação */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <ArrowDownLeft className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase">Entradas</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{resumoMovimentacoes.qtdEntradas}</p>
                  <p className="text-xs text-slate-400">{(resumoMovimentacoes.totalEntrada / 1000).toFixed(1)}t recebidas</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-red-400 mb-1">
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase">Saídas</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{resumoMovimentacoes.qtdSaidas}</p>
                  <p className="text-xs text-slate-400">{(resumoMovimentacoes.totalSaida / 1000).toFixed(1)}t consumidas</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-1">
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase">Saldo</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{(resumoMovimentacoes.saldo / 1000).toFixed(1)}t</p>
                  <p className="text-xs text-slate-400">Entrada - Saída</p>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-orange-400 mb-1">
                    <Hash className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase">Materiais</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{resumoMovimentacoes.porMaterial.length}</p>
                  <p className="text-xs text-slate-400">Tipos consumidos</p>
                </div>
              </div>

              {/* Filtros */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Buscar por material, código..."
                      value={filtroMovMaterial}
                      onChange={e => setFiltroMovMaterial(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <select
                    value={filtroMovTipo}
                    onChange={e => setFiltroMovTipo(e.target.value)}
                    className="bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="todos">Todos Tipos</option>
                    <option value="entrada">Entradas</option>
                    <option value="saida">Saídas</option>
                  </select>
                  <select
                    value={filtroMovPeriodo}
                    onChange={e => setFiltroMovPeriodo(e.target.value)}
                    className="bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="todos">Todo Período</option>
                    <option value="7d">Últimos 7 dias</option>
                    <option value="30d">Últimos 30 dias</option>
                    <option value="90d">Últimos 90 dias</option>
                  </select>
                  <span className="text-xs text-slate-500">{movimentacoesFiltradas.length} registros</span>
                </div>
              </div>

              {/* Gráfico de Movimentações por Dia */}
              {resumoMovimentacoes.porDia.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-orange-400" />
                    Movimentações por Dia
                  </h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={resumoMovimentacoes.porDia} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="dia" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}t`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: 8 }}
                          labelStyle={{ color: '#fff' }}
                          formatter={(v, name) => [`${(v/1000).toFixed(1)}t`, name === 'entradas' ? 'Entradas' : 'Saídas']}
                          labelFormatter={v => `Data: ${v}`}
                        />
                        <Bar dataKey="entradas" fill="#10b981" name="entradas" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="saidas" fill="#ef4444" name="saidas" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tabela de Movimentações */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="text-left text-slate-400 font-medium px-4 py-3">Data</th>
                        <th className="text-left text-slate-400 font-medium px-4 py-3">Tipo</th>
                        <th className="text-left text-slate-400 font-medium px-4 py-3">Material</th>
                        <th className="text-right text-slate-400 font-medium px-4 py-3">Quantidade</th>
                        <th className="text-left text-slate-400 font-medium px-4 py-3">Motivo</th>
                        <th className="text-left text-slate-400 font-medium px-4 py-3">Responsável</th>
                        <th className="text-left text-slate-400 font-medium px-4 py-3">Setor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimentacoesFiltradas.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-slate-500">
                            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            Nenhuma movimentação encontrada
                          </td>
                        </tr>
                      ) : (
                        movimentacoesFiltradas.slice(0, 50).map((mov, idx) => (
                          <tr key={mov.id || idx} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                            <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                              {mov.data ? new Date(mov.data).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                mov.tipo === 'entrada'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {mov.tipo === 'entrada' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-white font-medium">
                              {mov.materialPerfil || mov.itemId || '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              <span className={mov.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}>
                                {mov.tipo === 'entrada' ? '+' : '-'}{Number(mov.quantidade || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} kg
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400 max-w-[250px] truncate" title={mov.motivo}>
                              {mov.motivo || '-'}
                            </td>
                            <td className="px-4 py-3 text-slate-300">{mov.responsavel || '-'}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded bg-slate-700/50 text-xs text-slate-400 uppercase">
                                {mov.setor || '-'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {movimentacoesFiltradas.length > 50 && (
                  <div className="px-4 py-3 border-t border-slate-700/30 text-center text-sm text-slate-500">
                    Mostrando 50 de {movimentacoesFiltradas.length} registros
                  </div>
                )}
              </div>

              {/* Consumo por Material */}
              {resumoMovimentacoes.porMaterial.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-orange-400" />
                    Consumo por Material (Saídas)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {resumoMovimentacoes.porMaterial.map((mat, idx) => (
                      <div key={idx} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium text-sm truncate">{mat.material}</span>
                          <span className="text-red-400 font-mono text-sm">{(mat.quantidade / 1000).toFixed(1)}t</span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                          <div
                            className="bg-red-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, (mat.quantidade / resumoMovimentacoes.totalSaida) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{mat.pecas} movimentação(ões)</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* Vinculados à Obra */}
          <Tabs.Content value="vinculados">
            <div className="space-y-4">
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center gap-4">
                <Link2 className="w-6 h-6 text-orange-400" />
                <div>
                  <h3 className="text-white font-semibold">Materiais Reservados para {obraAtualData?.codigo}</h3>
                  <p className="text-slate-400 text-sm">
                    {estoqueObraAtual.length} itens vinculados à obra atual
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paginationVinculados.data.map(item => (
                    <ItemEstoque
                      key={item.id}
                      item={item}
                      onEdit={handleEdit}
                      onVerMais={handleVerMais}
                      obraAtual={obraAtualData}
                    />
                  ))}
                </div>

                {paginationVinculados.totalCount === 0 && (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">Nenhum material reservado para esta obra</p>
                  </div>
                )}

                {/* Pagination Controls */}
                {paginationVinculados.totalPages > 1 && (
                  <PaginationControls
                    page={paginationVinculados.page}
                    totalPages={paginationVinculados.totalPages}
                    totalCount={paginationVinculados.totalCount}
                    onPrev={paginationVinculados.prevPage}
                    onNext={paginationVinculados.nextPage}
                    onGoToPage={paginationVinculados.goToPage}
                    pageSize={paginationVinculados.pageSize}
                    loading={paginationVinculados.loading}
                  />
                )}
              </div>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
