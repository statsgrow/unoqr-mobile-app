import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import vm from 'node:vm';

const require = createRequire(new URL('../package.json', import.meta.url));
const ts = require('typescript');

// Runs the actual coordinator against controllable downloads and persistent in-memory storage.
function harness() {
  const memory = new Map();
  const calls = [];
  const handlers = { cards: async () => true, scans: async () => true, qrcodes: async () => true };
  const restore = feature => async options => {
    calls.push(feature);
    return handlers[feature](options);
  };
  const modules = new Map();
  const mocks = {
    '@/utils/general/Storage': {
      getData: async ({ key }) => memory.get(key) ?? null,
      setData: async ({ key, value }) => { memory.set(key, value); },
      removeData: async ({ key }) => { memory.delete(key); }
    },
    '@/utils/auth/AppInstall': {
      insertAppInstall: async () => { calls.push('register'); return { id: 'install-id' }; },
      connectUserAppInstall: async () => { calls.push('link-install'); }
    },
    '@/helpers/scans/scanSync': {
      connectUserAppScans: async () => { calls.push('link-scans'); },
      restoreUserScans: restore('scans')
    },
    '@/helpers/qrcodes/QrSync': { restoreUserQrCodes: restore('qrcodes') },
    '@/helpers/digital_cards/utils/SyncDigitalCards': { restoreUserDigitalCards: restore('cards') }
  };
  const load = name => {
    if (mocks[name]) return mocks[name];
    if (!name.startsWith('@/')) return require(name);
    if (modules.has(name)) return modules.get(name).exports;
    const filename = new URL(`../src/${name.slice(2)}.ts`, import.meta.url);
    const module = { exports: {} };
    modules.set(name, module);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText;
    const factory = vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
      AbortController, Promise, Set, Map,
      process: { env: {} },
      console: { error() {} }
    }, { filename: filename.pathname });
    factory(load, module, module.exports);
    return module.exports;
  };
  const sync = load('@/utils/auth/PostLoginSync');
  const keys = load('@/settings').postLoginSyncSettings;
  return { sync, keys, memory, calls, handlers };
}

// Waits for observable async progress without depending on arbitrary timer delays.
async function until(predicate) {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (predicate()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.fail('Expected synchronization progress did not arrive');
}

test('anonymous use starts no account requests and releases the initial loading state', async () => {
  const h = harness();
  await h.sync.startPostLoginSync(null);
  assert.equal(h.sync.getPostLoginSyncState().checking, false);
  assert.equal(h.sync.getPostLoginSyncState().cards, null);
  assert.equal(h.memory.size, 0);
  assert.equal(h.calls.length, 0);
});

test('independent downloads proceed while cards are pending and scan ownership is linked first', async () => {
  const h = harness();
  let finishCards;
  h.handlers.cards = () => new Promise(resolve => { finishCards = resolve; });
  await h.sync.initializePostLoginSync();
  const running = h.sync.startPostLoginSync('alice');
  assert.equal(h.sync.startPostLoginSync('alice'), running);
  await until(() => h.sync.getPostLoginSyncState().scans === 'completed');
  assert.equal(h.sync.getPostLoginSyncState().cards, 'pending');
  assert.equal(h.memory.get(h.keys.qrcodes), 'completed');
  const scanSteps = h.calls.filter(call => ['register', 'link-install', 'link-scans', 'scans'].includes(call));
  assert.deepEqual(scanSteps, ['register', 'link-install', 'link-scans', 'scans']);
  finishCards(true);
  await running;
  for (const key of Object.values(h.keys)) assert.equal(h.memory.get(key), 'completed');
});

test('persisted completion skips all initial requests after an app restart, including empty accounts', async () => {
  const h = harness();
  for (const key of Object.values(h.keys)) h.memory.set(key, 'completed');
  await h.sync.startPostLoginSync('alice');
  assert.equal(h.calls.length, 0);
  assert.equal(h.sync.getPostLoginSyncState().cards, 'completed');
});

test('one failure preserves successful collections and only an explicit retry downloads it again', async () => {
  const h = harness();
  h.handlers.scans = async () => { throw new Error('Offline'); };
  await h.sync.startPostLoginSync('alice');
  assert.equal(h.memory.get(h.keys.scans), 'failed');
  assert.equal(h.memory.get(h.keys.cards), 'completed');
  assert.equal(h.memory.get(h.keys.qrcodes), 'completed');
  const previousCalls = h.calls.length;
  await h.sync.startPostLoginSync('alice');
  assert.equal(h.calls.length, previousCalls);
  h.handlers.scans = async () => true;
  await h.sync.retryPostLoginSync();
  assert.equal(h.calls.filter(call => call === 'scans').length, 2);
  assert.equal(h.calls.filter(call => call === 'cards').length, 1);
  assert.equal(h.calls.filter(call => call === 'qrcodes').length, 1);
  assert.equal(h.memory.get(h.keys.scans), 'completed');
});

test('restart resumes only pending collections and restores persistent failure state for the alert', async () => {
  const h = harness();
  h.memory.set(h.keys.cards, 'completed');
  h.memory.set(h.keys.scans, 'pending');
  h.memory.set(h.keys.qrcodes, 'failed');
  await h.sync.startPostLoginSync('alice');
  assert.equal(h.calls.includes('cards'), false);
  assert.equal(h.calls.includes('qrcodes'), false);
  assert.equal(h.calls.includes('scans'), true);
  assert.equal(h.sync.getPostLoginSyncState().qrcodes, 'failed');
});

test('account cleanup aborts active downloads, drains them, and removes every status before another login', async () => {
  const h = harness();
  h.handlers.cards = ({ signal }) => new Promise(resolve => {
    signal.addEventListener('abort', () => resolve(false), { once: true });
  });
  const running = h.sync.startPostLoginSync('alice');
  await until(() => h.calls.includes('cards'));
  await h.sync.pausePostLoginSync();
  await running;
  assert.equal(h.memory.get(h.keys.cards), 'pending');
  await h.sync.resetPostLoginSync();
  for (const key of Object.values(h.keys)) assert.equal(h.memory.has(key), false);
  const previousCalls = h.calls.length;
  await h.sync.startPostLoginSync('bob');
  assert.equal(h.calls.length, previousCalls);
  h.sync.resumePostLoginSync();
  h.handlers.cards = async () => true;
  await h.sync.initializePostLoginSync();
  await h.sync.startPostLoginSync('bob');
  for (const key of Object.values(h.keys)) assert.equal(h.memory.get(key), 'completed');
});

test('a restoration returning false remains a failure rather than being marked completed', async () => {
  const h = harness();
  h.handlers.qrcodes = async () => false;
  await h.sync.startPostLoginSync('alice');
  assert.equal(h.memory.get(h.keys.qrcodes), 'failed');
  assert.equal(h.memory.get(h.keys.cards), 'completed');
});
