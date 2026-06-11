# Acompanhamento Contínuo — MONTEX ERP V5

> Documento vivo de monitoramento, correções e melhorias do sistema.
> Mantido em conjunto (COWORK). Atualizado a cada ciclo de acompanhamento.

**Sistema:** MONTEX ERP Premium V5 (`montex-erp-premium` v2.1.0)
**Local do código:** `MONTEX-ERP-V5-DEPLOY/source/`
**Stack:** React 18 + Vite 6 + Electron + Supabase + Tailwind + i18next + Vitest

---

## ✅ Checklist Recorrente (rodar a cada ciclo)

Comandos a partir de `MONTEX-ERP-V5-DEPLOY/source/`:

1. **Quarentena macOS** — se a pasta foi recopiada/transferida:
   `xattr -d -r com.apple.quarantine node_modules 2>/dev/null`
2. **Dependências íntegras** — `npm install` (restaura módulos faltantes)
3. **Build** — `npm run build` (deve terminar com exit 0)
4. **Lint** — `npm run lint`
5. **Testes** — `npm test` (vitest)
6. **Git** — revisar `git status` / pendências não commitadas

Registrar resultado de cada ciclo na seção **Histórico** abaixo.

---

## 🔴 Pendências Abertas

| # | Tipo | Descrição | Status |
|---|------|-----------|--------|
| 1 | Ambiente | Pasta transferida com `node_modules` em quarentena (macOS) — binários nativos não carregavam | ✅ Resolvido (quarentena removida) |
| 2 | Ambiente | `node_modules` incompleto — faltavam `i18next`, `react-i18next`, `vitest` | 🔄 Em andamento (`npm install`) |
| 3 | Build | `npm run build` falhava ao resolver `i18next` em `src/i18n/index.js` | 🔄 Depende do #2 |

---

## 🟢 Melhorias Propostas (backlog)

- **3D — match preciso por marca:** o IFC do Tekla não expõe a marca; hoje colorimos a família VM/TL herdando o status do conjunto-pai (Strategy 7). Para marcação 1:1 por peça, extrair PropertySets `Assembly/Cast unit position code` + `Assembly/Cast unit name` no parser e ativar a Strategy 0 (já esboçada no código, mas depende dos `props` virem populados — na deploy atual `props` é `null`).
- **3D — chapas/parafusos:** 5.131 CHAPA + 4.021 Bolt assembly + porcas/arruelas ficam neutros (sem como associar a uma marca). Possível fase futura: associar via conjunto IFC (IFCRELAGGREGATES).
- **Dashboard (CommandCenterUltra):** investigar se "Saldo Caixa" deve mesmo ser igual a "Lucro Operacional" (`receita - despesa`) — hoje usam a mesma fórmula (`useFinancialIntelligence.js` ~L773).

## 🔎 Auditoria ERP-wide (mesmos problemas) — 2026-06-03

**Padrão A — Falha silenciosa em gravações Supabase:** ~28 ações de escrita no `ERPContext.jsx` faziam `catch { console.error }` sem re-propagar → UI mostrava sucesso falso (obras, orçamentos, estoque, peças, expedições, compras, medições, lançamentos, funcionários, equipes, máquinas, listas, materiais). **Corrigido** via re-throw em todas as ações de escrita (cargas/conexão preservadas).

**Padrão B — Sem refetch cross-device:** todos os dados carregam UMA vez no boot (`INIT_FROM_SUPABASE`); só existe `reloadPecas`. Lançamentos/medições/etc. nunca recarregam → mudanças feitas por OUTRO usuário/dispositivo só aparecem após reload completo. **Esta é a causa real do sintoma "lançamentos de outro usuário não persistem".** Fix proposto: `reloadLancamentos`/refetch em foco/visibilidade (a implementar/confirmar).

**Bugs adicionais observados (anotados):**
- `[EstoqueReal] ReferenceError: isSupabaseConfigured is not defined` (console em produção) — import/ref faltando em componente de estoque.
- `className` duplicado em `GestaoFinanceiraObra.jsx` (~L1987 e ~L2213): `className=" p-5"` sobrescreve className anterior, perdendo estilos.
- Texto de diálogo com escapes unicode literais: "Exclusão" / "ação" no modal de confirmação de exclusão de lançamento.

## 🧮 Análise Montagem — "47 × 58 × 62" (2026-06-03)

Conferido entre MontagemPage e 3D + Relatório de Importação. **Não havia bug de fluxo**: 47 = marcas distintas, 58 = unidades montadas (consistente nos dois módulos). A planilha "MONTAGEM BELO VALE 03-06.xlsx" tinha 49 linhas / 62 unidades; 58 marcadas, **4 unidades não conciliadas** (cadastro/typo):
- **TS48A** marca inexistente (tesouras só ≥ TS55A); **V28H** typo de `V128H` (que também não existe no banco); **C3A** planilha=2, banco=1 (falta +1); **TS69A** aparece 2× (planilha), banco=1 (falta +1).

**Decisão do usuário:** contar **por UNIDADES, não por marcas** (marca com qtd 3 = 3 peças). Aplicado nos cabeçalhos das colunas Kanban da MontagemPage (agora "58 un (47 marcas)"). **Manter 58 un como oficial** — usuário vai confirmar as 4 divergências (TS48A, V28H, C3A, TS69A) com o campo; quando confirmadas, cadastrar/splittar p/ chegar a 62.

## 🎯 3D — identificação correta das 58 unidades (2026-06-03)

**Sintoma:** 3D mostrava 47 (marcas) e o IFC pintava **1.134 elementos verdes** vs 58 unidades reais.
**Causas e correções (commits a06b4c8, 8475133):**
1. **Display:** painel de status do 3D agora conta por **unidades** (58), não marcas (47).
2. **Super-marcação (cor honesta):** MONTADO era propagado por tipo (família VIGA-MESTRA inteira, 5/7 montadas = maioria → 759 verdes) e por perfil (chapas/parafusos). Agora MONTADO só em **match preciso** (position code/marca); tipo/perfil = status de produção.
3. **PropertySets zerados (causa estrutural):** `extractPropertySets` re-buscava o pset via `GetLine` depois de já tê-lo flattened → `props=0`. Verificado no IFC real: existem 46.782 IfcRelDefinesByProperties com `Assembly/Cast unit position code`, `Profile`, `Assembly mark`. Corrigido p/ ler a estrutura flattened direto → **Strategy 0 (position code) habilitada**.

**Verificar após deploy:** recarregar o 3D (re-parseia o IFC com o parser corrigido) → `props` populados → montado colorido por peça física (~58, não 1.134).

**Refino aplicado (commit 92eb9a0):** (1) Strategy 0a — match por marca real do PropertySet (`Assembly/Part mark`); (2) `positionToPecaMap` quantity-aware — cada peça consome `quantidade` position codes → montados = unidades. Também removida duplicata `MontexERP3DPage 2.jsx` (artefato de cópia macOS).

**⚠️ Validação ao vivo PENDENTE:** extensão do Chrome offline desde o fim de 03/06 — não validei `propsPopulated>0` nem a contagem montado pós-deploy. Confirmar ao reconectar: recarregar 3D, checar `props` populados e montado ≈58. Se Assembly mark vier mascarado (TIPO0?), 0a é inócuo e vale a pena conferir se o nº de position codes por tipo ≈ unidades (senão refinar o mapeamento).

## 🐛 Correções Aplicadas

### 3D MontexERP3DPage — diagonais de VM não destacavam (2026-06-03)
**Causa raiz:** o `name` do elemento IFC é a CATEGORIA (`DIAGONAL-VM`, `VIGA-MESTRA`…), não a marca. As estratégias por marca (1–5) nunca casam; só perfil (6) casava (família VM = 0–4%). A **Strategy 7 (fallback por tipo) estava morta** (`matchedStatus` calculado e nunca gravado) e seu mapa não tinha as chaves de família.
**Correção (`src/pages/MontexERP3DPage.jsx`):**
1. `IFC_TO_ERP_TIPO_MAP` ganhou `VIGA-MESTRA`, `DIAGONAL-VM`/`MONTANTE-VM`/`MISULA`→VIGA-MESTRA, `DIAGONAL-TL`/`MONTANTE-TL`→TRELIÇA, `TERÇA-TAP`.
2. Ressuscitada a escrita de `matchedStatus` no `statusMap` (`else if (matchedStatus)`).
3. `getRepresentativeStatus` agora é montado-aware (verde quando montada).
**Resultado validado (dados reais):** DIAGONAL-VM/MONTANTE-VM/MISULA/VIGA-MESTRA → EM_OBRA (destacam); 3.557 elementos cobertos. ⚠️ Assunção a confirmar: `MISULA`→`VIGA-MESTRA`.

---

## 📋 Histórico de Ciclos

### Ciclo 1 — 2026-06-03
- Diagnóstico inicial do sistema (66 páginas, build quebrado).
- Identificada e removida quarentena macOS do `node_modules`.
- Identificadas dependências faltantes; `npm install` em execução.
- Criada infraestrutura de acompanhamento (este documento + memória).

### Ciclo 2 — 2026-06-09 · Segurança S1 (service_role) + migração de ambiente

> A partir deste ciclo o diário também é versionado no repo: `docs/ACOMPANHAMENTO-MONTEX.md`
> (visível no Codespace). Esta cópia (Desktop/iCloud) é espelho — a pasta antiga do Mac
> está sendo abandonada em favor do clone limpo `~/montex-fase0-recover` + Codespaces.

**Análise da branch de dev:** o fix S1 (remover service_role hardcoded) existia na branch
`fix/painel-financeiro-global-fases-1-4`, mas ela **diverge 603 commits da `main`** e nunca
foi mergeada → **produção (`5a897af`) seguia vazando a service_role key**. Mergear aquela
branch é inviável (reverteria prod). Decisão: re-aplicar o fix sobre a `main` atual.

**Entregue (branch nova `fix/seguranca-service-key-prod`, a partir da `main`):**
- `bf1c88a` — remove o JWT service_role hardcoded de `GestaoUsuariosPage.jsx` (S1 em código/git).
- `f122e74` — **Edge Function `admin-users`** (servidor) consolida as ops privilegiadas
  (`list_profiles`/`create_user`/`update_profile`/`reset_password`); `supabaseClient.js`:
  `supabaseAdmin = null`, novo `invokeAdminFunction()`, leitura de `VITE_SUPABASE_SERVICE_KEY`
  **removida** → a service_role nunca mais entra no bundle (web/Electron/Capacitor).
- `616e570` — remove anon key hardcoded de `reset-obra.mjs` e `migrate-to-supabase.js` (via env).

**Decisão registrada:** **NÃO setar `VITE_SUPABASE_SERVICE_KEY` na Vercel** — toda var `VITE_*`
é inlinada no bundle, então setá-la reabriria o S1. As tabelas "restritas" (orçamentos, compras…)
já funcionam pelo anon (RLS v10), então não dependem da service key.

**Pendências deste ciclo (ordem):**
1. ⏳ Abrir/mergear o PR de `bf1c88a` (e o restante da branch) → deploy.
2. ⏳ `supabase functions deploy admin-users` (sem isso a tela de Gestão de Usuários falha).
3. ⏳ **Rotacionar a service_role key** (tratar como comprometida — está no histórico git e em
   bundles publicados). Fazer **depois** do deploy da função, numa tacada só.
4. 🔜 Fase 1 (auth real): adicionar verificação de JWT + role admin na Edge Function (TODO no
   handler) e aplicar a RLS por papel (`migration_v12`, já escrita).

**Follow-up aberto:** `src/components/admin/InviteUserModal.jsx:75` insere em `user_profiles`
com o cliente anon (RLS bloqueia) — rotear pela Edge Function `create_user` quando for usado.
