import React, { useState, useCallback } from 'react';
import GenericFiltersPanel from './GenericFiltersPanel';
import GenericDataTable from './GenericDataTable';
import AdminUserForm from './AdminUserForm';
import CreateRoleModal from './CreateRoleModal';
import ManageRolesModal from './ManageRolesModal';
import FichaModal from './FichaModal';
import userSearchService from '../../services/userSearchService';
import { usePermission } from '../../contexts/PermissionContext';

const PanelControl: React.FC = () => {
  const { hasPermission, permissions, lastUpdate } = usePermission();

  // Debug logging for permission changes
  React.useEffect(() => {
    console.log('PanelControl: Permissions updated', {
      permissionCount: permissions.length,
      lastUpdate: new Date(lastUpdate),
      permissions: permissions.slice(0, 3) // Log first 3 for debugging
    });
  }, [permissions, lastUpdate]);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isManageRolesModalOpen, setIsManageRolesModalOpen] = useState(false);
  const [isFichaModalOpen, setIsFichaModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const handleSearch = useCallback(async () => {
    const searchTerm = filters.buscar || '';
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const data = await userSearchService.searchByDni(searchTerm);
      setResults(Array.isArray(data) ? data.slice(0, 8) : [data]);
    } catch (err: any) {
      // Only log error if it's not a 404 (user not found is expected)
      if (err.response?.status !== 404) {
        console.error('Error al buscar usuario:', err);
      }
      // For 404, just set empty results
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Auto-search when filters change
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.buscar?.trim()) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filters.buscar, handleSearch]);

  const getBadgeClass = (rol: string) => {
    switch (rol) {
      case 'Aprendiz':
        return 'bg-blue-500 text-white';
      case 'Instructor':
        return 'bg-primary-500 text-white';
      case 'Pasante':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Filter configuration for GenericFiltersPanel
  const mainFilters = [
    {
      key: 'buscar',
      label: 'Usuario',
      type: 'text' as const,
      placeholder: 'Buscar por N. Documento...'
    }
  ];

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClear = useCallback(() => {
    setFilters({});
    setResults([]);
  }, []);

  // Check if user has access to panel control
  const canAccessPanel = hasPermission('Usuarios', 'panel_de_control', 'leer');
  const canCreateUsers = hasPermission('Usuarios', 'panel_de_control', 'leer');
  const canUpdateUsers = hasPermission('Usuarios', 'panel_de_control', 'leer');
  const canCreateRoles = hasPermission('Usuarios', 'panel_de_control', 'leer');
  const canManageRoles = hasPermission('Usuarios', 'panel_de_control', 'leer');

  if (!canAccessPanel) {
    return (
      <div className="flex flex-col w-full bg-gray-50 items-center justify-center" style={{ height: 'calc(0px + 93vh)' }}>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Acceso Denegado</h2>
          <p className="text-gray-500">No tienes permisos para acceder al Panel de Control.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-gray-50">
      <div className="flex flex-col gap-6" style={{ height: 'calc(0px + 93vh)', overflowY: 'auto' }}>
        {/* Filtros usando el componente genérico */}
        <GenericFiltersPanel
          title="Panel de Control"
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClear}
          loading={loading}
          mainFilters={mainFilters}
          onCreate={canCreateUsers ? () => setIsUserFormOpen(true) : undefined}
          onManageActions={[
            ...(canCreateRoles ? [{ label: 'Crear nuevo rol', icon: <span>➕</span>, onClick: () => setIsRoleModalOpen(true) }] : []),
            ...(canManageRoles ? [{ label: 'Gestionar roles', icon: <span>⚙️</span>, onClick: () => setIsManageRolesModalOpen(true) }] : []),
            { label: 'Gestionar fichas', icon: <span>📄</span>, onClick: () => setIsFichaModalOpen(true) }
          ]}
        />

        {/* Tabla usando el componente genérico */}
        <GenericDataTable
          data={results}
          columns={[
            { key: 'dni', label: 'N. de documento', width: 'w-[15%]' },
            { key: 'nombres', label: 'Nombres', width: 'w-[15%]' },
            { key: 'apellidos', label: 'Apellidos', width: 'w-[15%]' },
            { key: 'correo_electronico', label: 'Correo', width: 'w-[20%]' },
            { key: 'telefono', label: 'Teléfono', width: 'w-[10%]' },
            { key: 'id_ficha', label: 'ID Ficha', width: 'w-[10%]' },
            { key: 'rol', label: 'Rol', width: 'w-[15%]', render: (user) => (
              <span className={`px-2 py-1 rounded text-sm ${getBadgeClass(user.rol)}`}>
                {user.rol}
              </span>
            )}
          ]}
          loading={loading}
          emptyMessage="No se encontraron usuarios"
          emptyDescription="No hay usuarios que coincidan con los filtros aplicados."
          onClearFilters={handleClear}
          countLabel="usuarios"
          actions={(user) => (
            <>
              {canUpdateUsers && (
                <button
                  className="text-blue-500 hover:text-blue-700 text-sm underline mr-2"
                  onClick={() => {
                    setEditingUser(user);
                    setIsUserFormOpen(true);
                  }}
                >
                  Editar
                </button>
              )}
              <button className="text-red-500 hover:text-red-700 text-sm underline">
                Eliminar
              </button>
            </>
          )}
          mobileFields={(user) => [
            { label: 'N. Documento', value: user.dni },
            { label: 'Nombres', value: user.nombres },
            { label: 'Apellidos', value: user.apellidos },
            { label: 'Correo', value: user.correo_electronico },
            { label: 'Teléfono', value: user.telefono },
            { label: 'ID Ficha', value: user.id_ficha },
            { label: 'Rol', value: <span className={`px-2 py-1 rounded text-sm ${getBadgeClass(user.rol)}`}>{user.rol}</span> }
          ]}
          mobileActions={(user) => [
            ...(canUpdateUsers ? [{
              label: 'Editar',
              onClick: () => {
                setEditingUser(user);
                setIsUserFormOpen(true);
              },
              size: 'sm' as const,
            }] : []),
            {
              label: 'Eliminar',
              onClick: () => {}, // Aquí abrir confirmación
              size: 'sm',
            },
          ]}
        />
      </div>

      <AdminUserForm
        isOpen={isUserFormOpen}
        onClose={() => {
          setIsUserFormOpen(false);
          setEditingUser(null);
        }}
        onUserCreated={() => {
          // Refresh the search results
          if (filters.buscar?.trim()) {
            handleSearch();
          }
          setEditingUser(null);
        }}
        editingUser={editingUser}
      />

      <CreateRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        onRoleCreated={() => {
          // Optionally refresh roles or show message
        }}
      />

      <ManageRolesModal
        isOpen={isManageRolesModalOpen}
        onClose={() => setIsManageRolesModalOpen(false)}
      />

      <FichaModal
        isOpen={isFichaModalOpen}
        onClose={() => setIsFichaModalOpen(false)}
      />
    </div>
  );
};

export default PanelControl;