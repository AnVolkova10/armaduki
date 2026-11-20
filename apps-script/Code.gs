// The spreadsheet id lives in Script Properties (Project Settings > Script Properties),
// so this file can be pushed from the repo as-is and the id never lands in git.
const SPREADSHEET_ID_PROPERTY = 'SPREADSHEET_ID';

const PLAYERS_SHEET_NAME = 'Players';
const LEGACY_PLAYERS_SHEET_NAME = 'db';
const TEAMS_SHEET_NAME = 'Teams';
const GROUPS_SHEET_NAME = 'Groups';
const RELATIONSHIP_HISTORY_SHEET_NAME = 'RelationshipHistory';
const MATCH_HISTORY_SHEET_NAME = 'MatchHistory';

// ensureSchema() costs many Spreadsheet calls, so normal requests run it at most once per
// cache window. Bump the version when headers change; `action=migrateSchema` always runs it.
const SCHEMA_CACHE_KEY = 'armaduki-schema-v1';
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
  return String(value).trim();
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
  return readSheetObjects(sheet);
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

// Everything the app needs when it opens, in one request (one Apps Script execution).
// A Teams problem does not block the players: it comes back as `teamsError`.
function readAll() {
  const result = { players: readPlayers(), teams: [] };
  try {
    result.teams = readTeams();
  } catch (err) {
    result.teamsError = err.toString();
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
    lowerBody[normalizeKey(key)] = body[key];
  }
  if (id) {
    lowerBody.id = id;
  }

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
    const newRow = buildRowFromPayload(headers, lowerBody, data[rowIndex]);
    sheet.getRange(rowIndex + 1, 1, 1, newRow.length).setValues([newRow]);
    return 'Updated';
  }

  return 'Action unknown';
}

function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action ? e.parameter.action : 'read';

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

    if (action === 'migratePlayersSheet') {
      return jsonOutput(migratePlayersSheetName());
    }

    if (action === 'migrateSchema') {
      return jsonOutput(migrateSchema());
    }

    if (action === 'readTeams') {
      return jsonOutput(readTeams());
    }

    return textOutput(withScriptLock(() => handlePlayerWrite(body)));
  } catch (err) {
    return textOutput('Error: ' + err.toString());
  }
}
