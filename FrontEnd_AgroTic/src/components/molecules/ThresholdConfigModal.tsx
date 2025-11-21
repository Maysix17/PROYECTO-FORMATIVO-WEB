console.log('ThresholdConfigModal: Component starting');
import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { umbralesService, type UmbralesConfig, type SensorThreshold } from '../../services/zonasService';
import TextInput from '../atoms/TextInput';
import CustomButton from '../atoms/Boton';

interface ThresholdConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  zonaMqttConfigId: string;
  availableSensors: string[];
  cultivoNombre?: string;
  onSave?: () => void;
}

const ThresholdConfigModal: React.FC<ThresholdConfigModalProps> = ({
  isOpen,
  onClose,
  zonaMqttConfigId,
  availableSensors,
  cultivoNombre,
  onSave,
}) => {
  console.log('ThresholdConfigModal: Component starting, props:', { 
    isOpen, 
    zonaMqttConfigId, 
    availableSensors: availableSensors?.length || 0 
  });

  const [umbrales, setUmbrales] = useState<UmbralesConfig>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingThresholds, setIsLoadingThresholds] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[sensorKey: string]: string}>({});

  console.log('ThresholdConfigModal: Rendering with umbrales:', umbrales);
  console.log('ThresholdConfigModal: isOpen:', isOpen, 'isLoading:', isLoading, 'error:', error);

  // Cargar umbrales existentes al abrir el modal
  useEffect(() => {
    if (isOpen && zonaMqttConfigId) {
      loadExistingThresholds();
    }
  }, [isOpen, zonaMqttConfigId]);

  // Limpiar errores cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setError('');
      setSuccessMessage(null);
      setValidationErrors({});
    }
  }, [isOpen]);

  const loadExistingThresholds = async () => {
    console.log('ThresholdConfigModal: Loading existing thresholds for zonaMqttConfigId:', zonaMqttConfigId);
    setIsLoadingThresholds(true);
    setError('');

    try {
      const existingUmbrales = await umbralesService.getUmbrales(zonaMqttConfigId);
      console.log('ThresholdConfigModal: Loaded thresholds:', existingUmbrales);
      setUmbrales(existingUmbrales);
    } catch (err: any) {
      console.error('ThresholdConfigModal: Error loading thresholds:', err);
      setError('Error al cargar umbrales existentes: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsLoadingThresholds(false);
    }
  };

  // Validar umbrales localmente
  const validateThreshold = (sensorKey: string, minimo: number, maximo: number): string | null => {
    if (typeof minimo !== 'number' || typeof maximo !== 'number') {
      return 'Los valores deben ser números';
    }
    
    if (isNaN(minimo) || isNaN(maximo)) {
      return 'Los valores no pueden ser NaN';
    }
    
    if (minimo >= maximo) {
      return 'El valor mínimo debe ser menor que el máximo';
    }
    
    return null;
  };

  // Actualizar umbral para un sensor específico
  const updateSensorThreshold = (sensorKey: string, field: 'minimo' | 'maximo', value: string) => {
    console.log('ThresholdConfigModal: Updating threshold for', sensorKey, field, '=', value);
    
    const numericValue = value === '' ? 0 : parseFloat(value);
    const updatedUmbrales = { ...umbrales };
    
    // Asegurar que existe el objeto para este sensor
    if (!updatedUmbrales[sensorKey]) {
      updatedUmbrales[sensorKey] = { minimo: 0, maximo: 0 };
    }
    
    // Actualizar el campo específico
    updatedUmbrales[sensorKey][field] = numericValue;
    setUmbrales(updatedUmbrales);
    
    // Validar el umbral completo
    const threshold = updatedUmbrales[sensorKey];
    const validationError = validateThreshold(sensorKey, threshold.minimo, threshold.maximo);
    
    setValidationErrors(prev => ({
      ...prev,
      [sensorKey]: validationError || ''
    }));
  };

  // Validar todos los umbrales
  const validateAllThresholds = (): boolean => {
    const errors: {[sensorKey: string]: string} = {};
    let hasErrors = false;

    availableSensors.forEach(sensorKey => {
      const threshold = umbrales[sensorKey];
      if (threshold) {
        const error = validateThreshold(sensorKey, threshold.minimo, threshold.maximo);
        if (error) {
          errors[sensorKey] = error;
          hasErrors = true;
        }
      }
    });

    setValidationErrors(errors);
    return !hasErrors;
  };

  // Manejar guardado
  const handleSave = async () => {
    console.log('ThresholdConfigModal: Saving thresholds:', umbrales);
    
    // Validar antes de guardar
    if (!validateAllThresholds()) {
      setError('Por favor corrige los errores de validación antes de guardar.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage(null);

    try {
      // Filtrar sensores que tienen umbrales definidos
      const thresholdsToSave: UmbralesConfig = {};
      Object.entries(umbrales).forEach(([sensorKey, threshold]) => {
        if (threshold && (threshold.minimo !== 0 || threshold.maximo !== 0)) {
          thresholdsToSave[sensorKey] = threshold;
        }
      });

      console.log('ThresholdConfigModal: Thresholds to save:', thresholdsToSave);

      await umbralesService.updateUmbrales(zonaMqttConfigId, thresholdsToSave);
      
      setSuccessMessage('Umbrales actualizados exitosamente.');
      
      if (onSave) {
        onSave();
      }

      // Cerrar modal después de mostrar éxito
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err: any) {
      console.error('ThresholdConfigModal: Error saving thresholds:', err);
      setError('Error al guardar umbrales: ' + (err.response?.data?.message || err.message || 'Error desconocido'));
    } finally {
      setIsLoading(false);
    }
  };

  // Renderizar fila de sensor con inputs
  const renderSensorRow = (sensorKey: string) => {
    const threshold = umbrales[sensorKey] || { minimo: 0, maximo: 0 };
    const hasError = !!validationErrors[sensorKey];
    
    return (
      <div key={sensorKey} className="grid grid-cols-3 gap-3 p-3 border border-gray-200 rounded-lg">
        <div className="flex items-center">
          <label className="text-sm font-medium text-gray-700">
            {sensorKey}
          </label>
        </div>
        
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Mínimo</label>
          <div className={hasError ? 'border-red-500 rounded' : ''}>
            <TextInput
              type="number"
              placeholder="0"
              value={threshold.minimo.toString()}
              onChange={(e) => updateSensorThreshold(sensorKey, 'minimo', e.target.value)}
              label=""
            />
          </div>
        </div>
        
        <div className="flex flex-col">
          <label className="text-xs text-gray-500 mb-1">Máximo</label>
          <div className={hasError ? 'border-red-500 rounded' : ''}>
            <TextInput
              type="number"
              placeholder="100"
              value={threshold.maximo.toString()}
              onChange={(e) => updateSensorThreshold(sensorKey, 'maximo', e.target.value)}
              label=""
            />
          </div>
        </div>
        
        {hasError && (
          <div className="col-span-3">
            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
              {validationErrors[sensorKey]}
            </span>
          </div>
        )}
      </div>
    );
  };

  if (isLoadingThresholds) {
    return (
      <Modal isOpen={isOpen} onOpenChange={onClose} size="lg">
        <ModalContent>
          <ModalBody className="min-h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando umbrales existentes...</p>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="lg">
      <ModalContent>
        <ModalHeader>
          <h2 className="text-lg font-semibold">
            Configuración de Umbrales de Sensores
            {cultivoNombre && (
              <span className="text-base font-normal text-gray-600 block mt-1">
                {cultivoNombre}
              </span>
            )}
          </h2>
        </ModalHeader>

        <ModalBody className="min-h-96">
          <div className="space-y-4">
            {/* Información de la zona MQTT config */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>ID de Configuración:</strong> {zonaMqttConfigId}
              </p>
              <p className="text-sm text-blue-700">
                <strong>Sensores disponibles:</strong> {availableSensors.length}
              </p>
            </div>

            {/* Lista de sensores con umbrales */}
            <div className="space-y-2">
              <h3 className="text-md font-medium text-gray-800 mb-3">
                Configurar Umbrales por Sensor
              </h3>
              
              {availableSensors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay sensores disponibles para configurar.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Headers */}
                  <div className="grid grid-cols-3 gap-3 px-3 py-2 bg-gray-50 rounded-lg border border-gray-300">
                    <div className="text-sm font-medium text-gray-700">Sensor</div>
                    <div className="text-sm font-medium text-gray-700">Mínimo</div>
                    <div className="text-sm font-medium text-gray-700">Máximo</div>
                  </div>
                  
                  {/* Sensor rows */}
                  {availableSensors.map(sensorKey => renderSensorRow(sensorKey))}
                </div>
              )}
            </div>

            {/* Errores y mensajes */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded border border-green-200">
                {successMessage}
              </div>
            )}

            {/* Información adicional */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Información:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Configure valores mínimos y máximos para cada sensor</li>
                <li>• Los sensores fuera de rango mostrarán alertas</li>
                <li>• El valor mínimo debe ser menor que el máximo</li>
                <li>• Los sensores sin umbrales configurados operan sin límites</li>
              </ul>
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="flex justify-end gap-2">
          <CustomButton
            type="button"
            text="Cancelar"
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1 text-sm"
            disabled={isLoading}
          />
          <CustomButton
            type="button"
            text={isLoading ? 'Guardando...' : 'Guardar Umbrales'}
            onClick={handleSave}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1 text-sm"
            disabled={isLoading}
          />
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ThresholdConfigModal;