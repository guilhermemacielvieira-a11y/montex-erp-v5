// ============================================================
// NOTIFICAÇÕES (MOBILE) — derivação de alertas a partir do ERP
// ============================================================
// Fonte única de verdade das notificações do app. É consumida por:
//   - O badge do sino no header (MobileLayout) → contagem
//   - A tela /m/notificacoes (NotificacoesMobile) → lista
// Tudo é DERIVADO dos dados já carregados no ERPContext (sem fetch
// extra). Notificações são GLOBais (fábrica + todas as obras) — o sino
// não deve depender do filtro de obra da tela atual.
//
// Severidade: 2 = crítico (vermelho), 1 = atenção (âmbar), 0 = info (azul)
// ============================================================
import { Receipt, CalendarClock, PackageX, PackageMinus, Truck, Ruler } from 'lucide-react';

const num = (v) => Number(v) || 0;
const money = (n) => 'R$ ' + num(n).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
// Campos vêm em camelCase (transformArray); mantém fallback snake por robustez.
const vencOf = (d) => d.dataVencimento || d.data_vencimento || '';
const pesoDe = (p) => num(p.pesoTotal) || num(p.peso) * (num(p.quantidade) || 1);

export function buildNotificacoes(erp = {}) {
  const { lancamentosDespesas = [], estoque = [], pecas = [], medicoes = [] } = erp;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const hojeStr = new Date().toISOString().slice(0, 10);
  const limite7 = (() => { const d = new Date(hoje); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
  const items = [];

  // ── Financeiro: despesas vencidas / a vencer ──
  const ativas = lancamentosDespesas.filter(d => d.status !== 'pago' && d.status !== 'cancelado' && vencOf(d));
  const vencidas = ativas.filter(d => String(vencOf(d)).slice(0, 10) < hojeStr);
  if (vencidas.length) {
    const total = vencidas.reduce((s, d) => s + num(d.valor), 0);
    items.push({ id: 'desp-venc', sev: 2, icon: Receipt, titulo: `${vencidas.length} despesa(s) vencida(s)`, sub: `Total ${money(total)} — regularizar`, to: '/m/despesas' });
  }
  const aVencer = ativas.filter(d => { const v = String(vencOf(d)).slice(0, 10); return v >= hojeStr && v <= limite7; });
  if (aVencer.length) {
    const total = aVencer.reduce((s, d) => s + num(d.valor), 0);
    items.push({ id: 'desp-prox', sev: 1, icon: CalendarClock, titulo: `${aVencer.length} despesa(s) a vencer (7 dias)`, sub: `Total ${money(total)}`, to: '/m/despesas' });
  }

  // ── Estoque (fábrica): crítico / baixo ──
  const crit = estoque.filter(i => { const q = num(i.quantidade), m = num(i.minimo); return q <= 0 || (m && q <= m * 0.5); });
  if (crit.length) items.push({ id: 'estq-crit', sev: 2, icon: PackageX, titulo: `${crit.length} item(ns) de estoque em nível crítico`, sub: 'Zerado ou abaixo de 50% do mínimo', to: '/m/estoque' });
  const baixo = estoque.filter(i => { const q = num(i.quantidade), m = num(i.minimo); return m && q > m * 0.5 && q <= m; });
  if (baixo.length) items.push({ id: 'estq-baixo', sev: 1, icon: PackageMinus, titulo: `${baixo.length} item(ns) com estoque baixo`, sub: 'Abaixo do mínimo — programar reposição', to: '/m/estoque' });

  // ── Produção: peças prontas para embarque (etapa expedido = fila de embarque) ──
  const prontas = pecas.filter(p => (p.etapa || '').toLowerCase() === 'expedido');
  if (prontas.length) {
    const peso = prontas.reduce((s, p) => s + pesoDe(p), 0);
    items.push({ id: 'pecas-emb', sev: 0, icon: Truck, titulo: `${prontas.length} conjunto(s) na fila de embarque`, sub: `${(peso / 1000).toFixed(1)} t prontos para expedição`, to: '/m/expedicao' });
  }

  // ── Comercial: medições pendentes de recebimento ──
  const medP = medicoes.filter(m => m.status !== 'pago' && m.status !== 'cancelado');
  if (medP.length) {
    const total = medP.reduce((s, m) => s + num(m.valor), 0);
    items.push({ id: 'med-pend', sev: 0, icon: Ruler, titulo: `${medP.length} medição(ões) pendente(s)`, sub: `A receber ${money(total)}`, to: '/m/receitas' });
  }

  // Mais severas primeiro
  items.sort((a, b) => b.sev - a.sev);
  return items;
}

// Contagem para o badge do sino (ações que pedem atenção: crítico + atenção).
export function countNotificacoes(erp) {
  return buildNotificacoes(erp).length;
}
