import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, Button, Tabs, Tab } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import ImageUpload from '../atoms/ImagenUpload';
import Swal from 'sweetalert2';
import { inventoryService } from '../../services/inventoryService';
import type { Categoria, Bodega, InventoryItem } from '../../services/inventoryService';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInventoryCreated: () => void;
  editItem?: InventoryItem | null;
}

const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, onClose, onInventoryCreated, editItem }) => {
   const [activeTab, setActiveTab] = useState('lote');

   // Form data for product
   const [productFormData, setProductFormData] = useState({
     nombre: '',
     descripcion: '',
     precioCompra: '',
     precioVenta: '',
     sku: '',
     capacidadPresentacion: '',
     fkCategoriaId: '',
     fkUnidadMedidaId: '',
   });

   // Form data for warehouse
   const [warehouseFormData, setWarehouseFormData] = useState({
     numero: '',
     nombre: '',
   });

   // Form data for lote
   const [loteFormData, setLoteFormData] = useState({
     fkProductoId: '',
     fkBodegaId: '',
     stock: '',
     fechaVencimiento: '',
   });

   const [selectedFile, setSelectedFile] = useState<File | null>(null);
   const [categorias, setCategorias] = useState<Categoria[]>([]);
   const [bodegas, setBodegas] = useState<Bodega[]>([]);
   const [productos, setProductos] = useState<any[]>([]);
   const [unidadesMedida, setUnidadesMedida] = useState<any[]>([]);
   const [isLoading, setIsLoading] = useState(false);
   const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
      if (isOpen) {
        fetchCategorias();
        fetchBodegas();
        fetchProductos();
        fetchUnidadesMedida();
        if (editItem) {
          // Populate form data for editing
          setProductFormData({
            nombre: (editItem as any).producto?.nombre || '',
            descripcion: (editItem as any).producto?.descripcion || '',
            precioCompra: (editItem as any).producto?.precioCompra?.toString() || '',
            precioVenta: (editItem as any).producto?.precioVenta?.toString() || '',
            sku: (editItem as any).producto?.sku || '',
            capacidadPresentacion: (editItem as any).producto?.capacidadPresentacion?.toString() || '',
            fkCategoriaId: (editItem as any).producto?.categoria?.id || '',
            fkUnidadMedidaId: (editItem as any).producto?.unidadMedida?.id || '',
          });
          setWarehouseFormData({
            numero: (editItem as any).bodega?.numero || '',
            nombre: (editItem as any).bodega?.nombre || '',
          });
          setLoteFormData({
            fkProductoId: (editItem as any).producto?.id || '',
            fkBodegaId: (editItem as any).bodega?.id || '',
            stock: (editItem as any).cantidadDisponible || '',
            fechaVencimiento: (editItem as any).fechaVencimiento ? new Date((editItem as any).fechaVencimiento).toISOString().split('T')[0] : '',
          });
          setSelectedFile(null);
        } else {
          setProductFormData({
            nombre: '',
            descripcion: '',
            precioCompra: '',
            precioVenta: '',
            sku: '',
            capacidadPresentacion: '',
            fkCategoriaId: '',
            fkUnidadMedidaId: '',
          });
          setWarehouseFormData({
            numero: '',
            nombre: '',
          });
          setLoteFormData({
            fkProductoId: '',
            fkBodegaId: '',
            stock: '',
            fechaVencimiento: '',
          });
          setSelectedFile(null);
        }
      }
    }, [isOpen, editItem]);

  const fetchCategorias = async () => {
    try {
      const data = await inventoryService.getCategorias();
      setCategorias(data);
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  };

  const fetchBodegas = async () => {
    try {
      const data = await inventoryService.getBodegas();
      setBodegas(data);
    } catch (error) {
      console.error('Error fetching bodegas:', error);
    }
  };

  const fetchProductos = async () => {
    try {
      const data = await inventoryService.getProductos();
      setProductos(data);
    } catch (error) {
      console.error('Error fetching productos:', error);
    }
  };

  const fetchUnidadesMedida = async () => {
    try {
      const data = await inventoryService.getUnidadesMedida();
      setUnidadesMedida(data);
    } catch (error) {
      console.error('Error fetching unidades medida:', error);
    }
  };

  const handleProductInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProductFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWarehouseInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setWarehouseFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLoteInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLoteFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      if (editItem) {
        // Update existing lote
        const loteData = {
          fkProductoId: loteFormData.fkProductoId,
          fkBodegaId: loteFormData.fkBodegaId,
          stock: parseFloat(loteFormData.stock),
          fechaVencimiento: loteFormData.fechaVencimiento || undefined,
        };
        await inventoryService.updateLote((editItem as any).id, loteData);

        Swal.fire({
          icon: 'success',
          title: 'Lote actualizado',
          text: 'El lote de inventario ha sido actualizado exitosamente.',
          confirmButtonText: 'Aceptar',
        });
      } else {
        // Create product first if needed
        let productId = loteFormData.fkProductoId;
        if (!productId && productFormData.nombre) {
          // Create product
          const productData = {
            nombre: productFormData.nombre,
            descripcion: productFormData.descripcion,
            precioCompra: parseFloat(productFormData.precioCompra),
            precioVenta: parseFloat(productFormData.precioVenta),
            sku: productFormData.sku,
            capacidadPresentacion: parseFloat(productFormData.capacidadPresentacion),
            fkCategoriaId: productFormData.fkCategoriaId,
            fkUnidadMedidaId: productFormData.fkUnidadMedidaId,
            imgUrl: selectedFile || undefined,
          };
          const createdProduct = await inventoryService.createProduct(productData);
          productId = createdProduct.id;
        }

        // Create warehouse if needed
        let warehouseId = loteFormData.fkBodegaId;
        if (!warehouseId && warehouseFormData.nombre) {
          // Create warehouse
          const warehouseData = {
            numero: warehouseFormData.numero,
            nombre: warehouseFormData.nombre,
          };
          const createdWarehouse = await inventoryService.createWarehouse(warehouseData);
          warehouseId = createdWarehouse.id;
        }

        // Create lote
        const loteData = {
          fkProductoId: productId,
          fkBodegaId: warehouseId,
          stock: parseFloat(loteFormData.stock),
          fechaVencimiento: loteFormData.fechaVencimiento || undefined,
        };

        await inventoryService.createLote(loteData);

        Swal.fire({
          icon: 'success',
          title: 'Lote creado',
          text: 'El lote de inventario ha sido registrado exitosamente.',
          confirmButtonText: 'Aceptar',
        });
      }

      onInventoryCreated();
      onClose();
      // Reset forms
      setProductFormData({
        nombre: '',
        descripcion: '',
        precioCompra: '',
        precioVenta: '',
        sku: '',
        capacidadPresentacion: '',
        fkCategoriaId: '',
        fkUnidadMedidaId: '',
      });
      setWarehouseFormData({
        numero: '',
        nombre: '',
      });
      setLoteFormData({
        fkProductoId: '',
        fkBodegaId: '',
        stock: '',
        fechaVencimiento: '',
      });
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Error creating/updating inventory:', error);
      setErrors({ general: 'Error al crear/actualizar el inventario.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="4xl">
      <ModalContent className="bg-white p-6">
        <h2 className="text-2xl font-bold mb-4">{editItem ? 'Editar Lote de Inventario' : 'Registrar Nuevo Lote de Inventario'}</h2>
        <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
          <Tab key="product" title="Producto">
            <form className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    value={productFormData.nombre}
                    onChange={handleProductInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    name="sku"
                    value={productFormData.sku}
                    onChange={handleProductInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Compra</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="precioCompra"
                    value={productFormData.precioCompra}
                    onChange={handleProductInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="precioVenta"
                    value={productFormData.precioVenta}
                    onChange={handleProductInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  name="descripcion"
                  value={productFormData.descripcion}
                  onChange={handleProductInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    name="fkCategoriaId"
                    value={productFormData.fkCategoriaId}
                    onChange={handleProductInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    {categorias.map(categoria => (
                      <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad de Medida</label>
                  <select
                    name="fkUnidadMedidaId"
                    value={productFormData.fkUnidadMedidaId}
                    onChange={handleProductInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar unidad de medida</option>
                    {unidadesMedida.map(unidad => (
                      <option key={unidad.id} value={unidad.id}>{unidad.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad de Presentación</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="capacidadPresentacion"
                    value={productFormData.capacidadPresentacion}
                    onChange={handleProductInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Imagen</label>
                  <ImageUpload onFileSelect={handleFileSelect} />
                </div>
              </div>
            </form>
          </Tab>
          <Tab key="warehouse" title="Bodega">
            <form className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                  <input
                    type="text"
                    name="numero"
                    value={warehouseFormData.numero}
                    onChange={handleWarehouseInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    value={warehouseFormData.nombre}
                    onChange={handleWarehouseInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </form>
          </Tab>
          <Tab key="lote" title="Lote">
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                  <select
                    name="fkProductoId"
                    value={loteFormData.fkProductoId}
                    onChange={handleLoteInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar producto</option>
                    {productos.map(producto => (
                      <option key={producto.id} value={producto.id}>{producto.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bodega</label>
                  <select
                    name="fkBodegaId"
                    value={loteFormData.fkBodegaId}
                    onChange={handleLoteInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Seleccionar bodega</option>
                    {bodegas.map(bodega => (
                      <option key={bodega.id} value={bodega.id}>{bodega.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="stock"
                    value={loteFormData.stock}
                    onChange={handleLoteInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
                <input
                  type="date"
                  name="fechaVencimiento"
                  value={loteFormData.fechaVencimiento}
                  onChange={handleLoteInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {errors.general && <p className="text-red-500 text-sm">{errors.general}</p>}
              <div className="flex justify-end space-x-2">
                <Button onClick={onClose} variant="light">Cancelar</Button>
                <CustomButton
                  text={isLoading ? (editItem ? 'Actualizando...' : 'Creando...') : (editItem ? 'Actualizar Lote' : 'Crear Lote')}
                  type="submit"
                  disabled={isLoading}
                />
              </div>
            </form>
          </Tab>
        </Tabs>
      </ModalContent>
    </Modal>
  );
};

export default InventoryModal;