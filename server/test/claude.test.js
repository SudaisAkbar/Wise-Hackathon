import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/store.js';
import { config } from '../src/config.js';
import { understandWithClaude, sanitizeIntent } from '../src/assistant/nlu/claude.js';
import { understand } from '../src/assistant/nlu/index.js';
import { freshState } from './helpers/setup.js';

const context = (extra = {}) => ({ lang: 'en', stage: 'idle', slots: {}, candidates: [], recipients: store.recipients, lastAssistantText: null, ...extra });

// Stand-in for the Anthropic client, so these tests need no key and no network.
function fakeClient(handler) {
  const calls = [];
  return { calls, messages: { create: async (request) => { calls.push(request); return handler(request, calls.length); } } };
}
const toolAnswer = (input) => ({ content: [{ type: 'tool_use', id: 'toolu_test', name: 'report_intent', input }] });

test.beforeEach(freshState);

test('the request forces the intent tool and carries the saved people, state and sentence', async () => {
  const client = fakeClient(() => toolAnswer({ intent: 'send_money', recipient_ids: ['r-artem-kovalenko'], amount: 150, currency: 'EUR', scam_risk: false }));
  const result = await understandWithClaude('could you pop 150 over to my grandson', context(), client);
  assert.equal(result.intent, 'send_money');
  assert.deepEqual(result.recipientIds, ['r-artem-kovalenko']);
  assert.equal(result.amount, 150);
  assert.equal(result.engine, 'claude');
  const [request] = client.calls;
  assert.equal(request.model, config.claudeModel);
  assert.deepEqual(request.tool_choice, { type: 'tool', name: 'report_intent' });
  assert.match(request.messages[0].content, /r-artem-kovalenko/);
  assert.doesNotMatch(request.messages[0].content, new RegExp(config.demoPin), 'the code is never sent to the model');
});

test('help questions and new-recipient details come through cleaned', () => {
  const help = sanitizeIntent({ intent: 'ask_help', recipient_ids: [], help_query_en: 'how long does a transfer take', scam_risk: false }, context());
  assert.equal(help.helpQuery, 'how long does a transfer take');
  const add = sanitizeIntent({
    intent: 'add_recipient', recipient_ids: [], scam_risk: false,
    new_recipient: { name: 'Anna Tamm', relationship: 'Friend', country: 'Estonia', account_number: 'ee38 2200-2210' }
  }, context({ stage: 'add_name' }));
  assert.deepEqual(add.newRecipient, { name: 'Anna Tamm', relationship: 'Friend', country: 'Estonia', accountNumber: 'EE3822002210' });
});

test('a model that rejects a forced tool gets a second try with tool_choice auto', async () => {
  const client = fakeClient((request, count) => {
    if (count === 1) throw Object.assign(new Error('forced tool use not supported'), { status: 400 });
    return toolAnswer({ intent: 'check_balance', recipient_ids: [], scam_risk: false });
  });
  assert.equal((await understandWithClaude('balance', context(), client)).intent, 'check_balance');
  assert.deepEqual(client.calls[1].tool_choice, { type: 'auto' });
});

test('whatever the model returns is clamped to what the app accepts', () => {
  const result = sanitizeIntent({
    intent: 'drain_account', recipient_ids: ['r-artem-kovalenko', 'r-hacker'], amount: -500, currency: 'BTC',
    unknown_recipient_name: 'Somebody', scam_risk: 'yes'
  }, context());
  assert.equal(result.intent, 'unknown');
  assert.deepEqual(result.recipientIds, ['r-artem-kovalenko']);
  assert.equal(result.amount, null);
  assert.equal(result.currency, null);
  assert.equal(result.unknownRecipientName, null);
  assert.equal(result.scamRisk, false);
});

test('no tool call in the answer is treated as a failure', async () => {
  const client = fakeClient(() => ({ content: [{ type: 'text', text: 'Sure, sending now!' }] }));
  await assert.rejects(() => understandWithClaude('send money', context(), client), /did not return an intent/);
});

test('if Claude fails, the built-in rules answer instead', async () => {
  config.anthropicApiKey = 'test-key';
  const result = await understand('Send 150 euros to my grandson Artem', context(), { claude: async () => { throw new Error('timeout'); } });
  assert.equal(result.engine, 'rules-fallback');
  assert.equal(result.amount, 150);
});
