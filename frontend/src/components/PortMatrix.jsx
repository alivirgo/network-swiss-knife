import React from 'react';

export default function PortMatrix({ scannedCount = 0, openPorts = [], maxDots = 100 }) {
  if (scannedCount === 0) return null;

  const openPortSet = new Set(openPorts.map((p) => (typeof p === 'object' ? p.port : p)));
  const dots = [];
  const total = Math.min(scannedCount, maxDots);

  for (let i = 0; i < total; i++) {
    const isPortOpen = openPortSet.has(openPorts[i]?.port);
    dots.push({
      id: i,
      isOpen: i < openPorts.length,
      portInfo: openPorts[i] || null
    });
  }

  return (
    <div style={{
      backgroundColor: '#070c18',
      border: '1px solid #1f293d',
      borderRadius: 6,
      padding: '12px 14px',
      marginBottom: 16
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 11, color: '#94a3b8' }}>
        <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>Port Probing Matrix</span>
        <span>{openPorts.length} Open / {scannedCount} Scanned</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(10px, 1fr))',
        gap: 4,
        maxHeight: 70,
        overflowY: 'auto'
      }}>
        {dots.map((dot) => (
          <div
            key={dot.id}
            title={dot.portInfo ? `Port ${dot.portInfo.port}: ${dot.portInfo.service} (Open)` : 'Closed / Filtered'}
            style={{
              width: '100%',
              height: 8,
              borderRadius: 2,
              backgroundColor: dot.isOpen ? '#10b981' : '#1e293b',
              boxShadow: dot.isOpen ? '0 0 4px rgba(16, 185, 129, 0.6)' : 'none',
              transition: 'background-color 0.2s ease'
            }}
          />
        ))}
      </div>
    </div>
  );
}
