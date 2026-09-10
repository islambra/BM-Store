# BM Store — Product Social Posts / Media Section (Feature Report)

> Date: 2026-09-10. New admin "Posts" feature + public posts feed on BM Store.

---

## 1. What was added

- **New Admin tab "Posts"** under the existing Admin dashboard (sidebar + mobile
  pills), alongside Overview · Profile · Customers · Marketers · Orders ·
  Products · Categories · Banners. No existing admin section was touched.
- **Post/Media system** — admin-created promotional posts, each with EN + AR
  text, up to 5 images **or** a single video (never both), and a linked product
  referenced by its existing `_id`.
- **Public homepage section** "Discover What's New" (اكتشف جديدنا) placed
  directly after Best Sellers.
- **Public posts page** `/posts` with load-more pagination.
- **Mobile bottom navigation** gained a Posts item (MessageSquare icon) making
  the bar Cart · Wishlist · Posts · Account.

---

## 2. Post creation workflow (admin)

1. Admin opens **Posts** tab → clicks **Create Post**.
2. Writes post text in **English** and **Arabic** (no French fields).
3. Chooses media type: **Images** (multi-upload, max 5, per-file shown with
   remove) or **Video** (single file, MP4/WebM/OGG/MOV, up to 50 MB, with
   preview + replace + remove). Selecting one disables the other on the server.
4. Searches and selects a product from the existing product catalog
   (image + name + price shown; changeable/removable).
5. Saves as **Draft** (default) or **Published**. Draft → Publish via the
   publish toggle; publish/unpublish is reversible.

## 3. Media upload implementation

- Reuses the existing **MongoDB GridFS** storage via `/uploads/:id`.
- Image upload: `POST /api/admin/upload` (multer, 5 MB, image types only).
- New video upload: `POST /api/admin/upload/video` (multer, 50 MB,
  `video/mp4|webm|ogg|quicktime`).
- Uploads resolve to absolute URLs on the client before being stored on the post.

## 4. Image support

- Up to 5 images per image-post (server enforces `.slice(0, 5)` even if the
  client sends more).
- Preview thumbnails with remove buttons in the admin form.
- Public gallery layouts: single large image, 2-column for two, and a
  magazine-style grid (1 large + 2 stack) for three or more.

## 5. Video support

- Exactly one video per video-post; `images` are force-cleared server-side and
  vice-versa.
- Public player: poster-style click-to-play with a centered play button; once
  played, native controls appear. Never autoplays.

## 6. Product linking implementation

- Posts store only `productId` (a real Product ObjectId); the server validates
  the product exists. All product data on the public side comes from a Mongo
  `populate` of the live product (name/nameAr/slug/image/price/oldPrice/
  isSpecialOffer/discount) — no duplicated product snapshots.
- Public cards show a compact product preview (image, localized name, price,
  strike-through old price for offers). Clicking navigates to the real product
  page `/product/<slug>`.

## 7. Public Posts section & pages

- **Home**: `HomePostsSection` after Best Sellers, up to 6 latest published
  posts, "View all" → `/posts`. Hides entirely when no published posts exist.
- **/posts**: load-more pagination (6 per page), skeleton loaders, empty state
  ("No posts available yet." / لا توجد منشورات حالياً).

## 8. Post status

- `draft` — invisible publicly.
- `published` — visible on home + `/posts`. Public endpoints filter to
  `status: 'published'` only.

## 9. Admin management

- List view: media thumbnail, localized text preview, linked product, status
  badge, created date, actions (publish/unpublish toggle, edit, delete).
- Delete is guarded by a confirmation dialog ("Delete this post? This action
  cannot be undone.").

## 10. Database model

`server/models/Post.js` (rewritten):

```
Post {
  textEn?, textAr?   (max 2000)
  mediaType: 'images' | 'video'
  images: [String]   (max 5, only when mediaType = images)
  video: String|null (only when mediaType = video)
  productId: ObjectId ref Product   (required)
  status: 'draft' | 'published'
  timestamps
}
Index: { status, createdAt: -1 }
```

(The existing `server/models/Reaction.js` and `server/models/Comment.js` are
reused for the v2 like/comment engagement system — see section 15.)

## 11. API routes

| Method | Path                      | Auth            | Purpose |
| ------ | ------------------------- | --------------- | ------- |
| GET    | `/posts/home`             | –               | latest 6 published |
| GET    | `/posts`                  | –               | published, paged (`?page&limit`) |
| GET    | `/posts/:id`              | –               | single published post |
| GET    | `/admin/posts`            | ADMIN           | all posts + product populated |
| POST   | `/admin/posts`            | ADMIN           | create (validates product, max 5 images, video clears images) |
| PATCH  | `/admin/posts/:id`        | ADMIN           | partial update |
| DELETE | `/admin/posts/:id`        | ADMIN           | delete |
| PATCH  | `/admin/posts/:id/publish`| ADMIN           | toggle draft ⇄ published |
| POST   | `/admin/upload`           | ADMIN           | image (5 MB) |
| POST   | `/admin/upload/video`     | ADMIN           | video (50 MB) |

Public users can only read; all mutations require the ADMIN role (route
guards `requireAuth` + `requireAdmin`).

## 12. Files modified

Backend:
- `server/models/Post.js` — rewritten schema.
- `server/controllers/post.controller.js` — new (public + admin handlers).
- `server/routes/post.routes.js` — new (public router).
- `server/routes/admin.routes.js` — added `/posts` CRUD + publish.
- `server/controllers/video.controller.js` — new video upload handler.
- `server/routes/upload.routes.js` — added `/video`.
- `server/utils/upload.js` — added video multer config.
- `server/app.js` — mounted `/api/posts`.
- `server/test/posts.test.js` — new (12 tests).

Client:
- `client/src/types/index.ts` — added `Post` / `PostProduct` types.
- `client/src/services/api.ts` — post CRUD + public loaders + `uploadVideo`.
- `client/src/services/catalog.ts` — `toPost`, `loadHomePosts`, `loadPostsPage`.
- `client/src/components/admin/PostsSection.tsx` — new admin section.
- `client/src/components/post/PostCard.tsx` — new public post card.
- `client/src/pages/PostsPage.tsx` — new public page.
- `client/src/components/home/HomePostsSection.tsx` — new homepage section.
- `client/src/pages/Home.tsx` — posts section after Best Sellers.
- `client/src/pages/AdminPage.tsx` — added Posts tab.
- `client/src/components/layout/MobileNav.tsx` — added Posts item (4-col bar).
- `client/src/App.tsx` — added `/posts` route.
- `client/src/i18n/translations.ts` — EN/AR keys (nav.posts, posts.*, admin.post.*).

Docs:
- `docs/API.md` — posts endpoints + video upload documented.

## 13. Build & test results

- Client `npm run build` (tsc + vite) — **PASS**.
- Client `npm test -- --run` — **5/5 PASS**.
- Server `npm test` — **69/69 PASS** (12 new posts tests + 57 existing).

## 14. Remaining issues / notes

- Media files deleted with a post are left in GridFS (matching the existing
  banner/product pattern — no active cleanup infra).
- `video/quicktime` is accepted server-side but browser playback inside
  `<video>` depends on codec support; MP4/WebM are the safe choices.
- The homepage posts section is hidden when zero posts are published (posters
  cleared as intended, no empty card shown).

---

# V2 — Likes, Comments & Share (2026-09-10)

## 15. What was added

- **Single post page** `/posts/:id` (auto-opens the comments section).
- **Like system** — authenticated users, one like per user per post
  (DB-enforced), real counts, unlike supported, optimistic UI with rollback on
  error. Guests are redirected to `/login` (returning to the same post after
  login via `location.state.from`).
- **Comments** — create/edit/delete your own, admin may delete any, oldest
  first, 8 per page with "Load more", inline editing, empty state, confirm
  dialog on delete, real author avatars/initials, no replies.
- **Share** — native `navigator.share()` when available, otherwise a modal
  with Copy Link / WhatsApp / Facebook / Telegram (buttons open in a new tab).
- **Post page redesign** — removed the hero ("Blog & Updates / Latest Posts /
  subtitle / N posts"), now a centered single-column social feed; card got a
  header (store mark + date), likes/comments totals row, and a
  Heart/MessageCircle/Share2 action bar.
- **Everything remains non-skeleton**: counts and `userLiked` are computed
  from real `Reaction`/`Comment` documents — no fake/zero-padded data.

## 16. Backend (engagement)

- Reuses `server/models/Reaction.js` (`type: 'like'`, unique index on
  `{post, user}` → one like per user, idempotent duplicates swallowed) and
  `server/models/Comment.js` (`post`, `author`, `text`, max 1000 chars).
- `post.controller.js`:
  - `enrichPosts(docs, viewerId)` — adds `likesCount`, `commentsCount`,
    `userLiked` via aggregation + per-viewer lookup.
  - `getPublishedPosts`/`getPublishedPostsHome`/`getPostById` now enriched and
    `optionalAuth` (guests still get real counts).
  - `likePost` / `unlikePost` → `{liked, likesCount}`.
  - `listComments` (asc, page size 8), `createComment`, `updateComment`
    (owner only), `deleteComment` (owner or ADMIN).
  - `adminDeletePost` cascades: removes all Reactions + Comments of the post.
- Comment payloads expose `{_id, name, avatar}` for the author — never
  `email`/`phone`.
- New route files: `server/routes/post.routes.js` (public reads + like +
  comment collection) and `server/routes/comments.routes.js`
  (`PUT`/`DELETE /api/comments/:commentId`).

## 17. Client (engagement)

- `services/api.ts` — `put` helper; `likePost`, `unlikePost`, `getPostById`,
  `getComments`, `createComment`, `updateComment`, `deleteComment`; types
  `CommentRecord`, `LikeResult`; `PostRecord` gained `likesCount`,
  `commentsCount`, `userLiked`.
- `services/catalog.ts` — `PostItem` engagement fields + `loadPost(id)`.
- `components/post/PostCard.tsx` — redesigned as a social card (header row,
  totals row, action bar, collapsible comments, optimistic like, share).
- `components/post/CommentsSection.tsx` — new (composer w/ guest login prompt,
  list, inline edit, delete confirm, load-more, empty state).
- `components/post/ShareModal.tsx` — new (portaled, native share + copy/whatsapp/facebook/telegram).
- `pages/PostsPage.tsx` — hero removed; centered single-column feed.
- `pages/SinglePostPage.tsx` — new; `/posts/:id` route in `App.tsx`.
- `components/layout/Layout.tsx` — footer hidden for `/posts` **and** `/posts/:id`
  (`pathname.startsWith('/posts')`).
- i18n — EN/AR keys `posts.*` (like/liked, comments, share, writeComment,
  noComments, deleteComment…).

## 18. Tests (server: `server/test/post-engagement.test.js`, 10 tests)

Guest 401s on like/comment · duplicate like prevented · unlike · real counts +
`userLiked` for logged-in viewer · safe author object (no email/phone) ·
empty/oversized comment rejected · owner-only edit · owner/admin delete ·
pagination + count updates · post deletion cascades to likes/comments.

Results: Server `npm test` — **79/79 PASS**. Client build — **PASS**.
Client tests — **5/5 PASS**.