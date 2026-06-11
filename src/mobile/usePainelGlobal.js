// ============================================================
// USE PAINEL GLOBAL — consolidação do financeiro GERAL da empresa
// ============================================================
// O financeiro de OBRA (medições/GFO) NÃO é o caixa da empresa. Este
// hook replica, em modo LEITURA, exatamente o fluxo do
// PainelFinanceiroGlobal desktop:
//   • movs próprios do painel (painelFinanceiroSync: bundle.movs, com
//     realtime via subscribeRemote e merge local/remoto)
//   • espelho de DESPESAS SEM OBRA ("Despesa Fábrica": !obraId)
//   • espelho de MEDIÇÕES (receita a valor BRUTO; pago/paga/faturado/
//     confirmado → 'recebido')
//   • receitas manuais (localStorage 'montex_receitas_gerais', já
//     sincronizadas pelo receitasSync do desktop)
//   • overrides/hidden do bundle por ovKey ('d:'/'m:'/'r:') c/ fallback id
//   • EXCLUI movs de juros embutidos (id …-juros / categoria 'Juros de
//     Cheque') da consolidação — fix do cheque trocado (commit 00a7b7f):
//     o juro já está embutido na face; somar de novo duplicava a saída.
// KPIs e projeções idênticos ao desktop: totais por período, recebidas/
// pendentes, lucro/margem, receber/pagar 30-60-90d, 13 semanas com saldo
// acumulado e alerta de saldo mínimo (metas.saldoMinimo, padrão 50k).
// ============================================================
import { useEffect, useMemo, useState } from 'react';
import { useERP } from '@/contexts/ERPContext';
import { loadBundleSmart, subscribeRemote } from '@/utils/painelFinanceiroSync';

const RECEITAS_STORAGE_KEY = 'montex_receitas_gerais';

export const ehPago = (m) => ['pago', 'paga', 'recebido', 'faturado', 'confirmado'].includes(String(m?.status || '').toLowerCase());
// Juros de cheque trocado: já embutidos na face — fora da consolidação.
const ehJurosEmbutido = (m) => String(m?.id || '').endsWith('-juros') || m?.categoria === 'Juros de Cheque';

export function parseLocalDate(s) {
  if (!s || s === '-') return null;
  const str = String(s).slice(0, 10);
  const [y, mo, d] = str.split('-').map(Number);
  if (!y || !mo) return null;
  return new Date(y, mo - 1, d || 1);
}
const diasAte = (s) => {
  const d = parseLocalDate(s);
  if (!d) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.round((d - hoje) / 86400000);
};

export function usePainelGlobal() {
  const erp = useERP?.() || {};
  const { lancamentosDespesas = [], medicoes = [], obras = [] } = erp;

  // Bundle do painel (movs/overrides/hidden/metas) com realtime.
  // loadBundleSmart devolve o LOCAL na hora e chama o callback quando o
  // remoto diverge; subscribeRemote avisa SEM payload → recarregamos.
  const [bundle, setBundle] = useState(() => loadBundleSmart?.((b) => setBundle({ ...b })) || { movs: [], overrides: {}, hidden: [], metas: {} });
  useEffect(() => {
    const reload = () => {
      const local = loadBundleSmart?.((b) => setBundle({ ...b }));
      if (local) setBundle({ ...local });
    };
    const unsub = subscribeRemote?.(reload);
    return () => { try { unsub?.(); } catch { /* noop */ } };
  }, []);

  const obrasMap = useMemo(() => { const m = {}; (obras || []).forEach(o => { m[o.id] = o.nome || o.id; }); return m; }, [obras]);

  // ===== Consolidação (mesmo fluxo do desktop) =====
  const todasMovs = useMemo(() => {
    const overrides = bundle.overrides || {};
    const hidden = bundle.hidden || [];

    // 1) Despesas SEM obra → "Despesa Fábrica"
    const despExt = (lancamentosDespesas || [])
      .filter(l => !l.obraId && !l.obra_id)
      .map(l => ({
        id: l.id, ovKey: `d:${l.id}`, origem: 'externo', tipo: 'despesa',
        data: l.dataEmissao || l.data_emissao || l.data || '',
        descricao: l.descricao || l.nome || '-',
        categoria: l.categoria || 'Outros',
        valor: Number(l.valor) || 0,
        status: l.status || 'pendente',
        vencimento: l.dataVencimento || l.data_vencimento || '-',
        origemLabel: 'Despesa Fábrica', obraId: null,
      }));

    // 2) Medições → receita a valor BRUTO (regra do painel desktop)
    const recMed = (medicoes || []).map(m => {
      const obraId = m.obraId || m.obra_id;
      return {
        id: m.id, ovKey: `m:${m.id}`, origem: 'externo', tipo: 'receita',
        data: m.dataMedicao || m.data_medicao || '',
        descricao: m.descricao || `Medição #${m.numero || '?'}`,
        categoria: 'Medição',
        valor: Number(m.valorBruto) || Number(m.valor_bruto) || 0,
        status: ['pago', 'paga', 'faturado', 'confirmado'].includes(String(m.status || '').toLowerCase()) ? 'recebido' : (m.status || 'pendente'),
        vencimento: m.dataMedicao || m.data_medicao || '-',
        origemLabel: `Obra: ${obrasMap[obraId] || '-'}`, obraId,
      };
    });

    // 3) Receitas manuais (sync do desktop grava neste localStorage)
    let recMan = [];
    try {
      recMan = (JSON.parse(localStorage.getItem(RECEITAS_STORAGE_KEY) || '[]') || []).map(r => ({
        id: r.id, ovKey: `r:${r.id}`, origem: 'externo', tipo: 'receita',
        data: r.data || r.vencimento || '',
        descricao: r.descricao || '-',
        categoria: r.categoria || 'Outros',
        valor: Number(r.valor) || 0,
        status: ['pago', 'paga', 'faturado', 'confirmado', 'recebido'].includes(String(r.status || '').toLowerCase()) ? 'recebido' : (r.status || 'pendente'),
        vencimento: r.vencimento || '-',
        origemLabel: 'Receita Manual', obraId: r.obraId || null,
      }));
    } catch { /* noop */ }

    // 4) Movs próprios do painel (sem juros embutidos — fix cheque trocado)
    const movsLocais = (bundle.movs || [])
      .filter(m => !ehJurosEmbutido(m))
      .map(m => ({
        ...m, valor: Number(m.valor) || 0,
        origem: 'local', origemLabel: m.obraId ? `Obra: ${obrasMap[m.obraId] || '-'}` : 'Global',
        ovKey: m.id,
      }));

    const externas = [...despExt, ...recMed, ...recMan]
      .filter(m => !hidden.includes(m.ovKey) && !hidden.includes(m.id))
      .map(m => {
        const ov = overrides[m.ovKey] || overrides[m.id];
        return ov ? { ...m, ...ov, id: m.id, ovKey: m.ovKey, origem: 'externo' } : m;
      });

    return [...externas, ...movsLocais].sort((a, b) =>
      (parseLocalDate(b.data)?.getTime() || 0) - (parseLocalDate(a.data)?.getTime() || 0));
  }, [lancamentosDespesas, medicoes, bundle, obrasMap]);

  return { todasMovs, metas: bundle.metas || {}, obrasMap };
}

// KPIs do período (mesma matemática do desktop)
export function kpisDe(movs) {
  const receitas = movs.filter(m => m.tipo === 'receita');
  const despesas = movs.filter(m => m.tipo === 'despesa');
  const totR = receitas.reduce((s, m) => s + (m.valor || 0), 0);
  const totD = despesas.reduce((s, m) => s + (m.valor || 0), 0);
  const recRecebidas = receitas.filter(ehPago).reduce((s, m) => s + (m.valor || 0), 0);
  const despPagas = despesas.filter(ehPago).reduce((s, m) => s + (m.valor || 0), 0);
  const lucro = totR - totD;
  return {
    totR, totD, lucro,
    margem: totR > 0 ? (lucro / totR) * 100 : 0,
    recRecebidas, recPendentes: totR - recRecebidas,
    despPagas, despPendentes: totD - despPagas,
    qtd: movs.length,
  };
}

// Projeção 90 dias + 13 semanas com saldo acumulado (idêntico ao desktop)
export function futuroDe(movs, saldoMinimo = 50000) {
  const comDias = movs.map(m => ({ ...m, diasVenc: diasAte(m.vencimento && m.vencimento !== '-' ? m.vencimento : m.data) }));
  const fr = comDias.filter(m => m.tipo === 'receita' && m.diasVenc !== null && m.diasVenc >= 0 && m.diasVenc <= 90 && !ehPago(m));
  const fd = comDias.filter(m => m.tipo === 'despesa' && m.diasVenc !== null && m.diasVenc >= 0 && m.diasVenc <= 90 && !ehPago(m));
  const soma = (l) => l.reduce((s, m) => s + (m.valor || 0), 0);
  const receber30 = soma(fr.filter(m => m.diasVenc <= 30)), pagar30 = soma(fd.filter(m => m.diasVenc <= 30));
  const receber60 = soma(fr.filter(m => m.diasVenc <= 60)), pagar60 = soma(fd.filter(m => m.diasVenc <= 60));
  const receber90 = soma(fr), pagar90 = soma(fd);

  const semanas = []; let acc = 0;
  for (let i = 0; i < 13; i++) {
    const rec = soma(fr.filter(m => m.diasVenc >= i * 7 && m.diasVenc < (i + 1) * 7));
    const desp = soma(fd.filter(m => m.diasVenc >= i * 7 && m.diasVenc < (i + 1) * 7));
    acc += rec - desp;
    semanas.push({ label: `S${i + 1}`, receitas: Math.round(rec), despesas: Math.round(desp), saldoAcumulado: Math.round(acc), abaixoMinimo: acc < saldoMinimo });
  }
  return {
    receber30, receber60, receber90, pagar30, pagar60, pagar90,
    saldo30: receber30 - pagar30, saldo60: receber60 - pagar60, saldo90: receber90 - pagar90,
    semanas, semanasCriticas: semanas.filter(s => s.abaixoMinimo).length,
  };
}
