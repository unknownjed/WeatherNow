const fs = require('fs');
const path = require('path');

const replacements = [
  { regex: /\bbg-slate-950\b/g, rep: "bg-slate-50 dark:bg-slate-950" },
  { regex: /\bbg-slate-900\b/g, rep: "bg-white dark:bg-slate-900" },
  { regex: /\bbg-slate-800\b/g, rep: "bg-slate-100 dark:bg-slate-800" },
  { regex: /\bborder-slate-800\b/g, rep: "border-slate-200 dark:border-slate-800" },
  { regex: /\bborder-slate-700\b/g, rep: "border-slate-300 dark:border-slate-700" },
  { regex: /\btext-slate-200\b/g, rep: "text-slate-800 dark:text-slate-200" },
  { regex: /\btext-slate-300\b/g, rep: "text-slate-700 dark:text-slate-300" },
  { regex: /\btext-slate-400\b/g, rep: "text-slate-600 dark:text-slate-400" },
  { regex: /\btext-slate-500\b/g, rep: "text-slate-500 dark:text-slate-500" },
  { regex: /\btext-white\b/g, rep: "text-slate-900 dark:text-white" },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      for (const { regex, rep } of replacements) {
        content = content.replace(regex, rep);
      }
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory('./src');
