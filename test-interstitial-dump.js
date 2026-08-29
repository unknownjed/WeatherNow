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
    console.log(html.substring(0, 1000));
    console.log("-------------------");
    const urls = html.match(/https:\/\/[^"'\s<>]+/g);
    console.log(urls ? urls.filter(u => !u.includes('google.com') && !u.includes('gstatic')).slice(0, 5) : 'no urls');
  })
  .catch(console.error);
