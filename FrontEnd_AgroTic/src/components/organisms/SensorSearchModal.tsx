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
  Select,
  SelectItem,
} from '@heroui/react';
import { MagnifyingGlassIcon, XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { medicionSensorService } from '../../services/zonasService';
import { generateSensorSearchPDF } from '../../utils/pdfGenerator';
import apiClient from '../../lib/axios/axios';
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
  const [globalStartDate, setGlobalStartDate] = useState('');
  const [globalEndDate, setGlobalEndDate] = useState('');
  const [selectedTimeRanges, setSelectedTimeRanges] = useState<Set<string>>(new Set());

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
          cultivoData: cultivoInfo,
          timeRanges: Array.from(selectedTimeRanges).length > 0 ? Array.from(selectedTimeRanges) : undefined,
          startDate: globalStartDate || undefined,
          endDate: globalEndDate || undefined
        };
      });

      console.log('🎯 FRONTEND: Selected details for PDF:', selectedDetails);
      console.log('🎯 FRONTEND: Global filters - startDate:', globalStartDate, 'endDate:', globalEndDate, 'selectedTimeRanges:', Array.from(selectedTimeRanges));
      console.log('🎯 FRONTEND: About to call generateSensorSearchPDF with filters applied');
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

          {/* Global Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
              <Input
                type="date"
                value={globalStartDate}
                onChange={(e) => setGlobalStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Fecha Fin</label>
              <Input
                type="date"
                value={globalEndDate}
                onChange={(e) => setGlobalEndDate(e.target.value)}
                min={globalStartDate}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Rango Horario</label>
              <div className="space-y-2">
                {[
                  { key: 'morning', label: 'Mañana (6-12)', hours: '6:00-12:00' },
                  { key: 'afternoon', label: 'Tarde (12-18)', hours: '12:00-18:00' },
                  { key: 'evening', label: 'Noche (18-24)', hours: '18:00-24:00' },
                  { key: 'night', label: 'Madrugada (0-6)', hours: '00:00-6:00' }
                ].map((range) => (
                  <Checkbox
                    key={range.key}
                    isSelected={selectedTimeRanges.has(range.key)}
                    onValueChange={(isSelected) => {
                      const newSelected = new Set(selectedTimeRanges);
                      if (isSelected) {
                        newSelected.add(range.key);
                      } else {
                        newSelected.delete(range.key);
                      }
                      setSelectedTimeRanges(newSelected);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{range.label}</span>
                      <span className="text-xs text-gray-500">{range.hours}</span>
                    </div>
                  </Checkbox>
                ))}
              </div>
              {selectedTimeRanges.size > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  {selectedTimeRanges.size} rango(s) seleccionado(s)
                </div>
              )}
            </div>
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
                                color="success"
                                variant="flat"
                                className="text-xs"
                              >
                                {item.uniqueSensorData.length} sensor(es)
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardBody className="pt-4">
                        {/* Sensor Data */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Datos de Mediciones
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {item.uniqueSensorData.map((sensor: SensorData, sensorIndex: number) => {
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