const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldReturn = `  return (
    <div className={\`flex flex-col h-screen overflow-hidden text-slate-800 dark:text-slate-200 transition-colors duration-300 \${settings.theme}\`}>`;

const newReturn = `  if (!isInstalled) {
    return (
      <div className={\`flex flex-col h-screen w-full items-center justify-center bg-sky-50 dark:bg-slate-950 p-6 text-center \${settings.theme}\`}>
        <div className="max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8 border border-sky-100 dark:border-slate-800 flex flex-col items-center">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <CloudSun size={40} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-sky-950 dark:text-slate-100 mb-2">WeatherNow App</h1>
          <p className="text-sky-800 dark:text-slate-400 text-sm mb-8">
            This application is designed exclusively as a Progressive Web App (PWA). Please install it to your device to continue.
          </p>
          
          {deferredPrompt ? (
            <button 
              onClick={async () => {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') setDeferredPrompt(null);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-indigo-500/20 active:scale-[0.98]"
            >
              Install Application
            </button>
          ) : (
            <div className="flex flex-col items-center w-full gap-4">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-800/30">
                Installation is blocked in this view. Please open this app in a <b>New Tab</b> or <b>Standalone Browser</b> to install.
              </p>
              <div className="w-full text-left bg-sky-50 dark:bg-slate-800 p-4 rounded-lg">
                <h3 className="text-xs font-bold text-sky-900 dark:text-slate-300 uppercase tracking-wider mb-2">Manual Install</h3>
                <ul className="text-[11px] text-sky-800 dark:text-slate-400 space-y-2 list-disc pl-4">
                  <li><b>iOS Safari:</b> Tap Share → Add to Home Screen</li>
                  <li><b>Android/Chrome:</b> Tap Menu (⋮) → Install App</li>
                  <li><b>Desktop:</b> Click the install icon in the address bar</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={\`flex flex-col h-screen overflow-hidden text-slate-800 dark:text-slate-200 transition-colors duration-300 \${settings.theme}\`}>`;

code = code.replace(oldReturn, newReturn);
fs.writeFileSync('src/App.tsx', code);
