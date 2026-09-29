// ============================================================
// PREVISÃO DE CARGAS (carreta) — quantas cargas faltam por obra
// ============================================================
// Cruza o HISTÓRICO de romaneios da obra (expedicoes: peso_total por carga,
// datas) com o PESO AINDA NÃO ENVIADO (peças fora de enviado/entregue) e
// estima quantas carretas faltam:
//   capacidade de referência = média das ÚLTIMAS N cargas da obra (padrão 5;
//   o transporte da obra é o melhor preditor do próprio transporte). Sem
//   histórico na obra → média geral de todas as obras. O usuário pode
//   simular outra capacidade (manual).
//   cargas (média)      = ceil(restante ÷ capacidade)
//   cargas (carga cheia)= ceil(restante ÷ maior carga já feita)
//   ritmo               = intervalo médio (dias) entre romaneios → previsão
//                         de término = última carga + cargas × ritmo.
// Puro/testável; tolerante a snake_case e camelCase (contexto ou banco).
// Peso SEMPRE em kg.
// ============================================================
import { etapaPeca, pesoPeca } from './relatorioProducao';

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r0 = (n) => Math.round(n);
const r1 = (n) => Math.round(n * 10) / 10;
const pick = (o, ...ks) => { for (const k of ks) if (o && o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; return undefined; };

export const obraIdDe = (x) => pick(x, 'obraId', 'obra_id') ?? x?.obra?.id ?? null;
const dataExp = (e) => String(pick(e, 'dataExpedicao', 'data_expedicao', 'dataEnvio', 'data_envio', 'data') || '').slice(0, 10);
const pesoExp = (e) => num(pick(e, 'pesoTotal', 'peso_total'));
const numeroExp = (e) => pick(e, 'numeroRomaneio', 'numero_romaneio', 'numero') || e?.id || '—';
export const contratoPesoKg = (o) => num(pick(o, 'contratoPesoTotal', 'contrato_peso_total', 'pesoTotal'));

// Já saiu da fábrica rumo à obra (não conta como "a transportar")
const enviadaEtapa = (et) => et === 'enviado' || et === 'entregue';

const DIA_MS = 86400000;
const parseDia = (s) => { const [y, m, d] = String(s).split('-').map(Number); return (y && m && d) ? new Date(y, m - 1, d) : null; };
const addDias = (s, n) => { const d = parseDia(s); if (!d) return null; d.setDate(d.getDate() + Math.round(n)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const diffDias = (a, b) => { const da = parseDia(a), db = parseDia(b); return da && db ? Math.round((db - da) / DIA_MS) : 0; };

// Histórico de cargas de uma obra (romaneios com peso > 0, ordem cronológica).
export function historicoCargasObra(expedicoes = [], obraId, { ultimas = 5 } = {}) {
  const roms = (expedicoes || [])
    .filter((e) => obraIdDe(e) === obraId && pesoExp(e) > 0)
    .map((e) => ({ id: e.id, numero: numeroExp(e), data: dataExp(e), peso: r0(pesoExp(e)), status: String(e.status || '').toLowerCase(), transportadora: e.transportadora || '' }))
    .sort((a, b) => a.data.localeCompare(b.data) || String(a.id).localeCompare(String(b.id)));
  const pesos = roms.map((r) => r.peso);
  const n = roms.length;
  const soma = pesos.reduce((s, p) => s + p, 0);
  const recentes = roms.slice(-ultimas);
  const somaRec = recentes.reduce((s, r) => s + r.peso, 0);
  const ord = [...pesos].sort((a, b) => a - b);
  const mediana = n ? (n % 2 ? ord[(n - 1) / 2] : r0((ord[n / 2 - 1] + ord[n / 2]) / 2)) : 0;
  // Ritmo: dias entre a primeira e a última carga ÷ (nº de cargas − 1). Cargas
  // no mesmo dia contam como uma "viagem" a mais no mesmo intervalo (ritmo
  // fica mais rápido — é o que a obra realmente faz).
  const datas = roms.map((r) => r.data).filter(Boolean);
  const span = datas.length >= 2 ? diffDias(datas[0], datas[datas.length - 1]) : 0;
  const intervaloMedioDias = n >= 2 && span > 0 ? r1(span / (n - 1)) : 0;
  return {
    n, romaneios: roms, recentes,
    mediaGeral: n ? r0(soma / n) : 0,
    mediaRecente: recentes.length ? r0(somaRec / recentes.length) : 0,
    mediana,
    maxCarga: n ? Math.max(...pesos) : 0,
    minCarga: n ? Math.min(...pesos) : 0,
    pesoTotalRomaneios: r0(soma),
    primeiraData: datas[0] || null,
    ultimaData: datas[datas.length - 1] || null,
    intervaloMedioDias,
  };
}

// Média geral de carga (todas as obras) — fallback p/ obra sem histórico.
export function mediaGlobalCargas(expedicoes = []) {
  const pesos = (expedicoes || []).map(pesoExp).filter((p) => p > 0);
  return pesos.length ? r0(pesos.reduce((s, p) => s + p, 0) / pesos.length) : 0;
}

// Peso da obra por situação de transporte (a partir das peças).
export function restanteObra(pecas = [], obra = null) {
  const obraId = obra?.id ?? null;
  const r = { pesoCadastrado: 0, enviado: 0, fila: 0, emFabrica: 0, naoIniciado: 0, restante: 0, contrato: contratoPesoKg(obra), naoCadastrado: 0, nPecasRestantes: 0 };
  (pecas || []).forEach((p) => {
    if (obraId != null && obraIdDe(p) !== obraId) return;
    const et = etapaPeca(p);
    const w = pesoPeca(p);
    r.pesoCadastrado += w;
    if (enviadaEtapa(et)) { r.enviado += w; return; }
    r.restante += w; r.nPecasRestantes += 1;
    if (et === 'expedido') r.fila += w;
    else if (et === 'aguardando') r.naoIniciado += w;
    else r.emFabrica += w;
  });
  Object.keys(r).forEach((k) => { if (k !== 'nPecasRestantes') r[k] = r0(r[k]); });
  r.naoCadastrado = Math.max(0, r0(r.contrato - r.pesoCadastrado));
  r.pctEnviado = r.pesoCadastrado > 0 ? r1((r.enviado / r.pesoCadastrado) * 100) : 0;
  return r;
}

const cargas = (peso, cap) => (peso > 0 && cap > 0 ? Math.ceil((peso - 0.5) / cap) : 0);

// Previsão completa de UMA obra.
export function previsaoCargasObra({ pecas = [], expedicoes = [], obra = null, capacidadeManual = 0, ultimas = 5, mediaGlobal = null } = {}) {
  const hist = historicoCargasObra(expedicoes, obra?.id, { ultimas });
  const rest = restanteObra(pecas, obra);
  const global = mediaGlobal ?? mediaGlobalCargas(expedicoes);
  let capacidade = 0, fonte = 'sem_dados';
  if (num(capacidadeManual) > 0) { capacidade = r0(num(capacidadeManual)); fonte = 'manual'; }
  else if (hist.mediaRecente > 0) { capacidade = hist.mediaRecente; fonte = 'obra'; }
  else if (global > 0) { capacidade = global; fonte = 'global'; }
  const cargasMedia = cargas(rest.restante, capacidade);
  const cargasCheia = hist.maxCarga > 0 ? cargas(rest.restante, hist.maxCarga) : 0;
  const cargasFila = cargas(rest.fila, capacidade);            // já dá p/ montar (prontas)
  const cargasContrato = rest.naoCadastrado > 0 ? cargas(rest.restante + rest.naoCadastrado, capacidade) : cargasMedia;
  const ritmo = hist.intervaloMedioDias;
  const diasRestantes = ritmo > 0 && cargasMedia > 0 ? r0(cargasMedia * ritmo) : 0;
  const previsaoTermino = hist.ultimaData && diasRestantes > 0 ? addDias(hist.ultimaData, diasRestantes) : null;
  return {
    obraId: obra?.id ?? null, obra,
    historico: hist, restante: rest,
    capacidade, fonte, mediaGlobal: global,
    cargasMedia, cargasCheia, cargasFila, cargasContrato,
    ritmoDias: ritmo, diasRestantes, previsaoTermino,
    concluida: rest.restante <= 0 && rest.naoCadastrado <= 0,
  };
}

// Previsão de TODAS as obras com peças (ordena por restante desc).
export function previsaoCargasTodas({ pecas = [], expedicoes = [], obras = [], capacidadeManual = 0, ultimas = 5 } = {}) {
  const mediaGlobal = mediaGlobalCargas(expedicoes);
  const comPecas = new Set((pecas || []).map(obraIdDe).filter((x) => x != null));
  const linhas = (obras || [])
    .filter((o) => comPecas.has(o.id))
    .map((o) => previsaoCargasObra({ pecas, expedicoes, obra: o, capacidadeManual, ultimas, mediaGlobal }))
    .sort((a, b) => b.restante.restante - a.restante.restante || String(a.obra?.nome || '').localeCompare(String(b.obra?.nome || '')));
  const totais = linhas.reduce((t, l) => {
    t.restante += l.restante.restante; t.fila += l.restante.fila; t.cargasMedia += l.cargasMedia; t.cargasCheia += l.cargasCheia; t.cargasFila += l.cargasFila;
    return t;
  }, { restante: 0, fila: 0, cargasMedia: 0, cargasCheia: 0, cargasFila: 0 });
  return { linhas, mediaGlobal, totais, ativas: linhas.filter((l) => !l.concluida) };
}
