const link = 'http://www.bing.com/news/apiclick.aspx?ref=FexRss&aid=&tid=123&url=https%3a%2f%2fwww.msn.com%2fen-us%2fweather&c=123&mkt=en-sg';
const urlObj = new URL(link);
if (urlObj.searchParams.has('url')) {
  console.log(urlObj.searchParams.get('url'));
}
