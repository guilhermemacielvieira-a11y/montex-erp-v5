// ============================================================
// Corte (etapa anterior à fabricação) + coerência produzido × identificado
// ============================================================
// CORTE é diferente das outras etapas: trabalha MATERIAL (perfis e chapas da
// tabela materiais_corte), não a peça montada. Por isso é medido em kg de
// material cortado (peso_teorico da linha = peso total do lote cortado) e
// NUNCA somado à produção de peças (fabricação/solda/pintura).
//   data   = data_fim (conclusão do corte); sem data_fim → "sem data"
//   pessoa = funcionario_corte; senão o funcionário do apontamento no
//            histórico (producao_historico.peca_id = id do corte)
//
// COERÊNCIA: para cada etapa, quanto do peso que JÁ PASSOU da etapa (estado
// atual) tem um funcionário identificado:
//   apontado      → apontamento datado no histórico com funcionário
//   só responsável→ só o campo funcionario_<etapa> da peça (sem data)
//   sem dono      → ninguém identificado
// ============================================================

import { num, r1, dataLocal, ordemFluxo, pesoPeca, obraDe, ETAPAS_FABRICA } from './biCore';
import { etapaNaoSeAplica } from './biProducao';

const FINAL = new Set(['finalizado', 'cortado', 'concluido']);
const st = (m) => String(m?.status_corte ?? m?.statusCorte ?? '').toLowerCase();

/** Eventos de corte (kg de material) + diagnóstico de cobertura. */
export function eventosCorte(cortes = [], historico = []) {
  // apontamento mais recente de cada corte no histórico
  const porCorte = new Map();
  (historico || []).forEach((h) => {
    const para = String(h.etapa_para ?? h.etapaPara ?? '').toLowerCase();
    if (para !== 'finalizado' && para !== 'cortando') return;
    const id = h.peca_id ?? h.pecaId;
    const d = dataLocal(h.data_inicio ?? h.dataInicio);
    const atual = porCorte.get(id);
    if (!atual || (d && atual.data && d > atual.data) || (!atual.data && d)) {
      porCorte.set(id, { data: d, funcionarioId: h.funcionario_id ?? h.funcionarioId ?? null, funcionario: (h.funcionario_nome ?? h.funcionarioNome ?? '').replace(/\s+/g, ' ').trim() || null, finalizou: para === 'finalizado' });
    }
  });

  const diag = { finalizados: 0, kgFinalizado: 0, semData: 0, kgSemData: 0, semPessoa: 0, kgSemPessoa: 0, emCorte: 0, kgEmCorte: 0, aguardando: 0, kgAguardando: 0, ultimo: null };
  const eventos = [];
  (cortes || []).forEach((m) => {
    const s = st(m);
    const kg = num(m.peso_teorico ?? m.pesoTeorico);
    if (s === 'cortando') { diag.emCorte += 1; diag.kgEmCorte += kg; return; }
    if (!FINAL.has(s)) { diag.aguardando += 1; diag.kgAguardando += kg; return; }
    diag.finalizados += 1; diag.kgFinalizado += kg;
    const h = porCorte.get(m.id);
    const data = dataLocal(m.data_fim ?? m.dataFim) || (h?.finalizou ? h.data : null);
    const funcionarioId = m.funcionario_corte ?? m.funcionarioCorte ?? h?.funcionarioId ?? null;
    if (!data) { diag.semData += 1; diag.kgSemData += kg; }
    if (!funcionarioId && !h?.funcionario) { diag.semPessoa += 1; diag.kgSemPessoa += kg; }
    if (data && (!diag.ultimo || data > diag.ultimo)) diag.ultimo = data;
    eventos.push({
      setor: 'corte', data, kg, qtd: num(m.quantidade), obraId: obraDe(m), pecaId: m.peca_id ?? m.pecaId ?? m.id,
      corteId: m.id, marca: m.marca || m.peca || m.id, tipo: m.peca || null, perfil: m.perfil || '',
      funcionarioId, funcionario: h?.funcionario || null,
    });
  });
  ['kgFinalizado', 'kgSemData', 'kgSemPessoa', 'kgEmCorte', 'kgAguardando'].forEach((k) => { diag[k] = r1(diag[k]); });
  return { eventos: eventos.sort((a, b) => (a.data || 0) - (b.data || 0)), diag };
}

const CAMPO = {
  fabricacao: ['funcionarioFabricacao', 'funcionario_fabricacao'],
  solda: ['funcionarioSolda', 'funcionario_solda'],
  pintura: ['funcionarioPintura', 'funcionario_pintura'],
};
const responsavelDaPeca = (p, etapa) => CAMPO[etapa].map((k) => p?.[k]).find((v) => v != null && String(v).trim() !== '') || null;

/**
 * Coerência produzido × identificado, por etapa (e por obra).
 * @param pecas       peças do escopo (estado atual)
 * @param transicoes  histórico normalizado (biProducao.normalizarHistorico)
 * @param cortes      eventos de corte (eventosCorte().eventos) + diag
 */
export function coerenciaProducao({ pecas = [], transicoes = [], corte = null, naoAplica = null, foraDaRota = null } = {}) {
  // kg creditado (apontado com pessoa) por peça e etapa concluída
  const credito = new Map(); // `${peca}|${etapa}` → kg
  const apontadoSemAvanco = []; // histórico diz que concluiu, mas a peça está antes da etapa

  (transicoes || []).forEach((t) => {
    if (!ETAPAS_FABRICA.includes(t.de) || ordemFluxo(t.para) <= ordemFluxo(t.de) || !(t.kg > 0)) return;
    if (!t.funcionario && !t.funcionarioId) return;
    const k = `${t.pecaId}|${t.de}`;
    credito.set(k, (credito.get(k) || 0) + t.kg);
  });

  const vazio = () => ({ produzido: 0, apontado: 0, soResponsavel: 0, semDono: 0, pecasSemDono: 0, naoAplica: 0 });
  const etapas = Object.fromEntries(ETAPAS_FABRICA.map((e) => [e, vazio()]));
  const porObra = new Map();
  const semDonoItens = [];

  (pecas || []).forEach((p) => {
    const kgP = pesoPeca(p);
    const ordem = ordemFluxo(p.etapa);
    ETAPAS_FABRICA.forEach((e) => {
      const passou = ordem > ordemFluxo(e);
      const cred = credito.get(`${p.id}|${e}`) || 0;
      // Etapa marcada "não se aplica" (ex.: terça sem solda): fora do produzido
      if (passou && (etapaNaoSeAplica(naoAplica, p.id, e) || foraDaRota?.(p, e))) {
        etapas[e].naoAplica += kgP;
        const o = obraDe(p) || '—';
        if (!porObra.has(o)) porObra.set(o, Object.fromEntries(ETAPAS_FABRICA.map((x) => [x, vazio()])));
        porObra.get(o)[e].naoAplica += kgP;
        return;
      }
      if (!passou) {
        if (cred > 0) apontadoSemAvanco.push({ id: p.id, marca: p.marca || p.id, obraId: obraDe(p), etapa: e, etapaAtual: p.etapa, kg: r1(cred), dividida: /__split_/.test(p.id) });
        return;
      }
      const ap = Math.min(cred, kgP);
      const resto = Math.max(0, kgP - ap);
      const resp = responsavelDaPeca(p, e);
      const so = resp ? resto : 0;
      const sem = resp ? 0 : resto;
      const alvo = etapas[e];
      alvo.produzido += kgP; alvo.apontado += ap; alvo.soResponsavel += so; alvo.semDono += sem;
      if (sem > 0.5) { alvo.pecasSemDono += 1; semDonoItens.push({ id: p.id, marca: p.marca || p.id, obraId: obraDe(p), etapa: e, etapaAtual: p.etapa, kg: r1(sem) }); }
      const o = obraDe(p) || '—';
      if (!porObra.has(o)) porObra.set(o, Object.fromEntries(ETAPAS_FABRICA.map((x) => [x, vazio()])));
      const ob = porObra.get(o)[e];
      ob.produzido += kgP; ob.apontado += ap; ob.soResponsavel += so; ob.semDono += sem;
    });
  });

  const fechar = (x) => ({
    produzido: r1(x.produzido), apontado: r1(x.apontado), soResponsavel: r1(x.soResponsavel), semDono: r1(x.semDono), naoAplica: r1(x.naoAplica || 0),
    pecasSemDono: x.pecasSemDono,
    pctApontado: x.produzido > 0 ? r1((x.apontado / x.produzido) * 100) : null,
    pctIdentificado: x.produzido > 0 ? r1(((x.apontado + x.soResponsavel) / x.produzido) * 100) : null,
  });

  const linhas = ETAPAS_FABRICA.map((e) => ({ etapa: e, ...fechar(etapas[e]) }));
  if (corte) {
    const d = corte.diag;
    const comPessoaEData = corte.eventos.filter((ev) => ev.data && (ev.funcionarioId || ev.funcionario)).reduce((s, ev) => s + ev.kg, 0);
    const comPessoa = corte.eventos.filter((ev) => ev.funcionarioId || ev.funcionario).reduce((s, ev) => s + ev.kg, 0);
    linhas.unshift({
      etapa: 'corte',
      ...fechar({ produzido: d.kgFinalizado, apontado: comPessoaEData, soResponsavel: comPessoa - comPessoaEData, semDono: d.kgSemPessoa, pecasSemDono: d.semPessoa }),
      unidade: 'material',
    });
  }

  return {
    linhas,
    porObra: [...porObra.entries()].map(([obraId, e]) => ({ obraId, ...Object.fromEntries(ETAPAS_FABRICA.map((x) => [x, fechar(e[x])])) })),
    semDono: semDonoItens.sort((a, b) => b.kg - a.kg),
    apontadoSemAvanco: apontadoSemAvanco.sort((a, b) => b.kg - a.kg),
  };
}
