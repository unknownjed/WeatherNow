const fs = require('fs');

let content = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

// Insert NewsItemCard component before NewsFeed
const cardComponent = `
function NewsItemCard({ item, idx }: { item: NewsItem, idx: number }) {
  const [imgUrl, setImgUrl] = useState<string | null>(item.enclosure?.link || item.enclosure?.thumbnail || item.thumbnail || null);
  const [loadingImg, setLoadingImg] = useState(!imgUrl);

  useEffect(() => {
    let isMounted = true;
    if (!imgUrl && item.link) {
      // Try to fetch image preview from our server proxy
      fetch(\`/api/link-preview?url=\${encodeURIComponent(item.link)}\`)
        .then(res => res.json())
        .then(data => {
          if (isMounted) {
            if (data.image) setImgUrl(data.image);
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
  }, [item.link, imgUrl]);

  return (
    <a 
      key={idx} 
      href={item.link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col group transition-all shadow-sm hover:shadow-indigo-500/5 overflow-hidden h-full"
    >
      <div className="w-full h-40 sm:h-48 bg-sky-200 dark:bg-slate-800 overflow-hidden relative flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
        {imgUrl ? (
          <img 
            src={imgUrl} 
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.style.display = 'none';
              setImgUrl(null);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:scale-110 transition-transform duration-500">
             {loadingImg ? (
               <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
             ) : (
               <Newspaper size={64} className="text-sky-800 dark:text-slate-400" />
             )}
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex justify-between items-start gap-4">
          <h3 className="font-semibold text-sky-950 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors line-clamp-3 leading-snug">
            {item.title}
          </h3>
          <div className="bg-sky-200 dark:bg-slate-800 p-1.5 rounded-md group-hover:bg-indigo-500/20 transition-colors flex-shrink-0">
            <ExternalLink size={14} className="text-sky-800 dark:text-slate-400 group-hover:text-indigo-600 dark:text-indigo-400 transition-colors" />
          </div>
        </div>
        {item.contentSnippet && (
           <p className="text-sm text-sky-800 dark:text-slate-400 line-clamp-2 leading-relaxed mt-1">{item.contentSnippet}</p>
        )}
        <div className="mt-auto pt-4 flex justify-between items-center text-[10px] sm:text-xs text-sky-800 dark:text-slate-400 font-mono border-t border-sky-200 dark:border-slate-800/50">
          <span className="uppercase tracking-wider font-bold text-slate-600">{item.source || 'Top Story'}</span>
          <span>{format(new Date(item.pubDate), 'MMM d, HH:mm')}</span>
        </div>
      </div>
    </a>
  );
}

export function NewsFeed`;

if (!content.includes('NewsItemCard')) {
  content = content.replace('export function NewsFeed', cardComponent);

  // Replace map content with NewsItemCard
  const mapRegex = /news\.map\(\(item, idx\) => \{[\s\S]*?\}\)/g;
  content = content.replace(mapRegex, 'news.map((item, idx) => (\n              <NewsItemCard key={idx} item={item} idx={idx} />\n            ))');
  
  fs.writeFileSync('src/components/NewsFeed.tsx', content, 'utf8');
  console.log('Updated NewsFeed.tsx');
}
