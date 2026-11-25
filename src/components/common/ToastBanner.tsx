import React, {createContext, useCallback, useContext, useRef, useState} from 'react';

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(false);
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={{showToast}}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 pointer-events-none ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
        }`}
      >
        <div className="bg-ink-900 dark:bg-paper-100 text-paper-50 dark:text-ink-900 px-5 py-3 rounded-full shadow-lifted flex items-center gap-3 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-terracotta-500 shrink-0" />
          <span>{message}</span>
        </div>
      </div>
    </ToastContext.Provider>
  );
};
