# Sourced marketplace data — published website

Updated 22 October 2026. Website: https://shaghalny.quantara-eg.com.

## Status (cut over 22 October 2026, 08:18 UTC)

| Item | State |
| --- | --- |
| Backend | Coolify app `c131ifc431ps8bw4r46iqi7d`, image `ghcr.io/mo7amed7osam/shaghalny/backend:sourced-20261022` (digest `sha256:935c4d08b1dad30a4fe5073f71200b7a824471ef6ee4227a197ad6070f7d2694`), production env `MONGO_DB_NAME=Shaghalny-Live-20261022`, `DEMO_MODE=false`, `PAYMENTS_ENABLED` unset. `MONGO_URI` untouched. |
| Frontend | Vercel `uni-freelance` production `dpl_GpTShyBECiP7CEwXjZ36RXM4L2Ge`; production `VITE_DEMO_MODE` removed. |
| Listings refreshed | Snapshot 2026-10-22T08:05Z imported before cutover (468 listings; 95 new, 373 updated). |
| Published check | `output/job-import/published-verification-20261022.json`: 548 open listings, 0 demo, 0 native, 0 employer accounts, 0 budgets; bundle has no demo banner; `/api/demo-assets/` 404. |

## Replacement database contents

`Shaghalny-Live-20261022` on the existing Atlas cluster, prepared from the demo database by `npm run db:prepare-live -- Shaghalny-Live-20261022 Shaghalny-Demo-20261021`:

- 1 administrator: the original, non-demo administrator account (`_id 6a4a978291d6e53f26c3914a`), password hash unchanged. The synthetic `admin@shaghalny.test` account was not copied.
- 30 skills (configuration). The `Translation` skill moved to a new `Translation` category.
- 454 external listings. No users, native projects, proposals, contracts, submissions, reviews, interview results, events, notifications, balances, top-ups, withdrawals or transactions.
- `datasetmetadata` records the preparation policy.

### Imported listings (snapshot fetched 2026-10-21T21:37Z)

| Category | Freelance / contract | Internship / student | Total |
| --- | ---: | ---: | ---: |
| Programming | 47 | 42 | 89 |
| Design | 37 | 11 | 48 |
| Business | 27 | 112 | 139 |
| Engineering | 2 | 21 | 23 |
| Media | 59 | 42 | 101 |
| Translation | 25 | 7 | 32 |
| Other | 8 | 14 | 22 |
| **Total** | **205** | **249** | **454** |

| Source | Fetched | Eligible | Imported | Terms honoured |
| --- | ---: | ---: | ---: | --- |
| [Himalayas](https://himalayas.app/api) | 432 | 431 | 366 | Apply button uses `applicationLink` unchanged; visible link to the Himalayas listing; expired jobs hidden by `sourceExpiresAt`; jobs shown only on Shaghalny, no JobPosting structured data |
| [Arbeitnow](https://www.arbeitnow.com/blog/job-board-api) | 1,495 | 76 | 74 | Link back to listing |
| [Jobicy](https://jobicy.com/jobs-rss-feed) | 200 | 12 | 12 | Jobicy credited with canonical URL; apply goes to it; one pull, under the hourly limit |
| [Remote OK](https://remoteok.com/api) | 99 | 2 | 2 | Followed link (no `nofollow`) and "Remote OK" named; logo not used |

Excluded: Remotive (terms forbid showing its jobs behind a sign-up wall; Shaghalny's job board requires login), The Muse (API returned HTTP 403 to automated clients), Upwork/Freelancer/ProZ (require OAuth or partner access). No authentication or bot protection was bypassed.

Rules applied (`backend/src/utils/externalJobs.js`):

- Only listings the source labels freelance/contractor/contract or internship/working student/Praktikum, or whose title says so. Full-time and fixed-term employment are not relabelled.
- Title, description (plain text, ≤1,800 chars), employer, location, publication date, employment-type label, original URL and observed date come from the source. Compensation is stored only when the source publishes it (70 listings), verbatim in the source currency and period; it never fills `budgetMin`/`budgetMax`.
- Category is Shaghalny's filing based on title, then the source's own category labels.
- At most 5 listings per employer per source. Deduplicated by source ID, URL, and normalised employer + title (7 removed). Listings titled `TEST …` dropped.
- Links: Arbeitnow, Jobicy and Remote OK URLs checked by HTTP GET, one request per host at a time, all 200. Himalayas pages answer automated clients with HTTP 403, so liveness comes from the Himalayas API, which lists only active, unexpired jobs. Two Himalayas listings were opened in a normal browser and loaded correctly. Check results are stored per listing (`sourceLinkCheckedAt`, `sourceLinkStatus`) and in the snapshot.
- External listings have no Shaghalny employer account and cannot receive proposals or contracts. The card states the employer does not post on Shaghalny, and **Apply on source** opens the original application.

Evidence: raw snapshot `~/.codex/backups/shaghalny/job-snapshots/sources-20261022.json` (raw records, link checks, stats; kept outside this public repository because Himalayas terms forbid passing its jobs on through feeds, and `.gitignore` excludes `output/job-import/sources-*.json`) and `output/job-import/replacement-validation.json`.

## Participants and photos

No authorised participant data was available, so none was imported. The replacement has **zero student or client profiles, zero photos, zero reviews**. To add participants, real people must register or give written consent for their profile and photo. Scraped, stock or AI-generated faces are not used.

Photo rendering now uses one `UserAvatar` component (uploaded photo, initials only when none is present or the image fails) in navigation, public profiles, proposals (client dashboard and proposal review), client and student contract lists, admin users and admin payments. The backend now includes `profilePhotoUrl` (and `companyLogoUrl` for clients) wherever proposals, contracts, payment requests, selected students and interview sessions are populated.

## Payments

No payment provider is configured. With `DEMO_MODE=false` and `PAYMENTS_ENABLED` unset:

- Top-ups, withdrawals, admin approvals of either, creating/updating paid projects and accepting paid proposals (escrow) return HTTP 503 `PAYMENTS_DISABLED`.
- Wallets show "Payments not available yet". The previously hard-coded fallback InstaPay number was removed from the client wallet.
- Unpaid internships work natively end to end.
- No simulated balance, receipt or transaction was copied into the replacement.

Set `PAYMENTS_ENABLED=true` only once a provider and authorised transaction flow exist.

## Validation (local server, throwaway clone, then dropped)

16/16 checks passed (`output/job-import/replacement-validation.json`): connection through `MONGO_DB_NAME`; listings external-only, none demo, all with provenance, none with invented budgets; Translation taxonomy; register/login; new accounts not demo; wallet reports payments off with no receiver; demo top-up 404; top-up, withdrawal and paid project 503; unpaid internship 201; external listing rejects proposals; clone dropped. Backend: 31 tests across 4 suites pass. Frontend: `tsc --noEmit` and production build pass.

## Backup

Active demo database: `~/.codex/backups/shaghalny/2026-10-21T21-27-52-853Z-Shaghalny-Demo-20261021/`

- `Shaghalny-Demo-20261021.archive.gz` (mongodump archive, gzip, documents and index definitions, 63,839 bytes)
- `manifest.json` with SHA-256
- `restore-verification.json`: restored into a temporary database; all 15 collections / 774 documents matched by count, BSON content hash and index definitions; temporary database dropped.

Earlier backup of `Grad-Project`: `~/.codex/backups/shaghalny/2026-10-21T20-13-59-008Z/`. No database was dropped or cleared; `Grad-Project`, `Shaghalny-Demo-20261021` and `Shaghalny-Live-20261021` are unchanged.

## Cutover (switch backend and frontend together)

`MONGO_URI` in Coolify is not read or edited. The database is chosen by the new non-secret variable `MONGO_DB_NAME`, which overrides the URI path.

1. Refresh listings (importer accepts snapshots under 24 h old) from `backend/`:
   ```sh
   npm run jobs:fetch -- ~/.codex/backups/shaghalny/job-snapshots/sources-YYYYMMDD-HHMM.json
   npm run jobs:import -- Shaghalny-Live-20261022 ~/.codex/backups/shaghalny/job-snapshots/sources-YYYYMMDD-HHMM.json
   ```
2. Push the backend image:
   ```sh
   docker buildx build --platform linux/amd64 -t ghcr.io/mo7amed7osam/shaghalny/backend:sourced-20261022 --push ./backend
   ```
3. Coolify app `c131ifc431ps8bw4r46iqi7d`: image tag `sourced-20261022`; add `MONGO_DB_NAME=Shaghalny-Live-20261022`; set `DEMO_MODE=false`; leave `PAYMENTS_ENABLED` unset; redeploy. Startup refuses a demo database without demo mode.
4. Vercel `uni-freelance`: remove production `VITE_DEMO_MODE` (`vercel env rm VITE_DEMO_MODE production`), then `vercel deploy --prod` from the repo root. The demo banner disappears because the synthetic data is gone.
5. Verify: `curl -s https://shaghalny.quantara-eg.com/api/jobs` returns listings with `sourceType: "external"` and no `isDemo: true`; the site shows no demo banner; the client wallet says payments are not available.

## Rollback

1. Coolify: image tag `nexus-demo-20261021` (digest `sha256:8d0b1164799efad45e30fafcde9a7bf7617e50559c70e854bb02d60de50bff3b`), delete `MONGO_DB_NAME`, set `DEMO_MODE=true`, redeploy. The unchanged `MONGO_URI` points at `/Shaghalny-Demo-20261021`.
2. Vercel: `vercel promote dpl_8D9VztmXAHJEvsXSQCzW1RyQWyGe` (current demo production), or `vercel rollback`. Re-add `VITE_DEMO_MODE=true` for later demo builds.
3. If the demo database is damaged, restore it from the verified archive into a new name, then point `MONGO_DB_NAME` at it:
   ```sh
   mongorestore --uri="<cluster URI without database>" --archive=Shaghalny-Demo-20261021.archive.gz --gzip \
     --nsFrom='Shaghalny-Demo-20261021.*' --nsTo='Shaghalny-Demo-YYYYMMDD.*'
   ```
   Restore to a name matching `Shaghalny-Demo-YYYYMMDD` when running with `DEMO_MODE=true`.

Writes made after cutover stay in `Shaghalny-Live-20261022` and are not copied back. Earlier fallbacks remain: `Grad-Project` with image `latest` and Vercel `dpl_2GrgUzWWRUxPSpd2WV9FMub3MioV`.

## Refresh

No recurring job is configured. Run step 1 of the cutover a few times per week at most. Arbeitnow, Jobicy and Remote OK listings disappear 14 days after they were last observed; Himalayas listings disappear at their published expiry.

## Presentation database (prepared 22 October 2026, not yet live)

`Shaghalny-Demo-20261022` is for the graduation presentation. It was restored from the verified `Shaghalny-Demo-20261021` archive (774 documents: 30 demo students, 8 fictional companies, demo admin, 62 demo projects, proposals, contracts, submissions, reviews, interview examples, simulated wallet history), then refreshed with the 468 real listings from snapshot `sources-20261022-0805` (39 matched, 429 new). Translation skill moved to the Translation category. Every synthetic record keeps `isDemo: true`.

Student avatars are DiceBear "Notionists" illustrations (CC0 1.0, see `backend/assets/demo/CREDITS.md`), not photographs. No real person's photo is used. Team members can upload their own photos from the profile page.

Backend image `ghcr.io/mo7amed7osam/shaghalny/backend:demo-20261022` (digest `sha256:e68a729fa34e99b591432a704dde057ec9a3ef6b75c518d294c0c3a85d5698e3`) contains the new avatars. The banner now reads "Graduation project demo …".

To switch the site to it:

1. Coolify app `c131ifc431ps8bw4r46iqi7d`: image tag `demo-20261022`; production `MONGO_DB_NAME=Shaghalny-Demo-20261022`; production `DEMO_MODE=true`; Redeploy.
2. Vercel: `vercel env add VITE_DEMO_MODE production` (value `true`), then `vercel deploy --prod --yes`.
3. Logins: `student@shaghalny.test`, `client@shaghalny.test`, `admin@shaghalny.test`, password in `~/.codex/backups/shaghalny/Shaghalny-Demo-20261021/demo-credentials.json`.

Switch back to the sourced-only site: image `sourced-20261022`, `MONGO_DB_NAME=Shaghalny-Live-20261022`, `DEMO_MODE=false`, remove `VITE_DEMO_MODE`, redeploy both.
