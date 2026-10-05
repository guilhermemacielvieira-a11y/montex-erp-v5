// ============================================================
// Insights IA — constantes de apresentação (sem dados)
// ============================================================

import { ArrowUpCircle, MinusCircle, ArrowDownCircle, Sparkles, Check, Loader, CheckCheck, XCircle } from 'lucide-react';
import { STATUS, NEUTRO } from '@/components/bi/biUi';

export const FOCOS = [
  { valor: 'geral', rotulo: 'Visão geral', descricao: 'visão geral (produção, obras, caixa e suprimentos)' },
  { valor: 'producao', rotulo: 'Produção e prazos', descricao: 'produção e prazos (ritmo, gargalos, lead time, atrasos de obra)' },
  { valor: 'caixa', rotulo: 'Caixa e recebimentos', descricao: 'caixa e recebimentos (a receber vencido, contas a pagar, fluxo das próximas semanas)' },
  { valor: 'obras', rotulo: 'Obras e contratos', descricao: 'obras e contratos (físico × financeiro, saldo a medir, prazos contratuais)' },
  { valor: 'suprimentos', rotulo: 'Suprimentos', descricao: 'suprimentos (estoque crítico, curva ABC, fornecedores)' },
];
export const focoDe = (v) => FOCOS.find((f) => f.valor === v) || FOCOS[0];

export const IMPACTO_UI = {
  alto: { rotulo: 'Impacto alto', cor: STATUS.critico, Icone: ArrowUpCircle, ordem: 0 },
  medio: { rotulo: 'Impacto médio', cor: STATUS.atencao, Icone: MinusCircle, ordem: 1 },
  baixo: { rotulo: 'Impacto baixo', cor: NEUTRO, Icone: ArrowDownCircle, ordem: 2 },
};

export const PRAZO_UI = {
  hoje: { rotulo: 'Hoje', ordem: 0 },
  esta_semana: { rotulo: 'Esta semana', ordem: 1 },
  este_mes: { rotulo: 'Este mês', ordem: 2 },
};

export const STATUS_REC_UI = {
  nova: { rotulo: 'Nova', Icone: Sparkles, cls: 'border-sky-500/60 bg-sky-500/15 text-sky-200' },
  aceita: { rotulo: 'Aceita', Icone: Check, cls: 'border-indigo-400/60 bg-indigo-500/15 text-indigo-200' },
  andamento: { rotulo: 'Em andamento', Icone: Loader, cls: 'border-yellow-500/60 bg-yellow-500/15 text-yellow-200' },
  concluida: { rotulo: 'Concluída', Icone: CheckCheck, cls: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200' },
  descartada: { rotulo: 'Descartada', Icone: XCircle, cls: 'border-slate-500/60 bg-slate-600/20 text-slate-300' },
};
export const ORDEM_STATUS_REC = ['nova', 'aceita', 'andamento', 'concluida', 'descartada'];

export const AREAS_REC = ['Produção', 'Obras', 'Financeiro', 'Suprimentos', 'Comercial', 'Dados'];

/** ISO → "dd/mm/aaaa hh:mm" no fuso local. */
export function fmtDataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
