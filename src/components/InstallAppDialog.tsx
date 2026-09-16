import React, { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { requestAppInstall, type AppInstallPrompt } from '../lib/appInstall';
import { useTranslation } from '../lib/i18n';

export function InstallAppDialog({ installed, prompt, language, onPromptUsed, onDismiss }: {
  installed: boolean; prompt: AppInstallPrompt | null; language: string;
  onPromptUsed: () => void; onDismiss: () => void;
}) {
  const t = useTranslation(language);
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const [status, setStatus] = useState<'ready' | 'pending' | 'accepted' | 'dismissed' | 'error'>('ready');
  useEffect(() => {
    mounted.current = true;
    const element = dialog.current!;
    element.showModal();
    return () => { mounted.current = false; element.close(); };
  }, []);
  const install = async () => {
    if (!prompt || busy.current || installed) return;
    busy.current = true;
    setStatus('pending');
    onPromptUsed();
    try {
      const outcome = await requestAppInstall(prompt);
      if (mounted.current) setStatus(outcome);
    } catch { if (mounted.current) setStatus('error'); }
    finally { busy.current = false; }
  };
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const message = installed ? t('alreadyInstalled')
    : status === 'pending' ? 'Confirm or cancel in your browser’s install prompt.'
    : status === 'accepted' ? 'Installation requested. Your browser will finish installing WeatherNow.'
    : status === 'dismissed' ? 'Installation cancelled. You can keep using this dashboard.'
    : status === 'error' ? 'The browser could not open installation. Try its Install App or Add to Home Screen menu.'
    : prompt ? 'Install WeatherNow on this device?'
    : !window.isSecureContext ? 'Installation requires HTTPS. Open your secure WeatherNow address to install.'
    : ios ? 'Use your browser’s Share menu, then Add to Home Screen. You can keep using this dashboard without installing.'
    : 'Your browser has not offered installation. Use its Install App or Add to Home Screen menu if available, or continue in this dashboard.';
  return <dialog ref={dialog} aria-labelledby="install-dialog-title" onCancel={event => { event.preventDefault(); onDismiss(); }}
    onClick={event => { if (event.target === event.currentTarget) onDismiss(); }}
    className="fixed left-1/2 top-1/2 m-0 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-300 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-black/50 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
    <div className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="install-dialog-title" className="flex items-center gap-2 text-lg font-bold"><Download size={20} />{installed ? t('appInstalled') : t('installApp')}</h2>
        <button type="button" aria-label="Close install message" onClick={onDismiss} className="rounded p-2"><X size={18} /></button>
      </div>
      <p role="status" className="text-sm leading-relaxed">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onDismiss} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 !shadow-none hover:!shadow-none focus:!shadow-none active:!shadow-none hover:bg-sky-100 hover:border-sky-400 hover:text-sky-950 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700" style={{ boxShadow: 'none' }}>{prompt && !installed && status === 'ready' ? 'Not now' : 'Close'}</button>
        {!installed && prompt && status === 'ready' && <button type="button" onClick={() => void install()} className="install-app-button rounded-lg border !border-blue-700 !bg-blue-600 px-4 py-2 text-sm font-bold !text-white shadow-sm transition-all hover:!bg-blue-500 hover:!shadow-[inset_0_0_0_2px_rgba(37,99,235,1),inset_0_0_10px_rgba(59,130,246,0.98),inset_0_0_18px_rgba(96,165,250,0.78)] active:!bg-blue-500 active:!shadow-[inset_0_0_0_2px_rgba(37,99,235,1),inset_0_0_10px_rgba(59,130,246,0.98),inset_0_0_18px_rgba(96,165,250,0.78)] focus-visible:!shadow-[inset_0_0_0_2px_rgba(37,99,235,1),inset_0_0_10px_rgba(59,130,246,0.98),inset_0_0_18px_rgba(96,165,250,0.78)] dark:border-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 dark:active:bg-blue-500">{t('installApp')}</button>}
      </div>
    </div>
  </dialog>;
}
