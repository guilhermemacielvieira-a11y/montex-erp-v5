// ============================================================
// Grupos de estoque (ex.: GRUPO AÇO 2026)
// ============================================================
// Um "grupo de estoque" é um registro técnico na tabela `obras` que NÃO é
// obra: guarda o estoque de aço comum a várias obras. Fonte de verdade da
// associação obra → grupo: tabela `estoque_grupos` (obra_id, grupo_obra_id),
// a MESMA usada pelo banco na baixa de corte. Fallback: o registro marcado com
// `endereco.meta.tipo = 'estoque_grupo'` e `meta.obras_membro`.
//
// Regras:
//  - Some de toda lista de obras (seletor do topo, dashboards, BI, medição,
//    financeiro) — ERPContext separa em `gruposEstoque`.
//  - No Estoque, cada obra membro enxerga o estoque do grupo como seu.
//  - No banco, a baixa de corte de uma obra membro sai do grupo quando a obra
//    não tem item próprio daquele perfil (estoque_aplicar_movimento).
// ============================================================

const metaDe = (o) => {
  const e = o?.endereco;
  return e && typeof e === 'object' && e.meta && typeof e.meta === 'object' ? e.meta : null;
};

/**
 * O registro é um grupo de estoque (e não uma obra)?
 * @param {Array<{obra_id,grupo_obra_id}>} vinculos linhas de `estoque_grupos`
 */
export const isGrupoEstoque = (o, vinculos = []) =>
  metaDe(o)?.tipo === 'estoque_grupo' || (vinculos || []).some((v) => v.grupo_obra_id === o?.id);

/** Obras atendidas pelo grupo (ids). */
export function obrasMembroDoGrupo(grupo) {
  if (Array.isArray(grupo?.obrasMembro)) return grupo.obrasMembro;
  const m = metaDe(grupo);
  if (!m) return [];
  const lista = Array.isArray(m.obras_membro) && m.obras_membro.length ? m.obras_membro : (Array.isArray(m.obras) ? m.obras : []);
  return [...new Set(lista.filter(Boolean).map(String))];
}

/**
 * Separa obras reais dos grupos de estoque. Com `vinculos` (estoque_grupos),
 * cada grupo recebe `obrasMembro` vindo da tabela.
 */
export function separarGruposEstoque(registros = [], vinculos = []) {
  const obras = [];
  const grupos = [];
  for (const r of registros || []) {
    if (!isGrupoEstoque(r, vinculos)) { obras.push(r); continue; }
    const daTabela = (vinculos || []).filter((v) => v.grupo_obra_id === r.id).map((v) => String(v.obra_id));
    grupos.push(daTabela.length ? { ...r, obrasMembro: [...new Set(daTabela)] } : r);
  }
  return { obras, grupos };
}

/** Grupos de estoque que atendem a obra (normalmente 0 ou 1). */
export const gruposDaObra = (obraId, grupos = []) =>
  (grupos || []).filter((g) => obrasMembroDoGrupo(g).includes(String(obraId)));

/**
 * Ids de "dono de estoque" de um escopo: as obras do escopo + os grupos de
 * estoque que atendem alguma delas. `obraIds` null (Geral) → null (= todos).
 */
export function idsEstoqueDoEscopo(obraIds, grupos = []) {
  if (!obraIds) return null;
  const ids = new Set(obraIds.map(String));
  for (const g of grupos || []) if (obrasMembroDoGrupo(g).some((id) => ids.has(id))) ids.add(String(g.id));
  return [...ids];
}
