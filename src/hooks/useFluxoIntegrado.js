// ============================================================
// Dados do fluxo integrado (corte × estoque × marcas) por escopo
// ============================================================
// • materiais_corte (POSIÇÕES) e composicao_marcas das obras do escopo
// • fluxo_material_obra (necessário × estoque × cortado) quando o escopo é
//   UMA obra — mesma chave de estoque do trigger de baixa
// Motor puro em services/fluxoIntegrado.js. Sem a RPC/tabela (migração
// ainda não aplicada) cai no cálculo local, marcado como "estimado".
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { abastecimentoCorte, liberacaoMarcas, corteEfetivo } from '@/services/fluxoIntegrado';

const PAGE = 1000;
const COLS_CORTE = 'id,obra_id,marca,peca,quantidade,perfil,material,comprimento_mm,peso_teorico,status_corte,peca_id,baixa_estoque_kg,funcionario_corte,data_inicio,data_fim';

async function paginado(tabela, cols, obraIds) {
  const out = [];
  for (let i = 0; i < 100; i++) {
    let q = supabase.from(tabela).select(cols).order('id').range(i * PAGE, i * PAGE + PAGE - 1);
    if (obraIds) q = q.in('obra_id', obraIds);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/** Agrupa por obra_id. */
const porObra = (rows, campo = 'obra_id') => {
  const m = new Map();
  for (const r of rows || []) {
    const k = r[campo] ?? r.obraId ?? '';
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
};

/**
 * @param {object} p
 * @param {string[]|null} p.obraIds  obras do escopo (null = todas)
 * @param {Array} p.pecas            pecas_producao do escopo (snake ou camel)
 * @param {Array} [p.cortes]         se informado, não busca materiais_corte
 */
export function useFluxoIntegrado({ obraIds = null, pecas = [], cortes: cortesExternos = null } = {}) {
  const [cortesDb, setCortesDb] = useState([]);
  const [composicao, setComposicao] = useState([]);
  const [fluxo, setFluxo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [semTabela, setSemTabela] = useState(false);
  const chaveEscopo = obraIds ? obraIds.join(',') : '*';
  const obraUnica = obraIds && obraIds.length === 1 ? obraIds[0] : null;

  const buscaCortes = !cortesExternos;
  const recarregar = useCallback(async () => {
    setCarregando(true);
    const ids = chaveEscopo === '*' ? null : chaveEscopo.split(',');
    try {
      const tarefas = [
        !buscaCortes ? Promise.resolve(null) : paginado('materiais_corte', COLS_CORTE, ids),
        paginado('composicao_marcas', 'obra_id,marca,pos,qtd_por_unidade', ids).catch(() => { setSemTabela(true); return []; }),
        obraUnica
          ? supabase.rpc('fluxo_material_obra', { p_obra_id: obraUnica }).then(({ data, error }) => (error ? null : data))
          : Promise.resolve(null),
      ];
      const [c, comp, f] = await Promise.all(tarefas);
      if (c) setCortesDb(c);
      setComposicao(comp || []);
      setFluxo(f || null);
    } catch (e) {
      console.error('[useFluxoIntegrado]', e);
    } finally {
      setCarregando(false);
    }
  }, [chaveEscopo, obraUnica, buscaCortes]);

  useEffect(() => { recarregar(); }, [recarregar]);

  const cortes = cortesExternos || cortesDb;

  // Liberação e corte efetivo calculados POR OBRA (códigos de marca/POS se
  // repetem entre obras). Corte efetivo = apontado + implícito pela produção.
  const { liberacao, efetivo } = useMemo(() => {
    const out = new Map();
    const ef = { porId: new Map(), resumo: { totalKg: 0, registradoKg: 0, producaoKg: 0, estimadoKg: 0, pendenteKg: 0 }, conciliaveis: [] };
    const pe = porObra(pecas.map((p) => ({ ...p, obra_id: p.obra_id ?? p.obraId })));
    const co = porObra(cortes);
    const cp = porObra(composicao);
    for (const [obra, lista] of pe) {
      const cortesObra = co.get(obra) || [];
      const lib = liberacaoMarcas({ pecas: lista.map((p) => ({ ...p, peso_total: p.peso_total ?? p.pesoTotal })), cortes: cortesObra, composicao: cp.get(obra) || [] });
      for (const [marca, info] of lib) out.set(`${obra}|${marca}`, { ...info, obraId: obra });
      const e = corteEfetivo({ cortes: cortesObra, liberacao: lib });
      for (const [id, v] of e.porId) ef.porId.set(id, v);
      for (const k of Object.keys(ef.resumo)) ef.resumo[k] += e.resumo[k];
      ef.conciliaveis.push(...e.conciliaveis);
    }
    return { liberacao: out, efetivo: ef };
  }, [pecas, cortes, composicao]);

  const abastecimento = useMemo(() => abastecimentoCorte(cortes, fluxo, efetivo), [cortes, fluxo, efetivo]);

  /** Info de liberação da marca de uma peça (aceita camel/snake). */
  const infoMarca = useCallback((peca) => {
    if (!peca) return null;
    const obra = peca.obra_id ?? peca.obraId;
    const marca = String(peca.marca || '').trim().toUpperCase();
    return liberacao.get(`${obra}|${marca}`) || null;
  }, [liberacao]);

  return { cortes, composicao, fluxo, abastecimento, liberacao, efetivo, infoMarca, carregando, semTabela, recarregar };
}
