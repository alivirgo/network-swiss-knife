import React, { useState, useEffect } from 'react';
import { Network, RefreshCw, Server, Laptop, Router, Smartphone, Radio, Copy, Search, Shield } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import TopologyMap from '../components/TopologyMap';
import { useToast } from '../components/Toast';

export default function LanDiscoveryView() {
  const [loading, setLoading] = useState(false);
  const [lanData, setLanData] = useState(null);
  const [cidr, setCidr] = useState('');
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const addToast = useToast();

  const fetchLan = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = cidr ? `/api/lan/scan?cidr=${encodeURIComponent(cidr)}` : '/api/lan/scan';
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        addToast(data.error, 'error');
      } else {
        setLanData(data);
        addToast(`Discovered ${data.total_hosts_found} online network devices`);
      }
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLan();
  }, []);

  const copyToClipboard = (text, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    addToast(`${label}: ${text}`);
  };

  const hosts = lanData?.hosts || [];

  const filteredHosts = hosts.filter((h) => {
    const matchesSearch = h.ip.includes(searchQuery) ||
                          h.mac.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (h.hostname && h.hostname.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (h.vendor && h.vendor.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filterType === 'all') return matchesSearch;
    if (filterType === 'gateway') return matchesSearch && h.is_gateway;
    if (filterType === 'mobile') return matchesSearch && (h.device_type === 'Mobile Device' || (h.vendor && /samsung|apple|xiaomi|huawei|pixel|oneplus/i.test(h.vendor)));
    if (filterType === 'pc') return matchesSearch && (h.device_type === 'Workstation / PC');
    if (filterType === 'iot') return matchesSearch && (h.device_type === 'IoT / Embedded');
    return matchesSearch;
  });

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Network size={18} color="#38bdf8" />
          Active Subnet Discovery & Network Topology
        </div>
        <div className="card-desc">
          Discovers online network hosts via non-blocking ARP sweeps, ICMP echoes, reverse hostname resolution, and IEEE MAC OUI manufacturer identification.
        </div>

        <form onSubmit={fetchLan}>
          <div className="form-row">
            <div style={{ flex: '1 1 240px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Target Subnet CIDR (Leave blank for auto-detected LAN)</label>
              <input
                className="input mono"
                style={{ width: '100%' }}
                value={cidr}
                onChange={e => setCidr(e.target.value)}
                placeholder="e.g. 192.168.1.0/24"
              />
            </div>

            <div style={{ paddingTop: 18 }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                {loading ? 'Scanning Subnet...' : 'Scan Subnet'}
              </button>
            </div>
          </div>
        </form>

        <ProgressBar loading={loading} label={`Scanning LAN hosts on ${cidr || 'local subnet'}...`} />

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 4, fontSize: 12, marginTop: 10 }}>
            {error}
          </div>
        )}
      </div>

      {lanData && (
        <div>
          {/* Interactive Topology Graph */}
          <TopologyMap hosts={hosts} />

          <div className="metrics-row" style={{ marginTop: 16 }}>
            <div className="metric-box">
              <div className="metric-label">Online Devices</div>
              <div className="metric-val" style={{ color: '#38bdf8' }}>{lanData.total_hosts_found}</div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Local Host IP</div>
              <div
                className="metric-val mono"
                style={{ fontSize: 15, cursor: 'pointer' }}
                onClick={() => copyToClipboard(lanData.local_ip, 'Local IP')}
                title="Click to copy"
              >
                {lanData.local_ip}
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Scanned Subnet</div>
              <div className="metric-val mono" style={{ fontSize: 15 }}>{lanData.subnet}</div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Scan Duration</div>
              <div className="metric-val mono">{lanData.duration_seconds}s</div>
            </div>
          </div>

          {/* Quick Filter Chips & Search Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All (${hosts.length})` },
                { id: 'gateway', label: 'Gateways' },
                { id: 'mobile', label: 'Mobiles' },
                { id: 'pc', label: 'PCs' },
                { id: 'iot', label: 'IoT' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`btn ${filterType === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={() => setFilterType(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: 220 }}>
              <input
                className="input"
                style={{ width: '100%', paddingLeft: 28, fontSize: 12 }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search IP, MAC, Vendor..."
              />
              <Search size={13} color="#64748b" style={{ position: 'absolute', left: 8, top: 9 }} />
            </div>
          </div>

          {/* Devices Table */}
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>Hostname</th>
                  <th>MAC Address</th>
                  <th>Hardware Vendor</th>
                  <th>Device Classification</th>
                  <th>Latency</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHosts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                      No devices match the active filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredHosts.map((h) => (
                    <tr key={h.ip}>
                      <td className="mono" style={{ fontWeight: 600, color: '#f1f5f9' }}>
                        {h.ip}
                        {h.is_self && <span className="badge badge-neutral" style={{ marginLeft: 6 }}>This Machine</span>}
                        {h.is_gateway && <span className="badge badge-warning" style={{ marginLeft: 6 }}>Gateway</span>}
                      </td>
                      <td style={{ color: h.hostname ? '#cbd5e1' : '#64748b' }}>
                        {h.hostname || 'Unresolved'}
                      </td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {h.mac}
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{h.vendor || 'Generic Device'}</span>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{h.device_type || 'Endpoint'}</span>
                      </td>
                      <td className="mono">{h.latency_ms} ms</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '2px 6px', fontSize: 11 }}
                            onClick={() => copyToClipboard(h.ip, 'IP')}
                            title="Copy IP"
                          >
                            <Copy size={11} /> IP
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '2px 6px', fontSize: 11 }}
                            onClick={() => copyToClipboard(h.mac, 'MAC')}
                            title="Copy MAC"
                          >
                            <Copy size={11} /> MAC
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
