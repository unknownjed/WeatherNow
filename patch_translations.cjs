const fs = require('fs');
let code = fs.readFileSync('src/components/WeatherForecaster.tsx', 'utf8');

// 1. In getPreparations: add pt, it, hi
const oldPrepZh = `  if (language === 'zh') {`;
const newPrepIt = `  if (language === 'it') {
    if (wind >= 74) return "Allarme rosso! Abbiamo rilevato venti estremi, trovate subito riparo!";
    if (isHeavyRain && isMonsoonRegion) return "Attenzione: forti piogge in corso, state attenti alle inondazioni.";
    if (wind >= 40 && isHeavyRain) return "Attenzione: forti venti e forti piogge. Rimanete al chiuso se possibile.";
    if (code >= 51 && code <= 67) return "Sembra che ci sia pioggia, non dimenticate l'ombrello.";
    if (code >= 71 && code <= 86) return "Prevista neve, copritevi bene.";
    if (code >= 95 && code <= 99) return "Previsti temporali, rimanete al chiuso.";
    if (code <= 2) {
      if (isHot && humidity >= 60) return "Cielo sereno, ma il calore elevato e l'umidità lo rendono opprimente.";
      if (isHot) return "Soleggiato, ma fate attenzione ai raggi solari, mantenetevi idratati.";
      return "Cielo sereno, ottimo momento per gli occhiali da sole.";
    }
  }
  if (language === 'pt') {
    if (wind >= 74) return "Alerta vermelho! Detectamos ventos extremos, procure abrigo!";
    if (isHeavyRain && isMonsoonRegion) return "Aviso: chuva forte, cuidado com inundações.";
    if (wind >= 40 && isHeavyRain) return "Aviso: ventos e chuvas fortes. Fique em casa.";
    if (code >= 51 && code <= 67) return "Parece que vai chover, leve um guarda-chuva.";
    if (code >= 71 && code <= 86) return "Previsão de neve, agasalhe-se.";
    if (code >= 95 && code <= 99) return "Previsão de trovoadas, fique em segurança.";
    if (code <= 2) {
      if (isHot && humidity >= 60) return "Céu limpo, mas muito quente e úmido.";
      if (isHot) return "Ensolarado, mantenha-se hidratado e protegido do sol.";
      return "Céu limpo, perfeito para óculos de sol.";
    }
  }
  if (language === 'hi') {
    if (wind >= 74) return "रेड अलर्ट! बहुत तेज़ हवाएँ, तुरंत आश्रय लें!";
    if (isHeavyRain && isMonsoonRegion) return "चेतावनी: भारी बारिश, बाढ़ से सावधान रहें।";
    if (wind >= 40 && isHeavyRain) return "चेतावनी: तेज़ हवाएँ और बारिश। घर के अंदर रहें।";
    if (code >= 51 && code <= 67) return "बारिश हो सकती है, छाता न भूलें।";
    if (code >= 71 && code <= 86) return "बर्फबारी की संभावना है, गर्म कपड़े पहनें।";
    if (code >= 95 && code <= 99) return "गरज के साथ बारिश, सुरक्षित रहें।";
    if (code <= 2) {
      if (isHot && humidity >= 60) return "आसमान साफ है, लेकिन बहुत गर्मी और उमस है।";
      if (isHot) return "धूप है, हाइड्रेटेड रहें।";
      return "आसमान साफ है, धूप का चश्मा लगाएं।";
    }
  }
  if (language === 'zh') {`;
code = code.replace(oldPrepZh, newPrepIt);

fs.writeFileSync('src/components/WeatherForecaster.tsx', code);
