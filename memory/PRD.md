# RentDesk — Rental Tenant Management App

## Original Problem Statement
Build an app/site to manage rental tenants with buildings, rent history (methods), tenant details (join date, deposit, first-month rent), repairs/expenses (owner or tenant paid), image/receipt uploads, free hosting, accessible from mobile & PC.

## User Choices (Confirmed)
- Auth: Single-user, no login
- File storage: Base64 in MongoDB
- Currency: INR (₹)
- Features: All (rent reminders, dashboard charts, multi-buildings)
- Hosting: Emergent free preview URL (deployable later via Deploy button)

## Architecture
- Backend: FastAPI + Motor (MongoDB async), all routes under `/api`
- Frontend: React 19 + React Router + Tailwind + shadcn/ui + Recharts + Sonner
- Storage: MongoDB (buildings, tenants, payments, expenses collections)
- Assets: base64 data URLs stored inline
- Design: Outfit/Inter typography, indigo primary (#4338CA), slate-900 sidebar

## Implemented (Feb 2026)
- Dashboard: monthly income, expected rent, pending dues, active tenants, buildings count, 6-month income/expense chart, recent payments
- Buildings: CRUD, image upload, cascade delete
- Building detail: tenants + expenses + payments tabs, income/expense totals
- Tenants: CRUD, search, filter by building, current-month paid/due badge
- Tenant detail: profile, rent/deposit summary, full payment history with receipts, add payment dialog
- Payments: global list, filter by building/month, receipt preview, mark as deposit
- Expenses: CRUD by building, paid_by owner/tenant, tenant linkage, receipt upload, totals split
- Mobile responsive sidebar

## Backlog / Next
- P1: Export payment history to CSV/PDF (for tax/records)
- P1: WhatsApp/SMS rent reminder for due tenants (Twilio integration)
- P2: Tenant portal — shareable read-only link per tenant showing their history
- P2: Recurring auto-log of expected rent each month
- P2: Multi-owner mode (login) when the user wants to share access
