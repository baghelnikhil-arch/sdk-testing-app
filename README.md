# Aurelle — e-commerce demo storefront

A complete, responsive storefront built with Next.js 16 (App Router), TypeScript,
Tailwind CSS and Postgres. It has accounts, a database-backed catalogue and two
Google Sheets integrations. There is no payment provider: checkout records a real
order but charges nothing.

```bash
npm install
cp .env.example .env.local   # then fill in DATABASE_URL at minimum
npm run db:push              # create the tables
npm run db:seed              # load the starting catalogue
npm run dev                  # http://localhost:3000
```

The first account you create becomes the shop administrator.

---

## Routes

| Route               | Rendering | Notes                                         |
| ------------------- | --------- | --------------------------------------------- |
| `/`                 | Dynamic   | Hero, categories, featured, promo, new arrivals, benefits, newsletter |
| `/shop`             | Dynamic   | Reads `?q=` and `?sale=` from the URL         |
| `/shop/[category]`  | Dynamic   | One page per category, from the database      |
| `/product/[id]`     | Dynamic   | Rendered per request; the catalogue can change at any time |
| `/cart`             | Dynamic   | Account cart when signed in, browser cart otherwise |
| `/wishlist`         | Dynamic   | Same                                          |
| `/about`            | Dynamic   |                                               |
| `/contact`          | Dynamic   | Simulated submit, no network call             |
| `/login`, `/signup` | Dynamic | Sign in and register |
| `/account`          | Dynamic | Your orders; signed-in only |
| `/settings/integrations` | Dynamic | Both connections; **administrators only** |
| `/api/viasocket/*`  | Dynamic   | Server-only bridge to viaSocket (see below)   |
| `not-found`         | Dynamic   | Custom 404                                    |

Every route is server-rendered per request because the header shows who is signed
in. `src/proxy.ts` redirects signed-out visitors away from `/account` and
`/settings` before the page renders.

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
│   ├── integrations/ SheetsConnectionCard, ProductSheetCard (connect + pickers)
│   └── auth/       AuthForm (sign in and sign up)

├── hooks/          use-session, use-catalogue, use-cart, use-wishlist
├── lib/            shop-data.ts (all catalogue reads), queries.ts (pure list logic),
│                   catalogue.ts (sheet → Product mapping), cart.ts (pricing),
│                   viasocket.ts (server only), sync-catalogue.ts, order-export.ts,
│                   images.ts (placeholder photography for the marketing pages),
│                   auth.ts, cart-store.ts, order-store.ts, db.ts,
│                   integration-store.ts (Prisma), end-user.ts
├── proxy.ts        Optimistic route protection (Next 16's renamed middleware)
└── types/          Domain types

prisma/
├── schema.prisma   The tables
├── seed.ts         Loads seed-data into the database
├── seed-data/      products.ts, categories.ts, reviews.ts — starting content only
└── create-admin.ts Creates or promotes an administrator
```

Nothing under `prisma/` is imported by the running app. The shop reads everything
from Postgres; those files exist so a fresh database has something in it.

## The four seams that make this extensible

Everything below exists so that adding a real backend does **not** mean
rewriting the UI.

1. **`src/lib/shop-data.ts` is the only thing that queries the catalogue.**
   Screens call `getCatalogueProducts`, `getCategory`, `getReviews` and so on.
   This seam is what made moving from TypeScript files to Postgres a change to
   one module rather than to every page.

2. **`src/lib/cart.ts` owns pricing.** Subtotal, discount and shipping are
   computed in `computeTotals`, not scattered through components. A real
   promotions or tax service replaces that one function.

3. **`src/app/providers.tsx` is the client-state mount point.** The session,
   catalogue, cart and wishlist providers are mounted here, in that order — each
   one reads the one above it. A toast system or query client wraps here too.

4. **`src/types/index.ts` describes shape, not source.** As long as an API
   returns `Product`, everything downstream keeps working.

Accounts, orders and the Sheets integrations were all added through these seams
rather than around them. Coupons, payments or an admin dashboard would go the
same way.

### Adding a product

Three ways, in increasing order of realism: append to
`prisma/seed-data/products.ts` and run `npm run db:seed`; insert a row in the
`Product` table; or add a row to the connected Google Sheet and press **Import
now**.

Seeding only replaces rows marked `source: "seed"`, so it never destroys products
imported from a spreadsheet.

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

Cart and wishlist are React Context over a reducer. Where they persist depends on
who is holding them: Postgres for a signed-in account, `localStorage` for a
visitor. Either way nothing renders until `hydrated` flips, so server and client
markup always match. Cart lines are keyed by product **plus** size and colour, so
the same shirt in two sizes is two lines. No Redux — nothing here needs it.

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

## Database

Everything the app reads or writes lives in Postgres, through Prisma:

| Table | Holds |
| --- | --- |
| `Product` | The whole catalogue. `source` is `"seed"` (shipped with the repo) or `"sheet"` (imported from a spreadsheet) — an import replaces only the latter. |
| `Category` | The four edits the shop is organised by. |
| `Review` | Product reviews, cascading with their product. |
| `Connection` | One row per (viaSocket identity, purpose): the connection and its sheet, plus the account that owns it. |
| `User` / `Session` | Accounts and server-side sessions. |
| `CartItem` / `WishlistItem` | Per user, so they follow the account across devices. |
| `Order` / `OrderItem` | Placed orders, with prices copied in so history cannot be rewritten by a catalogue change. |

```bash
npm run db:push     # apply prisma/schema.prisma
npm run db:seed     # load src/data into the database (safe to re-run)
npm run db:studio   # browse it
```

`src/data/*.ts` is now **seed material, not runtime data** — the app never imports
it. Editing a product there changes nothing until `npm run db:seed` runs, and
seeding only touches `source: "seed"` rows, so it never destroys an imported
catalogue.

`DATABASE_URL` is the **pooled** endpoint and is what the app uses — serverless
functions come and go constantly and would exhaust a connection limit without a
pooler. `DIRECT_URL` is the unpooled one, used only for migrations, which need a
real session. `prisma generate` runs on `postinstall`, so any host builds the
client automatically.

### How the catalogue reaches the page

`src/lib/shop-data.ts` is the only module that queries products, categories or
reviews. Server Components call it directly. The browser cannot — the catalogue
is no longer in the bundle — so the cart and wishlist resolve their stored
product ids through `/api/catalogue` instead, and report themselves as not yet
hydrated until it arrives.

`src/lib/queries.ts` holds no data at all now: it is the filter, sort, paginate
and related-products logic, operating on whichever list it is handed. That is why
searching behaves identically on the server-rendered shop page and in the
client-side cart.

Every read is wrapped so an unreachable database degrades instead of erroring —
the storefront falls back to an empty catalogue rather than a stack trace.

## Accounts

One shop, many shoppers. Browsing is public; anything that belongs to a person
needs an account.

| | Signed out | Customer | Admin |
| --- | --- | --- | --- |
| Browse, search, product pages | ✅ | ✅ | ✅ |
| Cart & wishlist | in this browser | saved to the account | saved to the account |
| Checkout & order history | — | ✅ | ✅ |
| Google Sheets integrations | — | — | ✅ |

**The first account created is the administrator**, and any address in
`ADMIN_EMAILS` is too — otherwise a fresh database would have no way to reach the
integration settings.

Once the shop is live and everyone who registered is a customer, that rule is no
help. This is the way back in:

```bash
npm run db:create-admin -- you@example.com "Your Name" [password]
```

It creates the account, or promotes an existing one, prints the password once if
you did not supply it, and adopts any Google Sheets connection left without an
owner. Safe to re-run.

### How it works

- **Passwords** use `scrypt` from Node's standard library — no dependency, and
  deliberately slow. Stored as `salt:hash`, compared with `timingSafeEqual`.
- **Sessions are stored, not signed.** The browser holds an opaque random token;
  every check looks it up. That costs a query and buys real revocation — signing
  out invalidates immediately, which a self-contained JWT cannot.
- **Two layers of checking.** `src/proxy.ts` (Next 16 renamed `middleware.ts` to
  `proxy.ts`) does the *optimistic* check: it only asks whether a session cookie
  exists, because it runs on every request including prefetches and must not
  touch the database. The *real* check is `getCurrentUser()` in
  [`lib/auth.ts`](src/lib/auth.ts), which every page and route handler uses.
  Nothing trusts the cookie alone.
- **Per-user data is scoped in one place.** [`cart-store.ts`](src/lib/cart-store.ts)
  and [`order-store.ts`](src/lib/order-store.ts) take a `userId` and filter every
  query on it, and that id always comes from the session — never from the
  request. There is no endpoint that accepts "whose cart".

### Signed-out carts

A visitor's cart lives in `localStorage`. On sign-in it is merged into the
account — quantities add rather than overwrite — and the browser copy is then
cleared, so signing out or signing in as somebody else on the same machine
cannot resurrect the previous person's cart.

### viaSocket identity vs account identity

These are deliberately different. viaSocket's `unique_identifier` must never
change for a given connection, so `Connection.endUserId` keeps whatever identity
it was created with, while `Connection.userId` records which account manages it.
New connections use the account's `viasocketId`, fixed at signup so changing an
email cannot orphan them. Connections made before accounts existed are adopted by
the first administrator to sign in.

## Deploying

Set these in the host's environment variables — never in a committed file:

```bash
DATABASE_URL=            # pooled Postgres URL
DIRECT_URL=              # unpooled, for migrations
VIASOCKET_EMBED_SECRET=  # from the viaSocket Install Code page
ADMIN_EMAILS=            # optional, comma separated: these addresses sign up as admins
```

A first deploy against an empty database needs `npm run db:push` and
`npm run db:seed` once. After that the schema and seed are already in place and
deploys need nothing.

`APP_PUBLIC_URL` is detected automatically on Vercel from
`VERCEL_PROJECT_PRODUCTION_URL`, so live catalogue updates work after the first
production deploy without setting anything. The per-deployment host
(`VERCEL_URL`) is deliberately ignored: it changes on every push, and the webhook
is registered once with whatever URL was current at subscribe time.

Without a database the settings page says so plainly and the shop keeps working —
the integration is additive, so an unconfigured integration never takes the
storefront down.

### Replacing the storage seam

[`src/lib/db.ts`](src/lib/db.ts) owns the client and
[`integration-store.ts`](src/lib/integration-store.ts) is the only module that
queries it — every route and page goes through those functions, never through
Prisma directly. `webhookToken` is unique in the schema, so attributing an
unsigned webhook delivery is one indexed lookup rather than a scan.

### What was verified

Catalogue import was exercised end to end against a local mock run server: the
action id and `spreadSheet_id` / `sheet_id` / `column_key` payload, loose header
matching, currency parsing, unknown categories, per-row skip reasons, and the
imported products then appearing in the shop, on their own product page and in
the cart. Webhook token authentication was checked (valid 200, wrong and missing
404), as was the guard that refuses to subscribe without `APP_PUBLIC_URL`.
Postgres was exercised against the real database: connections read back through
the API, a catalogue import wrote rows inside its transaction, the storefront and
`/api/catalogue` served them, and three consecutive imports left three products
rather than nine — confirming replace-not-append. `prisma generate` was checked
with no database variables set, which is what a build host does.

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
