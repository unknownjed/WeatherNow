import React from 'react';
import { AppSettings, Location, defaultSettings } from '../lib/api';
import { CalendarUser } from '../lib/auth';
import { useTranslation, LanguageCode } from '../lib/i18n';
import { getUiLabels } from '../lib/uiLabels';
import { Download, X, Info, ChevronDown, HelpCircle } from 'lucide-react';
import { AppLogo } from './AppLogo';

const DASHBOARD_VERSION = '1.0.0';

const LEGAL_LABELS: Record<string, { legal: string; privacy: string; terms: string }> = {
  en: { legal: 'Legal', privacy: 'Privacy Policy', terms: 'Terms of Service' },
  es: { legal: 'Legal', privacy: 'Política de privacidad', terms: 'Términos del servicio' },
  fr: { legal: 'Mentions légales', privacy: 'Politique de confidentialité', terms: "Conditions d’utilisation" },
  de: { legal: 'Rechtliches', privacy: 'Datenschutzerklärung', terms: 'Nutzungsbedingungen' },
  zh: { legal: '法律信息', privacy: '隐私政策', terms: '服务条款' },
  ja: { legal: '法的情報', privacy: 'プライバシーポリシー', terms: '利用規約' },
  ar: { legal: 'قانوني', privacy: 'سياسة الخصوصية', terms: 'شروط الخدمة' },
  ko: { legal: '법적 고지', privacy: '개인정보 처리방침', terms: '서비스 약관' },
  ru: { legal: 'Правовая информация', privacy: 'Политика конфиденциальности', terms: 'Условия использования' },
};

const ABOUT_LABELS: Record<string, { about: string; by: string; version: string }> = {
  en: { about: 'About', by: 'By', version: 'Version' }, es: { about: 'Acerca de', by: 'Por', version: 'Versión' },
  fr: { about: 'À propos', by: 'Par', version: 'Version' }, de: { about: 'Über', by: 'Von', version: 'Version' },
  it: { about: 'Informazioni', by: 'Di', version: 'Versione' }, pt: { about: 'Sobre', by: 'Por', version: 'Versão' },
  ja: { about: '概要', by: '作成者', version: 'バージョン' }, ko: { about: '정보', by: '제작자', version: '버전' },
  zh: { about: '关于', by: '作者', version: '版本' }, hi: { about: 'परिचय', by: 'द्वारा', version: 'संस्करण' },
  ru: { about: 'О приложении', by: 'Автор', version: 'Версия' }, ar: { about: 'حول', by: 'بواسطة', version: 'الإصدار' },
};

const ABOUT_DETAILS: Record<string, {
  freeUse: string;
  sourcesTitle: string;
  sources: string[];
  privacyTitle: string;
  privacy: string;
  disclaimerTitle: string;
  disclaimer: string;
}> = {
  en: {
    freeUse: 'WeatherNow is free for public use.',
    sourcesTitle: 'Data sources & services',
    sources: [
      'Forecasts: Open-Meteo',
      'Radar: RainViewer',
      'Philippine weather information: PAGASA',
      'Satellite imagery: JMA, NASA Earthdata/GIBS, EUMETSAT',
      'Video search & playback: YouTube',
      'Calendar integration: Google Calendar',
    ],
    privacyTitle: 'Privacy',
    privacy: 'Google Calendar data is accessed only after you authorize it and is used only for calendar features in WeatherNow. You can disconnect your Google account at any time.',
    disclaimerTitle: 'Weather disclaimer',
    disclaimer: 'Weather information may be delayed, unavailable, or inaccurate. Do not rely on WeatherNow as the sole source for emergency or safety-critical decisions.',
  },
  es: {
    freeUse: 'WeatherNow es gratuito para uso público.',
    sourcesTitle: 'Fuentes de datos y servicios',
    sources: ['Pronósticos: Open-Meteo','Radar: RainViewer','Información meteorológica de Filipinas: PAGASA','Imágenes satelitales: JMA, NASA Earthdata/GIBS, EUMETSAT','Búsqueda y reproducción de video: YouTube','Integración de calendario: Google Calendar'],
    privacyTitle: 'Privacidad',
    privacy: 'Los datos de Google Calendar solo se consultan después de tu autorización y se usan únicamente para las funciones de calendario de WeatherNow. Puedes desconectar tu cuenta en cualquier momento.',
    disclaimerTitle: 'Aviso meteorológico',
    disclaimer: 'La información meteorológica puede estar retrasada, no disponible o ser inexacta. No uses WeatherNow como única fuente para decisiones de emergencia o seguridad.',
  },
  fr: {
    freeUse: 'WeatherNow est gratuit pour un usage public.',
    sourcesTitle: 'Sources de données et services',
    sources: ['Prévisions : Open-Meteo','Radar : RainViewer','Informations météo Philippines : PAGASA','Imagerie satellite : JMA, NASA Earthdata/GIBS, EUMETSAT','Recherche et lecture vidéo : YouTube','Intégration calendrier : Google Calendar'],
    privacyTitle: 'Confidentialité',
    privacy: 'Les données Google Calendar ne sont consultées qu’après votre autorisation et uniquement pour les fonctions calendrier de WeatherNow. Vous pouvez déconnecter votre compte à tout moment.',
    disclaimerTitle: 'Avertissement météo',
    disclaimer: 'Les informations météo peuvent être retardées, indisponibles ou inexactes. N’utilisez pas WeatherNow comme seule source pour les décisions d’urgence ou de sécurité.',
  },
  de: {
    freeUse: 'WeatherNow ist für die öffentliche Nutzung kostenlos.',
    sourcesTitle: 'Datenquellen & Dienste',
    sources: ['Vorhersagen: Open-Meteo','Radar: RainViewer','Philippinische Wetterinformationen: PAGASA','Satellitenbilder: JMA, NASA Earthdata/GIBS, EUMETSAT','Videosuche & Wiedergabe: YouTube','Kalenderintegration: Google Calendar'],
    privacyTitle: 'Datenschutz',
    privacy: 'Google-Kalenderdaten werden erst nach Ihrer Autorisierung abgerufen und nur für Kalenderfunktionen in WeatherNow verwendet. Sie können Ihr Google-Konto jederzeit trennen.',
    disclaimerTitle: 'Wetterhinweis',
    disclaimer: 'Wetterinformationen können verzögert, nicht verfügbar oder ungenau sein. Verwenden Sie WeatherNow nicht als einzige Quelle für Notfall- oder Sicherheitsentscheidungen.',
  },
  it: {
    freeUse: 'WeatherNow è gratuito per uso pubblico.',
    sourcesTitle: 'Fonti dati e servizi',
    sources: ['Previsioni: Open-Meteo','Radar: RainViewer','Informazioni meteo Filippine: PAGASA','Immagini satellitari: JMA, NASA Earthdata/GIBS, EUMETSAT','Ricerca e riproduzione video: YouTube','Integrazione calendario: Google Calendar'],
    privacyTitle: 'Privacy',
    privacy: 'I dati di Google Calendar vengono consultati solo dopo la tua autorizzazione e usati esclusivamente per le funzioni calendario di WeatherNow. Puoi disconnettere il tuo account in qualsiasi momento.',
    disclaimerTitle: 'Avvertenza meteo',
    disclaimer: 'Le informazioni meteorologiche possono essere in ritardo, non disponibili o imprecise. Non usare WeatherNow come unica fonte per decisioni di emergenza o sicurezza.',
  },
  pt: {
    freeUse: 'WeatherNow é gratuito para uso público.',
    sourcesTitle: 'Fontes de dados e serviços',
    sources: ['Previsões: Open-Meteo','Radar: RainViewer','Informações meteorológicas das Filipinas: PAGASA','Imagens de satélite: JMA, NASA Earthdata/GIBS, EUMETSAT','Pesquisa e reprodução de vídeo: YouTube','Integração de calendário: Google Calendar'],
    privacyTitle: 'Privacidade',
    privacy: 'Os dados do Google Calendar só são acessados após sua autorização e usados apenas nos recursos de calendário do WeatherNow. Você pode desconectar sua conta a qualquer momento.',
    disclaimerTitle: 'Aviso meteorológico',
    disclaimer: 'As informações meteorológicas podem estar atrasadas, indisponíveis ou imprecisas. Não use o WeatherNow como única fonte para decisões de emergência ou segurança.',
  },
  ja: {
    freeUse: 'WeatherNow は一般公開で無料で利用できます。',
    sourcesTitle: 'データ提供元・サービス',
    sources: ['予報: Open-Meteo','レーダー: RainViewer','フィリピンの気象情報: PAGASA','衛星画像: JMA, NASA Earthdata/GIBS, EUMETSAT','動画検索・再生: YouTube','カレンダー連携: Google Calendar'],
    privacyTitle: 'プライバシー',
    privacy: 'Google Calendar のデータは、許可後にのみ取得され、WeatherNow のカレンダー機能のためだけに使用されます。いつでも Google アカウントとの連携を解除できます。',
    disclaimerTitle: '気象情報に関する注意',
    disclaimer: '気象情報は遅延、未提供、または不正確な場合があります。緊急時や安全上重要な判断の唯一の情報源として WeatherNow を使用しないでください。',
  },
  ko: {
    freeUse: 'WeatherNow는 공개 사용에 무료입니다.',
    sourcesTitle: '데이터 출처 및 서비스',
    sources: ['예보: Open-Meteo','레이더: RainViewer','필리핀 기상 정보: PAGASA','위성 영상: JMA, NASA Earthdata/GIBS, EUMETSAT','동영상 검색 및 재생: YouTube','캘린더 연동: Google Calendar'],
    privacyTitle: '개인정보',
    privacy: 'Google Calendar 데이터는 사용자가 승인한 후에만 접근하며 WeatherNow의 캘린더 기능에만 사용됩니다. 언제든지 Google 계정 연결을 해제할 수 있습니다.',
    disclaimerTitle: '기상 정보 안내',
    disclaimer: '기상 정보는 지연되거나 제공되지 않거나 부정확할 수 있습니다. 긴급 상황이나 안전 관련 판단의 유일한 정보원으로 WeatherNow를 사용하지 마세요.',
  },
  zh: {
    freeUse: 'WeatherNow 可免费供公众使用。',
    sourcesTitle: '数据来源与服务',
    sources: ['天气预报: Open-Meteo','雷达: RainViewer','菲律宾天气信息: PAGASA','卫星图像: JMA, NASA Earthdata/GIBS, EUMETSAT','视频搜索与播放: YouTube','日历集成: Google Calendar'],
    privacyTitle: '隐私',
    privacy: '只有在您授权后才会访问 Google Calendar 数据，并且仅用于 WeatherNow 的日历功能。您可以随时断开 Google 账号连接。',
    disclaimerTitle: '天气免责声明',
    disclaimer: '天气信息可能延迟、不可用或不准确。不要将 WeatherNow 作为紧急或安全关键决策的唯一信息来源。',
  },
  hi: {
    freeUse: 'WeatherNow सार्वजनिक उपयोग के लिए निःशुल्क है।',
    sourcesTitle: 'डेटा स्रोत और सेवाएँ',
    sources: ['पूर्वानुमान: Open-Meteo','रडार: RainViewer','फिलीपींस मौसम जानकारी: PAGASA','उपग्रह चित्र: JMA, NASA Earthdata/GIBS, EUMETSAT','वीडियो खोज और प्लेबैक: YouTube','कैलेंडर एकीकरण: Google Calendar'],
    privacyTitle: 'गोपनीयता',
    privacy: 'Google Calendar डेटा केवल आपकी अनुमति के बाद एक्सेस किया जाता है और केवल WeatherNow की कैलेंडर सुविधाओं के लिए उपयोग किया जाता है। आप कभी भी अपना Google खाता डिस्कनेक्ट कर सकते हैं।',
    disclaimerTitle: 'मौसम अस्वीकरण',
    disclaimer: 'मौसम जानकारी विलंबित, अनुपलब्ध या गलत हो सकती है। आपातकालीन या सुरक्षा संबंधी निर्णयों के लिए WeatherNow को एकमात्र स्रोत न मानें।',
  },
  ru: {
    freeUse: 'WeatherNow бесплатен для публичного использования.',
    sourcesTitle: 'Источники данных и сервисы',
    sources: ['Прогнозы: Open-Meteo','Радар: RainViewer','Погодная информация по Филиппинам: PAGASA','Спутниковые изображения: JMA, NASA Earthdata/GIBS, EUMETSAT','Поиск и воспроизведение видео: YouTube','Интеграция календаря: Google Calendar'],
    privacyTitle: 'Конфиденциальность',
    privacy: 'Данные Google Calendar доступны только после вашего разрешения и используются только для функций календаря WeatherNow. Вы можете отключить аккаунт Google в любое время.',
    disclaimerTitle: 'Предупреждение о погоде',
    disclaimer: 'Погодные данные могут быть задержаны, недоступны или неточны. Не используйте WeatherNow как единственный источник для экстренных или критичных для безопасности решений.',
  },
  ar: {
    freeUse: 'WeatherNow مجاني للاستخدام العام.',
    sourcesTitle: 'مصادر البيانات والخدمات',
    sources: ['التوقعات: Open-Meteo','الرادار: RainViewer','معلومات الطقس في الفلبين: PAGASA','صور الأقمار الصناعية: JMA, NASA Earthdata/GIBS, EUMETSAT','البحث عن الفيديو وتشغيله: YouTube','تكامل التقويم: Google Calendar'],
    privacyTitle: 'الخصوصية',
    privacy: 'لا يتم الوصول إلى بيانات Google Calendar إلا بعد موافقتك وتُستخدم فقط لميزات التقويم في WeatherNow. يمكنك فصل حساب Google في أي وقت.',
    disclaimerTitle: 'إخلاء مسؤولية الطقس',
    disclaimer: 'قد تتأخر معلومات الطقس أو تكون غير متاحة أو غير دقيقة. لا تعتمد على WeatherNow كمصدر وحيد للقرارات الطارئة أو المتعلقة بالسلامة.',
  },
};


const HELP_LABELS: Record<string, { heading: string; sections: [string, string][] }> = {
  en: { heading: 'Help & dashboard guide', sections: [
    ['Dashboard', 'Search a city in the header. Select Route Map or Weather Track. Click the forecaster icon to hear current conditions, forecasts, air quality and marine guidance. Scroll the hourly forecast horizontally.'],
    ['Route Map', 'Search or select a mapped place, choose Directions, select a travel mode, then Start. The route and steps stay visible until the destination changes or navigation starts. Use the speaker control to mute guidance without removing the route.'],
    ['Weather Track', 'Rain radar is enabled from the cyclone bulletin options. RainViewer covers the world; PAGASA rainfall is overlaid only for Philippine locations when its official frame is available. Select a cyclone to focus it and enable tracks or uncertainty circles as needed.'],
    ['News', 'Stories follow the selected dashboard location. Tap a card to open its publisher page. News remains cached while switching tabs and reloads after the location changes.'],
    ['Calendar & Journal', 'Connect Google Calendar to view events and holidays. Tap a date to view that journal date. Swipe the calendar left or right to change months. Add photos, edit, delete or expand a saved journal record.'],
    ['Music Player', 'Open Music from navigation. Search YouTube or choose Search MP3 Audio for one or more audio files. Starting one player pauses the other. Hiding the panel does not stop playback; use its pause or close control.'],
    ['Settings', 'Choose units, startup location, alerts, theme and language. Connect Google services or use Install App when the browser makes installation available.'],
  ]},
  es: { heading: 'Ayuda y guía del panel', sections: [
    ['Panel', 'Busca una ciudad en el encabezado. Selecciona Mapa de ruta o Seguimiento meteorológico. Pulsa el icono del pronosticador para escuchar las condiciones actuales, pronósticos, calidad del aire y orientación marina. Desplaza horizontalmente el pronóstico por horas.'],
    ['Mapa de ruta', 'Busca o selecciona un lugar del mapa, elige Indicaciones, selecciona un modo de viaje y pulsa Iniciar. La ruta y los pasos permanecen visibles hasta que cambie el destino o comience la navegación.'],
    ['Seguimiento meteorológico', 'El radar de lluvia se activa desde las opciones del boletín de ciclones. RainViewer cubre todo el mundo; PAGASA se superpone en Filipinas cuando hay una imagen oficial disponible.'],
    ['Noticias', 'Las noticias siguen la ubicación seleccionada. Toca una tarjeta para abrir la página del editor. Las noticias permanecen en caché al cambiar de pestaña y se recargan al cambiar de ubicación.'],
    ['Calendario y diario', 'Conecta Google Calendar para ver eventos y festivos. Toca una fecha para ver ese día del diario. Desliza el calendario para cambiar de mes. Puedes añadir fotos, editar, eliminar o ampliar un registro.'],
    ['Reproductor de música', 'Abre Música desde la navegación. Busca en YouTube o usa Buscar audio MP3 para elegir archivos. Al iniciar un reproductor, el otro se pausa.'],
    ['Configuración', 'Elige unidades, ubicación inicial, alertas, tema, idioma. Conecta servicios de Google o usa Instalar aplicación cuando esté disponible.'],
  ]},
  fr: { heading: 'Aide et guide du tableau de bord', sections: [
    ['Tableau de bord', 'Recherchez une ville dans l’en-tête. Choisissez Carte d’itinéraire ou Suivi météo. Touchez l’icône du prévisionniste pour écouter les conditions actuelles, les prévisions, la qualité de l’air et les conseils marins.'],
    ['Carte d’itinéraire', 'Recherchez ou sélectionnez un lieu, choisissez Itinéraire, un mode de déplacement, puis Démarrer. Le trajet et les étapes restent visibles jusqu’au changement de destination ou au début de la navigation.'],
    ['Suivi météo', 'Le radar de pluie s’active dans les options du bulletin cyclonique. RainViewer couvre le monde entier ; PAGASA est superposé aux Philippines lorsqu’une image officielle est disponible.'],
    ['Actualités', 'Les articles suivent l’emplacement sélectionné. Touchez une carte pour ouvrir la page de l’éditeur. Les actualités restent en cache entre les onglets et se rechargent après un changement de lieu.'],
    ['Calendrier et journal', 'Connectez Google Calendar pour voir les événements et jours fériés. Touchez une date pour afficher le journal de ce jour. Balayez le calendrier pour changer de mois.'],
    ['Lecteur de musique', 'Ouvrez Musique depuis la navigation. Recherchez sur YouTube ou choisissez la recherche audio MP3. Démarrer un lecteur met l’autre en pause.'],
    ['Paramètres', 'Choisissez les unités, le lieu de démarrage, les alertes, le thème, la couche de carte et la langue. Connectez les services Google ou installez l’application lorsque disponible.'],
  ]},
  de: { heading: 'Hilfe & Dashboard-Anleitung', sections: [
    ['Dashboard', 'Suchen Sie oben nach einer Stadt. Wählen Sie Routenkarte oder Wetterverfolgung. Tippen Sie auf das Vorhersage-Symbol, um aktuelle Bedingungen, Prognosen, Luftqualität und Meeresinformationen zu hören.'],
    ['Routenkarte', 'Suchen oder wählen Sie einen Ort, wählen Sie Route, einen Reisemodus und dann Start. Route und Schritte bleiben sichtbar, bis sich das Ziel ändert oder die Navigation beginnt.'],
    ['Wetterverfolgung', 'Der Regenradar wird über die Zyklonoptionen aktiviert. RainViewer deckt die Welt ab; PAGASA wird auf den Philippinen eingeblendet, wenn ein offizielles Bild verfügbar ist.'],
    ['Nachrichten', 'Meldungen folgen dem ausgewählten Standort. Tippen Sie auf eine Karte, um die Herausgeberseite zu öffnen. Nachrichten bleiben beim Tabwechsel zwischengespeichert.'],
    ['Kalender & Journal', 'Verbinden Sie Google Calendar für Termine und Feiertage. Tippen Sie auf ein Datum, um den Journaltag zu sehen. Wischen Sie im Kalender, um den Monat zu wechseln.'],
    ['Musik-Player', 'Öffnen Sie Musik über die Navigation. Suchen Sie auf YouTube oder wählen Sie MP3-Audio. Beim Start eines Players pausiert der andere.'],
    ['Einstellungen', 'Wählen Sie Einheiten, Startort, Warnungen, Design, Sprache. Verbinden Sie Google-Dienste oder installieren Sie die App, wenn verfügbar.'],
  ]},
  it: { heading: 'Aiuto e guida del pannello', sections: [
    ['Pannello', 'Cerca una città nell’intestazione. Seleziona Mappa percorso o Tracciamento meteo. Tocca l’icona del previsore per ascoltare condizioni attuali, previsioni, qualità dell’aria e indicazioni marine.'],
    ['Mappa percorso', 'Cerca o seleziona un luogo, scegli Indicazioni, una modalità di viaggio e poi Avvia. Il percorso e i passaggi restano visibili finché non cambia la destinazione o inizia la navigazione.'],
    ['Tracciamento meteo', 'Il radar pioggia si abilita dalle opzioni del bollettino cicloni. RainViewer copre il mondo; PAGASA viene sovrapposto nelle Filippine quando è disponibile un’immagine ufficiale.'],
    ['Notizie', 'Le notizie seguono la posizione selezionata. Tocca una scheda per aprire la pagina dell’editore. Restano in cache passando tra le schede.'],
    ['Calendario e diario', 'Collega Google Calendar per vedere eventi e festività. Tocca una data per il diario di quel giorno. Scorri il calendario per cambiare mese.'],
    ['Lettore musicale', 'Apri Musica dalla navigazione. Cerca su YouTube o scegli audio MP3. Avviare un lettore mette in pausa l’altro.'],
    ['Impostazioni', 'Scegli unità, posizione iniziale, avvisi, tema, lingua. Collega i servizi Google o installa l’app quando disponibile.'],
  ]},
  pt: { heading: 'Ajuda e guia do painel', sections: [
    ['Painel', 'Pesquise uma cidade no cabeçalho. Selecione Mapa de rota ou Rastreamento do tempo. Toque no ícone do previsor para ouvir condições atuais, previsões, qualidade do ar e orientação marítima.'],
    ['Mapa de rota', 'Pesquise ou selecione um local, escolha Direções, um modo de viagem e depois Iniciar. A rota e as etapas permanecem visíveis até o destino mudar ou a navegação começar.'],
    ['Rastreamento do tempo', 'O radar de chuva é ativado pelas opções do boletim de ciclones. RainViewer cobre o mundo; PAGASA é sobreposto nas Filipinas quando uma imagem oficial está disponível.'],
    ['Notícias', 'As notícias seguem o local selecionado. Toque em um cartão para abrir a página da fonte. Elas ficam em cache ao trocar de abas.'],
    ['Calendário e diário', 'Conecte o Google Calendar para ver eventos e feriados. Toque em uma data para ver o diário daquele dia. Deslize o calendário para mudar de mês.'],
    ['Reprodutor de música', 'Abra Música na navegação. Pesquise no YouTube ou escolha áudio MP3. Iniciar um reprodutor pausa o outro.'],
    ['Configurações', 'Escolha unidades, local inicial, alertas, tema, camada do mapa e idioma. Conecte serviços Google ou instale o app quando disponível.'],
  ]},
  ja: { heading: 'ヘルプとダッシュボードガイド', sections: [
    ['ダッシュボード', 'ヘッダーで都市を検索します。ルートマップまたは天気追跡を選びます。予報アイコンを押すと、現在の天気、予報、大気質、海況の案内を音声で聞けます。'],
    ['ルートマップ', '地図上の場所を検索または選択し、経路、移動方法、開始の順に選びます。目的地を変更するかナビを開始するまで経路と手順が表示されます。'],
    ['天気追跡', '雨雲レーダーはサイクロン速報のオプションから有効にします。RainViewer は世界をカバーし、フィリピンでは公式画像が利用可能なとき PAGASA を重ねます。'],
    ['ニュース', 'ニュースは選択中の場所に合わせて表示されます。カードをタップすると配信元ページを開きます。タブ切替中もキャッシュされます。'],
    ['カレンダーと日記', 'Google Calendar を接続して予定と祝日を表示します。日付をタップするとその日の日記を表示します。左右にスワイプして月を変更できます。'],
    ['音楽プレーヤー', 'ナビゲーションから音楽を開きます。YouTube を検索するか MP3 音声を選びます。一方を再生するともう一方は一時停止します。'],
    ['設定', '単位、開始位置、警報、テーマ、地図レイヤー、言語を設定できます。Google サービスの接続やアプリのインストールも行えます。'],
  ]},
  ko: { heading: '도움말 및 대시보드 안내', sections: [
    ['대시보드', '상단에서 도시를 검색하세요. 경로 지도 또는 날씨 추적을 선택하세요. 예보 아이콘을 누르면 현재 상태, 예보, 대기질 및 해양 안내를 들을 수 있습니다.'],
    ['경로 지도', '지도에서 장소를 검색하거나 선택하고 길찾기, 이동 수단, 시작을 차례로 선택하세요. 목적지가 바뀌거나 안내가 시작될 때까지 경로와 단계가 유지됩니다.'],
    ['날씨 추적', '강우 레이더는 사이클론 옵션에서 켤 수 있습니다. RainViewer는 전 세계를 지원하며 필리핀에서는 공식 영상이 있을 때 PAGASA가 겹쳐 표시됩니다.'],
    ['뉴스', '뉴스는 선택한 위치를 따릅니다. 카드를 눌러 원문 페이지를 열 수 있으며 탭 전환 중에는 캐시됩니다.'],
    ['캘린더 및 일지', 'Google Calendar를 연결하여 일정과 공휴일을 확인하세요. 날짜를 누르면 해당 날짜의 일지를 볼 수 있고 좌우 스와이프로 월을 변경할 수 있습니다.'],
    ['음악 플레이어', '탐색 메뉴에서 음악을 여세요. YouTube를 검색하거나 MP3 오디오를 선택하세요. 한 플레이어를 시작하면 다른 플레이어는 일시 중지됩니다.'],
    ['설정', '단위, 시작 위치, 알림, 테마, 기본 지도 레이어와 언어를 선택하고 Google 서비스 연결이나 앱 설치를 관리할 수 있습니다.'],
  ]},
  zh: { heading: '帮助与仪表板指南', sections: [
    ['仪表板', '在顶部搜索城市。选择路线地图或天气追踪。点击预报员图标可收听当前天气、预报、空气质量和海洋提示。'],
    ['路线地图', '搜索或选择地图地点，选择路线、出行方式，然后开始。路线和步骤会保留到目的地改变或导航开始。'],
    ['天气追踪', '降雨雷达可在气旋公告选项中启用。RainViewer 覆盖全球；在菲律宾有官方图像时会叠加 PAGASA。'],
    ['新闻', '新闻会跟随当前选择的位置。点击卡片可打开发布者页面，切换标签时新闻会保留缓存。'],
    ['日历与日志', '连接 Google Calendar 查看事件和节假日。点击日期查看当天日志，左右滑动日历切换月份。'],
    ['音乐播放器', '从导航打开音乐。搜索 YouTube 或选择 MP3 音频。启动一个播放器时另一个会暂停。'],
    ['设置', '选择单位、启动位置、提醒、主题、默认地图图层和语言，并可连接 Google 服务或安装应用。'],
  ]},
  hi: { heading: 'सहायता और डैशबोर्ड गाइड', sections: [
    ['डैशबोर्ड', 'ऊपर शहर खोजें। रूट मैप या मौसम ट्रैक चुनें। वर्तमान मौसम, पूर्वानुमान, वायु गुणवत्ता और समुद्री जानकारी सुनने के लिए फोरकास्टर आइकन दबाएँ।'],
    ['रूट मैप', 'मानचित्र पर स्थान खोजें या चुनें, दिशा, यात्रा मोड और फिर शुरू चुनें। गंतव्य बदलने या नेविगेशन शुरू होने तक मार्ग और चरण दिखाई देते हैं।'],
    ['मौसम ट्रैक', 'वर्षा रडार चक्रवात विकल्पों से चालू होता है। RainViewer दुनिया भर को कवर करता है; फिलीपींस में आधिकारिक चित्र उपलब्ध होने पर PAGASA दिखता है।'],
    ['समाचार', 'समाचार चुने गए स्थान के अनुसार दिखते हैं। प्रकाशक पेज खोलने के लिए कार्ड टैप करें। टैब बदलने पर समाचार कैश में रहते हैं।'],
    ['कैलेंडर और जर्नल', 'इवेंट और छुट्टियाँ देखने के लिए Google Calendar जोड़ें। तारीख टैप करके उस दिन का जर्नल देखें और महीना बदलने के लिए स्वाइप करें।'],
    ['म्यूजिक प्लेयर', 'नेविगेशन से संगीत खोलें। YouTube खोजें या MP3 ऑडियो चुनें। एक प्लेयर शुरू करने पर दूसरा रुक जाता है।'],
    ['सेटिंग्स', 'इकाइयाँ, शुरुआती स्थान, अलर्ट, थीम, डिफ़ॉल्ट मैप लेयर और भाषा चुनें। Google सेवाएँ जोड़ें या ऐप इंस्टॉल करें।'],
  ]},
  ru: { heading: 'Справка и руководство', sections: [
    ['Панель', 'Найдите город в верхней строке. Выберите карту маршрута или слежение за погодой. Нажмите значок прогноза, чтобы услышать текущие условия, прогноз, качество воздуха и морскую информацию.'],
    ['Карта маршрута', 'Найдите или выберите место, выберите Маршрут, способ передвижения и Старт. Маршрут и шаги остаются до смены назначения или запуска навигации.'],
    ['Слежение за погодой', 'Радар дождя включается в параметрах циклона. RainViewer охватывает весь мир; PAGASA накладывается на Филиппинах при наличии официального изображения.'],
    ['Новости', 'Новости соответствуют выбранному месту. Нажмите карточку, чтобы открыть страницу источника. При переключении вкладок новости сохраняются в кэше.'],
    ['Календарь и журнал', 'Подключите Google Calendar для событий и праздников. Нажмите дату для журнала этого дня. Проведите по календарю, чтобы сменить месяц.'],
    ['Музыкальный плеер', 'Откройте Музыку из навигации. Ищите на YouTube или выберите MP3-аудио. Запуск одного плеера приостанавливает другой.'],
    ['Настройки', 'Выберите единицы, начальное местоположение, предупреждения, тему, слой карты и язык. Подключите Google или установите приложение.'],
  ]},
  ar: { heading: 'المساعدة ودليل لوحة المعلومات', sections: [
    ['لوحة المعلومات', 'ابحث عن مدينة من الأعلى. اختر خريطة المسار أو تتبع الطقس. اضغط رمز المتنبئ لسماع الطقس الحالي والتوقعات وجودة الهواء والإرشادات البحرية.'],
    ['خريطة المسار', 'ابحث عن مكان أو حدده، ثم اختر الاتجاهات وطريقة التنقل وابدأ. يبقى المسار والخطوات ظاهرين حتى تغيير الوجهة أو بدء الملاحة.'],
    ['تتبع الطقس', 'يتم تشغيل رادار المطر من خيارات نشرة الأعاصير. يغطي RainViewer العالم، وتظهر طبقة PAGASA في الفلبين عند توفر صورة رسمية.'],
    ['الأخبار', 'تتبع الأخبار الموقع المحدد. اضغط البطاقة لفتح صفحة الناشر، وتبقى الأخبار مخزنة مؤقتًا عند تبديل علامات التبويب.'],
    ['التقويم واليوميات', 'اربط Google Calendar لعرض الأحداث والعطلات. اضغط تاريخًا لعرض يوميات ذلك اليوم، واسحب التقويم لتغيير الشهر.'],
    ['مشغل الموسيقى', 'افتح الموسيقى من شريط التنقل. ابحث في YouTube أو اختر ملفات MP3. تشغيل أحد المشغلين يوقف الآخر مؤقتًا.'],
    ['الإعدادات', 'اختر الوحدات وموقع البدء والتنبيهات والمظهر وطبقة الخريطة واللغة. يمكنك ربط خدمات Google أو تثبيت التطبيق.'],
  ]},
};

interface SettingsPanelProps {
  onInstallApp: () => void;
  isInstalled: boolean;
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  user: CalendarUser | null;
  onLogin: () => void;
  onLogout: () => void;
  currentLocation: Location;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, setSettings, user, onLogin, onLogout, currentLocation, onInstallApp, isInstalled }) => {

  const t = useTranslation(settings.language);
  const ui = getUiLabels(settings.language);
  const [isAboutOpen, setIsAboutOpen] = React.useState(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const helpRef = React.useRef<HTMLDivElement>(null);
  const aboutRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const target = isHelpOpen ? helpRef.current : isAboutOpen ? aboutRef.current : null;
    if (!target) return;
    const frame = requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [isHelpOpen, isAboutOpen]);

  const closeDisclosuresForOtherButton = (event: React.MouseEvent<HTMLElement>) => {
    const button = (event.target as HTMLElement).closest('button');
    if (!button || button.hasAttribute('data-settings-disclosure')) return;
    setIsHelpOpen(false);
    setIsAboutOpen(false);
  };

  const showSettingsButtonGlow = (event: React.PointerEvent<HTMLElement>) => {
    const button = (event.target as HTMLElement).closest('button');
    if (!button || button.disabled) return;

    button.classList.remove('settings-button-pressed');
    // Restart the animation even when the same button is tapped repeatedly.
    void button.offsetWidth;
    button.classList.add('settings-button-pressed');

    window.setTimeout(() => {
      button.classList.remove('settings-button-pressed');
    }, 260);
  };
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = React.useState(false);
  const [notificationPermission, setNotificationPermission] = React.useState<NotificationPermission | 'unsupported'>(() => 'Notification' in window ? Notification.permission : 'unsupported');
  const aboutLabels = ABOUT_LABELS[settings.language] || ABOUT_LABELS.en;
  const aboutDetails = ABOUT_DETAILS[settings.language] || ABOUT_DETAILS.en;
  const helpLabels = HELP_LABELS[settings.language] || HELP_LABELS.en;
  const legalLabels = LEGAL_LABELS[settings.language] || LEGAL_LABELS.en;
  const legalLanguage = encodeURIComponent(settings.language || 'en');

  const openLegalPage = async (path: 'privacy' | 'terms') => {
    const url = `/api/legal/${path}?lang=${legalLanguage}`;
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Legal page request failed: ${response.status}`);
      const html = await response.text();
      window.history.pushState(null, '', url);
      document.open();
      document.write(html);
      document.close();
    } catch {
      window.location.assign(url);
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

  const handleEnableWeatherAlerts = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
    }
    setSettings({ ...settings, severeAlerts: true });
  };

  return (
    <section onClickCapture={closeDisclosuresForOtherButton} onPointerDownCapture={showSettingsButtonGlow} className="settings-panel flex-1 p-6 sm:p-8 bg-sky-100 dark:bg-slate-950 overflow-y-auto">
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
                  {settings.severeAlerts !== false && notificationPermission === 'denied' && <div className="mt-1 text-[10px] text-red-600 dark:text-red-400">Browser notifications are blocked; dashboard weather alerts remain enabled.</div>}
                  {settings.severeAlerts !== false && notificationPermission === 'granted' && <div className="mt-1 text-[10px] text-emerald-700 dark:text-emerald-400">Dashboard and device notifications are enabled.</div>}
                </div>
                <div className="flex bg-sky-100 dark:bg-slate-950 p-1 rounded-lg border border-sky-200 dark:border-slate-800">
                  <button 
                    onClick={handleEnableWeatherAlerts}
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

        {/* 4. Appearance */}
        <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner">
          <div className="p-4 sm:p-6 border-b border-sky-200 dark:border-slate-800">
            <h3 className="text-xs sm:text-sm font-bold text-sky-900 dark:text-slate-300 uppercase tracking-widest mb-4">{t('appearance')}</h3>
            
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
                    <button onClick={() => setIsLogoutConfirmOpen(true)} className="text-[10px] sm:text-xs bg-blue-600 hover:bg-blue-500 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md transition-colors border border-blue-700 dark:border-slate-700 font-bold shadow-sm">{t('signOut')}</button>
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
                    <button
                      id="settings-install-app-btn"
                      onClick={onInstallApp}
                      className={`text-[10px] sm:text-xs px-3 py-1.5 sm:px-4 sm:py-2 rounded-md transition-colors flex items-center gap-1.5 font-bold shadow-sm !text-white ${isInstalled ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                      title={isInstalled ? t('appInstalled') : t('installApp')}
                    >
                      <Download size={13} color="#ffffff" stroke="#ffffff" className="!text-white" />
                      {isInstalled ? t('appInstalled') : t('installApp')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help */}
        <div ref={helpRef} className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner scroll-mt-4">
          <button type="button" data-settings-disclosure onClick={() => { setIsAboutOpen(false); setIsHelpOpen(open => !open); }} aria-expanded={isHelpOpen}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-sky-950 dark:text-slate-200">
            <span className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-widest"><HelpCircle size={16} />{helpLabels.heading}</span>
            <ChevronDown size={17} className={`transition-transform ${isHelpOpen ? 'rotate-180' : ''}`} />
          </button>
          {isHelpOpen && <div className="border-t border-sky-200 px-4 py-3 text-xs text-sky-950 dark:border-slate-800 dark:text-slate-200 sm:px-5">
            {helpLabels.sections.map(([title, text]) => <details key={title} className="border-b border-sky-200 py-2 last:border-0 dark:border-slate-700">
              <summary className="cursor-pointer select-none font-bold text-blue-700 dark:text-blue-400">{title}</summary>
              <p className="mt-1.5 leading-relaxed text-slate-700 dark:text-white">{text}</p>
            </details>)}
          </div>}
        </div>

        {isLogoutConfirmOpen && <div className="fixed inset-0 z-[120000] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="calendar-logout-title" onClick={() => setIsLogoutConfirmOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-sky-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={event => event.stopPropagation()}>
            <h3 id="calendar-logout-title" className="text-base font-bold text-slate-950 dark:text-white">{ui.signOutGoogleCalendarTitle}</h3>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{ui.signOutCalendarMessage}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" data-settings-disclosure onClick={() => setIsLogoutConfirmOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 !shadow-none hover:!shadow-none focus:!shadow-none active:!shadow-none hover:bg-sky-100 hover:border-sky-400 hover:text-sky-950 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700" style={{ boxShadow: 'none' }}>{ui.cancel}</button>
              <button type="button" onClick={() => { setIsLogoutConfirmOpen(false); onLogout(); }} className="rounded-lg border !border-blue-700 !bg-blue-600 px-4 py-2 text-sm font-bold !text-white shadow-sm transition-all hover:!bg-blue-500 hover:!shadow-[inset_0_0_0_2px_rgba(37,99,235,1),inset_0_0_10px_rgba(59,130,246,0.98),inset_0_0_18px_rgba(96,165,250,0.78)] dark:border-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500">{ui.signOut}</button>
            </div>
          </div>
        </div>}

        {/* About */}
        <div ref={aboutRef} className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-inner scroll-mt-4">
          <button
            type="button"
            data-settings-disclosure
            onClick={() => { setIsHelpOpen(false); setIsAboutOpen((open) => !open); }}
            aria-expanded={isAboutOpen}
            className="w-full p-4 sm:p-5 flex items-center justify-between text-sky-950 dark:text-slate-200"
          >
            <span className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-widest">
              <Info size={16} />
              {aboutLabels.about}
            </span>
            <ChevronDown size={17} className={`transition-transform ${isAboutOpen ? 'rotate-180' : ''}`} />
          </button>
          {isAboutOpen && (
            <div className="px-5 py-6 border-t border-sky-200 dark:border-slate-800 flex flex-col gap-4">
              <div className="text-center flex flex-col gap-1.5">
                <div className="flex items-center justify-center gap-2.5 text-xl font-bold text-sky-950 dark:text-white">
                  <AppLogo size={36} className="rounded-lg" />
                  <span>WeatherNow</span>
                </div>
                <div className="text-sm text-sky-900 dark:text-slate-300">By: Ruben Pangan</div>
                <div className="text-xs text-sky-800 dark:text-slate-400">© 2026</div>
                <div className="text-xs font-mono text-sky-800 dark:text-slate-400">{aboutLabels.version} {DASHBOARD_VERSION}</div>
                <div className="mt-1 text-xs font-medium text-blue-700 dark:text-blue-400">{aboutDetails.freeUse}</div>
              </div>

              <div className="rounded-lg border border-sky-200 !bg-white p-3 text-left dark:border-slate-700 dark:!bg-slate-950/70">
                <div className="text-xs font-bold text-sky-950 dark:text-slate-200">{aboutDetails.sourcesTitle}</div>
                <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  {aboutDetails.sources.map((source) => <li key={source}>• {source}</li>)}
                </ul>
              </div>

              <div className="rounded-lg border border-sky-200 !bg-white p-3 text-left dark:border-slate-700 dark:!bg-slate-950/70">
                <div className="text-xs font-bold text-sky-950 dark:text-slate-200">{aboutDetails.privacyTitle}</div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">{aboutDetails.privacy}</p>
              </div>

              <div className="rounded-lg border border-sky-200 !bg-white p-3 text-left dark:border-slate-700 dark:!bg-slate-950/70">
                <div className="text-xs font-bold text-sky-950 dark:text-slate-200">{legalLabels.legal}</div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold">
                  <a
                    href={`/api/legal/privacy?lang=${legalLanguage}`}
                    onClick={(event) => { event.preventDefault(); void openLegalPage('privacy'); }}
                    className="text-blue-700 underline underline-offset-2 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {legalLabels.privacy}
                  </a>
                  <a
                    href={`/api/legal/terms?lang=${legalLanguage}`}
                    onClick={(event) => { event.preventDefault(); void openLegalPage('terms'); }}
                    className="text-blue-700 underline underline-offset-2 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {legalLabels.terms}
                  </a>
                </div>
              </div>

              <div className="rounded-lg border border-amber-300 !bg-white p-3 text-left dark:border-amber-800 dark:!bg-slate-950/70">
                <div className="text-xs font-bold text-amber-900 dark:text-white">{aboutDetails.disclaimerTitle}</div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-amber-900/90 dark:text-white">{aboutDetails.disclaimer}</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};

