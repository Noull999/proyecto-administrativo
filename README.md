# 📋 Proyecto Administrativo

**App de facturación — Servicios Asencio**

Sistema full-stack para gestión de facturación, clientes y servicios. Panel de administración con autenticación JWT, CRUD completo y despliegue en Railway + Vercel.

---

## ✨ Funcionalidades

- **Gestión de clientes** — CRUD con historial de servicios
- **Facturación** — Generación y seguimiento de facturas
- **Autenticación** — Login seguro con JWT + bcrypt
- **Panel admin** — Dashboard con resúmenes y estadísticas
- **Rate limiting** — Protección contra abuso con express-rate-limit
- **Seguridad** — Helmet, CORS configurado

---

## 🛠 Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express + Prisma + PostgreSQL |
| Frontend | React + Vite + React Router |
| Auth | JWT + bcryptjs |
| Deploy | Railway (backend) + Vercel (frontend) |

---

## 🚀 Inicio rápido

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

📖 Ver [SETUP.md](./SETUP.md) para guía detallada de configuración.

---

## 📁 Estructura

```
proyecto-administrativo/
├── backend/
│   ├── src/          # API Express
│   ├── prisma/       # Esquema y migraciones DB
│   └── tests/        # Tests Vitest
├── frontend/
│   └── src/          # App React + Vite
├── SETUP.md          # Guía de configuración manual
└── PLAN-DESARROLLO.md # Roadmap del proyecto
```
