const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
async function test() {
  const rssUrl = 'https://www.bing.com/news/search?q=New%20York&format=rss';
  const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
  const data = await res.json();
  console.log(JSON.stringify(data.items[0], null, 2));
}
test();
