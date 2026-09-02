import React, { useState, useEffect, useRef } from 'react';
import { Activity, Play, Square, RefreshCw, Volume2, VolumeX } from 'lucide-react';
import Sparkline from '../components/Sparkline';
import { useToast } from '../components/Toast';

export default function IspPingView() {
  const [ispTarget, setIspTarget] = useState('1.1.1.1');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [data, setData] = useState(null);
  const [gwHistory, setGwHistory] = useState([]);
  const [ispHistory, setIspHistory] = useState([]);
  const intervalRef = useRef(null);

  const addToast = useToast();

  const playDropBeep = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  const pollPing = async () => {
    try {
      const res = await fetch(`/api/ping/isp?target=${encodeURIComponent(ispTarget)}`);
      const json = await res.json();
      setData(json);
      if (json.gateway_ping && json.gateway_ping.avg_ms !== undefined) {
        setGwHistory(prev => [...prev.slice(-35), json.gateway_ping.avg_ms]);
      }
      if (json.isp_ping && json.isp_ping.avg_ms !== undefined) {
        setIspHistory(prev => [...prev.slice(-35), json.isp_ping.avg_ms]);
        if (json.isp_ping.packet_loss_pct > 0) {
          playDropBeep();
          addToast(`Packet loss detected on ${ispTarget} (${json.isp_ping.packet_loss_pct}%)`, 'warning');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      clearInterval(intervalRef.current);
      setIsMonitoring(false);
      addToast('Ping telemetry paused');
    } else {
      setIsMonitoring(true);
      pollPing();
      intervalRef.current = setInterval(pollPing, 2000);
      addToast('Continuous multi-hop ping started');
    }
  };

  useEffect(() => {
    pollPing();
    return () => clearInterval(intervalRef.current);
  }, []);

  // Compute stability grade
  const ispLoss = data?.isp_ping?.packet_loss_pct || 0;
  const ispJitter = data?.isp_ping?.jitter_ms || 0;
  let stabilityGrade = 'A+';
  if (ispLoss > 5 || ispJitter > 30) stabilityGrade = 'D';
  else if (ispLoss > 0 || ispJitter > 15) stabilityGrade = 'C';
  else if (ispJitter > 5) stabilityGrade = 'B';
  else if (ispJitter > 2) stabilityGrade = 'A';

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Activity size={18} color="#38bdf8" />
          ISP & Gateway Real-Time Ping Telemetry
        </div>
        <div className="card-desc">
          Continuous latency & RFC 3550 jitter telemetry separating local router/gateway delay from external ISP hop.
        </div>

        <div className="form-row" style={{ alignItems: 'center' }}>
          <div style={{ flex: '1 1 220px' }}>
            <label style={{ fontSize: 11, color: '#94a3b8', display: 'block', marginBottom: 4 }}>ISP Probe Target</label>
            <input
              className="input mono"
              style={{ width: '100%' }}
              value={ispTarget}
              onChange={e => setIspTarget(e.target.value)}
              placeholder="e.g. 1.1.1.1, 8.8.8.8"
            />
          </div>

          <div style={{ paddingTop: 18, display: 'flex', gap: 8 }}>
            <button
              className={`btn ${isMonitoring ? 'btn-danger' : 'btn-primary'}`}
              onClick={toggleMonitoring}
            >
              {isMonitoring ? <Square size={14} /> : <Play size={14} />}
              {isMonitoring ? 'Pause Telemetry' : 'Start Continuous Ping'}
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => { setSoundEnabled(!soundEnabled); addToast(`Audio alert ${!soundEnabled ? 'enabled' : 'disabled'}`); }}
              title="Toggle Packet Drop Audio Alert"
            >
              {soundEnabled ? <Volume2 size={14} color="#38bdf8" /> : <VolumeX size={14} color="#64748b" />}
            </button>
          </div>
        </div>
      </div>

      {data && (
        <div>
          <div className="metrics-row">
            <div className="metric-box">
              <div className="metric-label">Connection Stability</div>
              <div className="metric-val">
                <span className={`badge ${['A+', 'A'].includes(stabilityGrade) ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 16 }}>
                  Grade {stabilityGrade}
                </span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Local Gateway RTT</div>
              <div className="metric-val mono" style={{ color: '#10b981' }}>
                {data.gateway_ping.avg_ms} ms
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">ISP Latency / Jitter</div>
              <div className="metric-val mono" style={{ color: '#38bdf8' }}>
                {data.isp_ping.avg_ms} ms <span style={{ fontSize: 12, color: '#94a3b8' }}>(&plusmn;{data.isp_ping.jitter_ms}ms)</span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Packet Loss</div>
              <div className="metric-val mono" style={{ color: ispLoss > 0 ? '#ef4444' : '#10b981' }}>
                {data.isp_ping.packet_loss_pct}%
              </div>
            </div>
          </div>

          {/* Sparkline Visual Graphs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Local Gateway Delay ({data.gateway_ip})</span>
                <span className="mono" style={{ fontSize: 12, color: '#10b981' }}>Current: {data.gateway_ping.avg_ms} ms</span>
              </div>
              <Sparkline data={gwHistory} color="#10b981" height={70} />
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>ISP Uplink Hop ({ispTarget})</span>
                <span className="mono" style={{ fontSize: 12, color: '#38bdf8' }}>Current: {data.isp_ping.avg_ms} ms</span>
              </div>
              <Sparkline data={ispHistory} color="#38bdf8" height={70} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
