import { armenianTranslations } from '../locales/armenian';

export const useLocalization = () => {
  const t = (key: string, params?: Record<string, string | number>): any => {
    const keys = key.split('.');
    let value: any = armenianTranslations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    // If the value is not a string (e.g., array, object), return it as-is
    if (typeof value !== 'string') {
      return value;
    }
    
    // Replace parameters in the string
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match: string, paramKey: string) => {
        return params[paramKey]?.toString() || match;
      });
    }
    
    return value;
  };

  return { t };
};