import React, { useState } from 'react';
import { Navigation, Play } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';

export default function TracerouteView() {
  const [target, setTarget] = useState('1.1.1.1');
  const [maxHops, setMaxHops] = useState(15);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const runTrace = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setData(null);

    try {
      const res = await fetch(`/api/traceroute?target=${encodeURIComponent(target)}&max_hops=${maxHops}`);
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
          <Navigation size={18} color="#38bdf8" />
          Visual Hop Traceroute & GeoIP Enrichment
        </div>
        <div className="card-desc">
          Hop-by-hop path tracing with autonomous system (AS) routing and location breakdown.
        </div>

        <form onSubmit={runTrace}>
          <div className="form-row">
            <div style={{ flex: '1 1 240px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Target Host / IP</label>
              <input
                className="input mono"
                style={{ width: '100%' }}
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="e.g. 1.1.1.1 or github.com"
                required
              />
            </div>

            <div style={{ flex: '0 0 100px' }}>
              <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Max Hops</label>
              <input
                type="number"
                className="input mono"
                style={{ width: '100%' }}
                value={maxHops}
                onChange={e => setMaxHops(e.target.value)}
                min="5"
                max="30"
              />
            </div>

            <div style={{ paddingTop: 18 }}>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                <Play size={14} />
                {loading ? 'Tracing Path...' : 'Start Traceroute'}
              </button>
            </div>
          </div>
        </form>

        <ProgressBar loading={loading} label={`Tracing network hops to ${target} (up to ${maxHops} hops)...`} />

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
              <div className="metric-label">Target Host</div>
              <div className="metric-val mono" style={{ fontSize: 16 }}>{data.target}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Resolved IP</div>
              <div className="metric-val mono" style={{ fontSize: 16 }}>{data.destination_ip}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Total Hops</div>
              <div className="metric-val">{data.total_hops}</div>
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hop</th>
                  <th>Node IP</th>
                  <th>Latency</th>
                  <th>ISP / Organization</th>
                  <th>Location</th>
                  <th>AS Network</th>
                </tr>
              </thead>
              <tbody>
                {data.hops.map((h) => (
                  <tr key={h.hop}>
                    <td className="mono" style={{ fontWeight: 600, color: '#94a3b8' }}>#{h.hop}</td>
                    <td className="mono" style={{ fontWeight: 600, color: h.ip === '* * *' ? '#64748b' : '#f1f5f9' }}>
                      {h.ip}
                    </td>
                    <td className="mono">
                      {h.latency_ms > 0 ? `${h.latency_ms} ms` : <span style={{ color: '#64748b' }}>*</span>}
                    </td>
                    <td>{h.isp}</td>
                    <td>
                      {h.city !== '-' && h.country !== '-' ? `${h.city}, ${h.country}` : h.country}
                    </td>
                    <td className="mono" style={{ fontSize: 12, color: '#38bdf8' }}>{h.as}</td>
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
