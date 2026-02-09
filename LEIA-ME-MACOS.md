# MONTEX ERP - Instalação para macOS

## 📋 Requisitos do Sistema

- **macOS**: 10.15 (Catalina) ou superior
- **Processador**: Intel x64 ou Apple Silicon (M1/M2/M3)
- **Memória**: 8GB RAM (recomendado)
- **Espaço**: 500MB disponível

---

## 🚀 Instalação Rápida

### Opção 1: Script de Instalação (Recomendado)

1. Abra o **Terminal**
2. Navegue até a pasta do projeto
3. Execute:

```bash
chmod +x install-macos.sh
./install-macos.sh
```

4. Selecione **"1) Instalação Completa"**

### Opção 2: Duplo-clique

1. Dê duplo-clique no arquivo `MONTEX-ERP.command`
2. Se aparecer aviso de segurança:
   - Vá em **Ajustes do Sistema > Privacidade e Segurança**
   - Clique em **"Abrir Mesmo Assim"**

---

## 🖥️ Modos de Execução

### 1. Modo Web (Navegador)

Acesse via navegador em qualquer dispositivo:

```bash
npm run dev
```

Abra: http://localhost:5173

### 2. Modo Desktop (Electron)

Para usar como aplicativo nativo do macOS:

```bash
# Configurar Electron (primeira vez)
chmod +x setup-electron.sh
./setup-electron.sh

# Executar em modo desenvolvimento
npm run electron:dev

# Compilar para distribuição
npm run electron:build:mac
```

---

## 📦 Gerando o Instalador (.dmg)

### Para Apple Silicon (M1/M2/M3):

```bash
npm run electron:build:mac:arm64
```

### Para Intel:

```bash
npm run electron:build:mac:x64
```

### Universal (ambas arquiteturas):

```bash
npm run electron:build:mac
```

O arquivo `.dmg` será gerado na pasta `release/`.

---

## 🎨 Personalizando o Ícone

Para usar seu próprio ícone:

1. Crie um ícone de 1024x1024 pixels (PNG)
2. Converta para `.icns`:

```bash
# Instalar iconutil (já vem com Xcode)
mkdir MyIcon.iconset
sips -z 16 16     icon.png --out MyIcon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out MyIcon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out MyIcon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out MyIcon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out MyIcon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out MyIcon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out MyIcon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out MyIcon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out MyIcon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out MyIcon.iconset/icon_512x512@2x.png
iconutil -c icns MyIcon.iconset
mv MyIcon.icns build/icon.icns
```

3. Coloque em `build/icon.icns`

---

## 🔧 Solução de Problemas

### "App danificado" ou "não pode ser aberto"

Execute no Terminal:

```bash
xattr -cr "MONTEX ERP.app"
```

### Node.js não encontrado

Instale via Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node@20
```

### Porta 5173 em uso

```bash
# Encontrar processo
lsof -i :5173

# Encerrar processo
kill -9 <PID>
```

### Erro de permissão

```bash
chmod +x install-macos.sh
chmod +x MONTEX-ERP.command
chmod +x setup-electron.sh
```

---

## 📱 Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `⌘ + 1` | Dashboard |
| `⌘ + 2` | Command Center |
| `⌘ + 3` | BI Analytics |
| `⌘ + P` | Projetos |
| `⌘ + K` | Paleta de Comandos |
| `⌘ + ,` | Preferências |
| `⌘ + Q` | Sair |

---

## 🔄 Atualizações

Para atualizar o sistema:

```bash
git pull origin main
npm install
npm run build
```

---

## 📞 Suporte

- **Email**: suporte@grupomontex.com.br
- **Documentação**: https://docs.grupomontex.com.br
- **WhatsApp**: (XX) XXXXX-XXXX

---

© 2024 Grupo Montex - Todos os direitos reservados
