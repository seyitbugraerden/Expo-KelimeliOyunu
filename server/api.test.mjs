import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createGame } from './game.mjs';
test('two users invite, accept, play; private racks and authorization', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kelime-test-'));
  process.env.DATA_FILE = join(dir, 'data.json'); process.env.PORT = '0';
  const fixture = createGame(['fixture-a', 'fixture-b']); fixture.status = 'active'; fixture.racks['fixture-a'] = ['*', ...'ALERKL'];
  const cemGame = createGame(['fixture-a', 'fixture-b']); cemGame.status = 'active'; cemGame.board[112] = 'E'; cemGame.board[113] = 'M'; cemGame.racks['fixture-a'] = ['C'];
  const tdkServer = createServer((req, res) => {
    const word = new URL(req.url, 'http://localhost').searchParams.get('ara');
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(['cem', 'ka le', 'kale'].includes(word) ? [{ madde: word, ozel_mi: '0' }] : []));
  });
  tdkServer.listen(0, '127.0.0.1'); await new Promise(resolve => tdkServer.once('listening', resolve));
  process.env.TDK_LOOKUP_URL = `http://127.0.0.1:${tdkServer.address().port}/gts?ara=`;
  writeFileSync(process.env.DATA_FILE, JSON.stringify({ users: [{ id: 'fixture-a', name: 'Bir', token: 'fixture-token-a' }, { id: 'fixture-b', name: 'İki', token: 'fixture-token-b' }], games: [fixture, cemGame] }));
  const { server } = await import('./index.mjs');
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const req = async (path, token, body) => { const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: response.status, data: await response.json() }; };
  try {
    const a = (await req('/users', null, { name: 'Ayşe' })).data, b = (await req('/users', null, { name: 'Bora' })).data, c = (await req('/users', null, { name: 'Cem' })).data;
    assert.equal((await req('/state')).status, 401);
    assert.equal((await req('/computer', null, {})).status, 401);
    const solo = (await req('/computer', a.token, {})).data;
    const computerGame = solo.games.find(g => g.id === solo.gameId);
    assert.equal(computerGame.status, 'active'); assert.equal(computerGame.turn, a.user.id);
    assert.equal(computerGame.players[1].name, 'Bilgisayar'); assert.equal(computerGame.racks, undefined);
    assert.equal((await req('/computer', a.token, {})).data.gameId, solo.gameId);
    assert.equal((await req('/move', b.token, { gameId: solo.gameId, revision: 0, placements: [] })).status, 400);
    const reply = await req('/move', a.token, { gameId: solo.gameId, revision: 0, placements: [] });
    const updated = reply.data.games.find(g => g.id === solo.gameId);
    assert.equal(reply.status, 200); assert.equal(updated.revision, 2); assert.equal(updated.turn, a.user.id);
    assert.match(updated.lastMove, /^Bilgisayar:/);

    const invited = (await req('/invite', a.token, { userId: b.user.id })).data.games.find(g => !g.players.some(p => p.id === 'COMPUTER'));
    assert.equal(invited.status, 'pending'); assert.equal(invited.racks, undefined); assert.equal(invited.bag, undefined); assert.equal(invited.players[0].token, undefined);
    assert.equal((await req('/accept', a.token, { gameId: invited.id })).status, 400);
    assert.equal((await req('/move', c.token, { gameId: invited.id, revision: 0, placements: [] })).status, 400);
    const accepted = (await req('/accept', b.token, { gameId: invited.id })).data.games[0];
    assert.equal(accepted.status, 'active');
    const played = await req('/move', a.token, { gameId: invited.id, revision: accepted.revision, placements: [] });
    assert.equal(played.status, 200);
    const synced = (await req('/state', b.token)).data.games[0]; assert.equal(synced.revision, accepted.revision + 1); assert.equal(synced.turn, b.user.id);
    assert.equal((await req('/state', c.token)).data.games.length, 0);
    const invalid = await req('/move', 'fixture-token-a', { gameId: fixture.id, revision: 0, placements: [{ index: 112, letter: 'K' }, { index: 113, letter: 'A' }] });
    assert.equal(invalid.status, 400); assert.match(invalid.data.error, /TDK sözlüğünde/);
    const valid = await req('/move', 'fixture-token-a', { gameId: fixture.id, revision: 0, placements: [{ index: 112, letter: 'K', blank: true }, { index: 113, letter: 'A' }, { index: 114, letter: 'L' }, { index: 115, letter: 'E' }] });
    assert.equal(valid.status, 200);
    const opponent = (await req('/state', 'fixture-token-b')).data.games[0];
    assert.equal(opponent.board.slice(112, 116).join(''), 'KALE'); assert.equal(opponent.blankTiles[112], true); assert.equal(opponent.scores['fixture-a'], 6);
    assert.deepEqual(opponent.recentMoves[0].words, [{ word: 'KALE', cells: [112, 113, 114, 115], points: 6, blankCells: [112] }]);
    assert.equal(opponent.recentMoves[0].playerId, 'fixture-a');

    const beforePreview = JSON.stringify(cemGame);
    const preview = await req('/preview', 'fixture-token-a', { gameId: cemGame.id, revision: 0, placements: [{ index: 111, letter: 'C' }] });
    assert.equal(preview.status, 200);
    assert.deepEqual(preview.data.preview.words, [{ cells: [111, 112, 113], word: 'CEM', points: 7, blankCells: [] }]);
    assert.equal(JSON.stringify(cemGame), beforePreview);
    const playedCem = await req('/move', 'fixture-token-a', { gameId: cemGame.id, revision: 0, placements: [{ index: 111, letter: 'C' }] });
    assert.equal(playedCem.status, 200);
    assert.equal((await req('/state', 'fixture-token-b')).data.games.find(g => g.id === cemGame.id).board[111], 'C');

    assert.equal((await req('/move', a.token, { gameId: invited.id, revision: accepted.revision, placements: [] })).status, 400);
  } finally { await new Promise(resolve => server.close(resolve)); await new Promise(resolve => tdkServer.close(resolve)); rmSync(dir, { recursive: true, force: true }); }
});
