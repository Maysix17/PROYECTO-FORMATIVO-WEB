# API de Gestión de Umbrales MQTT

Esta documentación describe los endpoints implementados para la gestión de umbrales en configuraciones MQTT de zonas.

## Endpoints Implementados

### 1. Obtener Umbrales
**Endpoint:** `GET /mqtt-config/zona-mqtt/:id/umbrales`

**Descripción:** Obtiene los umbrales configurados para una zona MQTT específica.

**Parámetros:**
- `id` (path): ID de la configuración zona-mqtt

**Respuesta Exitosa (200):**
```json
{
  "id": "uuid-de-la-config",
  "fkZonaMqttConfigId": "uuid-de-la-config",
  "umbrales": {
    "temperatura": {
      "minimo": 15,
      "maximo": 35
    },
    "humedad": {
      "minimo": 40,
      "maximo": 80
    }
  },
  "estado": true,
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z",
  "zonaNombre": "Zona Norte",
  "mqttConfigNombre": "Configuración Principal",
  "mqttConfigHost": "broker.example.com",
  "mqttConfigPort": 1883
}
```

**Errores:**
- `404 Not Found`: Si la configuración zona-mqtt no existe

---

### 2. Actualizar Umbrales
**Endpoint:** `PUT /mqtt-config/zona-mqtt/:id/umbrales`

**Descripción:** Actualiza los umbrales para una zona MQTT específica.

**Parámetros:**
- `id` (path): ID de la configuración zona-mqtt
- `umbrales` (body): Objeto con los nuevos umbrales

**Cuerpo de la Petición:**
```json
{
  "umbrales": {
    "temperatura": {
      "minimo": 18,
      "maximo": 32
    },
    "humedad": {
      "minimo": 45,
      "maximo": 75
    },
    "ph": {
      "minimo": 6.0,
      "maximo": 7.5
    }
  }
}
```

**Validaciones:**
- Cada umbral debe tener `minimo < maximo`
- Ambos valores deben ser números positivos
- La estructura debe ser un objeto válido

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Umbrales actualizados exitosamente",
  "data": {
    "id": "uuid-de-la-config",
    "fkZonaMqttConfigId": "uuid-de-la-config",
    "umbrales": {
      "temperatura": {
        "minimo": 18,
        "maximo": 32
      },
      "humedad": {
        "minimo": 45,
        "maximo": 75
      },
      "ph": {
        "minimo": 6.0,
        "maximo": 7.5
      }
    },
    "estado": true,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "zonaNombre": "Zona Norte",
    "mqttConfigNombre": "Configuración Principal",
    "mqttConfigHost": "broker.example.com",
    "mqttConfigPort": 1883
  },
  "timestamp": "2023-01-01T12:00:00.000Z"
}
```

**Errores:**
- `400 Bad Request`: Si los umbrales no cumplen con las validaciones
- `404 Not Found`: Si la configuración zona-mqtt no existe

---

### 3. Validar Umbrales
**Endpoint:** `POST /mqtt-config/zona-mqtt/:id/validate-threshold`

**Descripción:** Valida si un valor específico excede los umbrales establecidos para un tipo de sensor.

**Parámetros:**
- `id` (path): ID de la configuración zona-mqtt

**Cuerpo de la Petición:**
```json
{
  "sensorType": "temperatura",
  "value": 25.5
}
```

**Validaciones:**
- `sensorType`: Debe ser un string
- `value`: Debe ser un número

**Respuesta Exitosa (200):**
```json
{
  "exceeds": false,
  "threshold": {
    "minimo": 18,
    "maximo": 32
  },
  "message": "El valor 25.5 está dentro del rango permitido [18, 32]"
}
```

**Ejemplo cuando excede el umbral:**
```json
{
  "exceeds": true,
  "threshold": {
    "minimo": 18,
    "maximo": 32
  },
  "message": "El valor 35.2 está fuera del rango permitido [18, 32]"
}
```

**Ejemplo cuando no hay umbrales definidos:**
```json
{
  "exceeds": false,
  "message": "No hay umbrales definidos para el tipo de sensor: luminosidad"
}
```

**Errores:**
- `400 Bad Request`: Si los parámetros no son válidos
- `404 Not Found`: Si la configuración zona-mqtt no existe

---

## Estructura de Datos

### Umbrales
Los umbrales se almacenan como un objeto JSON donde cada clave representa un tipo de sensor:

```json
{
  "sensorType": {
    "minimo": number,
    "maximo": number
  }
}
```

**Tipos de Sensores Comunes:**
- `temperatura`: Temperatura en grados Celsius
- `humedad`: Humedad relativa en porcentaje
- `ph`: Nivel de pH
- `luminosidad`: Intensidad lumínica
- `conductividad`: Conductividad eléctrica
- `co2`: Concentración de CO2

### Estados de Respuesta

#### Success (success: true)
Cuando la operación se completa exitosamente.

#### Error (success: false)
Cuando hay un error en la operación:
- `404`: Recurso no encontrado
- `400`: Datos de entrada inválidos
- `500`: Error interno del servidor

## Ejemplos de Uso

### Ejemplo 1: Configurar Umbrales Básicos
```bash
curl -X PUT "http://localhost:3000/mqtt-config/zona-mqtt/123e4567-e89b-12d3-a456-426614174000/umbrales" \
  -H "Content-Type: application/json" \
  -d '{
    "umbrales": {
      "temperatura": {"minimo": 20, "maximo": 30},
      "humedad": {"minimo": 50, "maximo": 70}
    }
  }'
```

### Ejemplo 2: Obtener Umbrales
```bash
curl -X GET "http://localhost:3000/mqtt-config/zona-mqtt/123e4567-e89b-12d3-a456-426614174000/umbrales"
```

### Ejemplo 3: Validar un Valor
```bash
curl -X POST "http://localhost:3000/mqtt-config/zona-mqtt/123e4567-e89b-12d3-a456-426614174000/validate-threshold" \
  -H "Content-Type: application/json" \
  -d '{
    "sensorType": "temperatura",
    "value": 28.5
  }'
```

## Consideraciones Técnicas

### Validaciones Implementadas
1. **Validación de Estructura**: Verifica que los umbrales tengan la estructura correcta
2. **Validación de Rangos**: Asegura que `minimo < maximo`
3. **Validación de Tipos**: Verifica que los valores sean números positivos
4. **Validación de Existencia**: Verifica que la configuración zona-mqtt existe

### Manejo de Errores
- **404 Not Found**: Se lanza cuando no se encuentra la configuración zona-mqtt
- **400 Bad Request**: Se lanza cuando los datos de entrada no cumplen con las validaciones
- **500 Internal Server Error**: Para errores no controlados

### Integración con el Sistema
- Los umbrales se almacenan en el campo `umbrales` de la entidad `ZonaMqttConfig`
- Se utiliza el tipo de dato `jsonb` de PostgreSQL para flexibilidad
- La validación se puede integrar con el sistema de notificaciones MQTT

## Actualizaciones Recientes

### Versión 1.0.0 (2025-11-20)
- Implementación inicial de endpoints de umbrales
- Validaciones completas de datos de entrada
- Documentación completa en español
- Manejo robusto de errores
- Integración con el sistema MQTT existente