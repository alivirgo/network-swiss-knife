import React, { useState, useEffect } from 'react';
import { Network, RefreshCw, Server, Laptop, Router, Download } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';

export default function LanDiscoveryView() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [cidr, setCidr] = useState('');
  const [error, setError] = useState('');

  const fetchLan = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = cidr ? `/api/lan/scan?cidr=${encodeURIComponent(cidr)}` : '/api/lan/scan';
      const res = await fetch(url);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/lan/info')
      .then(r => r.json())
      .then(info => {
        if (info.default_subnet) setCidr(info.default_subnet);
      })
      .catch(() => {});
  }, []);

  const exportCSV = () => {
    if (!data || !data.hosts.length) return;
    const headers = ['IP', 'Hostname', 'MAC', 'Vendor', 'Device Type', 'Latency (ms)'];
    const rows = data.hosts.map(h => [
      h.ip, `"${h.hostname}"`, h.mac, `"${h.vendor}"`, `"${h.device_type}"`, h.latency_ms
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lan_hosts_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Network size={18} color="#38bdf8" />
          LAN Host Discovery & Topology Scan
        </div>
        <div className="card-desc">
          High-concurrency ARP & ICMP subnet sweep with MAC vendor resolution (OUI) and device role identification.
        </div>

        <form onSubmit={fetchLan}>
          <div className="form-row">
            <div style={{ flex: '1 1 240px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Target Subnet CIDR</label>
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

      {data && (
        <div>
          <div className="metrics-row">
            <div className="metric-box">
              <div className="metric-label">Online Hosts</div>
              <div className="metric-val" style={{ color: '#38bdf8' }}>{data.online_count}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Probed IPs</div>
              <div className="metric-val">{data.total_probed}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Local Host IP</div>
              <div className="metric-val mono" style={{ fontSize: 16 }}>{data.local_ip}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Audited Subnet</div>
              <div className="metric-val mono" style={{ fontSize: 16 }}>{data.scanned_subnet}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>DISCOVERED NETWORK NODES</span>
            {data.hosts.length > 0 && (
              <button className="btn btn-secondary" onClick={exportCSV} style={{ padding: '4px 10px', fontSize: 11 }}>
                <Download size={12} /> Export CSV
              </button>
            )}
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Node IP</th>
                  <th>Hostname / Name</th>
                  <th>MAC Address</th>
                  <th>Hardware Vendor</th>
                  <th>Device Role</th>
                  <th>Latency</th>
                </tr>
              </thead>
              <tbody>
                {data.hosts.map((h) => (
                  <tr key={h.ip} style={h.is_self ? { backgroundColor: 'rgba(56, 189, 248, 0.05)' } : {}}>
                    <td className="mono" style={{ fontWeight: 600, color: h.is_gateway ? '#fbbf24' : (h.is_self ? '#38bdf8' : '#f1f5f9') }}>
                      {h.ip}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {h.is_gateway ? <Router size={14} color="#fbbf24" /> : (h.is_self ? <Laptop size={14} color="#38bdf8" /> : <Server size={14} color="#94a3b8" />)}
                        <span>{h.hostname}</span>
                        {h.is_gateway && <span className="badge badge-warning" style={{ fontSize: 10 }}>GATEWAY</span>}
                        {h.is_self && <span className="badge badge-neutral" style={{ fontSize: 10 }}>THIS DEVICE</span>}
                      </div>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{h.mac}</td>
                    <td style={{ color: '#cbd5e1' }}>{h.vendor}</td>
                    <td><span className="badge badge-neutral">{h.device_type}</span></td>
                    <td className="mono">{h.latency_ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
