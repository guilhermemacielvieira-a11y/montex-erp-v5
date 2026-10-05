// ============================================================
// BI — Obras: avanço físico × financeiro, curva S e previsão de término
// ============================================================
// Avanço FÍSICO (fábrica) = kg com fabricação concluída (pintada → expedido,
//   enviado ou entregue) ÷ peso de contrato (ou soma das peças).
// Avanço FINANCEIRO = medições reconhecidas (aprovada/faturada/paga) ÷ valor
//   do contrato. Gap = financeiro − físico (pontos percentuais).
// Previsão de término = kg restante ÷ ritmo médio (últimas 4 semanas) da obra.
// ============================================================

import { medicaoReconhecida, medicaoRecebida } from '../../utils/financeiroStatus';
import {
  num, r1, r2, dataLocal, diasEntre, somaDias, chaveSemana, semanasEntre, media,
  fabricaConcluida, pesoPeca, obraDe, isoLocal,
} from './biCore';

const ativa = (o) => !['concluido', 'concluida', 'cancelado', 'cancelada'].includes(String(o?.status || '').toLowerCase());

/** kg que ficaram prontos (entraram em expedido ou além) por obra e semana. */
function prontosPorSemana(transicoes = []) {
  const mapa = new Map(); // obraId -> Map(semana -> kg)
  const visto = new Set();
  transicoes.forEach((t) => {
    if (!fabricaConcluida(t.para) || fabricaConcluida(t.de)) return;
    if (visto.has(t.pecaId)) return; // conta a peça uma vez
    visto.add(t.pecaId);
    if (!mapa.has(t.obraId)) mapa.set(t.obraId, new Map());
    const m = mapa.get(t.obraId);
    const k = chaveSemana(t.data);
    m.set(k, (m.get(k) || 0) + t.kg);
  });
  return mapa;
}

/**
 * Indicadores por obra.
 * @returns lista ordenada por valor de contrato desc.
 */
export function indicadoresObras({ obras = [], pecas = [], medicoes = [], despesas = [], transicoes = [], hoje = new Date(), obraIds = null }) {
  const alvo = (obras || []).filter((o) => !obraIds || obraIds.includes(o.id));
  const pecasPorObra = new Map();
  (pecas || []).forEach((p) => {
    const id = obraDe(p);
    if (!pecasPorObra.has(id)) pecasPorObra.set(id, []);
    pecasPorObra.get(id).push(p);
  });
  const prontos = prontosPorSemana(transicoes);
  const semanasRecentes = semanasEntre(somaDias(hoje, -21), hoje); // 4 semanas (inclui a atual)

  return alvo.map((o) => {
    const ps = pecasPorObra.get(o.id) || [];
    const kgPecas = ps.reduce((s, p) => s + pesoPeca(p), 0);
    const kgContrato = num(o.contratoPesoTotal ?? o.contrato_peso_total);
    const kgTotal = kgContrato > 0 ? kgContrato : kgPecas;
    const kgPronto = ps.filter((p) => fabricaConcluida(p.etapa)).reduce((s, p) => s + pesoPeca(p), 0);
    const kgEmObra = ps.filter((p) => ['enviado', 'entregue'].includes(String(p.etapa || '').toLowerCase())).reduce((s, p) => s + pesoPeca(p), 0);

    const valorContrato = num(o.contratoValorTotal ?? o.contrato_valor_total ?? o.valorContrato);
    const meds = (medicoes || []).filter((m) => obraDe(m) === o.id);
    const medido = meds.filter((m) => medicaoReconhecida(m.status)).reduce((s, m) => s + num(m.valorBruto ?? m.valor_bruto), 0);
    const recebido = meds.filter((m) => medicaoRecebida(m.status)).reduce((s, m) => s + num(m.valorBruto ?? m.valor_bruto), 0);
    const material = (despesas || []).filter((d) => obraDe(d) === o.id && !/cancel/i.test(d.status || '')).reduce((s, d) => s + num(d.valor), 0);

    const fisicoPct = kgTotal > 0 ? Math.min(100, (kgPronto / kgTotal) * 100) : null;
    const financeiroPct = valorContrato > 0 ? (medido / valorContrato) * 100 : null;
    const gapPp = fisicoPct !== null && financeiroPct !== null ? financeiroPct - fisicoPct : null;

    const serie = prontos.get(o.id) || new Map();
    const ritmoKgSemana = media(semanasRecentes.map((k) => serie.get(k) || 0)) || 0;
    const kgRestante = Math.max(0, kgTotal - kgPronto);
    const semanasRestantes = ritmoKgSemana > 0 ? kgRestante / ritmoKgSemana : null;
    const previsaoFim = kgRestante <= 0 ? null : (semanasRestantes !== null ? somaDias(hoje, Math.ceil(semanasRestantes * 7)) : null);
    const prazo = dataLocal(o.dataPrevistaFim ?? o.data_prevista_fim);
    const atrasoDias = previsaoFim && prazo ? diasEntre(prazo, previsaoFim) : (kgRestante > 0 && prazo && prazo < hoje ? diasEntre(prazo, hoje) : null);

    return {
      id: o.id,
      codigo: o.codigo || '',
      nome: o.nome || o.id,
      status: o.status,
      ativa: ativa(o),
      kgTotal: r1(kgTotal), kgPronto: r1(kgPronto), kgEmObra: r1(kgEmObra), kgRestante: r1(kgRestante),
      pecas: ps.length,
      valorContrato: r2(valorContrato), medido: r2(medido), recebido: r2(recebido), aReceber: r2(medido - recebido),
      saldoAMedir: valorContrato > 0 ? r2(valorContrato - medido) : null,
      material: r2(material),
      fisicoPct: fisicoPct === null ? null : r1(fisicoPct),
      financeiroPct: financeiroPct === null ? null : r1(financeiroPct),
      gapPp: gapPp === null ? null : r1(gapPp),
      ritmoKgSemana: r1(ritmoKgSemana),
      previsaoFim: previsaoFim ? isoLocal(previsaoFim) : null,
      prazo: prazo ? isoLocal(prazo) : null,
      atrasoDias,
      semContrato: !(valorContrato > 0),
    };
  }).sort((a, b) => b.valorContrato - a.valorContrato || b.kgTotal - a.kgTotal);
}

/**
 * Curva S de UMA obra (ou do escopo somado): kg pronto acumulado por semana
 * × planejado linear entre início e prazo.
 */
export function curvaS({ obras = [], transicoes = [], hoje = new Date() }) {
  const ids = new Set(obras.map((o) => o.id));
  const inicios = obras.map((o) => dataLocal(o.dataInicio ?? o.data_inicio)).filter(Boolean);
  const prazos = obras.map((o) => dataLocal(o.dataPrevistaFim ?? o.data_prevista_fim)).filter(Boolean);
  const kgTotal = obras.reduce((s, o) => s + num(o.contratoPesoTotal ?? o.contrato_peso_total), 0);
  const trs = transicoes.filter((t) => ids.has(t.obraId));
  const datas = trs.map((t) => t.data);
  const ini = inicios.length ? new Date(Math.min(...inicios)) : (datas.length ? new Date(Math.min(...datas)) : null);
  if (!ini) return { pontos: [], kgTotal: r1(kgTotal), temPlano: false };
  const prazo = prazos.length === obras.length && prazos.length ? new Date(Math.max(...prazos)) : null;
  const fim = prazo && prazo > hoje ? prazo : hoje;
  const chaves = semanasEntre(ini, fim);

  const porSemana = new Map();
  const visto = new Set();
  trs.forEach((t) => {
    if (!fabricaConcluida(t.para) || fabricaConcluida(t.de) || visto.has(t.pecaId)) return;
    visto.add(t.pecaId);
    const k = chaveSemana(t.data);
    porSemana.set(k, (porSemana.get(k) || 0) + t.kg);
  });
  const totalDias = prazo ? Math.max(1, diasEntre(ini, prazo)) : null;
  const hojeK = chaveSemana(hoje);
  let acum = 0;
  const pontos = chaves.map((k) => {
    acum += porSemana.get(k) || 0;
    const d = dataLocal(k);
    const planejado = prazo && kgTotal > 0 ? Math.min(kgTotal, (Math.max(0, diasEntre(ini, d)) / totalDias) * kgTotal) : null;
    return { semana: k, realizado: k <= hojeK ? r1(acum) : null, planejado: planejado === null ? null : r1(planejado) };
  });
  return { pontos, kgTotal: r1(kgTotal), temPlano: !!prazo && kgTotal > 0 };
}

/** KPIs executivos consolidados do escopo. */
export function kpisExecutivos(indicadores = [], { ritmoKgSemana = 0 } = {}) {
  const ativas = indicadores.filter((i) => i.ativa);
  const soma = (l, k) => l.reduce((s, x) => s + num(x[k]), 0);
  const carteiraValor = ativas.reduce((s, i) => s + Math.max(0, num(i.saldoAMedir)), 0);
  const carteiraKg = soma(ativas, 'kgRestante');
  const mesesCarteira = ritmoKgSemana > 0 ? carteiraKg / (ritmoKgSemana * 4.33) : null;
  return {
    obrasAtivas: ativas.length,
    carteiraValor: r2(carteiraValor),
    carteiraKg: r1(carteiraKg),
    mesesCarteira: mesesCarteira === null ? null : r1(mesesCarteira),
    contratado: r2(soma(ativas, 'valorContrato')),
    medido: r2(soma(ativas, 'medido')),
    aReceber: r2(soma(ativas, 'aReceber')),
    obrasEmAtraso: ativas.filter((i) => (i.atrasoDias || 0) > 0).length,
    obrasSemContrato: ativas.filter((i) => i.semContrato).length,
  };
}
