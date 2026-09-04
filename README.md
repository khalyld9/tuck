# Tuck

A quiet place for the things you want to come back to.

Find something interesting → tuck it away → come back when you're ready.
No account, no server, no analytics. Everything lives on the device.

---

## Running it

```bash
npm install
npx expo start
```

Press `i` for the iOS simulator, `a` for Android, `w` for the browser.

Two commands worth knowing:

```bash
npm run typecheck     # tsc --noEmit, strict
npm test              # import parser + colour contrast
npm run test:import   # feeds the import parser malformed payloads
npm run test:contrast # asserts every text pairing clears WCAG AA
```

There is no demo data in a fresh install. In a development build, Settings
grows a **Development** section with an "Add sample data" row that inserts
twelve realistic saved things. It is compiled out of release builds.

---

## How it is put together

```
app/            screens, one file per route (expo-router)
components/     ui primitives, cards, forms, lists
db/             schema, migrations, repositories, seed data
store/          three zustand stores
hooks/          theme, queries, item actions, bootstrap
lib/            urls, dates, haptics, notifications, sharing, backup
constants/      design tokens, palette, categories
types/          domain models and database row types
```

### SQLite is the source of truth

Five tables — `items`, `categories`, `tags`, `item_tags`, `settings` — created
through numbered migrations in `db/migrations.ts`. The UI never touches SQL;
it goes through the repositories in `db/repositories/`, which are plain
functions over a database handle. That boundary is what would let a sync layer
be added later without rewriting screens.

Two decisions worth explaining:

**Search.** Every write refreshes a denormalised lowercase `searchText` column
holding the title, description, notes, tags, category and domain. Searching is
then one indexed multi-term `LIKE` instead of FTS or a fan of joins — simpler,
and fast enough that results feel instant while typing.

**Tags.** They come back with each row via `GROUP_CONCAT` inside the shared
`SELECT_ITEM`, so listing a thousand items is one query rather than a thousand
and one.

Saved, Category, Favourites and Archive all compose the same
`{scope, search, categoryId, favoritesOnly, sort}` query object. Filtering and
sorting happen in SQL, never in JavaScript, so behaviour is identical whether
you have ten items or ten thousand.

### State

Three Zustand stores, not one:

- `useItemsStore` — normalised items, optimistic updates, a `revision` counter
  that queries subscribe to
- `useCategoriesStore` — categories and their counts
- `useSettingsStore` — preferences, persisted in the `settings` table

Settings live in SQLite rather than AsyncStorage, so there is exactly one
storage mechanism to reason about and one thing to back up.

### Design

Hand-rolled tokens in `constants/`, no utility-class framework. Linen and
espresso surfaces, a clay accent, seven category tones, motion in the
150–300ms band. Dark mode is a separate designed palette, not an inversion.

List rows and grid tiles have **fixed** geometry rather than minimum heights,
so a title that wraps to two lines never makes one card taller than its
neighbour and lists never jitter while scrolling.

Tuck the hedgehog shows up in five poses — idle, empty, celebrate, searching,
tucking — tied to real states, and stays out of the way otherwise.

---

## Things that were deliberate

**Swipes are hard to trigger by accident.** A row must travel 96pt, the action
fires on release rather than on crossing the line, and both directions are
reversible: left archives, right favourites. Permanent deletion is never
attached to a swipe. Archive and delete both offer Undo, and Undo restores the
original id and timestamps rather than creating a lookalike.

**Saved links are never fetched.** Tuck stores the URL you paste and derives
the domain from the string. It does not request the page, so no server learns
what you saved and a slow network can never delay a save. A link with no title
gets one derived locally from the URL.

**Reminders are honest.** They are local notifications with no push service.
If the OS refuses to schedule one, the row still persists with a null
notification id rather than pretending. Turning the switch off in Settings
actually cancels everything already scheduled.

**Import cannot lose data.** It is additive, asks whether to keep yours or the
file's when ids collide, tolerates a bare array of items, ISO-string dates and
unknown categories, and rejects records with no id or title instead of
inventing values. `npm run test:import` runs fifteen hostile payloads through
the real parser and asserts nothing throws and nothing disappears.

**Contrast is checked mechanically.** Category tiles, chips and badges set
type in a hue on a tint of that same hue, which is the pairing that quietly
fails an audit while looking fine. So each tone carries two foregrounds: `fg`
for icons and strokes, which WCAG scores as graphical objects at 3:1, and
`ink` for anything that is actually text. `npm run test:contrast` walks every
tone and text colour in both themes and fails the build under 4.5:1. It caught
six of seven light tones the first time it ran, along with white-on-terracotta
buttons at 3.67:1 — the brand clay is now the darkest terracotta that carries
white text at AA.

**Share to Tuck.** The deep link `tuck://add?url=…&title=…` works today with
no native code. Android additionally declares a real `ACTION_SEND text/plain`
intent filter. Reading the shared text out of that intent needs a native
module, and iOS needs a Share Extension — so `lib/sharing/nativeShareIntent.ts`
binds to `expo-share-intent` when it is installed in a development build and
no-ops when it isn't. Nothing in the UI claims to do more than it does.

---

## Not included, on purpose

No accounts, no backend, no web dashboard, no analytics, no crash reporting,
no advertising identifiers, no telemetry of any kind. The app makes no network
requests at all.
