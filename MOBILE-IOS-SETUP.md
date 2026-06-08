# 📱 MONTEX Mobile — Setup do App iOS Nativo (Capacitor)

Este guia transforma o app web mobile (`/m`) num **app iOS nativo** usando Capacitor,
reaproveitando 100% do código React/Vite. Rode no **macOS com Xcode instalado**.

> O app web já está pronto e testável agora em `http://localhost:5174/m` (`npm run dev`).
> Os passos abaixo são para empacotar como app nativo e publicar na App Store.

---

## ✅ Checklist de prontidão (status atual)

**Pronto no repositório (nada a fazer):**
- [x] `capacitor.config.json` (appId `com.montex.erp`, `webDir: dist`, plugins SplashScreen/Keyboard/PushNotifications)
- [x] Scripts npm: `ios:sync`, `ios:open`, `ios`
- [x] Isolação nativa: dentro do Capacitor o app **sempre** roda em `/m` e nunca mostra o desktop (`src/App.jsx`)
- [x] Plugins acessados só via `window.Capacitor.Plugins.*` em **runtime** — **zero** import estático de `@capacitor/*` (não quebra o bundle web; verificado)
- [x] Backend de push: tabela `push_tokens` (migration v11) + Edge Function `send-push` (APNs JWT ES256)
- [x] Capacidades nativas no código: câmera/scanner, haptics, biometria, network, deep links

**Passos manuais no macOS/Xcode (fora do sandbox):**
- [ ] `npm install` + instalar Capacitor e plugins (§1)
- [ ] `npm run build` + `npx cap add ios` (cria `ios/`) (§2)
- [ ] Xcode: Team de assinatura + capabilities Push/Background Modes (§3)
- [ ] `Info.plist`: descrições de uso de câmera e Face ID (§5)
- [ ] Deploy `send-push` + secrets `APNS_*` com a chave `.p8` (seção Push)
- [ ] **BLOQUEANTE:** rotacionar/remover a `service_role` do cliente antes de publicar (ver abaixo)

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

---

## 6. Publicar (TestFlight → App Store)

```bash
npm run ios:sync
```
No Xcode: **Product ▸ Archive** → **Distribute App** ▸ App Store Connect ▸ Upload.
Depois libere o build no TestFlight para os usuários internos testarem.

---

## ⚠️ BLOQUEANTE de segurança antes de publicar

O `src/api/supabaseClient.js` tem a **service_role key hardcoded** (chave de admin).
Um app distribuído na App Store **expõe** essa chave (qualquer um extrai do binário).
**Antes de publicar:** remover a service_role do cliente, usar somente a anon key e
mover regras para **RLS por papel** no Supabase. Ver `CLAUDE.md › Credenciais & segurança`.

---

## Push notifications (APNs)

O cliente **e o backend** já estão prontos:
- Cliente: `src/mobile/ui/push.js` (registro via `@capacitor/push-notifications` em runtime) + toggle em **Configurações → Notificações push**. Ao ativar, salva o token em `localStorage` (`montex_push_token`) **e faz upsert na tabela `push_tokens`** (com `role` do usuário para direcionar).
- Tabela: `supabase/migration_v11_push_tokens.sql` (`push_tokens` + RLS: anon faz upsert do próprio token; só o service_role lê → usado pela Edge Function).
- Envio: Edge Function `supabase/functions/send-push/index.ts` (Deno) — autentica no APNs com **JWT ES256** (provider token via a chave `.p8`) e envia para os tokens filtrados.

Falta apenas configurar as credenciais Apple e fazer o deploy:

1. **Apple**: no Apple Developer, habilite **Push Notifications** no App ID e gere a **APNs Auth Key (.p8)** (Keys → +). Guarde **Key ID** e **Team ID**.
2. **Xcode**: target App → Signing & Capabilities → **+ Push Notifications** e **Background Modes → Remote notifications**.
3. **Migração**: rode `supabase/migration_v11_push_tokens.sql` no banco (cria `push_tokens`).
4. **Deploy da function**:
   ```bash
   supabase functions deploy send-push --no-verify-jwt
   supabase secrets set APNS_KEY_ID=XXXXXXXXXX APNS_TEAM_ID=YYYYYYYYYY \
     APNS_BUNDLE_ID=com.montex.erp APNS_PRODUCTION=false
   supabase secrets set APNS_PRIVATE_KEY="$(cat AuthKey_XXXXXXXXXX.p8)"
   ```
   (`SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem no ambiente da function.)
5. **Disparo**: chame a function quando ocorrerem eventos do fluxo (peça pronta `→ expedido`, romaneio criado, estoque crítico, medição aprovada). Via SQL trigger (`pg_net`) ou no próprio `moverPecaEtapa`/`addExpedicao`. Exemplo de payload:
   ```json
   { "title": "Carga a conferir", "body": "Romaneio R-102",
     "filtro": { "role": "expedicao" }, "data": { "path": "/m/expedicao" } }
   ```
   Sem `filtro` → todos os dispositivos; `filtro.tokens` → lista explícita.
6. **Recebimento**: `push.js` escuta `pushNotificationReceived` (toast em 1º plano). Ao **tocar**, `DeepLinkHandler` lê `notification.data.path` e navega — por isso envie `data.path` com a rota (`/m/expedicao`, `/m/montagem`, `/m/estoque`).
7. **Produção**: ao publicar na App Store, defina `APNS_PRODUCTION=true` (host `api.push.apple.com`).

## Deep links (abrir tela por URL)

`src/mobile/DeepLinkHandler.jsx` (montado no MobileApp) ouve `App.appUrlOpen` e o toque em push. Para deep links por URL:
1. **Custom scheme** (`montex://m/...`): no Xcode, target App → Info → URL Types → adicione o scheme `montex`. Ex.: `montex://m/expedicao`.
2. **Universal Links** (`https://montex-erp-v5.vercel.app/m/...`): configure Associated Domains + `apple-app-site-association` no host.
O handler extrai o `pathname` (`/m/...`) e navega. No web/PWA fica inerte.

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
