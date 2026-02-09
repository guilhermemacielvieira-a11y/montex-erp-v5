/**
 * MONTEX ERP Premium - Kanban Corte Integrado
 *
 * Módulo de corte com integração:
 * - Consome material do estoque
 * - Atualiza status das peças
 * - Envia para próxima etapa (Fabricação)
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Scissors, Package, Clock, CheckCircle2, AlertTriangle, ChevronDown, Search, Settings,
  User, Cpu, Pause, ArrowRight,
  Building2, Warehouse, Eye, Edit, Zap, Box, Target, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import * as Select from '@radix-ui/react-select';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Contexto ERP
import { useERP, useProducao, useEstoque, useObras } from '@/contexts/ERPContext';
import { STATUS_CORTE, ETAPAS_PRODUCAO } from '@/data/database';

// Configuração das colunas do Kanban
const COLUNAS_CORTE = [
  { id: STATUS_CORTE.AGUARDANDO, label: 'Aguardando', icon: Clock, color: 'slate', emoji: '⏳' },
  { id: STATUS_CORTE.PROGRAMACAO, label: 'Programação', icon: Settings, color: 'blue', emoji: '📋' },
  { id: STATUS_CORTE.EM_CORTE, label: 'Em Corte', icon: Scissors, color: 'orange', emoji: '✂️' },
  { id: STATUS_CORTE.CONFERENCIA, label: 'Conferência', icon: Eye, color: 'purple', emoji: '🔍' },
  { id: STATUS_CORTE.LIBERADO, label: 'Liberado', icon: CheckCircle2, color: 'emerald', emoji: '✅' },
];

const colorMap = {
  slate: { bg: 'bg-slate-500/20', border: 'border-slate-500/30', text: 'text-slate-400', header: 'from-slate-600 to-slate-700' },
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', header: 'from-blue-600 to-blue-700' },
  orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-400', header: 'from-orange-600 to-orange-700' },
  purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', header: 'from-purple-600 to-purple-700' },
  emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400', header: 'from-emerald-600 to-emerald-700' },
};

// Card de Peça para Corte
function PecaCard({ peca, index, onMover, maquinas, funcionarios }) {
  const [expanded, setExpanded] = useState(false);
  const maquina = maquinas.find(m => m.id === peca.maquinaCorte);
  const funcionario = funcionarios.find(f => f.id === peca.funcionarioCorte);

  const handleDetalhes = () => {
    toast.success(`Detalhes da MARCA ${peca.marca} carregados`);
  };

  const handleEditar = () => {
    toast.success(`Editando MARCA ${peca.marca}`);
  };

  const prioridadeColor = {
    alta: 'border-l-red-500 bg-red-500/5',
    media: 'border-l-yellow-500 bg-yellow-500/5',
    baixa: 'border-l-green-500 bg-green-500/5',
  };

  return (
    <Draggable draggableId={peca.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "bg-slate-800/80 rounded-xl border-l-4 border border-slate-700/50 p-3 mb-2",
            "hover:bg-slate-800 transition-all cursor-grab active:cursor-grabbing",
            snapshot.isDragging && "shadow-2xl ring-2 ring-orange-500/50",
            prioridadeColor[peca.prioridade] || 'border-l-slate-500'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm">MARCA {peca.marca}</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{peca.tipo}</span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">{peca.perfil}</p>
            </div>
            <div className="text-right">
              <span className="text-white font-mono text-sm">{peca.quantidade}x</span>
              <p className="text-slate-500 text-xs">{peca.peso.toFixed(1)} kg</p>
            </div>
          </div>

          {/* Info rápida */}
          <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {peca.comprimento}mm
            </span>
            <span className="flex items-center gap-1">
              <Box className="w-3 h-3" />
              {peca.material}
            </span>
          </div>

          {/* Máquina/Operador atribuídos */}
          {(maquina || funcionario) && (
            <div className="flex items-center gap-2 text-xs mb-2">
              {maquina && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                  <Cpu className="w-3 h-3" />
                  {maquina.nome.split(' ')[0]}
                </span>
              )}
              {funcionario && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                  <User className="w-3 h-3" />
                  {funcionario.nome.split(' ')[0]}
                </span>
              )}
            </div>
          )}

          {/* Expandir */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-300 pt-2 border-t border-slate-700/50"
          >
            {expanded ? 'Menos' : 'Mais'}
            <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/50 rounded p-2">
                      <span className="text-slate-500">Obra</span>
                      <p className="text-white font-medium">{peca.obraId}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded p-2">
                      <span className="text-slate-500">Material</span>
                      <p className="text-white font-medium">{peca.material}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDetalhes}
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-xs h-7"
                    >
                      <Eye className="w-3 h-3 mr-1" /> Detalhes
                    </Button>
                    <Button
                      onClick={handleEditar}
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-xs h-7 text-orange-400"
                    >
                      <Edit className="w-3 h-3 mr-1" /> Editar
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Draggable>
  );
}

// Coluna do Kanban
function ColunaKanban({ coluna, pecas, maquinas, funcionarios, onMoverPeca }) {
  const colors = colorMap[coluna.color];
  const Icon = coluna.icon;
  const totalPeso = pecas.reduce((acc, p) => acc + p.peso, 0);

  return (
    <div className={cn(
      "flex-1 min-w-[280px] max-w-[320px] rounded-2xl border",
      colors.bg, colors.border
    )}>
      {/* Header da Coluna */}
      <div className={cn(
        "bg-gradient-to-r p-4 rounded-t-2xl",
        colors.header
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{coluna.emoji}</span>
            <div>
              <h3 className="text-white font-semibold">{coluna.label}</h3>
              <p className="text-white/70 text-xs">{pecas.length} peças • {totalPeso.toFixed(0)} kg</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold">{pecas.length}</span>
          </div>
        </div>
      </div>

      {/* Lista de Peças */}
      <Droppable droppableId={coluna.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "p-3 min-h-[400px] max-h-[calc(100vh-350px)] overflow-y-auto transition-colors",
              snapshot.isDraggingOver && "bg-slate-700/20"
            )}
          >
            {pecas.map((peca, index) => (
              <PecaCard
                key={peca.id}
                peca={peca}
                index={index}
                maquinas={maquinas}
                funcionarios={funcionarios}
              />
            ))}
            {provided.placeholder}

            {pecas.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma peça</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// Card de Máquina
function MaquinaCard({ maquina, pecasEmCorte }) {
  const pecaAtual = pecasEmCorte.find(p => p.maquinaCorte === maquina.id);

  const statusColors = {
    operando: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-500' },
    disponivel: { bg: 'bg-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500' },
    manutencao: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-500' },
  };

  const status = statusColors[maquina.status] || statusColors.disponivel;

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", status.bg)}>
            <Cpu className={cn("w-5 h-5", status.text)} />
          </div>
          <div>
            <h4 className="text-white font-medium text-sm">{maquina.nome}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={cn("w-2 h-2 rounded-full animate-pulse", status.dot)} />
              <span className={cn("text-xs capitalize", status.text)}>{maquina.status}</span>
            </div>
          </div>
        </div>
        {maquina.status === 'operando' && (
          <Button
            onClick={() => toast.success(`${maquina.nome} pausada`)}
            size="sm"
            variant="ghost"
            className="text-red-400 hover:text-red-300"
          >
            <Pause className="w-4 h-4" />
          </Button>
        )}
      </div>

      {pecaAtual && (
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Cortando agora:</p>
          <p className="text-white font-medium">MARCA {pecaAtual.marca} - {pecaAtual.tipo}</p>
          <p className="text-slate-400 text-sm">{pecaAtual.perfil}</p>
        </div>
      )}

      {!pecaAtual && maquina.status === 'disponivel' && (
        <div className="text-center py-3 text-slate-500 text-sm">
          Aguardando peça
        </div>
      )}
    </div>
  );
}

export default function KanbanCorteIntegrado() {
  // Contexto ERP
  const {
    pecas, pecasObraAtual, maquinas,
    moverPecaEtapa, updateStatusCorte, addNotificacao
  } = useProducao();
  const { estoque, estoqueObraAtual, consumirEstoque, alertasEstoque } = useEstoque();
  const { obras, obraAtual, obraAtualData } = useObras();
  const { funcionarios } = useERP();

  // Estado local
  const [filtroObra, setFiltroObra] = useState('atual');
  const [filtroPrioridade, setFiltroPrioridade] = useState('todas');
  const [busca, setBusca] = useState('');

  // Filtra peças na etapa de corte ou aguardando
  const pecasCorte = useMemo(() => {
    let items = filtroObra === 'atual' ? pecasObraAtual : pecas;

    // Filtra apenas peças em etapas de corte
    items = items.filter(p =>
      p.etapa === ETAPAS_PRODUCAO.AGUARDANDO ||
      p.etapa === ETAPAS_PRODUCAO.CORTE ||
      (p.etapa === ETAPAS_PRODUCAO.FABRICACAO && p.statusCorte !== STATUS_CORTE.LIBERADO)
    );

    if (busca) {
      const termo = busca.toLowerCase();
      items = items.filter(p =>
        p.marca.toString().includes(termo) ||
        p.tipo.toLowerCase().includes(termo) ||
        p.perfil.toLowerCase().includes(termo)
      );
    }

    return items;
  }, [pecas, pecasObraAtual, filtroObra, busca]);

  // Agrupa peças por status de corte
  const pecasPorColuna = useMemo(() => {
    const agrupado = {};
    COLUNAS_CORTE.forEach(col => {
      agrupado[col.id] = pecasCorte.filter(p => p.statusCorte === col.id);
    });
    return agrupado;
  }, [pecasCorte]);

  // Estatísticas
  const estatisticas = useMemo(() => {
    const total = pecasCorte.length;
    const pesoTotal = pecasCorte.reduce((acc, p) => acc + p.peso, 0);
    const emCorte = pecasCorte.filter(p => p.statusCorte === STATUS_CORTE.EM_CORTE).length;
    const liberadas = pecasCorte.filter(p => p.statusCorte === STATUS_CORTE.LIBERADO).length;
    const aguardando = pecasCorte.filter(p => p.statusCorte === STATUS_CORTE.AGUARDANDO).length;

    return { total, pesoTotal, emCorte, liberadas, aguardando };
  }, [pecasCorte]);

  // Máquinas de corte
  const maquinasCorte = maquinas.filter(m => m.setor === 'corte');
  const pecasEmCorte = pecasCorte.filter(p => p.statusCorte === STATUS_CORTE.EM_CORTE);

  // Handler de drag and drop
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { draggableId, source, destination } = result;

    if (source.droppableId === destination.droppableId) return;

    const novoStatus = destination.droppableId;
    const peca = pecasCorte.find(p => p.id === draggableId);

    if (!peca) return;

    // Atualiza status de corte
    updateStatusCorte(draggableId, novoStatus);

    // Se liberou para fabricação, move etapa e consome estoque
    if (novoStatus === STATUS_CORTE.LIBERADO) {
      moverPecaEtapa(draggableId, ETAPAS_PRODUCAO.FABRICACAO);

      // Simula consumo de estoque
      addNotificacao({
        tipo: 'sucesso',
        mensagem: `MARCA ${peca.marca} liberada para Fabricação!`
      });
    }

    // Se iniciou corte, notifica
    if (novoStatus === STATUS_CORTE.EM_CORTE) {
      addNotificacao({
        tipo: 'info',
        mensagem: `MARCA ${peca.marca} iniciou corte`
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Scissors className="w-8 h-8 text-red-500" />
            Kanban Corte
          </h1>
          <p className="text-slate-400 mt-1 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Obra: <span className="text-orange-400 font-medium">{obraAtualData?.codigo}</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400">{estatisticas.total} peças</span>
            <span className="text-slate-600">|</span>
            <span className="text-blue-400">{estatisticas.pesoTotal.toFixed(0)} kg</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select.Root value={filtroObra} onValueChange={setFiltroObra}>
            <Select.Trigger className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-300">
              <Building2 className="w-4 h-4" />
              <Select.Value />
              <ChevronDown className="w-4 h-4" />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="bg-slate-800 border border-slate-700 rounded-lg z-50">
                <Select.Viewport className="p-1">
                  <Select.Item value="atual" className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded cursor-pointer">
                    <Select.ItemText>Obra Atual ({obraAtualData?.codigo})</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="todas" className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded cursor-pointer">
                    <Select.ItemText>Todas as Obras</Select.ItemText>
                  </Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar marca, tipo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 w-64 bg-slate-800/50 border-slate-700"
            />
          </div>
        </div>
      </div>

      {/* KPIs Rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-500/20">
              <Clock className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{estatisticas.aguardando}</p>
              <p className="text-slate-500 text-xs">Aguardando</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Scissors className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{estatisticas.emCorte}</p>
              <p className="text-slate-500 text-xs">Em Corte</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{estatisticas.liberadas}</p>
              <p className="text-slate-500 text-xs">Liberadas</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Target className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {estatisticas.total > 0 ? ((estatisticas.liberadas / estatisticas.total) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-slate-500 text-xs">Progresso</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas de Estoque */}
      {alertasEstoque.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-yellow-400 font-medium">Atenção: {alertasEstoque.length} materiais em estoque baixo</p>
              <p className="text-yellow-400/70 text-sm">Verifique o estoque antes de iniciar novos cortes</p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto text-yellow-400">
              <Warehouse className="w-4 h-4 mr-2" />
              Ver Estoque
            </Button>
          </div>
        </div>
      )}

      {/* Máquinas de Corte */}
      <div className="bg-slate-800/30 rounded-2xl border border-slate-700/50 p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-400" />
          Máquinas de Corte
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {maquinasCorte.map(maquina => (
            <MaquinaCard
              key={maquina.id}
              maquina={maquina}
              pecasEmCorte={pecasEmCorte}
            />
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUNAS_CORTE.map(coluna => (
            <ColunaKanban
              key={coluna.id}
              coluna={coluna}
              pecas={pecasPorColuna[coluna.id] || []}
              maquinas={maquinas}
              funcionarios={funcionarios}
              onMoverPeca={updateStatusCorte}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Fluxo Visual */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-amber-400" />
            <span className="text-slate-400">Estoque</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600" />
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-orange-500/20 border border-orange-500/30">
            <Scissors className="w-5 h-5 text-orange-400" />
            <span className="text-orange-400 font-medium">CORTE</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600" />
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            <span className="text-slate-400">Fabricação</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600" />
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            <span className="text-slate-400">Solda</span>
          </div>
        </div>
      </div>
    </div>
  );
}
