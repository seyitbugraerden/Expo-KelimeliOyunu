import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, move } from './game.mjs';
import { isValidWord } from './dictionary.mjs';
import { BOT_ID, chooseBotMove, playBotTurn } from './bot.mjs';
const validateWord = async word => isValidWord(word);
const setup = () => { const g = createGame(['human', BOT_ID]); g.status = 'active'; g.turn = BOT_ID; g.racks[BOT_ID] = [...'KALELER']; return g; };
test('computer finds a word across center without mutating input', async () => {
  const g = setup(), before = JSON.stringify(g), placements = await chooseBotMove(g, validateWord);
  assert.equal(JSON.stringify(g), before); assert.ok(placements.length >= 2); assert.ok(placements.some(p => p.index === 112));
  await playBotTurn(g, validateWord); assert.equal(g.turn, 'human'); assert.ok(g.scores[BOT_ID] > 0); assert.match(g.lastMove, /^Bilgisayar:/);
});
test('computer connects to existing tiles and uses only its rack', async () => {
  const g = setup(); g.board[112] = 'K'; g.board[113] = 'A'; g.racks[BOT_ID] = [...'LEMRTİE'];
  const placements = await chooseBotMove(g, validateWord); assert.ok(placements.length); move(g, BOT_ID, { revision: 0, placements });
  assert.equal(g.board[112], 'K'); assert.equal(g.board[113], 'A'); assert.equal(g.turn, 'human');
});
test('computer passes when no word is possible, and respects end of game', async () => {
  const g = setup(); g.racks[BOT_ID] = ['J']; g.passes = 3;
  await playBotTurn(g, validateWord); assert.equal(g.status, 'finished'); assert.equal(g.revision, 1); assert.match(g.lastMove, /Pas/);
  const before = JSON.stringify(g); await playBotTurn(g, validateWord); assert.equal(JSON.stringify(g), before);
});
test('computer does not play during human turn', () => { const g = setup(); g.turn = 'human'; const before = JSON.stringify(g); playBotTurn(g); assert.equal(JSON.stringify(g), before); });
