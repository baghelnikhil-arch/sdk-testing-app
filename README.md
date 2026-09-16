# Aurelle — e-commerce demo storefront

A complete, responsive storefront built with Next.js (App Router), TypeScript and
Tailwind CSS. It runs entirely on local mock data: no backend, no auth, no
payments. The point is to be **simple enough to read, polished enough to show,
and structured enough to extend.**

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build + type check
```

---

## Routes

| Route               | Rendering | Notes                                         |
| ------------------- | --------- | --------------------------------------------- |
| `/`                 | Static    | Hero, categories, featured, promo, new arrivals, benefits, newsletter |
| `/shop`             | Dynamic   | Reads `?q=` and `?sale=` from the URL         |
| `/shop/[category]`  | Dynamic   | Prerendered params for all four categories    |
| `/product/[id]`     | SSG       | One page per product via `generateStaticParams` |
| `/cart`             | Static    | Client-rendered contents (localStorage)       |
| `/wishlist`         | Static    | Client-rendered contents (localStorage)       |
| `/about`            | Static    |                                               |
| `/contact`          | Static    | Simulated submit, no network call             |
| `/settings/integrations` | Static | Both connections: catalogue source and order destination |
| `/api/viasocket/*`  | Dynamic   | Server-only bridge to viaSocket (see below)   |
| `not-found`         | Static    | Custom 404                                    |

---

## Where things live

```
src/
├── app/            Routes. Server Components unless interaction demands otherwise.
├── components/
│   ├── layout/     Navbar, MobileMenu, Footer, ContactForm
│   ├── product/    Card, grid, gallery, purchase panel, tabs, wishlist view
│   ├── shop/       ShopBrowser (search + filter + sort + paginate), FilterSidebar, SortDropdown
│   ├── cart/       Cart line, summary, view
│   ├── home/       Hero, PromoBanner, Benefits
│   ├── ui/         Button, Badge, Price, Rating, Breadcrumb, Pagination, EmptyState, …
│   └── integrations/ GoogleSheetsCard (connect button + pickers)
├── data/           products.ts, categories.ts, reviews.ts, images.ts  ← the mock database
├── hooks/          use-cart, use-wishlist (Context + reducer, persisted)
├── lib/            queries.ts (data access), catalogue.ts (sheet → Product mapping),
│                   cart.ts (pricing), viasocket.ts (server only), sync-catalogue.ts,
│                   order-export.ts, integration-store.ts, end-user.ts, constants, utils
└── types/          Domain types
```

## The four seams that make this extensible

Everything below exists so that adding a real backend does **not** mean
rewriting the UI.

1. **`src/lib/queries.ts` is the only thing that touches the mock data.**
   Screens call `getProduct`, `filterProducts`, `getRelatedProducts` and so on.
   Swapping `src/data` for a database or an HTTP API means changing the bodies of
   these functions (and making them `async`) — no component changes.

2. **`src/lib/cart.ts` owns pricing.** Subtotal, discount and shipping are
   computed in `computeTotals`, not scattered through components. A real
   promotions or tax service replaces that one function.

3. **`src/app/providers.tsx` is the client-state mount point.** Auth, toasts or a
   query client wrap here. The layout never changes.

4. **`src/types/index.ts` describes shape, not source.** As long as an API
   returns `Product`, everything downstream keeps working.

Adding auth, orders, an admin dashboard, coupons or real reviews should slot into
these seams. None of them are implemented — deliberately.

### Adding a product

Append an object to `products` in `src/data/products.ts`. It appears in search,
filters, sorting, its category page and its own detail route automatically.
Images go through the `img()` helper in `src/data/images.ts`, so pointing at a
real CDN is a one-line change.

---

## Design system

All tokens live in one `@theme` block at the top of `src/app/globals.css` —
colours, radii, shadows, typography, container width. **Changing the accent is a
single edit**: rewrite the `--color-accent-*` scale and the whole site follows
(buttons, focus rings, badges, progress bars, links).

Conventions worth knowing:

- Neutral base, one accent. Sale red is the only other colour.
- Two radii in practice: `rounded-md` for controls, `rounded-lg`/`xl` for surfaces.
- `.container-page` and `.section-y` define the page gutter and vertical rhythm
  once; sections use them rather than inventing padding.
- Buttons only ever come from `Button`/`ButtonLink`. On dark photographic panels
  use `variant="inverse"` — an override class will lose to `bg-primary`, because
  Tailwind resolves conflicts by CSS source order, not class order.

## Responsive behaviour

Layouts are chosen per breakpoint, not shrunk:

- Product grids: 2 columns on phones → 3 on tablets → 4 on desktop.
- Shop: filter rail from `lg` up; below that a drawer behind a Filters button.
- Product page: two columns from `lg`, single column below, gallery thumbnails
  moving from a side rail to a row underneath.
- Navigation: full nav from `lg`; below that a portalled slide-in drawer.

> The mobile drawer is portalled to `document.body` on purpose. The sticky header
> uses `backdrop-blur`, which makes it a containing block for `position: fixed`
> children — a drawer rendered inside it gets trapped in the header's box.

## State

Cart and wishlist are React Context over a reducer, persisted to `localStorage`
and hydrated after mount (`hydrated` flag) so server and client markup match.
Cart lines are keyed by product **plus** size and colour, so the same shirt in
two sizes is two lines. No Redux — there is nothing here that needs it.

## What was verified

Every route was loaded in a headless browser: no console errors, no failed
requests, no broken images, and no horizontal overflow at 390 / 834 / 1280 /
1920px. Cart, wishlist, search, filters, sort, pagination, tabs and persistence
across reload were exercised end to end. Focus rings, heading order, form labels
and Escape-to-close were checked.

---

## Google Sheets integrations (viaSocket)

Two **independent** connections on `/settings/integrations`, each with its own
Google account and its own spreadsheet:

| Connection | Direction | Action used |
| --- | --- | --- |
| **Product catalogue** | Sheet → shop | `List Rows in Sheet` + `Row Added Or Updated` |
| **Order export** | Shop → sheet | `Add Multiple Rows` |

They are separate on purpose: a shop may read products from a merchandising
sheet owned by one person and write orders to a finance sheet owned by another.
Connecting, changing the sheet, or disconnecting one never touches the other.

### Product catalogue

Rows in the chosen sheet become real products — they appear in the shop, in
category pages and search, get their own `/product/sheet-…` page, and can be
added to the cart and wishlist. Import is a **full replace**, so it is idempotent
and rows deleted from the sheet disappear from the shop.

- **Import now** pulls the sheet. This is also the backfill, since the trigger
  only fires for rows added after you subscribe.
- **Live updates** subscribes to `Row Added Or Updated`, pointed at
  `/api/viasocket/catalogue-webhook`.

Live updates work by viaSocket calling *this app* from its servers, so they need
an address that resolves on the public internet. `localhost` does not, and
viaSocket gives no delivery feedback — a subscription pointed at it would sit
there silently dead, and a trigger subscription cannot be found again from the
flows listing. So the address is validated before anything is created.

```bash
# Developing: expose the dev server, then use the URL the tunnel prints.
ngrok http 3000                              # or: cloudflared tunnel --url http://localhost:3000
# .env.local
APP_PUBLIC_URL=https://<your-subdomain>.ngrok-free.app
```

Restart the app after changing it — env files are read at boot. Tunnel URLs
usually change each restart, and the webhook is registered with the URL that was
current at subscribe time, so after a new tunnel: turn live updates off, then on
again. If you do not want a tunnel, skip live updates entirely — **Import now**
works fine on localhost.

Columns are matched loosely (`Product Name`, `product_name` and `NAME` all work).
Only `Name` and `Price` are required; a row missing either is skipped with a
reason rather than failing the import. Full list is in the card under **Columns
this sheet can use**.

> viaSocket does not sign webhook deliveries, so authenticity rests on an
> unguessable token in the webhook URL. The body is treated as a signal only —
> never as data. The sheet is re-read through the authenticated action, which is
> the one source trusted.

### Order export


Checkout appends the order to the chosen spreadsheet — one row per line item,
with totals. Everything else about checkout stays simulated. The destination can
also be seen and changed from the cart page itself.

```bash
cp .env.example .env.local   # then set VIASOCKET_EMBED_SECRET
```

Without that secret the card shows a setup notice, the connect button is
disabled, and checkout behaves exactly as it did before.

### How it fits together

```
browser                    your server                     viaSocket        Google
──────────────────────────────────────────────────────────────────────────────────
connect button  ──▶ GET  /api/viasocket/token   ──▶ signed embed token
   popup ───────────────────────────────────────────────────────────────▶ consent
   auth_id  ──────▶ POST /api/viasocket/connected ─▶ enable ─▶ script_id (stored)
pickers        ──▶ POST /api/viasocket/options   ─▶ list-options ─▶ real sheets
checkout       ──▶ POST /api/viasocket/export-order ─▶ run action ─▶ rows appended
```

Your code never holds Google credentials and never refreshes a token — viaSocket
owns that.

### Things that will bite you if you change them

- **The embed token and signing secret are server-side only.** The browser gets a
  token solely to open the consent popup.
- **`script_id` is a credential** — anyone holding it can run Google Sheets as
  that user. It is stored server-side and never returned to the browser.
- **`unique_identifier` must be stable forever.** The demo mints one into an
  httpOnly cookie in [`src/lib/end-user.ts`](src/lib/end-user.ts); **replace it
  with your real user id.** Change the value for an existing person and their
  connection appears to vanish.
- **Ids are fetched, never guessed.** The spreadsheet and tab pickers both come
  from `list-options`; a tab is only meaningful inside a spreadsheet, so that
  call passes the chosen spreadsheet in `existingFields`. Asking for a dependent
  field with `{}` returns an empty list rather than an error.
- **Field-key casing is not a typo.** This action uses `spreadSheet_Id` and
  `sheet_id`; other Google Sheets actions spell the same concepts differently.
  They are constants in [`src/lib/viasocket.ts`](src/lib/viasocket.ts).
- **Enable once.** `ensureEnabled` looks for an existing active flow first —
  enabling twice leaves two `script_ids` for one app.
- **Prices are rebuilt from the catalogue.** The browser sends product ids and
  quantities only; `rebuildOrder` recomputes every figure with the same
  `computeTotals` the cart uses.

### Why "Add Multiple Rows"

`Add New Row to Sheet` needs the user's columns chosen up front and mapped one by
one. `Add Multiple Rows` takes a JSON array and **creates the header row from the
JSON keys when the sheet is empty**, so a brand-new spreadsheet works on the first
export. The keys in `buildOrderRows` become the column headers — renaming one
adds a column to every sheet already in use.

### Managing a connection

The same controls appear in more than one place, driven by one hook
([`use-google-sheets.ts`](src/hooks/use-google-sheets.ts)) so they cannot drift:

- **Checkout** — a compact panel beside the order summary, so the destination can
  be seen and changed at the moment it matters.
- **`/settings/integrations`** — the full card, also linked from the footer under
  *Company → Integrations*.

Both offer **Change sheet**, **New connection** (authorise a different Google
account) and **Disconnect**. Disconnecting disables the flow before revoking the
authentication — the other order would leave a flow pointing at an auth that no
longer exists.

Reconnecting with a *different* Google account clears the saved spreadsheet and
tab: those ids live in the previous account's Drive. For the same reason
`findEnabledApp` matches on `auth_id` as well as service, so a second account
gets its own `script_id` rather than reusing the first one's.

## Deploying

The storefront itself deploys anywhere with no configuration. The integrations
need two things.

**1. Durable storage.** Serverless filesystems are read-only and instances share
nothing, so `.data/` cannot be used there — writing to it fails with
`ENOENT: no such file or directory, mkdir '/var/task/.data'`. Add a Redis/KV
integration (Vercel → Storage → Upstash works) so these are set:

```bash
KV_REST_API_URL=...      # UPSTASH_REDIS_REST_URL is also accepted
KV_REST_API_TOKEN=...    # UPSTASH_REDIS_REST_TOKEN is also accepted
```

[`src/lib/kv.ts`](src/lib/kv.ts) picks the backend from the environment: Redis
over HTTP when those exist, a JSON file otherwise. Nothing above it changes.
Without storage on a serverless host the settings page explains the problem
instead of erroring, and the shop keeps working — the integration is additive.

**2. The viaSocket secret.** Set `VIASOCKET_EMBED_SECRET` in the host's
environment variables, never in a committed file.

`APP_PUBLIC_URL` is detected automatically on Vercel from
`VERCEL_PROJECT_PRODUCTION_URL`, so live updates work after the first production
deploy without setting anything. The per-deployment host (`VERCEL_URL`) is
deliberately ignored: it changes on every push, and the webhook is registered
once with whatever URL was current at subscribe time.

### Replacing the storage seam

[`src/lib/kv.ts`](src/lib/kv.ts) is the whole of it: three methods, `get` / `set`
/ `del`. [`integration-store.ts`](src/lib/integration-store.ts) sits on top,
keyed per user (`integration:<id>`) rather than as one document, so two
concurrent serverless invocations cannot read-modify-write over each other. A
`webhooktoken:<token>` index maps unsigned webhook deliveries back to their owner
without scanning.

### What was verified

Catalogue import was exercised end to end against a local mock run server: the
action id and `spreadSheet_id` / `sheet_id` / `column_key` payload, loose header
matching, currency parsing, unknown categories, per-row skip reasons, and the
imported products then appearing in the shop, on their own product page and in
the cart. Webhook token authentication was checked (valid 200, wrong and missing
404), as was the guard that refuses to subscribe without `APP_PUBLIC_URL`.
Records written before purposes existed migrate to `orders` and keep working, as
do `.data/` files written before the KV seam existed. Both storage backends were
exercised: the file backend still resolves legacy data, and the Redis backend was
driven through a full read-modify-write round trip against a stub, with one
purpose's changes leaving the other untouched.

The connect popup and `list-options` need a real secret and were not exercised
against viaSocket.
Everything reachable without one was: the unconfigured path (503 / disabled
button / setup notice), the picker chain and save flow (API stubbed at the
network layer), and the export itself end to end against a local mock run
server — confirming the action id, the `spreadSheet_Id` / `sheet_id` / `rows_json`
payload, header-generating keys, and that tampered prices, oversized quantities
and unknown product ids are all rejected or clamped server-side.

## Not included, by design

Authentication, payments, orders, inventory, an admin area, or a real checkout.
The Checkout and Send Message buttons simulate success and say so — the one real
side effect is the Google Sheets export above, and only once it is connected.
