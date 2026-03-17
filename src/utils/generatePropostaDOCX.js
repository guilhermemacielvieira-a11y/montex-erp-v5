/**
 * Gerador de Proposta Comercial DOCX — Modelo 2026 GRUPO MONTEX
 * Usa a biblioteca `docx` para gerar o arquivo a partir dos dados do simulador
 * e do template carregado do Supabase (entity_store).
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
  PageBreak,
  VerticalAlign,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';

// ─── Cores do Modelo 2026 ────────────────────────────────────────────────────
const COR_PRIMARIA  = '1E3A5F'; // Azul escuro Montex
const COR_SECUNDARIA = '2563EB'; // Azul médio
const COR_DESTAQUE  = 'F59E0B'; // Âmbar
const COR_BRANCO    = 'FFFFFF';
const COR_CINZA_CLARO = 'F3F4F6';
const COR_CINZA_MEDIO = 'E5E7EB';
const COR_TEXTO     = '111827';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtNum = (v, d = 2) =>
  Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

const fmtDate = (s) => {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('pt-BR'); } catch { return s; }
};

const bold = (text, size = 22, color = COR_TEXTO) =>
  new TextRun({ text, bold: true, size, color });

const normal = (text, size = 20, color = COR_TEXTO) =>
  new TextRun({ text, size, color });

const paragrafo = (runs, opts = {}) =>
  new Paragraph({ children: Array.isArray(runs) ? runs : [runs], ...opts });

const quebra = () => new Paragraph({ children: [new TextRun({ text: '' })] });

// ─── Célula de tabela com estilo ─────────────────────────────────────────────

const celula = (text, opts = {}) => {
  const {
    bold: isBold = false,
    bg = null,
    color = COR_TEXTO,
    size = 18,
    align = AlignmentType.LEFT,
    vAlign = VerticalAlign.CENTER,
    colspan = 1,
    rowspan = 1,
    borders = {},
  } = opts;

  return new TableCell({
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({ text: String(text ?? ''), bold: isBold, size, color }),
        ],
      }),
    ],
    columnSpan: colspan,
    rowSpan: rowspan,
    verticalAlign: vAlign,
    shading: bg ? { type: ShadingType.SOLID, color: bg, fill: bg } : undefined,
    margins: {
      top: convertInchesToTwip(0.04),
      bottom: convertInchesToTwip(0.04),
      left: convertInchesToTwip(0.06),
      right: convertInchesToTwip(0.06),
    },
    borders: borders,
  });
};

// ─── Seção com título azul ────────────────────────────────────────────────────

const tituloSecao = (numero, texto) => [
  quebra(),
  new Paragraph({
    children: [
      new TextRun({ text: `${numero}. `, bold: true, size: 24, color: COR_DESTAQUE }),
      new TextRun({ text: texto.toUpperCase(), bold: true, size: 24, color: COR_BRANCO }),
    ],
    shading: { type: ShadingType.SOLID, color: COR_PRIMARIA, fill: COR_PRIMARIA },
    spacing: { before: 200, after: 160 },
    indent: { left: 160, right: 160 },
  }),
];

// ─── GERADOR PRINCIPAL ────────────────────────────────────────────────────────

export async function generatePropostaDOCX({ project, setores, calculations, unitCosts, paymentConditions, cronograma, escopo, template }) {

  // Dados do template (Modelo 2026 do Supabase)
  const T = template || {};
  const empresa = T.empresa || {};
  const portfolio = T.portfolio || [];
  const diferenciais = T.diferenciais || [];
  const fasesPadrao = T.fases_padrao || [];

  // Cálculos agregados da proposta
  const totalItens = setores.reduce((s, sec) => s + sec.itens.length, 0);
  const totalPeso = setores.reduce((sum, s) => {
    const grupos = {};
    (s.itens || []).forEach(item => {
      if (item.unidade === 'KG') {
        const base = (item.descricao || '').split(' - ')[0].trim();
        if (!grupos[base] || (item.quantidade || 0) > grupos[base]) {
          grupos[base] = item.quantidade || 0;
        }
      }
    });
    return sum + Object.values(grupos).reduce((a, b) => a + b, 0);
  }, 0);

  const precoMedio = totalPeso > 0 ? (calculations.precoFinal || 0) / totalPeso : 0;
  const prazoTotal = (cronograma.projeto || 0) + (cronograma.fabricacao || 0) + (cronograma.montagem || 0);

  // ─── SEÇÃO 1: CAPA ───────────────────────────────────────────────────────

  const secaoCapa = [
    quebra(),
    new Paragraph({
      children: [bold(empresa.nome || 'GRUPO MONTEX', 56, COR_BRANCO)],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: COR_PRIMARIA, fill: COR_PRIMARIA },
      spacing: { before: 400, after: 100 },
    }),
    new Paragraph({
      children: [bold(empresa.subtitulo || 'SOLUÇÕES MODULARES', 28, COR_DESTAQUE)],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: COR_PRIMARIA, fill: COR_PRIMARIA },
      spacing: { before: 0, after: 400 },
    }),
    quebra(),
    new Paragraph({
      children: [bold('PROPOSTA COMERCIAL', 40, COR_PRIMARIA)],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 120 },
    }),
    new Paragraph({
      children: [bold(`Nº ${project.numeroPropostas || '----'}`, 28, COR_SECUNDARIA)],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
    }),
    new Paragraph({
      children: [
        normal('Emissão: ', 20),
        bold(fmtDate(project.dataEmissao), 20, COR_PRIMARIA),
        normal('     |     Validade: ', 20),
        bold(fmtDate(project.dataValidade), 20, COR_PRIMARIA),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
    }),
    quebra(),
    // Linha divisória
    new Paragraph({
      children: [bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 24, COR_SECUNDARIA)],
      alignment: AlignmentType.CENTER,
    }),
    quebra(),
    // Dados do projeto
    new Paragraph({
      children: [bold('PROJETO: ', 22, COR_PRIMARIA), bold(project.nome || '', 22, COR_TEXTO)],
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
    }),
    new Paragraph({
      children: [bold('CLIENTE: ', 22, COR_PRIMARIA), bold(project.cliente || '', 22, COR_TEXTO)],
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 60 },
    }),
    new Paragraph({
      children: [bold('REGIÃO: ', 22, COR_PRIMARIA), normal(project.regiao || '', 22)],
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 200 },
    }),
    quebra(),
    // KPIs capa
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            celula(`${fmtNum(totalPeso, 0)} kg\nde aço`, { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, align: AlignmentType.CENTER, size: 20 }),
            celula(fmt(calculations.precoFinal || 0) + '\nvalor total', { bold: true, bg: COR_SECUNDARIA, color: COR_BRANCO, align: AlignmentType.CENTER, size: 20 }),
            celula(`${prazoTotal} dias\nprazo total`, { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, align: AlignmentType.CENTER, size: 20 }),
            celula(`${T.validadeProposta || 15} dias\nvalidade`, { bold: true, bg: COR_DESTAQUE, color: COR_BRANCO, align: AlignmentType.CENTER, size: 20 }),
          ],
        }),
      ],
    }),
  ];

  // ─── SEÇÃO 2: SOBRE A EMPRESA ─────────────────────────────────────────────

  const secaoSobre = [
    ...tituloSecao('1', 'SOBRE O GRUPO MONTEX'),
    quebra(),
    paragrafo(normal(T.sobre || '', 20), { spacing: { after: 160 }, indent: { left: 160, right: 160 } }),
    quebra(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            celula('MISSÃO', { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, size: 20 }),
            celula('VISÃO', { bold: true, bg: COR_SECUNDARIA, color: COR_BRANCO, size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            celula(T.missao || '', { size: 18 }),
            celula(T.visao || '', { size: 18 }),
          ],
        }),
      ],
    }),
  ];

  // ─── SEÇÃO 3: PORTFÓLIO ───────────────────────────────────────────────────

  const portfolioRows = portfolio.map(p =>
    new TableRow({
      children: [
        celula(p.nome, { bold: true, size: 20, bg: COR_CINZA_CLARO }),
        celula(p.itens.join(' • '), { size: 18 }),
      ],
    })
  );

  const secaoPortfolio = [
    ...tituloSecao('2', 'PORTFÓLIO DE REFERÊNCIAS'),
    quebra(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            celula('OBRA', { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, size: 20 }),
            celula('SERVIÇOS EXECUTADOS', { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, size: 20 }),
          ],
        }),
        ...portfolioRows,
      ],
    }),
  ];

  // ─── SEÇÃO 4: DADOS DO PROJETO ────────────────────────────────────────────

  const secaoDados = [
    ...tituloSecao('3', 'DADOS DO PROJETO'),
    quebra(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            celula('Projeto', { bold: true, bg: COR_CINZA_CLARO, size: 20 }),
            celula(project.nome || '', { size: 20 }),
            celula('Cliente', { bold: true, bg: COR_CINZA_CLARO, size: 20 }),
            celula(project.cliente || '', { size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            celula('Tipo', { bold: true, bg: COR_CINZA_CLARO, size: 20 }),
            celula(project.tipo || '', { size: 20 }),
            celula('Região', { bold: true, bg: COR_CINZA_CLARO, size: 20 }),
            celula(project.regiao || '', { size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            celula('Proposta Nº', { bold: true, bg: COR_CINZA_CLARO, size: 20 }),
            celula(project.numeroPropostas || '', { size: 20 }),
            celula('Emissão', { bold: true, bg: COR_CINZA_CLARO, size: 20 }),
            celula(fmtDate(project.dataEmissao), { size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            celula('Validade', { bold: true, bg: COR_CINZA_CLARO, size: 20 }),
            celula(fmtDate(project.dataValidade), { size: 20 }),
            celula('Prazo Total', { bold: true, bg: COR_CINZA_CLARO, size: 20 }),
            celula(`${prazoTotal} dias`, { size: 20 }),
          ],
        }),
      ],
    }),
  ];

  // ─── SEÇÃO 5: ORÇAMENTO POR SETOR ────────────────────────────────────────

  const setoresRows = [];
  setores.forEach((setor, idx) => {
    const setorTotal = setor.itens.reduce((s, i) => s + (i.quantidade * i.preco), 0);

    // Cabeçalho do setor
    setoresRows.push(
      new TableRow({
        children: [
          celula(`ETAPA ${idx + 1} — ${(setor.nome || '').toUpperCase()}`, {
            bold: true, bg: COR_SECUNDARIA, color: COR_BRANCO, colspan: 5, size: 20,
          }),
        ],
      }),
      new TableRow({
        children: [
          celula('DESCRIÇÃO', { bold: true, bg: COR_CINZA_MEDIO, size: 18 }),
          celula('UN', { bold: true, bg: COR_CINZA_MEDIO, align: AlignmentType.CENTER, size: 18 }),
          celula('QTD', { bold: true, bg: COR_CINZA_MEDIO, align: AlignmentType.CENTER, size: 18 }),
          celula('UNIT.', { bold: true, bg: COR_CINZA_MEDIO, align: AlignmentType.RIGHT, size: 18 }),
          celula('TOTAL', { bold: true, bg: COR_CINZA_MEDIO, align: AlignmentType.RIGHT, size: 18 }),
        ],
      })
    );

    setor.itens.forEach(item => {
      setoresRows.push(
        new TableRow({
          children: [
            celula(item.descricao || '', { size: 18 }),
            celula(item.unidade || '', { align: AlignmentType.CENTER, size: 18 }),
            celula(fmtNum(item.quantidade), { align: AlignmentType.CENTER, size: 18 }),
            celula(fmt(item.preco), { align: AlignmentType.RIGHT, size: 18 }),
            celula(fmt(item.quantidade * item.preco), { align: AlignmentType.RIGHT, size: 18 }),
          ],
        })
      );
    });

    setoresRows.push(
      new TableRow({
        children: [
          celula(`SUBTOTAL ETAPA ${idx + 1}`, { bold: true, colspan: 4, bg: COR_CINZA_CLARO, size: 18 }),
          celula(fmt(setorTotal), { bold: true, align: AlignmentType.RIGHT, bg: COR_CINZA_CLARO, size: 18 }),
        ],
      })
    );
  });

  const secaoOrcamento = [
    ...tituloSecao('4', `ORÇAMENTO DETALHADO — ${setores.length} ETAPAS | ${totalItens} ITENS`),
    quebra(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [4000, 800, 1200, 1600, 1800],
      rows: setoresRows,
    }),
  ];

  // ─── SEÇÃO 6: ANÁLISE DO INVESTIMENTO ────────────────────────────────────

  const secaoInvestimento = [
    ...tituloSecao('5', 'ANÁLISE DO INVESTIMENTO'),
    quebra(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            celula('COMPOSIÇÃO', { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, size: 20 }),
            celula('VALOR', { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, align: AlignmentType.RIGHT, size: 20 }),
            celula('% DO TOTAL', { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, align: AlignmentType.RIGHT, size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            celula('Material (chapas, perfis, cobertura)', { size: 18 }),
            celula(fmt(calculations.custoMaterial || 0), { align: AlignmentType.RIGHT, size: 18 }),
            celula(
              `${fmtNum(((calculations.custoMaterial || 0) / (calculations.precoFinal || 1)) * 100, 1)}%`,
              { align: AlignmentType.RIGHT, size: 18 }
            ),
          ],
        }),
        new TableRow({
          children: [
            celula('Instalação (Fabricação, Pintura, Transporte, Montagem)', { size: 18 }),
            celula(fmt(calculations.custoInstalacao || 0), { align: AlignmentType.RIGHT, size: 18 }),
            celula(
              `${fmtNum(((calculations.custoInstalacao || 0) / (calculations.precoFinal || 1)) * 100, 1)}%`,
              { align: AlignmentType.RIGHT, size: 18 }
            ),
          ],
        }),
        new TableRow({
          children: [
            celula('Margem e BDI', { size: 18 }),
            celula(
              fmt((calculations.precoFinal || 0) - (calculations.custoMaterial || 0) - (calculations.custoInstalacao || 0)),
              { align: AlignmentType.RIGHT, size: 18 }
            ),
            celula(
              `${fmtNum((((calculations.precoFinal || 0) - (calculations.custoMaterial || 0) - (calculations.custoInstalacao || 0)) / (calculations.precoFinal || 1)) * 100, 1)}%`,
              { align: AlignmentType.RIGHT, size: 18 }
            ),
          ],
        }),
        new TableRow({
          children: [
            celula('INVESTIMENTO TOTAL', { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, size: 22 }),
            celula(fmt(calculations.precoFinal || 0), { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, align: AlignmentType.RIGHT, size: 22 }),
            celula('100%', { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, align: AlignmentType.RIGHT, size: 22 }),
          ],
        }),
      ],
    }),
    quebra(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            celula('Peso Total', { bold: true, bg: COR_CINZA_CLARO, align: AlignmentType.CENTER, size: 20 }),
            celula('Preço Médio/kg', { bold: true, bg: COR_CINZA_CLARO, align: AlignmentType.CENTER, size: 20 }),
            celula('Margem Aplicada', { bold: true, bg: COR_CINZA_CLARO, align: AlignmentType.CENTER, size: 20 }),
            celula('Impostos', { bold: true, bg: COR_CINZA_CLARO, align: AlignmentType.CENTER, size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            celula(`${fmtNum(totalPeso, 0)} kg`, { bold: true, align: AlignmentType.CENTER, size: 22 }),
            celula(fmt(precoMedio) + '/kg', { bold: true, align: AlignmentType.CENTER, size: 22 }),
            celula(`${fmtNum(calculations.margemPct || 0, 1)}%`, { bold: true, align: AlignmentType.CENTER, size: 22 }),
            celula(`${fmtNum(calculations.impostosPct || 0, 1)}%`, { bold: true, align: AlignmentType.CENTER, size: 22 }),
          ],
        }),
      ],
    }),
  ];

  // ─── SEÇÃO 7: CONDIÇÕES DE PAGAMENTO ─────────────────────────────────────

  const secaoPagamento = [
    ...tituloSecao('6', 'CONDIÇÕES DE PAGAMENTO'),
    quebra(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            celula('MOMENTO', { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, align: AlignmentType.CENTER, size: 20 }),
            celula('%', { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, align: AlignmentType.CENTER, size: 20 }),
            celula('VALOR', { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, align: AlignmentType.RIGHT, size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            celula('Na Assinatura do Contrato', { size: 20 }),
            celula(`${paymentConditions.assinatura || 10}%`, { align: AlignmentType.CENTER, size: 20 }),
            celula(fmt((calculations.precoFinal * (paymentConditions.assinatura || 10)) / 100), { align: AlignmentType.RIGHT, bold: true, size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            celula('Aprovação do Projeto Executivo', { size: 20 }),
            celula(`${paymentConditions.aprovacao || 5}%`, { align: AlignmentType.CENTER, size: 20 }),
            celula(fmt((calculations.precoFinal * (paymentConditions.aprovacao || 5)) / 100), { align: AlignmentType.RIGHT, bold: true, size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            celula('Medições Mensais (conforme avanço físico)', { size: 20 }),
            celula(`${paymentConditions.medicoes || 85}%`, { align: AlignmentType.CENTER, size: 20 }),
            celula(fmt((calculations.precoFinal * (paymentConditions.medicoes || 85)) / 100), { align: AlignmentType.RIGHT, bold: true, size: 20 }),
          ],
        }),
      ],
    }),
  ];

  // ─── SEÇÃO 8: CRONOGRAMA ──────────────────────────────────────────────────

  // Calcular prazo de cada fase proporcional
  const proporcoes = { projeto: cronograma.projeto || 0, fabricacao: cronograma.fabricacao || 0, montagem: cronograma.montagem || 0 };
  const fasesComPrazo = fasesPadrao.map((f, i) => {
    let prazo = '';
    if (i === 0) prazo = `${proporcoes.projeto} dias`;
    else if (i === 2) prazo = `${proporcoes.fabricacao} dias`;
    else if (i === 5) prazo = `${proporcoes.montagem} dias`;
    else prazo = f.prazo || '–';
    return { ...f, prazoFinal: prazo };
  });

  const secaoCronograma = [
    ...tituloSecao('7', `CRONOGRAMA DE EXECUÇÃO — ${prazoTotal} DIAS`),
    quebra(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            celula('FASE', { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, size: 20 }),
            celula('PRAZO', { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, align: AlignmentType.CENTER, size: 20 }),
            celula('DESCRIÇÃO', { bold: true, bg: COR_PRIMARIA, color: COR_BRANCO, size: 20 }),
          ],
        }),
        ...fasesComPrazo.map((f, i) =>
          new TableRow({
            children: [
              celula(f.fase, { bold: true, bg: i % 2 === 0 ? COR_CINZA_CLARO : COR_BRANCO, size: 18 }),
              celula(f.prazoFinal, { align: AlignmentType.CENTER, bg: i % 2 === 0 ? COR_CINZA_CLARO : COR_BRANCO, size: 18 }),
              celula(f.descricao, { bg: i % 2 === 0 ? COR_CINZA_CLARO : COR_BRANCO, size: 18 }),
            ],
          })
        ),
        new TableRow({
          children: [
            celula('PRAZO TOTAL', { bold: true, bg: COR_DESTAQUE, color: COR_BRANCO, size: 20 }),
            celula(`${prazoTotal} dias`, { bold: true, bg: COR_DESTAQUE, color: COR_BRANCO, align: AlignmentType.CENTER, size: 20 }),
            celula('', { bg: COR_DESTAQUE }),
          ],
        }),
      ],
    }),
  ];

  // ─── SEÇÃO 9: ESCOPO ──────────────────────────────────────────────────────

  const secaoEscopo = [
    ...tituloSecao('8', 'ESCOPO DO FORNECIMENTO'),
    quebra(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            celula('✅  INCLUSO', { bold: true, bg: '065F46', color: COR_BRANCO, size: 20 }),
            celula('❌  NÃO INCLUSO', { bold: true, bg: '991B1B', color: COR_BRANCO, size: 20 }),
          ],
        }),
        new TableRow({
          children: [
            celula(escopo.incluso || '', { size: 18 }),
            celula(escopo.naoIncluso || '', { size: 18 }),
          ],
        }),
      ],
    }),
  ];

  // ─── SEÇÃO 10: OBRIGAÇÕES ─────────────────────────────────────────────────

  const secaoObrigacoes = [
    ...tituloSecao('9', 'OBRIGAÇÕES DO CONTRATANTE'),
    quebra(),
    paragrafo(normal(cronograma.obrigacoes || '', 18), {
      spacing: { after: 160 },
      indent: { left: 160, right: 160 },
    }),
  ];

  // ─── SEÇÃO 11: DIFERENCIAIS ───────────────────────────────────────────────

  const diferencialRows = [];
  for (let i = 0; i < diferenciais.length; i += 2) {
    const d1 = diferenciais[i] || {};
    const d2 = diferenciais[i + 1] || {};
    diferencialRows.push(
      new TableRow({
        children: [
          celula(
            `${d1.icon || '⭐'}  ${d1.titulo || ''}\n${d1.descricao || ''}`,
            { bg: COR_CINZA_CLARO, bold: false, size: 18 }
          ),
          celula(
            `${d2.icon || '⭐'}  ${d2.titulo || ''}\n${d2.descricao || ''}`,
            { bg: COR_CINZA_CLARO, bold: false, size: 18 }
          ),
        ],
      })
    );
  }

  const secaoDiferenciais = [
    ...tituloSecao('10', 'POR QUE ESCOLHER O GRUPO MONTEX?'),
    quebra(),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: diferencialRows,
    }),
  ];

  // ─── RODAPÉ / VALIDADE ────────────────────────────────────────────────────

  const secaoRodape = [
    quebra(),
    new Paragraph({
      children: [
        bold(
          `INVESTIMENTO TOTAL: ${fmt(calculations.precoFinal || 0)}  |  Proposta válida por ${T.validadeProposta || 15} dias  |  Garantia: ${T.garantia || '5 anos'}`,
          20,
          COR_BRANCO
        ),
      ],
      alignment: AlignmentType.CENTER,
      shading: { type: ShadingType.SOLID, color: COR_PRIMARIA, fill: COR_PRIMARIA },
      spacing: { before: 200, after: 200 },
    }),
    quebra(),
    new Paragraph({
      children: [bold(`${empresa.telefone || ''}  |  ${empresa.email || ''}  |  ${empresa.site || ''}`, 18, COR_SECUNDARIA)],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 100 },
    }),
    quebra(),
    quebra(),
    // Assinaturas
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            celula('', { size: 18 }),
            celula('', { size: 18 }),
          ],
        }),
        new TableRow({
          children: [
            celula('_______________________________\nGRUPO MONTEX\nResponsável Técnico', { align: AlignmentType.CENTER, size: 18 }),
            celula(`_______________________________\n${project.cliente || 'CONTRATANTE'}\nRepresentante Legal`, { align: AlignmentType.CENTER, size: 18 }),
          ],
        }),
        new TableRow({
          children: [
            celula(`Local e Data: _________________, ___/___/${new Date().getFullYear()}`, { colspan: 2, align: AlignmentType.CENTER, size: 16 }),
          ],
        }),
      ],
    }),
  ];

  // ─── MONTAGEM DO DOCUMENTO ────────────────────────────────────────────────

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20, color: COR_TEXTO },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
              bottom: convertInchesToTwip(0.75),
              left: convertInchesToTwip(0.75),
            },
          },
        },
        children: [
          ...secaoCapa,
          new Paragraph({ children: [new PageBreak()] }),
          ...secaoSobre,
          ...secaoPortfolio,
          new Paragraph({ children: [new PageBreak()] }),
          ...secaoDados,
          ...secaoOrcamento,
          new Paragraph({ children: [new PageBreak()] }),
          ...secaoInvestimento,
          ...secaoPagamento,
          ...secaoCronograma,
          new Paragraph({ children: [new PageBreak()] }),
          ...secaoEscopo,
          ...secaoObrigacoes,
          ...secaoDiferenciais,
          ...secaoRodape,
        ],
      },
    ],
  });

  // ─── DOWNLOAD ─────────────────────────────────────────────────────────────

  const blob = await Packer.toBlob(doc);
  const filename = `Proposta_${(project.numeroPropostas || 'MONTEX').replace(/[/\\]/g, '-')}_${project.cliente || 'Cliente'}.docx`;
  saveAs(blob, filename);

  return filename;
}
