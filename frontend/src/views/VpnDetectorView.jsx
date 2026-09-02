import React, { useState } from 'react';
import { Eye, Shield, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export default function VpnDetectorView() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [cidr, setCidr] = useState('');
  const [error, setError] = useState('');

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

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Eye size={18} color="#38bdf8" />
          LAN VPN & Proxy User Discovery
        </div>
        <div className="card-desc">
          Discovers hosts running VPN servers, proxies, or encrypted tunnel endpoints (WireGuard 51820, OpenVPN 1194, IPsec 500/4500, PPTP 1723, SOCKS5 1080).
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
                {loading ? 'Auditing Subnet...' : 'Audit Network for VPNs'}
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
              <div className="metric-label">Local System VPN</div>
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
            LAN HOSTS WITH LISTENING VPN / PROXY SERVICES
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Host IP</th>
                  <th>Hostname</th>
                  <th>MAC & Vendor</th>
                  <th>Detected VPN Ports & Protocols</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {data.lan_endpoints_with_vpn_ports.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                      No active VPN listeners or proxy ports found on the audited network.
                    </td>
                  </tr>
                ) : (
                  data.lan_endpoints_with_vpn_ports.map((h) => (
                    <tr key={h.ip}>
                      <td className="mono" style={{ fontWeight: 600, color: '#f1f5f9' }}>{h.ip}</td>
                      <td>{h.hostname}</td>
                      <td>
                        <div className="mono" style={{ fontSize: 12 }}>{h.mac}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{h.vendor}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {h.detected_vpn_ports.map((p) => (
                            <span key={p.port} className="badge badge-warning mono">
                              {p.service} ({p.port})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${h.confidence === 'HIGH' ? 'badge-danger' : 'badge-warning'}`}>
                          {h.confidence}
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
