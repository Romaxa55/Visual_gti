import React, { useState } from 'react';
import { Modal, List, Switch, Input, Button, ColorPicker, Space, Typography, Divider } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { ParameterConfig } from '../App';

const { Text } = Typography;

interface ParametersDialogProps {
  visible: boolean;
  onClose: () => void;
  parameters: ParameterConfig[];
  onChange: (parameters: ParameterConfig[]) => void;
}

const ParametersDialog: React.FC<ParametersDialogProps> = ({
  visible,
  onClose,
  parameters,
  onChange
}) => {
  const [localParameters, setLocalParameters] = useState<ParameterConfig[]>(parameters);

  React.useEffect(() => {
    setLocalParameters(parameters);
  }, [parameters]);

  const handleParameterChange = (index: number, field: keyof ParameterConfig, value: any) => {
    const newParameters = [...localParameters];
    newParameters[index] = { ...newParameters[index], [field]: value };
    setLocalParameters(newParameters);
  };

  const handleSave = () => {
    onChange(localParameters);
    onClose();
  };

  const handleReset = () => {
    setLocalParameters(parameters);
  };

  const handleDeleteParameter = (index: number) => {
    const newParameters = localParameters.filter((_, i) => i !== index);
    setLocalParameters(newParameters);
  };

  return (
    <Modal
      title="Настройка параметров"
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="reset" onClick={handleReset}>
          Сбросить
        </Button>,
        <Button key="cancel" onClick={onClose}>
          Отмена
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          Сохранить
        </Button>
      ]}
    >
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
          Настройте отображение параметров на графиках. Параметры автоматически распределяются по трём палеткам.
        </Text>
        
        <List
          dataSource={localParameters}
          renderItem={(param, index) => (
            <List.Item key={param.name}>
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong style={{ flex: 1 }}>
                    {param.name}
                  </Text>
                  <Space>
                    <Switch
                      checked={param.visible}
                      onChange={(checked) => handleParameterChange(index, 'visible', checked)}
                      checkedChildren="Видимый"
                      unCheckedChildren="Скрытый"
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteParameter(index)}
                      title="Удалить параметр"
                    />
                  </Space>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text>Цвет:</Text>
                    <ColorPicker
                      value={param.color}
                      onChange={(color) => handleParameterChange(index, 'color', color.toHexString())}
                      size="small"
                    />
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text>Единица:</Text>
                    <Input
                      value={param.unit}
                      onChange={(e) => handleParameterChange(index, 'unit', e.target.value)}
                      style={{ width: 80 }}
                      placeholder="ед."
                    />
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 16, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text>Мин:</Text>
                    <Input
                      type="number"
                      value={param.min}
                      onChange={(e) => handleParameterChange(index, 'min', parseFloat(e.target.value) || 0)}
                      style={{ width: 80 }}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text>Макс:</Text>
                    <Input
                      type="number"
                      value={param.max}
                      onChange={(e) => handleParameterChange(index, 'max', parseFloat(e.target.value) || 0)}
                      style={{ width: 80 }}
                    />
                  </div>
                </div>
              </div>
            </List.Item>
          )}
        />
        
        {localParameters.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">Нет доступных параметров для настройки</Text>
          </div>
        )}
        
        <Divider />
        
        <div style={{ padding: '16px', background: '#f0f2f5', borderRadius: 8 }}>
          <Text strong>Информация о палетках:</Text>
          <div style={{ marginTop: 8 }}>
            <Text>• Палетка 1: {localParameters.filter((p, i) => p.visible && i % 3 === 0).map(p => p.name).join(', ') || 'Нет параметров'}</Text>
            <br />
            <Text>• Палетка 2: {localParameters.filter((p, i) => p.visible && i % 3 === 1).map(p => p.name).join(', ') || 'Нет параметров'}</Text>
            <br />
            <Text>• Палетка 3: {localParameters.filter((p, i) => p.visible && i % 3 === 2).map(p => p.name).join(', ') || 'Нет параметров'}</Text>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ParametersDialog; 