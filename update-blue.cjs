const fs = require('fs');
const path = require('path');

const replacements = [
  { regex: /\bbg-slate-50\b/g, rep: "bg-sky-100" },
  { regex: /\bbg-slate-50\//g, rep: "bg-sky-100/" },
  { regex: /\bbg-white\b(?=\s+dark:bg-slate-900)/g, rep: "bg-sky-50" },
  { regex: /\bbg-slate-100\b/g, rep: "bg-sky-200" },
  { regex: /\bborder-slate-200\b/g, rep: "border-sky-200" },
  { regex: /\bborder-slate-300\b/g, rep: "border-sky-300" },
  { regex: /\btext-slate-800\b(?=\s+dark:)/g, rep: "text-sky-950" },
  { regex: /\btext-slate-700\b(?=\s+dark:)/g, rep: "text-sky-900" },
  { regex: /\btext-slate-600\b(?=\s+dark:)/g, rep: "text-sky-800" },
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
