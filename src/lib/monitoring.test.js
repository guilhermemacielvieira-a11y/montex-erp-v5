import { describe, it, expect } from 'vitest';
import { scrubString, scrubEvent, captureException, setMonitoringUser, isMonitoringEnabled } from './monitoring';

describe('monitoring scrubbing', () => {
  it('remove e-mails, JWTs, bearer e parâmetros sensíveis', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const s = scrubString(`user joao@montex.com.br token ${jwt} Bearer abc.def-123 ?apikey=xyz&x=1 access_token=foo#refresh_token=bar`);
    expect(s).not.toMatch(/joao@montex/);
    expect(s).not.toContain(jwt);
    expect(s).toContain('[email]');
    expect(s).toContain('[jwt]');
    expect(s).toContain('Bearer [token]');
    expect(s).toContain('apikey=[redacted]');
    expect(s).toContain('access_token=[redacted]');
    expect(s).toContain('refresh_token=[redacted]');
    expect(s).toContain('x=1');
  });

  it('scrubEvent mantém só id/role do usuário e limpa headers/extra', () => {
    const ev = scrubEvent({
      user: { id: 'u1', role: 'admin', email: 'a@b.com', ip_address: '1.2.3.4' },
      request: { headers: { Authorization: 'Bearer x', 'User-Agent': 'ua' }, cookies: 'c=1', url: 'https://x/?token=abc' },
      extra: { email: 'a@b.com', nested: { msg: 'falhou para c@d.com' } },
      exception: { values: [{ value: 'Erro ao logar fulano@x.com' }] },
    });
    expect(ev.user).toEqual({ id: 'u1', role: 'admin' });
    expect(ev.request.headers.Authorization).toBeUndefined();
    expect(ev.request.cookies).toBeUndefined();
    expect(ev.request.url).toBe('https://x/?token=[redacted]');
    expect(ev.extra.email).toBe('[redacted]');
    expect(ev.extra.nested.msg).toBe('falhou para [email]');
    expect(ev.exception.values[0].value).toBe('Erro ao logar [email]');
  });

  it('é no-op sem VITE_SENTRY_DSN', () => {
    expect(isMonitoringEnabled()).toBe(false);
    expect(() => captureException(new Error('x'))).not.toThrow();
    expect(() => setMonitoringUser({ id: 1, role: 'admin', email: 'x@y.z' })).not.toThrow();
  });
});
