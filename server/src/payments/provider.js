// Payments provider.
//
// The rest of the app only talks to the functions exported here:
//   createQuote, createDraftTransfer, confirmTransfer, cancelTransfer,
//   getTransfer, listTransfers
// This file is the mock implementation (in-memory, no real money). To connect a
// real payments sandbox, write another module with the same functions that calls
// the sandbox (quote -> recipient -> transfer -> fund) and swap the import in
// routes/ and assistant/dialog.js. Nothing else needs to change.
import { config } from '../config.js';
import { store, nextId, findRecipient, addAlert } from '../store.js';
import { feeModel, getRate, isSupported, round2 } from './rates.js';

export class PaymentError extends Error {
  constructor(code, message, status = 400, extra = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

const QUOTE_TTL_MS = 10 * 60 * 1000;

export function createQuote({ sourceCurrency, targetCurrency, sourceAmount, targetAmount }) {
  if (!isSupported(sourceCurrency) || !isSupported(targetCurrency)) {
    throw new PaymentError('unsupported_currency', 'That currency is not supported.');
  }
  const hasSource = Number.isFinite(sourceAmount) && sourceAmount > 0;
  const hasTarget = Number.isFinite(targetAmount) && targetAmount > 0;
  if (hasSource === hasTarget) {
    throw new PaymentError('invalid_amount', 'Give either a source amount or a target amount.');
  }

  const rate = getRate(sourceCurrency, targetCurrency);
  const { fixed, percent } = feeModel(sourceCurrency, targetCurrency);

  let send;
  let receive;
  let fee;
  if (hasSource) {
    send = round2(sourceAmount);
    fee = round2(fixed + percent * send);
    receive = round2((send - fee) * rate);
  } else {
    receive = round2(targetAmount);
    send = round2((receive / rate + fixed) / (1 - percent));
    fee = round2(send - receive / rate);
  }
  if (receive <= 0) {
    throw new PaymentError('amount_too_small', 'That amount is too small to send.');
  }

  const quote = {
    id: nextId('qt'),
    sourceCurrency,
    targetCurrency,
    sourceAmount: send,
    targetAmount: receive,
    fee,
    rate: Number(rate.toFixed(4)),
    feeIncluded: true,
    delivery: 'seconds',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString()
  };
  store.quotes.set(quote.id, quote);
  return quote;
}

// Status moves draft -> processing -> completed. "Completed" is derived from a
// timestamp when the transfer is read, so there are no background timers.
function settle(transfer) {
  if (transfer.status === 'processing' && Date.now() >= new Date(transfer.completesAt).getTime()) {
    transfer.status = 'completed';
  }
  return transfer;
}

export function getTransfer(id) {
  const transfer = store.transfers.find((item) => item.id === id);
  return transfer ? settle(transfer) : null;
}

export function listTransfers({ includeDrafts = false } = {}) {
  return store.transfers
    .map(settle)
    .filter((transfer) => includeDrafts || !['draft', 'cancelled'].includes(transfer.status));
}

export function createDraftTransfer({ quoteId, recipientId, channel = 'app' }) {
  const quote = store.quotes.get(quoteId);
  if (!quote) throw new PaymentError('quote_not_found', 'That quote does not exist.', 404);
  if (Date.now() > new Date(quote.expiresAt).getTime()) {
    throw new PaymentError('quote_expired', 'That quote has expired. Ask for a new one.', 409);
  }
  const recipient = findRecipient(recipientId);
  if (!recipient) throw new PaymentError('recipient_not_found', 'That person is not saved.', 404);
  if (recipient.currency !== quote.targetCurrency) {
    throw new PaymentError('currency_mismatch', 'The quote does not match this person\'s currency.');
  }
  if (quote.sourceCurrency !== store.balance.currency) {
    throw new PaymentError('unsupported_currency', 'Transfers are paid from the EUR balance.');
  }

  const number = nextId('tr').split('-')[1];
  const transfer = {
    id: `tr-${number}`,
    reference: `SN-${number}`,
    quoteId,
    recipientId,
    channel,
    status: 'draft',
    sourceAmount: quote.sourceAmount,
    sourceCurrency: quote.sourceCurrency,
    targetAmount: quote.targetAmount,
    targetCurrency: quote.targetCurrency,
    fee: quote.fee,
    rate: quote.rate,
    pinAttempts: 0,
    createdAt: new Date().toISOString(),
    completesAt: null
  };
  store.transfers.unshift(transfer);
  return transfer;
}

export function cancelTransfer(id) {
  const transfer = getTransfer(id);
  if (!transfer) throw new PaymentError('transfer_not_found', 'That transfer does not exist.', 404);
  if (transfer.status === 'draft') transfer.status = 'cancelled';
  return transfer;
}

// The only function that moves money. It needs the PIN: nothing the voice
// assistant or the language model produces can reach this without it.
export function confirmTransfer(id, pin, { method = 'keypad' } = {}) {
  const transfer = getTransfer(id);
  if (!transfer) throw new PaymentError('transfer_not_found', 'That transfer does not exist.', 404);
  if (transfer.status !== 'draft') {
    throw new PaymentError('not_confirmable', 'This transfer can no longer be confirmed.', 409);
  }

  if (String(pin ?? '') !== config.demoPin) {
    transfer.pinAttempts += 1;
    const attemptsLeft = config.maxPinAttempts - transfer.pinAttempts;
    if (attemptsLeft <= 0) {
      transfer.status = 'cancelled';
      const recipient = findRecipient(transfer.recipientId);
      addAlert(
        'pin_locked',
        'A transfer was cancelled after 3 wrong PINs',
        `Nothing was sent. It was €${transfer.sourceAmount.toFixed(2)} to ${recipient?.name.en ?? 'a saved person'}.`
      );
      throw new PaymentError('pin_locked', 'Too many wrong PINs. The transfer was cancelled.', 423);
    }
    throw new PaymentError('wrong_pin', 'That PIN is not right.', 401, { attemptsLeft });
  }

  if (transfer.sourceAmount > store.balance.amount) {
    throw new PaymentError('insufficient_funds', 'There is not enough money for this transfer.', 409);
  }

  store.balance.amount = round2(store.balance.amount - transfer.sourceAmount);
  transfer.status = 'processing';
  transfer.confirmedAt = new Date().toISOString();
  transfer.confirmedBy = method;
  transfer.completesAt = new Date(Date.now() + config.arrivalDelayMs).toISOString();

  const recipient = findRecipient(transfer.recipientId);
  const how =
    transfer.channel !== 'voice'
      ? 'Sent from the app.'
      : method === 'voice'
        ? 'Done by voice: the owner\'s voice was recognised and the code was spoken.'
        : 'Started by voice, code typed on the screen.';
  addAlert(
    'transfer_sent',
    `${store.profile.firstName.en} sent €${transfer.sourceAmount.toFixed(2)} to ${recipient?.name.en ?? 'a saved person'}`,
    `${how} They receive ${transfer.targetCurrency} ${transfer.targetAmount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
  );
  return transfer;
}
