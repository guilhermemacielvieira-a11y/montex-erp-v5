---
description: Checklist pré-deploy - validar antes de fazer push para main
---

Antes de fazer push para `main` (que dispara deploy no Vercel), validar:

## 1. Sintaxe
```bash
cd src/pages
for f in *.jsx; do
  node -e "
    const c = require('fs').readFileSync('$f', 'utf8');
    let d=0,p=0,b=0;
    /* contar braces, parens, brackets ignorando strings/comments */
    console.log('$f: braces=' + d + ', parens=' + p + ', brackets=' + b);
  " 2>&1 | grep -v "0, parens=0, brackets=0"
done
```

## 2. Imports válidos
```bash
grep -rE "^import .* from '\.\./" src/pages/ | while read line; do
  # verificar se arquivo existe
done
```

## 3. Bugs históricos não introduzidos (ver CLAUDE.md seção Bugs Comuns)

## 4. Branch sync
```bash
git fetch origin
git log HEAD..origin/main --oneline  # tem coisa nova no remote?
```

## 5. Status do último commit
```bash
git log -1 --stat
```

## 6. Sugerir testes manuais no Vercel após deploy
- /MontagemPage — KPIs corretos (peças vs unidades)
- /GestaoFinanceiraObra — Novo Lançamento persiste após F5
- /MontexERP3DPage — clicar em peça mostra detalhes + botão Marcar como Montada
- /DespesasPage — sem campo "Vincular à Obra"

Reportar em formato:
```
🟢 PRONTO PARA DEPLOY / 🟡 ATENÇÃO / 🔴 NÃO FAZER PUSH
```
