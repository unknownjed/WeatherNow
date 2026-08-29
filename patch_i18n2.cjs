const fs = require('fs');
let code = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const newTranslations = {
  en: { enabled: "Enabled", disabled: "Disabled", signOut: "Sign Out", connectAccount: "Connect Account" },
  es: { enabled: "Activado", disabled: "Desactivado", signOut: "Cerrar sesión", connectAccount: "Conectar cuenta" },
  fr: { enabled: "Activé", disabled: "Désactivé", signOut: "Déconnexion", connectAccount: "Connecter le compte" },
  de: { enabled: "Aktiviert", disabled: "Deaktiviert", signOut: "Abmelden", connectAccount: "Konto verbinden" },
  zh: { enabled: "已启用", disabled: "已禁用", signOut: "登出", connectAccount: "连接账户" },
  ja: { enabled: "有効", disabled: "無効", signOut: "サインアウト", connectAccount: "アカウントを連携" },
  ko: { enabled: "활성화됨", disabled: "비활성화됨", signOut: "로그아웃", connectAccount: "계정 연결" },
  ru: { enabled: "Включено", disabled: "Отключено", signOut: "Выйти", connectAccount: "Подключить аккаунт" },
  ar: { enabled: "مفعل", disabled: "معطل", signOut: "تسجيل الخروج", connectAccount: "ربط الحساب" }
};

for (const lang in newTranslations) {
  const insertIndex = code.indexOf('"themeDesc":', code.indexOf('"' + lang + '": {'));
  if (insertIndex > -1) {
    const toInsert = '"enabled": "' + newTranslations[lang].enabled + '",\n    "disabled": "' + newTranslations[lang].disabled + '",\n    "signOut": "' + newTranslations[lang].signOut + '",\n    "connectAccount": "' + newTranslations[lang].connectAccount + '",\n    ';
    code = code.slice(0, insertIndex) + toInsert + code.slice(insertIndex);
  }
}

fs.writeFileSync('src/lib/i18n.ts', code);
