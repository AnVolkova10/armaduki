# Apps Script

Versioned source for the Google Apps Script web app used by Armaduki.

Before deploying:

- Keep the real spreadsheet ID from the current Apps Script in `SPREADSHEET_ID`.
- Deploy a new web app version after changing the remote Apps Script code.
- Run `?action=migrateSchema` after deploy to rename legacy `db` to `Players`, create missing sheets, and append missing columns.
- Run `?action=read` after deploy to confirm the app still returns player rows.

Deploy steps:

1. Open the existing Google Apps Script project for Armaduki.
2. Copy the local `apps-script/Code.gs` contents into the remote `Code.gs`.
3. Keep the real `SPREADSHEET_ID` value from the remote script; do not paste the repo placeholder.
4. Click `Deploy` > `Manage deployments`.
5. Edit the existing web app deployment.
6. Choose `Version` > `New version`, then deploy.
7. Keep using the same `/exec` web app URL. If the URL did not change, `.env` and Vercel env vars do not need updates.
8. Open `WEB_APP_URL?action=migrateSchema` and confirm it returns `ok: true`.
9. Open `WEB_APP_URL?action=read` and confirm it returns player rows.
10. If a brand new web app URL was created by mistake, update `VITE_APPS_SCRIPT_URL` locally and in Vercel before using production.

Current migration status:

- `Players` is the canonical players sheet name.
- Legacy `db` is only used as a migration source.
- If neither `Players` nor `db` exists, the script creates `Players` with the current player headers.
- `ensureSchema()` creates missing `Teams`, `Groups`, `RelationshipHistory`, and `MatchHistory` sheets.
- `ensureSchema()` appends missing columns to the end of existing header rows and does not reorder or delete existing data.
- `action=migrateSchema` runs `ensureSchema()` explicitly from the deployed web app URL.
- `action=migratePlayersSheet` remains available as a focused legacy rename action.
- `update` preserves existing cell values for columns missing from the incoming payload.
- `delete` and `update` resolve the `id` column by header name instead of assuming it is the first column.

Sheet schemas:

### Players

Required for a usable player row:

- `id`: stable player id.
- `nickname`: visible player label.
- `role`: `GK`, `FLEX`, `DEF`, `MID`, or `ATT`; frontend default is `FLEX`.
- `rating`: number from `1` to `10`; frontend default is `5`.

Optional current fields:

- `name`: full name.
- `avatar`: URL or data URL.
- `gkWillingness`: `good`, `low`, or `no`; legacy `yes` is read as `good`.
- `wantsWith`: pipe-separated player ids, for example `10|14`.
- `avoidsWith`: pipe-separated player ids.
- `attributes`: JSON string with `shooting`, `control`, `passing`, `defense`, `pace`, `vision`, `grit`, and `stamina`; each value is `high`, `mid`, or `low`.

Optional Phase 2 fields:

- `shirtNumber`: free text shirt number.
- `primaryTeam`: one `Teams.teamId` for the current main team.
- `teams`: pipe-separated `Teams.teamId` values, for example `armaduki|femix`.
- `groups`: pipe-separated `Groups.groupId` values, for example `segurola|palermo`.
- `availability`: pipe-separated free labels for day/time/place availability, for example `martes|jueves-noche`.
- `birthYear`: four-digit year as text.
- `secondaryRole`: optional second role, same enum as `role`.
- `active`: empty means active; `false`, `no`, `0`, `inactive`, and `off` are read as inactive by the frontend parser.
- `notes`: internal free text.

Phase 2 safety note: the frontend reads these new fields but only writes them back once the matching modal controls exist. `shirtNumber` is written when edited from the modal; the other Phase 2 fields are still read-only from the frontend. This prevents manual Sheet edits from being overwritten by stale in-memory values.

### Teams

- `teamId`: required stable id used by `Players.primaryTeam` and `Players.teams`.
- `name`: required visible team name.
- `color1`: optional primary color hex.
- `color2`: optional secondary color hex; UI can fall back to `color1`.
- `crest`: optional crest URL, data URL, emoji, or short visual identifier.

### Groups

- `groupId`: required stable id used by `Players.groups`.
- `name`: required visible group name.
- `place`: optional usual place/court.
- `notes`: optional internal notes.

### RelationshipHistory

- `sourceId`: required source `Players.id`.
- `targetId`: required target `Players.id`.
- `wantsCount`: historical count, default `0`.
- `avoidsCount`: historical count, default `0`.
- `updatedAt`: timestamp of the last counter increment.

### MatchHistory

- `matchId`: required unique match history id.
- `createdAt`: required timestamp.
- `selectedIds`: pipe-separated selected `Players.id` values.
- `team1Ids`: pipe-separated Team 1 ids.
- `team2Ids`: pipe-separated Team 2 ids.
- `score`: generated analysis score.
- `stage`: `STRICT`, `RELAXED_UNILATERAL`, `RELAXED_MUTUAL`, or `FALLBACK`.
- `socialSatisfactionPct`: number from `0` to `100`.
- `isTest`: `true` for test generations, `false` for real/final matches.
