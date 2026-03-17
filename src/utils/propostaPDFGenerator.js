/**
 * Gerador de Proposta Comercial em PDF - Grupo Montex
 * v4 - PDF profissional via html2pdf.js com layout baseado no modelo .docx
 * Inclui capa, dados do projeto, tabelas detalhadas, composição, pagamento, cronograma, escopo
 */

const formatCurrencyBR = (value) => {
  if (!value || isNaN(value)) return 'R$ 0,00';
  return 'R$ ' + Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatNumberBR = (value) => {
  if (!value || isNaN(value)) return '0';
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
};

// Logo base64 inline (Montex M logo)
const LOGO_BASE64 = '/logo-montex.png';

function calcSetorMetrics(setor) {
  let setorTotal = 0;
  let setorWeight = 0;
  let setorArea = 0;
  const gruposPorBase = {};

  (setor.itens || []).forEach(item => {
    const total = (item.quantidade || 0) * (item.preco || 0);
    setorTotal += total;
    if (item.unidade === 'KG') {
      const base = (item.descricao || '').split(' - ')[0].trim() || item.descricao || 'item';
      if (!gruposPorBase[base] || (item.quantidade || 0) > gruposPorBase[base]) {
        gruposPorBase[base] = item.quantidade || 0;
      }
    }
    if (item.unidade === 'M2') {
      setorArea += item.quantidade || 0;
    }
  });

  setorWeight = Object.values(gruposPorBase).reduce((s, qty) => s + qty, 0);

  return {
    total: setorTotal,
    peso: setorWeight,
    area: setorArea,
    valorKg: setorWeight > 0 ? setorTotal / setorWeight : 0,
    valorM2: setorArea > 0 ? setorTotal / setorArea : 0,
  };
}

export async function generatePropostaPDF(data) {
  const { project, setores, calculations, unitCosts, propostaNumber, prazoExecucao, condicoesPagamento } = data;

  const propNum = propostaNumber || `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}`;
  const prazo = prazoExecucao || 150;
  const pagamento = condicoesPagamento || { assinatura: 10, projeto: 5, medicoes: 85 };
  const dataEmissao = new Date().toLocaleDateString('pt-BR');
  const dataValidade = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Totals
  const totalGeral = setores.reduce((sum, s) => sum + s.itens.reduce((is, item) => is + ((item.quantidade || 0) * (item.preco || 0)), 0), 0);

  let totalWeight = 0;
  setores.forEach(s => {
    const gruposPorBase = {};
    (s.itens || []).forEach(item => {
      if (item.unidade === 'KG') {
        const base = (item.descricao || '').split(' - ')[0].trim() || item.descricao || 'item';
        if (!gruposPorBase[base] || (item.quantidade || 0) > gruposPorBase[base]) {
          gruposPorBase[base] = item.quantidade || 0;
        }
      }
    });
    totalWeight += Object.values(gruposPorBase).reduce((s2, qty) => s2 + qty, 0);
  });

  const totalArea = setores.reduce((sum, s) => sum + s.itens.reduce((is, item) => is + ((item.unidade === 'M2') ? (item.quantidade || 0) : 0), 0), 0);
  const margemPct = calculations?.margemPct || 18;
  const impostosPct = calculations?.impostosPct || 12;

  let custoMaterial = 0;
  let custoInstalacao = 0;
  setores.forEach(s => {
    (s.itens || []).forEach(item => {
      const total = (item.quantidade || 0) * (item.preco || 0);
      const parts = (item.descricao || '').split(' - ');
      const sufixo = parts.length >= 2 ? parts[parts.length - 1].trim().toLowerCase() : '';
      if (sufixo === 'material') {
        custoMaterial += total;
      } else {
        custoInstalacao += total;
      }
    });
  });

  const margemInstalacao = custoInstalacao * (margemPct / 100);
  const subtotalInstalacao = custoInstalacao + margemInstalacao;
  const impostosInstalacao = subtotalInstalacao * (impostosPct / 100);
  const precoFinal = calculations?.precoFinal || (custoMaterial + subtotalInstalacao + impostosInstalacao);
  const precoKgTotal = totalWeight > 0 ? precoFinal / totalWeight : 0;
  const precoM2Total = totalArea > 0 ? precoFinal / totalArea : 0;

  // CSS Styles
  const styles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; font-size: 11px; line-height: 1.4; }
    .page { width: 210mm; min-height: 297mm; padding: 0; page-break-after: always; position: relative; background: white; }
    .page:last-child { page-break-after: avoid; }

    /* COVER PAGE */
    .cover { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-height: 297mm; }
    .cover-top { width: 100%; background: linear-gradient(135deg, #0f2027 0%, #1a3a43 50%, #2c5364 100%); padding: 60px 40px 40px; text-align: center; color: white; }
    .cover-logo { width: 120px; height: auto; margin-bottom: 20px; }
    .cover-company { font-size: 28px; font-weight: 800; letter-spacing: 4px; margin-bottom: 8px; }
    .cover-slogan { font-size: 13px; color: #94d2bd; letter-spacing: 3px; margin-bottom: 30px; }
    .cover-divider { width: 100px; height: 3px; background: #c8a951; margin: 0 auto 30px; }
    .cover-title { font-size: 16px; color: #94d2bd; letter-spacing: 2px; margin-bottom: 10px; }
    .cover-number { font-size: 24px; font-weight: 800; color: white; background: #2c5364; padding: 8px 40px; display: inline-block; }
    .cover-project { width: 80%; max-width: 500px; background: white; border-radius: 8px; padding: 30px; margin: 40px auto; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .cover-project-name { font-size: 22px; font-weight: 800; color: #1a7a6d; margin-bottom: 10px; }
    .cover-project-client { font-size: 15px; color: #1e293b; margin-bottom: 6px; }
    .cover-project-info { font-size: 12px; color: #64748b; }
    .cover-footer { margin-top: auto; padding: 30px; text-align: center; color: #64748b; font-size: 11px; }

    /* CONTENT PAGES */
    .content { padding: 20mm 18mm; }
    .page-header { background: #1a7a6d; color: white; padding: 8px 18mm; display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; letter-spacing: 1px; }

    /* SECTIONS */
    .section-title { background: #1a7a6d; color: white; padding: 8px 14px; font-size: 11px; font-weight: 700; letter-spacing: 1px; border-radius: 4px; margin: 20px 0 12px; text-transform: uppercase; }
    .section-title:first-child { margin-top: 0; }

    /* TABLES */
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #475569; color: white; padding: 6px 8px; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .font-bold { font-weight: 700; }

    /* SETOR HEADER */
    .setor-header { background: #0f2027; color: white; padding: 8px 12px; font-weight: 700; display: flex; justify-content: space-between; border-radius: 4px 4px 0 0; margin-top: 16px; font-size: 11px; }
    .setor-header .total { color: #94d2bd; }
    .setor-subtotal { background: #e8f5f3; padding: 6px 12px; font-weight: 700; color: #0f6650; text-align: right; border: 1px solid #1a7a6d; }
    .setor-analysis { background: #f0f9ff; padding: 5px 12px; font-style: italic; color: #475569; text-align: center; font-size: 9px; }

    /* GRAND TOTAL */
    .grand-total { background: linear-gradient(135deg, #006666, #1a7a6d); color: white; padding: 14px 20px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin: 20px 0; }
    .grand-total .label { font-size: 13px; font-weight: 800; letter-spacing: 1px; }
    .grand-total .value { font-size: 18px; font-weight: 800; }
    .summary-metrics { background: #e8f5f3; padding: 8px 14px; border-radius: 4px; text-align: center; font-size: 10px; font-weight: 700; color: #0f6650; margin-bottom: 20px; }

    /* INVESTIMENTO BOX */
    .invest-box { background: #f0fdf4; border: 1px solid #10b981; border-radius: 8px; padding: 20px; display: flex; gap: 30px; align-items: center; margin: 16px 0; }
    .invest-left { flex: 1; }
    .invest-right { text-align: center; }
    .invest-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
    .invest-right .small { font-size: 9px; color: #64748b; margin-bottom: 4px; }
    .invest-right .big { font-size: 24px; font-weight: 800; color: #065f46; }

    /* PAYMENT CARDS */
    .payment-grid { display: flex; gap: 12px; margin: 12px 0; }
    .payment-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; text-align: center; border-top: 3px solid #1a7a6d; }
    .payment-pct { font-size: 22px; font-weight: 800; color: #1a7a6d; }
    .payment-label { font-size: 9px; color: #64748b; margin: 4px 0; }
    .payment-value { font-size: 10px; font-weight: 700; color: #1e293b; }

    /* TIMELINE */
    .timeline { display: flex; gap: 4px; margin: 12px 0; }
    .timeline-item { flex: 1; text-align: center; border-radius: 6px; padding: 10px 6px; color: white; font-size: 9px; font-weight: 700; }
    .timeline-projeto { background: #3b82f6; }
    .timeline-fabricacao { background: #f59e0b; }
    .timeline-montagem { background: #10b981; }

    /* SIGNATURES */
    .signatures { display: flex; gap: 40px; margin-top: 60px; }
    .sig-block { flex: 1; text-align: center; }
    .sig-line { border-top: 1px solid #64748b; padding-top: 8px; margin-top: 40px; }
    .sig-name { font-weight: 700; font-size: 11px; }
    .sig-title { font-size: 9px; color: #64748b; }

    /* FOOTER */
    .page-footer { position: absolute; bottom: 10mm; left: 18mm; right: 18mm; border-top: 1px solid #1a7a6d; padding-top: 6px; display: flex; justify-content: space-between; font-size: 8px; color: #64748b; }

    /* FIELD ROW */
    .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; }
    .field-label { font-weight: 700; color: #64748b; font-size: 10px; }
    .field-value { color: #1e293b; }

    /* COSTS GRID */
    .costs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; font-size: 10px; }
    .costs-grid .item { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #f1f5f9; }
    .costs-grid .item-label { font-weight: 600; color: #64748b; }
    .costs-grid .item-value { color: #1e293b; }

    /* ESCOPO */
    .escopo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .escopo-title { font-weight: 800; margin-bottom: 6px; font-size: 11px; }
    .escopo-text { font-size: 10px; color: #475569; line-height: 1.5; }
    .nao-incluso { color: #991b1b; }
  `;

  // Build custos unitários list
  const custosRows = [
    ['Estrutura - Material', `R$ ${(unitCosts?.estrutura?.material || 0).toFixed(2)}/kg`],
    ['Estrutura - Fabricação', `R$ ${(unitCosts?.estrutura?.fabricacao || 0).toFixed(2)}/kg`],
    ['Estrutura - Pintura', `R$ ${(unitCosts?.estrutura?.pintura || 0).toFixed(2)}/kg`],
    ['Estrutura - Transporte', `R$ ${(unitCosts?.estrutura?.transporte || 0).toFixed(2)}/kg`],
    ['Estrutura - Montagem', `R$ ${(unitCosts?.estrutura?.montagem || 0).toFixed(2)}/kg`],
    ['Cobertura - Material', `R$ ${(unitCosts?.cobertura?.material || 0).toFixed(2)}/m²`],
    ['Cobertura - Montagem', `R$ ${(unitCosts?.cobertura?.montagem || 0).toFixed(2)}/m²`],
    ['Fechamento - Material', `R$ ${(unitCosts?.fechamento?.material || 0).toFixed(2)}/m²`],
    ['Fechamento - Montagem', `R$ ${(unitCosts?.fechamento?.montagem || 0).toFixed(2)}/m²`],
    ['Steel Deck - Material', `R$ ${(unitCosts?.steelDeck?.material || 0).toFixed(2)}/m²`],
    ['Steel Deck - Montagem', `R$ ${(unitCosts?.steelDeck?.montagem || 0).toFixed(2)}/m²`],
  ];

  // Build setores HTML
  const setoresHTML = setores.map((setor, idx) => {
    const metrics = calcSetorMetrics(setor);
    const itemsHTML = setor.itens.map((item, i) => `
      <tr>
        <td>${item.descricao || ''}</td>
        <td class="text-center">${item.unidade || '-'}</td>
        <td class="text-center">${formatNumberBR(item.quantidade)}</td>
        <td class="text-right">${formatCurrencyBR(item.preco)}</td>
        <td class="text-right font-bold">${formatCurrencyBR((item.quantidade || 0) * (item.preco || 0))}</td>
      </tr>
    `).join('');

    const analysisParts = [];
    if (metrics.peso > 0) {
      analysisParts.push(`Peso: ${formatNumberBR(metrics.peso)} kg`);
      analysisParts.push(`R$/kg: ${formatCurrencyBR(metrics.valorKg)}`);
    }
    if (metrics.area > 0) {
      analysisParts.push(`Área: ${formatNumberBR(metrics.area)} m²`);
      analysisParts.push(`R$/m²: ${formatCurrencyBR(metrics.valorM2)}`);
    }

    return `
      <div class="setor-header">
        <span>${idx + 1}. ${setor.nome}</span>
        <span class="total">${formatCurrencyBR(metrics.total)}</span>
      </div>
      <table>
        <thead><tr>
          <th class="text-left">DESCRIÇÃO</th>
          <th class="text-center">UN</th>
          <th class="text-center">QTD</th>
          <th class="text-right">PREÇO UNIT.</th>
          <th class="text-right">TOTAL</th>
        </tr></thead>
        <tbody>${itemsHTML}</tbody>
      </table>
      <div class="setor-subtotal">Subtotal - ${setor.nome}: ${formatCurrencyBR(metrics.total)}</div>
      ${analysisParts.length > 0 ? `<div class="setor-analysis">Análise: ${analysisParts.join(' | ')}</div>` : ''}
    `;
  }).join('');

  const fabDias = data.cronogramaDias?.fabricacao || Math.ceil((totalWeight / 1000) * 1.5) || 45;
  const montDias = data.cronogramaDias?.montagem || Math.ceil((totalWeight / 1000) * 2) || 30;
  const projDias = data.cronogramaDias?.projeto || 10;

  // Full HTML
  const html = `
    <html><head><style>${styles}</style></head><body>

    <!-- PAGE 1: COVER -->
    <div class="page cover">
      <div class="cover-top">
        <img src="${LOGO_BASE64}" class="cover-logo" crossorigin="anonymous" />
        <div class="cover-company">GRUPO MONTEX</div>
        <div class="cover-slogan">SOLUÇÕES EM AÇO</div>
        <div class="cover-divider"></div>
        <div class="cover-title">PROPOSTA COMERCIAL</div>
        <div class="cover-number">Nº ${propNum}</div>
      </div>

      <div class="cover-project">
        <div class="cover-project-name">${(project?.nome || 'PROJETO').toUpperCase()}</div>
        <div class="cover-project-client">${project?.cliente || 'Cliente'}</div>
        <div class="cover-project-info">${project?.tipo || 'Galpão Industrial'} | ${(project?.regiao || 'Sudeste').toUpperCase()}</div>
      </div>

      <div class="cover-footer">
        <div>${months[new Date().getMonth()]} / ${new Date().getFullYear()}</div>
        <div>Emissão: ${dataEmissao} | Validade: ${dataValidade}</div>
      </div>
    </div>

    <!-- PAGE 2+: CONTENT -->
    <div class="page">
      <div class="page-header">
        <span>GRUPO MONTEX</span>
        <span>DADOS DO PROJETO</span>
      </div>
      <div class="content">

        <div class="section-title">Dados do Projeto</div>
        <div class="field-grid" style="margin-bottom:16px;">
          <div><span class="field-label">Projeto: </span><span class="field-value">${project?.nome || '-'}</span></div>
          <div><span class="field-label">Tipo: </span><span class="field-value">${project?.tipo || 'Galpão Industrial'}</span></div>
          <div><span class="field-label">Cliente: </span><span class="field-value">${project?.cliente || '-'}</span></div>
          <div><span class="field-label">Região: </span><span class="field-value">${(project?.regiao || 'Sudeste').toUpperCase()}</span></div>
        </div>

        <div class="section-title">Custos Unitários de Referência</div>
        <div class="costs-grid" style="margin-bottom:16px;">
          ${custosRows.map(r => `<div class="item"><span class="item-label">${r[0]}:</span><span class="item-value">${r[1]}</span></div>`).join('')}
        </div>

        <div class="section-title">Orçamento Detalhado — ${setores.length} Setores</div>
        ${setoresHTML}

        <div class="grand-total">
          <span class="label">INVESTIMENTO TOTAL DA OBRA</span>
          <span class="value">${formatCurrencyBR(precoFinal)}</span>
        </div>

        <div class="summary-metrics">
          ${totalWeight > 0 ? `Peso Total: ${formatNumberBR(totalWeight)} kg | Preço Médio: ${formatCurrencyBR(precoKgTotal)}/kg` : ''}
          ${totalArea > 0 ? ` · Área Total: ${formatNumberBR(totalArea)} m² | Preço Médio: ${formatCurrencyBR(precoM2Total)}/m²` : ''}
        </div>

        <div class="section-title">Composição do Investimento</div>
        <div class="invest-box">
          <div class="invest-left">
            <div class="invest-row"><span>Material (s/ margem/impostos)</span><span class="font-bold">${formatCurrencyBR(custoMaterial)}</span></div>
            <div class="invest-row"><span>Instalação (Fab/Pint/Transp/Mont)</span><span class="font-bold">${formatCurrencyBR(custoInstalacao)}</span></div>
            <div class="invest-row"><span>Margem (${margemPct}%) s/ instalação</span><span class="font-bold">${formatCurrencyBR(margemInstalacao)}</span></div>
            <div class="invest-row"><span>Impostos (${impostosPct}%) s/ instalação</span><span class="font-bold">${formatCurrencyBR(impostosInstalacao)}</span></div>
          </div>
          <div class="invest-right">
            <div class="small">VALOR TOTAL DA PROPOSTA</div>
            <div class="big">${formatCurrencyBR(precoFinal)}</div>
          </div>
        </div>

        <div class="section-title">Condições de Pagamento</div>
        <div class="payment-grid">
          <div class="payment-card">
            <div class="payment-pct">${pagamento.assinatura}%</div>
            <div class="payment-label">Na Assinatura do Contrato</div>
            <div class="payment-value">${formatCurrencyBR(precoFinal * pagamento.assinatura / 100)}</div>
          </div>
          <div class="payment-card">
            <div class="payment-pct">${pagamento.projeto}%</div>
            <div class="payment-label">Aprovação do Projeto</div>
            <div class="payment-value">${formatCurrencyBR(precoFinal * pagamento.projeto / 100)}</div>
          </div>
          <div class="payment-card">
            <div class="payment-pct">${pagamento.medicoes}%</div>
            <div class="payment-label">Medições Mensais</div>
            <div class="payment-value">${formatCurrencyBR(precoFinal * pagamento.medicoes / 100)}</div>
          </div>
        </div>

        <div class="section-title">Cronograma Estimado (${prazo} dias)</div>
        <div class="timeline">
          <div class="timeline-item timeline-projeto">Projeto<br/>${projDias}d</div>
          <div class="timeline-item timeline-fabricacao">Fabricação<br/>${fabDias}d</div>
          <div class="timeline-item timeline-montagem">Montagem<br/>${montDias}d</div>
        </div>

        <div class="section-title">Escopo de Fornecimento</div>
        <div class="escopo-grid" style="margin-bottom:16px;">
          <div>
            <div class="escopo-title">INCLUSO:</div>
            <div class="escopo-text">Projeto executivo de estrutura metálica; Fabricação completa em fábrica; Tratamento superficial e pintura; Transporte até a obra; Montagem completa com equipamentos; Acompanhamento técnico durante execução; Garantia de 5 anos contra defeitos de fabricação.</div>
          </div>
          <div>
            <div class="escopo-title nao-incluso">NÃO INCLUSO:</div>
            <div class="escopo-text">Fundações e bases de concreto; Instalações elétricas e hidráulicas; Licenças e alvarás; Terraplenagem e preparação do terreno.</div>
          </div>
        </div>

        <div class="section-title">Obrigações do Contratante</div>
        <div class="escopo-text" style="margin-bottom:30px;">Disponibilizar acesso ao local da obra; Fornecer ponto de energia elétrica e água; Garantir fundações conforme projeto fornecido pela Montex; Aprovar o projeto executivo em até 10 dias úteis; Efetuar os pagamentos nas datas acordadas.</div>

        <div class="section-title">Assinaturas</div>
        <div class="signatures">
          <div class="sig-block">
            <div class="sig-line">
              <div class="sig-name">GRUPO MONTEX</div>
              <div class="sig-title">Guilherme Maciel Vieira - Diretor Comercial</div>
            </div>
          </div>
          <div class="sig-block">
            <div class="sig-line">
              <div class="sig-name">CONTRATANTE</div>
              <div class="sig-title">${project?.cliente || '___________________________'}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="page-footer">
        <span>GRUPO MONTEX - Soluções em Aço</span>
        <span>Proposta ${propNum} | ${dataEmissao}</span>
      </div>
    </div>

    </body></html>
  `;

  // Generate PDF using html2pdf.js
  const html2pdf = (await import('html2pdf.js')).default;

  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  try {
    const blob = await html2pdf()
      .set({
        margin: 0,
        filename: `Proposta_${(project?.nome || 'projeto').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], before: '.page' },
      })
      .from(container)
      .outputPdf('blob');

    return blob;
  } finally {
    document.body.removeChild(container);
  }
}
