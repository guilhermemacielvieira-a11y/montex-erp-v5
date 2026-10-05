// ============================================================
// useBIData — dados REAIS do ERP + motor de BI, no escopo do topo
// ============================================================
// Única fonte de BI 360, Radar de Alertas (e futuramente Copiloto/Insights).
// Escopo: filtro único do topo (CLAUDE.md 1c). Em "Geral" os operacionais
// mostram todas as obras e o financeiro mostra o caixa da empresa.
// O histórico de produção (producao_historico, >1000 linhas) é buscado
// paginado (CLAUDE.md regra 4).
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../api/supabaseClient';
import { useObras, useProducao, useMedicoes, useLancamentos, useEstoque } from '../contexts/ERPContext';
import { useReceitasManuais } from '../utils/receitasSync';
import { noEscopo, obraDe } from '../services/bi/biCore';
import {
  transicoesComPeca, ritmoSemanal, tendenciaRitmo, leadTimeEtapas, wipAtual, gargalo,
  produtividadeFuncionarios, funilProducao,
} from '../services/bi/biProducao';
import { indicadoresObras, curvaS, kpisExecutivos } from '../services/bi/biObras';
import {
  movimentosDoEscopo, serieMensal, aging, fluxoProjetado, abcFornecedores, despesasPorCategoria,
} from '../services/bi/biFinanceiro';
import { gerarAlertas } from '../services/bi/radarAlertas';
import { kpisEstoque, curvaABC } from '../services/estoqueAnalytics';

const PAGINA = 1000;
let cacheHistorico = null; // { em: timestamp, linhas }
const CACHE_MS = 2 * 60 * 1000;

async function buscarHistorico({ forcar = false } = {}) {
  if (!forcar && cacheHistorico && Date.now() - cacheHistorico.em < CACHE_MS) return cacheHistorico.linhas;
  const linhas = [];
  for (let de = 0; de < 100000; de += PAGINA) {
    const { data, error } = await supabase
      .from('producao_historico')
      .select('peca_id, etapa_de, etapa_para, data_inicio, created_at, funcionario_nome')
      .order('id', { ascending: true })
      .range(de, de + PAGINA - 1);
    if (error) throw error;
    linhas.push(...(data || []));
    if (!data || data.length < PAGINA) break;
  }
  cacheHistorico = { em: Date.now(), linhas };
  return linhas;
}

export function useBIData() {
  const { obras = [], escopoObra, obraIdsEscopo } = useObras();
  const { pecas = [] } = useProducao();
  const { medicoes = [] } = useMedicoes();
  const { lancamentosDespesas = [] } = useLancamentos();
  const { estoque = [] } = useEstoque();
  const { receitas: receitasManuais = [] } = useReceitasManuais();

  const [historico, setHistorico] = useState(() => cacheHistorico?.linhas || []);
  const [carregando, setCarregando] = useState(!cacheHistorico);
  const [erro, setErro] = useState(null);
  const [atualizadoEm, setAtualizadoEm] = useState(cacheHistorico ? new Date(cacheHistorico.em) : null);

  const recarregar = useCallback(async (forcar = true) => {
    setCarregando(true);
    try {
      const h = await buscarHistorico({ forcar });
      setHistorico(h);
      setErro(null);
      setAtualizadoEm(new Date());
    } catch (e) {
      setErro(e?.message || 'Falha ao carregar o histórico de produção');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { recarregar(false); }, [recarregar]);

  // hoje é recalculado a cada recarga (atualizadoEm)
  const hoje = useMemo(() => (atualizadoEm ? new Date() : new Date()), [atualizadoEm]);

  return useMemo(() => {
    const obraIds = obraIdsEscopo || null;
    const obrasEscopo = obraIds ? obras.filter((o) => obraIds.includes(o.id)) : obras;
    const nomeObra = (id) => obras.find((o) => o.id === id)?.nome || id || '—';

    // ---- Produção ----
    const todasTransicoes = transicoesComPeca(historico, pecas);
    const transicoes = obraIds ? todasTransicoes.filter((t) => obraIds.includes(t.obraId)) : todasTransicoes;
    const pecasEscopo = noEscopo(pecas, obraIds);
    const ritmo = ritmoSemanal(transicoes, { hoje, semanas: 12 });
    const tendencia = tendenciaRitmo(ritmo, 4);
    const leadTimes = leadTimeEtapas(transicoes);
    const wip = wipAtual(pecasEscopo, transicoes, { hoje });
    const gargaloInfo = gargalo(wip.resumo, ritmo);
    const funil = funilProducao(pecasEscopo);
    const ranking = produtividadeFuncionarios(transicoes, { hoje, dias: 30 });

    // ---- Obras ----
    const despesasObra = lancamentosDespesas.filter((d) => obraDe(d));
    const indicadores = indicadoresObras({ obras: obrasEscopo, pecas, medicoes, despesas: despesasObra, transicoes: todasTransicoes, hoje });
    const executivo = kpisExecutivos(indicadores, { ritmoKgSemana: tendencia.kgSemanaAtual });
    const curva = curvaS({ obras: obrasEscopo.filter((o) => indicadores.find((i) => i.id === o.id)?.ativa), transicoes: todasTransicoes, hoje });

    // ---- Financeiro (Geral = caixa da empresa) ----
    const mov = movimentosDoEscopo({ medicoes, receitasManuais, despesas: lancamentosDespesas, obraIds });
    const mensal = serieMensal(mov, { hoje, meses: 12 });
    const agingInfo = aging(mov, { hoje });
    const fluxo = fluxoProjetado(mov, { hoje, semanas: 8 });
    const fornecedores = abcFornecedores(mov.despesas, { hoje, dias: 365 });
    const categorias = despesasPorCategoria(mov.despesas, { hoje, dias: 365 });

    // ---- Suprimentos ----
    const estoqueEscopo = obraIds ? estoque.filter((e) => !obraDe(e) || obraIds.includes(obraDe(e))) : estoque;
    const estoqueKpis = kpisEstoque(estoqueEscopo);
    const estoqueABC = curvaABC(estoqueEscopo);

    // ---- Radar ----
    const despesasBrutas = obraIds ? lancamentosDespesas.filter((d) => obraIds.includes(obraDe(d))) : lancamentosDespesas;
    const alertas = gerarAlertas({
      wipItens: wip.itens, leadTimes, indicadores, ritmo, receitas: mov.receitas, despesas: mov.despesas,
      despesasBrutas, estoque: estoqueEscopo, pecas: pecasEscopo, hoje, nomeObra,
    });

    return {
      carregando, erro, atualizadoEm, recarregar, escopoObra, obraIds, nomeObra, hoje,
      producao: { ritmo, tendencia, leadTimes, wip, gargalo: gargaloInfo, funil, ranking, transicoes: transicoes.length },
      obras: { indicadores, executivo, curva },
      financeiro: { ...mov, mensal, aging: agingInfo, fluxo, fornecedores, categorias, geralEmpresa: !obraIds },
      suprimentos: { kpis: estoqueKpis, abc: estoqueABC, itens: estoqueEscopo },
      alertas,
    };
  }, [obras, obraIdsEscopo, escopoObra, pecas, medicoes, lancamentosDespesas, estoque, receitasManuais, historico, hoje, carregando, erro, atualizadoEm, recarregar]);
}
