/**
 * MONTEX ERP - Enums e constantes de domínio (leves).
 *
 * Extraídos de data/database.js (que também contém ~350 KB de dados mock):
 * módulos carregados no boot (reducers, SeletorObra) importavam só estas
 * constantes, mas arrastavam o arquivo de mock inteiro para o bundle inicial.
 * database.js re-exporta tudo daqui — imports existentes continuam válidos.
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
  EXPEDIDO: 'expedido',
  ENVIADO: 'enviado',
  ENTREGUE: 'entregue'
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
  AGUARDANDO_TRANSPORTE: 'aguardando_transporte',
  EM_TRANSITO: 'em_transito',
  ENTREGUE: 'entregue'
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
