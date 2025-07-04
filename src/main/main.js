const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

class Application {
  constructor() {
    this.mainWindow = null;
    this.isDev = process.env.NODE_ENV === 'development';
    this.setupApp();
  }

  setupApp() {
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

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
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
      this.mainWindow.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  setupMenu() {
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

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIPC() {
    // Обработка открытия файлов
    ipcMain.handle('open-file-dialog', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
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
    ipcMain.handle('read-file', async (event, filePath) => {
      try {
        const resolvedPath = path.resolve(filePath);
        console.log('Читаем файл:', resolvedPath);
        
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`Файл не найден: ${resolvedPath}`);
        }
        
        const data = fs.readFileSync(resolvedPath);
        return data;
      } catch (error) {
        console.error('Error reading file:', error);
        throw error;
      }
    });

    // Обработка парсинга Excel файлов
    ipcMain.handle('parse-excel', async (event, buffer) => {
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Конвертируем в JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          raw: false,
          defval: ''
        });
        
        console.log('Парсинг Excel завершен. Строк:', jsonData.length);
        return jsonData;
      } catch (error) {
        console.error('Error parsing Excel:', error);
        throw error;
      }
    });
  }

  async openFile() {
    const result = await dialog.showOpenDialog(this.mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Data Files', extensions: ['xlsx', 'xls', 'csv', 'las'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      this.mainWindow.webContents.send('file-selected', result.filePaths[0]);
    }
  }

  toggleSimulation() {
    this.mainWindow.webContents.send('toggle-simulation');
  }

  openParametersDialog() {
    this.mainWindow.webContents.send('open-parameters-dialog');
  }
}

new Application(); 