@echo off
REM MONTEX ERP - Script de Build para Desktop (Windows)
REM Execute este script para criar o instalador Windows

echo ================================================
echo    MONTEX ERP Premium - Build Desktop
echo ================================================
echo.

REM Navegar para o diretório do projeto
cd /d "%~dp0\.."

echo [1/4] Verificando Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERRO: Node.js nao encontrado. Instale em https://nodejs.org
    pause
    exit /b 1
)

echo [2/4] Instalando dependencias do Electron...
call npm install electron electron-builder concurrently wait-on --save-dev

echo.
echo [3/4] Compilando aplicacao React...
call npm run build

echo.
echo [4/4] Gerando instalador Windows...
call npm run electron:build:win

echo.
echo ================================================
echo    BUILD CONCLUIDO!
echo.
echo    Os arquivos de instalacao estao em:
echo    .\release\
echo ================================================
echo.
pause
