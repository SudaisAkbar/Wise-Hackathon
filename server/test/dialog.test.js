import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/store.js';
import { handleTurn } from '../src/assistant/dialog.js';
import { getTransfer } from '../src/payments/provider.js';
import { voiceStatus } from '../src/voice/profile.js';
import { freshState, voiceOf } from './helpers/setup.js';

let n = 0;
const session = () => `t-${++n}`;
const say = (s, text, { lang = 'en', as = null, input = as ? 'voice' : 'typed' } = {}) =>
  handleTurn({ sessionId: s, lang, text, input, voice: as ? voiceOf(as) : null });
const ev = (s, event, { lang = 'en', as = null } = {}) =>
  handleTurn({ sessionId: s, lang, event, input: as ? 'voice' : 'tap', voice: as ? voiceOf(as) : null });

async function enrollOwner(s) {
  const first = await ev(s, { type: 'start' });
  assert.equal(first.reply.key, 'enrollIntro');
  assert.equal(first.listen, 'enroll');
  await ev(s, { type: 'enroll_sample' }, { as: 'owner' });
  await ev(s, { type: 'enroll_sample' }, { as: 'owner' });
  const done = await ev(s, { type: 'enroll_sample' }, { as: 'owner' });
  assert.equal(done.reply.key, 'enrollDone');
  assert.equal(voiceStatus().enrolled, true);
}

test.beforeEach(freshState);

test('the design flow by voice: words, Please check, Ready to send, spoken code, Money sent', async () => {
  const s = session();
  await enrollOwner(s);

  const check = await say(s, 'Send 150 euros to my grandson Artem', { as: 'owner' });
  assert.equal(check.reply.key, 'review');
  assert.equal(check.ui.type, 'review');
  assert.equal(check.ui.said, 'Send 150 euros to my grandson Artem');
  assert.equal(check.ui.transfer.targetAmount, 636.12);
  assert.match(check.reply.text, /150 euros to Artem Kovalenko, your grandson\. Artem gets 636\.12 zloty/);
  assert.match(check.reply.text, /Say yes, or say change\.$/);
  assert.equal(check.listen, 'command');

  const ready = await say(s, 'yes', { as: 'owner' });
  assert.equal(ready.reply.key, 'readyToSend');
  assert.equal(ready.ui.type, 'ready');
  assert.equal(ready.ui.transfer.sentBefore, true);
  assert.match(ready.reply.text, /You have sent money to Artem before/);

  const code = await say(s, 'send', { as: 'owner' });
  assert.equal(code.reply.key, 'askCode');
  assert.equal(code.listen, 'code', 'the next sentence is the code and goes nowhere else');
  assert.equal(store.balance.amount, 1240.5, 'nothing has moved yet');

  const wrong = await ev(s, { type: 'code', code: '9999' }, { as: 'owner' });
  assert.equal(wrong.reply.key, 'codeWrong');
  assert.equal(wrong.ui.wrong, true);

  const sent = await ev(s, { type: 'code', code: '1234' }, { as: 'owner' });
  assert.equal(sent.reply.key, 'sent');
  assert.equal(sent.ui.type, 'sent');
  assert.match(sent.reply.text, /^Money sent\. You sent 150 euros to Artem\. Artem gets 636\.12 zloty today/);
  assert.equal(store.balance.amount, 1090.5);
  assert.equal(getTransfer(sent.ui.transfer.id).confirmedBy, 'voice');
});

test('taps follow the same steps (Yes, continue / Send 150 EUR / keypad)', async () => {
  const s = session();
  store.settings.voiceLimit = 300;
  const check = await say(s, 'Send 150 euros to my grandson Artem');
  const ready = await ev(s, { type: 'continue' });
  assert.equal(ready.ui.type, 'ready');
  const code = await ev(s, { type: 'continue' });
  assert.equal(code.ui.type, 'code');
  const back = await ev(s, { type: 'go_back' });
  assert.equal(back.ui.type, 'ready');
  await ev(s, { type: 'continue' });
  const sent = await ev(s, { type: 'code', code: '1234', method: 'keypad' });
  assert.equal(sent.reply.key, 'sent');
  assert.equal(getTransfer(check.ui.transfer.id).confirmedBy, 'keypad');
});

test('another voice pauses everything; only the owner saying Hey Wise continues', async () => {
  const s = session();
  await enrollOwner(s);
  await say(s, 'Send 150 euros to my grandson Artem', { as: 'owner' });
  await say(s, 'yes', { as: 'owner' });

  const paused = await say(s, 'no, send it to my account instead', { as: 'man' });
  assert.equal(paused.reply.key, 'paused');
  assert.equal(paused.listen, 'wake');
  assert.equal(store.alerts[0].type, 'voice_paused');

  const ignored = await say(s, 'send it now', { as: 'man' });
  assert.equal(ignored.reply.key, 'paused', 'a stranger cannot carry on');

  const stranger = await say(s, 'hey wise', { as: 'man' });
  assert.equal(stranger.reply.key, 'notOwner');
  assert.equal(stranger.paused, 'voice');

  const back = await say(s, 'hey wise', { as: 'owner' });
  assert.equal(back.paused, null);
  assert.match(back.reply.text, /^Welcome back, Galina\. Ready to send 150 euros to Artem Kovalenko/);
  assert.equal(back.ui.type, 'ready', 'the same screen comes back');
});

test('the spoken code needs the owner voice; a stranger saying it pauses', async () => {
  const s = session();
  await enrollOwner(s);
  await say(s, 'Send 150 euros to my grandson Artem', { as: 'owner' });
  await say(s, 'yes', { as: 'owner' });
  await say(s, 'send', { as: 'owner' });

  const stranger = await ev(s, { type: 'code', code: '1234' }, { as: 'man' });
  assert.equal(stranger.reply.key, 'paused');
  assert.equal(store.balance.amount, 1240.5);

  await say(s, 'hey wise', { as: 'owner' });
  const tooShort = await handleTurn({ sessionId: s, lang: 'en', event: { type: 'code', code: '1234' }, input: 'voice', voice: voiceOf('owner', 0.3) });
  assert.equal(tooShort.reply.key, 'voiceUnclear');
  const again = await handleTurn({ sessionId: s, lang: 'en', event: { type: 'code', code: '1234' }, input: 'voice', voice: null });
  assert.equal(again.reply.key, 'codeByHand');
  assert.equal(again.ui.keypad, true);
  const keypad = await ev(s, { type: 'code', code: '1234', method: 'keypad' });
  assert.equal(keypad.reply.key, 'sent');
});

test('two Artems: the assistant asks which one', async () => {
  const s = session();
  const which = await say(s, 'send 40 euros to Artem');
  assert.equal(which.reply.key, 'askWhich');
  assert.equal(which.ui.type, 'choices');
  const review = await say(s, 'my neighbour');
  assert.equal(review.ui.transfer.recipient.id, 'r-artem-petrov');
  assert.equal(review.ui.transfer.sourceAmount, 40);
});

test('change, go back, cancel and correcting the amount', async () => {
  const s = session();
  const first = await say(s, 'send 100 euros to Olena');
  const fixed = await say(s, 'no, make it 50');
  assert.equal(fixed.ui.transfer.sourceAmount, 50);
  assert.equal(getTransfer(first.ui.transfer.id).status, 'cancelled');
  await say(s, 'yes');
  const back = await say(s, 'go back');
  assert.equal(back.ui.type, 'review');
  assert.match(back.reply.text, /^Okay, let us check it again\./);
  const change = await say(s, 'change');
  assert.equal(change.reply.key, 'changeWhat');
  const cancelled = await say(s, 'cancel');
  assert.equal(cancelled.reply.key, 'cancelled');
});

test('limits, balance and missing details', async () => {
  const s = session();
  assert.equal((await say(s, 'send 900 euros to Olena')).reply.key, 'overLimit');
  store.settings.voiceLimit = 5000;
  assert.equal((await say(s, '2000 euros')).reply.key, 'insufficient');
  assert.equal((await say(s, 'how much money do I have?')).reply.key, 'balance');
  const t = session();
  const who = await say(t, 'I want to send money');
  assert.equal(who.reply.key, 'askRecipient');
  assert.equal((await say(t, 'to Mart')).reply.key, 'askAmount');
  assert.equal((await say(t, 'fifty')).reply.key, 'review');
});

test('adding a recipient by voice, step by step, then sending to them', async () => {
  const s = session();
  await enrollOwner(s);
  const unknown = await say(s, 'send 30 euros to John', { as: 'owner' });
  assert.equal(unknown.reply.key, 'unknownNamed');
  assert.equal(unknown.ui.type, 'offer_add');

  const relation = await say(s, 'yes', { as: 'owner' });
  assert.equal(relation.reply.key, 'addAskRelation', 'the name John is kept from before');
  const country = await say(s, 'my friend', { as: 'owner' });
  assert.equal(country.reply.key, 'addAskCountry');
  const unknownCountry = await say(s, 'Narnia', { as: 'owner' });
  assert.equal(unknownCountry.reply.key, 'addCountryUnknown');
  const account = await say(s, 'Poland', { as: 'owner' });
  assert.equal(account.reply.key, 'addAskAccount');
  const bad = await say(s, 'I do not know', { as: 'owner' });
  assert.equal(bad.reply.key, 'addAccountInvalid');
  const confirm = await say(s, 'P L six one one zero nine zero one zero one four', { as: 'owner' });
  assert.equal(confirm.reply.key, 'addConfirm');
  assert.match(confirm.reply.text, /Name: John\. Friend\. Bank in Poland\. Account number: P L 6 1, 1 0 9 0, 1 0 1 4\./);
  assert.equal(confirm.ui.draft.currency, 'PLN');

  const added = await say(s, 'yes', { as: 'owner' });
  assert.equal(added.reply.key, 'addDone');
  assert.equal(store.recipients.at(-1).name.en, 'John');
  assert.equal(store.alerts[0].type, 'recipient_added');

  const review = await say(s, '30 euros', { as: 'owner' });
  assert.equal(review.ui.transfer.recipient.name.en, 'John');
  const ready = await say(s, 'yes', { as: 'owner' });
  assert.equal(ready.ui.transfer.sentBefore, false);
  assert.match(ready.reply.text, /You have never sent money to John before/);
});

test('saying no at the end of adding adds nobody', async () => {
  const s = session();
  await say(s, 'add a new recipient');
  await say(s, 'Anna Tamm');
  await say(s, 'neighbour');
  await say(s, 'Estonia');
  await say(s, 'EE38 2200 2210 2014 5685');
  const no = await say(s, 'no');
  assert.equal(no.reply.key, 'addCancelled');
  assert.equal(store.recipients.length, 5);
});

test('Help Centre questions get a general answer and an article', async () => {
  const s = session();
  const answer = await say(s, 'How long does a transfer take?');
  assert.equal(answer.ui.type, 'help');
  assert.equal(answer.ui.article.title, 'How long will my transfer take?');
  assert.match(answer.ui.article.url, /^https:\/\/wise\.com\/help\/articles\/2524078\//);
  assert.match(answer.reply.text, /^In general, many transfers arrive/);
  assert.equal(answer.listen, 'command');

  const ru = await say(s, 'как отменить перевод?', { lang: 'ru' });
  assert.equal(ru.ui.article.title, 'How do I cancel my transfer?');
  assert.match(ru.reply.text, /^Обычно перевод можно отменить/);
});

test('scam words stop everything', async () => {
  const s = session();
  const review = await say(s, 'send 100 euros to Olena');
  const stop = await say(s, 'a man on the phone told me to send it to a safe account');
  assert.equal(stop.reply.key, 'scam');
  assert.equal(getTransfer(review.ui.transfer.id).status, 'cancelled');
  assert.equal(store.alerts[0].type, 'scam_blocked');
});

test('done closes the assistant, standby waits, and Hey Wise brings the conversation back', async () => {
  const s = session();
  await say(s, 'send 100 euros to Olena');
  const standby = await ev(s, { type: 'standby' });
  assert.equal(standby.listen, 'wake');
  const back = await ev(s, { type: 'wake' });
  assert.match(back.reply.text, /^Welcome back, Galina\. Please check\./);
  const bye = await say(s, 'thank you, that is all');
  assert.equal(bye.reply.key, 'goodbye');
  assert.equal(bye.close, true);
});

test('Ukrainian and Estonian versions of the check step', async () => {
  const uk = await say(session(), "Надішли онуку сто п'ятдесят євро", { lang: 'uk' });
  assert.match(uk.reply.text, /Отримувач — Артем Коваленко, ваш онук\. Ви надсилаєте 150 євро\. Артем отримає 636,12 злотих/);
  const et = await say(session(), 'Saada lapselapsele 150 eurot', { lang: 'et' });
  assert.match(et.reply.text, /Saaja on Artem Kovalenko, teie lapselaps\. Te saadate 150 eurot\. Artem saab 636,12 zlotti/);
});
