/**
 * Monitoramento de erros (Sentry) — MONTEX ERP V5
 *
 * - No-op total quando VITE_SENTRY_DSN não está definido (dev/local/testes).
 * - @sentry/react é carregado via dynamic import SÓ quando há DSN, então não
 *   pesa no bundle inicial de quem não usa.
 * - Chamadas feitas antes do SDK terminar de carregar (ex.: erro no boot,
 *   setUser após login) ficam numa fila curta e são reenviadas no init.
 * - beforeSend/beforeBreadcrumb removem e-mails, JWTs, tokens e chaves de API
 *   de TODO o evento. O usuário é identificado só por id + role (sem e-mail).
 */

const DSN = import.meta.env.VITE_SENTRY_DSN;
// Injetado pelo Vite (define em vite.config.js): SHA do commit no Vercel.
// eslint-disable-next-line no-undef
const RELEASE = (typeof __APP_RELEASE__ !== 'undefined' && __APP_RELEASE__) || undefined;

let sentry = null;          // módulo @sentry/react depois de carregado
let initPromise = null;
const pending = [];          // ações enfileiradas antes do SDK carregar
const MAX_PENDING = 20;

// ------------------------------------------------------------------
// Scrubbing de dados sensíveis
// ------------------------------------------------------------------
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// JWT (Supabase access/anon/service tokens começam com eyJ)
const JWT_RE = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g;
const BEARER_RE = /(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi;
// Parâmetros de query/fragmento e pares chave=valor com nomes sensíveis
const PARAM_RE = /((?:access_token|refresh_token|id_token|token|apikey|api_key|key|password|senha|secret|code)=)[^&#\s"']+/gi;
// Chaves novas do Supabase (sb_publishable_/sb_secret_) e PATs do GitHub
const KEY_RE = /\b(?:sb_(?:secret|publishable)_[A-Za-z0-9_-]{10,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g;
const SENSITIVE_KEY_RE = /^(authorization|cookie|set-cookie|password|senha|token|access_token|refresh_token|apikey|api_key|secret|email|e-mail)$/i;

export function scrubString(str) {
  if (typeof str !== 'string' || !str) return str;
  return str
    .replace(JWT_RE, '[jwt]')
    .replace(BEARER_RE, '$1[token]')
    .replace(PARAM_RE, '$1[redacted]')
    .replace(KEY_RE, '[key]')
    .replace(EMAIL_RE, '[email]');
}

export function scrubDeep(value, depth = 0, seen = new WeakSet()) {
  if (value == null) return value;
  if (typeof value === 'string') return scrubString(value);
  if (typeof value !== 'object' || depth > 12) return value;
  if (seen.has(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = scrubDeep(value[i], depth + 1, seen);
    return value;
  }
  for (const k of Object.keys(value)) {
    if (SENSITIVE_KEY_RE.test(k) && value[k] != null && typeof value[k] !== 'object') {
      value[k] = '[redacted]';
    } else {
      value[k] = scrubDeep(value[k], depth + 1, seen);
    }
  }
  return value;
}

export function scrubEvent(event) {
  if (!event) return event;
  if (event.user) {
    // Só id e role chegam ao Sentry — nunca e-mail/nome/IP.
    const { id, role } = event.user;
    event.user = { ...(id != null ? { id } : {}), ...(role ? { role } : {}) };
  }
  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers.Authorization;
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
      delete event.request.headers.Cookie;
    }
  }
  const { user, ...rest } = event;
  scrubDeep(rest);
  return user ? { ...rest, user } : rest;
}

// ------------------------------------------------------------------
// API pública (segura de chamar sempre — vira no-op sem DSN)
// ------------------------------------------------------------------
export function isMonitoringEnabled() {
  return Boolean(DSN);
}

function runOrQueue(fn) {
  if (!DSN) return;
  if (sentry) { try { fn(sentry); } catch (_) { /* nunca quebrar o app */ } return; }
  if (pending.length < MAX_PENDING) pending.push(fn);
}

export function initMonitoring() {
  if (!DSN || initPromise) return initPromise;
  initPromise = import('./sentrySdk')
    .then((S) => {
      S.init({
        dsn: DSN,
        environment: import.meta.env.MODE,
        release: RELEASE,
        sendDefaultPii: false,
        integrations: [S.browserTracingIntegration()],
        tracesSampleRate: 0.1,
        // Session Replay desligado (sem integração e taxas zeradas)
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        beforeSend: (event) => scrubEvent(event),
        beforeSendTransaction: (event) => scrubEvent(event),
        beforeBreadcrumb: (crumb) => scrubDeep(crumb),
      });
      sentry = S;
      while (pending.length) {
        const fn = pending.shift();
        try { fn(S); } catch (_) { /* ignore */ }
      }
      return S;
    })
    .catch((err) => {
      console.warn('[monitoring] Falha ao carregar Sentry:', err?.message || err);
      pending.length = 0;
      return null;
    });
  return initPromise;
}

export function captureException(error, context) {
  runOrQueue((S) => S.captureException(error, context));
}

/** Identifica o usuário logado por id + role (sem e-mail). null = logout. */
export function setMonitoringUser(user) {
  const u = user && user.id != null ? { id: String(user.id), ...(user.role ? { role: user.role } : {}) } : null;
  runOrQueue((S) => S.setUser(u));
}
