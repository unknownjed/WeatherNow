import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractNewsImages } from './newsPreview.ts';

test('metadata handles arbitrary attribute order, extra attributes and encoded URL signatures', () => {
  assert.deepEqual(extractNewsImages(`<meta data-id="a" content="/photo.jpg?w=600&amp;sig=a&#38;b=2" data-test="x" property="og:image"><meta name='twitter:image' content='https://cdn.example/alternate.jpg'>`, 'https://news.example/article'), ['https://news.example/photo.jpg?w=600&sig=a&b=2', 'https://cdn.example/alternate.jpg']);
});
test('skip logos and recover article JSON-LD images and lazy article body images', () => {
  const html = `<meta property="og:image" content="/logo.png"><script type="application/ld+json">{"@graph":[{"@type":"NewsArticle","image":[{"url":"/report.jpg"}]}]}</script><header><img src="/unrelated.jpg"></header><article><img src="data:image/gif;base64,abc" data-src="/body.jpg"></article>`;
  assert.deepEqual(extractNewsImages(html, 'https://news.example/page'), ['https://news.example/report.jpg', 'https://news.example/body.jpg']);
});
test('reject unsafe image protocols and malformed metadata without failing the article', () => {
  assert.deepEqual(extractNewsImages(`<meta property="og:image" content="javascript:alert(1)"><script type="application/ld+json">bad json</script>`, 'https://news.example/page'), []);
});
