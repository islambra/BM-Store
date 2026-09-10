# BM Store — API Reference

Base path: `/api`. Every response uses `{ success: boolean, data?, message? }`.

Roles: `USER`, `MARKETER`, `ADMIN`. Marketers are individuals who share a referral
link (`?ref=CODE`) and earn a 10% commission on confirmed orders attributed to
them. All catalog content (products, categories, banners) is managed by admin —
marketers have no store or product CRUD.

## Health

| Method | Path       | Auth | Purpose        |
| ------ | ---------- | ---- | -------------- |
| GET    | `/health`  | –    | Liveness probe |

## Auth (rate-limited: 30 req / 15 min)

| Method | Path                  | Auth          | Body / note                          | Returns |
| ------ | --------------------- | ------------- | ------------------------------------ | ------- |
| POST   | `/auth/register`      | –             | `{name, email, password, phone?}`    | `{user}` (201) |
| POST   | `/auth/login`         | –             | `{email, password}`                  | `{user}` + cookies |
| POST   | `/auth/logout`        | cookie        | –                                    | – |
| POST   | `/auth/refresh`       | refresh cookie| rotates access + refresh token pair  | `{user}` |
| GET    | `/auth/me`            | access cookie | –                                    | `{user}` |
| PATCH  | `/auth/me`            | access cookie | `{name?, email?, phone?, avatar?}`    | `{user}` (email conflict → 409) |
| PATCH  | `/auth/password`      | access cookie | `{currentPassword, newPassword}` (min 8 chars) | – |
| POST   | `/auth/become-marketer` | access cookie (USER) | makes the user a MARKETER and issues their referral code | `{user, marketer}` (201, or 200 if already marketer) |

`user` is always `{id, name, email, role, avatar, phone, createdAt}`.
`marketer` is `{referralCode, referralLink, publicName, status}`.

## Public catalog

| Method | Path                  | Note                                              | Returns |
| ------ | --------------------- | ------------------------------------------------- | ------- |
| GET    | `/products`           | `?category&q&sort&page&limit&minPrice&maxPrice&inStock&featured&offer` (paged) | `{products, page, limit, total, pages}` |
| GET    | `/products/slug/:slug`|                                                   | `{product}` |
| GET    | `/products/:id`       |                                                   | `{product}` |
| GET    | `/categories`         | active only, ordered by `order`; each category includes `productCount` | `Category[]` |
| GET    | `/banners`            | active only (max 5 enforced); image-only payload `{_id, image, link, order}` | `HeroBanner[]` |
| GET    | `/posts/home`         | latest 6 published posts, populated product `{_id, name, nameAr, slug, image, price, oldPrice, isSpecialOffer, discount}` | `Post[]` |
| GET    | `/posts`              | `?page&limit` (paged, published only)                    | `{posts, page, total, pages}` |
| GET    | `/posts/:id`          | single published post                                    | `{post}` |

### Post shape

Posts carry multilingual text flat (`textEn`, `textAr`) plus media.
`mediaType` is `images` (up to 5 `images[]`) or `video` (single `video` URL,
`images` cleared). `productId` references the existing Product (`_id`) — the
server validates it exists and never stores duplicate product data. `status`
is `draft` | `published`. Public endpoints only return `published` posts.

### Public product shape

Products expose multilingual fields flat: `name`, `nameAr`, `nameFr`, `description`,
`descriptionAr`, `descriptionFr`. `discount` is computed dynamically from
`(oldPrice - price) / oldPrice` — exposed only for special offers (`isSpecialOffer`,
which requires `oldPrice > price > 0`); normal products always return `discount: 0`
and no `oldPrice`. Products also expose `isFeatured`, `isRewardEligible`,
`confirmedSales` (incremented on confirmed orders, used by best-selling sort; 0 for a
fresh/no-purchase storefront so the fallback order is creation date) and `images`
(max 4).

`sort` values: `featured`, `popular`, `best-selling` (confirmedSales desc, then
newest), `newest`, `priceAsc`, `priceDesc`. Add `offer=true` to list only
special offers (requires `oldPrice > price > 0`).

## Orders

| Method | Path        | Auth          | Note                                                    | Returns |
| ------ | ----------- | ------------- | ------------------------------------------------------- | ------- |
| POST   | `/orders`   | optionalAuth  | `{items:[{productId, qty}], referralId?, customer}`     | `{order}` (201) |
| GET    | `/orders/me`| access cookie | orders belonging to the logged-in user                  | `{orders}` |

The server recomputes all prices/totals and stores product price snapshots on
order items; client-supplied prices are ignored. A flat `DELIVERY_FEE` is added
to every order (from `config/shop.js`).
If `referralId` is given, the order is attributed to the owning marketer and a
10% commission is stored until the order is confirmed. Reward discounts apply
per line only to `isRewardEligible` products for logged-in users (see
`models/Reward.js`).

## Marketer (auth + role MARKETER)

| Method | Path                 | Note                                                 | Returns |
| ------ | -------------------- | ---------------------------------------------------- | ------- |
| GET    | `/marketer/me`       | profile + lifetime stats, referral link, base URL    | `{profile, stats, baseUrl}` |
| PATCH  | `/marketer/me`       | `{publicName?, bio?, avatar?, payoutDetails:{ccp?, baridiMob?}}` | `{profile}` (`updated` doc) |
| GET    | `/marketer/earnings` | commissions sorted newest-first, order populated (orderRef, total) | `{commissions}` |

`profile` is `{id, publicName, bio, avatar, referralCode, referralLink, status, payoutDetails, totalEarnings, createdAt}`.
`stats` is `{visits, attributedOrders, commission:{pending, approved, paid, cancelled, total}}`.

## Referral tracking (public)

| Method | Path               | Note                                                        | Returns |
| ------ | ------------------ | ----------------------------------------------------------- | ------- |
| POST   | `/marketing/track` | `{referralCode, productId?, path?}`; 404 on unknown/suspended code or product | `{referralId}` (201) |

## Rewards

| Method | Path       | Auth   | Note                                             | Returns |
| ------ | ---------- | ------ | ------------------------------------------------ | ------- |
| GET    | `/rewards/me` | access cookie | Discount rules + purchase count for the user  | `{rules, count}` |

(`GET /rewards/me` is planned; reward discount is currently applied server-side at
order creation for eligible products based on the user's confirmed-purchase count —
see `models/Reward.js` `getRewardDiscount`.)

## Admin (auth + role ADMIN; all under `/admin`)

| Method | Path                       | Note                                        | Returns |
| ------ | -------------------------- | ------------------------------------------- | ------- |
| GET    | `/admin/users`             | `?role&q&page&limit`; each user includes `orderCount` and `totalSpent` | `{users, page, limit, total, pages}` |
| GET    | `/admin/marketers`         | marketers + profile + visits + commission   | `{marketers}` |
| PATCH  | `/admin/marketers/:id/status` | `{status: active\|suspended}`            | `{marketing}` |
| DELETE | `/admin/marketers/:id`     | deletes user + profile + referrals + commissions + payouts | `{id}` |
| GET    | `/admin/orders`            |                                             | `{orders}` |
| PATCH  | `/admin/orders/:id/status` | enforces the order state machine            | `{order}` |
| GET    | `/admin/products`          | `?page&limit&q&category&isActive`           | `{products}` |
| POST   | `/admin/products`          | whitelisted fields; special offer requires `oldPrice > price`; `images` capped at 4 | `{product}` (201) |
| PATCH  | `/admin/products/:id`      | partial update; same validation as create   | `{product}` |
| DELETE | `/admin/products/:id`      |                                             | – |
| PATCH  | `/admin/products/:id/toggle` | `{isActive?, isFeatured?, isSpecialOffer?, isRewardEligible?}`; enabling `isSpecialOffer` requires an existing `oldPrice > price`, disabling clears `oldPrice` | `{product}` |
| GET    | `/admin/categories`        |                                             | `Category[]` |
| POST   | `/admin/categories`        | `{slug, name, ...}` (whitelisted; slug unique) | `{category}` (201) |
| PATCH  | `/admin/categories/:id`    | partial update (e.g. `{active}`)            | `{category}` |
| DELETE | `/admin/categories/:id`    |                                             | – |
| GET    | `/admin/banners`           |                                             | `{banners, activeCount, max}` |
| POST   | `/admin/banners`           | requires only `image` (plus optional `link`, `order`, `active`); max 5 active | `{banner}` (201) |
| PATCH  | `/admin/banners/:id`       | `{active:true}` blocked when at max         | `{banner}` |
| DELETE | `/admin/banners/:id`       |                                             | – |
| POST   | `/admin/payouts`           | `{marketerId, amount, period, method(CCP\|BaridiMob), reference?}` | `{payout}` (201) |
| GET    | `/admin/payouts`           | `?marketer&period`                          | `{payouts}` |
| GET    | `/admin/posts`             | all posts (draft + published), product populated | `{posts}` |
| POST   | `/admin/posts`             | `{textEn?, textAr?, mediaType, images?, video?, productId, status?}`; product required & validated, images capped at 5, video posts clear images | `{post}` (201) |
| PATCH  | `/admin/posts/:id`         | partial update; same validation as create   | `{post}` |
| DELETE | `/admin/posts/:id`         |                                             | – |
| PATCH  | `/admin/posts/:id/publish` | toggles `draft` ⇄ `published`               | `{post}` |
| POST   | `/admin/upload`            | image upload (gridfs), max 5 MB              | `{url}` (201) |
| POST   | `/admin/upload/video`      | video upload (gridfs), max 50 MB (mp4/webm/ogg/mov) | `{url}` (201) |

Error statuses: `400` validation, `401` unauthenticated, `403` wrong role /
suspended marketing, `404` not found, `409` duplicate key, `500` internal,
`429` rate limited.