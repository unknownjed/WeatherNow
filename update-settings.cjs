const fs = require('fs');
const path = require('path');

let content = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

// Section headers
content = content.replace(/className="text-sm font-bold text-sky-900/g, 'className="text-xs sm:text-sm font-bold text-sky-900');

// Setting labels
content = content.replace(/className="font-medium text-sky-950/g, 'className="text-xs sm:text-sm font-medium text-sky-950');

// Setting descriptions
content = content.replace(/className="text-xs text-sky-800/g, 'className="text-[10px] sm:text-xs text-sky-800');

// Toggle switch buttons (inside bg-sky-100 dark:bg-slate-950 wrappers)
content = content.replace(/px-3 py-1.5 rounded-md text-xs/g, 'px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs');

// Other buttons (Save Current, Sign Out, Connect Account)
content = content.replace(/className="text-xs bg-indigo-600/g, 'className="text-[10px] sm:text-xs bg-indigo-600');
content = content.replace(/text-white px-3 py-1.5/g, 'text-white px-2 py-1 sm:px-3 sm:py-1.5');
content = content.replace(/text-white px-4 py-2/g, 'text-white px-3 py-1.5 sm:px-4 sm:py-2');
content = content.replace(/className="text-xs bg-sky-200/g, 'className="text-[10px] sm:text-xs bg-sky-200');
content = content.replace(/text-sky-950 dark:text-slate-200 px-4 py-2/g, 'text-sky-950 dark:text-slate-200 px-3 py-1.5 sm:px-4 sm:py-2');

// Saved locations listing text
content = content.replace(/className="text-sm text-sky-900/g, 'className="text-xs sm:text-sm text-sky-900');
content = content.replace(/className="text-xs text-red-400/g, 'className="text-[10px] sm:text-xs text-red-400');

fs.writeFileSync('src/components/SettingsPanel.tsx', content, 'utf8');
console.log('Updated SettingsPanel.tsx');
