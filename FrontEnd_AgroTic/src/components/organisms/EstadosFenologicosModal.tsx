import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Input, Textarea } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import Table from '../atoms/Table';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { EstadoFenologico } from '../../types/cultivos.types';
import { getEstadosFenologicos, createEstadoFenologico, updateEstadoFenologico, deleteEstadoFenologico } from '../../services/estadosFenologicosService';
import { usePermission } from '../../contexts/PermissionContext';
import Swal from 'sweetalert2';

interface EstadosFenologicosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EstadosFenologicosModal: React.FC<EstadosFenologicosModalProps> = ({ isOpen, onClose }) => {
  const [estados, setEstados] = useState<EstadoFenologico[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingEstado, setEditingEstado] = useState<EstadoFenologico | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    orden: 1,
  });
  const { hasPermission, isInitializing } = usePermission();

  useEffect(() => {
    if (isOpen) {
      loadEstados();
    }
  }, [isOpen]);

  const loadEstados = async () => {
    setLoading(true);
    try {
      const data = await getEstadosFenologicos();
      setEstados(data);
    } catch (error) {
      console.error('Error loading estados fenológicos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEstado) {
        await updateEstadoFenologico(editingEstado.id, formData);
      } else {
        await createEstadoFenologico(formData);
      }
      await loadEstados();
      resetForm();
    } catch (error) {
      console.error('Error saving estado fenológico:', error);
    }
  };

  const handleEdit = (estado: EstadoFenologico) => {
    setEditingEstado(estado);
    setFormData({
      nombre: estado.nombre,
      descripcion: estado.descripcion || '',
      orden: estado.orden,
    });
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteEstadoFenologico(id);
      await loadEstados();
    } catch (error) {
      console.error('Error deleting estado fenológico:', error);
      await Swal.fire({
        title: 'Error',
        text: 'No se pudo eliminar el estado fenológico.',
        icon: 'error',
        timer: 3000,
        showConfirmButton: false
      });
    }
  };

  const resetForm = () => {
    setEditingEstado(null);
    setFormData({
      nombre: '',
      descripcion: '',
      orden: 1,
    });
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="4xl">
      <ModalContent className="bg-white">
        <ModalHeader>
          <h2 className="text-xl font-semibold">Gestión Estados Fenológicos</h2>
        </ModalHeader>
        <ModalBody className="space-y-6 overflow-y-auto max-h-96">
        {/* Formulario */}
        {!isInitializing && hasPermission('Cultivos', 'cultivos', 'crear') && (
          <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">
              {editingEstado ? 'Editar Estado Fenológico' : 'Crear Estado Fenológico'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />

              <Input
                label="Orden"
                type="number"
                value={formData.orden.toString()}
                onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) || 1 })}
                required
              />
            </div>

            <div className="mt-4">
              <Textarea
                label="Descripción"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-2 mt-4">
              <CustomButton
                label={editingEstado ? 'Actualizar' : 'Crear'}
                type="submit"
                size="sm"
              />
              {editingEstado && (
                <CustomButton
                  label="Cancelar"
                  onClick={resetForm}
                  size="sm"
                  color="danger"
                  variant="bordered"
                />
              )}
            </div>
          </form>
        )}

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Estados Fenológicos ({estados.length})</h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table
                headers={['Nombre', 'Descripción', 'Orden', 'Acciones']}
              >
                {estados.map((estado) => (
                  <tr key={estado.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{estado.nombre}</td>
                    <td className="px-4 py-2">{estado.descripcion || '-'}</td>
                    <td className="px-4 py-2">{estado.orden}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        {!isInitializing && hasPermission('Cultivos', 'cultivos', 'actualizar') && (
                          <CustomButton
                            icon={<PencilIcon className="w-4 h-4" />}
                            tooltip="Editar"
                            onClick={() => handleEdit(estado)}
                            color="secondary"
                            variant="light"
                            size="sm"
                          />
                        )}
                        {!isInitializing && hasPermission('Cultivos', 'cultivos', 'eliminar') && (
                          <CustomButton
                            icon={<TrashIcon className="w-4 h-4" />}
                            tooltip="Eliminar"
                            onClick={() => handleDelete(estado.id)}
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
          )}

          {estados.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
              No hay estados fenológicos registrados.
            </div>
          )}
        </div>
      </ModalBody>
    </ModalContent>
  </Modal>
 );
};

export default EstadosFenologicosModal;