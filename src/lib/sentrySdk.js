// Re-export enxuto do @sentry/react, carregado via dynamic import por
// ./monitoring.js. Importar só o necessário aqui permite tree-shaking
// (um `import('@sentry/react')` direto manteria TODO o SDK — replay, feedback…).
export { init, browserTracingIntegration, captureException, setUser } from '@sentry/react';
