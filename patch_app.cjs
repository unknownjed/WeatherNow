const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldTile = `              {/* Current Weather Module */}
              <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden shadow-xl min-h-[250px] flex-none">
                {current ? (`;

const newTile = `              {/* Current Weather Module */}
              <div 
                className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between relative overflow-hidden shadow-xl min-h-[250px] flex-none cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                onClick={(e) => {
                  const target = e.target;
                  if (target.closest && !target.closest('button')) {
                    document.getElementById('weather-forecaster-btn')?.click();
                  }
                }}
              >
                {current ? (`;

code = code.replace(oldTile, newTile);
fs.writeFileSync('src/App.tsx', code);
