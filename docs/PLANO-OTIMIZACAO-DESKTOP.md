# Plano de Otimização DESKTOP — MONTEX ERP V5

> Foco: uso em PC/navegador desktop. O app **mobile** (`src/mobile/`, Capacitor → rota `/m`) é
> produto SEPARADO e **não** é misturado aqui. Tudo abaixo trata da experiência web desktop.
> Atualizado: 2026-06-06.

---

## 0. Já entregue nesta frente (commits locais)

| Commit | Entrega |
|---|---|
| `edd2255` | App abre direto no browser do PC: redirect mobile **device-aware** (só toca→/m) + `DEV_BYPASS` gateado por `import.meta.env.DEV` (login só em produção). |
| `b3c13f3` | Shell desktop a partir de **768px**; faixa **768–1023px** vira **trilho de ícones** (flyout no hover) em vez de cair no shell mobile. `sidebarCollapsed` derivado (`userCollapsed ‖ isCompact`). |

Validado ao vivo (preview 5180): 600px=mobile fallback · 900px=trilho desktop · 1440px=sidebar completa.

---

## 1. Mapa dos módulos (62 páginas · 54 navegáveis · 9 órfãs · 10 stubs)

### Dashboards & Command Center
- **VisaoGeralPage** (HUD sci-fi operacional) · **DashboardPremium** (BI executivo C-level) · **DashboardBI** (genérico — candidato a fusão).
- **CommandCenterUltrawide** (NEXUS 5K/49") · **CommandCenterUltra** (OMEGA 16:9) · **MontexERP3DPage** (IFC/Three.js).

### Comercial
- **OrcamentosPage** (CRUD + aprovações) · **SimuladorOrcamento** (2843 ln, fluxo 3 passos) · **Clientes** · **Projetos**.
- Órfã: **AprovacaoOrcamento** (workflow de aprovação — deveria estar dentro de Orçamentos).

### Suprimentos
- **EstoquePageV2** (canônico, paginação PostgREST) · **ComprasPage** · **ImportRomaneioPage** (XLSX) · **CroquisPage** · **DetalhamentosPage**.

### Produção (mais pesada)
- **KanbanProducaoIntegrado** (2744 ln, drag-drop) · **KanbanCortePage** · **ProducaoFuncionarioPage** · **AnaliseProducaoPage** · **DiarioProducaoPage** · **MontagemPage** (localStorage↔3D) · **EquipesPage** · **RHPage**.
- Órfãs/legado: **ProducaoPage**, **KanbanCorteIntegrado**, **AtualizacaoProducao**(105), **…Independente**(211, base44), **…Publica**(187).

### Expedição
- **EnviosExpedicaoPage** · **ExpedicaoIntegrado**.

### Obras
- **MultiObrasPage** · **GestaoObrasPage** · **MontagemPage** (dupla navegação).

### Medição
- **MedicaoAutomaticaPage** (funcional) · **MedicaoPage** (stub, `medicoes=[]`).

### Financeiro (10 páginas)
- **GestaoFinanceiraObra** (3404 ln, canônico) · **PainelFinanceiroGlobal** (4373 ln) · **FinanceiroPage** · **DespesasPage** · **ReceitasPage** · **MetasFinanceirasPage** · **AnaliseCustosPage** · **CentrosCustoPage** · **RelatoriosFinanceiros**(stub) · **DREPage**.

### BI
- **BIEstrategico** (C-level) · **BITatico** (gerencial) · **BIOperacional** (live). Separação por audiência — manter.

### Colaboração & IA (muitos stubs)
- **SugestoesIAPage** · **Tarefas** · **Analisador** · **Chatbot** · **Relatorios**(1301).
- Stubs: **RelatoriosIA**(110) · **ColaboracaoProjetos**(114) · **GerenciadorRelatorios**(134) · **AgendamentosRelatorios**(190) · **AssistenteTecnico**(310).

### Sistema
- **GestaoUsuariosPage** (completo) · **UsuariosPage** (legado — candidato a remoção).

---

## 2. Repensar o SIDEBAR para PC (proposta)

**Hoje:** 12 categorias, 8 abertas por padrão → muito scroll vertical; 2 modos (280px acordeão / 68px trilho+flyout).

**Melhorias propostas (incrementais):**
1. **Trilho de ícones como padrão em 768–1023** ✅ (feito). Flyout no hover já cobre a navegação.
2. **Favoritos / Fixados:** permitir o usuário fixar até ~6 módulos no topo do sidebar (persistir em localStorage). Acesso 1-clique aos módulos do dia a dia (ex.: GFO, Kanban Produção, Estoque, 3D).
3. **Recentes:** seção "Recentes" (últimas 4 páginas visitadas) abaixo dos favoritos.
4. **Acordeão exclusivo opcional:** abrir uma categoria fecha as outras (menos scroll) — toggle nas Config.
5. **Command Palette em evidência:** já existe (Ctrl+K) — adicionar dica visível na busca do sidebar ("⌘K") e permitir navegar para qualquer das 54 páginas por ele (hoje a busca do sidebar só filtra categorias).
6. **Densidade:** opção "compacto/confortável" (altura dos itens) nas Config de exibição.
7. **Estado por rota:** ao entrar numa página, abrir automaticamente a categoria dela e rolar até o item ativo.

---

## 3. Backlog priorizado (desktop)

### 🟢 Quick wins (baixo risco, alto valor)
- [x] **Busca global do sidebar → todas as páginas** (Enter navega; Esc limpa; dica ⌘K). — `9fae99a`
- [x] **Favoritos + Recentes no sidebar** (estrela fixa/desafixa; recentes auto; localStorage). — `9844dd4`
- [x] **Unificar Usuários**: removido `UsuariosPage` (legado, tema claro) do menu; mantido `GestaoUsuariosPage`. — `46a22b6`
- [~] **Auditoria do menu (concluída):** o menu NÃO tinha stubs/órfãs reais.
  Achados: (a) `EstoquePage` é alias de `EstoquePageV2` no pages.config (link OK);
  (b) os "stubs" do inventário (ColaboracaoProjetos, RelatoriosIA, …) são
  FUNCIONAIS (delegam a componentes reais, tema dark) — NÃO remover;
  (c) órfãs (MedicaoPage, KanbanCorteIntegrado, ProducaoPage, Atualizacao* ×3,
  AprovacaoOrcamento, AssistenteTecnico) estão só no pages.config, não no menu.
- [ ] **Re-tematizar `SimuladorOrcamento`** (única página do menu ainda em tema CLARO — destoa do dark; 2843 ln).
- [ ] **Limpar rotas órfãs do pages.config** (tech debt) — checar links de entrada antes (ex.: AprovacaoOrcamento pode ser aberto por OrcamentosPage; AtualizacaoProducaoPublica pode ser link público).
- [ ] **Mover AprovacaoOrcamento** para dentro de OrcamentosPage (aba/modal) em vez de página órfã.

### 🟡 Médio
- [x] **Auditoria de grids 768–1023px** (`b7f985e`): inserido `md:grid-cols-2` em 68 grids
  (`grid-cols-1 lg:grid-cols-N` → `+ md:grid-cols-2`) em 30 páginas. Faixa md agora usa 2 colunas
  em vez de 1. Validado @900px (DashboardPremium em 2 colunas). Grids fixos grid-cols-4/5 (stats
  compactas) e landing CommandCenterUltra (já responsiva) mantidos.
- [x] **MedicaoPage: mantida DEPRECIADA** (decisão do usuário, 2026-06-08): é stub redundante com
  MedicaoAutomaticaPage (a Medição oficial do menu, que já lê medicoesDB). Fica fora do roteamento.
- [x] **DataTable "em todas as necessárias" — concluído**: único `<table>` real fora do GFO é
  AnaliseCustosPage, que JÁ tem ordenação própria + paginação (não rebaixar). Demais páginas usam
  div/grid. Escopo de tabelas reais coberto pelo GFO.
- [x] **Componente `DataTable` criado** (`src/components/ui/DataTable.jsx`): sticky header, ordenação por coluna (3 estados), scroll-x contido, scroll-y opcional (maxHeight), tema dark, densidade, zebra, estado vazio. — primitivo reutilizável, risco zero (aditivo).
  - ACHADO: a maioria das páginas usa layout em **div/grid**, não `<table>` HTML. Só o **GFO** usa tabelas de verdade. Integração feita de forma incremental e verificada.
- [x] **GFO integrado ao DataTable** (`09d7860`, `dfcc09c`): 3 tabelas migradas com ordenação —
  Lançamentos (24 linhas), Pedido×Entrega (28 linhas + footer TOTAL), Fluxo de Caixa (8 linhas,
  Mês não-ordenável p/ manter cronologia). Preview do modal de importação CSV mantido (transitório).
  DataTable ganhou prop `footer` p/ linhas de total.
- [ ] **Faixa 768–1023 nas páginas internas:** auditar grids que assumem largura ampla (KPI cards, Recharts) e garantir `grid-cols` responsivos a partir de `md`.
- [ ] **Consolidar Kanban Corte**: remover `KanbanCorteIntegrado` (legado) e manter `KanbanCortePage`.
- [ ] **Unificar as 3 telas "Atualização Produção"** (órfãs base44/supabase/pública) em 1 modal reutilizável.
- [ ] **Dashboards:** decidir fusão de `DashboardBI` em Premium/VisãoGeral (remover redundância).

### ✅ Camada de Relatórios + tema global (`f6febec`)
- **CAUSA-RAIZ (global):** `main.jsx` usava `defaultTheme="system"` → com SO em modo claro, os
  componentes `ui/*` (Card/Tabs, que seguem tokens `bg-card/bg-muted`) renderizavam claros em todo
  o app (só mascarado por classes dark explícitas). Corrigido para `defaultTheme="dark"` →
  `html.dark` padrão; toggle preservado. Conserta tokens de tema em TODAS as páginas.
- **Relatórios re-tematizados:** classes claras explícitas das 4 páginas (RelatoriosIA,
  GerenciadorRelatorios, AgendamentosRelatorios, RelatoriosFinanceiros) + 12 componentes em
  `src/components/relatorios/`. Validado: RelatoriosIA e GerenciadorRelatorios 100% dark.
- NOTA: as páginas de relatório eram funcionais (delegam a componentes reais via base44Client→Supabase
  shim); não eram placeholders. O "incompleto" era visual (tema claro).

### 🔴 Maior esforço
- [ ] **Responsividade do Command Center Ultrawide** para telas não-5K (degradar grids).
- [ ] **Performance MontexERP3DPage**: parse IFC fora da main thread (worker) — hoje trava ~40s.
- [ ] **Camada de relatórios** (Relatorios/IA/Agendamento) — completar stubs ou descontinuar.

---

## 4. Princípios desktop (guia)
- Aproveitar largura: 2–4 colunas em ≥1280px; nunca uma coluna estreita centralizada.
- Hover, atalhos de teclado (Ctrl+K), densidade configurável — coisas que só existem no desktop.
- Tabelas com sticky header, ordenação e filtros; evitar scroll-x sempre que possível.
- Não importar padrões mobile (bottom-nav, sheets full-screen) para o desktop.
