# Desplegar el frontend en Vercel (conectado a la API en Render)

Guía para tener una URL pública del sistema (demo para clientes) y enlazarla con el backend que ya corre en Render.

---

## Arquitectura recomendada (demo / primeros clientes)

| Pieza | Dónde | URL ejemplo |
|-------|--------|-------------|
| **Frontend** (React) | Vercel | `https://dentaflow.vercel.app` |
| **API** (NestJS) | Render | `https://dentaflow-api-s3u3.onrender.com` |
| **Base de datos** | Render Postgres | (interna a Render) |
| **WhatsApp** | Twilio → webhook en Render | `.../api/whatsapp/webhook` |

Más adelante, cada consultorio puede usar **su propio dominio** (ej. `agenda.drgarcia.com.ar`) apuntando al mismo deploy de Vercel o a una instancia dedicada.

---

## 1. Requisitos

- Código en **GitHub** (mismo repo que usa Render).
- API en Render funcionando: probá `https://TU-API.onrender.com/api/health`.
- Cuenta en [vercel.com](https://vercel.com) (login con GitHub).

---

## 2. Importar el proyecto en Vercel

1. **Add New…** → **Project**.
2. Importá el repositorio `dentaflow_6` (o el nombre que tengas).
3. Vercel puede detectar el monorepo. Dejá la **raíz del repo** (no solo `apps/web`); el archivo `vercel.json` en la raíz ya define build y salida.

### Ajustes en la pantalla de deploy

| Campo | Valor |
|--------|--------|
| **Framework Preset** | Vite (o Other si no detecta) |
| **Root Directory** | `.` (raíz del monorepo) |
| **Build Command** | `pnpm -w run build:vercel` (no uses `pnpm run build` — eso compila la API y falla). Si Root Directory es `apps/web`, el `-w` es obligatorio. |
| **Output Directory** | `dist` (el script `build:vercel` copia `apps/web/dist` → `dist` en la raíz) |
| **Install Command** | `NODE_ENV=development pnpm install --frozen-lockfile` |

> Si en el panel de Vercel ves **Override** activado en Build/Install, desactivalo o pegá exactamente los valores de arriba. El error `Cannot find module '@dentaflow/shared'` aparece cuando Vercel ejecuta `pnpm run build` (incluye la API) sin compilar `packages/shared` antes.

4. **Environment Variables** (importante):

```env
VITE_API_URL=https://dentaflow-api-s3u3.onrender.com/api
```

Reemplazá por la URL **real** de tu servicio en Render (Settings → dominio + `/api` al final).

5. **Deploy**.

La primera build puede tardar 2–4 minutos (instala todo el monorepo).

---

## 3. Conectar el backend (CORS y emails)

En **Render** → servicio **dentaflow-api** → **Environment**, actualizá:

```env
CORS_ORIGIN=https://TU-PROYECTO.vercel.app
APP_URL=https://TU-PROYECTO.vercel.app
```

Varios orígenes (producción + preview Vercel + local), separados por coma:

```env
CORS_ORIGIN=https://dentaflow.vercel.app,https://dentaflow-git-main-tuuser.vercel.app,http://localhost:5173
```

**Manual Deploy** en Render después de guardar variables.

Probá:

1. Abrí `https://TU-PROYECTO.vercel.app`
2. Login: `admin@dentaflow.com` / `Admin123!` (si corriste seed en producción)
3. Crear un paciente / turno y ver que la API responde (sin errores CORS en la consola del navegador F12).

---

## 4. Dominio propio (cuando un cliente compra)

Sí: lo habitual es que **cada odontólogo compre su dominio** (ej. en DonWeb, NIC Argentina, Cloudflare) y vos lo configurás:

1. **Vercel** → proyecto → **Settings** → **Domains** → agregar `app.drgarcia.com.ar`.
2. En el DNS del cliente: registro **CNAME** `app` → `cname.vercel-dns.com` (Vercel te muestra el valor exacto).
3. En Render, actualizá `CORS_ORIGIN` y `APP_URL` a `https://app.drgarcia.com.ar`.

No hace falta otro servidor: el mismo deploy de Vercel sirve con varios dominios (o un deploy por cliente si querés aislamiento total).

**Landing** (`landing/index.html`) puede ir en otro proyecto Vercel estático o en el mismo dominio con path `/` en otro repo.

---

## 5. WhatsApp: sandbox vs producción real

### Para mostrar a clientes (demo)

| Qué | Cómo |
|-----|------|
| Costo | **Gratis** (Twilio sandbox) |
| Número que ve el paciente | Número de prueba de Twilio (+1 415…), **no** el celular del odontólogo |
| Paciente | Debe enviar `join <código>` al sandbox una vez |
| Webhook | `https://TU-API.onrender.com/api/whatsapp/webhook` en Twilio Sandbox |

Sirve para enseñar botones Confirmar / Cancelar y el dashboard, pero **no** es el WhatsApp “oficial” del consultorio.

### Para un consultorio en producción (número “de la clínica”)

No es “comprar WhatsApp del odontólogo personal” como app normal. El flujo profesional es:

1. **WhatsApp Business API** (vía **Twilio** u otro BSP).
2. **Número dedicado** para la clínica:
   - Comprar un número nuevo en Twilio (Argentina: disponibilidad según Twilio), **o**
   - En algunos casos migrar un número fijo/celular de la clínica a WhatsApp Business (proceso con Meta, varias semanas).
3. **Verificación de negocio** en Meta (Business Manager): nombre del consultorio, categoría salud, etc.
4. **Plantillas de mensaje** aprobadas por Meta para recordatorios (fuera de la ventana de 24 h).
5. **Costos orientativos** (varían por país y volumen):
   - Twilio: cuenta + consumo por mensaje (entrante/saliente).
   - Meta/WhatsApp: tarifa por conversación (marketing, utilidad, servicio).
   - No hay “plan mensual fijo de WhatsApp” único: pagás uso + número.

**Para tu modelo de negocio (vos vendés DentaFlow a varios dentistas):**

| Modelo | Descripción |
|--------|-------------|
| **A – Vos operás Twilio** | Una cuenta Twilio tuya; cada cliente tiene subcuenta o etiqueta; cobrás fee + mensajes. |
| **B – Cliente trae Twilio** | El odontólogo crea cuenta Twilio, verifica su negocio, pone **sus** `TWILIO_*` en Render (o en un panel que armes). |
| **C – Demo sandbox** | Solo ferias / prueba; sin número real del cliente. |

El paciente **siempre** escribe al número **Business** registrado (ej. `+54 9 11 xxxx`), no al WhatsApp personal del doctor.

---

## 6. Checklist producción “presentable”

- [ ] API Render: health OK, `SEED_ON_START=false` después del primer admin.
- [ ] Vercel: `VITE_API_URL` apuntando a Render `/api`.
- [ ] Render: `CORS_ORIGIN` + `APP_URL` = URL de Vercel.
- [ ] Twilio: webhook POST a `/api/whatsapp/webhook`, variables `TWILIO_*` en Render (sin typo `WILIO_`).
- [ ] Pacientes de demo con teléfono internacional (`54911...`) y WhatsApp activo en ficha.
- [ ] (Opcional) Gmail en Render para emails reales.
- [ ] Avisar que el plan **free de Render** duerme ~1 min la primera carga (normal en demo).

---

## 7. Comandos útiles

Build local igual que Vercel:

```bash
pnpm --filter @dentaflow/shared build
pnpm --filter web build
# Preview:
pnpm --filter web preview
```

Variables locales para probar contra producción:

```bash
# apps/web/.env.local
VITE_API_URL=https://dentaflow-api-s3u3.onrender.com/api
```

---

## Problemas frecuentes

| Problema | Solución |
|----------|----------|
| `Cannot find module '@dentaflow/shared'` | Build = **`pnpm -w run build:vercel`**, no `pnpm run build`. Root = repo completo, no solo `apps/web`. |
| `Missing script: build:vercel` | Root Directory = `apps/web` en Vercel. Usá **`pnpm -w run build:vercel`** o dejá que `apps/web/vercel.json` lo configure. |
| `No Output Directory named "dist" found` | Output Directory debe ser **`dist`**. Si tenés override en el panel con otro valor, cambialo o desactivá el override. |
| Logs muestran `users.controller.ts` / API | Vercel está compilando el backend; solo debe correr `build:vercel` (shared + web). |
| Override en Vercel | Desactivá overrides de Build/Install o copiá los valores de la tabla de arriba. |

---

## Resumen

| Pregunta | Respuesta corta |
|----------|------------------|
| ¿Front en Vercel + back en Render? | **Sí**, es la combinación que ya tenés armada. |
| ¿Dominio del cliente? | Compran dominio y lo enlazás en Vercel + actualizás CORS en Render. |
| ¿WhatsApp del odontólogo? | En producción: **número Business** vía Twilio/Meta, no el WhatsApp personal. Sandbox gratis solo para demos. |

Si querés, el siguiente paso técnico puede ser soportar **varios orígenes CORS** (Vercel preview + dominio custom) en `main.ts`.
