# Delivery Margin System

One merged app for margin control, legacy XLS imports, and Zé Delivery integration.

## What lives here

- `client/` React UI for the home and owner views.
- `server/` Node/Express + tRPC backend.
- `server/zeDeliveryClient.ts` API client for the Zé Seller Public API.
- `server/zeDeliveryRouter.ts` tRPC routes for credentials, KPIs, histories, and polling.
- `server/webhooks/ze-delivery.ts` webhook intake for real-time order events.
- `fixtures/xlsx/` legacy spreadsheets kept for validation and regression checks.

## Zé mode

- If no real credentials are configured, the app runs in mock mode so the owner view still works.
- Once `ZE_DELIVERY_CLIENT_ID` and `ZE_DELIVERY_CLIENT_SECRET` are available, the same routes switch to the live API.
- The official portal validation link remains `https://seu.ze.delivery`.

## Quick start

1. Copy `.env.example` to `.env`.
2. Run the app with `pnpm dev`.
3. Open the owner page and connect mock or real Zé credentials.
