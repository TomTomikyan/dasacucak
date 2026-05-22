import { useState, useCallback } from 'react';
import { ToastMessage } from '../components/Toast';

// Ծանուցումների (Toast) կառավարման custom hook
export const useToast = () => {
  // Ակտիվ ծանուցումների զանգվածի վիճակը (State)
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Նոր ծանուցում ավելացնող ֆունկցիա
  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    // Գեներացնում ենք եզակի ID (Id) ժամանակի և պատահական տողի միջոցով
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = {
      ...toast,
      id,
    };

    // Ավելացնում ենք նոր ծանուցումը եղածների ցանկին
    setToasts(prev => [...prev, newToast]);
  }, []);

  // Ծանուցումը ըստ ID-ի հեռացնող ֆունկցիա
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Հաջողության (Success) ծանուցում ցուցադրող ֆունկցիա
  const showSuccess = useCallback((title: string, message: string, duration?: number) => {
    addToast({ type: 'success', title, message, duration });
  }, [addToast]);

  // Սխալի (Error) ծանուցում ցուցադրող ֆունկցիա
  const showError = useCallback((title: string, message: string, duration?: number) => {
    addToast({ type: 'error', title, message, duration });
  }, [addToast]);

  // Նախազգուշացման (Warning) ծանուցում ցուցադրող ֆունկցիա
  const showWarning = useCallback((title: string, message: string, duration?: number) => {
    addToast({ type: 'warning', title, message, duration });
  }, [addToast]);

  // Տեղեկատվական (Info) ծանուցում ցուցադրող ֆունկցիա
  const showInfo = useCallback((title: string, message: string, duration?: number) => {
    addToast({ type: 'info', title, message, duration });
  }, [addToast]);

  // Բոլոր ծանուցումները միանգամից մաքրող ֆունկցիա
  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Վերադարձնում ենք վիճակը և բոլոր կառավարման ֆունկցիաները
  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAllToasts,
  };
};