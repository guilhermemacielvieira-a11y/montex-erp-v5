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

// Consolida as etapas em ESTADOS de produção (leitura executiva): Não iniciado
// (Aguardando) · Em fabricação · Já fabricado (Solda em diante), mais os recortes
// Solda/Pintura, Expedido, Em obra (Enviado) e Entregue. Base = peso das peças.
export function estadoProducao(pecas = []) {
  const r = resumoProducao(pecas);
  const byKey = Object.fromEntries(r.porEtapa.map((e) => [e.key, e]));
  const somar = (keys) => keys.reduce((a, k) => {
    const e = byKey[k] || { pecas: 0, qtd: 0, peso: 0 };
    a.pecas += e.pecas; a.qtd += e.qtd; a.peso = r2(a.peso + e.peso); return a;
  }, { pecas: 0, qtd: 0, peso: 0 });
  const total = r.totalPeso || 0;
  const comPct = (o) => ({ ...o, peso: r2(o.peso), pct: total > 0 ? r2((o.peso / total) * 100) : 0 });
  const naoIniciado = comPct(somar(['aguardando']));
  const emFabricacao = comPct(somar(['fabricacao']));
  const acabamento = comPct(somar(['solda', 'pintura']));
  const expedido = comPct(somar(['expedido']));
  const emObra = comPct(somar(['enviado']));
  const entregue = comPct(somar(['entregue']));
  const jaFabricado = comPct(somar(['solda', 'pintura', 'expedido', 'enviado', 'entregue']));
  const emProcesso = comPct(somar(['fabricacao', 'solda', 'pintura']));
  // Estados macro para gráfico/donut (somam o total).
  const estados = [
    { key: 'nao_iniciado', label: 'Não iniciado', cor: '#64748b', ...naoIniciado },
    { key: 'em_fabricacao', label: 'Em fabricação', cor: '#3b82f6', ...emFabricacao },
    { key: 'acabamento', label: 'Solda/Pintura', cor: '#8b5cf6', ...acabamento },
    { key: 'expedido', label: 'Fila de embarque', cor: '#f97316', ...expedido },
    { key: 'em_obra', label: 'Em obra', cor: '#eab308', ...emObra },
    { key: 'entregue', label: 'Entregue', cor: '#22c55e', ...entregue },
  ];
  return {
    totalPeso: r2(total), totalPecas: r.totalPecas, totalQtd: r.totalQtd,
    naoIniciado, emFabricacao, acabamento, expedido, emObra, entregue,
    jaFabricado, emProcesso, estados,
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
// que ainda pode fabricar.
//
// PESO DA PEÇA ≠ PESO DO PERFIL. Uma tesoura "UE200X75X25X3.04" de 530 kg tem
// ~250 kg desse perfil (banzos) e o resto em diagonais, chapas e ligações de
// OUTROS perfis. Comparar o peso da peça inteira com o kg entregue de UM
// perfil superestimava o consumo e a demanda (W200X19.3 aparecia com 10 t
// "não consegue" com o material 100% entregue). O BOM (materiais_corte →
// `necessario` da linha de material) diz quanto do perfil a obra inteira
// usa; a fração FATOR = necessário ÷ Σ peso das peças do perfil converte o
// peso de cada peça em kg de perfil. Assim: Σ demanda = necessário, e a
// leitura fecha com "falta comprar" (falta de perfil ⇔ peças que não dá).
//
// Passos por perfil:
//   1. fator = min(1, necessário / Σ peso de TODAS as peças do perfil)
//      (sem BOM → 1, comportamento antigo).
//   2. disponível = entregue BRUTO (material fisicamente no estoque) −
//      já consumido (peças Solda+ × fator).
//   3. ALOCA o disponível às peças pendentes (Aguardando/Fabricação) POR
//      UNIDADE, da mais leve p/ a mais pesada (libera o maior nº de peças).
//      Um lote (marca com qtd > 1) pode ficar PARCIAL: parte consegue, parte
//      não — não é mais tudo-ou-nada.
// Trata CHAPARIA (chapas puxam do estoque agregado). `materialLinhas` vem de
// resumoMaterialObra(estoque).linhas (perfil + necessario + entregue +
// entregueBruto + falta + status).
// ============================================================
const CHAVE_CHAPARIA = '__CHAPARIA__';
const ehPerfilChapa = (s) => /^\s*CH\d/i.test(String(s || '')); // CH8X130, CH2X1200.7, CH16X340…
const ehLinhaChaparia = (s) => /^\s*chaparia\s*$/i.test(String(s || ''));
// "Já fabricado" = produção atual (passou da fabricação): Solda em diante.
const jaFabricadoEtapa = (et) => et === 'solda' || et === 'pintura' || et === 'expedido' || et === 'enviado' || et === 'entregue';
const pendenteEtapa = (et) => et === 'aguardando' || et === 'fabricacao';
const EPS = 0.01;

export function fabricabilidadePecas(pecas = [], materialLinhas = []) {
  // Pool de material por perfil (chaparia agregada numa chave única).
  // `bruto` = entregue fisicamente (sem o teto do necessário: o que está no
  // pátio pode ser fabricado); `necessario` = BOM/pedido do perfil.
  const pool = new Map(); // chave → { bruto, necessario, falta, perfil }
  (materialLinhas || []).forEach((l) => {
    const chaparia = ehLinhaChaparia(l.perfil);
    const chave = chaparia ? CHAVE_CHAPARIA : chavePerfil(l.perfil);
    if (!chave) return;
    const acc = pool.get(chave) || { bruto: 0, necessario: 0, falta: 0, perfil: chaparia ? 'CHAPARIA' : l.perfil };
    const bruto = l.entregueBruto !== undefined && l.entregueBruto !== null ? num(l.entregueBruto) : num(l.entregue);
    acc.bruto += bruto; acc.necessario += num(l.necessario); acc.falta += num(l.falta);
    pool.set(chave, acc);
  });
  const chaveDe = (perfil) => (ehPerfilChapa(perfil) && pool.has(CHAVE_CHAPARIA)) ? CHAVE_CHAPARIA : chavePerfil(perfil);

  // Peso total das peças por perfil (todas as etapas) → base do FATOR.
  const pesoPecasPorChave = new Map();
  (pecas || []).forEach((p) => {
    const k = chaveDe(pick(p, 'perfil') || '');
    pesoPecasPorChave.set(k, num(pesoPecasPorChave.get(k)) + pesoPeca(p));
  });
  const fatorDe = (chave) => {
    const info = pool.get(chave);
    const soma = num(pesoPecasPorChave.get(chave));
    if (!info || info.necessario <= 0 || soma <= 0) return 1;
    return Math.min(1, info.necessario / soma);
  };

  // Material JÁ CONSUMIDO pela produção atual (Solda em diante) por perfil, em
  // kg de PERFIL (peso × fator), e o total "já fabricado" (peso de peça).
  const consumidoPorChave = new Map();
  const jaFab = [];
  (pecas || []).forEach((p) => {
    if (!jaFabricadoEtapa(etapaPeca(p))) return;
    const chave = chaveDe(pick(p, 'perfil') || '');
    const peso = pesoPeca(p);
    consumidoPorChave.set(chave, num(consumidoPorChave.get(chave)) + peso * fatorDe(chave));
    jaFab.push({ peso, quantidade: qtdPeca(p) });
  });

  // Agrupa peças PENDENTES por perfil (chapas → bucket CHAPARIA se houver estoque).
  const grupos = new Map(); // chave → pieces[]
  (pecas || []).forEach((p) => {
    if (!pendenteEtapa(etapaPeca(p))) return;
    const perfil = pick(p, 'perfil') || '';
    const q = qtdPeca(p) || 1;
    const peso = pesoPeca(p);
    const item = {
      marca: pick(p, 'marca', 'codigo') || '—', perfil,
      material: pick(p, 'material') || '', tipo: pick(p, 'tipo', 'peca') || '',
      quantidade: q, peso, pesoUnit: q > 0 ? peso / q : peso, etapa: etapaPeca(p),
    };
    const chave = chaveDe(perfil);
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(item);
  });

  const fabricaveis = [], naoFabricaveis = [], semInfo = [];
  const perfisParciais = new Set();
  const porPerfil = []; // leitura por perfil: necessário × entregue × consumido × demanda × falta
  for (const [chave, pieces] of grupos) {
    const info = pool.get(chave);
    if (!info) { pieces.forEach((pc) => semInfo.push({ ...pc, status: 'sem_info' })); continue; }
    const fator = fatorDe(chave);
    const consumido = num(consumidoPorChave.get(chave));
    // Entregue (bruto) MENOS o já consumido pela produção atual = disponível p/ pendentes.
    const disponivelIni = Math.max(0, info.bruto - consumido);
    let disp = disponivelIni;
    const demanda = pieces.reduce((s, i) => s + i.peso * fator, 0);
    if (disp > 0 && disp < demanda - EPS) perfisParciais.add(info.perfil);
    let pesoOk = 0, pesoNao = 0, qtdNao = 0;
    // Aloca por UNIDADE, da mais leve p/ a mais pesada (libera o maior nº de peças).
    [...pieces].sort((a, b) => a.pesoUnit - b.pesoUnit).forEach((pc) => {
      const unitPerfil = pc.pesoUnit * fator; // kg de perfil por unidade
      const cabem = unitPerfil <= 0 ? pc.quantidade : Math.min(pc.quantidade, Math.floor((disp + EPS) / unitPerfil));
      const naoCabem = pc.quantidade - cabem;
      if (cabem > 0) {
        const peso = r2(pc.pesoUnit * cabem);
        disp = Math.max(0, disp - cabem * unitPerfil);
        pesoOk += peso;
        fabricaveis.push({ ...pc, quantidade: cabem, peso, status: 'fabricavel', parcial: naoCabem > 0, quantidadeLote: pc.quantidade });
      }
      if (naoCabem > 0) {
        const peso = r2(pc.pesoUnit * naoCabem);
        pesoNao += peso; qtdNao += naoCabem;
        naoFabricaveis.push({
          ...pc, quantidade: naoCabem, peso, status: 'faltando', parcial: cabem > 0, quantidadeLote: pc.quantidade,
          faltaComprar: r2(info.falta),
          // kg de PERFIL que faltam p/ estas unidades (≈ o que comprar p/ liberá-las)
          faltaPerfil: r2(naoCabem * unitPerfil),
        });
      }
    });
    porPerfil.push({
      perfil: info.perfil, chave,
      necessario: r2(info.necessario), entregue: r2(info.bruto), consumido: r2(consumido),
      disponivel: r2(disponivelIni), demanda: r2(demanda), fator: Math.round(fator * 1000) / 1000,
      faltaComprar: r2(info.falta),
      pesoFabricavel: r2(pesoOk), pesoNaoFabricavel: r2(pesoNao), qtdNaoFabricavel: qtdNao,
      // 'faltando' só quando NÃO há material nenhum p/ as pendentes; com algum
      // disponível (mesmo que nenhuma unidade caiba) é 'parcial'.
      status: pesoNao <= 0 ? 'ok' : (pesoOk > 0 || disponivelIni > 0) ? 'parcial' : 'faltando',
    });
  }
  porPerfil.sort((a, b) => b.pesoNaoFabricavel - a.pesoNaoFabricavel || b.demanda - a.demanda);
  const byPeso = (a, b) => b.peso - a.peso;
  [fabricaveis, naoFabricaveis, semInfo].forEach((a) => a.sort(byPeso));
  const sumP = (a) => r2(a.reduce((s, i) => s + i.peso, 0));
  const sumQ = (a) => a.reduce((s, i) => s + i.quantidade, 0);
  const pesoFab = sumP(fabricaveis), pesoNao = sumP(naoFabricaveis), pesoSem = sumP(semInfo);
  const total = pesoFab + pesoNao + pesoSem;
  const pesoJaFab = sumP(jaFab), qtdJaFab = sumQ(jaFab);
  // "Falta comprar" = falta dos perfis COM peças pendentes (mesma base do
  // bloqueioFabricacao/card). O total de todos os perfis fica à parte.
  const faltaComprarTotal = r2(porPerfil.reduce((s, g) => s + g.faltaComprar, 0));
  const faltaComprarTodosPerfis = r2([...pool.values()].reduce((s, g) => s + num(g.falta), 0));
  const faltaPerfilNao = r2(naoFabricaveis.reduce((s, i) => s + num(i.faltaPerfil), 0));
  return {
    fabricaveis, naoFabricaveis, semInfo, porPerfil,
    perfisParciais: [...perfisParciais].sort(),
    resumo: {
      nFabricaveis: fabricaveis.length, nNaoFabricaveis: naoFabricaveis.length, nSemInfo: semInfo.length,
      nPerfisParciais: perfisParciais.size,
      nPerfisNaoFabricaveis: porPerfil.filter((g) => g.pesoNaoFabricavel > 0).length,
      qtdFabricaveis: sumQ(fabricaveis), qtdNaoFabricaveis: sumQ(naoFabricaveis),
      pesoFabricavel: pesoFab, pesoNaoFabricavel: pesoNao, pesoSemInfo: pesoSem,
      // Produção atual (Solda em diante): material entregue já consumido.
      nJaFabricado: jaFab.length, qtdJaFabricado: qtdJaFab, pesoJaFabricado: pesoJaFab,
      // Total que o material entregue viabiliza: já fabricado + o que ainda dá.
      pesoViavelEntregue: r2(pesoJaFab + pesoFab),
      pesoTotal: r2(total), faltaComprarTotal, faltaComprarTodosPerfis,
      // kg de PERFIL que faltam para as peças "não consegue" (explica o número).
      faltaPerfilNaoFabricavel: faltaPerfilNao,
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
