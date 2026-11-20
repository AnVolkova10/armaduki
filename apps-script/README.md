# Apps Script

Versioned source for the Google Apps Script web app used by Armaduki. `Code.gs` and `appsscript.json` are pushed and deployed with [clasp](https://github.com/google/clasp), Google's Apps Script CLI, from this folder. No copy/paste in the Apps Script editor.

One-time setup (per machine):

1. Turn on "Google Apps Script API" at https://script.google.com/home/usersettings.
2. Log in with `npx @google/clasp login` (opens the browser; credentials stay in `~/.clasprc.json`, never in the repo).
3. Create `apps-script/.clasp.json` (gitignored) with the script id from Apps Script > Project Settings > IDs:

   ```json
   { "scriptId": "<script id>", "rootDir": "" }
   ```

4. Set the spreadsheet id once in Apps Script > Project Settings > Script Properties: property `SPREADSHEET_ID`, value = the id in the sheet URL (`docs.google.com/spreadsheets/d/<id>/edit`). `Code.gs` reads it from there, so the id is never committed. Without it, every request answers `Missing script property SPREADSHEET_ID`.

Access key (optional, since version 21): the script property `ACCESS_KEY`.

- Without a value, anyone with the `/exec` URL can read and save. That URL is inside the published site, so the key is what protects the sheet.
- With a value, a request that does not carry the same key answers `{ "error": "unauthorized" }` (GET) or `Error: unauthorized` (POST) before the spreadsheet is opened. The app sends it as `&key=` on reads and as `"key"` in the body of saves, and shows the gate until the key is typed on that device.
- To turn it on: Apps Script editor > Project Settings > Script Properties > Add script property, name `ACCESS_KEY`, value = the key > Save. It works at once, with no new version. To turn it off, delete the property.
- The key lives in three places: the script property, each device (typed once at the gate) and, for publishing, `.env.release` as `BACKEND_ACCESS_KEY` (ignored by git). If it changes, change it in all three. It never goes in the code, `.env`, Vercel or the docs.

`.claspignore` limits pushes to `Code.gs` and `appsscript.json`; `npx @google/clasp status` lists what would be pushed.

Publishing (from the project root): `npm run backend:release -- "short description"` does the whole release and stops at the first problem:

1. runs the `Code.gs` tests (`tests/appsScript.test.ts`);
2. `clasp push --force`: the remote files become `Code.gs` + `appsscript.json` from the repo. `--force` matters: without a terminal, clasp skips the push when the manifest changed;
3. creates a new version;
4. deploys that version to a temporary deployment and checks it: `readAll`, `read`, `readTeams` and an `update` of an id that cannot exist (it answers `ID not found for update` and writes nothing). If a check fails, production does not change;
5. moves production (the deployment in `VITE_APPS_SCRIPT_URL`) to the new version and checks it again. If that fails, production goes back to the previous version;
6. deletes the temporary deployment.

It refuses to run with uncommitted changes in `Code.gs` or `appsscript.json` (`--allow-dirty` skips that check), never prints deployment ids, and only deletes the temporary deployment it created. It runs clasp 3.4.1 through `npx` without a shell. `npm run backend:release -- --check` only shows the version production is on, whether it asks for the access key and whether the one in `.env.release` is accepted; it changes nothing. With `ACCESS_KEY` set, the checks of a release need `BACKEND_ACCESS_KEY` in `.env.release`: the script sends it and never prints it. Needs Node 22.18+, the one-time setup above and `VITE_APPS_SCRIPT_URL` in `.env`.

By hand, from `apps-script/` (the production deployment id is the part between `/s/` and `/exec` in `VITE_APPS_SCRIPT_URL`):

1. `npx @google/clasp push --force`: replaces the remote project files with `Code.gs` + `appsscript.json`. The live web app does not change yet.
2. `npx @google/clasp version "short description"`: creates an immutable version and prints its number.
3. `npx @google/clasp redeploy <deploymentId> -V <version> -d "short description"`: points the existing production deployment at that version. The `/exec` URL stays the same, so `.env` and Vercel need no changes.
4. Open `WEB_APP_URL?action=readAll` and confirm it returns `players` and `teams`.
5. Open `WEB_APP_URL?action=read` and confirm it returns player rows.
6. Open `WEB_APP_URL?action=readTeams` and confirm it returns team rows or `[]`.

Rollback: `npx @google/clasp redeploy <deploymentId> -V <previous version>`. `npx @google/clasp deployments` and `npx @google/clasp versions` list what exists. Do not use `npx @google/clasp deploy` for production: it creates a new deployment with a new URL. `action=migrateSchema` runs the schema check on demand and returns `ok: true`.

Current migration status:

- `Players` is the canonical players sheet name.
- Legacy `db` is only used as a migration source.
- If neither `Players` nor `db` exists, the script creates `Players` with the current player headers.
- `ensureSchema()` creates missing `Teams`, `Groups`, `RelationshipHistory`, and `MatchHistory` sheets.
- `ensureSchema()` appends missing columns to the end of existing header rows and does not reorder or delete existing data.
- `action=migrateSchema` runs `ensureSchema()` explicitly from the deployed web app URL.
- `action=migratePlayersSheet` remains available as a focused legacy rename action.
- `action=readTeams` returns the `Teams` catalog for the frontend with safe defaults.
- Every action checks `ACCESS_KEY` first (see above): reads, saves and migrations.
- `action=readAll` returns `{ players, teams }` in one execution; the app uses it on open. A `Teams` failure comes back as `teamsError` and does not block the players. An unknown action answers `{ error: 'Action unknown' }`, which the app uses to fall back to `read` + `readTeams` on older versions.
- `update` preserves existing cell values for columns missing from the incoming payload.
- `delete` and `update` resolve the `id` column by header name instead of assuming it is the first column.
- `id` matching trims spaces and compares as text, so `12`, `"12"` and `" 12 "` match.
- `add`, `update` and `delete` run under a `LockService` script lock, so two writes never interleave (for example a delete shifting rows while an update writes).
- `add` answers `Error: id X already exists` when the id is taken and `Error: missing id` without id, instead of appending a duplicate row.
- Normal requests run `ensureSchema()` at most once every 6 hours (`CacheService` key `SCHEMA_CACHE_KEY`), which saves a dozen Spreadsheet calls per request. `action=migrateSchema` always runs it. Change `SCHEMA_CACHE_KEY` when headers change.

Write answers (plain text, checked by the frontend):

- `Added`, `Updated`, `Deleted`: success.
- `ID not found`: delete of a row that is already gone; the frontend treats it as deleted.
- `ID not found for update`, `Action unknown`, `Error: ...`: failure; the frontend shows it with a `Retry` button.

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

Safety note: `update` payloads only contain the fields that changed in the app (base and Phase 2 fields alike), so manual Sheet edits to other columns are never overwritten by stale in-memory values. Phase 2 fields without modal controls (`groups`, `availability`, `birthYear`, `secondaryRole`, `active`, `notes`) are therefore never written by `update`.

### Teams

- `teamId`: required stable id used by `Players.primaryTeam` and `Players.teams`.
- `name`: required visible team name.
- `color1`: optional primary color hex.
- `color2`: optional secondary color hex; UI can fall back to `color1`.
- `crest`: optional crest URL, data URL, emoji, or short visual identifier.

`action=readTeams` skips rows without `teamId`, defaults missing `name` to `teamId`, defaults missing `color2` to `color1`, and returns empty strings for optional missing values.

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
