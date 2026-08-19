/**
 * MONTEX ERP Premium - Módulo de Estoque Integrado
 *
 * Conectado ao ERPContext para integração com demais módulos
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase, supabaseAdmin } from '@/api/supabaseClient';
import { motion } from 'framer-motion';
import {
  Package, Warehouse, AlertTriangle, AlertCircle, CheckCircle2,
  Search, Filter, Plus, Download, Upload, Edit, Eye,
  ChevronDown, TrendingDown, TrendingUp, BarChart3, Bell,
  Building2, RefreshCw, ArrowDown, Layers, X, Link2,
  ArrowUpRight, ArrowDownLeft, Calendar, Hash, History,
  DollarSign, Weight, Table2, LayoutGrid, ArrowUpDown, ShieldAlert, HelpCircle, Boxes
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
import {
  SAUDE, saudeItem, valorItem, pesoItem, kpisEstoque, curvaABC,
  agregadoCategoria, filtrarEstoque, ordenarEstoque,
  necessarioItem, chegouItem, faltaItem, temNecessidade,
} from '@/services/estoqueAnalytics';
import { ORIGEM_INFO, rotuloOrigem } from '@/services/rastreabilidadeEstoque';
import { normalizar } from '@/services/abastecimento';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import EstoqueEditModal from '@/components/estoque/EstoqueEditModal';
import ImportarChegadaModal from '@/components/estoque/ImportarChegadaModal';
import MovimentacaoModal from '@/components/estoque/MovimentacaoModal';
import HistoricoItemModal from '@/components/estoque/HistoricoItemModal';
// Importar hook de paginação inteligente
// Importar controles de paginação
import PaginationControls from '@/components/ui/PaginationControls';

// Ícones por saúde (o restante — label/cor/badge — vem de SAUDE no serviço)
const SAUDE_ICON = {
  zerado: X, critico: AlertCircle, baixo: AlertTriangle, atencao: AlertTriangle,
  excesso: TrendingUp, saudavel: CheckCircle2, entregue: CheckCircle2, sem_minimo: HelpCircle,
};

// Adapter para a saúde unificada (serviço) → display do card/tabela.
function getStatusEstoque(item) {
  const s = saudeItem(item);
  const cfg = SAUDE[s] || SAUDE.sem_minimo;
  return { key: s, label: cfg.label, cor: cfg.cor, badge: cfg.badge, icon: SAUDE_ICON[s] || Package };
}

const fmtMoeda = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMoedaCompact = (v) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000) return 'R$ ' + (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k';
  return fmtMoeda(n);
};
const fmtPeso = (kg) => {
  const n = Number(kg) || 0;
  if (Math.abs(n) >= 1000) return (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' t';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg';
};
const fmtNum = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

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

// Cabeçalho de coluna ordenável
function SortTh({ label, campo, ordenarPor, ordenarDir, onSort, align = 'left' }) {
  const active = ordenarPor === campo;
  return (
    <th
      className={cn('px-3 py-2 font-medium select-none cursor-pointer hover:text-white',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left')}
      onClick={() => onSort(campo)}
    >
      <span className={cn('inline-flex items-center gap-1', active && 'text-white')}>
        {label}
        <ArrowUpDown className={cn('w-3 h-3', active ? 'text-orange-400' : 'text-slate-600')} />
      </span>
    </th>
  );
}

// Card profissional de item de estoque
function ItemEstoque({ item, onEdit, obraAtual, onEntrada, onSaida, onHistorico }) {
  const status = getStatusEstoque(item);
  const StatusIcon = status.icon;
  const minimo = Number(item.minimo) || 0;
  const maximo = Number(item.maximo) || 0;
  const qtd = Number(item.quantidade) || 0;
  // Nível: contra o máximo quando houver, senão contra 2× o mínimo.
  const alvo = maximo > 0 ? maximo : (minimo > 0 ? minimo * 2 : qtd || 1);
  const nivel = Math.max(0, Math.min(100, (qtd / alvo) * 100));
  const reservadoParaObra = (item.obraReservada || item.obraId || item.obra_id) === obraAtual?.id;
  const valor = valorItem(item);

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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-base font-mono font-bold text-white truncate">{item.codigo}</span>
            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border inline-flex items-center gap-1", status.badge)}>
              <StatusIcon className="w-3 h-3" /> {status.label}
            </span>
            {reservadoParaObra && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-500/20 text-orange-300 border border-orange-500/40 flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Reservado
              </span>
            )}
          </div>
          <p className="text-slate-300 text-sm truncate" title={item.descricao}>{item.descricao}</p>
          <div className="flex items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500 flex-wrap">
            {(item.categoria || item.tipo) && <span className="inline-flex items-center gap-1"><Boxes className="w-3 h-3" />{item.categoria || item.tipo}</span>}
            {item.localizacao && <span>📍 {item.localizacao}</span>}
            {item.fornecedor && <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" />{item.fornecedor}</span>}
            <span className="inline-flex items-center gap-1"><DollarSign className="w-3 h-3" />{fmtMoeda(item.preco || item.precoUnitario || 0)}/{item.unidade}</span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-white leading-none">
            {fmtNum(qtd)}<span className="text-sm text-slate-400 ml-1">{item.unidade}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Mín {fmtNum(minimo)}{maximo > 0 ? ` · Máx ${fmtNum(maximo)}` : ''}</div>
          {valor > 0 && <div className="text-xs font-semibold text-emerald-400 mt-1">{fmtMoedaCompact(valor)}</div>}
        </div>
      </div>

      {/* Barra de nível */}
      <div className="mt-3">
        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
          <span>Nível de estoque</span>
          <span>{Math.round(nivel)}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${nivel}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(to right, ${status.cor}, ${status.cor}88)` }}
          />
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-700/50">
        <Button variant="ghost" size="sm" className="flex-1 text-slate-400 hover:text-white" onClick={() => onEdit(item)}>
          <Edit className="w-4 h-4 mr-1" /> Editar
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 text-sky-400 hover:text-sky-300" onClick={() => onHistorico?.(item)}>
          <History className="w-4 h-4 mr-1" /> Histórico
        </Button>
        <Button variant="ghost" size="sm" title="Registrar entrada" className="text-emerald-400 hover:text-emerald-300" onClick={() => onEntrada?.(item)}>
          <Plus className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" title="Registrar saída" className="text-red-400 hover:text-red-300" onClick={() => onSaida?.(item)}>
          <ArrowDown className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function EstoquePageV2() {
  // Contexto ERP
  const { estoque, movimentacoesEstoque, reloadEstoque } = useEstoque();
  const { obras, obraAtual, obraAtualData } = useObras();
  const { pecasObraAtual } = useProducao();

  // Estado local
  const [tabAtiva, setTabAtiva] = useState('visao-geral');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [filtroSaude, setFiltroSaude] = useState('todos');
  const [filtroObra, setFiltroObra] = useState('todas');
  const [flagSemPreco, setFlagSemPreco] = useState(false);
  const [flagSemMinimo, setFlagSemMinimo] = useState(false);
  const [busca, setBusca] = useState('');
  const [ordenarPor, setOrdenarPor] = useState('valor');
  const [ordenarDir, setOrdenarDir] = useState('desc');
  const [viewItens, setViewItens] = useState('tabela'); // 'tabela' | 'cards'
  const [filtroMovTipo, setFiltroMovTipo] = useState('todos');
  const [filtroMovMaterial, setFiltroMovMaterial] = useState('');
  const [filtroMovPeriodo, setFiltroMovPeriodo] = useState('todos');

  const filtrosAtivos = busca || filtroCategoria !== 'todas' || filtroSaude !== 'todos' || filtroObra !== 'todas' || flagSemPreco || flagSemMinimo;
  const limparFiltros = () => {
    setBusca(''); setFiltroCategoria('todas'); setFiltroSaude('todos');
    setFiltroObra('todas'); setFlagSemPreco(false); setFlagSemMinimo(false);
  };

  // ─── MATERIAL NECESSÁRIO para a obra selecionada (vindo de materiais_corte) ──
  const [materiaisNecessarios, setMateriaisNecessarios] = useState([]);
  const [carregandoNecessarios, setCarregandoNecessarios] = useState(false);

  // 1) Pré-filtro por OBRA.
  //  - Se a obra tem ESTOQUE PRÓPRIO (itens com obraId da obra), mostra SÓ ELE
  //    (estrito) — evita contaminar KPIs com itens de outras obras/fábrica.
  //  - Se a obra NÃO tem itens próprios, cai no fallback por BOM: itens de
  //    FÁBRICA (sem obra) cujo perfil está no BOM — nunca itens de outra obra.
  const estoquePorObra = useMemo(() => {
    const base = estoque || [];
    if (filtroObra === 'todas') return base;
    if (filtroObra === 'sem_obra') return base.filter(it => !it.obraId && !it.obra_id);
    const alvo = filtroObra === 'obra_atual' ? obraAtual : filtroObra;
    if (!alvo) return base;

    const proprios = base.filter(it => it.obraId === alvo || it.obra_id === alvo);
    if (proprios.length) return proprios; // obra tem estoque próprio → só ele

    const perfisBOM = new Set(
      (materiaisNecessarios || []).map(m => normalizar(m.perfil).slice(0, 12)).filter(Boolean)
    );
    if (!perfisBOM.size) return proprios;
    return base.filter(it => {
      if (it.obraId || it.obra_id) return false; // ignora itens de qualquer obra
      const chave = normalizar(`${it.descricao || ''} ${it.codigo || ''} ${it.perfil || ''} ${it.material || ''}`);
      for (const p of perfisBOM) if (chave.includes(p)) return true; // fábrica usada no BOM
      return false;
    });
  }, [estoque, filtroObra, obraAtual, materiaisNecessarios]);

  // 2) Filtro FUNCIONAL (busca/categoria/saúde/flags) + ordenação — via serviço
  const estoqueFiltrado = useMemo(() => {
    const filtrado = filtrarEstoque(estoquePorObra, {
      busca, categoria: filtroCategoria, saude: filtroSaude,
      semPreco: flagSemPreco, semMinimo: flagSemMinimo,
    });
    return ordenarEstoque(filtrado, ordenarPor, ordenarDir);
  }, [estoquePorObra, busca, filtroCategoria, filtroSaude, flagSemPreco, flagSemMinimo, ordenarPor, ordenarDir]);

  const obraIdParaConsulta = useMemo(() => {
    if (filtroObra === 'obra_atual') return obraAtual;
    if (filtroObra === 'todas' || filtroObra === 'sem_obra') return null;
    return filtroObra;
  }, [filtroObra, obraAtual]);

  const carregarMateriaisNecessarios = useCallback(async () => {
    if (!obraIdParaConsulta) {
      setMateriaisNecessarios([]);
      return;
    }
    setCarregandoNecessarios(true);
    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('materiais_corte')
        .select('id,marca,peca,quantidade,perfil,comprimento_mm,material,peso_teorico,status_corte,obra_id,peca_id,observacoes')
        .eq('obra_id', obraIdParaConsulta)
        .order('marca', { ascending: true });
      if (error) throw error;
      setMateriaisNecessarios(data || []);
    } catch (e) {
      console.error('[Estoque] Erro ao carregar materiais necessários:', e);
      setMateriaisNecessarios([]);
    } finally {
      setCarregandoNecessarios(false);
    }
  }, [obraIdParaConsulta]);

  useEffect(() => {
    carregarMateriaisNecessarios();
  }, [carregarMateriaisNecessarios]);

  // Resumo: agrupado por perfil+material, mostra qtd necessária × qtd em estoque
  const materiaisNecessariosResumo = useMemo(() => {
    const grupo = {};
    materiaisNecessarios.forEach(mc => {
      const key = `${(mc.perfil || '').trim()} | ${(mc.material || '').trim()}`;
      if (!grupo[key]) {
        grupo[key] = {
          perfil: mc.perfil || '—',
          material: mc.material || '—',
          qtd_necessaria: 0,
          peso_necessario: 0,
          itens: 0,
          aguardando: 0,
          cortando: 0,
          finalizado: 0,
        };
      }
      grupo[key].qtd_necessaria += Number(mc.quantidade) || 0;
      grupo[key].peso_necessario += Number(mc.peso_teorico) || 0;
      grupo[key].itens += 1;
      const st = (mc.status_corte || 'aguardando').toLowerCase();
      if (st === 'finalizado') grupo[key].finalizado += 1;
      else if (st === 'cortando' || st === 'em_corte') grupo[key].cortando += 1;
      else grupo[key].aguardando += 1;
    });

    // Chaparia da obra: no estoque, as chapas entram como 1 item agregado
    // "CHAPARIA" (não por perfil). Se essa chaparia está entregue, todas as
    // chapas (CH…) do BOM contam como COBERTAS.
    const chapariaObra = (estoque || []).find(e =>
      (e.obraId === obraIdParaConsulta || e.obra_id === obraIdParaConsulta) &&
      (String(e.categoria || '').toLowerCase() === 'chaparia' ||
       String(e.codigo || e.perfil || '').toUpperCase().includes('CHAPARIA'))
    );
    const chapariaEntregue = !!chapariaObra && faltaItem(chapariaObra) <= 0 &&
      (Number(chapariaObra.comprado) > 0 || Number(chapariaObra.quantidade) > 0);

    // Compara com estoque (descricao/codigo contendo o perfil)
    const lista = Object.values(grupo).map(g => {
      const ehChapa = String(g.perfil || '').trim().toUpperCase().startsWith('CH');
      if (ehChapa && chapariaEntregue) {
        // Coberta pela chaparia agregada entregue.
        return {
          ...g,
          peso_necessario: Math.round(g.peso_necessario * 100) / 100,
          qtd_estoque: g.qtd_necessaria,
          item_estoque: chapariaObra,
          status: 'ok',
          chaparia: true,
        };
      }
      const correspondencia = (estoque || []).find(e => {
        const desc = `${e.descricao || ''} ${e.codigo || ''} ${e.material || ''}`.toLowerCase();
        return desc.includes((g.perfil || '').toLowerCase().slice(0, 12));
      });
      const qtdEstoque = Number(correspondencia?.quantidade) || 0;
      const status = qtdEstoque >= g.qtd_necessaria
        ? 'ok'
        : qtdEstoque > 0 ? 'parcial' : 'falta';
      return {
        ...g,
        peso_necessario: Math.round(g.peso_necessario * 100) / 100,
        qtd_estoque: qtdEstoque,
        item_estoque: correspondencia,
        status,
      };
    });
    return lista.sort((a, b) => (a.status === 'falta' ? -1 : 0) - (b.status === 'falta' ? -1 : 0));
  }, [materiaisNecessarios, estoque, obraIdParaConsulta]);

  // Paginação CLIENT-SIDE sobre o array já filtrado (estoqueFiltrado).
  // Antes usávamos useSmartPagination, mas em modo server-side ele faz query
  // direta ao Supabase e ignora o filtro já aplicado — por isso as outras
  // obras "vazavam" mesmo com o filtro selecionado.
  const PAGE_SIZE_ESTOQUE = 30;
  const [paginaItens, setPaginaItens] = useState(0);

  // Reset de página quando o conjunto filtrado muda
  useEffect(() => {
    setPaginaItens(0);
  }, [filtroObra, filtroCategoria, filtroSaude, flagSemPreco, flagSemMinimo, busca, ordenarPor, ordenarDir]);

  const paginationItens = useMemo(() => {
    const totalCount = estoqueFiltrado.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE_ESTOQUE));
    const page = Math.min(paginaItens, Math.max(0, totalPages - 1));
    const start = page * PAGE_SIZE_ESTOQUE;
    const data = estoqueFiltrado.slice(start, start + PAGE_SIZE_ESTOQUE);
    return {
      data,
      loading: false,
      page,
      totalCount,
      totalPages,
      hasMore: page < totalPages - 1,
      pageSize: PAGE_SIZE_ESTOQUE,
      nextPage: () => setPaginaItens(p => Math.min(p + 1, totalPages - 1)),
      prevPage: () => setPaginaItens(p => Math.max(0, p - 1)),
      goToPage: (p) => setPaginaItens(Math.max(0, Math.min(p, totalPages - 1))),
      refresh: () => setPaginaItens(0),
    };
  }, [estoqueFiltrado, paginaItens]);

  // KPIs consolidados (serviço) — refletem o filtro global
  const kpis = useMemo(() => kpisEstoque(estoqueFiltrado), [estoqueFiltrado]);

  // Donut de saúde do estoque (só as classes com contagem > 0)
  const dadosSaudePie = useMemo(() =>
    Object.keys(SAUDE)
      .map(k => ({ key: k, name: SAUDE[k].label, value: kpis.porSaude[k] || 0, color: SAUDE[k].cor }))
      .filter(d => d.value > 0),
  [kpis]);

  // Valor por categoria (top 8) e Curva ABC
  const dadosCategoria = useMemo(() =>
    agregadoCategoria(estoqueFiltrado).slice(0, 8).map(c => ({
      name: (c.categoria || '—').substring(0, 12), valor: Math.round(c.valor), nItens: c.nItens,
    })),
  [estoqueFiltrado]);

  const abc = useMemo(() => curvaABC(estoqueFiltrado), [estoqueFiltrado]);

  // Itens em alerta (zerado/crítico/baixo), mais urgentes primeiro
  const itensAlerta = useMemo(
    () => ordenarEstoque(estoqueFiltrado.filter(i => ['zerado', 'critico', 'baixo'].includes(saudeItem(i))), 'saude', 'asc'),
    [estoqueFiltrado]
  );

  // Movimentações filtradas — também respeitam o filtro global (obra + busca)
  const movimentacoesFiltradas = useMemo(() => {
    let movs = [...(movimentacoesEstoque || [])];

    // Filtro GLOBAL por obra
    if (filtroObra && filtroObra !== 'todas') {
      const idsEstoqueValidos = new Set((estoqueFiltrado || []).map(i => i.id));
      movs = movs.filter(m =>
        (m.obra_id && m.obra_id === (filtroObra === 'obra_atual' ? obraAtual : filtroObra)) ||
        (m.obraId && m.obraId === (filtroObra === 'obra_atual' ? obraAtual : filtroObra)) ||
        idsEstoqueValidos.has(m.itemId) || idsEstoqueValidos.has(m.estoque_id)
      );
    }

    // Filtro GLOBAL por busca (código/descrição do material)
    if (busca && busca.trim()) {
      const t = busca.toLowerCase();
      movs = movs.filter(m =>
        (m.materialPerfil || '').toLowerCase().includes(t) ||
        (m.itemId || '').toLowerCase().includes(t) ||
        (m.motivo || '').toLowerCase().includes(t)
      );
    }

    // Filtro por tipo (local da aba)
    if (filtroMovTipo !== 'todos') {
      movs = movs.filter(m => m.tipo === filtroMovTipo);
    }

    // Filtro por material (local da aba)
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

  // ── Edição direta + importação de chegada ──────────────────────────────
  const [editItem, setEditItem] = useState(null);   // item em edição (null = novo)
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [mov, setMov] = useState(null);             // { item, tipo } — entrada/saída
  const [histItem, setHistItem] = useState(null);   // item do histórico (rastreabilidade)

  const handleEdit = (item) => { setEditItem(item); setEditOpen(true); };
  const handleNovo = () => { setEditItem(null); setEditOpen(true); };
  const handleEntrada = (item) => setMov({ item, tipo: 'entrada' });
  const handleSaida = (item) => setMov({ item, tipo: 'saida' });
  const handleHistorico = (item) => setHistItem(item);
  const toggleSort = (campo) => {
    if (ordenarPor === campo) setOrdenarDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setOrdenarPor(campo); setOrdenarDir(campo === 'codigo' || campo === 'descricao' || campo === 'categoria' ? 'asc' : 'desc'); }
  };

  // Exporta o estoque JÁ FILTRADO para XLSX (respeita filtros globais).
  const exportarEstoque = () => {
    const dados = estoqueFiltrado.map((i) => ({
      Codigo: i.codigo || '',
      Descricao: i.descricao || i.nome || '',
      Categoria: i.categoria || i.tipo || '',
      Quantidade: Number(i.quantidade) || 0,
      Unidade: i.unidade || '',
      Minimo: Number(i.minimo) || 0,
      Preco: Number(i.preco) || 0,
      Fornecedor: i.fornecedor || '',
      Localizacao: i.localizacao || '',
      Obra: i.obra_id || i.obraId || '',
    }));
    if (!dados.length) { toast.info('Nenhum item para exportar com os filtros atuais'); return; }
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estoque');
    const d = new Date();
    const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    XLSX.writeFile(wb, `estoque_${hoje}.xlsx`);
    toast.success(`${dados.length} item(ns) exportado(s)`);
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
          <Button onClick={() => setImportOpen(true)} variant="outline" className="border-emerald-700/60 text-emerald-300 hover:bg-emerald-800/20">
            <Upload className="w-4 h-4 mr-2" />
            Importar Chegada
          </Button>
          <Button onClick={exportarEstoque} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={handleNovo} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
            <Plus className="w-4 h-4 mr-2" />
            Novo Item
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard title="Valor em Estoque" value={fmtMoedaCompact(kpis.valorTotal)} subtitle={`${fmtNum(kpis.nItens)} itens`} icon={DollarSign} color="green" />
        <KPICard title="Peso Total" value={fmtPeso(kpis.pesoTotal)} subtitle="em aço/materiais" icon={Weight} color="blue" />
        <button onClick={() => { setFiltroSaude('alerta'); setTabAtiva('itens'); }} className="text-left w-full">
          <KPICard title="Em Alerta" value={fmtNum(kpis.alertas)} subtitle="crítico + baixo + zerado" icon={ShieldAlert} color="red" />
        </button>
        <KPICard title="Saudáveis" value={fmtNum(kpis.saudaveis)} subtitle={`${kpis.nItens ? Math.round((kpis.saudaveis / kpis.nItens) * 100) : 0}% do total`} icon={CheckCircle2} color="green" />
        <button onClick={() => { setFlagSemPreco(true); setTabAtiva('itens'); }} className="text-left w-full">
          <KPICard title="Sem Preço" value={fmtNum(kpis.semPreco)} subtitle="sem custo cadastrado" icon={DollarSign} color="orange" />
        </button>
        <button onClick={() => { setFlagSemMinimo(true); setTabAtiva('itens'); }} className="text-left w-full">
          <KPICard title="Sem Mínimo" value={fmtNum(kpis.semMinimo)} subtitle="fora do radar de reposição" icon={AlertTriangle} color="purple" />
        </button>
      </div>

      {/* Faltante da obra — aparece quando há necessidade cadastrada (pedido>0) */}
      {kpis.itensComNecessidade > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Necessário (obra)" value={fmtPeso(kpis.totalNecessario)} subtitle={`${kpis.itensComNecessidade} perfis`} icon={Layers} color="blue" />
          <KPICard title="Já chegou" value={fmtPeso(kpis.totalChegou)} subtitle={kpis.coberturaPct != null ? `${kpis.coberturaPct}% de cobertura` : ''} icon={ArrowDownLeft} color="green" />
          <KPICard title="Falta chegar" value={fmtPeso(kpis.totalFalta)} subtitle={`${kpis.itensComFalta} perfis faltando`} icon={AlertTriangle} color={kpis.totalFalta > 0 ? 'red' : 'green'} />
          <KPICard title="Cobertura" value={kpis.coberturaPct != null ? `${kpis.coberturaPct}%` : '—'} subtitle="chegou / necessário" icon={CheckCircle2} color={kpis.coberturaPct >= 100 ? 'green' : 'orange'} />
        </div>
      )}

      {/* Painel de alertas — itens em alerta no escopo filtrado */}
      {itensAlerta.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-3 mb-3">
            <Bell className="w-5 h-5 text-red-400 animate-pulse" />
            <h3 className="text-white font-semibold">Itens em alerta</h3>
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">{itensAlerta.length}</span>
            <button onClick={() => { setFiltroSaude('alerta'); setTabAtiva('itens'); }} className="ml-auto text-[11px] px-2 py-1 rounded bg-slate-700/40 border border-slate-600/40 text-slate-300 hover:text-white">
              Ver todos
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {itensAlerta.slice(0, 8).map(item => {
              const st = getStatusEstoque(item);
              return (
                <button key={item.id} onClick={() => handleHistorico(item)} className="bg-slate-800/50 rounded-lg p-3 flex items-center gap-3 text-left hover:bg-slate-800">
                  <st.icon className="w-5 h-5 flex-shrink-0" style={{ color: st.cor }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-medium text-sm truncate">{item.codigo || item.descricao || `Item ${item.id}`}</p>
                    <p className="text-slate-400 text-xs">{fmtNum(item.quantidade)} / mín {fmtNum(item.minimo)} {item.unidade || ''}</p>
                  </div>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded border', st.badge)}>{st.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ─── FILTROS GLOBAIS — afetam TODAS as sub-tabs ──────────────────── */}
      <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-semibold text-white">Filtros</h3>
          <span className="text-[10px] text-slate-500 ml-1">aplicam-se a todas as sub-páginas</span>
          {filtrosAtivos && (
            <button
              onClick={limparFiltros}
              className="ml-auto text-[10px] px-2 py-1 rounded bg-slate-700/40 border border-slate-600/40 text-slate-400 hover:text-white"
            >
              Limpar filtros
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar por código, descrição ou material..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white"
            />
          </div>

          <Select.Root value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <Select.Trigger className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-300 min-w-[160px]">
              <Filter className="w-4 h-4" />
              <Select.Value placeholder="Categoria" />
              <ChevronDown className="w-4 h-4 ml-auto" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-50">
                <Select.Viewport className="p-1">
                  <Select.Item value="todas" className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded cursor-pointer outline-none">
                    <Select.ItemText>Todas Categorias</Select.ItemText>
                  </Select.Item>
                  {CATEGORIAS_MATERIAL.map(cat => (
                    <Select.Item key={cat.id} value={cat.id} className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded cursor-pointer outline-none">
                      <Select.ItemText>{cat.icone} {cat.nome}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          <Select.Root value={filtroSaude} onValueChange={setFiltroSaude}>
            <Select.Trigger className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-300 min-w-[150px]">
              <ShieldAlert className="w-4 h-4" />
              <Select.Value placeholder="Saúde" />
              <ChevronDown className="w-4 h-4 ml-auto" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-50">
                <Select.Viewport className="p-1">
                  <Select.Item value="todos" className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded cursor-pointer outline-none">
                    <Select.ItemText>Toda Saúde</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="alerta" className="px-3 py-2 text-sm text-red-300 hover:bg-slate-700 rounded cursor-pointer outline-none">
                    <Select.ItemText>⚠ Em alerta (crít.+baixo+zerado)</Select.ItemText>
                  </Select.Item>
                  {Object.keys(SAUDE).map((k) => (
                    <Select.Item key={k} value={k} className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded cursor-pointer outline-none">
                      <Select.ItemText>{SAUDE[k].label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          {/* Toggles rápidos */}
          <button
            onClick={() => setFlagSemPreco(v => !v)}
            className={cn('px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
              flagSemPreco ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-white')}
          >
            Sem preço
          </button>
          <button
            onClick={() => setFlagSemMinimo(v => !v)}
            className={cn('px-3 py-2 rounded-lg text-xs font-medium border transition-colors',
              flagSemMinimo ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:text-white')}
          >
            Sem mínimo
          </button>

          <Select.Root value={filtroObra} onValueChange={setFiltroObra}>
            <Select.Trigger className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-300 min-w-[220px]">
              <Building2 className="w-4 h-4" />
              <Select.Value placeholder="Obra" />
              <ChevronDown className="w-4 h-4 ml-auto" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden z-50 max-h-72">
                <Select.Viewport className="p-1">
                  <Select.Item value="todas" className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded cursor-pointer outline-none">
                    <Select.ItemText>📦 Todas as Obras + Geral</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="sem_obra" className="px-3 py-2 text-sm text-cyan-400 hover:bg-slate-700 rounded cursor-pointer outline-none">
                    <Select.ItemText>🏭 Fábrica (Geral — sem obra)</Select.ItemText>
                  </Select.Item>
                  {obraAtualData && (
                    <Select.Item value="obra_atual" className="px-3 py-2 text-sm text-orange-400 hover:bg-slate-700 rounded cursor-pointer outline-none">
                      <Select.ItemText>🔗 Obra Atual ({obraAtualData?.codigo})</Select.ItemText>
                    </Select.Item>
                  )}
                  <div className="my-1 border-t border-slate-700/60" />
                  {(obras || []).map(o => (
                    <Select.Item key={o.id} value={o.id} className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded cursor-pointer outline-none">
                      <Select.ItemText>
                        {o.codigo ? `${o.codigo} · ` : ''}{o.nome}
                      </Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      </div>

      {/* Tabs */}
      <Tabs.Root value={tabAtiva} onValueChange={setTabAtiva}>
        <Tabs.List className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
          {[
            { id: 'visao-geral', label: 'Visão Geral', icon: BarChart3 },
            { id: 'itens', label: 'Lista de Itens', icon: Layers },
            { id: 'necessario', label: 'Necessário p/ Obra', icon: Building2 },
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
              {/* Saúde do estoque (donut) */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-orange-400" /> Saúde do Estoque</h3>
                {dadosSaudePie.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-slate-500 text-sm">Sem itens no escopo atual.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={dadosSaudePie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" nameKey="name">
                        {dadosSaudePie.map((entry) => (<Cell key={entry.key} fill={entry.color} />))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} labelStyle={{ color: '#f8fafc' }} formatter={(v, n) => [`${v} itens`, n]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Valor por categoria */}
              <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Boxes className="w-4 h-4 text-amber-400" /> Valor por Categoria</h3>
                {dadosCategoria.length === 0 ? (
                  <div className="h-[250px] flex items-center justify-center text-slate-500 text-sm">Sem valor no escopo atual.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dadosCategoria} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={90} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} labelStyle={{ color: '#f8fafc' }} formatter={(v) => [fmtMoeda(v), 'Valor']} />
                      <Bar dataKey="valor" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Curva ABC (Pareto) */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-400" /> Curva ABC — concentração de valor</h3>
                <div className="flex items-center gap-2 text-[11px]">
                  {[['A', '#10b981'], ['B', '#f59e0b'], ['C', '#64748b']].map(([cl, cor]) => (
                    <span key={cl} className="px-2 py-0.5 rounded border" style={{ color: cor, borderColor: `${cor}66` }}>
                      Classe {cl}: {abc.resumo[cl].n} itens · {fmtMoedaCompact(abc.resumo[cl].valor)}
                    </span>
                  ))}
                </div>
              </div>
              {abc.rows.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">Cadastre preços nos itens para ver a curva ABC.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-slate-400 text-xs border-b border-slate-700/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Item</th>
                        <th className="text-center px-3 py-2 font-medium">Classe</th>
                        <th className="text-right px-3 py-2 font-medium">Valor</th>
                        <th className="text-right px-3 py-2 font-medium">% do total</th>
                        <th className="text-right px-3 py-2 font-medium">Acum.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {abc.rows.slice(0, 12).map((r) => (
                        <tr key={r.id} className="hover:bg-slate-800/40">
                          <td className="px-3 py-2">
                            <span className="text-white font-mono text-xs">{r.codigo}</span>
                            <span className="text-slate-500 text-xs ml-2 truncate">{r.descricao}</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={cn('text-[10px] px-2 py-0.5 rounded font-bold border',
                              r._classe === 'A' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : r._classe === 'B' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-500/20 text-slate-300 border-slate-500/40')}>{r._classe}</span>
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-400 font-medium">{fmtMoeda(r._valor)}</td>
                          <td className="px-3 py-2 text-right text-slate-400 text-xs">{r._pct.toFixed(1)}%</td>
                          <td className="px-3 py-2 text-right text-slate-400 text-xs">{r._acumPct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {abc.rows.length > 12 && <p className="text-center text-xs text-slate-500 mt-2">Mostrando os 12 itens de maior valor de {abc.rows.length}.</p>}
                </div>
              )}
            </div>
          </Tabs.Content>

          {/* Lista de Itens */}
          <Tabs.Content value="itens">
            <div className="mb-3 text-xs text-slate-400">
              Exibindo <strong className="text-white">{paginationItens.totalCount}</strong> de <strong className="text-white">{estoque.length}</strong> itens
              {filtroObra !== 'todas' && (
                <span> · obra: <strong className="text-orange-400">{
                  filtroObra === 'sem_obra' ? 'Fábrica (Geral)' :
                  filtroObra === 'obra_atual' ? obraAtualData?.codigo :
                  (obras || []).find(o => o.id === filtroObra)?.codigo || filtroObra
                }</strong></span>
              )}
              {(filtroObra !== 'todas' && filtroObra !== 'sem_obra') && (
                <span className="text-slate-500"> · reservados + materiais do BOM da obra{carregandoNecessarios ? ' (carregando BOM…)' : ''}</span>
              )}
            </div>
            {/* Barra de ferramentas: toggle de visualização */}
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Ordenar por</span>
                <select value={`${ordenarPor}:${ordenarDir}`} onChange={(e) => { const [c, d] = e.target.value.split(':'); setOrdenarPor(c); setOrdenarDir(d); }}
                  className="bg-slate-800/60 border border-slate-700 rounded-lg text-white text-xs px-2 py-1.5 focus:outline-none">
                  <option value="valor:desc">Maior valor</option>
                  <option value="valor:asc">Menor valor</option>
                  <option value="saude:asc">Mais urgente</option>
                  <option value="quantidade:desc">Maior saldo</option>
                  <option value="quantidade:asc">Menor saldo</option>
                  <option value="codigo:asc">Código (A→Z)</option>
                  <option value="categoria:asc">Categoria</option>
                </select>
              </div>
              <div className="inline-flex rounded-lg border border-slate-700 overflow-hidden">
                <button onClick={() => setViewItens('tabela')} className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium', viewItens === 'tabela' ? 'bg-orange-500 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-white')}>
                  <Table2 className="w-4 h-4" /> Tabela
                </button>
                <button onClick={() => setViewItens('cards')} className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium', viewItens === 'cards' ? 'bg-orange-500 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-white')}>
                  <LayoutGrid className="w-4 h-4" /> Cards
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {paginationItens.totalCount === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Nenhum item encontrado com os filtros aplicados</p>
                  {filtrosAtivos && <button onClick={limparFiltros} className="mt-3 text-xs text-orange-400 hover:text-orange-300">Limpar filtros</button>}
                </div>
              ) : viewItens === 'tabela' ? (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900/60 text-slate-400 text-xs">
                        <tr>
                          <SortTh label="Item" campo="codigo" ordenarPor={ordenarPor} ordenarDir={ordenarDir} onSort={toggleSort} />
                          <SortTh label="Categoria" campo="categoria" ordenarPor={ordenarPor} ordenarDir={ordenarDir} onSort={toggleSort} />
                          <SortTh label="Saúde" campo="saude" ordenarPor={ordenarPor} ordenarDir={ordenarDir} onSort={toggleSort} align="center" />
                          <SortTh label="Saldo" campo="quantidade" ordenarPor={ordenarPor} ordenarDir={ordenarDir} onSort={toggleSort} align="right" />
                          <th className="text-right px-3 py-2 font-medium">Necessário</th>
                          <th className="text-right px-3 py-2 font-medium">Falta</th>
                          <th className="text-right px-3 py-2 font-medium">Mín/Máx</th>
                          <th className="text-right px-3 py-2 font-medium">R$/un</th>
                          <SortTh label="Valor" campo="valor" ordenarPor={ordenarPor} ordenarDir={ordenarDir} onSort={toggleSort} align="right" />
                          <th className="text-right px-3 py-2 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {paginationItens.data.map(item => {
                          const st = getStatusEstoque(item);
                          return (
                            <tr key={item.id} className="hover:bg-slate-800/40">
                              <td className="px-3 py-2">
                                <div className="text-white font-mono text-xs font-medium">{item.codigo}</div>
                                <div className="text-slate-500 text-xs truncate max-w-[240px]" title={item.descricao}>{item.descricao}</div>
                              </td>
                              <td className="px-3 py-2 text-slate-300 text-xs">{item.categoria || item.tipo || '—'}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border', st.badge)}>
                                  <st.icon className="w-3 h-3" /> {st.label}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right text-white font-semibold">{fmtNum(item.quantidade)} <span className="text-slate-500 text-[10px]">{item.unidade}</span></td>
                              <td className="px-3 py-2 text-right text-slate-400 text-xs">{temNecessidade(item) ? fmtNum(necessarioItem(item)) : '—'}</td>
                              <td className="px-3 py-2 text-right text-xs">{temNecessidade(item) ? (faltaItem(item) > 0 ? <span className="text-red-400 font-semibold">{fmtNum(faltaItem(item))}</span> : <span className="text-emerald-400">0</span>) : '—'}</td>
                              <td className="px-3 py-2 text-right text-slate-400 text-xs">{fmtNum(item.minimo)}{Number(item.maximo) > 0 ? ` / ${fmtNum(item.maximo)}` : ''}</td>
                              <td className="px-3 py-2 text-right text-slate-400 text-xs">{fmtMoeda(item.preco || item.precoUnitario || 0)}</td>
                              <td className="px-3 py-2 text-right text-emerald-400 font-medium text-xs">{fmtMoedaCompact(valorItem(item))}</td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => handleEdit(item)} title="Editar" className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white"><Edit className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleHistorico(item)} title="Histórico" className="p-1.5 rounded hover:bg-slate-700 text-sky-400"><History className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleEntrada(item)} title="Entrada" className="p-1.5 rounded hover:bg-slate-700 text-emerald-400"><Plus className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleSaida(item)} title="Saída" className="p-1.5 rounded hover:bg-slate-700 text-red-400"><ArrowDown className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paginationItens.data.map(item => (
                    <ItemEstoque key={item.id} item={item} onEdit={handleEdit} onEntrada={handleEntrada} onSaida={handleSaida} onHistorico={handleHistorico} obraAtual={obraAtualData} />
                  ))}
                </div>
              )}

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

          {/* === MATERIAL NECESSÁRIO PARA A OBRA SELECIONADA === */}
          <Tabs.Content value="necessario">
            <div className="space-y-4">
              {/* Header da tab */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <Building2 className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Material Necessário</h3>
                    <p className="text-xs text-slate-400">
                      {obraIdParaConsulta
                        ? `Obra selecionada: ${(obras || []).find(o => o.id === obraIdParaConsulta)?.codigo || obraIdParaConsulta}`
                        : 'Selecione uma obra específica no filtro acima para ver os materiais necessários'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50">
                    <span className="text-slate-400">Itens BOM:</span>
                    <span className="text-white font-bold ml-1">{materiaisNecessarios.length}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50">
                    <span className="text-slate-400">Peso total:</span>
                    <span className="text-orange-400 font-bold ml-1">
                      {materiaisNecessarios.reduce((s, m) => s + (Number(m.peso_teorico) || 0), 0).toFixed(1)} kg
                    </span>
                  </div>
                  <button
                    onClick={carregarMateriaisNecessarios}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:text-white"
                  >
                    <RefreshCw className={cn('w-3 h-3', carregandoNecessarios && 'animate-spin')} />
                    Atualizar
                  </button>
                </div>
              </div>

              {!obraIdParaConsulta ? (
                <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-xl p-10 text-center">
                  <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Filtre por uma obra específica para visualizar a lista de material necessário.</p>
                </div>
              ) : (
                <>
                  {/* Cobertura do BOM pelo estoque */}
                  <div className="grid grid-cols-3 gap-3">
                    {(() => {
                      const ok = materiaisNecessariosResumo.filter(g => g.status === 'ok').length;
                      const parcial = materiaisNecessariosResumo.filter(g => g.status === 'parcial').length;
                      const falta = materiaisNecessariosResumo.filter(g => g.status === 'falta').length;
                      return [
                        { label: 'Cobertos', v: ok, cor: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
                        { label: 'Parciais', v: parcial, cor: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
                        { label: 'Faltando', v: falta, cor: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
                      ].map(c => (
                        <div key={c.label} className={cn('rounded-xl border p-4', c.bg)}>
                          <p className="text-xs text-slate-400">{c.label}</p>
                          <p className={cn('text-2xl font-bold', c.cor)}>{c.v}</p>
                          <p className="text-[11px] text-slate-500">perfis</p>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* RESUMO POR PERFIL (cruzamento BOM × Estoque) */}
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700/50">
                      <h4 className="text-sm font-semibold text-white">Resumo por Perfil — Necessário vs Estoque</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-900/60">
                          <tr className="text-slate-400 text-xs">
                            <th className="text-left px-4 py-2 font-medium">Perfil</th>
                            <th className="text-left px-3 py-2 font-medium">Material</th>
                            <th className="text-right px-3 py-2 font-medium">Qtd Necessária</th>
                            <th className="text-right px-3 py-2 font-medium">Peso Necessário</th>
                            <th className="text-right px-3 py-2 font-medium">Estoque atual</th>
                            <th className="text-center px-3 py-2 font-medium">Status</th>
                            <th className="text-center px-3 py-2 font-medium">Corte</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {materiaisNecessariosResumo.map((g, idx) => {
                            const statusCfg = g.chaparia
                              ? { txt: '✓ Entregue', cls: 'bg-green-500/20 text-green-300 border-green-500/30' }
                              : {
                                  ok:      { txt: '✓ OK',      cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                                  parcial: { txt: '⚠ Parcial', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                                  falta:   { txt: '✗ Faltando', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
                                }[g.status];
                            return (
                              <tr key={idx} className="hover:bg-slate-800/40">
                                <td className="px-4 py-2 text-white font-mono text-xs">{g.perfil}</td>
                                <td className="px-3 py-2 text-slate-300 text-xs">{g.material}</td>
                                <td className="px-3 py-2 text-right text-white font-medium">{g.qtd_necessaria}</td>
                                <td className="px-3 py-2 text-right text-orange-400 font-mono text-xs">{g.peso_necessario.toFixed(1)} kg</td>
                                <td className="px-3 py-2 text-right">
                                  {g.chaparia ? (
                                    <span className="font-mono text-xs text-green-300">entregue</span>
                                  ) : (
                                    <span className={cn('font-mono text-xs', g.qtd_estoque >= g.qtd_necessaria ? 'text-emerald-400' : g.qtd_estoque > 0 ? 'text-amber-400' : 'text-red-400')}>
                                      {g.qtd_estoque} {g.item_estoque?.unidade || ''}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border', statusCfg.cls)}>
                                    {statusCfg.txt}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center text-[10px] text-slate-400">
                                  {g.finalizado}/{g.itens} · cortar {g.aguardando}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {materiaisNecessariosResumo.length === 0 && (
                      <div className="text-center py-10 text-slate-500 text-sm">Nenhum BOM cadastrado para esta obra.</div>
                    )}
                  </div>

                  {/* DETALHE — BOM completo (lista de materiais_corte) */}
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700/50">
                      <h4 className="text-sm font-semibold text-white">BOM Detalhado — {materiaisNecessarios.length} item(ns)</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-900/60">
                          <tr className="text-slate-400">
                            <th className="text-left px-3 py-2 font-medium">Marca</th>
                            <th className="text-left px-3 py-2 font-medium">Conjunto</th>
                            <th className="text-left px-3 py-2 font-medium">Perfil</th>
                            <th className="text-right px-3 py-2 font-medium">Comp.</th>
                            <th className="text-left px-3 py-2 font-medium">Material</th>
                            <th className="text-right px-3 py-2 font-medium">Qtd</th>
                            <th className="text-right px-3 py-2 font-medium">Peso</th>
                            <th className="text-center px-3 py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {materiaisNecessarios.map(mc => (
                            <tr key={mc.id} className="hover:bg-slate-800/40">
                              <td className="px-3 py-2 text-white font-mono">{mc.marca}</td>
                              <td className="px-3 py-2 text-slate-300">{mc.peca}</td>
                              <td className="px-3 py-2 text-slate-300">{mc.perfil}</td>
                              <td className="px-3 py-2 text-right text-slate-400 font-mono">{mc.comprimento_mm} mm</td>
                              <td className="px-3 py-2 text-slate-400">{mc.material}</td>
                              <td className="px-3 py-2 text-right text-white">{mc.quantidade}</td>
                              <td className="px-3 py-2 text-right text-orange-400 font-mono">{(Number(mc.peso_teorico) || 0).toFixed(1)} kg</td>
                              <td className="px-3 py-2 text-center">
                                <span className={cn(
                                  'inline-flex px-2 py-0.5 rounded text-[10px] font-medium border',
                                  mc.status_corte === 'finalizado' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : mc.status_corte === 'cortando' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-slate-700/40 text-slate-400 border-slate-600/40'
                                )}>{mc.status_corte || 'aguardando'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
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
                        <th className="text-left text-slate-400 font-medium px-4 py-3">Origem</th>
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
                          <td colSpan={8} className="text-center py-12 text-slate-500">
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
                            <td className="px-4 py-3">
                              <span className={cn('text-[10px] px-2 py-0.5 rounded border', ORIGEM_INFO[mov.origem]?.cor || 'bg-slate-500/20 text-slate-300 border-slate-500/40')}>
                                {rotuloOrigem(mov.origem)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-white font-medium">
                              {mov.materialPerfil || mov.material || mov.itemId || '-'}
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
            {(() => {
              // Filtra estoque pela OBRA selecionada no filtro global.
              // Se filtro = "todas" ou "sem_obra", usa a obra atual como fallback.
              const obraFiltrada = filtroObra === 'obra_atual' ? obraAtual
                                  : (filtroObra && filtroObra !== 'todas' && filtroObra !== 'sem_obra') ? filtroObra
                                  : obraAtual;
              const obraNome = (obras || []).find(o => o.id === obraFiltrada)?.codigo
                              || obraAtualData?.codigo
                              || '—';
              const itensVinculados = (estoque || []).filter(i =>
                i.obra_id === obraFiltrada ||
                i.obraId === obraFiltrada ||
                i.obraReservada === obraFiltrada
              );
              return (
                <div className="space-y-4">
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex flex-wrap items-center gap-4 justify-between">
                    <div className="flex items-center gap-4">
                      <Link2 className="w-6 h-6 text-orange-400" />
                      <div>
                        <h3 className="text-white font-semibold">Materiais Reservados para {obraNome}</h3>
                        <p className="text-slate-400 text-sm">
                          {itensVinculados.length} item(ns) vinculado(s) {obraFiltrada ? '' : '· nenhuma obra selecionada'}
                        </p>
                      </div>
                    </div>
                    {itensVinculados.length > 0 && (
                      <div className="flex items-center gap-3 text-xs">
                        <div className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                          <span className="text-slate-400">Valor:</span>
                          <span className="text-emerald-400 font-bold ml-1">{fmtMoedaCompact(itensVinculados.reduce((s, i) => s + valorItem(i), 0))}</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
                          <span className="text-slate-400">Peso:</span>
                          <span className="text-orange-400 font-bold ml-1">{fmtPeso(itensVinculados.reduce((s, i) => s + pesoItem(i), 0))}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {itensVinculados.map(item => (
                      <ItemEstoque
                        key={item.id}
                        item={item}
                        onEdit={handleEdit}
                        onEntrada={handleEntrada}
                        onSaida={handleSaida}
                        onHistorico={handleHistorico}
                        obraAtual={(obras || []).find(o => o.id === obraFiltrada) || obraAtualData}
                      />
                    ))}
                  </div>

                  {itensVinculados.length === 0 && (
                    <div className="text-center py-12">
                      <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">Nenhum material reservado para esta obra</p>
                      <p className="text-slate-500 text-xs mt-1">
                        Selecione uma obra no filtro acima para ver seus materiais reservados.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </Tabs.Content>
        </div>
      </Tabs.Root>

      {/* Edição direta / novo item */}
      <EstoqueEditModal
        open={editOpen}
        item={editItem}
        obras={obras}
        obraAtual={obraAtual}
        onClose={() => setEditOpen(false)}
        onSaved={() => reloadEstoque?.()}
      />

      {/* Importação da chegada de materiais (planilha / foto / PDF) */}
      <ImportarChegadaModal
        open={importOpen}
        estoque={estoque}
        obras={obras}
        obraAtual={obraAtual}
        onClose={() => setImportOpen(false)}
        onImported={() => reloadEstoque?.()}
      />

      {/* Entrada / Saída manual com anexo (foto/PDF) */}
      <MovimentacaoModal
        open={!!mov}
        item={mov?.item}
        tipo={mov?.tipo}
        obraAtual={obraAtual}
        onClose={() => setMov(null)}
        onSaved={() => reloadEstoque?.()}
      />

      {/* Rastreabilidade — extrato de movimentações do item */}
      <HistoricoItemModal
        open={!!histItem}
        item={histItem}
        movimentacoes={movimentacoesEstoque}
        onClose={() => setHistItem(null)}
      />
    </div>
  );
}
