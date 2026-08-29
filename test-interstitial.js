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
    const jsRedirect = html.match(/window\.location\.replace\(['"]([^'"]+)['"]\)/);
    const metaRefresh = html.match(/<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^;]+;url=([^"']+)["']/i);
    const cData = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>here<\/a>/i);
    console.log("jsRedirect:", jsRedirect ? jsRedirect[1] : null);
    console.log("metaRefresh:", metaRefresh ? metaRefresh[1] : null);
    console.log("cData:", cData ? cData[1] : null);
    const dataUrlMatch = html.match(/data-url=["']([^"']+)["']/);
    console.log("data-url:", dataUrlMatch ? dataUrlMatch[1] : null);
  })
  .catch(console.error);
