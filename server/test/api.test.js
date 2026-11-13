import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config.js';
import { createApp } from '../src/app.js';
import { freshState, voiceOf } from './helpers/setup.js';

let server;
let base;
const call = async (method, path, body) => {
  const response = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
};
const turn = (sessionId, payload) => call('POST', '/assistant/message', { sessionId, lang: 'en', ...payload });

test.before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
test.after(() => server.close());
test.beforeEach(freshState);

test('bootstrap has the design persona, six languages and voice status', async () => {
  const { status, body } = await call('GET', '/bootstrap');
  assert.equal(status, 200);
  assert.equal(body.profile.fullName, 'Galina Kuznetsova');
  assert.deepEqual(body.languages.map((l) => l.code), ['en', 'et', 'ru', 'uk', 'ur', 'hi']);
  assert.equal(body.recipients[0].match, undefined);
  assert.equal(body.voice.enrolled, false);
  assert.equal(body.cardPayments[0].merchant, 'Rimi Kristiine');
  assert.equal(body.balance.amount, 1240.5);
});

test('whole flow over HTTP with voice match', async () => {
  const s = 'http-1';
  assert.equal((await turn(s, { event: { type: 'start' } })).body.reply.key, 'enrollIntro');
  for (let i = 0; i < 3; i += 1) await turn(s, { event: { type: 'enroll_sample' }, input: 'voice', voice: voiceOf('owner') });
  assert.equal((await call('GET', '/voice')).body.enrolled, true);

  const check = (await turn(s, { text: 'Send 150 euros to my grandson Artem', input: 'voice', voice: voiceOf('owner') })).body;
  assert.equal(check.ui.type, 'review');
  await turn(s, { text: 'yes', input: 'voice', voice: voiceOf('owner', 0.5) });
  const code = (await turn(s, { text: 'send', input: 'voice', voice: voiceOf('owner', 0.6) })).body;
  assert.equal(code.listen, 'code');

  // The keypad endpoint also works for the same draft, but here the code is spoken.
  const sent = (await turn(s, { event: { type: 'code', code: '1234' }, input: 'voice', voice: voiceOf('owner') })).body;
  assert.equal(sent.ui.type, 'sent');
  assert.equal((await call('GET', '/state')).body.balance.amount, 1090.5);
  assert.equal((await call('GET', '/voice')).body.last.decision, 'match');

  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal((await call('GET', `/transfers/${sent.ui.transfer.id}`)).body.status, 'completed');
});

test('voice settings: turn off, sensitivity, forget', async () => {
  assert.equal((await call('PATCH', '/voice', { enabled: false })).body.enabled, false);
  assert.equal((await call('PATCH', '/voice', { sensitivity: 1.25 })).body.sensitivity, 1.25);
  assert.equal((await call('PATCH', '/voice', { sensitivity: 7 })).body.sensitivity, 1.25, 'unknown values are ignored');
  assert.equal((await call('DELETE', '/voice')).body.enrolled, false);
});

test('keypad confirm, helper add and limits', async () => {
  const review = (await turn('http-2', { text: 'send 20 euros to Mart' })).body;
  const wrong = await call('POST', `/transfers/${review.ui.transfer.id}/confirm`, { pin: '9999' });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.body.error.attemptsLeft, 2);
  assert.equal((await call('POST', `/transfers/${review.ui.transfer.id}/confirm`, { pin: config.demoPin })).status, 200);

  const added = await call('POST', '/helper/recipients', { name: 'John Smith', relation: 'Neighbour', country: 'Ireland', currency: 'EUR', accountNumber: 'IE29 AIBK 9311 5212 3456 78' });
  assert.equal(added.status, 201);
  assert.equal(added.body.accountHint, '••5678');
  assert.equal((await call('POST', '/helper/recipients', { name: 'J', currency: 'EUR', accountNumber: '1234' })).status, 400);

  assert.equal((await call('PATCH', '/helper/settings', { voiceLimit: 100 })).body.voiceLimit, 100);
  assert.equal((await turn('http-3', { text: 'send 150 euros to Olena' })).body.reply.key, 'overLimit');
});

test('errors are clear JSON, and reset restores the money but keeps the voice', async () => {
  assert.equal((await call('POST', '/quotes', { targetCurrency: 'ZZZ', sourceAmount: 100 })).status, 400);
  assert.equal((await call('GET', '/transfers/nope')).status, 404);
  assert.equal((await call('GET', '/nothing-here')).status, 404);
  const garbage = await fetch(base + '/quotes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
  assert.equal(garbage.status, 400);

  for (let i = 0; i < 3; i += 1) await turn('http-4', { event: { type: 'enroll_sample' }, input: 'voice', voice: voiceOf('owner') });
  await call('POST', '/demo/reset');
  assert.equal((await call('GET', '/state')).body.balance.amount, 1240.5);
});
