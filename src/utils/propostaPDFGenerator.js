/**
 * Gerador de Proposta Comercial - Grupo Montex
 * v6 - Layout institucional conforme modelo PDF/DOCX de referência
 * Header teal com logo, seções com bordas, badges de análise, footer com CNPJ
 */

const fmt = (v) => {
  if (!v || isNaN(v)) return 'R$ 0,00';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtN = (v) => {
  if (!v || isNaN(v)) return '0';
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
};

// SVG logo Montex (M estilizado teal)
const MONTEX_LOGO_SVG = `<svg width="60" height="50" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M10,90 L10,30 L35,60 L60,30 L60,90" stroke="#2d8c7f" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M60,90 L60,30 L85,60 L110,30 L110,90" stroke="#2d8c7f" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M25,85 Q60,100 95,85" stroke="#4db8a4" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;

const MONTEX_LOGO_WHITE_SVG = `<svg width="50" height="40" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M10,90 L10,30 L35,60 L60,30 L60,90" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M60,90 L60,30 L85,60 L110,30 L110,90" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M25,85 Q60,100 95,85" stroke="rgba(255,255,255,0.6)" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;

function calcSetorMetrics(setor) {
  let total = 0, peso = 0, area = 0;
  const gruposPorBase = {};
  (setor.itens || []).forEach(item => {
    const qty = item.quantidade || 0;
    total += qty * ((item.precoMaterial || 0) + (item.precoInstalacao || 0));
    if (item.unidade === 'KG') {
      const desc = (item.descricao || '').toLowerCase();
      if (!desc.includes('projeto')) {
        const base = (item.descricao || '').split(' - ')[0].trim() || 'item';
        if (!gruposPorBase[base] || qty > gruposPorBase[base]) gruposPorBase[base] = qty;
      }
    }
    if (item.unidade === 'M2') area += qty;
  });
  peso = Object.values(gruposPorBase).reduce((s, q) => s + q, 0);
  return { total, peso, area, valorKg: peso > 0 ? total / peso : 0, valorM2: area > 0 ? total / area : 0 };
}

/**
 * Gera o HTML completo da proposta comercial - Layout Institucional Montex
 */
export function buildPropostaHTML(data) {
  const { project, setores, calculations, unitCosts, paymentConditions, cronograma, escopo } = data;

  const propNum = project?.numeroPropostas || data.propostaNumber || `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}`;
  const prazoDias = (cronograma?.projeto || 10) + (cronograma?.fabricacao || 30) + (cronograma?.montagem || 15);
  const pagamento = paymentConditions || { assinatura: 10, aprovacao: 5, medicoes: 85 };
  const dataEmissao = project?.dataEmissao ? new Date(project.dataEmissao).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  const dataValidade = project?.dataValidade ? new Date(project.dataValidade).toLocaleDateString('pt-BR') : new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('pt-BR');

  // Totals
  let totalWeight = 0, totalArea = 0, custoMaterial = 0, custoInstalacao = 0;
  let totalItens = 0;
  setores.forEach(s => {
    const gruposPorBase = {};
    (s.itens || []).forEach(item => {
      totalItens++;
      const qty = item.quantidade || 0;
      custoMaterial += qty * (item.precoMaterial || 0);
      custoInstalacao += qty * (item.precoInstalacao || 0);
      if (item.unidade === 'KG') {
        const desc = (item.descricao || '').toLowerCase();
        if (!desc.includes('projeto')) {
          const base = (item.descricao || '').split(' - ')[0].trim() || 'item';
          if (!gruposPorBase[base] || qty > gruposPorBase[base]) gruposPorBase[base] = qty;
        }
      }
      if (item.unidade === 'M2') totalArea += qty;
    });
    totalWeight += Object.values(gruposPorBase).reduce((s2, q) => s2 + q, 0);
  });

  const margemPct = calculations?.margemPct || 18;
  const impostosPct = calculations?.impostosPct || 12;
  const totalDireto = custoMaterial + custoInstalacao;
  const margemVal = custoInstalacao * (margemPct / 100);
  const impostosVal = (custoInstalacao + margemVal) * (impostosPct / 100);
  const precoFinal = calculations?.precoFinal || (totalDireto + margemVal + impostosVal);
  const precoKg = totalWeight > 0 ? precoFinal / totalWeight : 0;
  const precoM2 = totalArea > 0 ? precoFinal / totalArea : 0;
  const totalOrcamento = totalDireto;

  // Escopo
  const escopoIncluso = escopo?.incluso || 'Projeto executivo de estrutura metálica; Fabricação completa em fábrica; Tratamento superficial e pintura; Transporte até a obra; Montagem completa com equipamentos; Acompanhamento técnico durante execução; Garantia de 5 anos contra defeitos de fabricação.';
  const escopoNaoIncluso = escopo?.naoIncluso || 'Fundações e bases de concreto; Instalações elétricas e hidráulicas; Licenças e alvarás; Terraplenagem e preparação do terreno.';
  const obrigacoes = cronograma?.obrigacoes || 'Disponibilizar acesso ao local da obra; Fornecer ponto de energia elétrica e água; Garantir fundações conforme projeto fornecido pela Montex; Aprovar o projeto executivo em até 10 dias úteis; Efetuar os pagamentos nas datas acordadas.';

  // Custos unitários
  const custosUnit = [];
  if (unitCosts?.estrutura) {
    if (unitCosts.estrutura.material) custosUnit.push(['Estrutura - Material', `R$ ${Number(unitCosts.estrutura.material).toFixed(2)}/kg`]);
    if (unitCosts.estrutura.fabricacao) custosUnit.push(['Estrutura - Fabricação', `R$ ${Number(unitCosts.estrutura.fabricacao).toFixed(2)}/kg`]);
    if (unitCosts.estrutura.pintura) custosUnit.push(['Estrutura - Pintura', `R$ ${Number(unitCosts.estrutura.pintura).toFixed(2)}/kg`]);
    if (unitCosts.estrutura.transporte) custosUnit.push(['Estrutura - Transporte', `R$ ${Number(unitCosts.estrutura.transporte).toFixed(2)}/kg`]);
    if (unitCosts.estrutura.montagem) custosUnit.push(['Estrutura - Montagem', `R$ ${Number(unitCosts.estrutura.montagem).toFixed(2)}/kg`]);
  }
  if (unitCosts?.cobertura) {
    if (unitCosts.cobertura.material) custosUnit.push(['Cobertura - Material', `R$ ${Number(unitCosts.cobertura.material).toFixed(2)}/m²`]);
    if (unitCosts.cobertura.montagem) custosUnit.push(['Cobertura - Montagem', `R$ ${Number(unitCosts.cobertura.montagem).toFixed(2)}/m²`]);
  }
  if (unitCosts?.fechamento) {
    if (unitCosts.fechamento.material) custosUnit.push(['Fechamento - Material', `R$ ${Number(unitCosts.fechamento.material).toFixed(2)}/m²`]);
    if (unitCosts.fechamento.montagem) custosUnit.push(['Fechamento - Montagem', `R$ ${Number(unitCosts.fechamento.montagem).toFixed(2)}/m²`]);
  }
  if (unitCosts?.steeldeck) {
    if (unitCosts.steeldeck.material) custosUnit.push(['Steel Deck - Material', `R$ ${Number(unitCosts.steeldeck.material).toFixed(2)}/m²`]);
  }

  // Custos unitários HTML - 2 colunas
  let custosHTML = '';
  if (custosUnit.length > 0) {
    const mid = Math.ceil(custosUnit.length / 2);
    const col1 = custosUnit.slice(0, mid);
    const col2 = custosUnit.slice(mid);
    custosHTML = `
    <div style="border:2px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <div style="background:#2d8c7f;color:white;padding:8px 16px;font-size:11px;font-weight:700;letter-spacing:2px;">CUSTOS UNITÁRIOS DE REFERÊNCIA</div>
      <div style="padding:14px 20px;display:flex;gap:40px;">
        <div style="flex:1;">
          ${col1.map(c => `<div style="margin-bottom:6px;"><strong style="font-size:10px;color:#333;">${c[0]}:</strong><br/><span style="font-size:11px;color:#1e293b;">${c[1]}</span></div>`).join('')}
        </div>
        <div style="flex:1;">
          ${col2.map(c => `<div style="margin-bottom:6px;"><strong style="font-size:10px;color:#333;">${c[0]}:</strong><br/><span style="font-size:11px;color:#1e293b;">${c[1]}</span></div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  // Setores HTML
  const setoresHTML = setores.map((setor, idx) => {
    const m = calcSetorMetrics(setor);
    const rows = setor.itens.map((item, ri) => {
      const totalItem = (item.quantidade || 0) * ((item.precoMaterial || 0) + (item.precoInstalacao || 0));
      return `<tr style="background:${ri % 2 === 0 ? 'white' : '#f8fafb'};">
        <td style="padding:8px 12px;border-bottom:1px solid #e8ecef;font-size:11px;">${item.descricao || ''}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e8ecef;text-align:center;font-size:11px;">${item.unidade || '-'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e8ecef;text-align:center;font-size:11px;">${fmtN(item.quantidade)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e8ecef;text-align:right;font-size:11px;">${fmt((item.precoMaterial||0)+(item.precoInstalacao||0))}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e8ecef;text-align:right;font-weight:700;font-size:11px;">${fmt(totalItem)}</td>
      </tr>`;
    }).join('');

    // Analysis badges
    const badges = [];
    if (m.peso > 0) {
      badges.push(`<span style="display:inline-block;padding:4px 10px;border:1px solid #d0d5dd;border-radius:4px;font-size:10px;font-weight:600;margin-right:8px;">${fmtN(m.peso)} kg</span>`);
      badges.push(`<span style="display:inline-block;padding:4px 10px;border:1px solid #d0d5dd;border-radius:4px;font-size:10px;font-weight:600;margin-right:8px;">R$ ${(m.valorKg).toFixed(2).replace('.', ',')}/kg</span>`);
    }
    if (m.area > 0) {
      badges.push(`<span style="display:inline-block;padding:4px 10px;border:1px solid #d0d5dd;border-radius:4px;font-size:10px;font-weight:600;margin-right:8px;">${fmtN(m.area)} m²</span>`);
      badges.push(`<span style="display:inline-block;padding:4px 10px;border:1px solid #d0d5dd;border-radius:4px;font-size:10px;font-weight:600;margin-right:8px;">R$ ${(m.valorM2).toFixed(2).replace('.', ',')}/m²</span>`);
    }

    return `
    <div style="border:2px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:18px;">
      <!-- Setor Header -->
      <div style="padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e8ecef;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="background:#2d8c7f;color:white;width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${idx+1}</span>
          <span style="font-size:12px;font-weight:700;color:#1e293b;">${setor.nome.toUpperCase()}</span>
        </div>
        <span style="font-size:13px;font-weight:800;color:#1e293b;">${fmt(m.total)}</span>
      </div>
      <!-- Table -->
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f0f2f5;">
          <th style="padding:8px 12px;text-align:left;font-size:10px;font-weight:700;color:#475569;letter-spacing:0.5px;">DESCRIÇÃO</th>
          <th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:#475569;letter-spacing:0.5px;">UN</th>
          <th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:#475569;letter-spacing:0.5px;">QUANTIDADE</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#475569;letter-spacing:0.5px;">PREÇO UNIT.</th>
          <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#475569;letter-spacing:0.5px;">TOTAL</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <!-- Subtotal -->
      <div style="background:#f0f9f7;padding:8px 16px;display:flex;justify-content:space-between;align-items:center;border-top:2px solid #2d8c7f;">
        <span style="font-size:11px;font-weight:600;color:#475569;">Subtotal - ${setor.nome.toUpperCase()}</span>
        <span style="font-size:12px;font-weight:800;color:#1e293b;">${fmt(m.total)}</span>
      </div>
      <!-- Analysis Badges -->
      ${badges.length > 0 ? `<div style="padding:8px 16px;background:#fafbfc;">${badges.join('')}</div>` : ''}
    </div>`;
  }).join('');

  // Cronograma bars
  const projDias = cronograma?.projeto || 10;
  const fabDias = cronograma?.fabricacao || 30;
  const montDias = cronograma?.montagem || 15;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Proposta Comercial - ${project?.nome || 'Projeto'} - Grupo Montex</title>
<style>
  @media print {
    body { margin: 0; }
    .page { page-break-after: always; box-shadow: none !important; margin: 0 !important; }
    .page:last-child { page-break-after: avoid; }
    .no-print { display: none !important; }
    .content-wrapper { margin-top: 0 !important; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; font-size: 11px; line-height: 1.5; background: #e8ecef; }
  .page { width: 210mm; min-height: 297mm; margin: 20px auto; background: white; box-shadow: 0 2px 20px rgba(0,0,0,0.12); position: relative; overflow: hidden; }
  @media print { body { background: white; } }

  .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #2d8c7f; color: white; padding: 10px 24px; display: flex; gap: 12px; align-items: center; z-index: 100; font-family: sans-serif; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
  .toolbar button { padding: 8px 18px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px; transition: opacity 0.2s; }
  .toolbar button:hover { opacity: 0.85; }
  .toolbar .btn-print { background: white; color: #2d8c7f; }
  .toolbar .btn-close { background: rgba(255,255,255,0.15); color: white; margin-left: auto; }
  .toolbar span { font-weight: 700; font-size: 14px; letter-spacing: 1.5px; }
  @media print { .toolbar { display: none; } }
  .content-wrapper { margin-top: 56px; padding-bottom: 20px; }
  @media print { .content-wrapper { margin-top: 0; padding-bottom: 0; } }

  /* Header institucional */
  .header-bar { background: linear-gradient(135deg, #2d8c7f 0%, #3ba89a 100%); padding: 16px 28px; display: flex; align-items: center; justify-content: space-between; }
  .header-left { display: flex; align-items: center; gap: 14px; }
  .header-title { color: white; }
  .header-title h1 { font-size: 22px; font-weight: 800; letter-spacing: 3px; margin: 0; line-height: 1.1; }
  .header-title p { font-size: 10px; letter-spacing: 4px; color: rgba(255,255,255,0.8); margin: 2px 0 0; }
  .header-right { text-align: right; color: white; }
  .header-right .label { font-size: 9px; letter-spacing: 2px; color: rgba(255,255,255,0.75); }
  .header-right .number { font-size: 22px; font-weight: 800; }
  .header-right .dates { font-size: 9px; color: rgba(255,255,255,0.7); margin-top: 2px; }

  /* Section box */
  .section-box { border: 2px solid #e0e0e0; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
  .section-title { background: #2d8c7f; color: white; padding: 8px 16px; font-size: 11px; font-weight: 700; letter-spacing: 2px; }
  .section-content { padding: 14px 20px; }

  /* Footer */
  .page-footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 10px 28px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #64748b; border-top: 1px solid #e0e0e0; background: white; }
  .page-footer strong { color: #2d8c7f; font-size: 9px; }
</style>
</head>
<body>

<!-- TOOLBAR -->
<div class="toolbar no-print">
  <span>GRUPO MONTEX — Proposta Comercial</span>
  <button class="btn-print" onclick="window.print()">Imprimir / Salvar PDF</button>
  <button class="btn-close" onclick="window.close()">Fechar</button>
</div>

<div class="content-wrapper">

<!-- ============================================ -->
<!-- PAGE 1: HEADER + DADOS + CUSTOS + ORÇAMENTO  -->
<!-- ============================================ -->
<div class="page">
  <!-- Header Institucional -->
  <div class="header-bar">
    <div class="header-left">
      ${MONTEX_LOGO_WHITE_SVG}
      <div class="header-title">
        <h1>GRUPO MONTEX</h1>
        <p>SOLUÇÕES EM AÇO</p>
      </div>
    </div>
    <div class="header-right">
      <div class="label">PROPOSTA COMERCIAL</div>
      <div class="number">Nº ${propNum}</div>
      <div class="dates">Emissão: ${dataEmissao} | Validade: ${dataValidade}</div>
    </div>
  </div>

  <div style="padding:20px 28px 40px;">

    <!-- DADOS DO PROJETO -->
    <div class="section-box">
      <div class="section-title">DADOS DO PROJETO</div>
      <div class="section-content">
        <table style="width:100%;font-size:12px;">
          <tr>
            <td style="padding:4px 0;width:50%;"><strong style="color:#64748b;">Projeto:</strong> ${project?.nome || '-'}</td>
            <td style="padding:4px 0;"><strong style="color:#64748b;">Tipo:</strong> ${(project?.tipo || 'Galpão Industrial').toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;"><strong style="color:#64748b;">Cliente:</strong> ${project?.cliente || '-'}</td>
            <td style="padding:4px 0;"><strong style="color:#64748b;">Região:</strong> ${(project?.regiao || 'Sudeste').toUpperCase()}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- CUSTOS UNITÁRIOS -->
    ${custosHTML}

    <!-- ORÇAMENTO DETALHADO POR SETOR -->
    <div style="border:2px solid #e0e0e0;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <div style="background:#2d8c7f;color:white;padding:8px 16px;font-size:11px;font-weight:700;letter-spacing:2px;display:flex;justify-content:space-between;">
        <span>ORÇAMENTO DETALHADO POR SETOR</span>
        <span>${setores.length} SETOR${setores.length > 1 ? 'ES' : ''} | ${totalItens} ITENS</span>
      </div>
    </div>

    ${setoresHTML}

  </div>

  <!-- Footer -->
  <div class="page-footer">
    <div><strong>GRUPO MONTEX - Soluções em Aço</strong><br/>CNPJ: 00.000.000/0001-00 | contato@grupomontex.com.br | (31) 9 9999-9999</div>
    <div style="text-align:right;">Proposta ${propNum} | ${dataEmissao} | Pág 1</div>
  </div>
</div>

<!-- ============================================ -->
<!-- PAGE 2: TOTAL + COMPOSIÇÃO + PAGAMENTO + CRONOGRAMA + ESCOPO -->
<!-- ============================================ -->
<div class="page">
  <!-- Header -->
  <div class="header-bar">
    <div class="header-left">
      ${MONTEX_LOGO_WHITE_SVG}
      <div class="header-title">
        <h1>GRUPO MONTEX</h1>
        <p>SOLUÇÕES EM AÇO</p>
      </div>
    </div>
    <div class="header-right">
      <div class="label">PROPOSTA COMERCIAL</div>
      <div class="number">Nº ${propNum}</div>
    </div>
  </div>

  <div style="padding:20px 28px 40px;">

    <!-- TOTAL GERAL -->
    <div style="border:2px solid #2d8c7f;border-radius:8px;overflow:hidden;margin-bottom:18px;">
      <div style="background:#e8f5f1;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;font-weight:800;color:#1e293b;letter-spacing:1px;">TOTAL GERAL DO ORÇAMENTO</span>
        <span style="font-size:18px;font-weight:800;color:#1e293b;">${fmt(totalOrcamento)}</span>
      </div>
    </div>

    <!-- MÉTRICAS (4 boxes) -->
    <div style="display:flex;gap:10px;margin-bottom:20px;">
      <div style="flex:1;border:2px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:1px;margin-bottom:4px;">PESO TOTAL</div>
        <div style="font-size:18px;font-weight:800;color:#1e293b;">${fmtN(totalWeight)} kg</div>
      </div>
      <div style="flex:1;border:2px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:1px;margin-bottom:4px;">ÁREA TOTAL</div>
        <div style="font-size:18px;font-weight:800;color:#1e293b;">${fmtN(totalArea)} m²</div>
      </div>
      <div style="flex:1;border:2px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:1px;margin-bottom:4px;">PREÇO MÉDIO / KG</div>
        <div style="font-size:18px;font-weight:800;color:#1e293b;">R$ ${totalWeight > 0 ? (totalOrcamento / totalWeight).toFixed(2).replace('.', ',') : '0,00'}</div>
      </div>
      <div style="flex:1;border:2px solid #e0e0e0;border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:1px;margin-bottom:4px;">PREÇO MÉDIO / M²</div>
        <div style="font-size:18px;font-weight:800;color:#1e293b;">R$ ${totalArea > 0 ? (totalOrcamento / totalArea).toFixed(2).replace('.', ',') : '0,00'}</div>
      </div>
    </div>

    <!-- COMPOSIÇÃO DO INVESTIMENTO -->
    <div class="section-box">
      <div class="section-title">Composição do Investimento</div>
      <div class="section-content" style="display:flex;gap:30px;align-items:center;">
        <div style="flex:1;font-size:12px;">
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dotted #d0d5dd;">
            <span>Material (s/ margem/impostos)</span>
            <strong>${fmt(custoMaterial)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dotted #d0d5dd;">
            <span>Instalação (Fab/Pint/Transp/Mont)</span>
            <strong>${fmt(custoInstalacao)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dotted #d0d5dd;">
            <span>Margem (${margemPct}%) s/ instalação</span>
            <strong>${fmt(margemVal)}</strong>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;">
            <span>Impostos (${impostosPct}%) s/ instalação</span>
            <strong>${fmt(impostosVal)}</strong>
          </div>
        </div>
        <div style="text-align:center;padding-left:24px;border-left:2px solid #2d8c7f;min-width:180px;">
          <div style="font-size:10px;color:#64748b;letter-spacing:1px;margin-bottom:4px;">VALOR TOTAL DA PROPOSTA</div>
          <div style="font-size:28px;font-weight:800;color:#1e293b;">${fmt(precoFinal)}</div>
        </div>
      </div>
    </div>

    <!-- CONDIÇÕES DE PAGAMENTO -->
    <div class="section-box">
      <div class="section-title">CONDIÇÕES DE PAGAMENTO</div>
      <div class="section-content" style="padding:0;">
        <div style="display:flex;">
          <div style="flex:1;padding:16px;text-align:center;border-right:1px solid #e0e0e0;">
            <div style="font-size:28px;font-weight:800;color:#1e293b;">${pagamento.assinatura}%</div>
            <div style="font-size:10px;color:#64748b;margin:4px 0;">Na Assinatura do Contrato</div>
            <div style="font-size:12px;font-weight:700;color:#1e293b;">${fmt(precoFinal * pagamento.assinatura / 100)}</div>
          </div>
          <div style="flex:1;padding:16px;text-align:center;border-right:1px solid #e0e0e0;">
            <div style="font-size:28px;font-weight:800;color:#1e293b;">${pagamento.aprovacao}%</div>
            <div style="font-size:10px;color:#64748b;margin:4px 0;">Aprovação do Projeto</div>
            <div style="font-size:12px;font-weight:700;color:#1e293b;">${fmt(precoFinal * pagamento.aprovacao / 100)}</div>
          </div>
          <div style="flex:1;padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#1e293b;">${pagamento.medicoes}%</div>
            <div style="font-size:10px;color:#64748b;margin:4px 0;">Medições Mensais</div>
            <div style="font-size:12px;font-weight:700;color:#1e293b;">${fmt(precoFinal * pagamento.medicoes / 100)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- CRONOGRAMA -->
    <div class="section-box">
      <div class="section-title">CRONOGRAMA ESTIMADO (${prazoDias} DIAS)</div>
      <div class="section-content">
        <div style="display:flex;gap:4px;margin-bottom:8px;">
          <div style="flex:${projDias};background:#3b82f6;color:white;text-align:center;border-radius:6px;padding:10px 8px;font-size:11px;font-weight:700;">Projeto (${projDias}d)</div>
          <div style="flex:${fabDias};background:#f59e0b;color:white;text-align:center;border-radius:6px;padding:10px 8px;font-size:11px;font-weight:700;">Fabricação (${fabDias}d)</div>
          <div style="flex:${montDias};background:#10b981;color:white;text-align:center;border-radius:6px;padding:10px 8px;font-size:11px;font-weight:700;">Montagem (${montDias}d)</div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:#64748b;">
          <span>Início</span>
          <span>→</span>
          <span>→</span>
          <span>Entrega Final</span>
        </div>
      </div>
    </div>

    <!-- ESCOPO DE FORNECIMENTO -->
    <div class="section-box">
      <div class="section-title">ESCOPO DE FORNECIMENTO</div>
      <div class="section-content" style="font-size:11px;line-height:1.7;color:#475569;">
        <p><strong style="color:#1e293b;">INCLUSO:</strong> ${escopoIncluso}</p>
        <p style="margin-top:10px;"><strong style="color:#1e293b;">NÃO INCLUSO:</strong> ${escopoNaoIncluso}</p>
      </div>
    </div>

  </div>

  <!-- Footer -->
  <div class="page-footer">
    <div><strong>GRUPO MONTEX - Soluções em Aço</strong><br/>CNPJ: 00.000.000/0001-00 | contato@grupomontex.com.br | (31) 9 9999-9999</div>
    <div style="text-align:right;">Proposta ${propNum} | ${dataEmissao} | Pág 2</div>
  </div>
</div>

<!-- ============================================ -->
<!-- PAGE 3: OBRIGAÇÕES + ASSINATURAS            -->
<!-- ============================================ -->
<div class="page">
  <!-- Header -->
  <div class="header-bar">
    <div class="header-left">
      ${MONTEX_LOGO_WHITE_SVG}
      <div class="header-title">
        <h1>GRUPO MONTEX</h1>
        <p>SOLUÇÕES EM AÇO</p>
      </div>
    </div>
    <div class="header-right">
      <div class="label">PROPOSTA COMERCIAL</div>
      <div class="number">Nº ${propNum}</div>
    </div>
  </div>

  <div style="padding:20px 28px 40px;">

    <!-- OBRIGAÇÕES DO CONTRATANTE -->
    <div class="section-box">
      <div class="section-title">OBRIGAÇÕES DO CONTRATANTE</div>
      <div class="section-content" style="font-size:11px;line-height:1.7;color:#475569;">
        ${obrigacoes}
      </div>
    </div>

    <!-- ASSINATURAS -->
    <div style="margin-top:60px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#1e293b;margin-bottom:50px;">ASSINATURAS</div>
      <div style="display:flex;gap:80px;margin-top:80px;">
        <div style="flex:1;text-align:center;">
          <div style="border-top:2px solid #2d8c7f;padding-top:10px;">
            <div style="font-weight:700;font-size:12px;color:#1e293b;">GRUPO MONTEX</div>
            <div style="font-size:10px;color:#64748b;margin-top:2px;">Guilherme Maciel Vieira - Diretor Comercial</div>
          </div>
        </div>
        <div style="flex:1;text-align:center;">
          <div style="border-top:2px solid #2d8c7f;padding-top:10px;">
            <div style="font-weight:700;font-size:12px;color:#1e293b;">CONTRATANTE</div>
            <div style="font-size:10px;color:#64748b;margin-top:2px;">${project?.cliente || '___________________________'}</div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Footer -->
  <div class="page-footer">
    <div><strong>GRUPO MONTEX - Soluções em Aço</strong><br/>CNPJ: 00.000.000/0001-00 | contato@grupomontex.com.br | (31) 9 9999-9999</div>
    <div style="text-align:right;">Proposta ${propNum} | ${dataEmissao} | Pág 3</div>
  </div>
</div>

</div>
</body>
</html>`;

  return html;
}

/**
 * Abre a proposta HTML em nova janela (permite imprimir como PDF)
 */
export function openPropostaHTML(data) {
  const html = buildPropostaHTML(data);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
  return html;
}

/**
 * Gera PDF via nova janela + auto-print
 */
export async function generatePropostaPDF(data) {
  const html = buildPropostaHTML(data);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 600);
  }
  return null;
}

/**
 * Gera DOCX baixável a partir do HTML
 */
export async function generatePropostaDOCX(data) {
  const html = buildPropostaHTML(data);

  // Extract body content for Word
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;

  const docxContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
        xmlns:w='urn:schemas-microsoft-com:office:word'
        xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
    <style>
      @page { size: A4; margin: 1.5cm; }
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; }
      table { border-collapse: collapse; width: 100%; }
      .no-print { display: none; }
      .toolbar { display: none; }
      .content-wrapper { margin-top: 0; }
    </style>
  </head>
  <body>
    ${bodyContent}
  </body>
  </html>`;

  const blob = new Blob(['\ufeff', docxContent], { type: 'application/msword' });
  return blob;
}
