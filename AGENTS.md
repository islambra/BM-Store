# BM Store — Working agreements & conventions

## Project structure
- `client/` — React 19 + Vite + TypeScript + Tailwind CSS. Entry `client/src/main.tsx`, routes in `client/src/App.tsx`.
- `server/` — Express + Mongoose. Entry `server/app.js`, routes under `/api`. ESM modules.
- Shared repos: single git repo at `C:\Users\T14 GEN2\Desktop\BM Store`.

## Commands
- Client build + typecheck: `npm run build` in `client/`. Type errors run via `tsc -b`.
- Client tests (vitest): `npm test -- --run` in `client/`.
- Server tests (node:test + supertest): `npm test` in `server/`.
- Lint: none configured. Highlight output; DO NOT inline highlight.

## Key conventions
- Multilingual product fields are FLAT: `name`, `nameAr`, `nameFr`, `description`, `descriptionAr`, `descriptionFr` (NOT nested). Keep this.
- i18n via `client/src/i18n/translations.ts` (`t()` and `lang` from `useLanguage`). All user-facing copy must be keyed there in EN/FR/AR.
- Money in integer DZD; compute totals server-side only; ignore client price in order creation.
- No email/notifications features.
- Admin can only `pending-review` → `confirmed`/`cancelled` (first status change); Confirm/Cancel must show a confirm dialog on the client.
- `confirmed` status: decrement stock and increment Product `confirmedSales`.
- Customer loyalty discount is order-level only: `customerOrderNumber` (per-customer sequence) → 5%, every 10th → 7% (see `server/utils/customerDiscount.js`). No per-product reward system.
- Public APIs are read-only-ish, admin APIs under `/api/admin/*`; all mutations behind loose auth check, role checks inside handlers (no middleware).

## Task plan (in progress — full redesign + storefront API integration)
1. ~~Audit codebase (STEP 1)~~ — done.
2. ~~This plan (STEP 2)~~ — done.
3. ~~Backend: Product model `isSpecialOffer` + `confirmedSales`; catalog sorts (`best-selling`, `offer`); special-offer validation (oldPrice > price, discount computed dynamically); max 5 product images; `confirmedSales` increment on confirm; `/auth/me` + `/auth/password`; admin `getUsers` orderCount+totalSpent; hero banners image-only (public returns image/link/order); category `productCount`~~ — done (server tests green).
4. ~~Client: remove homepage category strip; navbar redesign (Home/Categories/Special Offers/Best Sellers) + mobile top scroll pills; hero = image-only banners from API; `ProductCard` category label instead of store chip, localized reviews; `FilterPanel`/`SortSelect` wired to API sorts; replace all mock storefront data with real API via `services/catalog.ts`; add `/special-offers` + `/best-sellers` pages; admin full redesign in `components/admin/*`~~ — done.
5. Testing: ~~client build+tests, server tests, new tests (best sellers, offers, image limit, multilingual, confirmedSales)~~ — done; ~~Update `docs/API.md`~~ — done.
6. ~~Final report: complete the 26-point acceptance checklist~~ — done in `docs/PROJECT_CURRENT_STATE_REPORT.md`.