import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody } from '@heroui/react';
import {
  TruckIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import axios from '../lib/axios/axios';
import { useNotificationsSocket } from '../hooks/useNotificationsSocket';
// Removed unused import
import { movementsService } from '../services/movementsService';
import { getVentas } from '../services/ventaService';
import { getCosechasToday } from '../services/cosechasService';
import { getProfile } from '../services/profileService';
import DynamicSensorCard from '../components/molecules/DynamicSensorCard';
import type { Venta } from '../types/venta.types';
import type { Cosecha } from '../types/cosechas.types';
import type { MovimientoInventario } from '../types/movements.types';
import type { User } from '../types/user';

// Real data interfaces
interface LastSaleData {
  id: string;
  fecha: string;
  cantidad: number;
  precioKilo: number;
  ingresoTotal: number;
  producto: string;
  cultivo: string;
  precioVenta: number;
  zona: string;
}

interface LastHarvestData {
  id: string;
  fecha: string;
  cantidad: number;
  unidadMedida: string;
  cultivo: string;
  zona?: string;
}

// Removed unused mock data

interface AssignedActivity {
  id: string;
  actividad: {
    descripcion: string;
    categoriaActividad: {
      nombre: string;
    };
    cultivoVariedadZona: {
      zona: {
        nombre: string;
      };
    };
    responsable: {
      nombres: string;
      apellidos: string;
      rol: {
        nombre: string;
      };
    };
  };
  fechaAsignacion: string;
  usuario: {
    nombres: string;
    apellidos: string;
  };
}

interface InventoryMovement {
  id: string;
  userName: string;
  userId: string; // Assuming cédula is user ID
  date: string;
  type: string;
  product: string;
}



// Pie chart data will be dynamically loaded

const Dashboard: React.FC = () => {
  // User state
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  // Animation states
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [assignedActivities, setAssignedActivities] = useState<AssignedActivity[]>([]);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [isActivitiesHovered, setIsActivitiesHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Inventory movements state
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [currentMovementPage, setCurrentMovementPage] = useState(0);
  const [isMovementsHovered, setIsMovementsHovered] = useState(false);
  const [isMovementAnimating, setIsMovementAnimating] = useState(false);

  // Sales hover state
  const [isSaleHovered, setIsSaleHovered] = useState(false);

  // Real data states
  const [todaysSales, setTodaysSales] = useState<LastSaleData[]>([]);
  const [currentSaleIndex, setCurrentSaleIndex] = useState(0);
  const [isSaleAnimating, setIsSaleAnimating] = useState(false);
  const [todaysHarvests, setTodaysHarvests] = useState<LastHarvestData[]>([]);
  const [currentHarvestIndex, setCurrentHarvestIndex] = useState(0);
  const [isHarvestHovered, setIsHarvestHovered] = useState(false);
  const [isHarvestAnimating, setIsHarvestAnimating] = useState(false);


  const fetchAssignedActivities = async () => {
    try {
      const response = await axios.get('/usuarios-x-actividades');
      const activities = response.data;

      // Fetch user details for each activity's responsable
      const activitiesWithUserDetails = await Promise.all(
        activities.map(async (activity: any) => {
          if (activity.actividad?.dniResponsable) {
            const userDetails = await getUserByDni(activity.actividad.dniResponsable);
            if (userDetails) {
              return {
                ...activity,
                actividad: {
                  ...activity.actividad,
                  responsable: {
                    nombres: userDetails.nombres,
                    apellidos: userDetails.apellidos,
                    rol: {
                      nombre: userDetails.rol?.nombre || 'Sin rol',
                    },
                  },
                },
              };
            }
          }
          return activity;
        })
      );

      setAssignedActivities(activitiesWithUserDetails);
      setCurrentActivityIndex(0); // Reset to first page when data changes
    } catch (error) {
      console.error('Error fetching assigned activities:', error);
    }
  };

  // Function to get user name and role by N. Documento
  const getUserByDni = async (dni: number) => {
    try {
      const response = await axios.get(`/usuarios/search/dni/${dni}`);
      // Backend now returns an array, take first element if exists
      const userData = Array.isArray(response.data) ? response.data[0] : response.data;
      if (!userData) return null;

      return {
        nombres: userData.nombres,
        apellidos: userData.apellidos,
        rol: {
          nombre: userData.rol,
        },
      };
    } catch (error) {
      console.error('Error fetching user by N. Documento:', error);
      return null;
    }
  };

  const fetchTodaysInventoryMovements = async () => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const movements = await movementsService.getFiltered({
        startDate: startOfDay,
        endDate: endOfDay,
      });

      // Transform the data to match our interface
      const transformedMovements: InventoryMovement[] = movements.map((movement: MovimientoInventario) => ({
        id: movement.id,
        userName: movement.responsable || 'Usuario desconocido',
        userId: '', // Not needed since responsable already contains name_DNI
        date: new Date(movement.fechaMovimiento).toLocaleDateString(),
        type: movement.tipoMovimiento?.nombre || 'Tipo desconocido',
        product: movement.lote?.producto?.nombre || 'Producto desconocido',
      }));

      setInventoryMovements(transformedMovements);
      setCurrentMovementPage(0); // Reset to first page
    } catch (error) {
      console.error('Error fetching today\'s inventory movements:', error);
      setInventoryMovements([]);
    }
  };

  const fetchTodaysSales = async () => {
    try {
      console.log('[DEBUG] fetchTodaysSales: Starting to fetch today\'s sales');
      const ventas: Venta[] = await getVentas();
      console.log('[DEBUG] fetchTodaysSales: Retrieved ventas:', ventas.length, 'sales');
      console.log('[DEBUG] fetchTodaysSales: Ventas data:', ventas);

      if (ventas.length > 0) {
        // Get today's date
        const today = new Date();
        const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Filter sales for today and sort by ID (most recent first, assuming auto-incrementing IDs)
        const todaysVentas = ventas
          .filter(venta => {
            const ventaDate = new Date(venta.fecha).toISOString().split('T')[0];
            return ventaDate === todayString;
          })
          .sort((a, b) => b.id.localeCompare(a.id)); // Sort by ID descending (most recent first)

        console.log('[DEBUG] fetchTodaysSales: Today\'s sales:', todaysVentas.length);

        if (todaysVentas.length > 0) {
          // Process each sale to get crop details
          const salesData: LastSaleData[] = await Promise.all(
            todaysVentas.map(async (venta) => {
              try {
                console.log('[DEBUG] fetchTodaysSales: Fetching harvest details for cosechaId:', venta.fkCosechaId);
                const harvestResponse = await axios.get(`/cosechas/${venta.fkCosechaId}`);
                const harvest = harvestResponse.data;

                if (harvest && harvest.cultivosVariedadXZona) {
                  const cvz = harvest.cultivosVariedadXZona;
                  const tipoCultivo = cvz.cultivoXVariedad?.variedad?.tipoCultivo?.nombre || 'Tipo desconocido';
                  const variedad = cvz.cultivoXVariedad?.variedad?.nombre || 'Variedad desconocida';
                  const zona = cvz.zona?.nombre || 'Zona desconocida';

                  return {
                    id: venta.id,
                    fecha: venta.fecha,
                    cantidad: parseFloat(String(venta.cantidad)),
                    precioKilo: parseFloat(String(venta.precioKilo)) || 0,
                    ingresoTotal: parseFloat(String(venta.cantidad)) * (parseFloat(String(venta.precioKilo)) || 0),
                    precioVenta: parseFloat(String(venta.precioUnitario)) || 0,
                    producto: 'Producto',
                    cultivo: `${tipoCultivo}, ${variedad}`,
                    zona: zona,
                  };
                } else {
                  return {
                    id: venta.id,
                    fecha: venta.fecha,
                    cantidad: parseFloat(String(venta.cantidad)),
                    precioKilo: parseFloat(String(venta.precioKilo)) || 0,
                    ingresoTotal: parseFloat(String(venta.cantidad)) * (parseFloat(String(venta.precioKilo)) || 0),
                    precioVenta: parseFloat(String(venta.precioUnitario)) || 0,
                    producto: 'Producto',
                    cultivo: 'Cultivo desconocido',
                    zona: 'Zona desconocida',
                  };
                }
              } catch (error) {
                console.error('[DEBUG] fetchTodaysSales: Error fetching harvest for sale:', venta.id, error);
                return {
                  id: venta.id,
                  fecha: venta.fecha,
                  cantidad: parseFloat(String(venta.cantidad)),
                  precioKilo: parseFloat(String(venta.precioKilo)) || 0,
                  ingresoTotal: parseFloat(String(venta.cantidad)) * (parseFloat(String(venta.precioKilo)) || 0),
                  precioVenta: parseFloat(String(venta.precioUnitario)) || 0,
                  producto: 'Producto',
                  cultivo: 'Cultivo desconocido',
                  zona: 'Zona desconocida',
                };
              }
            })
          );

          console.log('[DEBUG] fetchTodaysSales: Setting sales data:', salesData);
          setTodaysSales(salesData);
          setCurrentSaleIndex(0); // Reset to first sale

        } else {
          console.log('[DEBUG] fetchTodaysSales: No sales today');
          setTodaysSales([]);
        }
      } else {
        console.log('[DEBUG] fetchTodaysSales: No sales found');
        setTodaysSales([]);
      }
    } catch (error) {
      console.error('[DEBUG] fetchTodaysSales: Error:', error);
      setTodaysSales([]);
    }
  };

  const fetchTodaysHarvests = async () => {
    try {
      console.log('[DEBUG] fetchTodaysHarvests: Starting to fetch today\'s harvests');
      const cosechas: Cosecha[] = await getCosechasToday();
      console.log('[DEBUG] fetchTodaysHarvests: Retrieved cosechas:', cosechas.length, 'harvests');
      console.log('[DEBUG] fetchTodaysHarvests: Cosechas data:', cosechas);

      if (cosechas.length > 0) {
        console.log('[DEBUG] fetchTodaysHarvests: Today\'s harvests:', cosechas.length);

        // Process each harvest to get crop details
        const harvestsData: LastHarvestData[] = cosechas.map((cosecha) => {
          if (cosecha.cultivosVariedadXZona) {
            const cvz = cosecha.cultivosVariedadXZona;
            const tipoCultivo = cvz.cultivoXVariedad?.variedad?.tipoCultivo?.nombre || 'Tipo desconocido';
            const variedad = cvz.cultivoXVariedad?.variedad?.nombre || 'Variedad desconocida';
            const zona = cvz.zona?.nombre || 'Zona desconocida';

            return {
              id: cosecha.id,
              fecha: cosecha.fecha || '',
              cantidad: cosecha.cantidad,
              unidadMedida: cosecha.unidadMedida,
              cultivo: `${tipoCultivo}, ${variedad}`,
              zona: zona,
            };
          } else {
            return {
              id: cosecha.id,
              fecha: cosecha.fecha || '',
              cantidad: cosecha.cantidad,
              unidadMedida: cosecha.unidadMedida,
              cultivo: 'Cultivo desconocido - Zona desconocida',
            };
          }
        });

        console.log('[DEBUG] fetchTodaysHarvests: Setting harvests data:', harvestsData);
        setTodaysHarvests(harvestsData);
        setCurrentHarvestIndex(0); // Reset to first harvest when data changes
      } else {
        console.log('[DEBUG] fetchTodaysHarvests: No harvests today');
        setTodaysHarvests([]);
      }
    } catch (error) {
      console.error('[DEBUG] fetchTodaysHarvests: Error:', error);
      setTodaysHarvests([]);
    }
  };


  const fetchUserProfile = async () => {
    try {
      setUserLoading(true);
      setUserError(null);
      console.log('[DEBUG] fetchUserProfile: Fetching user profile');
      const userData = await getProfile();
      console.log('[DEBUG] fetchUserProfile: User data received:', userData);
      setUser(userData);
    } catch (error) {
      console.error('[DEBUG] fetchUserProfile: Error fetching user profile:', error);
      setUserError('Error al cargar los datos del usuario');
    } finally {
      setUserLoading(false);
    }
  };

  const itemsPerPage = 1;
  const totalPages = Math.ceil(assignedActivities.length / itemsPerPage);
  const startIndex = currentActivityIndex * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActivities = assignedActivities.slice(startIndex, endIndex);

  const nextActivityPage = () => {
    if (currentActivityIndex < totalPages - 1 && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentActivityIndex(currentActivityIndex + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const prevActivityPage = () => {
    if (currentActivityIndex > 0 && !isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentActivityIndex(currentActivityIndex - 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const nextSalePage = () => {
    if (currentSaleIndex < todaysSales.length - 1 && !isSaleAnimating) {
      setIsSaleAnimating(true);
      setTimeout(() => {
        setCurrentSaleIndex(currentSaleIndex + 1);
        setIsSaleAnimating(false);
      }, 150);
    }
  };

  const prevSalePage = () => {
    if (currentSaleIndex > 0 && !isSaleAnimating) {
      setIsSaleAnimating(true);
      setTimeout(() => {
        setCurrentSaleIndex(currentSaleIndex - 1);
        setIsSaleAnimating(false);
      }, 150);
    }
  };

  const movementsPerPage = 2;
  const totalMovementPages = Math.ceil(inventoryMovements.length / movementsPerPage);
  const startMovementIndex = currentMovementPage * movementsPerPage;
  const endMovementIndex = startMovementIndex + movementsPerPage;
  const currentMovements = inventoryMovements.slice(startMovementIndex, endMovementIndex);

  const nextMovementPage = () => {
    if (currentMovementPage < totalMovementPages - 1 && !isMovementAnimating) {
      setIsMovementAnimating(true);
      setTimeout(() => {
        setCurrentMovementPage(currentMovementPage + 1);
        setIsMovementAnimating(false);
      }, 150);
    }
  };

  const prevMovementPage = () => {
    if (currentMovementPage > 0 && !isMovementAnimating) {
      setIsMovementAnimating(true);
      setTimeout(() => {
        setCurrentMovementPage(currentMovementPage - 1);
        setIsMovementAnimating(false);
      }, 150);
    }
  };

  const nextHarvestPage = () => {
    if (currentHarvestIndex < todaysHarvests.length - 1 && !isHarvestAnimating) {
      setIsHarvestAnimating(true);
      setTimeout(() => {
        setCurrentHarvestIndex(currentHarvestIndex + 1);
        setIsHarvestAnimating(false);
      }, 150);
    }
  };

  const prevHarvestPage = () => {
    if (currentHarvestIndex > 0 && !isHarvestAnimating) {
      setIsHarvestAnimating(true);
      setTimeout(() => {
        setCurrentHarvestIndex(currentHarvestIndex - 1);
        setIsHarvestAnimating(false);
      }, 150);
    }
  };

  // Handler for new notifications
  const handleNewNotification = () => {
    console.log('[DEBUG] handleNewNotification: Received notification, refreshing data');
    console.log('[DEBUG] handleNewNotification: Calling fetchAssignedActivities');
    fetchAssignedActivities();
    console.log('[DEBUG] handleNewNotification: Calling fetchTodaysInventoryMovements');
    fetchTodaysInventoryMovements(); // Also fetch movements on notification
    console.log('[DEBUG] handleNewNotification: Calling fetchTodaysSales');
    fetchTodaysSales(); // Fetch today's sales data
    console.log('[DEBUG] handleNewNotification: Calling fetchTodaysHarvests');
    fetchTodaysHarvests(); // Fetch today's harvests data
  };

  // Use the notifications socket hook
  useNotificationsSocket(handleNewNotification);


  // Resume auto-rotation after inactivity (currently not used, but kept for future enhancement)
  // const resumeAutoRotation = () => {
  //   setIsAutoRotating(true);
  // };

  useEffect(() => {
    console.log('[DEBUG] Dashboard: Initial useEffect - fetching all data');
    fetchAssignedActivities();
    fetchTodaysInventoryMovements();
    fetchTodaysSales();
    fetchTodaysHarvests();
    fetchUserProfile();

    // Trigger page load animation after a short delay
    const timer = setTimeout(() => {
      setIsPageLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-gray-50 w-full flex flex-col h-full">

      {/* Grid Layout for Cards - Optimized for no scroll */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Column - 2 cards */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full">
          {/* Pending Activities Card */}
          <Card
            className={`shadow-lg hover:shadow-xl transition-all duration-700 ease-out flex-1 relative transform ${
              isPageLoaded
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }`}
            style={{ animationDelay: '0.1s' }}
            onMouseEnter={() => setIsActivitiesHovered(true)}
            onMouseLeave={() => setIsActivitiesHovered(false)}
          >
            <CardHeader className="flex items-center gap-3">
              <ClockIcon className={`w-8 h-8 text-orange-500 transition-all duration-500 ${
                isPageLoaded ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
              }`} style={{ animationDelay: '0.4s' }} />
              <h3 className={`text-lg font-semibold transition-all duration-500 ${
                isPageLoaded ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
              }`} style={{ animationDelay: '0.6s' }}>Actividades Programadas</h3>
            </CardHeader>
            <CardBody className={`transition-transform duration-300 ease-in-out ${isAnimating ? 'transform -translate-y-2' : ''} flex flex-col justify-start`}>
              {assignedActivities.length === 0 ? (
                <div className="text-center">
                  <p className="text-gray-700">No tienes actividades asignadas</p>
                </div>
              ) : (
                <div>
                  <div className="border-l-4 border-orange-500 pl-3 py-2 inline-block text-left">
                    <p className="text-gray-700 font-medium">
                      {currentActivities[0].actividad?.categoriaActividad?.nombre || 'Sin categoría'}: {currentActivities[0].actividad?.descripcion || 'Sin descripción'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Zona: {currentActivities[0].actividad?.cultivoVariedadZona?.zona?.nombre || 'Sin zona'} | Asignado por: {currentActivities[0].actividad?.responsable?.nombres || 'N/A'} {currentActivities[0].actividad?.responsable?.apellidos || ''} / {currentActivities[0].actividad?.responsable?.rol?.nombre || 'Sin rol'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Fecha de asignación: {new Date(currentActivities[0].fechaAsignacion.split('T')[0] + 'T00:00:00').toLocaleDateString()}
                    </p>
                    {assignedActivities.length > itemsPerPage && (
                      <p className="text-xs text-gray-500 mt-1">
                        Actividad {currentActivityIndex + 1} de {assignedActivities.length}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardBody>

            {/* Navigation Buttons - Only visible on hover */}
            {isActivitiesHovered && assignedActivities.length > itemsPerPage && (
              <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
                <button
                  onClick={prevActivityPage}
                  disabled={currentActivityIndex === 0 || isAnimating}
                  className={`p-2 rounded-full text-white shadow-lg transition-all duration-200 ${
                    currentActivityIndex === 0 || isAnimating
                      ? 'opacity-50 cursor-not-allowed bg-[#15A55A]'
                      : 'hover:scale-110 bg-[#15A55A] hover:bg-[#128a4a]'
                  }`}
                  aria-label="Previous activities page"
                >
                  <ChevronUpIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={nextActivityPage}
                  disabled={currentActivityIndex >= totalPages - 1 || isAnimating}
                  className={`p-2 rounded-full text-white shadow-lg transition-all duration-200 ${
                    currentActivityIndex >= totalPages - 1 || isAnimating
                      ? 'opacity-50 cursor-not-allowed bg-[#15A55A]'
                      : 'hover:scale-110 bg-[#15A55A] hover:bg-[#128a4a]'
                  }`}
                  aria-label="Next activities page"
                >
                  <ChevronDownIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </Card>

          {/* Last Inventory Movement Card */}
          <Card
            className={`shadow-lg hover:shadow-xl transition-all duration-700 ease-out flex-1 relative transform ${
              isPageLoaded
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }`}
            style={{ animationDelay: '0.3s' }}
            onMouseEnter={() => setIsMovementsHovered(true)}
            onMouseLeave={() => setIsMovementsHovered(false)}
          >
            <CardHeader className="flex items-center gap-3">
              <ChartBarIcon className={`w-8 h-8 text-purple-500 transition-all duration-500 ${
                isPageLoaded ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
              }`} style={{ animationDelay: '0.6s' }} />
              <h3 className={`text-lg font-semibold transition-all duration-500 ${
                isPageLoaded ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
              }`} style={{ animationDelay: '0.8s' }}>Últimos Movimientos en Inventario</h3>
            </CardHeader>
            <CardBody className={`transition-transform duration-300 ease-in-out ${isMovementAnimating ? 'transform -translate-y-2' : ''}`}>
              {inventoryMovements.length === 0 ? (
                <p className="text-gray-700">No hay movimientos registrados hoy</p>
              ) : (
                <div className="space-y-2">
                  {currentMovements.map((movement, index) => (
                    <div key={movement.id} className="border-l-4 border-purple-500 pl-3 py-2">
                      <p className="text-gray-700 font-medium">
                        {movement.type}: {movement.product}
                      </p>
                      <p className="text-sm text-gray-600">
                        Usuario: {movement.userName}
                      </p>
                      <p className="text-sm text-gray-600">
                        Fecha: {movement.date}
                      </p>
                      {inventoryMovements.length > movementsPerPage && (
                        <p className="text-xs text-gray-500 mt-1">
                          Movimiento {(currentMovementPage * movementsPerPage) + index + 1} de {inventoryMovements.length}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>

            {/* Navigation Buttons - Only visible on hover */}
            {isMovementsHovered && totalMovementPages > 1 && (
              <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
                <button
                  onClick={prevMovementPage}
                  disabled={isMovementAnimating}
                  className={`p-2 rounded-full text-white shadow-lg transition-all duration-200 ${
                    isMovementAnimating
                      ? 'opacity-50 cursor-not-allowed bg-[#15A55A]'
                      : 'hover:scale-110 bg-[#15A55A] hover:bg-[#128a4a]'
                  }`}
                  aria-label="Previous movement"
                >
                  <ChevronUpIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={nextMovementPage}
                  disabled={isMovementAnimating}
                  className={`p-2 rounded-full text-white shadow-lg transition-all duration-200 ${
                    isMovementAnimating
                      ? 'opacity-50 cursor-not-allowed bg-[#15A55A]'
                      : 'hover:scale-110 bg-[#15A55A] hover:bg-[#128a4a]'
                  }`}
                  aria-label="Next movement"
                >
                  <ChevronDownIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - 3 cards */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full">
          {/* Welcome and Environmental Data Cards - Side by side with fixed height */}
          <div className="flex gap-3 flex-none h-36">
            {/* Dynamic Environmental Data Card - Made wider */}
            <div className="flex-1">
              <DynamicSensorCard />
            </div>

            {/* Welcome Card */}
            <Card className={` shadow-lg hover:shadow-xl transition-all duration-700 ease-out flex-1 flex flex-col transform ${
              isPageLoaded
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }`}
            style={{ animationDelay: '0.7s' }}>
              <CardHeader className="flex items-center gap-3">
           
                <div>
                  {userLoading ? (
                    <>
                      <h3 className="text-lg font-semibold">Cargando...</h3>
                      <p className="text-sm text-gray-600">Obteniendo datos del usuario</p>
                    </>
                  ) : userError ? (
                    <>
                      <h3 className="text-lg font-semibold">Error</h3>
                      <p className="text-sm text-red-600">{userError}</p>
                    </>
                  ) : user ? (
                    <>
                      <h3 className="text-lg font-semibold">¡Bienvenido,
                        <br />
                         {user.nombres} {user.apellidos}!</h3>
                      <p className="text-sm text-gray-600">Rol: {user.rol.nombre}</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold">Usuario no encontrado</h3>
                      <p className="text-sm text-gray-600">No se pudieron cargar los datos</p>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardBody className="flex flex-col items-center justify-center text-center py-2">
              </CardBody>
            </Card>
          </div>

          {/* Today's Sales Card - Compact layout */}
          <Card
            className={`shadow-lg hover:shadow-xl transition-all duration-700 ease-out flex-1 relative transform ${
              isPageLoaded
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }`}
            style={{ animationDelay: '0.9s' }}
            onMouseEnter={() => setIsSaleHovered(true)}
            onMouseLeave={() => setIsSaleHovered(false)}
          >
            <CardHeader className="flex items-center gap-3">
              <CurrencyDollarIcon className={`w-8 h-8 text-yellow-500 transition-all duration-500 ${
                isPageLoaded ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
              }`} style={{ animationDelay: '1.2s' }} />
              <h3 className={`text-lg font-semibold transition-all duration-500 ${
                isPageLoaded ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
              }`} style={{ animationDelay: '1.4s' }}>Ventas de Hoy</h3>
            </CardHeader>
            <CardBody className={`transition-transform duration-300 ease-in-out ${isMovementAnimating ? 'transform -translate-y-2' : ''} py-3`}>
              <div className="flex flex-col justify-center h-full">
                {todaysSales.length === 0 ? (
                  <p className="text-sm text-gray-700">No hay ventas registradas hoy</p>
                ) : (
                  <div className="space-y-1">
                    <div className="border-l-4 border-yellow-500 pl-3 py-2">
                      <p className="text-gray-700 font-medium">
                        {todaysSales[currentSaleIndex].cultivo} - {todaysSales[currentSaleIndex].zona}
                      </p>
                      <p className="text-sm text-gray-600">
                        Fecha: {new Date(todaysSales[currentSaleIndex].fecha).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Ingreso: ${todaysSales[currentSaleIndex].ingresoTotal.toFixed(2)} | Cantidad: {todaysSales[currentSaleIndex].cantidad} kg
                      </p>
                      <p className="text-sm text-gray-600">
                        Precio: ${todaysSales[currentSaleIndex].precioVenta.toFixed(2)}
                      </p>
                      {todaysSales.length > 1 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Venta {currentSaleIndex + 1} de {todaysSales.length}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardBody>

            {/* Navigation Buttons - Only visible on hover when there are multiple sales */}
            {isSaleHovered && todaysSales.length > 1 && (
              <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
                <button
                  onClick={prevSalePage}
                  disabled={currentSaleIndex === 0 || isSaleAnimating}
                  className={`p-2 rounded-full text-white shadow-lg transition-all duration-200 ${
                    currentSaleIndex === 0 || isSaleAnimating
                      ? 'opacity-50 cursor-not-allowed bg-[#15A55A]'
                      : 'hover:scale-110 bg-[#15A55A] hover:bg-[#128a4a]'
                  }`}
                  aria-label="Previous sale"
                >
                  <ChevronUpIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSalePage}
                  disabled={currentSaleIndex >= todaysSales.length - 1 || isSaleAnimating}
                  className={`p-2 rounded-full text-white shadow-lg transition-all duration-200 ${
                    currentSaleIndex >= todaysSales.length - 1 || isSaleAnimating
                      ? 'opacity-50 cursor-not-allowed bg-[#15A55A]'
                      : 'hover:scale-110 bg-[#15A55A] hover:bg-[#128a4a]'
                  }`}
                  aria-label="Next sale"
                >
                  <ChevronDownIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </Card>

          {/* Today's Harvests Card */}
          <Card
            className={`shadow-lg hover:shadow-xl transition-all duration-700 ease-out flex-1 relative transform ${
              isPageLoaded
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }`}
            style={{ animationDelay: '1.1s' }}
            onMouseEnter={() => setIsHarvestHovered(true)}
            onMouseLeave={() => setIsHarvestHovered(false)}
          >
            <CardHeader className="flex items-center gap-3">
              <TruckIcon className={`w-8 h-8 text-green-500 transition-all duration-500 ${
                isPageLoaded ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
              }`} style={{ animationDelay: '1.4s' }} />
              <h3 className={`text-lg font-semibold transition-all duration-500 ${
                isPageLoaded ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
              }`} style={{ animationDelay: '1.6s' }}>Cosechas de Hoy</h3>
            </CardHeader>
            <CardBody className={`transition-transform duration-300 ease-in-out ${isHarvestAnimating ? 'transform -translate-y-2' : ''} py-3`}>
              {todaysHarvests.length === 0 ? (
                <p className="text-sm text-gray-700">No hay cosechas registradas hoy</p>
              ) : (
                <div className="space-y-1">
                  <div className="border-l-4 border-green-500 pl-3 py-2">
                    <p className="text-gray-700 font-medium">
                      {todaysHarvests[currentHarvestIndex].cultivo} - {todaysHarvests[currentHarvestIndex].zona}
                    </p>
                    <p className="text-sm text-gray-600">
                      Fecha: {new Date(todaysHarvests[currentHarvestIndex].fecha).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Cantidad: {todaysHarvests[currentHarvestIndex].cantidad} {todaysHarvests[currentHarvestIndex].unidadMedida}
                    </p>
                    {todaysHarvests.length > 1 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Cosecha {currentHarvestIndex + 1} de {todaysHarvests.length}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardBody>

            {/* Navigation Buttons - Only visible on hover when there are multiple harvests */}
            {isHarvestHovered && todaysHarvests.length > 1 && (
              <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
                <button
                  onClick={prevHarvestPage}
                  disabled={currentHarvestIndex === 0 || isHarvestAnimating}
                  className={`p-2 rounded-full text-white shadow-lg transition-all duration-200 ${
                    currentHarvestIndex === 0 || isHarvestAnimating
                      ? 'opacity-50 cursor-not-allowed bg-[#15A55A]'
                      : 'hover:scale-110 bg-[#15A55A] hover:bg-[#128a4a]'
                  }`}
                  aria-label="Previous harvest"
                >
                  <ChevronUpIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={nextHarvestPage}
                  disabled={currentHarvestIndex >= todaysHarvests.length - 1 || isHarvestAnimating}
                  className={`p-2 rounded-full text-white shadow-lg transition-all duration-200 ${
                    currentHarvestIndex >= todaysHarvests.length - 1 || isHarvestAnimating
                      ? 'opacity-50 cursor-not-allowed bg-[#15A55A]'
                      : 'hover:scale-110 bg-[#15A55A] hover:bg-[#128a4a]'
                  }`}
                  aria-label="Next harvest"
                >
                  <ChevronDownIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;