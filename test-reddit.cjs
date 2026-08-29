const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
async function test() {
  const url = 'https://www.reddit.com/search.json?q=New%20York+news&sort=new&limit=2';
  const res = await fetch(url, { headers: { 'User-Agent': 'weather-dashboard-bot/1.0' }});
  const data = await res.json();
  const items = data.data.children.map(c => ({
    title: c.data.title,
    thumbnail: c.data.thumbnail,
    url: c.data.url
  }));
  console.log(JSON.stringify(items, null, 2));
}
test();
