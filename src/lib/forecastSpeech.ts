export function selectForecastVoice(voices: SpeechSynthesisVoice[], language: string): SpeechSynthesisVoice | undefined {
  const normalizedLang = language.toLowerCase().split('-')[0];
  const femaleVoicePriority: Record<string, string[]> = {
    en: ['zira', 'jenny', 'aria', 'ava', 'emma', 'samantha', 'victoria', 'hazel', 'susan', 'female'],
    es: ['elvira', 'dalia', 'helena', 'laura', 'paulina', 'sabina', 'female'],
    fr: ['denise', 'hortense', 'amelie', 'julie', 'female'],
    de: ['katja', 'hedda', 'vicki', 'female'],
    it: ['elsa', 'isabella', 'female'],
    pt: ['francisca', 'luciana', 'maria', 'female'],
    ja: ['haruka', 'ayumi', 'sayaka', 'nanami', 'female'],
    zh: ['xiaoxiao', 'xiaoyi', 'huihui', 'yaoyao', 'female'],
    ko: ['heami', 'sunhi', 'yuna', 'female'],
    ru: ['svetlana', 'irina', 'female'],
    ar: ['salma', 'hoda', 'female'],
    hi: ['swara', 'kalpana', 'heera', 'female']
  };
  const matching = voices.filter(voice => voice.lang.replace('_', '-').toLowerCase().split('-')[0] === normalizedLang);
  const names = femaleVoicePriority[normalizedLang] || femaleVoicePriority.en;
  // Installed female voices start without a network round trip. Keep remote
  // and unnamed language-matching voices as fallbacks rather than losing a language.
  for (const pool of [matching.filter(voice => voice.localService), matching]) {
    for (const name of names) {
      const voice = pool.find(voice => voice.name.toLowerCase().includes(name));
      if (voice) return voice;
    }
  }
  return matching.find(voice => voice.localService) || matching[0];
}

export function warmForecastVoices() {
  if (typeof window !== 'undefined') window.speechSynthesis?.getVoices();
}
