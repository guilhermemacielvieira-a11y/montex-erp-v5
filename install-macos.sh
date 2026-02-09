#!/bin/bash

#===============================================================================
#  MONTEX ERP - Script de Instalação para macOS
#  Versão: 1.0.0
#  Sistema: macOS 10.15+ (Catalina ou superior)
#===============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║    ███╗   ███╗ ██████╗ ███╗   ██╗████████╗███████╗██╗  ██╗                   ║
║    ████╗ ████║██╔═══██╗████╗  ██║╚══██╔══╝██╔════╝╚██╗██╔╝                   ║
║    ██╔████╔██║██║   ██║██╔██╗ ██║   ██║   █████╗   ╚███╔╝                    ║
║    ██║╚██╔╝██║██║   ██║██║╚██╗██║   ██║   ██╔══╝   ██╔██╗                    ║
║    ██║ ╚═╝ ██║╚██████╔╝██║ ╚████║   ██║   ███████╗██╔╝ ██╗                   ║
║    ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝                   ║
║                                                                              ║
║                    ERP PREMIUM - SISTEMA INTEGRADO                           ║
║                         Instalador para macOS                                ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Funções de utilidade
print_step() {
    echo -e "\n${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Verificar se está rodando no macOS
check_macos() {
    print_step "Verificando sistema operacional..."
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "Este script é apenas para macOS!"
        exit 1
    fi

    # Verificar versão do macOS
    OS_VERSION=$(sw_vers -productVersion)
    print_success "macOS $OS_VERSION detectado"
}

# Verificar e instalar Homebrew
check_homebrew() {
    print_step "Verificando Homebrew..."
    if ! command -v brew &> /dev/null; then
        print_warning "Homebrew não encontrado. Instalando..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

        # Adicionar ao PATH
        if [[ $(uname -m) == "arm64" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
        print_success "Homebrew instalado com sucesso"
    else
        print_success "Homebrew já está instalado"
    fi
}

# Verificar e instalar Node.js
check_nodejs() {
    print_step "Verificando Node.js..."
    if ! command -v node &> /dev/null; then
        print_warning "Node.js não encontrado. Instalando via Homebrew..."
        brew install node@20
        brew link node@20
        print_success "Node.js instalado com sucesso"
    else
        NODE_VERSION=$(node -v)
        print_success "Node.js $NODE_VERSION já está instalado"
    fi

    # Verificar versão mínima (18+)
    NODE_MAJOR=$(node -v | cut -d'.' -f1 | tr -d 'v')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        print_warning "Node.js 18+ recomendado. Atualizando..."
        brew upgrade node
    fi
}

# Verificar npm/pnpm
check_package_manager() {
    print_step "Verificando gerenciador de pacotes..."

    if command -v pnpm &> /dev/null; then
        PACKAGE_MANAGER="pnpm"
        print_success "pnpm detectado"
    elif command -v npm &> /dev/null; then
        PACKAGE_MANAGER="npm"
        print_success "npm detectado"

        # Instalar pnpm (recomendado)
        print_warning "Instalando pnpm (recomendado)..."
        npm install -g pnpm
        PACKAGE_MANAGER="pnpm"
    fi

    echo -e "   Usando: ${CYAN}$PACKAGE_MANAGER${NC}"
}

# Instalar dependências do projeto
install_dependencies() {
    print_step "Instalando dependências do projeto..."

    cd "$(dirname "$0")"

    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm install
    else
        npm install
    fi

    print_success "Dependências instaladas com sucesso"
}

# Configurar variáveis de ambiente
setup_environment() {
    print_step "Configurando variáveis de ambiente..."

    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Arquivo .env criado a partir do exemplo"
        else
            cat > .env << 'ENVFILE'
# MONTEX ERP - Configurações de Ambiente
VITE_APP_NAME=MONTEX ERP
VITE_APP_VERSION=1.0.0
VITE_API_URL=http://localhost:3000/api
VITE_ENABLE_ANALYTICS=false
VITE_DEBUG_MODE=false
ENVFILE
            print_success "Arquivo .env criado com valores padrão"
        fi
    else
        print_success "Arquivo .env já existe"
    fi
}

# Build do projeto
build_project() {
    print_step "Compilando o projeto..."

    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm run build
    else
        npm run build
    fi

    print_success "Build concluído com sucesso"
}

# Criar launcher .command para macOS
create_launcher() {
    print_step "Criando launcher para macOS..."

    cat > "MONTEX-ERP.command" << 'LAUNCHER'
#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 Iniciando MONTEX ERP..."
echo ""

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install || pnpm install
fi

# Iniciar o servidor de desenvolvimento
echo "🌐 Abrindo no navegador..."
sleep 2 && open "http://localhost:5173" &

npm run dev || pnpm dev
LAUNCHER

    chmod +x "MONTEX-ERP.command"
    print_success "Launcher criado: MONTEX-ERP.command"
}

# Criar aplicativo .app para macOS
create_app_bundle() {
    print_step "Criando bundle de aplicativo macOS..."

    APP_NAME="MONTEX ERP"
    APP_DIR="${APP_NAME}.app"

    # Criar estrutura do .app
    mkdir -p "${APP_DIR}/Contents/MacOS"
    mkdir -p "${APP_DIR}/Contents/Resources"

    # Info.plist
    cat > "${APP_DIR}/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIdentifier</key>
    <string>com.grupomontex.erp</string>
    <key>CFBundleName</key>
    <string>MONTEX ERP</string>
    <key>CFBundleDisplayName</key>
    <string>MONTEX ERP</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSApplicationCategoryType</key>
    <string>public.app-category.business</string>
</dict>
</plist>
PLIST

    # Script de execução
    SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
    cat > "${APP_DIR}/Contents/MacOS/launcher" << SCRIPT
#!/bin/bash
cd "${SCRIPT_DIR}"

# Verificar se já está rodando
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    open "http://localhost:5173"
else
    # Iniciar servidor em background
    osascript -e 'tell application "Terminal" to do script "cd \"${SCRIPT_DIR}\" && npm run dev"'
    sleep 3
    open "http://localhost:5173"
fi
SCRIPT

    chmod +x "${APP_DIR}/Contents/MacOS/launcher"

    print_success "Bundle criado: ${APP_DIR}"
    print_warning "Para ícone personalizado, adicione AppIcon.icns em ${APP_DIR}/Contents/Resources/"
}

# Criar atalho no Dock (opcional)
add_to_dock() {
    print_step "Deseja adicionar o MONTEX ERP ao Dock? (s/n)"
    read -r response

    if [[ "$response" =~ ^[Ss]$ ]]; then
        APP_PATH="$(pwd)/MONTEX ERP.app"
        defaults write com.apple.dock persistent-apps -array-add "<dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>${APP_PATH}</string><key>_CFURLStringType</key><integer>0</integer></dict></dict></dict>"
        killall Dock
        print_success "Adicionado ao Dock"
    fi
}

# Menu de instalação
show_menu() {
    echo -e "\n${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}Selecione o tipo de instalação:${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  1) Instalação Completa (Recomendado)"
    echo "     - Instala todas as dependências"
    echo "     - Compila o projeto"
    echo "     - Cria launcher e app bundle"
    echo ""
    echo "  2) Apenas Dependências"
    echo "     - Instala Node.js e pacotes npm"
    echo ""
    echo "  3) Apenas Build"
    echo "     - Compila o projeto para produção"
    echo ""
    echo "  4) Criar App Bundle"
    echo "     - Cria arquivo .app para macOS"
    echo ""
    echo "  5) Iniciar Servidor de Desenvolvimento"
    echo "     - Inicia o servidor e abre no navegador"
    echo ""
    echo "  0) Sair"
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
}

# Iniciar servidor de desenvolvimento
start_dev_server() {
    print_step "Iniciando servidor de desenvolvimento..."

    # Abrir no navegador após 3 segundos
    (sleep 3 && open "http://localhost:5173") &

    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm dev
    else
        npm run dev
    fi
}

# Função principal
main() {
    check_macos

    show_menu
    echo -n "Opção: "
    read -r choice

    case $choice in
        1)
            check_homebrew
            check_nodejs
            check_package_manager
            install_dependencies
            setup_environment
            build_project
            create_launcher
            create_app_bundle
            add_to_dock

            echo -e "\n${GREEN}════════════════════════════════════════════════════════════════${NC}"
            echo -e "${GREEN}✓ Instalação concluída com sucesso!${NC}"
            echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
            echo ""
            echo "Para iniciar o sistema:"
            echo "  • Dê duplo-clique em 'MONTEX ERP.app'"
            echo "  • Ou execute: ${CYAN}npm run dev${NC}"
            echo ""
            ;;
        2)
            check_homebrew
            check_nodejs
            check_package_manager
            install_dependencies
            setup_environment
            print_success "Dependências instaladas!"
            ;;
        3)
            build_project
            print_success "Build concluído!"
            ;;
        4)
            create_launcher
            create_app_bundle
            add_to_dock
            print_success "App bundle criado!"
            ;;
        5)
            start_dev_server
            ;;
        0)
            echo "Saindo..."
            exit 0
            ;;
        *)
            print_error "Opção inválida!"
            exit 1
            ;;
    esac
}

# Executar
main "$@"
