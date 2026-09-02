import React, { useState } from 'react';
import { Play, Shield, AlertTriangle, CheckCircle, Download, Search, Copy, Check } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import PortMatrix from '../components/PortMatrix';
import { useToast } from '../components/Toast';

export default function PortScannerView() {
  const [target, setTarget] = useState('127.0.0.1');
  const [preset, setPreset] = useState('top20');
  const [customRange, setCustomRange] = useState('80-443');
  const [concurrency, setConcurrency] = useState(100);
  const [timeoutMs, setTimeoutMs] = useState(600);
  const [grabBanners, setGrabBanners] = useState(true);

  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [filterText, setFilterText] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  const addToast = useToast();

  const handleScan = async (e) => {
    e.preventDefault();
    setScanning(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch('/api/scan/ports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          preset,
          custom_range: preset === 'custom' ? customRange : null,
          concurrency: parseInt(concurrency, 10),
          timeout: timeoutMs / 1000,
          grab_banner: grabBanners
        })
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
        addToast(data.error, 'error');
      } else {
        setResults(data);
        addToast(`Scan complete: ${data.open_ports_count} open ports found on ${data.ip}`);
      }
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setScanning(false);
    }
  };

  const copyToClipboard = (text, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    addToast(`${label}: ${text}`);
  };

  const filteredPorts = (results?.open_ports || []).filter((p) => {
    const matchText = p.service.toLowerCase().includes(filterText.toLowerCase()) ||
                      p.port.toString().includes(filterText) ||
                      (p.banner && p.banner.toLowerCase().includes(filterText.toLowerCase()));
    const matchRisk = riskFilter === 'all' || p.risk.toLowerCase() === riskFilter.toLowerCase();
    return matchText && matchRisk;
  });

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Shield size={18} color="#38bdf8" />
          High-Speed Async Port Scanner & Service Detective
        </div>
        <div className="card-desc">
          High-throughput non-blocking TCP socket scanner with concurrency scaling, service banner extraction, and vulnerability risk ratings.
        </div>

        <form onSubmit={handleScan}>
          <div className="form-row">
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
                  placeholder="80-1000"
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

            <div style={{ flex: '1 1 100px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Timeout (ms)</label>
              <input
                type="number"
                className="input mono"
                style={{ width: '100%' }}
                value={timeoutMs}
                onChange={e => setTimeoutMs(e.target.value)}
                min="100"
                max="3000"
                step="50"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 20 }}>
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

        <ProgressBar loading={scanning} label={`Scanning ports on ${target} (${preset})...`} />

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 4, fontSize: 12, marginTop: 10 }}>
            {error}
          </div>
        )}
      </div>

      {results && (
        <div>
          {/* Live Port Matrix */}
          <PortMatrix
            scannedCount={results.total_scanned}
            openPorts={results.open_ports}
          />

          <div className="metrics-row">
            <div className="metric-box">
              <div className="metric-label">Target Resolved</div>
              <div
                className="metric-val mono"
                style={{ fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => copyToClipboard(results.ip, 'IP')}
                title="Click to copy IP"
              >
                {results.ip} <Copy size={13} color="#64748b" />
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Open Ports</div>
              <div className="metric-val" style={{ color: results.open_ports_count > 0 ? '#38bdf8' : '#64748b' }}>
                {results.open_ports_count}
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Total Ports Scanned</div>
              <div className="metric-val mono">{results.total_scanned}</div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Scan Duration</div>
              <div className="metric-val mono">{results.duration_seconds}s</div>
            </div>
          </div>

          {/* Search and Risk Filter Bar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 200px', position: 'relative' }}>
              <input
                className="input"
                style={{ width: '100%', paddingLeft: 28 }}
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                placeholder="Filter by service name or port..."
              />
              <Search size={14} color="#64748b" style={{ position: 'absolute', left: 8, top: 10 }} />
            </div>

            <select
              className="input"
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value)}
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical Only</option>
              <option value="high">High Only</option>
              <option value="medium">Medium Only</option>
              <option value="low">Low Only</option>
            </select>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Port</th>
                  <th>Service</th>
                  <th>Risk Rating</th>
                  <th>Extracted Banner / Fingerprint</th>
                  <th>Response Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPorts.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                      {results.open_ports_count === 0 ? 'No open ports identified on target host.' : 'No open ports match the current filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredPorts.map((p) => (
                    <tr key={p.port}>
                      <td className="mono" style={{ fontWeight: 600, color: '#38bdf8' }}>{p.port}</td>
                      <td style={{ fontWeight: 500 }}>{p.service}</td>
                      <td>
                        <span className={`badge ${
                          p.risk === 'CRITICAL' ? 'badge-danger' :
                          p.risk === 'HIGH' ? 'badge-warning' :
                          p.risk === 'MEDIUM' ? 'badge-warning' : 'badge-neutral'
                        }`}>
                          {p.risk}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 11, color: p.banner ? '#f1f5f9' : '#64748b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.banner || 'None returned'}
                      </td>
                      <td className="mono">{p.response_ms} ms</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => copyToClipboard(`${results.ip}:${p.port}`, 'Target Address')}
                          title="Copy IP:Port"
                        >
                          <Copy size={11} /> Copy
                        </button>
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
