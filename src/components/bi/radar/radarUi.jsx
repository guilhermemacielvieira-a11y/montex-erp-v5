// ============================================================
// Radar de Alertas — helpers de apresentação (sem dados)
// ============================================================

import { AlertOctagon, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { STATUS, NEUTRO, fmtBRL, fmtKg, fmtNum, fmtPct } from '@/components/bi/biUi';
import { SEVERIDADES } from '@/services/bi/radarAlertas';

/** Severidade → cor de STATUS (sempre acompanhada de ícone + rótulo). */
export const SEV_UI = {
  critico: { rotulo: SEVERIDADES.critico.rotulo, cor: STATUS.critico, Icone: AlertOctagon },
  alto: { rotulo: SEVERIDADES.alto.rotulo, cor: STATUS.serio, Icone: AlertTriangle },
  medio: { rotulo: SEVERIDADES.medio.rotulo, cor: STATUS.atencao, Icone: AlertCircle },
  baixo: { rotulo: SEVERIDADES.baixo.rotulo, cor: NEUTRO, Icone: Info },
};
export const ORDEM_SEV = ['critico', 'alto', 'medio', 'baixo'];

export const AREAS = ['Produção', 'Obras', 'Financeiro', 'Suprimentos', 'Qualidade de dados'];

export const FILTROS_STATUS = [
  { valor: 'abertos', rotulo: 'Abertos' },
  { valor: 'novo', rotulo: 'Novos' },
  { valor: 'reconhecido', rotulo: 'Em tratamento' },
  { valor: 'resolvido', rotulo: 'Resolvidos' },
  { valor: 'ignorado', rotulo: 'Ignorados' },
  { valor: 'todos', rotulo: 'Todos' },
];

export const DIAS_REINCIDENTE = 7;

/** Formata valor + unidade do alerta. */
export function fmtValorAlerta(valor, unidade) {
  if (valor === null || valor === undefined || valor === '') return '';
  switch (unidade) {
    case 'R$': return fmtBRL(valor);
    case 'kg': return fmtKg(valor);
    case '%': return fmtPct(valor, 0);
    case 'pp': return `${fmtNum(valor, 1)} pp`;
    default: return `${fmtNum(valor, 1)}${unidade ? ` ${unidade}` : ''}`;
  }
}

/** ISO (com hora) → "dd/mm/aaaa hh:mm" no fuso local. */
export function fmtDataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Alerta marcado como resolvido há mais de N dias e ainda detectado. */
export function ehReincidente(registro, agora = Date.now()) {
  if (!registro || registro.status !== 'resolvido' || !registro.em) return false;
  const t = new Date(registro.em).getTime();
  return Number.isFinite(t) && agora - t > DIAS_REINCIDENTE * 86400000;
}
