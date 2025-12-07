import React, { useState, useEffect } from 'react';
import { Modal, ModalContent } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import ImageUpload from '../atoms/ImagenUpload';
import Swal from 'sweetalert2';
import { inventoryService } from '../../services/inventoryService';
import type { Categoria, Bodega } from '../../services/inventoryService';

interface UnifiedProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: () => void;
  editItem?: any;
}

const UnifiedProductModal: React.FC<UnifiedProductModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  editItem,
}) => {
  const [formData, setFormData] = useState({
    // Product fields
    nombre: '',
    descripcion: '',
    sku: '',
    precioCompra: '',
    capacidadPresentacion: '',
    fkCategoriaId: '',
    fkUnidadMedidaId: '',
    vidaUtilPromedioPorUsos: '',
    // Lot inventory fields
    fkBodegaId: '',
    stock: '',
    fechaVencimiento: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [bodegas, setBodegas] = useState<Bodega[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchCategorias();
      fetchBodegas();
      fetchUnidadesMedida();
      if (editItem) {
        populateFormWithEditData();
      } else {
        resetForm();
      }
    }
  }, [isOpen, editItem]);

  useEffect(() => {
    console.log('DEBUG: formData updated:', formData);
  }, [formData]);

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      sku: '',
      precioCompra: '',
      capacidadPresentacion: '',
      fkCategoriaId: '',
      fkUnidadMedidaId: '',
      vidaUtilPromedioPorUsos: '',
      fkBodegaId: '',
      stock: '',
      fechaVencimiento: '',
    });
    setSelectedFile(null);
    setErrors({});
  };

  const populateFormWithEditData = () => {
    if (editItem) {
      console.log('DEBUG: populateFormWithEditData - editItem:', editItem);
      console.log('DEBUG: editItem.producto:', editItem.producto);
      console.log('DEBUG: editItem.bodega:', editItem.bodega);
      setFormData({
        nombre: editItem.producto?.nombre || '',
        descripcion: editItem.producto?.descripcion || '',
        sku: editItem.producto?.sku || '',
        precioCompra: editItem.producto?.precioCompra || '',
        capacidadPresentacion: editItem.producto?.capacidadPresentacion || '',
        fkCategoriaId: editItem.producto?.categoria?.id || '',
        fkUnidadMedidaId: editItem.producto?.unidadMedida?.id || '',
        vidaUtilPromedioPorUsos: editItem.producto?.vidaUtilPromedioPorUsos?.toString() || '',
        fkBodegaId: editItem.bodega?.id || '',
        stock: editItem.stock?.toString() || '',
        fechaVencimiento: editItem.fechaVencimiento ? new Date(editItem.fechaVencimiento).toISOString().split('T')[0] : '',
      });
      console.log('DEBUG: populated formData:', {
        nombre: editItem.producto?.nombre || '',
        descripcion: editItem.producto?.descripcion || '',
        sku: editItem.producto?.sku || '',
        precioCompra: editItem.producto?.precioCompra || '',
        capacidadPresentacion: editItem.producto?.capacidadPresentacion || '',
        fkCategoriaId: editItem.producto?.categoria?.id || '',
        fkUnidadMedidaId: editItem.producto?.unidadMedida?.id || '',
        vidaUtilPromedioPorUsos: editItem.producto?.vidaUtilPromedioPorUsos?.toString() || '',
        fkBodegaId: editItem.bodega?.id || '',
        stock: editItem.stock?.toString() || '',
        fechaVencimiento: editItem.fechaVencimiento ? new Date(editItem.fechaVencimiento).toISOString().split('T')[0] : '',
      });
      setSelectedFile(null);
      setErrors({});
    }
  };

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

  const fetchUnidadesMedida = async () => {
    try {
      const data = await inventoryService.getUnidadesMedida();
      setUnidadesMedida(data);
    } catch (error) {
      console.error('Error fetching unidades medida:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log('DEBUG: handleInputChange - name:', name, 'value:', value);
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      console.log('DEBUG: setting new formData:', newData);
      return newData;
    });
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    console.log('DEBUG: handleSubmit called');
    console.log('DEBUG: editItem:', editItem);
    console.log('DEBUG: formData:', formData);

    try {
      const data = {
        nombre: formData.nombre,
        descripcion: formData.descripcion || undefined,
        sku: formData.sku || undefined,
        precioCompra: parseFloat(formData.precioCompra),
        capacidadPresentacion: parseFloat(formData.capacidadPresentacion),
        fkCategoriaId: formData.fkCategoriaId || undefined,
        fkUnidadMedidaId: formData.fkUnidadMedidaId || undefined,
        vidaUtilPromedioPorUsos: formData.vidaUtilPromedioPorUsos ? parseInt(formData.vidaUtilPromedioPorUsos) : undefined,
        fkBodegaId: formData.fkBodegaId,
        stock: parseFloat(formData.stock),
        fechaVencimiento: formData.fechaVencimiento || undefined,
        imgUrl: selectedFile || undefined,
      };

      console.log('DEBUG: editItem:', editItem);
      console.log('DEBUG: data to send:', data);

      if (editItem) {
        // Handle image upload first if a new file is selected
        let imgUrl: string | undefined = undefined;
        if (selectedFile && selectedFile instanceof File) {
          console.log('DEBUG: Uploading new image');
          const uploadResponse = await inventoryService.uploadProductImage(selectedFile);
          imgUrl = uploadResponse.url;
          console.log('DEBUG: Image uploaded, URL:', imgUrl);

          // Update product with new image URL
          console.log('DEBUG: Updating product image');
          await inventoryService.updateProduct(editItem.producto.id, { imgUrl });
          console.log('DEBUG: Product image updated');
        }

        // Update lote (which can update both product and lote data)
        console.log('DEBUG: Updating lote with ID:', editItem.id);
        const updateData = {
          nombre: data.nombre,
          descripcion: data.descripcion,
          sku: data.sku,
          precioCompra: data.precioCompra,
          capacidadPresentacion: data.capacidadPresentacion,
          fkCategoriaId: data.fkCategoriaId,
          fkUnidadMedidaId: data.fkUnidadMedidaId,
          vidaUtilPromedioPorUsos: data.vidaUtilPromedioPorUsos,
          fkBodegaId: data.fkBodegaId,
          stock: data.stock,
          fechaVencimiento: data.fechaVencimiento || null,
        };
        console.log('DEBUG: Update data to send:', updateData);
        console.log('DEBUG: fkBodegaId being sent:', data.fkBodegaId);
        const response = await inventoryService.updateLote(editItem.id, updateData);
        console.log('DEBUG: Update response:', response);

        // Refresh data without full page reload
        onProductCreated();
      } else {
        // Create new item
        console.log('DEBUG: Creating new item');
        await inventoryService.createProductoWithLote(data);
        Swal.fire({
          icon: 'success',
          title: 'Producto registrado',
          text: 'El producto y su lote de inventario han sido registrados exitosamente.',
          confirmButtonText: 'Aceptar',
        });
      }

      onProductCreated();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error saving product:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      setErrors({ general: 'Error al guardar el producto.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="3xl">
      <ModalContent className="bg-white p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{editItem ? 'Editar Producto' : 'Registrar Nuevo Producto'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">Información del Producto</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código (SKU)</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                type="text"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Compra *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="precioCompra"
                  value={formData.precioCompra}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacidad de Presentación *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="capacidadPresentacion"
                  value={formData.capacidadPresentacion}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  name="fkCategoriaId"
                  value={formData.fkCategoriaId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                  value={formData.fkUnidadMedidaId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Seleccionar unidad de medida</option>
                  {unidadesMedida.map(unidad => (
                    <option key={unidad.id} value={unidad.id}>{unidad.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Campo condicional para productos no divisibles */}
            {(() => {
              const selectedCategoria = categorias.find(cat => cat.id === formData.fkCategoriaId);
              const esDivisible = selectedCategoria?.esDivisible ?? true;
              if (!esDivisible) {
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vida Útil Promedio por Usos *
                      <span className="block text-xs text-gray-500 mt-1">
                        ¿Cuántas veces crees que puedes usar este producto antes de que ya no sirva? Ejemplo: 1.200 usos ≈ 4 años si se usa 300 veces al año.
                      </span>
                    </label>
                    <input
                      type="number"
                      name="vidaUtilPromedioPorUsos"
                      value={formData.vidaUtilPromedioPorUsos}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Ej: 1200"
                      min="0"
                      required={!esDivisible}
                    />
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Lot Inventory Information */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">Información del Lote de Inventario</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bodega *</label>
                <select
                  name="fkBodegaId"
                  value={formData.fkBodegaId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                >
                  <option value="">Seleccionar bodega</option>
                  {bodegas.map(bodega => (
                    <option key={bodega.id} value={bodega.id}>{bodega.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
              <input
                type="date"
                name="fechaVencimiento"
                value={formData.fechaVencimiento}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Image Upload - Last */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-800">Imagen del Producto</h3>
            <div>
              {editItem?.producto?.imgUrl && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Imagen actual:</p>
                  <img
                    src={`${import.meta.env.VITE_API_URL}${editItem.producto.imgUrl}`}
                    alt="Imagen actual del producto"
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                </div>
              )}
              <ImageUpload onFileSelect={handleFileSelect} />
            </div>
          </div>

          {errors.general && <p className="text-red-500 text-sm">{errors.general}</p>}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <CustomButton onClick={onClose} variant="light" label="Cancelar" />
            <CustomButton
              label={isLoading ? (editItem ? 'Actualizando...' : 'Registrando...') : (editItem ? 'Actualizar Producto' : 'Registrar Producto')}
              type="submit"
              disabled={isLoading}
            />
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default UnifiedProductModal;