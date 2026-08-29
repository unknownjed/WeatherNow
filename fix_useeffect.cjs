const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const oldEffect = `  useEffect(() => {
    let isMounted = true;

    // Skip link-preview for Google News URLs because they are redirects 
    // and only return blurry publisher logos, not article images.
    const isGoogleNews = item.link && item.link.includes('news.google.com');
    
    if (!imgUrl && item.link && !hasFetchedPreview && !imageFailed && !isGoogleNews) {
      setHasFetchedPreview(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-second fast fail
      
      fetch(\`/api/link-preview?url=\${encodeURIComponent(item.link)}\`, { signal: controller.signal })
        .then(res => {
          clearTimeout(timeoutId);
          return res.json();
        })
        .then(data => {
          if (isMounted) {
            if (data.image) setImgUrl(getHighResImgUrl(data.image));
            setLoadingImg(false);
          }
        })
        .catch(() => {
          if (isMounted) setLoadingImg(false);
        });
    } else if (!hasFetchedPreview) {
      setHasFetchedPreview(true);
      setLoadingImg(false);
    }
    return () => { isMounted = false; };
  }, [item.link, imgUrl, hasFetchedPreview, imageFailed]);`;

const newEffect = `  useEffect(() => {
    // Skip link-preview for Google News URLs because they are redirects 
    // and only return blurry publisher logos, not article images.
    const isGoogleNews = item.link && item.link.includes('news.google.com');
    
    if (!imgUrl && item.link && !hasFetchedPreview && !imageFailed && !isGoogleNews) {
      setHasFetchedPreview(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-second fast fail
      
      fetch(\`/api/link-preview?url=\${encodeURIComponent(item.link)}\`, { signal: controller.signal })
        .then(res => {
          clearTimeout(timeoutId);
          return res.json();
        })
        .then(data => {
          if (data.image) setImgUrl(getHighResImgUrl(data.image));
          setLoadingImg(false);
        })
        .catch(() => {
          setLoadingImg(false);
        });
    } else if (!hasFetchedPreview) {
      setHasFetchedPreview(true);
      setLoadingImg(false);
    }
  }, [item.link, imgUrl, hasFetchedPreview, imageFailed]);`;

code = code.replace(oldEffect, newEffect);
fs.writeFileSync('src/components/NewsFeed.tsx', code);
