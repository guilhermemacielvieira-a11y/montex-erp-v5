#!/bin/bash
# MONTEX ERP - Script de Build para Desktop

echo "================================================"
echo "   MONTEX ERP Premium - Build Desktop"
echo "================================================"

cd "$(dirname "$0")/.."

echo "📦 Instalando dependências do Electron..."
npm install electron electron-builder concurrently wait-on --save-dev

echo "🔨 Compilando aplicação React..."
npm run build

echo "🖥️ Gerando instalador Windows..."
npm run electron:build:win

echo "✅ Build concluído! Arquivos em: ./release/"
