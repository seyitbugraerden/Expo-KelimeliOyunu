import test from 'node:test';
import assert from 'node:assert/strict';
import { isTDKWord } from './tdk.mjs';

test('TDK validation accepts exact public headwords and rejects missing or proper-name entries', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    const word = new URL(url).searchParams.get('ara');
    const entries = word === 'cem' ? [{ madde: 'cem', ozel_mi: '0' }] : word === 'ankara' ? [{ madde: 'ankara', ozel_mi: '1' }] : [];
    return new Response(JSON.stringify(entries), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    assert.equal(await isTDKWord('CEM'), true);
    assert.equal(await isTDKWord('cem'), true);
    assert.equal(await isTDKWord('ANKARA'), false);
    assert.equal(await isTDKWord('ZZZ'), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('TDK validation fails closed when the official dictionary is unreachable', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw Error('offline'); };
  try {
    await assert.rejects(isTDKWord('QWERTY'), /TDK sözlüğüne ulaşılamıyor/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
