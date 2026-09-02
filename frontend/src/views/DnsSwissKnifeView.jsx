import React, { useState } from 'react';
import { Search, Globe, CheckCircle } from 'lucide-react';

export default function DnsSwissKnifeView() {
  const [domain, setDomain] = useState('google.com');
  const [activeTab, setActiveTab] = useState('lookup');
  const [propType, setPropType] = useState('A');
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState(null);
  const [propagation, setPropagation] = useState(null);
  const [error, setError] = useState('');

  const runQuery = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'lookup') {
        const res = await fetch(`/api/dns/lookup?domain=${encodeURIComponent(domain)}`);
        const json = await res.json();
        setRecords(json);
      } else {
        const res = await fetch(`/api/dns/propagation?domain=${encodeURIComponent(domain)}&type=${propType}`);
        const json = await res.json();
        setPropagation(json);
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
          <Globe size={18} color="#38bdf8" />
          DNS Records & Global Propagation Inspector
        </div>
        <div className="card-desc">
          Query authoritative records (A, AAAA, MX, TXT, NS, SOA, CAA) and test worldwide propagation consistency.
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            className={`btn ${activeTab === 'lookup' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('lookup')}
            type="button"
          >
            All Record Types
          </button>
          <button
            className={`btn ${activeTab === 'propagation' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('propagation')}
            type="button"
          >
            Global Propagation
          </button>
        </div>

        <form onSubmit={runQuery}>
          <div className="form-row">
            <div style={{ flex: '1 1 240px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Domain Name</label>
              <input
                className="input mono"
                style={{ width: '100%' }}
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="e.g. cloudflare.com"
                required
              />
            </div>

            {activeTab === 'propagation' && (
              <div style={{ flex: '0 0 100px' }}>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Record</label>
                <select className="input" value={propType} onChange={e => setPropType(e.target.value)}>
                  <option value="A">A</option>
                  <option value="AAAA">AAAA</option>
                  <option value="MX">MX</option>
                  <option value="TXT">TXT</option>
                  <option value="NS">NS</option>
                </select>
              </div>
            )}

            <div style={{ paddingTop: 18 }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                <Search size={14} />
                {loading ? 'Querying...' : (activeTab === 'lookup' ? 'Query All Records' : 'Check Worldwide')}
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

      {activeTab === 'lookup' && records && (
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>
            RESOLVED DNS RECORDS FOR {records.domain.toUpperCase()}
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>Record Type</th>
                  <th>Answers / Target Values</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(records.records).map(([type, vals]) => (
                  <tr key={type}>
                    <td className="mono" style={{ fontWeight: 600, color: '#38bdf8' }}>{type}</td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {vals.length > 0 ? (
                        vals.map((v, i) => (
                          <div key={i} style={{ marginBottom: 2 }}>{v}</div>
                        ))
                      ) : (
                        <span style={{ color: '#475569' }}>None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'propagation' && propagation && (
        <div>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>
            WORLDWIDE DNS RESOLVER REPLIES ({propType} RECORD)
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Resolver</th>
                  <th>IP</th>
                  <th>Region</th>
                  <th>Returned Value</th>
                  <th>Latency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {propagation.map((r) => (
                  <tr key={r.ip}>
                    <td style={{ fontWeight: 500, color: '#f1f5f9' }}>{r.name}</td>
                    <td className="mono">{r.ip}</td>
                    <td style={{ color: '#94a3b8' }}>{r.location}</td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {r.records.length > 0 ? r.records.join(', ') : <span style={{ color: '#64748b' }}>No record</span>}
                    </td>
                    <td className="mono">{r.latency_ms} ms</td>
                    <td>
                      <span className={`badge ${r.records.length > 0 ? 'badge-success' : 'badge-neutral'}`}>
                        {r.records.length > 0 ? 'RESOLVED' : 'NONE'}
                      </span>
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
