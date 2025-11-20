# Guía de Usuario - Configuración de Umbrales

## Introducción

Esta guía te ayudará a configurar y utilizar el sistema de alertas por umbrales para el monitoreo de sensores IoT en tus cultivos. El sistema te permite establecer límites personalizados para diferentes tipos de sensores y recibir alertas visuales cuando los valores estén fuera del rango esperado.

## Acceso al Sistema de Umbrales

### Paso 1: Acceder al Dashboard IoT

1. Inicia sesión en el sistema AgroTic
2. Navega al menú **"Gestión de IoT"** desde el panel principal
3. Verás el **Dashboard de Sensores** con la información en tiempo real

### Paso 2: Localizar el Botón de Configuración

En la parte superior del dashboard, en la barra de herramientas, encontrarás el botón:

```
┌─────────────────────────────────────────────────────────┐
│  Gestión de IOT              🔍 Buscar  ⚙️ Configurar   │
│                                 Sensores   Umbrales     │
└─────────────────────────────────────────────────────────┘
```

**Botón "Configurar Umbrales"**: Color naranja, ubicado en la barra de herramientas superior.

## Configuración de Umbrales por Sensor

### Paso 1: Seleccionar Configuración de Zona-MQTT

Al hacer clic en **"Configurar Umbrales"**, el sistema mostrará las configuraciones disponibles:

**Si tienes una sola configuración activa:**
- Se abrirá directamente el modal de configuración

**Si tienes múltiples configuraciones activas:**
- Aparecerá una lista para seleccionar la configuración deseada:

```
┌─────────────────────────────────────────────────────────┐
│  Seleccionar Configuración de Zona-MQTT                  │
├─────────────────────────────────────────────────────────┤
│  🌱 Zona Norte                                          │
│     Configuración Principal                             │
│     ➜                                                 │
│                                                         │
│  🌾 Zona Sur                                            │
│     Configuración Secundaria                           │
│     ➜                                                 │
└─────────────────────────────────────────────────────────┘
```

### Paso 2: Configurar Umbrales por Sensor

Una vez seleccionado, se abrirá el modal de configuración:

```
┌─────────────────────────────────────────────────────────┐
│  Configuración de Umbrales de Sensores                  │
├─────────────────────────────────────────────────────────┤
│  📋 Configuración: [ID-de-Configuración]                │
│  🔧 Sensores disponibles: 6                            │
│                                                         │
│  ┌──────────┬──────────┬──────────┐                    │
│  │  Sensor  │ Mínimo   │  Máximo  │                    │
│  ├──────────┼──────────┼──────────┤                    │
│  │temperatura│    20    │    30    │  ❌ Mínimo debe   │
│  │          │          │          │     ser menor que  │
│  │humedad   │    50    │    70    │     el máximo     │
│  │          │          │          │                    │
│  │ph        │   6.5    │   7.5    │                    │
│  └──────────┴──────────┴──────────┘                    │
└─────────────────────────────────────────────────────────┘
```

#### Campos de Configuración:

**Sensor**: Nombre del tipo de sensor (temperatura, humedad, pH, etc.)
**Mínimo**: Valor mínimo aceptable para el sensor
**Máximo**: Valor máximo aceptable para el sensor

#### Validaciones Automáticas:

✅ **Validación en Tiempo Real**: El sistema valida mientras escribes
✅ **Rangos Lógicos**: Verifica que mínimo < máximo
✅ **Valores Numéricos**: Solo acepta números válidos
✅ **Sin Umbrales**: Los sensores sin umbrales operan sin límites

### Paso 3: Aplicar y Guardar

Después de configurar todos los umbrales deseados:

1. **Revisar**: Verifica que todos los valores sean correctos
2. **Guardar**: Haz clic en **"Guardar Umbrales"** (botón verde)
3. **Confirmación**: El sistema mostrará "Umbrales actualizados exitosamente"
4. **Cerrar**: El modal se cerrará automáticamente después de 2 segundos

## Interpretación de Alertas Visuales

### Estados de Sensores

Una vez configurados los umbrales, los sensores mostrarán diferentes estados:

#### 🟢 **Estado Normal** (Verde)
- **Significado**: El valor actual está dentro del rango configurado
- **Tarjeta**: Fondo verde claro, borde verde
- **Badge**: "✅ Normal"
- **Acción**: No se requiere intervención

#### 🔴 **Alerta Baja** (Rojo)
- **Significado**: El valor está por debajo del mínimo configurado
- **Tarjeta**: Fondo rojo claro, borde rojo
- **Badge**: "⚠️ Alerta Baja"
- **Acción**: Revisar condiciones ambientales

#### 🔴 **Alerta Alta** (Rojo)
- **Significado**: El valor está por encima del máximo configurado
- **Tarjeta**: Fondo rojo claro, borde rojo
- **Badge**: "⚠️ Alerta Alta"
- **Acción**: Tomar medidas correctivas inmediatas

#### 🟡 **Sin Umbrales** (Amarillo)
- **Significado**: No hay umbrales configurados para este sensor
- **Tarjeta**: Fondo azul-verde claro, borde azul
- **Badge**: "🔧 Sin Umbrales"
- **Acción**: Considera configurar umbrales para mejor monitoreo

### Información Mostrada en las Tarjetas

Cada tarjeta de sensor muestra:

```
┌─────────────────────────────────────────────┐
│  🌡️ Temperatura           ✅ Normal        │
├─────────────────────────────────────────────┤
│                                             │
│           25.8 °C                         │
│      (Valor actual en grande)              │
│                                             │
│  Última actualización: 14:32:15            │
│  Rango: 20 - 30 °C                        │
│                                             │
│  🏞️ Zona Norte                              │
│  🌱 Cultivos: Tomate, Lechuga              │
└─────────────────────────────────────────────┘
```

**Elementos Informativos:**
- **Valor Actual**: El último valor leído del sensor
- **Última Actualización**: Timestamp de la última lectura
- **Rango**: Umbrales configurados (si están definidos)
- **Ubicación**: Nombre de la zona
- **Cultivos**: Tipos de cultivo en la zona

## Ejemplos Prácticos de Configuración

### Ejemplo 1: Cultivo de Tomate en Invernadero

**Sensores y umbrales recomendados:**

```
Temperatura:    18°C - 26°C    (óptimo para crecimiento)
Humedad:        60% - 80%      (ambiente controlado)
pH:            6.0 - 7.0      (suelo ácido controlado)
Luminosidad:   20000 - 40000 lux (luz suficiente)
```

**Configuración paso a paso:**
1. Accede a "Configurar Umbrales"
2. Selecciona la zona del invernadero
3. Ingresa los valores mínimos y máximos para cada sensor
4. Guarda la configuración
5. Monitorea las alertas en el dashboard

### Ejemplo 2: Cultivo de Maíz al Aire Libre

**Sensores y umbrales más flexibles:**

```
Temperatura:    15°C - 35°C    (resistente a variaciones)
Humedad:        40% - 90%      (dependiente del clima)
pH:            5.5 - 7.5      (suelo natural)
CO2:           350 - 1000 ppm  (nivel ambiente normal)
```

### Ejemplo 3: Cultivo de Lechuga Hidropónica

**Control más estricto:**

```
Temperatura:    16°C - 20°C    (muy sensible)
Humedad:        70% - 85%      (ambiente húmedo controlado)
pH:            5.5 - 6.5      (nutrición líquida)
Conductividad:  1000 - 2500 µS/cm (nutrientes disueltos)
```

## Visualización de Tendencias

### Gráfico de Tiempo Real

El dashboard incluye un gráfico interactivo que muestra:

- **Eje X**: Tiempo (últimas lecturas)
- **Eje Y**: Valores del sensor
- **Líneas Colores**: Diferentes sensores
- **Leyenda**: Selección de sensores a mostrar

**Controles del gráfico:**
- **Seleccionar Sensores**: Botones a la derecha del gráfico
- **Limpiar Todo**: Quitar todas las selecciones
- **Navegación Temporal**: Automático con los datos más recientes

### Carrusel de Sensores

Cuando tienes muchos sensores:

```
◀ [Sensor 1] [Sensor 2] [Sensor 3] [Sensor 4] ▶
```

- **Flechas Izquierda/Derecha**: Navegar entre grupos de 4 sensores
- **Scroll Automático**: Al llegar al final, vuelve al inicio
- **Estado Persistente**: Recuerda la selección al navegar

## Configuración por Zonas Múltiples

### Gestión de Múltiples Configuraciones

Si manejas varias zonas con diferentes configuraciones:

1. **Identificar Configuraciones Activas**: Cada zona puede tener su propia configuración
2. **Seleccionar Configuración Específica**: El sistema permite cambiar entre configuraciones
3. **Umbrales Independientes**: Cada zona puede tener rangos diferentes
4. **Vista Unificada**: El dashboard muestra todas las zonas simultáneamente

### Mejores Prácticas por Zona

**Zona Norte (Invernadero):**
- Umbrales más estrictos
- Control automatizado
- Alertas inmediatas

**Zona Sur (Campo Abierto):**
- Umbrales más flexibles
- Consideración de factores climáticos
- Alertas de tendencias

**Zona Este (Área de Cultivo Experimental):**
- Umbrales variables según experimentos
- Configuración dinámica
- Monitoreo intensivo

## Resolución de Problemas Comunes

### Problema 1: "No hay configuraciones disponibles"

**Causa**: No hay zonas con configuraciones MQTT activas
**Solución**:
1. Verifica que las zonas tengan configuraciones MQTT asignadas
2. Asegúrate de que las configuraciones estén activas (estado = true)
3. Contacta al administrador para configurar las zonas

### Problema 2: "Error al guardar umbrales"

**Causa**: Formato inválido o valores incorrectos
**Solución**:
1. Verifica que el mínimo sea menor que el máximo
2. Asegúrate de que ambos valores sean números válidos
3. Revisa que no hayas dejado campos vacíos obligatorios

### Problema 3: Sensores no muestran estado de alerta

**Causa**: Umbrales no se aplicaron o zona no activa
**Solución**:
1. Confirma que la zona tiene una configuración MQTT activa
2. Verifica que los umbrales se guardaron correctamente
3. Recarga la página para actualizar el estado

### Problema 4: Alertas no aparecen en tiempo real

**Causa**: Conexión MQTT inactiva o datos no llegando
**Solución**:
1. Verifica la conexión a internet
2. Confirma que los sensores están enviando datos
3. Revisa la configuración del broker MQTT

## Tips y Recomendaciones

### 📋 Lista de Verificación Antes de Configurar

- [ ] Identificar todos los sensores disponibles en la zona
- [ ] Investigar rangos óptimos para cada tipo de cultivo
- [ ] Considerar factores ambientales locales
- [ ] Definir protocolos de respuesta para alertas
- [ ] Establecer frecuencia de revisión de umbrales

### 🎯 Optimización de Umbrales

1. **Comienza con Rangos Amplios**: Ajusta gradualmente basándose en datos históricos
2. **Considera Variaciones Diurnas**: Temperatura y luz varían durante el día
3. **Monitorea Tendencias**: Los valores sostenidos importan más que picos ocasionales
4. **Documenta Cambios**: Registra por qué ajustas los umbrales

### ⚠️ Gestión de Alertas

- **No Ignorar Alertas Persistentes**: Indican problemas reales
- **Revisa Múltiples Sensores**: Una alerta puede afectar varios parámetros
- **Considera Contexto**: Lluvia, fertilización, etc. pueden afectar lecturas
- **Actúa Proactivamente**: Las alertas son herramientas de prevención

## Soporte y Contacto

Para soporte adicional:
- **Documentación Técnica**: Ver `DOCUMENTACION_TECNICA.md`
- **Comandos de Migración**: Ver `MIGRACION_TESTING.md`
- **API Reference**: Ver `MQTT_THRESHOLDS_API.md`

---

**Última actualización**: 20 de Noviembre, 2025
**Versión**: 1.0.0