import React, { useState, useCallback } from "react";
import InputSearch from "../atoms/buscador";
import DateRangeInput from "../atoms/DateRangeInput";
import CustomButton from "../atoms/Boton";
import { ChevronDownIcon, ChevronUpIcon, FunnelIcon, MagnifyingGlassIcon, ArrowPathIcon, PlusIcon, EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { Popover, PopoverTrigger, PopoverContent, Tooltip, Chip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/react";

interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date';
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

interface GenericFiltersPanelProps {
  title: string;
  filters: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onSearch: () => void;
  onClear: () => void;
  loading?: boolean;
  mainFilters: FilterField[];
  advancedFilters?: FilterField[];
  // Experimental: Integrated header actions
  onExport?: () => void;
  onCreate?: () => void;
  onManageTipoCultivo?: () => void;
  onManageVariedad?: () => void;
  onManageEstados?: () => void;
  onManageMqtt?: () => void;
  onManageActions?: Array<{ label: string; icon: React.ReactNode; onClick: () => void }>;
}

const GenericFiltersPanel: React.FC<GenericFiltersPanelProps> = ({
  title,
  filters,
  onFilterChange,
  onSearch,
  onClear,
  loading = false,
  mainFilters,
  advancedFilters = [],
  onExport,
  onCreate,
  onManageTipoCultivo,
  onManageVariedad,
  onManageEstados,
  onManageMqtt,
  onManageActions = [],
}) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // Check if any filters are active
  const hasActiveFilters = Boolean(
    Object.values(filters).some(value =>
      value !== undefined && value !== null && value !== ''
    )
  );

  // Immediate filter change (no debounce)
  const handleFilterChange = useCallback((key: string, value: any) => {
    onFilterChange(key, value);
    // Auto-search on filter change
    onSearch();
  }, [onFilterChange, onSearch]);

  // Active filters for chips
  const activeFilters: Array<{ key: string; label: string; value: any }> = [];

  // Build active filters from main filters
  mainFilters.forEach(field => {
    const value = filters[field.key];
    if (value !== undefined && value !== null && value !== '') {
      let label = `${field.label}: ${value}`;
      if (field.type === 'select' && field.options) {
        const option = field.options.find(opt => opt.value === value);
        if (option) label = `${field.label}: ${option.label}`;
      }
      activeFilters.push({ key: field.key, label, value: field.type === 'date' ? { [field.key]: undefined } : '' });
    }
  });

  // Build active filters from advanced filters
  advancedFilters.forEach(field => {
    const value = filters[field.key];
    if (value !== undefined && value !== null && value !== '') {
      let label = `${field.label}: ${value}`;
      if (field.type === 'select' && field.options) {
        const option = field.options.find(opt => opt.value === value);
        if (option) label = `${field.label}: ${option.label}`;
      }
      activeFilters.push({ key: field.key, label, value: field.type === 'date' ? { [field.key]: undefined } : '' });
    }
  });

  const renderFilterField = (field: FilterField) => {
    switch (field.type) {
      case 'text':
        return (
          <InputSearch
            key={field.key}
            placeholder={field.placeholder || `Buscar ${field.label.toLowerCase()}...`}
            value={filters[field.key] || ""}
            onChange={(e) => handleFilterChange(field.key, e.target.value)}
          />
        );
      case 'select':
        return (
          <select
            key={field.key}
            className="w-full h-9 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-sm"
            value={filters[field.key] ?? ""}
            onChange={(e) => handleFilterChange(field.key, e.target.value ? e.target.value : undefined)}
          >
            <option value="">{field.placeholder || `Todos`}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        );
      case 'date':
        return (
          <DateRangeInput
            key={field.key}
            label=""
            onChange={(dates) => {
              const [startDate, endDate] = dates;
              handleFilterChange(`${field.key}_inicio`, startDate ? startDate.toISOString().split("T")[0] : undefined);
              handleFilterChange(`${field.key}_fin`, endDate ? endDate.toISOString().split("T")[0] : undefined);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ paddingTop: '16px', paddingBottom: '5px' }}>
      {/* Experimental: Integrated Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">
            {title}
          </h1>

          {/* Toolbar compacto */}
          <div className="flex items-center gap-3">
            {onExport && (
              <CustomButton
                color="success"
                variant="solid"
                size="sm"
                onClick={onExport}
                label="Exportar"
                className="rounded-lg px-3 py-1 h-8"
              />
            )}

            {onCreate && (
              <Tooltip content="Crear nuevo">
                <CustomButton
                  color="success"
                  onClick={onCreate}
                  size="sm"
                  label="Nuevo"
                  icon={<PlusIcon className="w-4 h-4" />}
                  className="rounded-lg px-3 py-1 h-8"
                />
              </Tooltip>
            )}

            {onManageTipoCultivo && (
              <Tooltip content="Gestionar tipos de cultivo">
                <CustomButton
                  variant="light"
                  size="sm"
                  label="Tipo Cultivo"
                  onClick={onManageTipoCultivo}
                  className="rounded-lg px-3 py-1 h-8 text-gray-600"
                />
              </Tooltip>
            )}

            {onManageVariedad && (
              <Tooltip content="Gestionar variedades">
                <CustomButton
                  variant="light"
                  size="sm"
                  label="Variedad"
                  onClick={onManageVariedad}
                  className="rounded-lg px-3 py-1 h-8 text-gray-600"
                />
              </Tooltip>
            )}

            {onManageEstados && (
              <Tooltip content="Gestionar estados fenológicos">
                <CustomButton
                  variant="light"
                  size="sm"
                  label="Estados"
                  onClick={onManageEstados}
                  className="rounded-lg px-3 py-1 h-8 text-gray-600"
                />
              </Tooltip>
            )}

            {onManageMqtt && (
              <Tooltip content="Gestionar configuraciones de bróker">
                <CustomButton
                  variant="light"
                  size="sm"
                  label="Bróker"
                  onClick={onManageMqtt}
                  className="rounded-lg px-3 py-1 h-8 text-gray-600"
                />
              </Tooltip>
            )}

            {onManageActions.length > 0 && (
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
                  {onManageActions.map((action, index) => (
                    <DropdownItem
                      key={index}
                      startContent={action.icon}
                      onClick={action.onClick}
                    >
                      {action.label}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            )}
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
        {/* Main Filters Row with Chips on Right */}
        <div className="flex flex-col xl:flex-row md:flex-row gap-4 mb-3 items-center">
          <div className="flex gap-4">
            {mainFilters.map(field => (
              <div key={field.key} className="w-64">
                {renderFilterField(field)}
              </div>
            ))}
          </div>
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <Chip
                  key={filter.key}
                  onClose={() => {
                    if (typeof filter.value === 'object' && filter.value !== null) {
                      // Handle date range removal
                      Object.keys(filter.value).forEach(key => {
                        onFilterChange(key, filter.value[key]);
                      });
                    } else {
                      onFilterChange(filter.key, filter.value);
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
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify-between">
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
          {advancedFilters.length > 0 && (
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
                  {advancedFilters.map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                      </label>
                      {renderFilterField(field)}
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenericFiltersPanel;