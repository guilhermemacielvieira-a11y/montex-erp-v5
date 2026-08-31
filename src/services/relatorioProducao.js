// ============================================================
// Relatório de Produção — agregações para o card/PDF do Kanban
// ============================================================
// Recebe as PEÇAS (pecas_producao, no formato do contexto ou do banco) e produz
// um relatório completo: resumo geral, por etapa do fluxo, progresso ponderado,
// por funcionário (por etapa) e detalhe por etapa. Puro/testável; tolerante a
// snake_case e camelCase.
// ============================================================

import { normalizar } from './abastecimento';

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(n * 100) / 100;
const r0 = (n) => Math.round(n);
const pick = (o, ...ks) => { for (const k of ks) if (o && o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; return undefined; };
// Chave de cruzamento peça × material: perfil normalizado COMPLETO (sem truncar).
// Truncar (ex.: slice 0,12) colide variantes de espessura — "UE250X85X25X2" vs
// "UE250X85X25X2.25", "UE200X75X25X3.75" vs "…X4.25" — atribuindo status/falta
// do perfil errado. Peça e estoque usam a mesma nomenclatura Tekla, então a
// igualdade exata do perfil normalizado é o casamento correto.
const chavePerfil = (p) => normalizar(String(p || ''));

// Fluxo de produção (ordem crescente). `ordem` alimenta o progresso ponderado.
export const ETAPAS_REL = [
  { key: 'aguardando', label: 'Aguardando', cor: '#64748b', ordem: 0 },
  { key: 'fabricacao', label: 'Fabricação', cor: '#3b82f6', ordem: 1 },
  { key: 'solda',      label: 'Solda',      cor: '#8b5cf6', ordem: 2 },
  { key: 'pintura',    label: 'Pintura',    cor: '#f59e0b', ordem: 3 },
  { key: 'expedido',   label: 'Expedido (fila de embarque)', cor: '#f97316', ordem: 4 },
  { key: 'enviado',    label: 'Enviado (em obra)',           cor: '#eab308', ordem: 5 },
  { key: 'entregue',   label: 'Entregue',   cor: '#22c55e', ordem: 6 },
];
const ETAPA_MAX = 6;
const ETAPA_BY_KEY = Object.fromEntries(ETAPAS_REL.map((e) => [e.key, e]));

export function etapaPeca(p) {
  const e = String(pick(p, 'etapa') || 'aguardando').toLowerCase();
  if (ETAPA_BY_KEY[e]) return e;
  if (e === 'em_corte' || e === 'cortando' || e === 'corte') return 'aguardando';
  return 'aguardando';
}
export function qtdPeca(p) { return num(pick(p, 'quantidade', 'qtd')) || 0; }
export function pesoPeca(p) {
  const pt = num(pick(p, 'pesoTotal', 'peso_total'));
  if (pt > 0) return pt;
  const pu = num(pick(p, 'pesoUnitario', 'peso_unitario'));
  const q = qtdPeca(p) || 1;
  return r2(pu * q);
}

// Resumo geral + por etapa + progresso ponderado (por peso).
export function resumoProducao(pecas = []) {
  const porEtapa = ETAPAS_REL.map((e) => ({ ...e, pecas: 0, qtd: 0, peso: 0 }));
  const idx = Object.fromEntries(porEtapa.map((e, i) => [e.key, i]));
  let totalPeso = 0, totalQtd = 0, pesoPonderado = 0;
  (pecas || []).forEach((p) => {
    const ek = etapaPeca(p);
    const linha = porEtapa[idx[ek]];
    const peso = pesoPeca(p), q = qtdPeca(p);
    linha.pecas += 1; linha.qtd += q; linha.peso = r2(linha.peso + peso);
    totalPeso += peso; totalQtd += q;
    pesoPonderado += peso * (ETAPA_BY_KEY[ek].ordem / ETAPA_MAX);
  });
  porEtapa.forEach((e) => { e.peso = r2(e.peso); e.pct = totalPeso > 0 ? r2((e.peso / totalPeso) * 100) : 0; });
  return {
    totalPecas: (pecas || []).length,
    totalQtd,
    totalPeso: r2(totalPeso),
    porEtapa,
    progressoPct: totalPeso > 0 ? r2((pesoPonderado / totalPeso) * 100) : 0,
    // "concluído" = enviado + entregue
    pesoConcluido: r2(porEtapa[idx.enviado].peso + porEtapa[idx.entregue].peso),
  };
}

const funcsPorEtapa = {
  fabricacao: ['funcionarioFabricacao', 'funcionario_fabricacao'],
  solda: ['funcionarioSolda', 'funcionario_solda'],
  pintura: ['funcionarioPintura', 'funcionario_pintura'],
  expedido: ['funcionarioExpedido', 'funcionario_expedido'],
};

// Produção por FUNCIONÁRIO: para cada peça, atribui o peso ao funcionário de
// cada etapa registrada. `mapaNomes` (id→nome) resolve códigos para nomes.
// Retorna [{ funcionario, peso, pecas, porEtapa{} }].
export function porFuncionario(pecas = [], mapaNomes = {}) {
  const mapa = new Map();
  const nomeDe = (v) => { const raw = String(v || '').trim(); return (mapaNomes && mapaNomes[raw]) || raw; };
  const add = (valor, etapaKey, peso) => {
    const n = nomeDe(valor);
    if (!n) return;
    if (!mapa.has(n)) mapa.set(n, { funcionario: n, peso: 0, pecas: 0, porEtapa: {} });
    const f = mapa.get(n);
    f.peso = r2(f.peso + peso);
    f.pecas += 1;
    f.porEtapa[etapaKey] = r2((f.porEtapa[etapaKey] || 0) + peso);
  };
  (pecas || []).forEach((p) => {
    const peso = pesoPeca(p);
    let algum = false;
    Object.entries(funcsPorEtapa).forEach(([etapaKey, keys]) => {
      const nome = pick(p, ...keys);
      if (nome) { add(nome, etapaKey, peso); algum = true; }
    });
    if (!algum) {
      const resp = pick(p, 'responsavel', 'responsável');
      if (resp) add(resp, etapaPeca(p), peso);
    }
  });
  return [...mapa.values()].sort((a, b) => b.peso - a.peso);
}

// Cruza PEÇAS (a fabricar) × MATERIAL da obra: uma peça em etapa inicial
// (aguardando/fabricação) cujo perfil está SEM material recebido (status
// 'faltando') NÃO PODE ser fabricada. `materialLinhas` vem de
// resumoMaterialObra(estoque).linhas (perfil + status). Retorna as peças
// bloqueadas (para destacar em vermelho no relatório) e o resumo.
export function bloqueioFabricacao(pecas = [], materialLinhas = []) {
  const infoPorPerfil = new Map(); // chave → { status, falta }
  (materialLinhas || []).forEach((l) => {
    const k = chavePerfil(l.perfil);
    if (k) infoPorPerfil.set(k, { status: l.status, falta: num(l.falta) });
  });
  const podeFaltar = (et) => et === 'aguardando' || et === 'fabricacao';
  const itens = [];
  (pecas || []).forEach((p) => {
    const et = etapaPeca(p);
    if (!podeFaltar(et)) return;
    const perfil = pick(p, 'perfil') || '';
    const info = infoPorPerfil.get(chavePerfil(perfil));
    if (info && (info.status === 'faltando' || info.status === 'parcial')) {
      itens.push({
        marca: pick(p, 'marca', 'codigo') || '—',
        perfil, material: pick(p, 'material') || '',
        tipo: pick(p, 'tipo', 'peca') || '',
        quantidade: qtdPeca(p), peso: pesoPeca(p), etapa: et,
        status: info.status,                 // 'faltando' | 'parcial'
        faltaComprar: r2(info.falta),         // kg do perfil ainda por comprar
      });
    }
  });
  itens.sort((a, b) => (a.status === b.status ? b.peso - a.peso : a.status === 'faltando' ? -1 : 1));
  const bloqueadas = itens.filter((i) => i.status === 'faltando');
  const parciais = itens.filter((i) => i.status === 'parcial');
  const perfis = (arr) => [...new Set(arr.map((b) => b.perfil).filter(Boolean))].sort();

  // Agregação ANALÍTICA por perfil: material faltante → impacto em peças.
  // Reduz a lista peça-a-peça a uma linha por perfil (a "realidade geral").
  const mapPerfil = new Map();
  itens.forEach((i) => {
    const k = chavePerfil(i.perfil);
    if (!mapPerfil.has(k)) {
      mapPerfil.set(k, { perfil: i.perfil, material: i.material, status: i.status, faltaComprar: i.faltaComprar, nPecas: 0, qtd: 0, peso: 0, tipos: new Set() });
    }
    const g = mapPerfil.get(k);
    g.nPecas += 1; g.qtd += i.quantidade; g.peso += i.peso;
    if (i.tipo) g.tipos.add(i.tipo);
  });
  const porPerfil = [...mapPerfil.values()]
    .map((g) => ({ ...g, peso: r2(g.peso), tipos: [...g.tipos].sort() }))
    .sort((a, b) => (a.status === b.status ? b.peso - a.peso : a.status === 'faltando' ? -1 : 1));

  const faltaComprarTotal = r2([...mapPerfil.values()].reduce((s, g) => s + num(g.faltaComprar), 0));
  return {
    itens, bloqueadas, parciais, porPerfil,
    nBloqueadas: bloqueadas.length,
    nParciais: parciais.length,
    nPerfisFaltando: porPerfil.filter((g) => g.status === 'faltando').length,
    nPerfisParciais: porPerfil.filter((g) => g.status === 'parcial').length,
    qtdBloqueada: bloqueadas.reduce((s, b) => s + b.quantidade, 0),
    pesoBloqueado: r2(bloqueadas.reduce((s, b) => s + b.peso, 0)),
    pesoParcial: r2(parciais.reduce((s, b) => s + b.peso, 0)),
    perfisFaltando: perfis(bloqueadas),
    perfisParciais: perfis(parciais),
    faltaComprarTotal,
  };
}

// ============================================================
// FABRICABILIDADE: reparte o material ENTREGUE de cada perfil entre o que a
// PRODUÇÃO ATUAL já consumiu (peças em Solda em diante = "já fabricado") e o
// que ainda pode fabricar. Passos por perfil:
//   1. disponível = entregue − já consumido (peças já fabricadas). Não conta o
//      mesmo aço duas vezes.
//   2. ALOCA o disponível às peças pendentes (Aguardando/Fabricação) por peso.
//      As que cabem CONSEGUEM ser fabricadas; o restante NÃO consegue.
// Trata CHAPARIA (chapas puxam do estoque agregado). `materialLinhas` vem de
// resumoMaterialObra(estoque).linhas (perfil + entregue + falta + status).
// ============================================================
const CHAVE_CHAPARIA = '__CHAPARIA__';
const ehPerfilChapa = (s) => /^\s*CH\d/i.test(String(s || '')); // CH8X130, CH2X1200.7, CH16X340…
const ehLinhaChaparia = (s) => /^\s*chaparia\s*$/i.test(String(s || ''));
// "Já fabricado" = produção atual (passou da fabricação): Solda em diante.
const jaFabricadoEtapa = (et) => et === 'solda' || et === 'pintura' || et === 'expedido' || et === 'enviado' || et === 'entregue';
const pendenteEtapa = (et) => et === 'aguardando' || et === 'fabricacao';

export function fabricabilidadePecas(pecas = [], materialLinhas = []) {
  // Pool de material entregue por perfil (chaparia agregada numa chave única).
  const pool = new Map(); // chave → { disponivel, falta, perfil }
  (materialLinhas || []).forEach((l) => {
    const chaparia = ehLinhaChaparia(l.perfil);
    const chave = chaparia ? CHAVE_CHAPARIA : chavePerfil(l.perfil);
    if (!chave) return;
    const acc = pool.get(chave) || { disponivel: 0, falta: 0, perfil: chaparia ? 'CHAPARIA' : l.perfil };
    acc.disponivel += num(l.entregue); acc.falta += num(l.falta);
    pool.set(chave, acc);
  });
  const chaveDe = (perfil) => (ehPerfilChapa(perfil) && pool.has(CHAVE_CHAPARIA)) ? CHAVE_CHAPARIA : chavePerfil(perfil);

  // Material JÁ CONSUMIDO pela produção atual (Solda em diante) por perfil, e o
  // total "já fabricado" (independe do material — é o que já foi produzido).
  const consumidoPorChave = new Map(); // chave → kg já consumido
  const jaFab = [];
  (pecas || []).forEach((p) => {
    if (!jaFabricadoEtapa(etapaPeca(p))) return;
    const perfil = pick(p, 'perfil') || '';
    const peso = pesoPeca(p);
    consumidoPorChave.set(chaveDe(perfil), num(consumidoPorChave.get(chaveDe(perfil))) + peso);
    jaFab.push({ peso, quantidade: qtdPeca(p) });
  });

  // Agrupa peças PENDENTES por perfil (chapas → bucket CHAPARIA se houver estoque).
  const grupos = new Map(); // chave → pieces[]
  (pecas || []).forEach((p) => {
    if (!pendenteEtapa(etapaPeca(p))) return;
    const perfil = pick(p, 'perfil') || '';
    const item = {
      marca: pick(p, 'marca', 'codigo') || '—', perfil,
      material: pick(p, 'material') || '', tipo: pick(p, 'tipo', 'peca') || '',
      quantidade: qtdPeca(p), peso: pesoPeca(p), etapa: etapaPeca(p),
    };
    const chave = chaveDe(perfil);
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(item);
  });

  const fabricaveis = [], naoFabricaveis = [], semInfo = [];
  const perfisParciais = new Set();
  for (const [chave, pieces] of grupos) {
    const info = pool.get(chave);
    if (!info) { pieces.forEach((pc) => semInfo.push({ ...pc, status: 'sem_info' })); continue; }
    // Entregue MENOS o já consumido pela produção atual = disponível p/ pendentes.
    let disp = Math.max(0, num(info.disponivel) - num(consumidoPorChave.get(chave)));
    const need = pieces.reduce((s, i) => s + i.peso, 0);
    if (disp > 0 && disp < need - 0.01) perfisParciais.add(info.perfil);
    // Aloca por peso ASC (libera o maior nº de peças possível).
    [...pieces].sort((a, b) => a.peso - b.peso).forEach((pc) => {
      if (pc.peso <= disp + 0.01) { disp = Math.max(0, disp - pc.peso); fabricaveis.push({ ...pc, status: 'fabricavel' }); }
      else naoFabricaveis.push({ ...pc, status: 'faltando', faltaComprar: r2(info.falta) });
    });
  }
  const byPeso = (a, b) => b.peso - a.peso;
  [fabricaveis, naoFabricaveis, semInfo].forEach((a) => a.sort(byPeso));
  const sumP = (a) => r2(a.reduce((s, i) => s + i.peso, 0));
  const sumQ = (a) => a.reduce((s, i) => s + i.quantidade, 0);
  const pesoFab = sumP(fabricaveis), pesoNao = sumP(naoFabricaveis), pesoSem = sumP(semInfo);
  const total = pesoFab + pesoNao + pesoSem;
  const pesoJaFab = sumP(jaFab), qtdJaFab = sumQ(jaFab);
  const faltaComprarTotal = r2([...pool.values()].reduce((s, g) => s + num(g.falta), 0));
  return {
    fabricaveis, naoFabricaveis, semInfo,
    perfisParciais: [...perfisParciais].sort(),
    resumo: {
      nFabricaveis: fabricaveis.length, nNaoFabricaveis: naoFabricaveis.length, nSemInfo: semInfo.length,
      nPerfisParciais: perfisParciais.size,
      qtdFabricaveis: sumQ(fabricaveis), qtdNaoFabricaveis: sumQ(naoFabricaveis),
      pesoFabricavel: pesoFab, pesoNaoFabricavel: pesoNao, pesoSemInfo: pesoSem,
      // Produção atual (Solda em diante): material entregue já consumido.
      nJaFabricado: jaFab.length, qtdJaFabricado: qtdJaFab, pesoJaFabricado: pesoJaFab,
      // Total que o material entregue viabiliza: já fabricado + o que ainda dá.
      pesoViavelEntregue: r2(pesoJaFab + pesoFab),
      pesoTotal: r2(total), faltaComprarTotal,
      pctFabricavel: total > 0 ? r2((pesoFab / total) * 100) : 0,
      pctNaoFabricavel: total > 0 ? r2((pesoNao / total) * 100) : 0,
    },
  };
}

// Detalhe: peças agrupadas por etapa (para as tabelas do relatório).
export function pecasPorEtapa(pecas = []) {
  const grupos = ETAPAS_REL.map((e) => ({ ...e, itens: [] }));
  const idx = Object.fromEntries(grupos.map((g, i) => [g.key, i]));
  (pecas || []).forEach((p) => {
    grupos[idx[etapaPeca(p)]].itens.push({
      marca: pick(p, 'marca', 'codigo') || '—',
      perfil: pick(p, 'perfil') || '',
      material: pick(p, 'material') || '',
      tipo: pick(p, 'tipo', 'peca') || '',
      quantidade: qtdPeca(p),
      peso: pesoPeca(p),
      responsavel: pick(p, 'responsavel', 'responsável',
        'funcionarioExpedido', 'funcionario_expedido',
        'funcionarioPintura', 'funcionario_pintura',
        'funcionarioSolda', 'funcionario_solda',
        'funcionarioFabricacao', 'funcionario_fabricacao') || '',
    });
  });
  grupos.forEach((g) => g.itens.sort((a, b) => b.peso - a.peso));
  return grupos.filter((g) => g.itens.length > 0);
}
