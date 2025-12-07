import { useState, useEffect } from "react";
import DateRangeInput from "../components/atoms/DateRangeInput";
import { getActividadesByDateRange } from "../services/actividadesService";
import type { Actividad } from "../services/actividadesService";

function Calendario() {
  const [range, setRange] = useState<[Date | null, Date | null]>([null, null]);
  const [activities, setActivities] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (range[0] && range[1]) {
      fetchActivities();
    } else {
      setActivities([]);
    }
  }, [range]);

  const fetchActivities = async () => {
    if (!range[0] || !range[1]) return;

    setLoading(true);
    try {
      const startStr = range[0].toISOString().split('T')[0];
      const endStr = range[1].toISOString().split('T')[0];
      const allActivities = await getActividadesByDateRange(startStr, endStr);
      // Filter to only active activities (estado === true)
      const activeActivities = allActivities.filter(activity => activity.estado === true);
      setActivities(activeActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Calendario de Actividad</h1>

      <DateRangeInput
        label="Selecciona un rango de fechas"
        onChange={setRange}
      />

      {range[0] && range[1] && (
        <p className="mt-3 text-primary-500">
          Actividad desde <b>{range[0]?.toLocaleDateString()}</b> hasta <b>{range[1]?.toLocaleDateString()}</b>
        </p>
      )}

      {loading && (
        <p className="mt-3 text-blue-500">Cargando actividades...</p>
      )}

      {activities.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Actividades Activas ({activities.length})</h2>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{activity.descripcion}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Fecha: {new Date(activity.fechaAsignacion.split('T')[0] + 'T00:00:00').toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Horas dedicadas: {activity.horasDedicadas}
                    </p>
                    {activity.observacion && (
                      <p className="text-sm text-gray-600 mt-1">
                        Observación: {activity.observacion}
                      </p>
                    )}
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
                    Activa
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {range[0] && range[1] && !loading && activities.length === 0 && (
        <p className="mt-3 text-gray-500">No hay actividades activas en el rango seleccionado.</p>
      )}
    </div>
  );
}

export default Calendario;

