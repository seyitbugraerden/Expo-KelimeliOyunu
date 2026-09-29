import { readFileSync } from 'node:fs';
// Only dictionary headwords: no suffix generation, proper-name or abbreviation lists.
export function normalizeWord(word) {
  return word.normalize('NFC').toLocaleUpperCase('tr-TR').replaceAll('Â', 'A').replaceAll('Î', 'İ').replaceAll('Û', 'U');
}
export const dictionary = new Set(readFileSync(new URL('./dictionary/master-dictionary.dict', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .filter(line => !/Prop|Abbr|Dummy|Punc/.test(line))
  .map(line => line.trim().split(/\s+/)[0])
  .filter(word => /^[a-zçğıöşüâîû]+$/.test(word))
  .map(normalizeWord)
  .filter(word => /^[ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]{2,15}$/.test(word)));
export function isValidWord(word) { return dictionary.has(normalizeWord(word)); }
