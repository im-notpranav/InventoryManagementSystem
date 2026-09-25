# InventBot - Department Purchase & Inventory Management System

A full-stack, enterprise-grade web application for digitizing and automating the complete procurement and inventory lifecycle.

![Tech Stack](https://img.shields.io/badge/React-18-blue?logo=react) ![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql) ![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma)

## Features

### Core Modules
- **🔐 Authentication & RBAC** - JWT-based auth with role-based access (Admin, Department User, Vendor, Watchman, Accountant)
- **📝 Purchase Requests** - Multi-item requests with approval workflows (custom formats e.g. PR-2026-IT-0001)
- **📦 Purchase Orders** - Auto-generated from approved requests (custom formats e.g. PO-2026-TCS-0001)
- **💸 RFQ & Quotations** - Vendor bidding with comparison workflows and PO selection
- **📋 Work Orders** - File-backed work orders linked to procurement flow
- **🚪 Gate Entry** - Watchman recording and work-order lookup at gate
- **🧾 Billing** - Billing documents with accountant verification, admin sign-off, watchman confirmation, and bill release
- **🚚 Goods Receipts** - Partial delivery handling with item condition tracking
- **💰 Invoices** - Three-way matching (PO vs GR vs Invoice)
- **📊 Inventory** - Real-time stock levels with low-stock alerts
- **🏢 Vendor Portal** - Dedicated vendor flows for quotations and PO fulfillment
- **🛡️ Warranties** - Expiry tracking with automated alerts
- **📅 Subscriptions** - Software/service subscription management
- **🔔 Notifications** - Email (Nodemailer) + in-app
- **🤖 ProcureIQ AI Assistant** - OpenAI-powered (`gpt-4o-mini`) chatbot for natural-language queries and guided workflows

### Technical Highlights
- Three-way invoice matching with tolerance rules
- Automated scheduler for warranty, subscription, and low-stock alerts
- Immutable audit logging for compliance
- Real-time notification patterns for the UI

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Installation

```bash
# Clone and navigate
cd procurement-system

# Backend setup
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, OPENAI_API_KEY (for chatbot), SMTP_* (optional)

npm install
npx prisma generate
npx prisma migrate dev
npm run seed    # Optional: seed demo data (roles, users, vendor, sample products)
npm run dev

# Frontend setup (new terminal)
cd ../frontend
npm install
npm run dev
```

The API listens on `http://localhost:5000` by default; the Vite app on `http://localhost:5173`. Set `FRONTEND_URL` in backend `.env` to match your dev URL for CORS.

### Database migrations

- **New database:** `npx prisma migrate dev` applies all migrations in `backend/prisma/migrations/` (including the baseline) and keeps `_prisma_migrations` in sync with `schema.prisma`.
- **Production / CI:** use `npx prisma migrate deploy` (no prompts).
- **Drift (schema exists but migration history is empty or wrong):** do not use `migrate reset` on a database you need to keep. Instead, add a baseline migration that matches the current `schema.prisma`, then mark it applied without re-running SQL, for example:
  ```bash
  npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script -o prisma/migrations/YYYYMMDDHHMMSS_baseline/migration.sql
  npx prisma migrate resolve --applied YYYYMMDDHHMMSS_baseline
  npx prisma migrate dev
  ```
  Remove placeholder or conflicting migration folders so only real migrations remain.

### Environment Variables

Copy `backend/.env.example` to `backend/.env`. Commonly required values:

**Backend (.env)**

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/inventbot?schema=public"
JWT_SECRET="use_a_long_random_secret"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"

# Chatbot (OpenAI)
OPENAI_API_KEY="sk-..."

# Email (optional; Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM_NAME="InventBot"

# Seed overrides (optional; see prisma/seed.js)
# SEED_ADMIN_PASSWORD=...
```

See `.env.example` for inline comments and optional seed password overrides.

### Demo accounts (after `npm run seed`)

| Role            | Email                    | Password   |
|-----------------|--------------------------|------------|
| Admin           | admin@college.edu        | admin123   |
| Department User | itdept@college.edu       | dept123    |
| Watchman        | watchman@college.edu     | watch123   |
| Accountant      | accountant@college.edu   | acc123     |
| Vendor          | vendor1@test.com         | vendor123  |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │Dashboard│ │Inventory│ │ Orders  │ │Vendors  │ │Chatbot  │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│         Zustand state   │   Axios HTTP client                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Express.js REST API)              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Middleware: JWT auth → RBAC → rate limit → errors    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │  Auth   │ │Products │ │Inventory│ │Invoices │ │Chatbot  │ │
│  │  Users  │ │Vendors  │ │   PO    │ │   GR    │ │ Notify  │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│         Prisma ORM    │    Scheduler (node-cron)             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL database                      │
│  Users, Roles, Products, Categories, Warehouses, Inventory, │
│  Vendors, PR/PO, RFQ, Quotations, Work orders, Gate entry,   │
│  Billing, Goods receipts, Invoices, Warranties, Subscriptions│
│  Notifications, Audits                                      │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints (overview)

| Module             | Base path / notes |
|--------------------|-------------------|
| Auth               | `POST /api/auth/login`, `GET /api/auth/me`, `GET /api/auth/test-email` (Admin, SMTP check) |
| Users              | `/api/users` |
| Roles              | `/api/roles` |
| Products           | `/api/products`, `/api/categories` |
| Warehouses         | `/api/warehouses` |
| Inventory          | `/api/inventory` |
| Vendors            | `/api/vendors` |
| Purchase requests  | `/api/purchase-requests` |
| Purchase orders    | `/api/purchase-orders` |
| RFQ                | `/api/rfq` |
| Quotations         | `/api/quotations` |
| Work orders        | `/api/work-orders` |
| Gate entry         | `/api/gate-entry` |
| Billing            | `/api/billing` |
| Goods receipts     | `/api/goods-receipts` |
| Invoices           | `/api/invoices` |
| Warranties         | `/api/warranties` |
| Subscriptions      | `/api/subscriptions` |
| Notifications      | `/api/notifications` |
| Chatbot            | `POST /api/chatbot/message` |

Most write routes require a valid JWT (`Authorization: Bearer <token>`) and the appropriate role.

## Chatbot

Ask natural-language questions or trigger workflows, for example:
- Inventory and low-stock questions
- Purchase request / order status
- Warranties and subscriptions
- Vendor and product lookups

Requires `OPENAI_API_KEY` in `backend/.env`.

## Scheduled Jobs

| Job                    | Schedule | Description                        |
|------------------------|----------|------------------------------------|
| Warranty expiry check  | 8:00 AM  | Alerts for warranties under 30 days |
| Subscription expiry  | 8:30 AM  | Alerts for subscriptions under 30 days |
| Low stock check        | 9:00 AM  | Notifies admins of low inventory   |

## Tech Stack

| Layer          | Technology                    |
|----------------|-------------------------------|
| Frontend       | React 18, Vite, Tailwind CSS  |
| State          | Zustand                       |
| HTTP client    | Axios                         |
| Backend        | Node.js 20, Express.js        |
| ORM            | Prisma 6                      |
| Database       | PostgreSQL 15                 |
| Auth           | JWT + bcrypt                  |
| AI assistant   | OpenAI API (`gpt-4o-mini`)    |
| Email          | Nodemailer                    |
| Scheduler      | node-cron                     |
| UI motion      | React Bits (reactbits.dev) components, Motion (Framer), GSAP, OGL |

## Project structure

```
procurement-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   ├── migrations/             # Prisma Migrate history
│   │   └── seed.js                 # Demo data
│   ├── src/
│   │   ├── config/                 # DB, env
│   │   ├── middleware/             # Auth, RBAC, errors
│   │   ├── modules/                # Feature routes (auth, billing, …)
│   │   └── utils/                  # Mailer, scheduler, uploads
│   └── server.js
└── frontend/
    ├── src/
    │   ├── api/                    # API clients
    │   ├── components/
    │   │   ├── ui/                 # Design system (Button, Modal, DataTable, Toast, Tabs…)
    │   │   ├── reactbits/          # React Bits components (installed from reactbits.dev registry)
    │   │   ├── chat/               # Shared chat message renderer
    │   │   └── navConfig.js        # Single source of truth for navigation / page titles
    │   ├── pages/                  # Screens (lazy-loaded per route)
    │   ├── lib/                    # utils (formatting, status map)
    │   ├── hooks/                  # reduced-motion, media query, dismiss, hotkeys
    │   └── store/                  # Zustand (chatbot widget state)
    └── vite.config.js
```

## Security

- Password hashing with bcrypt
- JWT access tokens (configurable expiry via `JWT_EXPIRES_IN`)
- RBAC on protected routes
- Audit logging for sensitive writes (where implemented)
- Rate limiting on the API (where configured)
- Secrets only in environment variables — never commit `.env`

## License

MIT
