const url = 'https://news.google.com/rss/headlines/section/topic/WORLD';
fetch(url)
  .then(res => res.text())
  .then(xml => {
    const linkMatch = xml.match(/<link>(https:\/\/news\.google\.com\/rss\/articles\/[^<]+)<\/link>/);
    if (linkMatch) {
      return fetch(linkMatch[1], { redirect: 'follow' });
    }
  })
  .then(res => res.text())
  .then(html => {
    const ogMatches = html.match(/<meta[^>]*image[^>]*>/gi);
    console.log("ogMatches:", ogMatches);
  })
  .catch(console.error);
