// Turns spoken digits into characters, for the 4-digit code and account
// numbers. Shared by the browser and the server, with no dependencies.
//
// Speech recognition writes the same thing in many ways: "1234", "12 34",
// "one two three four", "twelve thirty four", "один два три четыре",
// "EE38 2200 ..." — all of these come out as plain characters.

const DIGIT_WORDS = {
  0: ['zero', 'oh', 'o', 'null', 'nulla', 'ноль', 'нуль', 'صفر', 'शून्य', 'sifar', 'zero'],
  1: ['one', 'won', 'üks', 'uks', 'один', 'одна', 'одну', 'ایک', 'एक', 'ek'],
  2: ['two', 'to', 'too', 'kaks', 'два', 'две', 'дві', 'دو', 'दो', 'do'],
  3: ['three', 'kolm', 'три', 'تین', 'तीन', 'teen'],
  4: ['four', 'for', 'fore', 'neli', 'четыре', 'чотири', 'چار', 'चार', 'char', 'chaar'],
  5: ['five', 'viis', 'пять', "п'ять", 'пьять', 'پانچ', 'पांच', 'पाँच', 'paanch', 'panch'],
  6: ['six', 'kuus', 'шесть', 'шість', 'چھ', 'छह', 'छः', 'छे', 'chhe', 'chhah'],
  7: ['seven', 'seitse', 'семь', 'сім', 'سات', 'सात', 'saat'],
  8: ['eight', 'ate', 'kaheksa', 'восемь', 'вісім', 'آٹھ', 'आठ', 'aath'],
  9: ['nine', 'üheksa', 'uheksa', 'девять', "дев'ять", 'девьять', 'نو', 'नौ', 'nau']
};

// Two-digit words, so "twelve thirty four" becomes 1234.
const TENS = {
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
  'десять': 10, 'одиннадцать': 11, 'двенадцать': 12, 'двадцать': 20, 'тридцать': 30, 'сорок': 40,
  'пятьдесят': 50, 'шестьдесят': 60, 'семьдесят': 70, 'восемьдесят': 80, 'девяносто': 90,
  'двадцять': 20, 'тридцять': 30, "п'ятдесят": 50, 'шістдесят': 60, 'сімдесят': 70, 'вісімдесят': 80,
  "дев'яносто": 90, 'kümme': 10, 'kakskümmend': 20, 'kolmkümmend': 30, 'nelikümmend': 40, 'viiskümmend': 50
};

const WORD_TO_DIGIT = new Map();
for (const [digit, words] of Object.entries(DIGIT_WORDS)) {
  for (const word of words) WORD_TO_DIGIT.set(word, digit);
}

// Letters as they are often said when spelling ("E for Estonia" is not handled).
const LETTER_NAMES = {
  a: 'A', ay: 'A', b: 'B', bee: 'B', be: 'B', c: 'C', see: 'C', sea: 'C', d: 'D', dee: 'D', e: 'E', ee: 'EE',
  f: 'F', ef: 'F', g: 'G', gee: 'G', h: 'H', aitch: 'H', i: 'I', j: 'J', jay: 'J', k: 'K', kay: 'K', l: 'L',
  el: 'L', m: 'M', em: 'M', n: 'N', en: 'N', p: 'P', pee: 'P', q: 'Q', queue: 'Q', r: 'R', ar: 'R', s: 'S',
  es: 'S', t: 'T', tee: 'T', u: 'U', you: 'U', v: 'V', vee: 'V', w: 'W', x: 'X', ex: 'X', y: 'Y', why: 'Y',
  z: 'Z', zed: 'Z', zee: 'Z'
};

function clean(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`ʼ]/g, "'")
    .replace(/ё/g, 'е')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)));
}

const tokens = (text) => clean(text).match(/\d+|[\p{L}\p{M}]+(?:'[\p{L}\p{M}]+)*/gu) || [];

// Digits only, in the order they were said. Returns a string such as "1234".
export function spokenDigits(text) {
  const list = tokens(text);
  let out = '';
  for (let i = 0; i < list.length; i += 1) {
    const token = list[i];
    if (/^\d+$/.test(token)) {
      out += token;
    } else if (WORD_TO_DIGIT.has(token)) {
      out += WORD_TO_DIGIT.get(token);
    } else if (Object.hasOwn(TENS, token)) {
      let value = TENS[token];
      const next = list[i + 1];
      if (value >= 20 && value % 10 === 0 && next && WORD_TO_DIGIT.has(next) && WORD_TO_DIGIT.get(next) !== '0') {
        value += Number(WORD_TO_DIGIT.get(next));
        i += 1;
      }
      out += String(value);
    }
  }
  return out;
}

// True when the sentence contains anything that sounds like a digit. Used to
// keep a spoken code away from everything except the confirm call.
export function hasSpokenDigits(text) {
  return spokenDigits(text).length > 0;
}

// A 4-digit code, or null when it is not exactly four digits.
export function spokenCode(text) {
  const digits = spokenDigits(text);
  return /^\d{4}$/.test(digits) ? digits : null;
}

// Account numbers mix letters and digits: "E E 3 8 2 2 0 0" or "EE38 2200 ...".
export function spokenAccount(text) {
  let out = '';
  const list = tokens(text);
  for (let i = 0; i < list.length; i += 1) {
    const token = list[i];
    if (/^\d+$/.test(token)) out += token;
    else if (/^[a-z]{2}$/.test(token) && (i === 0 || /^\d/.test(list[i + 1] || ''))) {
      // A two-letter country code at the start, as in "PL61 ..." or "EE38 ...".
      out += token.toUpperCase();
    } else if (WORD_TO_DIGIT.has(token) && !/^[a-z]$/.test(token)) {
      out += WORD_TO_DIGIT.get(token);
    } else if (Object.hasOwn(TENS, token)) {
      out += String(TENS[token]);
    } else if (Object.hasOwn(LETTER_NAMES, token)) {
      out += LETTER_NAMES[token];
    } else if (token === 'o') {
      out += '0';
    }
  }
  return out.replace(/[^A-Z0-9]/g, '');
}

// "EE382200" -> "E E 3 8, 2 2 0 0": read back one character at a time, in groups of four.
export function spellOut(value) {
  const chars = String(value).replace(/\s/g, '').split('');
  const groups = [];
  for (let i = 0; i < chars.length; i += 4) groups.push(chars.slice(i, i + 4).join(' '));
  return groups.join(', ');
}

// "EE382200221020145685" -> "EE38 2200 2210 2014 5685"
export function groupAccount(value) {
  return String(value).replace(/\s/g, '').replace(/(.{4})(?=.)/g, '$1 ');
}

// "Hey Wise", as speech recognition tends to write it in each language.
export const WAKE_RE =
  /(?:^|[^\p{L}])(?:hey|hi|hay|ok|okay|a|hei|hej|hello)[\s,.!]*(?:wise|wyse|wize|vise|whys|why's|ways|wais)(?![\p{L}])|хей[\s,.!]*вайс|эй[\s,.!]*вайс|хэй[\s,.!]*вайс|гей[\s,.!]*вайс|хей[\s,.!]*вайз|ہے[\s،]*وائز|हे[\s,]*वाइज़?/iu;

export function hasWakePhrase(text) {
  return WAKE_RE.test(String(text || ''));
}
