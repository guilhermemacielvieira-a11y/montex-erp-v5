// ============================================================================
// Romaneio (Expedição) — helpers puros
// ----------------------------------------------------------------------------
// REGRA DO FLUXO (ver supabase/migrations/2026100530_expedicao_romaneio_transacional.sql):
//   • Criar romaneio NÃO tira a peça do pátio: ela continua `expedido` (Fila de
//     Embarque), apenas reservada no romaneio. Envio parcial vira uma linha
//     própria (split) também em `expedido`.
//   • Peças só viram `enviado` (Em Obra) no DESPACHO: status em_transito/entregue.
//   • Voltar para preparando/aguardando_transporte/problema devolve a `expedido`.
// Status são SEMPRE minúsculos no banco (CHECK constraint).
// ============================================================================

export const STATUS_ROMANEIO = ['preparando', 'aguardando_transporte', 'em_transito', 'entregue', 'problema'];
export const STATUS_DESPACHADOS = ['em_transito', 'entregue'];

const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Normaliza qualquer grafia de status de romaneio para o valor canônico
 * minúsculo ('ENTREGUE' → 'entregue', 'Em Trânsito' → 'em_transito').
 * Retorna '' para vazio e o valor normalizado (mesmo se desconhecido) caso contrário.
 */
export function normalizarStatusRomaneio(status) {
  if (status == null) return '';
  const s = semAcento(String(status)).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!s) return '';
  if (s === 'aguardando' || s === 'aguard._transporte' || s === 'aguard_transporte') return 'aguardando_transporte';
  if (s === 'transito') return 'em_transito';
  return s;
}

export const isStatusRomaneioValido = (status) => STATUS_ROMANEIO.includes(normalizarStatusRomaneio(status));
export const isRomaneioDespachado = (status) => STATUS_DESPACHADOS.includes(normalizarStatusRomaneio(status));

/** Data de HOJE no fuso local (YYYY-MM-DD) — nunca toISOString (UTC vira amanhã à noite). */
export function hojeLocalISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Escapa texto para interpolação segura em HTML (romaneio imprimível). */
export function escapeHtml(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const obraDe = (p) => p?.obra_id ?? p?.obraId ?? null;

/**
 * Planeja os itens de um novo romaneio a partir das peças selecionadas.
 * - Deriva a obra das PEÇAS (nunca do filtro da tela) e bloqueia mistura de obras.
 * - Valida quantidade (1..disponível) e marca envio parcial (vai virar split no banco).
 *
 * @param {Array} pecas  peças selecionadas ({id, quantidade, obra_id|obraId, peso})
 * @param {Object} quantidades  mapa id → qtd a enviar (default: quantidade inteira)
 * @returns {{ok: boolean, erro?: string, obraId?: string, itens: Array<{id, qtd, qtdDisponivel, parcial}>}}
 */
export function planejarRomaneio(pecas = [], quantidades = {}) {
  const lista = Array.isArray(pecas) ? pecas : [];
  if (lista.length === 0) return { ok: false, erro: 'Selecione pelo menos uma peça', itens: [] };

  const obras = [...new Set(lista.map(obraDe))];
  if (obras.some((o) => !o)) return { ok: false, erro: 'Há peça selecionada sem obra vinculada', itens: [] };
  if (obras.length > 1) {
    return { ok: false, erro: `Um romaneio não pode misturar obras (${obras.join(', ')}). Selecione peças de uma única obra.`, itens: [], obras };
  }

  const vistos = new Set();
  const itens = [];
  for (const p of lista) {
    const id = String(p.id);
    if (vistos.has(id)) return { ok: false, erro: `Peça ${p.marca || id} repetida`, itens: [] };
    vistos.add(id);
    const disponivel = Math.max(1, parseInt(p.quantidade, 10) || 1);
    const pedido = quantidades?.[p.id] ?? quantidades?.[id];
    const qtd = pedido == null || pedido === '' ? disponivel : parseInt(pedido, 10);
    if (!Number.isFinite(qtd) || qtd <= 0) return { ok: false, erro: `Quantidade inválida para ${p.marca || id}`, itens: [] };
    if (qtd > disponivel) return { ok: false, erro: `Quantidade de ${p.marca || id} maior que a disponível (${qtd} > ${disponivel})`, itens: [] };
    itens.push({ id, qtd, qtdDisponivel: disponivel, parcial: qtd < disponivel });
  }
  return { ok: true, obraId: obras[0], itens };
}

/** Itens (objetos) de um romaneio, aceitando os formatos legados. */
export function itensDoRomaneio(exp) {
  const raw = exp?.pecas_detalhes || exp?.pecasDetalhes || (Array.isArray(exp?.pecas) ? exp.pecas : []);
  return (raw || [])
    .map((p) => (p && typeof p === 'object' ? p : { id: p }))
    .filter((p) => p.id != null && p.id !== '');
}

/**
 * Quantidades por peça a partir dos romaneios ATIVOS (não excluídos):
 *  - reservada: tudo que está em algum romaneio (some da Fila de Embarque).
 *    Item sem qtd (formato antigo) = linha inteira (Infinity).
 *  - enviadaLegado: unidades de itens PARCIAIS legados (qtd_enviada < qtd_total,
 *    pré-split) de romaneios já despachados — a peça original ficou `expedido`
 *    mas essas unidades já saíram da fábrica.
 */
export function calcularReservasRomaneios(expedicoes = []) {
  const reservada = {};
  const enviadaLegado = {};
  for (const exp of expedicoes || []) {
    if (!exp || exp.deleted_at || exp.deletedAt) continue;
    const despachado = isRomaneioDespachado(exp.status);
    for (const it of itensDoRomaneio(exp)) {
      const id = String(it.id);
      const qtd = Number(it.qtd_enviada ?? it.qtdEnviada);
      const total = Number(it.qtd_total ?? it.qtdTotal);
      if (!Number.isFinite(qtd) || qtd <= 0) {
        reservada[id] = Infinity;
        continue;
      }
      reservada[id] = (reservada[id] || 0) + qtd;
      if (despachado && Number.isFinite(total) && qtd < total) {
        enviadaLegado[id] = (enviadaLegado[id] || 0) + qtd;
      }
    }
  }
  return { reservada, enviadaLegado };
}

/** Monta o payload da RPC criar_romaneio. */
export function montarPayloadCriarRomaneio({ id, numero, data, status, transportadora, motorista, placa, observacoes, destino, itens }) {
  return {
    ...(id ? { id } : {}),
    numero_romaneio: numero || null,
    data_expedicao: data || hojeLocalISO(),
    status: normalizarStatusRomaneio(status) || 'preparando',
    transportadora: transportadora || null,
    motorista: motorista || null,
    placa: placa || null,
    observacoes: observacoes || null,
    destino: destino || null,
    pecas: (itens || []).map((i) => ({ id: String(i.id), qtd: Number(i.qtd) })),
  };
}

// ----------------------------------------------------------------------------
// FILA DE EMBARQUE (seleção para novo romaneio — app e desktop usam a mesma regra)
// ----------------------------------------------------------------------------
const numero = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const campo = (p, ...ks) => { for (const k of ks) if (p?.[k] != null && p[k] !== '') return p[k]; return undefined; };

/**
 * Peças disponíveis para embarque: etapa `expedido` com saldo > 0, onde
 * saldo = quantidade da linha − unidades já reservadas em romaneio ativo
 * (calcularReservasRomaneios). Peso proporcional ao saldo.
 * @returns {Array<{id, marca, tipo, obraId, total, reservada, disponivel, pesoUnit, pesoDisponivel, peca}>}
 */
export function montarFilaEmbarque(pecas = [], expedicoes = []) {
  const { reservada } = calcularReservasRomaneios(expedicoes);
  const fila = [];
  for (const p of pecas || []) {
    if (!p || String(campo(p, 'etapa') || '').toLowerCase() !== 'expedido') continue;
    const total = Math.max(1, parseInt(campo(p, 'quantidade', 'qtd'), 10) || 1);
    const res = Math.min(total, reservada[String(p.id)] || 0);
    const disponivel = total - res;
    if (disponivel <= 0) continue;
    const pesoTotal = numero(campo(p, 'pesoTotal', 'peso_total', 'peso'))
      || numero(campo(p, 'pesoUnitario', 'peso_unitario')) * total;
    const pesoUnit = total > 0 ? pesoTotal / total : 0;
    fila.push({
      id: String(p.id),
      marca: campo(p, 'marca') || String(p.id),
      tipo: campo(p, 'tipo') || '',
      obraId: obraDe(p),
      total,
      reservada: res,
      disponivel,
      pesoUnit,
      pesoDisponivel: pesoUnit * disponivel,
      peca: p,
    });
  }
  return fila.sort((a, b) => String(a.marca).localeCompare(String(b.marca), 'pt-BR', { numeric: true }));
}

/**
 * Transforma a seleção ({id: qtd}) em plano de romaneio (planejarRomaneio),
 * usando o SALDO da fila como disponível. Devolve também o peso e o nº de parciais.
 */
export function planejarSelecaoFila(fila = [], selecao = {}) {
  const porId = new Map((fila || []).map((f) => [f.id, f]));
  const escolhidas = Object.keys(selecao || {}).map((id) => porId.get(String(id))).filter(Boolean);
  const pecas = escolhidas.map((f) => ({ id: f.id, marca: f.marca, obra_id: f.obraId, quantidade: f.disponivel }));
  const plano = planejarRomaneio(pecas, selecao);
  if (!plano.ok) return { ...plano, pesoKg: 0, parciais: 0 };
  const pesoKg = plano.itens.reduce((s, i) => s + (porId.get(i.id)?.pesoUnit || 0) * i.qtd, 0);
  return { ...plano, pesoKg, parciais: plano.itens.filter((i) => i.parcial).length };
}
