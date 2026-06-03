---
description: Auditoria completa dos dados do ERP no Supabase
---

Use o agente `montex-data-auditor` para fazer auditoria completa:

1. **Reconciliação Super Luna**:
   - Soma peso peças `etapa=enviado` vs soma `expedicoes.peso_total`
   - Peças órfãs (enviado sem romaneio)
   - Validar 47 peças montadas (entity_store)

2. **Lançamentos atrasados**:
   - Despesas vencidas + não pagas
   - Total em R$ por obra/categoria

3. **Peças sem obra**:
   - `pecas_producao.obra_id IS NULL`

4. **Obras com inconsistência**:
   - Soma peças vs `contrato_peso_total`
   - Soma medições vs `contrato_valor_total`

5. **entity_store integrity**:
   - IDs em `montagem_concluidas_global` que não existem mais em `pecas_producao`

Gerar relatório em markdown com:
- Resumo executivo
- Críticos
- Avisos
- Tudo ok

Não modificar dados, apenas auditar. Sugerir correções quando necessário.
