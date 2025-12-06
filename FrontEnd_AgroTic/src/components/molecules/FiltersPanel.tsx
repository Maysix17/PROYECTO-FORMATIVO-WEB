import React, { useState, useCallback } from "react";
import InputSearch from "../atoms/buscador";
import DateRangeInput from "../atoms/DateRangeInput";
import CustomButton from "../atoms/Boton";
import { ChevronDownIcon, ChevronUpIcon, FunnelIcon, MagnifyingGlassIcon, ArrowPathIcon, PlusIcon, EllipsisVerticalIcon, CogIcon } from "@heroicons/react/24/outline";
import { Popover, PopoverTrigger, PopoverContent, Tooltip, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";
import type { SearchCultivoDto } from "../../types/cultivos.types";
import { usePermission } from "../../contexts/PermissionContext";

interface FiltersPanelProps {
  filters: SearchCultivoDto;
  onFilterChange: (key: keyof SearchCultivoDto, value: any) => void;
  onSearch: () => void;
  onClear: () => void;
  loading?: boolean;
  // Experimental: Integrated header actions
  onExport?: () => void;
  onCreateCultivo?: () => void;
  onManageTipoCultivo?: () => void;
  onManageVariedad?: () => void;
  onManageEstados?: () => void;
  onManageCategoriaActividad?: () => void;
}

const FiltersPanel: React.FC<FiltersPanelProps> = ({
  filters,
  onFilterChange,
  onSearch,
  onClear,
  loading = false,
  onExport,
  onCreateCultivo,
  onManageTipoCultivo,
  onManageVariedad,
  onManageEstados,
  onManageCategoriaActividad,
}) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const { hasPermission, isInitializing } = usePermission();

  // Check if any advanced filters are active (not used in new design)
  // const hasAdvancedFilters = Boolean(
  //   filters.id_titulado || filters.estado_cultivo !== undefined
  // );

  // Check if any filters are active
  const hasActiveFilters = Boolean(
    filters.buscar ||
    filters.buscar_cultivo ||
    filters.fecha_inicio ||
    filters.fecha_fin ||
    filters.id_titulado ||
    filters.estado_cultivo !== undefined
  );

  // Immediate filter change (no debounce)
  const handleFilterChange = useCallback((key: keyof SearchCultivoDto, value: any) => {
    onFilterChange(key, value);
    // Auto-search on filter change
    onSearch();
  }, [onFilterChange, onSearch]);

  // Active filters for chips
  const activeFilters: Array<{ key: string; label: string; value: any }> = [
    ...(filters.buscar ? [{ key: "buscar", label: `Zona: ${filters.buscar}`, value: "" }] : []),
    ...(filters.buscar_cultivo ? [{ key: "buscar_cultivo", label: `Cultivo: ${filters.buscar_cultivo}`, value: "" }] : []),
    ...(filters.fecha_inicio && filters.fecha_fin ? [{
      key: "fecha",
      label: `Fechas: ${filters.fecha_inicio} - ${filters.fecha_fin}`,
      value: { fecha_inicio: undefined, fecha_fin: undefined }
    }] : []),
    ...(filters.id_titulado ? [{ key: "id_titulado", label: `Ficha: ${filters.id_titulado}`, value: "" }] : []),
    ...(filters.estado_cultivo !== undefined ? [{
      key: "estado_cultivo",
      label: `Estado: ${filters.estado_cultivo === 1 ? "En curso" : "Finalizado"}`,
      value: undefined
    }] : []),
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden py-3">
      {/* Experimental: Integrated Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Gestión de Cultivos
          </h1>

          {/* Toolbar compacto */}
          <div className="flex items-center gap-3">
            {onExport && !isInitializing && hasPermission('Cultivos', 'cultivos', 'leer') && (
              <CustomButton
                color="success"
                variant="solid"
                size="sm"
                onClick={onExport}
                label="Exportar"
                className="rounded-lg px-3 py-1 h-8"
              />
            )}

            {onCreateCultivo && !isInitializing && hasPermission('Cultivos', 'cultivos', 'crear') && (
              <Tooltip content="Crear cultivo">
                <CustomButton
                  color="success"
                  onClick={onCreateCultivo}
                  size="sm"
                  label="Nuevo"
                  icon={<PlusIcon className="w-4 h-4" />}
                  className="rounded-lg px-3 py-1 h-8"
                />
              </Tooltip>
            )}

            <Dropdown>
              <DropdownTrigger>
                <CustomButton
                  variant="light"
                  size="sm"
                  icon={<EllipsisVerticalIcon className="w-4 h-4" />}
                  className="rounded-lg px-2 py-1 h-8 min-w-8"
                  ariaLabel="Más acciones"
                />
              </DropdownTrigger>
              <DropdownMenu aria-label="Acciones adicionales">
                {[
                  {
                    key: "tipo-cultivo",
                    label: "Gestionar Tipo de Cultivo",
                    onClick: onManageTipoCultivo,
                    show: !isInitializing && hasPermission('Cultivos', 'cultivos', 'leer')
                  },
                  {
                    key: "variedad",
                    label: "Gestionar Variedad",
                    onClick: onManageVariedad,
                    show: !isInitializing && hasPermission('Cultivos', 'cultivos', 'leer')
                  },
                  {
                    key: "estados",
                    label: "Gestión Estados Fenológicos",
                    onClick: onManageEstados,
                    show: !isInitializing && hasPermission('Cultivos', 'cultivos', 'leer')
                  },
                  {
                    key: "categoria-actividad",
                    label: "Gestionar Categorías de Actividad",
                    onClick: onManageCategoriaActividad,
                    show: !isInitializing && hasPermission('Cultivos', 'cultivos', 'leer')
                  }
                ].filter(item => item.show).map(item => (
                  <DropdownItem
                    key={item.key}
                    startContent={<CogIcon className="w-4 h-4" />}
                    onClick={item.onClick}
                  >
                    {item.label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Mobile Header - Collapsible */}
      <div className="md:hidden">
        <button
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FunnelIcon className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">
              Filtros de Búsqueda
            </h2>
            {hasActiveFilters && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                Activos
              </span>
            )}
          </div>
          {isMobileExpanded ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {/* Mobile Quick Actions - Always visible */}
        {!isMobileExpanded && (
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{hasActiveFilters ? "Filtros aplicados" : "Sin filtros"}</span>
                {hasActiveFilters && (
                  <Tooltip content="Limpiar todos los filtros">
                    <CustomButton
                      onClick={onClear}
                      variant="ghost"
                      size="sm"
                      label="Limpiar"
                      className="text-primary-600 hover:text-primary-700 font-medium underline p-0 h-auto"
                    />
                  </Tooltip>
                )}
              </div>
              <Tooltip content="Buscar con filtros actuales">
                <CustomButton
                  color="success"
                  onClick={onSearch}
                  size="sm"
                  disabled={loading}
                  label="Buscar"
                  icon={<MagnifyingGlassIcon className="w-4 h-4" />}
                  className="rounded-lg px-3 py-1 h-8"
                />
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Filtros de Búsqueda
          </h2>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
              Filtros activos
            </span>
          )}
        </div>
      </div>

      {/* Filters Content */}
      <div className={`${isMobileExpanded || 'hidden md:block'} px-4 pb-4`}>
        {/* Main Filters Row */}
        <div className="flex flex-col xl:flex-row md:flex-row gap-4 mb-3">
          {/* Zona */}
          <div className="w-64">
            <InputSearch
              placeholder="Buscar zona..."
              value={filters.buscar || ""}
              onChange={(e) => handleFilterChange("buscar", e.target.value)}
            />
          </div>

          {/* Cultivo */}
          <div className="w-64">
            <InputSearch
              placeholder="Buscar cultivo..."
              value={filters.buscar_cultivo || ""}
              onChange={(e) => handleFilterChange("buscar_cultivo", e.target.value)}
            />
          </div>

          {/* Rango de Fechas */}
          <div className="w-64">
            <DateRangeInput
              label=""
              onChange={(dates) => {
                const [startDate, endDate] = dates;
                handleFilterChange("fecha_inicio", startDate ? startDate.toISOString().split("T")[0] : undefined);
                handleFilterChange("fecha_fin", endDate ? endDate.toISOString().split("T")[0] : undefined);
              }}
            />
          </div>
        </div>

        {/* Active Filters Chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {activeFilters.map((filter) => (
              <Chip
                key={filter.key}
                onClose={() => {
                  if (filter.key === "fecha") {
                    onFilterChange("fecha_inicio", (filter.value as any).fecha_inicio);
                    onFilterChange("fecha_fin", (filter.value as any).fecha_fin);
                  } else {
                    onFilterChange(filter.key as keyof SearchCultivoDto, filter.value);
                  }
                }}
                variant="flat"
                color="primary"
                size="sm"
                className="text-xs"
              >
                {filter.label}
              </Chip>
            ))}
          </div>
        )}

        {/* Actions Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tooltip content="Buscar con filtros actuales">
              <CustomButton
                color="success"
                onClick={onSearch}
                size="sm"
                disabled={loading}
                label="Buscar"
                icon={<MagnifyingGlassIcon className="w-4 h-4" />}
                className="rounded-lg px-3 py-1 h-8"
              />
            </Tooltip>
            <Tooltip content="Limpiar todos los filtros">
              <CustomButton
                onClick={onClear}
                variant="light"
                size="sm"
                label="Limpiar"
                icon={<ArrowPathIcon className="w-4 h-4" />}
                className="rounded-lg px-3 py-1 h-8 text-gray-600"
              />
            </Tooltip>
          </div>

          {/* Advanced Filters Popover */}
          <Popover placement="bottom-end" showArrow>
            <PopoverTrigger>
              <CustomButton
                variant="light"
                size="sm"
                icon={<ChevronDownIcon className="w-4 h-4 transition-transform duration-150" />}
                className="rounded-lg px-2 py-1 h-8 min-w-8 text-gray-600 transition-all duration-150"
                ariaLabel="Más filtros"
              />
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 animate-in fade-in-0 zoom-in-95 duration-150">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Filtros avanzados</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ficha
                  </label>
                  <InputSearch
                    placeholder="Número de ficha..."
                    value={filters.id_titulado || ""}
                    onChange={(e) => handleFilterChange("id_titulado", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado del Cultivo
                  </label>
                  <select
                    className="w-full h-9 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm"
                    value={filters.estado_cultivo ?? ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "estado_cultivo",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                  >
                    <option value="">Todos</option>
                    <option value="1">En Curso</option>
                    <option value="0">Finalizado</option>
                  </select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default FiltersPanel;