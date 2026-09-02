import React, { useState } from 'react';
import { Gauge, Play, RefreshCw, Zap, ShieldCheck, Activity } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';

export default function BandwidthSpeedView() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const runTest = async () => {
    setRunning(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch('/api/speedtest/run?duration=3.5');
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setResults(json);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-title">
          <Gauge size={18} color="#38bdf8" />
          Network Throughput & Bufferbloat Benchmark
        </div>
        <div className="card-desc">
          Evaluates continuous network bandwidth throughput, loaded latency, and RFC bufferbloat rating to verify connection stability during high data transfers.
        </div>

        <div>
          <button className="btn btn-primary" onClick={runTest} disabled={running}>
            <Play size={14} className={running ? 'spin' : ''} />
            {running ? 'Benchmarking Link Throughput...' : 'Start Throughput Benchmark'}
          </button>
        </div>

        <ProgressBar loading={running} label="Streaming high-speed chunks and measuring loaded latency..." />

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
              <div className="metric-label">Transfer Throughput</div>
              <div className="metric-val mono" style={{ color: '#38bdf8' }}>
                {results.download_mbps} <span style={{ fontSize: 13, fontWeight: 500 }}>Mbps</span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Bufferbloat Rating</div>
              <div className="metric-val">
                <span className={`badge ${['A+', 'A'].includes(results.bufferbloat_grade) ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 16 }}>
                  Grade {results.bufferbloat_grade}
                </span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Idle Latency</div>
              <div className="metric-val mono">{results.idle_latency_ms} ms</div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Loaded Latency (Under Load)</div>
              <div className="metric-val mono" style={{ color: results.loaded_latency_ms > 80 ? '#fbbf24' : '#10b981' }}>
                {results.loaded_latency_ms} ms
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="#10b981" />
              Bufferbloat & Quality Telemetry Analysis
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
              During the transfer of <strong>{results.bytes_transferred_mb} MB</strong> over {results.elapsed_seconds}s, latency increased by <strong style={{ color: '#f1f5f9' }}>+{results.bufferbloat_increase_ms} ms</strong> under maximum saturation.
              {results.bufferbloat_increase_ms <= 15 ? (
                <span style={{ color: '#10b981', display: 'block', marginTop: 4 }}>
                  &bull; Excellent buffer control. Your router prioritizes packets well for competitive gaming, VoIP, and video calls.
                </span>
              ) : (
                <span style={{ color: '#fbbf24', display: 'block', marginTop: 4 }}>
                  &bull; Moderate buffer bloat detected. Consider enabling SQM (Smart Queue Management) or CAKE/FQ-CoDel on your router.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
