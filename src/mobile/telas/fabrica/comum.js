// ============================================================
// Fábrica (app da diretoria) — utilitários compartilhados pelas abas
// ============================================================
// Somente leitura: nenhuma aba move etapa nem dá baixa (isso fica no
// Kanban do computador). Escopo = seletor do topo (CLAUDE.md 1c): em
// "Geral" todas as obras; em grupo/obra, só as do escopo.
// ============================================================
import { useMemo } from 'react';
import { useERP, useObras } from '@/contexts/ERPContext';
import { etapaPeca } from '@/services/relatorioProducao';

/** Estado de carga do ERP (boot do Supabase). */
export function useEstadoERP() {
  const { dataSource, connectionError } = useERP() || {};
  return {
    carregando: dataSource === 'loading',
    erro: dataSource === 'error' ? (connectionError || 'Não foi possível carregar os dados da fábrica.') : null,
  };
}

export const obraIdDe = (x) => x?.obraId ?? x?.obra_id ?? x?.obra?.id ?? null;

/** Filtro do escopo do topo + nome de obra. */
export function useEscopoFabrica() {
  const { obras = [], obraIdsEscopo } = useObras();
  return useMemo(() => {
    const ids = obraIdsEscopo ? new Set(obraIdsEscopo) : null;
    const porId = new Map(obras.map((o) => [o.id, o]));
    return {
      obras,
      noEscopo: (x) => !ids || ids.has(obraIdDe(x)),
      obraNoEscopo: (o) => !ids || ids.has(o?.id),
      nomeObra: (id) => {
        const o = porId.get(id);
        return o ? (o.nome || o.codigo || o.id) : (id || 'Sem obra');
      },
      geral: !ids,
    };
  }, [obras, obraIdsEscopo]);
}

export const obraAtiva = (o) => !['concluido', 'concluida', 'cancelado', 'cancelada'].includes(String(o?.status || '').toLowerCase());

// Etapas como a diretoria lê (aguardando = na fila do corte).
export const ETAPAS = {
  aguardando: { rotulo: 'Corte', tom: 'neutro' },
  fabricacao: { rotulo: 'Fabricação', tom: 'teal' },
  solda: { rotulo: 'Solda', tom: 'teal' },
  pintura: { rotulo: 'Pintura', tom: 'teal' },
  expedido: { rotulo: 'Embarque', tom: 'warn' },
  enviado: { rotulo: 'Em obra', tom: 'ok' },
  entregue: { rotulo: 'Em obra', tom: 'ok' },
};

/** Filtro de etapa da aba Peças (Em obra = enviado + entregue). */
export const FILTRO_ETAPA = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'aguardando', rotulo: 'Corte' },
  { id: 'fabricacao', rotulo: 'Fabricação' },
  { id: 'solda', rotulo: 'Solda' },
  { id: 'pintura', rotulo: 'Pintura' },
  { id: 'expedido', rotulo: 'Embarque' },
  { id: 'em_obra', rotulo: 'Em obra' },
];

export function casaFiltroEtapa(p, filtro) {
  if (filtro === 'todas') return true;
  const e = etapaPeca(p);
  if (filtro === 'em_obra') return e === 'enviado' || e === 'entregue';
  return e === filtro;
}

export const etapaInfo = (e) => ETAPAS[e] || ETAPAS.aguardando;

/** Normaliza para busca (sem acento, minúsculo). */
export const normBusca = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
