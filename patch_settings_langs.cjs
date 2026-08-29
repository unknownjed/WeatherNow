const fs = require('fs');

let code = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

const oldLangs = /<option value="zh">中文<\/option>\s*<option value="ja">日本語<\/option>/;
const newLangs = `<option value="zh">中文</option>
                    <option value="ja">日本語</option>
                    <option value="ar">العربية</option>
                    <option value="ko">한국어</option>
                    <option value="ru">Русский</option>`;

code = code.replace(oldLangs, newLangs);

fs.writeFileSync('src/components/SettingsPanel.tsx', code);
