import React, { useState } from 'react';
import { ShieldAlert, Search, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';

export default function MaliciousDnsView() {
  const [domain, setDomain] = useState('example.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const checkDomain = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`/api/dns/malicious-check?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      setResult(data);
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
          <ShieldAlert size={18} color="#38bdf8" />
          Malicious DNS & Threat Sinkhole Check
        </div>
        <div className="card-desc">
          Audits domains across threat-blocking DNS filters (Quad9, Cloudflare Security, CleanBrowsing) to identify malware, phishing, and sinkholed C2 domains.
        </div>

        <form onSubmit={checkDomain}>
          <div className="form-row">
            <div style={{ flex: '1 1 300px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Domain Name</label>
              <input
                className="input mono"
                style={{ width: '100%' }}
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="e.g. suspicious-bank-login.com or google.com"
                required
              />
            </div>

            <div style={{ paddingTop: 18 }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                <Search size={14} />
                {loading ? 'Checking Threat Feeds...' : 'Audit Domain'}
              </button>
            </div>
          </div>
        </form>

        <ProgressBar loading={loading} label={`Querying threat-blocking security resolvers for ${domain}...`} />

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 4, fontSize: 12, marginTop: 10 }}>
            {error}
          </div>
        )}
      </div>

      {result && (
        <div>
          <div className="metrics-row">
            <div className="metric-box">
              <div className="metric-label">Verdict</div>
              <div className="metric-val">
                <span className={`badge ${result.is_malicious ? 'badge-danger' : (result.risk_score_pct > 30 ? 'badge-warning' : 'badge-success')}`} style={{ fontSize: 13, padding: '4px 8px' }}>
                  {result.verdict}
                </span>
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Threat Risk Score</div>
              <div className="metric-val mono" style={{ color: result.risk_score_pct > 50 ? '#ef4444' : (result.risk_score_pct > 20 ? '#f59e0b' : '#10b981') }}>
                {result.risk_score_pct} / 100
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Security Blocks</div>
              <div className="metric-val mono">
                {result.blocked_resolvers_count} / {result.total_security_resolvers}
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Inspected Host</div>
              <div className="metric-val mono" style={{ fontSize: 15 }}>{result.domain}</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>SECURITY RESOLVER VERDICTS</div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resolver</th>
                  <th>Resolver IP</th>
                  <th>Filtering Mode</th>
                  <th>Resolved IP</th>
                  <th>Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {result.resolver_details.map((r) => (
                  <tr key={r.resolver}>
                    <td style={{ fontWeight: 500, color: '#f1f5f9' }}>{r.resolver}</td>
                    <td className="mono">{r.ip}</td>
                    <td>
                      <span className={`badge ${r.blocks_threats_mode ? 'badge-neutral' : 'badge-neutral'}`}>
                        {r.blocks_threats_mode ? 'Threat Blocklist Active' : 'Unfiltered Control'}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {r.ips && r.ips.length > 0 ? r.ips.join(', ') : <span style={{ color: '#ef4444' }}>NXDOMAIN / Refused</span>}
                    </td>
                    <td>
                      {r.is_sinkhole ? (
                        <span className="badge badge-danger">
                          <AlertTriangle size={12} /> SINKHOLED / BLOCKED
                        </span>
                      ) : (
                        <span className="badge badge-success">
                          <CheckCircle size={12} /> ALLOWED
                        </span>
                      )}
                    </td>
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
