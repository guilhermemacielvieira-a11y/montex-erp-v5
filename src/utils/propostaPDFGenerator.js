/**
 * Gerador de Proposta Comercial em PDF
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

function generateItemsTableHTML(data) {
  let rows = '';
  let grandTotal = 0;
  const setores = data.setores || [];

  for (const setor of setores) {
    rows += `<tr class="setor-row"><td colspan="5">${(setor.nome || 'SETOR').toUpperCase()}</td></tr>`;
    for (const item of (setor.itens || [])) {
      const qty = item.quantidade || 0;
      const unit = item.precoUnitario || 0;
      const total = item.precoTotal || (qty * unit);
      grandTotal += total;
      rows += `<tr>
        <td class="center">${formatNumberBR(qty)}</td>
        <td class="center">${item.unidade || 'UN'}</td>
        <td>${item.descricao || item.nome || ''}</td>
        <td class="right">${formatCurrencyBR(unit)}</td>
        <td class="right">${formatCurrencyBR(total)}</td>
      </tr>`;
    }
  }

  if (data.calculations?.margemValor) {
    rows += `<tr class="bdi-row"><td colspan="4" class="right">BDI / MARGEM DE LUCRO</td><td class="right">${formatCurrencyBR(data.calculations.margemValor)}</td></tr>`;
    grandTotal += data.calculations.margemValor;
  }

  const displayTotal = data.calculations?.valorTotal || grandTotal;
  rows += `<tr class="total-row"><td colspan="4" class="right">VALOR TOTAL DA OBRA</td><td class="right">${formatCurrencyBR(displayTotal)}</td></tr>`;

  return `<table class="items-table">
    <thead><tr>
      <th style="width:12%">QTDE</th><th style="width:8%">UN</th>
      <th style="width:40%">DESCRIÇÃO DO SERVIÇO</th>
      <th style="width:18%">VALOR UNIT.</th><th style="width:22%">VALOR TOTAL</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function generateCronogramaHTML(data) {
  const prazo = data.prazoExecucao || 150;
  const phases = [
    { fase: '1. Detalhamento', prazo: '30 dias', desc: 'Projeto executivo, modelagem 3D e compatibilização' },
    { fase: '2. Materiais', prazo: '30 dias', desc: 'Aquisição de chapas ASTM A36 e perfis U Civil 300' },
    { fase: '3. Fabricação', prazo: '60 dias', desc: 'Corte, solda e montagem das peças na fábrica' },
    { fase: '4. Pintura', prazo: '30 dias', desc: 'Jateamento DS 2,5 + 2 demãos de 60 micras' },
    { fase: '5. Transporte', prazo: '15 dias', desc: 'Logística via BR-381 até o canteiro de obras' },
    { fase: '6. Montagem', prazo: '55 dias', desc: 'Instalação com munck/guindaste e equipe especializada' },
  ];

  let rows = phases.map(p => `<tr><td><strong>${p.fase}</strong></td><td class="center"><strong>${p.prazo}</strong></td><td>${p.desc}</td></tr>`).join('');

  return `<table class="cronograma-table">
    <thead><tr><th>FASE</th><th>PRAZO</th><th>DESCRIÇÃO</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="kpi-grid">
    <div class="kpi-box"><strong>${formatNumberBR(data.calculations?.pesoTotal || 0)} kg</strong><br>de aço</div>
    <div class="kpi-box"><strong>${formatNumberBR(data.calculations?.areaTotal || 0)} m²</strong><br>de cobertura</div>
    <div class="kpi-box"><strong>${prazo} dias</strong><br>prazo total</div>
    <div class="kpi-box"><strong>44h/semana</strong><br>jornada</div>
  </div>`;
}

function generateDiferenciaisHTML(data) {
  const total = data.calculations?.valorTotal || 0;
  const pesoTotal = data.calculations?.pesoTotal || 0;
  const custoKg = pesoTotal > 0 ? total / pesoTotal : 24;

  const items = [
    { title: 'PREÇO COMPETITIVO', desc: `R$${formatNumberBR(custoKg)}/kg — abaixo da média de mercado (R$28/kg). Economia significativa comparado a concorrentes convencionais.` },
    { title: 'EXPERIÊNCIA COMPROVADA', desc: 'Mais de 10 anos de atuação com +50 projetos entregues em 5 estados brasileiros.' },
    { title: 'SOLUÇÃO TURNKEY COMPLETA', desc: 'Detalhamento, material, fabricação, pintura, transporte e montagem — tudo incluso.' },
    { title: 'LOGÍSTICA ESTRATÉGICA', desc: 'Sede em São Joaquim de Bicas/MG, às margens da BR-381.' },
    { title: 'CONFORMIDADE TÉCNICA TOTAL', desc: 'Atendimento às normas NBR 6.120, 6.123, 8.800, AISC, AISI, AWS D1-1 e ASTM.' },
    { title: 'EQUIPE QUALIFICADA', desc: '+200 profissionais capacitados. Técnico de segurança dedicado com DDS diário.' },
  ];

  return items.map(item => `
    <div class="diferencial-card">
      <div class="diferencial-check">&#10003;</div>
      <div class="diferencial-content">
        <strong>${item.title}</strong><br>
        <span>${item.desc}</span>
      </div>
    </div>
  `).join('');
}

export async function generatePropostaPDF(data) {
  // Load images
  const [capaBg, logo, sobreBg, portfolioSuperluna, portfolioAbc, portfolioGraneleiro] = await Promise.all([
    imageToBase64('/images/proposta/capa-bg.jpg'),
    imageToBase64('/images/proposta/logo-montex.png'),
    imageToBase64('/images/proposta/sobre-bg.jpg'),
    imageToBase64('/images/proposta/portfolio-superluna.jpg'),
    imageToBase64('/images/proposta/portfolio-abc.jpg'),
    imageToBase64('/images/proposta/portfolio-graneleiro.jpg'),
  ]);

  const now = new Date();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthsUpper = months.map(m => m.toUpperCase());
  const total = data.calculations?.valorTotal || 0;
  const cond = data.condicoesPagamento || { assinatura: 10, projeto: 5, medicoes: 85 };

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #333; font-size: 11pt; line-height: 1.5; }

  .page { width: 210mm; min-height: 297mm; padding: 20mm; position: relative; page-break-after: always; }
  .page-no-pad { width: 210mm; min-height: 297mm; padding: 0; position: relative; page-break-after: always; }

  .primary { color: #1a7a6d; }
  .secondary { color: #c8a951; }
  .dark { color: #1a1a2e; }

  h1 { font-size: 28pt; color: #1a7a6d; margin-bottom: 10px; }
  h2 { font-size: 18pt; color: #1a7a6d; margin: 20px 0 10px; }
  h3 { font-size: 14pt; color: #1a1a2e; margin: 15px 0 8px; }
  .section-num { color: #1a7a6d; font-weight: bold; }
  p { margin-bottom: 8px; }

  .page-header { display: flex; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 2px solid #1a7a6d; margin-bottom: 20px; }
  .page-header img { height: 35px; }
  .page-header span { font-weight: bold; color: #1a7a6d; font-size: 12pt; }

  .page-footer { position: absolute; bottom: 15mm; left: 20mm; right: 20mm; border-top: 1px solid #1a7a6d; padding-top: 5px; font-size: 8pt; color: #666; display: flex; justify-content: space-between; }

  .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 297mm; padding: 40mm 30mm; }
  .cover-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.15; z-index: -1; }
  .cover-logo { width: 80px; margin-bottom: 20px; }
  .cover-title { font-size: 36pt; color: #1a7a6d; font-weight: bold; margin-bottom: 5px; }
  .cover-subtitle { font-size: 16pt; color: #c8a951; font-weight: bold; letter-spacing: 3px; margin-bottom: 40px; }
  .cover-proposta { font-size: 28pt; color: #1a1a2e; font-weight: bold; margin-bottom: 15px; }
  .cover-project { font-size: 22pt; color: #1a7a6d; font-weight: bold; margin-bottom: 10px; }
  .cover-client { font-size: 16pt; color: #333; margin-bottom: 60px; }
  .cover-date { font-size: 13pt; color: #666; }
  .cover-divider { width: 100px; height: 3px; background: #c8a951; margin: 15px auto; }

  .sobre-bg { width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; }

  .portfolio-item { text-align: center; margin-bottom: 30px; }
  .portfolio-item img { width: 85%; max-height: 280px; object-fit: cover; border-radius: 8px; margin-bottom: 10px; }
  .portfolio-services { font-style: italic; font-weight: bold; color: #555; font-size: 10pt; }

  .items-table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 15px 0; }
  .items-table th { background: #1a7a6d; color: white; padding: 8px 6px; text-align: center; }
  .items-table td { padding: 6px; border: 1px solid #ccc; }
  .items-table .center { text-align: center; }
  .items-table .right { text-align: right; }
  .items-table .setor-row td { background: #e8f5f2; color: #1a7a6d; font-weight: bold; }
  .items-table .bdi-row td { background: #f5f5f5; font-weight: bold; }
  .items-table .total-row td { background: #c8a951; color: white; font-weight: bold; font-size: 11pt; }

  .cronograma-table { width: 100%; border-collapse: collapse; font-size: 10pt; margin: 15px 0; }
  .cronograma-table th { background: #1a7a6d; color: white; padding: 8px; text-align: left; }
  .cronograma-table td { padding: 6px 8px; border: 1px solid #ccc; }
  .cronograma-table .center { text-align: center; }
  .cronograma-table .right { text-align: right; }

  .kpi-grid { display: flex; gap: 10px; margin: 20px 0; }
  .kpi-box { flex: 1; background: #e8f5f2; color: #1a7a6d; padding: 12px; border-radius: 6px; text-align: center; font-size: 10pt; }

  .diferencial-card { display: flex; gap: 12px; margin-bottom: 12px; }
  .diferencial-check { background: #1a7a6d; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16pt; font-weight: bold; flex-shrink: 0; }
  .diferencial-content { background: #f5f5f5; padding: 10px 15px; border-radius: 6px; flex: 1; font-size: 10pt; }
  .diferencial-content strong { color: #1a1a2e; }

  .investment-box { background: #1a7a6d; color: white; padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0; }
  .investment-box .total { font-size: 22pt; font-weight: bold; margin-bottom: 8px; }
  .investment-box .details { font-size: 10pt; opacity: 0.9; }

  .bullet-list { margin: 10px 0; padding-left: 20px; }
  .bullet-list li { margin: 5px 0; font-size: 11pt; }

  .indice-item { padding: 5px 0; font-size: 11pt; border-bottom: 1px dotted #ccc; }
  .indice-num { color: #1a7a6d; font-weight: bold; min-width: 30px; display: inline-block; }

  .valor-destaque { background: #c8a951; color: white; font-size: 26pt; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; margin: 20px 0; }

  .norma-item { padding: 3px 0 3px 15px; font-size: 10pt; }

  .contact-box { text-align: center; margin-top: 30px; font-size: 11pt; }
  .contact-box .phone { color: #1a7a6d; font-weight: bold; font-size: 14pt; }
</style>
</head>
<body>

<!-- CAPA -->
<div class="page-no-pad">
  <div class="cover">
    ${capaBg ? `<img src="${capaBg}" class="cover-bg" />` : ''}
    ${logo ? `<img src="${logo}" class="cover-logo" />` : ''}
    <div class="cover-title">GRUPO MONTEX</div>
    <div class="cover-divider"></div>
    <div class="cover-subtitle">SOLUÇÕES MODULARES</div>
    <div class="cover-proposta">Proposta Comercial</div>
    <div class="cover-project">${(data.project?.nome || 'PROJETO').toUpperCase()}</div>
    ${data.project?.cliente ? `<div class="cover-client">${data.project.cliente}</div>` : ''}
    <div class="cover-date">${months[now.getMonth()]} / ${now.getFullYear()}</div>
  </div>
</div>

<!-- SOBRE -->
<div class="page">
  <div class="page-header">${logo ? `<img src="${logo}" />` : ''}<span>GRUPO MONTEX</span></div>
  ${sobreBg ? `<img src="${sobreBg}" class="sobre-bg" />` : ''}
  <h2>Sobre <em class="primary">Grupo Montex</em></h2>
  <p>Com mais de 10 anos o Grupo Montex se posiciona entre as principais empresas de soluções modulares, estruturas metálicas, esquadrias de alumínio, ACM, construção a seco, localizada em São Joaquim de Bicas, às margens da BR381, facilitando a logística de transporte.</p>
  <h3>Missão <em class="primary">Grupo Montex</em></h3>
  <p>O Grupo Montex preza honestidade, transparência e sustentabilidade em seus negócios.</p>
  <h3>Visão <em class="primary">Grupo Montex</em></h3>
  <p>Construir o futuro com parcerias inovadoras visando entregar sempre o melhor.</p>
  <div class="page-footer"><span>(31) 99582-1443 | guilherme.maciel.vieira@gmail.com | www.grupomontex.com.br</span></div>
</div>

<!-- PORTFÓLIO -->
<div class="page">
  <div class="page-header">${logo ? `<img src="${logo}" />` : ''}<span>GRUPO MONTEX</span></div>
  <h1 style="text-align:center">PORTFÓLIO DE PROJETOS</h1>
  <div class="cover-divider" style="margin:10px auto 25px"></div>
  <div class="portfolio-item">${portfolioSuperluna ? `<img src="${portfolioSuperluna}" />` : ''}<h3>Super Luna Betim</h3><div class="portfolio-services">Construção Metálica; Telhas Isotérmicas; ACM Kynnar PVDF; Fachada Grid</div></div>
  <div class="portfolio-item">${portfolioAbc ? `<img src="${portfolioAbc}" />` : ''}<h3>ABC Passos</h3><div class="portfolio-services">Construção Metálica; Telhas Isotérmicas; ACM Kynnar PVDF</div></div>
  <div class="portfolio-item">${portfolioGraneleiro ? `<img src="${portfolioGraneleiro}" />` : ''}<h3>Graneleiro Goiás</h3><div class="portfolio-services">Construção Metálica; Telhas Isotérmicas</div></div>
  <div class="page-footer"><span>(31) 99582-1443 | guilherme.maciel.vieira@gmail.com | www.grupomontex.com.br</span></div>
</div>

<!-- ÍNDICE -->
<div class="page">
  <div class="page-header">${logo ? `<img src="${logo}" />` : ''}<span>GRUPO MONTEX</span></div>
  <h2>PROPOSTA TÉCNICA / COMERCIAL</h2>
  <p><strong><em>N-${data.propostaNumber} rev00</em></strong></p>
  <p><strong>${(data.project?.nome || 'PROJETO').toUpperCase()}</strong></p>
  <p>${monthsUpper[now.getMonth()]} / ${now.getFullYear()}</p>
  <h1 style="text-align:center; margin-top:30px">ÍNDICE</h1>
  ${['CARTA DE APRESENTAÇÃO', 'OBJETO DA PROPOSTA', 'NORMAS TÉCNICAS', 'DOCUMENTOS RECEBIDOS', 'OBRIGAÇÕES DA MONTEX', 'OBRIGAÇÕES DO CLIENTE', 'JORNADA DE TRABALHO', 'SISTEMA DE SEGURANÇA', 'PRAZO DE EXECUÇÃO DOS SERVIÇOS', 'CONDIÇÕES DE PAGAMENTO', 'CÁLCULOS/ESTIMATIVAS', 'VALOR TOTAL DA OBRA', 'ANÁLISE DO INVESTIMENTO', 'CRONOGRAMA DETALHADO', 'POR QUE ESCOLHER O GRUPO MONTEX?'].map((item, i) => `<div class="indice-item"><span class="indice-num">${i + 1}.</span> <strong><em>${item}</em></strong></div>`).join('')}
  <div class="page-footer"><span>(31) 99582-1443 | guilherme.maciel.vieira@gmail.com | www.grupomontex.com.br</span></div>
</div>

<!-- CARTA + OBJETO -->
<div class="page">
  <div class="page-header">${logo ? `<img src="${logo}" />` : ''}<span>GRUPO MONTEX</span></div>
  <h2><span class="section-num">1.</span> CARTA DE APRESENTAÇÃO</h2>
  <p><strong>SÃO JOAQUIM DE BICAS, ${now.getDate()} DE ${monthsUpper[now.getMonth()]} DE ${now.getFullYear()}</strong></p>
  <p>PROPOSTA COMERCIAL N-${data.propostaNumber}</p>
  <p style="margin-top:10px">Prezados Senhores, é com grande satisfação que apresentamos nossa proposta para o projeto ${data.project?.nome || ''}.</p>
  <h2><span class="section-num">2.</span> OBJETO DA PROPOSTA</h2>
  <p><strong>PREÇOS INCLUEM MATERIAL, FABRICAÇÃO, PINTURA, TRANSPORTE E MONTAGEM.</strong></p>
  ${generateItemsTableHTML(data)}
  <h3>2.1 - ESTRUTURA METÁLICA:</h3>
  <p>Estrutura metálica confeccionada com tesouras, terças e colunas em perfil U dobrado.</p>
  <h3>2.2 - AÇO:</h3><p>Chapas: ASTM A 36 / Perfis "U" Civil 300</p>
  <h3>2.3 - PINTURA:</h3><p>Jateamento DS 2,5 + 2 demãos de 60 micras</p>
  <div class="page-footer"><span>(31) 99582-1443 | guilherme.maciel.vieira@gmail.com | www.grupomontex.com.br</span></div>
</div>

<!-- NORMAS + OBRIGAÇÕES MONTEX -->
<div class="page">
  <div class="page-header">${logo ? `<img src="${logo}" />` : ''}<span>GRUPO MONTEX</span></div>
  <h2><span class="section-num">3.</span> NORMAS TÉCNICAS</h2>
  <h3>3.1 - Cargas e Cálculos:</h3>
  <p>Cálculo estrutural feito por profissionais capacitados, usando programas de última geração.</p>
  <div class="norma-item">• NBR 6.120 - Cargas para Estruturas de Edificações</div>
  <div class="norma-item">• NBR 6.123 - Ações do Vento em Estruturas</div>
  <div class="norma-item">• NBR 8.800 - Projeto e Execução de Aço de Edifícios</div>
  <div class="norma-item">• Manual do AISC/1993 e AISI/1991</div>
  <h3>3.2 - Soldas:</h3><p>Qualificados conforme AWS D1-1.</p>
  <h3>3.3 - Parafusos:</h3><p>ASTM A-307 / A-325.</p>
  <h2><span class="section-num">5.</span> OBRIGAÇÕES DA MONTEX</h2>
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
  <div class="page-footer"><span>(31) 99582-1443 | guilherme.maciel.vieira@gmail.com | www.grupomontex.com.br</span></div>
</div>

<!-- OBRIGAÇÕES CLIENTE + JORNADA + SEGURANÇA + PRAZO + PAGAMENTO -->
<div class="page">
  <div class="page-header">${logo ? `<img src="${logo}" />` : ''}<span>GRUPO MONTEX</span></div>
  <h2><span class="section-num">6.</span> OBRIGAÇÕES DO CLIENTE</h2>
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
  <h2><span class="section-num">7.</span> JORNADA DE TRABALHO</h2>
  <p><strong>44 horas semanais, segunda a sexta-feira.</strong></p>
  <h2><span class="section-num">8.</span> SISTEMA DE SEGURANÇA</h2>
  <p><strong>Meta: Prevenção de acidentes.</strong> Técnico de segurança com DDS diário. EPIs conforme NR-6.</p>
  <h2><span class="section-num">9.</span> PRAZO DE EXECUÇÃO</h2>
  <div class="valor-destaque" style="background:#1a7a6d">${data.prazoExecucao || 150} DIAS</div>
  <h2><span class="section-num">10.</span> CONDIÇÕES DE PAGAMENTO</h2>
  <ul class="bullet-list">
    <li><strong>${cond.assinatura}%</strong> na assinatura do contrato</li>
    <li><strong>${cond.projeto}%</strong> na entrega do projeto metálico</li>
    <li><strong>${cond.medicoes}%</strong> mediante medições e conforme aceite</li>
  </ul>
  <div class="page-footer"><span>(31) 99582-1443 | guilherme.maciel.vieira@gmail.com | www.grupomontex.com.br</span></div>
</div>

<!-- VALOR + ANÁLISE -->
<div class="page">
  <div class="page-header">${logo ? `<img src="${logo}" />` : ''}<span>GRUPO MONTEX</span></div>
  <h2><span class="section-num">12.</span> VALOR TOTAL DA OBRA</h2>
  <div class="valor-destaque">${formatCurrencyBR(total)}</div>
  <h2><span class="section-num">13.</span> ANÁLISE DO INVESTIMENTO</h2>
  <h3>Composição dos Custos e Comparativo de Mercado</h3>
  ${(() => {
    const pesoTotal = data.calculations?.pesoTotal || 0;
    if (pesoTotal <= 0) return '<p>Adicione itens para ver a análise.</p>';
    const custoKg = total / pesoTotal;
    return `<table class="cronograma-table">
      <tr><td><strong>Custo por kg (Montex)</strong></td><td class="right">R$ ${formatNumberBR(custoKg)}/kg</td></tr>
      <tr><td><strong>Média de Mercado</strong></td><td class="right">R$ 28,00/kg</td></tr>
      <tr><td><strong>Concorrentes Premium</strong></td><td class="right">R$ 35,00/kg</td></tr>
      <tr style="background:#e8f5f2"><td><strong class="primary">ECONOMIA ESTIMADA</strong></td><td class="right primary"><strong>${formatCurrencyBR(Math.max(0, (28 - custoKg) * pesoTotal))}</strong></td></tr>
      <tr style="background:#e8f5f2"><td><strong class="primary">ECONOMIA PREMIUM</strong></td><td class="right primary"><strong>${formatCurrencyBR(Math.max(0, (35 - custoKg) * pesoTotal))}</strong></td></tr>
    </table>`;
  })()}
  <div class="page-footer"><span>(31) 99582-1443 | guilherme.maciel.vieira@gmail.com | www.grupomontex.com.br</span></div>
</div>

<!-- CRONOGRAMA -->
<div class="page">
  <div class="page-header">${logo ? `<img src="${logo}" />` : ''}<span>GRUPO MONTEX</span></div>
  <h2><span class="section-num">14.</span> CRONOGRAMA DETALHADO DE EXECUÇÃO</h2>
  <p><strong>Planejamento das Etapas — ${data.prazoExecucao || 150} Dias</strong></p>
  ${generateCronogramaHTML(data)}
  <div class="page-footer"><span>(31) 99582-1443 | guilherme.maciel.vieira@gmail.com | www.grupomontex.com.br</span></div>
</div>

<!-- POR QUE MONTEX -->
<div class="page">
  <div class="page-header">${logo ? `<img src="${logo}" />` : ''}<span>GRUPO MONTEX</span></div>
  <h2><span class="section-num">15.</span> POR QUE ESCOLHER O GRUPO MONTEX?</h2>
  <h3 style="text-align:center">Diferenciais Competitivos</h3>
  ${generateDiferenciaisHTML(data)}
  <div class="investment-box">
    <div class="total">INVESTIMENTO TOTAL: ${formatCurrencyBR(total)}</div>
    <div class="details">
      Proposta válida por 15 dias a partir de ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}<br>
      Condições: ${cond.assinatura}% assinatura | ${cond.projeto}% entrega projeto | ${cond.medicoes}% medições
    </div>
  </div>
  <div class="contact-box">
    <div class="phone">(31) 99582-1443</div>
    <div>guilherme.maciel.vieira@gmail.com</div>
    <div class="primary"><strong>www.grupomontex.com.br</strong></div>
  </div>
  <div class="page-footer"><span>(31) 99582-1443 | guilherme.maciel.vieira@gmail.com | www.grupomontex.com.br</span></div>
</div>

</body>
</html>`;

  const html2pdf = (await import('html2pdf.js')).default;
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  try {
    const pdfBlob = await html2pdf()
      .set({
        margin: 0,
        filename: `Proposta_${(data.project?.nome || 'Montex').replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: '.diferencial-card' },
      })
      .from(container)
      .outputPdf('blob');

    return pdfBlob;
  } finally {
    document.body.removeChild(container);
  }
}
