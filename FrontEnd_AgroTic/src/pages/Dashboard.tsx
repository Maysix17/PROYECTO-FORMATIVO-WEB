import React, { useState, useEffect, useRef } from 'react';
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
import type { MovimientoInventario } from '../types/movements.types';

// Mock data for prototype
const mockUser = {
  name: 'Juan Pérez',
  role: 'Administrador',
};

const mockLastHarvest = {
  date: '2025-10-30',
  quantity: '500 kg',
  details: 'Tomates orgánicos',
};

const mockLastSale = {
  date: '2025-10-29',
  total: '$2,500',
  products: ['Tomates', 'Lechugas', 'Zanahorias'],
};

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


const pieData = [
  { name: 'Ventas', value: 60, color: '#8884d8' },
  { name: 'Cosechas', value: 30, color: '#82ca9d' },
  { name: 'Otros', value: 10, color: '#ffc658' },
];

const Dashboard: React.FC = () => {
  const [currentMetricIndex, setCurrentMetricIndex] = useState(0);
  const [assignedActivities, setAssignedActivities] = useState<AssignedActivity[]>([]);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [isActivitiesHovered, setIsActivitiesHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Inventory movements state
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [currentMovementIndex, setCurrentMovementIndex] = useState(0);
  const [isMovementsHovered, setIsMovementsHovered] = useState(false);
  const [isMovementAnimating, setIsMovementAnimating] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const autoRotateRef = useRef<number | null>(null);

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
        userId: movement.responsable || 'N/A', // Assuming responsable is the user ID or name
        date: new Date(movement.fechaMovimiento).toLocaleDateString(),
        type: movement.tipoMovimiento?.nombre || 'Tipo desconocido',
        product: movement.lote?.producto?.nombre || 'Producto desconocido',
      }));

      setInventoryMovements(transformedMovements);
      setCurrentMovementIndex(0); // Reset to first movement
    } catch (error) {
      console.error('Error fetching today\'s inventory movements:', error);
      setInventoryMovements([]);
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

  const nextMovementPage = () => {
    if (inventoryMovements.length > 1 && !isMovementAnimating) {
      setIsMovementAnimating(true);
      stopAutoRotation();
      setTimeout(() => {
        setCurrentMovementIndex((prevIndex) =>
          (prevIndex + 1) % inventoryMovements.length
        );
        setIsMovementAnimating(false);
      }, 150);
    }
  };

  const prevMovementPage = () => {
    if (inventoryMovements.length > 1 && !isMovementAnimating) {
      setIsMovementAnimating(true);
      stopAutoRotation();
      setTimeout(() => {
        setCurrentMovementIndex((prevIndex) =>
          prevIndex === 0 ? inventoryMovements.length - 1 : prevIndex - 1
        );
        setIsMovementAnimating(false);
      }, 150);
    }
  };

  // Handler for new notifications
  const handleNewNotification = () => {
    fetchAssignedActivities();
    fetchTodaysInventoryMovements(); // Also fetch movements on notification
  };

  // Use the notifications socket hook
  useNotificationsSocket(handleNewNotification);

  // Auto-rotate effect for inventory movements
  useEffect(() => {
    if (inventoryMovements.length > 1 && isAutoRotating) {
      autoRotateRef.current = window.setInterval(() => {
        setCurrentMovementIndex((prevIndex) =>
          (prevIndex + 1) % inventoryMovements.length
        );
      }, 8000); // 8 seconds for auto-rotation
    } else {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
        autoRotateRef.current = null;
      }
    }

    return () => {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    };
  }, [inventoryMovements.length, isAutoRotating]);

  // Stop auto-rotation when user interacts
  const stopAutoRotation = () => {
    setIsAutoRotating(false);
    if (autoRotateRef.current) {
      clearInterval(autoRotateRef.current);
      autoRotateRef.current = null;
    }
  };

  // Resume auto-rotation after inactivity (currently not used, but kept for future enhancement)
  // const resumeAutoRotation = () => {
  //   setIsAutoRotating(true);
  // };

  useEffect(() => {
    fetchAssignedActivities();
    fetchTodaysInventoryMovements();
  }, []);
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
                  <div className="border-l-4 border-purple-500 pl-3 py-2">
                    <p className="text-gray-700 font-medium">
                      {inventoryMovements[currentMovementIndex].type}: {inventoryMovements[currentMovementIndex].product}
                    </p>
                    <p className="text-sm text-gray-600">
                      Usuario: {inventoryMovements[currentMovementIndex].userName} ({inventoryMovements[currentMovementIndex].userId})
                    </p>
                    <p className="text-sm text-gray-600">
                      Fecha: {inventoryMovements[currentMovementIndex].date}
                    </p>
                  </div>
                </div>
              )}
            </CardBody>

            {/* Navigation Buttons - Only visible on hover */}
            {isMovementsHovered && inventoryMovements.length > 1 && (
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

          {/* Last Sale Card - Centered and slightly taller */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow flex-1 flex flex-col">
            <CardHeader className="flex items-center gap-3">
              <CurrencyDollarIcon className="w-8 h-8 text-yellow-500" />
              <h3 className="text-lg font-semibold">Última Venta</h3>
            </CardHeader>
            <CardBody className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                <div className="flex flex-col justify-center">
                  <p className="text-gray-700"><strong>Fecha:</strong> {mockLastSale.date}</p>
                  <p className="text-gray-700"><strong>Monto Total:</strong> {mockLastSale.total}</p>
                  <p className="text-gray-700"><strong>Productos:</strong> {mockLastSale.products.join(', ')}</p>
                </div>
                <div className="flex justify-center items-center">
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" outerRadius={50}>
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Last Harvest Card */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow flex-1 flex flex-col">
            <CardHeader className="flex items-center gap-3">
              <TruckIcon className="w-8 h-8 text-green-500" />
              <h3 className="text-lg font-semibold">Última Cosecha</h3>
            </CardHeader>
            <CardBody className="flex-1 flex flex-col justify-center">
              <p className="text-gray-700"><strong>Fecha:</strong> {mockLastHarvest.date}</p>
              <p className="text-gray-700"><strong>Cantidad:</strong> {mockLastHarvest.quantity}</p>
              <p className="text-gray-700"><strong>Detalles:</strong> {mockLastHarvest.details}</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;