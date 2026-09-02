import React, { useState } from 'react';
import { Navigation, Play, MapPin, Zap, Copy } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import { useToast } from '../components/Toast';

export default function TracerouteView() {
  const [target, setTarget] = useState('1.1.1.1');
  const [maxHops, setMaxHops] = useState(18);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const addToast = useToast();

  const handleTrace = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch(`/api/traceroute?target=${encodeURIComponent(target)}&max_hops=${maxHops}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        addToast(data.error, 'error');
      } else {
        setResults(data);
        addToast(`Traceroute complete: ${data.total_hops} hops traced to ${data.target}`);
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
    addToast(`Copied: ${text}`);
  };

  const hops = results?.hops || [];

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Navigation size={18} color="#38bdf8" />
          Interactive Visual Hop Traceroute & GeoIP Routing
        </div>
        <div className="card-desc">
          Discovers autonomous system (AS) network path, transit providers, and geographic routing across all intermediary routers.
        </div>

        <form onSubmit={handleTrace}>
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

      {results && (
        <div>
          {/* Visual Route Timeline */}
          <div className="card" style={{ overflowX: 'auto', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>
              VISUAL HOP JOURNEY TIMELINE:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10 }}>
              {hops.map((h, i) => (
                <React.Fragment key={h.hop}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    backgroundColor: h.status === 'timeout' ? '#18181b' : '#0f172a',
                    border: `1px solid ${h.status === 'timeout' ? '#27272a' : (h.latency_ms > 100 ? '#f59e0b' : '#38bdf8')}`,
                    borderRadius: 6,
                    padding: '8px 10px',
                    minWidth: 85,
                    cursor: 'pointer'
                  }}
                  onClick={() => h.ip !== '*' && copyToClipboard(h.ip)}
                  title={`Click to copy IP ${h.ip}`}
                  >
                    <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>HOP {h.hop}</span>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: '#f1f5f9', marginTop: 2 }}>
                      {h.ip === '*' ? '* * *' : (h.ip.length > 12 ? h.ip.substring(0, 11) + '…' : h.ip)}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: h.latency_ms > 80 ? '#fbbf24' : '#10b981', marginTop: 2 }}>
                      {h.status === 'timeout' ? 'timeout' : `${h.latency_ms}ms`}
                    </span>
                  </div>
                  {i < hops.length - 1 && (
                    <div style={{ width: 14, height: 2, backgroundColor: '#334155', flexShrink: 0 }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hop</th>
                  <th>Router IP</th>
                  <th>Hostname</th>
                  <th>Latency</th>
                  <th>Autonomous System (AS) & ISP</th>
                  <th>Location</th>
                  <th>Copy</th>
                </tr>
              </thead>
              <tbody>
                {hops.map((h) => (
                  <tr key={h.hop}>
                    <td className="mono" style={{ fontWeight: 600, color: '#38bdf8' }}>#{h.hop}</td>
                    <td className="mono" style={{ fontWeight: 600, color: h.ip === '*' ? '#64748b' : '#f1f5f9' }}>
                      {h.ip}
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: 12 }}>{h.hostname || '-'}</td>
                    <td className="mono" style={{ color: h.latency_ms > 80 ? '#fbbf24' : '#10b981' }}>
                      {h.status === 'timeout' ? (
                        <span className="badge badge-neutral">Request timed out</span>
                      ) : (
                        `${h.latency_ms} ms`
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 12 }}>{h.isp || '-'}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{h.as_number || ''}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{h.country || '-'}</td>
                    <td>
                      {h.ip !== '*' && (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '2px 6px', fontSize: 11 }}
                          onClick={() => copyToClipboard(h.ip)}
                        >
                          <Copy size={11} />
                        </button>
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
