// ============================================================
// useFinanceiroGlobal — fonte financeira ÚNICA (espelha o Painel Financeiro Global)
// ============================================================
// Replica a agregação do PainelFinanceiroGlobal para que outros módulos (ex.:
// DashboardPremium) mostrem EXATAMENTE os mesmos números do Painel:
//   - Consolida despesas (fábrica, sem obra) + medições + receitas manuais +
//     movimentos manuais do bundle (localStorage/entity_store), aplicando
//     overrides / hidden / deletados e excluindo juros de operação.
//   - KPIs (receita, despesa, lucro, margem), evolução mensal, metas do mês,
//     comparativo MoM, forecast de receitas (aprovadas não pagas) e custos por
//     categoria — tudo derivado da MESMA base do Painel.
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { useLancamentos, useMedicoes, useObras } from '../contexts/ERPContext';
import { parseLocalDate, ehPago } from '../utils/financeiroCalc';
import { loadBundleLocal, loadBundleRemote, saveBundleLocal, mergeBundles } from '../utils/painelFinanceiroSync';

const RECEITAS_STORAGE_KEY = 'montex_receitas_gerais';
const RECEITAS_OVERRIDES_KEY = 'montex_receitas_overrides';
const ETAPA_LABELS = { fabricacao: 'Fabricação', montagem: 'Montagem' };

// Metas padrão (mesmas do PainelFinanceiroGlobal). O bundle.metas do usuário
// sobrescreve estes valores.
const DEFAULT_METAS = {
  fabricacaoKg: 60000, fabricacaoPrecoKg: 5.50,
  montagemKg: 25000, montagemPrecoKg: 3.00,
  receitaMinimaMensal: 405000,
  despesaTetoMensal: 350000,
  margemMinima: 25,
  saldoMinimo: 50000,
};

const lerLS = (key, dflt) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : dflt; } catch { return dflt; } };

export function useFinanceiroGlobal() {
  const { lancamentosDespesas } = useLancamentos();
  const { medicoes: todasMedicoes } = useMedicoes();
  const { obras } = useObras();

  // Bundle (movs/overrides/hidden/metas/deletados): cache local imediato +
  // refresh remoto (entity_store) para bater com o Painel entre dispositivos.
  const [bundle, setBundle] = useState(() => loadBundleLocal());
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const remoto = await loadBundleRemote();
        if (!alive || !remoto) return;
        const merged = mergeBundles(loadBundleLocal(), remoto);
        saveBundleLocal(merged);
        setBundle(merged);
      } catch { /* mantém o local */ }
    })();
    return () => { alive = false; };
  }, []);

  const movsLocais = bundle.movs || [];
  const overridesLocais = bundle.overrides || {};
  const hiddenLocais = bundle.hidden || [];
  const deletados = bundle.deletados || [];
  const metas = useMemo(() => ({ ...DEFAULT_METAS, ...(bundle.metas || {}) }), [bundle.metas]);

  const obrasMap = useMemo(() => {
    const map = {};
    (obras || []).forEach((o) => { map[o.id] = o.nome || o.name || o.id; });
    return map;
  }, [obras]);

  // Espelho de despesas da fábrica (sem obra — GFO é independente)
  const despesasExternas = useMemo(() => (lancamentosDespesas || [])
    .filter((l) => !l.obraId && !l.obra_id)
    .map((l) => ({
      id: l.id, ovKey: `d:${l.id}`, origem: 'externo', tipo: 'despesa',
      data: l.dataEmissao || l.data || l.createdAt || '',
      descricao: l.descricao || l.nome || '-', fornecedor: l.fornecedor || '-',
      categoria: l.categoria || 'Outros', valor: l.valor || 0,
      status: l.status || 'pendente', vencimento: l.dataVencimento || l.vencimento || '-',
    })), [lancamentosDespesas]);

  // Espelho de medições (receitas) + overrides de receita
  const receitasMedicoesExt = useMemo(() => {
    const overrides = lerLS(RECEITAS_OVERRIDES_KEY, {});
    return (todasMedicoes || []).map((m) => {
      const obraId = m.obraId || m.obra_id;
      const obraNome = m.obraNome || m.obra_nome || obrasMap[obraId] || '-';
      const etapaLabel = m.isAvulsa ? 'Avulsa' : (ETAPA_LABELS[m.etapa] || m.etapa || 'Medição');
      const base = {
        id: m.id, ovKey: `m:${m.id}`, origem: 'externo', tipo: 'receita',
        data: m.dataMedicao || m.data_medicao || m.dataReferencia || m.data_referencia || '',
        descricao: m.descricao || `Medição #${m.numero || '?'} - ${etapaLabel}`,
        fornecedor: obraNome, categoria: m.isAvulsa ? 'Serviço Avulso' : 'Medição',
        valor: m.valorBruto || m.valor_bruto || 0,
        status: ['pago', 'paga', 'faturado', 'confirmado'].includes(m.status) ? 'recebido' : (m.status || 'pendente'),
        vencimento: m.dataMedicao || m.data_medicao || '-', obraId, obraNome,
      };
      const ov = overrides[m.id];
      if (ov) {
        if (ov.descricao) base.descricao = ov.descricao;
        if (ov.valor !== undefined) base.valor = ov.valor;
        if (ov.status) base.status = ['pago', 'paga', 'faturado', 'confirmado', 'recebido'].includes(ov.status) ? 'recebido' : ov.status;
        if (ov.categoria) base.categoria = ov.categoria;
        if (ov.cliente) base.fornecedor = ov.cliente;
        if (ov.vencimento) base.vencimento = ov.vencimento;
      }
      return base;
    });
  }, [todasMedicoes, obrasMap]);

  // Receitas manuais (localStorage)
  const receitasManuaisExt = useMemo(() => {
    try {
      return (JSON.parse(localStorage.getItem(RECEITAS_STORAGE_KEY) || '[]')).map((r) => ({
        id: r.id, ovKey: `r:${r.id}`, origem: 'externo', tipo: 'receita',
        data: r.data || r.vencimento || '', descricao: r.descricao || '-',
        fornecedor: r.cliente || '-', categoria: r.categoria || 'Outros', valor: r.valor || 0,
        status: ['pago', 'paga', 'faturado', 'confirmado', 'recebido'].includes(r.status) ? 'recebido' : (r.status || 'pendente'),
        vencimento: r.vencimento || '-',
      }));
    } catch { return []; }
  }, []);

  const movsLocaisNorm = useMemo(() => (movsLocais || []).map((m) => ({
    ...m, origem: 'local', origemObra: !!m.obraId,
  })), [movsLocais]);

  // Consolidação (mesma regra do Painel): overrides/hidden por ovKey|id,
  // exclui juros de operação, exclui deletados.
  const todasMovs = useMemo(() => {
    const delSet = new Set((deletados || []).map(String));
    const externas = [...despesasExternas, ...receitasMedicoesExt, ...receitasManuaisExt];
    const externasComOv = externas
      .filter((m) => !hiddenLocais.includes(m.ovKey) && !hiddenLocais.includes(m.id))
      .map((m) => {
        const ov = overridesLocais[m.ovKey] || overridesLocais[m.id];
        return ov ? { ...m, ...ov, id: m.id, ovKey: m.ovKey, origem: 'externo', origemModificado: true } : m;
      });
    const ehJuros = (m) => m.operacaoFinanceiraId && typeof m.id === 'string' && m.id.endsWith('-juros');
    return [...externasComOv, ...movsLocaisNorm]
      .filter((m) => m && !ehJuros(m) && !delSet.has(String(m.id)))
      .sort((a, b) => (parseLocalDate(b.data)?.getTime() || 0) - (parseLocalDate(a.data)?.getTime() || 0));
  }, [despesasExternas, receitasMedicoesExt, receitasManuaisExt, movsLocaisNorm, overridesLocais, hiddenLocais, deletados]);

  // KPIs gerais (todo o histórico consolidado)
  const kpis = useMemo(() => {
    const receitas = todasMovs.filter((m) => m.tipo === 'receita');
    const despesas = todasMovs.filter((m) => m.tipo === 'despesa');
    const totR = receitas.reduce((s, m) => s + (m.valor || 0), 0);
    const totD = despesas.reduce((s, m) => s + (m.valor || 0), 0);
    const recRecebidas = receitas.filter(ehPago).reduce((s, m) => s + (m.valor || 0), 0);
    const despPagas = despesas.filter(ehPago).reduce((s, m) => s + (m.valor || 0), 0);
    return {
      totR, totD, lucro: totR - totD, margem: totR > 0 ? ((totR - totD) / totR) * 100 : 0,
      recRecebidas, recPendentes: totR - recRecebidas, despPagas, despPendentes: totD - despPagas,
      qtdR: receitas.length, qtdD: despesas.length,
    };
  }, [todasMovs]);

  // Evolução mensal (receitas/despesas/saldo)
  const evolucaoMensal = useMemo(() => {
    const meses = {};
    todasMovs.forEach((m) => {
      const d = parseLocalDate(m.data || m.vencimento);
      if (!d || isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!meses[key]) meses[key] = { mes: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), key, receitas: 0, despesas: 0 };
      if (m.tipo === 'receita') meses[key].receitas += m.valor || 0;
      else meses[key].despesas += m.valor || 0;
    });
    return Object.values(meses).sort((a, b) => a.key.localeCompare(b.key)).map((m) => ({ ...m, saldo: m.receitas - m.despesas }));
  }, [todasMovs]);

  // Metas — realizado do mês (receita paga, despesa total, margem)
  const metasReal = useMemo(() => {
    const hoje = new Date();
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const movsMes = todasMovs.filter((m) => { const d = parseLocalDate(m.data || m.vencimento); return d >= ini && d <= fim; });
    const receitaMes = movsMes.filter((m) => m.tipo === 'receita' && ehPago(m)).reduce((s, m) => s + (m.valor || 0), 0);
    const despesaMes = movsMes.filter((m) => m.tipo === 'despesa').reduce((s, m) => s + (m.valor || 0), 0);
    return {
      receitaMes, despesaMes, saldoMes: receitaMes - despesaMes,
      margemReal: receitaMes > 0 ? ((receitaMes - despesaMes) / receitaMes) * 100 : 0,
      receitaTotalMeta: metas.fabricacaoKg * metas.fabricacaoPrecoKg + metas.montagemKg * metas.montagemPrecoKg,
    };
  }, [todasMovs, metas]);

  // Comparativo mês atual × anterior
  const comparativo = useMemo(() => {
    const hoje = new Date();
    const calc = (off) => {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth() - off, 1);
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() - off + 1, 0);
      const movs = todasMovs.filter((m) => { const d = parseLocalDate(m.data || m.vencimento); return d >= ini && d <= fim; });
      const rec = movs.filter((m) => m.tipo === 'receita').reduce((s, m) => s + (m.valor || 0), 0);
      const desp = movs.filter((m) => m.tipo === 'despesa').reduce((s, m) => s + (m.valor || 0), 0);
      return { receitas: rec, despesas: desp, lucro: rec - desp, margem: rec > 0 ? ((rec - desp) / rec) * 100 : 0 };
    };
    const atual = calc(0), anterior = calc(1);
    const delta = (a, b) => (b > 0 ? ((a - b) / b) * 100 : (a > 0 ? 100 : 0));
    return {
      atual, anterior,
      deltaReceitas: delta(atual.receitas, anterior.receitas),
      deltaDespesas: delta(atual.despesas, anterior.despesas),
      deltaLucro: delta(atual.lucro, anterior.lucro),
    };
  }, [todasMovs]);

  // Forecast: receitas aprovadas/pendentes ainda não pagas, distribuídas em 6 meses
  const forecast = useMemo(() => {
    const pend = todasMovs.filter((m) => m.tipo === 'receita' && !ehPago(m) && (m.valor || 0) > 0);
    const total = pend.reduce((s, m) => s + (m.valor || 0), 0);
    const hoje = new Date();
    const meses = [];
    for (let i = 0; i < 6; i++) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      meses.push({ mes: mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), forecast: 0, meta: metas.receitaMinimaMensal });
    }
    pend.forEach((m) => {
      const venc = parseLocalDate(m.vencimento && m.vencimento !== '-' ? m.vencimento : m.data);
      let idx = (!venc || isNaN(venc.getTime())) ? 0 : (venc.getFullYear() - hoje.getFullYear()) * 12 + (venc.getMonth() - hoje.getMonth());
      idx = Math.max(0, Math.min(5, idx));
      meses[idx].forecast += m.valor || 0;
    });
    return { totalForecast: total, meses, qtd: pend.length };
  }, [todasMovs, metas]);

  // Custos por categoria (despesas)
  const custosPorCategoria = useMemo(() => {
    const map = {};
    todasMovs.filter((m) => m.tipo === 'despesa').forEach((m) => {
      const c = m.categoria || 'Outros';
      map[c] = (map[c] || 0) + (m.valor || 0);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    const cores = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#a855f7'];
    return Object.entries(map).map(([nome, valor], i) => ({ nome, valor, percentual: total > 0 ? (valor / total) * 100 : 0, cor: cores[i % cores.length] }))
      .sort((a, b) => b.valor - a.valor);
  }, [todasMovs]);

  const topFornecedores = useMemo(() => {
    const map = {};
    todasMovs.filter((m) => m.tipo === 'despesa').forEach((m) => {
      const f = m.fornecedor || '-';
      if (!map[f]) map[f] = { nome: f, valor: 0, qtd: 0 };
      map[f].valor += m.valor || 0; map[f].qtd += 1;
    });
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [todasMovs]);

  return { kpis, evolucaoMensal, metasReal, metas, comparativo, forecast, custosPorCategoria, topFornecedores, todasMovs };
}
