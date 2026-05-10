const SPREADSHEET_ID = 'PASTE_SPREADSHEET_ID_HERE';

const PLAYERS_SHEET_NAME = 'Players';
const LEGACY_PLAYERS_SHEET_NAME = 'db';
const TEAMS_SHEET_NAME = 'Teams';
const GROUPS_SHEET_NAME = 'Groups';
const RELATIONSHIP_HISTORY_SHEET_NAME = 'RelationshipHistory';
const MATCH_HISTORY_SHEET_NAME = 'MatchHistory';

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

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
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

function findRowIndexById(sheet, id) {
  if (id === undefined || id === null) return -1;

  const headers = getHeaders(sheet);
  const idColumnIndex = getColumnIndex(headers, 'id');
  if (idColumnIndex === -1) return -1;

  const data = sheet.getDataRange().getValues();
  return data.findIndex((row, index) => index > 0 && String(row[idColumnIndex]) === String(id));
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

function getPlayersSheet() {
  const spreadsheet = getSpreadsheet();
  const playersSheet = spreadsheet.getSheetByName(PLAYERS_SHEET_NAME);
  if (playersSheet) {
    ensureSheetHeaders(playersSheet, PLAYERS_HEADERS);
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
  const teamsSheet = getOrCreateSheet(spreadsheet, TEAMS_SHEET_NAME, TEAMS_HEADERS);
  const groupsSheet = getOrCreateSheet(spreadsheet, GROUPS_SHEET_NAME, GROUPS_HEADERS);
  const relationshipHistorySheet = getOrCreateSheet(
    spreadsheet,
    RELATIONSHIP_HISTORY_SHEET_NAME,
    RELATIONSHIP_HISTORY_HEADERS,
  );
  const matchHistorySheet = getOrCreateSheet(spreadsheet, MATCH_HISTORY_SHEET_NAME, MATCH_HISTORY_HEADERS);

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

function readPlayers() {
  ensureSchema();
  const sheet = getPlayersSheet();
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

function migratePlayersSheetName() {
  const result = ensureSchema();
  const sheet = getPlayersSheet();
  return Object.assign({}, result, {
    ok: true,
    playersSheetName: sheet.getName(),
  });
}

function migrateSchema() {
  const result = ensureSchema();
  return Object.assign({}, result, {
    ok: true,
    action: 'migrateSchema',
  });
}

function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action ? e.parameter.action : 'read';

    if (action === 'read') {
      return jsonOutput(readPlayers());
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
    ensureSchema();
    const sheet = getPlayersSheet();
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'migratePlayersSheet') {
      return jsonOutput(migratePlayersSheetName());
    }

    if (action === 'migrateSchema') {
      return jsonOutput(migrateSchema());
    }

    const lowerBody = {};
    for (const key in body) {
      lowerBody[normalizeKey(key)] = body[key];
    }

    if (action === 'delete') {
      const idToDelete = body.id;
      const rowIndex = findRowIndexById(sheet, idToDelete);

      if (rowIndex !== -1) {
        sheet.deleteRow(rowIndex + 1);
        return textOutput('Deleted');
      }

      return textOutput('ID not found');
    }

    const headers = getHeaders(sheet);

    if (action === 'add') {
      const newRow = buildRowFromPayload(headers, lowerBody, null);
      sheet.appendRow(newRow);
      return textOutput('Added');
    }

    if (action === 'update') {
      const idToUpdate = body.id;
      const data = sheet.getDataRange().getValues();
      const rowIndex = findRowIndexById(sheet, idToUpdate);

      if (rowIndex !== -1) {
        const existingRow = data[rowIndex];
        const newRow = buildRowFromPayload(headers, lowerBody, existingRow);
        sheet.getRange(rowIndex + 1, 1, 1, newRow.length).setValues([newRow]);
        return textOutput('Updated');
      }

      return textOutput('ID not found for update');
    }

    return textOutput('Action unknown');
  } catch (err) {
    return textOutput('Error: ' + err.toString());
  }
}
