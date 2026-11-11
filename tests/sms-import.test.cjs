'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createSmsImport } = require('../sms-import.js');

function memoryStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    snapshot() { return Object.fromEntries(data); }
  };
}
const high = (fingerprint, overrides = {}) => ({
  confidence: 'high', fingerprint, amount: 125, type: 'Expense',
  date: '2026-11-11', description: 'UPI - SWIGGY', category: 'Food',
  account: 'UPI', bankName: 'HDFC', accountLast4: '1234', ...overrides
});
const low = (fingerprint) => high(fingerprint, {
  confidence: 'low', description: '', category: 'Other'
});

test('sms-import.js passes Node syntax validation', () => {
  const { execFileSync } = require('node:child_process');
  assert.equal(execFileSync(process.execPath, ['--check', require.resolve('../sms-import.js')], { encoding: 'utf8' }), '');
});

test('imports high-confidence entries through the app bridge once per batch', () => {
  const storage = memoryStorage();
  const calls = [];
  const importer = createSmsImport({ storage, bridge: { addBatch(items) { calls.push(items); return items.length; } } });
  const result = importer.addParsedSmsTransactions([high('fp-1'), high('fp-2')]);
  assert.equal(result.added, 2);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].map(x => x.fingerprint), ['fp-1', 'fp-2']);
  assert.equal(calls[0][0].account, 'HDFC ••1234');
});

test('skips fingerprints already processed across calls and reloads', () => {
  const storage = memoryStorage();
  let count = 0;
  const bridge = { addBatch(items) { count += items.length; return items.length; } };
  createSmsImport({ storage, bridge }).addParsedSmsTransactions([high('same-fp')]);
  createSmsImport({ storage, bridge }).addParsedSmsTransactions([high('same-fp')]);
  assert.equal(count, 1);
});

test('low-confidence entries go to Needs review and never reach transaction bridge', () => {
  const storage = memoryStorage();
  let called = false;
  const importer = createSmsImport({ storage, bridge: { addBatch() { called = true; return 0; } } });
  const result = importer.addParsedSmsTransactions([low('review-fp')]);
  assert.equal(result.review, 1);
  assert.equal(called, false);
  assert.equal(JSON.parse(storage.getItem('moneyManagerSmsNeedsReview.v1')).length, 1);
});

test('does not read or overwrite the existing Money Manager transaction database', () => {
  const original = JSON.stringify({ transactions: [{ id: 'manual-1', amount: 999 }] });
  const storage = memoryStorage({ 'moneyManagerIndia.v2': original });
  const importer = createSmsImport({ storage, bridge: { addBatch(items) { return items.length; } } });
  importer.addParsedSmsTransactions([high('new-fp')]);
  assert.equal(storage.getItem('moneyManagerIndia.v2'), original);
});

test('invalid category is normalized to Other before calling the app bridge', () => {
  const storage = memoryStorage();
  let received;
  const importer = createSmsImport({ storage, bridge: { addBatch(items) { received = items; return items.length; } } });
  importer.addParsedSmsTransactions([high('category-fp', { category: 'Unrecognised category' })]);
  assert.equal(received[0].category, 'Other');
});
