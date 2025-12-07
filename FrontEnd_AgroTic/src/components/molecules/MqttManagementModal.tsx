import React, { useState, useEffect } from 'react';
import { type MqttConfig, mqttConfigService } from '../../services/zonasService';
import CustomButton from '../atoms/Boton';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { PlusIcon, PencilIcon, TrashIcon, PlayIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import MqttConfigModal from './MqttConfigModal';
import { usePermission } from '../../contexts/PermissionContext';

const MqttManagementModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { hasPermission } = usePermission();
  const [mqttConfigs, setMqttConfigs] = useState<MqttConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<MqttConfig | undefined>();
  const [testingConfig, setTestingConfig] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latency?: number }>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfigs();
    }
  }, [isOpen]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await mqttConfigService.getAll();
      setMqttConfigs(data);
    } catch (error) {
      console.error('Error loading configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = () => {
    setSelectedConfig(undefined);
    setShowConfigModal(true);
  };

  const handleEditConfig = (config: MqttConfig) => {
    setSelectedConfig(config);
    setShowConfigModal(true);
  };

  const handleDeleteConfig = async (configId: string) => {
    try {
      setSuccessMessage(null);
      setErrorMessage(null);
      await mqttConfigService.delete(configId);
      await loadConfigs();
      setSuccessMessage('Configuración eliminada exitosamente.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error deleting config:', error);
      if (error.response?.status === 409 || error.response?.data?.message?.includes('uso')) {
        setErrorMessage('No se puede eliminar la configuración porque está siendo usada en una o más zonas.');
      } else {
        setErrorMessage('No se puede eliminar la configuración porque está siendo usada en una o más zonas.');
      }
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleConfigSave = () => {
    setShowConfigModal(false);
    loadConfigs();
    setSuccessMessage('Configuración guardada exitosamente.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };


  const testConnection = async (config: MqttConfig) => {
    setTestingConfig(config.id);
    setTestResults(prev => ({ ...prev, [config.id]: { success: false, message: 'Probando...' } }));

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/mqtt-config/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: config.host,
          port: config.port.toString(),
          protocol: config.protocol,
          topicBase: config.topicBase,
        }),
      });

      const result = await response.json();
      setTestResults(prev => ({ ...prev, [config.id]: result }));
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [config.id]: {
          success: false,
          message: error.message || 'Error al probar conexión',
        }
      }));
    } finally {
      setTestingConfig(null);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onOpenChange={onClose} size="xl">
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-lg font-semibold">Gestión de Configuraciones de Bróker</h2>
              {(hasPermission('zonas', 'zonas', 'crear') || hasPermission('IoT', 'iot', 'crear')) && (
                <CustomButton
                  type="button"
                  text="Nueva Configuración"
                  onClick={handleCreateConfig}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm"
                  icon={<PlusIcon className="w-4 h-4" />}
                />
              )}
            </div>
          </ModalHeader>

          <ModalBody>
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando configuraciones...</p>
              </div>
            ) : mqttConfigs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay configuraciones de bróker</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {mqttConfigs.map((config) => {
                  const testResult = testResults[config.id];

                  return (
                    <div key={config.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium text-gray-900">{config.nombre}</h3>
                          <p className="text-sm text-gray-600">
                            {config.protocol}://{config.host}:{config.port} - {config.topicBase}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            config.activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {config.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CustomButton
                            type="button"
                            text={testingConfig === config.id ? 'Probando...' : 'Probar'}
                            onClick={() => testConnection(config)}
                            disabled={testingConfig === config.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-sm"
                            icon={<PlayIcon className="w-3 h-3" />}
                          />

                          {testResult && (
                            <div className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${
                              testResult.success
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {testResult.success ? (
                                <CheckCircleIcon className="w-4 h-4" />
                              ) : (
                                <XCircleIcon className="w-4 h-4" />
                              )}
                              <span>{testResult.message}</span>
                              {testResult.latency && (
                                <span className="text-xs ml-1">({testResult.latency}ms)</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {(hasPermission('zonas', 'zonas', 'actualizar') || hasPermission('IoT', 'iot', 'actualizar')) && (
                            <CustomButton
                              type="button"
                              onClick={() => handleEditConfig(config)}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 text-sm"
                              icon={<PencilIcon className="w-3 h-3" />}
                            />
                          )}
                          {(hasPermission('zonas', 'zonas', 'eliminar') || hasPermission('IoT', 'iot', 'eliminar')) && (
                            <CustomButton
                              type="button"
                              onClick={() => handleDeleteConfig(config.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                              icon={<TrashIcon className="w-3 h-3" />}
                            />
                          )}
                        </div>
                      </div>

                      {config.zonaMqttConfigs && config.zonaMqttConfigs.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          Usado en {config.zonaMqttConfigs.length} zona{config.zonaMqttConfigs.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <CustomButton
              type="button"
              text="Cerrar"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2"
            />
          </ModalFooter>
        </ModalContent>
      </Modal>

      {showConfigModal && (
        <MqttConfigModal
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          zonaId="" // No aplica para gestión global
          zonaNombre="Global"
          existingConfig={selectedConfig}
          onSave={handleConfigSave}
        />
      )}
    </>
  );
};

export default MqttManagementModal;