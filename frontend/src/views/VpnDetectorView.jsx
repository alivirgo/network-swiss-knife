import React, { useState } from 'react';
import { Eye, Shield, AlertTriangle, CheckCircle, RefreshCw, Smartphone, Search } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';

export default function VpnDetectorView() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [cidr, setCidr] = useState('');
  const [error, setError] = useState('');

  // Target Device Specific Deep Audit
  const [targetIp, setTargetIp] = useState('');
  const [targetResult, setTargetResult] = useState(null);
  const [targetLoading, setTargetLoading] = useState(false);
  const [targetError, setTargetError] = useState('');

  const runAudit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setData(null);

    try {
      const url = cidr ? `/api/vpn/audit?cidr=${encodeURIComponent(cidr)}` : '/api/vpn/audit';
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

  const inspectTargetDevice = async (e) => {
    if (e) e.preventDefault();
    if (!targetIp) return;
    setTargetLoading(true);
    setTargetError('');
    setTargetResult(null);

    try {
      const res = await fetch(`/api/vpn/inspect-target?ip=${encodeURIComponent(targetIp)}`);
      const json = await res.json();
      if (json.error) {
        setTargetError(json.error);
      } else {
        setTargetResult(json);
      }
    } catch (err) {
      setTargetError(err.message);
    } finally {
      setTargetLoading(false);
    }
  };

  return (
    <div>
      {/* 1. Subnet Audit */}
      <div className="card">
        <div className="card-title">
          <Eye size={18} color="#38bdf8" />
          LAN VPN & Encrypted Tunnel User Discovery
        </div>
        <div className="card-desc">
          Detects active VPN servers and mobile/workstation client tunnels (ProtonVPN, WireGuard, OpenVPN, IPsec) via MTU clamping and LAN service shielding.
        </div>

        <form onSubmit={runAudit}>
          <div className="form-row">
            <div style={{ flex: '1 1 240px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Subnet CIDR (Leave blank for auto-detected LAN)</label>
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
                {loading ? 'Auditing Subnet...' : 'Audit Entire Subnet'}
              </button>
            </div>
          </div>
        </form>

        <ProgressBar loading={loading} label="Sweeping subnet for active VPN tunnels and MTU clamped devices..." />

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 4, fontSize: 12, marginTop: 10 }}>
            {error}
          </div>
        )}
      </div>

      {/* 2. Target Specific Device / Phone Deep Inspector */}
      <div className="card">
        <div className="card-title">
          <Smartphone size={18} color="#38bdf8" />
          Deep Client Device VPN Audit (Android / iOS / PC)
        </div>
        <div className="card-desc">
          Audit a specific device IP to test for active client-side VPN tunnels (e.g. ProtonVPN, WireGuard, NordVPN) using multi-vector MTU clamping, LAN service shielding, and socket telemetry.
        </div>

        <form onSubmit={inspectTargetDevice}>
          <div className="form-row">
            <div style={{ flex: '1 1 220px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Device LAN IP</label>
              <input
                className="input mono"
                style={{ width: '100%' }}
                value={targetIp}
                onChange={e => setTargetIp(e.target.value)}
                placeholder="e.g. 192.168.1.50"
                required
              />
            </div>

            <div style={{ paddingTop: 18 }}>
              <button className="btn btn-secondary" type="submit" disabled={targetLoading}>
                <Search size={14} />
                {targetLoading ? 'Auditing Device...' : 'Inspect Specific IP'}
              </button>
            </div>
          </div>
        </form>

        <ProgressBar loading={targetLoading} label={`Testing MTU clamping and LAN shielding on ${targetIp}...`} />

        {targetError && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 4, fontSize: 12, marginTop: 10 }}>
            {targetError}
          </div>
        )}

        {targetResult && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                Inspection Results for <span className="mono" style={{ color: '#38bdf8' }}>{targetResult.ip}</span>
              </div>
              <span className={`badge ${targetResult.is_vpn_active ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: 12, padding: '4px 10px' }}>
                {targetResult.is_vpn_active ? `VPN ACTIVE (${targetResult.confidence_pct}% CONFIDENCE)` : 'NO VPN DETECTED'}
              </span>
            </div>

            <div className="metrics-row" style={{ marginBottom: 12 }}>
              <div className="metric-box">
                <div className="metric-label">Detected Profile</div>
                <div className="metric-val" style={{ fontSize: 13, color: targetResult.is_vpn_active ? '#fbbf24' : '#10b981' }}>
                  {targetResult.detected_profile}
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-label">MTU Clamped (&lt;1420B)</div>
                <div className="metric-val">
                  <span className={`badge ${targetResult.mtu_clamped ? 'badge-warning' : 'badge-neutral'}`}>
                    {targetResult.mtu_clamped ? 'CLAMPED' : 'STANDARD'}
                  </span>
                </div>
              </div>
              <div className="metric-box">
                <div className="metric-label">LAN Services Shielded</div>
                <div className="metric-val">
                  <span className={`badge ${targetResult.lan_shielded ? 'badge-warning' : 'badge-neutral'}`}>
                    {targetResult.lan_shielded ? 'SHIELDED (ISOLATED)' : 'EXPOSED'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 }}>DETECTED TELEMETRY EVIDENCE:</div>
            <ul style={{ paddingLeft: 18, fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
              {targetResult.evidence.map((ev, i) => (
                <li key={i}>{ev}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Subnet Results */}
      {data && (
        <div>
          <div className="metrics-row">
            <div className="metric-box">
              <div className="metric-label">Detected VPN Users</div>
              <div className="metric-val" style={{ color: data.suspected_vpn_users_count > 0 ? '#fbbf24' : '#10b981' }}>
                {data.suspected_vpn_users_count}
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-label">LAN Hosts Audited</div>
              <div className="metric-val">{data.total_hosts_checked}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Local Host VPN Adapter</div>
              <div className="metric-val">
                <span className={`badge ${data.local_machine_has_vpn ? 'badge-warning' : 'badge-success'}`}>
                  {data.local_machine_has_vpn ? 'ACTIVE TUNNEL' : 'NONE DETECTED'}
                </span>
              </div>
            </div>
          </div>

          {/* Local Machine VPN Adapters */}
          {data.local_vpn_adapters && data.local_vpn_adapters.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#fbbf24' }}>
                LOCAL VIRTUAL TUNNEL ADAPTERS DETECTED
              </div>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Interface Name</th>
                      <th>VPN Type</th>
                      <th>Virtual IPs</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.local_vpn_adapters.map((a, idx) => (
                      <tr key={idx}>
                        <td className="mono" style={{ fontWeight: 600 }}>{a.interface}</td>
                        <td><span className="badge badge-warning">{a.vpn_type}</span></td>
                        <td className="mono">{a.addresses.join(', ') || 'Dynamic'}</td>
                        <td><span className="badge badge-success">UP</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LAN Endpoints with VPN services */}
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>
            LAN HOSTS WITH ACTIVE VPN TUNNELS OR CLIENT PROFILES
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Host IP</th>
                  <th>Hostname / Vendor</th>
                  <th>Detected VPN Profile</th>
                  <th>Evidence Details</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {data.lan_endpoints_with_vpn_ports.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                      No active VPN listeners or client tunnels detected on the audited subnet.
                    </td>
                  </tr>
                ) : (
                  data.lan_endpoints_with_vpn_ports.map((h) => (
                    <tr key={h.ip}>
                      <td className="mono" style={{ fontWeight: 600, color: '#f1f5f9' }}>{h.ip}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{h.hostname}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{h.vendor || h.mac}</div>
                      </td>
                      <td style={{ color: '#fbbf24', fontWeight: 500, fontSize: 12 }}>
                        {h.detected_profile}
                      </td>
                      <td style={{ fontSize: 12, color: '#94a3b8' }}>
                        {h.evidence && h.evidence.length > 0 ? h.evidence.join('; ') : 'Active VPN signatures detected'}
                      </td>
                      <td>
                        <span className={`badge ${h.confidence_pct >= 70 ? 'badge-danger' : 'badge-warning'}`}>
                          {h.confidence_pct}%
                        </span>
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
