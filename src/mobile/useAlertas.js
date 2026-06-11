// ============================================================
// useAlertas — alertas operacionais derivados dos dados do ERP
// ============================================================
// Fonte única (usada pela tela de Notificações e pelo badge do sino).
// Respeita o filtro global por obra. Cada alerta: { id, count, title,
// sub, to, icon, color }.
// ============================================================
import { useMemo } from 'react';
import { AlertCircle, Package, PackageCheck, Truck, Hammer, CheckCircle2 } from 'lucide-react';
import { useERP } from '@/contexts/ERPContext';
import { useAuth } from '@/lib/AuthContext';
import { useObraFiltro } from './ObraContext';

// Predicados compartilhados com AprovacoesMobile (manter em sincronia)
const medPendente = (m) => ['pendente', 'aguardando'].includes(String(m?.status || '').toLowerCase());
const ORC_ABERTOS = ['enviado', 'em_analise', 'negociacao', 'pendente'];
const orcPendente = (o) => ORC_ABERTOS.includes(String(o?.status || '').toLowerCase());
const cmpPendente = (c) => String(c?.status || '').toLowerCase() === 'pendente';

export function useAlertas() {
  const erp = useERP?.() || {};
  const { lancamentosDespesas = [], estoque = [], pecas = [], expedicoes = [], medicoes = [], orcamentos = [], compras = [] } = erp;
  const { matchObra } = useObraFiltro();
  const { hasPermission } = useAuth() || {};
  const podeMed = !!hasPermission && hasPermission('medicao.aprovar');
  const podeOrc = !!hasPermission && hasPermission('orcamentos.aprovar');
  const podeCmp = !!hasPermission && hasPermission('compras.aprovar');

  return useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const list = [];

    // Aprovações pendentes (gestor) — primeiro da lista: é decisão, não aviso
    const medsAprovar = podeMed ? medicoes.filter(medPendente).filter(matchObra).length : 0;
    const orcsAprovar = podeOrc ? orcamentos.filter(orcPendente).filter(o => !(o.obraId ?? o.obra_id) || matchObra(o)).length : 0;
    const cmpsAprovar = podeCmp ? compras.filter(cmpPendente).filter(c => !(c.obraId ?? c.obra_id) || matchObra(c)).length : 0;
    const aprovacoes = medsAprovar + orcsAprovar + cmpsAprovar;
    if (aprovacoes) {
      const partes = [];
      if (medsAprovar) partes.push(`${medsAprovar} medição(ões)`);
      if (orcsAprovar) partes.push(`${orcsAprovar} orçamento(s)`);
      if (cmpsAprovar) partes.push(`${cmpsAprovar} compra(s)`);
      list.push({ id: 'aprov', icon: CheckCircle2, color: 'emerald', count: aprovacoes,
        title: `${aprovacoes} aprovação(ões) pendente(s)`, sub: partes.join(' · '), to: '/m/aprovacoes' });
    }

    const despObra = lancamentosDespesas.filter(matchObra);
    const venc = (d) => d.dataVencimento || d.data_vencimento || '';
    const atrasadas = despObra.filter(d => d.status !== 'pago' && d.status !== 'cancelado' && venc(d) && String(venc(d)).slice(0, 10) < hoje);
    if (atrasadas.length) {
      const total = atrasadas.reduce((s, d) => s + (Number(d.valor) || 0), 0);
      list.push({ id: 'desp', icon: AlertCircle, color: 'red', count: atrasadas.length,
        title: `${atrasadas.length} despesa(s) em atraso`, sub: 'R$ ' + total.toLocaleString('pt-BR', { maximumFractionDigits: 0 }), to: '/m/despesas' });
    }

    const estCrit = estoque.filter(i => { const q = Number(i.quantidade) || 0, m = Number(i.minimo) || 0; return m > 0 && q <= m; });
    if (estCrit.length) {
      list.push({ id: 'est', icon: Package, color: 'amber', count: estCrit.length,
        title: `${estCrit.length} item(ns) com estoque baixo`, sub: 'Repor materiais', to: '/m/estoque' });
    }

    const pecasObra = pecas.filter(matchObra);
    const prontas = pecasObra.filter(p => (p.etapa || '').toLowerCase() === 'expedido');
    if (prontas.length) {
      list.push({ id: 'exp', icon: PackageCheck, color: 'blue', count: prontas.length,
        title: `${prontas.length} peça(s) prontas para expedição`, sub: 'Fila de embarque', to: '/m/expedicao' });
    }

    const aConferir = expedicoes.filter(matchObra).filter(e => ['preparando', 'aguardando_transporte'].includes(String(e.status || '').toLowerCase()));
    if (aConferir.length) {
      list.push({ id: 'rom', icon: Truck, color: 'amber', count: aConferir.length,
        title: `${aConferir.length} romaneio(s) a conferir`, sub: 'Conferência de carga', to: '/m/expedicao' });
    }

    const aMontar = pecasObra.filter(p => ['enviado', 'entregue'].includes((p.etapa || '').toLowerCase()));
    if (aMontar.length) {
      list.push({ id: 'mont', icon: Hammer, color: 'emerald', count: aMontar.length,
        title: `${aMontar.length} peça(s) aguardando montagem`, sub: 'Em obra', to: '/m/montagem' });
    }

    return list;
  }, [lancamentosDespesas, estoque, pecas, expedicoes, medicoes, orcamentos, matchObra, podeMed, podeOrc]);
}
