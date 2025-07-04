import { GTIData } from '../App';
import { FileData } from './fileReader';

export class DataProcessor {
  processData(fileData: FileData): GTIData {
    const { headers, data } = fileData;
    
    if (!headers || headers.length === 0) {
      throw new Error('Заголовки не найдены');
    }

    if (!data || data.length === 0) {
      throw new Error('Данные не найдены');
    }

    // Определяем колонки для глубины и времени
    const depthColumnIndex = this.findDepthColumn(headers);
    const timeColumnIndex = this.findTimeColumn(headers);
    
    // Извлекаем данные
    const depth: number[] = [];
    const time: number[] = [];
    const parameters: { [key: string]: number[] } = {};

    // Инициализируем параметры
    headers.forEach((header, index) => {
      if (index !== depthColumnIndex && index !== timeColumnIndex) {
        parameters[header] = [];
      }
    });

    // Обрабатываем каждую строку данных
    data.forEach((row, rowIndex) => {
      // Глубина
      const depthValue = this.parseNumericValue(row[depthColumnIndex]);
      if (depthValue !== null) {
        depth.push(depthValue);
      } else {
        depth.push(rowIndex); // Используем индекс строки как глубину
      }

      // Время
      const timeValue = timeColumnIndex !== -1 ? 
        this.parseNumericValue(row[timeColumnIndex]) : 
        rowIndex;
      time.push(timeValue !== null ? timeValue : rowIndex);

      // Параметры
      headers.forEach((header, index) => {
        if (index !== depthColumnIndex && index !== timeColumnIndex) {
          const value = this.parseNumericValue(row[index]);
          parameters[header].push(value !== null ? value : 0);
        }
      });
    });

    // Убираем пустые параметры
    Object.keys(parameters).forEach(key => {
      if (parameters[key].every(val => val === 0)) {
        delete parameters[key];
      }
    });

    return {
      depth,
      time,
      parameters
    };
  }

  private findDepthColumn(headers: string[]): number {
    const depthKeywords = ['depth', 'dept', 'глубина', 'гл', 'md', 'tvd'];
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase();
      if (depthKeywords.some(keyword => header.includes(keyword))) {
        return i;
      }
    }
    
    // Если не найдено, используем первую колонку
    return 0;
  }

  private findTimeColumn(headers: string[]): number {
    const timeKeywords = ['time', 'время', 'час', 'мин', 'сек', 'timestamp'];
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase();
      if (timeKeywords.some(keyword => header.includes(keyword))) {
        return i;
      }
    }
    
    // Если не найдено, возвращаем -1 (время будет сгенерировано)
    return -1;
  }

  private parseNumericValue(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return isNaN(value) ? null : value;
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  // Фильтрация данных по диапазону глубины
  filterByDepthRange(data: GTIData, minDepth: number, maxDepth: number): GTIData {
    const filteredIndices: number[] = [];
    
    data.depth.forEach((depth, index) => {
      if (depth >= minDepth && depth <= maxDepth) {
        filteredIndices.push(index);
      }
    });

    const filteredData: GTIData = {
      depth: filteredIndices.map(i => data.depth[i]),
      time: filteredIndices.map(i => data.time[i]),
      parameters: {}
    };

    Object.keys(data.parameters).forEach(key => {
      filteredData.parameters[key] = filteredIndices.map(i => data.parameters[key][i]);
    });

    return filteredData;
  }

  // Получение статистики по параметру
  getParameterStats(values: number[]): { min: number; max: number; avg: number; count: number } {
    const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
    
    if (validValues.length === 0) {
      return { min: 0, max: 0, avg: 0, count: 0 };
    }

    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const avg = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;

    return { min, max, avg, count: validValues.length };
  }

  // Нормализация данных для лучшей визуализации
  normalizeValues(values: number[], targetMin: number = 0, targetMax: number = 1): number[] {
    const stats = this.getParameterStats(values);
    
    if (stats.min === stats.max) {
      return values.map(() => targetMin);
    }

    const range = stats.max - stats.min;
    const targetRange = targetMax - targetMin;

    return values.map(value => {
      if (value === null || value === undefined || isNaN(value)) {
        return targetMin;
      }
      return targetMin + ((value - stats.min) / range) * targetRange;
    });
  }
} 