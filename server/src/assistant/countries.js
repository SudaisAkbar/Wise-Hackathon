// Countries a new recipient's bank can be in, for adding a recipient by voice.
import { stemRegex, normalize } from './text.js';

export const COUNTRIES = [
  {
    code: 'EE', currency: 'EUR',
    name: { en: 'Estonia', et: 'Eesti', ru: 'Эстония', uk: 'Естонія', ur: 'ایسٹونیا', hi: 'एस्टोनिया' },
    match: ['estonia', 'eesti', 'эстони', 'естоні', 'ایسٹونیا', 'एस्टोनिया']
  },
  {
    code: 'FI', currency: 'EUR',
    name: { en: 'Finland', et: 'Soome', ru: 'Финляндия', uk: 'Фінляндія', ur: 'فن لینڈ', hi: 'फ़िनलैंड' },
    match: ['finland', 'soome', 'финлянд', 'фінлянд', 'فن لینڈ', 'फिनलैंड', 'फ़िनलैंड']
  },
  {
    code: 'LV', currency: 'EUR',
    name: { en: 'Latvia', et: 'Läti', ru: 'Латвия', uk: 'Латвія', ur: 'لٹویا', hi: 'लातविया' },
    match: ['latvia', 'läti', 'латви', 'латві', 'لٹویا', 'लातविया']
  },
  {
    code: 'LT', currency: 'EUR',
    name: { en: 'Lithuania', et: 'Leedu', ru: 'Литва', uk: 'Литва', ur: 'لتھوانیا', hi: 'लिथुआनिया' },
    match: ['lithuania', 'leedu', 'литв', 'لتھوانیا', 'लिथुआनिया']
  },
  {
    code: 'DE', currency: 'EUR',
    name: { en: 'Germany', et: 'Saksamaa', ru: 'Германия', uk: 'Німеччина', ur: 'جرمنی', hi: 'जर्मनी' },
    match: ['germany', 'german', 'saksa', 'герман', 'німеч', 'جرمنی', 'जर्मनी']
  },
  {
    code: 'PL', currency: 'PLN',
    name: { en: 'Poland', et: 'Poola', ru: 'Польша', uk: 'Польща', ur: 'پولینڈ', hi: 'पोलैंड' },
    match: ['poland', 'polish', 'poola', 'польш', 'польщ', 'پولینڈ', 'पोलैंड']
  },
  {
    code: 'UA', currency: 'UAH',
    name: { en: 'Ukraine', et: 'Ukraina', ru: 'Украина', uk: 'Україна', ur: 'یوکرین', hi: 'यूक्रेन' },
    match: ['ukraine', 'ukrainian', 'ukraina', 'украин', 'україн', 'یوکرین', 'यूक्रेन']
  },
  {
    code: 'GB', currency: 'GBP',
    name: { en: 'United Kingdom', et: 'Suurbritannia', ru: 'Великобритания', uk: 'Велика Британія', ur: 'برطانیہ', hi: 'ब्रिटेन' },
    match: ['united kingdom', 'uk', 'england', 'britain', 'suurbritannia', 'inglismaa', 'великобритан', 'англи', 'британ', 'англі', 'برطانیہ', 'انگلینڈ', 'ब्रिटेन', 'इंग्लैंड']
  }
];

const patterns = COUNTRIES.map((country) => ({ country, re: stemRegex(country.match) }));

export function findCountry(text) {
  const normalized = normalize(text);
  if (!normalized) return null;
  return patterns.find(({ re }) => re.test(normalized))?.country ?? null;
}

export function countryList(lang) {
  return COUNTRIES.map((country) => country.name[lang] || country.name.en).join(', ');
}
