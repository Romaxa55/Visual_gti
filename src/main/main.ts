import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

class Application {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
    this.setupApp();
  }

  private isDev: boolean;

  private setupApp() {
    app.whenReady().then(() => {
      this.createWindow();
      this.setupMenu();
      this.setupIPC();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      icon: path.join(__dirname, 'assets/icon.png'),
      title: 'GTI Data Visualizer',
      show: false,
    });

    // Загружаем приложение
    if (this.isDev) {
      this.mainWindow.loadURL('http://localhost:8080');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, 'index.html'));
    }

    // Показываем окно когда готово
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupMenu() {
    const template = [
      {
        label: 'Файл',
        submenu: [
          {
            label: 'Открыть файл данных',
            accelerator: 'CmdOrCtrl+O',
            click: () => this.openFile(),
          },
          { type: 'separator' },
          {
            label: 'Выход',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit(),
          },
        ],
      },
      {
        label: 'Вид',
        submenu: [
          {
            label: 'Режим симуляции',
            accelerator: 'CmdOrCtrl+S',
            click: () => this.toggleSimulation(),
          },
          {
            label: 'Настройки параметров',
            accelerator: 'CmdOrCtrl+P',
            click: () => this.openParametersDialog(),
          },
          { type: 'separator' },
          { role: 'reload' },
          { role: 'forcereload' },
          { role: 'toggledevtools' },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template as any);
    Menu.setApplicationMenu(menu);
  }

  private setupIPC() {
    // Обработка открытия файлов
    ipcMain.handle('open-file-dialog', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openFile'],
        filters: [
          { name: 'Data Files', extensions: ['xlsx', 'xls', 'csv', 'las'] },
          { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'LAS Files', extensions: ['las'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        return {
          path: filePath,
          name: path.basename(filePath),
          extension: path.extname(filePath).toLowerCase(),
        };
      }
      return null;
    });

    // Обработка чтения файлов
    ipcMain.handle('read-file', async (event, filePath: string) => {
      try {
        const data = fs.readFileSync(filePath);
        return data;
      } catch (error) {
        console.error('Error reading file:', error);
        throw error;
      }
    });
  }

  private async openFile() {
    const result = await dialog.showOpenDialog(this.mainWindow!, {
      properties: ['openFile'],
      filters: [
        { name: 'Data Files', extensions: ['xlsx', 'xls', 'csv', 'las'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      this.mainWindow?.webContents.send('file-selected', result.filePaths[0]);
    }
  }

  private toggleSimulation() {
    this.mainWindow?.webContents.send('toggle-simulation');
  }

  private openParametersDialog() {
    this.mainWindow?.webContents.send('open-parameters-dialog');
  }
}

new Application(); 