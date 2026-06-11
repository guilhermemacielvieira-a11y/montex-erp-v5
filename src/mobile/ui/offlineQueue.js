// ============================================================
// DESIGN SYSTEM MOBILE — Fila de escrita offline
// ============================================================
// Enfileira mutações feitas offline (localStorage) para sincronizar ao
// reconectar. ESCOPO: apenas operações IDEMPOTENTES (re-aplicar dá o
// mesmo resultado) — avançar etapa (set etapa=X) e despachar romaneio
// (set status=X). Operações ADITIVAS (estoque +/-, addMedicao) NÃO entram
// aqui: o replay duplicaria; elas exigem online. Cada op guarda o nome da
// ação do ERPContext + args serializáveis; o SyncManager mapeia e replica.
//
// ROBUSTEZ (PR4): cada op carrega `attempts`. Falha ONLINE não bloqueia
// mais a fila (sem head-of-line blocking): markFailed() incrementa e, ao
// atingir MAX_ATTEMPTS, move a op para a dead-letter (montex_offline_dead),
// visível em Configurações → "Falhas de sincronização" com Tentar/Descartar.
// ============================================================
const LS = 'montex_offline_queue';
const LS_DEAD = 'montex_offline_dead';
export const QUEUE_EVENT = 'montex-queue-change';
export const MAX_ATTEMPTS = 5;
const DEAD_KEEP = 20;

function read(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function write(key, arr) {
  try { localStorage.setItem(key, JSON.stringify(arr)); } catch { /* noop */ }
  try { window.dispatchEvent(new Event(QUEUE_EVENT)); } catch { /* noop */ }
}

export function getQueue() { return read(LS); }
function setQueue(q) { write(LS, q); }

export function getDead() { return read(LS_DEAD); }
function setDead(d) { write(LS_DEAD, d); }

export function enqueue(action, args, label) {
  const q = getQueue();
  q.push({ id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, action, args, label: label || action, ts: Date.now(), attempts: 0 });
  setQueue(q);
  return q.length;
}

export function dequeue(id) {
  setQueue(getQueue().filter(o => o.id !== id));
}

export function queueSize() {
  return getQueue().length;
}

export function deadSize() {
  return getDead().length;
}

// Falha de replay ONLINE: incrementa tentativas; na MAX_ATTEMPTS-ésima a op
// vai para a dead-letter (não bloqueia o resto da fila). Retorna true se
// a op foi movida para a dead-letter.
export function markFailed(id, errMsg) {
  const q = getQueue();
  const op = q.find(o => o.id === id);
  if (!op) return false;
  op.attempts = (Number(op.attempts) || 0) + 1;
  op.lastError = String(errMsg || 'erro desconhecido').slice(0, 200);
  op.lastTry = Date.now();
  if (op.attempts >= MAX_ATTEMPTS) {
    setQueue(q.filter(o => o.id !== id));
    setDead([op, ...getDead()].slice(0, DEAD_KEEP));
    return true;
  }
  setQueue(q);
  return false;
}

// Devolve uma op da dead-letter para a fila (zera tentativas) — o
// SyncManager tenta de novo no próximo flush (QUEUE_EVENT dispara um).
export function retryDead(id) {
  const d = getDead();
  const op = d.find(o => o.id === id);
  if (!op) return;
  setDead(d.filter(o => o.id !== id));
  const q = getQueue();
  q.push({ ...op, attempts: 0, lastError: undefined, lastTry: undefined });
  setQueue(q);
}

export function discardDead(id) {
  setDead(getDead().filter(o => o.id !== id));
}
