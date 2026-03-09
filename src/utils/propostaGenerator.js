import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, ImageRun, LevelFormat, TabStopType,
  TabStopPosition } from 'docx';

// Brand colors matching PROPOSTA modelo
const COLORS = {
  primary: '1a7a6d',    // Teal/green
  primaryLight: 'e8f5f2',
  secondary: 'c8a951',  // Gold
  dark: '1a1a2e',       // Dark navy
  text: '333333',
  lightGray: 'f5f5f5',
  mediumGray: 'cccccc',
  white: 'ffffff',
  headerBg: '1a7a6d',
  tableBorder: 'b0b0b0',
};

// A4 page dimensions in DXA
const A4 = { width: 11906, height: 16838 };
const MARGINS = { top: 1440, right: 1134, bottom: 1440, left: 1134 };
const CONTENT_WIDTH = A4.width - MARGINS.left - MARGINS.right; // ~9638

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

// ============================================================================
// SECTION GENERATORS
// ============================================================================

// --- CAPA (Cover Page) ---
function createCoverPage(data, images) {
  const children = [];

  // Cover background image (full page)
  if (images.capaBg) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [new ImageRun({
        type: 'jpg',
        data: images.capaBg,
        transformation: { width: 595, height: 842 }, // A4 proportions
        altText: { title: 'Capa', description: 'Fundo da capa', name: 'capa-bg' },
      })]
    }));
  }

  // Logo
  if (images.logo) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 100 },
      children: [new ImageRun({
        type: 'png',
        data: images.logo,
        transformation: { width: 100, height: 130 },
        altText: { title: 'Logo', description: 'Logo Grupo Montex', name: 'logo' },
      })]
    }));
  }

  // GRUPO MONTEX title
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 60 },
    children: [new TextRun({ text: 'GRUPO MONTEX', bold: true, size: 56, font: 'Arial', color: COLORS.primary })]
  }));

  // Separator line
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.secondary, space: 1 } },
    children: []
  }));

  // SOLUÇÕES MODULARES
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 400 },
    children: [new TextRun({ text: 'SOLUÇÕES MODULARES', bold: true, size: 28, font: 'Arial', color: COLORS.secondary })]
  }));

  // Proposta Comercial title
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: 'Proposta Comercial', bold: true, size: 44, font: 'Arial', color: COLORS.dark })]
  }));

  // Project name
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({
      text: (data.project?.nome || 'PROJETO').toUpperCase(),
      bold: true, size: 36, font: 'Arial', color: COLORS.primary
    })]
  }));

  // Client name
  if (data.project?.cliente) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 600 },
      children: [new TextRun({ text: data.project.cliente, size: 28, font: 'Arial', color: COLORS.text })]
    }));
  }

  // Date
  const now = new Date();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 0 },
    children: [new TextRun({
      text: `${months[now.getMonth()]} / ${now.getFullYear()}`,
      size: 24, font: 'Arial', color: COLORS.text
    })]
  }));

  return children;
}

// --- SOBRE O GRUPO MONTEX ---
function createSobrePage(images) {
  const children = [];

  // Background image
  if (images.sobreBg) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [new ImageRun({
        type: 'jpg',
        data: images.sobreBg,
        transformation: { width: 595, height: 365 },
        altText: { title: 'Sobre BG', description: 'Background seção sobre', name: 'sobre-bg' },
      })]
    }));
  }

  children.push(new Paragraph({
    spacing: { before: 300, after: 200 },
    children: [new TextRun({ text: 'Sobre ', bold: true, size: 32, font: 'Arial', color: COLORS.dark }),
      new TextRun({ text: 'Grupo Montex', bold: true, italics: true, size: 32, font: 'Arial', color: COLORS.primary })]
  }));

  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({
      text: 'Com mais de 10 anos o Grupo Montex se posiciona entre as principais empresas de soluções modulares, estruturas metálicas, esquadrias de alumínio, ACM, construção a seco, localizada em São Joaquim de Bicas, às margens da BR381, facilitando a logística de transporte. Com o intuito de oferecer os melhores produtos, investimos em alta tecnologia e soluções inovadoras para melhor atender nossos stakeholders, nossos projetos atendem especificamente cada modelo se adequando às necessidades de acordo com a demanda de valor para cada cliente.',
      size: 22, font: 'Arial', color: COLORS.text
    })]
  }));

  children.push(new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: 'Missão ', bold: true, size: 28, font: 'Arial', color: COLORS.dark }),
      new TextRun({ text: 'Grupo Montex', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
  }));

  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({
      text: 'O Grupo Montex preza honestidade, transparência e sustentabilidade em seus negócios e visa sempre estar alinhado aos valores e boas práticas comerciais do nosso mercado. Nossos projetos e serviços visam levar à nossa sociedade o que há de melhor em soluções modulares, estruturas metálicas e esquadrias de alumínio, transformando a vida de nossos colaboradores e de nossos clientes com o máximo de sucesso sustentável possível.',
      size: 22, font: 'Arial', color: COLORS.text
    })]
  }));

  children.push(new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: 'Visão ', bold: true, size: 28, font: 'Arial', color: COLORS.dark }),
      new TextRun({ text: 'Grupo Montex', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
  }));

  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({
      text: 'Construir o futuro com parcerias inovadoras visando entregar sempre o melhor, com maior qualidade possível, agregando valor e menores custos aos nossos empreendimentos.',
      size: 22, font: 'Arial', color: COLORS.text
    })]
  }));

  return children;
}

// --- PORTFÓLIO ---
function createPortfolioPage(images) {
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 200, after: 300 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'PORTFÓLIO DE PROJETOS', bold: true, size: 36, font: 'Arial', color: COLORS.primary })]
  }));

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.secondary, space: 1 } },
    children: []
  }));

  const projects = [
    { name: 'Super Luna Betim', img: images.portfolioSuperluna, services: ['Construção Metálica', 'Telhas Isotérmicas', 'Chapas Perfilo', 'ACM Kynnar PVDF', 'Fachada Grid', 'Vidro Temperado'] },
    { name: 'ABC Passos', img: images.portfolioAbc, services: ['Construção Metálica', 'Telhas Isotérmicas', 'Chapas Perfilo', 'ACM Kynnar PVDF', 'Fachada Grid', 'Vidro Temperado'] },
    { name: 'Graneleiro Goiás', img: images.portfolioGraneleiro, services: ['Construção Metálica', 'Telhas Isotérmicas'] },
  ];

  for (const proj of projects) {
    if (proj.img) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 },
        children: [new ImageRun({
          type: 'jpg',
          data: proj.img,
          transformation: { width: 480, height: 300 },
          altText: { title: proj.name, description: `Projeto ${proj.name}`, name: proj.name },
        })]
      }));
    }

    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 60 },
      children: [new TextRun({ text: proj.name, bold: true, size: 26, font: 'Arial', color: COLORS.dark })]
    }));

    for (const svc of proj.services) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 20, after: 20 },
        children: [new TextRun({ text: svc, bold: true, italics: true, size: 20, font: 'Arial', color: COLORS.text })]
      }));
    }
  }

  return children;
}

// --- ÍNDICE ---
function createIndex(data) {
  const children = [];

  // Teal sidebar header
  children.push(new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: 'PROPOSTA TÉCNICA / COMERCIAL', bold: true, size: 28, font: 'Arial', color: COLORS.primary })]
  }));

  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: `N-${data.propostaNumber} rev00`, bold: true, italics: true, size: 22, font: 'Arial', color: COLORS.text })]
  }));

  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: (data.project?.nome || 'PROJETO').toUpperCase(), bold: true, size: 24, font: 'Arial', color: COLORS.dark })]
  }));

  const now = new Date();
  const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  children.push(new Paragraph({
    spacing: { after: 400 },
    children: [new TextRun({ text: `${months[now.getMonth()]} / ${now.getFullYear()}`, bold: true, size: 22, font: 'Arial', color: COLORS.text })]
  }));

  // ÍNDICE header
  children.push(new Paragraph({
    spacing: { before: 200, after: 200 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'ÍNDICE', bold: true, size: 32, font: 'Arial', color: COLORS.primary })]
  }));

  const items = [
    'CARTA DE APRESENTAÇÃO', 'OBJETO DA PROPOSTA', 'NORMAS TÉCNICAS',
    'DOCUMENTOS RECEBIDOS', 'OBRIGAÇÕES DA MONTEX', 'OBRIGAÇÕES DO CLIENTE',
    'JORNADA DE TRABALHO', 'SISTEMA DE SEGURANÇA', 'PRAZO DE EXECUÇÃO DOS SERVIÇOS',
    'CONDIÇÕES DE PAGAMENTO', 'CÁLCULOS/ESTIMATIVAS', 'VALOR TOTAL DA OBRA',
    'ANÁLISE DO INVESTIMENTO', 'CRONOGRAMA DETALHADO', 'POR QUE ESCOLHER O GRUPO MONTEX?'
  ];

  items.forEach((item, i) => {
    children.push(new Paragraph({
      spacing: { before: 60, after: 60 },
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      children: [
        new TextRun({ text: `${i + 1}. `, bold: true, size: 22, font: 'Arial', color: COLORS.primary }),
        new TextRun({ text: item, bold: true, italics: true, size: 22, font: 'Arial', color: COLORS.dark }),
      ]
    }));
  });

  return children;
}

// --- CARTA DE APRESENTAÇÃO ---
function createCartaApresentacao(data) {
  const now = new Date();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return [
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: '1. CARTA DE APRESENTAÇÃO', bold: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({
        text: `SÃO JOAQUIM DE BICAS, ${now.getDate()} DE ${months[now.getMonth()].toUpperCase()} DE ${now.getFullYear()}`,
        bold: true, size: 22, font: 'Arial', color: COLORS.text
      })]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({
        text: `PROPOSTA COMERCIAL N-${data.propostaNumber}`,
        bold: true, size: 22, font: 'Arial', color: COLORS.text
      })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({
        text: `Prezados Senhores, é com grande satisfação que apresentamos nossa proposta comercial para o projeto ${data.project?.nome || ''}. O Grupo Montex coloca à disposição toda sua experiência e capacidade técnica para a execução dos serviços descritos nesta proposta.`,
        size: 22, font: 'Arial', color: COLORS.text
      })]
    }),
  ];
}

// --- OBJETO DA PROPOSTA (Dynamic Items Table) ---
function createObjetoProposta(data) {
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: '2. OBJETO DA PROPOSTA', bold: true, size: 28, font: 'Arial', color: COLORS.primary })]
  }));

  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({
      text: 'PREÇOS ABAIXO INCLUEM MATERIAL, FABRICAÇÃO, PINTURA, TRANSPORTE E MONTAGEM.',
      bold: true, size: 20, font: 'Arial', color: COLORS.text
    })]
  }));

  // Items table header
  const colWidths = [1200, 900, 4138, 1700, 1700]; // sum = 9638
  const headerRow = new TableRow({
    children: [
      createCell('QTDE', { bold: true, fontSize: 18, alignment: AlignmentType.CENTER, shading: COLORS.primary, color: 'ffffff', width: colWidths[0] }),
      createCell('UN', { bold: true, fontSize: 18, alignment: AlignmentType.CENTER, shading: COLORS.primary, color: 'ffffff', width: colWidths[1] }),
      createCell('DESCRIÇÃO DO SERVIÇO', { bold: true, fontSize: 18, alignment: AlignmentType.CENTER, shading: COLORS.primary, color: 'ffffff', width: colWidths[2] }),
      createCell('VALOR UNIT.', { bold: true, fontSize: 18, alignment: AlignmentType.CENTER, shading: COLORS.primary, color: 'ffffff', width: colWidths[3] }),
      createCell('VALOR TOTAL', { bold: true, fontSize: 18, alignment: AlignmentType.CENTER, shading: COLORS.primary, color: 'ffffff', width: colWidths[4] }),
    ]
  });

  const rows = [headerRow];
  let grandTotal = 0;

  // Add items from each setor
  const setores = data.setores || [];
  for (const setor of setores) {
    // Setor header row
    rows.push(new TableRow({
      children: [
        createCell(setor.nome?.toUpperCase() || 'SETOR', { bold: true, fontSize: 18, shading: COLORS.primaryLight, color: COLORS.primary, colspan: 5, width: CONTENT_WIDTH }),
      ]
    }));

    const itens = setor.itens || [];
    for (const item of itens) {
      const qty = item.quantidade || 0;
      const unitPrice = item.precoUnitario || 0;
      const total = item.precoTotal || (qty * unitPrice);
      grandTotal += total;

      rows.push(new TableRow({
        children: [
          createCell(formatNumberBR(qty), { fontSize: 18, alignment: AlignmentType.CENTER, width: colWidths[0] }),
          createCell(item.unidade || 'UN', { fontSize: 18, alignment: AlignmentType.CENTER, width: colWidths[1] }),
          createCell(item.descricao || item.nome || '', { fontSize: 18, width: colWidths[2] }),
          createCell(formatCurrencyBR(unitPrice), { fontSize: 18, alignment: AlignmentType.RIGHT, width: colWidths[3] }),
          createCell(formatCurrencyBR(total), { fontSize: 18, alignment: AlignmentType.RIGHT, width: colWidths[4] }),
        ]
      }));
    }
  }

  // BDI / Margem row if calculations include it
  if (data.calculations?.margemValor) {
    rows.push(new TableRow({
      children: [
        createCell('BDI / MARGEM DE LUCRO', { bold: true, fontSize: 18, shading: COLORS.lightGray, colspan: 4, width: colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] }),
        createCell(formatCurrencyBR(data.calculations.margemValor), { bold: true, fontSize: 18, alignment: AlignmentType.RIGHT, shading: COLORS.lightGray, width: colWidths[4] }),
      ]
    }));
    grandTotal += data.calculations.margemValor;
  }

  // Grand total row
  const displayTotal = data.calculations?.valorTotal || grandTotal;
  rows.push(new TableRow({
    children: [
      createCell('VALOR TOTAL DA OBRA', { bold: true, fontSize: 20, shading: COLORS.secondary, color: 'ffffff', colspan: 4, alignment: AlignmentType.RIGHT, width: colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] }),
      createCell(formatCurrencyBR(displayTotal), { bold: true, fontSize: 20, alignment: AlignmentType.RIGHT, shading: COLORS.secondary, color: 'ffffff', width: colWidths[4] }),
    ]
  }));

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows,
  }));

  return children;
}

// --- ESTRUTURA TÉCNICA ---
function createEstruturaTecnica() {
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 300, after: 100 },
    children: [new TextRun({ text: '2.1 - ESTRUTURA METÁLICA:', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
  }));
  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: 'ESTRUTURA METÁLICA CONFECCIONADA COM TESOURAS, TERÇAS E COLUNAS EM PERFIL U DOBRADO', size: 20, font: 'Arial', color: COLORS.text })]
  }));

  children.push(new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: '2.2 - AÇO:', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
  }));
  children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'CHAPAS: ASTM A 36', size: 20, font: 'Arial', color: COLORS.text })] }));
  children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'PERFIS "U" CIVIL 300', size: 20, font: 'Arial', color: COLORS.text })] }));

  children.push(new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: '2.3 - PINTURA:', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
  }));
  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: '2.3.1 - TRATAMENTO SUPERFICIAL:', bold: true, size: 20, font: 'Arial', color: COLORS.text })]
  }));
  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text: 'JATEAMENTO DS 2,5 + 2 DEMÃOS DE 60 MICRAS', size: 20, font: 'Arial', color: COLORS.text })]
  }));

  return children;
}

// --- NORMAS TÉCNICAS ---
function createNormasTecnicas() {
  const children = [];
  children.push(new Paragraph({
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: '3. NORMAS TÉCNICAS', bold: true, size: 28, font: 'Arial', color: COLORS.primary })]
  }));

  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: '3.1 - CARGAS E CÁLCULOS:', bold: true, size: 22, font: 'Arial', color: COLORS.dark })]
  }));

  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({
      text: 'Cálculo estrutural e detalhamentos feitos por profissionais capacitados, usando programas de última geração o que permite a modelagem em 3D e uma compatibilização perfeita com as outras estruturas evitando retrabalho.',
      size: 20, font: 'Arial', color: COLORS.text
    })]
  }));

  const normas = [
    'NBR 6.120 - Cargas para Estruturas de Edificações',
    'NBR 6.123 - Ações do Vento em Estruturas',
    'NBR 8.800 - Projeto e Execução de Aço de Edifícios',
    'Manual do AISC/1993 - Para Execução de Estruturas de Aço de Edifícios',
    'Manual do AISI/1991 - Perfis de Chapa Dobrados a Frio',
    'Especificação do AISE N.º 13 - Edifícios Industriais',
  ];

  for (const norma of normas) {
    children.push(new Paragraph({
      spacing: { before: 30, after: 30 },
      indent: { left: 360 },
      children: [new TextRun({ text: `• ${norma}`, size: 20, font: 'Arial', color: COLORS.text })]
    }));
  }

  children.push(new Paragraph({
    spacing: { before: 200, after: 60 },
    children: [new TextRun({ text: '3.2 - SOLDAS:', bold: true, size: 22, font: 'Arial', color: COLORS.dark })]
  }));
  children.push(new Paragraph({
    spacing: { after: 60 },
    indent: { left: 360 },
    children: [new TextRun({ text: 'Soldadores qualificados de acordo com norma AWS D1-1.', size: 20, font: 'Arial', color: COLORS.text })]
  }));

  children.push(new Paragraph({
    spacing: { before: 200, after: 60 },
    children: [new TextRun({ text: '3.3 - PARAFUSOS:', bold: true, size: 22, font: 'Arial', color: COLORS.dark })]
  }));
  children.push(new Paragraph({
    spacing: { after: 200 },
    indent: { left: 360 },
    children: [new TextRun({ text: 'De acordo com norma ASTM A-307 / A-325.', size: 20, font: 'Arial', color: COLORS.text })]
  }));

  return children;
}

// --- OBRIGAÇÕES DA MONTEX ---
function createObrigacoesMontex() {
  const items = [
    'Detalhamento de toda a estrutura metálica',
    'Fornecimento de todo o material necessário para a fabricação',
    'Fabricação das estruturas',
    'Fornecimento dos chumbadores',
    'Tratamento de toda a estrutura metálica conforme especificado no item 2.3',
    'Transporte de todo o nosso fornecimento até o local da obra',
    'Montagem de todo o nosso fornecimento',
    'Fornecimento de todo equipamento necessário, como munck, guindaste, plataformas etc.',
    'Transporte, alimentação e estadia da equipe de montagem',
    'Anotação de Responsabilidade Técnica (ART) dos serviços executados',
    'Garantia da obra conforme legislação em vigor (Código Civil - Artigo 1245)',
  ];

  const children = [
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: '5. OBRIGAÇÕES DA MONTEX', bold: true, size: 28, font: 'Arial', color: COLORS.primary })]
    })
  ];

  for (const item of items) {
    children.push(new Paragraph({
      spacing: { before: 40, after: 40 },
      indent: { left: 360 },
      children: [new TextRun({ text: `• ${item}`, size: 20, font: 'Arial', color: COLORS.text })]
    }));
  }

  return children;
}

// --- OBRIGAÇÕES DO CLIENTE ---
function createObrigacoesCliente() {
  const items = [
    'Cálculo e execução de todos os serviços em alvenaria e concreto',
    'Locação e instalação dos chumbadores e inserts metálicos',
    'Fornecer energia elétrica necessária aos serviços',
    'Fornecer local seguro para guarda de nossos equipamentos e fornecimentos',
    'Fornecimento e execução de qualquer tipo de esquadrias metálicas (serralheria em geral)',
    'Fornecer local limpo e desimpedido para execução dos serviços, com terreno nivelado e compactado',
    'Fornecimento de água potável, vestiário/banheiro com chuveiro e refeitório conforme NR-18',
    'Fornecimento e execução do grouteamento após o nivelamento da estrutura metálica',
  ];

  const children = [
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: '6. OBRIGAÇÕES DO CLIENTE', bold: true, size: 28, font: 'Arial', color: COLORS.primary })]
    })
  ];

  for (const item of items) {
    children.push(new Paragraph({
      spacing: { before: 40, after: 40 },
      indent: { left: 360 },
      children: [new TextRun({ text: `• ${item}`, size: 20, font: 'Arial', color: COLORS.text })]
    }));
  }

  return children;
}

// --- JORNADA DE TRABALHO ---
function createJornadaTrabalho() {
  return [
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: '7. JORNADA DE TRABALHO', bold: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({
        text: 'Estamos considerando jornada de trabalho de 44 horas semanais, de segunda a sexta-feira.',
        bold: true, size: 22, font: 'Arial', color: COLORS.text
      })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({
        text: 'Esta jornada foi idealizada em função do volume de serviços. Caso seja necessário, estudaremos alternativas para cumprir o prazo da obra.',
        size: 20, font: 'Arial', color: COLORS.text
      })]
    }),
  ];
}

// --- SISTEMA DE SEGURANÇA ---
function createSeguranca() {
  return [
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: '8. SISTEMA DE SEGURANÇA', bold: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: 'OBJETIVO', bold: true, size: 22, font: 'Arial', color: COLORS.dark })]
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: 'Estabelecer como meta a prevenção de acidentes considerando:', bold: true, size: 20, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({ spacing: { after: 40 }, indent: { left: 360 }, children: [new TextRun({ text: '• Avaliar previamente os riscos ambientais e operacionais de cada tarefa', size: 20, font: 'Arial', color: COLORS.text })] }),
    new Paragraph({ spacing: { after: 40 }, indent: { left: 360 }, children: [new TextRun({ text: '• Seguir normas e procedimentos de segurança (NPS) para cada atividade', size: 20, font: 'Arial', color: COLORS.text })] }),
    new Paragraph({ spacing: { after: 100 }, indent: { left: 360 }, children: [new TextRun({ text: '• Planejar e monitorar os processos de execução dos serviços', size: 20, font: 'Arial', color: COLORS.text })] }),
    new Paragraph({
      spacing: { before: 100, after: 100 },
      children: [new TextRun({
        text: 'O técnico de segurança será responsável para orientar através do DDS e também no acompanhamento das atividades desenvolvidas. A Montex fornecerá gratuitamente aos seus funcionários os EPIs necessários de acordo com a NR-6 da Portaria 3.214.',
        size: 20, font: 'Arial', color: COLORS.text
      })]
    }),
  ];
}

// --- PRAZO DE EXECUÇÃO ---
function createPrazoExecucao(data) {
  return [
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: '9. PRAZO DE EXECUÇÃO DAS ESTRUTURAS', bold: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({
        text: `${data.prazoExecucao || 150} DIAS`,
        bold: true, size: 36, font: 'Arial', color: COLORS.secondary
      })]
    }),
  ];
}

// --- CONDIÇÕES DE PAGAMENTO ---
function createCondicoesPagamento(data) {
  const cond = data.condicoesPagamento || { assinatura: 10, projeto: 5, medicoes: 85 };
  return [
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: '10. CONDIÇÕES DE PAGAMENTO', bold: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({ spacing: { after: 60 }, indent: { left: 360 }, children: [new TextRun({ text: `• ${cond.assinatura}% na assinatura do contrato`, bold: true, size: 22, font: 'Arial', color: COLORS.text })] }),
    new Paragraph({ spacing: { after: 60 }, indent: { left: 360 }, children: [new TextRun({ text: `• ${cond.projeto}% na entrega do projeto metálico`, bold: true, size: 22, font: 'Arial', color: COLORS.text })] }),
    new Paragraph({ spacing: { after: 200 }, indent: { left: 360 }, children: [new TextRun({ text: `• ${cond.medicoes}% mediante medições e conforme aceite`, bold: true, size: 22, font: 'Arial', color: COLORS.text })] }),
  ];
}

// --- VALOR TOTAL DA OBRA ---
function createValorTotal(data) {
  const total = data.calculations?.valorTotal || 0;
  return [
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: '12. VALOR TOTAL DA OBRA', bold: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      shading: { fill: COLORS.secondary, type: ShadingType.CLEAR },
      children: [new TextRun({
        text: formatCurrencyBR(total),
        bold: true, size: 40, font: 'Arial', color: 'ffffff'
      })]
    }),
  ];
}

// --- ANÁLISE DO INVESTIMENTO ---
function createAnaliseInvestimento(data) {
  const children = [];
  const total = data.calculations?.valorTotal || 0;
  const pesoTotal = data.calculations?.pesoTotal || 0;

  children.push(new Paragraph({
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: '13. ANÁLISE DO INVESTIMENTO', bold: true, size: 28, font: 'Arial', color: COLORS.primary })]
  }));

  children.push(new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: 'COMPOSIÇÃO DOS CUSTOS E COMPARATIVO DE MERCADO', bold: true, size: 22, font: 'Arial', color: COLORS.dark })]
  }));

  // Cost comparison table
  if (pesoTotal > 0) {
    const custoKg = total / pesoTotal;
    const mediaMercado = 28;
    const premiun = 35;
    const economiaMercado = (mediaMercado - custoKg) * pesoTotal;
    const economiaPremium = (premiun - custoKg) * pesoTotal;

    const colW = [4819, 4819];
    children.push(new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: colW,
      rows: [
        new TableRow({ children: [
          createCell('DETALHAMENTO DOS CUSTOS', { bold: true, shading: COLORS.primary, color: 'ffffff', colspan: 2, width: CONTENT_WIDTH }),
        ]}),
        new TableRow({ children: [
          createCell('Custo por kg (Montex)', { bold: true, width: colW[0] }),
          createCell(`R$ ${formatNumberBR(custoKg)}/kg`, { alignment: AlignmentType.RIGHT, width: colW[1] }),
        ]}),
        new TableRow({ children: [
          createCell('Média de Mercado', { bold: true, width: colW[0] }),
          createCell(`R$ ${formatNumberBR(mediaMercado)}/kg`, { alignment: AlignmentType.RIGHT, width: colW[1] }),
        ]}),
        new TableRow({ children: [
          createCell('Concorrentes Premium', { bold: true, width: colW[0] }),
          createCell(`R$ ${formatNumberBR(premiun)}/kg`, { alignment: AlignmentType.RIGHT, width: colW[1] }),
        ]}),
        new TableRow({ children: [
          createCell('ECONOMIA ESTIMADA (vs mercado)', { bold: true, shading: COLORS.primaryLight, color: COLORS.primary, width: colW[0] }),
          createCell(formatCurrencyBR(Math.max(0, economiaMercado)), { bold: true, alignment: AlignmentType.RIGHT, shading: COLORS.primaryLight, color: COLORS.primary, width: colW[1] }),
        ]}),
        new TableRow({ children: [
          createCell('ECONOMIA PREMIUM (vs premium)', { bold: true, shading: COLORS.primaryLight, color: COLORS.primary, width: colW[0] }),
          createCell(formatCurrencyBR(Math.max(0, economiaPremium)), { bold: true, alignment: AlignmentType.RIGHT, shading: COLORS.primaryLight, color: COLORS.primary, width: colW[1] }),
        ]}),
      ]
    }));
  }

  // Items breakdown table
  children.push(new Paragraph({ spacing: { before: 300, after: 100 }, children: [new TextRun({ text: 'DETALHAMENTO DOS CUSTOS:', bold: true, size: 22, font: 'Arial', color: COLORS.dark })] }));

  const itemColWidths = [3500, 1500, 800, 1919, 1919];
  const itemRows = [
    new TableRow({ children: [
      createCell('ITEM', { bold: true, shading: COLORS.primary, color: 'ffffff', width: itemColWidths[0] }),
      createCell('QTDE', { bold: true, shading: COLORS.primary, color: 'ffffff', alignment: AlignmentType.CENTER, width: itemColWidths[1] }),
      createCell('UN', { bold: true, shading: COLORS.primary, color: 'ffffff', alignment: AlignmentType.CENTER, width: itemColWidths[2] }),
      createCell('UNIT.', { bold: true, shading: COLORS.primary, color: 'ffffff', alignment: AlignmentType.CENTER, width: itemColWidths[3] }),
      createCell('TOTAL', { bold: true, shading: COLORS.primary, color: 'ffffff', alignment: AlignmentType.CENTER, width: itemColWidths[4] }),
    ]})
  ];

  let sumTotal = 0;
  for (const setor of (data.setores || [])) {
    for (const item of (setor.itens || [])) {
      const qty = item.quantidade || 0;
      const unit = item.precoUnitario || 0;
      const tot = item.precoTotal || (qty * unit);
      sumTotal += tot;
      itemRows.push(new TableRow({ children: [
        createCell(item.descricao || item.nome || '', { width: itemColWidths[0] }),
        createCell(formatNumberBR(qty), { alignment: AlignmentType.CENTER, width: itemColWidths[1] }),
        createCell(item.unidade || 'UN', { alignment: AlignmentType.CENTER, width: itemColWidths[2] }),
        createCell(formatCurrencyBR(unit), { alignment: AlignmentType.RIGHT, width: itemColWidths[3] }),
        createCell(formatCurrencyBR(tot), { alignment: AlignmentType.RIGHT, width: itemColWidths[4] }),
      ]}));
    }
  }

  itemRows.push(new TableRow({ children: [
    createCell('TOTAL DA OBRA', { bold: true, shading: COLORS.secondary, color: 'ffffff', colspan: 4, alignment: AlignmentType.RIGHT, width: itemColWidths[0] + itemColWidths[1] + itemColWidths[2] + itemColWidths[3] }),
    createCell(formatCurrencyBR(data.calculations?.valorTotal || sumTotal), { bold: true, shading: COLORS.secondary, color: 'ffffff', alignment: AlignmentType.RIGHT, width: itemColWidths[4] }),
  ]}));

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: itemColWidths,
    rows: itemRows,
  }));

  return children;
}

// --- CRONOGRAMA ---
function createCronograma(data) {
  const prazo = data.prazoExecucao || 150;
  const children = [];

  children.push(new Paragraph({
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: '14. CRONOGRAMA DETALHADO DE EXECUÇÃO', bold: true, size: 28, font: 'Arial', color: COLORS.primary })]
  }));

  children.push(new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({
      text: `PLANEJAMENTO DAS ETAPAS DO PROJETO — ${prazo} DIAS`,
      bold: true, size: 22, font: 'Arial', color: COLORS.dark
    })]
  }));

  const phases = [
    { fase: '1. Detalhamento', prazo: '30 dias', desc: 'Projeto executivo, modelagem 3D e compatibilização' },
    { fase: '2. Materiais', prazo: '30 dias', desc: 'Aquisição de chapas ASTM A36 e perfis U Civil 300' },
    { fase: '3. Fabricação', prazo: '60 dias', desc: 'Corte, solda e montagem das peças na fábrica' },
    { fase: '4. Pintura', prazo: '30 dias', desc: 'Jateamento DS 2,5 + 2 demãos de 60 micras' },
    { fase: '5. Transporte', prazo: '15 dias', desc: 'Logística via BR-381 até o canteiro de obras' },
    { fase: '6. Montagem', prazo: '55 dias', desc: 'Instalação com munck/guindaste e equipe especializada' },
  ];

  const cronColWidths = [2400, 1600, 5638];
  const cronRows = [
    new TableRow({ children: [
      createCell('FASE', { bold: true, shading: COLORS.primary, color: 'ffffff', width: cronColWidths[0] }),
      createCell('PRAZO', { bold: true, shading: COLORS.primary, color: 'ffffff', alignment: AlignmentType.CENTER, width: cronColWidths[1] }),
      createCell('DESCRIÇÃO', { bold: true, shading: COLORS.primary, color: 'ffffff', width: cronColWidths[2] }),
    ]})
  ];

  for (const phase of phases) {
    cronRows.push(new TableRow({ children: [
      createCell(phase.fase, { bold: true, width: cronColWidths[0] }),
      createCell(phase.prazo, { bold: true, alignment: AlignmentType.CENTER, width: cronColWidths[1] }),
      createCell(phase.desc, { width: cronColWidths[2] }),
    ]}));
  }

  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: cronColWidths,
    rows: cronRows,
  }));

  // Summary KPIs
  const peso = data.calculations?.pesoTotal || 0;
  const area = data.calculations?.areaTotal || 0;
  children.push(new Paragraph({ spacing: { before: 300 }, children: [] }));

  const kpiColWidths = [2409, 2410, 2409, 2410];
  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: kpiColWidths,
    rows: [new TableRow({ children: [
      createCell(`${formatNumberBR(peso)} kg\nde aço`, { bold: true, alignment: AlignmentType.CENTER, shading: COLORS.primaryLight, color: COLORS.primary, width: kpiColWidths[0] }),
      createCell(`${formatNumberBR(area)} m²\nde cobertura`, { bold: true, alignment: AlignmentType.CENTER, shading: COLORS.primaryLight, color: COLORS.primary, width: kpiColWidths[1] }),
      createCell(`${prazo} dias\nprazo total`, { bold: true, alignment: AlignmentType.CENTER, shading: COLORS.primaryLight, color: COLORS.primary, width: kpiColWidths[2] }),
      createCell(`44h/semana\njornada`, { bold: true, alignment: AlignmentType.CENTER, shading: COLORS.primaryLight, color: COLORS.primary, width: kpiColWidths[3] }),
    ]})]
  }));

  return children;
}

// --- POR QUE ESCOLHER O GRUPO MONTEX? ---
function createPorQueEscolher(data) {
  const children = [];
  const total = data.calculations?.valorTotal || 0;
  const pesoTotal = data.calculations?.pesoTotal || 0;
  const custoKg = pesoTotal > 0 ? total / pesoTotal : 24;

  children.push(new Paragraph({
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: '15. POR QUE ESCOLHER O GRUPO MONTEX?', bold: true, size: 28, font: 'Arial', color: COLORS.primary })]
  }));

  children.push(new Paragraph({
    spacing: { after: 200 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'DIFERENCIAIS COMPETITIVOS PARA O SEU PROJETO', bold: true, size: 22, font: 'Arial', color: COLORS.dark })]
  }));

  const diferenciais = [
    { title: 'PREÇO COMPETITIVO', desc: `R$${formatNumberBR(custoKg)}/kg — abaixo da média de mercado (R$28/kg). Economia significativa no valor total da obra comparado a concorrentes convencionais.` },
    { title: 'EXPERIÊNCIA COMPROVADA', desc: 'Mais de 10 anos de atuação com +50 projetos entregues em 5 estados brasileiros. Portfólio inclui supermercados, shoppings, galpões industriais e infraestrutura pública.' },
    { title: 'SOLUÇÃO TURNKEY COMPLETA', desc: 'Detalhamento, material, fabricação, pintura, transporte e montagem — tudo incluso. Fornecimento de equipamentos como munck, guindaste e plataformas.' },
    { title: 'LOGÍSTICA ESTRATÉGICA', desc: 'Sede em São Joaquim de Bicas/MG, às margens da BR-381, facilitando o transporte e reduzindo custos logísticos.' },
    { title: 'CONFORMIDADE TÉCNICA TOTAL', desc: 'Atendimento às normas NBR 6.120, 6.123, 8.800, AISC, AISI, AWS D1-1 e ASTM. Soldadores qualificados, ART e garantia conforme Código Civil Art. 1245.' },
    { title: 'EQUIPE QUALIFICADA', desc: '+200 profissionais capacitados. Técnico de segurança dedicado com DDS diário. EPIs fornecidos conforme NR-6 da Portaria 3.214.' },
  ];

  for (const dif of diferenciais) {
    const colW = [600, 9038];
    children.push(new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: colW,
      rows: [new TableRow({ children: [
        new TableCell({
          width: { size: colW[0], type: WidthType.DXA },
          shading: { fill: COLORS.primary, type: ShadingType.CLEAR },
          borders: noBorders,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '✓', bold: true, size: 24, color: 'ffffff', font: 'Arial' })] })]
        }),
        new TableCell({
          width: { size: colW[1], type: WidthType.DXA },
          shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
          borders: noBorders,
          margins: { top: 80, bottom: 80, left: 160, right: 100 },
          children: [
            new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: dif.title, bold: true, size: 22, font: 'Arial', color: COLORS.dark })] }),
            new Paragraph({ children: [new TextRun({ text: dif.desc, size: 20, font: 'Arial', color: COLORS.text })] }),
          ]
        }),
      ]})]
    }));
    children.push(new Paragraph({ spacing: { before: 80 }, children: [] }));
  }

  // Final investment box
  const cond = data.condicoesPagamento || { assinatura: 10, projeto: 5, medicoes: 85 };
  const now = new Date();
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  children.push(new Paragraph({ spacing: { before: 300 }, children: [] }));
  children.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [new TableRow({ children: [
      new TableCell({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        shading: { fill: COLORS.primary, type: ShadingType.CLEAR },
        borders: noBorders,
        margins: { top: 200, bottom: 200, left: 300, right: 300 },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER, spacing: { after: 100 },
            children: [new TextRun({ text: `INVESTIMENTO TOTAL: ${formatCurrencyBR(total)}`, bold: true, size: 28, color: 'ffffff', font: 'Arial' })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER, spacing: { after: 60 },
            children: [new TextRun({ text: `Proposta válida por 15 dias a partir de ${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()}`, size: 20, color: 'ffffff', font: 'Arial' })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `Condições: ${cond.assinatura}% assinatura | ${cond.projeto}% entrega projeto | ${cond.medicoes}% medições`, size: 20, color: 'ffffff', font: 'Arial' })]
          }),
        ]
      })
    ]})]
  }));

  // Contact info
  children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: '(31) 99582-1443', bold: true, size: 22, font: 'Arial', color: COLORS.primary })]
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [new TextRun({ text: 'guilherme.maciel.vieira@gmail.com', size: 20, font: 'Arial', color: COLORS.text })]
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: 'www.grupomontex.com.br', size: 20, font: 'Arial', color: COLORS.primary })]
  }));

  return children;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================
export async function generatePropostaDOCX(data) {
  // Fetch all images
  const [capaBg, logo, sobreBg, portfolioSuperluna, portfolioAbc, portfolioGraneleiro] = await Promise.all([
    fetchImage('/images/proposta/capa-bg.jpg'),
    fetchImage('/images/proposta/logo-montex.png'),
    fetchImage('/images/proposta/sobre-bg.jpg'),
    fetchImage('/images/proposta/portfolio-superluna.jpg'),
    fetchImage('/images/proposta/portfolio-abc.jpg'),
    fetchImage('/images/proposta/portfolio-graneleiro.jpg'),
  ]);

  const images = { capaBg, logo, sobreBg, portfolioSuperluna, portfolioAbc, portfolioGraneleiro };

  // Build all sections
  const coverChildren = createCoverPage(data, images);
  const sobreChildren = createSobrePage(images);
  const portfolioChildren = createPortfolioPage(images);
  const indexChildren = createIndex(data);
  const cartaChildren = createCartaApresentacao(data);
  const objetoChildren = createObjetoProposta(data);
  const estruturaChildren = createEstruturaTecnica();
  const normasChildren = createNormasTecnicas();
  const obrigacoesMontexChildren = createObrigacoesMontex();
  const obrigacoesClienteChildren = createObrigacoesCliente();
  const jornadaChildren = createJornadaTrabalho();
  const segurancaChildren = createSeguranca();
  const prazoChildren = createPrazoExecucao(data);
  const pagamentoChildren = createCondicoesPagamento(data);
  const valorChildren = createValorTotal(data);
  const analiseChildren = createAnaliseInvestimento(data);
  const cronogramaChildren = createCronograma(data);
  const porqueChildren = createPorQueEscolher(data);

  // Create header with logo
  const headerChildren = [];
  if (logo) {
    headerChildren.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new ImageRun({
          type: 'png', data: logo,
          transformation: { width: 40, height: 53 },
          altText: { title: 'Logo', description: 'Logo Montex', name: 'header-logo' },
        }),
        new TextRun({ text: '  GRUPO MONTEX', bold: true, size: 20, font: 'Arial', color: COLORS.primary }),
      ]
    }));
  }

  const defaultHeader = new Header({ children: headerChildren.length > 0 ? headerChildren : [new Paragraph('')] });
  const defaultFooter = new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: COLORS.primary, space: 4 } },
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        children: [
          new TextRun({ text: '(31) 99582-1443 | guilherme.maciel.vieira@gmail.com | www.grupomontex.com.br', size: 16, font: 'Arial', color: COLORS.text }),
          new TextRun({ text: '\t' }),
          new TextRun({ text: 'Página ', size: 16, font: 'Arial', color: COLORS.text }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Arial', color: COLORS.text }),
        ]
      })
    ]
  });

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
    },
    sections: [
      // Section 1: Cover (no header/footer)
      {
        properties: {
          page: {
            size: { width: A4.width, height: A4.height },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          }
        },
        children: coverChildren,
      },
      // Section 2: Sobre + Portfólio
      {
        properties: {
          page: {
            size: { width: A4.width, height: A4.height },
            margin: MARGINS,
          }
        },
        headers: { default: defaultHeader },
        footers: { default: defaultFooter },
        children: [
          ...sobreChildren,
          new Paragraph({ children: [new PageBreak()] }),
          ...portfolioChildren,
        ],
      },
      // Section 3: Índice + Carta + Objeto + Técnica + Normas
      {
        properties: {
          page: {
            size: { width: A4.width, height: A4.height },
            margin: MARGINS,
          }
        },
        headers: { default: defaultHeader },
        footers: { default: defaultFooter },
        children: [
          ...indexChildren,
          new Paragraph({ children: [new PageBreak()] }),
          ...cartaChildren,
          ...objetoChildren,
          ...estruturaChildren,
          new Paragraph({ children: [new PageBreak()] }),
          ...normasChildren,
        ],
      },
      // Section 4: Obrigações + Jornada + Segurança + Prazo + Pagamento
      {
        properties: {
          page: {
            size: { width: A4.width, height: A4.height },
            margin: MARGINS,
          }
        },
        headers: { default: defaultHeader },
        footers: { default: defaultFooter },
        children: [
          ...obrigacoesMontexChildren,
          ...obrigacoesClienteChildren,
          new Paragraph({ children: [new PageBreak()] }),
          ...jornadaChildren,
          ...segurancaChildren,
          ...prazoChildren,
          ...pagamentoChildren,
        ],
      },
      // Section 5: Valor + Análise + Cronograma + Por que Montex
      {
        properties: {
          page: {
            size: { width: A4.width, height: A4.height },
            margin: MARGINS,
          }
        },
        headers: { default: defaultHeader },
        footers: { default: defaultFooter },
        children: [
          ...valorChildren,
          ...analiseChildren,
          new Paragraph({ children: [new PageBreak()] }),
          ...cronogramaChildren,
          new Paragraph({ children: [new PageBreak()] }),
          ...porqueChildren,
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}
