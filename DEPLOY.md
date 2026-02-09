# MONTEX ERP V5 — Guia de Publicação Online

## Resumo da Arquitetura

O sistema utiliza a seguinte stack para funcionar online:

- **Frontend**: React + Vite (hospedado na Vercel)
- **Banco de Dados**: PostgreSQL (hospedado no Supabase)
- **API**: Supabase auto-generated REST API (não precisa criar backend separado)
- **Autenticação**: Supabase Auth (já configurado no schema)

O ERP funciona em modo híbrido: se o Supabase estiver configurado, usa dados do banco na nuvem. Caso contrário, usa os dados locais do JavaScript (comportamento atual).

---

## PASSO 1 — Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e clique em **Start your project**
2. Faça login com GitHub ou Google
3. Clique em **New Project**
4. Preencha:
   - **Organization**: selecione ou crie uma (ex: "Grupo Montex")
   - **Project name**: `montex-erp`
   - **Database password**: anote essa senha em local seguro
   - **Region**: escolha `South America (São Paulo)` para menor latência
5. Clique em **Create new project** e aguarde ~2 minutos

---

## PASSO 2 — Criar as Tabelas (Schema)

1. No painel do Supabase, clique em **SQL Editor** no menu lateral
2. Clique em **New query**
3. Abra o arquivo `supabase/schema.sql` do projeto no seu editor de texto
4. Copie **TODO** o conteúdo do arquivo e cole no SQL Editor do Supabase
5. Clique em **Run** (ou Ctrl+Enter)
6. Deve aparecer a mensagem "Success. No rows returned"

Isso cria 11 tabelas: `usuarios`, `obras`, `funcionarios`, `equipes`, `equipe_membros`, `lancamentos_despesas`, `medicoes_receitas`, `composicao_contrato`, `pedidos_pre_aprovados`, `estoque`, `diario_producao`, além de views, indexes e triggers.

---

## PASSO 3 — Popular com Dados Iniciais (Seed)

1. Ainda no **SQL Editor**, clique em **New query**
2. Abra o arquivo `supabase/seed.sql` do projeto
3. Copie **TODO** o conteúdo e cole no SQL Editor
4. Clique em **Run**
5. Deve aparecer "Success. No rows returned"

Isso insere todos os dados atuais do ERP: 1 obra (Super Luna), 22 funcionários, 4 equipes, 10 lançamentos de despesas, 6 composições de contrato e 2 pedidos.

Para verificar, vá em **Table Editor** no menu lateral e clique em qualquer tabela para ver os registros.

---

## PASSO 4 — Obter as Credenciais

1. No painel do Supabase, vá em **Settings** (ícone de engrenagem) → **API**
2. Copie os dois valores:
   - **Project URL**: algo como `https://xyzcompany.supabase.co`
   - **anon / public key**: uma string longa começando com `eyJ...`

Esses são os valores que você vai usar no próximo passo.

---

## PASSO 5 — Configurar Variáveis de Ambiente no Projeto

1. Na raiz do projeto (pasta `source/`), crie um arquivo chamado `.env`
2. Adicione o seguinte conteúdo (substituindo pelos seus valores):

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.SEU_TOKEN_AQUI
```

3. Salve o arquivo

Para testar localmente, rode `npm run dev` e o sistema agora lê/grava no banco Supabase.

---

## PASSO 6 — Publicar na Vercel (Deploy)

### Opção A — Deploy pelo GitHub (Recomendado)

1. Suba o projeto para um repositório no GitHub:
```bash
cd MONTEX-ERP-V5-DEPLOY/source
git init
git add .
git commit -m "MONTEX ERP V5 - Deploy inicial"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/montex-erp.git
git push -u origin main
```

2. Acesse [https://vercel.com](https://vercel.com) e faça login com GitHub
3. Clique em **Add New** → **Project**
4. Selecione o repositório `montex-erp`
5. Em **Framework Preset**, selecione **Vite**
6. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL` = sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua chave anon do Supabase
7. Clique em **Deploy**
8. Aguarde ~1-2 minutos. Pronto!

Seu ERP estará acessível em algo como: `https://montex-erp.vercel.app`

### Opção B — Deploy pela CLI da Vercel

1. Instale a CLI:
```bash
npm install -g vercel
```

2. Na pasta `source/`, rode:
```bash
vercel
```

3. Siga as instruções (selecione o projeto, confirme as configurações)

4. Adicione as variáveis de ambiente:
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

5. Faça o deploy de produção:
```bash
vercel --prod
```

---

## PASSO 7 — Verificar se Tudo Funciona

Após o deploy, acesse a URL do seu projeto e verifique:

1. **Login**: Tela de login deve aparecer
2. **Dashboard**: Dados financeiros devem carregar (R$ 2.700.000,00 de contrato)
3. **Funcionários**: 22 funcionários devem aparecer na página de RH
4. **Financeiro**: Lançamentos de despesas com 10 NFs devem estar listados
5. **Composição do Contrato**: Fornecedor (Material) deve mostrar R$ 667.099,82 pago
6. **Console do navegador**: Abra DevTools (F12) → Console. Não deve haver erros de conexão

---

## Estrutura dos Arquivos Criados

```
source/
├── .env.example          ← Template das variáveis de ambiente
├── .env                  ← Suas credenciais (NÃO commitar no Git!)
├── vercel.json           ← Configuração do deploy Vercel
├── supabase/
│   ├── schema.sql        ← Estrutura completa do banco (11 tabelas)
│   └── seed.sql          ← Dados iniciais para popular o banco
├── src/
│   ├── lib/
│   │   └── supabase.js   ← Cliente Supabase (conexão com o banco)
│   └── services/
│       └── api.js        ← Camada de serviços (CRUD + fallback local)
```

---

## Importante: Arquivo .gitignore

Antes de subir pro GitHub, certifique-se de que o `.gitignore` contém:

```
.env
.env.local
.env.*.local
node_modules/
dist/
```

O arquivo `.env` contém suas credenciais e **NUNCA** deve ser commitado no Git.

---

## Custos Estimados

| Serviço | Plano Gratuito | Plano Pago |
|---------|---------------|------------|
| **Supabase** | 500MB banco, 1GB transferência, 50k auth users | A partir de $25/mês (Pro) |
| **Vercel** | 100GB bandwidth, deploys ilimitados | A partir de $20/mês (Pro) |

Para o uso do MONTEX ERP com poucos usuários, o plano gratuito de ambos os serviços é suficiente.

---

## Suporte e Manutenção

- **Backups**: O Supabase faz backups automáticos diários (plano Pro) ou você pode exportar manualmente pelo SQL Editor
- **Atualizações**: Ao fazer push no GitHub, a Vercel faz deploy automático
- **Monitoramento**: Use o Dashboard do Supabase para monitorar uso do banco
- **Logs**: Vercel fornece logs de deploy e execução em tempo real
