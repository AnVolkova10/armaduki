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
const MATCH_PLAYERS_SHEET_NAME = 'MatchPlayers';

// The highest numeric player id ever deleted (Sprint 9). New ids go above it, so a new player
// never takes over the matches or the link history of a deleted one.
const HIGHEST_PLAYER_ID_PROPERTY = 'HIGHEST_PLAYER_ID';

// What this backend can do beyond players, teams, groups and the link history. The app shows a
// feature only when its name is here, so an older backend simply hides it.
const CAPABILITIES = ['matches'];

// ensureSchema() costs many Spreadsheet calls, so normal requests run it at most once per
// cache window. Bump the version when headers change; `action=migrateSchema` always runs it.
// v2 (Sprint 6): adds the birthDate column on the first read after the release.
// v3 (Sprint 9): adds the match columns to MatchHistory and the MatchPlayers tab.
const SCHEMA_CACHE_KEY = 'armaduki-schema-v3';
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
  // Sprint 9: matches as they were played, whoever built the teams.
  'date',
  'groupId',
  'place',
  'team1Goals',
  'team2Goals',
  'team1KeeperId',
  'team2KeeperId',
  'origin',
  'updatedAt',
];

// One row per player per match (Sprint 9): their side, their counters and how they were that day.
const MATCH_PLAYERS_HEADERS = [
  'matchId',
  'playerId',
  'nickname',
  'team',
  'goals',
  'conceded',
  'errors',
  'role',
  'secondaryRole',
  'rating',
  'attributes',
  'gkWillingness',
  'wantsWith',
  'avoidsWith',
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
  const matchPlayersSheet = getOrCreateSheet(spreadsheet, MATCH_PLAYERS_SHEET_NAME, MATCH_PLAYERS_HEADERS);

  CacheService.getScriptCache().put(SCHEMA_CACHE_KEY, 'ok', SCHEMA_CACHE_SECONDS);

  return {
    ok: true,
    sheets: {
      players: playersSheet.getName(),
      teams: teamsSheet.getName(),
      groups: groupsSheet.getName(),
      relationshipHistory: relationshipHistorySheet.getName(),
      matchHistory: matchHistorySheet.getName(),
      matchPlayers: matchPlayersSheet.getName(),
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

// How many times each player marked each other one (Sprint 8), for the order of the form's
// lists. Rows without both ids, or with nothing counted, are left out.
function readRelationshipHistory() {
  ensureSchemaForRead();
  const sheet = getOrCreateSheet(getSpreadsheet(), RELATIONSHIP_HISTORY_SHEET_NAME, RELATIONSHIP_HISTORY_HEADERS);
  const history = [];

  readSheetObjects(sheet).forEach(row => {
    const sourceId = getRowString(row, 'sourceId');
    const targetId = getRowString(row, 'targetId');
    const wantsCount = toCount(row.wantscount);
    const avoidsCount = toCount(row.avoidscount);
    if (!sourceId || !targetId || sourceId === targetId || wantsCount + avoidsCount === 0) return;
    history.push({ sourceId: sourceId, targetId: targetId, wantsCount: wantsCount, avoidsCount: avoidsCount });
  });

  return history;
}

// Everything the app needs when it opens, in one request (one Apps Script execution).
// A Teams, Groups or RelationshipHistory problem does not block the players: it comes back as
// `teamsError`, `groupsError` or `relationshipHistoryError`. The `groups` key is always there
// from Sprint 6 on, and `relationshipHistory` from Sprint 8 on: the app reads them as the sign
// of what this backend saves. From Sprint 9 on, `capabilities` names the rest (matches), and
// `highestPlayerId` is the floor for new ids. Matches are not here: the app asks for them when
// it opens «Matches» (readMatches).
function readAll() {
  const result = {
    players: readPlayers(),
    teams: [],
    groups: [],
    relationshipHistory: [],
    capabilities: CAPABILITIES.slice(),
  };
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
  try {
    result.relationshipHistory = readRelationshipHistory();
  } catch (err) {
    result.relationshipHistoryError = err.toString();
  }
  try {
    result.highestPlayerId = highestKnownPlayerId(result.players, result.relationshipHistory);
  } catch (err) {
    // The app then counts only the ids it has.
  }
  return result;
}

// "12" is 12; anything that is not a whole number (or missing) is -1.
function numericId(value) {
  const id = normalizeId(value);
  return /^\d+$/.test(id) ? Number(id) : -1;
}

// The highest player id ever used, as far as this backend can tell: the players, their links,
// the link history, and the script property, which every delete and every saved match raise. So
// a player who played a match keeps their id taken even if their row is later deleted by hand.
function highestKnownPlayerId(players, history) {
  let highest = numericId(PropertiesService.getScriptProperties().getProperty(HIGHEST_PLAYER_ID_PROPERTY));
  players.forEach(row => {
    highest = Math.max(highest, numericId(row.id));
    parseIdList(row.wantswith).concat(parseIdList(row.avoidswith)).forEach(id => {
      highest = Math.max(highest, numericId(id));
    });
  });
  history.forEach(entry => {
    highest = Math.max(highest, numericId(entry.sourceId), numericId(entry.targetId));
  });
  return highest;
}

// Raises the floor for new ids to `ids` (see highestKnownPlayerId): the id of a deleted player, or
// the players of a saved match. A problem here never undoes the delete or the save.
function rememberPlayerIds(ids) {
  try {
    const value = ids.reduce((highest, id) => Math.max(highest, numericId(id)), -1);
    if (value < 0) return;
    const properties = PropertiesService.getScriptProperties();
    if (value > numericId(properties.getProperty(HIGHEST_PLAYER_ID_PROPERTY))) {
      properties.setProperty(HIGHEST_PLAYER_ID_PROPERTY, String(value));
    }
  } catch (err) {
    // Nothing else to do here.
  }
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

// Wants and avoids are ids joined by "|" ("12|31"), each one once; an array works too.
function parseIdList(value) {
  const ids = Array.isArray(value)
    ? value.map(normalizeId)
    : value === undefined || value === null ? [] : String(value).split('|').map(normalizeId);
  return ids.filter((id, index) => id && ids.indexOf(id) === index);
}

function toCount(value) {
  const count = parseInt(value, 10);
  return isFinite(count) && count > 0 ? count : 0;
}

// The wants and avoids a player row holds now.
function linksOfRow(headers, row) {
  const wantsColumn = getColumnIndex(headers, 'wantsWith');
  const avoidsColumn = getColumnIndex(headers, 'avoidsWith');
  return {
    wants: wantsColumn === -1 ? [] : parseIdList(row[wantsColumn]),
    avoids: avoidsColumn === -1 ? [] : parseIdList(row[avoidsColumn]),
  };
}

// The wants and avoids a save leaves: what it sends, or what was there when it sends nothing.
function linksAfterSave(lowerBody, before) {
  return {
    wants: lowerBody.wantswith === undefined ? before.wants : parseIdList(lowerBody.wantswith),
    avoids: lowerBody.avoidswith === undefined ? before.avoids : parseIdList(lowerBody.avoidswith),
  };
}

// The RelationshipHistory tab (Sprint 8): how many times each player marked each other one as a
// want or an avoid. A save adds 1 for every link it brings that the player did not have, also
// when one cleared earlier is marked again; nothing ever takes one away, so clearing the links
// keeps the history. One row per pair, in the direction it was marked. Ids and the time go as
// text (see asText): a timestamp could turn into a date.
function recordNewLinks(sourceId, before, after) {
  const added = {
    wantscount: after.wants.filter(id => id !== sourceId && before.wants.indexOf(id) === -1),
    avoidscount: after.avoids.filter(id => id !== sourceId && before.avoids.indexOf(id) === -1),
  };
  if (added.wantscount.length === 0 && added.avoidscount.length === 0) return;

  const sheet = getOrCreateSheet(getSpreadsheet(), RELATIONSHIP_HISTORY_SHEET_NAME, RELATIONSHIP_HISTORY_HEADERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const column = {};
  RELATIONSHIP_HISTORY_HEADERS.forEach(header => {
    column[normalizeKey(header)] = getColumnIndex(headers, header);
  });
  const pairKey = (from, to) => from + '|' + to;
  const rowOfPair = {};
  data.forEach((row, index) => {
    const key = pairKey(normalizeId(row[column.sourceid]), normalizeId(row[column.targetid]));
    if (index > 0 && !(key in rowOfPair)) rowOfPair[key] = index;
  });
  const now = asText(new Date().toISOString());

  Object.keys(added).forEach(countKey => {
    added[countKey].forEach(targetId => {
      const key = pairKey(sourceId, targetId);
      const index = rowOfPair[key];
      if (index !== undefined) {
        data[index][column[countKey]] = toCount(data[index][column[countKey]]) + 1;
        sheet.getRange(index + 1, column[countKey] + 1, 1, 1).setValues([[data[index][column[countKey]]]]);
        sheet.getRange(index + 1, column.updatedat + 1, 1, 1).setValues([[now]]);
        return;
      }
      const row = headers.map(() => '');
      row[column.sourceid] = asText(sourceId);
      row[column.targetid] = asText(targetId);
      row[column.wantscount] = countKey === 'wantscount' ? 1 : 0;
      row[column.avoidscount] = countKey === 'avoidscount' ? 1 : 0;
      row[column.updatedat] = now;
      sheet.appendRow(row);
      rowOfPair[key] = data.length;
      data.push(row);
    });
  });
}

// The player row is already written: a problem with the history never undoes the save, it only
// leaves that save uncounted.
function recordNewLinksSafely(sourceId, before, after) {
  try {
    recordNewLinks(sourceId, before, after);
  } catch (err) {
    // Nothing else to do here.
  }
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
    rememberPlayerIds([id]);
    return 'Deleted';
  }

  if (action === 'add') {
    if (!id) return 'Error: missing id';
    if (rowIndex !== -1) return 'Error: id ' + id + ' already exists';
    sheet.appendRow(buildRowFromPayload(headers, lowerBody, null));
    const none = { wants: [], avoids: [] };
    recordNewLinksSafely(id, none, linksAfterSave(lowerBody, none));
    return 'Added';
  }

  if (action === 'update') {
    if (rowIndex === -1) return 'ID not found for update';
    // Only the cells it receives. Writing the rest of the row back would make Sheets read their
    // text again: a birth date kept as "1994-03" would turn into 1 March 1994.
    const before = linksOfRow(headers, data[rowIndex]);
    const newRow = buildRowFromPayload(headers, lowerBody, data[rowIndex]);
    headers.forEach((header, index) => {
      const key = normalizeKey(header);
      if (key === 'id' || lowerBody[key] === undefined) return;
      sheet.getRange(rowIndex + 1, index + 1, 1, 1).setValues([[newRow[index]]]);
    });
    recordNewLinksSafely(id, before, linksAfterSave(lowerBody, before));
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

// ---------------------------------------------------------------------------
// Matches (Sprint 9): MatchHistory holds one row per match, MatchPlayers one row per player in
// it. The app builds the whole match and saves it in one go; a save replaces what was there.
// ---------------------------------------------------------------------------

// A result is a whole number from 0 up; empty means the match has no result yet (null).
function toGoals(value) {
  if (value === undefined || value === null || value === '') return null;
  const goals = Number(value);
  return isFinite(goals) && goals >= 0 ? Math.floor(goals) : null;
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return isFinite(number) ? number : null;
}

function emptyIfNull(value) {
  return value === null ? '' : value;
}

function toSide(value) {
  return Number(value) === 2 ? 2 : 1;
}

// Rewriting a cell this script does not own: text goes back as text, or Sheets would parse it
// again (see asText).
function keepCell(value) {
  return typeof value === 'string' && value !== '' ? "'" + value : value;
}

function rowFromValues(headers, values, existingRow) {
  return headers.map((header, index) => {
    const value = values[normalizeKey(header)];
    if (value !== undefined) return value;
    return existingRow ? keepCell(existingRow[index]) : '';
  });
}

// The players of a match, each once, in the order the app sent them.
function matchPlayersOf(match) {
  const seen = {};
  return (Array.isArray(match.players) ? match.players : []).filter(player => {
    const playerId = player && typeof player === 'object' ? normalizeId(player.playerId) : '';
    if (!playerId || seen[playerId]) return false;
    seen[playerId] = true;
    return true;
  });
}

function matchHistoryValues(match, players) {
  const idsOf = side => players.filter(player => toSide(player.team) === side).map(player => normalizeId(player.playerId));
  return {
    matchid: asText(match.matchId),
    createdat: asText(match.createdAt),
    selectedids: asText(players.map(player => normalizeId(player.playerId)).join('|')),
    team1ids: asText(idsOf(1).join('|')),
    team2ids: asText(idsOf(2).join('|')),
    score: emptyIfNull(toNumberOrNull(match.score)),
    stage: asText(match.stage),
    socialsatisfactionpct: emptyIfNull(toNumberOrNull(match.socialSatisfactionPct)),
    istest: false,
    date: asText(match.date),
    groupid: asText(match.groupId),
    place: asText(match.place),
    team1goals: emptyIfNull(toGoals(match.team1Goals)),
    team2goals: emptyIfNull(toGoals(match.team2Goals)),
    team1keeperid: asText(match.team1KeeperId),
    team2keeperid: asText(match.team2KeeperId),
    origin: asText(match.origin),
    updatedat: asText(match.updatedAt),
  };
}

function matchPlayerValues(matchId, player) {
  const attributes = player.attributes && typeof player.attributes === 'object'
    ? JSON.stringify(player.attributes)
    : player.attributes;
  return {
    matchid: asText(matchId),
    playerid: asText(player.playerId),
    nickname: asText(player.nickname),
    team: toSide(player.team),
    goals: toCount(player.goals),
    conceded: toCount(player.conceded),
    errors: toCount(player.errors),
    role: asText(player.role),
    secondaryrole: asText(player.secondaryRole),
    rating: emptyIfNull(toNumberOrNull(player.rating)),
    attributes: asText(attributes),
    gkwillingness: asText(player.gkWillingness),
    wantswith: asText(parseIdList(player.wantsWith).join('|')),
    avoidswith: asText(parseIdList(player.avoidsWith).join('|')),
  };
}

// Deletes, from the bottom up, every data row whose `column` holds `id`. Returns how many.
function deleteRowsWithId(sheet, columnName, id) {
  const data = sheet.getDataRange().getValues();
  const column = getColumnIndex(data[0], columnName);
  if (column === -1) return 0;
  let deleted = 0;
  for (let index = data.length - 1; index >= 1; index--) {
    if (normalizeId(data[index][column]) === id) {
      sheet.deleteRow(index + 1);
      deleted++;
    }
  }
  return deleted;
}

function readMatches() {
  ensureSchemaForRead();
  const spreadsheet = getSpreadsheet();
  const historySheet = getOrCreateSheet(spreadsheet, MATCH_HISTORY_SHEET_NAME, MATCH_HISTORY_HEADERS);
  const playersSheet = getOrCreateSheet(spreadsheet, MATCH_PLAYERS_SHEET_NAME, MATCH_PLAYERS_HEADERS);

  const playersByMatch = {};
  readSheetObjects(playersSheet).forEach(row => {
    const matchId = getRowString(row, 'matchId');
    const playerId = getRowString(row, 'playerId');
    if (!matchId || !playerId) return;
    if (!playersByMatch[matchId]) playersByMatch[matchId] = [];
    playersByMatch[matchId].push({
      playerId: playerId,
      nickname: getRowString(row, 'nickname'),
      team: toSide(row.team),
      goals: toCount(row.goals),
      conceded: toCount(row.conceded),
      errors: toCount(row.errors),
      role: getRowString(row, 'role'),
      secondaryRole: getRowString(row, 'secondaryRole'),
      rating: toNumberOrNull(row.rating),
      attributes: getRowString(row, 'attributes'),
      gkWillingness: getRowString(row, 'gkWillingness'),
      wantsWith: getRowString(row, 'wantsWith'),
      avoidsWith: getRowString(row, 'avoidsWith'),
    });
  });

  const matches = [];
  readSheetObjects(historySheet).forEach(row => {
    const matchId = getRowString(row, 'matchId');
    if (!matchId) return;
    matches.push({
      matchId: matchId,
      createdAt: getRowString(row, 'createdAt'),
      updatedAt: getRowString(row, 'updatedAt'),
      date: getRowString(row, 'date'),
      groupId: getRowString(row, 'groupId'),
      place: getRowString(row, 'place'),
      team1Goals: toGoals(row.team1goals),
      team2Goals: toGoals(row.team2goals),
      team1KeeperId: getRowString(row, 'team1KeeperId'),
      team2KeeperId: getRowString(row, 'team2KeeperId'),
      origin: getRowString(row, 'origin'),
      stage: getRowString(row, 'stage'),
      score: toNumberOrNull(row.score),
      socialSatisfactionPct: toNumberOrNull(row.socialsatisfactionpct),
      players: playersByMatch[matchId] || [],
    });
  });

  return { matches: matches };
}

// Creates or replaces a whole match, found by its id: its MatchHistory row and all its
// MatchPlayers rows (the old ones go, the new ones are appended). A retry changes nothing more.
function handleSaveMatch(body) {
  ensureSchemaIfStale();
  const match = body.match;
  if (!match || typeof match !== 'object') return 'Error: missing match';
  const matchId = normalizeId(match.matchId);
  if (!matchId) return 'Error: missing matchId';
  const players = matchPlayersOf(match);
  const spreadsheet = getSpreadsheet();

  const historySheet = getOrCreateSheet(spreadsheet, MATCH_HISTORY_SHEET_NAME, MATCH_HISTORY_HEADERS);
  const data = historySheet.getDataRange().getValues();
  const headers = data[0];
  const idColumn = getColumnIndex(headers, 'matchId');
  const rowIndex = data.findIndex((row, index) => index > 0 && normalizeId(row[idColumn]) === matchId);
  const values = matchHistoryValues(match, players);
  if (rowIndex === -1) {
    historySheet.appendRow(rowFromValues(headers, values, null));
  } else {
    historySheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([rowFromValues(headers, values, data[rowIndex])]);
  }

  const playersSheet = getOrCreateSheet(spreadsheet, MATCH_PLAYERS_SHEET_NAME, MATCH_PLAYERS_HEADERS);
  deleteRowsWithId(playersSheet, 'matchId', matchId);
  const playerHeaders = getHeaders(playersSheet);
  players.forEach(player => {
    playersSheet.appendRow(rowFromValues(playerHeaders, matchPlayerValues(matchId, player), null));
  });
  rememberPlayerIds(players.map(player => player.playerId));
  return 'Saved';
}

function handleDeleteMatch(body) {
  ensureSchemaIfStale();
  const matchId = normalizeId(body.matchId);
  if (!matchId) return 'Error: missing matchId';
  const spreadsheet = getSpreadsheet();
  const historySheet = getOrCreateSheet(spreadsheet, MATCH_HISTORY_SHEET_NAME, MATCH_HISTORY_HEADERS);
  const playersSheet = getOrCreateSheet(spreadsheet, MATCH_PLAYERS_SHEET_NAME, MATCH_PLAYERS_HEADERS);
  const deleted = deleteRowsWithId(historySheet, 'matchId', matchId);
  deleteRowsWithId(playersSheet, 'matchId', matchId);
  return deleted > 0 ? 'Deleted' : 'Match not found';
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

    if (action === 'readMatches') {
      return jsonOutput(readMatches());
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

    if (action === 'saveMatch') {
      return textOutput(withScriptLock(() => handleSaveMatch(body)));
    }

    if (action === 'deleteMatch') {
      return textOutput(withScriptLock(() => handleDeleteMatch(body)));
    }

    return textOutput(withScriptLock(() => handlePlayerWrite(body)));
  } catch (err) {
    return textOutput('Error: ' + err.toString());
  }
}
