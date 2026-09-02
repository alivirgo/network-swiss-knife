import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 9999,
        pointerEvents: 'none'
      }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              backgroundColor: '#111827',
              border: `1px solid ${toast.type === 'error' ? '#ef4444' : (toast.type === 'warning' ? '#f59e0b' : '#38bdf8')}`,
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              color: '#f1f5f9',
              fontSize: 13,
              maxWidth: 360,
              animation: 'slideIn 0.2s ease-out'
            }}
          >
            {toast.type === 'error' ? (
              <AlertTriangle size={16} color="#ef4444" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle size={16} color="#f59e0b" />
            ) : (
              <CheckCircle size={16} color="#38bdf8" />
            )}
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ? ctx.addToast : () => {};
}
