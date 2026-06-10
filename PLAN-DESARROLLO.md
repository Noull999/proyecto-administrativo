# Plan de Desarrollo — App de Facturación

**Stack:** React + Node.js (Express) + SQLite/PostgreSQL
**Nivel:** Intermedio · **Duración estimada:** 4–6 semanas (a ritmo de práctica)

---

## 1. Caso real

**Cliente ficticio (pero realista): "Servicios Asencio"** — un pequeño negocio de servicios (reparaciones/consultoría) que hoy hace cotizaciones y facturas en Excel. Sus problemas:

- Pierde el control de qué facturas están pagadas y cuáles no.
- Hacer una factura le toma 20 minutos copiando datos del cliente.
- No tiene reportes: no sabe cuánto facturó el mes pasado.

**Objetivo de la app:** crear cotizaciones y facturas en menos de 2 minutos, saber al instante quién debe, y ver reportes mensuales.

---

## 2. Alcance del MVP

Incluye:

- Login (un solo usuario admin al inicio)
- CRUD de clientes
- CRUD de productos/servicios con precio
- Crear cotización → convertirla en factura
- Estados de factura: borrador, enviada, pagada, vencida
- Registrar pagos (parciales o totales)
- Exportar factura a PDF
- Dashboard: total facturado del mes, pendiente de cobro, facturas vencidas

NO incluye (versión 2): multiusuario con roles, impuestos complejos, envío por email, facturación electrónica legal.

---

## 3. Modelo de datos

```
users      (id, nombre, email, password_hash)
clients    (id, nombre, email, telefono, direccion, rfc/nit)
products   (id, nombre, descripcion, precio, activo)
invoices   (id, client_id, tipo[cotizacion|factura], folio, fecha,
            fecha_vencimiento, estado, subtotal, impuesto, total, notas)
invoice_items (id, invoice_id, product_id, descripcion, cantidad,
               precio_unitario, importe)
payments   (id, invoice_id, fecha, monto, metodo, referencia)
```

Reglas clave:

- Una factura pagada no se puede editar.
- El estado "pagada" se calcula: suma de pagos >= total.
- "Vencida" se calcula: fecha_vencimiento < hoy y no pagada.
- El folio es consecutivo y único (ej. F-0001, C-0001).

---

## 4. Arquitectura

```
frontend/   React (Vite) + React Router + fetch/axios
backend/    Node + Express + Prisma (ORM) + SQLite (dev)
            JWT para autenticación
            pdfkit o puppeteer para PDF
```

API REST principal:

```
POST   /api/auth/login
GET    /api/clients          POST /api/clients     PUT/DELETE /api/clients/:id
GET    /api/products         (mismo patrón CRUD)
GET    /api/invoices         POST /api/invoices
GET    /api/invoices/:id     PUT  /api/invoices/:id
POST   /api/invoices/:id/payments
GET    /api/invoices/:id/pdf
GET    /api/dashboard/summary
```

---

## 5. Fases de desarrollo

### Fase 1 — Fundamentos (semana 1)
- Setup: Vite + React, Express, Prisma, SQLite
- Modelo de datos y migraciones
- Login con JWT
- **Entregable:** puedes iniciar sesión y ver una pantalla vacía protegida.

### Fase 2 — Catálogos (semana 2)
- CRUD de clientes (lista, buscar, crear, editar, eliminar)
- CRUD de productos/servicios
- **Entregable:** gestión completa de catálogos con validaciones.

### Fase 3 — Facturación (semanas 3–4) ⭐ el corazón
- Formulario de cotización/factura: elegir cliente, agregar líneas, cálculo automático de subtotal/impuesto/total
- Convertir cotización → factura
- Lista de facturas con filtros por estado y cliente
- Registro de pagos y cambio automático de estado
- **Entregable:** flujo completo cotización → factura → pago.

### Fase 4 — PDF y dashboard (semana 5)
- Generación de PDF de la factura
- Dashboard con métricas del mes y facturas vencidas
- **Entregable:** app usable de punta a punta.

### Fase 5 — Pulido y despliegue (semana 6)
- Manejo de errores, validaciones, estados de carga
- Pruebas básicas del backend
- Deploy: frontend en Vercel/Netlify, backend en Railway/Render
- **Entregable:** app en línea con URL pública.

---

## 6. Qué vas a aprender

- Autenticación JWT y rutas protegidas
- Relaciones de base de datos (1-N, maestro-detalle)
- Lógica de negocio real (estados calculados, folios, pagos parciales)
- Generación de documentos PDF
- Despliegue full-stack

---

## 7. Primer paso

Crear la estructura del proyecto y el modelo de datos (Fase 1). Cuando quieras, empezamos juntos.
