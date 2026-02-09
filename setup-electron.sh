#!/bin/bash

#===============================================================================
#  MONTEX ERP - Setup Electron para macOS
#  Configura o projeto para build como aplicativo desktop nativo
#===============================================================================

set -e

# Cores
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}"
cat << "EOF"
╔════════════════════════════════════════════════════════════════╗
║           MONTEX ERP - Setup Electron Desktop App              ║
╚════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

cd "$(dirname "$0")"

echo -e "${CYAN}▶ Instalando dependências do Electron...${NC}"

# Verificar se já tem Electron instalado
if [ ! -d "node_modules/electron" ]; then
    # Instalar dependências Electron
    npm install --save-dev electron@^28.1.0 electron-builder@^24.9.1 concurrently@^8.2.2 wait-on@^7.2.0

    echo -e "${GREEN}✓ Dependências do Electron instaladas${NC}"
else
    echo -e "${GREEN}✓ Electron já está instalado${NC}"
fi

# Adicionar scripts ao package.json
echo -e "${CYAN}▶ Atualizando package.json...${NC}"

# Backup do package.json original
cp package.json package.json.backup

# Usar node para atualizar o package.json
node << 'SCRIPT'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Adicionar configuração Electron
pkg.main = "electron/main.js";

// Adicionar scripts Electron se não existirem
pkg.scripts = pkg.scripts || {};
pkg.scripts["electron:dev"] = "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"";
pkg.scripts["electron:build"] = "npm run build && electron-builder";
pkg.scripts["electron:build:mac"] = "npm run build && electron-builder --mac";
pkg.scripts["electron:build:mac:arm64"] = "npm run build && electron-builder --mac --arm64";
pkg.scripts["electron:build:mac:x64"] = "npm run build && electron-builder --mac --x64";
pkg.scripts["electron:pack"] = "electron-builder --dir";

// Adicionar build config
pkg.build = {
    "extends": "electron-builder.yml"
};

// Atualizar nome e versão
pkg.productName = "MONTEX ERP";
pkg.description = "Sistema ERP integrado do Grupo Montex";

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('package.json atualizado com sucesso');
SCRIPT

echo -e "${GREEN}✓ package.json atualizado${NC}"

# Criar diretório de build resources
echo -e "${CYAN}▶ Configurando recursos de build...${NC}"

mkdir -p build/icons

# Criar ícone placeholder (PNG simples)
echo -e "${YELLOW}⚠ Lembre-se de adicionar os ícones do app:${NC}"
echo "  • build/icon.icns (macOS)"
echo "  • build/icon.ico (Windows)"
echo "  • build/icons/ (Linux - vários tamanhos)"

# Criar script de notarização placeholder
mkdir -p scripts

cat > scripts/notarize.js << 'NOTARIZE'
/**
 * Script de notarização para macOS
 * Requer Apple Developer Account
 */

require('dotenv').config();
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;

    if (electronPlatformName !== 'darwin') {
        return;
    }

    // Verificar se credenciais estão configuradas
    if (!process.env.APPLE_ID || !process.env.APPLE_ID_PASSWORD) {
        console.log('Skipping notarization: Apple credentials not configured');
        return;
    }

    const appName = context.packager.appInfo.productFilename;

    console.log(`Notarizing ${appName}...`);

    return await notarize({
        appBundleId: 'com.grupomontex.erp',
        appPath: `${appOutDir}/${appName}.app`,
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_ID_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID,
    });
};
NOTARIZE

echo -e "${GREEN}✓ Scripts de build configurados${NC}"

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Setup concluído!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Comandos disponíveis:"
echo ""
echo -e "  ${CYAN}npm run electron:dev${NC}"
echo "    Inicia o app em modo desenvolvimento"
echo ""
echo -e "  ${CYAN}npm run electron:build:mac${NC}"
echo "    Compila o app para macOS (DMG + ZIP)"
echo ""
echo -e "  ${CYAN}npm run electron:build:mac:arm64${NC}"
echo "    Compila apenas para Apple Silicon (M1/M2)"
echo ""
echo -e "  ${CYAN}npm run electron:build:mac:x64${NC}"
echo "    Compila apenas para Intel"
echo ""
