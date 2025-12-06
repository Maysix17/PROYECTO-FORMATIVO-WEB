import React, { useState, useEffect } from 'react';
import CustomButton from '../atoms/Boton';
import type { TipoCultivoData } from '../../types/tipoCultivo.types';
import { registerTipoCultivo, updateTipoCultivo, getTipoCultivos } from '../../services/tipoCultivo';
import { usePermission } from '../../contexts/PermissionContext';

interface TipoCultivoFormProps {
  editId?: string | null;
  onSuccess?: () => void;
}

const TipoCultivoForm: React.FC<TipoCultivoFormProps> = ({ editId, onSuccess }) => {
  const [tipoCultivoData, setTipoCultivoData] = useState<TipoCultivoData>({
    nombre: '',
    esPerenne: false,
  });
  const [message, setMessage] = useState<string>('');
  const { hasPermission, isInitializing } = usePermission();

  useEffect(() => {
    if (editId) {
      // Fetch the existing data for editing
      const fetchTipoCultivo = async () => {
        try {
          const tipos = await getTipoCultivos();
          const tipo = tipos.find(t => t.id === editId);
          if (tipo) {
            setTipoCultivoData({ nombre: tipo.nombre, esPerenne: tipo.esPerenne || false });
          }
        } catch (error) {
          setMessage('Error al cargar datos para editar');
        }
      };
      fetchTipoCultivo();
    } else {
      setTipoCultivoData({ nombre: '', esPerenne: false });
    }
  }, [editId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateTipoCultivo(editId, tipoCultivoData);
        setMessage('Actualizado con éxito');
      } else {
        await registerTipoCultivo(tipoCultivoData);
        setMessage('Registro exitoso');
      }
      setTipoCultivoData({ nombre: '', esPerenne: false });
      onSuccess?.();
    } catch (error: any) {
      setMessage(error.message || 'Error en la operación');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium mb-1">Nombre</label>
        <input
          type="text"
          value={tipoCultivoData.nombre}
          onChange={(e) =>
            setTipoCultivoData({ ...tipoCultivoData, nombre: e.target.value })
          }
          placeholder="Ingrese el nombre del tipo de cultivo"
          className="w-full border border-gray-300 rounded-lg p-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Clasificación del Cultivo</label>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="radio"
              id="perenne"
              name="clasificacion"
              checked={tipoCultivoData.esPerenne === true}
              onChange={() =>
                setTipoCultivoData({ ...tipoCultivoData, esPerenne: true })
              }
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500"
            />
            <label htmlFor="perenne" className="ml-2 text-sm text-gray-700">
              Perenne - Cultivos que viven más de una temporada (árboles frutales, café, etc.)
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="transitorio"
              name="clasificacion"
              checked={tipoCultivoData.esPerenne === false}
              onChange={() =>
                setTipoCultivoData({ ...tipoCultivoData, esPerenne: false })
              }
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500"
            />
            <label htmlFor="transitorio" className="ml-2 text-sm text-gray-700">
              Transitorio - Cultivos que completan su ciclo en una temporada (maíz, arroz, etc.)
            </label>
          </div>
        </div>
      </div>

      {message && <p className="text-center text-primary-600">{message}</p>}

      {!isInitializing && hasPermission('Cultivos', 'cultivos', 'crear') && (
        <CustomButton
          type="submit"
          text={editId ? 'Actualizar Tipo de Cultivo' : 'Registrar Tipo de Cultivo'}
          className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 w-full"
        />
      )}
    </form>
  );
};

export default TipoCultivoForm;