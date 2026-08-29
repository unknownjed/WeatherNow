const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
async function test() {
  const rssUrl = 'https://flipboard.com/topic/newyork.rss';
  const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
  const data = await res.json();
  const items = data.items.slice(0,2).map(i => ({
    title: i.title,
    thumbnail: i.enclosure?.link || i.thumbnail,
    source: i.source
  }));
  console.log(JSON.stringify(items, null, 2));
}
test();
