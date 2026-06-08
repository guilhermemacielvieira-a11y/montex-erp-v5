# 📱 MONTEX Mobile — Setup do App iOS Nativo (Capacitor)

Este guia transforma o app web mobile (`/m`) num **app iOS nativo** usando Capacitor,
reaproveitando 100% do código React/Vite. Rode no **macOS com Xcode instalado**.

> O app web já está pronto e testável agora em `http://localhost:5174/m` (`npm run dev`).
> Os passos abaixo são para empacotar como app nativo e publicar na App Store.

---

## Pré-requisitos (uma vez)

- macOS + **Xcode** (App Store) + Command Line Tools: `xcode-select --install`
- **CocoaPods**: `sudo gem install cocoapods`
- Conta **Apple Developer** (US$ 99/ano) para TestFlight / App Store
- Node 18+ e o `node_modules` do projeto instalado (`npm install`)

---

## 1. Instalar Capacitor + plugins nativos

```bash
cd MONTEX-ERP-V5-DEPLOY/source

# core + CLI + plataforma iOS
npm i @capacitor/core @capacitor/ios
npm i -D @capacitor/cli

# capacidades nativas do super app operacional
npm i @capacitor/camera \
      @capacitor-mlkit/barcode-scanning \
      @capacitor/push-notifications \
      @capacitor/haptics \
      @capacitor/network \
      @capacitor/preferences \
      @capacitor/app \
      @capacitor/splash-screen \
      capacitor-native-biometric
```

> O `capacitor.config.json` já está versionado na raiz do projeto (appId `com.montex.erp`,
> `webDir: dist`). Não precisa rodar `npx cap init`.

## 2. Criar o projeto iOS

```bash
npm run build          # gera dist/
npx cap add ios        # cria a pasta ios/ (projeto Xcode)
```

## 3. Sincronizar e abrir no Xcode

```bash
npm run ios            # = vite build + cap sync ios + cap open ios
```

No Xcode:
1. Selecione o target **App** → aba **Signing & Capabilities**.
2. Escolha seu **Team** (Apple Developer) — o bundle id já é `com.montex.erp`.
3. Adicione capabilities: **Push Notifications**, **Background Modes** (Remote notifications).
4. Conecte um iPhone (ou use simulador) e aperte ▶︎ Run.

A cada mudança no código web: `npm run ios:sync` (rebuild + cap sync) e Run de novo.

---

## 4. Ícone e Splash do app (nativo)

Os ícones PWA já estão em `public/icons/`. Para o ícone/splash **nativos** do iOS:

```bash
npm i -D @capacitor/assets
npx capacitor-assets generate --ios   # usa public/logo-montex.png como base
```

---

## 5. Permissões (Info.plist)

Adicione no `ios/App/App/Info.plist` as descrições de uso (obrigatório p/ App Store):

```xml
<key>NSCameraUsageDescription</key>
<string>Usado para ler QR/foto de peças na montagem e conferência de carga.</string>
<key>NSFaceIDUsageDescription</key>
<string>Usado para login rápido e confirmação de ações.</string>
```

> **Bipagem contínua (Expedição):** o `ui/Scanner.jsx` usa o modo `continuous`
> via `@capacitor-mlkit/barcode-scanning` (`startScan` + listener
> `barcodeScanned`). A câmera do OS renderiza ATRÁS da webview, então o
> Scanner é portado para o `<body>` e o `#root` fica oculto enquanto escaneia
> (classe `montex-scanner-native`, CSS em `MobileApp`). No web/PWA degrada
> para `BarcodeDetector`; sem nada, entrada manual. Requer o plugin instalado
> e a permissão de câmera acima.

---

## 6. Publicar (TestFlight → App Store)

```bash
npm run ios:sync
```
No Xcode: **Product ▸ Archive** → **Distribute App** ▸ App Store Connect ▸ Upload.
Depois libere o build no TestFlight para os usuários internos testarem.

---

## 7. Push Notifications (APNs + Edge Function)

O código do app já está pronto: `src/mobile/ui/push.js` (permissão + registro +
salva o token) e `src/mobile/ui/deeplinks.js` (toque na push → abre a rota certa).
Falta só a infra do lado servidor.

### 7.1 Tabela de tokens (Supabase)

```sql
create table if not exists public.device_tokens (
  token text primary key,
  user_email text,
  platform text default 'ios',
  updated_at timestamptz default now()
);
create index if not exists device_tokens_email_idx on public.device_tokens (user_email);
-- App grava com a anon key; ajuste a RLS conforme sua política.
alter table public.device_tokens enable row level security;
create policy "device_tokens upsert" on public.device_tokens for all using (true) with check (true);
```

### 7.2 Chave APNs (.p8)

1. Apple Developer ▸ **Certificates, IDs & Profiles ▸ Keys ▸ +**
2. Marque **Apple Push Notifications service (APNs)**, baixe o `AuthKey_XXXX.p8`
   (download único). Anote o **Key ID** e o **Team ID**.
3. No Xcode, confirme a capability **Push Notifications** + **Background Modes ▸
   Remote notifications** (passo 3).

### 7.3 Deploy da Edge Function

A função está em `supabase/functions/send-push/index.ts`.

```bash
# Secrets (P8 = conteúdo COMPLETO do .p8, com BEGIN/END)
supabase secrets set \
  APNS_KEY_ID=XXXXXXXXXX \
  APNS_TEAM_ID=YYYYYYYYYY \
  APNS_BUNDLE_ID=com.montex.erp \
  APNS_HOST=api.push.apple.com \
  APNS_PRIVATE_KEY="$(cat AuthKey_XXXX.p8)"
# SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem no ambiente da função.

supabase functions deploy send-push --no-verify-jwt
```

> Em build de **debug** o iOS usa o sandbox APNs → `APNS_HOST=api.sandbox.push.apple.com`.
> Em **TestFlight/App Store** use `api.push.apple.com`.

### 7.4 Enviar (exemplos)

```bash
# Para um usuário, abrindo direto em /m/despesas
curl -X POST "$SUPABASE_URL/functions/v1/send-push" \
  -H "Content-Type: application/json" \
  -d '{"title":"Despesa vencida","body":"3 despesas venceram","to":"/m/despesas","target":{"email":"guilherme@montex.com"}}'

# Por papel (todos os gerentes). `to` aceita rota OU categoria:
# {"to":{"tipo":"estoque"}} resolve para /m/estoque no app.
curl -X POST "$SUPABASE_URL/functions/v1/send-push" \
  -H "Content-Type: application/json" \
  -d '{"title":"Estoque crítico","body":"5 itens abaixo do mínimo","to":"/m/estoque","target":{"role":"gerente"}}'
```

`target`: `{ "email" }` · `{ "role" }` · `{ "tokens": [] }` · `{}` (todos os iOS).
O `to` vai no nível superior do payload APNs → vira `notification.data.to`, que o
`deeplinks.js` traduz para a rota. Tokens com retorno `410` são limpos automaticamente.

### 7.5 Disparo automático (cron)

A função `supabase/functions/notify-pending` já porta a lógica de
`src/mobile/ui/notificacoes.js` para o servidor: varre pendências
(despesas vencidas, estoque crítico, fila de embarque, medições) e dispara
push aos papéis responsáveis com `to` apontando para a tela que resolve cada
uma. (Reusa `_shared/apns.ts`, igual à `send-push`.)

```bash
supabase functions deploy notify-pending --no-verify-jwt
```

Agende com **pg_cron** + **pg_net** (SQL no Supabase). Ex.: todo dia útil às 8h:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'montex-notify-pending',
  '0 11 * * 1-5',                       -- 11h UTC ≈ 08h BRT, seg–sex
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-pending',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>'
    ),
    body    := '{}'::jsonb
  );
  $$
);
-- Para remover: select cron.unschedule('montex-notify-pending');
```

> A função só envia quando há pendência. Mantenha **1 disparo/dia** para não
> repetir o mesmo alerta. Para granularidade maior (ex.: alertar só o que
> mudou desde o último envio), registre o último estado numa tabela de
> controle e compare antes de enviar.

---

## ⚠️ BLOQUEANTE de segurança antes de publicar

O `src/api/supabaseClient.js` tem a **service_role key hardcoded** (chave de admin).
Um app distribuído na App Store **expõe** essa chave (qualquer um extrai do binário).
**Antes de publicar:** remover a service_role do cliente, usar somente a anon key e
mover regras para **RLS por papel** no Supabase. Ver `CLAUDE.md › Credenciais & segurança`.

---

## Separação do ERP desktop (app nativo = só operacional)

O app nativo é o **super app operacional**, separado do ERP desktop. Em
`src/App.jsx`, quando roda dentro do Capacitor (`window.Capacitor.isNativePlatform()`)
o app **sempre abre em `/m` e nunca mostra a interface desktop** — nem com
`force_desktop`. O ERP desktop continua sendo exclusivamente a versão web (Vercel).
Ambos compartilham o mesmo backend Supabase, mas são experiências independentes.

## Estrutura de capacidades por módulo operacional

| Módulo (rota) | Ação de escrita | Capacidade nativa |
|---|---|---|
| Produção (`/m/producao`) | `moverPecaEtapa` — avançar etapa | Háptico + offline |
| Montagem (`/m/montagem`) | marcar montada (`entity_store`) | Câmera/QR + offline |
| Expedição (`/m/expedicao`) | romaneio / `expedido→enviado` | Scanner + push |
| Estoque (`/m/estoque`) | movimentação | Scanner |
| Medição (`/m/medicao`) | lançar medição | Foto + Face ID |
