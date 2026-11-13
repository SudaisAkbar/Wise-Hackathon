// Finds the Help Centre articles that best match a question.
// The query is English (Claude translates it; the built-in rules map topic
// words to English), because the article titles are English.
import { ARTICLES, TOPIC_ARTICLE } from './articles.js';

const STOP = new Set([
  'a', 'an', 'the', 'i', 'my', 'me', 'do', 'does', 'did', 'is', 'are', 'can', 'could', 'how', 'what', 'why', 'when',
  'where', 'which', 'to', 'for', 'of', 'in', 'on', 'with', 'and', 'or', 'it', 'you', 'your', 'wise', 'be', 'if',
  'that', 'this', 'there', 'any', 'will', 'should', 'have', 'has', 'get', 'need', 'about', 'from', 'much', 'many'
]);

// Light stemming so "fees" matches "fee" and "cancelling" matches "cancel".
const stem = (word) =>
  word
    .replace(/'s$/, '')
    .replace(/(ies)$/, 'y')
    .replace(/(ing|ed|es|s)$/, '')
    .replace(/(ll)$/, 'l');

export function terms(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/[\s-]+/)
    .filter((word) => word && !STOP.has(word))
    .map(stem)
    .filter((word) => word.length > 1);
}

// Synonyms that the titles use differently from how people ask.
const SYNONYMS = {
  cost: ['fee', 'cost', 'charg'],
  fee: ['fee', 'cost', 'charg'],
  charg: ['fee', 'charg'],
  price: ['fee', 'cost'],
  long: ['long', 'arrive', 'take'],
  fast: ['long', 'arrive'],
  arrive: ['arrive', 'long'],
  lost: ['lost', 'stolen'],
  stolen: ['lost', 'stolen'],
  scam: ['scam', 'fraud', 'phish'],
  fraud: ['fraud', 'scam'],
  limit: ['limit'],
  maximum: ['limit'],
  cancel: ['cancel'],
  refund: ['refund', 'back'],
  rate: ['rate'],
  recipient: ['recipient'],
  verify: ['verif', 'verify'],
  verification: ['verif'],
  password: ['password']
};

const indexed = ARTICLES.map((article) => ({ ...article, words: new Set(terms(article.title)) }));

export function searchArticles(query, { topic = null, limit = 3 } = {}) {
  const wanted = terms(query);
  if (!wanted.length && !topic) return [];
  const expanded = new Set(wanted.flatMap((word) => SYNONYMS[word] || [word]));

  const scored = indexed
    .map((article) => {
      let score = 0;
      for (const word of expanded) {
        for (const titleWord of article.words) {
          if (titleWord === word) score += 2;
          else if (Math.min(word.length, titleWord.length) >= 4 && (titleWord.startsWith(word) || word.startsWith(titleWord))) score += 1;
        }
      }
      if (topic && TOPIC_ARTICLE[topic] === article.path) score += 3;
      // Short, direct titles are usually the general answer.
      score -= article.title.length / 200;
      return { article, score };
    })
    .filter((item) => item.score > 1.5)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ article }) => ({ id: article.id, title: article.title, path: article.path }));
}
