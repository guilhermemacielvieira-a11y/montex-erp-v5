import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Target, Weight, DollarSign,
  Edit, Save, X, Plus, Download, Filter,
  CheckCircle2, Clock, FileText, TrendingUp, Layers,
  ChevronDown, BarChart3, PieChart as PieChartIcon, ArrowRight,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as Select from '@radix-ui/react-select';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useObras, useExpedicao, useMedicoes } from '../contexts/ERPContext';

// Configurações de valores por kg (editáveis) - vinculado ao contrato
const configInicial = {
  producao: {
    valorKg: 5.52,
    descricao: 'Valor pago por kg produzido na fábrica (R$/kg contrato)',
  },
};

// Cores para gráficos
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function MedicaoAutomaticaPage() {
  const { obras, obraAtualData } = useObras();
  const { expedicoes } = useExpedicao();
  const { medicoes: medicoesDB } = useMedicoes();
  const obrasAtivas = obras.filter(o => o.status !== 'cancelada');

  const [obraSelecionada, setObraSelecionada] = useState('todas');
  const [config, setConfig] = useState(configInicial);
  const [editandoConfig, setEditandoConfig] = useState(null);
  const [novoValorKg, setNovoValorKg] = useState('');
  const [modalNovaMedicao, setModalNovaMedicao] = useState(false);
  const [medicoes, setMedicoes] = useState([]);
  const [formMedicao, setFormMedicao] = useState({ peso: '', obra: '' });

  // Medições locais (criadas nesta página)
  const medicoesLocaisFiltradas = useMemo(() => {
    return medicoes.filter(m => {
      if (m.tipo !== 'producao') return false;
      if (obraSelecionada !== 'todas' && m.obraId !== obraSelecionada) return false;
      return true;
    });
  }, [medicoes, obraSelecionada]);

  // Medições do Supabase (Gestão Financeira Obra) formatadas para a tabela
  const medicoesDBFormatadas = useMemo(() => {
    if (!medicoesDB || medicoesDB.length === 0) return [];
    const obrasMap = {};
    (obras || []).forEach(o => { obrasMap[o.id] = o.nome || o.name || o.id; });

    return medicoesDB
      .filter(m => obraSelecionada === 'todas' || (m.obraId || m.obra_id) === obraSelecionada)
      .map(m => {
        const obraId = m.obraId || m.obra_id;
        return {
          id: m.id,
          tipo: 'producao',
          obraId,
          obra: m.obraNome || m.obra_nome || obrasMap[obraId] || '-',
          periodo: m.dataMedicao || m.data_medicao
            ? new Date(m.dataMedicao || m.data_medicao).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            : '-',
          pesoMedido: m.pesoMedido || m.peso_medido || m.peso || 0,
          valorKg: config.producao.valorKg,
          valorTotal: m.valorBruto || m.valor_bruto || 0,
          status: ['pago', 'paga', 'faturado', 'confirmado'].includes(m.status) ? 'aprovada' : (m.status === 'rejeitada' ? 'rejeitada' : 'pendente'),
          dataCriacao: m.dataMedicao || m.data_medicao || '',
          origemDB: true,
          descricao: m.descricao || `Medição #${m.numero || '?'}`,
          numero: m.numero,
        };
      });
  }, [medicoesDB, obraSelecionada, obras, config.producao.valorKg]);

  // Combinar medições locais + DB (evitar duplicatas por ID)
  const medicoesFiltradas = useMemo(() => {
    const idsDB = new Set(medicoesDBFormatadas.map(m => m.id));
    const locaisSemDup = medicoesLocaisFiltradas.filter(m => !idsDB.has(m.id));
    return [...medicoesDBFormatadas, ...locaisSemDup]
      .sort((a, b) => new Date(b.dataCriacao || 0) - new Date(a.dataCriacao || 0));
  }, [medicoesDBFormatadas, medicoesLocaisFiltradas]);

  const totais = useMemo(() => {
    const filtradas = medicoesFiltradas;
    return {
      pesoTotal: filtradas.reduce((a, m) => a + (m.pesoMedido || 0), 0),
      valorTotal: filtradas.reduce((a, m) => a + (m.valorTotal || 0), 0),
      qtdMedicoes: filtradas.length,
      aprovadas: filtradas.filter(m => m.status === 'aprovada').length,
      pendentes: filtradas.filter(m => m.status === 'pendente').length,
    };
  }, [medicoesFiltradas]);

  const dadosPorObra = useMemo(() => {
    const porObra = {};
    medicoesFiltradas.forEach(m => {
      if (!porObra[m.obra]) porObra[m.obra] = 0;
      porObra[m.obra] += m.valorTotal;
    });
    return Object.entries(porObra).map(([name, value]) => ({ name, value }));
  }, [medicoesFiltradas]);

  const pesoExpedidoReal = useMemo(() => {
    if (!expedicoes || expedicoes.length === 0) return 0;
    const expedicoesComRomaneio = expedicoes.filter(e =>
      e.status !== 'PREPARANDO' &&
      (obraSelecionada === 'todas' || e.obra_id === obraSelecionada)
    );
    return expedicoesComRomaneio.reduce((sum, e) => sum + (parseFloat(e.peso_total) || 0), 0);
  }, [expedicoes, obraSelecionada]);

  const dadosObraSelecionada = useMemo(() => {
    const calcPesos = (obra) => {
      if (!obra) return {
        pesoProduzido: 0, pesoExpedido: 0,
        pesoEmCorte: 0, pesoEmFabricacao: 0, pesoEmSolda: 0, pesoEmProcesso: 0,
        pesoTotal: 0, previsaoProximaMedicao: 0, pesoPintado: 0
      };
      const pe = obra.pesoPorEtapa;
      const pt = obra.pesoTotal || 0;
      const prog = obra.progresso || {};
      if (pe && pe.total > 0) {
        const pesoProduzido = pe.pintura || 0;
        const pesoExpedido = pe.expedicao || 0;
        const pesoEmCorte = Math.max(0, (pe.corte || 0) - (pe.fabricacao || 0));
        const pesoEmFabricacao = Math.max(0, (pe.fabricacao || 0) - (pe.solda || 0));
        const pesoEmSolda = Math.max(0, (pe.solda || 0) - (pe.pintura || 0));
        const pesoEmProcesso = pesoEmCorte + pesoEmFabricacao + pesoEmSolda;
        const previsaoProximaMedicao = pesoEmSolda;
        return {
          pesoProduzido, pesoExpedido, pesoPintado: pesoProduzido,
          pesoEmCorte, pesoEmFabricacao, pesoEmSolda, pesoEmProcesso,
          pesoTotal: pt, previsaoProximaMedicao
        };
      }
      const pesoProduzido = Math.round(pt * ((prog.pintura || 0) / 100));
      const pesoExpedido = Math.round(pt * ((prog.expedicao || 0) / 100));
      const pesoEmCorte = Math.round(pt * (Math.max(0, (prog.corte || 0) - (prog.fabricacao || 0)) / 100));
      const pesoEmFabricacao = Math.round(pt * (Math.max(0, (prog.fabricacao || 0) - (prog.solda || 0)) / 100));
      const pesoEmSolda = Math.round(pt * (Math.max(0, (prog.solda || 0) - (prog.pintura || 0)) / 100));
      const pesoEmProcesso = pesoEmCorte + pesoEmFabricacao + pesoEmSolda;
      const previsaoProximaMedicao = pesoEmSolda;
      return {
        pesoProduzido, pesoExpedido, pesoPintado: pesoProduzido,
        pesoEmCorte, pesoEmFabricacao, pesoEmSolda, pesoEmProcesso,
        pesoTotal: pt, previsaoProximaMedicao
      };
    };
    if (obraSelecionada === 'todas') {
      const consolidado = {
        pesoProduzido: 0, pesoExpedido: 0, pesoPintado: 0,
        pesoEmCorte: 0, pesoEmFabricacao: 0, pesoEmSolda: 0, pesoEmProcesso: 0,
        pesoTotal: 0, previsaoProximaMedicao: 0
      };
      obrasAtivas.forEach(obra => {
        const p = calcPesos(obra);
        Object.keys(consolidado).forEach(k => { consolidado[k] += p[k] || 0; });
      });
      return consolidado;
    }
    const obraSel = obrasAtivas.find(o => o.id === obraSelecionada);
    return calcPesos(obraSel);
  }, [obraSelecionada, obrasAtivas]);

  // Total de medições já lançadas (valor bruto das medições no Supabase)
  // EXCLUI adiantamentos / entradas de contrato — apenas medições de produção são subtraídas
  const totalMedicoesLancadas = useMemo(() => {
    if (!medicoesDB || medicoesDB.length === 0) return 0;
    const filtradas = obraSelecionada === 'todas'
      ? medicoesDB
      : medicoesDB.filter(m => (m.obraId || m.obra_id) === obraSelecionada);

    // Filtra apenas medições de produção (exclui entradas de contrato / adiantamentos)
    const apenasMedicoes = filtradas.filter(m => {
      const desc = (m.descricao || m.description || '').toLowerCase();
      const isAdiantamento = desc.includes('entrada') || desc.includes('contrato') || desc.includes('adiantamento') || desc.includes('aporte');
      return !isAdiantamento;
    });

    return apenasMedicoes.reduce((sum, m) => sum + (m.valorBruto || m.valor_bruto || 0), 0);
  }, [medicoesDB, obraSelecionada]);

  // Medição Liberada = (peso produzido × R$/kg) - medições já lançadas
  const valorMedicaoLiberada = Math.max(0, (dadosObraSelecionada.pesoProduzido * config.producao.valorKg) - totalMedicoesLancadas);

  const salvarConfig = () => {
    const valor = parseFloat(novoValorKg);
    if (isNaN(valor) || valor <= 0) return;
    setConfig(prev => ({
      ...prev,
      producao: { ...prev.producao, valorKg: valor }
    }));
    setEditandoConfig(null);
    setNovoValorKg('');
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPeso = (kg) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(2)}t`;
    }
    return `${kg.toLocaleString('pt-BR')} kg`;
  };

  const handleCriarMedicao = () => {
    if (!formMedicao.peso || !formMedicao.obra) {
      toast.error('Preencher peso e obra');
      return;
    }
    const obraObj = obrasAtivas.find(o => o.id === formMedicao.obra);
    const novaMedicao = {
      id: `med-${Date.now()}`,
      tipo: 'producao',
      obraId: formMedicao.obra,
      obra: obraObj?.nome || 'Obra',
      periodo: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      pesoMedido: parseFloat(formMedicao.peso),
      valorKg: config.producao.valorKg,
      valorTotal: parseFloat(formMedicao.peso) * config.producao.valorKg,
      status: 'pendente',
      dataCriacao: new Date().toISOString().split('T')[0]
    };
    setMedicoes([...medicoes, novaMedicao]);
    toast.success('Medição criada com sucesso!');
    setModalNovaMedicao(false);
    setFormMedicao({ peso: '', obra: '' });
  };

  const handleEditarMedicao = (medicao) => {
    toast.success(`Editando medição ${medicao.id}`);
  };

  const handleDownloadMedicao = (medicao) => {
    const csv = `ID,Obra,Período,Tipo,Peso,Valor/kg,Total,Status\n${medicao.id},${medicao.obra},${medicao.periodo},${medicao.tipo},${medicao.pesoMedido},${medicao.valorKg},${medicao.valorTotal},${medicao.status}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medicao-${medicao.id}.csv`;
    a.click();
    toast.success('Medição exportada com sucesso!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Target className="h-7 w-7 text-emerald-500" />
            Medição Automática - Produção
          </h1>
          <p className="text-slate-400 mt-1">Cálculo automático por valor de KG produzido (pintado)</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setModalNovaMedicao(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Medição
          </Button>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-400" />
            <span className="text-slate-300 font-medium">Filtrar por Obra:</span>
          </div>
          <Select.Root value={obraSelecionada} onValueChange={setObraSelecionada}>
            <Select.Trigger className="flex items-center justify-between min-w-[300px] px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white">
              <Select.Value placeholder="Selecione uma obra" />
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                <Select.Viewport className="p-1">
                  <Select.Item value="todas" className="px-4 py-2 text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                    <Select.ItemText>Todas as Obras (Consolidado)</Select.ItemText>
                  </Select.Item>
                  {obrasAtivas.map(obra => (
                    <Select.Item key={obra.id} value={obra.id} className="px-4 py-2 text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                      <Select.ItemText>{obra.nome}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          {obraSelecionada !== 'todas' && (
            <div className="text-sm text-slate-400">
              Peso Total: <span className="text-white">{((obrasAtivas.find(o => o.id === obraSelecionada)?.pesoTotal || 0) / 1000).toFixed(1)}t</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-xl bg-orange-500/20">
              <DollarSign className="h-8 w-8 text-orange-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Valor por KG - Produção</h3>
              <p className="text-slate-400 text-sm">{config.producao.descricao}</p>
            </div>
          </div>
          {editandoConfig === 'producao' ? (
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                <Input type="number" step="0.01" value={novoValorKg} onChange={(e) => setNovoValorKg(e.target.value)} className="pl-10 w-32 bg-slate-900 border-slate-600 text-white" placeholder={config.producao.valorKg.toString()} autoFocus />
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={salvarConfig}>
                <Save className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" className="border-slate-600" onClick={() => { setEditandoConfig(null); setNovoValorKg(''); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-3xl font-bold text-white">
                  {formatMoney(config.producao.valorKg)}
                  <span className="text-lg text-slate-400 font-normal">/kg</span>
                </p>
              </div>
              <Button variant="outline" className="border-2 border-orange-500/50 text-orange-400 hover:bg-orange-500/20" onClick={() => { setEditandoConfig('producao'); setNovoValorKg(config.producao.valorKg.toString()); }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Valor
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Peso Produzido (Pintado)', value: formatPeso(dadosObraSelecionada.pesoProduzido), icon: Weight, cor: 'emerald' },
          { label: 'Medição Liberada', value: formatMoney(valorMedicaoLiberada), icon: DollarSign, cor: 'green' },
          { label: 'Em Processo', value: formatPeso(dadosObraSelecionada.pesoEmProcesso), icon: Layers, cor: 'amber' },
          { label: 'Peso Medido', value: formatPeso(totais.pesoTotal), icon: Target, cor: 'purple' },
          { label: 'Medições Aprovadas', value: totais.aprovadas, icon: CheckCircle2, cor: 'emerald' },
          { label: 'Medições Pendentes', value: totais.pendentes, icon: Clock, cor: 'amber' },
        ].map((kpi, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs">{kpi.label}</p>
                <p className="text-xl font-bold text-white mt-1">{kpi.value}</p>
              </div>
              <div className={cn("p-2 rounded-lg", kpi.cor === 'orange' && "bg-orange-500/20 text-orange-400", kpi.cor === 'cyan' && "bg-cyan-500/20 text-cyan-400", kpi.cor === 'purple' && "bg-purple-500/20 text-purple-400", kpi.cor === 'green' && "bg-green-500/20 text-green-400", kpi.cor === 'emerald' && "bg-emerald-500/20 text-emerald-400", kpi.cor === 'amber' && "bg-amber-500/20 text-amber-400")}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            Progresso da Produção
          </h3>
          <div className="space-y-4">
            <ProgressBar label="Em Processo (Corte → Solda)" value={dadosObraSelecionada.pesoEmProcesso} max={dadosObraSelecionada.pesoTotal || 1} color="bg-amber-500" />
            <ProgressBar label="Produzido (Pintado)" value={dadosObraSelecionada.pesoProduzido} max={dadosObraSelecionada.pesoTotal || 1} color="bg-emerald-500" />
            <ProgressBar label="Expedido (Enviado)" value={pesoExpedidoReal || dadosObraSelecionada.pesoExpedido} max={dadosObraSelecionada.pesoProduzido || 1} color="bg-blue-500" />
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-amber-400" />
            Análise de Processo
          </h3>
          <p className="text-xs text-slate-500 mb-4">Peso em etapas intermediárias (antes da pintura - não elegível para medição)</p>
          <div className="space-y-3">
            {[
              { label: 'Em Corte', value: dadosObraSelecionada.pesoEmCorte, color: 'text-slate-300', bg: 'bg-slate-600/30' },
              { label: 'Em Fabricação', value: dadosObraSelecionada.pesoEmFabricacao, color: 'text-blue-400', bg: 'bg-blue-500/20' },
              { label: 'Em Solda', value: dadosObraSelecionada.pesoEmSolda, color: 'text-orange-400', bg: 'bg-orange-500/20' },
            ].map((etapa, idx) => (
              <div key={idx} className={`flex items-center justify-between px-3 py-2 rounded-lg ${etapa.bg}`}>
                <div className="flex items-center gap-2">
                  <ArrowRight className={`h-3 w-3 ${etapa.color}`} />
                  <span className={`text-sm font-medium ${etapa.color}`}>{etapa.label}</span>
                </div>
                <span className="text-sm font-bold text-white">{formatPeso(etapa.value)}</span>
              </div>
            ))}
          </div>
          <div className="my-4 border-t border-slate-700" />
          <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <span className="text-sm font-semibold text-amber-400">Total em Processo</span>
            <span className="text-lg font-bold text-white">{formatPeso(dadosObraSelecionada.pesoEmProcesso)}</span>
          </div>
          <div className="my-4 border-t border-slate-700" />
          <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">Peso Pintado (Produzido)</span>
            </div>
            <span className="text-lg font-bold text-white">{formatPeso(dadosObraSelecionada.pesoProduzido)}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-3">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-400" />
              <div>
                <span className="text-sm font-semibold text-blue-400">Peso Expedido (Enviado)</span>
                <p className="text-xs text-slate-500">Via romaneio do módulo de expedição</p>
              </div>
            </div>
            <span className="text-lg font-bold text-white">{formatPeso(pesoExpedidoReal || dadosObraSelecionada.pesoExpedido)}</span>
          </div>
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Previsão Próxima Medição</span>
            </div>
            <p className="text-lg font-bold text-white">{formatPeso(dadosObraSelecionada.previsaoProximaMedicao)}</p>
            <p className="text-xs text-slate-500 mt-1">Peso em Solda aguardando pintura para elegibilidade de medição</p>
          </div>
        </div>
      </div>

      {dadosPorObra.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-slate-400" />
            Valor por Obra
          </h3>
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dadosPorObra} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                  {dadosPorObra.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMoney(value)} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-400" />
            Medições Realizadas - Produção
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Obra</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Período</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Peso</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">R$/kg</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Valor Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {medicoesFiltradas.length > 0 ? (
                medicoesFiltradas.map((med, idx) => (
                  <motion.tr key={med.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{med.descricao || med.obra}</p>
                      {med.origemDB && <p className="text-xs text-blue-400">{med.obra}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{med.periodo}</td>
                    <td className="px-4 py-3 text-right text-white font-mono">{formatPeso(med.pesoMedido)}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{formatMoney(med.valorKg)}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-bold">{formatMoney(med.valorTotal)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", med.status === 'aprovada' && "bg-emerald-500/20 text-emerald-400", med.status === 'pendente' && "bg-amber-500/20 text-amber-400", med.status === 'rejeitada' && "bg-red-500/20 text-red-400", med.status === 'paga' && "bg-emerald-500/20 text-emerald-400")}>
                        {med.status === 'aprovada' ? 'Aprovada/Paga' : med.status === 'paga' ? 'Paga' : med.status === 'pendente' ? 'Pendente' : 'Rejeitada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => handleEditarMedicao(med)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => handleDownloadMedicao(med)}><Download className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Nenhuma medição encontrada para os filtros selecionados</td></tr>
              )}
            </tbody>
            {medicoesFiltradas.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900/80">
                  <td colSpan={2} className="px-4 py-3 text-white font-bold">TOTAL</td>
                  <td className="px-4 py-3 text-right text-white font-bold font-mono">{formatPeso(totais.pesoTotal)}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-bold text-lg">{formatMoney(totais.valorTotal)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <Dialog.Root open={modalNovaMedicao} onOpenChange={setModalNovaMedicao}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 z-50">
            <Dialog.Title className="text-xl font-bold text-white mb-6">Nova Medição - Produção</Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Obra</label>
                <Select.Root value={formMedicao.obra} onValueChange={(value) => setFormMedicao({...formMedicao, obra: value})}>
                  <Select.Trigger className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white">
                    <Select.Value placeholder="Selecione a obra" />
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-[60]">
                      <Select.Viewport className="p-1">
                        {obrasAtivas.map(obra => (
                          <Select.Item key={obra.id} value={obra.id} className="px-4 py-2 text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                            <Select.ItemText>{obra.nome}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Peso (kg)</label>
                <Input type="number" placeholder="Ex: 15000" className="bg-slate-800 border-slate-700 text-white" value={formMedicao.peso} onChange={(e) => setFormMedicao({...formMedicao, peso: e.target.value})} />
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Valor por kg:</span>
                  <span className="text-white font-bold">{formatMoney(config.producao.valorKg)}</span>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700">
                  <span className="text-slate-400">Valor estimado:</span>
                  <span className="text-emerald-400 font-bold text-lg">{formatMoney((parseFloat(formMedicao.peso) || 0) * config.producao.valorKg)}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-700">
              <Dialog.Close asChild>
                <Button variant="outline" className="border-slate-700 text-slate-300">Cancelar</Button>
              </Dialog.Close>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCriarMedicao}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Criar Medição
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function ProgressBar({ label, value, max, color }) {
  const percentage = Math.min((value / max) * 100, 100);
  const formatPeso = (kg) => kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${kg.toLocaleString('pt-BR')} kg`;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-400">{label}</span>
        <span className="text-sm text-white font-medium">{formatPeso(value)}</span>
      </div>
      <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className={cn("h-full rounded-full", color)} />
      </div>
      <div className="text-right mt-1">
        <span className="text-xs text-slate-500">{percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
}
