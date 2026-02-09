/**
 * MONTEX ERP Premium - Base de Dados Financeira de Obras
 *
 * Sistema completo de gestão financeira de obras com:
 * - Contratos e valores
 * - Lançamentos de despesas
 * - Material faturado direto
 * - Medições (Fabricação/Montagem)
 * - Saldo restante automático
 */

// ==================== ENUMS E TIPOS ====================

export const TIPO_LANCAMENTO = {
  DESPESA: 'despesa',
  MATERIAL_FATURADO: 'material_faturado',
  MEDICAO_FABRICACAO: 'medicao_fabricacao',
  MEDICAO_MONTAGEM: 'medicao_montagem',
  ADIANTAMENTO: 'adiantamento',
  RETENCAO: 'retencao',
  DEVOLUCAO: 'devolucao'
};

export const STATUS_LANCAMENTO = {
  PENDENTE: 'pendente',
  APROVADO: 'aprovado',
  PAGO: 'pago',
  CANCELADO: 'cancelado',
  FATURADO: 'faturado',
  // Novos status para despesas futuras
  PRE_APROVADO: 'pre_aprovado',
  FUTURO: 'futuro'
};

// Status para pedidos pré-aprovados
export const STATUS_PEDIDO_FUTURO = {
  AGUARDANDO_ENTREGA: 'aguardando_entrega',
  EM_PRODUCAO: 'em_producao',
  PARCIAL_ENTREGUE: 'parcial_entregue',
  ENTREGUE: 'entregue',
  CANCELADO: 'cancelado'
};

export const CATEGORIA_DESPESA = {
  MATERIAL_ESTRUTURA: 'material_estrutura',
  MATERIAL_COBERTURA: 'material_cobertura',
  MATERIAL_FECHAMENTO: 'material_fechamento',
  MATERIAL_COMPLEMENTOS: 'material_complementos',
  MAO_DE_OBRA_FABRICA: 'mao_de_obra_fabrica',
  MAO_DE_OBRA_MONTAGEM: 'mao_de_obra_montagem',
  TERCEIRIZADOS: 'terceirizados',
  TRANSPORTE: 'transporte',
  EQUIPAMENTOS: 'equipamentos',
  COMBUSTIVEL: 'combustivel',
  CONSUMIVEIS: 'consumiveis',
  PINTURA: 'pintura',
  GALVANIZACAO: 'galvanizacao',
  PROJETO: 'projeto',
  ADMINISTRATIVO: 'administrativo',
  IMPOSTOS: 'impostos',
  OUTROS: 'outros'
};

export const STATUS_MEDICAO = {
  AGUARDANDO: 'aguardando',
  EM_ANALISE: 'em_analise',
  APROVADA: 'aprovada',
  FATURADA: 'faturada',
  PAGA: 'paga',
  REJEITADA: 'rejeitada'
};

export const ETAPA_MEDICAO = {
  FABRICACAO: 'fabricacao',
  MONTAGEM: 'montagem'
};

// ==================== TIPOS DE RECEITA (MEDIÇÕES) ====================
export const TIPO_RECEITA = {
  ENTRADA: 'entrada',           // Entrada inicial do contrato
  CHAPARIA: 'chaparia',         // Medição de chaparia/corte
  FABRICACAO: 'fabricacao',     // Medição de fabricação
  MONTAGEM: 'montagem',         // Medição de montagem
  RETENCAO: 'retencao',         // Liberação de retenção
  ADIANTAMENTO: 'adiantamento', // Adiantamentos
  OUTROS: 'outros'
};

// Status do DRE
export const STATUS_DRE = {
  REALIZADO: 'realizado',
  PREVISTO: 'previsto',
  ORCADO: 'orcado'
};

// Categorias DRE
export const CATEGORIA_DRE = {
  // RECEITAS
  RECEITA_FABRICACAO: 'receita_fabricacao',
  RECEITA_MONTAGEM: 'receita_montagem',
  RECEITA_ENTRADA: 'receita_entrada',
  RECEITA_CHAPARIA: 'receita_chaparia',
  RECEITA_RETENCAO: 'receita_retencao',

  // CUSTOS DIRETOS
  CUSTO_MATERIAL: 'custo_material',
  CUSTO_MAO_OBRA_DIRETA: 'custo_mao_obra_direta',
  CUSTO_TERCEIROS: 'custo_terceiros',
  CUSTO_TRANSPORTE: 'custo_transporte',
  CUSTO_CONSUMIVEIS: 'custo_consumiveis',

  // CUSTOS INDIRETOS
  CUSTO_ADMINISTRATIVO: 'custo_administrativo',
  CUSTO_EQUIPAMENTOS: 'custo_equipamentos',
  CUSTO_OVERHEAD: 'custo_overhead'
};

// ==================== STATUS DE MATERIAL/ESTOQUE ====================
export const STATUS_MATERIAL = {
  PEDIDO: 'pedido',             // Material pedido, aguardando entrega
  PARCIAL: 'parcial',           // Entrega parcial
  ENTREGUE: 'entregue',         // Totalmente entregue
  EM_ESTOQUE: 'em_estoque',     // Disponível no estoque
  EM_PRODUCAO: 'em_producao',   // Em uso na produção
  CONSUMIDO: 'consumido'        // Totalmente utilizado
};

export const TIPO_MATERIAL = {
  PERFIL_W: 'perfil_w',
  PERFIL_HP: 'perfil_hp',
  CANTONEIRA: 'cantoneira',
  CHAPA: 'chapa',
  BARRA_REDONDA: 'barra_redonda',
  TUBO: 'tubo',
  OUTROS: 'outros'
};

// ==================== PEDIDOS DE MATERIAL (CONTROLE PEDIDO X ENTREGA) ====================
// Dados extraídos da planilha "LANÇAMENTO PEDIDO X ENTREGA SUPER LUNA BELO VALE"
// Vinculado diretamente ao estoque da obra antes do início da produção

export const PEDIDOS_MATERIAL = [
  // PERFIS W - ENTREGUES
  {
    id: 'mat-001',
    obraId: 'obra-001',
    codigo: 'W310X79-6M',
    descricao: 'W310X79 6M',
    tipo: TIPO_MATERIAL.PERFIL_W,
    unidade: 'KG',

    // PEDIDO
    pesoPedido: 5214,
    valorUnitario: 8.3173,
    valorTotalPedido: 43366.40,

    // ENTREGA
    dataEntrega: '2026-01-26',
    pesoEntregue: 5214,
    pesoFaltaEntregar: 0,

    // STATUS
    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    // ESTOQUE
    disponivelEstoque: 5214,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    notaFiscal: 'NF-218191',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-002',
    obraId: 'obra-001',
    codigo: 'W410X53-6M',
    descricao: 'W410X53 6M',
    tipo: TIPO_MATERIAL.PERFIL_W,
    unidade: 'KG',

    pesoPedido: 5724,
    valorUnitario: 7.694196,
    valorTotalPedido: 44041.58,

    dataEntrega: '2026-01-26',
    pesoEntregue: 5724,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 5724,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    notaFiscal: 'NF-218191',
    setor: 'SUPERMERCADO'
  },

  // BARRAS REDONDAS
  {
    id: 'mat-003',
    obraId: 'obra-001',
    codigo: 'BARRED-1-A36',
    descricao: 'BARRA REDONDA 1" A36',
    tipo: TIPO_MATERIAL.BARRA_REDONDA,
    unidade: 'KG',

    pesoPedido: 430,
    valorUnitario: 7.037186,
    valorTotalPedido: 3025.99,

    dataEntrega: null,
    pesoEntregue: 430,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 430,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-004',
    obraId: 'obra-001',
    codigo: 'BARRED-5/8-A36',
    descricao: 'BARRA REDONDA 5/8" A36',
    tipo: TIPO_MATERIAL.BARRA_REDONDA,
    unidade: 'KG',

    pesoPedido: 1180,
    valorUnitario: 7.037186,
    valorTotalPedido: 8303.88,

    dataEntrega: null,
    pesoEntregue: 1180,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 1180,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-005',
    obraId: 'obra-001',
    codigo: 'BARRED-1/2-GG',
    descricao: 'BARRA REDONDA 1/2" GG',
    tipo: TIPO_MATERIAL.BARRA_REDONDA,
    unidade: 'KG',

    pesoPedido: 606.532,
    valorUnitario: 7.037188,
    valorTotalPedido: 4268.28,

    dataEntrega: null,
    pesoEntregue: 606.532,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 606.532,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },

  // CANTONEIRAS
  {
    id: 'mat-006',
    obraId: 'obra-001',
    codigo: 'CANT-1.5X1/8',
    descricao: 'CANTONEIRA 1.1/2"x1/8"',
    tipo: TIPO_MATERIAL.CANTONEIRA,
    unidade: 'KG',

    pesoPedido: 131.76,
    valorUnitario: 7.037189,
    valorTotalPedido: 927.22,

    dataEntrega: null,
    pesoEntregue: 131.76,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 131.76,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-007',
    obraId: 'obra-001',
    codigo: 'CANT-3X3/8-6M',
    descricao: 'CANTONEIRA 3"x3/8" 6M',
    tipo: TIPO_MATERIAL.CANTONEIRA,
    unidade: 'KG',

    pesoPedido: 64.26,
    valorUnitario: 7.740896,
    valorTotalPedido: 497.43,

    dataEntrega: null,
    pesoEntregue: 64.26,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 64.26,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-008',
    obraId: 'obra-001',
    codigo: 'CANT-2X1/4-12M',
    descricao: 'CANTONEIRA 2"x1/4" 12M',
    tipo: TIPO_MATERIAL.CANTONEIRA,
    unidade: 'KG',

    pesoPedido: 2730.24,
    valorUnitario: 7.037195,
    valorTotalPedido: 19213.23,

    dataEntrega: null,
    pesoEntregue: 2730.24,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 2730.24,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },

  // PERFIS W - COM PENDÊNCIA
  {
    id: 'mat-009',
    obraId: 'obra-001',
    codigo: 'W250X25.3-12M',
    descricao: 'W250X25,3 12M',
    tipo: TIPO_MATERIAL.PERFIL_W,
    unidade: 'KG',

    pesoPedido: 607,
    valorUnitario: 7.694201,
    valorTotalPedido: 4670.38,

    dataEntrega: null,
    pesoEntregue: 7286.4, // Entregue mais que pedido (ajuste)
    pesoFaltaEntregar: -6679.4, // Excesso

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 7286.4,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO',
    observacao: 'Recebido a mais - ajuste de pedido'
  },
  {
    id: 'mat-010',
    obraId: 'obra-001',
    codigo: 'W150X22.5-6M',
    descricao: 'W150X22,5 6M',
    tipo: TIPO_MATERIAL.PERFIL_W,
    unidade: 'KG',

    pesoPedido: 675,
    valorUnitario: 7.694207,
    valorTotalPedido: 5193.59,

    dataEntrega: null,
    pesoEntregue: 675,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 675,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-011',
    obraId: 'obra-001',
    codigo: 'W530X66-12M',
    descricao: 'W530X66 12M',
    tipo: TIPO_MATERIAL.PERFIL_W,
    unidade: 'KG',

    pesoPedido: 792,
    valorUnitario: 7.694192,
    valorTotalPedido: 6093.80,

    dataEntrega: null,
    pesoEntregue: 792,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 792,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-012',
    obraId: 'obra-001',
    codigo: 'W410X38.8-12M',
    descricao: 'W410X38,8 12M',
    tipo: TIPO_MATERIAL.PERFIL_W,
    unidade: 'KG',

    pesoPedido: 12571,
    valorUnitario: 7.694196,
    valorTotalPedido: 96723.74,

    dataEntrega: null,
    pesoEntregue: 12571,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 12571,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-013',
    obraId: 'obra-001',
    codigo: 'W200X35.9-6M',
    descricao: 'W200X35,9 6M',
    tipo: TIPO_MATERIAL.PERFIL_W,
    unidade: 'KG',

    pesoPedido: 215.4,
    valorUnitario: 7.694197,
    valorTotalPedido: 1657.33,

    dataEntrega: null,
    pesoEntregue: 215.4,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 215.4,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-014',
    obraId: 'obra-001',
    codigo: 'W200X35.9-12M',
    descricao: 'W200X35,9 12M',
    tipo: TIPO_MATERIAL.PERFIL_W,
    unidade: 'KG',

    pesoPedido: 3015.6,
    valorUnitario: 7.694197,
    valorTotalPedido: 23202.62,

    dataEntrega: null,
    pesoEntregue: 3015.6,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 3015.6,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-015',
    obraId: 'obra-001',
    codigo: 'W200X19.3-12M',
    descricao: 'W200X19,3 12M',
    tipo: TIPO_MATERIAL.PERFIL_W,
    unidade: 'KG',

    pesoPedido: 3705,
    valorUnitario: 7.694197,
    valorTotalPedido: 28507.00,

    dataEntrega: null,
    pesoEntregue: 3705.6,
    pesoFaltaEntregar: -0.6, // Pequena diferença

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 3705.6,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-016',
    obraId: 'obra-001',
    codigo: 'W410X38.8-6M',
    descricao: 'W410X38,8 6M',
    tipo: TIPO_MATERIAL.PERFIL_W,
    unidade: 'KG',

    pesoPedido: 232.8,
    valorUnitario: 7.694201,
    valorTotalPedido: 1791.21,

    dataEntrega: null,
    pesoEntregue: 232.8,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 232.8,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-017',
    obraId: 'obra-001',
    codigo: 'W150X13-12M',
    descricao: 'W150X13 12M',
    tipo: TIPO_MATERIAL.PERFIL_W,
    unidade: 'KG',

    pesoPedido: 468,
    valorUnitario: 7.694188,
    valorTotalPedido: 3600.88,

    dataEntrega: null,
    pesoEntregue: 468,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 468,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-018',
    obraId: 'obra-001',
    codigo: 'HP310X79-12M',
    descricao: 'HP310X79 12M',
    tipo: TIPO_MATERIAL.PERFIL_HP,
    unidade: 'KG',

    pesoPedido: 1896,
    valorUnitario: 8.317305,
    valorTotalPedido: 15769.61,

    dataEntrega: null,
    pesoEntregue: 1896,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 1896,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },

  // CHAPAS
  {
    id: 'mat-019',
    obraId: 'obra-001',
    codigo: 'CHAPA-22.4X2550X3000',
    descricao: 'CHAPA A36 22,4x2550x3000',
    tipo: TIPO_MATERIAL.CHAPA,
    unidade: 'KG',

    pesoPedido: 2722.5,
    valorUnitario: 7.272492,
    valorTotalPedido: 19799.36,

    dataEntrega: null,
    pesoEntregue: 2742,
    pesoFaltaEntregar: -19.5, // Recebeu mais

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 2742,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-020',
    obraId: 'obra-001',
    codigo: 'CHAPA-12.5X1200X3000',
    descricao: 'CHAPA A36 12,5x1200x3000',
    tipo: TIPO_MATERIAL.CHAPA,
    unidade: 'KG',

    pesoPedido: 730,
    valorUnitario: 5.251822,
    valorTotalPedido: 3833.83,

    dataEntrega: null,
    pesoEntregue: 720,
    pesoFaltaEntregar: 10, // Faltou

    status: STATUS_MATERIAL.PARCIAL,
    percentualEntregue: 98.63,

    disponivelEstoque: 720,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-021',
    obraId: 'obra-001',
    codigo: 'CHAPA-9.5X1200X6000',
    descricao: 'CHAPA A36 9,5x1200x6000',
    tipo: TIPO_MATERIAL.CHAPA,
    unidade: 'KG',

    pesoPedido: 1090,
    valorUnitario: 5.251844,
    valorTotalPedido: 5724.51,

    dataEntrega: null,
    pesoEntregue: 1094,
    pesoFaltaEntregar: -4,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 1094,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-022',
    obraId: 'obra-001',
    codigo: 'CHAPA-6.3X1200X6000',
    descricao: 'CHAPA A36 6,3x1200x6000',
    tipo: TIPO_MATERIAL.CHAPA,
    unidade: 'KG',

    pesoPedido: 1830,
    valorUnitario: 5.251847,
    valorTotalPedido: 9610.88,

    dataEntrega: null,
    pesoEntregue: 1728,
    pesoFaltaEntregar: 102, // FALTA ENTREGAR

    status: STATUS_MATERIAL.PARCIAL,
    percentualEntregue: 94.43,

    disponivelEstoque: 1728,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO',
    observacao: 'PENDENTE: Falta 102 kg'
  },
  {
    id: 'mat-023',
    obraId: 'obra-001',
    codigo: 'CHAPA-4.75X1200X3000',
    descricao: 'CHAPA A36 4,75x1200x3000',
    tipo: TIPO_MATERIAL.CHAPA,
    unidade: 'KG',

    pesoPedido: 685,
    valorUnitario: 5.251854,
    valorTotalPedido: 3597.52,

    dataEntrega: null,
    pesoEntregue: 685,
    pesoFaltaEntregar: 0,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 685,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },
  {
    id: 'mat-024',
    obraId: 'obra-001',
    codigo: 'CHAPA-16X1200X3000',
    descricao: 'CHAPA A36 16x1200x3000',
    tipo: TIPO_MATERIAL.CHAPA,
    unidade: 'KG',

    pesoPedido: 1410,
    valorUnitario: 5.251837,
    valorTotalPedido: 7405.09,

    dataEntrega: null,
    pesoEntregue: 1356,
    pesoFaltaEntregar: 54, // FALTA ENTREGAR

    status: STATUS_MATERIAL.PARCIAL,
    percentualEntregue: 96.17,

    disponivelEstoque: 1356,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO',
    observacao: 'PENDENTE: Falta 54 kg'
  },
  {
    id: 'mat-025',
    obraId: 'obra-001',
    codigo: 'CHAPA-8X1500X6000',
    descricao: 'CHAPA A36 8x1500x6000',
    tipo: TIPO_MATERIAL.CHAPA,
    unidade: 'KG',

    pesoPedido: 1720,
    valorUnitario: 5.251843,
    valorTotalPedido: 9033.17,

    dataEntrega: null,
    pesoEntregue: 1728,
    pesoFaltaEntregar: -8,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 1728,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO'
  },

  // MATERIAIS COM PENDÊNCIA TOTAL (NÃO PEDIDOS / FALTA PEDIR)
  {
    id: 'mat-026',
    obraId: 'obra-001',
    codigo: 'W310X38.7-12M',
    descricao: 'W310X38,7 12M',
    tipo: TIPO_MATERIAL.PERFIL_W,
    unidade: 'KG',

    pesoPedido: 0, // Não tinha no pedido original
    valorUnitario: 7.694,
    valorTotalPedido: 0,

    dataEntrega: null,
    pesoEntregue: 2786.4,
    pesoFaltaEntregar: -2786.4, // Recebeu sem pedir (ajuste)

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 2786.4,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO',
    observacao: 'Material recebido por ajuste de pedido'
  },
  {
    id: 'mat-027',
    obraId: 'obra-001',
    codigo: 'W410X53-12M',
    descricao: 'W410X53 12M',
    tipo: TIPO_MATERIAL.PERFIL_W,
    unidade: 'KG',

    pesoPedido: 0,
    valorUnitario: 7.694,
    valorTotalPedido: 0,

    dataEntrega: null,
    pesoEntregue: 12720,
    pesoFaltaEntregar: -12720,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 12720,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO',
    observacao: 'Material recebido por ajuste de pedido'
  },
  {
    id: 'mat-028',
    obraId: 'obra-001',
    codigo: 'CHAPA-LQ-8X1000X2000',
    descricao: 'CHAPA LQ 8x1000x2000',
    tipo: TIPO_MATERIAL.CHAPA,
    unidade: 'KG',

    pesoPedido: 0,
    valorUnitario: 5.25,
    valorTotalPedido: 0,

    dataEntrega: null,
    pesoEntregue: 128,
    pesoFaltaEntregar: -128,

    status: STATUS_MATERIAL.ENTREGUE,
    percentualEntregue: 100,

    disponivelEstoque: 128,
    emProducao: 0,
    consumido: 0,

    fornecedor: 'Gerdau S/A',
    setor: 'SUPERMERCADO',
    observacao: 'Material adicional recebido'
  }
];

// ==================== RESUMO DO PEDIDO ====================

export const RESUMO_PEDIDO_MATERIAL = {
  obraId: 'obra-001',
  valorTotalPedido: 369858.53,
  valorTotalEntregue: 369858.53,
  diferenca: 0,

  // Resumo por tipo de material
  porTipo: {
    perfil_w: { pesoPedido: 32919, pesoEntregue: 55488.2, valorPedido: 256458.12 },
    perfil_hp: { pesoPedido: 1896, pesoEntregue: 1896, valorPedido: 15769.61 },
    cantoneira: { pesoPedido: 2926.26, pesoEntregue: 2926.26, valorPedido: 20637.88 },
    chapa: { pesoPedido: 10187.5, pesoEntregue: 10053, valorPedido: 58994.36 },
    barra_redonda: { pesoPedido: 2216.532, pesoEntregue: 2216.532, valorPedido: 15598.15 }
  },

  // Status geral
  totalItens: 28,
  itensCompletos: 23,
  itensParciais: 3,
  itensPendentes: 0,

  // Alertas
  alertas: [
    { material: 'CHAPA A36 6,3x1200x6000', falta: 102, status: 'pendente' },
    { material: 'CHAPA A36 16x1200x3000', falta: 54, status: 'pendente' },
    { material: 'CHAPA A36 12,5x1200x3000', falta: 10, status: 'pendente' }
  ]
};

// ==================== FUNÇÕES DE CÁLCULO PEDIDO X ENTREGA ====================

/**
 * Calcula o resumo de materiais por status
 */
export function calcularResumoMateriais(materiais, obraId) {
  const materiaisObra = materiais.filter(m => m.obraId === obraId);

  const totalPedido = materiaisObra.reduce((sum, m) => sum + m.valorTotalPedido, 0);
  const totalEntregue = materiaisObra.reduce((sum, m) => sum + (m.pesoEntregue * m.valorUnitario), 0);

  const pesoPedido = materiaisObra.reduce((sum, m) => sum + m.pesoPedido, 0);
  const pesoEntregue = materiaisObra.reduce((sum, m) => sum + m.pesoEntregue, 0);
  const pesoFaltando = materiaisObra.reduce((sum, m) => sum + Math.max(0, m.pesoFaltaEntregar), 0);

  const itensCompletos = materiaisObra.filter(m => m.status === STATUS_MATERIAL.ENTREGUE).length;
  const itensParciais = materiaisObra.filter(m => m.status === STATUS_MATERIAL.PARCIAL).length;
  const itensPendentes = materiaisObra.filter(m => m.status === STATUS_MATERIAL.PEDIDO).length;

  // Estoque disponível para produção
  const estoqueDisponivel = materiaisObra.reduce((sum, m) => sum + m.disponivelEstoque, 0);

  return {
    totalPedido,
    totalEntregue,
    diferenca: totalPedido - totalEntregue,

    // Aliases usados no JSX
    valorTotalPedido: totalPedido,
    valorTotalEntregue: totalEntregue,
    valorFaltaEntregar: totalPedido - totalEntregue,

    pesoPedido,
    pesoEntregue,
    pesoFaltando,
    // Aliases usados no JSX
    pesoTotalPedido: pesoPedido,
    pesoTotalEntregue: pesoEntregue,
    pesoFaltaEntregar: pesoFaltando,
    pesoEmEstoque: estoqueDisponivel,
    percentualEntregue: pesoPedido > 0 ? (pesoEntregue / pesoPedido) * 100 : 0,

    totalItens: materiaisObra.length,
    itensCompletos,
    itensEntregues: itensCompletos,
    itensParciais,
    itensPendentes,

    estoqueDisponivel,

    // Alertas de material pendente
    alertas: materiaisObra
      .filter(m => m.pesoFaltaEntregar > 0)
      .map(m => ({
        material: m.descricao,
        falta: m.pesoFaltaEntregar,
        valorFaltante: m.pesoFaltaEntregar * m.valorUnitario
      }))
  };
}

/**
 * Atualiza estoque após entrada de material
 */
export function registrarEntregaMaterial(material, pesoEntregue, notaFiscal, dataEntrega) {
  const novoEstoque = material.disponivelEstoque + pesoEntregue;
  const novoPesoEntregue = material.pesoEntregue + pesoEntregue;
  const novoFaltante = material.pesoPedido - novoPesoEntregue;

  return {
    ...material,
    pesoEntregue: novoPesoEntregue,
    pesoFaltaEntregar: Math.max(0, novoFaltante),
    disponivelEstoque: novoEstoque,
    status: novoFaltante <= 0 ? STATUS_MATERIAL.ENTREGUE : STATUS_MATERIAL.PARCIAL,
    percentualEntregue: material.pesoPedido > 0 ? (novoPesoEntregue / material.pesoPedido) * 100 : 100,
    dataEntrega: dataEntrega || new Date().toISOString(),
    notaFiscal: notaFiscal || material.notaFiscal
  };
}

/**
 * Baixa material do estoque para produção
 */
export function baixarMaterialProducao(material, pesoConsumido, ordemProducao) {
  if (pesoConsumido > material.disponivelEstoque) {
    throw new Error(`Estoque insuficiente. Disponível: ${material.disponivelEstoque}kg, Solicitado: ${pesoConsumido}kg`);
  }

  return {
    ...material,
    disponivelEstoque: material.disponivelEstoque - pesoConsumido,
    emProducao: material.emProducao + pesoConsumido,
    status: STATUS_MATERIAL.EM_PRODUCAO
  };
}

/**
 * Calcula estoque disponível por tipo de material
 */
export function calcularEstoquePorTipo(materiais, obraId) {
  const materiaisObra = materiais.filter(m => m.obraId === obraId);

  const porTipo = {};
  Object.values(TIPO_MATERIAL).forEach(tipo => {
    const materiaisTipo = materiaisObra.filter(m => m.tipo === tipo);
    porTipo[tipo] = {
      itens: materiaisTipo.length,
      pesoTotal: materiaisTipo.reduce((sum, m) => sum + m.disponivelEstoque, 0),
      valorTotal: materiaisTipo.reduce((sum, m) => sum + (m.disponivelEstoque * m.valorUnitario), 0),
      materiais: materiaisTipo
    };
  });

  return porTipo;
}

// ==================== OBRA MODELO - SUPER LUNA BELO VALE ====================

export const OBRA_MODELO = {
  id: 'obra-001',
  codigo: 'BELO-VALE',
  nome: 'SUPER LUNA - BELO VALE',
  cliente: {
    id: 'cli-001',
    nome: 'CONSTRUTORA CARMO LTDA',
    cnpj: '12.345.678/0001-90',
    contato: 'Construtora Carmo',
    telefone: '(31) 99999-9999',
    email: 'contato@construtora-carmo.com.br'
  },

  // CONTRATO
  contrato: {
    numero: 'CT-2026-001',
    dataAssinatura: '2026-01-20',
    dataInicio: '2026-02-05',
    dataPrevisaoTermino: '2026-07-30',

    // VALORES DO CONTRATO
    valorTotal: 2700000.00,
    valorEstrutura: 1576765.00, // 59300 + 9550 + 780 + 9800 + 840 + 1115 + 14800 + 6815 = 103000 kg
    valorCobertura: 541550.00,  // Coberturas e telhas
    valorComplementos: 163585.00, // Calhas, rufos, platibandas
    valorFechamento: 140425.00, // Fechamentos laterais
    valorMontagem: 277675.00,   // Estimado ~10% do total

    // PESO CONTRATADO
    pesoTotal: 107000, // kg - Total real da obra SUPER LUNA
    pesoFabricado: 0,
    pesoExpedido: 0,
    pesoMontado: 0,

    // RETENÇÕES
    retencaoContratual: 0.05, // 5% retenção
    retencaoISS: 0.02, // 2% ISS
    retencaoINSS: 0.035, // 3.5% INSS

    // CONDIÇÕES DE PAGAMENTO
    condicaoPagamento: 'medicao_30_60_90',
    prazoPagamento: 30 // dias após aprovação medição
  },

  // SETORES DA OBRA
  setores: [
    {
      id: 'setor-001',
      nome: 'POSTO',
      peso: 6815,
      valor: 164650,
      precoKg: 24.16,
      percentualFabricado: 0,
      percentualMontado: 0
    },
    {
      id: 'setor-002',
      nome: 'SUPERMERCADO',
      peso: 81385,
      valor: 2272930,
      precoKg: 27.93,
      percentualFabricado: 0,
      percentualMontado: 0
    },
    {
      id: 'setor-003',
      nome: 'LOJAS',
      peso: 14800,
      valor: 428300,
      precoKg: 28.94,
      percentualFabricado: 0,
      percentualMontado: 0
    }
  ],

  // VALORES POR KG PARA MEDIÇÃO
  valoresKg: {
    fabricacao: {
      corte: 2.50,
      fabricacao: 4.00,
      solda: 3.00,
      pintura: 1.80,
      expedicao: 0.50, // Conferência e expedição
      totalFabricacao: 11.80 // Soma até expedição
    },
    montagem: {
      descarga: 0.50,
      montagem: 4.50,
      torqueamento: 0.80,
      acabamento: 0.60,
      totalMontagem: 6.40
    },
    totalGeral: 18.20 // fabricacao + montagem
  },

  // STATUS
  status: 'aprovada',
  createdAt: '2026-01-20T10:00:00Z',
  updatedAt: '2026-02-05T10:00:00Z'
};

// ==================== LANÇAMENTOS DE DESPESAS (MODELO) ====================
// Dados atualizados com notas fiscais reais pagas - Super Luna Belo Vale

// LANÇAMENTOS DE DESPESAS REAIS - Gerados a partir das Notas Fiscais de Materiais
// Estes valores SÃO EXCLUSIVOS do financeiro da OBRA, NÃO interferem no financeiro da empresa
export const LANCAMENTOS_DESPESAS = [
  // ============ NF 70467 - Chapas A36 Lote 1 ============
  {
    id: 'LANC-001',
    obraId: 'obra-001',
    tipo: 'material_faturado',
    categoria: 'material_estrutura',
    descricao: 'Chapas A36 Lote 1 (esp. 2mm a 16mm) - NF 70467',
    fornecedor: 'Gerdau Aços Longos S.A.',
    notaFiscal: '70467',
    valor: 29682.98,
    dataEmissao: '2026-01-08',
    dataVencimento: '2026-02-07',
    dataPagamento: '2026-01-08',
    status: 'pago',
    prePedidoRef: 'PP-001',
    pesoKg: 4656.52,
    observacao: 'Pgto antecipado - Trademaster 30 dias'
  },
  // ============ NF 217946 - Perfis W200 ============
  {
    id: 'LANC-002',
    obraId: 'obra-001',
    tipo: 'material_faturado',
    categoria: 'material_estrutura',
    descricao: 'Perfis W200 A572-GR.50 - NF 217946',
    fornecedor: 'Gerdau Aços Longos S.A.',
    notaFiscal: '217946',
    valor: 35302.78,
    dataEmissao: '2026-01-17',
    dataVencimento: '2026-01-17',
    dataPagamento: '2026-01-17',
    status: 'pago',
    prePedidoRef: 'PP-003',
    pesoKg: 4565.6,
    observacao: 'Pgto antecipado depósito - entrega parcial OV'
  },
  // ============ NF 228 - Consumíveis TOLUMAX ============
  {
    id: 'LANC-003',
    obraId: 'obra-001',
    tipo: 'despesa',
    categoria: 'consumiveis',
    descricao: 'Consumíveis solda/corte (Eletrodos, Arame, Discos) - NF 228',
    fornecedor: 'Tolumax Ind. Com. Ltda',
    notaFiscal: '228',
    valor: 7202.00,
    dataEmissao: '2026-01-19',
    dataVencimento: '2026-02-18',
    dataPagamento: '2026-01-19',
    status: 'pago',
    prePedidoRef: null,
    pesoKg: 350,
    observacao: 'Compra avulsa - sem pré-pedido'
  },
  // ============ NF 218134 - Perfis W250/W310/W410 ============
  {
    id: 'LANC-004',
    obraId: 'obra-001',
    tipo: 'material_faturado',
    categoria: 'material_estrutura',
    descricao: 'Perfis W250/W310/W410X38,8 A572-GR.50 - NF 218134',
    fornecedor: 'Gerdau Aços Longos S.A.',
    notaFiscal: '218134',
    valor: 87407.98,
    dataEmissao: '2026-01-23',
    dataVencimento: '2026-01-23',
    dataPagamento: '2026-01-23',
    status: 'pago',
    prePedidoRef: 'PP-003',
    pesoKg: 11286.6,
    observacao: 'Pgto antecipado depósito - perfis médios'
  },
  // ============ NF 70742 - Chapas A36 Lote 2 ============
  {
    id: 'LANC-005',
    obraId: 'obra-001',
    tipo: 'material_faturado',
    categoria: 'material_estrutura',
    descricao: 'Chapas A36 Lote 2 (esp. 4,75mm a 22,4mm) - NF 70742',
    fornecedor: 'Gerdau Aços Longos S.A.',
    notaFiscal: '70742',
    valor: 60922.01,
    dataEmissao: '2026-01-23',
    dataVencimento: '2026-01-23',
    dataPagamento: '2026-01-23',
    status: 'pago',
    prePedidoRef: 'PP-002',
    pesoKg: 9548.6,
    observacao: 'Pgto antecipado depósito'
  },
  // ============ NF 218191 - Perfis Pesados ============
  {
    id: 'LANC-006',
    obraId: 'obra-001',
    tipo: 'material_faturado',
    categoria: 'material_estrutura',
    descricao: 'Perfis W410X53/W530X66/HP310X79 A572-GR.50 - NF 218191',
    fornecedor: 'Gerdau Aços Longos S.A.',
    notaFiscal: '218191',
    valor: 212116.32,
    dataEmissao: '2026-01-23',
    dataVencimento: '2026-01-23',
    dataPagamento: '2026-01-23',
    status: 'pago',
    prePedidoRef: 'PP-003',
    pesoKg: 26158.2,
    observacao: 'Pgto antecipado depósito - maior lote'
  },
  // ============ NF 218103 - Perfis Leves ============
  {
    id: 'LANC-007',
    obraId: 'obra-001',
    tipo: 'material_faturado',
    categoria: 'material_estrutura',
    descricao: 'Perfis W150/W530X66 A572-GR.50 - NF 218103',
    fornecedor: 'Gerdau Aços Longos S.A.',
    notaFiscal: '218103',
    valor: 11329.87,
    dataEmissao: '2026-01-23',
    dataVencimento: '2026-01-23',
    dataPagamento: '2026-01-23',
    status: 'pago',
    prePedidoRef: 'PP-003',
    pesoKg: 1935.0,
    observacao: 'Pgto antecipado depósito - perfis leves'
  },
  // ============ NF 218267 - Barras e Cantoneiras ============
  {
    id: 'LANC-008',
    obraId: 'obra-001',
    tipo: 'material_faturado',
    categoria: 'material_estrutura',
    descricao: 'Barras Redondas e Cantoneiras A36 - NF 218267',
    fornecedor: 'Gerdau Aços Longos S.A.',
    notaFiscal: '218267',
    valor: 28924.92,
    dataEmissao: '2026-01-28',
    dataVencimento: '2026-01-28',
    dataPagamento: '2026-01-28',
    status: 'pago',
    prePedidoRef: 'PP-003',
    pesoKg: 5146.09,
    observacao: 'Pgto antecipado depósito - barras e cantoneiras'
  },
  // ============ NF 218614 - Perfis W410/W530/W250 Lote Final ============
  {
    id: 'LANC-009',
    obraId: 'obra-001',
    tipo: 'material_faturado',
    categoria: 'material_estrutura',
    descricao: 'Perfis W410X53/W410X38.8/W250X25.3 A572-GR.50 - NF 218614',
    fornecedor: 'Gerdau Aços Longos S.A.',
    notaFiscal: '218614',
    valor: 170695.73,
    dataEmissao: '2026-02-05',
    dataVencimento: '2026-02-05',
    dataPagamento: '2026-02-05',
    status: 'pago',
    prePedidoRef: 'PP-003',
    pesoKg: 22126.4,
    observacao: 'Pgto antecipado depósito - lote final perfis'
  },
  // ============ NF 48645 - Tintas FALÇÃO ============
  {
    id: 'LANC-010',
    obraId: 'obra-001',
    tipo: 'despesa',
    categoria: 'consumiveis',
    descricao: 'Tintas e Revestimentos - NF 48645',
    fornecedor: 'Falção Tintas Ltda',
    notaFiscal: '48645',
    valor: 23515.23,
    dataEmissao: '2026-02-05',
    dataVencimento: '2026-03-07',
    dataPagamento: '2026-02-05',
    status: 'pago',
    prePedidoRef: null,
    pesoKg: 0,
    observacao: 'Primer e esmalte para pintura'
  }
];

// ==================== PEDIDOS PRÉ-APROVADOS (DESPESAS FUTURAS) ====================
// NÃO IMPACTAM O SALDO REAL - Apenas análise futura independente

// PEDIDOS PRÉ-APROVADOS (FUTUROS) - Saldo pendente de entrega
// NÃO impactam o saldo real da obra - apenas projeção
export const PEDIDOS_PRE_APROVADOS = [
  {
    id: 'PPA-001',
    obraId: 'obra-001',
    prePedidoRef: 'PP-002',
    fornecedor: 'Gerdau Aços Longos S.A.',
    descricao: 'Saldo pendente Chapas A36 Lote 2 (diferença peso real)',
    categoria: 'material_estrutura',
    valorPrevisto: 2180.95,
    pesoPrevisto: 720.0,
    status: 'aguardando_entrega',
    dataPrevista: '2026-02-15',
    observacao: 'Diferença entre cotação PP-002 e NF 70742 entregue'
  },
  {
    id: 'PPA-002',
    obraId: 'obra-001',
    prePedidoRef: 'PP-003',
    fornecedor: 'Gerdau Aços Longos S.A.',
    descricao: 'Saldo pendente OV W09264680 - Perfis W250/HP310',
    categoria: 'material_estrutura',
    valorPrevisto: 106503.56,
    pesoPrevisto: 13357.0,
    status: 'aguardando_entrega',
    dataPrevista: '2026-02-28',
    observacao: 'Restante OV: W250 parcial (3.643kg de 7.286kg) + HP310 parcial'
  }
];

// ==================== RESUMO PEDIDOS FUTUROS ====================

export const calcularResumoPedidosFuturos = (pedidos, obraId) => {
  const pedidosObra = pedidos.filter(p => p.obraId === obraId);

  // CORRIGIDO: usar valorPrevisto || valor para compatibilidade
  const getValor = (p) => p.valorPrevisto || p.valor || 0;

  const totalFuturo = pedidosObra.reduce((sum, p) => sum + getValor(p), 0);
  const totalMaterial = pedidosObra
    .filter(p => p.tipo === 'material_futuro')
    .reduce((sum, p) => sum + getValor(p), 0);
  const totalServico = pedidosObra
    .filter(p => p.tipo === 'servico_futuro')
    .reduce((sum, p) => sum + getValor(p), 0);

  // Por categoria
  const porCategoria = {};
  pedidosObra.forEach(p => {
    if (!porCategoria[p.categoria]) {
      porCategoria[p.categoria] = { total: 0, quantidade: 0 };
    }
    porCategoria[p.categoria].total += getValor(p);
    porCategoria[p.categoria].quantidade++;
  });

  // Por fornecedor
  const porFornecedor = {};
  pedidosObra.forEach(p => {
    if (!porFornecedor[p.fornecedor]) {
      porFornecedor[p.fornecedor] = { total: 0, pedidos: [] };
    }
    porFornecedor[p.fornecedor].total += getValor(p);
    porFornecedor[p.fornecedor].pedidos.push(p);
  });

  // Por status
  const porStatus = {};
  Object.values(STATUS_PEDIDO_FUTURO).forEach(s => {
    porStatus[s] = { total: 0, quantidade: 0 };
  });
  pedidosObra.forEach(p => {
    if (porStatus[p.status]) {
      porStatus[p.status].total += getValor(p);
      porStatus[p.status].quantidade++;
    }
  });

  // Por setor
  const porSetor = {};
  pedidosObra.forEach(p => {
    if (!porSetor[p.setor]) {
      porSetor[p.setor] = { total: 0, quantidade: 0 };
    }
    porSetor[p.setor].total += getValor(p);
    porSetor[p.setor].quantidade++;
  });

  return {
    totalFuturo,
    totalMaterial,
    totalServico,
    quantidadePedidos: pedidosObra.length,
    porCategoria,
    porFornecedor,
    porStatus,
    porSetor
  };
};

// ==================== MEDIÇÕES REAIS PAGAS (RECEITAS DO CONTRATO) ====================
// Dados extraídos da planilha "LANÇAMENTO DE MEDIÇÕES PAGAS SUPER LUNA BELO VALE"
// Estas são RECEITAS que ABATEM do saldo do contrato

export const MEDICOES_RECEITAS = []; // Será preenchido com medições reais via sistema

// ==================== COMPOSIÇÃO DO CONTRATO ====================
// Estrutura detalhada de como o contrato está dividido

export const COMPOSICAO_CONTRATO = {
  obraId: 'obra-001',
  valorTotal: 2700000.00,

  // Composição por categoria
  categorias: [
    {
      id: 'comp-001',
      nome: 'FORNECEDOR (Material)',
      percentual: 50.0,
      valorPrevisto: 1350000.00,
      valorPago: 667099.82,
      saldoRestante: 682900.18,
      tipo: 'despesa',
      descricao: 'Custo de material estrutural (Gerdau, ArcelorMittal, etc)',
      categoriasLancamento: ['material_estrutura', 'consumiveis']
    },
    {
      id: 'comp-002',
      nome: 'FABRICAÇÃO',
      percentual: 25.0,
      valorPrevisto: 590625.00,
      valorPago: 0,
      saldoRestante: 590625.00,
      valorKg: 5.52,
      pesoTotal: 107000, // kg
      tipo: 'receita',
      descricao: 'Medição de fabricação - R$ 5,52/kg',
      categoriasLancamento: ['fabricacao']
    },
    {
      id: 'comp-003',
      nome: 'MONTAGEM',
      percentual: 15.0,
      valorPrevisto: 354375.00,
      valorPago: 0,
      saldoRestante: 354375.00,
      valorKg: 3.31,
      pesoTotal: 107000, // kg
      tipo: 'receita',
      descricao: 'Medição de montagem - R$ 3,31/kg',
      categoriasLancamento: ['montagem']
    },
    {
      id: 'comp-004',
      nome: 'ENTRADA 1/2',
      percentual: 5.0,
      valorPrevisto: 135000.00,
      valorPago: 0,
      saldoRestante: 135000.00,
      tipo: 'receita',
      descricao: 'Entrada inicial - adiantamento',
      categoriasLancamento: ['entrada']
    },
    {
      id: 'comp-005',
      nome: 'CHAPARIA',
      percentual: 5.0,
      valorPrevisto: 135000.00,
      valorPago: 0,
      saldoRestante: 135000.00,
      tipo: 'receita',
      descricao: 'Medição de chaparia/corte',
      categoriasLancamento: ['chaparia']
    },
    {
      id: 'comp-006',
      nome: 'RETENÇÃO 5%',
      percentual: 5.0,
      valorPrevisto: 135000.00,
      valorPago: 0,
      saldoRestante: 135000.00,
      tipo: 'retencao',
      descricao: 'Retenção contratual - liberado ao final',
      categoriasLancamento: ['retencao']
    }
  ],

  // Resumo
  resumo: {
    totalReceitas: 0,    // Sem receitas lançadas
    totalDespesas: 667099.82,    // 10 NFs lançadas (planilha conferida)
    saldoMedicoesReceber: 1349000.00, // Fabricação + Montagem + Retenção + Entrada + Chaparia
    saldoAPagar: 682900.18       // Material restante (1.350.000 - 667.099,82)
  }
};

// ==================== DRE DA OBRA (Demonstrativo de Resultado) ====================

export const DRE_OBRA = {
  obraId: 'obra-001',
  nomeObra: 'SUPER LUNA - BELO VALE',
  periodo: '2026',

  // RECEITAS
  receitas: {
    // Receitas Realizadas
    realizadas: [],
    totalRealizado: 0,

    // Receitas Previstas
    previstas: [
      { categoria: 'Fabricação', valor: 590625.00, percentual: 25, status: 'pendente' },
      { categoria: 'Montagem', valor: 354375.00, percentual: 15, status: 'pendente' },
      { categoria: 'Retenção', valor: 135000.00, percentual: 5, status: 'retido' }
    ],
    totalPrevisto: 1080000.00,

    // Total de Receitas
    totalGeral: 1350000.00 // Serviços (50% do contrato)
  },

  // CUSTOS
  custos: {
    // Custos Diretos Realizados
    diretos: {
      material: {
        realizado: 643584.59,
        previsto: 1350000.00,
        saldo: 706415.41
      },
      maoObraDireta: {
        realizado: 0,
        previsto: 177000.00,
        saldo: 177000.00
      },
      terceiros: {
        realizado: 0,
        previsto: 94720.00,
        saldo: 94720.00
      },
      transporte: {
        realizado: 0,
        previsto: 65000.00,
        saldo: 65000.00
      },
      consumiveis: {
        realizado: 30717.23,
        previsto: 45000.00,
        saldo: 14282.77
      }
    },
    totalDiretosRealizado: 674301.82,
    totalDiretosPrevisto: 1731720.00,

    // Custos Indiretos
    indiretos: {
      administrativo: { realizado: 0, previsto: 81000.00 },
      equipamentos: { realizado: 0, previsto: 54000.00 },
      overhead: { realizado: 0, previsto: 27000.00 }
    },
    totalIndiretosRealizado: 0,
    totalIndiretosPrevisto: 162000.00
  },

  // RESULTADO
  resultado: {
    // Receita Bruta
    receitaBruta: 2700000.00,

    // (-) Retenções
    retencoes: {
      iss: 54000.00,      // 2%
      inss: 94500.00,     // 3.5%
      contratual: 135000.00 // 5%
    },
    totalRetencoes: 283500.00,

    // (=) Receita Líquida
    receitaLiquida: 2416500.00,

    // (-) Custos Totais
    custosPrevistos: 1893720.00,
    custosRealizados: 674301.82,

    // (=) Lucro Bruto Previsto
    lucroBrutoPrevisto: 522780.00,
    margemBrutaPrevista: 19.36, // %

    // (=) Resultado Atual
    resultadoAtual: -674301.82, // Despesas sem receitas ainda
    margemAtual: 0 // % (sem receitas ainda)
  },

  // Indicadores
  indicadores: {
    percentualReceitaRealizada: 0, // Sem receitas
    percentualCustoRealizado: 35.6, // 674.301,82 de 1.893.720
    ticketMedioReceita: 0,
    diasObra: 0, // obra ainda não iniciou produção
    previsaoTermino: '2026-07-30'
  }
};

// ==================== MEDIÇÕES (FORMATO ANTERIOR - MANTIDO PARA COMPATIBILIDADE) ====================

export const MEDICOES = []; // Será preenchido com medições via sistema

// ==================== FUNÇÕES DE CÁLCULO ====================

/**
 * Calcula o saldo financeiro da obra
 */
export function calcularSaldoObra(obra, lancamentos, medicoes) {
  const valorContrato = obra.contrato.valorTotal;

  // Total de despesas
  const totalDespesas = lancamentos
    .filter(l => l.obraId === obra.id && l.status !== STATUS_LANCAMENTO.CANCELADO)
    .reduce((sum, l) => sum + l.valor, 0);

  // Total medido (bruto)
  const totalMedidoBruto = medicoes
    .filter(m => m.obraId === obra.id && m.status !== STATUS_MEDICAO.REJEITADA)
    .reduce((sum, m) => sum + m.valorBruto, 0);

  // Total medido líquido
  const totalMedidoLiquido = medicoes
    .filter(m => m.obraId === obra.id && m.status !== STATUS_MEDICAO.REJEITADA)
    .reduce((sum, m) => sum + m.valorLiquido, 0);

  // Total recebido (pago)
  const totalRecebido = medicoes
    .filter(m => m.obraId === obra.id && m.status === STATUS_MEDICAO.PAGA)
    .reduce((sum, m) => sum + m.valorLiquido, 0);

  // Saldo a medir
  const saldoAMedir = valorContrato - totalMedidoBruto;

  // Saldo a receber
  const saldoAReceber = totalMedidoLiquido - totalRecebido;

  // Resultado (Receita - Despesas)
  const resultado = totalMedidoLiquido - totalDespesas;
  const margemReal = totalMedidoLiquido > 0 ? (resultado / totalMedidoLiquido) * 100 : 0;

  return {
    valorContrato,
    totalDespesas,
    totalMedidoBruto,
    totalMedidoLiquido,
    totalRecebido,
    saldoAMedir,
    saldoAReceber,
    resultado,
    margemReal,
    percentualMedido: (totalMedidoBruto / valorContrato) * 100,
    percentualRecebido: (totalRecebido / valorContrato) * 100
  };
}

/**
 * Calcula despesas por categoria
 */
export function calcularDespesasPorCategoria(lancamentos, obraId) {
  const despesas = lancamentos.filter(l =>
    l.obraId === obraId &&
    l.status !== STATUS_LANCAMENTO.CANCELADO
  );

  const porCategoria = {};
  Object.values(CATEGORIA_DESPESA).forEach(cat => {
    porCategoria[cat] = {
      total: 0,
      quantidade: 0,
      itens: []
    };
  });

  despesas.forEach(d => {
    if (porCategoria[d.categoria]) {
      porCategoria[d.categoria].total += d.valor;
      porCategoria[d.categoria].quantidade++;
      porCategoria[d.categoria].itens.push(d);
    }
  });

  return porCategoria;
}

/**
 * Calcula medições disponíveis por etapa
 */
export function calcularMedicoesDisponiveis(obra, pecasProducao) {
  const setores = obra.setores || [];

  return setores.map(setor => {
    // Peças do setor que estão em EXPEDIDO (disponíveis para medição fabricação)
    const pecasExpedidas = pecasProducao?.filter(p =>
      p.obraId === obra.id &&
      p.setor === setor.nome &&
      p.etapa === 'EXPEDIDO'
    ) || [];

    const pesoExpedido = pecasExpedidas.reduce((sum, p) => sum + (p.peso || 0), 0);

    // Peças montadas (disponíveis para medição montagem)
    const pecasMontadas = pecasProducao?.filter(p =>
      p.obraId === obra.id &&
      p.setor === setor.nome &&
      p.etapa === 'MONTADO'
    ) || [];

    const pesoMontado = pecasMontadas.reduce((sum, p) => sum + (p.peso || 0), 0);

    return {
      setor: setor.nome,
      pesoTotal: setor.peso,

      // Fabricação
      pesoExpedido,
      percentualExpedido: setor.peso > 0 ? (pesoExpedido / setor.peso) * 100 : 0,
      valorDisponivelFabricacao: pesoExpedido * (obra.valoresKg?.fabricacao?.totalFabricacao || 11.80),

      // Montagem
      pesoMontado,
      percentualMontado: setor.peso > 0 ? (pesoMontado / setor.peso) * 100 : 0,
      valorDisponivelMontagem: pesoMontado * (obra.valoresKg?.montagem?.totalMontagem || 6.40)
    };
  });
}

/**
 * Gera próximo número de medição
 */
export function gerarNumeroMedicao(medicoes, obraId) {
  const medicoesObra = medicoes.filter(m => m.obraId === obraId);
  return medicoesObra.length + 1;
}

/**
 * Calcula valores de uma nova medição
 */
export function calcularMedicao(obra, setor, etapa, pesoMedido) {
  const valoresKg = obra.valoresKg || OBRA_MODELO.valoresKg;
  const retencoes = obra.contrato || OBRA_MODELO.contrato;

  let detalhamento = {};
  let valorBruto = 0;

  if (etapa === ETAPA_MEDICAO.FABRICACAO) {
    detalhamento = {
      corte: { peso: pesoMedido, valorKg: valoresKg.fabricacao.corte, valor: pesoMedido * valoresKg.fabricacao.corte },
      fabricacao: { peso: pesoMedido, valorKg: valoresKg.fabricacao.fabricacao, valor: pesoMedido * valoresKg.fabricacao.fabricacao },
      solda: { peso: pesoMedido, valorKg: valoresKg.fabricacao.solda, valor: pesoMedido * valoresKg.fabricacao.solda },
      pintura: { peso: pesoMedido, valorKg: valoresKg.fabricacao.pintura, valor: pesoMedido * valoresKg.fabricacao.pintura },
      expedicao: { peso: pesoMedido, valorKg: valoresKg.fabricacao.expedicao, valor: pesoMedido * valoresKg.fabricacao.expedicao }
    };
    valorBruto = pesoMedido * valoresKg.fabricacao.totalFabricacao;
  } else {
    detalhamento = {
      descarga: { peso: pesoMedido, valorKg: valoresKg.montagem.descarga, valor: pesoMedido * valoresKg.montagem.descarga },
      montagem: { peso: pesoMedido, valorKg: valoresKg.montagem.montagem, valor: pesoMedido * valoresKg.montagem.montagem },
      torqueamento: { peso: pesoMedido, valorKg: valoresKg.montagem.torqueamento, valor: pesoMedido * valoresKg.montagem.torqueamento },
      acabamento: { peso: pesoMedido, valorKg: valoresKg.montagem.acabamento, valor: pesoMedido * valoresKg.montagem.acabamento }
    };
    valorBruto = pesoMedido * valoresKg.montagem.totalMontagem;
  }

  const valorISS = valorBruto * (retencoes.retencaoISS || 0.02);
  const valorINSS = valorBruto * (retencoes.retencaoINSS || 0.035);
  const valorContratual = valorBruto * (retencoes.retencaoContratual || 0.05);
  const valorLiquido = valorBruto - valorISS - valorINSS - valorContratual;

  return {
    detalhamento,
    valorBruto,
    retencoes: {
      iss: valorISS,
      inss: valorINSS,
      contratual: valorContratual
    },
    valorLiquido
  };
}

/**
 * Filtra lançamentos por período
 */
export function filtrarLancamentosPorPeriodo(lancamentos, dataInicio, dataFim) {
  return lancamentos.filter(l => {
    const data = new Date(l.dataEmissao);
    return data >= new Date(dataInicio) && data <= new Date(dataFim);
  });
}

/**
 * Calcula fluxo de caixa projetado
 */
export function calcularFluxoCaixa(lancamentos, medicoes, mesesFuturos = 6) {
  const fluxo = [];
  const hoje = new Date();

  // Mostrar 2 meses anteriores + mês atual + meses futuros
  for (let i = -2; i < mesesFuturos; i++) {
    const mes = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const mesStr = mes.toISOString().slice(0, 7);
    const ehPassado = i < 0 || (i === 0 && hoje.getDate() > 15);

    // Despesas do mês - usa dataPagamento para pagos, dataVencimento para pendentes
    const despesasMes = lancamentos.filter(l => {
      const dataRef = l.status === STATUS_LANCAMENTO.PAGO
        ? (l.dataPagamento || l.dataEmissao)
        : (l.dataVencimento || l.dataEmissao);
      if (!dataRef) return false;
      const d = new Date(dataRef);
      return d.getFullYear() === mes.getFullYear() && d.getMonth() === mes.getMonth();
    });

    // Receitas do mês (medições pagas ou aprovadas)
    const receitasMes = medicoes.filter(m => {
      const dataRef = m.dataPagamento || m.dataAprovacao;
      if (!dataRef) return false;
      const d = new Date(dataRef);
      return d.getFullYear() === mes.getFullYear() && d.getMonth() === mes.getMonth();
    });

    const totalDespesas = despesasMes.reduce((s, l) => s + (l.valor || 0), 0);
    const totalReceitas = receitasMes.reduce((s, m) => s + (m.valorLiquido || m.valorBruto || 0), 0);

    fluxo.push({
      mes: mesStr,
      mesLabel: mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      despesas: totalDespesas,
      receitas: totalReceitas,
      saldo: totalReceitas - totalDespesas,
      ehPassado
    });
  }

  return fluxo;
}

/**
 * Calcula análise comparativa FUTURO vs REAL
 * Despesas futuras NÃO impactam o saldo real
 */
export function calcularAnaliseProjecao(obra, lancamentosReais, pedidosFuturos, medicoes) {
  // Saldo REAL (apenas lançamentos efetivos)
  const saldoReal = calcularSaldoObra(obra, lancamentosReais, medicoes);

  // Total de despesas futuras (pré-aprovadas) - usar valorPrevisto || valor
  const totalFuturo = pedidosFuturos
    .filter(p => p.obraId === obra.id && p.status !== STATUS_PEDIDO_FUTURO.CANCELADO)
    .reduce((sum, p) => sum + (p.valorPrevisto || p.valor || 0), 0);

  // Projeção com futuras incluídas
  const projecaoDespesas = saldoReal.totalDespesas + totalFuturo;

  // Saldo disponível projetado
  const saldoProjetado = saldoReal.saldoAMedir - totalFuturo;

  // Impacto percentual
  const impactoFuturo = saldoReal.valorContrato > 0
    ? (totalFuturo / saldoReal.valorContrato) * 100
    : 0;

  // Margem projetada
  const margemProjetada = (saldoReal.valorContrato - projecaoDespesas) / saldoReal.valorContrato * 100;

  return {
    // Valores REAIS
    real: {
      valorContrato: saldoReal.valorContrato,
      totalDespesas: saldoReal.totalDespesas,
      totalMedido: saldoReal.totalMedidoBruto,
      saldoAMedir: saldoReal.saldoAMedir,
      resultado: saldoReal.resultado,
      margemReal: saldoReal.margemReal
    },

    // Valores FUTUROS (pré-aprovados)
    futuro: {
      totalPedidos: pedidosFuturos.filter(p => p.obraId === obra.id).length,
      totalValor: totalFuturo,
      impactoPercentual: impactoFuturo
    },

    // PROJEÇÃO (Real + Futuro)
    projecao: {
      totalDespesas: projecaoDespesas,
      saldoDisponivel: saldoProjetado,
      margemProjetada: margemProjetada,
      alertaSaldo: saldoProjetado < 0 // Alerta se saldo projetado for negativo
    },

    // Análise de risco
    analiseRisco: {
      percentualComprometido: (projecaoDespesas / saldoReal.valorContrato) * 100,
      margemSeguranca: saldoProjetado / saldoReal.valorContrato * 100,
      status: saldoProjetado < 0 ? 'critico' : saldoProjetado < (saldoReal.valorContrato * 0.1) ? 'atencao' : 'saudavel'
    }
  };
}

/**
 * Calcula fluxo de caixa futuro incluindo pedidos pré-aprovados
 */
export function calcularFluxoCaixaComFuturos(lancamentos, medicoes, pedidosFuturos, mesesFuturos = 6) {
  const fluxo = [];
  const hoje = new Date();

  for (let i = 0; i < mesesFuturos; i++) {
    const mes = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const mesStr = mes.toISOString().slice(0, 7);

    // Despesas reais do mês
    const despesasReais = lancamentos.filter(l => {
      const venc = new Date(l.dataVencimento);
      return venc.getFullYear() === mes.getFullYear() &&
        venc.getMonth() === mes.getMonth() &&
        l.status !== STATUS_LANCAMENTO.PAGO;
    });

    // Despesas futuras previstas para o mês
    const despesasFuturas = pedidosFuturos.filter(p => {
      if (p.status === STATUS_PEDIDO_FUTURO.CANCELADO) return false;
      const previsao = new Date(p.dataPrevisaoEntrega);
      previsao.setDate(previsao.getDate() + (p.prazoFaturamento || 30) + (p.prazoPagamento || 30));
      return previsao.getFullYear() === mes.getFullYear() &&
        previsao.getMonth() === mes.getMonth();
    });

    // Receitas do mês (medições)
    const receitasMes = medicoes.filter(m => {
      if (!m.dataAprovacao || m.status === STATUS_MEDICAO.PAGA) return false;
      const previsao = new Date(m.dataAprovacao);
      previsao.setDate(previsao.getDate() + 30);
      return previsao.getFullYear() === mes.getFullYear() &&
        previsao.getMonth() === mes.getMonth();
    });

    const totalDespesasReais = despesasReais.reduce((s, l) => s + l.valor, 0);
    const totalDespesasFuturas = despesasFuturas.reduce((s, p) => s + p.valor, 0);
    const totalReceitas = receitasMes.reduce((s, m) => s + m.valorLiquido, 0);

    fluxo.push({
      mes: mesStr,
      mesLabel: mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      despesasReais: totalDespesasReais,
      despesasFuturas: totalDespesasFuturas,
      despesasTotal: totalDespesasReais + totalDespesasFuturas,
      receitas: totalReceitas,
      saldoReal: totalReceitas - totalDespesasReais,
      saldoProjetado: totalReceitas - totalDespesasReais - totalDespesasFuturas
    });
  }

  return fluxo;
}

/**
 * Calcula o saldo do contrato abatendo DESPESAS PAGAS e RECEITAS
 * Saldo = Contrato - Despesas Pagas
 */
export function calcularSaldoContratoComReceitas(obra, medicoesReceitas, lancamentos = []) {
  const valorContrato = obra.contrato?.valorTotal || OBRA_MODELO.contrato.valorTotal;

  // Total de receitas (medições pagas pelo cliente)
  const receitasRealizadas = medicoesReceitas
    .filter(r => r.obraId === obra.id && r.status === STATUS_MEDICAO.PAGA)
    .reduce((sum, r) => sum + r.valorBruto, 0);

  const receitasLiquidas = medicoesReceitas
    .filter(r => r.obraId === obra.id && r.status === STATUS_MEDICAO.PAGA)
    .reduce((sum, r) => sum + r.valorLiquido, 0);

  // Total de despesas pagas (lançamentos pagos - NFs de material, MO, etc.)
  const despesasPagas = lancamentos
    .filter(l => l.obraId === obra.id && l.status === STATUS_LANCAMENTO.PAGO)
    .reduce((sum, l) => sum + l.valor, 0);

  // Saldo restante do contrato = Contrato - Despesas Pagas
  const saldoRestante = valorContrato - despesasPagas;

  // Percentual executado (baseado em despesas pagas)
  const percentualExecutado = valorContrato > 0 ? (despesasPagas / valorContrato) * 100 : 0;

  // Percentual medido (baseado em medições ao cliente)
  const percentualMedido = valorContrato > 0 ? (receitasRealizadas / valorContrato) * 100 : 0;

  return {
    valorContrato,
    receitasRealizadas,
    receitasLiquidas,
    despesasPagas,
    saldoRestante,
    percentualMedido,
    percentualExecutado,
    percentualRestante: 100 - percentualExecutado
  };
}

/**
 * Calcula o DRE (Demonstrativo de Resultado) da obra em tempo real
 */
export function calcularDREObra(obra, lancamentos, medicoesReceitas) {
  const valorContrato = obra.contrato?.valorTotal || OBRA_MODELO.contrato.valorTotal;

  // RECEITAS
  const receitasBrutas = medicoesReceitas
    .filter(r => r.obraId === obra.id)
    .reduce((sum, r) => sum + r.valorBruto, 0);

  const receitasLiquidas = medicoesReceitas
    .filter(r => r.obraId === obra.id)
    .reduce((sum, r) => sum + r.valorLiquido, 0);

  const retencoesTotais = receitasBrutas - receitasLiquidas;

  // CUSTOS (Despesas)
  const custosRealizados = lancamentos
    .filter(l => l.obraId === obra.id && l.status === STATUS_LANCAMENTO.PAGO)
    .reduce((sum, l) => sum + l.valor, 0);

  const custosProvisionados = lancamentos
    .filter(l => l.obraId === obra.id && l.status !== STATUS_LANCAMENTO.PAGO && l.status !== STATUS_LANCAMENTO.CANCELADO)
    .reduce((sum, l) => sum + l.valor, 0);

  // RESULTADO
  const lucroBruto = receitasLiquidas - custosRealizados;
  const margemBruta = receitasLiquidas > 0 ? (lucroBruto / receitasLiquidas) * 100 : 0;

  // Agrupamento por categoria
  const custosPorCategoria = {};
  lancamentos
    .filter(l => l.obraId === obra.id && l.status === STATUS_LANCAMENTO.PAGO)
    .forEach(l => {
      if (!custosPorCategoria[l.categoria]) {
        custosPorCategoria[l.categoria] = 0;
      }
      custosPorCategoria[l.categoria] += l.valor;
    });

  const receitasPorTipo = {};
  medicoesReceitas
    .filter(r => r.obraId === obra.id)
    .forEach(r => {
      if (!receitasPorTipo[r.tipoReceita]) {
        receitasPorTipo[r.tipoReceita] = { bruto: 0, liquido: 0, quantidade: 0 };
      }
      receitasPorTipo[r.tipoReceita].bruto += r.valorBruto;
      receitasPorTipo[r.tipoReceita].liquido += r.valorLiquido;
      receitasPorTipo[r.tipoReceita].quantidade++;
    });

  return {
    // Receitas
    receitas: {
      brutas: receitasBrutas,
      liquidas: receitasLiquidas,
      retencoes: retencoesTotais,
      percentualContrato: (receitasBrutas / valorContrato) * 100,
      porTipo: receitasPorTipo
    },

    // Custos
    custos: {
      realizados: custosRealizados,
      provisionados: custosProvisionados,
      total: custosRealizados + custosProvisionados,
      porCategoria: custosPorCategoria
    },

    // Resultado
    resultado: {
      lucroBruto,
      margemBruta,
      saldoContrato: valorContrato - receitasBrutas,
      indicadorSaude: lucroBruto >= 0 ? 'positivo' : 'negativo'
    },

    // Projeções
    projecoes: {
      receitaPrevista: valorContrato,
      custosPrevisto: valorContrato * 0.70, // Estimativa 70% custos
      lucroProjetado: valorContrato * 0.30   // Estimativa 30% margem
    }
  };
}

/**
 * Calcula fluxo de caixa considerando receitas (medições)
 */
export function calcularFluxoCaixaCompleto(lancamentos, medicoesReceitas, mesesFuturos = 6) {
  const fluxo = [];
  const hoje = new Date();

  for (let i = 0; i < mesesFuturos; i++) {
    const mes = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const mesStr = mes.toISOString().slice(0, 7);

    // Receitas do mês (medições)
    const receitasMes = medicoesReceitas.filter(r => {
      const data = new Date(r.dataPagamento || r.dataAprovacao);
      return data.getFullYear() === mes.getFullYear() &&
        data.getMonth() === mes.getMonth();
    });

    // Despesas do mês
    const despesasMes = lancamentos.filter(l => {
      const data = new Date(l.dataPagamento || l.dataVencimento);
      return data.getFullYear() === mes.getFullYear() &&
        data.getMonth() === mes.getMonth();
    });

    const totalReceitas = receitasMes.reduce((s, r) => s + r.valorLiquido, 0);
    const totalDespesas = despesasMes.reduce((s, l) => s + l.valor, 0);

    fluxo.push({
      mes: mesStr,
      mesLabel: mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      receitas: totalReceitas,
      despesas: totalDespesas,
      saldo: totalReceitas - totalDespesas,
      acumulado: 0 // Será calculado depois
    });
  }

  // Calcular saldo acumulado
  let acumulado = 0;
  fluxo.forEach(f => {
    acumulado += f.saldo;
    f.acumulado = acumulado;
  });

  return fluxo;
}

export default {
  // Tipos e Status
  TIPO_LANCAMENTO,
  STATUS_LANCAMENTO,
  STATUS_PEDIDO_FUTURO,
  CATEGORIA_DESPESA,
  STATUS_MEDICAO,
  ETAPA_MEDICAO,
  TIPO_RECEITA,
  STATUS_DRE,
  CATEGORIA_DRE,
  STATUS_MATERIAL,
  TIPO_MATERIAL,

  // Dados
  OBRA_MODELO,
  LANCAMENTOS_DESPESAS,
  PEDIDOS_PRE_APROVADOS,
  MEDICOES_RECEITAS,
  COMPOSICAO_CONTRATO,
  DRE_OBRA,
  MEDICOES,
  PEDIDOS_MATERIAL,
  RESUMO_PEDIDO_MATERIAL,

  // Funções de cálculo - Financeiro
  calcularSaldoObra,
  calcularDespesasPorCategoria,
  calcularMedicoesDisponiveis,
  gerarNumeroMedicao,
  calcularMedicao,
  filtrarLancamentosPorPeriodo,
  calcularFluxoCaixa,
  calcularResumoPedidosFuturos,
  calcularAnaliseProjecao,
  calcularFluxoCaixaComFuturos,
  calcularSaldoContratoComReceitas,
  calcularDREObra,
  calcularFluxoCaixaCompleto,

  // Funções de cálculo - Material/Estoque
  calcularResumoMateriais,
  registrarEntregaMaterial,
  baixarMaterialProducao,
  calcularEstoquePorTipo
};
