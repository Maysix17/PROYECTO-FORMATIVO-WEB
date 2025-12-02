import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Progress,
} from '@heroui/react';
import { MagnifyingGlassIcon, XMarkIcon, DocumentArrowDownIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { medicionSensorService } from '../../services/zonasService';
import { generateSensorSearchPDF } from '../../utils/pdfGenerator';
import apiClient from '../../lib/axios/axios';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import DateRangeInput from '../atoms/DateRangeInput';
import Swal from 'sweetalert2';

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

interface CardFilters {
  startDate: string;
  endDate: string;
  timeRanges: Set<string>;
}

const SensorSearchModal: React.FC<SensorSearchModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sensorData, setSensorData] = useState<CultivoZonaSensor[]>([]);
  const [filteredData, setFilteredData] = useState<CultivoZonaSensor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSensors, setSelectedSensors] = useState<Set<string>>(new Set());
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [cardFilters, setCardFilters] = useState<Map<string, CardFilters>>(new Map());
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);

  // Progress manager to ensure progress only increases
  const progressRef = useRef(0);
  const updateProgress = useCallback((newProgress: number) => {
    if (newProgress > progressRef.current) {
      progressRef.current = newProgress;
      setExportProgress(newProgress);
    }
  }, []);

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

  const updateCardFilters = (cardKey: string, updates: Partial<CardFilters>) => {
    setCardFilters(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(cardKey) || { startDate: '', endDate: '', timeRanges: new Set<string>() };
      newMap.set(cardKey, { ...current, ...updates });
      return newMap;
    });
  };

  const toggleCardExpansion = (cardKey: string) => {
    setExpandedCard(expandedCard === cardKey ? null : cardKey);
  };

  const isExportEnabled = () => {
    // Must have sensors selected
    if (selectedSensors.size === 0) return false;

    // Must have at least one card with end date configured
    return Array.from(cardFilters.values()).some(filter => filter.endDate);
  };


  const handleExportPDF = async () => {
    if (selectedSensors.size === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Selección requerida',
        text: 'Por favor selecciona al menos un sensor para exportar',
        confirmButtonColor: '#15A55A',
      });
      return;
    }

    setIsExportingPDF(true);
    progressRef.current = 0;
    setExportProgress(0);
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

        const cardKey = `${cultivoInfo.cultivoId}-${cultivoInfo.zonaId}`;
        const filters = cardFilters.get(cardKey);
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
          cvzId: cultivoInfo.cvzId,  // ← AGREGADO: ID correcto para trazabilidad
          timeRanges: filters?.timeRanges && filters.timeRanges.size > 0 ? Array.from(filters.timeRanges) : undefined,
          startDate: filters?.startDate || undefined,
          endDate: filters?.endDate || undefined
        };
      });

      console.log('🎯 FRONTEND: Selected details for PDF:', selectedDetails);
      console.log('🎯 FRONTEND: About to call generateSensorSearchPDF with individual filters applied');
      await generateSensorSearchPDF(selectedDetails, showRawData, updateProgress);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error en la exportación',
        text: 'Error al exportar PDF: ' + (error instanceof Error ? error.message : 'Error desconocido'),
        confirmButtonColor: '#15A55A',
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportCSV = async () => {
    if (selectedSensors.size === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Selección requerida',
        text: 'Por favor selecciona al menos un sensor para exportar',
        confirmButtonColor: '#15A55A',
      });
      return;
    }

    setIsExportingCSV(true);
    progressRef.current = 0;
    setExportProgress(0);
    try {
      updateProgress(10);

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

        const cardKey = `${cultivoInfo.cultivoId}-${cultivoInfo.zonaId}`;
        const filters = cardFilters.get(cardKey);
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
          cvzId: cultivoInfo.cvzId,
          timeRanges: filters?.timeRanges && filters.timeRanges.size > 0 ? Array.from(filters.timeRanges) : undefined,
          startDate: filters?.startDate || undefined,
          endDate: filters?.endDate || undefined
        };
      });

      updateProgress(20);

      // Prepare request for CSV export
      const csvRequest = {
        med_keys: selectedDetails.map(d => d.sensorKey),
        cultivo_ids: selectedDetails.map(d => d.cultivoId),
        zona_ids: selectedDetails.map(d => d.zonaId),
        start_date: selectedDetails.find(d => d.startDate)?.startDate,
        end_date: selectedDetails.find(d => d.endDate)?.endDate,
        time_ranges: selectedDetails.find(d => d.timeRanges)?.timeRanges,
      };

      updateProgress(40);

      console.log('🎯 FRONTEND: CSV export request:', csvRequest);

      // Call CSV export endpoint
      const response = await apiClient.post('/medicion-sensor/csv-export', csvRequest);

      updateProgress(70);

      const csvData = response.data.data;

      if (!csvData || csvData.length === 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Sin datos',
          text: 'No se encontraron datos para los filtros seleccionados',
          confirmButtonColor: '#15A55A',
        });
        return;
      }

      // Convert to CSV with UTF-8 BOM for proper character encoding and semicolon delimiter for Excel compatibility
      const BOM = '\uFEFF';
      const delimiter = ';'; // Use semicolon for better Excel compatibility in Spanish-speaking regions

      // Map Spanish headers to English property names from the backend DTO
      const headerMapping = {
        'fecha_hora': 'timestamp',
        'id_sensor': 'sensor_id',
        'valor': 'value',
        'unidad': 'unit',
        'nombre_cultivo': 'crop_name',
        'nombre_zona': 'zone_name',
        'nombre_variedad': 'variety_name',
        'tipo_cultivo': 'crop_type_name'
      };

      const displayHeaders = Object.keys(headerMapping); // Spanish headers for display
      const csvContent = BOM + [
        displayHeaders.join(delimiter),
        ...csvData.map((row: any) =>
          displayHeaders.map(displayHeader => {
            const actualProperty = headerMapping[displayHeader as keyof typeof headerMapping];
            const value = row[actualProperty];
            // Escape semicolons and quotes in CSV (using semicolon as delimiter)
            if (typeof value === 'string' && (value.includes(delimiter) || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(delimiter)
        )
      ].join('\n');

      updateProgress(90);

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte-sensores-agrotic-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      updateProgress(100);

    } catch (error) {
      console.error('Error exporting CSV:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error en la exportación',
        text: 'Error al exportar CSV: ' + (error instanceof Error ? error.message : 'Error desconocido'),
        confirmButtonColor: '#15A55A',
      });
    } finally {
      setIsExportingCSV(false);
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
          Reporte de Trazabilidad
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
                  return (
                    <Card key={cardKey} className="w-full shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                      <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-100 cursor-pointer" onClick={() => toggleCardExpansion(cardKey)}>
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
                          <div className="flex items-center">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCardExpansion(cardKey);
                              }}
                            >
                              {expandedCard === cardKey ? (
                                <ChevronUpIcon className="w-4 h-4" />
                              ) : (
                                <ChevronDownIcon className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${
                          expandedCard === cardKey ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <CardBody className="pt-4">
                          {/* Filters and Sensor Data */}
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                            <h4 className="text-sm font-semibold text-gray-800 mb-3">Filtros para este reporte</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Fecha Inicio y Fin apiladas */}
                              <div className="space-y-3">
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    Fecha Inicio
                                  </h4>
                                  <Input
                                    type="date"
                                    size="sm"
                                    value={cardFilters.get(cardKey)?.startDate || ''}
                                    onChange={(e) => updateCardFilters(cardKey, { startDate: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    Fecha Fin
                                  </h4>
                                  <Input
                                    type="date"
                                    size="sm"
                                    value={cardFilters.get(cardKey)?.endDate || ''}
                                    onChange={(e) => updateCardFilters(cardKey, { endDate: e.target.value })}
                                    min={cardFilters.get(cardKey)?.startDate}
                                  />
                                </div>
                              </div>

                              {/* Rango Horario */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                  Rango Horario
                                </h4>
                                <div className="space-y-1">
                                  {[
                                    { key: 'morning', label: 'Mañana (6-12)', hours: '6:00-12:00' },
                                    { key: 'afternoon', label: 'Tarde (12-18)', hours: '12:00-18:00' },
                                    { key: 'evening', label: 'Noche (18-24)', hours: '18:00-24:00' },
                                    { key: 'night', label: 'Madrugada (0-6)', hours: '00:00-6:00' }
                                  ].map((range) => (
                                    <Checkbox
                                      key={range.key}
                                      size="sm"
                                      isSelected={cardFilters.get(cardKey)?.timeRanges?.has(range.key) || false}
                                      onValueChange={(isSelected) => {
                                        const currentFilters = cardFilters.get(cardKey) || { startDate: '', endDate: '', timeRanges: new Set<string>() };
                                        const newTimeRanges = new Set(currentFilters.timeRanges);
                                        if (isSelected) {
                                          newTimeRanges.add(range.key);
                                        } else {
                                          newTimeRanges.delete(range.key);
                                        }
                                        updateCardFilters(cardKey, { timeRanges: newTimeRanges });
                                      }}
                                      className="w-full [&>span>svg]:text-black"
                                    >
                                      <div className="flex flex-col">
                                        <span className="text-xs font-medium">{range.label}</span>
                                        <span className="text-xs text-gray-500">{range.hours}</span>
                                      </div>
                                    </Checkbox>
                                  ))}
                                </div>
                                {(cardFilters.get(cardKey)?.timeRanges?.size || 0) > 0 && (
                                  <div className="mt-1 text-xs text-gray-600">
                                    {cardFilters.get(cardKey)?.timeRanges?.size} rango(s) seleccionado(s)
                                  </div>
                                )}
                              </div>

                              {/* Datos de Mediciones */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                  Datos de Mediciones
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                  {item.uniqueSensorData.map((sensor: SensorData, sensorIndex: number) => {
                                    const uniqueKey = `${item.cultivoId}-${item.zonaId}-${sensor.key}`;
                                    return (
                                      <div
                                        key={uniqueKey}
                                        className="p-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors duration-150 shadow-sm hover:shadow-md"
                                      >
                                        <Checkbox
                                          isSelected={selectedSensors.has(uniqueKey)}
                                          onValueChange={() => toggleSensorSelection(uniqueKey)}
                                          size="sm"
                                          className="w-full [&>span>svg]:text-black"
                                        >
                                          <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-800 text-xs">{sensor.key}</span>
                                            <span className="text-[10px] text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                                              {sensor.unidad}
                                            </span>
                                          </div>
                                        </Checkbox>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardBody>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex justify-between">
          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-600">
              {selectedSensors.size > 0 && (
                <span>{selectedSensors.size} sensor(es) seleccionado(s)</span>
              )}
            </div>
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <Checkbox
                isSelected={showRawData}
                onValueChange={setShowRawData}
                size="sm"
                color="primary"
                className="[&>span>svg]:text-black"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-blue-800">📊 Mostrar datos crudos individuales</span>
                  <span className="text-xs text-blue-600">Cada punto representa una medición real del sensor</span>
                </div>
              </Checkbox>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {(isExportingPDF || isExportingCSV) && (
              <div className="flex items-center gap-2 mr-4">
                <Progress
                  size="sm"
                  value={exportProgress}
                  color="success"
                  className="w-32 transition-all duration-300 ease-in-out"
                  showValueLabel={false}
                  aria-label="Export progress"
                />
                <span className="text-sm text-gray-600 min-w-[3rem] font-medium">
                  {exportProgress}%
                </span>
              </div>
            )}
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleExportCSV}
              isLoading={isExportingCSV}
              startContent={!isExportingCSV ? <DocumentTextIcon className="w-4 h-4" /> : undefined}
              isDisabled={!isExportEnabled() || isExportingPDF}
            >
              {isExportingCSV ? 'Exportando...' : 'Exportar CSV'}
            </Button>
            <Button
              className="bg-[#15A55A] hover:bg-[#15A55A]/80 text-white"
              onClick={handleExportPDF}
              isLoading={isExportingPDF}
              startContent={!isExportingPDF ? <DocumentArrowDownIcon className="w-4 h-4" /> : undefined}
              isDisabled={!isExportEnabled() || isExportingCSV}
            >
              {isExportingPDF ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SensorSearchModal;