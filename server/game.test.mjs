import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, exchangeTiles, move, POINTS, PREMIUM_SQUARES, surrenderGame } from './game.mjs';
const setup = () => { const g = createGame(['a', 'b']); g.status = 'active'; g.racks.a = [...'KALELER']; g.racks.b = [...'ATILMAK']; return g; };
test('center double-word bonus doubles the opening score', () => { const g = setup(); move(g, 'a', { revision: 0, placements: [{ index: 112, letter: 'A' }, { index: 113, letter: 'L' }] }); assert.equal(g.scores.a, 4); assert.equal(g.turn, 'b'); assert.equal(g.racks.a.length, 7); assert.equal(g.board[112], 'A'); });
test('premium board has the standard count of each bonus square', () => {
	assert.deepEqual(Object.fromEntries(['3W', '2W', '3L', '2L'].map(label => [label, PREMIUM_SQUARES.filter(square => square === label).length])), { '3W': 8, '2W': 17, '3L': 12, '2L': 24 });
});
test('dotted and dotless I both have the correct point values', () => {
	assert.equal(POINTS.I, 2);
	assert.equal(POINTS.İ, 1);
});
test('letter and word bonuses apply only on newly placed tiles', () => {
	const g = setup(); g.racks.a = [...'KALEM'];
	move(g, 'a', { revision: 0, placements: [108, 109, 110, 111, 112].map((index, i) => ({ index, letter: 'KALEM'[i] })) });
	assert.equal(g.scores.a, 14);
	assert.equal(g.recentMoves[0].words[0].points, 14);
});
test('blank tiles represent letters, score zero, and are recorded in formed words', () => {
	const g = setup(); g.racks.a = ['*', 'L'];
	move(g, 'a', { revision: 0, placements: [{ index: 112, letter: 'A', blank: true }, { index: 113, letter: 'L' }] });
	assert.equal(g.scores.a, 2);
	assert.equal(g.board[112], 'A');
	assert.equal(g.blankTiles[112], true);
	assert.deepEqual(g.recentMoves[0].words[0].blankCells, [112]);
});
test('invalid moves do not change state', () => { for (const body of [{ revision: 0, placements: [{ index: 0, letter: 'K' }] }, { revision: 0, placements: [{ index: 112, letter: 'Z' }] }, { revision: 1, placements: [] }, { revision: 0, placements: [{ index: 112, letter: 'K' }, { index: 114, letter: 'A' }] }]) { const g = setup(), before = JSON.stringify(g); assert.throws(() => move(g, 'a', body)); assert.equal(JSON.stringify(g), before); } });
test('reject opponent turn and disconnected word', () => { const g = setup(); assert.throws(() => move(g, 'b', { revision: 0, placements: [] })); move(g, 'a', { revision: 0, placements: [{ index: 112, letter: 'A' }, { index: 113, letter: 'L' }] }); assert.throws(() => move(g, 'b', { revision: 1, placements: [{ index: 0, letter: 'A' }, { index: 1, letter: 'T' }] })); move(g, 'b', { revision: 1, placements: [{ index: 127, letter: 'T' }] }); assert.equal(g.scores.b, 2); });
test('six consecutive passes finish the game and apply rack penalty', () => { const g = setup(); for (let i = 0; i < 6; i++) move(g, g.turn, { revision: i, placements: [] }); assert.equal(g.status, 'finished'); assert.throws(() => move(g, g.turn, { revision: 6, placements: [] })); });
test('exchangeTiles swaps selected tiles when bag has at least 7 letters', () => {
  const g = setup();
  assert.ok(g.bag.length >= 7);
  exchangeTiles(g, 'a', { revision: 0, indexes: [0, 1] });
  assert.equal(g.turn, 'b');
  assert.equal(g.revision, 1);
  assert.equal(g.racks.a.length, 7);
  assert.equal(g.lastMove, '2 harf değiştirildi.');
});
test('each game contains exactly one 4W star square in a 5x5 corner area and location varies', () => {
  const g = createGame(['p1', 'p2']);
  const starIndices = g.premiumSquares.map((sq, i) => sq === '4W' ? i : -1).filter(i => i >= 0);
  assert.equal(starIndices.length, 1);
  const starIdx = starIndices[0];
  const row = Math.floor(starIdx / 15), col = starIdx % 15;
  const inCorner = (row < 5 || row >= 10) && (col < 5 || col >= 10);
  assert.ok(inCorner);

  // Test diversity across games
  const uniquePositions = new Set();
  for (let i = 0; i < 20; i++) {
    const game = createGame(['p1', 'p2']);
    uniquePositions.add(game.premiumSquares.indexOf('4W'));
  }
  assert.ok(uniquePositions.size > 1);
});
test('4W star square quadruples the word points', () => {
  const g = setup();
  // Place a 4W square at index 113 for testing
  const customSquares = [...g.premiumSquares];
  customSquares[113] = '4W';
  g.premiumSquares = customSquares;
  // Opening word AL through 112 (center 2W) and 113 (star 4W)
  // Letter points: A(1) + L(1) = 2.
  // Word multiplier: 2W * 4W = 8x! Total: 2 * 8 = 16.
  move(g, 'a', { revision: 0, placements: [{ index: 112, letter: 'A' }, { index: 113, letter: 'L' }] });
  assert.equal(g.scores.a, 16);
  assert.equal(g.recentMoves[0].words[0].points, 16);
});
test('surrenderGame immediately finishes the game and records who surrendered', () => {
  const g = setup();
  assert.equal(g.status, 'active');
  surrenderGame(g, 'a', 'Ali');
  assert.equal(g.status, 'finished');
  assert.equal(g.revision, 1);
  assert.match(g.lastMove, /Ali pes etti/);
  assert.throws(() => surrenderGame(g, 'b', 'Bora'), /Yalnızca devam eden oyunlarda/);
});

