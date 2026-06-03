---
description: Verifica saúde do ERP - sintaxe, imports, build readiness, último commit
---

Verifique o estado do ERP MONTEX:

1. **Git status** — arquivos não commitados ainda?
   ```bash
   git status --short
   git log --oneline -5
   ```

2. **Validação sintaxe** — todas as páginas em `src/pages/`:
   - Contar braces/parens balanceados
   - Detectar imports não usados
   - Procurar `console.error`/`warn` recentes

3. **Bugs históricos** (grep no código):
   ```bash
   # Status hardcoded
   grep -rn "status: STATUS_LANCAMENTO" src/pages/ | grep -v "status: novoLanc.status"

   # parseLocalDate ausente
   grep -rn "new Date('" src/pages/

   # Select.Item value="" (vazio)
   grep -rn 'Select\.Item value=""' src/pages/
   ```

4. **Build readiness** — verificar `package.json` e estrutura:
   - Imports apontam para arquivos existentes?
   - Dependências instaladas (`xlsx`, `web-ifc`, `three`, etc.)?

5. **Deploy status** — último push e estimativa:
   - Commit mais recente
   - Tempo desde último push
   - URL Vercel para teste

Reporte em até 200 palavras com semáforo (🟢 OK / 🟡 atenção / 🔴 bloqueio).
