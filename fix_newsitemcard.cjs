const fs = require('fs');
const code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const oldCode = `  const [imgUrl, setImgUrl] = useState<string | null>(initialImg);
  const [loadingImg, setLoadingImg] = useState(!initialImg);
  const [hasFetchedPreview, setHasFetchedPreview] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
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
  }, [item.link, imgUrl, hasFetchedPreview, imageFailed]);

  // Hide articles that fail to load an image preview to keep the feed visually clean
  if (!loadingImg && !imgUrl) return null;`;

const newCode = `  const [imgUrl, setImgUrl] = useState<string | null>(initialImg);
  const [loadingImg, setLoadingImg] = useState(!initialImg);
  const fetchedRef = React.useRef(false);

  useEffect(() => {
    let isMounted = true;
    const isGoogleNews = item.link && item.link.includes('news.google.com');
    
    if (!initialImg && item.link && !fetchedRef.current && !isGoogleNews) {
      fetchedRef.current = true;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); 
      
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
        
      return () => { isMounted = false; controller.abort(); };
    } else if (!fetchedRef.current) {
      fetchedRef.current = true;
      if (isMounted) setLoadingImg(false);
    }
    
    return () => { isMounted = false; };
  }, [item.link, initialImg]);

  // Hide articles that fail to load an image preview to keep the feed visually clean
  if (!loadingImg && !imgUrl) return null;`;

fs.writeFileSync('src/components/NewsFeed.tsx', code.replace(oldCode, newCode));
