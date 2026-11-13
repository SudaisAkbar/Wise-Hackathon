// Built-in language understanding. Used when there is no Claude key, and as the
// safety net whenever the Claude call fails or times out, so the demo never
// depends on the network. It covers the common ways of asking in English,
// Estonian, Russian, Ukrainian, Urdu and Hindi (native script and Latin letters).
import { normalize, tokenize, wordRegex, stemRegex } from '../text.js';

// ---- numbers ---------------------------------------------------------------

const unit = (value) => ({ value, kind: 'unit' });
const strong = (value) => ({ value, kind: 'strong' }); // tens and whole hundreds
const times = (value) => ({ value, kind: 'times' }); // hundred, thousand, lakh

const NUMBER_WORDS = {
  en: {
    one: unit(1), two: unit(2), three: unit(3), four: unit(4), five: unit(5), six: unit(6), seven: unit(7),
    eight: unit(8), nine: unit(9), ten: strong(10), eleven: strong(11), twelve: strong(12), fifteen: strong(15),
    twenty: strong(20), thirty: strong(30), forty: strong(40), fifty: strong(50), sixty: strong(60),
    seventy: strong(70), eighty: strong(80), ninety: strong(90), hundred: times(100), thousand: times(1000)
  },
  // Urdu / Hindi written in Latin letters.
  roman: {
    ek: unit(1), do: unit(2), teen: unit(3), char: unit(4), chaar: unit(4), paanch: unit(5), panch: unit(5),
    chhe: unit(6), saat: unit(7), aath: unit(8), nau: unit(9), das: strong(10), bees: strong(20),
    pachees: strong(25), pachis: strong(25), tees: strong(30), chalis: strong(40), chalees: strong(40),
    pachas: strong(50), pachaas: strong(50), sattar: strong(70), assi: strong(80), nabbe: strong(90),
    sau: times(100), hazar: times(1000), hazaar: times(1000), lakh: times(100000)
  },
  ur: {
    'ایک': unit(1), 'دو': unit(2), 'تین': unit(3), 'چار': unit(4), 'پانچ': unit(5), 'چھ': unit(6), 'سات': unit(7),
    'آٹھ': unit(8), 'نو': unit(9), 'دس': strong(10), 'بیس': strong(20), 'پچیس': strong(25), 'تیس': strong(30),
    'چالیس': strong(40), 'پچاس': strong(50), 'ساٹھ': strong(60), 'ستر': strong(70), 'نوے': strong(90),
    'سو': times(100), 'ہزار': times(1000), 'لاکھ': times(100000)
  },
  hi: {
    'एक': unit(1), 'दो': unit(2), 'तीन': unit(3), 'चार': unit(4), 'पांच': unit(5), 'छह': unit(6), 'सात': unit(7),
    'आठ': unit(8), 'नौ': unit(9), 'दस': strong(10), 'बीस': strong(20), 'पच्चीस': strong(25), 'तीस': strong(30),
    'चालीस': strong(40), 'पचास': strong(50), 'साठ': strong(60), 'सत्तर': strong(70), 'अस्सी': strong(80),
    'नब्बे': strong(90), 'सौ': times(100), 'हजार': times(1000), 'लाख': times(100000)
  },
  et: {
    'üks': unit(1), kaks: unit(2), kolm: unit(3), neli: unit(4), viis: unit(5), kuus: unit(6), seitse: unit(7),
    kaheksa: unit(8), 'üheksa': unit(9), 'kümme': strong(10), viisteist: strong(15), 'kakskümmend': strong(20),
    'kolmkümmend': strong(30), 'nelikümmend': strong(40), 'viiskümmend': strong(50), 'kuuskümmend': strong(60),
    'seitsekümmend': strong(70), 'kaheksakümmend': strong(80), 'üheksakümmend': strong(90), sada: strong(100),
    kakssada: strong(200), kolmsada: strong(300), nelisada: strong(400), viissada: strong(500),
    kuussada: strong(600), seitsesada: strong(700), kaheksasada: strong(800), 'üheksasada': strong(900),
    tuhat: times(1000)
  },
  ru: {
    'один': unit(1), 'одна': unit(1), 'два': unit(2), 'две': unit(2), 'три': unit(3), 'четыре': unit(4),
    'пять': unit(5), 'шесть': unit(6), 'семь': unit(7), 'восемь': unit(8), 'девять': unit(9),
    'десять': strong(10), 'пятнадцать': strong(15), 'двадцать': strong(20), 'тридцать': strong(30),
    'сорок': strong(40), 'пятьдесят': strong(50), 'шестьдесят': strong(60), 'семьдесят': strong(70),
    'восемьдесят': strong(80), 'девяносто': strong(90), 'сто': strong(100), 'двести': strong(200),
    'триста': strong(300), 'четыреста': strong(400), 'пятьсот': strong(500), 'шестьсот': strong(600),
    'семьсот': strong(700), 'восемьсот': strong(800), 'девятьсот': strong(900),
    'тысяча': times(1000), 'тысячи': times(1000), 'тысяч': times(1000), 'тысячу': times(1000)
  },
  uk: {
    'один': unit(1), 'одна': unit(1), 'два': unit(2), 'дві': unit(2), 'три': unit(3), 'чотири': unit(4),
    "п'ять": unit(5), 'шість': unit(6), 'сім': unit(7), 'вісім': unit(8), "дев'ять": unit(9),
    'десять': strong(10), "п'ятнадцять": strong(15), 'двадцять': strong(20), 'тридцять': strong(30),
    'сорок': strong(40), "п'ятдесят": strong(50), 'шістдесят': strong(60), 'сімдесят': strong(70),
    'вісімдесят': strong(80), "дев'яносто": strong(90), 'сто': strong(100), 'двісті': strong(200),
    'триста': strong(300), 'чотириста': strong(400), "п'ятсот": strong(500), 'шістсот': strong(600),
    'сімсот': strong(700), 'вісімсот': strong(800), "дев'ятсот": strong(900),
    'тисяча': times(1000), 'тисячі': times(1000), 'тисяч': times(1000), 'тисячу': times(1000)
  }
};

function numberTable(lang) {
  const table = new Map();
  const add = (group) => {
    for (const [word, entry] of Object.entries(NUMBER_WORDS[group])) table.set(normalize(word), entry);
  };
  add('en');
  if (lang === 'ur' || lang === 'hi') {
    add('roman');
    add('ur');
    add('hi');
  }
  if (lang === 'et') add('et');
  if (lang === 'ru') add('ru');
  if (lang === 'uk') add('uk');
  return table;
}

const CONNECTORS = new Set(['and', 'aur', 'اور', 'और', 'ja', 'и', 'і', 'й', 'та']);

// ---- currencies ------------------------------------------------------------

const CURRENCY_PATTERNS = [
  ['EUR', /€/u, stemRegex(['eur', 'euro', 'یورو', 'यूरो', 'евро', 'євро'])],
  ['PLN', /zł/u, stemRegex(['pln', 'zlot', 'zloti', 'złot', 'злот', 'zlott', 'زلوٹی', 'ज़्लॉटी', 'ज्लॉटी'])],
  ['UAH', /₴/u, stemRegex(['uah', 'hryvn', 'grivn', 'griven', 'грив', 'ہریونیا', 'ह्रिव्निया'])],
  ['PKR', /₨/u, stemRegex(['pkr', 'rupee', 'rupay', 'rupaye', 'rupaiye', 'rupiya', 'rupai', 'روپے', 'روپیہ', 'روپ', 'रुपये', 'रुपए', 'रुपया', 'रुपय', 'рупи', 'ruupia'])],
  ['INR', /₹/u, stemRegex(['inr'])],
  ['USD', /\$/u, stemRegex(['usd', 'dollar', 'ڈالر', 'डॉलर', 'डालर', 'доллар', 'долар'])],
  ['GBP', /£/u, stemRegex(['gbp', 'pound', 'پاؤنڈ', 'पाउंड', 'фунт', 'nael'])]
];

function findCurrency(normalized) {
  let best = null;
  for (const [code, symbol, words] of CURRENCY_PATTERNS) {
    for (const re of [symbol, words]) {
      const match = re.exec(normalized);
      if (match && (best === null || match.index < best.index)) best = { code, index: match.index };
    }
  }
  return best ? best.code : null;
}

const isCurrencyToken = (token) => CURRENCY_PATTERNS.some(([, , words]) => words.test(token));

// ---- amount ----------------------------------------------------------------

export function parseAmount(normalized, lang) {
  const table = numberTable(lang);
  const tokens = tokenize(normalized);

  for (let start = 0; start < tokens.length; start += 1) {
    const isNumber = (token) => /^\d/.test(token) || table.has(token);
    if (!isNumber(tokens[start])) continue;

    let total = 0;
    let current = 0;
    let hasDigits = false;
    let hasStrong = false;
    let end = start;

    for (; end < tokens.length; end += 1) {
      const token = tokens[end];
      if (/^\d/.test(token)) {
        current += Number(token);
        hasDigits = true;
      } else if (table.has(token)) {
        const { value, kind } = table.get(token);
        if (kind === 'times') {
          if (value === 100) current = (current || 1) * 100;
          else {
            total += (current || 1) * value;
            current = 0;
          }
          hasStrong = true;
        } else {
          current += value;
          if (kind === 'strong') hasStrong = true;
        }
      } else if (CONNECTORS.has(token) && end + 1 < tokens.length && isNumber(tokens[end + 1])) {
        continue;
      } else {
        break;
      }
    }

    const value = total + current;
    const followedByCurrency = end < tokens.length && isCurrencyToken(tokens[end]);
    // A lone small word like "do" or "one" only counts when a currency follows it.
    if (value > 0 && (hasDigits || hasStrong || followedByCurrency)) return value;
    start = Math.max(start, end - 1);
  }

  // "€50" or "$20": symbol glued to the digits.
  const glued = /[€$£₹₨₴]\s?(\d+(?:\.\d+)?)/u.exec(normalized);
  return glued ? Number(glued[1]) : null;
}

// ---- intents ---------------------------------------------------------------

const RE = {
  cancel: wordRegex([
    'cancel', 'stop', 'never mind', 'nevermind', 'forget it', "don't send", 'do not send',
    'cancel karo', 'cancel kar do', 'rehne do', 'rehne dein', 'chhoro', 'chhodo', 'band karo', 'mat bhejo',
    'کینسل', 'منسوخ', 'رہنے دو', 'رہنے دیں', 'چھوڑو', 'مت بھیجو',
    'कैंसल', 'रद्द', 'रहने दो', 'रहने दीजिए', 'छोड़ो', 'मत भेजो',
    'tühista', 'katkesta', 'ära saada',
    'отмена', 'отмени', 'отменить', 'стоп', 'не надо', 'не отправляй',
    'скасувати', 'скасуй', 'відміна', 'не треба', 'не надсилай'
  ]),
  repeat: wordRegex([
    'repeat', 'say that again', 'say it again', 'once more', 'pardon', 'what did you say',
    'dobara', 'dobara bolo', 'phir se', 'phir bolo', 'kya kaha',
    'دوبارہ', 'پھر سے', 'کیا کہا',
    'दोबारा', 'फिर से', 'क्या कहा',
    'korda', 'uuesti', 'veel kord',
    'повтори', 'повторите', 'еще раз',
    'повторіть', 'ще раз'
  ]),
  goBack: wordRegex([
    'go back', 'back', 'previous', 'wapas', 'واپس', 'वापस', 'tagasi', 'назад', 'вернись', 'вернуться', 'повернись', 'повернутися'
  ]),
  close: wordRegex([
    'done', "that's all", 'that is all', 'thank you', 'thanks', 'bye', 'goodbye', 'close', 'finish', 'finished',
    'bas', 'shukriya', 'بس', 'شکریہ', 'خدا حافظ', 'بند کرو', 'बस', 'धन्यवाद', 'शुक्रिया', 'अलविदा', 'बंद करो',
    'valmis', 'aitäh', 'head aega', 'sulge', 'lõpeta',
    'готово', 'спасибо', 'до свидания', 'закрой', 'хватит',
    'дякую', 'до побачення', 'закрий', 'досить'
  ]),
  addRecipient: [
    /\badd\b.{0,25}\b(recipient|person|someone|somebody|contact|people)\b/u,
    /\bnew (recipient|contact|person)\b/u,
    wordRegex([
      'lisa saaja', 'uus saaja', 'lisa uus saaja', 'lisa inimene',
      'добавь получателя', 'добавить получателя', 'новый получатель', 'нового получателя', 'добавь человека',
      'додай отримувача', 'додати отримувача', 'новий отримувач', 'нового отримувача',
      'نیا وصول کنندہ', 'وصول کنندہ شامل', 'نیا بندہ', 'naya recipient', 'naya banda',
      'नया रिसीवर', 'नया व्यक्ति', 'रिसीवर जोड़'
    ])
  ],
  status: [
    /where('s| is) my (money|transfer)/u,
    /(did|has|have they|have you) .{0,30}(get|got|receive|received|arrive|arrived|reach|reached)/u,
    wordRegex([
      'status', 'last transfer', 'arrived',
      'pohanch', 'pahunch', 'puhanch', 'pohanch gaye', 'pahunch gaye', 'mil gaye', 'mil gaya', 'kahan hai', 'kahan hain',
      'مل گئے', 'مل گیا', 'کہاں ہے', 'کہاں ہیں',
      'मिल गए', 'मिल गया', 'कहां है', 'कहां हैं',
      'kohale', 'kus mu raha', 'kus on mu raha', 'viimane ülekanne',
      'дошли', 'дошел', 'пришли', 'получил', 'получила', 'где мои деньги', 'где деньги', 'последний перевод', 'статус',
      'дійшли', 'надійшли', 'отримав', 'отримала', 'де мої гроші', 'останній переказ'
    ]),
    stemRegex(['پہنچ', 'पहुंच', 'पहुच', 'jõud'])
  ],
  balance: [
    /how much (money )?(do i have|have i got|is in my account|is left)/u,
    wordRegex([
      'balance', 'my balance', 'how much money',
      'kitne paise', 'kitna paisa', 'kitne pese', 'kitna balance',
      'بیلنس', 'کتنے پیسے', 'کتنا پیسہ', 'کتنی رقم',
      'बैलेंस', 'कितने पैसे', 'कितना पैसा',
      'saldo', 'jääk', 'kontojääk', 'palju mul raha', 'palju raha mul', 'kui palju mul',
      'баланс', 'сколько у меня', 'сколько денег', 'остаток',
      'скільки в мене', 'скільки грошей', 'залишок'
    ])
  ],
  yes: wordRegex([
    'yes', 'yeah', 'yep', 'yup', 'ok', 'okay', 'correct', 'right', 'sure', 'go ahead', 'confirm', 'continue', 'that\'s right',
    'haan', 'han', 'ji', 'ji haan', 'theek', 'theek hai', 'thik hai', 'sahi', 'bilkul', 'bhej do', 'kar do',
    'ہاں', 'جی', 'ٹھیک', 'ٹھیک ہے', 'صحیح', 'بالکل', 'بھیج دو', 'کر دو',
    'हां', 'हा', 'जी', 'ठीक', 'ठीक है', 'सही', 'बिल्कुल', 'बिलकुल', 'भेज दो', 'कर दो',
    'jah', 'jaa', 'õige', 'sobib', 'kinnita', 'täpselt', 'jätka',
    'да', 'верно', 'правильно', 'хорошо', 'подтверждаю', 'отправляй', 'ок', 'ага', 'продолжить', 'давай',
    'так', 'звісно', 'добре', 'підтверджую', 'надсилай', 'продовжити'
  ]),
  no: wordRegex([
    'no', 'nope', 'nah', 'wrong', 'not right', 'incorrect', 'not correct', 'change', 'change it',
    'nahi', 'nahin', 'nai', 'galat', 'ghalat', 'badlo', 'badal do',
    'نہیں', 'غلط', 'بدلو', 'بدل دو',
    'नहीं', 'नही', 'गलत', 'बदलो', 'बदल दो',
    'ei', 'vale', 'muuda',
    'нет', 'неверно', 'неправильно', 'не так', 'не то', 'изменить', 'измени',
    'ні', 'змінити', 'зміни'
  ]),
  send: [
    wordRegex(['send', 'transfer', 'pay', 'give', 'wire', 'de do', 'dena hai', 'dene hain']),
    stemRegex([
      'bhej', 'bhijwa', 'بھیج', 'بھجوا', 'ٹرانسفر', 'भेज', 'भिजवा', 'ट्रांसफर',
      'saada', 'saat', 'kanna', 'kanda', 'maksa', 'ülekan',
      'отправ', 'перевед', 'перевест', 'перевод', 'перечисл', 'пошли', 'послат',
      'надішл', 'надісл', 'надсила', 'переказ', 'перекажи', 'відправ'
    ])
  ],
  help: wordRegex([
    'help', 'what can you do', 'what can i say', 'how does this work',
    'madad', 'kya kar sakte', 'مدد', 'मदद', 'aita', 'mida sa oskad',
    'помощь', 'помоги', 'помогите', 'что ты умеешь', 'что вы умеете',
    'допомога', 'допоможи', 'що ти вмієш'
  ]),
  greeting: wordRegex([
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'hey wise', 'hi wise',
    'salam', 'assalam', 'assalamu alaikum', 'السلام علیکم', 'سلام', 'नमस्ते', 'नमस्कार', 'tere', 'привет', 'здравствуйте',
    'привіт', 'вітаю', 'добрий день'
  ])
};

// Questions for the Help Centre. A sentence counts when it is phrased as a
// question and mentions a help topic. The topic words are also turned into
// English search words, because Help Centre article titles are in English.
const QUESTION = [
  /\?\s*$/u,
  /^(how|what|why|when|where|which|can|could|is|are|do|does|will|should|who)\b/u,
  wordRegex([
    'kuidas', 'miks', 'millal', 'kas', 'mis', 'kui kaua',
    'как', 'почему', 'когда', 'можно', 'сколько стоит', 'что делать', 'где',
    'як', 'чому', 'коли', 'можна', 'скільки коштує', 'що робити',
    'کیسے', 'کیوں', 'کب', 'کیا', 'kaise', 'kyun', 'kab', 'kya',
    'कैसे', 'क्यों', 'कब', 'क्या'
  ])
];

export const HELP_KEYWORDS = [
  { topic: 'fees', en: 'fees cost charge', re: wordRegex(['fee', 'fees', 'cost', 'costs', 'charge', 'charges', 'price', 'expensive', 'tasu', 'teenustasu', 'hind', 'maksab', 'комиссия', 'комиссии', 'стоимость', 'сколько стоит', 'комісія', 'комісії', 'скільки коштує', 'فیس', 'خرچ', 'fees', 'kharcha', 'फ़ीस', 'फीस', 'ख़र्च', 'खर्च']) },
  { topic: 'speed', en: 'how long transfer take arrive', re: wordRegex(['how long', 'how fast', 'take long', 'kui kaua', 'kaua', 'сколько времени', 'как долго', 'как быстро', 'скільки часу', 'як довго', 'як швидко', 'کتنا وقت', 'کتنی دیر', 'kitna time', 'kitni der', 'कितना समय', 'कितनी देर']) },
  { topic: 'cancel', en: 'cancel transfer', re: wordRegex(['cancel', 'cancelling', 'tühista', 'tühistada', 'отменить', 'отмена', 'скасувати', 'скасування', 'کینسل', 'कैंसल']) },
  { topic: 'limits', en: 'limits send', re: wordRegex(['limit', 'limits', 'maximum', 'most i can send', 'limiit', 'limiidid', 'лимит', 'лимиты', 'ліміт', 'ліміти', 'حد', 'limit', 'सीमा', 'लिमिट']) },
  { topic: 'recipients', en: 'add delete recipients', re: wordRegex(['recipient', 'recipients', 'saaja', 'saajad', 'получатель', 'получателя', 'отримувач', 'отримувача', 'وصول کنندہ', 'रिसीवर']) },
  { topic: 'card', en: 'wise card lost stolen freeze', re: wordRegex(['card', 'kaart', 'kaardi', 'карта', 'карту', 'карты', 'картка', 'картку', 'کارڈ', 'कार्ड']) },
  { topic: 'scam', en: 'report fraud scam', re: wordRegex(['scam', 'fraud', 'phishing', 'pettus', 'petis', 'мошенник', 'мошенничество', 'шахрай', 'шахрайство', 'دھوکا', 'فراڈ', 'धोखा', 'फ्रॉड']) },
  { topic: 'status', en: 'check transfer status', re: wordRegex(['where is my transfer', 'transfer status', 'staatus', 'статус перевода', 'статус переказу']) },
  { topic: 'refund', en: 'refund', re: wordRegex(['refund', 'money back', 'tagasimakse', 'raha tagasi', 'возврат', 'вернуть деньги', 'повернення', 'повернути гроші', 'ریفنڈ', 'पैसे वापस', 'रिफंड']) },
  { topic: 'rate', en: 'exchange rate', re: wordRegex(['exchange rate', 'rate', 'vahetuskurss', 'kurss', 'курс', 'ریٹ', 'रेट']) },
  { topic: 'verify', en: 'verify identity documents', re: wordRegex(['verify', 'verification', 'documents', 'identity', 'tuvastamine', 'dokumendid', 'верификация', 'документы', 'верифікація', 'документи', 'تصدیق', 'سत्यापन', 'वेरिफिकेशन']) },
  { topic: 'account', en: 'account details password', re: wordRegex(['password', 'email', 'account details', 'parool', 'пароль', 'پاس ورڈ', 'पासवर्ड']) }
];

function helpQuery(normalized) {
  const found = HELP_KEYWORDS.filter((entry) => entry.re.test(normalized));
  return found.length ? { topic: found[0].topic, query: found.map((entry) => entry.en).join(' ') } : null;
}

const anyMatch = (patterns, text) => (Array.isArray(patterns) ? patterns : [patterns]).some((re) => re.test(text));

const ORDINALS = [
  wordRegex(['first', '1st', 'first one', 'number one', 'pehla', 'pehle', 'pehli', 'پہلا', 'پہلے', 'پہلی', 'पहला', 'पहले', 'पहली', 'esimene', 'esimesele', 'первый', 'первому', 'первого', 'первая', 'перший', 'першому', 'першого']),
  wordRegex(['second', '2nd', 'second one', 'number two', 'doosra', 'dusra', 'doosre', 'dusre', 'دوسرا', 'دوسرے', 'दूसरा', 'दूसरे', 'teine', 'teisele', 'второй', 'второму', 'второго', 'вторая', 'другий', 'другому', 'другого']),
  wordRegex(['third', '3rd', 'third one', 'number three', 'teesra', 'teesre', 'تیسرا', 'तीसरा', 'kolmas', 'kolmandale', 'третий', 'третьему', 'третій', 'третьому'])
];

// ---- recipients ------------------------------------------------------------

const recipientRegexCache = new WeakMap();

function recipientRegexes(recipient) {
  if (!recipientRegexCache.has(recipient)) {
    const build = (list) => (list && list.length ? wordRegex(list) : null);
    recipientRegexCache.set(recipient, {
      full: build(recipient.match?.full),
      first: build(recipient.match?.first),
      relation: build(recipient.match?.relation)
    });
  }
  return recipientRegexCache.get(recipient);
}

export function matchRecipients(normalized, recipients) {
  const scored = recipients
    .map((recipient) => {
      const re = recipientRegexes(recipient);
      let score = 0;
      if (re.full?.test(normalized)) score += 4;
      if (re.first?.test(normalized)) score += 1;
      if (re.relation?.test(normalized)) score += 2;
      return { id: recipient.id, score };
    })
    .filter((item) => item.score > 0);
  if (!scored.length) return [];
  const top = Math.max(...scored.map((item) => item.score));
  return scored.filter((item) => item.score === top).map((item) => item.id);
}

const NOT_A_NAME = new Set([
  'me', 'him', 'her', 'them', 'someone', 'somebody', 'the', 'a', 'an', 'my', 'this', 'that', 'account', 'bank',
  'money', 'cash', 'send', 'please',
  'us', 'is', 'un', 'in', 'kis', 'kisi', 'unko', 'usko', 'mujh', 'aap', 'tum', 'paise', 'paisa', 'pese', 'phir', 'abhi',
  'اس', 'ان', 'کس', 'کسی', 'پیسے', 'उस', 'इन', 'उन', 'किस', 'किसी', 'पैसे'
].map((word) => normalize(word)));

// Pulls out a name the user said that is not one of the saved people, so the
// assistant can say "I could not find John" instead of a vague error.
const NAME_PATTERNS = {
  en: [/(?<![\p{L}])to\s+(?:my\s+friend\s+|my\s+|mr\.?\s+|mrs\.?\s+|ms\.?\s+)?([\p{L}]{2,})/u],
  ur: [/([\p{L}\p{M}]{2,})\s+(?:ko|کو)(?![\p{L}\p{M}])/u],
  hi: [/([\p{L}\p{M}]{2,})\s+(?:ko|को)(?![\p{L}\p{M}])/u]
};

function findUnknownName(normalized, original, lang) {
  for (const pattern of NAME_PATTERNS[lang] || []) {
    const match = pattern.exec(normalized);
    if (!match) continue;
    const candidate = match[1];
    if (NOT_A_NAME.has(candidate) || isCurrencyToken(candidate) || numberTable(lang).has(candidate)) continue;
    // Give the name back the way the user wrote it, when we can find it.
    const asWritten = new RegExp(candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'iu').exec(original);
    const name = asWritten ? asWritten[0] : candidate;
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return null;
}

// ---- main ------------------------------------------------------------------

export function understandWithRules(text, context) {
  const lang = context.lang || 'en';
  const normalized = normalize(text);
  const amount = parseAmount(normalized, lang);
  const currency = findCurrency(normalized);
  let recipientIds = matchRecipients(normalized, context.recipients);

  // "The first one" when the assistant has just offered a choice.
  if (context.stage === 'choose_recipient' && recipientIds.length !== 1 && context.candidates?.length) {
    const index = ORDINALS.findIndex((re) => re.test(normalized));
    if (index >= 0 && context.candidates[index]) recipientIds = [context.candidates[index]];
    else if (recipientIds.length > 1) {
      const narrowed = recipientIds.filter((id) => context.candidates.includes(id));
      if (narrowed.length) recipientIds = narrowed;
    }
  }

  const yes = RE.yes.test(normalized);
  const no = RE.no.test(normalized);
  const sendWord = anyMatch(RE.send, normalized);
  const hasSlots = amount !== null || recipientIds.length > 0;
  const isQuestion = anyMatch(QUESTION, normalized);
  const help = isQuestion && !hasSlots ? helpQuery(normalized) : null;

  let intent = 'unknown';
  let unknownRecipientName = null;

  if (help && !anyMatch(RE.balance, normalized) && !anyMatch(RE.status, normalized)) intent = 'ask_help';
  else if (RE.cancel.test(normalized)) intent = 'cancel';
  else if (RE.repeat.test(normalized)) intent = 'repeat';
  else if (anyMatch(RE.addRecipient, normalized)) intent = 'add_recipient';
  else if (anyMatch(RE.status, normalized)) intent = 'transfer_status';
  else if (anyMatch(RE.balance, normalized)) intent = 'check_balance';
  else if (hasSlots) intent = 'send_money';
  else if (RE.goBack.test(normalized) && !yes) intent = 'go_back';
  else if (no) intent = 'deny';
  else if (yes) intent = 'confirm';
  else if (sendWord) intent = 'send_money';
  else if (RE.close.test(normalized)) intent = 'close';
  else if (RE.help.test(normalized)) intent = 'help';
  else if (RE.greeting.test(normalized)) intent = 'greeting';
  else if (isQuestion && !hasSlots) intent = 'ask_help';

  if (intent === 'send_money' && recipientIds.length === 0 && sendWord) {
    unknownRecipientName = findUnknownName(normalized, text, lang);
  }

  return {
    intent,
    recipientIds,
    unknownRecipientName,
    amount,
    currency,
    helpQuery: intent === 'ask_help' ? help?.query || text : null,
    helpTopic: intent === 'ask_help' ? help?.topic || null : null,
    newRecipient: null,
    scamRisk: false,
    scamReason: null,
    engine: 'rules'
  };
}
