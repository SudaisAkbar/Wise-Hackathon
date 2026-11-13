// Languages the assistant speaks, in the order the language menu shows them.
// To add one: add an entry here, add its sentences in messages.js, its keywords
// in nlu/rules.js and its screen words in client/src/lib/strings.js. With a
// Claude key, understanding already works for any language; these files control
// what the assistant says back.
//
// stt is the locale given to the browser's speech recognition, tts the locale
// used to pick a voice for speaking.

export const LANGUAGES = {
  en: {
    code: 'en', label: 'English', short: 'EN', numberLocale: 'en-GB', stt: 'en-GB', tts: 'en-GB',
    currency: {
      EUR: ['euro', 'euros'], PLN: ['zloty', 'zloty'], UAH: ['hryvnia', 'hryvnias'], USD: ['dollar', 'dollars'],
      GBP: ['pound', 'pounds'], PKR: ['rupee', 'rupees'], INR: ['rupee', 'rupees']
    }
  },
  et: {
    code: 'et', label: 'Eesti', short: 'ET', numberLocale: 'et-EE', stt: 'et-EE', tts: 'et-EE',
    // Estonian uses the partitive after any number except 1.
    currency: {
      EUR: ['euro', 'eurot'], PLN: ['zlott', 'zlotti'], UAH: ['grivna', 'grivnat'], USD: ['dollar', 'dollarit'],
      GBP: ['nael', 'naela'], PKR: ['ruupia', 'ruupiat'], INR: ['ruupia', 'ruupiat']
    }
  },
  ru: {
    code: 'ru', label: 'Русский', short: 'RU', numberLocale: 'ru-RU', stt: 'ru-RU', tts: 'ru-RU',
    // [one, few, many]
    currency: {
      EUR: ['евро', 'евро', 'евро'], PLN: ['злотый', 'злотых', 'злотых'], UAH: ['гривна', 'гривны', 'гривен'],
      USD: ['доллар', 'доллара', 'долларов'], GBP: ['фунт', 'фунта', 'фунтов'],
      PKR: ['рупия', 'рупии', 'рупий'], INR: ['рупия', 'рупии', 'рупий']
    }
  },
  uk: {
    code: 'uk', label: 'Українська', short: 'UK', numberLocale: 'uk-UA', stt: 'uk-UA', tts: 'uk-UA',
    // [one, few, many]
    currency: {
      EUR: ['євро', 'євро', 'євро'], PLN: ['злотий', 'злотих', 'злотих'], UAH: ['гривня', 'гривні', 'гривень'],
      USD: ['долар', 'долари', 'доларів'], GBP: ['фунт', 'фунти', 'фунтів'],
      PKR: ['рупія', 'рупії', 'рупій'], INR: ['рупія', 'рупії', 'рупій']
    }
  },
  ur: {
    code: 'ur', label: 'اردو', short: 'UR', numberLocale: 'en-GB', stt: 'ur-PK', tts: 'ur-PK',
    currency: {
      EUR: ['یورو', 'یورو'], PLN: ['زلوٹی', 'زلوٹی'], UAH: ['ہریونیا', 'ہریونیا'], USD: ['ڈالر', 'ڈالر'],
      GBP: ['پاؤنڈ', 'پاؤنڈ'], PKR: ['روپیہ', 'روپے'], INR: ['روپیہ', 'روپے']
    }
  },
  hi: {
    code: 'hi', label: 'हिन्दी', short: 'HI', numberLocale: 'en-IN', stt: 'hi-IN', tts: 'hi-IN',
    currency: {
      EUR: ['यूरो', 'यूरो'], PLN: ['ज़्लॉटी', 'ज़्लॉटी'], UAH: ['ह्रिव्निया', 'ह्रिव्निया'], USD: ['डॉलर', 'डॉलर'],
      GBP: ['पाउंड', 'पाउंड'], PKR: ['रुपया', 'रुपये'], INR: ['रुपया', 'रुपये']
    }
  }
};

export const DEFAULT_LANGUAGE = 'en';
export const isLanguage = (code) => Object.hasOwn(LANGUAGES, code);

const WHOLE_UNIT_CURRENCIES = new Set(['PKR', 'INR']);
const SLAVIC = new Set(['ru', 'uk']);

function currencyWord(lang, currency, amount) {
  const forms = LANGUAGES[lang].currency[currency];
  if (!forms) return currency;
  const whole = Number.isInteger(amount);
  if (SLAVIC.has(lang)) {
    if (!whole) return forms[1];
    const mod10 = amount % 10;
    const mod100 = amount % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
    return forms[2];
  }
  return amount === 1 ? forms[0] : forms[1];
}

// "150 euros", "636.12 zloty": amounts written the way they are said aloud.
export function moneyWords(amount, currency, lang) {
  const value = WHOLE_UNIT_CURRENCIES.has(currency) ? Math.round(amount) : Math.round(amount * 100) / 100;
  const hasCents = !Number.isInteger(value);
  const number = new Intl.NumberFormat(LANGUAGES[lang].numberLocale, {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2
  }).format(value);
  return `${number} ${currencyWord(lang, currency, value)}`;
}
