const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  fs.appendFileSync(
    path.join(app.getPath('userData'), 'error.log'),
    `${new Date().toISOString()} - Uncaught Exception: ${error.stack}\n`
  );
  app.exit(1);
});

process.on('unhandledRejection', (reason) => {
  fs.appendFileSync(
    path.join(app.getPath('userData'), 'error.log'),
    `${new Date().toISOString()} - Unhandled Rejection: ${reason}\n`
  );
});

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Sticks - Печать этикеток',
    backgroundColor: '#0f0f1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    show: false
  });

  // Load the app
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // Development: load from local files
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  } else {
    // Production: load from built files
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('Sticks app started');
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create menu
  createMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMenu() {
  const template = [
    {
      label: 'Файл',
      submenu: [
        {
          label: 'Новый шаблон',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-action', 'new-template')
        },
        {
          label: 'Открыть...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              filters: [
                { name: 'Все файлы', extensions: ['*'] },
                { name: 'JSON', extensions: ['json'] }
              ]
            });
            if (!result.canceled && result.filePaths[0]) {
              mainWindow?.webContents.send('file-opened', result.filePaths[0]);
            }
          }
        },
        {
          label: 'Сохранить',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu-action', 'save')
        },
        { type: 'separator' },
        {
          label: 'Экспорт данных...',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow, {
              defaultPath: 'sticks-backup.json',
              filters: [{ name: 'JSON', extensions: ['json'] }]
            });
            if (!result.canceled) {
              mainWindow?.webContents.send('export-data', result.filePath);
            }
          }
        },
        {
          label: 'Импорт данных...',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              filters: [{ name: 'JSON', extensions: ['json'] }]
            });
            if (!result.canceled && result.filePaths[0]) {
              mainWindow?.webContents.send('import-data', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Правка',
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
      label: 'Вид',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Печать',
      submenu: [
        {
          label: 'Печать...',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow?.webContents.send('menu-action', 'print')
        },
        {
          label: 'Быстрая печать',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWindow?.webContents.send('menu-action', 'quick-print')
        }
      ]
    },
    {
      label: 'Справка',
      submenu: [
        {
          label: 'О программе',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'О Sticks',
              message: 'Sticks v1.0.0',
              detail: 'Универсальная система печати этикеток с ИИ.\n\n© 2026'
            });
          }
        },
        {
          label: 'Документация',
          click: () => shell.openExternal('https://github.com/smol0901-jpg/sticks')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers
ipcMain.handle('get-app-path', () => app.getPath('userData'));
ipcMain.handle('get-version', () => app.getVersion());

ipcMain.handle('show-save-dialog', async (event, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('print', async (event, options) => {
  return new Promise((resolve) => {
    mainWindow.webContents.print(options, (success, errorType) => {
      resolve({ success, errorType });
    });
  });
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.protocol !== 'file:' && !navigationUrl.startsWith('http')) {
      event.preventDefault();
    }
  });
});