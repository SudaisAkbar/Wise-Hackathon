// The conversation manager.
//
// One turn = one thing the user said (or a tap, or an event from the browser).
//   1. voice match           (is this the owner speaking? shared/voiceprint.js)
//   2. scam guard            (fixed rules)
//   3. understand            (Claude or the built-in rules -> a small intent object)
//   4. decide                (this file: plain code, no model involved)
//   5. reply from a template (messages.js), or a Help Centre answer
//
// The steps follow the design: Please check -> Ready to send -> Enter your
// code -> Money sent. Money only moves in handleCode(), which needs the owner's
// 4-digit code, and when it is spoken, the owner's voice. The code never goes
// to the language model.
import { store, findRecipient, publicRecipient, addAlert, nextId } from '../store.js';
import {
  createQuote, createDraftTransfer, confirmTransfer, cancelTransfer, getTransfer, listTransfers, PaymentError
} from '../payments/provider.js';
import { LANGUAGES, DEFAULT_LANGUAGE, isLanguage, moneyWords } from './languages.js';
import { render, ENROLL_PHRASES } from './messages.js';
import { detectScam } from './scamGuard.js';
import { understand } from './nlu/index.js';
import { findCountry, countryList, COUNTRIES } from './countries.js';
import { answerQuestion } from '../help/answer.js';
import { checkVoice, voiceCheckActive, voiceStatus, enroll as enrollVoice } from '../voice/profile.js';
import { isEmbedding, MIN_VOICED_FRAMES } from '../../../shared/voiceprint.js';
import { spokenAccount, spellOut, groupAccount, hasWakePhrase } from '../../../shared/spoken.js';

const MIN_AMOUNT = 1;
const RUPEES = ['PKR', 'INR'];
const ENROLL_STEPS = 3;
const VERIFIED_FOR_MS = 3 * 60 * 1000;

const emptySlots = () => ({ recipientId: null, amount: null, currency: null });
const emptyAdd = () => ({ name: null, relation: null, country: null, account: null });

export { hasWakePhrase };

function getSession(sessionId, lang) {
  const id = sessionId && typeof sessionId === 'string' ? sessionId.slice(0, 64) : nextId('ss');
  let session = store.sessions.get(id);
  if (!session) {
    session = {
      id, lang: DEFAULT_LANGUAGE, stage: 'idle', slots: emptySlots(), candidates: [], draftId: null,
      last: null, beforePause: null, paused: null, verifiedAt: 0, enrollSamples: [], add: emptyAdd(),
      pendingName: null, lastSaid: null, codeVoiceFails: 0
    };
    store.sessions.set(id, session);
  }
  if (isLanguage(lang)) session.lang = lang;
  return session;
}

// ---- wording helpers ---------------------------------------------------------

const pick = (localized, lang) => (localized && (localized[lang] || localized.en)) || '';
const helperName = (lang) => pick(store.helper.name, lang);
const userName = (lang) => pick(store.profile.firstName, lang);

function sentBefore(transfer) {
  return store.transfers.some(
    (item) => item.id !== transfer.id && item.recipientId === transfer.recipientId && ['processing', 'completed'].includes(item.status)
  );
}

export function transferView(transfer) {
  return transfer
    ? { ...transfer, recipient: publicRecipient(findRecipient(transfer.recipientId)), sentBefore: sentBefore(transfer) }
    : null;
}

function transferParams(transfer, lang) {
  const recipient = findRecipient(transfer.recipientId);
  return {
    full: pick(recipient?.name, lang),
    first: pick(recipient?.first, lang) || pick(recipient?.name, lang),
    rel: pick(recipient?.relationPhrase, lang),
    send: moneyWords(transfer.sourceAmount, transfer.sourceCurrency, lang),
    get: moneyWords(transfer.targetAmount, transfer.targetCurrency, lang),
    fee: moneyWords(transfer.fee, transfer.sourceCurrency, lang),
    helper: helperName(lang),
    sentBefore: sentBefore(transfer)
  };
}

// listen: what the browser should listen for after speaking the reply.
//   'command' - the next request; 'code' - the 4-digit code (kept away from the
//   language model); 'enroll' - a voice sample; 'wake' - only "Hey Wise".
function listenFor(session, expectsReply) {
  if (session.paused) return 'wake';
  if (session.stage === 'enroll') return 'enroll';
  if (session.stage === 'code') return 'code';
  return expectsReply === false ? null : 'command';
}

function finish(session, reply, ui, { expectsReply = true, engine = 'event', close = false, listen } = {}) {
  session.last = { reply, ui, expectsReply };
  return {
    sessionId: session.id,
    stage: session.stage,
    paused: session.paused,
    activeDraftId: session.draftId,
    reply,
    ui,
    expectsReply,
    listen: close ? 'wake' : listen === undefined ? listenFor(session, expectsReply) : listen,
    close,
    engine,
    voice: voiceStatus()
  };
}

function respond(session, key, paramsFor = () => ({}), { ui = { type: 'none' }, ...options } = {}) {
  const lang = session.lang;
  const text = render(key, lang, paramsFor(lang));
  const speech = [{ locale: LANGUAGES[lang].tts, text }];
  // Few devices have an Urdu voice. Everyday spoken Hindi is understood by Urdu
  // speakers, so it is offered as the second choice for reading aloud.
  if (lang === 'ur') speech.push({ locale: LANGUAGES.hi.tts, text: render(key, 'hi', paramsFor('hi')) });
  return finish(session, { key, lang, text, speech }, ui, options);
}

function respondText(session, key, text, options = {}) {
  const lang = session.lang;
  const reply = { key, lang, text, speech: [{ locale: LANGUAGES[lang].tts, text }] };
  return finish(session, reply, options.ui || { type: 'none' }, options);
}

function clearDraft(session) {
  if (session.draftId) {
    const draft = getTransfer(session.draftId);
    if (draft?.status === 'draft') cancelTransfer(draft.id);
    session.draftId = null;
  }
}

function resetConversation(session) {
  clearDraft(session);
  session.slots = emptySlots();
  session.candidates = [];
  session.add = emptyAdd();
  session.pendingName = null;
  session.codeVoiceFails = 0;
  session.stage = 'idle';
}

const recentlyVerified = (session) => !voiceCheckActive() || Date.now() - session.verifiedAt < VERIFIED_FOR_MS;
const draftOf = (session) => {
  const draft = session.draftId ? getTransfer(session.draftId) : null;
  return draft?.status === 'draft' ? draft : null;
};

// ---- the transfer steps -------------------------------------------------------

function askRecipient(session, key, engine) {
  session.stage = 'collecting';
  return respond(session, key, undefined, {
    ui: { type: 'people', recipients: store.recipients.map(publicRecipient) },
    engine
  });
}

function showReview(session, draft, engine, key = 'review') {
  session.stage = 'review';
  return respond(session, key === 'review' ? 'review' : key, (lang) => transferParams(draft, lang), {
    ui: { type: 'review', transfer: transferView(draft), said: session.lastSaid },
    engine
  });
}

function showReady(session, draft, engine) {
  session.stage = 'ready';
  return respond(session, 'readyToSend', (lang) => transferParams(draft, lang), {
    ui: { type: 'ready', transfer: transferView(draft) },
    engine
  });
}

function showCode(session, draft, engine, key = 'askCode', params = {}, extra = {}) {
  session.stage = 'code';
  return respond(session, key, () => params, {
    ui: { type: 'code', transfer: transferView(draft), ...extra },
    engine
  });
}

// Works out the next step from what is known so far.
function advance(session, engine) {
  const { slots } = session;

  if (!slots.recipientId && session.candidates.length > 1) {
    session.stage = 'choose_recipient';
    const people = session.candidates.map(findRecipient).filter(Boolean);
    return respond(session, 'askWhich', (lang) => ({ name: pick(people[0].first, lang) }), {
      ui: { type: 'choices', recipients: people.map(publicRecipient) },
      engine
    });
  }

  const recipient = slots.recipientId ? findRecipient(slots.recipientId) : null;
  if (!recipient) {
    slots.recipientId = null;
    return askRecipient(session, 'askRecipient', engine);
  }

  if (slots.amount === null) {
    session.stage = 'collecting';
    return respond(session, 'askAmount', (lang) => ({ first: pick(recipient.first, lang) || pick(recipient.name, lang) }), {
      ui: { type: 'recipient', recipient: publicRecipient(recipient) },
      engine
    });
  }

  const retryAmount = (key, paramsFor) => {
    slots.amount = null;
    slots.currency = null;
    session.stage = 'collecting';
    return respond(session, key, paramsFor, { ui: { type: 'recipient', recipient: publicRecipient(recipient) }, engine });
  };

  const base = store.balance.currency;
  let currency = slots.currency || base;
  if (RUPEES.includes(currency) && RUPEES.includes(recipient.currency)) currency = recipient.currency;

  let amounts;
  if (currency === base) amounts = { sourceAmount: slots.amount };
  else if (currency === recipient.currency) amounts = { targetAmount: slots.amount };
  else return retryAmount('currencyUnsupported');

  if (!(slots.amount >= MIN_AMOUNT)) return retryAmount('amountInvalid');

  let quote;
  try {
    quote = createQuote({ sourceCurrency: base, targetCurrency: recipient.currency, ...amounts });
  } catch (error) {
    if (error instanceof PaymentError) return retryAmount('amountInvalid');
    throw error;
  }

  if (quote.sourceAmount > store.settings.voiceLimit) {
    return retryAmount('overLimit', (lang) => ({ limit: moneyWords(store.settings.voiceLimit, base, lang) }));
  }
  if (quote.sourceAmount > store.balance.amount) {
    return retryAmount('insufficient', (lang) => ({ balance: moneyWords(store.balance.amount, base, lang) }));
  }

  clearDraft(session);
  const draft = createDraftTransfer({ quoteId: quote.id, recipientId: recipient.id, channel: 'voice' });
  session.draftId = draft.id;
  session.codeVoiceFails = 0;
  return showReview(session, draft, engine);
}

function applySend(session, nlu) {
  const { slots } = session;

  if (nlu.recipientIds.length === 1) {
    slots.recipientId = nlu.recipientIds[0];
    session.candidates = [];
  } else if (nlu.recipientIds.length > 1) {
    slots.recipientId = null;
    session.candidates = nlu.recipientIds;
  } else if (nlu.unknownRecipientName) {
    return unknownRecipient(session, nlu.unknownRecipientName, nlu.engine);
  }

  if (nlu.amount !== null) {
    slots.amount = nlu.amount;
    slots.currency = nlu.currency ?? slots.currency;
  } else if (nlu.currency && slots.amount !== null) {
    slots.currency = nlu.currency;
  }

  return advance(session, nlu.engine);
}

function unknownRecipient(session, spokenName, engine) {
  const name = spokenName.trim().slice(0, 40);
  clearDraft(session);
  session.slots = emptySlots();
  session.candidates = [];
  session.pendingName = name;
  session.stage = 'offer_add';
  return respond(session, 'unknownNamed', () => ({ name }), {
    ui: { type: 'offer_add', name },
    engine
  });
}

function goForward(session, engine) {
  const draft = draftOf(session);
  if (session.stage === 'review' && draft) return showReady(session, draft, engine);
  if (session.stage === 'ready' && draft) return showCode(session, draft, engine);
  if (session.stage === 'code' && draft) return showCode(session, draft, engine);
  if (session.stage === 'collecting' || session.stage === 'choose_recipient') return advance(session, engine);
  return respond(session, 'nothingToConfirm', undefined, { engine });
}

function goBack(session, engine) {
  const draft = draftOf(session);
  if (session.stage === 'code' && draft) return showReady(session, draft, engine);
  if (session.stage === 'ready' && draft) {
    session.stage = 'review';
    const reply = showReview(session, draft, engine);
    const lead = render('goneBack', session.lang);
    reply.reply = { ...reply.reply, text: `${lead} ${reply.reply.text}`, speech: reply.reply.speech.map((s) => ({ ...s, text: `${lead} ${s.text}` })) };
    session.last.reply = reply.reply;
    return reply;
  }
  if (session.stage === 'review') return changeReview(session, engine);
  return respond(session, 'notUnderstood', undefined, { engine });
}

function changeReview(session, engine) {
  clearDraft(session);
  session.stage = 'collecting';
  return respond(session, 'changeWhat', undefined, { engine });
}

// ---- the spoken (or typed) code -------------------------------------------------

function handleCode(session, event, voice) {
  const draft = draftOf(session);
  if (session.stage !== 'code' || !draft) return respond(session, 'nothingToConfirm');

  const method = event.method === 'keypad' ? 'keypad' : 'voice';
  if (method === 'voice' && voiceCheckActive()) {
    const check = checkVoice(voice?.embedding, 'code');
    if (check.decision === 'mismatch') return pause(session, 'code');
    if (check.decision !== 'match') {
      session.codeVoiceFails += 1;
      if (session.codeVoiceFails >= 2) return showCode(session, draft, 'event', 'codeByHand', {}, { keypad: true });
      return showCode(session, draft, 'event', 'voiceUnclear');
    }
    session.verifiedAt = Date.now();
  }

  const code = String(event.code ?? '');
  if (!/^\d{4}$/.test(code)) return showCode(session, draft, 'event', 'codeUnclear');

  try {
    const sent = confirmTransfer(draft.id, code, { method });
    session.draftId = null;
    session.slots = emptySlots();
    session.candidates = [];
    session.stage = 'idle';
    session.codeVoiceFails = 0;
    return respond(session, 'sent', (lang) => transferParams(sent, lang), { ui: { type: 'sent', transfer: transferView(sent) } });
  } catch (error) {
    if (!(error instanceof PaymentError)) throw error;
    if (error.code === 'wrong_pin') {
      return showCode(session, draft, 'event', 'codeWrong', { n: error.extra.attemptsLeft }, { wrong: true, attemptsLeft: error.extra.attemptsLeft });
    }
    if (error.code === 'pin_locked') {
      session.draftId = null;
      resetConversation(session);
      return respond(session, 'pinLocked');
    }
    if (error.code === 'insufficient_funds') {
      resetConversation(session);
      return respond(session, 'insufficient', (lang) => ({ balance: moneyWords(store.balance.amount, store.balance.currency, lang) }));
    }
    resetConversation(session);
    return respond(session, 'nothingToConfirm');
  }
}

// ---- pause and resume (someone else spoke) ----------------------------------------

function pause(session, reason) {
  if (!session.paused) session.beforePause = session.last;
  session.paused = reason || 'voice';
  addAlert(
    'voice_paused',
    `Another voice was heard while ${store.profile.firstName.en} was using voice`,
    'The assistant paused and sent nothing. It continues when the owner says "Hey Wise".'
  );
  return respond(session, 'paused', undefined, { ui: { type: 'paused' }, expectsReply: false });
}

function resume(session) {
  session.paused = null;
  session.verifiedAt = Date.now();
  const before = session.beforePause;
  session.beforePause = null;
  const welcome = render('welcomeBack', session.lang, { name: userName(session.lang) });
  // Nothing half-done (an answer was on screen): just ask what they need.
  const FLOW = ['review', 'ready', 'code', 'add', 'choices', 'people', 'recipient', 'offer_add'];
  if (!before || !FLOW.includes(before.ui?.type)) return respond(session, 'greeting', (lang) => ({ name: userName(lang) }));

  // Repeat what was on screen before the pause, as long as it is still valid.
  let ui = before.ui;
  if (['review', 'ready', 'code'].includes(ui?.type) && !draftOf(session)) {
    ui = { type: 'none' };
    session.stage = 'idle';
  }
  const text = `${welcome} ${before.reply.text}`;
  const reply = {
    ...before.reply,
    text,
    speech: before.reply.speech.map((option) => ({ ...option, text: `${welcome} ${option.text}` }))
  };
  return finish(session, reply, ui, { expectsReply: before.expectsReply });
}

// "Hey Wise": from the home screen, after a pause, or after standby.
function handleWake(session, voice) {
  if (voiceCheckActive()) {
    const check = checkVoice(voice?.embedding, 'wake');
    if (check.decision !== 'match') {
      return respond(session, 'notOwner', undefined, { ui: { type: 'not_owner' }, expectsReply: false, listen: 'wake' });
    }
    session.verifiedAt = Date.now();
  }
  if (session.paused) return resume(session);
  // First time from the home screen: learn the owner's voice before anything else.
  if (!voiceCheckActive() && voiceStatus().enabled && !voiceStatus().enrolled && session.stage === 'idle') {
    return startEnroll(session);
  }
  if (session.last && session.stage !== 'idle') {
    session.beforePause = session.last;
    session.paused = 'standby';
    return resume(session);
  }
  return respond(session, 'greeting', (lang) => ({ name: userName(lang) }));
}

// ---- teaching the assistant the owner's voice -----------------------------------

function startEnroll(session) {
  resetConversation(session);
  session.stage = 'enroll';
  session.enrollSamples = [];
  const phrases = ENROLL_PHRASES[session.lang] || ENROLL_PHRASES.en;
  return respond(session, 'enrollIntro', () => ({ phrase: phrases[0] }), {
    ui: { type: 'enroll', step: 0, total: ENROLL_STEPS, phrase: phrases[0] }
  });
}

function enrollSample(session, voice) {
  if (session.stage !== 'enroll') return startEnroll(session);
  const phrases = ENROLL_PHRASES[session.lang] || ENROLL_PHRASES.en;
  const step = session.enrollSamples.length;
  const embedding = voice?.embedding;
  if (!isEmbedding(embedding) || embedding.voicedFrames < MIN_VOICED_FRAMES) {
    return respond(session, 'enrollRetry', () => ({ phrase: phrases[step] }), {
      ui: { type: 'enroll', step, total: ENROLL_STEPS, phrase: phrases[step], retry: true }
    });
  }
  session.enrollSamples.push(embedding);
  if (session.enrollSamples.length < ENROLL_STEPS) {
    const next = session.enrollSamples.length;
    return respond(session, 'enrollNext', () => ({ phrase: phrases[next] }), {
      ui: { type: 'enroll', step: next, total: ENROLL_STEPS, phrase: phrases[next] }
    });
  }
  enrollVoice(session.enrollSamples);
  session.enrollSamples = [];
  session.stage = 'idle';
  session.verifiedAt = Date.now();
  addAlert('voice_enrolled', `${store.profile.firstName.en} set up voice match`, 'Only this voice can now send money by voice.');
  return respond(session, 'enrollDone', undefined, { ui: { type: 'enrolled' } });
}

// ---- adding a recipient by voice ---------------------------------------------------

const LEAD_INS = /^(his|her|their)\s+name\s+is\s+|^the\s+name\s+is\s+|^name\s+is\s+|^it'?s\s+|^его\s+зовут\s+|^её\s+зовут\s+|^ее\s+зовут\s+|^його\s+звати\s+|^її\s+звати\s+|^це\s+|^tema\s+nimi\s+on\s+|^nimi\s+on\s+|^ان\s+کا\s+نام\s+|^उनका\s+नाम\s+/iu;

const POSSESSIVE = /^(my|our|a|an|minu|meie|мой|моя|моё|мій|моя|моє|میرا|میری|میرے|मेरा|मेरी|मेरे)\s+/iu;

const titleCase = (text) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ');

function cleanAnswer(text, max) {
  return String(text || '')
    .trim()
    .replace(LEAD_INS, '')
    .replace(/[.!?。۔।,]+$/u, '')
    .replace(/\s+/g, ' ')
    .slice(0, max)
    .trim();
}

function addStep(session, engine) {
  const lang = session.lang;
  const add = session.add;
  const first = add.name ? add.name.split(' ')[0] : '';
  const ui = { type: 'add', draft: addView(add, lang) };
  if (!add.name) {
    session.stage = 'add_name';
    return respond(session, 'addAskName', undefined, { ui, engine });
  }
  if (!add.relation) {
    session.stage = 'add_relation';
    return respond(session, 'addAskRelation', () => ({ name: add.name }), { ui, engine });
  }
  if (!add.country) {
    session.stage = 'add_country';
    return respond(session, 'addAskCountry', () => ({ first }), { ui, engine });
  }
  if (!add.account) {
    session.stage = 'add_account';
    return respond(session, 'addAskAccount', () => ({ first }), { ui, engine });
  }
  session.stage = 'add_confirm';
  return respond(session, 'addConfirm', (l) => ({
    name: add.name,
    first,
    relation: add.relation,
    country: add.country.name[l] || add.country.name.en,
    spelled: spellOut(add.account)
  }), { ui, engine });
}

function addView(add, lang) {
  return {
    name: add.name,
    relation: add.relation,
    country: add.country ? add.country.name[lang] || add.country.name.en : null,
    currency: add.country?.currency ?? null,
    account: add.account ? groupAccount(add.account) : null
  };
}

function mergeAdd(session, details) {
  if (!details) return;
  const add = session.add;
  if (details.name && !add.name) add.name = titleCase(cleanAnswer(details.name, 40));
  if (details.relationship && !add.relation) add.relation = titleCase(cleanAnswer(details.relationship, 30).replace(POSSESSIVE, ''));
  if (details.country && !add.country) add.country = findCountry(details.country);
  if (details.accountNumber && !add.account) {
    const account = details.accountNumber.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (account.length >= 8 && account.length <= 34) add.account = account;
  }
}

function startAdd(session, nlu) {
  clearDraft(session);
  session.slots = emptySlots();
  session.add = emptyAdd();
  if (session.pendingName) session.add.name = titleCase(session.pendingName);
  session.pendingName = null;
  mergeAdd(session, nlu?.newRecipient);
  return addStep(session, nlu?.engine || 'event');
}

// An answer while adding: Claude fills newRecipient; otherwise the whole
// sentence is the answer to the question that was asked.
function answerAdd(session, text, nlu) {
  const add = session.add;
  const before = { ...add };
  mergeAdd(session, nlu.newRecipient);
  const unchanged = JSON.stringify(before) === JSON.stringify(add);

  if (unchanged) {
    const value = cleanAnswer(text, 40);
    if (session.stage === 'add_name' && /\p{L}{2,}/u.test(value)) add.name = titleCase(value);
    else if (session.stage === 'add_relation' && /\p{L}{2,}/u.test(value)) add.relation = titleCase(cleanAnswer(text, 30).replace(POSSESSIVE, ''));
    else if (session.stage === 'add_country') {
      add.country = findCountry(text);
      if (!add.country) {
        return respond(session, 'addCountryUnknown', (lang) => ({ countries: countryList(lang) }), {
          ui: { type: 'add', draft: addView(add, session.lang) },
          engine: nlu.engine
        });
      }
    } else if (session.stage === 'add_account') {
      const account = spokenAccount(text);
      if (account.length < 8 || account.length > 34) {
        return respond(session, 'addAccountInvalid', undefined, { ui: { type: 'add', draft: addView(add, session.lang) }, engine: nlu.engine });
      }
      add.account = account;
    }
  }
  return addStep(session, nlu.engine);
}

const AVATAR_COLORS = ['#FFC091', '#C9E7FF', '#FFD7EF', '#E2F6D5', '#FFEB99', '#E0D4FF'];

export function createRecipient({ name, relation, country, currency, account, addedBy }) {
  const first = name.split(' ')[0];
  const recipient = {
    id: nextId('r'),
    name: { en: name },
    first: { en: first },
    relation: { en: relation || 'Recipient' },
    relationPhrase: {},
    country,
    bank: `${country} bank`,
    currency,
    accountHint: `••${account.slice(-4)}`,
    color: AVATAR_COLORS[store.recipients.length % AVATAR_COLORS.length],
    isNew: true,
    match: { full: [name.toLowerCase()], first: [first.toLowerCase()], relation: [] }
  };
  store.recipients.push(recipient);
  for (const request of store.helperRequests) {
    const asked = request.name.toLowerCase();
    if (request.status === 'open' && (asked === name.toLowerCase() || asked === first.toLowerCase())) request.status = 'done';
  }
  addAlert(
    'recipient_added',
    `${name} was added to ${store.profile.firstName.en}'s recipients${addedBy === 'voice' ? ' by voice' : ''}`,
    `${country}, ${currency}, account ending ${account.slice(-4)}. ${store.profile.firstName.en} has never sent money to ${first} before.`
  );
  return recipient;
}

function confirmAdd(session) {
  if (!recentlyVerified(session)) return pause(session, 'voice');
  const add = session.add;
  const recipient = createRecipient({
    name: add.name,
    relation: add.relation,
    country: add.country.name.en,
    currency: add.country.currency,
    account: add.account,
    addedBy: 'voice'
  });
  const name = add.name;
  session.add = emptyAdd();
  session.stage = 'collecting';
  session.slots = { ...emptySlots(), recipientId: recipient.id };
  return respond(session, 'addDone', (lang) => ({ name, helper: helperName(lang) }), {
    ui: { type: 'added', recipient: publicRecipient(recipient) }
  });
}

// ---- Help Centre ---------------------------------------------------------------------

async function helpAnswer(session, said, nlu) {
  const result = await answerQuestion({ question: said, query: nlu.helpQuery, topic: nlu.helpTopic, lang: session.lang });
  return respondText(session, 'helpAnswer', result.text, {
    ui: { type: 'help', article: result.article, source: result.source, question: said },
    engine: nlu.engine
  });
}

// ---- the main router ---------------------------------------------------------------

function blockScam(session, said, reason, engine) {
  resetConversation(session);
  addAlert(
    'scam_blocked',
    `A possible scam was stopped for ${store.profile.firstName.en}`,
    `What was said: "${said.slice(0, 160)}". Why it was stopped: ${reason}. Nothing was sent.`
  );
  return respond(session, 'scam', (lang) => ({ helper: helperName(lang) }), {
    ui: { type: 'scam', helper: store.helper, reason },
    engine
  });
}

function balance(session, engine) {
  const { amount, currency } = store.balance;
  return respond(session, 'balance', (lang) => ({ balance: moneyWords(amount, currency, lang) }), {
    ui: { type: 'balance', balance: { amount, currency } },
    engine
  });
}

function status(session, engine) {
  const latest = listTransfers()[0];
  if (!latest) return respond(session, 'statusNone', undefined, { engine });
  const key = latest.status === 'completed' ? 'statusCompleted' : 'statusProcessing';
  return respond(session, key, (lang) => transferParams(latest, lang), {
    ui: { type: 'status', transfer: transferView(latest) },
    engine
  });
}

function cancel(session, engine) {
  const wasAdding = session.stage.startsWith('add_') || session.stage === 'offer_add';
  resetConversation(session);
  return respond(session, wasAdding ? 'addCancelled' : 'cancelled', undefined, { engine });
}

function close(session, engine) {
  resetConversation(session);
  return respond(session, 'goodbye', (lang) => ({ name: userName(lang) }), { engine, close: true, expectsReply: false });
}

async function route(session, nlu, said) {
  const engine = nlu.engine;
  const stage = session.stage;
  const noSlots = nlu.amount === null && nlu.recipientIds.length === 0;

  // While adding a recipient, almost everything is an answer to the question.
  if (stage.startsWith('add_')) {
    if (nlu.intent === 'cancel') return cancel(session, engine);
    if (nlu.intent === 'close') return close(session, engine);
    if (stage === 'add_confirm') {
      if (nlu.intent === 'confirm') return confirmAdd(session);
      if (nlu.intent === 'deny') return cancel(session, engine);
      if (nlu.intent === 'repeat') return addStep(session, engine);
      return addStep(session, engine);
    }
    if (nlu.intent === 'repeat') return addStep(session, engine);
    return answerAdd(session, said, nlu);
  }

  if (stage === 'offer_add') {
    if (nlu.intent === 'confirm' || nlu.intent === 'add_recipient') return startAdd(session, nlu);
    if (nlu.intent === 'deny') return cancel(session, engine);
  }

  // At the code step only cancel, go back and repeat are understood; numbers
  // never reach this point (the browser sends them as a 'code' event).
  if (stage === 'code') {
    if (nlu.intent === 'cancel') return cancel(session, engine);
    if (nlu.intent === 'go_back' || nlu.intent === 'deny') return goBack(session, engine);
    if (nlu.intent === 'close') return close(session, engine);
    return showCode(session, draftOf(session), engine);
  }

  switch (nlu.intent) {
    case 'cancel':
      return cancel(session, engine);
    case 'close':
      return close(session, engine);
    case 'repeat':
      if (session.last) return finish(session, session.last.reply, session.last.ui, { expectsReply: session.last.expectsReply, engine });
      return respond(session, 'greeting', (lang) => ({ name: userName(lang) }), { engine });
    case 'help':
      return respond(session, 'help', undefined, { engine });
    case 'greeting':
      if (['review', 'ready'].includes(stage) && draftOf(session)) return finish(session, session.last.reply, session.last.ui, { engine });
      return respond(session, 'greeting', (lang) => ({ name: userName(lang) }), { engine });
    case 'check_balance':
      return balance(session, engine);
    case 'transfer_status':
      return status(session, engine);
    case 'ask_help':
      return helpAnswer(session, said, nlu);
    case 'add_recipient':
      return startAdd(session, nlu);
    case 'go_back':
      return goBack(session, engine);
    case 'send_money':
      // "Send" on its own while a transfer is waiting means go ahead.
      if (noSlots && !nlu.unknownRecipientName && ['review', 'ready'].includes(stage) && draftOf(session)) return goForward(session, engine);
      return applySend(session, nlu);
    case 'confirm':
      return goForward(session, engine);
    case 'deny':
      if (stage === 'review' && draftOf(session)) return changeReview(session, engine);
      if (stage === 'ready' && draftOf(session)) return goBack(session, engine);
      if (stage === 'collecting' || stage === 'choose_recipient') return advance(session, engine);
      return respond(session, 'notUnderstood', undefined, { engine });
    default: {
      const draft = draftOf(session);
      if (['review', 'ready'].includes(stage) && draft) {
        return respond(session, 'notUnderstood', undefined, { ui: session.last?.ui, engine });
      }
      return respond(session, 'notUnderstood', undefined, { engine });
    }
  }
}

// ---- taps and other events from the browser ----------------------------------------

const TAPPABLE_INTENTS = new Set(['send_money', 'check_balance', 'transfer_status', 'help', 'repeat', 'add_recipient']);

async function handleEvent(session, event, voice) {
  switch (event?.type) {
    case 'start':
      resetConversation(session);
      session.paused = null;
      if (voiceStatus().enabled && !voiceStatus().enrolled) return startEnroll(session);
      return respond(session, 'greeting', (lang) => ({ name: userName(lang) }));

    case 'wake':
      return handleWake(session, voice);

    case 'enroll_start':
      return startEnroll(session);

    case 'enroll_sample':
      return enrollSample(session, voice);

    case 'code':
      return handleCode(session, event, voice);

    case 'standby':
      // Nobody spoke for a while: wait quietly for "Hey Wise".
      if (!session.paused) session.beforePause = session.last;
      session.paused = 'standby';
      return respond(session, 'standby', undefined, { ui: { type: 'standby' }, expectsReply: false });

    case 'select_recipient': {
      if (!findRecipient(event.recipientId)) return askRecipient(session, 'unknownUnnamed');
      session.slots.recipientId = event.recipientId;
      session.candidates = [];
      return advance(session, 'event');
    }

    case 'prefill': {
      if (event.recipientId && findRecipient(event.recipientId)) {
        session.slots.recipientId = event.recipientId;
        session.candidates = [];
      }
      const amount = Number(event.amount);
      if (Number.isFinite(amount) && amount > 0) {
        session.slots.amount = Math.round(amount * 100) / 100;
        session.slots.currency = typeof event.currency === 'string' ? event.currency : null;
      }
      return advance(session, 'event');
    }

    case 'intent': {
      if (!TAPPABLE_INTENTS.has(event.intent)) return respond(session, 'notUnderstood');
      return route(session, {
        intent: event.intent, recipientIds: [], unknownRecipientName: null, amount: null, currency: null, engine: 'event'
      }, '');
    }

    case 'continue':
      return goForward(session, 'event');

    case 'go_back':
      return goBack(session, 'event');

    case 'change':
      return draftOf(session) ? changeReview(session, 'event') : advance(session, 'event');

    case 'cancel':
      return cancel(session, 'event');

    case 'close':
      return close(session, 'event');

    case 'add_confirm':
      return session.stage === 'add_confirm' ? confirmAdd(session) : addStep(session, 'event');

    default:
      return respond(session, 'notUnderstood');
  }
}

// ---- entry point ------------------------------------------------------------------------

// input: 'voice' (spoken, comes with a voice fingerprint), 'typed' or 'tap'.
export async function handleTurn({ sessionId, lang, text, event, input = 'typed', voice = null }) {
  const session = getSession(sessionId, lang);
  if (event) return handleEvent(session, event, voice);

  const said = String(text ?? '').trim().slice(0, 500);
  if (!said) return respond(session, 'notUnderstood');

  // While paused only the owner saying "Hey Wise" continues the conversation.
  // Typing on the owner's own screen also continues (someone is clearly there).
  if (session.paused) {
    if (input !== 'voice') return resume(session);
    if (hasWakePhrase(said)) return handleWake(session, voice);
    return respond(session, session.paused === 'standby' ? 'standby' : 'paused', undefined, {
      ui: { type: session.paused === 'standby' ? 'standby' : 'paused' },
      expectsReply: false
    });
  }

  if (input === 'voice' && voiceCheckActive()) {
    const check = checkVoice(voice?.embedding, 'speech');
    if (check.decision === 'mismatch') return pause(session, 'voice');
    if (check.decision === 'match') session.verifiedAt = Date.now();
  }

  // "Hey Wise" alone in the middle of a conversation just repeats the question.
  if (hasWakePhrase(said) && said.split(/\s+/).length <= 3 && session.last && session.stage !== 'idle') {
    return finish(session, session.last.reply, session.last.ui, { expectsReply: session.last.expectsReply });
  }

  session.lastSaid = said;
  const guard = detectScam(said);
  if (guard.hit) return blockScam(session, said, guard.reason, 'scam-guard');

  const nlu = await understand(said, {
    lang: session.lang,
    stage: session.stage,
    slots: session.slots,
    candidates: session.candidates,
    recipients: store.recipients,
    lastAssistantText: session.last?.reply.text ?? null
  });
  if (nlu.scamRisk) return blockScam(session, said, nlu.scamReason || 'Flagged by the assistant', nlu.engine);

  return route(session, nlu, said);
}

export { COUNTRIES };
