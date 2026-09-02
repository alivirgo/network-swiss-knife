import React, { useState, useEffect } from 'react';
import {
  Shield, Network, Activity, Globe, ShieldAlert, Eye, Navigation,
  Lock, Calculator, Send, Wrench, BookOpen, FileText, Menu, X
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
      { id: 'traceroute', label: 'Visual Traceroute', icon: Navigation }
    ]
  },
  {
    category: 'Analyzers',
    items: [
      { id: 'dns-records', label: 'DNS Swiss Knife', icon: Globe },
      { id: 'ssl-http', label: 'SSL & HTTP Security', icon: Lock },
      { id: 'subnet', label: 'Subnet & CIDR Calc', icon: Calculator }
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

export default function App() {
  const [activeTab, setActiveTab] = useState('ports');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [online, setOnline] = useState(true);

  // Close sidebar on mobile when switching tabs
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

  const activeItem = NAV_SECTIONS.flatMap(s => s.items).find(i => i.id === activeTab);

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Shield size={20} color="#38bdf8" />
          <div style={{ flex: 1 }}>
            <div className="app-title">Network Swiss Knife</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>NSK Toolkit</div>
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

        {/* Sidebar Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: '#64748b' }}>
          Cross-Platform &bull; Windows &bull; Mac &bull; Linux &bull; Android
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="main-content">
        {/* Top bar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#f1f5f9' }}>
              {activeItem?.label || 'Dashboard'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#10b981' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              <span className="mono" style={{ fontSize: 11 }}>ENGINE READY</span>
            </div>
          </div>
        </header>

        {/* Dynamic View Content */}
        <main className="view-container">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
