import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, ImageRun, LevelFormat, TabStopType,
  TabStopPosition } from 'docx';

// Brand colors
const COLORS = {
  primary: '1a7a6d',
  primaryLight: 'e8f5f2',
  secondary: 'c8a951',
  dark: '1a1a2e',
  text: '333333',
  lightGray: 'f5f5f5',
  mediumGray: 'cccccc',
  white: 'ffffff',
};

const formatCurrencyBR = (value) => {
  return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatNumberBR = (value) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper to create styled table cells
const createCell = (text, options = {}) => {
  const { bold = false, fontSize = 20, alignment = AlignmentType.LEFT, shading, width, color = COLORS.text, colspan } = options;
  const cellOptions = {
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: shading ? { fill: shading, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.mediumGray },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.mediumGray },
      left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.mediumGray },
      right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.mediumGray },
    },
    children: [new Paragraph({
      alignment,
      children: [new TextRun({ text: String(text), bold, size: fontSize, font: 'Arial', color })]
    })]
  };
  if (colspan) cellOptions.columnSpan = colspan;
  return new TableCell(cellOptions);
};

// Fetch image as ArrayBuffer
async function fetchImage(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

// Get current date formatted
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

// ============================================================================
// SECTION GENERATORS
// ============================================================================

function createTitlePage(data) {
  return [
    new Paragraph({ spacing: { before: 4000 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'GRUPO MONTEX', bold: true, size: 56, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [new TextRun({ text: 'SOLUÇÕES MODULARES', size: 28, font: 'Arial', color: COLORS.secondary })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'Proposta Comercial', bold: true, size: 44, font: 'Arial', color: COLORS.dark })]
    }),
    new Paragraph({ spacing: { before: 2000 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'PROPOSTA TÉCNICA / COMERCIAL', bold: true, italics: true, size: 24, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `N-${data.propostaNumber || '01/26'} rev00`, bold: true, italics: true, size: 24, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: (data.project?.nome || 'PROJETO').toUpperCase(), bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: getDateBR(), bold: true, italics: true, size: 24, font: 'Arial', color: COLORS.text })]
    }),
  ];
}

function createIndex() {
  const items = [
    '1. CARTA DE APRESENTAÇÃO',
    '2. OBJETO DA PROPOSTA',
    '3. NORMAS TÉCNICAS',
    '4. DOCUMENTOS RECEBIDOS',
    '5. OBRIGAÇÕES DA MONTEX',
    '6. OBRIGAÇÕES DO CLIENTE',
    '7. JORNADA DE TRABALHO',
    '8. SISTEMA DE SEGURANÇA',
    '9. PRAZO DE EXECUÇÃO DOS SERVIÇOS',
    '10. CONDIÇÕES DE PAGAMENTO',
    '11. CÁLCULOS/ESTIMATIVAS',
    '12. VALOR TOTAL DA OBRA',
    '13. ANÁLISE DO INVESTIMENTO',
    '14. CRONOGRAMA DETALHADO DE EXECUÇÃO',
    '15. POR QUE ESCOLHER O GRUPO MONTEX?',
  ];

  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 600 },
      children: [new TextRun({ text: 'ÍNDICE', bold: true, italics: true, size: 32, font: 'Arial', color: COLORS.primary })]
    }),
    ...items.map(item => new Paragraph({
      spacing: { before: 120, after: 120 },
      indent: { left: 720 },
      children: [new TextRun({ text: item, bold: true, italics: true, size: 22, font: 'Arial', color: COLORS.text })]
    })),
  ];
}

function createCartaApresentacao(data) {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: '1. CARTA DE APRESENTAÇÃO', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 400 },
      children: [new TextRun({ text: getFullDateBR().toUpperCase(), bold: true, italics: true, size: 22, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: `PROPOSTA COMERCIAL N-${data.propostaNumber || '01/26'}`, bold: true, italics: true, size: 22, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `Prezados Senhores da `, size: 22, font: 'Arial', color: COLORS.text }),
        new TextRun({ text: data.project?.cliente || 'Cliente', bold: true, size: 22, font: 'Arial', color: COLORS.text }),
        new TextRun({ text: ',', size: 22, font: 'Arial', color: COLORS.text }),
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({
        text: `Em atendimento a vossa solicitação, vimos por meio desta apresentar nossa proposta técnica/comercial para fornecimento de estrutura metálica, cobertura e serviços correlatos para o projeto ${data.project?.nome || 'em questão'}. O Grupo Montex, com mais de 10 anos de experiência, oferece soluções completas incluindo material, fabricação, pintura, transporte e montagem.`,
        size: 22, font: 'Arial', color: COLORS.text
      })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({
        text: 'Colocamo-nos à disposição para quaisquer esclarecimentos.',
        size: 22, font: 'Arial', color: COLORS.text
      })]
    }),
    new Paragraph({
      spacing: { before: 400 },
      children: [new TextRun({ text: 'Atenciosamente,', size: 22, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({
      spacing: { before: 200 },
      children: [new TextRun({ text: 'GRUPO MONTEX', bold: true, size: 22, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Guilherme Maciel Vieira - Diretor Comercial', size: 20, font: 'Arial', color: COLORS.text })]
    }),
  ];
}

function createObjetoProposta(data) {
  // Collect all items from all setores
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
        setor: setor.nome || 'Setor',
      });
    });
  });

  // If no items from setores, create from unitCosts
  if (allItems.length === 0) {
    const uc = data.unitCosts || {};
    const estTotal = (uc.estrutura?.material || 0) + (uc.estrutura?.fabricacao || 0) + (uc.estrutura?.pintura || 0) + (uc.estrutura?.transporte || 0) + (uc.estrutura?.montagem || 0);
    const cobTotal = (uc.cobertura?.material || 0) + (uc.cobertura?.montagem || 0);
    const fechTotal = (uc.fechamento?.material || 0) + (uc.fechamento?.montagem || 0);
    const sdTotal = (uc.steelDeck?.material || 0) + (uc.steelDeck?.montagem || 0);

    allItems.push(
      { descricao: 'ESTRUTURA METÁLICA', quantidade: data.calculations?.pesoTotal || 0, unidade: 'KG', preco: estTotal, total: (data.calculations?.pesoTotal || 0) * estTotal, setor: 'Geral' },
    );
    if (cobTotal > 0) allItems.push({ descricao: 'COBERTURA - TELHA', quantidade: 0, unidade: 'M²', preco: cobTotal, total: 0, setor: 'Geral' });
    if (fechTotal > 0) allItems.push({ descricao: 'FECHAMENTO', quantidade: 0, unidade: 'M²', preco: fechTotal, total: 0, setor: 'Geral' });
    if (sdTotal > 0) allItems.push({ descricao: 'STEEL DECK', quantidade: 0, unidade: 'M²', preco: sdTotal, total: 0, setor: 'Geral' });
    totalGeral = allItems.reduce((s, i) => s + i.total, 0);
  }

  // Apply BDI and margin
  const bdi = data.calculations?.bdi || 0;
  const margem = data.calculations?.margem || 0;
  const desconto = data.calculations?.desconto || 0;
  const fator = 1 + (bdi/100) + (margem/100) - (desconto/100);
  const totalComBDI = totalGeral * fator;
  const precoVenda = data.calculations?.precoVenda || totalComBDI || totalGeral;

  // Column widths: QTD=1400, UN=900, DESC=4060, UNIT=1500, TOTAL=1500 = 9360
  const colWidths = [1400, 900, 4060, 1500, 1500];

  // Header row
  const headerRow = new TableRow({
    children: [
      createCell('QUANTIDADE', { bold: true, shading: COLORS.primary, color: COLORS.white, width: colWidths[0], alignment: AlignmentType.CENTER, fontSize: 18 }),
      createCell('UNIDADE', { bold: true, shading: COLORS.primary, color: COLORS.white, width: colWidths[1], alignment: AlignmentType.CENTER, fontSize: 18 }),
      createCell('DESCRIÇÃO SERVIÇO', { bold: true, shading: COLORS.primary, color: COLORS.white, width: colWidths[2], alignment: AlignmentType.CENTER, fontSize: 18 }),
      createCell('VALOR UNITÁRIO', { bold: true, shading: COLORS.primary, color: COLORS.white, width: colWidths[3], alignment: AlignmentType.CENTER, fontSize: 18 }),
      createCell('VALOR TOTAL', { bold: true, shading: COLORS.primary, color: COLORS.white, width: colWidths[4], alignment: AlignmentType.CENTER, fontSize: 18 }),
    ]
  });

  // Item rows
  const itemRows = allItems.map((item, idx) => new TableRow({
    children: [
      createCell(formatNumberBR(item.quantidade), { width: colWidths[0], alignment: AlignmentType.CENTER, fontSize: 18, shading: idx % 2 === 0 ? COLORS.white : COLORS.lightGray }),
      createCell(item.unidade, { width: colWidths[1], alignment: AlignmentType.CENTER, fontSize: 18, shading: idx % 2 === 0 ? COLORS.white : COLORS.lightGray }),
      createCell(item.descricao, { width: colWidths[2], fontSize: 18, shading: idx % 2 === 0 ? COLORS.white : COLORS.lightGray }),
      createCell(formatCurrencyBR(item.preco), { width: colWidths[3], alignment: AlignmentType.RIGHT, fontSize: 18, shading: idx % 2 === 0 ? COLORS.white : COLORS.lightGray }),
      createCell(formatCurrencyBR(item.total), { width: colWidths[4], alignment: AlignmentType.RIGHT, fontSize: 18, shading: idx % 2 === 0 ? COLORS.white : COLORS.lightGray }),
    ]
  }));

  // Subtotal row
  const subtotalRow = new TableRow({
    children: [
      createCell('SUBTOTAL', { bold: true, width: colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], colspan: 4, alignment: AlignmentType.RIGHT, shading: COLORS.primaryLight, fontSize: 18 }),
      createCell(formatCurrencyBR(totalGeral), { bold: true, width: colWidths[4], alignment: AlignmentType.RIGHT, shading: COLORS.primaryLight, fontSize: 18 }),
    ]
  });

  // BDI row (if applicable)
  const bdiRows = [];
  if (bdi > 0) {
    bdiRows.push(new TableRow({
      children: [
        createCell(`BDI (${bdi}%)`, { bold: true, width: colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], colspan: 4, alignment: AlignmentType.RIGHT, fontSize: 18 }),
        createCell(formatCurrencyBR(totalGeral * bdi / 100), { bold: true, width: colWidths[4], alignment: AlignmentType.RIGHT, fontSize: 18 }),
      ]
    }));
  }
  if (margem > 0) {
    bdiRows.push(new TableRow({
      children: [
        createCell(`MARGEM DE LUCRO (${margem}%)`, { bold: true, width: colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], colspan: 4, alignment: AlignmentType.RIGHT, fontSize: 18 }),
        createCell(formatCurrencyBR(totalGeral * margem / 100), { bold: true, width: colWidths[4], alignment: AlignmentType.RIGHT, fontSize: 18 }),
      ]
    }));
  }

  // Total row
  const totalRow = new TableRow({
    children: [
      createCell('TOTAL DA OBRA COM DESCONTO', { bold: true, width: colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], colspan: 4, alignment: AlignmentType.RIGHT, shading: COLORS.secondary, color: COLORS.white, fontSize: 20 }),
      createCell(formatCurrencyBR(precoVenda), { bold: true, width: colWidths[4], alignment: AlignmentType.RIGHT, shading: COLORS.secondary, color: COLORS.white, fontSize: 20 }),
    ]
  });

  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { before: 400, after: 200 },
      children: [new TextRun({ text: '2. OBJETO DA PROPOSTA', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 400 },
      children: [new TextRun({ text: 'PREÇOS ABAIXO INCLUEM MATERIAL, FABRICAÇÃO, PINTURA, TRANSPORTE E MONTAGEM.', bold: true, italics: true, size: 22, font: 'Arial', color: COLORS.text })]
    }),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: colWidths,
      rows: [headerRow, ...itemRows, subtotalRow, ...bdiRows, totalRow],
    }),
  ];
}

function createEstruturaTecnica(data) {
  const tipoAco = data.project?.tipo || 'GALPÃO INDUSTRIAL';
  return [
    new Paragraph({ children: [new PageBreak()] }),
    // Section 2.1 - Estrutura Metálica
    new Paragraph({
      spacing: { before: 400, after: 200 },
      children: [new TextRun({ text: '2.1 - ESTRUTURA METÁLICA:', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: '· ESTRUTURA METÁLICA CONFECCIONADA COM, TESOURAS, TERÇAS E COLUNAS EM PERFIL U DOBRADO', size: 22, font: 'Arial', color: COLORS.text })]
    }),
    // Section 2.2 - Aço
    new Paragraph({
      spacing: { before: 300, after: 200 },
      children: [new TextRun({ text: '2.2 - AÇO:', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: '· CHAPAS: ASTM A 36;', size: 22, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: '· PERFIS "U" CIVIL 300', size: 22, font: 'Arial', color: COLORS.text })]
    }),
    // Section 2.3 - Pintura
    new Paragraph({
      spacing: { before: 300, after: 200 },
      children: [new TextRun({ text: '2.3 PINTURA:', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: '2.3.1 - TRATAMENTO SUPERFICIAL:', bold: true, size: 22, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: '· JATEAMENTO DS 2,5 + 2 DEMÃOS DE 60 MICRAS', size: 22, font: 'Arial', color: COLORS.text })]
    }),
  ];
}

function createNormasTecnicas() {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: '3. NORMAS TÉCNICAS', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: '3.1 - CARGAS E CÁLCULOS:', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: '· CÁLCULO ESTRUTURAL E DETALHAMENTOS FEITOS POR PROFISSIONAIS CAPACITADOS, USANDO PROGRAMAS DE ÚLTIMA GERAÇÃO O QUE PERMITE A MODELAGEM EM 3D E UMA COMPATIBILIZAÇÃO PERFEITA COM AS OUTRAS ESTRUTURAS EVITANDO RETRABALHO.', size: 20, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: '· PARA DIMENSIONAMENTO DA ESTRUTURA METÁLICA FORAM OBEDECIDAS AS SEGUINTES NORMAS:', size: 20, font: 'Arial', color: COLORS.text })]
    }),
    ...[
      'NBR - 6.120 - CARGAS PARA ESTRUTURAS DE EDIFICAÇÕES;',
      'NBR - 6.123 - AÇÕES DO VENTO EM ESTRUTURAS;',
      'NBR - 8.800 - PROJETO E EXECUÇÃO DE AÇO DE EDIFÍCIOS;',
      'MANUAL DO AISC/1993 - PARA EXECUÇÃO DE ESTRUTURAS DE AÇO DE EDIFÍCIOS;',
      'MANUAL DO AISI/1991 - PERFIS DE CHAPA DOBRADOS A FRIO;',
      'ESPECIAÇÃO DO AISE N.º 13 - EDIFÍCIOS INDUSTRIAIS',
    ].map(norma => new Paragraph({
      spacing: { after: 60 },
      indent: { left: 360 },
      children: [new TextRun({ text: norma, size: 20, font: 'Arial', color: COLORS.text })]
    })),
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: '3.2 - SOLDAS:', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: '· SOLDADORES QUALIFICADOS DE ACORDO COM NORMA AWS -D1-1.', size: 20, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: '3.3 - PARAFUSOS:', bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: '· DE ACORDO COM NORMA ASTMA-307 / A-325.', size: 20, font: 'Arial', color: COLORS.text })]
    }),
  ];
}

function createObrigacoesMontex() {
  const items = [
    'DETALHAMENTO DE TODA A ESTRUTURA METÁLICA;',
    'FORNECIMENTO DE TODO O MATERIAL NECESSÁRIOS PARA A FABRICAÇÃO;',
    'FABRICAÇÃO DAS ESTRUTURAS;',
    'FORNECIMENTO DOS CHUMBADORES;',
    'TRATAMENTO DE TODA A ESTRUTURA METÁLICA CONFORME ESPECIFICADO NO ITEM 2.3;',
    'TRANSPORTE DE TODO O NOSSO FORNECIMENTO ATÉ O LOCAL DA OBRA;',
    'MONTAGEM DE TODO O NOSSO FORNECIMENTO;',
    'FORNECIMENTO DE TODO EQUIPAMENTO NECESSÁRIO, COMO MUNCK, GUINDASTE PLATAFORMAS ETC;',
    'TRANSPORTE, ALIMENTAÇÃO E ESTADIA DA EQUIPE DE MONTAGEM;',
    'ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA (ART) DOS SERVIÇOS EXECUTADOS;',
    'GARANTIA DA OBRA CONFORME LEGISLAÇÃO EM VIGOR (CÓDIGO CIVIL - ARTIGO 1245).',
  ];
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: '5. OBRIGAÇÕES DA MONTEX', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    ...items.map(item => new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: `· ${item}`, size: 20, font: 'Arial', color: COLORS.text })]
    })),
  ];
}

function createObrigacoesCliente() {
  const items = [
    'CÁLCULO E EXECUÇÃO DE TODOS OS SERVIÇOS EM ALVENARIA E CONCRETO;',
    'LOCAÇÃO E INSTALAÇÃO DOS CHUMBADORES E INSERTS METÁLICOS;',
    'FORNECER ENERGIA ELÉTRICA NECESSÁRIA AOS SERVIÇOS;',
    'FORNECER LOCAL SEGURO PARA GUARDA DE NOSSOS EQUIPAMENTOS E FORNECIMENTOS;',
    'FORNECIMENTO E EXECUÇÃO DE QUALQUER TIPO DE ESQUADRIAS METÁLICAS (SERRALHERIA EM GERAL);',
    'FORNECER LOCAL LIMPO E DESIMPEDIDO PARA EXECUÇÃO DOS SERVIÇOS, COM TERRENO NIVELADO E COMPACTADO;',
    'FORNECIMENTO PARA A EQUIPE DE MONTAGEM DE ÁGUA POTÁVEL, VESTIÁRIO/BANHEIRO COM CHUVEIRO E REFEITÓRIO CONFORME NR-18;',
    'FORNECIMENTO E EXECUÇÃO DO GROUTEAMENTO APÓS O NIVELAMENTO DA ESTRUTURA METÁLICA.',
  ];
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: '6. OBRIGAÇÕES DO CLIENTE', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    ...items.map(item => new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: `· ${item}`, size: 20, font: 'Arial', color: COLORS.text })]
    })),
  ];
}

function createJornadaTrabalho() {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: '7. JORNADA DE TRABALHO', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: 'ESTAMOS CONSIDERANDO JORNADA DE TRABALHO DE 44 HORAS SEMANAIS DE SEGUNDA A SEXTA FEIRAS.', bold: true, italics: true, size: 22, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: 'ESTA JORNADA FOI IDEALIZADA EM FUNÇÃO DO VOLUME DE SERVIÇOS, CASO SEJA NECESSÁRIO ESTUDAREMOS ALTERNATIVAS PARA CUMPRIR PRAZO DA OBRA.', italics: true, size: 20, font: 'Arial', color: COLORS.text })]
    }),
  ];
}

function createSeguranca() {
  return [
    new Paragraph({
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: '8. SISTEMA DE SEGURANÇA', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: 'OBJETIVO: ESTABELECER COMO META A PREVENÇÃO DE ACIDENTES CONSIDERANDO:', bold: true, size: 22, font: 'Arial', color: COLORS.text })]
    }),
    ...[
      'AVALIAR PREVIAMENTE OS RISCOS AMBIENTAIS E OPERACIONAIS DE CADA TAREFA',
      'SEGUIR NORMAS E PROCEDIMENTOS DE SEGURANÇA (NPS) PARA CADA ATIVIDADE',
      'PLANEJAR E MONITORAR OS PROCESSOS DE EXECUÇÃO DOS SERVIÇOS, PRIORIZANDO A SEGURANÇA DO PESSOAL, EQUIPAMENTOS E FERRAMENTAS.',
    ].map(item => new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: `· ${item}`, italics: true, size: 20, font: 'Arial', color: COLORS.text })]
    })),
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: 'A MONTEX FORNECERÁ GRATUITAMENTE AOS SEUS FUNCIONÁRIOS OS EPIs NECESSÁRIOS DE ACORDO COM A NR-6 DA PORTARIA 3.214 DE 08/06/78.', italics: true, size: 20, font: 'Arial', color: COLORS.text })]
    }),
  ];
}

function createPrazoExecucao(data) {
  const prazo = data.prazoExecucao || 150;
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: '9. PRAZO DE EXECUÇÃO DAS ESTRUTURAS', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: `${prazo} DIAS`, bold: true, italics: true, size: 36, font: 'Arial', color: COLORS.primary })]
    }),
  ];
}

function createCondicoesPagamento(data) {
  const cond = data.condicoesPagamento || { assinatura: 10, projeto: 5, medicoes: 85 };
  return [
    new Paragraph({
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: '10. CONDIÇÕES DE PAGAMENTO:', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: `- ${cond.assinatura}% NA ASSINATURA DO CONTRATO`, bold: true, italics: true, size: 22, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [new TextRun({ text: `- ${cond.projeto}% NA ENTREGA DO PROJETO METÁLICO`, bold: true, italics: true, size: 22, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: `- ${cond.medicoes}% MEDIANTE A MEDIÇÕES E CONFORME ACEITE (DESCONTAR MATERIAL FATURADO)`, bold: true, size: 22, font: 'Arial', color: COLORS.text })]
    }),
  ];
}

function createValorTotal(data) {
  const total = data.calculations?.precoVenda || data.calculations?.custoTotal || 0;
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: '12. VALOR TOTAL DA OBRA', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 400 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.primary } },
      children: [new TextRun({ text: formatCurrencyBR(total), bold: true, italics: true, size: 44, font: 'Arial', color: COLORS.primary })]
    }),
  ];
}

function createAnaliseInvestimento(data) {
  const total = data.calculations?.precoVenda || data.calculations?.custoTotal || 0;
  const pesoTotal = data.calculations?.pesoTotal || 0;
  const precoKg = pesoTotal > 0 ? total / pesoTotal : 0;
  const mediaKg = 28;
  const premiumKg = 35;
  const economiaMercado = pesoTotal * (mediaKg - precoKg);
  const economiaPremium = pesoTotal * (premiumKg - precoKg);

  const colWidths2 = [3120, 1560, 1560, 1560, 1560];

  // Build items table same as OBJETO but is the "CALCULO DE ESTIMATIVA" section
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: '13. ANÁLISE DO INVESTIMENTO', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: 'COMPOSIÇÃO DOS CUSTOS E COMPARATIVO DE MERCADO', bold: true, italics: true, size: 24, font: 'Arial', color: COLORS.text })]
    }),
    // Comparison table
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: 'DETALHAMENTO DOS CUSTOS:', bold: true, size: 22, font: 'Arial', color: COLORS.text })]
    }),
    // Economy info
    new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [
        new TextRun({ text: 'ECONOMIA ESTIMADA: ', bold: true, size: 22, font: 'Arial', color: COLORS.text }),
        new TextRun({ text: `Até ${formatCurrencyBR(Math.max(0, economiaMercado))} em relação à média de mercado (R$${mediaKg}/kg)`, size: 22, font: 'Arial', color: COLORS.text }),
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: 'ECONOMIA PREMIUM: ', bold: true, size: 22, font: 'Arial', color: COLORS.text }),
        new TextRun({ text: `Até ${formatCurrencyBR(Math.max(0, economiaPremium))} em relação a concorrentes premium (R$${premiumKg}/kg)`, size: 22, font: 'Arial', color: COLORS.text }),
      ]
    }),
  ];
}

function createCronograma(data) {
  const prazo = data.prazoExecucao || 150;
  const phases = [
    { fase: '1. Detalhamento', prazo: '30 dias', desc: 'Projeto executivo, modelagem 3D e compatibilização' },
    { fase: '2. Materiais', prazo: '30 dias', desc: 'Aquisição de chapas ASTM A36 e perfis U Civil 300' },
    { fase: '3. Fabricação', prazo: '60 dias', desc: 'Corte, solda e montagem das peças na fábrica' },
    { fase: '4. Pintura', prazo: '30 dias', desc: 'Jateamento DS 2,5 + 2 demãos de 60 micras' },
    { fase: '5. Transporte', prazo: '15 dias', desc: 'Logística via BR-381 até o canteiro de obras' },
    { fase: '6. Montagem', prazo: '55 dias', desc: 'Instalação com munck/guindaste e equipe especializada' },
  ];

  const colWidths3 = [2500, 1500, 5360];

  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: '14. CRONOGRAMA DETALHADO DE EXECUÇÃO', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 400 },
      children: [new TextRun({ text: `PLANEJAMENTO DAS ETAPAS DO PROJETO — ${prazo} DIAS`, bold: true, italics: true, size: 24, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: 'DETALHAMENTO DAS FASES:', bold: true, size: 22, font: 'Arial', color: COLORS.text })]
    }),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: colWidths3,
      rows: [
        new TableRow({
          children: [
            createCell('FASE', { bold: true, shading: COLORS.primary, color: COLORS.white, width: colWidths3[0], alignment: AlignmentType.CENTER }),
            createCell('PRAZO', { bold: true, shading: COLORS.primary, color: COLORS.white, width: colWidths3[1], alignment: AlignmentType.CENTER }),
            createCell('DESCRIÇÃO', { bold: true, shading: COLORS.primary, color: COLORS.white, width: colWidths3[2] }),
          ]
        }),
        ...phases.map((p, idx) => new TableRow({
          children: [
            createCell(p.fase, { bold: true, width: colWidths3[0], shading: idx % 2 === 0 ? COLORS.white : COLORS.lightGray }),
            createCell(p.prazo, { bold: true, width: colWidths3[1], alignment: AlignmentType.CENTER, shading: idx % 2 === 0 ? COLORS.white : COLORS.lightGray }),
            createCell(p.desc, { width: colWidths3[2], shading: idx % 2 === 0 ? COLORS.white : COLORS.lightGray }),
          ]
        })),
      ],
    }),
  ];
}

function createPorQueEscolher(data) {
  const total = data.calculations?.precoVenda || data.calculations?.custoTotal || 0;
  const pesoTotal = data.calculations?.pesoTotal || 0;
  const precoKg = pesoTotal > 0 ? total / pesoTotal : 0;
  const economiaMercado = pesoTotal * (28 - precoKg);

  const reasons = [
    { title: 'PREÇO COMPETITIVO', desc: `${formatCurrencyBR(precoKg)}/kg — abaixo da média de mercado (R$28/kg). Economia de até ${formatCurrencyBR(Math.max(0, economiaMercado))} no valor total da obra.` },
    { title: 'EXPERIÊNCIA COMPROVADA', desc: 'Mais de 10 anos de atuação com +50 projetos entregues em 5 estados brasileiros. Portfólio inclui supermercados, shoppings, galpões industriais e infraestrutura pública.' },
    { title: 'SOLUÇÃO TURNKEY COMPLETA', desc: 'Detalhamento, material, fabricação, pintura, transporte e montagem — tudo incluso. Fornecimento de equipamentos como munck, guindaste e plataformas.' },
    { title: 'LOGÍSTICA ESTRATÉGICA', desc: 'Sede em São Joaquim de Bicas/MG, às margens da BR-381, facilitando o transporte e reduzindo custos logísticos.' },
    { title: 'CONFORMIDADE TÉCNICA TOTAL', desc: 'Atendimento às normas NBR 6.120, 6.123, 8.800, AISC, AISI, AWS D1-1 e ASTM. Soldadores qualificados, ART e garantia conforme Código Civil Art. 1245.' },
    { title: 'EQUIPE QUALIFICADA', desc: '+200 profissionais capacitados. Técnico de segurança dedicado com DDS diário. EPIs fornecidos conforme NR-6 da Portaria 3.214.' },
  ];

  const cond = data.condicoesPagamento || { assinatura: 10, projeto: 5, medicoes: 85 };

  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { before: 400, after: 400 },
      children: [new TextRun({ text: '15. POR QUE ESCOLHER O GRUPO MONTEX?', bold: true, italics: true, size: 28, font: 'Arial', color: COLORS.primary })]
    }),
    new Paragraph({
      spacing: { after: 400 },
      children: [new TextRun({ text: 'DIFERENCIAIS COMPETITIVOS PARA O SEU PROJETO', bold: true, italics: true, size: 24, font: 'Arial', color: COLORS.text })]
    }),
    ...reasons.flatMap(r => [
      new Paragraph({
        spacing: { before: 200, after: 100 },
        shading: { fill: COLORS.primaryLight, type: ShadingType.CLEAR },
        children: [new TextRun({ text: r.title, bold: true, size: 24, font: 'Arial', color: COLORS.primary })]
      }),
      new Paragraph({
        spacing: { after: 200 },
        indent: { left: 360 },
        children: [new TextRun({ text: r.desc, size: 20, font: 'Arial', color: COLORS.text })]
      }),
    ]),
    // Final box
    new Paragraph({ spacing: { before: 400 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      shading: { fill: COLORS.primary, type: ShadingType.CLEAR },
      children: [new TextRun({ text: `INVESTIMENTO TOTAL: ${formatCurrencyBR(total)}`, bold: true, size: 28, font: 'Arial', color: COLORS.white })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: `Proposta válida por 15 dias a partir de ${new Date().toLocaleDateString('pt-BR')}`, size: 20, font: 'Arial', color: COLORS.text })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: `Condições: ${cond.assinatura}% assinatura | ${cond.projeto}% entrega projeto | ${cond.medicoes}% medições`, size: 20, font: 'Arial', color: COLORS.text })]
    }),
  ];
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export async function generatePropostaDOCX(data) {
  // Try to fetch logo
  let logoImage = null;
  try {
    logoImage = await fetchImage('/images/proposta/logo-montex.png');
  } catch (e) {
    console.warn('Could not fetch logo:', e);
  }

  const headerChildren = [];
  if (logoImage) {
    headerChildren.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new ImageRun({
        type: 'png',
        data: logoImage,
        transformation: { width: 40, height: 53 },
        altText: { title: 'Montex Logo', description: 'Grupo Montex Logo', name: 'logo' },
      })]
    }));
  }
  headerChildren.push(new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: 'GRUPO MONTEX — SOLUÇÕES MODULARES', size: 16, font: 'Arial', color: COLORS.primary, italics: true })]
  }));

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 22 } }
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1273, bottom: 1440, left: 1273 },
        },
      },
      headers: {
        default: new Header({ children: headerChildren }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.mediumGray } },
              children: [
                new TextRun({ text: 'Grupo Montex — (31)99582-1443 — www.grupomontex.com.br — Página ', size: 16, font: 'Arial', color: COLORS.text }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Arial', color: COLORS.text }),
              ]
            }),
          ]
        }),
      },
      children: [
        // Title page
        ...createTitlePage(data),
        // Index
        ...createIndex(),
        // Sections
        ...createCartaApresentacao(data),
        ...createObjetoProposta(data),
        ...createEstruturaTecnica(data),
        ...createNormasTecnicas(),
        ...createObrigacoesMontex(),
        ...createObrigacoesCliente(),
        ...createJornadaTrabalho(),
        ...createSeguranca(),
        ...createPrazoExecucao(data),
        ...createCondicoesPagamento(data),
        ...createValorTotal(data),
        ...createAnaliseInvestimento(data),
        ...createCronograma(data),
        ...createPorQueEscolher(data),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

export default generatePropostaDOCX;
