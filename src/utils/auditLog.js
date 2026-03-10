/**
 * MONTEX ERP - Sistema de Log de Auditoria para Importações
 * Registra todas as operações de importação com detalhes completos
 */

const AUDIT_LOG_KEY = 'montex_audit_log';
const MAX_LOG_ENTRIES = 500;

export function registrarImportacao(dados) {
  const entry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    tipo: dados.tipo || 'importacao',
    modulo: dados.modulo || 'desconhecido',
    usuario: dados.usuario || 'admin',
    arquivo: dados.arquivo || null,
    totalRegistros: dados.totalRegistros || 0,
    registrosImportados: dados.registrosImportados || 0,
    registrosRejeitados: dados.registrosRejeitados || 0,
    duplicatasDetectadas: dados.duplicatasDetectadas || 0,
    erros: dados.erros || [],
    detalhes: dados.detalhes || null,
    status: dados.status || 'sucesso',
  };

  try {
    const logs = obterLogs();
    logs.unshift(entry); // Add at beginning (newest first)

    // Limit size
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.length = MAX_LOG_ENTRIES;
    }

    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
    console.log(`[Audit] ${entry.modulo}: ${entry.registrosImportados}/${entry.totalRegistros} importados`, entry);
  } catch (e) {
    console.error('[Audit] Erro ao salvar log:', e);
  }

  return entry;
}

export function obterLogs(filtros = {}) {
  try {
    const logs = JSON.parse(localStorage.getItem(AUDIT_LOG_KEY) || '[]');

    let filtrados = logs;

    if (filtros.modulo) {
      filtrados = filtrados.filter(l => l.modulo === filtros.modulo);
    }
    if (filtros.dataInicio) {
      filtrados = filtrados.filter(l => new Date(l.timestamp) >= new Date(filtros.dataInicio));
    }
    if (filtros.dataFim) {
      filtrados = filtrados.filter(l => new Date(l.timestamp) <= new Date(filtros.dataFim));
    }
    if (filtros.status) {
      filtrados = filtrados.filter(l => l.status === filtros.status);
    }

    return filtrados;
  } catch (e) {
    return [];
  }
}

export function limparLogs() {
  localStorage.removeItem(AUDIT_LOG_KEY);
}

export function exportarLogsCSV() {
  const logs = obterLogs();
  const headers = 'ID,Timestamp,Tipo,Módulo,Usuário,Arquivo,Total,Importados,Rejeitados,Duplicatas,Status\n';
  const rows = logs.map(l =>
    `${l.id},${l.timestamp},${l.tipo},${l.modulo},${l.usuario},${l.arquivo || ''},${l.totalRegistros},${l.registrosImportados},${l.registrosRejeitados},${l.duplicatasDetectadas},${l.status}`
  ).join('\n');
  return headers + rows;
}
