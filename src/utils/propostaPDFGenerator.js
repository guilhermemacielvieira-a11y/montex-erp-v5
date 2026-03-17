/**
 * Gerador de Proposta Comercial - Grupo Montex
 * v5 - HTML standalone + PDF via nova janela + DOCX via blob
 * Gera HTML profissional com capa, tabelas, composição, pagamento, cronograma, escopo
 */

const fmt = (v) => {
  if (!v || isNaN(v)) return 'R$ 0,00';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtN = (v) => {
  if (!v || isNaN(v)) return '0';
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
};

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
 * Gera o HTML completo da proposta comercial
 */
export function buildPropostaHTML(data) {
  const { project, setores, calculations, unitCosts, paymentConditions, cronograma, escopo } = data;

  const propNum = project?.numeroPropostas || data.propostaNumber || `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}`;
  const prazoDias = (cronograma?.projeto || 10) + (cronograma?.fabricacao || 30) + (cronograma?.montagem || 15);
  const pagamento = paymentConditions || { assinatura: 10, aprovacao: 5, medicoes: 85 };
  const dataEmissao = project?.dataEmissao ? new Date(project.dataEmissao).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  const dataValidade = project?.dataValidade ? new Date(project.dataValidade).toLocaleDateString('pt-BR') : new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('pt-BR');
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // Totals
  let totalWeight = 0, totalArea = 0, custoMaterial = 0, custoInstalacao = 0;
  setores.forEach(s => {
    const gruposPorBase = {};
    (s.itens || []).forEach(item => {
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

  // Escopo
  const escopoIncluso = escopo?.incluso || 'Projeto executivo de estrutura metálica; Fabricação completa em fábrica; Tratamento superficial e pintura; Transporte até a obra; Montagem completa com equipamentos; Acompanhamento técnico durante execução; Garantia de 5 anos contra defeitos de fabricação.';
  const escopoNaoIncluso = escopo?.naoIncluso || 'Fundações e bases de concreto; Instalações elétricas e hidráulicas; Licenças e alvarás; Terraplenagem e preparação do terreno.';
  const obrigacoes = cronograma?.obrigacoes || 'Disponibilizar acesso ao local da obra; Fornecer ponto de energia elétrica e água; Garantir fundações conforme projeto fornecido pela Montex.';

  // Setores HTML
  const setoresHTML = setores.map((setor, idx) => {
    const m = calcSetorMetrics(setor);
    const rows = setor.itens.map(item => {
      const totalItem = (item.quantidade || 0) * ((item.precoMaterial || 0) + (item.precoInstalacao || 0));
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;">${item.descricao || ''}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.unidade || '-'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">${fmtN(item.quantidade)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;">${fmt((item.precoMaterial||0)+(item.precoInstalacao||0))}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">${fmt(totalItem)}</td>
      </tr>`;
    }).join('');

    const analysis = [];
    if (m.peso > 0) analysis.push(`Peso: ${fmtN(m.peso)} kg · R$/kg: ${fmt(m.valorKg)}`);
    if (m.area > 0) analysis.push(`Área: ${fmtN(m.area)} m² · R$/m²: ${fmt(m.valorM2)}`);

    return `
      <div style="background:#0f2027;color:white;padding:8px 14px;display:flex;justify-content:space-between;border-radius:4px 4px 0 0;margin-top:16px;font-weight:700;font-size:11px;">
        <span>${idx+1}. ${setor.nome}</span>
        <span style="color:#94d2bd;">${fmt(m.total)}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead><tr style="background:#475569;color:white;">
          <th style="padding:6px 10px;text-align:left;font-size:9px;">DESCRIÇÃO</th>
          <th style="padding:6px 10px;text-align:center;font-size:9px;">UN</th>
          <th style="padding:6px 10px;text-align:center;font-size:9px;">QTD</th>
          <th style="padding:6px 10px;text-align:right;font-size:9px;">PREÇO UNIT.</th>
          <th style="padding:6px 10px;text-align:right;font-size:9px;">TOTAL</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="background:#e8f5f3;padding:6px 14px;font-weight:700;color:#0f6650;text-align:right;border:1px solid #1a7a6d;font-size:11px;">
        Subtotal: ${fmt(m.total)}
      </div>
      ${analysis.length > 0 ? `<div style="background:#f0f9ff;padding:4px 14px;text-align:center;font-size:9px;color:#475569;font-style:italic;">${analysis.join(' | ')}</div>` : ''}
    `;
  }).join('');

  // Custos unitários
  const custosUnit = [
    ['Estrutura - Material', `R$ ${(unitCosts?.estrutura?.material||0).toFixed(2)}/kg`],
    ['Estrutura - Fabricação', `R$ ${(unitCosts?.estrutura?.fabricacao||0).toFixed(2)}/kg`],
    ['Estrutura - Pintura', `R$ ${(unitCosts?.estrutura?.pintura||0).toFixed(2)}/kg`],
    ['Estrutura - Transporte', `R$ ${(unitCosts?.estrutura?.transporte||0).toFixed(2)}/kg`],
    ['Estrutura - Montagem', `R$ ${(unitCosts?.estrutura?.montagem||0).toFixed(2)}/kg`],
    ['Estrutura - Projeto', `R$ ${(unitCosts?.estrutura?.projeto||0).toFixed(2)}/kg`],
    ['Cobertura - Material', `R$ ${(unitCosts?.cobertura?.material||0).toFixed(2)}/m²`],
    ['Cobertura - Montagem', `R$ ${(unitCosts?.cobertura?.montagem||0).toFixed(2)}/m²`],
    ['Fechamento - Material', `R$ ${(unitCosts?.fechamento?.material||0).toFixed(2)}/m²`],
    ['Fechamento - Montagem', `R$ ${(unitCosts?.fechamento?.montagem||0).toFixed(2)}/m²`],
  ];

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Proposta Comercial - ${project?.nome || 'Projeto'} - Grupo Montex</title>
<style>
  @media print {
    body { margin: 0; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: avoid; }
    .no-print { display: none !important; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; font-size: 11px; line-height: 1.5; background: #f1f5f9; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto 20px; background: white; box-shadow: 0 2px 20px rgba(0,0,0,0.1); position: relative; overflow: hidden; }
  @media print { .page { box-shadow: none; margin: 0; } body { background: white; } }

  .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #1a7a6d; color: white; padding: 10px 20px; display: flex; gap: 10px; align-items: center; z-index: 100; font-family: sans-serif; }
  .toolbar button { padding: 8px 16px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 12px; }
  .toolbar .btn-pdf { background: #dc2626; color: white; }
  .toolbar .btn-print { background: white; color: #1a7a6d; }
  .toolbar .btn-close { background: #475569; color: white; margin-left: auto; }
  .toolbar span { font-weight: 700; font-size: 14px; letter-spacing: 1px; }
  @media print { .toolbar { display: none; } }
  .content-wrapper { margin-top: 50px; }
  @media print { .content-wrapper { margin-top: 0; } }
</style>
</head>
<body>

<!-- TOOLBAR -->
<div class="toolbar no-print">
  <span>GRUPO MONTEX — Proposta Comercial</span>
  <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  <button class="btn-close" onclick="window.close()">✕ Fechar</button>
</div>

<div class="content-wrapper">

<!-- PAGE 1: CAPA -->
<div class="page">
  <div style="width:100%;background:linear-gradient(135deg,#0f2027 0%,#1a3a43 50%,#2c5364 100%);padding:80px 40px 50px;text-align:center;color:white;">
    <div style="font-size:14px;color:#94d2bd;letter-spacing:6px;margin-bottom:10px;">GRUPO</div>
    <div style="font-size:42px;font-weight:800;letter-spacing:6px;margin-bottom:8px;">MONTEX</div>
    <div style="font-size:13px;color:#94d2bd;letter-spacing:4px;margin-bottom:30px;">SOLUÇÕES EM AÇO</div>
    <div style="width:100px;height:3px;background:#c8a951;margin:0 auto 40px;"></div>
    <div style="font-size:14px;color:#94d2bd;letter-spacing:3px;margin-bottom:12px;">PROPOSTA COMERCIAL</div>
    <div style="font-size:28px;font-weight:800;background:rgba(255,255,255,0.1);display:inline-block;padding:8px 50px;border:2px solid #c8a951;">Nº ${propNum}</div>
  </div>

  <div style="width:75%;max-width:500px;margin:50px auto;background:white;border-radius:10px;padding:35px;text-align:center;border:2px solid #e2e8f0;">
    <div style="font-size:24px;font-weight:800;color:#1a7a6d;margin-bottom:12px;">${(project?.nome || 'PROJETO').toUpperCase()}</div>
    <div style="font-size:16px;color:#1e293b;margin-bottom:8px;">${project?.cliente || 'Cliente'}</div>
    <div style="font-size:12px;color:#64748b;">${project?.tipo || 'Galpão Industrial'} | ${(project?.regiao || 'Sudeste').toUpperCase()}</div>
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0;">
      <span style="font-size:11px;color:#64748b;">Emissão: ${dataEmissao}</span>
      <span style="margin:0 12px;color:#e2e8f0;">|</span>
      <span style="font-size:11px;color:#64748b;">Validade: ${dataValidade}</span>
    </div>
  </div>

  <div style="position:absolute;bottom:30px;left:0;right:0;text-align:center;color:#64748b;font-size:11px;">
    ${months[new Date().getMonth()]} / ${new Date().getFullYear()} — Grupo Montex — Soluções em Aço
  </div>
</div>

<!-- PAGE 2+: CONTEÚDO -->
<div class="page">
  <div style="background:#1a7a6d;color:white;padding:8px 20px;display:flex;justify-content:space-between;font-size:9px;font-weight:700;letter-spacing:1px;">
    <span>GRUPO MONTEX — SOLUÇÕES EM AÇO</span>
    <span>PROPOSTA ${propNum}</span>
  </div>

  <div style="padding:16px 20px;">

    <!-- DADOS DO PROJETO -->
    <div style="background:#1a7a6d;color:white;padding:7px 14px;font-size:11px;font-weight:700;letter-spacing:1px;border-radius:4px;margin-bottom:12px;">DADOS DO PROJETO</div>
    <table style="width:100%;font-size:11px;margin-bottom:16px;">
      <tr>
        <td style="padding:4px 0;width:50%;"><strong style="color:#64748b;">Projeto:</strong> ${project?.nome || '-'}</td>
        <td style="padding:4px 0;"><strong style="color:#64748b;">Tipo:</strong> ${project?.tipo || 'Galpão Industrial'}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;"><strong style="color:#64748b;">Cliente:</strong> ${project?.cliente || '-'}</td>
        <td style="padding:4px 0;"><strong style="color:#64748b;">Região:</strong> ${(project?.regiao || 'Sudeste').toUpperCase()}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;"><strong style="color:#64748b;">Proposta Nº:</strong> ${propNum}</td>
        <td style="padding:4px 0;"><strong style="color:#64748b;">Validade:</strong> ${dataValidade}</td>
      </tr>
    </table>

    <!-- CUSTOS UNITÁRIOS removidos da proposta comercial -->

    <!-- ORÇAMENTO DETALHADO -->
    <div style="background:#1a7a6d;color:white;padding:7px 14px;font-size:11px;font-weight:700;letter-spacing:1px;border-radius:4px;margin-bottom:4px;">ORÇAMENTO DETALHADO — ${setores.length} SETOR${setores.length > 1 ? 'ES' : ''}</div>
    ${setoresHTML}

    <!-- TOTAL -->
    <div style="background:linear-gradient(135deg,#006666,#1a7a6d);color:white;padding:16px 22px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;margin:20px 0;">
      <span style="font-size:14px;font-weight:800;letter-spacing:1px;">INVESTIMENTO TOTAL DA OBRA</span>
      <span style="font-size:22px;font-weight:800;">${fmt(precoFinal)}</span>
    </div>

    <div style="background:#e8f5f3;padding:8px 14px;border-radius:4px;text-align:center;font-size:10px;font-weight:700;color:#0f6650;margin-bottom:16px;">
      ${totalWeight > 0 ? `Peso: ${fmtN(totalWeight)} kg · ${fmt(precoKg)}/kg` : ''}
      ${totalArea > 0 ? ` · Área: ${fmtN(totalArea)} m² · ${fmt(precoM2)}/m²` : ''}
    </div>

    <!-- COMPOSIÇÃO -->
    <div style="background:#1a7a6d;color:white;padding:7px 14px;font-size:11px;font-weight:700;letter-spacing:1px;border-radius:4px;margin-bottom:12px;">COMPOSIÇÃO DO INVESTIMENTO</div>
    <div style="background:#f0fdf4;border:1px solid #10b981;border-radius:8px;padding:16px 20px;display:flex;gap:30px;align-items:center;margin-bottom:16px;">
      <div style="flex:1;font-size:11px;">
        <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Material (s/ margem)</span><strong>${fmt(custoMaterial)}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Instalação (Fab/Pint/Transp/Mont/Proj)</span><strong>${fmt(custoInstalacao)}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Margem (${margemPct}%) s/ instalação</span><strong style="color:#059669;">${fmt(margemVal)}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Impostos (${impostosPct}%) s/ instalação</span><strong style="color:#d97706;">${fmt(impostosVal)}</strong></div>
      </div>
      <div style="text-align:center;padding-left:20px;border-left:2px solid #10b981;">
        <div style="font-size:9px;color:#64748b;">VALOR TOTAL</div>
        <div style="font-size:26px;font-weight:800;color:#065f46;">${fmt(precoFinal)}</div>
      </div>
    </div>

    <!-- CONDIÇÕES DE PAGAMENTO -->
    <div style="background:#1a7a6d;color:white;padding:7px 14px;font-size:11px;font-weight:700;letter-spacing:1px;border-radius:4px;margin-bottom:12px;">CONDIÇÕES DE PAGAMENTO</div>
    <div style="display:flex;gap:12px;margin-bottom:16px;">
      <div style="flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center;border-top:3px solid #1a7a6d;">
        <div style="font-size:24px;font-weight:800;color:#1a7a6d;">${pagamento.assinatura}%</div>
        <div style="font-size:9px;color:#64748b;margin:4px 0;">Na Assinatura do Contrato</div>
        <div style="font-size:11px;font-weight:700;">${fmt(precoFinal * pagamento.assinatura / 100)}</div>
      </div>
      <div style="flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center;border-top:3px solid #f59e0b;">
        <div style="font-size:24px;font-weight:800;color:#f59e0b;">${pagamento.aprovacao}%</div>
        <div style="font-size:9px;color:#64748b;margin:4px 0;">Aprovação do Projeto</div>
        <div style="font-size:11px;font-weight:700;">${fmt(precoFinal * pagamento.aprovacao / 100)}</div>
      </div>
      <div style="flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:14px;text-align:center;border-top:3px solid #10b981;">
        <div style="font-size:24px;font-weight:800;color:#10b981;">${pagamento.medicoes}%</div>
        <div style="font-size:9px;color:#64748b;margin:4px 0;">Medições Mensais</div>
        <div style="font-size:11px;font-weight:700;">${fmt(precoFinal * pagamento.medicoes / 100)}</div>
      </div>
    </div>

    <!-- CRONOGRAMA -->
    <div style="background:#1a7a6d;color:white;padding:7px 14px;font-size:11px;font-weight:700;letter-spacing:1px;border-radius:4px;margin-bottom:12px;">CRONOGRAMA ESTIMADO (${prazoDias} DIAS)</div>
    <div style="display:flex;gap:6px;margin-bottom:16px;">
      <div style="flex:${cronograma?.projeto||10};background:#3b82f6;color:white;text-align:center;border-radius:6px;padding:10px 6px;font-size:10px;font-weight:700;">Projeto<br/>${cronograma?.projeto||10}d</div>
      <div style="flex:${cronograma?.fabricacao||30};background:#f59e0b;color:white;text-align:center;border-radius:6px;padding:10px 6px;font-size:10px;font-weight:700;">Fabricação<br/>${cronograma?.fabricacao||30}d</div>
      <div style="flex:${cronograma?.montagem||15};background:#10b981;color:white;text-align:center;border-radius:6px;padding:10px 6px;font-size:10px;font-weight:700;">Montagem<br/>${cronograma?.montagem||15}d</div>
    </div>

    <!-- ESCOPO -->
    <div style="background:#1a7a6d;color:white;padding:7px 14px;font-size:11px;font-weight:700;letter-spacing:1px;border-radius:4px;margin-bottom:12px;">ESCOPO DE FORNECIMENTO</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px;">
      <div>
        <div style="font-weight:800;margin-bottom:6px;font-size:11px;color:#065f46;">INCLUSO:</div>
        <div style="font-size:10px;color:#475569;line-height:1.6;">${escopoIncluso.split(';').map(s => s.trim()).filter(Boolean).map(s => `• ${s}`).join('<br/>')}</div>
      </div>
      <div>
        <div style="font-weight:800;margin-bottom:6px;font-size:11px;color:#991b1b;">NÃO INCLUSO:</div>
        <div style="font-size:10px;color:#475569;line-height:1.6;">${escopoNaoIncluso.split(';').map(s => s.trim()).filter(Boolean).map(s => `• ${s}`).join('<br/>')}</div>
      </div>
    </div>

    <!-- OBRIGAÇÕES -->
    <div style="background:#1a7a6d;color:white;padding:7px 14px;font-size:11px;font-weight:700;letter-spacing:1px;border-radius:4px;margin-bottom:12px;">OBRIGAÇÕES DO CONTRATANTE</div>
    <div style="font-size:10px;color:#475569;line-height:1.6;margin-bottom:30px;">
      ${obrigacoes.split(';').map(s => s.trim()).filter(Boolean).map(s => `• ${s}`).join('<br/>')}
    </div>

    <!-- ASSINATURAS -->
    <div style="display:flex;gap:60px;margin-top:50px;">
      <div style="flex:1;text-align:center;">
        <div style="border-top:1px solid #475569;padding-top:8px;margin-top:60px;">
          <div style="font-weight:700;font-size:11px;">GRUPO MONTEX</div>
          <div style="font-size:9px;color:#64748b;">Guilherme Maciel Vieira - Diretor Comercial</div>
        </div>
      </div>
      <div style="flex:1;text-align:center;">
        <div style="border-top:1px solid #475569;padding-top:8px;margin-top:60px;">
          <div style="font-weight:700;font-size:11px;">CONTRATANTE</div>
          <div style="font-size:9px;color:#64748b;">${project?.cliente || '___________________________'}</div>
        </div>
      </div>
    </div>

  </div>

  <div style="position:absolute;bottom:10px;left:20px;right:20px;border-top:1px solid #1a7a6d;padding-top:6px;display:flex;justify-content:space-between;font-size:8px;color:#64748b;">
    <span>Grupo Montex — Soluções em Aço</span>
    <span>Proposta ${propNum} | ${dataEmissao}</span>
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
 * Gera PDF via html2pdf.js (fallback)
 */
export async function generatePropostaPDF(data) {
  const html = buildPropostaHTML(data);

  // Approach: open in new window and auto-print
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    // Small delay to ensure content renders, then trigger print
    setTimeout(() => {
      win.print();
    }, 500);
  }

  return null; // No blob needed - handled by print dialog
}

/**
 * Gera DOCX baixável a partir do HTML
 */
export async function generatePropostaDOCX(data) {
  const html = buildPropostaHTML(data);

  // Create a DOCX-compatible HTML blob with Word namespace
  const docxContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <style>
        @page { size: A4; margin: 1.5cm; }
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; }
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #475569; color: white; padding: 4pt 6pt; font-size: 9pt; }
        td { padding: 3pt 6pt; border-bottom: 1pt solid #e2e8f0; }
      </style>
    </head>
    <body>
      ${html.replace(/<html.*?<body>/s, '').replace(/<\/body>.*<\/html>/s, '')}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', docxContent], { type: 'application/msword' });
  return blob;
}
