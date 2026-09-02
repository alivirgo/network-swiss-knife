import React, { useState } from 'react';
import { Lock, Shield, CheckCircle, AlertTriangle, XCircle, Search } from 'lucide-react';

export default function SslSecurityView() {
  const [target, setTarget] = useState('google.com');
  const [loading, setLoading] = useState(false);
  const [sslData, setSslData] = useState(null);
  const [httpData, setHttpData] = useState(null);
  const [error, setError] = useState('');

  const runAudit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSslData(null);
    setHttpData(null);

    try {
      const sslPromise = fetch(`/api/ssl/inspect?hostname=${encodeURIComponent(target)}`).then(r => r.json());
      const httpPromise = fetch(`/api/http/security-headers?url=${encodeURIComponent(target)}`).then(r => r.json());
      const [sRes, hRes] = await Promise.all([sslPromise, httpPromise]);

      setSslData(sRes);
      setHttpData(hRes);
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
          <Lock size={18} color="#38bdf8" />
          SSL / TLS Certificate & HTTP Security Headers
        </div>
        <div className="card-desc">
          Audit TLS certificates, cipher suites, expiration countdowns, and key HTTP response headers (HSTS, CSP, X-Frame-Options).
        </div>

        <form onSubmit={runAudit}>
          <div className="form-row">
            <div style={{ flex: '1 1 280px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Hostname or URL</label>
              <input
                className="input mono"
                style={{ width: '100%' }}
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="e.g. github.com"
                required
              />
            </div>

            <div style={{ paddingTop: 18 }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                <Search size={14} />
                {loading ? 'Inspecting Endpoint...' : 'Audit Security'}
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

      {sslData && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>TLS / SSL CERTIFICATE METRICS</div>
          {sslData.valid ? (
            <div>
              <div className="metrics-row">
                <div className="metric-box">
                  <div className="metric-label">Certificate Status</div>
                  <div className="metric-val">
                    <span className={`badge ${sslData.is_expired ? 'badge-danger' : (sslData.is_expiring_soon ? 'badge-warning' : 'badge-success')}`} style={{ fontSize: 13 }}>
                      {sslData.is_expired ? 'EXPIRED' : (sslData.is_expiring_soon ? 'EXPIRING SOON' : 'VALID')}
                    </span>
                  </div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Days Remaining</div>
                  <div className="metric-val mono">{sslData.days_remaining} days</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">TLS Protocol</div>
                  <div className="metric-val mono">{sslData.tls_version}</div>
                </div>
                <div className="metric-box">
                  <div className="metric-label">Certificate Authority</div>
                  <div className="metric-val" style={{ fontSize: 14 }}>{sslData.issuer}</div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <div className="form-row" style={{ fontSize: 12 }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <span style={{ color: '#64748b' }}>Cipher Suite: </span>
                    <span className="mono" style={{ color: '#cbd5e1' }}>{sslData.cipher_suite} ({sslData.cipher_bits} bits)</span>
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <span style={{ color: '#64748b' }}>Expires On: </span>
                    <span className="mono" style={{ color: '#cbd5e1' }}>{sslData.valid_until}</span>
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <span style={{ color: '#64748b' }}>SANs Count: </span>
                    <span className="mono" style={{ color: '#cbd5e1' }}>{sslData.sans_count} alternative names</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 6, fontSize: 13, marginBottom: 16 }}>
              TLS Connection Error: {sslData.error}
            </div>
          )}
        </div>
      )}

      {httpData && httpData.checks && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>HTTP SECURITY HEADERS (GRADE: {httpData.grade})</span>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Detected CDN: <span className="mono" style={{ color: '#38bdf8' }}>{httpData.cdn}</span> | Server: <span className="mono" style={{ color: '#cbd5e1' }}>{httpData.server}</span>
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Header</th>
                  <th>Status</th>
                  <th>Value</th>
                  <th>Security Impact</th>
                </tr>
              </thead>
              <tbody>
                {httpData.checks.map((c) => (
                  <tr key={c.header}>
                    <td className="mono" style={{ fontWeight: 600, color: '#f1f5f9' }}>{c.header}</td>
                    <td>
                      <span className={`badge ${c.present ? 'badge-success' : 'badge-danger'}`}>
                        {c.present ? 'CONFIGURED' : 'MISSING'}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 12, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.value || <span style={{ color: '#64748b' }}>Not set</span>}
                    </td>
                    <td style={{ fontSize: 12, color: '#94a3b8' }}>{c.recommendation}</td>
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
