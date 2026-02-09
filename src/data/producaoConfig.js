// MONTEX ERP Premium - Configurações de Produção
// Baseado no sistema legado montex-app.js

import { Clock, Scissors, Wrench, Zap, Paintbrush, CheckCircle2, Truck } from 'lucide-react';

// ==================== PROCESSOS DE PRODUÇÃO ====================
export const PROCESSOS_PRODUCAO = [
  {
    id: 'AGUARDANDO',
    nome: 'Aguardando',
    cor: '#64748b',
    icon: Clock,
    emoji: '⏳',
    ordem: 1,
    descricao: 'Peças aguardando início da produção'
  },
  {
    id: 'CORTE',
    nome: 'Corte',
    cor: '#f59e0b',
    icon: Scissors,
    emoji: '✂️',
    ordem: 2,
    descricao: 'Corte CNC/Plasma/Serra'
  },
  {
    id: 'FABRICACAO',
    nome: 'Fabricação',
    cor: '#3b82f6',
    icon: Wrench,
    emoji: '🔧',
    ordem: 3,
    descricao: 'Montagem e preparação'
  },
  {
    id: 'SOLDA',
    nome: 'Solda',
    cor: '#8b5cf6',
    icon: Zap,
    emoji: '⚡',
    ordem: 4,
    descricao: 'Soldagem MIG/TIG/Eletrodo'
  },
  {
    id: 'PINTURA',
    nome: 'Pintura',
    cor: '#ec4899',
    icon: Paintbrush,
    emoji: '🎨',
    ordem: 5,
    descricao: 'Jateamento e pintura'
  },
  {
    id: 'EXPEDIDO',
    nome: 'Expedido',
    cor: '#10b981',
    icon: CheckCircle2,
    emoji: '✅',
    ordem: 6,
    descricao: 'Enviado para obra'
  },
];

// ==================== CATEGORIAS DE PEÇAS ====================
export const CATEGORIAS_PECAS = [
  { id: 'VIGAS', nome: 'Vigas', cor: '#3b82f6', emoji: '🔩', ordem: 1 },
  { id: 'TESOURAS', nome: 'Tesouras', cor: '#8b5cf6', emoji: '🏗️', ordem: 2 },
  { id: 'TERCAS', nome: 'Terças', cor: '#10b981', emoji: '📏', ordem: 3 },
  { id: 'VIGAS_TRAV', nome: 'Vigas Trav.', cor: '#f59e0b', emoji: '🔗', ordem: 4 },
  { id: 'CONTRAV', nome: 'Contrav.', cor: '#ef4444', emoji: '⚡', ordem: 5 },
  { id: 'TIRANTES', nome: 'Tirantes', cor: '#ec4899', emoji: '🔧', ordem: 6 },
  { id: 'LANTERNIM', nome: 'Lanternim', cor: '#06b6d4', emoji: '💡', ordem: 7 },
  { id: 'MAO_FRANCESA', nome: 'Mão Francesa', cor: '#84cc16', emoji: '✋', ordem: 8 },
  { id: 'PASSARELA', nome: 'Passarela', cor: '#f97316', emoji: '🚶', ordem: 9 },
  { id: 'OUTROS', nome: 'Outros', cor: '#6366f1', emoji: '📦', ordem: 99 },
];

// ==================== FUNÇÕES DE PRODUÇÃO ====================
export const FUNCOES_PRODUCAO = [
  { id: 'cortador', nome: 'Cortador', cor: '#f59e0b', setor: 'CORTE' },
  { id: 'caldeireiro', nome: 'Caldeireiro', cor: '#3b82f6', setor: 'FABRICACAO' },
  { id: 'soldador', nome: 'Soldador', cor: '#8b5cf6', setor: 'SOLDA' },
  { id: 'pintor', nome: 'Pintor', cor: '#ec4899', setor: 'PINTURA' },
  { id: 'montador', nome: 'Montador', cor: '#10b981', setor: 'MONTAGEM' },
  { id: 'operador_cnc', nome: 'Operador CNC', cor: '#06b6d4', setor: 'CORTE' },
  { id: 'lider', nome: 'Líder de Produção', cor: '#f97316', setor: 'GERAL' },
  { id: 'auxiliar', nome: 'Auxiliar', cor: '#6b7280', setor: 'GERAL' },
];

// ==================== HELPERS ====================
export const getProcessoInfo = (id) =>
  PROCESSOS_PRODUCAO.find(p => p.id === id) || PROCESSOS_PRODUCAO[0];

export const getCategoriaInfo = (id) =>
  CATEGORIAS_PECAS.find(c => c.id === id) || CATEGORIAS_PECAS[9];

export const getFuncaoInfo = (id) =>
  FUNCOES_PRODUCAO.find(f => f.id === id) || FUNCOES_PRODUCAO[7];

// ==================== COLUNAS KANBAN FORMATADAS ====================
export const COLUNAS_KANBAN = PROCESSOS_PRODUCAO.map(p => ({
  id: p.id.toLowerCase(),
  title: p.nome,
  icon: p.icon,
  color: `from-[${p.cor}] to-[${p.cor}]`,
  bgColor: `bg-[${p.cor}]/10`,
  borderColor: `border-[${p.cor}]/30`,
  hexColor: p.cor,
  description: p.descricao,
  emoji: p.emoji,
}));

// Configuração simplificada para Kanban
export const KANBAN_CONFIG = [
  {
    id: 'aguardando',
    apiId: 'AGUARDANDO',
    title: 'Aguardando',
    icon: Clock,
    color: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    hexColor: '#64748b',
    emoji: '⏳',
  },
  {
    id: 'corte',
    apiId: 'CORTE',
    title: 'Corte',
    icon: Scissors,
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    hexColor: '#f59e0b',
    emoji: '✂️',
  },
  {
    id: 'fabricacao',
    apiId: 'FABRICACAO',
    title: 'Fabricação',
    icon: Wrench,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    hexColor: '#3b82f6',
    emoji: '🔧',
  },
  {
    id: 'solda',
    apiId: 'SOLDA',
    title: 'Solda',
    icon: Zap,
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    hexColor: '#8b5cf6',
    emoji: '⚡',
  },
  {
    id: 'pintura',
    apiId: 'PINTURA',
    title: 'Pintura',
    icon: Paintbrush,
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    hexColor: '#ec4899',
    emoji: '🎨',
  },
  {
    id: 'expedido',
    apiId: 'EXPEDIDO',
    title: 'Expedido',
    icon: CheckCircle2,
    color: 'from-emerald-500 to-green-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    hexColor: '#10b981',
    emoji: '✅',
  },
];

export default {
  PROCESSOS_PRODUCAO,
  CATEGORIAS_PECAS,
  FUNCOES_PRODUCAO,
  KANBAN_CONFIG,
  getProcessoInfo,
  getCategoriaInfo,
  getFuncaoInfo,
};
