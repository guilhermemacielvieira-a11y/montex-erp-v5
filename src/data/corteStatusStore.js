// ============================================
// CORTE STATUS STORE - Estado Compartilhado
// ============================================
// Controla o status de corte de cada marca/posição
// Compartilhado entre KanbanCortePage e KanbanProducaoIntegrado
//
// Status possíveis:
//   'aguardando'  → Peça na fila para corte
//   'cortando'    → Peça sendo cortada agora
//   'finalizado'  → Corte concluído
//
// Persistência: Supabase (pecas_producao.status_corte)
// Padrão: optimistic local update + async Supabase sync
// ============================================

import { listasMaterial } from './database';
import { pecasApi } from '../api/supabaseClient';

// Estado central: Map de marca → { status, dataInicio, dataFim }
const corteStatus = new Map();

// Listeners para notificações em tempo real
const listeners = new Set();

// Supabase sync state
let supabaseReady = false;
const supabaseItemMap = new Map(); // marca → id (Supabase row id)

// Inicializar todas as marcas da lista de corte como 'aguardando'
function initializeFromDatabase() {
  const lista = listasMaterial.find(l => l.tipo === 'materiais_corte');
  if (!lista || !lista.itens) return;

  lista.itens.forEach(item => {
    if (!corteStatus.has(item.marca)) {
      corteStatus.set(item.marca, {
        marca: item.marca,
        peca: item.peca,
        perfil: item.perfil,
        comprimento: item.comprimento,
        material: item.material,
        quantidade: item.quantidade,
        peso: item.peso,
        status: 'aguardando',
        dataInicio: null,
        dataFim: null,
        maquina: null
      });
    }
  });
}

// Inicializar ao carregar (dados locais imediatos)
initializeFromDatabase();

// ============================================
// SUPABASE SYNC - Carregar status persistido
// ============================================

/**
 * Carrega status de corte do Supabase (pecas_producao).
 * Sobrescreve o status local com o que está salvo no banco.
 * Retorna Promise para KanbanCortePage poder aguardar.
 */
export async function loadFromSupabase() {
  try {
    const pecas = await pecasApi.getAll('marca', true);
    if (!pecas || pecas.length === 0) {
      supabaseReady = true;
      return;
    }

    pecas.forEach(peca => {
      // Mapear marca → id para updates futuros
      if (peca.marca) {
        supabaseItemMap.set(peca.marca, peca.id);
      }

      // Se a peça tem status_corte salvo E existe no nosso Map local, restaurar
      if (peca.marca && peca.status_corte && corteStatus.has(peca.marca)) {
        const item = corteStatus.get(peca.marca);
        // Só atualizar se o status do Supabase é diferente do padrão
        if (['cortando', 'finalizado'].includes(peca.status_corte)) {
          item.status = peca.status_corte;
          item.dataInicio = peca.data_inicio_corte || peca.data_inicio || item.dataInicio;
          item.dataFim = peca.data_fim_corte || peca.data_fim || item.dataFim;
        }
      }
    });

    supabaseReady = true;
    notifyListeners(); // Atualizar UI com dados persistidos
    console.log(`[CorteStore] Supabase sync: ${supabaseItemMap.size} peças mapeadas`);
  } catch (e) {
    // Fallback silencioso — dados locais continuam funcionando
    console.warn('[CorteStore] Supabase indisponível, usando dados locais:', e.message);
    supabaseReady = false;
  }
}

// Iniciar preload do Supabase em background (non-blocking)
loadFromSupabase();

// ============================================
// NOTIFICAÇÕES
// ============================================
function notifyListeners() {
  listeners.forEach(fn => {
    try { fn(); } catch(e) { console.error('Listener error:', e); }
  });
}

export function subscribeCorteChanges(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// ============================================
// AÇÕES DE CORTE
// ============================================

// Marcar uma marca como "cortando"
export function iniciarCorte(marca, maquina = null) {
  const item = corteStatus.get(marca);
  if (!item) return false;
  item.status = 'cortando';
  item.dataInicio = new Date().toISOString();
  item.maquina = maquina;
  notifyListeners();

  // Sync async para Supabase
  if (supabaseReady) {
    const id = supabaseItemMap.get(marca);
    if (id) {
      pecasApi.update(id, {
        status_corte: 'cortando',
        data_inicio_corte: item.dataInicio
      }).catch(e => console.error('[CorteStore] Sync iniciarCorte:', e.message));
    }
  }
  return true;
}

// Marcar uma marca como "finalizado"
export function finalizarCorte(marca) {
  const item = corteStatus.get(marca);
  if (!item) return false;
  item.status = 'finalizado';
  item.dataFim = new Date().toISOString();
  notifyListeners();

  // Sync async para Supabase
  if (supabaseReady) {
    const id = supabaseItemMap.get(marca);
    if (id) {
      pecasApi.update(id, {
        status_corte: 'finalizado',
        data_fim_corte: item.dataFim
      }).catch(e => console.error('[CorteStore] Sync finalizarCorte:', e.message));
    }
  }
  return true;
}

// Voltar uma marca para "aguardando"
export function resetarCorte(marca) {
  const item = corteStatus.get(marca);
  if (!item) return false;
  item.status = 'aguardando';
  item.dataInicio = null;
  item.dataFim = null;
  item.maquina = null;
  notifyListeners();

  // Sync async para Supabase
  if (supabaseReady) {
    const id = supabaseItemMap.get(marca);
    if (id) {
      pecasApi.update(id, {
        status_corte: 'aguardando',
        data_inicio_corte: null,
        data_fim_corte: null
      }).catch(e => console.error('[CorteStore] Sync resetarCorte:', e.message));
    }
  }
  return true;
}

// Finalizar várias marcas de uma vez
export function finalizarCorteEmLote(marcas) {
  let count = 0;
  const now = new Date().toISOString();
  const updatedMarcas = [];

  marcas.forEach(marca => {
    const item = corteStatus.get(marca);
    if (item && item.status !== 'finalizado') {
      item.status = 'finalizado';
      item.dataFim = now;
      count++;
      updatedMarcas.push(marca);
    }
  });
  if (count > 0) notifyListeners();

  // Batch sync async para Supabase
  if (supabaseReady && updatedMarcas.length > 0) {
    const promises = updatedMarcas.map(marca => {
      const id = supabaseItemMap.get(marca);
      if (!id) return Promise.resolve();
      return pecasApi.update(id, {
        status_corte: 'finalizado',
        data_fim_corte: now
      });
    });
    Promise.allSettled(promises).then(results => {
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) console.warn(`[CorteStore] Lote: ${failed}/${updatedMarcas.length} falhas no sync`);
    });
  }
  return count;
}

// ============================================
// CONSULTAS
// ============================================

// Obter status de uma marca específica
export function getCorteStatus(marca) {
  return corteStatus.get(marca) || null;
}

// Obter todos os itens
export function getAllCorteItems() {
  return Array.from(corteStatus.values());
}

// Obter itens por status
export function getCorteItemsByStatus(status) {
  return Array.from(corteStatus.values()).filter(i => i.status === status);
}

// Obter itens por categoria/tipo de peça
export function getCorteItemsByTipo(tipo) {
  return Array.from(corteStatus.values()).filter(i => i.peca === tipo);
}

// Verificar se uma marca está cortada
export function isMarcaCortada(marca) {
  const item = corteStatus.get(marca);
  return item ? item.status === 'finalizado' : false;
}

// Contar cortadas de um array de marcas (para BOM de conjunto)
export function contarCortadasParaConjunto(marcasComQuantidade) {
  // marcasComQuantidade = [{ marca, quantidade }, ...]
  let totalPecas = 0;
  let cortadas = 0;

  marcasComQuantidade.forEach(({ marca, quantidade }) => {
    totalPecas += quantidade;
    const item = corteStatus.get(marca);
    if (item && item.status === 'finalizado') {
      cortadas += quantidade;
    }
  });

  return { totalPecas, cortadas };
}

// ============================================
// MÉTRICAS / KPIs
// ============================================

export function getCorteMetrics() {
  const items = Array.from(corteStatus.values());

  const aguardando = items.filter(i => i.status === 'aguardando');
  const cortando = items.filter(i => i.status === 'cortando');
  const finalizado = items.filter(i => i.status === 'finalizado');

  const pesoTotal = items.reduce((s, i) => s + (i.peso || 0), 0);
  const pesoAguardando = aguardando.reduce((s, i) => s + (i.peso || 0), 0);
  const pesoCortando = cortando.reduce((s, i) => s + (i.peso || 0), 0);
  const pesoFinalizado = finalizado.reduce((s, i) => s + (i.peso || 0), 0);

  const qtdTotal = items.reduce((s, i) => s + (i.quantidade || 0), 0);
  const qtdAguardando = aguardando.reduce((s, i) => s + (i.quantidade || 0), 0);
  const qtdCortando = cortando.reduce((s, i) => s + (i.quantidade || 0), 0);
  const qtdFinalizado = finalizado.reduce((s, i) => s + (i.quantidade || 0), 0);

  // Categorias únicas
  const categorias = {};
  items.forEach(i => {
    if (!categorias[i.peca]) {
      categorias[i.peca] = { total: 0, finalizado: 0, peso: 0, pesoFinalizado: 0 };
    }
    categorias[i.peca].total++;
    categorias[i.peca].peso += i.peso || 0;
    if (i.status === 'finalizado') {
      categorias[i.peca].finalizado++;
      categorias[i.peca].pesoFinalizado += i.peso || 0;
    }
  });

  return {
    totalMarcas: items.length,
    aguardando: aguardando.length,
    cortando: cortando.length,
    finalizado: finalizado.length,
    pesoTotal: Math.round(pesoTotal * 10) / 10,
    pesoAguardando: Math.round(pesoAguardando * 10) / 10,
    pesoCortando: Math.round(pesoCortando * 10) / 10,
    pesoFinalizado: Math.round(pesoFinalizado * 10) / 10,
    qtdTotal,
    qtdAguardando,
    qtdCortando,
    qtdFinalizado,
    progressoPeso: pesoTotal > 0 ? Math.round((pesoFinalizado / pesoTotal) * 100) : 0,
    progressoMarcas: items.length > 0 ? Math.round((finalizado.length / items.length) * 100) : 0,
    categorias
  };
}

// Obter todas as categorias/tipos únicos
export function getCorteCategorias() {
  const tipos = new Set();
  corteStatus.forEach(item => tipos.add(item.peca));
  return Array.from(tipos).sort();
}
