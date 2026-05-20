# 🦷 DentaFlow — Sistema de Gestión Odontológica

Monorepo full-stack con React + NestJS para la gestión integral de consultorios odontológicos.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Estado | Zustand + TanStack Query |
| Backend | NestJS + Fastify |
| ORM | TypeORM |
| Base de datos | PostgreSQL 16 |
| Auth | JWT (access 15min + refresh 7d) |

## Estructura

```
dentaflow/
├── apps/
│   ├── api/          → NestJS backend (puerto 3000)
│   └── web/          → React frontend (puerto 5173)
├── packages/
│   └── shared/       → Tipos y enums compartidos
└── .github/
    └── workflows/    → CI con GitHub Actions
```

## Requisitos previos

- Node.js 20+
- pnpm 9+
- PostgreSQL 16 corriendo en localhost:5432
- Usuario y base de datos `dentaflow` creados

```sql
CREATE USER dentaflow WITH PASSWORD 'dentaflow_secret';
CREATE DATABASE dentaflow OWNER dentaflow;
GRANT ALL PRIVILEGES ON DATABASE dentaflow TO dentaflow;
```

## Instalación y arranque

```bash
# 1. Clonar e instalar
git clone <repo>
cd dentaflow
pnpm install

# 2. Crear usuario admin inicial
cd apps/api
pnpm ts-node -r tsconfig-paths/register src/database/seed.ts

# 3. Levantar backend (terminal 1)
pnpm dev  # desde apps/api

# 4. Levantar frontend (terminal 2)
pnpm dev  # desde apps/web
```

## URLs

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| API REST | http://localhost:3000/api |
| Swagger docs | http://localhost:3000/api/docs |

## Credenciales por defecto

```
Email:    admin@dentaflow.com
Password: Admin123!
```

## Módulos implementados

- ✅ **Auth** — Login JWT, guards por rol
- ✅ **Usuarios** — CRUD con roles (Titular, Odontólogo, Recepcionista, Auxiliar)
- ✅ **Pacientes** — Historia clínica completa, búsqueda, paginación
- ✅ **Odontograma** — SVG interactivo FDI, registro por cara, historial inmutable
- ✅ **Turnos** — Agenda semanal, detección de conflictos, estados
- 🔜 **Obras sociales** — Nomencladores y liquidaciones (próxima fase)
- 🔜 **Notificaciones** — WhatsApp + Email con Twilio/Resend (próxima fase)
- 🔜 **Facturación AFIP** — Facturas electrónicas (próxima fase)

## Variables de entorno (apps/api/.env)

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=dentaflow
DB_PASS=dentaflow_secret
DB_NAME=dentaflow
JWT_SECRET=cambiar_en_produccion
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=cambiar_en_produccion
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```
