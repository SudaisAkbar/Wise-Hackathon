// Demo exchange rates, expressed as "1 EUR buys this much".
// These are fixed sample values, not live market data.
export const RATES_PER_EUR = {
  EUR: 1,
  PLN: 4.2701,
  UAH: 48.6,
  USD: 1.16,
  GBP: 0.87,
  PKR: 320.87,
  INR: 102.5
};

export const SUPPORTED_CURRENCIES = Object.keys(RATES_PER_EUR);

// Demo pricing: a small fixed part plus a percentage, charged in the source currency.
export const FEES = {
  sameCurrencyFixedEur: 0.25,
  crossCurrencyFixedEur: 0.35,
  crossCurrencyPercent: 0.0045
};

export const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function isSupported(currency) {
  return Object.hasOwn(RATES_PER_EUR, currency);
}

export function getRate(source, target) {
  if (!isSupported(source) || !isSupported(target)) {
    throw new Error(`Unsupported currency pair ${source} to ${target}`);
  }
  return RATES_PER_EUR[target] / RATES_PER_EUR[source];
}

export function feeModel(source, target) {
  const eurToSource = RATES_PER_EUR[source];
  if (source === target) {
    return { fixed: FEES.sameCurrencyFixedEur * eurToSource, percent: 0 };
  }
  return { fixed: FEES.crossCurrencyFixedEur * eurToSource, percent: FEES.crossCurrencyPercent };
}
