import React, { useState, useEffect } from 'react';
    import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
    import CustomButton from '../atoms/Boton';
    import { getReservationsByActivity, confirmUsage } from '../../services/actividadesService';
    import apiClient from '../../lib/axios/axios';
    import FinalizeActivityModal from './FinalizeActivityModal';
    import { usePermission } from '../../contexts/PermissionContext';

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

       alert('Actividad finalizada exitosamente');
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
         alert(`Error al finalizar la actividad: ${JSON.stringify(error.response.data)}`);
       } else {
         alert('Error al finalizar la actividad');
       }
     }
   };

  if (!activity) return null;

  return (
    <>
      <Modal isOpen={isOpen} onOpenChange={onClose} size="4xl">
        <ModalContent>
          <ModalHeader>
            <h2 className="text-2xl font-semibold">Actividades</h2>
          </ModalHeader>
          <ModalBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Usuarios */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Usuarios Responsables</h3>
                <div className="space-y-2 max-h-40 overflow-auto">
                  {activity.usuariosAsignados?.filter(u => u.activo).map((uxa, idx) => (
                    <div key={idx} className="p-2 border rounded">
                      {uxa.usuario.dni} - {uxa.usuario.nombres} {uxa.usuario.apellidos}
                    </div>
                  )) || <p className="text-gray-500">No hay aprendices</p>}
                </div>
                {activity.dniResponsable && (
                  <div className="mt-2 p-2 bg-blue-50 border rounded">
                    <strong>Responsable de la Actividad:</strong> {activity.dniResponsable}
                  </div>
                )}
              </div>

              {/* Reservas */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Reservas de Insumos</h3>
                <div className="space-y-2 max-h-40 overflow-auto">
                  {reservations.map((res, idx) => (
                    <div key={idx} className="p-2 border rounded">
                      <div className="flex justify-between items-center">
                        <span>{res.lote?.producto?.nombre}</span>
                        <div className="text-sm">
                          <div>Reservado: {res.cantidadReservada} {res.lote?.producto?.unidadMedida?.abreviatura}</div>
                          <div>Usado: {res.cantidadUsada || 0} {res.lote?.producto?.unidadMedida?.abreviatura}</div>
                          <div>Estado: {res.estado?.nombre}</div>
                        </div>
                      </div>
                      {res.cantidadUsada === undefined && (
                        <CustomButton
                          size="sm"
                          color="primary"
                          className="mt-2"
                          onClick={async () => {
                            const cantidad = prompt(`Confirmar uso para ${res.lote?.producto?.nombre} (Reservado: ${res.cantidadReservada}):`);
                            if (cantidad && !isNaN(Number(cantidad))) {
                              try {
                                await confirmUsage(res.id, { cantidadUsada: Number(cantidad) });
                                // Refresh reservations
                                const updatedRes = await getReservationsByActivity(activity.id);
                                setReservations(updatedRes);
                                alert('Uso confirmado');
                              } catch (error) {
                                console.error('Error confirming usage:', error);
                                alert('Error al confirmar uso');
                              }
                            }
                          }}
                          label="Confirmar Uso"
                        />
                      )}
                    </div>
                  ))}
                  {reservations.length === 0 && <p className="text-gray-500">No hay reservas</p>}
                </div>
              </div>

              {/* Fichas */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Fichas</h3>
                <div className="space-y-2 max-h-40 overflow-auto">
                  {(() => {
                    const fichas = activity.usuariosAsignados
                      ?.filter(u => u.activo)
                      .map(u => u.usuario.ficha)
                      .filter(f => f != null)
                      .map(f => f.numero)
                      .filter((numero, index, arr) => arr.indexOf(numero) === index); // unique
                    return fichas && fichas.length > 0
                      ? fichas.map((numero, idx) => (
                          <div key={idx} className="p-2 border rounded">
                            {numero}
                          </div>
                        ))
                      : <p className="text-gray-500">no hay fichas involucradas</p>;
                  })()}
                </div>
              </div>
            </div>

            {/* Form bottom */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria de la actividad</label>
                  <div className="p-2 border rounded">{categoria}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ubicación del Cultivo</label>
                  <div className="p-2 border rounded">{ubicacion}</div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <div className="p-2 border rounded min-h-[80px]">{descripcion}</div>
                </div>
                <div className="flex justify-end gap-2">
                  <CustomButton variant="ghost" onClick={() => setIsEditing(!isEditing)} label={isEditing ? 'Cancelar' : 'Actualizar'} />
                  <CustomButton color="danger" onClick={handleDelete} label="Eliminar" />
                  {activity?.dniResponsable === user?.dni && (
                    <CustomButton color="success" onClick={() => setIsFinalizeModalOpen(true)} label="Finalizar Actividad" />
                  )}
                </div>
              </div>
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