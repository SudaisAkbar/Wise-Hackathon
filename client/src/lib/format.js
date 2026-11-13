// Number and date formatting, in the style of the design ("150 EUR", "636.12 PLN").

const WHOLE_UNITS = new Set(['PKR', 'INR']);
const LOCALE = { en: 'en-GB', et: 'et-EE', ru: 'ru-RU', uk: 'uk-UA', ur: 'en-GB', hi: 'en-IN' };

function number(amount, currency, lang, { always2 = false } = {}) {
  const whole = WHOLE_UNITS.has(currency);
  const hasCents = !whole && Math.round(amount * 100) % 100 !== 0;
  const digits = whole ? 0 : always2 || hasCents ? 2 : 0;
  return new Intl.NumberFormat(LOCALE[lang] || 'en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
}

// "150 EUR", "636.12 PLN" (cents only when there are any)
export const code = (amount, currency, lang = 'en') => `${number(amount, currency, lang)} ${currency}`;
// "150.00" (always two decimals), used for the big Ready to send amount
export const fixed = (amount, currency, lang = 'en') => number(amount, currency, lang, { always2: !WHOLE_UNITS.has(currency) });
// "1,240.50 EUR"
export const balance = (amount, currency, lang = 'en') => `${number(amount, currency, lang, { always2: true })} ${currency}`;
// "€1,240.50"
export function symbol(amount, currency, lang = 'en') {
  try {
    return new Intl.NumberFormat(LOCALE[lang] || 'en-GB', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(amount);
  } catch {
    return code(amount, currency, lang);
  }
}

export const pick = (localized, lang) => (localized && (localized[lang] || localized.en)) || '';

export function initials(name) {
  return String(name || '').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

export function shortDate(iso) {
  const date = new Date(iso);
  if (date.toDateString() === new Date().toDateString()) return 'Today';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function timeLabel(iso) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return date.toDateString() === new Date().toDateString() ? time : `${shortDate(iso)}, ${time}`;
}
