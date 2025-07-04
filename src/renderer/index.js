document.addEventListener('DOMContentLoaded', function() {
  const root = document.getElementById('root');
  loadDataAndVisualize();
});

async function loadDataAndVisualize() {
  const root = document.getElementById('root');
  
  // Показываем загрузку
  root.innerHTML = `
    <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif;">
      <h1 style="color: #1890ff; margin-bottom: 20px;">🚀 GTI Data Visualizer</h1>
      <p style="font-size: 18px; margin-bottom: 30px;">Загружаем Excel файл...</p>
      <div style="margin: 20px 0;">⏳ Обработка данных...</div>
    </div>
  `;

  try {
    // Попытка загрузить Excel файл через Electron
    if (window.require) {
      const { ipcRenderer } = window.require('electron');
      const filePath = './13.11.2024_time_1s.xlsx';
      
      try {
        const buffer = await ipcRenderer.invoke('read-file', filePath);
        const excelData = await ipcRenderer.invoke('parse-excel', buffer);
        const data = await parseExcelData(excelData);
        displayVisualization(data);
      } catch (error) {
        console.log('Не удалось загрузить файл через Electron, показываем демо данные:', error);
        displayVisualization(generateDemoData());
      }
    } else {
      // Веб версия - показываем демо данные
      displayVisualization(generateDemoData());
    }
  } catch (error) {
    console.error('Ошибка:', error);
    displayVisualization(generateDemoData());
  }
}

function generateDemoData() {
  const data = {
    depth: [],
    time: [],
    parameters: {
      'Глубина': [],
      'ГК (гамма-каротаж)': [],
      'НК (нейтронный каротаж)': [],
      'БК (боковой каротаж)': [],
      'Температура': [],
      'Давление': []
    }
  };

  // Генерируем демо данные
  for (let i = 0; i < 100; i++) {
    const depth = i * 0.5;
    data.depth.push(depth);
    data.time.push(i);
    data.parameters['Глубина'].push(depth);
    data.parameters['ГК (гамма-каротаж)'].push(20 + Math.sin(i * 0.1) * 15 + Math.random() * 5);
    data.parameters['НК (нейтронный каротаж)'].push(0.15 + Math.cos(i * 0.05) * 0.1 + Math.random() * 0.02);
    data.parameters['БК (боковой каротаж)'].push(2.2 + Math.sin(i * 0.08) * 0.3 + Math.random() * 0.1);
    data.parameters['Температура'].push(25 + depth * 0.02 + Math.random() * 2);
    data.parameters['Давление'].push(10 + depth * 0.1 + Math.random() * 1);
  }

  return data;
}

async function parseExcelData(excelData) {
  if (!excelData || excelData.length === 0) {
    console.log('Нет данных в Excel файле, используем демо данные');
    return generateDemoData();
  }

  try {
    // Первая строка - заголовки
    const headers = excelData[0];
    console.log('Заголовки:', headers);
    
    // Остальные строки - данные
    const rows = excelData.slice(1);
    console.log('Строк данных:', rows.length);
    
    const data = {
      depth: [],
      time: [],
      parameters: {}
    };

    // Инициализируем параметры
    headers.forEach(header => {
      if (header && header.trim()) {
        data.parameters[header.trim()] = [];
      }
    });

    // Обрабатываем каждую строку
    rows.forEach((row, index) => {
      // Добавляем глубину и время
      data.depth.push(index * 0.5);
      data.time.push(index);

      // Добавляем значения параметров
      headers.forEach((header, colIndex) => {
        if (header && header.trim()) {
          const value = row[colIndex];
          let numValue = 0;
          
          if (value !== undefined && value !== null && value !== '') {
            // Пытаемся преобразовать в число
            const parsed = parseFloat(value);
            numValue = isNaN(parsed) ? 0 : parsed;
          }
          
          data.parameters[header.trim()].push(numValue);
        }
      });
    });

    console.log('Данные обработаны:', Object.keys(data.parameters));
    return data;
  } catch (error) {
    console.error('Ошибка при парсинге Excel данных:', error);
    return generateDemoData();
  }
}

function displayVisualization(data) {
  const root = document.getElementById('root');
  
  // Разделяем параметры по палеткам для каротажа
  const paramNames = Object.keys(data.parameters).filter(key => key !== 'Глубина');
  const numPalettes = Math.min(6, Math.ceil(paramNames.length / 6)); // По 6 параметров на палетку
  const palettes = [];
  
  for (let i = 0; i < numPalettes; i++) {
    const start = Math.floor(i * paramNames.length / numPalettes);
    const end = Math.floor((i + 1) * paramNames.length / numPalettes);
    palettes.push(paramNames.slice(start, end));
  }

  root.innerHTML = `
    <div style="display: flex; height: 100vh; font-family: 'Courier New', monospace; background: #000; color: #fff;">
      <!-- Палетки каротажа -->
      ${palettes.map((paletteParams, index) => `
        <div style="flex: 1; border-right: 1px solid #333; display: flex; flex-direction: column; min-width: 250px;">
          <!-- Заголовок палетки -->
          <div style="background: #1a1a1a; padding: 6px; text-align: center; border-bottom: 1px solid #333; font-weight: bold; font-size: 11px;">
            ${getPaletteTitle(index)}
          </div>
          
          <!-- Область каротажных данных -->
          <div style="flex: 1; display: flex;">
            <!-- Левая панель с параметрами и значениями -->
            <div style="width: 45%; background: #0a0a0a; padding: 2px; font-size: 9px; overflow-y: auto; border-right: 1px solid #333;">
              ${createParameterList(data, paletteParams, index)}
            </div>
            
            <!-- Правая панель с каротажными кривыми -->
            <div style="width: 55%; background: #000; position: relative; overflow: hidden;" id="graphArea-${index}">
              ${createLogCurves(data, paletteParams, index)}
            </div>
          </div>
        </div>
      `).join('')}
      
      <!-- Шкала глубины -->
      <div style="width: 60px; background: #1a1a1a; border-left: 1px solid #333; display: flex; flex-direction: column;">
        <div style="background: #1a1a1a; padding: 6px; text-align: center; border-bottom: 1px solid #333; font-weight: bold; font-size: 11px;">
          Глубина, м
        </div>
        <div id="depthScale" style="flex: 1; position: relative; font-size: 8px; color: #ccc; overflow: hidden;">
          ${createDepthScale(data)}
        </div>
      </div>
    </div>
  `;

  // Панель управления каротажом
  const controlPanel = document.createElement('div');
  controlPanel.style.cssText = `
    position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.9); 
    padding: 8px; border-radius: 4px; border: 1px solid #555; z-index: 1000;
    font-size: 10px; color: #fff; min-width: 180px;
  `;
  controlPanel.innerHTML = `
    <div style="margin-bottom: 5px; font-weight: bold; text-align: center; border-bottom: 1px solid #333; padding-bottom: 3px;">
      Симуляция бурения
    </div>
    <div style="display: flex; gap: 5px; margin-bottom: 5px;">
      <button onclick="startSimulation()" style="background: #0a5d0a; color: white; border: none; padding: 3px 6px; border-radius: 2px; cursor: pointer; font-size: 9px;">▶️ Старт</button>
      <button onclick="stopSimulation()" style="background: #5d0a0a; color: white; border: none; padding: 3px 6px; border-radius: 2px; cursor: pointer; font-size: 9px;">⏸️ Стоп</button>
      <button onclick="resetSimulation()" style="background: #5d5d0a; color: white; border: none; padding: 3px 6px; border-radius: 2px; cursor: pointer; font-size: 9px;">🔄 Сброс</button>
    </div>
    <div style="margin-bottom: 5px;">
      <label style="font-size: 8px;">Скорость бурения:</label>
      <input type="range" id="speedSlider" min="50" max="1000" value="200" style="width: 100%; margin-top: 2px;">
    </div>
    <div style="display: flex; gap: 5px; margin-bottom: 5px;">
      <button onclick="scrollToDepth('up')" style="background: #333; color: white; border: none; padding: 3px 6px; border-radius: 2px; cursor: pointer; font-size: 9px;">▲</button>
      <button onclick="scrollToDepth('down')" style="background: #333; color: white; border: none; padding: 3px 6px; border-radius: 2px; cursor: pointer; font-size: 9px;">▼</button>
      <button onclick="scrollToDepth('top')" style="background: #333; color: white; border: none; padding: 3px 6px; border-radius: 2px; cursor: pointer; font-size: 9px;">🔝</button>
      <button onclick="scrollToDepth('bottom')" style="background: #333; color: white; border: none; padding: 3px 6px; border-radius: 2px; cursor: pointer; font-size: 9px;">🔻</button>
    </div>
    <div id="currentPosition" style="font-size: 8px; text-align: center; color: #ccc; border-top: 1px solid #333; padding-top: 3px;">
      Позиция: 0
    </div>
  `;
  document.body.appendChild(controlPanel);

  // Сохраняем данные глобально для симуляции
  window.gtiData = data;
  window.simulationIndex = 0;
  window.simulationInterval = null;
  window.viewportStart = 0;
  window.viewportSize = 100; // Количество точек в видимой области
  
  // Инициализация
  updateVisualization();
}

function getPaletteTitle(index) {
  const titles = [
    'Время',
    'Параметры бурения', 
    'Параметры циркуляции',
    'Емкостной блок',
    'Метан (С1), %',
    'Параметры газа'
  ];
  return titles[index] || `Палетка ${index + 1}`;
}

function createParameterList(data, parameters, paletteIndex) {
  if (parameters.length === 0) {
    return '<div style="text-align: center; color: #666; margin-top: 20px; font-size: 9px;">Нет параметров</div>';
  }

  return parameters.map((param, index) => {
    const values = data.parameters[param];
    const color = getParameterColor(paletteIndex, index);
    const currentValue = values[window.simulationIndex || 0];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a,b) => a+b, 0) / values.length;
    
    // Определяем единицы измерения
    const unit = getParameterUnit(param);
    
    return `
      <div style="margin-bottom: 3px; padding: 2px; background: #1a1a1a; border-left: 2px solid ${color}; font-size: 8px;">
        <div style="color: ${color}; font-weight: bold; font-size: 8px; margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${param}">
          ${param.length > 18 ? param.substring(0, 15) + '...' : param}
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 7px; color: #999; margin-bottom: 1px;">
          <span>Min ${min.toFixed(1)}</span>
          <span>Max ${max.toFixed(1)}</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 7px; color: #999; margin-bottom: 2px;">
          <span>Avg ${avg.toFixed(1)}</span>
          <span style="color: #666;">${unit}</span>
        </div>
        
        <div style="text-align: center; font-weight: bold; color: ${color}; font-size: 11px; background: rgba(0,0,0,0.5); padding: 1px; border-radius: 2px;">
          <span id="current-${param.replace(/\s/g, '')}">${currentValue ? currentValue.toFixed(2) : '0.00'}</span>
        </div>
        
        <!-- Мини-индикатор значения -->
        <div style="width: 100%; height: 2px; background: #333; margin-top: 1px; border-radius: 1px; overflow: hidden;">
          <div style="width: ${((currentValue - min) / (max - min) * 100) || 0}%; height: 100%; background: ${color}; transition: width 0.1s;"></div>
        </div>
      </div>
    `;
  }).join('');
}

function getParameterUnit(paramName) {
  const units = {
    'глубина': 'м',
    'температура': '°C',
    'давление': 'атм',
    'расход': 'л/мин',
    'скорость': 'м/ч',
    'момент': 'кН·м',
    'вес': 'т',
    'диаметр': 'мм',
    'плотность': 'г/см³',
    'вязкость': 'сП',
    'газ': '%',
    'метан': '%',
    'время': 'с',
    'обороты': 'об/мин',
    'ток': 'А',
    'напряжение': 'В'
  };
  
  const lowerParam = paramName.toLowerCase();
  for (const [key, unit] of Object.entries(units)) {
    if (lowerParam.includes(key)) {
      return unit;
    }
  }
  
  return ''; // Без единицы если не определено
}

function createLogCurves(data, parameters, paletteIndex) {
  let svg = `<svg width="100%" height="100%" style="position: absolute; top: 0; left: 0; background: #000;" id="logCurves-${paletteIndex}">`;
  
  // Создаем сетку по глубине (горизонтальные линии)
  for (let i = 0; i <= 20; i++) {
    const y = (i / 20) * 100;
    svg += `<line x1="0" y1="${y}%" x2="100%" y2="${y}%" stroke="#333" stroke-width="0.3" opacity="0.5"/>`;
  }
  
  // Вертикальные линии для разделения кривых
  const curveWidth = 100 / parameters.length;
  for (let i = 1; i < parameters.length; i++) {
    const x = i * curveWidth;
    svg += `<line x1="${x}%" y1="0" x2="${x}%" y2="100%" stroke="#555" stroke-width="0.5" opacity="0.7"/>`;
  }
  
  // Рисуем каротажные кривые
  parameters.forEach((param, index) => {
    const values = data.parameters[param];
    const color = getParameterColor(paletteIndex, index);
    
    if (values && values.length > 0) {
      const max = Math.max(...values);
      const min = Math.min(...values);
      const range = max - min || 1;
      
      // Каждая кривая занимает свою полосу
      const curveLeft = index * curveWidth;
      const curveRight = (index + 1) * curveWidth;
      const curveCenter = (curveLeft + curveRight) / 2;
      
      // Создаем путь для каротажной кривой
      let path = '';
      const viewportEnd = Math.min(window.viewportStart + window.viewportSize, values.length);
      
      for (let i = window.viewportStart; i < viewportEnd; i++) {
        const normalizedValue = (values[i] - min) / range;
        const x = curveCenter + (normalizedValue - 0.5) * (curveWidth * 0.8); // Кривая в пределах своей полосы
        const y = ((i - window.viewportStart) / window.viewportSize) * 100;
        
        if (i === window.viewportStart) {
          path += `M ${x} ${y}`;
        } else {
          path += ` L ${x} ${y}`;
        }
      }
      
      svg += `<path d="${path}" fill="none" stroke="${color}" stroke-width="1.2" opacity="0.9" id="curve-${paletteIndex}-${index}"/>`;
      
      // Добавляем заливку для некоторых кривых
      if (index % 2 === 0) {
        let fillPath = path + ` L ${curveCenter} ${100} L ${curveCenter} 0 Z`;
        svg += `<path d="${fillPath}" fill="${color}" opacity="0.1"/>`;
      }
    }
  });
  
  // Маркер текущей позиции бурения
  const currentY = ((window.simulationIndex - window.viewportStart) / window.viewportSize) * 100;
  svg += `<line id="currentMarker-${paletteIndex}" x1="0" y1="${currentY}%" x2="100%" y2="${currentY}%" stroke="#ff0" stroke-width="2" opacity="0.8"/>`;
  
  svg += `</svg>`;
  return svg;
}

function createDepthScale(data) {
  const viewportEnd = Math.min(window.viewportStart + window.viewportSize, data.depth.length - 1);
  const startDepth = data.depth[window.viewportStart] || 0;
  const endDepth = data.depth[viewportEnd] || 0;
  const depthRange = endDepth - startDepth;
  
  let html = '';
  
  // Создаем шкалу глубины для текущего viewport'а
  const numTicks = 15;
  for (let i = 0; i <= numTicks; i++) {
    const depth = startDepth + (depthRange * i / numTicks);
    const position = (i / numTicks) * 100;
    
    // Маркер текущей позиции бурения
    const isCurrentDepth = Math.abs(depth - (data.depth[window.simulationIndex] || 0)) < (depthRange / numTicks / 2);
    const color = isCurrentDepth ? '#ff0' : '#ccc';
    const weight = isCurrentDepth ? 'bold' : 'normal';
    
    html += `
      <div style="position: absolute; top: ${position}%; left: 2px; color: ${color}; font-size: 8px; font-weight: ${weight}; transform: translateY(-50%); width: 100%; text-align: center;">
        ${depth.toFixed(1)}
      </div>
    `;
    
    // Добавляем горизонтальную линию для основных отметок
    if (i % 3 === 0) {
      html += `
        <div style="position: absolute; top: ${position}%; right: 0; width: 8px; height: 1px; background: ${color}; opacity: 0.7;"></div>
      `;
    }
  }
  
  // Маркер текущей глубины бурения
  if (window.simulationIndex < data.depth.length) {
    const currentDepth = data.depth[window.simulationIndex];
    if (currentDepth >= startDepth && currentDepth <= endDepth) {
      const currentPosition = ((currentDepth - startDepth) / depthRange) * 100;
      html += `
        <div style="position: absolute; top: ${currentPosition}%; left: 0; width: 100%; height: 2px; background: #ff0; opacity: 0.8; z-index: 10;"></div>
        <div style="position: absolute; top: ${currentPosition}%; right: 10px; color: #ff0; font-size: 7px; font-weight: bold; transform: translateY(-50%); background: rgba(0,0,0,0.7); padding: 1px 2px; border-radius: 2px;">
          ●${currentDepth.toFixed(2)}
        </div>
      `;
    }
  }
  
  return html;
}

function getParameterColor(paletteNum, index) {
  const colorPalettes = [
    ['#00ff00', '#ffff00', '#ff0000', '#00ffff', '#ff00ff', '#ffffff'],
    ['#ff8800', '#88ff00', '#0088ff', '#ff0088', '#8800ff', '#00ff88'],
    ['#ffff80', '#80ffff', '#ff80ff', '#80ff80', '#ff8080', '#8080ff'],
    ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'],
    ['#cc0000', '#00cc00', '#0000cc', '#cccc00', '#cc00cc', '#00cccc'],
    ['#888888', '#aaaaaa', '#cccccc', '#666666', '#999999', '#bbbbbb']
  ];
  
  return colorPalettes[paletteNum % colorPalettes.length][index % 6];
}

function openFile() {
  if (window.require) {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.invoke('open-file-dialog').then(result => {
      if (result) {
        alert('Файл выбран: ' + result.name);
        // Здесь будет обработка файла
      }
    });
  } else {
    alert('Функция загрузки файлов доступна только в десктопной версии');
  }
}

// Функции симуляции бурения
function startSimulation() {
  if (!window.gtiData) return;
  
  stopSimulation(); // Останавливаем предыдущую симуляцию
  
  const speed = parseInt(document.getElementById('speedSlider').value);
  
  window.simulationInterval = setInterval(() => {
    window.simulationIndex++;
    
    if (window.simulationIndex >= window.gtiData.depth.length) {
      stopSimulation(); // Останавливаем в конце
      return;
    }
    
    // Автоскролл при симуляции
    if (window.simulationIndex > window.viewportStart + window.viewportSize - 10) {
      window.viewportStart = Math.max(0, window.simulationIndex - window.viewportSize + 10);
    }
    
    updateVisualization();
  }, speed);
}

function stopSimulation() {
  if (window.simulationInterval) {
    clearInterval(window.simulationInterval);
    window.simulationInterval = null;
  }
}

function resetSimulation() {
  stopSimulation();
  window.simulationIndex = 0;
  window.viewportStart = 0;
  updateVisualization();
}

function scrollToDepth(direction) {
  const scrollStep = Math.floor(window.viewportSize / 4);
  
  switch(direction) {
    case 'up':
      window.viewportStart = Math.max(0, window.viewportStart - scrollStep);
      break;
    case 'down':
      window.viewportStart = Math.min(window.gtiData.depth.length - window.viewportSize, window.viewportStart + scrollStep);
      break;
    case 'top':
      window.viewportStart = 0;
      break;
    case 'bottom':
      window.viewportStart = Math.max(0, window.gtiData.depth.length - window.viewportSize);
      break;
  }
  
  updateVisualization();
}

function updateVisualization() {
  if (!window.gtiData) return;
  
  const data = window.gtiData;
  const index = window.simulationIndex;
  
  // Обновляем позицию
  const positionElement = document.getElementById('currentPosition');
  if (positionElement) {
    const currentDepth = data.depth[index] || 0;
    const viewStart = data.depth[window.viewportStart] || 0;
    const viewEnd = data.depth[Math.min(window.viewportStart + window.viewportSize - 1, data.depth.length - 1)] || 0;
    
    positionElement.innerHTML = `
      Глубина: ${currentDepth.toFixed(2)}м<br>
      Вид: ${viewStart.toFixed(1)}-${viewEnd.toFixed(1)}м<br>
      Точка: ${index + 1}/${data.depth.length}
    `;
  }
  
  // Обновляем значения параметров
  Object.keys(data.parameters).forEach(param => {
    const elementId = `current-${param.replace(/\s/g, '')}`;
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = data.parameters[param][index]?.toFixed(2) || '0.00';
    }
  });
  
  // Обновляем каротажные кривые
  const paramNames = Object.keys(data.parameters).filter(key => key !== 'Глубина');
  const numPalettes = Math.min(6, Math.ceil(paramNames.length / 6));
  
  for (let paletteIndex = 0; paletteIndex < numPalettes; paletteIndex++) {
    const start = Math.floor(paletteIndex * paramNames.length / numPalettes);
    const end = Math.floor((paletteIndex + 1) * paramNames.length / numPalettes);
    const paletteParams = paramNames.slice(start, end);
    
    const graphArea = document.getElementById(`graphArea-${paletteIndex}`);
    if (graphArea) {
      graphArea.innerHTML = createLogCurves(data, paletteParams, paletteIndex);
    }
  }
  
  // Обновляем шкалу глубины
  const depthScale = document.getElementById('depthScale');
  if (depthScale) {
    depthScale.innerHTML = createDepthScale(data);
  }
} 