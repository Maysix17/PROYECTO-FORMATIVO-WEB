import React, { useState, useEffect } from 'react';
import type { MedicionSensor } from '../../services/zonasService';
import { medicionSensorService } from '../../services/zonasService';
import { useMqttSocket } from '../../hooks/useMqttSocket';
import { Card, CardBody, CardHeader, Spinner, Badge, Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SensorReadingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  zonaId: string;
  zonaNombre: string;
}

interface SensorData {
  [key: string]: {
    unit: string;
    history: Array<{ value: number; timestamp: string }>;
    lastValue: number;
    lastUpdate: string;
  };
}

const SensorReadingsModal: React.FC<SensorReadingsModalProps> = ({
  isOpen,
  onClose,
  zonaId,
  zonaNombre,
}) => {
  const [sensorData, setSensorData] = useState<SensorData>({});
  const [isLoading, setIsLoading] = useState(false);

  // Use MQTT socket hook for real-time updates
  const { lecturas } = useMqttSocket();

  useEffect(() => {
    if (isOpen) {
      loadHistoricalData();
    }
  }, [isOpen, zonaId]);

  // Effect to update sensor data with real-time MQTT readings
  useEffect(() => {
    if (isOpen && zonaId) {
      const zonaLecturas = lecturas.filter(l => l.zonaId === zonaId);
      if (zonaLecturas.length > 0) {
        // Get the latest reading and update sensor data
        const latestLectura = zonaLecturas[0]; // Most recent is first
        console.log('Updating sensor data with latest lectura:', latestLectura);
        setSensorData(prevData => {
          const newData = { ...prevData };
          let hasUpdates = false;

          latestLectura.mediciones.forEach(medicion => {
            const sensorKey = medicion.key;
            const newValue = Number(medicion.valor);

            if (!newData[sensorKey]) {
              newData[sensorKey] = {
                unit: medicion.unidad,
                history: [{ value: newValue, timestamp: medicion.fechaMedicion }], // Initialize with first value
                lastValue: newValue,
                lastUpdate: medicion.fechaMedicion,
              };
              hasUpdates = true;
            } else {
              newData[sensorKey].lastValue = newValue;
              newData[sensorKey].lastUpdate = medicion.fechaMedicion;

              // Always add to history for continuous chart
              newData[sensorKey].history.push({ value: newValue, timestamp: medicion.fechaMedicion });
              // Keep only last 20 values
              if (newData[sensorKey].history.length > 20) {
                newData[sensorKey].history = newData[sensorKey].history.slice(-20);
              }
              hasUpdates = true;
            }
          });

          // Only return new data if there were actual updates
          return hasUpdates ? newData : prevData;
        });
      }
    }
  }, [isOpen, zonaId, lecturas]);

  const loadHistoricalData = async () => {
    setIsLoading(true);
    try {
      const mediciones = await medicionSensorService.getByZona(zonaId, 100);
      processMediciones(mediciones);
    } catch (error) {
      console.error('Error loading sensor data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processMediciones = (mediciones: MedicionSensor[]) => {
    const data: SensorData = {};

    mediciones.forEach(medicion => {
      if (!data[medicion.key]) {
        data[medicion.key] = {
          unit: medicion.unidad,
          history: [],
          lastValue: medicion.valor,
          lastUpdate: medicion.fechaMedicion,
        };
      }

      data[medicion.key].history.push({ value: medicion.valor, timestamp: medicion.fechaMedicion });

      // Keep only last 20 values for sparkline
      if (data[medicion.key].history.length > 20) {
        data[medicion.key].history = data[medicion.key].history.slice(-20);
      }

      // Update if this is more recent
      if (new Date(medicion.fechaMedicion) > new Date(data[medicion.key].lastUpdate)) {
        data[medicion.key].lastValue = medicion.valor;
        data[medicion.key].lastUpdate = medicion.fechaMedicion;
      }
    });

    setSensorData(data);
  };

  // Sensor Card Component
  const SensorCard = React.memo(({ sensorKey, data }: { sensorKey: string; data: SensorData[string] }) => {
    const chartData = data.history.map((point, index) => ({
      time: index,
      value: point.value,
      timestamp: point.timestamp,
    }));

    // Format sensor key for better display
    const formatSensorKey = (key: string) => {
      return key
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .trim();
    };

    return (
      <Card className="w-full h-100">
        <CardHeader className="flex items-center justify-between ">
          <div className="text-center flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-1">{formatSensorKey(sensorKey)}</h3>
            <p className="text-sm text-gray-500 font-medium">{data.unit}</p>
            
          </div>
          <Badge color="success" variant="flat" className="ml-2">
            Activo
          </Badge>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            {/* Current Value */}
            <div className="text-center bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border border-green-100">
              <div className="text-5xl font-bold text-green-600 mb-2">
                {Number(data.lastValue).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600 font-medium">
                Última actualización: {new Date(data.lastUpdate).toLocaleString()}
              </div>
            </div>

            {/* Chart */}
            <div className="h-36 bg-gray-50 rounded-lg p-2" style={{ minHeight: '144px', minWidth: '200px' }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="time"
                      tick={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={false}
                      width={35}
                    />
                    <Tooltip
                      formatter={(value: any) => {
                        const numValue = typeof value === 'number' ? value : parseFloat(value);
                        return [isNaN(numValue) ? 'N/A' : numValue.toFixed(2), 'Valor'];
                      }}
                      labelFormatter={(label) => `Lectura ${label + 1}`}
                      contentStyle={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#16a34a"
                      strokeWidth={2.5}
                      dot={{ fill: '#16a34a', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, stroke: '#16a34a', strokeWidth: 2, fill: '#dcfce7' }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                  Esperando datos...
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mínimo</div>
                <div className="text-sm font-bold text-blue-600 mt-1">
                  {Math.min(...data.history.map(h => h.value)).toFixed(2)}
                </div>
              </div>
              <div className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Máximo</div>
                <div className="text-sm font-bold text-red-600 mt-1">
                  {Math.max(...data.history.map(h => h.value)).toFixed(2)}
                </div>
              </div>
            </div>

          </div>
        </CardBody>
      </Card>
    );
  });

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="5xl">
      <ModalContent>
        <ModalHeader>
          <div>
            <h2 className="text-xl font-semibold">
              Lecturas en Tiempo Real - {zonaNombre}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Monitoreo de sensores MQTT en tiempo real
            </p>
          </div>
        </ModalHeader>

        <ModalBody>
          {isLoading ? (
            <div className="text-center py-8">
              <Spinner size="lg" color="primary" />
              <p className="mt-2 text-gray-600">Cargando datos...</p>
            </div>
          ) : Object.keys(sensorData).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              No hay lecturas disponibles para esta zona.
              <br />
              <small className="text-gray-400">Las lecturas aparecerán aquí cuando el dispositivo MQTT esté activo.</small>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(sensorData).map(([key, data]) => (
                <SensorCard key={key} sensorKey={key} data={data} />
              ))}
            </div>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default SensorReadingsModal;