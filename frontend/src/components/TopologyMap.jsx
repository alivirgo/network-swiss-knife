import React, { useState } from 'react';
import { Router, Laptop, Smartphone, Server, Radio, Shield, Zap, X } from 'lucide-react';

export default function TopologyMap({ hosts = [], onSelectHost }) {
  const [selectedNode, setSelectedNode] = useState(null);

  if (!hosts || hosts.length === 0) {
    return null;
  }

  const gateway = hosts.find((h) => h.is_gateway) || hosts[0];
  const endpoints = hosts.filter((h) => h !== gateway);

  const getDeviceIcon = (deviceType = '', vendor = '') => {
    const lower = (deviceType + ' ' + vendor).toLowerCase();
    if (lower.includes('router') || lower.includes('gateway')) return Router;
    if (lower.includes('phone') || lower.includes('android') || lower.includes('apple') || lower.includes('samsung') || lower.includes('xiaomi')) return Smartphone;
    if (lower.includes('server') || lower.includes('linux')) return Server;
    if (lower.includes('iot') || lower.includes('espressif')) return Radio;
    return Laptop;
  };

  const getStatusColor = (h) => {
    if (h.is_gateway) return '#fbbf24';
    if (h.is_self) return '#38bdf8';
    return '#10b981';
  };

  return (
    <div className="card" style={{ padding: '16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={15} color="#38bdf8" />
          Interactive Network Topology Map
        </div>
        <div style={{ fontSize: 11, color: '#64748b' }}>
          {hosts.length} Online Nodes &bull; Click node to inspect
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div style={{
        backgroundColor: '#070a12',
        borderRadius: 6,
        border: '1px solid #1e293b',
        padding: '24px 16px',
        overflowX: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}>
        {/* Gateway Level */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div
            onClick={() => { setSelectedNode(gateway); onSelectHost && onSelectHost(gateway); }}
            style={{
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '10px 18px',
              backgroundColor: '#0f172a',
              border: `2px solid ${getStatusColor(gateway)}`,
              borderRadius: 8,
              boxShadow: '0 4px 14px rgba(251, 191, 36, 0.15)',
              transition: 'transform 0.15s, border-color 0.15s'
            }}
          >
            <Router size={22} color="#fbbf24" />
            <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', marginTop: 4 }}>
              {gateway.ip}
            </span>
            <span style={{ fontSize: 10, color: '#fbbf24', fontWeight: 600 }}>DEFAULT GATEWAY</span>
          </div>

          {/* Connection Line */}
          <div style={{ width: 2, height: 28, backgroundColor: '#334155' }} />
        </div>

        {/* Endpoints Grid Level */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
          maxWidth: 900
        }}>
          {endpoints.map((h) => {
            const Icon = getDeviceIcon(h.device_type, h.vendor);
            const color = getStatusColor(h);
            const isSelected = selectedNode?.ip === h.ip;
            return (
              <div
                key={h.ip}
                onClick={() => { setSelectedNode(h); onSelectHost && onSelectHost(h); }}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px 14px',
                  backgroundColor: isSelected ? '#1e293b' : '#0d1322',
                  border: `1px solid ${isSelected ? '#38bdf8' : '#1e293b'}`,
                  borderRadius: 6,
                  minWidth: 120,
                  transition: 'all 0.15s',
                  boxShadow: isSelected ? '0 0 10px rgba(56,189,248,0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon size={16} color={color} />
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
                </div>
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: '#f1f5f9', marginTop: 4 }}>
                  {h.ip}
                </span>
                <span style={{ fontSize: 10, color: '#64748b', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.hostname || h.vendor || 'Host'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Node Details Floating Drawer */}
      {selectedNode && (
        <div style={{
          marginTop: 12,
          padding: 14,
          backgroundColor: '#070c18',
          border: '1px solid #1f293d',
          borderRadius: 6,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8' }}>
                {selectedNode.ip}
              </span>
              <span className="badge badge-neutral">{selectedNode.device_type || 'Device'}</span>
              {selectedNode.is_gateway && <span className="badge badge-warning">Gateway</span>}
              {selectedNode.is_self && <span className="badge badge-neutral">This Machine</span>}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              Hostname: <strong style={{ color: '#f1f5f9' }}>{selectedNode.hostname || '-'}</strong> &bull; MAC: <span className="mono">{selectedNode.mac}</span> &bull; Vendor: {selectedNode.vendor} &bull; Latency: {selectedNode.latency_ms}ms
            </div>
          </div>

          <button
            onClick={() => setSelectedNode(null)}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
