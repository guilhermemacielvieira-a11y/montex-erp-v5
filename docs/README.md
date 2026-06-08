# Documentação MONTEX ERP V5

Planos canônicos e documentação técnica versionados no repositório
para que clones em outras máquinas (Mac 2, etc.) tenham acesso direto.

## Planos de sincronização e migração

- **[PLANO-SINCRONIZACAO-2PCS-v2.md](PLANO-SINCRONIZACAO-2PCS-v2.md)** —
  Plano endurecido (v2) para sincronização entre 2 PCs (Mac 1 e Mac 2)
  trabalhando no mesmo repo MONTEX. Cobre clone limpo fora do iCloud,
  `npm ci`, regras de pull/push, rotação coordenada da service key.

- **[ANALISE-CONFORMIDADE-PLANO-v2.md](ANALISE-CONFORMIDADE-PLANO-v2.md)** —
  Análise da conformidade do código atual com o plano v2. Detalha o estado
  do `supabaseAdmin`, do fallback hardcoded, e da migration_v10 (CRUD anon).

- **[VERIFICACAO-PROMPT-MAC2.md](VERIFICACAO-PROMPT-MAC2.md)** —
  Verificação do prompt "Mac 2 — clone limpo + sequência" contra o git real,
  apontando o que já foi resolvido e o que ainda precisa de ação.

## Documentação técnica

- **[PLANO-OTIMIZACAO-DESKTOP.md](PLANO-OTIMIZACAO-DESKTOP.md)** —
  Plano de otimização e modernização da experiência desktop (sidebar com
  Favoritos/Recentes, code-splitting, theme dark global, faixa 768–1023px).

- **[SUPABASE-API.md](SUPABASE-API.md)** —
  Referência das funções de acesso ao Supabase (CRUD genérico, helpers).

- **[supabase-storage-policies.sql](supabase-storage-policies.sql)** —
  Policies do Supabase Storage (buckets `evidencias`, `ifc`, etc.).

## Convenção

Planos que afetem múltiplas máquinas devem viver aqui (`source/docs/`),
não na raiz fora de `source/` — assim o `git clone` os leva junto.
