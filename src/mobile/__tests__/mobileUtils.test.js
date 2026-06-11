// ============================================================
// Testes dos utilitários do super app mobile operacional
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest';
import { formatRelative, setLastRefresh, getLastRefresh } from '../ui/lastRefresh';
import { enqueue, getQueue, dequeue, queueSize } from '../ui/offlineQueue';
import { logSync, getSyncLog } from '../ui/syncLog';
import { isOnline } from '../ui/online';

beforeEach(() => { localStorage.clear(); });

describe('lastRefresh.formatRelative', () => {
  const now = 1_000_000_000_000;
  it('vazio quando sem timestamp', () => expect(formatRelative(0, now)).toBe(''));
  it('agora (<10s)', () => expect(formatRelative(now - 5_000, now)).toBe('agora'));
  it('segundos', () => expect(formatRelative(now - 30_000, now)).toBe('há 30s'));
  it('minutos', () => expect(formatRelative(now - 5 * 60_000, now)).toBe('há 5 min'));
  it('horas', () => expect(formatRelative(now - 3 * 3_600_000, now)).toBe('há 3 h'));
  it('dias', () => expect(formatRelative(now - 2 * 86_400_000, now)).toBe('há 2 d'));
});

describe('lastRefresh set/get', () => {
  it('0 quando ausente', () => expect(getLastRefresh()).toBe(0));
  it('persiste timestamp', () => { setLastRefresh(123456); expect(getLastRefresh()).toBe(123456); });
});

describe('offlineQueue', () => {
  it('enqueue → getQueue → dequeue → size', () => {
    expect(queueSize()).toBe(0);
    const n = enqueue('moverPecaEtapa', ['PEC-1', 'solda', null], 'PEC-1 → Solda');
    expect(n).toBe(1);
    expect(queueSize()).toBe(1);
    const q = getQueue();
    expect(q[0].action).toBe('moverPecaEtapa');
    expect(q[0].args).toEqual(['PEC-1', 'solda', null]);
    expect(q[0].label).toBe('PEC-1 → Solda');
    expect(q[0].id).toBeTruthy();
    dequeue(q[0].id);
    expect(queueSize()).toBe(0);
  });
  it('mantém ordem FIFO', () => {
    enqueue('a', [], 'A'); enqueue('b', [], 'B');
    expect(getQueue().map(o => o.action)).toEqual(['a', 'b']);
  });
  it('dequeue de id inexistente é no-op', () => {
    enqueue('a', [], 'A');
    dequeue('inexistente');
    expect(queueSize()).toBe(1);
  });
});

describe('syncLog', () => {
  it('newest-first e capa em 20', () => {
    for (let i = 0; i < 25; i++) logSync('op ' + i);
    const log = getSyncLog();
    expect(log.length).toBe(20);
    expect(log[0].label).toBe('op 24');
    expect(log[19].label).toBe('op 5');
  });
  it('label default quando vazio', () => {
    logSync();
    expect(getSyncLog()[0].label).toBe('Ação');
  });
});

describe('online.isOnline', () => {
  it('true por padrão', () => expect(isOnline()).toBe(true));
  it('false quando navigator.onLine=false', () => {
    const orig = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    expect(isOnline()).toBe(false);
    if (orig) Object.defineProperty(navigator, 'onLine', orig); else delete navigator.onLine;
  });
});
