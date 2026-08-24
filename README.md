# Proyecto Administrativo — Servicios Asencio

Sistema de facturación y administración en producción, construido a medida para el negocio real **Servicios Asencio**: gestiona clientes, productos/servicios, facturas y cobros, con recordatorios automáticos por email y control de acceso por roles.

![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?logo=railway&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)

## Qué resuelve

Servicios Asencio necesitaba dejar de facturar a mano en hojas de cálculo. Esta app centraliza clientes, catálogo de servicios y facturación, automatiza el seguimiento de cobros y evita que se pierdan pagos vencidos. Está desplegada y en uso: backend en Railway, frontend en Vercel.

## Funcionalidades

- **Facturación completa** — creación de facturas con líneas de detalle (producto, cantidad, precio unitario), cálculo de subtotal/impuesto/total, folios únicos por workspace y estados (borrador, enviada, vencida, pagada)
- **Generación de PDF** — construcción de comprobantes de factura en PDF con `pdfkit` (`backend/src/lib/pdfBuilder.js`)
- **Cobros y pagos** — registro de pagos parciales/totales asociados a cada factura
- **Recordatorios automáticos por email** — job con `node-cron` que revisa facturas próximas a vencer y vencidas y envía avisos vía Resend (`backend/src/jobs/reminderEmails.js`, `backend/src/lib/email.js`)
- **Sincronización de estados** — proceso diario que marca automáticamente como "vencida" toda factura cuya fecha límite pasó (`backend/src/jobs/syncEstados.js`)
- **Multi-tenant (workspaces)** — todos los datos (clientes, productos, facturas, usuarios) están aislados por `Workspace`, preparado para más de un negocio/cliente en la misma instancia
- **Gestión de clientes y catálogo** — CRUD de clientes y de productos/servicios con historial de facturación
- **Autenticación y roles** — login con JWT + bcrypt, roles `ADMIN` / `CONTABLE` / `LECTOR` con permisos distintos vía middleware (`requireRole`)
- **Auditoría** — registro de acciones (crear/actualizar/eliminar) por usuario, entidad e IP (`AuditLog`)
- **Panel de administración** — dashboard con resúmenes, gestión de usuarios y configuración del workspace
- **Seguridad de API** — Helmet, CORS restringido por origen, rate limiting (`express-rate-limit`), límite de tamaño de payload
- **Tests** — suite con Vitest + Supertest sobre la API (`backend/src/__tests__`)

## Stack técnico

| Capa | Tecnología |
|---|---|
| Backend | Node.js, Express 5, Prisma ORM, PostgreSQL |
| Frontend | React 19, Vite, React Router, Axios |
| Auth | JWT + bcryptjs |
| Email | Resend + Nodemailer |
| PDF | pdfkit |
| Jobs | node-cron |
| Tests | Vitest + Supertest |
| Deploy | Railway (API) + Vercel (frontend) |

## Estructura

```
proyecto-administrativo/
├── backend/
│   ├── src/
│   │   ├── routes/       # auth, clients, products, invoices, users, workspaces, admin
│   │   ├── jobs/         # cron: recordatorios de vencimiento y sincronización de estados
│   │   ├── lib/          # pdfBuilder, email, audit, prisma, helpers
│   │   ├── middleware/   # auth (JWT), requireRole
│   │   └── __tests__/    # tests de API
│   └── prisma/           # schema y migraciones (Workspace, User, Client, Product, Invoice, Payment, AuditLog)
└── frontend/
    └── src/
        ├── pages/        # Dashboard, Clients, Products, Invoices, InvoiceForm/Detail, Users, AdminPanel, WorkspaceSettings, Login
        └── components/   # Layout, ProtectedRoute, ErrorBoundary
```

## Inicio rápido

```bash
git clone https://github.com/Noull999/proyecto-administrativo.git
cd proyecto-administrativo

# Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

Ver [SETUP.md](./SETUP.md) para la guía detallada de configuración de variables de entorno y despliegue.

---

Desarrollado por [Jose Esteban Asencio](https://github.com/Noull999).
