const fs = require('fs');

let code = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

// Replace the alert with a state that shows a message
code = code.replace(
  'const [deferredPrompt, setDeferredPrompt] = useState<any>(null);', // this was removed, it is now in props
  '' // do nothing here, the regex is for the alert
);

// We need to add a state for the fallback message
code = code.replace(
  'const t = useTranslation(settings.language);',
  'const t = useTranslation(settings.language);\n  const [showInstallInstruction, setShowInstallInstruction] = useState(false);'
);

const oldHandleInstall = /const handleInstallClick = async \(\) => \{[\s\S]*?else \{\n\s*alert\("To install the app, look for the 'Add to Home Screen' option in your browser menu\."\);\n\s*\}\n\s*\};/;

const newHandleInstall = `const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallInstruction(true);
      setTimeout(() => setShowInstallInstruction(false), 5000);
    }
  };`;

code = code.replace(oldHandleInstall, newHandleInstall);

// Render the instruction below the button
const oldInstallRender = /<button onClick=\{handleInstallClick\} className="text-\[10px\] sm:text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1\.5 sm:px-4 sm:py-2 rounded-md transition-colors">\n\s*\{t\('installAppText'\)\}\n\s*<\/button>/;

const newInstallRender = `<button onClick={handleInstallClick} className="text-[10px] sm:text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md transition-colors">
                      {t('installAppText')}
                    </button>
                    {showInstallInstruction && (
                      <div className="absolute mt-2 right-0 md:right-auto bg-slate-800 text-white text-[10px] sm:text-xs p-2 rounded shadow-lg z-50 w-48 text-center animate-fade-in border border-slate-700">
                        To install the app, look for the 'Add to Home Screen' or 'Install' option in your browser's share or main menu.
                      </div>
                    )}`;

code = code.replace(oldInstallRender, newInstallRender);

fs.writeFileSync('src/components/SettingsPanel.tsx', code);
