// ============================================================
// RelatorioProducaoCard — card + geração de relatório PDF de produção
// ============================================================
// Gera um PDF completo do estado de produção (por etapa, por funcionário e
// detalhe de peças por etapa) a partir das peças (pecas_producao). Usa jsPDF
// com tabelas desenhadas manualmente (sem autotable). Lógica de agregação em
// services/relatorioProducao.js (pura/testada).
// ============================================================
import React, { useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { FileDown, Loader2, Package, Weight, Activity, CheckCircle2 } from 'lucide-react';
import { resumoProducao, porFuncionario, pecasPorEtapa, ETAPAS_REL } from '@/services/relatorioProducao';

const fmtNum = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const fmtPeso = (kg) => {
  const n = Number(kg) || 0;
  return n >= 1000 ? (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' t'
                   : n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg';
};
const DETALHE_CAP = 120; // limite de linhas por etapa no detalhe do PDF

// Desenha uma tabela simples com cabeçalho, zebra e quebra de página.
function drawTable(doc, cols, rows, y, { margin = 10, width = 190, bottom = 285 } = {}) {
  const rowH = 6, headH = 7;
  const header = () => {
    doc.setFillColor(30, 41, 59); doc.rect(margin, y, width, headH, 'F');
    doc.setTextColor(226, 232, 240); doc.setFontSize(8); doc.setFont(undefined, 'bold');
    cols.forEach((c) => doc.text(String(c.label), c.align === 'right' ? c.x + c.w : c.x, y + 4.8, { align: c.align === 'right' ? 'right' : 'left' }));
    y += headH;
  };
  header();
  doc.setFont(undefined, 'normal');
  rows.forEach((row, i) => {
    if (y > bottom) { doc.addPage(); y = margin; header(); doc.setFont(undefined, 'normal'); }
    if (i % 2) { doc.setFillColor(241, 245, 249); doc.rect(margin, y, width, rowH, 'F'); }
    doc.setTextColor(15, 23, 42); doc.setFontSize(8);
    cols.forEach((c) => {
      const raw = row[c.k] == null ? '' : String(row[c.k]);
      const txt = doc.splitTextToSize(raw, c.w - 2)[0] || '';
      doc.text(txt, c.align === 'right' ? c.x + c.w : c.x, y + 4.1, { align: c.align === 'right' ? 'right' : 'left' });
    });
    y += rowH;
  });
  return y + 3;
}

export function gerarRelatorioProducaoPDF(pecas, obra, { data } = {}) {
  const resumo = resumoProducao(pecas);
  const funcs = porFuncionario(pecas);
  const grupos = pecasPorEtapa(pecas);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M = 10; const W = 190;
  const hoje = data || new Date().toLocaleString('pt-BR');
  let y = M;

  // Cabeçalho
  doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(15); doc.setFont(undefined, 'bold');
  doc.text('MONTEX — Relatório de Produção', M, 10);
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  const obraTxt = obra ? `Obra: ${obra.codigo ? obra.codigo + ' · ' : ''}${obra.nome || ''}` : 'Todas as obras';
  doc.text(obraTxt, M, 16);
  doc.text(`Gerado em ${hoje}`, 200, 16, { align: 'right' });
  y = 28;

  // KPIs
  const kpis = [
    ['Peças', fmtNum(resumo.totalPecas)],
    ['Quantidade', fmtNum(resumo.totalQtd)],
    ['Peso total', fmtPeso(resumo.totalPeso)],
    ['Concluído (env.+entr.)', fmtPeso(resumo.pesoConcluido)],
    ['Progresso', `${resumo.progressoPct}%`],
  ];
  const kw = W / kpis.length;
  kpis.forEach((k, i) => {
    const x = M + i * kw;
    doc.setDrawColor(203, 213, 225); doc.setFillColor(248, 250, 252); doc.roundedRect(x + 1, y, kw - 2, 16, 1.5, 1.5, 'FD');
    doc.setTextColor(100, 116, 139); doc.setFontSize(7.5); doc.text(k[0], x + 4, y + 5);
    doc.setTextColor(15, 23, 42); doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text(k[1], x + 4, y + 12);
    doc.setFont(undefined, 'normal');
  });
  y += 22;

  // Produção por etapa
  doc.setTextColor(15, 23, 42); doc.setFontSize(11); doc.setFont(undefined, 'bold');
  doc.text('Produção por etapa', M, y); y += 3; doc.setFont(undefined, 'normal');
  const colsEtapa = [
    { k: 'etapa', label: 'Etapa', x: M, w: 62 },
    { k: 'pecas', label: 'Peças', x: M + 62, w: 22, align: 'right' },
    { k: 'qtd', label: 'Qtd', x: M + 84, w: 26, align: 'right' },
    { k: 'peso', label: 'Peso', x: M + 110, w: 45, align: 'right' },
    { k: 'pct', label: '% peso', x: M + 155, w: 35, align: 'right' },
  ];
  y = drawTable(doc, colsEtapa, resumo.porEtapa.map((e) => ({
    etapa: e.label, pecas: fmtNum(e.pecas), qtd: fmtNum(e.qtd), peso: fmtPeso(e.peso), pct: `${e.pct}%`,
  })), y);

  // Produção por funcionário
  if (funcs.length) {
    if (y > 250) { doc.addPage(); y = M; }
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.text('Produção por funcionário (peso por etapa)', M, y); y += 3; doc.setFont(undefined, 'normal');
    const colsF = [
      { k: 'nome', label: 'Funcionário', x: M, w: 52 },
      { k: 'fab', label: 'Fabricação', x: M + 52, w: 26, align: 'right' },
      { k: 'sol', label: 'Solda', x: M + 78, w: 24, align: 'right' },
      { k: 'pin', label: 'Pintura', x: M + 102, w: 24, align: 'right' },
      { k: 'exp', label: 'Expedição', x: M + 126, w: 28, align: 'right' },
      { k: 'tot', label: 'Total', x: M + 154, w: 36, align: 'right' },
    ];
    y = drawTable(doc, colsF, funcs.map((f) => ({
      nome: f.funcionario,
      fab: f.porEtapa.fabricacao ? fmtPeso(f.porEtapa.fabricacao) : '—',
      sol: f.porEtapa.solda ? fmtPeso(f.porEtapa.solda) : '—',
      pin: f.porEtapa.pintura ? fmtPeso(f.porEtapa.pintura) : '—',
      exp: f.porEtapa.expedido ? fmtPeso(f.porEtapa.expedido) : '—',
      tot: fmtPeso(f.peso),
    })), y);
  }

  // Detalhe por etapa
  const colsD = [
    { k: 'marca', label: 'Marca', x: M, w: 28 },
    { k: 'perfil', label: 'Perfil', x: M + 28, w: 32 },
    { k: 'material', label: 'Material', x: M + 60, w: 26 },
    { k: 'qtd', label: 'Qtd', x: M + 86, w: 16, align: 'right' },
    { k: 'peso', label: 'Peso', x: M + 102, w: 28, align: 'right' },
    { k: 'resp', label: 'Responsável', x: M + 130, w: 60 },
  ];
  grupos.forEach((g) => {
    doc.addPage(); y = M;
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 23, 42);
    doc.text(`Peças — ${g.label}  (${fmtNum(g.itens.length)} · ${fmtPeso(g.itens.reduce((s, i) => s + i.peso, 0))})`, M, y);
    y += 4; doc.setFont(undefined, 'normal');
    const itens = g.itens.slice(0, DETALHE_CAP);
    y = drawTable(doc, colsD, itens.map((it) => ({
      marca: it.marca, perfil: it.perfil, material: it.material,
      qtd: fmtNum(it.quantidade), peso: fmtPeso(it.peso), resp: it.responsavel || '—',
    })), y);
    if (g.itens.length > DETALHE_CAP) {
      doc.setFontSize(8); doc.setTextColor(100, 116, 139);
      doc.text(`… mostrando ${DETALHE_CAP} de ${fmtNum(g.itens.length)} peças desta etapa (as de maior peso).`, M, y + 2);
    }
  });

  // Rodapé com paginação
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
    doc.text(`MONTEX ERP · Relatório de Produção · ${obraTxt}`, M, 292);
    doc.text(`Página ${p}/${total}`, 200, 292, { align: 'right' });
  }

  const nome = `relatorio_producao_${(obra?.codigo || 'geral').toString().replace(/[^\w.-]+/g, '_')}.pdf`;
  doc.save(nome);
  return { paginas: total, resumo };
}

export default function RelatorioProducaoCard({ pecas = [], obra = null }) {
  const [gerando, setGerando] = useState(false);
  const resumo = useMemo(() => resumoProducao(pecas), [pecas]);

  const gerar = async () => {
    if (!pecas.length) { toast.error('Sem peças para gerar o relatório'); return; }
    setGerando(true);
    try {
      const { paginas } = gerarRelatorioProducaoPDF(pecas, obra);
      toast.success(`Relatório PDF gerado (${paginas} páginas)`);
    } catch (e) {
      toast.error('Erro ao gerar PDF: ' + (e.message || e));
    } finally { setGerando(false); }
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-orange-400" /> Relatório de Produção</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {obra ? `${obra.codigo ? obra.codigo + ' · ' : ''}${obra.nome || ''}` : 'Todas as obras'} · PDF completo (por etapa, por funcionário e detalhe de peças)
          </p>
        </div>
        <button onClick={gerar} disabled={gerando || !pecas.length}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-semibold disabled:opacity-50">
          {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          Gerar Relatório PDF
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <Mini icon={Package} label="Peças" value={fmtNum(resumo.totalPecas)} sub={`${fmtNum(resumo.totalQtd)} un`} />
        <Mini icon={Weight} label="Peso total" value={fmtPeso(resumo.totalPeso)} />
        <Mini icon={CheckCircle2} label="Concluído" value={fmtPeso(resumo.pesoConcluido)} tone="text-emerald-400" />
        <Mini icon={Activity} label="Progresso" value={`${resumo.progressoPct}%`} tone="text-orange-400" />
      </div>

      {/* Distribuição por etapa (barra) */}
      <div className="mt-4 space-y-1.5">
        {resumo.porEtapa.filter((e) => e.peso > 0).map((e) => (
          <div key={e.key} className="flex items-center gap-2 text-xs">
            <span className="w-40 text-slate-300 truncate">{e.label}</span>
            <div className="flex-1 h-2 bg-slate-700/60 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${e.pct}%`, background: e.cor }} />
            </div>
            <span className="w-24 text-right text-slate-400">{fmtPeso(e.peso)}</span>
            <span className="w-16 text-right text-slate-500">{fmtNum(e.pecas)} pç</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Mini({ icon: Icon, label, value, sub, tone = 'text-white' }) {
  return (
    <div className="bg-slate-900/50 border border-slate-700/40 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-slate-400 text-[11px]"><Icon className="w-3.5 h-3.5" /> {label}</div>
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}
