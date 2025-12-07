import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@heroui/react';
import CustomButton from '../atoms/Boton';
import InputSearch from '../atoms/buscador';
import DateRangeInput from '../atoms/DateRangeInput';
import Table from '../atoms/Table';
import { getActividadesByCultivoVariedadZonaId } from '../../services/actividadesService';
import ActivityHistoryDetailModal from './ActivityHistoryDetailModal';
import type { Actividad } from '../../services/actividadesService';
import * as XLSX from 'xlsx';

interface ExtendedActividad extends Actividad {
  categoriaActividad?: { nombre: string };
  cultivoVariedadZona?: {
    zona: { nombre: string };
  };
  usuariosAsignados?: {
    usuario: { nombres: string; apellidos: string; dni: number };
    activo: boolean;
  }[];
  reservas?: {
    lote?: {
      producto?: {
        nombre: string;
        unidadMedida?: { abreviatura: string };
        categoria?: { esDivisible: boolean };
        vidaUtilPromedioPorUsos?: number;
      };
    };
    cantidadUsada?: number;
    precioProducto?: number;
    capacidadPresentacionProducto?: number;
  }[];
  precioHora?: number;
}

interface ActivityHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cvzId: string;
  cultivoName: string;
}

const ActivityHistoryModal: React.FC<ActivityHistoryModalProps> = ({
  isOpen,
  onClose,
  cvzId,
  cultivoName,
}) => {
  const [activities, setActivities] = useState<ExtendedActividad[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ExtendedActividad[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ExtendedActividad | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Filters
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  useEffect(() => {
    if (isOpen && cvzId) {
      fetchActivities();
    }
  }, [isOpen, cvzId]);

  useEffect(() => {
    applyFilters();
  }, [activities, categoriaFilter, dateRange]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      console.log(`[${new Date().toISOString()}] 🔍 FRONTEND: Fetching activities for CVZ ID: ${cvzId}`);
      const data = await getActividadesByCultivoVariedadZonaId(cvzId);
      console.log(`[${new Date().toISOString()}] 📊 FRONTEND: Received ${data.length} activities from backend`);
      data.forEach((act: ExtendedActividad, idx: number) => {
        console.log(`[${new Date().toISOString()}] 👥 FRONTEND: Activity ${idx + 1} (${act.id}) - Usuarios asignados: ${act.usuariosAsignados?.length || 0}`);
        if (act.usuariosAsignados && act.usuariosAsignados.length > 0) {
          act.usuariosAsignados.forEach((uxa: any, uidx: number) => {
            console.log(`[${new Date().toISOString()}] 👤 FRONTEND:   User ${uidx + 1}: ${uxa.usuario?.nombres} ${uxa.usuario?.apellidos} (N. Documento: ${uxa.usuario?.dni}, Activo: ${uxa.activo})`);
          });
        }
      });
      setActivities(data);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ FRONTEND: Error fetching activities for CVZ ${cvzId}:`, error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = activities;

    // Filter to only finalized activities (estado === false)
    filtered = filtered.filter((activity: ExtendedActividad) => activity.estado === false);

    // Filter by categoria
    if (categoriaFilter) {
      filtered = filtered.filter((activity: ExtendedActividad) =>
        activity.categoriaActividad?.nombre?.toLowerCase().includes(categoriaFilter.toLowerCase())
      );
    }

    // Filter by date range
    if (dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0];
      const endDate = dateRange[1];
      filtered = filtered.filter((activity: ExtendedActividad) => {
        const activityDate = new Date(activity.fechaAsignacion.split('T')[0]);
        const adjustedActivityDate = new Date(activityDate.getTime() + (24 * 60 * 60 * 1000));
        return adjustedActivityDate >= startDate && adjustedActivityDate <= endDate;
      });
    }

    setFilteredActivities(filtered);
  };

  const handleViewDetails = (activity: ExtendedActividad) => {
    console.log(`[${new Date().toISOString()}] 🔍 FRONTEND: Accessing activity details for activity ${activity.id}`);
    if (activity.imgUrl) {
      console.log(`[${new Date().toISOString()}] 🖼️ FRONTEND: Activity ${activity.id} has image evidence - attempting to load from: ${activity.imgUrl}`);
    } else {
      console.log(`[${new Date().toISOString()}] 📝 FRONTEND: Activity ${activity.id} has no image evidence`);
    }
    setSelectedActivity(activity);
    setIsDetailModalOpen(true);
  };

  const clearFilters = () => {
    setCategoriaFilter('');
    setDateRange([null, null]);
  };

  const calculateCostoManoObra = (activity: ExtendedActividad) => {
    return (activity.horasDedicadas || 0) * (activity.precioHora || 0);
  };

  const calculateCostoInventario = (activity: ExtendedActividad) => {
    if (!activity.reservas || activity.reservas.length === 0) return 0;
    let total = 0;
    for (const reserva of activity.reservas) {
      const cantidadUsada = reserva.cantidadUsada || 0;
      if (cantidadUsada > 0) {
        const esDivisible = reserva.lote?.producto?.categoria?.esDivisible ?? true;
        if (esDivisible) {
          const precioUnitario = (reserva.precioProducto || 0) / (reserva.capacidadPresentacionProducto || 1);
          total += cantidadUsada * precioUnitario;
        } else {
          const vidaUtil = reserva.lote?.producto?.vidaUtilPromedioPorUsos;
          if (vidaUtil && vidaUtil > 0) {
            const valorResidual = (reserva.precioProducto || 0) * 0.1;
            const costoPorUso = ((reserva.precioProducto || 0) - valorResidual) / vidaUtil;
            total += costoPorUso;
          } else {
            const precioUnitario = (reserva.precioProducto || 0) / (reserva.capacidadPresentacionProducto || 1);
            total += cantidadUsada * precioUnitario;
          }
        }
      }
    }
    return total;
  };

  const calculateCostoTotalActividad = (activity: ExtendedActividad) => {
    return calculateCostoManoObra(activity) + calculateCostoInventario(activity);
  };

  const exportToExcel = () => {
    if (filteredActivities.length === 0) {
      alert('No hay actividades para exportar.');
      return;
    }

    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Sheet: Historial de Actividades
      const actividadesData = [
        ["ID", "Fecha Asignación", "Categoría", "Usuario Responsable", "Usuarios Asignados", "Inventario Utilizado", "Zona", "Estado", "Observación", "Horas Dedicadas", "Costo de Mano de Obra", "Costo Total de la Actividad"]
      ];

      filteredActivities.forEach((activity: ExtendedActividad) => {
        const costoManoObra = calculateCostoManoObra(activity);
        const costoTotal = calculateCostoTotalActividad(activity);
        const assignedUsers = getAssignedUsers(activity);
        actividadesData.push([
          activity.id,
          formatDate(activity.fechaAsignacion),
          activity.categoriaActividad?.nombre || 'Sin categoría',
          getResponsibleUser(activity),
          assignedUsers,
          getInventoryUsed(activity),
          activity.cultivoVariedadZona?.zona?.nombre || 'Sin zona',
          activity.estado === false ? 'Finalizada' : 'En Progreso',
          activity.observacion || '',
          (activity.horasDedicadas || 0).toString(),
          costoManoObra.toFixed(2),
          costoTotal.toFixed(2)
        ]);
      });

      const wsActividades = XLSX.utils.aoa_to_sheet(actividadesData);

      // Set column widths for better readability
      wsActividades['!cols'] = [
        { wch: 15 }, // ID
        { wch: 15 }, // Fecha Asignación
        { wch: 20 }, // Categoría
        { wch: 25 }, // Usuario Responsable
        { wch: 40 }, // Usuarios Asignados
        { wch: 40 }, // Inventario Utilizado
        { wch: 15 }, // Zona
        { wch: 12 }, // Estado
        { wch: 50 }, // Observación
        { wch: 15 }, // Horas Dedicadas
        { wch: 20 }, // Costo de Mano de Obra
        { wch: 20 }  // Costo Total de la Actividad
      ];

      XLSX.utils.book_append_sheet(wb, wsActividades, "Historial de Actividades");

      // Sheet: Detalle de Inventario Utilizado
      const inventarioData = [
        ["ID Actividad", "Fecha Asignación", "Categoría", "Usuario Responsable", "Producto", "Cantidad Reservada", "Cantidad Usada", "Unidad de Medida", "Precio Unitario", "Subtotal", "Zona", "Estado"]
      ];

      filteredActivities.forEach((activity: ExtendedActividad) => {
        if (activity.reservas && activity.reservas.length > 0) {
          activity.reservas.forEach((reserva: any) => {
            const precioUnitario = (reserva.precioProducto || 0) / (reserva.capacidadPresentacionProducto || 1);
            const cantidadUsada = reserva.cantidadUsada || 0;
            const esDivisible = reserva.lote?.producto?.categoria?.esDivisible ?? true;
            let subtotal = 0;
            if (esDivisible) {
              subtotal = cantidadUsada * precioUnitario;
            } else {
              const vidaUtil = reserva.lote?.producto?.vidaUtilPromedioPorUsos;
              if (vidaUtil && vidaUtil > 0) {
                const valorResidual = (reserva.precioProducto || 0) * 0.1;
                subtotal = ((reserva.precioProducto || 0) - valorResidual) / vidaUtil;
              } else {
                subtotal = cantidadUsada * precioUnitario;
              }
            }
            inventarioData.push([
              activity.id,
              formatDate(activity.fechaAsignacion),
              activity.categoriaActividad?.nombre || 'Sin categoría',
              getResponsibleUser(activity),
              reserva.lote?.producto?.nombre || 'Producto desconocido',
              reserva.cantidadReservada || 0,
              cantidadUsada,
              reserva.lote?.producto?.unidadMedida?.abreviatura || 'N/A',
              precioUnitario.toFixed(2),
              subtotal.toFixed(2),
              activity.cultivoVariedadZona?.zona?.nombre || 'Sin zona',
              activity.estado === false ? 'Finalizada' : 'En Progreso'
            ]);
          });
        } else {
          // If no inventory, still add a row with empty inventory fields
          inventarioData.push([
            activity.id,
            formatDate(activity.fechaAsignacion),
            activity.categoriaActividad?.nombre || 'Sin categoría',
            getResponsibleUser(activity),
            'Sin inventario utilizado',
            0,
            0,
            'N/A',
            '0.00',
            '0.00',
            activity.cultivoVariedadZona?.zona?.nombre || 'Sin zona',
            activity.estado === false ? 'Finalizada' : 'En Progreso'
          ]);
        }
      });

      const wsInventario = XLSX.utils.aoa_to_sheet(inventarioData);

      // Set column widths for inventory sheet
      wsInventario['!cols'] = [
        { wch: 15 }, // ID Actividad
        { wch: 15 }, // Fecha Asignación
        { wch: 20 }, // Categoría
        { wch: 25 }, // Usuario Responsable
        { wch: 30 }, // Producto
        { wch: 18 }, // Cantidad Reservada
        { wch: 15 }, // Cantidad Usada
        { wch: 18 }, // Unidad de Medida
        { wch: 15 }, // Precio Unitario
        { wch: 12 }, // Subtotal
        { wch: 15 }, // Zona
        { wch: 12 }  // Estado
      ];

      XLSX.utils.book_append_sheet(wb, wsInventario, "Detalle de Inventario");

      // Sheet: Análisis de Costos
      const costosData = [
        ["ID Actividad", "Fecha Asignación", "Categoría", "Usuario Responsable", "Costo de Mano de Obra", "Costo Total Insumos", "Costo Total Actividad", "Zona", "Estado"]
      ];

      filteredActivities.forEach((activity: ExtendedActividad) => {
        const costoManoObra = calculateCostoManoObra(activity);
        const costoInventario = calculateCostoInventario(activity);
        const costoTotal = calculateCostoTotalActividad(activity);
        costosData.push([
          activity.id,
          formatDate(activity.fechaAsignacion),
          activity.categoriaActividad?.nombre || 'Sin categoría',
          getResponsibleUser(activity),
          costoManoObra.toFixed(2),
          costoInventario.toFixed(2),
          costoTotal.toFixed(2),
          activity.cultivoVariedadZona?.zona?.nombre || 'Sin zona',
          activity.estado === false ? 'Finalizada' : 'En Progreso'
        ]);
      });

      const wsCostos = XLSX.utils.aoa_to_sheet(costosData);

      // Set column widths for cost analysis sheet
      wsCostos['!cols'] = [
        { wch: 15 }, // ID Actividad
        { wch: 15 }, // Fecha Asignación
        { wch: 20 }, // Categoría
        { wch: 25 }, // Usuario Responsable
        { wch: 20 }, // Costo de Mano de Obra
        { wch: 20 }, // Costo Total Insumos
        { wch: 20 }, // Costo Total Actividad
        { wch: 15 }, // Zona
        { wch: 12 }  // Estado
      ];

      XLSX.utils.book_append_sheet(wb, wsCostos, "Análisis de Costos");

      // Generate and download file
      const fileName = `Historial_Actividades_${cultivoName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error al exportar el historial de actividades. Por favor, inténtelo de nuevo.');
    }
  };

  const formatDate = (dateString: string) => {
    const datePart = dateString.split('T')[0];
    const date = new Date(datePart);
    const adjustedDate = new Date(date.getTime() + (24 * 60 * 60 * 1000));
    return adjustedDate.toLocaleDateString();
  };

  const getResponsibleUser = (activity: ExtendedActividad) => {
    // Show the main responsible user (the one who created/initiated the activity)
    if ((activity as any).nombreResponsable) {
      return (activity as any).nombreResponsable;
    }
    return 'Sin responsable';
  };

  const getAssignedUsers = (activity: ExtendedActividad) => {
    if (!activity.usuariosAsignados || activity.usuariosAsignados.length === 0) {
      return 'Sin usuarios asignados';
    }
    return activity.usuariosAsignados
      .map(uxa => `${uxa.usuario.nombres} ${uxa.usuario.apellidos} (${uxa.usuario.dni})`)
      .join(', ');
  };

  const getInventoryUsed = (activity: ExtendedActividad) => {
    if (!activity.reservas || activity.reservas.length === 0) return 'Sin inventario';
    return activity.reservas
      .map((r: any) => {
        // Check if product is non-consumable (esDivisible = false)
        const esConsumible = r.lote?.producto?.categoria?.esDivisible ?? true;
        const cantidad = esConsumible ? (r.cantidadUsada || 0) : (r.cantidadDevuelta || 0);
        return `${r.lote?.producto?.nombre} (${cantidad} ${r.lote?.producto?.unidadMedida?.abreviatura})`;
      })
      .join(', ');
  };

  return (
    <>
      <Modal isOpen={isOpen} onOpenChange={onClose} size="5xl">
        <ModalContent>
          <ModalHeader>
            <h2 className="text-2xl font-semibold">Historial de Actividades - {cultivoName}</h2>
          </ModalHeader>
          <ModalBody>
            {/* Filters */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Filtros</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Buscar por Categoría</label>
                  <InputSearch
                    placeholder="Nombre de categoría..."
                    value={categoriaFilter}
                    onChange={(e) => setCategoriaFilter(e.target.value)}
                  />
                </div>
                <div className="flex items-center">
                  <DateRangeInput
                    label="Rango de Fechas"
                    onChange={setDateRange}
                  />
                </div>
                <div className="flex gap-2 items-center mt-6">
                  <CustomButton
                    label="Limpiar"
                    onClick={clearFilters}
                    size="sm"
                    variant="light"
                    color="secondary"
                  />
                  <CustomButton
                    label="Exportar Excel"
                    onClick={exportToExcel}
                    size="sm"
                    variant="solid"
                    color="success"
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-800">Resultados ({filteredActivities.length})</h3>
              </div>

              {loading ? (
                <div className="p-8 text-center">Cargando actividades...</div>
              ) : filteredActivities.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No se encontraron actividades con los filtros aplicados.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table
                    headers={[
                      "Fecha Asignación",
                      "Categoría",
                      "Usuario Responsable",
                      "Inventario Utilizado",
                      "Zona",
                      "Estado",
                      "Acciones",
                    ]}
                  >
                    {filteredActivities.map((activity) => (
                      <tr key={activity.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2">
                          {formatDate(activity.fechaAsignacion)}
                        </td>
                        <td className="px-4 py-2">
                          {activity.categoriaActividad?.nombre || 'Sin categoría'}
                        </td>
                        <td className="px-4 py-2">
                          {getResponsibleUser(activity)}
                        </td>
                        <td className="px-4 py-2">
                          {getInventoryUsed(activity)}
                        </td>
                        <td className="px-4 py-2">
                          {activity.cultivoVariedadZona?.zona?.nombre || 'Sin zona'}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            activity.estado === false
                              ? 'bg-primary-100 text-primary-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {activity.estado === false ? 'Finalizada' : 'En Progreso'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <CustomButton
                            label="Ver Detalles"
                            onClick={() => handleViewDetails(activity)}
                            size="sm"
                            color="primary"
                          />
                        </td>
                      </tr>
                    ))}
                  </Table>
                </div>
              )}
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Activity History Detail Modal */}
      <ActivityHistoryDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        activity={selectedActivity as any}
      />
    </>
  );
};

export default ActivityHistoryModal;