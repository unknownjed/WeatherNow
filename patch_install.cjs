const fs = require('fs');

let appCode = fs.readFileSync('src/App.tsx', 'utf8');

// Add state to App.tsx
const stateInjection = `  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const appInstalledHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);
`;

appCode = appCode.replace('const [isInitializing, setIsInitializing] = useState(true);', 'const [isInitializing, setIsInitializing] = useState(true);\n' + stateInjection);

// Pass props to SettingsPanel
appCode = appCode.replace('<SettingsPanel \n            settings={settings}', '<SettingsPanel \n            deferredPrompt={deferredPrompt}\n            setDeferredPrompt={setDeferredPrompt}\n            isInstalled={isInstalled}\n            setIsInstalled={setIsInstalled}\n            settings={settings}');

fs.writeFileSync('src/App.tsx', appCode);

let settingsCode = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

settingsCode = settingsCode.replace('interface SettingsPanelProps {', 'interface SettingsPanelProps {\n  deferredPrompt: any;\n  setDeferredPrompt: (prompt: any) => void;\n  isInstalled: boolean;\n  setIsInstalled: (val: boolean) => void;');
settingsCode = settingsCode.replace('export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, setSettings, user, onLogin, onLogout, currentLocation }) => {', 'export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, setSettings, user, onLogin, onLogout, currentLocation, deferredPrompt, setDeferredPrompt, isInstalled, setIsInstalled }) => {');

// Remove the old states and useEffect from SettingsPanel
const oldStateAndEffect = /  const \[deferredPrompt, setDeferredPrompt\] = useState<any>\(null\);\n  const \[isInstalled, setIsInstalled\] = useState\(false\);\n\n  React\.useEffect\(\(\) => {[\s\S]*?\}, \[\]\);\n/;
settingsCode = settingsCode.replace(oldStateAndEffect, '');

fs.writeFileSync('src/components/SettingsPanel.tsx', settingsCode);
