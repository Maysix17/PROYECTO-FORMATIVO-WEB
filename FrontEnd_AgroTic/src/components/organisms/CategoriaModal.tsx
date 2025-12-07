import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import CategoriaForm from '../molecules/CategoriaForm';
import type { CategoriaData } from '../../types/categoria.types';
import {
  getCategorias,
  deleteCategoria,
} from '../../services/categoriaService';
import Table from '../atoms/Table';
import CustomButton from '../atoms/Boton';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { usePermission } from '../../contexts/PermissionContext';

interface CategoriaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CategoriaModal: React.FC<CategoriaModalProps> = ({ isOpen, onClose }) => {
  const { hasPermission } = usePermission();
  const [categorias, setCategorias] = useState<CategoriaData[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchCategorias();
    }
  }, [isOpen]);

  const fetchCategorias = async () => {
    try {
      const data = await getCategorias();
      setCategorias(data);
    } catch (err) {
      console.error('Error fetching categorias:', err);
    }
  };

  const handleEdit = (categoria: CategoriaData) => {
    setEditId(categoria.id!);
    // Note: The form will handle the edit logic
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategoria(id);
      fetchCategorias();
      setMessage('Eliminado con éxito');
    } catch (err) {
      setMessage('Error al eliminar');
    }
  };

  const headers = ['Nombre', 'Descripción', '¿Consumible?', 'Acciones'];

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="3xl">
      <ModalContent className="bg-white p-6">
        <ModalHeader>
          <h2 className="text-xl font-semibold">Gestionar Categorías</h2>
        </ModalHeader>
        <ModalBody className="max-h-[70vh] overflow-y-auto">
          <CategoriaForm
            editId={editId}
            onSuccess={() => { fetchCategorias(); setEditId(null); }}
            onCancel={() => setEditId(null)}
          />
          {message && <p className="text-center text-green-600 mt-4">{message}</p>}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Lista de Categorías</h3>
            <div className="overflow-x-auto">
              <Table headers={headers}>
                {categorias.map((categoria) => (
                  <tr key={categoria.id}>
                    <td className="px-4 py-2 border-b">{categoria.nombre}</td>
                    <td className="px-4 py-2 border-b">{categoria.descripcion || 'Sin descripción'}</td>
                    <td className="px-4 py-2 border-b">{categoria.esDivisible ? 'Sí' : 'No'}</td>
                    <td className="px-4 py-2 border-b">
                      <div className="flex gap-1">
                        {hasPermission('Inventario', 'inventario', 'actualizar') && (
                          <CustomButton
                            icon={<PencilIcon className="w-4 h-4" />}
                            tooltip="Editar"
                            onClick={() => handleEdit(categoria)}
                            color="secondary"
                            variant="light"
                            size="sm"
                          />
                        )}
                        {hasPermission('Inventario', 'inventario', 'eliminar') && (
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

export default CategoriaModal;