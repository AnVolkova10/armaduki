// Publishes apps-script/ (Code.gs + appsscript.json) to the production web app:
//
//   Code.gs tests -> clasp push -> new version -> temporary deployment -> probes
//   -> production moves to the new version -> probes -> temporary deployment deleted
//
// Production never moves if a probe fails on the temporary deployment, and goes back to the
// previous version if a probe fails after the move. The probes only read, plus one update of an
// id that cannot exist (it answers "ID not found for update" and writes nothing).
// Deployment and script ids are never printed.
//
//   npm run backend:release -- "what changed"   release
//   npm run backend:release -- --check          check the setup and show the production version; changes nothing
//
// Needs Node 22.18+ (it runs as TypeScript), `npx @google/clasp login` done once, and
// apps-script/.clasp.json (see apps-script/README.md).

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** The JSON shapes parsed below come from this clasp version. */
export const CLASP_PACKAGE = '@google/clasp@3.4.1';

const PROBE_ID = '__release_probe__';
const PROBE_TIMEOUT_MS = 60_000;
const PROBE_ATTEMPTS = 3;
const MAX_DESCRIPTION_LENGTH = 100;

export class ReleaseError extends Error {}

export interface Deployment {
  deploymentId: string;
  versionNumber?: number;
  description?: string;
}

export interface ReleaseDeps {
  /** Runs clasp with --json in apps-script/ and returns its stdout. */
  clasp(args: string[]): Promise<string>;
  fetch: typeof fetch;
  /** Throws when the Code.gs tests fail. */
  runBackendTests(): Promise<void>;
  /** Backend files with uncommitted changes. */
  dirtyBackendFiles(): Promise<string[]>;
  log(line: string): void;
  /** Waits between probe attempts. */
  sleep(ms: number): Promise<void>;
}

export interface ReleaseInput {
  /** Production web app URL (VITE_APPS_SCRIPT_URL). */
  productionUrl: string;
  description: string;
  checkOnly: boolean;
  allowDirty: boolean;
}

export interface ReleaseResult {
  status: 'checked' | 'released';
  productionVersion: number;
  previousVersion?: number;
}

// ---------------------------------------------------------------------------
// Parsing and masking
// ---------------------------------------------------------------------------

export function deploymentIdFromUrl(url: string): string {
  const match = /^https:\/\/script\.google\.com\/macros\/s\/([A-Za-z0-9_-]+)\/exec\/?$/.exec(url.trim());
  if (!match) {
    throw new ReleaseError('VITE_APPS_SCRIPT_URL must look like https://script.google.com/macros/s/<deployment id>/exec.');
  }
  return match[1];
}

const webAppUrl = (deploymentId: string) => `https://script.google.com/macros/s/${deploymentId}/exec`;

function parseJson(output: string, what: string): unknown {
  try {
    return JSON.parse(output);
  } catch {
    throw new ReleaseError(`Unexpected answer from clasp ${what} (not JSON).`);
  }
}

export function parseDeployments(output: string): Deployment[] {
  const value = parseJson(output, 'deployments');
  if (!Array.isArray(value)) throw new ReleaseError('Unexpected answer from clasp deployments.');
  return value.filter((item): item is Deployment => typeof item?.deploymentId === 'string');
}

function parseDeployment(output: string, what: string): Deployment | null {
  const value = parseJson(output, what) as Partial<Deployment> | null;
  return value && typeof value.deploymentId === 'string' && value.deploymentId ? (value as Deployment) : null;
}

function parseVersion(output: string): number {
  const value = parseJson(output, 'version') as { versionNumber?: unknown } | null;
  const version = Number(value?.versionNumber);
  if (!Number.isInteger(version) || version < 1) throw new ReleaseError('clasp version did not return a version number.');
  return version;
}

/** Hides ids in everything this script prints: known deployments by name, anything id-like by shape. */
export function createMasker() {
  const known = new Map<string, string>();
  const mask = (text: string) => {
    let out = text;
    for (const [id, name] of known) out = out.split(id).join(name);
    return out.replace(/AKfy[A-Za-z0-9_-]{20,}/g, '<deployment>').replace(/[A-Za-z0-9_-]{40,}/g, '<id>');
  };
  mask.add = (id: string, name: string) => {
    if (id) known.set(id, name);
  };
  return mask;
}

export function validateDescription(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) throw new ReleaseError('Add a short description: npm run backend:release -- "what changed"');
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new ReleaseError(`Keep the description under ${MAX_DESCRIPTION_LENGTH} characters.`);
  }
  if (!/^[\p{L}\p{N} .,:;()'/+_-]+$/u.test(trimmed)) {
    throw new ReleaseError('Use only letters, numbers, spaces and . , : ; ( ) \' / + _ - in the description.');
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// Probes
// ---------------------------------------------------------------------------

async function requestJson(deps: ReleaseDeps, url: string, init?: RequestInit): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= PROBE_ATTEMPTS; attempt++) {
    try {
      const response = await deps.fetch(url, { ...init, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      try {
        return JSON.parse(text);
      } catch {
        return text; // plain-text write answers
      }
    } catch (error) {
      lastError = error;
      if (attempt < PROBE_ATTEMPTS) await deps.sleep(5000 * attempt);
    }
  }
  throw new ReleaseError(`no answer (${lastError instanceof Error ? lastError.message : String(lastError)})`);
}

/** Read-only checks of a deployed web app. Returns a short summary without data. */
export async function probeWebApp(deps: ReleaseDeps, url: string): Promise<string> {
  const all = (await requestJson(deps, `${url}?action=readAll`)) as {
    players?: unknown;
    teams?: unknown;
    teamsError?: unknown;
    error?: unknown;
  };
  if (!all || !Array.isArray(all.players)) {
    throw new ReleaseError(`readAll did not return players${all?.error ? ` (${String(all.error)})` : ''}`);
  }
  if (!Array.isArray(all.teams) || all.teamsError) {
    throw new ReleaseError(`readAll did not return teams${all.teamsError ? ` (${String(all.teamsError)})` : ''}`);
  }

  const players = await requestJson(deps, `${url}?action=read`);
  if (!Array.isArray(players) || players.length !== all.players.length) {
    throw new ReleaseError('read and readAll disagree on the players');
  }

  const teams = await requestJson(deps, `${url}?action=readTeams`);
  if (!Array.isArray(teams)) throw new ReleaseError('readTeams did not return a list');

  const write = await requestJson(deps, url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'update', id: PROBE_ID }),
  });
  if (write !== 'ID not found for update') {
    throw new ReleaseError(`the write check answered "${String(write).slice(0, 80)}"`);
  }

  return `${all.players.length} players, ${all.teams.length} teams, writes answer`;
}

// ---------------------------------------------------------------------------
// Release
// ---------------------------------------------------------------------------

export async function release(input: ReleaseInput, deps: ReleaseDeps): Promise<ReleaseResult> {
  const mask = createMasker();
  const say = (line: string) => deps.log(mask(line));
  const productionId = deploymentIdFromUrl(input.productionUrl);
  mask.add(productionId, '<production>');

  const deployments = parseDeployments(await deps.clasp(['deployments']));
  const production = deployments.find((deployment) => deployment.deploymentId === productionId);
  if (!production) {
    throw new ReleaseError(
      'The URL in VITE_APPS_SCRIPT_URL is not a deployment of the script in apps-script/.clasp.json. Nothing changed.',
    );
  }
  const previousVersion = production.versionNumber;
  if (previousVersion === undefined) {
    throw new ReleaseError('Production points at @HEAD instead of a version. Nothing changed.');
  }
  say(`Production is on version ${previousVersion}. Deployments in the script: ${deployments.length}.`);

  const dirty = await deps.dirtyBackendFiles();
  if (input.checkOnly) {
    if (dirty.length > 0) say(`Uncommitted backend changes: ${dirty.join(', ')}.`);
    say('Check only: nothing changed.');
    return { status: 'checked', productionVersion: previousVersion };
  }
  if (dirty.length > 0 && !input.allowDirty) {
    throw new ReleaseError(
      `Commit the backend first (${dirty.join(', ')}), so what is published is in git. Or pass --allow-dirty. Nothing changed.`,
    );
  }

  const description = validateDescription(input.description);
  say('Running the Code.gs tests...');
  await deps.runBackendTests();

  await deps.clasp(['push', '--force']);
  const version = parseVersion(await deps.clasp(['version', description]));
  say(`Pushed the files and created version ${version}.`);

  const temporary = parseDeployment(
    await deps.clasp(['deploy', '-V', String(version), '-d', `release check ${version}`]),
    'deploy',
  );
  if (!temporary) {
    throw new ReleaseError(
      'Could not read the temporary deployment. Production did not change and nothing was deleted; see `npx @google/clasp deployments`.',
    );
  }
  if (temporary.deploymentId === productionId) {
    throw new ReleaseError('The temporary deployment came back with the production id. Stopping; nothing was deleted.');
  }
  mask.add(temporary.deploymentId, '<temporary>');

  try {
    if (temporary.versionNumber !== version) {
      throw new ReleaseError(`The temporary deployment is on version ${temporary.versionNumber}, not ${version}.`);
    }

    say('Checking the temporary deployment...');
    try {
      say(`Temporary deployment OK: ${await probeWebApp(deps, webAppUrl(temporary.deploymentId))}.`);
    } catch (error) {
      throw new ReleaseError(`Temporary deployment check failed: ${errorText(error)}. Production did not change.`);
    }

    let moved: Deployment | null = null;
    try {
      moved = parseDeployment(
        await deps.clasp(['redeploy', productionId, '-V', String(version), '-d', description]),
        'redeploy',
      );
      if (moved?.versionNumber !== version) {
        throw new ReleaseError(`production answered version ${moved?.versionNumber ?? 'unknown'}`);
      }
      say(`Production moved to version ${version}. Checking it...`);
      say(`Production OK: ${await probeWebApp(deps, input.productionUrl)}.`);
    } catch (error) {
      say(`Problem after moving production (${errorText(error)}). Going back to version ${previousVersion}...`);
      try {
        const back = parseDeployment(
          await deps.clasp(['redeploy', productionId, '-V', String(previousVersion), '-d', `rollback from ${version}`]),
          'redeploy',
        );
        if (back?.versionNumber !== previousVersion) throw new ReleaseError(`answered version ${back?.versionNumber ?? 'unknown'}`);
      } catch (rollbackError) {
        throw new ReleaseError(
          `Release failed and the rollback did too (${errorText(rollbackError)}). Production may be on version ${version}: ` +
            `run npx @google/clasp deployments and npx @google/clasp redeploy <production id> -V ${previousVersion}.`,
        );
      }
      throw new ReleaseError(`Release failed; production is back on version ${previousVersion}.`);
    }

    say(`Done: production is on version ${version} (was ${previousVersion}). Rollback: npx @google/clasp redeploy <production id> -V ${previousVersion}`);
    return { status: 'released', productionVersion: version, previousVersion };
  } finally {
    try {
      await deps.clasp(['undeploy', temporary.deploymentId]);
      say('Temporary deployment deleted.');
    } catch (error) {
      say(`Could not delete the temporary deployment (${errorText(error)}). Delete it by hand: npx @google/clasp deployments, then undeploy the one called "release check ${version}".`);
    }
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = path.join(projectRoot, 'apps-script');

function run(command: string, args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // No shell: arguments reach the program as they are, whatever the description contains.
    const child = spawn(command, args, { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function readProductionUrl(): string {
  if (process.env.VITE_APPS_SCRIPT_URL) return process.env.VITE_APPS_SCRIPT_URL;
  const envFile = path.join(projectRoot, '.env');
  const env = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
  const match = /^\s*VITE_APPS_SCRIPT_URL\s*=\s*["']?([^"'\r\n]+)["']?\s*$/m.exec(env);
  if (!match) throw new ReleaseError('Set VITE_APPS_SCRIPT_URL in .env (the production web app URL).');
  return match[1];
}

function createRealDeps(): ReleaseDeps {
  const npmCli = process.env.npm_execpath ?? '';
  if (!/npm-cli\.js$/.test(npmCli)) {
    throw new ReleaseError('Run it through npm: npm run backend:release -- "what changed" (or -- --check).');
  }
  const npxCli = path.join(path.dirname(npmCli), 'npx-cli.js');
  if (!fs.existsSync(path.join(backendDir, '.clasp.json'))) {
    throw new ReleaseError('Missing apps-script/.clasp.json; see the one-time setup in apps-script/README.md.');
  }

  return {
    clasp: async (args) => {
      const result = await run(process.execPath, [npxCli, '--yes', CLASP_PACKAGE, '--json', ...args], backendDir);
      if (result.code !== 0) {
        throw new ReleaseError(`clasp ${args[0]} failed: ${(result.stderr || result.stdout).trim().slice(0, 400)}`);
      }
      return result.stdout;
    },
    fetch: globalThis.fetch,
    runBackendTests: async () => {
      const result = await run(process.execPath, ['--test', 'tests/appsScript.test.ts'], projectRoot);
      if (result.code !== 0) {
        throw new ReleaseError(`Code.gs tests failed; nothing changed.\n${result.stdout.slice(-1500)}`);
      }
    },
    dirtyBackendFiles: async () => {
      const result = await run('git', ['status', '--porcelain', '--', 'apps-script/Code.gs', 'apps-script/appsscript.json'], projectRoot);
      if (result.code !== 0) return [];
      return result.stdout
        .split('\n')
        .map((line) => line.slice(3).trim())
        .filter(Boolean);
    },
    log: (line) => console.log(line),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const allowDirty = args.includes('--allow-dirty');
  const description = args.filter((arg) => !arg.startsWith('--')).join(' ');
  const mask = createMasker();

  try {
    await release({ productionUrl: readProductionUrl(), description, checkOnly, allowDirty }, createRealDeps());
  } catch (error) {
    console.error(mask(error instanceof ReleaseError ? error.message : `Unexpected error: ${errorText(error)}`));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  void main();
}
