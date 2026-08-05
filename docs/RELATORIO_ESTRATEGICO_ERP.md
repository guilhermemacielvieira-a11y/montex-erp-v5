# Relatório Estratégico de Engenharia — MONTEX ERP V5
**Preparado por:** Claude (atuando como CTO/consultor de engenharia)
**Data:** 2026-06-14 · **Escopo:** revisão de todo o sistema (código, fluxos, dados, segurança, performance, qualidade) e plano de implantação da próxima atualização.
**Base factual:** análise estática do repositório + audit ao vivo do banco (Supabase advisors, 2026-06-14).

---

## 1. Sumário Executivo

O MONTEX ERP V5 é um sistema **ambicioso e funcionalmente rico** — ~143.700 linhas em `src`, 68 páginas desktop + 17 telas mobile, 38 tabelas, super-app mobile com offline/sync e visualizador 3D IFC. É um produto real, em produção, gerando valor. **Maturidade geral estimada: 6,3/10** — forte em cobertura funcional e UX operacional, frágil em segurança de dados, consistência de fonte de verdade e sustentabilidade do código.

**Top 5 riscos (ordenados por severidade):**
1. 🔴 **Senha hardcoded no bundle** (`UsuariosPage.jsx:143` → `password: 'Montex@2025'`) — credencial versionada e distribuída ao cliente.
2. 🔴 **RPCs `SECURITY DEFINER` executáveis pelo papel `anon`** — `get_financeiro_resumo`, `get_dashboard_stats`, `get_producao_por_obra`, `get_user_role`, `rls_auto_enable` podem ser chamadas **sem login** e **furam a RLS** (a função roda como o criador). Exposição potencial de dados financeiros/produção.
3. 🟠 **Dupla fonte de verdade**: 11 arquivos ainda importam mocks locais (`src/data/database.js` etc.) em paralelo ao Supabase → divergência silenciosa de dados.
4. 🟠 **Risco sistêmico de timezone**: 640 usos de `new Date(...)` vs 51 de `parseLocalDate` — o bug histórico "-1 dia" (regra #2/#3 do CLAUDE.md) está latente em toda a base.
5. 🟠 **Sustentabilidade do código**: arquivos de 2.000–4.400 linhas (PainelFinanceiroGlobal 4.404, GFO 3.335, 3D 2.870, Simulador 2.850, ERPContext 2.167) elevam custo de mudança e risco de regressão.

**Top 5 oportunidades (alto retorno):**
1. Blindagem de segurança em 1–2 dias (remove senha do bundle, revoga EXECUTE de RPCs para `anon`, corrige views/funções) — **maior ROI de risco**.
2. Unificar fonte de verdade (matar mocks) → confiabilidade dos números.
3. Higiene de banco (índices de FK, remover ~50 índices ociosos + 1 duplicado, `ANALYZE`) — ganho de performance com baixo esforço.
4. Reduzir bundle (libs duplicadas: `moment`+`date-fns`; `@dnd-kit`+`@hello-pangea/dnd`) e code-splitting das páginas pesadas.
5. Elevar cobertura de testes nas regras críticas (financeiro, timezone, permissões) — a fundação de teste já existe (77 testes, CI verde).

**Recomendação:** executar uma **Onda 0 de segurança imediata** (hotfix), depois um roadmap faseado de 4 ondas ao longo de ~6–8 semanas, sem congelar a entrega de features.

---

## 2. Retrato do Sistema (dados reais)

| Dimensão | Valor |
|---|---|
| Linhas de código (`src`, JS/JSX) | ~143.725 |
| Páginas desktop / telas mobile | 68 / 17 |
| Contexts React | 5 (ERPContext, Producao, Estoque, Display, Notification) |
| Dependências de produção | 74 |
| Tabelas no banco (todas com RLS) | 38 |
| Edge Functions | admin-users, notify-pending, send-push (+ smooth-function na branch) |
| Migrations | 3 em `migrations/` + 15 `.sql` soltas |
| Arquivos de teste / testes | 4 / 77 |
| `console.*` no código | 411 · **TODO/FIXME:** 30 |

**Volumetria real (linhas por tabela):** `producao_historico` 2.779 · `materiais_corte` 2.667 · `pecas_producao` 2.160 · `entity_store` 1.767 · `lancamentos_despesas` 777 · `tarefas` 231 · `painel_financeiro_global` 218. Demais tabelas com contagem baixa/zero (algumas por estatística desatualizada — recomenda-se `ANALYZE` —, outras por **módulos construídos e não usados**: `pp_*`, `fornecedores`, `maquinas`).

**5 maiores arquivos:** `PainelFinanceiroGlobal.jsx` (4.404), `GestaoFinanceiraObra.jsx` (3.335), `MontexERP3DPage.jsx` (2.870), `SimuladorOrcamento.jsx` (2.850), `data/database.js` (2.789).

---

## 3. Diagnóstico por Dimensão

### 3.1 Segurança — **CRÍTICO (P0)**

**Achados (audit Supabase + código):**
- 🔴 **Senha em texto no bundle** (`UsuariosPage.jsx:143`). Qualquer usuário do app tem acesso ao JS e à string.
- 🔴 **2 views `SECURITY DEFINER`** (`pp_v_takt`, `pp_v_campo`) → rodam com permissões do criador, ignorando RLS de quem consulta. [linter 0010](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)
- 🔴 **RPCs `SECURITY DEFINER` chamáveis por `anon` e `authenticated`**: `get_financeiro_resumo(p_obra_id)`, `get_dashboard_stats()`, `get_producao_por_obra(p_obra_id)`, `get_user_role()`, `rls_auto_enable()`. Via `/rest/v1/rpc/...` **sem autenticar**. [linter 0028](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- 🟠 **8 funções com `search_path` mutável** (get_user_role, update_updated_at_column, validate_obra_id, get_dashboard_stats, get_producao_por_obra, get_financeiro_resumo, touch_push_tokens, rls_auto_enable) — risco de *search_path hijacking*. [linter 0011](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- 🟠 **Extensão `pg_net` no schema `public`**. [linter 0014](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public)
- 🟠 **Proteção contra senhas vazadas (HaveIBeenPwned) desabilitada** no Auth.
- 🟡 **Credenciais a rotacionar** (do CLAUDE.md): GitHub PAT e secret Supabase legado.

**Positivo:** RLS habilitada em **todas as 38 tabelas**; service_role já **removida do cliente** (`supabaseAdmin` sempre `null`); operações privilegiadas via Edge Function.

**Ações:**
1. Remover a senha hardcoded; usar geração aleatória server-side (já existe `gerarSenha`/`generatePassword`).
2. `REVOKE EXECUTE ... FROM anon, authenticated` nas RPCs que não devem ser públicas; ou convertê-las para `SECURITY INVOKER`; ou movê-las para um schema não exposto.
3. Recriar as 2 views sem `SECURITY DEFINER` (ou `security_invoker=on`).
4. `ALTER FUNCTION ... SET search_path = ''` nas 8 funções.
5. Mover `pg_net` para schema `extensions`.
6. Ativar leaked-password protection e rotacionar as credenciais expostas.

### 3.2 Arquitetura & Código

- **Component/God-file bloat:** 6+ arquivos acima de 2.000 linhas. Concentram lógica de dados, UI e regras — difícil testar, alto risco de regressão. `ERPContext.jsx` (2.167) é um monólito de estado.
- **Dupla fonte de verdade:** 11 arquivos importam `data/database.js` (mock) enquanto o restante usa Supabase → números podem divergir conforme a tela.
- **`entity_store` como "catch-all"** (1.767 linhas): padrão flexível, mas vira lixão de estado (montagem, overrides, configs) sem schema — dificulta consistência e auditoria.
- **Ruído de produção:** 411 `console.*` e 30 TODO/FIXME no bundle.
- **Dependências redundantes:** `moment` **e** `date-fns` (datas); `@dnd-kit/*` **e** `@hello-pangea/dnd` (drag-and-drop); `html2pdf.js` + `jspdf` + `html2canvas` + `docx` + `xlsx` (exportação) — peso e inconsistência.

**Ações:** padronizar 1 lib por função; extrair regras de negócio dos "god files" para hooks/serviços testáveis; strip de `console.*` no build; plano de aposentadoria dos mocks.

### 3.3 Modelo de Dados & Integridade

- **Tabelas duplicadas/legadas:** `usuarios` (marcada *DEPRECATED*), e **duas** tabelas de medição — `medicoes` e `medicoes_receitas` — fonte de ambiguidade (o app usa `medicoes`).
- **Módulos fantasma:** várias tabelas sem uso real (`pp_casas/paredes/kits/pit/eventos`, `fornecedores`, `maquinas`) — custo de manutenção sem retorno.
- **Timezone (bug histórico #2/#3):** 640 `new Date(...)` vs 51 `parseLocalDate` → datas `'YYYY-MM-DD'` viram -1 dia em UTC-3 em muitos pontos ainda não migrados.
- **Paginação PostgREST:** `pecas_producao` = 2.160 linhas (>1000) — dependente da paginação do `createCrud` (regra #4); qualquer query nova precisa respeitar isso.
- **Migrations desorganizadas:** 15 `.sql` soltas + 3 em `migrations/` → sem histórico linear confiável de schema.

**Ações:** consolidar medições numa tabela; remover/depreciar formalmente tabelas fantasma; varredura assistida para migrar `new Date(str)` → `parseLocalDate`; unificar migrations sob `supabase/migrations` versionadas.

### 3.4 Performance

- **5 foreign keys sem índice** (`croquis`, `detalhamentos`, `pp_eventos`, `pp_pit_registros`×2) — joins/deleções custosas. [linter 0001](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)
- **~50 índices nunca usados** + **1 índice duplicado** (`funcionarios`: `idx_funcionarios_equipe` = `idx_funcionarios_equipe_id`) — overhead de escrita e storage. [linter 0005](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
- **Bundle pesado:** `three` + `web-ifc` (3D/IFC), múltiplas libs de PDF/planilha, `recharts`, `framer-motion`, `leaflet`. Sem *code-splitting* agressivo, o first-load sofre no canteiro (rede fraca).

**Ações:** criar índices das 5 FKs; dropar duplicado e índices comprovadamente ociosos; `ANALYZE`; lazy-load pesado (3D/relatórios) já parcialmente feito — estender; medir bundle (`rollup-plugin-visualizer`).

### 3.5 Qualidade, Testes e CI

- **Cobertura baixa:** 4 arquivos de teste (77 casos) para ~143k LOC. Núcleos de risco (financeiro, timezone, permissões) pouco cobertos — **exceto** o modelo de acesso, que acabou de ganhar suíte dedicada.
- **CI saudável:** pipeline com *Lint & Build* + *Tests* + *Vercel*, verde. Base sólida para crescer.

**Ações:** metas de cobertura por módulo crítico; testes de regressão para os bugs históricos (status hardcoded, -1 dia, paginação, dedupe); *smoke tests* de fluxo (orçamento→produção→expedição→montagem→medição).

### 3.6 UX / Mobile / Acessibilidade

- **Forte:** super-app mobile com fila offline, sync via `entity_store`, permissões por módulo (recém-reforçadas), scanner/bipagem, 3D touch-nativo, foco visível.
- **Oportunidades:** consolidar dashboards redundantes (VisaoGeral/Premium/Ultrawide/Ultra) num só configurável; padronizar estados vazios/erro; auditoria WCAG (contraste/labels) no desktop.

---

## 4. Backlog Priorizado

| # | Item | Dim. | Impacto | Esforço | Prioridade |
|---|---|---|---|---|---|
| 1 | Remover senha hardcoded do bundle | Segurança | Alto | XS | **P0** |
| 2 | Revogar EXECUTE / `SECURITY INVOKER` nas RPCs anon | Segurança | Alto | S | **P0** |
| 3 | Corrigir 2 views `SECURITY DEFINER` | Segurança | Alto | S | **P0** |
| 4 | `search_path` fixo nas 8 funções | Segurança | Médio | S | **P0** |
| 5 | Ativar leaked-password + rotacionar credenciais | Segurança | Médio | S | **P0** |
| 6 | Índices nas 5 FKs + dropar duplicado | Performance | Médio | S | **P1** |
| 7 | Migrar `new Date(str)`→`parseLocalDate` (crítico) | Dados | Alto | M | **P1** |
| 8 | Aposentar mocks / fonte única de dados | Arquitetura | Alto | M | **P1** |
| 9 | Consolidar `medicoes`/`medicoes_receitas` e `usuarios` | Dados | Médio | M | **P1** |
| 10 | Testes de regressão dos bugs históricos | Qualidade | Alto | M | **P1** |
| 11 | Deduplicar libs (datas, DnD, export) | Arquitetura | Médio | M | **P2** |
| 12 | Quebrar "god files" (Financeiro, 3D, Simulador) | Arquitetura | Alto | L | **P2** |
| 13 | Remover índices ociosos + `ANALYZE` | Performance | Baixo | S | **P2** |
| 14 | Code-splitting + medição de bundle | Performance | Médio | M | **P2** |
| 15 | Consolidar dashboards; strip `console.*` | UX/Build | Baixo | S | **P2** |
| 16 | Depreciar módulos fantasma (`pp_*`, etc.) | Dados | Baixo | S | **P2** |

*(XS≈horas · S≈1 dia · M≈2–4 dias · L≈1–2 semanas)*

---

## 5. Plano de Implantação da Atualização (4 ondas + Onda 0)

**Onda 0 — Hotfix de Segurança (1–2 dias) — pode ir junto do deploy atual**
Itens 1–5. Critério de pronto: `get_advisors(security)` sem ERROR e sem RPC anon indevida; senha fora do bundle; auditoria confirma. Risco: baixo (mudanças cirúrgicas + migrations idempotentes).

**Onda 1 — Fundações de Confiabilidade (1–2 semanas)**
Itens 6, 7, 8, 10. Objetivo: números confiáveis e regressões travadas. Critério: mocks isolados atrás de flag e removidos das telas de produção; varredura de datas concluída nos módulos financeiro/produção; suíte de regressão verde no CI.

**Onda 2 — Dados & Performance (1 semana)**
Itens 9, 13, 16 + `ANALYZE`. Objetivo: schema limpo e rápido. Critério: uma tabela de medição; advisors de performance reduzidos; nenhuma tabela fantasma referenciada no código.

**Onda 3 — Sustentabilidade do Código (2–3 semanas, incremental)**
Itens 11, 12, 14. Objetivo: reduzir custo de mudança. Estratégia: refatorar **um** god file por sprint, extraindo regras para hooks/serviços com teste antes de mexer. Critério: nenhum arquivo novo >800 linhas; bundle inicial medido e reduzido.

**Onda 4 — Qualidade Contínua & Observabilidade (contínua)**
Item 15 + metas de cobertura + logs estruturados (substituir `console.*` por logger com níveis) + alertas de erro (ex.: Sentry). Objetivo: operar com visibilidade.

**Princípios de rollout:** cada onda entra por PR com CI verde (o pipeline atual já suporta); mudanças de banco via migration idempotente + `get_advisors` antes/depois; feature-flags para trocas de fonte de dados; nada de big-bang.

---

## 6. Métricas de Sucesso (KPIs)

| KPI | Hoje | Meta (8 semanas) |
|---|---|---|
| Advisors de segurança (ERROR) | 2 | 0 |
| RPCs executáveis por `anon` indevidas | 5 | 0 |
| Arquivos >2.000 linhas | 6+ | ≤2 |
| `new Date(str)` não migrados (módulos críticos) | alto | 0 |
| Telas usando mock local | 11 | 0 |
| Cobertura de testes (módulos críticos) | baixa | ≥60% |
| Índices ociosos / duplicados | ~50 / 1 | <10 / 0 |
| FKs sem índice | 5 | 0 |

---

## 7. Próximos Passos Imediatos (posso executar já)

1. **Onda 0 agora:** já tenho acesso ao Supabase via MCP — posso gerar as migrations de segurança (revogar EXECUTE, `search_path`, views, `pg_net`) e o patch que remove a senha do bundle, tudo em modo *prévia → aplica*, com `get_advisors` antes/depois para provar a correção.
2. **Varredura de datas:** gerar relatório dos 640 `new Date(str)` marcando os de risco real (parsing de string de data) para migração priorizada.
3. **Higiene de índices:** migration que cria as 5 FKs e remove o índice duplicado (impacto imediato, risco baixo).

> Cada passo entra como PR com CI verde e, no banco, via migration idempotende com verificação `get_advisors`. Diga por qual começamos que eu implemento.
