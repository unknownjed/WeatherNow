const fs = require('fs');
const path = require('path');

const replacements = [
  // Fix the Wind text color in App.tsx
  { regex: /text-indigo-300 font-mono/g, rep: "font-mono text-sky-900 dark:text-slate-300" },
  
  // Fix the time format color in App.tsx
  { regex: /text-indigo-300 whitespace-nowrap/g, rep: "text-indigo-600 dark:text-indigo-300 whitespace-nowrap" },
  
  // Fix hover:text-indigo-300 in NewsFeed
  { regex: /group-hover:text-indigo-300/g, rep: "group-hover:text-indigo-600 dark:group-hover:text-indigo-300" },

  // Change generic text-slate-500 dark:text-slate-500 to text-sky-800 dark:text-slate-400 for better visibility in light theme
  { regex: /text-slate-500 dark:text-slate-500/g, rep: "text-sky-800 dark:text-slate-400" },
  { regex: /text-slate-500(?=\s+dark:)/g, rep: "text-sky-800" }, // Any missing

  // Change text-indigo-400 for active states to text-indigo-600 dark:text-indigo-400
  { regex: /text-indigo-400\b/g, rep: "text-indigo-600 dark:text-indigo-400" },
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
