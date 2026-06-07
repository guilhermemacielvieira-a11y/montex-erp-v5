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

O cliente já está pronto: `src/mobile/ui/push.js` (registro via `@capacitor/push-notifications`
em runtime) e o toggle em **Configurações → Notificações push**. Falta o lado nativo/servidor:

1. **Apple**: no Apple Developer, habilite **Push Notifications** no App ID e gere a **APNs Auth Key (.p8)** (Keys → +). Guarde Key ID e Team ID.
2. **Xcode**: target App → Signing & Capabilities → **+ Push Notifications** e **Background Modes → Remote notifications**.
3. **Token**: ao ativar no app, `push.js` registra e salva o **token APNs** em `localStorage` (`montex_push_token`). Envie esse token para uma tabela no Supabase (ex.: `push_tokens(user_id, token, platform)`) para o backend direcionar.
4. **Envio**: uma **Supabase Edge Function** (ou serviço) envia ao APNs (via a .p8) quando ocorrem eventos do fluxo:
   - peça pronta (etapa → expedido), carga a conferir (romaneio criado), estoque crítico (nível ≤ mínimo), medição aprovada.
   - Dispare por trigger no Postgres (NOTIFY) ou no próprio `moverPecaEtapa`/`addExpedicao`.
5. Recebimento no app: `push.js` escuta `pushNotificationReceived` (mostra toast) — abrir deep link para a tela relevante é um próximo passo.

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
