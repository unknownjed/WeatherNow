const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

const tImport = `import { useTranslation, LanguageCode } from '../lib/i18n';\n`;
if (!code.includes(tImport)) {
  code = code.replace("import { User } from 'firebase/auth';", "import { User } from 'firebase/auth';\n" + tImport);
}

const hook = `  const t = useTranslation(settings.language);\n`;
if (!code.includes("useTranslation(settings.language)")) {
  code = code.replace("const handleInstallClick =", hook + "\n  const handleInstallClick =");
}

const langBlock = `
        {/* Language */}
        <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner mb-8">
          <div className="p-4 sm:p-6 border-b border-sky-200 dark:border-slate-800">
            <h3 className="text-xs sm:text-sm font-bold text-sky-900 dark:text-slate-300 uppercase tracking-widest mb-4">{t('language')}</h3>
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('language')}</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">{t('languageDescription')}</div>
                </div>
                <div>
                  <select
                    value={settings.language || 'en'}
                    onChange={(e) => setSettings({ ...settings, language: e.target.value as LanguageCode })}
                    className="text-[10px] sm:text-xs bg-sky-200 dark:bg-slate-800 text-sky-950 dark:text-slate-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md border border-sky-300 dark:border-slate-700 outline-none"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="ja">日本語</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
`;

if (!code.includes(" {/* Language */}")) {
  code = code.replace("{/* 5. App & Integrations */}", langBlock + "\n        {/* 5. App & Integrations */}");
}

code = code.replace(/{t\('language'\)}/g, "{t('language')}");

fs.writeFileSync('src/components/SettingsPanel.tsx', code);
