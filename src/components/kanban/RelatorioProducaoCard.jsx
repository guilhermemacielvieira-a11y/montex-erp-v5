// ============================================================
// RelatorioProducaoCard — card + geração de relatório PDF de produção
// ============================================================
// Gera um PDF completo do estado de produção (por etapa, por funcionário e
// detalhe de peças por etapa) a partir das peças (pecas_producao). Usa jsPDF
// com tabelas desenhadas manualmente (sem autotable). Lógica de agregação em
// services/relatorioProducao.js (pura/testada).
// ============================================================
import React, { useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FileDown, Loader2, Package, Weight, Activity, CheckCircle2, AlertTriangle, Factory, XCircle } from 'lucide-react';
import { resumoProducao, bloqueioFabricacao, fabricabilidadePecas } from '@/services/relatorioProducao';
import { resumoMaterialObra } from '@/services/estoqueAnalytics';
import { gerarRelatorioProducaoPDF } from '@/services/relatorioProducaoPDF';
import { gerarRelatorioFabricabilidadePDF } from '@/services/relatorioFabricabilidadePDF';

const fmtNum = (n) => (Number(n) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
// Peso SEMPRE em kg (sem conversão para toneladas) — padronizado com a planilha.
const fmtPeso = (kg) => (Number(kg) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg';
export default function RelatorioProducaoCard({ pecas = [], obra = null, estoque = [] }) {
  const [gerando, setGerando] = useState(false);
  const [gerandoFab, setGerandoFab] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const resumo = useMemo(() => resumoProducao(pecas), [pecas]);
  const bloqueio = useMemo(
    () => bloqueioFabricacao(pecas, resumoMaterialObra(estoque || []).linhas),
    [pecas, estoque]
  );
  const fab = useMemo(
    () => fabricabilidadePecas(pecas, resumoMaterialObra(estoque || []).linhas),
    [pecas, estoque]
  );

  // Pré-carrega o logo (para embutir no PDF). Falha em silêncio → usa só o texto.
  useEffect(() => {
    let alive = true;
    fetch('/logo-montex.png')
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob || !alive) return;
        const fr = new FileReader();
        fr.onload = () => { if (alive) setLogoDataUrl(fr.result); };
        fr.readAsDataURL(blob);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const gerar = async () => {
    if (!pecas.length) { toast.error('Sem peças para gerar o relatório'); return; }
    setGerando(true);
    try {
      const { paginas } = gerarRelatorioProducaoPDF(pecas, obra, { estoque, logoDataUrl });
      toast.success(`Relatório PDF gerado (${paginas} páginas)`);
    } catch (e) {
      toast.error('Erro ao gerar PDF: ' + (e.message || e));
    } finally { setGerando(false); }
  };

  const gerarFab = async () => {
    if (!pecas.length) { toast.error('Sem peças para o relatório'); return; }
    if (!(estoque || []).length) { toast.error('Sem estoque cadastrado para esta obra'); return; }
    setGerandoFab(true);
    try {
      const { paginas } = gerarRelatorioFabricabilidadePDF(pecas, obra, { estoque, logoDataUrl });
      toast.success(`Relatório de fabricabilidade gerado (${paginas} páginas)`);
    } catch (e) {
      toast.error('Erro ao gerar PDF: ' + (e.message || e));
    } finally { setGerandoFab(false); }
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
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={gerarFab} disabled={gerandoFab || !pecas.length}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold disabled:opacity-50"
            title="PDF: quais marcas conseguem e quais não conseguem ser fabricadas (estoque necessário × entregue)">
            {gerandoFab ? <Loader2 className="w-4 h-4 animate-spin" /> : <Factory className="w-4 h-4" />}
            Relatório de Fabricabilidade
          </button>
          <button onClick={gerar} disabled={gerando || !pecas.length}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-semibold disabled:opacity-50">
            {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Relatório de Produção
          </button>
        </div>
      </div>

      {/* Fabricabilidade: consegue × não consegue fabricar (aloca material entregue às peças) */}
      {(fab.resumo.nFabricaveis > 0 || fab.resumo.nNaoFabricaveis > 0) && (
        <div className="mt-3 rounded-lg border border-slate-600/50 bg-slate-900/40 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
            <Factory className="w-4 h-4 text-emerald-400" /> Fabricabilidade — consegue × não consegue fabricar
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Painel tone="text-emerald-400" label="✓ Consegue" value={fmtPeso(fab.resumo.pesoFabricavel)} sub={`${fmtNum(fab.resumo.nFabricaveis)} marcas · ${fmtNum(fab.resumo.qtdFabricaveis)} un`} />
            <Painel tone="text-red-400" label="✗ Não consegue" value={fmtPeso(fab.resumo.pesoNaoFabricavel)} sub={`${fmtNum(fab.resumo.nNaoFabricaveis)} marcas · ${fmtNum(fab.resumo.qtdNaoFabricaveis)} un`} />
            <Painel tone="text-sky-400" label="A comprar" value={fmtPeso(fab.resumo.faltaComprarTotal)} sub={`${fmtNum(fab.resumo.nPerfisParciais)} perfis parciais`} />
          </div>
          {/* barra empilhada */}
          <div className="flex h-2 rounded-full overflow-hidden mt-2 bg-slate-700/60">
            {[['#22c55e', fab.resumo.pesoFabricavel], ['#ef4444', fab.resumo.pesoNaoFabricavel], ['#94a3b8', fab.resumo.pesoSemInfo]].map(([cor, v], i) => (
              <div key={i} style={{ width: `${fab.resumo.pesoTotal > 0 ? (v / fab.resumo.pesoTotal) * 100 : 0}%`, background: cor }} />
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
            <XCircle className="w-3 h-3 text-emerald-400" /> {fab.resumo.pctFabricavel}% do peso a fabricar liberado com o material já entregue · detalhe por marca no PDF.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <Mini icon={Package} label="Peças" value={fmtNum(resumo.totalPecas)} sub={`${fmtNum(resumo.totalQtd)} un`} />
        <Mini icon={Weight} label="Peso total" value={fmtPeso(resumo.totalPeso)} />
        <Mini icon={CheckCircle2} label="Concluído" value={fmtPeso(resumo.pesoConcluido)} tone="text-emerald-400" />
        <Mini icon={Activity} label="Progresso" value={`${resumo.progressoPct}%`} tone="text-orange-400" />
      </div>

      {/* Painel analítico: material faltante × peças impactadas (visão geral) */}
      {(bloqueio.nBloqueadas > 0 || bloqueio.nParciais > 0) && (() => {
        const pesoImpactado = bloqueio.pesoBloqueado + bloqueio.pesoParcial;
        const pctImpacto = resumo.totalPeso > 0 ? Math.round((pesoImpactado / resumo.totalPeso) * 100) : 0;
        return (
          <div className="mt-3 rounded-lg border border-slate-600/50 bg-slate-900/40 p-3">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
              <AlertTriangle className="w-4 h-4 text-red-400" /> Material faltante × peças impactadas
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              <Painel tone="text-red-400" label="Não fabricável" value={fmtPeso(bloqueio.pesoBloqueado)} sub={`${fmtNum(bloqueio.nBloqueadas)} pç · ${fmtNum(bloqueio.nPerfisFaltando)} perfis`} />
              <Painel tone="text-amber-400" label="Material parcial" value={fmtPeso(bloqueio.pesoParcial)} sub={`${fmtNum(bloqueio.nParciais)} pç · ${fmtNum(bloqueio.nPerfisParciais)} perfis`} />
              <Painel tone="text-sky-400" label="Falta comprar" value={fmtPeso(bloqueio.faltaComprarTotal)} sub="total por perfil" />
              <Painel tone="text-slate-200" label="% peso impactado" value={`${pctImpacto}%`} sub={`de ${fmtPeso(resumo.totalPeso)}`} />
            </div>
            {bloqueio.perfisFaltando.length > 0 && (
              <p className="text-[11px] text-red-400/80 mt-2">Sem material: {bloqueio.perfisFaltando.slice(0, 8).join(', ')}{bloqueio.perfisFaltando.length > 8 ? '…' : ''}</p>
            )}
            <p className="text-[10px] text-slate-500 mt-1">Detalhamento por perfil (peso travado + falta comprar) no PDF.</p>
          </div>
        );
      })()}

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

function Painel({ label, value, sub, tone = 'text-white' }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-2.5 py-2">
      <div className="text-slate-400 text-[10px]">{label}</div>
      <div className={`text-base font-bold ${tone}`}>{value}</div>
      {sub && <div className="text-[9px] text-slate-500">{sub}</div>}
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
