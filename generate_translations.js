import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const baseEn = JSON.parse(fs.readFileSync('base_en.json', 'utf8'));

const langs = {
  en: "English",
  es: "Spanish",
  ja: "Japanese",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ru: "Russian",
  zh: "Simplified Chinese",
  ko: "Korean",
  hi: "Hindi",
  ar: "Arabic"
};

async function run() {
  const translations = { en: baseEn };
  
  const entries = Object.entries(langs);
  for (let i = 0; i < entries.length; i++) {
    const [code, langName] = entries[i];
    if (code === 'en') continue;
    console.log(`Translating to ${langName}...`);
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-pro',
        contents: `Translate the following JSON object to ${langName}. Keep the exact same keys. Return ONLY valid JSON, no markdown formatting. \n\n${JSON.stringify(baseEn)}`
      });
      
      let text = response.text;
      if (text.startsWith('\`\`\`')) {
        text = text.replace(/^\`\`\`(json)?\n/, '').replace(/\n\`\`\`$/, '');
      }
      
      translations[code] = JSON.parse(text);
    } catch(e) {
      console.error("Error for", langName, e.message);
    }
  }
  
  let i18nCode = `export const translations = ${JSON.stringify(translations, null, 2)};\n\n`;
  i18nCode += `export type LanguageCode = keyof typeof translations;\n\n`;
  i18nCode += `export function useTranslation(lang: string = 'en') {\n`;
  i18nCode += `  return function t(key: keyof typeof translations['en']) {\n`;
  i18nCode += `    return (translations as any)[lang]?.[key] || translations['en'][key];\n`;
  i18nCode += `  };\n`;
  i18nCode += `}\n`;
  
  fs.writeFileSync('src/lib/i18n.ts', i18nCode);
  console.log("Wrote i18n.ts");
}

run();
