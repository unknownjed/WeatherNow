const fs = require('fs');

const extraAr = {
  connectCalendarTab: "يرجى ربط حساب تقويم Google الخاص بك في العنوان العلوي الأيمن لعرض جدولك الكامل في علامة التبويب هذه.",
  station: "محطة",
  uptime: "وقت التشغيل",
  source: "مصدر",
  celsius: "°مئوية",
  fahrenheit: "°فهرنهايت",
  kmh: "كم/س",
  mph: "ميل/س",
  mm: "مم",
  inches: "بوصة",
  twelveHour: "12 ساعة",
  twentyFourHour: "24 ساعة",
  device: "جهاز",
  saved: "محفوظ",
  mapDefaultLayer: "طبقة الخريطة الافتراضية",
  mapDefaultDesc: "تم عرض تراكب الرادار الأولي.",
  cloudCover: "الغطاء السحابي",
  googleCalendar: "تقويم Google",
  installAppText: "تثبيت التطبيق",
  hourlyForecast: "توقعات 24 ساعة"
};

const extraKo = {
  connectCalendarTab: "이 탭에서 전체 일정을 보려면 오른쪽 상단 헤더에서 Google 캘린더 계정을 연결하세요.",
  station: "관측소",
  uptime: "가동 시간",
  source: "출처",
  celsius: "°섭씨",
  fahrenheit: "°화씨",
  kmh: "km/h",
  mph: "mph",
  mm: "mm",
  inches: "인치",
  twelveHour: "12시간",
  twentyFourHour: "24시간",
  device: "기기",
  saved: "저장됨",
  mapDefaultLayer: "지도 기본 레이어",
  mapDefaultDesc: "초기 레이더 오버레이가 표시됩니다.",
  cloudCover: "운량",
  googleCalendar: "Google 캘린더",
  installAppText: "앱 설치",
  hourlyForecast: "24시간 예보"
};

const extraRu = {
  connectCalendarTab: "Пожалуйста, подключите свою учетную запись Google Calendar в правом верхнем углу, чтобы просмотреть полное расписание на этой вкладке.",
  station: "Станция",
  uptime: "Время работы",
  source: "Источник",
  celsius: "°Цельсий",
  fahrenheit: "°Фаренгейт",
  kmh: "км/ч",
  mph: "миль/ч",
  mm: "мм",
  inches: "дюймы",
  twelveHour: "12-часовой",
  twentyFourHour: "24-часовой",
  device: "Устройство",
  saved: "Сохраненные",
  mapDefaultLayer: "Слой карты по умолчанию",
  mapDefaultDesc: "Отображается начальное наложение радара.",
  cloudCover: "Облачность",
  googleCalendar: "Google Календарь",
  installAppText: "Установить приложение",
  hourlyForecast: "Прогноз на 24 часа"
};

const extraIt = {
  connectCalendarTab: "Collega il tuo account Google Calendar nell'intestazione in alto a destra per visualizzare il tuo programma completo in questa scheda.",
  station: "Stazione",
  uptime: "Tempo di attività",
  source: "Fonte",
  celsius: "°Celsius",
  fahrenheit: "°Fahrenheit",
  kmh: "km/h",
  mph: "mph",
  mm: "mm",
  inches: "pollici",
  twelveHour: "12 ore",
  twentyFourHour: "24 ore",
  device: "Dispositivo",
  saved: "Salvato",
  mapDefaultLayer: "Livello mappa predefinito",
  mapDefaultDesc: "Sovrapposizione radar iniziale mostrata.",
  cloudCover: "Copertura nuvolosa",
  googleCalendar: "Google Calendar",
  installAppText: "Installa App",
  hourlyForecast: "Previsioni 24 ore"
};

const extraPt = {
  connectCalendarTab: "Conecte sua conta do Google Calendar no cabeçalho superior direito para visualizar sua programação completa nesta guia.",
  station: "Estação",
  uptime: "Tempo de atividade",
  source: "Fonte",
  celsius: "°Celsius",
  fahrenheit: "°Fahrenheit",
  kmh: "km/h",
  mph: "mph",
  mm: "mm",
  inches: "polegadas",
  twelveHour: "12 Horas",
  twentyFourHour: "24 Horas",
  device: "Dispositivo",
  saved: "Salvo",
  mapDefaultLayer: "Camada Padrão do Mapa",
  mapDefaultDesc: "Sobreposição inicial de radar mostrada.",
  cloudCover: "Cobertura de Nuvens",
  googleCalendar: "Google Agenda",
  installAppText: "Instalar App",
  hourlyForecast: "Previsão de 24 horas"
};

const extraHi = {
  connectCalendarTab: "इस टैब में अपना पूरा शेड्यूल देखने के लिए कृपया शीर्ष दाएं हेडर में अपना Google कैलेंडर खाता कनेक्ट करें।",
  station: "स्टेशन",
  uptime: "अपटाइम",
  source: "स्रोत",
  celsius: "°सेल्सियस",
  fahrenheit: "°फ़ारेनहाइट",
  kmh: "किमी/घंटा",
  mph: "मील/घंटा",
  mm: "मिमी",
  inches: "इंच",
  twelveHour: "12-घंटे",
  twentyFourHour: "24-घंटे",
  device: "उपकरण",
  saved: "सहेजा गया",
  mapDefaultLayer: "मानचित्र डिफ़ॉल्ट परत",
  mapDefaultDesc: "प्रारंभिक रडार ओवरले दिखाया गया।",
  cloudCover: "बादल",
  googleCalendar: "Google कैलेंडर",
  installAppText: "ऐप इंस्टॉल करें",
  hourlyForecast: "24-घंटे का पूर्वानुमान"
};

let code = fs.readFileSync('src/lib/i18n.ts', 'utf8');

function injectTranslations(langCode, extraObj, codeStr) {
  const marker1 = '"' + langCode + '": {';
  const marker2 = langCode + ': {';
  let markerIdx = codeStr.indexOf(marker1);
  if (markerIdx === -1) markerIdx = codeStr.indexOf(marker2);
  
  if (markerIdx !== -1) {
    const injectStr = Object.entries(extraObj).map(([k, v]) => '    "' + k + '": "' + v + '",').join('\n') + '\n';
    const splitIdx = codeStr.indexOf('{', markerIdx) + 1;
    return codeStr.slice(0, splitIdx) + '\n' + injectStr + codeStr.slice(splitIdx);
  }
  return codeStr;
}

code = injectTranslations('ar', extraAr, code);
code = injectTranslations('ko', extraKo, code);
code = injectTranslations('ru', extraRu, code);
code = injectTranslations('it', extraIt, code);
code = injectTranslations('pt', extraPt, code);
code = injectTranslations('hi', extraHi, code);

fs.writeFileSync('src/lib/i18n.ts', code);
