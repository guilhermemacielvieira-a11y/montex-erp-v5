import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak } from 'docx';

// Brand colors
const COLORS = {
  teal: '1a7a6d',
  red: 'FF0000',
  text: '333333',
  lightGray: 'f5f5f5',
  mediumGray: '999999',
  white: 'ffffff',
  tableBorder: 'cccccc',
  dark: '1e293b',
};

const A4 = { width: 11906, height: 16838 };
const MARGINS = { top: 1440, right: 1134, bottom: 1440, left: 1134 };
const CONTENT_WIDTH = A4.width - MARGINS.left - MARGINS.right;

const formatCurrencyBR = (value) => {
  if (!value || isNaN(value)) return 'R$ 0,00';
  return 'R$ ' + Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatNumberBR = (value) => {
  if (!value || isNaN(value)) return '0';
  return Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
};

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'ffffff' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: COLORS.tableBorder };
const thinBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

function createCell(text, opts = {}) {
  const { bold = false, fontSize = 20, alignment = AlignmentType.LEFT, shading, width, color = COLORS.text, colspan } = opts;
  const cellOpts = {
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: shading ? { fill: shading, type: ShadingType.CLEAR } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    borders: thinBorders,
    children: [new Paragraph({
      alignment,
      children: [new TextRun({ text: String(text || ''), bold, size: fontSize, font: 'Arial', color })]
    })]
  };
  if (colspan) cellOpts.columnSpan = colspan;
  return new TableCell(cellOpts);
}

function heading(text, color = COLORS.red, size = 28) {
  return new Paragraph({
    spacing: { before: 300, after: 100 },
    children: [new TextRun({ text, bold: true, size, font: 'Arial', color, italics: true })]
  });
}

function bodyText(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    alignment: opts.alignment || AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, size: opts.size || 20, font: 'Arial', color: COLORS.text, bold: opts.bold || false })]
  });
}

function bulletItem(text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text: '· ' + text, size: 20, font: 'Arial', color: COLORS.text })]
  });
}

function spacer(before = 200) {
  return new Paragraph({ spacing: { before, after: 0 }, children: [] });
}

function tealFooter() {
  return new Paragraph({
    spacing: { before: 400 },
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: COLORS.teal, space: 1 } },
    children: [new TextRun({ text: 'GRUPO MONTEX - Soluções em Aço', size: 16, font: 'Arial', color: COLORS.teal, bold: true })]
  });
}

export async function generatePropostaDOCX(data) {
  const { project, setores, calculations, unitCosts, propostaNumber, prazoExecucao, condicoesPagamento } = data;

  const propNum = propostaNumber || `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}`;
  const prazo = prazoExecucao || 150;
  const pagamento = condicoesPagamento || { assinatura: 10, projeto: 5, medicoes: 85 };

  const now = new Date();
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const dateStr = `${now.getDate()} DE ${months[now.getMonth()].toUpperCase()} DE ${now.getFullYear()}`;

  // Calculate totals
  const totalGeral = setores.reduce((sum, s) => sum + s.itens.reduce((is, item) => is + (item.quantidade * item.preco), 0), 0);

  // Peso real: agrupa itens KG por nome base (antes de " - ") em cada setor e conta 1 vez
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

  const totalArea = setores.reduce((sum, s) => sum + s.itens.reduce((is, item) => is + ((item.unidade === 'M2') ? item.quantidade : 0), 0), 0);

  // Separar Material (sem margem/impostos) vs Instalação (com margem/impostos)
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
  const precoKg = totalWeight > 0 ? precoFinal / totalWeight : 0;

  const allChildren = [];

  // ====== PAGE 1: COVER ======
  allChildren.push(spacer(600));
  allChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 60 },
    children: [new TextRun({ text: 'GRUPO MONTEX', bold: true, size: 56, font: 'Arial', color: COLORS.dark })]
  }));
  allChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 200 },
    children: [new TextRun({ text: 'SOLUÇÕES MODULARES', bold: true, size: 28, font: 'Arial', color: COLORS.teal })]
  }));
  allChildren.push(spacer(800));
  allChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    children: [
      new TextRun({ text: 'Proposta ', size: 44, font: 'Arial', color: COLORS.dark }),
      new TextRun({ text: 'Comercial', size: 44, font: 'Arial', color: COLORS.dark, italics: true }),
    ]
  }));
  allChildren.push(spacer(600));

  // ====== PAGE 2: SOBRE + MISSÃO ======
  allChildren.push(new Paragraph({ children: [new PageBreak()] }));
  allChildren.push(new Paragraph({
    spacing: { before: 300, after: 200 },
    children: [
      new TextRun({ text: 'Sobre ', bold: true, size: 28, font: 'Arial', color: COLORS.dark }),
      new TextRun({ text: 'Grupo Montex', bold: true, size: 28, font: 'Arial', color: COLORS.dark, italics: true }),
    ]
  }));
  allChildren.push(bodyText(
    'Com mais de 10 anos o Grupo Montex se posiciona entre as principais empresas de soluções modulares, estruturas metálicas, esquadrias de alumínio, ACM, construção a seco, localizada em São Joaquim de Bicas, as margens da BR381, facilitando a logística de transporte. Com o intuito de oferecer os melhores produtos, investimos em alta tecnologia e soluções inovadoras para melhor atender nossos stakeholders, nossos projetos atendem especificamente cada modelo se adequando as necessidade de acordo com a demanda de valor para cada cliente.'
  ));
  allChildren.push(spacer(400));
  allChildren.push(new Paragraph({
    spacing: { before: 300, after: 200 },
    children: [
      new TextRun({ text: 'Missão ', bold: true, size: 28, font: 'Arial', color: COLORS.dark }),
      new TextRun({ text: 'Grupo Montex', bold: true, size: 28, font: 'Arial', color: COLORS.dark, italics: true }),
    ]
  }));
  allChildren.push(bodyText(
    'O Grupo Montex presa honestidade, transparência e sustentabilidade em seus negócios e visa sempre estar alinhado aos valores e boas praticas comerciais do nosso mercado; Nossos projetos e serviços, visam levar a nossa sociedade o que à de melhor em soluções modulares, estruturas metálicas e esquadrias de alumínio, transformando a vida de nossos colaboradores e de nossos clientes com o máximo de sucesso sustentável possível.'
  ));
  allChildren.push(tealFooter());

  // ====== PAGE 3: VISÃO ======
  allChildren.push(new Paragraph({ children: [new PageBreak()] }));
  allChildren.push(new Paragraph({
    spacing: { before: 300, after: 200 },
    children: [
      new TextRun({ text: 'Visão ', bold: true, size: 28, font: 'Arial', color: COLORS.dark }),
      new TextRun({ text: 'Grupo Montex', bold: true, size: 28, font: 'Arial', color: COLORS.dark, italics: true }),
    ]
  }));
  allChildren.push(bodyText(
    'Construir o futuro com parcerias inovadoras visando entregar sempre o melhor, com maior qualidade possível, agregando valor e menores custos aos nossos empreendimentos. Com uma visão do que podemos entregar a nossos investidores, trazendo consigo o sonho de seu pai Wellis Vieira, nós do Grupo Montex estamos sempre buscando meios diversos de atender as demandas de nossos stakeholders, bem como levar melhorias significativas a sociedade como um todo.'
  ));
  allChildren.push(spacer(300));
  allChildren.push(new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({ text: 'Transformando ', bold: true, size: 26, font: 'Arial', color: COLORS.dark }),
      new TextRun({ text: 'Pessoas', bold: true, size: 26, font: 'Arial', color: COLORS.dark, italics: true }),
    ]
  }));
  allChildren.push(bodyText(
    'Nossa equipe conta com um alto investimento em treinamento e qualificação profissional, ofertando o que à de melhor em fabricação e instalação no leito de obra.'
  ));
  allChildren.push(tealFooter());

  // ====== PAGE 9: INDEX ======
  allChildren.push(new Paragraph({ children: [new PageBreak()] }));
  allChildren.push(spacer(400));
  allChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: 'PROPOSTA TECNICA/ COMERCIAL', size: 28, font: 'Arial', color: COLORS.dark, italics: true })]
  }));
  allChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    children: [
      new TextRun({ text: 'N-', size: 22, font: 'Arial', color: COLORS.dark }),
      new TextRun({ text: `${propNum} rev00`, bold: true, size: 22, font: 'Arial', color: COLORS.dark }),
    ]
  }));
  allChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: (project?.nome || 'PROJETO').toUpperCase(), bold: true, size: 26, font: 'Arial', color: COLORS.dark, italics: true })]
  }));
  allChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 300 },
    children: [new TextRun({ text: `${months[now.getMonth()].toUpperCase()}/ ${now.getFullYear()}`, bold: true, size: 24, font: 'Arial', color: COLORS.dark, italics: true })]
  }));
  allChildren.push(spacer(200));
  allChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 200 },
    children: [new TextRun({ text: 'INDICE', bold: true, size: 24, font: 'Arial', color: COLORS.dark, italics: true })]
  }));

  const indexItems = [
    '1.  CARTA DE APRESENTAÇÃO',
    '2.  OBJETO DA PROPOSTA',
    '3.  NORMAS TECNICAS',
    '4.  DOCUMENTOS RECEBIDOS',
    '5.  OBRIGAÇÕES DA MONTEX',
    '6.  OBRIGAÇÕES DO CLIENTE',
    '7.  JORNADA DE TRABALHO',
    '8.  SISTEMA DE SEGURANCA',
    '9.  PRAZO DE EXECUCAO DOS SERVIÇOS',
    '10.     CONDIÇÕES DE PAGAMENTO',
    '11.     CALCULOS/ESTIMATIVAS',
    '12.     VALOR TOTAL DA OBRA',
  ];
  indexItems.forEach(item => {
    allChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 40 },
      children: [new TextRun({ text: item, size: 20, font: 'Arial', color: COLORS.dark, italics: true })]
    }));
  });
  allChildren.push(tealFooter());

  // ====== PAGE 10: CARTA DE APRESENTAÇÃO + OBJETO DA PROPOSTA ======
  allChildren.push(new Paragraph({ children: [new PageBreak()] }));
  allChildren.push(heading('1.CARTA DE APRESENTAÇÃO'));
  allChildren.push(spacer(100));
  allChildren.push(new Paragraph({
    spacing: { before: 100, after: 200 },
    children: [new TextRun({ text: `SÃO JOAQUIM DE BICAS  ${dateStr}`, size: 22, font: 'Arial', color: COLORS.dark, bold: true, italics: true })]
  }));
  allChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ text: `PROPOSTA COMERCIAL N-${propNum}`, bold: true, size: 24, font: 'Arial', color: COLORS.dark })]
  }));
  allChildren.push(heading('2.OBJETO DA PROPOSTA'));
  allChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 100 },
    children: [new TextRun({ text: 'PREÇOS ABAIXO INCLUEM MATERIAL, FABRICAÇÃO, PINTURA, TRANSPORTE E MONTAGEM.', bold: true, size: 18, font: 'Arial', color: COLORS.red, italics: true })]
  }));

  // Budget table
  const headerRow = new TableRow({
    children: [
      createCell('QUANTIDADE', { bold: true, fontSize: 16, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.CENTER, width: 1600 }),
      createCell('UNIDADE', { bold: true, fontSize: 16, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.CENTER, width: 1200 }),
      createCell('DESCRIÇÃO SERVIÇO', { bold: true, fontSize: 16, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.CENTER, width: 4000 }),
      createCell('VALOR UNITARIO', { bold: true, fontSize: 16, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.CENTER, width: 1600 }),
      createCell('VALOR TOTAL', { bold: true, fontSize: 16, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.CENTER, width: 1600 }),
    ]
  });

  const dataRows = [];
  setores.forEach(setor => {
    // Setor header row
    dataRows.push(new TableRow({
      children: [
        createCell(setor.nome.toUpperCase(), { bold: true, fontSize: 16, shading: 'FFA500', color: COLORS.white, alignment: AlignmentType.CENTER, colspan: 5 }),
      ]
    }));
    setor.itens.forEach(item => {
      dataRows.push(new TableRow({
        children: [
          createCell(formatNumberBR(item.quantidade), { fontSize: 16, alignment: AlignmentType.CENTER, width: 1600 }),
          createCell(item.unidade, { fontSize: 16, alignment: AlignmentType.CENTER, width: 1200 }),
          createCell(item.descricao, { fontSize: 16, width: 4000 }),
          createCell(formatCurrencyBR(item.preco), { fontSize: 16, alignment: AlignmentType.RIGHT, width: 1600 }),
          createCell(formatCurrencyBR(item.quantidade * item.preco), { fontSize: 16, alignment: AlignmentType.RIGHT, width: 1600 }),
        ]
      }));
    });
  });

  // Subtotal row
  dataRows.push(new TableRow({
    children: [
      createCell('SUBTOTAL', { bold: true, fontSize: 16, shading: 'FFA500', color: COLORS.white, alignment: AlignmentType.CENTER, colspan: 4 }),
      createCell(formatCurrencyBR(totalGeral), { bold: true, fontSize: 16, alignment: AlignmentType.RIGHT }),
    ]
  }));

  // Total row
  dataRows.push(new TableRow({
    children: [
      createCell('TOTAL DA OBRA COM DESCONTO', { bold: true, fontSize: 16, shading: 'FF6600', color: COLORS.white, alignment: AlignmentType.CENTER, colspan: 4 }),
      createCell(formatCurrencyBR(precoFinal), { bold: true, fontSize: 16, alignment: AlignmentType.RIGHT }),
    ]
  }));

  allChildren.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [headerRow, ...dataRows],
  }));

  // Technical sections
  allChildren.push(spacer(200));
  allChildren.push(bodyText('2.1 - ESTRUTURA METÁLICA:', { bold: true }));
  allChildren.push(bulletItem('ESTRUTURA METÁLICA CONFECCIONADA COM, TESOURAS, TERÇAS E COLUNAS EM PERFIL U DOBRADO'));
  allChildren.push(bodyText('2.2 - AÇO:', { bold: true }));
  allChildren.push(bulletItem('CHAPAS: ASTM A 36;'));
  allChildren.push(bulletItem('PERFIS "U" CIVIL 300'));
  allChildren.push(bodyText('2.3 PINTURA:', { bold: true }));
  allChildren.push(bodyText('2.3.1 - TRATAMENTO SUPERFICIAL:', { bold: true }));
  allChildren.push(bulletItem('JATEAMENTO DS 2,5 + 2 DEMÃOS DE 60 MICRAS'));
  allChildren.push(tealFooter());

  // ====== PAGE: NORMAS TÉCNICAS ======
  allChildren.push(new Paragraph({ children: [new PageBreak()] }));
  allChildren.push(heading('3.NORMAS TECNICAS'));
  allChildren.push(bodyText('3.1 - CARGAS E CÁLCULOS:', { bold: true }));
  allChildren.push(bulletItem('CÁLCULO ESTRUTURAL E DETALHAMENTOS FEITOS POR PROFISSIONAIS CAPACITADOS, USANDO PROGRAMAS DE ÚLTIMA GERAÇÃO O QUE PERMITE A MODELAGEM EM 3D E UMA COMPATIBILIZAÇÃO PERFEITA COM AS OUTRAS ESTRUTURAS EVITANDO RETRABALHO.'));
  allChildren.push(bulletItem('PARA DIMENSIONAMENTO DA ESTRUTURA METÁLICA FORAM OBEDECIDAS AS SEGUINTES NORMAS E MANUAIS:'));
  allChildren.push(spacer(60));
  const normas = [
    'NBR -6.120 - CARGAS PARA ESTRUTURAS DE EDIFICAÇÕES;',
    'NBR- 6.123 - AÇÕES DO VENTO EM ESTRUTURAS;',
    'NBR - 8.800 - PROJETO E EXECUÇÃO DE AÇO DE EDIFÍCIOS;',
    'MANUAL DO AISC/1993 - PARA EXECUÇÃO DE ESTRUTURAS DE AÇO DE EDIFÍCIOS;',
    'MANUAL DO AISI/1991 - PERFIS DE CHAPA DOBRADOS A FRIO;',
    'ESPECIAÇÃO DO AISE N.º 13 - EDIFÍCIOS INDUSTRIAIS',
  ];
  normas.forEach(n => allChildren.push(bodyText(n)));
  allChildren.push(bodyText('3.2 - SOLDAS:', { bold: true }));
  allChildren.push(bulletItem('SOLDADORES QUALIFICADOS DE ACORDO COM NORMA AWS -D1-1.'));
  allChildren.push(bodyText('3.3 - PARAFUSOS:', { bold: true }));
  allChildren.push(bulletItem('DE ACORDO COM NORMA ASTMA-307 / A-325.'));

  // ====== OBRIGAÇÕES DA MONTEX ======
  allChildren.push(heading('5.OBRIGAÇÕES DA MONTEX'));
  const obrigMontex = [
    'DETALHAMENTO DE TODA A ESTRUTURA METÁLICA;',
    'FORNECIMENTO DE TODO O MATERIAL NECESSÁRIOS PARA A FABRICAÇÃO;',
    'FABRICAÇÃO DAS ESTRUTURAS;',
    'FORNECIMENTO DOS CHUMBADORES;',
    'TRATAMENTO DE TODA A ESTRUTURA METÁLICA CONFORME ESPECIFICADO NO ITEM 2.3;',
    'TRANSPORTE DE TODO O NOSSO FORNECIMENTO ATÉ O LOCAL DA OBRA;',
    'MONTAGEM DE TODO O NOSSO FORNECIMENTO;',
    'FORNECIMENTO DE TODO EQUIPAMENTO NECESSARIO, COMO MUNCK, GUINDASTE PLATAFORMAS ETC;',
    'TRANSPORTE, ALIMENTAÇÃO E ESTADIA DA EQUIPE DE MONTAGEM;',
    'ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA (ART) DOS SERVIÇOS EXECUTADOS;',
    'GARANTIA DA OBRA CONFORME LEGISLAÇÃO EM VIGOR (CÓDIGO CIVIL - ARTIGO 1245).',
  ];
  obrigMontex.forEach(o => allChildren.push(bulletItem(o)));

  // ====== OBRIGAÇÕES DO CLIENTE ======
  allChildren.push(heading('6. OBRIGAÇÕES DO CLIENTE'));
  const obrigCliente = [
    'CÁLCULO E EXECUÇÃO DE TODOS OS SERVIÇOS EM ALVENARIA E CONCRETO;',
    'LOCAÇÃO E INSTALAÇÃO DOS CHUMBADORES E INSERTS METÁLICOS;',
    'FORNECER ENERGIA ELÉTRICA NECESSÁRIA AOS SERVIÇOS;',
    'FORNECER LOCAL SEGURO PARA GUARDA DE NOSSOS EQUIPAMENTOS E FORNECIMENTOS;',
    'FORNECIMENTO E EXECUÇÃO DE QUALQUER TIPO DE ESQUADRIAS METÁLICAS (SERRALHERIA EM GERAL TAIS COMO: CORRIMÃOS, DÔMUS, CÚPULAS, PARAPEITOS, PORTAS, PORTÕES, ETC.);',
    'FORNECER LOCAL LIMPO E DESIMPEDIDO PARA EXECUÇÃO DOS SERVIÇOS, COM TERRENO NIVELADO E COMPACTADO EM TODO O INTERIOR E LATERAL DA OBRA;',
    'FORNECIMENTO PARA A EQUIPE DE MONTAGEM DE ÁGUA POTÁVEL, VESTIÁRIO/BANHEIRO COM CHUVEIRO E REFEITÓRIO CONFORME EXIGÊNCIAS DA NR-18, ALÉM DE ENERGIA ELÉTRICA E LOCAL PARA ALMOXARIFADO E ESCRITÓRIO.',
    'FORNECIMENTO E EXECUÇÃO DO GROUTEAMENTO APÓS O NIVELAMENTO DA ESTRUTURA METÁLICA',
  ];
  obrigCliente.forEach(o => allChildren.push(bulletItem(o)));
  allChildren.push(tealFooter());

  // ====== JORNADA + SEGURANÇA + PRAZO + PAGAMENTO ======
  allChildren.push(new Paragraph({ children: [new PageBreak()] }));
  allChildren.push(heading('7.JORNADA DE TRABALHO'));
  allChildren.push(bodyText('ESTAMOS CONSIDERANDO JORNADA DE TRABALHO DE 44 HORAS SEMANAIS', { bold: true }));
  allChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 100 },
    children: [new TextRun({ text: 'DE SEGUNDA A SEXTA FEIRAS;', size: 20, font: 'Arial', color: COLORS.text })]
  }));
  allChildren.push(bodyText('1. ESTA JORNADA FOI IDEALIZADA EM FUNÇÃO DO VOLUME DE SERVIÇOS, CASO SEJA NECESSARIO ESTUDAREMOS ALTERNATIVAS PARA CUMPRIR PRAZO DA OBRA.'));

  allChildren.push(heading('8.SISTEMA DE SEGURANÇA'));
  allChildren.push(bodyText('OBJETIVO', { bold: true }));
  allChildren.push(bodyText('ESTABELECER COMO META A PREVENÇÃO DE ACIDENTES CONSIDERANDO:'));
  allChildren.push(bodyText('AVALIAR PREVIAMENTE OS RISCOS AMBIENTAIS E OPERACIONAIS DE CADA TAREFA'));
  allChildren.push(bodyText('A MONTEX FORNECERA GRATUITAMENTE AOS SEUS FUNCIONARIOS OS EPI´s NECESSARIOS DE ACORDO COM A NR-6 DA PORTARIA 3.214 DE 08/06/78 OU NORMAS INTERNAS DO CLIENTE DE ESTAS FOREM MAIS ABRANGENTE.'));

  allChildren.push(heading(`9.PRAZO DE EXECUÇÃO DAS ESTRUTURAS`));
  allChildren.push(new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [new TextRun({ text: `      ${prazo} DIAS`, bold: true, size: 22, font: 'Arial', color: COLORS.text })]
  }));

  allChildren.push(heading('10.CONDIÇÕES DE PAGAMENTO:'));
  allChildren.push(bodyText(`-${pagamento.assinatura}% NA ASSINATURA DO CONTRATO`, { bold: true }));
  allChildren.push(bodyText(`-${pagamento.projeto}% NA ENTREGA DO PROJETO METALICO`, { bold: true }));
  allChildren.push(bodyText(`- ${pagamento.medicoes}% MEDIANTE A MEDIÇÕES E CONFORME ACEITE (DESCONTAR MATERIAL FATURADO)`));
  allChildren.push(tealFooter());

  // ====== CÁLCULOS/ESTIMATIVAS (repeat table) ======
  allChildren.push(new Paragraph({ children: [new PageBreak()] }));
  allChildren.push(heading('11.CALCULO DE ESTIMATIVA'));
  allChildren.push(new Paragraph({
    spacing: { before: 60, after: 100 },
    children: [new TextRun({ text: 'PREÇOS ABAIXO INCLUEM MATERIAL, FABRICAÇÃO, PINTURA, TRANSPORTE E MONTAGEM.', bold: true, size: 18, font: 'Arial', color: COLORS.red, italics: true })]
  }));

  // Same budget table again
  const headerRow2 = new TableRow({
    children: [
      createCell('QUANTIDADE', { bold: true, fontSize: 16, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.CENTER, width: 1600 }),
      createCell('UNIDADE', { bold: true, fontSize: 16, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.CENTER, width: 1200 }),
      createCell('DESCRIÇÃO SERVIÇO', { bold: true, fontSize: 16, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.CENTER, width: 4000 }),
      createCell('VALOR UNITARIO', { bold: true, fontSize: 16, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.CENTER, width: 1600 }),
      createCell('VALOR TOTAL', { bold: true, fontSize: 16, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.CENTER, width: 1600 }),
    ]
  });

  const dataRows2 = [];
  setores.forEach(setor => {
    dataRows2.push(new TableRow({
      children: [
        createCell(setor.nome.toUpperCase(), { bold: true, fontSize: 16, shading: 'FFA500', color: COLORS.white, alignment: AlignmentType.CENTER, colspan: 5 }),
      ]
    }));
    setor.itens.forEach(item => {
      dataRows2.push(new TableRow({
        children: [
          createCell(formatNumberBR(item.quantidade), { fontSize: 16, alignment: AlignmentType.CENTER, width: 1600 }),
          createCell(item.unidade, { fontSize: 16, alignment: AlignmentType.CENTER, width: 1200 }),
          createCell(item.descricao, { fontSize: 16, width: 4000 }),
          createCell(formatCurrencyBR(item.preco), { fontSize: 16, alignment: AlignmentType.RIGHT, width: 1600 }),
          createCell(formatCurrencyBR(item.quantidade * item.preco), { fontSize: 16, alignment: AlignmentType.RIGHT, width: 1600 }),
        ]
      }));
    });
  });
  dataRows2.push(new TableRow({
    children: [
      createCell('SUBTOTAL', { bold: true, fontSize: 16, shading: 'FFA500', color: COLORS.white, alignment: AlignmentType.CENTER, colspan: 4 }),
      createCell(formatCurrencyBR(totalGeral), { bold: true, fontSize: 16, alignment: AlignmentType.RIGHT }),
    ]
  }));
  dataRows2.push(new TableRow({
    children: [
      createCell('TOTAL DA OBRA COM DESCONTO', { bold: true, fontSize: 16, shading: 'FF6600', color: COLORS.white, alignment: AlignmentType.CENTER, colspan: 4 }),
      createCell(formatCurrencyBR(precoFinal), { bold: true, fontSize: 16, alignment: AlignmentType.RIGHT }),
    ]
  }));

  allChildren.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [headerRow2, ...dataRows2],
  }));

  // VALOR TOTAL
  allChildren.push(spacer(300));
  allChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: 'VALOR TOTAL DA OBRA', bold: true, size: 32, font: 'Arial', color: COLORS.teal, italics: true })]
  }));
  allChildren.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 300 },
    children: [new TextRun({ text: formatCurrencyBR(precoFinal), bold: true, size: 44, font: 'Arial', color: COLORS.dark, italics: true })]
  }));
  allChildren.push(tealFooter());

  // ====== ANÁLISE DO INVESTIMENTO ======
  allChildren.push(new Paragraph({ children: [new PageBreak()] }));
  allChildren.push(heading('13.ANÁLISE DO INVESTIMENTO'));
  allChildren.push(new Paragraph({
    spacing: { before: 60, after: 200 },
    children: [new TextRun({ text: 'COMPOSIÇÃO DOS CUSTOS E COMPARATIVO DE MERCADO', bold: true, size: 20, font: 'Arial', color: COLORS.red, italics: true })]
  }));

  // Detalhamento table
  allChildren.push(bodyText('DETALHAMENTO DOS CUSTOS:', { bold: true }));
  const detailHeader = new TableRow({
    children: [
      createCell('ITEM', { bold: true, fontSize: 18, shading: COLORS.teal, color: COLORS.white }),
      createCell('QTDE', { bold: true, fontSize: 18, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.CENTER }),
      createCell('UN', { bold: true, fontSize: 18, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.CENTER }),
      createCell('UNIT.', { bold: true, fontSize: 18, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.RIGHT }),
      createCell('TOTAL', { bold: true, fontSize: 18, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.RIGHT }),
    ]
  });

  const detailRows = [];
  setores.forEach(setor => {
    setor.itens.forEach(item => {
      detailRows.push(new TableRow({
        children: [
          createCell(item.descricao, { fontSize: 18 }),
          createCell(formatNumberBR(item.quantidade), { fontSize: 18, alignment: AlignmentType.CENTER }),
          createCell(item.unidade, { fontSize: 18, alignment: AlignmentType.CENTER }),
          createCell(formatCurrencyBR(item.preco), { fontSize: 18, alignment: AlignmentType.RIGHT }),
          createCell(formatCurrencyBR(item.quantidade * item.preco), { fontSize: 18, alignment: AlignmentType.RIGHT }),
        ]
      }));
    });
  });
  detailRows.push(new TableRow({
    children: [
      createCell('TOTAL DA OBRA', { bold: true, fontSize: 18, colspan: 4 }),
      createCell(formatCurrencyBR(precoFinal), { bold: true, fontSize: 18, alignment: AlignmentType.RIGHT, color: COLORS.red }),
    ]
  }));

  allChildren.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [detailHeader, ...detailRows],
  }));

  if (precoKg > 0) {
    const mercado = precoKg * 1.17;
    const premium = precoKg * 1.46;
    allChildren.push(spacer(100));
    allChildren.push(bodyText(`ECONOMIA ESTIMADA: Até ${formatCurrencyBR((mercado - precoKg) * totalWeight)} em relação à média de mercado (${formatCurrencyBR(mercado)}/kg)`, { bold: true }));
    allChildren.push(bodyText(`ECONOMIA PREMIUM: Até ${formatCurrencyBR((premium - precoKg) * totalWeight)} em relação a concorrentes premium (${formatCurrencyBR(premium)}/kg)`, { bold: true }));
  }
  allChildren.push(tealFooter());

  // ====== CRONOGRAMA ======
  allChildren.push(new Paragraph({ children: [new PageBreak()] }));
  allChildren.push(heading('14.CRONOGRAMA DETALHADO DE EXECUÇÃO'));
  allChildren.push(new Paragraph({
    spacing: { before: 60, after: 200 },
    children: [new TextRun({ text: `PLANEJAMENTO DAS ETAPAS DO PROJETO — ${prazo} DIAS`, bold: true, size: 20, font: 'Arial', color: COLORS.red, italics: true })]
  }));

  const phases = [
    { fase: '1. Detalhamento', prazo: '30 dias', desc: 'Projeto executivo, modelagem 3D e compatibilização' },
    { fase: '2. Materiais', prazo: '30 dias', desc: 'Aquisição de chapas ASTM A36 e perfis U Civil 300' },
    { fase: '3. Fabricação', prazo: '60 dias', desc: 'Corte, solda e montagem das peças na fábrica' },
    { fase: '4. Pintura', prazo: '30 dias', desc: 'Jateamento DS 2,5 + 2 demãos de 60 micras' },
    { fase: '5. Transporte', prazo: '15 dias', desc: 'Logística via BR-381 até o canteiro de obras' },
    { fase: '6. Montagem', prazo: '55 dias', desc: 'Instalação com munck/guindaste e equipe especializada' },
  ];

  allChildren.push(bodyText('DETALHAMENTO DAS FASES:', { bold: true }));
  const phaseHeader = new TableRow({
    children: [
      createCell('FASE', { bold: true, fontSize: 18, shading: COLORS.teal, color: COLORS.white }),
      createCell('PRAZO', { bold: true, fontSize: 18, shading: COLORS.teal, color: COLORS.white, alignment: AlignmentType.CENTER }),
      createCell('DESCRIÇÃO', { bold: true, fontSize: 18, shading: COLORS.teal, color: COLORS.white }),
    ]
  });
  const phaseRows = phases.map(p => new TableRow({
    children: [
      createCell(p.fase, { fontSize: 18 }),
      createCell(p.prazo, { fontSize: 18, bold: true, color: COLORS.teal, alignment: AlignmentType.CENTER }),
      createCell(p.desc, { fontSize: 18 }),
    ]
  }));
  allChildren.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [phaseHeader, ...phaseRows],
  }));

  // Summary boxes
  allChildren.push(spacer(200));
  const summaryRow = new TableRow({
    children: [
      createCell(`${formatNumberBR(totalWeight)} kg\nde aço`, { bold: true, fontSize: 18, color: COLORS.teal, alignment: AlignmentType.CENTER }),
      createCell(`${formatNumberBR(totalArea)} m²\nde cobertura`, { bold: true, fontSize: 18, color: COLORS.teal, alignment: AlignmentType.CENTER }),
      createCell(`${prazo} dias\nprazo total`, { bold: true, fontSize: 18, color: COLORS.teal, alignment: AlignmentType.CENTER }),
      createCell(`44h/semana\njornada`, { bold: true, fontSize: 18, color: COLORS.teal, alignment: AlignmentType.CENTER }),
    ]
  });
  allChildren.push(new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    rows: [summaryRow],
  }));
  allChildren.push(tealFooter());

  // ====== POR QUE ESCOLHER O GRUPO MONTEX? ======
  allChildren.push(new Paragraph({ children: [new PageBreak()] }));
  allChildren.push(heading('15.POR QUE ESCOLHER O GRUPO MONTEX?'));
  allChildren.push(new Paragraph({
    spacing: { before: 60, after: 200 },
    children: [new TextRun({ text: 'DIFERENCIAIS COMPETITIVOS PARA O SEU PROJETO', bold: true, size: 20, font: 'Arial', color: COLORS.red, italics: true })]
  }));

  const diferenciais = [
    { title: 'PREÇO COMPETITIVO', desc: `${formatCurrencyBR(precoKg)}/kg — 14% abaixo da média de mercado. Economia de até ${formatCurrencyBR((precoKg * 0.17) * totalWeight)} no valor total da obra comparado a concorrentes convencionais.` },
    { title: 'EXPERIÊNCIA COMPROVADA', desc: 'Mais de 10 anos de atuação com +50 projetos entregues em 5 estados brasileiros. Portfólio inclui supermercados, shoppings, galpões industriais e infraestrutura pública.' },
    { title: 'SOLUÇÃO TURNKEY COMPLETA', desc: 'Detalhamento, material, fabricação, pintura, transporte e montagem — tudo incluso. Fornecimento de equipamentos como munck, guindaste e plataformas.' },
    { title: 'LOGÍSTICA ESTRATÉGICA', desc: 'Sede em São Joaquim de Bicas/MG, às margens da BR-381, facilitando o transporte e reduzindo custos logísticos para todo o estado de Minas Gerais.' },
    { title: 'CONFORMIDADE TÉCNICA TOTAL', desc: 'Atendimento às normas NBR 6.120, 6.123, 8.800, AISC, AISI, AWS D1-1 e ASTM. Soldadores qualificados, ART e garantia conforme Código Civil Art. 1245.' },
    { title: 'EQUIPE QUALIFICADA', desc: '+200 profissionais capacitados. Técnico de segurança dedicado com DDS diário. EPIs fornecidos conforme NR-6 da Portaria 3.214.' },
  ];

  diferenciais.forEach(d => {
    allChildren.push(new Paragraph({
      spacing: { before: 200, after: 60 },
      border: { left: { style: BorderStyle.SINGLE, size: 6, color: COLORS.teal, space: 8 } },
      children: [new TextRun({ text: d.title, bold: true, size: 22, font: 'Arial', color: COLORS.dark })]
    }));
    allChildren.push(new Paragraph({
      spacing: { before: 20, after: 60 },
      indent: { left: 300 },
      children: [new TextRun({ text: d.desc, size: 18, font: 'Arial', color: COLORS.text })]
    }));
  });

  // Final investment box
  allChildren.push(spacer(200));
  allChildren.push(new Paragraph({
    spacing: { before: 100, after: 60 },
    shading: { fill: COLORS.lightGray, type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: COLORS.teal, space: 8 } },
    children: [new TextRun({ text: `INVESTIMENTO TOTAL: ${formatCurrencyBR(precoFinal)}`, bold: true, size: 26, font: 'Arial', color: COLORS.dark })]
  }));
  allChildren.push(new Paragraph({
    indent: { left: 300 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text: `Proposta válida por 15 dias a partir de ${new Date().toLocaleDateString('pt-BR')}`, size: 18, font: 'Arial', color: COLORS.text })]
  }));
  allChildren.push(new Paragraph({
    indent: { left: 300 },
    spacing: { before: 0, after: 100 },
    children: [new TextRun({ text: `Condições: ${pagamento.assinatura}% assinatura | ${pagamento.projeto}% entrega projeto | ${pagamento.medicoes}% medições`, size: 18, font: 'Arial', color: COLORS.teal })]
  }));
  allChildren.push(tealFooter());

  // Create document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: A4.width, height: A4.height, orientation: 'portrait' },
          margin: MARGINS,
        }
      },
      children: allChildren,
    }]
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}
