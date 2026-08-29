const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

// 1. Add Paywalled Domains filter
const oldPushLogic = `          data.items.forEach(item => {
            if (!seenTitles.has(item.title)) {
              seenTitles.add(item.title);
              allItems.push(item);
            }
          });`;

const newPushLogic = `          const paywalledDomains = [
            'nytimes.com', 'wsj.com', 'washingtonpost.com', 'bloomberg.com', 'ft.com',
            'thetimes.co.uk', 'economist.com', 'businessinsider.com', 'wired.com', 
            'theathletic.com', 'seattletimes.com', 'bostonglobe.com', 'latimes.com', 
            'theaustralian.com.au', 'telegraph.co.uk', 'reuters.com', 'theglobeandmail.com',
            'forbes.com', 'barrons.com', 'chicagotribune.com'
          ];
          
          data.items.forEach(item => {
            const link = item.link || '';
            const isPaywalled = paywalledDomains.some(domain => link.includes(domain));
            
            if (!seenTitles.has(item.title) && !isPaywalled) {
              seenTitles.add(item.title);
              allItems.push(item);
            }
          });`;

code = code.replace(oldPushLogic, newPushLogic);

// 2. Add timeout to link-preview fetch in client side
const oldFetchPreview = `      fetch(\`/api/link-preview?url=\${encodeURIComponent(item.link)}\`)
        .then(res => res.json())`;

const newFetchPreview = `      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-second fast fail
      
      fetch(\`/api/link-preview?url=\${encodeURIComponent(item.link)}\`, { signal: controller.signal })
        .then(res => {
          clearTimeout(timeoutId);
          return res.json();
        })`;

code = code.replace(oldFetchPreview, newFetchPreview);

fs.writeFileSync('src/components/NewsFeed.tsx', code);
