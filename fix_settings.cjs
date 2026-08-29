const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

const oldRender = `                <div>
                  {isInstalled ? (
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 px-3 py-1.5 sm:px-4 sm:py-2 flex items-center">✓ {t('appInstalled')}</span>
                  ) : (
                    <button onClick={handleInstallClick} className="text-[10px] sm:text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md transition-colors">{t('installApp')}</button>
                  )}
                </div>`;

const newRender = `                <div className="flex flex-col items-end gap-2">
                  {isInstalled ? (
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 px-3 py-1.5 sm:px-4 sm:py-2 flex items-center">✓ {t('appInstalled')}</span>
                  ) : (
                    <button onClick={handleInstallClick} className="text-[10px] sm:text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md transition-colors">{t('installApp')}</button>
                  )}
                  {showInstallInstruction && (
                    <div className="text-[10px] text-sky-800 dark:text-slate-400 bg-sky-100 dark:bg-slate-800 p-2 rounded max-w-[200px] text-right">
                      To install: Tap Share <span className="inline-block border border-sky-300 dark:border-slate-600 rounded px-1">↑</span> then "Add to Home Screen" (iOS) or click the install icon in your address bar (Desktop/Android).
                    </div>
                  )}
                </div>`;

code = code.replace(oldRender, newRender);
fs.writeFileSync('src/components/SettingsPanel.tsx', code);
