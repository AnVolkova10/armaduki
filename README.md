# armaduki

Team generator for 5v5 matches with social constraints, role balancing, and Google Sheets sync.

## What it does

- Manage players in `People` (name, nickname, role, rating, attributes, wants, avoids, avatar).
- Select exactly 10 players in `Match`.
- Generate 2 balanced teams using tactical + social rules.
- Show analysis with balance metrics and social satisfaction.
- Copy team output in one click.

## Core generation rules

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
  - relaxed wants modes exist in code/types, but `generateTeams` currently only runs strict mode
- ATT handling:
  - there is no hard max `2 ATT` per team
  - `4 ATT` selected must split `2/2`; `5 ATT` selected may split `2/3`
  - ATT distribution still has a soft scoring preference after the hard spread rule passes
- 3 GK handling:
  - selection is not blocked
  - strict mode cannot satisfy max `1` GK per team with 3 GK selected, so fallback is expected
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
- Fallbacks:
  - first fallback keeps social rules hard (`avoids` + strict `wants`) plus owner bias and ATT/DEF spread, then relaxes other non-social constraints
  - final fallback uses a snake split by power and may ignore constraints if no social-hard split exists

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

## UX notes

- UI is intentionally minimal and dark.
- Mobile-first behavior is required for all new changes.

## Roadmap

Current work is tracked in `TODO.md` and implemented in small, isolated iterations.
