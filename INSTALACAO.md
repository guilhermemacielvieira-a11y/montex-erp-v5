# MONTEX ERP Premium - Guia de Instalação

## Obra: SUPER LUNA - BELO VALE
## Cliente: CONSTRUTORA CARMO LTDA
## Contrato: R$ 2.700.000,00 | 107.000 kg

---

## Requisitos do Sistema

- **Node.js**: v18.x ou superior (recomendado v20.x)
- **npm**: v9.x ou superior
- **Sistema Operacional**: Windows 10/11, macOS 12+, ou Linux Ubuntu 20.04+

---

## Instalação Rápida

### 1. Extrair o arquivo ZIP
```bash
unzip MONTEX-ERP-Premium-SuperLuna.zip
cd montex-erp-premium
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Iniciar servidor de desenvolvimento
```bash
npm run dev
```

### 4. Acessar o sistema
Abra o navegador em: **http://localhost:5173**

---

## Módulos Implementados

### Dashboard Principal
- Visão geral consolidada
- KPIs em tempo real
- Gráficos de progresso

### Comercial (Fluxo 1)
- Orçamentos
- Simulador de Orçamento (com base de preços GERDAU)
- Clientes
- Projetos

### Suprimentos (Fluxo 2)
- Import Listas (GADE)
- Estoque
- **Controle Pedido x Entrega** (NOVO)

### Produção - Fábrica (Fluxo 3)
- Kanban Corte
- Kanban Produção
- Medição Automática (R$/kg)
- Por Funcionário
- Diário de Produção
- Equipes

### Expedição (Fluxo 4)
- Envios
- Romaneios Integrado

### Obras - Campo (Fluxo 5)
- Multi-Obras
- Montagem
- Medição Obra

### Financeiro
- **Gestão Financeira da Obra** (DRE Completo)
  - Dashboard financeiro
  - DRE da Obra
  - Lançamentos
  - Futuro vs Real
  - Pedido x Entrega (Estoque)
  - Medições
  - Por Setor
  - Fluxo de Caixa
- Painel Financeiro
- Receitas
- Despesas
- Metas Financeiras
- Análise de Custos
- Centros de Custo

### Business Intelligence
- BI Estratégico (C-Level)
- BI Tático (Gerencial)
- BI Operacional (LIVE)
- BI Analytics

### Command Center
- Simulador
- Dashboard HUD
- Ultrawide 49"
- Command Ultra

---

## Dados Reais Implementados (SUPER LUNA)

### Notas Fiscais GERDAU (Pagas)
| NF | Valor | Data |
|---|---|---|
| NF-218191 | R$ 38.932,09 | 26/01/2026 |
| NF-218270 | R$ 40.896,70 | 26/01/2026 |
| NF-218461 | R$ 63.299,32 | 27/01/2026 |
| NF-218469 | R$ 76.424,49 | 27/01/2026 |
| NF-218470 | R$ 49.024,33 | 27/01/2026 |
| NF-218558 | R$ 26.959,29 | 27/01/2026 |
| NF-218560 | R$ 51.102,64 | 28/01/2026 |
| NF-218586 | R$ 126.250,00 | 28/01/2026 |
| **TOTAL** | **R$ 472.888,86** | |

### Medições Pagas (Receitas)
| Descrição | Valor | Data |
|---|---|---|
| ENTRADA 1/2 | R$ 135.000,00 | 19/12/2025 |
| CORTE CHAPAS | R$ 135.000,00 | 08/01/2026 |
| **TOTAL** | **R$ 270.000,00** | |

### Pedidos Pré-Aprovados (Despesas Futuras)
- Total GERDAU: **R$ 544.688,39**
- Não impacta saldo real da obra

### Material Entregue (28 itens)
- Valor Total Entregue: **R$ 369.858,53**
- Materiais com pendência: 3 itens

---

## Build para Produção

### Build Web
```bash
npm run build
npm run preview
```

### Build Electron (Desktop)
```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux

# Todas as plataformas
npm run electron:build:all
```

Os executáveis serão gerados na pasta `release/`.

---

## Estrutura de Arquivos

```
montex-erp-premium/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   ├── contexts/       # Contextos React (ERPContext)
│   ├── data/           # Bases de dados
│   │   ├── database.js           # Dados gerais ERP
│   │   ├── obraFinanceiraDatabase.js  # Financeiro obra
│   │   └── precosDatabase.js     # Base preços GERDAU
│   ├── pages/          # Páginas/Módulos
│   ├── lib/            # Utilitários
│   └── Layout.jsx      # Layout principal
├── electron/           # Configuração Electron
├── public/             # Assets públicos
├── package.json        # Dependências
└── vite.config.js      # Configuração Vite
```

---

## Suporte

**Grupo MONTEX**
- Email: contato@grupomontex.com.br

---

*Versão: 1.0.0 | Data: Fevereiro 2026*
