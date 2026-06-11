// ============================================================
// DESIGN SYSTEM MOBILE — Exportar CSV
// ============================================================
// Gera e baixa um CSV (separador ';' + BOM = abre certo no Excel pt-BR).
// No navegador/PWA dispara o download; no app nativo (Capacitor) o ideal
// seria o plugin de Share/Filesystem — ver MOBILE-IOS-SETUP.md.
// ============================================================
const esc = (v) => {
  const s = String(v ?? '');
  return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map(r => r.map(esc).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
