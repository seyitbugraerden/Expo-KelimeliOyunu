import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, move, POINTS, PREMIUM_SQUARES } from './game.mjs';
const setup = () => { const g = createGame(['a', 'b']); g.status = 'active'; g.racks.a = [...'KALELER']; g.racks.b = [...'ATILMAK']; return g; };
test('center double-word bonus doubles the opening score', () => { const g = setup(); move(g, 'a', { revision: 0, placements: [{ index: 112, letter: 'A' }, { index: 113, letter: 'L' }] }); assert.equal(g.scores.a, 4); assert.equal(g.turn, 'b'); assert.equal(g.racks.a.length, 7); assert.equal(g.board[112], 'A'); });
test('premium board has the standard count of each bonus square', () => {
	assert.deepEqual(Object.fromEntries(['3W', '2W', '3L', '2L'].map(label => [label, PREMIUM_SQUARES.filter(square => square === label).length])), { '3W': 8, '2W': 17, '3L': 12, '2L': 24 });
});
test('dotted and dotless I both have the correct single point value', () => {
	assert.equal(POINTS.I, 1);
	assert.equal(POINTS.İ, 1);
});
test('letter and word bonuses apply only on newly placed tiles', () => {
	const g = setup(); g.racks.a = [...'KALEM'];
	move(g, 'a', { revision: 0, placements: [108, 109, 110, 111, 112].map((index, i) => ({ index, letter: 'KALEM'[i] })) });
	assert.equal(g.scores.a, 12);
	assert.equal(g.recentMoves[0].words[0].points, 12);
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
test('four consecutive passes finish the game', () => { const g = setup(); for (let i = 0; i < 4; i++) move(g, g.turn, { revision: i, placements: [] }); assert.equal(g.status, 'finished'); assert.throws(() => move(g, g.turn, { revision: 4, placements: [] })); });
