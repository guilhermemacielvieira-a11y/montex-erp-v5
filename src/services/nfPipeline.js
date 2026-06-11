/**
 * MONTEX ERP — Pipeline automático de Notas Fiscais (Suprimentos)
 *
 * A partir de uma NF já registrada (notas_fiscais), de forma IDEMPOTENTE:
 *  1. Identifica categoria + centro de custo (mapping aprendido do fornecedor
 *     → heurísticas NCM/CFOP/palavras-chave do ImportarNFModal)
 *  2. Gera o lançamento de despesa vinculado (lancamentos_despesas,
 *     nota_fiscal = nº da NF) — abastece o financeiro automaticamente
 *  3. Extrai os itens da NF para o controle de materiais (pedidos_material)
 *     — abastece a aba Materiais com peso/quantidade já ENTREGUE
 *  4. Constrói histórico de preços por material e por fornecedor a partir
 *     das NFs — usado para ALERTAS em pedidos/cotações futuras
 *
 * Convenções: obra_id NULL = MONTEX (empresa). Itens de NF podem vir em dois
 * shapes: XML NFe ({qtd, valorUnit}) ou legado ({quantidade, precoUnitario}).
 */

// ============================================================
// CLASSIFICADORES (fonte única — ImportarNFModal importa daqui)
// ============================================================
export const CATEGORIAS_DISPONIVEIS = [
  'Matéria Prima', 'Mão de Obra', 'Energia/Utilidades',
  'Manutenção', 'Transporte', 'Administrativo', 'Impostos', 'Outros',
];

export function classificarCategoria(itens, naturezaOp) {
  if (!itens || itens.length === 0) return 'Outros';
  const descricoes = itens.map(i => (i.descricao || '').toLowerCase()).join(' ');
  const ncms = itens.map(i => (i.ncm || '').substring(0, 4));
  const cfops = itens.map(i => String(i.cfop || ''));
  const natOpLower = (naturezaOp || '').toLowerCase();

  if (descricoes.match(/frete|transporte|logistic|carreto|mudança/) ||
      natOpLower.includes('frete') || natOpLower.includes('transporte') ||
      cfops.some(c => ['1352', '2352', '1353', '2353'].includes(c))) return 'Transporte';

  if (descricoes.match(/servico|serviço|mao de obra|mão de obra|consultoria|locação|aluguel/) ||
      natOpLower.includes('serviço') || natOpLower.includes('servico') || natOpLower.includes('prestação') ||
      cfops.some(c => ['1126', '2126', '1128', '2128', '1933', '2933'].includes(c))) return 'Mão de Obra';

  if (descricoes.match(/energia|eletric|gas|agua|água|combustivel|combustível|diesel|gasolina|etanol/) ||
      ncms.some(n => ['2710', '2711', '2716'].includes(n))) return 'Energia/Utilidades';

  if (descricoes.match(/manutenção|manutencao|peça|peca|rolamento|correia|filtro|lubrific|oleo|óleo|ferramenta|epi/) ||
      ncms.some(n => ['8482', '8483', '8484', '4016', '8481'].includes(n))) return 'Manutenção';

  if (descricoes.match(/chapa|perfil|viga|tubo|aço|aco|ferro|metalon|barra|cantoneira|tinta|primer|epoxi|epóxi|solda|eletrodo|arame|abrasivo|disco|lixa/) ||
      ncms.some(n => ['7208', '7209', '7210', '7214', '7216', '7306', '7307', '3208', '3209', '8311', '7217', '6804', '6805'].includes(n)) ||
      cfops.some(c => ['1101', '2101', '1151', '2151'].includes(c))) return 'Matéria Prima';

  if (descricoes.match(/escritorio|escritório|papel|impressora|toner|cartucho|inform|computador|notebook|monitor|telefone/) ||
      ncms.some(n => ['4802', '8471', '8443', '8528'].includes(n))) return 'Administrativo';

  if (cfops.some(c => c.startsWith('1') || c.startsWith('2'))) return 'Matéria Prima';
  return 'Outros';
}

export function classificarCentroCusto(categoria, naturezaOp) {
  const natLower = (naturezaOp || '').toLowerCase();
  if (natLower.includes('venda') || natLower.includes('comercial')) return 'Comercial';
  if (natLower.includes('frete') || natLower.includes('transporte')) return 'Logística';
  switch (categoria) {
    case 'Matéria Prima': return 'Produção';
    case 'Mão de Obra': return 'Produção';
    case 'Manutenção': return 'Produção';
    case 'Transporte': return 'Logística';
    case 'Administrativo': return 'Administrativo';
    case 'Energia/Utilidades': return 'Produção';
    case 'Impostos': return 'Administrativo';
    default: return 'Produção';
  }
}

// Mesmo storage do mapping aprendido usado por DespesasPage/MappingAprendidoModal
const MAPPING_KEY = 'montex_nf_fornecedor_mapping';

export function loadMappingAprendido() {
  try {
    return JSON.parse(localStorage.getItem(MAPPING_KEY) || '{}');
  } catch {
    return {};
  }
}

// ---------- helpers de shape (XML NFe × legado) ----------
export const itemQtd = (i) => Number(i.quantidade ?? i.qtd ?? 0) || 0;
export const itemValorUnit = (i) => Number(i.precoUnitario ?? i.valorUnit ?? 0) || 0;
export const itemValorTotal = (i) =>
  Number(i.valorTotal ?? 0) || itemQtd(i) * itemValorUnit(i);
export const itemUnidade = (i) => String(i.unidade || 'UN').toUpperCase();

const UNIDADES_PESO = new Set(['KG', 'KGS', 'QUILO', 'KILO', 'T', 'TON', 'TONELADA']);
const ehUnidadePeso = (un) => UNIDADES_PESO.has(String(un || '').toUpperCase().trim());

export const nfValorTotal = (nf) => {
  const itens = Array.isArray(nf.itens) ? nf.itens : [];
  return Number(nf.valorTotal ?? nf.valor ?? 0) ||
    itens.reduce((a, i) => a + itemValorTotal(i), 0);
};

// ---------- 1. categoria + centro de custo ----------
export function categorizarNF(nf) {
  const mapping = loadMappingAprendido();
  const fornecedorKey = String(nf.fornecedor || '').trim().toUpperCase();

  // 1º: regra aprendida do fornecedor (alimentada pelas edições manuais em Despesas)
  const aprendido = mapping[fornecedorKey];
  if (aprendido?.categoria) {
    return {
      categoria: aprendido.categoria,
      centroCusto: aprendido.centroCusto || classificarCentroCusto(aprendido.categoria, ''),
      origem: 'aprendido',
    };
  }

  // 2º: heurísticas NCM/CFOP/palavras-chave (mesmas do importador de XML)
  const naturezaOp = String(nf.observacoes || '');
  const itens = Array.isArray(nf.itens) ? nf.itens : [];
  const categoria = classificarCategoria(itens, naturezaOp);
  return {
    categoria,
    centroCusto: classificarCentroCusto(categoria, naturezaOp),
    origem: 'automatico',
  };
}

// ---------- 2. vínculos (idempotência) ----------
export function nfTemLancamento(nf, lancamentos) {
  const num = String(nf.numero || '').trim();
  if (!num) return false;
  return (lancamentos || []).some(l =>
    String(l.notaFiscal || l.nota_fiscal || '').trim() === num
  );
}

export function nfTemMateriais(nf, materiais) {
  const num = String(nf.numero || '').trim();
  if (!num) return false;
  return (materiais || []).some(m =>
    String(m.notaFiscal || m.nota_fiscal || '').trim() === num
  );
}

// ---------- 3. NF → lançamento de despesa ----------
export function gerarLancamentoDaNF(nf, { categoria, centroCusto, origem }) {
  return {
    id: `desp-nf-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    tipo: 'despesa',
    descricao: `NF ${nf.numero} - ${nf.fornecedor}`,
    fornecedor: nf.fornecedor || '-',
    notaFiscal: String(nf.numero || ''),
    valor: nfValorTotal(nf),
    dataEmissao: nf.dataEmissao || nf.dataEntrada || new Date().toISOString().split('T')[0],
    status: 'pendente',
    categoria,
    categoriaOrigem: origem === 'aprendido' ? 'mapping' : 'auto',
    // centro de custo persiste em `setor` (coluna real de lancamentos_despesas)
    setor: centroCusto,
    centroCusto,
    observacao: `[AUTO-NF] Gerado automaticamente da NF ${nf.numero} (categoria ${origem === 'aprendido' ? 'aprendida do fornecedor' : 'automática'})`,
    obraId: nf.obraId || null, // NULL = MONTEX (empresa)
  };
}

// ---------- 4. NF → materiais (aba Materiais / pedidos_material) ----------
export function extrairMateriaisDaNF(nf) {
  const itens = Array.isArray(nf.itens) ? nf.itens : [];
  const data = nf.dataEmissao || nf.dataEntrada || new Date().toISOString().split('T')[0];
  const base = Date.now();

  return itens
    .filter(i => (i.descricao || '').trim())
    .map((i, idx) => {
      const qtd = itemQtd(i);
      const unidade = itemUnidade(i);
      const peso = ehUnidadePeso(unidade)
        ? (unidade.startsWith('T') ? qtd * 1000 : qtd)
        : 0;
      return {
        id: `PM-NF-${base}-${idx}`,
        obraId: nf.obraId || null,
        descricao: String(i.descricao).trim(),
        material: i.material || i.ncm || '',
        quantidade: qtd,
        unidade: unidade.toLowerCase(),
        // Colunas REAIS de pedidos_material (verificado em prod):
        // peso_previsto / peso_comprado / peso_entregue / peso_falta.
        // Material de NF já foi ENTREGUE — entra como recebido.
        pesoPrevisto: peso,
        pesoComprado: peso,
        pesoEntregue: peso,
        pesoFalta: 0,
        status: 'entregue',
        fornecedor: nf.fornecedor || '',
        notaFiscal: String(nf.numero || ''),
        dataPedido: data,
        dataEntrega: nf.dataEntrada || data,
        observacoes: `Extraído automaticamente da NF ${nf.numero} | R$ ${itemValorUnit(i).toFixed(2)}/${unidade.toLowerCase()} | total R$ ${itemValorTotal(i).toFixed(2)}`,
      };
    });
}

// ---------- 5. histórico de preços (dados p/ alertas) ----------
const normalizar = (s) => String(s || '')
  .toUpperCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Constrói o histórico a partir das NFs (todas as origens):
 * - porMaterial: chave normalizada → [{data, fornecedor, valorUnit, unidade, nf, obraId}]
 * - porFornecedor: nome → {nfs, valorTotal, ultimaData, itens: últimos N}
 */
export function construirHistoricoPrecos(notasFiscais) {
  const porMaterial = new Map();
  const porFornecedor = new Map();

  (notasFiscais || []).forEach(nf => {
    const itens = Array.isArray(nf.itens) ? nf.itens : [];
    const data = nf.dataEmissao || nf.dataEntrada || nf.createdAt || '';
    const forn = String(nf.fornecedor || '').trim();

    if (forn) {
      if (!porFornecedor.has(forn)) {
        porFornecedor.set(forn, { nfs: 0, valorTotal: 0, ultimaData: '', itens: [] });
      }
      const f = porFornecedor.get(forn);
      f.nfs += 1;
      f.valorTotal += nfValorTotal(nf);
      if (String(data) > String(f.ultimaData)) f.ultimaData = data;
    }

    itens.forEach(i => {
      const desc = normalizar(i.descricao);
      if (!desc) return;
      const entrada = {
        descricao: String(i.descricao || '').trim(),
        data,
        fornecedor: forn,
        valorUnit: itemValorUnit(i),
        unidade: itemUnidade(i),
        nf: String(nf.numero || ''),
        obraId: nf.obraId || null,
      };
      if (!porMaterial.has(desc)) porMaterial.set(desc, []);
      porMaterial.get(desc).push(entrada);
      if (forn) {
        const f = porFornecedor.get(forn);
        f.itens.push(entrada);
        if (f.itens.length > 30) f.itens.shift();
      }
    });
  });

  // ordenar entradas por data desc
  porMaterial.forEach(arr => arr.sort((a, b) => String(b.data).localeCompare(String(a.data))));
  return { porMaterial, porFornecedor };
}

/**
 * Busca preços de materiais semelhantes ao texto digitado (match por tokens).
 * Retorna até `limite` materiais distintos, cada um com a entrada mais recente.
 */
export function buscarPrecosSimilares(historico, texto, limite = 4) {
  const tokens = normalizar(texto).split(' ').filter(t => t.length >= 3);
  if (tokens.length === 0 || !historico?.porMaterial) return [];

  const resultados = [];
  historico.porMaterial.forEach((entradas, chave) => {
    const hits = tokens.filter(t => chave.includes(t)).length;
    if (hits === 0) return;
    const maisRecente = entradas[0];
    const valores = entradas.map(e => e.valorUnit).filter(v => v > 0);
    const media = valores.length ? valores.reduce((a, v) => a + v, 0) / valores.length : 0;
    resultados.push({
      score: hits / tokens.length,
      chave,
      maisRecente,
      media,
      ocorrencias: entradas.length,
      menorValor: valores.length ? Math.min(...valores) : 0,
    });
  });

  return resultados
    .sort((a, b) => b.score - a.score || b.ocorrencias - a.ocorrencias)
    .slice(0, limite);
}

// ---------- 6. orquestrador ----------
/**
 * Processa uma NF de forma idempotente.
 * deps: { lancamentos, materiais, addLancamento, importarMateriais }
 * Retorna resumo { lancamentoCriado, materiaisCriados, categoria, centroCusto, origem }
 */
export async function processarNF(nf, deps) {
  const { lancamentos, materiais, addLancamento, importarMateriais } = deps;
  const cat = categorizarNF(nf);
  const resumo = {
    lancamentoCriado: false,
    materiaisCriados: 0,
    ...cat,
  };

  if (!nfTemLancamento(nf, lancamentos)) {
    await addLancamento(gerarLancamentoDaNF(nf, cat));
    resumo.lancamentoCriado = true;
  }

  if (!nfTemMateriais(nf, materiais)) {
    const novos = extrairMateriaisDaNF(nf);
    if (novos.length > 0) {
      await importarMateriais(novos);
      resumo.materiaisCriados = novos.length;
    }
  }

  return resumo;
}
