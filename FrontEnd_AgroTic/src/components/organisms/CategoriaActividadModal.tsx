import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import CategoriaActividadForm from '../molecules/CategoriaActividadForm';
import type { CategoriaActividadData } from '../../services/categoriaActividadService';
import {
  getCategoriaActividades,
  deleteCategoriaActividad,
} from '../../services/categoriaActividadService';
import Table from '../atoms/Table';
import CustomButton from '../atoms/Boton';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { usePermission } from '../../contexts/PermissionContext';
import Swal from 'sweetalert2';

interface CategoriaActividadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CategoriaActividadModal: React.FC<CategoriaActividadModalProps> = ({ isOpen, onClose }) => {
  const [categorias, setCategorias] = useState<CategoriaActividadData[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const { hasPermission, isInitializing } = usePermission();

  useEffect(() => {
    if (isOpen) {
      fetchCategorias();
    }
  }, [isOpen]);

  const fetchCategorias = async () => {
    try {
      const data = await getCategoriaActividades();
      setCategorias(data);
    } catch (err) {
      console.error('Error fetching categorias:', err);
    }
  };

  const handleEdit = (categoria: CategoriaActividadData) => {
    setEditId(categoria.id!);
    // Note: The form will handle the edit logic
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategoriaActividad(id);
      fetchCategorias();
      await Swal.fire({
        title: 'Éxito',
        text: 'Categoría de actividad eliminada correctamente.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err: any) {
      console.error('Error deleting categoria:', err);
      const errorMessage = err.response?.data?.message ||
                          err.message ||
                          'Error al eliminar la categoría de actividad.';
      await Swal.fire({
        title: 'Error',
        text: errorMessage,
        icon: 'error',
        showConfirmButton: true
      });
    }
  };

  const headers = ['Nombre', 'Acciones'];

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="3xl">
      <ModalContent className="bg-white p-6">
        <ModalHeader>
          <h2 className="text-xl font-semibold">Gestionar Categorías de Actividad</h2>
        </ModalHeader>
        <ModalBody className="max-h-[70vh] overflow-y-auto">
          <CategoriaActividadForm
            editId={editId}
            onSuccess={() => { fetchCategorias(); setEditId(null); }}
            onCancel={() => setEditId(null)}
          />
          {message && <p className="text-center text-green-600 mt-4">{message}</p>}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Lista de Categorías de Actividad</h3>
            <div className="overflow-x-auto">
              <Table headers={headers}>
                {categorias.map((categoria) => (
                  <tr key={categoria.id}>
                    <td className="px-4 py-2 border-b">{categoria.nombre}</td>
                    <td className="px-4 py-2 border-b">
                      <div className="flex gap-1">
                        {!isInitializing && hasPermission('Cultivos', 'cultivos', 'actualizar') && (
                          <CustomButton
                            icon={<PencilIcon className="w-4 h-4" />}
                            tooltip="Editar"
                            onClick={() => handleEdit(categoria)}
                            color="secondary"
                            variant="light"
                            size="sm"
                          />
                        )}
                        {!isInitializing && hasPermission('Cultivos', 'cultivos', 'eliminar') && (
                          <CustomButton
                            icon={<TrashIcon className="w-4 h-4" />}
                            tooltip="Eliminar"
                            onClick={() => handleDelete(categoria.id!)}
                            color="danger"
                            variant="light"
                            size="sm"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CategoriaActividadModal;