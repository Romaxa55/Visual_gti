import React, { useEffect, useRef } from 'react';
import { Typography, Card } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { GTIData, ParameterConfig } from '../App';

const { Title, Text } = Typography;

interface DataVisualizationProps {
  data: GTIData;
  parameterConfigs: ParameterConfig[];
  currentIndex: number;
  depthRange: [number, number];
  isSimulating: boolean;
}

const DataVisualization: React.FC<DataVisualizationProps> = ({
  data,
  parameterConfigs,
  currentIndex,
  depthRange,
  isSimulating
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Подготовка данных для графиков
  const prepareChartData = () => {
    const chartData: any[] = [];
    
    for (let i = 0; i < data.depth.length; i++) {
      const dataPoint: any = {
        depth: data.depth[i],
        time: data.time[i],
        index: i
      };
      
      // Добавляем параметры
      parameterConfigs.forEach(config => {
        if (config.visible && data.parameters[config.name]) {
          dataPoint[config.name] = data.parameters[config.name][i];
        }
      });
      
      chartData.push(dataPoint);
    }
    
    // Фильтруем по диапазону глубины
    return chartData.filter(point => 
      point.depth >= depthRange[0] && point.depth <= depthRange[1]
    );
  };

  // Разделение параметров на три группы для трех палеток
  const groupParameters = () => {
    const visibleParams = parameterConfigs.filter(config => config.visible);
    const groups = [[], [], []] as ParameterConfig[][];
    
    visibleParams.forEach((param, index) => {
      groups[index % 3].push(param);
    });
    
    return groups;
  };

  const chartData = prepareChartData();
  const parameterGroups = groupParameters();

  // Создание отдельного графика для каждой палетки
  const createChart = (parameters: ParameterConfig[], title: string) => {
    if (parameters.length === 0) {
      return (
        <div className="empty-chart">
          <Text type="secondary">Нет данных для отображения</Text>
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="depth" 
            type="number"
            domain={depthRange}
            label={{ value: 'Глубина (м)', position: 'insideBottom', offset: -10 }}
          />
          <YAxis 
            label={{ value: 'Значение', angle: -90, position: 'insideLeft' }}
          />
          
          {/* Линии для каждого параметра */}
          {parameters.map((param, index) => (
            <Line
              key={param.name}
              type="monotone"
              dataKey={param.name}
              stroke={param.color}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              name={`${param.name} (${param.unit})`}
            />
          ))}
          
          {/* Индикатор текущей позиции при симуляции */}
          {isSimulating && currentIndex < chartData.length && (
            <ReferenceLine 
              x={chartData[currentIndex]?.depth} 
              stroke="red" 
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="visualization-container" ref={containerRef}>
      {/* Заголовок */}
      <div className="visualization-header">
        <Title level={4} style={{ margin: 0 }}>
          Визуализация данных ГТИ
          {isSimulating && (
            <span className="simulation-indicator">
              Симуляция активна
            </span>
          )}
        </Title>
        <Text type="secondary">
          Записей: {data.depth.length} | Диапазон глубины: {depthRange[0]}-{depthRange[1]}м
          {isSimulating && ` | Текущий индекс: ${currentIndex}`}
        </Text>
      </div>

      {/* Основная область с тремя палетками */}
      <div className="visualization-content">
        {/* Первая палетка */}
        <div className="chart-column">
          <div className="chart-title">
            Палетка 1
            {parameterGroups[0].length > 0 && (
              <div style={{ fontSize: '12px', fontWeight: 'normal', marginTop: '4px' }}>
                {parameterGroups[0].map(p => p.name).join(', ')}
              </div>
            )}
          </div>
          <div className="chart-wrapper">
            {createChart(parameterGroups[0], 'Палетка 1')}
          </div>
        </div>

        {/* Вторая палетка */}
        <div className="chart-column">
          <div className="chart-title">
            Палетка 2
            {parameterGroups[1].length > 0 && (
              <div style={{ fontSize: '12px', fontWeight: 'normal', marginTop: '4px' }}>
                {parameterGroups[1].map(p => p.name).join(', ')}
              </div>
            )}
          </div>
          <div className="chart-wrapper">
            {createChart(parameterGroups[1], 'Палетка 2')}
          </div>
        </div>

        {/* Третья палетка */}
        <div className="chart-column">
          <div className="chart-title">
            Палетка 3
            {parameterGroups[2].length > 0 && (
              <div style={{ fontSize: '12px', fontWeight: 'normal', marginTop: '4px' }}>
                {parameterGroups[2].map(p => p.name).join(', ')}
              </div>
            )}
          </div>
          <div className="chart-wrapper">
            {createChart(parameterGroups[2], 'Палетка 3')}
          </div>
        </div>
      </div>

      {/* Информация о текущем состоянии */}
      {isSimulating && currentIndex < data.depth.length && (
        <div style={{ padding: '16px', background: '#f0f2f5', borderTop: '1px solid #e8e8e8' }}>
          <Text strong>Текущие значения:</Text>
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            <span>Глубина: {data.depth[currentIndex]?.toFixed(2)}м</span>
            <span>Время: {data.time[currentIndex]?.toFixed(2)}</span>
            {parameterConfigs.filter(p => p.visible).map(param => (
              <span key={param.name}>
                {param.name}: {data.parameters[param.name]?.[currentIndex]?.toFixed(2)} {param.unit}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataVisualization; 