// ============================================================
// DESPESAS — OVERRIDES DE CATEGORIA (Fase 1 do plano)
// ============================================================
// PROBLEMA QUE RESOLVE:
//
// A função `normalizarCategoria()` em useFinancialIntelligence.js aplica
// regras de keyword na descrição na hora de renderizar. Isso significa que
// uma despesa com descrição "CEMIG FATURA OUTUBRO" SEMPRE vira
// "Energia/Utilidades" na UI, mesmo que o usuário tenha editado a categoria
// para "Administrativo" e salvado no Supabase.
//
// Esse módulo guarda OVERRIDES locais por id de despesa. Quando o usuário
// edita a categoria manualmente, a edição vence o `normalizarCategoria`.
//
// Schema do localStorage:
//   montex_despesas_categoria_overrides = {
//     [despesaId]: {
//       categoria: 'Administrativo',
//       editadoEm: '2026-06-08T17:34:12.000Z',
//       origem: 'manual' | 'mapping',
//       categoriaAnterior?: 'Energia/Utilidades',  // pra desfazer
//     },
//     ...
//   }
//
// Também alimenta o `montex_nf_fornecedor_mapping` (que JÁ existe em
// DespesasPage.jsx) quando o usuário edita — assim correções repetidas
// para o mesmo fornecedor passam a ser sugeridas em NOVAS importações.
// ============================================================

const OVERRIDES_KEY = 'montex_despesas_categoria_overrides';
const MAPPING_KEY = 'montex_nf_fornecedor_mapping';

// ============================================================
// OVERRIDES POR ID
// ============================================================

export function loadCategoriaOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCategoriaOverrides(obj) {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(obj || {}));
  } catch {
    // quota cheia ou storage indisponível — silent fail
  }
}

// Retorna o override de uma despesa específica ou null
export function getCategoriaOverride(id) {
  if (!id) return null;
  const all = loadCategoriaOverrides();
  return all[String(id)] || null;
}

// Grava override de categoria + alimenta o mapping CNPJ→categoria
export function setCategoriaOverride(id, novaCategoria, despesa = {}) {
  if (!id || !novaCategoria) return;
  const all = loadCategoriaOverrides();
  const prev = all[String(id)];
  all[String(id)] = {
    categoria: novaCategoria,
    editadoEm: new Date().toISOString(),
    origem: 'manual',
    categoriaAnterior: prev?.categoriaAnterior || despesa.categoria || null,
  };
  saveCategoriaOverrides(all);

  // Alimenta o mapping fornecedor/NF — assim correções viram aprendizado
  // para PRÓXIMAS importações. Reusa o schema do MAPPING_KEY existente.
  try {
    const rawMap = localStorage.getItem(MAPPING_KEY);
    const map = rawMap ? JSON.parse(rawMap) : {};
    const fornecedor = (despesa.fornecedor || '').toUpperCase().trim();
    const nf = despesa.notaFiscal;
    if (fornecedor) {
      if (!map[fornecedor]) map[fornecedor] = {};
      map[fornecedor].categoria = novaCategoria;
      map[fornecedor].aprendidoEm = new Date().toISOString();
    }
    if (nf) {
      map[`NF_${nf}`] = {
        ...(map[`NF_${nf}`] || {}),
        categoria: novaCategoria,
        fornecedor,
        aprendidoEm: new Date().toISOString(),
      };
    }
    localStorage.setItem(MAPPING_KEY, JSON.stringify(map));
  } catch {
    // mapping é best-effort
  }
}

// Remove override de uma despesa (volta a respeitar normalizarCategoria)
export function removeCategoriaOverride(id) {
  if (!id) return;
  const all = loadCategoriaOverrides();
  if (all[String(id)]) {
    delete all[String(id)];
    saveCategoriaOverrides(all);
  }
}

// Aplica override em uma lista de despesas (transforma a categoria)
// Retorna nova lista com `categoria` ajustada + `_categoriaOverride` (objeto
// do override) anexado para a UI exibir o badge "manual".
export function aplicarOverridesNaLista(despesas) {
  if (!Array.isArray(despesas) || despesas.length === 0) return despesas || [];
  const all = loadCategoriaOverrides();
  if (Object.keys(all).length === 0) return despesas;
  return despesas.map(d => {
    const ov = all[String(d.id)];
    if (!ov) return d;
    return {
      ...d,
      categoria: ov.categoria,
      _categoriaOverride: ov, // sinal para UI: exibir badge "manual"
    };
  });
}

// ============================================================
// MAPPING CNPJ/FORNECEDOR → CATEGORIA (aprendizado)
// ============================================================
// O DespesasPage já tem `loadMapping()` e `autoFillFromMapping()`. Aqui
// expomos um lookup simples que pode ser usado em qualquer ponto para
// consultar "qual categoria foi aprendida para este fornecedor?".

export function lookupCategoriaPorFornecedor(fornecedor, nf) {
  try {
    const raw = localStorage.getItem(MAPPING_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    // Prioridade: NF específica > fornecedor genérico
    if (nf && map[`NF_${nf}`]?.categoria) return map[`NF_${nf}`].categoria;
    const key = (fornecedor || '').toUpperCase().trim();
    if (key && map[key]?.categoria) return map[key].categoria;
    return null;
  } catch {
    return null;
  }
}

// ============================================================
// MÉTRICAS / UTIL
// ============================================================
export function contarOverrides() {
  return Object.keys(loadCategoriaOverrides()).length;
}

// ============================================================
// FASE 2 — BACKFILL: sincronizar overrides locais para Supabase
// ============================================================
// Após a migration v12 (categoria_manual + categoria_origem), correções
// gravadas localmente na Fase 1 precisam ser enviadas para o Supabase para
// (a) sobreviver à limpeza do localStorage e (b) ficarem disponíveis em
// outros dispositivos. Chamado uma vez quando DespesasPage monta.
//
// Estratégia: para cada override local cujo id existe no banco e cujo
// categoria_manual=false (ou ausente), envia um update marcando a categoria
// definida pelo usuário com categoria_manual=true / categoria_origem=manual.
// Após sucesso, remove o override do localStorage — o Supabase passa a ser
// fonte canônica.
//
// `updateLancamento` é a função do ERPContext que faz update no Supabase.
// `despesasAtuais` é a lista vinda do Supabase (não a com overrides aplicados).
//
// Retorna { sincronizados: N, restantes: M, erros: [], migrationFaltando: bool }.
//
// TOLERÂNCIA: se a migration v12 ainda não foi aplicada (colunas
// categoria_manual/categoria_origem não existem), o Supabase retorna erro
// "column ... does not exist". Detectamos e fazemos fallback: enviamos só
// a categoria (sem as colunas de proveniência) — override local CONTINUA
// vivo como fonte da verdade até a migration rodar.
export async function syncOverridesParaSupabase(despesasAtuais, updateLancamento) {
  const overrides = loadCategoriaOverrides();
  const ids = Object.keys(overrides);
  if (ids.length === 0 || !updateLancamento) {
    return { sincronizados: 0, restantes: 0, erros: [], migrationFaltando: false };
  }
  let sincronizados = 0;
  let restantes = 0;
  let migrationFaltando = false;
  const erros = [];
  const novosOverrides = { ...overrides };
  const porId = new Map();
  for (const d of despesasAtuais || []) porId.set(String(d.id), d);

  for (const id of ids) {
    const ov = overrides[id];
    const despesa = porId.get(id);
    if (!despesa) { restantes++; continue; } // despesa sumiu do banco — mantém local
    if (despesa.categoria_manual === true && despesa.categoria === ov.categoria) {
      delete novosOverrides[id];
      sincronizados++;
      continue;
    }
    try {
      await updateLancamento(id, {
        categoria: ov.categoria,
        categoriaManual: true,
        categoriaOrigem: ov.origem || 'manual',
      });
      delete novosOverrides[id];
      sincronizados++;
    } catch (e) {
      const msg = (e?.message || '').toLowerCase();
      // Migration v12 não aplicada — coluna inexistente
      if (msg.includes('categoria_manual') || msg.includes('categoria_origem') ||
          msg.includes('column') && msg.includes('does not exist')) {
        migrationFaltando = true;
        // Mantém override local (fallback Fase 1 segue ativo).
        restantes++;
      } else {
        erros.push({ id, erro: e.message });
        restantes++;
      }
    }
  }
  saveCategoriaOverrides(novosOverrides);
  return { sincronizados, restantes, erros, migrationFaltando };
}
