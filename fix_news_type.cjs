const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');
code = code.replace("contentSnippet: string;", "contentSnippet: string;\n  content?: string;\n  description?: string;");
fs.writeFileSync('src/components/NewsFeed.tsx', code);
