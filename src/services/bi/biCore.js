// ============================================================
// BI — utilitários puros (datas locais, semanas, estatística, etapas)
// ============================================================
// Todas as funções do BI são PURAS (recebem dados, devolvem números) para
// serem testáveis e reaproveitadas por BI 360, Radar de Alertas e Copiloto.
// Datas 'YYYY-MM-DD' são lidas como data LOCAL (CLAUDE.md, regra 3).
// ============================================================

import { normalizarEtapa } from '../fluxoEtapas';

export const DIA_MS = 86400000;

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
export const r1 = (v) => Math.round(num(v) * 10) / 10;
export const r2 = (v) => Math.round(num(v) * 100) / 100;

/** Data local a partir de 'YYYY-MM-DD', ISO com hora, Date ou null. */
export function dataLocal(v) {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const inicioDoDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const diasEntre = (a, b) => Math.round((inicioDoDia(b) - inicioDoDia(a)) / DIA_MS);
export const somaDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Segunda-feira da semana da data (chave de agrupamento semanal). */
export function inicioSemana(d) {
  const x = inicioDoDia(d);
  const dow = (x.getDay() + 6) % 7; // seg=0
  return somaDias(x, -dow);
}
export const chaveSemana = (d) => isoLocal(inicioSemana(d));
export const chaveMes = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export function rotuloMes(chave) {
  const [a, m] = chave.split('-').map(Number);
  return new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}
export function rotuloSemana(chave) {
  const d = dataLocal(chave);
  return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : chave;
}

/** Lista contínua de chaves de semana entre duas datas (inclusive). */
export function semanasEntre(ini, fim) {
  const out = [];
  if (!ini || !fim) return out;
  let d = inicioSemana(ini);
  const f = inicioSemana(fim);
  let guard = 0;
  while (d <= f && guard < 520) { out.push(isoLocal(d)); d = somaDias(d, 7); guard += 1; }
  return out;
}

export function mediana(arr) {
  const v = (arr || []).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
export function percentil(arr, p) {
  const v = (arr || []).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const idx = Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1));
  return v[idx];
}
export function media(arr) {
  const v = (arr || []).filter((x) => Number.isFinite(x));
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}
export function desvioPadrao(arr) {
  const v = (arr || []).filter((x) => Number.isFinite(x));
  if (v.length < 2) return null;
  const m = media(v);
  return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}

// ===== Etapas de produção =====
// Ordem do fluxo da fábrica (CLAUDE.md, regra 5). 'finalizado' (TEMEC) e
// 'entregue' contam como concluído; 'fabricacao+solda' conta como solda.
export const ETAPAS_FABRICA = ['fabricacao', 'solda', 'pintura'];
export const ETAPAS_FLUXO = ['aguardando', 'fabricacao', 'solda', 'pintura', 'expedido', 'enviado', 'entregue'];
export const ROTULO_ETAPA = {
  aguardando: 'Aguardando', fabricacao: 'Fabricação', solda: 'Solda', pintura: 'Pintura',
  expedido: 'Fila de embarque', enviado: 'Em obra', entregue: 'Concluído',
};

export function etapaCanonica(etapa) {
  const e = normalizarEtapa(etapa);
  if (e === 'cortando') return 'aguardando';
  if (e === 'fabricacao+solda') return 'solda';
  if (e === 'finalizado') return 'entregue';
  return ETAPAS_FLUXO.includes(e) ? e : 'aguardando';
}
export const ordemFluxo = (etapa) => ETAPAS_FLUXO.indexOf(etapaCanonica(etapa));

/** Peça com a fabricação concluída (pintada): expedido, enviado ou entregue. */
export const fabricaConcluida = (etapa) => ordemFluxo(etapa) >= ETAPAS_FLUXO.indexOf('expedido');

export const pesoPeca = (p) => {
  const t = num(p?.pesoTotal ?? p?.peso_total);
  if (t > 0) return t;
  return num(p?.pesoUnitario ?? p?.peso_unitario) * Math.max(1, num(p?.quantidade) || 1);
};
export const obraDe = (x) => x?.obraId ?? x?.obra_id ?? null;

/** Filtra uma lista pelo escopo (obraIds null = todas). */
export function noEscopo(lista, obraIds) {
  if (!obraIds) return lista || [];
  const s = new Set(obraIds);
  return (lista || []).filter((x) => s.has(obraDe(x)));
}
