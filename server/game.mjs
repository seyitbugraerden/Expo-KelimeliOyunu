import { isValidWord } from './dictionary.mjs';
import { randomInt, randomUUID } from 'node:crypto';
export const SIZE = 15;
export const POINTS = Object.fromEntries([... 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'].map(letter => [letter, 'AEIİKLMNRT'.includes(letter) ? 1 : 'ÇĞJÖŞÜZ'.includes(letter) ? 4 : 2]));
const premiumSquares = Array(225).fill(null);
function addSymmetricPremium(label, coordinates) {
  for (const [row, column] of coordinates) for (const [r, c] of [[row, column], [row, 14 - column], [14 - row, column], [14 - row, 14 - column]]) premiumSquares[r * SIZE + c] = label;
}
addSymmetricPremium('3W', [[0, 0], [0, 7], [7, 0]]);
addSymmetricPremium('2W', [[1, 1], [2, 2], [3, 3], [4, 4], [1, 13], [2, 12], [3, 11], [4, 10], [7, 7]]);
addSymmetricPremium('3L', [[1, 5], [1, 9], [5, 1], [5, 5], [5, 9], [5, 13]]);
addSymmetricPremium('2L', [[0, 3], [0, 11], [2, 6], [2, 8], [3, 0], [3, 7], [3, 14], [6, 2], [6, 6], [6, 8], [6, 12], [7, 3], [7, 11]]);
export const PREMIUM_SQUARES = Object.freeze(premiumSquares);
export function createGame(players) {
  const bag = [...'AAAAAAAAAAAAEEEEEEEEEEEEİİİİİİİİIIIIKKKKKKLLLLLLMMMMNNNNNNRRRRRRTTTTTTUUUUOOOOBBBCCÇÇDDDFFGGĞĞHHJÖÖPPSSŞŞÜÜVVYYZZ**'];
  for (let i = bag.length - 1; i > 0; i--) { const j = randomInt(i + 1); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  return { id: randomUUID(), players, status: 'pending', board: Array(225).fill(null), blankTiles: Array(225).fill(false), racks: Object.fromEntries(players.map(id => [id, bag.splice(0, 7)])), scores: Object.fromEntries(players.map(id => [id, 0])), bag, turn: players[0], revision: 0, passes: 0, lastMove: 'Davetin kabul edilmesi bekleniyor.' };
}
export function move(game, userId, body, validateWord = isValidWord) {
  if (game.status !== 'active' || game.turn !== userId) throw Error('Hamle sırası sende değil.');
  if (body.revision !== game.revision) throw Error('Oyun güncellendi. Tekrar dene.');
  const placements = body.placements;
  if (!Array.isArray(placements) || placements.length > 7) throw Error('Geçersiz hamle.');
  let detail = { playerId: userId, revision: game.revision + 1, points: 0, words: [], indexes: [], bonus: 0 };
  if (placements.length === 0) { game.passes++; game.lastMove = 'Pas geçildi.'; }
  else {
    const rack = [...game.racks[userId]], board = [...game.board], blankTiles = [...(game.blankTiles || Array(225).fill(false))], indexes = [];
    for (const p of placements) {
      if (!Number.isInteger(p.index) || p.index < 0 || p.index >= 225 || board[p.index]) throw Error('Geçersiz kare.');
      if (typeof p.letter !== 'string' || !Object.hasOwn(POINTS, p.letter) || (p.blank !== undefined && typeof p.blank !== 'boolean')) throw Error('Geçersiz harf.');
      const blank = p.blank === true;
      const tile = rack.indexOf(blank ? '*' : p.letter);
      if (tile < 0) throw Error('Bu harf elinde yok.');
      rack.splice(tile, 1); board[p.index] = p.letter; blankTiles[p.index] = blank; indexes.push(p.index);
    }
    const horizontal = indexes.every(i => Math.floor(i / SIZE) === Math.floor(indexes[0] / SIZE));
    const vertical = indexes.every(i => i % SIZE === indexes[0] % SIZE);
    if (!horizontal && !vertical) throw Error('Harfleri tek satır veya sütuna yerleştir.');
    const step = horizontal ? 1 : SIZE;
    for (let i = Math.min(...indexes); i <= Math.max(...indexes); i += step) if (!board[i]) throw Error('Harfler arasında boşluk bırakamazsın.');
    const neighbors = i => [i >= 15 ? i - 15 : -1, i < 210 ? i + 15 : -1, i % 15 ? i - 1 : -1, i % 15 < 14 ? i + 1 : -1].filter(n => n >= 0);
    if (!game.board.some(Boolean)) {
      if (!indexes.includes(112) || indexes.length < 2) throw Error('İlk kelime en az iki harf olmalı ve merkezden geçmeli.');
    } else if (!indexes.some(i => neighbors(i).some(n => game.board[n]))) throw Error('Mevcut harflere bağlanmalısın.');
    // Each distinct horizontal/vertical word formed by this move scores once.
    const words = new Map();
    for (const index of indexes) for (const delta of [1, 15]) {
      let start = index;
      while (start - delta >= 0 && (delta === 15 || start % 15 !== 0) && board[start - delta]) start -= delta;
      const cells = []; let i = start;
      while (i < 225 && board[i]) { cells.push(i); if (delta === 1 && i % 15 === 14) break; i += delta; }
      if (cells.length > 1) words.set(`${start}:${delta}`, cells);
    }
    const invalid = [...words.values()].map(cells => cells.map(i => board[i]).join('')).filter(word => !validateWord(word));
    if (invalid.length) throw Error(`Sözlükte bulunamadı: ${invalid.join(', ')}. Hamle oynanmadı.`);
    const tilePoints = index => blankTiles[index] ? 0 : POINTS[board[index]];
    const placed = new Set(indexes);
    const wordPoints = cells => {
      let wordMultiplier = 1;
      const letterPoints = cells.reduce((sum, index) => {
        let value = tilePoints(index);
        if (placed.has(index)) {
          const premium = PREMIUM_SQUARES[index];
          if (premium === '2L') value *= 2;
          if (premium === '3L') value *= 3;
          if (premium === '2W') wordMultiplier *= 2;
          if (premium === '3W') wordMultiplier *= 3;
        }
        return sum + value;
      }, 0);
      return letterPoints * wordMultiplier;
    };
    const points = [...words.values()].reduce((sum, cells) => sum + wordPoints(cells), 0) + (indexes.length === 7 ? 50 : 0);
    detail = { ...detail, points, indexes, bonus: indexes.length === 7 ? 50 : 0, words: [...words.values()].map(cells => ({ cells, word: cells.map(i => board[i]).join(''), points: wordPoints(cells), blankCells: cells.filter(i => blankTiles[i]) })) };
    game.board = board; game.blankTiles = blankTiles; game.racks[userId] = rack; game.scores[userId] += points; game.passes = 0;
    while (rack.length < 7 && game.bag.length) rack.push(game.bag.pop());
    game.lastMove = `${[...words.values()].map(cells => cells.map(i => board[i]).join('')).join(', ')} · +${points} puan`;
  }
  game.recentMoves = [...(game.recentMoves || []), detail].slice(-2);
  game.revision++;
  game.turn = game.players.find(id => id !== userId);
  if (game.passes >= 4 || game.players.some(id => game.racks[id].length === 0)) { game.status = 'finished'; game.lastMove += ' · Oyun bitti.'; }
}
async function validatedMove(game, userId, body, validateWord, commit) {
  const draft = structuredClone(game);
  move(draft, userId, body, () => true);
  const detail = draft.recentMoves.at(-1);
  const invalid = (await Promise.all(detail.words.map(async word => await validateWord(word.word) ? null : word.word))).filter(Boolean);
  if (invalid.length) throw Error(`TDK sözlüğünde bulunamadı: ${invalid.join(', ')}. Hamle oynanmadı.`);
  if (commit) Object.assign(game, draft);
  return detail;
}
export function previewMove(game, userId, body, validateWord) { return validatedMove(game, userId, body, validateWord, false); }
export function commitMove(game, userId, body, validateWord) { return validatedMove(game, userId, body, validateWord, true); }
