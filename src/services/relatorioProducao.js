// ============================================================
// Relatório de Produção — agregações para o card/PDF do Kanban
// ============================================================
// Recebe as PEÇAS (pecas_producao, no formato do contexto ou do banco) e produz
// um relatório completo: resumo geral, por etapa do fluxo, progresso ponderado,
// por funcionário (por etapa) e detalhe por etapa. Puro/testável; tolerante a
// snake_case e camelCase.
// ============================================================

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (n) => Math.round(n * 100) / 100;
const r0 = (n) => Math.round(n);
const pick = (o, ...ks) => { for (const k of ks) if (o && o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k]; return undefined; };

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
// cada etapa registrada. Retorna [{ funcionario, peso, pecas, porEtapa{} }].
export function porFuncionario(pecas = []) {
  const mapa = new Map();
  const add = (nome, etapaKey, peso) => {
    const n = String(nome || '').trim();
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
