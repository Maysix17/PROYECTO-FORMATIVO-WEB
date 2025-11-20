# Sistema de Alertas por Umbrales - AgroTic

## Descripción General

El Sistema de Alertas por Umbrales es una funcionalidad avanzada de monitoreo y control que permite a los usuarios definir límites personalizados para sensores IoT en diferentes zonas de cultivo. El sistema procesa datos en tiempo real a través de MQTT y genera alertas visuales instantáneas cuando los valores de los sensores exceden los umbrales configurados.

### Características Principales

- **Configuración Flexible**: Umbrales personalizables por sensor y zona
- **Alertas en Tiempo Real**: Validación instantánea de datos MQTT
- **Dashboard Visual**: Interface intuitiva con códigos de color para alertas
- **Validación Robusta**: Verificación de datos de entrada y estructura
- **Persistencia Eficiente**: Almacenamiento optimizado en PostgreSQL JSONB
- **API RESTful**: Endpoints completos para gestión programática

## Arquitectura del Sistema

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Sensores IoT  │────│    MQTT Broker   │────│   API Backend   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                        │
                                                       │ JSONB
                                                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Dashboard UI    │◄───│   PostgreSQL DB  │◄───│  Umbrales API   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Componentes Principales

1. **Backend (NestJS)**
   - API RESTful para gestión de umbrales
   - Servicio MQTT para procesamiento de datos en tiempo real
   - Validación y persistencia en PostgreSQL
   - Validación automática de datos contra umbrales

2. **Frontend (React + TypeScript)**
   - Modal de configuración de umbrales
   - Dashboard de sensores con alertas visuales
   - Interface intuitiva para gestión de zonas

3. **Base de Datos (PostgreSQL)**
   - Tabla `zona_mqtt_config` con columna JSONB `zmc_umbrales`
   - Índices GIN para búsquedas eficientes
   - Migraciones TypeORM automatizadas

4. **Infraestructura MQTT**
   - Conexiones múltiples a brokers
   - Buffer de datos y persistencia periódica
   - Validación de datos en tiempo real

## Funcionalidades Implementadas

### 1. Gestión de Umbrales
- **Crear Umbrales**: Configurar límites mínimo y máximo por sensor
- **Actualizar Umbrales**: Modificar umbrales existentes
- **Validar Umbrales**: Verificar estructura y rangos de valores
- **Consultar Umbrales**: Obtener umbrales configurados por zona

### 2. Alertas Visuales
- **Indicadores de Estado**: Códigos de color para diferentes estados
  - 🟢 Verde: Valores dentro del rango normal
  - 🟡 Amarillo: Sin umbrales configurados
  - 🔴 Rojo: Valores fuera del rango (alerta alta o baja)
- **Badges Informativos**: Mostrar estado actual del sensor
- **Historial de Alertas**: Seguimiento de valores históricos

### 3. Dashboard Interactivo
- **Vista de Sensores**: Tarjetas con información en tiempo real
- **Gráficos Dinámicos**: Visualización de tendencias históricas
- **Filtros Avanzados**: Filtrar por zona, cultivo, sensor
- **Navegación Intuitiva**: Carrusel de sensores con controles

### 4. API Completa
- `GET /mqtt-config/zona-mqtt/:id/umbrales` - Obtener umbrales
- `PUT /mqtt-config/zona-mqtt/:id/umbrales` - Actualizar umbrales
- `POST /mqtt-config/zona-mqtt/:id/validate-threshold` - Validar valor

## Instrucciones de Instalación y Migración

### Prerrequisitos

- Node.js 18+
- PostgreSQL 13+
- NestJS Backend
- React Frontend
- Broker MQTT (Mosquitto, AWS IoT, etc.)

### Paso 1: Migración de Base de Datos

Ejecutar la migración para agregar soporte de umbrales:

```bash
cd API_Nest_Agro_Tic
npm run typeorm migration:run -- -d src/data-source.ts
```

**Archivos de migración:**
- `src/migrations/20251120183637-add-umbrales-to-zona-mqtt-config.ts`

### Paso 2: Verificación de Migración

Verificar que la columna se creó correctamente:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'zona_mqtt_config' 
AND column_name = 'zmc_umbrales';
```

### Paso 3: Inicialización del Backend

```bash
cd API_Nest_Agro_Tic
npm install
npm run start:dev
```

### Paso 4: Inicialización del Frontend

```bash
cd FrontEnd_AgroTic
npm install
npm run dev
```

### Paso 5: Configuración de Variables de Entorno

**Backend (.env):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/agrotic_db
MQTT_BROKER_URL=mqtt://localhost:1883
JWT_SECRET=your-jwt-secret
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3000
VITE_MQTT_URL=ws://localhost:8083
```

## Tipos de Sensores Soportados

| Sensor | Unidad | Rango Típico | Configuración Recomendada |
|--------|--------|-------------|---------------------------|
| Temperatura | °C | 10-40 | 18-30 |
| Humedad | % | 20-100 | 40-80 |
| pH | pH | 4-9 | 5.5-7.5 |
| Luminosidad | lux | 0-100000 | 20000-50000 |
| Conductividad | µS/cm | 0-5000 | 1000-3000 |
| CO2 | ppm | 0-5000 | 350-1000 |

## Estructura de Datos

### Umbrales (JSONB)
```json
{
  "temperatura": {
    "minimo": 18,
    "maximo": 30
  },
  "humedad": {
    "minimo": 40,
    "maximo": 80
  },
  "ph": {
    "minimo": 6.0,
    "maximo": 7.5
  }
}
```

### Validaciones Implementadas
- ✅ Estructura JSON válida
- ✅ Valores numéricos (minimo < maximo)
- ✅ Rangos lógicos por tipo de sensor
- ✅ Columna JSONB con índices optimizados

## Flujo de Datos

1. **Sensores IoT** → Envían datos a broker MQTT
2. **MQTT Service** → Recibe y procesa datos en tiempo real
3. **Validación** → Compara datos contra umbrales configurados
4. **Persistencia** → Guarda datos en PostgreSQL con estado de alerta
5. **WebSocket** → Emite alertas en tiempo real al frontend
6. **Dashboard** → Muestra alertas visuales y actualización automática

## Monitoreo y Observabilidad

### Logs del Sistema
```bash
# Ver logs del servicio MQTT
tail -f logs/mqtt-service.log

# Ver logs de validación de umbrales
tail -f logs/threshold-validation.log
```

### Métricas Clave
- Número de alertas por zona/sensor
- Tiempo de respuesta de validación
- Uso de memoria por conexiones MQTT
- Rendimiento de consultas JSONB

## Seguridad

### Autenticación y Autorización
- JWT tokens para API endpoints
- Roles de usuario (admin, operator, viewer)
- Validación de permisos por zona

### Validación de Datos
- Sanitización de entrada JSON
- Validación de tipos de sensor conocidos
- Rate limiting en endpoints críticos

## Troubleshooting

### Problemas Comunes

#### 1. Umbrales no se guardan
**Síntoma**: Error 500 al actualizar umbrales
**Solución**:
```bash
# Verificar estructura JSON
curl -X GET "http://localhost:3000/mqtt-config/zona-mqtt/{id}/umbrales"

# Validar formato JSON
echo '{"temperatura":{"minimo":18,"maximo":30}}' | jq .
```

#### 2. Alertas no aparecen en dashboard
**Síntoma**: Sensores muestran valores pero sin estado de alerta
**Solución**:
```sql
-- Verificar que existe zona-mqtt-config activa
SELECT * FROM zona_mqtt_config 
WHERE estado = true 
AND zmc_umbrales != '{}';

-- Verificar umbrales en JSONB
SELECT zmc_id, zmc_umbrales FROM zona_mqtt_config 
WHERE zmc_umbrales ? 'temperatura';
```

#### 3. Migración falla
**Síntoma**: Error al ejecutar migración
**Solución**:
```bash
# Revertir migración si es necesario
npm run typeorm migration:revert -- -d src/data-source.ts

# Verificar conexión a BD
npm run typeorm schema:verify -- -d src/data-source.ts
```

### Herramientas de Diagnóstico

#### API Testing
```bash
# Test de umbrales
curl -X GET "http://localhost:3000/mqtt-config/zona-mqtt/test-id/umbrales"

# Test de validación
curl -X POST "http://localhost:3000/mqtt-config/zona-mqtt/test-id/validate-threshold" \
  -H "Content-Type: application/json" \
  -d '{"sensorType":"temperatura","value":25.5}'
```

#### Verificación de Base de Datos
```sql
-- Verificar estructura de tabla
\d zona_mqtt_config

-- Verificar índice GIN
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'zona_mqtt_config';

-- Probar consulta JSONB
SELECT zmc_id, zmc_umbrales->>'temperatura' as temp_min 
FROM zona_mqtt_config 
WHERE zmc_umbrales ? 'temperatura';
```

## Contribución y Desarrollo

### Estructura del Proyecto
```
├── API_Nest_Agro_Tic/
│   ├── src/
│   │   ├── migrations/           # Migraciones de BD
│   │   ├── mqtt/                 # Servicio MQTT
│   │   ├── zonas/                # Gestión de umbrales
│   │   └── medicion_sensor/      # Procesamiento de datos
│   └── docs/
│       └── MQTT_THRESHOLDS_API.md # Documentación API
├── FrontEnd_AgroTic/
│   ├── src/
│   │   ├── components/
│   │   │   ├── molecules/ThresholdConfigModal.tsx
│   │   │   └── organisms/SensorDashboard.tsx
│   │   └── services/zonasService.ts # Cliente API
```

### Convenciones de Código
- TypeScript estricto
- Documentación en español
- Validación exhaustiva de entrada
- Logging estructurado

### Testing
```bash
# Tests unitarios
npm run test

# Tests de integración
npm run test:e2e

# Cobertura
npm run test:cov
```

## Licencia

Este sistema es parte del proyecto AgroTic - Sistema Integral de Gestión Agrícola.

---

**Última actualización**: 20 de Noviembre, 2025
**Versión**: 1.0.0
**Contacto**: Equipo de Desarrollo AgroTic