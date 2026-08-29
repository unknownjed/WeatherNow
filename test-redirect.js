const url = 'https://news.google.com/rss/articles/CBMiJWh0dHBzOi8vd3d3LmJiYy5jb20vbmV3cy93b3JsZC02NzUzNjUzMdIBAA?oc=5'; // example fake url, let me get a real one from RSS.
fetch('https://news.google.com/rss/headlines/section/topic/WORLD')
  .then(res => res.text())
  .then(xml => {
    const linkMatch = xml.match(/<link>(https:\/\/news\.google\.com\/rss\/articles\/[^<]+)<\/link>/);
    if (linkMatch) {
      console.log("Found link:", linkMatch[1]);
      return fetch(linkMatch[1], { redirect: 'follow' });
    }
  })
  .then(res => {
    console.log("Final URL:", res?.url);
    return res?.text();
  })
  .then(html => {
    console.log("HTML length:", html?.length);
    console.log("og:image present:", /og:image/i.test(html));
  })
  .catch(console.error);
