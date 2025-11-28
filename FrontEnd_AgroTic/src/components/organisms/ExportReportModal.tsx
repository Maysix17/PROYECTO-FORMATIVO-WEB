import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Checkbox,
  Card,
  CardBody,
  Chip,
  Select,
  SelectItem,
  Spinner,
} from "@heroui/react";
import apiClient from "../../lib/axios/axios";
import type { Cultivo } from "../../types/cultivos.types";

interface CultivoZonaCombination {
  cultivoId: string;
  cultivoNombre: string;
  variedadNombre: string;
  tipoCultivoNombre: string;
  zonaId: string;
  zonaNombre: string;
  cvzId: string;
  estadoCultivo: number;
  fechaSiembra: string;
}

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (data: {
    cultivos: string[];
    zonas: string[];
    sensores: string[];
    startDate: string;
    endDate: string;
    groupBy: 'hourly' | 'daily' | 'weekly' | 'time_slot';
    timeRange?: 'morning' | 'afternoon' | 'evening' | 'night';
  }) => void;
}

const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  onExport,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Crop-Zone combination selection
  const [cultivoZonaCombinations, setCultivoZonaCombinations] = useState<CultivoZonaCombination[]>([]);
  const [selectedCombinations, setSelectedCombinations] = useState<string[]>([]);
  const [loadingCombinations, setLoadingCombinations] = useState(false);
  const [errorCombinations, setErrorCombinations] = useState<string | null>(null);

  // Step 2: Date filtering
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState<'hourly' | 'daily' | 'weekly' | 'time_slot'>('daily');
  const [timeRange, setTimeRange] = useState<'morning' | 'afternoon' | 'evening' | 'night' | ''>('');

  // Step 3: Sensor selection
  const [availableSensors, setAvailableSensors] = useState<{
    med_key: string;
    cultivoNombre: string;
    variedadNombre: string;
    zonaNombre: string;
    hasData: boolean;
  }[]>([]);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
  const [loadingSensors, setLoadingSensors] = useState(false);
  const [errorSensors, setErrorSensors] = useState<string | null>(null);

  // Fetch cultivo-zona combinations on modal open
  useEffect(() => {
    if (isOpen) {
      fetchCultivoZonaCombinations();
    }
  }, [isOpen]);

  const fetchCultivoZonaCombinations = async () => {
    setLoadingCombinations(true);
    setErrorCombinations(null);
    try {
      const response = await apiClient.get('/medicion-sensor/by-cultivos-zonas');
      // Map backend response to match frontend interface
      const mappedData = response.data.map((item: any) => ({
        cultivoId: item.cultivoId,
        cultivoNombre: item.cultivoNombre,
        variedadNombre: item.variedadNombre,
        tipoCultivoNombre: item.tipoCultivoNombre,
        zonaId: item.zonaId,
        zonaNombre: item.zonaNombre,
        cvzId: item.cvzId,
        estadoCultivo: item.estadoCultivo,
        fechaSiembra: item.fechaSiembra ? new Date(item.fechaSiembra).toISOString().split('T')[0] : ''
      }));
      setCultivoZonaCombinations(mappedData);
    } catch (error) {
      console.error("Error fetching cultivo-zona combinations:", error);
      setErrorCombinations(`Failed to load crop-zone combinations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingCombinations(false);
    }
  };

  const handleCombinationSelect = (cvzId: string) => {
    setSelectedCombinations(prev =>
      prev.includes(cvzId)
        ? prev.filter(id => id !== cvzId)
        : [...prev, cvzId]
    );
  };

  const handleSensorSelect = (medKey: string) => {
    setSelectedSensors(prev =>
      prev.includes(medKey)
        ? prev.filter(key => key !== medKey)
        : [...prev, medKey]
    );
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!startDate || !endDate) {
        setErrorSensors("Please select both start and end dates");
        return;
      }
      
      if (new Date(startDate) >= new Date(endDate)) {
        setErrorSensors("End date must be after start date");
        return;
      }
      
      await fetchAvailableSensors();
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep === 3) {
      setCurrentStep(2);
      setAvailableSensors([]);
      setSelectedSensors([]);
      setErrorSensors(null);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const fetchAvailableSensors = async () => {
    if (selectedCombinations.length === 0) return;

    setLoadingSensors(true);
    setErrorSensors(null);
    try {
      const selectedCombinationData = selectedCombinations.map(cvzId => 
        cultivoZonaCombinations.find(combo => combo.cvzId === cvzId)
      ).filter(Boolean);

      const cultivo_ids = [...new Set(selectedCombinationData.map(combo => combo!.cultivoId))];
      const zona_ids = [...new Set(selectedCombinationData.map(combo => combo!.zonaId))];

      const response = await apiClient.post('/medicion-sensor/report-data', {
        med_keys: [], // Get all available sensor keys first
        cultivo_ids,
        zona_ids,
        start_date: startDate + 'T00:00:00.000Z',
        end_date: endDate + 'T23:59:59.999Z',
        group_by: groupBy,
        time_range: timeRange || undefined
      });

      // Process response to get unique sensor keys and their associated data
      const sensorMap = new Map<string, any>();
      
      if (Array.isArray(response.data)) {
        response.data.forEach((report: any) => {
          if (report.statistics && Array.isArray(report.statistics)) {
            report.statistics.forEach((stat: any) => {
              if (!sensorMap.has(stat.med_key)) {
                const combo = selectedCombinationData.find(c => 
                  c!.cultivoId === report.cultivoId && c!.zonaId === report.zonaId
                );
                
                sensorMap.set(stat.med_key, {
                  med_key: stat.med_key,
                  cultivoNombre: combo?.cultivoNombre || '',
                  variedadNombre: combo?.variedadNombre || '',
                  zonaNombre: combo?.zonaNombre || '',
                  hasData: stat.count > 0
                });
              }
            });
          }
        });
      }

      const sensorsArray = Array.from(sensorMap.values());
      setAvailableSensors(sensorsArray);
      
      if (sensorsArray.length === 0) {
        setErrorSensors("No sensors found with data in the selected date range.");
      }
    } catch (error) {
      console.error("Error fetching available sensors:", error);
      setErrorSensors(`Failed to load available sensors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingSensors(false);
    }
  };

  const handleExport = () => {
    const selectedCombinationData = selectedCombinations.map(cvzId => 
      cultivoZonaCombinations.find(combo => combo.cvzId === cvzId)
    ).filter(Boolean);

    const cultivo_ids = [...new Set(selectedCombinationData.map(combo => combo!.cultivoId))];
    const zona_ids = [...new Set(selectedCombinationData.map(combo => combo!.zonaId))];

    onExport({
      cultivos: cultivo_ids,
      zonas: zona_ids,
      sensores: selectedSensors,
      startDate,
      endDate,
      groupBy,
      timeRange: timeRange || undefined
    });
    
    onClose();
    resetState();
  };

  const resetState = () => {
    setCurrentStep(1);
    setSelectedCombinations([]);
    setStartDate("");
    setEndDate("");
    setGroupBy('daily');
    setTimeRange('');
    setAvailableSensors([]);
    setSelectedSensors([]);
    setErrorCombinations(null);
    setErrorSensors(null);
  };

  // Calculate default date range (last 30 days)
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      setEndDate(today.toISOString().split('T')[0]);
      setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  const canProceedToStep2 = selectedCombinations.length > 0;
  const canProceedToStep3 = startDate && endDate && new Date(startDate) < new Date(endDate) && !loadingSensors;
  const canExport = selectedSensors.length > 0;

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={(isOpenState) => {
        if (!isOpenState) {
          onClose();
          resetState();
        }
      }} 
      size="4xl" 
      className="max-h-[90vh]"
      closeButton
    >
      <ModalContent>
        <ModalHeader>
          <h2 className="text-xl font-bold">
            Export Sensor Report - Step {currentStep} of 3
          </h2>
        </ModalHeader>

        <ModalBody className="max-h-[60vh] overflow-y-auto">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Select Crop-Zone Combinations</h3>
                <p className="text-sm text-gray-600">
                  Choose the crop-zone combinations you want to include in your report.
                </p>
              </div>

              {loadingCombinations ? (
                <div className="text-center py-8">
                  <Spinner size="lg" />
                  <p className="mt-2 text-gray-600">Loading crop-zone combinations...</p>
                </div>
              ) : errorCombinations ? (
                <div className="text-center py-8">
                  <div className="text-red-500 mb-4">{errorCombinations}</div>
                  <Button color="primary" onPress={fetchCultivoZonaCombinations}>
                    Retry
                  </Button>
                </div>
              ) : cultivoZonaCombinations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No crop-zone combinations found.
                </div>
              ) : (
                <div className="space-y-3">
                  {cultivoZonaCombinations.map((combination) => (
                    <Card 
                      key={combination.cvzId} 
                      className={`cursor-pointer transition-all ${
                        selectedCombinations.includes(combination.cvzId) 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleCombinationSelect(combination.cvzId)}
                    >
                      <CardBody className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              isSelected={selectedCombinations.includes(combination.cvzId)}
                              onValueChange={() => handleCombinationSelect(combination.cvzId)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div>
                              <p className="font-medium">
                                {combination.cultivoNombre} - {combination.variedadNombre}
                              </p>
                              <p className="text-sm text-gray-600">
                                Zone: {combination.zonaNombre} | Type: {combination.tipoCultivoNombre}
                              </p>
                              <p className="text-xs text-gray-500">
                                Planted: {new Date(combination.fechaSiembra).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {selectedCombinations.includes(combination.cvzId) && (
                            <Chip color="primary" size="sm">Selected</Chip>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}

              {selectedCombinations.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Selected {selectedCombinations.length} crop-zone combinations
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Set Date Range and Grouping</h3>
                <p className="text-sm text-gray-600">
                  Define the time period for your report and how to group the data.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={endDate || undefined}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Group Data By</label>
                <Select
                  selectedKeys={[groupBy]}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as 'hourly' | 'daily' | 'weekly' | 'time_slot';
                    setGroupBy(value);
                  }}
                >
                  <SelectItem key="hourly">Hourly</SelectItem>
                  <SelectItem key="daily">Daily</SelectItem>
                  <SelectItem key="weekly">Weekly</SelectItem>
                  <SelectItem key="time_slot">Time Slots (4 per day)</SelectItem>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Time Range (Optional)</label>
                <Select
                  selectedKeys={timeRange ? [timeRange] : []}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0] as 'morning' | 'afternoon' | 'evening' | 'night' | '';
                    setTimeRange(value);
                  }}
                >
                  <SelectItem key="">All Day</SelectItem>
                  <SelectItem key="morning">Morning (6:00 - 12:00)</SelectItem>
                  <SelectItem key="afternoon">Afternoon (12:00 - 18:00)</SelectItem>
                  <SelectItem key="evening">Evening (18:00 - 24:00)</SelectItem>
                  <SelectItem key="night">Night (00:00 - 6:00)</SelectItem>
                </Select>
              </div>

              {(!startDate || !endDate || new Date(startDate) >= new Date(endDate)) && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    {(!startDate || !endDate) 
                      ? "Please select both start and end dates to continue."
                      : "End date must be after start date."
                    }
                  </p>
                </div>
              )}

              {startDate && endDate && new Date(startDate) < new Date(endDate) && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Selected {selectedCombinations.length} crop-zone combinations for the period: {startDate} to {endDate}
                  </p>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Select Sensors</h3>
                <p className="text-sm text-gray-600">
                  Choose the specific sensors you want to include in your report.
                </p>
              </div>

              {loadingSensors ? (
                <div className="text-center py-8">
                  <Spinner size="lg" />
                  <p className="mt-2 text-gray-600">Loading available sensors...</p>
                </div>
              ) : errorSensors ? (
                <div className="text-center py-8">
                  <div className="text-red-500 mb-4">{errorSensors}</div>
                  <Button color="primary" onPress={fetchAvailableSensors}>
                    Retry
                  </Button>
                </div>
              ) : availableSensors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No sensors found with data in the selected date range.
                </div>
              ) : (
                <div className="space-y-3">
                  {availableSensors.map((sensor) => (
                    <Card 
                      key={sensor.med_key} 
                      className={`cursor-pointer transition-all ${
                        selectedSensors.includes(sensor.med_key) 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover:bg-gray-50'
                      } ${!sensor.hasData ? 'opacity-60' : ''}`}
                      onClick={() => sensor.hasData && handleSensorSelect(sensor.med_key)}
                    >
                      <CardBody className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              isSelected={selectedSensors.includes(sensor.med_key)}
                              onValueChange={() => sensor.hasData && handleSensorSelect(sensor.med_key)}
                              isDisabled={!sensor.hasData}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div>
                              <p className="font-medium">{sensor.med_key}</p>
                              <p className="text-sm text-gray-600">
                                {sensor.cultivoNombre} - {sensor.variedadNombre} ({sensor.zonaNombre})
                              </p>
                              {!sensor.hasData && (
                                <p className="text-xs text-orange-600">No data in selected period</p>
                              )}
                            </div>
                          </div>
                          {selectedSensors.includes(sensor.med_key) && sensor.hasData && (
                            <Chip color="primary" size="sm">Selected</Chip>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}

              {selectedSensors.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Selected {selectedSensors.length} of {availableSensors.filter(s => s.hasData).length} sensors with data
                  </p>
                </div>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>

          {currentStep > 1 && (
            <Button variant="light" onPress={handleBack}>
              Back
            </Button>
          )}

          {currentStep === 1 ? (
            <Button
              color="primary"
              onPress={handleNext}
              isDisabled={!canProceedToStep2}
            >
              Next
            </Button>
          ) : currentStep === 2 ? (
            <Button
              color="primary"
              onPress={handleNext}
              isDisabled={!canProceedToStep3}
            >
              Next
            </Button>
          ) : (
            <Button
              color="primary"
              onPress={handleExport}
              isDisabled={!canExport}
            >
              Export Report
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ExportReportModal;