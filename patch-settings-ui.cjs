const fs = require('fs');
let file = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

const calendarSettingsStr = `              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">Calendar Notifications</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">Receive event reminders.</div>
                </div>
                <div className="flex bg-sky-100 dark:bg-slate-950 p-1 rounded-lg border border-sky-200 dark:border-slate-800">
                  <button 
                    onClick={() => setSettings({ ...settings, calendarNotifications: true })}
                    className={\`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors \${settings.calendarNotifications !== false ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}\`}
                  >
                    Enabled
                  </button>
                  <button 
                    onClick={() => setSettings({ ...settings, calendarNotifications: false })}
                    className={\`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors \${settings.calendarNotifications === false ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}\`}
                  >
                    Disabled
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">Calendar Alerts</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">Audio alerts for upcoming events.</div>
                </div>
                <div className="flex bg-sky-100 dark:bg-slate-950 p-1 rounded-lg border border-sky-200 dark:border-slate-800">
                  <button 
                    onClick={() => setSettings({ ...settings, calendarAlerts: true })}
                    className={\`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors \${settings.calendarAlerts !== false ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}\`}
                  >
                    Enabled
                  </button>
                  <button 
                    onClick={() => setSettings({ ...settings, calendarAlerts: false })}
                    className={\`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors \${settings.calendarAlerts === false ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}\`}
                  >
                    Disabled
                  </button>
                </div>
              </div>`;

file = file.replace(
  '              </div>\n            </div>\n          </div>\n        </div>\n\n        {/* 4. Appearance */}',
  calendarSettingsStr + '\n            </div>\n          </div>\n        </div>\n\n        {/* 4. Appearance */}'
);

fs.writeFileSync('src/components/SettingsPanel.tsx', file, 'utf8');
