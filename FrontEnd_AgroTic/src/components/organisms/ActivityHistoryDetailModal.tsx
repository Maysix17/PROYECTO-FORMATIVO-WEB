import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import { getReservationsByActivity } from '../../services/actividadesService';

interface Reservation {
  id: string;
  cantidadReservada: number;
  cantidadUsada?: number;
  precioProducto?: number;
  capacidadPresentacionProducto?: number;
  lote?: {
    nombre: string;
    producto: {
      nombre: string;
      unidadMedida?: { abreviatura: string };
      categoria?: { esDivisible: boolean };
      vidaUtilPromedioPorUsos?: number;
    };
  };
  estado?: { nombre: string };
}

interface Activity {
  id: string;
  descripcion: string;
  fechaAsignacion: string;
  horasDedicadas?: number;
  precioHora?: number;
  observacion?: string;
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
  imgUrl?: string;
}

interface ActivityHistoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
}

const ActivityHistoryDetailModal: React.FC<ActivityHistoryDetailModalProps> = ({
  isOpen,
  onClose,
  activity,
}) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    if (activity && isOpen) {
      console.log(`[${new Date().toISOString()}] 🔍 FRONTEND: Opening detail modal for activity ${activity.id}`);
      console.log(`[${new Date().toISOString()}] 👥 FRONTEND: Activity has ${activity.usuariosAsignados?.length || 0} assigned users`);
      if (activity.usuariosAsignados && activity.usuariosAsignados.length > 0) {
        activity.usuariosAsignados.forEach((uxa, idx) => {
          console.log(`[${new Date().toISOString()}] 👤 FRONTEND: Assigned user ${idx + 1}: ${uxa.usuario?.nombres} ${uxa.usuario?.apellidos} (N. Documento: ${uxa.usuario?.dni}, Activo: ${uxa.activo})`);
        });
      } else {
        console.log(`[${new Date().toISOString()}] ⚠️ FRONTEND: No assigned users found in activity data`);
      }

      // Fetch reservations
      const fetchReservations = async () => {
        try {
          const res = await getReservationsByActivity(activity.id);
          setReservations(res);
          console.log(`[${new Date().toISOString()}] 📦 FRONTEND: Fetched ${res.length} reservations for activity ${activity.id}`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ FRONTEND: Error fetching reservations for activity ${activity.id}:`, error);
          setReservations([]);
        }
      };
      fetchReservations();
    }
  }, [activity, isOpen]);

  if (!activity) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="4xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          <h2 className="text-2xl font-semibold">Detalles de Actividad Finalizada</h2>
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
                      <div className="text-sm text-gray-600">N. Documento: {(activity as any).responsableDni}</div>
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
                  {(() => {
                    const allUsers = activity.usuariosAsignados || [];
                    console.log(`[${new Date().toISOString()}] 🎯 FRONTEND: Total assigned users: ${allUsers.length}`);
                    console.log(`[${new Date().toISOString()}] 📋 FRONTEND: All users:`, allUsers.map(u => ({ name: `${u.usuario.nombres} ${u.usuario.apellidos}`, activo: u.activo })));
                    return allUsers.length > 0 ? (
                      allUsers.map((uxa, idx) => (
                        <div key={idx} className="p-3 bg-white rounded border">
                          <div className="font-medium text-gray-900">{uxa.usuario.nombres} {uxa.usuario.apellidos}</div>
                          <div className="text-sm text-gray-600">N. Documento: {uxa.usuario.dni}</div>
                          {uxa.usuario.ficha && (
                            <div className="text-sm text-gray-600">Ficha: {uxa.usuario.ficha.numero}</div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">No hay usuarios asignados</p>
                    );
                  })()}
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
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-purple-700 uppercase tracking-wide">Fecha Asignación</label>
                    <div className="text-sm text-gray-900 font-medium">
                      {(() => {
                        const datePart = activity.fechaAsignacion.split('T')[0];
                        const date = new Date(datePart);
                        const adjustedDate = new Date(date.getTime() + (24 * 60 * 60 * 1000));
                        return adjustedDate.toLocaleDateString('es-CO', {
                          timeZone: 'America/Bogota',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        });
                      })()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-700 uppercase tracking-wide">Estado</label>
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Finalizada
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-700 uppercase tracking-wide">Horas Dedicadas</label>
                    <div className="text-sm text-gray-900">
                      {activity.horasDedicadas ? `${activity.horasDedicadas}h` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-700 uppercase tracking-wide">Categoría</label>
                    <div className="text-sm text-gray-900">
                      {activity.categoriaActividad?.nombre || 'Sin categoría'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-700 uppercase tracking-wide">Costo de Mano de Obra</label>
                    <div className="text-sm text-gray-900">
                      ${((activity.horasDedicadas || 0) * (activity.precioHora || 0)).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-purple-700 uppercase tracking-wide">Costo Total de la Actividad</label>
                    <div className="text-sm text-gray-900">
                      ${(() => {
                        const totalInputsCost = reservations.reduce((sum, res) => {
                          const cantidadUsada = res.cantidadUsada || 0;
                          let subtotal = 0;

                          // Check if product is divisible (consumable) or not (tool)
                          const esDivisible = res.lote?.producto?.categoria?.esDivisible ?? true; // Default true for compatibility

                          if (esDivisible) {
                            // Logic for divisible products (consumables)
                            const unitPrice = res.capacidadPresentacionProducto && res.capacidadPresentacionProducto > 0
                              ? (res.precioProducto || 0) / res.capacidadPresentacionProducto
                              : 0;
                            subtotal = cantidadUsada * unitPrice;
                          } else {
                            // Logic for non-divisible products (tools) - depreciation per use
                            const vidaUtilPromedioPorUsos = res.lote?.producto?.vidaUtilPromedioPorUsos;

                            if (vidaUtilPromedioPorUsos && vidaUtilPromedioPorUsos > 0) {
                              // Residual value = 10% of product price
                              const valorResidual = (res.precioProducto || 0) * 0.1;
                              const costoPorUso = ((res.precioProducto || 0) - valorResidual) / vidaUtilPromedioPorUsos;

                              // Each use counts as 1 usage
                              subtotal = costoPorUso; // Since cantidadUsada represents number of uses
                            } else {
                              // Fallback: if no useful life defined, use normal logic
                              const unitPrice = res.capacidadPresentacionProducto && res.capacidadPresentacionProducto > 0
                                ? (res.precioProducto || 0) / res.capacidadPresentacionProducto
                                : 0;
                              subtotal = cantidadUsada * unitPrice;
                            }
                          }

                          return sum + subtotal;
                        }, 0);
                        const laborCost = (activity.horasDedicadas || 0) * (activity.precioHora || 0);
                        return (totalInputsCost + laborCost).toFixed(2);
                      })()}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-purple-700 uppercase tracking-wide mb-1">Observación</label>
                  <div className="text-sm text-gray-700 bg-white p-2 rounded border max-h-16 overflow-auto">
                    {activity.observacion || 'Sin observaciones'}
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
                  {reservations.map((res, idx) => {
                    const cantidadUsada = res.cantidadUsada || 0;
                    let unitPrice = 0;
                    let subtotal = 0;

                    // Check if product is divisible (consumable) or not (tool)
                    const esDivisible = res.lote?.producto?.categoria?.esDivisible ?? true; // Default true for compatibility

                    if (esDivisible) {
                      // Logic for divisible products (consumables)
                      unitPrice = res.capacidadPresentacionProducto && res.capacidadPresentacionProducto > 0
                        ? (res.precioProducto || 0) / res.capacidadPresentacionProducto
                        : 0;
                      subtotal = cantidadUsada * unitPrice;
                    } else {
                      // Logic for non-divisible products (tools) - depreciation per use
                      const vidaUtilPromedioPorUsos = res.lote?.producto?.vidaUtilPromedioPorUsos;

                      if (vidaUtilPromedioPorUsos && vidaUtilPromedioPorUsos > 0) {
                        // Residual value = 10% of product price
                        const valorResidual = (res.precioProducto || 0) * 0.1;
                        const costoPorUso = ((res.precioProducto || 0) - valorResidual) / vidaUtilPromedioPorUsos;

                        // Each use counts as 1 usage
                        unitPrice = costoPorUso;
                        subtotal = costoPorUso; // Since cantidadUsada represents number of uses
                      } else {
                        // Fallback: if no useful life defined, use normal logic
                        unitPrice = res.capacidadPresentacionProducto && res.capacidadPresentacionProducto > 0
                          ? (res.precioProducto || 0) / res.capacidadPresentacionProducto
                          : 0;
                        subtotal = cantidadUsada * unitPrice;
                      }
                    }

                    return (
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
                          <div>Subtotal: <span className="font-medium">${subtotal.toFixed(2)}</span></div>
                        </div>
                      </div>
                    );
                  }) || <p className="text-gray-500 italic">No hay reservas</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Imagen de evidencia */}
          {activity.imgUrl && (
            <div className="border rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Imagen de Evidencia</h3>
              <div className="flex justify-center">
                <img
                  src={`${import.meta.env.VITE_API_URL}${activity.imgUrl}`}
                  alt="Evidencia de actividad"
                  className="max-w-full max-h-96 rounded-lg shadow-md"
                  onLoad={() => {
                    console.log(`[${new Date().toISOString()}] ✅ FRONTEND: Image rendered successfully for activity ${activity.id} - Full URL: ${import.meta.env.VITE_API_URL}${activity.imgUrl}`);
                  }}
                  onError={(e) => {
                    console.error(`[${new Date().toISOString()}] ❌ FRONTEND: Error rendering image for activity ${activity.id} - Attempted URL: ${import.meta.env.VITE_API_URL}${activity.imgUrl} - Original stored URL: ${activity.imgUrl}`);
                    // Try alternative URL construction
                    if (activity.imgUrl) {
                      const alternativeUrl = `${import.meta.env.VITE_API_URL}/uploads/${activity.imgUrl.split('/').pop()}`;
                      console.log(`[${new Date().toISOString()}] 🔄 FRONTEND: Trying alternative URL: ${alternativeUrl}`);
                      e.currentTarget.src = alternativeUrl;
                    }
                  }}
                />
                <div className="hidden text-center text-gray-500 p-4">
                  Error al cargar la imagen
                </div>
              </div>
            </div>
          )}

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
            </div>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ActivityHistoryDetailModal;