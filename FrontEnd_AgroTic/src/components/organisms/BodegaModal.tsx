import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import BodegaForm from '../molecules/BodegaForm';
import type { BodegaData } from '../../types/bodega.types';
import {
  getBodegas,
  deleteBodega,
} from '../../services/bodegaService';
import Table from '../atoms/Table';
import CustomButton from '../atoms/Boton';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { usePermission } from '../../contexts/PermissionContext';

interface BodegaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BodegaModal: React.FC<BodegaModalProps> = ({ isOpen, onClose }) => {
  const { hasPermission } = usePermission();
  const [bodegas, setBodegas] = useState<BodegaData[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchBodegas();
    }
  }, [isOpen]);

  const fetchBodegas = async () => {
    try {
      const data = await getBodegas();
      setBodegas(data);
    } catch (err) {
      console.error('Error fetching bodegas:', err);
      // Optionally show error message to user
      setMessage('Error al cargar la lista de bodegas');
    }
  };

  const handleEdit = (bodega: BodegaData) => {
    setEditId(bodega.id!);
    // Note: The form will handle the edit logic
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBodega(id);
      fetchBodegas();
      setMessage('Eliminado con éxito');
    } catch (err) {
      setMessage('Error al eliminar');
    }
  };

  const headers = ['Número', 'Nombre', 'Acciones'];

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="4xl">
      <ModalContent className="bg-white p-6">
        <ModalHeader>
          <h2 className="text-xl font-semibold">Gestionar Bodegas</h2>
        </ModalHeader>
        <ModalBody>
          <BodegaForm
            editId={editId}
            onSuccess={() => { fetchBodegas(); setEditId(null); }}
            onCancel={() => setEditId(null)}
          />
          {message && <p className="text-center text-green-600 mt-4">{message}</p>}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Lista de Bodegas</h3>
            <Table headers={headers}>
              {bodegas.map((bodega) => (
                <tr key={bodega.id}>
                  <td className="px-4 py-2 border-b">{bodega.numero}</td>
                  <td className="px-4 py-2 border-b">{bodega.nombre}</td>
                  <td className="px-4 py-2 border-b">
                    <div className="flex gap-1">
                      {hasPermission('Inventario', 'inventario', 'actualizar') && (
                        <CustomButton
                          icon={<PencilIcon className="w-4 h-4" />}
                          tooltip="Editar"
                          onClick={() => handleEdit(bodega)}
                          color="secondary"
                          variant="light"
                          size="sm"
                        />
                      )}
                      {hasPermission('Inventario', 'inventario', 'eliminar') && (
                        <CustomButton
                          icon={<TrashIcon className="w-4 h-4" />}
                          tooltip="Eliminar"
                          onClick={() => handleDelete(bodega.id!)}
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
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default BodegaModal;