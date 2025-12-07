import React, { useState } from "react";
import {
  Modal,
  ModalContent,
} from "@heroui/react";
import CustomButton from "../atoms/Boton";
import { usePermission } from "../../contexts/PermissionContext";
import { useNavigate } from "react-router-dom";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import EditProfileModal from "./EditProfileModal";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose }) => {
  const { user, hasPermission, logout } = usePermission();
  const navigate = useNavigate();
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  const handleEditProfile = () => {
    setIsEditProfileModalOpen(true);
  };

  const handleControlPanel = () => {
    navigate('/app/panel-control');
    onClose();
  };

  const handleLogout = async () => {
    try {
      await logout(); // Logout now handles redirect internally
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="center"
      size="5xl"
      className="max-w-[400px] md:max-w-[820px]"
    >
      <ModalContent className="bg-white border border-gray-200 rounded-[18px] shadow-lg p-4 md:p-6 max-h-[calc(100vh-40px)] overflow-auto">
        <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 flex flex-col gap-4">
              <h1 className="text-2xl font-bold text-center md:text-left">Datos del usuario</h1>
              <p className="text-gray-600 text-sm text-center md:text-left">Información básica</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-7 mt-2">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Nombre</div>
                  <div className="text-base font-bold text-gray-900 break-words">{user.nombres}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Apellidos</div>
                  <div className="text-base font-bold text-gray-900 break-words">{user.apellidos}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg col-span-1 md:col-span-2">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">N. Documento</div>
                  <div className="text-base font-bold text-gray-900 break-words">{user.dni}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Correo</div>
                  <div className="text-base font-bold text-gray-900 break-words">{user.correo}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Teléfono</div>
                  <div className="text-base font-bold text-gray-900 break-words">{user.telefono}</div>
                </div>

                {user.ficha && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">ID ficha</div>
                    <div className="text-base font-bold text-gray-900 break-words">{user.ficha.numero}</div>
                  </div>
                )}

                <div className="bg-gray-50 p-3 rounded-lg col-span-1 md:col-span-2">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Rol</div>
                  <div className="text-base font-bold text-gray-900 break-words">{user.rol.nombre}</div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 justify-between items-center mt-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <CustomButton
                    onClick={handleEditProfile}
                    color="primary"
                    variant="solid"
                    label="Editar perfil"
                    className="w-full md:w-auto"
                  />
                  {hasPermission('Usuarios', 'panel de control', 'ver') && (
                    <CustomButton
                      onClick={handleControlPanel}
                      color="secondary"
                      variant="light"
                      label="Panel de control"
                      className="w-full md:w-auto"
                    />
                  )}
                </div>
                <CustomButton
                  onClick={handleLogout}
                  color="danger"
                  variant="solid"
                  label="Cerrar sesión"
                  className="w-full md:w-auto"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                </CustomButton>
              </div>
            </div>
        </div>
      </ModalContent>

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
      />
    </Modal>
  );
};

export default UserModal;