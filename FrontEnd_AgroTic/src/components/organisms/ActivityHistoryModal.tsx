import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button } from '@heroui/react';
import InputSearch from '../atoms/buscador';
import DateRangeInput from '../atoms/DateRangeInput';
import Table from '../atoms/Table';
import { getActividadesByCultivoVariedadZonaId } from '../../services/actividadesService';
import ActivityHistoryDetailModal from './ActivityHistoryDetailModal';
import type { Actividad } from '../../services/actividadesService';

interface ExtendedActividad extends Actividad {
  categoriaActividad?: { nombre: string };
  cultivoVariedadZona?: {
    zona: { nombre: string };
  };
  usuariosAsignados?: {
    usuario: { nombres: string; apellidos: string };
    activo: boolean;
  }[];
  reservas?: {
    lote?: {
      producto?: {
        nombre: string;
        unidadMedida?: { abreviatura: string };
      };
    };
    cantidadUsada?: number;
  }[];
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
      const data = await getActividadesByCultivoVariedadZonaId(cvzId);
      setActivities(data);
    } catch (error) {
      console.error('Error fetching activities:', error);
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
        const activityDate = new Date(activity.fechaAsignacion);
        return activityDate >= startDate && activityDate <= endDate;
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getResponsibleUser = (activity: ExtendedActividad) => {
    // Show the main responsible user (the one who created/initiated the activity)
    if ((activity as any).responsableNombre) {
      return (activity as any).responsableNombre;
    }
    return 'Sin responsable';
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
                <div>
                  <DateRangeInput
                    label="Rango de Fechas"
                    onChange={setDateRange}
                  />
                </div>
                <div className="flex gap-2 items-center mt-6">
                  <Button
                    color="success"
                    onClick={clearFilters}
                    className="w-full txs"
                  >
                    Limpiar
                  </Button>
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
                          <Button
                            size="sm"
                            color="success"
                            onClick={() => handleViewDetails(activity)}
                          >
                            Ver Detalles
                          </Button>
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