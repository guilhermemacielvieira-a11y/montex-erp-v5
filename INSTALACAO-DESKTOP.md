# 🏭 MONTEX ERP Premium - Instalação Desktop

## 📋 Requisitos do Sistema

### Windows
- Windows 10 ou superior (64-bit)
- 4 GB de RAM (8 GB recomendado)
- 500 MB de espaço em disco
- Resolução mínima: 1024x768 (1920x1080 recomendado)

### Para Desenvolvimento/Build
- Node.js 18.x ou superior
- npm 9.x ou superior
- Git (opcional)

---

## 🚀 Instalação Rápida (Usuário Final)

### Opção 1: Instalador (Recomendado)
1. Baixe o arquivo `MONTEX-ERP-Premium-Setup-1.0.0.exe`
2. Execute o instalador
3. Siga as instruções na tela
4. O aplicativo será instalado e um atalho será criado na área de trabalho

### Opção 2: Versão Portátil
1. Baixe o arquivo `MONTEX-ERP-1.0.0-Portable.exe`
2. Execute diretamente - não requer instalação
3. Pode ser executado de um pendrive

---

## 🔧 Compilar do Código Fonte

### Passo 1: Preparar o Ambiente

```bash
# Clonar ou extrair o projeto
cd montex-erp-premium

# Instalar dependências
npm install
```

### Passo 2: Compilar para Windows

```bash
# Método 1: Usando npm
npm run electron:build:win

# Método 2: Usando o script batch (Windows)
scripts\build-desktop.bat
```

### Passo 3: Localizar os Arquivos

Após a compilação, os arquivos estarão em:
```
release/
├── MONTEX-ERP-Premium-Setup-1.0.0.exe    # Instalador
├── MONTEX-ERP-1.0.0-Portable.exe         # Versão portátil
└── ...
```

---

## 🖥️ Modo Desenvolvimento

Para desenvolver e testar com hot-reload:

```bash
# Terminal 1: Iniciar servidor Vite
npm run dev

# Terminal 2: Iniciar Electron (em outro terminal)
npm run electron

# Ou usar o comando combinado:
npm run electron:dev
```

---

## 📁 Estrutura do Projeto

```
montex-erp-premium/
├── assets/              # Ícones e recursos do instalador
│   ├── icon.ico         # Ícone Windows
│   ├── icon.png         # Ícone PNG
│   └── icon.svg         # Ícone vetorial
├── electron/            # Código do Electron
│   ├── main.js          # Processo principal
│   └── preload.js       # Script de preload
├── src/                 # Código fonte React
├── dist/                # Build de produção (gerado)
├── release/             # Instaladores (gerado)
├── scripts/             # Scripts de build
└── package.json         # Configurações do projeto
```

---

## ⚙️ Configurações

### Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Ctrl+1` | Dashboard |
| `Ctrl+2` | Projetos |
| `Ctrl+3` | Produção |
| `Ctrl+4` | Financeiro |
| `Ctrl+5` | Simulador |
| `Ctrl+0` | Command Center |
| `F12` | Ferramentas de Desenvolvedor |
| `Ctrl+Q` | Sair |

### Bandeja do Sistema (System Tray)

O aplicativo minimiza para a bandeja do sistema ao fechar. Clique duas vezes no ícone para restaurar.

---

## 🔒 Segurança

- O aplicativo roda em sandbox isolado
- Não requer conexão com internet para funcionar
- Dados armazenados localmente
- Context Isolation habilitado
- Node Integration desabilitado no renderer

---

## 🐛 Solução de Problemas

### Erro: "Aplicativo não abre"
1. Verifique se o Windows está atualizado
2. Execute como administrador
3. Verifique o antivírus

### Erro: "Tela em branco"
1. Pressione `Ctrl+Shift+R` para forçar reload
2. Delete a pasta `%APPDATA%/montex-erp-premium`

### Erro no Build
1. Delete `node_modules` e execute `npm install`
2. Verifique a versão do Node.js (mínimo 18.x)

---

## 📞 Suporte

- **Email**: suporte@grupomontex.com.br
- **Site**: https://grupomontex.com.br
- **Documentação**: https://docs.grupomontex.com.br

---

## 📄 Licença

Copyright © 2026 Grupo MONTEX. Todos os direitos reservados.
Este software é de uso exclusivo e não pode ser redistribuído.
