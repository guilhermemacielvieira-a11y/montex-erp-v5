// ============================================================
// Ferramentas do Copiloto MONTEX (executadas no NAVEGADOR)
// ============================================================
// A Edge Function `ia-copiloto` declara as ferramentas para o Claude; quando
// ele pede uma, o navegador executa AQUI com os dados já carregados do ERP e
// o MESMO motor do BI 360 (src/services/bi) — números idênticos às telas.
// Resultados compactos (JSON, valores arredondados, listas limitadas).
// ============================================================

import { obraDe, pesoPeca, etapaCanonica, dataLocal, diasEntre, isoLocal, r1, r2, num } from '../bi/biCore';
import {
  ritmoSemanal, tendenciaRitmo, leadTimeEtapas, wipAtual, gargalo, produtividadeFuncionarios, funilProducao,
} from '../bi/biProducao';
import { indicadoresObras, curvaS, kpisExecutivos } from '../bi/biObras';
import {
  movimentosDoEscopo, serieMensal, aging, fluxoProjetado, abcFornecedores, despesasPorCategoria,
} from '../bi/biFinanceiro';
import { kpisEstoque, curvaABC, saudeItem, valorItem } from '../estoqueAnalytics';

const normTxt = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const lim = (v, padrao, max) => Math.max(1, Math.min(max, Math.round(num(v) || padrao)));

/** Resolve "obra" (id, código ou trecho do nome) → obra ou null. */
export function resolverObra(obras = [], termo) {
  if (!termo) return null;
  const t = normTxt(termo).trim();
  return obras.find((o) => normTxt(o.id) === t || normTxt(o.codigo) === t)
    || obras.find((o) => normTxt(o.nome).includes(t) || normTxt(o.codigo).includes(t))
    || null;
}

function indicadorCompacto(i) {
  return {
    obra: i.nome, id: i.id, codigo: i.codigo, ativa: i.ativa,
    kg_total: i.kgTotal, kg_pronto: i.kgPronto, kg_em_obra: i.kgEmObra, kg_restante: i.kgRestante,
    fisico_pct: i.fisicoPct, financeiro_pct: i.financeiroPct, gap_pp: i.gapPp,
    contrato: i.valorContrato || null, medido: i.medido, recebido: i.recebido, a_receber: i.aReceber,
    saldo_a_medir: i.saldoAMedir, material_lancado_na_obra: i.material,
    ritmo_kg_semana: i.ritmoKgSemana, previsao_fim: i.previsaoFim, prazo: i.prazo, atraso_dias: i.atrasoDias,
  };
}

/**
 * Cria o executor de ferramentas.
 * @param ctx { obras, pecas, medicoes, lancamentos, receitasManuais, estoque,
 *              transicoes (todas, de transicoesComPeca), obraIdsEscopo (null=Geral),
 *              alertas, hoje }
 */
export function criarExecutor(ctx) {
  const {
    obras = [], pecas = [], medicoes = [], lancamentos = [], receitasManuais = [], estoque = [],
    transicoes = [], obraIdsEscopo = null, alertas = [], hoje = new Date(),
  } = ctx;

  // Escopo da chamada: parâmetro "obra" vence o escopo do topo.
  const escopo = (termoObra) => {
    if (termoObra) {
      const o = resolverObra(obras, termoObra);
      if (!o) return { erro: `Obra "${termoObra}" não encontrada. Obras: ${obras.map((x) => x.nome).join('; ')}` };
      return { ids: [o.id], rotulo: o.nome };
    }
    return { ids: obraIdsEscopo, rotulo: obraIdsEscopo ? obras.filter((o) => obraIdsEscopo.includes(o.id)).map((o) => o.nome).join(', ') : 'Geral (todas as obras)' };
  };
  const filtrarIds = (lista, ids) => (ids ? lista.filter((x) => ids.includes(obraDe(x))) : lista);
  const obrasDe = (ids) => (ids ? obras.filter((o) => ids.includes(o.id)) : obras);
  const nomeObra = (id) => obras.find((o) => o.id === id)?.nome || id || '—';
  const despesasObra = lancamentos.filter((d) => obraDe(d));

  const ferramentas = {
    resumo_executivo() {
      const e = escopo(null);
      const trs = filtrarIds(transicoes, e.ids);
      const ritmo = ritmoSemanal(trs, { hoje, semanas: 12 });
      const tend = tendenciaRitmo(ritmo, 4);
      const ind = indicadoresObras({ obras: obrasDe(e.ids), pecas, medicoes, despesas: despesasObra, transicoes, hoje });
      const mov = movimentosDoEscopo({ medicoes, receitasManuais, despesas: lancamentos, obraIds: e.ids });
      const mensal = serieMensal(mov, { hoje, meses: 3 });
      const ag = aging(mov, { hoje });
      return {
        escopo: e.rotulo, hoje: isoLocal(hoje),
        ...kpisExecutivos(ind, { ritmoKgSemana: tend.kgSemanaAtual }),
        ritmo_pecas_prontas_kg_semana: tend.kgSemanaAtual, ritmo_4_semanas_anteriores: tend.kgSemanaAnterior, variacao_pct: tend.variacaoPct,
        ultimos_3_meses: mensal.map((m) => ({ mes: m.mes, faturado: m.faturado, recebido: m.recebido, despesas: m.despesas })),
        a_receber_vencido: ag.receberVencido, a_pagar_vencido: ag.pagarVencido,
        caixa_escopo: e.ids ? 'só as obras do escopo' : 'caixa da empresa (sem material de obra)',
        alertas_principais: alertas.slice(0, 6).map((a) => ({ severidade: a.severidade, titulo: a.titulo })),
      };
    },

    listar_obras({ apenas_ativas = true } = {}) {
      const e = escopo(null);
      let ind = indicadoresObras({ obras: obrasDe(e.ids), pecas, medicoes, despesas: despesasObra, transicoes, hoje });
      if (apenas_ativas !== false) ind = ind.filter((i) => i.ativa);
      return { escopo: e.rotulo, obras: ind.map(indicadorCompacto) };
    },

    detalhar_obra({ obra } = {}) {
      if (!obra) return { erro: 'Informe a obra.' };
      const o = resolverObra(obras, obra);
      if (!o) return { erro: `Obra "${obra}" não encontrada.`, obras_disponiveis: obras.map((x) => x.nome) };
      const [ind] = indicadoresObras({ obras: [o], pecas, medicoes, despesas: despesasObra, transicoes, hoje });
      const cs = curvaS({ obras: [o], transicoes, hoje });
      const pontos = cs.pontos.filter((p) => p.realizado !== null);
      const ps = pecas.filter((p) => obraDe(p) === o.id);
      const porEtapa = {};
      ps.forEach((p) => { const k = etapaCanonica(p.etapa); porEtapa[k] = porEtapa[k] || { pecas: 0, kg: 0 }; porEtapa[k].pecas += 1; porEtapa[k].kg += pesoPeca(p); });
      Object.values(porEtapa).forEach((v) => { v.kg = r1(v.kg); });
      const meds = medicoes.filter((m) => obraDe(m) === o.id).map((m) => ({
        numero: m.numero, data: m.dataMedicao ?? m.data_medicao, status: m.status, valor: r2(num(m.valorBruto ?? m.valor_bruto)), descricao: m.descricao || null,
      }));
      const matCat = {};
      despesasObra.filter((d) => obraDe(d) === o.id && !/cancel/i.test(d.status || '')).forEach((d) => { const c = d.categoria || 'Outros'; matCat[c] = r2((matCat[c] || 0) + num(d.valor)); });
      return {
        ...indicadorCompacto(ind), cliente: o.cliente || null, inicio: o.dataInicio ?? o.data_inicio ?? null,
        pecas_por_etapa: porEtapa, medicoes: meds, material_por_categoria: matCat,
        curva_s: { tem_plano: cs.temPlano, kg_total: cs.kgTotal, ultimas_semanas: pontos.slice(-6) },
      };
    },

    producao({ obra = null, semanas = 8 } = {}) {
      const e = escopo(obra); if (e.erro) return e;
      const trs = filtrarIds(transicoes, e.ids);
      const ritmo = ritmoSemanal(trs, { hoje, semanas: lim(semanas, 8, 26) });
      const w = wipAtual(filtrarIds(pecas, e.ids), trs, { hoje });
      return {
        escopo: e.rotulo,
        kg_por_semana: ritmo,
        tendencia: tendenciaRitmo(ritmo, 4),
        lead_time_dias: leadTimeEtapas(trs),
        em_processo: w.resumo.filter((x) => x.pecas > 0),
        gargalo: gargalo(w.resumo, ritmo),
        funil_kg: funilProducao(filtrarIds(pecas, e.ids)),
        top_funcionarios_30d: produtividadeFuncionarios(trs, { hoje, dias: 30 }).slice(0, 10).map((f) => ({ funcionario: f.funcionario, kg: f.kg, pecas: f.pecas })),
      };
    },

    buscar_pecas({ obra = null, etapa = null, marca = null, parada_dias_min = null, limite = 30 } = {}) {
      const e = escopo(obra); if (e.erro) return e;
      const trs = filtrarIds(transicoes, e.ids);
      const w = wipAtual(filtrarIds(pecas, e.ids), trs, { hoje });
      const idade = new Map(w.itens.map((i) => [i.id, i.idadeDias]));
      let lista = filtrarIds(pecas, e.ids);
      if (etapa) lista = lista.filter((p) => etapaCanonica(p.etapa) === etapaCanonica(etapa));
      if (marca) { const t = normTxt(marca); lista = lista.filter((p) => normTxt(`${p.marca} ${p.codigo} ${p.nome}`).includes(t)); }
      if (parada_dias_min) lista = lista.filter((p) => (idade.get(p.id) ?? -1) >= num(parada_dias_min));
      const total = lista.length;
      const kg = lista.reduce((s, p) => s + pesoPeca(p), 0);
      const rows = lista
        .sort((a, b) => (idade.get(b.id) ?? -1) - (idade.get(a.id) ?? -1))
        .slice(0, lim(limite, 30, 100))
        .map((p) => ({ marca: p.marca || p.codigo || p.nome, obra: nomeObra(obraDe(p)), etapa: etapaCanonica(p.etapa), qtd: p.quantidade, kg: r1(pesoPeca(p)), perfil: p.perfil || null, dias_na_etapa: idade.get(p.id) ?? null }));
      return { escopo: e.rotulo, total, kg_total: r1(kg), mostrando: rows.length, pecas: rows };
    },

    financeiro({ obra = null, meses = 6 } = {}) {
      const e = escopo(obra); if (e.erro) return e;
      const mov = movimentosDoEscopo({ medicoes, receitasManuais, despesas: lancamentos, obraIds: e.ids });
      const ag = aging(mov, { hoje });
      return {
        escopo: e.rotulo,
        regra: e.ids ? 'Só a(s) obra(s): medições/receitas × material lançado na obra.' : 'Caixa da empresa: receitas pelo total; despesas sem obra (material de obra fora).',
        mensal: serieMensal(mov, { hoje, meses: lim(meses, 6, 12) }),
        aging: ag.faixas, a_receber_vencido: ag.receberVencido, a_pagar_vencido: ag.pagarVencido,
        fluxo_projetado_8_semanas: fluxoProjetado(mov, { hoje, semanas: 8 }),
        top_fornecedores_12m: abcFornecedores(mov.despesas, { hoje }).slice(0, 10),
        despesas_por_categoria_12m: despesasPorCategoria(mov.despesas, { hoje }).slice(0, 10),
      };
    },

    lancamentos({ tipo = 'despesa', obra = null, fornecedor = null, categoria = null, status = null, de = null, ate = null, limite = 30 } = {}) {
      const e = escopo(obra); if (e.erro) return e;
      const mov = movimentosDoEscopo({ medicoes, receitasManuais, despesas: lancamentos, obraIds: e.ids });
      let lista = tipo === 'receita' ? mov.receitas : mov.despesas;
      const dDe = dataLocal(de); const dAte = dataLocal(ate);
      if (dDe) lista = lista.filter((x) => x.data && x.data >= dDe);
      if (dAte) lista = lista.filter((x) => x.data && x.data <= dAte);
      if (fornecedor) { const t = normTxt(fornecedor); lista = lista.filter((x) => normTxt(x.fornecedor || x.descricao).includes(t)); }
      if (categoria) { const t = normTxt(categoria); lista = lista.filter((x) => normTxt(x.categoria).includes(t)); }
      if (status) {
        const s = normTxt(status);
        lista = lista.filter((x) => {
          const quitado = tipo === 'receita' ? x.recebido : x.pago;
          const vencido = !quitado && x.vencimento && diasEntre(x.vencimento, hoje) > 0;
          if (['pago', 'recebido', 'quitado'].includes(s)) return quitado;
          if (['vencido', 'atrasado'].includes(s)) return vencido;
          return !quitado; // pendente/aberto
        });
      }
      const total = lista.reduce((s, x) => s + x.valor, 0);
      const rows = [...lista].sort((a, b) => (b.data || 0) - (a.data || 0)).slice(0, lim(limite, 30, 100)).map((x) => ({
        data: x.data ? isoLocal(x.data) : null, vencimento: x.vencimento ? isoLocal(x.vencimento) : null,
        descricao: x.descricao, fornecedor: x.fornecedor || null, categoria: x.categoria || null, obra: x.obraId ? nomeObra(x.obraId) : null,
        valor: r2(x.valor), quitado: tipo === 'receita' ? x.recebido : x.pago,
      }));
      return { escopo: e.rotulo, tipo, quantidade: lista.length, total: r2(total), mostrando: rows.length, lancamentos: rows };
    },

    estoque({ busca = null, so_alerta = false, limite = 30 } = {}) {
      const ids = obraIdsEscopo;
      let itens = ids ? estoque.filter((x) => !obraDe(x) || ids.includes(obraDe(x))) : estoque;
      const k = kpisEstoque(itens);
      const abc = curvaABC(itens);
      if (busca) { const t = normTxt(busca); itens = itens.filter((x) => normTxt(`${x.descricao} ${x.nome} ${x.perfil} ${x.codigo}`).includes(t)); }
      if (so_alerta) itens = itens.filter((x) => ['zerado', 'critico', 'baixo'].includes(saudeItem(x)));
      const rows = itens.slice(0, lim(limite, 30, 100)).map((x) => ({
        descricao: x.descricao || x.nome, codigo: x.codigo || null, perfil: x.perfil || null, quantidade: num(x.quantidade), unidade: x.unidade || null,
        minimo: num(x.minimo) || null, saude: saudeItem(x), valor: valorItem(x), obra: obraDe(x) ? nomeObra(obraDe(x)) : 'estoque geral',
      }));
      return {
        resumo: { itens: k.nItens, valor_total: k.valorTotal, em_alerta: k.alertas, valor_em_risco: k.valorEmRisco, sem_preco: k.semPreco, sem_minimo: k.semMinimo, abc: abc.resumo },
        encontrados: itens.length, mostrando: rows.length, itens: rows,
      };
    },

    alertas({ severidade = null } = {}) {
      const lista = severidade ? alertas.filter((a) => a.severidade === severidade) : alertas;
      return { total: lista.length, alertas: lista.slice(0, 30).map((a) => ({ severidade: a.severidade, regra: a.regra, titulo: a.titulo, detalhe: a.detalhe, obra: a.obraId ? nomeObra(a.obraId) : null })) };
    },
  };

  /** Executa uma ferramenta pelo nome; nunca lança (erros viram resultado). */
  return function executar(nome, entrada) {
    const fn = ferramentas[nome];
    if (!fn) return { erro: `Ferramenta desconhecida: ${nome}` };
    try {
      const args = entrada && typeof entrada === 'object' ? Object.fromEntries(Object.entries(entrada).filter(([, v]) => v !== null && v !== undefined)) : {};
      return fn(args);
    } catch (e) {
      return { erro: `Falha ao consultar: ${e?.message || e}` };
    }
  };
}

/** Rótulo amigável do que o Copiloto está consultando (UI). */
export const ROTULO_FERRAMENTA = {
  resumo_executivo: 'Lendo o resumo executivo',
  listar_obras: 'Consultando obras',
  detalhar_obra: 'Detalhando a obra',
  producao: 'Analisando a produção',
  buscar_pecas: 'Buscando peças',
  financeiro: 'Analisando o financeiro',
  lancamentos: 'Consultando lançamentos',
  estoque: 'Consultando o estoque',
  alertas: 'Lendo o Radar de Alertas',
};
