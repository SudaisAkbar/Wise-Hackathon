import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { config } from '../src/config.js';
import { extractArticleText, fetchArticle, clearArticleCache } from '../src/help/fetchArticle.js';
import { searchArticles } from '../src/help/search.js';
import { answerQuestion } from '../src/help/answer.js';
import { freshState } from './helpers/setup.js';

const PROSE = 'Most transfers arrive within a day. Some are instant. Bank holidays and extra checks can add time. You can see the estimate before you pay, and we will email you when it arrives.';

test.beforeEach(() => {
  freshState();
  clearArticleCache();
});

test('article search finds the obvious article for common questions', () => {
  assert.equal(searchArticles('how long does a transfer take')[0].title, 'How long will my transfer take?');
  assert.equal(searchArticles('fees cost charge', { topic: 'fees' })[0].title, 'Fees for sending money');
  assert.equal(searchArticles('lost my card')[0].title, 'My Wise card was lost or stolen');
  assert.equal(searchArticles('how do i add a recipient')[0].title, 'How do I add or delete recipients?');
  assert.deepEqual(searchArticles('what is the weather'), []);
});

test('text is pulled from <article>, from JSON-LD, or from embedded page data', () => {
  const nav = '<nav>Log in Register Help home</nav>';
  assert.match(extractArticleText(`<html><body>${nav}<article><h1>Title</h1><p>${PROSE}</p></article></body></html>`), /^Title\nMost transfers/);
  const ld = `<script type="application/ld+json">${JSON.stringify({ '@type': 'Article', articleBody: PROSE })}</script>`;
  assert.equal(extractArticleText(`<html><head>${ld}</head><body>${nav}</body></html>`), PROSE);
  const next = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { page: { body: `<p>${PROSE}</p>`, url: 'https://x' } } })}</script>`;
  assert.equal(extractArticleText(`<html><body>${nav}${next}</body></html>`), PROSE);
  assert.doesNotMatch(extractArticleText(`<body>${nav}<main><p>${PROSE}</p></main></body>`), /Log in/);
});

test('live fetch from a stand-in help centre, then Claude writes a short spoken answer', async () => {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push(req.url);
    res.setHeader('content-type', 'text/html');
    res.end(`<html><body><article><h1>How long will my transfer take?</h1><p>${PROSE}</p></article></body></html>`);
  });
  await new Promise((resolve) => server.listen(0, resolve));
  config.helpBaseUrl = `http://127.0.0.1:${server.address().port}`;
  config.helpLiveFetch = true;

  const page = await fetchArticle('/help/articles/2524078/how-long-will-my-transfer-take');
  assert.match(page.text, /Most transfers arrive within a day/);
  await fetchArticle('/help/articles/2524078/how-long-will-my-transfer-take');
  assert.equal(seen.length, 1, 'the second request is served from the cache');

  let given;
  const result = await answerQuestion(
    { question: 'Сколько идёт перевод?', query: 'how long does a transfer take', topic: null, lang: 'ru' },
    { useClaude: true, compose: async (input) => { given = input; return 'Обычно перевод приходит в течение дня.'; } }
  );
  server.close();
  assert.equal(result.source, 'help-centre');
  assert.equal(result.text, 'Обычно перевод приходит в течение дня.');
  assert.equal(result.article.title, 'How long will my transfer take?');
  assert.equal(given.lang, 'ru');
  assert.match(given.text, /Bank holidays/);
});

test('offline or without Claude: a general answer in the right language plus the article', async () => {
  const fees = await answerQuestion({ question: 'what are the fees?', query: 'fees cost charge', topic: 'fees', lang: 'uk' });
  assert.equal(fees.source, 'general');
  assert.match(fees.text, /^Зазвичай комісія залежить від валют і суми/);
  assert.equal(fees.article.title, 'Fees for sending money');

  const failing = await answerQuestion(
    { question: 'how long?', query: 'how long transfer take', topic: 'speed', lang: 'en' },
    { useClaude: true, fetchArticle: async () => null, compose: async () => { throw new Error('should not be called'); } }
  );
  assert.equal(failing.source, 'general');

  const nothing = await answerQuestion({ question: 'why is the sky blue?', query: 'why is the sky blue', topic: null, lang: 'en' });
  assert.equal(nothing.source, 'none');
  assert.equal(nothing.article, null);
});
