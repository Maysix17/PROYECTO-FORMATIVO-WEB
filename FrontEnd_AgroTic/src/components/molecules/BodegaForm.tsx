import React, { useState, useEffect } from 'react';
import CustomButton from '../atoms/Boton';
import type { BodegaData } from '../../types/bodega.types';
import { registerBodega, updateBodega, getBodegas } from '../../services/bodegaService';
import { usePermission } from '../../contexts/PermissionContext';

interface BodegaFormProps {
  editId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BodegaForm: React.FC<BodegaFormProps> = ({ editId, onSuccess, onCancel }) => {
  const { hasPermission } = usePermission();
  const [bodegaData, setBodegaData] = useState<BodegaData>({
    numero: '',
    nombre: '',
  });
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (editId) {
      // Fetch the existing data for editing
      const fetchBodega = async () => {
        try {
          console.log('Fetching bodegas for editId:', editId);
          const bodegas = await getBodegas();
          console.log('Fetched bodegas:', bodegas);
          const bodega = bodegas.find(b => b.id === editId);
          console.log('Found bodega:', bodega);
          if (bodega) {
            setBodegaData({ numero: bodega.numero, nombre: bodega.nombre });
            console.log('Set bodega data:', { numero: bodega.numero, nombre: bodega.nombre });
          } else {
            setMessage('Bodega no encontrada');
          }
        } catch (error) {
          console.error('Error fetching bodega for edit:', error);
          setMessage('Error al cargar datos para editar');
        }
      };
      fetchBodega();
    } else {
      setBodegaData({ numero: '', nombre: '' });
    }
  }, [editId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Submitting bodega form:', { editId, bodegaData });
      if (editId) {
        console.log('Updating bodega:', editId, bodegaData);
        const result = await updateBodega(editId, bodegaData);
        console.log('Update result:', result);
        setMessage('Actualizado con éxito');
      } else {
        console.log('Creating bodega:', bodegaData);
        await registerBodega(bodegaData);
        setMessage('Registro exitoso');
      }
      setBodegaData({ numero: '', nombre: '' });
      console.log('Calling onSuccess');
      onSuccess?.();
    } catch (error: any) {
      console.error('Error in BodegaForm:', error);
      const errorMessage = error.response?.data?.message ||
                          error.message ||
                          'Error en la operación';
      setMessage(errorMessage);
    }
  };

  const handleCancel = () => {
    setBodegaData({ numero: '', nombre: '' });
    onCancel?.();
    setMessage('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Número</label>
        <input
          type="text"
          value={bodegaData.numero}
          onChange={(e) =>
            setBodegaData({ ...bodegaData, numero: e.target.value })
          }
          placeholder="Ingrese el número de la bodega"
          className="w-full border border-gray-300 rounded-lg p-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Nombre</label>
        <input
          type="text"
          value={bodegaData.nombre}
          onChange={(e) =>
            setBodegaData({ ...bodegaData, nombre: e.target.value })
          }
          placeholder="Ingrese el nombre de la bodega"
          className="w-full border border-gray-300 rounded-lg p-2"
          required
        />
      </div>

      {message && <p className="text-center text-primary-600">{message}</p>}

      <div className="flex gap-2">
        {(editId ? hasPermission('Inventario', 'inventario', 'actualizar') : hasPermission('Inventario', 'inventario', 'crear')) && (
          <CustomButton
            type="submit"
            text={editId ? 'Actualizar Bodega' : 'Registrar Bodega'}
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

export default BodegaForm;