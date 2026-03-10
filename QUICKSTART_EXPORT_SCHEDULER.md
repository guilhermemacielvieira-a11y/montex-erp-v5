# Quick Start - Export Scheduler & XLSX Export Utils

## 30 Segundos de Setup

### 1. Copie as 3 linhas de importação

```javascript
import { exportarRelatorioFinanceiro } from '@/utils/xlsxExportUtils';
import ExportToolbar from '@/components/ExportToolbar';
import ExportScheduler from '@/components/ExportScheduler';
```

### 2. Transforme seus dados

```javascript
const dados = minhasDados.map(item => ({
  data: item.data,
  descricao: item.descricao,
  categoria: item.categoria,
  fornecedor: item.fornecedor,
  valor: item.valor,
  status: item.status,
}));
```

### 3. Crie a função de exportação

```javascript
const handleExportar = () => {
  exportarRelatorioFinanceiro(dados, 'relatorio');
};
```

### 4. Adicione ao JSX

```jsx
<ExportToolbar
  onExportXLSX={handleExportar}
  label="Exportar"
/>
```

**Pronto!** Você tem exportação XLSX + agendador funcionando.

---

## Padrões Prontos

### Padrão 1: Exportação Simples
```javascript
// Importar
import { exportarRelatorioFinanceiro } from '@/utils/xlsxExportUtils';

// Usar
const handleExportar = () => {
  exportarRelatorioFinanceiro(dados, 'nome_arquivo');
};

// Renderizar
<Button onClick={handleExportar}>Exportar</Button>
```

### Padrão 2: Com Agendador
```javascript
import ExportScheduler from '@/components/ExportScheduler';

<ExportScheduler />
```

### Padrão 3: Barra Completa (Recomendado)
```javascript
import ExportToolbar from '@/components/ExportToolbar';

<ExportToolbar
  onExportXLSX={() => exportarRelatorioFinanceiro(dados, 'arquivo')}
  label="Exportar Relatório"
/>
```

---

## Tipos de Coluna

| Tipo | Exemplo | Resultado |
|------|---------|-----------|
| `texto` | "João" | João |
| `numero` | 123 | 123 |
| `moeda` | 1000.5 | R$ 1.000,50 |
| `percentual` | 0.15 | 15% |
| `data` | "2024-03-09" | 09/03/2024 |

---

## Relatórios Disponíveis

```javascript
// Financeiro (Data, Descrição, Categoria, Fornecedor, Valor, Status)
exportarRelatorioFinanceiro(dados, 'financeiro');

// Produção (Marca, Descrição, Qtd, Peso Unit., Peso Total, Etapa, Progresso)
exportarRelatorioProducao(dados, 'producao');

// Estoque (Código, Descrição, Qtd, Estoque Min., Unidade, Valor Unit., Valor Total)
exportarRelatorioEstoque(dados, 'estoque');

// DRE (Descrição, Valor, % da Receita)
exportarDRE(dados, 'dre');

// Customizado (suas colunas)
exportarGenerico(dados, colunas, 'Título', 'arquivo');
```

---

## Agendador

### Criar Agendamento
1. Clique em "Agendar Exportações"
2. Selecione: Relatório + Frequência + Formato
3. Clique "Criar Agendamento"
4. ✅ Pronto! Salvo em localStorage

### Executar Manual
1. Clique no ícone de ▶️ do agendamento
2. ✅ Exportação iniciada

### Desativar
1. Toggle switch para OFF
2. ✅ Agendamento pausado (mas não deletado)

---

## Cores do Tema MONTEX

Já integradas automaticamente:

```
🔘 Header:     Slate-800 (#1E293B)
🟢 Positivo:   Green-100 (#DCFCE7)
🔴 Negativo:   Red-100   (#FEE2E2)
🟡 Alerta:     Yellow-100 (#FEF9C3)
🔵 Destaque:   Blue-100  (#DBEAFE)
⚫ Total:      Slate-100 (#F1F5F9)
```

---

## Exemplo Completo - 60 Linhas

```javascript
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { exportarRelatorioFinanceiro } from '@/utils/xlsxExportUtils';
import ExportToolbar from '@/components/ExportToolbar';

export default function RelatorioPage() {
  // Dados de exemplo
  const [movimentacoes] = useState([
    {
      data: '2024-03-01',
      descricao: 'Venda de Produto A',
      categoria: 'Receita',
      fornecedor: 'Cliente XYZ',
      valor: 5000,
      status: 'Pago',
    },
    {
      data: '2024-03-02',
      descricao: 'Compra de Matéria Prima',
      categoria: 'Despesa',
      fornecedor: 'Fornecedor ABC',
      valor: 2000,
      status: 'Pendente',
    },
  ]);

  // Função de exportação
  const handleExportarXLSX = () => {
    const dados = movimentacoes.map(m => ({
      data: m.data,
      descricao: m.descricao,
      categoria: m.categoria,
      fornecedor: m.fornecedor,
      valor: m.valor,
      status: m.status,
    }));

    exportarRelatorioFinanceiro(dados, 'movimentacoes_marzo');
  };

  return (
    <div className="space-y-6">
      {/* Header com exportação */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Movimentações Financeiras</h1>
        <ExportToolbar
          onExportXLSX={handleExportarXLSX}
          label="Exportar Relatório"
        />
      </div>

      {/* Conteúdo */}
      <Card>
        <div className="p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Data</th>
                <th className="text-left py-2">Descrição</th>
                <th className="text-left py-2">Valor</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((m, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2">{m.data}</td>
                  <td className="py-2">{m.descricao}</td>
                  <td className="py-2">
                    R$ {m.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
```

---

## Troubleshooting

### ❌ Arquivo não baixa
```
✅ Verificar: Pop-up blocker, settings de download
✅ Tentar: Desabilitar extensões, modo incógnito
```

### ❌ Agendamentos sumiram
```
✅ Verificar: localStorage ativo (não está em incógnito?)
✅ Verificar: Cookies/dados de site não foram limpos
✅ Verificar: Console de erros (F12 > Console)
```

### ❌ Formatação errada no Excel
```
✅ Verificar: Tipo de coluna correto? (moeda vs numero)
✅ Tentar: Refreshar formatação no Excel
✅ Tentar: Reabrir arquivo
```

---

## Próximos Passos

1. **Integrar em DespesasPage** - 10 minutos
2. **Integrar em FinanceiroPage** - 10 minutos
3. **Integrar em ProducaoPage** - 15 minutos
4. **Testar com dados reais** - 20 minutos
5. **Deploy** - Pronto!

---

## Referências

- **Documentação completa:** `/src/utils/INTEGRACAO_XLSX_EXPORT.md`
- **Exemplos:** `/src/EXEMPLO_INTEGRACAO.jsx`
- **Resumo geral:** `/FEATURES_IMPLEMENTATION_SUMMARY.md`

---

## Código Mínimo Funcional

```javascript
import { exportarRelatorioFinanceiro } from '@/utils/xlsxExportUtils';

function App() {
  const dados = [{ data: '2024-03-09', descricao: 'Teste', valor: 100 }];
  return (
    <button onClick={() => exportarRelatorioFinanceiro(dados, 'teste')}>
      Exportar
    </button>
  );
}
```

**Literalmente 6 linhas. Pronto para usar!**

---

## Dúvidas?

Ver: `/src/utils/INTEGRACAO_XLSX_EXPORT.md` (seção Troubleshooting)

Happy exporting! 📊✨
