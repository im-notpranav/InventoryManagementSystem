[README.md](https://github.com/user-attachments/files/26552822/README.md)
# InventBot - Department Purchase & Inventory Management System

A full-stack, enterprise-grade web application for digitizing and automating the complete procurement and inventory lifecycle.

![Tech Stack](https://img.shields.io/badge/React-18-blue?logo=react) ![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=node.js) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql) ![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)

## Features

### Core Modules
- **🔐 Authentication & RBAC** - JWT-based auth with role-based access (Admin, Manager, User, Vendor)
- **📝 Purchase Requests** - Multi-item requests with approval workflows
- **📦 Purchase Orders** - Auto-generated from approved requests
- **🚚 Goods Receipts** - Partial delivery handling with item condition tracking
- **💰 Invoices** - Three-way matching (PO vs GR vs Invoice)
- **📊 Inventory** - Real-time stock levels with low-stock alerts
- **🏢 Vendor Management** - Performance tracking and ratings
- **🛡️ Warranties** - Expiry tracking with automated alerts
- **📅 Subscriptions** - Software/service subscription management
- **🔔 Notifications** - Email (Nodemailer) + SMS (Twilio) + In-app
- **🤖 AI Chatbot** - Gemini-powered assistant for natural language queries

### Technical Highlights
- Three-way invoice matching with 2% tolerance
- Automated scheduler for warranty/subscription/low-stock alerts
- Immutable audit logging for compliance
- Real-time notification badge updates

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
npm install
npx prisma generate
npx prisma db push
npm run seed    # Optional: seed demo data
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/inventbot"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
GEMINI_API_KEY="your-gemini-api-key"  # Optional
SMTP_HOST="smtp.example.com"           # Optional
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="InventBot <noreply@example.com>"
TWILIO_SID=""                          # Optional
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE=""
```

### Demo Accounts
| Role   | Email                 | Password  |
|--------|-----------------------|-----------|
| Admin  | admin@inventbot.com   | admin123  |
| User   | user@inventbot.com    | user123   |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │Dashboard│ │Inventory│ │ Orders  │ │Vendors  │ │Chatbot  │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│         Zustand State   │   Axios HTTP Client                │
└────────────────────────────────────────────────────────────-─┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Express.js REST API)               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Middleware: JWT Auth → RBAC → Rate Limit → Audit Log │   │
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
│                    PostgreSQL Database                       │
│  Users, Roles, Products, Categories, Warehouses, Inventory,  │
│  Vendors, PurchaseRequests, PurchaseOrders, GoodsReceipts,   │
│  Invoices, Warranties, Subscriptions, Notifications, Audits  │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

| Module             | Endpoints                                      |
|--------------------|------------------------------------------------|
| Auth               | POST /api/auth/login, /register, /refresh      |
| Users              | GET/PUT/DELETE /api/users/:id                  |
| Products           | CRUD /api/products, /api/products/categories   |
| Inventory          | GET /api/inventory, /stats, /low-stock         |
| Vendors            | CRUD /api/vendors                              |
| Purchase Requests  | CRUD /api/purchase-requests, /:id/approve      |
| Purchase Orders    | CRUD /api/purchase-orders                      |
| Goods Receipts     | CRUD /api/goods-receipts                       |
| Invoices           | CRUD /api/invoices, /:id/verify-match          |
| Warranties         | CRUD /api/warranties, /subscriptions           |
| Notifications      | GET /api/notifications, PUT /:id/read          |
| Chatbot            | POST /api/chatbot/query                        |

## Chatbot Commands

Ask natural language questions:
- "How many laptops are in stock?"
- "Show me low stock items"
- "What's the status of my requests?"
- "Show warranties expiring this month"
- "List our vendors"

## Scheduled Jobs

| Job                    | Schedule | Description                        |
|------------------------|----------|------------------------------------|
| Warranty Expiry Check  | 8:00 AM  | Alerts for warranties < 30 days    |
| Subscription Expiry    | 8:30 AM  | Alerts for subscriptions < 30 days |
| Low Stock Check        | 9:00 AM  | Notifies admins of low inventory   |

## Tech Stack

| Layer          | Technology              |
|----------------|-------------------------|
| Frontend       | React 18, Vite, Tailwind CSS |
| State          | Zustand                 |
| HTTP Client    | Axios                   |
| Backend        | Node.js 20, Express.js  |
| ORM            | Prisma 5                |
| Database       | PostgreSQL 15           |
| Auth           | JWT + bcrypt            |
| AI             | Google Gemini API       |
| Email          | Nodemailer              |
| SMS            | Twilio                  |
| Scheduler      | node-cron               |
| Animations     | Framer Motion           |
| Charts         | Recharts                |

## Project Structure

```
procurement-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.js            # Demo data seeder
│   ├── src/
│   │   ├── config/            # DB, env configs
│   │   ├── middleware/        # Auth, RBAC, audit
│   │   ├── routes/modules/    # Feature modules
│   │   └── utils/             # Mailer, scheduler
│   └── server.js
└── frontend/
    ├── src/
    │   ├── api/               # API client
    │   ├── components/        # Shared UI
    │   ├── pages/             # Page components
    │   └── store/             # Zustand stores
    └── vite.config.js
```

## Security

- Password hashing with bcrypt (salt factor: 12)
- JWT tokens with 7-day expiry
- RBAC middleware on all protected routes
- Audit logging for all write operations
- Rate limiting (100 req/15min)
- Environment variables for secrets

## License

MIT
