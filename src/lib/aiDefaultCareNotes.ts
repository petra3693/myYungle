import type { AppLanguage } from '@/i18n/languages'
import type { AnalyzePlantConfidence } from './analyzePlantResult'

const LOW_CONFIDENCE: Record<AppLanguage, string> = {
  en: 'Could not identify this plant with high confidence. Check light and soil moisture, and water moderately when the top soil feels dry.',
  de: 'Die Pflanze konnte nicht sicher erkannt werden. Prüfe Licht und Feuchtigkeit und gieße mäßig, wenn die Erde trocken ist.',
  hu: 'A növényt nem lehetett biztosan felismerni. Ellenőrizd a fényt és a talajnedvességet, és öntözz mértékkel, ha a föld száraz.',
  es: 'No se pudo identificar esta planta con alta confianza. Revisa la luz y la humedad del suelo, y riega con moderación cuando la capa superior esté seca.',
  fr: 'Cette plante n\'a pas pu être identifiée avec certitude. Vérifiez la lumière et l\'humidité du sol, et arrosez modérément lorsque la surface est sèche.',
  it: 'Impossibile identificare questa pianta con alta certezza. Controlla luce e umidità del terriccio e annaffia con moderazione quando la superficie è asciutta.',
  pt: 'Não foi possível identificar esta planta com alta confiança. Verifique a luz e a umidade do solo e regue com moderação quando a superfície estiver seca.',
  nl: 'Deze plant kon niet met hoge zekerheid worden herkend. Controleer licht en bodemvocht en geef matig water wanneer de bovenlaag droog aanvoelt.',
  pl: 'Nie udało się zidentyfikować tej rośliny z dużą pewnością. Sprawdź światło i wilgotność gleby i podlewaj umiarkowanie, gdy wierzchnia warstwa jest sucha.',
  ja: 'この植物を高い確度では特定できませんでした。光と土の乾き具合を確認し、表面が乾いたら適度に水やりしてください。',
  zh: '无法高置信度识别此植物。请检查光照和土壤湿度，在表层土壤干燥时适度浇水。',
}

const DEFAULT: Record<AppLanguage, string> = {
  en: 'Keep the soil evenly moist and place the plant in bright light away from harsh midday sun.',
  de: 'Halte die Erde gleichmäßig feucht und stelle die Pflanze an einen hellen Ort ohne direkte Mittagssonne.',
  hu: 'Tartsd egyenletesen nedvesen a földet, és helyezd világos helyre, közvetlen déli nap nélkül.',
  es: 'Mantén el suelo uniformemente húmedo y coloca la planta en un lugar luminoso, lejos del sol directo del mediodía.',
  fr: 'Gardez le sol uniformément humide et placez la plante dans un endroit lumineux, à l\'abri du soleil direct de midi.',
  it: 'Mantieni il terriccio uniformemente umido e colloca la pianta in un luogo luminoso, lontano dal sole diretto di mezzogiorno.',
  pt: 'Mantenha o solo uniformemente úmido e coloque a planta em local claro, longe do sol forte do meio-dia.',
  nl: 'Houd de grond gelijkmatig vochtig en zet de plant op een lichte plek, uit de felle middagzon.',
  pl: 'Utrzymuj glebę równomiernie wilgotną i ustaw roślinę w jasnym miejscu, z dala od ostrego południowego słońca.',
  ja: '土を均一に湿らせ、真昼の強い直射日光を避けた明るい場所に置いてください。',
  zh: '保持土壤均匀湿润，将植物放在明亮处，避免正午强烈直射阳光。',
}

export function defaultCareNotes(language: AppLanguage, confidence: AnalyzePlantConfidence): string {
  return confidence === 'low' ? LOW_CONFIDENCE[language] : DEFAULT[language]
}
