import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeed } from '../src/data/seed.js';
import { understandWithRules } from '../src/assistant/nlu/rules.js';
import { detectScam } from '../src/assistant/scamGuard.js';
import { hasWakePhrase } from '../src/assistant/dialog.js';

const recipients = createSeed().recipients;
const u = (text, lang = 'en', extra = {}) =>
  understandWithRules(text, { lang, stage: 'idle', slots: {}, candidates: [], recipients, ...extra });

test('the design sentence', () => {
  const r = u('Send 150 euros to my grandson Artem');
  assert.equal(r.intent, 'send_money');
  assert.deepEqual(r.recipientIds, ['r-artem-kovalenko']);
  assert.equal(r.amount, 150);
  assert.equal(r.currency, 'EUR');
});

test('two people called Artem are both returned; a full name or relationship picks one', () => {
  assert.deepEqual(u('send 40 euros to Artem').recipientIds.sort(), ['r-artem-kovalenko', 'r-artem-petrov']);
  assert.deepEqual(u('send 40 euros to Artem Petrov').recipientIds, ['r-artem-petrov']);
  assert.deepEqual(u('my neighbour', 'en', { stage: 'choose_recipient', candidates: ['r-artem-kovalenko', 'r-artem-petrov'] }).recipientIds, ['r-artem-petrov']);
  assert.deepEqual(u('the second one', 'en', { stage: 'choose_recipient', candidates: ['r-artem-kovalenko', 'r-artem-petrov'] }).recipientIds, ['r-artem-petrov']);
});

test('numbers and currencies', () => {
  assert.equal(u('send two hundred and fifty euros to Olena').amount, 250);
  assert.equal(u('send 500 zloty to Artem Kovalenko').currency, 'PLN');
  assert.equal(u('send 2,000 hryvnias to Olena').amount, 2000);
  assert.equal(u('send 2,000 hryvnias to Olena').currency, 'UAH');
  assert.equal(u('send €75 to Mart').amount, 75);
  assert.equal(u('the first one').amount, null);
});

test('steps of the flow', () => {
  assert.equal(u('yes').intent, 'confirm');
  assert.equal(u('yes, continue').intent, 'confirm');
  assert.equal(u('change').intent, 'deny');
  assert.equal(u('go back').intent, 'go_back');
  assert.equal(u('send').intent, 'send_money');
  assert.equal(u('cancel').intent, 'cancel');
  assert.equal(u('done').intent, 'close');
  assert.equal(u('thank you').intent, 'close');
  assert.equal(u('say that again').intent, 'repeat');
  assert.equal(u('add a new recipient').intent, 'add_recipient');
  assert.equal(u('how much money do I have?').intent, 'check_balance');
  assert.equal(u('did Artem get the money?').intent, 'transfer_status');
  assert.equal(u('what can you do').intent, 'help');
  assert.equal(u('no, make it 50', 'en', { stage: 'review' }).intent, 'send_money');
});

test('Help Centre questions get an English search query and a topic', () => {
  const fee = u('how much does it cost to send money?');
  assert.equal(fee.intent, 'ask_help');
  assert.equal(fee.helpTopic, 'fees');
  assert.equal(u('How do I cancel a transfer?').helpTopic, 'cancel', 'a question about cancelling is not a cancel command');
  assert.equal(u('скільки коштує переказ?', 'uk').helpTopic, 'fees');
  assert.equal(u('как отменить перевод?', 'ru').helpTopic, 'cancel');
  assert.equal(u('kui kaua ülekanne võtab?', 'et').helpTopic, 'speed');
  assert.equal(u('what should I do if my card is lost?').helpTopic, 'card');
});

test('Estonian, Russian and Ukrainian', () => {
  const et = u('Saada lapselapsele 50 eurot', 'et');
  assert.deepEqual([et.intent, et.recipientIds[0], et.amount], ['send_money', 'r-artem-kovalenko', 50]);
  const ru = u('Отправь внуку сто пятьдесят евро', 'ru');
  assert.deepEqual([ru.intent, ru.recipientIds[0], ru.amount], ['send_money', 'r-artem-kovalenko', 150]);
  const uk = u("Надішли онуку п'ятдесят євро", 'uk');
  assert.deepEqual([uk.intent, uk.recipientIds[0], uk.amount], ['send_money', 'r-artem-kovalenko', 50]);
  assert.equal(u('так', 'uk').intent, 'confirm');
  assert.equal(u('ні', 'uk').intent, 'deny');
  assert.equal(u('назад', 'uk').intent, 'go_back');
  assert.equal(u('додай отримувача', 'uk').intent, 'add_recipient');
  assert.equal(u('да', 'ru').intent, 'confirm');
  assert.equal(u('jah', 'et').intent, 'confirm');
  assert.equal(u('tagasi', 'et').intent, 'go_back');
});

test('Urdu and Hindi still work', () => {
  assert.equal(u('پوتے کو 100 یورو بھیج دو', 'ur').recipientIds[0], 'r-artem-kovalenko');
  assert.equal(u('पोते को 100 यूरो भेजो', 'hi').amount, 100);
  assert.equal(u('Olena ko do sau euro bhejo', 'ur').amount, 200);
});

test('unknown person is named', () => {
  const r = u('Send 30 euros to John');
  assert.equal(r.intent, 'send_money');
  assert.deepEqual(r.recipientIds, []);
  assert.equal(r.unknownRecipientName, 'John');
});

test('the wake phrase, as speech recognition tends to write it', () => {
  for (const said of ['Hey Wise', 'hey, wise', 'hi wise', 'okay Wise', 'hey Wyse', 'Хей Вайс', 'эй вайс', 'гей вайс', 'हे वाइज़']) {
    assert.ok(hasWakePhrase(said), said);
  }
  assert.equal(hasWakePhrase('otherwise'), false);
  assert.equal(hasWakePhrase('be wise'), false);
});

test('scam guard catches pressure from a third party and leaves normal requests alone', () => {
  for (const said of [
    'a man on the phone told me to send 500 euros to a safe account', 'the police called and said I must transfer money today',
    'мне позвонили из банка и сказали перевести деньги', 'keegi helistas ja ütles, et pean raha saatma'
  ]) assert.equal(detectScam(said).hit, true, said);
  for (const said of ['Send 150 euros to my grandson Artem', 'Отправь внуку 50 евро', 'how much does it cost?']) {
    assert.equal(detectScam(said).hit, false, said);
  }
});
