const url = 'http://www.bing.com/news/apiclick.aspx?ref=FexRss&aid=&tid=6a8d4e4f8eea43b5aedeafd108a26648&url=https%3a%2f%2fwww.msn.com%2fen-us%2fweather%2ftopstories%2fseattle-weather-smoky-in-western-wa-with-summer-heat%2far-AA2aQ6Gh&c=12543196927839379745&mkt=en-sg';
fetch(url, { redirect: 'follow' })
  .then(res => {
    console.log('Status:', res.status, 'Final URL:', res.url);
    return res.text();
  })
  .then(html => {
    console.log('og:image matches:', html.match(/<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i));
  })
  .catch(console.error);
