import React, { useState, useEffect, useCallback } from 'react';
import { zonasService, type Zona } from '../services/zonasService';
import LeafletMap from '../components/molecules/LeafletMap';
import MqttSelectionModal from '../components/molecules/MqttSelectionModal';
import SensorReadingsModal from '../components/molecules/SensorReadingsModal';
import ZonaModal from '../components/organisms/ZonaModal';
import MqttManagementModal from '../components/molecules/MqttManagementModal';
import GenericFiltersPanel from '../components/organisms/GenericFiltersPanel';
import { usePermission } from '../contexts/PermissionContext';

const GestionZonasPage: React.FC = () => {
    const { hasPermission, isInitializing } = usePermission();
    const [zonas, setZonas] = useState<Zona[]>([]);
    const [filteredZonas, setFilteredZonas] = useState<Zona[]>([]);
    const [selectedZona, setSelectedZona] = useState<Zona | null>(null);
    const [filters, setFilters] = useState<Record<string, any>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // MQTT related state
  const [showMqttSelectionModal, setShowMqttSelectionModal] = useState(false);
  const [showReadingsModal, setShowReadingsModal] = useState(false);

  // Zona creation modal
  const [showZonaModal, setShowZonaModal] = useState(false);
  const [editingZona, setEditingZona] = useState<Zona | null>(null);

  // MQTT management modal
  const [showMqttManagementModal, setShowMqttManagementModal] = useState(false);


  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterZonas();
  }, [zonas, filters]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const zonasData = await zonasService.getAll();
      setZonas(zonasData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterZonas = () => {
    const searchTerm = filters.buscar || '';
    if (!searchTerm) {
      setFilteredZonas(zonas);
      return;
    }

    const filtered = zonas.filter(zona =>
      zona.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredZonas(filtered);
  };

  const handleZonaSelect = (zona: Zona) => {
    setSelectedZona(zona);
  };

  const handleBrokerConfig = (zona: Zona) => {
    setSelectedZona(zona);
    setShowMqttSelectionModal(true);
  };

  const handleViewReadings = (zona: Zona) => {
    setSelectedZona(zona);
    setShowReadingsModal(true);
  };

  const handleBrokerSave = async () => {
    await loadData(); // Reload configs asynchronously
    setShowMqttSelectionModal(false);
  };

  const handleCreateZona = () => {
    setShowZonaModal(true);
  };

  const handleZonaSave = async () => {
    await loadData(); // Reload zones asynchronously
    setShowZonaModal(false);
    setSelectedZona(null); // Clear selection to show all zones
    setEditingZona(null); // Clear editing state
  };

  const handleEditZona = (zona: Zona) => {
    setEditingZona(zona);
    setShowZonaModal(true);
  };


  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSearch = useCallback(() => {
    // Search is handled automatically by useEffect
  }, []);

  const handleClear = useCallback(() => {
    setFilters({});
  }, []);

  // Filter configuration for GenericFiltersPanel
  const mainFilters = [
    {
      key: 'buscar',
      label: 'Zona',
      type: 'text' as const,
      placeholder: 'Buscar por zona...'
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-gray-50">
      <div style={{ height: 'calc(0px + 93vh)', overflowY: 'auto' }}>

        {/* Filtros usando el componente genérico */}
        <GenericFiltersPanel
          title="Gestión de Zonas"
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClear}
          loading={isLoading}
          mainFilters={mainFilters}
          onCreate={hasPermission('zonas', 'zonas', 'crear') ? handleCreateZona : undefined}
          onManageMqtt={hasPermission('zonas', 'zonas', 'crear') ? () => setShowMqttManagementModal(true) : undefined}
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Table */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden relative" style={{ height: 'calc(-280px + 93vh)' }}>
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">Resultados</h2>
                </div>
              </div>
              <div className="absolute top-4 right-6 flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                  {filteredZonas.length} {filteredZonas.length === 1 ? 'zona' : 'zonas'}
                </span>
                {lastUpdate && (
                  <span className="text-xs text-gray-500">
                    Actualizado: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="p-12 text-center">
                  <div className="inline-flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                    <span className="text-gray-600">Cargando zonas...</span>
                  </div>
                </div>
              ) : filteredZonas.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron zonas</h3>
                  <p className="text-gray-500 mb-4">No hay zonas que coincidan con los filtros aplicados.</p>
                  <button
                    onClick={handleClear}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-50 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto h-full">
                  <table className="w-full">
                    <thead className="bg-gray-50/50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[20%]">
                          Zona
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[15%]">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[15%]">
                          Área (m²)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[15%]">
                          Conexión
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[35%]">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {filteredZonas.map((zona, index) => (
                        <tr
                          key={`${zona.id}-${index}`}
                          className={`h-14 hover:bg-gray-50/50 transition-colors cursor-pointer ${selectedZona?.id === zona.id ? 'bg-blue-50' : ''}`}
                          onClick={() => handleZonaSelect(zona)}
                        >
                          <td className="px-6 py-3 text-sm text-gray-900 font-medium">
                            {zona.nombre}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-900">
                            {zona.coordenadas.type === 'polygon' ? 'Lote' : 'Punto'}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-900">
                            {zona.areaMetrosCuadrados ? zona.areaMetrosCuadrados.toLocaleString() : '-'}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-900">
                            {zona.zonaMqttConfigs && zona.zonaMqttConfigs.filter(config => config.estado).length > 0 ? (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {zona.zonaMqttConfigs.filter(config => config.estado).length} Conectado{zona.zonaMqttConfigs.filter(config => config.estado).length > 1 ? 's' : ''}
                                </span>
                                {zona.zonaMqttConfigs.filter(config => config.estado).map(config => (
                                  <span key={config.id} className="text-xs text-gray-600 truncate max-w-32" title={config.mqttConfig?.nombre}>
                                    {config.mqttConfig?.nombre}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Desconectado
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-1">
                              {hasPermission('zonas', 'zonas', 'actualizar') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBrokerConfig(zona);
                                  }}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                  title="Configuración de bróker"
                                >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewReadings(zona);
                                }}
                                className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                                title="Ver datos"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                              </button>
                              {hasPermission('zonas', 'zonas', 'actualizar') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditZona(zona);
                                  }}
                                  className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                                  title="Editar zona"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden relative" style={{ height: 'calc(-280px + 93vh)' }}>
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">Mapa de Zonas</h2>
                </div>
              </div>
              <div className="w-full h-full rounded overflow-hidden flex items-center " style={{ height: '80%', width: '50vw' }}>
                <LeafletMap
                  zonas={filteredZonas.map(z => ({
                    id: z.id,
                    nombre: z.nombre,
                    coordenadas: z.coordenadas,
                  }))}
                  selectedZona={selectedZona ? {
                    id: selectedZona.id,
                    nombre: selectedZona.nombre,
                    coordenadas: selectedZona.coordenadas,
                  } : undefined}
                  onZonaSelect={(zona) => {
                    const fullZona = zonas.find(z => z.id === zona.id);
                    if (fullZona) handleZonaSelect(fullZona);
                  }}
                  showSatellite={true}
                  modalOpen={showMqttSelectionModal || showReadingsModal || showZonaModal}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showZonaModal && (
          <ZonaModal
            isOpen={showZonaModal}
            onClose={() => {
              setShowZonaModal(false);
              setEditingZona(null);
            }}
            onSave={handleZonaSave}
            zona={editingZona}
          />
        )}

        {showMqttSelectionModal && selectedZona && (
          <MqttSelectionModal
            isOpen={showMqttSelectionModal}
            onClose={() => setShowMqttSelectionModal(false)}
            zonaId={selectedZona.id}
            zonaNombre={selectedZona.nombre}
            onSave={handleBrokerSave}
          />
        )}

        {showReadingsModal && selectedZona && (
          <SensorReadingsModal
            isOpen={showReadingsModal}
            onClose={() => setShowReadingsModal(false)}
            zonaId={selectedZona.id}
            zonaNombre={selectedZona.nombre}
          />
        )}

        {showMqttManagementModal && (
          <MqttManagementModal
            isOpen={showMqttManagementModal}
            onClose={() => setShowMqttManagementModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default GestionZonasPage;