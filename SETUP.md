# Setup Manual — App de Facturación

Todo lo que debes configurar tú (no se puede automatizar).

---

## 1. Base de datos PostgreSQL en Railway

### Crear la base de datos
1. Entra a [railway.app](https://railway.app) → tu proyecto
2. Haz clic en **`+ New`** → **`Database`** → **`Add PostgreSQL`**
3. Espera ~30 segundos a que se provisione

### Obtener la URL de conexión
4. Haz clic en el plugin de PostgreSQL recién creado
5. Ve a la pestaña **`Connect`**
6. Copia el valor de **`DATABASE_URL`** (formato: `postgresql://postgres:XXXXX@HOST:PORT/railway`)

### Pegar en el proyecto
7. Abre `backend/.env` y reemplaza la línea:
   ```
   DATABASE_URL="postgresql://USUARIO:CONTRASEÑA@HOST:5432/NOMBRE_DB?sslmode=require"
   ```
   con la URL que copiaste de Railway.

### Inicializar la base de datos
Abre una terminal en la carpeta del proyecto y ejecuta:
```bash
cd backend
npx prisma migrate dev --name init
npm run seed
```

Esto crea todas las tablas y carga datos de prueba (workspace demo, usuarios, clientes, productos y facturas de ejemplo).

---

## 2. Email con SMTP (opcional pero recomendado)

Sin esto la app funciona normalmente, pero no envía emails al marcar facturas como enviadas ni recordatorios de vencimiento.

### Opción A — Gmail (más fácil)
1. Ve a tu cuenta de Google → **Seguridad** → **Verificación en dos pasos** (actívala si no la tienes)
2. Ve a **Contraseñas de aplicaciones** → elige "Correo" + "Windows" → **Generar**
3. Copia la contraseña de 16 caracteres que aparece

Llena en `backend/.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
SMTP_FROM=Servicios Asencio <tu@gmail.com>
```

### Opción B — Resend (más profesional, dominio propio)
1. Crea cuenta en [resend.com](https://resend.com) → obtén una API key
2. Usa los datos SMTP de Resend:
```
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_XXXXXXXXXXXXXXXXX
SMTP_FROM=facturacion@tudominio.com
```

---

## 3. Deploy del Backend en Railway

### Subir el código
1. En Railway, dentro del mismo proyecto, haz clic en **`+ New`** → **`GitHub Repo`**
2. Conecta tu cuenta de GitHub y selecciona este repositorio
3. Railway detectará Node.js automáticamente

### Configurar variables de entorno en Railway
En el servicio del backend → pestaña **`Variables`**, agrega:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | (ya está si usaste el plugin de Railway — Railway la inyecta automáticamente) |
| `JWT_SECRET` | Un string largo y aleatorio, ej: `mi-secreto-super-seguro-2024-xyz` |
| `PORT` | `3001` |
| `FRONTEND_URL` | `https://tu-proyecto.vercel.app` (lo sabrás después del deploy del frontend) |
| `SMTP_HOST` | (si quieres email) |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | (si quieres email) |
| `SMTP_PASS` | (si quieres email) |
| `SMTP_FROM` | (si quieres email) |
| `REMINDER_DAYS` | `3` |

### Configurar el comando de inicio
En Railway → tu servicio → **`Settings`** → **`Start Command`**:
```
node src/index.js
```

### Obtener la URL del backend
Railway te dará una URL tipo `https://proyecto-production-xxxx.up.railway.app`.
Cópiala — la necesitas para el frontend.

---

## 4. Deploy del Frontend en Vercel

### Importar el proyecto
1. Ve a [vercel.com](https://vercel.com) → **`Add New`** → **`Project`**
2. Importa el mismo repositorio de GitHub
3. En **`Root Directory`** pon: `frontend`
4. Vercel detecta Vite automáticamente

### Configurar la variable de entorno
En Vercel → tu proyecto → **`Settings`** → **`Environment Variables`**:

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://tu-backend.up.railway.app/api` |

(Usa la URL de Railway del paso 3)

5. Haz clic en **`Deploy`**

### Actualizar FRONTEND_URL en Railway
Con la URL de Vercel que obtuviste (ej: `https://mi-app.vercel.app`), regresa a Railway y actualiza la variable `FRONTEND_URL`.

---

## 5. Verificar que todo funciona

Una vez desplegado, entra a tu URL de Vercel y comprueba:

- [ ] Puedes hacer login (credenciales del seed: `admin@demo.com` / `Admin123!`)
- [ ] Se listan clientes y productos
- [ ] Puedes crear una cotización
- [ ] El botón `↓ CSV` descarga el archivo
- [ ] Al marcar una factura como "Enviada" no da error (aunque no tenga SMTP)

---

## Resumen de URLs y credenciales del seed

Después del `npm run seed`, tendrás disponible:

| Campo | Valor |
|---|---|
| Email admin | `admin@demo.com` |
| Contraseña | `Admin123!` |
| Email contable | `contable@demo.com` |
| Contraseña | `Contable123!` |

> Cambia estas contraseñas en producción desde la interfaz de usuarios.
