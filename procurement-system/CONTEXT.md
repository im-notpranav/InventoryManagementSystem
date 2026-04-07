# Project: Procurement & Inventory Management System

## Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma ORM
- Auth: JWT + bcrypt + RBAC
- State: Zustand
- HTTP: Axios

## Modules Built So Far
- [ ] Auth (login, register, JWT)
- [ ] Users & Roles (RBAC)
- [ ] Vendors
- [ ] Products & Categories
- [ ] Inventory & Warehouses
- [ ] Purchase Requests
- [ ] Purchase Orders
- [ ] Goods Receipts
- [ ] Invoices
- [ ] Warranties & Subscriptions
- [ ] Notifications
- [ ] AI Chatbot
- [ ] Admin Dashboard

## Folder Structure
procurement-system/
├── backend/
│   ├── server.js
│   ├── prisma/schema.prisma
│   └── src/
│       ├── config/       (db.js, env.js)
│       ├── middleware/   (auth, rbac, error, audit)
│       ├── utils/        (response, mailer, scheduler)
│       ├── routes/       (index.js)
│       └── modules/      (auth, users, vendors, products...)
└── frontend/
    └── src/
        ├── api/
        ├── components/
        ├── pages/
        ├── store/
        └── utils/

## Conventions
- API responses: { success, message, data }
- All routes protected by authMiddleware + rbac
- Every write action logged in AuditLog table
- Currency formatted in INR