# MAXIPAN — Guía de instalación y arranque

## PASO 1 — Instalar dependencias del sistema

Ejecuta estos comandos en orden en tu terminal (Ubuntu/Debian):

```bash
# Node.js v20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar
node -v   # debe mostrar v20.x.x
npm -v

# MySQL 8
sudo apt update
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql

# Asegurar MySQL (crea contraseña root)
sudo mysql_secure_installation

# RabbitMQ
sudo apt install -y rabbitmq-server
sudo systemctl start rabbitmq-server
sudo systemctl enable rabbitmq-server

# Habilitar panel de administración de RabbitMQ (opcional, útil para debug)
sudo rabbitmq-plugins enable rabbitmq_management
# Panel disponible en: http://localhost:15672  (guest/guest)
```

---

## PASO 2 — Crear bases de datos y usuario MySQL

```bash
# Entrar a MySQL como root
sudo mysql -u root

# Dentro de MySQL ejecuta:
CREATE DATABASE ms_auth     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE ms_ventas   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE ms_inventario CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'maxipan'@'localhost' IDENTIFIED BY 'maxipan_dev_2026';
GRANT ALL PRIVILEGES ON ms_auth.* TO 'maxipan'@'localhost';
GRANT ALL PRIVILEGES ON ms_ventas.* TO 'maxipan'@'localhost';
GRANT ALL PRIVILEGES ON ms_inventario.* TO 'maxipan'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## PASO 3 — Ejecutar los scripts SQL (crear tablas)

Tienes 3 archivos .sql del proyecto. Ejecuta cada uno:

```bash
mysql -u maxipan -pmaxipan_dev_2026 ms_auth < mysql_ms_auth.sql
mysql -u maxipan -pmaxipan_dev_2026 ms_ventas < mysql_ms_ventas.sql
mysql -u maxipan -pmaxipan_dev_2026 ms_inventario < mysql_ms_inventario.sql
```

---

## PASO 4 — Instalar dependencias Node.js de cada microservicio

```bash
# Microservicio de Autenticación
cd ms_auth
npm install
cd ..

# Microservicio de Ventas
cd ms_ventas
npm install
cd ..

# Microservicio de Inventario
cd ms_inventario
npm install
cd ..
```

---

## PASO 5 — Crear primer usuario Administrador

Antes de arrancar, inserta un admin directamente en la BD:

```bash
# Generar hash bcrypt del password (en Node.js, ejecuta esto una vez):
node -e "const b=require('bcrypt'); b.hash('Admin123!', 12).then(h=>console.log(h));"

# Copia el hash que aparece y úsalo en:
mysql -u maxipan -pmaxipan_dev_2026 ms_auth -e "
INSERT INTO usuario (nombre, correo, contrasena_hash, rol)
VALUES ('Administrador', 'admin@maxipan.com', 'PEGA_EL_HASH_AQUI', 'administrador');
"
```

---

## PASO 6 — Arrancar los microservicios

Abre **3 terminales separadas**:

```bash
# Terminal 1 — ms_auth
cd ms_auth
npm run dev

# Terminal 2 — ms_ventas
cd ms_ventas
npm run dev

# Terminal 3 — ms_inventario
cd ms_inventario
npm run dev
```

Deberías ver en cada terminal:
```
[ms_auth] ✓ Servidor corriendo en http://localhost:3001
[ms_auth] ✓ Conectado a MySQL - base de datos: ms_auth
```

---

## PASO 7 — Probar que todo funciona

```bash
# Health checks
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@maxipan.com","contrasena":"Admin123!"}'

# Respuesta esperada:
# { "accessToken": "eyJ...", "refreshToken": "...", "usuario": {...} }
```

---

## Estructura del proyecto

```
maxipan/
├── ms_auth/                    ← Puerto 3001
│   ├── src/
│   │   ├── app.js
│   │   ├── config/db.js
│   │   ├── middleware/auth.js   ← JWT + RBAC
│   │   ├── controllers/
│   │   │   ├── auth.controller.js   ← login, refresh, logout
│   │   │   └── user.controller.js   ← CRUD usuarios
│   │   └── routes/
│   │       ├── auth.routes.js
│   │       └── user.routes.js
│   ├── .env
│   └── package.json
│
├── ms_ventas/                  ← Puerto 3002
│   ├── src/
│   │   ├── app.js
│   │   ├── config/db.js
│   │   ├── middleware/auth.js
│   │   ├── controllers/
│   │   │   └── ventas.controller.js  ← registrar, listar, resumen
│   │   ├── events/
│   │   │   └── publisher.js          ← publica a RabbitMQ
│   │   └── routes/ventas.routes.js
│   ├── .env
│   └── package.json
│
├── ms_inventario/              ← Puerto 3003
│   ├── src/
│   │   ├── app.js
│   │   ├── config/db.js
│   │   ├── middleware/auth.js
│   │   ├── controllers/
│   │   │   ├── inventario.controller.js
│   │   │   ├── recetas.controller.js
│   │   │   ├── lotes.controller.js
│   │   │   └── alertas.controller.js
│   │   ├── events/
│   │   │   └── consumer.js    ← consume venta_registrada, descuenta FIFO
│   │   ├── jobs/
│   │   │   └── vencimientos.job.js  ← cron 6am diario
│   │   └── routes/index.routes.js
│   ├── .env
│   └── package.json
│
└── frontend/                   ← Lo construyes después con React
```

---

## Endpoints disponibles

### ms_auth (3001)
| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | /auth/login | Público | Iniciar sesión |
| POST | /auth/refresh | Público | Renovar access token |
| POST | /auth/logout | Público | Cerrar sesión |
| GET | /usuarios | Admin | Listar usuarios |
| POST | /usuarios | Admin | Crear usuario |
| PUT | /usuarios/:id | Admin | Editar rol/estado |
| DELETE | /usuarios/:id | Admin | Eliminar usuario |

### ms_ventas (3002)
| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| POST | /ventas | Todos | Registrar venta |
| GET | /ventas | Todos | Historial (filtros: fecha_inicio, fecha_fin, producto) |
| GET | /ventas/resumen | Todos | Resumen para Dashboard |

### ms_inventario (3003)
| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| GET | /inventario | Todos | Stock actual |
| POST | /inventario/productos | Admin | Crear producto |
| POST | /inventario/insumos | Admin | Crear insumo |
| DELETE | /inventario/insumos/:id | Admin | Desactivar insumo |
| GET | /recetas/:productoId | Todos | Ver receta |
| POST | /recetas | Admin | Crear/actualizar receta |
| GET | /lotes | Todos | Listar lotes con estado |
| POST | /lotes | Admin | Registrar ingreso de lote |
| GET | /alertas | Todos | Alertas activas |
| GET | /alertas/historial | Todos | Historial de alertas |

---

## Flujo del sistema

```
Empleado registra venta (POST /ventas)
    ↓
ms_ventas guarda en BD + publica evento en RabbitMQ
    ↓
ms_inventario recibe evento 'venta_registrada'
    ↓
Descuenta insumos según receta BOM (política FIFO)
    ↓
Si stock ≤ mínimo → genera alerta automática
    ↓
Dashboard consulta /ventas/resumen + /inventario + /alertas
```
