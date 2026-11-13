import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/store.js';
import { config } from '../src/config.js';
import {
  createQuote, createDraftTransfer, confirmTransfer, cancelTransfer, getTransfer, listTransfers, PaymentError
} from '../src/payments/provider.js';
import { freshState } from './helpers/setup.js';

test.beforeEach(freshState);

test('the design example: 150 EUR to Artem gives 636.12 PLN', () => {
  const quote = createQuote({ sourceCurrency: 'EUR', targetCurrency: 'PLN', sourceAmount: 150 });
  assert.equal(quote.fee, 1.03);
  assert.equal(quote.targetAmount, 636.12);
});

test('quote from a target amount works backwards to what the sender pays', () => {
  const quote = createQuote({ sourceCurrency: 'EUR', targetCurrency: 'UAH', targetAmount: 5000 });
  assert.equal(quote.targetAmount, 5000);
  const back = createQuote({ sourceCurrency: 'EUR', targetCurrency: 'UAH', sourceAmount: quote.sourceAmount });
  assert.ok(Math.abs(back.targetAmount - 5000) < 1, `round trip was ${back.targetAmount}`);
});

test('same-currency quote charges only the flat fee', () => {
  const quote = createQuote({ sourceCurrency: 'EUR', targetCurrency: 'EUR', sourceAmount: 420 });
  assert.equal(quote.fee, 0.25);
  assert.equal(quote.targetAmount, 419.75);
});

test('quote rejects bad input', () => {
  assert.throws(() => createQuote({ sourceCurrency: 'EUR', targetCurrency: 'XXX', sourceAmount: 10 }), PaymentError);
  assert.throws(() => createQuote({ sourceCurrency: 'EUR', targetCurrency: 'PLN' }), PaymentError);
  assert.throws(() => createQuote({ sourceCurrency: 'EUR', targetCurrency: 'PLN', sourceAmount: 5, targetAmount: 5 }), PaymentError);
  assert.throws(() => createQuote({ sourceCurrency: 'EUR', targetCurrency: 'PLN', sourceAmount: 0.3 }), PaymentError);
});

test('a draft moves no money; the right code does, and it then arrives', async () => {
  const before = store.balance.amount;
  const quote = createQuote({ sourceCurrency: 'EUR', targetCurrency: 'PLN', sourceAmount: 100 });
  const draft = createDraftTransfer({ quoteId: quote.id, recipientId: 'r-artem-kovalenko', channel: 'voice' });
  assert.equal(draft.status, 'draft');
  assert.equal(store.balance.amount, before);
  assert.equal(listTransfers().some((t) => t.id === draft.id), false, 'drafts are not listed as activity');

  const sent = confirmTransfer(draft.id, config.demoPin, { method: 'voice' });
  assert.equal(sent.status, 'processing');
  assert.equal(sent.confirmedBy, 'voice');
  assert.equal(store.balance.amount, before - 100);
  assert.match(store.alerts[0].detail, /voice was recognised/);

  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(getTransfer(draft.id).status, 'completed');
});

test('wrong code sends nothing and locks after three tries', () => {
  const before = store.balance.amount;
  const quote = createQuote({ sourceCurrency: 'EUR', targetCurrency: 'PLN', sourceAmount: 50 });
  const draft = createDraftTransfer({ quoteId: quote.id, recipientId: 'r-artem-kovalenko' });
  for (const left of [2, 1]) {
    assert.throws(() => confirmTransfer(draft.id, '0000'), (error) => error.code === 'wrong_pin' && error.extra.attemptsLeft === left);
  }
  assert.throws(() => confirmTransfer(draft.id, '0000'), (error) => error.code === 'pin_locked' && error.status === 423);
  assert.equal(getTransfer(draft.id).status, 'cancelled');
  assert.throws(() => confirmTransfer(draft.id, config.demoPin), (error) => error.code === 'not_confirmable');
  assert.equal(store.balance.amount, before);
});

test('a transfer cannot be confirmed twice or after cancelling', () => {
  const quote = createQuote({ sourceCurrency: 'EUR', targetCurrency: 'EUR', sourceAmount: 20 });
  const draft = createDraftTransfer({ quoteId: quote.id, recipientId: 'r-mart-tamm' });
  confirmTransfer(draft.id, config.demoPin);
  assert.throws(() => confirmTransfer(draft.id, config.demoPin), (error) => error.code === 'not_confirmable');
  const other = createDraftTransfer({ quoteId: createQuote({ sourceCurrency: 'EUR', targetCurrency: 'EUR', sourceAmount: 20 }).id, recipientId: 'r-mart-tamm' });
  cancelTransfer(other.id);
  assert.throws(() => confirmTransfer(other.id, config.demoPin), (error) => error.code === 'not_confirmable');
});

test('draft needs a saved recipient whose currency matches the quote', () => {
  const quote = createQuote({ sourceCurrency: 'EUR', targetCurrency: 'PLN', sourceAmount: 20 });
  assert.throws(() => createDraftTransfer({ quoteId: quote.id, recipientId: 'nobody' }), (error) => error.code === 'recipient_not_found');
  assert.throws(() => createDraftTransfer({ quoteId: quote.id, recipientId: 'r-mart-tamm' }), (error) => error.code === 'currency_mismatch');
});
