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
- When Google credentials are **not configured** and Arabic content is
  submitted, handlers return `502` with a clean message
  (`Could not translate content. Please try again.`) — no fake/dummy translation
  is stored. Latin-script content continues to be stored as-is.
- Required env vars, see `server/.env.example`:
  `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS` (local) and/or
  `GOOGLE_CLOUD_CREDENTIALS_JSON` (inline service-account JSON for production
  secrets). Credentials must never be shipped to the client.
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
`images` cleared). `productId` references the existing Product (`_id`) — the
server validates it exists and never stores duplicate product data. `status`
is `draft` | `published`. Public endpoints only return `published` posts.

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
| GET    | `/orders/me`| access cookie | orders belonging to the logged-in user                  | `{orders, nextCustomerOrderNumber, nextDiscountPercent}` |

The server recomputes all prices/totals and stores product price snapshots on
order items; client-supplied prices, discounts, totals and order numbers are
ignored. A flat `DELIVERY_FEE` is added to every order.

**Customer order discount (single source of truth: `utils/customerDiscount.js`).**
Every authenticated order gets an order-level loyalty discount from the
customer's PERSONAL order number (`customerOrderNumber`: 1st, 2nd, ... order of
that customer — independent per customer, not the global store number):
5% normally, 7% on every 10th (`n % 10 === 0`). Each order permanently stores
`customerOrderNumber`, `discountPercent`, `discountAmount`, `subtotal`,
`delivery` (fee) and `total = subtotal + delivery - discountAmount`; historical
orders never change. Numbers are allocated at creation (max ever allocated + 1,
falling back to legacy order count + 1 for pre-system orders), unique per user
via a `{user, customerOrderNumber}` unique index with retry; cancelled/rejected
orders keep their numbers (no reuse, no gaps in history). Customer edits while
`pending-review` keep number + percent and only recompute the amount from the
new subtotal. An optional `clientKey` makes checkout idempotent: retries with
the same key return the original order instead of consuming a new number.
Special-offer products already carry their offer price in `product.price`, so
the loyalty discount applies once at order level and never stacks per product.

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
`stats` is `{visits, customers, orders, deliveredOrders, pendingEarnings, availableBalance, payoutRequested, paymentSent, totalPaid, disputed, cancelled, totalEarnings}`. Money is integer DZD, computed server-side only. `totalEarnings` counts only earned (delivered) commissions — `PENDING` and `CANCELLED` are excluded.

## Referral tracking (public)

| Method | Path               | Note                                                        | Returns |
| ------ | ------------------ | ----------------------------------------------------------- | ------- |
| POST   | `/marketing/track` | `{referralCode, visitorId?, productId?, path?}`; `optionalAuth`; 404 on unknown/suspended code or missing product; 400 on self-referral | `{referralId, expiresAt}` (201) |

The tracker stamps an anonymous `visitor` identity (from `visitorId`, else the
`bm_v` cookie, else a generated id returned via cookie). A referral is valid for
7 days. Last valid referral wins for the same visitor/customer, and an existing
active referral for the same marketer + identity is returned instead of creating
a duplicate (idempotent).

## Customer loyalty discount

There is exactly one discount system: every authenticated order gets 5%, every
10th personal order gets 7% (see **Customer order discount** under Orders).
The old per-product reward system (`Reward` model, `isRewardEligible`,
`purchaseCount`, per-line `rewardDiscount`) has been removed.

## Admin (auth + role ADMIN; all under `/admin`)

| Method | Path                       | Note                                        | Returns |
| ------ | -------------------------- | ------------------------------------------- | ------- |
| GET    | `/admin/users`             | `?role&q&page&limit`; each user includes `orderCount` and `totalSpent` | `{users, page, limit, total, pages}` |
| GET    | `/admin/marketers`         | marketers + profile + computed stats (incl. `availableBalance`, phone) | `{marketers}` |
| GET    | `/admin/marketers/:id`     | profile + stats + `commissionsCount` + payouts + referral link | `{profile, stats, commissionsCount, payouts, referralLink}` |
| GET    | `/admin/marketers/:id/orders`      | `?page&limit&status`; referred orders w/ commission | `{orders, page, limit, total, pages}` |
| GET    | `/admin/marketers/:id/commissions` | commissions (order populated)             | `{commissions}` |
| GET    | `/admin/marketers/:id/referrals`   | referral visits for the marketer          | `{referrals}` |
| GET    | `/admin/marketers/:id/payouts`     | payouts for the marketer                  | `{payouts}` |
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
| GET    | `/admin/banners`           |                                             | `{banners, activeCount, max}` |
| POST   | `/admin/banners`           | requires only `image` (plus optional `link`, `order`, `active`); max 5 active | `{banner}` (201) |
| PATCH  | `/admin/banners/:id`       | `{active:true}` blocked when at max         | `{banner}` |
| DELETE | `/admin/banners/:id`       |                                             | – |
| POST   | `/admin/payouts`           | `{marketerId, amount, method(CCP\|BaridiMob), reference?, notes?}`; amount ≤ marketer's `availableBalance`; claims `AVAILABLE` commissions FIFO by **atomic** conditional updates so concurrent payouts never double-claim; `amount` must exactly equal the sum of the claimed commissions (commissions are per-order records — no partial splits; a non-matching amount → 400 and nothing is changed) | `{payout}` (201) |
| GET    | `/admin/payouts`           | `?marketer&status` (sent\|received\|disputed\|cancelled); payouts populated with marketer | `{payouts}` |
| PATCH  | `/admin/payouts/:id`       | `{action: 'cancel'}` — allowed from `sent`/`disputed`; commissions restored to `AVAILABLE` with `paidAt` cleared | `{payout}` |
| GET    | `/admin/posts`             | all posts (draft + published), product populated | `{posts}` |
| POST   | `/admin/posts`             | `{textAr, mediaType, images?, video?, productId, status?}`; Arabic text auto-translated to English (`textAr` → `textEn`); product required & validated, images capped at 5, video posts clear images | `{post}` (201) |
| PATCH  | `/admin/posts/:id`         | partial update; changing `textAr` re-translates `textEn`; image/video/product-only edits never call the translation API | `{post}` |
| DELETE | `/admin/posts/:id`         |                                             | – |
| PATCH  | `/admin/posts/:id/publish` | toggles `draft` ⇄ `published`               | `{post}` |
| POST   | `/admin/upload`            | image upload (gridfs), max 5 MB. Auth: ADMIN or MARKETER (marketers upload their avatar) | `{url}` (201) |
| POST   | `/admin/upload/video`      | video upload (gridfs), max 50 MB (mp4/webm/ogg/mov) | `{url}` (201) |

Error statuses: `400` validation, `401` unauthenticated, `403` wrong role /
suspended marketing, `404` not found, `409` duplicate key, `500` internal,
`502` translation failure, `429` rate limited.