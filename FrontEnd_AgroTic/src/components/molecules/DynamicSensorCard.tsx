import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardBody } from '@heroui/react';
import { BeakerIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useMqttSocket } from '../../hooks/useMqttSocket';
import { mqttConfigService, medicionSensorService, type MedicionSensor } from '../../services/zonasService';

interface SensorReading {
  zona: string;
  sensorKey: string;
  value: number;
  unit: string;
  timestamp: string;
  mqttConfigId: string;
}

const DynamicSensorCard: React.FC = () => {
  const { lecturas } = useMqttSocket();
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Load all active MQTT configurations and their sensor data
  const loadAllSensorData = useCallback(async () => {
    try {
      // Get all active zona-mqtt-configs (only active connections)
      const activeZonaMqttConfigs = await mqttConfigService.getAllActiveZonaMqttConfigs();
      console.log('Active zona MQTT configs:', activeZonaMqttConfigs);

      const allReadings: SensorReading[] = [];

      for (const zonaMqttConfig of activeZonaMqttConfigs) {
        try {
          // Get recent sensor readings for this active config-zone combination
          const mediciones = await medicionSensorService.getByMqttConfig(zonaMqttConfig.fkMqttConfigId);
          console.log(`Mediciones for config ${zonaMqttConfig.mqttConfig?.nombre} in zone ${zonaMqttConfig.zona?.nombre}:`, mediciones);

          // Filter mediciones that belong to this specific zone
          const zoneMediciones = mediciones.filter((medicion: MedicionSensor) => medicion.fkZonaId === zonaMqttConfig.fkZonaId);

          zoneMediciones.forEach((medicion: MedicionSensor) => {
            allReadings.push({
              zona: zonaMqttConfig.zona?.nombre || 'Zona Desconocida',
              sensorKey: medicion.key,
              value: Number(medicion.valor),
              unit: medicion.unidad,
              timestamp: medicion.fechaMedicion,
              mqttConfigId: zonaMqttConfig.fkMqttConfigId,
            });
          });
        } catch (error) {
          console.error(`Error loading data for zona-mqtt-config:`, zonaMqttConfig, error);
        }
      }

      setSensorReadings(allReadings);
      console.log('All sensor readings loaded:', allReadings);
    } catch (error) {
      console.error('Error loading MQTT configurations:', error);
    }
  }, []);

  // Update sensor readings with real-time WebSocket data
  useEffect(() => {
    if (lecturas.length > 0) {
      console.log('Updating sensor readings with real-time data:', lecturas);

      setSensorReadings(prevReadings => {
        const updatedReadings = [...prevReadings];

        lecturas.forEach(async (lectura) => {
          console.log('Processing lectura:', lectura);

          lectura.mediciones.forEach(async (medicion) => {
            console.log('Processing medicion:', medicion);

            // Get zone name for this measurement
            try {
              const zonaMqttConfigs = await mqttConfigService.getZonaMqttConfigs(lectura.zonaId);
              console.log('Zona MQTT configs for medicion:', zonaMqttConfigs);

              const activeZonaMqttConfigs = zonaMqttConfigs.filter((zmc: any) => zmc.estado === true);
              console.log('Active zona MQTT configs:', activeZonaMqttConfigs);

              const zonaConfig = activeZonaMqttConfigs.find((zmc: any) => zmc.fkZonaId === lectura.zonaId);
              console.log('Found zona config:', zonaConfig);

              let zonaNombre = 'Zona Desconocida';
              if (zonaConfig?.zona) {
                zonaNombre = zonaConfig.zona.nombre;
                console.log('Zone name found:', zonaNombre);
              }

              const existingIndex = updatedReadings.findIndex(
                r => r.sensorKey === medicion.key && r.mqttConfigId === medicion.fkMqttConfigId
              );

              const newReading: SensorReading = {
                zona: zonaNombre,
                sensorKey: medicion.key,
                value: Number(medicion.valor),
                unit: medicion.unidad,
                timestamp: medicion.fechaMedicion,
                mqttConfigId: medicion.fkMqttConfigId,
              };

              console.log('New reading to add/update:', newReading);

              if (existingIndex >= 0) {
                updatedReadings[existingIndex] = newReading;
                console.log('Updated existing reading at index:', existingIndex);
              } else {
                updatedReadings.push(newReading);
                console.log('Added new reading');
              }
            } catch (error) {
              console.error('Error getting zone name for medicion:', error);
            }
          });
        });

        return updatedReadings;
      });
    }
  }, [lecturas]);

  // Load initial data
  useEffect(() => {
    loadAllSensorData();
  }, [loadAllSensorData]);

  // Auto-rotate carousel every 10 seconds (only when not hovered)
  useEffect(() => {
    if (sensorReadings.length > 1 && !isHovered) {
      const interval = setInterval(() => {
        setCurrentIndex(prevIndex => (prevIndex + 1) % sensorReadings.length);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [sensorReadings.length, isHovered]);

  const nextReading = () => {
    if (sensorReadings.length > 1 && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % sensorReadings.length);
        setIsAnimating(false);
      }, 300);
    }
  };

  const prevReading = () => {
    if (sensorReadings.length > 1 && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prevIndex) =>
          prevIndex === 0 ? sensorReadings.length - 1 : prevIndex - 1
        );
        setIsAnimating(false);
      }, 300);
    }
  };

  const formatSensorKey = (key: string) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const currentReading = sensorReadings[currentIndex];

  return (
    <Card
      className="shadow-lg hover:shadow-xl transition-all duration-700 ease-out flex flex-col transform opacity-100 translate-y-0"
      style={{ animationDelay: '0.5s' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardBody className="flex-1 flex flex-row items-start justify-start text-left relative gap-4 pl-6">
        <BeakerIcon className="w-10 h-10 text-green-500 transition-all duration-500 flex-shrink-0"
                    style={{ animationDelay: '0.8s' }} />
        <div className="flex flex-col items-start justify-start text-left">
          {sensorReadings.length === 0 ? (
            <div className="text-gray-500">
              <p className="text-sm">Esperando datos de sensores...</p>
              <p className="text-xs text-gray-400 mt-1">No hay configuraciones de broker activas</p>
            </div>
          ) : currentReading ? (
            <div className={`transition-all duration-300 ease-in-out ${isAnimating ? 'transform -translate-y-2 opacity-50' : 'opacity-100'}`}>
              <div className="mb-1">
                <p className="text-xs text-gray-600 uppercase tracking-wide">
                  Zona de Captura
                </p>
              </div>
              <p className="text-lg font-bold text-green-600 mb-1">
                {currentReading.zona}
              </p>
              <p className="text-base font-semibold text-green-700 mb-1">
                {formatSensorKey(currentReading.sensorKey)}: {Number(currentReading.value).toFixed(2)} {currentReading.unit}
              </p>
              <p className="text-xs text-gray-500">
                Actualizado: {new Date(currentReading.timestamp).toLocaleTimeString()}
              </p>
              {sensorReadings.length > 1 && (
                <p className="text-xs text-gray-400 mt-1">
                  {currentIndex + 1} de {sensorReadings.length}
                </p>
              )}
            </div>
          ) : (
            <div className="text-gray-500">
              <p className="text-sm">Cargando datos...</p>
            </div>
          )}
        </div>

        {/* Navigation Buttons - Only visible when there are multiple readings and hovered */}
        {sensorReadings.length > 1 && isHovered && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
            <button
              onClick={prevReading}
              disabled={isAnimating}
              className={`p-1.5 rounded-full text-white shadow-lg transition-all duration-200 ${
                isAnimating
                  ? 'opacity-50 cursor-not-allowed bg-green-600'
                  : 'hover:scale-110 bg-green-600 hover:bg-green-700'
              }`}
              aria-label="Lectura anterior"
            >
              <ChevronUpIcon className="w-4 h-4" />
            </button>
            <button
              onClick={nextReading}
              disabled={isAnimating}
              className={`p-1.5 rounded-full text-white shadow-lg transition-all duration-200 ${
                isAnimating
                  ? 'opacity-50 cursor-not-allowed bg-green-600'
                  : 'hover:scale-110 bg-green-600 hover:bg-green-700'
              }`}
              aria-label="Siguiente lectura"
            >
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default DynamicSensorCard;