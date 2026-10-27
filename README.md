# Peques — v0.1

*Good things to do with the little ones in Berlin, today.*

What can we do with the kids today? Open the app, tap **Find something**, get one good
suggestion plus two backups — chosen for the kids who are with you, the weather,
and how far you want to travel.

v0.1 is deliberately small: **no database, no login, no API keys.** The places
live in `data/places.json`, the weather comes from a free service, and the whole
thing builds into a folder of plain files you upload to your IONOS webspace —
the same way Iris is deployed.

---

## 1. Get it running on your Mac (5 minutes)

```bash
cd ~/Documents/peques
npm install
npm run dev
```

Open http://localhost:3000 — allow location when the browser asks (or it falls
back to central Berlin).

## 2. Fix the coordinates (one time, 2 minutes)

The starter places have **approximate** coordinates. This looks each one up in
OpenStreetMap and writes the real ones into `data/places.json`:

```bash
npm run fix-coordinates
```

Read the output. If a place "moved a long way", correct it by hand: on
openstreetmap.org, right-click the spot → *Show address* gives you lat/lon.

## 3. Add kid-friendly places to eat (optional, 1 minute)

```bash
npm run import-food
```

This fills `data/food.json` from OpenStreetMap — only cafés and restaurants that
somebody tagged with a changing table, a high chair or a kids' area. Those then
show up under "Then what?" on an open result. Re-run it every few months.

## 4. Make it yours (the important part)

Open `data/places.json` and edit it like a list, not like code:

- delete anything you'd never go to;
- add your own favourites (copy an existing block, change the fields);
- fix the `fit` numbers — `b` = 0–1, `t` = 2–3, `p` = 4–6, `s` = 7–10, where
  `1` = not suitable and `5` = great;
- `setting` is `indoor`, `outdoor` or `mixed`; for `mixed`, `covered` is roughly
  how much of the visit is under a roof (0–1).

Tuning the suggestions lives in `lib/rules.js`: rain and temperature limits,
and how much age fit, travel time and weather count. Plain numbers, no AI.

## 5. Publish it on your IONOS subdomain

Exactly how Iris is published: build locally, upload a folder.

```bash
npm install     # only needed when dependencies changed
npm run build   # writes the folder out/
```

In IONOS, once:

1. **Domains & SSL → cristavillatoro.com → Subdomains → Add**: `peques`.
2. Point it at its **own folder** in the webspace, e.g. `/peques`, not at the
   folder the main site uses.
3. Turn on the free SSL certificate for the subdomain.

Then every time you publish:

4. Upload **the contents of `out/`** — not the folder itself — into that
   webspace folder, with your FTP client or the IONOS file manager.
   `.htaccess` is included: it gzips the places file (0.9 MB becomes roughly
   200 KB over the wire) and sets sensible caching.

Check `https://peques.cristavillatoro.com` on your phone, then
*Share → Add to Home Screen* for an app icon.

**When you change something**, run `npm run build` again and upload `out/`
again. Only the files that changed need re-uploading, but uploading all of it
is simpler and harmless.

**Hidden files**: some FTP clients don't show `.htaccess`. If yours doesn't,
enable "show hidden files", or the compression won't be there — the app still
works, just slower on the first visit.

## 6. Share it with friends

Just send the link. There are no accounts, and nothing personal is stored on a
server: the children's birth months stay in each person's own browser
(`localStorage`). Each family can add their own kids on their own phone.

Before you share it publicly, link your **Impressum** and **privacy policy**
from the footer — a public page on a German domain normally needs both.

---

## What's in here

| Path | What it is |
|---|---|
| `data/places.json` | The whole "database" of v0.1. Edit freely. |
| `data/food.json` | Kid-friendly places to eat, imported from OpenStreetMap. |
| `lib/rules.js` | Weather rules, age-fit scoring, travel estimates. All plain code. |
| `lib/weather.js` | Fetches the forecast in the browser (Open-Meteo, DWD model). |
| `components/PequesApp.jsx` | The whole interface. |
| `components/Art.jsx` | The little illustrations, drawn in code — no image files. |
| `scripts/fix-coordinates.mjs` | One-time coordinate fix via OpenStreetMap. |
| `scripts/import-food.mjs` | Imports kid-friendly cafés from OpenStreetMap. |

## Honest limits of v0.1

- **Opening hours are typical values, not live.** Every card links to the
  venue's own page, and says "typical".
- **Travel time is an estimate** from straight-line distance, not a real BVG
  journey. Real transit times come in a later phase.
- **No events yet** — only places that are there every day. Events need the
  collection and verification pipeline (phase 2 of the plan).
- **Facilities marked "unknown" mean nobody has recorded it**, not "no".

## Credits

Weather: [Open-Meteo](https://open-meteo.com/) using the DWD ICON model.
Places and facilities you import: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL.
Keep both credits visible in the app footer.

## 7. Saving places (optional, needs Supabase)

Without any setup, hearts and visits are kept in the visitor's own browser.
To make them follow a person between phone and laptop:

1. Create a new Supabase project (region: **Frankfurt**) at supabase.com.
2. SQL editor → paste `supabase/migrations/0001_saved_places.sql` → Run.
3. Authentication → Providers → turn on **Anonymous sign-ins**.
4. Settings → API → copy the Project URL and the `anon` key.
5. `cp .env.local.example .env.local` and paste both values, then restart `npm run dev`.

For the published site, the same two values have to exist when you run
`npm run build` — they are baked into the static files.

**What is stored:** the places someone saved, and after an outing a rating
(loved / ok / not for us) with the place's name and coordinates. Nothing else.
No child names, no photos, no location history. Row Level Security means each
account can only ever read its own rows, and deleting the account deletes them.

**Before you share the link publicly**, add your Impressum and privacy policy —
with accounts you are processing personal data (an email address), even if it is
only your friends.
