const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const oldCardRender = `    <a 
      key={idx} 
      href={item.link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col group transition-all shadow-sm hover:shadow-indigo-500/5 overflow-hidden h-full"
    >
      {(imgUrl || loadingImg) && (
        <div className="w-full h-40 sm:h-48 bg-sky-200 dark:bg-slate-800 overflow-hidden relative flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 border-b border-sky-200 dark:border-slate-800">
          {imgUrl ? (
            <img 
              src={imgUrl} 
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                setImageFailed(true);
                setImgUrl(null);
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:scale-110 transition-transform duration-500">
               {loadingImg && (
                 <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
               )}
            </div>
          )}
        </div>
      )}`;

const newCardRender = `    <a 
      key={idx} 
      href={item.link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col group transition-all shadow-sm hover:shadow-indigo-500/10 overflow-hidden h-full"
    >
      <div className="w-full h-40 sm:h-48 bg-sky-100 dark:bg-slate-800 overflow-hidden relative flex-shrink-0 flex items-center justify-center border-b border-sky-200 dark:border-slate-800 bg-gradient-to-br from-sky-100 to-sky-50 dark:from-slate-800 dark:to-slate-900">
        {imgUrl ? (
          <img 
            src={imgUrl} 
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              setImageFailed(true);
              setImgUrl(null);
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500">
             {loadingImg ? (
               <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
             ) : (
               <div className="opacity-40 group-hover:scale-110 transition-transform duration-500">
                 <Newspaper size={48} className="text-sky-600 dark:text-slate-400" />
               </div>
             )}
          </div>
        )}
      </div>`;

code = code.replace(oldCardRender, newCardRender);
fs.writeFileSync('src/components/NewsFeed.tsx', code);
