const fs = require('fs');
let code = fs.readFileSync('src/components/HistoricalChart.tsx', 'utf8');

code = code.replace("interface HistoricalChartProps {\n  data: {", "interface HistoricalChartProps {\n  settings?: any;\n  data: {");
code = code.replace("export function HistoricalChart({ data }: HistoricalChartProps) {", "export function HistoricalChart({ data, settings }: HistoricalChartProps) {");

fs.writeFileSync('src/components/HistoricalChart.tsx', code);
