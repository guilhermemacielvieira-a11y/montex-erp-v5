/**
 * Gerador de Proposta Comercial em PDF - 17 Páginas
 * Layout idêntico ao modelo PROPOSTA modelo.docx
 * Grupo Montex - Soluções Modulares
 */

const formatCurrencyBR = (value) => {
  if (!value || isNaN(value)) return 'R$ 0,00';
  return 'R$ ' + Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatNumberBR = (value) => {
  if (!value || isNaN(value)) return '0,00';
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

async function imageToBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Gera SVG para Gantt chart
function generateGanttChart(prazo = 150) {
  const phases = [
    { nome: 'Detalhamento', dias: 30 },
    { nome: 'Materiais', dias: 30 },
    { nome: 'Fabricação', dias: 60 },
    { nome: 'Pintura', dias: 30 },
    { nome: 'Transporte', dias: 15 },
    { nome: 'Montagem', dias: 55 },
  ];

  let posY = 20;
  let svg = `<svg width="100%" height="280" viewBox="0 0 700 280" xmlns="http://www.w3.org/2000/svg">`;

  const scale = 600 / prazo;
  let currentStart = 0;

  phases.forEach((phase, idx) => {
    const width = phase.dias * scale;
    const color = ['#1a7a6d', '#2d9f99', '#4db5a6', '#6ecbb3', '#a8dfd2', '#d0ebe7'][idx];

    // Barra
    svg += `<rect x="80" y="${posY}" width="${width}" height="30" fill="${color}" stroke="#fff" stroke-width="2" />`;

    // Label
    svg += `<text x="10" y="${posY + 20}" font-size="11" font-weight="bold" fill="#333">${phase.nome}</text>`;
    svg += `<text x="${100 + width / 2}" y="${posY + 22}" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle">${phase.dias}d</text>`;

    currentStart += phase.dias;
    posY += 40;
  });

  svg += `</svg>`;
  return svg;
}

// Gera SVG para gráfico de pizza (composição de custos)
function generatePieChart() {
  const svg = `<svg width="100%" height="250" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
    <circle cx="120" cy="120" r="100" fill="#1a7a6d" />
    <circle cx="120" cy="120" r="85" fill="white" />
    <path d="M 120 120 L 120 35 A 85 85 0 0 1 210 150 Z" fill="#1a7a6d" />
    <path d="M 120 120 L 210 150 A 85 85 0 0 1 70 190 Z" fill="#2d9f99" />
    <path d="M 120 120 L 70 190 A 85 85 0 0 1 30 120 Z" fill="#4db5a6" />

    <text x="280" y="50" font-size="12" font-weight="bold" fill="#333">Aço Estrutural: 45%</text>
    <text x="280" y="75" font-size="12" font-weight="bold" fill="#333">Mão de Obra: 35%</text>
    <text x="280" y="100" font-size="12" font-weight="bold" fill="#333">Logística: 12%</text>
    <text x="280" y="125" font-size="12" font-weight="bold" fill="#333">Acabamento: 8%</text>
  </svg>`;
  return svg;
}

// Gera SVG para gráfico de barras (comparativo de mercado)
function generateBarChart(custoKg = 24) {
  const svg = `<svg width="100%" height="200" viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg">
    <text x="20" y="30" font-size="13" font-weight="bold" fill="#333">COMPARATIVO: Preço por kg</text>

    <rect x="50" y="50" width="120" height="100" fill="#1a7a6d" />
    <text x="110" y="160" font-size="12" font-weight="bold" fill="#333" text-anchor="middle">Montex</text>
    <text x="110" y="180" font-size="14" font-weight="bold" fill="#1a7a6d" text-anchor="middle">R\$${formatNumberBR(custoKg)}</text>

    <rect x="220" y="40" width="120" height="110" fill="#2d9f99" />
    <text x="280" y="160" font-size="12" font-weight="bold" fill="#333" text-anchor="middle">Mercado</text>
    <text x="280" y="180" font-size="14" font-weight="bold" fill="#2d9f99" text-anchor="middle">R\$28,00</text>

    <rect x="390" y="20" width="120" height="130" fill="#4db5a6" />
    <text x="450" y="160" font-size="12" font-weight="bold" fill="#333" text-anchor="middle">Premium</text>
    <text x="450" y="180" font-size="14" font-weight="bold" fill="#4db5a6" text-anchor="middle">R\$35,00</text>
  </svg>`;
  return svg;
}

// Gera tabela de orçamento dinamicamente
function generateBudgetTable(data) {
  let html = `<table class="budget-table">
    <thead>
      <tr>
        <th style="width:10%">QTDE</th>
        <th style="width:8%">UN</th>
        <th style="width:44%">DESCRIÇÃO DO SERVIÇO</th>
        <th style="width:18%">VALOR UNIT.</th>
        <th style="width:20%">VALOR TOTAL</th>
      </tr>
    </thead>
    <tbody>`;

  let grandTotal = 0;
  const setores = data.setores || [];

  for (const setor of setores) {
    html += `<tr class="setor-header">
      <td colspan="5" style="background:#ffd700;color:#333;font-weight:bold;text-align:left;padding:8px;">${setor.nome ? setor.nome.toUpperCase() : 'SETOR'}</td>
    </tr>`;

    for (const item of (setor.itens || [])) {
      const qty = item.quantidade || 0;
      const unit = item.unidade || 'UN';
      const unitPrice = item.valorUnitario || 0;
      const totalPrice = item.valorTotal || (qty * unitPrice);
      grandTotal += totalPrice;

      html += `<tr>
        <td class="center">${formatNumberBR(qty)}</td>
        <td class="center">${unit}</td>
        <td>${item.descricao || item.nome || ''}</td>
        <td class="right">${formatCurrencyBR(unitPrice)}</td>
        <td class="right">${formatCurrencyBR(totalPrice)}</td>
      </tr>`;
    }
  }

  // Subtotal
  html += `<tr class="subtotal-row">
    <td colspan="4" style="text-align:right;font-weight:bold;">SUBTOTAL</td>
    <td class="right" style="font-weight:bold;">${formatCurrencyBR(grandTotal)}</td>
  </tr>`;

  // Total com desconto
  const totalComDesconto = data.calculations?.valorTotal || grandTotal;
  html += `<tr class="total-row">
    <td colspan="4" style="text-align:right;font-weight:bold;color:white;">TOTAL DA OBRA COM DESCONTO</td>
    <td class="right" style="font-weight:bold;color:white;">${formatCurrencyBR(totalComDesconto)}</td>
  </tr>`;

  html += `</tbody></table>`;
  return html;
}

// Gera tabela de cronograma
function generateCronogramaTable() {
  const phases = [
    { fase: '1. Detalhamento', dias: '30 dias', desc: 'Projeto executivo, modelagem 3D e compatibilização' },
    { fase: '2. Materiais', dias: '30 dias', desc: 'Aquisição de chapas ASTM A36 e perfis U Civil 300' },
    { fase: '3. Fabricação', dias: '60 dias', desc: 'Corte, solda e montagem das peças na fábrica' },
    { fase: '4. Pintura', dias: '30 dias', desc: 'Jateamento DS 2,5 + 2 demãos de 60 micras' },
    { fase: '5. Transporte', dias: '15 dias', desc: 'Logística via BR-381 até o canteiro de obras' },
    { fase: '6. Montagem', dias: '55 dias', desc: 'Instalação com munck/guindaste e equipe especializada' },
  ];

  let html = `<table class="cronograma-table">
    <thead>
      <tr style="background:#1a7a6d;color:white;">
        <th style="text-align:left;padding:8px;">FASE</th>
        <th style="text-align:center;padding:8px;">PRAZO</th>
        <th style="text-align:left;padding:8px;">DESCRIÇÃO</th>
      </tr>
    </thead>
    <tbody>`;

  for (const phase of phases) {
    html += `<tr>
      <td style="padding:6px;border:1px solid #ddd;"><strong>${phase.fase}</strong></td>
      <td style="padding:6px;border:1px solid #ddd;text-align:center;"><strong>${phase.dias}</strong></td>
      <td style="padding:6px;border:1px solid #ddd;">${phase.desc}</td>
    </tr>`;
  }

  html += `</tbody></table>`;
  return html;
}

// Gera seção de diferenciais
function generateDiferenciais(total, pesoTotal) {
  const custoKg = pesoTotal > 0 ? total / pesoTotal : 24;
  const diferenciais = [
    { title: 'PREÇO COMPETITIVO', desc: `R$${formatNumberBR(custoKg)}/kg — abaixo da média de mercado (R$28/kg). Economia significativa comparado a concorrentes.` },
    { title: 'EXPERIÊNCIA COMPROVADA', desc: 'Mais de 10 anos de atuação com +50 projetos entregues em 5 estados brasileiros.' },
    { title: 'SOLUÇÃO TURNKEY COMPLETA', desc: 'Detalhamento, material, fabricação, pintura, transporte e montagem — tudo incluso.' },
    { title: 'LOGÍSTICA ESTRATÉGICA', desc: 'Sede em São Joaquim de Bicas/MG, às margens da BR-381.' },
    { title: 'CONFORMIDADE TÉCNICA TOTAL', desc: 'Atendimento às normas NBR 6.120, 6.123, 8.800, AISC, AISI, AWS D1-1 e ASTM.' },
    { title: 'EQUIPE QUALIFICADA', desc: '+200 profissionais capacitados. Técnico de segurança dedicado com DDS diário.' },
  ];

  let html = '';
  for (const item of diferenciais) {
    html += `<div class="diferencial-box">
      <div class="diferencial-bar"></div>
      <div class="diferencial-content">
        <div style="font-weight:bold;color:#1a1a2e;margin-bottom:4px;">${item.title}</div>
        <div style="font-size:10pt;color:#555;">${item.desc}</div>
      </div>
    </div>`;
  }

  return html;
}

export async function generatePropostaPDF(data) {
  // Load images in parallel
  const images = await Promise.all([
    imageToBase64('/images/proposta/capa-bg.jpg'),
    imageToBase64('/images/proposta/cover-bg.jpg'),
    imageToBase64('/images/proposta/logo-montex.png'),
    imageToBase64('/images/proposta/logo-m-outline.png'),
    imageToBase64('/images/proposta/sobre-bg.jpg'),
    imageToBase64('/images/proposta/montex-badge.png'),
    imageToBase64('/images/proposta/icon-whatsapp.png'),
    imageToBase64('/images/proposta/icon-email.png'),
    imageToBase64('/images/proposta/icon-globe.png'),
    // Portfolio thumbnails
    imageToBase64('/images/proposta/super-luna-thumb.jpeg'),
    imageToBase64('/images/proposta/super-luna-02.jpeg'),
    imageToBase64('/images/proposta/super-luna-03.jpeg'),
    imageToBase64('/images/proposta/portaria-chale-thumb.jpeg'),
    imageToBase64('/images/proposta/portaria-chale-02.jpeg'),
    imageToBase64('/images/proposta/portaria-chale-03.jpeg'),
    imageToBase64('/images/proposta/portaria-chale-04.jpeg'),
    imageToBase64('/images/proposta/abc-passos-thumb.jpeg'),
    imageToBase64('/images/proposta/abc-passos-02.jpeg'),
    imageToBase64('/images/proposta/abc-passos-03.jpeg'),
    imageToBase64('/images/proposta/abc-passos-04.jpeg'),
    imageToBase64('/images/proposta/graneleiro-goias-thumb.jpeg'),
    imageToBase64('/images/proposta/graneleiro-goias-02.jpeg'),
    imageToBase64('/images/proposta/graneleiro-goias-03.jpeg'),
    imageToBase64('/images/proposta/graneleiro-goias-04.jpeg'),
    imageToBase64('/images/proposta/graneleiro-goias-05.jpeg'),
    imageToBase64('/images/proposta/my-mall-thumb.jpeg'),
    imageToBase64('/images/proposta/my-mall-02.jpeg'),
    imageToBase64('/images/proposta/my-mall-03.jpeg'),
    imageToBase64('/images/proposta/my-mall-04.jpeg'),
    imageToBase64('/images/proposta/my-mall-05.jpeg'),
    imageToBase64('/images/proposta/my-mall-06.jpeg'),
    // Worker photos
    imageToBase64('/images/proposta/worker-welding-thumb.jpeg'),
    imageToBase64('/images/proposta/worker-welding-large.jpeg'),
    imageToBase64('/images/proposta/worker-welding-02.jpeg'),
    imageToBase64('/images/proposta/worker-welding-03.jpeg'),
    imageToBase64('/images/proposta/worker-on-site-main.jpeg'),
    imageToBase64('/images/proposta/worker-factory-site.jpeg'),
    imageToBase64('/images/proposta/worker-team-photo.jpeg'),
    imageToBase64('/images/proposta/worker-metalwork-tool.jpeg'),
  ]);

  const [
    capaBg, coverBg, logoMontex, logoMOutline, sobreBg, montexBadge,
    iconWhatsapp, iconEmail, iconGlobe,
    superlunaThumb, superluna02, superluna03,
    portariaThumb, portaria02, portaria03, portaria04,
    abcThumb, abc02, abc03, abc04,
    graneleiroThumb, graneleiro02, graneleiro03, graneleiro04, graneleiro05,
    mallThumb, mall02, mall03, mall04, mall05, mall06,
    workerWeld, workerWeldLarge, workerWeld02, workerWeld03,
    workerOnSite, workerFactory, workerTeam, workerMetal
  ] = images;

  const now = new Date();
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const monthsUpper = months.map(m => m.toUpperCase());
  const total = data.calculations?.valorTotal || 0;
  const pesoTotal = data.calculations?.pesoTotal || 0;
  const prazo = data.prazoExecucao || 150;
  const cond = data.condicoesPagamento || { assinatura: 10, projeto: 5, medicoes: 85 };
  const propostaNumber = data.propostaNumber || '001';
  const projectName = (data.project?.nome || 'PROJETO').toUpperCase();

  const htmlContent = `<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  .pdf-root {
    font-family: Arial, sans-serif;
    color: #333;
    background: white;
    width: 794px;
  }
  .page {
    width: 794px;
    min-height: 1123px;
    padding: 60px;
    position: relative;
    page-break-after: always;
    overflow: hidden;
  }
  .page-no-padding {
    width: 794px;
    min-height: 1123px;
    padding: 0;
    position: relative;
    page-break-after: always;
    overflow: hidden;
  }

  /* PAGE 1 - COVER */
  .cover-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: white;
    position: relative;
    overflow: hidden;
  }
  .cover-bg-image {
    width: 100%;
    height: 450px;
    object-fit: cover;
    margin: 20px 0;
  }
  .cover-content {
    position: relative;
    z-index: 2;
    width: 100%;
  }
  .cover-header {
    margin-top: 60px;
    margin-bottom: 40px;
  }
  .cover-title {
    font-size: 48pt;
    font-weight: bold;
    color: #1a1a2e;
    letter-spacing: 2px;
    margin-bottom: 10px;
  }
  .cover-subtitle {
    font-size: 18pt;
    font-weight: bold;
    color: #1a7a6d;
    letter-spacing: 3px;
    margin-bottom: 30px;
  }
  .cover-divider {
    width: 120px;
    height: 3px;
    background: #1a7a6d;
    margin: 0 auto 30px;
  }
  .cover-photo {
    width: 100%;
    max-width: 350px;
    height: 220px;
    object-fit: cover;
    margin: 30px 0;
    border-radius: 4px;
  }
  .cover-proposta-label {
    font-size: 32pt;
    font-weight: bold;
    color: #1a1a2e;
    margin: 30px 0 10px;
  }
  .cover-proposta-italic {
    font-style: italic;
    color: #666;
  }
  .cover-project-name {
    font-size: 28pt;
    font-weight: bold;
    color: #1a7a6d;
    margin: 30px 0;
  }
  .cover-client {
    font-size: 14pt;
    color: #555;
    margin-bottom: 60px;
  }
  .cover-date {
    font-size: 12pt;
    color: #777;
    margin-bottom: 40px;
  }
  .cover-logos {
    display: flex;
    justify-content: space-between;
    position: absolute;
    bottom: 30px;
    left: 30px;
    right: 30px;
    width: calc(100% - 60px);
  }
  .cover-logo {
    width: 60px;
    height: 60px;
  }

  /* HEADERS AND FOOTERS */
  .page-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid #1a7a6d;
  }
  .page-header-logo {
    width: 35px;
    height: 35px;
    object-fit: contain;
  }
  .page-header-text {
    font-weight: bold;
    color: #1a7a6d;
    font-size: 13pt;
  }

  .teal-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 25px;
    background: linear-gradient(90deg, #1a7a6d 0%, #2d9f99 100%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20mm;
  }
  .teal-footer-logo {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  /* TYPOGRAPHY */
  h1 {
    font-size: 24pt;
    font-weight: bold;
    color: #1a1a2e;
    margin: 20px 0 15px;
  }
  h2 {
    font-size: 16pt;
    font-weight: bold;
    color: #FF0000;
    margin: 15px 0 10px;
    font-style: italic;
  }
  h3 {
    font-size: 13pt;
    font-weight: bold;
    color: #1a1a2e;
    margin: 12px 0 8px;
  }
  p {
    font-size: 11pt;
    line-height: 1.4;
    margin-bottom: 8px;
    color: #333;
  }
  .red-text {
    color: #FF0000;
    font-weight: bold;
    font-style: italic;
  }
  .teal-text {
    color: #1a7a6d;
    font-weight: bold;
  }

  /* TABLES */
  .budget-table, .cronograma-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
    margin: 12px 0;
  }
  .budget-table th, .cronograma-table th {
    background: #ffd700;
    color: #333;
    padding: 8px;
    text-align: center;
    font-weight: bold;
  }
  .budget-table td, .cronograma-table td {
    padding: 6px 8px;
    border: 1px solid #ddd;
  }
  .budget-table .center {
    text-align: center;
  }
  .budget-table .right {
    text-align: right;
  }
  .budget-table .setor-header td {
    background: #ffd700;
    font-weight: bold;
    text-align: left !important;
  }
  .budget-table .subtotal-row td {
    background: #f0f0f0;
    font-weight: bold;
  }
  .budget-table .total-row {
    background: #1a7a6d;
    color: white;
    font-weight: bold;
  }
  .budget-table .total-row td {
    border-color: #1a7a6d;
  }

  /* PORTFOLIO */
  .portfolio-badge {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    object-fit: contain;
  }
  .portfolio-title {
    font-size: 18pt;
    font-weight: bold;
    font-style: italic;
    color: #1a1a2e;
    margin: 0 0 10px;
  }
  .portfolio-divider {
    width: 100%;
    height: 2px;
    background: #1a7a6d;
    margin-bottom: 15px;
  }
  .portfolio-layout {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
  }
  .portfolio-thumbnails {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 0 0 100px;
  }
  .portfolio-thumb {
    width: 100px;
    height: 100px;
    object-fit: cover;
    border-radius: 3px;
  }
  .portfolio-services {
    font-weight: bold;
    font-style: italic;
    font-size: 10pt;
    color: #555;
    line-height: 1.3;
    flex: 1;
  }
  .portfolio-main {
    width: 100%;
    height: 200px;
    object-fit: cover;
    border-radius: 3px;
    margin-top: 10px;
  }

  /* INDEX */
  .index-item {
    padding: 6px 0;
    font-size: 11pt;
    border-bottom: 1px dotted #ccc;
    display: flex;
    gap: 10px;
  }
  .index-num {
    color: #1a7a6d;
    font-weight: bold;
    min-width: 25px;
  }
  .index-text {
    flex: 1;
    font-weight: bold;
    font-style: italic;
  }

  /* ABOUT PAGE */
  .about-section {
    background: #1a7a6d;
    color: white;
    padding: 20px;
    margin-bottom: 20px;
    border-radius: 4px;
  }
  .about-title {
    font-size: 16pt;
    font-weight: bold;
    margin-bottom: 10px;
  }
  .about-text {
    font-size: 11pt;
    line-height: 1.4;
  }
  .about-photo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 15px 0;
  }
  .about-photo {
    width: 100%;
    height: 150px;
    object-fit: cover;
    border-radius: 4px;
  }

  /* CONTACT PAGE */
  .contact-page {
    background: #1a7a6d;
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20mm;
    position: relative;
  }
  .contact-content {
    text-align: center;
    z-index: 2;
  }
  .contact-phone {
    font-size: 24pt;
    font-weight: bold;
    margin: 30px 0;
  }
  .contact-email {
    font-size: 16pt;
    margin: 15px 0;
  }
  .contact-website {
    font-size: 16pt;
    margin: 15px 0;
  }
  .contact-icons {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin: 30px 0;
  }
  .contact-icon {
    width: 40px;
    height: 40px;
    opacity: 0.8;
  }
  .contact-logo {
    position: absolute;
    bottom: 20px;
    left: 20px;
    width: 50px;
    height: 50px;
  }

  /* DIFERENCIAIS */
  .diferencial-box {
    display: flex;
    gap: 12px;
    margin-bottom: 15px;
    padding: 10px;
    background: #f5f5f5;
    border-radius: 4px;
    border-left: 4px solid #1a7a6d;
  }
  .diferencial-bar {
    width: 4px;
    background: #1a7a6d;
  }
  .diferencial-content {
    flex: 1;
  }
  .diferencial-content > div:first-child {
    font-weight: bold;
    color: #1a1a2e;
    margin-bottom: 4px;
  }
  .diferencial-content > div:last-child {
    font-size: 10pt;
    color: #555;
  }

  /* SPECIAL BOXES */
  .total-box {
    background: #1a7a6d;
    color: white;
    padding: 30px;
    text-align: center;
    margin: 20px 0;
    border-radius: 4px;
  }
  .total-box-value {
    font-size: 36pt;
    font-weight: bold;
    color: white;
  }
  .total-box-label {
    font-size: 14pt;
    margin-bottom: 15px;
  }

  .investment-box {
    background: #1a7a6d;
    color: white;
    padding: 25px;
    text-align: center;
    border-radius: 4px;
    margin: 20px 0;
  }
  .investment-total {
    font-size: 24pt;
    font-weight: bold;
    margin-bottom: 10px;
  }
  .investment-details {
    font-size: 10pt;
    line-height: 1.4;
    opacity: 0.9;
  }

  /* MISC */
  .bullet-list {
    margin: 10px 0;
    padding-left: 20px;
  }
  .bullet-list li {
    margin: 5px 0;
    font-size: 11pt;
  }

  .work-hours {
    background: #1a7a6d;
    color: white;
    padding: 15px;
    text-align: center;
    font-size: 13pt;
    font-weight: bold;
    border-radius: 4px;
    margin: 10px 0;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 10px;
    margin: 15px 0;
  }
  .kpi-box {
    background: #1a7a6d;
    color: white;
    padding: 12px;
    text-align: center;
    border-radius: 4px;
    font-size: 11pt;
  }
  .kpi-box strong {
    display: block;
    font-size: 13pt;
    margin-bottom: 5px;
  }

  /* CHART CONTAINER */
  .chart-container {
    width: 100%;
    margin: 15px 0;
    display: flex;
    justify-content: center;
  }
</style>
<div class="pdf-root">

<!-- PAGE 1: COVER -->
<div class="page-no-padding">
  <div class="cover-page">
    ${capaBg ? `<img src="${capaBg}" class="cover-bg-image" />` : ''}
    <div class="cover-content">
      <div class="cover-header">
        <div class="cover-title">GRUPO MONTEX</div>
        <div class="cover-subtitle">SOLUÇÕES MODULARES</div>
      </div>

      ${coverBg ? `<img src="${coverBg}" class="cover-photo" />` : ''}

      <div class="cover-proposta-label">Proposta <span class="cover-proposta-italic">Comercial</span></div>
      <div class="cover-divider"></div>

      <div class="cover-project-name">${projectName}</div>
      ${data.project?.cliente ? `<div class="cover-client">${data.project.cliente}</div>` : ''}
      <div class="cover-date">${monthsUpper[now.getMonth()]} de ${now.getFullYear()}</div>
    </div>

    <div class="cover-logos">
      ${logoMOutline ? `<img src="${logoMOutline}" class="cover-logo" />` : ''}
      ${logoMontex ? `<img src="${logoMontex}" class="cover-logo" />` : ''}
    </div>
  </div>
</div>

<!-- PAGE 2: SOBRE + MISSÃO -->
<div class="page">
  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <div class="about-section">
    <div class="about-title">Sobre Grupo Montex</div>
    <div class="about-text">
      Com mais de 10 anos o Grupo Montex se posiciona entre as principais empresas de soluções modulares, estruturas metálicas, esquadrias de alumínio, ACM, construção a seco, localizada em São Joaquim de Bicas, às margens da BR381, facilitando a logística de transporte.
    </div>
  </div>

  <h3>Missão Grupo Montex</h3>
  <p>O Grupo Montex preza honestidade, transparência e sustentabilidade em seus negócios.</p>

  <div class="about-photo-grid">
    ${workerWeld ? `<img src="${workerWeld}" class="about-photo" />` : ''}
    ${workerWeldLarge ? `<img src="${workerWeldLarge}" class="about-photo" />` : ''}
    ${workerWeld02 ? `<img src="${workerWeld02}" class="about-photo" />` : ''}
    ${workerWeld03 ? `<img src="${workerWeld03}" class="about-photo" />` : ''}
  </div>

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

<!-- PAGE 3: VISÃO -->
<div class="page">
  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <h1>Visão Grupo Montex</h1>
  <div style="width:100px;height:3px;background:#1a7a6d;margin-bottom:15px;"></div>

  <p>Construir o futuro com parcerias inovadoras visando entregar sempre o melhor.</p>

  <h3 style="margin-top:20px;">⚙️ Transformando Pessoas</h3>
  <p>Investimento contínuo em treinamento técnico e desenvolvimento profissional de todos os colaboradores.</p>

  <div class="about-photo-grid">
    ${workerOnSite ? `<img src="${workerOnSite}" class="about-photo" />` : ''}
    ${workerFactory ? `<img src="${workerFactory}" class="about-photo" />` : ''}
    ${workerTeam ? `<img src="${workerTeam}" class="about-photo" />` : ''}
    ${workerMetal ? `<img src="${workerMetal}" class="about-photo" />` : ''}
  </div>

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

<!-- PAGES 4-8: PORTFOLIO (5 PAGES) -->

<!-- PAGE 4: SUPER LUNA BETIM -->
<div class="page">
  ${montexBadge ? `<img src="${montexBadge}" class="portfolio-badge" />` : ''}

  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <div class="portfolio-title">Super Luna Betim</div>
  <div class="portfolio-divider"></div>

  <div class="portfolio-layout">
    <div class="portfolio-thumbnails">
      ${superlunaThumb ? `<img src="${superlunaThumb}" class="portfolio-thumb" />` : ''}
      ${superluna02 ? `<img src="${superluna02}" class="portfolio-thumb" />` : ''}
      ${superluna03 ? `<img src="${superluna03}" class="portfolio-thumb" />` : ''}
    </div>
    <div class="portfolio-services">
      • Construção Metálica<br>
      • Telhas Isotérmicas<br>
      • ACM Kynnar PVDF<br>
      • Fachada Grid
    </div>
  </div>

  ${superlunaThumb ? `<img src="${superlunaThumb}" class="portfolio-main" />` : ''}

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

<!-- PAGE 5: PORTARIA RETIRO DO CHALÉ -->
<div class="page">
  ${montexBadge ? `<img src="${montexBadge}" class="portfolio-badge" />` : ''}

  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <div class="portfolio-title">Portaria Retiro do Chalé</div>
  <div class="portfolio-divider"></div>

  <div class="portfolio-layout">
    <div class="portfolio-thumbnails">
      ${portariaThumb ? `<img src="${portariaThumb}" class="portfolio-thumb" />` : ''}
      ${portaria02 ? `<img src="${portaria02}" class="portfolio-thumb" />` : ''}
      ${portaria03 ? `<img src="${portaria03}" class="portfolio-thumb" />` : ''}
      ${portaria04 ? `<img src="${portaria04}" class="portfolio-thumb" />` : ''}
    </div>
    <div class="portfolio-services">
      • Construção Metálica<br>
      • Telhas Isotérmicas<br>
      • Acabamento Premium
    </div>
  </div>

  ${portariaThumb ? `<img src="${portariaThumb}" class="portfolio-main" />` : ''}

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

<!-- PAGE 6: ABC PASSOS -->
<div class="page">
  ${montexBadge ? `<img src="${montexBadge}" class="portfolio-badge" />` : ''}

  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <div class="portfolio-title">ABC Passos</div>
  <div class="portfolio-divider"></div>

  <div class="portfolio-layout">
    <div class="portfolio-thumbnails">
      ${abcThumb ? `<img src="${abcThumb}" class="portfolio-thumb" />` : ''}
      ${abc02 ? `<img src="${abc02}" class="portfolio-thumb" />` : ''}
      ${abc03 ? `<img src="${abc03}" class="portfolio-thumb" />` : ''}
      ${abc04 ? `<img src="${abc04}" class="portfolio-thumb" />` : ''}
    </div>
    <div class="portfolio-services">
      • Construção Metálica<br>
      • Telhas Isotérmicas<br>
      • ACM Kynnar PVDF
    </div>
  </div>

  ${abcThumb ? `<img src="${abcThumb}" class="portfolio-main" />` : ''}

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

<!-- PAGE 7: GRANELEIRO GOIAS -->
<div class="page">
  ${montexBadge ? `<img src="${montexBadge}" class="portfolio-badge" />` : ''}

  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <div class="portfolio-title">Graneleiro Goiás</div>
  <div class="portfolio-divider"></div>

  <div class="portfolio-layout">
    <div class="portfolio-thumbnails">
      ${graneleiroThumb ? `<img src="${graneleiroThumb}" class="portfolio-thumb" />` : ''}
      ${graneleiro02 ? `<img src="${graneleiro02}" class="portfolio-thumb" />` : ''}
      ${graneleiro03 ? `<img src="${graneleiro03}" class="portfolio-thumb" />` : ''}
      ${graneleiro04 ? `<img src="${graneleiro04}" class="portfolio-thumb" />` : ''}
      ${graneleiro05 ? `<img src="${graneleiro05}" class="portfolio-thumb" />` : ''}
    </div>
    <div class="portfolio-services">
      • Construção Metálica<br>
      • Telhas Isotérmicas<br>
      • Estrutura de Grande Porte
    </div>
  </div>

  ${graneleiroThumb ? `<img src="${graneleiroThumb}" class="portfolio-main" />` : ''}

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

<!-- PAGE 8: MY MALL -->
<div class="page">
  ${montexBadge ? `<img src="${montexBadge}" class="portfolio-badge" />` : ''}

  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <div class="portfolio-title">My Mall Shopping Center</div>
  <div class="portfolio-divider"></div>

  <div class="portfolio-layout">
    <div class="portfolio-thumbnails">
      ${mallThumb ? `<img src="${mallThumb}" class="portfolio-thumb" />` : ''}
      ${mall02 ? `<img src="${mall02}" class="portfolio-thumb" />` : ''}
      ${mall03 ? `<img src="${mall03}" class="portfolio-thumb" />` : ''}
      ${mall04 ? `<img src="${mall04}" class="portfolio-thumb" />` : ''}
      ${mall05 ? `<img src="${mall05}" class="portfolio-thumb" />` : ''}
      ${mall06 ? `<img src="${mall06}" class="portfolio-thumb" />` : ''}
    </div>
    <div class="portfolio-services">
      • Construção Metálica<br>
      • Estrutura Completa<br>
      • Fachada Glass<br>
      • Cobertura Metálica
    </div>
  </div>

  ${mallThumb ? `<img src="${mallThumb}" class="portfolio-main" />` : ''}

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

<!-- PAGE 9: CONTACT -->
<div class="page-no-padding">
  <div class="contact-page">
    <div class="contact-content">
      <div class="contact-phone">(31)99582-1443</div>
      <div class="contact-email">guilherme.maciel.vieira@gmail.com</div>
      <div class="contact-website">www.grupomontex.com.br</div>

      <div class="contact-icons">
        ${iconWhatsapp ? `<img src="${iconWhatsapp}" class="contact-icon" />` : ''}
        ${iconEmail ? `<img src="${iconEmail}" class="contact-icon" />` : ''}
        ${iconGlobe ? `<img src="${iconGlobe}" class="contact-icon" />` : ''}
      </div>
    </div>

    ${logoMontex ? `<img src="${logoMontex}" class="contact-logo" />` : ''}
  </div>
</div>

<!-- PAGE 10: INDEX -->
<div class="page">
  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <p style="text-align:center;font-style:italic;">PROPOSTA TÉCNICA / COMERCIAL</p>
  <p style="text-align:center;"><strong>N-${propostaNumber} rev00</strong></p>
  <p style="text-align:center;margin-bottom:20px;"><strong>${projectName}</strong></p>
  <p style="text-align:center;color:#666;">${monthsUpper[now.getMonth()]} / ${now.getFullYear()}</p>

  <h1 style="text-align:center;margin-top:30px;">ÍNDICE</h1>

  ${['CARTA DE APRESENTAÇÃO', 'OBJETO DA PROPOSTA', 'NORMAS TÉCNICAS', 'DOCUMENTOS RECEBIDOS', 'OBRIGAÇÕES DA MONTEX', 'OBRIGAÇÕES DO CLIENTE', 'JORNADA DE TRABALHO', 'SISTEMA DE SEGURANÇA', 'PRAZO DE EXECUÇÃO DOS SERVIÇOS', 'CONDIÇÕES DE PAGAMENTO', 'CÁLCULOS/ESTIMATIVAS', 'VALOR TOTAL DA OBRA', 'ANÁLISE DO INVESTIMENTO', 'CRONOGRAMA DETALHADO', 'POR QUE ESCOLHER O GRUPO MONTEX?'].map((item, i) => `
    <div class="index-item">
      <span class="index-num">${i + 1}.</span>
      <span class="index-text">${item}</span>
    </div>
  `).join('')}

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

<!-- PAGE 11: CARTA + OBJETO DA PROPOSTA -->
<div class="page">
  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <h2>1. CARTA DE APRESENTAÇÃO</h2>
  <p><strong>SÃO JOAQUIM DE BICAS, ${now.getDate()} DE ${monthsUpper[now.getMonth()]} DE ${now.getFullYear()}</strong></p>
  <p><strong>PROPOSTA COMERCIAL N-${propostaNumber}</strong></p>
  <p style="margin-top:10px;">Prezados Senhores, é com grande satisfação que apresentamos nossa proposta para o projeto <strong>${projectName}</strong>.</p>

  <h2>2. OBJETO DA PROPOSTA</h2>
  <p style="color:#FF0000;font-weight:bold;font-style:italic;">PREÇOS ABAIXO INCLUEM MATERIAL, FABRICAÇÃO, PINTURA, TRANSPORTE E MONTAGEM.</p>

  ${generateBudgetTable(data)}

  <h3>2.1 - ESTRUTURA METÁLICA:</h3>
  <p>Estrutura metálica confeccionada com tesouras, terças e colunas em perfil U dobrado.</p>

  <h3>2.2 - AÇO:</h3>
  <p>Chapas: ASTM A 36 / Perfis "U" Civil 300</p>

  <h3>2.3 - PINTURA:</h3>
  <p>Jateamento DS 2,5 + 2 demãos de 60 micras</p>

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

<!-- PAGE 12: NORMAS + OBRIGAÇÕES -->
<div class="page">
  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <h2>3. NORMAS TÉCNICAS</h2>
  <h3>3.1 - Cargas e Cálculos:</h3>
  <p>Cálculo estrutural feito por profissionais capacitados, usando programas de última geração.</p>
  <ul class="bullet-list">
    <li>NBR 6.120 - Cargas para Estruturas de Edificações</li>
    <li>NBR 6.123 - Ações do Vento em Estruturas</li>
    <li>NBR 8.800 - Projeto e Execução de Aço de Edifícios</li>
    <li>Manual do AISC/1993 e AISI/1991</li>
  </ul>

  <h3>3.2 - Soldas:</h3>
  <p>Qualificados conforme AWS D1-1.</p>

  <h3>3.3 - Parafusos:</h3>
  <p>ASTM A-307 / A-325.</p>

  <h2>5. OBRIGAÇÕES DA MONTEX</h2>
  <ul class="bullet-list">
    <li>Detalhamento de toda a estrutura metálica</li>
    <li>Fornecimento de todo o material necessário</li>
    <li>Fabricação das estruturas</li>
    <li>Fornecimento dos chumbadores</li>
    <li>Tratamento superficial conforme especificado</li>
    <li>Transporte até o local da obra</li>
    <li>Montagem de todo o fornecimento</li>
    <li>Equipamentos (munck, guindaste, plataformas)</li>
    <li>Transporte, alimentação e estadia da equipe</li>
    <li>ART dos serviços executados</li>
    <li>Garantia conforme Código Civil Art. 1245</li>
  </ul>

  <h2>6. OBRIGAÇÕES DO CLIENTE</h2>
  <ul class="bullet-list">
    <li>Cálculo e execução de serviços em alvenaria e concreto</li>
    <li>Locação e instalação dos chumbadores</li>
    <li>Energia elétrica necessária</li>
    <li>Local seguro para guarda de equipamentos</li>
    <li>Esquadrias metálicas (serralheria)</li>
    <li>Local limpo e desimpedido</li>
    <li>Água potável, vestiário conforme NR-18</li>
    <li>Grouteamento após nivelamento</li>
  </ul>

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

<!-- PAGE 13: JORNADA + SEGURANÇA + PRAZO + PAGAMENTO -->
<div class="page">
  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <h2>7. JORNADA DE TRABALHO</h2>
  <div class="work-hours">44 horas semanais, segunda a sexta-feira</div>

  <h2>8. SISTEMA DE SEGURANÇA</h2>
  <p><strong>Meta: Prevenção de acidentes.</strong> Técnico de segurança com DDS diário. EPIs conforme NR-6.</p>

  <h2>9. PRAZO DE EXECUÇÃO DAS ESTRUTURAS</h2>
  <div class="total-box">
    <div class="total-box-value">${prazo} DIAS</div>
  </div>

  <h2>10. CONDIÇÕES DE PAGAMENTO:</h2>
  <ul class="bullet-list">
    <li><strong>${cond.assinatura}%</strong> na assinatura do contrato</li>
    <li><strong>${cond.projeto}%</strong> na entrega do projeto metálico</li>
    <li><strong>${cond.medicoes}%</strong> mediante medições e conforme aceite</li>
  </ul>

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

<!-- PAGE 14: CÁLCULO + VALOR TOTAL -->
<div class="page">
  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <h2>11. CÁLCULO DE ESTIMATIVA</h2>

  ${generateBudgetTable(data)}

  <h2 style="text-align:center;margin-top:30px;">VALOR TOTAL DA OBRA</h2>
  <div class="total-box">
    <div class="total-box-value">${formatCurrencyBR(total)}</div>
  </div>

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

<!-- PAGE 15: ANÁLISE DO INVESTIMENTO -->
<div class="page">
  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <h2>13. ANÁLISE DO INVESTIMENTO</h2>
  <h3 style="text-align:center;color:#FF0000;font-style:italic;">COMPOSIÇÃO DOS CUSTOS E COMPARATIVO DE MERCADO</h3>

  ${(() => {
    if (pesoTotal <= 0) return '<p>Adicione itens para ver a análise.</p>';
    const custoKg = total / pesoTotal;
    return `
      <div class="chart-container">${generatePieChart()}</div>
      <div class="chart-container">${generateBarChart(custoKg)}</div>

      <table class="cronograma-table" style="margin-top:20px;">
        <tr>
          <td><strong>Custo por kg (Montex)</strong></td>
          <td class="right">R$ ${formatNumberBR(custoKg)}/kg</td>
        </tr>
        <tr>
          <td><strong>Média de Mercado</strong></td>
          <td class="right">R$ 28,00/kg</td>
        </tr>
        <tr>
          <td><strong>Concorrentes Premium</strong></td>
          <td class="right">R$ 35,00/kg</td>
        </tr>
        <tr style="background:#e8f5f2;">
          <td><strong style="color:#1a7a6d;">ECONOMIA ESTIMADA</strong></td>
          <td class="right" style="color:#1a7a6d;"><strong>${formatCurrencyBR(Math.max(0, (28 - custoKg) * pesoTotal))}</strong></td>
        </tr>
        <tr style="background:#e8f5f2;">
          <td><strong style="color:#1a7a6d;">ECONOMIA PREMIUM</strong></td>
          <td class="right" style="color:#1a7a6d;"><strong>${formatCurrencyBR(Math.max(0, (35 - custoKg) * pesoTotal))}</strong></td>
        </tr>
      </table>

      <h3 style="margin-top:15px;">DETALHAMENTO DOS CUSTOS:</h3>
      <table class="cronograma-table">
        <tr><td><strong>Aço Estrutural</strong></td><td class="right">45%</td></tr>
        <tr><td><strong>Mão de Obra</strong></td><td class="right">35%</td></tr>
        <tr><td><strong>Logística</strong></td><td class="right">12%</td></tr>
        <tr><td><strong>Acabamento</strong></td><td class="right">8%</td></tr>
      </table>
    `;
  })()}

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

<!-- PAGE 16: CRONOGRAMA -->
<div class="page">
  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <h2>14. CRONOGRAMA DETALHADO DE EXECUÇÃO</h2>
  <p style="font-style:italic;color:#FF0000;"><strong>PLANEJAMENTO DAS ETAPAS DO PROJETO — ${prazo} DIAS</strong></p>

  <div class="chart-container">${generateGanttChart(prazo)}</div>

  <h3>DETALHAMENTO DAS FASES:</h3>
  ${generateCronogramaTable()}

  <div class="kpi-grid" style="margin-top:20px;">
    <div class="kpi-box">
      <strong>${formatNumberBR(pesoTotal)} kg</strong>
      <div>de aço</div>
    </div>
    <div class="kpi-box">
      <strong>-</strong>
      <div>de cobertura</div>
    </div>
    <div class="kpi-box">
      <strong>${prazo} dias</strong>
      <div>prazo total</div>
    </div>
    <div class="kpi-box">
      <strong>44h/sem</strong>
      <div>jornada</div>
    </div>
  </div>

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

<!-- PAGE 17: POR QUE ESCOLHER -->
<div class="page">
  <div class="page-header">
    ${logoMontex ? `<img src="${logoMontex}" class="page-header-logo" />` : ''}
    <span class="page-header-text">GRUPO MONTEX</span>
  </div>

  <h2>15. POR QUE ESCOLHER O GRUPO MONTEX?</h2>
  <h3 style="text-align:center;color:#FF0000;font-style:italic;">DIFERENCIAIS COMPETITIVOS PARA O SEU PROJETO</h3>

  ${generateDiferenciais(total, pesoTotal)}

  <div class="investment-box">
    <div class="investment-total">INVESTIMENTO TOTAL: ${formatCurrencyBR(total)}</div>
    <div class="investment-details">
      Proposta válida por 15 dias a partir de ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}<br>
      Condições: ${cond.assinatura}% assinatura | ${cond.projeto}% entrega projeto | ${cond.medicoes}% medições
    </div>
  </div>

  <div style="text-align:center;margin-top:20px;color:#1a7a6d;">
    <div style="font-size:14pt;font-weight:bold;margin-bottom:10px;">(31) 99582-1443</div>
    <div style="font-size:12pt;margin-bottom:5px;">guilherme.maciel.vieira@gmail.com</div>
    <div style="font-size:12pt;font-weight:bold;">www.grupomontex.com.br</div>
  </div>

  <div class="teal-footer">
    ${logoMOutline ? `<img src="${logoMOutline}" class="teal-footer-logo" />` : ''}
    ${logoMontex ? `<img src="${logoMontex}" class="teal-footer-logo" />` : ''}
  </div>
</div>

</div>`;

  try {
    const html2pdf = (await import('html2pdf.js')).default;
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '794px';
    container.style.background = 'white';
    document.body.appendChild(container);

    // Wait for images to load
    const imgs = container.querySelectorAll('img');
    await Promise.all(Array.from(imgs).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));

    const pdfBlob = await html2pdf()
      .set({
        margin: 0,
        filename: `Proposta_${projectName.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: 794, windowWidth: 794 },
        jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ['px_scaling'] },
        pagebreak: { mode: ['css'], avoid: '.no-break' },
      })
      .from(container)
      .outputPdf('blob');

    document.body.removeChild(container);
    return pdfBlob;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
}
