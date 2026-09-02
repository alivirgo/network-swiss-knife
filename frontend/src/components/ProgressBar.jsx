import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ProgressBar({
  loading = false,
  label = "Processing action...",
  progress = null, // percentage 0-100 or null for indeterminate
  showTimer = true
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval = null;
    if (loading) {
      setElapsed(0);
      const start = performance.now();
      interval = setInterval(() => {
        setElapsed(((performance.now() - start) / 1000));
      }, 100);
    } else {
      setElapsed(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  if (!loading) return null;

  const formattedTime = elapsed.toFixed(1) + 's';

  return (
    <div style={{
      backgroundColor: '#070c18',
      border: '1px solid #1f293d',
      borderRadius: '6px',
      padding: '12px 14px',
      margin: '12px 0 16px 0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f1f5f9', fontWeight: 500 }}>
          <Loader2 size={14} className="spin" style={{ color: '#38bdf8' }} />
          <span>{label}</span>
        </div>
        {showTimer && (
          <div className="mono" style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 600 }}>
            Elapsed: {formattedTime}
            {progress !== null && ` (${Math.round(progress)}%)`}
          </div>
        )}
      </div>

      <div style={{
        height: '6px',
        backgroundColor: '#1e293b',
        borderRadius: '3px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {progress !== null ? (
          <div style={{
            height: '100%',
            width: `${Math.min(100, Math.max(0, progress))}%`,
            backgroundColor: '#38bdf8',
            borderRadius: '3px',
            transition: 'width 0.2s ease'
          }} />
        ) : (
          <div className="indeterminate-progress-bar" />
        )}
      </div>
    </div>
  );
}
