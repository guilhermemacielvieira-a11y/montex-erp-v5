// ============================================================
// CATEGORIZAÇÃO INTELIGENTE — Fase 3 do plano Despesas
// ============================================================
// Pipeline ordenado de categorização. Cada estágio é um "sinal" cuja
// confiança decresce. Para um caso (descrição, fornecedor, NF, NCM, CFOP),
// retornamos a primeira categoria não-vazia + a origem.
//
// PIPELINE (mais forte → mais fraco):
//   1. manual           — usuário corrigiu manualmente (vence tudo).
//                         Este estágio fica FORA deste helper: é resolvido
//                         no caller (categoria_manual=true no Supabase
//                         ou override local). Aqui só categorizamos quando
//                         a despesa NÃO tem categoria manual.
//   2. mapping CNPJ/NF  — aprendido por edição anterior do usuário.
//   3. CFOP             — código fiscal extraído de NFe (sinal estrutural).
//   4. NCM              — código de produto extraído de NFe.
//   5. keyword          — heurística de descrição (legado, fallback).
//   6. fallback         — 'Outros'.
//
// USO TÍPICO:
//   const { categoria, origem, confianca } = categorizarSmart({
//     descricao: 'POSTO REDE MAIS',
//     fornecedor: 'POSTO REDE MAIS LTDA',
//     nf: '12345',
//     ncm: '27101259',
//     cfop: '1556',
//   });
//   // → { categoria: 'Transporte', origem: 'cfop', confianca: 'alta' }
//
// ============================================================

import { lookupCategoriaPorFornecedor } from './despesasOverrides';

// ============================================================
// TABELA CFOP (Código Fiscal de Operações e Prestações)
// ============================================================
// Foco em CFOPs comuns em DESPESAS (entradas: 1xxx interno, 2xxx interest.,
// 3xxx do exterior). Fonte: Tabela CFOP 2025 SEFAZ. Lista enxuta para
// começar — extensível.
const CFOP_PARA_CATEGORIA = {
  // Compra para industrialização / matéria prima
  '1101': 'Matéria Prima', '2101': 'Matéria Prima', '3101': 'Matéria Prima',
  '1102': 'Matéria Prima', '2102': 'Matéria Prima',
  '1111': 'Matéria Prima', '2111': 'Matéria Prima',
  '1116': 'Matéria Prima', '2116': 'Matéria Prima',
  '1118': 'Matéria Prima', '2118': 'Matéria Prima',
  '1120': 'Matéria Prima', '2120': 'Matéria Prima',
  '1121': 'Matéria Prima', '2121': 'Matéria Prima',
  '1122': 'Matéria Prima', '2122': 'Matéria Prima',
  '1124': 'Matéria Prima', '2124': 'Matéria Prima',
  // Compra de bens p/ ativo imobilizado → Manutenção (ou Investimento)
  '1551': 'Manutenção', '2551': 'Manutenção', '3551': 'Manutenção',
  '1552': 'Manutenção', '2552': 'Manutenção',
  '1553': 'Manutenção', '2553': 'Manutenção', '3553': 'Manutenção',
  '1554': 'Manutenção', '2554': 'Manutenção',
  '1555': 'Manutenção', '2555': 'Manutenção',
  // Combustíveis / lubrificantes → Transporte
  '1556': 'Transporte', '2556': 'Transporte',
  '1652': 'Transporte', '2652': 'Transporte',
  '1653': 'Transporte', '2653': 'Transporte',
  '1655': 'Transporte', '2655': 'Transporte',
  '1656': 'Transporte', '2656': 'Transporte',
  // Material de uso/consumo interno → Administrativo
  '1407': 'Administrativo', '2407': 'Administrativo',
  '1557': 'Administrativo', '2557': 'Administrativo',
  // Serviço de transporte tomado (1351-1352) → Transporte
  '1351': 'Transporte', '2351': 'Transporte',
  '1352': 'Transporte', '2352': 'Administrativo',
  // Serviços tomados genéricos (1353-1356) → Administrativo
  '1353': 'Administrativo', '2353': 'Administrativo',
  '1354': 'Administrativo', '2354': 'Administrativo',
  '1355': 'Administrativo', '2355': 'Administrativo',
  '1356': 'Administrativo', '2356': 'Administrativo',
  '1932': 'Transporte', '2932': 'Transporte',
  '1933': 'Administrativo', '2933': 'Administrativo', // serviço tomado genérico
  // Energia elétrica
  '1253': 'Energia/Utilidades', '2253': 'Energia/Utilidades',
};

// ============================================================
// TABELA NCM (Nomenclatura Comum do Mercosul)
// ============================================================
// Match por PREFIXO (2 ou 4 dígitos do início do NCM completo).
// Fonte: tabela TIPI/NCM consolidada. Foco em capítulos relevantes.
const NCM_PREFIXO_PARA_CATEGORIA = [
  // Capítulo 27: Combustíveis minerais, óleos minerais
  { prefixo: '27', categoria: 'Transporte' },
  // Capítulo 73: Obras de ferro fundido, ferro ou aço
  { prefixo: '73', categoria: 'Matéria Prima' },
  // Capítulo 72: Ferro fundido, ferro e aço (matéria prima bruta)
  { prefixo: '72', categoria: 'Matéria Prima' },
  // Capítulo 76: Alumínio e suas obras
  { prefixo: '76', categoria: 'Alumínio' },
  // Capítulo 84: Reatores nucleares, caldeiras, máquinas
  { prefixo: '84', categoria: 'Manutenção' },
  // Capítulo 85: Máquinas, aparelhos e materiais elétricos
  { prefixo: '85', categoria: 'Manutenção' },
  // Capítulo 39: Plásticos (EPI plástico, ferramentas)
  { prefixo: '3923', categoria: 'Manutenção' }, // embalagens
  // Capítulo 49: Material impresso (papelaria, livros)
  { prefixo: '49', categoria: 'Administrativo' },
  // Capítulo 48: Papel e cartão (escritório)
  { prefixo: '48', categoria: 'Administrativo' },
  // Capítulo 96: Diversos (canetas, vassouras, etc — Administrativo)
  { prefixo: '96', categoria: 'Administrativo' },
  // Capítulo 64: Calçados (EPI calçado)
  { prefixo: '64', categoria: 'Manutenção' },
  // Capítulo 61/62: Vestuário (uniformes / EPI)
  { prefixo: '61', categoria: 'Manutenção' },
  { prefixo: '62', categoria: 'Manutenção' },
  // Capítulo 90: Instrumentos / aparelhos de medição
  { prefixo: '90', categoria: 'Manutenção' },
];

// ============================================================
// KEYWORD FALLBACK (mantido por compat — legado da Fase 0)
// ============================================================
function categorizarPorKeyword(descricao) {
  const d = (descricao || '').toUpperCase();
  if (d.includes('FOLHA') || d.includes('DIARIA') || d.includes('HORA EXTRA') || d.includes('FÉRIAS') || d.includes('FGTS') || d.includes('ACERTO')) return 'Mão de Obra';
  if (d.includes('CEMIG') || d.includes('COPASA') || d.includes('ENERGIA') || d.includes('LUZ') || d.includes('AGUA')) return 'Energia/Utilidades';
  if (d.includes('ALUGUEL')) return 'Administrativo';
  if (d.includes('COMBUSTIVEL') || d.includes('POSTO') || d.includes('ABASTEC') || d.includes('PASSAGEM') || d.includes('TRANSPORTE') || d.includes('CARRO')) return 'Transporte';
  if (d.includes('MANUTENC') || d.includes('EQUIPAMENTO') || d.includes('EPI') || d.includes('FERRAMENTA')) return 'Manutenção';
  if (d.includes('SUPERMERCADO') || d.includes('ALIMENTA') || d.includes('ALMOCO') || d.includes('PADARIA') || d.includes('CAFÉ')) return 'Matéria Prima';
  if (d.includes('IMPOSTO') || d.includes('INSS') || d.includes('DAS') || d.includes('SIMPLES')) return 'Impostos';
  if (d.includes('CONTABILIDADE') || d.includes('INTERNET') || d.includes('TELEFONE') || d.includes('PLANO SAUDE') || d.includes('UNIMED')) return 'Administrativo';
  return null;
}

// ============================================================
// MATCHERS (uma função por estágio)
// ============================================================

export function categorizarPorCFOP(cfop) {
  if (!cfop) return null;
  const limpo = String(cfop).replace(/\D/g, '').padStart(4, '0');
  return CFOP_PARA_CATEGORIA[limpo] || null;
}

export function categorizarPorNCM(ncm) {
  if (!ncm) return null;
  const limpo = String(ncm).replace(/\D/g, '');
  if (!limpo) return null;
  // tenta prefixos do maior pro menor para precisão
  // (uma regra com prefixo "3923" deve vencer outra com "39")
  const ordenados = [...NCM_PREFIXO_PARA_CATEGORIA].sort(
    (a, b) => b.prefixo.length - a.prefixo.length
  );
  for (const { prefixo, categoria } of ordenados) {
    if (limpo.startsWith(prefixo)) return categoria;
  }
  return null;
}

// ============================================================
// PIPELINE PRINCIPAL
// ============================================================
// Retorna { categoria, origem, confianca } onde:
//   origem ∈ 'mapping' | 'cfop' | 'ncm' | 'keyword' | 'fallback'
//   confianca ∈ 'alta' | 'media' | 'baixa'
export function categorizarSmart({ descricao, fornecedor, nf, ncm, cfop } = {}) {
  // 1. Mapping aprendido (correções anteriores do usuário) — alta confiança
  const aprendida = lookupCategoriaPorFornecedor(fornecedor, nf);
  if (aprendida) return { categoria: aprendida, origem: 'mapping', confianca: 'alta' };

  // 2. CFOP — alta confiança (código fiscal estruturado da NFe)
  const porCfop = categorizarPorCFOP(cfop);
  if (porCfop) return { categoria: porCfop, origem: 'cfop', confianca: 'alta' };

  // 3. NCM — média confiança (categoria do produto)
  const porNcm = categorizarPorNCM(ncm);
  if (porNcm) return { categoria: porNcm, origem: 'ncm', confianca: 'media' };

  // 4. Keyword — baixa confiança (heurística textual)
  const porKw = categorizarPorKeyword(descricao);
  if (porKw) return { categoria: porKw, origem: 'keyword', confianca: 'baixa' };

  // 5. Fallback
  return { categoria: 'Outros', origem: 'fallback', confianca: 'baixa' };
}

// ============================================================
// COMPATIBILIDADE — drop-in para o categorizarDespesa antigo
// ============================================================
// Versão simples que retorna só a categoria (string), mantendo a assinatura
// usada hoje em DespesasPage e ImportarNFModal.
export function categorizarDespesaSmart(descricao, fornecedor, nf, ncm, cfop) {
  return categorizarSmart({ descricao, fornecedor, nf, ncm, cfop }).categoria;
}

// ============================================================
// CATÁLOGO DE CATEGORIAS PADRÃO + METADADOS PARA UI
// ============================================================
// Catálogo único de referência. Quando a Fase 3b (tabela `categorias`
// dinâmica no Supabase) ficar pronta, este array vira fallback inicial.
export const CATEGORIAS_PADRAO = [
  { id: 'materia_prima', nome: 'Matéria Prima',    cor: '#3B82F6', icone: 'Package' },
  { id: 'mao_de_obra',   nome: 'Mão de Obra',      cor: '#60A5FA', icone: 'Users' },
  { id: 'energia',       nome: 'Energia/Utilidades', cor: '#F59E0B', icone: 'Zap' },
  { id: 'manutencao',    nome: 'Manutenção',       cor: '#10B981', icone: 'Wrench' },
  { id: 'transporte',    nome: 'Transporte',       cor: '#EC4899', icone: 'Truck' },
  { id: 'administrativo',nome: 'Administrativo',   cor: '#06B6D4', icone: 'Briefcase' },
  { id: 'impostos',      nome: 'Impostos',         cor: '#EF4444', icone: 'FileText' },
  { id: 'aluminio',      nome: 'Alumínio',         cor: '#D97706', icone: 'Square' },
  { id: 'outros',        nome: 'Outros',           cor: '#94A3B8', icone: 'HelpCircle' },
];
