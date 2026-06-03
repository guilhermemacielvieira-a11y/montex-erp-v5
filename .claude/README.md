# Claude Code · MONTEX ERP

Configuração para usar Claude Code como agente permanente do MONTEX ERP.

## Estrutura

```
.claude/
├── README.md                 ← este arquivo
├── agents/                   ← agentes especializados
│   ├── montex-reviewer.md       — revisor crítico (pré-commit)
│   ├── montex-data-auditor.md   — auditor de dados Supabase
│   └── montex-feature-builder.md — construtor de features
└── commands/                 ← slash commands
    ├── verify.md                — /verify  (saúde do código)
    ├── audit.md                 — /audit   (auditoria Supabase)
    └── deploy-check.md          — /deploy-check (checklist pré-push)

CLAUDE.md                     ← contexto persistente do projeto (raiz)
scripts/montex_audit.py       ← script de auditoria autônoma
```

## Como usar

### 1. Toda sessão Claude lê o CLAUDE.md automaticamente
Ele contém:
- Regras de negócio críticas (não-quebráveis)
- Bugs históricos para evitar
- Schema Supabase
- Convenções de código
- Paleta de cores
- Como rodar git no sandbox arm64

### 2. Slash commands no Claude Code
Dentro do diretório do projeto, digite:
- `/verify` → roda checklist de saúde
- `/audit` → conecta no Supabase e gera relatório
- `/deploy-check` → valida antes de push

### 3. Agentes especializados
Para tarefas focadas, invoque um agente específico:
- **montex-reviewer** — antes de commitar mudanças críticas
- **montex-data-auditor** — quando precisar verificar dados reais
- **montex-feature-builder** — para implementar novas features seguindo padrões

### 4. Auditoria autônoma via script
```bash
# Auditoria de todas obras
python3 scripts/montex_audit.py

# Salvar como markdown
python3 scripts/montex_audit.py > docs/audit-$(date +%Y-%m-%d).md

# Auditoria de uma obra específica
python3 scripts/montex_audit.py --obra obra-001
```

### 5. Agendamento automático (opcional)
Para auditoria diária via cron:
```bash
# crontab -e
0 8 * * * cd /path/to/MONTEX-ERP-V5-DEPLOY/source && python3 scripts/montex_audit.py > /tmp/montex_audit_$(date +\%Y\%m\%d).md
```

Ou via scheduled tasks do próprio Claude (chat principal):
```
"Rode auditoria do MONTEX todo dia às 8h e me envie por email"
```

## Princípios

1. **CLAUDE.md é fonte da verdade** — qualquer agente lê e respeita
2. **Bugs históricos catalogados** — nunca quebrar regras de negócio listadas
3. **Auditoria como rotina** — verificar dados regularmente, não só quando há reclamação
4. **Pequenos commits, mensagens descritivas** — facilita reverter se necessário
5. **Deploy contínuo** — push em `main` = deploy automático no Vercel

## Próximos passos sugeridos

- [ ] Configurar GitHub Action que roda `montex_audit.py` semanalmente e cria issue se houver críticos
- [ ] Adicionar testes unitários para helpers críticos (`parseLocalDate`, `statusFromEtapa`)
- [ ] Documentar API do ERPContext (hooks `useObras`, `useProducao`, etc.)
- [ ] Migrar credenciais hardcoded para variáveis de ambiente do Vercel
