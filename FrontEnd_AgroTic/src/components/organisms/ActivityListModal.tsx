import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import { usePermission } from '../../contexts/PermissionContext';

interface Activity {
  id: string;
  descripcion: string;
  categoriaActividad: { nombre: string };
}

interface ActivityListModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  onSelectActivity: (activity: Activity) => void;
  onRegisterNew: () => void;
}

const ActivityListModal: React.FC<ActivityListModalProps> = ({ isOpen, onClose, activities, onSelectActivity, onRegisterNew }) => {
  const { hasPermission } = usePermission();
  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="xl">
      <ModalContent>
        <ModalHeader>
          <h2 className="text-xl font-semibold">Actividades del día</h2>
          {hasPermission('Actividades', 'actividades', 'crear') && (
            <CustomButton onClick={onRegisterNew} className="ml-20" label="Registrar Nueva" />
          )}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm cursor-pointer hover:shadow-md hover:bg-blue-50 transition-all duration-200"
                  onClick={() => onSelectActivity(activity)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-lg">📅</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{activity.categoriaActividad.nombre}</div>
                      <div className="text-sm text-gray-600 truncate">{activity.descripcion}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl">📭</span>
                <p className="text-gray-500 mt-2">No hay actividades para este día.</p>
              </div>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ActivityListModal;