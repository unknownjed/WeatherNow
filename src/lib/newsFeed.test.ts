import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articleImage, normalizeNews, fetchNewsJson, withNewsImages, failNewsImage } from './newsFeed.ts';

test('failed publisher image falls back to RSS; stale error does not remove the replacement', () => {
  const item = withNewsImages({ title: 'Story', link: 'https://example.com/story', pubDate: '', contentSnippet: '', imgUrl: 'https://example.com/rss.jpg' }, ['https://example.com/broken.jpg']);
  const fallback = failNewsImage(item, 'https://example.com/broken.jpg');
  assert.equal(fallback.imgUrl, 'https://example.com/rss.jpg');
  assert.equal(fallback.imageFailed, false);
  assert.equal(failNewsImage(fallback, 'https://example.com/broken.jpg').imgUrl, fallback.imgUrl);
  assert.equal(failNewsImage(fallback, fallback.imgUrl!).imageFailed, true);
});

const now = Date.parse('2026-08-31T04:00:00Z');
const story = { title: 'Manila weather', link: 'https://publisher.example/article', pubDate: '2026-08-30T04:00:00Z' };
test('news without images remains visible; malformed dates, sources and URLs cannot crash the feed', () => {
  const items = normalizeNews([{ items: [null, { ...story, link: 'not a URL' }, { ...story, pubDate: 'invalid' }, { ...story, source: { title: 'Publisher' } }] }, { items: 'invalid' }], now);
  assert.equal(items.length, 1);
  assert.equal(items[0].source, 'Publisher');
  assert.equal(items[0].imageFailed, true);
});
test('Bing redirect aliases deduplicate and old stories are excluded', () => {
  const items = normalizeNews([{ items: [story, { ...story, title: 'Same article', link: `http://www.bing.com/news/apiclick.aspx?url=${encodeURIComponent(story.link)}` }, { ...story, title: 'Old news', pubDate: '2026-08-01' }] }], now);
  assert.equal(items.length, 1);
  assert.equal(items[0].link, story.link);
});
test('image URLs retain signatures; HTTPS Bing fallback and no logo substitution', () => {
  assert.equal(articleImage('https://publisher.example/photo.jpg?w=400&sig=abc'), 'https://publisher.example/photo.jpg?w=400&sig=abc');
  assert.equal(articleImage('http://www.bing.com/th?id=abc'), 'https://www.bing.com/th?id=abc');
  assert.equal(articleImage('https://publisher.example/logo.png'), undefined);
  assert.equal(articleImage('javascript:alert(1)'), undefined);
});

test('Bing and MSN feed thumbnails request a clear card-size image', () => {
  const image = articleImage('http://www.bing.com/th?id=ONUT.example&pid=News');
  assert.equal(image, 'https://www.bing.com/th?id=ONUT.example&pid=News&w=800&h=450&c=7');
});

test('MSN keeps its reliable high-resolution RSS thumbnail ahead of a blocked page preview', () => {
  const item = { title: 'MSN report', link: 'https://www.msn.com/en-us/news/story/ar-AA1', pubDate: new Date().toISOString(), contentSnippet: '', imgUrl: 'http://www.bing.com/th?id=ONUT.article&pid=News' };
  const result = withNewsImages(item, ['https://img-s-msn-com.akamaized.net/blocked.jpg']);
  assert.match(result.imgUrl || '', /^https:\/\/www\.bing\.com\/th\?/);
  assert.match(result.imgUrl || '', /w=800/);
});
test('feed is limited to 24 unique fresh articles, newest first', () => {
  const items = normalizeNews([{ items: Array.from({ length: 30 }, (_, i) => ({ ...story, title: `News ${i}`, link: `https://publisher.example/${i}`, pubDate: new Date(now - i * 60000).toISOString() })) }], now);
  assert.equal(items.length, 24);
  assert.equal(items[0].title, 'News 0');
});
test('hung news requests time out and cancelled location requests stop', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url, options) => new Promise((_resolve, reject) => {
    const signal = options!.signal!;
    if (signal.aborted) reject(new Error('aborted'));
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  })) as typeof fetch;
  try {
    await assert.rejects(fetchNewsJson('/test', new AbortController().signal, 5), /aborted/);
    const request = new AbortController();
    const pending = fetchNewsJson('/test', request.signal);
    request.abort();
    await assert.rejects(pending, /aborted/);
  } finally { globalThis.fetch = original; }
});
