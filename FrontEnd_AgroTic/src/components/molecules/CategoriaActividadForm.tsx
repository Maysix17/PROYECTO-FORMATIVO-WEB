import React, { useState, useEffect } from 'react';
import CustomButton from '../atoms/Boton';
import { getCategoriaActividades, createCategoriaActividad, updateCategoriaActividad } from '../../services/categoriaActividadService';
import { usePermission } from '../../contexts/PermissionContext';

interface CategoriaActividadFormProps {
  editId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CategoriaActividadForm: React.FC<CategoriaActividadFormProps> = ({ editId, onSuccess, onCancel }) => {
  const [categoriaData, setCategoriaData] = useState<{ nombre: string }>({
    nombre: '',
  });
  const [message, setMessage] = useState<string>('');
  const { hasPermission, isInitializing } = usePermission();

  useEffect(() => {
    if (editId) {
      // Fetch the existing data for editing
      const fetchCategoria = async () => {
        try {
          const categorias = await getCategoriaActividades();
          const categoria = categorias.find((c: any) => c.id === editId);
          if (categoria) {
            setCategoriaData({
              nombre: categoria.nombre,
            });
          }
        } catch (error) {
          setMessage('Error al cargar datos para editar');
        }
      };
      fetchCategoria();
    } else {
      setCategoriaData({ nombre: '' });
    }
  }, [editId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateCategoriaActividad(editId, categoriaData);
        setMessage('Actualizado con éxito');
      } else {
        await createCategoriaActividad(categoriaData);
        setMessage('Registro exitoso');
      }
      setCategoriaData({ nombre: '' });
      onSuccess?.();
    } catch (error: any) {
      setMessage(error.message || 'Error en la operación');
    }
  };

  const handleCancel = () => {
    setCategoriaData({ nombre: '' });
    onCancel?.();
    setMessage('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Nombre de la Categoría</label>
        <input
          type="text"
          value={categoriaData.nombre}
          onChange={(e) =>
            setCategoriaData({ ...categoriaData, nombre: e.target.value })
          }
          placeholder="Ingrese el nombre de la categoría de actividad"
          className="w-full border border-gray-300 rounded-lg p-2"
          required
        />
      </div>

      {message && <p className="text-center text-primary-600">{message}</p>}

      <div className="flex gap-2">
        {!isInitializing && (hasPermission('Cultivos', 'cultivos', 'crear') || hasPermission('Actividades', 'actividades', 'crear')) && (
          <CustomButton
            type="submit"
            text={editId ? 'Actualizar Categoría' : 'Registrar Categoría'}
            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 flex-1"
          />
        )}
        {editId && (
          <CustomButton
            type="button"
            text="Cancelar"
            onClick={handleCancel}
            className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3"
            variant="solid"
          />
        )}
      </div>
    </form>
  );
};

export default CategoriaActividadForm;