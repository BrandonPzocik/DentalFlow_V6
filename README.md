# DentaFlow — Sistema de Gestión Odontológica

Monorepo full-stack para la gestión integral de consultorios odontológicos: pacientes, odontograma, agenda, facturación, obras sociales y comunicación por email con pacientes.

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite + TypeScript |
| UI | Tailwind CSS |
| Estado | Zustand + TanStack Query |
| 3D (odontograma) | Three.js + React Three Fiber |
| Backend | NestJS + Fastify |
| ORM | TypeORM |
| Base de datos | PostgreSQL 16 |
| Auth | JWT (access 15 min + refresh 7 días) |
| Email | Nodemailer + Gmail (contraseña de aplicación) |

## Estructura del proyecto

```
dentaflow/
├── apps/
│   ├── api/          → API REST NestJS (puerto 3000)
│   └── web/          → Frontend React (puerto 5173)
├── packages/
│   └── shared/       → Enums y tipos compartidos (estados de turno, odontograma, roles)
├── landing/          → Sitio estático de presentación (opcional)
└── .github/workflows → CI
```

## Requisitos previos

- Node.js 20+
- pnpm 9+
- PostgreSQL 16 en `localhost:5432`
- Usuario y base `dentaflow` creados

```sql
CREATE USER dentaflow WITH PASSWORD 'dentaflow_secret';
CREATE DATABASE dentaflow OWNER dentaflow;
GRANT ALL PRIVILEGES ON DATABASE dentaflow TO dentaflow;
```

## Instalación y arranque

```bash
# Instalar dependencias (desde la raíz)
pnpm install

# Crear usuario administrador inicial
pnpm db:seed
# o: cd apps/api && pnpm ts-node -r tsconfig-paths/register src/database/seed.ts

# Levantar API + web en paralelo (desde la raíz)
pnpm dev
```

También podés levantar cada app por separado:

```bash
pnpm --filter api dev    # terminal 1
pnpm --filter web dev    # terminal 2
```

## URLs

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| API REST | http://localhost:3000/api |
| Swagger | http://localhost:3000/api/docs |

## Credenciales por defecto (seed)

```
Email:    admin@dentaflow.com
Password: Admin123!
```

---

## Funcionalidades

Resumen por módulo de lo que incluye la aplicación hoy.

### Dashboard

- Vista general del día: cantidad de turnos, atendidos y pendientes.
- Indicadores del mes: pacientes en base, facturación, ausentismo.
- Resumen financiero (cobrado, pendiente, obras sociales pendientes).
- Listado ordenado de la agenda del día con estado de cada turno.

### Pacientes

- Alta y edición de ficha clínica (datos personales, obra social, antecedentes médicos).
- Búsqueda por nombre o DNI y listado paginado.
- Preferencia de contacto por **email** (recordatorios y documentos).
- Ficha del paciente con pestañas:
  - **Odontograma** — ver más abajo.
  - **Estudios** — radiografías e imágenes adjuntas por paciente.
  - **Recetario** — recetas y presupuestos.
  - **Turnos** — historial de citas del paciente.
  - **Historia clínica** — datos médicos y cobertura.
- Exportación del odontograma a PDF.
- Endpoint de pacientes inactivos (API) para campañas de recontacto.

### Odontograma

- Odontograma **2D interactivo** (numeración FDI): selección de diente y cara.
- Registro de prestaciones por diente/cara con historial inmutable.
- Panel **3D** del diente seleccionado (modelo interactivo y caras clicables).
- Formulario unificado de tratamiento debajo del odontograma (sin duplicar formularios).
- Historial de intervenciones por diente en el panel lateral.

### Agenda (turnos)

- Calendario con **vista día** y **vista semana**.
- Horarios visibles según configuración del consultorio (inicio, cierre, días laborables, duración de franja).
- Franjas pasadas deshabilitadas: no se puede agendar en fecha/hora ya cumplida (validación en front y API).
- Detección de **conflictos** de horario por profesional.
- Estados: pendiente, confirmado, confirmado por paciente, en curso, atendido, ausente, cancelado.
- Acciones desde el calendario: cambiar estado, cancelar con motivo, enviar recordatorio por email.
- Creación de turno con búsqueda de paciente, duración, sillón y tipo de prestación.

### Notificaciones (solo email)

- Envío vía **Gmail** (Nodemailer). Sin WhatsApp.
- Al crear un turno: email de **confirmación** con diseño profesional (sin emojis).
- Recordatorio manual desde agenda con enlace de **confirmación de asistencia**.
- Cancelación de turno: email al paciente con detalle y motivo opcional.
- Historial de envíos (éxito / fallo) en la pantalla Notificaciones.
- Envío de mensajes personalizados a un paciente.
- Envío de documentos clínicos por email:
  - Recetas y presupuestos (desde Recetario del paciente).
  - Comprobantes / facturas (desde detalle de factura).
- Modo simulado si no hay credenciales Gmail: registra en log sin enviar correo real.

### Recetario y presupuestos (por paciente)

- Crear **recetas** con medicamentos, dosis, frecuencia y duración.
- Crear **presupuestos** con ítems, dientes, descuentos y validez.
- Historial, impresión/PDF en ventana nueva, envío por email.
- Marcar presupuesto como aceptado.

### Estudios (por paciente)

- Subida de archivos (imágenes/PDF en base64) asociados al paciente.
- Tipos de estudio, diente opcional y notas.
- Listado y eliminación de estudios.

### Facturación

- Comprobantes con numeración automática (prefijo configurable).
- Ítems de prestación, descuentos, métodos de pago (efectivo, tarjetas, transferencia, Mercado Pago, obra social).
- Estados: borrador, emitida, presentada, cobrada, rechazada, cancelada.
- Registro de pagos y saldo pendiente.
- Resumen financiero por rango de fechas.
- **Liquidación por obra social**: reporte e impresión/PDF de prestaciones presentadas en un período.
- Envío del comprobante al paciente por email.

### Obras sociales

- ABM de obras sociales con datos de contacto.
- **Nomenclador** por obra social: código, descripción, arancel.
- Carga rápida de nomenclador de ejemplo (seed).
- Uso de aranceles al facturar con cobertura de obra social.

### Configuración

- **Consultorio**: nombre, dirección, teléfono, email, logo, moneda, prefijo de facturas.
- **Notificaciones**: recordatorios automáticos 48 h / 24 h / 2 h (flags; envío real depende de Gmail).
- **Agenda**: hora de apertura y cierre, días de atención (Lun–Dom), duración de franja del calendario.
- **Mi cuenta**: perfil del usuario logueado y cambio de contraseña.

### Usuarios y seguridad

- Login JWT con refresh.
- Roles: Titular, Odontólogo, Recepcionista, Auxiliar (API de usuarios).
- Rutas privadas en el frontend; documentación OpenAPI en Swagger.

---

## Variables de entorno (`apps/api/.env`)

```env
NODE_ENV=development
PORT=3000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=dentaflow
DB_PASS=dentaflow_secret
DB_NAME=dentaflow

# JWT
JWT_SECRET=cambiar_en_produccion_minimo_32_caracteres
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=cambiar_refresh_en_produccion
JWT_REFRESH_EXPIRES_IN=7d

# CORS (URL del frontend)
CORS_ORIGIN=http://localhost:5173

# Nombre del consultorio (emails y plantillas)
CLINIC_NAME=Mi Consultorio Odontológico

# Email — Gmail (contraseña de aplicación, no la contraseña normal)
GMAIL_USER=tu-correo@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# URL base para links en emails (confirmación de turno)
APP_URL=http://localhost:5173
```

### Configurar Gmail

1. Activar verificación en 2 pasos en la cuenta Google.
2. Crear una [contraseña de aplicación](https://myaccount.google.com/apppasswords) para “Correo”.
3. Copiar `GMAIL_USER` y `GMAIL_APP_PASSWORD` en `.env`.

Sin `GMAIL_*`, los envíos se **simulan** y quedan registrados en el historial de notificaciones.

---

## Scripts útiles (raíz)

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Compila `shared` y levanta API + web |
| `pnpm build` | Build de producción de todos los paquetes |
| `pnpm db:seed` | Crea usuario admin inicial |
| `pnpm lint` | Lint en todo el monorepo |
| `pnpm test` | Tests (si están configurados por paquete) |

---

## Rutas del frontend

| Ruta | Pantalla |
|------|----------|
| `/login` | Inicio de sesión |
| `/dashboard` | Panel principal |
| `/patients` | Listado de pacientes |
| `/patients/new` | Alta de paciente |
| `/patients/:id` | Ficha del paciente |
| `/appointments` | Agenda |
| `/billing` | Facturación |
| `/social-works` | Obras sociales |
| `/notifications` | Notificaciones por email |
| `/settings` | Configuración |

---

## Pendiente / no incluido

- Integración **AFIP** (factura electrónica oficial).
- Recordatorios automáticos por cron (los flags en configuración existen; el disparo programado puede requerir un job externo).
- Endpoint público de confirmación de turno: existe en API (`GET /appointments/confirm/:token`); verificar que esté accesible sin JWT en producción si se usa el link del email.

---

## Licencia

Proyecto privado — uso del consultorio autorizado.
