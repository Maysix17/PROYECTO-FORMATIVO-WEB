import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button } from '@heroui/react';
import {
  UserIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon,
  BeakerIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import axios from '../lib/axios/axios';
import { useNotificationsSocket } from '../hooks/useNotificationsSocket';
// Removed unused import
import { movementsService } from '../services/movementsService';
import { getVentas } from '../services/ventaService';
import { getCosechas } from '../services/cosechasService';
import type { MovimientoInventario } from '../types/movements.types';

// Mock data for prototype
const mockUser = {
  name: 'Juan Pérez',
  role: 'Administrador',
};

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

const environmentalMetrics = [
  { name: 'Humedad', value: '65%', unit: '%' },
  { name: 'pH del Suelo', value: '6.8', unit: '' },
  { name: 'Temperatura', value: '24°C', unit: '' },
  { name: 'Humedad del Suelo', value: '78%', unit: '%' },
];


// Pie chart data will be dynamically loaded

const Dashboard: React.FC = () => {
  const [currentMetricIndex, setCurrentMetricIndex] = useState(0);
  const [assignedActivities, setAssignedActivities] = useState<AssignedActivity[]>([]);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [isActivitiesHovered, setIsActivitiesHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Inventory movements state
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [currentMovementPage, setCurrentMovementPage] = useState(0);
  const [isMovementsHovered, setIsMovementsHovered] = useState(false);
  const [isMovementAnimating, setIsMovementAnimating] = useState(false);

  // Real data states
  const [todaysSales, setTodaysSales] = useState<LastSaleData[]>([]);
  const [currentSaleIndex, setCurrentSaleIndex] = useState(0);
  const [isSaleAnimating, setIsSaleAnimating] = useState(false);
  const [todaysHarvests, setTodaysHarvests] = useState<LastHarvestData[]>([]);
  const [selectedCropId, setSelectedCropId] = useState<string | null>(null);
  const [pieChartData, setPieChartData] = useState<any[]>([]);

  const nextMetric = () => {
    setCurrentMetricIndex((prevIndex) =>
      (prevIndex + 1) % environmentalMetrics.length
    );
  };

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

  // Function to get user name and role by DNI
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
      console.error('Error fetching user by DNI:', error);
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
      const ventas = await getVentas();
      console.log('[DEBUG] fetchTodaysSales: Retrieved ventas:', ventas.length, 'sales');

      if (ventas.length > 0) {
        // Get today's date
        const today = new Date();
        const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Filter sales for today
        const todaysVentas = ventas.filter(venta => {
          const ventaDate = new Date(venta.fecha).toISOString().split('T')[0];
          return ventaDate === todayString;
        });

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
                    cantidad: parseFloat(venta.cantidad),
                    precioKilo: parseFloat(venta.precioKilo) || 0,
                    ingresoTotal: parseFloat(venta.cantidad) * (parseFloat(venta.precioKilo) || 0),
                    precioVenta: parseFloat(venta.precioUnitario) || 0,
                    producto: 'Producto',
                    cultivo: `${tipoCultivo}, ${variedad}`,
                    zona: zona,
                  };
                } else {
                  return {
                    id: venta.id,
                    fecha: venta.fecha,
                    cantidad: parseFloat(venta.cantidad),
                    precioKilo: parseFloat(venta.precioKilo) || 0,
                    ingresoTotal: parseFloat(venta.cantidad) * (parseFloat(venta.precioKilo) || 0),
                    precioVenta: parseFloat(venta.precioUnitario) || 0,
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
                  cantidad: parseFloat(venta.cantidad),
                  precioKilo: parseFloat(venta.precioKilo) || 0,
                  ingresoTotal: parseFloat(venta.cantidad) * (parseFloat(venta.precioKilo) || 0),
                  precioVenta: parseFloat(venta.precioUnitario) || 0,
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

          // Set selected crop for pie chart from first sale
          if (salesData.length > 0) {
            const firstSale = todaysVentas[0];
            const harvestResponse = await axios.get(`/cosechas/${firstSale.fkCosechaId}`);
            const harvest = harvestResponse.data;
            setSelectedCropId(harvest?.fkCultivosVariedadXZonaId || null);
          }
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
      const cosechas = await getCosechas();
      console.log('[DEBUG] fetchTodaysHarvests: Retrieved cosechas:', cosechas.length, 'harvests');

      if (cosechas.length > 0) {
        // Get today's date
        const today = new Date();
        const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Filter harvests for today and take up to 2
        const todaysCosechas = cosechas
          .filter(cosecha => {
            const cosechaDate = new Date(cosecha.fecha || '').toISOString().split('T')[0];
            return cosechaDate === todayString;
          })
          .slice(0, 2); // Limit to 2 results

        console.log('[DEBUG] fetchTodaysHarvests: Today\'s harvests:', todaysCosechas.length);

        if (todaysCosechas.length > 0) {
          // Process each harvest to get crop details
          const harvestsData: LastHarvestData[] = await Promise.all(
            todaysCosechas.map(async (cosecha) => {
              try {
                console.log('[DEBUG] fetchTodaysHarvests: Fetching harvest details for cosechaId:', cosecha.id);
                const harvestResponse = await axios.get(`/cosechas/${cosecha.id}`);
                const harvestWithRelations = harvestResponse.data;

                if (harvestWithRelations && harvestWithRelations.cultivosVariedadXZona) {
                  const cvz = harvestWithRelations.cultivosVariedadXZona;
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
              } catch (error) {
                console.error('[DEBUG] fetchTodaysHarvests: Error fetching harvest details for:', cosecha.id, error);
                return {
                  id: cosecha.id,
                  fecha: cosecha.fecha || '',
                  cantidad: cosecha.cantidad,
                  unidadMedida: cosecha.unidadMedida,
                  cultivo: 'Cultivo desconocido',
                  zona: 'Zona desconocida',
                };
              }
            })
          );

          console.log('[DEBUG] fetchTodaysHarvests: Setting harvests data:', harvestsData);
          setTodaysHarvests(harvestsData);
        } else {
          console.log('[DEBUG] fetchTodaysHarvests: No harvests today');
          setTodaysHarvests([]);
        }
      } else {
        console.log('[DEBUG] fetchTodaysHarvests: No harvests found');
        setTodaysHarvests([]);
      }
    } catch (error) {
      console.error('[DEBUG] fetchTodaysHarvests: Error:', error);
      setTodaysHarvests([]);
    }
  };

  const fetchPieChartData = async (cropId: string) => {
    try {
      console.log('[DEBUG] fetchPieChartData: Fetching data for cropId:', cropId);
      const response = await axios.get(`/finanzas/cultivo/${cropId}/dinamico`);
      const finanzas = response.data;
      console.log('[DEBUG] fetchPieChartData: Received finanzas data:', finanzas);

      const data = [
        { name: 'Costos', value: finanzas.costoTotalProduccion || 0, color: '#8884d8' },
        { name: 'Ingresos', value: finanzas.ingresosTotales || 0, color: '#82ca9d' },
      ];

      console.log('[DEBUG] fetchPieChartData: Setting pie chart data:', data);
      setPieChartData(data);
    } catch (error) {
      console.error('[DEBUG] fetchPieChartData: Error fetching data:', error);
      setPieChartData([
        { name: 'Ventas', value: 60, color: '#8884d8' },
        { name: 'Cosechas', value: 30, color: '#82ca9d' },
        { name: 'Otros', value: 10, color: '#ffc658' },
      ]);
    }
  };

  const itemsPerPage = 2;
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
        // Update pie chart when sale changes
        if (todaysSales[currentSaleIndex + 1]) {
          // Fetch harvest for the new sale to get crop ID
          axios.get(`/cosechas/${todaysSales[currentSaleIndex + 1].id}`)
            .then(response => {
              const harvest = response.data;
              setSelectedCropId(harvest?.fkCultivosVariedadXZonaId || null);
            })
            .catch(error => console.error('Error updating crop ID:', error));
        }
      }, 150);
    }
  };

  const prevSalePage = () => {
    if (currentSaleIndex > 0 && !isSaleAnimating) {
      setIsSaleAnimating(true);
      setTimeout(() => {
        setCurrentSaleIndex(currentSaleIndex - 1);
        setIsSaleAnimating(false);
        // Update pie chart when sale changes
        if (todaysSales[currentSaleIndex - 1]) {
          // Fetch harvest for the new sale to get crop ID
          axios.get(`/cosechas/${todaysSales[currentSaleIndex - 1].id}`)
            .then(response => {
              const harvest = response.data;
              setSelectedCropId(harvest?.fkCultivosVariedadXZonaId || null);
            })
            .catch(error => console.error('Error updating crop ID:', error));
        }
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

  // Handler for new notifications
  const handleNewNotification = () => {
    console.log('[DEBUG] handleNewNotification: Received notification, refreshing data');
    fetchAssignedActivities();
    fetchTodaysInventoryMovements(); // Also fetch movements on notification
    fetchTodaysSales(); // Fetch today's sales data
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
  }, []);

  // Update pie chart when selected crop changes
  useEffect(() => {
    if (selectedCropId) {
      console.log('[DEBUG] Dashboard: selectedCropId changed, fetching pie chart data for:', selectedCropId);
      fetchPieChartData(selectedCropId);
    } else {
      console.log('[DEBUG] Dashboard: No selectedCropId, skipping pie chart fetch');
    }
  }, [selectedCropId]);
  return (
    <div className="bg-gray-50 w-full flex flex-col h-full">

      {/* Grid Layout for Cards - Optimized for no scroll */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - 2 cards */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full">
          {/* Pending Activities Card */}
          <Card
            className="shadow-lg hover:shadow-xl transition-shadow flex-1 relative"
            onMouseEnter={() => setIsActivitiesHovered(true)}
            onMouseLeave={() => setIsActivitiesHovered(false)}
          >
            <CardHeader className="flex items-center gap-3">
              <ClockIcon className="w-8 h-8 text-orange-500" />
              <h3 className="text-lg font-semibold">Actividades Programadas</h3>
            </CardHeader>
            <CardBody className={`transition-transform duration-300 ease-in-out ${isAnimating ? 'transform -translate-y-2' : ''}`}>
              <ul className="space-y-2">
                {assignedActivities.length === 0 ? (
                  <li className="border-l-4 border-orange-500 pl-3 py-2">
                    <p className="text-gray-700">No tienes actividades asignadas</p>
                  </li>
                ) : (
                  currentActivities.map((activity) => (
                    <li key={activity.id} className="border-l-4 border-orange-500 pl-3 py-2">
                      <p className="text-gray-700 font-medium">
                        {activity.actividad?.categoriaActividad?.nombre || 'Sin categoría'}: {activity.actividad?.descripcion || 'Sin descripción'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Zona: {activity.actividad?.cultivoVariedadZona?.zona?.nombre || 'Sin zona'} | Asignado por: {activity.actividad?.responsable?.nombres || 'N/A'} {activity.actividad?.responsable?.apellidos || ''} / {activity.actividad?.responsable?.rol?.nombre || 'Sin rol'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Fecha de asignación: {new Date(activity.fechaAsignacion).toLocaleDateString()}
                      </p>
                    </li>
                  ))
                )}
              </ul>
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
            className="shadow-lg hover:shadow-xl transition-shadow flex-1 relative"
            onMouseEnter={() => setIsMovementsHovered(true)}
            onMouseLeave={() => setIsMovementsHovered(false)}
          >
            <CardHeader className="flex items-center gap-3">
              <ChartBarIcon className="w-8 h-8 text-purple-500" />
              <h3 className="text-lg font-semibold">Últimos Movimientos en Inventario</h3>
            </CardHeader>
            <CardBody className={`transition-transform duration-300 ease-in-out ${isMovementAnimating ? 'transform -translate-y-2' : ''}`}>
              {inventoryMovements.length === 0 ? (
                <p className="text-gray-700">No hay movimientos registrados hoy</p>
              ) : (
                <div className="space-y-2">
                  {currentMovements.map((movement) => (
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
        <div className="lg:col-span-2 flex flex-col gap-6 h-full">
          {/* Welcome and Environmental Data Cards - Side by side with equal height */}
          <div className="flex gap-4 flex-1">
            {/* Environmental Data Card */}
            <Card className="shadow-lg hover:shadow-xl transition-shadow flex-1 flex flex-col">
              <CardHeader className="flex items-center gap-3">
                <BeakerIcon className="w-8 h-8 text-green-500" />
                <h3 className="text-lg font-semibold">
                  Datos del Ambiente<br />
                  Zona Actual
                </h3>
              </CardHeader>
              <CardBody className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-xl font-bold text-green-600">
                  {environmentalMetrics[currentMetricIndex].name}: {environmentalMetrics[currentMetricIndex].value}
                </p>
                <Button
                  color="primary"
                  size="sm"
                  onClick={nextMetric}
                >
                  Siguiente
                </Button>
              </CardBody>
            </Card>

            {/* Welcome Card */}
            <Card className="shadow-lg hover:shadow-xl transition-shadow flex-1 flex flex-col">
              <CardHeader className="flex items-center gap-3">
                <UserIcon className="w-8 h-8 text-blue-500" />
                <div>
                  <h3 className="text-lg font-semibold">¡Bienvenido, {mockUser.name}!</h3>
                  <p className="text-sm text-gray-600">Rol: {mockUser.role}</p>
                </div>
              </CardHeader>
              <CardBody className="flex-1 flex flex-col items-center justify-center text-center">
                <p className="text-gray-700">
                  ¡Hola! Aquí tienes un resumen de tu actividad reciente.
                </p>
              </CardBody>
            </Card>
          </div>

          {/* Today's Sales Card - Centered and slightly taller */}
          <Card
            className="shadow-lg hover:shadow-xl transition-shadow flex-1 relative"
            onMouseEnter={() => setIsMovementsHovered(true)}
            onMouseLeave={() => setIsMovementsHovered(false)}
          >
            <CardHeader className="flex items-center gap-3">
              <CurrencyDollarIcon className="w-8 h-8 text-yellow-500" />
              <h3 className="text-lg font-semibold">Ventas de Hoy</h3>
            </CardHeader>
            <CardBody className={`transition-transform duration-300 ease-in-out ${isMovementAnimating ? 'transform -translate-y-2' : ''}`}>
              {todaysSales.length === 0 ? (
                <p className="text-gray-700">No hay ventas registradas hoy</p>
              ) : (
                <div className="space-y-2">
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
                      <p className="text-sm text-gray-500 mt-1">
                        Venta {currentSaleIndex + 1} de {todaysSales.length}
                      </p>
                    )}
                    <div className="mt-2 w-full h-px bg-gray-200"></div>
                  </div>
                </div>
              )}
            </CardBody>

            {/* Navigation Buttons - Only visible on hover when there are multiple sales */}
            {isMovementsHovered && todaysSales.length > 1 && (
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
          <Card className="shadow-lg hover:shadow-xl transition-shadow flex-1 flex flex-col">
            <CardHeader className="flex items-center gap-3">
              <TruckIcon className="w-8 h-8 text-green-500" />
              <h3 className="text-lg font-semibold">Cosechas de Hoy</h3>
            </CardHeader>
            <CardBody className="flex-1 flex flex-col justify-center">
              {todaysHarvests.length === 0 ? (
                <p className="text-gray-700">No hay cosechas registradas hoy</p>
              ) : (
                <div className="space-y-2">
                  {todaysHarvests.map((harvest, index) => (
                    <div key={harvest.id} className="border-l-4 border-green-500 pl-3 py-2">
                      <p className="text-gray-700 font-medium">
                        {harvest.cultivo}
                      </p>
                      <p className="text-sm text-gray-600">
                        Fecha: {new Date(harvest.fecha).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        Cantidad: {harvest.cantidad} {harvest.unidadMedida}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;