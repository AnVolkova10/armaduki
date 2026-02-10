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
- Hard constraints per team:
  - max `1` GK
  - max `2` DEF
  - max `2` ATT
  - if no GK in a team, it needs at least `3` players with `gkWillingness: yes`
- Social hard constraint:
  - players that avoid each other cannot be in the same team
- Social scoring:
  - mutual wants and one-way wants add score
  - social satisfaction includes met wants and met dislikes
- Owner bias:
  - player ID from `VITE_OWNER_ID` is forced into the weaker/equal team
  - default owner ID is `10` if env var is missing/empty
- If strict constraints fail, a fallback split is generated.

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
- `gkWillingness` (`yes | low | no`)
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
