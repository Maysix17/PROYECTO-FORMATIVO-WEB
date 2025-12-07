import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Spinner, Badge, Button, Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { medicionSensorService, zonasService, umbralesService, type UmbralesConfig } from '../../services/zonasService';
import { useMqttSocket } from '../../hooks/useMqttSocket';
import { usePermission } from '../../contexts/PermissionContext';
import CustomButton from '../atoms/Boton';
import { MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import MqttManagementModal from '../molecules/MqttManagementModal';
import ZoneSelectionModal from '../molecules/ZoneSelectionModal';
import SensorSearchModal from './SensorSearchModal';
import ThresholdConfigModal from '../molecules/ThresholdConfigModal';

interface SensorDashboardProps {
  filters: Record<string, any>;
}

interface SensorData {
  [key: string]: {
    unit: string;
    history: Array<{ value: number; timestamp: string; zonaId: string; cultivoNombres?: string[] }>;
    lastValue: number;
    lastUpdate: string;
    zonaNombre: string;
    cultivoNombres?: string[];
    zonaMqttConfigId?: string;
    mqttConfigId?: string;
    thresholdStatus?: 'normal' | 'bajo' | 'alto';
    hasThresholds?: boolean;
    connectionStatus?: 'connected' | 'disconnected' | 'unknown';
    lastDataTimestamp?: number;
  };
}

const SensorDashboard: React.FC<SensorDashboardProps> = ({ filters }) => {
  const [sensorData, setSensorData] = useState<SensorData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [zonas, setZonas] = useState<any[]>([]);
  const [showMqttManagementModal, setShowMqttManagementModal] = useState(false);
  const [showZoneSelectionModal, setShowZoneSelectionModal] = useState(false);
  const [showSensorSearchModal, setShowSensorSearchModal] = useState(false);
  const [showThresholdConfigModal, setShowThresholdConfigModal] = useState(false);
  const [showCultivoSelection, setShowCultivoSelection] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
  const [umbrales, setUmbrales] = useState<Record<string, UmbralesConfig>>({});
  const [isLoadingThresholds, setIsLoadingThresholds] = useState(false);
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [selectedZonaMqttConfigId, setSelectedZonaMqttConfigId] = useState<string>('');
  const [selectedMqttConfigId, setSelectedMqttConfigId] = useState<string>('');
  const [selectedCultivo, setSelectedCultivo] = useState<string>('');
  const [selectedZonaNombre, setSelectedZonaNombre] = useState<string>('');

  // Use MQTT socket hook for real-time updates
  const { lecturas, isConnected } = useMqttSocket();

  // Use permission hook
  const { hasPermission } = usePermission();

  // Debug permissions
  useEffect(() => {
    console.log('SensorDashboard: Checking permissions for IoT');
    console.log('hasPermission IoT iot leer:', hasPermission('IoT', 'iot', 'leer'));
    console.log('hasPermission IoT iot crear:', hasPermission('IoT', 'iot', 'crear'));
  }, [hasPermission]);

  const toggleSensor = (key: string) => {
    setSelectedSensors(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const getBorderColor = () => {
    if (selectedSensors.length === 0) return 'transparent';
    const hues = selectedSensors.map(key => {
      const index = sensorEntries.findIndex(([k]) => k === key);
      return index * 137.5 % 360;
    });
    if (selectedSensors.length === 1) return `hsl(${hues[0]}, 70%, 50%)`;
    const avgHue = hues.reduce((a, b) => a + b, 0) / hues.length;
    return `hsl(${avgHue}, 70%, 50%)`;
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (Object.keys(sensorData).length > 0) {
      // Apply filters when sensorData or filters change
      const filteredData = applyFilters(sensorData);
      // Reset carousel index if out of bounds
      setCurrentIndex(prev => Math.min(prev, Math.max(0, Object.keys(filteredData).length - 4)));
    }
  }, [filters, sensorData]);

  // Effect to update sensor data with real-time MQTT readings
  useEffect(() => {
    if (lecturas.length > 0) {
      setSensorData(prevData => {
        const newData = { ...prevData };
        let hasUpdates = false;

        lecturas.forEach(lectura => {
          const zona = zonas.find(z => z.id === lectura.zonaId);
          if (!zona) return;

          lectura.mediciones.forEach(medicion => {
            const sensorKey = medicion.key;
            const newValue = Number(medicion.valor);

            if (selectedSensors.length === 0 || selectedSensors.includes(sensorKey)) {
              // Find the zona-mqtt-config that this measurement belongs to
              const zonaMqttConfig = zona.zonaMqttConfigs?.find((zm: any) => zm.id === medicion.fkZonaMqttConfigId);

              // Skip if zonaMqttConfig is not active
              if (!zonaMqttConfig || !zonaMqttConfig.estado) return;

              const cultivoNombres = zona.cultivosVariedad?.map((cv: any) => cv.cultivoXVariedad?.variedad?.tipoCultivo?.nombre).filter(Boolean) as string[];

              const zonaMqttConfigId = zonaMqttConfig?.id;
              const mqttConfigId = zonaMqttConfig?.mqttConfig?.id;

              // Validate threshold if available
              let thresholdStatus: 'normal' | 'bajo' | 'alto' = 'normal';
              let hasThresholds = false;

              if (mqttConfigId && umbrales[mqttConfigId]) {
                const configUmbrales = umbrales[mqttConfigId];
                hasThresholds = Object.keys(configUmbrales).length > 0;

                if (configUmbrales[sensorKey]) {
                  const threshold = configUmbrales[sensorKey];
                  if (newValue < threshold.minimo) {
                    thresholdStatus = 'bajo';
                    console.log(`🚨 ALERTA: Sensor ${sensorKey} en zona ${zona.nombre} - Valor ${newValue} por DEBAJO del umbral mínimo (${threshold.minimo})`);
                  } else if (newValue > threshold.maximo) {
                    thresholdStatus = 'alto';
                    console.log(`🚨 ALERTA: Sensor ${sensorKey} en zona ${zona.nombre} - Valor ${newValue} por ENCIMA del umbral máximo (${threshold.maximo})`);
                  } else {
                    thresholdStatus = 'normal';
                    console.log(`✅ NORMAL: Sensor ${sensorKey} en zona ${zona.nombre} - Valor ${newValue} dentro del rango (${threshold.minimo} - ${threshold.maximo})`);
                  }
                }
              }

              if (!newData[sensorKey]) {
              newData[sensorKey] = {
                unit: medicion.unidad,
                history: [{ value: newValue, timestamp: medicion.fechaMedicion, zonaId: lectura.zonaId, cultivoNombres }],
                lastValue: newValue,
                lastUpdate: medicion.fechaMedicion,
                zonaNombre: zona.nombre,
                cultivoNombres,
                zonaMqttConfigId,
                mqttConfigId,
                thresholdStatus,
                hasThresholds,
                connectionStatus: 'connected',
                lastDataTimestamp: Date.now(),
              };
              hasUpdates = true;
            } else {
              newData[sensorKey].history.push({ value: newValue, timestamp: medicion.fechaMedicion, zonaId: lectura.zonaId, cultivoNombres });
              if (new Date(medicion.fechaMedicion) > new Date(newData[sensorKey].lastUpdate)) {
                newData[sensorKey].lastValue = newValue;
                newData[sensorKey].lastUpdate = medicion.fechaMedicion;
                newData[sensorKey].thresholdStatus = thresholdStatus;
                newData[sensorKey].hasThresholds = hasThresholds;
                newData[sensorKey].zonaMqttConfigId = zonaMqttConfigId;
                newData[sensorKey].mqttConfigId = mqttConfigId;
                newData[sensorKey].connectionStatus = 'connected';
                newData[sensorKey].lastDataTimestamp = Date.now();
              }
               // Keep only last 50 values
               if (newData[sensorKey].history.length > 50) {
                 newData[sensorKey].history = newData[sensorKey].history.slice(-50);
               }
               hasUpdates = true;
             }
           }
         });
         });

        return hasUpdates ? newData : prevData;
      });
    }
  }, [lecturas, zonas]);

  // Effect to check for disconnected sensors based on timeout
  useEffect(() => {
    const interval = setInterval(() => {
      setSensorData(prevData => {
        const newData = { ...prevData };
        let hasUpdates = false;

        Object.keys(newData).forEach(sensorKey => {
          const sensor = newData[sensorKey];
          if (sensor.lastDataTimestamp && Date.now() - sensor.lastDataTimestamp > 15000) { // 15 seconds
            if (sensor.connectionStatus !== 'disconnected') {
              sensor.connectionStatus = 'disconnected';
              hasUpdates = true;
              console.log(`🔌 Sensor ${sensorKey} desconectado por timeout`);
            }
          } else if (sensor.connectionStatus === 'disconnected' && sensor.lastDataTimestamp && Date.now() - sensor.lastDataTimestamp <= 15000) {
            sensor.connectionStatus = 'connected';
            hasUpdates = true;
            console.log(`🔌 Sensor ${sensorKey} reconectado`);
          }
        });

        return hasUpdates ? newData : prevData;
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setThresholdError(null);
    try {
      const [mediciones, zonasData] = await Promise.all([
        medicionSensorService.getAll(),
        zonasService.getAll()
      ]);

      setZonas(zonasData);

      processMediciones(mediciones, zonasData);
      
      // Load umbrales for each zona-mqtt-config
      await loadUmbralesForZonas(zonasData);
      
    } catch (error) {
      console.error('Error loading sensor data:', error);
      setThresholdError('Error al cargar datos de sensores: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadUmbralesForZonas = async (zonasData: any[]) => {
    setIsLoadingThresholds(true);
    setThresholdError(null);

    try {
      const umbralesMap: Record<string, UmbralesConfig> = {};

      // Collect all unique MQTT config IDs from active zona-mqtt-configs
      const mqttConfigIds = new Set<string>();

      zonasData.forEach(zona => {
        if (zona.zonaMqttConfigs && zona.zonaMqttConfigs.length > 0) {
          zona.zonaMqttConfigs.forEach((zonaMqttConfig: any) => {
            if (zonaMqttConfig.estado && zonaMqttConfig.mqttConfig) {
              mqttConfigIds.add(zonaMqttConfig.mqttConfig.id);
            }
          });
        }
      });

      // Load thresholds for all unique MQTT configs
      const thresholdPromises = Array.from(mqttConfigIds).map(async (mqttConfigId) => {
        try {
          const umbrales = await umbralesService.getUmbrales(mqttConfigId);
          umbralesMap[mqttConfigId] = umbrales;
          console.log(`✅ Umbrales cargados para MQTT config ${mqttConfigId}:`, umbrales);
        } catch (error) {
          console.warn(`Error loading umbrales for MQTT config ${mqttConfigId}:`, error);
          // Continue with other configs even if one fails
        }
      });

      await Promise.all(thresholdPromises);

      console.log('📊 Mapa completo de umbrales cargados:', umbralesMap);
      setUmbrales(umbralesMap);

    } catch (error) {
      console.error('Error loading umbrales:', error);
      setThresholdError('Error al cargar umbrales: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsLoadingThresholds(false);
    }
  };

  const processMediciones = (mediciones: any[], zonasData: any[]) => {
    const data: SensorData = {};

    mediciones.forEach(medicion => {
      const zona = zonasData.find(z => z.id === medicion.fkZonaId);
      if (!zona) return;

      // Find the zona-mqtt-config that this measurement belongs to
      const zonaMqttConfig = zona.zonaMqttConfigs?.find((zm: any) => zm.id === medicion.fkZonaMqttConfigId);

      // Skip if zonaMqttConfig is not active
      if (!zonaMqttConfig || !zonaMqttConfig.estado) return;

      const cultivoNombres = zona.cultivosVariedad?.map((cv: any) => cv.cultivoXVariedad?.variedad?.tipoCultivo?.nombre).filter(Boolean) as string[];

      const zonaMqttConfigId = zonaMqttConfig?.id;
      const mqttConfigId = zonaMqttConfig?.mqttConfig?.id;

      // Validate threshold if available
      let thresholdStatus: 'normal' | 'bajo' | 'alto' = 'normal';
      let hasThresholds = false;

      if (mqttConfigId && umbrales[mqttConfigId]) {
        const configUmbrales = umbrales[mqttConfigId];
        hasThresholds = Object.keys(configUmbrales).length > 0;

        if (configUmbrales[medicion.key]) {
          const threshold = configUmbrales[medicion.key];
          if (medicion.valor < threshold.minimo) {
            thresholdStatus = 'bajo';
            console.log(`🚨 ALERTA (Histórico): Sensor ${medicion.key} en zona ${zona.nombre} - Valor ${medicion.valor} por DEBAJO del umbral mínimo (${threshold.minimo})`);
          } else if (medicion.valor > threshold.maximo) {
            thresholdStatus = 'alto';
            console.log(`🚨 ALERTA (Histórico): Sensor ${medicion.key} en zona ${zona.nombre} - Valor ${medicion.valor} por ENCIMA del umbral máximo (${threshold.maximo})`);
          } else {
            thresholdStatus = 'normal';
            console.log(`✅ NORMAL (Histórico): Sensor ${medicion.key} en zona ${zona.nombre} - Valor ${medicion.valor} dentro del rango (${threshold.minimo} - ${threshold.maximo})`);
          }
        }
      }

      if (!data[medicion.key]) {
        data[medicion.key] = {
          unit: medicion.unidad,
          history: [],
          lastValue: medicion.valor,
          lastUpdate: medicion.fechaMedicion,
          zonaNombre: zona.nombre,
          cultivoNombres,
          zonaMqttConfigId,
          mqttConfigId,
          thresholdStatus,
          hasThresholds,
          connectionStatus: 'connected',
          lastDataTimestamp: new Date(medicion.fechaMedicion).getTime(),
        };
      }

      data[medicion.key].history.push({
        value: medicion.valor,
        timestamp: medicion.fechaMedicion,
        zonaId: medicion.fkZonaId,
        cultivoNombres
      });

      // Keep only last 50 values
      if (data[medicion.key].history.length > 50) {
        data[medicion.key].history = data[medicion.key].history.slice(-50);
      }

      // Update if this is more recent
      if (new Date(medicion.fechaMedicion) > new Date(data[medicion.key].lastUpdate)) {
        data[medicion.key].lastValue = medicion.valor;
        data[medicion.key].lastUpdate = medicion.fechaMedicion;
        data[medicion.key].thresholdStatus = thresholdStatus;
        data[medicion.key].hasThresholds = hasThresholds;
        data[medicion.key].zonaMqttConfigId = zonaMqttConfigId;
        data[medicion.key].mqttConfigId = mqttConfigId;
        data[medicion.key].connectionStatus = 'connected';
        data[medicion.key].lastDataTimestamp = new Date(medicion.fechaMedicion).getTime();
      }
    });

    setSensorData(data);
  };

  const getAvailableSensors = (): string[] => {
    return Object.keys(sensorData);
  };



  const getAllAvailableMqttConfigs = () => {
    const configs: Array<{
      id: string;
      nombre: string;
      zonaNombre: string;
      zonaMqttConfigId: string;
      mqttConfigId: string;
    }> = [];

    zonas.forEach(zona => {
      zona.zonaMqttConfigs?.forEach((zm: any) => {
        if (zm.estado && zm.mqttConfig) {
          configs.push({
            id: zm.mqttConfig.id,
            nombre: zm.mqttConfig.nombre,
            zonaNombre: zona.nombre,
            zonaMqttConfigId: zm.id,
            mqttConfigId: zm.mqttConfig.id,
          });
        }
      });
    });

    // Remove duplicates (same config assigned to multiple zones)
    const uniqueConfigs = configs.filter((config, index, self) =>
      index === self.findIndex(c => c.mqttConfigId === config.mqttConfigId)
    );

    return uniqueConfigs;
  };

  const handleThresholdConfigClick = () => {
    const availableConfigs = getAllAvailableMqttConfigs();

    if (availableConfigs.length === 0) {
      setThresholdError('No hay configuraciones MQTT disponibles para configurar umbrales.');
      return;
    }

    if (availableConfigs.length === 1) {
      // If only one config, open threshold modal directly
      const config = availableConfigs[0];
      setSelectedZonaMqttConfigId(config.zonaMqttConfigId);
      setSelectedMqttConfigId(config.mqttConfigId);
      setSelectedZonaNombre(config.zonaNombre);
      setSelectedCultivo(config.nombre);
      setShowThresholdConfigModal(true);
    } else {
      // If multiple configs, show config selection
      setShowCultivoSelection(true);
    }
  };



  const handleCultivoSelect = (configIndex: number) => {
    const availableConfigs = getAllAvailableMqttConfigs();
    const selectedConfig = availableConfigs[configIndex];

    if (!selectedConfig) return;

    setSelectedZonaMqttConfigId(selectedConfig.zonaMqttConfigId);
    setSelectedMqttConfigId(selectedConfig.mqttConfigId);
    setSelectedZonaNombre(selectedConfig.zonaNombre);
    setSelectedCultivo(selectedConfig.nombre);
    setShowCultivoSelection(false);
    setShowThresholdConfigModal(true);
  };

  const handleThresholdConfigSave = () => {
    // Reload umbrales and refresh sensor data
    loadUmbralesForZonas(zonas);
    // Force reprocessing of current data with new thresholds
    const mediciones = Object.values(sensorData).flatMap(sensor => 
      sensor.history.map(h => ({
        key: Object.keys(sensorData).find(k => sensorData[k] === sensor)!,
        valor: h.value,
        unidad: sensor.unit,
        fechaMedicion: h.timestamp,
        fkZonaId: h.zonaId,
        fkMqttConfigId: sensor.zonaMqttConfigId || ''
      }))
    );
    processMediciones(mediciones, zonas);
  };

  const applyFilters = (data: SensorData): SensorData => {
    const zonaFilter = filters.zona?.toLowerCase() || '';
    const cultivoFilter = filters.cultivo?.toLowerCase() || '';

    const filtered: SensorData = {};

    Object.entries(data).forEach(([key, sensor]) => {
      const matchesZona = !zonaFilter || sensor.zonaNombre.toLowerCase().includes(zonaFilter);
      const matchesCultivo = !cultivoFilter || (sensor.cultivoNombres && sensor.cultivoNombres.some(nombre => nombre.toLowerCase().includes(cultivoFilter)));

      if (matchesZona && matchesCultivo) {
        filtered[key] = sensor;
      }
    });

    return filtered;
  };

  const filteredSensorData = applyFilters(sensorData);
  const sensorEntries = Object.entries(filteredSensorData);
  const displayedSensorEntries = selectedSensors.length > 0 ? sensorEntries.filter(([key]) => selectedSensors.includes(key)) : sensorEntries;

  const prepareChartData = (data: SensorData) => {
    // Get all timestamps
    const allTimestamps = new Set<string>();
    Object.values(data).forEach(sensor => {
      sensor.history.forEach(point => allTimestamps.add(point.timestamp));
    });

    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return sortedTimestamps.map((timestamp, index) => {
      const point: any = { timestamp, index, time: new Date(timestamp).getTime() };
      Object.entries(data).forEach(([key, sensor]) => {
        const historyPoint = sensor.history.find(h => h.timestamp === timestamp);
        if (historyPoint) {
          point[key] = historyPoint.value;
        }
      });
      return point;
    });
  };

  // Prepare chart data
  const chartData = displayedSensorEntries.length > 0 ? prepareChartData(Object.fromEntries(displayedSensorEntries)) : [];

  // Sensor Card Component
  const SensorCard = React.memo(({ sensorKey, data, isSelected }: { sensorKey: string; data: SensorData[string]; isSelected: boolean }) => {
    const chartData = data.history.slice(-20).map((point, index) => ({
      time: index,
      value: point.value,
      timestamp: point.timestamp,
    }));

    const formatSensorKey = (key: string) => {
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
    };

    const index = sensorEntries.findIndex(([k]) => k === sensorKey);
    const highlightColor = `hsl(${index * 137.5 % 360}, 70%, 50%)`;

    // Determine card colors based on threshold status
    const getCardStyles = () => {
      if (!data.hasThresholds) {
        return {
          cardBg: 'bg-gradient-to-br from-green-50 to-blue-50',
          borderColor: 'border-green-100',
          textColor: 'text-green-600',
          unitColor: 'text-green-700',
          valueColor: 'text-green-600'
        };
      }

      switch (data.thresholdStatus) {
        case 'normal':
          return {
            cardBg: 'bg-gradient-to-br from-green-50 to-green-100',
            borderColor: 'border-green-200',
            textColor: 'text-green-600',
            unitColor: 'text-green-700',
            valueColor: 'text-green-600'
          };
        case 'bajo':
          return {
            cardBg: 'bg-gradient-to-br from-red-50 to-red-100',
            borderColor: 'border-red-200',
            textColor: 'text-red-600',
            unitColor: 'text-red-700',
            valueColor: 'text-red-600'
          };
        case 'alto':
          return {
            cardBg: 'bg-gradient-to-br from-red-50 to-red-100',
            borderColor: 'border-red-200',
            textColor: 'text-red-600',
            unitColor: 'text-red-700',
            valueColor: 'text-red-600'
          };
        default:
          return {
            cardBg: 'bg-gradient-to-br from-green-50 to-blue-50',
            borderColor: 'border-green-100',
            textColor: 'text-green-600',
            unitColor: 'text-green-700',
            valueColor: 'text-green-600'
          };
      }
    };

    const styles = getCardStyles();

    // Get status badge configuration
    const getStatusBadge = () => {
      if (!data.hasThresholds) {
        return {
          color: 'success' as const,
          text: 'Sin Umbrales',
          icon: '🔧'
        };
      }

      switch (data.thresholdStatus) {
        case 'normal':
          return {
            color: 'success' as const,
            text: 'Normal',
            icon: '✅'
          };
        case 'bajo':
          return {
            color: 'danger' as const,
            text: 'Alerta Baja',
            icon: '⚠️'
          };
        case 'alto':
          return {
            color: 'danger' as const,
            text: 'Alerta Alta',
            icon: '⚠️'
          };
        default:
          return {
            color: 'warning' as const,
            text: 'Desconocido',
            icon: '❓'
          };
      }
    };

    const statusBadge = getStatusBadge();

    // Get connection status badge
    const getConnectionBadge = () => {
      switch (data.connectionStatus) {
        case 'connected':
          return {
            color: 'success' as const,
            text: 'Conectado',
            icon: '🟢'
          };
        case 'disconnected':
          return {
            color: 'danger' as const,
            text: 'Desconectado',
            icon: '🔴'
          };
        default:
          return {
            color: 'warning' as const,
            text: 'Desconocido',
            icon: '🟡'
          };
      }
    };

    const connectionBadge = getConnectionBadge();

    // Get threshold range info if available
    const getThresholdRange = () => {
      if (!data.hasThresholds || !data.mqttConfigId || !umbrales[data.mqttConfigId]) {
        return null;
      }

      const configUmbrales = umbrales[data.mqttConfigId];
      const sensorThreshold = configUmbrales[sensorKey];

      if (sensorThreshold) {
        return `Rango: ${sensorThreshold.minimo} - ${sensorThreshold.maximo} ${data.unit}`;
      }

      return null;
    };

    const thresholdRange = getThresholdRange();

    return (
      <Card className="w-full max-w-xs" style={isSelected ? { border: `2px solid ${highlightColor}`, boxShadow: `0 6px 12px ${highlightColor}70, 0 10px 20px ${highlightColor}50` } : {}}>
        <CardHeader className="flex justify-between items-start pb-2">
           <div className="text-left">
             <h3 className="text-lg font-bold text-gray-800 mb-1">{formatSensorKey(sensorKey)}</h3>
             <div className="text-xs text-gray-600">
               <p>{data.zonaNombre}</p>
               {data.cultivoNombres && data.cultivoNombres.length > 0 && <p>Cultivos: {data.cultivoNombres.join(', ')}</p>}
             </div>
           </div>
           <div className="flex flex-col items-end gap-1">
             <span className={`text-xs font-medium px-2 py-1 rounded-full ${
               statusBadge.color === 'success' ? 'bg-green-100 text-green-800' :
               statusBadge.color === 'danger' ? 'bg-red-100 text-red-800' :
               statusBadge.color === 'warning' ? 'bg-yellow-100 text-yellow-800' :
               'bg-gray-100 text-gray-800'
             }`}>
               {statusBadge.icon} {statusBadge.text}
             </span>
             <span className={`text-xs font-medium px-2 py-1 rounded-full ${
               connectionBadge.color === 'success' ? 'bg-green-100 text-green-800' :
               connectionBadge.color === 'danger' ? 'bg-red-100 text-red-800' :
               'bg-yellow-100 text-yellow-800'
             }`}>
               {connectionBadge.icon} {connectionBadge.text}
             </span>
           </div>
         </CardHeader>
        <CardBody className="pt-0">
          <div className="space-y-3">
            <div className={`text-center rounded-lg p-3 border ${styles.cardBg} ${styles.borderColor}`}>
              <div className={`text-3xl font-bold mb-1 ${styles.valueColor}`}>
                {data.lastValue === -999 ? 'N/A' : Number(data.lastValue).toFixed(2)}
                {data.lastValue !== -999 && <span className={`text-lg ${styles.unitColor}`}>{data.unit}</span>}
              </div>
              <div className="text-xs text-gray-600 font-medium">
                Última actualización: {new Date(data.lastUpdate).toLocaleString()}
              </div>
              {thresholdRange && (
                <div className="text-xs text-gray-500 mt-1 font-medium">
                  {thresholdRange}
                </div>
              )}
            </div>

          </div>
        </CardBody>
      </Card>
    );
  });


  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 4));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(sensorEntries.length - 4, prev + 4));
  };

  return (
    <div>
      {/* Header with export and broker button */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Gestión de IOT
            </h1>

            {/* Toolbar compacto */}
            <div className="flex items-center gap-3">
              {hasPermission('IoT', 'iot', 'leer') && (
                <CustomButton
                  color="primary"
                  variant="solid"
                  onClick={() => setShowSensorSearchModal(true)}
                  label="Exportar Datos"
                  icon={<MagnifyingGlassIcon className="w-4 h-4" />}
                  className="rounded-lg px-3 py-1 h-8"
                />
              )}

              {hasPermission('IoT', 'iot', 'crear') && (
                <CustomButton
                  variant="light"
                  size="sm"
                  label="Configurar Umbrales"
                  onClick={handleThresholdConfigClick}
                  className="rounded-lg px-3 py-1 h-8 text-orange-600 border-orange-200 hover:bg-orange-50"
                />
              )}

              {(hasPermission('zonas', 'zonas', 'crear') || hasPermission('IoT', 'iot', 'crear')) && (
                <CustomButton
                  variant="light"
                  size="sm"
                  label="Gestionar Broker"
                  onClick={() => setShowMqttManagementModal(true)}
                  className="rounded-lg px-3 py-1 h-8 text-gray-600"
                />
              )}

              {hasPermission('IoT', 'iot', 'crear') && (
                <CustomButton
                  variant="light"
                  size="sm"
                  label="Configurar Zonas"
                  onClick={() => setShowZoneSelectionModal(true)}
                  className="rounded-lg px-3 py-1 h-8 text-gray-600"
                />
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading || (isConnected && sensorEntries.length === 0) ? (
            <div className="text-center py-8">
              <Spinner size="lg" color="primary" />
              <p className="mt-2 text-gray-600">
                {isLoading ? 'Cargando datos de sensores...' : 'Esperando datos de sensores...'}
              </p>
              {isLoadingThresholds && (
                <div className="mt-2">
                  <p className="text-sm text-orange-600">Cargando umbrales...</p>
                </div>
              )}
            </div>
          ) : sensorEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              No hay datos de sensores disponibles.
              <br />
              <small className="text-gray-400">Los datos aparecerán aquí cuando los sensores estén conectados y activos.</small>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sensor Cards Carousel */}
              <div className="relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sensorEntries.slice(currentIndex, currentIndex + 4).map(([key, data]) => (
                    <SensorCard key={key} sensorKey={key} data={data} isSelected={selectedSensors.includes(key)} />
                  ))}
                </div>
                {sensorEntries.length > 4 && (
                  <>
                    <Button
                      isDisabled={currentIndex === 0}
                      onClick={handlePrev}
                      isIconOnly
                      className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-6 bg-gray-300 hover:bg-[#15a55a] transition-colors disabled:bg-gray-200 disabled:hover:bg-gray-200"
                    >
                      <ChevronLeftIcon className="w-5 h-5" />
                    </Button>
                    <Button
                      isDisabled={currentIndex >= sensorEntries.length - 4}
                      onClick={handleNext}
                      isIconOnly
                      className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-6 bg-gray-300 hover:bg-[#15a55a] transition-colors disabled:bg-gray-200 disabled:hover:bg-gray-200"
                    >
                      <ChevronRightIcon className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>

              {/* Chart */}
              <Card>

                <CardBody className="pt-[6px] px-0 pb-0">
                  <div className="flex">
                    {chartData.length > 0 ? (
                      <>
                        <div className="w-4/5">
                          <ResponsiveContainer width="100%" height={278}>
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                              <XAxis
                                dataKey="time"
                                type="number"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                                domain={['dataMin', 'dataMax']}
                                tickCount={10}
                              />
                              <YAxis
                                label={{ value: 'Valor', angle: -90, position: 'insideLeft' }}
                                domain={[0, (dataMax) => Math.ceil(dataMax / 10) * 10 + 5]}
                                tickCount={10}
                              />
                              {displayedSensorEntries.map(([key]) => {
                                const originalIndex = sensorEntries.findIndex(([k]) => k === key);
                                return (
                                  <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={`hsl(${originalIndex * 137.5 % 360}, 70%, 50%)`}
                                    strokeWidth={2}
                                    dot={false}
                                    connectNulls={true}
                                    isAnimationActive={false}
                                  />
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-1/5 p-[4px]">
                          <div className="space-y-2">
                            {sensorEntries.map(([key], index) => (
                              <Button
                                key={key}
                                variant={selectedSensors.includes(key) ? "solid" : "light"}
                                onClick={() => toggleSensor(key)}
                                className="w-full justify-start h-auto p-2"
                              >
                                <div className="flex items-center w-full">
                                  <div
                                    className="w-4 h-4 rounded-full mr-2"
                                    style={{ backgroundColor: `hsl(${index * 137.5 % 360}, 70%, 50%)` }}
                                  ></div>
                                  <span className="text-sm">{String(key).replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                                </div>
                              </Button>
                            ))}
                            <Button onClick={() => setSelectedSensors([])} variant="light" className="w-full mt-2">
                              Limpiar todo
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center w-full text-gray-500">
                        No hay datos suficientes para mostrar la gráfica
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showMqttManagementModal && (
        <MqttManagementModal
          isOpen={showMqttManagementModal}
          onClose={() => setShowMqttManagementModal(false)}
        />
      )}

      {showZoneSelectionModal && (
        <ZoneSelectionModal
          isOpen={showZoneSelectionModal}
          onClose={() => setShowZoneSelectionModal(false)}
          onSave={() => loadInitialData()} // Refresh data when MQTT config is assigned
        />
      )}

      {showThresholdConfigModal && selectedMqttConfigId && (
        <ThresholdConfigModal
          isOpen={showThresholdConfigModal}
          onClose={() => {
            setShowThresholdConfigModal(false);
            setSelectedZonaMqttConfigId('');
            setSelectedMqttConfigId('');
            setSelectedCultivo('');
            setSelectedZonaNombre('');
          }}
          mqttConfigId={selectedMqttConfigId}
          cultivoNombre={selectedCultivo || undefined}
          onSave={handleThresholdConfigSave}
        />
      )}



      {showCultivoSelection && (
        <Modal isOpen={showCultivoSelection} onOpenChange={setShowCultivoSelection} size="lg" scrollBehavior="inside">
          <ModalContent>
            <ModalHeader>
              <h2 className="text-lg font-semibold">
                Configuraciones de Broker
              </h2>
            </ModalHeader>
            <ModalBody className="p-6">
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Selecciona la configuración broker para configurar sus umbrales:
                </p>
                {getAllAvailableMqttConfigs().map((config, index) => (
                  <div
                    key={index}
                    onClick={() => handleCultivoSelect(index)}
                    className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-green-300 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {config.nombre}
                        </h3>
                        <p className="text-sm text-gray-600">
                          📍 Zona: {config.zonaNombre}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          ID: {config.mqttConfigId}
                        </p>
                      </div>
                      <div className="text-green-500">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      {showSensorSearchModal && (
        <SensorSearchModal
          isOpen={showSensorSearchModal}
          onClose={() => setShowSensorSearchModal(false)}
        />
      )}

      {/* Threshold error display */}
      {thresholdError && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md z-50">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{thresholdError}</p>
              <button
                onClick={() => setThresholdError(null)}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorDashboard;