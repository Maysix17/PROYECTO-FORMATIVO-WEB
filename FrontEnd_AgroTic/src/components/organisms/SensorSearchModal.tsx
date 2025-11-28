import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Spinner,
  Chip,
  Checkbox,
} from '@heroui/react';
import { MagnifyingGlassIcon, XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { medicionSensorService } from '../../services/zonasService';
import { generateSensorSearchPDF } from '../../utils/pdfGenerator';
import DateRangeInput from '../atoms/DateRangeInput';

interface SensorSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SensorData {
  key: string;
  unidad: string;
  valor: number;
  fechaMedicion: string;
}

interface SensorConfig {
  id: string;
  nombre: string;
  host: string;
  port: number;
  protocol: string;
  topicBase: string;
}

interface CultivoZonaSensor {
  cultivoId: string;
  cultivoNombre: string;
  variedadNombre: string;
  tipoCultivoNombre: string;
  zonaId: string;
  zonaNombre: string;
  cvzId: string;
  sensorConfig: SensorConfig;
  uniqueSensorData: SensorData[];
}

const SensorSearchModal: React.FC<SensorSearchModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sensorData, setSensorData] = useState<CultivoZonaSensor[]>([]);
  const [filteredData, setFilteredData] = useState<CultivoZonaSensor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSensors, setSelectedSensors] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [dateRanges, setDateRanges] = useState<Map<string, [Date | null, Date | null]>>(new Map());

  useEffect(() => {
    if (isOpen) {
      loadSensorData();
    }
  }, [isOpen]);

  useEffect(() => {
    filterData();
  }, [searchTerm, sensorData]);

  const loadSensorData = async () => {
    setIsLoading(true);
    try {
      const data = await medicionSensorService.getSensorSearchData();
      setSensorData(data.results || []);
    } catch (error) {
      console.error('Error loading sensor search data:', error);
      setSensorData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterData = () => {
    if (!searchTerm.trim()) {
      setFilteredData(sensorData);
      return;
    }

    const filtered = sensorData.filter(item =>
      item.cultivoNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.zonaNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.variedadNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tipoCultivoNombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const toggleSensorSelection = (sensorKey: string) => {
    const newSelected = new Set(selectedSensors);
    if (newSelected.has(sensorKey)) {
      newSelected.delete(sensorKey);
    } else {
      newSelected.add(sensorKey);
    }
    setSelectedSensors(newSelected);
  };

  const handleDateRangeChange = (cardKey: string, dates: [Date | null, Date | null]) => {
    const newDateRanges = new Map(dateRanges);
    newDateRanges.set(cardKey, dates);
    setDateRanges(newDateRanges);
  };

  const getFilteredSensorData = (item: CultivoZonaSensor) => {
    const cardKey = `${item.cultivoId}-${item.zonaId}`;
    const dateRange = dateRanges.get(cardKey);

    if (!dateRange || (!dateRange[0] && !dateRange[1])) {
      return item.uniqueSensorData;
    }

    const [startDate, endDate] = dateRange;
    return item.uniqueSensorData.filter(sensor => {
      const sensorDate = new Date(sensor.fechaMedicion);
      if (startDate && sensorDate < startDate) return false;
      if (endDate && sensorDate > endDate) return false;
      return true;
    });
  };

  const handleExportPDF = async () => {
    if (selectedSensors.size === 0) {
      alert('Por favor selecciona al menos un sensor para exportar');
      return;
    }

    setIsExporting(true);
    try {
      const selectedDetails = Array.from(selectedSensors).map(uniqueKey => {
        // Find the complete sensor data from the original data structure
        let sensorInfo: any = null;
        let cultivoInfo: any = null;

        // Parse the uniqueKey to find the matching data
        for (const item of sensorData) {
          for (const sensor of item.uniqueSensorData) {
            const currentUniqueKey = `${item.cultivoId}-${item.zonaId}-${sensor.key}`;
            if (currentUniqueKey === uniqueKey) {
              sensorInfo = sensor;
              cultivoInfo = item;
              break;
            }
          }
          if (sensorInfo) break;
        }

        if (!sensorInfo || !cultivoInfo) {
          console.warn(`Could not find complete data for sensor key: ${uniqueKey}`);
          // Fallback parsing
          const parts = uniqueKey.split('-');
          return {
            cultivoId: parts[0],
            zonaId: parts[1],
            sensorKey: parts[parts.length - 1],
            zonaNombre: 'Zona no encontrada',
            cultivoNombre: 'Cultivo no encontrado',
            variedadNombre: 'Variedad no encontrada',
            sensorData: null
          };
        }

        return {
          cultivoId: cultivoInfo.cultivoId,
          zonaId: cultivoInfo.zonaId,
          sensorKey: sensorInfo.key,
          zonaNombre: cultivoInfo.zonaNombre,
          cultivoNombre: cultivoInfo.cultivoNombre,
          variedadNombre: cultivoInfo.variedadNombre,
          tipoCultivoNombre: cultivoInfo.tipoCultivoNombre,
          sensorData: sensorInfo,
          cultivoData: cultivoInfo
        };
      });

      console.log('Selected details for PDF:', selectedDetails);
      await generateSensorSearchPDF(selectedDetails);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error al exportar PDF: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <MagnifyingGlassIcon className="w-6 h-6" />
          Reportes de Sensores 
        </ModalHeader>
        <ModalBody>
          {/* Search Input */}
          <div className="mb-6">
            <Input
              placeholder="Buscar por cultivo, zona, variedad o tipo de cultivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startContent={<MagnifyingGlassIcon className="w-4 h-4" />}
              endContent={
                searchTerm && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onClick={clearSearch}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </Button>
                )
              }
              className="w-full"
            />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <Spinner size="lg" color="primary" />
              <p className="mt-2 text-gray-600">Cargando datos de sensores...</p>
            </div>
          )}

          {/* Results */}
          {!isLoading && (
            <div className="space-y-4">
              {filteredData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? 'No se encontraron resultados para la búsqueda.' : 'No hay datos de sensores disponibles.'}
                </div>
              ) : (
                filteredData.map((item, index) => {
                  const cardKey = `${item.cultivoId}-${item.zonaId}`;
                  const filteredSensorData = getFilteredSensorData(item);
                  return (
                    <Card key={cardKey} className="w-full shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                      <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-100">
                        <div className="flex justify-between items-start w-full">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-800 mb-1">
                              {item.tipoCultivoNombre}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Variedad:</span> {item.variedadNombre} |
                              <span className="font-medium"> Zona:</span> {item.zonaNombre}
                            </p>
                            <div className="flex items-center gap-4">
                              <Badge
                                color={filteredSensorData.length === item.uniqueSensorData.length ? "success" : "warning"}
                                variant="flat"
                                className="text-xs"
                              >
                                {filteredSensorData.length} de {item.uniqueSensorData.length} sensor(es)
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardBody className="pt-4">
                        {/* Date Range Filter */}
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filtrar por rango de fechas:
                          </label>
                          <DateRangeInput
                            onChange={(dates) => handleDateRangeChange(cardKey, dates)}
                          />
                        </div>

                        {/* Filtered Sensor Data */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Datos de Mediciones
                            {filteredSensorData.length !== item.uniqueSensorData.length && (
                              <Chip size="sm" color="primary" variant="flat">
                                Filtrado ({filteredSensorData.length})
                              </Chip>
                            )}
                          </h4>
                          {filteredSensorData.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                              <p className="text-sm">No hay datos en el rango de fechas seleccionado</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {filteredSensorData.map((sensor, sensorIndex) => {
                                const uniqueKey = `${item.cultivoId}-${item.zonaId}-${sensor.key}`;
                                return (
                                  <div
                                    key={uniqueKey}
                                    className="p-4 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors duration-150 shadow-sm hover:shadow-md"
                                  >
                                    <Checkbox
                                      isSelected={selectedSensors.has(uniqueKey)}
                                      onValueChange={() => toggleSensorSelection(uniqueKey)}
                                      className="w-full [&>span>svg]:text-black"
                                    >
                                      <div className="flex justify-between items-center">
                                        <span className="font-semibold text-gray-800">{sensor.key}</span>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                          {sensor.unidad}
                                        </span>
                                      </div>
                                    </Checkbox>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex justify-between">
          <div className="text-sm text-gray-600">
            {selectedSensors.size > 0 && (
              <span>{selectedSensors.size} sensor(es) seleccionado(s)</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="light" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              className="bg-[#15A55A] hover:bg-[#15A55A]/80 text-white"
              onClick={handleExportPDF}
              isLoading={isExporting}
              startContent={!isExporting ? <DocumentArrowDownIcon className="w-4 h-4" /> : undefined}
              isDisabled={selectedSensors.size === 0}
            >
              {isExporting ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SensorSearchModal;