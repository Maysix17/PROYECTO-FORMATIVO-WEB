import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GenericFiltersPanel from '../components/organisms/GenericFiltersPanel';
import GenericDataTable from '../components/organisms/GenericDataTable';
import UnifiedProductModal from '../components/organisms/UnifiedProductModal';
import BodegaModal from '../components/organisms/BodegaModal';
import CategoriaModal from '../components/organisms/CategoriaModal';
import { inventoryService } from '../services/inventoryService';
import type { LoteInventario } from '../services/inventoryService';
import { PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { Modal, ModalContent } from '@heroui/react';
import { usePermission } from '../contexts/PermissionContext';
import Swal from 'sweetalert2';

const InventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [allItems, setAllItems] = useState<LoteInventario[]>([]);
  const [results, setResults] = useState<LoteInventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUnifiedProductModalOpen, setIsUnifiedProductModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<LoteInventario | null>(null);
    const [editItem, setEditItem] = useState<LoteInventario | null>(null);
    const [isBodegaModalOpen, setIsBodegaModalOpen] = useState(false);
    const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

   const limit = 10; // Items per page


  // Fetch all items on mount
  useEffect(() => {
    fetchAllInventory();
  }, []);

  // Filter items based on filters
   useEffect(() => {
     const searchTerm = filters.buscar || '';
     if (searchTerm.trim()) {
      const filtered = allItems.filter(item =>
        item.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.producto.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setResults(filtered.slice((currentPage - 1) * limit, currentPage * limit));
    } else {
      setResults(allItems.slice((currentPage - 1) * limit, currentPage * limit));
    }
   }, [filters, allItems, currentPage]);

  const fetchAllInventory = async () => {
    console.log('DEBUG: Fetching all inventory after update');
    setLoading(true);
    try {
      // Fetch all items by setting a high limit
      const response = await inventoryService.getAll(1, 10000);
      console.log('DEBUG: All inventory response:', response);
      console.log('DEBUG: First item bodega:', response.items[0]?.bodega);
      console.log('DEBUG: Updated item bodega:', response.items.find(item => item.id === '7cf16a61-2334-44aa-94c4-df3c491b1ef5')?.bodega);
      console.log('DEBUG: Setting allItems with', response.items.length, 'items');
      setAllItems(response.items);
      setResults(response.items.slice(0, limit));
      console.log('DEBUG: Updated results with first', limit, 'items');
    } catch (err: unknown) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async (page: number) => {
    console.log('Fetching inventory for page:', page);
    setLoading(true);
    try {
      const response = await inventoryService.getAll(page, limit);
      console.log('Inventory response:', response);
      setResults(response.items);
    } catch (err: unknown) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };



  const handleDelete = async (id: string) => {
    try {
      await inventoryService.delete(id);
      fetchAllInventory();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      if (error.response?.status === 409) {
        // Show conflict error message
        const errorMessage = error.response?.data?.message || 'No se puede eliminar el elemento porque tiene restricciones.';
        Swal.fire({
          icon: 'warning',
          title: 'No se puede eliminar',
          text: errorMessage,
          confirmButtonText: 'Entendido',
        });
      } else {
        // Show generic error
        Swal.fire({
          icon: 'error',
          title: 'Error al eliminar',
          text: 'Ocurrió un error al eliminar el elemento.',
          confirmButtonText: 'Aceptar',
        });
      }
    }
  };


  // Filter configuration for GenericFiltersPanel
  const mainFilters = [
    {
      key: 'buscar',
      label: 'Producto',
      type: 'text' as const,
      placeholder: 'Buscar por nombre o código...'
    }
  ];

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSearch = useCallback(() => {
    // Search is handled automatically by useEffect
  }, []);

  const handleClear = useCallback(() => {
    setFilters({});
  }, []);

  return (
    <div className="flex flex-col w-full bg-gray-50">
      <div className="flex flex-col gap-6" style={{ height: 'calc(0px + 93vh)', overflowY: 'auto' }}>
        {/* Filtros usando el componente genérico */}
        <GenericFiltersPanel
          title="Gestión de Inventario"
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearch={handleSearch}
          onClear={handleClear}
          loading={loading}
          mainFilters={mainFilters}
          onCreate={hasPermission('Inventario', 'inventario', 'crear') ? () => setIsUnifiedProductModalOpen(true) : undefined}
          onManageActions={
            hasPermission('Inventario', 'inventario', 'leer')
              ? [
                  { label: 'Gestionar Bodegas', icon: <span>🏢</span>, onClick: () => setIsBodegaModalOpen(true) },
                  { label: 'Gestionar Categorías', icon: <span>📂</span>, onClick: () => setIsCategoriaModalOpen(true) },
                  { label: 'Historial de Movimientos', icon: <span>📊</span>, onClick: () => navigate('/app/movements') }
                ]
              : [
                  { label: 'Historial de Movimientos', icon: <span>📊</span>, onClick: () => navigate('/app/movements') }
                ]
          }
        />

        {/* Tabla usando el componente genérico */}
        <GenericDataTable
          data={results}
          columns={[
            { key: 'producto.sku', label: 'Código', width: 'w-[10%]' },
            { key: 'producto.nombre', label: 'Producto', width: 'w-[18%]' },
            { key: 'producto.categoria.nombre', label: 'Categoría', width: 'w-[12%]', render: (item) => item.producto.categoria?.nombre || '-' },
            { key: 'bodega.nombre', label: 'Bodega', width: 'w-[12%]', render: (item) => item.bodega?.nombre || '-' },
            { key: 'stock', label: 'Stock', width: 'w-[8%]', render: (item) => item.stock || '0.00' },
            { key: 'stockTotal', label: 'Cant. Total', width: 'w-[12%]', render: (item) => `${item.stockTotal?.toFixed(2) || '0.00'} ${item.unidadAbreviatura || ''}` },
            { key: 'cantidadDisponibleParaReservar', label: 'Disponible', width: 'w-[12%]', render: (item) => `${item.cantidadDisponibleParaReservar?.toFixed(2) || '0.00'} ${item.unidadAbreviatura || ''}` },
            { key: 'cantidadReservada', label: 'Reservado', width: 'w-[10%]', render: (item) => `${item.cantidadReservada?.toFixed(2) || '0.00'} ${item.unidadAbreviatura || ''}` }
          ]}
          loading={loading}
          emptyMessage="No se encontraron productos"
          emptyDescription="No hay productos que coincidan con los filtros aplicados."
          onClearFilters={handleClear}
          countLabel="productos"
          actions={(item) => (
            <>
              {hasPermission('Inventario', 'inventario', 'leer') && (
                <button
                  onClick={() => {
                    setSelectedItem(item);
                    setIsDetailsModalOpen(true);
                  }}
                  className="text-primary-500 hover:text-primary-700"
                  title="Ver más"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
              )}
              {hasPermission('Inventario', 'inventario', 'actualizar') && (
                <button
                  onClick={() => {
                    setEditItem(item);
                    setIsUnifiedProductModalOpen(true);
                  }}
                  className="text-blue-500 hover:text-blue-700"
                  title="Editar"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              )}
              {hasPermission('Inventario', 'inventario', 'eliminar') && (
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Eliminar"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          mobileFields={(item) => [
            { label: 'Código', value: item.producto.sku },
            { label: 'Producto', value: item.producto.nombre },
            { label: 'Categoría', value: item.producto.categoria?.nombre || '-' },
            { label: 'Bodega', value: item.bodega?.nombre || '-' },
            { label: 'Stock', value: `${item.stock?.toFixed(2) || '0.00'} ${item.unidadAbreviatura || ''}` },
            { label: 'Cant. Total', value: `${item.stockTotal?.toFixed(2) || '0.00'} ${item.unidadAbreviatura || ''}` },
            { label: 'Disponible', value: `${item.cantidadDisponibleParaReservar?.toFixed(2) || '0.00'} ${item.unidadAbreviatura || ''}` },
            { label: 'Reservado', value: `${item.cantidadReservada?.toFixed(2) || '0.00'} ${item.unidadAbreviatura || ''}` }
          ]}
          mobileActions={(item) => {
            const actions: any[] = [];
            if (hasPermission('Inventario', 'inventario', 'leer')) {
              actions.push({
                label: 'Ver más',
                onClick: () => {
                  setSelectedItem(item);
                  setIsDetailsModalOpen(true);
                },
                size: 'sm' as const,
              });
            }
            if (hasPermission('Inventario', 'inventario', 'actualizar')) {
              actions.push({
                label: 'Editar',
                onClick: () => {
                  setEditItem(item);
                  setIsUnifiedProductModalOpen(true);
                },
                size: 'sm' as const,
              });
            }
            if (hasPermission('Inventario', 'inventario', 'eliminar')) {
              actions.push({
                label: 'Eliminar',
                onClick: () => handleDelete(item.id),
                size: 'sm' as const,
              });
            }
            return actions;
          }}
        />
      </div>

      <UnifiedProductModal
        isOpen={isUnifiedProductModalOpen}
        onClose={() => {
          setIsUnifiedProductModalOpen(false);
          setEditItem(null);
        }}
        onProductCreated={() => {
          console.log('DEBUG: onProductCreated called - refreshing inventory data');
          fetchAllInventory();
          setCurrentPage(1);
        }}
        editItem={editItem}
      />

      <BodegaModal
        isOpen={isBodegaModalOpen}
        onClose={() => setIsBodegaModalOpen(false)}
      />

      <CategoriaModal
        isOpen={isCategoriaModalOpen}
        onClose={() => setIsCategoriaModalOpen(false)}
      />

      <Modal isOpen={isImageModalOpen} onOpenChange={setIsImageModalOpen} size="2xl">
        <ModalContent className="bg-white p-6">
          <h2 className="text-xl font-bold mb-4">Imagen del Producto</h2>
          {selectedItem?.producto.imgUrl && (
            <img
              src={`${import.meta.env.VITE_API_URL}/uploads/${selectedItem.producto.imgUrl}`}
              alt={selectedItem.producto.nombre}
              className="w-full h-auto max-h-96 object-contain"
            />
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen} size="5xl" className="overflow-hidden">
        <ModalContent className="bg-white p-6 max-h-[90vh] overflow-hidden flex flex-col">
          <h2 className="text-2xl font-bold mb-6 flex-shrink-0">Detalles del Producto</h2>
          <div className="flex-1 overflow-y-auto">
          {selectedItem && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Información detallada - Lado izquierdo */}
              <div className="flex-1 space-y-6">
                {/* Información del Producto */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Información del Producto</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Nombre:</span> {selectedItem.producto.nombre}</p>
                    <p><span className="font-medium">Código (SKU):</span> {selectedItem.producto.sku || 'No especificado'}</p>
                    <p><span className="font-medium">Descripción:</span> {selectedItem.producto.descripcion || 'No disponible'}</p>
                    <p><span className="font-medium">Precio de Compra:</span> ${parseFloat(selectedItem.producto.precioCompra).toFixed(2)}</p>
                    <p><span className="font-medium">Capacidad de Presentación:</span> {selectedItem.producto.capacidadPresentacion || 'No especificada'}</p>
                    {selectedItem.producto.vidaUtilPromedioPorUsos && (
                      <p><span className="font-medium">Vida Útil Promedio por Usos:</span> {selectedItem.producto.vidaUtilPromedioPorUsos} usos</p>
                    )}
                    <p><span className="font-medium">Categoría:</span> {selectedItem.producto.categoria?.nombre || 'No especificada'}</p>
                    <p><span className="font-medium">Unidad de Medida:</span> {selectedItem.producto.unidadMedida?.nombre || 'No especificada'}</p>
                  </div>
                </div>

                {/* Información del Lote */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">Información del Lote</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Fecha de Ingreso:</span> {new Date(selectedItem.fechaIngreso).toLocaleDateString()}</p>
                    <p><span className="font-medium">Fecha de Vencimiento:</span> {selectedItem.fechaVencimiento ? new Date(selectedItem.fechaVencimiento).toLocaleDateString() : 'No especificada'}</p>
                    <p><span className="font-medium">Nombre de Bodega:</span> {selectedItem.bodega.nombre}</p>
                    <p><span className="font-medium">Número de Bodega:</span> {selectedItem.bodega.numero || 'No especificado'}</p>
                  </div>
                </div>
              </div>

              {/* Imagen del producto y stock - Lado derecho */}
              <div className="flex-shrink-0 flex flex-col items-center lg:items-start space-y-4 w-full max-w-md">
                {/* Imagen del producto - Más grande */}
                <div className="flex justify-center w-full">
                  {selectedItem.producto.imgUrl ? (
                    (() => {
                      const imageUrl = `${import.meta.env.VITE_API_URL}${selectedItem.producto.imgUrl}`;
                      console.log('DEBUG: Product image URL:', imageUrl);
                      console.log('DEBUG: VITE_API_URL:', import.meta.env.VITE_API_URL);
                      console.log('DEBUG: imgUrl from data:', selectedItem.producto.imgUrl);
                      return (
                        <img
                          src={imageUrl}
                          alt={selectedItem.producto.nombre}
                          className="w-full h-auto max-h-80 object-contain rounded-lg shadow-md"
                          onError={(e) => {
                            console.error('DEBUG: Image failed to load:', imageUrl);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      );
                    })()
                  ) : (
                    <div className="w-full h-80 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500">Sin imagen</span>
                    </div>
                  )}
                </div>

                {/* Información de stock - Layout horizontal optimizado */}
                <div className="bg-gray-50 p-4 rounded-lg w-full">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">Información del Stock</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Stock</div>
                      <div className="text-lg font-bold text-blue-600">{selectedItem.stock || '0.00'}</div>
                      <div className="text-xs text-gray-500">{selectedItem.unidadAbreviatura || ''}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Total Disp.</div>
                      <div className="text-lg font-bold text-purple-600">{selectedItem.stockTotal?.toFixed(2) || '0.00'}</div>
                      <div className="text-xs text-gray-500">{selectedItem.unidadAbreviatura || ''}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Disponible</div>
                      <div className="text-lg font-bold text-primary-600">{selectedItem.cantidadDisponibleParaReservar?.toFixed(2) || '0.00'}</div>
                      <div className="text-xs text-gray-500">{selectedItem.unidadAbreviatura || ''}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600 mb-1">Reservado</div>
                      <div className="text-lg font-bold text-orange-600">{selectedItem.cantidadReservada?.toFixed(2) || '0.00'}</div>
                      <div className="text-xs text-gray-500">{selectedItem.unidadAbreviatura || ''}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default InventoryPage;