# Apps Script

Versioned source for the Google Apps Script web app used by Armaduki.

Before deploying:

- Keep the real spreadsheet ID from the current Apps Script in `SPREADSHEET_ID`.
- Deploy a new web app version after changing the remote Apps Script code.
- Run `?action=migrateSchema` after deploy to rename legacy `db` to `Players`, create missing sheets, and append missing columns.
- Run `?action=read` after deploy to confirm the app still returns player rows.

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
