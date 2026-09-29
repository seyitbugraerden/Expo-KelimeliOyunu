import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidWord, dictionary } from './dictionary.mjs';
import { createGame, move } from './game.mjs';
test('headwords, Turkish casing, proper nouns, abbreviations and unknown inflections', () => {
  assert.ok(dictionary.size > 20000);
  for (const word of ['KALE', 'kitap', 'İNCİ', 'ışık', 'hâl', 'AL', 'AT']) assert.ok(isValidWord(word), word);
  for (const word of ['ZZZ', 'ANKARA', 'TBMM', 'KALELERİMİZDEN', 'KA', 'İKİ KELİME']) assert.equal(isValidWord(word), false, word);
});
test('invalid main word leaves every game field untouched', () => {
  const g = createGame(['a', 'b']); g.status = 'active'; g.racks.a = ['Z', 'Z', 'Z'];
  const before = JSON.stringify(g);
  assert.throws(() => move(g, 'a', { revision: 0, placements: [{ index: 112, letter: 'Z' }, { index: 113, letter: 'Z' }] }), /Sözlükte/);
  assert.equal(JSON.stringify(g), before);
});
test('valid main word with invalid cross word is rejected atomically', () => {
  const g = createGame(['a', 'b']); g.status = 'active'; g.board[97] = 'Z'; g.racks.a = ['A', 'L'];
  const before = JSON.stringify(g);
  assert.throws(() => move(g, 'a', { revision: 0, placements: [{ index: 112, letter: 'A' }, { index: 113, letter: 'L' }] }), /ZA/);
  assert.equal(JSON.stringify(g), before);
});
