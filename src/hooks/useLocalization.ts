import { armenianTranslations } from '../locales/armenian';

// Լոկալիզացիայի (թարգմանությունների) կառավարման custom hook
export const useLocalization = () => {
  // Թարգմանության բանալին ստացող և արժեքը վերադարձնող ֆունկցիա (t)
  const t = (key: string, params?: Record<string, string | number>): any => {
    // Բանալին բաժանում ենք կետերով (օրինակ՝ 'errors.required' -> ['errors', 'required'])
    const keys = key.split('.');
    let value: any = armenianTranslations;
    
    // Փնտրում ենք համապատասխան արժեքը թարգմանությունների օբյեկտի խորքից
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Եթե բանալին չի գտնվում, տպում ենք նախազգուշացում և վերադարձնում հենց բանալին
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    // Եթե արժեքը տեքստ (string) չէ (օրինակ՝ զանգված է կամ օբյեկտ), վերադարձնում ենք այն նույնությամբ
    if (typeof value !== 'string') {
      return value;
    }
    
    // Փոխարինում ենք փոխանցված պարամետրերը տեքստի մեջ (օրինակ՝ {count} -> 5)
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match: string, paramKey: string) => {
        return params[paramKey]?.toString() || match;
      });
    }
    
    return value;
  };

  // Վերադարձնում ենք թարգմանության ֆունկցիան
  return { t };
};