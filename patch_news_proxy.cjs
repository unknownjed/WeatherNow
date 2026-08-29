const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// Add rss parser package
const { execSync } = require('child_process');
try {
  execSync('npm install rss-parser');
} catch (e) {
  console.log(e);
}

