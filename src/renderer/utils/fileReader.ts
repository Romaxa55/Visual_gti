import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface FileData {
  headers: string[];
  data: any[][];
  fileName: string;
  fileType: string;
}

export class FileReader {
  private ipcRenderer: any;

  constructor() {
    this.ipcRenderer = window.require('electron').ipcRenderer;
  }

  async readFile(filePath: string): Promise<FileData> {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'xlsx':
      case 'xls':
        return this.readExcelFile(filePath);
      case 'csv':
        return this.readCSVFile(filePath);
      case 'las':
        return this.readLASFile(filePath);
      default:
        throw new Error(`Неподдерживаемый тип файла: ${extension}`);
    }
  }

  private async readExcelFile(filePath: string): Promise<FileData> {
    try {
      const buffer = await this.ipcRenderer.invoke('read-file', filePath);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (jsonData.length === 0) {
        throw new Error('Файл пуст или не содержит данных');
      }

      const headers = jsonData[0] as string[];
      const data = jsonData.slice(1) as any[][];

      return {
        headers,
        data,
        fileName: filePath.split('/').pop() || 'unknown.xlsx',
        fileType: 'excel'
      };
    } catch (error) {
      throw new Error(`Ошибка чтения Excel файла: ${error}`);
    }
  }

  private async readCSVFile(filePath: string): Promise<FileData> {
    try {
      const buffer = await this.ipcRenderer.invoke('read-file', filePath);
      const textData = buffer.toString('utf-8');
      
      return new Promise((resolve, reject) => {
        Papa.parse(textData, {
          complete: (results) => {
            if (results.errors.length > 0) {
              reject(new Error('Ошибки в CSV файле: ' + results.errors.map(e => e.message).join(', ')));
              return;
            }

            const data = results.data as any[][];
            if (data.length === 0) {
              reject(new Error('CSV файл пуст'));
              return;
            }

            const headers = data[0];
            const rows = data.slice(1).filter(row => row.some(cell => cell !== ''));

            resolve({
              headers,
              data: rows,
              fileName: filePath.split('/').pop() || 'unknown.csv',
              fileType: 'csv'
            });
          },
          error: (error) => {
            reject(new Error(`Ошибка парсинга CSV: ${error.message}`));
          }
        });
      });
    } catch (error) {
      throw new Error(`Ошибка чтения CSV файла: ${error}`);
    }
  }

  private async readLASFile(filePath: string): Promise<FileData> {
    try {
      const buffer = await this.ipcRenderer.invoke('read-file', filePath);
      const textData = buffer.toString('utf-8');
      
      const lines = textData.split('\n');
      let isDataSection = false;
      let headers: string[] = [];
      let data: any[][] = [];

      // Парсинг LAS файла
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('~A') || line.startsWith('~ASCII')) {
          isDataSection = true;
          continue;
        }

        if (isDataSection) {
          if (line && !line.startsWith('#')) {
            const values = line.split(/\s+/).filter((v: string) => v.length > 0);
            if (values.length > 0) {
              if (headers.length === 0) {
                // Первая строка данных - определяем количество колонок
                headers = values.map((_: string, index: number) => `Column_${index + 1}`);
              }
              data.push(values.map((v: string) => {
                const num = parseFloat(v);
                return isNaN(num) ? v : num;
              }));
            }
          }
        } else if (line.startsWith('~C') || line.startsWith('~CURVE')) {
          // Парсинг заголовков из секции CURVE
          const curveMatch = line.match(/~C.*?\n(.*?)~[A-Z]/s);
          if (curveMatch) {
            const curveLines = curveMatch[1].split('\n');
            headers = curveLines
              .filter((l: string) => l.trim() && !l.startsWith('#'))
              .map((l: string) => l.split('.')[0].trim());
          }
        }
      }

      // Если заголовки не найдены, создаем стандартные
      if (headers.length === 0 && data.length > 0) {
        headers = ['DEPT', 'GR', 'NPHI', 'RHOB', 'RT'];
      }

      return {
        headers,
        data,
        fileName: filePath.split('/').pop() || 'unknown.las',
        fileType: 'las'
      };
    } catch (error) {
      throw new Error(`Ошибка чтения LAS файла: ${error}`);
    }
  }
} 