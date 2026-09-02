import React, { useState, useEffect } from 'react';
import {
  Shield, Network, Activity, Globe, ShieldAlert, Eye, Navigation,
  Lock, Calculator, Send, Wrench, BookOpen, FileText, Menu, X,
  Gauge, Wifi, Search, Terminal
} from 'lucide-react';

import PortScannerView from './views/PortScannerView';
import LanDiscoveryView from './views/LanDiscoveryView';
import IspPingView from './views/IspPingView';
import DnsMonitorView from './views/DnsMonitorView';
import MaliciousDnsView from './views/MaliciousDnsView';
import VpnDetectorView from './views/VpnDetectorView';
import TracerouteView from './views/TracerouteView';
import DnsSwissKnifeView from './views/DnsSwissKnifeView';
import SslSecurityView from './views/SslSecurityView';
import SubnetCalculatorView from './views/SubnetCalculatorView';
import PacketCrafterView from './views/PacketCrafterView';
import AdvancedToolsView from './views/AdvancedToolsView';
import PortDirectoryView from './views/PortDirectoryView';
import ExportReportView from './views/ExportReportView';
import BandwidthSpeedView from './views/BandwidthSpeedView';
import WifiInterfacesView from './views/WifiInterfacesView';

import { ToastProvider, useToast } from './components/Toast';
import CommandPalette from './components/CommandPalette';

const NAV_SECTIONS = [
  {
    category: 'Core Scanners',
    items: [
      { id: 'ports', label: 'Port Scanner', icon: Shield },
      { id: 'lan', label: 'LAN Host Discovery', icon: Network },
      { id: 'vpn', label: 'Find VPN Users', icon: Eye }
    ]
  },
  {
    category: 'Ping & Telemetry',
    items: [
      { id: 'isp', label: 'ISP Ping Monitor', icon: Activity },
      { id: 'dns-ping', label: 'DNS Ping Benchmark', icon: Globe },
      { id: 'malicious-dns', label: 'Malicious DNS Check', icon: ShieldAlert },
      { id: 'traceroute', label: 'Visual Traceroute', icon: Navigation },
      { id: 'speedtest', label: 'Bandwidth Speedtest', icon: Gauge },
      { id: 'wifi', label: 'Wi-Fi & Interfaces', icon: Wifi }
    ]
  },
  {
    category: 'Analyzers',
    items: [
      { id: 'dns-records', label: 'DNS Swiss Knife', icon: Globe },
      { id: 'ssl-http', label: 'SSL & HTTP Security', icon: Lock },
      { id: 'subnet', label: 'Subnet & VLSM Calc', icon: Calculator }
    ]
  },
  {
    category: 'Diagnostic & Tools',
    items: [
      { id: 'packet', label: 'Packet Crafter & Echo', icon: Send },
      { id: 'advanced', label: 'Network Power Tools', icon: Wrench },
      { id: 'directory', label: '65k Port Reference', icon: BookOpen },
      { id: 'export', label: 'Audit Reports', icon: FileText }
    ]
  }
];

const ALL_TOOLS = NAV_SECTIONS.flatMap(s => s.items.map(i => ({ ...i, category: s.category })));

function MainApp() {
  const [activeTab, setActiveTab] = useState('ports');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Cloudflare Tunnel State
  const [tunnelOpen, setTunnelOpen] = useState(false);
  const [tunnelActive, setTunnelActive] = useState(false);
  const [tunnelUrl, setTunnelUrl] = useState('');
  const [tunnelLoading, setTunnelLoading] = useState(false);

  const addToast = useToast();

  useEffect(() => {
    // Check initial tunnel status
    fetch('/api/tunnel/status')
      .then(res => res.json())
      .then(d => {
        if (d.active && d.url) {
          setTunnelActive(true);
          setTunnelUrl(d.url);
        }
      })
      .catch(() => {});
  }, []);

  const toggleTunnel = async () => {
    setTunnelLoading(true);
    if (tunnelActive) {
      try {
        await fetch('/api/tunnel/stop', { method: 'POST' });
        setTunnelActive(false);
        setTunnelUrl('');
        addToast('Cloudflare Tunnel stopped');
      } catch (e) {
        addToast(e.message, 'error');
      } finally {
        setTunnelLoading(false);
      }
    } else {
      try {
        const res = await fetch('/api/tunnel/start', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setTunnelActive(true);
          setTunnelUrl(data.url);
          addToast(`Cloudflare Tunnel active: ${data.url}`);
        } else {
          addToast(data.error || 'Failed to start tunnel', 'error');
        }
      } catch (e) {
        addToast(e.message, 'error');
      } finally {
        setTunnelLoading(false);
      }
    }
  };

  const copyTunnelUrl = () => {
    if (tunnelUrl) {
      navigator.clipboard.writeText(tunnelUrl);
      addToast(`Copied public URL: ${tunnelUrl}`);
    }
  };

  // Global Keyboard Shortcuts (Ctrl+K or /)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavClick = (id) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  const renderView = () => {
    switch (activeTab) {
      case 'ports': return <PortScannerView />;
      case 'lan': return <LanDiscoveryView />;
      case 'vpn': return <VpnDetectorView />;
      case 'isp': return <IspPingView />;
      case 'dns-ping': return <DnsMonitorView />;
      case 'malicious-dns': return <MaliciousDnsView />;
      case 'traceroute': return <TracerouteView />;
      case 'speedtest': return <BandwidthSpeedView />;
      case 'wifi': return <WifiInterfacesView />;
      case 'dns-records': return <DnsSwissKnifeView />;
      case 'ssl-http': return <SslSecurityView />;
      case 'subnet': return <SubnetCalculatorView />;
      case 'packet': return <PacketCrafterView />;
      case 'advanced': return <AdvancedToolsView />;
      case 'directory': return <PortDirectoryView />;
      case 'export': return <ExportReportView />;
      default: return <PortScannerView />;
    }
  };

  const activeItem = ALL_TOOLS.find(i => i.id === activeTab);

  return (
    <div className="app-container">
      {/* Command Palette Modal */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectTool={(id) => setActiveTab(id)}
        tools={ALL_TOOLS}
      />

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Shield size={20} color="#38bdf8" />
          <div style={{ flex: 1 }}>
            <div className="app-title">Network Swiss Knife</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>NSK Toolkit 2.5</div>
          </div>
          <span className="app-badge">NSK</span>
          {sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="nav-groups">
          {NAV_SECTIONS.map((sec) => (
            <div key={sec.category} style={{ marginBottom: 12 }}>
              <div className="nav-category">{sec.category}</div>
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                  >
                    <Icon size={16} color={isActive ? '#38bdf8' : '#94a3b8'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: '#64748b' }}>
          Windows &bull; Mac &bull; Linux &bull; Android
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="main-content">
        {/* Topbar with Quick Search Button */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#f1f5f9' }}>
              {activeItem?.label || 'Dashboard'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Cloudflare Tunnel Network Sharing Button */}
            <button
              onClick={() => setTunnelOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: tunnelActive ? 'rgba(16, 185, 129, 0.15)' : '#1e293b',
                border: `1px solid ${tunnelActive ? '#10b981' : '#334155'}`,
                borderRadius: 6,
                padding: '4px 10px',
                color: tunnelActive ? '#10b981' : '#94a3b8',
                fontSize: 12,
                cursor: 'pointer'
              }}
              title="Share NSK over Network & Cloudflare Tunnel"
            >
              <Globe size={13} color={tunnelActive ? '#10b981' : '#64748b'} />
              <span>{tunnelActive ? 'Network Tunnel Active' : 'Share Over Network'}</span>
            </button>

            {/* Quick Command Palette Button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: 6,
                padding: '4px 10px',
                color: '#94a3b8',
                fontSize: 12,
                cursor: 'pointer'
              }}
              title="Open Command Palette (Ctrl+K or /)"
            >
              <Search size={13} color="#64748b" />
              <span>Search tools...</span>
              <kbd style={{ backgroundColor: '#0f172a', padding: '1px 5px', borderRadius: 3, fontSize: 10, color: '#38bdf8' }}>Ctrl K</kbd>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#10b981' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              <span className="mono" style={{ fontSize: 11 }}>ENGINE READY</span>
            </div>
          </div>
        </header>

        {/* Cloudflare Tunnel Sharing Modal */}
        {tunnelOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(7, 10, 18, 0.75)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setTunnelOpen(false)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 500,
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 8,
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                padding: 24
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>
                  <Globe size={18} color="#38bdf8" />
                  Cloudflare Network Sharing & Public Tunnel
                </div>
                <button
                  onClick={() => setTunnelOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 16 }}>
                Create an instant, secure Cloudflare HTTPS tunnel for this local NSK instance. Any device on your network or phone with mobile data can open this link to use your network scanner.
              </p>

              {tunnelActive && tunnelUrl ? (
                <div style={{ backgroundColor: '#070a12', border: '1px solid #10b981', borderRadius: 6, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginBottom: 4 }}>
                    ACTIVE CLOUDFLARE PUBLIC URL:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      className="input mono"
                      readOnly
                      value={tunnelUrl}
                      style={{ flex: 1, color: '#38bdf8', fontSize: 12, backgroundColor: '#0f172a' }}
                    />
                    <button className="btn btn-primary" onClick={copyTunnelUrl} style={{ padding: '6px 12px', fontSize: 12 }}>
                      Copy Link
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
                    &bull; Zero port forwarding needed &bull; Encrypted TLS via Cloudflare Edge
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: '#070a12', border: '1px solid #1e293b', borderRadius: 6, padding: 14, marginBottom: 16, fontSize: 12, color: '#94a3b8' }}>
                  Tunnel is currently <strong>Inactive</strong>. Click below to launch a secure Cloudflare tunnel.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  className={`btn ${tunnelActive ? 'btn-danger' : 'btn-primary'}`}
                  onClick={toggleTunnel}
                  disabled={tunnelLoading}
                >
                  {tunnelLoading ? 'Negotiating Tunnel...' : (tunnelActive ? 'Stop Cloudflare Tunnel' : 'Start Cloudflare Tunnel')}
                </button>
                <button className="btn btn-secondary" onClick={() => setTunnelOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic View Content */}
        <main className="view-container">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
