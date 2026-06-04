import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, X, Info } from '../icons';
import { cn } from '../../lib/utils';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

const Ctx = createContext<{
  push: (msg: string, type?: ToastType) => void;
}>({ push: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border bg-elevated p-3 shadow-pop',
              t.type === 'success' && 'border-success/30',
              t.type === 'error' && 'border-danger/30',
              t.type === 'info' && 'border-border'
            )}
          >
            <div
              className={cn(
                'mt-0.5',
                t.type === 'success' && 'text-success',
                t.type === 'error' && 'text-danger',
                t.type === 'info' && 'text-info'
              )}
            >
              {t.type === 'success' ? (
                <CheckCircle2 size={18} />
              ) : t.type === 'error' ? (
                <AlertCircle size={18} />
              ) : (
                <Info size={18} />
              )}
            </div>
            <div className="flex-1 text-sm">{t.message}</div>
            <button
              className="text-subtle hover:text-fg"
              onClick={() => setToasts((arr) => arr.filter((x) => x.id !== t.id))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
