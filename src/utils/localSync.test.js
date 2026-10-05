import { describe, it, expect, vi, afterEach } from 'vitest';
import { notifyLocalChange, subscribeLocalKeys } from './localSync';

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('localSync', () => {
  afterEach(() => vi.useRealTimers());

  it('entrega notificação da mesma aba (assíncrona) só para chaves assinadas', async () => {
    const cb = vi.fn();
    const off = subscribeLocalKeys(['a'], cb, { fallbackMs: 0 });
    notifyLocalChange('b');
    notifyLocalChange('a');
    notifyLocalChange('a'); // agrupado
    expect(cb).not.toHaveBeenCalled(); // microtask, não síncrono
    await tick();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith('a', 'local');
    off();
    notifyLocalChange('a');
    await tick();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('repassa o evento storage de outras abas', () => {
    const cb = vi.fn();
    const off = subscribeLocalKeys(['k'], cb, { fallbackMs: 0 });
    window.dispatchEvent(new StorageEvent('storage', { key: 'outra' }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'k' }));
    expect(cb).toHaveBeenCalledWith('k', 'storage');
    expect(cb).toHaveBeenCalledTimes(1);
    off();
  });

  it('fallback lento dispara no intervalo configurado', () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const off = subscribeLocalKeys(['k'], cb, { fallbackMs: 30000 });
    vi.advanceTimersByTime(29999);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledWith(null, 'fallback');
    off();
  });
});
