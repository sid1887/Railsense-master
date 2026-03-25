/**
 * ToastContainer Component
 * Displays in-app toast notifications
 */

'use client';

import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: () => void;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // Listen for toast-added events
    const handleToastAdded = (event: Event) => {
      const customEvent = event as CustomEvent;
      const toastData = customEvent.detail;

      setToasts((prev) => [...prev, { ...toastData }]);
    };

    // Listen for toast-removed events
    const handleToastRemoved = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { id } = customEvent.detail;

      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    // Listen for clear-all events
    const handleToastsClear = () => {
      setToasts([]);
    };

    window.addEventListener('toast-added', handleToastAdded);
    window.addEventListener('toast-removed', handleToastRemoved);
    window.addEventListener('toasts-cleared', handleToastsClear);

    return () => {
      window.removeEventListener('toast-added', handleToastAdded);
      window.removeEventListener('toast-removed', handleToastRemoved);
      window.removeEventListener('toasts-cleared', handleToastsClear);
    };
  }, []);

  const getIcon = (type: Toast['type']) => {
    const iconProps = { className: 'w-5 h-5' };

    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle {...iconProps} className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle {...iconProps} className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info {...iconProps} className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-900 border-green-700';
      case 'error':
        return 'bg-red-900 border-red-700';
      case 'warning':
        return 'bg-yellow-900 border-yellow-700';
      case 'info':
      default:
        return 'bg-blue-900 border-blue-700';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, x: 400 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 400 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`min-w-[320px] max-w-[420px] ${getBackgroundColor(
              toast.type
            )} border rounded-lg shadow-lg p-4 text-white`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{getIcon(toast.type)}</div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{toast.title}</h3>
                <p className="text-xs text-gray-200 mt-1 line-clamp-2">
                  {toast.message}
                </p>

                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.();
                      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                    }}
                    className="mt-2 text-xs font-medium text-blue-300 hover:text-blue-200 transition-colors"
                  >
                    View Details
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
