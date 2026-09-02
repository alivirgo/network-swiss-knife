import React from 'react';

export default function Sparkline({ data = [], width = 300, height = 50, stroke = "#38bdf8", fill = "rgba(56, 189, 248, 0.1)" }) {
  if (!data || data.length < 2) {
    return <div style={{ height, display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '11px' }}>Waiting for data points...</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = (max - min) || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * (width - 4) + 2;
    const y = height - 4 - ((val - min) / range) * (height - 8);
    return `${x},${y}`;
  }).join(' ');

  const closedPath = `M ${points} L ${width - 2},${height} L 2,${height} Z`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <path d={closedPath} fill={fill} />
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
