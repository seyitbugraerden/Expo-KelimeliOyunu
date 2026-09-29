import { isValidWord } from './dictionary.mjs';
import { commitMove, move, SIZE } from './game.mjs';
import { isTDKWord } from './tdk.mjs';
export const BOT_ID = 'COMPUTER';
// Small, curated vocabulary for the beginner computer opponent.
const words = new Set(`ACIK AÇ AÇIK AD ADA ADAM ADIM AF AĞ AĞA AĞAÇ AĞIR AK AKIL AKIM AL ALA ALAN ALT ALTI AMA ANA ANI AN ANLAM ARI ARKA AS ASIL AŞ AŞK AT ATA ATEŞ AV AY AYAK AYI AYNA AZ BABA BAĞ BAL BALIK BAŞ BATI BEŞ BEZ BİN BİR BİZ BOL BOŞ BOY BU BULUT BUZ CAM CAN CEP CEVİZ ÇAL ÇAM ÇAY ÇEK ÇİÇEK ÇİL ÇİM ÇİN ÇİT ÇOK ÇÖL DAĞ DAL DAR DENİZ DERİ DEV DİL DİŞ DİZ DOĞA DOLU DOST DÖRT DÜN DÜŞ EGE EK EKİN EL ELA ELMA EM EMİN EN ER ERİK ES EŞ ET EV EZ EZGİ FİL GAZ GEL GEMİ GEN GENÇ GİT GÖL GÖZ GÜL GÜN GÜR GÜZEL HAL HALI HAM HAN HARF HAT HAVA HAYAL HAZ HEP HER HIZ HİS HOŞ IRMAK ISI ISLAK IŞIK İÇ İKİ İL İLE İLK İN İNCİ İNCE İP İRİ İS İŞ İT İYİ İZ KAÇ KAL KALE KAM KAN KAPI KAR KARA KART KAS KAŞ KAT KAYA KAZ KEK KELİME KEMİK KES KIL KIR KIZ KİL KİM KİRA KİTAP KOL KON KOR KOŞ KOY KOZ KÖK KÖR KÖY KUL KUM KUR KUŞ KUTU KUZU KÜL KÜP LALE LİMON MAL MART MASA MAVİ MAYA MİL MOR MUZ NAL NAR NASIL NE NEM NET NİYE NOT O ODA ODUN OK OKUL OL OLAY ON ORMAN OT OVA OY OYUN ÖN ÖR ÖRT ÖZ PARA PARK PAY PEK PERİ PİL PİR PİS PUL RAF RAY RENK RESİM ROL SAÇ SAF SAĞ SAHİL SAL SAN SAP SAR SAT SAY SAZ SEL SEN SER SES SET SEV SIĞ SIK SIR SİL SİM SİS SİZ SOL SON SOR SOY SÖZ SU SULU SUS SÜS SÜT ŞAL ŞAN ŞART ŞEN ŞER ŞEY ŞİİR ŞU TAÇ TAK TAM TAN TARLA TAS TAŞ TAT TAVA TAY TEK TEL TEN TER TEST TIK TİP TOK TON TOP TOZ TUR TUZ TÜL TÜM TÜRK UÇ UÇAK UFUK UN US USLU USTA UT UY UZAK UZUN ÜÇ ÜLKE ÜN ÜST ÜTÜ ÜYE ÜZÜM VAR VAY VER VUR YA YAĞ YAK YAN YAR YAŞ YAT YAY YAZ YEDİ YEL YEM YENİ YER YIL YOL YÖN YURT YÜK YÜN YÜZ ZAR ZEKİ ZEMİN ZİL ZOR`.split(' '));
function line(board, index, delta) {
  let start = index;
  while (start >= delta && (delta === SIZE || start % SIZE !== 0) && board[start - delta]) start -= delta;
  let word = '';
  for (let i = start; i < SIZE * SIZE && board[i]; i += delta) { word += board[i]; if (delta === 1 && i % SIZE === SIZE - 1) break; }
  return word;
}
export async function chooseBotMove(game, validateWord = isTDKWord) {
  let best = [], bestScore = -1;
  for (const word of words) {
    if (word.length < 2 || !isValidWord(word)) continue;
    for (const delta of [1, SIZE]) for (let start = 0; start < SIZE * SIZE; start++) {
      if (delta === 1 ? start % SIZE + word.length > SIZE : Math.floor(start / SIZE) + word.length > SIZE) continue;
      const before = start - delta, after = start + word.length * delta;
      if (before >= 0 && (delta === SIZE || start % SIZE !== 0) && game.board[before]) continue;
      if (after < 225 && (delta === SIZE || after % SIZE !== 0) && game.board[after]) continue;
      const rack = [...game.racks[BOT_ID]], placements = [];
      let valid = true;
      for (let j = 0; j < word.length; j++) {
        const index = start + j * delta, letter = word[j];
        if (game.board[index]) { if (game.board[index] !== letter) { valid = false; break; } }
        else { const tile = rack.indexOf(letter); if (tile < 0) { valid = false; break; } rack.splice(tile, 1); placements.push({ index, letter }); }
      }
      if (!valid || !placements.length) continue;
      const board = [...game.board]; for (const p of placements) board[p.index] = p.letter;
      if (placements.some(p => [1, SIZE].some(d => { const formed = line(board, p.index, d); return formed.length > 1 && !isValidWord(formed); }))) continue;
      const candidate = structuredClone(game);
      let detail;
      try { move(candidate, BOT_ID, { revision: game.revision, placements }); detail = candidate.recentMoves.at(-1); } catch { continue; }
      const score = candidate.scores[BOT_ID] - game.scores[BOT_ID];
      if (score <= bestScore) continue;
      try { if (!(await Promise.all(detail.words.map(word => validateWord(word.word)))).every(Boolean)) continue; }
      catch { return []; }
      bestScore = score; best = placements;
    }
  }
  return best;
}
export async function playBotTurn(game, validateWord = isTDKWord) {
  if (game.status !== 'active' || game.turn !== BOT_ID) return;
  const placements = await chooseBotMove(game, validateWord);
  try { await commitMove(game, BOT_ID, { revision: game.revision, placements }, validateWord); }
  catch { move(game, BOT_ID, { revision: game.revision, placements: [] }); }
  game.lastMove = `Bilgisayar: ${game.lastMove}`;
}
