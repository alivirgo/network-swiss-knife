import React, { useState, useEffect } from 'react';
import { Wifi, Radio, RefreshCw, Cpu, HardDrive } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';

export default function WifiInterfacesView() {
  const [wifi, setWifi] = useState(null);
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    setLoading(true);
    setError('');

    try {
      const [wifiRes, ifaceRes] = await Promise.all([
        fetch('/api/wifi/status'),
        fetch('/api/tools/interfaces')
      ]);
      const wifiData = await wifiRes.json();
      const ifaceData = await ifaceRes.json();

      setWifi(wifiData);
      setInterfaces(ifaceData.interfaces || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* 1. Wireless Telemetry Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="card-title">
              <Wifi size={18} color="#38bdf8" />
              Wireless LAN (Wi-Fi) Signal & Channel Inspector
            </div>
            <div className="card-desc">
              Real-time RF telemetry, signal attenuation (RSSI dBm), channel frequency, and physical link speed.
            </div>
          </div>
          <button className="btn btn-secondary" onClick={fetchStatus} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        <ProgressBar loading={loading} label="Querying physical wireless and network adapters..." />

        {error && (
          <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 4, fontSize: 12, marginTop: 10 }}>
            {error}
          </div>
        )}

        {wifi && (
          <div style={{ marginTop: 12 }}>
            <div className="metrics-row">
              <div className="metric-box">
                <div className="metric-label">Connected SSID</div>
                <div className="metric-val mono" style={{ fontSize: 16, color: wifi.connected ? '#38bdf8' : '#94a3b8' }}>
                  {wifi.ssid}
                </div>
              </div>

              <div className="metric-box">
                <div className="metric-label">Signal Strength</div>
                <div className="metric-val mono" style={{ color: wifi.signal_percent > 65 ? '#10b981' : (wifi.signal_percent > 40 ? '#fbbf24' : '#ef4444') }}>
                  {wifi.signal_percent}% <span style={{ fontSize: 13, color: '#64748b' }}>({wifi.signal_dbm} dBm)</span>
                </div>
              </div>

              <div className="metric-box">
                <div className="metric-label">Channel & Band</div>
                <div className="metric-val mono">
                  {wifi.channel !== '-' ? `Ch ${wifi.channel} (${wifi.band})` : '-'}
                </div>
              </div>

              <div className="metric-box">
                <div className="metric-label">Physical Link Speed</div>
                <div className="metric-val mono">{wifi.link_speed_mbps ? `${wifi.link_speed_mbps} Mbps` : '-'}</div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Status: <span className="mono" style={{ color: '#94a3b8' }}>{wifi.raw_status}</span> &bull; Security: <span className="mono" style={{ color: '#94a3b8' }}>{wifi.security}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Hardware Interfaces Card */}
      <div className="card">
        <div className="card-title">
          <HardDrive size={18} color="#38bdf8" />
          Hardware Network Interfaces & Live Traffic Counters
        </div>
        <div className="card-desc">
          Per-interface packet counters, byte throughput, error rates, and MTU assignments.
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Interface</th>
                <th>Status</th>
                <th>Link Speed</th>
                <th>MTU</th>
                <th>Bytes RX</th>
                <th>Bytes TX</th>
                <th>Packet Drops</th>
              </tr>
            </thead>
            <tbody>
              {interfaces.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                    Loading hardware interface statistics...
                  </td>
                </tr>
              ) : (
                interfaces.map((iface) => (
                  <tr key={iface.interface}>
                    <td className="mono" style={{ fontWeight: 600, color: '#f1f5f9' }}>{iface.interface}</td>
                    <td>
                      <span className={`badge ${iface.is_up ? 'badge-success' : 'badge-neutral'}`}>
                        {iface.is_up ? 'UP' : 'DOWN'}
                      </span>
                    </td>
                    <td className="mono">{iface.speed_mbps ? `${iface.speed_mbps} Mbps` : 'Dynamic'}</td>
                    <td className="mono">{iface.mtu || '-'}</td>
                    <td className="mono" style={{ color: '#38bdf8' }}>{iface.bytes_recv_mb} MB</td>
                    <td className="mono" style={{ color: '#10b981' }}>{iface.bytes_sent_mb} MB</td>
                    <td className="mono" style={{ color: (iface.drop_in + iface.drop_out) > 0 ? '#fbbf24' : '#64748b' }}>
                      {iface.drop_in + iface.drop_out}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
