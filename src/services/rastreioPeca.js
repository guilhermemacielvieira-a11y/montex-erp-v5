// ============================================================
// Rastreio de peça (marca) — motor puro (testado)
// ============================================================
// Junta TUDO que o sistema sabe de uma marca (ex.: TS55A) para mostrar o
// fluxo completo: corte das posições → fabricação → solda → pintura →
// expedição (romaneio/carregamento) → entrega → montagem.
//
// Fontes: pecas_producao (peça e peças divididas __split_*),
// producao_historico (apontamentos), materiais_corte (+ composicao_marcas),
// expedicoes (romaneios), entity_store montagem_concluidas_global.
//
// O histórico tem ruído (ver CLAUDE.md 1e): duplicatas exatas e o mesmo
// movimento gravado na peça-mãe ([QTD:1/3]) e na peça dividida ([QTD:1/1]).
// Para a linha do tempo, eventos iguais (mesma peça-base, movimento, dia e
// funcionário) viram UM evento — com a maior quantidade informada.
// ============================================================
import { dataLocal, etapaCanonica, ordemFluxo, num } from './bi/biCore';
import { qtdMovida, pecaBase } from './bi/biProducao';
import { itensDoRomaneio, normalizarStatusRomaneio } from './romaneio';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();
const RE_NA = /\[NA\]/i;
const diaKey = (d) => (d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : '');
const CORTE_FINAL = new Set(['finalizado', 'cortado', 'concluido']);

export const ETAPAS_RASTREIO = [
  { key: 'corte', rotulo: 'Corte' },
  { key: 'fabricacao', rotulo: 'Fabricação' },
  { key: 'solda', rotulo: 'Solda' },
  { key: 'pintura', rotulo: 'Pintura' },
  { key: 'carregamento', rotulo: 'Carregamento' },
  { key: 'entrega', rotulo: 'Entrega' },
  { key: 'montagem', rotulo: 'Montagem' },
];

const ROTULO_ETAPA = { aguardando: 'Aguardando', fabricacao: 'Fabricação', solda: 'Solda', pintura: 'Pintura', expedido: 'Expedido (fila de embarque)', enviado: 'Enviado (em obra)', entregue: 'Entregue' };
export const rotuloEtapa = (e) => ROTULO_ETAPA[etapaCanonica(e)] || e || '—';

const faixaCorte = (corte) => {
  const ds = corte.map((c) => c.dataFim).filter(Boolean).sort((a, b) => a - b);
  return ds.length ? { inicio: ds[0], fim: ds[ds.length - 1] } : null;
};

/** Sugestões de marca para o campo de busca (prefixo primeiro). */
export function sugerirMarcas(pecas = [], termo = '', limite = 8) {
  const t = norm(termo);
  if (!t) return [];
  const por = new Map();
  for (const p of pecas) {
    const m = norm(p.marca);
    if (!m || !m.includes(t)) continue;
    const g = por.get(m) || { marca: p.marca, chave: m, qtd: 0, obras: new Set(), tipo: p.tipo || '' };
    g.qtd += Math.max(1, num(p.quantidade) || 1);
    g.obras.add(p.obra_id ?? p.obraId);
    por.set(m, g);
  }
  return [...por.values()]
    .sort((a, b) => (b.chave.startsWith(t) - a.chave.startsWith(t)) || a.chave.length - b.chave.length || a.chave.localeCompare(b.chave, 'pt-BR', { numeric: true }))
    .slice(0, limite)
    .map((g) => ({ marca: g.marca, qtd: g.qtd, obras: g.obras.size, tipo: g.tipo }));
}

const campo = (o, ...ks) => { for (const k of ks) if (o?.[k] != null && o[k] !== '') return o[k]; return null; };

/** Eventos de produção deduplicados (peça-base + movimento + dia + funcionário). */
function eventosProducao(historico, idsMarca, nomeFunc) {
  const grupos = new Map();
  for (const h of historico) {
    const pecaId = campo(h, 'peca_id', 'pecaId');
    if (!idsMarca.has(pecaId)) continue;
    const data = dataLocal(campo(h, 'data_inicio', 'dataInicio', 'created_at', 'createdAt'));
    if (!data) continue;
    const de = etapaCanonica(campo(h, 'etapa_de', 'etapaDe'));
    const para = etapaCanonica(campo(h, 'etapa_para', 'etapaPara'));
    const obs = String(campo(h, 'observacoes', 'observacao') || '');
    const funcId = campo(h, 'funcionario_id', 'funcionarioId');
    const funcionario = String(campo(h, 'funcionario_nome', 'funcionarioNome') || '').replace(/\s+/g, ' ').trim() || nomeFunc(funcId) || null;
    const na = RE_NA.test(obs);
    const k = `${pecaBase(pecaId)}|${de}|${para}|${diaKey(data)}|${funcId || funcionario || ''}|${na}`;
    const qtd = qtdMovida(obs);
    // Quando foi REGISTRADO (o último registro de uma peça é o que vale para
    // a unidade que ficou nela depois de divisões)
    const registro = Date.parse(campo(h, 'created_at', 'createdAt') || '') || 0;
    const g = grupos.get(k);
    if (g) {
      g.pecaIds.add(pecaId);
      g.qtd = Math.max(g.qtd ?? 0, qtd ?? 0) || g.qtd;
      g.registros += 1;
      g.registradoPor.set(pecaId, Math.max(g.registradoPor.get(pecaId) || 0, registro));
    } else {
      grupos.set(k, { data, de, para, funcionario, funcionarioId: funcId, qtd, naoAplica: na, pecaIds: new Set([pecaId]), registros: 1, registradoPor: new Map([[pecaId, registro]]) });
    }
  }
  return [...grupos.values()];
}

function descreverMovimento(e) {
  if (e.naoAplica) return { tipo: e.de, titulo: `${rotuloEtapa(e.de)}: não se aplica` };
  const avancou = ordemFluxo(e.para) > ordemFluxo(e.de);
  if (!avancou) return { tipo: 'retorno', titulo: `Retorno de ${rotuloEtapa(e.de)} para ${rotuloEtapa(e.para)}` };
  if (e.de === 'aguardando') return { tipo: 'fabricacao', titulo: `Entrou em ${rotuloEtapa(e.para)}` };
  if (e.de === 'fabricacao') return { tipo: 'fabricacao', titulo: 'Fabricação concluída' };
  if (e.de === 'solda') return { tipo: 'solda', titulo: 'Solda concluída' };
  if (e.de === 'pintura') return { tipo: 'pintura', titulo: 'Pintura concluída — peça pronta' };
  return { tipo: e.de, titulo: `${rotuloEtapa(e.de)} → ${rotuloEtapa(e.para)}` };
}

/**
 * Rastreio completo de uma marca, separado por obra.
 * @returns {Array<object>} um bloco por obra (ordem: obra com mais unidades)
 */
export function rastrearMarca({
  marca, pecas = [], historico = [], cortes = [], composicao = [], expedicoes = [],
  montagem = {}, funcionarios = [], obras = [], obraIds = null,
} = {}) {
  const alvo = norm(marca);
  if (!alvo) return [];
  const nomes = new Map((funcionarios || []).map((f) => [f.id, f.nome || f.name || f.id]));
  const nomeFunc = (id) => (id ? nomes.get(id) || null : null);
  const nomeObra = new Map((obras || []).map((o) => [o.id, o.nome || o.codigo || o.id]));

  const daMarca = pecas.filter((p) => norm(p.marca) === alvo && (!obraIds || obraIds.includes(p.obra_id ?? p.obraId)));
  const porObra = new Map();
  for (const p of daMarca) {
    const ob = p.obra_id ?? p.obraId;
    if (!porObra.has(ob)) porObra.set(ob, []);
    porObra.get(ob).push(p);
  }

  const blocos = [];
  for (const [obraId, lista] of porObra) {
    const ids = new Set(lista.map((p) => p.id));
    const bases = new Set(lista.map((p) => pecaBase(p.id)));

    // ---- Corte das posições
    const posComp = new Set(composicao.filter((c) => (c.obra_id ?? c.obraId) === obraId && norm(c.marca) === alvo).map((c) => norm(c.pos)));
    const cortesMarca = cortes.filter((c) => (c.obra_id ?? c.obraId) === obraId
      && (norm(c.marca) === alvo || posComp.has(norm(c.marca)) || (c.peca_id && bases.has(pecaBase(c.peca_id)))));
    const corte = cortesMarca.map((c) => {
      const st = String(campo(c, 'status_corte', 'status') || '').toLowerCase();
      const final = CORTE_FINAL.has(st);
      return {
        id: c.id, pos: c.marca, perfil: c.perfil || '', qtd: num(c.quantidade) || 1, kg: num(c.peso_teorico ?? c.peso),
        status: final ? 'cortado' : st === 'cortando' ? 'cortando' : 'aguardando',
        dataFim: final ? dataLocal(campo(c, 'data_fim', 'dataFim')) : null,
        dataInicio: dataLocal(campo(c, 'data_inicio', 'dataInicio')),
        funcionario: nomeFunc(campo(c, 'funcionario_corte', 'funcionarioCorte')) || campo(c, 'funcionario_corte', 'funcionarioCorte'),
        historico: final && campo(c, 'baixa_estoque_kg') == null && !campo(c, 'data_fim', 'dataFim'),
      };
    });

    // ---- Produção (histórico)
    const movs = eventosProducao(historico, ids, nomeFunc);
    // Dono de cada movimento (unidade): se o mesmo registro aparece numa peça
    // DIVIDIDA, é dela (a mãe gravou [QTD:1/N] antes de dividir); senão, da
    // peça onde foi gravado.
    for (const m of movs) {
      const todos = [...m.pecaIds];
      const divididas = todos.filter((x) => x !== pecaBase(x));
      m.donos = divididas.length ? divididas : todos;
    }

    // ---- Expedição (romaneios ativos que contêm a peça)
    const cargas = [];
    for (const exp of expedicoes || []) {
      if (!exp || exp.deleted_at || exp.deletedAt) continue;
      for (const it of itensDoRomaneio(exp)) {
        const id = String(it.id);
        const casa = ids.has(id) || (!pecas.some((p) => p.id === id) && norm(it.marca) === alvo && (exp.obra_id ?? exp.obraId) === obraId);
        if (!casa) continue;
        cargas.push({
          pecaId: id, romaneioId: exp.id,
          numero: campo(exp, 'numero_romaneio', 'numeroRomaneio') || exp.id,
          status: normalizarStatusRomaneio(exp.status),
          qtd: num(it.qtd_enviada ?? it.qtdEnviada) || num(it.qtd_total ?? it.qtdTotal) || null,
          dataExpedicao: dataLocal(campo(exp, 'data_expedicao', 'dataExpedicao')),
          dataSaida: dataLocal(campo(exp, 'data_saida', 'dataSaida')),
          dataEntrega: dataLocal(campo(exp, 'data_entrega', 'dataEntrega')),
          motorista: exp.motorista || null, transportadora: exp.transportadora || null, placa: exp.placa || null,
        });
      }
    }

    // ---- Unidades (peça + divididas)
    const unidades = lista
      .slice()
      .sort((a, b) => (a.id === pecaBase(a.id) ? -1 : 0) - (b.id === pecaBase(b.id) ? -1 : 0) || String(a.id).localeCompare(String(b.id)))
      .map((p) => {
        const etapas = {};
        for (const e of ['fabricacao', 'solda', 'pintura']) {
          const ev = movs
            .filter((m) => m.donos.includes(p.id) && m.de === e && !m.naoAplica && ordemFluxo(m.para) > ordemFluxo(m.de))
            // peça-mãe acumula registros de unidades que foram divididas depois:
            // vale o último REGISTRADO nesta peça (desempate: data do apontamento)
            .sort((a, b) => (b.registradoPor.get(p.id) || 0) - (a.registradoPor.get(p.id) || 0) || b.data - a.data)[0];
          const na = movs.some((m) => m.naoAplica && m.de === e && (m.pecaIds.has(p.id) || [...m.pecaIds].some((x) => pecaBase(x) === pecaBase(p.id))));
          const funcCampo = nomeFunc(p[`funcionario_${e}`]) || p[`funcionario_${e}`] || null;
          etapas[e] = na ? { naoAplica: true }
            : ev ? { data: ev.data, funcionario: ev.funcionario || funcCampo, fonte: 'apontamento' }
              : (ordemFluxo(p.etapa) > ordemFluxo(e) ? { data: dataLocal(p[`data_inicio_${e}`]), funcionario: funcCampo, fonte: 'cadastro' } : null);
        }
        const carga = cargas.filter((c) => c.pecaId === p.id).sort((a, b) => (b.dataSaida || 0) - (a.dataSaida || 0))[0] || null;
        const mont = montagem?.[p.id];
        const montado = mont && !mont.removidoEm ? { data: dataLocal(mont.montadoEm), texto: mont.dataMontagem || null, origem: mont.origem || null } : null;
        return {
          pecaId: p.id, dividida: p.id !== pecaBase(p.id), qtd: Math.max(1, num(p.quantidade) || 1),
          kg: num(p.peso_total ?? p.pesoTotal), etapa: etapaCanonica(p.etapa), etapaRotulo: rotuloEtapa(p.etapa),
          etapas, carga, montado, pronta: p.data_fim_real ? dataLocal(p.data_fim_real) : null,
        };
      });

    // ---- Linha do tempo
    const eventos = [];
    // pecaIds = unidades a que o evento pertence (null = da marca: corte das posições)
    for (const c of corte) {
      if (c.status === 'cortado' && c.dataFim) eventos.push({ data: c.dataFim, tipo: 'corte', titulo: `Corte da posição ${c.pos}`, detalhe: `${c.perfil}${c.qtd ? ` · ${c.qtd} un` : ''}`, funcionario: c.funcionario, pecaIds: null });
      else if (c.status === 'cortando' && c.dataInicio) eventos.push({ data: c.dataInicio, tipo: 'corte', titulo: `Corte iniciado — posição ${c.pos}`, detalhe: c.perfil, funcionario: c.funcionario, pecaIds: null });
    }
    for (const m of movs) {
      const d = descreverMovimento(m);
      eventos.push({ data: m.data, tipo: d.tipo, titulo: d.titulo, funcionario: m.funcionario, qtd: m.qtd, registros: m.registros, pecaIds: m.donos });
    }
    for (const c of cargas) {
      if (c.dataSaida || c.dataExpedicao) eventos.push({ data: c.dataSaida || c.dataExpedicao, tipo: 'carregamento', titulo: `Carregada — romaneio ${c.numero}`, detalhe: [c.transportadora, c.motorista, c.placa].filter(Boolean).join(' · '), qtd: c.qtd, pecaIds: [c.pecaId] });
      if (c.dataEntrega && c.status === 'entregue') eventos.push({ data: c.dataEntrega, tipo: 'entrega', titulo: `Entregue na obra — ${c.numero}`, qtd: c.qtd, pecaIds: [c.pecaId] });
    }
    for (const u of unidades) if (u.montado?.data) eventos.push({ data: u.montado.data, tipo: 'montagem', titulo: 'Montada na obra', detalhe: u.montado.texto ? `planilha: ${u.montado.texto}` : '', qtd: u.qtd, pecaIds: [u.pecaId] });
    const ORD = { corte: 0, fabricacao: 1, solda: 2, pintura: 3, retorno: 4, carregamento: 5, entrega: 6, montagem: 7 };
    eventos.sort((a, b) => a.data - b.data || (ORD[a.tipo] ?? 9) - (ORD[b.tipo] ?? 9));

    // ---- Fluxo e linha do tempo de CADA unidade
    unidades.forEach((u, i) => {
      u.numero = i + 1;
      u.eventos = eventos.filter((e) => !e.pecaIds || e.pecaIds.includes(u.pecaId));
      // etapa a etapa, na ordem do fluxo (corte = posições da marca)
      u.fluxo = [
        { key: 'corte', ...(corte.length ? { data: faixaCorte(corte)?.fim || null, feito: corte.every((c) => c.status === 'cortado'), detalhe: `${corte.filter((c) => c.status === 'cortado').length}/${corte.length} posição(ões)` } : { feito: false, detalhe: 'sem posição ligada' }) },
        ...['fabricacao', 'solda', 'pintura'].map((e) => ({
          key: e, data: u.etapas[e]?.data || null, funcionario: u.etapas[e]?.funcionario || null,
          naoAplica: !!u.etapas[e]?.naoAplica, feito: !!u.etapas[e]?.naoAplica || ordemFluxo(u.etapa) > ordemFluxo(e),
        })),
        { key: 'carregamento', data: u.carga ? u.carga.dataSaida || u.carga.dataExpedicao : null, feito: !!u.carga, detalhe: u.carga ? [u.carga.numero, u.carga.motorista, u.carga.placa].filter(Boolean).join(' · ') : null },
        { key: 'entrega', data: u.carga?.status === 'entregue' ? u.carga.dataEntrega : null, feito: u.carga?.status === 'entregue', detalhe: u.carga && u.carga.status !== 'entregue' ? u.carga.status.replace(/_/g, ' ') : null },
        { key: 'montagem', data: u.montado?.data || null, feito: !!u.montado, detalhe: u.montado?.texto ? `planilha: ${u.montado.texto}` : null },
      ];
    });

    // ---- Marcos (primeira/última data por estágio)
    const faixa = (datas) => {
      const ds = datas.filter(Boolean).sort((a, b) => a - b);
      return ds.length ? { inicio: ds[0], fim: ds[ds.length - 1], n: ds.length } : null;
    };
    const qtdTotal = unidades.reduce((s, u) => s + u.qtd, 0);
    const qtdEm = (pred) => unidades.filter(pred).reduce((s, u) => s + u.qtd, 0);
    const marcos = {
      corte: { ...faixa(corte.map((c) => c.dataFim)), feito: corte.length ? corte.filter((c) => c.status === 'cortado').length : null, total: corte.length },
      fabricacao: { ...faixa(unidades.map((u) => u.etapas.fabricacao?.data)), feito: qtdEm((u) => ordemFluxo(u.etapa) > ordemFluxo('fabricacao')), total: qtdTotal },
      solda: { ...faixa(unidades.map((u) => u.etapas.solda?.data)), feito: qtdEm((u) => ordemFluxo(u.etapa) > ordemFluxo('solda') && !u.etapas.solda?.naoAplica), total: qtdTotal, naoAplica: unidades.every((u) => u.etapas.solda?.naoAplica) },
      pintura: { ...faixa(unidades.map((u) => u.etapas.pintura?.data)), feito: qtdEm((u) => ordemFluxo(u.etapa) > ordemFluxo('pintura')), total: qtdTotal },
      carregamento: { ...faixa(cargas.map((c) => c.dataSaida || c.dataExpedicao)), feito: cargas.reduce((s, c) => s + (c.qtd || 0), 0), total: qtdTotal },
      entrega: { ...faixa(cargas.filter((c) => c.status === 'entregue').map((c) => c.dataEntrega)), feito: cargas.filter((c) => c.status === 'entregue').reduce((s, c) => s + (c.qtd || 0), 0), total: qtdTotal },
      montagem: { ...faixa(unidades.map((u) => u.montado?.data)), feito: qtdEm((u) => !!u.montado), total: qtdTotal },
    };

    const porEtapa = {};
    for (const u of unidades) porEtapa[u.etapa] = (porEtapa[u.etapa] || 0) + u.qtd;
    blocos.push({
      obraId, obraNome: nomeObra.get(obraId) || obraId,
      marca: lista[0].marca, tipo: lista[0].tipo || '', perfil: lista[0].perfil || '',
      qtdTotal, kgTotal: Math.round(unidades.reduce((s, u) => s + u.kg, 0) * 10) / 10,
      porEtapa, unidades, corte, cargas, eventos, marcos,
      apontamentosBrutos: movs.reduce((s, m) => s + m.registros, 0), apontamentos: movs.length,
    });
  }
  return blocos.sort((a, b) => b.qtdTotal - a.qtdTotal);
}
