// ============================================================
// Financeiro (app da diretoria) — utilitários compartilhados pelas abas
// ============================================================
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/lib/AuthContext';
import { parseLocalDate } from '@/utils/financeiroCalc';
import { hojeLocalISO } from '../../ui/format';

/** Estado de carga do ERP (boot do Supabase). */
export function useEstadoERP() {
  const { dataSource, connectionError } = useERP() || {};
  return {
    carregando: dataSource === 'loading',
    erro: dataSource === 'error' ? (connectionError || 'Não foi possível carregar os dados do financeiro.') : null,
  };
}

/** Mesma regra do Protected: sem hasPermission (fallback) libera. */
export function usePodeEditar() {
  const { hasPermission } = useAuth() || {};
  return !hasPermission || hasPermission('financeiro.edit');
}

/** 'YYYY-MM-DD' local somando n dias a hoje. */
export function diaISO(n = 0, base = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
  return hojeLocalISO(d);
}

/** Data (string) normalizada para 'YYYY-MM-DD' ou '' se inválida. */
export function isoDe(v) {
  if (!v || v === '-') return '';
  const d = parseLocalDate(String(v).slice(0, 10));
  return d && !Number.isNaN(d.getTime()) ? hojeLocalISO(d) : '';
}

/** Rótulo curto do mês: "out." / "out./25". */
export function rotuloMes(ano, mes, comAno = false) {
  const d = new Date(ano, mes, 1);
  const m = d.toLocaleDateString('pt-BR', { month: 'short' });
  return comAno ? `${m}/${String(ano).slice(2)}` : m;
}

/** Variação percentual com sinal: "+12%" / "−8%". */
export function sinalPct(v) {
  const n = Math.round(Number(v) || 0);
  if (n === 0) return '0%';
  return `${n > 0 ? '+' : '−'}${Math.abs(n)}%`;
}
