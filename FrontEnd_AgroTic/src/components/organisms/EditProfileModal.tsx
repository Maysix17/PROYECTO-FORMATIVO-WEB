import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import { usePermission } from '../../contexts/PermissionContext';
import { updateProfile } from '../../services/profileService';
import Swal from 'sweetalert2';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, refresh } = usePermission();
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    dni: '',
    correo: '',
    telefono: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        nombres: user.nombres || '',
        apellidos: user.apellidos || '',
        dni: user.dni?.toString() || '',
        correo: user.correo || '',
        telefono: user.telefono?.toString() || '',
      });
      setErrors({});
    }
  }, [isOpen, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setErrors({});

    try {
      const updateData = {
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        dni: parseInt(formData.dni),
        correo: formData.correo,
        telefono: parseInt(formData.telefono),
      };

      await updateProfile(updateData);
      await refresh(); // Refresh user data in context

      Swal.fire({
        icon: 'success',
        title: 'Perfil actualizado',
        text: 'Tu información ha sido actualizada exitosamente.',
        confirmButtonText: 'Aceptar',
      });

      onClose();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'Error al actualizar el perfil.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="md">
      <ModalContent>
        <ModalHeader>Editar Perfil</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                type="text"
                name="nombres"
                value={formData.nombres}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
              <input
                type="text"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N. Documento *</label>
              <input
                type="number"
                name="dni"
                value={formData.dni}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo *</label>
              <input
                type="email"
                name="correo"
                value={formData.correo}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {errors.general && <p className="text-red-500 text-sm">{errors.general}</p>}
          </div>
        </ModalBody>
        <ModalFooter>
          <CustomButton variant="light" onClick={onClose} label="Cancelar" />
          <CustomButton
            color="primary"
            onClick={handleSubmit}
            disabled={isLoading}
            label={isLoading ? 'Actualizando...' : 'Actualizar'}
          />
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditProfileModal;