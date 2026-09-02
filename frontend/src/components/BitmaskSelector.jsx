import React from 'react';

export default function BitmaskSelector({ prefix = 24, onChangePrefix }) {
  const bits = [];
  for (let i = 1; i <= 32; i++) {
    bits.push({
      position: i,
      isOn: i <= prefix
    });
  }

  const octets = [
    bits.slice(0, 8),
    bits.slice(8, 16),
    bits.slice(16, 24),
    bits.slice(24, 32)
  ];

  return (
    <div style={{
      backgroundColor: '#070c18',
      border: '1px solid #1f293d',
      borderRadius: 6,
      padding: '12px 14px',
      marginBottom: 16
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 11, color: '#94a3b8' }}>
        <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>Interactive 32-Bit Subnet Bitmask</span>
        <span className="mono" style={{ color: '#38bdf8', fontWeight: 600 }}>/{prefix} Prefix ({prefix} Network Bits / {32 - prefix} Host Bits)</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {octets.map((oct, octIdx) => (
          <React.Fragment key={octIdx}>
            <div style={{ display: 'flex', gap: 3 }}>
              {oct.map((b) => (
                <button
                  key={b.position}
                  type="button"
                  onClick={() => onChangePrefix && onChangePrefix(b.position)}
                  title={`Bit ${b.position} (Click to set /${b.position})`}
                  style={{
                    width: 20,
                    height: 24,
                    borderRadius: 3,
                    border: 'none',
                    backgroundColor: b.isOn ? '#0284c7' : '#1e293b',
                    color: b.isOn ? '#ffffff' : '#64748b',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.1s'
                  }}
                >
                  {b.isOn ? '1' : '0'}
                </button>
              ))}
            </div>
            {octIdx < 3 && <span className="mono" style={{ color: '#64748b', fontWeight: 700 }}>.</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
