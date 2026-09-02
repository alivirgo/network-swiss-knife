import React, { useState } from 'react';
import { Play, Shield, AlertTriangle, CheckCircle, Download } from 'lucide-react';

export default function PortScannerView() {
  const [target, setTarget] = useState('127.0.0.1');
  const [preset, setPreset] = useState('top20');
  const [customRange, setCustomRange] = useState('1-1024');
  const [concurrency, setConcurrency] = useState(150);
  const [grabBanners, setGrabBanners] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleScan = async (e) => {
    e.preventDefault();
    setScanning(true);
    setError('');
    setResults(null);

    let payload = {
      target,
      concurrency: parseInt(concurrency),
      timeout: 1.0,
      grab_banners: grabBanners
    };

    if (preset === 'custom') {
      try {
        const parts = customRange.split('-');
        const start = parseInt(parts[0]);
        const end = parseInt(parts[1] || parts[0]);
        const portList = [];
        for (let i = start; i <= Math.min(end, start + 2000); i++) {
          portList.push(i);
        }
        payload.ports = portList;
      } catch (err) {
        setError('Invalid custom port range. Example: 20-100');
        setScanning(false);
        return;
      }
    } else {
      payload.preset = preset;
    }

    try {
      const res = await fetch('/api/scan/ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (err) {
      setError('Connection error to scanner engine: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  const exportCSV = () => {
    if (!results || !results.results.length) return;
    const headers = ['Port', 'Protocol', 'Service', 'Risk', 'Latency (ms)', 'Banner'];
    const rows = results.results.map(r => [
      r.port, r.protocol, `"${r.service}"`, r.risk, r.latency_ms, `"${(r.banner || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `port_scan_${target}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Shield size={18} color="#38bdf8" />
          Port Scanner & Service Detection
        </div>
        <div className="card-desc">
          Async socket connect scanner with service banner inspection and risk categorization.
        </div>

        <form onSubmit={handleScan}>
          <div className="form-row" style={{ marginBottom: 12 }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Target Host / IP</label>
              <input
                className="input mono"
                style={{ width: '100%' }}
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="e.g. 192.168.1.1 or scanme.nmap.org"
                required
              />
            </div>

            <div style={{ flex: '1 1 140px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Port Preset</label>
              <select
                className="input"
                style={{ width: '100%' }}
                value={preset}
                onChange={e => setPreset(e.target.value)}
              >
                <option value="top20">Top 20 Common</option>
                <option value="top100">Top 100 Extended</option>
                <option value="web">Web Ports</option>
                <option value="database">Databases</option>
                <option value="vpn">VPN / Proxies</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {preset === 'custom' && (
              <div style={{ flex: '1 1 120px' }}>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Range (Max 2000)</label>
                <input
                  className="input mono"
                  style={{ width: '100%' }}
                  value={customRange}
                  onChange={e => setCustomRange(e.target.value)}
                  placeholder="1-1024"
                />
              </div>
            )}

            <div style={{ flex: '1 1 100px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Concurrency</label>
              <input
                type="number"
                className="input mono"
                style={{ width: '100%' }}
                value={concurrency}
                onChange={e => setConcurrency(e.target.value)}
                min="10"
                max="500"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 18 }}>
              <input
                type="checkbox"
                id="grabBanners"
                checked={grabBanners}
                onChange={e => setGrabBanners(e.target.checked)}
              />
              <label htmlFor="grabBanners" style={{ fontSize: 12, color: '#cbd5e1', cursor: 'pointer' }}>Banner Grab</label>
            </div>

            <div style={{ paddingTop: 18 }}>
              <button className="btn btn-primary" type="submit" disabled={scanning}>
                <Play size={14} />
                {scanning ? 'Scanning...' : 'Start Scan'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 4, fontSize: 12, marginTop: 10 }}>
            {error}
          </div>
        )}
      </div>

      {results && (
        <div>
          <div className="metrics-row">
            <div className="metric-box">
              <div className="metric-label">Target Resolved</div>
              <div className="metric-val mono" style={{ fontSize: 16 }}>{results.ip}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Scanned Ports</div>
              <div className="metric-val">{results.scanned_ports_count}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Open Ports</div>
              <div className="metric-val" style={{ color: results.open_ports_count > 0 ? '#38bdf8' : '#94a3b8' }}>
                {results.open_ports_count}
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Scan Duration</div>
              <div className="metric-val mono" style={{ fontSize: 16 }}>{results.scan_time_seconds}s</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>DISCOVERED SERVICES</span>
            {results.results.length > 0 && (
              <button className="btn btn-secondary" onClick={exportCSV} style={{ padding: '4px 10px', fontSize: 11 }}>
                <Download size={12} /> Export CSV
              </button>
            )}
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Port</th>
                  <th>Protocol</th>
                  <th>Service</th>
                  <th>Risk Rating</th>
                  <th>Latency</th>
                  <th>Service Banner / Response</th>
                </tr>
              </thead>
              <tbody>
                {results.results.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                      No open ports detected in the scanned range.
                    </td>
                  </tr>
                ) : (
                  results.results.map((r) => (
                    <tr key={r.port}>
                      <td className="mono" style={{ fontWeight: 600, color: '#f1f5f9' }}>{r.port}</td>
                      <td className="mono">{r.protocol}</td>
                      <td style={{ color: '#38bdf8', fontWeight: 500 }}>{r.service}</td>
                      <td>
                        <span className={`badge ${r.risk === 'HIGH' ? 'badge-danger' : (r.risk === 'MEDIUM' ? 'badge-warning' : 'badge-neutral')}`}>
                          {r.risk}
                        </span>
                      </td>
                      <td className="mono">{r.latency_ms} ms</td>
                      <td className="mono" style={{ fontSize: 12, color: '#cbd5e1' }}>
                        {r.banner || <span style={{ color: '#475569' }}>None</span>}
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
