# Kip Inventory

Web app for **Kip** — stock control across warehouses, with approvals built in.

Built for businesses that run more than one location and need a paper trail when stock moves: multi-branch retail, distributors, wholesalers, and teams where a manager signs off before purchases or adjustments go through.

## What it does

- **Catalog** — products with SKU, variants, supplier links, images
- **Warehouses** — stock levels per location, reorder thresholds
- **Procurement** — purchase orders, approval workflow, goods receiving against POs
- **Movement** — inter-warehouse transfers with request and confirmation
- **Corrections** — stock adjustments and stock issues, with approval where required
- **Opening balances** — set starting stock when going live in a warehouse
- **Governance** — role-based access (admin, procurement, warehouse, approver)
- **Team** — org signup, email verification, invitations, user management
- **Billing** — 15-day trial, Paystack subscription (Growth / Business / Enterprise)

## Who it is for

- Shops or depots with 2+ locations that need to know what is where
- Distributors moving stock between main store and outlets
- Operations where buying or adjusting stock needs manager approval first

Not a POS or checkout system. No barcode scanning or sales-order UI yet (sales orders exist on the API only).

## Stack

- React 19, TypeScript, Vite
- TanStack Router, TanStack Query
- Tailwind CSS 4
- PWA (installable, offline shell)

## Run locally

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`. Point the API base URL at your backend (see `src/api/client.ts` or env config).

```bash
npm run build   # production build
npm run lint
```

## Repo layout

| Path | What |
|---|---|
| `src/pages/LandingPage.tsx` | Marketing landing page |
| `src/pages/auth/` | Login, signup, verify email, invitations |
| `src/pages/app/` | Dashboard, warehouses, products, POs, transfers, etc. |
| `src/layouts/` | App shell, auth layout |
| `src/api/` | API client and request helpers |
| `src/services/` | Per-domain API calls |

## Backend

The API lives in the sibling repo `KipInventorySystem`. This frontend talks to it over REST (`api/v1/...`).

## Brand

**Kip** is the house name (founder's initials). This product is the inventory / stock-control vertical. Future Kip products can share the brand without sharing this codebase.

Company on invoices and legal: Progomid Solutions.

## Deploy

Frontend is a static Vite build (e.g. Netlify). `netlify.toml` sets SPA redirects and manifest content-type. Do not commit `dist/` or `dev-dist/`.
