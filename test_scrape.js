const url = 'https://news.google.com/rss/articles/CBMif0FVX3lxTE1WdXlTX1U5V3ZzbWYwZnpXMm1SUDVIY3VMR043SFBvUjhzY1FEZ3pnUEJDTkQxVzY4NEY0UWFHYngzVjBDNkNfWkJjNEtlUUxpV21SeHFrY1Fkcm9pWnoyV3ZRSHduMlRzSGM4WGg0eHpGSDFZOW5xNnFDLTU2bVE?oc=5';
fetch(url, { redirect: 'follow' })
  .then(res => {
    console.log('Status:', res.status, res.url);
    return res.text();
  })
  .then(html => {
    console.log('og:image matches:', html.match(/<meta[^>]+property=["']og:image["'][^>]*>/i));
  })
  .catch(console.error);
