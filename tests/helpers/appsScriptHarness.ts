// Runs apps-script/Code.gs in Node: a vm context with in-memory sheets and small stand-ins for
// the Apps Script services it uses. Each loadAppsScript() call is one Apps Script execution
// (globals do not survive between real requests either).
import fs from 'node:fs';
import vm from 'node:vm';

export type Cell = string | number | boolean | Date;
export type Row = Cell[];

// Like Google Sheets: text that looks like a date is stored as a date ("1994-03" becomes 1 March
// 1994), unless it starts with an apostrophe, which keeps it as text and is not stored. The
// date is noon UTC, so any time zone reads the same day back.
const DATE_LIKE = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$|^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/;

export function storeCell(value: Cell): Cell {
  if (typeof value !== 'string') return value;
  if (value.startsWith("'")) return value.slice(1);
  const match = DATE_LIKE.exec(value.trim());
  if (!match) return value;
  const [, isoYear, isoMonth, isoDay, day, month, year] = match;
  return isoYear
    ? new Date(Date.UTC(Number(isoYear), Number(isoMonth) - 1, Number(isoDay ?? 1), 12))
    : new Date(Date.UTC(Number(year ?? 2026), Number(month) - 1, Number(day), 12));
}

export interface MemoryRange {
  getValues(): Row[];
  setValues(values: Row[]): void;
}

export interface MemorySheet {
  /** Spreadsheet calls made on this sheet, to check the schema cache. */
  calls: number;
  getName(): string;
  setName(name: string): void;
  getLastColumn(): number;
  getRange(row: number, column: number, numRows: number, numColumns: number): MemoryRange;
  getDataRange(): { getValues(): Row[] };
  appendRow(row: Row): void;
  deleteRow(index: number): void;
  /** Every row, header included. */
  data(): Row[];
  /** Data rows as { header: value } objects. */
  records(): Record<string, Cell>[];
}

export function createSheet(name: string, rows: Row[] = []): MemorySheet {
  let data = rows.map((row) => [...row]);
  const width = () => data.reduce((max, row) => Math.max(max, row.length), 0);
  const pad = () => {
    const w = width();
    data = data.map((row) => [...row, ...Array<Cell>(w - row.length).fill('')]);
  };

  const sheet: MemorySheet = {
    calls: 0,
    getName: () => name,
    setName: (newName) => {
      name = newName;
    },
    getLastColumn: () => {
      sheet.calls++;
      return width();
    },
    getRange: (row, column, numRows, numColumns) => {
      sheet.calls++;
      return {
        getValues: () =>
          Array.from({ length: numRows }, (_, r) =>
            Array.from({ length: numColumns }, (_, c) => (data[row - 1 + r] ?? [])[column - 1 + c] ?? ''),
          ),
        setValues: (values) => {
          for (let r = 0; r < numRows; r++) {
            while (data.length < row + r) data.push([]);
            for (let c = 0; c < numColumns; c++) data[row - 1 + r][column - 1 + c] = storeCell(values[r][c]);
          }
          pad();
        },
      };
    },
    getDataRange: () => {
      sheet.calls++;
      return { getValues: () => (data.length === 0 ? [['']] : data.map((row) => [...row])) };
    },
    appendRow: (row) => {
      sheet.calls++;
      data.push(row.map(storeCell));
      pad();
    },
    deleteRow: (index) => {
      sheet.calls++;
      data.splice(index - 1, 1);
    },
    data: () => data,
    records: () => {
      const [headers = [], ...rest] = data;
      return rest.map((row) => Object.fromEntries(headers.map((header, i) => [String(header), row[i]])));
    },
  };
  return sheet;
}

interface TextOutput {
  content: string;
  mime: string;
}

export interface AppsScriptEnv {
  doGet(event: { parameter: Record<string, string> }): TextOutput;
  doPost(event: { postData: { contents: string } }): TextOutput;
  sheet(name: string): MemorySheet | null;
  lockEvents: string[];
  openedIds: string[];
  /** Sets or clears the ACCESS_KEY script property. */
  setAccessKey(key: string | null): void;
}

const CODE_GS = fs.readFileSync(new URL('../../apps-script/Code.gs', import.meta.url), 'utf8');

export function loadAppsScript(
  sheets: MemorySheet[],
  {
    spreadsheetId = 'test-sheet-id',
    accessKey = null,
    source = CODE_GS,
    timeZone = 'America/Argentina/Buenos_Aires',
    cacheEntries = {},
  }: {
    spreadsheetId?: string | null;
    accessKey?: string | null;
    source?: string;
    /** The spreadsheet's own time zone (File > Settings). */
    timeZone?: string;
    /** Script cache contents left by earlier requests. */
    cacheEntries?: Record<string, string>;
  } = {},
): AppsScriptEnv {
  const all = [...sheets];
  const spreadsheet = {
    getSheetByName: (name: string) => all.find((sheet) => sheet.getName() === name) ?? null,
    insertSheet: (name: string) => {
      if (spreadsheet.getSheetByName(name)) throw new Error(`A sheet with the name "${name}" already exists.`);
      const sheet = createSheet(name);
      all.push(sheet);
      return sheet;
    },
    getSpreadsheetTimeZone: () => timeZone,
  };
  const cache = new Map<string, string>(Object.entries(cacheEntries));
  // Mutable, like editing the script property while the app is in use.
  const properties = { accessKey };
  const lockEvents: string[] = [];
  const openedIds: string[] = [];

  const context: Record<string, unknown> = {
    SpreadsheetApp: {
      openById: (id: string) => {
        openedIds.push(id);
        return spreadsheet;
      },
    },
    ContentService: {
      MimeType: { JSON: 'JSON' },
      createTextOutput: (content: string) => ({
        content,
        mime: 'TEXT',
        setMimeType(this: TextOutput, mime: string) {
          this.mime = mime;
          return this;
        },
      }),
    },
    LockService: {
      getScriptLock: () => ({
        waitLock: () => lockEvents.push('lock'),
        releaseLock: () => lockEvents.push('unlock'),
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key: string) =>
          key === 'SPREADSHEET_ID' ? spreadsheetId : key === 'ACCESS_KEY' ? properties.accessKey : null,
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (key: string) => cache.get(key) ?? null,
        put: (key: string, value: string) => cache.set(key, value),
      }),
    },
    Utilities: {
      formatDate: (date: Date, zone: string, pattern: string) => {
        if (pattern !== 'yyyy-MM-dd') throw new Error(`formatDate pattern not in the stand-in: ${pattern}`);
        // en-CA writes dates as yyyy-mm-dd.
        return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  return {
    doGet: context.doGet as AppsScriptEnv['doGet'],
    doPost: context.doPost as AppsScriptEnv['doPost'],
    sheet: (name) => spreadsheet.getSheetByName(name),
    lockEvents,
    openedIds,
    setAccessKey: (key) => {
      properties.accessKey = key;
    },
  };
}

/** GET like the web app URL: `?action=...`. JSON answers come back parsed. */
export function get(env: AppsScriptEnv, action?: string, key?: string): unknown {
  const out = env.doGet({ parameter: { ...(action ? { action } : {}), ...(key === undefined ? {} : { key }) } });
  return out.mime === 'JSON' ? JSON.parse(out.content) : out.content;
}

/** POST with a JSON body, like the app's writes. Returns the plain-text answer. */
export function post(env: AppsScriptEnv, body: unknown): string {
  return env.doPost({ postData: { contents: JSON.stringify(body) } }).content;
}

export const LEGACY_PLAYER_HEADERS = [
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
];

export const TEAM_HEADERS = ['teamId', 'name', 'color1', 'color2', 'crest'];
