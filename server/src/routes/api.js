import { Router } from 'express';
import { config } from '../config.js';
import { store, resetStore, publicRecipient } from '../store.js';
import {
  createQuote, createDraftTransfer, confirmTransfer, cancelTransfer, getTransfer, listTransfers, PaymentError
} from '../payments/provider.js';
import { SUPPORTED_CURRENCIES } from '../payments/rates.js';
import { LANGUAGES } from '../assistant/languages.js';
import { handleTurn, transferView, createRecipient } from '../assistant/dialog.js';
import { COUNTRIES } from '../assistant/countries.js';
import { engineStatus } from '../assistant/nlu/index.js';
import { voiceStatus, forgetVoice, updateVoiceSettings } from '../voice/profile.js';
import { ARTICLES } from '../help/articles.js';

export const api = Router();

const languages = () =>
  Object.values(LANGUAGES).map(({ code, label, short, stt, tts, numberLocale }) => ({ code, label, short, stt, tts, numberLocale }));

// Everything that changes while the app is open. The client polls this.
function liveState() {
  return {
    balance: store.balance,
    recipients: store.recipients.map(publicRecipient),
    transfers: listTransfers().map(transferView),
    cardPayments: store.cardPayments,
    alerts: store.alerts.slice(0, 30),
    helperRequests: store.helperRequests.filter((request) => request.status === 'open'),
    settings: store.settings,
    ai: engineStatus(),
    voice: voiceStatus(),
    help: { articles: ARTICLES.length, live: config.helpLiveFetch }
  };
}

api.get('/health', (req, res) => {
  res.json({ ok: true, app: config.appName, ai: engineStatus(), voice: voiceStatus() });
});

api.get('/bootstrap', (req, res) => {
  res.json({
    app: { name: config.appName, demo: true, demoPin: config.demoPin },
    profile: store.profile,
    helper: store.helper,
    languages: languages(),
    currencies: SUPPORTED_CURRENCIES,
    countries: COUNTRIES.map(({ code, currency, name }) => ({ code, currency, name: name.en })),
    ...liveState()
  });
});

api.get('/state', (req, res) => res.json(liveState()));

// ---- payments ------------------------------------------------------------------

api.post('/quotes', (req, res) => {
  const { sourceCurrency = store.balance.currency, targetCurrency, sourceAmount, targetAmount } = req.body ?? {};
  const quote = createQuote({
    sourceCurrency,
    targetCurrency,
    sourceAmount: sourceAmount === undefined ? undefined : Number(sourceAmount),
    targetAmount: targetAmount === undefined ? undefined : Number(targetAmount)
  });
  res.status(201).json(quote);
});

api.get('/transfers', (req, res) => res.json(listTransfers().map(transferView)));

api.get('/transfers/:id', (req, res) => {
  const transfer = getTransfer(req.params.id);
  if (!transfer) throw new PaymentError('transfer_not_found', 'That transfer does not exist.', 404);
  res.json(transferView(transfer));
});

api.post('/transfers', (req, res) => {
  const { quoteId, recipientId } = req.body ?? {};
  res.status(201).json(transferView(createDraftTransfer({ quoteId, recipientId, channel: 'app' })));
});

// Confirm with the code typed on a keypad. (A spoken code goes through the
// assistant as a 'code' event, where the owner's voice is checked as well.)
api.post('/transfers/:id/confirm', (req, res) => {
  res.json(transferView(confirmTransfer(req.params.id, req.body?.pin, { method: 'keypad' })));
});

api.post('/transfers/:id/cancel', (req, res) => {
  res.json(transferView(cancelTransfer(req.params.id)));
});

// ---- assistant -----------------------------------------------------------------

api.post('/assistant/message', async (req, res) => {
  const { sessionId, lang, text, event, input, voice } = req.body ?? {};
  res.json(await handleTurn({ sessionId, lang, text, event, input, voice }));
});

// ---- voice match ---------------------------------------------------------------

api.get('/voice', (req, res) => res.json(voiceStatus()));

api.patch('/voice', (req, res) => {
  const { enabled, sensitivity } = req.body ?? {};
  res.json(updateVoiceSettings({ enabled, sensitivity: sensitivity === undefined ? undefined : Number(sensitivity) }));
});

api.delete('/voice', (req, res) => res.json(forgetVoice()));

// ---- family helper -------------------------------------------------------------

api.post('/helper/recipients', (req, res) => {
  const name = String(req.body?.name ?? '').replace(/\s+/g, ' ').trim();
  const relation = String(req.body?.relation ?? '').trim().slice(0, 30) || 'Recipient';
  const country = String(req.body?.country ?? '').trim().slice(0, 40) || 'Not given';
  const currency = String(req.body?.currency ?? '');
  const account = String(req.body?.accountNumber ?? '').replace(/\W/g, '').toUpperCase();

  if (name.length < 2 || name.length > 40) throw new PaymentError('invalid_name', 'Give a name between 2 and 40 letters.');
  if (!SUPPORTED_CURRENCIES.includes(currency)) throw new PaymentError('unsupported_currency', 'Choose one of the listed currencies.');
  if (account.length < 4) throw new PaymentError('invalid_account', 'Give an account number with at least 4 characters.');

  const recipient = createRecipient({ name, relation, country, currency, account, addedBy: 'helper' });
  res.status(201).json(publicRecipient(recipient));
});

api.patch('/helper/settings', (req, res) => {
  const limit = Number(req.body?.voiceLimit);
  if (!Number.isFinite(limit) || limit < 10 || limit > 5000) {
    throw new PaymentError('invalid_limit', 'The voice limit must be between 10 and 5000.');
  }
  store.settings.voiceLimit = Math.round(limit);
  res.json(store.settings);
});

// ---- demo ----------------------------------------------------------------------

// Resets the money and people. The owner's voice profile is kept on purpose.
api.post('/demo/reset', (req, res) => {
  resetStore();
  res.json({ ok: true });
});
