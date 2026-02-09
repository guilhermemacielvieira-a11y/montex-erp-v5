// MONTEX ERP Premium - Relationship Model Component
// Integrado com ERPContext

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch,
  Building2,
  Users,
  Factory,
  DollarSign,
  X,
  Link2
} from 'lucide-react';

// ERPContext para dados reais
import { useObras, useProducao, useOrcamentos } from '../../contexts/ERPContext';

// Dados financeiros reais
import { LANCAMENTOS_DESPESAS, MEDICOES_RECEITAS } from '../../data/obraFinanceiraDatabase';

// Formatador de moeda
const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const RelationshipModel = () => {
  // Dados reais do contexto
  const { obras } = useObras();
  const { pecas } = useProducao();
  const { orcamentos } = useOrcamentos();

  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedConnections, setHighlightedConnections] = useState([]);

  // Build relationship data using real data
  const relationships = useMemo(() => {
    const nodes = {
      projetos: obras.map(p => ({
        id: p.id,
        type: 'projeto',
        label: p.nome.split(' - ')[0],
        data: p,
        icon: Building2,
        color: 'cyan'
      })),
      clientes: [...new Set(obras.map(p => p.cliente))].map((cliente, i) => ({
        id: `cliente-${i}`,
        type: 'cliente',
        label: cliente,
        data: { cliente },
        icon: Users,
        color: 'purple'
      })),
      producao: obras.map(p => ({
        id: `prod-${p.id}`,
        type: 'producao',
        label: `Produção ${p.nome.split(' ')[0]}`,
        data: {
          itens: pecas.filter(i => i.obraId === p.id),
          projeto_id: p.id
        },
        icon: Factory,
        color: 'amber'
      })),
      financeiro: obras.map(p => ({
        id: `fin-${p.id}`,
        type: 'financeiro',
        label: `Financeiro ${p.nome.split(' ')[0]}`,
        data: {
          movimentacoes: [...LANCAMENTOS_DESPESAS, ...MEDICOES_RECEITAS],
          projeto_id: p.id
        },
        icon: DollarSign,
        color: 'emerald'
      }))
    };

    // Build connections
    const connections = [];
    obras.forEach(projeto => {
      // Cliente -> Projeto
      const clienteNode = nodes.clientes.find(c => c.label === projeto.cliente);
      if (clienteNode) {
        connections.push({
          from: clienteNode.id,
          to: projeto.id,
          type: 'cliente-projeto',
          label: 'Contratou'
        });
      }

      // Projeto -> Produção
      connections.push({
        from: projeto.id,
        to: `prod-${projeto.id}`,
        type: 'projeto-producao',
        label: 'Fabrica'
      });

      // Projeto -> Financeiro
      connections.push({
        from: projeto.id,
        to: `fin-${projeto.id}`,
        type: 'projeto-financeiro',
        label: 'Movimenta'
      });
    });

    return { nodes, connections };
  }, [obras, pecas]);

  const handleNodeClick = (node) => {
    setSelectedNode(node);

    // Find all related connections
    const related = relationships.connections.filter(
      c => c.from === node.id || c.to === node.id
    );
    setHighlightedConnections(related.map(r => r.from === node.id ? r.to : r.from));
  };

  const clearSelection = () => {
    setSelectedNode(null);
    setHighlightedConnections([]);
  };

  // Get node stats
  const getNodeStats = (node) => {
    switch (node.type) {
      case 'projeto':
        return [
          { label: 'Valor', value: formatCurrency(node.data.valor_total || 0) },
          { label: 'Progresso', value: `${node.data.progresso || 0}%` },
          { label: 'Peso', value: `${((node.data.peso_total || 0) / 1000).toFixed(1)} ton` }
        ];
      case 'cliente':
        const clientProjects = obras.filter(p => p.cliente === node.label);
        return [
          { label: 'Projetos', value: clientProjects.length },
          { label: 'Valor Total', value: formatCurrency(clientProjects.reduce((a, p) => a + (p.valor_total || 0), 0)) }
        ];
      case 'producao':
        const itens = node.data.itens || [];
        return [
          { label: 'Itens', value: itens.length },
          { label: 'Concluídos', value: itens.filter(i => i.status === 'concluido').length }
        ];
      case 'financeiro':
        const movs = node.data.movimentacoes || [];
        const receitas = movs.filter(m => m.tipo === 'receita').reduce((a, m) => a + m.valor, 0);
        const despesas = movs.filter(m => m.tipo === 'despesa').reduce((a, m) => a + m.valor, 0);
        return [
          { label: 'Receitas', value: formatCurrency(receitas) },
          { label: 'Despesas', value: formatCurrency(despesas) }
        ];
      default:
        return [];
    }
  };

  const NodeCard = ({ node, size = 'normal' }) => {
    const Icon = node.icon;
    const isSelected = selectedNode?.id === node.id;
    const isHighlighted = highlightedConnections.includes(node.id);
    const isSmall = size === 'small';

    const colorClasses = {
      cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400', glow: 'shadow-cyan-500/30' },
      purple: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400', glow: 'shadow-purple-500/30' },
      amber: { bg: 'bg-amber-500/20', border: 'border-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/30' },
      emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/30' }
    };

    const colors = colorClasses[node.color] || colorClasses.cyan;

    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleNodeClick(node)}
        className={`
          cursor-pointer rounded-xl border-2 transition-all
          ${isSmall ? 'p-2' : 'p-3'}
          ${colors.bg}
          ${isSelected ? `${colors.border} shadow-lg ${colors.glow}` : 'border-transparent'}
          ${isHighlighted ? 'ring-2 ring-white/30' : ''}
          ${!isSelected && !isHighlighted ? 'opacity-70 hover:opacity-100' : ''}
        `}
      >
        <div className="flex items-center gap-2">
          <div className={`${isSmall ? 'w-6 h-6' : 'w-8 h-8'} rounded-lg ${colors.bg} flex items-center justify-center`}>
            <Icon className={`${isSmall ? 'w-3 h-3' : 'w-4 h-4'} ${colors.text}`} />
          </div>
          <span className={`${isSmall ? 'text-xs' : 'text-sm'} text-white font-medium truncate max-w-[100px]`}>
            {node.label}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Modelo de Relações</h3>
            <p className="text-slate-400 text-xs">Visualize conexões entre entidades</p>
          </div>
        </div>
        {selectedNode && (
          <button
            onClick={clearSelection}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-6 pb-4 border-b border-slate-700/30">
          {[
            { icon: Users, label: 'Clientes', color: 'purple' },
            { icon: Building2, label: 'Projetos', color: 'cyan' },
            { icon: Factory, label: 'Produção', color: 'amber' },
            { icon: DollarSign, label: 'Financeiro', color: 'emerald' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-${item.color}-500`} />
              <span className="text-xs text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Relationship Visualization */}
        <div className="grid grid-cols-4 gap-4 relative">
          {/* Column 1: Clientes */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-3 h-3" />
              Clientes
            </h4>
            {relationships.nodes.clientes.slice(0, 4).map(node => (
              <NodeCard key={node.id} node={node} size="small" />
            ))}
          </div>

          {/* Column 2: Projetos */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-cyan-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-3 h-3" />
              Projetos
            </h4>
            {relationships.nodes.projetos.slice(0, 4).map(node => (
              <NodeCard key={node.id} node={node} size="small" />
            ))}
          </div>

          {/* Column 3: Produção */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Factory className="w-3 h-3" />
              Produção
            </h4>
            {relationships.nodes.producao.slice(0, 4).map(node => (
              <NodeCard key={node.id} node={node} size="small" />
            ))}
          </div>

          {/* Column 4: Financeiro */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign className="w-3 h-3" />
              Financeiro
            </h4>
            {relationships.nodes.financeiro.slice(0, 4).map(node => (
              <NodeCard key={node.id} node={node} size="small" />
            ))}
          </div>

          {/* Connection Lines Overlay */}
          <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.5" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Selected Node Details */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-slate-700/30"
            >
              <div className="bg-slate-900/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <selectedNode.icon className={`w-6 h-6 text-${selectedNode.color}-400`} />
                  <div>
                    <h4 className="text-white font-semibold">{selectedNode.label}</h4>
                    <p className="text-slate-400 text-xs capitalize">{selectedNode.type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {getNodeStats(selectedNode).map((stat, i) => (
                    <div key={i} className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-500 mb-1">{stat.label}</div>
                      <div className={`text-sm font-semibold text-${selectedNode.color}-400`}>
                        {stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Related Entities */}
                <div className="mt-4">
                  <h5 className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Link2 className="w-3 h-3" />
                    Entidades Relacionadas
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {highlightedConnections.map(connId => {
                      const allNodes = [
                        ...relationships.nodes.projetos,
                        ...relationships.nodes.clientes,
                        ...relationships.nodes.producao,
                        ...relationships.nodes.financeiro
                      ];
                      const relatedNode = allNodes.find(n => n.id === connId);
                      if (!relatedNode) return null;

                      return (
                        <span
                          key={connId}
                          className={`px-2 py-1 rounded text-xs bg-${relatedNode.color}-500/20 text-${relatedNode.color}-400`}
                        >
                          {relatedNode.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connection Stats */}
        <div className="mt-4 pt-4 border-t border-slate-700/30">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-purple-400">{relationships.nodes.clientes.length}</div>
              <div className="text-xs text-slate-500">Clientes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-400">{relationships.nodes.projetos.length}</div>
              <div className="text-xs text-slate-500">Projetos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">{pecas.length}</div>
              <div className="text-xs text-slate-500">Itens Prod.</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{relationships.connections.length}</div>
              <div className="text-xs text-slate-500">Conexões</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RelationshipModel;
