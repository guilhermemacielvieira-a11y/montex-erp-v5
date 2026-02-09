/**
 * MONTEX ERP - Electron Main Process
 * Arquivo principal para aplicativo desktop nativo
 */

const { app, BrowserWindow, Menu, Tray, nativeImage, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Configurações
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const DEV_SERVER_URL = 'http://localhost:5173';

let mainWindow = null;
let tray = null;
let devServer = null;

// Criar ícone para a bandeja do sistema
function createTrayIcon() {
    // Placeholder - usar ícone real em produção
    const iconPath = path.join(__dirname, '../public/images/montex-icon.png');

    try {
        tray = new Tray(iconPath);

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Abrir MONTEX ERP',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                        mainWindow.focus();
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'Dashboard',
                click: () => {
                    mainWindow?.loadURL(isDev ? DEV_SERVER_URL : `file://${path.join(__dirname, '../dist/index.html')}`);
                }
            },
            {
                label: 'Command Center',
                click: () => {
                    const url = isDev ? `${DEV_SERVER_URL}/DashboardFuturista` : `file://${path.join(__dirname, '../dist/index.html')}#/DashboardFuturista`;
                    mainWindow?.loadURL(url);
                }
            },
            { type: 'separator' },
            {
                label: 'Preferências',
                accelerator: 'CmdOrCtrl+,',
                click: () => {
                    mainWindow?.webContents.send('open-settings');
                }
            },
            { type: 'separator' },
            {
                label: 'Sair',
                accelerator: 'CmdOrCtrl+Q',
                click: () => {
                    app.quit();
                }
            }
        ]);

        tray.setToolTip('MONTEX ERP');
        tray.setContextMenu(contextMenu);

        tray.on('click', () => {
            if (mainWindow) {
                mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
            }
        });
    } catch (e) {
        console.log('Tray icon not available:', e.message);
    }
}

// Criar janela principal
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 1000,
        minWidth: 1200,
        minHeight: 800,
        title: 'MONTEX ERP',
        icon: path.join(__dirname, '../public/images/montex-icon.png'),
        titleBarStyle: 'hiddenInset', // Estilo macOS nativo
        trafficLightPosition: { x: 15, y: 15 },
        backgroundColor: '#0f172a',
        show: false, // Mostrar apenas quando estiver pronto
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: !isDev,
        },
    });

    // Menu do aplicativo
    const menuTemplate = [
        {
            label: 'MONTEX ERP',
            submenu: [
                { label: 'Sobre MONTEX ERP', role: 'about' },
                { type: 'separator' },
                {
                    label: 'Preferências',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        mainWindow?.webContents.send('open-settings');
                    }
                },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Editar',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'Visualizar',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
                { type: 'separator' },
                {
                    label: 'Ferramentas de Desenvolvedor',
                    accelerator: 'Alt+CmdOrCtrl+I',
                    click: () => {
                        mainWindow?.webContents.toggleDevTools();
                    }
                }
            ]
        },
        {
            label: 'Navegação',
            submenu: [
                {
                    label: 'Dashboard',
                    accelerator: 'CmdOrCtrl+1',
                    click: () => navigateTo('DashboardPremium')
                },
                {
                    label: 'Command Center',
                    accelerator: 'CmdOrCtrl+2',
                    click: () => navigateTo('DashboardFuturista')
                },
                {
                    label: 'BI Analytics',
                    accelerator: 'CmdOrCtrl+3',
                    click: () => navigateTo('DashboardBI')
                },
                { type: 'separator' },
                {
                    label: 'Projetos',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => navigateTo('Projetos')
                },
                {
                    label: 'Produção',
                    click: () => navigateTo('ProducaoPage')
                },
                {
                    label: 'Financeiro',
                    click: () => navigateTo('FinanceiroPage')
                }
            ]
        },
        {
            label: 'Janela',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                { type: 'separator' },
                { role: 'front' },
                { type: 'separator' },
                { role: 'close' }
            ]
        },
        {
            label: 'Ajuda',
            submenu: [
                {
                    label: 'Documentação',
                    click: () => {
                        shell.openExternal('https://docs.grupomontex.com.br');
                    }
                },
                {
                    label: 'Suporte',
                    click: () => {
                        shell.openExternal('mailto:suporte@grupomontex.com.br');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Reportar Problema',
                    click: () => {
                        shell.openExternal('https://github.com/grupomontex/erp/issues');
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    // Carregar a aplicação
    if (isDev) {
        // Em desenvolvimento, carregar do servidor Vite
        mainWindow.loadURL(DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    } else {
        // Em produção, carregar do build
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Mostrar janela quando estiver pronta
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        // Splash screen delay (opcional)
        setTimeout(() => {
            mainWindow?.focus();
        }, 100);
    });

    // Abrir links externos no navegador
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Eventos da janela
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.on('close', (event) => {
        if (process.platform === 'darwin') {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

// Navegação entre páginas
function navigateTo(page) {
    if (mainWindow) {
        if (isDev) {
            mainWindow.loadURL(`${DEV_SERVER_URL}/${page}`);
        } else {
            mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
                hash: `/${page}`
            });
        }
    }
}

// Iniciar servidor de desenvolvimento (para modo dev)
function startDevServer() {
    return new Promise((resolve, reject) => {
        if (!isDev) {
            resolve();
            return;
        }

        console.log('Starting Vite dev server...');

        devServer = spawn('npm', ['run', 'dev'], {
            cwd: path.join(__dirname, '..'),
            shell: true,
            stdio: 'pipe'
        });

        devServer.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(output);

            if (output.includes('Local:') || output.includes('localhost:5173')) {
                resolve();
            }
        });

        devServer.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        devServer.on('error', reject);

        // Timeout de segurança
        setTimeout(resolve, 10000);
    });
}

// App ready
app.whenReady().then(async () => {
    // Configurações macOS
    if (process.platform === 'darwin') {
        app.dock.setIcon(path.join(__dirname, '../public/images/montex-icon.png'));
    }

    // Criar janela e tray
    createMainWindow();
    createTrayIcon();

    // Recriar janela se clicado no dock (macOS)
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        } else {
            mainWindow?.show();
        }
    });
});

// Fechar app quando todas as janelas forem fechadas (exceto macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Cleanup ao sair
app.on('before-quit', () => {
    if (devServer) {
        devServer.kill();
    }
});

// IPC handlers
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('show-notification', (event, { title, body }) => {
    const { Notification } = require('electron');
    new Notification({ title, body }).show();
});

ipcMain.handle('open-external', (event, url) => {
    shell.openExternal(url);
});

ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    return result.filePaths[0];
});
