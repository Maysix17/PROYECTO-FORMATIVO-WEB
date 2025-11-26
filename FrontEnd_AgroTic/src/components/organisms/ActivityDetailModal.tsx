import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import { getReservationsByActivity, confirmUsage } from '../../services/actividadesService';
import apiClient from '../../lib/axios/axios';
import FinalizeActivityModal from './FinalizeActivityModal';
import { usePermission } from '../../contexts/PermissionContext';
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
     categoriaActividad: { nombre: string };
     cultivoVariedadZona: {
       zona: { nombre: string };
       cultivoXVariedad: {
         cultivo: { nombre: string; ficha: { numero: string } };
         variedad: { nombre: string; tipoCultivo: { nombre: string } };
       };
     };
     usuariosAsignados?: { usuario: { dni: number; nombres: string; apellidos: string; ficha?: { numero: number } }; activo: boolean }[];
     inventarioUsado?: { inventario: { nombre: string; id: string; categoria: { nombre: string } }; cantidadUsada: number; activo: boolean }[];
     reservations?: Reservation[];
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
     dniResponsable?: number;
   }

interface ActivityDetailModalProps {
   isOpen: boolean;
   onClose: () => void;
   activity: Activity | null;
   onDelete: (id: string) => void;
  }

const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({
    isOpen,
    onClose,
    activity,
    onDelete,
   }) => {
   const { user } = usePermission();
   const [categoria, setCategoria] = useState('');
    const [ubicacion, setUbicacion] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [reservations, setReservations] = useState<Reservation[]>([]);
     const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);

  useEffect(() => {
     if (activity) {
       console.log('ActivityDetailModal activity:', activity);
       setCategoria(activity.categoriaActividad.nombre);
       const tipoCultivoName = activity.cultivoVariedadZona?.cultivoXVariedad?.variedad?.tipoCultivo?.nombre || 'Tipo Cultivo';
       const variedadName = activity.cultivoVariedadZona?.cultivoXVariedad?.variedad?.nombre || 'Variedad';
       const zoneName = activity.cultivoVariedadZona?.zona?.nombre || 'Zona';
       setUbicacion(`${tipoCultivoName} - ${variedadName} - ${zoneName}`);
       setDescripcion(activity.descripcion);
       setIsFinalizeModalOpen(false);

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
   }, [activity]);


  const handleDelete = () => {
     if (activity && confirm('¿Estás seguro de eliminar esta actividad?')) {
       onDelete(activity.id);
       onClose();
     }
   };

   const handleFinalizeActivity = async (data: {
     actividadId: string;
     reservas: { reservaId: string; cantidadDevuelta: number }[];
     horas: number;
     precioHora: number;
     observacion: string;
     imgUrl?: File;
   }) => {
     console.log('🔍 DEBUG: handleFinalizeActivity called with data:', data);
     console.log('🔍 DEBUG: Activity object:', activity);
     console.log('🔍 DEBUG: Reservations array:', data.reservas);

     try {
       // Call the new unified endpoint
       const formData = new FormData();
       formData.append('actividadId', data.actividadId);
       formData.append('reservas', JSON.stringify(data.reservas));
       formData.append('horas', data.horas.toString());
       formData.append('precioHora', data.precioHora.toString());
       formData.append('observacion', data.observacion);
       if (data.imgUrl) {
         formData.append('imgUrl', data.imgUrl);
       }

       console.log('🔍 DEBUG: FormData contents:');
       for (let [key, value] of formData.entries()) {
         console.log(`  ${key}:`, value);
       }

       console.log('🔍 DEBUG: Making POST request to /reservas-x-actividad/finalize');

       const response = await apiClient.post('/reservas-x-actividad/finalize', formData, {
         headers: {
           'Content-Type': 'multipart/form-data',
         },
       });

       console.log('🔍 DEBUG: Request successful, response:', response);

       Swal.fire({
         title: '¡Actividad Finalizada!',
         text: 'La actividad ha sido finalizada exitosamente.',
         icon: 'success',
         confirmButtonText: 'Aceptar'
       });
       setIsFinalizeModalOpen(false);
       onClose();
       // Reload the page to update all activity counts
       window.location.reload();
     } catch (error: any) {
       console.error('❌ ERROR: Error finalizing activity:', error);
       console.error('❌ ERROR: Error response:', error.response);
       console.error('❌ ERROR: Error status:', error.response?.status);
       console.error('❌ ERROR: Error data:', error.response?.data);
       console.error('❌ ERROR: Error message:', error.message);

       if (error.response?.data) {
         Swal.fire({
           title: 'Error',
           text: `Error al finalizar la actividad: ${JSON.stringify(error.response.data)}`,
           icon: 'error',
           confirmButtonText: 'Aceptar'
         });
       } else {
         Swal.fire({
           title: 'Error',
           text: 'Error al finalizar la actividad',
           icon: 'error',
           confirmButtonText: 'Aceptar'
         });
       }
     }
   };

  if (!activity) return null;

  return (
    <>
      <Modal isOpen={isOpen} onOpenChange={onClose} size="4xl">
        <ModalContent>
          <ModalHeader>
            <h2 className="text-2xl font-semibold">Detalles de la Actividad</h2>
          </ModalHeader>
          <ModalBody className="max-h-[70vh] overflow-y-auto">
            {/* Información Principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Columna Izquierda - Usuarios */}
              <div className="space-y-4">
                {/* Usuario Responsable */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h3 className="font-semibold mb-3 text-blue-800 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Usuario Responsable
                  </h3>
                  <div className="space-y-2">
                    {(activity as any).nombreResponsable ? (
                      <div className="p-3 bg-white rounded border">
                        <div className="font-medium text-gray-900">{(activity as any).nombreResponsable}</div>
                        <div className="text-sm text-gray-600">DNI: {(activity as any).responsableDni}</div>
                      </div>
                    ) : activity.dniResponsable ? (
                      <div className="p-3 bg-white rounded border">
                        <div className="font-medium text-gray-900">DNI: {activity.dniResponsable}</div>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">Sin responsable asignado</p>
                    )}
                  </div>
                </div>

                {/* Usuarios Asignados */}
                <div className="border rounded-lg p-4 bg-green-50">
                  <h3 className="font-semibold mb-3 text-green-800 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Usuarios Asignados
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-auto">
                    {activity.usuariosAsignados?.filter(u => u.activo).map((uxa, idx) => (
                      <div key={idx} className="p-3 bg-white rounded border">
                        <div className="font-medium text-gray-900">{uxa.usuario.nombres} {uxa.usuario.apellidos}</div>
                        <div className="text-sm text-gray-600">DNI: {uxa.usuario.dni}</div>
                        {uxa.usuario.ficha && (
                          <div className="text-sm text-gray-600">Ficha: {uxa.usuario.ficha.numero}</div>
                        )}
                      </div>
                    )) || <p className="text-gray-500 italic">No hay usuarios asignados</p>}
                  </div>
                </div>
              </div>

              {/* Columna Derecha - Información y Reservas */}
              <div className="space-y-4">
                {/* Información de la Actividad */}
                <div className="border rounded-lg p-4 bg-purple-50">
                  <h3 className="font-semibold mb-3 text-purple-800 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Información de la Actividad
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-purple-700 uppercase tracking-wide">Fecha Asignación</label>
                      <div className="text-sm text-gray-900 font-medium">
                        {new Date(activity.fechaAsignacion + 'T00:00:00').toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-purple-700 uppercase tracking-wide">Estado</label>
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        En Progreso
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-purple-700 uppercase tracking-wide">Categoría</label>
                      <div className="text-sm text-gray-900">
                        {activity.categoriaActividad?.nombre || 'Sin categoría'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-purple-700 uppercase tracking-wide">Tipo</label>
                      <div className="text-sm text-gray-900">
                        Actividad Diaria
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-purple-700 uppercase tracking-wide mb-1">Descripción</label>
                    <div className="text-sm text-gray-700 bg-white p-2 rounded border max-h-16 overflow-auto">
                      {activity.descripcion}
                    </div>
                  </div>
                </div>

                {/* Reservas de Insumos */}
                <div className="border rounded-lg p-4 bg-orange-50">
                  <h3 className="font-semibold mb-3 text-orange-800 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                    Reservas de Insumos
                  </h3>
                  <div className="space-y-2 max-h-32 overflow-auto">
                    {reservations.map((res, idx) => (
                      <div key={idx} className="p-3 bg-white rounded border">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-900 text-sm">{res.lote?.producto?.nombre}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            res.estado?.nombre === 'Confirmada' ? 'bg-green-100 text-green-800' :
                            res.estado?.nombre === 'En Uso' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {res.estado?.nombre}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div>Reservado: <span className="font-medium">{res.cantidadReservada} {res.lote?.producto?.unidadMedida?.abreviatura}</span></div>
                          <div>Usado: <span className="font-medium">{res.cantidadUsada || 0} {res.lote?.producto?.unidadMedida?.abreviatura}</span></div>
                        </div>
                        {res.cantidadUsada === undefined && (
                          <CustomButton
                            size="sm"
                            color="primary"
                            className="mt-2 w-full"
                            onClick={async () => {
                              const cantidad = prompt(`Confirmar uso para ${res.lote?.producto?.nombre} (Reservado: ${res.cantidadReservada}):`);
                              if (cantidad && !isNaN(Number(cantidad))) {
                                try {
                                  await confirmUsage(res.id, { cantidadUsada: Number(cantidad) });
                                  // Refresh reservations
                                  const updatedRes = await getReservationsByActivity(activity.id);
                                  setReservations(updatedRes);
                                  Swal.fire({
                                    title: 'Uso Confirmado',
                                    text: 'El uso del insumo ha sido confirmado exitosamente.',
                                    icon: 'success',
                                    confirmButtonText: 'Aceptar'
                                  });
                                } catch (error) {
                                  console.error('Error confirming usage:', error);
                                  Swal.fire({
                                    title: 'Error',
                                    text: 'Error al confirmar uso',
                                    icon: 'error',
                                    confirmButtonText: 'Aceptar'
                                  });
                                }
                              }
                            }}
                            label="Confirmar Uso"
                          />
                        )}
                      </div>
                    )) || <p className="text-gray-500 italic">No hay reservas</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Información Adicional y Acciones */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3 text-gray-800 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                Ubicación del Cultivo
              </h3>
              <div className="p-3 bg-white rounded border">
                <div className="text-sm text-gray-900 font-medium">{ubicacion}</div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <CustomButton variant="ghost" onClick={() => setIsEditing(!isEditing)} label={isEditing ? 'Cancelar' : 'Actualizar'} />
              <CustomButton color="danger" onClick={handleDelete} label="Eliminar" />
              {activity?.dniResponsable === user?.dni && (
                <CustomButton color="success" onClick={() => setIsFinalizeModalOpen(true)} label="Finalizar Actividad" />
              )}
            </div>

          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Finalize Activity Modal */}
      <FinalizeActivityModal
        isOpen={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        activity={activity as any}
        onSave={handleFinalizeActivity}
      />
    </>
  );
};

export default ActivityDetailModal;