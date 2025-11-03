import React, { useState } from 'react';
import { Card, CardHeader, CardBody, Button } from '@heroui/react';
import {
  UserIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

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

const mockLastInventoryMovement = {
  user: 'María García',
  date: '2025-10-28',
  type: 'Entrada',
  products: ['Fertilizante X: 100 unidades', 'Semillas Y: 50 paquetes'],
};

const mockPendingActivities = [
  { id: 1, name: 'Riego en Zona A', date: '2025-10-31', time: '08:00', priority: 'Alta' },
  { id: 2, name: 'Cosecha de Tomates', date: '2025-11-01', time: '10:00', priority: 'Media' },
  { id: 3, name: 'Aplicación de Fertilizante', date: '2025-11-02', time: '14:00', priority: 'Baja' },
];

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

  const nextMetric = () => {
    setCurrentMetricIndex((prevIndex) =>
      (prevIndex + 1) % environmentalMetrics.length
    );
  };
  return (
    <div className="bg-gray-50 w-full flex flex-col h-full">

      {/* Grid Layout for Cards - Optimized for no scroll */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - 2 cards */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full">
          {/* Pending Activities Card */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow flex-1">
            <CardHeader className="flex items-center gap-3">
              <ClockIcon className="w-8 h-8 text-orange-500" />
              <h3 className="text-lg font-semibold">Actividades Programadas</h3>
            </CardHeader>
            <CardBody>
              <ul className="space-y-2">
                {mockPendingActivities.map((activity) => (
                  <li key={activity.id} className="border-l-4 border-orange-500 pl-3 py-2">
                    <p className="text-gray-700 font-medium">{activity.name}</p>
                    <p className="text-sm text-gray-600">
                      {activity.date} - {activity.time} | Prioridad: {activity.priority}
                    </p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {/* Last Inventory Movement Card */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow flex-1">
            <CardHeader className="flex items-center gap-3">
              <ChartBarIcon className="w-8 h-8 text-purple-500" />
              <h3 className="text-lg font-semibold">Último Movimiento en Inventario</h3>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700"><strong>Usuario:</strong> {mockLastInventoryMovement.user}</p>
              <p className="text-gray-700"><strong>Fecha:</strong> {mockLastInventoryMovement.date}</p>
              <p className="text-gray-700"><strong>Tipo:</strong> {mockLastInventoryMovement.type}</p>
              <p className="text-gray-700"><strong>Productos:</strong></p>
              <ul className="list-disc list-inside text-gray-700">
                {mockLastInventoryMovement.products.map((product, index) => (
                  <li key={index}>{product}</li>
                ))}
              </ul>
            </CardBody>
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