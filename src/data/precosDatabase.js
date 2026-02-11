/**
 * MONTEX ERP Premium - Base de Dados de Preços e Orçamentos
 *
 * Banco de dados com preços base, serviços, materiais e parâmetros
 * para simulação inteligente de orçamentos de estruturas metálicas
 */

// ==================== CATEGORIAS DE SERVIÇOS ====================
export const CATEGORIAS_SERVICO = {
  ESTRUTURA_METALICA: 'estrutura_metalica',
  COBERTURA: 'cobertura',
  FECHAMENTO: 'fechamento',
  COMPLEMENTOS: 'complementos',
  MAO_DE_OBRA: 'mao_de_obra',
  TRANSPORTE: 'transporte',
  MONTAGEM: 'montagem'
};

// ==================== UNIDADES ====================
export const UNIDADES = {
  KG: { sigla: 'KG', nome: 'Quilograma', tipo: 'peso' },
  TON: { sigla: 'TON', nome: 'Tonelada', tipo: 'peso' },
  M2: { sigla: 'M²', nome: 'Metro Quadrado', tipo: 'area' },
  ML: { sigla: 'ML', nome: 'Metro Linear', tipo: 'linear' },
  UN: { sigla: 'UN', nome: 'Unidade', tipo: 'quantidade' },
  VB: { sigla: 'VB', nome: 'Verba', tipo: 'verba' },
  CJ: { sigla: 'CJ', nome: 'Conjunto', tipo: 'conjunto' }
};

// ==================== TIPOS DE ESTRUTURA ====================
export const TIPOS_ESTRUTURA = {
  GALPAO_INDUSTRIAL: {
    id: 'galpao_industrial',
    nome: 'Galpão Industrial',
    descricao: 'Estrutura para galpões industriais e logísticos',
    pesoMedioM2: 35, // kg/m²
    fatorComplexidade: 1.0
  },
  SUPERMERCADO: {
    id: 'supermercado',
    nome: 'Supermercado',
    descricao: 'Estrutura para supermercados e lojas de grande porte',
    pesoMedioM2: 45,
    fatorComplexidade: 1.15
  },
  LOJA_COMERCIAL: {
    id: 'loja_comercial',
    nome: 'Loja Comercial',
    descricao: 'Estrutura para lojas e estabelecimentos comerciais',
    pesoMedioM2: 30,
    fatorComplexidade: 1.1
  },
  POSTO_COMBUSTIVEL: {
    id: 'posto_combustivel',
    nome: 'Posto de Combustível',
    descricao: 'Cobertura e estrutura para postos de combustível',
    pesoMedioM2: 25,
    fatorComplexidade: 0.9
  },
  MARQUISE: {
    id: 'marquise',
    nome: 'Marquise',
    descricao: 'Marquises e coberturas de acesso',
    pesoMedioM2: 20,
    fatorComplexidade: 1.05
  },
  MEZANINO: {
    id: 'mezanino',
    nome: 'Mezanino',
    descricao: 'Estrutura para mezaninos e pisos elevados',
    pesoMedioM2: 55,
    fatorComplexidade: 1.2
  },
  PASSARELA: {
    id: 'passarela',
    nome: 'Passarela',
    descricao: 'Passarelas e pontes metálicas',
    pesoMedioM2: 40,
    fatorComplexidade: 1.25
  }
};

// ==================== TABELA DE PREÇOS - ESTRUTURA METÁLICA ====================
export const PRECOS_ESTRUTURA = [
  {
    id: 'est-001',
    codigo: 'EST-GALPAO',
    descricao: 'Estrutura Metálica - Galpão Industrial',
    categoria: CATEGORIAS_SERVICO.ESTRUTURA_METALICA,
    unidade: 'KG',
    precoBase: 18.00,
    precoMedio: 19.50,
    precoAlto: 22.00,
    faixas: [
      { de: 0, ate: 10000, preco: 22.00, descricao: 'Até 10 ton' },
      { de: 10001, ate: 50000, preco: 20.00, descricao: '10-50 ton' },
      { de: 50001, ate: 100000, preco: 19.00, descricao: '50-100 ton' },
      { de: 100001, ate: Infinity, preco: 18.00, descricao: 'Acima 100 ton' }
    ],
    observacao: 'Inclui fabricação, pintura e entrega'
  },
  {
    id: 'est-002',
    codigo: 'EST-COMERCIAL',
    descricao: 'Estrutura Metálica - Comercial/Loja',
    categoria: CATEGORIAS_SERVICO.ESTRUTURA_METALICA,
    unidade: 'KG',
    precoBase: 19.00,
    precoMedio: 20.00,
    precoAlto: 23.00,
    faixas: [
      { de: 0, ate: 5000, preco: 23.00, descricao: 'Até 5 ton' },
      { de: 5001, ate: 20000, preco: 21.00, descricao: '5-20 ton' },
      { de: 20001, ate: 50000, preco: 19.50, descricao: '20-50 ton' },
      { de: 50001, ate: Infinity, preco: 19.00, descricao: 'Acima 50 ton' }
    ]
  },
  {
    id: 'est-003',
    codigo: 'EST-MARQUISE',
    descricao: 'Estrutura Metálica - Marquise',
    categoria: CATEGORIAS_SERVICO.ESTRUTURA_METALICA,
    unidade: 'KG',
    precoBase: 19.00,
    precoMedio: 20.50,
    precoAlto: 24.00,
    faixas: [
      { de: 0, ate: 2000, preco: 24.00, descricao: 'Até 2 ton' },
      { de: 2001, ate: 10000, preco: 21.00, descricao: '2-10 ton' },
      { de: 10001, ate: Infinity, preco: 19.00, descricao: 'Acima 10 ton' }
    ]
  },
  {
    id: 'est-004',
    codigo: 'EST-POSTO',
    descricao: 'Estrutura Metálica - Posto Combustível',
    categoria: CATEGORIAS_SERVICO.ESTRUTURA_METALICA,
    unidade: 'KG',
    precoBase: 19.00,
    precoMedio: 20.00,
    precoAlto: 22.00,
    faixas: [
      { de: 0, ate: 5000, preco: 22.00, descricao: 'Até 5 ton' },
      { de: 5001, ate: 15000, preco: 20.00, descricao: '5-15 ton' },
      { de: 15001, ate: Infinity, preco: 19.00, descricao: 'Acima 15 ton' }
    ]
  },
  {
    id: 'est-005',
    codigo: 'EST-MEZANINO',
    descricao: 'Estrutura Metálica - Mezanino',
    categoria: CATEGORIAS_SERVICO.ESTRUTURA_METALICA,
    unidade: 'KG',
    precoBase: 20.00,
    precoMedio: 22.00,
    precoAlto: 26.00,
    faixas: [
      { de: 0, ate: 3000, preco: 26.00, descricao: 'Até 3 ton' },
      { de: 3001, ate: 10000, preco: 23.00, descricao: '3-10 ton' },
      { de: 10001, ate: Infinity, preco: 20.00, descricao: 'Acima 10 ton' }
    ]
  }
];

// ==================== TABELA DE PREÇOS - COBERTURA ====================
export const PRECOS_COBERTURA = [
  {
    id: 'cob-001',
    codigo: 'COB-GALV-050',
    descricao: 'Cobertura Telha Galvanizada 0,50mm',
    categoria: CATEGORIAS_SERVICO.COBERTURA,
    unidade: 'M2',
    precoBase: 65.00,
    precoMedio: 75.00,
    precoAlto: 85.00,
    pesoM2: 5.5,
    observacao: 'Telha trapezoidal galvanizada'
  },
  {
    id: 'cob-002',
    codigo: 'COB-GALV-043',
    descricao: 'Cobertura Telha Galvanizada 0,43mm',
    categoria: CATEGORIAS_SERVICO.COBERTURA,
    unidade: 'M2',
    precoBase: 55.00,
    precoMedio: 65.00,
    precoAlto: 75.00,
    pesoM2: 4.5
  },
  {
    id: 'cob-003',
    codigo: 'COB-GALVALU-050',
    descricao: 'Cobertura Telha Galvalume 0,50mm',
    categoria: CATEGORIAS_SERVICO.COBERTURA,
    unidade: 'M2',
    precoBase: 70.00,
    precoMedio: 80.00,
    precoAlto: 95.00,
    pesoM2: 5.0
  },
  {
    id: 'cob-004',
    codigo: 'COB-PIR-30',
    descricao: 'Cobertura Telha Sanduíche PIR 30mm Forro/Branco',
    categoria: CATEGORIAS_SERVICO.COBERTURA,
    unidade: 'M2',
    precoBase: 120.00,
    precoMedio: 135.00,
    precoAlto: 155.00,
    pesoM2: 8.5,
    isolamentoTermico: true,
    observacao: 'Telha termoacústica com núcleo PIR'
  },
  {
    id: 'cob-005',
    codigo: 'COB-PIR-50',
    descricao: 'Cobertura Telha Sanduíche PIR 50mm Forro/Branco',
    categoria: CATEGORIAS_SERVICO.COBERTURA,
    unidade: 'M2',
    precoBase: 145.00,
    precoMedio: 165.00,
    precoAlto: 190.00,
    pesoM2: 10.0,
    isolamentoTermico: true
  },
  {
    id: 'cob-006',
    codigo: 'COB-EPS-30',
    descricao: 'Cobertura Telha Sanduíche EPS 30mm',
    categoria: CATEGORIAS_SERVICO.COBERTURA,
    unidade: 'M2',
    precoBase: 95.00,
    precoMedio: 110.00,
    precoAlto: 130.00,
    pesoM2: 7.0,
    isolamentoTermico: true
  }
];

// ==================== TABELA DE PREÇOS - FECHAMENTO ====================
export const PRECOS_FECHAMENTO = [
  {
    id: 'fec-001',
    codigo: 'FEC-PIR-30-EXT',
    descricao: 'Fechamento Lateral Externo Telha PIR 30mm 2 Faces Branca 0,38mm',
    categoria: CATEGORIAS_SERVICO.FECHAMENTO,
    unidade: 'M2',
    precoBase: 110.00,
    precoMedio: 125.00,
    precoAlto: 145.00,
    pesoM2: 9.0
  },
  {
    id: 'fec-002',
    codigo: 'FEC-GALV-INT',
    descricao: 'Fechamento Lateral Interno Telha Galvanizada 0,43mm 2 Faces Branca',
    categoria: CATEGORIAS_SERVICO.FECHAMENTO,
    unidade: 'M2',
    precoBase: 70.00,
    precoMedio: 80.00,
    precoAlto: 95.00,
    pesoM2: 5.0
  },
  {
    id: 'fec-003',
    codigo: 'FEC-TRAPEZOIDAL',
    descricao: 'Fechamento Telha Trapezoidal Simples',
    categoria: CATEGORIAS_SERVICO.FECHAMENTO,
    unidade: 'M2',
    precoBase: 55.00,
    precoMedio: 65.00,
    precoAlto: 80.00,
    pesoM2: 5.5
  },
  {
    id: 'fec-004',
    codigo: 'PLATIBANDA',
    descricao: 'Platibanda em Aço Galvanizado',
    categoria: CATEGORIAS_SERVICO.FECHAMENTO,
    unidade: 'M2',
    precoBase: 70.00,
    precoMedio: 80.00,
    precoAlto: 95.00,
    pesoM2: 6.0
  }
];

// ==================== TABELA DE PREÇOS - COMPLEMENTOS ====================
export const PRECOS_COMPLEMENTOS = [
  {
    id: 'comp-001',
    codigo: 'CALHA-SAC-300',
    descricao: 'Calha SAC 300 - 2,0mm',
    categoria: CATEGORIAS_SERVICO.COMPLEMENTOS,
    unidade: 'ML',
    precoBase: 160.00,
    precoMedio: 190.00,
    precoAlto: 220.00,
    pesoML: 8.5
  },
  {
    id: 'comp-002',
    codigo: 'CALHA-SAC-500',
    descricao: 'Calha SAC 500 - 2,0mm',
    categoria: CATEGORIAS_SERVICO.COMPLEMENTOS,
    unidade: 'ML',
    precoBase: 200.00,
    precoMedio: 240.00,
    precoAlto: 280.00,
    pesoML: 12.0
  },
  {
    id: 'comp-003',
    codigo: 'CALHA-SIMPLES',
    descricao: 'Calha Simples',
    categoria: CATEGORIAS_SERVICO.COMPLEMENTOS,
    unidade: 'ML',
    precoBase: 100.00,
    precoMedio: 120.00,
    precoAlto: 145.00,
    pesoML: 5.0
  },
  {
    id: 'comp-004',
    codigo: 'RUFOS',
    descricao: 'Rufos em Aço Galvanizado',
    categoria: CATEGORIAS_SERVICO.COMPLEMENTOS,
    unidade: 'ML',
    precoBase: 45.00,
    precoMedio: 55.00,
    precoAlto: 70.00,
    pesoML: 2.0
  },
  {
    id: 'comp-005',
    codigo: 'LANTERNIM',
    descricao: 'Lanternim com Estrutura',
    categoria: CATEGORIAS_SERVICO.COMPLEMENTOS,
    unidade: 'ML',
    precoBase: 350.00,
    precoMedio: 420.00,
    precoAlto: 500.00,
    pesoML: 25.0
  },
  {
    id: 'comp-006',
    codigo: 'TUBO-QUEDA',
    descricao: 'Tubo de Queda Ø150mm',
    categoria: CATEGORIAS_SERVICO.COMPLEMENTOS,
    unidade: 'ML',
    precoBase: 85.00,
    precoMedio: 100.00,
    precoAlto: 120.00
  },
  {
    id: 'comp-007',
    codigo: 'DOMUS',
    descricao: 'Domus Prismático 1,20x1,20m',
    categoria: CATEGORIAS_SERVICO.COMPLEMENTOS,
    unidade: 'UN',
    precoBase: 380.00,
    precoMedio: 450.00,
    precoAlto: 550.00
  }
];

// ==================== TABELA DE PREÇOS - MÃO DE OBRA ====================
export const PRECOS_MAO_OBRA = [
  {
    id: 'mo-001',
    codigo: 'MO-MONT-ESTRUTURA',
    descricao: 'Montagem de Estrutura Metálica',
    categoria: CATEGORIAS_SERVICO.MONTAGEM,
    unidade: 'KG',
    precoBase: 2.50,
    precoMedio: 3.50,
    precoAlto: 5.00,
    faixas: [
      { de: 0, ate: 10000, preco: 5.00, descricao: 'Até 10 ton' },
      { de: 10001, ate: 50000, preco: 4.00, descricao: '10-50 ton' },
      { de: 50001, ate: 100000, preco: 3.50, descricao: '50-100 ton' },
      { de: 100001, ate: Infinity, preco: 2.50, descricao: 'Acima 100 ton' }
    ],
    observacao: 'Não inclui içamento especial'
  },
  {
    id: 'mo-002',
    codigo: 'MO-MONT-COBERTURA',
    descricao: 'Montagem de Cobertura',
    categoria: CATEGORIAS_SERVICO.MONTAGEM,
    unidade: 'M2',
    precoBase: 12.00,
    precoMedio: 18.00,
    precoAlto: 25.00
  },
  {
    id: 'mo-003',
    codigo: 'MO-MONT-FECHAMENTO',
    descricao: 'Montagem de Fechamento Lateral',
    categoria: CATEGORIAS_SERVICO.MONTAGEM,
    unidade: 'M2',
    precoBase: 10.00,
    precoMedio: 15.00,
    precoAlto: 22.00
  },
  {
    id: 'mo-004',
    codigo: 'MO-CALHA',
    descricao: 'Instalação de Calhas e Rufos',
    categoria: CATEGORIAS_SERVICO.MONTAGEM,
    unidade: 'ML',
    precoBase: 15.00,
    precoMedio: 22.00,
    precoAlto: 30.00
  }
];

// ==================== TABELA DE PREÇOS - TRANSPORTE ====================
export const PRECOS_TRANSPORTE = [
  {
    id: 'tr-001',
    codigo: 'FRETE-KM',
    descricao: 'Frete por Quilômetro',
    categoria: CATEGORIAS_SERVICO.TRANSPORTE,
    unidade: 'KM',
    precoBase: 8.50,
    precoMedio: 12.00,
    precoAlto: 18.00,
    observacao: 'Carreta convencional'
  },
  {
    id: 'tr-002',
    codigo: 'FRETE-TON',
    descricao: 'Frete por Tonelada',
    categoria: CATEGORIAS_SERVICO.TRANSPORTE,
    unidade: 'TON',
    precoBase: 180.00,
    precoMedio: 250.00,
    precoAlto: 350.00,
    observacao: 'Distância até 100km'
  },
  {
    id: 'tr-003',
    codigo: 'ESCOLTA',
    descricao: 'Escolta para Carga Especial',
    categoria: CATEGORIAS_SERVICO.TRANSPORTE,
    unidade: 'VB',
    precoBase: 2500.00,
    precoMedio: 3500.00,
    precoAlto: 5000.00
  }
];

// ==================== PARÂMETROS DE MERCADO ====================
export const PARAMETROS_MERCADO = {
  // Índices econômicos (simulados - em produção viriam de API)
  acoPrecoPorTon: 5800.00, // R$/ton aço carbono
  acoInox304PorKg: 28.00,
  aluminioPorKg: 22.00,

  // Custos operacionais
  custoHoraHomem: 45.00,
  custoHoraMaquina: 180.00,

  // Margens sugeridas
  margemMinima: 0.12, // 12%
  margemPadrao: 0.18, // 18%
  margemAlta: 0.25, // 25%

  // Fatores de ajuste regional
  regioes: {
    sudeste: 1.0,
    sul: 0.95,
    nordeste: 1.08,
    centrooeste: 1.05,
    norte: 1.15
  },

  // Fatores de complexidade
  complexidade: {
    simples: 0.9,
    media: 1.0,
    complexa: 1.15,
    especial: 1.30
  },

  // Prazos padrão (dias)
  prazos: {
    projeto: { min: 5, padrao: 10, max: 20 },
    fabricacao: { diasPorTon: 1.5 }, // 1.5 dias por tonelada
    pintura: { diasPorTon: 0.5 },
    transporte: { diasBase: 3, diasPorKm: 0.01 },
    montagem: { diasPorTon: 2 }
  },

  // BDI padrão
  bdi: {
    administracao: 0.04,
    lucro: 0.08,
    impostos: 0.0565, // ISS + PIS + COFINS aproximado
    seguros: 0.015,
    garantias: 0.01
  }
};

// ==================== CUSTOS DE PRODUÇÃO ====================
export const CUSTOS_PRODUCAO = {
  // Custos por etapa (R$/kg)
  etapas: {
    corte: {
      cnc_plasma: 0.80,
      cnc_laser: 1.50,
      serra: 0.40,
      oxicorte: 0.60
    },
    fabricacao: {
      soldagem: 1.20,
      furacao: 0.30,
      dobra: 0.45,
      montagem_seca: 0.80
    },
    tratamento: {
      jateamento: 0.90,
      galvanizacao: 3.50,
      zincagem: 2.80
    },
    pintura: {
      primer: 0.60,
      acabamento: 0.80,
      epoxi: 1.20,
      poliuretano: 1.80
    }
  },

  // Consumíveis
  consumiveis: {
    eletrodo_kg: 18.00,
    arame_mig_kg: 22.00,
    gas_co2_m3: 35.00,
    disco_corte_un: 8.50,
    tinta_litro: 45.00,
    solvente_litro: 25.00
  }
};

// ==================== COMPOSIÇÕES DE SERVIÇO ====================
export const COMPOSICOES = {
  estruturaCompleta: {
    nome: 'Estrutura Metálica Completa',
    itens: [
      { tipo: 'material', percentual: 0.55 },
      { tipo: 'maoDeObra', percentual: 0.25 },
      { tipo: 'indiretos', percentual: 0.12 },
      { tipo: 'lucro', percentual: 0.08 }
    ]
  },
  coberturaCompleta: {
    nome: 'Cobertura Completa',
    itens: [
      { tipo: 'material', percentual: 0.65 },
      { tipo: 'maoDeObra', percentual: 0.20 },
      { tipo: 'indiretos', percentual: 0.08 },
      { tipo: 'lucro', percentual: 0.07 }
    ]
  },
  montagemCompleta: {
    nome: 'Montagem Completa',
    itens: [
      { tipo: 'maoDeObra', percentual: 0.60 },
      { tipo: 'equipamentos', percentual: 0.25 },
      { tipo: 'indiretos', percentual: 0.08 },
      { tipo: 'lucro', percentual: 0.07 }
    ]
  }
};

// ==================== HISTÓRICO DE OBRAS (para referência) ====================
export const HISTORICO_OBRAS = [
  {
    id: 'hist-001',
    nome: 'SUPER LUNA - BELO VALE',
    cliente: 'Super Luna Supermercados',
    data: '2024-01',
    tipo: 'supermercado',
    setores: [
      {
        nome: 'POSTO',
        peso: 6815,
        valor: 164650,
        precoKg: 24.16,
        itens: [
          { desc: 'Estrutura Metálica', qtd: 6815, un: 'KG', unitario: 20, total: 136300 },
          { desc: 'Cobertura Telha Galvanizada 0,50', qtd: 250, un: 'M2', unitario: 75, total: 18750 },
          { desc: 'Calha SAC 300 2,0mm', qtd: 32, un: 'ML', unitario: 190, total: 6080 },
          { desc: 'Rufos', qtd: 64, un: 'ML', unitario: 55, total: 3520 }
        ]
      },
      {
        nome: 'SUPERMERCADO',
        peso: 81385,
        valor: 2272930,
        precoKg: 27.93,
        itens: [
          { desc: 'Estrutura Metálica Loja', qtd: 59300, un: 'KG', unitario: 19.5, total: 1156350 },
          { desc: 'Estrutura Marquise Estacionamento', qtd: 9550, un: 'KG', unitario: 19, total: 181450 },
          { desc: 'Estrutura Marquise Escritório/Copa/Banheiros', qtd: 780, un: 'KG', unitario: 19, total: 14820 },
          { desc: 'Estrutura Marquise Apoio Funcionários/Câmaras', qtd: 9800, un: 'KG', unitario: 19, total: 186200 },
          { desc: 'Estrutura Marquise Corredor', qtd: 840, un: 'KG', unitario: 19, total: 15960 },
          { desc: 'Estrutura Marquise Doca', qtd: 1115, un: 'KG', unitario: 19, total: 21185 },
          { desc: 'Calha', qtd: 340, un: 'ML', unitario: 120, total: 40800 },
          { desc: 'Rufos', qtd: 680, un: 'ML', unitario: 55, total: 37400 },
          { desc: 'Platibanda', qtd: 212, un: 'M2', unitario: 80, total: 16960 },
          { desc: 'Fechamento Lateral Externo PIR 30mm', qtd: 1005, un: 'M2', unitario: 125, total: 125625 },
          { desc: 'Fechamento Lateral Interno Galvanizado', qtd: 185, un: 'M2', unitario: 80, total: 14800 },
          { desc: 'Cobertura Telha Sanduíche PIR 30mm', qtd: 2500, un: 'M2', unitario: 135, total: 337500 },
          { desc: 'Cobertura Telha Galvalume 0,50', qtd: 1270, un: 'M2', unitario: 80, total: 101600 },
          { desc: 'Lanternim Tipo Robert / Estrutura Câmara', qtd: 1, un: 'VB', unitario: 63080, total: 63080 }
        ]
      },
      {
        nome: 'LOJAS',
        peso: 14800,
        valor: 428300,
        precoKg: 28.94,
        itens: [
          { desc: 'Estrutura Metálica', qtd: 14800, un: 'KG', unitario: 19.5, total: 288600 },
          { desc: 'Platibanda', qtd: 460, un: 'M2', unitario: 80, total: 36800 },
          { desc: 'Calha', qtd: 64, un: 'ML', unitario: 190, total: 12160 },
          { desc: 'Rufos', qtd: 128, un: 'ML', unitario: 55, total: 7040 },
          { desc: 'Cobertura Telha Sanduíche PIR 30mm', qtd: 620, un: 'M2', unitario: 135, total: 83700 }
        ]
      }
    ],
    totais: {
      pesoTotal: 103000,
      valorBruto: 2701230,
      valorFinal: 2700000,
      precoMedioKg: 26.21
    }
  }
];

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Calcula preço por faixa de peso
 */
export function calcularPrecoPorFaixa(faixas, quantidade) {
  const faixa = faixas.find(f => quantidade >= f.de && quantidade <= f.ate);
  return faixa ? faixa.preco : faixas[faixas.length - 1].preco;
}

/**
 * Calcula BDI total
 */
export function calcularBDI(parametros = PARAMETROS_MERCADO.bdi) {
  return Object.values(parametros).reduce((sum, val) => sum + val, 0);
}

/**
 * Aplica fator regional
 */
export function aplicarFatorRegional(valor, regiao) {
  const fator = PARAMETROS_MERCADO.regioes[regiao] || 1.0;
  return valor * fator;
}

/**
 * Calcula prazo estimado
 */
export function calcularPrazoEstimado(pesoKg, distanciaKm = 100) {
  const prazos = PARAMETROS_MERCADO.prazos;
  const pesoTon = pesoKg / 1000;

  return {
    projeto: prazos.projeto.padrao,
    fabricacao: Math.ceil(pesoTon * prazos.fabricacao.diasPorTon),
    pintura: Math.ceil(pesoTon * prazos.pintura.diasPorTon),
    transporte: Math.ceil(prazos.transporte.diasBase + (distanciaKm * prazos.transporte.diasPorKm)),
    montagem: Math.ceil(pesoTon * prazos.montagem.diasPorTon),
    total: 0 // será calculado
  };
}

/**
 * Busca preço de item
 */
export function buscarPrecoItem(codigo, nivel = 'medio') {
  const todasTabelas = [
    ...PRECOS_ESTRUTURA,
    ...PRECOS_COBERTURA,
    ...PRECOS_FECHAMENTO,
    ...PRECOS_COMPLEMENTOS,
    ...PRECOS_MAO_OBRA,
    ...PRECOS_TRANSPORTE
  ];

  const item = todasTabelas.find(i => i.codigo === codigo);
  if (!item) return null;

  const precoKey = nivel === 'baixo' ? 'precoBase' : nivel === 'alto' ? 'precoAlto' : 'precoMedio';
  return {
    ...item,
    precoSelecionado: item[precoKey]
  };
}

export default {
  CATEGORIAS_SERVICO,
  UNIDADES,
  TIPOS_ESTRUTURA,
  PRECOS_ESTRUTURA,
  PRECOS_COBERTURA,
  PRECOS_FECHAMENTO,
  PRECOS_COMPLEMENTOS,
  PRECOS_MAO_OBRA,
  PRECOS_TRANSPORTE,
  PARAMETROS_MERCADO,
  CUSTOS_PRODUCAO,
  COMPOSICOES,
  HISTORICO_OBRAS,
  calcularPrecoPorFaixa,
  calcularBDI,
  aplicarFatorRegional,
  calcularPrazoEstimado,
  buscarPrecoItem
};
