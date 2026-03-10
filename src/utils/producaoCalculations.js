/**
 * MONTEX ERP - Utilitários de Cálculo de Produção
 *
 * Funções centralizadas para cálculos de KG, unidades, eficiência
 * e valores financeiros por etapa de produção.
 */

// Valores por etapa (R$/kg)
export const VALORES_ETAPA = {
  corte: 1.20,
  fabricacao: 2.50,
  solda: 3.00,
  pintura: 1.80,
};

// Labels das etapas
export const ETAPAS_LABELS = {
  corte: 'Corte',
  fabricacao: 'Fabricação',
  solda: 'Solda',
  pintura: 'Pintura',
  expedido: 'Expedição',
};

// Cores por etapa
export const ETAPAS_CORES = {
  corte: { bg: 'from-amber-500/20 to-orange-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  fabricacao: { bg: 'from-purple-500/20 to-indigo-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  solda: { bg: 'from-red-500/20 to-rose-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  pintura: { bg: 'from-cyan-500/20 to-blue-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  expedido: { bg: 'from-emerald-500/20 to-green-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};

/**
 * Calcular valor financeiro por etapa
 * @param {number} kg - Peso em kg
 * @param {string} etapa - Nome da etapa (corte, fabricacao, solda, pintura)
 * @returns {number} Valor em R$
 */
export function calcularValorPorEtapa(kg, etapa) {
  const valor = VALORES_ETAPA[etapa] || 0;
  return Math.round(((kg || 0) * valor) * 100) / 100;
}

/**
 * Calcular eficiência (% realizado vs meta)
 * @param {number} realizado
 * @param {number} meta
 * @returns {number} Percentual 0-100+
 */
export function calcularEficiencia(realizado, meta) {
  if (!meta || meta <= 0) return 0;
  return Math.round((realizado / meta) * 100);
}

/**
 * Mapear etapa_de para a etapa de produção correta.
 * A produção de uma etapa é contabilizada quando a peça FINALIZA aquela etapa
 * (ou seja, sai dela — campo etapa_de no histórico).
 *
 * Exemplo: Peça sai de "fabricacao" → "solda" = Fabricação CONCLUÍDA
 * Kanban Corte usa "aguardando" → "finalizado" = Corte CONCLUÍDO
 */
const ETAPA_DE_MAP = {
  aguardando: 'corte',     // Kanban Corte: aguardando → finalizado = corte concluído
  corte: 'corte',          // Fallback se algum registro usar "corte" como etapa_de
  fabricacao: 'fabricacao', // Peça sai de fabricação → solda = fabricação concluída
  solda: 'solda',          // Peça sai de solda → pintura = solda concluída
  pintura: 'pintura',      // Peça sai de pintura → expedido = pintura concluída
};

/**
 * Agregar histórico de produção por etapa para um funcionário.
 *
 * LÓGICA: Produção é contabilizada pela etapa DE ONDE a peça SAIU (etapa_de).
 * Quando uma peça finaliza o Corte e vai pra Fabricação, o CORTE é creditado.
 * Quando finaliza Fabricação e vai pra Solda, a FABRICAÇÃO é creditada.
 *
 * @param {Array} historico - Registros de producao_historico
 * @param {Array} pecas - Registros de pecas_producao (com peso_total)
 * @returns {Object} Métricas por etapa
 */
export function agregarPorEtapa(historico, pecas = []) {
  const etapas = { corte: { unidades: 0, kg: 0 }, fabricacao: { unidades: 0, kg: 0 }, solda: { unidades: 0, kg: 0 }, pintura: { unidades: 0, kg: 0 } };

  // Criar mapa de peças para lookup rápido de peso
  const pecaMap = new Map();
  pecas.forEach(p => {
    pecaMap.set(p.id, {
      peso: p.peso_total || p.peso_unitario || 0,
      quantidade: p.quantidade || 1,
    });
  });

  historico.forEach(h => {
    // Usar etapa_de (de onde a peça saiu) = etapa que foi CONCLUÍDA
    const etapaOrigem = h.etapa_de;
    const etapaMapeada = ETAPA_DE_MAP[etapaOrigem];

    if (etapaMapeada && etapas[etapaMapeada]) {
      const pecaInfo = pecaMap.get(h.peca_id);
      // Usar quantidade REAL da peça (pode ser >1, ex: TC5B = 324 un)
      const qtd = pecaInfo?.quantidade || 1;
      etapas[etapaMapeada].unidades += qtd;
      if (pecaInfo) {
        etapas[etapaMapeada].kg += pecaInfo.peso;
      }
    }
  });

  // Calcular valores financeiros
  Object.keys(etapas).forEach(etapa => {
    etapas[etapa].kg = Math.round(etapas[etapa].kg * 100) / 100;
    etapas[etapa].valor = calcularValorPorEtapa(etapas[etapa].kg, etapa);
  });

  return etapas;
}

/**
 * Contabilização CUMULATIVA por status atual da peça.
 * Se uma peça está em "expedido", ela OBRIGATORIAMENTE passou por corte, fabricação, solda e pintura.
 * Se está em "pintura", passou por corte, fabricação e solda.
 * Isso fecha a lacuna de peças que foram movidas antes do histórico existir.
 *
 * @param {Array} pecas - Registros de pecas_producao (com etapa, peso_total, quantidade)
 * @returns {Object} Métricas cumulativas por etapa { corte: { unidades, kg }, ... }
 */
export function contabilizarCumulativo(pecas = []) {
  // Ordem das etapas de produção
  const ORDEM_ETAPAS = ['corte', 'fabricacao', 'solda', 'pintura', 'expedido'];
  const etapas = {
    corte: { unidades: 0, kg: 0 },
    fabricacao: { unidades: 0, kg: 0 },
    solda: { unidades: 0, kg: 0 },
    pintura: { unidades: 0, kg: 0 },
  };

  pecas.forEach(p => {
    const etapaAtual = p.etapa;
    if (!etapaAtual) return;

    const idxAtual = ORDEM_ETAPAS.indexOf(etapaAtual);
    if (idxAtual < 0) return; // etapa desconhecida

    const qtd = p.quantidade || 1;
    const peso = p.peso_total || p.peso_unitario || 0;

    // Se a peça está na etapa N, ela COMPLETOU todas as etapas 0..N-1
    // Se está em "expedido" (idx=4), completou corte(0), fabricacao(1), solda(2), pintura(3)
    // Se está em "pintura" (idx=3), completou corte(0), fabricacao(1), solda(2)
    // Se está em "solda" (idx=2), completou corte(0), fabricacao(1)
    // Se está em "fabricacao" (idx=1), completou corte(0)
    // Se está em "corte" (idx=0), não completou nada ainda (está em andamento)
    for (let i = 0; i < idxAtual && i < 4; i++) {
      const etapaConcluida = ORDEM_ETAPAS[i];
      if (etapas[etapaConcluida]) {
        etapas[etapaConcluida].unidades += qtd;
        etapas[etapaConcluida].kg += peso;
      }
    }
  });

  // Arredondar KG
  Object.keys(etapas).forEach(etapa => {
    etapas[etapa].kg = Math.round(etapas[etapa].kg * 100) / 100;
  });

  return etapas;
}

/**
 * Calcular totais a partir de métricas por etapa
 * @param {Object} porEtapa - Output de agregarPorEtapa
 * @returns {Object} Totais consolidados
 */
export function calcularTotais(porEtapa) {
  let totalUnidades = 0;
  let totalKg = 0;
  let totalValor = 0;

  Object.values(porEtapa).forEach(e => {
    totalUnidades += e.unidades;
    totalKg += e.kg;
    totalValor += e.valor || 0;
  });

  return {
    unidades: totalUnidades,
    kg: Math.round(totalKg * 100) / 100,
    valorTotal: Math.round(totalValor * 100) / 100,
  };
}

/**
 * Agregar histórico por dia para gráfico de tendência
 * @param {Array} historico
 * @returns {Array} [{ data: '2026-02-10', unidades: 5, kg: 120.5 }, ...]
 */
export function agregarPorDia(historico) {
  const porDia = {};
  historico.forEach(h => {
    const dia = h.data_inicio ? h.data_inicio.substring(0, 10) : null;
    if (!dia) return;
    if (!porDia[dia]) porDia[dia] = { data: dia, unidades: 0, kg: 0 };
    porDia[dia].unidades += 1;
  });
  return Object.values(porDia).sort((a, b) => a.data.localeCompare(b.data));
}

/**
 * Calcular tendência (alta, estável, baixa) baseado nos últimos N dias
 * @param {Array} dadosDiarios - Saída de agregarPorDia
 * @returns {string} 'alta' | 'estavel' | 'baixa'
 */
export function calcularTendencia(dadosDiarios) {
  if (dadosDiarios.length < 5) return 'estavel';
  const metade = Math.floor(dadosDiarios.length / 2);
  const primeiraParte = dadosDiarios.slice(0, metade);
  const segundaParte = dadosDiarios.slice(metade);
  const mediaPrimeira = primeiraParte.reduce((s, d) => s + d.unidades, 0) / primeiraParte.length;
  const mediaSegunda = segundaParte.reduce((s, d) => s + d.unidades, 0) / segundaParte.length;
  const diff = mediaSegunda - mediaPrimeira;
  if (diff > mediaPrimeira * 0.1) return 'alta';
  if (diff < -mediaPrimeira * 0.1) return 'baixa';
  return 'estavel';
}

/**
 * Obter cor de eficiência
 */
export function getEficienciaCor(valor) {
  if (valor >= 90) return 'text-emerald-400';
  if (valor >= 75) return 'text-blue-400';
  if (valor >= 60) return 'text-amber-400';
  return 'text-red-400';
}

/**
 * Obter cor de badge de eficiência
 */
export function getEficienciaBadge(valor) {
  if (valor >= 90) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (valor >= 75) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (valor >= 60) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

/**
 * Formatar peso em KG (sempre em KG, sem conversão para toneladas)
 */
export function formatKg(valor) {
  if (!valor) return '0 kg';
  return `${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg`;
}

/**
 * Formatar valor em R$
 */
export function formatReais(valor) {
  if (!valor) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}
