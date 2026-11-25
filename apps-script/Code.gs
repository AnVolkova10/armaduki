// The spreadsheet id lives in Script Properties (Project Settings > Script Properties),
// so this file can be pushed from the repo as-is and the id never lands in git.
const SPREADSHEET_ID_PROPERTY = 'SPREADSHEET_ID';

// When this script property holds a key, every request must send it: reads and saves alike.
// Empty or missing: everything is open. The key is never in the code or in the repo.
const ACCESS_KEY_PROPERTY = 'ACCESS_KEY';
const UNAUTHORIZED = 'unauthorized';

const PLAYERS_SHEET_NAME = 'Players';
const LEGACY_PLAYERS_SHEET_NAME = 'db';
const TEAMS_SHEET_NAME = 'Teams';
const GROUPS_SHEET_NAME = 'Groups';
const RELATIONSHIP_HISTORY_SHEET_NAME = 'RelationshipHistory';
const MATCH_HISTORY_SHEET_NAME = 'MatchHistory';

// ensureSchema() costs many Spreadsheet calls, so normal requests run it at most once per
// cache window. Bump the version when headers change; `action=migrateSchema` always runs it.
// v2 (Sprint 6): adds the birthDate column on the first read after the release.
const SCHEMA_CACHE_KEY = 'armaduki-schema-v2';
const SCHEMA_CACHE_SECONDS = 6 * 60 * 60;

// Writes wait up to this long for other writes to finish (prevents interleaved row edits).
const LOCK_TIMEOUT_MS = 30000;

const PLAYERS_HEADERS = [
  'id',
  'name',
  'nickname',
  'role',
  'rating',
  'avatar',
  'gkWillingness',
  'wantsWith',
  'avoidsWith',
  'attributes',
  'shirtNumber',
  'primaryTeam',
  'teams',
  'groups',
  'availability',
  'birthYear',
  'secondaryRole',
  'active',
  'notes',
  // yyyy, yyyy-MM or yyyy-MM-dd, kept as text. birthYear stays, unused (Sprint 6).
  'birthDate',
];

const TEAMS_HEADERS = [
  'teamId',
  'name',
  'color1',
  'color2',
  'crest',
];

const GROUPS_HEADERS = [
  'groupId',
  'name',
  'place',
  'notes',
];

const RELATIONSHIP_HISTORY_HEADERS = [
  'sourceId',
  'targetId',
  'wantsCount',
  'avoidsCount',
  'updatedAt',
];

const MATCH_HISTORY_HEADERS = [
  'matchId',
  'createdAt',
  'selectedIds',
  'team1Ids',
  'team2Ids',
  'score',
  'stage',
  'socialSatisfactionPct',
  'isTest',
];

// Matches frontend logic: "GK Willingness" -> "gkwillingness".
function normalizeKey(str) {
  return str.toString().toLowerCase().replace(/\s/g, '');
}

function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function textOutput(value) {
  return ContentService.createTextOutput(value);
}

// Opened once per request; globals are re-created on every execution.
let cachedSpreadsheet = null;

function getSpreadsheet() {
  if (cachedSpreadsheet) return cachedSpreadsheet;

  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(SPREADSHEET_ID_PROPERTY);
  if (!spreadsheetId) {
    throw new Error(
      'Missing script property ' + SPREADSHEET_ID_PROPERTY + ' (Project Settings > Script Properties).',
    );
  }

  cachedSpreadsheet = SpreadsheetApp.openById(spreadsheetId);
  return cachedSpreadsheet;
}

// No key stored: everything is open. A stored key must match exactly; spaces around either
// one are ignored, so a stray space typed in the property cannot lock everyone out.
function isKeyAccepted(key) {
  const expected = normalizeId(PropertiesService.getScriptProperties().getProperty(ACCESS_KEY_PROPERTY));
  return !expected || normalizeId(key) === expected;
}

function withScriptLock(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(LOCK_TIMEOUT_MS);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function ensureSheetHeaders(sheet, headers) {
  const lastColumn = sheet.getLastColumn();

  if (lastColumn === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return headers.slice();
  }

  const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const normalizedExisting = new Set(
    currentHeaders
      .map(header => normalizeKey(header))
      .filter(key => key.length > 0),
  );
  const missingHeaders = headers.filter(header => !normalizedExisting.has(normalizeKey(header)));

  if (missingHeaders.length > 0) {
    sheet.getRange(1, lastColumn + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  }

  return currentHeaders.concat(missingHeaders);
}

function getOrCreateSheet(spreadsheet, sheetName, headers) {
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  ensureSheetHeaders(sheet, headers);
  return sheet;
}

function getHeaders(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

function getColumnIndex(headers, targetKey) {
  const normalizedTarget = normalizeKey(targetKey);
  return headers.findIndex(header => normalizeKey(header) === normalizedTarget);
}

function normalizeId(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

// `data` is the full sheet (header row included). Returns the data index of the row, or -1.
function findRowIndexById(data, id) {
  const targetId = normalizeId(id);
  if (!targetId || data.length === 0) return -1;

  const idColumnIndex = getColumnIndex(data[0], 'id');
  if (idColumnIndex === -1) return -1;

  return data.findIndex((row, index) => index > 0 && normalizeId(row[idColumnIndex]) === targetId);
}

function readSheetObjects(sheet) {
  const data = sheet.getDataRange().getValues();

  if (data.length === 0) return [];

  const headers = data[0];
  const rows = data.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      const key = normalizeKey(header);
      if (key) {
        obj[key] = row[index];
      }
    });
    return obj;
  });
}

function getRowString(rowObject, key) {
  const value = rowObject[normalizeKey(key)];
  if (value === undefined || value === null) return '';
  if (isDateValue(value)) return formatDateCell(value);
  return String(value).trim();
}

// Sheets turns text that looks like a date into one ("1994-03" becomes 1 March 1994, "20/11"
// a day of this year) and text that starts with "=" into a formula. A leading apostrophe keeps
// the cell exactly as typed, and is not part of its value.
function asText(value) {
  const text = normalizeId(value);
  return text ? "'" + text : '';
}

// Checked by tag, not instanceof, so it also holds for dates made outside this script.
function isDateValue(value) {
  return Object.prototype.toString.call(value) === '[object Date]';
}

// A date typed by hand in the sheet comes back as a Date. It is read as yyyy-MM-dd in the
// spreadsheet's own time zone: in UTC, midnight east of Greenwich is still the day before.
function formatDateCell(value) {
  return Utilities.formatDate(value, getSpreadsheet().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
}

function buildRowFromPayload(headers, lowerBody, existingRow) {
  return headers.map((header, index) => {
    const headerKey = normalizeKey(header);

    if (lowerBody[headerKey] !== undefined) {
      const value = lowerBody[headerKey];
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
      }
      return value;
    }

    return existingRow ? existingRow[index] : '';
  });
}

// Returns the players sheet. Renames legacy `db` or creates `Players` when needed.
// Headers of an existing sheet are kept up to date by ensureSchema().
function getPlayersSheet() {
  const spreadsheet = getSpreadsheet();
  const playersSheet = spreadsheet.getSheetByName(PLAYERS_SHEET_NAME);
  if (playersSheet) {
    return playersSheet;
  }

  const legacySheet = spreadsheet.getSheetByName(LEGACY_PLAYERS_SHEET_NAME);
  if (legacySheet) {
    legacySheet.setName(PLAYERS_SHEET_NAME);
    ensureSheetHeaders(legacySheet, PLAYERS_HEADERS);
    return legacySheet;
  }

  return getOrCreateSheet(spreadsheet, PLAYERS_SHEET_NAME, PLAYERS_HEADERS);
}

function ensureSchema() {
  const spreadsheet = getSpreadsheet();
  const playersSheet = getPlayersSheet();
  ensureSheetHeaders(playersSheet, PLAYERS_HEADERS);
  const teamsSheet = getOrCreateSheet(spreadsheet, TEAMS_SHEET_NAME, TEAMS_HEADERS);
  const groupsSheet = getOrCreateSheet(spreadsheet, GROUPS_SHEET_NAME, GROUPS_HEADERS);
  const relationshipHistorySheet = getOrCreateSheet(
    spreadsheet,
    RELATIONSHIP_HISTORY_SHEET_NAME,
    RELATIONSHIP_HISTORY_HEADERS,
  );
  const matchHistorySheet = getOrCreateSheet(spreadsheet, MATCH_HISTORY_SHEET_NAME, MATCH_HISTORY_HEADERS);

  CacheService.getScriptCache().put(SCHEMA_CACHE_KEY, 'ok', SCHEMA_CACHE_SECONDS);

  return {
    ok: true,
    sheets: {
      players: playersSheet.getName(),
      teams: teamsSheet.getName(),
      groups: groupsSheet.getName(),
      relationshipHistory: relationshipHistorySheet.getName(),
      matchHistory: matchHistorySheet.getName(),
    },
  };
}

function isSchemaFresh() {
  return CacheService.getScriptCache().get(SCHEMA_CACHE_KEY) === 'ok';
}

// Call while holding the script lock.
function ensureSchemaIfStale() {
  if (!isSchemaFresh()) {
    ensureSchema();
  }
}

function ensureSchemaForRead() {
  if (!isSchemaFresh()) {
    withScriptLock(ensureSchemaIfStale);
  }
}

function readPlayers() {
  ensureSchemaForRead();
  const sheet = getPlayersSheet();
  return readSheetObjects(sheet).map(row => {
    if (isDateValue(row.birthdate)) row.birthdate = formatDateCell(row.birthdate);
    return row;
  });
}

function readTeams() {
  ensureSchemaForRead();
  const spreadsheet = getSpreadsheet();
  const sheet = getOrCreateSheet(spreadsheet, TEAMS_SHEET_NAME, TEAMS_HEADERS);
  const rows = readSheetObjects(sheet);
  const teams = [];

  rows.forEach(row => {
    const teamId = getRowString(row, 'teamId');
    if (!teamId) return;

    const color1 = getRowString(row, 'color1');

    teams.push({
      teamId: teamId,
      name: getRowString(row, 'name') || teamId,
      color1: color1,
      color2: getRowString(row, 'color2') || color1,
      crest: getRowString(row, 'crest'),
    });
  });

  return teams;
}

function readGroups() {
  ensureSchemaForRead();
  const spreadsheet = getSpreadsheet();
  const sheet = getOrCreateSheet(spreadsheet, GROUPS_SHEET_NAME, GROUPS_HEADERS);
  const groups = [];

  readSheetObjects(sheet).forEach(row => {
    const groupId = getRowString(row, 'groupId');
    if (!groupId) return;

    groups.push({
      groupId: groupId,
      name: getRowString(row, 'name') || groupId,
      place: getRowString(row, 'place'),
    });
  });

  return groups;
}

// Everything the app needs when it opens, in one request (one Apps Script execution).
// A Teams or Groups problem does not block the players: it comes back as `teamsError` or
// `groupsError`. The `groups` key is always there from Sprint 6 on: the app reads it as the
// sign that this backend saves groups, birth dates and new teams and groups.
function readAll() {
  const result = { players: readPlayers(), teams: [], groups: [] };
  try {
    result.teams = readTeams();
  } catch (err) {
    result.teamsError = err.toString();
  }
  try {
    result.groups = readGroups();
  } catch (err) {
    result.groupsError = err.toString();
  }
  return result;
}

function migratePlayersSheetName() {
  const result = withScriptLock(ensureSchema);
  const sheet = getPlayersSheet();
  return Object.assign({}, result, {
    ok: true,
    playersSheetName: sheet.getName(),
  });
}

function migrateSchema() {
  const result = withScriptLock(ensureSchema);
  return Object.assign({}, result, {
    ok: true,
    action: 'migrateSchema',
  });
}

// Runs add/update/delete. Returns the plain-text answer the frontend checks:
// 'Added', 'Updated', 'Deleted', 'ID not found', 'ID not found for update' or 'Error: ...'.
function handlePlayerWrite(body) {
  ensureSchemaIfStale();
  const sheet = getPlayersSheet();
  const action = body.action;
  const id = normalizeId(body.id);

  const lowerBody = {};
  for (const key in body) {
    if (key === 'key') continue; // the access key is not a column
    lowerBody[normalizeKey(key)] = body[key];
  }
  if (id) {
    lowerBody.id = id;
  }
  // Free text, partial dates and shirt numbers ("007") stay exactly as typed (see asText).
  ['birthdate', 'notes', 'shirtnumber'].forEach(key => {
    if (typeof lowerBody[key] === 'string') lowerBody[key] = asText(lowerBody[key]);
  });

  const data = sheet.getDataRange().getValues();
  const headers = data.length > 0 ? data[0] : getHeaders(sheet);
  const rowIndex = findRowIndexById(data, id);

  if (action === 'delete') {
    if (rowIndex === -1) return 'ID not found';
    sheet.deleteRow(rowIndex + 1);
    return 'Deleted';
  }

  if (action === 'add') {
    if (!id) return 'Error: missing id';
    if (rowIndex !== -1) return 'Error: id ' + id + ' already exists';
    sheet.appendRow(buildRowFromPayload(headers, lowerBody, null));
    return 'Added';
  }

  if (action === 'update') {
    if (rowIndex === -1) return 'ID not found for update';
    // Only the cells it receives. Writing the rest of the row back would make Sheets read their
    // text again: a birth date kept as "1994-03" would turn into 1 March 1994.
    const newRow = buildRowFromPayload(headers, lowerBody, data[rowIndex]);
    headers.forEach((header, index) => {
      const key = normalizeKey(header);
      if (key === 'id' || lowerBody[key] === undefined) return;
      sheet.getRange(rowIndex + 1, index + 1, 1, 1).setValues([[newRow[index]]]);
    });
    return 'Updated';
  }

  return 'Action unknown';
}

// Teams and groups made from the player form (Sprint 6). Renaming and deleting stay in the sheet.
const CATALOGS = {
  addTeam: { sheetName: TEAMS_SHEET_NAME, headers: TEAMS_HEADERS, idKey: 'teamId', extra: ['color1', 'color2'] },
  addGroup: { sheetName: GROUPS_SHEET_NAME, headers: GROUPS_HEADERS, idKey: 'groupId', extra: [] },
};

// The app picks the id. The same id with the same name again (a retry) answers 'Added' without
// a second row; the same id with another name is an error.
function handleCatalogAdd(body) {
  ensureSchemaIfStale();
  const catalog = CATALOGS[body.action];
  const id = normalizeId(body[catalog.idKey]);
  const name = normalizeId(body.name);
  if (!id || !name) return 'Error: missing ' + catalog.idKey + ' or name';

  const sheet = getOrCreateSheet(getSpreadsheet(), catalog.sheetName, catalog.headers);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idColumn = getColumnIndex(headers, catalog.idKey);
  const nameColumn = getColumnIndex(headers, 'name');
  const existing = data.find((row, index) => index > 0 && normalizeId(row[idColumn]) === id);

  if (existing) {
    return normalizeId(existing[nameColumn]) === name
      ? 'Added'
      : 'Error: ' + catalog.idKey + ' ' + id + ' already exists';
  }

  const values = { name: asText(name) };
  values[normalizeKey(catalog.idKey)] = asText(id);
  catalog.extra.forEach(field => {
    values[normalizeKey(field)] = normalizeId(body[field]);
  });
  sheet.appendRow(headers.map(header => {
    const value = values[normalizeKey(header)];
    return value === undefined ? '' : value;
  }));
  return 'Added';
}

function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action ? e.parameter.action : 'read';

    // Checked before the spreadsheet is opened, for every action.
    if (!isKeyAccepted(e && e.parameter ? e.parameter.key : '')) {
      return jsonOutput({ error: UNAUTHORIZED });
    }

    if (action === 'readAll') {
      return jsonOutput(readAll());
    }

    if (action === 'read') {
      return jsonOutput(readPlayers());
    }

    if (action === 'readTeams') {
      return jsonOutput(readTeams());
    }

    if (action === 'migratePlayersSheet') {
      return jsonOutput(migratePlayersSheetName());
    }

    if (action === 'migrateSchema') {
      return jsonOutput(migrateSchema());
    }

    return jsonOutput({ error: 'Action unknown' });
  } catch (err) {
    return jsonOutput({ error: err.toString() });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    // Checked before the spreadsheet is opened, for every action.
    if (!isKeyAccepted(body.key)) {
      return textOutput('Error: ' + UNAUTHORIZED);
    }

    if (action === 'migratePlayersSheet') {
      return jsonOutput(migratePlayersSheetName());
    }

    if (action === 'migrateSchema') {
      return jsonOutput(migrateSchema());
    }

    if (action === 'readTeams') {
      return jsonOutput(readTeams());
    }

    if (action === 'addTeam' || action === 'addGroup') {
      return textOutput(withScriptLock(() => handleCatalogAdd(body)));
    }

    return textOutput(withScriptLock(() => handlePlayerWrite(body)));
  } catch (err) {
    return textOutput('Error: ' + err.toString());
  }
}
