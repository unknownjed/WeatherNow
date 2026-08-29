const fs = require('fs');
let code = fs.readFileSync('src/components/NewsFeed.tsx', 'utf8');

const tImport = `import { useTranslation } from '../lib/i18n';\n`;
if (!code.includes(tImport)) {
  code = code.replace("import { RefreshCw, ExternalLink } from 'lucide-react';", "import { RefreshCw, ExternalLink } from 'lucide-react';\n" + tImport);
}

const propPattern = /export function NewsFeed\(\{ locationName, country \}: \{ locationName\?: string, country\?: string \}\) \{/;
if (!code.includes("language?: string")) {
  code = code.replace(propPattern, "export function NewsFeed({ locationName, country, language = 'en' }: { locationName?: string, country?: string, language?: string }) {");
}

const hook = `  const t = useTranslation(language);\n`;
if (!code.includes("useTranslation(language)")) {
  code = code.replace("  const [news, setNews] = useState<NewsItem[]>([]);", hook + "\n  const [news, setNews] = useState<NewsItem[]>([]);");
}

code = code.replace(/Trending News:/g, `\${t('trendingNews')}:`);
code = code.replace(/Local News:/g, `\${t('localNews')}:`);
code = code.replace(/'Top Stories'/g, `t('topStories')`);
code = code.replace(/>Live Updates</g, `>{t('liveUpdates')}<`);

fs.writeFileSync('src/components/NewsFeed.tsx', code);
