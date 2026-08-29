const fs = require('fs');
let code = fs.readFileSync('src/lib/i18n.ts', 'utf8');

// I inserted them like this:
// "enabled": "...",
// "disabled": "...",
// "signOut": "...",
// "connectAccount": "...",

code = code.replace(/"disabled":\s*"[^"]+",\s*"signOut":\s*"[^"]+",\s*"connectAccount":\s*"[^"]+",/g, (match) => {
  // Return just the "disabled": "..." part
  const disabledPart = match.match(/"disabled":\s*"[^"]+",/)[0];
  return disabledPart;
});

fs.writeFileSync('src/lib/i18n.ts', code);
