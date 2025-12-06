import React, { useState, useEffect, useCallback } from "react";
import CustomButton from "../components/atoms/Boton";
import MobileCard from "../components/atoms/MobileCard";
import FiltersPanel from "../components/molecules/FiltersPanel";
import type { CardField, CardAction } from "../types/MobileCard.types";
import { searchCultivos, finalizeCultivo } from "../services/cultivosService";
import { closeAllHarvestsByCultivo } from "../services/cosechasService";
import type { Cultivo, SearchCultivoDto } from "../types/cultivos.types";
import TipoCultivoModal from "../components/organisms/TipoCultivoModal";
import VariedadModal from "../components/organisms/VariedadModal";
import CultivoModal from "../components/organisms/CultivoModal";
import CosechaModal from "../components/organisms/CosechaModal";
import VentaModal from "../components/organisms/VentaModal";
import ActivityHistoryModal from "../components/organisms/ActivityHistoryModal";
import CultivoDetailsModal from "../components/organisms/CultivoDetailsModal";
import EstadosFenologicosModal from "../components/organisms//EstadosFenologicosModal";
import HarvestSellModal from "../components/organisms/HarvestSellModal";
import { FinancialAnalysisModal } from "../components/organisms/FinancialAnalysisModal";
import MqttManagementModal from "../components/molecules/MqttManagementModal";
import CategoriaActividadModal from "../components/organisms/CategoriaActividadModal";
import Swal from 'sweetalert2';
import apiClient from '../lib/axios/axios';
import {
  DocumentTextIcon,
  CurrencyDollarIcon,
  TruckIcon,
  EyeIcon
} from "@heroicons/react/24/outline";
import { usePermission } from "../contexts/PermissionContext";

const CultivosPage: React.FC = () => {
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchCultivoDto>({});
  const [isTipoCultivoModalOpen, setIsTipoCultivoModalOpen] = useState(false);
  const [isVariedadModalOpen, setIsVariedadModalOpen] = useState(false);
  const [isCultivoModalOpen, setIsCultivoModalOpen] = useState(false);
  const [isCosechaModalOpen, setIsCosechaModalOpen] = useState(false);
  const [isVentaModalOpen, setIsVentaModalOpen] = useState(false);
  const [isActivityHistoryModalOpen, setIsActivityHistoryModalOpen] = useState(false);
  const [isCultivoDetailsModalOpen, setIsCultivoDetailsModalOpen] = useState(false);
  const [isEstadosFenologicosModalOpen, setIsEstadosFenologicosModalOpen] = useState(false);
  const [isHarvestSellModalOpen, setIsHarvestSellModalOpen] = useState(false);
  const [isFinancialAnalysisModalOpen, setIsFinancialAnalysisModalOpen] = useState(false);
  const [isMqttManagementModalOpen, setIsMqttManagementModalOpen] = useState(false);
  const [isCategoriaActividadModalOpen, setIsCategoriaActividadModalOpen] = useState(false);
  const [selectedCultivo, setSelectedCultivo] = useState<Cultivo | null>(null);
  const [selectedCultivoForDetails, setSelectedCultivoForDetails] = useState<Cultivo | null>(null);
  const [selectedCosechaId, setSelectedCosechaId] = useState<string>("");
  const { hasPermission, isInitializing } = usePermission();

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('cultivos-filters');
    if (savedFilters) {
      try {
        const parsedFilters = JSON.parse(savedFilters);
        setFilters(parsedFilters);
        // Auto-search with saved filters
        handleSearchWithFilters(parsedFilters);
      } catch (error) {
        console.error('Error loading saved filters:', error);
      }
    }
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: number;
      return (searchFilters: SearchCultivoDto) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          handleSearchWithFilters(searchFilters);
        }, 500) as any; // 500ms debounce
      };
    })(),
    []
  );

  const handleSearch = async () => {
    await handleSearchWithFilters(filters);
  };

  const handleFilterChange = (key: keyof SearchCultivoDto, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Save to localStorage
    localStorage.setItem('cultivos-filters', JSON.stringify(newFilters));

    // Debounced search for text inputs, immediate for selects
    if (key === 'buscar' || key === 'buscar_cultivo' || key === 'id_titulado') {
      debouncedSearch(newFilters);
    } else {
      handleSearchWithFilters(newFilters);
    }
  };

  const handleSearchWithFilters = async (searchFilters: SearchCultivoDto) => {
    setLoading(true);
    try {
      const data = await searchCultivos(searchFilters);
      setCultivos(data);
    } catch (error) {
      console.error("Error searching cultivos:", error);
    } finally {
      setLoading(false);
    }
  };


  const clearFilters = () => {
    const emptyFilters = {};
    setFilters(emptyFilters);
    localStorage.removeItem('cultivos-filters');
    setCultivos([]);
  };

  // Funciones removidas ya que ahora se usan desde HarvestSellModal

  const handleOpenHarvestSellModal = (cultivo: Cultivo) => {
    setSelectedCultivo(cultivo);
    setIsHarvestSellModalOpen(true);
  };

  const handleFinalizeCultivo = async (cultivo: Cultivo) => {
    try {
      await finalizeCultivo(cultivo.id);
      console.log('Cultivo finalizado:', cultivo.id);
      // Actualizar la lista para reflejar el cambio
      await handleSearch();
    } catch (error) {
      console.error('Error finalizando cultivo:', error);
      alert('Error al finalizar el cultivo');
    }
  };


  const handleOpenActivityHistoryModal = (cultivo: Cultivo) => {
    setSelectedCultivo(cultivo);
    setIsActivityHistoryModalOpen(true);
  };

  const handleOpenCultivoDetailsModal = (cultivo: Cultivo) => {
    console.log('handleOpenCultivoDetailsModal called with cultivo:', cultivo);
    setSelectedCultivoForDetails(cultivo);
    setIsCultivoDetailsModalOpen(true);
    console.log('Modal state set - isOpen:', true, 'cultivo:', cultivo);
  };

  const handleOpenFinancialAnalysisModal = async (cultivo: Cultivo) => {
    try {
      // Verificar si el cultivo tiene actividades registradas
      const response = await apiClient.get(`/actividades/by-cultivo-variedad-zona/${cultivo.cvzid}`);
      const actividades = response.data;

      if (actividades && actividades.length > 0) {
        // Usar análisis basado en actividades
        setSelectedCultivo(cultivo);
        setIsFinancialAnalysisModalOpen(true);
      } else {
        // No hay actividades registradas
        await Swal.fire({
          title: 'Sin actividades registradas',
          text: 'Este cultivo no tiene actividades registradas para realizar análisis financiero. Registra algunas actividades primero.',
          icon: 'info',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#16A34A',
          customClass: {
            popup: 'rounded-lg',
            title: 'text-lg font-semibold text-gray-800',
            htmlContainer: 'text-sm text-gray-600'
          }
        });
      }
    } catch (error) {
      console.error('Error verificando actividades:', error);
      await Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error al verificar las actividades del cultivo.',
        icon: 'error',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#DC2626'
      });
    }
  };

  // Función removida ya que no se usa

  // Función de exportación movida al modal de detalles

  return (
    <div className="flex flex-col w-full bg-gray-50">
      <div className="flex flex-col gap-6" style={{ height: 'calc(0px + 93vh)', overflowY: 'auto' }}>


        {/* Filtros usando el nuevo componente */}
        <FiltersPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={clearFilters}
          loading={loading}
          onExport={() => {
            const headers = ["Ficha", "Lote", "Nombre del Cultivo", "Fecha de Siembra", "Fecha de Cosecha"];
            const htmlContent = `
              <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
              <head><meta charset="utf-8"><title>Cultivos Export</title></head>
              <body>
                <table border="1">
                  <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
                  <tbody>
                    ${cultivos.map((cultivo) => `
                      <tr>
                        <td>${cultivo.ficha}</td>
                        <td>${cultivo.lote}</td>
                        <td>${cultivo.tipoCultivo?.nombre} ${cultivo.nombrecultivo}</td>
                        <td>${cultivo.fechasiembra ? (() => { const fecha = new Date(cultivo.fechasiembra); fecha.setHours(fecha.getHours() + 5); return fecha.toLocaleDateString('es-CO'); })() : "Sin fecha"}</td>
                        <td>${cultivo.fechacosecha ? (() => { const fecha = new Date(cultivo.fechacosecha); fecha.setHours(fecha.getHours() + 5); return fecha.toLocaleDateString('es-CO'); })() : "Sin cosecha"}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </body>
              </html>
            `;

            const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `cultivos_${new Date().toISOString().split("T")[0]}.xls`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          onCreateCultivo={() => setIsCultivoModalOpen(true)}
          onManageTipoCultivo={() => setIsTipoCultivoModalOpen(true)}
          onManageVariedad={() => setIsVariedadModalOpen(true)}
          onManageEstados={() => setIsEstadosFenologicosModalOpen(true)}
          onManageCategoriaActividad={() => setIsCategoriaActividadModalOpen(true)}
        />

        {/* Tabla escritorio */}
        <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden relative" style={{ height: 'calc(100vh - 280px)' }}>
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Resultados</h2>
            </div>
          </div>
          <div className="absolute top-4 right-6">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
              {cultivos.length} {cultivos.length === 1 ? 'cultivo' : 'cultivos'}
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                <span className="text-gray-600">Cargando cultivos...</span>
              </div>
            </div>
          ) : cultivos.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron cultivos</h3>
              <p className="text-gray-500 mb-4">No hay cultivos que coincidan con los filtros aplicados.</p>
              <CustomButton
                label="Limpiar filtros"
                onClick={clearFilters}
                size="sm"
                variant="light"
              />
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto h-full">
              <table className="w-full">
                <thead className="bg-gray-50/50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[12%]">
                      Lote
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[36%]">
                      Nombre del Cultivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[16%]">
                      Fecha de Siembra
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[16%]">
                      Fecha de Cosecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[20%]">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {cultivos.map((cultivo, index) => (
                    <tr key={`${cultivo.cvzid}-${index}`} className="h-14 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3 text-sm text-gray-900 font-medium">
                        {cultivo.lote}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">{cultivo.tipoCultivo?.nombre}</span>
                          <span className="text-gray-500 text-xs">{cultivo.nombrecultivo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {cultivo.fechasiembra
                          ? (() => {
                              const fecha = new Date(cultivo.fechasiembra);
                              fecha.setHours(fecha.getHours() + 5); // Ajustar zona horaria UTC-5
                              return fecha.toLocaleDateString('es-CO');
                            })()
                          : <span className="text-gray-400 italic">Sin fecha</span>}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {cultivo.fechacosecha
                          ? (() => {
                              const fecha = new Date(cultivo.fechacosecha);
                              fecha.setHours(fecha.getHours() + 5); // Ajustar zona horaria UTC-5
                              return fecha.toLocaleDateString('es-CO');
                            })()
                          : <span className="text-gray-400 italic">Sin cosecha</span>}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1">
                          {!isInitializing && hasPermission('Cultivos', 'cultivos', 'leer') && (
                            <CustomButton
                              icon={<DocumentTextIcon className="w-4 h-4" />}
                              tooltip="Ver actividades"
                              onClick={() => handleOpenActivityHistoryModal(cultivo)}
                              color="secondary"
                              variant="light"
                              size="sm"
                            />
                          )}
                          {!isInitializing && hasPermission('Cultivos', 'cultivos', 'leer') && (
                            <CustomButton
                              icon={<CurrencyDollarIcon className="w-4 h-4" />}
                              tooltip="Análisis financiero"
                              onClick={() => handleOpenFinancialAnalysisModal(cultivo)}
                              color="secondary"
                              variant="light"
                              size="sm"
                            />
                          )}
                          {!isInitializing && hasPermission('Cultivos', 'cultivos', 'leer') && (
                            <CustomButton
                              icon={<TruckIcon className="w-4 h-4" />}
                              tooltip="Cosecha/Venta"
                              onClick={() => handleOpenHarvestSellModal(cultivo)}
                              color="primary"
                              variant="light"
                              size="sm"
                            />
                          )}
                          {!isInitializing && hasPermission('Cultivos', 'cultivos', 'leer') && (
                            <CustomButton
                              icon={<EyeIcon className="w-4 h-4" />}
                              tooltip="Ver detalles"
                              onClick={() => handleOpenCultivoDetailsModal(cultivo)}
                              color="secondary"
                              variant="light"
                              size="sm"
                            />
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

        {/* Mobile Cards */}
        <div className="md:hidden bg-white rounded-lg shadow-md overflow-hidden relative" style={{ height: 'calc(100vh - 320px)' }}>
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Resultados</h2>
            </div>
          </div>
          <div className="absolute top-4 right-6">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
              {cultivos.length} {cultivos.length === 1 ? 'cultivo' : 'cultivos'}
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                <span className="text-gray-600">Cargando cultivos...</span>
              </div>
            </div>
          ) : cultivos.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron cultivos</h3>
              <p className="text-gray-500 mb-4">No hay cultivos que coincidan con los filtros aplicados.</p>
              <CustomButton
                label="Limpiar filtros"
                onClick={clearFilters}
                size="sm"
                variant="light"
              />
            </div>
          ) : (
            <div className="p-4 space-y-3 overflow-y-auto h-full">
              {cultivos.map((cultivo, index) => {
            const fields: CardField[] = [
              { label: "Lote", value: cultivo.lote },
              { label: "Nombre del Cultivo", value: `${cultivo.tipoCultivo?.nombre} ${cultivo.nombrecultivo}` },
              { label: "Fecha de Siembra", value: cultivo.fechasiembra ? (() => { const fecha = new Date(cultivo.fechasiembra); fecha.setHours(fecha.getHours() + 5); return fecha.toLocaleDateString('es-CO'); })() : "Sin fecha" },
              { label: "Fecha de Cosecha", value: cultivo.fechacosecha ? (() => { const fecha = new Date(cultivo.fechacosecha); fecha.setHours(fecha.getHours() + 5); return fecha.toLocaleDateString('es-CO'); })() : "Sin cosecha" },
            ];

                const actions: CardAction[] = [
                  ...(!isInitializing && hasPermission('Cultivos', 'cultivos', 'leer') ? [{
                    icon: <DocumentTextIcon className="w-4 h-4" />,
                    tooltip: "Ver actividades",
                    onClick: () => handleOpenActivityHistoryModal(cultivo),
                    color: "secondary" as const,
                    variant: "light" as const,
                  }] : []),
                  ...(!isInitializing && hasPermission('Cultivos', 'cultivos', 'leer') ? [{
                    icon: <CurrencyDollarIcon className="w-4 h-4" />,
                    tooltip: "Análisis financiero",
                    onClick: () => handleOpenFinancialAnalysisModal(cultivo),
                    color: "secondary" as const,
                    variant: "light" as const,
                  }] : []),
                  ...(!isInitializing && hasPermission('Cultivos', 'cultivos', 'leer') ? [{
                    icon: <TruckIcon className="w-4 h-4" />,
                    tooltip: "Cosecha/Venta",
                    onClick: () => handleOpenHarvestSellModal(cultivo),
                    color: "primary" as const,
                    variant: "light" as const,
                  }] : []),
                  ...(!isInitializing && hasPermission('Cultivos', 'cultivos', 'leer') ? [{
                    icon: <EyeIcon className="w-4 h-4" />,
                    tooltip: "Ver detalles",
                    onClick: () => handleOpenCultivoDetailsModal(cultivo),
                    color: "secondary" as const,
                    variant: "light" as const,
                  }] : []),
                ];

                return (
                  <MobileCard
                    key={`${cultivo.cvzid}-${index}`}
                    fields={fields}
                    actions={actions}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      <TipoCultivoModal
        isOpen={isTipoCultivoModalOpen}
        onClose={() => setIsTipoCultivoModalOpen(false)}
      />
      <VariedadModal
        isOpen={isVariedadModalOpen}
        onClose={() => setIsVariedadModalOpen(false)}
      />
      <CosechaModal
        isOpen={isCosechaModalOpen}
        onClose={() => setIsCosechaModalOpen(false)}
        cvzId={selectedCultivo?.cvzid || ""}
        onSuccess={handleSearch}
        isPerenne={selectedCultivo?.tipoCultivo?.esPerenne || false}
        cultivo={selectedCultivo}
      />
      <VentaModal
        isOpen={isVentaModalOpen}
        onClose={() => setIsVentaModalOpen(false)}
        cultivo={selectedCultivo}
        onSuccess={handleSearch}
      />

      <ActivityHistoryModal
        isOpen={isActivityHistoryModalOpen}
        onClose={() => setIsActivityHistoryModalOpen(false)}
        cvzId={selectedCultivo?.cvzid || ""}
        cultivoName={`${selectedCultivo?.tipoCultivo?.nombre} ${selectedCultivo?.nombrecultivo}` || ""}
      />

      <CultivoDetailsModal
        isOpen={isCultivoDetailsModalOpen}
        onClose={() => setIsCultivoDetailsModalOpen(false)}
        cultivo={selectedCultivoForDetails}
      />

      <CultivoModal
        isOpen={isCultivoModalOpen}
        onClose={() => setIsCultivoModalOpen(false)}
        onSuccess={() => handleSearch()}
      />

      <EstadosFenologicosModal
        isOpen={isEstadosFenologicosModalOpen}
        onClose={() => setIsEstadosFenologicosModalOpen(false)}
      />

      <HarvestSellModal
        isOpen={isHarvestSellModalOpen}
        onClose={() => setIsHarvestSellModalOpen(false)}
        cultivo={selectedCultivo}
        onHarvest={() => setIsCosechaModalOpen(true)}
        onSell={() => setIsVentaModalOpen(true)}
        onFinalize={() => selectedCultivo && handleFinalizeCultivo(selectedCultivo)}
        onCloseHarvest={async () => {
          if (selectedCultivo) {
            try {
              await closeAllHarvestsByCultivo(selectedCultivo.cvzid);
              console.log('Todas las cosechas cerradas para el cultivo:', selectedCultivo.cvzid);

              // For transitorio crops, also finalize the crop
              if (selectedCultivo.tipoCultivo && !selectedCultivo.tipoCultivo.esPerenne) {
                await finalizeCultivo(selectedCultivo.id);
                console.log('Cultivo transitorio finalizado:', selectedCultivo.id);
              }

              // Actualizar la lista para reflejar el cambio
              await handleSearch();
            } catch (error) {
              console.error('Error cerrando cosechas:', error);
              alert('Error al cerrar las cosechas');
            }
          }
        }}
      />

      <FinancialAnalysisModal
        isOpen={isFinancialAnalysisModalOpen}
        onClose={() => setIsFinancialAnalysisModalOpen(false)}
        cultivoId={selectedCultivo?.cvzid}
      />

      <MqttManagementModal
        isOpen={isMqttManagementModalOpen}
        onClose={() => setIsMqttManagementModalOpen(false)}
      />

      <CategoriaActividadModal
        isOpen={isCategoriaActividadModalOpen}
        onClose={() => setIsCategoriaActividadModalOpen(false)}
      />
    </div>
  );
};

export default CultivosPage;
