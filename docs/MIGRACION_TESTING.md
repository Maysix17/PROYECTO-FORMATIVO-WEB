# Guía de Migración y Testing - Sistema de Umbrales

## Comandos de Migración

### Migración de Base de Datos

#### Ejecutar Migración
```bash
cd API_Nest_Agro_Tic

# Ejecutar migración de umbrales
npm run typeorm migration:run -- -d src/data-source.ts

# Verificar que la migración se ejecutó correctamente
npm run typeorm migration:show -- -d src/data-source.ts
```

#### Revertir Migración (si es necesario)
```bash
# Revertir la migración específica
npm run typeorm migration:revert -- -d src/data-source.ts

# Revertir la última migración ejecutada
npm run typeorm migration:revert -- -d src/data-source.ts --to 20251120183636
```

#### Verificar Migración
```bash
# Verificar estado de migraciones
npm run typeorm migration:show -- -d src/data-source.ts

# Verificar esquema de la base de datos
npm run typeorm schema:verify -- -d src/data-source.ts
```

### Migración Manual (alternativa)

Si prefieres ejecutar la migración manualmente:

```sql
-- 1. Agregar columna umbrales
ALTER TABLE "zona_mqtt_config" 
ADD COLUMN "zmc_umbrales" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Crear índice GIN para búsquedas eficientes
CREATE INDEX "idx_zona_mqtt_config_umbrales_gin" 
ON "zona_mqtt_config" USING GIN ("zmc_umbrales");

-- 3. Agregar comentario explicativo
COMMENT ON COLUMN "zona_mqtt_config"."zmc_umbrales" IS 
'Configuración de umbrales de sensores en formato JSON. 
Estructura esperada: {
  "temperatura": {"minimo": 15, "maximo": 30}, 
  "humedad": {"minimo": 40, "maximo": 80}, 
  "ph": {"minimo": 5.5, "maximo": 7.5}
}';
```

### Verificación Post-Migración

```sql
-- Verificar que la columna existe
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'zona_mqtt_config' 
AND column_name = 'zmc_umbrales';

-- Verificar que el índice GIN se creó
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'zona_mqtt_config' 
AND indexname = 'idx_zona_mqtt_config_umbrales_gin';

-- Probar consulta JSONB básica
SELECT id, zmc_umbrales 
FROM zona_mqtt_config 
LIMIT 5;
```

---

## Scripts de Testing Básico

### Tests de Base de Datos

#### Script 1: Verificar Estructura de Tabla
```sql
-- tests/database/verify-table-structure.sql
-- Verificar que la tabla zona_mqtt_config tiene la nueva columna

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'zona_mqtt_config' 
    AND column_name = 'zmc_umbrales';

-- Verificar índice GIN
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'zona_mqtt_config' 
    AND indexname = 'idx_zona_mqtt_config_umbrales_gin';

-- Verificar datos existentes
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN zmc_umbrales != '{}' THEN 1 END) as with_thresholds
FROM zona_mqtt_config;
```

#### Script 2: Test de Operaciones CRUD
```sql
-- tests/database/test-crud-operations.sql
-- 1. Insertar registro de prueba
INSERT INTO zona_mqtt_config (
    id,
    fk_zona_id,
    fk_mqtt_config_id,
    estado,
    zmc_umbrales
) VALUES (
    gen_random_uuid(),
    '123e4567-e89b-12d3-a456-426614174000',
    '123e4567-e89b-12d3-a456-426614174001',
    true,
    '{
        "temperatura": {"minimo": 18, "maximo": 30},
        "humedad": {"minimo": 40, "maximo": 80},
        "ph": {"minimo": 6.0, "maximo": 7.5}
    }'::jsonb
) RETURNING id, zmc_umbrales;

-- 2. Consultar umbrales específicos
SELECT 
    id,
    zmc_umbrales->>'temperatura' as temp_min,
    zmc_umbrales->'humedad'->>'maximo' as humidity_max
FROM zona_mqtt_config 
WHERE zmc_umbrales ? 'temperatura';

-- 3. Actualizar umbrales
UPDATE zona_mqtt_config 
SET zmc_umbrales = zmc_umbrales || '{"luminosidad": {"minimo": 20000, "maximo": 50000}}'::jsonb
WHERE zmc_umbrales ? 'temperatura'
RETURNING id, zmc_umbrales;

-- 4. Limpiar datos de prueba
DELETE FROM zona_mqtt_config 
WHERE fk_zona_id = '123e4567-e89b-12d3-a456-426614174000';
```

#### Script 3: Performance Test
```sql
-- tests/database/test-performance.sql
-- Test de rendimiento de consultas JSONB

-- 1. Crear datos de prueba masiva
DO $$
DECLARE
    i integer;
    zona_id uuid := '123e4567-e89b-12d3-a456-426614174000';
    config_id uuid := '123e4567-e89b-12d3-a456-426614174001';
BEGIN
    FOR i IN 1..1000 LOOP
        INSERT INTO zona_mqtt_config (
            id, fk_zona_id, fk_mqtt_config_id, estado, zmc_umbrales
        ) VALUES (
            gen_random_uuid(), zona_id, config_id, true,
            jsonb_build_object(
                'sensor_' || i, jsonb_build_object('minimo', i * 10, 'maximo', i * 10 + 100)
            )
        );
    END LOOP;
END $$;

-- 2. Test de consulta por key específica
EXPLAIN ANALYZE
SELECT id, zmc_umbrales 
FROM zona_mqtt_config 
WHERE zmc_umbrales ? 'sensor_500';

-- 3. Test de consulta por valor
EXPLAIN ANALYZE
SELECT id, zmc_umbrales->'sensor_500' as threshold
FROM zona_mqtt_config 
WHERE (zmc_umbrales->'sensor_500'->>'minimo')::numeric < 6000;

-- 4. Limpiar datos de prueba
DELETE FROM zona_mqtt_config 
WHERE fk_zona_id = '123e4567-e89b-12d3-a456-426614174000';
```

---

### Tests de API

#### Script de Test Automatizado
```bash
#!/bin/bash
# tests/api/test-umbrales-api.sh

API_BASE_URL="http://localhost:3000"
ZONA_MQTT_CONFIG_ID="test-config-id"

echo "=== Testing Umbrales API ==="

# 1. Test GET umbrales (debería devolver umbrales vacíos o no encontrados)
echo "1. Testing GET /mqtt-config/zona-mqtt/\${ZONA_MQTT_CONFIG_ID}/umbrales"
curl -X GET "\${API_BASE_URL}/mqtt-config/zona-mqtt/\${ZONA_MQTT_CONFIG_ID}/umbrales" \
  -H "Content-Type: application/json" \
  -w "HTTP Status: %{http_code}\n" \
  -o /tmp/response.json

cat /tmp/response.json
echo -e "\n"

# 2. Test PUT umbrales (datos válidos)
echo "2. Testing PUT /mqtt-config/zona-mqtt/\${ZONA_MQTT_CONFIG_ID}/umbrales - Valid Data"
curl -X PUT "\${API_BASE_URL}/mqtt-config/zona-mqtt/\${ZONA_MQTT_CONFIG_ID}/umbrales" \
  -H "Content-Type: application/json" \
  -d '{
    "umbrales": {
      "temperatura": {"minimo": 18, "maximo": 30},
      "humedad": {"minimo": 40, "maximo": 80},
      "ph": {"minimo": 6.0, "maximo": 7.5}
    }
  }' \
  -w "HTTP Status: %{http_code}\n" \
  -o /tmp/response.json

cat /tmp/response.json
echo -e "\n"

# 3. Test PUT umbrales (datos inválidos)
echo "3. Testing PUT /mqtt-config/zona-mqtt/\${ZONA_MQTT_CONFIG_ID}/umbrales - Invalid Data"
curl -X PUT "\${API_BASE_URL}/mqtt-config/zona-mqtt/\${ZONA_MQTT_CONFIG_ID}/umbrales" \
  -H "Content-Type: application/json" \
  -d '{
    "umbrales": {
      "temperatura": {"minimo": 30, "maximo": 20}
    }
  }' \
  -w "HTTP Status: %{http_code}\n" \
  -o /tmp/response.json

cat /tmp/response.json
echo -e "\n"

# 4. Test POST validate-threshold
echo "4. Testing POST /mqtt-config/zona-mqtt/\${ZONA_MQTT_CONFIG_ID}/validate-threshold"
curl -X POST "\${API_BASE_URL}/mqtt-config/zona-mqtt/\${ZONA_MQTT_CONFIG_ID}/validate-threshold" \
  -H "Content-Type: application/json" \
  -d '{
    "sensorType": "temperatura",
    "value": 25.5
  }' \
  -w "HTTP Status: %{http_code}\n" \
  -o /tmp/response.json

cat /tmp/response.json
echo -e "\n"

# 5. Test validation edge cases
echo "5. Testing edge cases"

# Test con valor NaN
curl -X PUT "\${API_BASE_URL}/mqtt-config/zona-mqtt/\${ZONA_MQTT_CONFIG_ID}/umbrales" \
  -H "Content-Type: application/json" \
  -d '{
    "umbrales": {
      "temperatura": {"minimo": "NaN", "maximo": 30}
    }
  }' \
  -w "HTTP Status: %{http_code}\n" \
  -o /tmp/response.json

echo "Response with NaN value:"
cat /tmp/response.json
echo -e "\n"

echo "=== API Testing Complete ==="
```

---

### Tests de Frontend

#### Script de Test de Integración Frontend
```bash
#!/bin/bash
# tests/frontend/test-frontend-integration.sh

FRONTEND_URL="http://localhost:5173"

echo "=== Testing Frontend Integration ==="

# 1. Verificar que el frontend está corriendo
echo "1. Checking if frontend is running..."
curl -I "\${FRONTEND_URL}" --max-time 5 > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Frontend is accessible at \${FRONTEND_URL}"
else
    echo "✗ Frontend is not accessible at \${FRONTEND_URL}"
    echo "Please start the frontend with: cd FrontEnd_AgroTic && npm run dev"
    exit 1
fi

# 2. Test de components threshold
echo "2. Testing ThresholdConfigModal component..."

# Verificar que el archivo existe
if [ -f "FrontEnd_AgroTic/src/components/molecules/ThresholdConfigModal.tsx" ]; then
    echo "✓ ThresholdConfigModal.tsx exists"
else
    echo "✗ ThresholdConfigModal.tsx not found"
    exit 1
fi

# Verificar que las funciones críticas existen
if grep -q "updateUmbrales" "FrontEnd_AgroTic/src/components/molecules/ThresholdConfigModal.tsx"; then
    echo "✓ updateUmbrales function found"
else
    echo "✗ updateUmbrales function not found"
fi

# 3. Test de servicios
echo "3. Testing services..."

if [ -f "FrontEnd_AgroTic/src/services/zonasService.ts" ]; then
    echo "✓ zonasService.ts exists"
    
    if grep -q "umbralesService" "FrontEnd_AgroTic/src/services/zonasService.ts"; then
        echo "✓ umbralesService found in zonasService"
    else
        echo "✗ umbralesService not found in zonasService"
    fi
else
    echo "✗ zonasService.ts not found"
fi

# 4. Test de tipos TypeScript
echo "4. Testing TypeScript types..."

if grep -q "UmbralesConfig" "FrontEnd_AgroTic/src/services/zonasService.ts"; then
    echo "✓ UmbralesConfig type definition found"
else
    echo "✗ UmbralesConfig type definition not found"
fi

echo "=== Frontend Testing Complete ==="
```

---

### Tests de Integración End-to-End

#### Script Completo de Verificación
```bash
#!/bin/bash
# tests/e2e/test-complete-system.sh

set -e  # Exit on any error

echo "=== Complete System Integration Test ==="
echo "This script will test the entire umbrales system"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir resultados
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "\${GREEN}✓\${NC} $2"
    else
        echo -e "\${RED}✗\${NC} $2"
    fi
}

# 1. Verificar dependencias
echo "1. Checking Dependencies"

# Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_result 0 "Node.js is installed: \$NODE_VERSION"
else
    print_result 1 "Node.js is not installed"
    exit 1
fi

# Verificar npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_result 0 "npm is installed: \$NPM_VERSION"
else
    print_result 1 "npm is not installed"
    exit 1
fi

echo ""

# 2. Verificar estructura de archivos
echo "2. Checking File Structure"

# Backend
if [ -d "API_Nest_Agro_Tic" ]; then
    print_result 0 "Backend directory exists"
    
    if [ -f "API_Nest_Agro_Tic/src/migrations/20251120183637-add-umbrales-to-zona-mqtt-config.ts" ]; then
        print_result 0 "Migration file exists"
    else
        print_result 1 "Migration file missing"
    fi
    
    if [ -f "API_Nest_Agro_Tic/src/mqtt_config/dto/update-umbrales.dto.ts" ]; then
        print_result 0 "Backend DTO file exists"
    else
        print_result 1 "Backend DTO file missing"
    fi
else
    print_result 1 "Backend directory missing"
fi

# Frontend
if [ -d "FrontEnd_AgroTic" ]; then
    print_result 0 "Frontend directory exists"
    
    if [ -f "FrontEnd_AgroTic/src/components/molecules/ThresholdConfigModal.tsx" ]; then
        print_result 0 "Frontend modal component exists"
    else
        print_result 1 "Frontend modal component missing"
    fi
else
    print_result 1 "Frontend directory missing"
fi

echo ""

# 3. Verificar que las dependencias están instaladas
echo "3. Checking Dependencies Installation"

cd API_Nest_Agro_Tic
if [ -d "node_modules" ]; then
    print_result 0 "Backend node_modules installed"
else
    echo -e "\${YELLOW}⚠\${NC} Backend dependencies not installed. Run: cd API_Nest_Agro_Tic && npm install"
fi

cd ../FrontEnd_AgroTic
if [ -d "node_modules" ]; then
    print_result 0 "Frontend node_modules installed"
else
    echo -e "\${YELLOW}⚠\${NC} Frontend dependencies not installed. Run: cd FrontEnd_AgroTic && npm install"
fi

cd ..

echo ""

# 4. Test de configuración de variables de entorno
echo "4. Checking Environment Configuration"

if [ -f "API_Nest_Agro_Tic/.env" ]; then
    print_result 0 "Backend .env file exists"
else
    echo -e "\${YELLOW}⚠\${NC} Backend .env file missing"
fi

if [ -f "FrontEnd_AgroTic/.env" ]; then
    print_result 0 "Frontend .env file exists"
else
    echo -e "\${YELLOW}⚠\${NC} Frontend .env file missing"
fi

echo ""

# 5. Validación de código TypeScript
echo "5. TypeScript Validation"

cd API_Nest_Agro_Tic
if npm run build &> /dev/null; then
    print_result 0 "Backend TypeScript compiles successfully"
else
    print_result 1 "Backend TypeScript compilation failed"
    echo "Error details:"
    npm run build 2>&1 | tail -10
fi

cd ../FrontEnd_AgroTic
if npm run build &> /dev/null; then
    print_result 0 "Frontend TypeScript compiles successfully"
else
    print_result 1 "Frontend TypeScript compilation failed"
    echo "Error details:"
    npm run build 2>&1 | tail -10
fi

cd ..

echo ""

# 6. Test básico de API (si el servidor está corriendo)
echo "6. API Basic Tests (requires running server)"

# Verificar si el servidor backend está corriendo
if curl -s "http://localhost:3000" > /dev/null 2>&1; then
    print_result 0 "Backend server is running"
    
    # Test de umbrales
    echo "Testing umbrales endpoint..."
    RESPONSE=$(curl -s "http://localhost:3000/mqtt-config/zona-mqtt/test-id/umbrales")
    if echo "\$RESPONSE" | grep -q "error\|Error"; then
        print_result 0 "Umbrales endpoint responds (with expected error for test-id)"
    else
        print_result 1 "Umbrales endpoint unexpected response"
    fi
else
    echo -e "\${YELLOW}⚠\${NC} Backend server is not running on localhost:3000"
    echo "Start with: cd API_Nest_Agro_Tic && npm run start:dev"
fi

echo ""

# 7. Test de frontend (si está corriendo)
echo "7. Frontend Basic Tests (requires running frontend)"

if curl -s -I "http://localhost:5173" | grep -q "200 OK"; then
    print_result 0 "Frontend server is running"
else
    echo -e "\${YELLOW}⚠\${NC} Frontend server is not running on localhost:5173"
    echo "Start with: cd FrontEnd_AgroTic && npm run dev"
fi

echo ""

# Resumen final
echo "=== Integration Test Summary ==="
echo "If any tests failed, please check the error messages above."
echo ""
echo "To start the complete system:"
echo "1. Backend: cd API_Nest_Agro_Tic && npm run start:dev"
echo "2. Frontend: cd FrontEnd_AgroTic && npm run dev"
echo "3. Database: Ensure PostgreSQL is running"
echo ""
echo "Then run the API tests:"
echo "./tests/api/test-umbrales-api.sh"

echo -e "\${GREEN}Integration test completed!\${NC}"
```

---

## Troubleshooting

### Problemas Comunes y Soluciones

#### 1. Error de Migración
**Problema**: Migration fails with constraint violation
```bash
# Solución: Verificar que no hay conflictos de esquema
npm run typeorm schema:verify -- -d src/data-source.ts

# Si hay conflictos, revertir y volver a ejecutar
npm run typeorm migration:revert -- -d src/data-source.ts
npm run typeorm migration:run -- -d src/data-source.ts
```

#### 2. Error de Validación DTO
**Problema**: `umbrales.property Humedad should not exist`
```typescript
// Solución: Verificar que el DTO esté correctamente configurado
// API_Nest_Agro_Tic/src/mqtt_config/dto/update-umbrales.dto.ts

// Asegurar que la validación acepte strings como keys
export class UpdateUmbralesDto {
  @IsObject()
  @IsThresholdValid()
  umbrales: Record<string, { minimo: number; maximo: number }>;
}
```

#### 3. Error de CORS en Frontend
**Problema**: Frontend no puede comunicarse con backend
```typescript
// Solución: Verificar configuración CORS en main.ts
// API_Nest_Agro_Tic/src/main.ts

app.enableCors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

#### 4. Error de Conexión MQTT
**Problema**: Sensores no muestran datos en tiempo real
```bash
# Verificar logs del servicio MQTT
tail -f API_Nest_Agro_Tic/logs/mqtt.log

# Verificar configuración de broker
curl -I mqtt://localhost:1883

# Reiniciar conexiones MQTT
# (requiere reiniciar el backend)
```

#### 5. Problemas de Rendimiento
**Problema**: Consultas lentas en base de datos
```sql
-- Solución: Verificar índices
\d+ zona_mqtt_config

-- Recrear índice GIN si es necesario
DROP INDEX IF EXISTS idx_zona_mqtt_config_umbrales_gin;
CREATE INDEX idx_zona_mqtt_config_umbrales_gin 
ON zona_mqtt_config USING GIN (zmc_umbrales);

-- Analizar estadísticas de la tabla
ANALYZE zona_mqtt_config;
```

---

## Scripts de Deployment

### Script de Preparación para Producción
```bash
#!/bin/bash
# scripts/deploy-preparation.sh

echo "=== Preparing System for Production ==="

# 1. Verificar variables de entorno de producción
echo "1. Checking production environment variables..."

# Backend
if [ -f "API_Nest_Agro_Tic/.env.production" ]; then
    echo "✓ Production .env file exists for backend"
else
    echo "⚠ Creating .env.production template..."
    cp API_Nest_Agro_Tic/.env.example API_Nest_Agro_Tic/.env.production
fi

# Frontend
if [ -f "FrontEnd_AgroTic/.env.production" ]; then
    echo "✓ Production .env file exists for frontend"
else
    echo "⚠ Creating .env.production template..."
    cp FrontEnd_AgroTic/.env FrontEnd_AgroTic/.env.production
fi

# 2. Ejecutar build de producción
echo "2. Building for production..."

cd API_Nest_Agro_Tic
if npm run build:prod; then
    echo "✓ Backend build successful"
else
    echo "✗ Backend build failed"
    exit 1
fi

cd ../FrontEnd_AgroTic
if npm run build; then
    echo "✓ Frontend build successful"
else
    echo "✗ Frontend build failed"
    exit 1
fi

cd ..

# 3. Ejecutar tests finales
echo "3. Running final tests..."

# Backend tests
cd API_Nest_Agro_Tic
if npm run test; then
    echo "✓ Backend tests passed"
else
    echo "✗ Backend tests failed"
    exit 1
fi

cd ../FrontEnd_AgroTic
if npm run test; then
    echo "✓ Frontend tests passed"
else
    echo "✗ Frontend tests failed"
    exit 1
fi

cd ..

echo ""
echo "=== Production Deployment Ready ==="
echo "Next steps:"
echo "1. Run database migrations on production"
echo "2. Deploy backend to production server"
echo "3. Deploy frontend to CDN/hosting"
echo "4. Configure production environment variables"
echo "5. Start production services"
```

### Script de Rollback
```bash
#!/bin/bash
# scripts/rollback.sh

echo "=== Rolling back umbrales system ==="

# 1. Detener servicios
echo "1. Stopping services..."
pkill -f "npm.*start"
pkill -f "node.*dist"

# 2. Revertir migración de base de datos
echo "2. Reverting database migration..."
cd API_Nest_Agro_Tic
npm run typeorm migration:revert -- -d src/data-source.ts

# 3. Restaurar código anterior (si hay backup)
echo "3. Restoring previous code..."
# Aquí restaurarías el backup si existe

# 4. Reiniciar servicios
echo "4. Restarting services..."
# Reiniciar servicios con la versión anterior

echo "=== Rollback completed ==="
```

---

**Última actualización**: 20 de Noviembre, 2025
**Versión**: 1.0.0