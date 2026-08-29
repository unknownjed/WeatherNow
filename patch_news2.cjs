const fs = require('fs');

let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const startIdx = code.indexOf('const fetchNews = async () => {');
const endIdx = code.indexOf('  return (', startIdx);

const newFetchNews = `const fetchNews = async () => {
    setLoading(true);
    try {
      const topic = locationName ? locationName : (country ? country : 'Weather');
      
      let hl = 'en-US';
      let gl = 'US';
      if (language === 'es') { hl = 'es-419'; gl = 'MX'; }
      else if (language === 'fr') { hl = 'fr-FR'; gl = 'FR'; }
      else if (language === 'de') { hl = 'de-DE'; gl = 'DE'; }
      else if (language === 'zh') { hl = 'zh-CN'; gl = 'CN'; }
      else if (language === 'ja') { hl = 'ja'; gl = 'JP'; }
      else if (language === 'ar') { hl = 'ar'; gl = 'EG'; }
      else if (language === 'ko') { hl = 'ko'; gl = 'KR'; }
      else if (language === 'ru') { hl = 'ru'; gl = 'RU'; }
      else if (language === 'it') { hl = 'it'; gl = 'IT'; }
      else if (language === 'pt') { hl = 'pt-BR'; gl = 'BR'; }
      else if (language === 'hi') { hl = 'hi'; gl = 'IN'; }
            
      const googleNewsUrl = \`https://news.google.com/rss/search?q=\${encodeURIComponent(topic + ' weather OR news')}&hl=\${hl}&gl=\${gl}&ceid=\${gl}:\${hl}\`;
      const fallbackUrl = \`https://flipboard.com/topic/\${encodeURIComponent(country ? country.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'weather')}.rss\`;

      const urls = [googleNewsUrl, fallbackUrl];

      const promises = urls.map(url => 
         fetch(\`https://api.rss2json.com/v1/api.json?rss_url=\${encodeURIComponent(url)}\`)
          .then(res => res.json())
          .catch(() => null)
      );
      
      const results = await Promise.all(promises);
      let allItems = [];
      const seenTitles = new Set();
      
      results.forEach(data => {
        if (data && data.items) {
          data.items.forEach(item => {
            if (!seenTitles.has(item.title)) {
              seenTitles.add(item.title);
              allItems.push(item);
            }
          });
        }
      });
      
      allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setNews(allItems);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

`;

code = code.slice(0, startIdx) + newFetchNews + code.slice(endIdx);

fs.writeFileSync('src/components/NewsFeed.tsx', code);
