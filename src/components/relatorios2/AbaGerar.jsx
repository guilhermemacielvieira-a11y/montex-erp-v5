// ============================================================
// Central de Relatórios — aba GERAR
// ============================================================
// Catálogo de relatórios REAIS, todos no escopo do seletor do TOPO
// (CLAUDE.md 1c — sem filtro de obra próprio). Cada geração bem-sucedida
// é registrada em relatorios_historico; se o registro falhar o arquivo já
// foi baixado e o usuário só é avisado.
// ============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Factory, Hammer, Boxes, LayoutDashboard, Wallet, Siren, Download, Loader2, Lock, Sparkles, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/api/supabaseClient';
import { useObras, useProducao, useEstoque } from '@/contexts/ERPContext';
import { useAuth } from '@/lib/AuthContext';
import { rotuloEscopo, isEscopoGeral } from '@/lib/escopoObra';
import { registrarRelatorio } from '@/api/colaboracaoApi';
import { useAlertasStatus, STATUS_ALERTA } from '@/hooks/useAlertasStatus';
import { obraDe, pesoPeca } from '@/services/bi/biCore';
import { enriquecerNecessarioBOM } from '@/services/estoqueAnalytics';
import {
  CATALOGO, regraFinanceiro, planilhasFinanceiro, csvAlertas, contarAlertas, resumoExecutivo,
  promptLeituraIA, montarResumoExecutivoPDF, nomeArquivo,
} from '@/services/relatoriosCatalogo';
import { Painel, SeloFormato, CLS_BTN_PRIMARIO } from './relatoriosUi';

const ICONES = { producao: Factory, fabricabilidade: Hammer, estoque: Boxes, executivo: LayoutDashboard, financeiro: Wallet, alertas: Siren };

/** BOM (materiais_corte) da obra, paginado (pode passar de 1000 linhas). */
async function carregarBOM(obraId) {
  const out = [];
  for (let de = 0; de < 100000; de += 1000) {
    const { data, error } = await supabase.from('materiais_corte')
      .select('id,perfil,material,peso_teorico,obra_id').eq('obra_id', obraId).order('id', { ascending: true }).range(de, de + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const carregarLogo = async () => (await import('@/utils/montexLogos')).LOGO_M_MAIN_B64;

function baixarBlob(conteudo, nome, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome; a.style.display = 'none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AbaGerar({ dados, tipoDestacado = null, onRegistrado }) {
  const { obras = [], escopoObra, obraAtual, obraAtualData } = useObras();
  const { pecas = [] } = useProducao();
  const { estoque = [] } = useEstoque();
  const { user } = useAuth() || {};
  const { statusDe } = useAlertasStatus();
  const [gerando, setGerando] = useState(null);
  const [incluirIA, setIncluirIA] = useState(false);
  const refs = useRef({});

  const rotulo = useMemo(() => rotuloEscopo(escopoObra, obras), [escopoObra, obras]);
  const geral = isEscopoGeral(escopoObra);
  const nomeUsuario = user?.nome || user?.name || user?.email || null;

  const pecasObra = useMemo(() => (obraAtual ? pecas.filter((p) => obraDe(p) === obraAtual) : []), [pecas, obraAtual]);
  const estoqueObra = useMemo(() => (obraAtual ? estoque.filter((e) => (e.obraId || e.obra_id) === obraAtual) : []), [estoque, obraAtual]);
  const alertas = useMemo(() => dados?.alertas || [], [dados?.alertas]);

  // Leva o card pré-selecionado (vindo do Histórico) para a vista.
  useEffect(() => {
    if (!tipoDestacado) return;
    const el = refs.current[tipoDestacado];
    if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [tipoDestacado]);

  const registrar = useCallback(async (reg) => {
    try {
      await registrarRelatorio({ ...reg, obra_id: obraAtual || null, escopo_rotulo: rotulo, gerado_por_nome: nomeUsuario });
      onRegistrado?.();
    } catch (e) {
      toast.warning(`Arquivo gerado, mas não foi possível registrar no histórico: ${e?.message || e}`);
    }
  }, [obraAtual, rotulo, nomeUsuario, onRegistrado]);

  // Motivo para desabilitar cada relatório (null = pode gerar).
  const bloqueio = useCallback((item) => {
    if (item.exigeObra && !obraAtual) return 'Selecione UMA obra no seletor do topo (em Geral ou grupo este relatório não se aplica).';
    if ((item.id === 'producao' || item.id === 'fabricabilidade') && !pecasObra.length) return 'A obra selecionada não tem peças cadastradas.';
    if (item.id === 'fabricabilidade' && !estoqueObra.length) return 'A obra selecionada não tem estoque cadastrado.';
    if (item.id === 'estoque' && !(dados?.suprimentos?.itens || []).length) return 'Sem itens de estoque no escopo.';
    if (item.id === 'executivo' && dados?.carregando && !dados?.atualizadoEm) return 'Carregando o histórico de produção…';
    return null;
  }, [obraAtual, pecasObra.length, estoqueObra.length, dados?.suprimentos?.itens, dados?.carregando, dados?.atualizadoEm]);

  const gerar = useCallback(async (item) => {
    setGerando(item.id);
    try {
      const obraInfo = obraAtualData
        ? { id: obraAtualData.id, codigo: obraAtualData.codigo, nome: obraAtualData.nome, cliente: obraAtualData.cliente }
        : (geral ? null : { nome: rotulo });

      if (item.id === 'producao' || item.id === 'fabricabilidade') {
        let bom = [];
        try { bom = await carregarBOM(obraAtual); } catch (e) { toast.warning(`Sem BOM da obra (${e.message}); o material usa só o estoque.`); }
        const estoqueBOM = enriquecerNecessarioBOM(estoqueObra, bom);
        const logoDataUrl = await carregarLogo();
        const kg = pecasObra.reduce((s, p) => s + pesoPeca(p), 0);
        if (item.id === 'producao') {
          const { gerarRelatorioProducaoPDF } = await import('@/services/relatorioProducaoPDF');
          const { paginas, resumo } = gerarRelatorioProducaoPDF(pecasObra, obraInfo, { estoque: estoqueBOM, logoDataUrl });
          toast.success(`Relatório de produção gerado (${paginas} página(s))`);
          await registrar({
            tipo: 'producao', titulo: `Produção — ${rotulo}`, formato: 'pdf', parametros: { paginas },
            resumo: { pecas: pecasObra.length, kg: Math.round(kg), progresso_pct: resumo?.progressoPct ?? null },
          });
        } else {
          const { gerarRelatorioFabricabilidadePDF } = await import('@/services/relatorioFabricabilidadePDF');
          const { paginas, fab } = gerarRelatorioFabricabilidadePDF(pecasObra, obraInfo, { estoque: estoqueBOM, logoDataUrl });
          toast.success(`Relatório de fabricabilidade gerado (${paginas} página(s))`);
          await registrar({
            tipo: 'fabricabilidade', titulo: `Fabricabilidade — ${rotulo}`, formato: 'pdf', parametros: { paginas },
            resumo: { pecas: pecasObra.length, kg: Math.round(kg), itens_estoque: estoqueObra.length, fabricaveis: fab?.resumo?.nFabricaveis ?? null, nao_fabricaveis: fab?.resumo?.nNaoFabricaveis ?? null },
          });
        }
        return;
      }

      if (item.id === 'estoque') {
        const itens = dados?.suprimentos?.itens || [];
        const { gerarRelatorioEstoquePDF } = await import('@/services/relatorioEstoquePDF');
        const logoDataUrl = await carregarLogo();
        const { paginas } = gerarRelatorioEstoquePDF(itens, obraInfo, { logoDataUrl });
        toast.success(`Relatório de estoque gerado (${paginas} página(s))`);
        const k = dados?.suprimentos?.kpis || {};
        await registrar({
          tipo: 'estoque', titulo: `Estoque — ${rotulo}`, formato: 'pdf', parametros: { paginas },
          resumo: { itens: k.nItens ?? itens.length, em_alerta: k.alertas ?? null, valor_total: k.valorTotal ?? null },
        });
        return;
      }

      if (item.id === 'executivo') {
        const resumo = resumoExecutivo(dados);
        let leituraIA = null;
        if (incluirIA) {
          try {
            const { promptIA } = await import('@/services/ia/iaClient');
            leituraIA = await promptIA(promptLeituraIA(resumo, rotulo));
          } catch (e) {
            toast.warning(`A leitura da IA não pôde ser gerada (${e?.message || e}). O PDF sai sem ela.`);
          }
        }
        const logoDataUrl = await carregarLogo();
        const { doc, paginas, nome } = await montarResumoExecutivoPDF(dados, { escopoRotulo: rotulo, leituraIA, logoDataUrl, geradoPor: nomeUsuario || '' });
        doc.save(nome);
        toast.success(`Resumo executivo gerado (${paginas} página(s))`);
        await registrar({ tipo: 'executivo', titulo: `Resumo executivo — ${rotulo}`, formato: 'pdf', parametros: { paginas, leitura_ia: !!leituraIA }, resumo });
        return;
      }

      if (item.id === 'financeiro') {
        const fin = dados?.financeiro || {};
        const XLSX = await import('xlsx');
        const planilhas = planilhasFinanceiro(fin, { nomeObra: dados?.nomeObra, escopoRotulo: rotulo });
        const wb = XLSX.utils.book_new();
        Object.entries(planilhas).forEach(([nome, aoa]) => {
          const ws = XLSX.utils.aoa_to_sheet(aoa);
          const larg = Math.max(...aoa.map((l) => l.length));
          ws['!cols'] = Array.from({ length: larg }, (_, i) => ({ wch: nome === 'Movimentos' && i === 4 ? 40 : 16 }));
          XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31));
        });
        const nome = nomeArquivo('financeiro', rotulo, 'xlsx');
        XLSX.writeFile(wb, nome);
        const nRec = (fin.receitas || []).length, nDesp = (fin.despesas || []).length;
        toast.success(`Planilha financeira gerada (${nRec + nDesp} movimento(s))`);
        await registrar({
          tipo: 'financeiro', titulo: `Financeiro — ${rotulo}`, formato: 'xlsx',
          parametros: { regra: fin.geralEmpresa ? 'caixa da empresa' : 'somente a(s) obra(s)' },
          resumo: {
            receitas: nRec, despesas: nDesp,
            receber_vencido: fin.aging?.receberVencido || 0, pagar_vencido: fin.aging?.pagarVencido || 0,
            saldo_8_semanas: (fin.fluxo || []).slice(-1)[0]?.acumulado || 0,
          },
        });
        return;
      }

      if (item.id === 'alertas') {
        const csv = csvAlertas(alertas, dados?.nomeObra, (a) => STATUS_ALERTA[statusDe(a.id)] || 'Novo');
        baixarBlob(csv, nomeArquivo('alertas', rotulo, 'csv'), 'text/csv;charset=utf-8');
        toast.success(`${alertas.length} alerta(s) exportado(s)`);
        await registrar({ tipo: 'alertas', titulo: `Radar de alertas — ${rotulo}`, formato: 'csv', parametros: null, resumo: contarAlertas(alertas) });
      }
    } catch (e) {
      toast.error(`Erro ao gerar ${item.titulo}: ${e?.message || e}`);
    } finally {
      setGerando(null);
    }
  }, [obraAtual, obraAtualData, geral, rotulo, estoqueObra, pecasObra, dados, incluirIA, nomeUsuario, registrar, alertas, statusDe]);

  const descricaoExtra = (item) => {
    if (item.id === 'financeiro') return regraFinanceiro(!!dados?.financeiro?.geralEmpresa);
    if (item.id === 'producao' || item.id === 'fabricabilidade') {
      return obraAtual ? `${pecasObra.length.toLocaleString('pt-BR')} peça(s) e ${estoqueObra.length} item(ns) de estoque na obra.` : null;
    }
    if (item.id === 'alertas') {
      const c = contarAlertas(alertas);
      return `${c.total} alerta(s) agora: ${c.critico} crítico(s), ${c.alto} alto(s).`;
    }
    if (item.id === 'estoque') return `${(dados?.suprimentos?.itens || []).length.toLocaleString('pt-BR')} item(ns) no escopo.`;
    return null;
  };

  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 text-xs text-slate-400">
        <Info className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <span>Todos os relatórios usam o escopo do seletor do topo: <b className="text-slate-200">{rotulo}</b>. Para mudar a obra, troque no topo.</span>
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
        {CATALOGO.map((item) => {
          const Icone = ICONES[item.id] || LayoutDashboard;
          const motivo = bloqueio(item);
          const ocupado = gerando === item.id;
          const extra = descricaoExtra(item);
          return (
            <Painel
              key={item.id}
              ref={(el) => { refs.current[item.id] = el; }}
              className={cn('flex flex-col gap-3 min-w-0', tipoDestacado === item.id && 'ring-2 ring-sky-500/70')}
              aria-labelledby={`rel-${item.id}-titulo`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 id={`rel-${item.id}-titulo`} className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icone className="h-4 w-4 text-slate-300" aria-hidden /> {item.titulo}
                </h3>
                <div className="flex shrink-0 gap-1">{item.formatos.map((f) => <SeloFormato key={f} formato={f} />)}</div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{item.descricao}</p>
              {extra && <p className="text-[11px] text-slate-400">{extra}</p>}
              {item.id === 'executivo' && (
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input type="checkbox" className="h-4 w-4 accent-sky-500" checked={incluirIA} onChange={(e) => setIncluirIA(e.target.checked)} />
                  <Sparkles className="h-3.5 w-3.5 text-violet-300" aria-hidden /> Incluir leitura da IA (usa a cota diária de IA)
                </label>
              )}
              <div className="mt-auto space-y-2">
                {motivo && (
                  <p className="flex items-start gap-1.5 text-[11px] text-amber-200" id={`rel-${item.id}-motivo`}>
                    <Lock className="h-3.5 w-3.5 shrink-0 mt-px" aria-hidden /> {motivo}
                  </p>
                )}
                <button
                  type="button"
                  className={cn(CLS_BTN_PRIMARIO, 'w-full py-2')}
                  disabled={!!motivo || !!gerando}
                  aria-describedby={motivo ? `rel-${item.id}-motivo` : undefined}
                  onClick={() => gerar(item)}
                >
                  {ocupado ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
                  {ocupado ? 'Gerando…' : `Gerar ${item.formatos[0].toUpperCase()}`}
                </button>
              </div>
            </Painel>
          );
        })}
      </div>
    </div>
  );
}
