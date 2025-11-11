import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Spinner, Badge, Button } from '@heroui/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { medicionSensorService, zonasService } from '../../services/zonasService';
import { useMqttSocket } from '../../hooks/useMqttSocket';
import CustomButton from '../atoms/Boton';
import { ArrowDownTrayIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import MqttManagementModal from '../molecules/MqttManagementModal';
import ZoneSelectionModal from '../molecules/ZoneSelectionModal';

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
  };
}

const SensorDashboard: React.FC<SensorDashboardProps> = ({ filters }) => {
  const [sensorData, setSensorData] = useState<SensorData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [zonas, setZonas] = useState<any[]>([]);
  const [showMqttManagementModal, setShowMqttManagementModal] = useState(false);
  const [showZoneSelectionModal, setShowZoneSelectionModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);

  // Use MQTT socket hook for real-time updates
  const { lecturas, isConnected } = useMqttSocket();

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

          const cultivoNombres = zona.cultivosVariedad?.map((cv: any) => cv.cultivoXVariedad?.variedad?.tipoCultivo?.nombre).filter(Boolean) as string[];

          lectura.mediciones.forEach(medicion => {
            const sensorKey = medicion.key;
            const newValue = Number(medicion.valor);

            if (selectedSensors.length === 0 || selectedSensors.includes(sensorKey)) {
              if (!newData[sensorKey]) {
              newData[sensorKey] = {
                unit: medicion.unidad,
                history: [{ value: newValue, timestamp: medicion.fechaMedicion, zonaId: lectura.zonaId, cultivoNombres }],
                lastValue: newValue,
                lastUpdate: medicion.fechaMedicion,
                zonaNombre: zona.nombre,
                cultivoNombres,
              };
              hasUpdates = true;
            } else {
              newData[sensorKey].lastValue = newValue;
              newData[sensorKey].lastUpdate = medicion.fechaMedicion;
              newData[sensorKey].history.push({ value: newValue, timestamp: medicion.fechaMedicion, zonaId: lectura.zonaId, cultivoNombres });
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

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [mediciones, zonasData] = await Promise.all([
        medicionSensorService.getAll(),
        zonasService.getAll()
      ]);

      setZonas(zonasData);

      processMediciones(mediciones, zonasData);
    } catch (error) {
      console.error('Error loading sensor data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processMediciones = (mediciones: any[], zonasData: any[]) => {
    const data: SensorData = {};

    mediciones.forEach(medicion => {
      const zona = zonasData.find(z => z.id === medicion.fkZonaId);
      if (!zona) return;

      const cultivoNombres = zona.cultivosVariedad?.map((cv: any) => cv.cultivoXVariedad?.variedad?.tipoCultivo?.nombre).filter(Boolean) as string[];

      if (!data[medicion.key]) {
        data[medicion.key] = {
          unit: medicion.unidad,
          history: [],
          lastValue: medicion.valor,
          lastUpdate: medicion.fechaMedicion,
          zonaNombre: zona.nombre,
          cultivoNombres,
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
      }
    });

    setSensorData(data);
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

    return (
      <Card className="w-full max-w-xs" style={isSelected ? { border: `2px solid ${highlightColor}`, boxShadow: `0 6px 12px ${highlightColor}70, 0 10px 20px ${highlightColor}50` } : {}}>
        <CardHeader className="flex items-center justify-between pb-2">
          <div className="text-center flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-1">{formatSensorKey(sensorKey)}</h3>
            <div className="text-xs text-gray-600">
              <p>{data.zonaNombre}</p>
              {data.cultivoNombres && data.cultivoNombres.length > 0 && <p>Cultivos: {data.cultivoNombres.join(', ')}</p>}
            </div>
          </div>
          <Badge color="success" variant="flat" className="ml-2">
            Activo
          </Badge>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="space-y-3">
            <div className="text-center bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-3 border border-green-100">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {Number(data.lastValue).toFixed(2)} <span className="text-lg text-green-700">{data.unit}</span>
              </div>
              <div className="text-xs text-gray-600 font-medium">
                Última actualización: {new Date(data.lastUpdate).toLocaleString()}
              </div>
            </div>

          </div>
        </CardBody>
      </Card>
    );
  });

  const handleExport = () => {
    // Generate CSV for export
    const csvData = generateCSV(filteredSensorData);
    downloadCSV(csvData, 'reporte_sensores.csv');
  };

  const generateCSV = (data: SensorData): string => {
    const headers = ['Sensor', 'Zona', 'Cultivo', 'Valor', 'Unidad', 'Fecha'];
    const rows: string[] = [headers.join(',')];

    Object.entries(data).forEach(([key, sensor]) => {
      sensor.history.forEach(point => {
        const row = [
          key,
          sensor.zonaNombre,
          sensor.cultivoNombres ? sensor.cultivoNombres.join(', ') : '',
          point.value.toString(),
          sensor.unit,
          point.timestamp
        ];
        rows.push(row.map(field => `"${field}"`).join(','));
      });
    });

    return rows.join('\n');
  };

  const downloadCSV = (data: string, filename: string) => {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
              <CustomButton
                color="success"
                variant="solid"
                onClick={handleExport}
                label="Exportar Reporte"
                icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                className="rounded-lg px-3 py-1 h-8"
              />

              <CustomButton
                variant="light"
                size="sm"
                label="Gestionar Broker"
                onClick={() => setShowMqttManagementModal(true)}
                className="rounded-lg px-3 py-1 h-8 text-gray-600"
              />

              <CustomButton
                variant="light"
                size="sm"
                label="Configurar Zonas"
                onClick={() => setShowZoneSelectionModal(true)}
                className="rounded-lg px-3 py-1 h-8 text-gray-600"
              />
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
                
                <CardBody>
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
                        <div className="w-1/5 p-4">
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
    </div>
  );
};

export default SensorDashboard;