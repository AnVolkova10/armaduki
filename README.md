# armaduki

Team generator for 5v5 matches with social constraints, role balancing, and Google Sheets sync.

## What it does

- Manage players in `People` (name, nickname, role, rating, attributes, wants, avoids, avatar).
- Select exactly 10 players in `Match`.
- Generate 2 balanced teams using tactical + social rules.
- Show analysis with balance metrics and social satisfaction.
- Copy team output in one click.

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
- Wants constraint:
  - wants are strict: unilateral + mutual wants must stay together
  - there is no relaxed wants stage; `RELAXED_*` values stay in `GenerationStage` only for `MatchHistory` compatibility
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
  - social satisfaction is analysis-only (met wants + met dislikes), no social points
- Owner bias:
  - player ID from `VITE_OWNER_ID` is forced into the lower/equal `Power` team
  - default owner ID is `10` if env var is missing/empty
- Fallback (only when no split meets every rule):
  - picks the split that breaks the fewest rules, in this priority: `avoids` > `wants` > owner bias > ATT/DEF spread > GK/DEF limits (including emergency GK); ties go to the best balance score
  - if a split keeps avoids + wants + owner bias + ATT/DEF spread, it is used (the old "social-hard" tier), now also preferring fewer GK/DEF limit breaks
  - avoids are only broken when no avoid-safe split exists at all (the old snake split could break them needlessly)
  - the analysis adds a `[Fallback]` section: why no strict split exists (3+ GK, 5+ DEF, missing emergency keepers, a wants chain longer than 5, a want/avoid contradiction) and which rules were relaxed, naming the players

## Stack

- React 19 + TypeScript + Vite
- Zustand for app state
- React Router for `People` and `Match`
- Google Apps Script endpoint for read/write to Sheets

## Project structure

```text
src/
  components/   # UI pieces (cards, form, result, buttons, modal)
  pages/        # PeoplePage, MatchPage
  services/     # team generation logic
  store/        # Zustand store + Sheets integration
  types/        # shared TypeScript types
  utils/        # search + rating suggestion helpers
tests/          # team generator tests (npm test)
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
- `npm test` - run the team generator tests (`tests/`, Node's built-in test runner; needs Node 22.18+ for TypeScript)

## Data contract (Sheets/App Script)

Expected fields from `action=read` response:

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

Sync behavior:

- Writes are sent as `text/plain` POSTs (no CORS preflight) and the Apps Script answer is checked: `Added`, `Updated` and `Deleted` are success; `ID not found` on delete counts as already deleted. Any other answer, HTTP error, network error or 60s timeout is shown as a sync error with `Retry`.
- Writes run one at a time, in order. A retry rebuilds its payload from the current local data, so it never resends stale values.
- `update` only sends the fields that changed in the app; the Apps Script keeps every other cell, so manual Sheet edits are not overwritten.
- Clearing links only updates players that had links, 4 requests at a time.
- Deleting a player also removes their id from every other player's `wantsWith` / `avoidsWith`.
- New player ids are the highest numeric id found in ids and links + 1, so a new player never inherits links meant for a deleted one.
- Rows with a duplicate `id` (only the first is shown) or without `id` show a warning after loading.
- Closing the tab while a write is pending or failed asks for confirmation.

## UX notes

- UI is intentionally minimal and dark.
- Mobile-first behavior is required for all new changes.

## Roadmap

Current work is tracked in `TODO.md` (v2), in sprints by goal, and implemented in small, isolated iterations. The finished v1 plan (Phase 2) is archived in `docs/TODO - v1.md`.
