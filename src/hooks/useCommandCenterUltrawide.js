import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../api/supabaseClient';

export const useCommandCenterUltrawide = () => {
  // State for all data sections
  const [corte, setCorte] = useState({
    total: 0,
    byStatus: { aguardando: 0, cortando: 0, finalizado: 0 },
    pesoTotal: 0,
    pesoFinalizado: 0,
    progressoPeso: 0,
    progressoPecas: 0,
    cortadasHoje: 0,
    porFuncionario: {},
    porMaquina: {},
    porMaterial: {},
    timeline: [],
    items: [],
  });

  const [producao, setProducao] = useState({
    total: 0,
    byStage: {
      fabricacao: 0,
      solda: 0,
      pintura: 0,
      expedicao: 0,
      expedido: 0,
      finalizado: 0,
      entregue: 0,
    },
    pesoTotal: 0,
    pesoExpedido: 0,
    progressoGeral: 0,
    porSetor: {},
    porFuncionario: {},
    prontasEnvio: 0,
    flowData: [],
    items: [],
  });

  const [historico, setHistorico] = useState({
    total: 0,
    movimentacoes: [],
    movHoje: 0,
    porFuncionario: {},
    porDia: {},
    porEtapa: {},
    porHora: {},
    velocidadeMedia: 0,
  });

  const [estoque, setEstoque] = useState({
    totalItens: 0,
    valorTotal: 0,
    bystatus: { normal: 0, baixo: 0, critico: 0 },
    entradasHoje: 0,
    saidasHoje: 0,
    porCategoria: {},
    porLocalizacao: {},
    alertItems: [],
    items: [],
  });

  const [financeiro, setFinanceiro] = useState({
    totalDespesas: 0,
    despesasPagas: 0,
    despesasPendentes: 0,
    totalMedicoes: 0,
    medicoesAprovadas: 0,
    saldoObra: 0,
    porCategoria: {},
    porMes: {},
    lancamentosRecentes: [],
  });

  const [campo, setCampo] = useState({
    totalEnvios: 0,
    byStatus: {},
    pesoEnviado: 0,
    pecasEnviadas: 0,
    enviosHoje: 0,
    enviosDetalhados: [],
    timeline: {},
  });

  const [equipes, setEquipes] = useState({
    totalFuncionarios: 0,
    ativos: 0,
    porFuncao: {},
    porEquipe: {},
    items: [],
  });

  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [snapshotOntem, setSnapshotOntem] = useState(null);

  const subscriptionsRef = useRef([]);
  const intervalRef = useRef(null);

  // Utility function to normalize status
  const normalizeCorteStatus = (status) => {
    if (!status) return 'aguardando';
    const lowerStatus = status.toLowerCase().trim();
    if (['aguardando', 'programacao'].includes(lowerStatus)) return 'aguardando';
    if (['cortando', 'em_corte'].includes(lowerStatus)) return 'cortando';
    if (['finalizado', 'liberado'].includes(lowerStatus)) return 'finalizado';
    return 'aguardando';
  };

  // Get today's date at midnight
  const getTodayMidnight = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  }, []);

  // Get hour key for timeline
  const getHourKey = useCallback((dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.getHours();
  }, []);

  // Save snapshot to localStorage
  const saveSnapshot = useCallback(() => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      corte,
      producao,
      historico,
      estoque,
      financeiro,
      campo,
      equipes,
    };
    try {
      localStorage.setItem('cmdCenterSnapshot', JSON.stringify(snapshot));
    } catch (error) {
      console.warn('Failed to save snapshot:', error);
    }
  }, [corte, producao, historico, estoque, financeiro, campo, equipes]);

  // Load yesterday's snapshot for comparison
  const loadYesterdaySnapshot = useCallback(() => {
    try {
      const stored = localStorage.getItem('cmdCenterSnapshotYesterday');
      if (stored) {
        setSnapshotOntem(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load yesterday snapshot:', error);
    }
  }, []);

  // Daily comparison function
  const comparacaoDiaria = useCallback(() => {
    if (!snapshotOntem) return null;

    return {
      corteVariacao: {
        total: corte.total - (snapshotOntem.corte?.total || 0),
        pesoFinalizado: corte.pesoFinalizado - (snapshotOntem.corte?.pesoFinalizado || 0),
      },
      producaoVariacao: {
        total: producao.total - (snapshotOntem.producao?.total || 0),
        pesoExpedido: producao.pesoExpedido - (snapshotOntem.producao?.pesoExpedido || 0),
      },
      estoqueVariacao: {
        totalItens: estoque.totalItens - (snapshotOntem.estoque?.totalItens || 0),
        valorTotal: estoque.valorTotal - (snapshotOntem.estoque?.valorTotal || 0),
      },
      financeiro Variacao: {
        totalDespesas: financeiro.totalDespesas - (snapshotOntem.financeiro?.totalDespesas || 0),
        despesasPagas: financeiro.despesasPagas - (snapshotOntem.financeiro?.despesasPagas || 0),
      },
    };
  }, [snapshotOntem, corte, producao, estoque, financeiro]);

  // Fetch Corte data
  const fetchCorte = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('materiais_corte')
        .select(
          'id, status_corte, peso_teorico, quantidade, peca, marca, perfil, material, comprimento_mm, funcionario_corte, maquina, data_inicio, data_fim, updated_at, created_at'
        );

      if (error) {
        console.warn('Error fetching corte:', error);
        return;
      }

      if (!data) {
        setCorte((prev) => ({
          ...prev,
          total: 0,
          items: [],
          byStatus: { aguardando: 0, cortando: 0, finalizado: 0 },
        }));
        return;
      }

      const todayMidnight = getTodayMidnight();
      const byStatus = { aguardando: 0, cortando: 0, finalizado: 0 };
      const porFuncionario = {};
      const porMaquina = {};
      const porMaterial = {};
      const timelineHours = {};
      let pesoTotal = 0;
      let pesoFinalizado = 0;
      let cortadasHoje = 0;

      data.forEach((item) => {
        const normalizedStatus = normalizeCorteStatus(item.status_corte);
        byStatus[normalizedStatus] = (byStatus[normalizedStatus] || 0) + 1;

        // Weight calculations
        const peso = item.peso_teorico || 0;
        pesoTotal += peso * item.quantidade;
        if (normalizedStatus === 'finalizado') {
          pesoFinalizado += peso * item.quantidade;
        }

        // Today's count
        if (item.created_at && new Date(item.created_at).toISOString() >= todayMidnight) {
          cortadasHoje += item.quantidade || 0;
        }

        // By funcionario
        if (item.funcionario_corte) {
          porFuncionario[item.funcionario_corte] =
            (porFuncionario[item.funcionario_corte] || 0) + (item.quantidade || 0);
        }

        // By maquina
        if (item.maquina) {
          porMaquina[item.maquina] = (porMaquina[item.maquina] || 0) + (item.quantidade || 0);
        }

        // By material
        if (item.material) {
          porMaterial[item.material] = (porMaterial[item.material] || 0) + (item.quantidade || 0);
        }

        // Timeline by hour today
        const hourKey = getHourKey(item.data_inicio || item.created_at);
        if (hourKey !== null && item.created_at && new Date(item.created_at).toISOString() >= todayMidnight) {
          timelineHours[hourKey] = (timelineHours[hourKey] || 0) + (item.quantidade || 0);
        }
      });

      const progressoPeso = pesoTotal > 0 ? Math.round((pesoFinalizado / pesoTotal) * 100) : 0;
      const progressoPecas = data.length > 0 ? Math.round((byStatus.finalizado / data.length) * 100) : 0;

      setCorte({
        total: data.length,
        byStatus,
        pesoTotal: Math.round(pesoTotal),
        pesoFinalizado: Math.round(pesoFinalizado),
        progressoPeso,
        progressoPecas,
        cortadasHoje,
        porFuncionario,
        porMaquina,
        porMaterial,
        timeline: Object.entries(timelineHours).map(([hour, count]) => ({
          hour: parseInt(hour),
          count,
        })),
        items: data,
      });
    } catch (error) {
      console.warn('Exception in fetchCorte:', error);
      setCorte((prev) => ({
        ...prev,
        total: 0,
        items: [],
      }));
    }
  }, [getTodayMidnight, getHourKey]);

  // Fetch Producao data
  const fetchProducao = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pecas_producao')
        .select(
          'id, etapa, status, peso_total, peso_unitario, quantidade, quantidade_produzida, nome, marca, tipo, perfil, responsavel, equipe_id, obra_id, obra_nome, updated_at, created_at'
        );

      if (error) {
        console.warn('Error fetching producao:', error);
        return;
      }

      if (!data) {
        setProducao((prev) => ({
          ...prev,
          total: 0,
          items: [],
        }));
        return;
      }

      const todayMidnight = getTodayMidnight();
      const byStage = {
        fabricacao: 0,
        solda: 0,
        pintura: 0,
        expedicao: 0,
        expedido: 0,
        finalizado: 0,
        entregue: 0,
      };
      const porSetor = {};
      const porFuncionario = {};
      const stageTransitions = {};
      let pesoTotal = 0;
      let pesoExpedido = 0;
      let prontasEnvio = 0;

      data.forEach((item) => {
        const etapa = (item.etapa || 'fabricacao').toLowerCase().trim();
        if (byStage.hasOwnProperty(etapa)) {
          byStage[etapa] = (byStage[etapa] || 0) + 1;
        }

        pesoTotal += item.peso_total || 0;

        // Post-pintura items ready for shipping
        if (['expedicao', 'expedido'].includes(etapa)) {
          prontasEnvio += 1;
          pesoExpedido += item.peso_total || 0;
        }

        // By setor (tipo mapped to setor)
        if (item.tipo) {
          porSetor[item.tipo] = (porSetor[item.tipo] || 0) + 1;
        }

        // By funcionario
        if (item.responsavel) {
          porFuncionario[item.responsavel] = (porFuncionario[item.responsavel] || 0) + 1;
        }

        // Flow data - track stage transitions
        stageTransitions[etapa] = (stageTransitions[etapa] || 0) + 1;
      });

      const progressoGeral = Object.values(byStage).reduce((a, b) => a + b, 0) > 0
        ? Math.round(((byStage.finalizado + byStage.entregue) / data.length) * 100)
        : 0;

      setProducao({
        total: data.length,
        byStage,
        pesoTotal: Math.round(pesoTotal),
        pesoExpedido: Math.round(pesoExpedido),
        progressoGeral,
        porSetor,
        porFuncionario,
        prontasEnvio,
        flowData: Object.entries(stageTransitions).map(([stage, count]) => ({
          stage,
          count,
        })),
        items: data,
      });
    } catch (error) {
      console.warn('Exception in fetchProducao:', error);
      setProducao((prev) => ({
        ...prev,
        total: 0,
        items: [],
      }));
    }
  }, [getTodayMidnight]);

  // Fetch Historico data
  const fetchHistorico = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('producao_historico')
        .select(
          'id, peca_id, etapa_de, etapa_para, funcionario_id, funcionario_nome, data_inicio, data_fim, observacoes, created_at'
        );

      if (error) {
        console.warn('Error fetching historico:', error);
        return;
      }

      if (!data) {
        setHistorico((prev) => ({
          ...prev,
          total: 0,
          movimentacoes: [],
        }));
        return;
      }

      const todayMidnight = getTodayMidnight();
      const porFuncionario = {};
      const porDia = {};
      const porEtapa = {};
      const porHora = {};
      let movHoje = 0;
      let totalTimeMs = 0;
      let countTransitions = 0;

      data.forEach((item) => {
        // By funcionario
        if (item.funcionario_nome) {
          porFuncionario[item.funcionario_nome] = (porFuncionario[item.funcionario_nome] || 0) + 1;
        }

        // Today's movements
        if (item.created_at && new Date(item.created_at).toISOString() >= todayMidnight) {
          movHoje += 1;
        }

        // By day (last 7 days)
        if (item.data_inicio) {
          const date = new Date(item.data_inicio).toLocaleDateString();
          porDia[date] = (porDia[date] || 0) + 1;
        }

        // By etapa
        const etapa = `${item.etapa_de} → ${item.etapa_para}`;
        porEtapa[etapa] = (porEtapa[etapa] || 0) + 1;

        // By hour today
        const hourKey = getHourKey(item.created_at);
        if (hourKey !== null && item.created_at && new Date(item.created_at).toISOString() >= todayMidnight) {
          porHora[hourKey] = (porHora[hourKey] || 0) + 1;
        }

        // Calculate velocity
        if (item.data_inicio && item.data_fim) {
          const start = new Date(item.data_inicio);
          const end = new Date(item.data_fim);
          totalTimeMs += end - start;
          countTransitions += 1;
        }
      });

      const velocidadeMedia = countTransitions > 0 ? Math.round(totalTimeMs / countTransitions / 1000 / 60) : 0; // minutes

      setHistorico({
        total: data.length,
        movimentacoes: data,
        movHoje,
        porFuncionario,
        porDia,
        porEtapa,
        porHora,
        velocidadeMedia,
      });
    } catch (error) {
      console.warn('Exception in fetchHistorico:', error);
      setHistorico((prev) => ({
        ...prev,
        total: 0,
        movimentacoes: [],
      }));
    }
  }, [getTodayMidnight, getHourKey]);

  // Fetch Estoque data
  const fetchEstoque = useCallback(async () => {
    try {
      const [estoqueRes, movRes] = await Promise.all([
        supabase.from('estoque').select('*'),
        supabase.from('movimentacoes_estoque').select('*'),
      ]);

      if (estoqueRes.error) console.warn('Error fetching estoque:', estoqueRes.error);
      if (movRes.error) console.warn('Error fetching movimentacoes_estoque:', movRes.error);

      const estoque = estoqueRes.data || [];
      const movimentacoes = movRes.data || [];

      const todayMidnight = getTodayMidnight();
      const porCategoria = {};
      const porLocalizacao = {};
      const alertItems = [];
      let totalItens = 0;
      let valorTotal = 0;
      let entradasHoje = 0;
      let saidasHoje = 0;
      const bystatus = { normal: 0, baixo: 0, critico: 0 };

      estoque.forEach((item) => {
        totalItens += item.quantidade || 0;
        valorTotal += item.valor_total || 0;

        // Status determination
        let status = 'normal';
        if (item.quantidade <= item.quantidade_minima) {
          status = 'critico';
        } else if (item.quantidade <= item.quantidade_minima * 1.5) {
          status = 'baixo';
        }
        bystatus[status] = (bystatus[status] || 0) + 1;

        if (status === 'critico' || status === 'baixo') {
          alertItems.push({
            id: item.id,
            nome: item.nome || item.descricao,
            quantidade: item.quantidade,
            minima: item.quantidade_minima,
            status,
          });
        }

        // By categoria
        if (item.categoria) {
          porCategoria[item.categoria] = (porCategoria[item.categoria] || 0) + (item.quantidade || 0);
        }

        // By localizacao
        if (item.localizacao) {
          porLocalizacao[item.localizacao] = (porLocalizacao[item.localizacao] || 0) + (item.quantidade || 0);
        }
      });

      // Count today's movements
      movimentacoes.forEach((mov) => {
        if (mov.created_at && new Date(mov.created_at).toISOString() >= todayMidnight) {
          if (mov.tipo === 'entrada') {
            entradasHoje += mov.quantidade || 0;
          } else if (mov.tipo === 'saida') {
            saidasHoje += mov.quantidade || 0;
          }
        }
      });

      setEstoque({
        totalItens,
        valorTotal: Math.round(valorTotal),
        bystatus,
        entradasHoje,
        saidasHoje,
        porCategoria,
        porLocalizacao,
        alertItems: alertItems.sort((a, b) => {
          if (a.status === 'critico') return -1;
          if (b.status === 'critico') return 1;
          return 0;
        }),
        items: estoque,
      });
    } catch (error) {
      console.warn('Exception in fetchEstoque:', error);
      setEstoque((prev) => ({
        ...prev,
        totalItens: 0,
        items: [],
      }));
    }
  }, [getTodayMidnight]);

  // Fetch Financeiro data
  const fetchFinanceiro = useCallback(async () => {
    try {
      const [despesasRes, medicoesRes] = await Promise.all([
        supabase.from('lancamentos_despesas').select('*'),
        supabase.from('medicoes').select('*'),
      ]);

      if (despesasRes.error) console.warn('Error fetching despesas:', despesasRes.error);
      if (medicoesRes.error) console.warn('Error fetching medicoes:', medicoesRes.error);

      const despesas = despesasRes.data || [];
      const medicoes = medicoesRes.data || [];

      const porCategoria = {};
      const porMes = {};
      const lancamentosRecentes = [];
      let totalDespesas = 0;
      let despesasPagas = 0;
      let despesasPendentes = 0;
      let totalMedicoes = 0;
      let medicoesAprovadas = 0;
      let saldoObra = 0;

      despesas.forEach((item) => {
        const valor = item.valor || 0;
        totalDespesas += valor;

        if (item.status === 'paga' || item.status === 'paid') {
          despesasPagas += valor;
        } else {
          despesasPendentes += valor;
        }

        // By categoria
        if (item.categoria) {
          porCategoria[item.categoria] = (porCategoria[item.categoria] || 0) + valor;
        }

        // By month
        if (item.data) {
          const month = new Date(item.data).toLocaleDateString('pt-BR', {
            month: 'short',
            year: 'numeric',
          });
          porMes[month] = (porMes[month] || 0) + valor;
        }

        lancamentosRecentes.push(item);
      });

      lancamentosRecentes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      medicoes.forEach((item) => {
        const valor = item.valor || 0;
        totalMedicoes += valor;

        if (item.status === 'aprovada' || item.status === 'approved') {
          medicoesAprovadas += valor;
        }

        saldoObra += valor;
      });

      setFinanceiro({
        totalDespesas: Math.round(totalDespesas),
        despesasPagas: Math.round(despesasPagas),
        despesasPendentes: Math.round(despesasPendentes),
        totalMedicoes: Math.round(totalMedicoes),
        medicoesAprovadas: Math.round(medicoesAprovadas),
        saldoObra: Math.round(saldoObra),
        porCategoria: Object.fromEntries(
          Object.entries(porCategoria).map(([k, v]) => [k, Math.round(v)])
        ),
        porMes: Object.fromEntries(
          Object.entries(porMes).map(([k, v]) => [k, Math.round(v)])
        ),
        lancamentosRecentes: lancamentosRecentes.slice(0, 5),
      });
    } catch (error) {
      console.warn('Exception in fetchFinanceiro:', error);
      setFinanceiro((prev) => ({
        ...prev,
        totalDespesas: 0,
      }));
    }
  }, []);

  // Fetch Expedição data
  const fetchCampo = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('expedicoes').select('*');

      if (error) {
        console.warn('Error fetching expedicoes:', error);
        return;
      }

      if (!data) {
        setCampo((prev) => ({
          ...prev,
          totalEnvios: 0,
          enviosDetalhados: [],
        }));
        return;
      }

      const todayMidnight = getTodayMidnight();
      const byStatus = {};
      const timeline = {};
      let pesoEnviado = 0;
      let pecasEnviadas = 0;
      let enviosHoje = 0;

      data.forEach((item) => {
        const status = item.status || 'pendente';
        byStatus[status] = (byStatus[status] || 0) + 1;

        pesoEnviado += item.peso || 0;
        pecasEnviadas += item.quantidade || 0;

        if (item.created_at && new Date(item.created_at).toISOString() >= todayMidnight) {
          enviosHoje += 1;
        }

        // Timeline by date
        if (item.data_envio) {
          const date = new Date(item.data_envio).toLocaleDateString();
          timeline[date] = (timeline[date] || 0) + (item.quantidade || 0);
        }
      });

      const enviosDetalhados = data
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
        .map((item) => ({
          id: item.id,
          cliente: item.cliente,
          quantidade: item.quantidade,
          peso: item.peso,
          status: item.status,
          data: item.data_envio,
        }));

      setCampo({
        totalEnvios: data.length,
        byStatus,
        pesoEnviado: Math.round(pesoEnviado),
        pecasEnviadas,
        enviosHoje,
        enviosDetalhados,
        timeline,
      });
    } catch (error) {
      console.warn('Exception in fetchCampo:', error);
      setCampo((prev) => ({
        ...prev,
        totalEnvios: 0,
        enviosDetalhados: [],
      }));
    }
  }, [getTodayMidnight]);

  // Fetch Equipes data
  const fetchEquipes = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('funcionarios').select('id, nome, funcao, equipe, ativo, created_at');

      if (error) {
        console.warn('Error fetching equipes:', error);
        return;
      }

      if (!data) {
        setEquipes((prev) => ({
          ...prev,
          totalFuncionarios: 0,
          items: [],
        }));
        return;
      }

      const porFuncao = {};
      const porEquipe = {};
      let ativos = 0;

      data.forEach((item) => {
        if (item.ativo) {
          ativos += 1;
        }

        if (item.funcao) {
          porFuncao[item.funcao] = (porFuncao[item.funcao] || 0) + 1;
        }

        if (item.equipe) {
          porEquipe[item.equipe] = (porEquipe[item.equipe] || 0) + 1;
        }
      });

      setEquipes({
        totalFuncionarios: data.length,
        ativos,
        porFuncao,
        porEquipe,
        items: data,
      });
    } catch (error) {
      console.warn('Exception in fetchEquipes:', error);
      setEquipes((prev) => ({
        ...prev,
        totalFuncionarios: 0,
        items: [],
      }));
    }
  }, []);

  // Unified refresh function
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCorte(),
        fetchProducao(),
        fetchHistorico(),
        fetchEstoque(),
        fetchFinanceiro(),
        fetchCampo(),
        fetchEquipes(),
      ]);
      setLastUpdate(new Date());
    } catch (error) {
      console.warn('Error in refresh:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchCorte, fetchProducao, fetchHistorico, fetchEstoque, fetchFinanceiro, fetchCampo, fetchEquipes]);

  // Setup real-time subscriptions
  const setupSubscriptions = useCallback(() => {
    try {
      // Subscribe to materiais_corte
      const corteSubscription = supabase
        .channel('materiais_corte_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'materiais_corte' }, () => {
          fetchCorte();
        })
        .subscribe();

      // Subscribe to pecas_producao
      const producaoSubscription = supabase
        .channel('pecas_producao_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pecas_producao' }, () => {
          fetchProducao();
        })
        .subscribe();

      // Subscribe to producao_historico
      const historicoSubscription = supabase
        .channel('producao_historico_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'producao_historico' }, () => {
          fetchHistorico();
        })
        .subscribe();

      // Subscribe to estoque
      const estoqueSubscription = supabase
        .channel('estoque_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'estoque' }, () => {
          fetchEstoque();
        })
        .subscribe();

      // Subscribe to movimentacoes_estoque
      const movSubscription = supabase
        .channel('movimentacoes_estoque_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'movimentacoes_estoque' }, () => {
          fetchEstoque();
        })
        .subscribe();

      // Subscribe to lancamentos_despesas
      const despesasSubscription = supabase
        .channel('lancamentos_despesas_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos_despesas' }, () => {
          fetchFinanceiro();
        })
        .subscribe();

      // Subscribe to medicoes
      const medicoesSubscription = supabase
        .channel('medicoes_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'medicoes' }, () => {
          fetchFinanceiro();
        })
        .subscribe();

      // Subscribe to expedicoes
      const campoSubscription = supabase
        .channel('expedicoes_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expedicoes' }, () => {
          fetchCampo();
        })
        .subscribe();

      // Subscribe to funcionarios
      const equipesSubscription = supabase
        .channel('funcionarios_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'funcionarios' }, () => {
          fetchEquipes();
        })
        .subscribe();

      subscriptionsRef.current = [
        corteSubscription,
        producaoSubscription,
        historicoSubscription,
        estoqueSubscription,
        movSubscription,
        despesasSubscription,
        medicoesSubscription,
        campoSubscription,
        equipesSubscription,
      ];
    } catch (error) {
      console.warn('Error setting up subscriptions:', error);
    }
  }, [fetchCorte, fetchProducao, fetchHistorico, fetchEstoque, fetchFinanceiro, fetchCampo, fetchEquipes]);

  // Initialize data on mount
  useEffect(() => {
    loadYesterdaySnapshot();
    refresh();
    setupSubscriptions();

    // Set up 60-second fallback interval
    intervalRef.current = setInterval(() => {
      refresh();
    }, 60000);

    return () => {
      // Cleanup subscriptions
      subscriptionsRef.current.forEach((sub) => {
        supabase.removeChannel(sub);
      });

      // Cleanup interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Save snapshot before unmount
      saveSnapshot();
    };
  }, []);

  // Save snapshot whenever data changes (with debounce via effect)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveSnapshot();
    }, 5000); // Save after 5 seconds of no changes

    return () => clearTimeout(timer);
  }, [corte, producao, historico, estoque, financeiro, campo, equipes, saveSnapshot]);

  return {
    corte,
    producao,
    historico,
    estoque,
    financeiro,
    campo,
    equipes,
    loading,
    lastUpdate,
    comparacaoDiaria,
    snapshotOntem,
    refresh,
  };
};
