const url = 'https://news.google.com/rss/articles/CBMimwFBVV95cUxQa3ZPWXhackZ1UVdsdEh2VjRTVWR3b2RzX2RDWmlvNURpVWRwUjlWSlYxS2Z2cFl1RzcyZl9VTU00TXNLME1YZ2JhYm16azVvdXhEMFB1Q0pZTHdfa3loODExWlBDOXVKeG5seThqbDhxV1NOUnp2cWZ0NmNxX1hxQXlVN2JUdVBISVhrMzB5OHBfUmJMMjZZQ2NBMA?oc=5';
fetch(url, { redirect: 'follow' })
  .then(res => {
    console.log('Status:', res.status, 'Final URL:', res.url);
    return res.text();
  })
  .then(html => {
    console.log('og:image matches:', html.match(/<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)["']/i));
  })
  .catch(console.error);
