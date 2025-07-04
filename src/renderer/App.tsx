import React, { useState, useEffect } from 'react';
import { Layout, Button, Upload, message, Card, Row, Col, Space, Typography, Slider, Switch } from 'antd';
import { UploadOutlined, PlayCircleOutlined, PauseCircleOutlined, SettingOutlined } from '@ant-design/icons';
import './types/electron';
import './App.css';

// Temporary stub components until proper implementation
const DataVisualization = ({ data, parameterConfigs, currentIndex, depthRange, isSimulating }: any) => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h3>Визуализация данных ГТИ</h3>
    <p>Загруженные данные: {data ? 'Да' : 'Нет'}</p>
    <p>Симуляция: {isSimulating ? 'Активна' : 'Неактивна'}</p>
  </div>
);

const ParametersDialog = ({ visible, onClose, parameters, onChange }: any) => (
  <div style={{ display: visible ? 'block' : 'none' }}>Настройки параметров</div>
);

// Temporary data processing classes
class DataProcessor {
  processData(fileData: any) {
    return {
      depth: [1, 2, 3, 4, 5],
      time: [1, 2, 3, 4, 5],
      parameters: { test: [10, 20, 30, 40, 50] } as { [key: string]: number[] }
    };
  }
}

class FileReader {
  readFile(filePath: string) {
    return Promise.resolve({
      headers: ['depth', 'test'],
      data: [[1, 10], [2, 20], [3, 30]],
      fileName: 'test.csv',
      fileType: 'csv'
    });
  }
}

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

export interface GTIData {
  depth: number[];
  time: number[];
  parameters: { [key: string]: number[] };
}

export interface ParameterConfig {
  name: string;
  color: string;
  min: number;
  max: number;
  unit: string;
  visible: boolean;
}

const App: React.FC = () => {
  const [data, setData] = useState<GTIData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1000);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [parametersVisible, setParametersVisible] = useState(false);
  const [parameterConfigs, setParameterConfigs] = useState<ParameterConfig[]>([]);
  const [depthRange, setDepthRange] = useState<[number, number]>([0, 100]);
  const [fileName, setFileName] = useState<string>('');

  const dataProcessor = new DataProcessor();
  const fileReader = new FileReader();

  useEffect(() => {
    // Слушаем события от главного процесса
    const { ipcRenderer } = window.require('electron');
    
    ipcRenderer.on('file-selected', (event: any, filePath: string) => {
      handleFileLoad(filePath);
    });

    ipcRenderer.on('toggle-simulation', () => {
      setIsSimulating(prev => !prev);
    });

    ipcRenderer.on('open-parameters-dialog', () => {
      setParametersVisible(true);
    });

    return () => {
      ipcRenderer.removeAllListeners('file-selected');
      ipcRenderer.removeAllListeners('toggle-simulation');
      ipcRenderer.removeAllListeners('open-parameters-dialog');
    };
  }, []);

  // Симуляция данных
  useEffect(() => {
    if (!isSimulating || !data) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = prev + 1;
        if (nextIndex >= data.depth.length) {
          setIsSimulating(false);
          return 0;
        }
        return nextIndex;
      });
    }, simulationSpeed);

    return () => clearInterval(interval);
  }, [isSimulating, data, simulationSpeed]);

  const handleFileLoad = async (filePath: string) => {
    setLoading(true);
    try {
      const fileData = await fileReader.readFile(filePath);
      const processedData = dataProcessor.processData(fileData);
      
      setData(processedData);
      setFileName(filePath.split('/').pop() || 'Unknown');
      
      // Настройка параметров по умолчанию
      const configs = Object.keys(processedData.parameters).map((key, index) => {
        const values = processedData.parameters[key] || [];
        return {
          name: key,
          color: getDefaultColor(index),
          min: Math.min(...values),
          max: Math.max(...values),
          unit: getDefaultUnit(key),
          visible: true,
        };
      });
      
      setParameterConfigs(configs);
      setDepthRange([Math.min(...processedData.depth), Math.max(...processedData.depth)]);
      setCurrentIndex(0);
      
      message.success(`Файл загружен: ${fileName}`);
    } catch (error) {
      message.error('Ошибка при загрузке файла');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const filePath = (file as any).path;
    await handleFileLoad(filePath);
    return false; // Предотвращаем загрузку на сервер
  };

  const getDefaultColor = (index: number): string => {
    const colors = ['#1890ff', '#52c41a', '#fa541c', '#722ed1', '#eb2f96', '#13c2c2', '#faad14'];
    return colors[index % colors.length];
  };

  const getDefaultUnit = (paramName: string): string => {
    const name = paramName.toLowerCase();
    if (name.includes('depth')) return 'м';
    if (name.includes('time')) return 'с';
    if (name.includes('temperature')) return '°C';
    if (name.includes('pressure')) return 'МПа';
    if (name.includes('flow')) return 'л/мин';
    return 'ед.';
  };

  const handleParameterConfigChange = (configs: ParameterConfig[]) => {
    setParameterConfigs(configs);
  };

  const openFileDialog = async () => {
    const { ipcRenderer } = window.require('electron');
    const result = await ipcRenderer.invoke('open-file-dialog');
    if (result) {
      await handleFileLoad(result.path);
    }
  };

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-content">
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            GTI Data Visualizer
          </Title>
          <Space>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={openFileDialog}
              loading={loading}
            >
              Загрузить файл
            </Button>
            <Upload
              accept=".xlsx,.xls,.csv,.las"
              beforeUpload={handleFileUpload}
              showUploadList={false}
              style={{ display: 'none' }}
            >
              <Button icon={<UploadOutlined />}>Альтернативная загрузка</Button>
            </Upload>
          </Space>
        </div>
      </Header>

      <Layout>
        <Sider width={300} className="app-sider">
          <div className="sider-content">
            <Card title="Управление" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  <Text>Файл: {fileName || 'Не выбран'}</Text>
                </div>
                
                <div>
                  <Text>Режим симуляции:</Text>
                  <div style={{ marginTop: 8 }}>
                    <Button
                      type={isSimulating ? 'default' : 'primary'}
                      icon={isSimulating ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                      onClick={() => setIsSimulating(!isSimulating)}
                      disabled={!data}
                      block
                    >
                      {isSimulating ? 'Пауза' : 'Старт'}
                    </Button>
                  </div>
                </div>

                <div>
                  <Text>Скорость симуляции: {simulationSpeed}мс</Text>
                  <Slider
                    min={100}
                    max={3000}
                    value={simulationSpeed}
                    onChange={setSimulationSpeed}
                    tooltip={{ formatter: (value) => `${value}мс` }}
                  />
                </div>

                <div>
                  <Text>Текущий индекс: {currentIndex}</Text>
                  <Slider
                    min={0}
                    max={data?.depth.length ? data.depth.length - 1 : 100}
                    value={currentIndex}
                    onChange={setCurrentIndex}
                    disabled={isSimulating}
                  />
                </div>

                <div>
                  <Text>Диапазон глубины:</Text>
                  <Slider
                    range
                    min={data?.depth.length ? Math.min(...data.depth) : 0}
                    max={data?.depth.length ? Math.max(...data.depth) : 100}
                    value={depthRange}
                    onChange={(value) => setDepthRange(value as [number, number])}
                  />
                </div>

                <Button
                  icon={<SettingOutlined />}
                  onClick={() => setParametersVisible(true)}
                  disabled={!data}
                  block
                >
                  Настройки параметров
                </Button>
              </Space>
            </Card>
          </div>
        </Sider>

        <Content className="app-content">
          <div className="content-area">
            {data ? (
              <DataVisualization
                data={data}
                parameterConfigs={parameterConfigs}
                currentIndex={currentIndex}
                depthRange={depthRange}
                isSimulating={isSimulating}
              />
            ) : (
              <div className="empty-state">
                <Title level={4}>Добро пожаловать в GTI Data Visualizer</Title>
                <Text>Загрузите файл данных для начала работы</Text>
                <br />
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<UploadOutlined />}
                  onClick={openFileDialog}
                  style={{ marginTop: 16 }}
                >
                  Загрузить файл
                </Button>
              </div>
            )}
          </div>
        </Content>
      </Layout>

      <ParametersDialog
        visible={parametersVisible}
        onClose={() => setParametersVisible(false)}
        parameters={parameterConfigs}
        onChange={handleParameterConfigChange}
      />
    </Layout>
  );
};

export default App; 