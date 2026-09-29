import { normalizeWord } from './dictionary.mjs';

const lookups = new Map();
const LOOKUP_URL = process.env.TDK_LOOKUP_URL || 'https://sozluk.gov.tr/gts?ara=';

export function isTDKWord(word) {
  const normalized = normalizeWord(word);
  if (lookups.has(normalized)) return lookups.get(normalized);
  const lookup = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${LOOKUP_URL}${encodeURIComponent(normalized.toLocaleLowerCase('tr-TR'))}`, { signal: controller.signal });
      if (!response.ok) throw Error('TDK sözlük yanıt vermiyor.');
      const entries = await response.json();
      return Array.isArray(entries) && entries.some(entry => typeof entry?.madde === 'string' && normalizeWord(entry.madde) === normalized && String(entry.ozel_mi) !== '1');
    } catch {
      throw Error('TDK sözlüğüne ulaşılamıyor. Bağlantını kontrol edip tekrar dene.');
    } finally {
      clearTimeout(timeout);
    }
  })();
  lookups.set(normalized, lookup);
  lookup.catch(() => lookups.delete(normalized));
  return lookup;
}
