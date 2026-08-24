// ============================================================
// RelatorioProducaoCard — card + geração de relatório PDF de produção
// ============================================================
// Gera um PDF completo do estado de produção (por etapa, por funcionário e
// detalhe de peças por etapa) a partir das peças (pecas_producao). Usa jsPDF
// com tabelas desenhadas manualmente (sem autotable). Lógica de agregação em
// services/relatorioProducao.js (pura/testada).
// ============================================================
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FileDown, Loader2, Package, Weight, Activity, CheckCircle2 } from 'lucide-react';
import { resumoProducao } from '@/services/relatorioProducao';
import { gerarRelatorioProducaoPDF } from '@/services/relatorioProducaoPDF';

const fmtNum = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const fmtPeso = (kg) => {
  const n = Number(kg) || 0;
  return n >= 1000 ? (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' t'
                   : n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg';
};
export default function RelatorioProducaoCard({ pecas = [], obra = null, estoque = [] }) {
  const [gerando, setGerando] = useState(false);
  const resumo = useMemo(() => resumoProducao(pecas), [pecas]);

  const gerar = async () => {
    if (!pecas.length) { toast.error('Sem peças para gerar o relatório'); return; }
    setGerando(true);
    try {
      const { paginas } = gerarRelatorioProducaoPDF(pecas, obra, { estoque });
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
