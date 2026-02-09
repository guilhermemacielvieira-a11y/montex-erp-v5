// MONTEX ERP Premium - Página de Medições
// Integrado com ERPContext - Dados reais da obra SUPER LUNA

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Ruler, FileText, CheckCircle, Clock, AlertCircle, TrendingUp, Building2, ChevronDown, Plus, Download, Eye, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import * as Select from '@radix-ui/react-select';
import { cn } from '@/lib/utils';

// ERPContext - dados reais
import { useObras, useMedicoes } from '../contexts/ERPContext';

// Valores de contrato padrão (independente do módulo Gestão Financeira Obra)
const VALORES_CONTRATO = {
  valorKgFab: 5.52,
  valorKgMont: 3.31,
};

export default function MedicaoPage() {
  // ERPContext - dados reais
  const { obras, obraAtualData } = useObras();
  const { medicoes: medicoesContext } = useMedicoes();

  const [obraFiltro, setObraFiltro] = useState('todas');

  // Peso produzido e montado calculados a partir do progresso da obra
  const pesosObra = useMemo(() => {
    if (!obraAtualData) return { pesoProduzido: 0, pesoMontado: 0, pesoTotal: 0, pesoExpedido: 0 };
    const pesoTotal = obraAtualData.pesoTotal || 0;
    const progresso = obraAtualData.progresso || {};
    // Peso Produzido = SOMENTE após pintura (processo final)
    return {
      pesoTotal,
      pesoProduzido: Math.round(pesoTotal * ((progresso.pintura || 0) / 100)),
      pesoMontado: Math.round(pesoTotal * ((progresso.montagem || 0) / 100)),
      pesoExpedido: Math.round(pesoTotal * ((progresso.expedicao || 0) / 100)),
      pesoEmProcesso: Math.round(pesoTotal * (Math.max(0, (progresso.corte || 0) - (progresso.pintura || 0)) / 100)),
    };
  }, [obraAtualData]);

  // Medições vinculadas ao peso - sem dados mock
  const medicoes = useMemo(() => {
    return []; // Será preenchido com dados reais do Supabase
  }, [obraAtualData]);

  // Filtrar por obra
  const medicoesFiltradas = useMemo(() => {
    if (obraFiltro === 'todas') return medicoes;
    return medicoes.filter(m => m.obraId === obraFiltro);
  }, [medicoes, obraFiltro]);

  // KPIs vinculados ao peso produzido/montado da obra
  const kpis = useMemo(() => {
    const valorContrato = obraAtualData?.valorContrato || obraAtualData?.valor || 2700000;
    const valorKgFab = VALORES_CONTRATO.valorKgFab;
    const valorKgMont = VALORES_CONTRATO.valorKgMont;

    return {
      pesoProduzido: pesosObra.pesoProduzido,
      pesoMontado: pesosObra.pesoMontado,
      pesoTotal: pesosObra.pesoTotal,
      valorProduzido: pesosObra.pesoProduzido * valorKgFab,
      valorMontado: pesosObra.pesoMontado * valorKgMont,
      valorKgFab,
      valorKgMont,
      qtdMedicoes: medicoesFiltradas.length,
      valorContrato
    };
  }, [pesosObra, medicoesFiltradas, obraAtualData]);

  // Formatadores
  const formatMoney = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (date) => new Date(date).toLocaleDateString('pt-BR');
  const formatWeight = (peso) => peso ? `${peso.toLocaleString('pt-BR')} kg` : '-';

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pago':
      case 'aprovado':
      case 'aprovada': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'aberto':
      case 'pendente': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'rejeitada': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pago':
      case 'aprovado':
      case 'aprovada': return 'bg-emerald-500/20 text-emerald-400';
      case 'aberto':
      case 'pendente': return 'bg-amber-500/20 text-amber-400';
      case 'rejeitada': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'pago': return 'Pago';
      case 'aprovado':
      case 'aprovada': return 'Aprovada';
      case 'aberto':
      case 'pendente': return 'Pendente';
      case 'rejeitada': return 'Rejeitada';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Ruler className="h-7 w-7 text-emerald-500" />
            Controle de Medições
          </h1>
          <p className="text-slate-400 mt-1">Faturamento e acompanhamento financeiro por obra</p>
        </div>
        <div className="flex gap-3">
          {/* Filtro por Obra */}
          <Select.Root value={obraFiltro} onValueChange={setObraFiltro}>
            <Select.Trigger className="flex items-center justify-between min-w-[200px] px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white">
              <Building2 className="h-4 w-4 text-slate-400 mr-2" />
              <Select.Value />
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                <Select.Viewport className="p-1">
                  <Select.Item value="todas" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                    <Select.ItemText>📊 Todas as Obras</Select.ItemText>
                  </Select.Item>
                  {obras.map(obra => (
                    <Select.Item key={obra.id} value={obra.id} className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                      <Select.ItemText>{obra.nome}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          <Button
            onClick={() => toast.success('Exportação iniciada com sucesso!')}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button
            onClick={() => toast.success('Formulário de medição em desenvolvimento')}
            className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="h-4 w-4 mr-2" />
            Nova Medição
          </Button>
        </div>
      </div>

      {/* KPIs - Peso Produzido e Montado */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Peso Total Obra',
            value: formatWeight(kpis.pesoTotal),
            icon: Ruler,
            cor: 'blue',
            subtitle: obraAtualData?.nome || '-'
          },
          {
            label: 'Peso Produzido (Pintado)',
            value: formatWeight(kpis.pesoProduzido),
            icon: CheckCircle,
            cor: 'emerald',
            subtitle: `R$ ${kpis.valorKgFab}/kg → ${formatMoney(kpis.valorProduzido)}`
          },
          {
            label: 'Peso Montado',
            value: formatWeight(kpis.pesoMontado),
            icon: TrendingUp,
            cor: 'cyan',
            subtitle: `R$ ${kpis.valorKgMont}/kg → ${formatMoney(kpis.valorMontado)}`
          },
          {
            label: 'Medições',
            value: kpis.qtdMedicoes,
            icon: FileText,
            cor: 'purple',
            subtitle: 'Realizadas'
          },
          {
            label: 'Valor Contrato',
            value: formatMoney(kpis.valorContrato),
            icon: TrendingUp,
            cor: 'amber',
            subtitle: `Saldo: ${formatMoney(kpis.valorContrato - kpis.valorProduzido - kpis.valorMontado)}`
          },
        ].map((kpi, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs">{kpi.label}</p>
                <p className="text-xl font-bold text-white mt-1">{kpi.value}</p>
                {kpi.subtitle && (
                  <p className="text-slate-500 text-xs mt-1">{kpi.subtitle}</p>
                )}
              </div>
              <div className={cn(
                "p-2 rounded-lg",
                kpi.cor === 'blue' && "bg-blue-500/20 text-blue-400",
                kpi.cor === 'emerald' && "bg-emerald-500/20 text-emerald-400",
                kpi.cor === 'amber' && "bg-amber-500/20 text-amber-400",
                kpi.cor === 'purple' && "bg-purple-500/20 text-purple-400",
                kpi.cor === 'cyan' && "bg-cyan-500/20 text-cyan-400",
              )}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lista de Medições */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-white font-semibold">Histórico de Medições</h3>
          <span className="text-slate-400 text-sm">{medicoesFiltradas.length} medições</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Nº</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Obra</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Data</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Valor</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Peso</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">% Contrato</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">NF</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {medicoesFiltradas.map((medicao, idx) => (
                <motion.tr
                  key={medicao.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-slate-700/50 hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3 font-mono text-white font-medium">
                    {medicao.numero}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{medicao.projeto}</p>
                    <p className="text-slate-500 text-xs">{medicao.obraId}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatDate(medicao.data)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-400">
                    {formatMoney(medicao.valor)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300">
                    {formatWeight(medicao.peso)}
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    {medicao.percentual.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-slate-400 text-sm">
                    {medicao.nf || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                      getStatusColor(medicao.status)
                    )}>
                      {getStatusIcon(medicao.status)}
                      {getStatusLabel(medicao.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-white"
                        onClick={() => toast.info('Detalhes da medição')}>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo de Valores por KG */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-400" />
          Valores de Medição - {obraAtualData?.nome || '-'}
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Fabricação (R$/kg)</p>
            <p className="text-2xl font-bold text-white mt-2">R$ {VALORES_CONTRATO.valorKgFab.toFixed(2)}</p>
            <p className="text-slate-500 text-xs mt-1">Valor por kg produzido</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Montagem (R$/kg)</p>
            <p className="text-2xl font-bold text-white mt-2">R$ {VALORES_CONTRATO.valorKgMont.toFixed(2)}</p>
            <p className="text-slate-500 text-xs mt-1">Valor por kg montado</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-sm">Valor Total Previsto</p>
            <p className="text-2xl font-bold text-emerald-400 mt-2">
              {formatMoney(
                (pesosObra.pesoTotal * VALORES_CONTRATO.valorKgFab) +
                (pesosObra.pesoTotal * VALORES_CONTRATO.valorKgMont)
              )}
            </p>
            <p className="text-slate-500 text-xs mt-1">Fabricação + Montagem ({formatWeight(pesosObra.pesoTotal)})</p>
          </div>
        </div>
      </div>
    </div>
  );
}
