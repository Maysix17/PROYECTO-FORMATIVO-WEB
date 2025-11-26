# 🚀 Guía de Despliegue - API Nest AgroTic

## 📋 Pre-requisitos

- Docker y Docker Compose
- Node.js 20+ (para desarrollo local)
- PostgreSQL (opcional para desarrollo local)
- Redis (opcional para desarrollo local)

## 🔧 Configuración Inicial

### 1. Variables de Entorno
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores de producción
```

### 2. Instalar Dependencias
```bash
npm install
```

---

## 🐳 Despliegue con Docker (Recomendado)

### Despliegue de Desarrollo
```bash
# Levantar todos los servicios
npm run docker:up

# Ejecutar migraciones
npm run docker:r

# Ejecutar seeders
npm run docker:seed

# Ver logs
npm run docker:logs
```

### Despliegue de Producción
```bash
# Usar docker-compose de producción
docker-compose -f docker-compose.prod.yml up -d --build

# Verificar health check
curl https://tu-dominio.com/health
```

---

## ☁️ Despliegue en la Nube

### Railway (Más Fácil)
1. Conectar repositorio a Railway
2. Railway detecta automáticamente `railway.json`
3. Configurar variables de entorno en Railway dashboard
4. Ejecutar migraciones: `npm run migration:run`
5. Ejecutar seeders: `npm run seed`

### Render
1. Conectar repositorio a Render
2. Usar `render.yaml` para configuración automática
3. Configurar secrets en Render dashboard
4. Despliegue automático

### VPS/Dedicated Server
```bash
# Instalar PM2
npm install -g pm2

# Construir aplicación
npm run build

# Iniciar con PM2
pm2 start dist/main.js --name "api-agrotic"

# Configurar Nginx como proxy reverso
```

---

## 🔍 Verificación del Despliegue

### Health Check
```bash
curl https://tu-api.com/health
# Respuesta esperada:
{
  "status": "ok",
  "timestamp": "2025-01-XX...",
  "service": "API Nest AgroTic",
  "version": "1.0.0"
}
```

### Endpoints Principales
```bash
# Login
curl -X POST https://tu-api.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@example.com","password":"password"}'

# WebSockets
# Abrir https://tu-api.com/socket.io/ en navegador
```

---

## 🔐 Variables de Entorno Requeridas

```env
# Base de Datos
DB_HOST=tu-host-db
DB_PORT=5432
DB_USERNAME=tu-usuario
DB_PASSWORD=tu-password
DB_DATABASE=tu-base-datos

# Redis
REDIS_HOST=tu-host-redis
REDIS_PORT=6379

# JWT
JWT_SECRET=tu-secreto-jwt
JWT_EXPIRATION_TIME=15d
JWT_REFRESH_SECRET=tu-refresh-secret
JWT_REFRESH_EXPIRATION_TIME=30d

# Aplicación
NODE_ENV=production
PORT=3000

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USER=tu-email@gmail.com
MAIL_PASSWORD=tu-app-password
MAIL_FROM=tu-email@gmail.com

# CORS
FRONTEND_URL=https://tu-frontend.com,https://tu-app-expo.com
```

---

## 📊 Monitoreo y Logs

### Ver Logs en Docker
```bash
# Logs de la aplicación
docker logs api_nest_agro_tic

# Logs de base de datos
docker logs mi_proyecto_db

# Logs de Redis
docker logs mi_proyecto_redis
```

### Health Checks
- Railway/Render tienen health checks automáticos
- Para VPS: configurar monitoring con PM2 o similar

---

## 🔄 Actualizaciones

### Con Docker
```bash
# Detener servicios
npm run docker:down

# Reconstruir
npm run docker:up

# Aplicar nuevas migraciones si existen
npm run docker:r
```

### Con Railway/Render
```bash
# Push a main/master activa el despliegue automático
git add .
git commit -m "Update deployment"
git push origin main
```

---

## 🆘 Solución de Problemas

### Error de Conexión a BD
```bash
# Verificar variables de entorno
docker exec api_nest_agro_tic env | grep DB_

# Verificar conectividad
docker exec api_nest_agro_tic nc -zv db 5432
```

### Error de WebSockets
```bash
# Verificar CORS
curl -H "Origin: https://tu-frontend.com" https://tu-api.com/health

# Verificar configuración de Redis
docker exec api_nest_agro_tic redis-cli ping
```

### Error de Migraciones
```bash
# Ejecutar manualmente
docker exec -it api_nest_agro_tic npm run migration:run

# Ver logs detallados
docker exec -it api_nest_agro_tic npm run migration:run -- --verbose
```

---

## 📞 Soporte

Para problemas específicos:
1. Verificar logs del contenedor
2. Comprobar variables de entorno
3. Validar conectividad de red
4. Revisar configuración de CORS

¡El backend está listo para producción! 🎉