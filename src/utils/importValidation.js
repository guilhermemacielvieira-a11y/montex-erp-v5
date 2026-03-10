/**
 * MONTEX ERP - Utilitário de Validação e Detecção de Duplicatas para Importações
 * Garante integridade dos dados importados via planilhas/extratos
 * Data: 2026-03-09
 */

/**
 * Validação de campos obrigatórios
 * @param {Object} registro - Objeto com os dados
 * @param {Array<string>} camposObrigatorios - Lista de campos que são obrigatórios
 * @returns {Array<string>} Lista de erros encontrados
 */
export function validarCamposObrigatorios(registro, camposObrigatorios) {
  const erros = [];
  camposObrigatorios.forEach(campo => {
    if (registro[campo] === undefined || registro[campo] === null || registro[campo] === '') {
      erros.push(`Campo obrigatório "${campo}" está vazio`);
    }
  });
  return erros;
}

/**
 * Validação de valor numérico com range e restrições
 * @param {number|string} valor - Valor a validar
 * @param {string} campo - Nome do campo para mensagens de erro
 * @param {Object} opcoes - Opções de validação
 * @returns {Object} { valor: number corrigido, erros: Array<string> }
 */
export function validarValorNumerico(valor, campo, opcoes = {}) {
  const {
    min = 0,
    max = Infinity,
    permitirNegativo = false,
    permitirZero = true,
    decimaisMaximos = 2
  } = opcoes;
  const erros = [];

  // Converter para número
  let num;
  if (typeof valor === 'string') {
    const valorLimpo = valor.replace(/[^\d.,-]/g, '').replace(',', '.');
    num = parseFloat(valorLimpo);
  } else {
    num = valor;
  }

  if (isNaN(num)) {
    erros.push(`"${campo}": valor "${valor}" não é numérico`);
    return { valor: 0, erros };
  }

  // Validações
  if (!permitirNegativo && num < 0) {
    erros.push(`"${campo}": valor negativo (${num}) não permitido`);
  }
  if (!permitirZero && num === 0) {
    erros.push(`"${campo}": valor zero não permitido`);
  }
  if (num < min) {
    erros.push(`"${campo}": valor ${num} abaixo do mínimo ${min}`);
  }
  if (num > max) {
    erros.push(`"${campo}": valor ${num} acima do máximo ${max}`);
  }

  // Validar casas decimais
  const decimalPart = String(num).split('.')[1];
  if (decimalPart && decimalPart.length > decimaisMaximos) {
    erros.push(`"${campo}": máximo ${decimaisMaximos} casas decimais permitidas`);
  }

  return { valor: parseFloat(num.toFixed(decimaisMaximos)), erros };
}

/**
 * Validação de data em múltiplos formatos
 * @param {string|Date} data - Data a validar
 * @param {string} campo - Nome do campo para mensagens de erro
 * @returns {Object} { data: string (ISO), erros: Array<string> }
 */
export function validarData(data, campo) {
  const erros = [];
  if (!data) {
    erros.push(`"${campo}": data não informada`);
    return { data: null, erros };
  }

  let parsed = null;
  let resultado = null;

  // Tentar parse ISO primeiro
  parsed = new Date(data);
  if (!isNaN(parsed.getTime())) {
    resultado = parsed.toISOString().split('T')[0];
  } else {
    // Tentar formato DD/MM/YYYY
    const parts = String(data).split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [d, m, y] = parts;
      const padD = d.padStart(2, '0');
      const padM = m.padStart(2, '0');
      const padY = y.length === 2 ? (parseInt(y) < 50 ? '20' + y : '19' + y) : y;

      const tryDate = new Date(`${padY}-${padM}-${padD}`);
      if (!isNaN(tryDate.getTime())) {
        resultado = tryDate.toISOString().split('T')[0];
        parsed = tryDate;
      }
    }
  }

  if (!resultado || !parsed) {
    erros.push(`"${campo}": data inválida "${data}"`);
    return { data: null, erros };
  }

  // Validar intervalo razoável (2015-2035)
  const year = parsed.getFullYear();
  if (year < 2015 || year > 2035) {
    erros.push(`"${campo}": ano ${year} fora do intervalo esperado (2015-2035)`);
  }

  return { data: resultado, erros };
}

/**
 * Detecção de duplicatas dentro da mesma importação
 * @param {Array<Object>} registros - Lista de registros a verificar
 * @param {Array<string>} camposChave - Campos que definem a unicidade
 * @returns {Object} { unicos: Array, duplicatas: Array, totalDuplicatas: number }
 */
export function detectarDuplicatas(registros, camposChave) {
  const vistos = new Map();
  const duplicatas = [];
  const unicos = [];

  registros.forEach((reg, idx) => {
    // Criar chave normalizada
    const chave = camposChave
      .map(c => String(reg[c] || '').trim().toLowerCase())
      .join('|');

    if (vistos.has(chave)) {
      duplicatas.push({
        indice: idx,
        registro: reg,
        duplicaDe: vistos.get(chave),
        chave
      });
    } else {
      vistos.set(chave, idx);
      unicos.push(reg);
    }
  });

  return {
    unicos,
    duplicatas,
    totalDuplicatas: duplicatas.length,
    totalUnicos: unicos.length
  };
}

/**
 * Detecção de duplicatas contra registros existentes no banco
 * @param {Array<Object>} novosRegistros - Registros a importar
 * @param {Array<Object>} registrosExistentes - Registros já no banco
 * @param {Array<string>} camposChave - Campos que definem a unicidade
 * @returns {Object} { novos: Array, jaExistem: Array, totalNovos: number, totalJaExistem: number }
 */
export function detectarDuplicatasExistentes(novosRegistros, registrosExistentes, camposChave) {
  // Criar set com chaves dos registros existentes
  const existentesSet = new Set(
    registrosExistentes.map(r =>
      camposChave
        .map(c => String(r[c] || '').trim().toLowerCase())
        .join('|')
    )
  );

  const novos = [];
  const jaExistem = [];

  novosRegistros.forEach(reg => {
    const chave = camposChave
      .map(c => String(reg[c] || '').trim().toLowerCase())
      .join('|');

    if (existentesSet.has(chave)) {
      jaExistem.push({ ...reg, chave });
    } else {
      novos.push({ ...reg, chave });
    }
  });

  return {
    novos,
    jaExistem,
    totalNovos: novos.length,
    totalJaExistem: jaExistem.length
  };
}

/**
 * Validação completa de lançamento financeiro
 * @param {Object} lancamento - Dados do lançamento
 * @returns {Object} { valido: boolean, erros: Array<string>, valorCorrigido: number }
 */
export function validarLancamento(lancamento) {
  const erros = [];

  // Campos obrigatórios
  const camposObrigatorios = lancamento.data ? ['descricao', 'valor'] : ['descricao', 'valor', 'data'];
  erros.push(...validarCamposObrigatorios(lancamento, camposObrigatorios));

  // Validar valor
  const { valor, erros: errosValor } = validarValorNumerico(
    lancamento.valor,
    'valor',
    {
      permitirZero: false,
      max: 50000000,
      min: 0.01
    }
  );
  erros.push(...errosValor);

  // Validar data (se fornecida)
  if (lancamento.data || lancamento.dataEmissao) {
    const { erros: errosData } = validarData(
      lancamento.data || lancamento.dataEmissao,
      'data'
    );
    erros.push(...errosData);
  }

  // Descrição: mínimo 3 caracteres
  if (lancamento.descricao && String(lancamento.descricao).trim().length < 3) {
    erros.push('Descrição deve ter pelo menos 3 caracteres');
  }

  return {
    valido: erros.length === 0,
    erros,
    valorCorrigido: valor
  };
}

/**
 * Validação de lançamento de material/estoque
 * @param {Object} material - Dados do material
 * @returns {Object} { valido: boolean, erros: Array<string> }
 */
export function validarMaterial(material) {
  const erros = [];

  // Campos obrigatórios
  erros.push(...validarCamposObrigatorios(material, ['codigo', 'descricao', 'quantidade']));

  // Quantidade
  const { erros: errosQtd } = validarValorNumerico(
    material.quantidade,
    'quantidade',
    {
      permitirZero: false,
      min: 0.01,
      max: 1000000
    }
  );
  erros.push(...errosQtd);

  // Código: mínimo 2 caracteres
  if (material.codigo && String(material.codigo).trim().length < 2) {
    erros.push('Código deve ter pelo menos 2 caracteres');
  }

  // Descrição: mínimo 3 caracteres
  if (material.descricao && String(material.descricao).trim().length < 3) {
    erros.push('Descrição deve ter pelo menos 3 caracteres');
  }

  return {
    valido: erros.length === 0,
    erros
  };
}

/**
 * Validação de romaneio (lista de corte/material)
 * @param {Object} item - Item do romaneio
 * @returns {Object} { valido: boolean, erros: Array<string> }
 */
export function validarRomaneio(item) {
  const erros = [];

  // Campos obrigatórios
  erros.push(...validarCamposObrigatorios(item, ['marca', 'quantidade']));

  // Quantidade
  const { erros: errosQtd } = validarValorNumerico(
    item.quantidade,
    'quantidade',
    {
      permitirZero: false,
      min: 1,
      max: 100000
    }
  );
  erros.push(...errosQtd);

  // Marca: mínimo 1 caractere
  if (item.marca && String(item.marca).trim().length === 0) {
    erros.push('Marca não pode estar em branco');
  }

  return {
    valido: erros.length === 0,
    erros
  };
}

/**
 * Gera relatório completo de validação
 * @param {Array<Object>} registros - Registros a validar
 * @param {Function} validarFn - Função de validação customizada (deve retornar { valido, erros })
 * @param {Array<string>} camposChaveDuplicata - Campos para detectar duplicatas
 * @returns {Object} Relatório detalhado
 */
export function gerarRelatorioValidacao(registros, validarFn, camposChaveDuplicata = []) {
  const errosPorRegistro = [];
  let totalErros = 0;

  // Validar cada registro
  registros.forEach((reg, idx) => {
    const { erros } = validarFn(reg);
    if (erros.length > 0) {
      errosPorRegistro.push({
        indice: idx,
        registro: reg,
        erros,
        quantidade: erros.length
      });
      totalErros += erros.length;
    }
  });

  // Detectar duplicatas se houver campos definidos
  let duplicatas = [];
  let unicos = [];
  if (camposChaveDuplicata.length > 0) {
    const { unicos: u, duplicatas: d } = detectarDuplicatas(registros, camposChaveDuplicata);
    unicos = u;
    duplicatas = d;
  }

  const registrosValidos = registros.length - errosPorRegistro.length;

  return {
    totalRegistros: registros.length,
    totalValidos: registrosValidos,
    totalComErro: errosPorRegistro.length,
    totalErros,
    totalDuplicatas: duplicatas.length,
    totalUnicos: unicos.length,
    errosPorRegistro,
    duplicatas,
    unicos,
    resumo: {
      percentualValidacao: registros.length > 0 ? Math.round((registrosValidos / registros.length) * 100) : 0,
      percentualDuplicatas: registros.length > 0 ? Math.round((duplicatas.length / registros.length) * 100) : 0
    }
  };
}

/**
 * Normaliza valores de entrada para importação
 * @param {Object} registro - Registro com dados brutos
 * @param {Object} mapeamento - Mapeamento de nomes de campos
 * @returns {Object} Registro normalizado
 */
export function normalizarRegistro(registro, mapeamento = {}) {
  const normalizado = {};

  Object.entries(mapeamento).forEach(([campoDestino, campoOrigem]) => {
    const valor = registro[campoOrigem];
    if (valor !== undefined && valor !== null) {
      normalizado[campoDestino] = String(valor).trim();
    }
  });

  return normalizado;
}

/**
 * Filtra e processa registros para importação
 * @param {Array<Object>} registros - Lista de registros
 * @param {Array<Object>} registrosExistentes - Registros já no banco (opcional)
 * @param {Array<string>} camposChave - Campos para detectar duplicatas
 * @param {Function} validarFn - Função de validação customizada
 * @returns {Object} { paraProcesar: Array, erros: Array, duplicatas: Array, resumo: Object }
 */
export function filtrarRegistrosParaImportacao(
  registros,
  registrosExistentes = [],
  camposChave = [],
  validarFn = validarLancamento
) {
  // Validar cada registro
  const registrosValidos = [];
  const errosValidacao = [];

  registros.forEach((reg, idx) => {
    const validacao = validarFn(reg);
    if (validacao.valido) {
      registrosValidos.push(reg);
    } else {
      errosValidacao.push({
        indice: idx,
        registro: reg,
        erros: validacao.erros
      });
    }
  });

  // Detectar duplicatas dentro da importação
  let { unicos, duplicatas } = detectarDuplicatas(registrosValidos, camposChave);

  // Detectar duplicatas contra banco (se houver)
  let paraProcesar = unicos;
  let jaExistem = [];

  if (registrosExistentes.length > 0 && camposChave.length > 0) {
    const { novos, jaExistem: existentes } = detectarDuplicatasExistentes(
      unicos,
      registrosExistentes,
      camposChave
    );
    paraProcesar = novos;
    jaExistem = existentes;
  }

  return {
    paraProcesar,
    errosValidacao,
    duplicatas,
    jaExistem,
    resumo: {
      totalEntrada: registros.length,
      totalValidos: registrosValidos.length,
      totalComErro: errosValidacao.length,
      totalDuplicatasInternas: duplicatas.length,
      totalDuplicatasExternas: jaExistem.length,
      totalParaImportar: paraProcesar.length
    }
  };
}

/**
 * Formata mensagem de erro para exibição
 * @param {Array<string>} erros - Lista de erros
 * @returns {string} Mensagem formatada
 */
export function formatarErros(erros) {
  if (!erros || erros.length === 0) return 'Nenhum erro';
  if (erros.length === 1) return erros[0];
  return `${erros.length} erros: ${erros.slice(0, 2).join(', ')}...`;
}

/**
 * Gera sumário para toast/notificação
 * @param {Object} resultado - Resultado da validação/importação
 * @returns {string} Mensagem formatada
 */
export function gerarMensagemSumario(resultado) {
  const {
    totalValidos = 0,
    totalComErro = 0,
    totalDuplicatas = 0,
    totalParaImportar = 0
  } = resultado.resumo || resultado;

  const partes = [];
  if (totalParaImportar > 0) partes.push(`${totalParaImportar} para importar`);
  if (totalDuplicatas > 0) partes.push(`${totalDuplicatas} duplicata(s)`);
  if (totalComErro > 0) partes.push(`${totalComErro} com erro`);

  return partes.length > 0 ? partes.join(', ') : 'Nenhum registro válido';
}
