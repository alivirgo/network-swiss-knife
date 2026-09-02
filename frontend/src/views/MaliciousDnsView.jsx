import React, { useState } from 'react';
import { ShieldAlert, Search, CheckCircle, AlertTriangle, XCircle, Copy, Globe } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import { useToast } from '../components/Toast';

export default function MaliciousDnsView() {
  const [domain, setDomain] = useState('example.com');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const addToast = useToast();

  const checkDomain = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch(`/api/dns/malicious-check?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      setResults(data);
      if (data.is_malicious) {
        addToast(`Warning: Domain flagged as malicious by threat intelligence filters!`, 'error');
      } else {
        addToast(`Domain check complete: ${data.verdict}`);
      }
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard');
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <ShieldAlert size={18} color="#38bdf8" />
          Malicious DNS & Threat Intelligence Sinkhole Check
        </div>
        <div className="card-desc">
          Audits domains across threat-blocking DNS filters (Quad9, Cloudflare Security, CleanBrowsing, AdGuard) with DGA, typosquatting, and subdomain reconnaissance.
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

      {results && (
        <div>
          <div className="metrics-row">
            <div className="metric-box">
              <div className="metric-label">Security Verdict</div>
              <div className="metric-val">
                <span className={`badge ${results.is_malicious ? 'badge-danger' : (results.risk_score_pct > 30 ? 'badge-warning' : 'badge-success')}`} style={{ fontSize: 14 }}>
                  {results.verdict}
                </span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Threat Risk Score</div>
              <div className="metric-val mono" style={{ color: results.risk_score_pct > 50 ? '#ef4444' : (results.risk_score_pct > 20 ? '#fbbf24' : '#10b981') }}>
                {results.risk_score_pct} / 100
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Security Filters Triggered</div>
              <div className="metric-val mono">{results.blocked_resolvers_count} / {results.total_security_resolvers}</div>
            </div>
          </div>

          {results.threat_indicators && results.threat_indicators.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#fbbf24', marginBottom: 6 }}>
                IDENTIFIED THREAT INDICATORS:
              </div>
              <ul style={{ paddingLeft: 18, fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
                {results.threat_indicators.map((ind, i) => (
                  <li key={i}>{ind}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Subdomain Discovery Preview */}
          {results.discovered_subdomains && results.discovered_subdomains.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe size={15} color="#38bdf8" />
                Discovered Active Subdomains ({results.discovered_subdomains.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {results.discovered_subdomains.map((s, idx) => (
                  <span key={idx} className="mono" style={{ backgroundColor: '#070a12', padding: '4px 8px', borderRadius: 4, fontSize: 12, border: '1px solid #1e293b' }}>
                    <strong style={{ color: '#38bdf8' }}>{s.prefix}</strong>.{results.domain} &rarr; <span style={{ color: '#94a3b8' }}>{s.ips.join(', ')}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resolver Comparison Table */}
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Security Resolver</th>
                  <th>Resolver IP</th>
                  <th>Classification</th>
                  <th>Resolved IP Address(es)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.resolver_details.map((res, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{res.resolver}</td>
                    <td className="mono">{res.ip}</td>
                    <td>
                      <span className={`badge ${res.blocks_threats_mode ? 'badge-warning' : 'badge-neutral'}`}>
                        {res.blocks_threats_mode ? 'Threat Filter' : 'Control'}
                      </span>
                    </td>
                    <td className="mono" style={{ color: res.is_sinkhole ? '#ef4444' : '#f1f5f9' }}>
                      {res.is_sinkhole ? 'SINKHOLE (Blocked)' : (res.ips.join(', ') || 'NXDOMAIN (Blocked)')}
                    </td>
                    <td>
                      {res.is_sinkhole ? (
                        <span className="badge badge-danger">BLOCKED</span>
                      ) : res.resolved ? (
                        <span className="badge badge-success">CLEAN / PASSED</span>
                      ) : (
                        <span className="badge badge-warning">BLOCKED / NX</span>
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
