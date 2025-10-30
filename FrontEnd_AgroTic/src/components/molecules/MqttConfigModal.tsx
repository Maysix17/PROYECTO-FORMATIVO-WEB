console.log('MqttConfigModal: Importing MqttConfig and mqttConfigService from zonasService');
import React, { useState, useEffect } from 'react';
import { type MqttConfig, mqttConfigService } from '../../services/zonasService';
import TextInput from '../atoms/TextInput';
import CustomButton from '../atoms/Boton';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';

interface MqttConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  zonaId: string;
  zonaNombre: string;
  existingConfig?: MqttConfig;
  onSave: () => void;
}
const MqttConfigModal: React.FC<MqttConfigModalProps> = ({
  isOpen,
  onClose,
  zonaId,
  zonaNombre,
  existingConfig,
  onSave,
}) => {
  console.log('MqttConfigModal: Component starting, props:', { isOpen, zonaId, zonaNombre, existingConfig });

  const [formData, setFormData] = useState({
    nombre: '',
    host: 'broker.hivemq.com',
    port: 8000,
    protocol: 'ws',
    topicBase: 'sensors/#',
    activa: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
    latency?: number;
  } | null>(null);
  const [isConnectionValidated, setIsConnectionValidated] = useState(false);

  console.log('MqttConfigModal: Rendering with formData:', formData);
  console.log('MqttConfigModal: isOpen:', isOpen, 'isLoading:', isLoading, 'error:', error);
  console.log('MqttConfigModal: connectionTestResult:', connectionTestResult);

  useEffect(() => {
    if (existingConfig) {
      setFormData({
        nombre: existingConfig.nombre,
        host: existingConfig.host,
        port: Number(existingConfig.port),
        protocol: existingConfig.protocol,
        topicBase: existingConfig.topicBase,
        activa: existingConfig.activa,
      });
    } else {
      setFormData({
        nombre: `Config ${zonaNombre}`,
        host: 'broker.hivemq.com',
        port: 8000,
        protocol: 'ws',
        topicBase: 'sensors/#',
        activa: true,
      });
    }
  }, [existingConfig, zonaNombre]);

  const testConnection = async () => {
    console.log('MqttConfigModal: Starting real MQTT connection test with data:', {
      host: formData.host,
      port: formData.port,
      protocol: formData.protocol,
      topicBase: formData.topicBase,
    });
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    setIsConnectionValidated(false);

    try {
      const startTime = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/mqtt-config/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: formData.host,
          port: formData.port,
          protocol: formData.protocol,
          topicBase: formData.topicBase,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const latency = Date.now() - startTime;

      console.log('MqttConfigModal: Connection test result:', result);

      // Actualizar resultado con latencia
      const resultWithLatency = { ...result, latency };

      setConnectionTestResult(resultWithLatency);

      // Marcar como validado solo si fue exitoso
      if (result.success) {
        setIsConnectionValidated(true);
      }

    } catch (err: any) {
      console.error('MqttConfigModal: Connection test error:', err);
      let errorMessage = 'Error al probar conexión';

      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMessage = 'No se pudo conectar al servidor. Verifica la URL del backend.';
      } else if (err.message.includes('HTTP 404')) {
        errorMessage = 'Endpoint de prueba no encontrado. El backend necesita implementar /mqtt-config/test-connection.';
      } else if (err.message.includes('HTTP 500')) {
        errorMessage = 'Error interno del servidor. Revisa los logs del backend.';
      } else {
        errorMessage += ': ' + err.message;
      }

      setConnectionTestResult({
        success: false,
        message: errorMessage,
      });
      setIsConnectionValidated(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = async () => {
    console.log('MqttConfigModal: Submitting form with data:', formData);

    // Validar que se haya probado la conexión exitosamente
    if (!isConnectionValidated) {
      setError('Debe probar la conexión exitosamente antes de guardar la configuración.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const configData = {
        ...formData,
      };

      console.log('MqttConfigModal: Config data to send:', configData);

      if (existingConfig) {
        console.log('MqttConfigModal: Updating existing config:', existingConfig.id);
        await mqttConfigService.update(existingConfig.id, configData);
      } else {
        console.log('MqttConfigModal: Creating new config');
        await mqttConfigService.create(configData);
      }

      onSave();
      onClose();
    } catch (err: any) {
      console.error('MqttConfigModal: Submit error:', err);
      setError(err.response?.data?.message || 'Error al guardar configuración');
    } finally {
      setIsLoading(false);
    }
  };

  const protocolOptions = [
    { key: 'ws', label: 'WebSocket (ws)' },
    { key: 'wss', label: 'WebSocket Seguro (wss)' },
    { key: 'mqtt', label: 'MQTT (mqtt)' },
  ];

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="sm">
      <ModalContent>
        <ModalHeader>
          <h2 className="text-lg font-semibold">
            {existingConfig ? 'Editar' : 'Crear'} Configuración de Bróker
          </h2>
        </ModalHeader>

        <ModalBody className="max-h-96 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-3">
            <TextInput
              label="Nombre"
              placeholder="Configuración 1"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />

            <div className="grid grid-cols-3 gap-2">
              <TextInput
                label="Host"
                placeholder="broker.hivemq.com"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
              />
              <TextInput
                label="Puerto"
                type="number"
                placeholder="8000"
                value={formData.port.toString()}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value, 10) || 0 })}
              />
              <div className="flex flex-col">
                <label className="text-gray-700 text-xs mb-1">Protocolo</label>
                <select
                  className="w-full h-9 px-2 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={formData.protocol}
                  onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                >
                  {protocolOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.key.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <TextInput
              label="Tópico Base"
              placeholder="sensors/#"
              value={formData.topicBase}
              onChange={(e) => setFormData({ ...formData, topicBase: e.target.value })}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="activa"
                  checked={formData.activa}
                  onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="activa" className="text-xs font-medium text-gray-700">
                  Activa
                </label>
              </div>

              <CustomButton
                type="button"
                text={isTestingConnection ? '...' : 'Probar'}
                onClick={testConnection}
                disabled={isTestingConnection || !formData.host || !formData.port || !formData.topicBase}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs"
              />
            </div>

            {connectionTestResult && (
              <div className={`text-xs px-2 py-1 rounded flex items-center ${
                connectionTestResult.success
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {connectionTestResult.success ? '✓' : '✗'} {connectionTestResult.message}
                {connectionTestResult.latency && (
                  <span className="ml-1">({connectionTestResult.latency}ms)</span>
                )}
              </div>
            )}

            {!isConnectionValidated && (
              <div className="text-xs text-amber-600 bg-amber-50 p-1 rounded border border-amber-200">
                ⚠️ Probar conexión antes de guardar
              </div>
            )}

            {error && (
              <div className="text-red-600 text-xs bg-red-50 p-1 rounded border border-red-200">
                {error}
              </div>
            )}
          </form>
        </ModalBody>

        <ModalFooter className="flex justify-end gap-2">
          <CustomButton
            type="button"
            text="Cancelar"
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1 text-sm"
          />
          <CustomButton
            type="button"
            text={isLoading ? '...' : 'Guardar'}
            onClick={handleSubmit}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1 text-sm"
            disabled={isLoading || !isConnectionValidated}
          />
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default MqttConfigModal;