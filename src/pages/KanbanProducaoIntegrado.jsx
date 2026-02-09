/**
 * MONTEX ERP Premium - Kanban Produção Integrado
 *
 * Fluxo: FABRICAÇÃO → SOLDA → PINTURA → EXPEDIDO
 * BASE DE DADOS DE PRODUÇÃO INDEPENDENTE COM CONTROLE DE PESO/STATUS
 * Importação de LISTA DE CONJUNTOS
 */

import React, { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToExcel } from '@/utils/exportUtils';
import {
  Package, Wrench, Zap, Paintbrush, Truck,
  ChevronDown, Search, Plus, Eye, Edit,
  Building2, ArrowRight, TrendingUp,
  Layers, BarChart3, DollarSign,
  Download, FileSpreadsheet, X as XIcon,
  Database, Play, LayoutGrid, Table2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertTriangle, CheckCircle2, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as Select from '@radix-ui/react-select';
import * as Dialog from '@radix-ui/react-dialog';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// Contexto ERP e Database
import { useObras } from '@/contexts/ERPContext';
import { listasMaterial, obras as obrasDB, pecasProducao } from '@/data/database';
import { getDetalhamentoByNumero } from '@/data/detalhamentoDatabase';
import { getEMByConjunto, getEMInfoByConjunto, getTipoByConjunto, ETAPAS_PRODUCAO_DETALHADAS } from '@/data/producaoMapping';
import { getBOMByConjunto, getTotalPecasByConjunto } from '@/data/conjuntoBOM';
import { getCroquiByMarca } from '@/data/croquiDatabase';
import { contarCortadasParaConjunto, isMarcaCortada, subscribeCorteChanges } from '@/data/corteStatusStore';

// Colunas do Kanban de Produção
const COLUNAS_PRODUCAO = [
  {
    id: 'fabricacao',
    title: '🔧 Fabricação',
    subtitle: 'Montagem',
    cor: '#3b82f6',
    icon: Wrench,
    valorKg: 0,
    descricao: 'Montagem de conjuntos'
  },
  {
    id: 'solda',
    title: '⚡ Solda',
    subtitle: 'Soldagem',
    cor: '#8b5cf6',
    icon: Zap,
    valorKg: 0,
    descricao: 'Processo de soldagem'
  },
  {
    id: 'pintura',
    title: '🎨 Pintura',
    subtitle: 'Acabamento',
    cor: '#ec4899',
    icon: Paintbrush,
    valorKg: 0,
    descricao: 'Jateamento e pintura'
  },
  {
    id: 'expedido',
    title: '✅ Expedido',
    subtitle: 'Pronto',
    cor: '#10b981',
    icon: Truck,
    valorKg: 0,
    descricao: 'Pronto para envio'
  },
];

// Cores para gráficos
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981'];

export default function KanbanProducaoIntegrado() {
  // ERPContext - dados reais
  const { obras } = useObras();

  // ========================================
  // BASE DE DADOS DE PRODUÇÃO INDEPENDENTE
  // ========================================
  const [producaoFabrica, setProducaoFabrica] = useState([]);
  const [ordemProducaoAtual, setOrdemProducaoAtual] = useState(null);

  // Estados de filtro
  const [obraFiltro, setObraFiltro] = useState('todas');
  const [prioridadeFiltro, setPrioridadeFiltro] = useState('todas');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [busca, setBusca] = useState('');
  const [conjuntoSelecionado, setConjuntoSelecionado] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);

  // Estados para Nova Ordem de Produção
  const [modalNovaOrdem, setModalNovaOrdem] = useState(false);
  const [etapaModal, setEtapaModal] = useState(1);
  const [obraSelecionada, setObraSelecionada] = useState(null);
  const [planilhaSelecionada, setPlanilhaSelecionada] = useState(null);
  const [itensImportados, setItensImportados] = useState([]);

  // Estado para modo de visualização (kanban ou lista)
  const [modoVisualizacao, setModoVisualizacao] = useState('kanban');

  // Estado para forçar re-render quando corte muda
  const [corteVersion, setCorteVersion] = useState(0);
  useEffect(() => {
    const unsub = subscribeCorteChanges(() => setCorteVersion(v => v + 1));
    return unsub;
  }, []);

  // Paginação para modo lista
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);
  const [ordenacao, setOrdenacao] = useState({ campo: 'conjunto', direcao: 'asc' });

  // ========================================
  // AUTO-CARREGAR dados de pecasProducao no mount
  // ========================================
  useEffect(() => {
    if (producaoFabrica.length === 0 && pecasProducao && pecasProducao.length > 0) {
      // Mapear etapa do database → status do kanban
      const mapEtapaToStatus = (etapa) => {
        switch (etapa) {
          case 'aguardando': return 'fabricacao'; // Aguardando entra como fabricação
          case 'corte': return 'fabricacao';       // Corte → fabricação (croquis já cortados)
          case 'fabricacao': return 'fabricacao';
          case 'solda': return 'solda';
          case 'pintura': return 'pintura';
          case 'expedido': return 'expedido';
          default: return 'fabricacao';
        }
      };

      const conjuntosConvertidos = pecasProducao.map((peca) => {
        const status = mapEtapaToStatus(peca.etapa);
        const obraRef = obrasDB?.find(o => o.id === peca.obraId);
        return {
          id: peca.id,
          conjunto: peca.marca,
          tipo: peca.tipo,
          descricao: `${peca.tipo} - ${peca.perfil || peca.material}`,
          pecas: 1,
          quantidade: peca.quantidade || 1,
          pesoTotal: peca.peso || 0,
          pesoUnitario: peca.quantidade > 0 ? (peca.peso || 0) / peca.quantidade : 0,
          material: peca.material || peca.perfil || '',
          prioridade: peca.prioridade || 'normal',
          status,
          progresso: 0,
          obraId: peca.obraId || 'OBR001',
          obraNome: obraRef?.nome || 'SUPER LUNA - BELO VALE',
          dataImportacao: new Date().toISOString(),
          statusProducao: {
            fabricado: ['solda', 'pintura', 'expedido'].includes(status),
            soldado: ['pintura', 'expedido'].includes(status),
            pintado: status === 'expedido',
            expedido: status === 'expedido',
            dataFabricacao: null,
            dataSolda: null,
            dataPintura: null,
            dataExpedicao: null,
            equipe: null,
            observacoes: ''
          }
        };
      });

      setProducaoFabrica(conjuntosConvertidos);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Obter obras disponíveis
  const obrasDisponiveis = useMemo(() => {
    const obrasFromDB = obrasDB || [];
    const obrasFromContext = obras || [];
    const todasObras = [...obrasFromDB];

    obrasFromContext.forEach(o => {
      if (!todasObras.find(ob => ob.id === o.id)) {
        todasObras.push(o);
      }
    });

    return todasObras;
  }, [obras]);

  // Obter listas de conjuntos por obra
  const listasPorObra = useMemo(() => {
    if (!obraSelecionada) return [];
    return listasMaterial.filter(l =>
      l.obraId === obraSelecionada.id && l.tipo === 'lista_conjuntos'
    );
  }, [obraSelecionada]);

  // Formatar peso
  const formatPeso = (kg) => {
    if (!kg || isNaN(kg)) return '0 kg';
    return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${kg.toLocaleString('pt-BR')} kg`;
  };

  // Formatar valor
  const formatValor = (valor) => {
    return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  // ========================================
  // FUNÇÕES DE IMPORTAÇÃO
  // ========================================

  const importarPlanilhaCompleta = () => {
    if (!planilhaSelecionada || !planilhaSelecionada.itens) return;

    const itensConvertidos = planilhaSelecionada.itens.map((item, idx) => {
      return {
        id: `PROD-FAB-${Date.now()}-${idx}`,
        // Dados do conjunto
        conjunto: item.conjunto || `CJ${idx + 1}`,
        tipo: item.tipo || 'DIVERSOS',
        descricao: item.descricao || 'Conjunto',
        pecas: item.pecas || 1,
        quantidade: item.quantidade || 1,
        pesoTotal: item.peso || 0,
        pesoUnitario: item.quantidade > 0 ? (item.peso || 0) / item.quantidade : 0,
        material: item.material || 'A36',
        prioridade: item.prioridade || 'normal',

        // Dados de produção
        status: 'fabricacao',
        progresso: 0,

        // Rastreamento
        obraId: obraSelecionada?.id || 'OBR001',
        obraNome: obraSelecionada?.nome || 'SUPER LUNA - BELO VALE',
        planilhaOrigem: planilhaSelecionada.arquivo,
        dataImportacao: new Date().toISOString(),

        // Status de produção
        statusProducao: {
          fabricado: false,
          soldado: false,
          pintado: false,
          expedido: false,
          dataFabricacao: null,
          dataSolda: null,
          dataPintura: null,
          dataExpedicao: null,
          equipe: null,
          observacoes: ''
        }
      };
    });

    setItensImportados(itensConvertidos);
    setEtapaModal(3);
  };

  // Confirmar importação
  const confirmarImportacao = () => {
    const totalConjuntos = itensImportados.length;
    const totalPecas = itensImportados.reduce((sum, item) => sum + item.pecas * item.quantidade, 0);
    const pesoTotal = itensImportados.reduce((sum, item) => sum + item.pesoTotal, 0);

    const novaOrdem = {
      id: `OP-${Date.now()}`,
      numero: `OP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
      obra: obraSelecionada,
      planilha: planilhaSelecionada,
      totalConjuntos,
      totalPecas,
      pesoTotal,
      dataGeracao: new Date().toISOString(),
      status: 'em_producao',
      itens: itensImportados
    };

    setProducaoFabrica(prev => [...prev, ...itensImportados]);
    setOrdemProducaoAtual(novaOrdem);

    setModalNovaOrdem(false);
    setEtapaModal(1);
    setObraSelecionada(null);
    setPlanilhaSelecionada(null);
    setItensImportados([]);
  };

  // ========================================
  // GESTÃO DE PRODUÇÃO
  // ========================================

  const moverConjunto = (conjuntoId, novoStatus) => {
    setProducaoFabrica(prev => prev.map(c => {
      if (c.id === conjuntoId) {
        const agora = new Date().toISOString();
        const statusProducao = { ...c.statusProducao };

        if (novoStatus === 'solda') {
          statusProducao.fabricado = true;
          statusProducao.dataFabricacao = agora;
        } else if (novoStatus === 'pintura') {
          statusProducao.soldado = true;
          statusProducao.dataSolda = agora;
        } else if (novoStatus === 'expedido') {
          statusProducao.pintado = true;
          statusProducao.dataPintura = agora;
          statusProducao.expedido = true;
          statusProducao.dataExpedicao = agora;
        }

        return { ...c, status: novoStatus, statusProducao };
      }
      return c;
    }));
  };

  // Agrupar conjuntos por coluna
  const conjuntosPorColuna = useMemo(() => {
    const conjuntosFiltrados = producaoFabrica.filter(c => {
      if (obraFiltro !== 'todas' && c.obraNome !== obraFiltro) return false;
      if (prioridadeFiltro !== 'todas' && c.prioridade !== prioridadeFiltro) return false;
      if (tipoFiltro !== 'todos' && c.tipo !== tipoFiltro) return false;
      if (busca) {
        const termoBusca = busca.toLowerCase();
        if (!c.conjunto.toLowerCase().includes(termoBusca) &&
            !c.tipo.toLowerCase().includes(termoBusca) &&
            !c.descricao.toLowerCase().includes(termoBusca)) {
          return false;
        }
      }
      return true;
    });

    const agrupado = {};
    COLUNAS_PRODUCAO.forEach(col => {
      agrupado[col.id] = conjuntosFiltrados.filter(c => c.status === col.id);
    });
    return agrupado;
  }, [producaoFabrica, obraFiltro, prioridadeFiltro, tipoFiltro, busca]);

  // KPIs
  const kpis = useMemo(() => {
    const conjuntosFiltrados = producaoFabrica.filter(c => {
      if (obraFiltro !== 'todas' && c.obraNome !== obraFiltro) return false;
      return true;
    });

    const totalConjuntos = conjuntosFiltrados.length;
    const totalPecas = conjuntosFiltrados.reduce((sum, c) => sum + c.pecas * c.quantidade, 0);
    const pesoTotal = conjuntosFiltrados.reduce((sum, c) => sum + c.pesoTotal, 0);
    const expedidos = conjuntosFiltrados.filter(c => c.status === 'expedido').length;
    const altaPrioridade = conjuntosFiltrados.filter(c => c.prioridade === 'alta').length;

    // Peso por status
    const pesoFabricacao = conjuntosFiltrados.filter(c => c.status === 'fabricacao').reduce((sum, c) => sum + c.pesoTotal, 0);
    const pesoSolda = conjuntosFiltrados.filter(c => c.status === 'solda').reduce((sum, c) => sum + c.pesoTotal, 0);
    const pesoPintura = conjuntosFiltrados.filter(c => c.status === 'pintura').reduce((sum, c) => sum + c.pesoTotal, 0);
    const pesoExpedido = conjuntosFiltrados.filter(c => c.status === 'expedido').reduce((sum, c) => sum + c.pesoTotal, 0);

    // Valor de medição
    const valorFabricacao = pesoFabricacao * 2.50;
    const valorSolda = pesoSolda * 3.00;
    const valorPintura = pesoPintura * 1.80;
    const valorTotal = valorFabricacao + valorSolda + valorPintura;

    const progressoGeral = pesoTotal > 0 ? Math.round((pesoExpedido / pesoTotal) * 100) : 0;

    return {
      totalConjuntos,
      totalPecas,
      pesoTotal,
      expedidos,
      altaPrioridade,
      pesoFabricacao,
      pesoSolda,
      pesoPintura,
      pesoExpedido,
      valorTotal,
      progressoGeral
    };
  }, [producaoFabrica, obraFiltro]);

  // Dados para gráfico
  const dadosGrafico = COLUNAS_PRODUCAO.map((col, idx) => {
    const conjuntosColuna = conjuntosPorColuna[col.id] || [];
    return {
      name: col.title.replace(/[^\w\s]/g, '').trim(),
      quantidade: conjuntosColuna.length,
      peso: conjuntosColuna.reduce((sum, c) => sum + c.pesoTotal, 0),
      fill: col.cor
    };
  });

  // Obter obras únicas para filtro
  const obrasUnicas = useMemo(() => {
    const nomes = new Set(producaoFabrica.map(c => c.obraNome));
    return Array.from(nomes);
  }, [producaoFabrica]);

  // Obter tipos únicos para filtro
  const tiposUnicos = useMemo(() => {
    const tipos = new Set(producaoFabrica.map(c => c.tipo));
    return Array.from(tipos);
  }, [producaoFabrica]);

  // Lista filtrada para modo Lista
  const listaFiltrada = useMemo(() => {
    let conjuntosFiltrados = producaoFabrica.filter(c => {
      if (obraFiltro !== 'todas' && c.obraNome !== obraFiltro) return false;
      if (prioridadeFiltro !== 'todas' && c.prioridade !== prioridadeFiltro) return false;
      if (tipoFiltro !== 'todos' && c.tipo !== tipoFiltro) return false;
      if (busca) {
        const termoBusca = busca.toLowerCase();
        if (!c.conjunto.toLowerCase().includes(termoBusca) &&
            !c.tipo.toLowerCase().includes(termoBusca) &&
            !c.descricao.toLowerCase().includes(termoBusca)) {
          return false;
        }
      }
      return true;
    });

    conjuntosFiltrados.sort((a, b) => {
      let valA = a[ordenacao.campo];
      let valB = b[ordenacao.campo];

      if (typeof valA === 'number' && typeof valB === 'number') {
        return ordenacao.direcao === 'asc' ? valA - valB : valB - valA;
      }

      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
      if (valA < valB) return ordenacao.direcao === 'asc' ? -1 : 1;
      if (valA > valB) return ordenacao.direcao === 'asc' ? 1 : -1;
      return 0;
    });

    return conjuntosFiltrados;
  }, [producaoFabrica, obraFiltro, prioridadeFiltro, tipoFiltro, busca, ordenacao]);

  // Paginação
  const totalPaginas = Math.ceil(listaFiltrada.length / itensPorPagina);
  const indiceInicio = (paginaAtual - 1) * itensPorPagina;
  const indiceFim = indiceInicio + itensPorPagina;
  const itensPaginados = listaFiltrada.slice(indiceInicio, indiceFim);

  const ordenarPor = (campo) => {
    setOrdenacao(prev => ({
      campo,
      direcao: prev.campo === campo && prev.direcao === 'asc' ? 'desc' : 'asc'
    }));
    setPaginaAtual(1);
  };

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, obraFiltro, prioridadeFiltro, tipoFiltro]);

  // Cor da prioridade
  const corPrioridade = (p) => {
    if (p === 'alta') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (p === 'normal') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="h-7 w-7 text-blue-500" />
            Kanban Produção
          </h1>
          <p className="text-slate-400 mt-1">Base de dados de produção independente • Controle por conjuntos</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              const columns = [
                { header: 'Conjunto', key: 'conjunto' },
                { header: 'Descrição', key: 'descricao' },
                { header: 'Quantidade', key: 'quantidade' },
                { header: 'Peso Unitário (kg)', key: 'pesoUnitario' },
                { header: 'Peso Total (kg)', key: 'pesoTotal' },
                { header: 'Valor Unit. (R$)', key: 'valorUnitario' },
                { header: 'Valor Total (R$)', key: 'valorTotal' },
                { header: 'Status', key: 'status' },
                { header: 'Prioridade', key: 'prioridade' },
                { header: 'Obra', key: 'obraNome' }
              ];
              const timestamp = new Date().toISOString().split('T')[0];
              exportToExcel(producaoFabrica, columns, `producao-integrada-${timestamp}`);
              toast.success('Produção exportada para Excel com sucesso!');
            }}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              setModalNovaOrdem(true);
              setEtapaModal(1);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Ordem de Produção
          </Button>
        </div>
      </div>

      {/* Ordem de Produção Atual */}
      {ordemProducaoAtual && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Database className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-bold flex items-center gap-2">
                  Ordem de Produção: {ordemProducaoAtual.numero}
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                    EM PRODUÇÃO
                  </span>
                </h3>
                <p className="text-slate-400 text-sm">
                  {ordemProducaoAtual.obra?.nome} • {ordemProducaoAtual.totalConjuntos} conjuntos • {formatPeso(ordemProducaoAtual.pesoTotal)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-slate-400 text-xs">Progresso</p>
                <p className="text-2xl font-bold text-blue-400">{kpis.progressoGeral}%</p>
              </div>
              <div className="w-32 h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${kpis.progressoGeral}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Conjuntos', value: kpis.totalConjuntos.toLocaleString(), icon: Package, cor: 'blue' },
          { label: 'Peso Total', value: formatPeso(kpis.pesoTotal), icon: Layers, cor: 'purple' },
          { label: 'Medição', value: formatValor(kpis.valorTotal), icon: DollarSign, cor: 'emerald' },
          { label: 'Em Fabricação', value: formatPeso(kpis.pesoFabricacao), icon: Wrench, cor: 'blue' },
          { label: 'Expedido', value: formatPeso(kpis.pesoExpedido), icon: Truck, cor: 'emerald' },
          { label: 'Alta Prioridade', value: kpis.altaPrioridade, icon: AlertTriangle, cor: 'red' },
        ].map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs">{kpi.label}</p>
                <p className="text-xl font-bold text-white mt-1">{kpi.value}</p>
              </div>
              <div className={cn(
                "p-2 rounded-lg",
                kpi.cor === 'blue' && "bg-blue-500/20 text-blue-400",
                kpi.cor === 'purple' && "bg-purple-500/20 text-purple-400",
                kpi.cor === 'emerald' && "bg-emerald-500/20 text-emerald-400",
                kpi.cor === 'red' && "bg-red-500/20 text-red-400",
              )}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Fluxo Visual */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
          {COLUNAS_PRODUCAO.map((col, idx) => {
            const ColIcon = col.icon;
            const conjuntosCol = conjuntosPorColuna[col.id] || [];
            return (
              <React.Fragment key={col.id}>
                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border"
                  style={{ backgroundColor: `${col.cor}20`, borderColor: `${col.cor}50` }}
                >
                  <span className="text-xl">{col.title.split(' ')[0]}</span>
                  <div>
                    <span className="font-medium" style={{ color: col.cor }}>{col.title.split(' ').slice(1).join(' ')}</span>
                    <p className="text-xs text-slate-500">{conjuntosCol.length} conjuntos</p>
                  </div>
                </div>
                {idx < COLUNAS_PRODUCAO.length - 1 && (
                  <ArrowRight className="w-5 h-5 text-slate-600" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar por conjunto, tipo ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700 text-white"
          />
        </div>
        <Select.Root value={obraFiltro} onValueChange={setObraFiltro}>
          <Select.Trigger className="flex items-center justify-between w-64 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-400" />
              <Select.Value placeholder="Filtrar por obra" />
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
              <Select.Viewport className="p-1">
                <Select.Item value="todas" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                  <Select.ItemText>Todas as Obras</Select.ItemText>
                </Select.Item>
                {obrasUnicas.map(obraNome => (
                  <Select.Item key={obraNome} value={obraNome} className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                    <Select.ItemText>{obraNome}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        <Select.Root value={tipoFiltro} onValueChange={setTipoFiltro}>
          <Select.Trigger className="flex items-center justify-between w-40 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white">
            <Select.Value placeholder="Tipo" />
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
              <Select.Viewport className="p-1">
                <Select.Item value="todos" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                  <Select.ItemText>Todos</Select.ItemText>
                </Select.Item>
                {tiposUnicos.map(tipo => (
                  <Select.Item key={tipo} value={tipo} className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                    <Select.ItemText>{tipo}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        <Select.Root value={prioridadeFiltro} onValueChange={setPrioridadeFiltro}>
          <Select.Trigger className="flex items-center justify-between w-40 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white">
            <Select.Value placeholder="Prioridade" />
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
              <Select.Viewport className="p-1">
                <Select.Item value="todas" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                  <Select.ItemText>Todas</Select.ItemText>
                </Select.Item>
                <Select.Item value="alta" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                  <Select.ItemText>🔴 Alta</Select.ItemText>
                </Select.Item>
                <Select.Item value="normal" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                  <Select.ItemText>🔵 Normal</Select.ItemText>
                </Select.Item>
                <Select.Item value="baixa" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                  <Select.ItemText>⚪ Baixa</Select.ItemText>
                </Select.Item>
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>

        {/* Toggle Kanban/Lista */}
        <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700 rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all",
              modoVisualizacao === 'kanban'
                ? "bg-blue-500/20 text-blue-400"
                : "text-slate-400 hover:text-white"
            )}
            onClick={() => setModoVisualizacao('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all",
              modoVisualizacao === 'lista'
                ? "bg-blue-500/20 text-blue-400"
                : "text-slate-400 hover:text-white"
            )}
            onClick={() => setModoVisualizacao('lista')}
          >
            <Table2 className="h-4 w-4" />
            Lista
          </Button>
        </div>
      </div>

      {/* Mensagem se não há conjuntos */}
      {producaoFabrica.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-slate-800/30 border border-dashed border-slate-600 rounded-xl p-12 text-center"
        >
          <div className="p-4 bg-slate-800 rounded-full w-fit mx-auto mb-4">
            <Layers className="h-12 w-12 text-slate-500" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">Nenhuma ordem de produção ativa</h3>
          <p className="text-slate-400 mb-6">
            Clique em "Nova Ordem de Produção" para importar uma lista de conjuntos e iniciar a fabricação.
          </p>
          <Button
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              setModalNovaOrdem(true);
              setEtapaModal(1);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Ordem de Produção
          </Button>
        </motion.div>
      )}

      {/* Kanban Board */}
      {producaoFabrica.length > 0 && modoVisualizacao === 'kanban' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {COLUNAS_PRODUCAO.map((coluna, colIdx) => {
            const ColunaIcon = coluna.icon;
            const conjuntosColuna = conjuntosPorColuna[coluna.id] || [];
            const qtdColuna = conjuntosColuna.length;
            const pesoColuna = conjuntosColuna.reduce((sum, c) => sum + c.pesoTotal, 0);
            const valorColuna = pesoColuna * coluna.valorKg;
            const proximaColuna = COLUNAS_PRODUCAO[colIdx + 1];

            return (
              <div
                key={coluna.id}
                className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden"
              >
                {/* Header da Coluna */}
                <div
                  className="p-4 border-b"
                  style={{ borderColor: `${coluna.cor}50`, backgroundColor: `${coluna.cor}10` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ColunaIcon className="h-5 w-5" style={{ color: coluna.cor }} />
                      <div>
                        <h3 className="text-white font-semibold text-sm">{coluna.title}</h3>
                        <p className="text-slate-500 text-xs">{coluna.subtitle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className="px-2 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: `${coluna.cor}30`, color: coluna.cor }}
                      >
                        {qtdColuna}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-400">
                    <span>Peso: <span className="text-white font-medium">{formatPeso(pesoColuna)}</span></span>
                    {coluna.valorKg > 0 && (
                      <span>Med: <span className="text-emerald-400 font-medium">{formatValor(valorColuna)}</span></span>
                    )}
                  </div>
                </div>

                {/* Cards dos Conjuntos */}
                <div className="p-2 space-y-2 min-h-[300px] max-h-[500px] overflow-y-auto">
                  <AnimatePresence>
                    {conjuntosColuna.map((conjunto, idx) => (
                      <motion.div
                        key={conjunto.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: idx * 0.02 }}
                        className={cn(
                          "bg-slate-900/80 border rounded-lg p-3 cursor-pointer hover:border-slate-500 transition-all",
                          conjunto.prioridade === 'alta' ? "border-red-500/50" : "border-slate-700"
                        )}
                        onClick={() => { setConjuntoSelecionado(conjunto); setModalAberto(true); }}
                      >
                        {/* Conjunto e Prioridade */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-mono font-bold text-sm">
                            {conjunto.conjunto}
                          </span>
                          {conjunto.prioridade === 'alta' && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                              🔴 ALTA
                            </span>
                          )}
                        </div>

                        {/* Tipo + EM Detalhamento */}
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-slate-300 text-xs">{conjunto.tipo}</p>
                          {(() => {
                            const info = getEMInfoByConjunto(conjunto.conjunto);
                            if (!info) return null;
                            if (info.emExato) {
                              return (
                                <span className="text-[10px] text-amber-400/80 font-mono">
                                  EM-{info.emExato}
                                </span>
                              );
                            }
                            return (
                              <span className="text-[10px] text-amber-400/50 font-mono">
                                EM-{info.emInicio}~{info.emFim}
                              </span>
                            );
                          })()}
                        </div>

                        {/* Descrição */}
                        <p className="text-slate-500 text-xs line-clamp-2">
                          {conjunto.descricao}
                        </p>

                        {/* Peso e Quantidade */}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700">
                          <span className="text-xs text-slate-400">
                            {conjunto.pecas} pçs × {conjunto.quantidade}
                          </span>
                          <span className="text-xs text-blue-400 font-medium">
                            {formatPeso(conjunto.pesoTotal)}
                          </span>
                        </div>

                        {/* Link Detalhamento EM */}
                        {(() => {
                          const info = getEMInfoByConjunto(conjunto.conjunto);
                          if (!info) return null;
                          const emRef = info.emExato || info.emInicio;
                          const detalhe = getDetalhamentoByNumero(emRef);
                          if (detalhe?.pdf) {
                            return (
                              <a
                                href={detalhe.pdf}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 mt-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FileText className="h-3 w-3" />
                                {info.emExato ? `EM-${info.emExato}` : `EM-${info.emInicio}~${info.emFim}`} Detalhamento
                              </a>
                            );
                          }
                          return null;
                        })()}

                        {/* Progresso Corte - Dados Reais do corteStatusStore */}
                        {(() => {
                          const bom = getBOMByConjunto(conjunto.conjunto);
                          if (!bom || bom.length === 0) return null;
                          const { totalPecas, cortadas } = contarCortadasParaConjunto(bom);
                          const pct = totalPecas > 0 ? Math.round((cortadas / totalPecas) * 100) : 0;
                          const corBarra = pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-500' : pct > 0 ? 'bg-blue-500' : 'bg-slate-600';
                          const corTexto = pct === 100 ? 'text-emerald-400' : pct > 0 ? 'text-slate-300' : 'text-slate-500';
                          return (
                            <div className="mt-2 pt-2 border-t border-slate-700/50">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-slate-400">Corte</span>
                                <span className={`text-[10px] font-mono ${corTexto}`}>{cortadas}/{totalPecas} pçs</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full ${corBarra} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                              </div>
                              {pct === 100 && (
                                <div className="text-[9px] text-emerald-400 text-center mt-1 font-medium">
                                  ✅ Material pronto
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Botão Avançar */}
                        {proximaColuna && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full mt-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              moverConjunto(conjunto.id, proximaColuna.id);
                            }}
                          >
                            <ArrowRight className="h-3 w-3 mr-1" />
                            {proximaColuna.title.replace(/[^\w\s]/g, '').trim()}
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {conjuntosColuna.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                      <ColunaIcon className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">Nenhum conjunto</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== VISUALIZAÇÃO EM LISTA ===== */}
      {producaoFabrica.length > 0 && modoVisualizacao === 'lista' && (
        <div className="space-y-4">
          {/* Header da Lista */}
          <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-400">
                Exibindo <span className="text-white font-medium">{indiceInicio + 1}-{Math.min(indiceFim, listaFiltrada.length)}</span> de <span className="text-white font-medium">{listaFiltrada.length}</span> conjuntos
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <div className="text-sm text-slate-400">
                Peso total: <span className="text-blue-400 font-medium">{formatPeso(listaFiltrada.reduce((sum, c) => sum + c.pesoTotal, 0))}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Itens por página:</span>
              <Select.Root value={String(itensPorPagina)} onValueChange={(v) => { setItensPorPagina(Number(v)); setPaginaAtual(1); }}>
                <Select.Trigger className="flex items-center justify-between w-20 px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white">
                  <Select.Value />
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                    <Select.Viewport className="p-1">
                      {[25, 50, 100, 200].map(n => (
                        <Select.Item key={n} value={String(n)} className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                          <Select.ItemText>{n}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800 sticky top-0">
                  <tr>
                    <th className="text-left p-4 text-slate-400 text-xs font-medium cursor-pointer hover:text-white transition-colors" onClick={() => ordenarPor('conjunto')}>
                      <div className="flex items-center gap-1">
                        Conjunto
                        {ordenacao.campo === 'conjunto' && <span className="text-blue-400">{ordenacao.direcao === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="text-left p-4 text-slate-400 text-xs font-medium cursor-pointer hover:text-white transition-colors" onClick={() => ordenarPor('tipo')}>
                      <div className="flex items-center gap-1">
                        Tipo
                        {ordenacao.campo === 'tipo' && <span className="text-blue-400">{ordenacao.direcao === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="text-left p-4 text-slate-400 text-xs font-medium">Descrição</th>
                    <th className="text-right p-4 text-slate-400 text-xs font-medium cursor-pointer hover:text-white transition-colors" onClick={() => ordenarPor('pecas')}>
                      <div className="flex items-center justify-end gap-1">
                        Peças
                        {ordenacao.campo === 'pecas' && <span className="text-blue-400">{ordenacao.direcao === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="text-right p-4 text-slate-400 text-xs font-medium cursor-pointer hover:text-white transition-colors" onClick={() => ordenarPor('quantidade')}>
                      <div className="flex items-center justify-end gap-1">
                        Qtd
                        {ordenacao.campo === 'quantidade' && <span className="text-blue-400">{ordenacao.direcao === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="text-right p-4 text-slate-400 text-xs font-medium cursor-pointer hover:text-white transition-colors" onClick={() => ordenarPor('pesoTotal')}>
                      <div className="flex items-center justify-end gap-1">
                        Peso Total
                        {ordenacao.campo === 'pesoTotal' && <span className="text-blue-400">{ordenacao.direcao === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="text-left p-4 text-slate-400 text-xs font-medium">Material</th>
                    <th className="text-center p-4 text-slate-400 text-xs font-medium">Detalhamento</th>
                    <th className="text-center p-4 text-slate-400 text-xs font-medium cursor-pointer hover:text-white transition-colors" onClick={() => ordenarPor('status')}>
                      <div className="flex items-center justify-center gap-1">
                        Status
                        {ordenacao.campo === 'status' && <span className="text-blue-400">{ordenacao.direcao === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="text-center p-4 text-slate-400 text-xs font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {itensPaginados.map((conjunto, idx) => {
                    const colunaAtual = COLUNAS_PRODUCAO.find(c => c.id === conjunto.status);
                    const idxColuna = COLUNAS_PRODUCAO.findIndex(c => c.id === conjunto.status);
                    const proximaColuna = COLUNAS_PRODUCAO[idxColuna + 1];

                    return (
                      <motion.tr
                        key={conjunto.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.01 }}
                        className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => { setConjuntoSelecionado(conjunto); setModalAberto(true); }}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {conjunto.prioridade === 'alta' && <span className="w-2 h-2 rounded-full bg-red-500" />}
                            <span className="text-white font-mono font-medium">{conjunto.conjunto}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-300 text-sm">{conjunto.tipo}</td>
                        <td className="p-4 text-slate-400 text-xs max-w-xs truncate">{conjunto.descricao}</td>
                        <td className="p-4 text-right text-slate-300">{conjunto.pecas}</td>
                        <td className="p-4 text-right text-white font-medium">{conjunto.quantidade}</td>
                        <td className="p-4 text-right text-blue-400 font-medium">{formatPeso(conjunto.pesoTotal)}</td>
                        <td className="p-4 text-slate-400 text-xs">{conjunto.material}</td>
                        <td className="p-4 text-center">
                          {(() => {
                            const info = getEMInfoByConjunto(conjunto.conjunto);
                            if (!info) return <span className="text-slate-600 text-xs">—</span>;
                            const emRef = info.emExato || info.emInicio;
                            const detalhe = getDetalhamentoByNumero(emRef);
                            const label = info.emExato ? `EM-${info.emExato}` : `EM-${info.emInicio}~${info.emFim}`;
                            if (detalhe?.pdf) {
                              return (
                                <a href={detalhe.pdf} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                                  onClick={(e) => e.stopPropagation()}>
                                  <FileText className="h-3 w-3" /> {label}
                                </a>
                              );
                            }
                            return <span className="text-slate-500 text-xs font-mono">{label}</span>;
                          })()}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center">
                            <span
                              className="px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                              style={{ backgroundColor: `${colunaAtual?.cor}20`, color: colunaAtual?.cor }}
                            >
                              {colunaAtual?.title.replace(/[^\w\s]/g, '').trim()}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                              onClick={(e) => { e.stopPropagation(); setConjuntoSelecionado(conjunto); setModalAberto(true); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {proximaColuna && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-400 hover:text-emerald-400"
                                onClick={(e) => { e.stopPropagation(); moverConjunto(conjunto.id, proximaColuna.id); }}>
                                <ArrowRight className="h-3 w-3 mr-1" />
                                Avançar
                              </Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="text-sm text-slate-400">
                Página <span className="text-white font-medium">{paginaAtual}</span> de <span className="text-white font-medium">{totalPaginas}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white disabled:opacity-30" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(1)}>
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white disabled:opacity-30" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    let pageNum;
                    if (totalPaginas <= 5) pageNum = i + 1;
                    else if (paginaAtual <= 3) pageNum = i + 1;
                    else if (paginaAtual >= totalPaginas - 2) pageNum = totalPaginas - 4 + i;
                    else pageNum = paginaAtual - 2 + i;
                    return (
                      <Button key={pageNum} variant="ghost" size="sm"
                        className={cn("h-8 w-8 p-0 text-sm", paginaAtual === pageNum ? "bg-blue-500/20 text-blue-400" : "text-slate-400 hover:text-white")}
                        onClick={() => setPaginaAtual(pageNum)}>
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white disabled:opacity-30" disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white disabled:opacity-30" disabled={paginaAtual === totalPaginas} onClick={() => setPaginaAtual(totalPaginas)}>
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gráficos */}
      {producaoFabrica.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-slate-400" />
              Conjuntos por Etapa
            </h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} labelStyle={{ color: '#fff' }} />
                  <Bar dataKey="quantidade" radius={[4, 4, 0, 0]}>
                    {dadosGrafico.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-slate-400" />
              Peso por Etapa
            </h3>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={dadosGrafico.filter(d => d.peso > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="peso" nameKey="name">
                    {dadosGrafico.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                  </Pie>
                  <Tooltip formatter={(value) => formatPeso(value)} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Conjunto */}
      <Dialog.Root open={modalAberto} onOpenChange={setModalAberto}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl p-6 z-50">
            {conjuntoSelecionado && (
              <>
                <Dialog.Title className="text-xl font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-500" />
                    {conjuntoSelecionado.conjunto}
                  </span>
                  <span className={cn("px-3 py-1 rounded-full text-sm font-medium border", corPrioridade(conjuntoSelecionado.prioridade))}>
                    {conjuntoSelecionado.prioridade.toUpperCase()}
                  </span>
                </Dialog.Title>

                <div className="mt-6 space-y-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm">Descrição</p>
                    <p className="text-white font-medium">{conjuntoSelecionado.descricao}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm">Tipo</p>
                      <p className="text-white font-medium">{conjuntoSelecionado.tipo}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm">Material</p>
                      <p className="text-white font-medium">{conjuntoSelecionado.material}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <p className="text-slate-400 text-sm">Peças × Qtd</p>
                      <p className="text-white font-medium">{conjuntoSelecionado.pecas} × {conjuntoSelecionado.quantidade}</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <p className="text-blue-400 text-sm">Peso Total</p>
                      <p className="text-white font-bold text-lg">{formatPeso(conjuntoSelecionado.pesoTotal)}</p>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm flex items-center gap-1"><Building2 className="h-4 w-4" /> Obra</p>
                    <p className="text-white font-medium">{conjuntoSelecionado.obraNome}</p>
                  </div>

                  {/* Detalhamento EM - Desenho Técnico */}
                  {(() => {
                    const info = getEMInfoByConjunto(conjuntoSelecionado.conjunto);
                    if (!info) return null;
                    const emRef = info.emExato || info.emInicio;
                    const detalhe = getDetalhamentoByNumero(emRef);
                    if (!detalhe) return null;
                    const label = info.emExato
                      ? `EM-${info.emExato}`
                      : `EM-${info.emInicio} a EM-${info.emFim} (${info.totalDetalhamentos} detalhamentos)`;
                    return (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <p className="text-amber-400 text-sm flex items-center gap-1 mb-1">
                          <FileText className="h-4 w-4" /> Detalhamento: {label}
                        </p>
                        <p className="text-amber-400/60 text-xs mb-3">
                          {info.mapeamento1para1
                            ? `Mapeamento direto — ${conjuntoSelecionado.conjunto} = EM-${info.emExato}`
                            : `${info.tipo} — ${info.totalDetalhamentos} detalhamentos para este tipo`}
                        </p>
                        <div className="flex gap-2">
                          {detalhe.pdf && (
                            <a href={detalhe.pdf} target="_blank" rel="noopener noreferrer"
                              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm py-2 px-3 rounded-lg text-center transition-colors">
                              {info.emExato ? `Visualizar EM-${info.emExato}` : `Ver EM-${info.emInicio}`}
                            </a>
                          )}
                          {detalhe.dwg && (
                            <a href={detalhe.dwg} download
                              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 px-3 rounded-lg text-center transition-colors">
                              Baixar DWG
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Lista de Croquis / BOM - Dados Reais do corteStatusStore */}
                  {(() => {
                    const bom = getBOMByConjunto(conjuntoSelecionado.conjunto);
                    if (!bom || bom.length === 0) return null;
                    const { totalPecas, cortadas: cortadasTotal } = contarCortadasParaConjunto(bom);
                    // Mapear status real de cada peça via isMarcaCortada
                    const bomComStatus = bom.map(p => ({
                      ...p,
                      cortadas: isMarcaCortada(p.marca) ? p.quantidade : 0
                    }));
                    const pct = totalPecas > 0 ? Math.round((cortadasTotal / totalPecas) * 100) : 0;
                    const corBarra = pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-500' : pct > 0 ? 'bg-blue-500' : 'bg-slate-600';
                    const corTexto = pct === 100 ? 'text-emerald-400' : pct > 50 ? 'text-amber-400' : pct > 0 ? 'text-blue-400' : 'text-slate-500';
                    return (
                      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-cyan-400 text-sm font-medium flex items-center gap-1">
                            <Layers className="h-4 w-4" /> Peças Componentes (Croquis)
                          </p>
                          <span className={`text-xs font-mono ${corTexto}`}>{cortadasTotal}/{totalPecas} cortadas</span>
                        </div>
                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                          <div className={`h-full ${corBarra} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {bomComStatus.map((p, i) => {
                            const croqui = getCroquiByMarca(p.marca);
                            const todoCortado = p.cortadas === p.quantidade;
                            return (
                              <div key={i} className={cn(
                                "flex items-center justify-between py-1.5 px-2 rounded text-xs",
                                todoCortado ? "bg-emerald-500/10" : "bg-slate-800/50"
                              )}>
                                <div className="flex items-center gap-2">
                                  <span className={cn("w-2 h-2 rounded-full", todoCortado ? "bg-emerald-500" : "bg-slate-500")} />
                                  <span className="font-mono text-white">POS {p.marca}</span>
                                  <span className="text-slate-400">{p.tipo}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-400">{p.perfil}</span>
                                  <span className={cn("font-mono", todoCortado ? "text-emerald-400" : "text-slate-300")}>
                                    {p.cortadas}/{p.quantidade}
                                  </span>
                                  {croqui?.pdf && (
                                    <a href={croqui.pdf} target="_blank" rel="noopener noreferrer"
                                      className="text-cyan-400 hover:text-cyan-300"
                                      onClick={(e) => e.stopPropagation()}>
                                      <FileText className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {pct === 100 && (
                          <div className="mt-2 text-center text-emerald-400 text-xs font-medium bg-emerald-500/10 rounded py-1">
                            ✅ Todas as peças cortadas — Pronto para fabricação
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-3">Status de Produção</p>
                    <div className="flex gap-4">
                      {[
                        { key: 'fabricado', label: 'Fabricado' },
                        { key: 'soldado', label: 'Soldado' },
                        { key: 'pintado', label: 'Pintado' },
                        { key: 'expedido', label: 'Expedido' },
                      ].map(s => (
                        <div key={s.key} className={cn("flex items-center gap-2 text-sm",
                          conjuntoSelecionado.statusProducao?.[s.key] ? "text-emerald-400" : "text-slate-500")}>
                          <CheckCircle2 className="h-4 w-4" />
                          {s.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
                  <Button variant="outline" className="border-slate-700 text-slate-300">
                    <Edit className="h-4 w-4 mr-2" /> Editar
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

      {/* ===== MODAL NOVA ORDEM DE PRODUÇÃO ===== */}
      <Dialog.Root open={modalNovaOrdem} onOpenChange={setModalNovaOrdem}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800/50">
              <Dialog.Title className="text-xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Package className="h-6 w-6 text-blue-500" />
                </div>
                Nova Ordem de Produção
                <div className="flex items-center gap-2 ml-4">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      etapaModal >= step ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-400")}>
                      {step}
                    </div>
                  ))}
                </div>
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                  <XIcon className="h-5 w-5" />
                </Button>
              </Dialog.Close>
            </div>

            {/* Conteúdo */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">

              {/* ETAPA 1: Selecionar Obra */}
              {etapaModal === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <h3 className="text-lg font-semibold text-white mb-2">Selecione a Obra</h3>
                    <p className="text-slate-400">Escolha a obra para gerar a ordem de produção</p>
                  </div>

                  <div className="grid gap-4">
                    {obrasDisponiveis.map((obra) => (
                      <div key={obra.id}
                        onClick={() => { setObraSelecionada(obra); setEtapaModal(2); }}
                        className={cn("p-5 rounded-xl border-2 cursor-pointer transition-all",
                          obraSelecionada?.id === obra.id ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-slate-500 bg-slate-800/30")}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/20 rounded-lg">
                              <Building2 className="h-6 w-6 text-purple-400" />
                            </div>
                            <div>
                              <h4 className="text-white font-semibold text-lg">{obra.nome}</h4>
                              <p className="text-slate-400 text-sm">Código: {obra.codigo} • Cliente: {obra.clienteId || 'MONTEX'}</p>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-slate-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ETAPA 2: Selecionar Planilha */}
              {etapaModal === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Button variant="ghost" size="sm" onClick={() => setEtapaModal(1)} className="text-slate-400">← Voltar</Button>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Selecione a Lista de Conjuntos</h3>
                      <p className="text-slate-400 text-sm">Obra: <span className="text-blue-400">{obraSelecionada?.nome}</span></p>
                    </div>
                  </div>

                  {listasPorObra.length > 0 ? (
                    <div className="grid gap-4">
                      {listasPorObra.map((lista) => {
                        const totalConjuntos = lista.itens?.length || 0;
                        const pesoTotal = lista.itens?.reduce((sum, i) => sum + (i.peso || 0), 0) || 0;
                        const totalPecas = lista.itens?.reduce((sum, i) => sum + ((i.pecas || 1) * (i.quantidade || 1)), 0) || 0;

                        return (
                          <div key={lista.id}
                            onClick={() => { setPlanilhaSelecionada(lista); importarPlanilhaCompleta(); }}
                            className={cn("p-5 rounded-xl border-2 cursor-pointer transition-all",
                              planilhaSelecionada?.id === lista.id ? "border-blue-500 bg-blue-500/10" : "border-slate-700 hover:border-emerald-500/50 bg-slate-800/30")}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-500/20 rounded-lg">
                                  <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
                                </div>
                                <div>
                                  <h4 className="text-white font-semibold">{lista.arquivo}</h4>
                                  <p className="text-slate-400 text-sm">{totalConjuntos} conjuntos • Data: {lista.dataImportacao}</p>
                                  <div className="flex items-center gap-4 mt-2">
                                    <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">{totalPecas} peças</span>
                                    <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">{formatPeso(pesoTotal)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 text-sm font-medium">Importar</span>
                                <ArrowRight className="h-5 w-5 text-emerald-400" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-dashed border-slate-600">
                      <FileSpreadsheet className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                      <p className="text-white font-medium mb-2">Nenhuma lista de conjuntos encontrada</p>
                      <p className="text-slate-400 text-sm">Importe uma lista de conjuntos para esta obra.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ETAPA 3: Confirmar Importação */}
              {etapaModal === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Button variant="ghost" size="sm" onClick={() => setEtapaModal(2)} className="text-slate-400">← Voltar</Button>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Confirmar Importação</h3>
                      <p className="text-slate-400 text-sm">{planilhaSelecionada?.arquivo}</p>
                    </div>
                  </div>

                  {/* Resumo */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
                      <p className="text-slate-400 text-xs mb-1">Total Conjuntos</p>
                      <p className="text-2xl font-bold text-white">{itensImportados.length}</p>
                    </div>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
                      <p className="text-slate-400 text-xs mb-1">Total Peças</p>
                      <p className="text-2xl font-bold text-white">{itensImportados.reduce((sum, i) => sum + i.pecas * i.quantidade, 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
                      <p className="text-blue-400 text-xs mb-1">Peso Total</p>
                      <p className="text-2xl font-bold text-blue-400">{formatPeso(itensImportados.reduce((sum, i) => sum + i.pesoTotal, 0))}</p>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 text-center">
                      <p className="text-purple-400 text-xs mb-1">Obra</p>
                      <p className="text-sm font-bold text-purple-400 truncate">{obraSelecionada?.nome}</p>
                    </div>
                  </div>

                  {/* Tabela */}
                  <div className="border border-slate-700 rounded-lg overflow-hidden">
                    <div className="max-h-[350px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-slate-800 sticky top-0">
                          <tr>
                            <th className="text-left p-3 text-slate-400 text-xs font-medium">Conjunto</th>
                            <th className="text-left p-3 text-slate-400 text-xs font-medium">Tipo</th>
                            <th className="text-left p-3 text-slate-400 text-xs font-medium">Descrição</th>
                            <th className="text-right p-3 text-slate-400 text-xs font-medium">Peças</th>
                            <th className="text-right p-3 text-slate-400 text-xs font-medium">Qtd</th>
                            <th className="text-right p-3 text-slate-400 text-xs font-medium">Peso Total</th>
                            <th className="text-left p-3 text-slate-400 text-xs font-medium">Material</th>
                            <th className="text-center p-3 text-slate-400 text-xs font-medium">Prioridade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {itensImportados.slice(0, 50).map((item, idx) => (
                            <tr key={item.id} className="hover:bg-slate-800/50">
                              <td className="p-3 text-white font-mono text-sm">{item.conjunto}</td>
                              <td className="p-3 text-slate-300 text-sm">{item.tipo}</td>
                              <td className="p-3 text-slate-400 text-xs max-w-xs truncate">{item.descricao}</td>
                              <td className="p-3 text-right text-slate-300">{item.pecas}</td>
                              <td className="p-3 text-right text-white font-medium">{item.quantidade}</td>
                              <td className="p-3 text-right text-blue-400 font-medium">{formatPeso(item.pesoTotal)}</td>
                              <td className="p-3 text-slate-400 text-xs">{item.material}</td>
                              <td className="p-3 text-center">
                                <span className={cn("px-2 py-0.5 rounded text-xs", corPrioridade(item.prioridade))}>
                                  {item.prioridade}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {itensImportados.length > 50 && (
                      <div className="p-3 bg-slate-800 text-center text-slate-400 text-sm border-t border-slate-700">
                        Mostrando 50 de {itensImportados.length} conjuntos
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-800/50">
              <div className="text-sm text-slate-400">
                {etapaModal === 1 && "Passo 1 de 3: Selecione uma obra"}
                {etapaModal === 2 && "Passo 2 de 3: Selecione a lista de conjuntos"}
                {etapaModal === 3 && `Passo 3 de 3: ${itensImportados.length} conjuntos prontos para importar`}
              </div>
              <div className="flex gap-3">
                <Dialog.Close asChild>
                  <Button variant="outline" className="border-slate-600 text-slate-300">Cancelar</Button>
                </Dialog.Close>
                {etapaModal === 3 && (
                  <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={confirmarImportacao}>
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Produção ({itensImportados.length} conjuntos)
                  </Button>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
