import { useEffect } from 'react';

export type Toast = {
  id: number;
  type: 'new_visit' | 'payment_received';
  title: string;
  body: string;
};

let nextId = 1;

interface Props {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export function WSToastList({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isPayment = toast.type === 'payment_received';

  return (
    <div
      className={`flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg text-white animate-in slide-in-from-right-4 duration-300 ${
        isPayment ? 'bg-green-700' : 'bg-gray-800'
      }`}
    >
      <span className="text-xl shrink-0">{isPayment ? '💰' : '👁'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{toast.title}</p>
        <p className="text-xs text-white/70 mt-0.5 truncate">{toast.body}</p>
      </div>
      <button onClick={() => onDismiss(toast.id)} className="text-white/50 hover:text-white text-lg leading-none shrink-0">
        ×
      </button>
    </div>
  );
}

export function makeToast(type: Toast['type'], title: string, body: string): Toast {
  return { id: nextId++, type, title, body };
}
