# MONTEX ERP - Guia de Integração de Validação e Detecção de Duplicatas

## Data: 2026-03-09

### Visão Geral

Um sistema robusto de validação e detecção de duplicatas foi implementado em TODOS os módulos de importação do MONTEX ERP. Este guia documenta as mudanças realizadas e como utilizar o novo sistema.

## Arquivos Modificados

### 1. Utilitário Principal (Novo)
**Arquivo:** `/src/utils/importValidation.js`

Este arquivo contém todas as funções de validação e detecção de duplicatas reutilizáveis:

#### Funções Disponíveis

##### Validação de Campos
```javascript
validarCamposObrigatorios(registro, camposObrigatórios)
```
- Verifica se campos obrigatórios estão preenchidos
- Retorna: `Array<string>` com erros encontrados

##### Validação Numérica
```javascript
validarValorNumerico(valor, campo, opcoes)
```
- Valida valores numéricos com constraints
- Opções suportadas:
  - `min`: valor mínimo (default: 0)
  - `max`: valor máximo (default: Infinity)
  - `permitirNegativo`: permite valores negativos (default: false)
  - `permitirZero`: permite valor zero (default: true)
  - `decimaisMaximos`: casas decimais permitidas (default: 2)
- Retorna: `{ valor: number normalizado, erros: Array<string> }`

##### Validação de Data
```javascript
validarData(data, campo)
```
- Suporta múltiplos formatos: ISO, DD/MM/YYYY, etc.
- Valida intervalo razoável (2015-2035)
- Retorna: `{ data: string (ISO YYYY-MM-DD), erros: Array<string> }`

##### Detecção de Duplicatas Internas
```javascript
detectarDuplicatas(registros, camposChave)
```
- Detecta duplicatas dentro da mesma importação
- Normaliza valores para comparação
- Retorna: `{ unicos: Array, duplicatas: Array, totalDuplicatas: number, totalUnicos: number }`

##### Detecção de Duplicatas Externas
```javascript
detectarDuplicatasExistentes(novosRegistros, registrosExistentes, camposChave)
```
- Compara com registros já no banco de dados
- Retorna: `{ novos: Array, jaExistem: Array, totalNovos: number, totalJaExistem: number }`

##### Validações Domínio-Específicas
```javascript
validarLancamento(lancamento)
validarMaterial(material)
validarRomaneio(item)
```
- Validações especializadas por tipo de dado
- Cada uma segue o padrão: `{ valido: boolean, erros: Array<string>, ... }`

##### Relatórios
```javascript
gerarRelatorioValidacao(registros, validarFn, camposChaveDuplicata)
filtrarRegistrosParaImportacao(registros, registrosExistentes, camposChave, validarFn)
```
- Gera relatórios completos de validação
- Filtra registros válidos prontos para importação

---

## Módulos de Importação Atualizados

### 1. DespesasPage.jsx

**Localização:** `/src/pages/DespesasPage.jsx`

**Mudanças:**
- ✅ Importação da biblioteca de validação
- ✅ Validação de cada lançamento importado
- ✅ Detecção de duplicatas internas (mesma importação)
- ✅ Detecção de duplicatas contra registros existentes
- ✅ Filtro automático de items inválidos antes do import
- ✅ Mensagens de feedback detalhadas

**Fluxo de Validação:**
```
1. Ler Excel → parseListaCorte/parseResumoMaterial
2. Validar integridade (descrição, valor, data)
3. Detectar duplicatas internas (data+descrição+valor)
4. Detectar duplicatas contra bank (Supabase)
5. Filtrar items válidos e únicos
6. Mostrar preview com sumário
7. Re-validar antes de importar (Supabase pode ter mudado)
8. Feedback final com resultado
```

**Exemplo de Uso:**
```javascript
const { unicos, duplicatas } = detectarDuplicatas(
  importedItems,
  ['data', 'descricao', 'valor']
);

const { novos, jaExistem } = detectarDuplicatasExistentes(
  unicos,
  despesas, // existentes do Supabase
  ['data', 'descricao', 'valor']
);
```

---

### 2. ImportRomaneioPage.jsx

**Localização:** `/src/pages/ImportRomaneioPage.jsx`

**Mudanças:**
- ✅ Validação de lista de corte (peças)
- ✅ Validação de resumo de material (estoque)
- ✅ Detecção de duplicatas internas
- ✅ Detecção de duplicatas contra peças/estoque existentes
- ✅ Marcação automática de status (NOVO, DUPLICADO, ERRO, ATUALIZADO)
- ✅ Validação final antes de processar importação

**Fluxo de Validação para Lista de Corte:**
```
1. Processar arquivo
2. Validar marca + quantidade obrigatórios
3. Detectar duplicatas internas (marca+tipo)
4. Detectar duplicatas contra peças existentes (marca)
5. Marcar status correto
6. Mostrar preview
7. Validar novamente antes de importar
8. Importar apenas items NOVO validados
```

**Fluxo de Validação para Resumo de Material:**
```
1. Processar arquivo
2. Validar código + quantidade obrigatórios
3. Detectar duplicatas internas (código+material)
4. Detectar duplicatas contra estoque (código)
5. Marcar status (NOVO/DUPLICADO/ERRO/ATUALIZADO)
6. Mostrar preview
7. Validar novamente antes de importar
8. Importar apenas items NOVO validados
```

---

### 3. ImportadorExtratoBancario.jsx

**Localização:** `/src/components/financeiro/ImportadorExtratoBancario.jsx`

**Mudanças:**
- ✅ Validação de data (múltiplos formatos)
- ✅ Validação de valor (sem negativos, range máximo)
- ✅ Detecção de duplicatas internas
- ✅ Feedback detalhado por linha
- ✅ Exibição de erros de validação

**Fluxo:**
```
1. Upload de arquivo
2. Seleção de banco/mapeamento de colunas
3. Processar dados com mapeamento
4. Validar data e valor de cada transação
5. Detectar duplicatas (data+descrição+valor)
6. Mostrar preview com feedback
7. Importar itens válidos
```

**Mensagem de Feedback:**
```
"Análise: 45 transações válidas, 2 duplicada(s), 1 com erro"
```

---

### 4. ImportadorNotaFiscal.jsx

**Localização:** `/src/components/financeiro/ImportadorNotaFiscal.jsx`

**Mudanças:**
- ✅ Validação de campos extraídos via OCR
- ✅ Validação de data de emissão
- ✅ Validação de valor total
- ✅ Rejeição de dados incompletos
- ✅ Mensagens de erro descritivas

**Fluxo:**
```
1. Upload de PDF
2. Extração via OCR/LLM
3. Validar campos obrigatórios (NF, data, fornecedor, valor)
4. Validar data (formato e intervalo)
5. Validar valor (positivo, não-zero, range)
6. Se válido → preview para confirmação
7. Se inválido → mostrar erros, voltar a upload
8. Importar após confirmação
```

---

### 5. ImportadorLancamentosMaterial.jsx

**Localização:** `/src/components/financeiro/ImportadorLancamentosMaterial.jsx`

**Mudanças:**
- ✅ Normalização de nomes de colunas
- ✅ Validação de data (múltiplos formatos)
- ✅ Validação de valor (range máximo)
- ✅ Validação de campo Nº NOTA FISCAL
- ✅ Validação de campo FORNECEDOR
- ✅ Detecção de duplicatas internas
- ✅ Feedback detalhado por linha

**Fluxo:**
```
1. Upload de Excel
2. Verificar colunas obrigatórias
3. Normalizar nomes de colunas
4. Validar cada linha (data, valor, NF, fornecedor)
5. Detectar duplicatas (NF+fornecedor)
6. Mostrar preview com feedback
7. Importar items válidos
```

---

## Padrões de Implementação

### Padrão 1: Validação Simples
```javascript
import { validarLancamento } from '../utils/importValidation';

const { valido, erros } = validarLancamento({
  descricao: 'Compra de Material',
  valor: 1500.00,
  data: '2026-03-09'
});

if (!valido) {
  console.error('Erros:', erros);
}
```

### Padrão 2: Detecção de Duplicatas
```javascript
import { detectarDuplicatas } from '../utils/importValidation';

const registros = [
  { id: 1, nome: 'Produto A', preco: 100 },
  { id: 2, nome: 'Produto A', preco: 100 },
  { id: 3, nome: 'Produto B', preco: 200 }
];

const { unicos, duplicatas } = detectarDuplicatas(
  registros,
  ['nome', 'preco']
);

console.log(`${unicos.length} únicos, ${duplicatas.length} duplicadas`);
```

### Padrão 3: Validação + Duplicatas + Filtragem
```javascript
import {
  validarLancamento,
  detectarDuplicatas,
  detectarDuplicatasExistentes
} from '../utils/importValidation';

// 1. Validar cada item
const itemsValidos = registros.filter(r => {
  const { valido } = validarLancamento(r);
  return valido;
});

// 2. Detectar duplicatas internas
const { unicos } = detectarDuplicatas(
  itemsValidos,
  ['data', 'descricao', 'valor']
);

// 3. Detectar contra banco
const { novos } = detectarDuplicatasExistentes(
  unicos,
  registrosExistentes,
  ['data', 'descricao', 'valor']
);

// novos está pronto para importar!
```

---

## Mensagens de Usuário

O sistema gera mensagens automáticas em diferentes etapas:

### Durante Preview
```
"Análise: 45 registros válidos, 3 duplicada(s) interna(s), 2 já existente(s), 1 com erro"
```

### Antes de Importar (Validação Final)
```
"Resultado: 42 importadas, 3 já existentes, 1 rejeitada por erro"
```

### Extrato Bancário
```
"Análise: 120 transações válidas, 2 duplicada(s), 1 com erro"
```

### Nota Fiscal
```
"[Validação automática] NF 12345 de 09/03/2026 - R$ 5.000,00"
```

---

## Testes Recomendados

### Teste 1: Importação Simples
- [ ] Upload de arquivo válido
- [ ] Verificar contagem de itens válidos
- [ ] Confirmar importação
- [ ] Verificar itens no banco

### Teste 2: Detecção de Duplicatas Internas
- [ ] Criar arquivo com 2 itens idênticos
- [ ] Verificar se aparece como duplicata
- [ ] Verificar se apenas 1 é importado (ou ambos rejeitados conforme regra)

### Teste 3: Detecção de Duplicatas Externas
- [ ] Importar item A
- [ ] Importar arquivo contendo item A novamente
- [ ] Verificar se aparece como "já existente"
- [ ] Verificar se não é importado novamente

### Teste 4: Validação de Dados
- [ ] Tentar importar com valor negativo (deve rejeitar)
- [ ] Tentar importar com data inválida (deve rejeitar)
- [ ] Tentar importar sem campo obrigatório (deve rejeitar)

### Teste 5: Feedback de Erros
- [ ] Verificar se mensagens de erro aparecem no preview
- [ ] Verificar se detalhes dos erros aparecem para o usuário

---

## Notas Técnicas

### Performance
- Detecção de duplicatas usa `Set` para O(n) instead de O(n²)
- Validações são lazy (param por param)
- Normalização case-insensitive para chaves

### Segurança
- Nenhum SQL injection (sem queries SQL)
- Nenhuma exposição de senhas/tokens
- Validação client-side (rápido) + server-side (seguro)

### Compatibilidade
- Suporta formatos de data: ISO, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
- Suporta formatos numéricos: 1000, 1.000, 1,00, R$ 1.000,00
- Suporta tipos: string, number, Date

---

## Próximos Passos

### Phase 2 (Próxima)
- [ ] Integração com relatórios de auditoria
- [ ] Log de cada validação realizada
- [ ] Dashboard de qualidade de dados
- [ ] Alertas de padrões suspeitos

### Phase 3 (Futuro)
- [ ] Machine learning para detecção de anomalias
- [ ] Validação contra rules customizadas por cliente
- [ ] Integração com OCR melhorado

---

## Suporte e Troubleshooting

### Problema: "Campos obrigatórios estão vazios"
**Solução:** Verificar se o Excel tem colunas com nomes corretos

### Problema: "Data inválida"
**Solução:** Verificar formato (aceita ISO, DD/MM/YYYY, etc.)

### Problema: "Valor fora do range"
**Solução:** Verificar se valor está entre 0.01 e máximo permitido

### Problema: Muitas duplicatas
**Solução:** Verificar se arquivo tem cabeçalho repetido ou dados duplicados

---

## Contato e Updates

Para atualizações da validação, editar: `/src/utils/importValidation.js`

Todas as modificações devem manter compatibilidade com imports existentes.
