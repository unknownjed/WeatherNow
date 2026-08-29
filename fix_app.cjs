const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace("autoSpeak={settings.autoSpeak} language={settings.language}", "autoSpeak={settings.autoSpeak}");
fs.writeFileSync('src/App.tsx', code);

let histCode = fs.readFileSync('src/components/HistoricalChart.tsx', 'utf8');
histCode = histCode.replace("export function HistoricalChart({ data }: { data: any }) {", "export function HistoricalChart({ data, settings }: { data: any, settings: any }) {");
fs.writeFileSync('src/components/HistoricalChart.tsx', histCode);
