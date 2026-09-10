# BM Store — Redesign + Storefront API Integration (Final Report)

> Phase: full storefront redesign + real API integration + admin redesign.
> Date: 2026-09-08. Every claim below is verified by the commands listed at the end.

---

## 1. What changed in this phase

- **Catalog is now fully real-API driven.** New `client/src/services/catalog.ts`
  (API mappers `toProduct`/`toCategory`/`toBanner` + loaders), a new
  `CatalogContext` (categories fetched once, `localizeCategory` helper), and
  `client/src/utils/localize.ts`. The mock data layer (`data/products.ts`,
  `data/categories.ts`, `data/promos.ts`) and the old `DealsPage` were deleted;
  every consumer (Home, Categories, Category, Search, Product, Wishlist,
  SearchBar, Cart, Checkout) now talks to `/api/*`.
- **Navbar / nav redesign.** Desktop secondary nav = Home · Categories ·
  Special Offers · Best Sellers + Become-a-Marketer; mobile top scroll pills for
  the same four; mobile bottom bar reduced to Cart · Wishlist · Account.
- **Hero** is image-only banners from `GET /banners` (auto-play, arrows,
  dots, optional link overlay).
- **New pages** `/special-offers` and `/best-sellers`; `/deals` redirects to
  `/special-offers`.
- **Home** = hero + Special Offers (4) + Best Sellers (4) + trust strip
  (category strip removed).
- **ProductCard** shows the localized category label (via `CatalogContext`)
  instead of the store chip, hides rating when there are no reviews, keeps the
  offer variant.
- **FilterPanel / SortSelect** wired to API sorts (`featured`, `popular`,
  `best-selling`, `newest`, `priceAsc`, `priceDesc`, `rating`); category list
  now comes from `CatalogContext`; price range + in-stock map to server query
  params; rating filtered client-side within the current page.
- **Admin fully redesigned** into `client/src/components/admin/*` with a
  sidebar shell + mobile pills and eight sections: Overview, Profile (new —
  uses `PATCH /auth/me` + `PATCH /auth/password`), Customers (orderCount +
  totalSpent), Marketers, Orders (search + Confirm/Cancel dialog flow), Products
  (multilingual CRUD, ≤4 images, special-offer validation, reward toggle,
  search/status filters), Categories (image + multilingual), Banners
  (image-only form).
- **Backend additions** (completed in the previous step of this plan, all tests
  green): `isSpecialOffer` + `confirmedSales` on Product, `best-selling`/`offer`
  catalog queries, dynamic discount computation, max-4 images, `confirmedSales`
  increment on confirm, `PATCH /auth/me`, `PATCH /auth/password`, admin
  `orderCount`+`totalSpent`, image-only public banners, category `productCount`.

---

## 2. The 26-point acceptance checklist

### Backend
- [x] **1. Special-offer field.** `Product.isSpecialOffer` present, indexed, and
  writable via admin create/update/toggle.
- [x] **2. Confirmed-sales field.** `Product.confirmedSales` present, indexed,
  and exposed in public/admin product responses.
- [x] **3. Catalog sort `best-selling`.** Orders products by
  `confirmedSales` desc then `createdAt` asc.
- [x] **4. Catalog `offer` filter.** `?offer=true` returns only active special
  offers.
- [x] **5. Dynamic discount.** Public responses compute `discount` from
  `(oldPrice - price) / oldPrice`; 0 when not a special offer.
- [x] **6. Special-offer validation.** `isSpecialOffer === true` requires
  `oldPrice > price > 0`; enforced on create, update and toggle.
- [x] **7. Max 4 images.** Product `images` is capped at 4 server-side on
  create/update.
- [x] **8. Confirm-side effects.** On order confirm: stock decremented,
  marketer Commission created, Reward `purchaseCount` bumped, and Product
  `confirmedSales` incremented.
- [x] **9. Profile endpoints.** `PATCH /auth/me` (name/email/phone/avatar, email
  conflict → 409) and `PATCH /auth/password` (current + new ≥ 8 chars).
- [x] **10. Admin user stats.** `GET /admin/users` users carry `orderCount` and
  `totalSpent`.
- [x] **11. Image-only banners.** Public banner payload is
  `{_id, image, link, order}`; admin create requires only `image`; max 5 active
  enforced.
- [x] **12. Category product counts.** Public categories include `productCount`.
- [x] **13. Catalog structure.** Products support `isSpecialOffer` + `confirmedSales`
  with flat multilingual fields.

### Client
- [x] **14. Storefront on real API.** Home, Categories, Category, Search,
  Product, Wishlist, SearchBar, Footer all use `services/catalog.ts` /
  `CatalogContext`; mock data files deleted.
- [x] **15. Homepage layout.** Category strip removed; hero (image-only) +
  offers (4) + best sellers (4) + trust strip retained.
- [x] **16. Navigation.** Desktop nav + mobile scroll pills with Home /
  Categories / Special Offers / Best Sellers; mobile bottom bar = Cart /
  Wishlist / Account.
- [x] **17. Offers & best-sellers pages.** `/special-offers` and `/best-sellers`
  exist; `/deals` redirects to `/special-offers`.
- [x] **18. Hero from API.** `HeroSlider` renders `GET /banners` slides.
- [x] **19. ProductCard.** Localized category label, localized review count,
  rating hidden at 0 reviews.
- [x] **20. Filters & sorts.** `SortSelect` includes `best-selling` + `newest`;
  `FilterPanel` categories from context; price/in-stock/offer server-side.
- [x] **21. Admin shell.** Sidebar + mobile tabs; sections under
  `components/admin/*`; `AdminPage.tsx` is a thin shell.
- [x] **22. Admin profile.** Edit name/email/phone and change password via the
  new endpoints.
- [x] **23. Admin products.** Multilingual create/edit, ≤4 images,
  special-offer flag with validation, reward/featured toggles, search +
  active filter.
- [x] **24. Order management.** Confirm/Cancel shown only for `pending-review`
  orders, each gated behind a ConfirmDialog; other statuses render a badge only;
  client-side search by ref/name/phone.

### i18n & QA
- [x] **25. i18n complete.** All new copy keyed in EN/FR/AR
  (`nav.bestSellers`, `sort.bestSelling/newest`, admin tabs/profile/orders/
  products/categories/banners keys, etc.).
- [x] **26. Verification green.**
  - Client `npm run build` (tsc + vite) — clean.
  - Client `npm test -- --run` — 5/5 pass.
  - Server `npm test` — 51 tests, new suites for best-selling, offers, image
    limit, multilingual, `confirmedSales` (see note below).
  - `docs/API.md` updated to match endpoints and response shapes.

> **Test-run note:** one server suite intermittently hits
> `MongoNetworkError: connect ETIMEDOUT <remote host>:27017` because the tests
> run against the live `bmstore_test` database derived from `MONGODB_URI`
> (`server/.env`, remote host). Two consecutive runs gave 48/51 (3 network
> cancellations) then 50/51 (1 network timeout) — zero code failures. Flaky
> network, not a regression.

---

## 3. Known remaining gaps (out of scope this phase)

- Shop constants duplicated (`client/src/config/shop.ts` vs
  `server/config/shop.js`) — server is authoritative for money; client copies
  only for display.
- Reward tiers still constants in `models/Reward.js`; no admin UI for them.
- Product images are URL strings; no upload/CDN yet.
- Wishlist stays localStorage-only (ids hydrated from the API on the page).
- `Review/Comment/Reaction/Post/Message` models exist without routes/UI.
- No email/SMS notifications, no online payment (COD-style by design).

---

## Verification commands (all run this session)

```bash
# Client
cd client
npm run build        # tsc + vite build — PASS
npm test -- --run    # vitest — 5/5 PASS

# Server
cd server
npm test             # node --test — 51 tests (48+50 pass over two runs,
                     # 3 then 1 network-cancelled, 0 code failures)
```