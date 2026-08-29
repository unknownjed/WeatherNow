const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const oldCard = `function NewsItemCard({ item, idx }: { item: NewsItem, idx: number, key?: React.Key }) {
  const extracted = extractImageFromHtml(item.content || item.description || '');
  const [imgUrl, setImgUrl] = useState<string | null>(getHighResImgUrl(item.enclosure?.link || item.enclosure?.thumbnail || item.thumbnail || extracted || null));
  const [loadingImg, setLoadingImg] = useState(!imgUrl);

  useEffect(() => {
    let isMounted = true;
    if (!imgUrl && item.link) {
      // Try to fetch image preview from our server proxy
      fetch(\`/api/link-preview?url=\${encodeURIComponent(item.link)}\`)
        .then(res => res.json())
        .then(data => {
          if (isMounted) {
            if (data.image) setImgUrl(getHighResImgUrl(data.image));
            setLoadingImg(false);
          }
        })
        .catch(() => {
          if (isMounted) setLoadingImg(false);
        });
    } else {
      setLoadingImg(false);
    }
    return () => { isMounted = false; };
  }, [item.link, imgUrl]);`;

const newCard = `function NewsItemCard({ item, idx }: { item: NewsItem, idx: number, key?: React.Key }) {
  const extracted = extractImageFromHtml(item.content || item.description || '');
  const initialImg = getHighResImgUrl(item.enclosure?.link || item.enclosure?.thumbnail || item.thumbnail || extracted || null);
  const [imgUrl, setImgUrl] = useState<string | null>(initialImg);
  const [loadingImg, setLoadingImg] = useState(!initialImg);
  const [hasFetchedPreview, setHasFetchedPreview] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!imgUrl && item.link && !hasFetchedPreview && !imageFailed) {
      setHasFetchedPreview(true);
      fetch(\`/api/link-preview?url=\${encodeURIComponent(item.link)}\`)
        .then(res => res.json())
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
      setLoadingImg(false);
    }
    return () => { isMounted = false; };
  }, [item.link, imgUrl, hasFetchedPreview, imageFailed]);`;

code = code.replace(oldCard, newCard);

const oldImg = `            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.style.display = 'none';
              setImgUrl(null);
            }}`;

const newImg = `            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.style.display = 'none';
              setImageFailed(true);
              setImgUrl(null);
            }}`;

code = code.replace(oldImg, newImg);
fs.writeFileSync('src/components/NewsFeed.tsx', code);
