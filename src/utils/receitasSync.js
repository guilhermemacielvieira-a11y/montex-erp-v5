// ============================================
// RECEITAS MANUAIS — fonte única: tabela `receitas_manuais`
// ============================================
// Histórico: as receitas manuais ficavam SÓ no localStorage de cada navegador
// ('montex_receitas_gerais') + espelho JSON em entity_store
// ('receitas_gerais_sync'), e alguns módulos liam outra chave
// ('montex_receitas_manuais') → números divergentes entre telas e PCs.
//
// Agora:
//   • CRUD direto na tabela `receitas_manuais` (receitasManuaisApi).
//   • Cache local ('montex_receitas_manuais_cache') para leitura síncrona em
//     useMemo e para exibir algo imediato no boot; atualizado a cada carga.
//   • Evento 'montex:receitas-manuais' avisa a mesma aba; o evento `storage`
//     do navegador avisa outras abas.
//   • Legado (localStorage + entity_store) fica SOMENTE LEITURA, usado pelo
//     botão "Importar receitas antigas" (migração única).
//   • Overrides de medições ('montex_receitas_overrides') continuam
//     sincronizados por syncReceitas() (entity_store), como antes.
// ============================================
import { useCallback, useEffect, useState } from 'react';
import { supabase, receitasManuaisApi } from '../api/supabaseClient';
import { receitaAppToRow, receitaRowToApp, receitasLegadasPendentes } from './receitasManuaisModel';
import { normalizeStatusReceita } from './financeiroStatus';
import { notifyLocalChange } from './localSync';

const KEY_R = 'montex_receitas_gerais';          // legado (somente leitura)
const KEY_O = 'montex_receitas_overrides';       // overrides de medições
const STORE = 'receitas_gerais_sync';            // espelho legado em entity_store
export const RECEITAS_CACHE_KEY = 'montex_receitas_manuais_cache';
export const RECEITAS_EVENT = 'montex:receitas-manuais';

const L = (k, d) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }
  catch { return d; }
};

// ===== estado do módulo =====
let fonteAtual = 'cache'; // 'tabela' | 'legado' | 'cache'
let erroTabela = null;
let cargaEmAndamento = null;

function gravarCache(lista) {
  try { localStorage.setItem(RECEITAS_CACHE_KEY, JSON.stringify(lista)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent(RECEITAS_EVENT)); } catch { /* SSR/test */ }
}

/** Normaliza uma receita legada (localStorage) para o formato canônico. */
function legadaParaApp(r) {
  return { ...r, status: normalizeStatusReceita(r.status), origemObra: false };
}

/**
 * Leitura SÍNCRONA das receitas manuais (cache da tabela). Enquanto a tabela
 * nunca foi carregada neste navegador, cai no legado para não "sumir" nada.
 */
export function getReceitasManuaisCache() {
  const cache = L(RECEITAS_CACHE_KEY, null);
  if (Array.isArray(cache)) return cache;
  return (L(KEY_R, []) || []).filter((r) => r && r.id).map(legadaParaApp);
}

/** Carrega da tabela e atualiza o cache. Em erro (tabela ausente), usa legado. */
export function carregarReceitasManuais() {
  if (cargaEmAndamento) return cargaEmAndamento;
  cargaEmAndamento = (async () => {
    try {
      const rows = await receitasManuaisApi.getAll('data_emissao', false);
      const lista = (rows || []).map(receitaRowToApp).filter(Boolean);
      fonteAtual = 'tabela';
      erroTabela = null;
      gravarCache(lista);
      return lista;
    } catch (e) {
      console.warn('[receitasManuais] tabela indisponível, usando legado:', e?.message);
      fonteAtual = 'legado';
      erroTabela = e?.message || 'erro';
      return getReceitasManuaisCache();
    } finally {
      setTimeout(() => { cargaEmAndamento = null; }, 0);
    }
  })();
  return cargaEmAndamento;
}

export const getFonteReceitas = () => ({ fonte: fonteAtual, erro: erroTabela });

function atualizarCacheLocal(fn) {
  const atual = L(RECEITAS_CACHE_KEY, null);
  const base = Array.isArray(atual) ? atual : [];
  gravarCache(fn(base));
}

/** Cria uma ou várias receitas (persiste ANTES de atualizar o cache). */
export async function criarReceitasManuais(lista) {
  const rows = (Array.isArray(lista) ? lista : [lista]).map((r) => receitaAppToRow(r));
  const salvas = rows.length === 1
    ? [await receitasManuaisApi.create(rows[0])]
    : await receitasManuaisApi.createMany(rows);
  const apps = (salvas || []).map(receitaRowToApp).filter(Boolean);
  atualizarCacheLocal((base) => {
    const ids = new Set(apps.map((a) => a.id));
    return [...apps, ...base.filter((b) => !ids.has(b.id))];
  });
  return apps;
}

/** Atualiza uma receita (persiste ANTES de atualizar o cache). */
export async function atualizarReceitaManual(id, dados) {
  const row = receitaAppToRow({ ...dados, id });
  const { id: _id, ...updates } = row;
  const salva = await receitasManuaisApi.update(id, updates);
  const app = receitaRowToApp(salva);
  atualizarCacheLocal((base) => base.map((b) => (b.id === id ? app : b)));
  return app;
}

// Registra tombstone no espelho legado p/ que a receita não volte a ser
// oferecida em "Importar receitas antigas" nem ressuscite via merge.
async function tombstoneLegado(id) {
  try {
    const locR = L(KEY_R, []).filter((r) => r && r.id !== id);
    localStorage.setItem(KEY_R, JSON.stringify(locR));
    const cloud = await lerCloud();
    const receitas = (cloud.receitas || []).filter((r) => r && r.id !== id);
    const deletedIds = Array.from(new Set([...(cloud.deletedIds || []), id]));
    await gravarCloud(receitas, cloud.overrides || {}, deletedIds);
  } catch (e) {
    console.warn('[receitasSync] tombstone legado', e && e.message);
  }
}

/**
 * Apaga uma receita manual em definitivo (tabela + tombstone no legado).
 * Lança erro se a exclusão na tabela falhar (o chamador deve avisar o usuário).
 */
export async function deleteReceitaManual(id) {
  if (fonteAtual !== 'legado') {
    await receitasManuaisApi.delete(id);
    atualizarCacheLocal((base) => base.filter((b) => b.id !== id));
  }
  await tombstoneLegado(id);
  return true;
}

// ===== LEGADO (entity_store) =====
async function lerCloud() {
  const { data } = await supabase
    .from('entity_store').select('data').eq('id', STORE).maybeSingle();
  const c = (data && data.data) || {};
  return {
    receitas: c.receitas || [],
    overrides: c.overrides || {},
    deletedIds: c.deletedIds || [],
  };
}

async function gravarCloud(receitas, overrides, deletedIds) {
  await supabase.from('entity_store').upsert({
    id: STORE,
    entity_type: 'receitas_backup',
    data: { receitas, overrides, deletedIds, _savedAt: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

/**
 * Receitas antigas (localStorage + entity_store) que ainda não estão na
 * tabela. Usado pelo botão "Importar receitas antigas".
 */
export async function lerReceitasLegadasPendentes(idsNaTabela = []) {
  let cloud = { receitas: [], deletedIds: [] };
  try { cloud = await lerCloud(); } catch { /* offline: só o local */ }
  const byId = {};
  (cloud.receitas || []).forEach((r) => { if (r && r.id) byId[r.id] = r; });
  (L(KEY_R, []) || []).forEach((r) => { if (r && r.id) byId[r.id] = r; });
  return receitasLegadasPendentes(Object.values(byId), idsNaTabela, cloud.deletedIds || []);
}

/** Importa (uma vez) as receitas antigas para a tabela. Retorna a quantidade. */
export async function importarReceitasLegadas(idsNaTabela = []) {
  const pendentes = await lerReceitasLegadasPendentes(idsNaTabela);
  if (pendentes.length === 0) return 0;
  await receitasManuaisApi.createMany(pendentes.map((r) => receitaAppToRow(r)));
  await carregarReceitasManuais();
  return pendentes.length;
}

/**
 * Sincroniza com a nuvem (entity_store) os OVERRIDES de medições editadas na
 * ReceitasPage e mantém o espelho legado de receitas (somente para migração).
 */
export async function syncReceitas() {
  // Callers (ex.: ReceitasPage.salvarReceitas) gravam no localStorage e logo
  // chamam syncReceitas — avisa a mesma aba já (leitores comparam snapshot).
  notifyLocalChange(KEY_R);
  try {
    const locR = L(KEY_R, []);
    const locO = L(KEY_O, {});
    const cloud = await lerCloud();
    const tomb = new Set(cloud.deletedIds || []);

    const byId = {};
    (cloud.receitas || []).forEach((r) => { if (r && r.id) byId[r.id] = r; });
    (locR || []).forEach((r) => { if (r && r.id) byId[r.id] = r; }); // local vence
    const mr = Object.keys(byId)
      .filter((k) => !tomb.has(k))            // respeita exclusoes (tombstone)
      .map((k) => byId[k]);
    const mo = { ...(cloud.overrides || {}), ...(locO || {}) };

    const localMudou =
      JSON.stringify(mr) !== JSON.stringify(locR) ||
      JSON.stringify(mo) !== JSON.stringify(locO);
    if (localMudou) {
      localStorage.setItem(KEY_R, JSON.stringify(mr));
      localStorage.setItem(KEY_O, JSON.stringify(mo));
      notifyLocalChange(KEY_R);
    }

    const cloudMudou =
      JSON.stringify(mr) !== JSON.stringify(cloud.receitas || []) ||
      JSON.stringify(mo) !== JSON.stringify(cloud.overrides || {});
    if (cloudMudou) {
      await gravarCloud(mr, mo, cloud.deletedIds || []);
    }
    return localMudou;
  } catch (e) {
    console.warn('[receitasSync]', e && e.message);
    return false;
  }
}

/**
 * Hook: receitas manuais (tabela) com cache imediato, recarga no mount e
 * reatividade entre módulos (evento na mesma aba + `storage` entre abas).
 */
export function useReceitasManuais() {
  const [receitas, setReceitas] = useState(() => getReceitasManuaisCache());
  const [fonte, setFonte] = useState(() => getFonteReceitas());
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const lista = await carregarReceitasManuais();
    setReceitas(lista);
    setFonte(getFonteReceitas());
    setCarregando(false);
    return lista;
  }, []);

  useEffect(() => {
    recarregar();
    const onLocal = () => { setReceitas(getReceitasManuaisCache()); setFonte(getFonteReceitas()); };
    const onStorage = (e) => { if (!e.key || e.key === RECEITAS_CACHE_KEY) onLocal(); };
    window.addEventListener(RECEITAS_EVENT, onLocal);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(RECEITAS_EVENT, onLocal);
      window.removeEventListener('storage', onStorage);
    };
  }, [recarregar]);

  return { receitas, fonte: fonte.fonte, erro: fonte.erro, carregando, recarregar };
}
