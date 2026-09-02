import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';

export default function CommandPalette({ isOpen, onClose, onSelectTool, tools }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = tools.filter((t) =>
    t.label.toLowerCase().includes(query.toLowerCase()) ||
    t.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        onSelectTool(filtered[selectedIndex].id);
        onClose();
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 10, 18, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 540,
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 8,
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          borderBottom: '1px solid #1e293b'
        }}>
          <Search size={16} color="#64748b" />
          <input
            ref={inputRef}
            className="mono"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f1f5f9',
              fontSize: 14
            }}
            placeholder="Search tools or commands (e.g. VPN, Port Scan, Subnet)..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '6px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              No matching network tools found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#1e293b' : 'transparent',
                    color: isSelected ? '#38bdf8' : '#cbd5e1',
                    fontSize: 13
                  }}
                  onClick={() => {
                    onSelectTool(item.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon size={16} color={isSelected ? '#38bdf8' : '#94a3b8'} />
                    <span style={{ fontWeight: 500 }}>{item.label}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>&bull; {item.category}</span>
                  </div>
                  {isSelected && <ArrowRight size={14} color="#38bdf8" />}
                </div>
              );
            })
          )}
        </div>

        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid #1e293b',
          fontSize: 11,
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>Navigate: <kbd style={{ background: '#1e293b', padding: '2px 5px', borderRadius: 3 }}>↑</kbd> <kbd style={{ background: '#1e293b', padding: '2px 5px', borderRadius: 3 }}>↓</kbd></span>
          <span>Select: <kbd style={{ background: '#1e293b', padding: '2px 5px', borderRadius: 3 }}>Enter</kbd></span>
          <span>Close: <kbd style={{ background: '#1e293b', padding: '2px 5px', borderRadius: 3 }}>Esc</kbd></span>
        </div>
      </div>
    </div>
  );
}
