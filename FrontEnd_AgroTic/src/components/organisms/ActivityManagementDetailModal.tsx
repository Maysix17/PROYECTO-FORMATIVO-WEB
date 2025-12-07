import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from '@heroui/react';
import { getReservationsByActivity, confirmUsage } from '../../services/actividadesService';
import Swal from 'sweetalert2';

interface Reservation {
  id: string;
  cantidadReservada: number;
  cantidadUsada?: number;
  lote?: {
    nombre: string;
    producto: { nombre: string; unidadMedida?: { abreviatura: string } };
  };
  estado?: { nombre: string };
}

interface Activity {
  id: string;
  descripcion: string;
  fechaAsignacion: string;
  estado: boolean;
  categoriaActividad?: { nombre: string };
  cultivoVariedadZona?: {
    zona: { nombre: string };
    cultivoXVariedad: {
      cultivo: { nombre: string; ficha: { numero: string } };
      variedad: { nombre: string; tipoCultivo: { nombre: string } };
    };
  };
  usuariosAsignados?: { usuario: { dni: number; nombres: string; apellidos: string; ficha?: { numero: number } }; activo: boolean }[];
  inventarioUsado?: { inventario: { nombre: string; id: string; categoria: { nombre: string } }; cantidadUsada: number; activo: boolean }[];
  reservas?: {
    id: string;
    cantidadReservada: number;
    lote: {
      producto: {
        nombre: string;
        unidadMedida: { nombre: string; abreviatura: string };
      };
    };
  }[];
}

interface ActivityManagementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
  onUpdate: (id: string) => void;
  onDelete: (id: string) => void;
  onFinalize: (id: string) => void;
}

const ActivityManagementDetailModal: React.FC<ActivityManagementDetailModalProps> = ({
  isOpen,
  onClose,
  activity,
  onUpdate,
  onDelete,
  onFinalize,
}) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    if (activity && isOpen) {
      // Fetch reservations
      const fetchReservations = async () => {
        try {
          const res = await getReservationsByActivity(activity.id);
          setReservations(res);
        } catch (error) {
          console.error('Error fetching reservations:', error);
          setReservations([]);
        }
      };
      fetchReservations();
    }
  }, [activity, isOpen]);

  if (!activity) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="4xl">
      <ModalContent>
        <ModalHeader>
          <h2 className="text-2xl font-semibold">Detalles de Actividad en Gestión</h2>
          <Button variant="light" onClick={onClose}>✕</Button>
        </ModalHeader>
        <ModalBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Usuarios */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Usuarios Responsables</h3>
              <div className="space-y-2 max-h-40 overflow-auto">
                {activity.usuariosAsignados?.filter(u => u.activo).map((uxa, idx) => (
                  <div key={idx} className="p-2 border rounded">
                    <div className="font-medium">{uxa.usuario.nombres} {uxa.usuario.apellidos}</div>
                    <div className="text-sm text-gray-600">N. Documento: {uxa.usuario.dni}</div>
                    {uxa.usuario.ficha && (
                      <div className="text-sm text-gray-600">Ficha: {uxa.usuario.ficha.numero}</div>
                    )}
                  </div>
                )) || <p className="text-gray-500">No hay aprendices asignados</p>}
              </div>
            </div>

            {/* Reservas */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Reservas de Insumos</h3>
              <div className="space-y-2 max-h-40 overflow-auto">
                {reservations.map((res, idx) => (
                  <div key={idx} className="p-2 border rounded">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{res.lote?.producto?.nombre}</span>
                      <div className="text-sm">
                        <div>Reservado: {res.cantidadReservada} {res.lote?.producto?.unidadMedida?.abreviatura}</div>
                        <div>Usado: {res.cantidadUsada || 0} {res.lote?.producto?.unidadMedida?.abreviatura}</div>
                        <div>Estado: {res.estado?.nombre}</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="light"
                        onClick={() => confirmUsage(res.id, { cantidadUsada: res.cantidadReservada })}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Confirmar Uso
                      </Button>
                    </div>
                  </div>
                )) || <p className="text-gray-500">No hay reservas</p>}
              </div>
            </div>

            {/* Información adicional */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">Información Adicional</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium">Fecha de Asignación</label>
                  <div className="text-sm text-gray-600">
                    {(() => {
                      const datePart = activity.fechaAsignacion.split('T')[0];
                      const date = new Date(datePart);
                      const adjustedDate = new Date(date.getTime() + (24 * 60 * 60 * 1000));
                      return adjustedDate.toLocaleDateString();
                    })()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium">Estado</label>
                  <div className="text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      activity.estado === false
                        ? 'bg-primary-100 text-primary-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {activity.estado === false ? 'Finalizada' : 'En Progreso'}
                    </span>
                  </div>
                </div>
                {/* Horas dedicadas y observación ocultas en gestión según requerimiento */}
              </div>
            </div>
          </div>

          {/* Form bottom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Categoria de la actividad</label>
                <div className="p-2 border rounded">{activity.categoriaActividad?.nombre || 'Sin categoría'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ubicación del Cultivo</label>
                <div className="p-2 border rounded">
                  {activity.cultivoVariedadZona?.cultivoXVariedad?.variedad?.tipoCultivo?.nombre || 'Tipo Cultivo'} -
                  {activity.cultivoVariedadZona?.cultivoXVariedad?.variedad?.nombre || 'Variedad'} -
                  {activity.cultivoVariedadZona?.zona?.nombre || 'Zona'}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <div className="p-2 border rounded min-h-[80px]">{activity.descripcion}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  color="primary"
                  variant="bordered"
                  onClick={() => onUpdate(activity.id)}
                >
                  Actualizar
                </Button>
                <Button
                  color="success"
                  onClick={() => onFinalize(activity.id)}
                >
                  Finalizar Actividad
                </Button>
                <Button
                  color="danger"
                  variant="light"
                  onClick={async () => {
                    const result = await Swal.fire({
                      title: '¿Estás seguro?',
                      text: '¿Estás seguro de que deseas eliminar esta actividad?',
                      icon: 'warning',
                      showCancelButton: true,
                      confirmButtonColor: '#d33',
                      cancelButtonColor: '#3085d6',
                      confirmButtonText: 'Sí, eliminar',
                      cancelButtonText: 'Cancelar'
                    });

                    if (result.isConfirmed) {
                      onDelete(activity.id);
                      await Swal.fire({
                        title: 'Eliminado',
                        text: 'Actividad eliminada exitosamente.',
                        icon: 'success',
                        timer: 5000,
                        showConfirmButton: false
                      });
                    }
                  }}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ActivityManagementDetailModal;