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
// ============================================

import { listasMaterial } from './database';

// Estado central: Map de marca → { status, dataInicio, dataFim }
const corteStatus = new Map();

// Listeners para notificações em tempo real
const listeners = new Set();

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

// Inicializar ao carregar
initializeFromDatabase();

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
  return true;
}

// Marcar uma marca como "finalizado"
export function finalizarCorte(marca) {
  const item = corteStatus.get(marca);
  if (!item) return false;
  item.status = 'finalizado';
  item.dataFim = new Date().toISOString();
  notifyListeners();
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
  return true;
}

// Finalizar várias marcas de uma vez
export function finalizarCorteEmLote(marcas) {
  let count = 0;
  marcas.forEach(marca => {
    const item = corteStatus.get(marca);
    if (item && item.status !== 'finalizado') {
      item.status = 'finalizado';
      item.dataFim = new Date().toISOString();
      count++;
    }
  });
  if (count > 0) notifyListeners();
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
