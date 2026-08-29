const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

const newLangBlock = `                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>`;
                    
const blockRegex = /<option value="en">English<\/option>[\s\S]*?<option value="ar">العربية<\/option>/;
code = code.replace(blockRegex, newLangBlock);

fs.writeFileSync('src/components/SettingsPanel.tsx', code);
