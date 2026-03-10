# Guia de Integração - XLSX Export Utils

## Visão Geral

Os novos utilitários `xlsxExportUtils.js` fornecem funcionalidade para exportar relatórios formatados em XLSX com suporte a:
- Formatação condicional automática
- Cores do tema MONTEX
- Linhas de total
- Múltiplos tipos de dados (moeda, percentual, data)

## Importação

```javascript
import {
  exportarXLSXFormatado,
  exportarRelatorioFinanceiro,
  exportarRelatorioProducao,
  exportarRelatorioEstoque,
  exportarDRE,
  exportarGenerico
} from '@/utils/xlsxExportUtils';
```

## Uso Básico

### 1. Exportar Relatório Financeiro

```javascript
const handleExportarFinanceiro = () => {
  const dados = movimentacoes.map(m => ({
    data: m.data_movimentacao,
    descricao: m.descricao,
    categoria: m.categoria,
    fornecedor: m.fornecedor_nome,
    valor: m.valor,
    status: m.status,
  }));

  exportarRelatorioFinanceiro(dados, 'relatorio_financeiro_marco');
};
```

### 2. Exportar Relatório de Produção

```javascript
const handleExportarProducao = () => {
  const dados = itensProducao.map(item => ({
    marca: item.marca,
    descricao: item.descricao,
    quantidade: item.quantidade,
    pesoUnitario: item.peso_unitario,
    pesoTotal: item.peso_total,
    etapa: item.etapa_producao,
    progresso: item.percentual_progresso,
  }));

  exportarRelatorioProducao(dados, 'producao_marco');
};
```

### 3. Exportar Relatório de Estoque

```javascript
const handleExportarEstoque = () => {
  const dados = itensEstoque.map(item => ({
    codigo: item.codigo_produto,
    descricao: item.descricao,
    quantidade: item.quantidade_atual,
    estoqueMinimo: item.estoque_minimo,
    unidade: item.unidade_medida,
    valorUnitario: item.valor_unitario,
    valorTotal: item.quantidade_atual * item.valor_unitario,
  }));

  exportarRelatorioEstoque(dados, 'estoque_marco');
};
```

### 4. Exportar DRE (Demonstração do Resultado do Exercício)

```javascript
const handleExportarDRE = () => {
  const dados = [
    { descricao: 'Receita Bruta', valor: 100000, percentual: 1 },
    { descricao: '(-) Impostos', valor: -15000, percentual: -0.15 },
    { descricao: '(-) COGS', valor: -40000, percentual: -0.40 },
    { descricao: 'Lucro Bruto', valor: 45000, percentual: 0.45 },
    { descricao: '(-) Despesas Operacionais', valor: -20000, percentual: -0.20 },
    { descricao: 'EBITDA', valor: 25000, percentual: 0.25 },
    { descricao: '(-) Depreciação', valor: -5000, percentual: -0.05 },
    { descricao: 'EBIT', valor: 20000, percentual: 0.20 },
    { descricao: '(-) Juros', valor: -2000, percentual: -0.02 },
    { descricao: 'Lucro Líquido', valor: 18000, percentual: 0.18 },
  ];

  exportarDRE(dados, 'dre_marco');
};
```

### 5. Exportar com Configuração Customizada

```javascript
const handleExportarCustomizado = () => {
  const dados = minhasDados;

  const colunas = [
    { key: 'id', header: 'ID', tipo: 'texto', largura: 8 },
    { key: 'nome', header: 'Nome', tipo: 'texto', largura: 30 },
    { key: 'valor', header: 'Valor', tipo: 'moeda', largura: 15 },
    { key: 'data', header: 'Data', tipo: 'data', largura: 12 },
    { key: 'percentual', header: 'Percentual', tipo: 'percentual', largura: 12 },
  ];

  exportarGenerico(
    dados,
    colunas,
    'Meu Relatório Customizado',
    'relatorio_customizado'
  );
};
```

## Integração em DespesasPage

Para integrar no `DespesasPage.jsx`:

```javascript
// 1. Importar a função
import { exportarRelatorioFinanceiro } from '@/utils/xlsxExportUtils';

// 2. Substituir a função existente de exportação XLSX
const handleExportarComFormatacao = () => {
  const dados = despesas.map(d => ({
    data: d.data,
    descricao: d.descricao,
    categoria: d.categoria,
    fornecedor: d.fornecedor,
    valor: d.valor,
    status: d.status,
  }));

  exportarRelatorioFinanceiro(dados, `despesas_${selectedMonth}`);
};

// 3. Adicionar um botão que chama a função
<Button onClick={handleExportarComFormatacao}>
  <Download className="h-4 w-4 mr-2" />
  Exportar com Formatação
</Button>
```

## Integração do ExportScheduler

Para adicionar o agendador de exportações em qualquer página:

```javascript
import ExportScheduler from '@/components/ExportScheduler';

// Adicionar no JSX
<div className="flex gap-2">
  <Button onClick={handleExportar}>Exportar Agora</Button>
  <ExportScheduler />
</div>
```

## Estrutura de Tipos de Coluna

```javascript
{
  key: 'nomeDosCampos',      // Chave do objeto de dados
  header: 'Cabeçalho',       // Nome da coluna no Excel
  tipo: 'texto|moeda|percentual|data|numero',  // Tipo de formatação
  largura: 15                // Largura da coluna (em caracteres)
}
```

## Tipos de Dados Suportados

- `texto`: Texto simples
- `numero`: Números inteiros
- `moeda`: Formatado como R$ com 2 casas decimais
- `percentual`: Formatado como percentual (0.15 = 15%)
- `data`: Formatado como DD/MM/YYYY

## Padrão de Cores do Tema MONTEX

O arquivo define as seguintes cores que podem ser customizadas:

```javascript
const CORES = {
  header: { rgb: '1E293B' },      // Slate-800 (Escuro)
  positivo: { rgb: 'DCFCE7' },    // Green-100 (Verde claro)
  negativo: { rgb: 'FEE2E2' },    // Red-100 (Vermelho claro)
  alerta: { rgb: 'FEF9C3' },      // Yellow-100 (Amarelo claro)
  destaque: { rgb: 'DBEAFE' },    // Blue-100 (Azul claro)
  total: { rgb: 'F1F5F9' },       // Slate-100 (Cinza claro)
};
```

## Funcionalidades do ExportScheduler

O componente `ExportScheduler.jsx` oferece:

### Recursos
- Agendar exportações periódicas (Diário, Semanal, Mensal)
- Selecionar tipo de relatório (Financeiro, Produção, Estoque, DRE)
- Selecionar formato (XLSX, PDF)
- Ativar/desativar agendamentos
- Executar exportações manualmente
- Visualizar próxima execução e última execução

### Armazenamento
- Dados salvos em localStorage (chave: `montex_export_schedules`)
- Persistem entre sessões
- Sem requisição ao backend

### Integração Futura
- API endpoint para processar agendamentos no servidor
- Sistema de notificações quando exportações forem concluídas
- Download automático de arquivos para gerentes

## Exemplo Completo

```javascript
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportarRelatorioFinanceiro } from '@/utils/xlsxExportUtils';
import ExportScheduler from '@/components/ExportScheduler';

export function MinhaComponente() {
  const [dados, setDados] = useState([]);

  const handleExportarAgora = () => {
    exportarRelatorioFinanceiro(dados, 'relatorio_especial');
  };

  return (
    <div className="flex gap-2">
      <Button onClick={handleExportarAgora} className="gap-2">
        <Download className="h-4 w-4" />
        Exportar Agora
      </Button>

      <ExportScheduler />
    </div>
  );
}
```

## Troubleshooting

### Erro: "Cannot find module 'xlsx'"
- Verifique se xlsx está instalado: `npm list xlsx`
- Instale se necessário: `npm install xlsx`

### Arquivo não baixa no navegador
- Verifique bloqueadores de pop-ups/downloads
- Verifique permissões do navegador

### Formatação não aparece
- Certifique-se de usar o tipo correto de coluna
- Abra o arquivo no Excel e tente refrescar a formatação

### localStorage não persiste
- Verifique se localStorage está habilitado no navegador
- Verifique se não está em modo incógnito

## Próximas Melhorias

- [ ] Suporte a filtros automáticos no Excel
- [ ] Gráficos embutidos nos arquivos XLSX
- [ ] Assinaturas digitais em PDFs
- [ ] Compressão de arquivos para exportações em lote
- [ ] Templates customizados por usuário
- [ ] Integração com Google Drive/OneDrive
