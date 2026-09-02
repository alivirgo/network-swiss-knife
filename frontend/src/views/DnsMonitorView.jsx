import React, { useState, useEffect } from 'react';
import { Globe, RefreshCw, Zap } from 'lucide-react';

export default function DnsMonitorView() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDnsPings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ping/dns');
      const data = await res.json();
      setServers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDnsPings();
  }, []);

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Globe size={18} color="#38bdf8" />
          DNS Resolver Ping & Performance Benchmark
        </div>
        <div className="card-desc">
          Compare response times across global DNS providers to identify the fastest and most reliable resolver for your network.
        </div>

        <div>
          <button className="btn btn-primary" onClick={fetchDnsPings} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Benchmarking Resolvers...' : 'Run Benchmark'}
          </button>
        </div>
      </div>

      {servers.length > 0 && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Provider / Server</th>
                <th>IP Address</th>
                <th>Avg Latency</th>
                <th>Min / Max</th>
                <th>Packet Loss</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {servers.map((s, idx) => (
                <tr key={s.ip}>
                  <td className="mono" style={{ fontWeight: 600, color: idx === 0 ? '#10b981' : '#94a3b8' }}>
                    {idx === 0 ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Zap size={12} color="#10b981" /> #1</span> : `#${idx + 1}`}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: '#f1f5f9' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{s.provider}</div>
                  </td>
                  <td className="mono">{s.ip}</td>
                  <td className="mono" style={{ fontWeight: 600, color: s.avg_ms < 30 ? '#10b981' : (s.avg_ms < 70 ? '#38bdf8' : '#fbbf24') }}>
                    {s.avg_ms} ms
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {s.min_ms} / {s.max_ms} ms
                  </td>
                  <td className="mono">
                    <span style={{ color: s.packet_loss_pct > 0 ? '#ef4444' : '#94a3b8' }}>{s.packet_loss_pct}%</span>
                  </td>
                  <td>
                    <span className={`badge ${s.status === 'online' ? 'badge-success' : 'badge-danger'}`}>
                      {s.status}
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
