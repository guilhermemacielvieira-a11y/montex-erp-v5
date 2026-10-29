// ============================================================
// Formatação do app da diretoria (pt-BR, fuso local)
// ============================================================
// Peças, romaneios e estoque: peso em kg inteiro (regra do PR #82, ver
// src/mobile/ui/format.js). Visões executivas (carteira, produção do mês,
// custo/kg) seguem o BI 360: toneladas a partir de 10 t.
// ============================================================
import { parseLocalDate } from '@/utils/financeiroCalc';

const nf = (dec = 0) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const num = (n, dec = 0) => nf(dec).format(Number(n) || 0);
export const brl = (n, dec = 0) => `${Number(n) < 0 ? '−' : ''}R$ ${num(Math.abs(Number(n) || 0), dec)}`;
export const brl2 = (n) => (n === null || n === undefined || Number.isNaN(Number(n)) ? '—' : `R$ ${num(n, 2)}`);

/** R$ compacto: "R$ 1,24 mi", "R$ 318 mil", "R$ 940". */
export function brlc(n) {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  const s = v < 0 ? '−' : '';
  if (a >= 1e6) return `${s}R$ ${num(a / 1e6, a >= 1e7 ? 1 : 2)} mi`;
  if (a >= 1e3) return `${s}R$ ${num(a / 1e3, a >= 1e5 ? 0 : 1)} mil`;
  return `${s}R$ ${num(a)}`;
}

/** kg inteiro (operacional). */
export const kg = (n) => `${num(n)} kg`;

/** Peso executivo: toneladas a partir de 10 t. */
export function peso(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 10000) return `${num(v / 1000, 1)} t`;
  return `${num(v)} kg`;
}

export const pct = (n, dec = 0) => (n === null || n === undefined || Number.isNaN(Number(n)) ? '—' : `${num(n, dec)}%`);

function paraData(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return parseLocalDate(s);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "28/10" ou "28/10/25" quando não é do ano corrente. */
export function data(v, { ano = 'auto' } = {}) {
  const d = paraData(v);
  if (!d) return '—';
  const mostraAno = ano === true || (ano === 'auto' && d.getFullYear() !== new Date().getFullYear());
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', ...(mostraAno ? { year: '2-digit' } : {}) });
}

/** Distância em dias, em palavras: "hoje", "amanhã", "em 3 dias", "há 2 dias". */
export function quando(v, hoje = new Date()) {
  const d = paraData(v);
  if (!d) return '';
  const a = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dias = Math.round((b - a) / 86400000);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias === -1) return 'ontem';
  return dias > 0 ? `em ${dias} dias` : `há ${-dias} dias`;
}

export function saudacao(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function primeiroNome(user) {
  const n = String(user?.nome || user?.name || user?.full_name || user?.email || '').trim();
  if (!n) return '';
  if (n.includes('@')) return n.split('@')[0];
  return n.split(/\s+/)[0];
}

/**
 * Abre uma tela da versão do computador a partir do app. Sem a marca
 * `force_desktop`, o App.jsx devolveria o celular para /m. A marca é
 * limpa sempre que o app (/m) abre de novo (MobileApp.jsx).
 */
export function abrirNoComputador(caminho = '/') {
  try { localStorage.setItem('force_desktop', '1'); } catch { /* noop */ }
  window.location.href = caminho;
}

/** No app nativo (Capacitor) a versão do computador não abre. */
export const temVersaoComputador = () => {
  try { return !window.Capacitor?.isNativePlatform?.(); } catch { return true; }
};
