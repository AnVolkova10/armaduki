# armaduki

Team generator for 5v5 matches with social constraints, role balancing, and Google Sheets sync.

## What it does

- One screen for everything: manage players (name, nickname, role, rating, attributes, wants, avoids, avatar) with the edit and delete icons on each card, and tap cards to pick exactly 10 for a match.
- Generate 2 balanced teams using tactical + social rules.
- Access key: when the backend has one, a device without it sees a penalty instead of the app. Typing the key takes the shot: the right key scores and the app opens, a wrong key is saved by the keeper, and no answer hits the post.
- Show analysis with balance metrics and social satisfaction.
- Copy team output in one click.
- Matches as they were played (Sprint 9): a second screen, «Matches», lists them with the day, the group, the place and the result. A match is logged from the generated teams («Log Match») or built by hand (someone else made the teams, or they changed): the day, the group and its place, the result and, per player, goals, goals let in (only when a side rotates in goal; a fixed keeper gets the other side's goals) and errors (hidden with privacy mode). Any two teams of 5 get the same analysis as a generated result, with the rules they break.

## Core generation rules

A plain-language walkthrough in Spanish, including how the fallback worked before the November 2026 review and ideas to improve it: `docs/GENERADOR.md`.

- Input must be exactly 10 players.
- Teams are 5 vs 5.
- Strict-stage hard constraints per team:
  - max `1` GK
  - max `2` DEF
  - if there are exactly 2 selected DEF, they must be split 1/1
  - ATT must be spread evenly enough: `abs(T1 ATT - T2 ATT) <= 1`
  - if a team has no GK role, it needs at least `2` capable emergency keepers
  - capable emergency keepers are `gkWillingness: good` or `gkWillingness: low`
  - if a team has a GK role, emergency keeper count does not matter for that team
- Social hard constraint:
  - players that avoid each other cannot be in the same team
- Wants:
  - mutual wants (both players want each other) are a hard rule: they must stay together
  - one-way wants are a preference: each one left across teams costs `ONE_WAY_WANT_PENALTY` score points (15, the same as 1.5 rating points of imbalance), and the analysis lists the ones kept and broken
  - `RELAXED_*` values stay in `GenerationStage` only for `MatchHistory` compatibility
- ATT handling:
  - there is no hard max `2 ATT` per team
  - `4 ATT` selected must split `2/2`; `5 ATT` selected may split `2/3`
  - ATT distribution still has a soft scoring preference after the hard spread rule passes
- 3 GK handling:
  - selection is not blocked
  - strict mode cannot satisfy max `1` GK per team with 3 GK selected, so fallback is expected
  - the fallback splits them `2/1` (fewest GK limit breaks), unless a higher-priority rule forces otherwise
- Scoring model:
  - numeric score uses rating + attribute balance
  - team `Power` is rating total + weighted attributes, and is used for owner bias
  - score also includes soft GK emergency and ATT spread adjustments
  - for teams without a GK role, each `good` emergency keeper adds a small bonus
  - `low` counts as a capable emergency keeper but does not add bonus or penalty
  - fallback splits get a penalty when a team without GK role has fewer than `2` capable emergency keepers
  - broken one-way wants subtract `ONE_WAY_WANT_PENALTY` each; the "balanced" label in the analysis ignores that penalty
  - ties: higher social satisfaction (met wants + met dislikes) first, then smaller rating gap, then a fixed order by ids
- Owner bias:
  - player ID from `VITE_OWNER_ID` is forced into the lower/equal `Power` team
  - default owner ID is `10` if env var is missing/empty
- Fallback (only when no split meets every rule):
  - picks the split that breaks the fewest rules, in this priority: `avoids` > mutual `wants` > owner bias > ATT/DEF spread > GK/DEF limits (including emergency GK); ties go to the best score
  - if a split keeps avoids + mutual wants + owner bias + ATT/DEF spread, it is used (the old "social-hard" tier), now also preferring fewer GK/DEF limit breaks
  - avoids are only broken when no avoid-safe split exists at all (the old snake split could break them needlessly)
  - the analysis adds a `[Fallback]` section: why no strict split exists (3+ GK, 5+ DEF, missing emergency keepers, a mutual wants chain longer than 5, a mutual want against an avoid) and which rules were relaxed, naming the players

## Stack

- React 19 + TypeScript + Vite
- Zustand for app state
- React Router: the players at `/` and the matches at `/matches`; a match opens at `/matches/<id>` (or `/matches/new`) over the screen it came from, so back closes it. `/match` and any other path redirect to `/`
- Google Apps Script endpoint for read/write to Sheets

## Project structure

```text
src/
  components/   # UI pieces (cards, form, result, match editor, buttons, modal, list controls)
  hooks/        # usePlayerListing (search, filters and sort), useRosterLoad (the first read)
  pages/        # PlayersPage (players + match setup + result) and MatchesPage (the matches)
  services/     # team generation logic, and the analysis of a split built by hand
  store/        # Zustand store + Sheets integration
  types/        # shared TypeScript types
  utils/        # search, list filtering/sorting, selection, rating suggestion, matches, player fields
tests/          # npm test (see Scripts)
scripts/        # backend-release.ts (npm run backend:release)
apps-script/    # versioned Google Apps Script backend
```

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` in project root:

```env
VITE_APPS_SCRIPT_URL=your_google_apps_script_web_app_url
VITE_OWNER_ID=10
```

3. Start dev server:

```bash
npm run dev
```

## Scripts

- `npm run dev` - run Vite dev server
- `npm run build` - type-check + production build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint
- `npm test` - run every test in `tests/` with Node's built-in test runner (needs Node 22.18+ for TypeScript): the team generator, the player list filters and sorts, `Code.gs` against in-memory sheets, the store end to end against `Code.gs`, and the backend release script with a fake clasp. None of them reach the real sheet.
- `npm run backend:release -- "what changed"` - publish `apps-script/` to production with checks and automatic rollback; `npm run backend:release -- --check` only shows the production version, whether production asks for the access key and whether the one in `.env.release` is accepted. Details in `apps-script/README.md`.

## Access key and the copy on the device

- The key lives in the Apps Script property `ACCESS_KEY` (see `apps-script/README.md`). It is never in the code, in `.env`, in Vercel or in this repo. Empty or missing: anyone with the URL can read and save.
- With a key set, every request must carry it: `&key=` on reads and `"key"` in the body of saves. Anything else answers `unauthorized` before the spreadsheet is opened.
- A device keeps the key (in `localStorage`) only after the backend accepted it, and keeps a copy of the last read so the app opens at once. With that copy on screen picking players works right away; adding, editing, deleting and clearing links wait until the sheet has answered.
- If the backend refuses the key (it changed, or was never typed), the device forgets the key and the copy, and the gate comes back.
- Privacy mode hides ratings: the numbers on the cards, the score filter and sort, each team's Power and rating total, and the rating difference in the result header. It also hides the notes, the age and, from Sprint 8, who avoids whom: the form shows no Avoids list (saving keeps the avoids) and the result names no avoid and counts none. The teams come out the same. From Sprint 9 it also hides each player's errors in a match (saving keeps them) and the ratings there; a match's analysis hides what the result's does. Each device remembers whether it was left on or off (`localStorage`, like the language); a new device starts with it on.

## Data contract (Sheets/App Script)

On open the app makes one request, `action=readAll`, which answers `{ players, teams, groups, relationshipHistory }`, plus `teamsError`, `groupsError` or `relationshipHistoryError` when only that tab failed (players still load). `groups` comes from Sprint 6 on and `relationshipHistory` (how many times each player marked each other one, for the order of the form's lists) from Sprint 8 on; see `apps-script/README.md`. From Sprint 9 on it also answers `capabilities: ['matches']` (without it the app hides «Matches») and `highestPlayerId`, the highest player id ever used, deleted players included, which new ids go above. A backend without `readAll` answers `{ error: 'Action unknown' }`, and the app then uses `action=read` and `action=readTeams`, so an older backend version keeps working.

Matches are not part of `readAll`: the app asks for them with `action=readMatches` when «Matches» (or a match) opens, after the saves it has already sent. They live in two tabs, `MatchHistory` (one row per match) and `MatchPlayers` (one row per player per match, with how each one was that day, so an old match measures the same later); see `apps-script/README.md`. They are never kept on the device.

Expected player fields (`players` in `readAll`, or the `action=read` response):

- `id`
- `name`
- `nickname`
- `role` (`GK | FLEX | DEF | MID | ATT`)
- `rating` (`1..10`)
- `avatar`
- `gkWillingness` (`good | low | no`; legacy `yes` values are read as `good`)
- `wantsWith` (pipe-separated IDs: `1|3|8`)
- `avoidsWith` (pipe-separated IDs)
- `attributes` (JSON string/object)

Write actions used by the app:

- `add`
- `update`
- `delete`
- `addTeam` and `addGroup` (Sprint 6)
- `saveMatch` and `deleteMatch` (Sprint 9)

Sync behavior:

- Writes are sent as `text/plain` POSTs (no CORS preflight) and the Apps Script answer is checked: `Added`, `Updated`, `Deleted` and `Saved` are success; `ID not found` and `Match not found` on delete count as already deleted. Any other answer, HTTP error, network error or 60s timeout is shown as a sync error with `Retry`.
- Writes run one at a time, in order. A retry rebuilds its payload from the current local data, so it never resends stale values.
- `update` only sends the fields that changed in the app; the Apps Script keeps every other cell, so manual Sheet edits are not overwritten.
- Clearing links only updates players that had links, 4 requests at a time.
- Deleting a player also removes their id from every other player's `wantsWith` / `avoidsWith`.
- New player ids are the highest numeric id found in ids and links, or the backend's `highestPlayerId` (deleted players included), + 1, so a new player never inherits the links, the history or the matches of a deleted one.
- A match is saved whole (`saveMatch` replaces its row and its player rows), so a retry sends the match as it is then, and nothing once it was deleted.
- Rows with a duplicate `id` (only the first is shown) or without `id` show a warning after loading.
- Closing the tab while a write is pending or failed asks for confirmation.

## UX notes

- UI is intentionally minimal and dark.
- Mobile-first behavior is required for all new changes.

## Roadmap

Current work is tracked in `TODO.md` (v2), in sprints by goal, and implemented in small, isolated iterations. The finished v1 plan (Phase 2) is archived in `docs/TODO - v1.md`.
