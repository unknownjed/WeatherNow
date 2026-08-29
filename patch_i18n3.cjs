const fs = require('fs');
let code = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const newTranslations = {
  en: { notConnected: "Not connected", connectedAs: "Connected as {email}" },
  es: { notConnected: "No conectado", connectedAs: "Conectado como {email}" },
  fr: { notConnected: "Non connecté", connectedAs: "Connecté en tant que {email}" },
  de: { notConnected: "Nicht verbunden", connectedAs: "Verbunden als {email}" },
  zh: { notConnected: "未连接", connectedAs: "已连接为 {email}" },
  ja: { notConnected: "未接続", connectedAs: "{email} として接続済み" },
  ko: { notConnected: "연결되지 않음", connectedAs: "{email}님으로 연결됨" },
  ru: { notConnected: "Не подключено", connectedAs: "Подключено как {email}" },
  ar: { notConnected: "غير متصل", connectedAs: "متصل كـ {email}" }
};

for (const lang in newTranslations) {
  const insertIndex = code.indexOf('"themeDesc":', code.indexOf('"' + lang + '": {'));
  if (insertIndex > -1) {
    const toInsert = '"notConnected": "' + newTranslations[lang].notConnected + '",\n    "connectedAs": "' + newTranslations[lang].connectedAs + '",\n    ';
    code = code.slice(0, insertIndex) + toInsert + code.slice(insertIndex);
  }
}

fs.writeFileSync('src/lib/i18n.ts', code);
