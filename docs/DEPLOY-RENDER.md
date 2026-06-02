# Desplegar DentaFlow API en Render (webhook Twilio sin ngrok)

Guía para tener una URL fija tipo `https://dentaflow-api.onrender.com` y configurar Twilio WhatsApp.

---

## 1. Subir el código a GitHub

Si el repo aún no está en GitHub:

```bash
cd /Users/brandonpzocik/Desktop/dentaflow_6
git add .
git commit -m "Preparar deploy Render"
git push origin main
```

---

## 2. Crear cuenta y proyecto en Render

1. Entrá a [render.com](https://render.com) e iniciá sesión (con GitHub).
2. **New +** → **Blueprint**.
3. Conectá el repositorio `dentaflow_6`.
4. Render detecta `render.yaml` → **Apply**.

Se crean:

- **PostgreSQL** (`dentaflow-db`)
- **Web Service** (`dentaflow-api`)

El primer deploy tarda unos minutos.

---

## 3. Variables de entorno en Render

En el servicio **dentaflow-api** → **Environment**, agregá o revisá:

| Variable | Valor |
|----------|--------|
| `TWILIO_ACCOUNT_SID` | `AC...` (tu cuenta) |
| `TWILIO_AUTH_TOKEN` | token de Twilio |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` (sandbox) |
| `GMAIL_USER` | (opcional) |
| `GMAIL_APP_PASSWORD` | (opcional) |
| `CORS_ORIGIN` | URL del frontend (`http://localhost:5173` o tu dominio) |
| `APP_URL` | misma URL del frontend |

**No agregues** `TWILIO_WEBHOOK_SKIP_VALIDATION` en Render (la firma de Twilio debe validarse).

**Primera vez:** dejá `DB_SYNCHRONIZE=true` (viene en el blueprint). Después del primer deploy exitoso, cambiala a `false` y hacé **Manual Deploy** (las tablas ya existen).

---

## 4. Crear usuario admin en la base de producción

1. Servicio **dentaflow-api** → pestaña **Shell**.
2. Ejecutá:

```bash
pnpm --filter api db:seed
```

Credenciales: `admin@dentaflow.com` / `Admin123!`

---

## 5. Probar que la API está viva

Abrí en el navegador (reemplazá por tu URL de Render):

```text
https://dentaflow-api.onrender.com/api/health
```

Debe responder `{"status":"ok",...}`.

Swagger:

```text
https://dentaflow-api.onrender.com/api/docs
```

> El plan gratis “duerme” tras inactividad; la primera petición puede tardar ~30–60 s.

---

## 6. Configurar Twilio (webhook fijo)

1. [Twilio → WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn).
2. **Sandbox settings** → **When a message comes in**:

```text
https://dentaflow-api.onrender.com/api/whatsapp/webhook
```

(Copiá la URL exacta de tu servicio en Render → **Settings** → dominio.)

3. Método: **POST**.
4. **Status callback URL:** dejalo vacío.
5. **Save**.

---

## 7. Usar la API desde tu PC (frontend local)

En `apps/web`, creá `.env.local`:

```env
VITE_API_URL=https://dentaflow-api.onrender.com/api
```

Si el proxy de Vite no lee eso, configurá la base URL en el cliente API (ver `apps/web/src/api`).

Levantá solo el front:

```bash
pnpm --filter web dev
```

Login contra la base de datos de Render (mismos datos que el seed).

---

## 8. Probar WhatsApp de punta a punta

1. Celular: enviar `join <código-sandbox>` al número de Twilio.
2. Paciente en DentaFlow con teléfono correcto y WhatsApp activo.
3. Crear turno → mensaje con botones.
4. Tocar **Confirmar** → en Agenda: **Confirmado por paciente**.

En Render → **Logs** del servicio deberías ver:

```text
WhatsApp entrante de whatsapp:+549... [payload=confirm]
```

---

## Resumen de URLs

| Uso | URL |
|-----|-----|
| Health | `https://TU-SERVICIO.onrender.com/api/health` |
| Webhook Twilio | `https://TU-SERVICIO.onrender.com/api/whatsapp/webhook` |
| Swagger | `https://TU-SERVICIO.onrender.com/api/docs` |

---

## Problemas frecuentes

| Problema | Solución |
|----------|----------|
| `EROFS: read-only file system` con `corepack enable` | **No uses corepack.** Build: `npm install -g pnpm@9.15.0 && pnpm install --frozen-lockfile && pnpm run build:render`. Start: `node apps/api/dist/main.js` |
| Build falla | Revisá **Logs** del deploy; Node 20+ y `pnpm-lock.yaml` en el repo |
| 502 / timeout | Plan free dormido; esperá y reintentá |
| Twilio “firma inválida” | No uses `TWILIO_WEBHOOK_SKIP_VALIDATION`; URL del webhook = dominio Render exacto |
| Sin tablas | `DB_SYNCHRONIZE=true` y redeploy; luego `false` |
| Sigue el mensaje demo de Twilio | Webhook mal pegado o sin **Save** |

---

## Costos

- Render free: API + Postgres con límites; el servicio se suspende por inactividad.
- Twilio sandbox: gratis para pruebas.
- Para producción estable: plan pago en Render y número WhatsApp aprobado en Twilio.
