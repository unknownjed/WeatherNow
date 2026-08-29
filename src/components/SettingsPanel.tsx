import React from 'react';
import { AppSettings, Location, defaultSettings } from '../lib/api';
import { CalendarUser } from '../lib/auth';
import { useTranslation, LanguageCode } from '../lib/i18n';
import { Download, X, Info, ChevronDown } from 'lucide-react';
import { AppLogo } from './AppLogo';

const DASHBOARD_VERSION = '1.0.0';
const ABOUT_LABELS: Record<string, { about: string; by: string; version: string }> = {
  en: { about: 'About', by: 'By', version: 'Version' }, es: { about: 'Acerca de', by: 'Por', version: 'Versión' },
  fr: { about: 'À propos', by: 'Par', version: 'Version' }, de: { about: 'Über', by: 'Von', version: 'Version' },
  it: { about: 'Informazioni', by: 'Di', version: 'Versione' }, pt: { about: 'Sobre', by: 'Por', version: 'Versão' },
  ja: { about: '概要', by: '作成者', version: 'バージョン' }, ko: { about: '정보', by: '제작자', version: '버전' },
  zh: { about: '关于', by: '作者', version: '版本' }, hi: { about: 'परिचय', by: 'द्वारा', version: 'संस्करण' },
  ru: { about: 'О приложении', by: 'Автор', version: 'Версия' }, ar: { about: 'حول', by: 'بواسطة', version: 'الإصدار' },
};


interface SettingsPanelProps {
  deferredPrompt: any;
  setDeferredPrompt: (prompt: any) => void;
  isInstalled: boolean;
  setIsInstalled: (val: boolean) => void;
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  user: CalendarUser | null;
  onLogin: () => void;
  onLogout: () => void;
  currentLocation: Location;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, setSettings, user, onLogin, onLogout, currentLocation, deferredPrompt, setDeferredPrompt, isInstalled, setIsInstalled }) => {

  const t = useTranslation(settings.language);
  const [isAboutOpen, setIsAboutOpen] = React.useState(false);
  const aboutLabels = ABOUT_LABELS[settings.language] || ABOUT_LABELS.en;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setDeferredPrompt(null);
          setIsInstalled(true);
        }
      } catch (e) {
        console.error("Install prompt error:", e);
      }
    } else {
      if (window.self !== window.top) {
        window.open(window.location.origin, '_blank');
      }
    }
  };

  const handleSaveCurrentLocation = () => {
    const isSaved = settings.savedLocations.some(l => l.id === currentLocation.id);
    if (!isSaved) {
      setSettings({ ...settings, savedLocations: [...settings.savedLocations, currentLocation] });
    }
  };

  const handleRemoveSavedLocation = (id: number) => {
    setSettings({ ...settings, savedLocations: settings.savedLocations.filter(l => l.id !== id) });
  };

  return (
    <section className="settings-panel flex-1 p-6 sm:p-8 bg-sky-100 dark:bg-slate-950 overflow-y-auto">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div>
          <h2 className="text-2xl font-bold text-sky-950 dark:text-slate-200 mb-2">{t('settings')}</h2>
          <p className="text-sm text-sky-800 dark:text-slate-400">{t('settingsDesc')}</p>
        </div>

        {/* 1. Units & Formats */}
        <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner">
          <div className="p-4 sm:p-6 border-b border-sky-200 dark:border-slate-800">
            <h3 className="text-xs sm:text-sm font-bold text-sky-900 dark:text-slate-300 uppercase tracking-widest mb-4">{t('unitsAndFormats')}</h3>
            
            <div className="flex flex-col gap-6">
              {/* Temperature */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('temperature')}</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">{t('tempDesc')}</div>
                </div>
                <div className="flex bg-sky-100 dark:bg-slate-950 p-1 rounded-lg border border-sky-200 dark:border-slate-800">
                  <button 
                    onClick={() => setSettings({ ...settings, tempUnit: 'celsius' })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.tempUnit === 'celsius' ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >
                    {t('celsius')}
                  </button>
                  <button 
                    onClick={() => setSettings({ ...settings, tempUnit: 'fahrenheit' })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.tempUnit === 'fahrenheit' ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >
                    {t('fahrenheit')}
                  </button>
                </div>
              </div>

              {/* Wind Speed */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('windSpeed')}</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">{t('windDesc')}</div>
                </div>
                <div className="flex bg-sky-100 dark:bg-slate-950 p-1 rounded-lg border border-sky-200 dark:border-slate-800">
                  <button 
                    onClick={() => setSettings({ ...settings, windUnit: 'kmh' })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.windUnit === 'kmh' ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('kmh')}</button>
                  <button 
                    onClick={() => setSettings({ ...settings, windUnit: 'mph' })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.windUnit === 'mph' ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('mph')}</button>
                </div>
              </div>

              {/* Precipitation */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('precipitation')}</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">{t('precipDesc')}</div>
                </div>
                <div className="flex bg-sky-100 dark:bg-slate-950 p-1 rounded-lg border border-sky-200 dark:border-slate-800">
                  <button 
                    onClick={() => setSettings({ ...settings, precipUnit: 'mm' })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.precipUnit === 'mm' ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('mm')}</button>
                  <button 
                    onClick={() => setSettings({ ...settings, precipUnit: 'inch' })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.precipUnit === 'inch' ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('inches')}</button>
                </div>
              </div>

              {/* Time Format */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('timeFormat')}</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">{t('timeDesc')}</div>
                </div>
                <div className="flex bg-sky-100 dark:bg-slate-950 p-1 rounded-lg border border-sky-200 dark:border-slate-800">
                  <button 
                    onClick={() => setSettings({ ...settings, timeFormat: '12h' })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.timeFormat === '12h' ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('twelveHour')}</button>
                  <button 
                    onClick={() => setSettings({ ...settings, timeFormat: '24h' })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.timeFormat === '24h' ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('twentyFourHour')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Location & Privacy */}
        <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner">
          <div className="p-4 sm:p-6 border-b border-sky-200 dark:border-slate-800">
            <h3 className="text-xs sm:text-sm font-bold text-sky-900 dark:text-slate-300 uppercase tracking-widest mb-4">{t('locationPrivacy')}</h3>
            
            <div className="flex flex-col gap-6">
              {/* Startup Location */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('startupLocation')}</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">{t('startupDesc')}</div>
                </div>
                <div className="flex bg-sky-100 dark:bg-slate-950 p-1 rounded-lg border border-sky-200 dark:border-slate-800">
                  <button 
                    onClick={() => setSettings({ ...settings, startupLocation: 'device' })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.startupLocation === 'device' ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >
                    {t('deviceLocation')}
                  </button>
                  <button 
                    onClick={() => setSettings({ ...settings, startupLocation: 'saved' })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.startupLocation === 'saved' ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >
                    {t('savedLocations')}
                  </button>
                </div>
              </div>

              {/* Saved Locations */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('savedLocations')}</div>
                  <button onClick={handleSaveCurrentLocation} className="text-[10px] sm:text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-md transition-colors font-bold shadow-sm">{t('saveCurrentLocation')}</button>
                </div>
                {settings.savedLocations && settings.savedLocations.length > 0 ? (
                  <div className="settings-saved-locations bg-sky-100 dark:bg-slate-950 border border-sky-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    {settings.savedLocations.map((loc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border-b border-sky-200 dark:border-slate-800 last:border-0">
                        <div className="text-xs sm:text-sm text-sky-900 dark:text-slate-300">{loc.name}, {loc.country}</div>
                        <button onClick={() => handleRemoveSavedLocation(loc.id)} className="text-[10px] sm:text-xs text-red-400 hover:text-red-300">{t('remove')}</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400 italic">{t('noSavedLocations')}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Notifications & Alerts */}
        <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner">
          <div className="p-4 sm:p-6 border-b border-sky-200 dark:border-slate-800">
            <h3 className="text-xs sm:text-sm font-bold text-sky-900 dark:text-slate-300 uppercase tracking-widest mb-4">{t('notificationsAlerts')}</h3>
            
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('autoSpeak')}</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">{t('autoSpeakDesc')}</div>
                </div>
                <div className="flex bg-sky-100 dark:bg-slate-950 p-1 rounded-lg border border-sky-200 dark:border-slate-800">
                  <button 
                    onClick={() => setSettings({ ...settings, autoSpeak: true })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.autoSpeak === true ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('enabled')}</button>
                  <button 
                    onClick={() => setSettings({ ...settings, autoSpeak: false })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.autoSpeak === false ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('disabled')}</button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('severeAlerts')}</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">{t('severeAlertsDesc')}</div>
                </div>
                <div className="flex bg-sky-100 dark:bg-slate-950 p-1 rounded-lg border border-sky-200 dark:border-slate-800">
                  <button 
                    onClick={() => setSettings({ ...settings, severeAlerts: true })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.severeAlerts !== false ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('enabled')}</button>
                  <button 
                    onClick={() => setSettings({ ...settings, severeAlerts: false })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.severeAlerts === false ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('disabled')}</button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('calendarNotif')}</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">{t('calendarNotifDesc')}</div>
                </div>
                <div className="flex bg-sky-100 dark:bg-slate-950 p-1 rounded-lg border border-sky-200 dark:border-slate-800">
                  <button 
                    onClick={() => setSettings({ ...settings, calendarNotifications: true })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.calendarNotifications !== false ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('enabled')}</button>
                  <button 
                    onClick={() => setSettings({ ...settings, calendarNotifications: false })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.calendarNotifications === false ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('disabled')}</button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('calendarAlerts')}</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">{t('calendarAlertsDesc')}</div>
                </div>
                <div className="flex bg-sky-100 dark:bg-slate-950 p-1 rounded-lg border border-sky-200 dark:border-slate-800">
                  <button 
                    onClick={() => setSettings({ ...settings, calendarAlerts: true })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.calendarAlerts !== false ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('enabled')}</button>
                  <button 
                    onClick={() => setSettings({ ...settings, calendarAlerts: false })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.calendarAlerts === false ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('disabled')}</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Appearance & Branding */}
        <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner">
          <div className="p-4 sm:p-6 border-b border-sky-200 dark:border-slate-800">
            <h3 className="text-xs sm:text-sm font-bold text-sky-900 dark:text-slate-300 uppercase tracking-widest mb-4">{t('appearance')} & Branding</h3>
            
            <div className="flex flex-col gap-6">


              {/* Theme */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('theme')}</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">{t('themeDesc')}</div>
                </div>
                <div className="flex bg-sky-100 dark:bg-slate-950 p-1 rounded-lg border border-sky-200 dark:border-slate-800">
                  <button 
                    onClick={() => setSettings({ ...settings, theme: 'dark' })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.theme === 'dark' || !settings.theme ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('dark')}</button>
                  <button 
                    onClick={() => setSettings({ ...settings, theme: 'light' })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.theme === 'light' ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('light')}</button>
                  <button 
                    onClick={() => setSettings({ ...settings, theme: 'system' })}
                    className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${settings.theme === 'system' ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                  >{t('system')}</button>
                </div>
              </div>

              {/* Map Default */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('mapDefaultLayer')}</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">{t('mapDefaultDesc')}</div>
                </div>
                <div className="flex bg-sky-100 dark:bg-slate-950 p-1 rounded-lg border border-sky-200 dark:border-slate-800">
                  {['precipitation', 'temperature', 'wind'].map((layer) => (
                    <button 
                      key={layer}
                      onClick={() => setSettings({ ...settings, mapDefaultLayer: layer as any })}
                      className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors capitalize ${settings.mapDefaultLayer === layer || (!settings.mapDefaultLayer && layer === 'precipitation') ? 'bg-indigo-600 text-white' : 'text-sky-800 dark:text-slate-400 hover:text-sky-950 dark:text-slate-200'}`}
                    >{t(layer as any)}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        
        {/* Language */}
        <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner">
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
                    className="settings-language-select text-[10px] sm:text-xs bg-sky-200 dark:bg-slate-800 text-sky-950 dark:text-slate-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md border border-sky-300 dark:border-slate-700 outline-none"
                  >
                                        <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>
                    <option value="ar">العربية</option>
                    <option value="ko">한국어</option>
                    <option value="ru">Русский</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. App & Integrations */}
        <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner">
          <div className="p-4 sm:p-6 border-b border-sky-200 dark:border-slate-800">
            <h3 className="text-xs sm:text-sm font-bold text-sky-900 dark:text-slate-300 uppercase tracking-widest mb-4">{t('appIntegrations')}</h3>
            
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('googleCalendar')}</div>
                  <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">
                    {user ? t('connectedAs')?.replace('{email}', user.email) || `Connected as ${user.email}` : t('notConnected') || 'Not connected'}
                  </div>
                </div>
                <div>
                  {user ? (
                    <button onClick={onLogout} className="text-[10px] sm:text-xs bg-blue-600 hover:bg-blue-500 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md transition-colors border border-blue-700 dark:border-slate-700 font-bold shadow-sm">{t('signOut')}</button>
                  ) : (
                    <button onClick={onLogin} className="text-[10px] sm:text-xs bg-blue-600 hover:bg-blue-500 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md transition-colors font-bold shadow-sm">{t('connectAccount')}</button>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-sky-950 dark:text-slate-200">{t('installAppText')}</div>
                    <div className="text-[10px] sm:text-xs text-sky-800 dark:text-slate-400">
                      {isInstalled ? t('alreadyInstalled') : t('installDescription')}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {isInstalled ? (
                      <span className="text-[10px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 px-3 py-1.5 sm:px-4 sm:py-2 flex items-center">✓ {t('appInstalled')}</span>
                    ) : (
                      <button 
                        id="settings-install-app-btn"
                        onClick={handleInstallClick} 
                        className="text-[10px] sm:text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md transition-colors flex items-center gap-1.5 font-bold shadow-sm"
                      >
                        <Download size={13} />
                        {t('installApp')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner">
          <button
            type="button"
            onClick={() => setIsAboutOpen((open) => !open)}
            aria-expanded={isAboutOpen}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-sky-950 dark:text-slate-200 hover:bg-sky-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-widest">
              <Info size={16} />
              {aboutLabels.about}
            </span>
            <ChevronDown size={17} className={`transition-transform ${isAboutOpen ? 'rotate-180' : ''}`} />
          </button>
          {isAboutOpen && (
            <div className="px-5 py-6 border-t border-sky-200 dark:border-slate-800 text-center flex flex-col gap-1.5">
              <div className="flex items-center justify-center gap-2.5 text-xl font-bold text-sky-950 dark:text-white">
                <AppLogo size={36} className="rounded-lg" />
                <span>WeatherNow</span>
              </div>
              <div className="text-sm text-sky-900 dark:text-slate-300">By: Ruben Pangan</div>
              <div className="text-xs text-sky-800 dark:text-slate-400">© 2026</div>
              <div className="text-xs font-mono text-sky-800 dark:text-slate-400">{aboutLabels.version} {DASHBOARD_VERSION}</div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};
