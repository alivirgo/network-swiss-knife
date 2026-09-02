import React, { useState } from 'react';
import { Globe, Search, RefreshCw, Mail, ShieldCheck, Copy, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import { useToast } from '../components/Toast';

export default function DnsSwissKnifeView() {
  const [activeTab, setActiveTab] = useState('lookup'); // 'lookup' | 'email' | 'dnssec' | 'propagation'
  const [domain, setDomain] = useState('google.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [lookupData, setLookupData] = useState(null);
  const [emailSecData, setEmailSecData] = useState(null);
  const [dnssecData, setDnssecData] = useState(null);
  const [propData, setPropData] = useState([]);

  const addToast = useToast();

  const handleAction = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'lookup') {
        const res = await fetch(`/api/dns/lookup?domain=${encodeURIComponent(domain)}`);
        const json = await res.json();
        setLookupData(json);
      } else if (activeTab === 'email') {
        const res = await fetch(`/api/dns/email-security?domain=${encodeURIComponent(domain)}`);
        const json = await res.json();
        setEmailSecData(json);
      } else if (activeTab === 'dnssec') {
        const res = await fetch(`/api/dns/dnssec?domain=${encodeURIComponent(domain)}`);
        const json = await res.json();
        setDnssecData(json);
      } else if (activeTab === 'propagation') {
        const res = await fetch(`/api/dns/propagation?domain=${encodeURIComponent(domain)}&type=A`);
        const json = await res.json();
        setPropData(json);
      }
    } catch (err) {
      setError(err.message);
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    addToast(`${label}: ${text}`);
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Globe size={18} color="#38bdf8" />
          DNS Swiss Knife & Authentication Auditor
        </div>
        <div className="card-desc">
          Inspect DNS resource records, audit SPF/DMARC email security policies, validate cryptographic DNSSEC signatures, and track global propagation.
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { id: 'lookup', label: 'Record Inspector' },
            { id: 'email', label: 'Email Security (SPF / DMARC)' },
            { id: 'dnssec', label: 'DNSSEC Validation' },
            { id: 'propagation', label: 'Worldwide Propagation' }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '4px 12px', fontSize: 12 }}
              onClick={() => { setActiveTab(tab.id); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleAction}>
          <div className="form-row">
            <div style={{ flex: '1 1 260px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Target Domain Name</label>
              <input
                className="input mono"
                style={{ width: '100%' }}
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="e.g. google.com or github.com"
                required
              />
            </div>

            <div style={{ paddingTop: 18 }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                <Search size={14} />
                {loading ? 'Querying Resolvers...' : 'Run Query'}
              </button>
            </div>
          </div>
        </form>

        <ProgressBar loading={loading} label={`Executing ${activeTab} check on ${domain}...`} />

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 4, fontSize: 12, marginTop: 10 }}>
            {error}
          </div>
        )}
      </div>

      {/* Tab 1: Record Inspector */}
      {activeTab === 'lookup' && lookupData && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Record Type</th>
                <th>Resolved Values</th>
                <th>Copy</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(lookupData.records).map(([type, vals]) => {
                if (!vals || vals.length === 0) return null;
                return (
                  <tr key={type}>
                    <td className="mono" style={{ fontWeight: 700, color: '#38bdf8' }}>{type}</td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {vals.map((v, i) => (
                        <div key={i} style={{ marginBottom: vals.length > 1 ? 4 : 0 }}>{v}</div>
                      ))}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '2px 6px', fontSize: 11 }}
                        onClick={() => copyToClipboard(vals.join('\n'), `${type} records`)}
                      >
                        <Copy size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Email Security (SPF / DMARC) */}
      {activeTab === 'email' && emailSecData && (
        <div>
          <div className="metrics-row">
            <div className="metric-box">
              <div className="metric-label">Security Health Grade</div>
              <div className="metric-val">
                <span className={`badge ${['A+', 'A'].includes(emailSecData.grade) ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 16 }}>
                  Grade {emailSecData.grade} ({emailSecData.score}/100)
                </span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">SPF Policy Status</div>
              <div className="metric-val">
                <span className={`badge ${emailSecData.spf.status === 'CONFIGURED' ? 'badge-success' : 'badge-danger'}`}>
                  {emailSecData.spf.strictness}
                </span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">DMARC Policy Enforcement</div>
              <div className="metric-val">
                <span className={`badge ${emailSecData.dmarc.policy === 'REJECT' ? 'badge-success' : (emailSecData.dmarc.policy === 'QUARANTINE' ? 'badge-warning' : 'badge-danger')}`}>
                  {emailSecData.dmarc.policy}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>SPF Record:</div>
            <div className="mono" style={{ backgroundColor: '#070a12', padding: 10, borderRadius: 4, fontSize: 12, color: '#38bdf8' }}>
              {emailSecData.spf.record}
            </div>

            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 12, marginBottom: 6 }}>DMARC Record:</div>
            <div className="mono" style={{ backgroundColor: '#070a12', padding: 10, borderRadius: 4, fontSize: 12, color: '#10b981' }}>
              {emailSecData.dmarc.record}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: DNSSEC */}
      {activeTab === 'dnssec' && dnssecData && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>DNSSEC Signing Status:</div>
            <span className={`badge ${dnssecData.dnssec_enabled ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 13, padding: '4px 10px' }}>
              {dnssecData.status}
            </span>
          </div>

          <div className="metrics-row">
            <div className="metric-box">
              <div className="metric-label">DNSKEY Records</div>
              <div className="metric-val mono">{dnssecData.dnskey_count}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">RRSIG Signatures</div>
              <div className="metric-val mono">{dnssecData.rrsig_count}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">DS Delegation Records</div>
              <div className="metric-val mono">{dnssecData.ds_count}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Global Propagation */}
      {activeTab === 'propagation' && propData.length > 0 && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Resolver Provider</th>
                <th>Location</th>
                <th>Resolved IP(s)</th>
                <th>Latency</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {propData.map((r, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td style={{ color: '#64748b' }}>{r.location}</td>
                  <td className="mono" style={{ color: '#38bdf8' }}>{r.records.join(', ') || 'None'}</td>
                  <td className="mono">{r.latency_ms} ms</td>
                  <td>
                    <span className={`badge ${r.status === 'resolved' ? 'badge-success' : 'badge-danger'}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
