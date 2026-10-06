// ============================================================
// PLEITO DE MEDIÇÃO (fabricação) — motor puro, sem React
// ============================================================
// Fluxo: o que já foi FABRICADO (entregue na obra + aguardando carga +
// processo final: pintura/solda) menos o que já foi MEDIDO = disponível
// para a próxima medição. Valor = disponível × R$/kg (ou R$/un em obras
// medidas por unidade).
//
// Etapas (pecas_producao.etapa):
//   enviado/entregue/montagem → Entregue na obra
//   expedido                  → Aguardando carga (fila de embarque)
//   pintura / solda           → Processo final
//   fabricacao / corte        → Em fabricação (ainda não elegível)
//   aguardando / outras       → Não iniciado
// ============================================================

export const GRUPOS_ETAPA = [
  { key: 'entregue', label: 'Entregue na obra', etapas: ['enviado', 'entregue', 'montagem'], cor: '#22c55e', elegivel: true },
  { key: 'aguardandoCarga', label: 'Aguardando carga', etapas: ['expedido'], cor: '#3b82f6', elegivel: true },
  { key: 'pintura', label: 'Em pintura', etapas: ['pintura'], cor: '#a855f7', elegivel: true },
  { key: 'solda', label: 'Em solda', etapas: ['solda'], cor: '#f97316', elegivel: true },
  { key: 'fabricacao', label: 'Em fabricação', etapas: ['fabricacao', 'corte'], cor: '#eab308', elegivel: false },
  { key: 'naoIniciado', label: 'Não iniciado', etapas: [], cor: '#64748b', elegivel: false },
];
export const GRUPOS_ELEGIVEIS = GRUPOS_ETAPA.filter((g) => g.elegivel);
export const INCLUIR_PADRAO = Object.freeze({ entregue: true, aguardandoCarga: true, pintura: true, solda: true });

const ETAPA_PARA_GRUPO = GRUPOS_ETAPA.reduce((m, g) => {
  g.etapas.forEach((e) => { m[e] = g.key; });
  return m;
}, {});

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const r2 = (v) => Math.round(v * 100) / 100;
const limpar = (s) => String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const grupoDaEtapa = (etapa) => ETAPA_PARA_GRUPO[limpar(etapa)] || 'naoIniciado';

const parseJson = (v) => {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v) || {}; } catch { return {}; }
};

const obraDe = (x) => x?.obraId || x?.obra_id || null;

/** Adiantamento / entrada de contrato (não é medição de fabricação). */
export function ehAdiantamento(m) {
  const etapa = limpar(m?.etapa);
  if (['entrada_contrato', 'adiantamento', 'sinal'].includes(etapa)) return true;
  const desc = limpar(m?.descricao);
  return /\b(entrada|adiantamento|aporte|sinal)\b/.test(desc);
}

const STATUS_FORA = new Set(['rejeitada', 'rejeitado', 'cancelada', 'cancelado', 'estornada', 'estornado']);
const STATUS_PAGO = new Set(['paga', 'pago', 'recebida', 'recebido', 'quitada', 'quitado']);
const STATUS_APROVADO = new Set(['aprovada', 'aprovado', 'faturada', 'faturado']);

export function situacaoMedicao(status) {
  const s = limpar(status);
  if (STATUS_FORA.has(s)) return 'cancelada';
  if (STATUS_PAGO.has(s)) return 'paga';
  if (STATUS_APROVADO.has(s)) return 'aprovada';
  return 'em_analise';
}

/**
 * Medição que consome o peso fabricado: tudo que não é adiantamento,
 * montagem, avulsa nem cancelada.
 */
export function ehMedicaoFabricacao(m) {
  if (!m) return false;
  if (situacaoMedicao(m.status) === 'cancelada') return false;
  if (m.isAvulsa || m.is_avulsa) return false;
  const etapa = limpar(m.etapa);
  if (etapa === 'montagem' || etapa === 'avulsa') return false;
  return !ehAdiantamento(m);
}

/** Quanto a medição consumiu, na unidade do pleito (kg ou un). */
export function medidaDaMedicao(m, { modo = 'kg', valorUnit = 0 } = {}) {
  const valor = num(m?.valorBruto ?? m?.valor_bruto);
  if (modo === 'unidade') return valorUnit > 0 ? valor / valorUnit : 0;
  const det = parseJson(m?.detalhamento);
  const pesoDet = num(det?.fabricacao?.peso);
  if (pesoDet > 0) return pesoDet;
  const peso = num(m?.pesoMedido ?? m?.peso_medido);
  if (peso > 0) return peso;
  return valorUnit > 0 ? valor / valorUnit : 0;
}

/** Soma peso, quantidade e nº de peças por grupo de etapa. */
export function agruparPecas(pecas = []) {
  const grupos = {};
  GRUPOS_ETAPA.forEach((g) => { grupos[g.key] = { peso: 0, qtd: 0, pecas: 0 }; });
  (pecas || []).forEach((p) => {
    const g = grupos[grupoDaEtapa(p.etapa)];
    g.peso += num(p.peso_total ?? p.pesoTotal);
    g.qtd += num(p.quantidade) || 0;
    g.pecas += 1;
  });
  return grupos;
}

/** R$/kg da obra: cadastrado (GFO) → contrato (valor ÷ peso) → null. */
export function valorKgDaObra(obra) {
  if (!obra) return null;
  const cad = num(obra.valorKgFabricacao ?? obra.valor_kg_fabricacao);
  if (cad > 0) return cad;
  const vt = num(obra.contratoValorTotal ?? obra.contrato_valor_total);
  const pt = num(obra.contratoPesoTotal ?? obra.contrato_peso_total);
  return vt > 0 && pt > 0 ? r2((vt / pt) * 10000) / 10000 : null;
}

/**
 * Apura o pleito de medição de um conjunto de obras (1 obra ou um grupo).
 *
 * @param {object} p
 * @param {object[]} p.obras     obras do escopo
 * @param {object[]} p.pecas     peças dessas obras (etapa, peso_total, quantidade, marca…)
 * @param {object[]} p.medicoes  medições dessas obras
 * @param {object}   p.incluir   quais grupos elegíveis entram (padrão: todos)
 * @param {'kg'|'unidade'} p.modo
 * @param {number}   p.valorUnit R$/kg ou R$/un
 * @param {number}   p.contrato  medida contratada (kg ou un); 0 = usa o total do projeto
 */
export function apurarPleito({ obras = [], pecas = [], medicoes = [], incluir = INCLUIR_PADRAO, modo = 'kg', valorUnit = 0, contrato = 0 } = {}) {
  const ids = new Set((obras || []).map((o) => o.id));
  const pecasEsc = (pecas || []).filter((p) => !ids.size || ids.has(obraDe(p)));
  const medsEsc = (medicoes || []).filter((m) => !ids.size || ids.has(obraDe(m)));
  const chave = modo === 'unidade' ? 'qtd' : 'peso';

  const grupos = agruparPecas(pecasEsc);
  const medida = (k) => grupos[k][chave];
  const totalProjeto = GRUPOS_ETAPA.reduce((s, g) => s + medida(g.key), 0);

  let contratoMedida = num(contrato);
  if (!(contratoMedida > 0) && modo === 'kg') {
    contratoMedida = (obras || []).reduce((s, o) => s + num(o.contratoPesoTotal ?? o.contrato_peso_total), 0);
  }
  if (!(contratoMedida > 0)) contratoMedida = totalProjeto;

  const composicao = GRUPOS_ETAPA.map((g) => ({
    key: g.key, label: g.label, cor: g.cor, elegivel: g.elegivel,
    incluido: g.elegivel && !!incluir?.[g.key],
    medida: medida(g.key), peso: grupos[g.key].peso, qtd: grupos[g.key].qtd, pecas: grupos[g.key].pecas,
  }));
  const elegivel = composicao.filter((c) => c.incluido).reduce((s, c) => s + c.medida, 0);

  const historico = medsEsc
    .map((m) => {
      const fab = ehMedicaoFabricacao(m);
      const adiant = ehAdiantamento(m);
      return {
        id: m.id,
        obraId: obraDe(m),
        numero: m.numero ?? null,
        data: m.dataMedicao || m.data_medicao || m.dataReferencia || m.data_referencia || '',
        descricao: m.descricao || `Medição #${m.numero ?? '?'}`,
        etapa: m.etapa || '',
        tipo: fab ? 'fabricacao' : adiant ? 'adiantamento' : 'outra',
        situacao: situacaoMedicao(m.status),
        medida: fab ? medidaDaMedicao(m, { modo, valorUnit }) : 0,
        valor: num(m.valorBruto ?? m.valor_bruto),
      };
    })
    .sort((a, b) => String(a.data).localeCompare(String(b.data)) || num(a.numero) - num(b.numero));

  const medFab = historico.filter((h) => h.tipo === 'fabricacao');
  const medido = medFab.reduce((s, h) => s + h.medida, 0);
  const valorMedido = medFab.reduce((s, h) => s + h.valor, 0);
  const valorAdiantamentos = historico.filter((h) => h.tipo === 'adiantamento').reduce((s, h) => s + h.valor, 0);

  // Nunca pleitear além do contrato.
  const tetoElegivel = Math.min(elegivel, contratoMedida);
  const disponivel = Math.max(0, tetoElegivel - medido);
  const excedente = Math.max(0, medido - elegivel);
  const valorDisponivel = r2(disponivel * num(valorUnit));
  const saldoContrato = Math.max(0, contratoMedida - medido);
  const pct = (v) => (contratoMedida > 0 ? (v / contratoMedida) * 100 : 0);

  // Barra do contrato (soma = contrato): medido | disponível | em fabricação | a fabricar
  const bMedido = Math.min(medido, contratoMedida);
  const bDisp = Math.min(disponivel, contratoMedida - bMedido);
  const emFab = medida('fabricacao') + composicao.filter((c) => c.elegivel && !c.incluido).reduce((s, c) => s + c.medida, 0);
  const bFab = Math.min(emFab, Math.max(0, contratoMedida - bMedido - bDisp));
  const bResto = Math.max(0, contratoMedida - bMedido - bDisp - bFab);
  const barra = [
    { key: 'medido', label: 'Já medido', valor: bMedido, cor: '#0ea5e9' },
    { key: 'disponivel', label: 'Disponível p/ medição', valor: bDisp, cor: '#22c55e' },
    { key: 'emFabricacao', label: 'Em fabricação', valor: bFab, cor: '#eab308' },
    { key: 'aFabricar', label: 'A fabricar', valor: bResto, cor: '#cbd5e1' },
  ].map((b) => ({ ...b, pct: pct(b.valor) }));

  const numeros = medsEsc.map((m) => num(m.numero)).filter((n) => n > 0);
  const proximoNumero = (numeros.length ? Math.max(...numeros) : 0) + 1;

  // Peças ainda na fábrica que compõem o pleito (evidência p/ o cliente)
  const keysDetalhe = new Set(composicao.filter((c) => c.incluido && c.key !== 'entregue').map((c) => c.key));
  const itensFabrica = pecasEsc
    .filter((p) => keysDetalhe.has(grupoDaEtapa(p.etapa)))
    .map((p) => ({
      marca: p.marca || p.nome || p.id,
      perfil: p.perfil || '',
      tipo: p.tipo || '',
      qtd: num(p.quantidade),
      peso: num(p.peso_total ?? p.pesoTotal),
      grupo: grupoDaEtapa(p.etapa),
    }))
    .sort((a, b) => b.peso - a.peso);

  return {
    modo, unidade: modo === 'unidade' ? 'un' : 'kg', valorUnit: num(valorUnit),
    contrato: contratoMedida, valorContrato: r2(contratoMedida * num(valorUnit)), totalProjeto,
    composicao, elegivel, tetoElegivel, medido, valorMedido, valorAdiantamentos,
    disponivel, valorDisponivel, excedente, saldoContrato,
    pctMedido: pct(medido), pctElegivel: pct(tetoElegivel), pctDisponivel: pct(disponivel),
    barra, historico, proximoNumero, itensFabrica,
    previsaoProxima: medida('fabricacao'),
  };
}
