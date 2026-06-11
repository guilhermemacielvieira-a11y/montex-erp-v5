// ============================================================
// DADOS MOBILE — fonte única de predicados e agregações
// ============================================================
// Auditoria 11/06/2026 contra o banco de PRODUÇÃO revelou que os
// predicados espalhados pelas telas divergiam dos VALORES REAIS:
//   • medicoes.status pago = 'paga' (feminino!) — filtrar por 'pago'
//     zerava o faturamento e inflava o "a receber" em todas as telas.
//   • pecas_producao.etapa inclui 'entregue' (38 peças) — etapa pós
//     'enviado' (peça já em obra) que sumia das contagens/kanban.
//   • obras: contrato em contrato_peso_total (EM KG — o comentário do
//     schema dizendo toneladas está errado: TEMEC 13.485,00 = 13.485 kg
//     de peças exatos) e contrato_valor_total.
// Este módulo é a ÚNICA fonte desses predicados — as telas importam
// daqui. Se um status novo surgir no banco, corrija AQUI.
// ============================================================

// ── Receitas (medições) ─────────────────────────────────────
// Recebida/paga: aceita as duas grafias presentes/possíveis no banco.
export const isRecebida = (r) => ['pago', 'paga'].includes(String(r?.status || '').toLowerCase());
// Aguardando aprovação (caixa de aprovações)
export const isMedicaoPendente = (m) => ['pendente', 'aguardando'].includes(String(m?.status || '').toLowerCase());

// ── Despesas ────────────────────────────────────────────────
export const isDespesaPaga = (d) => String(d?.status || '').toLowerCase() === 'pago';
export const isDespesaCancelada = (d) => String(d?.status || '').toLowerCase() === 'cancelado';
export const isDespesaAberta = (d) => !isDespesaPaga(d) && !isDespesaCancelada(d);
export const vencimentoDe = (d) => d?.dataVencimento || d?.data_vencimento || '';
export const isDespesaAtrasada = (d, hojeISO) =>
  isDespesaAberta(d) && vencimentoDe(d) && String(vencimentoDe(d)).slice(0, 10) < hojeISO;

// ── Produção (etapas reais do banco) ───────────────────────
// Fluxo: aguardando → fabricacao → solda → pintura → expedido →
// enviado → entregue (em obra). 'montado' NÃO vive na etapa: vem do
// entity_store (montagemSync) — regra do CLAUDE.md.
export const ETAPAS_ORDEM = ['aguardando', 'fabricacao', 'solda', 'pintura', 'expedido', 'enviado', 'entregue'];
export const etapaDe = (p) => String(p?.etapa || 'aguardando').toLowerCase();
// Em produção na fábrica (ocupando capacidade)
export const isEmFabrica = (p) => ['fabricacao', 'solda', 'pintura'].includes(etapaDe(p));
// Saiu da fábrica (expedida ou além)
export const saiuDaFabrica = (p) => ['expedido', 'enviado', 'entregue'].includes(etapaDe(p));
// Em obra aguardando montagem
export const isEmObra = (p) => ['enviado', 'entregue'].includes(etapaDe(p));

// Peso total da peça: prefere o agregado, cai p/ unitário×qtd (regra mobile)
export const pesoDe = (p) => Number(p?.pesoTotal) || (Number(p?.peso) || 0) * (Number(p?.quantidade) || 1);

// ── Contrato da obra ────────────────────────────────────────
// contrato_peso_total em KG; transform expõe contratoPesoTotal (+alias pesoTotal)
export const contratoPesoKg = (o) =>
  Number(o?.contratoPesoTotal) || Number(o?.contrato_peso_total) || Number(o?.pesoTotal) || 0;
export const contratoValor = (o) =>
  Number(o?.contratoValorTotal) || Number(o?.contrato_valor_total) || Number(o?.valorContrato) || 0;
