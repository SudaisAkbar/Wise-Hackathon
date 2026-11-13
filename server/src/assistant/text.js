// Text helpers shared by the rule parser and the scam guard.
// Speech-to-text output varies a lot (digits in different scripts, Arabic vs
// Urdu letter forms, optional Hindi dots), so everything is normalised first.

const DIGIT_SETS = ['٠١٢٣٤٥٦٧٨٩', '۰۱۲۳۴۵۶۷۸۹', '०१२३४५६७८९'];

export function normalize(input) {
  let text = String(input ?? '').normalize('NFKC').toLowerCase();

  for (const digits of DIGIT_SETS) {
    text = text.replace(new RegExp(`[${digits}]`, 'g'), (digit) => String(digits.indexOf(digit)));
  }

  text = text
    // Urdu: unify Arabic letter variants and drop vowel marks.
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[هة]/g, 'ہ')
    .replace(/[ً-ْٰ]/g, '')
    // Hindi: drop the nukta dot and treat both nasal marks the same.
    .replace(/़/g, '')
    .replace(/ँ/g, 'ं')
    // Russian: ё and е are interchangeable in practice.
    .replace(/ё/g, 'е')
    // Curly quotes and apostrophes.
    .replace(/[’‘`ʼ]/g, "'");

  // "20,000" / "20 000" / "20.000" -> "20000"
  text = text.replace(/(\d{1,3})((?:[,.   ]\d{3})+)(?!\d)/g, (_, head, rest) => head + rest.replace(/\D/g, ''));
  // "12,50" -> "12.50"
  text = text.replace(/(\d+),(\d{1,2})(?!\d)/g, '$1.$2');

  return text.replace(/\s+/g, ' ').trim();
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LEFT = '(?<![\\p{L}\\p{M}\\p{N}])';
const RIGHT = '(?![\\p{L}\\p{M}\\p{N}])';

// Whole-word match that also works for scripts where \b does not.
export function wordRegex(list) {
  const body = list.map((item) => escapeRegex(normalize(item))).join('|');
  return new RegExp(`${LEFT}(?:${body})${RIGHT}`, 'u');
}

// Match at the start of a word, for languages that add endings to verbs.
export function stemRegex(list) {
  const body = list.map((item) => escapeRegex(normalize(item))).join('|');
  return new RegExp(`${LEFT}(?:${body})`, 'u');
}

export function tokenize(normalized) {
  // Apostrophes stay inside words (Ukrainian п'ять, English don't).
  return normalized.match(/\d+(?:\.\d+)?|[\p{L}\p{M}]+(?:'[\p{L}\p{M}]+)*/gu) || [];
}
