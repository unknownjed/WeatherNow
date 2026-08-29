const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldTimeout = `signal: AbortSignal.timeout(5000)`;
const newTimeout = `signal: AbortSignal.timeout(2000)`;

code = code.replace(oldTimeout, newTimeout);

fs.writeFileSync('server.ts', code);
