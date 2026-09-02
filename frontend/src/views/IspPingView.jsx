import React, { useState, useEffect, useRef } from 'react';
import { Activity, Play, Square, RefreshCw } from 'lucide-react';
import Sparkline from '../components/Sparkline';

export default function IspPingView() {
  const [ispTarget, setIspTarget] = useState('1.1.1.1');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [data, setData] = useState(null);
  const [gwHistory, setGwHistory] = useState([]);
  const [ispHistory, setIspHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const pollPing = async () => {
    try {
      const res = await fetch(`/api/ping/isp?target=${encodeURIComponent(ispTarget)}`);
      const json = await res.json();
      setData(json);
      if (json.gateway_ping && json.gateway_ping.avg_ms !== undefined) {
        setGwHistory(prev => [...prev.slice(-25), json.gateway_ping.avg_ms]);
      }
      if (json.isp_ping && json.isp_ping.avg_ms !== undefined) {
        setIspHistory(prev => [...prev.slice(-25), json.isp_ping.avg_ms]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      clearInterval(intervalRef.current);
      setIsMonitoring(false);
    } else {
      setIsMonitoring(true);
      pollPing();
      intervalRef.current = setInterval(pollPing, 2500);
    }
  };

  useEffect(() => {
    // Initial fetch once
    pollPing();
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Activity size={18} color="#38bdf8" />
          ISP & Gateway Ping Monitor
        </div>
        <div className="card-desc">
          Continuous latency & jitter telemetry separating local router/gateway delay from external ISP hop.
        </div>

        <div className="form-row">
          <div style={{ flex: '1 1 220px' }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>ISP Probe Target</label>
            <input
              className="input mono"
              style={{ width: '100%' }}
              value={ispTarget}
              onChange={e => setIspTarget(e.target.value)}
              placeholder="e.g. 1.1.1.1 or 8.8.8.8"
            />
          </div>

          <div style={{ paddingTop: 18 }}>
            <button
              className={`btn ${isMonitoring ? 'btn-danger' : 'btn-primary'}`}
              onClick={toggleMonitoring}
            >
              {isMonitoring ? <Square size={14} /> : <Play size={14} />}
              {isMonitoring ? 'Stop Monitoring' : 'Start Continuous Monitor'}
            </button>
          </div>

          <div style={{ paddingTop: 18 }}>
            <button className="btn btn-secondary" onClick={pollPing} disabled={isMonitoring}>
              <RefreshCw size={14} /> Ping Now
            </button>
          </div>
        </div>
      </div>

      {data && (
        <div>
          <div className="metrics-row">
            <div className="metric-box">
              <div className="metric-label">Connection Health</div>
              <div className="metric-val">
                <span className={`badge ${data.quality === 'EXCELLENT' ? 'badge-success' : (data.quality === 'MODERATE' ? 'badge-warning' : 'badge-danger')}`} style={{ fontSize: 14, padding: '4px 10px' }}>
                  {data.quality}
                </span>
              </div>
            </div>
            <div className="metric-box">
              <div className="metric-label">Gateway IP</div>
              <div className="metric-val mono" style={{ fontSize: 16 }}>{data.gateway}</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">ISP Hop Latency (Avg)</div>
              <div className="metric-val mono">{data.isp_ping.avg_ms} ms</div>
            </div>
            <div className="metric-box">
              <div className="metric-label">ISP Hop Jitter</div>
              <div className="metric-val mono" style={{ color: data.isp_ping.jitter_ms > 20 ? '#fbbf24' : '#f1f5f9' }}>
                ±{data.isp_ping.jitter_ms} ms
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
            {/* Local Gateway Graph */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Local Gateway Latency</div>
                  <div className="mono" style={{ fontSize: 11, color: '#64748b' }}>{data.gateway}</div>
                </div>
                <span className="badge badge-neutral mono">{data.gateway_ping.avg_ms} ms</span>
              </div>

              <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkline data={gwHistory} width={340} height={50} stroke="#10b981" fill="rgba(16, 185, 129, 0.1)" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                <span>Min: {data.gateway_ping.min_ms} ms</span>
                <span>Loss: {data.gateway_ping.packet_loss_pct}%</span>
                <span>Max: {data.gateway_ping.max_ms} ms</span>
              </div>
            </div>

            {/* ISP Target Graph */}
            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Upstream ISP Latency</div>
                  <div className="mono" style={{ fontSize: 11, color: '#64748b' }}>{data.isp_target}</div>
                </div>
                <span className="badge badge-neutral mono">{data.isp_ping.avg_ms} ms</span>
              </div>

              <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkline data={ispHistory} width={340} height={50} stroke="#38bdf8" fill="rgba(56, 189, 248, 0.1)" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
                <span>Min: {data.isp_ping.min_ms} ms</span>
                <span>Loss: {data.isp_ping.packet_loss_pct}%</span>
                <span>Max: {data.isp_ping.max_ms} ms</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
