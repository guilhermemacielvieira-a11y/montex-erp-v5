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

// ============================================================
// MODELO PEÇAS/VOLUME — a carreta enche por PESO (20 t) ou por VOLUME
// (altura máx. 4,40 m). Tesoura, viga-mestra, treliça e calha são
// volumosas: lotam a carreta com pouco peso. Terça, tirante, coluna,
// contraventamento e miudezas empilham denso: o limite é o peso.
// `capVol` = kg de cada classe que ENCHEM uma carreta pelo volume
// (parâmetros editáveis; calibrados pela prática da MONTEX, altura 4,40 m).
// Ocupação de um conjunto de peças (em carretas) =
//   max( Σ peso ÷ pesoMax ,  Σ peso_classe ÷ capVol_classe )
// A prática real raramente fecha 100%: a ocupação MÉDIA dos últimos
// romaneios (pelo mesmo modelo) calibra a previsão:
//   cargas = ceil( ocupação restante ÷ ocupação média por carga )
// ============================================================
export const PARAMS_CARGA_PADRAO = {
  pesoMax: 20000,      // kg por carreta
  alturaMax: 4.4,      // m (limite de altura da carga)
  ultimas: 5,
  capVol: {            // kg que lotam a carreta por VOLUME, por classe
    TESOURA: 9000, TRELICA: 9000, VIGA_MESTRA: 9000, VIGA: 12000, CALHA: 6000,
    COLUNA: 16000, TERCA: 22000, MAO_FRANCESA: 18000,
    TIRANTE: 30000, CONTRAVENTAMENTO: 30000, MIUDEZA: 30000, CHAPA: 30000,
    OUTROS: 15000,
  },
};
export const CLASSES_CARGA = [
  { key: 'TESOURA', label: 'Tesouras', volumosa: true },
  { key: 'VIGA_MESTRA', label: 'Vigas-mestras', volumosa: true },
  { key: 'TRELICA', label: 'Treliças', volumosa: true },
  { key: 'CALHA', label: 'Calhas', volumosa: true },
  { key: 'VIGA', label: 'Vigas', volumosa: true },
  { key: 'COLUNA', label: 'Colunas', volumosa: false },
  { key: 'TERCA', label: 'Terças', volumosa: false },
  { key: 'MAO_FRANCESA', label: 'Mãos-francesas', volumosa: false },
  { key: 'TIRANTE', label: 'Tirantes', volumosa: false },
  { key: 'CONTRAVENTAMENTO', label: 'Contraventamentos', volumosa: false },
  { key: 'CHAPA', label: 'Chapas', volumosa: false },
  { key: 'MIUDEZA', label: 'Miudezas (chumbador, inserto, suporte…)', volumosa: false },
  { key: 'OUTROS', label: 'Outros', volumosa: false },
];
const semAcento = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// Classe de carga pelo TIPO da peça (ou pelo prefixo da marca, se faltar tipo).
export function classeCarga(p) {
  const t = semAcento(pick(p, 'tipo', 'peca'));
  const m = semAcento(pick(p, 'marca', 'codigo'));
  const tem = (...ks) => ks.some((k) => t.includes(k));
  if (tem('TESOURA')) return 'TESOURA';
  if (tem('TRELICA')) return 'TRELICA';
  if (tem('VIGA-MESTRA', 'VIGA MESTRA', 'VIGA_MESTRA', 'VIGAMESTRA')) return 'VIGA_MESTRA';
  if (tem('CALHA', 'RUFO')) return 'CALHA';
  if (tem('VIGA')) return 'VIGA';
  if (tem('COLUNA', 'PILAR')) return 'COLUNA';
  if (tem('TERCA')) return 'TERCA';
  if (tem('MAO-FRANCESA', 'MAO FRANCESA', 'MAO_FRANCESA')) return 'MAO_FRANCESA';
  if (tem('TIRANTE')) return 'TIRANTE';
  if (tem('CONTRAVENT')) return 'CONTRAVENTAMENTO';
  if (tem('CHAPA')) return 'CHAPA';
  if (tem('CHUMBADOR', 'INSERTO', 'SUPORTE', 'BOCAL', 'PARAFUSO', 'PORCA', 'ARRUELA', 'GRAMPO')) return 'MIUDEZA';
  if (t) return 'OUTROS';
  // sem tipo: prefixo da marca (TS = tesoura, VM = viga-mestra, C = coluna, TC/TP = terça…)
  if (/^TS\d/.test(m)) return 'TESOURA';
  if (/^VM\d/.test(m)) return 'VIGA_MESTRA';
  if (/^TRE\d/.test(m)) return 'TRELICA';
  if (/^CA\d/.test(m)) return 'CALHA';
  if (/^V\d/.test(m)) return 'VIGA';
  if (/^C\d/.test(m)) return 'COLUNA';
  if (/^T[CP]\d/.test(m)) return 'TERCA';
  if (/^MF\d/.test(m)) return 'MAO_FRANCESA';
  if (/^TR\d/.test(m)) return 'TIRANTE';
  if (/^CT\d/.test(m)) return 'CONTRAVENTAMENTO';
  if (/^CH\d/.test(m)) return 'CHAPA';
  return 'OUTROS';
}
export function mesclarParams(params) {
  const base = PARAMS_CARGA_PADRAO;
  return { ...base, ...(params || {}), capVol: { ...base.capVol, ...((params && params.capVol) || {}) } };
}
// Ocupação (em carretas) de um conjunto de peças. `pesoDe(p)` permite pesar
// só a fração enviada (romaneio). Retorna a fração por classe.
export function ocupacaoPecas(pecas = [], params, pesoDe = pesoPeca) {
  const P = mesclarParams(params);
  const porClasse = {};
  let peso = 0, fracVol = 0;
  (pecas || []).forEach((p) => {
    const w = num(pesoDe(p));
    if (w <= 0) return;
    const c = classeCarga(p);
    const cap = num(P.capVol[c]) || P.capVol.OUTROS;
    const f = w / cap;
    peso += w; fracVol += f;
    const g = porClasse[c] || (porClasse[c] = { classe: c, peso: 0, fracao: 0 });
    g.peso += w; g.fracao += f;
  });
  const porPeso = P.pesoMax > 0 ? peso / P.pesoMax : 0;
  const carretas = Math.max(porPeso, fracVol);
  const classes = Object.values(porClasse).map((g) => ({ ...g, peso: r0(g.peso), fracao: Math.round(g.fracao * 100) / 100, pct: fracVol > 0 ? r0((g.fracao / fracVol) * 100) : 0 })).sort((a, b) => b.fracao - a.fracao);
  return {
    peso: r0(peso), porPeso: Math.round(porPeso * 100) / 100, porVolume: Math.round(fracVol * 100) / 100,
    carretas: Math.round(carretas * 100) / 100,
    gargalo: carretas <= 0 ? null : (fracVol > porPeso ? 'volume' : 'peso'),
    classes,
  };
}
const idsRomaneio = (rom) => {
  const arr = rom?.pecas || rom?.pecasIds || rom?.pecas_ids || [];
  return (Array.isArray(arr) ? arr : []).map((x) => (typeof x === 'object' && x ? { id: String(x.id), qtdEnviada: num(x.qtd_enviada ?? x.qtdEnviada), qtdTotal: num(x.qtd_total ?? x.qtdTotal) } : { id: String(x), qtdEnviada: 0, qtdTotal: 0 }));
};
// Ocupação de um romaneio já feito (peças pelo id; fração enviada quando
// parcial). Sem peças localizáveis → só pelo peso (peso_total ÷ pesoMax).
export function ocupacaoRomaneio(rom, pecasById, params) {
  const P = mesclarParams(params);
  const refs = idsRomaneio(rom);
  const itens = [];
  let pesoAchado = 0;
  refs.forEach((ref) => {
    const p = pecasById && pecasById.get(ref.id);
    if (!p) return;
    const fator = ref.qtdEnviada > 0 && ref.qtdTotal > 0 && ref.qtdEnviada < ref.qtdTotal ? ref.qtdEnviada / ref.qtdTotal : 1;
    itens.push({ p, fator });
    pesoAchado += pesoPeca(p) * fator;
  });
  const pesoRom = pesoExp(rom);
  // Sem peças achadas (ou peso muito divergente) → escala o modelo pelo peso do romaneio
  if (!itens.length) {
    return { ...ocupacaoPecas([], P), peso: r0(pesoRom), porPeso: Math.round((pesoRom / P.pesoMax) * 100) / 100, carretas: Math.round((pesoRom / P.pesoMax) * 100) / 100, gargalo: pesoRom > 0 ? 'peso' : null, cobertura: 0 };
  }
  const escala = pesoRom > 0 && pesoAchado > 0 ? pesoRom / pesoAchado : 1;
  const oc = ocupacaoPecas(itens.map((i) => i.p), P, (p) => pesoPeca(p) * (itens.find((i) => i.p === p)?.fator || 1) * escala);
  return { ...oc, cobertura: pesoRom > 0 ? Math.min(1, Math.round((pesoAchado / pesoRom) * 100) / 100) : 1 };
}

// Histórico de cargas de uma obra (romaneios com peso > 0, ordem cronológica).
export function historicoCargasObra(expedicoes = [], obraId, { ultimas = 5 } = {}) {
  const roms = (expedicoes || [])
    .filter((e) => obraIdDe(e) === obraId && pesoExp(e) > 0)
    .map((e) => ({ id: e.id, numero: numeroExp(e), data: dataExp(e), peso: r0(pesoExp(e)), status: String(e.status || '').toLowerCase(), transportadora: e.transportadora || '', _raw: e }))
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
export function previsaoCargasObra({ pecas = [], expedicoes = [], obra = null, capacidadeManual = 0, ultimas = 5, mediaGlobal = null, params = null, pecasById = null } = {}) {
  const hist = historicoCargasObra(expedicoes, obra?.id, { ultimas });
  const rest = restanteObra(pecas, obra);
  const volume = modeloVolumeObra({ pecas, obra, hist, params, pecasById });
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
    volume,
    concluida: rest.restante <= 0 && rest.naoCadastrado <= 0,
  };
}

// Modelo peças/volume da obra: ocupação das peças a transportar (por classe)
// e calibração pela ocupação média das últimas cargas reais.
export function modeloVolumeObra({ pecas = [], obra = null, hist, params = null, pecasById = null } = {}) {
  const P = mesclarParams(params);
  const obraId = obra?.id ?? null;
  const pendentes = (pecas || []).filter((p) => (obraId == null || obraIdDe(p) === obraId) && !enviadaEtapa(etapaPeca(p)));
  const fila = pendentes.filter((p) => etapaPeca(p) === 'expedido');
  const ocRestante = ocupacaoPecas(pendentes, P);
  const ocFila = ocupacaoPecas(fila, P);
  // Ocupação real das últimas cargas (mesmo modelo) → quanto de carreta cada
  // romaneio realmente leva na prática (raramente 100%).
  const byId = pecasById || new Map((pecas || []).map((p) => [String(p.id), p]));
  const recentes = (hist?.recentes || []).map((r) => ({ ...r, ocupacao: ocupacaoRomaneio(r._raw || r, byId, P) }));
  // Calibração = MEDIANA da ocupação das cargas "de verdade" (≥ 25% de uma
  // carreta; complementos pequenos — chumbadores, chapas soltas — ficam fora
  // p/ não puxar a média p/ baixo). Só romaneios cujas peças foram localizadas
  // (cobertura ≥ 60%) entram. Se a prática carrega MAIS do que o modelo prevê
  // (ocupação > 1), a calibração corrige p/ cima a capacidade — e vice-versa.
  const CORTE = 0.25;
  const ocsTodas = recentes.map((r) => r.ocupacao).filter((o) => o.carretas > 0 && (o.cobertura ?? 1) >= 0.6);
  const ocs = ocsTodas.filter((o) => o.carretas >= CORTE).map((o) => o.carretas).sort((a, b) => a - b);
  const ocupMedia = ocs.length ? Math.round((ocs.length % 2 ? ocs[(ocs.length - 1) / 2] : (ocs[ocs.length / 2 - 1] + ocs[ocs.length / 2]) / 2) * 100) / 100 : 0;
  const cargasOtimizadas = ocRestante.carretas > 0 ? Math.ceil(ocRestante.carretas - 0.005) : 0;
  const cargasCalibradas = ocupMedia > 0 && ocRestante.carretas > 0 ? Math.ceil(ocRestante.carretas / ocupMedia - 0.005) : cargasOtimizadas;
  return {
    params: P,
    restante: ocRestante, fila: ocFila,
    cargasOtimizadas, cargasCalibradas, ocupacaoMediaHist: ocupMedia, nHist: ocs.length, nIgnoradas: ocsTodas.length - ocs.length,
    cargasFila: ocFila.carretas > 0 ? Math.ceil(ocFila.carretas - 0.005) : 0,
    recentes,
  };
}

// Previsão de TODAS as obras com peças (ordena por restante desc).
export function previsaoCargasTodas({ pecas = [], expedicoes = [], obras = [], capacidadeManual = 0, ultimas = 5, params = null } = {}) {
  const mediaGlobal = mediaGlobalCargas(expedicoes);
  const comPecas = new Set((pecas || []).map(obraIdDe).filter((x) => x != null));
  const pecasById = new Map((pecas || []).map((p) => [String(p.id), p]));
  const linhas = (obras || [])
    .filter((o) => comPecas.has(o.id))
    .map((o) => previsaoCargasObra({ pecas, expedicoes, obra: o, capacidadeManual, ultimas, mediaGlobal, params, pecasById }))
    .sort((a, b) => b.restante.restante - a.restante.restante || String(a.obra?.nome || '').localeCompare(String(b.obra?.nome || '')));
  const totais = linhas.reduce((t, l) => {
    t.restante += l.restante.restante; t.fila += l.restante.fila; t.cargasMedia += l.cargasMedia; t.cargasCheia += l.cargasCheia; t.cargasFila += l.cargasFila;
    t.cargasVolume += l.volume.cargasCalibradas; t.cargasOtimizadas += l.volume.cargasOtimizadas;
    return t;
  }, { restante: 0, fila: 0, cargasMedia: 0, cargasCheia: 0, cargasFila: 0, cargasVolume: 0, cargasOtimizadas: 0 });
  return { linhas, mediaGlobal, totais, ativas: linhas.filter((l) => !l.concluida) };
}
