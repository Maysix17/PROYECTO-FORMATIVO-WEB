import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import TipoCultivoForm from '../molecules/TipoCultivoForm';
import type { TipoCultivoData } from '../../types/tipoCultivo.types';
import {
  getTipoCultivos,
  deleteTipoCultivo,
} from '../../services/tipoCultivo';
import Table from '../atoms/Table';
import CustomButton from '../atoms/Boton';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { usePermission } from '../../contexts/PermissionContext';
import Swal from 'sweetalert2';

interface TipoCultivoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TipoCultivoModal: React.FC<TipoCultivoModalProps> = ({ isOpen, onClose }) => {
  const [cultivos, setCultivos] = useState<TipoCultivoData[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const { hasPermission, isInitializing } = usePermission();

  useEffect(() => {
    if (isOpen) {
      fetchCultivos();
    }
  }, [isOpen]);

  const fetchCultivos = async () => {
    try {
      const data = await getTipoCultivos();
      setCultivos(data);
    } catch (err) {
      console.error('Error fetching cultivos:', err);
    }
  };

  const handleEdit = (cultivo: TipoCultivoData) => {
    setEditId(cultivo.id!);
    // Note: The form will handle the edit logic
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTipoCultivo(id);
      fetchCultivos();
    } catch (err) {
      await Swal.fire({
        title: 'Error',
        text: 'Error al eliminar el tipo de cultivo.',
        icon: 'error',
        timer: 3000,
        showConfirmButton: false
      });
    }
  };

  const headers = ['Nombre', 'Clasificación del Cultivo', 'Acciones'];

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="4xl">
      <ModalContent className="bg-white p-6">
        <ModalHeader>
          <h2 className="text-xl font-semibold">Gestionar Tipos de Cultivo</h2>
        </ModalHeader>
        <ModalBody className="overflow-y-auto max-h-96">
          <TipoCultivoForm editId={editId} onSuccess={() => { fetchCultivos(); setEditId(null); }} />
          {message && <p className="text-center text-green-600 mt-4">{message}</p>}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Lista de Tipos de Cultivo</h3>
            <Table headers={headers}>
              {cultivos.map((cultivo) => (
                <tr key={cultivo.id}>
                  <td className="px-4 py-2 border-b">{cultivo.nombre}</td>
                  <td className="px-4 py-2 border-b">{cultivo.esPerenne ? "Perene" : "Transitorio"}</td>
                  <td className="px-4 py-2 border-b">
                    <div className="flex gap-1">
                      {!isInitializing && hasPermission('Cultivos', 'cultivos', 'actualizar') && (
                        <CustomButton
                          icon={<PencilIcon className="w-4 h-4" />}
                          tooltip="Editar"
                          onClick={() => handleEdit(cultivo)}
                          color="secondary"
                          variant="light"
                          size="sm"
                        />
                      )}
                      {!isInitializing && hasPermission('Cultivos', 'cultivos', 'eliminar') && (
                        <CustomButton
                          icon={<TrashIcon className="w-4 h-4" />}
                          tooltip="Eliminar"
                          onClick={() => handleDelete(cultivo.id!)}
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

export default TipoCultivoModal;