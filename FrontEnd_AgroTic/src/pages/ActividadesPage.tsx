import React, { useState, useEffect, useRef } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-datepicker/dist/react-datepicker.css';
import Swal from 'sweetalert2';
import ActividadModal from '../components/organisms/ActividadModal';
import ActivityListModal from '../components/organisms/ActivityListModal';
import ActivityDetailModal from '../components/organisms/ActivityDetailModal';
import { usePermission } from '../contexts/PermissionContext';
import {
   getActividadesByDateRange,
   getActividadesCountByDate,
   getActividadesByDateWithActive,
   createActividad,
   deleteActividad,
   createUsuarioXActividad,
   createReservationByProduct
 } from '../services/actividadesService';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    'es': es,
  },
});

const ActividadesPage: React.FC = () => {
    const { hasPermission } = usePermission();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalDate, setModalDate] = useState(new Date());
    const [isListModalOpen, setIsListModalOpen] = useState(false);
    const [activities, setActivities] = useState<any[]>([]);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [activityCounts, setActivityCounts] = useState<{[key: string]: number}>({});

   // Function to update activity count for a specific date
   const updateActivityCount = async (dateStr: string) => {
     try {
       const count = await getActividadesCountByDate(dateStr);
       setActivityCounts(prev => ({ ...prev, [dateStr]: count }));
     } catch (error) {
       console.error('Error updating activity count:', error);
       setActivityCounts(prev => ({ ...prev, [dateStr]: 0 }));
     }
   };

  const calendarRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEvents(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    console.log('Events state updated:', events);
  }, [events]);



  const fetchEvents = async (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    try {
      console.log('Fetching activities for date range:', startStr, 'to', endStr);
      const activities = await getActividadesByDateRange(startStr, endStr);
      console.log('Fetched activities:', activities);
      const formattedEvents = activities.map((activity: any) => ({
        id: activity.id,
        title: activity.descripcion || 'Actividad',
        start: new Date(activity.fechaAsignacion.split('T')[0]),
        end: new Date(activity.fechaAsignacion.split('T')[0]),
        resource: activity,
      }));
      console.log('Formatted events:', formattedEvents);
      setEvents(formattedEvents);

      // Fetch activity counts for the month
      const daysInMonth = eachDayOfInterval({ start, end });
      const countsPromises = daysInMonth.map(async (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        try {
          const count = await getActividadesCountByDate(dateStr);
          return { dateStr, count };
        } catch {
          return { dateStr, count: 0 };
        }
      });
      const countsArray = await Promise.all(countsPromises);
      const countsObj = countsArray.reduce((acc, curr) => ({ ...acc, [curr.dateStr]: curr.count }), {});
      setActivityCounts(countsObj);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
      setActivityCounts({});
    }
  };

  return (
    <div ref={pageRef} className="flex flex-col gap-4 overflow-hidden" style={{ height: '100%' }}>
      {/* Calendar Container with Header */}
      <div ref={calendarRef} className="bg-white p-4 rounded-lg shadow-md w-full overflow-hidden overflow-x-auto flex-1 md:min-w-[768px] flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 flex-shrink-0">
          <h1 className="text-2xl font-bold text-left whitespace-nowrap pb-4">Gestión de Actividades</h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-start">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Seleccionar Mes:</label>
              <DatePicker
                selected={selectedDate}
                onChange={(date) => setSelectedDate(date || new Date())}
                dateFormat="MM/yyyy"
                showMonthYearPicker
                className="border border-gray-300 rounded-lg p-2 text-sm w-full sm:w-auto"
              />
            </div>
          </div>
        </div>

        {/* Calendar */}
        <Calendar
          localizer={localizer}
          culture="es"
          views={['month']}
          defaultView="month"
          date={selectedDate}
          onNavigate={(date) => setSelectedDate(date)}
          events={[]}
          components={{
            event: () => null,
            showMore: () => null,
            dateCellWrapper: ({ children, value }) => {
              const dateStr = format(value, 'yyyy-MM-dd');
              const count = activityCounts[dateStr] || 0;
              const today = new Date();
              const isToday = format(value, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
              const isOffRange = value.getMonth() !== selectedDate.getMonth();
              return (
                <div
                  className={`relative h-full w-full border border-gray-300 ${isToday ? 'bg-primary-100' : ''} ${isOffRange ? 'bg-gray-100 text-gray-400' : ''} cursor-pointer`}
                  style={{ minHeight: '80px' }}
                  onClick={async () => {
                    try {
                      const countClick = await getActividadesCountByDate(dateStr);
                      if (countClick > 0) {
                        const activitiesData = await getActividadesByDateWithActive(dateStr);
                        setActivities(activitiesData);
                        setModalDate(value);
                        setIsListModalOpen(true);
                      } else {
                        // Check create permission before opening create modal
                        if (hasPermission('Actividades', 'actividades', 'crear')) {
                          setModalDate(value);
                          setIsModalOpen(true);
                        } else {
                          Swal.fire({
                            title: 'Permiso Denegado',
                            text: 'No tienes permisos para crear actividades.',
                            icon: 'warning',
                            confirmButtonText: 'Aceptar'
                          });
                        }
                      }
                    } catch (error) {
                      console.error('Error checking activities:', error);
                      // Check create permission before opening create modal
                      if (hasPermission('Actividades', 'actividades', 'crear')) {
                        setModalDate(value);
                        setIsModalOpen(true);
                      } else {
                        Swal.fire({
                          title: 'Permiso Denegado',
                          text: 'No tienes permisos para crear actividades.',
                          icon: 'warning',
                          confirmButtonText: 'Aceptar'
                        });
                      }
                    }
                  }}
                >
                  {children}
                  {count > 0 && (
                    <div className="absolute top-1 left-3 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {count}
                    </div>
                  )}
                </div>
              );
            }
          }}
          onSelectSlot={async (slotInfo) => {
            console.log('onSelectSlot triggered, page height before:', pageRef.current?.clientHeight, 'calendar height before:', calendarRef.current?.clientHeight);
            const dateStr = slotInfo.start.toISOString().split('T')[0];

            try {
              const count = await getActividadesCountByDate(dateStr);

              if (count > 0) {
                // Fetch activities and open list modal
                const activitiesData = await getActividadesByDateWithActive(dateStr);
                setActivities(activitiesData);
                console.log('After fetch, page height:', pageRef.current?.clientHeight, 'calendar height:', calendarRef.current?.clientHeight);
                setIsListModalOpen(true);
                console.log('After setIsListModalOpen, page height:', pageRef.current?.clientHeight, 'calendar height:', calendarRef.current?.clientHeight);
              } else {
                // Check create permission before opening create modal
                if (hasPermission('Actividades', 'actividades', 'crear')) {
                  setModalDate(slotInfo.start);
                  setIsModalOpen(true);
                } else {
                  Swal.fire({
                    title: 'Permiso Denegado',
                    text: 'No tienes permisos para crear actividades.',
                    icon: 'warning',
                    confirmButtonText: 'Aceptar'
                  });
                }
              }
            } catch (error) {
              console.error('Error checking activities:', error);
              // Check create permission before opening create modal
              if (hasPermission('Actividades', 'actividades', 'crear')) {
                setModalDate(slotInfo.start);
                setIsModalOpen(true);
              } else {
                Swal.fire({
                  title: 'Permiso Denegado',
                  text: 'No tienes permisos para crear actividades.',
                  icon: 'warning',
                  confirmButtonText: 'Aceptar'
                });
              }
            }
          }}
          style={{ flex: 1 }}
          messages={{
            allDay: 'Todo el día',
            previous: 'Anterior',
            next: 'Siguiente',
            today: 'Hoy',
            month: 'Mes',
            agenda: 'Agenda',
            date: 'Fecha',
            time: 'Hora',
            event: 'Evento',
            noEventsInRange: 'No hay eventos en este rango.',
            showMore: (total: number) => `+ Ver ${total} más`,
          }}
        />
      </div>

      <ActividadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={modalDate}
        onActivityCreated={updateActivityCount}
        onSave={async (data) => {
          try {
            // Parse the date string to ensure it's treated as local date
            const fechaAsignacion = typeof data.fecha === 'string' ? new Date(data.fecha + 'T00:00:00') : data.fecha;

            const actividadData = {
              descripcion: data.descripcion,
              fechaAsignacion,
              horasDedicadas: 0, // 0 initially, set when finalizing
              observacion: '', // empty string initially, set when finalizing
              estado: true,
              fkCultivoVariedadZonaId: data.lote, // data.lote is cvz.id from search
              fkCategoriaActividadId: data.categoria,
            };

            const actividad = await createActividad(actividadData);

            // Save users
             for (const userId of data.usuarios) {
               await createUsuarioXActividad({ fkUsuarioId: userId, fkActividadId: actividad.id, fechaAsignacion: fechaAsignacion });
             }

            // Save reservations
            console.log('Processing materials:', data.materiales);
            for (const mat of data.materiales) {
                 console.log('Processing material:', mat);
                 await createReservationByProduct(actividad.id, { productId: mat.id, cantidadReservada: mat.qty });
                 console.log('Reservation created for product:', mat.id);
               }

            Swal.fire({
              title: 'Registro exitoso',
              text: 'La actividad ha sido guardada correctamente.',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            });

            // Refresh calendar data and close modal
            await fetchEvents(selectedDate);

            // If the activity was created for the same date as currently viewed activities, refresh the list
            const activityDateStr = typeof data.fecha === 'string' ? data.fecha : format(data.fecha, 'yyyy-MM-dd');
            const modalDateStr = format(modalDate, 'yyyy-MM-dd');
            if (activityDateStr === modalDateStr && isListModalOpen) {
              const updatedActivities = await getActividadesByDateWithActive(activityDateStr);
              setActivities(updatedActivities);
            }

            setIsModalOpen(false);
          } catch (error) {
            console.error('Error saving actividad:', error);
            Swal.fire({
              title: 'Error',
              text: 'Error al guardar la actividad',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        }}
      />


      <ActivityListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        activities={activities}
        onSelectActivity={(activity) => {
          console.log('Opening detail modal, window.innerWidth:', window.innerWidth);
          console.log('Calendar container width:', calendarRef.current?.clientWidth);
          console.log('Calendar container height:', calendarRef.current?.clientHeight);
          setSelectedActivity(activity);
          setIsDetailModalOpen(true);
          setIsListModalOpen(false);
        }}
        onRegisterNew={() => {
          setModalDate(modalDate); // Keep the same date as the list
          setIsModalOpen(true);
          setIsListModalOpen(false);
        }}
      />



         <ActivityDetailModal
         isOpen={isDetailModalOpen}
         onClose={() => setIsDetailModalOpen(false)}
         activity={selectedActivity}
       />
        
      

     


    </div>
  );
};

export default ActividadesPage;
