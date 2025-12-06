import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import VariedadForm from '../molecules/VariedadForm';
import type { VariedadData } from '../../types/variedad.types';
import {
  getVariedades,
  deleteVariedad,
} from '../../services/variedad';
import Table from '../atoms/Table';
import CustomButton from '../atoms/Boton';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { usePermission } from '../../contexts/PermissionContext';
import Swal from 'sweetalert2';

interface VariedadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VariedadModal: React.FC<VariedadModalProps> = ({ isOpen, onClose }) => {
  const [variedades, setVariedades] = useState<VariedadData[]>([]);
  const [editData, setEditData] = useState<VariedadData | null>(null);
  const [message, setMessage] = useState<string>('');
  const { hasPermission, isInitializing } = usePermission();

  useEffect(() => {
    if (isOpen) {
      fetchVariedades();
    }
  }, [isOpen]);

  const fetchVariedades = async () => {
    try {
      const data = await getVariedades();
      setVariedades(data);
    } catch (err) {
      console.error('Error fetching variedades:', err);
    }
  };

  const handleEdit = (variedad: VariedadData) => {
    setEditData(variedad);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVariedad(id);
      await fetchVariedades();
      // Eliminación exitosa, modal permanece abierto
    } catch (err) {
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo eliminar la variedad.',
        icon: 'error',
        timer: 3000,
        showConfirmButton: false
      });
    }
  };

  const headers = ['Nombre', 'Tipo de Cultivo', 'Acciones'];

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="5xl">
      <ModalContent className="bg-white p-6">
        <ModalHeader>
          <h2 className="text-xl font-semibold">Gestionar Variedades</h2>
        </ModalHeader>
        <ModalBody className="overflow-y-auto max-h-96">
          <VariedadForm editData={editData} onSuccess={() => { fetchVariedades(); setEditData(null); }} />
          {message && <p className="text-center text-green-600 mt-4">{message}</p>}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Lista de Variedades</h3>
            <Table headers={headers}>
              {variedades.map((variedad) => (
                <tr key={variedad.id}>
                  <td className="px-4 py-2 border-b">{variedad.nombre}</td>
                  <td className="px-4 py-2 border-b">{variedad.tipoCultivo?.nombre || 'N/A'}</td>
                  <td className="px-4 py-2 border-b">
                    <div className="flex gap-1">
                      {!isInitializing && hasPermission('Cultivos', 'cultivos', 'actualizar') && (
                        <CustomButton
                          icon={<PencilIcon className="w-4 h-4" />}
                          tooltip="Editar"
                          onClick={() => handleEdit(variedad)}
                          color="secondary"
                          variant="light"
                          size="sm"
                        />
                      )}
                      {!isInitializing && hasPermission('Cultivos', 'cultivos', 'eliminar') && (
                        <CustomButton
                          icon={<TrashIcon className="w-4 h-4" />}
                          tooltip="Eliminar"
                          onClick={() => handleDelete(variedad.id!)}
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

export default VariedadModal;