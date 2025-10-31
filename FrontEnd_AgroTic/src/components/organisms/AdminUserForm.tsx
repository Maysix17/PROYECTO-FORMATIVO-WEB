import React, { useState, useEffect } from 'react';
import { Modal, ModalContent } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import { getRoles } from '../../services/rolesService';
import { getFichas } from '../../services/fichasService';
import { registerAdminUser } from '../../services/authService';
import Swal from 'sweetalert2';

interface Role {
  id: string;
  nombre: string;
}

interface Ficha {
  id: string;
  numero: number;
}

interface AdminUserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

const AdminUserForm: React.FC<AdminUserFormProps> = ({ isOpen, onClose, onUserCreated }) => {
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    dni: '',
    telefono: '',
    correo: '',
    password: '',
    rolId: '',
    fichaId: '',
  });

  const [roles, setRoles] = useState<Role[]>([]);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      fetchFichas();
    }
  }, [isOpen]);

  const fetchRoles = async () => {
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchFichas = async () => {
    try {
      const data = await getFichas();
      setFichas(data);
    } catch (error) {
      console.error('Error fetching fichas:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'rolId') {
      const selectedRole = roles.find(r => r.id === value);
      if (selectedRole?.nombre !== 'Aprendiz') {
        setFormData(prev => ({ ...prev, fichaId: '' }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      await registerAdminUser(formData);
      Swal.fire({
        icon: 'success',
        title: 'Usuario creado',
        text: 'El usuario ha sido registrado exitosamente.',
        confirmButtonText: 'Aceptar',
      });
      onUserCreated();
      onClose();
      setFormData({
        nombres: '',
        apellidos: '',
        dni: '',
        telefono: '',
        correo: '',
        password: '',
        rolId: '',
        fichaId: '',
      });
    } catch (error: any) {
      if (error.response?.data?.message) {
        const messages = Array.isArray(error.response.data.message)
          ? error.response.data.message
          : [error.response.data.message];
        const newErrors: Record<string, string> = {};
        messages.forEach((msg: string) => {
          if (msg.toLowerCase().includes('correo')) newErrors.correo = msg;
          else if (msg.toLowerCase().includes('dni')) newErrors.dni = msg;
          else if (msg.toLowerCase().includes('rol')) newErrors.rolId = msg;
          else if (msg.toLowerCase().includes('ficha')) newErrors.fichaId = msg;
          else newErrors.general = msg;
        });
        setErrors(newErrors);
      } else {
        setErrors({ general: 'Error al crear el usuario.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRole = roles.find(r => r.id === formData.rolId);
  const showFichaField = selectedRole?.nombre?.toLowerCase() === 'aprendiz';

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="2xl"
      classNames={{
        base: 'flex items-center justify-center', // centra modal en pantalla móvil
      }}
    >
      <ModalContent
        className="
          bg-white p-6 rounded-2xl 
          sm:p-6 sm:w-auto
          w-[95%] 
          sm:max-h-none 
          max-h-[90vh] 
          overflow-y-auto 
          shadow-lg
        "
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center sm:text-left">
          Registrar Nuevo Usuario
        </h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 overflow-y-auto sm:overflow-visible max-h-[75vh] sm:max-h-none px-1"
        >
          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
              <input
                type="text"
                name="nombres"
                value={formData.nombres}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
              {errors.nombres && <p className="text-red-500 text-sm mt-1">{errors.nombres}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
              <input
                type="text"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
              {errors.apellidos && <p className="text-red-500 text-sm mt-1">{errors.apellidos}</p>}
            </div>
          </div>

          {/* DNI y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
              <input
                type="number"
                min="0"
                name="dni"
                value={formData.dni}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
              {errors.dni && <p className="text-red-500 text-sm mt-1">{errors.dni}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="number"
                min="0"
                name="telefono"
                value={formData.telefono}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
              {errors.telefono && <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>}
            </div>
          </div>

          {/* Correo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              name="correo"
              value={formData.correo}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            />
            {errors.correo && <p className="text-red-500 text-sm mt-1">{errors.correo}</p>}
          </div>

          {/* Nota */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-sm text-blue-700">
            <strong>Nota:</strong> La contraseña se establecerá automáticamente como el DNI del usuario.
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              name="rolId"
              value={formData.rolId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar rol</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.nombre}
                </option>
              ))}
            </select>
            {errors.rolId && <p className="text-red-500 text-sm mt-1">{errors.rolId}</p>}
          </div>

          {/* Ficha (solo aprendiz) */}
          {showFichaField && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ficha</label>
              <select
                name="fichaId"
                value={formData.fichaId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Seleccionar ficha</option>
                {fichas.map(ficha => (
                  <option key={ficha.id} value={ficha.id}>
                    {ficha.numero}
                  </option>
                ))}
              </select>
              {errors.fichaId && <p className="text-red-500 text-sm mt-1">{errors.fichaId}</p>}
            </div>
          )}

          {/* Errores */}
          {errors.general && <p className="text-red-500 text-sm">{errors.general}</p>}

          {/* Botones */}
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <CustomButton onClick={onClose} variant="light" className="w-full sm:w-auto">
              Cancelar
            </CustomButton>
            <CustomButton
              text={isLoading ? 'Creando...' : 'Crear Usuario'}
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto"
            />
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
};

export default AdminUserForm;
