import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { commitMove, createGame, PREMIUM_SQUARES, previewMove, exchangeTiles, surrenderGame } from './game.mjs';
import { BOT_ID, playBotTurn } from './bot.mjs';
import { isTDKWord } from './tdk.mjs';
const path = process.env.DATA_FILE || fileURLToPath(new URL('./data.json', import.meta.url));
const state = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { users: [], games: [] };
const save = () => { writeFileSync(`${path}.tmp`, JSON.stringify(state), { mode: 0o600 }); renameSync(`${path}.tmp`, path); };
const publicUser = u => ({ id: u.id, name: u.name });
function snapshot(user) {
  return { user: publicUser(user), games: state.games.filter(g => g.players.includes(user.id)).map(g => ({ id: g.id, players: g.players.map(id => publicUser(id === BOT_ID ? { id: BOT_ID, name: 'Bilgisayar' } : state.users.find(u => u.id === id))), status: g.status, board: g.board, blankTiles: g.blankTiles || Array(225).fill(false), premiumSquares: g.premiumSquares || PREMIUM_SQUARES, rack: g.racks[user.id], scores: g.scores, turn: g.turn, revision: g.revision, remaining: g.bag.length, recentMoves: g.recentMoves || [], lastMove: g.lastMove })) };
}
export const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  try {
    let raw = '';
    for await (const chunk of req) { raw += chunk; if (raw.length > 8192) { res.writeHead(413); res.end(JSON.stringify({ error: 'İstek çok büyük.' })); return; } }
    let body; try { body = raw ? JSON.parse(raw) : {}; } catch { throw Error('Geçersiz JSON.'); }
    if (!body || typeof body !== 'object') throw Error('Geçersiz istek.');
    if (req.method === 'POST' && req.url === '/users') {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name.length < 2 || name.length > 20) throw Error('Adın 2–20 karakter olmalı.');
      let id; do { id = randomBytes(4).toString('hex').toUpperCase(); } while (state.users.some(u => u.id === id));
      const user = { id, name, token: randomBytes(32).toString('hex') }; state.users.push(user); save();
      res.end(JSON.stringify({ token: user.token, ...snapshot(user) })); return;
    }
    const user = state.users.find(u => `Bearer ${u.token}` === req.headers.authorization);
    if (!user) { res.writeHead(401); res.end(JSON.stringify({ error: 'Oturum bulunamadı. Yeni oyuncu oluştur.' })); return; }
    if (req.method === 'GET' && req.url === '/state') { res.end(JSON.stringify(snapshot(user))); return; }
    if (req.method === 'POST' && req.url === '/preview') {
      const game = state.games.find(g => g.id === body.gameId && g.players.includes(user.id));
      if (!game) throw Error('Oyun bulunamadı.');
      const preview = await previewMove(game, user.id, body, isTDKWord);
      res.end(JSON.stringify({ preview })); return;
    }
    if (req.method === 'POST' && req.url === '/computer') {
      let game = state.games.find(g => g.players.includes(user.id) && g.players.includes(BOT_ID) && g.status === 'active');
      if (!game) {
        game = createGame([user.id, BOT_ID]); game.status = 'active';
        game.lastMove = 'Bilgisayarla oyun başladı. İlk kelime merkezden geçmeli.';
        state.games.push(game);
      }
      save(); res.end(JSON.stringify({ ...snapshot(user), gameId: game.id })); return;
    } else if (req.method === 'POST' && req.url === '/invite') {
      const target = state.users.find(u => u.id === body.userId);
      if (!target || target.id === user.id) throw Error('Geçerli bir arkadaş ID’si gir.');
      if (state.games.some(g => g.players.includes(user.id) && g.players.includes(target.id) && ['active', 'pending'].includes(g.status))) throw Error('Bu arkadaşınla zaten açık bir oyunun var.');
      state.games.push(createGame([user.id, target.id]));
    } else if (req.method === 'POST' && ['/accept', '/decline', '/move', '/exchange', '/surrender', '/delete-game'].includes(req.url)) {
      const game = state.games.find(g => g.id === body.gameId && g.players.includes(user.id));
      if (!game) throw Error('Oyun bulunamadı.');
      if (req.url === '/delete-game') {
        if (!['finished', 'declined'].includes(game.status)) throw Error('Yalnızca tamamlanmış oyunlar silinebilir.');
        state.games = state.games.filter(g => g.id !== body.gameId);
      }
      else if (req.url === '/surrender') { surrenderGame(game, user.id, user.name); }
      else if (req.url === '/move') { await commitMove(game, user.id, body, isTDKWord); await playBotTurn(game, isTDKWord); }
      else if (req.url === '/exchange') { exchangeTiles(game, user.id, body); await playBotTurn(game, isTDKWord); }
      else {
        if (game.status !== 'pending' || game.players[1] !== user.id) throw Error('Bu davete yanıt veremezsin.');
        game.status = req.url === '/accept' ? 'active' : 'declined'; game.revision++; game.lastMove = game.status === 'active' ? 'İlk kelime merkezden geçmeli.' : 'Davet reddedildi.';
      }
    } else { res.writeHead(404); res.end(JSON.stringify({ error: 'Adres bulunamadı.' })); return; }
    save(); res.end(JSON.stringify(snapshot(user)));
  } catch (error) { res.writeHead(400); res.end(JSON.stringify({ error: error.message || 'İşlem yapılamadı.' })); }
});
server.listen(Number(process.env.PORT || 3001), '0.0.0.0', () => console.log(`Kelime sunucusu ${server.address().port} portunda hazır.`));
