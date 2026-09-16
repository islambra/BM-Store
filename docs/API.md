# BM Store — API Reference

Base path: `/api`. Every response uses `{ success: boolean, data?, message? }`.

Roles: `USER`, `MARKETER`, `ADMIN`. Marketers are individuals who share a referral
link (`?ref=CODE`), earn a 10% commission on the product subtotal of orders
attributed to them, and get paid out through an admin-recorded payout workflow.
All catalog content (products, categories, banners) is managed by admin —
marketers have no store or product CRUD.

## Automatic translation (admin content)

Admin-facing content-creation endpoints (products, categories, posts) accept
Arabic content and automatically generate the English version server-side using
the Google Cloud Translation API (`@google-cloud/translate`, central
`server/services/translationService.js`). Flow: **Admin Arabic input → backend
validation → translation service → Google Cloud → Arabic + English saved to
MongoDB → both languages served to storefront users from the database.**

Rules:

- Source language is `ar`, target is `en`. Only human-readable text is
  translated: names, descriptions, category names, post text. Prices, images,
  URLs, slugs, IDs, booleans and stock are never translated.
- Translation happens **once at create time** and **again only when the Arabic
  source field changes on edit**. Price/stock/image/category-only changes never
  call the API. Language switching and page views never call the API.
- Empty optional fields are skipped; non-Arabic (Latin-script) strings pass
  through unchanged without an API call.
- When Google credentials are **not configured**, Arabic content is auto-
  translated to English via the free MyMemory public API (no key required).
  If the free fallback also fails, the Arabic content is stored as-is with a
  warning log so admin operations never block. Latin-script content is always
  stored as-is.
- Set `TRANSLATION_FALLBACK=off` to disable the free fallback and restore the
  previous strict behaviour (Google Cloud only; handlers return `502` for
  untranslatable Arabic).
- Required env vars, see `server/.env.example`:
  `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` (local) and/or
  `GOOGLE_CLOUD_CREDENTIALS_JSON` (inline service-account JSON for production
  secrets). Credentials must never be shipped to the client. Optional
  `MYMEMORY_EMAIL` raises the fallback provider's per-day quota.
- Existing records with Arabic but missing English are repaired manually via
  `npm run translate:existing` (`server/scripts/translateExistingContent.js`).
  It never runs on startup and never overwrites existing English.

## Health

| Method | Path       | Auth | Purpose        |
| ------ | ---------- | ---- | -------------- |
| GET    | `/health`  | –    | Liveness probe |

## Auth (rate-limited: 30 req / 15 min, enforced in production only)

| Method | Path                  | Auth          | Body / note                          | Returns |
| ------ | --------------------- | ------------- | ------------------------------------ | ------- |
| POST   | `/auth/register`      | –             | `{name, phone, password, referralId?, visitorId?, email?}`; `referralId` links the new account to an active referral (marketer attribution); linking requires the `visitorId` (when sent) to match the referral's visitor | `{user}` (201) |
| POST   | `/auth/login`         | –             | `{phone, password}`                  | `{user}` + cookies |
| POST   | `/auth/logout`        | cookie        | –                                    | – |
| POST   | `/auth/refresh`       | refresh cookie| rotates access + refresh token pair  | `{user}` |
| GET    | `/auth/me`            | access cookie | –                                    | `{user}` |
| PATCH  | `/auth/me`            | access cookie | `{name?, email?, phone?, avatar?}`    | `{user}` (email conflict → 409) |
| PATCH  | `/auth/password`      | access cookie | `{currentPassword, newPassword}` (min 8 chars) | – |
| POST   | `/auth/become-marketer` | access cookie (USER) | makes the user a MARKETER and issues their referral code | `{user, marketer}` (201, or 200 if already marketer) |
| POST   | `/auth/register-marketer` | –          | `{name, phone, password, email?, bio?, avatar?, ccp?, ccpKey?, baridiMob?}` (own account) | `{user, marketer}` (201; 200 if the phone already belongs to a MARKETER — logs them back in) |

`user` is always `{id, name, email, role, avatar, phone, createdAt}`.
`marketer` is `{referralCode, referralLink, publicName, status, profileId}`.

## Seller (separate session: auth under `/seller`, owner dashboard under `/store`)

Seller accounts use their own cookie session (SellerSession) distinct from
customer accounts.

| Method | Path                 | Auth          | Note                                                          | Returns |
| ------ | -------------------- | ------------- | ------------------------------------------------------------- | ------- |
| POST   | `/seller/register`   | – (rate-limited) | `{fullName, phone, password, ...}`                          | `{seller}` (201) |
| POST   | `/seller/login`      | – (rate-limited) | `{identifier, password}`; `identifier` is the seller's **phone or email** (server resolves which) | `{seller}` + seller cookies |
| POST   | `/seller/logout`     | seller cookie | –                                                             | – |
| POST   | `/seller/refresh`    | seller refresh cookie | rotates the seller token pair                             | `{seller}` |
| GET    | `/seller/me`         | seller cookie |                                                               | `{seller, store}` |
| PATCH  | `/seller/me`         | seller cookie | `{fullName?, email?, phone?, avatar?, location?}`             | `{seller}` |
| PATCH  | `/seller/password`   | seller cookie | `{currentPassword, newPassword}` (min 8 chars)                | – |
| POST   | `/seller/store-request` | seller cookie | submit / renew a store request (incl. payment proof)       | `{request}` (201) |
| GET    | `/seller/store-request` | seller cookie | current store request (with status/reason)                 | `{request}` |
| GET    | `/seller/check-slug` | seller cookie | `?slug=`; slug availability                                  | `{available, reserved, message?}` |

Storage endpoints (all require a seller session) are relative to `/store`:
`GET/PATCH /store` (my store), `/store/products` (+ `/products/:id`,
`/products` POST/PATCH/DELETE, `PATCH /products/:id/toggle`),
`/store/categories` (CRUD), `/store/orders` (+ `PATCH /orders/:id/status`),
`GET /store/earnings`, `GET /store/subscription`, and
`POST /store/subscription/renew`.

**Subscription lifecycle (server-side scheduler).** A store's subscription runs
until `subscriptionEndDate`; after that the store is marked `expired` and hidden
from the public. If it is not renewed within the 5-day **grace period** it is
soft-deleted (`status: 'deleted'`), its products are set `isActive: false`, and
its uploaded images are cleaned up — data is kept so a late renewal restores
the store and all its old products. Renewing an expired/deleted store (via
store-request renewal) reactivates it and re-enables its previously active
products. The scheduler runs at startup and hourly. Admin can also suspend /
extra-activate a store manually. Stripe-less: renewal is admin-approved
(proof-of-payment based) exactly like the original request.

`store.status` ∈ `pending | active | expired | suspended | rejected | deleted`.
`store` shape returned to the seller includes `{id, slug, status, plan,
subscriptionEndDate, ...}`.

### Public stores & subdomain URLs

Seller storefronts are served on **their own subdomain**, not a `/store/:slug`
path. The client detects the subdomain from the hostname and renders the store
page; the store's slug is sent to `GET /stores/:slug` as usual.

| Method | Path                        | Note                                            | Returns |
| ------ | --------------------------- | ----------------------------------------------- | ------- |
| GET    | `/stores`                   | `?page&limit&q&wilaya&city` (active, valid subscriptions) | `{stores, page, limit, total, pages}` |
| GET    | `/stores/:slug`             | store storefront bundle                         | `{store, categories, specialOffers, newProducts, bestSelling, allProducts}` |
| GET    | `/stores/:slug/categories`  | store categories with `productCount`            | `{categories}` |
| GET    | `/stores/:slug/subscription`| store + subscription status (expiry, days left) | `{store}` |
| GET    | `/stores/categories/search` | `?q`; categories across all active stores       | `{categories:[{category, store, productCount}]}` |

URL format (configurable, never hardcoded):

- Development: `http://{slug}.localhost:5173` — base domain `STORE_BASE_DOMAIN`
  (server) / `VITE_STORE_BASE_DOMAIN` (client), default `localhost`.
- Production: `https://{slug}.{baseDomain}` — set `STORE_BASE_DOMAIN` /
  `VITE_STORE_BASE_DOMAIN` to the production base domain (e.g. `bmstore.com`).

The server accepts any subdomain of `STORE_BASE_DOMAIN` as a CORS origin (in
addition to `CLIENT_ORIGIN`), so the public storefront can call `/api/*` from
`https://{slug}.{baseDomain}`. Legacy `/store/:slug` links redirect to the
subdomain URL. The main site (never a store subdomain) is derived from
`VITE_APP_URL` or the current origin.

## Public catalog

| Method | Path                  | Note                                              | Returns |
| ------ | --------------------- | ------------------------------------------------- | ------- |
| GET    | `/products`           | `?category&q&sort&page&limit&minPrice&maxPrice&inStock&featured&offer` (paged) | `{products, page, limit, total, pages}` |
| GET    | `/products/slug/:slug`|                                                   | `{product}` |
| GET    | `/products/:id`       |                                                   | `{product}` |
| GET    | `/categories`         | active only, ordered by `order`; each category includes `productCount` | `Category[]` |
| GET    | `/banners`            | active only (max 5 enforced); image-only payload `{_id, image, link, order}` | `HeroBanner[]` |
| GET    | `/posts/home`         | latest 6 published posts, populated product `{_id, name, nameAr, slug, image, price, oldPrice, isSpecialOffer, discount}` | `Post[]` |
| GET    | `/posts`              | `?page&limit` (paged, published only); each post includes `likesCount`, `commentsCount`, and `userLiked` (when authenticated) | `{posts, page, total, pages}` |
| GET    | `/posts/:id`          | single published post (same enriched shape)                | `{post}` |
| POST   | `/posts/:id/like`     | auth required; idempotent (one like per user per post)     | `{liked, likesCount}` |
| DELETE | `/posts/:id/like`     | auth required; removes the viewer's like                   | `{liked, likesCount}` |
| GET    | `/posts/:id/comments` | `?page&limit` (default/page size 8, oldest first)          | `{comments, page, total, pages}` |
| POST   | `/posts/:id/comments` | auth required; `{text}` (1..1000 chars)                    | `{comment}` (201) |
| PUT    | `/comments/:commentId` | auth required, **owner only**; `{text}`                    | `{comment}` |
| DELETE | `/comments/:commentId` | auth required; owner **or** ADMIN                          | – |

### Post shape

Posts carry multilingual text flat (`textEn`, `textAr`) plus media.
`mediaType` is `images` (up to 5 `images[]`) or `video` (single `video` URL,
`images` cleared). `productId` (optional) references the existing Product (`_id`) —
the server validates it exists when provided and never stores duplicate product
data. `status` is `draft` | `published`. Public endpoints only return
`published` posts.

Every public post payload also includes `likesCount`, `commentsCount`, and
`userLiked` (true when the authenticated viewer liked it; `optionalAuth` is used
so guests still get working counts). Likes are stored in the `Reaction` model
(`type: 'like'`, unique index on `{post, user}` — duplicate likes are
swallowed). Comments are stored in the `Comment` model and expose a safe author
object `{_id, name, avatar}` — never `email`/`phone`. Deleting a post cascades
to its likes and comments.

### Public product shape

Products expose multilingual fields flat: `name`, `nameAr`, `description`,
`descriptionAr`. (`nameFr`/`descriptionFr` are no longer created for new
products — French has been removed.) `discount` is computed dynamically from
`(oldPrice - price) / oldPrice` — exposed only for special offers (`isSpecialOffer`,
which requires `oldPrice > price > 0`); normal products always return `discount: 0`
and no `oldPrice`. Products also expose `isFeatured`,
`confirmedSales` (incremented on confirmed orders, used by best-selling sort; 0 for a
fresh/no-purchase storefront so the fallback order is creation date) and `images`
(max 5).

`sort` values: `featured`, `popular`, `best-selling` (confirmedSales desc, then
newest), `newest`, `priceAsc`, `priceDesc`. Add `offer=true` to list only
special offers (requires `oldPrice > price > 0`).

## Orders

| Method | Path        | Auth          | Note                                                    | Returns |
| ------ | ----------- | ------------- | ------------------------------------------------------- | ------- |
| POST   | `/orders`   | access cookie | `{items:[{productId, qty}], referralId?, visitorId?, clientKey?, customer}` | `{order}` (201; `{order, deduped:true}` 200 on retried `clientKey`) |
| GET    | `/orders/me`| access cookie | orders belonging to the logged-in user                  | `{orders, nextCustomerOrderNumber}` |

The server recomputes all prices/totals and stores product price snapshots on
order items; client-supplied prices, discounts, totals and order numbers are
ignored. A flat `DELIVERY_FEE` is added to every order.

**Reward discount (single source of truth: `utils/customerDiscount.js`).**
The reward is a **BM Store only** discount: Seller orders never receive it.
Discounts are configured per BM Store category by an admin (`rewardEnabled`,
`rewardNormalPercent`, `rewardSpecialPercent`) and applied only to orders whose
items belong to reward-enabled, active BM categories.

- **Counted purchases:** only *confirmed* BM orders. A confirmed-then-cancelled
  order keeps its number; a rejected or cancelled *pending* order never increments
  the count. The personal purchase number (`customerOrderNumber`) is allocated at
  **confirmation time** (max already-allocated + 1, else 1). `nextCustomerOrderNumber`
  exposed via `GET /orders/me` is a display estimate, not a lock.
- **Cycle:** the next purchase number `n` uses the **normal** percent when
  `n % 10 !== 0` and the **special** percent when `n % 10 === 0` (so 10th and 20th
  orders are special and begin a new cycle).
- **Per-item snapshot:** each confirmed item stores `category`,
  `discountPercent`, `discountAmount` and `isRewardMilestone`; the order stores
  the blended `discountPercent` (1-decimal display figure) and total
  `discountAmount`, with `total = subtotal + delivery - discountAmount`.
  Historical orders are immutable — later config changes never rewrite them.
- **Concurrency:** allocation retries on the `{user, customerOrderNumber}` unique
  index (a *partial* index — see `config/rewardMigrations.js` — that only covers
  documents holding a numeric number, so pending/rejected/cancelled orders never
  collide). An optional `clientKey` makes checkout idempotent.
- **Legacy orders** (created before this change and already holding a number)
  keep their original percent and amount; on later edits the legacy 5%/7% rule
  recomputes the amount only.
- Special-offer products already carry their offer price in `product.price`, so
  the reward applies once on the item price and never stacks with an offer badge.

**Referral attribution.** At order creation the server resolves the referral to
attribute: a `referralId` in the body is only accepted when it belongs to the
ordering customer's identity (referral `customer` == user, or referral `visitor`
== supplied `visitorId`); otherwise a valid active referral bound to the
logged-in customer is used. The referral must be `active` and not expired
(7 days). Orders store the owning marketer, referral and code permanently — once
an order is created with a valid referral it belongs to that marketer even if the
referral later expires. A marketer who is **suspended** gains no new attribution
on orders created while suspended (existing attributed orders/earnings are
untouched). A `Commission` is created at `PENDING` (10% of the product
subtotal, no delivery fee). When the admin marks the order `delivered` the
commission becomes `AVAILABLE` (and the marketer's lifetime total earnings is
incremented); when the order is `rejected` or `cancelled` while still pending, the
commission becomes `CANCELLED`. Delivery/release is idempotent — a missing
commission record is materialized on delivery and repeated deliveries never
double-credit.

## Marketer (auth + role MARKETER)

| Method | Path                    | Note                                                         | Returns |
| ------ | ----------------------- | ------------------------------------------------------------ | ------- |
| GET    | `/marketer/dashboard`   | profile + stats + referral link + recent orders & payouts    | `{profile, stats, referralLink, baseUrl, recentOrders, recentPayouts}` |
| GET    | `/marketer/me`          | profile + lifetime stats, referral link, base URL            | `{profile, stats, baseUrl}` |
| PATCH  | `/marketer/me`          | `{name?, email?, phone?, publicName?, bio?, avatar?, payoutDetails:{ccp?, ccpKey?, baridiMob?}}` | `{profile}` (`updated` doc) |
| GET    | `/marketer/orders`      | `?page&limit&status`; each order includes its commission snapshot | `{orders, page, limit, total, pages}` |
| GET    | `/marketer/earnings`    | commissions (order populated) + bucketed totals              | `{commissions, buckets}` |
| GET    | `/marketer/payments`    | payouts for this marketer                                    | `{payouts}` |
| POST   | `/marketer/payments/:id/confirm-received` | owner (marketer) only; single atomic `sent` → `received` transition (repeat → 400) | `{payout}` |
| POST   | `/marketer/payments/:id/report-not-received` | owner (marketer) only; single atomic `sent` → `disputed` transition | `{payout}` |

`profile` is `{id, publicName, bio, avatar, referralCode, referralLink, status, payoutDetails, totalEarnings, createdAt, user:{id, name, email, phone, avatar}}`.
`stats` is `{visits, customers, orders, deliveredOrders, pendingEarnings, availableBalance, payoutRequested, paymentSent, totalPaid, disputed, cancelled, totalEarnings}`. Money is integer DZD, computed server-side only. `totalEarnings` counts only earned (delivered) commissions — `PENDING` and `CANCELLED` are excluded. `availableBalance` includes commissions reserved in a payout that the marketer has not yet confirmed (`PAYOUT_REQUESTED`); it drops only on `RECEIVED` (marketer accepts the payment).

## Referral tracking (public)

| Method | Path               | Note                                                        | Returns |
| ------ | ------------------ | ----------------------------------------------------------- | ------- |
| POST   | `/marketing/track` | `{referralCode, visitorId?, productId?, path?}`; `optionalAuth`; 404 on unknown/suspended code or missing product; 400 on self-referral | `{referralId, expiresAt}` (201) |

The tracker stamps an anonymous `visitor` identity (from `visitorId`, else the
`bm_v` cookie, else a generated id returned via cookie). A referral is valid for
7 days. Last valid referral wins for the same visitor/customer, and an existing
active referral for the same marketer + identity is returned instead of creating
a duplicate (idempotent).

## Customer rewards

The reward system is **BM Store only** (Seller categories can never be reward
categories):

| Method | Path                                 | Note                                                        | Returns |
| ------ | ------------------------------------ | ----------------------------------------------------------- | ------- |
| GET    | `/rewards`                           | public, read-only; when the system is disabled returns `{enabled:false, categories:[]}` | `{enabled, categories:[{slug, name, nameAr, nameFr, rewardNormalPercent, rewardSpecialPercent}]}` |

See **Reward discount** under Orders for how the percentages are applied at
confirmation. The old per-product reward system (`Reward` model,
`isRewardEligible`, `purchaseCount`, per-line `rewardDiscount`) has been removed.

## Admin (auth + role ADMIN; all under `/admin`)

| Method | Path                       | Note                                        | Returns |
| ------ | -------------------------- | ------------------------------------------- | ------- |
| GET    | `/admin/users`             | `?role&q&page&limit`; each user includes `orderCount` and `totalSpent`; when `role` is omitted, SELLER and ADMIN accounts are excluded (customers only) | `{users, page, limit, total, pages}` |
| GET    | `/admin/marketers`         | marketers + profile + computed stats (incl. `availableBalance`, phone). Per-marketer detail (orders/commissions/referrals/payouts) is **marketer-only** via `/marketer/*` | `{marketers}` |
| PATCH  | `/admin/marketers/:id/status` | `{status: active\|suspended}`            | `{marketing}` |
| DELETE | `/admin/marketers/:id`     | deletes user + profile + referrals + commissions + payouts | `{id}` |
| GET    | `/admin/orders`            |                                             | `{orders}` |
| PATCH  | `/admin/orders/:id/status` | enforces the order state machine            | `{order}` |
| GET    | `/admin/products`          | `?page&limit&q&category&isActive`           | `{products}` |
| POST   | `/admin/products`          | `{nameAr, descriptionAr?, price, oldPrice?, category, image?, images?, isSpecialOffer?}`; Arabic text auto-translated to English (name → `name`, description → `description`); special offer requires `oldPrice > price`; `images` capped at 5 | `{product}` (201) |
| PATCH  | `/admin/products/:id`      | partial update; only changed Arabic fields (`nameAr`, `descriptionAr`) are re-translated, price/stock/images-only edits never call the translation API | `{product}` |
| DELETE | `/admin/products/:id`      |                                             | – |
| PATCH  | `/admin/products/:id/toggle` | `{isActive?, isFeatured?, isSpecialOffer?}`; enabling `isSpecialOffer` requires an existing `oldPrice > price`, disabling clears `oldPrice` | `{product}` |
| GET    | `/admin/categories`        |                                             | `Category[]` |
| POST   | `/admin/categories`        | `{nameAr, image?, icon?, order?, active?}` (whitelisted; slug unique/auto-generated) | `{category}` (201) |
| PATCH  | `/admin/categories/:id`    | partial update; changing `nameAr` re-translates `name` | `{category}` |
| DELETE | `/admin/categories/:id`    |                                             | – |
| GET    | `/admin/rewards`           | system toggle + BM Store categories with reward fields | `{settings:{rewardSystemEnabled}, categories:[{_id, slug, name, nameAr, nameFr, rewardEnabled, rewardNormalPercent, rewardSpecialPercent, active}]}` |
| PATCH  | `/admin/rewards/settings`  | `{rewardSystemEnabled: boolean}`; boolean required | `{settings, categories}` (same as GET) |
| PATCH  | `/admin/rewards/categories/:id` | `{rewardEnabled?, rewardNormalPercent?, rewardSpecialPercent?}`; Seller category → 400; percents must be whole numbers 0–100 | `{settings, categories}` |
| GET    | `/admin/banners`           |                                             | `{banners, activeCount, max}` |
| POST   | `/admin/banners`           | requires only `image` (plus optional `link`, `order`, `active`); max 5 active | `{banner}` (201) |
| PATCH  | `/admin/banners/:id`       | `{active:true}` blocked when at max         | `{banner}` |
| DELETE | `/admin/banners/:id`       |                                             | – |
| POST   | `/admin/payouts`           | `{marketerId, amount, method(CCP\|BaridiMob), reference?, notes?}`; amount ≤ the marketer's **unreserved** (`AVAILABLE`) commissions; claims them FIFO by **atomic** conditional updates into `PAYOUT_REQUESTED` so concurrent payouts never double-claim; `amount` must exactly equal the sum of the claimed commissions (commissions are per-order records — no partial splits; a non-matching amount → 400 and nothing is changed). The marketer's `availableBalance` is **not** reduced here — only when the marketer confirms receipt | `{payout}` (201) |
| GET    | `/admin/payouts`           | `?marketer&status` (sent\|received\|disputed\|cancelled); payouts populated with marketer | `{payouts}` |
| PATCH  | `/admin/payouts/:id`       | `{action: 'cancel'}` — allowed from `sent`/`disputed`; reserved commissions restored to `AVAILABLE` | `{payout}` |
| GET    | `/admin/seller/sellers`    | `?q&page&limit`; `q` matches name/email/phone; each seller includes `stats {totalProducts, totalOrders}`; store populated with `daysRemaining` (expiry countdown) and `isExpired` | `{sellers, page, pages, total}` |
| GET    | `/admin/seller/sellers/:id` | a single seller with their store                           | `{seller, store}` |
| DELETE | `/admin/seller/sellers/:id` | deletes the seller account + linked User + store request + store + products + categories + orders + uploaded images | `{id}` |
| GET    | `/admin/seller/store-requests` | `?status` (default pending) & `?page&limit`            | `{requests, page, pages, total}` |
| POST   | `/admin/seller/store-requests/:id/approve` | activates the store (or renews/restores an expired/deleted store, re-enabling its products) | `{store}` |
| POST   | `/admin/seller/store-requests/:id/reject` | `{reason?}`; seller sees the reason                   | `{request}` |
| GET    | `/admin/seller/stores`     | `?q&page&limit; each store includes `stats` and its seller   | `{stores, page, pages, total}` |
| POST   | `/admin/seller/stores/:id/suspend` / `.../activate` | toggle a store manually           | `{store}` |
| GET    | `/admin/seller/products`   | `?q&page&limit`; seller products only                        | `{products, page, pages, total}` |
| DELETE | `/admin/seller/products/:id` |                                                          | – |
| POST   | `/admin/seller/products/:id/enable` / `.../disable` | override seller product status       | `{product}` |
| GET    | `/admin/seller/orders`     | seller orders                                              | `{orders}` |
| PATCH  | `/admin/seller/orders/:id/status` | same state machine as admin orders                     | `{order}` |
| GET    | `/admin/posts`             | all posts (draft + published), product populated | `{posts}` |
| POST   | `/admin/posts`             | `{textAr, mediaType, images?, video?, productId?, status?}`; Arabic text auto-translated to English (`textAr` → `textEn`); `productId` optional — when provided it must reference a valid product; images capped at 5, video posts clear images | `{post}` (201) |
| PATCH  | `/admin/posts/:id`         | partial update; changing `textAr` re-translates `textEn`; image/video/product-only edits never call the translation API | `{post}` |
| DELETE | `/admin/posts/:id`         |                                             | – |
| PATCH  | `/admin/posts/:id/publish` | toggles `draft` ⇄ `published`               | `{post}` |
| POST   | `/admin/upload`            | image upload (gridfs), max 5 MB. Auth: ADMIN or MARKETER (marketers upload their avatar) | `{url}` (201) |
| POST   | `/admin/upload/video`      | video upload (gridfs), max 50 MB (mp4/webm/ogg/mov) | `{url}` (201) |

Error statuses: `400` validation, `401` unauthenticated, `403` wrong role /
suspended marketing, `404` not found, `409` duplicate key, `500` internal,
`502` translation failure, `429` rate limited.