// ============================================================
// Produção por Funcionário — motor puro
// ============================================================
// Base: eventos de produção (biAnaliseProducao.eventosProducao) que já vêm do
// histórico NORMALIZADO (sem duplicatas, [QTD:x/y], teto por peça).
// Pessoa = funcionario_id do apontamento (ligado ao cadastro `funcionarios`);
// sem id, cai no nome normalizado. Só setores da fábrica (Fabricação, Solda,
// Pintura) — embarque não é produção individual.
// ============================================================

import { r1, isoLocal, inicioDoDia, somaDias, ETAPAS_FABRICA } from './biCore';
import { diasUteis, variacaoPct } from './biAnaliseProducao';

export const normalizarNome = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s+/g, ' ').trim().toLowerCase();

const NAO_PESSOA = /revers[aã]o|admin|sistema/i;

/** Mapa de pessoas do cadastro por id e por nome normalizado. */
export function indexarCadastro(funcionarios = []) {
  const porId = new Map();
  const porNome = new Map();
  (funcionarios || []).forEach((f) => {
    const p = {
      id: f.id,
      nome: String(f.nome || f.id || '').replace(/\s+/g, ' ').trim(),
      cargo: f.cargo || '',
      setor: f.setor || '',
      equipe: [f.equipeNome, f.equipe_nome].map((x) => String(x || '').trim()).find((x) => x && x !== '-') || '',
      ativo: f.ativo !== false && String(f.status || 'ativo').toLowerCase() !== 'inativo',
    };
    porId.set(f.id, p);
    porNome.set(normalizarNome(f.nome), p);
  });
  return { porId, porNome };
}

/** Chave da pessoa de um evento (id do cadastro, senão nome normalizado). */
export function pessoaDoEvento(e, cad) {
  if (e.funcionarioId && cad.porId.has(e.funcionarioId)) return cad.porId.get(e.funcionarioId);
  const nome = String(e.funcionario || '').trim();
  if (!nome || NAO_PESSOA.test(nome)) return null;
  const k = normalizarNome(nome);
  return cad.porNome.get(k) || { id: `nome:${k}`, nome, cargo: '', setor: '', equipe: '', ativo: true, foraDoCadastro: true };
}

const doFabrica = (e) => ETAPAS_FABRICA.includes(e.setor);

const novoAcumulador = (p) => ({
  ...p, fabricacao: 0, solda: 0, pintura: 0, total: 0, unidades: 0, corte: 0, cortes: 0,
  pecas: new Set(), dias: new Set(), diasCorte: new Set(), obras: new Set(), ultimo: null,
});

function acumular(eventos, cad, ini, fim) {
  const mapa = new Map();
  eventos.forEach((e) => {
    const corte = e.setor === 'corte';
    if ((!doFabrica(e) && !corte) || !e.data || e.data < ini || e.data > fim) return;
    const p = pessoaDoEvento(e, cad);
    if (!p) return;
    if (!mapa.has(p.id)) mapa.set(p.id, novoAcumulador(p));
    const m = mapa.get(p.id);
    if (corte) {
      // Corte = kg de MATERIAL cortado: coluna própria, fora do total de peças
      m.corte += e.kg; m.cortes += 1; m.diasCorte.add(isoLocal(e.data));
      if (!m.ultimo || e.data > m.ultimo) m.ultimo = e.data;
      return;
    }
    m[e.setor] += e.kg; m.total += e.kg; m.unidades += e.qtd || 0;
    if (e.pecaId) m.pecas.add(e.pecaId);
    if (e.obraId) m.obras.add(e.obraId);
    m.dias.add(isoLocal(e.data));
    if (!m.ultimo || e.data > m.ultimo) m.ultimo = e.data;
  });
  return mapa;
}

/**
 * Ranking/resumo por pessoa no período, com comparação ao período anterior.
 * Inclui as pessoas ATIVAS do cadastro sem apontamento (aparecem zeradas).
 */
export function resumoPessoas(eventos = [], funcionarios = [], { ini, fim, iniAnt, fimAnt, hoje = new Date(), incluirSemProducao = true } = {}) {
  const cad = indexarCadastro(funcionarios);
  const atual = acumular(eventos, cad, ini, fim);
  const ant = iniAnt && fimAnt ? acumular(eventos, cad, iniAnt, fimAnt) : new Map();
  const uteis = diasUteis(ini, fim, hoje);
  if (incluirSemProducao) {
    cad.porId.forEach((p) => {
      if (p.ativo && !atual.has(p.id)) {
        atual.set(p.id, novoAcumulador(p));
      }
    });
  }
  const totalGeral = [...atual.values()].reduce((s, m) => s + m.total, 0);
  return [...atual.values()].map((m) => {
    const principal = ETAPAS_FABRICA.reduce((a, s) => (m[s] > m[a] ? s : a), 'fabricacao');
    const anterior = ant.get(m.id)?.total || 0;
    return {
      id: m.id, nome: m.nome, cargo: m.cargo, setor: m.setor, equipe: m.equipe, ativo: m.ativo,
      foraDoCadastro: !!m.foraDoCadastro,
      fabricacao: r1(m.fabricacao), solda: r1(m.solda), pintura: r1(m.pintura), total: r1(m.total),
      corte: r1(m.corte), cortes: m.cortes, diasCorte: m.diasCorte.size,
      unidades: r1(m.unidades), pecas: m.pecas.size, obras: m.obras.size,
      diasTrabalhados: m.dias.size,
      kgDia: m.dias.size ? r1(m.total / m.dias.size) : 0,
      kgPeca: m.pecas.size ? r1(m.total / m.pecas.size) : 0,
      presencaPct: uteis > 0 ? r1(Math.min(100, (new Set([...m.dias, ...m.diasCorte]).size / uteis) * 100)) : 0,
      participacaoPct: totalGeral > 0 ? r1((m.total / totalGeral) * 100) : 0,
      anterior: r1(anterior),
      variacaoPct: variacaoPct(m.total, anterior),
      setorPrincipal: m.total > 0 ? principal : (m.corte > 0 ? 'corte' : null),
      ultimo: m.ultimo,
    };
  }).sort((a, b) => b.total - a.total || b.corte - a.corte || a.nome.localeCompare(b.nome));
}

/** Totais por equipe (do cadastro) a partir do resumo por pessoa. */
export function resumoEquipes(pessoas = []) {
  const mapa = new Map();
  pessoas.forEach((p) => {
    const k = p.equipe || 'Sem equipe';
    if (!mapa.has(k)) mapa.set(k, { equipe: k, pessoas: 0, ativos: 0, fabricacao: 0, solda: 0, pintura: 0, total: 0, corte: 0, diasPessoa: 0 });
    const m = mapa.get(k);
    m.pessoas += 1;
    if (p.total > 0 || p.corte > 0) m.ativos += 1;
    m.fabricacao += p.fabricacao; m.solda += p.solda; m.pintura += p.pintura; m.total += p.total; m.corte += p.corte || 0;
    m.diasPessoa += p.diasTrabalhados;
  });
  return [...mapa.values()].map((m) => ({
    ...m, fabricacao: r1(m.fabricacao), solda: r1(m.solda), pintura: r1(m.pintura), total: r1(m.total), corte: r1(m.corte),
    kgPessoaDia: m.diasPessoa ? r1(m.total / m.diasPessoa) : 0,
  })).sort((a, b) => b.total - a.total);
}

/** Mapa de calor pessoa × dia (kg) — para gestão diária. */
export function mapaCalor(eventos = [], funcionarios = [], { ini, fim } = {}) {
  const cad = indexarCadastro(funcionarios);
  const dias = [];
  for (let d = inicioDoDia(ini); d <= fim && dias.length < 62; d = somaDias(d, 1)) dias.push(isoLocal(d));
  const linhas = new Map();
  eventos.forEach((e) => {
    if (!doFabrica(e) || e.data < ini || e.data > fim) return;
    const p = pessoaDoEvento(e, cad);
    if (!p) return;
    if (!linhas.has(p.id)) linhas.set(p.id, { id: p.id, nome: p.nome, total: 0, dias: {} });
    const l = linhas.get(p.id);
    const k = isoLocal(e.data);
    l.dias[k] = (l.dias[k] || 0) + e.kg;
    l.total += e.kg;
  });
  const lista = [...linhas.values()].sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...lista.flatMap((l) => Object.values(l.dias)));
  return { dias, linhas: lista.map((l) => ({ ...l, total: r1(l.total) })), max };
}

/** Eventos de UMA pessoa (para o painel de detalhe). */
export function eventosDaPessoa(eventos = [], funcionarios = [], pessoaId) {
  const cad = indexarCadastro(funcionarios);
  return eventos.filter((e) => (doFabrica(e) || (e.setor === 'corte' && e.data)) && pessoaDoEvento(e, cad)?.id === pessoaId);
}

/**
 * Qualidade do cadastro × apontamentos:
 * nomes com espaços sobrando, possíveis duplicados, apontamentos sem pessoa
 * identificável, pessoas fora do cadastro e ativos sem apontamento recente.
 */
export function qualidadeCadastro(funcionarios = [], eventos = [], { hoje = new Date(), dias = 30 } = {}) {
  const cad = indexarCadastro(funcionarios);
  const espacos = (funcionarios || []).filter((f) => f.nome && f.nome !== f.nome.replace(/\s+/g, ' ').trim()).map((f) => f.nome);
  const nomes = [...cad.porId.values()];
  const duplicados = [];
  for (let i = 0; i < nomes.length; i += 1) {
    for (let j = i + 1; j < nomes.length; j += 1) {
      const a = normalizarNome(nomes[i].nome); const b = normalizarNome(nomes[j].nome);
      if (a && b && a !== b && (a.startsWith(`${b} `) || b.startsWith(`${a} `))) duplicados.push([nomes[i].nome, nomes[j].nome]);
    }
  }
  const fab = eventos.filter(doFabrica);
  let semPessoa = 0;
  const fora = new Set();
  fab.forEach((e) => {
    const p = pessoaDoEvento(e, cad);
    if (!p) semPessoa += 1;
    else if (p.foraDoCadastro) fora.add(p.nome);
  });
  const ini = somaDias(inicioDoDia(hoje), -(dias - 1));
  const comApont = new Set(fab.filter((e) => e.data >= ini).map((e) => pessoaDoEvento(e, cad)?.id).filter(Boolean));
  const ativosSemApont = nomes.filter((p) => p.ativo && !comApont.has(p.id)).map((p) => ({ nome: p.nome, cargo: p.cargo, equipe: p.equipe }));
  return { espacos, duplicados, semPessoa, foraDoCadastro: [...fora], ativosSemApont, totalEventos: fab.length };
}
