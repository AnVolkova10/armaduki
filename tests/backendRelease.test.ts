// scripts/backend-release.ts with a fake clasp and a fake web app: no Google calls.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMasker,
  deploymentIdFromUrl,
  release,
  ReleaseError,
  validateDescription,
  type Deployment,
  type ReleaseDeps,
  type ReleaseInput,
} from '../scripts/backend-release.ts';

const PROD_ID = 'AKfycbPRODUCTIONxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const TEMP_ID = 'AKfycbTEMPORARYxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const PROD_URL = `https://script.google.com/macros/s/${PROD_ID}/exec`;
const TEMP_URL = `https://script.google.com/macros/s/${TEMP_ID}/exec`;

interface FakeOptions {
  /** Web apps that answer badly: 'temp' or 'prod' (prod only once it is on the new version). */
  broken?: 'temp' | 'prod';
  deployAnswer?: Partial<Deployment> | null;
  redeployVersionOverride?: number;
  dirty?: string[];
  testsFail?: boolean;
}

function fakeDeps(options: FakeOptions = {}) {
  const calls: string[][] = [];
  const logs: string[] = [];
  const deployments: Deployment[] = [
    { deploymentId: 'AKfycbHEADxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
    { deploymentId: PROD_ID, versionNumber: 19, description: 'Review nov 2026' },
  ];
  let nextVersion = 20;

  const clasp = async (args: string[]) => {
    calls.push(args);
    const [command] = args;
    if (command === 'deployments') return JSON.stringify(deployments);
    if (command === 'push') return JSON.stringify(['Code.gs', 'appsscript.json']);
    if (command === 'version') return JSON.stringify({ versionNumber: nextVersion++ });
    if (command === 'deploy') {
      const answer =
        options.deployAnswer !== undefined
          ? options.deployAnswer
          : { deploymentId: TEMP_ID, versionNumber: Number(args[2]), description: args[4] };
      if (answer?.deploymentId) deployments.push(answer as Deployment);
      return JSON.stringify(answer);
    }
    if (command === 'redeploy') {
      const target = deployments.find((d) => d.deploymentId === args[1]);
      if (!target) throw new ReleaseError('no such deployment');
      target.versionNumber = Number(args[3]);
      return JSON.stringify({ ...target, versionNumber: options.redeployVersionOverride ?? target.versionNumber });
    }
    if (command === 'undeploy') {
      const index = deployments.findIndex((d) => d.deploymentId === args[1]);
      if (index !== -1) deployments.splice(index, 1);
      return JSON.stringify({ deletedDeploymentIds: [args[1]] });
    }
    throw new Error(`unexpected clasp ${command}`);
  };

  const production = () => deployments.find((d) => d.deploymentId === PROD_ID)!;
  const isBroken = (url: string) =>
    (options.broken === 'temp' && url.startsWith(TEMP_URL)) ||
    (options.broken === 'prod' && url.startsWith(PROD_URL) && production().versionNumber !== 19);

  const fakeFetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    if (!url.startsWith(PROD_URL) && !url.startsWith(TEMP_URL)) throw new Error(`unexpected fetch ${url}`);
    if (isBroken(url)) return new Response('<html>Script function not found</html>');
    if (init.method === 'POST') return new Response('ID not found for update');
    const action = new URL(url).searchParams.get('action');
    const players = [{ id: 1 }, { id: 2 }];
    if (action === 'readAll') return new Response(JSON.stringify({ players, teams: [{ teamId: 'a' }] }));
    if (action === 'read') return new Response(JSON.stringify(players));
    if (action === 'readTeams') return new Response(JSON.stringify([{ teamId: 'a' }]));
    return new Response(JSON.stringify({ error: 'Action unknown' }));
  }) as typeof fetch;

  const deps: ReleaseDeps = {
    clasp,
    fetch: fakeFetch,
    runBackendTests: async () => {
      if (options.testsFail) throw new ReleaseError('Code.gs tests failed; nothing changed.');
    },
    dirtyBackendFiles: async () => options.dirty ?? [],
    log: (line) => logs.push(line),
    sleep: async () => {},
  };
  return { deps, calls, logs, deployments, production };
}

const input = (patch: Partial<ReleaseInput> = {}): ReleaseInput => ({
  productionUrl: PROD_URL,
  description: 'readAll',
  checkOnly: false,
  allowDirty: false,
  ...patch,
});
const commands = (calls: string[][]) => calls.map((args) => args[0]);
const noIdsIn = (logs: string[]) => logs.every((line) => !line.includes('AKfy'));

test('a release goes test, push, version, temporary check, production, check, cleanup', async () => {
  const fake = fakeDeps();
  const result = await release(input(), fake.deps);

  assert.deepEqual(result, { status: 'released', productionVersion: 20, previousVersion: 19 });
  assert.deepEqual(commands(fake.calls), ['deployments', 'push', 'version', 'deploy', 'redeploy', 'undeploy']);
  assert.deepEqual(fake.calls[1], ['push', '--force'], 'the manifest in the repo always wins');
  assert.deepEqual(fake.calls[4], ['redeploy', PROD_ID, '-V', '20', '-d', 'readAll']);
  assert.deepEqual(fake.calls[5], ['undeploy', TEMP_ID], 'only the temporary deployment is deleted');
  assert.equal(fake.production().versionNumber, 20);
  assert.equal(fake.deployments.length, 2, 'production and @HEAD are left');
  assert.ok(noIdsIn(fake.logs), 'no deployment id is printed');
  assert.match(fake.logs.join('\n'), /Temporary deployment OK: 2 players, 1 teams/);
});

test('--check only reads the deployments and changes nothing', async () => {
  const fake = fakeDeps({ dirty: ['apps-script/Code.gs'] });
  const result = await release(input({ checkOnly: true, description: '' }), fake.deps);

  assert.deepEqual(result, { status: 'checked', productionVersion: 19 });
  assert.deepEqual(commands(fake.calls), ['deployments']);
  assert.match(fake.logs.join('\n'), /Production is on version 19[\s\S]*Uncommitted backend changes: apps-script\/Code.gs/);
  assert.ok(noIdsIn(fake.logs));
});

test('a failing check on the temporary deployment leaves production alone and deletes only the temporary one', async () => {
  const fake = fakeDeps({ broken: 'temp' });
  await assert.rejects(release(input(), fake.deps), /Temporary deployment check failed.*Production did not change/);

  assert.deepEqual(commands(fake.calls), ['deployments', 'push', 'version', 'deploy', 'undeploy']);
  assert.deepEqual(fake.calls.at(-1), ['undeploy', TEMP_ID]);
  assert.equal(fake.production().versionNumber, 19);
});

test('a failing check after moving production puts the previous version back', async () => {
  const fake = fakeDeps({ broken: 'prod' });
  await assert.rejects(release(input(), fake.deps), /production is back on version 19/);

  assert.deepEqual(commands(fake.calls), ['deployments', 'push', 'version', 'deploy', 'redeploy', 'redeploy', 'undeploy']);
  assert.deepEqual(fake.calls[5].slice(0, 4), ['redeploy', PROD_ID, '-V', '19']);
  assert.equal(fake.production().versionNumber, 19);
});

test('if production answers another version, it goes back too', async () => {
  const fake = fakeDeps({ redeployVersionOverride: 7 });
  await assert.rejects(release(input(), fake.deps), /Release failed and the rollback did too|back on version 19/);
  assert.equal(commands(fake.calls).filter((c) => c === 'redeploy').length, 2);
});

test('when the temporary deployment cannot be read, nothing is deleted', async () => {
  const fake = fakeDeps({ deployAnswer: null });
  await assert.rejects(release(input(), fake.deps), /Could not read the temporary deployment.*nothing was deleted/);
  assert.ok(!commands(fake.calls).includes('undeploy'));
  assert.ok(!commands(fake.calls).includes('redeploy'));
});

test('a temporary deployment with the production id is never deleted', async () => {
  const fake = fakeDeps({ deployAnswer: { deploymentId: PROD_ID, versionNumber: 20 } });
  await assert.rejects(release(input(), fake.deps), /production id\. Stopping; nothing was deleted/);
  assert.ok(!commands(fake.calls).includes('undeploy'));
  assert.ok(!commands(fake.calls).includes('redeploy'));
});

test('uncommitted backend changes, failing tests or a bad description stop it before any change', async () => {
  const dirty = fakeDeps({ dirty: ['apps-script/Code.gs'] });
  await assert.rejects(release(input(), dirty.deps), /Commit the backend first/);
  assert.deepEqual(commands(dirty.calls), ['deployments']);

  const failing = fakeDeps({ testsFail: true });
  await assert.rejects(release(input(), failing.deps), /Code.gs tests failed/);
  assert.deepEqual(commands(failing.calls), ['deployments']);

  const quoted = fakeDeps();
  await assert.rejects(release(input({ description: 'oops" & del' }), quoted.deps), /Use only letters/);
  assert.deepEqual(commands(quoted.calls), ['deployments']);

  const allowed = fakeDeps({ dirty: ['apps-script/Code.gs'] });
  assert.equal((await release(input({ allowDirty: true }), allowed.deps)).status, 'released');
});

test('a URL that is not a deployment of this script stops it', async () => {
  const fake = fakeDeps();
  const other = 'https://script.google.com/macros/s/AKfycbOTHERxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec';
  await assert.rejects(release(input({ productionUrl: other }), fake.deps), /not a deployment of the script/);
  assert.deepEqual(commands(fake.calls), ['deployments']);
  assert.throws(() => deploymentIdFromUrl('https://example.com/exec'), /must look like/);
});

test('descriptions and masking', () => {
  assert.equal(validateDescription('  readAll: una sola lectura (v20)  '), 'readAll: una sola lectura (v20)');
  assert.throws(() => validateDescription('   '), /Add a short description/);
  assert.throws(() => validateDescription('a%PATH%b'), /Use only letters/);

  const mask = createMasker();
  mask.add(PROD_ID, '<production>');
  assert.equal(mask(`moved ${PROD_ID} and AKfycbSOMETHINGELSExxxxxxxxxxxx`), 'moved <production> and <deployment>');
  assert.equal(mask('script 1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV2wX3yZ4aB5cD6'), 'script <id>');
});
