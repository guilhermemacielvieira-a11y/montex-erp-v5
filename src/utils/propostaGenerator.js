import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, ImageRun, LevelFormat, TabStopType,
  TabStopPosition } from 'docx';

// Brand colors
const COLORS = {
  teal: '1a7a6d',      // Pages 1-9 headings
  red: 'FF0000',        // Pages 10-17 headings
  text: '333333',
  lightGray: 'f5f5f5',
  mediumGray: 'cccccc',
  white: 'ffffff',
  tableBorder: 'b0b0b0',
};

// A4 page dimensions in DXA
const A4 = { width: 11906, height: 16838 };
const MARGINS = { top: 1440, right: 1134, bottom: 1440, left: 1134 };
const CONTENT_WIDTH = A4.width - MARGINS.left - MARGINS.right;

const formatCurrencyBR = (value) => {
  if (!value || isNaN(value)) return 'R$ 0,00';
  return 'R$ ' + Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatNumberBR = (value) => {
  if (!value || isNaN(value)) return '0,00';
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper to create styled table cells
const createCell = (text, options = {}) => {
  const { bold = false, fontSize = 20, alignment = AlignmentType.LEFT, shading, width, color = COLORS.text, colspan } = options;
  const cellOptions = {
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: shading ? { fill: shading, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
      left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
      right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder },
    },
    children: [new Paragraph({
      alignment,
      children: [new TextRun({ text: String(text || ''), bold, size: fontSize, font: 'Arial', color })]
    })]
  };
  if (colspan) cellOptions.columnSpan = colspan;
  return new TableCell(cellOptions);
};

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'ffffff' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// Fetch image as ArrayBuffer
async function fetchImage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.arrayBuffer();
  } catch (e) {
    console.warn(`Falha ao carregar imagem: ${url}`, e);
    return null;
  }
}

// PAGE 1 - COVER PAGE
function createCoverPage(data, images) {
  const children = [];

  // Spacing from top
  children.push(new Paragraph({ spacing: { before: 800, after: 0 }, children: [] }));

  // GRUPO MONTEX title
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 60 },
    children: [new TextRun({ text: 'GRUPO MONTEX', bold: true, size: 56, font: 'Arial', color: COLORS.teal })]
  }));

  // Separator line
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'c8a951', space: 1 } },
    children: []
  }));

  // SOLUÇÕES MODULARES
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 600 },
    children: [new TextRun({ text: 'SOLUÇÕES MODULARES', bold: true, size: 32, font: 'Arial', color: COLORS.teal })]
  }));

  // Proposta Comercial title
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 300, after: 100 },
    children: [new TextRun({ text: 'Proposta Comercial', bold: true, size: 44, font: 'Arial', color: '1a1a2e' })]
  }));

  // Project name
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({
      text: (data.project?.nome || 'PROJETO').toUpperCase(),
      bold: true, size: 36, font: 'Arial', color: COLORS.teal
    })]
  }));

  // Client name
  if (data.project?.cliente) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 800 },
      children: [new TextRun({ text: data.project.cliente, size: 28, font: 'Arial', color: COLORS.text })]
    }));
  }

  // Date
  const now = new Date();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 0 },
    children: [new TextRun({
      text: `${months[now.getMonth()]} / ${now.getFullYear()}`,
      size: 24, font: 'Arial', color: COLORS.text
    })]
  }));

  return children;
}

// PAGE 2 - SOBRE + MISSÃO
function createSobrePage() {
  const children = [];

  // Sobre heading
  children.push(new Paragraph({
    spacing: { before: 200, after: 150 },
    children: [
      new TextRun({ text: 'Sobre ', bold: true, size: 32, font: 'Arial', color: '1a1a2e' }),
      new TextRun({ text: 'Grupo Montex', bold: true, italics: true, size: 32, font: 'Arial', color: COLORS.teal })
    ]
  }));

  // Sobre text
  children.push(new Paragraph({
    spacing: { after: 250 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({
      text: 'Com mais de 10 anos o Grupo Montex se posiciona entre as principais empresas de soluções modulares, estruturas metálicas, esquadrias de alumínio, ACM, construção a seco, localizada em São Joaquim de Bicas, as margens da BR381, facilitando a logística de transporte. Com o intuito de oferecer os melhores produtos, investimos em alta tecnologia e soluções inovadoras para melhor atender nossos stakeholders, nossos projetos atendem especificamente cada modelo se adequando as necessidade de acordo com a demanda de valor para cada cliente.',
      size: 22, font: 'Arial', color: COLORS.text
    })]
  }));

  // Missão heading
  children.push(new Paragraph({
    spacing: { before: 200, after: 150 },
    children: [
      new TextRun({ text: 'Missão ', bold: true, size: 32, font: 'Arial', color: '1a1a2e' }),
      new TextRun({ text: 'Grupo Montex', bold: true, italics: true, size: 32, font: 'Arial', color: COLORS.teal })
    ]
  }));

  // Missão text
  children.push(new Paragraph({
    spacing: { after: 200 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({
      text: 'O Grupo Montex presa honestidade, transparência e sustentabilidade em seus negócios e visa sempre estar alinhado aos valores e boas praticas comerciais do nosso mercado; Nossos projetos e serviços, visam levar a nossa sociedade o que à de melhor em soluções modulares, estruturas metálicas e esquadrias de alumínio, transformando a vida de nossos colaboradores e de nossos clientes com o máximo de sucesso sustentável possivel.',
      size: 22, font: 'Arial', color: COLORS.text
    })]
  }));

  return children;
}

// PAGE 3 - VISÃO
function createVisaoPage() {
  const children = [];

  // Visão heading
  children.push(new Paragraph({
    spacing: { before: 200, after: 150 },
    children: [
      new TextRun({ text: 'Visão ', bold: true, size: 32, font: 'Arial', color: '1a1a2e' }),
      new TextRun({ text: 'Grupo Montex', bold: true, italics: true, size: 32, font: 'Arial', color: COLORS.teal })
    ]
  }));

  // Visão text
  children.push(new Paragraph({
    spacing: { after: 250 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({
      text: 'Construir o futuro com parcerias inovadoras visando entregar sempre o melhor, com maior qualidade possivel, agregando valor e menores custos aos nossos empreendimentos. Com uma visão do que podemos entregar a nossos investidores, trazendo consigo o sonho de seu pai Wellis Vieira, nós do Grupo Montex estamos sempre buscando meios diversos de atender as demandas de nossos stakeholders, bem como levar melhorias significativas a sociedade como um todo. Guilherme Maciel assim como seu pai foi ao mercado não só atrás de soluções mas também de pessoas que pudessem agregar soluções, o sonho de uma que se tornou milhares.',
      size: 22, font: 'Arial', color: COLORS.text
    })]
  }));

  // Transformando Pessoas heading
  children.push(new Paragraph({
    spacing: { before: 200, after: 150 },
    children: [new TextRun({ text: 'Transformando Pessoas', bold: true, italics: true, size: 32, font: 'Arial', color: COLORS.teal })]
  }));

  // Transformando text
  children.push(new Paragraph({
    spacing: { after: 200 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({
      text: 'Nossa equipe conta com um alto investimento em treinamento e qualificação profissional, ofertando o que à de melhor em fabricação e instalação no leito de obra.',
      size: 22, font: 'Arial', color: COLORS.text
    })]
  }));

  return children;
}

// PAGE 4 - PORTFOLIO - Super Luna Betim
function createPortfolioSuperLunaPage() {
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 200, after: 150 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Super Luna Betim', bold: true, size: 36, font: 'Arial', color: COLORS.teal })]
  }));

  // Services as bullet points
  const services = ['Construção Metálica', 'Telhas Isotérmicas', 'Chapas Perfilo', 'ACM Kynnar PVDF', 'Fachada Grid', 'Vidro Temperado'];
  for (const service of services) {
    children.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: service, bold: true, italics: true, size: 22, font: 'Arial', color: COLORS.text })]
    }));
  }

  children.push(new Paragraph({ spacing: { before: 300, after: 200 }, children: [] }));

  return children;
}

// PAGE 5 - PORTFOLIO - Portaria Retiro do Chalé
function createPortfolioPortariaPage() {
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 200, after: 150 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Portaria Retiro do Chalé', bold: true, size: 36, font: 'Arial', color: COLORS.teal })]
  }));

  const services = ['Construção Metálica', 'Telhas Isotérmicas', 'Esquadrias de Alumínio'];
  for (const service of services) {
    children.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: service, bold: true, italics: true, size: 22, font: 'Arial', color: COLORS.text })]
    }));
  }

  children.push(new Paragraph({ spacing: { before: 300, after: 200 }, children: [] }));

  return children;
}

// PAGE 6 - PORTFOLIO - ABC Passos
function createPortfolioAbcPage() {
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 200, after: 150 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'ABC Passos', bold: true, size: 36, font: 'Arial', color: COLORS.teal })]
  }));

  const services = ['Construção Metálica', 'Telhas Isotérmicas', 'Chapas Perfilo', 'ACM Kynnar PVDF', 'Fachada Grid'];
  for (const service of services) {
    children.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: service, bold: true, italics: true, size: 22, font: 'Arial', color: COLORS.text })]
    }));
  }

  children.push(new Paragraph({ spacing: { before: 300, after: 200 }, children: [] }));

  return children;
}

// PAGE 7 - PORTFOLIO - Graneleiro Goias
function createPortfolioGraneleiroPage() {
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 200, after: 150 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Graneleiro Goias', bold: true, size: 36, font: 'Arial', color: COLORS.teal })]
  }));

  const services = ['Construção Metálica', 'Telhas Isotérmicas', 'Estruturas de Grande Porte'];
  for (const service of services) {
    children.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: service, bold: true, italics: true, size: 22, font: 'Arial', color: COLORS.text })]
    }));
  }

  children.push(new Paragraph({ spacing: { before: 300, after: 200 }, children: [] }));

  return children;
}

// PAGE 8 - PORTFOLIO - My Mall
function createPortfolioMyMallPage() {
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 200, after: 150 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'My Mall', bold: true, size: 36, font: 'Arial', color: COLORS.teal })]
  }));

  const services = ['Construção Metálica', 'Fachada Grid', 'ACM Kynnar PVDF', 'Vidro Temperado'];
  for (const service of services) {
    children.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: service, bold: true, italics: true, size: 22, font: 'Arial', color: COLORS.text })]
    }));
  }

  children.push(new Paragraph({ spacing: { before: 300, after: 200 }, children: [] }));

  return children;
}

// PAGE 9 - CONTACT
function createContactPage() {
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 600, after: 400 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'Contato', bold: true, size: 44, font: 'Arial', color: COLORS.teal })]
  }));

  children.push(new Paragraph({
    spacing: { before: 200, after: 150 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '(31) 99582-1443', bold: true, size: 26, font: 'Arial', color: COLORS.text })]
  }));

  children.push(new Paragraph({
    spacing: { before: 100, after: 150 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'guilherme.maciel.vieira@gmail.com', bold: true, size: 26, font: 'Arial', color: COLORS.text })]
  }));

  children.push(new Paragraph({
    spacing: { before: 100, after: 200 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'www.grupomontex.com.br', bold: true, size: 26, font: 'Arial', color: COLORS.text })]
  }));

  return children;
}

// PAGE 10 - INDEX
function createIndexPage(data) {
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: 'PROPOSTA TECNICA/ COMERCIAL', bold: true, size: 28, font: 'Arial', color: COLORS.red })]
  }));

  children.push(new Paragraph({
    spacing: { after: 150 },
    children: [new TextRun({
      text: `N-${data.propostaNumber || '00000'} rev00`,
      bold: true, size: 24, font: 'Arial', color: COLORS.text
    })]
  }));

  // Project details
  children.push(new Paragraph({
    spacing: { before: 100, after: 60 },
    children: [new TextRun({ text: `Projeto: ${data.project?.nome || 'PROJETO'}`, size: 22, font: 'Arial', color: COLORS.text })]
  }));

  const now = new Date();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  children.push(new Paragraph({
    spacing: { after: 300 },
    children: [new TextRun({
      text: `Data: ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`,
      size: 22, font: 'Arial', color: COLORS.text
    })]
  }));

  // Index list
  const indexItems = [
    '1. ÍNDICE',
    '2. CARTA DE APRESENTAÇÃO E OBJETO DA PROPOSTA',
    '3. NORMAS TÉCNICAS',
    '4. ESPECIFICAÇÕES TÉCNICAS',
    '5. OBRIGAÇÕES DA MONTEX',
    '6. OBRIGAÇÕES DO CLIENTE',
    '7. JORNADA DE TRABALHO',
    '8. SISTEMA DE SEGURANÇA',
    '9. PRAZO DE EXECUÇÃO',
    '10. CONDIÇÕES DE PAGAMENTO',
    '11. ANÁLISE DO INVESTIMENTO',
    '12. CRONOGRAMA'
  ];

  for (const item of indexItems) {
    children.push(new Paragraph({
      spacing: { before: 100, after: 100 },
      children: [new TextRun({ text: item, size: 22, font: 'Arial', color: COLORS.text })]
    }));
  }

  return children;
}

// PAGE 11 - CARTA + OBJETO DA PROPOSTA
function createCartaPropostaPage(data) {
  const children = [];

  // Location and date
  children.push(new Paragraph({
    spacing: { before: 0, after: 200 },
    children: [new TextRun({
      text: 'SÃO JOAQUIM DE BICAS, ' + new Date().toLocaleDateString('pt-BR').toUpperCase(),
      bold: true, size: 22, font: 'Arial', color: COLORS.text
    })]
  }));

  // Proposal number
  children.push(new Paragraph({
    spacing: { after: 300 },
    children: [new TextRun({
      text: `PROPOSTA COMERCIAL N-${data.propostaNumber || '00000'}`,
      bold: true, size: 22, font: 'Arial', color: COLORS.text
    })]
  }));

  // Budget table header
  const tableRows = [];
  tableRows.push(new TableRow({
    children: [
      createCell('QUANTIDADE', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 1400 }),
      createCell('UNIDADE', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 1200 }),
      createCell('DESCRIÇÃO SERVIÇO', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 3500 }),
      createCell('VALOR UNITÁRIO', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 1900 }),
      createCell('VALOR TOTAL', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 1900 }),
    ]
  }));

  // Dynamic rows from data.setores
  let subtotal = 0;
  if (data.setores && Array.isArray(data.setores)) {
    for (const setor of data.setores) {
      if (setor.itens && Array.isArray(setor.itens)) {
        for (const item of setor.itens) {
          const quantidade = parseFloat(item.quantidade) || 0;
          const valorUnitario = parseFloat(item.valorUnitario) || 0;
          const valorTotal = quantidade * valorUnitario;
          subtotal += valorTotal;

          tableRows.push(new TableRow({
            children: [
              createCell(formatNumberBR(quantidade), { fontSize: 18, alignment: AlignmentType.CENTER, width: 1400 }),
              createCell(item.unidade || '', { fontSize: 18, alignment: AlignmentType.CENTER, width: 1200 }),
              createCell(item.descricao || '', { fontSize: 18, alignment: AlignmentType.LEFT, width: 3500 }),
              createCell(formatCurrencyBR(valorUnitario), { fontSize: 18, alignment: AlignmentType.RIGHT, width: 1900 }),
              createCell(formatCurrencyBR(valorTotal), { fontSize: 18, alignment: AlignmentType.RIGHT, width: 1900 }),
            ]
          }));
        }
      }
    }
  }

  // SUBTOTAL row
  tableRows.push(new TableRow({
    children: [
      createCell('', { fontSize: 18, width: 1400 }),
      createCell('', { fontSize: 18, width: 1200 }),
      createCell('', { fontSize: 18, width: 3500 }),
      createCell('SUBTOTAL:', { bold: true, fontSize: 20, alignment: AlignmentType.RIGHT, width: 1900 }),
      createCell(formatCurrencyBR(subtotal), { bold: true, fontSize: 20, alignment: AlignmentType.RIGHT, shading: COLORS.lightGray, width: 1900 }),
    ]
  }));

  // TOTAL row
  tableRows.push(new TableRow({
    children: [
      createCell('', { fontSize: 18, width: 1400 }),
      createCell('', { fontSize: 18, width: 1200 }),
      createCell('', { fontSize: 18, width: 3500 }),
      createCell('TOTAL:', { bold: true, fontSize: 22, alignment: AlignmentType.RIGHT, color: COLORS.red, width: 1900 }),
      createCell(formatCurrencyBR(subtotal), { bold: true, fontSize: 22, alignment: AlignmentType.RIGHT, color: COLORS.red, shading: COLORS.lightGray, width: 1900 }),
    ]
  }));

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  }));

  // Specifications section
  children.push(new Paragraph({ spacing: { before: 300, after: 150 }, children: [] }));

  children.push(new Paragraph({
    spacing: { before: 100, after: 100 },
    children: [new TextRun({ text: '2.1 ESTRUTURA METÁLICA', bold: true, size: 22, font: 'Arial', color: COLORS.text })]
  }));

  children.push(new Paragraph({
    spacing: { after: 150 },
    children: [new TextRun({ text: 'Estrutura metálica conforme detalhamento técnico fornecido.', size: 20, font: 'Arial', color: COLORS.text })]
  }));

  children.push(new Paragraph({
    spacing: { before: 100, after: 100 },
    children: [new TextRun({ text: '2.2 AÇO', bold: true, size: 22, font: 'Arial', color: COLORS.text })]
  }));

  children.push(new Paragraph({
    spacing: { after: 150 },
    children: [new TextRun({ text: 'Aço estrutural ASTM A36 conforme especificação técnica.', size: 20, font: 'Arial', color: COLORS.text })]
  }));

  children.push(new Paragraph({
    spacing: { before: 100, after: 100 },
    children: [new TextRun({ text: '2.3 PINTURA', bold: true, size: 22, font: 'Arial', color: COLORS.text })]
  }));

  children.push(new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({ text: 'Pintura conforme especificação e projeto executivo.', size: 20, font: 'Arial', color: COLORS.text })]
  }));

  return children;
}

// PAGE 12 - NORMAS TÉCNICAS + OBRIGAÇÕES
function createNormasObrigacoesPage() {
  const children = [];

  // Normas Técnicas section
  children.push(new Paragraph({
    spacing: { before: 0, after: 150 },
    children: [new TextRun({ text: '3. NORMAS TÉCNICAS', bold: true, size: 26, font: 'Arial', color: COLORS.red })]
  }));

  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({
      text: 'As estruturas metálicas deverão ser fabricadas e montadas em conformidade com as seguintes normas técnicas brasileiras e internacionais:',
      size: 20, font: 'Arial', color: COLORS.text
    })]
  }));

  const nbrs = [
    'NBR 8800 - Projeto e execução de estruturas de aço',
    'NBR 6120 - Ações e segurança nas estruturas',
    'NBR 7190 - Projeto de estruturas de madeira',
    'NBR 14716 - Soldagem de estruturas',
    'Especificação para estruturas de aço e parafusos'
  ];

  for (const nbr of nbrs) {
    children.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [new TextRun({ text: `• ${nbr}`, size: 20, font: 'Arial', color: COLORS.text })]
    }));
  }

  // Obrigações da Montex section
  children.push(new Paragraph({
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text: '5. OBRIGAÇÕES DA MONTEX', bold: true, size: 26, font: 'Arial', color: COLORS.red })]
  }));

  const obrigacoesMontex = [
    'DETALHAMENTO DE TODA A ESTRUTURA METÁLICA',
    'FORNECIMENTO DE TODO O MATERIAL NECESSÁRIOS PARA A FABRICAÇÃO',
    'FABRICAÇÃO DAS ESTRUTURAS',
    'FORNECIMENTO DOS CHUMBADORES',
    'TRATAMENTO DE TODA A ESTRUTURA METÁLICA CONFORME ESPECIFICADO',
    'TRANSPORTE DE TODO O NOSSO FORNECIMENTO ATÉ O LOCAL DA OBRA',
    'MONTAGEM DE TODO O NOSSO FORNECIMENTO',
    'FORNECIMENTO DE TODO EQUIPAMENTO NECESSARIO, COMO MUNCK, GUINDASTE PLATAFORMAS ETC',
    'TRANSPORTE, ALIMENTAÇÃO E ESTADIA DA EQUIPE DE MONTAGEM',
    'ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA (ART) DOS SERVIÇOS EXECUTADOS',
    'GARANTIA DA OBRA CONFORME LEGISLAÇÃO EM VIGOR (CÓDIGO CIVIL - ARTIGO 1245)'
  ];

  for (const obr of obrigacoesMontex) {
    children.push(new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [new TextRun({ text: `· ${obr}`, size: 20, font: 'Arial', color: COLORS.text })]
    }));
  }

  // Obrigações do Cliente section
  children.push(new Paragraph({
    spacing: { before: 250, after: 150 },
    children: [new TextRun({ text: '6. OBRIGAÇÕES DO CLIENTE', bold: true, size: 26, font: 'Arial', color: COLORS.red })]
  }));

  const obrigacoesCliente = [
    'CÁLCULO E EXECUÇÃO DE TODOS OS SERVIÇOS EM ALVENARIA E CONCRETO',
    'LOCAÇÃO E INSTALAÇÃO DOS CHUMBADORES E INSERTS METÁLICOS',
    'FORNECER ENERGIA ELÉTRICA NECESSÁRIA AOS SERVIÇOS',
    'FORNECER LOCAL SEGURO PARA GUARDA DE NOSSOS EQUIPAMENTOS E FORNECIMENTOS',
    'FORNECIMENTO E EXECUÇÃO DE QUALQUER TIPO DE ESQUADRIAS METÁLICAS',
    'FORNECER LOCAL LIMPO E DESIMPEDIDO PARA EXECUÇÃO DOS SERVIÇOS',
    'FORNECIMENTO PARA A EQUIPE DE MONTAGEM DE ÁGUA POTÁVEL, VESTIÁRIO/BANHEIRO COM CHUVEIRO E REFEITÓRIO',
    'FORNECIMENTO E EXECUÇÃO DO GROUTEAMENTO APÓS O NIVELAMENTO DA ESTRUTURA METÁLICA'
  ];

  for (const obr of obrigacoesCliente) {
    children.push(new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [new TextRun({ text: `· ${obr}`, size: 20, font: 'Arial', color: COLORS.text })]
    }));
  }

  return children;
}

// PAGE 13 - JORNADA + SEGURANÇA + PRAZO + PAGAMENTO
function createCondicionaisPage(data) {
  const children = [];

  // Jornada
  children.push(new Paragraph({
    spacing: { before: 0, after: 100 },
    children: [new TextRun({ text: '7. JORNADA DE TRABALHO', bold: true, size: 26, font: 'Arial', color: COLORS.red })]
  }));

  children.push(new Paragraph({
    spacing: { after: 250 },
    children: [new TextRun({
      text: 'Jornada de trabalho: 44 horas semanais, de segunda a sexta-feira, conforme legislação trabalhista vigente.',
      size: 20, font: 'Arial', color: COLORS.text
    })]
  }));

  // Segurança
  children.push(new Paragraph({
    spacing: { before: 100, after: 100 },
    children: [new TextRun({ text: '8. SISTEMA DE SEGURANÇA', bold: true, size: 26, font: 'Arial', color: COLORS.red })]
  }));

  children.push(new Paragraph({
    spacing: { after: 250 },
    children: [new TextRun({
      text: 'Todos os trabalhos serão executados em conformidade com as Normas Regulamentadoras de Segurança do Trabalho (NR-18), com fornecimento de EPIs e treinamento adequado.',
      size: 20, font: 'Arial', color: COLORS.text
    })]
  }));

  // Prazo
  children.push(new Paragraph({
    spacing: { before: 100, after: 100 },
    children: [new TextRun({ text: '9. PRAZO DE EXECUÇÃO', bold: true, size: 26, font: 'Arial', color: COLORS.red })]
  }));

  children.push(new Paragraph({
    spacing: { after: 250 },
    children: [new TextRun({
      text: `Prazo de execução: ${data.prazoExecucao || 30} dias a partir da mobilização da equipe em canteiro.`,
      size: 20, font: 'Arial', color: COLORS.text
    })]
  }));

  // Pagamento
  children.push(new Paragraph({
    spacing: { before: 100, after: 100 },
    children: [new TextRun({ text: '10. CONDIÇÕES DE PAGAMENTO', bold: true, size: 26, font: 'Arial', color: COLORS.red })]
  }));

  children.push(new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({
      text: data.condicoesPagamento || 'Conforme análise de crédito e contrato comercial.',
      size: 20, font: 'Arial', color: COLORS.text
    })]
  }));

  return children;
}

// PAGE 14 - CÁLCULOS + VALOR TOTAL
function createCalculosPage(data) {
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 0, after: 200 },
    children: [new TextRun({ text: 'RESUMO DO ORÇAMENTO', bold: true, size: 28, font: 'Arial', color: COLORS.red })]
  }));

  // Budget table
  const tableRows = [];
  tableRows.push(new TableRow({
    children: [
      createCell('QUANTIDADE', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 1400 }),
      createCell('UNIDADE', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 1200 }),
      createCell('DESCRIÇÃO SERVIÇO', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 3500 }),
      createCell('VALOR UNITÁRIO', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 1900 }),
      createCell('VALOR TOTAL', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 1900 }),
    ]
  }));

  let totalValue = 0;
  if (data.setores && Array.isArray(data.setores)) {
    for (const setor of data.setores) {
      if (setor.itens && Array.isArray(setor.itens)) {
        for (const item of setor.itens) {
          const quantidade = parseFloat(item.quantidade) || 0;
          const valorUnitario = parseFloat(item.valorUnitario) || 0;
          const valorTotal = quantidade * valorUnitario;
          totalValue += valorTotal;

          tableRows.push(new TableRow({
            children: [
              createCell(formatNumberBR(quantidade), { fontSize: 18, alignment: AlignmentType.CENTER, width: 1400 }),
              createCell(item.unidade || '', { fontSize: 18, alignment: AlignmentType.CENTER, width: 1200 }),
              createCell(item.descricao || '', { fontSize: 18, alignment: AlignmentType.LEFT, width: 3500 }),
              createCell(formatCurrencyBR(valorUnitario), { fontSize: 18, alignment: AlignmentType.RIGHT, width: 1900 }),
              createCell(formatCurrencyBR(valorTotal), { fontSize: 18, alignment: AlignmentType.RIGHT, width: 1900 }),
            ]
          }));
        }
      }
    }
  }

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  }));

  // Total value
  children.push(new Paragraph({ spacing: { before: 400, after: 200 }, children: [] }));

  children.push(new Paragraph({
    spacing: { before: 100, after: 100 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: 'VALOR TOTAL DA OBRA',
      bold: true, size: 28, font: 'Arial', color: COLORS.red
    })]
  }));

  children.push(new Paragraph({
    spacing: { before: 150, after: 0 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: formatCurrencyBR(totalValue),
      bold: true, size: 60, font: 'Arial', color: COLORS.red
    })]
  }));

  return children;
}

// PAGE 15 - ANÁLISE DO INVESTIMENTO
function createAnaliseInvestimentoPage() {
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 0, after: 150 },
    children: [new TextRun({ text: '11. ANÁLISE DO INVESTIMENTO', bold: true, size: 28, font: 'Arial', color: COLORS.red })]
  }));

  children.push(new Paragraph({
    spacing: { after: 150 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({
      text: 'O investimento em estruturas metálicas modernas representa uma solução eficiente em custo-benefício. A Grupo Montex oferece soluções otimizadas que reduzem prazos de execução e maximizam a qualidade técnica.',
      size: 20, font: 'Arial', color: COLORS.text
    })]
  }));

  children.push(new Paragraph({
    spacing: { after: 150 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({
      text: 'Nossa expertise em fabricação e montagem garante estruturas de alta durabilidade, reduzindo custos de manutenção no longo prazo. Comparado a soluções tradicionais, oferecemos uma economia significativa sem comprometer a segurança.',
      size: 20, font: 'Arial', color: COLORS.text
    })]
  }));

  // Comparison table
  const comparisonRows = [
    new TableRow({
      children: [
        createCell('ASPECTO', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 3000 }),
        createCell('MÉTODO TRADICIONAL', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 3000 }),
        createCell('ESTRUTURA METÁLICA', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 3000 }),
      ]
    }),
    new TableRow({
      children: [
        createCell('Prazo de Execução', { fontSize: 18, alignment: AlignmentType.CENTER, width: 3000 }),
        createCell('60-90 dias', { fontSize: 18, alignment: AlignmentType.CENTER, width: 3000 }),
        createCell('30-45 dias', { fontSize: 18, alignment: AlignmentType.CENTER, width: 3000 }),
      ]
    }),
    new TableRow({
      children: [
        createCell('Precisão Dimensional', { fontSize: 18, alignment: AlignmentType.CENTER, width: 3000 }),
        createCell('Baixa a Média', { fontSize: 18, alignment: AlignmentType.CENTER, width: 3000 }),
        createCell('Muito Alta', { fontSize: 18, alignment: AlignmentType.CENTER, width: 3000 }),
      ]
    }),
    new TableRow({
      children: [
        createCell('Flexibilidade de Projeto', { fontSize: 18, alignment: AlignmentType.CENTER, width: 3000 }),
        createCell('Limitada', { fontSize: 18, alignment: AlignmentType.CENTER, width: 3000 }),
        createCell('Alta', { fontSize: 18, alignment: AlignmentType.CENTER, width: 3000 }),
      ]
    }),
  ];

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: comparisonRows
  }));

  children.push(new Paragraph({ spacing: { before: 200, after: 150 }, children: [] }));

  children.push(new Paragraph({
    spacing: { after: 0 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({
      text: 'Estimativa de economia: 15-25% em relação aos métodos tradicionais, com superior qualidade técnica e garantia estrutural.',
      size: 20, font: 'Arial', color: COLORS.text, bold: true
    })]
  }));

  return children;
}

// PAGE 16 - CRONOGRAMA
function createCronogramaPage() {
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 0, after: 200 },
    children: [new TextRun({ text: '12. CRONOGRAMA', bold: true, size: 28, font: 'Arial', color: COLORS.red })]
  }));

  // Timeline table
  const cronRows = [
    new TableRow({
      children: [
        createCell('FASE', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 3000 }),
        createCell('DESCRIÇÃO', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 3500 }),
        createCell('DURAÇÃO (dias)', { bold: true, fontSize: 20, alignment: AlignmentType.CENTER, shading: COLORS.lightGray, width: 2500 }),
      ]
    }),
    new TableRow({
      children: [
        createCell('1', { fontSize: 18, alignment: AlignmentType.CENTER, width: 3000 }),
        createCell('Detalhamento Técnico e Preparação', { fontSize: 18, alignment: AlignmentType.LEFT, width: 3500 }),
        createCell('5', { fontSize: 18, alignment: AlignmentType.CENTER, width: 2500 }),
      ]
    }),
    new TableRow({
      children: [
        createCell('2', { fontSize: 18, alignment: AlignmentType.CENTER, width: 3000 }),
        createCell('Fabricação da Estrutura', { fontSize: 18, alignment: AlignmentType.LEFT, width: 3500 }),
        createCell('15', { fontSize: 18, alignment: AlignmentType.CENTER, width: 2500 }),
      ]
    }),
    new TableRow({
      children: [
        createCell('3', { fontSize: 18, alignment: AlignmentType.CENTER, width: 3000 }),
        createCell('Transporte e Mobilização', { fontSize: 18, alignment: AlignmentType.LEFT, width: 3500 }),
        createCell('3', { fontSize: 18, alignment: AlignmentType.CENTER, width: 2500 }),
      ]
    }),
    new TableRow({
      children: [
        createCell('4', { fontSize: 18, alignment: AlignmentType.CENTER, width: 3000 }),
        createCell('Montagem e Execução', { fontSize: 18, alignment: AlignmentType.LEFT, width: 3500 }),
        createCell('10', { fontSize: 18, alignment: AlignmentType.CENTER, width: 2500 }),
      ]
    }),
    new TableRow({
      children: [
        createCell('5', { fontSize: 18, alignment: AlignmentType.CENTER, width: 3000 }),
        createCell('Inspeção e Entrega', { fontSize: 18, alignment: AlignmentType.LEFT, width: 3500 }),
        createCell('2', { fontSize: 18, alignment: AlignmentType.CENTER, width: 2500 }),
      ]
    }),
  ];

  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: cronRows
  }));

  children.push(new Paragraph({ spacing: { before: 250, after: 150 }, children: [] }));

  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({
      text: 'RESUMO DO CRONOGRAMA',
      bold: true, size: 24, font: 'Arial', color: COLORS.text
    })]
  }));

  children.push(new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({
      text: '• Prazo Total de Execução: 35 dias corridos',
      size: 20, font: 'Arial', color: COLORS.text
    })]
  }));

  children.push(new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({
      text: '• Data de Início: Conforme mobilização da equipe',
      size: 20, font: 'Arial', color: COLORS.text
    })]
  }));

  children.push(new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({
      text: '• Data de Término: Conforme cronograma pós-assinatura de contrato',
      size: 20, font: 'Arial', color: COLORS.text
    })]
  }));

  return children;
}

// PAGE 17 - POR QUE ESCOLHER
function createPorQueEscolherPage() {
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 0, after: 250 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: 'POR QUE ESCOLHER GRUPO MONTEX?',
      bold: true, size: 36, font: 'Arial', color: COLORS.red
    })]
  }));

  const diferenciais = [
    {
      titulo: '1. Experiência Comprovada',
      desc: 'Mais de 10 anos de mercado com portfólio diversificado em projetos de alto padrão.'
    },
    {
      titulo: '2. Equipe Qualificada',
      desc: 'Profissionais treinados e certificados em fabricação e montagem de estruturas metálicas.'
    },
    {
      titulo: '3. Tecnologia de Ponta',
      desc: 'Equipamentos modernos para precisão dimensional e qualidade superior.'
    },
    {
      titulo: '4. Cumprimento de Prazos',
      desc: 'Processos otimizados que garantem entregas dentro do cronograma acordado.'
    },
    {
      titulo: '5. Garantia Estrutural',
      desc: 'Conformidade com normas brasileiras e garantia conforme legislação vigente.'
    },
    {
      titulo: '6. Suporte Técnico',
      desc: 'Acompanhamento durante toda a execução e pós-obra conforme solicitação.'
    }
  ];

  for (const diff of diferenciais) {
    children.push(new Paragraph({
      spacing: { before: 150, after: 80 },
      children: [new TextRun({
        text: diff.titulo,
        bold: true, size: 22, font: 'Arial', color: COLORS.red
      })]
    }));

    children.push(new Paragraph({
      spacing: { after: 100 },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({
        text: diff.desc,
        size: 20, font: 'Arial', color: COLORS.text
      })]
    }));
  }

  children.push(new Paragraph({ spacing: { before: 300, after: 150 }, children: [] }));

  // Investment summary box
  children.push(new Paragraph({
    spacing: { before: 150, after: 150 },
    alignment: AlignmentType.CENTER,
    border: {
      top: { style: BorderStyle.SINGLE, size: 6, color: COLORS.red, space: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.red, space: 1 },
      left: { style: BorderStyle.SINGLE, size: 6, color: COLORS.red, space: 1 },
      right: { style: BorderStyle.SINGLE, size: 6, color: COLORS.red, space: 1 },
    },
    children: [new TextRun({
      text: 'Seu investimento em estruturas metálicas com Grupo Montex é seguro, econômico e entregue no prazo.',
      bold: true, size: 22, font: 'Arial', color: COLORS.red
    })]
  }));

  return children;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export async function generatePropostaDOCX(data) {
  // Fetch all images
  const basePath = '/images/proposta';
  const images = {};

  // Image URLs to fetch
  const imageUrls = {
    capaBg: `${basePath}/capa-bg.jpg`,
    logo: `${basePath}/logo-montex.png`,
    logoOutline: `${basePath}/logo-m-outline.png`,
    badge: `${basePath}/montex-badge.png`,
    portfolioSuperluna: `${basePath}/super-luna-thumb.jpeg`,
    portfolioPortaria: `${basePath}/portaria-chale-thumb.jpeg`,
    portfolioAbc: `${basePath}/abc-passos-thumb.jpeg`,
    portfolioGraneleiro: `${basePath}/graneleiro-goias-thumb.jpeg`,
    portfolioMyMall: `${basePath}/my-mall-thumb.jpeg`,
    workerWelding: `${basePath}/worker-welding-thumb.jpeg`,
    workerOnSite: `${basePath}/worker-on-site-main.jpeg`,
  };

  for (const [key, url] of Object.entries(imageUrls)) {
    images[key] = await fetchImage(url);
  }

  // Build document sections
  const sections = [];

  // Page 1 - Cover
  sections.push({
    children: createCoverPage(data, images),
    pageBreakBefore: false,
  });

  // Page 2 - Sobre
  sections.push({
    children: createSobrePage(),
    pageBreakBefore: true,
  });

  // Page 3 - Visão
  sections.push({
    children: createVisaoPage(),
    pageBreakBefore: true,
  });

  // Page 4 - Portfolio Super Luna
  sections.push({
    children: createPortfolioSuperLunaPage(),
    pageBreakBefore: true,
  });

  // Page 5 - Portfolio Portaria
  sections.push({
    children: createPortfolioPortariaPage(),
    pageBreakBefore: true,
  });

  // Page 6 - Portfolio ABC
  sections.push({
    children: createPortfolioAbcPage(),
    pageBreakBefore: true,
  });

  // Page 7 - Portfolio Graneleiro
  sections.push({
    children: createPortfolioGraneleiroPage(),
    pageBreakBefore: true,
  });

  // Page 8 - Portfolio My Mall
  sections.push({
    children: createPortfolioMyMallPage(),
    pageBreakBefore: true,
  });

  // Page 9 - Contact
  sections.push({
    children: createContactPage(),
    pageBreakBefore: true,
  });

  // Page 10 - Index
  sections.push({
    children: createIndexPage(data),
    pageBreakBefore: true,
  });

  // Page 11 - Carta + Proposta
  sections.push({
    children: createCartaPropostaPage(data),
    pageBreakBefore: true,
  });

  // Page 12 - Normas + Obrigações
  sections.push({
    children: createNormasObrigacoesPage(),
    pageBreakBefore: true,
  });

  // Page 13 - Jornada + Segurança + Prazo + Pagamento
  sections.push({
    children: createCondicionaisPage(data),
    pageBreakBefore: true,
  });

  // Page 14 - Cálculos + Valor Total
  sections.push({
    children: createCalculosPage(data),
    pageBreakBefore: true,
  });

  // Page 15 - Análise do Investimento
  sections.push({
    children: createAnaliseInvestimentoPage(),
    pageBreakBefore: true,
  });

  // Page 16 - Cronograma
  sections.push({
    children: createCronogramaPage(),
    pageBreakBefore: true,
  });

  // Page 17 - Por Que Escolher
  sections.push({
    children: createPorQueEscolherPage(),
    pageBreakBefore: true,
  });

  // Flatten all children
  const allChildren = [];
  for (let i = 0; i < sections.length; i++) {
    if (i > 0) {
      allChildren.push(new PageBreak());
    }
    allChildren.push(...sections[i].children);
  }

  // Create document
  const doc = new Document({
    sections: [{
      margins: MARGINS,
      children: allChildren,
    }]
  });

  // Export to BLOB
  const blob = await Packer.toBlob(doc);
  return blob;
}
