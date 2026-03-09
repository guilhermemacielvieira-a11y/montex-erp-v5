/**
 * Gerador de Proposta em PDF via HTML + html2pdf.js
 * Gera um HTML profissional e converte para PDF mantendo o layout do modelo.
 */

const COLORS = {
  primary: '#1a7a6d',
  primaryLight: '#e8f5f2',
  secondary: '#c8a951',
  dark: '#1a1a2e',
  text: '#333333',
  lightGray: '#f5f5f5',
  white: '#ffffff',
};

const formatCurrencyBR = (value) => {
  return 'R$ ' + (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatNumberBR = (value) => {
  return (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function getDateBR() {
  const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  const now = new Date();
  return `${months[now.getMonth()]}/ ${now.getFullYear()}`;
}

function getFullDateBR() {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const now = new Date();
  return `São Joaquim de Bicas, ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
}

function buildItemsFromData(data) {
  const allItems = [];
  let totalGeral = 0;

  (data.setores || []).forEach(setor => {
    (setor.itens || []).forEach(item => {
      const total = (item.quantidade || 0) * (item.preco || 0);
      totalGeral += total;
      allItems.push({
        descricao: item.nome || 'Item',
        quantidade: item.quantidade || 0,
        unidade: item.unidade || 'UN',
        preco: item.preco || 0,
        total,
      });
    });
  });

  if (allItems.length === 0) {
    const uc = data.unitCosts || {};
    const estTotal = (uc.estrutura?.material || 0) + (uc.estrutura?.fabricacao || 0) +
      (uc.estrutura?.pintura || 0) + (uc.estrutura?.transporte || 0) + (uc.estrutura?.montagem || 0);
    const cobTotal = (uc.cobertura?.material || 0) + (uc.cobertura?.montagem || 0);
    const fechTotal = (uc.fechamento?.material || 0) + (uc.fechamento?.montagem || 0);
    const sdTotal = (uc.steelDeck?.material || 0) + (uc.steelDeck?.montagem || 0);

    if (estTotal > 0) allItems.push({ descricao: 'ESTRUTURA METÁLICA', quantidade: data.calculations?.pesoTotal || 0, unidade: 'KG', preco: estTotal, total: (data.calculations?.pesoTotal || 0) * estTotal });
    if (cobTotal > 0) allItems.push({ descricao: 'COBERTURA - TELHA', quantidade: 0, unidade: 'M²', preco: cobTotal, total: 0 });
    if (fechTotal > 0) allItems.push({ descricao: 'FECHAMENTO', quantidade: 0, unidade: 'M²', preco: fechTotal, total: 0 });
    if (sdTotal > 0) allItems.push({ descricao: 'STEEL DECK', quantidade: 0, unidade: 'M²', preco: sdTotal, total: 0 });
    totalGeral = allItems.reduce((s, i) => s + i.total, 0);
  }

  return { allItems, totalGeral };
}

function generateHTML(data) {
  const { allItems, totalGeral } = buildItemsFromData(data);
  const total = data.calculations?.precoVenda || data.calculations?.custoTotal || totalGeral;
  const pesoTotal = data.calculations?.pesoTotal || 0;
  const precoKg = pesoTotal > 0 ? total / pesoTotal : 0;
  const prazo = data.prazoExecucao || 150;
  const cond = data.condicoesPagamento || { assinatura: 10, projeto: 5, medicoes: 85 };

  const itemsHTML = allItems.map((item, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#fff' : COLORS.lightGray}">
      <td style="text-align:center; padding:8px; border:1px solid #ddd">${formatNumberBR(item.quantidade)}</td>
      <td style="text-align:center; padding:8px; border:1px solid #ddd">${item.unidade}</td>
      <td style="padding:8px; border:1px solid #ddd">${item.descricao}</td>
      <td style="text-align:right; padding:8px; border:1px solid #ddd">${formatCurrencyBR(item.preco)}</td>
      <td style="text-align:right; padding:8px; border:1px solid #ddd">${formatCurrencyBR(item.total)}</td>
    </tr>
  `).join('');

  const phases = [
    { fase: '1. Detalhamento', prazo: '30 dias', desc: 'Projeto executivo, modelagem 3D e compatibilização' },
    { fase: '2. Materiais', prazo: '30 dias', desc: 'Aquisição de chapas ASTM A36 e perfis U Civil 300' },
    { fase: '3. Fabricação', prazo: '60 dias', desc: 'Corte, solda e montagem das peças na fábrica' },
    { fase: '4. Pintura', prazo: '30 dias', desc: 'Jateamento DS 2,5 + 2 demãos de 60 micras' },
    { fase: '5. Transporte', prazo: '15 dias', desc: 'Logística via BR-381 até o canteiro de obras' },
    { fase: '6. Montagem', prazo: '55 dias', desc: 'Instalação com munck/guindaste e equipe especializada' },
  ];

  const phasesHTML = phases.map((p, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#fff' : COLORS.lightGray}">
      <td style="padding:8px; border:1px solid #ddd; font-weight:bold">${p.fase}</td>
      <td style="text-align:center; padding:8px; border:1px solid #ddd; font-weight:bold">${p.prazo}</td>
      <td style="padding:8px; border:1px solid #ddd">${p.desc}</td>
    </tr>
  `).join('');

  const reasons = [
    { title: 'PREÇO COMPETITIVO', desc: `${formatCurrencyBR(precoKg)}/kg — abaixo da média de mercado (R$28/kg).` },
    { title: 'EXPERIÊNCIA COMPROVADA', desc: 'Mais de 10 anos com +50 projetos entregues em 5 estados.' },
    { title: 'SOLUÇÃO TURNKEY COMPLETA', desc: 'Material, fabricação, pintura, transporte e montagem inclusos.' },
    { title: 'LOGÍSTICA ESTRATÉGICA', desc: 'Sede em São Joaquim de Bicas/MG, BR-381.' },
    { title: 'CONFORMIDADE TÉCNICA', desc: 'NBR 6.120, 6.123, 8.800, AISC, AWS D1-1, ASTM.' },
    { title: 'EQUIPE QUALIFICADA', desc: '+200 profissionais. Segurança conforme NR-6.' },
  ];

  const reasonsHTML = reasons.map(r => `
    <div style="margin-bottom:12px; padding:12px; background:${COLORS.primaryLight}; border-left:4px solid ${COLORS.primary}; border-radius:4px">
      <strong style="color:${COLORS.primary}; font-size:14px">${r.title}</strong>
      <p style="margin:4px 0 0; color:${COLORS.text}; font-size:12px">${r.desc}</p>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: Arial, sans-serif; color: ${COLORS.text}; line-height: 1.5; font-size: 12px; }
    .page-break { page-break-before: always; }
    h1 { color: ${COLORS.primary}; font-size: 24px; margin-top: 30px; }
    h2 { color: ${COLORS.primary}; font-size: 18px; border-bottom: 2px solid ${COLORS.primary}; padding-bottom: 6px; margin-top: 25px; }
    h3 { color: ${COLORS.primary}; font-size: 14px; margin-top: 15px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    .header-bar { background: ${COLORS.primary}; color: white; padding: 10px 15px; font-weight: bold; font-size: 11px; text-align: center; }
    .total-row { background: ${COLORS.secondary}; color: white; font-weight: bold; }
    .subtotal-row { background: ${COLORS.primaryLight}; font-weight: bold; }
    .cover-page { text-align: center; padding-top: 120px; }
    .section-text { font-size: 11px; line-height: 1.6; }
    .bullet { margin: 4px 0; padding-left: 15px; }
  </style>
</head>
<body>

<!-- CAPA -->
<div class="cover-page">
  <img src="/images/proposta/logo-montex.png" style="width:80px; margin-bottom:30px" onerror="this.style.display='none'" />
  <h1 style="font-size:36px; margin:0; color:${COLORS.primary}">GRUPO MONTEX</h1>
  <p style="font-size:16px; color:${COLORS.secondary}; letter-spacing:4px; margin-top:8px">SOLUÇÕES MODULARES</p>
  <hr style="width:200px; border:1px solid ${COLORS.secondary}; margin:30px auto">
  <h1 style="font-size:28px; color:${COLORS.dark}">Proposta Comercial</h1>
  <div style="margin-top:120px">
    <p style="font-style:italic">PROPOSTA TÉCNICA / COMERCIAL</p>
    <p style="font-style:italic; font-weight:bold">N-${data.propostaNumber || '01/26'} rev00</p>
    <p style="font-size:18px; color:${COLORS.primary}; font-weight:bold; margin-top:20px">${(data.project?.nome || 'PROJETO').toUpperCase()}</p>
    <p style="font-style:italic">${getDateBR()}</p>
  </div>
</div>

<!-- ÍNDICE -->
<div class="page-break"></div>
<h2 style="text-align:center; border:none">ÍNDICE</h2>
<div style="padding:20px 40px">
  <p>1. CARTA DE APRESENTAÇÃO</p>
  <p>2. OBJETO DA PROPOSTA</p>
  <p>3. NORMAS TÉCNICAS</p>
  <p>5. OBRIGAÇÕES DA MONTEX</p>
  <p>6. OBRIGAÇÕES DO CLIENTE</p>
  <p>7. JORNADA DE TRABALHO</p>
  <p>8. SISTEMA DE SEGURANÇA</p>
  <p>9. PRAZO DE EXECUÇÃO</p>
  <p>10. CONDIÇÕES DE PAGAMENTO</p>
  <p>11. CÁLCULOS/ESTIMATIVAS</p>
  <p>12. VALOR TOTAL DA OBRA</p>
  <p>13. ANÁLISE DO INVESTIMENTO</p>
  <p>14. CRONOGRAMA DETALHADO</p>
  <p>15. POR QUE ESCOLHER O GRUPO MONTEX?</p>
</div>

<!-- 1. CARTA -->
<div class="page-break"></div>
<h2>1. CARTA DE APRESENTAÇÃO</h2>
<p><strong>${getFullDateBR().toUpperCase()}</strong></p>
<p><strong>PROPOSTA COMERCIAL N-${data.propostaNumber || '01/26'}</strong></p>
<p class="section-text">Prezados Senhores da <strong>${data.project?.cliente || 'Cliente'}</strong>,</p>
<p class="section-text">Em atendimento a vossa solicitação, apresentamos nossa proposta técnica/comercial para fornecimento de estrutura metálica, cobertura e serviços correlatos para o projeto <strong>${data.project?.nome || ''}</strong>. O Grupo Montex, com mais de 10 anos de experiência, oferece soluções completas incluindo material, fabricação, pintura, transporte e montagem.</p>
<p class="section-text">Colocamo-nos à disposição para quaisquer esclarecimentos.</p>
<p style="margin-top:30px">Atenciosamente,</p>
<p><strong style="color:${COLORS.primary}">GRUPO MONTEX</strong></p>
<p style="font-size:11px">Guilherme Maciel Vieira - Diretor Comercial</p>

<!-- 2. OBJETO DA PROPOSTA -->
<div class="page-break"></div>
<h2>2. OBJETO DA PROPOSTA</h2>
<p><strong><em>PREÇOS ABAIXO INCLUEM MATERIAL, FABRICAÇÃO, PINTURA, TRANSPORTE E MONTAGEM.</em></strong></p>
<table>
  <tr class="header-bar">
    <td style="width:15%">QUANTIDADE</td>
    <td style="width:10%">UNIDADE</td>
    <td style="width:40%">DESCRIÇÃO SERVIÇO</td>
    <td style="width:17%">VALOR UNITÁRIO</td>
    <td style="width:18%">VALOR TOTAL</td>
  </tr>
  ${itemsHTML}
  <tr class="subtotal-row">
    <td colspan="4" style="text-align:right; padding:8px; border:1px solid #ddd">SUBTOTAL</td>
    <td style="text-align:right; padding:8px; border:1px solid #ddd">${formatCurrencyBR(totalGeral)}</td>
  </tr>
  <tr class="total-row">
    <td colspan="4" style="text-align:right; padding:10px; border:1px solid #ddd; font-size:14px">TOTAL DA OBRA</td>
    <td style="text-align:right; padding:10px; border:1px solid #ddd; font-size:14px">${formatCurrencyBR(total)}</td>
  </tr>
</table>

<!-- 2.1-2.3 TÉCNICO -->
<h3>2.1 - ESTRUTURA METÁLICA:</h3>
<p class="bullet">· ESTRUTURA METÁLICA CONFECCIONADA COM TESOURAS, TERÇAS E COLUNAS EM PERFIL U DOBRADO</p>
<h3>2.2 - AÇO:</h3>
<p class="bullet">· CHAPAS: ASTM A 36;</p>
<p class="bullet">· PERFIS "U" CIVIL 300</p>
<h3>2.3 - PINTURA / TRATAMENTO SUPERFICIAL:</h3>
<p class="bullet">· JATEAMENTO DS 2,5 + 2 DEMÃOS DE 60 MICRAS</p>

<!-- 3. NORMAS -->
<div class="page-break"></div>
<h2>3. NORMAS TÉCNICAS</h2>
<h3>3.1 - CARGAS E CÁLCULOS:</h3>
<p class="bullet section-text">· CÁLCULO ESTRUTURAL E DETALHAMENTOS FEITOS POR PROFISSIONAIS CAPACITADOS, USANDO PROGRAMAS DE ÚLTIMA GERAÇÃO COM MODELAGEM 3D.</p>
<p class="bullet section-text">· NORMAS OBEDECIDAS:</p>
<p class="bullet" style="padding-left:30px">NBR - 6.120 - CARGAS PARA ESTRUTURAS DE EDIFICAÇÕES</p>
<p class="bullet" style="padding-left:30px">NBR - 6.123 - AÇÕES DO VENTO EM ESTRUTURAS</p>
<p class="bullet" style="padding-left:30px">NBR - 8.800 - PROJETO E EXECUÇÃO DE AÇO DE EDIFÍCIOS</p>
<p class="bullet" style="padding-left:30px">MANUAL DO AISC/1993 - ESTRUTURAS DE AÇO</p>
<p class="bullet" style="padding-left:30px">MANUAL DO AISI/1991 - PERFIS DE CHAPA DOBRADOS A FRIO</p>
<h3>3.2 - SOLDAS:</h3>
<p class="bullet">· SOLDADORES QUALIFICADOS - NORMA AWS -D1-1.</p>
<h3>3.3 - PARAFUSOS:</h3>
<p class="bullet">· NORMA ASTMA-307 / A-325.</p>

<!-- 5. OBRIGAÇÕES MONTEX -->
<div class="page-break"></div>
<h2>5. OBRIGAÇÕES DA MONTEX</h2>
<p class="bullet">· DETALHAMENTO DE TODA A ESTRUTURA METÁLICA;</p>
<p class="bullet">· FORNECIMENTO DE TODO O MATERIAL NECESSÁRIO;</p>
<p class="bullet">· FABRICAÇÃO DAS ESTRUTURAS;</p>
<p class="bullet">· FORNECIMENTO DOS CHUMBADORES;</p>
<p class="bullet">· TRATAMENTO CONFORME ITEM 2.3;</p>
<p class="bullet">· TRANSPORTE ATÉ O LOCAL DA OBRA;</p>
<p class="bullet">· MONTAGEM DE TODO O FORNECIMENTO;</p>
<p class="bullet">· EQUIPAMENTOS (MUNCK, GUINDASTE, PLATAFORMAS);</p>
<p class="bullet">· TRANSPORTE, ALIMENTAÇÃO E ESTADIA DA EQUIPE;</p>
<p class="bullet">· ART DOS SERVIÇOS EXECUTADOS;</p>
<p class="bullet">· GARANTIA CONFORME CÓDIGO CIVIL - ART. 1245.</p>

<!-- 6. OBRIGAÇÕES CLIENTE -->
<h2>6. OBRIGAÇÕES DO CLIENTE</h2>
<p class="bullet">· CÁLCULO E EXECUÇÃO DOS SERVIÇOS EM ALVENARIA E CONCRETO;</p>
<p class="bullet">· LOCAÇÃO E INSTALAÇÃO DOS CHUMBADORES;</p>
<p class="bullet">· FORNECER ENERGIA ELÉTRICA;</p>
<p class="bullet">· LOCAL SEGURO PARA EQUIPAMENTOS;</p>
<p class="bullet">· ESQUADRIAS METÁLICAS (SERRALHERIA);</p>
<p class="bullet">· LOCAL LIMPO E DESIMPEDIDO;</p>
<p class="bullet">· INFRAESTRUTURA CONFORME NR-18;</p>
<p class="bullet">· GROUTEAMENTO APÓS NIVELAMENTO.</p>

<!-- 7-8. JORNADA E SEGURANÇA -->
<div class="page-break"></div>
<h2>7. JORNADA DE TRABALHO</h2>
<p><strong><em>44 HORAS SEMANAIS, SEGUNDA A SEXTA-FEIRA.</em></strong></p>
<p class="section-text"><em>Jornada idealizada em função do volume de serviços. Caso necessário, alternativas serão estudadas.</em></p>

<h2>8. SISTEMA DE SEGURANÇA</h2>
<p class="section-text"><strong>OBJETIVO:</strong> Prevenção de acidentes com avaliação prévia de riscos, normas NPS e monitoramento contínuo.</p>
<p class="section-text">EPIs fornecidos conforme NR-6 da Portaria 3.214. Técnico de segurança com DDS diário.</p>

<!-- 9-10. PRAZO E PAGAMENTO -->
<h2>9. PRAZO DE EXECUÇÃO</h2>
<p style="text-align:center; font-size:28px; font-weight:bold; color:${COLORS.primary}; margin:30px 0">${prazo} DIAS</p>

<h2>10. CONDIÇÕES DE PAGAMENTO</h2>
<p class="bullet"><strong>- ${cond.assinatura}% NA ASSINATURA DO CONTRATO</strong></p>
<p class="bullet"><strong>- ${cond.projeto}% NA ENTREGA DO PROJETO METÁLICO</strong></p>
<p class="bullet"><strong>- ${cond.medicoes}% MEDIANTE MEDIÇÕES E CONFORME ACEITE</strong></p>

<!-- 12. VALOR TOTAL -->
<div class="page-break"></div>
<h2>12. VALOR TOTAL DA OBRA</h2>
<div style="text-align:center; margin:40px 0; padding:30px; border:3px solid ${COLORS.primary}; border-radius:8px; background:${COLORS.primaryLight}">
  <p style="font-size:36px; font-weight:bold; color:${COLORS.primary}; margin:0">${formatCurrencyBR(total)}</p>
</div>

<!-- 13. ANÁLISE -->
<h2>13. ANÁLISE DO INVESTIMENTO</h2>
<p><strong>COMPOSIÇÃO DOS CUSTOS E COMPARATIVO DE MERCADO</strong></p>
<p class="section-text"><strong>ECONOMIA ESTIMADA:</strong> Até ${formatCurrencyBR(Math.max(0, pesoTotal * (28 - precoKg)))} em relação à média de mercado (R$28/kg)</p>
<p class="section-text"><strong>ECONOMIA PREMIUM:</strong> Até ${formatCurrencyBR(Math.max(0, pesoTotal * (35 - precoKg)))} em relação a concorrentes premium (R$35/kg)</p>

<!-- 14. CRONOGRAMA -->
<div class="page-break"></div>
<h2>14. CRONOGRAMA DETALHADO DE EXECUÇÃO</h2>
<p><strong><em>PLANEJAMENTO DAS ETAPAS — ${prazo} DIAS</em></strong></p>
<table>
  <tr class="header-bar">
    <td style="width:25%">FASE</td>
    <td style="width:15%">PRAZO</td>
    <td style="width:60%">DESCRIÇÃO</td>
  </tr>
  ${phasesHTML}
</table>

<!-- KPI BOXES -->
<div style="display:flex; gap:10px; margin-top:20px; justify-content:center">
  <div style="flex:1; text-align:center; padding:15px; background:${COLORS.primaryLight}; border-radius:6px; border:1px solid ${COLORS.primary}">
    <strong style="font-size:18px; color:${COLORS.primary}">${formatNumberBR(pesoTotal)} kg</strong>
    <p style="margin:4px 0 0; font-size:10px">de aço</p>
  </div>
  <div style="flex:1; text-align:center; padding:15px; background:${COLORS.primaryLight}; border-radius:6px; border:1px solid ${COLORS.primary}">
    <strong style="font-size:18px; color:${COLORS.primary}">${prazo} dias</strong>
    <p style="margin:4px 0 0; font-size:10px">prazo total</p>
  </div>
  <div style="flex:1; text-align:center; padding:15px; background:${COLORS.primaryLight}; border-radius:6px; border:1px solid ${COLORS.primary}">
    <strong style="font-size:18px; color:${COLORS.primary}">44h/semana</strong>
    <p style="margin:4px 0 0; font-size:10px">jornada</p>
  </div>
</div>

<!-- 15. POR QUE ESCOLHER -->
<div class="page-break"></div>
<h2>15. POR QUE ESCOLHER O GRUPO MONTEX?</h2>
<p><strong><em>DIFERENCIAIS COMPETITIVOS PARA O SEU PROJETO</em></strong></p>
${reasonsHTML}

<!-- RODAPÉ FINAL -->
<div style="margin-top:40px; text-align:center; padding:20px; background:${COLORS.primary}; color:white; border-radius:6px">
  <p style="font-size:18px; font-weight:bold; margin:0">INVESTIMENTO TOTAL: ${formatCurrencyBR(total)}</p>
  <p style="font-size:11px; margin:8px 0 0">Proposta válida por 15 dias a partir de ${new Date().toLocaleDateString('pt-BR')}</p>
  <p style="font-size:11px; margin:4px 0 0">Condições: ${cond.assinatura}% assinatura | ${cond.projeto}% entrega projeto | ${cond.medicoes}% medições</p>
</div>

<div style="text-align:center; margin-top:20px; font-size:10px; color:#999">
  <p>Grupo Montex — (31) 99582-1443 — guilherme.maciel.vieira@gmail.com — www.grupomontex.com.br</p>
</div>

</body>
</html>`;
}

export async function generatePropostaPDF(data) {
  const html2pdf = (await import('html2pdf.js')).default;

  const htmlContent = generateHTML(data);

  // Create a temporary container
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  document.body.appendChild(container);

  const opt = {
    margin: [10, 10, 15, 10],
    filename: `Proposta_${(data.project?.nome || 'Montex').replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  try {
    const blob = await html2pdf().set(opt).from(container).outputPdf('blob');
    return blob;
  } finally {
    document.body.removeChild(container);
  }
}

export default generatePropostaPDF;
