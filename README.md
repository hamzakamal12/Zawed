# Zawed — B2B Procurement Platform

Corporate office supplies and pantry procurement, built with Next.js, Prisma, and PostgreSQL.

## Features

- **Role-based access control**: Staff, Procurement Manager, System Admin
- **Product catalog** with categories and **dynamic tiered pricing** (volume discounts that automatically apply based on quantity)
- **Approval workflow**: Staff submits cart → Manager reviews/edits/approves → Manager checks out
- **Cash on Delivery** checkout with auto-generated **PDF tax invoices**
- **Inventory management**: per-product stock with **low-stock thresholds** flagged in the admin dashboard
- **Quick reorder**: one-click duplicate any past order into the current cart
- **Recurring orders**: save a basket as a weekly or monthly subscription

## Tech stack

- **Next.js 14** (App Router, Server Components, Route Handlers)
- **React 18** + **Tailwind CSS** for shadcn-style components
- **PostgreSQL** with **Prisma ORM**
- **pdf-lib** for server-side invoice generation
- **jose** + **bcryptjs** for JWT-cookie sessions
- **zod** for request validation

## Getting started

### Prerequisites

- Node.js 20+
- A running PostgreSQL instance (the easiest is Docker)

### 1. Start Postgres

```bash
docker run -d \
  --name zawed-pg \
  -e POSTGRES_USER=zawed \
  -e POSTGRES_PASSWORD=zawed \
  -e POSTGRES_DB=zawed \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Install & configure

```bash
cp .env.example .env
npm install
```

### 3. Run migrations & seed

```bash
npx prisma migrate dev
npm run db:seed
```

### 4. Start dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

## Demo accounts

All demo accounts use password **`password123`**.

| Email                | Role                  | Company |
| -------------------- | --------------------- | ------- |
| `admin@zawed.com`    | System Admin          | —       |
| `manager@acme.com`   | Procurement Manager   | Acme    |
| `staff@acme.com`     | Staff                 | Acme    |
| `manager@globex.com` | Procurement Manager   | Globex  |

## Workflow

1. **Staff** signs in, browses the catalog, adds items to their cart. Unit price updates dynamically as quantity changes based on the product's tiered pricing.
2. Staff submits the cart for approval (status: `PENDING_APPROVAL`).
3. **Procurement Manager** sees the pending cart in `/approvals`, can edit quantities directly, then approves.
4. After approval, the cart status becomes `APPROVED` and the Manager (only) can check out using **Cash on Delivery**.
5. Checkout creates an `Order` with status `PENDING_PAYMENT`, decrements each product's stock, and issues a downloadable PDF tax invoice.
6. **Admin** marks the order as `PAID` when payment is collected.

## Scripts

| Command                | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Next.js dev server on :3000                   |
| `npm run build`        | Production build (`prisma generate` + `next build`) |
| `npm run start`        | Production server                             |
| `npm run lint`         | ESLint (Next config)                          |
| `npm run typecheck`    | `tsc --noEmit`                                |
| `npm run db:seed`      | Seed demo companies, users, and products      |
| `npm run prisma:migrate` | Create & apply a new migration              |
| `npm run prisma:studio` | Open Prisma Studio                           |

## Project layout

```
app/
  (app)/              Authenticated pages (dashboard, catalog, cart, …)
  api/                Route Handlers (auth, cart, orders, admin)
  login/, register/   Public auth pages
components/
  ui/                 Buttons, cards, inputs, badges, modal
  products/           Catalog UI bits
lib/
  auth.ts             JWT + bcrypt helpers
  cart.ts             Active-cart resolver + totals computation
  db.ts               Prisma client singleton
  pdf.ts              Invoice PDF generator
  pricing.ts          Tiered-pricing resolver
  session.ts          Server-side session/role guards
prisma/
  schema.prisma       Companies, users, products, tiers, carts, orders, subscriptions
  seed.ts             Demo dataset
middleware.ts         Cookie-session auth gate & role-based route protection
```

## License

MIT
