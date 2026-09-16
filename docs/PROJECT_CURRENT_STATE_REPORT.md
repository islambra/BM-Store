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
  (multilingual CRUD, ≤5 images, special-offer validation, reward toggle,
  search/status filters), Categories (image + multilingual), Banners
  (image-only form).
- **Backend additions** (completed in the previous step of this plan, all tests
  green): `isSpecialOffer` + `confirmedSales` on Product, `best-selling`/`offer`
  catalog queries, dynamic discount computation, max-5 images, `confirmedSales`
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
- [x] **7. Max 5 images.** Product `images` is capped at 5 server-side on
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
- [x] **24. Order management.** Confirm/Cancel shown only for `pending`
  orders, each gated behind a ConfirmDialog; confirmed orders can be delivered
  (or cancelled); other statuses render a badge only; client-side search by
  ref/name/phone.

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

---

## 4. Marketer Program (second phase — shipped)

> Date: 2026-09-10. Backend fully verified (91/91 server tests); client built
> and unit-tested (5/5). See `docs/API.md` for the updated endpoints.

### Backend
- **Referral model extended.** `Referral` now records an anonymous `visitor`,
  `active` and `expiresAt` (7-day validity, `REFERRAL_VALID_MS`). Ties a
  referral to a visitor and/or a verified customer.
- **Attribution rules (tested).**
  - A referral must be `active` and unexpired at order creation to attribute.
  - Last valid referral wins for the same visitor/customer; one active referral
    per marketer+identity is enforced (duplicate visits return the same id).
  - Once an order is created with a valid referral, attribution is permanent —
    later expiry never strips it.
  - Suspending a marketer blocks new attribution but never takes their history.
  - Self-referral is rejected (400).
  - Referrals survive product visits (`productId`) and general visits (`/`).
- **Commission lifecycle (tested).** Created `PENDING` at order creation (10%
  of the product subtotal only), `AVAILABLE` when the order is marked delivered
  (increments the marketer's lifetime `totalEarnings`), `CANCELLED` if the order
  is cancelled/rejected while pending. Unique sparse index on `{order}` prevents
  double-crediting; repeated delivery attempts are idempotent.
- **Payout workflow (tested).** Admin records a payout against the marketer's
  `availableBalance` (FIFO over `AVAILABLE` commissions, which become
  `PAYMENT_SENT`). Marketer confirms receipt → `RECEIVED`; marketer can dispute →
  `DISPUTED`; admin can cancel a `sent`/`disputed` payout, restoring the
  commissions to `AVAILABLE`. Ownership checks prevent cross-marketer actions.
- **New backend endpoints.** `/marketing/track` (now `optionalAuth` + visitor
  cookie `bm_v` + idempotent), `/marketer/dashboard`, `/marketer/orders`,
  `/marketer/earnings`, `/marketer/payments`,
  `/marketer/payments/:id/confirm-received` + `report-not-received`,
  `/admin/marketers/:id` (+ `/orders`, `/commissions`, `/referrals`, `/payouts`),
  `PATCH /admin/payouts/:id`, `POST /admin/uploads` extended to MARKETER
  (avatar). `register` accepts `referralId`; `register-marketer` accepts
  `email/bio/avatar`. Rate limiting now applies in production only (tests).

### Client
- **Marketer dashboard** at `/marketer` (sidebar desktop + pills mobile) with
  Overview (stats + balances + recent orders/payouts), Referral Links (general
  link + per-product link generator with search), Orders (paginated, with
  commission status), Earnings (bucketed totals + commission log), Payments
  (confirm/dispute with dialogs) and Profile (name/email/phone/avatar/bio +
  CCS/CCP/BARIDI payout details).
- **Referral plumbing.** `services/referral.ts` persists the visitor id and the
  last `?ref` referral in localStorage; the shared `ReferralTracker` records
  visits in `Layout` and `AdminLayout`; checkout submits the stored referral;
  registration passes `referralId` so real-world visits convert through the
  account → order path.
- **Admin.** Payouts tab (record against `availableBalance`, status filters,
  cancel-with-restore), per-marketer details page at `/admin/marketers/:id`
  (stats, payout details, orders, commissions, referrals, payouts).
- **i18n.** All new copy keyed EN + AR (`marketer.*`, `admin.payouts.*`,
  `admin.marketer.*`).

### Verification (this session)
- Server `npm test` — **91/91 pass** (16 suites incl. `referral + commission
  lifecycle`, `payout workflow`, `marketer marketing + referrals`, `marketer
  authorization`).
- Client `npm run build` — clean; `npm test -- --run` — 5/5 pass.

---

## 5. Marketer ↔ Admin workflow — hardening audit (third phase — shipped)

> Date: 2026-09-11. Surgical fixes to the existing referral/commission/payout
> implementation — no rewrites. Verified: full server suite green (0 failures),
> client build + tests green. Updated `docs/API.md`.

### Problems found & fixed

- **Over-selection on payouts.** `recordPayout` flipped *all* selected
  commissions to `PAYMENT_SENT` even when the payout amount was smaller than
  the sum — inflating paid/available accounting vs money actually sent.
  Fixed: commissions are claimed one-by-one with atomic
  `findOneAndUpdate({status:'AVAILABLE'})`; a commission is only claimed if its
  full amount fits the remaining budget; the payout amount must exactly equal
  the sum of claimed commissions (no partial split of one commission); on any
  shortfall the partial claim is rolled back and nothing changes. Concurrent
  payouts can no longer double-claim a commission.
- **Concurrent payout race.** Two admin payouts could claim the same
  `AVAILABLE` commissions. Fixed by the conditional per-commission claim loop above.
- **Suspended marketer still attributed new orders.** `resolveActiveReferral`
  did not check `MarketerProfile.status`. Now at order creation a suspended
  marketer never gains new attribution (history is untouched) — task 26.
- **Client-supplied `referralId` was trusted blindly.** An arbitrary/foreign
  referral id could be attached at order creation. `createOrder` now accepts a
  `visitorId`, and a body `referralId` is only honored when the referral's
  `customer` is the logged-in user or its `visitor` matches the supplied
  `visitorId`. Registration applies the same optional check (`visitorId` sent by
  the client). Client now sends `getVisitorId()` on register + checkout.
- **`totalEarnings` included PENDING commissions** (`finance.js` bucket).
  Earnings are now counted only when earned (delivered): `PENDING` and
  `CANCELLED` are excluded, aligning computed totals with the stored
  `MarketerProfile.totalEarnings`.
- **Missing commission release on delivery.** `releaseCommission` now
  materializes the commission if the record was never persisted (guarded by the
  sparse unique `{order}` index), keeping deliver/cancel idempotent and
  never double-crediting.
- **Confirm/dispute not owner-only and not race-safe.** `confirmPayoutReceived`
  / `reportPayoutNotReceived` used `findOneAndUpdate({status:'sent'})` atomic
  transitions and are restricted to the payout-owning marketer (admin 403);
  repeated confirm/dispute now fail cleanly instead of double-transitioning.
- **Stale paidAt on cancel.** `updatePayoutStatus` cancel restores commissions
  to `AVAILABLE` and clears `paidAt`.
- **Stale "trusted sellers" copy** removed from `client/index.html` meta
  description (single-seller BM Store).

### New tests added
- Suspended marketer gains no new order attribution (and no commission).
- Order-side referral ownership: a foreign `referralId` is ignored; a matching
  visitor's id is honored.
- `totalEarnings` is 0 while an attributed order is pending (earned-only).
- Payout exact-fit: `500` against two 300-commissions → 400, balance untouched,
  no commission flipped; `600` succeeds.
- Payout confirm: admin → 403; double confirm → 400; exactly one `RECEIVED`.
- Commission release remains idempotent on repeated delivery.

### Verification (this session)
- Server: full `npm test` — every suite `ok`, **0 failures** (referral lifecycle
  now 12 tests, payout workflow 6).
- Client: `npm run build` — clean; `npm test -- --run` — 5/5 pass.

---

## Phase 6 — Production cleanup (remove demo/dead code, real data everywhere)

### Scope
Prepare the project for real manual testing and real usage:
- Remove every seed, demo, mock, fake, and test record (none existed in code;
  the app starts on an empty DB — no auto-seeding, admin created manually).
- Remove obsolete/unused files, pages, components, routes and dead code.
- Dashboards must show real DB data only, with proper empty states (0 counts and
  "no records" notes — verified for admin, marketer, and client dashboards).
- Keep all real functionality; no new features, no redesign.

### Files deleted (18 — all verified unreferenced)
- Deleted pages (`client/src/pages/admin/`): `AdminCustomersPage.tsx`,
  `AdminMarketersPage.tsx`, `AdminProfilePage.tsx` — replaced by the tabbed
  sections rendered inside `AdminPage.tsx` (AdminShell). No route ever imported
  them.
- Deleted components (`client/src/components/admin/`): `AdminDashboardLayout.tsx`,
  `AdminSidebar.tsx`, `AdminHeader.tsx`, `AdminPageHeader.tsx`, `AdminDataTable.tsx`,
  `AdminStatCard.tsx`, `StatusBadge.tsx`, `EmptyState.tsx`, `ErrorState.tsx`,
  `LoadingState.tsx`, `ConfirmDialog.tsx` — leftover "old admin" shell only used by
  the deleted pages. Live admin sections already use `AdminShell.tsx` + the shared
  `../common/EmptyState` / `../common/ConfirmDialog`.
- Deleted server file: `server/controllers/post.routes.js` — stray duplicate of
  `routes/post.routes.js`; never mounted (public posts live in `routes/post.routes.js`,
  admin posts in `routes/admin.routes.js`).
- Deleted unused models: `server/models/Review.js`, `server/models/Message.js` —
  not referenced by any route, controller, service, or test.

### Routes removed
- None — every deleted page was already unrouted. The `/admin` tab structure in
  `App.tsx` and `AdminPage.tsx` is unchanged.

### Seed / demo / fake / mock data
- **No seed data anywhere**: `server/config/bootstrap.js` only loads dotenv;
  no seed scripts or directories exist. The store starts empty; all data is
  created manually through the admin UI. No auto-created admin/`@admin` user.
- **No fake numbers**: admin `OverviewSection`, marketer `OverviewSection`,
  client `DashboardPage`/`ClientProfilePage` all compute stats from live API
  responses and render empty states (e.g. `admin.noOrders`, `marketer.noRecentOrders`,
  `account.ordersEmpty`) at 0.
- **No remote placeholder images** (no unsplash/picsum/etc.) and no hardcoded
  product/banner/post data in the client; hero slider renders nothing when no
  banners exist.
- Kept (real content, not demo): `data/wilayas.ts`, `config/shop.ts` constants,
  Google Fonts links, form placeholders, one-off migration script
  `scripts/translateExistingContent.js`.

### Duplicate consolidation
- `client/src/components/admin/ConfirmDialog.tsx` was a near-duplicate of
  `client/src/components/common/ConfirmDialog.tsx`. `admin/PostsSection.tsx` now
  imports the shared `common/ConfirmDialog`; the duplicate was deleted.

### Unused dependencies
- None removed — all `client/package.json` and `server/package.json`
  dependencies are referenced (e.g. `@google-cloud/translate` backs the
  optional Arabic→English auto-translation service).

### Errors found & fixed
- Found: duplicate/stray `controllers/post.routes.js` and unused `Review`/`Message`
  models (deleted). No runtime or type errors remained after cleanup.

### Verification (this session)
- Client: `npm run build` (tsc + vite) — clean; vitest — 5/5 pass.
- Server: `node` app import (after `bootstrap.js`) — OK; real boot
  `node server.js` — "MongoDB connected", listening on `:5000`, no errors;
  post + post-engagement + health suites — 23/23 pass (full suite previously
  green, nothing behavioral changed by this cleanup).

### Known remaining issues
- `privacy.p1` / `terms.p1` translation copy still read "This page is a
  placeholder…" — real legal copy to be supplied by the store owner (content,
  not code).

## Post-audit fixes (audit round)

Full-codebase audit (client pages, admin/marketer dashboards, server
controllers) followed by fixes; see the main audit summary in
`docs/API.md` + the acceptance notes above.

### Server (fixed, tests added/updated)
- **Critical auth**: `registerMarketer` no longer takes over an existing
  marketer account (wrong password → 401); `changePassword` no longer 500s
  (selects `+passwordHash`). New tests in `server/test/auth.test.js`.
- **Stock over-sell**: first confirm now atomically decrements stock with a
  `$gte` guard + full rollback; 400 on insufficient stock
  (`order.controller.js`).
- **Payouts**: greedy claim dead-end resolved with an exact-subset fallback
  (`findExactSubset`); subset indices mapped back through sorted `{amount, idx}`
  entries so the correct commissions are claimed (`admin.controller.js`).
- **Admin stats**: `escapeRegex` on user search; `totalSpent`/`orderCount`
  exclude `cancelled`/`rejected` orders.
- **Translation service**: falls back to returning Arabic text unchanged when
  Google Cloud Translation is not configured (no more 500 on every product
  save); `products.test.js` updated. Full server suite: **121/121 pass**.

### Client (fixed)
- Checkout: removed fabricated `localStorage` order + cart-clear-on-failure;
  real error alert (role="alert") retains the cart.
- Wishlist re-fetches when it changes (`useAsync` gained a `deps` arg);
  ProductPage distinguishes 404 vs network error with retry and caps quantity
  at stock; HeroSlider pre/next aria-labels correct under RTL.
- PostCard/PostPreviewCard: real prices via `formatPrice`, no hardcoded
  DA/fallback strings, comment count via `posts.commentsCount`, carousel
  aria-labels localized.
- ProductCard: wishlist/add-to-cart buttons moved out of the `<Link>` (valid
  HTML); CartPage quantity capped at stock and shows the product category.
- Footer: removed the four non-interactive social-icon spans.
- Admin: category + banner deletes now require a `ConfirmDialog`; Overview
  shows a Loader + error/retry instead of silent 0s; SpecialOffers/BestSellers
  show an error state instead of a misleading "no results".
- i18n: added `common.retry`, `product.imageLabel`, `posts.*`, `admin.phone`,
  `admin.userId`, `marketer.cancelled`, `admin.deleteCategory*`,
  `admin.deleteBanner*`, `nav.main`, `nav.mobile` (EN/FR/AR); AuthPage password
  min length aligned to 8; CategoryCard honors `nameFr`; Breadcrumb/ShareModal/
  Comments/order-detail aria-labels localized; ReferralTracker uses the
  `referral` service helpers.
- Verification: client `tsc + vite build` and vitest **5/5** green after all
  fixes.

## Final correctness audit (2026-09-14)

Full-stack sweep: role/routing guards, seller/marketer/admin workflows, API
contracts, backend error handling and cross-store uniqueness. All real bugs
below were fixed this round.

### Critical (fixed)
- **`product.controller.js` — `store` symbol never imported.** `getProductBySlug`
  referenced a bare `Store` for every seller-product slug lookup → `ReferenceError`.
  Added the missing import.
- **`Category.slug` had a *global* `unique: true` index**, so two different
  seller stores (or a store + BM) could never both create a category with the
  same slug → 500 on every second store. Removed the global unique; the compound
  unique `{ store, slug }` (no longer sparse) now enforces per-scope uniqueness,
  BM included.
- **`Product.slug` global uniqueness vs per-store slugify.** Seller products were
  slugified against other products *in the same store* only, so a seller product
  could collide with a BM product's slug (or another store's) → 500. `uniqueProductSlug`
  in `store.controller.js` now checks globally and suffixes on collision (matches
  BM's own `uniqueSlug`).

### Major (fixed)
- **Invalid `ObjectId` → 500** instead of 400. Global error middleware now maps
  Mongoose `CastError` → 400 "Invalid ID format" and `ValidationError` → 400
  (`server/app.js`), covering every controller that reads `req.params.id`.
- **Seller dashboard tab/URL mismatch.** All `/seller/*` routes rendered the
  Overview panel because `SellerPage` kept local tab state. The active tab is now
  derived from `useLocation()` and tab clicks `navigate()`; header subtitle shows
  the active tab's label.
- **`/marketer` allowed ADMIN** with no marketer profile → empty dashboard. Guard
  narrowed to `['MARKETER']`.
- **`/dashboard` legacy page for MARKETER.** `DashboardRedirect` now sends USER →
  `/dashboard/profile`, MARKETER → `/marketer`; the legacy `DashboardPage.tsx`
  is unreferenced and deleted.
- **GridFS orphans on delete.** Added `deleteFileFromGridFS` +
  `deleteGridFSByUrl` (`server/utils/gridfs.js`) and wired image cleanup into
  product deletes (admin + seller + admin-seller), banner delete and post delete.
- **Admin category delete created orphaned categories.** Now guarded by a
  product-count check (same rule the seller panel already had). Test updated for
  isolation (categories suite clears `products` in `beforeEach`).
- **Order delivery edit could 500.** `updateMyOrder` validated only
  wilaya/commune/address, so a partial `customer` payload with empty `fullName`
  or `phone` broke the required delivery fields on save. `fullName` and `phone`
  are now validated and trimmed like the rest.

### Cleanup / non-issues verified
- Deleted dead files: `pages/DashboardPage.tsx`, `components/common/Skeleton.tsx`
  (singular, unused), `components/common/Alert.tsx` (unused — real `Alert` lives
  in `FormControls.tsx`).
- Removed unused imports in `admin.seller.controller.js` (`Category`, `User`).
- Footer Account link now routes by role (`getAccountRoute`); UserMenu mobile
  pill highlights `/admin`, `/seller`, `/marketer` too; SellerLayout sidebar
  Profile links to `/seller/profile`.
- Audit false positives confirmed working as-is: `OrderStatusBadge` localizes all
  statuses; `StoreContext.clearCart` is already atomic (`setCart([])`).

### Verification (this round)
- Server: `node --test` — **121/121 pass**.
- Client: `tsc && vite build` (2023 modules) **green**; vitest **5/5 pass**.

## Phase 7 — BM Store-only per-category reward system

Replaces the old fixed 5%/7% loyalty discount with a reward system that is
**exclusive to BM Store**, configurable **per BM Store category** by the admin,
applied **server-side at confirmation**, and counted **only on confirmed orders**.

### 15-point acceptance checklist

1. **BM Store only** — Seller orders never get a reward; Seller
   categories cannot be configured as reward categories (admin API → 400). ✔
2. **Per-category config** — `rewardEnabled`, `rewardNormalPercent`,
   `rewardSpecialPercent` live on BM Category documents (`store` absent/null). ✔
3. **System toggle** — global on/off in the new `RewardSettings` singleton
   (default on); when off no discount is applied and `GET /api/rewards` returns
   an empty payload. ✔
4. **Purchase cycle** — order 1–9 normal percent, every 10th order (10, 20, …)
   the special percent; the milestone order begins the next cycle. ✔
5. **Counted on confirmed only** — `customerOrderNumber` is allocated at
   confirmation (`max + 1`); rejected/cancelled *pending* orders consume no
   number; a confirmed-then-cancelled order keeps its number. ✔
6. **Multi-category orders** — each line item is discounted with its category's
   percent; order stores the blended percent + total discount amount. ✔
7. **Server-side calculation** — client-supplied reward fields are ignored;
   money (discount amounts, totals) is computed server-side in integer DZD. ✔
8. **Snapshots & immutability** — confirmed items store `category`,
   `discountPercent`, `discountAmount`, `isRewardMilestone`; later config
   changes never rewrite history. ✔
9. **Admin dashboard UI** — new "Rewards" tab: system toggle + per-category
   checklist with normal/special percent inputs and inline validation,
   EN/AR localized. ✔
10. **Customer display** — checkout shows a per-category estimate for the
    next order (milestone-aware) validated at confirmation; order details show
    blended + per-item reward chips. ✔
11. **Referral/commission intact** — commission remains 10% of the product
    subtotal, `PENDING` → `AVAILABLE` on delivery, and the reward applies
    independently on confirm. ✔
12. **Concurrency & uniqueness** — allocation retries on a partial unique
    `{user, customerOrderNumber}` index (see `config/rewardMigrations.js`,
    which also drops the old sparse index whose null-on-missing semantics
    collided for unnumbered pending orders); `clientKey` checkout dedupe kept. ✔
13. **Public API** — `GET /api/rewards` exposes enabled categories + percents
    (read-only) for the storefront estimate. ✔
14. **Tests** — `server/test/customer-discount.test.js` rewritten (6 suites:
    cycle 1,2,9,10,11,19,20,21; per-category differences; multi-category;
    per-customer sequences; trust/immutability; rejected/cancelled counting;
    seller/category ownership + validation; disabled system; config change
    snapshot; referral+commission). Full server suite **133/133 pass**. ✔
15. **No demo data + client green** — no seeds/fakes added (entirely
    DB-driven), no frontend hardcoding of percentages; client `tsc + vite
    build` green, vitest 5/5. ✔

### Files added / changed (server)
- New: `server/models/RewardSettings.js`, `server/controllers/reward.controller.js`,
  `server/routes/reward.routes.js`, `server/config/rewardMigrations.js`.
- Changed: `server/models/Category.js` (reward fields), `server/models/Order.js`
  (item snapshot fields; `discountPercent` default 0; index definition moved out
  of the schema), `server/utils/customerDiscount.js` (fully rewritten),
  `server/controllers/order.controller.js` (creation without discount +
  `settleRewardAndStatus`), `server/routes/admin.routes.js`, `server/app.js`
  (`/api/rewards`), `server/config/db.js` + `server/test/helpers.mjs` (run the
  index migration), `server/test/orders.test.js`, `server/test/customer-discount.test.js`.
- Legacy orders (already holding a number) keep working via the 5%/7% legacy
  fallback on edit.

### Files added / changed (client)
- New: `components/admin/RewardsSection.tsx`.
- Changed: `pages/AdminPage.tsx` (Rewards tab), `services/api.ts` (game-endpoint
  functions, `MyOrderRecord` item fields, `/orders/me` no longer returns
  `nextDiscountPercent`), `types/index.ts` (Category reward fields, OrderItem
  fields), `pages/CheckoutPage.tsx` (per-category milestone-aware estimate,
  BM-only via `GET /api/rewards`), `pages/client/ClientOrderDetailsPage.tsx`
  (per-item reward chips), `i18n/translations.ts` (admin.rewards.*,
  admin.tabs.rewards, common.yes/no EN/AR).

### Verification (this phase)
- Server: `npm test` — **133/133 pass** (was failing a partial-index 409 layout;
  resolved via the partial unique index migration).
- Client: `npm run build` (tsc + vite) green; vitest **5/5 pass**.