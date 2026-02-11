// MONTEX ERP Premium - Página de Montagem
// Integrado com ERPContext - Dados reais da obra SUPER LUNA

import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Wrench, CheckCircle, Clock, MapPin, Users, Package,
  Building2, ChevronDown, Plus, Download, Filter, TrendingUp, Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import * as Select from '@radix-ui/react-select';
import { cn } from '@/lib/utils';

// ERPContext - dados reais
import { useObras, useProducao, useEquipes } from '../contexts/ERPContext';
import { ETAPAS_PRODUCAO } from '../data/database';

export default function MontagemPage() {
  // ERPContext - dados reais
  const { obras, obraAtualData } = useObras();
  const { pecas } = useProducao();
  const { equipes, funcionarios } = useEquipes();

  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [obraFiltro, setObraFiltro] = useState('todas');

  // Equipes de montagem - dados do Supabase via useEquipes()
  const equipesMontagem = useMemo(() => {
    if (!equipes || equipes.length === 0) return [];
    return equipes.map(eq => {
      // Encontrar membros da equipe
      const membrosEquipe = funcionarios?.filter(f => f.equipeId === eq.id) || [];
      const liderFunc = funcionarios?.find(f => f.id === eq.liderId) || membrosEquipe[0];
      // Tipo → status visual
      const statusMap = { producao: 'em_campo', pintura: 'em_campo', montagem: 'em_campo' };
      return {
        id: eq.id,
        nome: eq.nome || `Equipe ${eq.id}`,
        membros: membrosEquipe.length || 0,
        lider: liderFunc?.nome || 'Sem líder',
        status: statusMap[eq.tipo] || 'disponivel',
        projeto: obraAtualData?.nome || null,
      };
    });
  }, [equipes, funcionarios, obraAtualData]);

  // Itens de montagem derivados das peças expedidas
  const itensMontagem = useMemo(() => {
    // Filtrar peças que estão em etapa de expedição ou já montadas
    const pecasExpedidas = pecas.filter(p =>
      p.etapa === ETAPAS_PRODUCAO.EXPEDIDO ||
      p.statusMontagem === 'montado' ||
      p.statusMontagem === 'em_montagem'
    );

    // Criar itens de montagem baseados nas peças
    return pecasExpedidas.map((peca, idx) => {
      const obra = obras.find(o => o.id === peca.obraId);
      return {
        id: peca.id || idx + 1,
        codigo: `MK-${peca.marca}`,
        descricao: peca.descricao || `${peca.tipo || peca.perfil} - ${peca.marca}`,
        peso: peca.peso || 0,
        projeto: obra?.nome || 'SUPER LUNA - BELO VALE',
        obraId: peca.obraId,
        status: peca.statusMontagem || 'aguardando',
        dataMontagem: peca.dataMontagem || null,
        dataExpedicao: peca.dataExpedicao || null,
        romaneio: peca.romaneio || null
      };
    });
  }, [pecas, obras]);

  // Sem dados simulados - será preenchido com dados reais
  const itensMontagemCompletos = useMemo(() => {
    return itensMontagem; // Dados reais do ERPContext
  }, [itensMontagem]);

  // Filtrar por status
  const itensFiltrados = useMemo(() => {
    let resultado = itensMontagemCompletos;
    if (filtroStatus !== 'todos') {
      resultado = resultado.filter(item => item.status === filtroStatus);
    }
    if (obraFiltro !== 'todas') {
      resultado = resultado.filter(item => item.obraId === obraFiltro);
    }
    return resultado;
  }, [itensMontagemCompletos, filtroStatus, obraFiltro]);

  // KPIs calculados
  const kpis = useMemo(() => {
    const itens = itensMontagemCompletos;
    const totalPeso = itens.reduce((acc, item) => acc + item.peso, 0);
    const pesoMontado = itens.filter(i => i.status === 'montado').reduce((acc, item) => acc + item.peso, 0);
    const pesoEmMontagem = itens.filter(i => i.status === 'em_montagem').reduce((acc, item) => acc + item.peso, 0);
    const pesoAguardando = itens.filter(i => i.status === 'aguardando').reduce((acc, item) => acc + item.peso, 0);
    const progressoMontagem = totalPeso > 0 ? (pesoMontado / totalPeso) * 100 : 0;
    const equipesAtivas = equipesMontagem.filter(e => e.status === 'em_campo').length;

    return {
      totalPeso,
      pesoMontado,
      pesoEmMontagem,
      pesoAguardando,
      progressoMontagem,
      equipesAtivas,
      totalEquipes: equipesMontagem.length,
      totalItens: itens.length,
      itensMontados: itens.filter(i => i.status === 'montado').length,
    };
  }, [itensMontagemCompletos, equipesMontagem]);

  // Formatadores
  const formatWeight = (peso) => `${peso.toLocaleString('pt-BR')} kg`;
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('pt-BR') : '-';

  const getStatusBadge = (status) => {
    const statusConfig = {
      montado: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Montado', icon: CheckCircle },
      em_montagem: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Em Montagem', icon: Wrench },
      aguardando: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Aguardando (Após Pintura)', icon: Clock },
      em_campo: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Em Campo', icon: MapPin },
      disponivel: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Disponível', icon: CheckCircle },
    };
    const config = statusConfig[status] || statusConfig.aguardando;
    const Icon = config.icon;
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", config.bg, config.text)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Wrench className="h-7 w-7 text-orange-500" />
            Controle de Montagem
          </h1>
          <p className="text-slate-400 mt-1">Acompanhamento de montagem em campo</p>
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
            onClick={() => toast.success('Relatório em desenvolvimento')}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800">
            <Download className="h-4 w-4 mr-2" />
            Relatório
          </Button>
          <Button
            onClick={() => toast.success('Formulário de montagem em desenvolvimento')}
            className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            Registrar Montagem
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Peso Montado', value: formatWeight(kpis.pesoMontado), icon: CheckCircle, cor: 'emerald', subtitle: `${kpis.itensMontados} itens` },
          { label: 'Em Montagem', value: formatWeight(kpis.pesoEmMontagem), icon: Wrench, cor: 'blue', subtitle: 'Em andamento' },
          { label: 'Aguardando', value: formatWeight(kpis.pesoAguardando), icon: Clock, cor: 'amber', subtitle: 'Após Pintura' },
          { label: 'Equipes Ativas', value: `${kpis.equipesAtivas}/${kpis.totalEquipes}`, icon: Users, cor: 'purple', subtitle: 'Em campo' },
          { label: 'Progresso', value: `${kpis.progressoMontagem.toFixed(1)}%`, icon: TrendingUp, cor: 'cyan', subtitle: formatWeight(kpis.totalPeso) },
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
                kpi.cor === 'emerald' && "bg-emerald-500/20 text-emerald-400",
                kpi.cor === 'blue' && "bg-blue-500/20 text-blue-400",
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

      {/* Progresso Geral */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-cyan-400" />
          Progresso Geral de Montagem - {obraAtualData?.nome || 'SUPER LUNA'}
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Peso total da obra</span>
            <span className="font-medium text-white">{kpis.progressoMontagem.toFixed(1)}%</span>
          </div>
          <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${kpis.progressoMontagem}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>{formatWeight(kpis.pesoMontado)} montado</span>
            <span>{formatWeight(kpis.totalPeso)} total</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipes de Montagem */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Equipes de Montagem
            </h3>
          </div>
          <div className="p-4 space-y-4">
            {equipesMontagem.map((equipe, idx) => (
              <motion.div
                key={equipe.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center justify-between p-4 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Users className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{equipe.nome}</p>
                    <p className="text-sm text-slate-400">{equipe.membros} membros • {equipe.lider}</p>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(equipe.status)}
                  {equipe.projeto && (
                    <p className="text-xs text-slate-500 mt-2 flex items-center justify-end gap-1">
                      <MapPin className="h-3 w-3" />
                      {equipe.projeto}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Itens para Montagem */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-400" />
              Itens para Montagem
            </h3>
            <Select.Root value={filtroStatus} onValueChange={setFiltroStatus}>
              <Select.Trigger className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white">
                <Filter className="h-3 w-3" />
                <Select.Value />
                <ChevronDown className="h-3 w-3" />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                  <Select.Viewport className="p-1">
                    <Select.Item value="todos" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                      <Select.ItemText>Todos</Select.ItemText>
                    </Select.Item>
                    <Select.Item value="montado" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                      <Select.ItemText>🟢 Montado</Select.ItemText>
                    </Select.Item>
                    <Select.Item value="em_montagem" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                      <Select.ItemText>🔵 Em Montagem</Select.ItemText>
                    </Select.Item>
                    <Select.Item value="aguardando" className="px-3 py-2 text-sm text-white hover:bg-slate-700 rounded cursor-pointer outline-none">
                      <Select.ItemText>🟡 Aguardando</Select.ItemText>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
          <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
            {itensFiltrados.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-700 rounded-lg hover:border-slate-600 transition-all"
              >
                <div>
                  <p className="font-mono font-medium text-white">{item.codigo}</p>
                  <p className="text-sm text-slate-400">{item.descricao}</p>
                  <p className="text-xs text-slate-500">{formatWeight(item.peso)}</p>
                </div>
                <div className="text-right">
                  {getStatusBadge(item.status)}
                  {item.dataMontagem && (
                    <p className="text-xs text-slate-500 mt-2 flex items-center justify-end gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.dataMontagem)}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
