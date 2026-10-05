// ============================================================
// ESCOPO DE OBRA GLOBAL (filtro único do topo)
// ============================================================
// O seletor do topo (SeletorObra) é o ÚNICO filtro de obra do sistema.
// Valores possíveis de `escopoObra` (ERPContext):
//   - OBRA_GERAL ('geral'): sem obra selecionada (padrão)
//   - id de um grupo de GRUPOS_OBRAS (ex.: 'temec'): várias obras somadas
//   - id de uma obra (ex.: 'obra-001')
//
// Regra do "Geral" por tipo de módulo (definida pelo CEO em 05/10/2026):
//   - Operacionais (Produção, Expedição, Montagem, Estoque, Compras, BI):
//     todas as obras consolidadas.
//   - Financeiro comum / Despesas / Metas: Fábrica (financeiro geral, sem obra).
//   - Receitas: todas.  Painel Global: sempre empresa (não usa o escopo).
//   - Páginas que só funcionam com 1 obra (GFO, 3D, Kanban Corte, Import
//     Romaneio) pedem "selecione uma obra no topo".
// ============================================================

export const OBRA_GERAL = 'geral';

export const GRUPOS_OBRAS = {
  temec: {
    id: 'temec',
    label: '🏢 TEMEC Consolidado (CC027 + CC002)',
    obraIds: ['obra-004', 'obra-005'],
    modo: 'unidade',
    valor: 20,
    qtdContrato: 2000, // 500 + 1500
  },
};

export const isEscopoGeral = (escopo) => !escopo || escopo === OBRA_GERAL;
export const grupoDoEscopo = (escopo) => (escopo && GRUPOS_OBRAS[escopo]) || null;
export const isEscopoGrupo = (escopo) => !!grupoDoEscopo(escopo);

/** Id da obra quando o escopo é UMA obra; senão null (geral ou grupo). */
export const obraIdUnica = (escopo) =>
  (isEscopoGeral(escopo) || isEscopoGrupo(escopo) ? null : escopo);

/** Ids das obras do escopo; null = todas (geral). */
export function obraIdsDoEscopo(escopo) {
  if (isEscopoGeral(escopo)) return null;
  const g = grupoDoEscopo(escopo);
  return g ? [...g.obraIds] : [escopo];
}

/** true se o registro (obraId/obra_id) pertence ao escopo. Geral aceita tudo. */
export function pertenceAoEscopo(registroObraId, escopo) {
  const ids = obraIdsDoEscopo(escopo);
  if (!ids) return true;
  return ids.includes(registroObraId);
}

/** Valor salvo é válido? (geral, grupo ou obra existente) */
export function escopoValido(escopo, obras = []) {
  if (isEscopoGeral(escopo)) return true;
  if (isEscopoGrupo(escopo)) return true;
  return (obras || []).some((o) => o.id === escopo);
}

export function rotuloEscopo(escopo, obras = []) {
  if (isEscopoGeral(escopo)) return 'Geral (todas as obras)';
  const g = grupoDoEscopo(escopo);
  if (g) return g.label;
  const o = (obras || []).find((x) => x.id === escopo);
  return o ? `${o.codigo ? `${o.codigo} | ` : ''}${o.nome || o.id}` : escopo;
}
