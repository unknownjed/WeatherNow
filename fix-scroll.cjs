const fs = require('fs');

let content = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

// The replacement logic
// We want to wrap the top bar and the grid in a single scrolling container.

content = content.replace(
  '<section className="flex-1 relative bg-sky-100 dark:bg-slate-950 overflow-hidden flex flex-col">\n      <div className="p-4 sm:p-6 border-b border-sky-200 dark:border-slate-800 flex justify-between items-center bg-sky-50 dark:bg-slate-900 flex-none z-10 shadow-sm">',
  '<section className="flex-1 relative bg-sky-100 dark:bg-slate-950 overflow-hidden flex flex-col">\n      <div className="flex-1 overflow-y-auto relative flex flex-col">\n        <div className="p-4 sm:p-6 border-b border-sky-200 dark:border-slate-800 flex justify-between items-center bg-sky-50 dark:bg-slate-900 flex-none z-10 shadow-sm sticky top-0" style={{ position: "relative" }}>'
);

// We need to change the inner scrolling container to just be a padding container, taking up remaining space
content = content.replace(
  '<div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-sky-100 dark:bg-slate-950 relative">',
  '<div className="flex-1 p-4 sm:p-6 bg-sky-100 dark:bg-slate-950 relative">'
);

// We added an extra div wrapper, so we need to add a closing div before the section ends
content = content.replace(
  '      </div>\n    </section>',
  '      </div>\n      </div>\n    </section>'
);

fs.writeFileSync('src/components/NewsFeed.tsx', content, 'utf8');
console.log('Fixed scroll');
