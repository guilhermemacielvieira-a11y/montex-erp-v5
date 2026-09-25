// ============================================================
// FORMATAÇÃO MOBILE — fonte única (paridade com o desktop)
// ============================================================
// Regras do ERP (PR #82): PESO sempre em kg, pt-BR, sem casas decimais
// ("27.738 kg"); nunca converter para toneladas nas telas. Datas de
// "hoje" SEMPRE no fuso local: `toISOString()` devolve UTC e, no Brasil
// (UTC-3), entre 21h e meia-noite gera a data de AMANHÃ (bug #2 do
// CLAUDE.md, versão "escrita"). Use `hojeLocalISO()`.
// ============================================================

export const fmtNum = (n, dec = 0) =>
  (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

// Peso em kg, inteiro, pt-BR — mesma assinatura de RelatorioProducaoCard/Estoque.
export const fmtPeso = (kg) => fmtNum(kg, 0) + ' kg';

// Versão curta para rótulos de gráfico (eixos/LabelList): "27,7k" acima de 10 t.
export const fmtPesoCurto = (kg) => {
  const v = Number(kg) || 0;
  if (Math.abs(v) >= 10000) return (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k';
  return fmtNum(v, 0);
};

export const fmtMoney = (n) => 'R$ ' + fmtNum(n, 0);

export const fmtPct = (n, dec = 0) => fmtNum(n, dec) + '%';

// 'YYYY-MM-DD' da data LOCAL (não UTC). Aceita uma data base para testes.
export const hojeLocalISO = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
