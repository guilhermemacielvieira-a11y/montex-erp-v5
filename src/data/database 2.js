/**
 * MONTEX ERP Premium - Base de Dados Centralizada
 *
 * Estrutura de dados completa seguindo o fluxo:
 * ORÇAMENTO → APROVADO → PROJETO → LISTAS → COMPRAS → ESTOQUE →
 * CORTE → FABRICAÇÃO → SOLDA → PINTURA → EXPEDIÇÃO → MONTAGEM
 */

// ========================================
// ENUMS E CONSTANTES
// ========================================

export const STATUS_ORCAMENTO = {
  RASCUNHO: 'rascunho',
  ENVIADO: 'enviado',
  EM_ANALISE: 'em_analise',
  APROVADO: 'aprovado',
  REJEITADO: 'rejeitado',
  REVISAO: 'revisao'
};

export const STATUS_OBRA = {
  ORCAMENTO: 'orcamento',
  APROVADA: 'aprovada',
  EM_PROJETO: 'em_projeto',
  AGUARDANDO_MATERIAL: 'aguardando_material',
  EM_PRODUCAO: 'em_producao',
  EM_EXPEDICAO: 'em_expedicao',
  EM_MONTAGEM: 'em_montagem',
  CONCLUIDA: 'concluida',
  CANCELADA: 'cancelada'
};

export const ETAPAS_PRODUCAO = {
  AGUARDANDO: 'aguardando',
  CORTE: 'corte',
  FABRICACAO: 'fabricacao',
  SOLDA: 'solda',
  PINTURA: 'pintura',
  EXPEDIDO: 'expedido'
};

export const STATUS_CORTE = {
  AGUARDANDO: 'aguardando',
  PROGRAMACAO: 'programacao',
  EM_CORTE: 'em_corte',
  CONFERENCIA: 'conferencia',
  LIBERADO: 'liberado'
};

export const STATUS_EXPEDICAO = {
  PREPARANDO: 'preparando',
  AGUARDANDO: 'aguardando',
  AGUARDANDO_TRANSPORTE: 'aguardando_transporte',
  CARREGANDO: 'carregando',
  EM_TRANSITO: 'em_transito',
  ENTREGUE: 'entregue',
  PROBLEMA: 'problema'
};

export const TIPOS_PECA = [
  'COLUNA', 'VIGA', 'VIGA-MESTRA', 'TESOURA', 'TRELIÇA',
  'TERÇA', 'TERÇA-TAP', 'CONTRAVENTAMENTO', 'TIRANTE',
  'DIAGONAL-VM', 'DIAGONAL-TL', 'CHAPA', 'CHUMBADOR',
  'MISULA', 'SUPORTE', 'CALHA', 'MÃO-FRANCESA', 'BOCAL',
  'MONTANTE-VM', 'MONTANTE-TL', 'COLUNETA'
];

export const CATEGORIAS_MATERIAL = [
  { id: 'chapas', nome: 'Chapas', unidade: 'm²', icone: '🔲' },
  { id: 'perfis_w', nome: 'Perfis W/I', unidade: 'm', icone: '🏗️' },
  { id: 'perfis_hp', nome: 'Perfis HP', unidade: 'm', icone: '🔩' },
  { id: 'cantoneiras', nome: 'Cantoneiras', unidade: 'm', icone: '📐' },
  { id: 'perfis_u', nome: 'Perfis U', unidade: 'm', icone: '⬛' },
  { id: 'tubos', nome: 'Tubos', unidade: 'm', icone: '🔧' },
  { id: 'barras', nome: 'Barras Redondas', unidade: 'm', icone: '⚫' },
  { id: 'parafusos', nome: 'Parafusos', unidade: 'un', icone: '🔩' },
  { id: 'tintas', nome: 'Tintas', unidade: 'L', icone: '🎨' },
  { id: 'consumiveis', nome: 'Consumíveis', unidade: 'un', icone: '⚡' }
];

export const MAQUINAS_CORTE = [
  { id: 'cnc_plasma', nome: 'CNC Plasma', tipo: 'chapas' },
  { id: 'serra_fita', nome: 'Serra Fita', tipo: 'perfis' },
  { id: 'guilhotina', nome: 'Guilhotina', tipo: 'chapas' },
  { id: 'oxicorte', nome: 'Oxicorte', tipo: 'chapas' },
  { id: 'policorte', nome: 'Policorte', tipo: 'perfis' }
];

// ========================================
// DADOS MOCK - CLIENTES
// ========================================

export const clientes = [
  {
    id: 'CLI001',
    razaoSocial: 'CONSTRUTORA CARMO LTDA',
    nomeFantasia: 'Construtora Carmo',
    cnpj: '12.345.678/0001-90',
    email: 'contato@construtora-carmo.com.br',
    telefone: '(31) 3333-4444',
    endereco: {
      logradouro: 'Av. Brasil',
      numero: '1500',
      bairro: 'Centro',
      cidade: 'Belo Vale',
      uf: 'MG',
      cep: '35473-000'
    },
    contato: 'Construtora Carmo',
    dataCadastro: '2024-01-15',
    obras: ['OBR001']
  },
  // Novos clientes serão cadastrados via sistema
];

// ========================================
// DADOS MOCK - OBRAS
// ========================================

export const obras = [
  {
    id: 'OBR001',
    codigo: '2026-01',
    nome: 'SUPER LUNA - BELO VALE',
    clienteId: 'CLI001',
    status: STATUS_OBRA.APROVADA,
    orcamentoId: 'ORC001',
    dataInicio: '2026-02-05',
    previsaoTermino: '2026-07-30',
    endereco: {
      logradouro: 'Av. Principal',
      numero: '500',
      bairro: 'Centro',
      cidade: 'Belo Vale',
      uf: 'MG'
    },
    metragem: 2500,
    pesoTotal: 107000, // 107.000 kg conforme contrato
    areaPintura: 6573.9,
    valorContrato: 2700000, // R$ 2.700.000,00 conforme contrato real
    progresso: {
      corte: 0,
      fabricacao: 0,
      solda: 0,
      pintura: 0,
      expedicao: 0,
      montagem: 0
    },
    responsavel: 'Eng. João Paulo',
    equipeProducao: [],
    equipeMontagem: []
  }
  // Novas obras serão cadastradas via sistema
];

// ========================================
// DADOS MOCK - ORÇAMENTOS
// ========================================

export const orcamentos = [
  {
    id: 'ORC001',
    numero: 'ORC-2026-001',
    clienteId: 'CLI001',
    obraId: 'OBR001',
    status: STATUS_ORCAMENTO.APROVADO,
    dataCriacao: '2025-12-15',
    dataAprovacao: '2026-01-20',
    validadeAte: '2026-02-28',
    versao: 3,
    itens: [
      { descricao: 'Estrutura metálica principal', peso: 80000, valorKg: 18.50, valor: 1480000 },
      { descricao: 'Terças e contraventamentos', peso: 20000, valorKg: 15.00, valor: 300000 },
      { descricao: 'Montagem em campo', unidade: 'vb', valor: 70000 }
    ],
    valorTotal: 1850000,
    condicoesPagamento: '30/60/90 dias',
    prazoEntrega: '90 dias',
    observacoes: 'Inclui pintura anticorrosiva e transporte'
  },
  // Novos orçamentos serão cadastrados via sistema
];

// ========================================
// DADOS MOCK - LISTAS DE MATERIAL
// ========================================

export const listasMaterial = [
  // === LST001 - Resumo de Material R1 ===
  {
    id: 'LST001',
    obraId: 'OBR001',
    nome: 'Resumo de Material',
    tipo: 'resumo_material',
    etapaVinculada: 'engenharia',
    revisao: 'R1',
    dataImportacao: '2026-02-05',
    arquivo: 'BELO-VALE_LISTA_RESUMO DE MATERIAL-R1.xlsx',
    totalItens: 36,
    pesoTotal: 215413.3,
    itens: [] // Populated from Resumo Material R1
  },
  // === LST002 - Materiais para Corte R1 ===
  {
    id: 'LST002',
    obraId: 'OBR001',
    nome: 'Materiais para Corte',
    tipo: 'materiais_corte',
    etapaVinculada: 'corte',
    revisao: 'R1',
    dataImportacao: '2026-02-05',
    arquivo: 'BELO-VALE_LISTA_MATERIAIS PARA CORTE-R1.xlsx',
    totalItens: 800,
    pesoTotal: 107706.7,
    totalQuantidade: 8775,
    tiposPeca: 22,
    itens: [] // 800 items loaded into pecasProducao
  },
  // === LST003 - Área de Pintura R1 ===
  {
    id: 'LST003',
    obraId: 'OBR001',
    nome: 'Área de Pintura',
    tipo: 'area_pintura',
    etapaVinculada: 'pintura',
    revisao: 'R1',
    dataImportacao: '2026-02-05',
    arquivo: 'BELO-VALE_LISTA_AREA DE PINTURA-R1.xlsx',
    totalItens: 125,
    pesoTotal: 107706.8,
    itens: [] // 125 items - area calcs per profile
  },
  // === LST004 - Área das Chapas R1 ===
  {
    id: 'LST004',
    obraId: 'OBR001',
    nome: 'Área das Chapas',
    tipo: 'area_chapas',
    etapaVinculada: 'corte',
    revisao: 'R1',
    dataImportacao: '2026-02-05',
    arquivo: 'BELO-VALE_LISTA_AREA DAS CHAPAS-R1.xlsx',
    totalItens: 9,
    pesoTotal: 27359.9,
    itens: [] // 9 espessuras de chapa
  },
  // === LST005 - Parafuso Resumo R1 ===
  {
    id: 'LST005',
    obraId: 'OBR001',
    nome: 'Parafusos (Resumo)',
    tipo: 'parafuso_resumo',
    etapaVinculada: 'montagem',
    revisao: 'R1',
    dataImportacao: '2026-02-05',
    arquivo: 'BELO-VALE_LISTA_Parafuso RESUMO_R1.xlsx',
    totalItens: 19,
    totalQuantidade: 20156,
    itens: [] // 19 tipos de parafusos
  },
  // === LST006 - Parafuso Montagem R0 ===
  {
    id: 'LST006',
    obraId: 'OBR001',
    nome: 'Parafusos (Montagem)',
    tipo: 'parafuso_montagem',
    etapaVinculada: 'montagem',
    revisao: 'R0',
    dataImportacao: '2026-02-05',
    arquivo: 'BELO-VALE_LISTA_Parafuso MONTAGEM_R0.xlsx',
    totalItens: 1259,
    totalQuantidade: 8526,
    itens: [] // 1259 detalhes de montagem
  },
  // === LST007 - Conjuntos R1 ===
  {
    id: 'LST007',
    obraId: 'OBR001',
    nome: 'Conjuntos (Montagem)',
    tipo: 'conjunto_montagem',
    etapaVinculada: 'fabricacao',
    revisao: 'R1',
    dataImportacao: '2026-02-05',
    arquivo: 'BELO-VALE_LISTA_CONJUNTOS-R1.xlsx',
    totalItens: 539,
    pesoTotal: 109842.7,
    totalQuantidade: 2188,
    itens: [] // 539 conjuntos
  }
];

// ========================================
// DADOS MOCK - ESTOQUE
// ========================================

// Estoque parte do ZERO — toda matéria-prima precisa ser comprada
// Estrutura baseada nos materiais necessários para obra SUPER LUNA (107.715 kg)
export const estoque = [
  // PERFIS LAMINADOS - A572-GR.50 (Colunas, Vigas-Mestra) - 56.191 kg necessários
  { id: 'EST-001', material: 'A572-GR.50', categoria: 'perfis_w', descricao: 'Perfis W (W410, W310, W250)', unidade: 'kg', quantidadeAtual: 43945.4, quantidadeMinima: 5000, quantidadeNecessaria: 56191, reservado: 0, obraReservada: 'OBR001', localizacao: 'A1', status: 'adequado', ultimaEntrada: '2026-01-23', nfEntrada: 'NF-006' },
  // PERFIS LAMINADOS - A36 (Suportes, Mísulas, Chapas) - 14.841 kg necessários
  { id: 'EST-002', material: 'A36', categoria: 'perfis_diversos', descricao: 'Perfis A36 (Cantoneiras, Barras, Chapas)', unidade: 'kg', quantidadeAtual: 19351.21, quantidadeMinima: 3000, quantidadeNecessaria: 14841, reservado: 0, obraReservada: 'OBR001', localizacao: 'A2', status: 'adequado', ultimaEntrada: '2026-01-28', nfEntrada: 'NF-008' },
  // PERFIS CONFORMADOS - CIVIL 300 (Terças, Tirantes, Calhas) - 30.678 kg necessários
  { id: 'EST-003', material: 'CIVIL 300', categoria: 'perfis_conformados', descricao: 'Perfis Conformados CIVIL 300 (U, C, Z)', unidade: 'kg', quantidadeAtual: 0, quantidadeMinima: 5000, quantidadeNecessaria: 30678, reservado: 0, obraReservada: null, localizacao: 'B1', status: 'sem_estoque' },
  // CHAPAS - SAC 41 (Contraventamentos) - 4.799 kg necessários
  { id: 'EST-004', material: 'SAC 41', categoria: 'chapas', descricao: 'Chapas SAC 41', unidade: 'kg', quantidadeAtual: 0, quantidadeMinima: 1000, quantidadeNecessaria: 4799, reservado: 0, obraReservada: null, localizacao: 'B2', status: 'sem_estoque' },
  // TUBOS - A53 (Chumbadores) - 1.206 kg necessários
  { id: 'EST-005', material: 'A53', categoria: 'tubos', descricao: 'Tubos A53', unidade: 'kg', quantidadeAtual: 0, quantidadeMinima: 500, quantidadeNecessaria: 1206, reservado: 0, obraReservada: null, localizacao: 'C1', status: 'sem_estoque' },
  // CONSUMÍVEIS
  { id: 'EST-006', material: 'ELETRODO', categoria: 'consumiveis', descricao: 'Eletrodos p/ Solda (E7018)', unidade: 'kg', quantidadeAtual: 200, quantidadeMinima: 200, quantidadeNecessaria: 2000, reservado: 0, obraReservada: 'OBR001', localizacao: 'D1', status: 'estoque_minimo', ultimaEntrada: '2026-01-19', nfEntrada: 'NF-003' },
  { id: 'EST-007', material: 'ARAME MIG', categoria: 'consumiveis', descricao: 'Arame MIG ER70S-6', unidade: 'kg', quantidadeAtual: 150, quantidadeMinima: 100, quantidadeNecessaria: 1500, reservado: 0, obraReservada: 'OBR001', localizacao: 'D2', status: 'adequado', ultimaEntrada: '2026-01-19', nfEntrada: 'NF-003' },
  { id: 'EST-008', material: 'DISCO CORTE', categoria: 'consumiveis', descricao: 'Discos de Corte 7"', unidade: 'un', quantidadeAtual: 100, quantidadeMinima: 50, quantidadeNecessaria: 300, reservado: 0, obraReservada: 'OBR001', localizacao: 'D3', status: 'adequado', ultimaEntrada: '2026-01-19', nfEntrada: 'NF-003' },
  { id: 'EST-009', material: 'DISCO DESBASTE', categoria: 'consumiveis', descricao: 'Discos de Desbaste 7"', unidade: 'un', quantidadeAtual: 80, quantidadeMinima: 30, quantidadeNecessaria: 200, reservado: 0, obraReservada: 'OBR001', localizacao: 'D4', status: 'adequado', ultimaEntrada: '2026-01-19', nfEntrada: 'NF-003' },
  // PINTURA
  { id: 'EST-010', material: 'PRIMER', categoria: 'pintura', descricao: 'Primer Epóxi (Zarcão)', unidade: 'lt', quantidadeAtual: 0, quantidadeMinima: 100, quantidadeNecessaria: 800, reservado: 0, obraReservada: null, localizacao: 'E1', status: 'sem_estoque' },
  { id: 'EST-011', material: 'TINTA ACABAMENTO', categoria: 'pintura', descricao: 'Tinta Acabamento Esmalte Sintético', unidade: 'lt', quantidadeAtual: 0, quantidadeMinima: 80, quantidadeNecessaria: 600, reservado: 0, obraReservada: null, localizacao: 'E2', status: 'sem_estoque' },
  { id: 'EST-012', material: 'SOLVENTE', categoria: 'pintura', descricao: 'Solvente / Thinner', unidade: 'lt', quantidadeAtual: 0, quantidadeMinima: 40, quantidadeNecessaria: 200, reservado: 0, obraReservada: null, localizacao: 'E3', status: 'sem_estoque' },
  // PARAFUSOS (estimativa - será detalhado com LST005)
  { id: 'EST-013', material: 'PARAFUSOS', categoria: 'fixacao', descricao: 'Parafusos Estruturais (diversos)', unidade: 'un', quantidadeAtual: 0, quantidadeMinima: 500, quantidadeNecessaria: 5000, reservado: 0, obraReservada: null, localizacao: 'F1', status: 'sem_estoque' },
  { id: 'EST-014', material: 'CHUMBADORES', categoria: 'fixacao', descricao: 'Chumbadores Químicos', unidade: 'un', quantidadeAtual: 0, quantidadeMinima: 50, quantidadeNecessaria: 200, reservado: 0, obraReservada: null, localizacao: 'F2', status: 'sem_estoque' },
];

// ========================================
// DADOS MOCK - PEÇAS PARA CORTE/PRODUÇÃO
// ========================================

// UPDATED: R1 Generated Data
// This array was regenerated with R1 data
export const pecasProducao = [
  { id: 'PEC-0000', obraId: 'OBR001', marca: '5', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 8397, quantidade: 1, material: 'A572-GR.50', peso: 450.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0001', obraId: 'OBR001', marca: '6', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 8649, quantidade: 1, material: 'A572-GR.50', peso: 464.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0002', obraId: 'OBR001', marca: '7', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 8943, quantidade: 1, material: 'A572-GR.50', peso: 480.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0003', obraId: 'OBR001', marca: '8', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 9520, quantidade: 1, material: 'A572-GR.50', peso: 511.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0004', obraId: 'OBR001', marca: '9', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 9354, quantidade: 1, material: 'A572-GR.50', peso: 502.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0005', obraId: 'OBR001', marca: '10', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 9098, quantidade: 1, material: 'A572-GR.50', peso: 488.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0006', obraId: 'OBR001', marca: '11', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 8657, quantidade: 1, material: 'A572-GR.50', peso: 464.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0007', obraId: 'OBR001', marca: '12', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 8895, quantidade: 1, material: 'A572-GR.50', peso: 477.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0008', obraId: 'OBR001', marca: '13', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 9178, quantidade: 1, material: 'A572-GR.50', peso: 492.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0009', obraId: 'OBR001', marca: '14', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 9456, quantidade: 1, material: 'A572-GR.50', peso: 507.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0010', obraId: 'OBR001', marca: '15', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 9086, quantidade: 1, material: 'A572-GR.50', peso: 487.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0011', obraId: 'OBR001', marca: '16', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 4707, quantidade: 1, material: 'A572-GR.50', peso: 252.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0012', obraId: 'OBR001', marca: '17', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 10053, quantidade: 1, material: 'A572-GR.50', peso: 539.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0013', obraId: 'OBR001', marca: '18', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 8753, quantidade: 2, material: 'A572-GR.50', peso: 940.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0014', obraId: 'OBR001', marca: '19', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 10746, quantidade: 1, material: 'A572-GR.50', peso: 577.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0015', obraId: 'OBR001', marca: '20', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 10156, quantidade: 1, material: 'A572-GR.50', peso: 545.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0016', obraId: 'OBR001', marca: '21', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 9697, quantidade: 1, material: 'A572-GR.50', peso: 520.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0017', obraId: 'OBR001', marca: '22', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 8397, quantidade: 3, material: 'A572-GR.50', peso: 1352.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0018', obraId: 'OBR001', marca: '23', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 8753, quantidade: 1, material: 'A572-GR.50', peso: 470.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0019', obraId: 'OBR001', marca: '24', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 9304, quantidade: 1, material: 'A572-GR.50', peso: 499.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0020', obraId: 'OBR001', marca: '25', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 9366, quantidade: 1, material: 'A572-GR.50', peso: 502.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0021', obraId: 'OBR001', marca: '26', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 8657, quantidade: 1, material: 'A572-GR.50', peso: 464.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0022', obraId: 'OBR001', marca: '27', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 9366, quantidade: 1, material: 'A572-GR.50', peso: 502.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0023', obraId: 'OBR001', marca: '28', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 9897, quantidade: 1, material: 'A572-GR.50', peso: 531.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0024', obraId: 'OBR001', marca: '29', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 8805, quantidade: 1, material: 'A572-GR.50', peso: 472.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0025', obraId: 'OBR001', marca: '30', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 9490, quantidade: 1, material: 'A572-GR.50', peso: 509.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0026', obraId: 'OBR001', marca: '31', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 8397, quantidade: 1, material: 'A572-GR.50', peso: 450.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0027', obraId: 'OBR001', marca: '32', tipo: 'COLUNA', perfil: 'W410X53', comprimento: 10396, quantidade: 1, material: 'A572-GR.50', peso: 558.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0028', obraId: 'OBR001', marca: '33', tipo: 'TESOURA', perfil: 'W410X53', comprimento: 4366, quantidade: 3, material: 'A572-GR.50', peso: 703.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0029', obraId: 'OBR001', marca: '34', tipo: 'TESOURA', perfil: 'W410X53', comprimento: 11984, quantidade: 3, material: 'A572-GR.50', peso: 1930.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0030', obraId: 'OBR001', marca: '35', tipo: 'MISULA', perfil: 'W410X53', comprimento: 879, quantidade: 3, material: 'A572-GR.50', peso: 141.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0031', obraId: 'OBR001', marca: '36', tipo: 'MISULA', perfil: 'W410X53', comprimento: 893, quantidade: 3, material: 'A572-GR.50', peso: 143.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0032', obraId: 'OBR001', marca: '37', tipo: 'COLUNA', perfil: 'W200X35.9', comprimento: 6634, quantidade: 1, material: 'A572-GR.50', peso: 238.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0033', obraId: 'OBR001', marca: '38', tipo: 'COLUNA', perfil: 'W200X35.9', comprimento: 4713, quantidade: 2, material: 'A572-GR.50', peso: 338.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0034', obraId: 'OBR001', marca: '39', tipo: 'COLUNA', perfil: 'W200X35.9', comprimento: 4898, quantidade: 2, material: 'A572-GR.50', peso: 351.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0035', obraId: 'OBR001', marca: '40', tipo: 'COLUNA', perfil: 'W200X35.9', comprimento: 6634, quantidade: 7, material: 'A572-GR.50', peso: 1665.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0036', obraId: 'OBR001', marca: '41', tipo: 'COLUNA', perfil: 'W200X35.9', comprimento: 10145, quantidade: 1, material: 'A572-GR.50', peso: 363.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0037', obraId: 'OBR001', marca: '42', tipo: 'COLUNA', perfil: 'W200X35.9', comprimento: 3266, quantidade: 1, material: 'A572-GR.50', peso: 117.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0038', obraId: 'OBR001', marca: '43', tipo: 'COLUNA', perfil: 'HP310X79', comprimento: 9143, quantidade: 3, material: 'A572-GR.50', peso: 2153.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0039', obraId: 'OBR001', marca: '44', tipo: 'COLUNA', perfil: 'HP310X79', comprimento: 8657, quantidade: 3, material: 'A572-GR.50', peso: 2038.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0040', obraId: 'OBR001', marca: '45', tipo: 'COLUNA', perfil: 'HP310X79', comprimento: 8903, quantidade: 2, material: 'A572-GR.50', peso: 1397.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0041', obraId: 'OBR001', marca: '46', tipo: 'COLUNA', perfil: 'HP310X79', comprimento: 9449, quantidade: 2, material: 'A572-GR.50', peso: 1483.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0042', obraId: 'OBR001', marca: '47', tipo: 'COLUNA', perfil: 'W310X38.7', comprimento: 7846, quantidade: 4, material: 'A572-GR.50', peso: 1224.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0043', obraId: 'OBR001', marca: '48', tipo: 'COLUNA', perfil: 'W310X38.7', comprimento: 8422, quantidade: 4, material: 'A572-GR.50', peso: 1314.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0044', obraId: 'OBR001', marca: '49', tipo: 'COLUNA', perfil: 'W310X38.7', comprimento: 1465, quantidade: 4, material: 'A572-GR.50', peso: 228.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0045', obraId: 'OBR001', marca: '50', tipo: 'CHAPA', perfil: 'CH16X300', comprimento: 350, quantidade: 13, material: 'A36', peso: 171.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0046', obraId: 'OBR001', marca: '51', tipo: 'CHAPA', perfil: 'CH16X160', comprimento: 550, quantidade: 17, material: 'A36', peso: 187.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0047', obraId: 'OBR001', marca: '52', tipo: 'CHAPA', perfil: 'CH16X180', comprimento: 553, quantidade: 6, material: 'A36', peso: 75.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0048', obraId: 'OBR001', marca: '53', tipo: 'CHAPA', perfil: 'CH16X330', comprimento: 330, quantidade: 4, material: 'A36', peso: 54.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0049', obraId: 'OBR001', marca: '54', tipo: 'CHAPA', perfil: 'CH16X180', comprimento: 704, quantidade: 6, material: 'A36', peso: 95.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0050', obraId: 'OBR001', marca: '55', tipo: 'CHAPA', perfil: 'CH16X180', comprimento: 700, quantidade: 34, material: 'A36', peso: 537.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0051', obraId: 'OBR001', marca: '56', tipo: 'CHUMBADOR', perfil: 'FERRO Ø3/4', comprimento: 600, quantidade: 52, material: 'A36', peso: 64.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0052', obraId: 'OBR001', marca: '59', tipo: 'CHAPA', perfil: 'CH22.4X500', comprimento: 500, quantidade: 4, material: 'A36', peso: 175.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0053', obraId: 'OBR001', marca: '60', tipo: 'CHAPA', perfil: 'CH22.4X400', comprimento: 600, quantidade: 31, material: 'A36', peso: 1308.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0054', obraId: 'OBR001', marca: '61', tipo: 'CHAPA', perfil: 'CH22.4X400', comprimento: 500, quantidade: 10, material: 'A36', peso: 351.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0055', obraId: 'OBR001', marca: '66', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 1846, quantidade: 1, material: 'CIVIL 300', peso: 13.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0056', obraId: 'OBR001', marca: '67', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 10105, quantidade: 1, material: 'CIVIL 300', peso: 73.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0057', obraId: 'OBR001', marca: '69', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 9810, quantidade: 1, material: 'CIVIL 300', peso: 71.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0058', obraId: 'OBR001', marca: '70', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 10105, quantidade: 1, material: 'CIVIL 300', peso: 73.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0059', obraId: 'OBR001', marca: '72', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 10660, quantidade: 1, material: 'CIVIL 300', peso: 77.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0060', obraId: 'OBR001', marca: '79', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 11380, quantidade: 1, material: 'CIVIL 300', peso: 82.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0061', obraId: 'OBR001', marca: '84', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 11585, quantidade: 1, material: 'CIVIL 300', peso: 84.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0062', obraId: 'OBR001', marca: '86', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 7304, quantidade: 1, material: 'CIVIL 300', peso: 53.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0063', obraId: 'OBR001', marca: '89', tipo: 'CHUMBADOR', perfil: 'FERRO Ø1', comprimento: 600, quantidade: 188, material: 'A36', peso: 411.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0064', obraId: 'OBR001', marca: '112', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 7304, quantidade: 1, material: 'CIVIL 300', peso: 43.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0065', obraId: 'OBR001', marca: '113', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9459, quantidade: 1, material: 'CIVIL 300', peso: 56.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0066', obraId: 'OBR001', marca: '151', tipo: 'VIGA', perfil: 'UE200X75X20X2', comprimento: 3596, quantidade: 1, material: 'CIVIL 300', peso: 20.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0067', obraId: 'OBR001', marca: '152', tipo: 'VIGA', perfil: 'UE200X75X20X2', comprimento: 3596, quantidade: 1, material: 'CIVIL 300', peso: 20.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0068', obraId: 'OBR001', marca: '153', tipo: 'VIGA', perfil: 'UE200X75X20X2', comprimento: 206, quantidade: 1, material: 'CIVIL 300', peso: 0.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0069', obraId: 'OBR001', marca: '154', tipo: 'VIGA', perfil: 'UE200X75X20X2', comprimento: 206, quantidade: 1, material: 'CIVIL 300', peso: 0.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0070', obraId: 'OBR001', marca: '155', tipo: 'VIGA', perfil: 'UE200X75X20X2', comprimento: 394, quantidade: 1, material: 'CIVIL 300', peso: 1.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0071', obraId: 'OBR001', marca: '156', tipo: 'VIGA', perfil: 'UE200X75X20X2', comprimento: 394, quantidade: 1, material: 'CIVIL 300', peso: 1.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0072', obraId: 'OBR001', marca: '157', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 1856, quantidade: 2, material: 'CIVIL 300', peso: 22.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0073', obraId: 'OBR001', marca: '158', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 5764, quantidade: 1, material: 'CIVIL 300', peso: 34.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0074', obraId: 'OBR001', marca: '168', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 4499, quantidade: 1, material: 'CIVIL 300', peso: 27.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0075', obraId: 'OBR001', marca: '181', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 10105, quantidade: 1, material: 'CIVIL 300', peso: 60.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0076', obraId: 'OBR001', marca: '191', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9810, quantidade: 1, material: 'CIVIL 300', peso: 58.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0077', obraId: 'OBR001', marca: '201', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 8544, quantidade: 1, material: 'CIVIL 300', peso: 51.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0078', obraId: 'OBR001', marca: '206', tipo: 'VIGA-MESTRA', perfil: 'W200X19.3', comprimento: 12920, quantidade: 1, material: 'A572-GR.50', peso: 254.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0079', obraId: 'OBR001', marca: '207', tipo: 'VIGA-MESTRA', perfil: 'W200X19.3', comprimento: 13618, quantidade: 6, material: 'A572-GR.50', peso: 1610.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0080', obraId: 'OBR001', marca: '208', tipo: 'VIGA-MESTRA', perfil: 'W200X19.3', comprimento: 13271, quantidade: 4, material: 'A572-GR.50', peso: 1045.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0081', obraId: 'OBR001', marca: '209', tipo: 'VIGA-MESTRA', perfil: 'W200X19.3', comprimento: 12920, quantidade: 1, material: 'A572-GR.50', peso: 254.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0082', obraId: 'OBR001', marca: '210', tipo: 'VIGA-MESTRA', perfil: 'W200X19.3', comprimento: 13635, quantidade: 2, material: 'A572-GR.50', peso: 537.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0083', obraId: 'OBR001', marca: '269', tipo: 'CHAPA', perfil: 'CH8X199.8', comprimento: 383, quantidade: 1, material: 'A36', peso: 4.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0084', obraId: 'OBR001', marca: '270', tipo: 'CHAPA', perfil: 'CH8X194.4', comprimento: 474, quantidade: 3, material: 'A36', peso: 17.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0085', obraId: 'OBR001', marca: '271', tipo: 'CHAPA', perfil: 'CH8X95', comprimento: 125, quantidade: 16, material: 'A36', peso: 11.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0086', obraId: 'OBR001', marca: '272', tipo: 'CHAPA', perfil: 'CH8X100.5', comprimento: 125, quantidade: 20, material: 'A36', peso: 15.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0087', obraId: 'OBR001', marca: '273', tipo: 'CHAPA', perfil: 'CH8X160', comprimento: 1098, quantidade: 3, material: 'A36', peso: 33.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0088', obraId: 'OBR001', marca: '274', tipo: 'CHAPA', perfil: 'CH8X48.1', comprimento: 190, quantidade: 12, material: 'A36', peso: 6.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0089', obraId: 'OBR001', marca: '275', tipo: 'CHAPA', perfil: 'CH8X75', comprimento: 100, quantidade: 12, material: 'A36', peso: 5.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0090', obraId: 'OBR001', marca: '276', tipo: 'CHAPA', perfil: 'CH8X100', comprimento: 105, quantidade: 2, material: 'A36', peso: 1.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0091', obraId: 'OBR001', marca: '277', tipo: 'CHAPA', perfil: 'CH8X76', comprimento: 190, quantidade: 24, material: 'A36', peso: 21.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0092', obraId: 'OBR001', marca: '278', tipo: 'CHAPA', perfil: 'CH8X100', comprimento: 177, quantidade: 26, material: 'A36', peso: 28.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0093', obraId: 'OBR001', marca: '279', tipo: 'CHAPA', perfil: 'CH8X166.5', comprimento: 200, quantidade: 2, material: 'A36', peso: 4.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0094', obraId: 'OBR001', marca: '280', tipo: 'CHAPA', perfil: 'CH8X66.8', comprimento: 381, quantidade: 69, material: 'A36', peso: 110.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0095', obraId: 'OBR001', marca: '281', tipo: 'CHAPA', perfil: 'CH8X84.8', comprimento: 381, quantidade: 237, material: 'A36', peso: 480.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0096', obraId: 'OBR001', marca: '282', tipo: 'CHAPA', perfil: 'CH8X80', comprimento: 381, quantidade: 3, material: 'A36', peso: 5.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0097', obraId: 'OBR001', marca: '283', tipo: 'CHAPA', perfil: 'CH8X79.4', comprimento: 181, quantidade: 72, material: 'A36', peso: 64.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0098', obraId: 'OBR001', marca: '284', tipo: 'CHAPA', perfil: 'CH8X75', comprimento: 181, quantidade: 6, material: 'A36', peso: 5.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0099', obraId: 'OBR001', marca: '285', tipo: 'CHAPA', perfil: 'CH8X48', comprimento: 240, quantidade: 136, material: 'A36', peso: 98.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0100', obraId: 'OBR001', marca: '286', tipo: 'CHAPA', perfil: 'CH8X47.8', comprimento: 138, quantidade: 52, material: 'A36', peso: 21.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0101', obraId: 'OBR001', marca: '287', tipo: 'CHAPA', perfil: 'CH8X45', comprimento: 240, quantidade: 2, material: 'A36', peso: 1.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0102', obraId: 'OBR001', marca: '288', tipo: 'CHAPA', perfil: 'CH8X60', comprimento: 190, quantidade: 4, material: 'A36', peso: 2.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0103', obraId: 'OBR001', marca: '289', tipo: 'CHAPA', perfil: 'CH8X78.1', comprimento: 502, quantidade: 4, material: 'A36', peso: 9.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0104', obraId: 'OBR001', marca: '290', tipo: 'CHAPA', perfil: 'CH8X66.8', comprimento: 217, quantidade: 1, material: 'A36', peso: 0.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0105', obraId: 'OBR001', marca: '291', tipo: 'CHAPA', perfil: 'CH8X179.4', comprimento: 181, quantidade: 8, material: 'A36', peso: 16.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0106', obraId: 'OBR001', marca: '292', tipo: 'CHAPA', perfil: 'CH8X80', comprimento: 282, quantidade: 24, material: 'A36', peso: 34.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0107', obraId: 'OBR001', marca: '293', tipo: 'CHAPA', perfil: 'CH8X80', comprimento: 206, quantidade: 62, material: 'A36', peso: 64.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0108', obraId: 'OBR001', marca: '294', tipo: 'CHAPA', perfil: 'CH8X80', comprimento: 264, quantidade: 90, material: 'A36', peso: 119.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0109', obraId: 'OBR001', marca: '295', tipo: 'CHAPA', perfil: 'CH8X90', comprimento: 245, quantidade: 8, material: 'A36', peso: 11.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0110', obraId: 'OBR001', marca: '296', tipo: 'CHAPA', perfil: 'CH8X90', comprimento: 370, quantidade: 52, material: 'A36', peso: 108.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0111', obraId: 'OBR001', marca: '297', tipo: 'CHAPA', perfil: 'CH8X115', comprimento: 455, quantidade: 1, material: 'A36', peso: 3.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0112', obraId: 'OBR001', marca: '298', tipo: 'CHAPA', perfil: 'CH8X199.8', comprimento: 506, quantidade: 1, material: 'A36', peso: 6.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0113', obraId: 'OBR001', marca: '299', tipo: 'CHAPA', perfil: 'CH8X162.8', comprimento: 217, quantidade: 1, material: 'A36', peso: 2.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0114', obraId: 'OBR001', marca: '300', tipo: 'CHAPA', perfil: 'CH8X162.8', comprimento: 381, quantidade: 1, material: 'A36', peso: 3.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0115', obraId: 'OBR001', marca: '301', tipo: 'CHAPA', perfil: 'CH8X152', comprimento: 666, quantidade: 1, material: 'A36', peso: 6.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0116', obraId: 'OBR001', marca: '302', tipo: 'CHAPA', perfil: 'CH8X96', comprimento: 155, quantidade: 1, material: 'A36', peso: 0.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0117', obraId: 'OBR001', marca: '303', tipo: 'CHAPA', perfil: 'CH8X152', comprimento: 96, quantidade: 2, material: 'A36', peso: 1.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0118', obraId: 'OBR001', marca: '304', tipo: 'CHAPA', perfil: 'CH8X146.6', comprimento: 285, quantidade: 1, material: 'A36', peso: 2.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0119', obraId: 'OBR001', marca: '305', tipo: 'CHAPA', perfil: 'CH8X120', comprimento: 367, quantidade: 2, material: 'A36', peso: 5.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0120', obraId: 'OBR001', marca: '306', tipo: 'CHAPA', perfil: 'CH8X160', comprimento: 1098, quantidade: 1, material: 'A36', peso: 11.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0121', obraId: 'OBR001', marca: '307', tipo: 'CHAPA', perfil: 'CH8X190', comprimento: 1194, quantidade: 8, material: 'A36', peso: 114.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0122', obraId: 'OBR001', marca: '308', tipo: 'CHAPA', perfil: 'CH8X140', comprimento: 420, quantidade: 2, material: 'A36', peso: 7.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0123', obraId: 'OBR001', marca: '309', tipo: 'CHAPA', perfil: 'CH8X100', comprimento: 160, quantidade: 52, material: 'A36', peso: 52.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0124', obraId: 'OBR001', marca: '310', tipo: 'CHAPA', perfil: 'CH8X110', comprimento: 110, quantidade: 26, material: 'A36', peso: 19.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0125', obraId: 'OBR001', marca: '311', tipo: 'CHAPA', perfil: 'CH8X147.5', comprimento: 277, quantidade: 60, material: 'A36', peso: 154.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0126', obraId: 'OBR001', marca: '312', tipo: 'CHAPA', perfil: 'CH8X160', comprimento: 1098, quantidade: 3, material: 'A36', peso: 33.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0127', obraId: 'OBR001', marca: '313', tipo: 'CHAPA', perfil: 'CH8X160', comprimento: 1098, quantidade: 3, material: 'A36', peso: 33.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0128', obraId: 'OBR001', marca: '314', tipo: 'CHAPA', perfil: 'CH8X160', comprimento: 1098, quantidade: 6, material: 'A36', peso: 66.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0129', obraId: 'OBR001', marca: '315', tipo: 'MISULA', perfil: 'W410X38.8', comprimento: 894, quantidade: 14, material: 'A572-GR.50', peso: 494.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0130', obraId: 'OBR001', marca: '316', tipo: 'MISULA', perfil: 'W410X38.8', comprimento: 880, quantidade: 14, material: 'A572-GR.50', peso: 486.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0131', obraId: 'OBR001', marca: '317', tipo: 'MISULA', perfil: 'W410X38.8', comprimento: 525, quantidade: 3, material: 'A572-GR.50', peso: 62.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0132', obraId: 'OBR001', marca: '318', tipo: 'MISULA', perfil: 'W410X38.8', comprimento: 512, quantidade: 3, material: 'A572-GR.50', peso: 60.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0133', obraId: 'OBR001', marca: '319', tipo: 'VIGA', perfil: 'W410X38.8', comprimento: 9379, quantidade: 1, material: 'A572-GR.50', peso: 370.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0134', obraId: 'OBR001', marca: '320', tipo: 'VIGA', perfil: 'W410X38.8', comprimento: 6290, quantidade: 1, material: 'A572-GR.50', peso: 248.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0135', obraId: 'OBR001', marca: '321', tipo: 'TESOURA', perfil: 'W410X38.8', comprimento: 6930, quantidade: 2, material: 'A572-GR.50', peso: 547.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0136', obraId: 'OBR001', marca: '322', tipo: 'TESOURA', perfil: 'W410X38.8', comprimento: 6790, quantidade: 13, material: 'A572-GR.50', peso: 3485.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0137', obraId: 'OBR001', marca: '323', tipo: 'TESOURA', perfil: 'W410X38.8', comprimento: 12589, quantidade: 3, material: 'A572-GR.50', peso: 1491.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0138', obraId: 'OBR001', marca: '324', tipo: 'TESOURA', perfil: 'W410X38.8', comprimento: 10798, quantidade: 3, material: 'A572-GR.50', peso: 1279.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0139', obraId: 'OBR001', marca: '325', tipo: 'TESOURA', perfil: 'W410X38.8', comprimento: 11301, quantidade: 1, material: 'A572-GR.50', peso: 446.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0140', obraId: 'OBR001', marca: '326', tipo: 'TESOURA', perfil: 'W410X38.8', comprimento: 10454, quantidade: 2, material: 'A572-GR.50', peso: 825.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0141', obraId: 'OBR001', marca: '327', tipo: 'TESOURA', perfil: 'W410X38.8', comprimento: 4043, quantidade: 1, material: 'A572-GR.50', peso: 159.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0142', obraId: 'OBR001', marca: '328', tipo: 'TESOURA', perfil: 'W410X38.8', comprimento: 9643, quantidade: 3, material: 'A572-GR.50', peso: 1142.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0143', obraId: 'OBR001', marca: '329', tipo: 'TESOURA', perfil: 'W410X38.8', comprimento: 13857, quantidade: 2, material: 'A572-GR.50', peso: 1094.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0144', obraId: 'OBR001', marca: '330', tipo: 'TESOURA', perfil: 'W410X38.8', comprimento: 5047, quantidade: 2, material: 'A572-GR.50', peso: 398.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0145', obraId: 'OBR001', marca: '332', tipo: 'DIAGONAL', perfil: 'TUBO101.6X5.7', comprimento: 6834, quantidade: 13, material: 'A53', peso: 1206.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0146', obraId: 'OBR001', marca: '333', tipo: 'TESOURA', perfil: 'W150X13', comprimento: 607, quantidade: 13, material: 'A572-GR.50', peso: 102.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0147', obraId: 'OBR001', marca: '334', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 237, quantidade: 3, material: 'A572-GR.50', peso: 9.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0148', obraId: 'OBR001', marca: '335', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 238, quantidade: 1, material: 'A572-GR.50', peso: 3.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0149', obraId: 'OBR001', marca: '336', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 320, quantidade: 1, material: 'A572-GR.50', peso: 4.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0150', obraId: 'OBR001', marca: '337', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 1635, quantidade: 2, material: 'A572-GR.50', peso: 42.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0151', obraId: 'OBR001', marca: '338', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 1130, quantidade: 1, material: 'A572-GR.50', peso: 14.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0152', obraId: 'OBR001', marca: '339', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 900, quantidade: 1, material: 'A572-GR.50', peso: 11.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0153', obraId: 'OBR001', marca: '340', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 692, quantidade: 1, material: 'A572-GR.50', peso: 9.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0154', obraId: 'OBR001', marca: '341', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 1086, quantidade: 1, material: 'A572-GR.50', peso: 14.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0155', obraId: 'OBR001', marca: '342', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 1392, quantidade: 1, material: 'A572-GR.50', peso: 18.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0156', obraId: 'OBR001', marca: '343', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 1963, quantidade: 1, material: 'A572-GR.50', peso: 25.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0157', obraId: 'OBR001', marca: '344', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 1740, quantidade: 1, material: 'A572-GR.50', peso: 22.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0158', obraId: 'OBR001', marca: '345', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 1446, quantidade: 1, material: 'A572-GR.50', peso: 18.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0159', obraId: 'OBR001', marca: '346', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 1024, quantidade: 1, material: 'A572-GR.50', peso: 13.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0160', obraId: 'OBR001', marca: '347', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 870, quantidade: 1, material: 'A572-GR.50', peso: 11.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0161', obraId: 'OBR001', marca: '348', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 492, quantidade: 1, material: 'A572-GR.50', peso: 6.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0162', obraId: 'OBR001', marca: '349', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 1035, quantidade: 1, material: 'A572-GR.50', peso: 13.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0163', obraId: 'OBR001', marca: '350', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 1291, quantidade: 1, material: 'A572-GR.50', peso: 16.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0164', obraId: 'OBR001', marca: '351', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 1732, quantidade: 1, material: 'A572-GR.50', peso: 22.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0165', obraId: 'OBR001', marca: '352', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 1495, quantidade: 1, material: 'A572-GR.50', peso: 19.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0166', obraId: 'OBR001', marca: '353', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 1212, quantidade: 1, material: 'A572-GR.50', peso: 15.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0167', obraId: 'OBR001', marca: '354', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 933, quantidade: 1, material: 'A572-GR.50', peso: 12.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0168', obraId: 'OBR001', marca: '355', tipo: 'SUPORTE', perfil: 'W150X13', comprimento: 1303, quantidade: 1, material: 'A572-GR.50', peso: 17.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0169', obraId: 'OBR001', marca: '356', tipo: 'CHAPA', perfil: 'CH12.5X120', comprimento: 479, quantidade: 1, material: 'A36', peso: 5.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0170', obraId: 'OBR001', marca: '357', tipo: 'CHAPA', perfil: 'CH12.5X220', comprimento: 230, quantidade: 26, material: 'A36', peso: 129.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0171', obraId: 'OBR001', marca: '358', tipo: 'CHAPA', perfil: 'CH12.5X150', comprimento: 277, quantidade: 1, material: 'A36', peso: 4.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0172', obraId: 'OBR001', marca: '359', tipo: 'CHAPA', perfil: 'CH12.5X165', comprimento: 341, quantidade: 1, material: 'A36', peso: 5.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0173', obraId: 'OBR001', marca: '360', tipo: 'CHAPA', perfil: 'CH12.5X150', comprimento: 347, quantidade: 1, material: 'A36', peso: 5.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0174', obraId: 'OBR001', marca: '361', tipo: 'CHAPA', perfil: 'CH12.5X150', comprimento: 397, quantidade: 5, material: 'A36', peso: 29.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0175', obraId: 'OBR001', marca: '362', tipo: 'CHAPA', perfil: 'CH12.5X150', comprimento: 507, quantidade: 43, material: 'A36', peso: 321.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0176', obraId: 'OBR001', marca: '363', tipo: 'CHAPA', perfil: 'CH12.5X150', comprimento: 507, quantidade: 9, material: 'A36', peso: 67.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0177', obraId: 'OBR001', marca: '364', tipo: 'CHAPA', perfil: 'CH12.5X150', comprimento: 507, quantidade: 2, material: 'A36', peso: 14.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0178', obraId: 'OBR001', marca: '365', tipo: 'CHAPA', perfil: 'CH12.5X150', comprimento: 507, quantidade: 11, material: 'A36', peso: 82.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0179', obraId: 'OBR001', marca: '366', tipo: 'CHAPA', perfil: 'CH12.5X150', comprimento: 507, quantidade: 1, material: 'A36', peso: 7.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0180', obraId: 'OBR001', marca: '367', tipo: 'CHAPA', perfil: 'CH12.5X150', comprimento: 507, quantidade: 1, material: 'A36', peso: 7.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0181', obraId: 'OBR001', marca: '368', tipo: 'CHAPA', perfil: 'CH12.5X150', comprimento: 567, quantidade: 2, material: 'A36', peso: 16.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0182', obraId: 'OBR001', marca: '369', tipo: 'CHAPA', perfil: 'CH12.5X100', comprimento: 148, quantidade: 13, material: 'A36', peso: 18.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0183', obraId: 'OBR001', marca: '370', tipo: 'CHAPA', perfil: 'CH9.5X220', comprimento: 270, quantidade: 3, material: 'A36', peso: 13.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0184', obraId: 'OBR001', marca: '371', tipo: 'CHAPA', perfil: 'CH9.5X178', comprimento: 250, quantidade: 13, material: 'A36', peso: 43.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0185', obraId: 'OBR001', marca: '372', tipo: 'CHAPA', perfil: 'CH9.5X82.5', comprimento: 150, quantidade: 8, material: 'A36', peso: 7.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0186', obraId: 'OBR001', marca: '373', tipo: 'CHAPA', perfil: 'CH9.5X82.5', comprimento: 150, quantidade: 8, material: 'A36', peso: 7.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0187', obraId: 'OBR001', marca: '374', tipo: 'CHAPA', perfil: 'CH9.5X80', comprimento: 172, quantidade: 288, material: 'A36', peso: 296.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0188', obraId: 'OBR001', marca: '375', tipo: 'CHAPA', perfil: 'CH9.5X180', comprimento: 465, quantidade: 29, material: 'A36', peso: 181.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0189', obraId: 'OBR001', marca: '376', tipo: 'CHAPA', perfil: 'CH9.5X180', comprimento: 390, quantidade: 65, material: 'A36', peso: 340.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0190', obraId: 'OBR001', marca: '377', tipo: 'CHAPA', perfil: 'CH9.5X84.8', comprimento: 381, quantidade: 64, material: 'A36', peso: 154.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0191', obraId: 'OBR001', marca: '378', tipo: 'CHAPA', perfil: 'CH9.5X166.6', comprimento: 193, quantidade: 13, material: 'A36', peso: 31.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0192', obraId: 'OBR001', marca: '379', tipo: 'CHAPA', perfil: 'CH2X210', comprimento: 400, quantidade: 4, material: 'SAC 41', peso: 5.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0193', obraId: 'OBR001', marca: '380', tipo: 'CHAPA', perfil: 'CH2X190', comprimento: 400, quantidade: 4, material: 'SAC 41', peso: 4.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0194', obraId: 'OBR001', marca: '381', tipo: 'CHAPA', perfil: 'CH2X218', comprimento: 500, quantidade: 2, material: 'SAC 41', peso: 3.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0195', obraId: 'OBR001', marca: '382', tipo: 'CHAPA', perfil: 'CH2X218', comprimento: 450, quantidade: 4, material: 'SAC 41', peso: 6.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0196', obraId: 'OBR001', marca: '384', tipo: 'CALHA', perfil: 'CH2X938.1', comprimento: 6000, quantidade: 4, material: 'SAC 41', peso: 353.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0197', obraId: 'OBR001', marca: '386', tipo: 'CALHA', perfil: 'CH2X993.1', comprimento: 6000, quantidade: 4, material: 'SAC 41', peso: 374.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0198', obraId: 'OBR001', marca: '389', tipo: 'CALHA', perfil: 'CH2X1096.5', comprimento: 6000, quantidade: 4, material: 'SAC 41', peso: 413.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0199', obraId: 'OBR001', marca: '391', tipo: 'CALHA', perfil: 'CH2X1162.2', comprimento: 6000, quantidade: 2, material: 'SAC 41', peso: 219.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0200', obraId: 'OBR001', marca: '392', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1442, quantidade: 6, material: 'A36', peso: 52.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0201', obraId: 'OBR001', marca: '393', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1442, quantidade: 6, material: 'A36', peso: 52.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0202', obraId: 'OBR001', marca: '394', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1359, quantidade: 1, material: 'A36', peso: 8.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0203', obraId: 'OBR001', marca: '395', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1359, quantidade: 1, material: 'A36', peso: 8.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0204', obraId: 'OBR001', marca: '396', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1540, quantidade: 5, material: 'A36', peso: 46.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0205', obraId: 'OBR001', marca: '397', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1540, quantidade: 5, material: 'A36', peso: 46.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0206', obraId: 'OBR001', marca: '398', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1384, quantidade: 1, material: 'A36', peso: 8.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0207', obraId: 'OBR001', marca: '399', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1384, quantidade: 1, material: 'A36', peso: 8.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0208', obraId: 'OBR001', marca: '400', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 800, quantidade: 2, material: 'A36', peso: 9.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0209', obraId: 'OBR001', marca: '401', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 800, quantidade: 2, material: 'A36', peso: 9.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0210', obraId: 'OBR001', marca: '402', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1604, quantidade: 2, material: 'A36', peso: 19.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0211', obraId: 'OBR001', marca: '403', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1604, quantidade: 2, material: 'A36', peso: 19.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0212', obraId: 'OBR001', marca: '404', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 798, quantidade: 2, material: 'A36', peso: 9.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0213', obraId: 'OBR001', marca: '405', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 720, quantidade: 2, material: 'A36', peso: 8.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0214', obraId: 'OBR001', marca: '406', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 720, quantidade: 2, material: 'A36', peso: 8.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0215', obraId: 'OBR001', marca: '407', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1426, quantidade: 2, material: 'A36', peso: 17.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0216', obraId: 'OBR001', marca: '408', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1426, quantidade: 2, material: 'A36', peso: 17.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0217', obraId: 'OBR001', marca: '409', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 700, quantidade: 1, material: 'A36', peso: 4.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0218', obraId: 'OBR001', marca: '410', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 700, quantidade: 1, material: 'A36', peso: 4.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0219', obraId: 'OBR001', marca: '411', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 688, quantidade: 1, material: 'A36', peso: 4.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0220', obraId: 'OBR001', marca: '412', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 688, quantidade: 1, material: 'A36', peso: 4.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0221', obraId: 'OBR001', marca: '413', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1458, quantidade: 2, material: 'A36', peso: 17.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0222', obraId: 'OBR001', marca: '414', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1458, quantidade: 2, material: 'A36', peso: 17.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0223', obraId: 'OBR001', marca: '415', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 735, quantidade: 2, material: 'A36', peso: 8.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0224', obraId: 'OBR001', marca: '416', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 782, quantidade: 2, material: 'A36', peso: 9.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0225', obraId: 'OBR001', marca: '417', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 735, quantidade: 2, material: 'A36', peso: 8.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0226', obraId: 'OBR001', marca: '418', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 782, quantidade: 2, material: 'A36', peso: 9.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0227', obraId: 'OBR001', marca: '419', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 798, quantidade: 2, material: 'A36', peso: 9.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0228', obraId: 'OBR001', marca: '420', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1601, quantidade: 2, material: 'A36', peso: 19.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0229', obraId: 'OBR001', marca: '421', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1601, quantidade: 2, material: 'A36', peso: 19.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0230', obraId: 'OBR001', marca: '422', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1593, quantidade: 15, material: 'A36', peso: 143.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0231', obraId: 'OBR001', marca: '423', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1593, quantidade: 15, material: 'A36', peso: 143.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0232', obraId: 'OBR001', marca: '424', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1618, quantidade: 22, material: 'A36', peso: 214.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0233', obraId: 'OBR001', marca: '425', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1618, quantidade: 22, material: 'A36', peso: 214.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0234', obraId: 'OBR001', marca: '426', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1566, quantidade: 2, material: 'A36', peso: 18.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0235', obraId: 'OBR001', marca: '427', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1566, quantidade: 2, material: 'A36', peso: 18.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0236', obraId: 'OBR001', marca: '428', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1656, quantidade: 10, material: 'A36', peso: 99.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0237', obraId: 'OBR001', marca: '429', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1656, quantidade: 10, material: 'A36', peso: 99.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0238', obraId: 'OBR001', marca: '430', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1518, quantidade: 6, material: 'A36', peso: 54.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0239', obraId: 'OBR001', marca: '431', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1518, quantidade: 6, material: 'A36', peso: 54.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0240', obraId: 'OBR001', marca: '432', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1658, quantidade: 4, material: 'A36', peso: 39.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0241', obraId: 'OBR001', marca: '433', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1658, quantidade: 4, material: 'A36', peso: 39.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0242', obraId: 'OBR001', marca: '434', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1541, quantidade: 1, material: 'A36', peso: 9.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0243', obraId: 'OBR001', marca: '435', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 1541, quantidade: 1, material: 'A36', peso: 9.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0244', obraId: 'OBR001', marca: '436', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 769, quantidade: 2, material: 'A36', peso: 9.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0245', obraId: 'OBR001', marca: '437', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 769, quantidade: 2, material: 'A36', peso: 9.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0246', obraId: 'OBR001', marca: '438', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 695, quantidade: 1, material: 'A36', peso: 4.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0247', obraId: 'OBR001', marca: '439', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 695, quantidade: 1, material: 'A36', peso: 4.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0248', obraId: 'OBR001', marca: '440', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 704, quantidade: 1, material: 'A36', peso: 4.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0249', obraId: 'OBR001', marca: '441', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 704, quantidade: 1, material: 'A36', peso: 4.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0250', obraId: 'OBR001', marca: '442', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 721, quantidade: 2, material: 'A36', peso: 8.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0251', obraId: 'OBR001', marca: '443', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 721, quantidade: 2, material: 'A36', peso: 8.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0252', obraId: 'OBR001', marca: '444', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 786, quantidade: 2, material: 'A36', peso: 9.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0253', obraId: 'OBR001', marca: '445', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 734, quantidade: 2, material: 'A36', peso: 8.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0254', obraId: 'OBR001', marca: '446', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 786, quantidade: 2, material: 'A36', peso: 9.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0255', obraId: 'OBR001', marca: '447', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 734, quantidade: 2, material: 'A36', peso: 8.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0256', obraId: 'OBR001', marca: '448', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 775, quantidade: 1, material: 'A36', peso: 4.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0257', obraId: 'OBR001', marca: '449', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 775, quantidade: 1, material: 'A36', peso: 4.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0258', obraId: 'OBR001', marca: '450', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 827, quantidade: 1, material: 'A36', peso: 5.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0259', obraId: 'OBR001', marca: '451', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 827, quantidade: 1, material: 'A36', peso: 5.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0260', obraId: 'OBR001', marca: '452', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 802, quantidade: 2, material: 'A36', peso: 9.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0261', obraId: 'OBR001', marca: '453', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 802, quantidade: 2, material: 'A36', peso: 9.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0262', obraId: 'OBR001', marca: '454', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 803, quantidade: 2, material: 'A36', peso: 9.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0263', obraId: 'OBR001', marca: '455', tipo: 'DIAGONAL-VM', perfil: 'L64X64X6.4', comprimento: 803, quantidade: 2, material: 'A36', peso: 9.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0264', obraId: 'OBR001', marca: '456', tipo: 'SUPORTE', perfil: 'L64X64X6.4', comprimento: 160, quantidade: 2, material: 'A36', peso: 1.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0265', obraId: 'OBR001', marca: '457', tipo: 'SUPORTE', perfil: 'L64X64X6.4', comprimento: 160, quantidade: 2, material: 'A36', peso: 1.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0266', obraId: 'OBR001', marca: '458', tipo: 'SUPORTE', perfil: 'L64X64X6.4', comprimento: 160, quantidade: 1, material: 'A36', peso: 1.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0267', obraId: 'OBR001', marca: '459', tipo: 'SUPORTE', perfil: 'L64X64X6.4', comprimento: 200, quantidade: 2, material: 'A36', peso: 2.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0268', obraId: 'OBR001', marca: '460', tipo: 'MONTANTE-VM', perfil: 'L64X64X6.4', comprimento: 1170, quantidade: 132, material: 'A36', peso: 928.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0269', obraId: 'OBR001', marca: '461', tipo: 'VIGA', perfil: 'W530X66', comprimento: 8080, quantidade: 1, material: 'A572-GR.50', peso: 530.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0270', obraId: 'OBR001', marca: '462', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 7100, quantidade: 4, material: 'CIVIL 300', peso: 67.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0271', obraId: 'OBR001', marca: '463', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 1100, quantidade: 52, material: 'CIVIL 300', peso: 132.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0272', obraId: 'OBR001', marca: '464', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 10750, quantidade: 2, material: 'CIVIL 300', peso: 50.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0273', obraId: 'OBR001', marca: '465', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 9225, quantidade: 2, material: 'CIVIL 300', peso: 43.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0274', obraId: 'OBR001', marca: '466', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 8660, quantidade: 2, material: 'CIVIL 300', peso: 41.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0275', obraId: 'OBR001', marca: '467', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 11000, quantidade: 2, material: 'CIVIL 300', peso: 52.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0276', obraId: 'OBR001', marca: '468', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 11115, quantidade: 2, material: 'CIVIL 300', peso: 52.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0277', obraId: 'OBR001', marca: '469', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 6025, quantidade: 2, material: 'CIVIL 300', peso: 28.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0278', obraId: 'OBR001', marca: '470', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 4890, quantidade: 2, material: 'CIVIL 300', peso: 23.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0279', obraId: 'OBR001', marca: '471', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 5350, quantidade: 2, material: 'CIVIL 300', peso: 25.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0280', obraId: 'OBR001', marca: '472', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 4275, quantidade: 2, material: 'CIVIL 300', peso: 20.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0281', obraId: 'OBR001', marca: '473', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 7125, quantidade: 2, material: 'CIVIL 300', peso: 33.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0282', obraId: 'OBR001', marca: '474', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 6600, quantidade: 2, material: 'CIVIL 300', peso: 31.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0283', obraId: 'OBR001', marca: '475', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 5170, quantidade: 2, material: 'CIVIL 300', peso: 24.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0284', obraId: 'OBR001', marca: '476', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 3735, quantidade: 2, material: 'CIVIL 300', peso: 17.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0285', obraId: 'OBR001', marca: '477', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 6710, quantidade: 2, material: 'CIVIL 300', peso: 31.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0286', obraId: 'OBR001', marca: '478', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 8585, quantidade: 2, material: 'CIVIL 300', peso: 40.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0287', obraId: 'OBR001', marca: '479', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 8805, quantidade: 2, material: 'CIVIL 300', peso: 41.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0288', obraId: 'OBR001', marca: '480', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 8335, quantidade: 2, material: 'CIVIL 300', peso: 39.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0289', obraId: 'OBR001', marca: '481', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 4725, quantidade: 2, material: 'CIVIL 300', peso: 22.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0290', obraId: 'OBR001', marca: '482', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 8390, quantidade: 2, material: 'CIVIL 300', peso: 39.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0291', obraId: 'OBR001', marca: '483', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 10330, quantidade: 4, material: 'CIVIL 300', peso: 97.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0292', obraId: 'OBR001', marca: '484', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 8435, quantidade: 2, material: 'CIVIL 300', peso: 39.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0293', obraId: 'OBR001', marca: '485', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 9075, quantidade: 2, material: 'CIVIL 300', peso: 42.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0294', obraId: 'OBR001', marca: '486', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 9315, quantidade: 2, material: 'CIVIL 300', peso: 44.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0295', obraId: 'OBR001', marca: '487', tipo: 'TRELIÇA', perfil: 'US75X40X2', comprimento: 1096, quantidade: 17, material: 'CIVIL 300', peso: 44.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0296', obraId: 'OBR001', marca: '488', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 1485, quantidade: 1, material: 'A572-GR.50', peso: 38.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0297', obraId: 'OBR001', marca: '489', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 1287, quantidade: 4, material: 'A572-GR.50', peso: 131.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0298', obraId: 'OBR001', marca: '490', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 3933, quantidade: 2, material: 'A572-GR.50', peso: 201.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0299', obraId: 'OBR001', marca: '491', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 3893, quantidade: 2, material: 'A572-GR.50', peso: 199.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0300', obraId: 'OBR001', marca: '492', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 6468, quantidade: 1, material: 'A572-GR.50', peso: 165.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0301', obraId: 'OBR001', marca: '493', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 7501, quantidade: 1, material: 'A572-GR.50', peso: 192.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0302', obraId: 'OBR001', marca: '494', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 1999, quantidade: 1, material: 'A572-GR.50', peso: 51.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0303', obraId: 'OBR001', marca: '495', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 5967, quantidade: 1, material: 'A572-GR.50', peso: 152.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0304', obraId: 'OBR001', marca: '496', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 4316, quantidade: 1, material: 'A572-GR.50', peso: 110.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0305', obraId: 'OBR001', marca: '497', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 7931, quantidade: 1, material: 'A572-GR.50', peso: 203.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0306', obraId: 'OBR001', marca: '498', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 6695, quantidade: 2, material: 'A572-GR.50', peso: 342.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0307', obraId: 'OBR001', marca: '499', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 5604, quantidade: 1, material: 'A572-GR.50', peso: 143.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0308', obraId: 'OBR001', marca: '500', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 5488, quantidade: 3, material: 'A572-GR.50', peso: 421.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0309', obraId: 'OBR001', marca: '501', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 8653, quantidade: 1, material: 'A572-GR.50', peso: 221.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0310', obraId: 'OBR001', marca: '502', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 4878, quantidade: 1, material: 'A572-GR.50', peso: 124.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0311', obraId: 'OBR001', marca: '503', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 5388, quantidade: 1, material: 'A572-GR.50', peso: 137.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0312', obraId: 'OBR001', marca: '504', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 5338, quantidade: 2, material: 'A572-GR.50', peso: 273.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0313', obraId: 'OBR001', marca: '505', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 7091, quantidade: 2, material: 'A572-GR.50', peso: 362.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0314', obraId: 'OBR001', marca: '506', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 8894, quantidade: 1, material: 'A572-GR.50', peso: 227.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0315', obraId: 'OBR001', marca: '507', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 8796, quantidade: 5, material: 'A572-GR.50', peso: 1125.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0316', obraId: 'OBR001', marca: '508', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 8697, quantidade: 1, material: 'A572-GR.50', peso: 222.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0317', obraId: 'OBR001', marca: '509', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 8598, quantidade: 1, material: 'A572-GR.50', peso: 220.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0318', obraId: 'OBR001', marca: '510', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 4092, quantidade: 1, material: 'A572-GR.50', peso: 104.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0319', obraId: 'OBR001', marca: '511', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 6270, quantidade: 1, material: 'A572-GR.50', peso: 160.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0320', obraId: 'OBR001', marca: '512', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 7936, quantidade: 1, material: 'A572-GR.50', peso: 203.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0321', obraId: 'OBR001', marca: '513', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 9219, quantidade: 1, material: 'A572-GR.50', peso: 235.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0322', obraId: 'OBR001', marca: '514', tipo: 'TESOURA', perfil: 'W250X25.3', comprimento: 5549, quantidade: 1, material: 'A572-GR.50', peso: 142.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0323', obraId: 'OBR001', marca: '515', tipo: 'MISULA', perfil: 'W250X25.3', comprimento: 630, quantidade: 1, material: 'A572-GR.50', peso: 16.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0324', obraId: 'OBR001', marca: '516', tipo: 'MISULA', perfil: 'W250X25.3', comprimento: 630, quantidade: 29, material: 'A572-GR.50', peso: 467.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0325', obraId: 'OBR001', marca: '517', tipo: 'MISULA', perfil: 'W250X25.3', comprimento: 386, quantidade: 1, material: 'A572-GR.50', peso: 9.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0326', obraId: 'OBR001', marca: '518', tipo: 'MISULA', perfil: 'W250X25.3', comprimento: 641, quantidade: 31, material: 'A572-GR.50', peso: 508.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0327', obraId: 'OBR001', marca: '519', tipo: 'MISULA', perfil: 'W250X25.3', comprimento: 753, quantidade: 2, material: 'A572-GR.50', peso: 38.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0328', obraId: 'OBR001', marca: '520', tipo: 'MISULA', perfil: 'W250X25.3', comprimento: 518, quantidade: 2, material: 'A572-GR.50', peso: 26.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0329', obraId: 'OBR001', marca: '521', tipo: 'MISULA', perfil: 'W250X25.3', comprimento: 507, quantidade: 2, material: 'A572-GR.50', peso: 26.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0330', obraId: 'OBR001', marca: '522', tipo: 'MISULA', perfil: 'W250X25.3', comprimento: 397, quantidade: 1, material: 'A572-GR.50', peso: 10.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0331', obraId: 'OBR001', marca: '525', tipo: 'COLUNETA', perfil: 'UE200X75X25X2.65', comprimento: 4300, quantidade: 6, material: 'CIVIL 300', peso: 209.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0332', obraId: 'OBR001', marca: '526', tipo: 'SUPORTE', perfil: 'W150X22.5', comprimento: 87, quantidade: 7, material: 'A572-GR.50', peso: 13.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0333', obraId: 'OBR001', marca: '527', tipo: 'SUPORTE', perfil: 'W150X22.5', comprimento: 285, quantidade: 1, material: 'A572-GR.50', peso: 6.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0334', obraId: 'OBR001', marca: '528', tipo: 'SUPORTE', perfil: 'W150X22.5', comprimento: 1959, quantidade: 1, material: 'A572-GR.50', peso: 44.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0335', obraId: 'OBR001', marca: '529', tipo: 'SUPORTE', perfil: 'W150X22.5', comprimento: 285, quantidade: 1, material: 'A572-GR.50', peso: 6.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0336', obraId: 'OBR001', marca: '530', tipo: 'SUPORTE', perfil: 'W150X22.5', comprimento: 170, quantidade: 4, material: 'A572-GR.50', peso: 15.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0337', obraId: 'OBR001', marca: '531', tipo: 'SUPORTE', perfil: 'W150X22.5', comprimento: 1960, quantidade: 9, material: 'A572-GR.50', peso: 401.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0338', obraId: 'OBR001', marca: '532', tipo: 'SUPORTE', perfil: 'W150X22.5', comprimento: 87, quantidade: 3, material: 'A572-GR.50', peso: 6.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0339', obraId: 'OBR001', marca: '533', tipo: 'SUPORTE', perfil: 'W150X22.5', comprimento: 285, quantidade: 1, material: 'A572-GR.50', peso: 6.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0340', obraId: 'OBR001', marca: '534', tipo: 'SUPORTE', perfil: 'W150X22.5', comprimento: 1493, quantidade: 1, material: 'A572-GR.50', peso: 34.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0341', obraId: 'OBR001', marca: '535', tipo: 'SUPORTE', perfil: 'W150X22.5', comprimento: 185, quantidade: 1, material: 'A572-GR.50', peso: 4.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0342', obraId: 'OBR001', marca: '536', tipo: 'SUPORTE', perfil: 'W150X22.5', comprimento: 1286, quantidade: 1, material: 'A572-GR.50', peso: 29.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0343', obraId: 'OBR001', marca: '537', tipo: 'SUPORTE', perfil: 'W150X22.5', comprimento: 1516, quantidade: 1, material: 'A572-GR.50', peso: 34.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0344', obraId: 'OBR001', marca: '538', tipo: 'CHAPA', perfil: 'CH6.3X67.3', comprimento: 186, quantidade: 1, material: 'A36', peso: 0.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0345', obraId: 'OBR001', marca: '539', tipo: 'CHAPA', perfil: 'CH6.3X158.5', comprimento: 160, quantidade: 2, material: 'A36', peso: 2.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0346', obraId: 'OBR001', marca: '540', tipo: 'CHAPA', perfil: 'CH6.3X71', comprimento: 196, quantidade: 1, material: 'A36', peso: 0.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0347', obraId: 'OBR001', marca: '541', tipo: 'CHAPA', perfil: 'CH6.3X81', comprimento: 246, quantidade: 5, material: 'A36', peso: 4.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0348', obraId: 'OBR001', marca: '542', tipo: 'CHAPA', perfil: 'CH6.3X84.8', comprimento: 381, quantidade: 29, material: 'A36', peso: 46.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0349', obraId: 'OBR001', marca: '543', tipo: 'CHAPA', perfil: 'CH6.3X84.8', comprimento: 233, quantidade: 10, material: 'A36', peso: 9.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0350', obraId: 'OBR001', marca: '544', tipo: 'CHAPA', perfil: 'CH6.3X179.4', comprimento: 234, quantidade: 4, material: 'A36', peso: 8.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0351', obraId: 'OBR001', marca: '545', tipo: 'CHAPA', perfil: 'CH6.3X120', comprimento: 392, quantidade: 1, material: 'A36', peso: 2.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0352', obraId: 'OBR001', marca: '546', tipo: 'CHAPA', perfil: 'CH6.3X100', comprimento: 326, quantidade: 1, material: 'A36', peso: 1.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0353', obraId: 'OBR001', marca: '547', tipo: 'CHAPA', perfil: 'CH6.3X84.8', comprimento: 384, quantidade: 1, material: 'A36', peso: 1.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0354', obraId: 'OBR001', marca: '548', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 240, quantidade: 79, material: 'A36', peso: 121.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0355', obraId: 'OBR001', marca: '549', tipo: 'CHAPA', perfil: 'CH6X152', comprimento: 152, quantidade: 7, material: 'A36', peso: 8.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0356', obraId: 'OBR001', marca: '550', tipo: 'CHAPA', perfil: 'CH6X152', comprimento: 199, quantidade: 12, material: 'A36', peso: 18.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0357', obraId: 'OBR001', marca: '551', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 190, quantidade: 31, material: 'A36', peso: 37.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0358', obraId: 'OBR001', marca: '552', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 240, quantidade: 112, material: 'A36', peso: 172.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0359', obraId: 'OBR001', marca: '553', tipo: 'CHAPA', perfil: 'CH6.3X150', comprimento: 440, quantidade: 3, material: 'A36', peso: 9.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0360', obraId: 'OBR001', marca: '554', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 190, quantidade: 43, material: 'A36', peso: 52.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0361', obraId: 'OBR001', marca: '555', tipo: 'CHAPA', perfil: 'CH6X152', comprimento: 199, quantidade: 2, material: 'A36', peso: 3.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0362', obraId: 'OBR001', marca: '556', tipo: 'CHAPA', perfil: 'CH6.3X120', comprimento: 190, quantidade: 10, material: 'A36', peso: 11.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0363', obraId: 'OBR001', marca: '557', tipo: 'CHAPA', perfil: 'CH6X152', comprimento: 199, quantidade: 1, material: 'A36', peso: 1.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0364', obraId: 'OBR001', marca: '558', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 186, quantidade: 3, material: 'A36', peso: 3.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0365', obraId: 'OBR001', marca: '559', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 190, quantidade: 24, material: 'A36', peso: 29.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0366', obraId: 'OBR001', marca: '560', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 148, quantidade: 22, material: 'A36', peso: 20.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0367', obraId: 'OBR001', marca: '561', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 392, quantidade: 17, material: 'A36', peso: 42.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0368', obraId: 'OBR001', marca: '562', tipo: 'CHAPA', perfil: 'CH6X152', comprimento: 243, quantidade: 7, material: 'A36', peso: 12.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0369', obraId: 'OBR001', marca: '563', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 326, quantidade: 2, material: 'A36', peso: 4.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0370', obraId: 'OBR001', marca: '564', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 326, quantidade: 3, material: 'A36', peso: 6.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0371', obraId: 'OBR001', marca: '565', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 326, quantidade: 6, material: 'A36', peso: 12.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0372', obraId: 'OBR001', marca: '566', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 245, quantidade: 1, material: 'A36', peso: 1.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0373', obraId: 'OBR001', marca: '567', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 148, quantidade: 1, material: 'A36', peso: 1.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0374', obraId: 'OBR001', marca: '568', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 194, quantidade: 27, material: 'A36', peso: 33.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0375', obraId: 'OBR001', marca: '569', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 194, quantidade: 11, material: 'A36', peso: 13.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0376', obraId: 'OBR001', marca: '570', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 392, quantidade: 1, material: 'A36', peso: 2.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0377', obraId: 'OBR001', marca: '571', tipo: 'CHAPA', perfil: 'CH6X152', comprimento: 441, quantidade: 4, material: 'A36', peso: 13.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0378', obraId: 'OBR001', marca: '572', tipo: 'CHAPA', perfil: 'CH6X152', comprimento: 244, quantidade: 7, material: 'A36', peso: 12.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0379', obraId: 'OBR001', marca: '573', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 345, quantidade: 1, material: 'A36', peso: 2.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0380', obraId: 'OBR001', marca: '574', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 427, quantidade: 1, material: 'A36', peso: 2.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0381', obraId: 'OBR001', marca: '575', tipo: 'CHAPA', perfil: 'CH6X292', comprimento: 130, quantidade: 1, material: 'A36', peso: 1.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0382', obraId: 'OBR001', marca: '576', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 194, quantidade: 6, material: 'A36', peso: 7.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0383', obraId: 'OBR001', marca: '577', tipo: 'CHAPA', perfil: 'CH6.3X80', comprimento: 240, quantidade: 190, material: 'A36', peso: 180.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0384', obraId: 'OBR001', marca: '578', tipo: 'CHAPA', perfil: 'CH6.3X74.5', comprimento: 125, quantidade: 26, material: 'A36', peso: 12.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0385', obraId: 'OBR001', marca: '579', tipo: 'CHAPA', perfil: 'CH6.3X125', comprimento: 600, quantidade: 62, material: 'A36', peso: 230.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0386', obraId: 'OBR001', marca: '580', tipo: 'CHAPA', perfil: 'CH6.3X80', comprimento: 190, quantidade: 63, material: 'A36', peso: 47.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0387', obraId: 'OBR001', marca: '581', tipo: 'CHAPA', perfil: 'CH6.3X104', comprimento: 170, quantidade: 18, material: 'A36', peso: 15.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0388', obraId: 'OBR001', marca: '582', tipo: 'CHAPA', perfil: 'CH6.3X104', comprimento: 170, quantidade: 18, material: 'A36', peso: 15.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0389', obraId: 'OBR001', marca: '583', tipo: 'CHAPA', perfil: 'CH6.3X104', comprimento: 160, quantidade: 8, material: 'A36', peso: 6.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0390', obraId: 'OBR001', marca: '584', tipo: 'CHAPA', perfil: 'CH6.3X104', comprimento: 160, quantidade: 8, material: 'A36', peso: 6.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0391', obraId: 'OBR001', marca: '585', tipo: 'CHAPA', perfil: 'CH6.3X65.5', comprimento: 105, quantidade: 576, material: 'A36', peso: 196.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0392', obraId: 'OBR001', marca: '586', tipo: 'CHAPA', perfil: 'CH6.3X80', comprimento: 190, quantidade: 45, material: 'A36', peso: 33.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0393', obraId: 'OBR001', marca: '587', tipo: 'CHAPA', perfil: 'CH6.3X80', comprimento: 186, quantidade: 2, material: 'A36', peso: 1.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0394', obraId: 'OBR001', marca: '588', tipo: 'CHAPA', perfil: 'CH6.3X55', comprimento: 240, quantidade: 1, material: 'A36', peso: 0.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0395', obraId: 'OBR001', marca: '589', tipo: 'CHAPA', perfil: 'CH6.3X80', comprimento: 221, quantidade: 1, material: 'A36', peso: 0.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0396', obraId: 'OBR001', marca: '590', tipo: 'CHAPA', perfil: 'CH6.3X100', comprimento: 392, quantidade: 17, material: 'A36', peso: 32.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0397', obraId: 'OBR001', marca: '591', tipo: 'CHAPA', perfil: 'CH6.3X80', comprimento: 243, quantidade: 14, material: 'A36', peso: 13.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0398', obraId: 'OBR001', marca: '592', tipo: 'CHAPA', perfil: 'CH6.3X80', comprimento: 326, quantidade: 10, material: 'A36', peso: 12.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0399', obraId: 'OBR001', marca: '593', tipo: 'CHAPA', perfil: 'CH6.3X80', comprimento: 245, quantidade: 1, material: 'A36', peso: 1.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0400', obraId: 'OBR001', marca: '594', tipo: 'CHAPA', perfil: 'CH6.3X80', comprimento: 194, quantidade: 44, material: 'A36', peso: 33.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0401', obraId: 'OBR001', marca: '595', tipo: 'CHAPA', perfil: 'CH6.3X100', comprimento: 441, quantidade: 4, material: 'A36', peso: 8.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0402', obraId: 'OBR001', marca: '596', tipo: 'CHAPA', perfil: 'CH6X70', comprimento: 345, quantidade: 1, material: 'A36', peso: 1.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0403', obraId: 'OBR001', marca: '597', tipo: 'CHAPA', perfil: 'CH6.3X99.9', comprimento: 427, quantidade: 1, material: 'A36', peso: 2.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0404', obraId: 'OBR001', marca: '598', tipo: 'CHAPA', perfil: 'CH6X70', comprimento: 80, quantidade: 2, material: 'A36', peso: 0.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0405', obraId: 'OBR001', marca: '599', tipo: 'CHAPA', perfil: 'CH6X292', comprimento: 80, quantidade: 1, material: 'A36', peso: 1.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0406', obraId: 'OBR001', marca: '600', tipo: 'CHAPA', perfil: 'CH6.3X75', comprimento: 200, quantidade: 11, material: 'A36', peso: 8.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0407', obraId: 'OBR001', marca: '601', tipo: 'CHAPA', perfil: 'CH6.3X85', comprimento: 250, quantidade: 4, material: 'A36', peso: 4.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0408', obraId: 'OBR001', marca: '602', tipo: 'CHAPA', perfil: 'CH6.3X180', comprimento: 315, quantidade: 4, material: 'A36', peso: 11.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0409', obraId: 'OBR001', marca: '603', tipo: 'CHAPA', perfil: 'CH6.3X180', comprimento: 265, quantidade: 1, material: 'A36', peso: 2.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0410', obraId: 'OBR001', marca: '604', tipo: 'CHAPA', perfil: 'CH6.3X230', comprimento: 315, quantidade: 1, material: 'A36', peso: 3.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0411', obraId: 'OBR001', marca: '605', tipo: 'CHAPA', perfil: 'CH6.3X73.1', comprimento: 139, quantidade: 56, material: 'A36', peso: 28.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0412', obraId: 'OBR001', marca: '606', tipo: 'CHAPA', perfil: 'CH6X64', comprimento: 190, quantidade: 2, material: 'A36', peso: 1.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0413', obraId: 'OBR001', marca: '607', tipo: 'CHAPA', perfil: 'CH6.3X47.8', comprimento: 138, quantidade: 86, material: 'A36', peso: 28.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0414', obraId: 'OBR001', marca: '608', tipo: 'CHAPA', perfil: 'CH6.3X84.8', comprimento: 87, quantidade: 48, material: 'A36', peso: 17.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0415', obraId: 'OBR001', marca: '609', tipo: 'CHAPA', perfil: 'CH6.3X84.8', comprimento: 85, quantidade: 171, material: 'A36', peso: 61.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0416', obraId: 'OBR001', marca: '610', tipo: 'CHAPA', perfil: 'CH6.3X81.2', comprimento: 82, quantidade: 84, material: 'A36', peso: 27.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0417', obraId: 'OBR001', marca: '611', tipo: 'CHAPA', perfil: 'CH6.3X130', comprimento: 232, quantidade: 1, material: 'A36', peso: 1.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0418', obraId: 'OBR001', marca: '612', tipo: 'VIGA-MESTRA', perfil: 'W200X26.6', comprimento: 1389, quantidade: 1, material: 'A572-GR.50', peso: 37.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0419', obraId: 'OBR001', marca: '617', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 1969, quantidade: 210, material: 'CIVIL 300', peso: 1148.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0420', obraId: 'OBR001', marca: '618', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 2013, quantidade: 90, material: 'CIVIL 300', peso: 503.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0421', obraId: 'OBR001', marca: '619', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 566, quantidade: 10, material: 'CIVIL 300', peso: 15.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0422', obraId: 'OBR001', marca: '620', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 564, quantidade: 6, material: 'CIVIL 300', peso: 9.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0423', obraId: 'OBR001', marca: '621', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 964, quantidade: 17, material: 'CIVIL 300', peso: 45.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0424', obraId: 'OBR001', marca: '622', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 1614, quantidade: 2, material: 'CIVIL 300', peso: 9.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0425', obraId: 'OBR001', marca: '623', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 1964, quantidade: 57, material: 'CIVIL 300', peso: 311.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0426', obraId: 'OBR001', marca: '624', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 1639, quantidade: 29, material: 'CIVIL 300', peso: 132.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0427', obraId: 'OBR001', marca: '625', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 1689, quantidade: 46, material: 'CIVIL 300', peso: 215.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0428', obraId: 'OBR001', marca: '626', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 1589, quantidade: 4, material: 'CIVIL 300', peso: 17.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0429', obraId: 'OBR001', marca: '627', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 1939, quantidade: 39, material: 'CIVIL 300', peso: 210.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0430', obraId: 'OBR001', marca: '628', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 989, quantidade: 2, material: 'CIVIL 300', peso: 5.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0431', obraId: 'OBR001', marca: '629', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 1989, quantidade: 32, material: 'CIVIL 300', peso: 176.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0432', obraId: 'OBR001', marca: '630', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 1999, quantidade: 25, material: 'CIVIL 300', peso: 138.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0433', obraId: 'OBR001', marca: '632', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 1389, quantidade: 12, material: 'CIVIL 300', peso: 46.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0434', obraId: 'OBR001', marca: '633', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 1563, quantidade: 6, material: 'CIVIL 300', peso: 26.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0435', obraId: 'OBR001', marca: '634', tipo: 'TIRANTE', perfil: 'UE75X40X15X2', comprimento: 1099, quantidade: 2, material: 'CIVIL 300', peso: 6.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0436', obraId: 'OBR001', marca: '635', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 5345, quantidade: 2, material: 'CIVIL 300', peso: 143.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0437', obraId: 'OBR001', marca: '636', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 5400, quantidade: 2, material: 'CIVIL 300', peso: 144.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0438', obraId: 'OBR001', marca: '637', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 5285, quantidade: 6, material: 'CIVIL 300', peso: 424.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0439', obraId: 'OBR001', marca: '638', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 8445, quantidade: 2, material: 'CIVIL 300', peso: 226.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0440', obraId: 'OBR001', marca: '639', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 4675, quantidade: 2, material: 'CIVIL 300', peso: 125.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0441', obraId: 'OBR001', marca: '640', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 9010, quantidade: 2, material: 'CIVIL 300', peso: 241.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0442', obraId: 'OBR001', marca: '641', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 5135, quantidade: 4, material: 'CIVIL 300', peso: 275.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0443', obraId: 'OBR001', marca: '642', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 5185, quantidade: 2, material: 'CIVIL 300', peso: 138.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0444', obraId: 'OBR001', marca: '643', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 6885, quantidade: 4, material: 'CIVIL 300', peso: 368.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0445', obraId: 'OBR001', marca: '644', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 3885, quantidade: 2, material: 'CIVIL 300', peso: 104.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0446', obraId: 'OBR001', marca: '645', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 2786, quantidade: 2, material: 'CIVIL 300', peso: 74.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0447', obraId: 'OBR001', marca: '646', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 6188, quantidade: 2, material: 'CIVIL 300', peso: 165.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0448', obraId: 'OBR001', marca: '647', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 9176, quantidade: 2, material: 'CIVIL 300', peso: 245.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0449', obraId: 'OBR001', marca: '648', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 1596, quantidade: 2, material: 'CIVIL 300', peso: 42.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0450', obraId: 'OBR001', marca: '649', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 10100, quantidade: 4, material: 'CIVIL 300', peso: 541.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0451', obraId: 'OBR001', marca: '650', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 11175, quantidade: 2, material: 'CIVIL 300', peso: 299.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0452', obraId: 'OBR001', marca: '651', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 9185, quantidade: 2, material: 'CIVIL 300', peso: 246.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0453', obraId: 'OBR001', marca: '652', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 6678, quantidade: 4, material: 'CIVIL 300', peso: 357.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0454', obraId: 'OBR001', marca: '653', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 11278, quantidade: 2, material: 'CIVIL 300', peso: 302.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0455', obraId: 'OBR001', marca: '654', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 225, quantidade: 1, material: 'CIVIL 300', peso: 2.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0456', obraId: 'OBR001', marca: '655', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 225, quantidade: 1, material: 'CIVIL 300', peso: 2.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0457', obraId: 'OBR001', marca: '656', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 301, quantidade: 1, material: 'CIVIL 300', peso: 2.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0458', obraId: 'OBR001', marca: '657', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 301, quantidade: 1, material: 'CIVIL 300', peso: 2.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0459', obraId: 'OBR001', marca: '658', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 3939, quantidade: 1, material: 'CIVIL 300', peso: 51.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0460', obraId: 'OBR001', marca: '659', tipo: 'VIGA', perfil: 'UE250X85X25X3.75', comprimento: 3939, quantidade: 1, material: 'CIVIL 300', peso: 51.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0461', obraId: 'OBR001', marca: '660', tipo: 'SUPORTE', perfil: 'W200X15', comprimento: 40, quantidade: 15, material: 'A572-GR.50', peso: 9.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0462', obraId: 'OBR001', marca: '661', tipo: 'SUPORTE', perfil: 'W200X15', comprimento: 237, quantidade: 3, material: 'A572-GR.50', peso: 10.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0463', obraId: 'OBR001', marca: '662', tipo: 'MONTANTE-TL', perfil: 'US68X30X2', comprimento: 1096, quantidade: 152, material: 'CIVIL 300', peso: 324.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0464', obraId: 'OBR001', marca: '663', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1132, quantidade: 1, material: 'CIVIL 300', peso: 2.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0465', obraId: 'OBR001', marca: '664', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1443, quantidade: 8, material: 'CIVIL 300', peso: 22.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0466', obraId: 'OBR001', marca: '665', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1531, quantidade: 4, material: 'CIVIL 300', peso: 11.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0467', obraId: 'OBR001', marca: '666', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1438, quantidade: 16, material: 'CIVIL 300', peso: 44.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0468', obraId: 'OBR001', marca: '667', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1433, quantidade: 20, material: 'CIVIL 300', peso: 55.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0469', obraId: 'OBR001', marca: '668', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1447, quantidade: 8, material: 'CIVIL 300', peso: 22.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0470', obraId: 'OBR001', marca: '669', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1460, quantidade: 8, material: 'CIVIL 300', peso: 22.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0471', obraId: 'OBR001', marca: '670', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1484, quantidade: 13, material: 'CIVIL 300', peso: 37.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0472', obraId: 'OBR001', marca: '671', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1521, quantidade: 8, material: 'CIVIL 300', peso: 23.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0473', obraId: 'OBR001', marca: '672', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1373, quantidade: 4, material: 'CIVIL 300', peso: 10.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0474', obraId: 'OBR001', marca: '673', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1535, quantidade: 18, material: 'CIVIL 300', peso: 53.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0475', obraId: 'OBR001', marca: '674', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1579, quantidade: 4, material: 'CIVIL 300', peso: 12.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0476', obraId: 'OBR001', marca: '675', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1478, quantidade: 6, material: 'CIVIL 300', peso: 17.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0477', obraId: 'OBR001', marca: '676', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1490, quantidade: 6, material: 'CIVIL 300', peso: 17.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0478', obraId: 'OBR001', marca: '677', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1154, quantidade: 1, material: 'CIVIL 300', peso: 2.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0479', obraId: 'OBR001', marca: '678', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1492, quantidade: 5, material: 'CIVIL 300', peso: 14.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0480', obraId: 'OBR001', marca: '679', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1476, quantidade: 15, material: 'CIVIL 300', peso: 43.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0481', obraId: 'OBR001', marca: '680', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1466, quantidade: 8, material: 'CIVIL 300', peso: 22.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0482', obraId: 'OBR001', marca: '681', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1560, quantidade: 4, material: 'CIVIL 300', peso: 12.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0483', obraId: 'OBR001', marca: '682', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1513, quantidade: 8, material: 'CIVIL 300', peso: 23.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0484', obraId: 'OBR001', marca: '683', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1642, quantidade: 4, material: 'CIVIL 300', peso: 12.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0485', obraId: 'OBR001', marca: '684', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1457, quantidade: 5, material: 'CIVIL 300', peso: 14.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0486', obraId: 'OBR001', marca: '685', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1464, quantidade: 5, material: 'CIVIL 300', peso: 14.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0487', obraId: 'OBR001', marca: '686', tipo: 'DIAGONAL-TL', perfil: 'US68X30X2', comprimento: 1429, quantidade: 4, material: 'CIVIL 300', peso: 11.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0488', obraId: 'OBR001', marca: '762', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 9875, quantidade: 2, material: 'A36', peso: 29.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0489', obraId: 'OBR001', marca: '763', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10049, quantidade: 18, material: 'A36', peso: 268.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0490', obraId: 'OBR001', marca: '764', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10473, quantidade: 2, material: 'A36', peso: 31.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0491', obraId: 'OBR001', marca: '765', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10429, quantidade: 2, material: 'A36', peso: 31.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0492', obraId: 'OBR001', marca: '766', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10594, quantidade: 18, material: 'A36', peso: 283.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0493', obraId: 'OBR001', marca: '767', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10997, quantidade: 2, material: 'A36', peso: 32.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0494', obraId: 'OBR001', marca: '768', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 9668, quantidade: 2, material: 'A36', peso: 28.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0495', obraId: 'OBR001', marca: '769', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10233, quantidade: 2, material: 'A36', peso: 30.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0496', obraId: 'OBR001', marca: '770', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10625, quantidade: 6, material: 'A36', peso: 94.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0497', obraId: 'OBR001', marca: '771', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 11494, quantidade: 2, material: 'A36', peso: 34.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0498', obraId: 'OBR001', marca: '772', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10629, quantidade: 2, material: 'A36', peso: 31.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0499', obraId: 'OBR001', marca: '773', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10086, quantidade: 2, material: 'A36', peso: 30.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0500', obraId: 'OBR001', marca: '774', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10082, quantidade: 6, material: 'A36', peso: 89.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0501', obraId: 'OBR001', marca: '775', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10839, quantidade: 1, material: 'A36', peso: 16.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0502', obraId: 'OBR001', marca: '776', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10993, quantidade: 1, material: 'A36', peso: 16.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0503', obraId: 'OBR001', marca: '777', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10515, quantidade: 2, material: 'A36', peso: 31.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0504', obraId: 'OBR001', marca: '778', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 9965, quantidade: 2, material: 'A36', peso: 29.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0505', obraId: 'OBR001', marca: '779', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 11356, quantidade: 2, material: 'A36', peso: 33.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0506', obraId: 'OBR001', marca: '780', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10850, quantidade: 2, material: 'A36', peso: 32.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0507', obraId: 'OBR001', marca: '781', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 6018, quantidade: 4, material: 'A36', peso: 35.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0508', obraId: 'OBR001', marca: '782', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 6066, quantidade: 4, material: 'A36', peso: 36.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0509', obraId: 'OBR001', marca: '783', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 5966, quantidade: 12, material: 'A36', peso: 106.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0510', obraId: 'OBR001', marca: '784', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 8846, quantidade: 6, material: 'A36', peso: 78.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0511', obraId: 'OBR001', marca: '785', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 5446, quantidade: 4, material: 'A36', peso: 32.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0512', obraId: 'OBR001', marca: '786', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 9380, quantidade: 4, material: 'A36', peso: 55.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0513', obraId: 'OBR001', marca: '787', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 5837, quantidade: 8, material: 'A36', peso: 69.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0514', obraId: 'OBR001', marca: '788', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 5880, quantidade: 4, material: 'A36', peso: 34.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0515', obraId: 'OBR001', marca: '789', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 7396, quantidade: 8, material: 'A36', peso: 87.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0516', obraId: 'OBR001', marca: '790', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 4803, quantidade: 4, material: 'A36', peso: 28.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0517', obraId: 'OBR001', marca: '791', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 8832, quantidade: 2, material: 'A36', peso: 26.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0518', obraId: 'OBR001', marca: '792', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 8892, quantidade: 2, material: 'A36', peso: 26.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0519', obraId: 'OBR001', marca: '793', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 8877, quantidade: 2, material: 'A36', peso: 26.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0520', obraId: 'OBR001', marca: '794', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10689, quantidade: 2, material: 'A36', peso: 31.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0521', obraId: 'OBR001', marca: '795', tipo: 'CONTRAVENTAMENTO', perfil: 'FERRO Ø5/8', comprimento: 10677, quantidade: 2, material: 'A36', peso: 31.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0522', obraId: 'OBR001', marca: '796', tipo: 'CHAPA', perfil: 'CH4.8X90', comprimento: 150, quantidade: 880, material: 'A36', peso: 447.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0523', obraId: 'OBR001', marca: '797', tipo: 'CHAPA', perfil: 'CH4.8X60', comprimento: 210, quantidade: 298, material: 'A36', peso: 141.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0524', obraId: 'OBR001', marca: '798', tipo: 'SUPORTE', perfil: 'L76X76X7.9', comprimento: 479, quantidade: 1, material: 'A36', peso: 4.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0525', obraId: 'OBR001', marca: '799', tipo: 'SUPORTE', perfil: 'L76X76X7.9', comprimento: 479, quantidade: 2, material: 'A36', peso: 8.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0526', obraId: 'OBR001', marca: '800', tipo: 'SUPORTE', perfil: 'L76X76X7.9', comprimento: 479, quantidade: 2, material: 'A36', peso: 8.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0527', obraId: 'OBR001', marca: '801', tipo: 'SUPORTE', perfil: 'L76X76X7.9', comprimento: 479, quantidade: 1, material: 'A36', peso: 4.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0528', obraId: 'OBR001', marca: '802', tipo: 'SUPORTE', perfil: 'L76X76X7.9', comprimento: 531, quantidade: 3, material: 'A36', peso: 14.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0529', obraId: 'OBR001', marca: '803', tipo: 'SUPORTE', perfil: 'L76X76X7.9', comprimento: 413, quantidade: 4, material: 'A36', peso: 14.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0530', obraId: 'OBR001', marca: '804', tipo: 'VIGA-MESTRA', perfil: 'L38X38X3.2', comprimento: 170, quantidade: 403, material: 'A36', peso: 124.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0531', obraId: 'OBR001', marca: '805', tipo: 'CHAPA', perfil: 'CH6.3X80', comprimento: 84, quantidade: 2, material: 'A36', peso: 0.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0532', obraId: 'OBR001', marca: '806', tipo: 'CHAPA', perfil: 'CH6.3X75', comprimento: 170, quantidade: 1, material: 'A36', peso: 0.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0533', obraId: 'OBR001', marca: 'BC172A', tipo: 'BOCAL', perfil: 'TUBO Ø195X2', comprimento: 200, quantidade: 22, material: 'SAC 41', peso: 41.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0534', obraId: 'OBR001', marca: 'BC172B', tipo: 'BOCAL', perfil: 'TUBO Ø145X2', comprimento: 150, quantidade: 35, material: 'SAC 41', peso: 36.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0535', obraId: 'OBR001', marca: 'CA171C', tipo: 'CALHA', perfil: 'CH2X1096.5', comprimento: 6000, quantidade: 8, material: 'SAC 41', peso: 826.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0536', obraId: 'OBR001', marca: 'CA171E', tipo: 'CALHA', perfil: 'CH2X993.1', comprimento: 6000, quantidade: 19, material: 'SAC 41', peso: 1777.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0537', obraId: 'OBR001', marca: 'CA171F', tipo: 'CALHA', perfil: 'CH2X993.1', comprimento: 1600, quantidade: 1, material: 'SAC 41', peso: 24.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0538', obraId: 'OBR001', marca: 'CA171I', tipo: 'CALHA', perfil: 'CH2X1162.2', comprimento: 6000, quantidade: 5, material: 'SAC 41', peso: 547.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0539', obraId: 'OBR001', marca: 'CA171J', tipo: 'CALHA', perfil: 'CH2X938.1', comprimento: 6000, quantidade: 1, material: 'SAC 41', peso: 88.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0540', obraId: 'OBR001', marca: 'CA171L', tipo: 'CALHA', perfil: 'CH2X700', comprimento: 938, quantidade: 1, material: 'SAC 41', peso: 10.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0541', obraId: 'OBR001', marca: 'CA172B', tipo: 'CALHA', perfil: 'CH2X993.1', comprimento: 1800, quantidade: 1, material: 'SAC 41', peso: 28.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0542', obraId: 'OBR001', marca: 'CA172C', tipo: 'CALHA', perfil: 'CH2X1096.5', comprimento: 2000, quantidade: 1, material: 'SAC 41', peso: 34.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0543', obraId: 'OBR001', marca: 'CA172D', tipo: 'CALHA', perfil: 'CH2X300', comprimento: 938, quantidade: 1, material: 'SAC 41', peso: 4.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0544', obraId: 'OBR001', marca: 'MF170A', tipo: 'MÃO-FRANCESA', perfil: 'UE75X40X15X2', comprimento: 850, quantidade: 72, material: 'CIVIL 300', peso: 170.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0545', obraId: 'OBR001', marca: 'MF170B', tipo: 'MÃO-FRANCESA', perfil: 'UE75X40X15X2', comprimento: 943, quantidade: 139, material: 'CIVIL 300', peso: 364.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0546', obraId: 'OBR001', marca: 'MF170C', tipo: 'MÃO-FRANCESA', perfil: 'UE75X40X15X2', comprimento: 929, quantidade: 80, material: 'CIVIL 300', peso: 206.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0547', obraId: 'OBR001', marca: 'MF170D', tipo: 'MÃO-FRANCESA', perfil: 'UE75X40X15X2', comprimento: 836, quantidade: 12, material: 'CIVIL 300', peso: 27.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0548', obraId: 'OBR001', marca: 'TC160A', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10110, quantidade: 1, material: 'CIVIL 300', peso: 60.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0549', obraId: 'OBR001', marca: 'TC160B', tipo: 'TERÇA', perfil: 'UE200X75X25X2.65', comprimento: 11385, quantidade: 1, material: 'CIVIL 300', peso: 92.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0550', obraId: 'OBR001', marca: 'TC160C', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10310, quantidade: 1, material: 'CIVIL 300', peso: 61.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0551', obraId: 'OBR001', marca: 'TC160D', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10990, quantidade: 1, material: 'CIVIL 300', peso: 65.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0552', obraId: 'OBR001', marca: 'TC160E', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10110, quantidade: 1, material: 'CIVIL 300', peso: 60.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0553', obraId: 'OBR001', marca: 'TC160F', tipo: 'TERÇA', perfil: 'UE200X75X25X2.65', comprimento: 11385, quantidade: 1, material: 'CIVIL 300', peso: 92.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0554', obraId: 'OBR001', marca: 'TC160G', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10310, quantidade: 1, material: 'CIVIL 300', peso: 61.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0555', obraId: 'OBR001', marca: 'TC161A', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10990, quantidade: 1, material: 'CIVIL 300', peso: 65.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0556', obraId: 'OBR001', marca: 'TC161B', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 9895, quantidade: 28, material: 'CIVIL 300', peso: 1661.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0557', obraId: 'OBR001', marca: 'TC161C', tipo: 'TERÇA', perfil: 'UE250X85X25X2', comprimento: 11380, quantidade: 28, material: 'CIVIL 300', peso: 2311.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0558', obraId: 'OBR001', marca: 'TC161D', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10305, quantidade: 19, material: 'CIVIL 300', peso: 1174.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0559', obraId: 'OBR001', marca: 'TC161E', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 9600, quantidade: 17, material: 'CIVIL 300', peso: 978.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0560', obraId: 'OBR001', marca: 'TC161F', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5935, quantidade: 1, material: 'CIVIL 300', peso: 28.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0561', obraId: 'OBR001', marca: 'TC161G', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5935, quantidade: 1, material: 'CIVIL 300', peso: 28.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0562', obraId: 'OBR001', marca: 'TC161H', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5935, quantidade: 1, material: 'CIVIL 300', peso: 28.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0563', obraId: 'OBR001', marca: 'TC162A', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 8715, quantidade: 1, material: 'CIVIL 300', peso: 52.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0564', obraId: 'OBR001', marca: 'TC162B', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 8715, quantidade: 1, material: 'CIVIL 300', peso: 52.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0565', obraId: 'OBR001', marca: 'TC162C', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 8715, quantidade: 2, material: 'CIVIL 300', peso: 104.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0566', obraId: 'OBR001', marca: 'TC162D', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5605, quantidade: 1, material: 'CIVIL 300', peso: 26.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0567', obraId: 'OBR001', marca: 'TC162E', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5605, quantidade: 1, material: 'CIVIL 300', peso: 26.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0568', obraId: 'OBR001', marca: 'TC162F', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5605, quantidade: 1, material: 'CIVIL 300', peso: 26.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0569', obraId: 'OBR001', marca: 'TC162G', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 8325, quantidade: 1, material: 'CIVIL 300', peso: 49.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0570', obraId: 'OBR001', marca: 'TC162H', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 8325, quantidade: 1, material: 'CIVIL 300', peso: 49.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0571', obraId: 'OBR001', marca: 'TC163A', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 8325, quantidade: 2, material: 'CIVIL 300', peso: 99.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0572', obraId: 'OBR001', marca: 'TC163B', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 9895, quantidade: 6, material: 'CIVIL 300', peso: 356.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0573', obraId: 'OBR001', marca: 'TC163C', tipo: 'TERÇA', perfil: 'UE250X85X25X2', comprimento: 11380, quantidade: 6, material: 'CIVIL 300', peso: 495.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0574', obraId: 'OBR001', marca: 'TC163D', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10305, quantidade: 4, material: 'CIVIL 300', peso: 247.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0575', obraId: 'OBR001', marca: 'TC163E', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 9600, quantidade: 5, material: 'CIVIL 300', peso: 287.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0576', obraId: 'OBR001', marca: 'TC163F', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5490, quantidade: 3, material: 'CIVIL 300', peso: 78.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0577', obraId: 'OBR001', marca: 'TC163G', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5490, quantidade: 3, material: 'CIVIL 300', peso: 78.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0578', obraId: 'OBR001', marca: 'TC163H', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5490, quantidade: 3, material: 'CIVIL 300', peso: 78.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0579', obraId: 'OBR001', marca: 'TC164A', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 9895, quantidade: 5, material: 'CIVIL 300', peso: 296.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0580', obraId: 'OBR001', marca: 'TC164B', tipo: 'TERÇA', perfil: 'UE250X85X25X2', comprimento: 11380, quantidade: 5, material: 'CIVIL 300', peso: 412.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0581', obraId: 'OBR001', marca: 'TC164C', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10305, quantidade: 4, material: 'CIVIL 300', peso: 247.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0582', obraId: 'OBR001', marca: 'TC164D', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 9600, quantidade: 5, material: 'CIVIL 300', peso: 287.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0583', obraId: 'OBR001', marca: 'TC164E', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 4715, quantidade: 1, material: 'CIVIL 300', peso: 22.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0584', obraId: 'OBR001', marca: 'TC164F', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 4715, quantidade: 1, material: 'CIVIL 300', peso: 22.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0585', obraId: 'OBR001', marca: 'TC164G', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 4715, quantidade: 2, material: 'CIVIL 300', peso: 44.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0586', obraId: 'OBR001', marca: 'TC164H', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 8380, quantidade: 1, material: 'CIVIL 300', peso: 50.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0587', obraId: 'OBR001', marca: 'TC164I', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 8380, quantidade: 1, material: 'CIVIL 300', peso: 50.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0588', obraId: 'OBR001', marca: 'TC164J', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 8380, quantidade: 2, material: 'CIVIL 300', peso: 100.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0589', obraId: 'OBR001', marca: 'TC165A', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 9895, quantidade: 1, material: 'CIVIL 300', peso: 59.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0590', obraId: 'OBR001', marca: 'TC165B', tipo: 'TERÇA', perfil: 'UE250X85X25X2', comprimento: 11380, quantidade: 1, material: 'CIVIL 300', peso: 82.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0591', obraId: 'OBR001', marca: 'TC165C', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 8650, quantidade: 1, material: 'CIVIL 300', peso: 51.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0592', obraId: 'OBR001', marca: 'TC165D', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 8650, quantidade: 1, material: 'CIVIL 300', peso: 51.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0593', obraId: 'OBR001', marca: 'TC165E', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 8650, quantidade: 1, material: 'CIVIL 300', peso: 51.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0594', obraId: 'OBR001', marca: 'TC165F', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10320, quantidade: 2, material: 'CIVIL 300', peso: 123.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0595', obraId: 'OBR001', marca: 'TC165G', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10320, quantidade: 2, material: 'CIVIL 300', peso: 123.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0596', obraId: 'OBR001', marca: 'TC165H', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10320, quantidade: 4, material: 'CIVIL 300', peso: 247.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0597', obraId: 'OBR001', marca: 'TC166A', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 4880, quantidade: 1, material: 'CIVIL 300', peso: 23.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0598', obraId: 'OBR001', marca: 'TC166B', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 4880, quantidade: 1, material: 'CIVIL 300', peso: 23.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0599', obraId: 'OBR001', marca: 'TC166C', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 4880, quantidade: 1, material: 'CIVIL 300', peso: 23.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0600', obraId: 'OBR001', marca: 'TC166D', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 9215, quantidade: 1, material: 'CIVIL 300', peso: 55.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0601', obraId: 'OBR001', marca: 'TC166E', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 9215, quantidade: 1, material: 'CIVIL 300', peso: 55.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0602', obraId: 'OBR001', marca: 'TC166F', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 9215, quantidade: 1, material: 'CIVIL 300', peso: 55.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0603', obraId: 'OBR001', marca: 'TC166G', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 4495, quantidade: 1, material: 'CIVIL 300', peso: 21.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0604', obraId: 'OBR001', marca: 'TC166H', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 4495, quantidade: 1, material: 'CIVIL 300', peso: 21.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0605', obraId: 'OBR001', marca: 'TC166I', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 4495, quantidade: 2, material: 'CIVIL 300', peso: 42.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0606', obraId: 'OBR001', marca: 'TC166J', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5340, quantidade: 2, material: 'CIVIL 300', peso: 50.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0607', obraId: 'OBR001', marca: 'TC167A', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5340, quantidade: 2, material: 'CIVIL 300', peso: 50.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0608', obraId: 'OBR001', marca: 'TC167B', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5340, quantidade: 2, material: 'CIVIL 300', peso: 50.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0609', obraId: 'OBR001', marca: 'TC167C', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 9480, quantidade: 2, material: 'CIVIL 300', peso: 113.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0610', obraId: 'OBR001', marca: 'TC167D', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 8986, quantidade: 2, material: 'CIVIL 300', peso: 107.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0611', obraId: 'OBR001', marca: 'TC167E', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10400, quantidade: 4, material: 'CIVIL 300', peso: 249.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0612', obraId: 'OBR001', marca: 'TC167F', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 3350, quantidade: 1, material: 'CIVIL 300', peso: 15.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0613', obraId: 'OBR001', marca: 'TC167G', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5390, quantidade: 1, material: 'CIVIL 300', peso: 25.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0614', obraId: 'OBR001', marca: 'TC167H', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5390, quantidade: 1, material: 'CIVIL 300', peso: 25.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0615', obraId: 'OBR001', marca: 'TC167I', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5390, quantidade: 1, material: 'CIVIL 300', peso: 25.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0616', obraId: 'OBR001', marca: 'TC168A', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10400, quantidade: 1, material: 'CIVIL 300', peso: 62.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0617', obraId: 'OBR001', marca: 'TC168B', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10400, quantidade: 2, material: 'CIVIL 300', peso: 124.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0618', obraId: 'OBR001', marca: 'TC168C', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10400, quantidade: 1, material: 'CIVIL 300', peso: 62.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0619', obraId: 'OBR001', marca: 'TC168D', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 7090, quantidade: 2, material: 'CIVIL 300', peso: 67.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0620', obraId: 'OBR001', marca: 'TC168E', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 7090, quantidade: 2, material: 'CIVIL 300', peso: 67.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0621', obraId: 'OBR001', marca: 'TC168F', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 7090, quantidade: 2, material: 'CIVIL 300', peso: 67.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0622', obraId: 'OBR001', marca: 'TC168G', tipo: 'TERÇA', perfil: 'UE200X75X20X2', comprimento: 10400, quantidade: 5, material: 'CIVIL 300', peso: 311.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0623', obraId: 'OBR001', marca: 'TC168H', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 6970, quantidade: 1, material: 'CIVIL 300', peso: 33.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0624', obraId: 'OBR001', marca: 'TC169A', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5080, quantidade: 1, material: 'CIVIL 300', peso: 24.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0625', obraId: 'OBR001', marca: 'TC169B', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 4185, quantidade: 1, material: 'CIVIL 300', peso: 19.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0626', obraId: 'OBR001', marca: 'TC169C', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 4185, quantidade: 1, material: 'CIVIL 300', peso: 19.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0627', obraId: 'OBR001', marca: 'TC169D', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 4185, quantidade: 1, material: 'CIVIL 300', peso: 19.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0628', obraId: 'OBR001', marca: 'TC169E', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 6970, quantidade: 1, material: 'CIVIL 300', peso: 33.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0629', obraId: 'OBR001', marca: 'TC169F', tipo: 'TERÇA', perfil: 'UE150X60X20X2', comprimento: 5080, quantidade: 1, material: 'CIVIL 300', peso: 24.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0630', obraId: 'OBR001', marca: 'TP145B', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 10105, quantidade: 1, material: 'CIVIL 300', peso: 60.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0631', obraId: 'OBR001', marca: 'TP145D', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 10105, quantidade: 1, material: 'CIVIL 300', peso: 60.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0632', obraId: 'OBR001', marca: 'TP145F', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 11380, quantidade: 2, material: 'CIVIL 300', peso: 165.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0633', obraId: 'OBR001', marca: 'TP145G', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 11380, quantidade: 1, material: 'CIVIL 300', peso: 82.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0634', obraId: 'OBR001', marca: 'TP146A', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 11380, quantidade: 1, material: 'CIVIL 300', peso: 82.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0635', obraId: 'OBR001', marca: 'TP146B', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 10305, quantidade: 2, material: 'CIVIL 300', peso: 123.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0636', obraId: 'OBR001', marca: 'TP146C', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 10305, quantidade: 2, material: 'CIVIL 300', peso: 123.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0637', obraId: 'OBR001', marca: 'TP146D', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 10305, quantidade: 1, material: 'CIVIL 300', peso: 74.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0638', obraId: 'OBR001', marca: 'TP146E', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9810, quantidade: 1, material: 'CIVIL 300', peso: 58.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0639', obraId: 'OBR001', marca: 'TP146G', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9810, quantidade: 1, material: 'CIVIL 300', peso: 58.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0640', obraId: 'OBR001', marca: 'TP147A', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 5965, quantidade: 1, material: 'CIVIL 300', peso: 28.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0641', obraId: 'OBR001', marca: 'TP147B', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 6020, quantidade: 1, material: 'CIVIL 300', peso: 28.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0642', obraId: 'OBR001', marca: 'TP147C', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 5810, quantidade: 1, material: 'CIVIL 300', peso: 27.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0643', obraId: 'OBR001', marca: 'TP147E', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 8800, quantidade: 1, material: 'CIVIL 300', peso: 52.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0644', obraId: 'OBR001', marca: 'TP147F', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 8800, quantidade: 1, material: 'CIVIL 300', peso: 52.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0645', obraId: 'OBR001', marca: 'TP147G', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 8590, quantidade: 1, material: 'CIVIL 300', peso: 51.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0646', obraId: 'OBR001', marca: 'TP148A', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 5605, quantidade: 2, material: 'CIVIL 300', peso: 53.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0647', obraId: 'OBR001', marca: 'TP148B', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 5605, quantidade: 1, material: 'CIVIL 300', peso: 33.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0648', obraId: 'OBR001', marca: 'TP148C', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 5550, quantidade: 1, material: 'CIVIL 300', peso: 26.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0649', obraId: 'OBR001', marca: 'TP148D', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 8325, quantidade: 2, material: 'CIVIL 300', peso: 99.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0650', obraId: 'OBR001', marca: 'TP148E', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 8325, quantidade: 1, material: 'CIVIL 300', peso: 49.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0651', obraId: 'OBR001', marca: 'TP148F', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 8325, quantidade: 1, material: 'CIVIL 300', peso: 49.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0652', obraId: 'OBR001', marca: 'TP148G', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 5490, quantidade: 6, material: 'CIVIL 300', peso: 156.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0653', obraId: 'OBR001', marca: 'TP148H', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 5490, quantidade: 3, material: 'CIVIL 300', peso: 78.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0654', obraId: 'OBR001', marca: 'TP149A', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 5490, quantidade: 3, material: 'CIVIL 300', peso: 98.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0655', obraId: 'OBR001', marca: 'TP149B', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 4715, quantidade: 2, material: 'CIVIL 300', peso: 56.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0656', obraId: 'OBR001', marca: 'TP149C', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 4715, quantidade: 1, material: 'CIVIL 300', peso: 28.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0657', obraId: 'OBR001', marca: 'TP149D', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 4715, quantidade: 1, material: 'CIVIL 300', peso: 28.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0658', obraId: 'OBR001', marca: 'TP149E', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 8380, quantidade: 2, material: 'CIVIL 300', peso: 100.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0659', obraId: 'OBR001', marca: 'TP149F', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 8380, quantidade: 1, material: 'CIVIL 300', peso: 50.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0660', obraId: 'OBR001', marca: 'TP149G', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 8380, quantidade: 1, material: 'CIVIL 300', peso: 50.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0661', obraId: 'OBR001', marca: 'TP149H', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 8650, quantidade: 2, material: 'CIVIL 300', peso: 103.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0662', obraId: 'OBR001', marca: 'TP150A', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 8650, quantidade: 1, material: 'CIVIL 300', peso: 51.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0663', obraId: 'OBR001', marca: 'TP150B', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 8650, quantidade: 1, material: 'CIVIL 300', peso: 51.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0664', obraId: 'OBR001', marca: 'TP150C', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 7500, quantidade: 2, material: 'CIVIL 300', peso: 90.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0665', obraId: 'OBR001', marca: 'TP150D', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 7500, quantidade: 1, material: 'CIVIL 300', peso: 45.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0666', obraId: 'OBR001', marca: 'TP150E', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 7500, quantidade: 1, material: 'CIVIL 300', peso: 45.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0667', obraId: 'OBR001', marca: 'TP150F', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 4880, quantidade: 2, material: 'CIVIL 300', peso: 46.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0668', obraId: 'OBR001', marca: 'TP150G', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 4880, quantidade: 1, material: 'CIVIL 300', peso: 23.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0669', obraId: 'OBR001', marca: 'TP150H', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 4880, quantidade: 1, material: 'CIVIL 300', peso: 29.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0670', obraId: 'OBR001', marca: 'TP151A', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 6565, quantidade: 4, material: 'CIVIL 300', peso: 157.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0671', obraId: 'OBR001', marca: 'TP151B', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 6565, quantidade: 1, material: 'CIVIL 300', peso: 39.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0672', obraId: 'OBR001', marca: 'TP151C', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 6565, quantidade: 2, material: 'CIVIL 300', peso: 78.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0673', obraId: 'OBR001', marca: 'TP151D', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9215, quantidade: 2, material: 'CIVIL 300', peso: 110.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0674', obraId: 'OBR001', marca: 'TP151E', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9215, quantidade: 1, material: 'CIVIL 300', peso: 55.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0675', obraId: 'OBR001', marca: 'TP151F', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9215, quantidade: 1, material: 'CIVIL 300', peso: 55.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0676', obraId: 'OBR001', marca: 'TP151G', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 6510, quantidade: 1, material: 'CIVIL 300', peso: 39.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0677', obraId: 'OBR001', marca: 'TP151H', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 5389, quantidade: 1, material: 'CIVIL 300', peso: 32.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0678', obraId: 'OBR001', marca: 'TP152A', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9431, quantidade: 1, material: 'CIVIL 300', peso: 56.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0679', obraId: 'OBR001', marca: 'TP152B', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9679, quantidade: 1, material: 'CIVIL 300', peso: 58.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0680', obraId: 'OBR001', marca: 'TP152C', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9589, quantidade: 1, material: 'CIVIL 300', peso: 57.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0681', obraId: 'OBR001', marca: 'TP152D', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 4490, quantidade: 1, material: 'CIVIL 300', peso: 26.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0682', obraId: 'OBR001', marca: 'TP152E', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 11380, quantidade: 2, material: 'CIVIL 300', peso: 165.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0683', obraId: 'OBR001', marca: 'TP152F', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 11380, quantidade: 1, material: 'CIVIL 300', peso: 82.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0684', obraId: 'OBR001', marca: 'TP153A', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 11064, quantidade: 1, material: 'CIVIL 300', peso: 80.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0685', obraId: 'OBR001', marca: 'TP153B', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 2808, quantidade: 1, material: 'CIVIL 300', peso: 16.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0686', obraId: 'OBR001', marca: 'TP153C', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 2300, quantidade: 1, material: 'CIVIL 300', peso: 13.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0687', obraId: 'OBR001', marca: 'TP153D', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 10305, quantidade: 1, material: 'CIVIL 300', peso: 61.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0688', obraId: 'OBR001', marca: 'TP153E', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9989, quantidade: 1, material: 'CIVIL 300', peso: 59.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0689', obraId: 'OBR001', marca: 'TP153F', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 5696, quantidade: 1, material: 'CIVIL 300', peso: 34.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0690', obraId: 'OBR001', marca: 'TP153G', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9297, quantidade: 1, material: 'CIVIL 300', peso: 55.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0691', obraId: 'OBR001', marca: 'TP153H', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9275, quantidade: 1, material: 'CIVIL 300', peso: 55.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0692', obraId: 'OBR001', marca: 'TP153I', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9297, quantidade: 1, material: 'CIVIL 300', peso: 55.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0693', obraId: 'OBR001', marca: 'TP154A', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9139, quantidade: 1, material: 'CIVIL 300', peso: 54.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0694', obraId: 'OBR001', marca: 'TP154C', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 4705, quantidade: 2, material: 'CIVIL 300', peso: 56.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0695', obraId: 'OBR001', marca: 'TP154D', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 4650, quantidade: 1, material: 'CIVIL 300', peso: 27.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0696', obraId: 'OBR001', marca: 'TP154E', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 5340, quantidade: 4, material: 'CIVIL 300', peso: 101.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0697', obraId: 'OBR001', marca: 'TP154F', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 5340, quantidade: 1, material: 'CIVIL 300', peso: 25.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0698', obraId: 'OBR001', marca: 'TP154G', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 5340, quantidade: 2, material: 'CIVIL 300', peso: 64.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0699', obraId: 'OBR001', marca: 'TP154H', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9506, quantidade: 2, material: 'CIVIL 300', peso: 114.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0700', obraId: 'OBR001', marca: 'TP155A', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 9506, quantidade: 1, material: 'CIVIL 300', peso: 57.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0701', obraId: 'OBR001', marca: 'TP155C', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 5390, quantidade: 2, material: 'CIVIL 300', peso: 51.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0702', obraId: 'OBR001', marca: 'TP155D', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 5390, quantidade: 1, material: 'CIVIL 300', peso: 25.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0703', obraId: 'OBR001', marca: 'TP155E', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 5390, quantidade: 1, material: 'CIVIL 300', peso: 32.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0704', obraId: 'OBR001', marca: 'TP155F', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 11760, quantidade: 1, material: 'CIVIL 300', peso: 85.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0705', obraId: 'OBR001', marca: 'TP155G', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 11760, quantidade: 1, material: 'CIVIL 300', peso: 85.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0706', obraId: 'OBR001', marca: 'TP156B', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 7575, quantidade: 1, material: 'CIVIL 300', peso: 54.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0707', obraId: 'OBR001', marca: 'TP156C', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 5340, quantidade: 1, material: 'CIVIL 300', peso: 25.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0708', obraId: 'OBR001', marca: 'TP156D', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 7090, quantidade: 2, material: 'CIVIL 300', peso: 67.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0709', obraId: 'OBR001', marca: 'TP156E', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 7090, quantidade: 1, material: 'CIVIL 300', peso: 33.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0710', obraId: 'OBR001', marca: 'TP156F', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 7090, quantidade: 1, material: 'CIVIL 300', peso: 42.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0711', obraId: 'OBR001', marca: 'TP156G', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 7090, quantidade: 2, material: 'CIVIL 300', peso: 67.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0712', obraId: 'OBR001', marca: 'TP156H', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 7090, quantidade: 1, material: 'CIVIL 300', peso: 33.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0713', obraId: 'OBR001', marca: 'TP157A', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 7090, quantidade: 1, material: 'CIVIL 300', peso: 51.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0714', obraId: 'OBR001', marca: 'TP157D', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 7560, quantidade: 2, material: 'CIVIL 300', peso: 71.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0715', obraId: 'OBR001', marca: 'TP157E', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 7560, quantidade: 1, material: 'CIVIL 300', peso: 35.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0716', obraId: 'OBR001', marca: 'TP157F', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 7560, quantidade: 2, material: 'CIVIL 300', peso: 71.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0717', obraId: 'OBR001', marca: 'TP157G', tipo: 'TERÇA-TAP', perfil: 'UE150X60X20X2', comprimento: 7560, quantidade: 1, material: 'CIVIL 300', peso: 35.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0718', obraId: 'OBR001', marca: 'TP157H', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 10105, quantidade: 2, material: 'CIVIL 300', peso: 121.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0719', obraId: 'OBR001', marca: 'TP158A', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 10105, quantidade: 1, material: 'CIVIL 300', peso: 60.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0720', obraId: 'OBR001', marca: 'TP158C', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 1985, quantidade: 1, material: 'CIVIL 300', peso: 11.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0721', obraId: 'OBR001', marca: 'TP158F', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 11380, quantidade: 1, material: 'CIVIL 300', peso: 82.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0722', obraId: 'OBR001', marca: 'TP159A', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 11380, quantidade: 1, material: 'CIVIL 300', peso: 82.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0723', obraId: 'OBR001', marca: 'TP159B', tipo: 'TERÇA-TAP', perfil: 'UE250X85X25X2', comprimento: 9545, quantidade: 1, material: 'CIVIL 300', peso: 69.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0724', obraId: 'OBR001', marca: 'TP159C', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 10500, quantidade: 2, material: 'CIVIL 300', peso: 125.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0725', obraId: 'OBR001', marca: 'TP159D', tipo: 'TERÇA-TAP', perfil: 'UE200X75X20X2', comprimento: 10500, quantidade: 1, material: 'CIVIL 300', peso: 63.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0726', obraId: 'OBR001', marca: 'TR131A', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2122, quantidade: 2, material: 'A36', peso: 3.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0727', obraId: 'OBR001', marca: 'TR131C', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2113, quantidade: 2, material: 'A36', peso: 3.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0728', obraId: 'OBR001', marca: 'TR131D', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2428, quantidade: 2, material: 'A36', peso: 4.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0729', obraId: 'OBR001', marca: 'TR131E', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2419, quantidade: 2, material: 'A36', peso: 4.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0730', obraId: 'OBR001', marca: 'TR131F', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2232, quantidade: 2, material: 'A36', peso: 4.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0731', obraId: 'OBR001', marca: 'TR131G', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2223, quantidade: 2, material: 'A36', peso: 4.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0732', obraId: 'OBR001', marca: 'TR131H', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2069, quantidade: 2, material: 'A36', peso: 3.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0733', obraId: 'OBR001', marca: 'TR131I', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2061, quantidade: 2, material: 'A36', peso: 3.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0734', obraId: 'OBR001', marca: 'TR131J', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 1640, quantidade: 1, material: 'A36', peso: 1.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0735', obraId: 'OBR001', marca: 'TR132A', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3742, quantidade: 4, material: 'A36', peso: 13.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0736', obraId: 'OBR001', marca: 'TR132B', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3918, quantidade: 4, material: 'A36', peso: 14.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0737', obraId: 'OBR001', marca: 'TR132C', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3659, quantidade: 2, material: 'A36', peso: 6.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0738', obraId: 'OBR001', marca: 'TR132F', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3455, quantidade: 2, material: 'A36', peso: 6.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0739', obraId: 'OBR001', marca: 'TR133A', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3488, quantidade: 4, material: 'A36', peso: 12.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0740', obraId: 'OBR001', marca: 'TR133D', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3363, quantidade: 2, material: 'A36', peso: 6.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0741', obraId: 'OBR001', marca: 'TR133E', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3383, quantidade: 2, material: 'A36', peso: 6.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0742', obraId: 'OBR001', marca: 'TR133F', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3368, quantidade: 4, material: 'A36', peso: 12.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0743', obraId: 'OBR001', marca: 'TR134F', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3187, quantidade: 2, material: 'A36', peso: 5.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0744', obraId: 'OBR001', marca: 'TR134G', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3405, quantidade: 2, material: 'A36', peso: 6.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0745', obraId: 'OBR001', marca: 'TR134H', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3210, quantidade: 2, material: 'A36', peso: 5.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0746', obraId: 'OBR001', marca: 'TR135A', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3367, quantidade: 2, material: 'A36', peso: 6.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0747', obraId: 'OBR001', marca: 'TR135B', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3185, quantidade: 2, material: 'A36', peso: 5.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0748', obraId: 'OBR001', marca: 'TR135C', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3359, quantidade: 6, material: 'A36', peso: 18.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0749', obraId: 'OBR001', marca: 'TR135D', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3161, quantidade: 6, material: 'A36', peso: 17.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0750', obraId: 'OBR001', marca: 'TR135E', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3744, quantidade: 8, material: 'A36', peso: 26.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0751', obraId: 'OBR001', marca: 'TR135F', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3921, quantidade: 8, material: 'A36', peso: 28.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0752', obraId: 'OBR001', marca: 'TR136A', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3662, quantidade: 6, material: 'A36', peso: 19.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0753', obraId: 'OBR001', marca: 'TR136B', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3462, quantidade: 8, material: 'A36', peso: 24.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0754', obraId: 'OBR001', marca: 'TR136C', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3491, quantidade: 8, material: 'A36', peso: 25.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0755', obraId: 'OBR001', marca: 'TR136D', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3043, quantidade: 2, material: 'A36', peso: 5.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0756', obraId: 'OBR001', marca: 'TR136E', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2839, quantidade: 2, material: 'A36', peso: 5.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0757', obraId: 'OBR001', marca: 'TR136F', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3201, quantidade: 2, material: 'A36', peso: 5.7, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0758', obraId: 'OBR001', marca: 'TR137C', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3489, quantidade: 4, material: 'A36', peso: 12.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0759', obraId: 'OBR001', marca: 'TR137D', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3517, quantidade: 4, material: 'A36', peso: 12.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0760', obraId: 'OBR001', marca: 'TR137F', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3769, quantidade: 4, material: 'A36', peso: 13.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0761', obraId: 'OBR001', marca: 'TR138A', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3944, quantidade: 4, material: 'A36', peso: 14.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0762', obraId: 'OBR001', marca: 'TR138B', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3686, quantidade: 4, material: 'A36', peso: 13.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0763', obraId: 'OBR001', marca: 'TR138D', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3469, quantidade: 2, material: 'A36', peso: 6.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0764', obraId: 'OBR001', marca: 'TR138E', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3278, quantidade: 2, material: 'A36', peso: 5.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0765', obraId: 'OBR001', marca: 'TR138F', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2954, quantidade: 2, material: 'A36', peso: 5.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0766', obraId: 'OBR001', marca: 'TR138G', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3923, quantidade: 4, material: 'A36', peso: 14.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0767', obraId: 'OBR001', marca: 'TR139A', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3122, quantidade: 2, material: 'A36', peso: 5.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0768', obraId: 'OBR001', marca: 'TR139B', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2906, quantidade: 2, material: 'A36', peso: 5.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0769', obraId: 'OBR001', marca: 'TR139C', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3630, quantidade: 4, material: 'A36', peso: 13.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0770', obraId: 'OBR001', marca: 'TR139D', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3624, quantidade: 2, material: 'A36', peso: 6.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0771', obraId: 'OBR001', marca: 'TR139E', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3442, quantidade: 2, material: 'A36', peso: 6.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0772', obraId: 'OBR001', marca: 'TR139F', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3584, quantidade: 1, material: 'A36', peso: 3.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0773', obraId: 'OBR001', marca: 'TR140A', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3624, quantidade: 1, material: 'A36', peso: 3.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0774', obraId: 'OBR001', marca: 'TR140B', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3797, quantidade: 2, material: 'A36', peso: 6.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0775', obraId: 'OBR001', marca: 'TR140C', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3543, quantidade: 1, material: 'A36', peso: 3.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0776', obraId: 'OBR001', marca: 'TR140D', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3596, quantidade: 1, material: 'A36', peso: 3.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0777', obraId: 'OBR001', marca: 'TR140G', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3349, quantidade: 2, material: 'A36', peso: 6.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0778', obraId: 'OBR001', marca: 'TR141A', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3508, quantidade: 2, material: 'A36', peso: 6.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0779', obraId: 'OBR001', marca: 'TR141C', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2923, quantidade: 2, material: 'A36', peso: 5.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0780', obraId: 'OBR001', marca: 'TR141D', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2710, quantidade: 1, material: 'A36', peso: 2.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0781', obraId: 'OBR001', marca: 'TR141E', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3300, quantidade: 4, material: 'A36', peso: 11.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0782', obraId: 'OBR001', marca: 'TR141F', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3098, quantidade: 4, material: 'A36', peso: 11.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0783', obraId: 'OBR001', marca: 'TR141G', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2789, quantidade: 1, material: 'A36', peso: 2.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0784', obraId: 'OBR001', marca: 'TR142A', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3142, quantidade: 1, material: 'A36', peso: 2.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0785', obraId: 'OBR001', marca: 'TR142B', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3458, quantidade: 1, material: 'A36', peso: 3.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0786', obraId: 'OBR001', marca: 'TR142E', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3332, quantidade: 1, material: 'A36', peso: 3.0, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0787', obraId: 'OBR001', marca: 'TR142F', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3319, quantidade: 2, material: 'A36', peso: 5.9, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0788', obraId: 'OBR001', marca: 'TR142G', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3119, quantidade: 2, material: 'A36', peso: 5.6, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0789', obraId: 'OBR001', marca: 'TR143A', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3552, quantidade: 2, material: 'A36', peso: 6.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0790', obraId: 'OBR001', marca: 'TR143B', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3523, quantidade: 1, material: 'A36', peso: 3.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0791', obraId: 'OBR001', marca: 'TR143C', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2843, quantidade: 4, material: 'A36', peso: 10.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0792', obraId: 'OBR001', marca: 'TR143D', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 4027, quantidade: 4, material: 'A36', peso: 14.4, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0793', obraId: 'OBR001', marca: 'TR143E', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 4015, quantidade: 3, material: 'A36', peso: 10.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0794', obraId: 'OBR001', marca: 'TR143F', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 4195, quantidade: 1, material: 'A36', peso: 3.8, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0795', obraId: 'OBR001', marca: 'TR144A', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3459, quantidade: 2, material: 'A36', peso: 6.2, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0796', obraId: 'OBR001', marca: 'TR144C', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2835, quantidade: 2, material: 'A36', peso: 5.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0797', obraId: 'OBR001', marca: 'TR144D', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 3629, quantidade: 2, material: 'A36', peso: 6.5, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0798', obraId: 'OBR001', marca: 'TR144E', tipo: 'TIRANTE', perfil: 'FERRO Ø1/2', comprimento: 2938, quantidade: 2, material: 'A36', peso: 5.3, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' },
  { id: 'PEC-0799', obraId: 'OBR001', marca: 'V130E', tipo: 'VIGA', perfil: 'W410X38.8', comprimento: 4815, quantidade: 1, material: 'A572-GR.50', peso: 190.1, etapa: 'aguardando', statusCorte: 'PROGRAMACAO', dataImportacao: '2026-02-05' }
]; // Será preenchido com dados reais

// ========================================
// DADOS MOCK - EXPEDIÇÕES
// ========================================

export const expedicoes = []; // Limpo - será preenchido com dados reais

// ========================================
// DADOS MOCK - FUNCIONÁRIOS
// ========================================

export const funcionarios = [
  // === GESTÃO ===
  { id: 'FUNC-001', nome: 'DAVID BARBOSA DE SOUZA', funcao: 'Coordenador de Produção', setor: 'gestao', nivel: 'coordenador', status: 'ativo', dataAdmissao: '2025-01-15', obraAtual: 'OBR001' },
  { id: 'FUNC-002', nome: 'FLAVIO DE JESUS SANTOS', funcao: 'Líder de Produção', setor: 'producao', nivel: 'lider', status: 'ativo', dataAdmissao: '2025-01-15', obraAtual: 'OBR001' },
  { id: 'FUNC-003', nome: 'WHASHINGTON DE OLIVEIRA', funcao: 'Encarregado de Campo II', setor: 'montagem', nivel: 'encarregado', status: 'ativo', dataAdmissao: '2025-01-15', obraAtual: 'OBR001' },
  // === SOLDADORES ===
  { id: 'FUNC-004', nome: 'GILMAR SOUSA DA SILVA', funcao: 'Soldador II', setor: 'solda', nivel: 'soldador_II', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  { id: 'FUNC-005', nome: 'JUSCELIO RODRIGUES DE SOUZA', funcao: 'Soldador I', setor: 'solda', nivel: 'soldador_I', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  { id: 'FUNC-006', nome: 'LUIZ BARBOSA FERRERA', funcao: 'Soldador I', setor: 'solda', nivel: 'soldador_I', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  // === MONTADORES ===
  { id: 'FUNC-007', nome: 'DIEGO ALVES DA SILVA', funcao: 'Montador I', setor: 'montagem', nivel: 'montador_I', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  { id: 'FUNC-008', nome: 'EDER BRUNO SILVA FERREIRA', funcao: 'Montador I', setor: 'montagem', nivel: 'montador_I', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  { id: 'FUNC-009', nome: 'DERLEI GOBBI', funcao: 'Montador I', setor: 'montagem', nivel: 'montador_I', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  { id: 'FUNC-010', nome: 'GABRIEL FERREIRA SANTOS', funcao: 'Montador I', setor: 'montagem', nivel: 'montador_I', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  { id: 'FUNC-011', nome: 'WALDERCY MIRANDA', funcao: 'Montador II', setor: 'montagem', nivel: 'montador_II', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  { id: 'FUNC-012', nome: 'JEFERSON BRUNO DE O COSTA', funcao: 'Montador III', setor: 'montagem', nivel: 'montador_III', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  { id: 'FUNC-013', nome: 'JUSCELIO RODRIGUES', funcao: 'Montador III', setor: 'montagem', nivel: 'montador_III', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  // === MEIO OFICIAIS ===
  { id: 'FUNC-014', nome: 'ERICK WELISON HOSNI DE PAULA', funcao: 'Meio Oficial de Montador', setor: 'montagem', nivel: 'meio_oficial', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  { id: 'FUNC-015', nome: 'JOSE EDUARDO LUCAS', funcao: 'Meio Oficial de Montador', setor: 'montagem', nivel: 'meio_oficial', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  { id: 'FUNC-016', nome: 'WENDEL GABRIEL ALVES DOS REIS', funcao: 'Meio Oficial de Montador', setor: 'montagem', nivel: 'meio_oficial', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  // === AJUDANTE ===
  { id: 'FUNC-017', nome: 'JOAO BATISTA ALVES RODRIGUES', funcao: 'Ajudante de Montagem', setor: 'montagem', nivel: 'ajudante', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  // === CALDEREIRO ===
  { id: 'FUNC-018', nome: 'RICARDO ALVES PEREIRA', funcao: 'Caldereiro Montador', setor: 'fabricacao', nivel: 'caldereiro', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  // === SERRALHEIRO / ESQUADRIAS ===
  { id: 'FUNC-019', nome: 'JOÃO ERMELINDO SOARES', funcao: 'Serralheiro de Alumínio', setor: 'fabricacao', nivel: 'serralheiro', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  { id: 'FUNC-020', nome: 'FLAVIO DA CRUZ', funcao: 'Instalador Esquadrias Alumínio', setor: 'montagem', nivel: 'instalador', status: 'ativo', dataAdmissao: '2025-02-01', obraAtual: 'OBR001' },
  // === APOIO ===
  { id: 'FUNC-021', nome: 'TARCISIO VIEIRA DE ALMEIDA', funcao: 'Almoxarife', setor: 'almoxarifado', nivel: 'almoxarife', status: 'ativo', dataAdmissao: '2025-01-15', obraAtual: 'OBR001' },
  { id: 'FUNC-022', nome: 'CRISTIANE VIEIRA', funcao: 'Auxiliar de Serviços Gerais', setor: 'apoio', nivel: 'auxiliar', status: 'ativo', dataAdmissao: '2025-01-15', obraAtual: 'OBR001' },
];

// ========================================
// DADOS MOCK - EQUIPES
// ========================================

export const equipes = [
  {
    id: 'EQP-001',
    nome: 'Equipe Solda',
    setor: 'solda',
    lider: 'FUNC-004', // Gilmar - Soldador II (mais experiente)
    membros: ['FUNC-004', 'FUNC-005', 'FUNC-006'],
    obraAtual: 'OBR001',
    status: 'ativa',
    capacidadeDiaria: 2000, // kg/dia estimado
  },
  {
    id: 'EQP-002',
    nome: 'Equipe Montagem Campo A',
    setor: 'montagem',
    lider: 'FUNC-003', // Whashington - Encarregado de Campo
    membros: ['FUNC-003', 'FUNC-007', 'FUNC-008', 'FUNC-011', 'FUNC-014', 'FUNC-017'],
    obraAtual: 'OBR001',
    status: 'ativa',
    capacidadeDiaria: 3000,
  },
  {
    id: 'EQP-003',
    nome: 'Equipe Montagem Campo B',
    setor: 'montagem',
    lider: 'FUNC-012', // Jeferson - Montador III (mais experiente)
    membros: ['FUNC-012', 'FUNC-009', 'FUNC-010', 'FUNC-013', 'FUNC-015', 'FUNC-016'],
    obraAtual: 'OBR001',
    status: 'ativa',
    capacidadeDiaria: 3000,
  },
  {
    id: 'EQP-004',
    nome: 'Equipe Fabricação',
    setor: 'fabricacao',
    lider: 'FUNC-018', // Ricardo - Caldereiro
    membros: ['FUNC-018', 'FUNC-019'],
    obraAtual: 'OBR001',
    status: 'ativa',
    capacidadeDiaria: 1500,
  },
  {
    id: 'EQP-005',
    nome: 'Equipe Esquadrias',
    setor: 'montagem',
    lider: 'FUNC-020', // Flavio - Instalador
    membros: ['FUNC-020'],
    obraAtual: 'OBR001',
    status: 'ativa',
    capacidadeDiaria: 500,
  },
];

// ========================================
// DADOS MOCK - MEDIÇÕES (R$/kg)
// ========================================

// Medições serão cadastradas via módulo de Medição do sistema
export const medicoes = [];

// ========================================
// DADOS MOCK - COMPRAS
// ========================================

// PRÉ-PEDIDOS - Valores PREVISTOS (não gerar financeiro real)
// Fonte: Cotações e Ordem de Venda Gerdau - Jan/2026
export const compras = [
  // ==========================================
  // PP-001: Cotação Chapas A36 (lote 1)
  // ==========================================
  {
    id: 'PP-001',
    obraId: 'OBR001',
    tipo: 'pre_pedido',
    categoriaFinanceira: 'previsto',
    documentoOrigem: 'CT--W09236613',
    fornecedor: 'Gerdau Aços Longos S.A.',
    cnpjFornecedor: '07.358.761/0001-69',
    vendedor: 'Eduardo Bruno da Purificação',
    vendedorTelefone: '031 9988305655',
    vendedorEmail: 'eduardo.acosgrdau@gmail.com',
    comprador: 'Construtora do Carmo Ltda',
    cnpjComprador: '10.798.894/0001-60',
    dataCotacao: '2026-01-05',
    dataValidade: '2026-01-05',
    condicaoPagamento: 'ZG13 Trademaster 30 dias',
    frete: 'CIF',
    icms: 12.00,
    ipi: 3.25,
    status: 'cotacao_recebida',
    statusFinanceiro: 'previsto',
    pesoTotalKg: 4656.52,
    valorTotal: 29562.96,
    observacao: 'Chapas A36 - Lote 1 (espessuras finas)',
    itens: [
      { item: 10, descricao: 'CHAPA LQ A36 4,75X1200X3000', quantidade: 137.0, unidade: 'KG', precoUnitario: 5.97, valorTotal: 844.12, material: 'A36', categoria: 'chapas' },
      { item: 20, descricao: 'CHAPA LQ A36 6,3X1200X3000', quantidade: 544.32, unidade: 'KG', precoUnitario: 5.97, valorTotal: 3353.77, material: 'A36', categoria: 'chapas' },
      { item: 30, descricao: 'CHAPA LQ A36 9,5X1200X6000', quantidade: 547.0, unidade: 'KG', precoUnitario: 5.97, valorTotal: 3370.28, material: 'A36', categoria: 'chapas' },
      { item: 40, descricao: 'CHAPA LQ A36 16X1200X3000', quantidade: 452.2, unidade: 'KG', precoUnitario: 5.97, valorTotal: 2786.18, material: 'A36', categoria: 'chapas' },
      { item: 50, descricao: 'CHAPA LQ A36 2X1000X3000', quantidade: 2976.0, unidade: 'KG', precoUnitario: 6.45, valorTotal: 19208.61, material: 'A36', categoria: 'chapas' }
    ]
  },

  // ==========================================
  // PP-002: Cotação Chapas A36 (lote 2 - Chapas)
  // ==========================================
  {
    id: 'PP-002',
    obraId: 'OBR001',
    tipo: 'pre_pedido',
    categoriaFinanceira: 'previsto',
    documentoOrigem: 'CT--W09271197',
    fornecedor: 'Gerdau Aços Longos S.A.',
    cnpjFornecedor: '07.358.761/0001-69',
    vendedor: 'Eduardo Bruno da Purificação',
    vendedorTelefone: '031 9988305655',
    vendedorEmail: 'eduardo.acosgrdau@gmail.com',
    comprador: 'Construtora do Carmo Ltda',
    cnpjComprador: '10.798.894/0001-60',
    dataCotacao: '2026-01-14',
    dataValidade: '2026-01-14',
    condicaoPagamento: 'B014 - Pagamento antecipado com depósito',
    frete: 'CIF',
    icms: 12.00,
    ipi: 3.25,
    status: 'cotacao_recebida',
    statusFinanceiro: 'previsto',
    pesoTotalKg: 10268.6,
    valorTotal: 63102.96,
    observacao: 'Chapas A36 - Lote 2 (espessuras variadas incl. chapa grossa 22,4mm)',
    itens: [
      { item: 10, descricao: 'CHAPA LQ A36 4,75X1200X3000', quantidade: 685.0, unidade: 'KG', precoUnitario: 5.47, valorTotal: 3869.20, material: 'A36', categoria: 'chapas' },
      { item: 20, descricao: 'CHAPA LQ A36 6,3X1200X6000', quantidade: 1815.0, unidade: 'KG', precoUnitario: 5.47, valorTotal: 10251.95, material: 'A36', categoria: 'chapas' },
      { item: 30, descricao: 'CHAPA LQ A36 8X1500X6000', quantidade: 1728.0, unidade: 'KG', precoUnitario: 5.47, valorTotal: 9760.55, material: 'A36', categoria: 'chapas' },
      { item: 40, descricao: 'CHAPA LQ A36 8X1000X2000', quantidade: 128.0, unidade: 'KG', precoUnitario: 5.47, valorTotal: 723.00, material: 'A36', categoria: 'chapas' },
      { item: 50, descricao: 'CHAPA LQ A36 9,5X1200X6000', quantidade: 1094.0, unidade: 'KG', precoUnitario: 5.47, valorTotal: 6179.42, material: 'A36', categoria: 'chapas' },
      { item: 70, descricao: 'CHAPA LQ A36 16X1200X3000', quantidade: 1356.6, unidade: 'KG', precoUnitario: 5.47, valorTotal: 7662.70, material: 'A36', categoria: 'chapas' },
      { item: 80, descricao: 'CHAPA LCG A36/131A/283C 22,4X2550X3000', quantidade: 2742.0, unidade: 'KG', precoUnitario: 7.27, valorTotal: 20589.26, material: 'A36', categoria: 'chapas' }
    ]
  },

  // ==========================================
  // PP-003: Ordem de Venda - Perfis, Barras e Cantoneiras
  // ==========================================
  {
    id: 'PP-003',
    obraId: 'OBR001',
    tipo: 'pre_pedido',
    categoriaFinanceira: 'previsto',
    documentoOrigem: 'OV--W09264680',
    numeroPedido: '0015696810',
    fornecedor: 'Gerdau Aços Longos S.A.',
    cnpjFornecedor: '07.358.761/0001-69',
    vendedor: 'Eduardo Bruno da Purificação',
    vendedorTelefone: '031 9988305655',
    vendedorEmail: 'eduardo.acosgrdau@gmail.com',
    comprador: 'Construtora do Carmo Ltda',
    cnpjComprador: '10.798.894/0001-60',
    dataCotacao: '2026-01-13',
    dataValidade: '2026-01-13',
    condicaoPagamento: 'B014 - Pagamento antecipado com depósito',
    frete: 'CIF',
    icms: 0,
    ipi: 0,
    status: 'ordem_confirmada',
    statusFinanceiro: 'previsto',
    pesoTotalKg: 62448.49,
    valorTotal: 481585.43,
    observacao: 'Perfis W (A572-GR.50), Barras Redondas e Cantoneiras (A36) - Pedido confirmado',
    itens: [
      { item: 10, descricao: 'PF I W200X19,3 A572GR50 12M', quantidade: 3705.6, unidade: 'KG', precoUnitario: 7.69, valorTotal: 28511.61, material: 'A572-GR.50', categoria: 'perfis_w' },
      { item: 20, descricao: 'PF H W200X35,9 A572GR50 12M', quantidade: 3015.6, unidade: 'KG', precoUnitario: 7.69, valorTotal: 23202.61, material: 'A572-GR.50', categoria: 'perfis_w' },
      { item: 30, descricao: 'PF H W200X35,9 A572GR50 6M', quantidade: 215.4, unidade: 'KG', precoUnitario: 7.69, valorTotal: 1657.33, material: 'A572-GR.50', categoria: 'perfis_w' },
      { item: 40, descricao: 'PF I W250X25,3 A572GR50 12M', quantidade: 7286.4, unidade: 'KG', precoUnitario: 7.69, valorTotal: 56062.99, material: 'A572-GR.50', categoria: 'perfis_w' },
      { item: 50, descricao: 'PF I W310X38,7 A572GR50 12M', quantidade: 2786.4, unidade: 'KG', precoUnitario: 7.69, valorTotal: 21439.11, material: 'A572-GR.50', categoria: 'perfis_w' },
      { item: 60, descricao: 'PF I W410X38,8 A572GR50 12M', quantidade: 12571.2, unidade: 'KG', precoUnitario: 7.69, valorTotal: 96725.27, material: 'A572-GR.50', categoria: 'perfis_w' },
      { item: 80, descricao: 'PF I W410X53 A572GR50 12M', quantidade: 12720.0, unidade: 'KG', precoUnitario: 7.69, valorTotal: 97870.17, material: 'A572-GR.50', categoria: 'perfis_w' },
      { item: 90, descricao: 'PF I W410X53 A572GR50 6M', quantidade: 5724.0, unidade: 'KG', precoUnitario: 7.69, valorTotal: 44041.58, material: 'A572-GR.50', categoria: 'perfis_w' },
      { item: 100, descricao: 'PF I W530X66 A572GR50 12M', quantidade: 792.0, unidade: 'KG', precoUnitario: 7.69, valorTotal: 6093.80, material: 'A572-GR.50', categoria: 'perfis_w' },
      { item: 110, descricao: 'PF H W150X22,5 A572GR50 6M', quantidade: 675.0, unidade: 'KG', precoUnitario: 7.69, valorTotal: 5193.59, material: 'A572-GR.50', categoria: 'perfis_w' },
      { item: 120, descricao: 'PF I W150X13 A572GR50 12M', quantidade: 468.0, unidade: 'KG', precoUnitario: 7.69, valorTotal: 3600.88, material: 'A572-GR.50', categoria: 'perfis_w' },
      { item: 130, descricao: 'PF H HP310X79 A572GR50 12M', quantidade: 1896.0, unidade: 'KG', precoUnitario: 8.32, valorTotal: 15769.61, material: 'A572-GR.50', categoria: 'perfis_w' },
      { item: 140, descricao: 'PF H HP310X79 A572GR50 6M', quantidade: 5214.0, unidade: 'KG', precoUnitario: 8.32, valorTotal: 43366.40, material: 'A572-GR.50', categoria: 'perfis_w' },
      { item: 150, descricao: 'BARRED 1" A36 6M', quantidade: 429.66, unidade: 'KG', precoUnitario: 7.04, valorTotal: 3023.60, material: 'A36', categoria: 'barras' },
      { item: 160, descricao: 'BARRED 1/2" GG A36 6M', quantidade: 606.53, unidade: 'KG', precoUnitario: 7.04, valorTotal: 4268.28, material: 'A36', categoria: 'barras' },
      { item: 170, descricao: 'BARRED 5/8" A36 6M', quantidade: 1183.64, unidade: 'KG', precoUnitario: 7.04, valorTotal: 8329.51, material: 'A36', categoria: 'barras' },
      { item: 180, descricao: 'CANT 1.1/2"X1/8" A36 6M', quantidade: 131.76, unidade: 'KG', precoUnitario: 7.04, valorTotal: 927.22, material: 'A36', categoria: 'cantoneiras' },
      { item: 190, descricao: 'CANT 2"X1/4" A36 12M', quantidade: 2730.24, unidade: 'KG', precoUnitario: 7.04, valorTotal: 19213.23, material: 'A36', categoria: 'cantoneiras' },
      { item: 200, descricao: 'CANT 3"X3/8" A36 6M', quantidade: 64.26, unidade: 'KG', precoUnitario: 7.74, valorTotal: 497.43, material: 'A36', categoria: 'cantoneiras' }
    ]
  }
];

// ========================================
// NOTAS FISCAIS DE MATERIAIS (REAL - lançamentos efetivos)
// ========================================
// Conferência automática: NFs Gerdau vs Pré-Pedidos (PP-001, PP-002, PP-003)
//
// MATCHING ANÁLISE:
// NF 70467  (R$29.682,98)  ← PP-001 (R$29.562,96 + impostos) = Chapas A36 lote 1
// NF 70742  (R$60.922,01)  ← PP-002 (R$63.102,96 parcial)    = Chapas A36 lote 2
// NF 217946 (R$35.302,78)  ← PP-003 parcial (perfis W200)
// NF 218134 (R$87.407,98)  ← PP-003 parcial (perfis W310/W410)
// NF 218191 (R$212.116,32) ← PP-003 parcial (perfis W410/W530/HP310)
// NF 218103 (R$11.329,87)  ← PP-003 parcial (barras redondas)
// NF 218267 (R$28.924,92)  ← PP-003 parcial (cantoneiras)
// NF 228    (R$7.202,00)   ← TOLUMAX (fornecedor avulso - sem pré-pedido)
//
// Total NFs Gerdau: R$465.687,86 vs PP total: R$574.251,35
// Saldo pendente entrega: R$108.563,49

export const notasFiscais = [
  {
    id: 'NF-001',
    obraId: 'OBR001',
    numero: '70467',
    fornecedor: 'Gerdau Aços Longos S.A.',
    cnpjFornecedor: '07.358.761/0001-69',
    dataEmissao: '2026-01-08',
    dataEntrada: '2026-01-08',
    valorTotal: 29682.98,
    status: 'conferida',
    prePedidoRef: 'PP-001',
    tipo: 'material',
    observacao: 'Chapas A36 - Lote 1 (espessuras 2mm a 16mm)',
    conferencia: {
      previsto: 29562.96,
      realizado: 29682.98,
      diferenca: 120.02,
      percentual: 0.41,
      motivo: 'Diferença de impostos (IPI parcial)'
    },
    itens: [
      { descricao: 'CHAPA LQ A36 4,75X1200X3000', quantidade: 137.0, unidade: 'KG', material: 'A36', categoria: 'chapas' },
      { descricao: 'CHAPA LQ A36 6,3X1200X3000', quantidade: 544.32, unidade: 'KG', material: 'A36', categoria: 'chapas' },
      { descricao: 'CHAPA LQ A36 9,5X1200X6000', quantidade: 547.0, unidade: 'KG', material: 'A36', categoria: 'chapas' },
      { descricao: 'CHAPA LQ A36 16X1200X3000', quantidade: 452.2, unidade: 'KG', material: 'A36', categoria: 'chapas' },
      { descricao: 'CHAPA LQ A36 2X1000X3000', quantidade: 2976.0, unidade: 'KG', material: 'A36', categoria: 'chapas' }
    ],
    pesoTotalKg: 4656.52
  },
  {
    id: 'NF-002',
    obraId: 'OBR001',
    numero: '217946',
    fornecedor: 'Gerdau Aços Longos S.A.',
    cnpjFornecedor: '07.358.761/0001-69',
    dataEmissao: '2026-01-17',
    dataEntrada: '2026-01-17',
    valorTotal: 35302.78,
    status: 'conferida',
    prePedidoRef: 'PP-003',
    tipo: 'material',
    observacao: 'Perfis W200 (A572-GR.50) - entrega parcial OV',
    conferencia: {
      previsto: 53371.55,
      realizado: 35302.78,
      diferenca: -18068.77,
      percentual: -33.86,
      motivo: 'Entrega parcial - perfis W200 (restante em próximas NFs)'
    },
    itens: [
      { descricao: 'PF I W200X19,3 A572GR50 12M', quantidade: 3705.6, unidade: 'KG', material: 'A572-GR.50', categoria: 'perfis_w' },
      { descricao: 'PF H W200X35,9 A572GR50 12M', quantidade: 860.0, unidade: 'KG', material: 'A572-GR.50', categoria: 'perfis_w' }
    ],
    pesoTotalKg: 4565.6
  },
  {
    id: 'NF-003',
    obraId: 'OBR001',
    numero: '228',
    fornecedor: 'Tolumax Ind. Com. Ltda',
    cnpjFornecedor: null,
    dataEmissao: '2026-01-19',
    dataEntrada: '2026-01-19',
    valorTotal: 7202.00,
    status: 'conferida',
    prePedidoRef: null,
    tipo: 'consumivel',
    observacao: 'Consumíveis de solda e pintura - fornecedor avulso (sem pré-pedido)',
    conferencia: {
      previsto: 0,
      realizado: 7202.00,
      diferenca: 7202.00,
      percentual: 100,
      motivo: 'Compra avulsa - sem pré-pedido vinculado'
    },
    itens: [
      { descricao: 'Eletrodo E7018 3,25mm', quantidade: 200, unidade: 'KG', material: 'Consumível', categoria: 'consumiveis' },
      { descricao: 'Arame MIG ER70S-6 1,2mm', quantidade: 150, unidade: 'KG', material: 'Consumível', categoria: 'consumiveis' },
      { descricao: 'Disco de Corte 12"', quantidade: 100, unidade: 'UN', material: 'Consumível', categoria: 'consumiveis' },
      { descricao: 'Disco de Desbaste 7"', quantidade: 80, unidade: 'UN', material: 'Consumível', categoria: 'consumiveis' }
    ],
    pesoTotalKg: 350
  },
  {
    id: 'NF-004',
    obraId: 'OBR001',
    numero: '218134',
    fornecedor: 'Gerdau Aços Longos S.A.',
    cnpjFornecedor: '07.358.761/0001-69',
    dataEmissao: '2026-01-23',
    dataEntrada: '2026-01-23',
    valorTotal: 87407.98,
    status: 'conferida',
    prePedidoRef: 'PP-003',
    tipo: 'material',
    observacao: 'Perfis W250/W310/W410X38,8 (A572-GR.50)',
    conferencia: {
      previsto: null,
      realizado: 87407.98,
      diferenca: null,
      percentual: null,
      motivo: 'Entrega parcial OV - perfis médios'
    },
    itens: [
      { descricao: 'PF I W250X25,3 A572GR50 12M', quantidade: 3643.2, unidade: 'KG', material: 'A572-GR.50', categoria: 'perfis_w' },
      { descricao: 'PF I W310X38,7 A572GR50 12M', quantidade: 2786.4, unidade: 'KG', material: 'A572-GR.50', categoria: 'perfis_w' },
      { descricao: 'PF I W410X38,8 A572GR50 12M', quantidade: 4857.0, unidade: 'KG', material: 'A572-GR.50', categoria: 'perfis_w' }
    ],
    pesoTotalKg: 11286.6
  },
  {
    id: 'NF-005',
    obraId: 'OBR001',
    numero: '70742',
    fornecedor: 'Gerdau Aços Longos S.A.',
    cnpjFornecedor: '07.358.761/0001-69',
    dataEmissao: '2026-01-23',
    dataEntrada: '2026-01-23',
    valorTotal: 60922.01,
    status: 'conferida',
    prePedidoRef: 'PP-002',
    tipo: 'material',
    observacao: 'Chapas A36 - Lote 2 (espessuras 4,75mm a 22,4mm)',
    conferencia: {
      previsto: 63102.96,
      realizado: 60922.01,
      diferenca: -2180.95,
      percentual: -3.46,
      motivo: 'Quantidade entregue menor que cotação (ajuste peso real)'
    },
    itens: [
      { descricao: 'CHAPA LQ A36 4,75X1200X3000', quantidade: 685.0, unidade: 'KG', material: 'A36', categoria: 'chapas' },
      { descricao: 'CHAPA LQ A36 6,3X1200X6000', quantidade: 1815.0, unidade: 'KG', material: 'A36', categoria: 'chapas' },
      { descricao: 'CHAPA LQ A36 8X1500X6000', quantidade: 1728.0, unidade: 'KG', material: 'A36', categoria: 'chapas' },
      { descricao: 'CHAPA LQ A36 8X1000X2000', quantidade: 128.0, unidade: 'KG', material: 'A36', categoria: 'chapas' },
      { descricao: 'CHAPA LQ A36 9,5X1200X6000', quantidade: 1094.0, unidade: 'KG', material: 'A36', categoria: 'chapas' },
      { descricao: 'CHAPA LQ A36 16X1200X3000', quantidade: 1356.6, unidade: 'KG', material: 'A36', categoria: 'chapas' },
      { descricao: 'CHAPA LCG A36 22,4X2550X3000', quantidade: 2742.0, unidade: 'KG', material: 'A36', categoria: 'chapas' }
    ],
    pesoTotalKg: 9548.6
  },
  {
    id: 'NF-006',
    obraId: 'OBR001',
    numero: '218191',
    fornecedor: 'Gerdau Aços Longos S.A.',
    cnpjFornecedor: '07.358.761/0001-69',
    dataEmissao: '2026-01-23',
    dataEntrada: '2026-01-23',
    valorTotal: 212116.32,
    status: 'conferida',
    prePedidoRef: 'PP-003',
    tipo: 'material',
    observacao: 'Perfis W410X53/W530X66/HP310X79 (A572-GR.50) - lote principal',
    conferencia: {
      previsto: null,
      realizado: 212116.32,
      diferenca: null,
      percentual: null,
      motivo: 'Entrega parcial OV - perfis pesados (maior lote)'
    },
    itens: [
      { descricao: 'PF I W410X38,8 A572GR50 12M', quantidade: 7714.2, unidade: 'KG', material: 'A572-GR.50', categoria: 'perfis_w' },
      { descricao: 'PF I W410X53 A572GR50 12M', quantidade: 12720.0, unidade: 'KG', material: 'A572-GR.50', categoria: 'perfis_w' },
      { descricao: 'PF I W410X53 A572GR50 6M', quantidade: 5724.0, unidade: 'KG', material: 'A572-GR.50', categoria: 'perfis_w' }
    ],
    pesoTotalKg: 26158.2
  },
  {
    id: 'NF-007',
    obraId: 'OBR001',
    numero: '218103',
    fornecedor: 'Gerdau Aços Longos S.A.',
    cnpjFornecedor: '07.358.761/0001-69',
    dataEmissao: '2026-01-23',
    dataEntrada: '2026-01-23',
    valorTotal: 11329.87,
    status: 'conferida',
    prePedidoRef: 'PP-003',
    tipo: 'material',
    observacao: 'Perfis W150/W530 e Barras redondas (A36/A572)',
    conferencia: {
      previsto: null,
      realizado: 11329.87,
      diferenca: null,
      percentual: null,
      motivo: 'Entrega parcial OV - perfis leves e barras'
    },
    itens: [
      { descricao: 'PF I W530X66 A572GR50 12M', quantidade: 792.0, unidade: 'KG', material: 'A572-GR.50', categoria: 'perfis_w' },
      { descricao: 'PF H W150X22,5 A572GR50 6M', quantidade: 675.0, unidade: 'KG', material: 'A572-GR.50', categoria: 'perfis_w' },
      { descricao: 'PF I W150X13 A572GR50 12M', quantidade: 468.0, unidade: 'KG', material: 'A572-GR.50', categoria: 'perfis_w' }
    ],
    pesoTotalKg: 1935.0
  },
  {
    id: 'NF-008',
    obraId: 'OBR001',
    numero: '218267',
    fornecedor: 'Gerdau Aços Longos S.A.',
    cnpjFornecedor: '07.358.761/0001-69',
    dataEmissao: '2026-01-28',
    dataEntrada: '2026-01-28',
    valorTotal: 28924.92,
    status: 'conferida',
    prePedidoRef: 'PP-003',
    tipo: 'material',
    observacao: 'Barras redondas e Cantoneiras (A36)',
    conferencia: {
      previsto: null,
      realizado: 28924.92,
      diferenca: null,
      percentual: null,
      motivo: 'Entrega parcial OV - barras e cantoneiras'
    },
    itens: [
      { descricao: 'BARRED 1" A36 6M', quantidade: 429.66, unidade: 'KG', material: 'A36', categoria: 'barras' },
      { descricao: 'BARRED 1/2" GG A36 6M', quantidade: 606.53, unidade: 'KG', material: 'A36', categoria: 'barras' },
      { descricao: 'BARRED 5/8" A36 6M', quantidade: 1183.64, unidade: 'KG', material: 'A36', categoria: 'barras' },
      { descricao: 'CANT 1.1/2"X1/8" A36 6M', quantidade: 131.76, unidade: 'KG', material: 'A36', categoria: 'cantoneiras' },
      { descricao: 'CANT 2"X1/4" A36 12M', quantidade: 2730.24, unidade: 'KG', material: 'A36', categoria: 'cantoneiras' },
      { descricao: 'CANT 3"X3/8" A36 6M', quantidade: 64.26, unidade: 'KG', material: 'A36', categoria: 'cantoneiras' }
    ],
    pesoTotalKg: 5146.09
  }
];

// ========================================
// MOVIMENTAÇÕES DE ESTOQUE (ENTRADAS)
// ========================================
// Geradas automaticamente a partir das NFs de materiais

export const movimentacoesEstoque = [
  // NF-001: Chapas A36 Lote 1
  { id: 'MOV-001', obraId: 'OBR001', nfRef: 'NF-001', data: '2026-01-08', tipo: 'entrada', estoqueId: 'EST-002', material: 'A36', quantidade: 4656.52, unidade: 'KG', responsavel: 'FUNC-022', observacao: 'NF 70467 - Chapas A36 (2mm a 16mm)' },
  // NF-002: Perfis A572 W200
  { id: 'MOV-002', obraId: 'OBR001', nfRef: 'NF-002', data: '2026-01-17', tipo: 'entrada', estoqueId: 'EST-001', material: 'A572-GR.50', quantidade: 4565.6, unidade: 'KG', responsavel: 'FUNC-022', observacao: 'NF 217946 - Perfis W200 A572' },
  // NF-003: Consumíveis TOLUMAX
  { id: 'MOV-003a', obraId: 'OBR001', nfRef: 'NF-003', data: '2026-01-19', tipo: 'entrada', estoqueId: 'EST-006', material: 'Eletrodo E7018', quantidade: 200, unidade: 'KG', responsavel: 'FUNC-022', observacao: 'NF 228 Tolumax - Eletrodos' },
  { id: 'MOV-003b', obraId: 'OBR001', nfRef: 'NF-003', data: '2026-01-19', tipo: 'entrada', estoqueId: 'EST-007', material: 'Arame MIG', quantidade: 150, unidade: 'KG', responsavel: 'FUNC-022', observacao: 'NF 228 Tolumax - Arame MIG' },
  { id: 'MOV-003c', obraId: 'OBR001', nfRef: 'NF-003', data: '2026-01-19', tipo: 'entrada', estoqueId: 'EST-008', material: 'Disco Corte', quantidade: 100, unidade: 'UN', responsavel: 'FUNC-022', observacao: 'NF 228 Tolumax - Discos Corte' },
  { id: 'MOV-003d', obraId: 'OBR001', nfRef: 'NF-003', data: '2026-01-19', tipo: 'entrada', estoqueId: 'EST-009', material: 'Disco Desbaste', quantidade: 80, unidade: 'UN', responsavel: 'FUNC-022', observacao: 'NF 228 Tolumax - Discos Desbaste' },
  // NF-004: Perfis A572 W250/W310/W410
  { id: 'MOV-004', obraId: 'OBR001', nfRef: 'NF-004', data: '2026-01-23', tipo: 'entrada', estoqueId: 'EST-001', material: 'A572-GR.50', quantidade: 11286.6, unidade: 'KG', responsavel: 'FUNC-022', observacao: 'NF 218134 - Perfis W250/W310/W410' },
  // NF-005: Chapas A36 Lote 2
  { id: 'MOV-005', obraId: 'OBR001', nfRef: 'NF-005', data: '2026-01-23', tipo: 'entrada', estoqueId: 'EST-002', material: 'A36', quantidade: 9548.6, unidade: 'KG', responsavel: 'FUNC-022', observacao: 'NF 70742 - Chapas A36 Lote 2' },
  // NF-006: Perfis pesados A572
  { id: 'MOV-006', obraId: 'OBR001', nfRef: 'NF-006', data: '2026-01-23', tipo: 'entrada', estoqueId: 'EST-001', material: 'A572-GR.50', quantidade: 26158.2, unidade: 'KG', responsavel: 'FUNC-022', observacao: 'NF 218191 - Perfis W410/W530/HP310' },
  // NF-007: Perfis leves A572
  { id: 'MOV-007', obraId: 'OBR001', nfRef: 'NF-007', data: '2026-01-23', tipo: 'entrada', estoqueId: 'EST-001', material: 'A572-GR.50', quantidade: 1935.0, unidade: 'KG', responsavel: 'FUNC-022', observacao: 'NF 218103 - Perfis W150/W530' },
  // NF-008: Barras e Cantoneiras A36
  { id: 'MOV-008', obraId: 'OBR001', nfRef: 'NF-008', data: '2026-01-28', tipo: 'entrada', estoqueId: 'EST-002', material: 'A36', quantidade: 5146.09, unidade: 'KG', responsavel: 'FUNC-022', observacao: 'NF 218267 - Barras e Cantoneiras A36' }
];

// ========================================
// CONFERÊNCIA PEDIDO vs NF vs ESTOQUE
// ========================================
export const conferenciaMateriais = {
  obraId: 'OBR001',
  dataConferencia: '2026-01-28',
  resumo: {
    totalNFs: 8,
    totalValorNFs: 472888.86,
    totalPesoNFs: 63646.61,
    totalPrevistoPrePedidos: 574251.35,
    totalRealizadoNFs: 472888.86,
    saldoPendente: 101362.49,
    percentualEntregue: 82.35
  },
  porPrePedido: [
    {
      prePedido: 'PP-001',
      documento: 'CT--W09236613',
      tipo: 'Chapas A36 Lote 1',
      previsto: 29562.96,
      pesoPrevisto: 4656.52,
      nfsVinculadas: ['NF-001'],
      realizado: 29682.98,
      pesoEntregue: 4656.52,
      status: 'entregue_completo',
      diferencaValor: 120.02,
      diferencaPeso: 0
    },
    {
      prePedido: 'PP-002',
      documento: 'CT--W09271197',
      tipo: 'Chapas A36 Lote 2',
      previsto: 63102.96,
      pesoPrevisto: 10268.6,
      nfsVinculadas: ['NF-005'],
      realizado: 60922.01,
      pesoEntregue: 9548.6,
      status: 'entregue_parcial',
      diferencaValor: -2180.95,
      diferencaPeso: -720.0
    },
    {
      prePedido: 'PP-003',
      documento: 'OV--W09264680',
      tipo: 'Perfis/Barras/Cantoneiras',
      previsto: 481585.43,
      pesoPrevisto: 62448.49,
      nfsVinculadas: ['NF-002', 'NF-004', 'NF-006', 'NF-007', 'NF-008'],
      realizado: 375081.87,
      pesoEntregue: 49091.49,
      status: 'entregue_parcial',
      diferencaValor: -106503.56,
      diferencaPeso: -13357.0
    }
  ],
  comprasAvulsas: [
    {
      nf: 'NF-003',
      fornecedor: 'Tolumax',
      tipo: 'Consumíveis',
      valor: 7202.00,
      status: 'entregue_completo'
    }
  ],
  estoqueAtualizado: {
    'EST-001': { material: 'A572-GR.50', entradaTotal: 43945.4, saldoAtual: 43945.4 },
    'EST-002': { material: 'A36', entradaTotal: 19351.21, saldoAtual: 19351.21 },
    'EST-006': { material: 'Eletrodo E7018', entradaTotal: 200, saldoAtual: 200 },
    'EST-007': { material: 'Arame MIG', entradaTotal: 150, saldoAtual: 150 },
    'EST-008': { material: 'Disco Corte', entradaTotal: 100, saldoAtual: 100 },
    'EST-009': { material: 'Disco Desbaste', entradaTotal: 80, saldoAtual: 80 }
  }
};

// ========================================
// DADOS MOCK - CONFIGURAÇÕES DE MEDIÇÃO
// ========================================

export const configMedicao = {
  producao: {
    corte: { valorKg: 1.20, descricao: 'Corte de peças' },
    fabricacao: { valorKg: 2.50, descricao: 'Fabricação e montagem' },
    solda: { valorKg: 3.00, descricao: 'Soldagem' },
    pintura: { valorKg: 1.80, descricao: 'Jateamento e pintura' }
  },
  montagem: {
    montagem: { valorKg: 4.50, descricao: 'Montagem em campo' }
  }
};

// ========================================
// DADOS MOCK - MÁQUINAS
// ========================================

export const maquinas = [
  { id: 'MAQ001', nome: 'CNC Plasma Hypertherm', tipo: 'cnc_plasma', setor: 'corte', status: 'disponivel', obraAtual: null, operador: null },
  { id: 'MAQ002', nome: 'Serra Fita Kasto', tipo: 'serra_fita', setor: 'corte', status: 'disponivel', obraAtual: null, operador: null },
  { id: 'MAQ003', nome: 'Guilhotina Newton', tipo: 'guilhotina', setor: 'corte', status: 'manutencao', obraAtual: null, operador: null },
  { id: 'MAQ004', nome: 'Oxicorte CNC', tipo: 'oxicorte', setor: 'corte', status: 'disponivel', obraAtual: null, operador: null },
  { id: 'MAQ005', nome: 'Policorte', tipo: 'policorte', setor: 'corte', status: 'disponivel', obraAtual: null, operador: null }
];

// ========================================
// FUNÇÕES UTILITÁRIAS
// ========================================

export const getObraById = (id) => obras.find(o => o.id === id);
export const getClienteById = (id) => clientes.find(c => c.id === id);
export const getOrcamentoById = (id) => orcamentos.find(o => o.id === id);
export const getFuncionarioById = (id) => funcionarios.find(f => f.id === id);
export const getEquipeById = (id) => equipes.find(e => e.id === id);
export const getPecasByObra = (obraId) => pecasProducao.filter(p => p.obraId === obraId);
export const getExpedicoesByObra = (obraId) => expedicoes.filter(e => e.obraId === obraId);
export const getEstoqueByObra = (obraId) => estoque.filter(e => e.obraReservada === obraId);
export const getComprasByObra = (obraId) => compras.filter(c => c.obraId === obraId);
export const getNFsByObra = (obraId) => notasFiscais.filter(nf => nf.obraId === obraId);
export const getMovimentacoesByObra = (obraId) => movimentacoesEstoque.filter(m => m.obraId === obraId);
export const getListasByObra = (obraId) => listasMaterial.filter(l => l.obraId === obraId);
export const getMedicoesByObra = (obraId) => medicoes.filter(m => m.obraId === obraId);

export const getObraCompleta = (id) => {
  const obra = getObraById(id);
  if (!obra) return null;

  return {
    ...obra,
    cliente: getClienteById(obra.clienteId),
    orcamento: getOrcamentoById(obra.orcamentoId),
    listas: getListasByObra(id),
    pecas: getPecasByObra(id),
    expedicoes: getExpedicoesByObra(id),
    estoqueReservado: getEstoqueByObra(id),
    compras: getComprasByObra(id),
    medicoes: getMedicoesByObra(id),
    equipes: obra.equipeProducao.concat(obra.equipeMontagem).map(getEquipeById).filter(Boolean)
  };
};

// Estatísticas globais
export const getEstatisticasGerais = () => {
  const obrasAtivas = obras.filter(o => ![STATUS_OBRA.CONCLUIDA, STATUS_OBRA.CANCELADA, STATUS_OBRA.ORCAMENTO].includes(o.status));
  const pesoTotal = obrasAtivas.reduce((acc, o) => acc + o.pesoTotal, 0);
  const valorTotal = obrasAtivas.reduce((acc, o) => acc + o.valorContrato, 0);

  return {
    totalObras: obras.length,
    obrasAtivas: obrasAtivas.length,
    pesoTotalKg: pesoTotal,
    valorTotalContratos: valorTotal,
    funcionariosAtivos: funcionarios.filter(f => f.ativo).length,
    equipesAtivas: equipes.filter(e => e.obraAtual).length,
    itensEstoque: estoque.length,
    alertasEstoque: estoque.filter(e => e.quantidade <= e.minimo).length
  };
};

export default {
  // Constantes
  STATUS_ORCAMENTO,
  STATUS_OBRA,
  ETAPAS_PRODUCAO,
  STATUS_CORTE,
  STATUS_EXPEDICAO,
  TIPOS_PECA,
  CATEGORIAS_MATERIAL,
  MAQUINAS_CORTE,

  // Dados
  clientes,
  obras,
  orcamentos,
  listasMaterial,
  estoque,
  pecasProducao,
  expedicoes,
  funcionarios,
  equipes,
  medicoes,
  compras,
  notasFiscais,
  movimentacoesEstoque,
  conferenciaMateriais,
  configMedicao,
  maquinas,

  // Funções
  getObraById,
  getClienteById,
  getOrcamentoById,
  getFuncionarioById,
  getEquipeById,
  getPecasByObra,
  getExpedicoesByObra,
  getEstoqueByObra,
  getComprasByObra,
  getListasByObra,
  getMedicoesByObra,
  getObraCompleta,
  getEstatisticasGerais
};
